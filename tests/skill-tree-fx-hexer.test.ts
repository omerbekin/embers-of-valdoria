import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2b (Hexer): data/skill-trees/hexer.json fx'leri temiz derlenir ve savaşta gerçekten etki eder
// (ağaçlı / ağaçsız aynı seed karşılaştırması). Örnekler: Prying Eye (1.f1), Opening Glare (1.n0), Lasting Jinx (3.ea), Crushing Doom (0.ea).

const H = treeOf('hexer')!;
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (enemy: string, units: Record<number, UnitSetup> = {}, seed = 11): Battle => {
  const teams: Teams = { party: cells({ 0: 'hexer' }), enemies: cells({ 0: enemy }), units: { party: units, enemies: {} } };
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
const unit = (steps: string[]): Record<number, UnitSetup> => ({ 0: { tree: compileTree(H, alloc(H, 30, steps))! } });
const P0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party')!;
const E0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
function cast(b: Battle, skill: string): BattleEvent[] {
  const from = b.log.length;
  P0(b).cooldowns[skill] = 0;
  P0(b).mp = P0(b).maxMp;
  const r = b.useSkill(P0(b).uid, skill, E0(b).uid);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}
const landed = (evs: BattleEvent[], uid: string): boolean => evs.some((e) => e.type === 'damage' && e.target === uid);

const EYE = ['1.f1*3', '1.f2*5', '1.f3*2', '1.n0'];
const JINX = ['3.f1*3', '3.f2*5', '3.f3*2', '3.n0', '3.r', '3.ea'];

describe('Hexer ağacı (Faz 2b)', () => {
  it('tüm fx\'ler temiz derlenir', () => {
    expect(checkTreeFx(H)).toEqual([]);
  });

  it('Prying Eye: Omen\'siz hedefe Evil Eye önizlemesi %12 güçlü (rank 3)', () => {
    const pv = (units: Record<number, UnitSetup>) => {
      const b = make('warrior', units);
      return previewSkill(b, P0(b).uid, 'evil_eye', E0(b).uid).find((x) => x.uid === E0(b).uid)!.damage!;
    };
    const plain = pv({});
    const tree = pv(unit(['1.f1*3']));
    expect(tree.max / plain.max).toBeGreaterThan(1.08);
    expect(tree.max / plain.max).toBeLessThan(1.16);
  });

  it('Opening Glare: Omen\'siz hedefe isabet eden Evil Eye 2 Omen ekler (ağaçsız 1-2)', () => {
    for (let seed = 1; seed < 40; seed++) {
      const plain = make('warrior', {}, seed);
      const tree = make('warrior', unit(EYE), seed);
      const pe = cast(plain, 'evil_eye');
      const te = cast(tree, 'evil_eye');
      if (!landed(te, E0(tree).uid) || !landed(pe, E0(plain).uid)) continue;
      const crit = pe.some((e) => e.type === 'damage' && e.target === E0(plain).uid && e.crit);
      if (crit) continue; // kritikte ağaçsız da 2 Omen verir
      expect(E0(plain).statuses.find((s) => s.kind === 'omen')?.stacks).toBe(1);
      expect(E0(tree).statuses.find((s) => s.kind === 'omen')?.stacks).toBe(2);
      expect(tree.treeProcs().some((p) => p.node === 'hexer:1.n0')).toBe(true);
      return;
    }
    throw new Error('isabet eden kritik olmayan Evil Eye bulunamadı');
  });

  it('Lasting Jinx: Jinxed 3 tur sürer (ağaçsız 2)', () => {
    for (let seed = 1; seed < 40; seed++) {
      const plain = make('warrior', {}, seed);
      const tree = make('warrior', unit(JINX), seed);
      cast(plain, 'jinx');
      cast(tree, 'jinx');
      const pj = E0(plain).statuses.find((s) => s.kind === 'jinxed');
      const tj = E0(tree).statuses.find((s) => s.kind === 'jinxed');
      if (!pj || !tj) continue;
      expect(pj.turns).toBe(2);
      expect(tj.turns).toBe(3);
      return;
    }
    throw new Error('Jinx isabet etmedi');
  });

  it('Crushing Doom: Doom büyü zırhının %25\'ini yok sayar (aynı seed, daha çok hasar)', () => {
    const doom = (units: Record<number, UnitSetup>, seed: number): number => {
      const b = make('mage', units, seed);
      const e = E0(b);
      e.stats = { ...e.stats, magicArmor: 60 };
      e.hp = e.maxHp = 99999;
      e.statuses.push({ kind: 'omen', turns: 4, source: P0(b).uid, stacks: 2 });
      const evs = cast(b, 'doom_mark');
      const at = evs.findIndex((x) => x.type === 'doom');
      return at < 0 ? -1 : evs.slice(at).reduce((s, x) => s + (x.type === 'damage' && x.target === e.uid ? x.amount + x.absorbed : 0), 0);
    };
    const u = unit(['0.f1*3', '0.f2*5', '0.f3*2', '0.n0', '0.r', '0.ea']);
    for (let seed = 1; seed < 40; seed++) {
      const plain = doom({}, seed);
      const tree = doom(u, seed);
      if (plain <= 0 || tree <= 0) continue;
      expect(tree).toBeGreaterThan(plain);
      return;
    }
    throw new Error('Doom Mark isabet etmedi');
  });
});
