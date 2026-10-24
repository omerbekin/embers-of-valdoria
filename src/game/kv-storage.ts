import type { KV } from '../campaign';
import { isSyncKey } from '../cloud/keys';
import { noteCampaignWrite } from '../cloud/tombstones';

const CAMPAIGN_KEY = 'eov.campaign.v1';

/**
 * Bulut "kirli" işareti (accounts-plan.md Faz 1b): senkronlanan bir anahtar (cloud/keys.ts > SYNC_KEYS) DEĞİŞEREK yazılınca ya da silinince
 * true olur; sefer dosyasında bir yuvanın seferi kaybolursa silme işareti (tombstone) yazılır; yükleyici (Faz 1d) yükledikten sonra `clearCloudDirty` çağırır. Ayar ve diğer anahtarlar işaretlemez. Ağ çağrısı yok.
 */
let dirty = false;
const listeners = new Set<(key: string) => void>();
const wrapped = new WeakMap<object, KV>();

function mark(key: string): void {
  dirty = true;
  for (const fn of listeners) fn(key);
}

/** Bir depoyu sarar: okuma aynen, senkron anahtarına değişen yazım / silme `dirty` işaretler. Aynı depo için aynı sarmalayıcı döner. */
export function wrapKV(ls: KV): KV {
  let w = wrapped.get(ls);
  if (w) return w;
  w = {
    getItem: (k) => ls.getItem(k),
    setItem: (k, v) => {
      const prev = isSyncKey(k) ? ls.getItem(k) : null;
      const changed = isSyncKey(k) && prev !== v;
      ls.setItem(k, v); // hata (kota) yukarı gider; yazılmayan değer işaretlemez
      if (!changed) return;
      if (k === CAMPAIGN_KEY) noteCampaignWrite(ls, prev, v); // kaybolan yuva seferi -> silme işareti (cloud/tombstones.ts)
      mark(k);
    },
    removeItem: (k) => {
      const prev = isSyncKey(k) ? ls.getItem(k) : null;
      ls.removeItem(k);
      if (prev === null) return;
      if (k === CAMPAIGN_KEY) noteCampaignWrite(ls, prev, null);
      mark(k);
    },
  };
  wrapped.set(ls, w);
  return w;
}

/**
 * Tarayıcı deposu (sarılı); kapalıysa (gizli pencere vb.) null: kayıt yapılamaz ama oyun çökmez. (Ana menü de kullanır: hafif modül.)
 * `window.localStorage` yoksa `globalThis.localStorage` (aynı nesne tarayıcıda; Node testleri ikisinden birini taklit eder).
 */
export function storage(): KV | null {
  try {
    const ls = (typeof window !== 'undefined' ? window.localStorage : undefined) ?? (globalThis as { localStorage?: KV }).localStorage;
    return ls && typeof ls.getItem === 'function' ? wrapKV(ls) : null; // Node 25'in yerleşik localStorage'ı dosyasız yöntemsizdir: yok say
  } catch {
    return null;
  }
}

/** Son temizlemeden beri senkron anahtarı değişti mi. */
export const cloudDirty = (): boolean => dirty;

export function clearCloudDirty(): void {
  dirty = false;
}

/** Senkron anahtarı her değiştiğinde (debounce için); dinlemeyi bırakan işlev döner. */
export function onCloudDirty(fn: (key: string) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
