/**
 * Hata raporu (opt-in, varsayılan KAPALI; Ömer 2026-10-16; docs/arch/diagnostics.md): tarayıcı tarafı.
 * - `logEvent(kind, msg)`: iz (breadcrumb) ekler; onay kapalıyken de yerelde tutulur (Copy Log), hiçbir şey gönderilmez.
 * - `installDiag(game?)` (main.ts): pencere error / unhandledrejection, sahne geçişleri, sayfa gizlenme (temiz çıkış işareti), önceki oturumun
 *   çökmesi. Onay açıksa rapor Worker'a gider (`navigator.sendBeacon`, yoksa `fetch keepalive`); adres multiplayer sunucusunun kökü + /diag.
 * - Onay: `diagConsent()`, `setDiagConsent(on)`, `onDiagConsentChange(fn)`; ilk açılış bildirimi src/diag/diag-notice.ts.
 * Hafif modül (ana menü paketinde): Phaser'ı yalnızca tür olarak bilir.
 */
import type Phaser from 'phaser';
import { resolveSignalingUrl } from '../net/config';
import {
  DIAG,
  KEYS,
  beginSession,
  buildReport,
  crumbsText,
  heartbeat,
  loadCrumbs,
  loadPrefs,
  markClean,
  markScene,
  newThrottle,
  noteSent,
  pushCrumb,
  randomId,
  sessionCrumbs,
  setConsent,
  shouldSend,
  takeCrashed,
  type Crumb,
  type DiagEnv,
  type KV,
  type Prefs,
  type Report,
  type ReportKind,
  type SessionMark,
} from './diag-core';

const APP = typeof __DISPLAY_VERSION__ !== 'undefined' ? __DISPLAY_VERSION__ : 'dev';

/** Bellek içi yedek (localStorage kapalıysa). */
const memKV = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

function storageKV(): KV {
  try {
    const ls = window.localStorage;
    const probe = '__diag_probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memKV();
  }
}

const bytes = (n: number): Uint8Array => {
  const a = new Uint8Array(n);
  try {
    crypto.getRandomValues(a);
  } catch {
    for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256); // kripto yoksa (çok eski tarayıcı)
  }
  return a;
};

const state = {
  kv: null as KV | null,
  crumbs: [] as Crumb[],
  session: '',
  game: null as Phaser.Game | null,
  throttle: newThrottle(),
  installed: false,
  crashed: [] as SessionMark[],
  listeners: new Set<(on: boolean) => void>(),
  /** Debug: bu oturumda temiz işareti yazılmaz (yeniden yükleyince önceki oturum çökmüş sayılır). */
  noClean: false,
};

const kv = (): KV => (state.kv ??= typeof window === 'undefined' ? memKV() : storageKV());

function ensureSession(): void {
  if (state.session) return;
  state.session = randomId(bytes, 6);
  state.crumbs = loadCrumbs(kv());
}

/** İz ekler (tür kısa: scene, battle, campaign, error, gl, info...). Onay kapalıyken de yerelde tutulur; hiçbir şey göndermez. */
export function logEvent(kind: string, message = ''): void {
  try {
    ensureSession();
    state.crumbs = pushCrumb(kv(), state.session, kind, message, Date.now());
  } catch {
    /* tanılama oyunu asla bozmasın */
  }
}

// ------------------------------------------------------------------ onay

export const diagConsent = (): boolean => loadPrefs(kv()).consent;
export const diagNoticed = (): boolean => loadPrefs(kv()).noticed;
export const diagPrefs = (): Prefs => loadPrefs(kv());
/** Rapor kimliğinin kısa hali (cihaz kimliğinin ilk 8 hanesi; Settings > Privacy'de gösterilir, KVKK başvurusunda raporları bulmak için).
 *  Raporlar kapalıysa null. */
export const diagReportId = (): string | null => loadPrefs(kv()).device?.slice(0, 8) ?? null;

/** Onayı değiştirir (bildirim de görülmüş sayılır). Kapatınca cihaz kimliği silinir; açınca yeni rastgele kimlik. */
export function setDiagConsent(on: boolean): void {
  const was = diagConsent();
  setConsent(kv(), on, bytes);
  logEvent('info', `error reports ${on ? 'on' : 'off'}`);
  if (was !== on) for (const fn of state.listeners) fn(on);
  // Önceki oturum çöktüyse ve şimdi açıldıysa raporu yine de gönder (bildirimde açan oyuncu)
  if (on && !was) flushCrash();
}

/** Bildirimi görüldü say (onayı değiştirmeden). */
export function markDiagNoticed(): void {
  const p = loadPrefs(kv());
  if (!p.noticed) setConsent(kv(), p.consent, bytes);
}

/** Debug: bildirimi yeniden göstermek için "görülmedi" yapar (onay olduğu gibi kalır). */
export function resetDiagNotice(): void {
  const p = loadPrefs(kv());
  kv().setItem(KEYS.prefs, JSON.stringify({ ...p, noticed: false }));
}

export function onDiagConsentChange(fn: (on: boolean) => void): () => void {
  state.listeners.add(fn);
  return () => state.listeners.delete(fn);
}

// ------------------------------------------------------------------ ortam / sahne

/** Raporun gideceği adres: multiplayer sunucusunun kökü (wss://eov.backinn.com.tr/lobby -> https://eov.backinn.com.tr) + /diag. */
export function diagEndpoint(): string | null {
  if (typeof window === 'undefined') return null;
  const sig = resolveSignalingUrl(window.location.hostname, window.location.search);
  return sig ? diagUrlFrom(sig) : null;
}

/** Saf: signaling adresinden tanılama adresi. */
export function diagUrlFrom(signalingUrl: string): string {
  return `${signalingUrl.replace(/^ws/, 'http').replace(/\/+$/, '').replace(/\/lobby$/, '')}${DIAG.path}`;
}

/** Etkin sahneler (yer tutucu sahneler dahil, anahtarla). */
function currentScene(): string {
  try {
    const g = state.game;
    if (!g) return '';
    return g.scene
      .getScenes(true)
      .map((s) => s.sys.settings.key)
      .join('+');
  } catch {
    return '';
  }
}

/** Phaser dokularının yaklaşık bellek boyutu (MB; genişlik x yükseklik x 4). Yalnızca rapor anında hesaplanır. */
function textureMB(): number | null {
  try {
    const list = (state.game?.textures as unknown as { list?: Record<string, { source?: Array<{ width: number; height: number }> }> })?.list;
    if (!list) return null;
    let b = 0;
    for (const key of Object.keys(list)) for (const s of list[key]?.source ?? []) b += (s.width || 0) * (s.height || 0) * 4;
    return Math.round((b / 1048576) * 10) / 10;
  } catch {
    return null;
  }
}

export function collectEnv(): DiagEnv {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const pm = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  const mb = (n: number) => Math.round(n / 1048576);
  const r = state.game?.renderer as unknown as { gl?: unknown } | undefined;
  return {
    ua: nav.userAgent,
    screen: [screen.width, screen.height],
    viewport: [window.innerWidth, window.innerHeight],
    dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
    mem: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    heap: pm ? { used: mb(pm.usedJSHeapSize), total: mb(pm.totalJSHeapSize), limit: mb(pm.jsHeapSizeLimit) } : null,
    texMB: textureMB(),
    touch: (nav.maxTouchPoints ?? 0) > 0,
    renderer: !state.game ? '' : r?.gl ? 'webgl' : 'canvas',
  };
}

// ------------------------------------------------------------------ gönderim

/** Raporu kurar ve (onay açıksa, kısıtlama izin veriyorsa) gönderir. Gönderildiyse true. */
export function report(kind: ReportKind, message = '', stack = '', crumbs?: Crumb[], scene?: string): boolean {
  try {
    ensureSession();
    const prefs = loadPrefs(kv());
    const now = Date.now();
    if (!shouldSend(prefs, state.throttle, kind, message, now)) return false;
    const url = diagEndpoint();
    if (!url) return false;
    const r = buildReport({ kind, device: prefs.device!, session: state.session, now, app: APP, scene: scene ?? currentScene(), message, stack, env: collectEnv(), crumbs: crumbs ?? ownCrumbs() });
    noteSent(state.throttle, kind, message, now);
    logEvent('report', `${kind} sent`);
    send(url, r);
    return true;
  } catch {
    return false;
  }
}

function send(url: string, r: Report): void {
  const body = JSON.stringify(r);
  // text/plain gövde: tarayıcı ön kontrol (CORS preflight) yapmaz; Worker JSON olarak çözer
  try {
    if (navigator.sendBeacon?.(url, new Blob([body], { type: 'text/plain' }))) return;
  } catch {
    /* fetch'e düş */
  }
  void fetch(url, { method: 'POST', body, keepalive: true, mode: 'cors', credentials: 'omit', headers: { 'content-type': 'text/plain' } }).catch(() => undefined);
}

/** Debug: deneme raporu (onay gerekir); sunucu yanıtını bekler ve kısa sonuç yazısı döner. */
export async function sendTestReport(): Promise<string> {
  ensureSession();
  const prefs = loadPrefs(kv());
  if (!prefs.consent || !prefs.device) return 'Error reports are off (turn them on in Settings): nothing sent';
  const url = diagEndpoint();
  if (!url) return 'No report server configured';
  const r = buildReport({ kind: 'test', device: prefs.device, session: state.session, now: Date.now(), app: APP, scene: currentScene(), message: 'Test report from the debug menu', env: collectEnv(), crumbs: ownCrumbs().slice(-30) });
  try {
    const res = await fetch(url, { method: 'POST', body: JSON.stringify(r), mode: 'cors', credentials: 'omit', headers: { 'content-type': 'text/plain' } });
    const text = (await res.text()).slice(0, 120);
    logEvent('report', `test ${res.status}`);
    return `Server answered ${res.status}: ${text}`;
  } catch (e) {
    return `Could not reach ${url} (${e instanceof Error ? e.message : String(e)})`;
  }
}

/** Önceki oturum çöktüyse ve onay açıksa çökme raporunu bir kez gönderir. */
function flushCrash(): void {
  const prev = state.crashed[state.crashed.length - 1]; // en yeni çökme (birden çok sekme çöktüyse sayısı iletide)
  if (!prev) return;
  if (!diagConsent()) return; // onay kapalı: hiçbir şey gönderilmez (rapor saklanmaz da)
  const n = state.crashed.length;
  state.crashed = [];
  const crumbs = sessionCrumbs(loadCrumbs(kv()), prev.id).slice(-DIAG.crashCrumbs);
  report('previous_session_crashed', `previous session (v${prev.version || '?'}) did not close cleanly${n > 1 ? ` (${n} sessions)` : ''}`, '', crumbs, prev.scene ?? '');
}

/** Bu oturumun izleri (aynı anda açık başka sekmelerinkiler hariç). */
const ownCrumbs = (): Crumb[] => sessionCrumbs(loadCrumbs(kv()), state.session).slice(-DIAG.maxCrumbs);

/** Bayat (temiz kapanmamış, canlılığı kesilmiş) oturumları alır, izini düşer ve (onay açıksa) raporlar. */
function checkCrashed(): void {
  const found = takeCrashed(kv(), Date.now(), state.session);
  if (!found.length) return;
  state.crashed.push(...found);
  for (const c of found) logEvent('info', `previous session ${c.id} did not close cleanly (last scene ${c.scene ?? '?'})`);
  flushCrash();
}

// ------------------------------------------------------------------ metin günlüğü

export function diagLogText(): string {
  ensureSession();
  const env = typeof window === 'undefined' ? null : collectEnv();
  return crumbsText(loadCrumbs(kv()), {
    'Embers of Valdoria log': APP,
    'Error reports': diagConsent() ? 'on' : 'off',
    Scene: currentScene() || '-',
    ...(env ? { Device: env.ua, Screen: `${env.screen.join('x')} @${env.dpr}x, view ${env.viewport.join('x')}`, Memory: `${env.mem ?? '?'} GB device, heap ${env.heap ? `${env.heap.used}/${env.heap.limit} MB` : '?'}, textures ${env.texMB ?? '?'} MB` } : {}),
  });
}

export const diagCrumbs = (): readonly Crumb[] => {
  ensureSession();
  return loadCrumbs(kv());
};

/** Panoya kopyalar (Copy Log). Başarılıysa true. */
export async function copyDiagLog(): Promise<boolean> {
  const text = diagLogText();
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// ------------------------------------------------------------------ kurulum

const errText = (e: unknown): { message: string; stack: string } => {
  if (e instanceof Error) return { message: `${e.name}: ${e.message}`, stack: e.stack ?? '' };
  if (typeof e === 'string') return { message: e, stack: '' };
  try {
    return { message: JSON.stringify(e)?.slice(0, 300) ?? String(e), stack: '' };
  } catch {
    return { message: String(e), stack: '' };
  }
};

/** Yakalanan hata (ör. oyun döngüsü güvenlik ağı): iz + (onay açıksa) rapor. */
export function captureError(e: unknown, where = 'error'): void {
  const { message, stack } = errText(e);
  logEvent('error', `${where}: ${message}`);
  report('error', message, stack);
}

/** Sahne başlatma çağrılarını izler (scene.start / restart: SceneManager.start); hazır olunca 'ready' izi. */
function hookScenes(game: Phaser.Game): void {
  const mgr = game.scene as unknown as { start: (key: string, data?: object) => unknown; getScene: (k: string) => Phaser.Scene | null };
  const orig = mgr.start.bind(mgr);
  mgr.start = (key: string, data?: object) => {
    try {
      logEvent('scene', `${key}${sceneDataNote(data)}`);
      markScene(kv(), state.session, key, Date.now());
    } catch {
      /* yok say */
    }
    const out = orig(key, data);
    try {
      mgr.getScene(key)?.sys.events.once('create', () => logEvent('ready', key));
    } catch {
      /* yok say */
    }
    return out;
  };
}

/** Sahne verisinden kısa not (savaş: seed, mod, karşılaşma / düğüm; multiplayer). Kayıt içeriği yazılmaz. */
export function sceneDataNote(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as { seed?: unknown; mode?: unknown; mp?: unknown; tutorial?: { encounter?: unknown; node?: unknown }; endless?: unknown };
  const bits: string[] = [];
  if (typeof d.seed === 'number') bits.push(`seed ${d.seed}`);
  if (typeof d.mode === 'string') bits.push(d.mode);
  if (d.mp) bits.push('mp');
  if (d.tutorial && typeof d.tutorial === 'object') {
    if (typeof d.tutorial.encounter === 'string') bits.push(`enc ${d.tutorial.encounter}`);
    if (typeof d.tutorial.node === 'string') bits.push(`node ${d.tutorial.node}`);
  }
  return bits.length ? ` (${bits.join(', ')})` : '';
}

/** main.ts: oyun kurulunca (sahne geçişleri izlenir, raporda sahne ve doku belleği). */
export function attachDiagGame(game: Phaser.Game): void {
  if (state.game) return;
  state.game = game;
  hookScenes(game);
}

/** main.ts: bir kez, açılışın en başında (oyun kurulmadan önceki hatalar da yakalanır). */
export function installDiag(): void {
  if (state.installed || typeof window === 'undefined') return;
  state.installed = true;
  ensureSession();
  state.crashed = beginSession(kv(), state.session, APP, Date.now());
  logEvent('boot', `${state.session} v${APP}`);

  window.addEventListener('error', (e: ErrorEvent) => {
    // Kaynak (resim/ses) yükleme hataları ErrorEvent değildir; yalnızca betik hataları
    if (!(e instanceof ErrorEvent)) return;
    const message = e.error instanceof Error ? `${e.error.name}: ${e.error.message}` : e.message || 'Script error';
    logEvent('error', message);
    report('error', message, e.error instanceof Error ? (e.error.stack ?? '') : `${e.filename ?? ''}:${e.lineno ?? 0}:${e.colno ?? 0}`);
  });
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const { message, stack } = errText(e.reason);
    logEvent('rejection', message);
    report('unhandledrejection', message, stack);
  });
  // Temiz çıkış: sayfa gizlenince / kapanınca işaret "temiz" (telefon arka plandaki sekmeyi öldürürse çökme sayılmaz)
  const hidden = (): void => {
    logEvent('hidden', currentScene());
    if (!state.noClean) markClean(kv(), state.session, true, Date.now(), currentScene());
  };
  window.addEventListener('pagehide', hidden);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hidden();
    else {
      logEvent('visible', currentScene());
      markClean(kv(), state.session, false, Date.now(), undefined, APP);
    }
  });
  // Canlılık: görünürken işaret düzenli tazelenir (aynı anda açık başka bir sekme bu sekmeyi çökmüş saymasın)
  window.setInterval(() => {
    if (document.visibilityState !== 'hidden') heartbeat(kv(), state.session, Date.now());
  }, DIAG.heartbeatMs);
  for (const c of state.crashed) logEvent('info', `previous session ${c.id} did not close cleanly (last scene ${c.scene ?? '?'})`);
  // Biraz sonra (açılışı yavaşlatmasın); onay kapalıysa hiçbir şey gönderilmez. Az önce kapanmış (henüz bayatlamamış) oturum ikinci denetimde
  if (state.crashed.length) window.setTimeout(flushCrash, 3000);
  window.setTimeout(checkCrashed, DIAG.staleMs + 2000);
}

/** Debug: bu oturumu "temiz kapanmadı" bırakır; sayfa yenilenince önceki oturum çökmüş sayılır (çökme raporu, onay açıksa). */
export function debugMarkCrash(): void {
  state.noClean = true;
  markClean(kv(), state.session, false, Date.now(), undefined, APP);
  logEvent('info', 'debug: crash mark (reload to test)');
}
