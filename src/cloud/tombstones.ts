/**
 * Silinen sefer yuvası işaretleri (bulut senkronu; accounts-plan.md Faz 1b, Ömer 2026-10-24: silinen Ironman yuvası başka cihazdan geri GELMEZ).
 * Yalnızca paket alanı + kendi yerel anahtarı (`eov.cloud.tombstones.v1`); sefer kayıt şeması değişmez. Hafif modül: kv-storage.ts kullanır.
 *
 * Yazım: sarılı depoda sefer dosyası yazılırken bir yuvadaki sefer (campaignId) kaybolursa (yuva silindi ya da yerine başka sefer kuruldu)
 * { slot, campaignId, deletedAt } işareti eklenir. Uygulama: işaret, aynı yuvadaki AYNI seferi (campaignId) ve yalnızca o sefer silinme anından
 * önce kurulduysa (`SlotData.startedAt <= deletedAt`) siler; silinmeden sonra kurulan yeni sefer kalır. İşareti olmayan boş yuva (senkron
 * geçmişi olmayan yeni cihaz) hiçbir zaman silme sayılmaz.
 */
import type { KV } from '../campaign/save';

export const TOMB_KEY = 'eov.cloud.tombstones.v1';
/** En fazla bu kadar işaret tutulur (en yeniler). */
export const MAX_TOMBSTONES = 32;

export interface Tombstone {
  slot: number;
  campaignId: string;
  deletedAt: string;
}

const validTomb = (t: unknown): t is Tombstone => {
  const x = t as Tombstone;
  return !!x && typeof x === 'object' && Number.isInteger(x.slot) && x.slot >= 0 && x.slot < 64 && typeof x.campaignId === 'string' && typeof x.deletedAt === 'string' && Number.isFinite(Date.parse(x.deletedAt));
};

/** Geçerli liste ya da (biçim bozuksa) null; yok = boş liste. */
export function parseTombstones(x: unknown): Tombstone[] | null {
  if (x === undefined) return [];
  if (!Array.isArray(x) || !x.every(validTomb)) return null;
  return x.map((t) => ({ slot: t.slot, campaignId: t.campaignId, deletedAt: t.deletedAt }));
}

/** Birleşim: (yuva, sefer) başına en geç silinme; en yeni MAX_TOMBSTONES; sıra kararlı (karşılaştırma için). */
export function mergeTombstones(...lists: Tombstone[][]): Tombstone[] {
  const by = new Map<string, Tombstone>();
  for (const list of lists)
    for (const t of list) {
      const k = `${t.slot}|${t.campaignId}`;
      const old = by.get(k);
      if (!old || Date.parse(t.deletedAt) > Date.parse(old.deletedAt)) by.set(k, { ...t });
    }
  return [...by.values()]
    .sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt))
    .slice(0, MAX_TOMBSTONES)
    .sort((a, b) => a.slot - b.slot || (a.campaignId < b.campaignId ? -1 : a.campaignId > b.campaignId ? 1 : 0));
}

export const sameTombstones = (a: Tombstone[], b: Tombstone[]): boolean => JSON.stringify(mergeTombstones(a)) === JSON.stringify(mergeTombstones(b));

export function readTombstones(kv: KV | null): Tombstone[] {
  try {
    const raw = kv?.getItem(TOMB_KEY);
    return raw ? (parseTombstones(JSON.parse(raw)) ?? []) : [];
  } catch {
    return [];
  }
}

export function writeTombstones(kv: KV, list: Tombstone[]): void {
  const m = mergeTombstones(list);
  if (m.length) kv.setItem(TOMB_KEY, JSON.stringify(m));
  else kv.removeItem(TOMB_KEY);
}

/** Bu işaret bu yuva verisini siler mi (aynı sefer, silinmeden önce kurulmuş). */
export function killedBy(t: Tombstone, slot: number, sd: { campaignId?: unknown; startedAt?: unknown } | null): boolean {
  if (!sd || t.slot !== slot || sd.campaignId !== t.campaignId) return false;
  const started = typeof sd.startedAt === 'string' ? Date.parse(sd.startedAt) : NaN;
  return !Number.isFinite(started) || started <= Date.parse(t.deletedAt);
}

/** Okuyucunun (campaign/save.ts > readSaves) kabul ettiği yuva biçimi; tanınmayan yuva okunamamıştır, silme sayılmaz (sağlamlık A1). */
const readableSlot = (s: unknown): s is { campaignId: string } => {
  const x = s as { campaignId?: unknown; mode?: unknown; saves?: unknown } | null;
  return !!x && typeof x === 'object' && typeof x.campaignId === 'string' && Array.isArray(x.saves) && (x.mode === 'normal' || x.mode === 'ironman');
};

/** Ham sefer dosyasındaki yuva seferleri (yuva sırası; boş / tanınmayan = null). Sürüm 1 (yuvasız) dosyada boş liste. */
function slotIds(raw: string | null): Array<string | null> {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw) as { slots?: unknown } | null;
    if (!p || !Array.isArray(p.slots)) return [];
    return p.slots.map((s) => (readableSlot(s) ? s.campaignId : null));
  } catch {
    return [];
  }
}

/** Ham dosyanın sürüm numarası (sayı değilse / okunamazsa null). save.ts'i içe almaz (hafif modül). */
function fileVersion(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const v = (JSON.parse(raw) as { version?: unknown } | null)?.version;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Önceki -> sonraki sefer dosyasında kaybolan yuva seferleri için işaretler. */
export function deletedSlots(prev: string | null, next: string | null, now: string): Tombstone[] {
  const a = slotIds(prev);
  const b = next === null ? [] : slotIds(next);
  // Sonraki dosya okunamıyorsa (yuvasız/bozuk ama null değil) silme sayılmaz
  if (next !== null && !b.length && a.length) return [];
  // Önceki dosya sürümsüz ya da yazandan YENİ sürümse (eski sekme, sağlamlık taraması A1) yazan onu okuyamamıştır: silme sayılmaz
  if (next !== null && a.length) {
    const pv = fileVersion(prev);
    const nv = fileVersion(next);
    if (pv === null || nv === null || pv > nv) return [];
  }
  const out: Tombstone[] = [];
  a.forEach((id, i) => {
    if (id !== null && b[i] !== id) out.push({ slot: i, campaignId: id, deletedAt: now });
  });
  return out;
}

/** Sarılı depo kancası: sefer dosyası yazıldı / silindi. Yazılan işaretlerin yuvaları döner (tanılama izi). Asla fırlatmaz (kayıt yazımını bozmaz). */
export function noteCampaignWrite(ls: KV, prev: string | null, next: string | null, now: string = new Date().toISOString()): number[] {
  try {
    const add = deletedSlots(prev, next, now);
    if (add.length) writeTombstones(ls, [...readTombstones(ls), ...add]);
    return add.map((t) => t.slot);
  } catch {
    /* işaret yazılamadı: senkron eskisi gibi */
    return [];
  }
}
