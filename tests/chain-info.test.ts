// Arka arkaya savaş bilgi satırı (Ömer 2026-10-27): arena kalan kademe, dalış derinlik; yalnız bilgi.
import { describe, expect, it } from 'vitest';
import { diveChainLine, pitChainLine } from '../src/campaign/chain-info';
import { CONFIG, getMap } from '../src/campaign/data';

const tiers = (n: number) => Array.from({ length: n }, () => ({}));

describe('chain-info', () => {
  it('metinler veriden', () => {
    for (const k of ['chainPit', 'chainPitLeft', 'chainPitLast', 'chainDive']) expect(CONFIG.texts[k]).toBeTruthy();
  });
  it('arena: başlamadan toplam, koşuda kalan, sonda son kademe', () => {
    expect(pitChainLine({ tiers: tiers(5), wins: null })).toBe('5 fights in a row · no rest between');
    expect(pitChainLine({ tiers: tiers(5), wins: 0 })).toBe('5 fights left · no rest between');
    expect(pitChainLine({ tiers: tiers(5), wins: 2 })).toBe('3 fights left · no rest between');
    expect(pitChainLine({ tiers: tiers(5), wins: 4 })).toBe('Last fight · no rest since the first');
    expect(pitChainLine({ tiers: tiers(5), wins: 5 })).toBeNull();
    expect(pitChainLine({ tiers: tiers(1), wins: null })).toBeNull();
  });
  it('dalış: yalnız 2. derinlikten itibaren', () => {
    expect(diveChainLine(1)).toBeNull();
    expect(diveChainLine(2)).toBe('Depth 2 · no rest since the surface');
    expect(diveChainLine(3)).toBe('Depth 3 · no rest since the surface');
  });
  it('harita verisi yüklenir (gerçek arena kademe sayısı pits.json den)', () => {
    expect(getMap('drowned-reach').nodes.length).toBeGreaterThan(0);
  });
});
