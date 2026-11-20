import { describe, expect, it } from 'vitest';
import { Battle, content, previewForTargets, skillCostAmount, type BattleEvent, type BattleMode, type Combatant, type SkillEffect, type Teams, type UnitSetup } from '../src/engine';
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
    expect(A.version).toBe(6);
    expect(A.rows.map((r) => r.name)).toEqual(['Blood Tithe', 'Tithe Cut', 'Blood Brand', 'Mirror Vein']);
    expect(A.ult.name).toBe('Exsanguinate');
  });

  it('pasif (inactive) düğüm alınamaz ve motor yok sayar; etkin düğüm metinlerinde eski kit adı yok', () => {
    const inactive = Object.entries(A.nodes).filter(([, n]) => n.inactive).map(([k]) => k);
    expect(inactive.length).toBeGreaterThan(0);
    for (const k of inactive) expect(take(A, 30, emptyAlloc(A), k).ok, k).toBe(false);
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

  it('1.fa Drained Dry: hasarsız Tithe Cut isabet zarı atmaz; MP ve isabet kanı yine gelir', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' }, tree({ '1.fa': 1 }));
    expect(b.skill('mana_burn', P(b).uid)!.effects.some((e) => e.type === 'damage')).toBe(false);
    P(b).blood = 0;
    const from = b.log.length;
    expect(b.useSkill(P(b).uid, 'mana_burn', E(b).uid).ok).toBe(true);
    const evs = b.log.slice(from);
    const burned = evs.reduce((s, e) => s + (e.type === 'manaBurn' ? e.amount : 0), 0);
    expect(burned).toBeGreaterThan(0);
    expect(bloodGain(evs, P(b).uid)).toBe(Math.round(burned * BASE_TITHE.bloodPerMp! + content.formulas.bloodBar!.hitGain));
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
    expect(burn?.amount).toBe(Math.round(E(b).maxMp * 0.15));
  });

  it('bar[2] Wide Basin: Blood Brand tutunca takıma 1 MP (MP havuzu olan dosta)', () => {
    const b = make({ 0: 'antimage', 1: 'mage' }, { 0: 'mage' }, { 0: { tree: only({}, 2) } });
    P(b, 1).mp = 0;
    brand(b, E(b));
    expect(P(b, 1).mp).toBe(1);
    expect(P(b).mp).toBe(0); // Redtithe'in manası yok
  });
});

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

  it('3.n0 Purging Ward: Mirror Vein önce dostların debuff\'larını siler, sonra kalkan', () => {
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, tree({ '3.n0': 1 }));
    P(b, 1).statuses.push({ kind: 'slow', turns: 2, source: E(b).uid });
    P(b).blood = P(b).maxBlood;
    expect(b.useSkill(P(b).uid, 'spell_ward').ok).toBe(true);
    expect(P(b, 1).statuses.some((s) => s.kind === 'slow')).toBe(false);
    expect(P(b, 1).shield).toBeGreaterThan(0);
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
