import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { memoryKV } from '../src/campaign';
import { clearCloudDirty, cloudDirty, onCloudDirty, storage, wrapKV } from '../src/game/kv-storage';
import { _resetTutorialMemory, markLessonSeen } from '../src/tutorial/store';
import { saveRun } from '../src/endless';
import { storage as endlessStorage } from '../src/game/endless-session';

const g = globalThis as { localStorage?: unknown; window?: unknown };

describe('kv-storage sarmalayıcısı: bulut kirli işareti', () => {
  let kv: ReturnType<typeof memoryKV>;
  beforeEach(() => {
    kv = memoryKV();
    g.localStorage = kv;
    clearCloudDirty();
    _resetTutorialMemory();
  });
  afterEach(() => {
    delete g.localStorage;
    delete g.window;
    clearCloudDirty();
    _resetTutorialMemory();
  });

  it('senkron anahtarı değişerek yazılınca / silinince işaretler; ayarlar ve aynı değer işaretlemez', () => {
    const s = storage()!;
    s.setItem('eov.settings.v1', '{}');
    s.setItem('eov.cloud.backup.v1', '{}');
    expect(cloudDirty()).toBe(false);
    const seen: string[] = [];
    const off = onCloudDirty((k) => seen.push(k));
    s.setItem('eov.endless.scores.v1', 'a');
    expect(cloudDirty()).toBe(true);
    clearCloudDirty();
    s.setItem('eov.endless.scores.v1', 'a');
    expect(cloudDirty()).toBe(false);
    s.removeItem('eov.campaign.v1'); // yoktu
    expect(cloudDirty()).toBe(false);
    s.removeItem('eov.endless.scores.v1');
    expect(cloudDirty()).toBe(true);
    expect(kv.getItem('eov.endless.scores.v1')).toBeNull();
    off();
    s.setItem('eov.endless.v1', 'x');
    expect(seen).toEqual(['eov.endless.scores.v1', 'eov.endless.scores.v1']);
    expect(s.getItem('eov.settings.v1')).toBe('{}');
  });

  it('aynı depo için aynı sarmalayıcı; window.localStorage öncelikli; depo yoksa null; yazım hatası işaretlemez', () => {
    expect(storage()).toBe(storage());
    const w = memoryKV();
    g.window = { localStorage: w };
    storage()!.setItem('k', 'v');
    expect(w.getItem('k')).toBe('v');
    delete g.window;
    delete g.localStorage;
    expect(storage()).toBeNull();
    const bad = wrapKV({ getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} });
    expect(() => bad.setItem('eov.campaign.v1', 'x')).toThrow();
    expect(cloudDirty()).toBe(false);
  });

  it('sefer yuvası silinince / yerine başka sefer kurulunca silme işareti yazılır; kayıt yazımı işaret yazmaz', () => {
    const s = storage()!;
    const file = (ids: Array<string | null>) => JSON.stringify({ version: 12, counter: 0, lastSlot: null, slots: ids.map((id) => (id ? { campaignId: id, mode: 'ironman', difficulty: 'medium', startedAt: 'x', lastPlayed: 'x', saves: [] } : null)) });
    s.setItem('eov.campaign.v1', file(['a', 'b', null]));
    expect(kv.getItem('eov.cloud.tombstones.v1')).toBeNull();
    s.setItem('eov.campaign.v1', file([null, 'c', null]));
    expect(JSON.parse(kv.getItem('eov.cloud.tombstones.v1')!).map((t: { slot: number; campaignId: string }) => [t.slot, t.campaignId])).toEqual([[0, 'a'], [1, 'b']]);
    s.removeItem('eov.campaign.v1');
    expect(JSON.parse(kv.getItem('eov.cloud.tombstones.v1')!)).toHaveLength(3);
    s.setItem('eov.campaign.v1', '{not json');
    expect(JSON.parse(kv.getItem('eov.cloud.tombstones.v1')!)).toHaveLength(3);
  });

  it('tutorial ve Endless oturumu sarmalayıcıyı kullanır', () => {
    markLessonSeen('turn_bar');
    expect(JSON.parse(kv.getItem('eov.tutorial.v1')!).seen).toEqual(['turn_bar']);
    expect(cloudDirty()).toBe(true);
    clearCloudDirty();
    expect(endlessStorage()).toBe(storage());
    saveRun(endlessStorage(), { phase: 'over' } as never); // bitmiş koşu: yuva silinir (yoktu: işaret yok)
    expect(cloudDirty()).toBe(false);
  });
});
