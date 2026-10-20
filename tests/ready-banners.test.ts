import { describe, expect, it } from 'vitest';
import { bannerState, bannerWidths } from '../src/game/ready-banners-logic';

describe('MP hazır sancakları', () => {
  it('durum: sen / rakip / ikisi', () => {
    expect(bannerState(false, false)).toEqual({ left: false, right: false, both: false });
    expect(bannerState(true, false)).toEqual({ left: true, right: false, both: false });
    expect(bannerState(false, true)).toEqual({ left: false, right: true, both: false });
    expect(bannerState(true, true).both).toBe(true);
  });
  it('dış sancak iç sancaktan büyük ve yan boşluğa sığar', () => {
    const w = bannerWidths(84);
    expect(w.outer).toBeGreaterThan(w.inner);
    expect(w.outer).toBeLessThanOrEqual(84);
    expect(bannerWidths(400).outer).toBe(150);
  });
});
