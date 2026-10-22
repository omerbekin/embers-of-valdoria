import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, focusBuild, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2b (Mage): veride yazılı fx'ler derlenir, birleşimler patlamaz ve en az iki düğüm savaşta gerçekten etki eder.
const T = treeOf('mage')!;
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, 'test', teams, false));
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
const tree = (steps: string[], level = 30) => compileTree(T, alloc(T, level, steps))!;
const P = (b: Battle, i = 0): Combatant => b.combatants.filter((c) => c.side === 'party')[i]!;
const E0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
function cast(b: Battle, uid: string, skill: string, target?: string): BattleEvent[] {
  const from = b.log.length;
  b.get(uid)!.cooldowns[skill] = 0;
  const r = b.useSkill(uid, skill, target);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}

describe('Mage ağacı fx (Faz 2b)', () => {
  it('tüm fx temiz derlenir; her satır / yön / ult kolu birleşimi derlenir', () => {
    expect(checkTreeFx(T)).toEqual([]);
    for (const rows of [[0, 1], [1, 2], [2, 3], [3, 0]] as [number, number][])
      for (const dir of ['a', 'b'] as const)
        for (const ult of ['u', 'r', 'd', 'l'] as const) expect(() => compileTree(T, focusBuild(T, rows, 50, { dir, ult }))).not.toThrow();
  });

  it('Resonance: Spell Echo şansı rank başına +0,02 (pasif yaması)', () => {
    const t = tree(['0.f1*3']);
    expect(t.passive!.effect).toMatchObject({ type: 'spellEcho', chance: 0.31 });
  });

  it('First Refrain (bar 5): cooldown\'lu büyünün savaştaki ilk kullanımı kesin yankılanır (cooldown 0 kalır)', () => {
    const b = make({ 0: 'mage' }, { 0: 'warrior', 1: 'warrior' }, { 0: { tree: tree(['1.f1*3', '1.f2*2']) } });
    const me = P(b);
    cast(b, me.uid, 'blizzard', E0(b).uid);
    expect(me.cooldowns.blizzard ?? 0).toBe(0);
    expect(b.treeProcs().some((p) => p.node === 'mage:bar[0]')).toBe(true);
  });

  it('Execution Bolt + Finisher: düşük canlı hedefe Fire Bolt daha sert (önizleme)', () => {
    const prev = (withTree: boolean): number => {
      const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree ? { 0: { tree: tree(['0.f1*3', '0.f2*2', '1.f1*3', '1.f2', '1.f3', '1.n0', '1.r*3', '1.eb']) } } : {});
      const e = E0(b);
      e.hp = Math.floor(e.maxHp * 0.2);
      return previewSkill(b, P(b).uid, 'fire_bolt', e.uid).find((x) => x.uid === e.uid)!.damage!.max;
    };
    const plain = prev(false);
    const boosted = prev(true);
    // Finisher x1,15 ve Execution Bolt x1,5 (kancalar çarpılır)
    const pm = (id: string) => (T.nodes[id]!.fx![0] as unknown as { mod: { powerMul: number } }).mod.powerMul; // veriden
    const m = (1 + 3 * pm('1.r')) * (1 + pm('1.eb'));
    expect(boosted / plain).toBeGreaterThan(m - 0.1);
    expect(boosted / plain).toBeLessThan(m + 0.1);
  });

  it('Ice Block + Frozen Solid: Mana Barrier dostu 2 tur Fortified ve süre boyunca Slowed yapar', () => {
    const run = (steps: string[] | null) => {
      const b = make({ 0: 'mage', 1: 'warrior' }, { 0: 'warrior' }, steps ? { 0: { tree: tree(steps) } } : {});
      cast(b, P(b).uid, 'mana_barrier', P(b, 1).uid);
      return { b, ally: P(b, 1) };
    };
    const base = ['0.f1*3', '0.f2*5', '3.f1*3', '3.f2', '3.f3', '3.n0', '3.r', '3.eb'];
    const plain = run(null);
    expect(plain.ally.statuses.some((s) => s.kind === 'fortify')).toBe(false);
    const eb = run(base);
    expect(eb.ally.statuses.find((s) => s.kind === 'fortify')?.turns).toBe(1);
    expect(eb.b.treeProcs().some((p) => p.node === 'mage:3.eb')).toBe(true);
    const fb = run([...base, '3.fb']);
    expect(fb.ally.statuses.find((s) => s.kind === 'fortify')?.turns).toBe(2);
    expect(fb.ally.statuses.find((s) => s.kind === 'slow')?.turns).toBe(2);
  });
});
