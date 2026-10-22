import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, focusBuild, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2b (Undead): veride yazılı fx'ler derlenir, birleşimler patlamaz ve en az iki düğüm savaşta gerçekten etki eder.
const T = treeOf('undead')!;
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

/** İlk isabet eden seed'deki savaş (zarı test etmiyoruz; etkinin kendisini ölçüyoruz). */
function landed(run: (seed: number) => { b: Battle; evs: BattleEvent[]; target: string }) {
  for (let seed = 1; seed < 80; seed++) {
    const r = run(seed);
    if (r.evs.some((e) => e.type === 'damage' && e.target === r.target)) return r;
  }
  throw new Error('no hit in 80 seeds');
}

describe('Undead ağacı fx (Faz 2b)', () => {
  it('tüm fx temiz derlenir; her satır / yön / ult kolu birleşimi derlenir', () => {
    expect(checkTreeFx(T)).toEqual([]);
    for (const rows of [[0, 1], [1, 2], [2, 3], [3, 0]] as [number, number][])
      for (const dir of ['a', 'b'] as const)
        for (const ult of ['u', 'r', 'd', 'l'] as const) expect(() => compileTree(T, focusBuild(T, rows, 50, { dir, ult }))).not.toThrow();
  });

  it('Black Spittle: Bone Throw hedefi 2 tur Wound alır (ağaçsız almaz)', () => {
    const run = (withTree: boolean) =>
      landed((seed) => {
        const b = make({ 0: 'undead' }, { 0: 'warrior' }, withTree ? { 0: { tree: tree(['0.f1*3', '0.f2*5', '0.f3', '0.n0', '0.r', '0.eb']) } } : {}, seed);
        return { b, evs: cast(b, P(b).uid, 'bone_throw', E0(b).uid), target: E0(b).uid };
      });
    const plain = run(false);
    expect(plain.b.get(plain.target)!.statuses.some((s) => s.kind === 'wound')).toBe(false);
    const tr = run(true);
    expect(tr.b.get(tr.target)!.statuses.find((s) => s.kind === 'wound')?.turns).toBe(2);
    expect(tr.b.treeProcs().some((p) => p.node === 'undead:0.eb')).toBe(true);
  });

  it('Crippling Bone: Bone Throw Slow\'u 3 tur sürer', () => {
    const { b, target } = landed((seed) => {
      const b = make({ 0: 'undead' }, { 0: 'warrior' }, { 0: { tree: tree(['1.f1*3', '1.f2', '1.f3', '1.n0']) } }, seed);
      return { b, evs: cast(b, P(b).uid, 'bone_throw', E0(b).uid), target: E0(b).uid };
    });
    expect(b.get(target)!.statuses.find((s) => s.kind === 'slow')?.turns).toBe(3);
  });

  it('Bone Champion: Skeleton süresiz, Raise Dead cooldown 5 -> 7', () => {
    const t = tree(['4.l1', '4.l2', '4.l3']);
    const rd = t.skills!.raise_dead!;
    expect(rd.cooldown).toBe(7);
    expect((rd.effects[0] as { lifespan?: number }).lifespan).toBeUndefined();
  });
});
