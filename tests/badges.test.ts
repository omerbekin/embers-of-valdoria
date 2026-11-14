// Rozet zinciri (C, kalıcı): parametre gerekmez; model sayar, kasaba kuralı doğru, DOM işaretleri param olmadan çıkar.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { badgeModel, townSpotBadge } from '../src/ui/badge-model';

describe('badge model', () => {
  const s = {
    roster: [
      { id: 'a', alive: true, hpRatio: 1, statPoints: 6, skillPoints: 2 },
      { id: 'b', alive: true, hpRatio: 0.5, statPoints: 0, skillPoints: 0, wounds: 1 },
    ],
    inventory: [{ uid: 'i1' }, { uid: 'i2' }, { uid: 'i3' }],
    temperStones: 0,
  };
  it('counts points and unseen items along the chain', () => {
    const m = badgeModel(s, new Set(['i1']));
    expect(m.heroes['a']).toEqual({ stat: 6, tree: 2 });
    expect(m.heroes['b']).toEqual({ stat: 0, tree: 0 });
    expect(m.newUids).toEqual(['i2', 'i3']);
    expect(m.total).toBe(10);
  });
  it('town spots: recruit waiting, hurt hero at the inn, temper stones at the smith', () => {
    expect(townSpotBadge('recruit', s, true)).toBe(true);
    expect(townSpotBadge('recruit', s, false)).toBe(false);
    expect(townSpotBadge('inn', s, false)).toBe(true);
    expect(townSpotBadge('smith', s, false)).toBe(false);
    expect(townSpotBadge('smith', { ...s, temperStones: 2 }, false)).toBe(true);
    expect(townSpotBadge('trade', s, false)).toBe(false);
  });
});

describe('badges show without any URL param', () => {
  const read = (f: string): string => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  it('main.ts installs the chain unconditionally (no ?badgeVar gate)', () => {
    const main = read('src/main.ts');
    expect(main).toContain("import('./ui/badges')");
    expect(main).not.toMatch(/badgeVar|battleUi/);
    expect(read('src/ui/badges.ts')).not.toMatch(/badgeVar|variant-param/);
  });
  it('variant code is gone; reduced motion gives a static glow', () => {
    expect(existsSync(new URL('../src/ui/variants', import.meta.url))).toBe(false);
    const css = read('src/ui/badges.css');
    expect(css).toMatch(/html\.vb-rm \.vb-glow[^}]*animation: none/s);
    expect(css).not.toMatch(/vb-[AB]/);
  });
});
