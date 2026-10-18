import { describe, expect, it } from 'vitest';
import { FALLEN_GEAR_MSG, allocateStats, debugToggleFallen, equipBest, equipItem, newCampaign, pickHero, unequipItem, isFallen } from '../src/campaign';
import { heroFallen } from '../src/ui/gear-hover';

// Düşmüş kahraman ekipman ve stat puanı değiştiremez (Ömer 2026-10-18); diriltince her şey geri gelir.

describe('fallen hero gear lock', () => {
  it('equip / unequip / allocate throw for a fallen hero, equipBest skips them', () => {
    let s = pickHero(newCampaign({ mode: 'normal', seed: 7 }), 'archer');
    const hid = s.active.find((x) => x)!;
    const slotItem = Object.entries(s.roster.find((h) => h.id === hid)!.equipment).find(([, v]) => v);
    s = debugToggleFallen(s, hid);
    expect(isFallen(s.roster.find((h) => h.id === hid)!)).toBe(true);
    expect(() => equipItem(s, hid, 'nope')).toThrow(FALLEN_GEAR_MSG);
    if (slotItem) expect(() => unequipItem(s, hid, slotItem[0] as never)).toThrow(FALLEN_GEAR_MSG);
    expect(() => allocateStats(s, hid, { str: 1 })).toThrow(/Fallen/);
    expect(equipBest(s, [hid], { skipFallen: true }).roster.find((h) => h.id === hid)!.equipment).toEqual(s.roster.find((h) => h.id === hid)!.equipment);
  });
  it('reviving restores the ability to change gear', () => {
    let s = pickHero(newCampaign({ mode: 'normal', seed: 7 }), 'archer');
    const hid = s.active.find((x) => x)!;
    s = debugToggleFallen(s, hid);
    s = debugToggleFallen(s, hid);
    expect(isFallen(s.roster.find((h) => h.id === hid)!)).toBe(false);
    expect(() => equipItem(s, hid, 'nope')).toThrow(/not in the bag/);
  });
  it('UI rule matches: !alive or 0 hp is fallen', () => {
    expect(heroFallen({ alive: false })).toBe(true);
    expect(heroFallen({ hpRatio: 0 })).toBe(true);
    expect(heroFallen({ alive: true, hpRatio: 0.4 })).toBe(false);
    expect(heroFallen({})).toBe(false);
  });
});
