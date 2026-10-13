import type { ValorRules } from './types';

/**
 * VALOR (Ömer 2026-10-13; kurallar data/valor.json, tasarım docs/design/open-questions.md madde 315): takımın savaştan savaşa taşıdığı kaynak,
 * YALNIZCA düşmüş kahramanı diriltmeye harcanır. Saf hesaplar (sefer, Endless, arayüz ve sim ortak kullanır).
 */

export type ValorTier = 'normal' | 'elite' | 'boss';

/** Kazanılan savaşın Valor'u: normal win, elit elite, boss boss (win YERİNE) + kimse düşmediyse flawless. */
export function valorEarned(rules: ValorRules, tier: ValorTier, flawless: boolean): number {
  const base = tier === 'boss' ? rules.earn.boss : tier === 'elite' ? rules.earn.elite : rules.earn.win;
  return Math.max(0, base + (flawless ? rules.earn.flawless : 0));
}

/** Mevcut Valor'a kazanç ekler (0..cap; tam sayı). */
export function addValor(rules: ValorRules, current: number, gain: number): number {
  return clampValor(rules, current + gain);
}

export function clampValor(rules: ValorRules, v: number): number {
  return Math.max(0, Math.min(rules.cap, Math.floor(Number.isFinite(v) ? v : 0)));
}

/** Savaş dışında (harita, Endless ödül/kamp) bir diriltme alınabilir mi? */
export const canReviveOutside = (rules: ValorRules, valor: number): boolean => valor >= rules.revive.outsideCost;

/**
 * Gösterim (mangallar): her mangaldaki yanan kor sayısı, soldan dolar. Örn. cap 10 / perBrazier 5: 7 -> [5, 2].
 * `ready`: dolu mangal sayısı (savaşta her biri bir diriltme).
 */
export function brazierFill(rules: ValorRules, valor: number): { embers: number[]; ready: number } {
  const per = Math.max(1, rules.perBrazier);
  const count = Math.max(1, Math.ceil(rules.cap / per));
  const v = clampValor(rules, valor);
  const embers = Array.from({ length: count }, (_, i) => Math.max(0, Math.min(per, v - i * per)));
  return { embers, ready: embers.filter((e) => e >= per).length };
}
