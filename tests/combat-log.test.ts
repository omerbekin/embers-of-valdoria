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
});
