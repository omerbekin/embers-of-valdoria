import { describe, expect, it } from 'vitest';
import { compactRow, foldSkillRows } from '../src/ui/skill-tip-rule';
import { MORE_MARK, richSegs } from '../src/ui/band-rich';

const judgment = [
  'Damage 30% INT (8) (on the enemy side: enemies)',
  'Heal 30% INT (8) (on your side: allies)',
  'Leaves Holy Fire on the area (enemy side only) for 2 turns: enemies standing there are Searing while inside, taking 38% INT (10) damage at the start of each of their turns',
  'Leaves Holy Ground on the area (your side only) for 2 turns: allies standing there are Hallowed while inside, 38% INT (10) healing at the start of each of their turns',
  'Can also be cast on an empty cell on your side: it then only leaves the ground there',
  'Ground reactions: Purified (with Poison), Fed (with Poison)',
  'Ground reactions: Purified (with Poison), Holy water (with Flooded)',
].map((text) => ({ text }));

describe('skill tip rule (no More)', () => {
  it('Judgment: equal values merge, grounds are one line each, rules + merged reactions follow, no More row', () => {
    const rows = foldSkillRows(judgment);
    expect(rows.some((r) => r.text === MORE_MARK)).toBe(false);
    const t = rows.map((r) => r.text);
    expect(t.slice(0, 3)).toEqual([
      '[[k|Damage / Heal]] 30% INT (8) [[d|·]] [[d|enemies / allies]]',
      '[[k|Holy Fire]] [[d|(enemy side)]] [[d|·]] 2 turns [[d|·]] 38% INT (10) per turn',
      '[[k|Holy Ground]] [[d|(your side)]] [[d|·]] 2 turns [[d|·]] 38% INT (10) per turn',
    ]);
    expect(t).toHaveLength(5);
    expect(t[4]).toBe('Ground reactions: Purified (with Poison), Fed (with Poison), Holy water (with Flooded)');
  });
  it('long rows lose filler (rounded up) only; rule notes and numbers stay', () => {
    const row = { text: 'An enemy with mana pays 50% more MP for its skills (rounded up) and loses extra MP equal to 50% of the MP it paid (or all it has left); it cannot miss or crit (ignores armor)' };
    const out = compactRow(row).text;
    expect(out).not.toContain('(rounded up)');
    expect(out).toContain('(or all it has left)');
    expect(out).toContain('cannot miss or crit');
    expect(out.match(/\d+%/g)).toEqual(['50%', '50%']);
    expect(compactRow({ text: 'Damage 38% STR (10) x2' }).text).toBe('Damage 38% STR (10) x2');
  });
  it('Fist Crush: both lines show, nothing hidden', () => {
    const rows = foldSkillRows([{ text: 'Damage 71% STR + 5% Armor (14)' }, { text: 'Uses your current armor, aura bonus included' }]);
    expect(rows.map((r) => r.text)).toEqual(['Damage 71% STR + 5% Armor (14)', 'Uses your current armor, aura bonus included']);
  });
  it('simple skill stays untouched, no More', () => {
    expect(foldSkillRows([{ text: 'Damage 38% STR (10) x2' }]).map((r) => r.text)).toEqual(['[[k|Damage]] 38% STR (10) x2']);
  });
  it('markup splits into key / dim / number parts', () => {
    expect(richSegs('[[k|Holy Fire]] [[d|(enemy side)]] [[d|·]] 2 turns').map((s) => s.kind ?? '-')).toEqual(['k', '-', 'd', '-', 'd', '-', 'n', '-']);
  });
});
