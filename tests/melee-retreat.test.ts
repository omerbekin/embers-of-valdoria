import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import { rangeOn } from './range-helpers';

/** Yakın dövüşçü YZ'si (Ömer 2026-11-01): kendinden başka vurabilen dost yoksa geri çekilmez, geride kaldıysa menzile döner (Skip atıp beklemez). */
const F = content.formulas;
const L = F.formation.lanes;
const BACK = (F.formation.rows - 1) * L;
const cells = (map: Record<number, string>) => Array.from({ length: F.formation.rows * L }, (_, i) => map[i] ?? '');

function decide(enemies: Record<number, string>, slot: number, hp: number) {
  const b = new Battle(rangeOn(content.battleSetup('random-battle', 1, 'test', { party: cells({ [BACK]: 'druid' }), enemies: cells(enemies) }, false)));
  const w = b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
  w.maxHp = 24;
  w.hp = 24 * hp;
  b.debugClearCooldowns();
  return { b, ch: chooseAction(b, w.uid, content.aiConfig) };
}

describe('yakın dövüşçü: tek vuran geri çekilmez', () => {
  it('önde tek kalan yaralı kurt saldırır', () => {
    for (const hp of [0.6, 0.3, 0.15]) expect(decide({ 0: 'grey_wolf' }, 0, hp).ch?.skillId).not.toBe('move_tile');
  });

  it('diğer kurt da geride ve vuramıyorsa yaralı kurt daha geri gitmez, öne gelir', () => {
    for (const hp of [0.3, 0.15]) {
      const { b, ch } = decide({ [L]: 'grey_wolf', [L + 1]: 'grey_wolf' }, L, hp);
      expect(ch?.skillId).toBe('move_tile');
      expect(b.rowOf(ch!.slot!)).toBe(0);
    }
  });

  it('geride tek kalan yaralı kurt menzile döner (Skip atmaz)', () => {
    for (const from of [L, 2 * L])
      for (const hp of [0.3, 0.15]) {
        const { b, ch } = decide({ [from]: 'grey_wolf' }, from, hp);
        expect(ch?.skillId).toBe('move_tile');
        expect(b.rowOf(ch!.slot!)).toBe(0);
      }
  });

  it('önde vuran başka dost varken eski değerlendirme sürer: yaralı kurt geri çekilebilir', () => {
    const { b, ch } = decide({ 0: 'grey_wolf', 1: 'grey_wolf' }, 0, 0.3);
    expect(ch?.skillId).toBe('move_tile');
    expect(b.rowOf(ch!.slot!)).toBeGreaterThan(0);
  });
});
