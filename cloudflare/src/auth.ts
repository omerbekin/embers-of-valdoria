/**
 * Hesap girişi + bulut kaydı rota işleyicileri (Faz 1a; docs/arch/accounts-plan.md). Saf kurallar: ./auth-logic.ts, ./save-logic.ts.
 * Worker'a bağlama (index.ts): `const r = await handleAuth(req, env, ctx); if (r) return r;` ve `scheduled` içinde deleteInactiveAccounts.
 *
 * Yollar:
 *   GET  /auth/google|discord?mode=login|link&return=<yol>   -> sağlayıcıya 302 (state + PKCE S256, imzalı __Host-eov_oauth çerezi)
 *   GET  /auth/google|discord/callback                       -> oturum açar (__Host-eov_sid), dönüş adresine 302 (?auth=ok|error)
 *   GET  /auth/dev?sub=<x>&mode=&return=                     -> SAHTE sağlayıcı: yalnızca DEV_AUTH==='1' VE localhost/127.0.0.1
 *   GET  /auth/me                                            -> { user, save } (girişsiz { user: null })
 *   POST /auth/logout                                        -> 204
 *   GET  /save, PUT /save                                    -> kayıt (PUT: baseRev iyimser kilit, 409 conflict/schema-older, 429, 413)
 *   POST /save/restore-previous {baseRev}                    -> bir önceki kayda dön
 *   DELETE /account {confirm:"DELETE"}                       -> hesabı ve tüm verisini siler
 *   PUT  /account/name {displayName}                         -> oyuncunun seçtiği görünen ad
 * CSRF: durum değiştiren her istekte Origin izin listesinde olmalı + JSON gövdeli isteklerde content-type application/json; CORS YOK.
 * Gizlilik: CF-Connecting-IP, req.cf, user agent OKUNMAZ; sağlayıcıdan yalnızca kimlik (sub) alınır, access token saklanmaz.
 * DB ya da gerekli secret yoksa 503 (not-configured).
 */
import {
  authorizeUrl,
  checkGoogleClaims,
  clearCookie,
  decodeJwtPayload,
  DEFAULT_AUTH_ORIGINS,
  devAuthAllowed,
  DISCORD_ME_URL,
  DISCORD_TOKEN_URL,
  GOOGLE_TOKEN_URL,
  hashToken,
  hmacKeyUsable,
  inactivityCutoff,
  isValidDevSub,
  isValidSessionToken,
  newOAuthSecrets,
  newSessionToken,
  normalizeDiscordProfile,
  normalizeDisplayName,
  OAUTH_COOKIE,
  OAUTH_TTL_MS,
  originAllowed,
  parseCookies,
  parseMode,
  parseOAuthState,
  pkceChallenge,
  safeReturnTo,
  serializeCookie,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  sha256Hex,
  signValue,
  stateMatches,
  verifyValue,
  withQuery,
  type AuthMode,
  type IdentityProvider,
  type Provider,
} from './auth-logic';
import { contentLengthTooLarge, decidePut, MAX_BODY_BYTES, parseDeleteBody, parseRestoreBody, parseSavePut, readStoredVersions, retryAfterSec, serializeBlob, serializeTombstones, throttled } from './save-logic';

/** D1'in burada kullanılan kısmı (yapısal; Cloudflare'in D1Database tipi buna uyar, testler sahte nesne verebilir). */
export interface DbStatement {
  bind(...values: unknown[]): DbStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
}
export interface Db {
  prepare(query: string): DbStatement;
  batch(statements: DbStatement[]): Promise<Array<{ meta?: { changes?: number } }>>;
}

export interface AuthEnv {
  DB?: Db;
  /** Secret: OAuth çerezini imzalar (en az 32 karakter). */
  SESSION_HMAC_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  /** '1' ise localhost'ta sahte sağlayıcı açık (yalnızca .dev.vars). */
  DEV_AUTH?: string;
  /** Girişin açık olduğu kökenler (virgülle; ":*" port joker). Yoksa DEFAULT_AUTH_ORIGINS. */
  AUTH_ORIGINS?: string;
}

export interface AuthCtx {
  waitUntil(promise: Promise<unknown>): void;
}

const NO_STORE = { 'cache-control': 'no-store' };
/** /auth/me çağrısında last_login_at en çok günde bir güncellenir (D1 yazım kotası). */
const TOUCH_INTERVAL_MS = 24 * 3600 * 1000;
const FETCH_TIMEOUT_MS = 8000;

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...NO_STORE, ...headers } });
}
const err = (status: number, error: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}): Response => json(status, { error, ...extra }, headers);

function redirect(location: string, cookies: string[] = []): Response {
  const h = new Headers({ location, ...NO_STORE });
  for (const c of cookies) h.append('set-cookie', c);
  return new Response(null, { status: 302, headers: h });
}

const allowedOrigins = (env: AuthEnv): string => env.AUTH_ORIGINS ?? DEFAULT_AUTH_ORIGINS;

/** CSRF: Origin izinli mi; JSON gövdeli istekte content-type application/json mı? */
function csrfOk(req: Request, env: AuthEnv, needsJson: boolean): boolean {
  if (!originAllowed(req.headers.get('Origin'), allowedOrigins(env))) return false;
  if (!needsJson) return true;
  const ct = (req.headers.get('content-type') ?? '').toLowerCase();
  return ct === 'application/json' || ct.startsWith('application/json;');
}

interface Session {
  userId: string;
  tokenHash: string;
}

async function getSession(req: Request, db: Db, now: number): Promise<Session | null> {
  const token = parseCookies(req.headers.get('Cookie'))[SESSION_COOKIE];
  if (!isValidSessionToken(token)) return null;
  const tokenHash = await hashToken(token);
  const row = await db.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(tokenHash, now).first<{ user_id: string }>();
  return row ? { userId: row.user_id, tokenHash } : null;
}

function providerConfig(env: AuthEnv, p: Provider): { id: string; secret: string } | null {
  const id = p === 'google' ? env.GOOGLE_CLIENT_ID : env.DISCORD_CLIENT_ID;
  const secret = p === 'google' ? env.GOOGLE_CLIENT_SECRET : env.DISCORD_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

/** Rota bu modüle aitse Response, değilse null. */
export async function handleAuth(req: Request, env: AuthEnv, ctx?: AuthCtx): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname.length > 1 && url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
  if (!(path.startsWith('/auth/') || path === '/save' || path.startsWith('/save/') || path === '/account' || path.startsWith('/account/'))) return null;
  const now = Date.now();
  const m = req.method;

  // Sahte sağlayıcı: koşullar sağlanmazsa yol hiç yokmuş gibi 404 (DB'ye dokunmadan)
  if (path === '/auth/dev') {
    if (!devAuthAllowed(env.DEV_AUTH, req.url)) return err(404, 'not-found');
    if (m !== 'GET') return err(405, 'method');
    if (!env.DB) return err(503, 'not-configured');
    return devLogin(req, url, env.DB, env, now);
  }

  const start = /^\/auth\/(google|discord)$/.exec(path);
  if (start) {
    if (m !== 'GET') return err(405, 'method');
    return oauthStart(url, env, start[1] as Provider, now);
  }
  const cb = /^\/auth\/(google|discord)\/callback$/.exec(path);
  if (cb) {
    if (m !== 'GET') return err(405, 'method');
    return oauthCallback(req, url, env, cb[1] as Provider, now);
  }

  if (path === '/auth/logout') {
    if (m !== 'POST') return err(405, 'method');
    if (!csrfOk(req, env, false)) return err(403, 'origin');
    if (env.DB) {
      const s = await getSession(req, env.DB, now);
      if (s) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(s.tokenHash).run();
    }
    return new Response(null, { status: 204, headers: { ...NO_STORE, 'set-cookie': clearCookie(SESSION_COOKIE) } });
  }

  const known = path === '/auth/me' || path === '/save' || path === '/save/restore-previous' || path === '/account' || path === '/account/name';
  if (!known) return err(404, 'not-found');
  if (!env.DB) return err(503, 'not-configured');
  const db = env.DB;

  if (path === '/auth/me') {
    if (m !== 'GET') return err(405, 'method');
    return me(req, db, now, ctx);
  }
  if (path === '/save') {
    if (m === 'GET') return saveGet(req, db, now);
    if (m === 'PUT') return savePut(req, db, env, now);
    return err(405, 'method');
  }
  if (path === '/save/restore-previous') {
    if (m !== 'POST') return err(405, 'method');
    return restorePrevious(req, db, env, now);
  }
  if (path === '/account') {
    if (m !== 'DELETE') return err(405, 'method');
    return deleteAccount(req, db, env, now);
  }
  // /account/name
  if (m !== 'PUT') return err(405, 'method');
  return setName(req, db, env, now);
}

// ---------- OAuth ----------

async function oauthStart(url: URL, env: AuthEnv, p: Provider, now: number): Promise<Response> {
  const cfg = providerConfig(env, p);
  if (!env.DB || !hmacKeyUsable(env.SESSION_HMAC_KEY) || !cfg) return err(503, 'not-configured');
  const allowed = allowedOrigins(env);
  const self = url.origin;
  if (!originAllowed(self, allowed)) return err(403, 'origin');
  const mode = parseMode(url.searchParams.get('mode'));
  const returnTo = safeReturnTo(url.searchParams.get('return'), self, allowed);
  const { state, verifier } = newOAuthSecrets();
  const cookie = await signValue({ p, s: state, v: verifier, m: mode, r: returnTo, o: self, exp: now + OAUTH_TTL_MS }, env.SESSION_HMAC_KEY);
  const location = authorizeUrl(p, cfg.id, `${self}/auth/${p}/callback`, state, await pkceChallenge(verifier));
  return redirect(location, [serializeCookie(OAUTH_COOKIE, cookie, { maxAgeSec: OAUTH_TTL_MS / 1000 })]);
}

async function postForm(endpoint: string, form: Record<string, string>): Promise<unknown> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams(form).toString(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return res.json();
}

/** Yetki kodunu sağlayıcı kimliğine (sub) çevirir. */
async function exchangeCode(p: Provider, cfg: { id: string; secret: string }, code: string, verifier: string, redirectUri: string, now: number): Promise<string | null> {
  const form = { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: cfg.id, client_secret: cfg.secret, code_verifier: verifier };
  try {
    if (p === 'google') {
      const tok = (await postForm(GOOGLE_TOKEN_URL, form)) as Record<string, unknown> | null;
      const r = checkGoogleClaims(decodeJwtPayload(tok?.id_token), cfg.id, Math.floor(now / 1000));
      return r.ok ? r.sub : null;
    }
    const tok = (await postForm(DISCORD_TOKEN_URL, form)) as Record<string, unknown> | null;
    if (!tok || typeof tok.access_token !== 'string') return null;
    const res = await fetch(DISCORD_ME_URL, { headers: { authorization: `Bearer ${tok.access_token}`, accept: 'application/json' }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return normalizeDiscordProfile(await res.json())?.sub ?? null;
  } catch {
    return null;
  }
}

async function oauthCallback(req: Request, url: URL, env: AuthEnv, p: Provider, now: number): Promise<Response> {
  const cfg = providerConfig(env, p);
  if (!env.DB || !hmacKeyUsable(env.SESSION_HMAC_KEY) || !cfg) return err(503, 'not-configured');
  const clear = clearCookie(OAUTH_COOKIE);
  const fallback = `${url.origin}/`;
  const st = parseOAuthState(await verifyValue(parseCookies(req.headers.get('Cookie'))[OAUTH_COOKIE], env.SESSION_HMAC_KEY, now));
  const fail = (reason: string, to = fallback): Response => redirect(withQuery(to, { auth: 'error', reason }), [clear]);
  if (!st || st.p !== p || st.o !== url.origin) return fail('state');
  if (!stateMatches(st.s, url.searchParams.get('state'))) return fail('state');
  if (url.searchParams.get('error')) return fail('denied', st.r);
  const code = url.searchParams.get('code');
  if (!code || code.length > 2048) return fail('code', st.r);
  const sub = await exchangeCode(p, cfg, code, st.v, `${st.o}/auth/${p}/callback`, now);
  if (!sub) return fail('provider', st.r);
  const done = await completeLogin(req, env.DB, p, sub, st.m, now);
  if (!done.ok) return fail(done.error, st.r);
  return redirect(withQuery(st.r, { auth: 'ok' }), [clear, done.cookie]);
}

async function devLogin(req: Request, url: URL, db: Db, env: AuthEnv, now: number): Promise<Response> {
  const sub = url.searchParams.get('sub') ?? 'dev';
  if (!isValidDevSub(sub)) return err(400, 'bad-sub');
  const to = safeReturnTo(url.searchParams.get('return'), url.origin, allowedOrigins(env));
  const done = await completeLogin(req, db, 'dev', sub, parseMode(url.searchParams.get('mode')), now);
  if (!done.ok) return redirect(withQuery(to, { auth: 'error', reason: done.error }));
  return redirect(withQuery(to, { auth: 'ok' }), [done.cookie]);
}

/** Kimliği hesaba bağlar (yoksa hesap açar; mode=link ise oturumdaki hesaba ekler) ve yeni oturum açar. */
async function completeLogin(req: Request, db: Db, provider: IdentityProvider, sub: string, mode: AuthMode, now: number): Promise<{ ok: true; cookie: string } | { ok: false; error: string }> {
  const existing = await db.prepare('SELECT user_id FROM identities WHERE provider = ? AND sub = ?').bind(provider, sub).first<{ user_id: string }>();
  const current = await getSession(req, db, now);
  let userId: string;
  if (mode === 'link') {
    if (!current) return { ok: false, error: 'not-signed-in' };
    if (existing && existing.user_id !== current.userId) return { ok: false, error: 'identity-taken' };
    userId = current.userId;
    if (!existing) await db.prepare('INSERT INTO identities (provider, sub, user_id, created_at) VALUES (?, ?, ?, ?)').bind(provider, sub, userId, now).run();
  } else if (existing) {
    userId = existing.user_id;
  } else {
    userId = crypto.randomUUID();
    await db.batch([
      db.prepare('INSERT INTO users (id, created_at, last_login_at, display_name) VALUES (?, ?, ?, NULL)').bind(userId, now, now),
      db.prepare('INSERT INTO identities (provider, sub, user_id, created_at) VALUES (?, ?, ?, ?)').bind(provider, sub, userId, now),
    ]);
  }
  const token = newSessionToken();
  const stmts = [
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(now, userId),
    db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').bind(await hashToken(token), userId, now, now + SESSION_TTL_MS),
  ];
  // Aynı tarayıcının eski oturumu (başka hesap olabilir) kapatılır
  if (current) stmts.push(db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(current.tokenHash));
  await db.batch(stmts);
  return { ok: true, cookie: serializeCookie(SESSION_COOKIE, token, { maxAgeSec: SESSION_TTL_MS / 1000 }) };
}

// ---------- hesap ----------

async function me(req: Request, db: Db, now: number, ctx?: AuthCtx): Promise<Response> {
  const s = await getSession(req, db, now);
  if (!s) return json(200, { user: null });
  const user = await db.prepare('SELECT id, created_at, last_login_at, display_name FROM users WHERE id = ?').bind(s.userId).first<{ id: string; created_at: number; last_login_at: number; display_name: string | null }>();
  if (!user) return json(200, { user: null });
  const ids = await db.prepare('SELECT provider FROM identities WHERE user_id = ? ORDER BY created_at').bind(s.userId).all<{ provider: string }>();
  const save = await db.prepare('SELECT rev, updated_at, versions, app, size, hash FROM saves WHERE user_id = ?').bind(s.userId).first<{ rev: number; updated_at: number; versions: string; app: string; size: number; hash: string }>();
  if (now - user.last_login_at > TOUCH_INTERVAL_MS) {
    const touch = db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(now, s.userId).run();
    if (ctx) ctx.waitUntil(touch);
    else await touch;
  }
  return json(200, {
    user: { id: user.id, displayName: user.display_name, createdAt: user.created_at, providers: ids.results.map((r) => r.provider) },
    save: save ? { rev: save.rev, updatedAt: save.updated_at, versions: readStoredVersions(save.versions), app: save.app, size: save.size, hash: save.hash } : null,
  });
}

async function readJson(req: Request): Promise<string | null> {
  if (contentLengthTooLarge(req.headers.get('content-length'), 4096)) return null;
  const t = await req.text();
  return t.length > 4096 ? null : t;
}

async function setName(req: Request, db: Db, env: AuthEnv, now: number): Promise<Response> {
  if (!csrfOk(req, env, true)) return err(403, 'origin');
  const s = await getSession(req, db, now);
  if (!s) return err(401, 'signed-out');
  const body = await readJson(req);
  let raw: unknown = null;
  try {
    const v: unknown = body ? JSON.parse(body) : null;
    if (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 1) raw = (v as Record<string, unknown>).displayName;
  } catch {
    /* aşağıda bad-name */
  }
  const name = normalizeDisplayName(raw);
  if (!name) return err(400, 'bad-name');
  await db.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(name, s.userId).run();
  return json(200, { displayName: name });
}

async function deleteAccount(req: Request, db: Db, env: AuthEnv, now: number): Promise<Response> {
  if (!csrfOk(req, env, true)) return err(403, 'origin');
  const s = await getSession(req, db, now);
  if (!s) return err(401, 'signed-out');
  const body = await readJson(req);
  if (!body || !parseDeleteBody(body)) return err(400, 'confirm');
  await db.batch(deleteUserStatements(db, 'user_id = ?', 'id = ?', [s.userId]));
  return json(200, { deleted: true }, { 'set-cookie': clearCookie(SESSION_COOKIE) });
}

/** Bir hesabın tüm satırları (kayıt, oturum, kimlik, hesap); koşul hem user_id hem users.id için verilir. */
function deleteUserStatements(db: Db, byUserId: string, byId: string, args: unknown[]): DbStatement[] {
  return [
    db.prepare(`DELETE FROM saves WHERE ${byUserId}`).bind(...args),
    db.prepare(`DELETE FROM sessions WHERE ${byUserId}`).bind(...args),
    db.prepare(`DELETE FROM identities WHERE ${byUserId}`).bind(...args),
    db.prepare(`DELETE FROM users WHERE ${byId}`).bind(...args),
  ];
}

// ---------- kayıt ----------

interface SaveRow {
  rev: number;
  updated_at: number;
  versions: string;
  app: string;
  size: number;
  hash: string;
  tombstones: string;
}

async function saveGet(req: Request, db: Db, now: number): Promise<Response> {
  const s = await getSession(req, db, now);
  if (!s) return err(401, 'signed-out');
  const row = await db.prepare('SELECT rev, updated_at, versions, app, size, hash, tombstones, blob FROM saves WHERE user_id = ?').bind(s.userId).first<SaveRow & { blob: string }>();
  if (!row) return json(200, { save: null });
  // blob ve tombstones zaten JSON: yeniden ayrıştırmadan yerleştirilir (CPU)
  const meta = JSON.stringify({ rev: row.rev, updatedAt: row.updated_at, versions: readStoredVersions(row.versions), app: row.app, size: row.size, hash: row.hash });
  return new Response(`{"save":${meta.slice(0, -1)},"tombstones":${row.tombstones || '[]'},"data":${row.blob}}}`, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', ...NO_STORE } });
}

async function savePut(req: Request, db: Db, env: AuthEnv, now: number): Promise<Response> {
  if (!csrfOk(req, env, true)) return err(403, 'origin');
  const s = await getSession(req, db, now);
  if (!s) return err(401, 'signed-out');
  if (contentLengthTooLarge(req.headers.get('content-length'), MAX_BODY_BYTES)) return err(413, 'too-large');
  const parsed = parseSavePut(await req.text());
  if (!parsed.ok) return err(parsed.error === 'too-large' ? 413 : 400, parsed.error);
  const put = parsed.put;
  const row = await db.prepare('SELECT rev, updated_at, versions, app, size, hash, tombstones FROM saves WHERE user_id = ?').bind(s.userId).first<SaveRow>();
  const stored = row ? { rev: row.rev, updatedAt: row.updated_at, versions: readStoredVersions(row.versions) } : null;
  const d = decidePut(stored, put, now);
  if (!d.ok) {
    const h: Record<string, string> = d.status === 429 && row ? { 'retry-after': String(retryAfterSec(row.updated_at, now)) } : {};
    return err(d.status, d.error, { rev: d.rev }, h);
  }
  const ser = serializeBlob(put.data);
  if (!ser) return err(413, 'too-large');
  const hash = await sha256Hex(ser.blob);
  const versions = JSON.stringify(put.versions);
  const tombstones = serializeTombstones(put.tombstones);
  // Aynı içerik: yazım yapılmaz (D1 kotası; prev_blob anlamlı kalır)
  if (row && row.hash === hash && row.versions === versions && row.tombstones === tombstones) return json(200, { rev: row.rev, updatedAt: row.updated_at, hash, size: row.size, unchanged: true });
  const res = row
    ? await db
        .prepare('UPDATE saves SET rev = ?, updated_at = ?, versions = ?, app = ?, size = ?, hash = ?, prev_blob = blob, prev_versions = versions, prev_tombstones = tombstones, blob = ?, tombstones = ? WHERE user_id = ? AND rev = ?')
        .bind(d.rev, now, versions, put.app, ser.size, hash, ser.blob, tombstones, s.userId, row.rev)
        .run()
    : await db
        .prepare('INSERT INTO saves (user_id, rev, updated_at, versions, app, size, hash, blob, tombstones, prev_blob, prev_versions, prev_tombstones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL) ON CONFLICT (user_id) DO NOTHING')
        .bind(s.userId, d.rev, now, versions, put.app, ser.size, hash, ser.blob, tombstones)
        .run();
  // Eşzamanlı başka yazım araya girdiyse
  if (res.meta?.changes === 0) return err(409, 'conflict', { rev: -1 });
  return json(200, { rev: d.rev, updatedAt: now, hash, size: ser.size });
}

async function restorePrevious(req: Request, db: Db, env: AuthEnv, now: number): Promise<Response> {
  if (!csrfOk(req, env, true)) return err(403, 'origin');
  const s = await getSession(req, db, now);
  if (!s) return err(401, 'signed-out');
  const body = await readJson(req);
  const b = body ? parseRestoreBody(body) : null;
  if (!b) return err(400, 'bad-shape');
  const row = await db.prepare('SELECT rev, updated_at, prev_blob FROM saves WHERE user_id = ?').bind(s.userId).first<{ rev: number; updated_at: number; prev_blob: string | null }>();
  if (!row || row.prev_blob === null) return err(404, 'no-previous');
  if (b.baseRev !== row.rev) return err(409, 'conflict', { rev: row.rev });
  if (throttled(row.updated_at, now)) return err(429, 'throttled', { rev: row.rev }, { 'retry-after': String(retryAfterSec(row.updated_at, now)) });
  const size = new TextEncoder().encode(row.prev_blob).length;
  const hash = await sha256Hex(row.prev_blob);
  const rev = row.rev + 1;
  // SQLite UPDATE'te sağ taraflar eski değerleri okur: blob <-> prev_blob takası
  const res = await db
    .prepare('UPDATE saves SET rev = ?, updated_at = ?, size = ?, hash = ?, blob = prev_blob, prev_blob = blob, versions = COALESCE(prev_versions, versions), prev_versions = versions, tombstones = COALESCE(prev_tombstones, tombstones), prev_tombstones = tombstones WHERE user_id = ? AND rev = ?')
    .bind(rev, now, size, hash, s.userId, row.rev)
    .run();
  if (res.meta?.changes === 0) return err(409, 'conflict', { rev: -1 });
  return json(200, { rev, updatedAt: now, hash, size });
}

// ---------- zamanlanmış temizlik ----------

/**
 * 24 ay giriş yapmayan hesapları (Ömer kararı 6) tüm verisiyle siler; süresi dolmuş oturumları da temizler.
 * Worker `scheduled` olayından çağrılır (wrangler.toml [triggers] crons). DB yoksa hiçbir şey yapmaz.
 */
export async function deleteInactiveAccounts(env: AuthEnv, now: number): Promise<{ users: number; sessions: number }> {
  if (!env.DB) return { users: 0, sessions: 0 };
  const db = env.DB;
  const cutoff = inactivityCutoff(now);
  const inactive = 'user_id IN (SELECT id FROM users WHERE last_login_at < ?)';
  const res = await db.batch([...deleteUserStatements(db, inactive, 'last_login_at < ?', [cutoff]), db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now)]);
  return { users: res[3]?.meta?.changes ?? 0, sessions: res[4]?.meta?.changes ?? 0 };
}
