// Düşüş nadirliği (Ömer onayı 2026-10-11; items.md 3.2b): TEK ağırlık tablosu (data/items.json > dropRarity). Sefer loot'u, Endless ödül kartları ve
// tüccar stoğu aynı zarı kullanır: önce nadirlik zarlanır, sonra taban item seçilir (taban nadirlikten bağımsız). Dalga / item seviyesi ve elit / boss
// tabloyu yalnızca HAFİFÇE kaydırır, kaymanın sert tavanı var. Legendary bu tablodan çıkmaz (yalnızca ortak nadir düşüş zarı, rare.ts). Saf ve seed'li.
import { ITEMS, type RarityId } from './items';

/** Tablonun kademeleri (Legendary yok). */
export const DROP_RARITIES = ['common', 'uncommon', 'rare', 'epic'] as const satisfies readonly RarityId[];
export type DropRarity = (typeof DROP_RARITIES)[number];

/** Kaymaya katkı veren kaynak türü. */
export type DropKind = 'normal' | 'elite' | 'boss' | 'treasure';

export interface DropRarityConfig {
  /** Taban ağırlıklar (Common / Uncommon / Rare / Epic). */
  weights: Record<DropRarity, number>;
  /** Kayma = perIlvl x item seviyesi + tür eki; en çok max. Kademe i'nin ağırlığı x(1 + kayma x i) (Common sabit). */
  shift: { perIlvl: number; elite: number; boss: number; treasure: number; max: number };
}

export const DROP: DropRarityConfig = (ITEMS as unknown as { dropRarity: DropRarityConfig }).dropRarity;

/** Bu kaynağın kayması (0..max). */
export function dropShift(ilvl: number, kind: DropKind = 'normal', cfg: DropRarityConfig = DROP): number {
  const bonus = kind === 'normal' ? 0 : (cfg.shift[kind] ?? 0);
  return Math.max(0, Math.min(cfg.shift.max, cfg.shift.perIlvl * Math.max(0, ilvl) + bonus));
}

/** Kaymış ağırlıklar (DROP_RARITIES sırasıyla). */
export function dropWeights(ilvl: number, kind: DropKind = 'normal', cfg: DropRarityConfig = DROP): number[] {
  const s = dropShift(ilvl, kind, cfg);
  return DROP_RARITIES.map((r, i) => Math.max(0, cfg.weights[r] ?? 0) * (1 + s * i));
}

/** Yüzde tablosu (rapor / Codex). */
export function dropChances(ilvl: number, kind: DropKind = 'normal', cfg: DropRarityConfig = DROP): Record<DropRarity, number> {
  const w = dropWeights(ilvl, kind, cfg);
  const total = w.reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(DROP_RARITIES.map((r, i) => [r, (w[i]! / total) * 100])) as Record<DropRarity, number>;
}

/** Nadirlik zarı (tek rng.next). */
export function rollDropRarity(rng: { next(): number }, ilvl: number, kind: DropKind = 'normal', cfg: DropRarityConfig = DROP): DropRarity {
  const w = dropWeights(ilvl, kind, cfg);
  const total = w.reduce((a, b) => a + b, 0);
  let x = rng.next() * total;
  for (let i = 0; i < w.length; i++) {
    x -= w[i]!;
    if (x < 0) return DROP_RARITIES[i]!;
  }
  return 'common';
}

/** Tablo doğrulaması (boş = geçerli). */
export function validateDropRarity(cfg: DropRarityConfig | undefined = DROP): string[] {
  const e: string[] = [];
  if (!cfg) return ['dropRarity missing'];
  for (const r of DROP_RARITIES) if (!(cfg.weights?.[r] >= 0)) e.push(`dropRarity.weights.${r} must be >= 0`);
  if (!(cfg.weights?.common > 0)) e.push('dropRarity.weights.common must be positive');
  const s = cfg.shift;
  if (!s || !(s.max >= 0 && s.max <= 1) || !(s.perIlvl >= 0) || !(s.elite >= 0) || !(s.boss >= 0) || !(s.treasure >= 0)) e.push('dropRarity.shift: perIlvl / elite / boss / treasure >= 0, max in [0, 1]');
  return e;
}
