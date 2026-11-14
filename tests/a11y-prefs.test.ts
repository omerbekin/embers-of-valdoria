import { describe, expect, it } from 'vitest';
import { parseColorblind, parseTextSize, stepTextSize, TEXT_SCALE } from '../src/ui/a11y-prefs';
import { readSettingsObject } from '../src/ui/settings-store';
import { isClipped, nextExpanded } from '../src/ui/tap-expand';
import { RARITY_LETTER } from '../src/ui/rarity-mark';

describe('erişilebilirlik ayarları', () => {
  it('geçersiz / eksik değer güvenli varsayılana düşer', () => {
    expect(parseTextSize(undefined)).toBe('normal');
    expect(parseTextSize('huge')).toBe('normal');
    expect(parseTextSize('large')).toBe('large');
    expect(parseColorblind('yes')).toBe(false);
    expect(parseColorblind(true)).toBe(true);
    expect(TEXT_SCALE.small).toBeLessThan(TEXT_SCALE.normal);
    expect(TEXT_SCALE.large).toBeGreaterThan(TEXT_SCALE.normal);
  });
  it('boy adımı uçlarda döner', () => {
    expect(stepTextSize('normal', 1)).toBe('large');
    expect(stepTextSize('large', 1)).toBe('small');
    expect(stepTextSize('small', -1)).toBe('large');
  });
  it('kayıt okuma: eski alanlar korunur, bozuk kayıt boş nesne', () => {
    expect(readSettingsObject('{"volume":10,"textSize":"large"}')).toEqual({ volume: 10, textSize: 'large' });
    expect(readSettingsObject('{bozuk')).toEqual({});
    expect(readSettingsObject('[1]')).toEqual({});
  });
  it('her rarity için harf işareti var', () => {
    expect(Object.keys(RARITY_LETTER)).toEqual(['common', 'uncommon', 'rare', 'epic', 'legendary']);
  });
});

describe('dokununca aç (tap-expand)', () => {
  it('kesik metin açılır, tekrar dokununca ve başka yere dokununca kapanır', () => {
    expect(nextExpanded<string>(null, 'a', true)).toBe('a');
    expect(nextExpanded<string>('a', 'a', true)).toBeNull();
    expect(nextExpanded<string>('a', 'b', true)).toBe('b');
    expect(nextExpanded<string>('a', null, false)).toBeNull();
    expect(nextExpanded<string>(null, 'a', false)).toBeNull();
  });
  it('kesilme tespiti', () => {
    expect(isClipped({ scrollHeight: 40, clientHeight: 20, scrollWidth: 10, clientWidth: 10 })).toBe(true);
    expect(isClipped({ scrollHeight: 20, clientHeight: 20, scrollWidth: 50, clientWidth: 40 })).toBe(true);
    expect(isClipped({ scrollHeight: 20, clientHeight: 20, scrollWidth: 40, clientWidth: 40 })).toBe(false);
  });
});
