/**
 * Ekonomi ekranlarının (Inn, kamp, demirci) saf görünüm verisi: DOM yok, vitest ile sınanır (tests/econ-ui-model.test.ts).
 * Oyun kuralı burada değil (src/campaign); burası yalnızca "kaç günde iyileşir", ihtimal çubuğu dilimleri gibi gösterim hesapları.
 */
import { rarityDef, type RarityId } from '../progression';
import { woundCount } from '../progression/wounds';

/** Inn'deki kahraman tam iyileşene kadar kaç gün (0 = zaten iyi). Can günde `healPerDay`, yara günde `woundsPerDay`; ikisinin uzunu. */
export function innHealDays(h: { hpRatio: number; wounds?: unknown }, rate: { healPerDay: number; woundsPerDay: number }): number {
  const hp = rate.healPerDay > 0 ? Math.ceil((1 - Math.max(0, Math.min(1, h.hpRatio))) / rate.healPerDay - 1e-9) : 0;
  const w = rate.woundsPerDay > 0 ? Math.ceil(woundCount(h) / rate.woundsPerDay - 1e-9) : 0;
  return Math.max(0, hp, w);
}

/** "Fully healed in N days" satırı (iyiyse "Fully healed"). */
export const healLine = (days: number): string => (days <= 0 ? 'Fully healed' : `Fully healed in ${days} day${days === 1 ? '' : 's'}`);

export interface OddsSlice {
  rarity: RarityId;
  name: string;
  color: string;
  /** Yüzde (tam sayı, toplam 100). */
  pct: number;
}

/** Combine sonucunun nadirlik ihtimal dilimleri: alt nadirlik (1 - upChance) ve varsa üst nadirlik (upChance). */
export function oddsSlices(low: RarityId, high: RarityId, upChance: number): OddsSlice[] {
  const mk = (r: RarityId, pct: number): OddsSlice => ({ rarity: r, name: rarityDef(r).name, color: rarityDef(r).color, pct });
  if (low === high || upChance <= 0) return [mk(low, 100)];
  const up = Math.max(1, Math.min(99, Math.round(upChance * 100)));
  return [mk(low, 100 - up), mk(high, up)];
}

/** Kamp kartları: sıra ve ad sabit (mockup A). `target` = altında açılan hedef türü. */
export const CAMP_CARDS = [
  { kind: 'rest', name: 'Rest', target: 'none' },
  { kind: 'tend', name: 'Tend wounds', target: 'hero' },
  { kind: 'sharpen', name: 'Sharpen', target: 'item' },
  { kind: 'train', name: 'Train', target: 'hero' },
] as const;
export type CampCardKind = (typeof CAMP_CARDS)[number]['kind'];

/** campaign.json > texts kalıbındaki {anahtar} yer tutucularını doldurur (bilinmeyen anahtar aynen kalır). */
export const fillText = (tpl: string, vars: Record<string, string | number>): string => tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
