import { describe, expect, it } from 'vitest';
import { ITEMS, affixContext, bestMoves, emptyEquipment, itemRecovery, loadout, slotScore, type ItemInstance } from '../src/progression';

// Item stat tavanları (Ömer 2026-10-13, form itemcaps): m2 = aynı A affix'i en çok 2 item'de sayılır; m4 = toparlanma toplamı en çok %20.

const roll = (ids: Array<[string, number]>, ilvl = 10) => ({ rarity: 'epic' as const, ilvl, affixes: ids.map(([id, q]) => ({ id, q })) });
const it3 = (q: [number, number, number], id = 'a_gdmg') => ({
  ...emptyEquipment(),
  helm: { uid: 'h', id: 'leather_coif', rolls: roll([[id, q[0]]]) },
  armor: { uid: 'a', id: 'padded_gambeson', rolls: roll([[id, q[1]]]) },
  boots: { uid: 'b', id: 'turnshoes', rolls: roll([[id, q[2]]]) },
});

describe('A affix: en çok 2 item sayılır', () => {
  it('veride sınır 2, tavanlar items.json > caps', () => {
    expect(ITEMS.caps.aAffixCopies).toBe(2);
    expect(ITEMS.caps.recovery).toBe(20);
  });

  it('3 item aynı A affix taşırsa yalnızca en güçlü 2 örnek işler', () => {
    const eq = it3([1, 0, 0.5]);
    const r = loadout({ class: 'warrior', equipment: eq });
    const vals = r.affixes.map((a) => a.values[0]!);
    expect(r.inactive).toEqual(['armor:0']); // en zayıf (q 0) gövde zırhında
    const top2 = vals[0]! + vals[2]!; // yuva sırası: helm, armor, boots
    expect(r.modifiers!.damageAdd).toBeCloseTo(top2 / 100, 4);
    // 2 item: hepsi sayılır
    const two = loadout({ class: 'warrior', equipment: { ...eq, armor: null } });
    expect(two.inactive).toEqual([]);
    expect(two.modifiers!.damageAdd).toBeCloseTo(top2 / 100, 4);
  });

  it('ipucu bağlamı etkisiz affix sırasını verir; torbadaki item takılmış varsayılır', () => {
    const eq = it3([1, 0, 0.5]);
    expect([...affixContext({ class: 'warrior', equipment: eq }, eq.armor, 'armor')!.inactive]).toEqual([0]);
    expect(affixContext({ class: 'warrior', equipment: eq }, eq.helm, 'helm')!.inactive.size).toBe(0);
    const bag: ItemInstance = { uid: 'g', id: 'work_gloves', rolls: roll([['a_gdmg', 0]]) };
    expect([...affixContext({ class: 'warrior', equipment: eq }, bag)!.inactive]).toEqual([0]);
  });

  it('Equip best ve değer etkisiz örneği saymaz', () => {
    const eq = { ...it3([1, 1, 1]), boots: null };
    const weak: ItemInstance = { uid: 'w', id: 'turnshoes', rolls: roll([['a_gdmg', 0]]) };
    // 3. kopya hiçbir şey katmaz: değeri 0
    expect(slotScore('warrior', eq, weak, 'boots')).toBe(0);
    expect(bestMoves({ class: 'warrior', equipment: eq }, [weak])).toEqual([]);
    // boş yuvaya başka affix'li item tercih edilir
    const other: ItemInstance = { uid: 'o', id: 'soft_boots', rolls: roll([['c_hp', 0]]) };
    expect(bestMoves({ class: 'warrior', equipment: eq }, [weak, other])).toEqual([{ slot: 'boots', uid: 'o' }]);
  });
});

describe('Toparlanma tavanı (%20)', () => {
  it('toplam toparlanma 0,2 ile sınırlı ve "capped" işaretli', () => {
    const eq = { ...emptyEquipment(), helm: { uid: 'h', id: 'leather_coif', rolls: roll([['a_recovery', 1]], 30) }, armor: { uid: 'a', id: 'padded_gambeson', rolls: roll([['a_recovery', 1]], 30) } };
    const r = loadout({ class: 'mage', equipment: eq });
    const raw = r.affixes.reduce((s, a) => s + a.values[0]!, 0);
    expect(raw).toBeGreaterThan(20);
    expect(r.recovery).toBe(0.2);
    expect(r.capped).toContain('recovery');
    expect(itemRecovery({ class: 'mage', equipment: eq })).toBe(0.2);
    // tavan altında: aynen, işaret yok
    const one = loadout({ class: 'mage', equipment: { ...emptyEquipment(), helm: { uid: 'h', id: 'leather_coif', rolls: roll([['a_recovery', 0]], 1) } } });
    expect(one.recovery).toBeLessThan(0.2);
    expect(one.capped).not.toContain('recovery');
  });
});

describe('Motorun gizli sınırları veride (Ömer 2026-10-13, itemfix m4)', () => {
  it('Quick start %99, delme %100, alınan hasar azaltma %90: items.json > caps; motor aynı değerleri okur; arayüz "capped" alır', async () => {
    const { ITEM_HOOK_CAPS } = await import('../src/engine/item-caps');
    expect(ITEMS.caps).toMatchObject({ initiative: 99, armorPen: 100, magicPen: 100, damageTaken: 90, block: 30 });
    expect(ITEM_HOOK_CAPS).toEqual({ initiative: 0.99, armorPen: 1, magicPen: 1, damageTaken: 0.9, block: 0.3 });
    const eq = { ...emptyEquipment(), boots: { uid: 'b', id: 'turnshoes', rolls: roll([['b_initiative', 1]], 30) }, trinket: { uid: 't', id: 'copper_ring', rolls: roll([['b_initiative', 1]], 30) } };
    const r = loadout({ class: 'archer', equipment: eq });
    expect(r.itemEffects!.startCharge).toBe(0.99);
    expect(r.capped).toContain('initiative');
    const pen = loadout({ class: 'archer', equipment: { ...emptyEquipment(), weapon: { uid: 'w', id: 'short_bow', rolls: roll([['b_pen', 1]], 30) }, offhand: { uid: 'o', id: 'rondel_dagger', rolls: roll([['b_pen', 1]], 30) } } });
    expect(pen.itemEffects!.armorPen).toBe(1);
    expect(pen.capped).toContain('armorPen');
  });
});
