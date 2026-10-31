import { describe, expect, it } from 'vitest';
import { bagKinds, visibleByKind } from '../src/ui/bag-bar';
import { ITEMS, SLOT_IDS, itemDef } from '../src/progression';

describe('bag bar item-type filter (Gear bag, 2026-10-31)', () => {
  it('kinds come from the real slot data, not a hand-written list', () => {
    expect(bagKinds().map((k) => k.id)).toEqual(ITEMS.slots.map((s) => s.id));
    expect(bagKinds().map((k) => k.id)).toEqual([...SLOT_IDS]);
    expect(bagKinds().every((k) => k.name.length > 0)).toBe(true);
  });

  it('nothing hidden = every item stays; hiding a kind removes only that kind', () => {
    const items = ITEMS.items.slice(0, 80).map((d, i) => ({ id: d.id, uid: `u${i}` }));
    expect(visibleByKind(items, new Set())).toHaveLength(items.length);
    const kind = itemDef(items[0]!.id)!.slot;
    const left = visibleByKind(items, new Set([kind]));
    expect(left.length).toBeLessThan(items.length);
    expect(left.every((i) => itemDef(i.id)!.slot !== kind)).toBe(true);
    // hiding all kinds empties the bag view
    expect(visibleByKind(items, new Set(SLOT_IDS))).toHaveLength(0);
  });
});
