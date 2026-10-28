import type { Combatant, SkillCost } from './types';
import { costCondEffect, effNum, type CostEnv } from './tree-hooks';

/**
 * Skill bedelinin GERÇEK miktarı. Sabit bedelde `amount`; `ofCurrent` (0-1) varsa kullanıcının o anki kaynağının bu oranı eklenir:
 * amount + round(mevcut x ofCurrent), en az 1 (Wail of the Dead: mevcut canın %20'si). Yuvarlama: en yakın tam sayı (0,5 yukarı).
 * Kullanıcı verilmezse (tooltip/wiki: savaş dışı) sabit kısım döner. Motor (canUse, ödeme), YZ, önizleme ve maç kaydı bu fonksiyonu kullanır.
 */
export function skillCostAmount(cost: SkillCost, user?: Pick<Combatant, 'hp' | 'mp' | 'rage'> & Partial<Combatant>, env?: CostEnv): number {
  // Faz 4a: tetiğin verdiği "sonraki skill bedelsiz" (TreeBuff.free; yalnızca ağaçlı birimde, sürmekte olan kullanımda kazanılan sayılmaz)
  if (user?.treeBuffs?.some((b) => b.free && !b.pending)) return 0;
  const ratio = cost.ofCurrent ?? 0;
  // Skill ağacı bedel koşulları (SkillCost.cond; yalnızca yamalı birim kopyasında): koşul tutarsa sabit kısma ek, en az 0. Koşul yoksa bedel aynen
  // (CostCond.mul: bedel çarpanı, ör. Formed Up -1 = bedelsiz; spendAll / ofCurrent / MP indiriminden SONRA en son uygulanır)
  // Faz 2c: `env` (hedef + savaş okumaları) verilirse hedefe bağlı koşullar da değerlendirilir (Not Yet); yoksa tutmaz
  const cc = cost.cond ? costCondEffect(cost, user as Combatant | undefined, env) : undefined;
  let amount = cc ? Math.max(0, cost.amount + cc.add) : cost.amount;
  // spendAll (Headsman's Blow): kaynağın TAMAMI; amount en az gereken (Rage: 30). Kullanıcı yoksa (tooltip/wiki) en az miktar
  if (cost.spendAll && user) {
    const current = cost.resource === 'hp' ? user.hp : cost.resource === 'mp' ? user.mp : (user.rage ?? 0);
    amount = Math.max(amount, current);
  }
  if (ratio > 0 && user) {
    const current = cost.resource === 'hp' ? user.hp : cost.resource === 'mp' ? user.mp : (user.rage ?? 0);
    amount = Math.max(1, amount + Math.round(current * ratio));
  }
  // MP cost -% (item affix, Ömer 2026-10-11): MP bedeli indirimi, yuvarlanır, en az 1; etki yoksa bedel aynen
  const cut = cost.resource === 'mp' && user ? effNum(user, 'mpCostReduce') : 0; // item + ağaç kanalı (tree-hooks.ts)
  if (cut > 0 && amount > 0) amount = Math.max(1, Math.round(amount * (1 - Math.min(1, cut))));
  if (cc && cc.mul !== 1) amount = Math.max(0, Math.round(amount * cc.mul));
  // Ley Brand (open-questions 444): Branded birimin MP bedeli costMult katı, yukarı yuvarlanır (en son; durum yoksa bedel aynen)
  const bm = cost.resource === 'mp' && amount > 0 ? brandCostMult(user) : 1;
  if (bm !== 1) amount = Math.ceil(amount * bm - 1e-9);
  return amount;
}

/** Ley Brand: birimin üstündeki Branded'ın MP bedel çarpanı (yoksa 1). Saf. */
export function brandCostMult(user?: Partial<Pick<Combatant, 'statuses'>>): number {
  const st = user?.statuses?.find((s) => s.kind === 'branded');
  return st?.brand?.costMult ?? 1;
}

/** Soul Exchange (SkillCost.hpFallback): yedek can bedelinin miktarı = round(mevcut can x oran), en az 1. Yedek yoksa 0. */
export function hpFallbackAmount(cost: SkillCost, user: Pick<Combatant, 'hp'>): number {
  const r = cost.hpFallback ?? 0;
  return r > 0 && cost.resource === 'mp' ? Math.max(1, Math.round(user.hp * r)) : 0;
}

/**
 * Bu kullanımda GERÇEKTEN ödenecek bedel (kaynak + miktar). Normalde skill'in kendi kaynağı ve skillCostAmount; Soul Exchange (hpFallback):
 * MP bedeli > 0 ve mevcut MP yetmiyorsa (Unlimited MP debug'ı kapalıyken) bedel kendiliğinden candan (hpFallbackAmount) ödenir; can da yetmiyorsa
 * (can <= bedel) MP olarak kalır (canUse "Not enough MP" der). Motor (canUse, ödeme), YZ, önizleme / HUD aynı fonksiyonu kullanır.
 */
export function skillCostPay(cost: SkillCost, user: Pick<Combatant, 'hp' | 'mp' | 'rage'> & Partial<Combatant>, env?: CostEnv, freeMp = false): { resource: SkillCost['resource']; amount: number; fallback?: true } {
  const amount = skillCostAmount(cost, user, env);
  if (cost.resource !== 'mp' || !(cost.hpFallback ?? 0) || freeMp || amount <= 0 || user.mp >= amount) return { resource: cost.resource, amount };
  const hp = hpFallbackAmount(cost, user);
  return user.hp > hp ? { resource: 'hp', amount: hp, fallback: true } : { resource: cost.resource, amount };
}

/** Bedelin kısa, okunur etiketi (İngilizce; tooltip başlığı, wiki): '5 MP', '50 RAGE', '20% of current HP', 'Free'. */
export function skillCostLabel(cost: SkillCost): string {
  const res = cost.resource.toUpperCase();
  // Soul Exchange (hpFallback): "16 MP or 25% of current HP"
  if ((cost.hpFallback ?? 0) > 0 && cost.resource === 'mp') {
    const { hpFallback, ...rest } = cost;
    return `${skillCostLabel(rest)} or ${Math.round(hpFallback! * 100)}% of current HP`;
  }
  if (cost.spendAll) return `All ${res} (min ${cost.amount})`;
  if ((cost.ofCurrent ?? 0) > 0) return `${cost.amount > 0 ? `${cost.amount} + ` : ''}${Math.round(cost.ofCurrent! * 100)}% of current ${res}`;
  return cost.amount > 0 ? `${cost.amount} ${res}` : 'Free';
}

/** Bedel kullanıcının mevcut kaynağına oranlı mı (ofCurrent)? */
export const isRatioCost = (cost: SkillCost): boolean => (cost.ofCurrent ?? 0) > 0 || !!cost.spendAll;
