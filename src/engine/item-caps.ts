// Item kancalarının motor sınırları (saf; yalnızca veri okur).
import itemsJson from '../../data/items.json';
/**
 * Item kancalarının motor sınırları (Ömer 2026-10-13, itemfix m4): eskiden motora gömülüydü, artık data/items.json > caps (yüzde; oran olarak).
 * Güç katmanı (src/progression/loadout.ts) aynı tavanlarla kırpar ve arayüz "max" gösterir; motor yine de güvenlik için sınırlar.
 */
const itemCap = (k: string, fallback: number): number => {
  const v = (itemsJson.caps as Record<string, number | undefined>)[k];
  return typeof v === 'number' && v > 0 ? v / 100 : fallback;
};
export const ITEM_HOOK_CAPS = {
  /** Quick start (startCharge): turun en çok bu oranında başlanır. */
  initiative: itemCap('initiative', 0.99),
  /** Zırh / büyü zırhı delme oranı üst sınırı. */
  armorPen: itemCap('armorPen', 1),
  magicPen: itemCap('magicPen', 1),
  /** Alınan hasar azaltma (Global defense ve düşük can azaltması) üst sınırı. */
  damageTaken: itemCap('damageTaken', 0.9),
} as const;
