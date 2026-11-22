import { describe, expect, it } from 'vitest';
import { cdCentred, cdDot, cdPitch, cdTier, cdTierText } from '../src/ui/corner-dots-rule';

// Ömer 2026-11-21 (uc-nokta 3. tur, olcu.txt): kısa kenara göre kademe, ortalama koşulu, taban 4 px
describe('köşe süsü kuralı (üç nokta)', () => {
  it('kademe kısa kenara göre', () => {
    expect(cdTier(60)).toBe(1.25);
    expect(cdTier(79)).toBe(1.25);
    expect(cdTier(80)).toBe(1.5);
    expect(cdTier(149)).toBe(1.5);
    expect(cdTier(150)).toBe(1.75);
    expect(cdTier(297.1)).toBe(1.75);
    expect(cdTier(300)).toBe(2);
    expect(cdTierText(60)).toBe('+25%');
    expect(cdTierText(300)).toBe('+100%');
  });
  it('nokta boyu taban 4 px x kademe (olcu.txt)', () => {
    expect(cdDot(60)).toBe(5);
    expect(cdDot(96)).toBe(6);
    expect(cdDot(200)).toBe(7);
    expect(cdDot(300)).toBe(8);
  });
  it('adım: en az 8 x kademe ve çapın 1,9 katı', () => {
    expect(cdPitch(60)).toBe(10);
    expect(cdPitch(300)).toBe(16);
  });
  it('ortalama yalnız kısa kenar 70 altı ve kareye yakın', () => {
    expect(cdCentred(60, 60)).toBe(true);
    expect(cdCentred(66, 66)).toBe(true);
    expect(cdCentred(79, 210)).toBe(false); // 70 üstü ve uzun
    expect(cdCentred(60, 120)).toBe(false); // 70 altı ama uzun
    expect(cdCentred(72, 72)).toBe(false); // 70 üstü
    expect(cdCentred(60, 75)).toBe(true); // 1,25 sınırı
  });
});
