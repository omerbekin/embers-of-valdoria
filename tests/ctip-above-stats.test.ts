import { describe, expect, it } from 'vitest';
import { ctipAboveStatsPlace } from '../src/ui/battle-hud';

const base = { stripL: 20, stripR: 1000, minTop: 5, gap: 10, maxW: 1100 };

describe('ctipAboveStatsPlace', () => {
  it('ends gap above the panel and fills the strip', () => {
    const p = ctipAboveStatsPlace({ ...base, panelTop: 300, heightAt: () => 100 });
    expect(p).toEqual({ left: 20, width: 980, top: 190 });
  });
  it('caps the width at maxW', () => {
    const p = ctipAboveStatsPlace({ ...base, maxW: 500, panelTop: 300, heightAt: () => 100 });
    expect(p.width).toBe(500);
  });
  it('clamps to the min top margin when too tall', () => {
    const p = ctipAboveStatsPlace({ ...base, panelTop: 100, heightAt: () => 200 });
    expect(p.top).toBe(5);
  });
  it('measures the height at the chosen width', () => {
    let seen = 0;
    ctipAboveStatsPlace({ ...base, panelTop: 300, heightAt: (w) => ((seen = w), 10) });
    expect(seen).toBe(980);
  });
});
