import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2b (Gambler): data/skill-trees/gambler.json fx'leri temiz derlenir ve savaşta gerçekten etki eder
// (ağaçlı / ağaçsız aynı seed). Örnekler: Last Breath (4.l3), Cold Deck (3.fa), Swift Suit (3.f3), Penny Ante (2.fb).

const G = treeOf('gambler')!;
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (units: Record<number, UnitSetup> = {}, seed = 11): Battle => {
  const teams: Teams = { party: cells({ 0: 'gambler' }), enemies: cells({ 0: 'warrior', 1: 'defender' }), units: { party: units, enemies: {} } };
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
const setup = (steps: string[]) => compileTree(G, alloc(G, 30, steps))!;
const unit = (steps: string[]): Record<number, UnitSetup> => ({ 0: { tree: setup(steps) } });
const P0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party')!;
const E0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
function cast(b: Battle, skill: string, target?: string): BattleEvent[] {
  const from = b.log.length;
  P0(b).cooldowns[skill] = 0;
  P0(b).mp = P0(b).maxMp;
  const r = b.useSkill(P0(b).uid, skill, target);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}
const busts = (evs: BattleEvent[]): number => evs.filter((e) => e.type === 'passive' && e.passive === 'gamble_lose').length;

describe('Gambler ağacı (Faz 2b)', () => {
  it('tüm fx\'ler temiz derlenir', () => {
    expect(checkTreeFx(G)).toEqual([]);
  });

  it('Last Breath: canın %25\'in altındayken All In hep Jackpot (ağaçsız Bust da olur)', () => {
    let plain = 0;
    let tree = 0;
    for (let seed = 1; seed <= 30; seed++) {
      for (const [units, add] of [[{}, (n: number) => (plain += n)], [unit(['4.l1', '4.l2', '4.l3']), (n: number) => (tree += n)]] as const) {
        const b = make(units, seed);
        P0(b).hp = Math.floor(P0(b).maxHp * 0.2);
        E0(b).hp = E0(b).maxHp = 99999;
        add(busts(cast(b, 'all_in', E0(b).uid)));
      }
    }
    expect(plain).toBeGreaterThan(0);
    expect(tree).toBe(0);
  });

  it('Cold Deck: Card Trick her vurduğuna Stun verir; cooldown 5', () => {
    const t = setup(['1.f1*2', '3.f1*3', '3.f2*5', '3.f3*2', '3.n0', '3.r', '3.ea', '3.fa']);
    expect(t.skills!.card_trick!.cooldown).toBe(5);
    for (let seed = 1; seed < 40; seed++) {
      const b = make({ 0: { tree: t } }, seed);
      for (const e of b.combatants.filter((c) => c.side === 'enemy')) e.hp = e.maxHp = 99999;
      const evs = cast(b, 'card_trick');
      const hit = [...new Set(evs.filter((e) => e.type === 'damage' && e.target !== P0(b).uid).map((e) => (e as { target: string }).target))];
      if (!hit.length) continue;
      for (const uid of hit) expect(b.get(uid)!.statuses.some((s) => s.kind === 'stun')).toBe(true);
      return;
    }
    throw new Error('Card Trick isabet etmedi');
  });

  it('Swift Suit: Slow olasılığı mutlak +%5 / rank (rank 5: %65), Wound / Stun orantılı', () => {
    const rs = setup(['3.f1*3', '3.f2*5', '3.f3*5']).skills!.card_trick!.effects.find((e) => e.type === 'randomStatus')!;
    const opts = (rs as Extract<typeof rs, { type: 'randomStatus' }>).options;
    const total = opts.reduce((s, o) => s + o.weight, 0);
    const p = (k: string) => opts.find((o) => o.status === k)!.weight / total;
    expect(p('slow')).toBeCloseTo(0.65, 5);
    expect(p('wound')).toBeCloseTo(0.35 * (2 / 3), 5);
    expect(p('stun')).toBeCloseTo(0.35 / 3, 5);
  });

  it('Penny Ante: Bust\'ta kaybedilen can ağaçsızın yarısından az (bahis %15 -> %5, Cautious Wager 1 ile %4)', () => {
    const steps = ['0.f1*3', '0.f2*3', '2.f1*3', '2.f2', '2.f3', '2.n0', '2.r*3', '2.eb', '2.fb'];
    for (let seed = 1; seed < 80; seed++) {
      const lost = (units: Record<number, UnitSetup>): number | null => {
        const b = make(units, seed);
        E0(b).hp = E0(b).maxHp = 99999;
        const evs = cast(b, 'high_stakes', E0(b).uid);
        if (!busts(evs)) return null;
        return evs.reduce((s, e) => s + (e.type === 'damage' && e.target === P0(b).uid && e.origin === 'self' ? e.amount + e.absorbed : 0), 0);
      };
      const plain = lost({});
      const tree = lost(unit(steps));
      if (plain === null || tree === null) continue;
      expect(plain).toBeGreaterThan(0);
      expect(tree).toBeLessThan(plain * 0.5);
      return;
    }
    throw new Error('iki savaşta da Bust bulunamadı');
  });
});
