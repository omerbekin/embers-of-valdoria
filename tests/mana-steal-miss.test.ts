import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type Teams } from '../src/engine';
import { describeSkill } from '../src/engine/skill-info';

// Ömer 2026-10-11: Anti-Mage vuruşa bağlı mana çalma / yakma (Mana Steal) iska ya da kaçınmada İŞLEMEZ; alan skill'inde her hedef ayrı.
// Hasarsız yakım (Drain Field) isabet zarı atmaz, aynen işler.

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (seed = 5): Battle => {
  const teams: Teams = { party: cells({ 0: 'antimage' }), enemies: cells({ 0: 'mage', 1: 'druid', 2: 'paladin' }) };
  return new Battle(content.battleSetup('random-battle', seed, 'test', teams, false));
};
const burns = (b: Battle) => b.log.filter((e): e is Extract<BattleEvent, { type: 'manaBurn' }> => e.type === 'manaBurn');

describe('Mana Steal yalnızca isabette', () => {
  for (const mode of ['dodge', 'miss'] as const) {
    it(`${mode}: MP çalınmaz, Anti-Mage MP kazanmaz`, () => {
      const b = make();
      if (mode === 'dodge') b.debug.dodge = 'always';
      else b.debug.miss = 'always';
      const t = b.combatants.find((c) => c.uid === 'enemy-0')!;
      const am = b.combatants.find((c) => c.uid === 'party-0')!;
      am.mp = 0;
      const mp = t.mp;
      expect(b.useSkill('party-0', 'mana_burn', 'enemy-0').ok).toBe(true);
      expect(t.mp).toBe(mp);
      expect(am.mp).toBe(0);
      expect(burns(b)).toHaveLength(0);
    });
  }

  it('isabette çalar (davranış aynı)', () => {
    const b = make();
    b.debug.dodge = 'never';
    const t = b.combatants.find((c) => c.uid === 'enemy-0')!;
    const mp = t.mp;
    b.useSkill('party-0', 'mana_burn', 'enemy-0');
    expect(t.mp).toBeLessThan(mp);
    expect(burns(b)).toHaveLength(1);
  });

  it('Drain Field (hasarsız yakım) iska zorlamasında da yakar; metin isabet şartını yalnızca vuruşlu skill\'de yazar', () => {
    const b = make();
    b.debug.miss = 'always';
    const anchor = b.shapeAnchors('party-0', 'drain_field')[0]!;
    b.useSkill('party-0', 'drain_field', undefined, anchor);
    expect(burns(b).length).toBeGreaterThan(0);
    const st = content.classes.antimage!.stats;
    expect(describeSkill(content.skills.mana_burn!, st, content.formulas).lines.join(' ')).toMatch(/on hit \(none if the attack misses\)/);
    expect(describeSkill(content.skills.drain_field!, st, content.formulas).lines.join(' ')).not.toMatch(/on hit/);
  });
});
