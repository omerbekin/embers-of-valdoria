import { describe, expect, it } from 'vitest';
import { Battle, content, skillCostAmount, type BattleEvent, type BattleMode, type Combatant, type SkillEffect, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';

// Anti-Mage ağacı, Ley Brand satırı (Ömer 2026-10-27, open-questions 444): eski Drain Field düğümleri yeniden yazıldı (id'ler aynı, ağaç sürümü 2).
// Her test YALNIZCA verilen düğümlerin fx'iyle derler (öbür düğüm / bar fx'leri boşaltılır). Sayılar veriden okunur.

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
function only(ranks: Record<string, number>, bar?: number): UnitSetup['tree'] {
  const t = JSON.parse(JSON.stringify(treeOf('antimage')!)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((b, i) => {
    if (i !== bar) b.fx = null;
  });
  const r: Record<string, number> = { ...ranks };
  if (bar !== undefined) r['zz.fill'] = (bar + 1) * 5;
  return compileTree(t, { v: t.version, r });
}
const tree = (ranks: Record<string, number>, bar?: number): Record<number, UnitSetup> => ({ 0: { tree: only(ranks, bar) } });
type FxNum = { v: number };
const fxV = (key: string, i = 0): number => (treeOf('antimage')!.nodes[key]!.fx![i] as unknown as FxNum).v;
const BRAND = content.skills.drain_field!.effects.find((e) => e.type === 'brand') as Extract<SkillEffect, { type: 'brand' }>;
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const branded = (c: Combatant) => c.statuses.find((s) => s.kind === 'branded');
const noMp = (c: Combatant): Combatant => {
  c.maxMp = 0;
  c.mp = 0;
  c.hp = c.maxHp = 400;
  return c;
};
/** Ley Brand'i `anchor` hücresine atar (MP dolu, cooldown sıfır); bu eylemin olaylarını döner. */
function brand(b: Battle, anchor = 0): BattleEvent[] {
  const me = P(b);
  const from = b.log.length;
  me.cooldowns.drain_field = 0;
  me.mp = me.maxMp;
  const r = b.useSkill(me.uid, 'drain_field', undefined, anchor);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return b.log.slice(from);
}
/** Mana Steal isabet edene dek (iska seed'e bağlı). */
function steal(b: Battle, target: Combatant): BattleEvent[] {
  const me = P(b);
  const from = b.log.length;
  for (let i = 0; i < 40; i++) {
    me.cooldowns.mana_burn = 0;
    const r = b.useSkill(me.uid, 'mana_burn', target.uid);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (target.hp <= 0) break;
    if (b.log.slice(from).some((e) => e.type === 'manaBurn' && e.target === target.uid)) break;
  }
  return b.log.slice(from);
}
const brandDmg = (evs: BattleEvent[], uid: string) => evs.find((e) => e.type === 'damage' && e.target === uid && e.status === 'branded') as Extract<BattleEvent, { type: 'damage' }> | undefined;
/** turns modu: sıra Anti-Mage'e gelene dek atla. */
function toMe(b: Battle): void {
  for (let i = 0; i < 30 && b.currentActor !== P(b); i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(P(b));
}
/** turns modu: `c`'nin SIRADAKİ tur başına dek atla (şu an onun turuysa önce bu tur biter). */
function toNextTurnOf(b: Battle, c: Combatant): void {
  let n = 0;
  do expect(b.skipTurn().ok).toBe(true);
  while (b.currentActor !== c && ++n < 40);
}

describe('Anti-Mage ağacı: Ley Brand satırı verisi', () => {
  it('fx temiz derlenir; ağaç sürümü 4 (bedava respec; 2026-10-29 Mana Overflow -> Spellbreaker Instinct, yeni 0. satır düğümleri); satır adı Ley Brand', () => {
    const t = treeOf('antimage')!;
    expect(checkTreeFx(t)).toEqual([]);
    expect(t.version).toBe(5);
    for (const k of ['2.f1', '2.f2', '2.f3', '2.n0', '2.r', '2.ea', '2.eb', '2.ma', '2.fa', '2.fb', '2.mb', '2.v']) expect(t.nodes[k]?.fx?.length, k).toBeGreaterThan(0);
  });
});

describe('Anti-Mage ağacı: Ley Brand düğümleri', () => {
  it('Deep Taint: havuz rank başına maks canın +%2\'si', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' }, tree({ '2.f1': 3 }));
    const foe = noMp(E(b));
    brand(b);
    expect(foe.taint).toBe(Math.round(foe.maxHp * (BRAND.taintPct + 3 * fxV('2.f1'))));
  });

  it('Searing Brand: yakım hasarı rank başına kaybedilen MP\'nin +%5\'i', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' }, tree({ '2.f2': 2 }));
    const foe = noMp(E(b));
    brand(b);
    const evs = steal(b, foe);
    const burn = evs.find((e) => e.type === 'manaBurn' && e.target === foe.uid) as Extract<BattleEvent, { type: 'manaBurn' }>;
    const hit = brandDmg(evs, foe.uid)!;
    expect(hit.amount + hit.absorbed).toBe(b.tickDamage(BRAND.element ?? 'arcane', 'magic', Math.round(burn.amount * (BRAND.burnDamagePct + 2 * fxV('2.f2'))), foe));
  });

  it('Heavy Toll: MP bedelleri rank başına +%5 daha yüksek (yukarı yuvarlanır)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '2.f3': 2 }));
    const foe = E(b);
    const sk = foe.skills.map((id) => b.skill(id, foe.uid)!).find((s) => s.cost.resource === 'mp' && s.cost.amount > 0)!;
    const base = skillCostAmount(sk.cost, foe);
    brand(b);
    expect(skillCostAmount(sk.cost, foe)).toBe(Math.ceil(base * (BRAND.costMult + 2 * fxV('2.f3')) - 1e-9));
  });

  it('Hush of the Brand: manası yakımla 0\'a inen Branded düşman 1 tur Silence alır (ağaçsız almaz)', () => {
    for (const on of [true, false]) {
      const b = make({ 0: 'antimage' }, { 0: 'mage' }, on ? tree({ '2.n0': 1 }) : {});
      const foe = E(b);
      foe.hp = foe.maxHp = 5000;
      brand(b);
      foe.mp = 2;
      steal(b, foe);
      expect(foe.mp).toBe(0);
      const sil = foe.statuses.find((s) => s.kind === 'silence');
      expect(!!sil, `ağaç ${on}`).toBe(on);
      if (on) expect(sil!.turns).toBe(fxV('2.n0'));
    }
  });

  it('Bitter Burst: süre bitiş patlaması rank başına kalan tainted mana\'nın +%10\'u (turns modu)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' }, tree({ '2.r': 2 }), 5, 'turns');
    const foe = noMp(E(b));
    toMe(b);
    brand(b);
    const left = foe.mp;
    branded(foe)!.turns = 1;
    const from = b.log.length;
    toNextTurnOf(b, foe);
    const hit = brandDmg(b.log.slice(from), foe.uid)!;
    expect(hit.amount + hit.absorbed).toBe(b.tickDamage('arcane', 'magic', Math.round(left * (BRAND.explodePct + 2 * fxV('2.r'))), foe));
  });

  it('Focused Brand: merkez hücredeki düşmanın havuzu %50 daha büyük, diğerleri aynı', () => {
    const foes = { 0: 'warrior', 1: 'warrior', 2: 'warrior', 3: 'warrior', 4: 'warrior', 5: 'warrior', 6: 'warrior', 7: 'warrior', 8: 'warrior' };
    const pools = (units: Record<number, UnitSetup>) => {
      const b = make({ 0: 'antimage' }, foes, units);
      for (const c of b.living('enemy')) noMp(c);
      brand(b);
      return b.living('enemy').filter((c) => c.taint !== undefined).map((c) => c.taint!);
    };
    const plain = pools({});
    const normal = Math.round(400 * BRAND.taintPct);
    expect(plain.every((p) => p === normal)).toBe(true);
    const focused = pools(tree({ '2.ea': 1 }));
    expect(focused.filter((p) => p === Math.round(400 * BRAND.taintPct * (1 + fxV('2.ea'))))).toHaveLength(1);
    expect(focused.filter((p) => p === normal)).toHaveLength(plain.length - 1);
  });

  it('Wider Brand: alan 3x4 (daha çok düşman damgalanır)', () => {
    const foes = { 0: 'warrior', 1: 'warrior', 2: 'warrior', 3: 'warrior', 4: 'warrior', 5: 'warrior', 6: 'warrior', 7: 'warrior', 8: 'warrior' };
    const count = (units: Record<number, UnitSetup>) => {
      const b = make({ 0: 'antimage' }, foes, units);
      const sk = b.skill('drain_field', P(b).uid)!;
      brand(b);
      return { rows: sk.area!.rows, n: b.living('enemy').filter((c) => branded(c)).length };
    };
    const plain = count({});
    const wide = count(tree({ '2.eb': 1 }));
    expect(plain.rows).toBe(3);
    expect(wide.rows).toBe(4);
    expect(wide.n).toBeGreaterThanOrEqual(plain.n);
  });

  it('Lasting Brand: Brand 1 tur daha uzun sürer', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' }, tree({ '2.ma': 1 }));
    brand(b);
    expect(branded(E(b))?.turns).toBe(BRAND.turns + fxV('2.ma'));
  });

  it('Narrow Brand: yalnızca merkez hücre; havuz maks canın %40\'ı, MP bedelleri 2 katı', () => {
    const foes = { 0: 'warrior', 1: 'warrior', 2: 'mage', 3: 'warrior', 4: 'warrior', 5: 'warrior' };
    const b = make({ 0: 'antimage' }, foes, tree({ '2.fa': 1 }));
    const sk = b.skill('drain_field', P(b).uid)!;
    expect(sk.area).toMatchObject({ rows: 1, cols: 1 });
    const mage = E(b, 2);
    const mageSk = mage.skills.map((id) => b.skill(id, mage.uid)!).find((s) => s.cost.resource === 'mp' && s.cost.amount > 0)!;
    const base = skillCostAmount(mageSk.cost, mage);
    for (const c of b.living('enemy')) if (c !== mage) noMp(c);
    // önce bir savaşçıya: yalnızca o damgalanır, havuz %40
    const w = E(b, 0);
    const r = b.useSkill(P(b).uid, 'drain_field', w.uid);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(b.living('enemy').filter((c) => branded(c)).map((c) => c.uid)).toEqual([w.uid]);
    expect(w.taint).toBe(Math.round(400 * fxV('2.fa', 1)));
    // sonra büyücüye: bedel 2 katı
    P(b).cooldowns.drain_field = 0;
    P(b).mp = P(b).maxMp;
    expect(b.useSkill(P(b).uid, 'drain_field', mage.uid).ok).toBe(true);
    expect(skillCostAmount(mageSk.cost, mage)).toBe(Math.ceil(base * fxV('2.fa', 2) - 1e-9));
  });

  it('Thin Brand: bedel 6 MP az, Brand 1 tur kısa', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' }, tree({ '2.fb': 1 }));
    const me = P(b);
    expect(skillCostAmount(b.skill('drain_field', me.uid)!.cost, me)).toBe(content.skills.drain_field!.cost.amount + fxV('2.fb'));
    me.mp = me.maxMp;
    const mp = me.mp;
    expect(b.useSkill(me.uid, 'drain_field', undefined, 0).ok).toBe(true);
    expect(mp - me.mp).toBe(content.skills.drain_field!.cost.amount + fxV('2.fb'));
    expect(branded(E(b))?.turns).toBe(BRAND.turns + fxV('2.fb', 1));
  });

  it('Searing Grasp: Brand her damgalı düşmanın maks MP\'sinin %15\'ini de yakar (tainted mana dahil) ve yakım hasarı verir', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' }, tree({ '2.mb': 1 }));
    const foe = noMp(E(b));
    const evs = brand(b);
    const pool = foe.taint!;
    const burn = evs.find((e) => e.type === 'manaBurn' && e.target === foe.uid) as Extract<BattleEvent, { type: 'manaBurn' }>;
    expect(burn.amount).toBe(Math.round(pool * 0.15));
    expect(foe.mp).toBe(pool - burn.amount);
    expect(brandDmg(evs, foe.uid)).toBeDefined();
  });

  it('Spreading Brand (kapanış): doğal bitişte Brand bitişikteki Brand\'siz düşmana bir kez sıçrar; sıçrayan bir daha sıçramaz (turns modu)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior', 1: 'warrior' }, tree({ '2.v': 1 }), 5, 'turns');
    const a = noMp(E(b, 0));
    const n = noMp(E(b, 1));
    toMe(b);
    brand(b);
    // komşudaki Brand'i ve havuzunu elle sil: sıçrama hedefi Brand'siz olmalı
    n.statuses = n.statuses.filter((s) => s.kind !== 'branded');
    n.taint = undefined;
    n.maxMp = n.mp = 0;
    branded(a)!.turns = 1;
    toNextTurnOf(b, a);
    expect(branded(a)).toBeUndefined();
    const leap = branded(n);
    expect(leap).toBeDefined();
    expect(leap!.brand?.leapt).toBe(true);
    expect(leap!.turns).toBe(BRAND.turns);
    expect(n.taint).toBe(Math.round(n.maxHp * BRAND.taintPct));
    // sıçrayan Brand bitince geri sıçramaz
    leap!.turns = 1;
    toNextTurnOf(b, n);
    expect(branded(n)).toBeUndefined();
    expect(branded(a)).toBeUndefined();
  });

  it('Spreading Brand yoksa sıçrama yok', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior', 1: 'warrior' }, {}, 5, 'turns');
    const a = noMp(E(b, 0));
    const n = noMp(E(b, 1));
    toMe(b);
    brand(b);
    n.statuses = n.statuses.filter((s) => s.kind !== 'branded');
    n.taint = undefined;
    n.maxMp = n.mp = 0;
    branded(a)!.turns = 1;
    toNextTurnOf(b, a);
    expect(branded(n)).toBeUndefined();
  });

  it('Wide Basin (bar): Ley Brand damgaladığı her düşman için takıma 1 MP', () => {
    const b = make({ 0: 'antimage', 1: 'mage' }, { 0: 'warrior', 1: 'warrior' }, tree({}, 2));
    const ally = P(b, 1);
    ally.mp = 0;
    brand(b);
    const n = b.living('enemy').filter((c) => branded(c)).length;
    expect(n).toBeGreaterThan(0);
    expect(ally.mp).toBe(n);
  });
});
