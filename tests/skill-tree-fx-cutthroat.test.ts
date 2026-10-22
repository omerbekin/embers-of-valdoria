import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, focusBuild, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2b (Cutthroat): veride yazılı fx'ler derlenir, birleşimler patlamaz ve en az iki düğüm savaşta gerçekten etki eder.
const T = treeOf('cutthroat')!;
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

describe('Cutthroat ağacı fx (Faz 2b)', () => {
  it('tüm fx temiz derlenir; her satır / yön / ult kolu birleşimi derlenir', () => {
    expect(checkTreeFx(T)).toEqual([]);
    for (const rows of [[0, 1], [1, 2], [2, 3], [3, 0]] as [number, number][])
      for (const dir of ['a', 'b'] as const)
        for (const ult of ['u', 'r', 'd', 'l'] as const) expect(() => compileTree(T, focusBuild(T, rows, 50, { dir, ult }))).not.toThrow();
  });

  it('Smell of Blood + Cold Read: durumsuz ama %40 canın altındaki hedef Opportunist sayılır (önizleme)', () => {
    const prev = (withTree: boolean): number => {
      const b = make({ 0: 'cutthroat' }, { 0: 'warrior' }, withTree ? { 0: { tree: tree(['0.f1*3', '0.f2', '0.f3', '0.n0']) } } : {});
      const e = E0(b);
      e.hp = Math.floor(e.maxHp * 0.35);
      return previewSkill(b, P(b).uid, 'venom_edge', e.uid).find((x) => x.uid === e.uid)!.damage!.max;
    };
    // Opportunist %25 + Cold Read 3 rank %9 = x1,34 (zırh düşümü oranı biraz büyütebilir)
    expect(prev(true) / prev(false)).toBeGreaterThan(1.3);
  });

  it('Coup de Grace: %30 canın altındaki hedefe Venom Edge her zaman kritik', () => {
    let crits = 0;
    for (let n = 0; n < 4; n++) {
      const { evs, target } = landed((seed) => {
        const b = make({ 0: 'cutthroat' }, { 0: 'warrior' }, { 0: { tree: tree(['1.f1*3', '1.f2', '1.f3', '1.n0']) } }, seed + n * 100);
        const e = E0(b);
        e.hp = Math.floor(e.maxHp * 0.2);
        return { b, evs: cast(b, P(b).uid, 'venom_edge', e.uid), target: e.uid };
      });
      if (evs.some((e) => e.type === 'damage' && e.target === target && e.crit)) crits++;
    }
    expect(crits).toBe(4);
  });

  it('Choking Cloud: düşmana atılan Smoke Bomb 1 tur Silence verir', () => {
    const run = (withTree: boolean) => {
      const b = make({ 0: 'cutthroat' }, { 0: 'warrior' }, withTree ? { 0: { tree: tree(['3.f1*3', '3.f2', '3.f3', '3.n0']) } } : {});
      cast(b, P(b).uid, 'smoke_bomb', E0(b).uid);
      return E0(b).statuses.some((s) => s.kind === 'silence');
    };
    expect(run(false)).toBe(false);
    expect(run(true)).toBe(true);
  });
});
