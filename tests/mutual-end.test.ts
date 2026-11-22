import { describe, expect, it } from 'vitest';
import { Battle, content } from '../src/engine';
import type { BattleEvent, BattleMode, Teams } from '../src/engine';
import { createMatchBattle } from '../src/net/lockstep';
import { resultInfo } from '../src/game/mp-client';

/**
 * Aynı anda bitiş (Ömer 2026-11-21, form r39): iki taraf aynı anda biterse tek oyunculu savaşta (sefer, Endless, Quick Battle YZ'ye karşı) oyuncu
 * kaybeder; çok oyunculu maçta (BattleSetup.drawOnMutualEnd, net createMatchBattle) beraberlik ('draw'). Dalgalı savaşta sırada dalga varken
 * düşman kazanır (eskisi gibi). Tek tarafın bitişi değişmedi.
 */
const MODES: BattleMode[] = ['turns', 'test'];
const cells = (map: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => map[i] ?? '');
const BASE: Teams = { party: cells({ 0: 'warrior', 1: 'defender' }), enemies: cells({ 0: 'warrior', 2: 'cutthroat' }) };

const make = (mode: BattleMode, teams: Teams = BASE, draw = false): Battle => {
  const setup = content.battleSetup('random-battle', 7, mode, teams, false);
  return new Battle(draw ? { ...setup, drawOnMutualEnd: true } : setup);
};
const alive = (b: Battle, side: 'party' | 'enemy') => b.combatants.filter((c) => c.side === side && c.hp > 0 && !c.inert);
/** Önce bir tarafı savaş sonu denetimi OLMADAN öldürür, sonra öbür tarafın sonuncusunu denetimle: iki taraf aynı anda biter. */
function mutualWipe(b: Battle): void {
  for (const c of alive(b, 'party')) b.debugKill(c.uid, false);
  const foes = alive(b, 'enemy');
  foes.forEach((c, i) => b.debugKill(c.uid, i === foes.length - 1));
}
const ends = (b: Battle) => b.log.filter((e): e is Extract<BattleEvent, { type: 'battleEnd' }> => e.type === 'battleEnd');

describe('aynı anda bitiş', () => {
  for (const mode of MODES) {
    it(`${mode}: tek oyunculu savaşta iki taraf aynı anda biterse oyuncu kaybeder (battleEnd enemy)`, () => {
      const b = make(mode);
      mutualWipe(b);
      expect(b.winner).toBe('enemy');
      expect(ends(b).map((e) => e.winner)).toEqual(['enemy']);
    });

    it(`${mode}: drawOnMutualEnd (çok oyunculu) iki taraf aynı anda biterse beraberlik`, () => {
      const b = make(mode, BASE, true);
      mutualWipe(b);
      expect(b.winner).toBe('draw');
      expect(ends(b).map((e) => e.winner)).toEqual(['draw']);
      expect(b.applyChoice(b.combatants[0]!.uid, null).ok).toBe(false); // bitti
    });

    it(`${mode}: yalnız bir taraf biterse eski kural (beraberlik bayrağı da değiştirmez)`, () => {
      for (const draw of [false, true]) {
        const a = make(mode, BASE, draw);
        for (const c of alive(a, 'enemy')) a.debugKill(c.uid);
        expect(a.winner).toBe('party');
        const z = make(mode, BASE, draw);
        for (const c of alive(z, 'party')) z.debugKill(c.uid);
        expect(z.winner).toBe('enemy');
      }
    });

    it(`${mode}: dalgalı savaşta sırada dalga varken aynı anda bitiş = düşman kazanır (bayrak da değiştirmez); son dalgada yeni kural`, () => {
      const waves = { ...BASE, waves: [{ enemies: cells({ 1: 'archer' }) }] };
      for (const draw of [false, true]) {
        const b = make(mode, waves, draw);
        mutualWipe(b);
        expect(b.winner).toBe('enemy');
        expect(b.waveIndex).toBe(0);
        const last = make(mode, waves, draw);
        for (const c of alive(last, 'enemy')) last.debugKill(c.uid); // 1. dalga biter, 2. dalga gelir
        expect(last.winner).toBeNull();
        expect(last.waveIndex).toBe(1);
        mutualWipe(last);
        expect(last.winner).toBe(draw ? 'draw' : 'enemy');
      }
    });
  }

  it('çok oyunculu maç kurulumu (createMatchBattle) beraberlik verir; sonuç metni DRAW, kazanan yok', () => {
    const b = createMatchBattle({ match: 'm1', seed: 99, host: cells({ 0: 'warrior', 1: 'mage' }), guest: cells({ 0: 'archer', 1: 'paladin' }) });
    mutualWipe(b);
    expect(b.winner).toBe('draw');
    for (const side of ['party', 'enemy'] as const) {
      const info = resultInfo({ winner: null, reason: 'draw' }, side);
      expect(info).toMatchObject({ victory: false, draw: true, title: 'DRAW' });
    }
  });
});
