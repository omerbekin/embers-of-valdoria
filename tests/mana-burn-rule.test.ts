import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type Combatant, type Teams } from '../src/engine';
import { capBurn, castBurnAmount, groundBurnAmount } from '../src/engine/mana-burn';

// Tek mana yakma kuralı (Ömer 2026-10-31): skill, Spell Ward, Hall of Silence ve Branded bedel yakımı aynı yoldan: mevcut MP ile sınırlı, her zaman `manaBurn` olayı
// ("-N MP" yazısı), Branded hedefte aynı hasar. Ley Brand yakımı azaldı: castBurnPct 0,75 -> 0,5, threadBurnMult 2 -> 1,5; alan aynı.

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, mode: 'test' | 'turns' = 'test', seed = 11): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: {}, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
const P = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party')!;
const E = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
const burns = (b: Battle, from = 0) => b.log.slice(from).filter((e): e is Extract<BattleEvent, { type: 'manaBurn' }> => e.type === 'manaBurn');

/** Hedefin turu başlayana kadar ilerletir (zemin tur başı işlemi çalışır). */
function untilTurnOf(b: Battle, c: Combatant): void {
  b.skipTurn(); // hedef zaten sıradaysa onun tur başı geçmiştir: bir sonraki turu beklenir
  for (let i = 0; i < 40 && b.currentUid !== c.uid; i++) b.skipTurn();
  expect(b.currentUid).toBe(c.uid);
}

describe('ortak kural: miktar', () => {
  it('mevcut MP ile sınırlı, yuvarlanır, negatif olmaz', () => {
    expect(capBurn(5, 8)).toBe(5);
    expect(capBurn(20, 8.4)).toBe(8);
    expect(capBurn(0, 8)).toBe(0);
    expect(capBurn(5, -3)).toBe(0);
    expect(castBurnAmount(18, 0.5, 100)).toBe(9);
    expect(castBurnAmount(18, 0.5, 4)).toBe(4);
    expect(groundBurnAmount({ mp: 40, maxMp: 40 }, 0.15)).toBe(6);
    expect(groundBurnAmount({ mp: 2, maxMp: 40 }, 0.15)).toBe(2);
    expect(groundBurnAmount({ mp: 0, maxMp: 0 }, 0.15)).toBe(0);
  });
});

describe('ortak kural: her kaynak aynı olayı verir', () => {
  it('Hall of Silence artık görünür yakım: manaBurn olayı, resource değil', () => {
    const b = make({ 0: 'mage' }, { 0: 'warrior' }, 'turns');
    const foe = E(b);
    expect(b.debugPlaceGround(P(b).uid, 'hall_of_silence', 'enemy', [foe.slot], 9, 0.5).ok).toBe(true);
    foe.mp = foe.maxMp;
    const from = b.log.length;
    untilTurnOf(b, foe);
    const pct = content.grounds.hall_of_silence!.manaBurnPct!;
    const mb = burns(b, from).find((e) => e.target === foe.uid);
    expect(mb, 'manaBurn olayı').toBeDefined();
    expect(mb!.amount).toBe(groundBurnAmount({ mp: foe.maxMp, maxMp: foe.maxMp }, pct));
    expect(mb!.cause).toBe('hall_of_silence');
    expect(b.log.slice(from).some((e) => e.type === 'resource' && e.actor === foe.uid)).toBe(false);
  });

  it('MP havuzu olmayana hiçbir kaynak yakmaz', () => {
    const b = make({ 0: 'mage' }, { 0: 'risen_skeleton' }, 'turns');
    const foe = E(b);
    expect(foe.maxMp).toBe(0);
    expect(b.debugPlaceGround(P(b).uid, 'hall_of_silence', 'enemy', [foe.slot], 9, 0.5).ok).toBe(true);
    untilTurnOf(b, foe);
    expect(burns(b)).toHaveLength(0);
  });
  // Ley Brand (Branded) yakım testleri: kural kitten çıktı (Redtithe, 2026-11-17), motor kodu atıl
});
