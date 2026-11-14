// Düğüm kartı (Tur 14 kararı: H2 Banner) kuralları: alt başlık tekrarı ve elit / boss düğümünde görünen düşmanlar.
import { describe, expect, it } from 'vitest';
import { dedupSubtitle, visibleFoes } from '../src/ui/node-card';
import type { FoeGroup } from '../src/campaign/encounters';

const foe = (name: string, tier?: 'elite' | 'boss'): FoeGroup => ({ cls: name, sprite: name, name, n: 1, ...(tier ? { tier } : {}) });

describe('node card subtitle dedup', () => {
  it('drops the place list when the card shows the places', () => {
    expect(dedupSubtitle('City · Inn, Blacksmith, Recruits, Trade', { labels: ['Inn', 'Blacksmith'], foeNames: [], places: true })).toBe('City');
    expect(dedupSubtitle('City · Inn, Blacksmith', { labels: [], foeNames: [], places: false })).toBe('City · Inn, Blacksmith');
  });
  it('drops a part that repeats a shown enemy or a body label', () => {
    expect(dedupSubtitle('Boss · The Bridge Warden', { labels: [], foeNames: ['The Bridge Warden'], places: false })).toBe('Boss');
    expect(dedupSubtitle('Elite · The Undying', { labels: [], foeNames: ['High Priest of the Undying'], places: false })).toBe('Elite');
    expect(dedupSubtitle('Rest · Camp', { labels: ['Rest', 'Train'], foeNames: [], places: false })).toBe('Camp');
    expect(dedupSubtitle('Event', { labels: [], foeNames: [], places: false })).toBe('Event');
  });
});

describe('node card visible enemies', () => {
  const foes = [foe('Thug'), foe('Chief', 'elite'), foe('Archer')];
  it('normal stop: hidden until done, then all, strongest first', () => {
    expect(visibleFoes(foes, { tier: '', known: false })).toEqual([]);
    expect(visibleFoes(foes, { tier: '', known: true }).map((f) => f.name)).toEqual(['Chief', 'Thug', 'Archer']);
  });
  it('elite / boss stop: only ranked enemies until done', () => {
    expect(visibleFoes(foes, { tier: 'elite', known: false }).map((f) => f.name)).toEqual(['Chief']);
    expect(visibleFoes(foes, { tier: 'elite', known: true })).toHaveLength(3);
    expect(visibleFoes([foe('A'), foe('B')], { tier: 'boss', known: false })).toHaveLength(2);
  });
});
