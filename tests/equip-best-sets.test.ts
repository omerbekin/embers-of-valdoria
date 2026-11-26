import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import { ITEMS, affixBoost, affixIP, baseIP, canEquip, effectIP, emptyEquipment, instanceIlvl, itemDef, makeItem, rolledAffixes, validateItems, type Equipment, type ItemInstance } from '../src/progression/items';
import { affixFit } from '../src/progression/affix-fit';
import { bestMoves, instanceScore, setBoostShare, setFit } from '../src/progression/equip';
import { SETS, modIP, setBonusScore, setPieces, type SetDef } from '../src/progression/sets';
import { setClasses, setIlvl, wearerEquipment } from '../src/sim/set-sim';

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
      expect(at(4)).toBeCloseTo(mods(2) + v.classRowIP + mods(4) + (v.ruleIPBy?.[set.bonuses['4']!.rule!] ?? v.ruleIP), 2);
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
      const parts = rolledAffixes(inst, cls).map((a) => ({ ip: affixIP(a.id, a.values) * setFit(d, affixFit(cls, a)), m: affixBoost(d, a.id) }));
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

// r51 equip-final (2026-11-26): set parçası sabit affix uyumu (fitShare), bonus stat uyumu (modFit), kural başına değer (ruleIPBy).
// Ölçüm ve gerekçe: eov-forms-archive r51 equip-final.md. Sayılar data/items.json > setValue'dan okunur.
const withSetValue = <T,>(patch: Partial<NonNullable<typeof ITEMS.setValue>>, f: () => T): T => {
  const saved = ITEMS.setValue!;
  try {
    ITEMS.setValue = { ...saved, ...patch };
    return f();
  } finally {
    ITEMS.setValue = saved;
  }
};

/** Torbada setin bütün parçaları, taşıyıcıda aynı yuvalarda sıradan Epic (set-sim ile aynı kurulum): tam seti seçen seed payı ve parça sayısı dağılımı. */
function fullSetRate(set: SetDef, cls: string, seeds: number): { full: number; hist: number[] } {
  let full = 0;
  const hist = Array.from({ length: set.slots.length + 1 }, () => 0);
  for (let seed = 1; seed <= seeds; seed++) {
    const eq = Object.assign(emptyEquipment(), wearerEquipment(set, cls, 0, seed)) as Equipment;
    const bag = setPieces(set.id).map((p) => makeItem(p.id, `set-${p.slot}`, new Rng(seed * 31 + 7), { forClass: cls }));
    const uids = new Set(bag.map((b) => b.uid));
    const got = bestMoves({ class: cls, equipment: eq, level: setIlvl(set) }, bag).filter((m) => uids.has(m.uid)).length;
    hist[got]!++;
    if (got >= set.thresholds[set.thresholds.length - 1]!) full++;
  }
  return { full: full / seeds, hist };
}

describe('Equip best: set parçası affix uyumu (setValue.fitShare, r51)', () => {
  const fs = ITEMS.setValue?.fitShare ?? 0;
  it('veri 0-1; doğrulayıcı aralık dışını reddeder', () => {
    expect(fs).toBeGreaterThan(0);
    expect(fs).toBeLessThanOrEqual(1);
    expect(validateItems({ ...ITEMS, setValue: { ...ITEMS.setValue!, fitShare: -0.1 } })).toContain('setValue.fitShare must be 0-1');
  });
  it('uyum = fit + (1 - fit) x pay yalnız set parçasında; setsiz item ve tam uyum değişmez; anahtar yokken eski davranış', () => {
    const piece = setPieces('relics_of_saint_odran')[0]!;
    const plain = ITEMS.items.find((d) => !d.set)!;
    for (const f of [0.1, 0.2, 0.3]) {
      expect(setFit(piece, f)).toBeCloseTo(f + (1 - f) * fs, 9);
      expect(setFit(plain, f)).toBe(f);
      withSetValue({ fitShare: undefined }, () => expect(setFit(piece, f)).toBe(f));
    }
    expect(setFit(piece, 1)).toBe(1);
  });
});

describe('Equip best: set bonus stat uyumu (setValue.modFit, r51)', () => {
  const almoner = SETS.find((s) => s.id === 'almoners_vestments')!;
  const ids = setPieces(almoner.id).map((d) => d.id);
  it('MP kullanmayan Anti-Mage MP yenilenmesini affix uyumuyla (needs mp) alır; MP kullanan Warrior tam; modFit kapalıyken eşit', () => {
    const mods = almoner.bonuses['2']!.mods!;
    const mpKey = Object.keys(mods).find((k) => k.startsWith('mpRegen'))!;
    const two = wearing(ids.slice(0, 2));
    const mpFit = affixFit('antimage', { id: 'c_mpregen', def: ITEMS.affixDefs['c_mpregen']! });
    expect(mpFit).toBeLessThan(1);
    expect(setBonusScore(two, 'warrior') - setBonusScore(two, 'antimage')).toBeCloseTo(modIP(mpKey, mods[mpKey]!) * (1 - mpFit), 2);
    withSetValue({ modFit: undefined }, () => expect(setBonusScore(two, 'antimage')).toBeCloseTo(setBonusScore(two, 'warrior'), 6));
  });
});

describe('Equip best: kural başına değer (setValue.ruleIPBy, r51)', () => {
  const v = ITEMS.setValue!;
  it('doğrulayıcı: bilinmeyen kural ve eksi değer reddedilir; veri temiz', () => {
    expect(validateItems()).toEqual([]);
    expect(validateItems({ ...ITEMS, setValue: { ...v, ruleIPBy: { no_such_rule: 3 } } })).toContain('setValue.ruleIPBy: unknown rule no_such_rule');
    expect(validateItems({ ...ITEMS, setValue: { ...v, ruleIPBy: { refrain: -1 } } })).toContain('setValue.ruleIPBy.refrain must be a number >= 0');
  });
  it('kural değeri ruleIPBy, yoksa düz ruleIP; anahtar yokken eski değer', () => {
    const stormhall = SETS.find((s) => s.id === 'stormhall_saga')!;
    const eq = wearing(setPieces(stormhall.id).map((d) => d.id));
    const rule = stormhall.bonuses['4']!.rule!;
    expect(v.ruleIPBy?.[rule]).toBeDefined();
    const now = setBonusScore(eq, 'skald');
    const old = withSetValue({ ruleIPBy: undefined }, () => setBonusScore(eq, 'skald'));
    expect(now - old).toBeCloseTo(v.ruleIPBy![rule]! - v.ruleIP, 6);
  });
});

describe('Equip best: Gambler + Relics of Saint Odran (r51; savaşta tam set Epic ile eşit / üstünde)', () => {
  const odran = SETS.find((s) => s.id === 'relics_of_saint_odran')!;
  const SEEDS = 60;
  it("kök neden: Odran's Ring Elemental damage Gambler'a uymaz; fitShare puan açığını (1 - pay) oranına indirir", () => {
    const ring = setPieces(odran.id).find((d) => d.slot === 'ring')!;
    const inst = makeItem(ring.id, 'r', new Rng(7), { forClass: 'gambler' });
    const now = instanceScore('gambler', inst, 'ring');
    const old = withSetValue({ fitShare: undefined }, () => instanceScore('gambler', inst, 'ring'));
    const mage = instanceScore('mage', makeItem(ring.id, 'r', new Rng(7), { forClass: 'mage' }), 'ring');
    expect(now).toBeGreaterThan(old);
    expect(mage - now).toBeCloseTo((mage - old) * (1 - (ITEMS.setValue?.fitShare ?? 0)), 1);
  });
  it('Gambler tam seti artık tek parça çoğunluğuyla atlamaz; diğer orb sınıflarının bandında', () => {
    const g = fullSetRate(odran, 'gambler', SEEDS);
    const oldG = withSetValue({ fitShare: undefined }, () => fullSetRate(odran, 'gambler', SEEDS));
    // eski: 200 seed'in 140'ında tek parça (r51 odran-c); şimdi tek parça en sık sonuç değil
    expect(oldG.hist[1]!).toBe(Math.max(...oldG.hist));
    expect(g.hist[1]!).toBeLessThan(Math.max(...g.hist));
    expect(g.full).toBeGreaterThan(oldG.full + 0.15);
    const others = setClasses(odran).filter((c) => c !== 'gambler').map((c) => fullSetRate(odran, c, SEEDS).full);
    expect(g.full).toBeGreaterThanOrEqual(Math.min(...others) - 0.15);
  });
});

describe('Equip best: tam set seçim payı bandı (r51; 9 setin hepsi savaşta Epic ile eşit / gürültü içinde)', () => {
  // Savaşta eşit set "makul oranda" seçilir: sınıf ortalaması %25-%85 (Kingsfall istisna: stat puanı yüksek, kural değeri eksiye inmez, ~%100).
  // Bir denge turu set / affix sayılarını değiştirip bu bandı bozarsa setValue (ruleIPBy) yeniden ölçülmeli: eov-forms-archive r51 equip-final.md.
  const SEEDS = 30;
  for (const set of SETS) {
    it(`${set.id}`, () => {
      const classes = setClasses(set);
      const mean = classes.reduce((n, c) => n + fullSetRate(set, c, SEEDS).full, 0) / classes.length;
      if (set.id === 'kingsfall_regalia') expect(mean).toBeGreaterThan(0.85);
      else {
        expect(mean).toBeGreaterThanOrEqual(0.25);
        expect(mean).toBeLessThanOrEqual(0.85);
      }
    });
  }
});
