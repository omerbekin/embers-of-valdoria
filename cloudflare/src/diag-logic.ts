/**
 * Hata raporu uç noktasının (POST /diag) saf kuralları (Ömer 2026-10-16; docs/arch/diagnostics.md). Cloudflare'e bağımlı değil:
 * oyunun testleri Node'da sınar (tests/diag-worker.test.ts). Sınırlar data/diag.json ile aynı (test eşitliği denetler).
 * Gizlilik: rapor YALNIZCA aşağıdaki alanlardan yeniden kurulur (fazla alan atılır); IP / konum okunmaz ve saklanmaz.
 */

export const MAX_REPORT_BYTES = 32768;
export const MAX_CRUMBS = 200;
export const MAX_CRUMB_CHARS = 240;
export const MAX_MESSAGE_CHARS = 500;
export const MAX_STACK_CHARS = 4000;
export const RETENTION_DAYS = 30;
export const RATE_LIMIT = 12;
export const RATE_WINDOW_SEC = 3600;
export const DIAG_KINDS = ['error', 'unhandledrejection', 'previous_session_crashed', 'webglcontextlost', 'test'] as const;
export type DiagKind = (typeof DIAG_KINDS)[number];

export interface CleanReport {
  v: 1;
  kind: DiagKind;
  device: string;
  session: string;
  at: string;
  app: string;
  scene: string;
  message: string;
  stack: string;
  midLoad: boolean;
  env: {
    ua: string;
    screen: [number, number];
    viewport: [number, number];
    dpr: number;
    mem: number | null;
    heap: { used: number; total: number; limit: number } | null;
    texMB: number | null;
    touch: boolean;
    renderer: string;
  };
  crumbs: Array<{ t: number; k: string; m: string }>;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.length <= max ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e9 ? v : null);
const pair = (v: unknown): [number, number] | null => (Array.isArray(v) && v.length === 2 && num(v[0]) !== null && num(v[1]) !== null ? [v[0] as number, v[1] as number] : null);

/** Gövdeyi doğrular ve temiz raporu döner; geçersizse hata kodu. */
export function parseReport(body: string): { ok: true; report: CleanReport } | { ok: false; error: string } {
  if (typeof body !== 'string' || body.length === 0) return { ok: false, error: 'empty' };
  if (new TextEncoder().encode(body).length > MAX_REPORT_BYTES) return { ok: false, error: 'too-large' };
  let v: unknown;
  try {
    v = JSON.parse(body);
  } catch {
    return { ok: false, error: 'bad-json' };
  }
  if (!isObj(v) || v.v !== 1) return { ok: false, error: 'bad-shape' };
  const kind = DIAG_KINDS.find((k) => k === v.kind);
  const device = str(v.device, 16);
  const session = str(v.session, 32);
  const at = str(v.at, 40);
  const app = str(v.app, 32);
  const scene = str(v.scene, 64);
  const message = str(v.message, MAX_MESSAGE_CHARS);
  const stack = str(v.stack, MAX_STACK_CHARS);
  if (!kind || !device || !/^[0-9a-f]{16}$/.test(device) || session === null || !at || Number.isNaN(Date.parse(at)) || app === null || scene === null || message === null || stack === null || typeof v.midLoad !== 'boolean') return { ok: false, error: 'bad-fields' };
  const e = v.env;
  if (!isObj(e)) return { ok: false, error: 'bad-env' };
  const ua = str(e.ua, 300);
  const screen = pair(e.screen);
  const viewport = pair(e.viewport);
  const dpr = num(e.dpr);
  const renderer = str(e.renderer, 16);
  const mem = e.mem === null ? null : num(e.mem);
  const texMB = e.texMB === null ? null : num(e.texMB);
  let heap: CleanReport['env']['heap'] = null;
  if (e.heap !== null) {
    if (!isObj(e.heap) || num(e.heap.used) === null || num(e.heap.total) === null || num(e.heap.limit) === null) return { ok: false, error: 'bad-env' };
    heap = { used: e.heap.used as number, total: e.heap.total as number, limit: e.heap.limit as number };
  }
  if (ua === null || !screen || !viewport || dpr === null || renderer === null || (e.mem !== null && mem === null) || (e.texMB !== null && texMB === null) || typeof e.touch !== 'boolean') return { ok: false, error: 'bad-env' };
  if (!Array.isArray(v.crumbs) || v.crumbs.length > MAX_CRUMBS) return { ok: false, error: 'bad-crumbs' };
  const crumbs: CleanReport['crumbs'] = [];
  for (const c of v.crumbs) {
    if (!isObj(c)) return { ok: false, error: 'bad-crumbs' };
    const t = typeof c.t === 'number' && Number.isFinite(c.t) ? c.t : null;
    const k = str(c.k, 16);
    const m = str(c.m, MAX_CRUMB_CHARS);
    if (t === null || k === null || m === null) return { ok: false, error: 'bad-crumbs' };
    crumbs.push({ t, k, m });
  }
  return {
    ok: true,
    report: { v: 1, kind, device, session, at, app, scene, message, stack, midLoad: v.midLoad, env: { ua, screen, viewport, dpr, mem, heap, texMB, touch: e.touch, renderer }, crumbs },
  };
}

/** Saklama anahtarı: r:<sunucu ISO zamanı>:<rastgele> (zamana göre sıralı listelenir). */
export const reportKey = (nowIso: string, rand: string): string => `r:${nowIso}:${rand}`;
/** Cihaz başına hız sınırı sayacının anahtarı (pencere başına). */
export const rateKey = (device: string, now: number): string => `rl:${device}:${Math.floor(now / 1000 / RATE_WINDOW_SEC)}`;
export const RETENTION_SEC = RETENTION_DAYS * 24 * 3600;

/** Sayaca göre kabul? (sayaç yoksa 0). */
export const rateOk = (count: number): boolean => count < RATE_LIMIT;
