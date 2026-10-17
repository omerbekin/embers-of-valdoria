import type { Combatant, SkillCost } from './types';

/**
 * Skill bedelinin GERÇEK miktarı. Sabit bedelde `amount`; `ofCurrent` (0-1) varsa kullanıcının o anki kaynağının bu oranı eklenir:
 * amount + round(mevcut x ofCurrent), en az 1 (Wail of the Dead: mevcut canın %20'si). Yuvarlama: en yakın tam sayı (0,5 yukarı).
 * Kullanıcı verilmezse (tooltip/wiki: savaş dışı) sabit kısım döner. Motor (canUse, ödeme), YZ, önizleme ve maç kaydı bu fonksiyonu kullanır.
 */
export function skillCostAmount(cost: SkillCost, user?: Pick<Combatant, 'hp' | 'mp' | 'rage'> & Partial<Pick<Combatant, 'itemEffects'>>): number {
  const ratio = cost.ofCurrent ?? 0;
  let amount = cost.amount;
  // spendAll (Headsman's Blow): kaynağın TAMAMI; amount en az gereken (Rage: 30). Kullanıcı yoksa (tooltip/wiki) en az miktar
  if (cost.spendAll && user) {
    const current = cost.resource === 'hp' ? user.hp : cost.resource === 'mp' ? user.mp : (user.rage ?? 0);
    amount = Math.max(cost.amount, current);
  }
  if (ratio > 0 && user) {
    const current = cost.resource === 'hp' ? user.hp : cost.resource === 'mp' ? user.mp : (user.rage ?? 0);
    amount = Math.max(1, cost.amount + Math.round(current * ratio));
  }
  // MP cost -% (item affix, Ömer 2026-10-11): MP bedeli indirimi, yuvarlanır, en az 1; etki yoksa bedel aynen
  const cut = cost.resource === 'mp' ? (user?.itemEffects?.mpCostReduce ?? 0) : 0;
  if (cut > 0 && amount > 0) amount = Math.max(1, Math.round(amount * (1 - Math.min(1, cut))));
  return amount;
}

/** Bedelin kısa, okunur etiketi (İngilizce; tooltip başlığı, wiki): '5 MP', '50 RAGE', '20% of current HP', 'Free'. */
export function skillCostLabel(cost: SkillCost): string {
  const res = cost.resource.toUpperCase();
  if (cost.spendAll) return `All ${res} (min ${cost.amount})`;
  if ((cost.ofCurrent ?? 0) > 0) return `${cost.amount > 0 ? `${cost.amount} + ` : ''}${Math.round(cost.ofCurrent! * 100)}% of current ${res}`;
  return cost.amount > 0 ? `${cost.amount} ${res}` : 'Free';
}

/** Bedel kullanıcının mevcut kaynağına oranlı mı (ofCurrent)? */
export const isRatioCost = (cost: SkillCost): boolean => (cost.ofCurrent ?? 0) > 0 || !!cost.spendAll;
