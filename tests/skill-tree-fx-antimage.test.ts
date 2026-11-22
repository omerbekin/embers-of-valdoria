import { describe, expect, it } from 'vitest';
import { Battle, content, describeSkill, explainChoice, previewForTargets, skillCostAmount, type BattleEvent, type BattleMode, type Combatant, type SkillEffect, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take, validate, type TreeAlloc } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Redtithe ağacı (id antimage, sürüm 6; engine-dev 2026-11-17): eski Anti-Mage düğümleri yeni kite eşlendi ya da pasif (inactive) bırakıldı
// (eşleme tablosu: docs/design/classes/antimage.md; open-questions Q-NEW Redtithe). Her eşlenen düğüm burada savaşta (ya da derlenen skill'de) sınanır.
// Testler YALNIZCA verilen düğümlerin fx'iyle derler (öbür düğüm / bar fx'leri boşaltılır). Sayılar veriden okunur.

const A = treeOf('antimage')!;
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
function only(ranks: Record<string, number>, bar?: number): UnitSetup['tree'] {
  const t = JSON.parse(JSON.stringify(A)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((b, i) => {
    if (i !== bar) b.fx = null;
  });
  const r: Record<string, number> = { ...ranks };
  if (bar !== undefined) r['zz.fill'] = (bar + 1) * 5;
  return compileTree(t, { v: t.version, r });
}
const tree = (ranks: Record<string, number>, bar?: number): Record<number, UnitSetup> => ({ 0: { tree: only(ranks, bar) } });
const fxV = (key: string, i = 0): number => (A.nodes[key]!.fx![i] as unknown as { v: number }).v;
/** Kanca düğümünün sayısı: cond mod alanı (powerMul / manaBurnAdd) ya da heal kancası çarpanı (mul). */
const modV = (key: string, field: string): number => {
  const f = A.nodes[key]!.fx![0] as unknown as { mod?: Record<string, number>; mul?: number };
  return field === 'mul' ? f.mul! : f.mod![field]!;
};
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const eff = <T extends SkillEffect['type']>(b: Battle, id: string, type: T): Extract<SkillEffect, { type: T }> => b.skill(id, P(b).uid)!.effects.find((e) => e.type === type) as Extract<SkillEffect, { type: T }>;
const BASE_BRAND = content.skills.drain_field!.effects.find((e) => e.type === 'bloodBrand') as Extract<SkillEffect, { type: 'bloodBrand' }>;
const BASE_DOT = content.skills.drain_field!.effects.find((e) => e.type === 'dot') as Extract<SkillEffect, { type: 'dot' }>;
const BASE_VEIN = content.skills.spell_ward!.effects.find((e) => e.type === 'shield') as Extract<SkillEffect, { type: 'shield' }>;
const BASE_TITHE = content.skills.mana_burn!.effects.find((e) => e.type === 'manaBurn') as Extract<SkillEffect, { type: 'manaBurn' }>;

/** Blood Brand'i hedefe atar (kan dolu, cooldown sıfır); işaret tutana dek (isabet zarı) yeniden dener. */
function brand(b: Battle, target: Combatant): BattleEvent[] {
  const me = P(b);
  const from = b.log.length;
  for (let i = 0; i < 40; i++) {
    me.cooldowns.drain_field = 0;
    me.blood = me.maxBlood;
    const r = b.useSkill(me.uid, 'drain_field', target.uid);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (target.statuses.some((s) => s.kind === 'blood_brand')) break;
  }
  expect(target.statuses.some((s) => s.kind === 'blood_brand')).toBe(true);
  return b.log.slice(from);
}
/** Tithe Cut isabet edene dek; o eylemin olayları. */
function cut(b: Battle, target: Combatant): BattleEvent[] {
  const me = P(b);
  for (let i = 0; i < 40; i++) {
    me.cooldowns.mana_burn = 0;
    const from = b.log.length;
    const r = b.useSkill(me.uid, 'mana_burn', target.uid);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const evs = b.log.slice(from);
    if (evs.some((e) => e.type === 'damage' && e.target === target.uid && e.amount > 0)) return evs;
  }
  throw new Error('Tithe Cut isabet etmedi');
}
const bloodGain = (evs: BattleEvent[], uid: string): number => evs.reduce((s, e) => s + (e.type === 'blood' && e.actor === uid && e.delta > 0 ? e.delta : 0), 0);
const expected = (b: Battle, skill: string, t: Combatant, user = P(b)): number => previewForTargets(b, user, skill, [t]).find((p) => p.uid === t.uid)!.damage!.expected;

describe('Redtithe ağacı: veri', () => {
  it('tüm etkin fx temiz derlenir; sürüm 6 (bedava respec); satır adları yeni kit', () => {
    expect(checkTreeFx(A)).toEqual([]);
    expect(A.version).toBeGreaterThanOrEqual(6);
    expect(A.rows.map((r) => r.name)).toEqual(['Blood Tithe', 'Tithe Cut', 'Blood Brand', 'Mirror Vein']);
    expect(A.ult.name).toBe('Exsanguinate');
  });

  it('r36: ağaçta pasif (inactive) düğüm kalmadı; sentetik pasif düğüm yine alınamaz; düğüm metinlerinde eski kit adı yok', () => {
    expect(Object.entries(A.nodes).filter(([, n]) => n.inactive).map(([k]) => k)).toEqual([]);
    expect(A.mastery.bar.some((x) => x.inactive)).toBe(false);
    const syn = JSON.parse(JSON.stringify(A)) as TreeData;
    syn.nodes['0.f1']!.inactive = true;
    expect(take(syn, 30, emptyAlloc(syn), '0.f1').ok).toBe(false);
    const OLD = /Anti-Mage|Mana Steal|Ley Brand|Ley Thread|Spell Ward|Void Strike|Spellbreaker|tainted/i;
    for (const [k, n] of Object.entries(A.nodes)) if (!n.inactive) expect(n.text, k).not.toMatch(OLD);
    for (const [i, b] of A.mastery.bar.entries()) if (!b.inactive) expect(b.text, `bar ${i}`).not.toMatch(OLD);
  });

  it('her satır inactive düğümlere rağmen sonuna kadar alınabilir (yol kopmadı)', () => {
    // her satırın etkin düğümlerini sırayla almaya çalış; hiçbiri "needs / tier" yüzünden kilitli kalmamalı (yalnızca yön / evo seçimi)
    for (const row of [0, 1, 2, 3]) {
      let a: TreeAlloc = emptyAlloc(A);
      const keys = Object.keys(A.nodes).filter((k) => k.startsWith(`${row}.`) && !A.nodes[k]!.inactive);
      let took = 0;
      for (let pass = 0; pass < 6; pass++) {
        for (const k of keys) {
          const r = take(A, 30, a, k);
          if (r.ok) {
            a = r.alloc;
            took++;
          }
        }
      }
      expect(took, `satır ${row}`).toBeGreaterThan(0);
      expect(validate(A, 30, a), `satır ${row}`).toBeNull();
    }
  });
});

describe('Redtithe ağacı: satır 0 (Blood Tithe)', () => {
  it('0.f2: Blood Brand\'li düşmana skill hasarı rank başına +%3', () => {
    const rank = 3;
    const plain = make({ 0: 'antimage' }, { 0: 'mage' });
    const tr = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '0.f2': rank }));
    for (const b of [plain, tr]) {
      E(b).hp = E(b).maxHp = 99999;
      brand(b, E(b));
    }
    expect(expected(tr, 'mana_burn', E(tr)) / expected(plain, 'mana_burn', E(plain))).toBeCloseTo(1 + rank * modV('0.f2', 'powerMul'), 1);
  });

  it('0.f3: Blood Brand\'li düşmanın Redtithe\'e verdiği hasar rank başına -%2 (işaretsizde fark yok)', () => {
    const rank = 3;
    const hitOf = (units: Record<number, UnitSetup>, marked: boolean, seed: number): number | null => {
      const b = make({ 0: 'antimage' }, { 0: 'warrior' }, units, seed);
      P(b).hp = P(b).maxHp = 99999;
      P(b).stats.armor = 0;
      E(b).hp = E(b).maxHp = 99999;
      E(b).stats.str = 400; // büyük vuruş: yuvarlama oranı bozmasın
      if (marked) brand(b, E(b));
      const from = b.log.length;
      E(b).cooldowns.melee_attack = 0;
      expect(b.useSkill(E(b).uid, 'melee_attack', P(b).uid).ok).toBe(true);
      const sum = b.log.slice(from).reduce((n, e) => n + (e.type === 'damage' && e.target === P(b).uid && !e.crit ? e.amount : 0), 0);
      return b.log.slice(from).some((e) => e.type === 'damage' && e.target === P(b).uid && e.crit) ? null : sum || null;
    };
    for (let seed = 1; seed < 40; seed++) {
      const p = hitOf({}, true, seed);
      const t = hitOf(tree({ '0.f3': rank }), true, seed);
      if (p === null || t === null || p < 100) continue;
      expect(t).toBeLessThan(p);
      expect(t / p).toBeCloseTo(1 + rank * modV('0.f3', 'mul'), 1);
      const pu = hitOf({}, false, seed);
      const tu = hitOf(tree({ '0.f3': rank }), false, seed);
      if (pu !== null && tu !== null) expect(tu).toBe(pu);
      return;
    }
    throw new Error('vuruş bulunamadı');
  });

  it('0.n0 / 0.fb: Blood Brand\'in Bleeding süresi +1 / +2 tur; 0.fb Tithe Cut gücü -%20', () => {
    expect(eff(make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '0.n0': 1 })), 'drain_field', 'dot').turns).toBe(BASE_DOT.turns + fxV('0.n0'));
    const fb = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '0.fb': 1 }));
    expect(eff(fb, 'drain_field', 'dot').turns).toBe(BASE_DOT.turns + fxV('0.fb'));
    const basePow = (content.skills.mana_burn!.effects.find((e) => e.type === 'damage') as Extract<SkillEffect, { type: 'damage' }>).power;
    expect(eff(fb, 'mana_burn', 'damage').power).toBeCloseTo(basePow * (1 + fxV('0.fb', 1)), 6);
  });

  it('0.r: Tithe Cut Blood Brand\'li düşmandan rank başına +1 MP söker (kan da artar)', () => {
    const rank = 2;
    const burnOf = (units: Record<number, UnitSetup>): { mp: number; blood: number } => {
      const b = make({ 0: 'antimage' }, { 0: 'mage' }, units);
      E(b).hp = E(b).maxHp = 99999;
      brand(b, E(b));
      E(b).mp = E(b).maxMp;
      P(b).blood = 0;
      const evs = cut(b, E(b));
      return { mp: evs.reduce((s, e) => s + (e.type === 'manaBurn' && e.target === E(b).uid ? e.amount : 0), 0), blood: bloodGain(evs, P(b).uid) };
    };
    const p = burnOf({});
    const t = burnOf(tree({ '0.r': rank }));
    expect(t.mp - p.mp).toBe(rank * modV('0.r', 'manaBurnAdd'));
    expect(t.blood - p.blood).toBe(rank * BASE_TITHE.bloodPerMp!);
  });
});

describe('Redtithe ağacı: satır 1 (Tithe Cut)', () => {
  it('1.f1: MP başına kan rank başına +0,2; 1.ea: taban 2,4 (öbür ekler üstüne)', () => {
    const b1 = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '1.f1': 3 }));
    expect(eff(b1, 'mana_burn', 'manaBurn').bloodPerMp).toBeCloseTo(BASE_TITHE.bloodPerMp! + 3 * fxV('1.f1'), 6);
    const b2 = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '1.ea': 1 }));
    expect(eff(b2, 'mana_burn', 'manaBurn').bloodPerMp).toBeCloseTo(fxV('1.ea'), 6);
    const b3 = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '1.ea': 1, '1.f1': 1 }));
    expect(eff(b3, 'mana_burn', 'manaBurn').bloodPerMp).toBeCloseTo(fxV('1.ea') + fxV('1.f1'), 6);
  });

  it('1.f1 savaşta: sökülen MP x yeni oran + isabet kanı (yuvarlanır)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '1.f1': 3 }));
    E(b).hp = E(b).maxHp = 99999;
    P(b).blood = 0;
    const evs = cut(b, E(b));
    const burned = evs.reduce((s, e) => s + (e.type === 'manaBurn' && e.target === E(b).uid ? e.amount : 0), 0);
    expect(burned).toBeGreaterThan(0);
    expect(bloodGain(evs, P(b).uid)).toBe(Math.round(burned * (BASE_TITHE.bloodPerMp! + 3 * fxV('1.f1')) + content.formulas.bloodBar!.hitGain));
  });

  it('1.fa Drained Dry (tur 4, Ömer 2026-11-22): Tithe Cut hasarı yarıya iner, söktüğü MP iki katına çıkar (oranlar veriden)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '1.fa': 1 }));
    const sk = b.skill('mana_burn', P(b).uid)!;
    const dmg = sk.effects.find((e) => e.type === 'damage') as { power: number } | undefined;
    const baseDmg = content.skills.mana_burn!.effects.find((e) => e.type === 'damage') as { power: number };
    expect(dmg).toBeDefined();
    expect(dmg!.power).toBeCloseTo(baseDmg.power * (1 + fxV('1.fa')), 6);
    const burn = sk.effects.find((e) => e.type === 'manaBurn') as { amount: number };
    expect(burn.amount).toBe(Math.round(BASE_TITHE.amount! * (1 + (treeOf('antimage')!.nodes['1.fa']!.fx![1] as unknown as { v: number }).v)));
  });
});

describe('Redtithe ağacı: satır 2 (Blood Brand)', () => {
  it('2.f1: Blood Brand Bleeding gücü rank başına +%10 (2.f2 / 2.f3 yolunu açar)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '2.f1': 3 }));
    expect(eff(b, 'drain_field', 'dot').power).toBeCloseTo(BASE_DOT.power * (1 + 3 * fxV('2.f1')), 6);
  });

  it('2.f2 işaret hasarı, 2.f3 MP bedel çarpanı, 2.ma süre, 2.fb bedel ve süre: derlenen skill ve işaret örneği', () => {
    const f2 = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '2.f2': 2 }));
    expect(eff(f2, 'drain_field', 'bloodBrand').markDamagePct).toBeCloseTo(BASE_BRAND.markDamagePct! + 2 * fxV('2.f2'), 6);
    const f3 = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '2.f3': 2 }));
    expect(eff(f3, 'drain_field', 'bloodBrand').costMult).toBeCloseTo(BASE_BRAND.costMult + 2 * fxV('2.f3'), 6);
    brand(f3, E(f3));
    const st = E(f3).statuses.find((s) => s.kind === 'blood_brand')!;
    expect(st.bloodBrand!.costMult).toBeCloseTo(BASE_BRAND.costMult + 2 * fxV('2.f3'), 6);
    const fire = content.skills.fire_bolt!;
    expect(skillCostAmount(fire.cost, E(f3))).toBe(Math.ceil(fire.cost.amount * (BASE_BRAND.costMult + 2 * fxV('2.f3')) - 1e-9));
    const ma = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '2.ma': 1 }));
    expect(eff(ma, 'drain_field', 'bloodBrand').turns).toBe(BASE_BRAND.turns + fxV('2.ma'));
    const fb = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '2.fb': 1 }));
    expect(fb.skill('drain_field', P(fb).uid)!.cost.amount).toBe(content.skills.drain_field!.cost.amount + fxV('2.fb'));
    expect(eff(fb, 'drain_field', 'bloodBrand').turns).toBe(BASE_BRAND.turns + fxV('2.fb', 1));
  });

  it('2.f2 savaşta: Tithe Cut işaretliye (1 + markDamagePct) katı (önizleme = vuruş yolu)', () => {
    const plain = make({ 0: 'antimage' }, { 0: 'mage' });
    const tr = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '2.f2': 2 }));
    for (const b of [plain, tr]) {
      E(b).hp = E(b).maxHp = 99999;
      brand(b, E(b));
    }
    const ratio = expected(tr, 'mana_burn', E(tr)) / expected(plain, 'mana_burn', E(plain));
    expect(ratio).toBeCloseTo((1 + BASE_BRAND.markDamagePct! + 2 * fxV('2.f2')) / (1 + BASE_BRAND.markDamagePct!), 1);
  });

  it('2.mb Searing Grasp: Blood Brand hedefin maks MP\'sinin payını da yakar', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '2.mb': 1 }));
    E(b).mp = E(b).maxMp;
    const evs = brand(b, E(b));
    const burn = evs.find((e) => e.type === 'manaBurn' && e.target === E(b).uid) as Extract<BattleEvent, { type: 'manaBurn' }> | undefined;
    expect(burn?.amount).toBe(Math.round(E(b).maxMp * (A.nodes['2.mb']!.fx![0] as unknown as { effect: { pctMax: number } }).effect.pctMax));
  });

  it('bar[2] Wide Basin: Blood Brand tutunca takıma 1 MP (MP havuzu olan dosta)', () => {
    const b = make({ 0: 'antimage', 1: 'mage' }, { 0: 'mage' }, { 0: { tree: only({}, 2) } });
    P(b, 1).mp = 0;
    brand(b, E(b));
    expect(P(b, 1).mp).toBe(1);
    expect(P(b).mp).toBe(0); // Redtithe'in manası yok
  });

  it('Blood Brand 2x2 (Ömer 2026-11-21 form r40): Wide Basin ve Searing Grasp alandaki her düşmanda ayrı işler; metin "each enemy"', () => {
    const wb = make({ 0: 'antimage', 1: 'mage' }, { 0: 'mage', 1: 'mage' }, { 0: { tree: only({}, 2) } });
    P(wb, 1).mp = 0;
    expect(b2Cells(wb)).toEqual(expect.arrayContaining([E(wb, 0).slot, E(wb, 1).slot]));
    brand(wb, E(wb));
    expect(E(wb, 1).statuses.some((s) => s.kind === 'blood_brand')).toBe(true);
    expect(P(wb, 1).mp).toBe(2); // iki işaretli düşman = 2 MP
    expect(A.mastery.bar[2]!.text).toContain('each enemy');
    const sg = make({ 0: 'antimage' }, { 0: 'mage', 1: 'mage' }, tree({ '2.mb': 1 }));
    for (const e of [E(sg, 0), E(sg, 1)]) e.mp = e.maxMp;
    const evs = brand(sg, E(sg));
    for (const e of [E(sg, 0), E(sg, 1)]) expect(evs.some((x) => x.type === 'manaBurn' && x.target === e.uid), e.uid).toBe(true);
    expect(A.nodes['2.mb']!.text).toContain('each enemy');
    expect(A.nodes['2.eb']!.text).toContain('each enemy');
  });
});
/** Blood Brand'in E0 anchor'lı alan hücreleri. */
const b2Cells = (b: Battle): number[] => b.areaCells('drain_field', E(b).slot, E(b).board, P(b).uid);

describe('Redtithe ağacı: satır 3 (Mirror Vein)', () => {
  it('3.f1 kalkan boyu rank başına +%4 (düz ek ve INT payı); 3.fb yalnız kendine, kalkan %30 büyük', () => {
    const f1 = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '3.f1': 3 }));
    const s1 = eff(f1, 'spell_ward', 'shield');
    expect(s1.power).toBeCloseTo(BASE_VEIN.power * (1 + 3 * fxV('3.f1')), 6);
    expect(s1.flat!).toBeCloseTo(BASE_VEIN.flat! * (1 + 3 * fxV('3.f1', 1)), 6);
    const fb = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, tree({ '3.fb': 1 }));
    const sb = eff(fb, 'spell_ward', 'shield');
    expect(sb.power).toBeCloseTo(BASE_VEIN.power * (1 + fxV('3.fb', 1)), 6);
    expect(sb.flat!).toBeCloseTo(BASE_VEIN.flat! * (1 + fxV('3.fb', 2)), 6);
    P(fb).blood = P(fb).maxBlood;
    expect(fb.useSkill(P(fb).uid, 'spell_ward').ok).toBe(true);
    expect(P(fb).shield).toBeGreaterThan(0);
    expect(P(fb, 1).shield).toBe(0);
    const plain = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' });
    P(plain).blood = P(plain).maxBlood;
    expect(plain.useSkill(P(plain).uid, 'spell_ward').ok).toBe(true);
    expect(P(plain, 1).shield).toBeGreaterThan(0);
  });

  // Purging Ward (Ömer 2026-11-20 r35): silme yalnız canı (oran) en düşük yaşayan dosta, Redtithe dahil (Ward Mending ile aynı seçim)
  it("3.n0 Purging Ward: yalnız canı en düşük dostun debuff'ları silinir; kalkan herkese", () => {
    const b = make({ 0: 'antimage', 1: 'warrior', 2: 'archer' }, { 0: 'mage' }, tree({ '3.n0': 1 }));
    const low = P(b, 1);
    const high = P(b, 2);
    low.hp = Math.round(low.maxHp / 3);
    low.statuses.push({ kind: 'slow', turns: 2, source: E(b).uid });
    high.statuses.push({ kind: 'slow', turns: 2, source: E(b).uid });
    P(b).blood = P(b).maxBlood;
    expect(b.lowestHpAllyOf(P(b))).toBe(low);
    expect(b.useSkill(P(b).uid, 'spell_ward').ok).toBe(true);
    expect(low.statuses.some((s) => s.kind === 'slow')).toBe(false);
    expect(high.statuses.some((s) => s.kind === 'slow')).toBe(true);
    for (const c of [P(b), low, high]) expect(c.shield).toBeGreaterThan(0);
  });

  it("3.n0 Purging Ward: Redtithe canı en düşükse kendi debuff'ı silinir", () => {
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, tree({ '3.n0': 1 }));
    const me = P(b);
    me.hp = Math.round(me.maxHp / 4);
    me.statuses.push({ kind: 'slow', turns: 2, source: E(b).uid });
    P(b, 1).statuses.push({ kind: 'slow', turns: 2, source: E(b).uid });
    me.blood = me.maxBlood;
    expect(b.useSkill(me.uid, 'spell_ward').ok).toBe(true);
    expect(me.statuses.some((s) => s.kind === 'slow')).toBe(false);
    expect(P(b, 1).statuses.some((s) => s.kind === 'slow')).toBe(true);
  });

  // Ömer 2026-11-20 r36 (a): canı en düşük dostta debuff yoksa debuff'ı olan dostlar arasında canı en düşük olana gider; kimsede yoksa bir şey olmaz
  it("3.n0 Purging Ward: canı en düşük dostta debuff yoksa debuff'ı olanlardan canı en düşüğe kayar", () => {
    const b = make({ 0: 'antimage', 1: 'warrior', 2: 'archer', 3: 'mage' }, { 0: 'mage' }, tree({ '3.n0': 1 }));
    P(b, 1).hp = Math.round(P(b, 1).maxHp / 4); // en düşük, debuff yok
    P(b, 2).hp = Math.round(P(b, 2).maxHp / 2);
    for (const i of [2, 3]) P(b, i).statuses.push({ kind: 'slow', turns: 2, source: E(b).uid });
    P(b).blood = P(b).maxBlood;
    expect(b.purgeTargetOf(P(b), b.skill('spell_ward', P(b).uid)!, { status: 'debuff' })).toBe(P(b, 2));
    expect(b.useSkill(P(b).uid, 'spell_ward').ok).toBe(true);
    expect(P(b, 2).statuses.some((s) => s.kind === 'slow')).toBe(false);
    expect(P(b, 3).statuses.some((s) => s.kind === 'slow')).toBe(true);
    // kimsede debuff yok: hedef yok
    const c = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, tree({ '3.n0': 1 }));
    expect(c.purgeTargetOf(P(c), c.skill('spell_ward', P(c).uid)!, { status: 'debuff' })).toBeUndefined();
  });

  it('3.n0 + 3.f2: Purging Ward ve Ward Mending aynı dostu seçer', () => {
    const b = make({ 0: 'antimage', 1: 'warrior', 2: 'archer' }, { 0: 'mage' }, tree({ '3.n0': 1, '3.f2': 1 }));
    const low = P(b, 2);
    low.hp = Math.round(low.maxHp / 3);
    low.statuses.push({ kind: 'slow', turns: 2, source: E(b).uid });
    P(b, 1).statuses.push({ kind: 'slow', turns: 2, source: E(b).uid });
    const hp0 = low.hp;
    const warHp = P(b, 1).hp;
    P(b).blood = P(b).maxBlood;
    expect(b.useSkill(P(b).uid, 'spell_ward').ok).toBe(true);
    expect(low.statuses.some((s) => s.kind === 'slow')).toBe(false);
    expect(low.hp).toBeGreaterThan(hp0);
    expect(P(b, 1).statuses.some((s) => s.kind === 'slow')).toBe(true);
    expect(P(b, 1).hp).toBe(warHp);
  });

  // Ömer 2026-11-20 r36 (b): Cloistered Ward (3.fb) alınmışsa temizlik de yalnız Redtithe'e (önizleme, ipucu, YZ aynı kural)
  it("3.n0 + 3.fb: Mirror Vein yalnız kendine ise temizlik de yalnız Redtithe'e (dostun debuff'ı kalır)", () => {
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, tree({ '3.n0': 1, '3.fb': 1, '3.f2': 1 }));
    const me = P(b);
    const w = P(b, 1);
    w.hp = Math.round(w.maxHp / 3);
    w.statuses.push({ kind: 'slow', turns: 2, source: E(b).uid });
    me.statuses.push({ kind: 'slow', turns: 2, source: E(b).uid });
    me.blood = me.maxBlood;
    const sk = b.skill('spell_ward', me.uid)!;
    expect(describeSkill(sk, me.stats, content.formulas).treeLines?.some((l) => /from yourself/.test(l))).toBe(true);
    const pv = previewForTargets(b, me, 'spell_ward', [me]);
    expect(pv.find((x) => x.uid === w.uid)?.dispel ?? []).toEqual([]);
    expect(pv.find((x) => x.uid === me.uid)?.dispel?.length).toBe(1);
    // YZ: temizlik değeri yalnız Redtithe'in debuff'ını sayar (dostun değerli debuff'ı Chilled sayılmaz)
    const cl = () => explainChoice(b, me.uid, content.aiConfig)!.candidates.find((c) => c.skill === 'spell_ward')?.terms?.cleanse ?? 0;
    w.statuses.push({ kind: 'chilled', turns: 2, source: E(b).uid });
    expect(cl()).toBe(0);
    me.statuses.push({ kind: 'chilled', turns: 2, source: E(b).uid });
    expect(cl()).toBeGreaterThan(0);
    me.statuses = me.statuses.filter((s) => s.kind !== 'chilled');
    w.statuses = w.statuses.filter((s) => s.kind !== 'chilled');
    expect(b.useSkill(me.uid, 'spell_ward').ok).toBe(true);
    expect(w.shield).toBe(0);
    expect(w.statuses.some((s) => s.kind === 'slow')).toBe(true);
    expect(me.statuses.some((s) => s.kind === 'slow')).toBe(false);
  });

  it('3.n0 Purging Ward: ipucu ve önizleme motorun seçtiği dostu gösterir; YZ temizlik değeri (terms.cleanse) yalnız onu sayar', () => {
    const b = make({ 0: 'antimage', 1: 'warrior', 2: 'archer' }, { 0: 'mage' }, tree({ '3.n0': 1 }));
    const low = P(b, 1);
    const high = P(b, 2);
    low.hp = Math.round(low.maxHp / 3);
    b.debugAddStatus(high.uid, 'stun', 1);
    P(b).blood = P(b).maxBlood;
    const sk = b.skill('spell_ward', P(b).uid)!;
    expect(describeSkill(sk, P(b).stats, content.formulas).treeLines?.some((l) => /lowest-HP ally/.test(l))).toBe(true);
    const pv = () => previewForTargets(b, P(b), 'spell_ward', b.living('party'));
    const cand = () => explainChoice(b, P(b).uid, content.aiConfig)!.candidates.find((c) => c.skill === 'spell_ward');
    // r36: debuff yalnız canı yüksek dostta: temizlik ona kayar (önizleme ve YZ değeri onu sayar)
    expect(pv().find((x) => x.uid === high.uid)?.dispel?.length).toBe(1);
    const one = cand()?.terms?.cleanse ?? 0;
    expect(one).toBeGreaterThan(0);
    // canı en düşük dostta da debuff varsa yalnız o silinir
    b.debugAddStatus(low.uid, 'stun', 1);
    expect(pv().find((x) => x.uid === low.uid)?.dispel?.length).toBe(1);
    expect(pv().find((x) => x.uid === high.uid)?.dispel ?? []).toEqual([]);
    expect(cand()?.terms?.cleanse ?? 0).toBeGreaterThan(0);
  });

  it('3.f2 Ward Mending: atınca canı en düşük dost iyileşir', () => {
    const b = make({ 0: 'antimage', 1: 'warrior', 2: 'archer' }, { 0: 'mage' }, tree({ '3.f2': 1 }));
    const low = P(b, 2);
    low.hp = Math.round(low.maxHp / 3);
    const hp0 = low.hp;
    P(b).blood = P(b).maxBlood;
    expect(b.useSkill(P(b).uid, 'spell_ward').ok).toBe(true);
    expect(low.hp).toBeGreaterThan(hp0);
  });

  it('3.mb Bastion of Null: Mirror Vein + taunt varken alınan fiziksel hasar -%30; Mirror Vein yoksa fark yok', () => {
    const hitOf = (units: Record<number, UnitSetup>, vein: boolean, seed: number): number | null => {
      const b = make({ 0: 'antimage' }, { 0: 'warrior' }, units, seed);
      const me = P(b);
      me.hp = me.maxHp = 99999;
      me.stats.armor = 0;
      E(b).stats.str = 400; // büyük vuruş: yuvarlama oranı bozmasın
      me.statuses.push({ kind: 'taunt', turns: 2, source: me.uid, taken: 0 });
      if (vein) {
        // Mirror Vein kalkan katmanı (selfHasShield spell_ward); emilen pay da hasara sayılır
        me.shield = 1;
        me.shieldHooks = [{ skill: 'spell_ward', caster: me.uid, magic: false, amount: 1, onAbsorb: {}, turns: 2 }];
      }
      const from = b.log.length;
      expect(b.useSkill(E(b).uid, 'melee_attack', me.uid).ok).toBe(true);
      const sum = b.log.slice(from).reduce((n, e) => n + (e.type === 'damage' && e.target === me.uid && !e.crit ? e.amount + (e.absorbed ?? 0) : 0), 0);
      return b.log.slice(from).some((e) => e.type === 'damage' && e.target === me.uid && e.crit) ? null : sum || null;
    };
    for (let seed = 1; seed < 40; seed++) {
      const p = hitOf({}, true, seed);
      const t = hitOf(tree({ '3.mb': 1 }), true, seed);
      if (p === null || t === null || p < 100) continue;
      expect(t / p).toBeCloseTo(1 + (A.nodes['3.mb']!.fx![0] as unknown as { mul: number }).mul, 1);
      const pu = hitOf({}, false, seed);
      const tu = hitOf(tree({ '3.mb': 1 }), false, seed);
      if (pu !== null && tu !== null) expect(tu).toBe(pu);
      return;
    }
    throw new Error('vuruş bulunamadı');
  });
});

describe('Redtithe ağacı: Exsanguinate ve Mastery', () => {
  it('4.d3: Ley Thread kısmı çıktı (yalnız tur öne alma); bar[4] Void Focus: en az kan 2 az', () => {
    expect(A.nodes['4.d3']!.fx!.some((f) => JSON.stringify(f).includes('ley_thread'))).toBe(false);
    const b = make({ 0: 'antimage' }, { 0: 'mage' }, { 0: { tree: only({}, 4) } });
    const sk = b.skill('void_strike', P(b).uid)!;
    expect(sk.cost.amount).toBe(content.skills.void_strike!.cost.amount - 2);
    P(b).blood = sk.cost.amount;
    P(b).cooldowns.void_strike = 0;
    expect(b.useSkill(P(b).uid, 'void_strike', E(b).uid).ok).toBe(true);
    expect(P(b).blood).toBe(0);
  });
});

// ---- r36 (Ömer form r36, 2026-11-20): eski pasif 14 düğüm + bar[3] etkin. Sayılar veriden (PROVİZYON). ----
const bleedTicks = (evs: BattleEvent[], uid: string): Array<Extract<BattleEvent, { type: 'damage' }>> =>
  evs.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.target === uid && e.origin === 'status' && e.status === 'bleeding');
const nodeDamage = (evs: BattleEvent[], node: string, uid: string): number =>
  evs.reduce((s, e) => s + (e.type === 'damage' && e.cause === `antimage:${node}` && e.target === uid ? e.amount + e.absorbed : 0), 0);
const act0 = (key: string, i = 0): Record<string, unknown> => (A.nodes[key]!.fx![i] as unknown as { do: Array<Record<string, unknown>> }).do[0]!;
/** Blood Brand YZ değeri (terms.brand) verilen düğümlerle. */
const brandTerm = (ranks: Record<string, number>): number => {
  const b = make({ 0: 'antimage' }, { 0: 'mage' }, tree(ranks));
  P(b).blood = 40;
  return explainChoice(b, P(b).uid, content.aiConfig)!.candidates.find((c) => c.skill === 'drain_field')?.terms?.brand ?? 0;
};
/** İşaretli düşman class skill'i kullanır (Blood Brand ek tikleri); Redtithe hedef. */
function foeActs(b: Battle, n: number): BattleEvent[] {
  const foe = E(b);
  const from = b.log.length;
  for (let i = 0; i < n; i++) {
    foe.cooldowns = {};
    foe.mp = foe.maxMp;
    const id = foe.skills.find((s) => b.validTargets(foe.uid, s).some((t) => t.uid === P(b).uid))!;
    expect(b.useSkill(foe.uid, id, P(b).uid).ok).toBe(true);
  }
  return b.log.slice(from);
}
/** turns modu: `c`nin `n` tur başını geçirir (herkes Skip Turn); olaylar. */
function passTurns(b: Battle, c: Combatant, n: number): BattleEvent[] {
  const from = b.log.length;
  let seen = 0;
  for (let i = 0; i < 300 && seen < n && !b.winner; i++) {
    expect(b.skipTurn().ok).toBe(true);
    if (b.currentUid === c.uid) seen++;
  }
  expect(seen).toBe(n);
  return b.log.slice(from);
}
const turnsBattle = (ranks: Record<string, number>): Battle => {
  const b = make({ 0: 'antimage' }, { 0: 'mage' }, tree(ranks), 11, 'turns');
  for (const c of [P(b), E(b)]) c.hp = c.maxHp = 99999;
  b.currentUid = P(b).uid;
  return b;
};

describe('Redtithe ağacı r36: satır 0', () => {
  it('0.eb Open Veins: senin Bleeding tikin (tur başı + Blood Brand ek tiki) başına kan; ağaçsız kan yok; YZ değeri', () => {
    const per = act0('0.eb').blood as number;
    for (const on of [false, true]) {
      const b = make({ 0: 'antimage' }, { 0: 'warrior' }, on ? tree({ '0.eb': 1 }) : {});
      for (const c of [P(b), E(b)]) c.hp = c.maxHp = 99999;
      brand(b, E(b));
      P(b).blood = 0;
      const evs = foeActs(b, 2);
      const ticks = bleedTicks(evs, E(b).uid).length;
      expect(ticks).toBe(2 * BASE_BRAND.ticks);
      expect(bloodGain(evs, P(b).uid)).toBe(on ? ticks * per : 0);
    }
    const t = turnsBattle({ '0.eb': 1 });
    brand(t, E(t));
    P(t).blood = 0;
    const evs = passTurns(t, E(t), 1);
    const ticks = bleedTicks(evs, E(t).uid).length;
    expect(ticks).toBeGreaterThan(0);
    expect(bloodGain(evs, P(t).uid)).toBe(ticks * per);
    expect(brandTerm({ '0.eb': 1 })).toBeGreaterThan(brandTerm({}));
  });

  it('0.mb Final Tithe: Blood Brand süre dolunca işaretli DEX hasarı yer; YZ değeri sayar', () => {
    const b = turnsBattle({ '0.mb': 1 });
    brand(b, E(b));
    const evs = passTurns(b, E(b), BASE_BRAND.turns + 1);
    expect(E(b).statuses.some((s) => s.kind === 'blood_brand')).toBe(false);
    expect(nodeDamage(evs, '0.mb', E(b).uid)).toBeGreaterThan(0);
    const plain = turnsBattle({});
    brand(plain, E(plain));
    expect(nodeDamage(passTurns(plain, E(plain), BASE_BRAND.turns + 1), '0.mb', E(plain).uid)).toBe(0);
    expect(brandTerm({ '0.mb': 1 })).toBeGreaterThan(brandTerm({}));
  });

  it('0.mb Final Tithe (r38): işaret silinince de tetiklenir; yeniden atış tetiklemez', () => {
    const b = turnsBattle({ '0.mb': 1 });
    brand(b, E(b));
    b.currentUid = P(b).uid;
    expect(nodeDamage(brand(b, E(b)), '0.mb', E(b).uid)).toBe(0); // yeniden atış bitiş sayılmaz
    const e = E(b);
    const evs: BattleEvent[] = [];
    (b as any).liftStatus(e, 'blood_brand', (x: BattleEvent) => evs.push(x)); // silinme (broken)
    expect(e.statuses.some((s) => s.kind === 'blood_brand')).toBe(false);
    expect(nodeDamage(evs, '0.mb', e.uid)).toBeGreaterThan(0);
  });
});

describe('Redtithe ağacı r36: satır 2 (Blood Brand)', () => {
  it("2.n0 Hush of the Brand: Tithe Cut işaretlinin MP'sini bitirince Silence; işaretsizde yok; YZ değeri (terms.tree)", () => {
    const run = (marked: boolean): boolean => {
      const b = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '2.n0': 1 }));
      E(b).hp = E(b).maxHp = 99999;
      if (marked) brand(b, E(b));
      E(b).mp = 2;
      cut(b, E(b));
      return E(b).statuses.some((s) => s.kind === 'silence');
    };
    expect(run(true)).toBe(true);
    expect(run(false)).toBe(false);
    // YZ: turns modunda (MP yenilenir: susturma engellenen hamle değeri taşır; test modunda boş MP'li büyücüyü susturmak değersiz)
    const val = (ranks: Record<string, number>): number => {
      const b = make({ 0: 'antimage' }, { 0: 'mage' }, tree(ranks), 11, 'turns');
      b.currentUid = P(b).uid;
      b.debugAddStatus(E(b).uid, 'blood_brand', 3);
      E(b).mp = 2;
      return explainChoice(b, P(b).uid, content.aiConfig)!.candidates.find((c) => c.skill === 'mana_burn')?.terms?.tree ?? 0;
    };
    expect(val({ '2.n0': 1 })).toBeGreaterThan(val({}));
  });

  it("2.r Widening Cut: Blood Brand Bleeding'i her önceki tik için rank başına daha sert (ek tikler de sayar); YZ değeri artar", () => {
    const rank = 3;
    const per = (A.nodes['2.r']!.fx![0] as unknown as { mod: { powerMul: number } }).mod.powerMul;
    const dmg = (ranks: Record<string, number>): number[] => {
      const b = make({ 0: 'antimage' }, { 0: 'warrior' }, tree(ranks));
      for (const c of [P(b), E(b)]) c.hp = c.maxHp = 99999;
      P(b).stats.dex = 2000; // büyük tik: yuvarlama oranı bozmasın
      brand(b, E(b));
      return bleedTicks(foeActs(b, 3), E(b).uid).map((e) => e.amount + e.absorbed);
    };
    const p = dmg({});
    const t = dmg({ '2.r': rank });
    expect(p.length).toBe(3 * BASE_BRAND.ticks);
    t.forEach((d, i) => expect(d / p[i]!).toBeCloseTo(1 + rank * per * i, 2));
    expect(brandTerm({ '2.r': rank })).toBeGreaterThan(brandTerm({}));
  });

  it('2.ea Deep Brand: işaretli skill kullanınca Bleeding bir ek tik daha atar; YZ değeri artar', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' }, tree({ '2.ea': 1 }));
    expect(eff(b, 'drain_field', 'bloodBrand').ticks).toBe(BASE_BRAND.ticks + fxV('2.ea'));
    for (const c of [P(b), E(b)]) c.hp = c.maxHp = 99999;
    brand(b, E(b));
    expect(bleedTicks(foeActs(b, 1), E(b).uid).length).toBe(BASE_BRAND.ticks + fxV('2.ea'));
    expect(brandTerm({ '2.ea': 1 })).toBeGreaterThan(brandTerm({}));
  });

  it("2.eb Stripping Brand: Blood Brand hedefin bir buff'ını siler (rastgele); ipucu 'random'; YZ dispel değeri", () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '2.eb': 1 }));
    b.debugAddStatus(E(b).uid, 'haste', 3);
    b.debugAddStatus(E(b).uid, 'fortify', 3);
    const sk = b.skill('drain_field', P(b).uid)!;
    expect(describeSkill(sk, P(b).stats, content.formulas).treeLines?.some((l) => /Removes 1 random buff from the target/.test(l))).toBe(true);
    P(b).blood = P(b).maxBlood;
    expect(explainChoice(b, P(b).uid, content.aiConfig)!.candidates.find((c) => c.skill === 'drain_field')?.terms?.dispel ?? 0).toBeGreaterThan(0);
    const before = E(b).statuses.filter((s) => s.kind === 'haste' || s.kind === 'fortify').length;
    brand(b, E(b));
    expect(E(b).statuses.filter((s) => s.kind === 'haste' || s.kind === 'fortify').length).toBeLessThan(before);
  });

  it('2.fa Heavy Brand: MP bedel çarpanı taban 2,5 (2.f3 eki üstüne), kan bedeli +10; işaretlinin büyüsü pahalı', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '2.fa': 1 }));
    expect(fxV('2.fa')).toBe(2.5);
    expect(eff(b, 'drain_field', 'bloodBrand').costMult).toBeCloseTo(fxV('2.fa'), 6);
    expect(b.skill('drain_field', P(b).uid)!.cost.amount).toBe(content.skills.drain_field!.cost.amount + fxV('2.fa', 1));
    const c = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '2.fa': 1, '2.f3': 2 }));
    expect(eff(c, 'drain_field', 'bloodBrand').costMult).toBeCloseTo(fxV('2.fa') + 2 * fxV('2.f3'), 6);
    brand(b, E(b));
    const fire = content.skills.fire_bolt!;
    expect(skillCostAmount(fire.cost, E(b))).toBe(Math.ceil(fire.cost.amount * fxV('2.fa') - 1e-9));
    // YZ: işaretlinin MP bedel artışı değeri (terms.brand) büyür
    expect(brandTerm({ '2.fa': 1 })).toBeGreaterThan(brandTerm({}));
  });

  it("2.v Reaping Brand: işaret bitince işaretli DEX hasarı yer ve Blood Brand'in cooldown'u sıfırlanır; YZ değeri artar", () => {
    const b = turnsBattle({ '2.v': 1 });
    brand(b, E(b));
    // işaretliye yeniden atmak (süre yenilenir) bitiş sayılmaz: hasar yok
    b.currentUid = P(b).uid;
    expect(nodeDamage(brand(b, E(b)), '2.v', E(b).uid)).toBe(0);
    P(b).cooldowns.drain_field = 99;
    const evs = passTurns(b, E(b), BASE_BRAND.turns + 1);
    expect(nodeDamage(evs, '2.v', E(b).uid)).toBeGreaterThan(0);
    expect(P(b).cooldowns.drain_field ?? 0).toBe(0);
    expect(brandTerm({ '2.v': 1 })).toBeGreaterThan(brandTerm({}));
  });
});

describe('Redtithe ağacı r36: satır 3 (Mirror Vein) ve bar[3]', () => {
  /**
   * Mirror Vein kalkanı altındaki Redtithe'e tek vuruş; kritikse null. `shield` büyük: kalkan emişi dahil toplam (kalkan ham hasara çarpar);
   * `shield` 1: yalnız İLK hasar olayında cana inen. Bu iki düğüm kalkan ham hasar kuralından muaf (Ömer 2026-11-21, form r40): yüzde kalkana
   * çarpmadan önce uygulanır, iki durumda da oran 1 + mul.
   */
  const hitUnder = (units: Record<number, UnitSetup>, foe: string, skill: string, seed: number, shield = 99999): number | null => {
    const b = make({ 0: 'antimage' }, { 0: foe }, units, seed);
    const me = P(b);
    me.hp = me.maxHp = 99999;
    me.stats.armor = 0;
    me.stats.magicArmor = 0;
    E(b).stats.str = shield === 1 ? 800 : 400; // tek olayda da yeterince büyük vuruş (oran 2 basamak)
    E(b).stats.int = shield === 1 ? 800 : 400;
    E(b).mp = E(b).maxMp;
    me.shield = shield; // büyükse vuruş boyunca kalkan durur (çok vuruşlu saldırıda ilk vuruşta kırılmasın)
    me.shieldHooks = [{ skill: 'spell_ward', caster: me.uid, magic: false, amount: shield, onAbsorb: {}, turns: 2 }];
    const from = b.log.length;
    if (!b.useSkill(E(b).uid, skill, me.uid).ok) return null;
    const evs = b.log.slice(from).filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.target === me.uid && e.origin !== 'status');
    if (evs.some((e) => e.crit) || !evs.length) return null;
    return shield === 1 ? evs[0]!.amount : evs.reduce((n, e) => n + e.amount + e.absorbed, 0);
  };
  const ratioOf = (units: Record<number, UnitSetup>, foe: string, skill: string, shield = 99999): number => {
    for (let seed = 1; seed < 40; seed++) {
      const p = hitUnder({}, foe, skill, seed, shield);
      const t = hitUnder(units, foe, skill, seed, shield);
      if (p !== null && t !== null && p > 200) return t / p;
    }
    throw new Error('vuruş bulunamadı');
  };

  it('3.f3 Spell-Proof Vein: kalkanlı dost rank başına daha az büyü hasarı alır (kalkana çarpan vuruş dahil); fizikselde fark yok', () => {
    const rank = 5;
    const mul = (A.nodes['3.f3']!.fx![0] as unknown as { mul: number }).mul;
    // Kalkan muafiyeti (Ömer 2026-11-21, form r40): kalkan tamamen emse de kalkandan düşen düğüm yüzdesi kadar az
    expect(ratioOf(tree({ '3.f3': rank }), 'mage', 'fire_bolt')).toBeCloseTo(1 + rank * mul, 2);
    expect(ratioOf(tree({ '3.f3': rank }), 'mage', 'fire_bolt', 1)).toBeCloseTo(1 + rank * mul, 2);
    expect(ratioOf(tree({ '3.f3': rank }), 'warrior', 'melee_attack', 1)).toBeCloseTo(1, 6);
  });

  it('bar[3] Warded Steps: kalkanlı dost %5 daha az fiziksel hasar alır (Ömer r36: %5); metin sayıyla aynı', () => {
    const mul = (A.mastery.bar[3]!.fx![0] as unknown as { mul: number }).mul;
    expect(mul).toBeLessThan(0); // değer veriden (Ömer r36 %5; ağaç ayarı 2026-11-21 sınıf çarpanıyla kısıldı)
    expect(A.mastery.bar[3]!.text).toContain(`${+(-mul * 100).toFixed(3)}%`);
    expect(ratioOf({ 0: { tree: only({}, 3) } }, 'warrior', 'melee_attack')).toBeCloseTo(1 + mul, 2); // kalkan tamamen emer: kalkandan %5 az düşer (muafiyet)
    expect(ratioOf({ 0: { tree: only({}, 3) } }, 'warrior', 'melee_attack', 1)).toBeCloseTo(1 + mul, 2);
  });

  it('3.f3 / bar[3]: YZ Mirror Vein değeri (terms.veinTree) kancalarla doğar', () => {
    const val = (units: Record<number, UnitSetup>): number => {
      const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage', 1: 'warrior' }, units);
      P(b).blood = P(b).maxBlood;
      return explainChoice(b, P(b).uid, content.aiConfig)!.candidates.find((c) => c.skill === 'spell_ward')?.terms?.veinTree ?? 0;
    };
    expect(val({})).toBe(0);
    expect(val(tree({ '3.f3': 5 }))).toBeGreaterThan(0);
    expect(val({ 0: { tree: only({}, 3) } })).toBeGreaterThan(0);
  });

  /** Mirror Vein atılır, sonra düşman büyücü dosta (slot 1) büyü atar; olaylar. */
  const veinThenSpell = (ranks: Record<string, number>, seed: number): { b: Battle; evs: BattleEvent[] } => {
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, tree(ranks), seed);
    for (const c of [P(b), P(b, 1), E(b)]) c.hp = c.maxHp = 99999;
    P(b).blood = P(b).maxBlood;
    expect(b.useSkill(P(b).uid, 'spell_ward').ok).toBe(true);
    expect(P(b, 1).shield).toBeGreaterThan(0);
    E(b).mp = E(b).maxMp;
    const from = b.log.length;
    expect(b.useSkill(E(b).uid, 'fire_bolt', P(b, 1).uid).ok).toBe(true);
    return { b, evs: b.log.slice(from) };
  };
  /** Mirror Vein YZ terimi (varsayılan veinTree) verilen düğümlerle; büyücü + savaşçı düşman. */
  const veinTerm = (ranks: Record<string, number>, term = 'veinTree'): number => {
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage', 1: 'warrior' }, tree(ranks));
    P(b).blood = P(b).maxBlood;
    P(b, 1).hp = Math.round(P(b, 1).maxHp / 2); // yaralı dost: kırılma şifası (Shelter Echo) boşa gitmez
    return explainChoice(b, P(b).uid, content.aiConfig)!.candidates.find((c) => c.skill === 'spell_ward')?.terms?.[term] ?? 0;
  };
  const absorbed = (evs: BattleEvent[], uid: string): number => evs.reduce((s, e) => s + (e.type === 'damage' && e.target === uid ? e.absorbed : 0), 0);

  it('3.ma Blood for Blood: kalkan büyü emince büyücü Bleeding yer (kaynak Redtithe); YZ veinTree değeri', () => {
    for (let seed = 1; seed < 30; seed++) {
      const { b, evs } = veinThenSpell({ '3.ma': 1 }, seed);
      if (absorbed(evs, P(b, 1).uid) <= 0) continue;
      const st = E(b).statuses.find((s) => s.kind === 'bleeding');
      expect(st?.source).toBe(P(b).uid);
      expect(st?.turns).toBe(act0('3.ma').turns);
      // Blood Brand'in Bleeding'ini taşıyan büyücüde 3.ma Bleeding'i onu zayıflatmaz (tek örnek; güç ve süre düşmez)
      const c = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, tree({ '3.ma': 1 }), seed);
      for (const u of [P(c), P(c, 1), E(c)]) u.hp = u.maxHp = 99999;
      brand(c, E(c));
      const bb = E(c).statuses.find((s) => s.kind === 'bleeding')!;
      const [amt0, turns0] = [bb.amount ?? 0, bb.turns];
      P(c).blood = P(c).maxBlood;
      expect(c.useSkill(P(c).uid, 'spell_ward').ok).toBe(true);
      E(c).mp = E(c).maxMp;
      const ev2 = c.log.length;
      expect(c.useSkill(E(c).uid, 'fire_bolt', P(c, 1).uid).ok).toBe(true);
      const after = E(c).statuses.filter((s) => s.kind === 'bleeding');
      expect(after.length).toBe(1);
      const ticked = bleedTicks(c.log.slice(ev2), E(c).uid).length > 0; // Blood Brand ek tiki süreyi azaltmaz
      expect(after[0]!.amount ?? 0, String(ticked)).toBeGreaterThanOrEqual(amt0);
      expect(after[0]!.turns).toBeGreaterThanOrEqual(turns0);
      expect(veinTerm({ '3.ma': 1 })).toBeGreaterThan(0);
      return;
    }
    throw new Error('emiş bulunamadı');
  });

  it("3.v Mirror Ward: emilen büyünün %25'i büyücüye döner", () => {
    for (let seed = 1; seed < 30; seed++) {
      const { b, evs } = veinThenSpell({ '3.v': 1 }, seed);
      const abs = absorbed(evs, P(b, 1).uid);
      if (abs <= 0) continue;
      const back = nodeDamage(evs, '3.v', E(b).uid);
      expect(back).toBeGreaterThan(0);
      expect(back).toBeLessThanOrEqual(Math.max(1, Math.round(abs * (act0('3.v').damage as number))) + 1);
      expect(veinTerm({ '3.v': 1 })).toBeGreaterThan(0);
      return;
    }
    throw new Error('emiş bulunamadı');
  });

  it("3.r Shelter Echo: Mirror Vein kalkanı kırılınca taşıyan rank başına maks canın %2'si iyileşir", () => {
    const rank = 3;
    for (let seed = 1; seed < 30; seed++) {
      const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, tree({ '3.r': rank }), seed);
      const ally = P(b, 1);
      P(b).blood = P(b).maxBlood;
      expect(b.useSkill(P(b).uid, 'spell_ward').ok).toBe(true);
      ally.maxHp = 99999;
      ally.hp = 50000;
      E(b).stats.int = 400;
      E(b).mp = E(b).maxMp;
      const from = b.log.length;
      expect(b.useSkill(E(b).uid, 'fire_bolt', ally.uid).ok).toBe(true);
      const evs = b.log.slice(from);
      if (ally.shield > 0 || absorbed(evs, ally.uid) <= 0) continue;
      const heal = evs.find((e) => e.type === 'heal' && e.target === ally.uid) as Extract<BattleEvent, { type: 'heal' }> | undefined;
      expect(heal?.amount).toBe(Math.round(ally.maxHp * (act0('3.r').heal as number) * rank));
      expect(veinTerm({ '3.r': rank })).toBeGreaterThan(0);
      return;
    }
    throw new Error('kırılma bulunamadı');
  });

  it('3.ea Long Vein: kalkanlar 1 tur uzun; 3.fa Opened Veins: kalkan %40 büyük, kan bedeli +10', () => {
    const ea = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '3.ea': 1 }));
    expect(eff(ea, 'spell_ward', 'shield').turns).toBe(BASE_VEIN.turns! + fxV('3.ea'));
    P(ea).blood = P(ea).maxBlood;
    expect(ea.useSkill(P(ea).uid, 'spell_ward').ok).toBe(true);
    expect(P(ea).shieldHooks?.find((h) => h.skill === 'spell_ward')?.turns).toBe(BASE_VEIN.turns! + fxV('3.ea'));
    const fa = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '3.fa': 1 }));
    const s = eff(fa, 'spell_ward', 'shield');
    expect(s.power).toBeCloseTo(BASE_VEIN.power * (1 + fxV('3.fa')), 6);
    expect(s.flat!).toBeCloseTo(BASE_VEIN.flat! * (1 + fxV('3.fa', 1)), 6);
    expect(fa.skill('spell_ward', P(fa).uid)!.cost.amount).toBe(content.skills.spell_ward!.cost.amount + fxV('3.fa', 2));
    // YZ: büyük kalkan genel kalkan teriminde (terms.shield) büyür; uzun kalkan büyü emişi kanında (terms.vein) küçülmez (ufukla sınırlı)
    expect(veinTerm({ '3.fa': 1 }, 'shield')).toBeGreaterThan(veinTerm({}, 'shield'));
    expect(veinTerm({ '3.ea': 1 }, 'vein')).toBeGreaterThanOrEqual(veinTerm({}, 'vein'));
  });
});

describe('Redtithe ağacı r36: kan eylemi (Open Veins yolu)', () => {
  it('`blood` eylemi kan barsız sınıfta derlenmez', () => {
    const w = JSON.parse(JSON.stringify(treeOf('warrior')!)) as TreeData;
    w.nodes['0.f1']!.fx = [{ k: 'hook', h: 'trigger', on: 'turnStart', do: [{ blood: 2 }] } as never];
    expect(checkTreeFx(w).join(' ')).toMatch(/no blood bar/);
  });
});
