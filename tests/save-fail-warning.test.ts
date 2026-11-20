import { afterEach, describe, expect, it, vi } from 'vitest';

const toasts: string[] = [];
vi.mock('../src/ui/el-toast', () => ({ showElToast: (m: string) => void toasts.push(m) }));

import { autoResolve, memoryKV, newCampaign, NEWER_SAVE_TEXT, pickHero, SAVE_FAILED_TEXT, SAVE_KEY, SAVE_VERSION } from '../src/campaign';
import { checkpoint, save, session } from '../src/game/campaign-session';

/**
 * Sağlamlık taraması A3 (2026-11-15): kayıt yazılamazsa (depo dolu / kapalı) oyuncuya oturumda BİR kez İngilizce uyarı; daha yeni sürümün
 * dosyası varsa (eski sekme) ayrı uyarı, yine bir kez.
 */
const g = globalThis as unknown as { window?: { localStorage: unknown } };
const st = () => autoResolve(pickHero(newCampaign({ mode: 'normal', seed: 5, slot: 0, difficulty: 'medium', campaignId: 'c5' }), 'druid'));

afterEach(() => {
  delete g.window;
  session.state = null;
});

describe('kayıt yazılamadı uyarısı (campaign-session.ts)', () => {
  it('depo dolu: save ve checkpoint false, uyarı tek kez', () => {
    const kv = memoryKV();
    g.window = { localStorage: { getItem: (k: string) => kv.getItem(k), removeItem: (k: string) => kv.removeItem(k), setItem: () => { throw new Error('QuotaExceededError'); } } };
    session.state = st();
    expect(save('auto')).toBe(false);
    expect(save('manual')).toBe(false);
    expect(checkpoint()).toBe(false);
    expect(toasts).toEqual([SAVE_FAILED_TEXT]);
  });

  it('daha yeni sürümün dosyası: yazılmaz, "newer" uyarısı dakikada en çok bir kez', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    toasts.length = 0;
    const kv = memoryKV();
    const v15 = JSON.stringify({ version: SAVE_VERSION + 1, slots: [], counter: 0 });
    kv.setItem(SAVE_KEY, v15);
    g.window = { localStorage: kv };
    session.state = st();
    expect(save('auto')).toBe(false);
    expect(save('auto')).toBe(false);
    expect(kv.getItem(SAVE_KEY)).toBe(v15);
    expect(toasts).toEqual([NEWER_SAVE_TEXT]);
    vi.setSystemTime(Date.now() + 61_000);
    expect(save('auto')).toBe(false);
    expect(toasts).toEqual([NEWER_SAVE_TEXT, NEWER_SAVE_TEXT]);
    vi.useRealTimers();
  });
});
