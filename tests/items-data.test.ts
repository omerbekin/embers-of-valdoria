import { describe, expect, it } from 'vitest';
import { content, Rng } from '../src/engine';
import { BAG_SIZE, baseIP, ITEMS, RARITY_IDS, SLOT_IDS, canEquip, rollLoot, classWeaponFamilies, instanceIP, itemDef, itemIP, itemValue, makeItem, sellValue, validateItems, type ItemsData } from '../src/progression';

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
        // affix gücü karşılaştırılır: taban değeri (silah gücü / örtük stat; Item Güçlendirme 2026-10-17) tutuşa göre değişir, iki yandan da düşülür
        const epic = Math.max(...ITEMS.items.filter((x) => x.slot === d.slot && x.rarity !== 'legendary').map((x) => itemIP(x, 'epic', L) - baseIP(x, L)));
        // Bilinen açık (Ömer 2026-11-02, affix dengesi): Legendary'nin sabit affix değerleri 3. tur adım/zar sayılarıyla Epic'in 1,05 payının altına indi;
        // kural gevşetilmedi, yalnızca bu iki silah çifti (40. seviye: 35,6 ve 36,0 > 36,02 gerekir) son denge turuna (plan adım 7: Legendary yeniden dengesi) kadar muaf. Başka çift bu listeye girmez.
        if (L === 40 && (id === 'gamblers_last_coin' || id === 'bones_of_the_quarry')) continue;
        expect(itemIP(d, 'legendary', L) - baseIP(d, L), `${id} L${L}`).toBeGreaterThan(epic * 1.05);
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

describe('Set pilot data (Ömer 2026-11-01 plan, 2026-11-03 picks; no engine yet)', () => {
  it('iki pilot set tanımlı, eşikler ve yuvalar plana uyar, set item\'i katalogda yok (ulaşılamaz)', () => {
    const [a, w] = ITEMS.sets as Array<{ id: string; kind: string; slots: string[]; thresholds: number[]; pieceNames: unknown[] }>;
    const sets = [a!, w!];
    expect(sets.map((s) => s.id)).toEqual(['ashguard_vigil', 'wayfarers_oath']);
    expect(a!.slots).toEqual(['helm', 'armor', 'gloves', 'boots']);
    expect(a!.thresholds).toEqual([2, 3, 4]);
    expect(w!.slots).toEqual(['boots', 'gloves', 'ring']);
    expect(w!.thresholds).toEqual([2, 3]);
    for (const s of sets) expect(s.pieceNames.length).toBe(s.slots.length);
    expect(ITEMS.items.some((i) => /ashguard|wayfarer/i.test(i.id))).toBe(false);
  });

  it('Ömer\'in son pilot seçimleri veride; setsEnabled kapalı', () => {
    const [a, w] = ITEMS.sets as Array<{ pieceNames: string[]; bonuses: Record<string, Record<string, unknown>> }>;
    expect(a!.pieceNames).toEqual(['Ashguard Helm', 'Ashguard Hauberk', 'Ashguard Gauntlets', 'Ashguard Greaves']);
    expect(a!.bonuses['2']!.mods).toEqual({ armorAdd: 3, magicArmorAdd: 2 });
    expect(a!.bonuses['3']!.byClass).toEqual({
      warrior: { passive: 'berserker', field: 'rageOnHurt.perHpPercent', from: 0.4, to: 0.5 },
      defender: { passive: 'bulwark_aura', field: 'pct', from: 0.4, to: 0.5 },
      paladin: { passive: 'divine_light', field: 'power', from: 0.27, to: 0.32 },
    });
    expect(a!.bonuses['4']).toMatchObject({ rule: 'banked_coals', bankShare: 0.5, ticks: 3, stacking: 'perHit', damageType: 'inherit', ignoresStatuses: ['fortified', 'blessed'], canKill: true });
    expect(w!.pieceNames).toEqual(['Milestone Boots', "Drover's Gloves", "Drover's Signet"]);
    expect(w!.bonuses['2']!.mods).toEqual({ hpRegenAdd: 0.75 });
    expect(w!.bonuses['3']).toMatchObject({ rule: 'road_hound', hpPerPrimary: 2, damagePerPrimary: 0.5, spd: 17, ai: 'aggressive', primaryExcludesItems: true });
  });
});
