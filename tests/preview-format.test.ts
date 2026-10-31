import { describe, expect, it } from 'vitest';
import { parseStatusLine, previewStatusIconMinChance, splitPreviewStatuses } from '../src/game/preview-format';
import type { StatusDef } from '../src/engine';

const defs = { slow: { name: 'Slow' }, blinded: { name: 'Blinded' }, branded: { name: 'Branded' } } as unknown as Record<string, StatusDef>;

describe('preview status split', () => {
  it('threshold lives in data', () => expect(previewStatusIconMinChance).toBe(0.5));
  it('parses chance lines', () => {
    expect(parseStatusLine('Slow 1 turns (5% chance)')).toEqual({ name: 'Slow', chance: 0.05 });
    expect(parseStatusLine('Blinded 2 turns')).toEqual({ name: 'Blinded', chance: 1 });
    expect(parseStatusLine('Immune: Stun')).toBeNull();
  });
  it('icons at 50% and above, hides lower, keeps other text', () => {
    const r = splitPreviewStatuses(['Slow 1 turns (5% chance)', 'Blinded 2 turns (50% chance)', 'Immune: Stun'], defs);
    expect(r.icons.map((i) => i.kind)).toEqual(['blinded']);
    expect(r.text).toEqual(['Immune: Stun']);
  });
  it('Branded keeps only its own line', () => {
    const r = splitPreviewStatuses(['Branded 3 turns', 'Tainted mana 12', 'MP costs 50% higher', 'MP skills burn 75% extra'], defs);
    expect(r.icons).toEqual([]);
    expect(r.text).toEqual(['Branded 3 turns']);
  });
});
