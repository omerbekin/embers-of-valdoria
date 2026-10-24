import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { handleAuth, deleteInactiveAccounts, type AuthEnv, type Db } from '../cloudflare/src/auth';
import {
  authorizeUrl,
  b64urlDecode,
  b64urlEncode,
  checkGoogleClaims,
  decodeJwtPayload,
  devAuthAllowed,
  DEFAULT_AUTH_ORIGINS,
  hashToken,
  hmacKeyUsable,
  inactivityCutoff,
  isValidSessionToken,
  newOAuthSecrets,
  newSessionToken,
  normalizeDiscordProfile,
  normalizeDisplayName,
  OAUTH_COOKIE,
  originAllowed,
  parseCookies,
  parseOAuthState,
  pkceChallenge,
  safeReturnTo,
  serializeCookie,
  SESSION_COOKIE,
  signValue,
  stateMatches,
  verifyValue,
} from '../cloudflare/src/auth-logic';
import { decidePut, MAX_BLOB_BYTES, MAX_BODY_BYTES, MAX_TOMBSTONES, parseDeleteBody, parseRestoreBody, parseSavePut, schemaOlder, serializeBlob, SYNC_KEYS, throttled, MIN_PUT_INTERVAL_MS } from '../cloudflare/src/save-logic';

const KEY = 'k'.repeat(40);
const NOW = Date.UTC(2026, 9, 24, 12, 0, 0);
const enc = new TextEncoder();

const fakeJwt = (claims: Record<string, unknown>): string => `${b64urlEncode(enc.encode('{"alg":"RS256"}'))}.${b64urlEncode(enc.encode(JSON.stringify(claims)))}.sig`;

describe('auth-logic: çerezler', () => {
  it('Cookie başlığı çözülür; bozuk parçalar atlanır, ilk geçen kazanır', () => {
    expect(parseCookies('a=1; b=x%20y; bad; =z; a=2')).toEqual({ a: '1', b: 'x y' });
    expect(parseCookies(null)).toEqual({});
  });

  it('Set-Cookie: __Host- kuralları (Secure, Path=/, Domain yok), HttpOnly, SameSite=Lax', () => {
    const c = serializeCookie(SESSION_COOKIE, 'abc', { maxAgeSec: 60 });
    expect(c).toContain('__Host-eov_sid=abc');
    expect(c).toContain('Secure');
    expect(c).toContain('Path=/');
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Lax');
    expect(c).not.toMatch(/Domain=/i);
    expect(() => serializeCookie('bad name;', 'x', { maxAgeSec: 1 })).toThrow();
  });

  it('imzalı değer: doğru imza geçer; değiştirilmiş yük / imza / anahtar / süresi dolmuş reddedilir', async () => {
    const tok = await signValue({ exp: NOW + 1000, s: 'hello' }, KEY);
    expect(await verifyValue(tok, KEY, NOW)).toMatchObject({ s: 'hello' });
    // süre doldu
    expect(await verifyValue(tok, KEY, NOW + 1000)).toBeNull();
    // başka anahtar
    expect(await verifyValue(tok, 'x'.repeat(40), NOW)).toBeNull();
    // yük değiştirildi (imza aynı)
    const [, sig] = tok.split('.');
    const forged = `${b64urlEncode(enc.encode(JSON.stringify({ exp: NOW + 1000, s: 'evil' })))}.${sig}`;
    expect(await verifyValue(forged, KEY, NOW)).toBeNull();
    // imzanın bir karakteri değişti
    const flip = tok.slice(0, -1) + (tok.endsWith('A') ? 'B' : 'A');
    expect(await verifyValue(flip, KEY, NOW)).toBeNull();
    // biçimsiz
    expect(await verifyValue('', KEY, NOW)).toBeNull();
    expect(await verifyValue('a.b.c', KEY, NOW)).toBeNull();
    expect(await verifyValue(undefined, KEY, NOW)).toBeNull();
  });

  it('kısa HMAC anahtarı yapılandırılmamış sayılır', () => {
    expect(hmacKeyUsable(undefined)).toBe(false);
    expect(hmacKeyUsable('short')).toBe(false);
    expect(hmacKeyUsable(KEY)).toBe(true);
  });
});

describe('auth-logic: state + PKCE', () => {
  it('PKCE S256: RFC 7636 Ek B test vektörü', async () => {
    expect(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('yeni state/verifier: 43 karakter base64url, her seferinde farklı', () => {
    const a = newOAuthSecrets();
    const b = newOAuthSecrets();
    expect(a.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.state).not.toBe(b.state);
    expect(b64urlDecode(a.verifier)?.length).toBe(32);
  });

  it('state uyuşmazlığı, boş state reddedilir', () => {
    expect(stateMatches('abc', 'abc')).toBe(true);
    expect(stateMatches('abc', 'abd')).toBe(false);
    expect(stateMatches('abc', 'abcd')).toBe(false);
    expect(stateMatches('', '')).toBe(false);
    expect(stateMatches('abc', null)).toBe(false);
    expect(stateMatches(undefined, 'abc')).toBe(false);
  });

  it('OAuth çerez yükü doğrulanır (bilinmeyen sağlayıcı, kısa verifier, yanlış kip reddedilir)', () => {
    const { state, verifier } = newOAuthSecrets();
    const ok = { p: 'google', s: state, v: verifier, m: 'login', r: 'https://embersofvaldoria.com/', o: 'https://embersofvaldoria.com', exp: NOW + 1 };
    expect(parseOAuthState(ok)).toMatchObject({ p: 'google', m: 'login' });
    expect(parseOAuthState({ ...ok, p: 'github' })).toBeNull();
    expect(parseOAuthState({ ...ok, v: 'short' })).toBeNull();
    expect(parseOAuthState({ ...ok, m: 'admin' })).toBeNull();
    expect(parseOAuthState(null)).toBeNull();
  });

  it('yetkilendirme adresi: yalnızca openid / identify kapsamı, S256', () => {
    const g = new URL(authorizeUrl('google', 'cid', 'https://embersofvaldoria.com/auth/google/callback', 'st', 'ch'));
    expect(g.searchParams.get('scope')).toBe('openid');
    expect(g.searchParams.get('code_challenge_method')).toBe('S256');
    expect(g.searchParams.get('state')).toBe('st');
    const d = new URL(authorizeUrl('discord', 'cid', 'x', 'st', 'ch'));
    expect(d.searchParams.get('scope')).toBe('identify');
  });
});

describe('auth-logic: köken izni ve dönüş adresi', () => {
  const allowed = DEFAULT_AUTH_ORIGINS;

  it('izinli kökenler geçer; hostil ve hileli kökenler reddedilir', () => {
    expect(originAllowed('https://embersofvaldoria.com', allowed)).toBe(true);
    expect(originAllowed('http://localhost:5173', allowed)).toBe(true);
    expect(originAllowed('http://127.0.0.1:8787', allowed)).toBe(true);
    for (const bad of ['https://evil.com', 'https://embersofvaldoria.com.evil.com', 'https://evil.com/https://embersofvaldoria.com', 'http://embersofvaldoria.com', 'https://omerbekin.github.io', 'http://localhost.evil.com', 'http://localhost:5173x', 'http://localhost:5173/', 'null', '', null]) {
      expect(originAllowed(bad, allowed), String(bad)).toBe(false);
    }
  });

  it('dönüş adresi: göreli yol ve izinli köken kabul; hostil köken, //, \\, javascript: -> ana sayfa', () => {
    const self = 'https://embersofvaldoria.com';
    expect(safeReturnTo('/?debug=1', self, allowed)).toBe('https://embersofvaldoria.com/?debug=1');
    expect(safeReturnTo('http://localhost:5173/x', self, allowed)).toBe('http://localhost:5173/x');
    for (const bad of ['https://evil.com/', '//evil.com/', '/\\evil.com', 'javascript:alert(1)', 'https://user@embersofvaldoria.com.evil.com/', 'https://embersofvaldoria.com@evil.com/', null, '']) {
      expect(safeReturnTo(bad, self, allowed), String(bad)).toBe('https://embersofvaldoria.com/');
    }
  });
});

describe('auth-logic: sağlayıcı kimliği', () => {
  const CID = 'client-123.apps.googleusercontent.com';
  const nowSec = Math.floor(NOW / 1000);
  const good = { iss: 'https://accounts.google.com', aud: CID, sub: '1234567890', exp: nowSec + 600, iat: nowSec - 5, email: 'x@y.z' };

  it('Google id_token: geçerli iddialar sub döner (e-posta kullanılmaz)', () => {
    const r = checkGoogleClaims(decodeJwtPayload(fakeJwt(good)), CID, nowSec);
    expect(r).toEqual({ ok: true, sub: '1234567890' });
    expect(checkGoogleClaims({ ...good, iss: 'accounts.google.com' }, CID, nowSec).ok).toBe(true);
  });

  it('Google id_token: yanlış aud / iss, süresi dolmuş, gelecekte iat, eksik sub reddedilir', () => {
    expect(checkGoogleClaims({ ...good, aud: 'other' }, CID, nowSec)).toEqual({ ok: false, error: 'bad-aud' });
    expect(checkGoogleClaims({ ...good, aud: [CID, 'other'] }, CID, nowSec)).toEqual({ ok: false, error: 'bad-aud' });
    expect(checkGoogleClaims({ ...good, aud: [CID, 'other'], azp: CID }, CID, nowSec).ok).toBe(true);
    expect(checkGoogleClaims({ ...good, iss: 'https://evil.com' }, CID, nowSec)).toEqual({ ok: false, error: 'bad-iss' });
    expect(checkGoogleClaims({ ...good, exp: nowSec - 120 }, CID, nowSec)).toEqual({ ok: false, error: 'expired' });
    expect(checkGoogleClaims({ ...good, iat: nowSec + 3600 }, CID, nowSec)).toEqual({ ok: false, error: 'bad-iat' });
    expect(checkGoogleClaims({ ...good, sub: undefined }, CID, nowSec)).toEqual({ ok: false, error: 'bad-sub' });
    expect(checkGoogleClaims(good, '', nowSec).ok).toBe(false);
    expect(checkGoogleClaims(decodeJwtPayload('not.a.jwt!'), CID, nowSec).ok).toBe(false);
    expect(decodeJwtPayload('only.two')).toBeNull();
  });

  it('Discord profili: yalnızca snowflake id; ad/avatar/e-posta atılır', () => {
    expect(normalizeDiscordProfile({ id: '80351110224678912', username: 'n', avatar: 'a', email: 'e' })).toEqual({ provider: 'discord', sub: '80351110224678912' });
    expect(normalizeDiscordProfile({ id: 'abc' })).toBeNull();
    expect(normalizeDiscordProfile({ id: 123 })).toBeNull();
    expect(normalizeDiscordProfile(null)).toBeNull();
  });
});

describe('auth-logic: oturum, ad, sahte sağlayıcı, hareketsizlik', () => {
  it('oturum token biçimi ve SHA-256 hex özeti', async () => {
    const t = newSessionToken();
    expect(isValidSessionToken(t)).toBe(true);
    expect(isValidSessionToken('x')).toBe(false);
    expect(await hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('görünen ad: kırpılır, 2-24 karakter, izinli karakterler', () => {
    expect(normalizeDisplayName('  Sir   Ömer  ')).toBe('Sir Ömer');
    expect(normalizeDisplayName('a')).toBeNull();
    expect(normalizeDisplayName('x'.repeat(25))).toBeNull();
    expect(normalizeDisplayName('<script>')).toBeNull();
    expect(normalizeDisplayName(42)).toBeNull();
  });

  it('sahte sağlayıcı yalnızca DEV_AUTH=1 VE localhost/127.0.0.1', () => {
    expect(devAuthAllowed('1', 'http://localhost:8787/auth/dev')).toBe(true);
    expect(devAuthAllowed('1', 'http://127.0.0.1:8787/auth/dev')).toBe(true);
    expect(devAuthAllowed('1', 'https://embersofvaldoria.com/auth/dev')).toBe(false);
    expect(devAuthAllowed('1', 'http://localhost.evil.com/auth/dev')).toBe(false);
    expect(devAuthAllowed('1', 'http://192.168.1.5:5173/auth/dev')).toBe(false);
    expect(devAuthAllowed(undefined, 'http://localhost:8787/auth/dev')).toBe(false);
    expect(devAuthAllowed('true', 'http://localhost:8787/auth/dev')).toBe(false);
  });

  it('24 ay sınırı takvim ayıyla (ay sonu kırpılır)', () => {
    expect(new Date(inactivityCutoff(NOW)).toISOString()).toBe('2024-10-24T12:00:00.000Z');
    expect(new Date(inactivityCutoff(Date.UTC(2026, 2, 31))).toISOString()).toBe('2024-03-31T00:00:00.000Z');
    expect(new Date(inactivityCutoff(Date.UTC(2026, 1, 28), 1)).toISOString()).toBe('2026-01-28T00:00:00.000Z');
    expect(new Date(inactivityCutoff(Date.UTC(2026, 2, 31), 1)).toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });
});

describe('save-logic: PUT doğrulama', () => {
  const body = (o: Record<string, unknown>): string => JSON.stringify({ baseRev: 0, app: '0.9.8.1', versions: { 'eov.campaign.v1': 12 }, data: { 'eov.campaign.v1': '{"v":12}' }, ...o });

  it('geçerli gövde kabul', () => {
    const r = parseSavePut(body({}));
    expect(r.ok).toBe(true);
  });

  it('senkron listesi plandaki dört anahtar', () => {
    expect([...SYNC_KEYS]).toEqual(['eov.campaign.v1', 'eov.endless.v1', 'eov.endless.scores.v1', 'eov.tutorial.v1']);
  });

  it('boyut sınırı: 1 MB üstü gövde, blob sınırı üstü veri reddedilir', () => {
    const big = 'x'.repeat(MAX_BODY_BYTES);
    expect(parseSavePut(body({ data: { 'eov.campaign.v1': big } }))).toEqual({ ok: false, error: 'too-large' });
    expect(serializeBlob({ 'eov.campaign.v1': 'x'.repeat(MAX_BLOB_BYTES) })).toBeNull();
    expect(serializeBlob({ 'eov.campaign.v1': 'abc' })).toEqual({ blob: '{"eov.campaign.v1":"abc"}', size: 25 });
    // D1 satırı: blob + prev_blob + pay 2.000.000 baytı aşmaz
    expect(MAX_BLOB_BYTES * 2 + 64_000).toBeLessThan(2_000_000);
  });

  it('senkron dışı anahtar (eov.mp*, eov.diag.*, ayarlar), sürümsüz veri, fazla alan, bozuk tipler reddedilir', () => {
    expect(parseSavePut(body({ data: { 'eov.mp.name': 'x' }, versions: { 'eov.mp.name': 1 } })).ok).toBe(false);
    expect(parseSavePut(body({ data: { 'eov.diag.device': 'x' } }))).toEqual({ ok: false, error: 'bad-data' });
    expect(parseSavePut(body({ data: { 'eov.endless.v1': '{}' } }))).toEqual({ ok: false, error: 'bad-versions' });
    expect(parseSavePut(body({ extra: 1 }))).toEqual({ ok: false, error: 'bad-shape' });
    expect(parseSavePut(body({ baseRev: -1 }))).toEqual({ ok: false, error: 'bad-rev' });
    expect(parseSavePut(body({ baseRev: 1.5 }))).toEqual({ ok: false, error: 'bad-rev' });
    expect(parseSavePut(body({ app: '' }))).toEqual({ ok: false, error: 'bad-app' });
    expect(parseSavePut(body({ versions: { 'eov.campaign.v1': '12' } }))).toEqual({ ok: false, error: 'bad-versions' });
    expect(parseSavePut(body({ data: { 'eov.campaign.v1': 5 } }))).toEqual({ ok: false, error: 'bad-data' });
    expect(parseSavePut('{')).toEqual({ ok: false, error: 'bad-json' });
    expect(parseSavePut('[]')).toEqual({ ok: false, error: 'bad-shape' });
    expect(parseSavePut('')).toEqual({ ok: false, error: 'empty' });
  });

  it('şema koruması: buluttaki sürüm daha yeniyse eski; eksik anahtar eski sayılmaz', () => {
    expect(schemaOlder({ 'eov.campaign.v1': 13 }, { 'eov.campaign.v1': 12 })).toBe(true);
    expect(schemaOlder({ 'eov.campaign.v1': 12 }, { 'eov.campaign.v1': 12 })).toBe(false);
    expect(schemaOlder({ 'eov.campaign.v1': 12 }, { 'eov.campaign.v1': 13 })).toBe(false);
    expect(schemaOlder({ 'eov.endless.v1': 7 }, { 'eov.campaign.v1': 12 })).toBe(false);
  });

  it('PUT kararı: baseRev çakışması 409, şema eski 409, hız freni 429, kabulde rev+1', () => {
    const stored = { rev: 4, updatedAt: NOW - 60_000, versions: { 'eov.campaign.v1': 12 } };
    expect(decidePut(null, { baseRev: 0, versions: {} }, NOW)).toEqual({ ok: true, rev: 1 });
    expect(decidePut(null, { baseRev: 3, versions: {} }, NOW)).toMatchObject({ ok: false, status: 409, error: 'conflict', rev: 0 });
    expect(decidePut(stored, { baseRev: 3, versions: {} }, NOW)).toMatchObject({ ok: false, status: 409, error: 'conflict', rev: 4 });
    expect(decidePut(stored, { baseRev: 4, versions: { 'eov.campaign.v1': 11 } }, NOW)).toMatchObject({ ok: false, status: 409, error: 'schema-older' });
    expect(decidePut({ ...stored, updatedAt: NOW - 1000 }, { baseRev: 4, versions: { 'eov.campaign.v1': 12 } }, NOW)).toMatchObject({ ok: false, status: 429, error: 'throttled' });
    expect(decidePut(stored, { baseRev: 4, versions: { 'eov.campaign.v1': 12 } }, NOW)).toEqual({ ok: true, rev: 5 });
  });

  it('hız freni yardımcısı', () => {
    expect(throttled(NOW - 1, NOW)).toBe(true);
    expect(throttled(NOW - MIN_PUT_INTERVAL_MS, NOW)).toBe(false);
    expect(throttled(NOW + 10_000, NOW)).toBe(false);
  });

  it('tombstones: isteğe bağlı (yoksa []), en çok 32, tam biçim; bozuksa bad-tombstones', () => {
    const t = { slot: 2, campaignId: 'valdoria-1', deletedAt: NOW };
    const ok = parseSavePut(body({ tombstones: [t] }));
    expect(ok.ok && ok.put.tombstones).toEqual([t]);
    const none = parseSavePut(body({}));
    expect(none.ok && none.put.tombstones).toEqual([]);
    expect(parseSavePut(body({ tombstones: Array.from({ length: MAX_TOMBSTONES }, (_, i) => ({ ...t, slot: i })) })).ok).toBe(true);
    const bad: unknown[] = [
      Array.from({ length: MAX_TOMBSTONES + 1 }, () => t),
      'x',
      null,
      {},
      [null],
      [{ ...t, extra: 1 }],
      [{ slot: 1, campaignId: 'a' }],
      [{ ...t, slot: -1 }],
      [{ ...t, slot: 1.5 }],
      [{ ...t, slot: '1' }],
      [{ ...t, campaignId: '' }],
      [{ ...t, campaignId: 'x'.repeat(65) }],
      [{ ...t, campaignId: 'a\nb' }],
      [{ ...t, campaignId: 5 }],
      [{ ...t, deletedAt: -1 }],
      [{ ...t, deletedAt: 1.5 }],
      [{ ...t, deletedAt: '2026' }],
    ];
    for (const b of bad) expect(parseSavePut(body({ tombstones: b })), JSON.stringify(b)).toEqual({ ok: false, error: 'bad-tombstones' });
  });

  it('restore / delete gövdeleri', () => {
    expect(parseRestoreBody('{"baseRev":3}')).toEqual({ baseRev: 3 });
    expect(parseRestoreBody('{"baseRev":"3"}')).toBeNull();
    expect(parseDeleteBody('{"confirm":"DELETE"}')).toBe(true);
    expect(parseDeleteBody('{"confirm":"delete"}')).toBe(false);
    expect(parseDeleteBody('{}')).toBe(false);
  });
});

describe('auth rota işleyicileri (DB sorgusu gerektirmeyen yollar)', () => {
  /** Hiç sorgu beklenmeyen yerlerde verilen DB: dokunulursa test düşer. */
  const noDb = new Proxy({}, { get: () => () => { throw new Error('DB touched'); } }) as unknown as Db;
  const full: AuthEnv = { DB: noDb, SESSION_HMAC_KEY: KEY, GOOGLE_CLIENT_ID: 'gid', GOOGLE_CLIENT_SECRET: 'test-secret', DISCORD_CLIENT_ID: 'did', DISCORD_CLIENT_SECRET: 'test-secret' };
  const get = (url: string, headers: Record<string, string> = {}): Request => new Request(url, { headers });

  it('başka yollar bu modüle ait değil (null)', async () => {
    expect(await handleAuth(get('https://embersofvaldoria.com/lobby/health'), {})).toBeNull();
    expect(await handleAuth(get('https://embersofvaldoria.com/'), {})).toBeNull();
    expect(await handleAuth(get('https://embersofvaldoria.com/authx'), {})).toBeNull();
  });

  it('DB ya da secret yoksa 503', async () => {
    expect((await handleAuth(get('https://embersofvaldoria.com/auth/me'), {}))!.status).toBe(503);
    expect((await handleAuth(get('https://embersofvaldoria.com/save'), {}))!.status).toBe(503);
    expect((await handleAuth(get('https://embersofvaldoria.com/auth/google'), { DB: noDb }))!.status).toBe(503);
    expect((await handleAuth(get('https://embersofvaldoria.com/auth/discord'), { ...full, SESSION_HMAC_KEY: 'short' }))!.status).toBe(503);
    expect((await handleAuth(get('https://embersofvaldoria.com/auth/discord'), { ...full, DISCORD_CLIENT_SECRET: undefined }))!.status).toBe(503);
  });

  it('sahte sağlayıcı localhost dışında (DEV_AUTH=1 olsa bile) ve DEV_AUTH olmadan 404', async () => {
    expect((await handleAuth(get('https://embersofvaldoria.com/auth/dev?sub=a'), { ...full, DEV_AUTH: '1' }))!.status).toBe(404);
    expect((await handleAuth(get('http://192.168.1.5:8787/auth/dev?sub=a'), { ...full, DEV_AUTH: '1' }))!.status).toBe(404);
    expect((await handleAuth(get('http://localhost:8787/auth/dev?sub=a'), full))!.status).toBe(404);
    // Kapı açık ama DB yok: 503 (yol gerçekten açılmış)
    expect((await handleAuth(get('http://localhost:8787/auth/dev?sub=a'), { DEV_AUTH: '1' }))!.status).toBe(503);
  });

  it('OAuth başlangıcı: sağlayıcıya 302, PKCE S256, imzalı __Host- çerezi; dönüş adresi hostilse ana sayfa', async () => {
    const res = (await handleAuth(get('https://embersofvaldoria.com/auth/google?mode=login&return=https://evil.com/'), full))!;
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.origin).toBe('https://accounts.google.com');
    expect(loc.searchParams.get('redirect_uri')).toBe('https://embersofvaldoria.com/auth/google/callback');
    expect(loc.searchParams.get('code_challenge_method')).toBe('S256');
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie.startsWith(`${OAUTH_COOKIE}=`)).toBe(true);
    const value = decodeURIComponent(cookie.split(';')[0]!.slice(OAUTH_COOKIE.length + 1));
    const st = parseOAuthState(await verifyValue(value, KEY, Date.now()));
    expect(st).not.toBeNull();
    expect(st!.s).toBe(loc.searchParams.get('state'));
    expect(await pkceChallenge(st!.v)).toBe(loc.searchParams.get('code_challenge'));
    expect(st!.r).toBe('https://embersofvaldoria.com/');
  });

  it('OAuth başlangıcı izinsiz kökende (eski adres / hostil host) 403', async () => {
    expect((await handleAuth(get('https://eov.backinn.com.tr/auth/google'), full))!.status).toBe(403);
    expect((await handleAuth(get('https://evil.com/auth/discord'), full))!.status).toBe(403);
  });

  it('callback: çerez yok, state uyuşmazlığı, değiştirilmiş çerez -> ?auth=error&reason=state (sağlayıcıya gidilmez)', async () => {
    const start = (await handleAuth(get('https://embersofvaldoria.com/auth/google'), full))!;
    const raw = start.headers.get('set-cookie')!.split(';')[0]!;
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!;
    const cb = (q: string, cookie?: string) => handleAuth(get(`https://embersofvaldoria.com/auth/google/callback?${q}`, cookie ? { cookie } : {}), full);
    for (const r of [await cb(`state=${state}&code=c`), await cb(`state=wrong&code=c`, raw), await cb(`state=${state}&code=c`, raw.slice(0, -2) + 'xx')]) {
      expect(r!.status).toBe(302);
      const loc = new URL(r!.headers.get('location')!);
      expect(loc.searchParams.get('auth')).toBe('error');
      expect(loc.searchParams.get('reason')).toBe('state');
    }
    // Başka sağlayıcının çerezi bu callback'te geçmez
    const d = await handleAuth(get(`https://embersofvaldoria.com/auth/discord/callback?state=${state}&code=c`, { cookie: raw }), full);
    expect(new URL(d!.headers.get('location')!).searchParams.get('reason')).toBe('state');
    // Kullanıcı reddetti: state doğru, error parametresi
    const denied = await cb(`state=${state}&error=access_denied`, raw);
    expect(new URL(denied!.headers.get('location')!).searchParams.get('reason')).toBe('denied');
  });

  it('CSRF: durum değiştiren isteklerde izinsiz / eksik Origin ve JSON olmayan gövde 403', async () => {
    const put = (headers: Record<string, string>) => handleAuth(new Request('https://embersofvaldoria.com/save', { method: 'PUT', headers, body: '{}' }), full);
    expect((await put({ 'content-type': 'application/json' }))!.status).toBe(403);
    expect((await put({ origin: 'https://evil.com', 'content-type': 'application/json' }))!.status).toBe(403);
    expect((await put({ origin: 'https://embersofvaldoria.com', 'content-type': 'text/plain' }))!.status).toBe(403);
    const out = await handleAuth(new Request('https://embersofvaldoria.com/auth/logout', { method: 'POST', headers: { origin: 'https://evil.com' } }), full);
    expect(out!.status).toBe(403);
  });

  it('çıkış: oturum çerezi yoksa DB sorgusu olmadan çerez silinir (204)', async () => {
    const out = await handleAuth(new Request('https://embersofvaldoria.com/auth/logout', { method: 'POST', headers: { origin: 'https://embersofvaldoria.com' } }), full);
    expect(out!.status).toBe(204);
    expect(out!.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=;`);
  });

  it('yanlış yöntem 405, bilinmeyen yol 404', async () => {
    expect((await handleAuth(new Request('https://embersofvaldoria.com/auth/me', { method: 'POST' }), full))!.status).toBe(405);
    expect((await handleAuth(get('https://embersofvaldoria.com/auth/nope'), full))!.status).toBe(404);
  });

  it('zamanlanmış temizlik DB yokken hiçbir şey yapmaz', async () => {
    expect(await deleteInactiveAccounts({}, NOW)).toEqual({ users: 0, sessions: 0 });
  });
});

// ---------- gerçek SQLite (node:sqlite) üzerinde D1 benzeri adaptörle kayıt gidiş-dönüşü ----------

type SqliteMod = typeof import('node:sqlite');
const sqlite: SqliteMod | null = await import('node:sqlite').catch(() => null);

/** node:sqlite üzerinde D1'in auth.ts'te kullanılan kısmı (migration birebir uygulanır). */
function memoryDb(mod: SqliteMod): { db: Db; raw: InstanceType<SqliteMod['DatabaseSync']> } {
  const raw = new mod.DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON;');
  raw.exec(readFileSync(new URL('../cloudflare/migrations/0001_accounts.sql', import.meta.url), 'utf8'));
  const plain = <T>(r: unknown): T => (r ? ({ ...(r as object) } as T) : (r as T));
  const stmt = (sql: string, args: unknown[] = []): import('../cloudflare/src/auth').DbStatement => ({
    bind: (...v: unknown[]) => stmt(sql, v),
    first: async <T>() => (plain<T>(raw.prepare(sql).get(...(args as never[]))) ?? null) as T | null,
    all: async <T>() => ({ results: raw.prepare(sql).all(...(args as never[])).map((r) => plain<T>(r)) }),
    run: async () => ({ meta: { changes: Number(raw.prepare(sql).run(...(args as never[])).changes) } }),
  });
  const db: Db = {
    prepare: (sql) => stmt(sql),
    batch: async (list) => {
      raw.exec('BEGIN');
      try {
        const out = [];
        for (const s of list) out.push(await s.run());
        raw.exec('COMMIT');
        return out;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { db, raw };
}

describe.skipIf(!sqlite)('kayıt gidiş-dönüşü (SQLite): tombstones, unchanged, restore-previous', () => {
  const ORIGIN = 'https://embersofvaldoria.com';
  const T1 = { slot: 1, campaignId: 'valdoria-1', deletedAt: NOW };
  const T2 = { slot: 3, campaignId: 'valdoria-1', deletedAt: NOW + 5 };

  async function setup() {
    const { db, raw } = memoryDb(sqlite!);
    const token = newSessionToken();
    const t = Date.now();
    raw.prepare('INSERT INTO users (id, created_at, last_login_at, display_name) VALUES (?, ?, ?, NULL)').run('u1', t, t);
    raw.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(await hashToken(token), 'u1', t, t + 3_600_000);
    const env: AuthEnv = { DB: db };
    const headers = { cookie: `${SESSION_COOKIE}=${token}`, origin: ORIGIN, 'content-type': 'application/json' };
    const call = async (method: string, path: string, body?: unknown) => {
      const res = (await handleAuth(new Request(`${ORIGIN}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env))!;
      return { status: res.status, body: (await res.json()) as Record<string, any> };
    };
    /** Hız frenini geçmek için son yazımı geçmişe iter. */
    const age = () => raw.prepare('UPDATE saves SET updated_at = updated_at - 60000').run();
    const put = (baseRev: number, campaign: string, tombstones?: unknown) =>
      call('PUT', '/save', { baseRev, app: '0.9.8.1', versions: { 'eov.campaign.v1': 12 }, data: { 'eov.campaign.v1': campaign }, ...(tombstones === undefined ? {} : { tombstones }) });
    return { raw, call, age, put };
  }

  it('PUT tombstones saklanır, GET /save aynen döner; /auth/me özeti tombstones içermez', async () => {
    const { call, put } = await setup();
    const r = await put(0, '{"a":1}', [T1]);
    expect(r.status).toBe(200);
    expect(r.body.rev).toBe(1);
    const g = await call('GET', '/save');
    expect(g.body.save.tombstones).toEqual([T1]);
    expect(g.body.save.data).toEqual({ 'eov.campaign.v1': '{"a":1}' });
    expect(g.body.save.rev).toBe(1);
    const me = await call('GET', '/auth/me');
    expect(me.body.save.rev).toBe(1);
    expect(me.body.save).not.toHaveProperty('tombstones');
    expect(me.body.save).not.toHaveProperty('data');
  });

  it('tombstones alanı olmayan PUT [] saklar; bozuk tombstones 400', async () => {
    const { call, put } = await setup();
    expect((await put(0, '{}')).status).toBe(200);
    expect((await call('GET', '/save')).body.save.tombstones).toEqual([]);
    const bad = await put(1, '{}', [{ slot: 'x' }]);
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('bad-tombstones');
  });

  it('unchanged: aynı veri + aynı tombstones yazmaz; yalnızca tombstones değişince yeni rev', async () => {
    const { age, put } = await setup();
    await put(0, '{"a":1}', [T1]);
    age();
    const same = await put(1, '{"a":1}', [T1]);
    expect(same.status).toBe(200);
    expect(same.body).toMatchObject({ rev: 1, unchanged: true });
    const changed = await put(1, '{"a":1}', [T1, T2]);
    expect(changed.status).toBe(200);
    expect(changed.body.rev).toBe(2);
    expect(changed.body.unchanged).toBeUndefined();
  });

  it('restore-previous: veri ile birlikte tombstones da önceki hâline döner (ve geri)', async () => {
    const { call, age, put } = await setup();
    await put(0, '{"v":"old"}', [T1]);
    age();
    await put(1, '{"v":"new"}', [T1, T2]);
    age();
    const r = await call('POST', '/save/restore-previous', { baseRev: 2 });
    expect(r.status).toBe(200);
    expect(r.body.rev).toBe(3);
    let g = await call('GET', '/save');
    expect(g.body.save.data).toEqual({ 'eov.campaign.v1': '{"v":"old"}' });
    expect(g.body.save.tombstones).toEqual([T1]);
    age();
    await call('POST', '/save/restore-previous', { baseRev: 3 });
    g = await call('GET', '/save');
    expect(g.body.save.data).toEqual({ 'eov.campaign.v1': '{"v":"new"}' });
    expect(g.body.save.tombstones).toEqual([T1, T2]);
  });
});
