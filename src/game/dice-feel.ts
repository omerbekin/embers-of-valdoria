/**
 * Gambler: zar atışı ve seri (Lucky Streak) göstergesinin SAF mantığı (Phaser'sız, testlenebilir). Yalnız görünüm; sayılar motorda.
 * Zar yüzleri motorun `dice` olayından, seri `streak` olayından okunur (motor değişmez).
 */
import type { BattleEvent } from '../engine';

export type DiceTier = 'low' | 'mid' | 'high';
export interface DiceRoll { values: number[]; double: boolean }

/** Toplama göre vuruş hissi: 2-5 zayıf, 6-8 normal, 9+ güçlü (2 zar x 6 yüz için; ortalama 7). */
export function diceTier(sum: number): DiceTier {
  return sum <= 5 ? 'low' : sum >= 9 ? 'high' : 'mid';
}

/** Bir skill kullanımının olaylarından zar atışları (atış sırasıyla: ilk vuruş, tekrar...). */
export function diceRollsOf(events: readonly BattleEvent[] | undefined, actorUid?: string): DiceRoll[] {
  const out: DiceRoll[] = [];
  for (const e of events ?? []) if (e.type === 'dice' && (!actorUid || e.actor === actorUid)) out.push({ values: [...e.values], double: e.double });
  return out;
}

/** Yüz sayısını sprite aralığına (1-6) sıkıştırır (başka yüzlü zar gelirse okunur kalsın). */
export const faceOf = (v: number): number => Math.max(1, Math.min(6, Math.round(v)));

/** Seri fişleri: her fiş dolu mu (max kadar). */
export function streakChips(streak: number, max: number): boolean[] {
  return Array.from({ length: Math.max(0, max) }, (_, i) => i < streak);
}

/** Seri dolu mu (ışıma + skill 2-4 altın çerçeve). */
export const streakFull = (streak: number | undefined, max: number): boolean => max > 0 && (streak ?? 0) >= max;
