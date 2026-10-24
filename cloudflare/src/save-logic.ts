/**
 * Bulut kaydının saf kuralları (Faz 1a; docs/arch/accounts-plan.md > Kayıt senkronu). Cloudflare'e bağımlı değil; testler Node'da
 * (tests/auth-worker.test.ts). Paket senkron anahtarlarının ham dizgilerini olduğu gibi taşır; şemanın sahibi oyundaki okuyuculardır.
 *
 * PUT /save gövdesi (application/json, en çok MAX_BODY_BYTES):
 *   { baseRev: number, app: string, versions: { [anahtar]: number }, data: { [anahtar]: string },
 *     tombstones?: Array<{ slot: number, campaignId: string, deletedAt: number }> }   (en çok 32; sunucu yorumlamaz)
 * - baseRev: istemcinin bildiği son rev (bulutta kayıt yoksa 0). Uyuşmazsa 409 conflict (iyimser kilit).
 * - versions: anahtar başına şema sürümü; buluttaki herhangi bir anahtarın sürümü daha yeniyse 409 schema-older (eski istemci yeni
 *   şemalı kaydı ezemez).
 * - data: yalnızca SYNC_KEYS; değerler ham localStorage dizgileri.
 */

/** Senkronlanan anahtarlar (plan). eov.diag.*, eov.mp*, ayarlar, debug/önbellek anahtarları ASLA. */
export const SYNC_KEYS = ['eov.campaign.v1', 'eov.endless.v1', 'eov.endless.scores.v1', 'eov.tutorial.v1'] as const;
export type SyncKey = (typeof SYNC_KEYS)[number];

/** İstek gövdesi sınırı: 1 MB. */
export const MAX_BODY_BYTES = 1_048_576;
/**
 * Saklanan blob sınırı. D1'de satır en çok 2.000.000 bayt; satırda blob + prev_blob birlikte durur, ikisi + diğer alanlar sığmalı.
 */
export const MAX_BLOB_BYTES = 960_000;
/** İki yazım arası en kısa süre (istemci 15 sn debounce yapar; bu yalnızca kötüye kullanım freni). */
export const MIN_PUT_INTERVAL_MS = 5_000;
export const MAX_APP_CHARS = 32;
export const MAX_SCHEMA_VERSION = 10_000;

export type Versions = Partial<Record<SyncKey, number>>;
export type SaveData = Partial<Record<SyncKey, string>>;

export interface SavePut {
  baseRev: number;
  app: string;
  versions: Versions;
  data: SaveData;
  /** Silinmiş Ironman slotlarının izleri (gövdede yoksa []). Sunucu yorumlamaz; birleştirme istemcide. */
  tombstones: Tombstone[];
}

export interface Tombstone {
  slot: number;
  campaignId: string;
  deletedAt: number;
}
export const MAX_TOMBSTONES = 32;
export const MAX_SLOT = 1000;
export const MAX_CAMPAIGN_ID_CHARS = 64;

export type SaveError = 'empty' | 'too-large' | 'bad-json' | 'bad-shape' | 'bad-rev' | 'bad-app' | 'bad-versions' | 'bad-data' | 'bad-tombstones';

/** tombstones alanını doğrular: dizi, en çok 32 öğe, her öğe tam olarak {slot, campaignId, deletedAt}; bozuksa null. */
export function parseTombstones(v: unknown): Tombstone[] | null {
  if (!Array.isArray(v) || v.length > MAX_TOMBSTONES) return null;
  const out: Tombstone[] = [];
  for (const t of v) {
    if (!isObj(t)) return null;
    const keys = Object.keys(t);
    if (keys.length !== 3 || !['slot', 'campaignId', 'deletedAt'].every((k) => keys.includes(k))) return null;
    const { slot, campaignId, deletedAt } = t;
    if (typeof slot !== 'number' || !Number.isInteger(slot) || slot < 0 || slot > MAX_SLOT) return null;
    if (typeof campaignId !== 'string' || campaignId.length === 0 || campaignId.length > MAX_CAMPAIGN_ID_CHARS || /[\u0000-\u001f\u007f]/.test(campaignId)) return null;
    if (typeof deletedAt !== 'number' || !Number.isSafeInteger(deletedAt) || deletedAt < 0) return null;
    out.push({ slot, campaignId, deletedAt });
  }
  return out;
}

/** Saklanan biçim: sabit alan sırasıyla JSON (aynı içerik = aynı dizgi; "unchanged" karşılaştırması buna dayanır). */
export const serializeTombstones = (list: Tombstone[]): string => JSON.stringify(list.map((t) => ({ slot: t.slot, campaignId: t.campaignId, deletedAt: t.deletedAt })));

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isSyncKey = (k: string): k is SyncKey => (SYNC_KEYS as readonly string[]).includes(k);
const byteLength = (s: string): number => new TextEncoder().encode(s).length;

/** content-length başlığı sınırı aşıyor mu (gövde okunmadan 413)? Başlık yoksa false (gövde yine ölçülür). */
export function contentLengthTooLarge(header: string | null, max = MAX_BODY_BYTES): boolean {
  if (header === null) return false;
  const n = Number(header);
  return !Number.isFinite(n) || n < 0 || n > max;
}

export function parseVersions(v: unknown): Versions | null {
  if (!isObj(v)) return null;
  const out: Versions = {};
  for (const [k, n] of Object.entries(v)) {
    if (!isSyncKey(k) || typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > MAX_SCHEMA_VERSION) return null;
    out[k] = n;
  }
  return out;
}

/** PUT /save gövdesini doğrular. Fazla alan reddedilir. */
export function parseSavePut(body: string): { ok: true; put: SavePut } | { ok: false; error: SaveError } {
  if (typeof body !== 'string' || body.length === 0) return { ok: false, error: 'empty' };
  if (body.length > MAX_BODY_BYTES || byteLength(body) > MAX_BODY_BYTES) return { ok: false, error: 'too-large' };
  let v: unknown;
  try {
    v = JSON.parse(body);
  } catch {
    return { ok: false, error: 'bad-json' };
  }
  if (!isObj(v)) return { ok: false, error: 'bad-shape' };
  const keys = Object.keys(v);
  const hasTomb = keys.includes('tombstones');
  if (keys.length !== (hasTomb ? 5 : 4) || !['baseRev', 'app', 'versions', 'data'].every((k) => keys.includes(k))) return { ok: false, error: 'bad-shape' };
  if (typeof v.baseRev !== 'number' || !Number.isSafeInteger(v.baseRev) || v.baseRev < 0) return { ok: false, error: 'bad-rev' };
  if (typeof v.app !== 'string' || v.app.length === 0 || v.app.length > MAX_APP_CHARS || !/^[0-9A-Za-z.+_-]+$/.test(v.app)) return { ok: false, error: 'bad-app' };
  const versions = parseVersions(v.versions);
  if (!versions) return { ok: false, error: 'bad-versions' };
  if (!isObj(v.data)) return { ok: false, error: 'bad-data' };
  const data: SaveData = {};
  for (const [k, s] of Object.entries(v.data)) {
    if (!isSyncKey(k) || typeof s !== 'string') return { ok: false, error: 'bad-data' };
    data[k] = s;
  }
  // Her veri anahtarının sürümü bildirilmeli (sürümsüz veri şema korumasını atlatamasın)
  for (const k of Object.keys(data)) if (!(k in versions)) return { ok: false, error: 'bad-versions' };
  const tombstones = hasTomb ? parseTombstones(v.tombstones) : [];
  if (!tombstones) return { ok: false, error: 'bad-tombstones' };
  return { ok: true, put: { baseRev: v.baseRev, app: v.app, versions, data, tombstones } };
}

/** Saklanacak blob: data'nın JSON dizgisi + bayt boyutu; sınırı aşarsa null. */
export function serializeBlob(data: SaveData): { blob: string; size: number } | null {
  const blob = JSON.stringify(data);
  const size = byteLength(blob);
  return size > MAX_BLOB_BYTES ? null : { blob, size };
}

/** Veritabanındaki versions JSON'unu okur (bozuksa boş). */
export function readStoredVersions(json: string | null | undefined): Versions {
  if (!json) return {};
  try {
    return parseVersions(JSON.parse(json)) ?? {};
  } catch {
    return {};
  }
}

/**
 * Gelen paket şema olarak buluttakinden eski mi? Buluttaki bir anahtarın sürümü gelen sürümden büyükse evet.
 * Gelen pakette olmayan anahtar (o cihazda o mod hiç oynanmamış) eski sayılmaz.
 */
export function schemaOlder(stored: Versions, incoming: Versions): boolean {
  for (const k of SYNC_KEYS) {
    const s = stored[k];
    const i = incoming[k];
    if (s !== undefined && i !== undefined && s > i) return true;
  }
  return false;
}

export type PutDecision = { ok: true; rev: number } | { ok: false; status: 409 | 429; error: 'conflict' | 'schema-older' | 'throttled'; rev: number };

/** Buluttaki satıra göre PUT kararı: iyimser kilit (baseRev), şema koruması, hız freni. Kabulde yeni rev döner. */
export function decidePut(stored: { rev: number; updatedAt: number; versions: Versions } | null, put: Pick<SavePut, 'baseRev' | 'versions'>, now: number): PutDecision {
  const cur = stored?.rev ?? 0;
  if (put.baseRev !== cur) return { ok: false, status: 409, error: 'conflict', rev: cur };
  if (stored && schemaOlder(stored.versions, put.versions)) return { ok: false, status: 409, error: 'schema-older', rev: cur };
  if (stored && throttled(stored.updatedAt, now)) return { ok: false, status: 429, error: 'throttled', rev: cur };
  return { ok: true, rev: cur + 1 };
}

/** Son yazımdan bu yana MIN_PUT_INTERVAL_MS geçmedi mi? (Saat geri gittiyse de fren yok.) */
export function throttled(lastUpdatedAt: number, now: number, minInterval = MIN_PUT_INTERVAL_MS): boolean {
  const dt = now - lastUpdatedAt;
  return dt >= 0 && dt < minInterval;
}

/** Saniye cinsinden Retry-After (en az 1). */
export const retryAfterSec = (lastUpdatedAt: number, now: number, minInterval = MIN_PUT_INTERVAL_MS): number => Math.max(1, Math.ceil((minInterval - (now - lastUpdatedAt)) / 1000));

/** POST /save/restore-previous ve DELETE /account gövdeleri. */
export function parseRestoreBody(body: string): { baseRev: number } | null {
  try {
    const v: unknown = JSON.parse(body);
    if (!isObj(v) || Object.keys(v).length !== 1 || typeof v.baseRev !== 'number' || !Number.isSafeInteger(v.baseRev) || v.baseRev < 0) return null;
    return { baseRev: v.baseRev };
  } catch {
    return null;
  }
}

export function parseDeleteBody(body: string): boolean {
  try {
    const v: unknown = JSON.parse(body);
    return isObj(v) && Object.keys(v).length === 1 && v.confirm === 'DELETE';
  } catch {
    return false;
  }
}
