import { describe, expect, it } from 'vitest';
import { perRankTotal } from '../src/ui/tree-tab-model';

describe('perRankTotal', () => {
  it('multiplies the per-rank number, keeps thresholds', () => {
    expect(perRankTotal('While below 50% HP, you take 4% less damage per rank.', 3)).toBe('While below 50% HP, you take 12% less damage.');
    expect(perRankTotal('Your Berserker bonus is 2% higher per rank for each ally below 50% HP.', 2)).toBe('Your Berserker bonus is 4% higher for each ally below 50% HP.');
  });
  it('null without per rank', () => {
    expect(perRankTotal('A single hit deals 25% less damage.', 2)).toBeNull();
  });
});
