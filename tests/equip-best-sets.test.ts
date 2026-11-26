import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import { ITEMS, affixBoost, affixIP, baseIP, canEquip, effectIP, emptyEquipment, instanceIlvl, itemDef, makeItem, rolledAffixes, validateItems, type Equipment, type ItemInstance } from '../src/progression/items';
import { affixFit } from '../src/progression/affix-fit';
import { bestMoves, instanceScore, setBoostShare } from '../src/progression/equip';
import { SETS, modIP, setBonusScore, setPieces } from '../src/progression/sets';

// Equip best x set (2026-11-24, agent equip-best): (1) set parçası olmayan torbada davranış sabit (setler kapalı yol), (2) Conclave bonus değerlemesinin
// kalem kalem dökümü veriden okunur (bonus puanının nereden geldiği; "Conclave'i yanlış öneriyor" bilinen açığının kaydı).

const wearing = (ids: string[]): Equipment => {
  const eq = emptyEquipment();
  ids.forEach((id, i) => ((eq as Record<string, unknown>)[itemDef(id)!.slot] = makeItem(id, `u${i}`, new Rng(i + 1))));
  return eq;
};

describe('Equip best: set parçası yokken / giyilemezken eski yol birebir', () => {
  const catalogBag = (cls: string, seed: number): ItemInstance[] => {
    const rng = new Rng(seed);
    const pool = ITEMS.items.filter((d) => !d.set && d.rarity !== 'legendary' && canEquip(cls, d));
    return Array.from({ length: 14 }, (_, i) => makeItem(pool[rng.int(0, pool.length - 1)]!.id, `b${i}`, rng, { ilvl: 10 + rng.int(0, 20) }));
  };

  it('set parçası taşımayan ekipman: set bonus puanı 0', () => {
    for (const cls of ['mage', 'warrior', 'vesper']) for (let s = 1; s <= 10; s++) {
      const eq = emptyEquipment();
      catalogBag(cls, s).forEach((it) => { const d = itemDef(it.id)!; if (!eq[d.slot as keyof Equipment]) (eq as Record<string, unknown>)[d.slot] = it; });
      expect(setBonusScore(eq, cls)).toBe(0);
    }
  });

  it('torbaya sınıfın takamadığı set parçaları eklenince hamleler değişmez (30 seed, 3 sınıf)', () => {
    for (const cls of ['mage', 'warrior', 'skald']) for (let s = 1; s <= 30; s++) {
      const bag = catalogBag(cls, s);
      const foreign = SETS.flatMap((set) => setPieces(set.id)).filter((d) => !canEquip(cls, d)).slice(0, 6).map((d, i) => makeItem(d.id, `f${i}`, new Rng(100 + i)));
      expect(foreign.length).toBeGreaterThan(0);
      const hero = { class: cls, equipment: emptyEquipment() };
      expect(bestMoves(hero, [...bag, ...foreign])).toEqual(bestMoves(hero, bag));
    }
  });
});

describe('Conclave of Embers: Equip best bonus puanı dökümü (veriden)', () => {
  const set = SETS.find((s) => s.id === 'conclave_of_embers')!;
  const ids = setPieces(set.id).map((d) => d.id);

  it('bonus puanı = stat kalemleri (modIP) + sınıf satırı + kural düz değerleri; 2 / 3 / 4 parçada kalem kalem', () => {
    const v = ITEMS.setValue!;
    const mods = (t: number) => Object.entries(set.bonuses[String(t)]!.mods ?? {}).reduce((n, [k, x]) => n + modIP(k, x), 0);
    for (const cls of ['mage', 'undead', 'druid', 'vesper']) {
      const at = (n: number) => setBonusScore(wearing(ids.slice(0, n)), cls);
      expect(at(2)).toBeCloseTo(mods(2), 2);
      expect(at(3)).toBeCloseTo(mods(2) + v.classRowIP, 2);
      expect(at(4)).toBeCloseTo(mods(2) + v.classRowIP + mods(4) + v.ruleIP, 2);
    }
  });
});


describe('Equip best: set parçasının boost payı (setValue.boostWeight, r49)', () => {
  const w = ITEMS.setValue?.boostWeight ?? 1;
  const boosted = (ITEMS.setItems ?? []).filter((d) => Object.keys(d.boost ?? {}).length > 0);

  it('veri: boostWeight 0-1 arası; doğrulayıcı aralık dışını reddeder', () => {
    expect(w).toBeGreaterThanOrEqual(0);
    expect(w).toBeLessThanOrEqual(1);
    expect(validateItems()).toEqual([]);
    expect(validateItems({ ...ITEMS, setValue: { ...ITEMS.setValue!, boostWeight: 1.5 } })).toContain('setValue.boostWeight must be 0-1');
  });

  it('pay = (1 + (boost - 1) x w) / boost; boostsuz affix ve Legendary 1', () => {
    expect(boosted.length).toBeGreaterThan(0);
    for (const d of boosted) for (const [id, m] of Object.entries(d.boost!)) expect(setBoostShare(d, id)).toBeCloseTo((1 + (m - 1) * w) / m, 9);
    for (const d of ITEMS.items.filter((x) => x.rarity === 'legendary' && x.boost)) for (const id of Object.keys(d.boost!)) expect(setBoostShare(d, id)).toBe(1);
    const plain = (ITEMS.setItems ?? []).find((d) => !d.boost);
    if (plain) for (const id of plain.affixes ?? []) expect(setBoostShare(plain, id)).toBe(1);
  });

  it('set parçası puanı boostsuz ile tam boostlu puan arasında; yuva puanı = taban + affix x uyum x pay', () => {
    for (const d of boosted) for (const cls of ['mage', 'gambler', 'paladin']) {
      if (!canEquip(cls, d)) continue;
      const inst = makeItem(d.id, 'p', new Rng(7), { forClass: cls });
      const parts = rolledAffixes(inst, cls).map((a) => ({ ip: affixIP(a.id, a.values) * affixFit(cls, a), m: affixBoost(d, a.id) }));
      const base = effectIP(d) + baseIP(d, instanceIlvl(inst), 1);
      const score = instanceScore(cls, inst, d.slot);
      expect(score).toBeCloseTo(base + parts.reduce((n, p) => n + p.ip * ((1 + (p.m - 1) * w) / p.m), 0), 2);
      expect(score).toBeLessThanOrEqual(base + parts.reduce((n, p) => n + Math.max(p.ip, p.ip / p.m), 0) + 1e-3);
      expect(score).toBeGreaterThanOrEqual(base + parts.reduce((n, p) => n + Math.min(p.ip, p.ip / p.m), 0) - 1e-3);
    }
  });

  it('boostWeight yokken eski davranış (pay 1)', () => {
    const saved = ITEMS.setValue!;
    try {
      ITEMS.setValue = { ...saved, boostWeight: undefined };
      for (const d of boosted) for (const id of Object.keys(d.boost!)) expect(setBoostShare(d, id)).toBe(1);
    } finally {
      ITEMS.setValue = saved;
    }
  });
});
