import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { placementHints, placementHintText } from '../src/engine/formation-hints';

const RULES = { exposedFrom: 5, meleeUpTo: 2 };

describe('dizilim ipuçları (formation-hints)', () => {
  it('Warrior 2. sırada: ulaşamıyor, ön sıra önerilir', () => {
    const [w] = placementHints([1, 6], [3, 9], 3, 4, RULES);
    expect(w).toMatchObject({ kind: 'outOfReach', row: 1, maxRow: 0 });
    expect(placementHintText('Warrior', w!)).toContain('front row');
  });

  it('Archer önde, takımda melee var: açıkta ipucu; melee yoksa ipucu yok', () => {
    expect(placementHints([6, 1], [0, 1], 3, 4, RULES)[0]).toMatchObject({ kind: 'exposed', fromRow: 3 });
    expect(placementHints([6, 6], [0, 1], 3, 4, RULES)[0]).toBeUndefined();
  });

  it('uygun dizilim ve menzilsiz birim: ipucu yok', () => {
    expect(placementHints([1, 4, 6, Infinity], [0, 3, 9, 11], 3, 4, RULES)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('boş ön sıralar sayılır: tek Warrior 2. sırada yine ulaşamaz', () => {
    expect(placementHints([1], [4], 3, 4, RULES)[0]?.kind).toBe('outOfReach');
  });

  it('içerikten: Archer önde + Warrior arkada iki ipucu; menzil verisiyle', () => {
    const cells = ['archer', '', '', 'warrior', '', '', '', '', '', '', '', ''];
    const hints = content.placementHintsForCells(cells);
    expect(hints[0]?.kind).toBe('exposed');
    expect(hints[3]?.kind).toBe('outOfReach');
    expect(hints.filter(Boolean)).toHaveLength(2);
  });

  it('YZ dizilimi (Auto arrange) ipucu üretmez', () => {
    for (const team of [
      ['warrior', 'archer', 'mage', 'paladin'],
      ['defender', 'cutthroat', 'druid', 'hexer'],
    ]) {
      const slots = content.defaultSlots(team);
      expect(content.placementHintsFor(team, slots).filter(Boolean)).toEqual([]);
    }
  });
});
