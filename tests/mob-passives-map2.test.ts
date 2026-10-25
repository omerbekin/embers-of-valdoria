import { describe, expect, it } from 'vitest';
import { Battle, content, describePassive } from '../src/engine';
import type { BattleEvent, Combatant, PassiveEffect, Teams } from '../src/engine';

// Harita 2 (The Drowned Reach) mob pasifleri: Boarding, Shell, Slick, Lure, Deathless Tide, Salt Tears, Undertow (docs/design/campaign/maps-2-3.md 3.3; content-designer 2026-10-25).
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
  it('Siren hedefini skill ile vuran kahraman Spellbound alır (kaynak Siren); aynı skill onu tüketmez, sonraki skill tüketir; ıska yenisini vermez', () => {
    const e = effectOf('siren', 'lure');
    expect(e.status).toBe('spellbound');
    const b = sure(make({ party: cells({ 0: 'warrior', 6: 'archer' }), enemies: cells({ 6: 'siren', 0: 'salt_crab' }) }));
    const hero = unit(b, 'party-1');
    const siren = b.combatants.find((c) => c.defId === 'siren')!;
    const n = b.log.length;
    b.useSkill('party-1', 'quick_shot', siren.uid);
    const st = hero.statuses.find((s) => s.kind === e.status);
    expect(st?.turns).toBe(e.turns);
    expect(st?.source).toBe(siren.uid);
    expect(hero.statuses.some((s) => s.kind === 'omen')).toBe(false);
    expect(ofType(b.log.slice(n), 'passive').some((x) => x.actor === siren.uid && x.passive === 'lure')).toBe(true);
    // ıska: Spellbound bu skill'de tüketilir, yenisi gelmez
    b.debug.dodge = 'always';
    const m = b.log.length;
    b.useSkill('party-1', 'quick_shot', siren.uid);
    expect(hero.statuses.some((s) => s.kind === e.status)).toBe(false);
    expect(ofType(b.log.slice(m), 'statusEnd').some((x) => x.target === 'party-1' && x.status === 'spellbound' && x.consumed)).toBe(true);
    expect(describe2('siren')).toContain('Spellbound');
  });
});

describe('Spellbound (durum; yalnız moblar verir)', () => {
  it('sonraki skill hasarı ve şifası x0,75; skill sonrası düşer', () => {
    const def = content.statuses.spellbound!;
    expect(def.damageDealtMult).toBe(0.75);
    expect(def.healDealtMult).toBe(0.75);
    const dmg = (sb: boolean) => {
      const b = sure(make({ party: cells({ 6: 'archer' }), enemies: cells({ 0: 'salt_crab' }) }));
      if (sb) unit(b, 'party-0').statuses.push({ kind: 'spellbound', turns: 1, source: 'enemy-0' });
      const n = b.log.length;
      b.useSkill('party-0', 'quick_shot', 'enemy-0');
      expect(unit(b, 'party-0').statuses.some((s) => s.kind === 'spellbound')).toBe(false);
      return ofType(b.log.slice(n), 'damage').filter((x) => x.target === 'enemy-0').reduce((t, x) => t + x.amount, 0);
    };
    expect(Math.abs(dmg(true) - dmg(false) * 0.75)).toBeLessThanOrEqual(1);
    const heal = (sb: boolean) => {
      const b = sure(make({ party: cells({ 0: 'druid', 1: 'warrior' }), enemies: cells({ 0: 'salt_crab' }) }));
      b.debug.crit = 'never';
      const pal = unit(b, 'party-0');
      const sk = 'rejuvenate';
      unit(b, 'party-1').hp = 100;
      pal.mp = pal.maxMp;
      if (sb) pal.statuses.push({ kind: 'spellbound', turns: 1, source: 'enemy-0' });
      const n = b.log.length;
      b.useSkill('party-0', sk, 'party-1');
      expect(pal.statuses.some((s) => s.kind === 'spellbound')).toBe(false);
      return ofType(b.log.slice(n), 'heal').filter((x) => x.target === 'party-1').reduce((t, x) => t + x.amount, 0);
    };
    const h1 = heal(false);
    expect(h1).toBeGreaterThan(0);
    expect(Math.abs(heal(true) - h1 * 0.75)).toBeLessThanOrEqual(1);
  });

  it('hiçbir kahraman sınıfı, çağrı ya da eşya skilli Spellbound vermez (yalnız moblar)', () => {
    const mobSkills = new Set(Object.values(content.mobs).flatMap((m) => m.skills));
    for (const d of [...Object.values(content.classes), ...Object.values(content.summons)])
      for (const id of d.skills) {
        if (mobSkills.has(id)) continue;
        expect(JSON.stringify(content.skills[id]!.effects), id).not.toContain('spellbound');
      }
  });
});

// Ömer open-questions 419 cevabı (P1 a, P2 a): Deathless Tide, Salt Tears, Undertow ve Weir Eel Bite'ın Soaked eki.
const flood = (b: Battle, board: 'party' | 'enemy', slots: number[]) =>
  b.ground.push({ id: `g-flood-${board}-${slots.join('-')}`, ground: 'flooded', board, slots, turns: 3, source: 'env', sourceSide: board === 'party' ? 'enemy' : 'party', amount: 0, envUntilRound: 99 });
function until(b: Battle, uid: string, max = 60): void {
  for (let i = 0; i < max && b.currentUid !== uid && !b.winner; i++) b.skipTurn();
  expect(b.currentUid).toBe(uid);
}

describe('Deathless Tide (Drowned Knight)', () => {
  it('Flooded hücrede ölümcül vuruşta bir kez maks canın hpRatio kadarıyla kalkar; ikinci kez ve kuru hücrede ölür', () => {
    const e = effectOf('drowned_knight', 'deathlessTide');
    const b = sure(make({ party: cells({ 6: 'archer' }), enemies: cells({ 0: 'drowned_knight', 1: 'drowned_knight' }) }), 1000);
    flood(b, 'enemy', [0]);
    const k = unit(b, 'enemy-0');
    k.hp = 1;
    let n = b.log.length;
    b.useSkill('party-0', 'quick_shot', 'enemy-0');
    expect(k.hp).toBe(Math.round(k.maxHp * e.hpRatio));
    expect(k.passiveUsed).toBe(true);
    expect(ofType(b.log.slice(n), 'passive').some((x) => x.actor === 'enemy-0' && x.passive === 'deathless_tide')).toBe(true);
    k.hp = 1;
    n = b.log.length;
    b.useSkill('party-0', 'quick_shot', 'enemy-0');
    expect(k.hp).toBe(0);
    // kuru hücredeki şövalye ölür
    const dry = unit(b, 'enemy-1');
    dry.hp = 1;
    b.useSkill('party-0', 'quick_shot', 'enemy-1');
    expect(dry.hp).toBe(0);
    expect(dry.passiveUsed).toBeFalsy();
    expect(describe2('drowned_knight')).toContain('flooded');
  });
});

describe('Salt Tears (Brine Maiden)', () => {
  it('kendi tur başında Flooded hücredeki yaralı dostlar maks canın oranı kadar iyileşir; kuru hücredeki iyileşmez', () => {
    const e = effectOf('brine_maiden', 'saltTears');
    const b = sure(make({ party: cells({ 6: 'archer' }), enemies: cells({ 7: 'brine_maiden', 0: 'drowned_knight', 1: 'salt_crab' }) }, 'turns'), 1000);
    for (const c of b.combatants) if (c.side === 'enemy') c.hp = 500;
    const maiden = b.combatants.find((c) => c.defId === 'brine_maiden')!;
    const wet = b.combatants.find((c) => c.defId === 'drowned_knight')!;
    const dryU = b.combatants.find((c) => c.defId === 'salt_crab')!;
    flood(b, 'enemy', [wet.slot]);
    if (b.currentUid === maiden.uid) b.skipTurn();
    const n = b.log.length;
    until(b, maiden.uid);
    const heals = ofType(b.log.slice(n), 'heal').filter((x) => x.cause === 'salt_tears');
    expect(heals.some((x) => x.target === wet.uid && x.amount === Math.round(1000 * e.ratio))).toBe(true);
    expect(heals.some((x) => x.target === dryU.uid || x.target === maiden.uid)).toBe(false);
    expect(describe2('brine_maiden')).toContain('flooded');
  });
});

describe('Undertow (Reef Wrecker)', () => {
  it('Flooded hücredeki kahramana skill vuruşu Slow bırakır (pasif olayı); kuru hücrede pasif işlemez (Hook kendi Slow durumunu yine verir)', () => {
    const e = effectOf('reef_wrecker', 'undertow');
    const hit = (wet: boolean) => {
      const b = sure(make({ party: cells({ 0: 'warrior' }), enemies: cells({ 0: 'reef_wrecker' }) }));
      if (wet) flood(b, 'party', [0]);
      const n = b.log.length;
      b.useSkill('enemy-0', 'hook', 'party-0');
      return { b, n };
    };
    const w = hit(true);
    expect(ofType(w.b.log.slice(w.n), 'passive').some((x) => x.passive === 'undertow')).toBe(true);
    expect(unit(w.b, 'party-0').statuses.find((s) => s.kind === e.status)?.turns).toBe(e.turns);
    const d = hit(false);
    expect(ofType(d.b.log.slice(d.n), 'passive').some((x) => x.passive === 'undertow')).toBe(false);
    expect(describe2('reef_wrecker')).toContain('Slow');
  });
});

describe('Weir Eel Bite: Soaked hedefe ek hasar', () => {
  it('hedef Soaked ise hasar x multiplier (aynı seed)', () => {
    const bonus = (content.skills.eel_bite!.effects[0] as { bonusVsStatus?: { status: string; multiplier: number } }).bonusVsStatus!;
    expect(bonus.status).toBe('soaked');
    const dmg = (soaked: boolean) => {
      const b = sure(make({ party: cells({ 0: 'warrior' }), enemies: cells({ 0: 'weir_eel' }) }));
      if (soaked) (unit(b, 'party-0').statuses as { kind: string; turns: number; source: string }[]).push({ kind: 'soaked', turns: 2, source: 'env' });
      const n = b.log.length;
      b.useSkill('enemy-0', 'eel_bite', 'party-0');
      return ofType(b.log.slice(n), 'damage').filter((x) => x.target === 'party-0').reduce((t, x) => t + x.amount, 0);
    };
    expect(Math.abs(dmg(true) - dmg(false) * bonus.multiplier)).toBeLessThanOrEqual(1);
  });
});
