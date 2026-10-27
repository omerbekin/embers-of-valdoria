import { isShapeArea, RECT_CENTER_MIN, shapeBadge } from './area-shape';
import { isRatioCost, skillCostLabel } from './cost';
import { betMultipliers, betStake } from './gamble';
import { lessText, moreText, multText } from './bonus-text';
import { bonusScaleRaw } from './spec';
import { rangeEnabled, rangeLabel } from './range';
import { applySummonerScale, applySummonVariant, attributePower, outgoingDamageMult } from './stats';
import type { UrnRule, AreaDef, Attribute, CombatantDef, Element, Formulas, GlobalSkillDef, GroundDef, PassiveDef, SkillDef, SkillEffect, SkillTarget, Stats, StatusDef, ValorRules } from './types';

/** Skill'in oyuncuya gösterilen genel bilgileri (tooltip). Metinler İngilizce (oyun içi arayüz). */
export interface SkillInfo {
  name: string;
  target: string;
  /** Kısa hedef türü rozeti: Self / AoE / Single Target / Column / Random / ... */
  targetBadge: string;
  cost: string;
  cooldown: string;
  /** Savaş başında bu skill bekleme sayacıyla başlıyorsa tek satır ('Opens on cooldown: 3 turns'), yoksa boş. Yalnızca turns modunda gösterilir. */
  initialCooldown: string;
  /** Turn bedeli 1'den küçükse kısa etiket ('Half turn'); tam turn skill'de boş. (Açıklama satırı da lines içinde.) */
  turnCost: string;
  /** Menzil etiketi (range.md): 'Range 4' / 'Global'; hedef seçimi olmayan skill'de (self, all allies) boş. */
  range: string;
  /** Etki satırları: hasar ölçeği, şifa, kalkan, çağrı, menzil ve ek kurallar. */
  lines: string[];
  /** `lines` ile aynı sırada: satırın rengini belirleyen element ('shield' / 'magicShield' kalkan satırları). */
  kinds: Array<Element | 'shield' | 'magicShield' | undefined>;
}

export const TARGET_TEXT: Record<SkillTarget, string> = {
  single_enemy: 'One enemy',
  all_enemies: 'All enemies',
  area_enemies: 'Area',
  area_any: 'Area (either side)',
  single_ally: 'One ally',
  dead_ally: 'One fallen ally',
  all_allies: 'All allies',
  everyone: 'Everyone',
  random_enemies: 'Random enemies',
  self: 'Self',
  empty_tile: 'Empty cell',
};

/** Sağ üst rozet için kısa hedef türü (tooltip düzeni). */
export const TARGET_BADGE: Record<SkillTarget, string> = {
  single_enemy: 'Single Target',
  all_enemies: 'All Enemies',
  area_enemies: 'AoE',
  area_any: 'AoE (any side)',
  single_ally: 'Single Ally',
  dead_ally: 'Dead Ally',
  all_allies: 'All Allies',
  everyone: 'Everyone',
  random_enemies: 'Random',
  self: 'Self',
  empty_tile: 'Empty Cell',
};

/** Rozet metni: alan skill'inde şekil ("Row", "Column", "Block 2x3", "Cross"), rastgele skill'de hedef sayısı ("Random · 3") rozette yazar, açıklamada değil. */
export function targetBadge(skill: SkillDef): string {
  if ((skill.target === 'area_enemies' || skill.target === 'area_any') && isShapeArea(skill.area)) return shapeBadge(skill.area);
  if (skill.target === 'random_enemies') return `${TARGET_BADGE.random_enemies} · ${skill.count ?? 3}`;
  return TARGET_BADGE[skill.target];
}

/** Şekil skill'inin sade açıklaması (hedef satırı). */
function shapeText(area: AreaDef): string {
  switch (area.shape) {
    case 'row':
      return 'Hits the whole row of the target';
    case 'column':
      return 'Hits the whole column';
    case 'plus':
      return 'Hits a cross: the target and the 4 cells next to it';
    case 'x':
      return `Hits an X: the target cell and the 4 diagonal cells around it${(area.hitsAtCenter ?? 1) > 1 ? `; the center is struck ${area.hitsAtCenter} times` : ''}`;
    default: {
      // Rect anchor kuralı (area-shape.ts > rectAxisStart): boyutu 3+ olan eksende fare hücresi ortada, diğerlerinde sol-alt köşe
      const h = area.rows ?? 1; // ekranda yatay (sıra sayısı)
      const v = area.cols ?? 1; // ekranda dikey (şerit sayısı)
      if (h === 1 && v === 1) return 'Hits only the cell you aim at'; // 1x1 (D11 Radiance)
      const size = `Hits a ${h}x${v} block`;
      if (h < RECT_CENTER_MIN && v < RECT_CENTER_MIN) return `${size}; your cursor cell is its bottom-left corner`;
      const across = h >= RECT_CENTER_MIN ? 'centered left to right on your cursor cell' : 'starting at your cursor cell on the left';
      const up = v >= RECT_CENTER_MIN ? 'centered top to bottom' : 'with your cursor cell at the bottom';
      return `${size}, ${across} and ${up} (near an edge it starts at your cell or slides inside)`;
    }
  }
}

/** Aşamalı vuruşun sade açıklaması (etki satırı): 'Sweeps row by row, front row first'. Aşamasızsa boş. */
export function stageText(area: AreaDef | undefined): string {
  if (!area?.stages) return '';
  switch (area.stages) {
    case 'row':
      return `Sweeps row by row, ${area.reverse ? 'back row first' : 'front row first'}`;
    case 'column':
      return `Sweeps lane by lane, ${area.reverse ? 'bottom lane first' : 'top lane first'}`;
    case 'distance':
      return area.reverse ? 'Closes in wave by wave, outer cells first, the anchor cell last' : 'Spreads wave by wave from the anchor cell outward';
  }
}

export const ATTRIBUTE_NAME: Record<Attribute, string> = { str: 'STR', int: 'INT', dex: 'DEX', luck: 'LUCK' };
/** Hibrit ölçek (damage.bonusScale) stat adları. */
const BONUS_STAT_NAME: Record<Attribute | 'armor' | 'magicArmor', string> = { ...ATTRIBUTE_NAME, armor: 'Armor', magicArmor: 'Magic armor' };

const pct = (v: number) => `${Math.round(v * 100)}%`;
/** Mob pasif metinleri için küçük yardımcılar (describePassive). */
const turnsText = (n: number) => `${n} turn${n > 1 ? 's' : ''}`;
const cap = (id: string) => id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ');
const groundName = (id: string) => (id === 'burning' ? 'burning ground' : id.replace(/_/g, ' '));
/** Ölçekli sayı (statın gücü x oran, yuvarlanmış): tooltip satırlarındaki "(24)" ve `skillNumbers` AYNI hesaptan. */
const scaled = (stats: Stats, scale: Attribute, power: number, formulas: Formulas): number => Math.round(attributePower(stats, scale, formulas) * power);
type DamageEffect = Extract<SkillEffect, { type: 'damage' }>;
/** Hasar etkisinin sayısı; hibrit ölçekte (bonusScale) ana + ek (kartın gösterdiği statlarla; savaşta aura zırhı da eklenir). */
const damageAmount = (e: DamageEffect, stats: Stats, formulas: Formulas): number => {
  // Item affix'leri (Global / element hasarı; motorun damageSpecFor çarpanıyla aynı): çarpan yoksa ifade birebir eskisi
  const out = outgoingDamageMult(stats, e.element);
  const power = out !== 1 ? e.power * out : e.power;
  if (!e.bonusScale?.length) return scaled(stats, e.scale, power, formulas);
  const bonus = bonusScaleRaw(e.bonusScale, stats);
  return Math.round(attributePower(stats, e.scale, formulas) * power + (out !== 1 ? bonus * out : bonus) * (stats.spellPowerMult ?? 1));
};
/** Item affix çarpanlı güç (şifa / kalkan / DoT; motorla aynı): çarpan yoksa güç aynen. */
const withMult = (power: number, m: number | undefined): number => (m !== undefined && m !== 1 ? power * m : power);
/** Aynı hasar etkisi art arda tekrar ediyorsa (Double Strike: iki vuruş) tek kayıt + tekrar sayısı. */
function groupEffects(skill: SkillDef): Array<{ e: SkillEffect; times: number }> {
  const out: Array<{ e: SkillEffect; times: number }> = [];
  for (const e of skill.effects) {
    const last = out[out.length - 1];
    if (last && JSON.stringify(last.e) === JSON.stringify(e) && e.type === 'damage') last.times++;
    else out.push({ e, times: 1 });
  }
  return out;
}

/** Buff/debuff ve yer etkisi adlarını metinlere çevirmek için tanımlar (data/statuses.json, data/grounds.json). */
export interface EffectDefs {
  statuses?: Record<string, StatusDef>;
  grounds?: Record<string, GroundDef>;
}

/** Pasifin oyuncuya gösterilen açıklaması; değerler sahibinin stat'larından hesaplanır. */
export function describePassive(passive: PassiveDef, stats: Stats, formulas: Formulas): string {
  const e = passive.effect;
  const val = (scale: Attribute, power: number) => scaled(stats, scale, power, formulas);
  switch (e.type) {
    case 'rage':
      return `The lower your HP, the harder you hit: up to ${moreText(e.maxBonus)} damage at the brink of death.${e.rageOnHurt ? ` Losing HP gives Rage: ${Math.round(e.rageOnHurt.perHpPercent * 100) / 100} per 1% of your max HP lost${e.rageOnHurt.perHitCap !== undefined ? ` (at most ${e.rageOnHurt.perHitCap} per hit; shields absorbing the hit give none)` : ''}.` : ''}`;
    case 'divineLight': {
      // Crusader's Dawn (smite.dual): şifa dual kat; aynı miktar her tur en zayıf düşmana smite
      const p = e.power * (e.smite?.dual ?? 1);
      return e.smite?.dual
        ? `At the start of your turn, heal the most wounded ally and smite the weakest enemy, each for ${val(e.scale, p)} (${pct(p)} of ${ATTRIBUTE_NAME[e.scale]}). The smite lands even when no ally is wounded.`
        : `At the start of your turn, heal the most wounded ally for ${val(e.scale, e.power)} (${pct(e.power)} of ${ATTRIBUTE_NAME[e.scale]}).`;
    }
    case 'spellEcho':
      return `Damaging spells with a cooldown have a ${pct(e.chance)} chance to be ready again immediately.`;
    case 'longshot':
      return `Deal more damage the farther your target is: ${moreText(e.perRow)} at 1 row of distance, ${moreText(e.perRow * 2)} at 2, ${moreText(e.perRow * 3)} at 3 (distance = your row + their row${e.extraRows ? ` + ${e.extraRows}` : ''}).`;
    case 'naturesGrudge':
      return `When an ally hero falls (you included; summons do not count), the enemy that killed it is gripped by roots: ${e.status ? `${cap(e.status)} for ${turnsText(e.turns)} and ` : ''}${cap(e.dot)} for ${turnsText(e.dotTurns ?? e.turns)} (${val(e.scale, e.power)} damage per tick, ${pct(e.power)} of ${ATTRIBUTE_NAME[e.scale]}). A kill by damage over time or ground counts for its source. Each Druid on the team applies it.`;
    case 'soulDrain':
      return `Heal for ${pct(e.ratio)} of all damage you deal (damage dealt by your summons counts too).`;
    case 'manaOverflow':
      return `Magic damage blocked by your magic armor builds up; every ${e.threshold} blocked, your whole team gains ${e.mana} MP.`;
    case 'armorAura':
      return `You and the allies right next to you (front, back, left, right) gain bonus armor equal to ${pct(e.pct)} of your own armor (+${Math.round(stats.armor * e.pct)} now). A unit benefits from at most ${e.maxStacks} such auras.`;
    case 'bonusVsStatus': {
      const names = e.statuses.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
      const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : (names[0] ?? '');
      return `Deal ${moreText(e.bonus)} damage to targets suffering from ${list} (every hit, crits included).`;
    }
    case 'omenTransfer':
      return `Your curses leave Bad Omens on enemies; enough Omens, or running out of time, make Doom strike (see Curses in the Codex). When an enemy carrying your Omens dies, its Omens pass to the nearest enemy (at most ${e.maxOnArrival} arrive; ${e.onDoomKill > 0 ? `if Doom killed it, ${e.onDoomKill} passes; a kill by a skill that detonates Omens passes none` : "if Doom or a skill that detonates Omens killed it, it passes none"}). Passed Omens keep the time they had left and never trigger Doom. Works only while you live.`;
    // Sefer mob pasifleri (YM1-YM13; docs/design/campaign/mob-plan.md 2.2)
    case 'cutAndRun':
      return `Once per battle, the first time your HP drops below ${pct(e.below)}, you gain ${cap(e.status)} for ${turnsText(e.turns)} and a speed boost until your next turn (like Skip Turn).`;
    case 'lastEmber':
      return `If an enemy kills you with a skill, the cell it stands on becomes ${groundName(e.ground)} for ${turnsText(e.turns)} of its turns (${val(e.scale, e.power)} damage per tick). A death from ground or damage over time leaves no ember.`;
    case 'rebuke':
      return `When a melee skill hits you with physical damage, ${pct(e.ratio)} of the damage your armor blocked is dealt back to the attacker as physical damage.`;
    case 'stonePatience':
      return `At the start of your turn, if you took no damage since your last turn, gain +${e.armor} armor (up to +${e.max}). Any damage resets the bonus.`;
    case 'deepHoard':
      return `Gain bonus armor and magic armor equal to ${pct(e.mpRatio)} of your current MP (+${Math.round(stats.mp * e.mpRatio)} at full MP). Spending or losing MP thins it.`;
    case 'wardEtcher':
      return `After each skill that costs MP, the ally with the lowest armor (yourself only if alone) gains a magic shield of ${e.perMp}x the MP spent for ${turnsText(e.turns)}.`;
    case 'mireBound':
      return `While you live, ${cap(e.status)} enemies have ${multText(e.speedMult)} speed (it does not stack with other such witches).`;
    case 'flicker':
      return `When an enemy skill hits you, gain ${cap(e.status)} for ${turnsText(e.turns)}; at most once between your turns.`;
    case 'corpseHunger':
      return `Whenever any unit dies (not a summon), heal ${pct(e.ratio)} of your max HP (Wound reduces it).`;
    case 'boneWard':
      return `While a summoned ally stands on your side, you take ${lessText(e.reduce)} damage from every source.`;
    case 'martyrsVow':
      return 'Once per battle, take a killing skill hit meant for an adjacent ally (front, back, left or right) yourself; the damage is recalculated against your own armor.';
    case 'censerSmoke':
      return `You and allies in your lane (same column, every row) heal ${pct(e.ratio)} of their max HP at the start of their turns (Wound reduces it).`;
    case 'choirVessel':
      return `+${e.mpAdd} max MP. Every time an ally takes damage from an enemy skill, you gain ${e.mpPerHit} MP.`;
    // Bölge I (tutorial) mob pasifleri (YM14-YM19; mob-plan.md 9.3)
    case 'grudge':
      return `Your basic attack deals ${moreText(e.bonus)} damage to the enemy who last hit you with a skill. When another enemy hits you with a skill, the grudge moves to them.`;
    case 'headStart':
      return 'At the start of battle you gain a speed boost until your first turn (like Skip Turn), so you usually act first.';
    case 'packTactics':
      return `Deal ${moreText(e.perAlly)} damage with one other living pack member of your kind in the same row, ${moreText(e.perAlly * 2)} with two.`;
    case 'hideInBrush':
      return `While a living ally stands in front of you in your lane, your evasion is +${pct(e.evasion)}.`;
    case 'flockShield':
      return `Once per battle, the first enemy skill that hits you deals ${lessText(e.reduce)} damage: the ravens take the blow.`;
    case 'sharesOfDead':
      return `Whenever an ally dies (not a summon), gain ${cap(e.status === 'fortify' ? 'fortified' : e.status)} for ${turnsText(e.turns)}, and your damage grows until the end of battle (${moreText(e.perDeath)} after one death, ${moreText(e.perDeath * 2)} after two, and so on).`;
    // Bölge III mob / boss pasifleri (YM20-YM23; mob-plan.md 10.5)
    case 'closeRanks':
      return `You take ${lessText(e.perAlly)} damage from every source with one other living ally in your row (${lessText(e.perAlly * 2)} with a full row).`;
    case 'bloodScent':
      return `Deal ${moreText(e.bonus)} damage to targets below ${pct(e.below)} HP.`;
    case 'moltenShed':
      return `Once per battle, the first time an enemy skill drops your HP below ${pct(e.below)}, you shed your burning skin: every enemy takes ${val(e.scale, e.power)} ${e.element} damage (it cannot miss or crit; armor applies) and you gain ${cap(e.status === 'fortify' ? 'fortified' : e.status)} for ${turnsText(e.turns)}.`;
    case 'crownOfAsh':
      return `Whenever an ally dies (not a summon), gain a shield of ${pct(e.ratio)} of your max HP (${Math.round(stats.hp * e.ratio)}) for ${turnsText(e.turns)}; shields stack.`;
    // Harita 2 mob pasifleri (maps-2-3.md 3.3)
    case 'boarding':
      return `When you join the battle with a later wave or as reinforcements, you gain ${cap(e.status)} for ${turnsText(e.turns)}.`;
    case 'shell':
      return `Your armor is ${multText(e.armorMult)} until the first critical hit you take; that crit cracks the shell for the rest of the battle.`;
    case 'slick':
      return `While you stand on ${groundName(e.ground)} ground, your evasion is +${pct(e.evasion)}.`;
    case 'lure':
      return `An enemy that hits you with a skill becomes ${cap(e.status)} for ${turnsText(e.turns)} (summons do not).`;
    case 'deathlessTide':
      return `Once per battle, a killing blow taken while you stand on ${groundName(e.ground)} ground does not kill you: you rise again with ${pct(e.hpRatio)} of your max HP.`;
    case 'saltTears':
      return `At the start of your turn, every wounded ally standing on ${groundName(e.ground)} ground (you included) heals ${pct(e.ratio)} of their max HP (Wound reduces it).`;
    case 'undertow':
      return `Your skills that hit an enemy standing on ${groundName(e.ground)} ground also inflict ${cap(e.status)} for ${turnsText(e.turns)}.`;
  }
}

/** Global skill'in (Rest / Skip Turn / Move) oyuncuya gösterilen bilgisi; sayılar data/global-skills.json'dan. Metinler İngilizce. */
export interface GlobalSkillInfo {
  id: string;
  name: string;
  icon: string;
  /** Hedef türü metni ve rozeti ('Self' / 'Empty cell'). */
  target: string;
  targetBadge: string;
  /** Hep bedelsiz: 'Free'. */
  cost: string;
  /** Kısa özet (data'daki text). */
  summary: string;
  lines: string[];
  /** Yalnızca turns modunda kullanılabilir mi (Skip Turn). */
  turnsOnly: boolean;
}

export function describeGlobalSkill(def: GlobalSkillDef, _formulas?: Formulas, valor?: ValorRules, urn?: { rule: UrnRule; left: number } | null, statusDefs?: Record<string, StatusDef>): GlobalSkillInfo {
  const lines: string[] = [];
  if (def.kind === 'urn') {
    // M-N3 Tidewater Urn: sayılar savaşın Urn kuralından (battle-rules.json > devices)
    const r = urn?.rule;
    lines.push(
      'Only a hero standing next to the urn (in front, behind, above or below it) can use it',
      `Floods one row of your side for ${r?.rounds ?? 2} turns: everyone there is Soaked and Burning Ground there goes out`,
      'Uses your turn',
      `${urn ? urn.left : (r?.uses ?? 3)} of ${r?.uses ?? 3} uses left`,
    );
    return { id: def.id, name: def.name, icon: def.icon, target: 'A row of your side', targetBadge: 'Row', cost: 'Free', summary: def.text, lines, turnsOnly: false };
  }
  if (def.kind === 'surge') {
    // Crown Surge (map2-quests-surge.md C1): sayılar veriden (durum çarpanı statuses.json, kalkan oranı global-skills.json)
    const st = def.status ? statusDefs?.[def.status] : undefined;
    const mult = st?.damageDealtMult;
    if (mult !== undefined && (def.turns ?? 0) > 0) lines.push(`Your whole party deals ×${Math.round(mult * 100) / 100} damage for each hero's next ${def.turns} turns`);
    if ((def.shieldRatio ?? 0) > 0) lines.push(`Every ally gains a shield of ${pct(def.shieldRatio!)} of their max HP for ${def.shieldTurns ?? 1} turns`);
    lines.push('Uses your turn', 'One Crown Surge per battle');
    return { id: def.id, name: def.name, icon: def.icon, target: 'Your whole party', targetBadge: 'Party', cost: 'Ashen Taint', summary: def.text, lines, turnsOnly: false };
  }
  if (def.kind === 'valor') {
    const r = valor?.revive;
    lines.push(
      `Costs ${r?.battleCost ?? 0} Valor`,
      `A fallen ally rises with ${pct(r?.hpRatio ?? 0.5)} HP${r && r.mpRatio > 0 ? ` and ${pct(r.mpRatio)} MP` : ''}, on the cell where they fell (or the nearest empty cell)`,
      'Uses your turn',
      `Valor is earned by winning battles; outside battle a revive costs only ${r?.outsideCost ?? 0}`,
    );
    return { id: def.id, name: def.name, icon: def.icon, target: TARGET_TEXT.dead_ally, targetBadge: TARGET_BADGE.dead_ally, cost: `${r?.battleCost ?? 0} Valor`, summary: def.text, lines, turnsOnly: false };
  }
  if (def.kind === 'rest') {
    lines.push(`Restores ${def.mp ?? 0} MP (never above your maximum)`, 'Ends your turn');
  } else if (def.kind === 'skip') {
    const bonus = def.speedBonus ?? 1;
    lines.push(
      `Pass the turn: +${pct(bonus)} speed until your next turn${bonus === 1 ? ' (the speed meter fills twice as fast)' : ''}`,
      'Enemies can still act in between',
      'Cooldowns, regeneration and effects tick as usual',
      `At most ${def.maxConsecutive ?? 1} in a row`,
      'Turn mode only',
    );
  } else {
    lines.push(
      'Move to an empty cell of your own side (a cell with no living unit) and end your turn',
      'Your row decides who can hit you in melee and whether you can use melee skills',
      'Auras, side neighbors and taunt/guard follow your new cell',
    );
  }
  return {
    id: def.id,
    name: def.name,
    icon: def.icon,
    target: TARGET_TEXT[def.target === 'empty_tile' ? 'empty_tile' : 'self'],
    targetBadge: TARGET_BADGE[def.target === 'empty_tile' ? 'empty_tile' : 'self'],
    cost: 'Free',
    summary: def.text,
    lines,
    turnsOnly: !!def.turnsOnly,
  };
}

/** Rage kaynağının açıklaması (class kartı, tooltip ve wiki): kazanç formülü ve üst sınır formulas.json > rage'den. */
export function describeRage(f: Formulas): string[] {
  const r = f.rage;
  const n = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100));
  return [
    `Rage: a bar from 0 to ${r.max}; you start every battle with 0`,
    `Every damaging hit that lands with a skill gives ${n(r.hitBase)} Rage plus ${n(r.perHpPercent)} per 1% of the target's max HP it takes (at most ${n(r.perHitCap)} per hit)`,
    `A skill that hits several targets gives the Rage of the best single target, never more than ${n(r.perCastCap)} per cast`,
    'Rage never fades; skills that cost Rage need enough of it',
    'Damage you take gives Rage only through a passive that says so (Berserker)',
  ];
}

/** `ownerRange`: skill sahibinin (sınıf/mob/çağrı) taban menzili (CombatantDef.range); verilmezse skill `range` ya da varsayılan. */
/** Çağrının bu çağıranla (statları) tanımı: summonerScale varsa çağıranın item hariç temel statından türer (motorla aynı: applySummonerScale). */
function summonUnitFor(unit: CombatantDef | undefined, stats: Stats, formulas: Formulas): CombatantDef | undefined {
  if (!unit?.summonerScale) return unit;
  const base = stats.summonBase ?? { str: stats.str, int: stats.int, dex: stats.dex, luck: stats.luck };
  return applySummonerScale(unit, base, formulas);
}

export function describeSkill(skill: SkillDef, stats: Stats, formulas: Formulas, units: Record<string, CombatantDef> = {}, defs: EffectDefs = {}, ownerRange?: number): SkillInfo {
  const lines: string[] = [];
  const kinds: SkillInfo['kinds'] = [];
  const add = (text: string, kind?: SkillInfo['kinds'][number]) => {
    lines.push(text);
    kinds.push(kind);
  };
  const range = rangeLabel(skill, ownerRange, formulas);
  // Aynı etki art arda tekrar ediyorsa (Double Strike: iki vuruş) tek satır + 'x2'
  for (const { e, times } of groupEffects(skill)) {
    const who = skill.target === 'area_any' ? (e.side === 'allies' ? ' (on your side: allies)' : e.side === 'enemies' ? ' (on the enemy side: enemies)' : '') : skill.target === 'everyone' ? ((e.side ?? (e.type === 'heal' || e.type === 'hot' || e.type === 'shield' || e.type === 'guard' ? 'allies' : 'enemies')) === 'allies' ? ' (allies)' : ' (enemies)') : '';
    const raw = (scale: Attribute, power: number) => scaled(stats, scale, power, formulas);
    if (e.type === 'damage') {
      const element = e.element ?? 'physical';
      if (e.bonusScale?.length) {
        // Hibrit ölçek: "Damage 36% STR + 25% Armor (12)"; sayı = ana + ek (kartın gösterdiği statlarla; savaşta aura zırhı da eklenir)
        const parts = e.bonusScale.map((b) => `${pct(b.pct)} ${BONUS_STAT_NAME[b.stat]}`).join(' + ');
        const total = damageAmount(e, stats, formulas);
        add(`Damage ${pct(e.power)} ${ATTRIBUTE_NAME[e.scale]} + ${parts} (${total})${times > 1 ? ` x${times}` : ''}${who}`, element);
        if (e.bonusScale.some((b) => b.stat === 'armor')) add('Uses your current armor, aura bonus included');
      } else add(`Damage ${pct(e.power)} ${ATTRIBUTE_NAME[e.scale]} (${damageAmount(e, stats, formulas)})${times > 1 ? ` x${times}` : ''}${who}`, element);
      if (e.ignoreDefense) add(`Ignores ${pct(e.ignoreDefense)} of armor`);
      if (e.lifesteal) add(`Heals you for ${pct(e.lifesteal)} of damage dealt`);
      if (e.bonusVsTag) add(`${multText(e.bonusVsTag.multiplier)} damage vs ${e.bonusVsTag.tag}`);
      if (e.bonusVsStatus) add(`${multText(e.bonusVsStatus.multiplier)} damage against ${cap(e.bonusVsStatus.status)} targets`);
      if (e.falloff) add(`Each target hit takes ${multText(e.falloff)} the damage of the previous one`);
      // Headsman's Blow: harcanan Rage ve hedefin eksik canı (spec.ts > damageSpecFor ile aynı formül)
      if (e.powerPerRage) {
        const lo = skill.cost.resource === 'rage' ? skill.cost.amount : 0;
        const hi = skill.cost.resource === 'rage' ? formulas.rage.max : 0;
        const at = (r: number) => damageAmount({ ...e, power: e.power + e.powerPerRage! * r }, stats, formulas);
        add(`+${pct(e.powerPerRage)} ${ATTRIBUTE_NAME[e.scale]} per Rage spent${hi > lo ? ` (${at(lo)} at ${lo} Rage, ${at(hi)} at ${hi} Rage)` : ''}`, element);
      }
      if (e.executeBonus) add(`Hits harder the more HP the target is missing: up to ${moreText(e.executeBonus)} damage against a nearly dead target`, element);
      if (e.bonusPerMissingMana) add(`+${e.bonusPerMissingMana} per missing mana of the target`, element);
      if (e.repeatChance) add(`${pct(e.repeatChance)} chance to hit twice`, element);
      if (e.critBonus && !e.guaranteedCrit) add(`+${pct(e.critBonus)} crit chance`, element);
      if (e.bet) {
        const b = e.bet;
        const stake = betStake(b, stats.hp, stats.hp, Math.max(0, stats.mp - (skill.cost.resource === 'mp' ? skill.cost.amount : 0)));
        const m = betMultipliers(b, stake);
        const what0 = b.resource === 'hp' ? `${pct(b.ratio)} of your max HP (${stake})` : b.ratio >= 1 ? 'all your remaining MP' : `${pct(b.ratio)} of your remaining MP`;
        // Mortgage (skill ağacı, bet.hpStake): ek can bahsi, kazançta MP sayılır
        const what = b.resource === 'mp' && (b.hpStake ?? 0) > 0 ? `${what0} plus ${pct(b.hpStake!)} of your max HP (counts as MP)` : what0;
        const win = b.perStake ? `${multText(Number(b.winMult.toFixed(1)))} damage, +${b.perStake} per ${b.resource.toUpperCase()} bet` : `${multText(Number(m.win.toFixed(1)))} damage`;
        const lose = m.lose <= 0 ? 'you miss' : `${multText(Number(m.lose.toFixed(1)))} damage`;
        add(`Bet ${what}: ${pct(b.winChance)} chance for ${win}; otherwise ${lose} and you lose the bet`, element);
      }
      if (e.bonusFromShield) add(`+${pct(e.bonusFromShield.ratio)} of your shield${e.bonusFromShield.consume ? ' (consumed)' : ''}`, element);
    } else if (e.type === 'heal') {
      add(`Heal ${pct(e.power)} ${ATTRIBUTE_NAME[e.scale]} (${raw(e.scale, withMult(e.power, stats.healPowerMult))})${who}`);
      if (e.missingHpBonus) add(`Heals more the lower the ally's health: up to ${moreText(e.missingHpBonus)}`);
    } else if (e.type === 'revive') {
      add(`Choose a fallen ally, then choose an empty cell on your side: it rises there with ${pct(e.hpRatio)} HP and ${pct(e.mpRatio)} MP (even if something now stands on its corpse)`);
      add('Needs at least one empty cell on your side; the revived ally starts with an empty turn bar');
      if (e.regen && e.regen.turns > 0 && e.regen.ratio > 0) add(`Then regenerates ${pct(e.regen.ratio)} of its max HP at the start of each of its next ${e.regen.turns} turns`);
    } else if (e.type === 'hot') {
      add(`Heal ${raw(e.scale, withMult(e.power, stats.healPowerMult))} per turn for ${e.turns} turns`);
    } else if (e.type === 'shield') {
      const magic = e.shieldType === 'magic';
      add(`${magic ? 'Magic shield' : 'Shield'} ${pct(e.power)} ${ATTRIBUTE_NAME[e.scale]} (${raw(e.scale, withMult(e.power, stats.shieldPowerMult))})${e.self ? ' on you' : ''}`, magic ? 'magicShield' : 'shield');
      if (e.bonusPerMana) add(`+${e.bonusPerMana} per MP left after casting`, magic ? 'magicShield' : 'shield');
      const hook = e.onAbsorb;
      if (hook?.burnMana) add(`Every hit the shield absorbs burns ${hook.burnMana} MP from the attacker`, magic ? 'magicShield' : 'shield');
      if (hook?.dispelChance) add(`Every hit the shield absorbs has a ${pct(hook.dispelChance)} chance to remove a random buff from the attacker`, magic ? 'magicShield' : 'shield');
      if (hook?.giveMana) add(`Every hit the shield absorbs gives the shielded unit ${hook.giveMana} MP`, magic ? 'magicShield' : 'shield');
      if (hook?.burnMana || hook?.dispelChance) add('Only direct attacks trigger it (not ground effects)');
    } else if (e.type === 'summon') {
      // Çağrı çağıranla büyür (Ömer 2026-10-18): statlar çağıranın item hariç temel statından (Stats.summonBase ?? kendi statları)
      const unit = summonUnitFor(units[e.unit], stats, formulas);
      const life = e.lifespan ? ` for ${e.lifespan} turns` : '';
      if (e.consumeCorpse && unit) {
        // Ceset tüketen çağrı (Raise Dead): iki hâlin can ve hasar statı veriden (applySummonVariant)
        const fed = applySummonVariant(unit, 'fed', formulas);
        const unfed = applySummonVariant(unit, 'unfed', formulas);
        const statOf = (d: CombatantDef) => (d.stats.int > d.stats.str ? `INT ${Math.round(d.stats.int)}` : `STR ${Math.round(d.stats.str)}`); // unfed çarpanı kesirli stat üretir (34.8000…4)
        const boost = unfed.stats.hp > 0 ? Math.round(((fed.stats.hp / unfed.stats.hp - 1) * 100) / 5) * 5 : 0;
        add(`Choose a fallen foe to consume, then choose where the ${unit.name} rises (on your side${life}). The consumed corpse can no longer be revived and the ${unit.name} is empowered (+${boost}%). With no fallen foe, you only choose the cell.`);
        add(`Empowered: HP ${fed.stats.hp}, ${statOf(fed)} · Without a corpse: HP ${unfed.stats.hp}, ${statOf(unfed)}`);
      } else {
        add(unit ? `Summons ${unit.name} (HP ${unit.stats.hp})${life}` : `Summons ${e.unit}${life}`);
      }
      const sc = unit?.summonerScale;
      if (unit && sc) {
        const key = (Object.keys(sc.attributes) as Attribute[])[0];
        const what = key ? `${ATTRIBUTE_NAME[key]} and HP` : 'HP';
        add(`The ${unit.name} grows with you: its ${what} come from your ${ATTRIBUTE_NAME[sc.from]} (items not counted) and it has your level`);
      }
    } else if (e.type === 'manaBurn') {
      // Madde 260: sabit miktar ya da hedefin maks MP'sinin yüzdesi (pctMax)
      const what = e.pctMax !== undefined ? `${e.amount ? `${e.amount} MP + ` : ''}${pct(e.pctMax)} of each target's max MP` : `${e.amount ?? 0} MP`;
      const onHit = skill.effects.some((x) => x.type === 'damage') ? ' on hit (none if the attack misses)' : '';
      add(e.gainRatio ? `Steals ${what}${onHit}: you gain ${pct(e.gainRatio)} of it` : `Burns ${what}${onHit}`);
      const em = e.onEmpty;
      if (em) {
        const def = defs.statuses?.[em.status];
        const d = em.damage;
        const el = d?.element ?? 'physical';
        add(`Each target left with 0 MP (or already at 0) has a ${pct(em.chance)} chance (rolled separately) to be ${def?.name ?? em.status} for ${em.turns} turn${em.turns > 1 ? 's' : ''}${def ? ` (${def.text})` : ''}${d ? ` and take ${pct(d.power)} ${ATTRIBUTE_NAME[d.scale]} (${raw(d.scale, withMult(d.power, outgoingDamageMult(stats, d.element)))}) ${el} damage; it cannot miss but can crit` : ''}`, el);
      }
    } else if (e.type === 'taunt') {
      add(`Taunt ${e.turns} turns: enemies must target you${e.breakRatio ? ` (ends after losing ${pct(e.breakRatio)} HP)` : ''}`);
      const cc = Object.values(defs.statuses ?? {}).filter((d) => d.breaksTaunt).map((d) => d.name);
      if (cc.length > 0) add(`Ends at once if you get ${cc.join(' or ')}`);
      if (e.allyDamageMult !== undefined) add(`Your allies take ${multText(e.allyDamageMult)} damage while it lasts`);
    } else if (e.type === 'status') {
      const def = defs.statuses?.[e.status];
      const how = e.cause === 'vines' ? ' (rooted by vines)' : '';
      if (e.chance !== undefined && e.chance < 1) add(`${pct(e.chance)} chance per target hit (rolled separately) to apply ${def?.name ?? e.status} for ${e.turns} turn${e.turns > 1 ? 's' : ''}${how}${def ? `: ${def.text}` : ''}`, undefined);
      else add(`${e.self ? 'You gain' : 'Applies'} ${def?.name ?? e.status}${skill.target === 'area_any' ? who : ''} for ${e.turns} turn${e.turns > 1 ? 's' : ''}${how}${def ? `: ${def.text}` : ''}`, undefined);
    } else if (e.type === 'randomStatus') {
      const total = e.options.reduce((a, o) => a + o.weight, 0);
      add(`Random effect on each target hit: ${e.options.map((o) => `${defs.statuses?.[o.status]?.name ?? o.status} ${o.turns} turn${o.turns > 1 ? 's' : ''} (${pct(o.weight / total)})`).join(', ')}`);
    } else if (e.type === 'ground') {
      const g = defs.grounds?.[e.ground];
      // D11 (Holy Ground): şifa zemini; area_any'de yalnızca kendi tarafına atılınca kalır
      if (g?.heal) add(`Leaves ${g.name} on the area${skill.target === 'area_any' ? (e.side === 'enemies' ? ' (enemy side only)' : ' (your side only)') : ''} for ${e.turns} turns: ${pct(e.power)} ${ATTRIBUTE_NAME[e.scale]} (${raw(e.scale, e.power)}) healing at the start of each ally turn there`);
      // area_any (Judgment 2026-10-24): hasar zemini yalnızca kendi `side` tarafına atılınca kalır
      // gücü 0 olan zemin (Harita 2 Flooded suyu): hasarsız, yalnızca zemin
      else if (e.power <= 0) add(`Leaves ${g?.name ?? e.ground} on ${skill.target === 'single_enemy' ? "the target's cell" : 'the area'} for ${e.turns} turns (no damage)`);
      else add(`Leaves ${g?.name ?? e.ground} on ${skill.target === 'single_enemy' ? "the target's cell" : 'the area'}${skill.target === 'area_any' ? (e.side === 'allies' ? ' (your side only)' : ' (enemy side only)') : ''} for ${e.turns} turns (damage over time): ${pct(e.power)} ${ATTRIBUTE_NAME[e.scale]} (${raw(e.scale, e.power)}) damage at the start of each enemy turn there`, g?.element);
    } else if (e.type === 'selfDamage') {
      add(`Costs you ${pct(e.ratio)} of your max HP`);
    } else if (e.type === 'guard') {
      if (skill.splash?.pattern === 'row') add(`Guard ${e.turns} turns: allies in the chosen row pass ${pct(e.share)} of the damage they take to you`);
      else add(`Guard ${e.turns} turns: take ${pct(e.share)} of the damage ally takes`);
      if (skill.excludeSelf) add('Cannot target yourself');
    } else if (e.type === 'dispel') {
      const names = Object.values(defs.statuses ?? {}).filter((d) => d.type === e.status && d.dispellable !== false).map((d) => d.name);
      const what = e.status === 'debuff' ? 'debuff' : 'buff';
      add(`${e.count ? `Removes the ${e.count} longest-lasting ${what}${e.count > 1 ? 's' : ''}` : `Removes every ${what}`} from the target${names.length ? ` (${names.join(', ')})` : ''}`);
    } else if (e.type === 'omen') {
      const kind = e.status ?? 'omen';
      const def = defs.statuses?.[kind];
      const name = def?.name ?? 'Bad Omen';
      const crit = e.critStacks !== undefined && e.critStacks !== e.stacks ? ` (${e.critStacks} on a critical hit)` : '';
      add(`Adds ${e.stacks} ${name}${crit} to every enemy hit`, 'dark');
      // Yalnızca sayı satırı (Gear'daki "Doom / Omen" sayısı tooltip'te de görünsün); Doom / zamanlayıcı / boss kuralları Codex 'Curses' makalesinde
      const doom = defs.statuses?.[kind]?.doom;
      const maxStacks = defs.statuses?.[kind]?.maxStacks;
      if (doom && maxStacks && !skill.effects.some((x) => x.type === 'detonate' && x.status === kind)) add(`Doom at ${maxStacks} Omens: ${pct(doom.powerPerStack)} ${ATTRIBUTE_NAME[doom.scale]} (${raw(doom.scale, doom.powerPerStack)}) ${doom.element} damage per Omen`, doom.element);
      // Doom / zamanlayıcı / boss kuralları skill'de değil Codex 'Curses' makalesinde
    } else if (e.type === 'detonate') {
      const def = defs.statuses?.[e.status];
      const doom = def?.doom;
      if (doom) add(`Then Doom strikes at once with every Omen on the target, ${multText(e.mult)}: ${pct(doom.powerPerStack * e.mult)} ${ATTRIBUTE_NAME[doom.scale]} (${raw(doom.scale, doom.powerPerStack * e.mult)}) ${doom.element} damage per Omen; it cannot miss but can crit`, doom.element);
      else add(`Detonates ${e.status} ${multText(e.mult)}`);
      add('On a miss nothing happens: the Omens stay');
      if (e.noTransferOnKill) add('Every Omen on the target is spent; if this kills it, nothing passes on (Ill Omen does not trigger)');
    } else if (e.type === 'dot') {
      const def = defs.statuses?.[e.status];
      add(`Damage over time: ${def?.name ?? e.status} for ${e.turns} turns: ${pct(e.power)} ${ATTRIBUTE_NAME[e.scale]} (${raw(e.scale, withMult(e.power, stats.dotPowerMult))}) ${def?.dot?.element ?? ''} damage at the start of each of its turns (cannot miss or crit; recasting renews it)`.replace('  ', ' '), def?.dot?.element);
    } else if (e.type === 'bond') {
      const name = defs.statuses?.dark_bond?.name ?? 'Dark Bond';
      add(`${name} for ${e.turns} of your turns: whenever you heal from life steal, the bonded ally heals ${e.ratio === 1 ? 'the same amount' : `${pct(e.ratio)} of it`} (you still heal fully; at full HP you steal nothing, so nothing is shared)`);
      add('One bond at a time: a new bond breaks the old one; it ends if either of you falls');
      if (skill.excludeSelf) add('Cannot target yourself');
    }
  }
  // Boss skill kuralları (The Bridge Warden): çekme, telgraf (gecikmeli saldırı), faz ve yardımcı şartları
  for (const e of skill.effects) {
    if (e.type !== 'pull') continue;
    // M-N2 Boarding Hook (frontRow): yalnız ön sıra hücresine; doluysa çekme yok; elit / boss çekilmez
    if (e.to === 'frontRow') add("Drags the target to the front row of its own lane; if that cell is taken, the target stays put. Elites and bosses cannot be pulled");
    else if (e.to === 'stepForward') add('Drags the target one row forward if the cell in front of it is free');
    else add('Drags the target to the front-most empty cell of its own lane');
    break;
  }
  const tg = skill.telegraph;
  if (tg) {
    if (tg.kind === 'brand') add(`Delayed: brands the target now; at the start of your next turn the brand bursts on the branded unit and everyone right next to it (${tg.area?.shape === 'plus' ? 'a cross around it' : 'around it'}). Dispel or death removes it`);
    else if (tg.wholeBoard) add(tg.keystones ? `Delayed: cracks the whole enemy board except ${tg.keystones.perLane} Keystone cell per lane; it collapses at the start of your next turn` : 'Delayed: marks the whole enemy board, with no safe cell; it lands at the start of your next turn');
    else add('Delayed: marks the cells now; they collapse at the start of your next turn');
    add('Every enemy gets at least one turn before it lands; it cannot miss. One area warning and one brand at a time, at most one new warning per turn');
  }
  for (const [ph, area] of Object.entries(skill.areaByPhase ?? {})) add(`From phase ${ph}: ${shapeText(area).replace(/^Hits/, 'hits').replace(/; your cursor cell.*$/, '')}`);
  if (skill.minPhase && skill.minPhase > 1) add(`Only from phase ${skill.minPhase}`);
  if (skill.requiresAlly) add(`Needs a standing ${units[skill.requiresAlly]?.name ?? skill.requiresAlly}`);
  const turnCost = skill.turnCost !== undefined && skill.turnCost > 0 && skill.turnCost < 1 ? skill.turnCost : 1;
  if (turnCost < 1) add(turnCost === 0.5 ? 'Takes half a turn: your next turn comes in half the usual time' : `Takes ${pct(turnCost)} of a turn: your next turn comes sooner`);
  const waves = skill.target === 'area_enemies' || skill.target === 'area_any' ? stageText(skill.area) : '';
  if (waves) add(waves);
  if (skill.splash?.pattern === 'chain' && skill.target === 'single_enemy') {
    add(`Then jumps from foe to foe: each jump goes to the nearest foe not yet hit, up to ${skill.splash.jumps ?? 0} jumps (jumps ignore range)`);
  } else if (skill.splash?.pattern === 'lane' && skill.target === 'single_enemy') {
    add(`Also pierces every unit behind the target in its lane for ${pct(skill.splash.mult ?? 1)} damage`);
  } else if (skill.splash && skill.target === 'single_enemy') add(`Also hits the units beside the target (the neighbors above and below it on screen) for ${pct(skill.splash.mult ?? 1)} damage`, 'physical');
  if ((skill.target === 'area_enemies' || skill.target === 'area_any') && (skill.area?.hitsAtCenter ?? 1) > 1 && skill.area?.shape !== 'x') add(`The unit on the anchor cell is hit ${skill.area!.hitsAtCenter} times (each hit rolls on its own)`);
  // Ömer 2026-10-24 (open-questions 416/9): area_any + emptyOwn (Judgment): kendi tarafında boş hücreye de atılabilir
  if (skill.target === 'area_any' && skill.area?.emptyOwn) add('Can also be cast on an empty cell on your side: it then only leaves the ground there');
  if (skill.area?.shape === 'x' && (skill.area.hitsAtCenter ?? 1) > 1) add(`The blade crosses the center twice: the unit on the anchor cell is hit ${skill.area.hitsAtCenter} times, each hit rolls on its own`);
  if (skill.effects.some((e) => e.type === 'damage' && e.guaranteedCrit)) add(`Always a critical hit (${multText(formulas.attributes.critMult)}); it can still miss`, 'physical');
  if (skill.requiresOpenBehind) add('Only targets with an empty cell right behind them (a living unit there blocks it; a corpse does not); never a unit in the back row');
  if (rangeEnabled(formulas)) {
    // Menzil (range.md, range.ts): kart satırı; menzil kapalıyken eski melee satırı
  } else if (skill.motion === 'melee' && skill.target !== 'self') add(skill.requiresOpenBehind ? 'Slips behind any enemy, strikes, and returns' : skill.ignoreReach ? 'Charges at any enemy' : skill.reach ? `Melee: front ${skill.reach + 1} rows only (reach +${skill.reach})` : 'Melee: front row only');
  if (skill.advanceToFront) add('If you are not in the front row, you then step into the front row: the front cell of your own lane, or the nearest empty front cell if that one is taken (you stay put if the front row is full)');
  // Oranlı bedel (Wail of the Dead: mevcut canın %20'si): açıklama satırı; başlık skillCostLabel
  // Bedelin kendisi başlıkta (skillCostLabel: "All RAGE (min 30)" / "20% of current HP"); satırda yalnızca başlıkta olmayan kural
  if (!skill.cost.spendAll && isRatioCost(skill.cost)) add(`Rounded, at least 1${skill.cost.resource === 'hp' ? '; it can never bring you below 1 HP' : ''}`);
  if (skill.note) add(skill.note); // serbest not (Pose Tester: oynattığı poz)
  const initialTurns = Math.min(formulas.cooldown?.maxInitial ?? 0, Math.floor(skill.initialCooldown ?? 0));
  return {
    name: skill.name,
    target: (skill.target === 'area_enemies' || skill.target === 'area_any') && isShapeArea(skill.area) ? shapeText(skill.area) : skill.target === 'random_enemies' ? `${skill.count ?? 3} random enemies` : TARGET_TEXT[skill.target],
    targetBadge: targetBadge(skill),
    cost: skillCostLabel(skill.cost),
    cooldown: (skill.cooldown ?? 0) > 0 ? `${skill.cooldown} turns` : 'None',
    initialCooldown: initialTurns > 0 ? `Opens on cooldown: ${initialTurns} turn${initialTurns > 1 ? 's' : ''}` : '',
    turnCost: turnCost < 1 ? (turnCost === 0.5 ? 'Half turn' : `${pct(turnCost)} turn`) : '',
    range,
    lines,
    kinds,
  };
}

/**
 * Skill'in hesaplanan anahtar sayısı (Gear ekranı skill listesi ve item karşılaştırması). `scaled` sayılar statlarla değişir ve tooltip
 * satırındaki parantezli sayıyla AYNI hesaptır (`describeSkill` aynı yardımcıları kullanır; tests/gear-skills.test.ts denetler); diğerleri
 * (durum şansı / süresi) sabittir.
 */
export interface SkillNumber {
  label: string;
  /** Gösterilen değer ('24', '30%', '2 turns'). */
  text: string;
  /** Sayısal değer (scaled sayılarda). */
  value?: number;
  /** Statlarla ölçeklenir mi (karşılaştırmada fark yalnızca bunlarda). */
  scaled: boolean;
  /** Aynı vuruş art arda (Double Strike x2). */
  times?: number;
  /** Renk ipucu: element, kalkan ya da şifa. */
  kind?: Element | 'shield' | 'magicShield' | 'heal';
}

/** Skill'in anahtar sayıları (describeSkill ile aynı etki sırası ve hesap). */
export function skillNumbers(skill: SkillDef, stats: Stats, formulas: Formulas, defs: EffectDefs = {}, units: Record<string, CombatantDef> = {}): SkillNumber[] {
  const out: SkillNumber[] = [];
  const num = (label: string, value: number, kind?: SkillNumber['kind'], times = 1): void => {
    out.push({ label, text: String(value), value, scaled: true, ...(times > 1 ? { times } : {}), ...(kind ? { kind } : {}) });
  };
  const turnsText = (n: number) => `${n} turn${n > 1 ? 's' : ''}`;
  const fixed = (label: string, text: string): void => {
    out.push({ label, text, scaled: false });
  };
  const raw = (scale: Attribute, power: number) => scaled(stats, scale, power, formulas);
  for (const { e, times } of groupEffects(skill)) {
    if (e.type === 'damage') num('Damage', damageAmount(e, stats, formulas), e.element ?? 'physical', times);
    else if (e.type === 'heal') num('Heal', raw(e.scale, withMult(e.power, stats.healPowerMult)), 'heal');
    else if (e.type === 'hot') num('Heal / turn', raw(e.scale, withMult(e.power, stats.healPowerMult)), 'heal');
    else if (e.type === 'shield') num(e.shieldType === 'magic' ? 'Magic shield' : 'Shield', raw(e.scale, withMult(e.power, stats.shieldPowerMult)), e.shieldType === 'magic' ? 'magicShield' : 'shield');
    else if (e.type === 'manaBurn' && e.onEmpty?.damage) num('Damage at 0 MP', raw(e.onEmpty.damage.scale, withMult(e.onEmpty.damage.power, outgoingDamageMult(stats, e.onEmpty.damage.element))), e.onEmpty.damage.element ?? 'physical');
    else if (e.type === 'ground' && e.power > 0) num(`${defs.grounds?.[e.ground]?.name ?? 'Ground'} / turn`, raw(e.scale, e.power), defs.grounds?.[e.ground]?.heal ? 'heal' : defs.grounds?.[e.ground]?.element);
    else if (e.type === 'dot') {
      const def = defs.statuses?.[e.status];
      num(`${def?.name ?? e.status} / turn`, raw(e.scale, withMult(e.power, stats.dotPowerMult)), def?.dot?.element);
    } else if (e.type === 'omen') {
      const def = defs.statuses?.[e.status ?? 'omen'];
      const detonates = skill.effects.some((x) => x.type === 'detonate' && x.status === (e.status ?? 'omen'));
      if (def?.doom && def.maxStacks && !detonates) num('Doom / Omen', raw(def.doom.scale, def.doom.powerPerStack), def.doom.element);
    } else if (e.type === 'detonate') {
      const doom = defs.statuses?.[e.status]?.doom;
      if (doom) num('Doom / Omen', raw(doom.scale, doom.powerPerStack * e.mult), doom.element);
    } else if (e.type === 'status') {
      const def = defs.statuses?.[e.status];
      const name = def?.name ?? e.status;
      fixed(name, e.chance !== undefined && e.chance < 1 ? `${pct(e.chance)}, ${turnsText(e.turns)}` : turnsText(e.turns));
    } else if (e.type === 'taunt') fixed('Taunt', turnsText(e.turns));
    else if (e.type === 'guard') fixed('Guard', turnsText(e.turns));
    else if (e.type === 'bond') fixed(defs.statuses?.dark_bond?.name ?? 'Dark Bond', turnsText(e.turns));
    else if (e.type === 'revive') fixed('Revives with', `${pct(e.hpRatio)} HP`);
    else if (e.type === 'summon' && units[e.unit]) {
      const unit = summonUnitFor(units[e.unit], stats, formulas)!;
      fixed(`${unit.name} HP`, String(unit.stats.hp));
    }
  }
  return out;
}

/** Pasifin anahtar sayıları (describePassive ile aynı hesap). */
export function passiveNumbers(passive: PassiveDef, stats: Stats, formulas: Formulas): SkillNumber[] {
  const e = passive.effect;
  const num = (label: string, value: number, kind?: SkillNumber['kind']): SkillNumber[] => [{ label, text: String(value), value, scaled: true, ...(kind ? { kind } : {}) }];
  const fixed = (label: string, text: string): SkillNumber[] => [{ label, text, scaled: false }];
  switch (e.type) {
    case 'divineLight': {
      const v = scaled(stats, e.scale, e.power * (e.smite?.dual ?? 1), formulas);
      return e.smite?.dual ? [...num('Heal', v, 'heal'), ...num('Smite', v)] : num('Heal', v, 'heal');
    }
    case 'naturesGrudge':
      return [...num(`${cap(e.dot)} per tick`, scaled(stats, e.scale, e.power, formulas)), ...fixed('Duration', turnsText(e.turns))];
    case 'armorAura':
      return num('Armor aura', Math.round(stats.armor * e.pct), 'shield');
    case 'rage':
      return e.rageOnHurt ? [...fixed('Max bonus', moreText(e.maxBonus)), ...fixed('Rage per 1% HP lost', String(Math.round(e.rageOnHurt.perHpPercent * 100) / 100))] : fixed('Max bonus', moreText(e.maxBonus));
    case 'spellEcho':
      return fixed('Chance', pct(e.chance));
    case 'longshot':
      return fixed('Per row', moreText(e.perRow));
    case 'soulDrain':
      return fixed('Life steal', pct(e.ratio));
    case 'bonusVsStatus':
      return fixed('Bonus', moreText(e.bonus));
    case 'manaOverflow':
      return fixed(`Team MP per ${e.threshold} blocked`, `+${e.mana}`);
    case 'omenTransfer':
      return fixed('Omens passed', `up to ${e.maxOnArrival}`);
    case 'cutAndRun':
      return fixed('Below', pct(e.below));
    case 'rebuke':
      return fixed('Reflected', pct(e.ratio));
    case 'stonePatience':
      return fixed('Armor per turn', `+${e.armor} (max +${e.max})`);
    case 'deepHoard':
      return num('Armor at full MP', Math.round(stats.mp * e.mpRatio), 'shield');
    case 'wardEtcher':
      return fixed('Shield per MP', `x${e.perMp}`);
    case 'mireBound':
      return fixed('Speed', multText(e.speedMult));
    case 'corpseHunger':
      return fixed('Heal', pct(e.ratio));
    case 'boneWard':
      return fixed('Damage taken', lessText(e.reduce));
    case 'censerSmoke':
      return fixed('Heal per turn', pct(e.ratio));
    case 'choirVessel':
      return fixed('MP per hit', `+${e.mpPerHit}`);
    case 'shell':
      return fixed('Armor', multText(e.armorMult));
    case 'slick':
      return fixed('Evasion', `+${pct(e.evasion)}`);
    case 'lure':
      return fixed('Attacker', cap(e.status));
    case 'deathlessTide':
      return fixed('Rises with', pct(e.hpRatio));
    case 'saltTears':
      return fixed('Heal per turn', pct(e.ratio));
    default:
      return [];
  }
}
