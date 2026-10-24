/**
 * Hesap girişinin saf kuralları (Faz 1a; docs/arch/accounts-plan.md). Cloudflare'e ve D1'e bağımlı değil: yalnızca WebCrypto
 * (crypto.subtle), TextEncoder, btoa/atob; oyunun testleri Node'da sınar (tests/auth-worker.test.ts). Rota işleyicileri: ./auth.ts.
 * Gizlilik: e-posta, avatar, kullanıcı adı, IP, user agent, sağlayıcı access token'ı OKUNMAZ / saklanmaz; yalnızca sağlayıcı kimliği (sub).
 */

export const SESSION_COOKIE = '__Host-eov_sid';
export const OAUTH_COOKIE = '__Host-eov_oauth';
/** Oturum ömrü: 30 gün. */
export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;
/** OAuth gidiş-dönüş çerezi ömrü: 10 dakika. */
export const OAUTH_TTL_MS = 10 * 60 * 1000;
/** Bu kadar ay giriş yapmayan hesap silinir (Ömer kararı 6). */
export const INACTIVE_MONTHS = 24;
/** SESSION_HMAC_KEY en az bu uzunlukta olmalı; kısa anahtar "yapılandırılmamış" sayılır. */
export const MIN_HMAC_KEY_CHARS = 32;
/** Giriş açık olan kökenler (Ömer kararı 3: yalnızca embersofvaldoria.com ve localhost). Env AUTH_ORIGINS ile değiştirilebilir. */
export const DEFAULT_AUTH_ORIGINS = 'https://embersofvaldoria.com,http://localhost:*,http://127.0.0.1:*';
export const PROVIDERS = ['google', 'discord'] as const;
export type Provider = (typeof PROVIDERS)[number];
export type IdentityProvider = Provider | 'dev';
export type AuthMode = 'login' | 'link';

const enc = new TextEncoder();

// ---------- base64url ----------

export function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Dönüş tipi bilerek çıkarımla (Uint8Array<ArrayBuffer>): WebCrypto BufferSource ister
export function b64urlDecode(text: string) {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    // Yalnızca kanonik biçim (son karakterin kullanılmayan bitleri değiştirilmiş imza kabul edilmesin)
    return b64urlEncode(out) === text ? out : null;
  } catch {
    return null;
  }
}

const hex = (buf: ArrayBuffer): string => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

/** Rastgele bayt (WebCrypto). */
export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** Uzunluk dışında zamandan bağımsız dizgi karşılaştırması. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- çerezler ----------

/** Cookie başlığını {ad: değer} haritasına çevirir (ilk geçen ad kazanır; bozuk parçalar atlanır). */
export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const name = part.slice(0, i).trim();
    let value = part.slice(i + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) value = value.slice(1, -1);
    if (!name || name in out) continue;
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

export interface CookieOptions {
  maxAgeSec: number;
  httpOnly?: boolean;
}

/** Set-Cookie değeri. __Host- öneki gereği her zaman Secure + Path=/ ve Domain YOK; SameSite=Lax (OAuth dönüşü üst düzey GET). */
export function serializeCookie(name: string, value: string, opts: CookieOptions): string {
  if (!/^[A-Za-z0-9_.-]+$/.test(name)) throw new Error('bad cookie name');
  const parts = [`${name}=${encodeURIComponent(value)}`, `Max-Age=${Math.max(0, Math.floor(opts.maxAgeSec))}`, 'Path=/', 'Secure', 'SameSite=Lax'];
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  return parts.join('; ');
}

/** Çerezi silen Set-Cookie değeri. */
export const clearCookie = (name: string): string => serializeCookie(name, '', { maxAgeSec: 0 });

// ---------- HMAC imzalı değer ----------

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Anahtar kullanılabilir mi (yoksa ya da kısaysa yapılandırılmamış sayılır). */
export const hmacKeyUsable = (secret: string | undefined): secret is string => typeof secret === 'string' && secret.length >= MIN_HMAC_KEY_CHARS;

/** `<base64url(JSON)>.<base64url(HMAC-SHA256)>` üretir. Yük `exp` (ms) alanı taşımalı. */
export async function signValue(payload: { exp: number } & Record<string, unknown>, secret: string): Promise<string> {
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64urlEncode(sig)}`;
}

/** İmzayı (sabit zamanlı WebCrypto verify) ve süreyi denetler; geçersizse null. */
export async function verifyValue(token: string | undefined | null, secret: string, now: number): Promise<Record<string, unknown> | null> {
  if (!token || token.length > 4096) return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return null;
  const body = token.slice(0, dot);
  const sig = b64urlDecode(token.slice(dot + 1));
  if (!sig || sig.length !== 32) return null;
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), sig, enc.encode(body));
  if (!ok) return null;
  const raw = b64urlDecode(body);
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.exp !== 'number' || !Number.isFinite(o.exp) || o.exp <= now) return null;
  return o;
}

// ---------- OAuth gidiş-dönüş durumu (state + PKCE) ----------

/** OAuth çerezinin içeriği: sağlayıcı, state, PKCE verifier, kip, dönüş yolu, redirect kökeni, bitiş. */
export interface OAuthState {
  p: Provider;
  s: string;
  v: string;
  m: AuthMode;
  r: string;
  o: string;
  exp: number;
}

/** Yeni state ve PKCE verifier (32 rastgele bayt -> 43 karakter base64url; RFC 7636 43-128 aralığında). */
export function newOAuthSecrets(): { state: string; verifier: string } {
  return { state: b64urlEncode(randomBytes(32)), verifier: b64urlEncode(randomBytes(32)) };
}

/** PKCE S256: base64url(SHA-256(ASCII(verifier))). */
export async function pkceChallenge(verifier: string): Promise<string> {
  return b64urlEncode(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(verifier))));
}

export const isValidVerifier = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9\-._~]{43,128}$/.test(v);

/** Çerezden çözülen yükü OAuthState'e doğrular. */
export function parseOAuthState(o: Record<string, unknown> | null): OAuthState | null {
  if (!o) return null;
  const p = PROVIDERS.find((x) => x === o.p);
  if (!p || typeof o.s !== 'string' || o.s.length < 16 || !isValidVerifier(o.v) || (o.m !== 'login' && o.m !== 'link') || typeof o.r !== 'string' || typeof o.o !== 'string' || typeof o.exp !== 'number') return null;
  return { p, s: o.s, v: o.v, m: o.m, r: o.r, o: o.o, exp: o.exp };
}

/** Dönüşteki state, çerezdeki state ile aynı mı (ikisi de dolu, sabit zamanlı karşılaştırma)? */
export function stateMatches(cookieState: string | undefined | null, queryState: string | undefined | null): boolean {
  if (!cookieState || !queryState) return false;
  return safeEqual(cookieState, queryState);
}

export const parseMode = (raw: string | null): AuthMode => (raw === 'link' ? 'link' : 'login');

// ---------- köken izni / dönüş adresi ----------

/**
 * İzinli köken mi? Liste virgülle ayrılır; giriş tam köken ya da port joker'li ("http://localhost:*"). lobby-logic ile aynı kural,
 * ek olarak köken URL olarak ayrıştırılıp yeniden kurulur (yol / kullanıcı bilgisi / sondaki nokta gibi hileler reddedilir).
 */
export function originAllowed(origin: string | null | undefined, allowed: string): boolean {
  if (!origin) return false;
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  if (u.origin !== origin) return false;
  return allowed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .some((entry) => (entry.endsWith(':*') ? origin.startsWith(entry.slice(0, -1)) && /^\d{1,5}$/.test(origin.slice(entry.length - 1)) : origin === entry));
}

/**
 * Girişten sonra dönülecek yer: yalnızca aynı sitedeki göreli yol ("/", "/?debug=1") ya da izinli kökendeki mutlak adres.
 * Hostil köken, "//evil.com", "/\\evil.com", javascript: vb. -> fallback. Dönen değer her zaman mutlak URL.
 */
export function safeReturnTo(raw: string | null | undefined, selfOrigin: string, allowed: string, fallback = '/'): string {
  const fb = new URL(fallback, selfOrigin).toString();
  if (!raw || raw.length > 512) return fb;
  if (/[\u0000-\u001f\\]/.test(raw)) return fb;
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    const u = new URL(raw, selfOrigin);
    return u.origin === selfOrigin ? u.toString() : fb;
  }
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return fb;
  }
  if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.username || u.password) return fb;
  return originAllowed(u.origin, allowed) ? u.toString() : fb;
}

/** Adrese sorgu parametresi ekler (girişten sonra ?auth=ok|error). */
export function withQuery(url: string, params: Record<string, string>): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

// ---------- sağlayıcılar ----------

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
export const DISCORD_AUTH_URL = 'https://discord.com/oauth2/authorize';
export const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
export const DISCORD_ME_URL = 'https://discord.com/api/users/@me';

/** Sağlayıcının yetkilendirme adresi (yalnızca `openid` / `identify` kapsamı; e-posta istenmez). */
export function authorizeUrl(provider: Provider, clientId: string, redirectUri: string, state: string, challenge: string): string {
  const u = new URL(provider === 'google' ? GOOGLE_AUTH_URL : DISCORD_AUTH_URL);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('scope', provider === 'google' ? 'openid' : 'identify');
  u.searchParams.set('state', state);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

/** JWT yükünü imza denetimi OLMADAN çözer (id_token doğrudan Google'ın token ucundan TLS ile alınır; OIDC Core 3.1.3.7/6). */
export function decodeJwtPayload(jwt: unknown): Record<string, unknown> | null {
  if (typeof jwt !== 'string' || jwt.length > 8192) return null;
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  const raw = b64urlDecode(parts[1]!);
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(new TextDecoder().decode(raw));
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Saat kayması toleransı (sn). */
export const CLOCK_SKEW_SEC = 60;

/** Google id_token iddiaları: iss, aud (dizi ise azp de), exp, iat, sub. */
export function checkGoogleClaims(claims: Record<string, unknown> | null, clientId: string, nowSec: number): { ok: true; sub: string } | { ok: false; error: string } {
  if (!claims) return { ok: false, error: 'bad-token' };
  if (typeof claims.iss !== 'string' || !GOOGLE_ISSUERS.includes(claims.iss)) return { ok: false, error: 'bad-iss' };
  const aud = claims.aud;
  const audOk = typeof aud === 'string' ? aud === clientId : Array.isArray(aud) && aud.includes(clientId) && claims.azp === clientId;
  if (!clientId || !audOk) return { ok: false, error: 'bad-aud' };
  if (typeof claims.exp !== 'number' || claims.exp + CLOCK_SKEW_SEC <= nowSec) return { ok: false, error: 'expired' };
  if (claims.iat !== undefined && (typeof claims.iat !== 'number' || claims.iat - CLOCK_SKEW_SEC > nowSec)) return { ok: false, error: 'bad-iat' };
  if (typeof claims.sub !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(claims.sub)) return { ok: false, error: 'bad-sub' };
  return { ok: true, sub: claims.sub };
}

/** Discord /users/@me yanıtından yalnızca kimlik (snowflake id); ad, avatar, e-posta atılır. */
export function normalizeDiscordProfile(profile: unknown): { provider: 'discord'; sub: string } | null {
  if (typeof profile !== 'object' || profile === null) return null;
  const id = (profile as Record<string, unknown>).id;
  if (typeof id !== 'string' || !/^\d{5,25}$/.test(id)) return null;
  return { provider: 'discord', sub: id };
}

// ---------- oturum token'ı ----------

/** Yeni opak oturum token'ı (32 rastgele bayt, base64url). */
export const newSessionToken = (): string => b64urlEncode(randomBytes(32));
export const isValidSessionToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);

/** Veritabanında saklanan biçim: SHA-256 hex. */
export async function hashToken(token: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(token)));
}

/** SHA-256 hex (kayıt özeti için de kullanılır). */
export async function sha256Hex(text: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

// ---------- görünen ad / sahte sağlayıcı / hareketsizlik ----------

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 24;

/** Oyuncunun seçtiği ad: kırpılır, iç boşluklar teke iner; harf/rakam/boşluk/_-.' ve 2-24 karakter. */
export function normalizeDisplayName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  const len = [...s].length;
  if (len < DISPLAY_NAME_MIN || len > DISPLAY_NAME_MAX) return null;
  return /^[\p{L}\p{N} _.'-]+$/u.test(s) ? s : null;
}

/** Sahte (test) sağlayıcı yalnızca DEV_AUTH==='1' VE adres localhost / 127.0.0.1 iken açık. */
export function devAuthAllowed(devAuth: string | undefined, requestUrl: string): boolean {
  if (devAuth !== '1') return false;
  try {
    const h = new URL(requestUrl).hostname;
    return h === 'localhost' || h === '127.0.0.1';
  } catch {
    return false;
  }
}

export const isValidDevSub = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(s);

/** 24 ay (takvim ayı, UTC) önceki an: last_login_at bundan eskiyse hesap silinir. */
export function inactivityCutoff(now: number, months = INACTIVE_MONTHS): number {
  const d = new Date(now);
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
  // Ayın günü hedef ayda yoksa (31 -> 30/28) ayın son gününe kırpılır
  const target = new Date(t);
  const dim = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return t + (Math.min(d.getUTCDate(), dim) - 1) * 86400000;
}
