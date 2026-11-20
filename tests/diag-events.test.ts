import { afterEach, describe, expect, it, vi } from 'vitest';

const logs: Array<[string, string]> = [];
const reports: Array<[string, string]> = [];
vi.mock('../src/diag/diag', () => ({
  logEvent: (k: string, m = '') => void logs.push([k, m]),
  report: (k: string, m = '') => (reports.push([k, m]), true),
}));
vi.mock('../src/ui/el-toast', () => ({ showElToast: () => {} }));

import { autoResolve, deleteSlot, memoryKV, newCampaign, pickHero, SAVE_KEY, SAVE_VERSION, writeSave } from '../src/campaign';
import { save, session } from '../src/game/campaign-session';
import { wrapKV } from '../src/game/kv-storage';
import { logBattleEnd } from '../src/game/battle-diag';
import { noteContextLost, noteContextRestored } from '../src/ui/context-loss';
import { heapHighNote } from '../src/diag/diag-core';

/**
 * Tanılama izleri (Lead 2026-11-16, docs/arch/diagnostics.md): kayıt deposu hataları, yuva silme / tombstone, savaş sonu, WebGL kaybı,
 * düşük bellek. Yalnız kısa kod + sayı.
 */
const g = globalThis as unknown as { window?: { localStorage: unknown } };
const st = (seed: number, slot: number) => autoResolve(pickHero(newCampaign({ mode: 'normal', seed, slot, difficulty: 'medium', campaignId: `c${seed}` }), 'druid'));
const saveLogs = () => logs.filter(([k]) => k === 'save').map(([, m]) => m);

afterEach(() => {
  logs.length = 0;
  reports.length = 0;
  delete g.window;
  session.state = null;
});

describe('tanılama izleri', () => {
  it('daha yeni sürüm dosyası: okuma + red izi, ilk yazma hatası tek rapor', () => {
    const kv = memoryKV();
    kv.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION + 1, slots: [] }));
    g.window = { localStorage: kv };
    session.state = st(3, 0);
    save('auto');
    save('auto');
    expect(saveLogs()).toContain(`read newer v${SAVE_VERSION + 1}`);
    expect(saveLogs()).toContain('write refused newer');
    expect(reports).toEqual([['error', 'save write failed: newer']]);
  });

  it('bozuk dosya: okunamadı + ham kopya izi', () => {
    const kv = memoryKV();
    kv.setItem(SAVE_KEY, '{"version":14,"slots":[');
    writeSave(kv, st(4, 0), 'auto');
    expect(saveLogs()).toEqual(['read unreadable v?', 'corrupt backup']);
  });

  it('yuva silme ve tombstone: yuva no + neden', () => {
    const kv = wrapKV(memoryKV());
    writeSave(kv, st(5, 0), 'manual');
    writeSave(kv, st(6, 1), 'manual');
    logs.length = 0;
    deleteSlot(kv, 1);
    expect(saveLogs()).toEqual(['tombstone slot 1 (campaign gone)', 'slot 1 deleted']);
    writeSave(kv, st(7, 0), 'manual');
    expect(saveLogs()).toContain('slot 0 replaced');
  });

  it('savaş sonu: sonuç + Round + tur', () => {
    logBattleEnd('victory', { round: 3, turnsTaken: 17 });
    logBattleEnd('retreat', { round: 1, turnsTaken: 2 });
    expect(logs).toEqual([
      ['battle', 'end victory round 3 turns 17'],
      ['battle', 'end retreat round 1 turns 2'],
    ]);
  });

  it('WebGL kaybı: iz + rapor; geri gelince süreli iz', () => {
    noteContextLost(1000);
    noteContextRestored(3500);
    expect(logs).toEqual([
      ['gl', 'webglcontextlost'],
      ['gl', 'webglcontextrestored after 2500 ms'],
    ]);
    expect(reports.map(([k]) => k)).toEqual(['webglcontextlost']);
  });

  it('düşük bellek: %85 üstünde kısa ileti, altında / ölçü yoksa null', () => {
    const MB = 1048576;
    expect(heapHighNote({ usedJSHeapSize: 900 * MB, jsHeapSizeLimit: 1000 * MB })).toBe('heap high 900/1000 MB (90%)');
    expect(heapHighNote({ usedJSHeapSize: 500 * MB, jsHeapSizeLimit: 1000 * MB })).toBeNull();
    expect(heapHighNote(undefined)).toBeNull();
  });
});
