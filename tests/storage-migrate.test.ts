import { describe, expect, it } from 'vitest';
import { MIGRATED_FLAG, migrateStorage } from '../src/storage-migrate';

function memStore(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    map: m,
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe('storage-migrate', () => {
  it('eski protomedi.* ve proto.* anahtarlarını eov.* altına taşır ve eskileri siler', () => {
    const s = memStore({ 'protomedi.campaign.v1': 'C', 'proto.settings.v1': 'S', 'other.key': 'x' });
    expect(migrateStorage(s)).toBe(2);
    expect(s.getItem('eov.campaign.v1')).toBe('C');
    expect(s.getItem('eov.settings.v1')).toBe('S');
    expect(s.getItem('protomedi.campaign.v1')).toBeNull();
    expect(s.getItem('proto.settings.v1')).toBeNull();
    expect(s.getItem('other.key')).toBe('x');
    expect(s.getItem(MIGRATED_FLAG)).toBe('1');
  });

  it('var olan eov.* anahtarını ezmez', () => {
    const s = memStore({ 'eov.settings.v1': 'NEW', 'proto.settings.v1': 'OLD' });
    migrateStorage(s);
    expect(s.getItem('eov.settings.v1')).toBe('NEW');
    expect(s.getItem('proto.settings.v1')).toBeNull();
  });

  it('protomedi.X ile proto.X çakışınca protomedi öncelikli', () => {
    const s = memStore({ 'proto.mp': 'P', 'protomedi.mp': 'PM' });
    migrateStorage(s);
    expect(s.getItem('eov.mp')).toBe('PM');
  });

  it('bayrak konduktan sonra tekrar çalışmaz', () => {
    const s = memStore({ [MIGRATED_FLAG]: '1', 'proto.settings.v1': 'S' });
    expect(migrateStorage(s)).toBe(0);
    expect(s.getItem('proto.settings.v1')).toBe('S');
    expect(s.getItem('eov.settings.v1')).toBeNull();
  });
});
