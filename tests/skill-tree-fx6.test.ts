import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { scaleOf } from '../src/engine/tree-hooks';
import type { GroundEffect } from '../src/engine/types';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';
import { buildMechanics } from '../src/wiki/catalog';

// Skill ağacı altıncı tur (Ömer 2026-10-22, ikinci fx soru sayfası): "A → B" = base kuralı kalır; yeni durum Weakened (verilen hasar azalır) +
// Pollen Drift / Distracting Fan / Spell Shatter; Gnawing Rot ilk tik +%10; Maiming Shot süreleri; Rot Bomb; Living Bomb bekleme 3; Undying Rage
// 10 Rage ister; Spillover yalnızca Mana Overflow; Split Ward / Verdant Link ikinci alıcı başka dost; Fervent Oath yeni metin; Thin Sap yenilenme de
// yarı; Carving Arc her kesik Wound; Martyr Rising Resurrection'ı bekleme süresine sokar. Her test YALNIZCA verilen düğümlerin fx'iyle derler.

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
function only(cls: string, ranks: Record<string, number>, edit?: (t: TreeData) => void): UnitSetup['tree'] {
  const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((b) => (b.fx = null));
  edit?.(t);
  return compileTree(t, { v: t.version, r: { ...ranks } });
}
const withTree = (slot: number, tree: UnitSetup['tree']): Record<number, UnitSetup> => ({ [slot]: { tree } });
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot && !c.summoned)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const summonOf = (b: Battle, owner: Combatant): Combatant | undefined => b.combatants.find((c) => c.summoned && c.owner === owner.uid && c.hp > 0);
function untilTurn(b: Battle, c: Combatant, max = 30): void {
  for (let i = 0; i < max && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
}
function cast(b: Battle, actor: Combatant, skill: string, target?: Combatant): BattleEvent[] {
  if (b.mode === 'turns') untilTurn(b, actor);
  const from = b.log.length;
  actor.cooldowns[skill] = 0;
  actor.mp = actor.maxMp;
  const r = b.useSkill(actor.uid, skill, target?.uid);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}
const has = (c: Combatant, kind: string): boolean => c.statuses.some((s) => s.kind === kind);
const sure = (b: Battle): void => void Object.assign(b.debug, { dodge: 'never', crit: 'never' });
interface Priv {
  record(e: BattleEvent): void;
  addStatus(t: Combatant, s: Combatant['statuses'][number], emit: (e: BattleEvent) => void, cause?: string): void;
  ground: GroundEffect[];
}
const X = (b: Battle): Priv => b as unknown as Priv;
const add = (b: Battle, t: Combatant, s: Partial<Combatant['statuses'][number]> & { kind: string; turns: number; source: string }): void =>
  X(b).addStatus(t, s as Combatant['statuses'][number], (e) => X(b).record(e));
const procs = (b: Battle, node: string): number => b.treeProcs().find((p) => p.node === node)?.count ?? 0;
type Eff = { type: string; bet?: { ratio?: number; winMult?: number }; gainRatio?: number; power?: number };
const effs = (tree: UnitSetup['tree'], skill: string): Eff[] => (tree!.skills![skill]!.effects as unknown as Eff[]);

describe('Altıncı tur: "A → B" = yeni taban, öteki düğümler üstüne eklenir', () => {
  it('Penny Ante / Called Game / Siphon Vein: B taban; aynı alana ek yapan düğüm B\'nin üstüne biner', () => {
    const plus = (key: string, f: string, v: number) => (t: TreeData) => (t.nodes[key]!.fx = [{ k: 'skill', sel: f === 'gainRatio' ? 'manaBurn' : 'bet', f, op: 'add', v }] as TreeData['nodes'][string]['fx']);
    const bet = (tree: UnitSetup['tree']) => effs(tree, 'high_stakes').find((e) => e.bet)!.bet!;
    expect(bet(only('gambler', { '2.fb': 1 }))).toMatchObject({ ratio: 0.05, winMult: 1.6 });
    expect(bet(only('gambler', { '2.fb': 1, '2.f1': 1 }, plus('2.f1', 'ratio', 0.02))).ratio).toBeCloseTo(0.07, 9);
    expect(bet(only('gambler', { '2.v': 1 })).ratio).toBe(0.08);
    expect(bet(only('gambler', { '2.v': 1, '2.f1': 1 }, plus('2.f1', 'ratio', 0.02))).ratio).toBeCloseTo(0.1, 9);
    const gain = (tree: UnitSetup['tree']) => effs(tree, 'mana_burn').find((e) => e.gainRatio !== undefined)!.gainRatio!;
    expect(gain(only('antimage', { '1.ea': 1 }))).toBe(1);
    expect(gain(only('antimage', { '1.ea': 1, '1.f1': 1 }, plus('1.f1', 'gainRatio', 0.1)))).toBeCloseTo(1.1, 9);
  });

  it('Feeble Jinx: Jinxed isabet -%40 (tanımın -%20\'si + düğümün -%20\'si), Jinx hasarsız', () => {
    const b = make({ 0: 'hexer' }, { 0: 'warrior' }, withTree(0, only('hexer', { '3.fb': 1 })));
    sure(b);
    const foe = E(b);
    const acc0 = b.effectiveStats(foe).accuracy;
    const evs = cast(b, P(b), 'jinx', foe);
    expect(evs.some((e) => e.type === 'damage' && e.source === P(b).uid)).toBe(false);
    expect(foe.statuses.find((s) => s.kind === 'jinxed')?.potency?.accuracyDelta).toBeCloseTo(-0.2, 9);
    expect(acc0 - b.effectiveStats(foe).accuracy).toBeCloseTo(0.4, 6);
  });
});

describe('Altıncı tur: Weakened (verilen hasar azalır)', () => {
  it('statuses.json tanımı, Wiki hasar formülü listesi; ağaçsız birimde çarpan 1', () => {
    const d = content.statuses.weakened!;
    expect(d).toMatchObject({ name: 'Weakened', type: 'debuff', damageDealtMult: 0.85, tickAtTurnEnd: true });
    const dmg = buildMechanics().find((a) => a.id === 'damage-formula')!;
    expect(JSON.stringify(dmg)).toContain('Weakened');
    const b = make({ 0: 'mage' }, { 0: 'warrior' });
    expect(b.weakenedMult(P(b), 'magic')).toBe(1);
    expect(b.dealtDamageMult(P(b), E(b))).toBe(1);
  });

  it('verilen hasar, önizleme ve gerçek vuruş aynı çarpanı görür (kaynaksız Weakened %15)', () => {
    const hit = (weak: boolean): { real: number; prev: number } => {
      const b = make({ 0: 'warrior' }, { 0: 'mage' }, {}, 5);
      sure(b);
      const me = P(b);
      me.stats = { ...me.stats, str: 400 };
      const foe = E(b);
      foe.hp = foe.maxHp = 9000;
      if (weak) add(b, me, { kind: 'weakened', turns: 2, source: foe.uid });
      const prev = previewSkill(b, me.uid, 'melee_attack', foe.uid)[0]!.damage!.avg;
      const evs = cast(b, me, 'melee_attack', foe);
      return { real: evs.reduce((t, e) => t + (e.type === 'damage' && e.target === foe.uid ? e.amount + e.absorbed : 0), 0), prev };
    };
    const a = hit(false);
    const w = hit(true);
    expect(w.prev / a.prev).toBeCloseTo(0.85, 2);
    expect(w.real / a.real).toBeCloseTo(0.85, 1);
  });

  it('Druid Pollen Drift: Nature\'s Wrath vurduğu düşmana sıradaki turu için rank başına -%2', () => {
    const b = make({ 0: 'druid' }, { 0: 'warrior' }, withTree(0, only('druid', { '2.f3': 3 })));
    sure(b);
    const foe = E(b);
    cast(b, P(b), 'natures_wrath', foe);
    const st = foe.statuses.find((s) => s.kind === 'weakened')!;
    expect(st.turns).toBe(1);
    expect(b.weakenedMult(foe)).toBeCloseTo(0.94, 9);
    expect(b.weakenedMult(foe, 'magic')).toBeCloseTo(0.94, 9);
    expect(procs(b, 'druid:2.f3')).toBeGreaterThan(0);
  });

  it('Gambler Distracting Fan: Card Trick vurduğu düşman sıradaki saldırısında -%15, saldırınca düşer', () => {
    const b = make({ 0: 'gambler' }, { 0: 'warrior' }, withTree(0, only('gambler', { '3.eb': 1 })));
    sure(b);
    const foe = E(b);
    cast(b, P(b), 'card_trick', foe);
    expect(b.weakenedMult(foe)).toBeCloseTo(0.85, 9);
    expect(foe.statuses.find((s) => s.kind === 'weakened')?.potency?.oneAttack).toBe(1);
    const evs = cast(b, foe, foe.skills[0]!, P(b));
    expect(evs.some((e) => e.type === 'statusEnd' && e.status === 'weakened' && e.consumed)).toBe(true);
    expect(has(foe, 'weakened')).toBe(false);
  });

  it('Anti-Mage Spell Shatter: Void Strike hedefi 2 tur yalnızca büyü hasarında -%20', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' }, withTree(0, only('antimage', { '4.u2': 1 })));
    sure(b);
    const foe = E(b);
    cast(b, P(b), 'void_strike', foe);
    expect(foe.statuses.find((s) => s.kind === 'weakened')?.turns).toBe(2);
    expect(b.weakenedMult(foe, 'magic')).toBeCloseTo(0.8, 9);
    expect(b.weakenedMult(foe, 'physical')).toBe(1);
    expect(b.dealtDamageMult(foe, P(b), b.skill('fire_bolt'))).toBeCloseTo(0.8, 9);
  });

  it('derleyici: Weakened alanları statusPotency sözlüğünde; bilinmeyen alan reddedilir', () => {
    const t = JSON.parse(JSON.stringify(treeOf('druid')!)) as TreeData;
    expect(checkTreeFx(t)).toEqual([]);
    t.nodes['2.f3']!.fx = [{ k: 'hook', h: 'cond', sel: 'status:weakened', mod: { statusPotency: { dealt: -0.1 } } }] as TreeData['nodes'][string]['fx'];
    expect(checkTreeFx(t).length).toBeGreaterThan(0);
  });
});

describe('Altıncı tur: düğüm cevapları', () => {
  it('Druid Gnawing Rot: ilk tik +%10, ikinci +%20, üçüncü +%30', () => {
    const tree = only('druid', { '0.eb': 1 })!;
    const h = tree.hooks!.find((x) => x.node === 'druid:0.eb') as { scale: Record<string, unknown>; mod: { powerMul: number } };
    expect(h.scale).toEqual({ dotTickNumber: 1 });
    const per = (treeOf('druid')!.nodes['0.eb']!.fx![0] as unknown as { mod: { powerMul: number } }).mod.powerMul; // veriden (denge turu)
    expect(h.mod.powerMul).toBe(per);
    const tick = (index: number) => scaleOf(h.scale, { tick: { index } } as unknown as Parameters<typeof scaleOf>[1]) * h.mod.powerMul;
    expect([tick(0), tick(1), tick(2)].map((v) => Math.round(v * 100))).toEqual([1, 2, 3].map((k) => Math.round(k * per * 100)));
  });

  it('Archer Maiming Shot: Slow ve Blind 1 tur, metinde "for 1 turn"', () => {
    const n = treeOf('archer')!.nodes['1.v']!;
    expect(n.text.match(/for 1 turn/g)?.length).toBe(2);
    expect(JSON.stringify(n.fx)).toContain('"status":"slow","turns":1');
    expect(JSON.stringify(n.fx)).toContain('"status":"blinded","turns":1');
  });

  it('Undead Rot Bomb: Pox Bloom zemininde Withering\'in kalan tikleri bir anda vurur, Withering biter; zemin dışındaki kalır', () => {
    const b = make({ 3: 'undead' }, { 0: 'warrior', 2: 'warrior', 1: 'mage' }, withTree(3, only('undead', { '4.r1': 1, '4.r3': 1 })));
    sure(b);
    const me = P(b, 3);
    cast(b, me, 'raise_dead');
    const s = summonOf(b, me)!;
    const w = E(b, 0);
    const far = E(b, 2);
    for (const c of [w, far]) {
      c.hp = c.maxHp = 9000;
      add(b, c, { kind: 'wither', turns: 3, source: me.uid, amount: 40 });
    }
    cast(b, s, 'skeleton_strike', w);
    const expected = b.dotTickDamage('wither', 40, w) * 3;
    s.hp = 1;
    const hp0 = w.hp;
    for (let i = 0; i < 10 && s.hp > 0; i++) cast(b, E(b, 1), 'fire_bolt', s);
    expect(s.hp).toBe(0);
    expect(X(b).ground.some((g) => g.ground === 'poison' && g.slots.includes(w.slot))).toBe(true);
    expect(has(w, 'wither')).toBe(false);
    expect(hp0 - w.hp).toBe(expected);
    expect(has(far, 'wither')).toBe(true);
    expect(procs(b, 'undead:4.r3')).toBeGreaterThan(0);
  });

  it('Druid Living Bomb: Summon Treant bekleme süresi 5 → 3', () => {
    expect(content.skills.summon_treant!.cooldown).toBe(5);
    expect(only('druid', { '4.d3': 1 })!.skills!.summon_treant!.cooldown).toBe(3);
  });

  it('Warrior Undying Rage: 10 Rage yoksa kurtarmaz; varsa 1 canda kalır, 10 Rage gider', () => {
    const run = (rage: number): Combatant => {
      const b = make({ 0: 'warrior' }, { 0: 'mage' }, withTree(0, only('warrior', { '0.v': 1 })));
      sure(b);
      b.debug.damageMult = 50;
      const me = P(b);
      me.hp = Math.floor(me.maxHp * 0.2);
      me.rage = rage;
      cast(b, E(b), 'fire_bolt', me);
      return me;
    };
    expect(run(5).hp).toBe(0);
    const saved = run(12);
    expect(saved.hp).toBe(1);
    expect(saved.rage).toBeLessThan(12); // 10 Rage gitti (vuruştan kazanılan Rage sonra eklenir)
  });

  it('Anti-Mage Spillover: yalnızca Mana Overflow\'un taşan MP\'si aktarılır (Mana Steal fazlası aktarılmaz)', () => {
    const b = make({ 0: 'antimage', 1: 'mage' }, { 0: 'mage' }, withTree(0, only('antimage', { '0.eb': 1 })));
    sure(b);
    const me = P(b);
    const ally = P(b, 1);
    ally.mp = 0;
    E(b).mp = E(b).maxMp;
    me.cooldowns.mana_burn = 0;
    me.mp = me.maxMp;
    const r = b.useSkill(me.uid, 'mana_burn', E(b).uid);
    expect(r.ok).toBe(true);
    expect(me.mp).toBeLessThanOrEqual(me.maxMp);
    expect(ally.mp).toBe(0);
  });

  it('Anti-Mage Split Ward: ikinci kalkan hedeften BAŞKA en az MP\'li dosta; başka dost yoksa ikinci kopya yok', () => {
    const b = make({ 0: 'antimage', 1: 'mage', 2: 'druid' }, { 0: 'warrior' }, withTree(0, only('antimage', { '3.ea': 1 })));
    const me = P(b);
    const mage = P(b, 1);
    const druid = P(b, 2);
    mage.mp = 0;
    druid.mp = 1;
    cast(b, me, 'spell_ward', mage);
    const plain = make({ 0: 'antimage', 1: 'mage', 2: 'druid' }, { 0: 'warrior' });
    P(plain, 1).mp = 0;
    cast(plain, P(plain), 'spell_ward', P(plain, 1));
    expect(mage.magicShield).toBe(P(plain, 1).magicShield);
    expect(druid.magicShield).toBeGreaterThan(0);
    const solo = make({ 0: 'antimage' }, { 0: 'warrior' }, withTree(0, only('antimage', { '3.ea': 1 })));
    const evs = cast(solo, P(solo), 'spell_ward', P(solo));
    expect(evs.filter((e) => e.type === 'skillUsed' && e.skill === 'spell_ward').length).toBe(1);
  });

  it('Druid Verdant Link: ikinci kopya hedeften başka (ve Druid dışı) canı en düşük dosta', () => {
    const b = make({ 0: 'druid', 1: 'warrior', 2: 'mage' }, { 0: 'warrior' }, withTree(0, only('druid', { '3.v': 1 })));
    const me = P(b);
    const w = P(b, 1);
    const m = P(b, 2);
    w.hp = Math.floor(w.maxHp * 0.2);
    m.hp = Math.floor(m.maxHp * 0.6);
    me.hp = Math.floor(me.maxHp * 0.1);
    const evs = cast(b, me, 'rejuvenate', w);
    const healed = (c: Combatant) => evs.filter((e) => e.type === 'heal' && e.target === c.uid).length;
    expect(healed(w)).toBe(1);
    expect(healed(m)).toBe(1);
    expect(healed(me)).toBe(0);
  });

  it('Druid Thin Sap: anlık şifa ve yenilenme (tur başı şifa) ikisi de yarıya', () => {
    const base = content.skills.rejuvenate!.effects as unknown as Eff[];
    const e = effs(only('druid', { '3.fa': 1 }), 'rejuvenate');
    expect(e.find((x) => x.type === 'heal')!.power).toBeCloseTo(base.find((x) => x.type === 'heal')!.power! * 0.5, 9);
    expect(e.find((x) => x.type === 'hot')!.power).toBeCloseTo(base.find((x) => x.type === 'hot')!.power! * 0.5, 9);
  });

  it('Cutthroat Carving Arc: zincirdeki her kesik (isabet edince) Wound verir', () => {
    const b = make({ 0: 'cutthroat' }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' }, withTree(0, only('cutthroat', { '1.mb': 1 })));
    sure(b);
    for (const s of [0, 1, 2]) E(b, s).hp = E(b, s).maxHp = 9000;
    cast(b, P(b), 'venom_edge', E(b, 0));
    // 3 şeritli sıra: kenardaki hedeften iki kesik (1 ve 2); önceden yalnızca ilk kesik yaralıyordu
    expect([1, 2].map((s) => has(E(b, s), 'wound'))).toEqual([true, true]);
  });

  it('Paladin Martyr Rising: kalkınca Resurrection tam bekleme süresine girer, MP harcanmaz', () => {
    const b = make({ 0: 'paladin' }, { 0: 'mage' }, withTree(0, only('paladin', { '2.v': 1 })), 11, 'turns');
    sure(b);
    b.debug.damageMult = 50;
    const me = P(b);
    const m = E(b);
    untilTurn(b, m);
    me.hp = 1;
    me.cooldowns.resurrection = 0;
    const mp0 = me.mp;
    m.cooldowns.fire_bolt = 0;
    m.mp = m.maxMp;
    expect(b.useSkill(m.uid, 'fire_bolt', me.uid).ok).toBe(true);
    // Kalkış canı %40 (eylem bitince Paladin'in turu başlar: Divine Light kendini iyileştirebilir, bekleme süresi 1 azalabilir)
    expect(me.hp).toBeGreaterThanOrEqual(Math.round(me.maxHp * 0.4));
    expect(me.mp).toBeGreaterThanOrEqual(mp0);
    expect(me.mp - mp0).toBeLessThan(16);
    const cd = b.skill('resurrection', me.uid)!.cooldown!;
    expect(me.cooldowns.resurrection).toBeGreaterThanOrEqual(cd - 1);
    expect(me.cooldowns.resurrection).toBeGreaterThan(0);
  });

  it('Paladin Fervent Oath: Anointed Arms +%30 (yerine geçer), Divine Light şifası %25 az', () => {
    const n = treeOf('paladin')!.nodes['0.fb']!;
    expect(n.text).toBe("Anointed Arms' bonus doubles to +30%, but Divine Light heals 25% less.");
    const tree = only('paladin', { '0.eb': 1, '0.fb': 1 })!;
    expect(tree.hooks!.some((h) => h.node === 'paladin:0.eb')).toBe(false);
    expect((tree.passive!.effect as { power: number }).power).toBeCloseTo((content.classes.paladin!.passive!.effect as { power: number }).power * 0.75, 9);
    const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'mage' }, withTree(0, tree), 3, 'turns');
    const me = P(b);
    const ally = P(b, 1);
    if (b.currentActor === me) b.skipTurn();
    ally.hp = Math.floor(ally.maxHp / 2);
    untilTurn(b, me);
    expect(ally.treeBuffs?.find((x) => x.node === 'paladin:0.fb')?.mod?.powerMul).toBeCloseTo(0.3, 9);
    expect(ally.treeBuffs?.some((x) => x.node === 'paladin:0.eb')).toBe(false);
  });
});
