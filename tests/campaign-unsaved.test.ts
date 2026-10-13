import { describe, expect, it } from 'vitest';
import { hasUnsavedProgress, markTipSeen, memoryKV, newCampaign, pickHero, writeSave, type CampaignState } from '../src/campaign';

// Sefer haritası ◂ Back uyarısı (Ömer 2026-10-12): Normal modda son kayıttan beri ilerleme varsa uyarılır; Ironman hiç uyarmaz.
const played = (mode: 'normal' | 'ironman'): CampaignState => ({ ...pickHero(newCampaign({ mode, seed: 7, campaignId: `c-${mode}` }), 'mage'), slot: 0 });

describe('hasUnsavedProgress', () => {
  it('Normal: kayıt yoksa true, kayıttan hemen sonra false, değişince true', () => {
    const kv = memoryKV();
    const s = played('normal');
    expect(hasUnsavedProgress(kv, s)).toBe(true);
    writeSave(kv, s, 'manual');
    expect(hasUnsavedProgress(kv, s)).toBe(false);
    expect(hasUnsavedProgress(kv, { ...s, gold: s.gold + 5 })).toBe(true);
  });

  it('görülen ipucu ilerleme sayılmaz', () => {
    const kv = memoryKV();
    const s = played('normal');
    writeSave(kv, s, 'manual');
    expect(hasUnsavedProgress(kv, markTipSeen(s))).toBe(false);
  });

  it('Ironman asla uyarmaz', () => {
    expect(hasUnsavedProgress(memoryKV(), { ...played('ironman'), gold: 999 })).toBe(false);
  });
});
