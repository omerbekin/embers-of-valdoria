import { describe, expect, it } from 'vitest';
import { Battle, content, skillCostAmount, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import type { DamageEffect } from '../src/engine/spec';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2b (Defender): data/skill-trees/defender.json fx'leri savaşta gerçekten etki eder.

const D = treeOf('defender')!;
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
const P0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party' && c.defId === 'defender')!;
const E0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
function cast(b: Battle, uid: string, skill: string, target?: string): BattleEvent[] {
  const from = b.log.length;
  b.get(uid)!.cooldowns[skill] = 0;
  const r = b.useSkill(uid, skill, target);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}

describe('Defender ağacı fx (Faz 2b)', () => {
  it('veri temiz: tüm düğümler tek başına derlenir', () => {
    expect(checkTreeFx(D)).toEqual([]);
  });

  it('Shockwave: Tremor Slam zaten Slowed düşmana x1,25 (rank 5), Slow yoksa çarpan yok', () => {
    const run = (withTree: boolean, slowed: boolean) => {
      const b = make({ 0: 'defender' }, { 0: 'warrior' }, withTree ? { 0: { tree: tree(['1.f1*3', '1.f2*5']) } } : {});
      if (slowed) E0(b).statuses.push({ kind: 'slow', turns: 2, source: 'x' });
      const def = b.skill('tremor_slam', P0(b))!;
      return b.dealtDamageMult(P0(b), E0(b), def, def.effects[0] as DamageEffect);
    };
    expect(run(true, true) / run(false, true)).toBeCloseTo(1.25, 9);
    expect(run(true, false)).toBeCloseTo(run(false, false), 9);
  });

  it('Formed Up (bar 15): savaştaki ilk Close Ranks MP harcamaz, ikincisi harcar', () => {
    const b = make({ 0: 'defender', 1: 'warrior' }, { 0: 'archer' }, { 0: { tree: tree(['2.f1*3', '2.f2*5', '2.f3*5', '2.n0', '2.r']) } });
    const me = P0(b);
    const ally = b.combatants.find((c) => c.side === 'party' && c.uid !== me.uid)!;
    const def = b.skill('close_ranks', me)!;
    expect(skillCostAmount(def.cost, me)).toBe(0);
    me.mp = me.maxMp;
    cast(b, me.uid, 'close_ranks', ally.uid);
    expect(me.mp).toBe(me.maxMp);
    // Not: firstUseOfSkill bedel koşulu treeProc ölçümüne düşmüyor (payCostConds CondCtx'e skill vermiyor; motor notu, rapor)
    expect(skillCostAmount(b.skill('close_ranks', me)!.cost, me)).toBe(content.skills.close_ranks!.cost.amount);
  });
});
