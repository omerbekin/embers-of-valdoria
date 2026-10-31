import { describe, expect, it } from 'vitest';
import { textAtRank } from '../src/progression/skill-tree-text';
import { TREES } from '../src/progression/skill-tree-data';

describe('textAtRank (Sheet > Active nodes ipucu)', () => {
  it('per rank sayısını rank ile çarpar, eşik sayılarına dokunmaz', () => {
    expect(textAtRank('While below 50% HP, you take 4% less damage per rank.', 3)).toBe('While below 50% HP, you take 12% less damage.');
    expect(textAtRank('Your Berserker bonus is 2% higher per rank for each ally below 50% HP.', 2)).toBe('Your Berserker bonus is 4% higher for each ally below 50% HP.');
    expect(textAtRank('heal 1% of your max HP per rank.', 5)).toBe('heal 5% of your max HP.');
  });
  it('tek rank\'lı metinde null döner', () => {
    expect(textAtRank('The first enemy to drop you below 50% HP is Stunned for 1 turn.', 1)).toBeNull();
  });
  it('yuvarlama en çok 3 ondalık', () => {
    expect(textAtRank('0.025 more per rank', 3)).toBe('0.075 more');
  });
  it('tüm ağaçlarda per rank metni sayıyla çözülür (rank 1 ve max)', () => {
    for (const t of Object.values(TREES))
      for (const [k, n] of Object.entries(t.nodes)) if (/per rank/.test(n.text)) {
        const r = textAtRank(n.text, 2);
        expect(r, `${t.class} ${k}`).not.toBeNull();
        expect(r).not.toMatch(/per rank/);
      }
  });
});
