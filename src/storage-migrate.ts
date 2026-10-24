/**
 * Depo anahtarı taşıma (2026-10-24): eski `protomedi.*` ve `proto.*` localStorage anahtarları `eov.*` önekine taşınır, oyuncu kaydı
 * kaybolmaz. main.ts'in İLK import'u: depoyu okuyan her modülden önce çalışır. Kural: hedef `eov.X` zaten varsa ezilmez; `protomedi.X` ile
 * `proto.X` aynı hedefe düşerse `protomedi.` öncelikli; kopyalanan eski anahtar silinir. Bir kez çalışır (`eov.migrated.v1` bayrağı).
 * localStorage erişilemezse sessizce geçer.
 */

export const OLD_PREFIXES = ['protomedi.', 'proto.'] as const; // öncelik sırası: önce protomedi.
export const NEW_PREFIX = 'eov.';
export const MIGRATED_FLAG = 'eov.migrated.v1';

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

/** Taşımayı yapar; taşınan anahtar sayısını döner (bayrak varsa 0). */
export function migrateStorage(store: KV): number {
  if (store.getItem(MIGRATED_FLAG)) return 0;
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k !== null) keys.push(k);
  }
  let moved = 0;
  for (const prefix of OLD_PREFIXES) {
    for (const oldKey of keys) {
      if (!oldKey.startsWith(prefix)) continue;
      const value = store.getItem(oldKey);
      if (value === null) continue;
      const newKey = NEW_PREFIX + oldKey.slice(prefix.length);
      if (store.getItem(newKey) === null) {
        try {
          store.setItem(newKey, value);
          moved++;
        } catch {
          continue; // yazılamadıysa (kota) eskisi silinmez
        }
      }
      store.removeItem(oldKey);
    }
  }
  store.setItem(MIGRATED_FLAG, '1');
  return moved;
}

try {
  if (typeof localStorage !== 'undefined') migrateStorage(localStorage);
} catch {
  // erişilemeyen depo (gizli mod, engelli site verisi): sessizce geç
}
