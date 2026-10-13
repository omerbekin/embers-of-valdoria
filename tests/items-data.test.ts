import { describe, expect, it } from 'vitest';
import { content, Rng } from '../src/engine';
import { BAG_SIZE, ITEMS, RARITY_IDS, SLOT_IDS, canEquip, rollLoot, classWeaponFamilies, instanceIP, itemDef, itemIP, itemValue, makeItem, sellValue, validateItems, type ItemsData } from '../src/progression';

// data/items.json şeması (docs/design/progression/items.md 1.3b, 5.3; Ömer kararları bölüm 7 + affix kademeleri 2026-10-11).

const copy = (): ItemsData => JSON.parse(JSON.stringify(ITEMS)) as ItemsData;

describe('items.json şeması', () => {
  it('veri geçerli (validateItems boş)', () => {
    expect(validateItems()).toEqual([]);
  });

  it('6 yuva (karar 1), 5 nadirlik (karar 3), torba 30', () => {
    expect(ITEMS.slots.map((s) => s.id)).toEqual([...SLOT_IDS]);
    expect(ITEMS.rarities.map((r) => r.id)).toEqual([...RARITY_IDS]);
    expect(BAG_SIZE).toBe(30);
  });

  it('silah aileleri (karar 2): her oynanabilir sınıfın en az bir ailesi var; Mage asa, Archer yay kullanır', () => {
    for (const c of content.randomPool) expect(classWeaponFamilies(c).length, c).toBeGreaterThan(0);
    const axe = itemDef('woodcutters_axe')!;
    expect(canEquip('warrior', axe)).toBe(true);
    expect(canEquip('mage', axe)).toBe(false);
    expect(canEquip('mage', itemDef('turnshoes')!)).toBe(true); // silah dışı yuvalar herkese serbest
  });

  it('değer = 10 x IP (örnek zarlarıyla; taban beklenen IP ile), satış = değerin yarısı', () => {
    for (const d of ITEMS.items) {
      expect(itemValue(d), d.id).toBe(Math.max(ITEMS.budget.minValue, Math.round(ITEMS.budget.goldPerIP * itemIP(d))));
      const inst = makeItem(d.id, 'u', new Rng(3));
      expect(itemValue(inst)).toBe(Math.max(ITEMS.budget.minValue, Math.round(ITEMS.budget.goldPerIP * instanceIP(inst))));
      expect(sellValue(inst)).toBe(Math.max(1, Math.round(itemValue(inst) * ITEMS.budget.sellRatio)));
    }
  });

  it('doğrulayıcı hataları yakalar: ailesiz silah, bilinmeyen affix, bilinmeyen yuva, kötü affix hedefi, kademe adı', () => {
    const d = copy();
    d.items = [
      { id: 'a', name: 'A', slot: 'weapon', rarity: 'common', ilvl: 2 },
      { id: 'b', name: 'B', slot: 'helm', rarity: 'common', ilvl: 3, main: 'c_nope' },
      { id: 'e', name: 'E', slot: 'cape' as never, rarity: 'common', ilvl: 2, main: 'c_hp' },
    ];
    d.affixDefs.c_bad = { tier: 'B', name: 'Bad', text: 'x', parts: [{ base: 1, perIlvl: 0, step: 1, ip: 1, to: 'nowhere' }] };
    const errs = validateItems(d).join('\n');
    expect(errs).toMatch(/item a: weapon needs a known family/);
    expect(errs).toMatch(/item b: needs a C main affix/);
    expect(errs).toMatch(/item e: unknown slot cape/);
    expect(errs).toMatch(/affix c_bad: id must start with its tier/);
    expect(errs).toMatch(/affix c_bad: part 0 has a bad target/);
    expect(errs).toMatch(/affix c_bad: text must show its value/);
  });

  it('Might kalktı (Ömer 2026-10-11): veride Might statı / affix\'i yok; sefer loot\'u ve Endless yalnızca affix\'li örnek verir', () => {
    expect(JSON.stringify(ITEMS.affixDefs)).not.toMatch(/might/i);
    expect((ITEMS as unknown as Record<string, unknown>).stats).toBeUndefined();
    const party = ['warrior', 'mage', 'archer', 'gambler'].map((c) => ({ class: c }));
    for (let i = 0; i < 100; i++)
      for (const kind of ['battle', 'elite', 'boss', 'treasure'] as const)
        for (const id of rollLoot({ rng: new Rng(i), kind, chapter: 1, ilvl: 10, party }).items) expect(itemDef(id), id).toBeDefined();
  });
});

describe('Legendary boost (Ömer 2026-10-12, Endless item dengesi p5)', () => {
  it('boost sabit affix değerini çarpar, IP artar; yalnızca Legendary ve kendi affix\'i için geçerli', () => {
    const crown = itemDef('crown_of_the_ashen_king')!;
    expect(crown.boost).toEqual({ a_immunity: 2 });
    const plain = { ...crown, boost: undefined };
    expect(itemIP(crown, 'legendary', 20)).toBeGreaterThan(itemIP(plain, 'legendary', 20));
    // zayıf beşi aynı seviyedeki en iyi Epic'in üstünde (20 ve 40)
    for (const id of ['crown_of_the_ashen_king', 'gamblers_last_coin', 'bones_of_the_quarry', 'watchmans_boots', 'helm_of_the_last_stand']) {
      const d = itemDef(id)!;
      for (const L of [20, 40]) {
        const epic = Math.max(...ITEMS.items.filter((x) => x.slot === d.slot && x.rarity !== 'legendary').map((x) => itemIP(x, 'epic', L)));
        expect(itemIP(d, 'legendary', L), `${id} L${L}`).toBeGreaterThan(epic * 1.05);
      }
    }
    const bad = structuredClone(ITEMS) as ItemsData;
    bad.items.find((x) => x.id === 'crown_of_the_ashen_king')!.boost = { c_phys: 2 };
    bad.items.find((x) => x.rarity !== 'legendary')!.boost = { c_hp: 2 };
    const errs = validateItems(bad).join('\n');
    expect(errs).toMatch(/boost c_phys/);
    expect(errs).toMatch(/only Legendary items carry a boost/);
  });
});
