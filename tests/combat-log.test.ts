import { describe, expect, it } from 'vitest';
import { CombatLog, type LogNames } from '../src/game/combat-log';
import type { BattleEvent } from '../src/engine';
import { betweenTurnEvents, regenTickEvents } from '../src/game/regen-ticks';

const units: Record<string, { name: string; side: 'party' | 'enemy' }> = {
  a: { name: 'Cutthroat', side: 'enemy' },
  b: { name: 'Hexer', side: 'party' },
  c: { name: 'Warrior', side: 'party' },
};
const names: LogNames = {
  unit: (uid) => units[uid],
  skill: (id) => ({ venom_edge: 'Venom Edge', whirl: 'Whirlwind' })[id] ?? id,
  status: (id) => ({ wound: 'Wounded' })[id] ?? id,
  ground: (id) => ({ poison: 'Poison' })[id] ?? id,
  globalKind: (id) => id,
  cause: (id) => ({ 'paladin:0.f1': 'Wrathful Glow', divine_light: 'Divine Light', lifesteal: 'Lifesteal' })[id] ?? '',
  rowOf: (slot) => Math.floor(slot / 3),
};
const ev = (e: object) => e as BattleEvent;
const text = (log: CombatLog, i = 0) => log.entries()[i]!.parts.map((p) => p.t).join('');

describe('combat log (HUD > Battle info)', () => {
  it('one line per action: actor, skill, target, damage and statuses', () => {
    const log = new CombatLog(names);
    log.begin('a');
    log.push(ev({ type: 'skillUsed', actor: 'a', skill: 'venom_edge', targets: ['b'] }));
    log.push(ev({ type: 'damage', source: 'a', target: 'b', amount: 9, absorbed: 0, hpAfter: 10, shieldAfter: 0, magicShieldAfter: 0, crit: false, origin: 'skill' }));
    log.push(ev({ type: 'status', target: 'b', status: 'wound', turns: 2, source: 'a' }));
    expect(text(log)).toBe('Cutthroat used Venom Edge on Hexer · 9 · Wounded');
    expect(log.entries()[0]!.parts[0]!.k).toBe('e');
    expect(log.entries()[0]!.round).toBe(1);
  });

  it('area hits list every target; crit and KO are marked', () => {
    const log = new CombatLog(names);
    log.push(ev({ type: 'skillUsed', actor: 'c', skill: 'whirl', targets: ['a'] }));
    log.push(ev({ type: 'damage', source: 'c', target: 'a', amount: 18, absorbed: 2, hpAfter: 0, shieldAfter: 0, magicShieldAfter: 0, crit: true, origin: 'skill' }));
    log.push(ev({ type: 'death', target: 'a', corpse: true }));
    expect(text(log)).toBe('Warrior used Whirlwind on Cutthroat · 20 crit · KO');
  });

  it('turns and rounds: a new round starts when a unit acts again', () => {
    const log = new CombatLog(names);
    log.begin('a');
    log.push(ev({ type: 'turnStart', actor: 'b', queue: [] }));
    log.push(ev({ type: 'turnStart', actor: 'b', queue: [], extra: true }));
    expect([log.round, log.turn]).toEqual([1, 2]);
    log.push(ev({ type: 'turnStart', actor: 'a', queue: [] }));
    expect([log.round, log.turn]).toEqual([2, 3]);
  });

  it('ground ticks get their own line, latest first', () => {
    const log = new CombatLog(names);
    log.push(ev({ type: 'turnStart', actor: 'b', queue: [] }));
    log.push(ev({ type: 'damage', source: 'a', target: 'b', amount: 4, absorbed: 0, hpAfter: 6, shieldAfter: 0, magicShieldAfter: 0, crit: false, origin: 'ground', ground: 'poison' }));
    log.push(ev({ type: 'globalUsed', actor: 'b', id: 'rest' }));
    expect(text(log, 0)).toBe('Hexer rested');
    expect(text(log, 1)).toBe('Hexer took 4 from Poison');
  });

  // Ömer 2026-10-11: "Cutthroat used Smoke Bomb on Cutthroat · +6 · Blinded": +6, sıradaki birimin (hedefin) tur başı can yenilenmesiydi;
  // motor tur başını eylemle aynı çağrıda, turnStart'tan önce yayar. Durumlar doğruydu (karşı tahtaya atılan duman = Blinded).
  it('turn-start ticks of the next unit: ticks never merge into the previous action line', () => {
    const log = new CombatLog(names);
    const events = [
      ev({ type: 'skillUsed', actor: 'a', skill: 'smoke_bomb', targets: ['b', 'c'], board: 'party' }),
      ev({ type: 'status', target: 'b', status: 'blinded', turns: 2, source: 'a' }),
      ev({ type: 'status', target: 'c', status: 'blinded', turns: 2, source: 'a' }),
      ev({ type: 'damage', source: 'a', target: 'b', amount: 5, absorbed: 0, hpAfter: 50, shieldAfter: 0, magicShieldAfter: 0, crit: false, origin: 'status', status: 'wither' }),
      ev({ type: 'heal', source: 'b', target: 'b', amount: 6, hpAfter: 56, crit: false }),
      ev({ type: 'mpRegen', actor: 'b', amount: 3, after: 20 }),
      ev({ type: 'turnStart', actor: 'b', queue: [] }),
    ];
    const ts = events[events.length - 1] as BattleEvent & { type: 'turnStart' };
    const recent = events.slice(0, -1);
    const regen = regenTickEvents(recent, ts, () => ({ hpRegen: 6, mpRegen: 3 }));
    const between = betweenTurnEvents(recent, ts);
    for (const e of events) log.push(e, { between: between.has(e), regen: regen.has(e) });
    const lines = log.entries().map((x) => x.parts.map((p) => p.t).join(''));
    expect(lines).toContain('Cutthroat used smoke_bomb on Hexer · blinded, Warrior · blinded');
    expect(lines).toContain('Hexer took 5 from wither');
    expect(lines.join('|')).not.toContain('+6');
  });

  const dmg = (o: object) => ev({ type: 'damage', source: 'c', target: 'a', amount: 2, absorbed: 0, hpAfter: 50, shieldAfter: 0, magicShieldAfter: 0, crit: false, ...o });

  // Ömer 2026-11-01: "EMBER ACOLYTE took 2 from" satırı boş bitiyordu: kaynak adı olmayan durum hasarı.
  it('damage names its cause; an unnamed one has no dangling "from"', () => {
    const log = new CombatLog(names);
    log.push(dmg({ origin: 'status', cause: 'divine_light' }));
    expect(text(log)).toBe('Cutthroat took 2 from Divine Light');
    log.push(dmg({ origin: 'status' }));
    expect(text(log)).toBe('Cutthroat took 2');
    log.push(dmg({ origin: 'status', cause: 'unknown_id' }));
    expect(text(log)).toBe('Cutthroat took 2');
    log.push(dmg({ origin: 'ground', amount: 0, absorbed: 3, cause: 'divine_light' }));
    expect(text(log)).toBe('Cutthroat took 3 from Divine Light');
  });

  it('inside an action: a named source gets its own line, plain skill damage still folds', () => {
    const log = new CombatLog(names);
    log.push(ev({ type: 'skillUsed', actor: 'c', skill: 'whirl', targets: ['a'] }));
    log.push(dmg({ amount: 9, origin: 'skill' }));
    log.push(dmg({ origin: 'status', cause: 'paladin:0.f1' }));
    log.push(dmg({ amount: 1, origin: 'status' }));
    log.push(dmg({ amount: 5, origin: 'skill' }));
    const lines = log.entries().map((x) => x.parts.map((p) => p.t).join(''));
    expect(lines).toEqual(['Cutthroat took 2 from Wrathful Glow', 'Warrior used Whirlwind on Cutthroat · 15']);
  });

  it('heal names its cause; lifesteal folds into the own action, plain regen stays out', () => {
    const heal = (o: object) => ev({ type: 'heal', source: 'c', target: 'c', amount: 8, hpAfter: 50, crit: false, ...o });
    const log = new CombatLog(names);
    log.push(heal({ cause: 'divine_light' }));
    expect(text(log)).toBe('Warrior healed +8 from Divine Light');
    log.push(heal({}));
    expect(text(log)).toBe('Warrior healed +8');
    log.push(heal({ cause: 'dark_bond' }));
    expect(text(log)).toBe('Warrior healed +8 (Dark Bond)');
    log.push(ev({ type: 'skillUsed', actor: 'c', skill: 'whirl', targets: ['a'] }));
    log.push(dmg({ amount: 9, origin: 'skill' }));
    log.push(heal({ amount: 3, cause: 'lifesteal' }));
    expect(text(log)).toBe('Warrior used Whirlwind on Cutthroat · 9, Warrior · +3');
    log.push(heal({ amount: 4, target: 'b', cause: 'divine_light' }));
    expect(text(log)).toBe('Hexer healed +4 from Divine Light');
    log.push(heal({ amount: 2, target: 'b', cause: 'lifesteal' }));
    expect(text(log)).toBe('Hexer healed +2 from Lifesteal');
    const n = log.entries().length;
    log.push(heal({ amount: 1 }), { regen: true });
    expect(log.entries().length).toBe(n);
  });

  it('Move says the direction (slot row 0 = front); pushes do not touch the line', () => {
    const moved = (from: number, to: number, o: object = {}) => {
      const log = new CombatLog(names);
      log.push(ev({ type: 'globalUsed', actor: 'c', id: 'move' }));
      log.push(ev({ type: 'moved', actor: 'c', from, to, ...o }));
      return text(log);
    };
    expect(moved(3, 0)).toBe('Warrior moved forward');
    expect(moved(3, 7)).toBe('Warrior moved back');
    expect(moved(3, 5)).toBe('Warrior moved sideways');
    expect(moved(3, 0, { actor: 'a' })).toBe('Warrior moved');
    expect(moved(3, 0, { cause: 'hook' })).toBe('Warrior moved');
    const log = new CombatLog(names);
    log.push(ev({ type: 'skillUsed', actor: 'a', skill: 'venom_edge', targets: ['c'] }));
    expect(log.push(ev({ type: 'moved', actor: 'a', from: 3, to: 0, advance: true, cause: 'x' }))).toBe(false);
  });
});
