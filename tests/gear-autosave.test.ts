import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoResolve, latestSave, memoryKV, newCampaign, pickHero, saveCount, type CampaignState } from '../src/campaign';

/**
 * Ömer 2026-11-21: Gear'da skill puanı harcanınca / eşya giyilince otomatik kayıt (mevcut checkpoint yolu); art arda değişiklikler tek yazıma birleşir.
 */
const g = globalThis as unknown as { window?: unknown };
let had: unknown;
beforeEach(() => {
  had = g.window;
  g.window = { localStorage: memoryKV() };
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  g.window = had;
});

const start = (mode: 'normal' | 'ironman' = 'normal'): CampaignState => autoResolve(pickHero(newCampaign({ mode, seed: 7, slot: 0, difficulty: 'medium', campaignId: 'c7' }), 'druid'));

describe('Gear otomatik kayıt', () => {
  it('skill puanı sonrası kayıt yazılır; 5 puan üst üste tek yazıma birleşir; sayfa yenilenince değişiklik yerinde', async () => {
    const cs = await import('../src/game/campaign-session');
    const gs = await import('../src/ui/gear-screen');
    let s = { ...start() };
    s.roster = s.roster.map((h) => ({ ...h, statPoints: 9, level: 9 }));
    cs.setState(s);
    cs.save('auto');
    const before = saveCount(cs.storage(), 0);
    const src = gs.campaignGearSource(() => cs.current()!, cs.setState);
    const id = s.roster[0]!.id;
    for (const a of ['str', 'dex', 'int', 'luck', 'dex'] as const) src.allocate!(id, { [a]: 1 }); // 5 puan art arda
    expect(saveCount(cs.storage(), 0)).toBe(before); // henüz yazılmadı (birleştirme gecikmesi)
    vi.advanceTimersByTime(cs.GEAR_SAVE_DELAY_MS + 5);
    expect(saveCount(cs.storage(), 0)).toBeLessThanOrEqual(before + 1);
    const last = latestSave(cs.storage(), 0)!;
    expect(last.state.roster.find((h) => h.id === id)!.alloc).toEqual(cs.current()!.roster.find((h) => h.id === id)!.alloc);
  });

  it('eşya giyilince kayda girer; flush beklemeyi atlar', async () => {
    const cs = await import('../src/game/campaign-session');
    const gs = await import('../src/ui/gear-screen');
    const s = start();
    cs.setState(s);
    cs.save('auto');
    const src = gs.campaignGearSource(() => cs.current()!, cs.setState);
    const h = s.roster[0]!;
    const slot = Object.keys(h.equipment)[0] as never;
    src.unequip(h.id, slot);
    expect(cs.flushGearSave()).toBe(true);
    const saved = latestSave(cs.storage(), 0)!.state.roster.find((x) => x.id === h.id)!;
    expect(saved.equipment[slot] ?? null).toBeNull();
    expect(cs.flushGearSave()).toBe(false); // bekleyen yok
  });

  it('Ironman tek kayıt kuralı korunur', async () => {
    const cs = await import('../src/game/campaign-session');
    const gs = await import('../src/ui/gear-screen');
    cs.setState(start('ironman'));
    const src = gs.campaignGearSource(() => cs.current()!, cs.setState);
    const h = cs.current()!.roster[0]!;
    src.unequip(h.id, Object.keys(h.equipment)[0] as never);
    vi.advanceTimersByTime(cs.GEAR_SAVE_DELAY_MS + 5);
    expect(saveCount(cs.storage(), 0)).toBe(1);
  });
});
