import { describe, expect, it } from 'vitest';
import { itemDef } from '../src/progression/items';
import { activeSetBonuses, equippedSetCounts, setDef } from '../src/progression/sets';
import { eligibleSeeds, epicBases, measureSet, pickWearer, runSetVariant, setBattleSetup, setClasses, setIlvl, wearerEquipment } from '../src/sim/set-sim';

/** Set ölçüm aracı (src/sim/set-sim.ts): araç doğruluğu, küçük savaş sayısı (denge ölçümü DEĞİL). */
describe('set-sim', () => {
  const ash = setDef('ashguard_vigil')!;
  const way = setDef('wayfarers_oath')!;

  it('sınıf seti yalnız giyebilen sınıflara, nötr set herkese', () => {
    expect(setClasses(ash).sort()).toEqual(['defender', 'paladin', 'warrior']);
    expect(setClasses(way).length).toBeGreaterThan(10);
    expect(setIlvl(ash)).toBe(10);
  });

  it('k parça = k set parçası, kalan set yuvaları Epic; epic varyantında set yok', () => {
    for (const k of [0, 2, 3, 4]) {
      const eq = wearerEquipment(ash, 'warrior', k, 5);
      expect(equippedSetCounts(eq)[ash.id] ?? 0).toBe(k);
      for (const slot of ash.slots) {
        const inst = eq[slot as keyof typeof eq]!;
        expect(inst).toBeTruthy();
        if (!itemDef(inst.id)!.set) expect(inst.rolls?.rarity ?? 'epic').toBe('epic');
      }
    }
    expect(activeSetBonuses(wearerEquipment(ash, 'warrior', 0, 5))).toHaveLength(0);
    expect(activeSetBonuses(wearerEquipment(ash, 'warrior', 4, 5)).length).toBe(3);
    // Aynı seed: set olmayan yuvanın Epic'i varyantlar arasında aynı
    const e0 = wearerEquipment(ash, 'warrior', 0, 5);
    const e2 = wearerEquipment(ash, 'warrior', 2, 5);
    const same = ash.slots.filter((s) => !itemDef(e2[s as keyof typeof e2]!.id)!.set);
    for (const s of same) expect(e2[s as keyof typeof e2]).toEqual(e0[s as keyof typeof e0]);
    expect(epicBases('warrior', 'ring').length).toBeGreaterThan(0);
  });

  it('taşıyıcı giyebilen bir oyuncu birimi; uygun seed listesi yalnız onları içerir; kurulum yalnız taşıyıcıyı değiştirir', () => {
    const seeds = eligibleSeeds(5, 1, ash);
    expect(seeds).toHaveLength(5);
    for (const s of seeds) {
      const w = pickWearer(s, ash);
      const a = setBattleSetup(s, ash, 0);
      const b = setBattleSetup(s, ash, 4);
      expect(setClasses(ash)).toContain(a.party[w]!.id);
      expect(a.party.map((d) => d.id)).toEqual(b.party.map((d) => d.id));
      a.party.forEach((_, i) => {
        if (i !== w) expect(b.partyUnits?.[i]).toEqual(a.partyUnits?.[i]);
      });
      expect(b.partyUnits?.[w]).not.toEqual(a.partyUnits?.[w]);
      // Set kuralları savaş kurulumuna ulaşır: 3 parça pasif satırı, 4 parça Banked Coals
      expect(setBattleSetup(s, ash, 3).partyUnits?.[w]?.passivePatch).toBeTruthy();
      expect(b.partyUnits?.[w]?.itemEffects?.bankedCoals).toBeTruthy();
      expect(a.partyUnits?.[w]?.itemEffects?.bankedCoals).toBeUndefined();
    }
  });

  it('nötr set 3 parça kuralı kuruluma gelir (Wayfarer: Road Hound)', () => {
    const s = eligibleSeeds(1, 1, way)[0]!;
    const w = pickWearer(s, way);
    expect(setBattleSetup(s, way, 3).partyUnits?.[w]?.itemEffects?.roadHound).toBeTruthy();
    expect(setBattleSetup(s, way, 2).partyUnits?.[w]?.itemEffects?.roadHound).toBeUndefined();
  });

  it('koşu: sayılan savaş = seed sayısı, aynı girdi aynı sonuç', () => {
    const seeds = eligibleSeeds(4, 1, ash);
    const a = runSetVariant(seeds, ash, 2);
    const b = runSetVariant(seeds, ash, 2);
    expect(a.games).toBe(4);
    expect(a).toEqual(b);
  });

  it('measureSet: varsayılan epic + eşikler; --none ve varyant süzgeci', () => {
    expect(Object.keys(measureSet(2, [1], way))).toEqual(['epic', 'k2', 'k3']);
    expect(Object.keys(measureSet(2, [1], ash, true, ['none']))).toEqual(['none']);
  });
});
