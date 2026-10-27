import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, previewSkill, skillCostAmount, type BattleEvent, type BattleMode, type Combatant, type Teams, type TreeProcEvent, type UnitSetup } from '../src/engine';
import type { DamageEffect } from '../src/engine/spec';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData, TreeFx } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2a (docs/design/skill-tree-implementation.md "Faz 2a notları"): (b) addEffect / replaceEffect / unitFx, (c) C1 koşul kancası,
// C2 Rage kancaları, bedel koşulu, treeProc ölçüm kancası. Örnek düğümler gerçek veriden (Red Arc, War Gallop, Roaring Charge, Into the Fire,
// Second Wind barı, Pain Into Iron, Can Opener); diğerleri sentetik ağaç kopyası.

const W = treeOf('warrior')!;
const D = treeOf('defender')!;
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
function alloc(tree: TreeData, level: number, steps: string[]): TreeAlloc {
  let a = emptyAlloc(tree);
  for (const s of steps) {
    const [key, times] = s.split('*');
    for (let i = 0; i < Number(times ?? 1); i++) {
      const r = take(tree, level, a, key!);
      if (!r.ok) throw new Error(`${key}: ${r.block.text}`);
      a = r.alloc;
    }
  }
  return a;
}
/** Ağaç kopyası: verilen düğümlerin fx'i değiştirilmiş. */
const syn = (base: TreeData, nodes: Record<string, TreeFx[] | null>): TreeData => {
  const t = JSON.parse(JSON.stringify(base)) as TreeData;
  for (const [k, fx] of Object.entries(nodes)) t.nodes[k]!.fx = fx;
  return t;
};
const tree = (t: TreeData, steps: string[], level = 30) => compileTree(t, alloc(t, level, steps))!;
const P0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party')!;
const E0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
const since = (b: Battle, from: number): BattleEvent[] => b.log.slice(from);
const dealt = (evs: BattleEvent[], target: string): number => evs.reduce((s, e) => s + (e.type === 'damage' && e.target === target && (e.origin ?? 'skill') === 'skill' ? e.amount + e.absorbed : 0), 0);
const procs = (b: Battle, node: string): number => b.treeProcs().find((p) => p.node === node)?.count ?? 0;
function cast(b: Battle, uid: string, skill: string, target?: string): BattleEvent[] {
  const from = b.log.length;
  const me = b.get(uid)!;
  me.cooldowns[skill] = 0;
  const r = b.useSkill(uid, skill, target);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return since(b, from);
}
function playOut(b: Battle, maxMoves = 400): BattleEvent[] {
  let i = 0;
  for (let n = 0; n < maxMoves && !b.winner; n++) {
    let uid: string | undefined;
    if (b.mode === 'turns') uid = b.currentActor?.uid;
    else {
      const living = b.combatants.filter((c) => c.hp > 0);
      uid = living[i++ % living.length]?.uid;
    }
    if (!uid) break;
    const r = b.applyChoice(uid, chooseAction(b, uid, content.aiConfig));
    if (!r.ok && b.mode === 'turns') break;
  }
  return b.log;
}

/** Gerçek veri yolları. */
const RED_ARC = ['2.f1*3', '2.f2*5', '2.f3*2', '2.n0', '2.r*3'];
const CHARGE_PATH = ['3.f1*3', '3.f2*5', '3.f3*2', '3.n0', '2.f1*3', '2.f2', '3.r', '3.eb', '3.mb'];

describe('derleyici: (b) addEffect / replaceEffect / unitFx', () => {
  it('addEffect: etki seçicinin arkasına / önüne eklenir, byRank rank\'a göre seçilir, kopya düğüm kimliğini taşır', () => {
    const t = syn(W, { '2.f1': [{ k: 'addEffect', after: 'damage', byRank: [{ type: 'status', status: 'wound', turns: 1 }, { type: 'status', status: 'wound', turns: 2 }, { type: 'status', status: 'wound', turns: 3 }] }] });
    const ww = tree(t, ['2.f1*2']).skills!.whirlwind!;
    expect(ww.effects).toHaveLength(2);
    expect(ww.effects[1]).toMatchObject({ type: 'status', status: 'wound', turns: 2, treeNode: 'warrior:2.f1' });
    const before = syn(W, { '2.f1': [{ k: 'addEffect', before: 'damage', effect: { type: 'status', status: 'slow', turns: 1 } }] });
    expect(tree(before, ['2.f1']).skills!.whirlwind!.effects[0]).toMatchObject({ type: 'status', status: 'slow' });
    expect(content.skills.whirlwind!.effects).toHaveLength(1); // temel tanım değişmez
  });

  it('replaceEffect: seçicinin uyduğu etki yenisiyle değişir (Charge Stun -> Slow)', () => {
    const t = syn(W, { '3.f1': [{ k: 'replaceEffect', sel: 'status:stun', effect: { type: 'status', status: 'slow', turns: 1 } }] });
    const ch = tree(t, ['3.f1']).skills!.charge!;
    expect(ch.effects.map((e) => e.type)).toEqual(['damage', 'status']);
    expect(ch.effects[1]).toMatchObject({ status: 'slow', turns: 1, treeNode: 'warrior:3.f1' });
  });

  it('unitFx: ayrı kanal (fx + fxNodes), rank ölçeği eşik alanlarına dokunmaz, iki düğüm toplanır', () => {
    const t = syn(W, {
      '1.f1': [{ k: 'unitFx', fx: { armorPen: 0.02, secondWind: { below: 0.3, heal: 0.05 } }, rank: true }],
      '1.f2': [{ k: 'unitFx', fx: { armorPen: 0.01 } }],
    });
    const s = tree(t, ['1.f1*3', '1.f2']);
    expect(s.fx!.armorPen).toBeCloseTo(0.07, 6);
    expect(s.fx!.secondWind).toEqual({ below: 0.3, heal: 0.15 });
    expect(s.fxNodes!.armorPen).toEqual(['warrior:1.f1', 'warrior:1.f2']);
    expect(s.skills).toBeUndefined(); // skill değişmedi
  });

  it('kancalar: cond (Red Arc, rank x 3 = %9), bedel koşulu (Pain Into Iron), Rage (War Gallop / Roaring Charge / Into the Fire)', () => {
    expect(tree(W, RED_ARC).hooks).toContainEqual({ h: 'cond', node: 'warrior:2.r', skill: 'whirlwind', when: { targetStatus: 'wound' }, mod: { powerMul: 3 * (W.nodes['2.r']!.fx![0] as unknown as { mod: { powerMul: number } }).mod.powerMul } });
    expect(tree(D, ['4.l1', '4.l2']).skills!.fist_crush!.cost.cond).toEqual([{ node: 'defender:4.l2', add: -1, scale: { missingHp: 0.1 } }]);
    const c = tree(W, CHARGE_PATH);
    expect(c.hooks).toContainEqual({ h: 'rage', node: 'warrior:3.f3', skill: 'charge', on: 'hit', gain: 2 * (W.nodes['3.f3']!.fx![0] as unknown as { gain: number }).gain });
    expect(c.hooks).toContainEqual({ h: 'rage', node: 'warrior:3.n0', skill: 'charge', on: 'cast', floor: 30, once: true });
    expect(c.skills!.headsmans_blow!.cost.cond).toEqual([{ node: 'warrior:3.mb', add: -10, after: 'charge' }]);
  });

  it('checkTreeFx: gerçek veri temiz; hatalı fx\'ler yakalanır', () => {
    expect(checkTreeFx(W)).toEqual([]);
    expect(checkTreeFx(D)).toEqual([]);
    const bad = (t: TreeData, key: string, fx: unknown, needle: string) => {
      const errs = checkTreeFx(syn(t, { [key]: [fx as TreeFx] }));
      expect(errs.some((e) => e.includes(key) && e.includes(needle)), `${needle}: ${errs.join(' | ')}`).toBe(true);
    };
    bad(W, '2.f1', { k: 'hook', h: 'cond', when: { moonIsFull: true }, mod: { powerMul: 0.1 } }, 'unknown condition "moonIsFull"');
    bad(W, '2.f1', { k: 'hook', h: 'cond', scale: { stars: 1 }, mod: { powerMul: 0.1 } }, 'unknown scale "stars"');
    bad(W, '2.f1', { k: 'hook', h: 'cond', mod: { powerMul: 0.1, turns: 1 } }, 'two separate hooks');
    bad(W, '2.f1', { k: 'hook', h: 'cond', sel: 'status', mod: { powerMul: 0.1 } }, 'do not fit selector');
    bad(W, '2.f1', { k: 'hook', h: 'cond', when: { targetStatus: 'slow' }, mod: { cost: -1 } }, 'cannot be used for a cost');
    bad(W, '2.f1', { k: 'addEffect', effect: { type: 'status', status: 'gloom', turns: 1 } }, 'unknown status "gloom"');
    bad(W, '2.f1', { k: 'addEffect', after: 'status:stun', effect: { type: 'status', status: 'slow', turns: 1 } }, 'matches nothing');
    bad(W, '2.f1', { k: 'addEffect', effect: { type: 'summon', summon: 'x' } }, 'not allowed');
    bad(W, '2.f1', { k: 'unitFx', fx: { moonPower: 1 } }, 'unknown unitFx key "moonPower"');
    bad(D, '2.f1', { k: 'hook', h: 'rage', on: 'hit', gain: 2 }, 'has no Rage');
    bad(W, '2.f1', { k: 'hook', h: 'rage', on: 'hit', gain: 2, skill: 'taunt' }, 'not a warrior skill');
  });
});

describe('motor: C1 koşul kancası (önizleme = gerçek vuruş)', () => {
  it('Red Arc: Wounded hedefe Whirlwind hasar çarpanı tam x1,09 (rank 3), Wounded değilse x1; gerçek kullanımda ölçüm sayılır', () => {
    const noGore = syn(W, { '2.n0': null }); // Faz 2b: Gore Wheel (2.n0) artık Wound veriyor; "Wounded değil" durumu onsuz denenir
    const mult = (steps: string[], wounded: boolean) => {
      const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: { tree: tree(noGore, steps) } });
      if (wounded) E0(b).statuses.push({ kind: 'wound', turns: 5, source: 'x' });
      const def = b.skill('whirlwind', P0(b))!;
      return { b, m: b.dealtDamageMult(P0(b), E0(b), def, def.effects[0] as DamageEffect) };
    };
    const base = mult(RED_ARC.slice(0, -1), true).m;
    const hit = mult(RED_ARC, true);
    expect(hit.m / base).toBeCloseTo(1 + 3 * (W.nodes['2.r']!.fx![0] as unknown as { mod: { powerMul: number } }).mod.powerMul, 9);
    expect(mult(RED_ARC, false).m).toBeCloseTo(mult(RED_ARC.slice(0, -1), false).m, 9);
    cast(hit.b, P0(hit.b).uid, 'whirlwind', E0(hit.b).uid);
    expect(procs(hit.b, 'warrior:2.r')).toBe(1);
    const dry = mult(RED_ARC, false).b;
    cast(dry, P0(dry).uid, 'whirlwind', E0(dry).uid);
    expect(procs(dry, 'warrior:2.r')).toBe(0);
  });

  it('önizleme ve gerçek vuruş aynı koşullu çarpanı görür (sentetik +%100 Wounded hedefe)', () => {
    const t = syn(W, { '2.f1': [{ k: 'hook', h: 'cond', when: { targetStatus: 'wound' }, mod: { powerMul: 1 } }] });
    const run = (withTree: boolean) => {
      const b = make({ 0: 'warrior' }, { 0: 'archer' }, withTree ? { 0: { tree: tree(t, ['2.f1']) } } : {}, 3);
      E0(b).statuses.push({ kind: 'wound', turns: 5, source: 'x' });
      const prev = previewSkill(b, P0(b).uid, 'whirlwind', E0(b).uid).find((x) => x.uid === E0(b).uid)!.damage!.avg;
      return { prev, real: dealt(cast(b, P0(b).uid, 'whirlwind', E0(b).uid), E0(b).uid) };
    };
    const plain = run(false);
    const tr = run(true);
    expect(plain.real).toBeGreaterThan(0);
    expect(tr.prev / plain.prev).toBeGreaterThan(1.8);
    expect(tr.prev / plain.prev).toBeLessThan(2.2);
    expect(tr.real / plain.real).toBeGreaterThan(1.8);
    expect(tr.real / plain.real).toBeLessThan(2.2);
  });

  it('Can Opener: Fist Crush hasar çarpanı hedefin zırh puanı başına %1', () => {
    const run = (withTree: boolean) => {
      const b = make({ 0: 'defender' }, { 0: 'warrior' }, withTree ? { 0: { tree: tree(D, ['4.d1', '4.d2']) } } : {});
      const def = b.skill('fist_crush', P0(b))!;
      return { b, m: b.dealtDamageMult(P0(b), E0(b), def, def.effects[0] as DamageEffect) };
    };
    const tr = run(true);
    const armor = tr.b.effectiveStats(E0(tr.b)).armor;
    expect(armor).toBeGreaterThan(0);
    expect(tr.m / run(false).m).toBeCloseTo(1 + 0.01 * armor, 9);
  });

  it('kesin kritik (guaranteedCrit) ve durum süresi (turns) kancaları gerçek kullanımda', () => {
    const t = syn(W, {
      '2.f1': [{ k: 'hook', h: 'cond', when: { targetFullHp: true }, mod: { guaranteedCrit: true } }],
      '3.f1': [{ k: 'hook', h: 'cond', sel: 'status:stun', mod: { turns: 1 } }],
    });
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: { tree: tree(t, ['2.f1', '3.f1']) } });
    const evs = cast(b, P0(b).uid, 'whirlwind', E0(b).uid);
    expect(evs.some((e) => e.type === 'damage' && e.target === E0(b).uid && e.crit)).toBe(true);
    cast(b, P0(b).uid, 'charge', E0(b).uid);
    expect(E0(b).statuses.find((s) => s.kind === 'stun')?.turns).toBe(3);
    expect(procs(b, 'warrior:3.f1')).toBe(1);
  });

  it('addEffect gerçek kullanımda: Whirlwind hedefi Wound alır, ölçüm sayılır', () => {
    const t = syn(W, { '2.f1': [{ k: 'addEffect', after: 'damage', effect: { type: 'status', status: 'wound', turns: 2 } }] });
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: { tree: tree(t, ['2.f1']) } });
    cast(b, P0(b).uid, 'whirlwind', E0(b).uid);
    expect(E0(b).statuses.some((s) => s.kind === 'wound')).toBe(true);
    expect(procs(b, 'warrior:2.f1')).toBe(1);
  });
});

describe('motor: bedel koşulları', () => {
  it('Pain Into Iron: eksik canın her %10\'u Fist Crush\'ı 1 MP ucuzlatır (bedel - 3 at %35 eksik)', () => {
    const b = make({ 0: 'defender' }, { 0: 'warrior' }, { 0: { tree: tree(D, ['4.l1', '4.l2']) } });
    const me = P0(b);
    me.hp = Math.round(me.maxHp * 0.65);
    const def = b.skill('fist_crush', me)!;
    const base = content.skills.fist_crush!.cost.amount; // veriden (2026-10-24 mana turu: 14 -> 18)
    expect(skillCostAmount(def.cost, me)).toBe(base - 3);
    expect(skillCostAmount(content.skills.fist_crush!.cost, me)).toBe(base); // temel tanım: koşul yok
    const mp = me.mp;
    cast(b, me.uid, 'fist_crush', E0(b).uid);
    expect(mp - me.mp).toBe(base - 3);
    expect(procs(b, 'defender:4.l2')).toBe(1);
  });

  it('Into the Fire: Charge\'dan sonra sıradaki Headsman\'s Blow 20 Rage ister, kullanınca silah düşer', () => {
    const t = tree(W, CHARGE_PATH);
    const b = make({ 0: 'warrior' }, { 0: 'defender', 1: 'defender' }, { 0: { tree: t } });
    const me = P0(b);
    const hb = b.skill('headsmans_blow', me)!;
    me.rage = 0;
    expect(skillCostAmount(hb.cost, me)).toBe(30);
    cast(b, me.uid, 'charge', E0(b).uid);
    expect(me.treeArmed).toContain('warrior:3.mb');
    const r0 = me.rage!;
    me.rage = 22;
    expect(skillCostAmount(hb.cost, { ...me, rage: 0 })).toBe(20);
    cast(b, me.uid, 'headsmans_blow', E0(b).uid);
    expect(me.treeArmed ?? []).not.toContain('warrior:3.mb');
    expect(procs(b, 'warrior:3.mb')).toBe(1);
    expect(r0).toBeGreaterThanOrEqual(30); // Roaring Charge tabanı
    me.rage = 22;
    me.cooldowns.headsmans_blow = 0;
    expect(b.useSkill(me.uid, 'headsmans_blow', E0(b).uid).ok).toBe(false); // silah düştü: yine 30 ister
  });
});

describe('motor: C2 Rage kancaları', () => {
  it('War Gallop: Charge vurunca rank x değer Rage (aynı ağacın War Gallop\'suz hâlinden tam 2 x değer fazla; değer veriden, D9 2026-10-23); Roaring Charge: ilk Charge Rage\'i en az 30 yapar, bir kez', () => {
    const gallop = tree(W, ['3.f1*3', '3.f2*5', '3.f3*2']);
    const run = (t?: typeof gallop) => {
      const b = make({ 0: 'warrior' }, { 0: 'defender' }, t ? { 0: { tree: t } } : {});
      P0(b).rage = 0;
      cast(b, P0(b).uid, 'charge', E0(b).uid);
      return b;
    };
    const plain = run(tree(W, ['3.f1*3', '3.f2*5'])); // aynı güç düğümleri: hasardan gelen Rage eşit kalsın
    const g = run(gallop);
    expect(P0(g).rage! - P0(plain).rage!).toBe(2 * (W.nodes['3.f3']!.fx![0] as unknown as { gain: number }).gain);
    expect(procs(g, 'warrior:3.f3')).toBe(1);
    const roar = run(tree(W, ['3.f1*3', '3.f2*5', '3.f3*2', '3.n0']));
    expect(P0(roar).rage!).toBeGreaterThanOrEqual(30);
    expect(P0(roar).treeOnce).toContain('warrior:3.n0');
    P0(roar).rage = 0;
    cast(roar, P0(roar).uid, 'charge', E0(roar).uid);
    expect(P0(roar).rage!).toBeLessThan(30); // ikinci Charge: taban yok
    expect(procs(roar, 'warrior:3.n0')).toBe(1);
  });
});

describe('motor: C2 tallyAll', () => {
  it('Whirlwind Rage kazancı tüm vurulanların toplamı (perCastCap aynen), ağaçsızdan az değil; ölçüm sayılır', () => {
    const t = syn(W, { '2.f1': [{ k: 'hook', h: 'rage', rule: 'tallyAll' }] });
    const run = (withTree: boolean) => {
      const b = make({ 0: 'warrior' }, { 0: 'defender', 1: 'defender', 2: 'defender' }, withTree ? { 0: { tree: tree(t, ['2.f1']) } } : {}, 4);
      P0(b).rage = 0;
      cast(b, P0(b).uid, 'whirlwind', E0(b).uid);
      return b;
    };
    const plain = run(false);
    const all = run(true);
    expect(P0(all).rage!).toBeGreaterThanOrEqual(P0(plain).rage!);
    expect(P0(all).rage!).toBeLessThanOrEqual(content.formulas.rage.perCastCap);
    expect(procs(all, 'warrior:2.f1')).toBe(1);
  });
});

describe('unitFx motorda: item ve ağaç kanalı ayrı tetiklenir', () => {
  it('Second Wind: item ve ağaç (bar) ayrı ayrı bir kez iyileştirir; ağaçtaki ölçüm sayılır', () => {
    const b = make({ 0: 'warrior' }, { 0: 'warrior' }, { 0: { tree: { fx: { secondWind: { below: 0.3, heal: 0.1 } }, fxNodes: { secondWind: ['warrior:bar[1]'] } } } });
    const me = P0(b);
    me.itemEffects = { ...(me.itemEffects ?? {}), secondWind: { below: 0.3, heal: 0.05 } };
    me.hp = Math.round(me.maxHp * 0.31);
    const from = b.log.length;
    for (let i = 0; i < 6 && !since(b, from).some((e) => e.type === 'passive' && e.passive === 'second_wind'); i++) {
      me.hp = Math.min(me.hp, Math.round(me.maxHp * 0.31));
      cast(b, E0(b).uid, 'melee_attack', me.uid);
    }
    const winds = since(b, from).filter((e) => e.type === 'passive' && e.passive === 'second_wind');
    expect(winds).toHaveLength(2);
    expect(procs(b, 'warrior:bar[1]')).toBe(1);
  });
});

describe('treeProc ölçüm kancası', () => {
  it('dinleyici olayları alır, olay kaydına (log) girmez; ağaçlı savaş aynı girdiyle aynı sayımı verir', () => {
    const units = { 0: { tree: tree(W, RED_ARC) }, 1: { tree: tree(W, ['3.f1*3', '3.f2*5', '3.f3*2', '3.n0']) } };
    const go = () => {
      const b = make({ 0: 'warrior', 1: 'warrior' }, { 0: 'defender', 1: 'warrior' }, units, 7, 'turns');
      const seen: TreeProcEvent[] = [];
      b.onTreeProc((e) => seen.push(e));
      const log = playOut(b);
      return { log: JSON.stringify(log), seen, counts: b.treeProcs() };
    };
    const a = go();
    const c = go();
    expect(a.log).toBe(c.log);
    expect(a.counts).toEqual(c.counts);
    expect(a.seen.length).toBe(a.counts.reduce((s, p) => s + p.count, 0));
    expect(a.seen.length).toBeGreaterThan(0);
    expect(a.seen.every((e) => e.type === 'treeProc' && /^warrior:/.test(e.node))).toBe(true);
    expect(a.log.includes('treeProc')).toBe(false);
  });

  for (const mode of ['turns', 'test'] as BattleMode[]) {
    it(`${mode}: ağaçsız savaşta hiç treeProc yok ve kayıt tree:undefined ile aynı`, () => {
      const party = { 0: 'warrior', 1: 'defender', 3: 'mage' };
      const enemies = { 0: 'warrior', 1: 'cutthroat', 4: 'archer' };
      const plain = make(party, enemies, {}, 5, mode);
      let n = 0;
      plain.onTreeProc(() => n++);
      const log = JSON.stringify(playOut(plain));
      const undef = make(party, enemies, { 0: { tree: undefined } }, 5, mode);
      expect(JSON.stringify(playOut(undef))).toBe(log);
      expect(n).toBe(0);
      expect(plain.treeProcs()).toEqual([]);
    });
  }
});
