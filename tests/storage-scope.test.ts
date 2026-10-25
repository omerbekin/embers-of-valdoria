// /maps23/ test kopyasının depo ayrımı (src/storage-scope.ts): ana oyunun eov.* kayıtları okunmaz / bozulmaz; bulut kopyada kapalı.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { installStorageScope, isIsolatedCopy, scopedKey, scopedStorage, unscopedKey } from '../src/storage-scope';
import { migrateStorage } from '../src/storage-migrate';

function memStorage(init: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null,
    clear: () => m.clear(),
    get length() {
      return m.size;
    },
  } as Storage;
}

describe('storage scope (/maps23/ copy)', () => {
  it('detects the isolated copy only under /maps23/', () => {
    expect(isIsolatedCopy('/embers-of-valdoria/maps23/')).toBe(true);
    expect(isIsolatedCopy('/embers-of-valdoria/maps23/index.html')).toBe(true);
    expect(isIsolatedCopy('/embers-of-valdoria/')).toBe(false);
    expect(isIsolatedCopy('/')).toBe(false);
    expect(isIsolatedCopy('/maps23')).toBe(false);
    expect(isIsolatedCopy(undefined)).toBe(false);
  });

  it('maps keys both ways', () => {
    expect(scopedKey('eov.campaign.v1')).toBe('eov.m23.campaign.v1');
    expect(scopedKey('eov.debug.maps23')).toBe('eov.m23.debug.maps23');
    expect(scopedKey('proto.reducedMotion')).toBe('eov.m23.~proto.reducedMotion');
    expect(unscopedKey('eov.m23.campaign.v1')).toBe('eov.campaign.v1');
    expect(unscopedKey('eov.m23.~proto.x')).toBe('proto.x');
    expect(unscopedKey('eov.campaign.v1')).toBeNull();
  });

  it('never reads or writes the main game keys', () => {
    const base = memStorage({ 'eov.campaign.v1': 'MAIN', 'eov.reducedMotion': '1', 'proto.old': 'x' });
    const s = scopedStorage(base);
    expect(s.getItem('eov.campaign.v1')).toBeNull();
    expect(s.length).toBe(0);
    s.setItem('eov.campaign.v1', 'COPY');
    s.setItem('eov.debug.maps23', '1');
    expect(s.getItem('eov.campaign.v1')).toBe('COPY');
    expect(base.getItem('eov.campaign.v1')).toBe('MAIN');
    expect(base.getItem('eov.m23.campaign.v1')).toBe('COPY');
    expect(s.length).toBe(2);
    expect([s.key(0), s.key(1)].sort()).toEqual(['eov.campaign.v1', 'eov.debug.maps23']);
    s.removeItem('eov.reducedMotion');
    expect(base.getItem('eov.reducedMotion')).toBe('1');
    s.clear();
    expect(s.length).toBe(0);
    expect(base.getItem('eov.campaign.v1')).toBe('MAIN');
    expect(base.getItem('proto.old')).toBe('x');
  });

  it('key migration inside the copy leaves the main save alone', () => {
    const base = memStorage({ 'proto.reducedMotion': '1', 'eov.campaign.v1': 'MAIN' });
    migrateStorage(scopedStorage(base));
    expect(base.getItem('proto.reducedMotion')).toBe('1');
    expect(base.getItem('eov.campaign.v1')).toBe('MAIN');
  });

  it('installs only under /maps23/', () => {
    const mk = (pathname: string) => ({ location: { pathname }, localStorage: memStorage({ 'eov.a': 'MAIN' }), sessionStorage: memStorage() });
    const main = mk('/embers-of-valdoria/');
    expect(installStorageScope(main as never)).toBe(false);
    expect(main.localStorage.getItem('eov.a')).toBe('MAIN');
    const copy = mk('/embers-of-valdoria/maps23/');
    expect(installStorageScope(copy as never)).toBe(true);
    expect(copy.localStorage.getItem('eov.a')).toBeNull();
    copy.sessionStorage.setItem('eov.s', '1');
    expect(copy.sessionStorage.getItem('eov.s')).toBe('1');
  });

  it('is the first import of main.ts and cloud is off in the copy', () => {
    const main = readFileSync('src/main.ts', 'utf8');
    expect(main.split('\n')[0]).toMatch(/^import '\.\/storage-scope';/);
    const cloud = readFileSync('src/cloud/cloud.ts', 'utf8');
    expect(cloud).toMatch(/enabled: cloudConfig\.enabled === true && !isIsolatedCopy\(\)/);
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain("'eov.m23.reducedMotion'");
  });
});
