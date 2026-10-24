/**
 * Hata raporu sisteminin SAF çekirdeği (Ömer 2026-10-16; docs/arch/diagnostics.md). Tarayıcıya, Phaser'a bağlı değil: Node'da test edilir
 * (tests/diag.test.ts). Tarayıcı tarafı (pencere olayları, gönderim, onay) src/diag/diag.ts.
 *
 * - İz halkası (breadcrumb ring): son `maxCrumbs` olay localStorage'da (yenileme / çökme sonrası da okunur).
 * - Oturum işareti: açılışta "temiz değil" yazılır; sayfa gizlenince / kapanınca "temiz". Sonraki açılışta işaret temiz değilse önceki oturum
 *   çökmüş sayılır (`previous_session_crashed` raporu, önceki oturumun izleriyle).
 * - Rapor: yalnızca teknik veri (sürüm, tarayıcı türü, ekran, bellek ipuçları, sahne, izler, hata iletisi/yığını); boyut sınırı.
 * - Onay (opt-in) varsayılan KAPALI; kapalıyken `shouldSend` hep false.
 */
import cfg from '../../data/diag.json';

export const DIAG = cfg;

/** localStorage benzeri küçük arayüz (testte bellek içi). */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const KEYS = {
  /** Onay + bildirim görüldü + rastgele cihaz kimliği. */
  prefs: 'eov.diag.v1',
  /** İz halkası. */
  crumbs: 'eov.diag.crumbs.v1',
  /** Açık oturumların (sekmelerin) işaretleri: temiz çıkış + canlılık. */
  session: 'eov.diag.sessions.v1',
} as const;

/** İz türleri (kısa): boot, scene, ready, battle, campaign, error, rejection, gl, hidden, visible, report, info. */
export interface Crumb {
  /** Zaman (ms, epoch). */
  t: number;
  /** Tür. */
  k: string;
  /** Kısa ileti (en çok maxCrumbChars). */
  m: string;
  /** Oturum (sekme) kimliği. */
  s?: string;
}

export interface Prefs {
  consent: boolean;
  noticed: boolean;
  /** Yalnızca onay açıkken var (kapatınca silinir: sıfırlanır). */
  device?: string;
}

export interface SessionMark {
  id: string;
  start: number;
  clean: boolean;
  /** Son canlılık zamanı (ms). */
  seen: number;
  version: string;
  /** Son bilinen sahne. */
  scene?: string;
}

const clip = (s: unknown, n: number): string => {
  const str = typeof s === 'string' ? s : String(s ?? '');
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
};

const readJson = <T>(kv: KV, key: string): T | null => {
  try {
    const raw = kv.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeJson = (kv: KV, key: string, v: unknown): void => {
  try {
    kv.setItem(key, JSON.stringify(v));
  } catch {
    /* saklama kapalı / dolu: sessizce geç */
  }
};

// ------------------------------------------------------------------ onay

export function loadPrefs(kv: KV): Prefs {
  const p = readJson<Partial<Prefs>>(kv, KEYS.prefs);
  const out: Prefs = { consent: p?.consent === true, noticed: p?.noticed === true };
  if (out.consent && typeof p?.device === 'string' && isDeviceId(p.device)) out.device = p.device;
  return out;
}

export function savePrefs(kv: KV, p: Prefs): void {
  writeJson(kv, KEYS.prefs, p.consent && p.device ? p : { consent: p.consent, noticed: p.noticed });
}

/** 16 küçük harf onaltılık karakter (Worker da aynı biçimi ister). */
export const isDeviceId = (s: string): boolean => /^[0-9a-f]{16}$/.test(s);

/** Rastgele kimlik: `bytes` kripto rastgele baytları verir (tarayıcıda crypto.getRandomValues). */
export function randomId(bytes: (n: number) => Uint8Array, n = 8): string {
  return Array.from(bytes(n), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Onayı değiştirir: açılınca yeni cihaz kimliği (yoksa), kapanınca kimlik silinir. */
export function setConsent(kv: KV, on: boolean, bytes: (n: number) => Uint8Array): Prefs {
  const p = loadPrefs(kv);
  const next: Prefs = { consent: on, noticed: true };
  if (on) next.device = p.device ?? randomId(bytes);
  savePrefs(kv, next);
  return next;
}

// ------------------------------------------------------------------ iz halkası

export function loadCrumbs(kv: KV): Crumb[] {
  const a = readJson<unknown>(kv, KEYS.crumbs);
  if (!Array.isArray(a)) return [];
  return a.filter((c): c is Crumb => !!c && typeof c === 'object' && typeof (c as Crumb).t === 'number' && typeof (c as Crumb).k === 'string' && typeof (c as Crumb).m === 'string');
}

/**
 * İz ekler (halka: en eski düşer) ve saklar; güncel listeyi döner. Her eklemede saklanan liste yeniden okunur: aynı anda açık iki sekme
 * birbirinin izlerini silmesin (her iz sekmenin oturum kimliğini `s` taşır).
 */
export function pushCrumb(kv: KV, session: string, k: string, m: string, now: number, max = DIAG.maxCrumbs): Crumb[] {
  const list = loadCrumbs(kv);
  list.push({ t: now, k: clip(k, 16), m: clip(m, DIAG.maxCrumbChars), s: clip(session, 16) });
  if (list.length > max) list.splice(0, list.length - max);
  writeJson(kv, KEYS.crumbs, list);
  return list;
}

// ------------------------------------------------------------------ oturum / çökme

/**
 * Açık oturumlar (sekme başına bir işaret; aynı anda birden çok sekme olabilir). Her işaret `seen` ile düzenli tazelenir (görünürken
 * DIAG.heartbeatMs'de bir). Çökmüş sayılan: temiz değil VE `seen` DIAG.staleMs'ten eski (canlı başka bir sekme çökmüş sayılmaz).
 * Temiz = sayfa gizlendi (visibilitychange hidden) ya da kapandı (pagehide). Telefon sekmeyi arka planda öldürürse önce gizlenir: çökme sayılmaz.
 */
type Sessions = Record<string, SessionMark>;

const loadSessions = (kv: KV): Sessions => {
  const s = readJson<unknown>(kv, KEYS.session);
  if (!s || typeof s !== 'object' || Array.isArray(s)) return {};
  const out: Sessions = {};
  for (const [id, v] of Object.entries(s as Record<string, unknown>)) {
    const m = v as SessionMark;
    if (m && typeof m === 'object' && typeof m.clean === 'boolean' && typeof m.seen === 'number') out[id] = { ...m, id };
  }
  return out;
};

/** Çökmüş oturumları bulur, işaretlerini siler ve döner (en yenisi sonda). Temiz kapanmış işaretler de temizlenir. */
export function takeCrashed(kv: KV, now: number, selfId: string, staleMs = DIAG.staleMs): SessionMark[] {
  const all = loadSessions(kv);
  const crashed: SessionMark[] = [];
  let changed = false;
  for (const [id, m] of Object.entries(all)) {
    if (id === selfId) continue;
    if (m.clean && now - m.seen > staleMs) {
      delete all[id];
      changed = true;
    } else if (!m.clean && now - m.seen > staleMs) {
      crashed.push(m);
      delete all[id];
      changed = true;
    }
  }
  if (changed) writeJson(kv, KEYS.session, all);
  return crashed.sort((a, b) => a.seen - b.seen);
}

/** Açılışta: bu sekmenin "temiz değil" işaretini yazar; o anda kesin çökmüş (bayat) oturumları döner. */
export function beginSession(kv: KV, id: string, version: string, now: number): SessionMark[] {
  const crashed = takeCrashed(kv, now, id);
  const all = loadSessions(kv);
  all[id] = { id, start: now, seen: now, clean: false, version };
  writeJson(kv, KEYS.session, all);
  return crashed;
}

/** Kendi işaretini günceller; bayat diye silinmişse (uzun süre arka planda kalan sekme) yeniden kurar. */
const updateSelf = (kv: KV, id: string, patch: Partial<SessionMark> & { seen: number }): void => {
  const all = loadSessions(kv);
  const m = all[id] ?? { id, start: patch.seen, seen: patch.seen, clean: false, version: '' };
  all[id] = { ...m, ...patch };
  writeJson(kv, KEYS.session, all);
};

/** Temiz işaretini yazar/kaldırır (gizlenince true, yeniden görününce false). */
export function markClean(kv: KV, id: string, clean: boolean, now: number, scene?: string, version?: string): void {
  updateSelf(kv, id, { clean, seen: now, ...(scene ? { scene: clip(scene, 64) } : {}), ...(version ? { version } : {}) });
}

/** Canlılık: `seen` tazelenir (görünürken düzenli). */
export function heartbeat(kv: KV, id: string, now: number): void {
  updateSelf(kv, id, { seen: now });
}

/** Son sahneyi işarete yazar (çökme raporunda "nerede çöktü"). */
export function markScene(kv: KV, id: string, scene: string, now: number): void {
  updateSelf(kv, id, { scene: clip(scene, 64), seen: now });
}

/** Bir oturumun izleri (`s` = oturum kimliği). */
export function sessionCrumbs(list: Crumb[], sessionId: string): Crumb[] {
  return list.filter((c) => c.s === sessionId);
}

/** Son iz bir yükleme ortasında mı (sahne başlatıldı ama 'ready' gelmedi; ya da yükleme izi)? */
export function midLoad(crumbs: Crumb[]): boolean {
  const last = crumbs[crumbs.length - 1];
  return !!last && (last.k === 'scene' || last.k === 'load' || last.k === 'battle' || last.k === 'campaign');
}

// ------------------------------------------------------------------ rapor

export type ReportKind = 'error' | 'unhandledrejection' | 'previous_session_crashed' | 'webglcontextlost' | 'test';
export const REPORT_KINDS: readonly ReportKind[] = ['error', 'unhandledrejection', 'previous_session_crashed', 'webglcontextlost', 'test'];

export interface DiagEnv {
  ua: string;
  screen: [number, number];
  viewport: [number, number];
  dpr: number;
  /** navigator.deviceMemory (GB) */
  mem: number | null;
  /** performance.memory (MB; yalnızca Chromium) */
  heap: { used: number; total: number; limit: number } | null;
  /** Phaser dokularının yaklaşık boyutu (MB) */
  texMB: number | null;
  touch: boolean;
  /** WebGL mi Canvas mı */
  renderer: string;
}

export interface Report {
  v: 1;
  kind: ReportKind;
  device: string;
  session: string;
  at: string;
  app: string;
  scene: string;
  message: string;
  stack: string;
  midLoad: boolean;
  env: DiagEnv;
  crumbs: Crumb[];
}

export interface ReportInput {
  kind: ReportKind;
  device: string;
  session: string;
  now: number;
  app: string;
  scene: string;
  message?: string;
  stack?: string;
  env: DiagEnv;
  crumbs: Crumb[];
}

/** Rapor kurar: alanlar kırpılır; JSON boyutu sınırı aşarsa en eski izler düşer (en son izler kalır). */
export function buildReport(i: ReportInput, maxBytes = DIAG.maxReportBytes): Report {
  const r: Report = {
    v: 1,
    kind: i.kind,
    device: i.device,
    session: clip(i.session, 32),
    at: new Date(i.now).toISOString(),
    app: clip(i.app, 32),
    scene: clip(i.scene, 64),
    message: clip(i.message ?? '', DIAG.maxMessageChars),
    stack: clip(i.stack ?? '', DIAG.maxStackChars),
    midLoad: midLoad(i.crumbs),
    env: { ...i.env, ua: clip(i.env.ua, 300), renderer: clip(i.env.renderer, 16) },
    crumbs: i.crumbs.slice(-DIAG.maxCrumbs).map((c) => ({ t: c.t, k: clip(c.k, 16), m: clip(c.m, DIAG.maxCrumbChars) })),
  };
  while (byteLength(JSON.stringify(r)) > maxBytes && r.crumbs.length) r.crumbs.splice(0, Math.max(1, Math.ceil(r.crumbs.length / 8)));
  if (byteLength(JSON.stringify(r)) > maxBytes) r.stack = '';
  return r;
}

export const byteLength = (s: string): number => new TextEncoder().encode(s).length;

// ------------------------------------------------------------------ kısıtlama

export interface Throttle {
  sent: number;
  last: number;
  seen: Set<string>;
}

export const newThrottle = (): Throttle => ({ sent: 0, last: -Infinity, seen: new Set() });

/**
 * Gönderilsin mi? Onay kapalıysa ASLA. Açıksa: oturum başına en çok `maxReportsPerSession`, iki gönderim arası `minSendGapMs`,
 * aynı ileti (tür + ilk satır) bir kez. `test` raporu yalnızca onay ister (debug).
 */
export function shouldSend(prefs: Prefs, th: Throttle, kind: ReportKind, message: string, now: number): boolean {
  if (!prefs.consent || !prefs.device) return false;
  if (kind === 'test') return true;
  if (th.sent >= DIAG.maxReportsPerSession) return false;
  if (now - th.last < DIAG.minSendGapMs && kind !== 'previous_session_crashed') return false;
  const sig = `${kind}:${message.split('\n')[0]}`;
  if (th.seen.has(sig)) return false;
  return true;
}

export function noteSent(th: Throttle, kind: ReportKind, message: string, now: number): void {
  if (kind === 'test') return;
  th.sent++;
  th.last = now;
  th.seen.add(`${kind}:${message.split('\n')[0]}`);
}

// ------------------------------------------------------------------ metin günlüğü (Copy Log)

const pad = (n: number, w = 2): string => String(n).padStart(w, '0');

/** İzleri okunur metne çevirir (Copy Log; onay kapalıyken de çalışır, hiçbir şey göndermez). */
export function crumbsText(crumbs: Crumb[], header: Record<string, string>): string {
  const head = Object.entries(header).map(([k, v]) => `${k}: ${v}`);
  const lines = crumbs.map((c) => {
    const d = new Date(c.t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)} [${c.k}] ${c.m}`;
  });
  return [...head, '', ...lines].join('\n');
}
