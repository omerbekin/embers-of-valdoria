import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// engine-dev 2026-10-29 (Ömer formu, open-questions 457): üç yeni tetik olayı ve düğümleri.
// crash -> Battering Frost (Mage 3.fa: çarpan hedef 1 tur Stun), instinct -> Ready Reflexes (AM 0.ma: 1 tur Fleet),
// threadConsumed -> Snapping Thread (AM 0.mb: Brand ipliği tüketince hedefe INT arcane hasarı).
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  const b = new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
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
const P = (b: Battle, slot?: number): Combatant => b.combatants.find((c) => c.side === 'party' && (slot === undefined || c.slot === slot))!;
const at = (b: Battle, slot: number): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const stunned = (c: Combatant) => c.statuses.some((s) => s.kind === 'stun');

const MAGE_FA = ['3.f1*3', '3.f2*5', '3.f3*5', '3.n0', '3.r*3', '3.ea', '3.ma', '3.fa'];
const MAGE_NO_FA = ['3.f1*3', '3.f2*5', '3.f3*5', '3.n0', '3.r*3', '3.ea', '3.ma'];
const AM_ROW = ['0.f1*3', '0.f2*5', '0.f3*5', '0.n0', '0.r*3'];

describe('yeni tetik olayları: veri', () => {
  it('ağaçlar temiz derlenir, sürümler arttı (bedava respec), düğüm metinleri', () => {
    for (const c of ['mage', 'antimage']) expect(checkTreeFx(treeOf(c)!), c).toEqual([]);
    expect(treeOf('mage')!.version).toBe(4);
    expect(treeOf('antimage')!.version).toBe(5);
    expect(treeOf('mage')!.nodes['3.fa']!.text).toMatch(/Stuns its target/);
    expect(treeOf('antimage')!.nodes['0.ma']!.name).toBe('Ready Reflexes');
    expect(treeOf('antimage')!.nodes['0.mb']!.name).toBe('Snapping Thread');
  });
});

describe('crash -> Battering Frost (Mage 3.fa)', () => {
  const crater = (b: Battle, dir: string, slot = 4): BattleEvent[] => {
    const n = b.log.length;
    const me = P(b);
    me.cooldowns.ice_crater = 0;
    me.mp = me.maxMp;
    expect(b.useSkill(me.uid, 'ice_crater', at(b, slot).uid, undefined, undefined, undefined, undefined, dir as never).ok).toBe(true);
    return b.log.slice(n);
  };

  it('çarpınca itilemeyen hedef 1 tur Stun; çarpılan birim Stun almaz; bedel 16 MP', () => {
    const b = make({ 7: 'mage' }, { 4: 'warrior', 1: 'warrior' }, { 7: { tree: tree('mage', MAGE_FA) } });
    const target = at(b, 4);
    const blocker = at(b, 1);
    const ev = crater(b, 'forward');
    expect(ev.some((e) => e.type === 'crash')).toBe(true);
    expect(target.statuses.find((s) => s.kind === 'stun')?.turns).toBe(1);
    expect(stunned(blocker)).toBe(false);
    expect(b.skill('ice_crater', P(b).uid)!.cost.amount).toBe(16);
  });

  it('itme gerçekleşirse (çarpma yok) Stun yok; düğüm alınmadıysa çarpmada da Stun yok', () => {
    const moved = make({ 7: 'mage' }, { 4: 'warrior' }, { 7: { tree: tree('mage', MAGE_FA) } });
    const foe = at(moved, 4);
    crater(moved, 'back');
    expect(foe.slot).toBe(7);
    expect(stunned(foe)).toBe(false);
    const plain = make({ 7: 'mage' }, { 4: 'warrior', 1: 'warrior' }, { 7: { tree: tree('mage', MAGE_NO_FA) } });
    const t = at(plain, 4);
    expect(crater(plain, 'forward').some((e) => e.type === 'crash')).toBe(true);
    expect(stunned(t)).toBe(false);
  });

  it('tahta kenarına çarpma (wall) da Stun verir', () => {
    // hedef ilk şeritte (yuva 3): 'lanePrev' tahta dışı -> duvara çarpma
    const b = make({ 7: 'mage' }, { 3: 'warrior' }, { 7: { tree: tree('mage', MAGE_FA) } });
    const foe = at(b, 3);
    const ev = crater(b, 'lanePrev', 3);
    expect(ev.find((e) => e.type === 'crash')).toMatchObject({ wall: true });
    expect(stunned(foe)).toBe(true);
  });
});

describe('instinct -> Ready Reflexes (AM 0.ma)', () => {
  const T = content.formulas.turn.threshold;
  const setup = (steps: string[]) => {
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, { 0: { tree: tree('antimage', steps) } }, 11, 'turns');
    const foe = at(b, 0);
    foe.turnCounter = T * 20;
    b.currentUid = foe.uid;
    return { b, foe, am: P(b, 0) };
  };
  const fireBolt = (b: Battle, foe: Combatant, target: string) => {
    b.currentUid = foe.uid;
    foe.cooldowns.fire_bolt = 0;
    foe.mp = foe.maxMp;
    expect(b.useSkill(foe.uid, 'fire_bolt', target).ok).toBe(true);
  };

  it('Instinct işleyince AM 1 tur Fleet alır; tur başına bir (ikinci MP skill yeniden vermez)', () => {
    const { b, foe, am } = setup([...AM_ROW, '0.ea', '0.ma']);
    fireBolt(b, foe, P(b, 1).uid);
    const fleet = am.statuses.filter((s) => s.kind === 'fleet');
    expect(fleet).toHaveLength(1);
    expect(fleet[0]!.turns).toBe(1);
    const n = b.log.length;
    fireBolt(b, foe, am.uid);
    expect(b.log.slice(n).some((e) => e.type === 'status' && (e as { status?: string }).status === 'fleet')).toBe(false);
  });

  it('düğümsüz AM Fleet almaz', () => {
    const { b, foe, am } = setup([...AM_ROW, '0.ea']);
    fireBolt(b, foe, am.uid);
    expect(am.statuses.some((s) => s.kind === 'fleet')).toBe(false);
  });
});

describe('threadConsumed -> Snapping Thread (AM 0.mb)', () => {
  const brandAt = (b: Battle, me: Combatant, slot: number) => {
    me.cooldowns.drain_field = 0;
    me.mp = me.maxMp;
    expect(b.useSkill(me.uid, 'drain_field', undefined, slot).ok).toBe(true);
  };
  const run = (steps: string[], threaded: boolean) => {
    const b = make({ 7: 'antimage' }, { 4: 'warrior', 3: 'warrior' }, { 7: { tree: tree('antimage', steps) } });
    const me = P(b);
    const a = at(b, 4);
    const other = at(b, 3);
    if (threaded) a.statuses.push({ kind: 'ley_thread', turns: 2, source: me.uid });
    const hpA = a.hp;
    const hpO = other.hp;
    brandAt(b, me, 4);
    return { lostA: hpA - a.hp, lostO: hpO - other.hp, a };
  };

  it('Brand ipliği tüketince yalnızca iplikli hedef hasar alır (INT arcane); iplik gider, Brand kalır', () => {
    const r = run([...AM_ROW, '0.eb', '0.mb'], true);
    expect(r.lostA).toBeGreaterThan(0);
    expect(r.lostO).toBe(0);
    expect(r.a.statuses.some((s) => s.kind === 'ley_thread')).toBe(false);
    expect(r.a.statuses.some((s) => s.kind === 'branded')).toBe(true);
  });

  it('iplik yoksa ya da düğüm alınmadıysa hasar yok', () => {
    expect(run([...AM_ROW, '0.eb', '0.mb'], false).lostA).toBe(0);
    expect(run([...AM_ROW, '0.eb'], true).lostA).toBe(0);
  });
});
