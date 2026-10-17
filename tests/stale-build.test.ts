import { describe, expect, it } from 'vitest';
import { isStaleChunkError, shouldReload } from '../src/ui/stale-build';

function mem(): Pick<Storage, 'getItem' | 'setItem'> {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe('stale build reload', () => {
  it('eski sürüm parça hatalarını tanır', () => {
    expect(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/campaign-slots-ui-Bkjnm4jP.js'))).toBe(true);
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isStaleChunkError(new Error('something else'))).toBe(false);
  });

  it('30 sn içinde ikinci kez yenilemez (döngü yok)', () => {
    const s = mem();
    expect(shouldReload(100_000, s)).toBe(true);
    expect(shouldReload(110_000, s)).toBe(false);
    expect(shouldReload(140_000, s)).toBe(true);
  });
});
