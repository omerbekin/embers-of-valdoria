import { describe, expect, it } from 'vitest';
import { debugTeleport, markMerchantIntroSeen, merchantIntroSeen, newCampaign, normalizeState } from '../src/campaign';

// Ömer 2026-10-20: "her gördüğüm merchant instance'ında 1 kere" — tanışma paneli tüccar örneği (harita + düğüm) başına bir kez, kayıtla kalıcı.
describe('tüccar tanışma paneli: örnek başına bir kez', () => {
  const s0 = debugTeleport(newCampaign({ mode: 'normal', seed: 5 }), 'camp');

  it('ilk girişte görülmemiş; işaretleyince görülmüş; tekrar işaretlemek durumu değiştirmez', () => {
    expect(merchantIntroSeen(s0)).toBe(false);
    const s1 = markMerchantIntroSeen(s0);
    expect(merchantIntroSeen(s1)).toBe(true);
    expect(markMerchantIntroSeen(s1)).toBe(s1);
  });

  it('başka tüccar düğümü ayrı örnektir (kendi paneli bir kez çıkar)', () => {
    const s1 = markMerchantIntroSeen(s0);
    expect(merchantIntroSeen({ ...s1, at: 'river' })).toBe(false);
  });

  it('kayıt gidiş-dönüşünde korunur; eski kayıtta alan yoksa görülmemiş sayılır', () => {
    const s1 = markMerchantIntroSeen(s0);
    const back = normalizeState(JSON.parse(JSON.stringify(s1)));
    expect(back && merchantIntroSeen(back)).toBe(true);
    const old = normalizeState(JSON.parse(JSON.stringify(s0)));
    expect(old && merchantIntroSeen(old)).toBe(false);
  });
});
