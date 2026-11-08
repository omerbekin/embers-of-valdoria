import { describe, expect, it } from 'vitest';
import { Battle, content, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { damageSpecFor, type DamageEffect } from '../src/engine/spec';
import { outgoingDamageMult } from '../src/engine/stats';
import { effMult, effNum, isEvolveNode, isPoolDamage, mergeFxValue, stackTimes, stackValues } from '../src/engine/tree-hooks';
import { elemResistOf } from '../src/engine/tree-hooks';
import { affixValues, type ItemInstance } from '../src/progression/items';
import { loadout } from '../src/progression/loadout';
import { compileTree } from '../src/progression/skill-tree-compile';
import type { TreeAlloc } from '../src/progression/skill-tree';
import { treeOf } from '../src/progression/skill-tree-data';

// Hasar havuzu (Ömer 2026-11-07, P1): yüzdelik HASAR bonusları ("+X% damage": item Global / element / sıra / aura / sabit duruş / bitirici /
// Giantslayer, ağaç "+% power" ve koşullu düğümleri) tek havuzda TOPLANIR, vuruşta bir kez çarpılır. Ayrı çarpan kalanlar:
// silah gücü, kritik, Hunter's Mark (Ömer 2026-11-07, yine ayrı), Evolve düğümleri, sınıf imza pasifi, Surge, hedefteki zayıflık durumları ve eksi ("less") değerler.
// Hasar dışı "×" bonuslar (Max HP, alınan hasar, çağrı gücü...) eskisi gibi çarpılır (Ömer 2026-10-27); bir düğümün RANK'ları doğrusal.

/** Tek affix'li örnek (ilvl 10, orta zar). */
const inst = (base: string, affix: string, uid: string): ItemInstance => ({ uid, id: base, rolls: { rarity: 'common', ilvl: 10, affixes: [{ id: affix, q: 0.5 }] } });
const v = (affix: string, i = 0) => affixValues(affix, 10, 0.5)[i]! / 100;

describe('birleşme yardımcıları', () => {
  it('hasar dışı "×" çarpılır, havuz biçimi toplanır, rank\'lar doğrusal', () => {
    expect(1 + stackValues('more', 0.1, 0.1)).toBeCloseTo(1.21, 12);
    expect(stackValues('mult', 1.1, 1.1)).toBeCloseTo(1.21, 12);
    expect(stackValues('pool', 1.1, 1.1)).toBeCloseTo(1.2, 12); // Giantslayer: iki +10% = +20%
    expect(1 - stackValues('less', 0.1, 0.1)).toBeCloseTo(0.81, 12); // iki ×0.9 = ×0.81
    expect(stackValues(undefined, 0.1, 0.1)).toBeCloseTo(0.2, 12); // "+10%" + "+10%" = "+20%"
    expect(1 + stackTimes('more', 0.06, 3)).toBeCloseTo(1.18, 12);
    expect(1 - stackTimes('less', 0.04, 3)).toBeCloseTo(0.88, 12);
    expect(stackTimes('mult', 1.06, 3)).toBeCloseTo(1.18, 12);
    expect(stackTimes('pool', 1.06, 3)).toBeCloseTo(1.18, 12);
    expect(stackTimes(undefined, 0.03, 3)).toBeCloseTo(0.09, 12);
  });

  it('item + ağaç kanalı: vuruş hasarı anahtarları toplanır, savunma "×" anahtarları çarpılır', () => {
    const h = { itemEffects: { damageTakenReduce: 0.1, frontRowDamage: 0.1, tierDamageMult: 1.1, blockChance: 0.1, elemResist: { fire: 0.1 } }, treeFx: { damageTakenReduce: 0.1, frontRowDamage: 0.1, tierDamageMult: 1.1, blockChance: 0.1, elemResist: { fire: 0.1 } } };
    expect(1 - effNum(h, 'damageTakenReduce')).toBeCloseTo(0.81, 12);
    expect(effNum(h, 'frontRowDamage')).toBeCloseTo(0.2, 12);
    expect(effMult(h, 'tierDamageMult')).toBeCloseTo(1.2, 12);
    expect(1 - elemResistOf(h, 'fire')).toBeCloseTo(0.81, 12);
    expect(effNum(h, 'blockChance')).toBeCloseTo(0.2, 12);
    expect(mergeFxValue('frontRowDamage', 0.18, 0.1)).toBeCloseTo(0.28, 12);
    expect(mergeFxValue('lowHpReduce', { below: 0.5, reduce: 0.1 }, { below: 0.3, reduce: 0.1 })).toEqual({ below: 0.5, reduce: 1 - 0.9 * 0.9 });
    expect(mergeFxValue('critMp', 2, 3)).toBe(5);
  });

  it('Evolve ve eksi değer havuza girmez', () => {
    expect(isEvolveNode('warrior:1.v')).toBe(true);
    expect(isEvolveNode('warrior:1.v#free')).toBe(true);
    expect(isEvolveNode('1.v')).toBe(true);
    expect(isEvolveNode('warrior:1.f2')).toBe(false);
    expect(isEvolveNode('vesper:bar[2]')).toBe(false);
    expect(isPoolDamage('mage:1.fb', 0.2)).toBe(true);
    expect(isPoolDamage('mage:1.fb', -0.2)).toBe(false);
    expect(isPoolDamage('mage:1.v', 0.3)).toBe(false);
  });
});

describe('item affix\'leri (loadout)', () => {
  it('iki "×Max HP" item çarpılır, iki "+Max HP" item toplanır', () => {
    const two = loadout({ class: 'warrior', equipment: { helm: inst('leather_coif', 'a_hppct', 'h'), armor: inst('padded_gambeson', 'a_hppct', 'a') } });
    expect(two.modifiers?.hpMult).toBeCloseTo((1 + v('a_hppct')) ** 2, 4);
    const flat = loadout({ class: 'warrior', equipment: { helm: inst('leather_coif', 'c_hp', 'h'), armor: inst('padded_gambeson', 'c_hp', 'a') } });
    expect(flat.modifiers?.hpAdd).toBeCloseTo(2 * affixValues('c_hp', 10, 0.5)[0]!, 4);
  });

  it('Endurance: "+% Lucky Escape" toplanır, "×0.9x damage taken below 30%" çarpılır', () => {
    const l = loadout({ class: 'warrior', equipment: { helm: inst('leather_coif', 'a_endure', 'h'), armor: inst('padded_gambeson', 'a_endure', 'a') } });
    expect(l.modifiers?.surviveAdd).toBeCloseTo(2 * v('a_endure', 0), 4);
    expect(l.itemEffects?.lowHpReduce?.reduce).toBeCloseTo(1 - (1 - v('a_endure', 1)) ** 2, 4);
  });

  it('element hasarı: Fire damage + Elemental damage aynı havuzda toplanır', () => {
    const l = loadout({ class: 'mage', equipment: { weapon: inst('ash_staff', 'c_fire', 'w'), ring: inst('copper_ring', 'a_allelem', 'r') } });
    expect(l.modifiers?.elemDamageAdd?.fire).toBeCloseTo(v('c_fire') + v('a_allelem'), 4);
  });
});

describe('hasar havuzu (motor)', () => {
  const eff: DamageEffect = { type: 'damage', damageType: 'magic', element: 'fire', scale: 'int', power: 1.15, powerAdd: 0.15 };

  it('silah x (1 + Global + element + dealtDamage payı + ağaç "+% power"); ağaç payı güçten bölünür', () => {
    const st = { damageMult: 1.2, elemDamageMult: { fire: 1.1 }, weaponMult: 1.5 };
    expect(outgoingDamageMult(st, 'fire', 0.3, 0.15)).toBeCloseTo((1.5 * (1 + 0.15 + 0.2 + 0.1 + 0.3)) / 1.15, 12);
    // havuz kaynağı yoksa yalnız silah (ağaç payı güçte kalır)
    expect(outgoingDamageMult({ weaponMult: 1.5 }, 'fire', 0, 0.15)).toBe(1.5);
    expect(outgoingDamageMult({}, 'fire')).toBe(1);
    // element başka elementte sayılmaz
    expect(outgoingDamageMult({ elemDamageMult: { fire: 1.1 } }, 'ice')).toBe(1);
  });

  it('damageSpecFor: havuz bir kez çarpar, ayrı çarpan (dealt.mult) takenMultiplier\'a gider', () => {
    const b = new Battle(content.battleSetup('random-battle', 3, 'test', { party: cells({ 0: 'mage' }), enemies: cells({ 0: 'warrior' }) }, false));
    const me = b.combatants.find((c) => c.side === 'party')!;
    const foe = b.combatants.find((c) => c.side === 'enemy')!;
    me.stats = { ...me.stats, damageMult: 1.2, elemDamageMult: { fire: 1.1 } };
    const spec = damageSpecFor(me, foe, eff, content.formulas, 1, true, 1, { mult: 1.3, add: 0.25 });
    expect(spec.power).toBeCloseTo(1 * (1 + 0.15 + 0.2 + 0.1 + 0.25), 9); // taban 1 x havuz (eskiden 1.15 x 1.2 x 1.1 x 1.25)
    expect(spec.pool).toBeCloseTo(1.7, 9);
    expect(spec.takenMultiplier).toBeCloseTo(1.3, 9);
  });

  it("Hunter's Mark havuza girmez: ayrı \"more\" çarpanı (Ömer 2026-11-07)", () => {
    const b = new Battle(content.battleSetup('random-battle', 3, 'test', { party: cells({ 0: 'archer' }), enemies: cells({ 0: 'warrior' }) }, false));
    const me = b.combatants.find((c) => c.side === 'party')!;
    const foe = b.combatants.find((c) => c.side === 'enemy')!;
    const hm = content.formulas.primaryBonus.dex.hunterMarkMult;
    me.stats = { ...me.stats, hunterMark: hm, spd: 50 };
    delete me.passive; // Longshot vb. imza pasifi oranı bozmasın
    foe.stats = { ...foe.stats, spd: 5 };
    const d = b.dealtDamage(me, foe);
    expect(d.mult).toBeCloseTo(1 + hm, 9);
    expect(d.add).toBe(0);
    foe.stats = { ...foe.stats, spd: 500 }; // hedef daha hızlı: Hunter's Mark yok
    expect(b.dealtDamage(me, foe).mult).toBe(1);
  });
});

describe('skill ağacı', () => {
  const W = treeOf('warrior')!;
  const only = (key: string, rank: number): TreeAlloc => ({ v: W.version, r: { [key]: rank } });
  it('cond powerMul rank\'ları doğrusal (3 rank = 3 x değer)', () => {
    const node = Object.entries(W.nodes).find(([, n]) => JSON.stringify(n.fx ?? []).includes('"powerMul":0.06'))!;
    const per = (node[1].fx![0] as unknown as { mod: { powerMul: number } }).mod.powerMul;
    const hook = compileTree(W, only(node[0], 3))!.hooks!.find((h) => h.node === `warrior:${node[0]}`) as { mod: { powerMul: number } };
    expect(hook.mod.powerMul).toBeCloseTo(3 * per, 12);
  });

  it('"×0.96 per rank" unitFx (lowHpReduce): 3 rank = ×0.88', () => {
    const node = Object.entries(W.nodes).find(([, n]) => JSON.stringify(n.fx ?? []).includes('lowHpReduce'))!;
    const per = (node[1].fx![0] as unknown as { fx: { lowHpReduce: { reduce: number } } }).fx.lowHpReduce.reduce;
    const s = compileTree(W, only(node[0], 3))!;
    expect(1 - s.fx!.lowHpReduce!.reduce).toBeCloseTo(1 - 3 * per, 6);
  });

  it('Vesper (ağaç v3): "+% power" düğümü havuza (powerAdd), Evolve ayrı çarpar, eksi ("less") ayrı çarpar', () => {
    const V = treeOf('vesper')!;
    const pct = (k: string) => (V.nodes[k]!.fx as unknown as Array<{ k: string; f?: string; v?: number }>).find((x) => x.k === 'skill' && x.f === 'power')!.v!;
    const dmgOf = (skill: string, r: Record<string, number>) => compileTree(V, { v: V.version, r })!.skills![skill]!.effects.find((e): e is DamageEffect => e.type === 'damage')!;
    const base = (skill: string) => content.skills[skill]!.effects.find((e): e is DamageEffect => e.type === 'damage')!.power;
    const heavy = dmgOf('cracked_bell', { '3.fb': 1 }); // Heavy Bronze +%40
    expect(heavy.powerAdd).toBeCloseTo(pct('3.fb'), 9);
    expect(heavy.power).toBeCloseTo(base('cracked_bell') * (1 + pct('3.fb')), 5);
    const ev = dmgOf('cracked_bell', { '3.fb': 1, '3.v': 1 }); // + Sundered Bell (Evolve) ayrı çarpan
    expect(ev.powerAdd).toBeCloseTo(pct('3.fb'), 9);
    expect(ev.power).toBeCloseTo(base('cracked_bell') * (1 + pct('3.fb')) * (1 + pct('3.v')), 5);
    const less = dmgOf('thunderpeal', { '2.fb': 1 }); // Blinding Storm -%30: havuza girmez
    expect(less.powerAdd ?? 0).toBeCloseTo(0, 9);
    expect(less.power).toBeCloseTo(base('thunderpeal') * (1 + pct('2.fb')), 5);
  });

  it('Cutthroat Venom Edge: koşullu +%35 havuza, Evolve x2 ayrı çarpan (dealtDamage)', () => {
    const C = treeOf('cutthroat')!;
    const run = (r: Record<string, number>) => {
      const units: Record<number, UnitSetup> = Object.keys(r).length ? { 0: { tree: compileTree(C, { v: C.version, r })! } } : {};
      const b = new Battle(content.battleSetup('random-battle', 7, 'test', { party: cells({ 0: 'cutthroat' }), enemies: cells({ 0: 'warrior' }), units: { party: units, enemies: {} } }, false));
      const me = b.combatants.find((c) => c.side === 'party') as Combatant;
      const foe = b.combatants.find((c) => c.side === 'enemy') as Combatant;
      foe.hp = Math.floor(foe.maxHp * 0.4);
      const def = b.skill('venom_edge', me.uid)!;
      return b.dealtDamage(me, foe, def, def.effects.find((e): e is DamageEffect => e.type === 'damage'));
    };
    const plain = run({});
    const fa = run({ '1.fa': 1 });
    const both = run({ '1.fa': 1, '1.v': 1 });
    expect(fa.add - plain.add).toBeCloseTo(0.35, 9);
    expect(fa.mult).toBeCloseTo(plain.mult, 9);
    expect(both.add - plain.add).toBeCloseTo(0.35, 9);
    expect(both.mult / plain.mult).toBeCloseTo(2, 9);
  });
});

function cells(u: Record<number, string>): string[] {
  return Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
}
void ({} as Teams);
