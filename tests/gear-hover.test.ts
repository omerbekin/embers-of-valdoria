import { describe, expect, it } from 'vitest';
import { dropAction, pressStep, showsTrash } from '../src/ui/gear-drop';
import { heroItemLine, idleHeroLine } from '../src/ui/gear-hover';
import { emptyEquipment, type ItemInstance } from '../src/progression';

// Ortak Inventory (Ömer 2026-10-11, g1): sürükle-bırak kuralları (çöp kutusu, tüccar alım / satım) ve kahraman satırı (hover özeti).

const classOf = (id: string) => ({ w: 'warrior', m: 'mage' })[id];
const bagAxe = { kind: 'bag' as const, uid: 'u1', itemId: 'woodcutters_axe' };
const slotSrc = { kind: 'slot' as const, heroId: 'w', slot: 'weapon' as const };
const ware = { kind: 'ware' as const, index: 2, itemId: 'leather_coif' };

describe('drag controller rules', () => {
  it('bag item onto the trash = discard; equipped item must be unequipped first', () => {
    expect(dropAction(bagAxe, { kind: 'trash' }, classOf)).toEqual({ kind: 'discard', uid: 'u1' });
    expect(dropAction(slotSrc, { kind: 'trash' }, classOf)).toEqual({ kind: 'none', reason: 'Unequip first' });
  });
  it('merchant: ware into the bag = buy; bag item onto the wares = sell; nothing else', () => {
    expect(dropAction(ware, { kind: 'bag' }, classOf)).toEqual({ kind: 'buy', index: 2 });
    expect(dropAction(ware, { kind: 'hero', heroId: 'w' }, classOf).kind).toBe('none');
    expect(dropAction(ware, { kind: 'trash' }, classOf).kind).toBe('none');
    expect(dropAction(bagAxe, { kind: 'wares' }, classOf)).toEqual({ kind: 'sell', uid: 'u1' });
    expect(dropAction(slotSrc, { kind: 'wares' }, classOf).kind).toBe('none');
  });
  it('the trash shows only while a bag item is dragged', () => {
    expect(showsTrash(bagAxe)).toBe(true);
    expect(showsTrash(slotSrc)).toBe(false);
    expect(showsTrash(ware)).toBe(false);
    expect(showsTrash(null)).toBe(false);
  });
  it('mouse drags after 6 px; touch: long-press shows the tooltip first, then sliding drags; early slide scrolls', () => {
    expect(pressStep({ touch: false, heldMs: 0, dist: 3, tipShown: false })).toBe('wait');
    expect(pressStep({ touch: false, heldMs: 0, dist: 8, tipShown: false })).toBe('drag');
    expect(pressStep({ touch: true, heldMs: 100, dist: 2, tipShown: false })).toBe('wait');
    expect(pressStep({ touch: true, heldMs: 100, dist: 14, tipShown: false })).toBe('cancel');
    expect(pressStep({ touch: true, heldMs: 400, dist: 2, tipShown: false })).toBe('tip');
    expect(pressStep({ touch: true, heldMs: 500, dist: 4, tipShown: true })).toBe('tip');
    expect(pressStep({ touch: true, heldMs: 500, dist: 14, tipShown: true })).toBe('drag');
  });
});

describe('hero card line while an item is hovered', () => {
  const hero = (cls: string, eq = emptyEquipment()) => ({ id: cls, class: cls, level: 1, equipment: eq });
  const inst = (id: string, uid = 'x1'): ItemInstance => ({ uid, id });
  it('no item: the usual "Level 1 · 0/6 items"', () => {
    expect(heroItemLine(hero('warrior'), null)).toEqual(idleHeroLine(hero('warrior')));
    expect(idleHeroLine(hero('warrior')).text).toBe('Level 1 · 0/6 items');
  });
  it("a weapon of a foreign family: \"Can't use <family>\"", () => {
    const l = heroItemLine(hero('mage'), inst('woodcutters_axe'));
    expect(l.tone).toBe('no');
    expect(l.text).toBe("Can't use Axes & Swords");
  });
  it('an empty slot gains stats: green "+N STAT" parts (at most two)', () => {
    const l = heroItemLine(hero('warrior'), inst('leather_coif'));
    expect(['up', 'mixed']).toContain(l.tone);
    expect(l.parts.length).toBeGreaterThan(0);
    expect(l.parts.length).toBeLessThanOrEqual(2);
    for (const p of l.parts.filter((x) => x.dir === 'up')) expect(p.text.startsWith('+')).toBe(true);
    expect(l.text).toBe(l.parts.map((p) => p.text).join(' · '));
  });
  it('the item already in that slot reads "Equipped"; a second Legendary reads the limit', () => {
    const eq = emptyEquipment();
    const coif = inst('leather_coif', 'c1');
    eq.helm = coif;
    expect(heroItemLine(hero('warrior', eq), coif).text).toBe('Equipped');
    const eq2 = emptyEquipment();
    eq2.armor = inst('mantle_of_valdren', 'l1');
    const l = heroItemLine(hero('warrior', eq2), inst('emberbrand', 'l2'));
    expect(l.tone).toBe('no');
    expect(l.text).toMatch(/Legendary/);
  });
  it('a worse replacement shows red parts', () => {
    const eq = emptyEquipment();
    eq.weapon = inst('emberbrand', 'l1');
    const l = heroItemLine(hero('warrior', eq), inst('woodcutters_axe', 'a1'));
    expect(l.parts.some((p) => p.dir === 'down')).toBe(true);
    expect(['down', 'mixed']).toContain(l.tone);
  });
});
