import { describe, expect, it } from 'vitest';
import { newCampaign, normalizeState, pickHero } from '../src/campaign';
import { newRun as newRunBase, parseRun, bagOf } from '../src/endless';
import { SAVE_VERSION as ENDLESS_SAVE_VERSION } from '../src/endless/save';
import { BAG_SIZE, canEquip, itemDef, stripUnusable, type ItemInstance } from '../src/progression/items';
import { leveledRun } from './level-helpers';

// Ömer 2026-10-28: sınıfın artık takamadığı item (war_maul maces -> hammers; Warrior kullanamaz) kayıt okunurken torbaya döner.
describe('unusable equipped gear goes back to the bag on load', () => {
  it('precondition: Warrior cannot use the War Maul, can use an arming sword', () => {
    expect(canEquip('warrior', itemDef('war_maul')!)).toBe(false);
    expect(canEquip('warrior', itemDef('arming_sword')!)).toBe(true);
  });

  it('stripUnusable: moves only unusable items (off-hand too), is idempotent', () => {
    const eq: Record<string, ItemInstance | null> = { weapon: { uid: 'a', id: 'war_maul' }, offhand: null, helm: null };
    const spill: ItemInstance[] = [];
    expect(stripUnusable('warrior', eq, spill)).toEqual(['weapon']);
    expect(eq.weapon).toBeNull();
    expect(spill.map((x) => x.uid)).toEqual(['a']);
    expect(stripUnusable('warrior', eq, spill)).toEqual([]);
    // Paladin takabilir: dokunulmaz
    const ok: Record<string, ItemInstance | null> = { weapon: { uid: 'b', id: 'war_maul' } };
    expect(stripUnusable('paladin', ok, spill)).toEqual([]);
    expect(ok.weapon?.uid).toBe('b');
    // tanımı olmayan item'e dokunulmaz
    const unk: Record<string, ItemInstance | null> = { weapon: { uid: 'c', id: 'no_such_item' } };
    expect(stripUnusable('warrior', unk, spill)).toEqual([]);
  });

  it('campaign: Warrior with a War Maul -> maul in the bag, weapon slot empty, paused battle dropped', () => {
    const s = pickHero(newCampaign({ mode: 'normal', seed: 7, campaignId: 'c7' }), 'warrior');
    const raw = JSON.parse(JSON.stringify(s)) as { roster: Array<{ equipment: Record<string, unknown> }>; inventory: unknown[]; suspended?: unknown };
    raw.roster[0]!.equipment.weapon = { uid: 'i90', id: 'war_maul' };
    raw.suspended = { node: 'x' };
    const back = normalizeState(raw)!;
    expect(back).not.toBeNull();
    expect(back.roster[0]!.equipment.weapon).toBeNull();
    expect(back.inventory.map((i) => i.uid)).toContain('i90');
    expect(back.suspended).toBeUndefined();
    // ikinci okuma aynı (idempotent: torbada tek kopya)
    const again = normalizeState(JSON.parse(JSON.stringify(back)))!;
    expect(again.inventory.filter((i) => i.uid === 'i90')).toHaveLength(1);
  });

  it('campaign: full bag still receives the item (load never loses items, like the off-hand migration)', () => {
    const s = pickHero(newCampaign({ mode: 'normal', seed: 7, campaignId: 'c7' }), 'warrior');
    const raw = JSON.parse(JSON.stringify(s)) as { roster: Array<{ equipment: Record<string, unknown> }>; inventory: unknown[] };
    raw.inventory = Array.from({ length: BAG_SIZE }, (_, i) => ({ uid: `f${i}`, id: 'arming_sword' }));
    raw.roster[0]!.equipment.weapon = { uid: 'i90', id: 'war_maul' };
    const back = normalizeState(raw)!;
    expect(back.inventory).toHaveLength(BAG_SIZE + 1);
    expect(back.inventory.at(-1)?.uid).toBe('i90');
  });

  it('campaign: a valid equip is untouched', () => {
    const s = pickHero(newCampaign({ mode: 'normal', seed: 7, campaignId: 'c7' }), 'warrior');
    const raw = JSON.parse(JSON.stringify(s)) as { roster: Array<{ equipment: Record<string, unknown> }> };
    raw.roster[0]!.equipment.weapon = { uid: 'i91', id: 'arming_sword' };
    const back = normalizeState(raw)!;
    expect(back.roster[0]!.equipment.weapon?.uid).toBe('i91');
    expect(back.inventory.map((i) => i.uid)).not.toContain('i91');
  });

  it('Endless: Warrior with a War Maul -> maul in the bag, weapon slot gone; others untouched', () => {
    const run = leveledRun(newRunBase(41, ['warrior', 'paladin'], '2026-10-28T00:00:00.000Z'));
    const w = run.heroes.find((h) => h.class === 'warrior')!;
    const p = run.heroes.find((h) => h.class === 'paladin')!;
    w.equipment = { weapon: { uid: 'm1', id: 'war_maul' } };
    p.equipment = { weapon: { uid: 'm2', id: 'war_maul' } };
    const back = parseRun(JSON.stringify({ version: ENDLESS_SAVE_VERSION, run }))!;
    expect(back).not.toBeNull();
    expect(back.heroes.find((h) => h.id === w.id)!.equipment.weapon).toBeUndefined();
    expect(back.heroes.find((h) => h.id === p.id)!.equipment.weapon?.uid).toBe('m2');
    expect(bagOf(back).map((i) => i.uid)).toEqual(['m1']);
  });
});
