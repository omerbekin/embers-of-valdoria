import { describe, expect, it } from 'vitest';
import { fuseFlicker, fusePath, fusePrims, rgbHex } from '../src/ui/menu-fuse';

// Menü "yanan fitil" (Ömer 2026-11-25 r47, mockup menu-thread V5): saf geometri.
const G = { hx: 10, hy: 0, lineY: 18, xEnd: 300, u: 1 };

describe('menu fuse', () => {
  it('path starts at the ember head and ends at xEnd on the line', () => {
    const p = fusePath(G);
    expect(p[0]).toEqual([10, 0]);
    expect(p[p.length - 1]).toEqual([300, 18]);
  });
  it('flicker stays in a gentle band', () => {
    for (let t = 0; t < 10; t += 0.037) {
      const f = fuseFlicker(t);
      expect(f).toBeGreaterThanOrEqual(0.72);
      expect(f).toBeLessThanOrEqual(1);
    }
  });
  it('spark moves along the fuse over time', () => {
    const spark = (t: number) => fusePrims(G, t).filter((q) => q.k === 'dot' && q.c[1] === 246 && !(q.x === G.hx && q.y === G.hy));
    const a = spark(0.2)[0], b = spark(1.2)[0];
    expect(a && b && a.k === 'dot' && b.k === 'dot' && b.x > a.x).toBe(true);
  });
  it('same t gives the same frame (reduced motion freezes)', () => {
    expect(fusePrims(G, 0.6)).toEqual(fusePrims(G, 0.6));
  });
  it('phone (lite) draws fewer primitives and no smoke', () => {
    const full = fusePrims(G, 1).length, lite = fusePrims({ ...G, lite: true }, 1).length;
    expect(lite).toBeLessThan(full);
  });
  it('all alphas are valid and colours convert', () => {
    for (const q of fusePrims(G, 1.7)) {
      expect(q.a).toBeGreaterThanOrEqual(0);
      expect(q.a).toBeLessThanOrEqual(1);
    }
    expect(rgbHex([255, 179, 90])).toBe(0xffb35a);
  });
});
