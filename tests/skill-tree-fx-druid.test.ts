import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, focusBuild, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2b (Druid): veride yazılı fx'ler derlenir, birleşimler patlamaz ve en az iki düğüm savaşta gerçekten etki eder.
const T = treeOf('druid')!;
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

describe('Druid ağacı fx (Faz 2b)', () => {
  it('tüm fx temiz derlenir; her satır / yön / ult kolu birleşimi derlenir', () => {
    expect(checkTreeFx(T)).toEqual([]);
    for (const rows of [[0, 1], [1, 2], [2, 3], [3, 0]] as [number, number][])
      for (const dir of ['a', 'b'] as const)
        for (const ult of ['u', 'r', 'd', 'l'] as const) expect(() => compileTree(T, focusBuild(T, rows, 50, { dir, ult }))).not.toThrow();
  });

  it('Hooked Barbs: Thorn Whip gücü rank başına ×1.04, rankler doğrusal toplanır (1 + v x rank); Deep Spring barı Rejuvenate şifası ve HoT gücünü oransal artırır (süre 3 kalır)', () => {
    const b = make({ 0: 'druid' }, { 0: 'warrior' }, { 0: { tree: tree(['1.f1*3', '1.f2*2', '3.f1*3', '3.f2*5', '3.f3*5', '1.f3*2']) } });
    const v = (fx: unknown): number => (fx as { v: number }).v;
    expect((b.skill('thorn_whip', P(b))!.effects[0] as { power: number }).power).toBeCloseTo(0.903 * (1 + 3 * v(T.nodes['1.f1']!.fx![0])), 6);
    const bar = T.mastery.bar[3]!;
    expect(bar.name).toBe('Deep Spring');
    const rj = b.skill('rejuvenate', P(b))!.effects;
    const heal = rj.find((e) => e.type === 'heal') as { power: number };
    const hot = rj.find((e) => e.type === 'hot') as { power: number; turns: number };
    expect(hot.turns).toBe(3);
    expect(heal.power).toBeCloseTo(0.675 * (1 + 3 * v(T.nodes['3.f1']!.fx![0])) * (1 + v(bar.fx![0])), 6);
    expect(hot.power).toBeCloseTo(0.225 * (1 + 5 * v(T.nodes['3.f2']!.fx![0])) * (1 + v(bar.fx![1])), 6);
    expect(bar.text).toContain(`${Number((v(bar.fx![0]) * 100).toFixed(2))}% more`); // ayrı çarpan cümle biçiminde yazılır (2026-10-27)
  });

  it('Third Lash (1.ma): her 3. Thorn Whip başka bir düşmana %20 kırbaç atar; Wild Thorns (1.fa, kritik yok) ile de çalışır', () => {
    const fx = T.nodes['1.ma']!.fx![0] as unknown as { on: string; every: number; do: { strike: number }[] };
    expect(fx.on).toBe('skillUse');
    expect(T.nodes['1.ma']!.text).toContain(`${Math.round(fx.do[0]!.strike * 100)}% damage`);
    const b = make({ 0: 'druid' }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' }, { 0: { tree: tree(['1.f1*3', '1.f2*5', '1.f3*5', '1.n0', '1.r*3', '1.ea', '1.ma', '1.fa']) } });
    for (const e of b.combatants) if (e.side === 'enemy') e.hp = e.maxHp = 99999;
    const me = P(b);
    const lashes = (): number => b.treeProcs().find((p) => p.node === 'druid:1.ma')?.count ?? 0;
    for (let i = 1; i <= fx.every * 2; i++) {
      me.mp = me.maxMp;
      const evs = cast(b, me.uid, 'thorn_whip', E0(b).uid);
      expect(evs.some((e) => e.type === 'damage' && e.crit)).toBe(false);
      expect(lashes()).toBe(Math.floor(i / fx.every));
      const hitOthers = evs.some((e) => e.type === 'damage' && e.target !== E0(b).uid && b.get(e.target)?.side === 'enemy');
      if (i % fx.every === 0) expect(hitOthers).toBe(true);
    }
  });

  it('Whip Crack: %30 canın altındaki hedefe Thorn Whip +%50 (önizleme)', () => {
    const prev = (withTree: boolean): number => {
      const b = make({ 0: 'druid' }, { 0: 'warrior' }, withTree ? { 0: { tree: tree(['1.f1*3', '1.f2', '1.f3', '1.n0']) } } : {});
      const e = E0(b);
      e.hp = Math.floor(e.maxHp * 0.2);
      return previewSkill(b, P(b).uid, 'thorn_whip', e.uid).find((x) => x.uid === e.uid)!.damage!.max;
    };
    expect(prev(true) / prev(false)).toBeGreaterThan(1 + (T.nodes['1.n0']!.fx![0] as unknown as { mod: { powerMul: number } }).mod.powerMul);
  });

  it('Strangling Grove: Nature\'s Wrath Slowed düşmanı 1 tur Stun\'lar', () => {
    const steps = ['1.f1*3', '1.f2*5', '2.f1*3', '2.f2*5', '2.f3', '2.n0', '2.r', '2.eb', '2.mb'];
    const { b, target } = landed((seed) => {
      const b = make({ 0: 'druid' }, { 0: 'warrior' }, { 0: { tree: tree(steps) } }, seed);
      const e = E0(b);
      e.statuses.push({ kind: 'slow', turns: 2, source: 'x' });
      return { b, evs: cast(b, P(b).uid, 'natures_wrath', e.uid), target: e.uid };
    });
    expect(b.get(target)!.statuses.some((s) => s.kind === 'stun')).toBe(true);
    expect(b.treeProcs().some((p) => p.node === 'druid:2.mb')).toBe(true);
  });
});
