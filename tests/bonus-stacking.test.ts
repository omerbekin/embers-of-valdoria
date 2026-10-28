import { describe, expect, it } from 'vitest';
import { effMult, effNum, mergeFxValue, stackTimes, stackValues } from '../src/engine/tree-hooks';
import { elemResistOf } from '../src/engine/tree-hooks';
import { affixValues, type ItemInstance } from '../src/progression/items';
import { loadout } from '../src/progression/loadout';
import { compileTree } from '../src/progression/skill-tree-compile';
import type { TreeAlloc } from '../src/progression/skill-tree';
import { treeOf } from '../src/progression/skill-tree-data';

// Bonus birleşme kuralı (Ömer 2026-10-27): FARKLI kaynakların "×" bonusları çarpılır (iki ×1.1 item = ×1.21; item ×1.1 + düğüm ×1.18 = 1.1 x 1.18),
// bir düğümün RANK'ları ise birbirini çarpmaz, tek çarpanda toplanır ("×1.06 per rank" 3 rank = ×1.18, 5 rank = ×1.30; "×0.96 per rank" 3 rank = ×0.88).
// "+X%" / düz "+45" yazılanlar toplanmaya devam eder. Yazı ile hesap aynı olmalı.

/** Tek affix'li örnek (ilvl 10, orta zar). */
const inst = (base: string, affix: string, uid: string): ItemInstance => ({ uid, id: base, rolls: { rarity: 'common', ilvl: 10, affixes: [{ id: affix, q: 0.5 }] } });
const v = (affix: string, i = 0) => affixValues(affix, 10, 0.5)[i]! / 100;

describe('birleşme yardımcıları', () => {
  it('iki ×1.1 kaynağı ×1.21 verir; toplamsal kaynaklar toplanır', () => {
    expect(1 + stackValues('more', 0.1, 0.1)).toBeCloseTo(1.21, 12);
    expect(stackValues('mult', 1.1, 1.1)).toBeCloseTo(1.21, 12);
    expect(1 - stackValues('less', 0.1, 0.1)).toBeCloseTo(0.81, 12); // iki ×0.9 = ×0.81
    expect(stackValues(undefined, 0.1, 0.1)).toBeCloseTo(0.2, 12); // "+10%" + "+10%" = "+20%"
    expect(1 + stackTimes('more', 0.06, 3)).toBeCloseTo(1.18, 12); // rank'lar doğrusal
    expect(1 + stackTimes('more', 0.06, 5)).toBeCloseTo(1.3, 12);
    expect(1 - stackTimes('less', 0.04, 3)).toBeCloseTo(0.88, 12);
    expect(stackTimes('mult', 1.06, 3)).toBeCloseTo(1.18, 12);
    expect(stackTimes(undefined, 0.03, 3)).toBeCloseTo(0.09, 12);
  });

  it('item ×1.1 + 3 rank "×1.06 per rank" düğüm = 1.1 x 1.18; iki farklı düğüm de çarpılır', () => {
    const h = { itemEffects: { frontRowDamage: 0.1 }, treeFx: { frontRowDamage: stackTimes('more', 0.06, 3) } };
    expect(1 + effNum(h, 'frontRowDamage')).toBeCloseTo(1.1 * 1.18, 12);
    expect(1 + (mergeFxValue('frontRowDamage', 0.18, 0.1) as number)).toBeCloseTo(1.18 * 1.1, 12);
  });

  it('item + ağaç kanalı: "×" anahtarlar çarpılır, diğerleri toplanır', () => {
    const h = { itemEffects: { damageTakenReduce: 0.1, frontRowDamage: 0.1, tierDamageMult: 1.1, blockChance: 0.1, elemResist: { fire: 0.1 } }, treeFx: { damageTakenReduce: 0.1, frontRowDamage: 0.1, tierDamageMult: 1.1, blockChance: 0.1, elemResist: { fire: 0.1 } } };
    expect(1 - effNum(h, 'damageTakenReduce')).toBeCloseTo(0.81, 12);
    expect(1 + effNum(h, 'frontRowDamage')).toBeCloseTo(1.21, 12);
    expect(effMult(h, 'tierDamageMult')).toBeCloseTo(1.21, 12);
    expect(1 - elemResistOf(h, 'fire')).toBeCloseTo(0.81, 12);
    expect(effNum(h, 'blockChance')).toBeCloseTo(0.2, 12); // "+10% Block chance" toplamsal
    expect(mergeFxValue('lowHpReduce', { below: 0.5, reduce: 0.1 }, { below: 0.3, reduce: 0.1 })).toEqual({ below: 0.5, reduce: 1 - 0.9 * 0.9 });
    expect(mergeFxValue('critMp', 2, 3)).toBe(5);
  });
});

describe('item affix\'leri (loadout)', () => {
  it('iki "×Max HP" item çarpılır, iki "+Max HP" item toplanır', () => {
    const two = loadout({ class: 'warrior', equipment: { helm: inst('leather_coif', 'a_hppct', 'h'), armor: inst('padded_gambeson', 'a_hppct', 'a') } });
    expect(two.modifiers?.hpMult).toBeCloseTo((1 + v('a_hppct')) ** 2, 4);
    expect(two.modifiers?.hpMult).not.toBeCloseTo(1 + 2 * v('a_hppct'), 4);
    const flat = loadout({ class: 'warrior', equipment: { helm: inst('leather_coif', 'c_hp', 'h'), armor: inst('padded_gambeson', 'c_hp', 'a') } });
    expect(flat.modifiers?.hpAdd).toBeCloseTo(2 * affixValues('c_hp', 10, 0.5)[0]!, 4);
  });

  it('Endurance: "+% Lucky Escape" toplanır, "×0.9x damage taken below 30%" çarpılır', () => {
    const l = loadout({ class: 'warrior', equipment: { helm: inst('leather_coif', 'a_endure', 'h'), armor: inst('padded_gambeson', 'a_endure', 'a') } });
    expect(l.modifiers?.surviveAdd).toBeCloseTo(2 * v('a_endure', 0), 4);
    expect(l.itemEffects?.lowHpReduce?.reduce).toBeCloseTo(1 - (1 - v('a_endure', 1)) ** 2, 4);
  });
});

describe('skill ağacı rank\'ı', () => {
  const W = treeOf('warrior')!;
  /** Ağacın önündeki düğümleri doldurup `key`e `rank` verir (kilit kuralı derlemeyi etkilemez: compileTree dağılımı olduğu gibi derler). */
  const only = (key: string, rank: number): TreeAlloc => ({ v: W.version, r: { [key]: rank } });
  it('"×1.06 power per rank" cond kancası: 3 rank = ×1.18 (rankler doğrusal, 1.06^3 değil)', () => {
    const node = Object.entries(W.nodes).find(([, n]) => n.text?.includes('6% more power per rank') && JSON.stringify(n.fx).includes('powerMul'))!;
    const per = (node[1].fx![0] as unknown as { mod: { powerMul: number } }).mod.powerMul;
    const hook = compileTree(W, only(node[0], 3))!.hooks!.find((h) => h.node === `warrior:${node[0]}`) as { mod: { powerMul: number } };
    expect(1 + hook.mod.powerMul).toBeCloseTo(1 + 3 * per, 12);
    expect(1 + hook.mod.powerMul).not.toBeCloseTo((1 + per) ** 3, 6);
    const one = compileTree(W, only(node[0], 1))!.hooks!.find((h) => h.node === `warrior:${node[0]}`) as { mod: { powerMul: number } };
    expect(one.mod.powerMul).toBe(per); // rank 1: değer aynen
  });

  it('"×0.96 per rank" unitFx (lowHpReduce): 3 rank = ×0.88', () => {
    const node = Object.entries(W.nodes).find(([, n]) => JSON.stringify(n.fx ?? []).includes('lowHpReduce'))!;
    const per = (node[1].fx![0] as unknown as { fx: { lowHpReduce: { reduce: number } } }).fx.lowHpReduce.reduce;
    const s = compileTree(W, only(node[0], 3))!;
    expect(1 - s.fx!.lowHpReduce!.reduce).toBeCloseTo(1 - 3 * per, 6);
  });
});
