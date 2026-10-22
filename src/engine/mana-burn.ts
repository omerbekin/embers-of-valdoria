import type { Combatant, SkillEffect } from './types';

/** manaBurn etkisi (Mana Steal, Drain Field). */
export type ManaBurnEffect = Extract<SkillEffect, { type: 'manaBurn' }>;

/**
 * Etkinin hedef başına NOMİNAL yakımı (mevcut MP sınırı yok): sabit `amount` + `pctMax` (hedefin MAKSİMUM MP'sinin o oranı, yuvarlanır).
 * Madde 260 (Ömer): Drain Field yüzdeyle yakar. Faz 2c (Deep Cut): ikisi birlikte varsa TOPLANIR (veride birlikte olan skill yok; ağaç ekler).
 */
export function nominalBurn(effect: ManaBurnEffect, target: Pick<Combatant, 'maxMp'>): number {
  const pct = effect.pctMax !== undefined ? Math.round(target.maxMp * effect.pctMax) : 0;
  return Math.max(0, (effect.amount ?? 0) + pct);
}

/** Gerçek yakım: nominal yakım, hedefin mevcut MP'siyle sınırlı. Saf (motor, önizleme, YZ, skill-info aynı hesabı kullanır). */
export function burnAmountFor(effect: ManaBurnEffect, target: Pick<Combatant, 'mp' | 'maxMp'>): number {
  return Math.max(0, Math.min(target.mp, nominalBurn(effect, target)));
}

/**
 * `onEmpty` zarı bu hedefe atılır mı: etkinin onEmpty'si var, hedef canlı ve maks MP'si > 0, ve yakımdan sonra MP'si 0 (bu yakımla 0'a indi YA DA zaten 0'dı;
 * madde 260 kararı). `mpBefore`: yakımdan önceki MP (varsayılan hedefin şu anki MP'si).
 */
export function emptyProcApplies(effect: ManaBurnEffect, target: Pick<Combatant, 'mp' | 'maxMp' | 'hp'>, mpBefore = target.mp): boolean {
  if (!effect.onEmpty || target.hp <= 0 || target.maxMp <= 0) return false;
  return mpBefore - burnAmountFor(effect, { mp: mpBefore, maxMp: target.maxMp }) <= 0;
}
