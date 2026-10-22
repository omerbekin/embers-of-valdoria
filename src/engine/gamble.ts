import type { BetSpec } from './types';

/**
 * Bahis hesabı (saf; savaş, önizleme ve yapay zeka aynı formülü kullanır).
 * `mpLeft`: skill'in MP bedeli düşüldükten sonra kalan MP.
 */
export function betStake(bet: BetSpec, maxHp: number, hp: number, mpLeft: number): number {
  const p = betStakeParts(bet, maxHp, hp, mpLeft);
  return p.main + p.hp;
}

/**
 * Bahsin parçaları: `main` = bahsin kendi kaynağından (can ya da MP), `hp` = Mortgage'ın (BetSpec.hpStake) ek can bahsi (MP bahsinde; canı en az 1 bırakır).
 * Kazanç çarpanı toplamı (main + hp) görür; kayıpta her parça kendi kaynağından düşer. hpStake yoksa `hp` 0 (eski hesap birebir).
 */
export function betStakeParts(bet: BetSpec, maxHp: number, hp: number, mpLeft: number, stakeMul = 1): { main: number; hp: number } {
  const mul = (v: number): number => (stakeMul !== 1 ? Math.max(0, Math.round(v * stakeMul)) : v);
  if (bet.resource === 'hp') return { main: mul(Math.max(0, Math.min(hp - 1, Math.round(maxHp * bet.ratio)))), hp: 0 };
  const main = mul(Math.max(0, Math.round(mpLeft * bet.ratio)));
  const extra = (bet.hpStake ?? 0) > 0 ? Math.max(0, Math.min(hp - 1, mul(Math.round(maxHp * bet.hpStake!)))) : 0;
  return { main, hp: extra };
}

/** Bahsin hasar çarpanları: kazanç, kayıp ve beklenen (olasılıkla ağırlıklı) çarpan. */
export function betMultipliers(bet: BetSpec, stake: number): { win: number; lose: number; expected: number } {
  const win = bet.winMult + (bet.perStake ?? 0) * stake;
  const lose = bet.loseMult ?? 1;
  return { win, lose, expected: bet.winChance * win + (1 - bet.winChance) * lose };
}
