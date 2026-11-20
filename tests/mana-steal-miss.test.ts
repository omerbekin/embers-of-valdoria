import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type Teams } from '../src/engine';
import { describeSkill } from '../src/engine/skill-info';

// Ömer 2026-10-11: vuruşa bağlı mana yakma (eski Mana Steal, 2026-11-17'den beri Redtithe Tithe Cut) iska ya da kaçınmada İŞLEMEZ; alan skill'inde
// her hedef ayrı. Redtithe: iskada kan da gelmez (ne MP kanı ne isabet kanı).

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (seed = 5): Battle => {
  const teams: Teams = { party: cells({ 0: 'antimage' }), enemies: cells({ 0: 'mage', 1: 'druid', 2: 'paladin' }) };
  return new Battle(content.battleSetup('random-battle', seed, 'test', teams, false));
};
const burns = (b: Battle) => b.log.filter((e): e is Extract<BattleEvent, { type: 'manaBurn' }> => e.type === 'manaBurn');

describe('Tithe Cut yalnızca isabette', () => {
  for (const mode of ['dodge', 'miss'] as const) {
    it(`${mode}: MP sökülmez, Redtithe kan kazanmaz`, () => {
      const b = make();
      if (mode === 'dodge') b.debug.dodge = 'always';
      else b.debug.miss = 'always';
      const t = b.combatants.find((c) => c.uid === 'enemy-0')!;
      const rt = b.combatants.find((c) => c.uid === 'party-0')!;
      const mp = t.mp;
      const blood = rt.blood;
      expect(b.useSkill('party-0', 'mana_burn', 'enemy-0').ok).toBe(true);
      expect(t.mp).toBe(mp);
      expect(rt.blood).toBe(blood);
      expect(b.log.some((e) => e.type === 'blood')).toBe(false);
      expect(burns(b)).toHaveLength(0);
    });
  }

  it('isabette söker ve kan verir', () => {
    const b = make();
    b.debug.dodge = 'never';
    const t = b.combatants.find((c) => c.uid === 'enemy-0')!;
    const mp = t.mp;
    b.useSkill('party-0', 'mana_burn', 'enemy-0');
    expect(t.mp).toBeLessThan(mp);
    expect(burns(b)).toHaveLength(1);
    expect(b.log.some((e) => e.type === 'blood' && e.delta > 0)).toBe(true);
  });

  it("metin isabet şartını vuruşlu skill'de (Tithe Cut) yazar", () => {
    const st = content.classes.antimage!.stats;
    expect(describeSkill(content.skills.mana_burn!, st, content.formulas).lines.join(' ')).toMatch(/on hit \(none if the attack misses\)/);
  });
});
