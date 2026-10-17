import { describe, expect, it } from 'vitest';
import { bestHeroFor, buyItem, chooseReward, ipGain, itemStatRows, newRun as newRunBase, rerollShop, rewardOffer, statDelta, type EndlessRun } from '../src/endless';
import { affixLines, itemDef, itemValue, rolledAffixes, type ItemRoll } from '../src/progression';
import { leveledRun } from './level-helpers';

/** Seviye şartı (ilvl - 3; Item Güçlendirme x6) bu testlerin konusu değil: koşu kahramanları yüksek seviyede. */
const newRun = (...a: Parameters<typeof newRunBase>): ReturnType<typeof newRunBase> => leveledRun(newRunBase(...a));

// Endless affix zarları (Ömer 2026-10-11, affix kademeleri): kartta / tezgâhta görünen zarlanmış değer = alınan örneğin değeri;
// tüccar karşılaştırması ve BEST zarlanmış değerlerle; fiyat örneğin zarlarıyla.

const PARTY = ['warrior', 'archer', 'mage', 'druid'];
const AT = '2026-10-10T00:00:00.000Z';

function atShop(gold = 1000, seed = 11): EndlessRun {
  const base: EndlessRun = { ...newRun(seed, PARTY, AT), wave: 6, phase: 'reward', stats: { cleared: 5, turns: 0, kills: 0 }, offer: [{ kind: 'gold', amount: 0 }] };
  const run = chooseReward(base, 0);
  return { ...run, gold };
}

describe('endless zarlar: gösterilen = alınan', () => {
  it('ödül kartı zarlanmış gelir ve alınan örnek aynı zarları taşır', () => {
    const run: EndlessRun = { ...newRun(3, PARTY, AT), wave: 2, phase: 'reward', stats: { cleared: 1, turns: 0, kills: 0 } };
    const offer = rewardOffer(run);
    const card = offer.find((c) => c.kind === 'item');
    if (!card || card.kind !== 'item') throw new Error('item card expected');
    expect(card.rolls?.affixes.length).toBeGreaterThan(0);
    expect(rewardOffer(run)).toEqual(offer); // seed'li
    const taken = chooseReward({ ...run, offer }, offer.indexOf(card));
    const inst = taken.bag!.at(-1)!;
    expect(inst.id).toBe(card.itemId);
    expect(inst.rolls).toEqual(card.rolls);
  });

  it('tezgâh malları zarlanmış (aralık içinde); fiyat örneğin değeri; satın alınan aynı zarları taşır; yenileme yeni zarlar atar', () => {
    const run = atShop();
    const e = run.shop![0]!;
    expect(e.rolls).toBeTruthy();
    for (const a of rolledAffixes({ id: e.itemId, rolls: e.rolls })) a.values.forEach((v, j) => expect(v >= a.ranges[j]![0] && v <= a.ranges[j]![1]).toBe(true));
    expect(e.price).toBe(itemValue({ id: e.itemId, rolls: e.rolls }));
    const bought = buyItem(run, 0);
    expect(bought.bag!.at(-1)!.rolls).toEqual(e.rolls);
    expect(rerollShop(run).shop!.every((w) => !!w.rolls)).toBe(true);
  });

  it('silah teklifi önerilen kahramanın elementiyle zarlanır (asa: Druid -> Nature, Mage -> Fire / Ice)', () => {
    for (let seed = 1; seed < 40; seed++) {
      const run: EndlessRun = { ...newRun(seed, PARTY, AT), wave: 4, phase: 'reward', stats: { cleared: 3, turns: 0, kills: 0 } };
      for (const c of rewardOffer(run)) {
        if (c.kind !== 'item' || itemDef(c.itemId)?.family !== 'staves') continue;
        const cls = run.heroes.find((h) => h.id === c.heroId)!.class;
        const main = c.rolls!.affixes[0]!.id;
        if (cls === 'druid') expect(main).toBe('c_nature');
        if (cls === 'mage') expect(['c_fire', 'c_ice']).toContain(main);
      }
    }
  });

  it('eski kayıt (kartta zar yok): alınırken zarlanır', () => {
    const run: EndlessRun = { ...newRun(4, PARTY, AT), wave: 2, phase: 'reward', stats: { cleared: 1, turns: 0, kills: 0 }, offer: [{ kind: 'item', itemId: 'leather_coif', heroId: 'h1' }] };
    const inst = chooseReward(run, 0).bag!.at(-1)!;
    expect(inst.rolls?.affixes.length).toBeGreaterThan(0);
  });
});

describe('endless zarlar: tüccar gösterimi', () => {
  const d = itemDef('brigandine')!;
  const hi: ItemRoll = { rarity: 'rare', affixes: [{ id: 'c_armor', q: 1 }, { id: 'c_hp', q: 1 }, { id: 'b_marmor', q: 1 }] };

  it('itemStatRows: kademe + zarlanmış değer + aralık ("+4 Max HP (3–5)")', () => {
    const rows = itemStatRows(d, hi);
    expect(rows.map((r) => r.id)).toEqual(['c_armor', 'c_hp', 'b_marmor']);
    expect(rows.map((r) => r.tier)).toEqual(['C', 'C', 'B']);
    expect(rows).toEqual(affixLines({ id: d.id, rolls: hi }));
    expect(rows[1]!.range).toMatch(/^\d+(\.\d)?–\d+(\.\d)?$/);
  });

  it('karşılaştırma ve BEST zarlanmış değerlerle (aynı item, daha iyi zar = yükseltme)', () => {
    const m = itemDef('flanged_mace')!; // silah: takımda yalnızca warrior kullanır
    const mHi: ItemRoll = { rarity: 'common', affixes: [{ id: 'c_phys', q: 1 }] };
    const mLo: ItemRoll = { rarity: 'common', affixes: [{ id: 'c_phys', q: 0 }] };
    const run = atShop();
    const w = run.heroes[0]!;
    w.equipment = { weapon: { uid: 'x', id: m.id, rolls: mLo } };
    const rows = statDelta(run, w.id, m, undefined, mHi);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.now).toBe(rolledAffixes({ id: m.id, rolls: mLo })[0]!.values[0]);
    expect(rows[0]!.after).toBe(rolledAffixes({ id: m.id, rolls: mHi })[0]!.values[0]);
    expect(rows[0]!.diff).toBeGreaterThan(0);
    expect(ipGain(run, w.id, m, undefined, mHi)).toBeGreaterThan(0);
    expect(bestHeroFor(run, m, undefined, mHi)).toBe(w.id);
    expect(bestHeroFor(run, m, undefined, mLo)).toBeNull(); // aynı zar: yükseltme değil
  });
});
