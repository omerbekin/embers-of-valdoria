// Ekonomi ekranlarinin saf gorunum verisi (src/ui/econ-model.ts): Inn iyilesme gunu, Combine ihtimal dilimleri, metin doldurma.
import { describe, expect, it } from 'vitest';
import { CAMP_CARDS, fillText, healLine, innHealDays, oddsSlices } from '../src/ui/econ-model';

const rate = { healPerDay: 0.5, woundsPerDay: 1 };

describe('innHealDays', () => {
  it('can ve yara iyilesmesinden uzun olani sayar', () => {
    expect(innHealDays({ hpRatio: 1 }, rate)).toBe(0);
    expect(innHealDays({ hpRatio: 0.5 }, rate)).toBe(1);
    expect(innHealDays({ hpRatio: 0.4 }, rate)).toBe(2);
    expect(innHealDays({ hpRatio: 1, wounds: 2 }, rate)).toBe(2);
    expect(innHealDays({ hpRatio: 0.4, wounds: 3 }, rate)).toBe(3);
  });
  it('metin: tek / cok gun, iyi', () => {
    expect(healLine(0)).toBe('Fully healed');
    expect(healLine(1)).toBe('Fully healed in 1 day');
    expect(healLine(3)).toBe('Fully healed in 3 days');
  });
});

describe('oddsSlices', () => {
  it('kesir yoksa tek dilim, varsa iki dilim ve toplam 100', () => {
    expect(oddsSlices('rare', 'rare', 0).map((s) => s.pct)).toEqual([100]);
    const two = oddsSlices('uncommon', 'rare', 0.67);
    expect(two.map((s) => s.rarity)).toEqual(['uncommon', 'rare']);
    expect(two.reduce((a, s) => a + s.pct, 0)).toBe(100);
    expect(two[1]!.pct).toBe(67);
  });
});

describe('kamp kartlari', () => {
  it('sira Rest / Tend / Sharpen / Train, Rest hedefsiz', () => {
    expect(CAMP_CARDS.map((c) => c.kind)).toEqual(['rest', 'tend', 'sharpen', 'train']);
    expect(CAMP_CARDS[0]!.target).toBe('none');
  });
  it('fillText yer tutucu doldurur', () => {
    expect(fillText('Rest: {pct}% {x}', { pct: 50 })).toBe('Rest: 50% {x}');
  });
});
