import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// content-designer 2026-10-29 (open-questions 457): Mage (Heat Mirage / Ice Crater satırları, Opening Spark) ve AM (Spellbreaker's Instinct /
// Ley Thread satırı, Threaded Void, Ready Stance) yeni düğümleri + Druid Mire. Yalnızca var olan fx sözlüğü; tek yeni derleyici alanı push.crashPower.
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  const b = new Battle(content.battleSetup('random-battle', seed, 'test', teams, false));
  b.debug.crit = 'never';
  for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0 });
  for (const c of b.combatants) c.hp = c.maxHp = 5000;
  return b;
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
const tree = (cls: string, steps: string[], level = 30) => compileTree(treeOf(cls)!, alloc(treeOf(cls)!, level, steps))!;
const P = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party')!;
/** Düşman tahtasında o yuvadaki birim (uid sırası yuva sırasıdır, yuva numarası değil). */
const at = (b: Battle, slot: number): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const crater = (b: Battle, dir: string, slot = 4): BattleEvent[] => {
  const n = b.log.length;
  P(b).cooldowns.ice_crater = 0;
  P(b).mp = P(b).maxMp;
  expect(b.useSkill(P(b).uid, 'ice_crater', at(b, slot).uid, undefined, undefined, undefined, undefined, dir as never).ok).toBe(true);
  return b.log.slice(n);
};
const ROW = ['f1*3', 'f2*5', 'f3*5'];

describe('Mage / AM / Druid ağaç yenilemesi: veri', () => {
  it('üç ağaç temiz derlenir, Mage / AM ağacında inactive düğüm kalmadı, sürüm artışı (bedava respec)', () => {
    for (const c of ['mage', 'antimage', 'druid']) expect(checkTreeFx(treeOf(c)!), c).toEqual([]);
    for (const c of ['mage', 'antimage']) {
      const t = treeOf(c)!;
      for (const [k, n] of Object.entries(t.nodes)) expect(n.inactive, `${c} ${k}`).toBeFalsy();
      for (const bar of t.mastery.bar) expect(bar.inactive, `${c} ${bar.name}`).toBeFalsy();
      expect(JSON.stringify(t.nodes)).not.toMatch(/Spell Echo|Mana Barrier|Mana Overflow/);
    }
    expect(treeOf('mage')!.version).toBe(4);
    expect(treeOf('antimage')!.version).toBe(5);
    expect(treeOf('druid')!.version).toBe(2);
    // Mire: 'Slows on impact' kalktı (kök tarlası içindekine o an Slow veriyor)
    expect(JSON.stringify(treeOf('druid')!.nodes['2.fa']!.fx)).not.toMatch(/"slow"/);
  });
});

describe('Mage: Ice Crater satırı', () => {
  // Mage 2. sıra orta (yuva 7); düşmanlar 4 (hedef) ve 1 (önündeki engel)
  it('Hard Landing: çarpma hasarı rank başına %10 fazla (push.crashPower yaması)', () => {
    const crash = (units: Record<number, UnitSetup>) => {
      const b = make({ 7: 'mage' }, { 4: 'warrior', 1: 'warrior' }, units);
      const blocker = b.combatants.find((c) => c.side === 'enemy' && c.slot === 1)!;
      const hp = blocker.hp;
      crater(b, 'forward');
      return hp - blocker.hp;
    };
    const base = crash({});
    const more = crash({ 7: { tree: tree('mage', ['3.f1*3', '3.f2*5']) } });
    expect(base).toBeGreaterThan(0);
    expect(more).toBeGreaterThan(base);
  });

  it('Frozen Crater: hedefin itildiği hücrede 2 turluk Chill Ground', () => {
    const b = make({ 7: 'mage' }, { 4: 'warrior' }, { 7: { tree: tree('mage', [...ROW.map((s) => `3.${s}`), '3.n0']) } });
    const foe = at(b, 4);
    crater(b, 'back');
    expect(foe.slot).toBe(7);
    const g = (b as unknown as { ground: { ground: string; board: string; slots: number[]; turns: number }[] }).ground.filter((x) => x.ground === 'storm');
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ board: foe.board, slots: [7], turns: 2 });
    expect(foe.statuses.some((s) => s.kind === 'chilled')).toBe(true);
  });
});

describe('Mage / AM: tetikler savaşta', () => {
  const hitMage = (b: Battle, skill: string) => {
    const w = at(b, 1);
    w.cooldowns[skill] = 0;
    expect(b.useSkill(w.uid, skill, P(b).uid).ok).toBe(true);
    return w;
  };

  it('Mirage Veil (0.v): yakın dövüşçünün yanlarına da Burning Ground, saldıran Chilled', () => {
    const steps = ['0.f1*3', '0.f2*5', '0.f3*5', '0.n0', '0.r*3', '0.eb', '0.mb', '1.f1*3', '1.f2', '0.v'];
    const b = make({ 1: 'mage' }, { 1: 'warrior', 0: 'warrior', 2: 'warrior' }, { 1: { tree: tree('mage', steps) } });
    const w = hitMage(b, 'melee_attack');
    expect(w.statuses.some((s) => s.kind === 'chilled')).toBe(true);
    const cellsHit = (b as unknown as { ground: { ground: string; slots: number[] }[] }).ground.filter((g) => g.ground === 'burning').flatMap((g) => g.slots);
    expect(new Set(cellsHit)).toEqual(new Set([0, 1, 2]));
  });

  it('Glacier Crater (3.v): hedefin yanındaki düşmanlar da hasar + Chilled alır', () => {
    const steps = [...ROW.map((s) => `3.${s}`), '3.n0', '3.r*3', '3.eb', '3.mb', '1.f1*3', '1.f2', '3.v'];
    const b = make({ 7: 'mage' }, { 4: 'warrior', 3: 'warrior', 5: 'warrior' }, { 7: { tree: tree('mage', steps) } });
    const side = b.combatants.filter((c) => c.side === 'enemy' && c.slot !== 4);
    const hp = side.map((c) => c.hp);
    crater(b, 'back');
    side.forEach((c, i) => {
      expect(c.hp).toBeLessThan(hp[i]!);
      expect(c.statuses.some((s) => s.kind === 'chilled')).toBe(true);
    });
  });

  it('Threaded Void (4.d3): Void Strike hedefe Ley Thread bırakır', () => {
    const b = make({ 7: 'antimage' }, { 4: 'warrior' }, { 7: { tree: tree('antimage', ['4.d1', '4.d2', '4.d3']) } });
    const am = P(b);
    am.cooldowns.void_strike = 0;
    am.mp = am.maxMp;
    expect(b.useSkill(am.uid, 'void_strike', 'enemy-0').ok).toBe(true);
    expect(b.get('enemy-0')!.statuses.find((s) => s.kind === 'ley_thread')?.turns).toBe(2);
  });

  it('Twin Thread (0.eb): Mana Steal yanındaki bir düşmana da iplik', () => {
    const steps = ['0.f1*3', '0.f2*5', '0.f3*5', '0.n0', '0.r', '0.eb'];
    const b = make({ 7: 'antimage' }, { 4: 'warrior', 5: 'warrior' }, { 7: { tree: tree('antimage', steps) } });
    expect(b.useSkill(P(b).uid, 'mana_burn', 'enemy-0').ok).toBe(true);
    const threaded = b.combatants.filter((c) => c.side === 'enemy' && c.statuses.some((s) => s.kind === 'ley_thread'));
    expect(threaded).toHaveLength(2);
  });
});

describe('Mage / AM: pasif satırı yamaları', () => {
  it('Lingering Mirage: Heat Mirage zemini 2 tur; Searing Mirage gücü artırır', () => {
    const b = make({ 7: 'mage' }, { 4: 'warrior' }, { 7: { tree: tree('mage', ['0.f1*3', '0.f2*5', '0.f3*5', '0.n0']) } });
    const e = P(b).passive!.effect as { type: string; turns: number; power: number };
    expect(e.type).toBe('heatMirage');
    expect(e.turns).toBe(2);
    expect(e.power).toBeGreaterThan((content.classes.mage!.passive!.effect as { power: number }).power);
  });

  it("Keen Senses: Spellbreaker's Instinct advance rank başına +0,02", () => {
    const b = make({ 7: 'antimage' }, { 4: 'warrior' }, { 7: { tree: tree('antimage', ['0.f1*3']) } });
    const base = (content.classes.antimage!.passive!.effect as { advance: number }).advance;
    expect((P(b).passive!.effect as { advance: number }).advance).toBeCloseTo(base + 0.06, 6);
  });
});
