/**
 * Bulut kaydı istemci yapıştırıcısı (accounts-plan.md > İstemci, Faz 1d'nin görsel olmayan kısmı). Ekran/DOM YOK: Account sayfası ve çakışma
 * diyaloğu bu API'ye bağlanır. Sunucu sözleşmesi: cloudflare/src/auth.ts + save-logic.ts.
 *
 * Kurallar (plan + Ömer kararları 2026-10-24):
 * - Girişsiz oyuncu HİÇ ağ çağrısı yapmaz ve `eov.cloud.v1` hiç oluşmaz. Açılışta /auth/me yalnızca bu cihazda giriş yapılmışsa (meta var) ya da
 *   adreste ?auth=ok varsa çağrılır. `checkLoginAvailable()` yalnızca arayüz açıkça isterse (Account sayfası) /auth/me yoklar.
 * - Giriş yalnızca embersofvaldoria.com ve localhost'ta (karar 3); /auth/me 503 ya da ağ hatası verirse giriş gizlenir.
 * - Girişte gizlilik kutusu zorunlu (karar 7): startLogin consentAccepted=true olmadan reddeder.
 * - İlk senkron ve uzak değişiklik sync-core.ts > decideSync ile; çakışmada HER ZAMAN sorulur (karar 1) -> PendingDecision.
 * - Yükleme: senkron anahtarı değişince 15 sn debounce (en geç 60 sn), sekme gizlenince keepalive fetch (gövde > 64 KB ise sonraki açılışta).
 * - İndirme / yerele yazma yalnızca uygulamanın "güvenli" dediği anda (setApplyGate; ana menü). Koşu ortasında asla.
 * - 409 conflict -> buluttaki kayıt yeniden okunur, yeniden karar; 409 schema-older -> 'newer-version' (yükleme durur); 429/ağ hatası sessiz yeniden deneme.
 * - Meta `eov.cloud.v1` {userId, rev, hash, dirty, lastSyncAt}: kendisi senkronlanmaz.
 * Ağır modüller (sync-core, sefer/Endless kayıt okuyucuları) yalnızca giriş yapılmışsa dinamik yüklenir (ana menü parçası hafif kalır).
 */
import type { KV, SlotSummary } from '../campaign/save';
import type { IronmanPin, SyncBundle } from './sync-core';
import { clearCloudDirty, cloudDirty, onCloudDirty, storage } from '../game/kv-storage';
import { BACKUP_KEY, SYNC_KEYS, type SyncKey } from './keys';
import { mergeTombstones, readTombstones, sameTombstones, type Tombstone } from './tombstones';
import cloudConfig from '../../data/cloud.json';
import { isIsolatedCopy } from '../storage-scope';

export const CLOUD_META_KEY = 'eov.cloud.v1';
export const DEBOUNCE_MS = 15_000;
export const MAX_WAIT_MS = 60_000;
/** keepalive fetch gövde sınırı (tarayıcı); aşan gövde sonraki açılışta yüklenir. */
export const KEEPALIVE_MAX_BYTES = 64 * 1024;
export const RETRY_STEPS_MS = [15_000, 30_000, 60_000, 120_000, 300_000];
/** Bekleyen indirme varken güvenli anın yoklama aralığı (yalnızca yerel işlev çağrısı, ağ yok). */
export const GATE_POLL_MS = 3_000;
/**
 * Canlı çekme (2026-10-25): girişliyken ve sekme görünürken bulut rev'i ucuz GET /auth/me ile yoklanır (dakikada bir + sekme görünür olunca).
 * Sekme gizliyken yoklama durur; hatada aralık ikiye katlanır (en çok PULL_MAX_MS). Görünür olunca son yoklama PULL_MIN_GAP_MS'den yeniyse çağrı yok.
 * Bütçe: açık sekme başına saatte en çok 60 istek (Worker ücretsiz plan 100k/gün).
 */
export const PULL_MS = 60_000;
export const PULL_MAX_MS = 600_000;
export const PULL_MIN_GAP_MS = 15_000;
const MAX_CONFLICT_ROUNDS = 3;
const LOGIN_HOSTS = ['embersofvaldoria.com', 'localhost', '127.0.0.1'];

// ---------------------------------------------------------------- tipler

export type LoginProvider = 'google' | 'discord';
export type LoginMode = 'login' | 'link';
export type CloudStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'needs-choice' | 'newer-version';

/** /auth/me ve GET /save kayıt üst bilgisi (sunucu). */
export interface ServerSaveMeta {
  rev: number;
  updatedAt: number;
  versions: Partial<Record<SyncKey, number>>;
  app: string;
  size: number;
  hash: string;
}

/** `eov.cloud.v1`: bu cihazın son senkron durumu. */
export interface CloudMeta {
  userId: string;
  /** Bu cihazın bildiği son bulut rev'i (sonraki PUT'un baseRev'i). */
  rev: number;
  hash: string | null;
  /** Son senkrondan sonra yerel ilerleme değişti (yüklenmemiş). */
  dirty: boolean;
  lastSyncAt: string | null;
}

export interface AccountState {
  signedIn: boolean;
  userId: string | null;
  displayName: string | null;
  /** Bağlı sağlayıcılar ('google' | 'discord' | yerelde 'dev'). */
  providers: string[];
  /** Buluttaki kaydın üst bilgisi (yoksa null). */
  save: ServerSaveMeta | null;
  /** Hesap sayfasında gösterilen destek kimliği (gizlilik metni: silme / hak talebi için). Şimdilik hesap kimliğinin kendisi. */
  supportId: string | null;
  /** Bu cihazın senkron durumu (girişsizken null). */
  local: CloudMeta | null;
}

/** Çakışma diyaloğunda bir tarafın özeti (mevcut okuyuculardan; ham veri değil). */
export interface SideSummary {
  /** Sefer yuvaları (campaign/save.ts > slotSummaries; boş yuva null). */
  slots: Array<SlotSummary | null>;
  /** Süren Endless koşusu (yoksa null). */
  endless: { wave: number; classes: string[] } | null;
  /** Endless skor sayısı ve en iyi dalga. */
  scores: { count: number; bestWave: number | null };
  /** Bulut tarafında son yükleme zamanı (ISO); yerel tarafta null. */
  savedAt: string | null;
  /** Bulut tarafını yazan oyun sürümü; yerelde null. */
  app: string | null;
}

export type ResolveResult = { ok: true } | { ok: false; reason: 'stale' | 'apply-failed' | 'unavailable' };

/** decideSync 'ask' dediğinde arayüze verilen karar nesnesi. */
export interface PendingDecision {
  local: SideSummary;
  cloud: SideSummary;
  /** Seçimden bağımsız sabitlenen Ironman yuvaları (diyalogda belirtilir). */
  pins: IronmanPin[];
  /** 'cloud': bulut yerele yazılır (yerel yedeklenir); 'local': yerel yüklenir (bulut yerelde yedeklenir). Ironman sabitlemesi iki seçimde de uygulanır. */
  resolve(choice: 'cloud' | 'local'): Promise<ResolveResult>;
}

export type CloudEvent =
  | { type: 'status'; status: CloudStatus; error?: string }
  | { type: 'account'; account: AccountState }
  /** ?auth=ok|error dönüşü (reason: sunucunun `reason` / `code` parametresi). */
  | { type: 'auth'; ok: boolean; reason?: string }
  | { type: 'pending'; pending: PendingDecision | null }
  /** Yerel ilerleme buluttan değişti (ana menü yuvaları / Continue yenilenmeli). */
  | { type: 'applied'; source: 'download' | 'merge' | 'choice' };

export type ActionResult = { ok: true } | { ok: false; reason: string };

// ---------------------------------------------------------------- bağımlılıklar

/** fetch'in burada kullanılan kısmı (testler sahte verir). */
export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string; keepalive?: boolean; credentials?: 'same-origin' }) => Promise<{ status: number; headers: { get(name: string): string | null }; text(): Promise<string> }>;

/** Ağır modüller (dinamik yüklenir). */
export interface CloudCore {
  sync: typeof import('./sync-core');
  slotSummaries: typeof import('../campaign/save').slotSummaries;
  loadRun: typeof import('../endless/save').loadRun;
  loadScores: typeof import('../endless/save').loadScores;
  memoryKV: typeof import('../campaign/save').memoryKV;
}

/**
 * Hata raporu bağlantısı (docs/arch/diagnostics.md > Bulut). Varsayılan no-op; tarayıcıda main.ts > initCloud gerçek src/diag/diag'a bağlar
 * (cloud.ts diag'ı içe aktarmaz: Node testleri ve döngüsel içe aktarma). İletiler YALNIZCA teknik: karar türü, rev, http durumu, hata kodu,
 * anahtar ADLARI ve sürümleri, yuva sayıları. Kayıt içeriği, görünen ad, e-posta, kullanıcı kimliği, çerez ASLA.
 */
export interface CloudDiag {
  /** İz (logEvent 'cloud'); onay kapalıyken de yerelde tutulur. */
  log(msg: string): void;
  /** Rapor (onay açıksa gönderilir). code: kısa kod (me-500, save-shape, cloud_apply_mismatch...). */
  report(code: string, msg: string): void;
}

const NO_DIAG: CloudDiag = { log: () => undefined, report: () => undefined };

/** Tanılama iletisine giren dışarıdan gelen kod (sunucu hata kodu, ?auth reason) güvenli ve kısa tutulur. */
const safeCode = (v: unknown): string => String(v ?? '').replace(/[^0-9A-Za-z_.-]/g, '').slice(0, 40) || 'unknown';

export interface CloudDeps {
  /** Ana anahtar (data/cloud.json > enabled). Kapalıyken istemci HİÇ ağ çağrısı yapmaz, dinleyici kurmaz, giriş kullanılamaz (Ömer 2026-10-24: giriş şimdilik 'coming soon'). Testler true verir. */
  enabled: boolean;
  fetch: FetchLike;
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (h: unknown) => void;
  /** Sarılı depo (kv-storage.ts > storage): senkron anahtarı yazımı kirli işaretler. */
  kv: () => KV | null;
  hostname: string;
  /** Adres (yol + sorgu + hash) okuma / temizleme. */
  location: () => { pathname: string; search: string; hash: string };
  replaceUrl: (url: string) => void;
  navigate: (url: string) => void;
  /** Sekme gizlenince çağrılacak işlevi kaydeder. */
  onHidden: (fn: () => void) => void;
  /** Sekme görünür olunca çağrılacak işlevi kaydeder (canlı çekme). */
  onVisible: (fn: () => void) => void;
  /** Sekme şu an görünür mü (gizliyken canlı çekme yapılmaz). */
  isVisible: () => boolean;
  app: string;
  loadCore: () => Promise<CloudCore>;
  /** Hata raporu izleri / raporları (varsayılan no-op). */
  diag: CloudDiag;
}

const defaultLoadCore = async (): Promise<CloudCore> => {
  const [sync, campaign, endless] = await Promise.all([import('./sync-core'), import('../campaign/save'), import('../endless/save')]);
  return { sync, slotSummaries: campaign.slotSummaries, loadRun: endless.loadRun, loadScores: endless.loadScores, memoryKV: campaign.memoryKV };
};

function browserDeps(): CloudDeps {
  const w = typeof window !== 'undefined' ? window : undefined;
  return {
    enabled: cloudConfig.enabled === true && !isIsolatedCopy(), // /maps23/ test kopyasında bulut kapalı
    fetch: (url, init) => fetch(url, init),
    now: () => Date.now(),
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>),
    kv: storage,
    hostname: w?.location.hostname ?? '',
    location: () => ({ pathname: w?.location.pathname ?? '/', search: w?.location.search ?? '', hash: w?.location.hash ?? '' }),
    replaceUrl: (url) => w?.history.replaceState(w.history.state, '', url),
    navigate: (url) => w?.location.assign(url),
    onHidden: (fn) => {
      if (typeof document === 'undefined') return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') fn();
      });
    },
    onVisible: (fn) => {
      if (typeof document === 'undefined') return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') fn();
      });
    },
    isVisible: () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
    app: typeof __DISPLAY_VERSION__ !== 'undefined' ? __DISPLAY_VERSION__ : '0.0.0',
    loadCore: defaultLoadCore,
    diag: NO_DIAG,
  };
}

// ---------------------------------------------------------------- yardımcılar

export const isLoginHost = (hostname: string): boolean => LOGIN_HOSTS.includes(hostname);

interface Http {
  status: number;
  body: unknown;
  retryAfter: number | null;
}

interface CloudSide {
  bundle: SyncBundle;
  save: ServerSaveMeta;
}

/** Bekleyen uzak iş. gen: kararın verildiği andaki yerel yazım sayacı (uygulamadan önce yerel değiştiyse yeniden karar verilir); from: kararın bulut tarafı. */
type Remote = ({ kind: 'download'; cloud: CloudSide } | { kind: 'merge'; cloud: CloudSide; bundle: SyncBundle } | { kind: 'ask'; cloud: CloudSide; pins: IronmanPin[] }) & { gen: number; from: CloudSide | null };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const byteLength = (s: string): number => new TextEncoder().encode(s).length;

function parseServerSave(v: unknown): ServerSaveMeta | null {
  if (!isObj(v) || typeof v.rev !== 'number') return null;
  return {
    rev: v.rev,
    updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : 0,
    versions: isObj(v.versions) ? (v.versions as ServerSaveMeta['versions']) : {},
    app: typeof v.app === 'string' ? v.app : '',
    size: typeof v.size === 'number' ? v.size : 0,
    hash: typeof v.hash === 'string' ? v.hash : '',
  };
}

function parseMeta(raw: string | null): CloudMeta | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!isObj(v) || typeof v.userId !== 'string' || typeof v.rev !== 'number') return null;
    return { userId: v.userId, rev: v.rev, hash: typeof v.hash === 'string' ? v.hash : null, dirty: v.dirty === true, lastSyncAt: typeof v.lastSyncAt === 'string' ? v.lastSyncAt : null };
  } catch {
    return null;
  }
}

/** Sunucudaki silme işareti biçimi (deletedAt: ms). */
export interface WireTombstone {
  slot: number;
  campaignId: string;
  deletedAt: number;
}

/** GET /save `tombstones` alanı -> paket işaretleri (ISO deletedAt); bozuk girdiler atlanır, en çok 32 (mergeTombstones). */
export function tombstonesFromWire(x: unknown): Tombstone[] {
  if (!Array.isArray(x)) return [];
  const out: Tombstone[] = [];
  for (const t of x) {
    if (!isObj(t) || !Number.isInteger(t.slot) || (t.slot as number) < 0 || (t.slot as number) >= 64 || typeof t.campaignId !== 'string') continue;
    const ms = typeof t.deletedAt === 'number' ? t.deletedAt : typeof t.deletedAt === 'string' ? Date.parse(t.deletedAt) : NaN;
    if (!Number.isFinite(ms)) continue;
    out.push({ slot: t.slot as number, campaignId: t.campaignId, deletedAt: new Date(ms).toISOString() });
  }
  return mergeTombstones(out);
}

/** PUT /save gövdesi: yalnızca sürümü okunabilen dolu anahtarlar (sunucu sürümsüz veriyi reddeder) + paketin silme işaretleri (her PUT'ta). */
export function putBody(bundle: SyncBundle, baseRev: number, app: string): { baseRev: number; app: string; versions: Partial<Record<SyncKey, number>>; data: Partial<Record<SyncKey, string>>; tombstones: WireTombstone[] } {
  const versions: Partial<Record<SyncKey, number>> = {};
  const data: Partial<Record<SyncKey, string>> = {};
  for (const k of SYNC_KEYS) {
    const raw = bundle.data[k];
    const v = bundle.versions[k];
    if (typeof raw === 'string' && typeof v === 'number') {
      data[k] = raw;
      versions[k] = v;
    }
  }
  const safeApp = /^[0-9A-Za-z.+_-]{1,32}$/.test(app) ? app : '0.0.0';
  const tombstones = mergeTombstones(bundle.tombstones ?? []).map((t) => ({ slot: t.slot, campaignId: t.campaignId, deletedAt: Date.parse(t.deletedAt) }));
  return { baseRev, app: safeApp, versions, data, tombstones };
}

// ---------------------------------------------------------------- istemci

export class CloudClient {
  private readonly d: CloudDeps;
  private status: CloudStatus = 'idle';
  private lastError: string | undefined;
  private user: { id: string; displayName: string | null; providers: string[] } | null = null;
  private serverSave: ServerSaveMeta | null = null;
  private availability: 'unknown' | 'up' | 'down' = 'unknown';
  private core: CloudCore | null = null;
  private remote: Remote | null = null;
  private pending: PendingDecision | null = null;
  private blocked = false;
  private applying = false;
  private gen = 0;
  private firstDirtyAt: number | null = null;
  private debounceT: unknown = null;
  private retryT: unknown = null;
  private gateT: unknown = null;
  private pullT: unknown = null;
  /** Art arda başarısız canlı çekme sayısı (geri çekilme). */
  private pullFail = 0;
  /** Son başarılı /auth/me yanıtının zamanı (görünür olunca gereksiz çağrı yok). */
  private lastCheckAt = -Infinity;
  private retryIdx = 0;
  private conflictRounds = 0;
  private uploading = false;
  private offDirty: (() => void) | null = null;
  private hiddenInstalled = false;
  private gate: () => boolean = () => true;
  private chain: Promise<unknown> = Promise.resolve();
  private readonly listeners = new Set<(e: CloudEvent) => void>();
  private disposed = false;
  /** Bu oturumda raporlanan kodlar (kod başına bir rapor). */
  private readonly reported = new Set<string>();

  constructor(deps: Partial<CloudDeps> = {}) {
    this.d = { ...browserDeps(), ...deps };
  }

  // ------------------------------------------------ genel API

  /** Bulut/giriş özelliği açık mı (data/cloud.json). Kapalıyken arayüz 'coming soon' gösterir. */
  isEnabled(): boolean {
    return this.d.enabled;
  }

  isLoginAvailable(): boolean {
    return this.d.enabled && isLoginHost(this.d.hostname) && this.availability !== 'down';
  }

  /** Arayüz (Account sayfası) giriş düğmesini göstermeden önce: bir kez /auth/me yoklar (oturum varsa senkron da başlar). */
  checkLoginAvailable(): Promise<boolean> {
    if (!this.d.enabled || !isLoginHost(this.d.hostname)) return Promise.resolve(false);
    if (this.availability !== 'unknown') return Promise.resolve(this.isLoginAvailable());
    return this.enqueue(async () => {
      if (this.availability === 'unknown') await this.refresh();
      return this.isLoginAvailable();
    });
  }

  getAccount(): AccountState {
    const u = this.user;
    return {
      signedIn: !!u,
      userId: u?.id ?? null,
      displayName: u?.displayName ?? null,
      providers: u ? [...u.providers] : [],
      save: u ? this.serverSave : null,
      supportId: u?.id ?? null,
      local: u ? this.readMeta() : null,
    };
  }

  getStatus(): CloudStatus {
    return this.status;
  }

  getLastError(): string | undefined {
    return this.lastError;
  }

  getPending(): PendingDecision | null {
    return this.pending;
  }

  subscribe(fn: (e: CloudEvent) => void): () => void {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  /** Tanılama bağlantısı (initCloud: gerçek src/diag/diag). */
  setDiag(diag: CloudDiag): void {
    this.d.diag = diag;
  }

  /** Buluttan yerele yazmanın güvenli olup olmadığı (uygulama: yalnızca ana menüde true). */
  setApplyGate(fn: () => boolean): void {
    this.gate = fn;
  }

  /** Uygulama güvenli bir ana girdiğini bildirir (ör. ana menü açıldı): bekleyen indirme / soru hemen işlenir. */
  notifySafePoint(): void {
    if (this.remote) void this.enqueue(() => this.tryApplyRemote());
  }

  /** Bekleyen işlerin bitmesi (testler, debug). */
  whenIdle(): Promise<void> {
    return this.chain.then(() => undefined);
  }

  /** Açılış: ?auth= dönüşünü işler, giriş yapılmışsa senkronu başlatır. Girişsizken ağ çağrısı yok. */
  init(): Promise<void> {
    if (!this.d.enabled) return Promise.resolve(); // kapalı: ?auth= dahil hiçbir şey yapılmaz, /auth/me yoklanmaz
    const auth = this.takeAuthParam();
    if (auth) {
      if (auth.ok) this.dlog('sign-in ok');
      else {
        this.dlog(`sign-in error ${safeCode(auth.reason)}`);
        this.dreport('auth-error', `sign-in error ${safeCode(auth.reason)}`);
      }
      this.emit({ type: 'auth', ok: auth.ok, ...(auth.reason ? { reason: auth.reason } : {}) });
    }
    if (!isLoginHost(this.d.hostname)) return Promise.resolve();
    if (!this.readMeta() && !auth?.ok) return Promise.resolve();
    return this.enqueue(() => this.refresh());
  }

  /** Tam sayfa yönlendirme ile giriş. consentAccepted (gizlilik kutusu) zorunlu. */
  startLogin(opts: { provider: LoginProvider; mode?: LoginMode; consentAccepted: boolean }): ActionResult {
    const mode = opts.mode ?? 'login';
    if (opts.consentAccepted !== true) return { ok: false, reason: 'consent' };
    if (opts.provider !== 'google' && opts.provider !== 'discord') return { ok: false, reason: 'provider' };
    if (!this.isLoginAvailable()) return { ok: false, reason: 'unavailable' };
    if (mode === 'link' && !this.user) return { ok: false, reason: 'not-signed-in' };
    this.flushHidden();
    this.d.navigate(`/auth/${opts.provider}?mode=${mode}&return=${encodeURIComponent(this.returnPath())}`);
    return { ok: true };
  }

  /** Yalnızca localhost (wrangler DEV_AUTH=1): sahte sağlayıcıyla giriş (debug). */
  devLogin(sub = 'dev', mode: LoginMode = 'login'): ActionResult {
    if (this.d.hostname !== 'localhost' && this.d.hostname !== '127.0.0.1') return { ok: false, reason: 'unavailable' };
    this.d.navigate(`/auth/dev?sub=${encodeURIComponent(sub)}&mode=${mode}&return=${encodeURIComponent(this.returnPath())}`);
    return { ok: true };
  }

  /** Çıkış: bekleyen yükleme bir kez denenir, sonra oturum kapanır. Yerel ilerleme cihazda kalır. */
  signOut(): Promise<ActionResult> {
    return this.enqueue(async () => {
      if (!this.user) return { ok: true } as ActionResult;
      if (this.isDirty() && !this.blocked && !this.remote) await this.upload();
      const r = await this.http('POST', '/auth/logout');
      if (r.status === 0) return { ok: false, reason: 'offline' };
      if (r.status !== 204 && r.status !== 200 && r.status !== 401) return { ok: false, reason: `http-${r.status}` };
      this.clearSession(true, 'sign-out');
      return { ok: true };
    });
  }

  /** Hesabı ve buluttaki kaydı siler (sunucu {confirm:"DELETE"} ister). Yerel ilerleme kalır. */
  deleteAccount(): Promise<ActionResult> {
    return this.enqueue(async () => {
      if (!this.user) return { ok: false, reason: 'signed-out' } as ActionResult;
      const r = await this.http('DELETE', '/account', { confirm: 'DELETE' });
      if (r.status === 200) {
        this.clearSession(true, 'account-deleted');
        return { ok: true };
      }
      if (r.status === 401) {
        this.clearSession(true, 'http-401');
        return { ok: false, reason: 'signed-out' };
      }
      return { ok: false, reason: r.status === 0 ? 'offline' : `http-${r.status}` };
    });
  }

  /** Görünen ad (sunucu normalleştirir; geçersizse reason 'bad-name'). */
  setDisplayName(name: string): Promise<{ ok: true; displayName: string } | { ok: false; reason: string }> {
    return this.enqueue(async () => {
      if (!this.user) return { ok: false, reason: 'signed-out' } as const;
      const r = await this.http('PUT', '/account/name', { displayName: name });
      if (r.status === 200 && isObj(r.body) && typeof r.body.displayName === 'string') {
        this.user = { ...this.user, displayName: r.body.displayName };
        this.emitAccount();
        return { ok: true, displayName: r.body.displayName } as const;
      }
      if (r.status === 401) this.clearSession(true, 'http-401');
      const reason = r.status === 0 ? 'offline' : isObj(r.body) && typeof r.body.error === 'string' ? r.body.error : `http-${r.status}`;
      return { ok: false, reason } as const;
    });
  }

  /** Elle senkron: hesap + bulut rev'i yeniden okunur; yerel değişiklik yüklenir, uzak değişiklik güvenli anda iner. */
  syncNow(): Promise<CloudStatus> {
    this.cancelDebounce();
    return this.enqueue(async () => {
      this.retryIdx = 0;
      await this.refresh();
      return this.status;
    });
  }

  // ------------------------------------------------ debug

  debugInfo(): Record<string, string> {
    const m = this.readMeta();
    return {
      enabled: this.d.enabled ? 'on' : 'off (data/cloud.json: accounts show Coming soon; use Sample account to preview)',
      status: this.status + (this.lastError ? ` (${this.lastError})` : ''),
      host: `${this.d.hostname} · login ${this.isLoginAvailable() ? 'available' : 'hidden'} (${this.availability})`,
      account: this.user ? `${this.user.id} · ${this.user.displayName ?? '(no name)'} · ${this.user.providers.join(', ')}` : 'signed out',
      local: m ? `rev ${m.rev} · dirty ${m.dirty} · hash ${m.hash?.slice(0, 10) ?? '-'} · last ${m.lastSyncAt ?? 'never'}` : 'no eov.cloud.v1',
      cloud: this.serverSave ? `rev ${this.serverSave.rev} · ${this.serverSave.size} B · app ${this.serverSave.app} · ${new Date(this.serverSave.updatedAt).toISOString()}` : 'none',
      pending: this.remote ? this.remote.kind : 'none',
      dirtyNow: String(cloudDirty()),
    };
  }

  /** Debug: hemen yükle (debounce beklemez). */
  forceUpload(): Promise<CloudStatus> {
    this.cancelDebounce();
    return this.enqueue(async () => {
      if (this.user && !this.blocked) await this.upload(true);
      return this.status;
    });
  }

  /** Debug: buluttakini hemen yerele yaz (güvenli an denetimi YOK; yerel yedeklenir). */
  forceDownload(): Promise<CloudStatus> {
    return this.enqueue(async () => {
      if (!this.user || !(await this.ensureCore())) return this.status;
      const c = await this.fetchCloud();
      if (!c.ok) return this.status;
      if (!c.cloud) {
        this.setStatus('error', 'no-cloud-save');
        return this.status;
      }
      this.remote = { kind: 'download', cloud: c.cloud, gen: this.gen, from: c.cloud };
      await this.tryApplyRemote(true);
      return this.status;
    });
  }

  /** Debug: bilinen rev'i bozup yükler -> sunucu 409 conflict -> yeniden okuma + yeniden karar. */
  simulateConflict(): Promise<CloudStatus> {
    return this.enqueue(async () => {
      const m = this.readMeta();
      if (!this.user || !m) return this.status;
      this.writeMeta({ ...m, rev: m.rev + 1000, dirty: true });
      await this.upload(true);
      return this.status;
    });
  }

  dispose(): void {
    this.disposed = true;
    this.offDirty?.();
    this.offDirty = null;
    this.cancelDebounce();
    this.clearTimer('retryT');
    this.clearTimer('gateT');
    this.clearTimer('pullT');
    this.listeners.clear();
  }

  // ------------------------------------------------ iç akış

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const p = this.chain.then(fn, fn);
    this.chain = p.catch(() => undefined);
    return p;
  }

  private emit(e: CloudEvent): void {
    for (const fn of [...this.listeners]) {
      try {
        fn(e);
      } catch {
        /* dinleyici hatası senkronu bozmaz */
      }
    }
  }

  private emitAccount(): void {
    this.emit({ type: 'account', account: this.getAccount() });
  }

  private setStatus(s: CloudStatus, error?: string): void {
    const changed = s !== this.status || error !== this.lastError;
    this.status = s;
    this.lastError = error;
    if (!changed) return;
    if (s === 'offline' || s === 'error' || s === 'newer-version' || s === 'needs-choice') this.dlog(`status ${s}${error ? ` ${safeCode(error)}` : ''}`);
    if (s === 'error') this.dreport(safeCode(error), `status error ${safeCode(error)}`);
    if (s === 'newer-version') this.dreport('newer-version', 'status newer-version (cloud or server has a newer save schema)');
    this.emit({ type: 'status', status: s, ...(error ? { error } : {}) });
  }

  // ------------------------------------------------ tanılama (yalnızca teknik veri)

  private dlog(msg: string): void {
    try {
      this.d.diag.log(msg);
    } catch {
      /* tanılama senkronu bozmaz */
    }
  }

  /** Kod başına oturumda bir rapor (diag ayrıca aynı iletiyi ve oturum sınırını denetler). */
  private dreport(code: string, msg: string): void {
    if (this.reported.has(code)) return;
    this.reported.add(code);
    try {
      this.d.diag.report(code, msg);
    } catch {
      /* yok say */
    }
  }

  /** Paketteki dolu anahtarların adı + sürümü (içerik değil): "eov.campaign.v1=3,eov.endless.scores.v1=1". */
  private keysText(bundle: SyncBundle | null): string {
    if (!bundle) return 'none';
    const parts = SYNC_KEYS.filter((k) => bundle.data[k] !== null).map((k) => `${k}=${bundle.versions[k] ?? '?'}`);
    return parts.length ? parts.join(',') : 'empty';
  }

  /** Paketteki sefer yuvası sayısı (slotSummaries ile; okunamazsa 0). */
  private slotCount(bundle: SyncBundle | null): number {
    const core = this.core;
    const raw = bundle?.data['eov.campaign.v1'];
    if (!core || !raw) return 0;
    try {
      const kv = core.memoryKV();
      kv.setItem('eov.campaign.v1', raw);
      return core.slotSummaries(kv).filter(Boolean).length;
    } catch {
      return 0;
    }
  }

  private localSlotCount(): number {
    try {
      return this.core ? this.core.slotSummaries(this.kv()).filter(Boolean).length : 0;
    } catch {
      return 0;
    }
  }

  private kv(): KV | null {
    return this.d.kv();
  }

  private readMeta(): CloudMeta | null {
    try {
      return parseMeta(this.kv()?.getItem(CLOUD_META_KEY) ?? null);
    } catch {
      return null;
    }
  }

  /** Meta yalnızca girişliyken yazılır (girişsiz oyuncuda anahtar hiç oluşmaz). */
  private writeMeta(m: CloudMeta): void {
    if (!this.user) return;
    try {
      this.kv()?.setItem(CLOUD_META_KEY, JSON.stringify(m));
    } catch {
      /* depo dolu: senkron yine çalışır, sonraki açılışta ilk senkron gibi */
    }
  }

  private patchMeta(p: Partial<CloudMeta>): void {
    const m = this.readMeta();
    if (m) this.writeMeta({ ...m, ...p });
  }

  private removeMeta(): void {
    try {
      this.kv()?.removeItem(CLOUD_META_KEY);
    } catch {
      /* yok say */
    }
  }

  private isDirty(): boolean {
    return cloudDirty() || !!this.readMeta()?.dirty;
  }

  private nowIso(): string {
    return new Date(this.d.now()).toISOString();
  }

  private returnPath(): string {
    const p = this.d.location().pathname;
    return p && p.startsWith('/') ? p : '/';
  }

  private takeAuthParam(): { ok: boolean; reason?: string } | null {
    const loc = this.d.location();
    const params = new URLSearchParams(loc.search);
    const v = params.get('auth');
    if (v === null) return null;
    const reason = params.get('reason') ?? params.get('code') ?? undefined;
    params.delete('auth');
    params.delete('reason');
    params.delete('code');
    const q = params.toString();
    try {
      this.d.replaceUrl(`${loc.pathname}${q ? `?${q}` : ''}${loc.hash}`);
    } catch {
      /* adres temizlenemedi */
    }
    if (v === 'ok') return { ok: true };
    return { ok: false, reason: reason ?? 'unknown' };
  }

  private async http(method: string, path: string, body?: unknown, keepalive = false): Promise<Http> {
    const init: Parameters<FetchLike>[1] = { method, credentials: 'same-origin', headers: { accept: 'application/json' } };
    if (body !== undefined) {
      init.headers!['content-type'] = 'application/json';
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    if (keepalive) init.keepalive = true;
    try {
      const res = await this.d.fetch(path, init);
      let parsed: unknown = null;
      try {
        const t = await res.text();
        parsed = t ? JSON.parse(t) : null;
      } catch {
        parsed = null;
      }
      const ra = Number(res.headers.get('retry-after'));
      return { status: res.status, body: parsed, retryAfter: Number.isFinite(ra) && ra > 0 ? ra : null };
    } catch {
      return { status: 0, body: null, retryAfter: null };
    }
  }

  private async ensureCore(): Promise<CloudCore | null> {
    if (this.core) return this.core;
    try {
      this.core = await this.d.loadCore();
    } catch {
      this.setStatus('error', 'load-failed');
      return null;
    }
    return this.core;
  }

  private installListeners(): void {
    if (!this.offDirty) this.offDirty = onCloudDirty(() => this.onDirty());
    if (!this.hiddenInstalled) {
      this.hiddenInstalled = true;
      this.d.onHidden(() => {
        this.clearTimer('pullT'); // gizliyken yoklama yok
        this.flushHidden();
      });
      this.d.onVisible(() => this.onVisible());
    }
  }

  // ------------------------------------------------ canlı çekme

  /** Sekme görünür oldu: son yoklama eskiyse hemen yoklanır, sonra dakikalık zamanlayıcı. */
  private onVisible(): void {
    if (!this.user || this.disposed || this.blocked) return;
    if (this.d.now() - this.lastCheckAt < PULL_MIN_GAP_MS) return this.schedulePull();
    this.clearTimer('pullT');
    void this.enqueue(async () => {
      await this.pull();
      this.schedulePull();
    });
  }

  private schedulePull(): void {
    this.clearTimer('pullT');
    if (!this.user || this.disposed || this.blocked || !this.d.isVisible()) return; // gizli: görünür olunca yeniden başlar
    const delay = Math.min(PULL_MAX_MS, PULL_MS * 2 ** Math.min(this.pullFail, 4));
    this.pullT = this.d.setTimeout(() => {
      this.pullT = null;
      if (!this.d.isVisible()) return;
      void this.enqueue(async () => {
        await this.pull();
        this.schedulePull();
      });
    }, delay);
  }

  /**
   * Ucuz yoklama: GET /auth/me'deki bulut rev'i bu cihazın bildiğinden farklıysa açılıştaki akış (startSync): temiz cihaz indirir (yalnızca
   * güvenli anda), kirli cihaz buluttakini okuyup karar verir. Bekleyen uzak iş / süren yükleme varken yoklanmaz. Hata sessizdir (geri çekilme).
   */
  private async pull(): Promise<void> {
    if (!this.user || this.disposed || this.blocked || this.remote || this.uploading) return;
    const r = await this.http('GET', '/auth/me');
    if (!this.user || this.disposed) return;
    if (r.status !== 200 || !isObj(r.body)) {
      this.pullFail++;
      return;
    }
    this.pullFail = 0;
    this.lastCheckAt = this.d.now();
    const u = r.body.user;
    if (!isObj(u) || u.id !== this.user.id) return this.refresh(); // oturum bitti / başka hesap: tam yenileme
    const save = parseServerSave(r.body.save);
    const meta = this.readMeta();
    if (!meta || (save?.rev ?? 0) === meta.rev || this.remote) {
      if (save) this.serverSave = save;
      return;
    }
    this.serverSave = save;
    this.dlog(`pull: cloud rev ${save ? save.rev : 'none'}, local rev ${meta.rev}${this.isDirty() ? ' (dirty)' : ''}`);
    this.emitAccount();
    return this.startSync();
  }

  /** GET /auth/me + senkron başlangıcı. */
  private async refresh(): Promise<void> {
    if (this.disposed) return;
    const r = await this.http('GET', '/auth/me');
    if (r.status === 200) this.lastCheckAt = this.d.now();
    if (r.status === 0 || r.status === 503 || r.status === 404 || r.status === 502) {
      // 404/502: Worker yolu yok ya da ulaşılamıyor (ör. yerelde worker kapalı); giriş gizlenir
      this.availability = 'down';
      if (this.readMeta()) {
        this.setStatus('offline');
        this.scheduleRetry();
      }
      return;
    }
    if (r.status !== 200 || !isObj(r.body)) {
      this.setStatus('error', `me-${r.status}`);
      this.scheduleRetry();
      return;
    }
    this.availability = 'up';
    this.retryIdx = 0;
    const u = r.body.user;
    if (!isObj(u) || typeof u.id !== 'string') {
      // Oturum yok / süresi doldu: girişsiz oyuncu gibi (meta silinir: sonraki açılışta ağ çağrısı yok)
      const had = !!this.user || !!this.readMeta();
      this.clearSession(had, had ? 'expired' : '');
      return;
    }
    this.user = { id: u.id, displayName: typeof u.displayName === 'string' ? u.displayName : null, providers: Array.isArray(u.providers) ? u.providers.filter((p): p is string => typeof p === 'string') : [] };
    this.serverSave = parseServerSave(r.body.save);
    this.dlog(`session ok, cloud ${this.serverSave ? `rev ${this.serverSave.rev}` : 'none'}, local rev ${this.readMeta()?.rev ?? 'none'}`);
    this.installListeners();
    if (this.status === 'offline' || this.status === 'error') this.setStatus('idle');
    this.emitAccount();
    await this.startSync();
    this.schedulePull();
  }

  private async startSync(): Promise<void> {
    if (!this.user || this.blocked || !(await this.ensureCore())) return;
    if (this.remote) return this.tryApplyRemote();
    const meta = this.readMeta();
    const save = this.serverSave;
    if (!meta || meta.userId !== this.user.id) {
      // Bu hesapla bu cihazda ilk senkron
      this.writeMeta({ userId: this.user.id, rev: 0, hash: null, dirty: false, lastSyncAt: null });
      const c = save ? await this.fetchCloud() : { ok: true as const, cloud: null };
      if (!c.ok) return;
      return this.decideAndAct(c.cloud);
    }
    if (!save) {
      if (meta.rev > 0) return this.decideAndAct(null); // bulut kaydı yok oldu: ilk senkron gibi
      if (this.isDirty()) return this.upload();
      return this.setStatus('idle');
    }
    if (save.rev === meta.rev) {
      // Bulutta olup yerelde hiç olmayan anahtar: bu cihaz bulutu indirmeden "senkron" saymış (0.9.8.8 GET /save biçim hatası).
      // Sürüme bakmadan yeniden karar verilir (boş yerel = indirme; dolu yerel = birleştirme / soru / upload-guard)
      const local = this.core!.sync.buildBundle(this.kv(), this.d.app, this.nowIso());
      const missing = SYNC_KEYS.filter((k) => save.versions[k] !== undefined && local.data[k] === null);
      if (missing.length) {
        this.dlog(`stale sync: cloud rev ${save.rev} has [${missing.join(',')}] missing locally`);
        const c = await this.fetchCloud();
        if (!c.ok) return;
        return this.decideAndAct(c.cloud);
      }
      if (this.isDirty()) return this.upload();
      return this.setStatus('idle');
    }
    // Başka cihaz yükledi
    const c = await this.fetchCloud();
    if (!c.ok) return;
    if (!this.isDirty() && c.cloud) {
      this.dlog(`decision download (clean device): cloud rev ${c.cloud.save.rev} [${this.keysText(c.cloud.bundle)}] slots ${this.slotCount(c.cloud.bundle)}, local rev ${meta.rev}`);
      this.remote = { kind: 'download', cloud: c.cloud, gen: this.gen, from: c.cloud };
      return this.tryApplyRemote();
    }
    return this.decideAndAct(c.cloud);
  }

  private async fetchCloud(): Promise<{ ok: true; cloud: CloudSide | null } | { ok: false }> {
    const core = await this.ensureCore();
    if (!core) return { ok: false };
    const r = await this.http('GET', '/save');
    if (r.status === 401) {
      this.clearSession(true, 'http-401');
      return { ok: false };
    }
    if (r.status === 0 || r.status >= 500) {
      this.setStatus('offline');
      this.scheduleRetry();
      return { ok: false };
    }
    if (r.status !== 200 || !isObj(r.body)) {
      this.setStatus('error', `save-${r.status}`);
      return { ok: false };
    }
    const save = parseServerSave(r.body.save);
    this.serverSave = save;
    if (!save) return { ok: true, cloud: null };
    // Sunucu (auth.ts > saveGet) `data` ve `tombstones`u `save` nesnesinin İÇİNE koyar; eski/test biçimi üst düzeyde. İkisi de okunur.
    const src = isObj(r.body.data) ? r.body : isObj(r.body.save) && isObj(r.body.save.data) ? r.body.save : null;
    if (!src) {
      // Kayıt var ama içeriği okunamadı: boş bulut sanılıp karar verilmez (yerelin bulutu ezmesi / sahte "senkron" önlenir)
      this.setStatus('error', 'save-shape');
      return { ok: false };
    }
    const raw = src.data as Record<string, unknown>;
    const data = Object.fromEntries(SYNC_KEYS.map((k) => [k, typeof raw[k] === 'string' ? raw[k] : null])) as Record<SyncKey, string | null>;
    return { ok: true, cloud: { save, bundle: core.sync.bundleFromData(data, save.app, new Date(save.updatedAt).toISOString(), tombstonesFromWire(src.tombstones)) } };
  }

  private async decideAndAct(cloud: CloudSide | null): Promise<void> {
    const core = this.core!;
    const local = core.sync.buildBundle(this.kv(), this.d.app, this.nowIso());
    let d = core.sync.decideSync(local, cloud?.bundle ?? null, this.d.app, this.nowIso());
    const rev = cloud?.save.rev ?? 0;
    // Buluttaki veri bu cihazın son senkronundan (ya da son çakışma kararından) beri DEĞİŞMEDİ (aynı hash; arada yalnızca rev / silme işareti
    // değişmiş: ör. öbür cihazın işaret yüklemesi): yerel ondan türedi, gerçek çakışma yok -> sorulmaz, yerel yüklenir (işaretler birleşir).
    const base = this.readMeta()?.hash;
    if (d.kind === 'ask' && cloud && base && cloud.save.hash === base) {
      this.dlog(`cloud rev ${rev} unchanged since last sync (same hash): no conflict, local kept`);
      d = core.sync.fastForward(local, cloud.bundle, this.d.app, this.nowIso());
    }
    this.dlog(`decision ${d.kind}${d.kind === 'refuse' ? ` ${safeCode(d.reason)}${d.key ? ` key ${d.key}` : ''}` : ''}: cloud ${cloud ? `rev ${rev}` : 'none'} [${this.keysText(cloud?.bundle ?? null)}] slots ${this.slotCount(cloud?.bundle ?? null)}, local [${this.keysText(local)}] slots ${this.slotCount(local)}`);
    switch (d.kind) {
      case 'none':
        clearCloudDirty();
        this.patchMeta({ rev, hash: cloud?.save.hash ?? null, dirty: false, lastSyncAt: this.nowIso() });
        this.conflictRounds = 0;
        return this.setStatus('idle');
      case 'upload':
        // Koruma: bulutta ilerleme varken ilerlemesiz cihaz bulutu ASLA ezmez (decideSync bunu vermemeli; verirse yükleme yok, rapor)
        if (cloud && core.sync.hasProgress(cloud.bundle.data) && !core.sync.hasProgress(local.data)) {
          this.dreport('upload-guard', `upload blocked: cloud has progress, local none (cloud rev ${rev} [${this.keysText(cloud.bundle)}] slots ${this.slotCount(cloud.bundle)}, local [${this.keysText(local)}])`);
          return this.setStatus('error', 'upload-guard');
        }
        // Yerel bulutu kapsıyor: bulutun rev'i baseRev olur
        this.patchMeta({ rev, ...(cloud?.save.hash ? { hash: cloud.save.hash } : {}), dirty: true });
        return this.upload();
      case 'download':
        if (!cloud) return this.setStatus('idle');
        this.remote = { kind: 'download', cloud, gen: this.gen, from: cloud };
        return this.tryApplyRemote();
      case 'merge':
        if (!cloud) {
          // Bulut boş, yerel silme işaretleriyle temizlendi: yerelde uygula, yükle
          this.remote = { kind: 'merge', cloud: { save: { rev: 0, updatedAt: 0, versions: {}, app: '', size: 0, hash: '' }, bundle: d.bundle }, bundle: d.bundle, gen: this.gen, from: null };
        } else this.remote = { kind: 'merge', cloud, bundle: d.bundle, gen: this.gen, from: cloud };
        return this.tryApplyRemote();
      case 'ask':
        if (!cloud) return this.setStatus('idle');
        this.remote = { kind: 'ask', cloud, pins: d.pins, gen: this.gen, from: cloud };
        return this.tryApplyRemote();
      case 'refuse':
        this.dreport(d.reason === 'newer-schema' ? 'newer-version' : `cloud-${safeCode(d.reason)}`, `refuse ${safeCode(d.reason)}${d.key ? ` key ${d.key}` : ''} (cloud rev ${rev} [${this.keysText(cloud?.bundle ?? null)}])`);
        if (d.reason === 'newer-schema') {
          this.blocked = true;
          return this.setStatus('newer-version');
        }
        return this.setStatus('error', `cloud-${d.reason}`);
    }
  }

  /** Bekleyen uzak işi güvenli anda uygular (force: debug, güvenli an denetimi yok). */
  private async tryApplyRemote(force = false): Promise<void> {
    const r = this.remote;
    if (!r || !this.user || !this.core) return;
    let safe = force;
    if (!safe) {
      try {
        safe = this.gate();
      } catch {
        safe = false;
      }
    }
    if (!safe) {
      this.clearTimer('gateT');
      this.gateT = this.d.setTimeout(() => {
        this.gateT = null;
        void this.enqueue(() => this.tryApplyRemote());
      }, GATE_POLL_MS);
      return;
    }
    this.clearTimer('gateT');
    if (!force && r.kind !== 'ask' && r.gen !== this.gen) {
      // Karardan sonra yerel değişti (ör. indirme ana menüyü beklerken oynandı): eski karar uygulanmaz (yeni ilerleme sessizce ezilmez), yeniden karar
      this.remote = null;
      this.dlog(`local changed since ${r.kind} decision: deciding again (cloud rev ${r.cloud.save.rev})`);
      return this.decideAndAct(r.from);
    }
    if (r.kind === 'ask') {
      if (!this.pending) {
        this.pending = this.makePending(r.cloud, r.pins);
        this.emit({ type: 'pending', pending: this.pending });
      }
      return this.setStatus('needs-choice');
    }
    const bundle = r.kind === 'download' ? r.cloud.bundle : r.bundle;
    if (!this.apply(bundle)) return;
    this.remote = null;
    // Akıl denetimi: uygulanan pakette sefer yuvası vardı ama yerelde sonrasında daha az / hiç yok -> rapor
    const want = this.slotCount(bundle);
    const got = this.localSlotCount();
    if (want > 0 && got < want) this.dreport('cloud_apply_mismatch', `${r.kind} applied cloud rev ${r.cloud.save.rev}: bundle slots ${want}, cloud slots ${this.slotCount(r.cloud.bundle)}, local slots after ${got}`);
    if (r.kind === 'download') {
      // applyBundle işaretleri biriktirir: yerelde bulutta olmayan işaret kaldıysa (yalnızca işaret farkı) yine yüklenir
      const tombsDiffer = !sameTombstones(readTombstones(this.kv()), r.cloud.bundle.tombstones ?? []);
      this.patchMeta({ rev: r.cloud.save.rev, hash: r.cloud.save.hash, dirty: tombsDiffer, lastSyncAt: this.nowIso() });
      this.conflictRounds = 0;
      this.setStatus('idle');
      this.emit({ type: 'applied', source: 'download' });
      if (tombsDiffer) return this.upload();
      return;
    }
    this.patchMeta({ rev: r.cloud.save.rev, ...(r.cloud.save.hash ? { hash: r.cloud.save.hash } : {}), dirty: true });
    this.emit({ type: 'applied', source: 'merge' });
    return this.upload();
  }

  /** Paketi yerele yazar (applyBundle önce yerel ilerlemeyi yedekler); kirli işareti bu yazımdan doğmaz. */
  private apply(bundle: SyncBundle): boolean {
    const core = this.core!;
    this.applying = true;
    let res: ReturnType<CloudCore['sync']['applyBundle']>;
    try {
      res = core.sync.applyBundle(this.kv(), bundle, this.d.app, this.nowIso());
    } finally {
      this.applying = false;
    }
    this.dlog(res.ok ? `apply ok (backup ${res.backedUp ? 'yes' : 'no'}) [${this.keysText(bundle)}] slots ${this.slotCount(bundle)}` : `apply failed ${safeCode(res.reason)}${res.key ? ` key ${res.key}` : ''}`);
    if (!res.ok) {
      if (res.reason === 'newer-schema') {
        this.blocked = true;
        this.setStatus('newer-version');
      } else this.setStatus('error', `apply-${res.reason}`);
      return false;
    }
    clearCloudDirty();
    this.gen++;
    return true;
  }

  private summarize(bundle: SyncBundle, cloud: ServerSaveMeta | null): SideSummary {
    const core = this.core!;
    const kv = core.memoryKV();
    for (const k of SYNC_KEYS) if (bundle.data[k] !== null) kv.setItem(k, bundle.data[k]!);
    const run = core.loadRun(kv);
    const scores = core.loadScores(kv);
    return {
      slots: core.slotSummaries(kv),
      endless: run ? { wave: run.wave, classes: run.heroes.map((h) => h.class) } : null,
      scores: { count: scores.length, bestWave: scores.length ? Math.max(...scores.map((s) => s.wave)) : null },
      savedAt: cloud ? new Date(cloud.updatedAt).toISOString() : null,
      app: cloud ? cloud.app : null,
    };
  }

  private makePending(cloud: CloudSide, pins: IronmanPin[]): PendingDecision {
    const local = this.core!.sync.buildBundle(this.kv(), this.d.app, this.nowIso());
    const p: PendingDecision = {
      local: this.summarize(local, null),
      cloud: this.summarize(cloud.bundle, cloud.save),
      pins,
      resolve: (choice) => this.enqueue(() => this.resolve(p, cloud, choice)),
    };
    return p;
  }

  private async resolve(p: PendingDecision, cloud: CloudSide, choice: 'cloud' | 'local'): Promise<ResolveResult> {
    if (this.pending !== p) return { ok: false, reason: 'stale' };
    if (!this.user || !this.core) return { ok: false, reason: 'unavailable' };
    const sync = this.core.sync;
    const kv = this.kv();
    const local = sync.buildBundle(kv, this.d.app, this.nowIso());
    const result = sync.resolveConflict(local, cloud.bundle, choice, this.d.app, this.nowIso());
    const changesLocal = !sync.sameBundle(result, local);
    if (changesLocal && !this.apply(result)) return { ok: false, reason: 'apply-failed' };
    if (choice === 'local') {
      // Kaybeden taraf (bulut) yerelde yedeklenir (readBackup ile geri alınabilir)
      try {
        kv?.setItem(BACKUP_KEY, JSON.stringify(cloud.bundle));
      } catch {
        /* yedek yazılamadı: yükleme yine yapılır */
      }
    }
    this.pending = null;
    this.remote = null;
    this.emit({ type: 'pending', pending: null });
    if (changesLocal) this.emit({ type: 'applied', source: 'choice' });
    if (sync.sameBundle(result, cloud.bundle)) {
      clearCloudDirty();
      this.patchMeta({ rev: cloud.save.rev, hash: cloud.save.hash, dirty: false, lastSyncAt: this.nowIso() });
      this.setStatus('idle');
      return { ok: true };
    }
    // hash = kararın verildiği bulut verisi: araya veri değiştirmeyen bir yükleme girerse (409) yeniden sorulmaz
    this.patchMeta({ rev: cloud.save.rev, ...(cloud.save.hash ? { hash: cloud.save.hash } : {}), dirty: true });
    await this.upload();
    return { ok: true };
  }

  /** PUT /save (yerel paket, baseRev = meta.rev). */
  private async upload(force = false): Promise<void> {
    if (!this.user || this.blocked || this.remote || this.uploading) return;
    if (!force && !this.isDirty()) return;
    const core = await this.ensureCore();
    const meta = this.readMeta();
    if (!core || !meta) return;
    this.cancelDebounce();
    this.clearTimer('retryT');
    const gen0 = this.gen;
    const body = putBody(core.sync.buildBundle(this.kv(), this.d.app, this.nowIso()), meta.rev, this.d.app);
    this.uploading = true;
    this.setStatus('syncing');
    let r: Http;
    try {
      r = await this.http('PUT', '/save', body);
    } finally {
      this.uploading = false;
    }
    await this.handlePut(r, gen0);
  }

  private async handlePut(r: Http, gen0: number): Promise<void> {
    if (r.status === 200 && isObj(r.body) && typeof r.body.rev === 'number') {
      const clean = this.gen === gen0;
      if (clean) clearCloudDirty();
      this.patchMeta({ rev: r.body.rev, hash: typeof r.body.hash === 'string' ? r.body.hash : null, dirty: !clean, lastSyncAt: this.nowIso() });
      if (this.serverSave && typeof r.body.updatedAt === 'number') this.serverSave = { ...this.serverSave, rev: r.body.rev, updatedAt: r.body.updatedAt, hash: String(r.body.hash ?? ''), size: Number(r.body.size ?? 0) };
      else if (typeof r.body.updatedAt === 'number') this.serverSave = { rev: r.body.rev, updatedAt: r.body.updatedAt, versions: {}, app: this.d.app, size: Number(r.body.size ?? 0), hash: String(r.body.hash ?? '') };
      this.dlog(`upload ok rev ${r.body.rev}${clean ? '' : ' (changed during upload)'}`);
      this.retryIdx = 0;
      this.conflictRounds = 0;
      this.setStatus('idle');
      if (!clean) this.scheduleDebounce();
      return;
    }
    const error = isObj(r.body) && typeof r.body.error === 'string' ? r.body.error : '';
    this.dlog(`upload http ${r.status}${error ? ` ${safeCode(error)}` : ''}${r.status === 409 && error !== 'schema-older' ? ` (conflict round ${this.conflictRounds + 1})` : ''}`);
    if (r.status === 409 && error === 'schema-older') {
      this.blocked = true;
      this.cancelDebounce();
      return this.setStatus('newer-version');
    }
    if (r.status === 409) {
      if (++this.conflictRounds > MAX_CONFLICT_ROUNDS) {
        this.conflictRounds = 0;
        this.setStatus('error', 'conflict-loop');
        return this.scheduleRetry();
      }
      const c = await this.fetchCloud();
      if (!c.ok) return;
      return this.decideAndAct(c.cloud);
    }
    if (r.status === 429) {
      this.setStatus('idle');
      return this.scheduleRetry((r.retryAfter ?? 5) * 1000);
    }
    if (r.status === 401) return this.clearSession(true, 'http-401');
    if (r.status === 413) return this.setStatus('error', 'too-large');
    if (r.status === 0 || r.status >= 500) {
      this.setStatus('offline');
      return this.scheduleRetry();
    }
    this.setStatus('error', error || `put-${r.status}`);
  }

  private onDirty(): void {
    if (this.applying || this.disposed) return;
    this.gen++;
    if (!this.user) return;
    const m = this.readMeta();
    if (m && !m.dirty) this.writeMeta({ ...m, dirty: true });
    if (this.blocked) return;
    this.scheduleDebounce();
  }

  private scheduleDebounce(): void {
    const now = this.d.now();
    this.firstDirtyAt ??= now;
    this.clearTimer('debounceT');
    const delay = Math.max(0, Math.min(DEBOUNCE_MS, this.firstDirtyAt + MAX_WAIT_MS - now));
    this.debounceT = this.d.setTimeout(() => {
      this.debounceT = null;
      this.firstDirtyAt = null;
      void this.enqueue(() => this.upload());
    }, delay);
  }

  private cancelDebounce(): void {
    this.clearTimer('debounceT');
    this.firstDirtyAt = null;
  }

  /** Sessiz yeniden deneme: hesap bilinmiyorsa /auth/me, bilinirse yükleme / bekleyen iş. */
  private scheduleRetry(ms?: number): void {
    if (this.disposed) return;
    const delay = ms ?? RETRY_STEPS_MS[Math.min(this.retryIdx++, RETRY_STEPS_MS.length - 1)]!;
    this.clearTimer('retryT');
    this.retryT = this.d.setTimeout(() => {
      this.retryT = null;
      void this.enqueue(async () => {
        if (!this.user) return this.refresh();
        if (this.remote) return this.tryApplyRemote();
        if (this.isDirty()) return this.upload();
        return this.refresh();
      });
    }, delay);
  }

  private clearTimer(k: 'debounceT' | 'retryT' | 'gateT' | 'pullT'): void {
    if (this[k] !== null) this.d.clearTimeout(this[k]);
    this[k] = null;
  }

  /** Sekme gizlendi: kirli ilerleme keepalive ile yüklenir; gövde 64 KB'yi aşarsa meta.dirty kalır (sonraki açılışta yüklenir). */
  private flushHidden(): void {
    if (!this.user || this.blocked || this.remote || this.uploading || !this.core || !this.isDirty()) return;
    const meta = this.readMeta();
    if (!meta) return;
    if (!meta.dirty) this.writeMeta({ ...meta, dirty: true });
    const body = JSON.stringify(putBody(this.core.sync.buildBundle(this.kv(), this.d.app, this.nowIso()), meta.rev, this.d.app));
    if (byteLength(body) > KEEPALIVE_MAX_BYTES) return;
    this.cancelDebounce();
    const gen0 = this.gen;
    this.uploading = true;
    const p = this.http('PUT', '/save', body, true).finally(() => {
      this.uploading = false;
    });
    void this.enqueue(async () => this.handlePut(await p, gen0));
  }

  /** Oturum bitti (çıkış, silme, süresi dolmuş oturum): meta silinir, zamanlayıcılar durur. Yerel ilerleme kalır. */
  private clearSession(emit = true, why = ''): void {
    const had = !!this.user;
    if (had || why) this.dlog(`session ended${why ? ` (${why})` : ''}`);
    this.user = null;
    this.serverSave = null;
    this.remote = null;
    this.blocked = false;
    this.conflictRounds = 0;
    this.removeMeta();
    this.cancelDebounce();
    this.clearTimer('retryT');
    this.clearTimer('gateT');
    this.clearTimer('pullT');
    this.pullFail = 0;
    this.offDirty?.();
    this.offDirty = null;
    if (this.pending) {
      this.pending = null;
      this.emit({ type: 'pending', pending: null });
    }
    this.setStatus('idle');
    if (emit || had) this.emitAccount();
  }
}

// ---------------------------------------------------------------- tarayıcı örneği

let client: CloudClient | null = null;

/** Tarayıcıdaki tek istemci (ilk çağrıda kurulur). */
export function cloud(): CloudClient {
  client ??= new CloudClient();
  return client;
}

/** main.ts: açılışta bir kez. Girişsiz oyuncuda ağ çağrısı yapmaz. */
export function initCloud(opts: { applyGate?: () => boolean; diag?: CloudDiag } = {}): CloudClient {
  const c = cloud();
  if (opts.applyGate) c.setApplyGate(opts.applyGate);
  if (opts.diag) c.setDiag(opts.diag);
  void c.init();
  return c;
}

export const cloudEnabled = (): boolean => cloud().isEnabled();
export const isLoginAvailable = (): boolean => cloud().isLoginAvailable();
export const checkLoginAvailable = (): Promise<boolean> => cloud().checkLoginAvailable();
export const getAccount = (): AccountState => cloud().getAccount();
export const getCloudStatus = (): CloudStatus => cloud().getStatus();
export const getPendingDecision = (): PendingDecision | null => cloud().getPending();
export const startLogin = (opts: { provider: LoginProvider; mode?: LoginMode; consentAccepted: boolean }): ActionResult => cloud().startLogin(opts);
export const signOut = (): Promise<ActionResult> => cloud().signOut();
export const deleteAccount = (): Promise<ActionResult> => cloud().deleteAccount();
export const setDisplayName = (name: string): ReturnType<CloudClient['setDisplayName']> => cloud().setDisplayName(name);
export const syncNow = (): Promise<CloudStatus> => cloud().syncNow();
export const subscribe = (fn: (e: CloudEvent) => void): (() => void) => cloud().subscribe(fn);
export const notifySafePoint = (): void => cloud().notifySafePoint();
