import { describe, expect, it } from 'vitest';
import { diffLines, diffParts, firstChange, noStatChange, shortReason } from '../src/ui/camp-sharpen-diff';

describe('camp sharpen diff', () => {
  it('degisen satirlari isaretler, ilk degisikligi verir', () => {
    const l = diffLines(['Power 42', '4.5% more Holy damage', '4.5% more Lightning damage'], ['Power 48', '4.5% more Holy damage', '5% more Lightning damage']);
    expect(l.map((x) => x.changed)).toEqual([true, false, true]);
    expect(firstChange(l)?.before).toBe('Power 42');
    expect(noStatChange(l)).toBe(false);
  });
  it('degisiklik yoksa null ve noStatChange', () => {
    const l = diffLines(['+4 Armor'], ['+4 Armor']);
    expect(firstChange(l)).toBeNull();
    expect(noStatChange(l)).toBe(true);
  });
  it('sonraki yoksa (engelli) degisiklik sayilmaz', () => {
    const l = diffLines(['+4 Armor'], null);
    expect(l[0]).toEqual({ before: '+4 Armor', after: null, changed: false });
    expect(noStatChange(l)).toBe(false);
  });
  it('sayi parcalari eski degeri tasir', () => {
    expect(diffParts('4.5% more Holy damage', '5% more Holy damage')).toEqual([{ text: '5', from: '4.5' }, { text: '% more Holy damage' }]);
    expect(diffParts('+4 Armor', '+4 Armor')).toEqual([{ text: '+4 Armor' }]);
  });
  it('yazi sablonu degisirse tek parca', () => {
    expect(diffParts('Immune for 2 turns', 'Immune for 2 rounds')).toEqual([{ text: 'Immune for 2 rounds', from: 'Immune for 2 turns' }]);
  });
  it('engel nedenini oyunun metninden kisaltir', () => {
    expect(shortReason('Its wearer needs Level 4')).toBe('Needs Lv 4');
    expect(shortReason("Already at this region's best (item level 10)")).toBe('At region cap');
    expect(shortReason('Something else')).toBe('Something else');
  });
});
