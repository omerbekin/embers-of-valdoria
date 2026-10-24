/**
 * Bulut kaydı senkron çekirdeği (accounts-plan.md Faz 1b). SAF: ağ yok, arayüz yok, DOM yok; depo dışarıdan verilir (KV).
 *
 * Paket (SyncBundle) senkronlanan anahtarların (cloud/keys.ts > SYNC_KEYS) HAM dizgilerini olduğu gibi taşır; şemanın tek sahibi mevcut
 * okuyucular kalır (readSaves, parseRun, loadScores, tutorial/store). Gelen paket önce bellekteki bir depoya konup bu okuyucularla doğrulanır;
 * daha yeni şemadan gelen ya da bozuk paket UYGULANMAZ. Üzerine yazmadan önce yerel ilerleme `eov.cloud.backup.v1` anahtarına yedeklenir.
 * Ayarlar ve diğer anahtarlar hiçbir zaman pakete girmez (karar 4). Pakette ayrıca silme işaretleri (tombstones) taşınır.
 *
 * decideSync doğruluk tablosu (karar 1: çakışmada HER ZAMAN sorulur, otomatik "en yeni" yok; zaman damgası karar vermez):
 *   bulut yok / boş            + yerelde veri yok       -> none
 *   bulut yok / boş            + yerelde veri var       -> upload
 *   bulut paketi geçersiz (daha yeni şema / bozuk)       -> refuse
 *   iki taraf birebir aynı                               -> none
 *   yalnızca yerelde ilerleme                            -> upload
 *   yalnızca bulutta ilerleme                            -> download
 *   iki tarafta da ilerleme yok (yalnızca tutorial vb.)  -> yerelde veri varsa upload, yoksa download
 *   iki tarafta da ilerleme var, farklı                  -> ask (Ironman kuralı iki seçimi de aynı sonuca indiriyorsa: upload / download / merge)
 * Satırlar silme işaretleriyle temizlenmiş taraflara uygulanır; sonuç iki ham taraftan da farklıysa 'merge' (yerelde uygula + yükle).
 * "İlerleme" = sefer yuvası, süren Endless koşusu ya da Endless skoru (tutorial tek başına ilerleme sayılmaz).
 *
 * IRONMAN KURALI (Ömer 2026-10-24 karar 2, sıkı; tanım ana oturumdan + Ömer düzeltmeleri, plan > Kararlar):
 *   Ironman sefer yuvalarında (yuva `mode === 'ironman'`) bir çakışma hiçbir zaman daha az ilerlemiş tarafı sunmaz; daha ilerlemiş taraf kazanır.
 *   İlerleme = temizlenmiş düğüm sayısı (state.cleared). Takım level'ı YOK: temizlenmiş düğüm eşitse otomatik kazanan yok, o yuva normal
 *   oyuncu seçimine düşer (iki taraf da sunulur). Ölü bir Ironman koşusu yaşayan bir koşunun üstüne hiçbir zaman yazılmaz (yaşayan önce gelir).
 *   Uygulama: yuva yuva karşılaştırılır. Karşılaştırılabilir = aynı yuvada aynı `campaignId` ya da bir taraf boş. Farklı seferlerse yalnızca
 *   ölü/yaşayan kuralı uygulanır. Oyuncu hangi tarafı seçerse seçsin o yuva kazanan taraftan alınır (resolveConflict).
 *   "Ölü" kayıtta işaretli değil (yenilgi Ironman'da da kayda yazılmaz): en yeni kayıtta kadrodaki herkes düşmüşse (alive false / can 0) ölü sayılır.
 *   SİLİNEN YUVA GERİ GELMEZ: yuva silinince silme işareti (cloud/tombstones.ts) pakete girer; iki tarafın işaretleri birleşir ve
 *   karşılaştırmadan önce her iki taraftan aynı sefer (aynı campaignId ve `SlotData.startedAt <= deletedAt`) çıkarılır. Silinmeden SONRA kurulan
 *   yeni sefer kalır. İşareti olmayan boş yuva (senkron geçmişi olmayan yeni cihaz) silme sayılmaz: karşı taraftaki Ironman koşusu korunur.
 */
import { memoryKV, peekVersion as peekCampaign, readSaves, SAVE_VERSION as CAMPAIGN_VERSION, type KV, type SaveFile, type SlotData } from '../campaign/save';
import { loadRun, loadScores, parseRun, peekVersion as peekEndless, SAVE_VERSION as RUN_VERSION, SCORES_VERSION } from '../endless/save';
import { TUTORIAL_VERSION } from '../tutorial/store';
import { BACKUP_KEY, SYNC_KEYS, type SyncKey } from './keys';
import { killedBy, mergeTombstones, parseTombstones, readTombstones, sameTombstones, TOMB_KEY, writeTombstones, type Tombstone } from './tombstones';

export { BACKUP_KEY, SYNC_KEYS, TOMB_KEY, type SyncKey, type Tombstone };

export const BUNDLE_FORMAT = 1;

export type SyncData = Record<SyncKey, string | null>;

export interface SyncBundle {
  format: number;
  /** Paketi yazan oyun sürümü (bilgi; karar vermez). */
  app: string;
  createdAt: string;
  /** Anahtar başına şema sürümü (ham dizgiden çıkarılır; sunucu "daha eski şema" denetimi için ayrı saklar). */
  versions: Record<SyncKey, number | null>;
  data: SyncData;
  /** Silinen yuva seferleri (cloud/tombstones.ts; yalnızca paket alanı, sefer şeması değişmez). Eksik = boş. */
  tombstones?: Tombstone[];
}

/** Bu kodun okuyabildiği en yeni şema sürümü (anahtar başına). */
export const SUPPORTED_VERSIONS: Readonly<Record<SyncKey, number>> = {
  'eov.campaign.v1': CAMPAIGN_VERSION,
  'eov.endless.v1': RUN_VERSION,
  'eov.endless.scores.v1': SCORES_VERSION,
  'eov.tutorial.v1': TUTORIAL_VERSION,
};

// Anahtar adlarının okuyucuların sabitleriyle (SAVE_KEY, RUN_KEY, SCORES_KEY, TUTORIAL_KEY) aynı olduğunu tests/cloud-sync.test.ts denetler.

/** Ham dizginin şema sürümü (tutorial `v`, diğerleri `version`); okunamazsa null. */
export function versionOf(key: SyncKey, raw: string | null): number | null {
  if (!raw) return null;
  if (key === 'eov.campaign.v1') return peekCampaign(raw);
  if (key === 'eov.tutorial.v1') {
    try {
      const v = (JSON.parse(raw) as { v?: unknown } | null)?.v;
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  }
  return peekEndless(raw);
}

const emptyData = (): SyncData => Object.fromEntries(SYNC_KEYS.map((k) => [k, null])) as SyncData;

/** Depodaki senkron anahtarlarının ham dizgileri (okunamayan anahtar null). */
export function readLocal(kv: KV | null): SyncData {
  const out = emptyData();
  for (const k of SYNC_KEYS) {
    try {
      out[k] = kv?.getItem(k) ?? null;
    } catch {
      out[k] = null;
    }
  }
  return out;
}

export function bundleFromData(data: SyncData, app: string, now: string, tombstones: Tombstone[] = []): SyncBundle {
  const d = emptyData();
  for (const k of SYNC_KEYS) d[k] = typeof data[k] === 'string' ? data[k] : null;
  return { format: BUNDLE_FORMAT, app, createdAt: now, versions: Object.fromEntries(SYNC_KEYS.map((k) => [k, versionOf(k, d[k])])) as SyncBundle['versions'], data: d, tombstones: mergeTombstones(tombstones) };
}

/** Yerel depodan paket (yükleme / yedek): senkron anahtarları + yerel silme işaretleri. */
export const buildBundle = (kv: KV | null, app: string, now: string = new Date().toISOString()): SyncBundle => bundleFromData(readLocal(kv), app, now, readTombstones(kv));

const kvOf = (data: SyncData): KV => {
  const kv = memoryKV();
  for (const k of SYNC_KEYS) if (data[k] !== null) kv.setItem(k, data[k]!);
  return kv;
};

export type BundleCheck = { ok: true } | { ok: false; reason: 'format' | 'newer-schema' | 'corrupt'; key?: SyncKey };

/**
 * Gelen paket uygulanabilir mi: biçim (silme işaretleri dahil), anahtar başına sürüm (daha yenisi -> 'newer-schema'; önce bu denetlenir,
 * çünkü yeni şema eski okuyucuya bozuk görünür), sonra mevcut okuyucularla bellekte okuma (bozuk -> 'corrupt'). Bildirilen sürümler ham
 * dizgiyle uyuşmalı.
 */
export function validateBundle(x: unknown): BundleCheck {
  if (!x || typeof x !== 'object') return { ok: false, reason: 'format' };
  const b = x as Partial<SyncBundle>;
  if (b.format !== BUNDLE_FORMAT || !b.data || typeof b.data !== 'object' || !b.versions || typeof b.versions !== 'object') return { ok: false, reason: 'format' };
  if (parseTombstones(b.tombstones) === null) return { ok: false, reason: 'format' };
  const data = b.data as Record<string, unknown>;
  for (const k of SYNC_KEYS) if (data[k] !== null && data[k] !== undefined && typeof data[k] !== 'string') return { ok: false, reason: 'format', key: k };
  const d = bundleFromData(data as SyncData, '', '').data;
  for (const k of SYNC_KEYS) {
    const v = versionOf(k, d[k]);
    if (v !== null && v > SUPPORTED_VERSIONS[k]) return { ok: false, reason: 'newer-schema', key: k };
  }
  for (const k of SYNC_KEYS) {
    const raw = d[k];
    if (raw === null) continue;
    const v = versionOf(k, raw);
    if (v === null || (b.versions as Record<string, unknown>)[k] !== v) return { ok: false, reason: 'corrupt', key: k };
  }
  const kv = kvOf(d);
  if (d['eov.campaign.v1'] !== null && readSaves(kv).corrupt) return { ok: false, reason: 'corrupt', key: 'eov.campaign.v1' };
  if (d['eov.endless.v1'] !== null && !parseRun(d['eov.endless.v1'])) return { ok: false, reason: 'corrupt', key: 'eov.endless.v1' };
  if (d['eov.endless.scores.v1'] !== null) {
    try {
      const p = JSON.parse(d['eov.endless.scores.v1']) as { version?: unknown; scores?: unknown } | null;
      if (p?.version !== SCORES_VERSION || !Array.isArray(p.scores)) return { ok: false, reason: 'corrupt', key: 'eov.endless.scores.v1' };
    } catch {
      return { ok: false, reason: 'corrupt', key: 'eov.endless.scores.v1' };
    }
  }
  if (d['eov.tutorial.v1'] !== null) {
    try {
      const p = JSON.parse(d['eov.tutorial.v1']) as { v?: unknown; seen?: unknown } | null;
      if (p?.v !== TUTORIAL_VERSION || !Array.isArray(p.seen)) return { ok: false, reason: 'corrupt', key: 'eov.tutorial.v1' };
    } catch {
      return { ok: false, reason: 'corrupt', key: 'eov.tutorial.v1' };
    }
  }
  return { ok: true };
}

/** İlerleme var mı: sefer yuvası, süren Endless koşusu ya da skor (okuyucular üzerinden; bozuk kayıt ilerleme sayılmaz). */
export function hasProgress(data: SyncData): boolean {
  const kv = kvOf(data);
  return readSaves(kv).file.slots.some((s) => !!s) || !!loadRun(kv) || loadScores(kv).length > 0;
}

const hasAnyData = (data: SyncData): boolean => SYNC_KEYS.some((k) => data[k] !== null);
const sameData = (a: SyncData, b: SyncData): boolean => SYNC_KEYS.every((k) => a[k] === b[k]);
const fileOf = (raw: string | null): SaveFile => readSaves(kvOf({ ...emptyData(), 'eov.campaign.v1': raw })).file;

// ---------------------------------------------------------------- silme işaretleri

/** Silme işaretlerinin öldürdüğü yuvalar sefer dosyasından çıkarılır (değişiklik yoksa ham dizgi aynen). */
export function cleanData(data: SyncData, tombs: Tombstone[]): SyncData {
  const raw = data['eov.campaign.v1'];
  if (raw === null || !tombs.length) return data;
  const file = fileOf(raw);
  let killed = false;
  file.slots.forEach((sd, i) => {
    if (sd && tombs.some((t) => killedBy(t, i, sd))) {
      file.slots[i] = null;
      killed = true;
    }
  });
  if (!killed) return data;
  if (file.lastSlot !== null && !file.slots[file.lastSlot]) file.lastSlot = null;
  return { ...data, 'eov.campaign.v1': JSON.stringify(file) };
}

const tombsOf = (b: SyncBundle | null): Tombstone[] => (b ? (parseTombstones(b.tombstones) ?? []) : []);
const withTombs = (b: SyncBundle, tombs: Tombstone[], app: string, now: string): SyncBundle => bundleFromData(cleanData(b.data, tombs), app, now, tombs);
export const sameBundle = (a: SyncBundle, b: SyncBundle): boolean => sameData(a.data, b.data) && sameTombstones(tombsOf(a), tombsOf(b));

// ---------------------------------------------------------------- Ironman

export interface RunRank {
  alive: boolean;
  cleared: number;
}

/** Yuvadaki seferin ilerlemesi (en yeni kayıt). Henüz kaydı olmayan yuva: yaşıyor, 0. */
export function slotRank(sd: SlotData): RunRank {
  const st = sd.saves.at(-1)?.state;
  if (!st) return { alive: true, cleared: 0 };
  const roster = Array.isArray(st.roster) ? st.roster : [];
  return {
    alive: roster.length === 0 || roster.some((h) => h.alive !== false && h.hpRatio > 0),
    cleared: Array.isArray(st.cleared) ? st.cleared.length : 0,
  };
}

/** >0: a daha ilerlemiş; <0: b; 0: otomatik kazanan yok (oyuncu seçer). Yaşayan önce gelir; takım level'ı yok. */
export function compareRank(a: RunRank, b: RunRank): number {
  if (a.alive !== b.alive) return a.alive ? 1 : -1;
  return a.cleared - b.cleared;
}

export type Side = 'local' | 'cloud';

export interface IronmanPin {
  slot: number;
  /** Seçimden bağımsız olarak bu yuvanın alınacağı taraf. */
  keep: Side;
  /** more-advanced: daha çok temizlenmiş düğüm; alive: ölü yaşayanın üstüne yazılmaz; not-deleted: karşı taraf boş ama silme işareti yok. */
  reason: 'more-advanced' | 'alive' | 'not-deleted';
}

/**
 * İki sefer dosyasında Ironman kuralının sabitlediği yuvalar (bkz. dosya başı). Birebir aynı yuvalar sabitlenmez. Dosyalar silme
 * işaretleriyle ÖNCEDEN temizlenmiş olmalı: kalan boş yuva silme sayılmaz, karşı taraftaki Ironman koşusu korunur.
 */
export function ironmanPins(local: SaveFile, cloud: SaveFile): IronmanPin[] {
  const pins: IronmanPin[] = [];
  const n = Math.max(local.slots.length, cloud.slots.length);
  for (let i = 0; i < n; i++) {
    const l = local.slots[i] ?? null;
    const c = cloud.slots[i] ?? null;
    if (l?.mode !== 'ironman' && c?.mode !== 'ironman') continue;
    if (JSON.stringify(l) === JSON.stringify(c)) continue;
    if (!l || !c) {
      pins.push({ slot: i, keep: l ? 'local' : 'cloud', reason: 'not-deleted' });
      continue;
    }
    const rl = slotRank(l);
    const rc = slotRank(c);
    if (l.campaignId === c.campaignId) {
      const cmp = compareRank(rl, rc);
      if (cmp !== 0) pins.push({ slot: i, keep: cmp > 0 ? 'local' : 'cloud', reason: rl.alive !== rc.alive ? 'alive' : 'more-advanced' });
      continue;
    }
    // Farklı seferler: yalnızca "ölü Ironman yaşayanın üstüne yazılmaz"
    const deadL = l.mode === 'ironman' && !rl.alive;
    const deadC = c.mode === 'ironman' && !rc.alive;
    if (deadL && rc.alive) pins.push({ slot: i, keep: 'cloud', reason: 'alive' });
    else if (deadC && rl.alive) pins.push({ slot: i, keep: 'local', reason: 'alive' });
  }
  return pins;
}

/** Temizlenmiş iki paket üzerinde seçim + Ironman sabitlemesi. */
function resolveClean(L: SyncBundle, C: SyncBundle, choice: Side, tombs: Tombstone[], app: string, now: string): SyncBundle {
  const chosen = choice === 'local' ? L : C;
  const other = choice === 'local' ? C : L;
  const lf = fileOf(L.data['eov.campaign.v1']);
  const cf = fileOf(C.data['eov.campaign.v1']);
  const flip = ironmanPins(lf, cf).filter((p) => p.keep !== choice);
  if (!flip.length) return bundleFromData(chosen.data, app, now, tombs);
  const file = choice === 'local' ? lf : cf;
  const from = choice === 'local' ? cf : lf;
  for (const p of flip) file.slots[p.slot] = from.slots[p.slot] ?? null;
  file.counter = Math.max(file.counter, from.counter);
  if (file.lastSlot !== null && !file.slots[file.lastSlot]) file.lastSlot = null;
  // Sabitleme sonrası yuvaların hepsi diğer tarafınkiyle aynıysa onun ham dizgisi aynen alınır (gereksiz yeniden yazım / sahte çakışma yok)
  const same = file.slots.every((sd, i) => JSON.stringify(sd) === JSON.stringify(from.slots[i] ?? null));
  return bundleFromData({ ...chosen.data, 'eov.campaign.v1': same ? other.data['eov.campaign.v1'] : JSON.stringify(file) }, app, now, tombs);
}

/**
 * Oyuncunun çakışma seçimini uygular: iki tarafın silme işaretleri birleşir ve iki taraf da onlarla temizlenir; sonra seçilen taraf alınır,
 * Ironman kuralının sabitlediği yuvalar diğer taraftan gelir. Sabitleme gerekmezse seçilen tarafın (temizlenmiş) ham dizgileri aynen döner;
 * gerekirse sefer dosyası okuyucunun çıktısından yeniden yazılır (şema aynı).
 */
export function resolveConflict(local: SyncBundle, cloud: SyncBundle, choice: Side, app: string, now: string = new Date().toISOString()): SyncBundle {
  const tombs = mergeTombstones(tombsOf(local), tombsOf(cloud));
  return resolveClean(withTombs(local, tombs, app, now), withTombs(cloud, tombs, app, now), choice, tombs, app, now);
}

// ---------------------------------------------------------------- karar

export type SyncDecision =
  | { kind: 'none' }
  | { kind: 'upload' }
  | { kind: 'download' }
  /** Sonuç iki ham taraftan da farklı (silme işareti temizliği / Ironman sabitlemesi): `bundle` yerelde uygulanır, sonra yüklenir. */
  | { kind: 'merge'; bundle: SyncBundle; pins: IronmanPin[] }
  /** Oyuncuya sor (iki tarafta da ilerleme var). `pins`: seçimden bağımsız sabitlenen Ironman yuvaları (diyalogda belirtilir). */
  | { kind: 'ask'; pins: IronmanPin[] }
  | { kind: 'refuse'; reason: 'format' | 'newer-schema' | 'corrupt'; key?: SyncKey };

/** Giriş / açılış senkron kararı (doğruluk tablosu dosya başında). `cloud` null = bulutta kayıt yok. */
/**
 * İki tutorial kaydını birleştirir: görülen / tamamlanan dersler birleşim, gösterim sayısı en büyüğü, dersler bir tarafta kapatıldıysa kapalı.
 * Biri yoksa diğeri aynen; ayrıştırılamayan / bilinmeyen sürümde undefined (çağıran sorar).
 */
export function mergeTutorialRaw(a: string | null, b: string | null): string | null | undefined {
  if (a === null || b === null) return a ?? b;
  type T = { v: number; on?: boolean; seen?: unknown; done?: unknown; shows?: unknown };
  let x: T, y: T;
  try {
    x = JSON.parse(a);
    y = JSON.parse(b);
  } catch {
    return undefined;
  }
  if (!x || !y || typeof x !== 'object' || typeof y !== 'object' || x.v !== y.v) return undefined;
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);
  const union = (p: unknown, q: unknown) => [...new Set([...strs(p), ...strs(q)])];
  const out: Record<string, unknown> = { v: x.v, on: x.on !== false && y.on !== false, seen: union(x.seen, y.seen) };
  if (x.done !== undefined || y.done !== undefined) out.done = union(x.done, y.done);
  if (x.shows !== undefined || y.shows !== undefined) {
    const shows: Record<string, number> = {};
    for (const s of [x.shows, y.shows]) {
      if (!s || typeof s !== 'object') continue;
      for (const [k, n] of Object.entries(s as Record<string, unknown>)) if (typeof n === 'number') shows[k] = Math.max(shows[k] ?? 0, n);
    }
    out.shows = shows;
  }
  const raw = JSON.stringify(out);
  return raw === a ? a : raw === b ? b : raw;
}

export function decideSync(local: SyncBundle, cloud: SyncBundle | null, app = '', now: string = new Date().toISOString()): SyncDecision {
  const outcome = (r: SyncBundle, pins: IronmanPin[] = []): SyncDecision => {
    const isL = sameBundle(r, local);
    const isC = !!cloud && sameBundle(r, cloud);
    if (isL && isC) return { kind: 'none' };
    if (isL) return { kind: 'upload' };
    if (isC) return { kind: 'download' };
    return { kind: 'merge', bundle: r, pins };
  };
  const cloudEmpty = !cloud || (!!cloud.data && typeof cloud.data === 'object' && !hasAnyData(bundleFromData(cloud.data, '', '').data) && !(Array.isArray(cloud.tombstones) && cloud.tombstones.length));
  if (cloudEmpty) {
    if (!hasAnyData(local.data) && !tombsOf(local).length) return { kind: 'none' };
    const r = withTombs(local, tombsOf(local), app, now);
    return sameBundle(r, local) ? { kind: 'upload' } : { kind: 'merge', bundle: r, pins: [] };
  }
  const check = validateBundle(cloud);
  if (!check.ok) return { kind: 'refuse', reason: check.reason, ...(check.key ? { key: check.key } : {}) };
  const tombs = mergeTombstones(tombsOf(local), tombsOf(cloud));
  const L = withTombs(local, tombs, app, now);
  const C = withTombs(cloud, tombs, app, now);
  if (sameData(L.data, C.data)) return outcome(L);
  // Yalnızca tutorial farklıysa sorulmaz, iki taraf birleştirilir (Ömer 2026-10-25: "çakışma sormasın")
  const T = 'eov.tutorial.v1';
  if (SYNC_KEYS.every((k) => k === T || L.data[k] === C.data[k])) {
    const t = mergeTutorialRaw(L.data[T], C.data[T]);
    if (t !== undefined) return outcome({ ...L, data: { ...L.data, [T]: t } });
  }
  const lp = hasProgress(L.data);
  const cp = hasProgress(C.data);
  if (lp && !cp) return outcome(L);
  if (!lp && cp) return outcome(C);
  if (!lp && !cp) return outcome(hasAnyData(L.data) ? L : C);
  const pins = ironmanPins(fileOf(L.data['eov.campaign.v1']), fileOf(C.data['eov.campaign.v1']));
  const rl = resolveClean(L, C, 'local', tombs, app, now);
  const rc = resolveClean(L, C, 'cloud', tombs, app, now);
  if (sameData(rl.data, rc.data)) return outcome(rl, pins);
  return { kind: 'ask', pins };
}

/**
 * Bulut verisi bu cihazın son senkronundan beri değişmedi (istemci hash'le bilir; arada yalnızca rev / silme işaretleri değişmiş olabilir):
 * yerel buluttan türedi, gerçek çakışma yok. Sonuç = yerel, iki tarafın silme işaretleriyle temizlenmiş: yerelle aynıysa 'upload',
 * değilse 'merge' (işaret temizliği yerelde uygulanır, sonra yüklenir). Ironman sabitlemesi yok (normal yükleme gibi).
 */
export function fastForward(local: SyncBundle, cloud: SyncBundle, app = '', now: string = new Date().toISOString()): SyncDecision {
  const check = validateBundle(cloud);
  if (!check.ok) return { kind: 'refuse', reason: check.reason, ...(check.key ? { key: check.key } : {}) };
  const tombs = mergeTombstones(tombsOf(local), tombsOf(cloud));
  const r = withTombs(local, tombs, app, now);
  if (!sameBundle(r, local)) return { kind: 'merge', bundle: r, pins: [] };
  return sameBundle(r, cloud) ? { kind: 'none' } : { kind: 'upload' };
}

// ---------------------------------------------------------------- uygulama + yedek

export type ApplyResult = { ok: true; backedUp: boolean } | { ok: false; reason: 'format' | 'newer-schema' | 'corrupt' | 'backup-failed' | 'write-failed'; key?: SyncKey };

/**
 * Paketi yerel depoya yazar. Önce doğrular (geçersizse hiçbir şey yazılmaz), sonra yerelde veri varsa onu `eov.cloud.backup.v1`e yedekler
 * (yedek yazılamazsa uygulama durur), sonra anahtarları yazar (null = sil) ve paketin silme işaretlerini yerel işaretlere ekler. Yazım yarıda
 * kalırsa yerel veri geri yazılır.
 * Not: sarılı depoda (kv-storage) yazım bulut "kirli" işaretini açar; indirme sonrası çağıran `clearCloudDirty` yapmalı.
 */
export function applyBundle(kv: KV | null, bundle: SyncBundle, app = '', now: string = new Date().toISOString()): ApplyResult {
  const check = validateBundle(bundle);
  if (!check.ok) return { ok: false, reason: check.reason, ...(check.key ? { key: check.key } : {}) };
  if (!kv) return { ok: false, reason: 'write-failed' };
  const before = readLocal(kv);
  const beforeTombs = readTombstones(kv);
  let backedUp = false;
  if (hasAnyData(before) || beforeTombs.length) {
    try {
      kv.setItem(BACKUP_KEY, JSON.stringify(bundleFromData(before, app, now, beforeTombs)));
      backedUp = true;
    } catch {
      return { ok: false, reason: 'backup-failed' };
    }
  }
  const put = (data: SyncData) => {
    for (const k of SYNC_KEYS) {
      const v = data[k];
      if (v === null) kv.removeItem(k);
      else kv.setItem(k, v);
    }
  };
  try {
    put(bundle.data);
    writeTombstones(kv, [...readTombstones(kv), ...tombsOf(bundle)]); // işaretler birikir; bir sonraki yüklemede taşınır
  } catch {
    try {
      put(before);
    } catch {
      /* geri yazılamadı: yedek anahtarı duruyor */
    }
    return { ok: false, reason: 'write-failed' };
  }
  return { ok: true, backedUp };
}

/** Son yedek (yoksa / bozuksa null). Geri yükleme = applyBundle(kv, readBackup(kv)) (o da önce mevcut durumu yedekler: takas). */
export function readBackup(kv: KV | null): SyncBundle | null {
  try {
    const raw = kv?.getItem(BACKUP_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as SyncBundle;
    return validateBundle(b).ok ? b : null;
  } catch {
    return null;
  }
}
