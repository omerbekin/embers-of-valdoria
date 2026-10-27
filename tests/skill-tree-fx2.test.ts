import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, previewSkill, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import type { DamageEffect } from '../src/engine/spec';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData, TreeFx } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2a+ (docs/design/skill-tree-implementation.md "Faz 2a+ notları"): yeni C1 değişiklikleri (critDmgMul, sureHit, noCrit,
// removeStatus, extendStatus, statusPotency, permanent, stakeMul...), a* alanları, removeEffect + isabet zarı, preHit (Gore Wheel), ortak Burning
// değeri, vuruş dışı bağlantı yerleri. Örnek fx'ler düğüm metniyle birebir (Gore Wheel, Searing Crit, Mercy Stroke, Sure Thing, Let It Ride).

const W = treeOf('warrior')!;
const M = treeOf('mage')!;
const G = treeOf('gambler')!;
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
const syn = (base: TreeData, nodes: Record<string, TreeFx[] | null>): TreeData => {
  const t = JSON.parse(JSON.stringify(base)) as TreeData;
  for (const [k, fx] of Object.entries(nodes)) t.nodes[k]!.fx = fx;
  return t;
};
const tree = (t: TreeData, steps: string[], level = 30) => compileTree(t, alloc(t, level, steps))!;
const P0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party')!;
const E0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
const procs = (b: Battle, node: string): number => b.treeProcs().find((p) => p.node === node)?.count ?? 0;
function cast(b: Battle, uid: string, skill: string, target?: string): BattleEvent[] {
  const from = b.log.length;
  b.get(uid)!.cooldowns[skill] = 0;
  const r = b.useSkill(uid, skill, target);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}
const bad = (t: TreeData, key: string, fx: unknown, needle: string) => {
  const errs = checkTreeFx(syn(t, { [key]: [fx as TreeFx] }));
  expect(errs.some((e) => e.includes(key) && e.includes(needle)), `${needle}: ${errs.join(' | ')}`).toBe(true);
};

/** Gerçek düğüm metinleri için örnek fx'ler (content-designer'ın yazacağı biçim). */
const GORE_WHEEL: TreeFx[] = [{ k: 'addEffect', after: 'damage', effect: { type: 'status', status: 'wound', turns: 2, preHit: true } }];
const SEARING_CRIT: TreeFx[] = [{ k: 'hook', h: 'cond', mod: { critDmgMul: 0.06 }, rank: true }];
const MERCY_STROKE: TreeFx[] = [{ k: 'hook', h: 'cond', skill: 'headsmans_blow', when: { targetStatus: 'stun' }, mod: { sureHit: true, guaranteedCrit: true, removeStatus: 'stun' } }];
const SURE_THING: TreeFx[] = [{ k: 'hook', h: 'cond', when: { betChanceAtLeast: 0.7 }, mod: { stakeMul: -1 } }];
const LET_IT_RIDE: TreeFx[] = [{ k: 'hook', h: 'cond', when: { betWon: true }, procChance: 0.15, mod: { extendStatus: { status: '*', turns: 1 } }, rank: true }];

describe('derleyici: Faz 2a+ sözlüğü', () => {
  it('örnek düğümler derlenir; kanca alanları (at / procChance / late) ve bedel çarpanı', () => {
    expect(checkTreeFx(syn(W, { '2.n0': GORE_WHEEL, '3.f1': MERCY_STROKE }))).toEqual([]);
    expect(checkTreeFx(syn(M, { '1.f2': SEARING_CRIT }))).toEqual([]);
    expect(checkTreeFx(syn(G, { '2.mb': SURE_THING, '2.r': LET_IT_RIDE }))).toEqual([]);
    const m = tree(syn(M, { '1.f2': SEARING_CRIT }), ['1.f1*3', '1.f2*5']);
    expect(m.hooks).toContainEqual({ h: 'cond', node: 'mage:1.f2', skill: 'fire_bolt', mod: { critDmgMul: 1.06 ** 5 - 1 } }); // "×1.06 per rank": rank'ta çarpılır (2026-10-27)
    const late = tree(syn(W, { '2.f1': [{ k: 'hook', h: 'cond', when: { hitIsCrit: true }, mod: { powerMul: 0.1 } }] }), ['2.f1']);
    expect(late.hooks![0]).toMatchObject({ late: true, mod: { powerMul: 0.1 } });
    const pc = tree(syn(W, { '2.f1': [{ k: 'hook', h: 'cond', procChance: 0.1, mod: { addStatus: { status: 'slow', turns: 1 } }, rank: true }] }), ['2.f1*3']);
    expect(pc.hooks![0]).toMatchObject({ procChance: 0.3, mod: { addStatus: { status: 'slow', turns: 1 } } });
    const dm = tree(syn(W, { '2.f1': [{ k: 'hook', h: 'cond', at: 'dot', mod: { powerMul: 0.2 } }] }), ['2.f1']);
    expect(dm.hooks![0]).toMatchObject({ at: 'dot' });
    const cm = tree(syn(W, { '2.f1': [{ k: 'hook', h: 'cond', when: { firstUseOfSkill: true }, mod: { costMul: -1 } }] }), ['2.f1']);
    expect(cm.skills!.whirlwind!.cost.cond).toEqual([{ node: 'warrior:2.f1', add: 0, mul: -1, skill: 'whirlwind', when: { firstUseOfSkill: true } }]);
  });

  it('a* alanları, op remove, removeEffect (hasarsız skill isabet zarı atar), ortak Burning değeri', () => {
    const t = syn(G, {
      '2.f1': [{ k: 'skill', sel: 'bet', f: 'ratio', op: 'set', v: 0.05 }, { k: 'skill', sel: 'bet', f: 'winMult', op: 'set', v: 1.6 }],
    });
    expect((tree(t, ['2.f1']).skills!.high_stakes!.effects[0] as DamageEffect).bet).toMatchObject({ ratio: 0.05, winMult: 1.6 });
    const ne = syn(W, { '2.f1': [{ k: 'removeEffect', sel: 'damage' }, { k: 'addEffect', effect: { type: 'status', status: 'slow', turns: 1 } }] });
    const ww = tree(ne, ['2.f1']).skills!.whirlwind!;
    expect(ww.treeHitRoll).toBe(true);
    expect(ww.effects.map((e) => e.type)).toEqual(['status']);
    const burn = tree(syn(W, { '2.f1': [{ k: 'addEffect', effect: { type: 'dot', status: 'burning' } as never }] }), ['2.f1']).skills!.whirlwind!;
    expect(burn.effects[1]).toMatchObject({ type: 'dot', status: 'burning', scale: 'int', power: 0.12, turns: 2 });
  });

  it('hatalı fx\'ler yakalanır', () => {
    bad(W, '2.f1', { k: 'hook', h: 'cond', mod: { moonBeam: 1 } }, 'unknown mod "moonBeam"');
    bad(W, '2.f1', { k: 'hook', h: 'cond', at: 'dot', mod: { sureHit: true } }, 'cannot be used at "dot"');
    bad(W, '2.f1', { k: 'hook', h: 'cond', at: 'moon', mod: { powerMul: 1 } }, 'unknown hook point');
    bad(W, '2.f1', { k: 'hook', h: 'cond', mod: { powerMul: 0.1, cooldownDelta: -1 } }, 'two separate hooks');
    bad(W, '2.f1', { k: 'hook', h: 'cond', when: { hitIsCrit: true }, mod: { turns: 1 } }, 'hitIsCrit');
    bad(W, '2.f1', { k: 'hook', h: 'cond', sel: 'status:slow', mod: { statusPotency: { glow: 1 } } }, 'unknown field "glow"');
    bad(W, '2.f1', { k: 'hook', h: 'cond', mod: { addStatus: { status: 'gloom', turns: 1 } } }, 'unknown status "gloom"');
    bad(W, '2.f1', { k: 'hook', h: 'cond', procChance: 2, mod: { powerMul: 0.1 } }, 'procChance');
    bad(W, '2.f1', { k: 'skill', sel: 'damage', f: 'power', op: 'remove', v: 0 }, 'cannot be removed');
    bad(W, '2.f1', { k: 'addEffect', effect: { type: 'taunt', turns: 1, preHit: true } }, '"preHit" is not allowed');
    bad(W, '2.f1', { k: 'removeEffect', sel: 'status:stun' }, 'matches nothing');
  });
});

describe('motor: Faz 2a+ değişiklikleri', () => {
  it('Gore Wheel (preHit): Wound hasardan ÖNCE işler ve aynı vuruşta Red Arc koşulunu tutar', () => {
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: { tree: tree(syn(W, { '2.n0': GORE_WHEEL }), ['2.f1*3', '2.f2*5', '2.f3*2', '2.n0', '2.r*3']) } });
    const evs = cast(b, P0(b).uid, 'whirlwind', E0(b).uid);
    const st = evs.findIndex((e) => e.type === 'status' && e.target === E0(b).uid && e.status === 'wound');
    const dmg = evs.findIndex((e) => e.type === 'damage' && e.target === E0(b).uid);
    expect(st).toBeGreaterThanOrEqual(0);
    expect(dmg).toBeGreaterThan(st);
    expect(evs.filter((e) => e.type === 'status' && e.status === 'wound')).toHaveLength(1); // sonda ikinci kez uygulanmaz
    expect(procs(b, 'warrior:2.r')).toBe(1);
  });

  it('Searing Crit: kritik çarpanı x1,06^5 (rank 5); önizleme critMult, YZ ve gerçek vuruş aynı yoldan', () => {
    const run = (withTree: boolean) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree ? { 0: { tree: tree(syn(M, { '1.f2': SEARING_CRIT }), ['1.f1*3', '1.f2*5']) } } : {});
      const def = b.skill('fire_bolt', P0(b))!;
      return { b, cm: b.critMultFor(P0(b), E0(b), def, def.effects[0] as DamageEffect), prev: previewSkill(b, P0(b).uid, 'fire_bolt', E0(b).uid).find((x) => x.uid === E0(b).uid)!.damage! };
    };
    const tr = run(true);
    const plain = run(false);
    expect(tr.cm / plain.cm).toBeCloseTo(1.06 ** 5, 9);
    expect(tr.prev.critMult).toBeCloseTo(tr.cm, 9);
    expect(plain.prev.critMult).toBeUndefined();
    expect(tr.prev.critMax).toBeGreaterThan(plain.prev.critMax);
  });

  it('Mercy Stroke: Stunned hedefe Headsman\'s Blow ıskalamaz, kesin kritik, Stun düşer', () => {
    const b = make({ 0: 'warrior' }, { 0: 'archer' }, { 0: { tree: tree(syn(W, { '3.f1': MERCY_STROKE }), ['3.f1']) } });
    P0(b).rage = P0(b).maxRage ?? 100;
    const e = E0(b);
    e.stats = { ...e.stats, evasion: 5 }; // zar atılsa kesin ıska
    e.statuses.push({ kind: 'stun', turns: 2, source: 'x' });
    const evs = cast(b, P0(b).uid, 'headsmans_blow', e.uid);
    expect(evs.some((x) => (x.type === 'miss' || x.type === 'dodge') && x.target === e.uid)).toBe(false);
    expect(evs.some((x) => x.type === 'damage' && x.target === e.uid && x.crit)).toBe(true);
    expect(e.statuses.some((s) => s.kind === 'stun')).toBe(false);
    expect(procs(b, 'warrior:3.f1')).toBeGreaterThanOrEqual(1);
  });

  it('Sure Thing: Jackpot şansı %70+ iken Bust can almaz (stakeMul -1); şans altındayken alır', () => {
    const t = (on: boolean) => syn(G, { '2.f1': [{ k: 'hook', h: 'cond', mod: { winSet: on ? 0.7 : 0.5 } }], '2.f2': SURE_THING });
    const bustSelf = (on: boolean): number | null => {
      for (let seed = 1; seed < 80; seed++) {
        const b = make({ 0: 'gambler' }, { 0: 'warrior' }, { 0: { tree: tree(t(on), ['2.f1', '2.f2']) } }, seed);
        const evs = cast(b, P0(b).uid, 'high_stakes', E0(b).uid);
        if (!evs.some((x) => x.type === 'passive' && x.passive === 'gamble_lose')) continue;
        return evs.filter((x) => x.type === 'damage' && x.target === P0(b).uid && x.origin === 'self').length;
      }
      return null;
    };
    expect(bustSelf(true)).toBe(0);
    expect(bustSelf(false)).toBe(1);
  });

  it('statusPotency ve permanent: ağaçla uygulanan Slow daha güçlü ve süresiz', () => {
    const t = syn(W, {
      '2.f1': [{ k: 'addEffect', after: 'damage', effect: { type: 'status', status: 'slow', turns: 1 } }],
      '2.f2': [{ k: 'hook', h: 'cond', sel: 'status:slow', mod: { statusPotency: { speedMult: -0.1 }, permanent: true } }],
    });
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: { tree: tree(t, ['2.f1*3', '2.f2']) } });
    const base = b.statusMult(E0(b), 'speedMult');
    cast(b, P0(b).uid, 'whirlwind', E0(b).uid);
    const slow = E0(b).statuses.find((s) => s.kind === 'slow')!;
    expect(slow.permanent).toBe(true);
    const def = content.battleSetup('random-battle', 1, 'test', { party: cells({}), enemies: cells({}), units: { party: {}, enemies: {} } }, false).statuses!.slow!;
    expect(b.statusMult(E0(b), 'speedMult')).toBeCloseTo(base * Math.max(0, (def.speedMult ?? 1) - 0.1), 9);
  });

  it('hasarı kaldırılan skill isabet zarı atar: ıskalanan düşmana durum işlemez', () => {
    const ne = syn(W, { '2.f1': [{ k: 'removeEffect', sel: 'damage' }, { k: 'addEffect', effect: { type: 'status', status: 'slow', turns: 1 } }] });
    const b = make({ 0: 'warrior' }, { 0: 'archer' }, { 0: { tree: tree(ne, ['2.f1']) } });
    E0(b).stats = { ...E0(b).stats, evasion: 5 };
    const evs = cast(b, P0(b).uid, 'whirlwind', E0(b).uid);
    expect(evs.some((x) => (x.type === 'miss' || x.type === 'dodge') && x.target === E0(b).uid)).toBe(true);
    expect(E0(b).statuses.some((s) => s.kind === 'slow')).toBe(false);
  });

  it('ağaçlı savaş aynı seed + girdiyle birebir aynı (yeni izleme ve zarlar seed\'li)', () => {
    const t = syn(W, { '2.n0': GORE_WHEEL, '3.f1': MERCY_STROKE, '2.f1': [{ k: 'hook', h: 'cond', procChance: 0.3, mod: { addStatus: { status: 'slow', turns: 1 } } }] });
    const run = () => {
      const b = make({ 0: 'warrior', 1: 'mage' }, { 0: 'defender', 1: 'archer' }, { 0: { tree: tree(t, ['2.f1*3', '2.f2*5', '2.f3*2', '2.n0', '3.f1']) } }, 7, 'turns');
      for (let n = 0; n < 300 && !b.winner; n++) {
        const uid = b.currentActor?.uid;
        if (!uid || !b.applyChoice(uid, chooseAction(b, uid, content.aiConfig)).ok) break;
      }
      return { log: JSON.stringify(b.log), procs: JSON.stringify(b.treeProcs()) };
    };
    const a = run();
    expect(run()).toEqual(a);
  });
});
