import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice, previewSkill, type AiConfig, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2b (Hexer): data/skill-trees/hexer.json fx'leri temiz derlenir ve savaşta gerçekten etki eder
// (ağaçlı / ağaçsız aynı seed karşılaştırması). Örnekler: Prying Eye (1.f1), Opening Glare (1.n0), Lasting Jinx zincir sekmesi (3.ea), Crushing Doom (0.ea).

const H = treeOf('hexer')!;
const ai: AiConfig = { ...content.aiConfig, global: undefined };
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
    const m = 1 + 3 * (H.nodes['1.f1']!.fx![0] as unknown as { mod: { powerMul: number } }).mod.powerMul; // veriden
    expect(tree.max / plain.max).toBeGreaterThan(m - 0.04);
    expect(tree.max / plain.max).toBeLessThan(m + 0.04);
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

  // Lasting Jinx (Ömer 2026-11-15 Tur 22): Jinx %50 (+ Rumour Mill %10 / rank) yan düşmana seker (bounceMax kadar; yoksa zincir, aynı düşmana iki
  // kez değil) ve sekme Jinx hasarının bounceHit oranını vurur (sonraki sekmelerde bounceFalloff düşer). Seken Jinx skill'in kendi etkisiyle iner.
  type Act = { to: string; bounce: boolean; turns: number; bounceMax?: number; bounceHit?: number; bounceFalloff?: number };
  const EA = H.nodes['3.ea']!.fx as unknown as [{ procChance: number; addChanceOf: string[]; do: [Act] }];
  const RM = (H.nodes['3.r']!.fx as unknown as [{ procChance: number }])[0];
  const row = (n: number): Record<number, string> => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, 'warrior']));
  const foes = (b: Battle): Combatant[] => b.combatants.filter((c) => c.side === 'enemy');
  const jinxOf = (c: Combatant) => c.statuses.filter((s) => s.kind === 'jinxed');
  const multi = (units: Record<number, UnitSetup>, enemies: Record<number, string>, seed: number): Battle => {
    const teams: Teams = { party: cells({ 0: 'hexer' }), enemies: cells(enemies), units: { party: units, enemies: {} } };
    return new Battle(content.battleSetup('random-battle', seed, 'test', teams, false));
  };
  /** JINX kurulumu; Lasting Jinx kancasının şansı ve sekme eylemi elle (motor testleri veriden bağımsız; 'data' = veri aynen). */
  const withChance = (p: number, act?: Partial<Act> | 'data'): Record<number, UnitSetup> => {
    const u = unit(JINX);
    const hk = (u[0]!.tree!.hooks ?? []).find((h) => h.node === 'hexer:3.ea' && h.h === 'trigger') as unknown as { procChance?: number; do: Act[] };
    hk.procChance = p;
    if (act !== 'data') {
      const d = hk.do[0]!;
      delete d.bounceMax;
      delete d.bounceHit;
      delete d.bounceFalloff;
      Object.assign(d, act ?? {});
    }
    return u;
  };
  const bouncedBy = (evs: BattleEvent[]) => evs.filter((e) => e.type === 'status' && (e as { status?: string }).status === 'jinxed' && (e as { cause?: string }).cause === 'hexer:3.ea').map((e) => (e as { target: string }).target);
  const sure = (b: Battle) => {
    b.debug.crit = 'never';
    for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0 });
    for (const c of foes(b)) c.hp = c.maxHp = 99999;
  };
  const hitOn = (evs: BattleEvent[], uid: string) => evs.filter((e) => e.type === 'damage' && e.target === uid).reduce((n, e) => n + (e as { amount: number }).amount, 0);

  it('Lasting Jinx veri: %50 şans, Rumour Mill ekli, sekme to adjacentEnemy + bounce + vuruş, ağaçsız Jinx süresi; Jinx beklemesi değişmez', () => {
    // r41 gece: 3a kesimi %50 -> %40; şans veriden, metinle aynı
    expect(H.nodes['3.ea']!.text).toContain(`(${+(EA[0].procChance * 100).toFixed(3)}%`);
    expect(EA[0].addChanceOf).toEqual(['3.r']);
    expect(EA[0].do[0]).toMatchObject({ to: 'adjacentEnemy', bounce: true });
    const base = (content.skills.jinx!.effects.find((e) => e.type === 'status') as { turns: number }).turns;
    expect(EA[0].do[0].turns).toBe(base);
    expect((H.nodes['3.ea']!.fx as unknown as Array<{ f?: string }>).some((f) => f.f === 'cooldown')).toBe(false);
    expect(EA[0].do[0].bounceHit ?? 0).toBeGreaterThan(0);
  });

  it('şans toplamı: Rumour Mill (rank x %10) Lasting Jinx şansına eklenir, Rumour Mill kancası ayrıca düşer; Lasting Jinx yokken Rumour Mill aynen', () => {
    for (const r of [1, 2, 3]) {
      const steps = ['3.f1*3', '3.f2*5', '3.f3*2', '3.n0', '3.r*' + r, '3.ea'];
      const hooks = compileTree(H, alloc(H, 30, steps))!.hooks ?? [];
      const ea = hooks.filter((h) => h.node === 'hexer:3.ea' && h.h === 'trigger') as Array<{ procChance?: number }>;
      expect(ea.length).toBe(1);
      expect(ea[0]!.procChance).toBeCloseTo(Math.min(1, EA[0].procChance + RM.procChance * r), 6);
      expect(hooks.some((h) => h.node === 'hexer:3.r')).toBe(false);
      const noEa = compileTree(H, alloc(H, 30, steps.slice(0, -1)))!.hooks ?? [];
      expect((noEa.find((h) => h.node === 'hexer:3.r') as { procChance?: number }).procChance).toBeCloseTo(RM.procChance * r, 6);
    }
  });

  it('veri yolu: şans 1 iken sekmeler veri kadar (bounceMax), hedefe geri sekmez, kimse iki kez Jinxed almaz; sekenler ağaç gücünü taşır', () => {
    const b = multi(withChance(1, 'data'), row(3), 5);
    const [t] = foes(b);
    const chain = b.aiBounceChain(P0(b), t!);
    expect(chain.length).toBeGreaterThanOrEqual(2); // dizilim gerçekten zincirli
    const got = bouncedBy(cast(b, 'jinx'));
    expect(got).toEqual(chain.slice(0, EA[0].do[0].bounceMax ?? chain.length).map((c) => c.uid));
    expect(got).not.toContain(t!.uid);
    for (const c of foes(b)) expect(jinxOf(c).length).toBeLessThanOrEqual(1);
    // Ömer 2026-11-16 Tur 24: Wobbly Aim isabet eki yerine Blinded (withStatus, güç x rank); sekenler de taşır
    const wob = Math.round(5 * (H.nodes['3.f2']!.fx![0] as unknown as { mod: { withStatus: { strength: number } } }).mod.withStatus.strength * 1000) / 1000;
    for (const uid of got) expect(b.get(uid)!.statuses.find((s) => s.kind === 'blinded')?.strength).toBeCloseTo(wob, 6);
  });

  it('motor: bounceMax yokken zincir tüm yan yana düşmanlara gider; bounceMax 1 ise yalnız ilk', () => {
    const run = (act: Partial<Act>) => {
      const b = multi(withChance(1, act), row(3), 5);
      const chain = b.aiBounceChain(P0(b), foes(b)[0]!);
      return { got: bouncedBy(cast(b, 'jinx')), chain: chain.map((c) => c.uid) };
    };
    const all = run({});
    expect(all.got).toEqual(all.chain);
    const one = run({ bounceMax: 1 });
    expect(one.got).toEqual(one.chain.slice(0, 1));
  });

  it('motor: seken vuruş bounceHit oranıyla vurur, her sekmede bounceFalloff düşer, oran sıfırsa vuruş yok ama Jinxed yine bırakılır', () => {
    const dealt = (act: Partial<Act>) => {
      const b = multi(withChance(1, act), row(3), 5);
      sure(b);
      const chain = b.aiBounceChain(P0(b), foes(b)[0]!);
      const evs = cast(b, 'jinx');
      return { hits: chain.map((c) => hitOn(evs, c.uid)), jinxed: chain.map((c) => jinxOf(c).length) };
    };
    const none = dealt({});
    expect(none.hits.every((x) => x === 0)).toBe(true);
    const full = dealt({ bounceHit: 1 });
    expect(full.hits.every((x) => x > 0)).toBe(true);
    const half = dealt({ bounceHit: 0.5 });
    expect(half.hits[0]! / full.hits[0]!).toBeGreaterThan(0.35);
    expect(half.hits[0]! / full.hits[0]!).toBeLessThan(0.65);
    const fall = dealt({ bounceHit: 1, bounceFalloff: 1 }); // 2. sekme oranı 0
    expect(fall.hits[0]!).toBeGreaterThan(0);
    expect(fall.hits[1]!).toBe(0);
    expect(fall.jinxed[1]!).toBe(1);
  });

  it('zincir şansı: ilk sekme ve sonraki her sekme ~%50 (2 + 1 düşman zinciri, 300 seed)', () => {
    let first = 0;
    let second = 0;
    const N = 300;
    for (let seed = 1; seed <= N; seed++) {
      const b = multi(withChance(0.5, {}), row(3), seed);
      const [t] = foes(b);
      const chain = b.aiBounceChain(P0(b), t!);
      cast(b, 'jinx');
      const got = chain.filter((c) => jinxOf(c).some((s) => s.source === P0(b).uid)).length;
      if (got >= 1) first++;
      if (got >= 2) second++;
    }
    expect(first / N).toBeGreaterThan(0.4);
    expect(first / N).toBeLessThan(0.6);
    expect(second / first).toBeGreaterThan(0.38);
    expect(second / first).toBeLessThan(0.62);
  });

  it('tek düşman: sekecek kimse yok; ağaçsız Jinx sekmez ve Jinxed -%20 kalır', () => {
    const solo = make('warrior', withChance(1), 3);
    cast(solo, 'jinx');
    expect(foes(solo).filter((c) => jinxOf(c).length).length).toBeLessThanOrEqual(1);
    for (let seed = 1; seed < 30; seed++) {
      const p = multi({}, row(2), seed);
      cast(p, 'jinx');
      const [t, n] = foes(p);
      if (!jinxOf(t!).length) continue;
      expect(jinxOf(n!).length).toBe(0);
      expect(jinxOf(t!)[0]!.potency?.accuracyDelta ?? 0).toBe(0);
      return;
    }
    throw new Error('Jinx isabet etmedi');
  });

  it('YZ: zincir beklentisi tree değerine girer; komşu yoksa 0, uzun zincir daha değerli', () => {
    const treeTerm = (units: Record<number, UnitSetup>, enemies: Record<number, string>): number => {
      const b = multi(units, enemies, 11);
      b.debugClearCooldowns();
      P0(b).mp = P0(b).maxMp;
      return Math.max(0, ...explainChoice(b, P0(b).uid, ai)!.candidates.filter((c) => c.skill === 'jinx').map((c) => c.terms?.tree ?? 0));
    };
    const one = treeTerm(unit(JINX), { 0: 'warrior' });
    const two = treeTerm(unit(JINX), row(2));
    const three = treeTerm(unit(JINX), row(3));
    // zincir (bounceMax yok) uzadıkça değer artar
    expect(treeTerm(withChance(0.6, {}), row(3))).toBeGreaterThan(treeTerm(withChance(0.6, {}), row(2)));
    expect(one).toBe(0);
    expect(two).toBeGreaterThan(0);
    expect(three).toBeGreaterThanOrEqual(two);
    expect(treeTerm({}, row(3))).toBe(0);
    // şans yükselince değer artar (beklenti procChance'a bağlı)
    expect(treeTerm(withChance(1, 'data'), row(3))).toBeGreaterThan(three);
    // sekme hasarı değere girer
    expect(treeTerm(withChance(1, { bounceHit: 1 }), row(3))).toBeGreaterThan(treeTerm(withChance(1, {}), row(3)));
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

  it("Doom Gaze (1.mb): Evil Eye'ın tamamladığı Doom güçlü; Doom Mark'ın patlattığı Doom değişmez (doomSource)", () => {
    const mul = (H.nodes['1.mb']!.fx![0] as unknown as { mod: { powerMul: number }; when: { doomSource: string } });
    expect(mul.when.doomSource).toBe('evil_eye');
    const base = [...EYE, '1.r*3', '1.eb'];
    /** Omen'i tamamlanmaya bir kala hedefe skill atar; Doom'un hasarı (sonrası) ve Doom Gaze sayacı. */
    const doom = (steps: string[], skill: string, seed: number): { dmg: number; procs: number } => {
      const b = make('mage', unit(steps), seed);
      const e = E0(b);
      e.hp = e.maxHp = 99999;
      const max = content.statuses['omen']!.maxStacks!;
      e.statuses.push({ kind: 'omen', turns: 4, source: P0(b).uid, stacks: max - 1 });
      const evs = cast(b, skill);
      const at = evs.findIndex((x) => x.type === 'doom');
      const dmg = at < 0 ? -1 : evs.slice(at).reduce((s, x) => s + (x.type === 'damage' && x.target === e.uid ? x.amount + x.absorbed : 0), 0);
      return { dmg, procs: b.treeProcs().find((p) => p.node === 'hexer:1.mb')?.count ?? 0 };
    };
    let checked = false;
    for (let seed = 1; seed < 60 && !checked; seed++) {
      const plain = doom(base, 'evil_eye', seed);
      const gaze = doom([...base, '1.mb'], 'evil_eye', seed);
      if (plain.dmg <= 0 || gaze.dmg <= 0) continue;
      expect(gaze.procs).toBe(1);
      expect(gaze.dmg / plain.dmg).toBeGreaterThan(1 + mul.mod.powerMul - 0.04);
      expect(gaze.dmg / plain.dmg).toBeLessThan(1 + mul.mod.powerMul + 0.04);
      checked = true;
    }
    expect(checked, 'Evil Eye isabet edip Doom getirmedi').toBe(true);
    // başka skill'in getirdiği Doom: düğüm işlemez (aynı seed aynı hasar, sayaç 0)
    let other = false;
    for (let seed = 1; seed < 60 && !other; seed++) {
      const plain = doom(base, 'doom_mark', seed);
      const gaze = doom([...base, '1.mb'], 'doom_mark', seed);
      if (plain.dmg <= 0) continue;
      expect(gaze).toEqual({ dmg: plain.dmg, procs: 0 });
      other = true;
    }
    expect(other, 'Doom Mark isabet etmedi').toBe(true);
  });
});
