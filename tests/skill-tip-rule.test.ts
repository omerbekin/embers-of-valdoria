import { describe, expect, it } from 'vitest';
import { foldSkillRows } from '../src/ui/skill-tip-rule';
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

describe('skill tip rule A', () => {
  it('Judgment: equal values merge, grounds are one line each, full text behind More', () => {
    const rows = foldSkillRows(judgment);
    const i = rows.findIndex((r) => r.text === MORE_MARK);
    expect(rows.slice(0, i).map((r) => r.text)).toEqual([
      '[[k|Damage / Heal]] 30% INT (8) [[d|·]] [[d|enemies / allies]]',
      '[[k|Holy Fire]] [[d|(enemy side)]] [[d|·]] 2 turns [[d|·]] 38% INT (10) per turn',
      '[[k|Holy Ground]] [[d|(your side)]] [[d|·]] 2 turns [[d|·]] 38% INT (10) per turn',
    ]);
    const full = rows.slice(i + 1).map((r) => r.text);
    expect(full).toHaveLength(6);
    expect(full[5]).toBe('Ground reactions: Purified (with Poison), Fed (with Poison), Holy water (with Flooded)');
  });
  it('Ley Brand: first line + the two short numeric rule lines (wording of mockup B)', () => {
    const lines = [
      'Brands every enemy in the area for 3 turns (Branded); it cannot miss',
      'An enemy with no mana gains tainted mana equal to 20% of its max HP, starting full; it cannot spend it, and it is gone when the Brand ends',
      'An enemy with mana pays 50% more MP for its skills (rounded up)',
      'Mana Steal and Void Strike deal 40% more damage to Branded enemies',
    ].map((text) => ({ text }));
    const rows = foldSkillRows(lines);
    const i = rows.findIndex((r) => r.text === MORE_MARK);
    expect(rows.slice(0, i).map((r) => r.text)).toEqual([lines[0]!.text, lines[2]!.text, lines[3]!.text]);
  });
  it('simple skill stays untouched, no More', () => {
    expect(foldSkillRows([{ text: 'Damage 38% STR (10) x2' }]).map((r) => r.text)).toEqual(['[[k|Damage]] 38% STR (10) x2']);
  });
  it('markup splits into key / dim / number parts', () => {
    expect(richSegs('[[k|Holy Fire]] [[d|(enemy side)]] [[d|·]] 2 turns').map((s) => s.kind ?? '-')).toEqual(['k', '-', 'd', '-', 'd', '-', 'n', '-']);
  });
});
