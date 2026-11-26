import { describe, expect, it } from 'vitest';
import { Battle, content, describeSkill, previewSkill, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2b (Warrior): data/skill-trees/warrior.json fx'leri savaşta gerçekten etki eder (ağaçlı / ağaçsız aynı seed karşılaştırması).

const W = treeOf('warrior')!;
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
const tree = (steps: string[], level = 30) => compileTree(W, alloc(W, level, steps))!;
const P0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party')!;
const E0 = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
const procs = (b: Battle, node: string): number => b.treeProcs().find((p) => p.node === node)?.count ?? 0;
function cast(b: Battle, uid: string, skill: string, target?: string): BattleEvent[] {
  const from = b.log.length;
  b.get(uid)!.cooldowns[skill] = 0;
  const r = b.useSkill(uid, skill, target);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}

describe('Warrior ağacı fx (Faz 2b)', () => {
  it('veri temiz: tüm düğümler tek başına derlenir', () => {
    expect(checkTreeFx(W)).toEqual([]);
  });

  it('Gut Strike + Deep Gash: ilk vuruş 4 turluk Wound verir, ikinci vuruş Wound\'lı hedefe +%20 vurur', () => {
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: { tree: tree(['1.f1*3', '1.f2*5', '1.f3*2', '1.n0', '1.r*3', '1.eb']) } });
    const e = E0(b);
    e.stats = { ...e.stats, evasion: -5 };
    const evs = cast(b, P0(b).uid, 'melee_attack', e.uid);
    const dmg = evs.map((x, i) => [x, i] as const).filter(([x]) => x.type === 'damage' && x.target === e.uid);
    const wound = evs.findIndex((x) => x.type === 'status' && x.target === e.uid && x.status === 'wound');
    expect(dmg).toHaveLength(2);
    expect(wound).toBeGreaterThan(dmg[0]![1]);
    expect(wound).toBeLessThan(dmg[1]![1]);
    expect(e.statuses.find((s) => s.kind === 'wound')?.turns).toBe(4);
    expect(procs(b, 'warrior:1.n0')).toBeGreaterThanOrEqual(1);
    expect(procs(b, 'warrior:1.eb')).toBe(1);
  });

  it('Rolling Start: henüz eylem yapmamış hedefe Charge önizlemesi rank x değer kadar yüksek (rank 3; değer veriden, D9 2026-10-23)', () => {
    const avg = (withTree: boolean) => {
      const b = make({ 0: 'warrior' }, { 0: 'archer' }, withTree ? { 0: { tree: tree(['3.f1*3']) } } : {});
      return previewSkill(b, P0(b).uid, 'charge', E0(b).uid).find((x) => x.uid === E0(b).uid)!.damage!.avg;
    };
    expect(avg(true) / avg(false)).toBeCloseTo(1 + 3 * (W.nodes['3.f1']!.fx![0] as unknown as { mod: { powerMul: number } }).mod.powerMul, 1);
    expect(avg(true)).toBeGreaterThan(avg(false));
  });

  it('Reckless Heat (r43, Ömer seçimi A): Charge Stun atar, 30 Rage verir, Warrior kendine Fortified alır; hasar bonusu yok', () => {
    const steps = ['3.f1*3', '3.f2*5', '3.f3*2', '3.n0', '3.r*3', '3.eb', '3.fb'];
    const fx = W.nodes['3.fb']!.fx! as unknown as Array<{ k: string; h?: string; gain?: number; effect?: { status: string; turns: number; self?: boolean }; f?: string; v?: number }>;
    const gain = fx.find((f) => f.h === 'rage')!.gain!;
    const fort = fx.find((f) => f.k === 'addEffect')!.effect!;
    const cd = fx.find((f) => f.f === 'cooldown')!.v!;
    expect(fort).toMatchObject({ status: 'fortify', self: true });
    const b = make({ 0: 'warrior' }, { 0: 'archer' }, { 0: { tree: tree(steps) } });
    const me = P0(b);
    const e = E0(b);
    e.stats = { ...e.stats, evasion: -5 };
    me.rage = 0;
    cast(b, me.uid, 'charge', e.uid);
    const baseStun = content.skills['charge']!.effects.find((x) => x.type === 'status' && x.status === 'stun') as { turns: number };
    expect(e.statuses.find((s) => s.kind === 'stun')?.turns).toBe(baseStun.turns); // taban Charge'daki gibi
    expect(me.statuses.find((s) => s.kind === 'fortify')?.turns).toBe(fort.turns);
    expect(me.rage).toBeGreaterThanOrEqual(gain);
    expect(procs(b, 'warrior:3.fb')).toBeGreaterThanOrEqual(1);
    // bekleme ağaçla 3, güç taban Charge'ınkiyle aynı (yalnız Rolling Start vb. kendi koşullu kancaları)
    const sk = tree(steps).skills!['charge']!;
    expect(sk.cooldown).toBe(cd);
    const pow = (d: typeof sk) => (d.effects.find((x) => x.type === 'damage') as { power: number }).power;
    expect(pow(sk)).toBeCloseTo(pow(content.skills['charge']!), 6);
  });

  it('Reckless Heat: Charge tooltip yazısı ağaç bölümünde kancanın Rage miktarını yazar; ağaçsız yazmaz', () => {
    const steps = ['3.f1*3', '3.f2*5', '3.f3*2', '3.n0', '3.r*3', '3.eb', '3.fb'];
    const gain = (W.nodes['3.fb']!.fx!.find((f) => (f as unknown as { h?: string }).h === 'rage') as unknown as { gain: number }).gain;
    const withTree = tree(steps).skills!['charge']!;
    const info = describeSkill(withTree, content.classes.warrior!.stats, content.formulas);
    expect(info.treeLines?.some((l) => l.includes(`${gain} Rage`))).toBe(true);
    expect(describeSkill(content.skills['charge']!, content.classes.warrior!.stats, content.formulas).treeLines ?? []).toEqual([]);
  });
});
