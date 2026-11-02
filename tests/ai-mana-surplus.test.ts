import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice } from '../src/engine';
import { rangeOn } from './range-helpers';

/** Dolu mana eğilimi (Ömer 2026-11-01): mana boşa gidiyorsa YZ manalı skille daha kolay yönelir; oyun kuralı değil. */
const F = content.formulas;
const L = F.formation.lanes;
const BACK = (F.formation.rows - 1) * L;
const cells = (map: Record<number, string>) => Array.from({ length: F.formation.rows * L }, (_, i) => map[i] ?? '');

function candidates(mpRatio: number) {
  const b = new Battle(rangeOn(content.battleSetup('random-battle', 1, 'test', { party: cells({ [BACK]: 'druid' }), enemies: cells({ 0: 'grey_wolf' }) }, false)));
  const w = b.combatants.find((c) => c.side === 'enemy')!;
  w.mp = Math.round(w.maxMp * mpRatio);
  b.debugClearCooldowns();
  const list = explainChoice(b, w.uid, content.aiConfig)?.candidates ?? [];
  const find = (skill: string) => list.find((c) => c.skill === skill);
  return { rend: find('rend'), bite: find('bite'), rendCost: b.skill('rend', w.uid)!.cost.amount, maxMp: w.maxMp };
}

describe('dolu mana eğilimi', () => {
  it('mana doluyken manalı skill bedelini geri alır ve değer kazanır; bedelsiz skill kazanmaz', () => {
    const { rend, bite } = candidates(1);
    expect(rend?.terms?.manaSurplus ?? 0).toBeGreaterThan(0);
    expect(bite?.terms?.manaSurplus).toBeUndefined();
  });

  it('eğilim mana azaldıkça küçülür, eşiğin altında hiç yoktur', () => {
    expect(candidates(1).rend?.terms?.manaSurplus ?? 0).toBeGreaterThan(candidates(0.7).rend?.terms?.manaSurplus ?? 0);
    const low = candidates(0.3);
    expect(low.rendCost).toBeLessThan(low.maxMp * 0.3);
    expect(low.rend?.terms?.manaSurplus).toBeUndefined();
  });

  it('kahraman sınıflarında eğilim yoktur', () => {
    const b = new Battle(rangeOn(content.battleSetup('random-battle', 1, 'test', { party: cells({ [BACK]: 'hexer' }), enemies: cells({ 0: 'druid' }) }, false)));
    b.debugClearCooldowns();
    for (const c of b.combatants) {
      const list = explainChoice(b, c.uid, content.aiConfig)?.candidates ?? [];
      expect(list.length).toBeGreaterThan(0);
      expect(list.every((o) => o.terms?.manaSurplus === undefined)).toBe(true);
    }
  });
});
