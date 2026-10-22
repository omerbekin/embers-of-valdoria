import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import type { DamageEffect } from '../src/engine/spec';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2b (Archer): data/skill-trees/archer.json fx'leri savaşta gerçekten etki eder.

const D = treeOf('archer')!;
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
const P0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party' && c.defId === 'archer')!;
const E0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
const procs = (b: Battle, node: string): number => b.treeProcs().find((p) => p.node === node)?.count ?? 0;
function cast(b: Battle, uid: string, skill: string, target?: string): BattleEvent[] {
  const from = b.log.length;
  b.get(uid)!.cooldowns[skill] = 0;
  const r = b.useSkill(uid, skill, target);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}

describe('Archer ağacı fx (Faz 2b)', () => {
  it('veri temiz: tüm düğümler tek başına derlenir', () => {
    expect(checkTreeFx(D)).toEqual([]);
  });

  it('Leg Shot Only: Quick Shot artık Haste vermez, hedefi 2 tur Slow eder', () => {
    const run = (withTree: boolean) => {
      const b = make({ 0: 'archer' }, { 0: 'warrior' }, withTree ? { 0: { tree: tree(['1.f1*3', '1.f2*5', '1.f3*2', '1.n0', '1.r*3', '1.ea', '1.fa']) } } : {});
      const e = E0(b);
      e.stats = { ...e.stats, evasion: -5 };
      cast(b, P0(b).uid, 'quick_shot', e.uid);
      return { haste: P0(b).statuses.some((s) => s.kind === 'haste'), slow: e.statuses.find((s) => s.kind === 'slow')?.turns ?? 0, b };
    };
    const plain = run(false);
    const tr = run(true);
    expect(plain.haste).toBe(true);
    expect(plain.slow).toBe(0);
    expect(tr.haste).toBe(false);
    expect(tr.slow).toBeGreaterThanOrEqual(2);
    expect(procs(tr.b, 'archer:1.fa')).toBe(1);
  });

  it('Killing Shot (ult u1): canı %50 altındaki düşmana Aimed Shot x1,40, üstündekine çarpan yok', () => {
    const run = (withTree: boolean, low: boolean) => {
      const b = make({ 0: 'archer' }, { 0: 'warrior' }, withTree ? { 0: { tree: tree(['4.u1'], 5) } } : {});
      if (low) E0(b).hp = Math.floor(E0(b).maxHp * 0.4);
      const def = b.skill('aimed_shot', P0(b))!;
      return b.dealtDamageMult(P0(b), E0(b), def, def.effects[0] as DamageEffect);
    };
    expect(run(true, true) / run(false, true)).toBeCloseTo(1.4, 9);
    expect(run(true, false)).toBeCloseTo(run(false, false), 9);
  });

  it('Long Sight: Sharpshooter perRow 0,05 -> 0,08 (rank 3)', () => {
    const t = tree(['0.f1*3']);
    expect((t.passive!.effect as { perRow: number }).perRow).toBeCloseTo(0.08, 9);
  });
});
