import { describe, expect, it } from 'vitest';
import { FALLEN_GEAR_MSG, allocateStats, debugToggleFallen, equipBest, equipItem, newCampaign, pickHero, unequipItem, isFallen } from '../src/campaign';
import { equipBestRun, equipFromBag, newRun as newRunBase, runHeroFallen, unequipToBag, allocateRun, type EndlessRun } from '../src/endless';
import { FALLEN_GEAR_SHORT, ITEMS, canEquip } from '../src/progression';
import { FALLEN_GEAR_TEXT, FALLEN_MARK, heroFallen } from '../src/ui/gear-hover';
import { leveledRun } from './level-helpers';

// Düşmüş kahraman item takamaz / çıkaramaz (Ömer 2026-10-18): sefer ve Endless (run katmanı), "Equip best" ve sim'in `best` politikası aynı kural.
// Stat puanı düşmüşken de harcanır. Uyarı metni her yerde tek ve diriltme yolu söylemez.

const levelUp = <T extends { roster: Array<{ id: string; statPoints?: number }> }>(s: T, id: string, n: number): T => ({ ...s, roster: s.roster.map((h) => (h.id === id ? { ...h, statPoints: n } : h)) });

describe('fallen hero gear lock (campaign)', () => {
  it('equip / unequip throw for a fallen hero, equipBest skips them (no option needed: sim best policy too)', () => {
    let s = pickHero(newCampaign({ mode: 'normal', seed: 7 }), 'archer');
    const hid = s.active.find((x) => x)!;
    const slotItem = Object.entries(s.roster.find((h) => h.id === hid)!.equipment).find(([, v]) => v);
    s = debugToggleFallen(s, hid);
    expect(isFallen(s.roster.find((h) => h.id === hid)!)).toBe(true);
    expect(() => equipItem(s, hid, 'nope')).toThrow(FALLEN_GEAR_MSG);
    if (slotItem) expect(() => unequipItem(s, hid, slotItem[0] as never)).toThrow(FALLEN_GEAR_MSG);
    // torbaya bu kahramanın takabileceği bir silah koy: equipBest yine de dokunmaz
    const w = ITEMS.items.find((d) => d.slot === 'weapon' && canEquip('archer', d))!;
    s = { ...s, inventory: [...s.inventory, { uid: 'zz1', id: w.id }] };
    expect(equipBest(s, [hid]).roster.find((h) => h.id === hid)!.equipment).toEqual(s.roster.find((h) => h.id === hid)!.equipment);
    expect(equipBest(s).roster.find((h) => h.id === hid)!.equipment).toEqual(s.roster.find((h) => h.id === hid)!.equipment);
  });

  it('a fallen hero CAN spend stat points', () => {
    let s = pickHero(newCampaign({ mode: 'normal', seed: 7 }), 'archer');
    const hid = s.active.find((x) => x)!;
    s = debugToggleFallen(levelUp(s, hid, 2), hid);
    const t = allocateStats(s, hid, { dex: 1 });
    expect(t.roster.find((h) => h.id === hid)!.statPoints).toBe(1);
  });

  it('reviving restores the ability to change gear', () => {
    let s = pickHero(newCampaign({ mode: 'normal', seed: 7 }), 'archer');
    const hid = s.active.find((x) => x)!;
    s = debugToggleFallen(s, hid);
    s = debugToggleFallen(s, hid);
    expect(isFallen(s.roster.find((h) => h.id === hid)!)).toBe(false);
    expect(() => equipItem(s, hid, 'nope')).toThrow(/not in the bag/);
  });
});

describe('fallen hero gear lock (Endless run layer)', () => {
  const PARTY = ['warrior', 'archer', 'mage', 'druid'];
  const fallen = (): EndlessRun => {
    const r = leveledRun(newRunBase(41, PARTY, '2026-10-09T00:00:00.000Z'));
    const w = ITEMS.items.find((d) => d.slot === 'weapon' && canEquip('archer', d))!;
    return { ...r, bag: [{ uid: 'b0', id: w.id }], nextItem: 2, heroes: r.heroes.map((h) => (h.class === 'archer' ? { ...h, hpRatio: 0, statPoints: 2 } : h)) };
  };
  it('equipFromBag / unequipToBag throw, equipBestRun skips, stat points still spend', () => {
    const r = fallen();
    const h = r.heroes.find((x) => x.class === 'archer')!;
    expect(runHeroFallen(h)).toBe(true);
    expect(() => equipFromBag(r, h.id, 'b0')).toThrow(FALLEN_GEAR_MSG);
    const slot = Object.keys(h.equipment).find((k) => (h.equipment as Record<string, unknown>)[k]);
    if (slot) expect(() => unequipToBag(r, h.id, slot as never)).toThrow(FALLEN_GEAR_MSG);
    expect(equipBestRun(r).heroes.find((x) => x.id === h.id)!.equipment).toEqual(h.equipment);
    expect(allocateRun(r, h.id, { dex: 1 }).heroes.find((x) => x.id === h.id)!.statPoints).toBe(1);
  });
});

describe('fallen hero texts', () => {
  it('one message everywhere, no revive wording', () => {
    expect(FALLEN_GEAR_MSG).toBe("Fallen heroes can't equip items.");
    expect(FALLEN_GEAR_TEXT).toBe(FALLEN_GEAR_MSG);
    for (const t of [FALLEN_GEAR_MSG, FALLEN_GEAR_SHORT, FALLEN_MARK]) expect(t).not.toMatch(/reviv|town/i);
  });
  it('UI rule matches: !alive or 0 hp is fallen', () => {
    expect(heroFallen({ alive: false })).toBe(true);
    expect(heroFallen({ hpRatio: 0 })).toBe(true);
    expect(heroFallen({ alive: true, hpRatio: 0.4 })).toBe(false);
    expect(heroFallen({})).toBe(false);
  });
});
