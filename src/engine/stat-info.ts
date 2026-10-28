import { describePassive } from './skill-info';
import { armorReduction } from './stats';
import type { CombatantDef, Formulas, SkillDef, Stats } from './types';

/** Arayüzde gösterilen stat türleri: 4 temel özellik, can/mana ve alt stat'lar (kritik çarpanı sabittir ama alt barda salt okunur satır olarak görünür; hpRegen/mpRegen tur başı yenilenmeler). */
export type StatKind = 'hp' | 'mp' | 'str' | 'int' | 'dex' | 'luck' | 'spd' | 'critChance' | 'critMult' | 'accuracy' | 'evasion' | 'armor' | 'magicArmor' | 'hpRegen' | 'mpRegen';

export interface StatInfo {
  title: string;
  lines: string[];
  /** Bu stat birimin primary statı (arayüz ismi altın renkte yazar). */
  primary?: boolean;
  /** Primary statın bonusu (yalnızca primary stat'ta): kısa ad + kısa değer; `active` false ise arayüz soluk gösterir. */
  bonus?: PrimaryBonusInfo;
  /** Primary statta başlığın hemen altında duran tek düz satır ("Primary: 35% chance ..."); Ömer 2026-10-19 (V1). Uzun bonus maddesi artık `lines` içinde yok. */
  primaryLine?: string;
}

export interface PrimaryBonusInfo {
  /** Kısa ad: Resilience / Hunter's Mark / Mana Echo / Lucky Escape. */
  name: string;
  /** Kısa değer: "35% debuff -1 turn" ... */
  detail: string;
  active: boolean;
}

import { moreText, multText } from './bonus-text';

const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
// 3 basamağa kadar (x2 stat ölçeği: puan başı 0,125 / 0,165 gibi katsayılar tam görünsün), sondaki sıfırlar atılır
const num = (v: number) => (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(3))));
const num1 = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, ''));

/** Kişisel hız zarının sapması (+6% / -4% / ±0%; tam yüzdeye yuvarlanır). */
export function paceText(roll: number): string {
  const p = Math.round((roll - 1) * 100);
  return p > 0 ? `+${p}%` : p < 0 ? `-${-p}%` : '±0%';
}

/** Bir stat'ın ne işe yaradığını ve şu anki etkisini anlatan tooltip metni (İngilizce). */
export function describeStat(kind: StatKind, stats: Stats, f: Formulas): StatInfo {
  const info = describeStatBase(kind, stats, f);
  const isAttr = kind === 'str' || kind === 'int' || kind === 'dex' || kind === 'luck';
  if (!isAttr || stats.primary !== kind) return info;
  const bonus = primaryBonusInfo(kind, f, !!stats.primaryActive);
  const lines = [...info.lines, ...(bonus.active ? [] : ["Inactive: this is not the unit's highest stat"])];
  return { ...info, lines, primary: true, bonus, primaryLine: `Primary: ${primaryBonusShort(kind, f)}` };
}

/** Primary bonusun kısa adı ve değeri (alt bar ve tooltip başlığı); değerler formulas.json > primaryBonus. */
export function primaryBonusInfo(kind: 'str' | 'int' | 'dex' | 'luck', f: Formulas, active: boolean): PrimaryBonusInfo {
  const b = f.primaryBonus;
  switch (kind) {
    case 'str': return { name: 'Resilience', detail: `${pct(b.str.resilienceChance)} debuff -1 turn`, active };
    case 'dex': return { name: "Hunter's Mark", detail: `${moreText(b.dex.hunterMarkMult)} dmg vs slower`, active };
    case 'int': return { name: 'Mana Echo', detail: `${pct(b.int.manaEchoChance)} refund half MP`, active };
    case 'luck': return { name: 'Lucky Escape', detail: `${pct(b.luck.surviveChance)} ignore killing blow`, active };
  }
}

/** Primary bonusun kısa düz cümlesi (stat ipucunda "Primary: ..." satırı); sayılar formulas.json > primaryBonus. */
export function primaryBonusShort(kind: 'str' | 'int' | 'dex' | 'luck', f: Formulas): string {
  const b = f.primaryBonus;
  switch (kind) {
    case 'str': return `${pct(b.str.resilienceChance)} chance for debuffs on you to last 1 turn less`;
    case 'dex': return `${moreText(b.dex.hunterMarkMult)} damage when you are faster than your target`;
    case 'int': return `${pct(b.int.manaEchoChance)} chance to get back half of a skill's MP cost`;
    case 'luck': return `${pct(b.luck.surviveChance)} chance to ignore a lethal hit once per battle`;
  }
}

/** Primary stat bonusunun açıklaması (İngilizce); değerler formulas.json > primaryBonus. */
export function primaryBonusLines(kind: 'str' | 'int' | 'dex' | 'luck', f: Formulas): string[] {
  const b = f.primaryBonus;
  switch (kind) {
    case 'str': return [`Primary bonus: Resilience - every debuff applied to you has a ${pct(b.str.resilienceChance)} chance to last 1 turn less (never below 1 turn)`];
    case 'dex': return [`Primary bonus: Hunter's Mark - when you are faster than your target, your damaging hits deal ${moreText(b.dex.hunterMarkMult)} damage`];
    case 'int': return [`Primary bonus: Mana Echo - after each skill, ${pct(b.int.manaEchoChance)} chance to get back half of its MP cost (rounded up, at least 1)`];
    case 'luck': return [`Primary bonus: Lucky Escape - once per battle, a lethal hit has a ${pct(b.luck.surviveChance)} chance to be ignored completely: you take no damage from it, your HP and shields stay as they were, and it has no side effects (no lifesteal, no on-hit effects)`];
  }
}

function describeStatBase(kind: StatKind, stats: Stats, f: Formulas): StatInfo {
  const a = f.attributes;
  switch (kind) {
    case 'str':
      return {
        title: `Strength ${stats.str}`,
        lines: [
          `Max HP: +${a.hpPerStr} per point (now ${stats.hp})`,
          `HP regen: +${num(a.hpRegenPerStr)} per point at the start of each turn (now ${Math.round(stats.hpRegen)})`,
          `Strength skills deal ${num(f.scaling.str)}x of STR as base damage`,
        ],
      };
    case 'int':
      return {
        title: `Intelligence ${stats.int}`,
        lines: [
          `Max MP: ${a.mpBase} base + ${a.mpPerInt} per point (now ${stats.mp})`,
          `MP regen: +${num(a.mpRegenPerInt)} per point at the start of each turn (now ${stats.mpRegen}; 0 INT = none)`,
          `Intelligence skills (magic damage, heals, magic shields) use ${num(f.scaling.int)}x of INT`,
        ],
      };
    case 'dex':
      return {
        title: `Dexterity ${stats.dex}`,
        lines: [
          `Speed: +${num(a.spdPerDex)} per point (now ${stats.spd}); faster units act more often`,
          `Evasion: +${pct(a.evasionPerStep)} per ${a.dexPerEvasionStep} Dex, whole steps only (now ${pct(stats.evasion)}; max ${pct(a.evasionMax)})`,
          `Dexterity skills deal ${num(f.scaling.dex)}x of DEX as base damage`,
        ],
      };
    case 'luck':
      return {
        title: `Luck ${stats.luck}`,
        lines: [
          `Crit chance: +${pct(a.critChancePerLuck, 1)} per point (now ${pct(stats.critChance, 1)})`,
          `Accuracy: +${pct(a.accuracyPerLuck, 1)} per point (base ${pct(a.accuracyBase)}, now ${pct(stats.accuracy)}); your attacks miss less often`,
          `A crit always deals ${multText(a.critMult)} damage; this does not depend on Luck`,
          'Crits are the final multiplier of damage and healing, never of shields',
        ],
      };
    case 'hp':
      return { title: `Health ${stats.hp}`, lines: [`Max HP comes from Strength (+${a.hpPerStr} per point)`, `Regenerates ${Math.round(stats.hpRegen)} at the start of each of its turns (Strength x ${num(a.hpRegenPerStr)})`, 'At 0 HP the unit falls'] };
    case 'mp':
      return { title: `Mana ${stats.mp}`, lines: [`Max MP = ${a.mpBase} base (the same for every class) + ${a.mpPerInt} per Intelligence point`, `Regenerates ${stats.mpRegen} at the start of each of its turns (Intelligence x ${num(a.mpRegenPerInt)})`] };
    case 'spd':
      return {
        title: `Speed ${stats.spd}`,
        lines: [
          `Comes from Dexterity (+${num(a.spdPerDex)} per point)`,
          // Kişisel hız zarı (Ömer 2026-10-24): birimin sapması; zar yoksa (sınıf kartı, wiki örneği) satır yok
          ...(stats.spdRoll !== undefined ? [`Natural pace: ${Math.round(stats.spdRoll * 100) === 100 ? 'normal' : multText(Math.round(stats.spdRoll * 100) / 100)} Speed`] : []),
          'Decides how soon the unit acts: higher speed means more turns',
        ],
      };
    case 'critChance':
      return { title: `Crit chance ${pct(stats.critChance, 1)}`, lines: [`Base ${pct(a.critChanceBase)}, +${pct(a.critChancePerLuck, 1)} per Luck`, `A crit always deals ${multText(a.critMult)} damage or healing (fixed)`, 'Applies to damage and healing, not shields'] };
    case 'critMult':
      return {
        title: `Crit damage ${Math.round((stats.critMult ?? a.critMult) * 1000) / 10}%`,
        lines: [
          `Critical hits deal ${multText(stats.critMult ?? a.critMult)} damage`,
          'Fixed for every unit: Luck only raises the crit chance, never the multiplier',
          'Applies to the final damage and healing of a crit, never to shields',
        ],
      };
    case 'hpRegen':
      return {
        title: `HP regen ${Math.round(stats.hpRegen)}`,
        lines: [
          `Restores ${Math.round(stats.hpRegen)} HP at the start of each of its own turns`,
          `Comes from Strength: +${num(a.hpRegenPerStr)} per point (now STR ${stats.str})`,
          'Nothing happens at full HP',
        ],
      };
    case 'mpRegen':
      return {
        title: `MP regen ${stats.mpRegen}`,
        lines: [
          `Restores ${stats.mpRegen} MP at the start of each of its own turns`,
          `Comes from Intelligence: +${num(a.mpRegenPerInt)} per point (now INT ${stats.int}; 0 INT = none)`,
          'Never goes above max MP',
        ],
      };
    case 'accuracy':
      return {
        title: `Accuracy ${pct(stats.accuracy)}`,
        lines: [
          `Base ${pct(a.accuracyBase)}, +${pct(a.accuracyPerLuck, 1)} per Luck`,
          'Chance to hit = your accuracy - the target evasion',
          `Can drop to 0% but never above ${pct(f.hit.max)}; applies to every damaging skill, not to heals, shields or buffs`,
        ],
      };
    case 'evasion':
      return {
        title: `Evasion ${pct(stats.evasion)}`,
        lines: [
          `Comes from Dexterity: ${a.dexPerEvasionStep} Dex = +${pct(a.evasionPerStep)} evasion (whole steps, max ${pct(a.evasionMax)})`,
          'Lowers the chance that attacks hit you (hit chance = attacker accuracy - your evasion)',
          'A dodged attack deals no damage and applies no effects',
        ],
      };
    case 'armor': {
      const r = armorReduction(stats.armor, f);
      return {
        title: `Armor ${num1(stats.armor)}`,
        lines: [
          `Reduces physical damage taken by ${pct(r, 1)}`,
          `Diminishing returns: armor / (armor + ${f.armor.k}); 50% needs ${f.armor.k} armor`,
        ],
      };
    }
    case 'magicArmor': {
      const r = armorReduction(stats.magicArmor, f);
      return {
        title: `Magic armor ${num1(stats.magicArmor)}`,
        lines: [
          stats.magicArmor > 0 ? `Reduces magic damage taken by ${pct(r, 1)}` : 'No magic armor: magic damage is not reduced',
          `Diminishing returns: armor / (armor + ${f.armor.k})`,
        ],
      };
    }
  }
}

/** Takım seçim ekranındaki class kartı için özet (İngilizce). */
export function describeClass(def: CombatantDef, skills: Record<string, SkillDef>, _f: Formulas): StatInfo {
  const s = def.stats;
  const names = def.skills.map((id) => skills[id]?.name ?? id).join(', ');
  const lines = [
    `STR ${s.str}   DEX ${s.dex}   INT ${s.int}   LUCK ${s.luck}`,
    `HP ${s.hp}   MP ${s.mp}   SPD ${s.spd}   Armor ${num1(s.armor)}${s.magicArmor > 0 ? `   Magic armor ${num1(s.magicArmor)}` : ''}   Crit ${pct(s.critChance, 1)}   ACC ${pct(s.accuracy)}   EVA ${pct(s.evasion)}`,
    ...(def.maxRage !== undefined ? [`Rage 0/${def.maxRage}: gained by damaging with skills (+${_f.rage.hitBase} to +${_f.rage.perHitCap} per hit), spent by Rage skills`] : []),
    ...(def.passive ? [`Passive - ${def.passive.name}: ${describePassive(def.passive, def.stats, _f)}`] : []),
    `Skills: ${names}`,
  ];
  return { title: def.name, lines };
}
