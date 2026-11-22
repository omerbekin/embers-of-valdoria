import { describe, expect, it } from 'vitest';
import { diceRollsOf, diceTier, faceOf, streakChips, streakFull } from '../src/game/dice-feel';
import type { BattleEvent } from '../src/engine';

describe('Gambler zar / seri gorunumu (saf mantik)', () => {
  it('toplama gore 3 kademe', () => {
    expect([2, 5].map(diceTier)).toEqual(['low', 'low']);
    expect([6, 7, 8].map(diceTier)).toEqual(['mid', 'mid', 'mid']);
    expect([9, 12].map(diceTier)).toEqual(['high', 'high']);
  });
  it('dice olaylarini atis sirasiyla okur, baska birimi eler', () => {
    const ev = [
      { type: 'dice', actor: 'a', target: 'x', values: [3, 3], double: true },
      { type: 'dice', actor: 'a', target: 'x', values: [1, 6], double: false },
      { type: 'dice', actor: 'b', target: 'x', values: [2, 2], double: true },
    ] as unknown as BattleEvent[];
    expect(diceRollsOf(ev, 'a')).toEqual([{ values: [3, 3], double: true }, { values: [1, 6], double: false }]);
    expect(diceRollsOf(undefined)).toEqual([]);
  });
  it('yuz 1-6 araligina sikisir', () => {
    expect([0, 3, 9].map(faceOf)).toEqual([1, 3, 6]);
  });
  it('seri fisleri ve dolu isareti', () => {
    expect(streakChips(2, 3)).toEqual([true, true, false]);
    expect(streakChips(0, 3)).toEqual([false, false, false]);
    expect(streakFull(3, 3)).toBe(true);
    expect(streakFull(2, 3)).toBe(false);
    expect(streakFull(undefined, 3)).toBe(false);
  });
});
