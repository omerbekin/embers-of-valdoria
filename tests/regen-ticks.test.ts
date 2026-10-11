import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import type { BattleEvent } from '../src/engine';
import { regenTickEvents } from '../src/game/regen-ticks';

// Ömer 2026-10-11 (yüzen yazı taslağı A): tur başı can/MP yenilenmesi yüzen sayı olmaz, çubuk parlar. Karar saf: turnStart'tan geriye bakılır.

const ts = (actor: string, extra = false): BattleEvent & { type: 'turnStart' } => ({ type: 'turnStart', actor, queue: [], ...(extra ? { extra: true } : {}) }) as BattleEvent & { type: 'turnStart' };
const stats = { hpRegen: 4.4, mpRegen: 3 };

describe('tur başı yenilenme tikleri', () => {
  it('turnStart öncesindeki düz can + MP yenilenmesini bulur, skill şifasını ve başkasınınkini değil', () => {
    const skillHeal: BattleEvent = { type: 'heal', source: 'p2', target: 'p1', amount: 40, hpAfter: 100, crit: false };
    const regenHeal: BattleEvent = { type: 'heal', source: 'p1', target: 'p1', amount: 4, hpAfter: 104, crit: false };
    const regenMp: BattleEvent = { type: 'mpRegen', actor: 'p1', amount: 3, after: 20 };
    const recent: BattleEvent[] = [{ type: 'skillUsed', actor: 'p2', skill: 'x' } as unknown as BattleEvent, skillHeal, regenHeal, regenMp];
    const got = regenTickEvents(recent, ts('p1'), () => stats);
    expect(got.size).toBe(2);
    expect(got.has(regenHeal) && got.has(regenMp)).toBe(true);
  });
  it('cause taşıyan MP (Rest, kalkan kancası...), kritik ve büyük şifa yenilenme sayılmaz', () => {
    const rest: BattleEvent = { type: 'mpRegen', actor: 'p1', amount: 3, after: 20, cause: 'battle_rhythm' };
    const crit: BattleEvent = { type: 'heal', source: 'p1', target: 'p1', amount: 4, hpAfter: 104, crit: true };
    const big: BattleEvent = { type: 'heal', source: 'p1', target: 'p1', amount: 30, hpAfter: 130, crit: false };
    expect(regenTickEvents([rest, crit, big], ts('p1'), () => stats).size).toBe(0);
  });
  it('ek eylem turunda ve yenilenmesi olmayan birimde boş', () => {
    const regenMp: BattleEvent = { type: 'mpRegen', actor: 'p1', amount: 3, after: 20 };
    expect(regenTickEvents([regenMp], ts('p1', true), () => stats).size).toBe(0);
    expect(regenTickEvents([regenMp], ts('p1'), () => undefined).size).toBe(0);
  });
  it('gerçek savaşta: işaretlenenler hep o birimin kendi tur başı tikleri, skill şifaları asla', () => {
    const teams = { party: ['warrior', 'druid', 'defender', 'paladin'], enemies: ['warrior', 'mage', 'gambler', 'hexer'] };
    const b = new Battle(content.battleSetup('random-battle', 11, 'turns', teams, false));
    for (let n = 0; n < 300 && !b.winner; n++) {
      const uid = b.currentActor?.uid;
      if (!uid) break;
      if (!b.applyChoice(uid, chooseAction(b, uid, content.aiConfig)).ok) break;
    }
    const statsOf = (uid: string) => {
      const c = b.get(uid);
      return c ? { hpRegen: c.stats.hpRegen ?? 0, mpRegen: c.stats.mpRegen + (c.itemEffects?.turnMp?.mp ?? 0) } : undefined;
    };
    let recent: BattleEvent[] = [];
    let hp = 0, mp = 0;
    for (const e of b.log) {
      if (e.type === 'turnStart') {
        for (const m of regenTickEvents(recent, e, statsOf)) {
          if (m.type === 'heal') {
            hp++;
            expect(m.source).toBe(e.actor);
            expect(m.target).toBe(e.actor);
            expect(m.cause).toBeUndefined();
          } else if (m.type === 'mpRegen') {
            mp++;
            expect(m.actor).toBe(e.actor);
          } else throw new Error(`unexpected ${m.type}`);
        }
      }
      if (e.type === 'skillUsed' || e.type === 'globalUsed' || e.type === 'turnStart' || e.type === 'turnSkipped') recent = [];
      if (e.type !== 'turnStart') recent.push(e);
    }
    expect(mp).toBeGreaterThan(5);
    expect(hp).toBeGreaterThan(0);
  });
});
