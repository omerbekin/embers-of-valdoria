import type { DamageSpec } from './formulas';
import { statusCounts, statusCountsAny } from './status-count';
import { outgoingDamageMult, statDamageAdd } from './stats';
import { ITEM_HOOK_CAPS } from './item-caps';
import { effNum } from './tree-hooks';
import type { BonusScale, Combatant, Formulas, SkillEffect, Stats } from './types';

export type DamageEffect = Extract<SkillEffect, { type: 'damage' }>;

/** Saldıranın hedefe verdiği hasar (Battle.dealtDamage): ayrı çarpanlar + hasar havuzuna giren pay (Ömer 2026-11-07, P1). */
export interface DealtDamage {
  mult: number;
  add: number;
}

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
  /** Saldıranın verdiği hasar (Battle.dealtDamage: ayrı çarpan + havuz payı); düz sayı = yalnız ayrı çarpan (eski çağrılar). */
  dealtMult: number | DealtDamage = 1,
  /** Saldıranın geçerli stat'ları (aura zırhı dahil; hibrit ölçek bonusScale bunlardan okunur). Verilmezse actor.stats. */
  attackerStats?: Combatant['stats'],
  /** powerPerRage (Headsman's Blow): harcanan Rage; verilmezse kullanıcının o anki Rage'i (önizleme/YZ: vuruştan önce). Motor vuruşta ödenen bedeli verir. */
  rageSpent?: number,
  /** A4 Iron Draws the Bolt: hedefin geçerli zırhı (durum / aura dahil); verilmezse temel zırh. */
  targetArmor?: number,
): DamageSpec {
  // Tür hassasiyeti: ör. undead + holy, nature + fire
  const element = effect.element ?? 'physical';
  let weak = 1;
  for (const tag of target.tags) weak *= formulas.weaknesses?.[tag]?.[element] ?? 1;
  // bonusVsStatus (Weir Eel Bite): hedefte durum varsa ek çarpan
  const tagBonus = (effect.bonusVsTag && target.tags.includes(effect.bonusVsTag.tag) ? effect.bonusVsTag.multiplier : 1) * (effect.bonusVsStatus && target.statuses.some((s) => statusCounts(s, effect.bonusVsStatus!.status)) ? effect.bonusVsStatus.multiplier : 1);
  let extra = 0;
  if (extras && effect.bonusPerMissingMana) extra += Math.max(0, target.maxMp - target.mp) * effect.bonusPerMissingMana;
  if (extras && effect.bonusFromShield) extra += actor.shield * effect.bonusFromShield.ratio;
  // A4: yalnız etiketli skill; alan vuruşunda her hedefe (extras'tan bağımsız)
  if (effect.ironBolt) extra += (targetArmor ?? target.stats.armor) * effect.ironBolt;
  // Pasifler: rage (eksik cana göre) ve openingShot (canı dolu hedefe)
  let passiveMult = 1;
  const pe = actor.passive?.effect;
  if (pe?.type === 'rage') passiveMult *= 1 + pe.maxBonus * (1 - actor.hp / actor.maxHp);
  if (pe?.type === 'longshot') {
    const lanes = formulas.formation.lanes;
    passiveMult *= 1 + pe.perRow * (Math.floor(actor.slot / lanes) + Math.floor(target.slot / lanes) + (pe.extraRows ?? 0));
  }
  // Opportunist (bonusVsStatus): hedefte listedeki durumlardan biri (Wound/Slow/Stun) varsa hasar x(1 + bonus); kritik ayrıca son çarpandır
  if (pe?.type === 'bonusVsStatus' && target.statuses.some((s) => statusCountsAny(s, pe.statuses))) passiveMult *= 1 + pe.bonus;
  // executeBonus (Headsman's Blow): hedefin eksik can oranıyla x(1 + executeBonus x eksik oran); alan yoksa çarpan yok (determinizm)
  if (effect.executeBonus && target.maxHp > 0) passiveMult *= 1 + effect.executeBonus * Math.max(0, 1 - target.hp / target.maxHp);
  // Pealing Bells (Vesper): çan vuruşu, bu savaşta çalınan her çan için x(1 + perBell); sayaç yoksa çarpan yok (determinizm)
  const bells = actor.bells ?? 0;
  if (effect.bell && pe?.type === 'pealingBells' && bells > 0) passiveMult *= 1 + pe.perBell * bells;
  // Hasar havuzu (Ömer 2026-11-07, P1): silah gücü x (1 + Global damage + element + dealtDamage payı + ağaç "+% power"); yoksa çarpılmaz
  const dealt = typeof dealtMult === 'number' ? { mult: dealtMult, add: 0 } : dealtMult;
  const baked = effect.powerAdd ?? 0;
  const out = outgoingDamageMult(actor.stats, element, dealt.add, baked);
  const pool = Math.max(0, 1 + baked + statDamageAdd(actor.stats, element) + dealt.add);
  const mult = out !== 1 ? tagBonus * weak * powerMult * passiveMult * out : tagBonus * weak * powerMult * passiveMult;
  // Zırh / büyü zırhı delme (affix): skill'in kendi ignoreDefense'iyle çarpımsal birleşir
  const phys = effect.damageType === 'physical';
  const pen = effNum(actor, phys ? 'armorPen' : 'magicPen'); // item + ağaç kanalı (tree-hooks.ts)
  const penCap = phys ? ITEM_HOOK_CAPS.armorPen : ITEM_HOOK_CAPS.magicPen;
  const ignore = pen > 0 ? 1 - (1 - (effect.ignoreDefense ?? 0)) * (1 - Math.min(penCap, pen)) : effect.ignoreDefense;
  const bonus = effect.bonusScale ? bonusScaleRaw(effect.bonusScale, attackerStats ?? actor.stats) * mult : 0;
  return {
    damageType: effect.damageType,
    scale: effect.scale,
    ...(effect.element ? { element: effect.element } : {}),
    power: ((effect.powerPerRage ? effect.power + effect.powerPerRage * Math.max(0, rageSpent ?? actor.rage ?? 0) : effect.power) + (effect.powerPerBell && bells > 0 ? effect.powerPerBell * bells : 0)) * mult,
    ...(bonus ? { bonus } : {}),
    ...(ignore ? { ignoreDefense: ignore } : {}),
    extra,
    ...(pool !== 1 ? { pool } : {}),
    takenMultiplier: (target.summoned ? formulas.summon.damageTakenMultiplier : 1) * extraTaken * dealt.mult, // ayrı çarpanlar tüm vuruşu (eklerle birlikte) çarpar
  };
}

/**
 * Bölünmüş hasarın parçaları (damage.split, Thunder Skald Hammer Spark): split yoksa tek parça [etki, 1]; varsa
 * [etkinin kendi türü (1 - share), split türü / elementi (share)]. Gerçek vuruş, önizleme ve ipucu aynı parçaları kullanır.
 */
export function splitParts(effect: DamageEffect): Array<{ effect: DamageEffect; share: number }> {
  if (!effect.split) return [{ effect, share: 1 }];
  const { split, ...base } = effect;
  const s = Math.min(1, Math.max(0, split.share));
  const second: DamageEffect = { ...base, damageType: split.damageType };
  if (split.element) second.element = split.element;
  else delete second.element;
  return [
    { effect: base, share: 1 - s },
    { effect: second, share: s },
  ];
}

/** Hibrit ölçek eki (damage.bonusScale): girişlerin toplamı = değer x pct (zırh / büyü zırhı / temel stat; çarpansız ham miktar). */
export function bonusScaleRaw(entries: BonusScale[] | undefined, stats: Stats): number {
  if (!entries) return 0;
  let v = 0;
  for (const b of entries) v += (b.stat === 'armor' ? stats.armor : b.stat === 'magicArmor' ? stats.magicArmor : stats[b.stat]) * b.pct;
  return v;
}
