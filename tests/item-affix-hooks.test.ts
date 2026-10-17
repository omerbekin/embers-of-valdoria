import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, skillCostAmount, type BattleEvent, type BattleMode, type ItemEffects, type Teams, type UnitModifiers, type UnitSetup } from '../src/engine';
import { skillNumbers } from '../src/engine/skill-info';
import { damageSpecFor } from '../src/engine/spec';

// Affix kademeleri (Ömer onayı 2026-10-11, items.md 1.3b): her yeni affix statı GENEL bir motor kancasıdır (UnitModifiers / Stats / ItemEffects);
// yeni Legendary etkileri de. Verilmezse birim bugünküyle aynı (golden quick / comps kayıtları korur).

const f = content.formulas;
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, enemyUnits: Record<number, UnitSetup> = {}, mode: BattleMode = 'turns', seed = 11): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: enemyUnits } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
const fx = (e: ItemEffects, extra: UnitSetup = {}): UnitSetup => ({ ...extra, itemEffects: e });
const mod = (m: UnitModifiers): UnitSetup => ({ modifiers: m });
const unit = (b: Battle, uid: string) => b.combatants.find((c) => c.uid === uid)!;
type Emit = (e: BattleEvent) => void;
type Priv = { addStatus: (t: unknown, s: unknown, emit: Emit) => void; applyHit: (a: unknown, t: unknown, n: number, ty: string, crit: boolean, emit: Emit, red: boolean, meta: unknown) => number };
const priv = (b: Battle) => b as unknown as Priv;
const warriorAttack = content.classes.warrior!.skills[0]!;

describe('affix statları: skill sayıları (motor = skill-info = önizleme)', () => {
  it('Element hasarı / Global damage: yalnızca o elementin skill hasarı büyür; önizleme ve Gear sayısı aynı çarpanı görür', () => {
    const base = make({ 0: 'warrior' }, { 0: 'defender' });
    const phys = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: mod({ elemDamageAdd: { physical: 0.2 } }) });
    const fire = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: mod({ elemDamageAdd: { fire: 0.2 } }) });
    const glob = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: mod({ damageAdd: 0.2 }) });
    const avg = (b: Battle) => previewSkill(b, 'party-0', warriorAttack, 'enemy-0')[0]!.damage!.avg;
    expect(avg(phys)).toBeGreaterThan(avg(base));
    expect(avg(fire)).toBe(avg(base)); // warrior fiziksel vurur
    expect(avg(glob)).toBe(avg(phys));
    expect(unit(phys, 'party-0').stats.elemDamageMult).toEqual({ physical: 1.2 });
    expect(unit(glob, 'party-0').stats.damageMult).toBe(1.2);
    const n = (b: Battle) => skillNumbers(content.skills[warriorAttack]!, unit(b, 'party-0').stats, f)[0]!.value!;
    expect(n(phys)).toBeGreaterThan(n(base));
    expect(n(fire)).toBe(n(base));
    // verilmezse alan yok (birim aynı)
    expect(unit(base, 'party-0').stats.damageMult).toBeUndefined();
    expect(unit(base, 'party-0').stats.elemDamageMult).toBeUndefined();
  });

  it('Şifa / kalkan / DoT gücü: skill miktarları çarpanla büyür (Support, Shield power, DoT damage)', () => {
    const heal = (m: UnitModifiers) => skillNumbers(content.skills.rejuvenate!, make({ 0: 'druid' }, { 0: 'mage' }, { 0: mod(m) }).combatants[0]!.stats, f)[0]!.value!;
    expect(heal({ healPowerAdd: 0.5 })).toBeGreaterThan(heal({}));
    const shieldSkill = content.classes.mage!.skills.find((id) => content.skills[id]!.effects.some((e) => e.type === 'shield'))!;
    const shield = (m: UnitModifiers) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior' }, { 0: mod(m) });
      return previewSkill(b, 'party-0', shieldSkill, b.validTargets('party-0', shieldSkill)[0]!.uid)[0]!.shield!.amount;
    };
    expect(shield({ shieldPowerAdd: 0.5 })).toBeGreaterThan(shield({}));
    const dotSkill = content.classes.hexer!.skills.find((id) => content.skills[id]!.effects.some((e) => e.type === 'dot'))!;
    const dot = (m: UnitModifiers) => skillNumbers(content.skills[dotSkill]!, make({ 0: 'hexer' }, { 0: 'mage' }, { 0: mod(m) }).combatants[0]!.stats, f).find((x) => x.label.endsWith('/ turn'))!.value!;
    expect(dot({ dotPowerAdd: 0.5 })).toBeGreaterThan(dot({}));
  });

  it('Hız % ve maks MP %: türetilmiş değerin üstüne çarpan', () => {
    const plain = make({ 0: 'mage' }, { 0: 'warrior' }).combatants[0]!;
    const fast = make({ 0: 'mage' }, { 0: 'warrior' }, { 0: mod({ spdMult: 1.5, mpMult: 1.5 }) }).combatants[0]!;
    expect(fast.stats.spd).toBeCloseTo(plain.stats.spd * 1.5, 3);
    expect(fast.maxMp).toBe(Math.round(plain.maxMp * 1.5));
  });

  it('Endurance (Lucky Escape eki): Luck primary olmayan da şans kazanır; toplam en çok 1', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, { 0: mod({ surviveAdd: 0.2 }) });
    expect(b.luckyEscapeChance('party-0')).toBeCloseTo(0.2, 9);
    expect(make({ 0: 'warrior' }, { 0: 'mage' }).luckyEscapeChance('party-0')).toBe(0);
    expect(make({ 0: 'gambler' }, { 0: 'mage' }, { 0: mod({ surviveAdd: 5 }) }).luckyEscapeChance('party-0')).toBe(1);
  });
});

describe('affix kancaları (ItemEffects)', () => {
  it('Zırh / büyü zırhı delme: hasar belirtimi zırhın bu oranını yok sayar (skill ignoreDefense ile çarpımsal)', () => {
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: fx({ armorPen: 0.25, magicPen: 0.5 }) });
    const w = unit(b, 'party-0');
    const t = unit(b, 'enemy-0');
    const eff = { type: 'damage' as const, damageType: 'physical' as const, scale: 'str' as const, power: 1 };
    expect(damageSpecFor(w, t, eff, f).ignoreDefense).toBeCloseTo(0.25, 9);
    expect(damageSpecFor(w, t, { ...eff, ignoreDefense: 0.2 }, f).ignoreDefense).toBeCloseTo(1 - 0.8 * 0.75, 9);
    expect(damageSpecFor(w, t, { ...eff, damageType: 'magic' }, f).ignoreDefense).toBeCloseTo(0.5, 9);
    const plain = make({ 0: 'warrior' }, { 0: 'defender' });
    expect(damageSpecFor(unit(plain, 'party-0'), unit(plain, 'enemy-0'), eff, f).ignoreDefense).toBeUndefined();
    // büyük STR: delmenin farkı yuvarlamada kaybolmasın (levels.md 2026-10-17: Warrior STR 30 -> 26)
    w.stats.str = 80;
    unit(plain, 'party-0').stats.str = 80;
    const hi = previewSkill(b, 'party-0', warriorAttack, 'enemy-0')[0]!.damage!.avg;
    expect(hi).toBeGreaterThan(previewSkill(plain, 'party-0', warriorAttack, 'enemy-0')[0]!.damage!.avg);
  });

  it('MP cost -%: MP bedeli indirimli (yuvarlanır, en az 1); Rage / can bedeline işlemez', () => {
    const cost = { resource: 'mp' as const, amount: 10 };
    expect(skillCostAmount(cost, { hp: 1, mp: 50, itemEffects: { mpCostReduce: 0.2 } })).toBe(8);
    expect(skillCostAmount({ resource: 'mp', amount: 1 }, { hp: 1, mp: 50, itemEffects: { mpCostReduce: 0.9 } })).toBe(1);
    expect(skillCostAmount({ resource: 'rage', amount: 30 }, { hp: 1, mp: 50, rage: 40, itemEffects: { mpCostReduce: 0.5 } })).toBe(30);
    expect(skillCostAmount(cost, { hp: 1, mp: 50 })).toBe(10);
  });

  it('Life leech: isabet eden vuruşun düşürdüğü canın oranı şifa (cause leech)', () => {
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: fx({ leech: 0.5 }, { startHpRatio: 0.3 }) });
    b.debug.dodge = 'never';
    b.useSkill('party-0', warriorAttack, 'enemy-0');
    expect(b.log.some((e) => e.type === 'heal' && e.cause === 'leech' && e.target === 'party-0' && e.amount > 0)).toBe(true);
    const plain = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: { startHpRatio: 0.3 } });
    plain.debug.dodge = 'never';
    plain.useSkill('party-0', warriorAttack, 'enemy-0');
    expect(plain.log.some((e) => e.type === 'heal' && e.cause === 'leech')).toBe(false);
  });

  it('Debuff resistance: debuff hiç tutmaz (Resisted); kendi uyguladığı ve buff etkilenmez; etki yoksa zar atılmaz', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, { 0: fx({ debuffAvoid: 1 }) });
    const t = unit(b, 'party-0');
    const ev: BattleEvent[] = [];
    priv(b).addStatus(t, { kind: 'slow', turns: 2, source: 'enemy-0' }, (e) => ev.push(e));
    expect(t.statuses.some((s) => s.kind === 'slow')).toBe(false);
    expect(ev.some((e) => e.type === 'passive' && e.passive === 'item_resist')).toBe(true);
    priv(b).addStatus(t, { kind: 'haste', turns: 2, source: 'enemy-0' }, () => {});
    expect(t.statuses.some((s) => s.kind === 'haste')).toBe(true);
    const plain = make({ 0: 'mage' }, { 0: 'mage' }); // mage: Resilience zarı yok
    const state = (plain as unknown as { rng: { getState(): number } }).rng.getState();
    priv(plain).addStatus(unit(plain, 'party-0'), { kind: 'wound', turns: 2, source: 'enemy-0' }, () => {});
    expect((plain as unknown as { rng: { getState(): number } }).rng.getState()).toBe(state);
  });

  it('Potency: kaynağın debuff\'ı 1 tur uzun; sersemletme (Stun) uzamaz', () => {
    const b = make({ 0: 'hexer' }, { 0: 'mage' }, { 0: fx({ potencyTurns: 1 }) });
    const t = unit(b, 'enemy-0');
    priv(b).addStatus(t, { kind: 'wound', turns: 2, source: 'party-0' }, () => {});
    expect(t.statuses.find((s) => s.kind === 'wound')!.turns).toBe(3);
    priv(b).addStatus(t, { kind: 'stun', turns: 1, source: 'party-0' }, () => {});
    expect(t.statuses.find((s) => s.kind === 'stun')!.turns).toBe(1);
  });

  it('Immunity: seçilen durum birimin ilk N turunda tutmaz, sonra tutar', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, { 0: fx({ earlyImmunity: [{ status: 'stun', turns: 2 }] }) });
    const t = unit(b, 'party-0');
    priv(b).addStatus(t, { kind: 'stun', turns: 1, source: 'enemy-0' }, () => {});
    expect(t.statuses.some((s) => s.kind === 'stun')).toBe(false);
    priv(b).addStatus(t, { kind: 'slow', turns: 1, source: 'enemy-0' }, () => {});
    expect(t.statuses.some((s) => s.kind === 'slow')).toBe(true); // yalnızca seçilen durum
    t.ownTurns = 3;
    priv(b).addStatus(t, { kind: 'stun', turns: 1, source: 'enemy-0' }, () => {});
    expect(t.statuses.some((s) => s.kind === 'stun')).toBe(true);
  });

  it('Auralar: yan komşu dostun verdiği hasar artar (Battle aura); Global defense ve düşük canda azalma alınanı düşürür', () => {
    const b = make({ 0: 'warrior', 1: 'paladin', 9: 'archer' }, { 0: 'mage' }, { 1: fx({ auraDamage: 0.1 }) });
    expect(b.dealtDamageMult(unit(b, 'party-0'), unit(b, 'enemy-0'))).toBeCloseTo(1.1 * b.hunterMarkMult(unit(b, 'party-0'), unit(b, 'enemy-0')), 9);
    expect(b.dealtDamageMult(unit(b, 'party-2'), unit(b, 'enemy-0'))).toBe(b.hunterMarkMult(unit(b, 'party-2'), unit(b, 'enemy-0')));
    expect(b.dealtDamageMult(unit(b, 'party-1'), unit(b, 'enemy-0'))).toBe(b.hunterMarkMult(unit(b, 'party-1'), unit(b, 'enemy-0'))); // kendine değil
    const d = make({ 0: 'warrior' }, { 0: 'mage' }, { 0: fx({ damageTakenReduce: 0.1, lowHpReduce: { below: 0.3, reduce: 0.2 } }) });
    const w = unit(d, 'party-0');
    expect(d.damageTakenMult(w)).toBeCloseTo(0.9, 9);
    w.hp = Math.floor(w.maxHp * 0.2);
    expect(d.damageTakenMult(w)).toBeCloseTo(0.9 * 0.8, 9);
  });

  it('Ultimate cooldown -1: başlangıç cooldown\'u olan skill bir tur erken; cooldown\'suz skill etkilenmez', () => {
    const cls = Object.values(content.classes).find((c) => !c.testOnly && c.skills.some((id) => (content.skills[id]!.initialCooldown ?? 0) >= 2))!;
    const ult = cls.skills.find((id) => (content.skills[id]!.initialCooldown ?? 0) >= 2)!;
    const plain = make({ 0: cls.id }, { 0: 'mage' });
    const fast = make({ 0: cls.id }, { 0: 'mage' }, { 0: fx({ ultCdReduce: 1 }) });
    expect(unit(fast, 'party-0').cooldowns[ult]).toBe((unit(plain, 'party-0').cooldowns[ult] ?? 0) - 1);
  });

  it('Summon mastery: çağrının maks canı fazla', () => {
    const summonHp = (setup: UnitSetup) => {
      const b = make({ 0: 'druid' }, { 0: 'warrior' }, { 0: setup }, {}, 'test');
      const sk = content.classes.druid!.skills.find((id) => content.skills[id]!.effects.some((e) => e.type === 'summon'))!;
      const slot = b.summonSlots('party-0', sk)[0]!;
      b.useSkill('party-0', sk, undefined, slot);
      return b.combatants.find((c) => c.summoned && c.owner === 'party-0')!.maxHp;
    };
    expect(summonHp(fx({ summonPower: 0.5 }))).toBeGreaterThan(summonHp({}));
  });

  it('Resource mastery: Rage kazancı fazla', () => {
    const gain = (setup: UnitSetup) => {
      const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: setup }, {}, 'test');
      b.debug.dodge = 'never';
      b.useSkill('party-0', warriorAttack, 'enemy-0');
      return unit(b, 'party-0').rage ?? 0;
    };
    expect(gain(fx({ rageGain: 0.5 }))).toBeGreaterThan(gain({}));
  });
});

describe('yeni Legendary etkileri', () => {
  it('Iron Retort: yakın dövüşle isabet ettiren saldıran Slow alır', () => {
    const c = make({ 0: 'warrior' }, { 0: 'defender' }, {}, { 0: fx({ retortStatus: { status: 'slow', turns: 2 } }) }, 'test');
    c.debug.dodge = 'never';
    c.useSkill('party-0', warriorAttack, 'enemy-0');
    expect(unit(c, 'party-0').statuses.some((s) => s.kind === 'slow')).toBe(true); // süre Resilience ile 1 kısalabilir
    expect(c.log.some((e) => e.type === 'passive' && e.passive === 'iron_retort')).toBe(true);
    // menzilli saldırı tetiklemez
    const r = make({ 0: 'archer' }, { 0: 'defender' }, {}, { 0: fx({ retortStatus: { status: 'slow', turns: 2 } }) }, 'test');
    r.debug.dodge = 'never';
    const shot = content.classes.archer!.skills.find((id) => content.skills[id]!.motion !== 'melee' && content.skills[id]!.target === 'single_enemy')!;
    r.useSkill('party-0', shot, 'enemy-0');
    expect(unit(r, 'party-0').statuses.some((s) => s.kind === 'slow')).toBe(false);
  });

  it('Serrated Edge: kritik vuruş hedefe Wound ve Burning (DoT miktarlı) verir', () => {
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: fx({ critStatuses: [{ status: 'wound', turns: 2 }, { status: 'burning', turns: 2, power: 0.15 }] }) }, {}, 'test');
    b.debug.dodge = 'never';
    b.debug.crit = 'always';
    b.useSkill('party-0', warriorAttack, 'enemy-0');
    const t = unit(b, 'enemy-0');
    expect(t.statuses.some((s) => s.kind === 'wound')).toBe(true);
    expect(t.statuses.find((s) => s.kind === 'burning')!.amount).toBeGreaterThan(0);
  });

  it('Battle Rhythm: öldürünce Haste ve maks MP\'nin %20\'si', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage', 1: 'mage' }, { 0: fx({ killRush: { status: 'haste', turns: 2, mpRatio: 0.2 } }, { startMp: 0 }) }, { 0: { startHp: 1 } }, 'test');
    b.debug.dodge = 'never';
    b.useSkill('party-0', warriorAttack, 'enemy-0');
    const w = unit(b, 'party-0');
    expect(w.statuses.some((s) => s.kind === 'haste')).toBe(true);
    expect(b.log.some((e) => e.type === 'mpRegen' && e.cause === 'battle_rhythm')).toBe(true);
  });

  it('Last Stand: can %30 altına ilk inişte Fortified + debuff\'lar silinir; savaşta bir kez', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, { 0: fx({ lastStand: { below: 0.3, status: 'fortify', turns: 2 } }) });
    const w = unit(b, 'party-0');
    priv(b).addStatus(w, { kind: 'wound', turns: 3, source: 'enemy-0' }, () => {});
    priv(b).applyHit(unit(b, 'enemy-0'), w, Math.ceil(w.maxHp * 0.75), 'physical', false, () => {}, false, { origin: 'skill' });
    expect(w.statuses.some((s) => s.kind === 'fortify')).toBe(true);
    expect(w.statuses.some((s) => s.kind === 'wound')).toBe(false);
    expect(w.lastStandUsed).toBe(true);
  });

  it('Blinding Opener: ilk hasar skill\'inin isabet ettiği hedeflerden en çok `max` tanesi Blinded; yalnızca bir kez', () => {
    const aoe = content.classes.archer!.skills.find((id) => content.skills[id]!.target === 'area_enemies')!;
    const b = make({ 0: 'archer' }, { 0: 'warrior', 1: 'mage', 2: 'paladin', 3: 'defender', 4: 'druid', 5: 'gambler' }, { 0: fx({ openerStatus: { status: 'blinded', turns: 1, max: 2 } }) }, {}, 'test');
    b.debug.dodge = 'never';
    const anchor = b.shapeAnchors('party-0', aoe)[0]!;
    b.useSkill('party-0', aoe, undefined, anchor);
    const blinded = b.combatants.filter((c) => c.side === 'enemy' && c.statuses.some((s) => s.kind === 'blinded')).length;
    expect(blinded).toBeGreaterThan(0);
    expect(blinded).toBeLessThanOrEqual(2);
    expect(unit(b, 'party-0').openerUsed).toBe(true);
  });

  it('Vigil: Rest ayrıca Blessed ve maks canın %10\'u şifa', () => {
    const b = make({ 0: 'mage' }, { 0: 'warrior' }, { 0: fx({ restBlessing: { status: 'blessed', turns: 2, healRatio: 0.1 } }, { startHpRatio: 0.5, startMp: 0 }) }, {}, 'test');
    const m = unit(b, 'party-0');
    const hp = m.hp;
    expect(b.act('party-0', { kind: 'global', id: 'rest' }).ok).toBe(true);
    expect(m.statuses.some((s) => s.kind === 'blessed')).toBe(true);
    expect(m.hp).toBe(hp + Math.round(m.maxHp * 0.1));
  });

  it('Vengeance: yan komşu dost düşünce Haste ve Fortified', () => {
    const b = make({ 0: 'warrior', 1: 'mage' }, { 0: 'archer' }, { 0: fx({ vengeance: { statuses: ['haste', 'fortify'], turns: 2 } }) }, {}, 'test');
    expect(b.debugKill('party-1').ok).toBe(true);
    const w = unit(b, 'party-0');
    expect(w.statuses.some((s) => s.kind === 'haste')).toBe(true);
    expect(w.statuses.some((s) => s.kind === 'fortify')).toBe(true);
  });

  it('Marked Quarry: elit / boss hedefe isabet Jinxed verir; normal hedefe vermez', () => {
    const run = (tier?: 'elite') => {
      const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: fx({ tierStatus: { status: 'jinxed', turns: 1 } }) }, tier ? { 0: { tier } } : {}, 'test');
      b.debug.dodge = 'never';
      b.useSkill('party-0', warriorAttack, 'enemy-0');
      return unit(b, 'enemy-0').statuses.some((s) => s.kind === 'jinxed');
    };
    expect(run('elite')).toBe(true);
    expect(run()).toBe(false);
  });
});
