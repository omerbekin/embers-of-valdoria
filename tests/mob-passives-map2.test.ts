import { describe, expect, it } from 'vitest';
import { Battle, content, describePassive } from '../src/engine';
import type { BattleEvent, Combatant, PassiveEffect, Teams } from '../src/engine';

// Harita 2 (The Drowned Reach) mob pasifleri: Boarding, Shell, Slick, Lure (docs/design/campaign/maps-2-3.md 3.3; content-designer 2026-10-25).
// Sayılar veriden okunur (data/mobs).

type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Ev<T> => e.type === type);
const effectOf = <T extends PassiveEffect['type']>(id: string, type: T) => {
  const e = content.mobs[id]!.passive!.effect;
  expect(e.type, id).toBe(type);
  return e as Extract<PassiveEffect, { type: T }>;
};
const cells = (map: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => map[i] ?? '');
const make = (teams: Teams, mode: 'turns' | 'test' = 'test', seed = 1) => new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
/** Her vuruş isabet eder, kritik yok; canlar büyük. */
function sure(b: Battle, hp = 5000): Battle {
  b.debug.crit = 'never';
  for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0 });
  for (const c of b.combatants) c.hp = c.maxHp = hp;
  return b;
}
const unit = (b: Battle, uid: string): Combatant => b.get(uid)!;
const describe2 = (id: string) => describePassive(content.mobs[id]!.passive!, content.mobs[id]!.stats, content.formulas);

describe('Boarding (Corsair Cutlass, Corsair Slinger)', () => {
  it('sonraki dalgayla giren korsan Haste alır; savaş başındaki korsan almaz', () => {
    const e = effectOf('corsair_cutlass', 'boarding');
    expect(effectOf('corsair_slinger', 'boarding')).toEqual(e);
    for (const mode of ['turns', 'test'] as const) {
      const b = make({ party: cells({ 0: 'warrior', 6: 'archer' }), enemies: cells({ 0: 'corsair_cutlass' }), waves: [{ enemies: cells({ 0: 'corsair_cutlass', 6: 'corsair_slinger' }) }] }, mode);
      expect(unit(b, 'enemy-0').statuses.some((s) => s.kind === e.status), mode).toBe(false);
      expect(ofType(b.log, 'passive').some((x) => x.passive === 'boarding'), mode).toBe(false);
      b.debugKill('enemy-0');
      expect(b.waveIndex, mode).toBe(1);
      for (const uid of ['enemy-w2-0', 'enemy-w2-1']) {
        const st = unit(b, uid).statuses.find((s) => s.kind === e.status);
        expect(st, `${mode} ${uid}`).toBeDefined();
        expect(st!.turns).toBe(e.turns);
        expect(ofType(b.log, 'passive').some((x) => x.actor === uid && x.passive === 'boarding'), `${mode} ${uid}`).toBe(true);
      }
      // olay sırası: önce waveStart (birim görünür), sonra pasif ve durum
      const ws = b.log.findIndex((x) => x.type === 'waveStart' && x.index === 1);
      const pv = b.log.findIndex((x) => x.type === 'passive' && x.passive === 'boarding');
      expect(ws).toBeLessThan(pv);
    }
    expect(describe2('corsair_cutlass')).toContain('Haste');
  });
});

describe('Shell (Salt Crab)', () => {
  it('ilk kritiğe kadar zırh x armorMult; kritik kabuğu kırar (pasif olayı bir kez), sonra normal zırh', () => {
    const e = effectOf('salt_crab', 'shell');
    const b = sure(make({ party: cells({ 0: 'warrior' }), enemies: cells({ 0: 'salt_crab' }) }));
    const crab = unit(b, 'enemy-0');
    const base = crab.stats.armor;
    expect(b.effectiveStats(crab).armor).toBeCloseTo(base * e.armorMult, 4);
    // kritik olmayan vuruş kabuğu kırmaz
    b.useSkill('party-0', content.classes.warrior!.skills[0]!, 'enemy-0');
    expect(crab.passiveUsed).toBeFalsy();
    expect(b.effectiveStats(crab).armor).toBeCloseTo(base * e.armorMult, 4);
    // kritik kırar
    b.debug.crit = 'always';
    const n = b.log.length;
    b.useSkill('party-0', content.classes.warrior!.skills[0]!, 'enemy-0');
    expect(crab.passiveUsed).toBe(true);
    expect(ofType(b.log.slice(n), 'passive').filter((x) => x.passive === 'shell').length).toBe(1);
    expect(b.effectiveStats(crab).armor).toBe(base);
    const m = b.log.length;
    b.useSkill('party-0', content.classes.warrior!.skills[0]!, 'enemy-0');
    expect(ofType(b.log.slice(m), 'passive').some((x) => x.passive === 'shell')).toBe(false);
    expect(describe2('salt_crab')).toContain('critical');
  });
});

describe('Slick (Weir Eel)', () => {
  it('Flooded hücrede kaçınma +evasion; kuru hücrede ya da başka zeminde yok', () => {
    const e = effectOf('weir_eel', 'slick');
    expect(e.ground).toBe('flooded');
    expect(content.grounds[e.ground]).toBeDefined();
    const b = make({ party: cells({ 0: 'warrior' }), enemies: cells({ 0: 'weir_eel', 1: 'weir_eel' }) });
    const eel = unit(b, 'enemy-0');
    const dry = b.effectiveStats(eel).evasion;
    const flood = { id: 'g-test', ground: e.ground, board: 'enemy' as const, slots: [0], turns: 2, source: 'party-0', sourceSide: 'party' as const, amount: 0 };
    b.ground.push(flood);
    expect(b.effectiveStats(eel).evasion).toBeCloseTo(dry + e.evasion, 4);
    expect(b.effectiveStats(unit(b, 'enemy-1')).evasion).toBeCloseTo(dry, 4); // komşu kuru hücrede
    b.ground.splice(0, b.ground.length, { ...flood, ground: 'burning' });
    expect(b.effectiveStats(eel).evasion).toBeCloseTo(dry, 4);
    expect(describe2('weir_eel')).toContain('flooded');
  });
});

describe('Lure (Siren)', () => {
  it('Siren\'ı skill ile vuran kahraman Omen yığını alır (kaynak Siren); ıska saymaz', () => {
    const e = effectOf('siren', 'lure');
    const b = sure(make({ party: cells({ 0: 'warrior', 6: 'archer' }), enemies: cells({ 6: 'siren', 0: 'salt_crab' }) }));
    const hero = unit(b, 'party-1');
    const siren = b.combatants.find((c) => c.defId === 'siren')!;
    const n = b.log.length;
    b.useSkill('party-1', 'quick_shot', siren.uid);
    const st = hero.statuses.find((s) => s.kind === e.status);
    expect(st?.stacks).toBe(e.stacks);
    expect(st?.source).toBe(siren.uid);
    expect(ofType(b.log.slice(n), 'passive').some((x) => x.actor === siren.uid && x.passive === 'lure')).toBe(true);
    // ıska: yığın artmaz
    hero.stats.accuracy = 0;
    siren.stats.evasion = 1;
    b.debug.dodge = 'always';
    b.useSkill('party-1', 'quick_shot', siren.uid);
    expect(hero.statuses.find((s) => s.kind === e.status)?.stacks).toBe(e.stacks);
    expect(describe2('siren')).toContain('Omen');
  });
});
