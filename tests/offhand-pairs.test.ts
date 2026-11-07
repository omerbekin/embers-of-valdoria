import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import { ITEMS, canEquip, canEquipIn, emptyEquipment, equipInto, implicitDefOf, isPlanError, itemDef, itemKindName, makeItem, offhandBlocker, offhandCompatible, offhandKindOf, planEquip, rollItem, tierPool, validateItems, type ItemInstance } from '../src/progression/items';
import { bestMoves } from '../src/progression/equip';
import { loadout } from '../src/progression/loadout';
import { starterEquipment, weaponMultFor } from '../src/progression/weapon';

// İkinci el türleri (Ömer 2026-11-07, grip-offhand önerisi): yay çift el kalır ama Sadak alır; tılsım tek el; her ikinci el türü veride
// sınıf listesi taşır (items.json > offhandKinds); Warrior hançer / el baltasını yalnız ikinci elde takar.

const it_ = (id: string, uid = id, seed = 1): ItemInstance => makeItem(id, uid, new Rng(seed));
const ofKind = (k: string) => ITEMS.items.filter((d) => d.slot === 'offhand' && d.family === k);
const KINDS = ['shields', 'quivers', 'orbs', 'tomes', 'lanterns', 'relics'];

describe('ikinci el türleri', () => {
  it('veri: altı tür, her türün 4 nadirlikte tabanı, iki alt tür, doğrulama temiz', () => {
    expect(validateItems()).toEqual([]);
    expect((ITEMS.offhandKinds ?? []).map((k) => k.id).sort()).toEqual([...KINDS].sort());
    for (const k of KINDS) {
      const ds = ofKind(k).filter((d) => d.rarity !== 'legendary');
      expect(new Set(ds.map((d) => d.rarity)), k).toEqual(new Set(['common', 'uncommon', 'rare', 'epic']));
      expect(new Set(ds.map((d) => implicitDefOf(d)?.name)).size, `${k} alt tür`).toBeGreaterThanOrEqual(2);
      for (const d of ofKind(k)) expect(offhandKindOf(d)?.id, d.id).toBe(k);
    }
    expect(itemKindName(itemDef('hide_quiver')!)).toBe('Quiver');
    expect(itemKindName(itemDef('clouded_glass_orb')!)).toBe('Focus Orb');
    expect(itemKindName(itemDef('worn_grimoire')!)).toBe('Tome');
    expect(itemKindName(itemDef('hooded_lantern')!)).toBe('Lantern');
    expect(itemKindName(itemDef('stone_idol')!)).toBe('Relic');
  });

  it('sınıf listesi türden gelir: Warrior fener ve küre takamaz, Archer yalnız Sadak, Hexer küre + kitap', () => {
    expect(canEquip('warrior', itemDef('hooded_lantern')!)).toBe(false);
    expect(canEquip('warrior', itemDef('clouded_glass_orb')!)).toBe(false);
    expect(canEquip('warrior', itemDef('oak_shield')!)).toBe(true);
    expect(canEquip('archer', itemDef('hide_quiver')!)).toBe(true);
    for (const id of ['oak_shield', 'clouded_glass_orb', 'worn_grimoire', 'hooded_lantern', 'stone_idol']) expect(canEquip('archer', itemDef(id)!), id).toBe(false);
    expect(canEquip('hexer', itemDef('clouded_glass_orb')!)).toBe(true);
    expect(canEquip('hexer', itemDef('worn_grimoire')!)).toBe(true);
    expect(canEquip('hexer', itemDef('stone_idol')!)).toBe(false);
    for (const k of ITEMS.offhandKinds ?? []) for (const d of ofKind(k.id).filter((x) => !x.usableBy)) for (const c of k.classes) expect(canEquip(c, d), `${d.id} ${c}`).toBe(true);
  });

  it('yay yalnız Sadak alır; tek el (tılsım dahil) her türü; çift el hiçbirini', () => {
    const bow = itemDef('short_bow')!;
    const deck = itemDef('worn_deck')!;
    const staff = itemDef('ash_staff')!;
    expect(deck.grip).toBe('one');
    expect(itemDef('light_crossbow')!.grip).toBe('bow');
    expect(itemDef('elm_longbow')!.grip).toBe('bow');
    expect(offhandCompatible(bow, itemDef('hide_quiver')!)).toBe(true);
    for (const id of ['oak_shield', 'clouded_glass_orb', 'worn_grimoire', 'hooded_lantern', 'stone_idol']) {
      expect(offhandCompatible(bow, itemDef(id)!), id).toBe(false);
      expect(offhandCompatible(deck, itemDef(id)!), id).toBe(true);
    }
    for (const id of ['hide_quiver', 'oak_shield', 'worn_grimoire']) expect(offhandCompatible(staff, itemDef(id)!), id).toBe(false);
    expect(isPlanError(planEquip('archer', { weapon: it_('short_bow') }, it_('hide_quiver')))).toBe(false);
    expect(isPlanError(planEquip('gambler', { weapon: it_('worn_deck') }, it_('clouded_glass_orb')))).toBe(false);
    expect(isPlanError(planEquip('mage', { weapon: it_('birch_wand') }, it_('worn_grimoire')))).toBe(false);
    expect(isPlanError(planEquip('mage', { weapon: it_('ash_staff') }, it_('worn_grimoire')))).toBe(true);
  });

  it('çift el silah Sadak\'ı torbaya çıkarır; yay değişimi Sadak\'ı tutar; offhandBlocker', () => {
    const eq = { weapon: it_('short_bow', 'b1'), offhand: it_('hide_quiver', 'q1') };
    const two = ITEMS.items.find((d) => d.slot === 'weapon' && d.grip === 'two' && canEquip('warrior', d))!;
    expect(equipInto(eq, it_(two.id, 'w2'), 'weapon').displaced.map((i) => i.uid)).toEqual(['q1']);
    expect(equipInto(eq, it_('light_crossbow', 'b2'), 'weapon').displaced).toEqual([]);
    expect(offhandBlocker({ weapon: it_('short_bow') }, 'archer')).toBeUndefined();
    expect(offhandBlocker({ weapon: it_('short_bow') })).toBeDefined();
    expect(offhandBlocker({ weapon: it_(two.id) }, 'warrior')).toBeDefined();
  });

  it('Warrior hançer / el baltasını yalnız ikinci elde takar; Cutthroat ana elde de', () => {
    const dagger = itemDef('rondel_dagger')!;
    const hatchet = itemDef('hand_hatchet')!;
    for (const d of [dagger, hatchet]) {
      expect(canEquip('warrior', d), d.id).toBe(true);
      expect(canEquipIn('warrior', d, 'weapon'), d.id).toBe(false);
      expect(canEquipIn('warrior', d, 'offhand'), d.id).toBe(true);
      expect(canEquipIn('cutthroat', d, 'weapon'), d.id).toBe(true);
    }
    const sword = it_('arming_sword', 's');
    expect(planEquip('warrior', emptyEquipment(), it_('rondel_dagger'))).toMatchObject({ error: expect.stringContaining('main hand') });
    expect(planEquip('warrior', { weapon: sword }, it_('rondel_dagger'), 'weapon')).toMatchObject({ error: expect.stringContaining('only goes in the off-hand') });
    expect(isPlanError(planEquip('warrior', { weapon: sword }, it_('rondel_dagger')))).toBe(false);
    // Equip best: Warrior hançeri ana ele koymaz
    const m = bestMoves({ class: 'warrior', equipment: emptyEquipment() }, [it_('rondel_dagger', 'd'), it_('arming_sword', 's2')]);
    expect(m.find((x) => x.uid === 'd')?.slot ?? 'offhand').toBe('offhand');
    expect(m.find((x) => x.uid === 's2')?.slot).toBe('weapon');
  });

  it('affix kısıtları: Block yalnız kalkanda, Spare Arrow yalnız Sadakta', () => {
    for (const k of KINDS.filter((x) => x !== 'shields')) {
      for (const d of ofKind(k)) {
        expect(tierPool('C', 'offhand', undefined, d), d.id).not.toContain('c_block');
        for (let s = 1; s <= 20; s++) expect(rollItem(d, new Rng(s)).affixes.map((a) => a.id), d.id).not.toContain('c_block');
      }
    }
    expect(tierPool('C', 'offhand', undefined, itemDef('oak_shield')!)).toContain('c_block');
    for (const k of KINDS) expect(tierPool('B', 'offhand', 10, ofKind(k)[0]!).includes('b_sparearrow'), k).toBe(k === 'quivers');
    const eq = { weapon: it_('short_bow'), offhand: it_('crow_feather_quiver') };
    expect(loadout({ class: 'archer', equipment: eq as never }).itemEffects?.blockChance ?? 0).toBe(0);
  });

  it('alt tür örtükleri: kule kalkanı bloğu en yüksek, Sadak / küre / kitap / fener / emanet kendi statını verir', () => {
    const block = (id: string) => itemDef(id)!.implicitBase?.[0] ?? implicitDefOf(itemDef(id)!)!.parts[0]!.base;
    expect(implicitDefOf(itemDef('plank_tower_shield')!)!.parts[0]!.to).toBe('fx:blockChance');
    expect(block('plank_tower_shield')).toBeGreaterThan(block('round_buckler'));
    expect(implicitDefOf(itemDef('round_buckler')!)!.parts.map((p) => p.to)).toContain('mult:spdMult');
    expect(implicitDefOf(itemDef('bodkin_quiver')!)!.parts[0]!.to).not.toBe(implicitDefOf(itemDef('hide_quiver')!)!.parts[0]!.to);
    for (const id of ['clouded_glass_orb', 'worn_grimoire', 'hooded_lantern', 'stone_idol', 'pilgrims_psalter', 'ember_lantern', 'bone_reliquary', 'smoked_glass_orb']) {
      expect(implicitDefOf(itemDef(id)!), id).toBeDefined();
    }
  });

  it('Equip best: yay + Sadak; tılsım + küre; tek el + ikinci el çift elden iyiyse onu seçer', () => {
    const a = bestMoves({ class: 'archer', equipment: emptyEquipment() }, [it_('short_bow', 'b'), it_('bodkin_quiver', 'q')]);
    expect(a.map((m) => `${m.slot}:${m.uid}`).sort()).toEqual(['offhand:q', 'weapon:b']);
    const g = bestMoves({ class: 'gambler', equipment: emptyEquipment() }, [it_('worn_deck', 'c'), it_('hollow_eye_orb', 'o')]);
    expect(g.map((m) => m.slot).sort()).toEqual(['offhand', 'weapon']);
    // eldeki yay + torbada Sadak: Sadak takılır
    expect(bestMoves({ class: 'archer', equipment: { weapon: it_('short_bow', 'b') } as never }, [it_('hide_quiver', 'q')]).map((m) => m.uid)).toEqual(['q']);
    // Mage: ortak (common) asa vs epic değnek + epic kitap: tek el + ikinci el kazanır, ikisi de takılır
    const mm = bestMoves({ class: 'mage', equipment: emptyEquipment() }, [it_('ash_staff', 'st'), it_('bone_wand', 'w'), it_('grimoire_of_the_black_lake', 't')]);
    expect(mm.map((m) => `${m.slot}:${m.uid}`).sort()).toEqual(['offhand:t', 'weapon:w']);
  });

  it('tılsım tek el: başlangıç hasarı aynı (katlama), Gambler başlangıç çarpanı 1', () => {
    expect(weaponMultFor('gambler', starterEquipment('gambler', 'h1'))).toBe(1);
    expect(weaponMultFor('hexer', starterEquipment('hexer', 'h2'))).toBe(1);
  });
});
