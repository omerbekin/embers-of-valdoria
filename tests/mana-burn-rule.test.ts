import { describe, expect, it } from 'vitest';
import { Battle, content, previewForTargets, skillCostAmount, type BattleEvent, type Combatant, type SkillEffect, type Teams } from '../src/engine';
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
const BRAND = content.skills.drain_field!.effects.find((e) => e.type === 'brand') as Extract<SkillEffect, { type: 'brand' }>;
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

  it('Hall of Silence Branded hedefte Mana Steal ile aynı hasarı verir (burnDamagePct)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' }, 'turns');
    const me = P(b);
    const foe = E(b);
    foe.hp = foe.maxHp = 50000;
    expect(b.debugPlaceGround(me.uid, 'hall_of_silence', 'enemy', [foe.slot], 9, 0.5).ok).toBe(true);
    foe.statuses.push({ kind: 'branded', turns: 9, source: me.uid, brand: { burnPct: BRAND.burnDamagePct, costMult: BRAND.costMult, explodePct: BRAND.explodePct, element: 'arcane', pool: 0 } } as never);
    const from = b.log.length;
    untilTurnOf(b, foe);
    const mb = burns(b, from).find((e) => e.target === foe.uid)!;
    expect(b.log.slice(from).some((e) => e.type === 'damage' && e.target === foe.uid && e.status === 'branded')).toBe(true);
    expect(mb.source).toBe(me.uid);
  });

  it('MP havuzu olmayana hiçbir kaynak yakmaz', () => {
    const b = make({ 0: 'mage' }, { 0: 'risen_skeleton' }, 'turns');
    const foe = E(b);
    expect(foe.maxMp).toBe(0);
    expect(b.debugPlaceGround(P(b).uid, 'hall_of_silence', 'enemy', [foe.slot], 9, 0.5).ok).toBe(true);
    untilTurnOf(b, foe);
    expect(burns(b)).toHaveLength(0);
  });

  it('Branded bedel yakımı: olay + "Brand Burn" yazısı, önizleme gerçekle aynı', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    const foe = E(b);
    me.mp = me.maxMp;
    expect(b.useSkill(me.uid, 'drain_field', undefined, foe.slot, 'enemy').ok).toBe(true);
    foe.mp = foe.maxMp;
    foe.cooldowns.fire_bolt = 0;
    const paid = skillCostAmount(b.skill('fire_bolt', foe.uid)!.cost, foe);
    const pv = previewForTargets(b, foe, 'fire_bolt', [me]).find((x) => x.uid === foe.uid);
    const from = b.log.length;
    expect(b.useSkill(foe.uid, 'fire_bolt', me.uid).ok).toBe(true);
    const mb = burns(b, from).find((e) => e.target === foe.uid)!;
    expect(mb.amount).toBe(castBurnAmount(paid, BRAND.castBurnPct!, foe.maxMp - paid));
    expect(pv?.castBurn?.mp).toBe(mb.amount);
    expect(b.log.slice(from).some((e) => e.type === 'passive' && e.name === 'Brand Burn')).toBe(true);
  });
});

describe('Ley Brand yakımı azaldı (Ömer 2026-10-31)', () => {
  it('veri: alan aynı, yakım az; durum yazısı veriyle uyumlu', () => {
    expect(content.skills.drain_field!.area).toMatchObject({ shape: 'rect', rows: 3, cols: 3 });
    expect(BRAND.castBurnPct).toBe(0.5);
    expect(BRAND.threadBurnMult).toBe(1.5);
    expect(content.statuses.ley_thread!.text).toContain(`${Math.round((BRAND.threadBurnMult! - 1) * 100)}% more mana`);
  });
});
