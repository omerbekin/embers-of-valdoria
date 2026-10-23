import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { autoResolve, debugTeleport, latestSave, listSaves, memoryKV, newCampaign, pickHero, saveAgo, saveCount, writeCheckpointSave, writeSave, type CampaignState } from '../src/campaign';

/**
 * Playtest B1 / H4 (Ömer 2026-10-23): kasaba işlemleri otomatik kayda girer; yenilgide Load Last Save kasabadaki ilerlemeyi korur.
 * Aynı düğümdeki art arda kasaba kayıtları tek kaydın yerine yazılır (Normal'in 5 kaydı erimez), elle kayıt silinmez.
 */
const start = (): CampaignState => autoResolve(pickHero(newCampaign({ mode: 'normal', seed: 7, slot: 0, difficulty: 'medium', campaignId: 'c7' }), 'archer'));
const keep = (s: CampaignState) => debugTeleport(s, '7'); // Valdren Keep (kasaba)

describe('kasaba kaydı (B1)', () => {
  it('kasabaya varınca yeni otomatik kayıt; aynı kasabadaki sonraki işlemler onun yerine yazılır', () => {
    const kv = memoryKV();
    const s0 = start();
    writeSave(kv, s0, 'auto', '2026-10-23T10:00:00Z'); // önceki zafer kaydı (ör. Charcoal Camp)
    const s1 = keep(s0);
    expect(writeCheckpointSave(kv, { ...s1, gold: 50 }, '2026-10-23T10:05:00Z')).toBe(true);
    expect(saveCount(kv, 0)).toBe(2);
    expect(writeCheckpointSave(kv, { ...s1, gold: 10 }, '2026-10-23T10:06:00Z')).toBe(true);
    expect(saveCount(kv, 0)).toBe(2);
    const last = latestSave(kv, 0)!;
    expect(last.state.gold).toBe(10);
    expect(last.state.at).toBe('7');
    expect(last.summary.node).toBe('Valdren Keep');
    expect(last.savedAt).toBe('2026-10-23T10:06:00Z');
    expect(listSaves(kv, 0)[1]!.state.at).toBe(s0.at); // zafer kaydı yerinde
  });

  it('elle kayıt kasaba kaydıyla ezilmez', () => {
    const kv = memoryKV();
    const s = keep(start());
    writeSave(kv, s, 'manual', '2026-10-23T10:00:00Z');
    writeCheckpointSave(kv, { ...s, gold: 3 }, '2026-10-23T10:01:00Z');
    expect(listSaves(kv, 0).map((e) => e.kind)).toEqual(['auto', 'manual']);
  });

  it('Ironman da kasaba kaydı alır (tek kayıt)', () => {
    const kv = memoryKV();
    const s = keep(autoResolve(pickHero(newCampaign({ mode: 'ironman', seed: 8, slot: 1, difficulty: 'medium', campaignId: 'i8' }), 'archer')));
    expect(writeCheckpointSave(kv, { ...s, gold: 1 })).toBe(true);
    expect(writeCheckpointSave(kv, { ...s, gold: 2 })).toBe(true);
    expect(saveCount(kv, 1)).toBe(1);
    expect(latestSave(kv, 1)!.state.gold).toBe(2);
  });
});

describe('Defeat > Load Last Save (oturum, B1 + H4)', () => {
  const g = globalThis as unknown as { window?: unknown };
  let had: unknown;
  beforeEach(() => {
    had = g.window;
    g.window = { localStorage: memoryKV() };
  });
  afterEach(() => {
    g.window = had;
  });

  it('kasabada yapılan işlem yenilgiden sonra geri gelir; düğme notu yer ve zamanı yazar', async () => {
    const cs = await import('../src/game/campaign-session');
    const s0 = start();
    cs.setState(s0);
    cs.save('auto'); // önceki zafer
    cs.setState({ ...keep(s0), gold: 999 }); // kasabada alışveriş / katılım
    expect(cs.checkpoint()).toBe(true);
    cs.setState({ ...keep(s0), gold: 5, at: s0.at }); // yola çıkıp yenildi
    const back = cs.loadLastSave()!;
    expect(back.at).toBe('7');
    expect(back.gold).toBe(999);
    expect(cs.lastSaveNote(Date.now() + 12 * 60000)).toBe('Valdren Keep · 12 min ago');
  });
});

describe('saveAgo (H4)', () => {
  const t = Date.parse('2026-10-23T12:00:00Z');
  it('oyuncu dilinde yaş', () => {
    expect(saveAgo('2026-10-23T11:59:40Z', t)).toBe('just now');
    expect(saveAgo('2026-10-23T11:48:00Z', t)).toBe('12 min ago');
    expect(saveAgo('2026-10-23T09:00:00Z', t)).toBe('3 h ago');
    expect(saveAgo('2026-10-22T11:00:00Z', t)).toBe('1 day ago');
    expect(saveAgo('2026-10-20T11:00:00Z', t)).toBe('3 days ago');
    expect(saveAgo('bozuk', t)).toBe('just now');
  });
});
