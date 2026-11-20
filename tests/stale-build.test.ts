import { describe, expect, it } from 'vitest';
import { handleChunkError, isStaleChunkError, OFFLINE_CHUNK_TEXT, shouldReload } from '../src/ui/stale-build';

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

describe('çevrimdışı parça hatası yenilemez (sağlamlık B2)', () => {
  const deps = (online: boolean, reachable: boolean) => {
    const out = { reloads: 0, warns: [] as string[] };
    return { out, d: { online: () => online, probe: async () => reachable, reload: () => (out.reloads++, true), warn: (m: string) => void out.warns.push(m) } };
  };
  const flush = () => new Promise((r) => setTimeout(r, 0));
  it('navigator.onLine false: yenileme yok, uyarı', async () => {
    const { out, d } = deps(false, false);
    expect(handleChunkError(new TypeError('Failed to fetch dynamically imported module'), d)).toBe(true);
    await flush();
    expect(out).toEqual({ reloads: 0, warns: [OFFLINE_CHUNK_TEXT] });
  });
  it('onLine true ama sunucu yanıt vermiyor: yenileme yok, uyarı', async () => {
    const { out, d } = deps(true, false);
    handleChunkError('x', d);
    await flush();
    expect(out).toEqual({ reloads: 0, warns: [OFFLINE_CHUNK_TEXT] });
  });
  it('çevrimiçi: eskisi gibi yenileme (yeni sürüm)', async () => {
    const { out, d } = deps(true, true);
    handleChunkError('x', d);
    await flush();
    expect(out).toEqual({ reloads: 1, warns: [] });
  });
});
