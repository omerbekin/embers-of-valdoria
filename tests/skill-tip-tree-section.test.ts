import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { TREE_SECTION, describeSkill } from '../src/engine/skill-info';
import { heroStats } from '../src/progression';
import { skillTip } from '../src/ui/gear-skills';

// Ağaçtan gelen satırlar skill ipucunda ayrı bölümde (Ömer 2026-10-31): skill'in kendi satırları aynı kalır, ağacın eklediği etkiler (treeNode) altta.
const f = content.formulas;
const defs = { statuses: content.statuses, grounds: content.grounds };
const hero = { id: 'h', class: 'archer', level: 1, equipment: {} as never };
const st = heroStats(hero)!;

describe('skill tip: From Skill Tree section', () => {
  const base = content.skills['quick_shot']!;
  const withTree = {
    ...base,
    effects: [...base.effects, { type: 'status', status: 'slow', turns: 2, treeNode: 'archer:0.n1' } as (typeof base.effects)[number]],
  };
  it('own lines stay identical, tree-added effect goes to treeLines', () => {
    const own = describeSkill(base, st, f, content.summons, defs);
    const mixed = describeSkill(withTree, st, f, content.summons, defs);
    expect(mixed.lines).toEqual(own.lines);
    expect(mixed.kinds).toEqual(own.kinds);
    expect(mixed.treeLines?.length).toBe(1);
    expect(mixed.treeLines![0]).toMatch(/Slow/);
  });
  it('no tree node, no section', () => {
    expect(describeSkill(base, st, f, content.summons, defs).treeLines).toBeUndefined();
    expect(skillTip(base, st).rows.some((r) => r.section)).toBe(false);
  });
  it('shared Gear tip appends the section after the own rows', () => {
    const rows = skillTip(withTree, st).rows;
    const i = rows.findIndex((r) => r.section);
    expect(i).toBeGreaterThan(0);
    expect(rows[i]!.text).toBe(TREE_SECTION);
    expect(rows.slice(i + 1).length).toBe(1);
  });
});
