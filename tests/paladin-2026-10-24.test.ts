import { describe, expect, it } from 'vitest';
import { attributePower, Battle, chooseAction, content, describePassive, describeSkill, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { compileTree, treeOf } from '../src/progression';
import { screenCellOf, shapeCells } from '../src/engine/area-shape';
import type { TreeData } from '../src/progression/skill-tree-data';

// Ömer 2026-10-24 Paladin kararları (open-questions 416): Divine Light %35 INT, No Rest for Evil %35, Crusader's Dawn (smite.dual 1,25:
// her tur hem şifa hem smite, ikisi de %25 güçlü; smite gerçekleşen şifadan bağımsız), Radiance yeniden 'herkese' (D11 geri alındı),
// Judgment tek hücre.

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', 11, 'turns', teams, false));
};
function only(ranks: Record<string, number>): UnitSetup['tree'] {
  const t = JSON.parse(JSON.stringify(treeOf('paladin')!)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((b) => (b.fx = null));
  return compileTree(t, { v: t.version, r: { ...ranks } });
}
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot && !c.summoned)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
function nextTurn(b: Battle, c: Combatant): BattleEvent[] {
  const from = b.log.length;
  if (b.currentActor === c) expect(b.skipTurn().ok).toBe(true);
  for (let i = 0; i < 30 && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
  return b.log.slice(from);
}
const healTo = (evs: BattleEvent[], src: Combatant, t: Combatant): number => evs.reduce((s, e) => s + (e.type === 'heal' && e.source === src.uid && e.target === t.uid ? e.amount : 0), 0);
const dmgTo = (evs: BattleEvent[], src: Combatant, t: Combatant): number => evs.reduce((s, e) => s + (e.type === 'damage' && e.source === src.uid && e.target === t.uid ? e.amount + e.absorbed : 0), 0);

/** Paladin (0) + Warrior (1) vs iki Warrior; E1 canı yarıda (en zayıf düşman). `hurt`: dost Warrior'ın eksik canı. */
function setup(ranks: Record<string, number> | null, hurt: number) {
  const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'warrior', 1: 'warrior' }, ranks ? { 0: { tree: only(ranks) } } : {});
  const me = P(b);
  const ally = P(b, 1);
  ally.maxHp = 100000;
  ally.hp = ally.maxHp - hurt;
  for (const c of b.combatants) if (c.side === 'enemy') c.maxHp = c.hp = 100000;
  E(b, 1).hp = 50000;
  return { b, me, ally, foe: E(b, 1) };
}
const dlPower = (): number => (content.classes.paladin!.passive!.effect as { power: number }).power;

describe('Paladin 2026-10-24: veri', () => {
  it('Divine Light %35 INT; No Rest for Evil idle 0,35 ve metni %35; Crusader\'s Dawn smite.dual 1,25 + öldürünce 5 MP', () => {
    expect(content.classes.paladin!.passive!.effect).toMatchObject({ type: 'divineLight', power: 0.27, scale: 'int' });
    const n = treeOf('paladin')!.nodes;
    expect(n['0.n0']!.text).toContain('27% INT');
    expect(JSON.stringify(n['0.n0']!.fx)).toContain('"idle":0.27');
    expect(n['0.v']!.fx).toEqual([
      { k: 'hook', h: 'target', smite: { dual: 1.25 } },
      { k: 'hook', h: 'trigger', on: 'kill', via: 'smite', do: [{ mp: 5 }] },
    ]);
  });

  it('Radiance yeniden herkese: tüm dostlara şifa + tüm düşmanlara kutsal hasar, alan / zemin yok (Holy Ground artık yalnız Judgment kullanır)', () => {
    const r = content.skills.radiance!;
    expect(r.target).toBe('everyone');
    expect(r.area).toBeUndefined();
    expect(r.effects.map((e) => e.type)).toEqual(['heal', 'damage']);
    expect(r.effects[0]).toMatchObject({ power: 0.405, missingHpBonus: 0.5 });
    expect(r.effects[1]).toMatchObject({ power: 0.394, element: 'holy', damageType: 'magic' });
    expect(r.effects.some((e) => 'side' in e)).toBe(false);
    expect(content.skills.radiance!.effects.some((e) => e.type === 'ground')).toBe(false);
    expect(content.skills.pt_radiance!.target).toBe('everyone');
  });

  it('Judgment tek hücre (rect 1x1), iki tahtaya (area_any): her anchor yalnızca kendi hücresi; düşmana burst 0,35 + holy fire 0,45, dosta anlık şifa 0,35 + holy ground 0,45; bedel 16, bekleme 3', () => {
    const j = content.skills.judgment!;
    expect(j).toMatchObject({ target: 'area_any', area: { shape: 'rect', rows: 1, cols: 1 }, cost: { resource: 'mp', amount: 16 }, cooldown: 3 });
    expect(j.effects).toEqual([
      expect.objectContaining({ type: 'damage', damageType: 'magic', element: 'holy', scale: 'int', power: 0.3, side: 'enemies' }),
      expect.objectContaining({ type: 'heal', scale: 'int', power: 0.3, side: 'allies' }),
      expect.objectContaining({ type: 'ground', ground: 'holy_fire', turns: 2, scale: 'int', power: 0.38, side: 'enemies' }),
      expect.objectContaining({ type: 'ground', ground: 'holy_ground', turns: 2, scale: 'int', power: 0.38, side: 'allies' }),
    ]);
    expect(content.grounds.holy_ground).toMatchObject({ name: 'Holy Ground', heal: true });
    expect(content.skills.pt_judgment!.target).toBe('area_any');
    expect(content.skills.radiance!.cost.amount).toBe(24);
    const b = make({ 0: 'paladin' }, { 0: 'warrior' });
    for (let s = 0; s < content.CELL_COUNT; s++) {
      expect(b.areaCells('judgment', s, 'enemy')).toEqual([s]);
      expect(b.areaCells('judgment', s, 'party')).toEqual([s]);
    }
    expect(content.skills.pt_judgment!.area).toEqual(j.area);
  });
});

describe("Paladin 2026-10-24: Crusader's Dawn (smite.dual)", () => {
  it('şifa ağaçsız Divine Light\'ın 1,25 katı', () => {
    const base = setup(null, 50000);
    const dual = setup({ '0.v': 1 }, 50000);
    const h0 = healTo(nextTurn(base.b, base.me), base.me, base.ally);
    const h1 = healTo(nextTurn(dual.b, dual.me), dual.me, dual.ally);
    expect(h0).toBeGreaterThan(0);
    expect(Math.abs(h1 - Math.round(h0 * 1.25))).toBeLessThanOrEqual(1);
  });

  it('smite = INT gücü x pasif gücü x 1,25: şifa çok küçük olsa da, hiç yaralı dost yokken de aynı; No Rest for Evil üstüne eklenmez', () => {
    const run = (ranks: Record<string, number>, hurt: number) => {
      const s = setup(ranks, hurt);
      const evs = nextTurn(s.b, s.me);
      const want = s.b.tickDamage('holy', 'magic', Math.round(attributePower(s.me.stats, 'int', content.formulas) * dlPower() * 1.25), s.foe);
      return { dmg: dmgTo(evs, s.me, s.foe), want, other: dmgTo(evs, s.me, E(s.b, 0)) };
    };
    const big = run({ '0.v': 1 }, 50000);
    expect(big.dmg).toBeGreaterThan(0);
    expect(big.dmg).toBe(big.want);
    expect(big.other).toBe(0); // en zayıf düşmana
    const tiny = run({ '0.v': 1 }, 1); // şifa 1 can: smite yine tam
    expect(tiny.dmg).toBe(big.dmg);
    const idle = run({ '0.v': 1 }, 0); // yaralı dost yok: yalnız smite
    expect(idle.dmg).toBe(big.dmg);
    const withNoRest = run({ '0.v': 1, '0.n0': 1 }, 0); // idle yerine geçer
    expect(withNoRest.dmg).toBe(big.dmg);
  });

  it('Vengeful Light (mul 2) ve Twofold Light (power) hâlâ işler', () => {
    const run = (ranks: Record<string, number>) => {
      const s = setup(ranks, 0);
      return { dmg: dmgTo(nextTurn(s.b, s.me), s.me, s.foe), s };
    };
    const base = run({ '0.v': 1 });
    const fa = run({ '0.v': 1, '0.fa': 1 }); // pasif gücü -%40, smite x2 => 0,6 x 2 = 1,2 kat
    expect(fa.dmg / base.dmg).toBeGreaterThan(1.1);
    expect(fa.dmg / base.dmg).toBeLessThan(1.3);
    const ea = run({ '0.v': 1, '0.ea': 1 });
    expect(ea.dmg).toBeGreaterThan(base.dmg);
  });

  it('smite öldürünce 5 MP iade', () => {
    const run = (foeHp: number) => {
      const s = setup({ '0.v': 1 }, 0);
      s.foe.hp = foeHp;
      s.me.mp = 0; // tur başı yenilenmesi iki koşuda aynı; fark yalnızca iade
      nextTurn(s.b, s.me);
      return { mp: s.me.mp, dead: s.foe.hp <= 0 };
    };
    const kill = run(1);
    const live = run(50000);
    expect(kill.dead).toBe(true);
    expect(live.dead).toBe(false);
    expect(kill.mp - live.mp).toBe(5);
  });

  it('pasif açıklaması iki etkiyi ve %25 güçlü miktarı yazar', () => {
    const s = setup({ '0.v': 1 }, 0);
    const text = describePassive(s.me.passive!, s.me.stats, content.formulas);
    expect(text).toContain('smite the weakest enemy');
    expect(text).toContain(`${Math.round(dlPower() * 1.25 * 100)}%`);
  });
});

// Ömer 2026-10-24 ikinci karar (open-questions 416/6): Broad Sentence = hedefin EKRANDA sol + sağ hücresi, Scattered Flame = üst + alt (-%30 bedeli
// aynı); ikisi birlikte eski artı. Broad Sentence ile Wildfire Verdict ağaçta yer değiştirdi (3.mb <-> 3.eb), ağaç sürümü 2.
describe('Paladin 2026-10-24: Judgment ağaç düğümleri', () => {
  const F = content.formulas.formation;
  const twoPaladins = (ranks: Record<string, number>, foe = 0) => {
    const b = make({ 0: 'paladin', 1: 'paladin' }, { [foe]: 'warrior' }, { 0: { tree: only(ranks) } });
    return { b, me: P(b), plain: P(b, 1) };
  };
  const want = (s: number, h: boolean, v: boolean): number[] => {
    const a = screenCellOf(F, 'enemy', s);
    return Array.from({ length: content.CELL_COUNT }, (_, i) => i).filter((i) => {
      const c = screenCellOf(F, 'enemy', i);
      const dc = Math.abs(c.col - a.col);
      const dr = Math.abs(c.row - a.row);
      return i === s || (h && dr === 0 && dc === 1) || (v && dc === 0 && dr === 1);
    });
  };

  it('yerleşim: 3.eb = Wildfire Verdict (etkisi aynı), 3.mb = Broad Sentence, 3.fb = Scattered Flame; sürüm 2', () => {
    const t = treeOf('paladin')!;
    expect(t.version).toBe(2);
    expect(t.nodes['3.eb']!.name).toBe('Wildfire Verdict');
    expect(t.nodes['3.mb']!.name).toBe('Broad Sentence');
    expect(t.nodes['3.mb']!.text).toBe('Judgment also reaches the cells to the left and right of its target.');
    expect(t.nodes['3.mb']!.fx).toEqual([{ k: 'hook', h: 'target', area: { flankH: true } }]);
    expect(t.nodes['3.fb']!.name).toBe('Scattered Flame');
    expect(t.nodes['3.fb']!.text).toContain('above and below');
    expect(t.nodes['3.fb']!.fx).toEqual([
      { k: 'hook', h: 'target', area: { flankV: true } },
      { k: 'skill', sel: 'damage', f: 'power', op: 'pct', v: -0.3 },
      { k: 'skill', sel: 'heal', f: 'power', op: 'pct', v: -0.3 },
      { k: 'skill', sel: 'ground', f: 'power', op: 'pct', v: -0.3 },
    ]);
  });

  it('Broad Sentence: her anchor için hedef + ekranda sol / sağ komşusu (tahta dışı atlanır); ağaçsız Paladin tek hücre', () => {
    const { b, me, plain } = twoPaladins({ '3.mb': 1 });
    for (let s = 0; s < content.CELL_COUNT; s++) {
      expect(b.areaCells('judgment', s, 'enemy', me.uid)).toEqual(want(s, true, false));
      expect(b.areaCells('judgment', s, 'enemy', plain.uid)).toEqual([s]);
    }
  });

  it('Scattered Flame: hedef + ekranda üst / alt komşusu; Judgment etkilerinin hepsi -%30 (anlık hasar, anlık şifa, holy fire, holy ground; Ömer 416/9)', () => {
    const { b, me } = twoPaladins({ '3.fb': 1 });
    for (let s = 0; s < content.CELL_COUNT; s++) expect(b.areaCells('judgment', s, 'enemy', me.uid)).toEqual(want(s, false, true));
    const eff = b.skill('judgment', me.uid)!.effects;
    const g = eff.find((e) => e.type === 'ground' && e.ground === 'holy_fire') as { power: number };
    expect(g.power).toBeCloseTo(0.38 * 0.7, 9);
    expect((eff.find((e) => e.type === 'ground' && e.ground === 'holy_ground') as { power: number }).power).toBeCloseTo(0.38 * 0.7, 9);
    expect((eff.find((e) => e.type === 'damage') as { power: number }).power).toBeCloseTo(0.3 * 0.7, 9);
    expect((eff.find((e) => e.type === 'heal') as { power: number }).power).toBeCloseTo(0.3 * 0.7, 9);
  });

  it('ikisi birlikte = eski artı şekli (her anchor)', () => {
    const { b, me } = twoPaladins({ '3.mb': 1, '3.fb': 1 });
    for (let s = 0; s < content.CELL_COUNT; s++) {
      expect(b.areaCells('judgment', s, 'enemy', me.uid)).toEqual(want(s, true, true));
      expect(b.areaCells('judgment', s, 'enemy', me.uid)).toEqual(shapeCells({ shape: 'plus' }, s, 'enemy', F));
    }
  });

  it('Broad Sentence ile atılan Judgment holy fire zeminini üç hücreye koyar', () => {
    const { b, me } = twoPaladins({ '3.mb': 1 }, 4); // tek düşman ortada: menzil anchor'ı oraya bağlar
    const anchor = 4; // orta hücre: iki yanı da tahtada
    expect(want(anchor, true, false)).toHaveLength(3);
    const target = b.combatants.find((c) => c.side === 'enemy')!;
    for (let i = 0; i < 30 && b.currentActor !== me; i++) expect(b.skipTurn().ok).toBe(true);
    expect(b.currentActor).toBe(me);
    me.cooldowns.judgment = 0;
    me.mp = me.maxMp;
    const r = b.useSkill(me.uid, 'judgment', target.uid, anchor, 'enemy');
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const g = (b as unknown as { ground: { ground: string; slots: number[] }[] }).ground.filter((x) => x.ground === 'holy_fire');
    expect(g.flatMap((x) => x.slots).sort((x, y) => x - y)).toEqual(want(anchor, true, false));
  });
});

// Ömer 2026-10-24 (seçenek 1): Wildfire Verdict = holy fire içindeki düşmanlar, Paladin'in TARAFINDAN gelen her vuruştan %15 fazla hasar alır
// (C4 damageTaken, who 'foe', ground holy_fire). Karşı tarafın kendi / dost hasarı sayılmaz; zemin / DoT tikleri çarpandan geçmez.
describe('Paladin 2026-10-24: Wildfire Verdict (3.eb)', () => {
  it('veri: eski sıçrama etkisi tamamen gitti, yerine damageTaken who foe holy_fire 0,15', () => {
    const n = treeOf('paladin')!.nodes['3.eb']!;
    expect(n.text).toBe('Enemies standing in holy fire take ×1.15 damage from all sources.');
    expect(n.fx).toEqual([{ k: 'hook', h: 'heal', on: 'damageTaken', who: 'foe', ground: 'holy_fire', mul: 0.15 }]);
  });

  /** Paladin (0) + Warrior (1) vs iki Warrior (0, 1); Judgment yalnızca E0'ın hücresine. */
  function fired(ranks: Record<string, number> | null) {
    const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'warrior', 1: 'warrior' }, ranks ? { 0: { tree: only(ranks) } } : {});
    const me = P(b);
    for (let i = 0; i < 30 && b.currentActor !== me; i++) expect(b.skipTurn().ok).toBe(true);
    const before = { inFire: b.damageTakenMult(E(b, 0), P(b, 1), 'physical') };
    me.cooldowns.judgment = 0;
    me.mp = me.maxMp;
    expect(b.useSkill(me.uid, 'judgment', E(b, 0).uid, 0, 'enemy').ok).toBe(true);
    const g = (b as unknown as { ground: { ground: string; slots: number[] }[] }).ground.filter((x) => x.ground === 'holy_fire');
    expect(g.flatMap((x) => x.slots)).toEqual([0]);
    return { b, me, ally: P(b, 1), inFire: E(b, 0), out: E(b, 1), before };
  }

  it('ateşteki düşmana Paladin ve dostu x1,15; ateş dışındaki düşmana ve ağaçsız Paladinde x1', () => {
    const t = fired({ '3.eb': 1 });
    const base = t.before.inFire;
    expect(t.b.damageTakenMult(t.inFire, t.ally, 'physical')).toBeCloseTo(base * 1.15, 9);
    expect(t.b.damageTakenMult(t.inFire, t.me, 'magic')).toBeCloseTo(t.b.damageTakenMult(t.out, t.me, 'magic') * 1.15, 9);
    expect(t.b.damageTakenMult(t.out, t.ally, 'physical')).toBeCloseTo(base, 9);
    const plain = fired(null);
    expect(plain.b.damageTakenMult(plain.inFire, plain.ally, 'physical')).toBeCloseTo(plain.before.inFire, 9);
  });

  it('karşı tarafın kendi hasarı ve saldıransız hasar (tik / Doom) çarpılmaz', () => {
    const t = fired({ '3.eb': 1 });
    expect(t.b.damageTakenMult(t.inFire, t.out, 'physical')).toBeCloseTo(t.before.inFire, 9);
    expect(t.b.damageTakenMult(t.inFire)).toBeCloseTo(t.before.inFire, 9);
  });

  it('gerçek vuruş: dost Warriorun ateşteki düşmana hasarı önizlemesiyle aynı yoldan (x1,15 çarpanı vuruşta)', () => {
    const on = fired({ '3.eb': 1 });
    const off = fired(null);
    const hit = (t: ReturnType<typeof fired>) => {
      t.inFire.maxHp = t.inFire.hp = 100000;
      for (let i = 0; i < 30 && t.b.currentActor !== t.ally; i++) expect(t.b.skipTurn().ok).toBe(true);
      const from = t.b.log.length;
      const sk = t.ally.skills.find((id) => t.b.skill(id, t.ally.uid)?.target === 'single_enemy' && (t.b.skill(id, t.ally.uid)?.cost.amount ?? 0) === 0) ?? 'attack';
      expect(t.b.useSkill(t.ally.uid, sk, t.inFire.uid).ok).toBe(true);
      return dmgTo(t.b.log.slice(from), t.ally, t.inFire);
    };
    const a = hit(on);
    const z = hit(off);
    expect(z).toBeGreaterThan(0);
    expect(a / z).toBeGreaterThan(1.1);
    expect(a / z).toBeLessThan(1.2);
  });
});

// Ömer 2026-10-24 (open-questions 416/8): Judgment iki tahtaya atılır (area_any, D11 Radiance deseni). Düşman hücresi: anlık kutsal hasar + holy fire;
// kendi hücren: oradaki dosta anlık şifa + holy ground (içinde tur başlatan dosta şifa). Broad Sentence / Scattered Flame ek hücreleri atıldığı tahtada.
describe('Paladin 2026-10-24: Judgment iki tahtaya', () => {
  type G = { ground: string; board: string; slots: number[] };
  const grounds = (b: Battle): G[] => (b as unknown as { ground: G[] }).ground;
  /** Paladin (0) + Warrior (1) vs iki Warrior; sıra Paladin'de, Judgment hazır. */
  function ready(ranks: Record<string, number> | null = null) {
    const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'warrior', 1: 'warrior' }, ranks ? { 0: { tree: only(ranks) } } : {});
    const me = P(b);
    for (const c of b.combatants) c.maxHp = c.hp = 100000;
    for (let i = 0; i < 30 && b.currentActor !== me; i++) expect(b.skipTurn().ok).toBe(true);
    expect(b.currentActor).toBe(me);
    me.cooldowns.judgment = 0;
    me.mp = me.maxMp;
    return { b, me, ally: P(b, 1) };
  }
  const intOf = (me: Combatant, power: number) => Math.round(attributePower(me.stats, 'int', content.formulas) * power);

  it('düşman hücresine: hedefe anlık kutsal büyü hasarı + o hücrede holy fire; dost tahtasına zemin yok', () => {
    const { b, me } = ready();
    const from = b.log.length;
    expect(b.useSkill(me.uid, 'judgment', E(b, 0).uid, E(b, 0).slot, 'enemy').ok).toBe(true);
    const evs = b.log.slice(from);
    const hits = evs.filter((e) => e.type === 'damage' && e.source === me.uid);
    expect(hits.map((e) => (e as { target: string }).target)).toEqual([E(b, 0).uid]); // yalnız hedef (komşu yok)
    expect(dmgTo(evs, me, E(b, 0))).toBeGreaterThan(0);
    expect(grounds(b)).toEqual([expect.objectContaining({ ground: 'holy_fire', board: 'enemy', slots: [E(b, 0).slot] })]);
    expect(evs.some((e) => e.type === 'heal')).toBe(false);
  });

  it('dost hücresine: hasar yok; oradaki dosta anlık şifa (INT x 0,35 aralığında) + holy ground o hücrede, dost kendi tur başında INT x 0,45 iyileşir', () => {
    const { b, me, ally } = ready();
    ally.hp = 50000;
    const from = b.log.length;
    const r = b.useSkill(me.uid, 'judgment', ally.uid, ally.slot, 'party');
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const evs = b.log.slice(from);
    expect(evs.some((e) => e.type === 'damage' && e.source === me.uid)).toBe(false);
    const burst = healTo(evs.slice(0, evs.findIndex((e) => e.type === 'ground') + 1), me, ally);
    const base = intOf(me, 0.3);
    expect(burst).toBeGreaterThanOrEqual(Math.floor(base * 0.8)); // şifa sapması + olası kritik
    expect(burst).toBeLessThanOrEqual(Math.ceil(base * 1.2 * me.stats.critMult));
    expect(healTo(evs, me, E(b, 0)) + healTo(evs, me, me)).toBe(0); // yalnız hücredeki dost
    expect(grounds(b)).toEqual([expect.objectContaining({ ground: 'holy_ground', board: 'party', slots: [ally.slot] })]);
    const tick = nextTurn(b, ally);
    expect(healTo(tick, me, ally)).toBe(intOf(me, 0.38));
  });

  it('Broad Sentence + Scattered Flame: dost tahtasında ek hücrelere de holy ground ve oradaki dostlara anlık şifa; Scattered Flame holy ground gücünü -%30 düşürür', () => {
    const { b, me, ally } = ready({ '3.mb': 1, '3.fb': 1 });
    ally.hp = 50000;
    const cells = shapeCells({ shape: 'plus' }, ally.slot, 'party', content.formulas.formation);
    expect(cells).toContain(me.slot); // Paladin (0) Warrior'ın (1) komşusu: ek hücrede
    me.hp = 50000;
    const from = b.log.length;
    expect(b.useSkill(me.uid, 'judgment', ally.uid, ally.slot, 'party').ok).toBe(true);
    const evs = b.log.slice(from);
    expect(healTo(evs, me, ally)).toBeGreaterThan(0);
    expect(healTo(evs, me, me)).toBeGreaterThan(0);
    const g = grounds(b);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ ground: 'holy_ground', board: 'party' });
    expect(g[0]!.slots).toEqual(shapeCells({ shape: 'plus' }, ally.slot, 'party', content.formulas.formation));
    expect(healTo(nextTurn(b, ally), me, ally)).toBe(intOf(me, 0.38 * 0.7));
  });

  it('Sanctified Earth / Scorched Earth holy fire VE holy ground süresini uzatır (Ömer 416/9); Spark of Wrath yalnız düşmana', () => {
    const { b, me } = ready({ '3.n0': 1, '3.f3': 5 });
    const eff = b.skill('judgment', me.uid)!.effects;
    expect(eff.find((e) => e.type === 'ground' && e.ground === 'holy_fire')).toMatchObject({ turns: 3 });
    expect(eff.find((e) => e.type === 'ground' && e.ground === 'holy_ground')).toMatchObject({ turns: 3 });
    expect(eff.find((e) => e.type === 'status')).toMatchObject({ status: 'burning', side: 'enemies' });
    const fa = ready({ '3.fa': 1 });
    const eff2 = fa.b.skill('judgment', fa.me.uid)!.effects;
    expect(eff2.find((e) => e.type === 'ground' && e.ground === 'holy_fire')).toMatchObject({ turns: 4 });
    expect(eff2.find((e) => e.type === 'ground' && e.ground === 'holy_ground')).toMatchObject({ turns: 4 });
  });

  it('açıklama: burst (enemy side), anlık şifa (your side), holy fire (enemy side only), holy ground (your side only)', () => {
    const info = describeSkill(content.skills.judgment!, content.classes.paladin!.stats, content.formulas, {}, { grounds: content.grounds, statuses: content.statuses });
    const text = info.lines.join(' | ');
    expect(text).toContain('on the enemy side');
    expect(text).toMatch(/Holy Fire[^|]*enemy side only/);
    expect(text).toMatch(/Holy Ground[^|]*your side only[^|]*healing/);
    expect(text).toMatch(/Heal 30% INT[^|]*on your side/);
    expect(text).toContain('empty cell on your side');
  });

  it('YZ: yaralı dost varken dost hücresine (holy ground), yaralı dost yokken düşman hücresine atar', () => {
    const pick = (hurt: boolean) => {
      const { b, me, ally } = ready();
      me.skills = ['judgment'];
      for (const c of b.combatants) if (c.side === 'enemy') c.maxHp = c.hp = 2000;
      if (hurt) {
        ally.maxHp = 2000;
        ally.hp = 300;
      }
      return chooseAction(b, me.uid, content.aiConfig);
    };
    const wounded = pick(true);
    expect(wounded?.skillId).toBe('judgment');
    expect(wounded?.board).toBe('party');
    const healthy = pick(false);
    expect(healthy?.skillId).toBe('judgment');
    expect(healthy?.board ?? 'enemy').toBe('enemy');
  });
  // Ömer 2026-10-24 (416/9): boş DOST hücresine de atılabilir (ağaçsız da; yalnız Holy Ground bırakır). Boş DÜŞMAN hücresi yasak kalır.
  it('boş dost hücresi: seçilebilir anchor, önizleme geçerli; atılınca yalnız holy ground kalır (şifa / hasar yok); boş düşman hücresi reddedilir', () => {
    const { b, me } = ready();
    const occupied = (board: string) => new Set(b.combatants.filter((c) => c.hp > 0 && c.board === board).map((c) => c.slot));
    const own = occupied('party');
    const emptyOwn = Array.from({ length: content.CELL_COUNT }, (_, i) => i).filter((i) => !own.has(i));
    const anchorsOwn = b.shapeAnchors(me.uid, 'judgment', 'party');
    const inRange = emptyOwn.filter((s) => anchorsOwn.includes(s));
    expect(inRange.length).toBeGreaterThan(0);
    const s = inRange[0]!;
    expect(b.shapePreviewCells(me.uid, 'judgment', s, 'party')).toMatchObject({ valid: true, targets: [] });
    // düşman tahtası: boş hücre seçilemez
    const foe = occupied('enemy');
    const emptyFoe = Array.from({ length: content.CELL_COUNT }, (_, i) => i).filter((i) => !foe.has(i));
    expect(emptyFoe.some((x) => b.shapeAnchors(me.uid, 'judgment', 'enemy').includes(x))).toBe(false);
    expect(b.shapePreviewCells(me.uid, 'judgment', emptyFoe[0]!, 'enemy').valid).toBe(false);
    expect(b.useSkill(me.uid, 'judgment', '', emptyFoe[0]!, 'enemy').ok).toBe(false);
    // boş dost hücresine atış
    const from = b.log.length;
    const r = b.useSkill(me.uid, 'judgment', '', s, 'party');
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const evs = b.log.slice(from);
    expect(evs.some((e) => (e.type === 'heal' || e.type === 'damage') && e.source === me.uid)).toBe(false);
    expect(grounds(b)).toEqual([expect.objectContaining({ ground: 'holy_ground', board: 'party', slots: [s] })]);
    expect(me.cooldowns.judgment).toBeGreaterThan(0);
  });

  it('YZ boş dost hücresine boşuna atmaz: kimse yaralı değilken düşmana, yaralı dost varken dostun dolu hücresine', () => {
    const pick = (hurt: boolean) => {
      const { b, me, ally } = ready();
      me.skills = ['judgment'];
      for (const c of b.combatants) if (c.side === 'enemy') c.maxHp = c.hp = 2000;
      if (hurt) {
        ally.maxHp = 2000;
        ally.hp = 300;
      }
      return { choice: chooseAction(b, me.uid, content.aiConfig), b };
    };
    const healthy = pick(false);
    expect(healthy.choice?.board ?? 'enemy').toBe('enemy');
    const wounded = pick(true);
    expect(wounded.choice?.board).toBe('party');
    const slot = wounded.choice?.slot;
    expect(wounded.b.combatants.some((c) => c.hp > 0 && c.board === 'party' && c.slot === slot)).toBe(true);
  });
});
