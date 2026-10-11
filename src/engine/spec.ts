import type { DamageSpec } from './formulas';
import { outgoingDamageMult } from './stats';
import type { BonusScale, Combatant, Formulas, SkillEffect, Stats } from './types';

export type DamageEffect = Extract<SkillEffect, { type: 'damage' }>;

/**
 * Bir hasar etkisinin belirli bir hedefe karşı hesap girdisi: etiket bonusu, eksik mana ve kalkan ekleri,
 * çağrılan birimlerin fazla hasar yemesi. Gerçek vuruş, önizleme ve yapay zeka aynı belirtimi kullanır.
 * `powerMult`: arkadaki birime sıçrayan hasar gibi kısmi vuruşlar için; `extras` false ise düz ekler uygulanmaz.
 */
export function damageSpecFor(
  actor: Combatant,
  target: Combatant,
  effect: DamageEffect,
  formulas: Formulas,
  powerMult = 1,
  extras = true,
  extraTaken = 1,
  /** Saldıranın verdiği hasar çarpanı (Dex-primary Hunter's Mark: hedefinden hızlıysa 1 + hunterMark). */
  dealtMult = 1,
  /** Saldıranın geçerli stat'ları (aura zırhı dahil; hibrit ölçek bonusScale bunlardan okunur). Verilmezse actor.stats. */
  attackerStats?: Combatant['stats'],
): DamageSpec {
  // Tür hassasiyeti: ör. undead + holy, nature + fire
  const element = effect.element ?? 'physical';
  let weak = 1;
  for (const tag of target.tags) weak *= formulas.weaknesses?.[tag]?.[element] ?? 1;
  const tagBonus = effect.bonusVsTag && target.tags.includes(effect.bonusVsTag.tag) ? effect.bonusVsTag.multiplier : 1;
  let extra = 0;
  if (extras && effect.bonusPerMissingMana) extra += Math.max(0, target.maxMp - target.mp) * effect.bonusPerMissingMana;
  if (extras && effect.bonusFromShield) extra += actor.shield * effect.bonusFromShield.ratio;
  // Pasifler: rage (eksik cana göre) ve openingShot (canı dolu hedefe)
  let passiveMult = 1;
  const pe = actor.passive?.effect;
  if (pe?.type === 'rage') passiveMult *= 1 + pe.maxBonus * (1 - actor.hp / actor.maxHp);
  if (pe?.type === 'longshot') {
    const lanes = formulas.formation.lanes;
    passiveMult *= 1 + pe.perRow * (Math.floor(actor.slot / lanes) + Math.floor(target.slot / lanes));
  }
  // Opportunist (bonusVsStatus): hedefte listedeki durumlardan biri (Wound/Slow/Stun) varsa hasar x(1 + bonus); kritik ayrıca son çarpandır
  if (pe?.type === 'bonusVsStatus' && target.statuses.some((s) => pe.statuses.includes(s.kind))) passiveMult *= 1 + pe.bonus;
  // Item affix'leri (Ömer 2026-10-11): Global damage x element hasarı; yoksa çarpılmaz (bugünkü savaşlar birebir aynı)
  const out = outgoingDamageMult(actor.stats, element);
  const mult = out !== 1 ? tagBonus * weak * powerMult * passiveMult * out : tagBonus * weak * powerMult * passiveMult;
  // Zırh / büyü zırhı delme (affix): skill'in kendi ignoreDefense'iyle çarpımsal birleşir
  const pen = effect.damageType === 'physical' ? (actor.itemEffects?.armorPen ?? 0) : (actor.itemEffects?.magicPen ?? 0);
  const ignore = pen > 0 ? 1 - (1 - (effect.ignoreDefense ?? 0)) * (1 - Math.min(1, pen)) : effect.ignoreDefense;
  const bonus = effect.bonusScale ? bonusScaleRaw(effect.bonusScale, attackerStats ?? actor.stats) * mult : 0;
  return {
    damageType: effect.damageType,
    scale: effect.scale,
    power: effect.power * mult,
    ...(bonus ? { bonus } : {}),
    ...(ignore ? { ignoreDefense: ignore } : {}),
    extra,
    takenMultiplier: (target.summoned ? formulas.summon.damageTakenMultiplier : 1) * extraTaken * dealtMult, // Hunter's Mark tüm vuruşu (eklerle birlikte) çarpar
  };
}

/** Hibrit ölçek eki (damage.bonusScale): girişlerin toplamı = değer x pct (zırh / büyü zırhı / temel stat; çarpansız ham miktar). */
export function bonusScaleRaw(entries: BonusScale[] | undefined, stats: Stats): number {
  if (!entries) return 0;
  let v = 0;
  for (const b of entries) v += (b.stat === 'armor' ? stats.armor : b.stat === 'magicArmor' ? stats.magicArmor : stats[b.stat]) * b.pct;
  return v;
}
