import { describe, expect, it } from 'vitest';
import { BOB, STRIDE, travelGait } from '../src/game/map-traveller-gait';

describe('harita lideri sekmesi (W4)', () => {
  it('dururken sekme yok, adımın ortasında en yüksek (~2.8 px yukarı)', () => {
    expect(travelGait(0).bob).toBeCloseTo(0);
    expect(travelGait(STRIDE / 2).bob).toBeCloseTo(-BOB);
    expect(travelGait(STRIDE).bob).toBeCloseTo(0, 5);
  });
  it('her adımda adım sayacı artar', () => {
    expect(travelGait(STRIDE * 0.9).step).toBe(0);
    expect(travelGait(STRIDE * 1.1).step).toBe(1);
  });
});
