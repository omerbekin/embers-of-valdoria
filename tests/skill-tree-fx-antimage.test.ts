import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2b (Anti-Mage): data/skill-trees/antimage.json fx'leri temiz derlenir ve savaşta gerçekten etki eder
// (ağaçlı / ağaçsız aynı seed). Örnekler: Generous Cut (1.f1), Sure Hush (2.n0), Void Shackle (4.u3).

const A = treeOf('antimage')!;
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (enemy: string, units: Record<number, UnitSetup> = {}, seed = 11): Battle => {
  const teams: Teams = { party: cells({ 0: 'antimage' }), enemies: cells({ 0: enemy }), units: { party: units, enemies: {} } };
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
const unit = (steps: string[]): Record<number, UnitSetup> => ({ 0: { tree: compileTree(A, alloc(A, 30, steps))! } });
const P0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party')!;
const E0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
function cast(b: Battle, skill: string): BattleEvent[] {
  const from = b.log.length;
  P0(b).cooldowns[skill] = 0;
  P0(b).mp = Math.floor(P0(b).maxMp / 2);
  const r = b.useSkill(P0(b).uid, skill, E0(b).uid);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}
const mpGain = (evs: BattleEvent[], uid: string): number => evs.reduce((s, e) => s + (e.type === 'mpRegen' && e.actor === uid ? e.amount : 0), 0);

describe('Anti-Mage ağacı (Faz 2b)', () => {
  it('tüm fx\'ler temiz derlenir', () => {
    expect(checkTreeFx(A)).toEqual([]);
  });

  it('Generous Cut: Mana Steal yakılan MP\'nin %80\'ini verir (ağaçsız %50; rank 3)', () => {
    for (let seed = 1; seed < 40; seed++) {
      const plain = make('mage', {}, seed);
      const tree = make('mage', unit(['1.f1*3']), seed);
      const pg = mpGain(cast(plain, 'mana_burn'), P0(plain).uid);
      const tg = mpGain(cast(tree, 'mana_burn'), P0(tree).uid);
      if (!pg) continue;
      expect(pg).toBe(5);
      expect(tg).toBe(8);
      return;
    }
    throw new Error('Mana Steal isabet etmedi');
  });

  it('Sure Hush: dökümden önce MP\'si 0 olan düşman Drain Field\'da kesin Silence alır (ağaçsız %50 zar)', () => {
    const proc = (units: Record<number, UnitSetup>) => {
      const b = make('mage', units, 3);
      E0(b).mp = 0;
      return cast(b, 'drain_field').find((e) => e.type === 'emptyProc' && e.target === E0(b).uid) as Extract<BattleEvent, { type: 'emptyProc' }> | undefined;
    };
    expect(proc({})?.chance).toBe(0.5);
    const t = proc(unit(['2.f1*3', '2.f2*5', '2.f3*2', '2.n0']));
    expect(t?.chance).toBe(1);
    expect(t?.success).toBe(true);
  });

  it('Void Shackle: MP\'si 0 olan hedefe isabet eden Void Strike Stun verir (ağaçsız vermez)', () => {
    const steps = ['4.u1', '4.u2', '4.u3'];
    for (let seed = 1; seed < 40; seed++) {
      const run = (units: Record<number, UnitSetup>) => {
        const b = make('mage', units, seed);
        E0(b).mp = 0;
        E0(b).hp = E0(b).maxHp = 99999;
        P0(b).mp = P0(b).maxMp;
        P0(b).cooldowns.void_strike = 0;
        expect(b.useSkill(P0(b).uid, 'void_strike', E0(b).uid).ok).toBe(true);
        return { hit: b.log.some((e) => e.type === 'damage' && e.target === E0(b).uid), stun: E0(b).statuses.some((s) => s.kind === 'stun') };
      };
      const plain = run({});
      const tree = run(unit(steps));
      if (!tree.hit) continue;
      expect(plain.stun).toBe(false);
      expect(tree.stun).toBe(true);
      return;
    }
    throw new Error('Void Strike isabet etmedi');
  });
});
