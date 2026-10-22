import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import type { DamageEffect } from '../src/engine/spec';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2b (Paladin): data/skill-trees/paladin.json fx'leri savaşta gerçekten etki eder.

const D = treeOf('paladin')!;
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
const tree = (steps: string[], level = 30) => compileTree(D, alloc(D, level, steps))!;
const P0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party' && c.defId === 'paladin')!;
const E0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
const procs = (b: Battle, node: string): number => b.treeProcs().find((p) => p.node === node)?.count ?? 0;
function cast(b: Battle, uid: string, skill: string, target?: string): BattleEvent[] {
  const from = b.log.length;
  b.get(uid)!.cooldowns[skill] = 0;
  const r = b.useSkill(uid, skill, target);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}

describe('Paladin ağacı fx (Faz 2b)', () => {
  it('veri temiz: tüm düğümler tek başına derlenir', () => {
    expect(checkTreeFx(D)).toEqual([]);
  });

  it('Searing Dawn (ult u1): Radiance gücü x1,20 (oransal) ve önizleme hasarı artar', () => {
    const run = (withTree: boolean) => {
      const b = make({ 0: 'paladin' }, { 0: 'warrior' }, withTree ? { 0: { tree: tree(['4.u1'], 5) } } : {});
      const pow = (b.skill('radiance', P0(b))!.effects.find((e) => e.type === 'damage') as DamageEffect).power;
      return { pow, avg: previewSkill(b, P0(b).uid, 'radiance', E0(b).uid).find((x) => x.uid === E0(b).uid)!.damage!.avg };
    };
    expect(run(true).pow / run(false).pow).toBeCloseTo(1 + (D.nodes['4.u1']!.fx![0] as unknown as { v: number }).v, 6);
    expect(run(true).avg).toBeGreaterThan(run(false).avg);
  });

  it('Final Light (ult r1): canı %30 altındaki düşmana Radiance x1,40, üstündekine çarpan yok', () => {
    const run = (withTree: boolean, low: boolean) => {
      const b = make({ 0: 'paladin' }, { 0: 'warrior' }, withTree ? { 0: { tree: tree(['4.r1'], 5) } } : {});
      if (low) E0(b).hp = Math.floor(E0(b).maxHp * 0.2);
      const def = b.skill('radiance', P0(b))!;
      return b.dealtDamageMult(P0(b), E0(b), def, def.effects.find((e) => e.type === 'damage') as DamageEffect);
    };
    expect(run(true, true) / run(false, true)).toBeCloseTo(1 + (D.nodes['4.r1']!.fx![0] as unknown as { mod: { powerMul: number } }).mod.powerMul, 9);
    expect(run(true, false)).toBeCloseTo(run(false, false), 9);
  });

  it('First Smite: savaştaki ilk Holy Strike kesin kritik', () => {
    const b = make({ 0: 'paladin' }, { 0: 'warrior' }, { 0: { tree: tree(['1.f1*3', '1.f2', '1.f3', '1.n0']) } });
    const e = E0(b);
    e.stats = { ...e.stats, evasion: -5 };
    const evs = cast(b, P0(b).uid, 'holy_strike', e.uid);
    expect(evs.some((x) => x.type === 'damage' && x.target === e.uid && x.crit)).toBe(true);
    expect(procs(b, 'paladin:1.n0')).toBe(1);
  });
});
