import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import type { BattleEvent } from '../src/engine';
import { hpTickPlan, regenTickEvents } from '../src/game/regen-ticks';
import { CombatLog } from '../src/game/combat-log';

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

// Ömer 2026-11-01: skill HoT tiki düz yenilenmenin üstüne eklenir, çubuğun sağında tek "+N" (bonus rengi).
describe('can çubuğu toplamı (HoT + yenilenme)', () => {
  const heal = (amount: number, over: Partial<BattleEvent & { type: 'heal' }> = {}): BattleEvent & { type: 'heal' } => ({ type: 'heal', source: 'p1', target: 'p1', amount, hpAfter: 100, crit: false, ...over });
  const hot = (amount: number, over: Partial<BattleEvent & { type: 'heal' }> = {}) => heal(amount, { source: 'p2', cause: 'regen', ...over });
  const planFor = (recent: BattleEvent[], actor = 'p1', extra = false) => {
    const t = ts(actor, extra);
    return hpTickPlan(recent, t, regenTickEvents(recent, t, () => stats));
  };

  it('regen +2 ve HoT +5: son olayda tek +7, bonus', () => {
    const h = hot(5);
    const r = heal(2);
    const m: BattleEvent = { type: 'mpRegen', actor: 'p1', amount: 3, after: 20 };
    const p = planFor([h, { type: 'statusEnd', target: 'p1', status: 'regen' }, r, m]);
    expect(p.hot.has(h)).toBe(true);
    expect(p.hot.has(r)).toBe(false);
    expect(p.chips.size).toBe(1);
    expect(p.chips.get(r)).toEqual({ amount: 7, bonus: true });
  });
  it('yalnız yenilenme: değişmez, bonus yok; yalnız HoT: bonus', () => {
    const r = heal(2);
    expect(planFor([r]).chips.get(r)).toEqual({ amount: 2, bonus: false });
    const h = hot(5);
    const p = planFor([h]);
    expect(p.chips.get(h)).toEqual({ amount: 5, bonus: true });
  });
  it('iki kaynaktan iki HoT toplanır; tam candaki HoT olayın bildirdiği +0 olur', () => {
    const a = hot(5);
    const b = hot(3, { source: 'p3' });
    expect(planFor([a, b]).chips.get(b)).toEqual({ amount: 8, bonus: true });
    const zero = hot(0);
    expect(planFor([zero]).chips.get(zero)).toEqual({ amount: 0, bonus: true });
  });
  it('arada can değiştiren olay varsa toplamaz, her grup kendi yazısını alır', () => {
    const h = hot(5);
    const r = heal(2);
    const dmg = { type: 'damage', source: 'e1', target: 'p1', amount: 4, hpAfter: 90, crit: false } as unknown as BattleEvent;
    const p = planFor([h, dmg, r]);
    expect(p.chips.get(h)).toEqual({ amount: 5, bonus: true });
    expect(p.chips.get(r)).toEqual({ amount: 2, bonus: false });
  });
  it('kritik HoT, başkasının HoT tiki, cause taşıyan diğer şifalar ve ek eylem turu dışarıda', () => {
    const crit = hot(9, { crit: true });
    const other = hot(5, { target: 'p2' });
    const ground = heal(5, { cause: 'hallowed' });
    const life = heal(5, { cause: 'lifesteal' });
    const p = planFor([crit, other, ground, life]);
    expect(p.hot.size).toBe(0);
    expect(p.chips.size).toBe(0);
    expect(planFor([hot(5)], 'p1', true).chips.size).toBe(0);
  });
  describe('şifa zemini (Ömer 2026-11-02)', () => {
    const isG = (c: string) => c === 'healing_rain' || c === 'holy_ground';
    const plan = (recent: BattleEvent[], actor = 'p1') => {
      const t = ts(actor);
      return hpTickPlan(recent, t, regenTickEvents(recent, t, () => stats), isG);
    };
    const gh = (amount: number, over: Partial<BattleEvent & { type: 'heal' }> = {}) => heal(amount, { source: 'p2', cause: 'healing_rain', ...over });
    it('yalnız zemin şifası: çubuk yanında tek +N, bonus, yüzen sayı yok', () => {
      const g = gh(6);
      const p = plan([g]);
      expect(p.hot.has(g)).toBe(true);
      expect(p.chips.get(g)).toEqual({ amount: 6, bonus: true });
    });
    it('zemin + düz yenilenme tek toplam', () => {
      const g = gh(6);
      const r = heal(2);
      const p = plan([g, r]);
      expect(p.chips.size).toBe(1);
      expect(p.chips.get(r)).toEqual({ amount: 8, bonus: true });
    });
    it('zemin + skill HoT + yenilenme tek toplam', () => {
      const g = gh(6);
      const h = hot(5);
      const r = heal(2);
      const p = plan([h, g, r]);
      expect(p.chips.size).toBe(1);
      expect(p.chips.get(r)).toEqual({ amount: 13, bonus: true });
    });
    it('başka birimin zemin şifası, kritik ve zemin olmayan cause yüzen kalır', () => {
      const other = gh(6, { target: 'p2' });
      const crit = gh(6, { crit: true });
      const lifesteal = gh(6, { cause: 'lifesteal' });
      const p = plan([other, crit, lifesteal]);
      expect(p.hot.size).toBe(0);
      expect(p.chips.size).toBe(0);
    });
    it('arada hasar varsa grup kesilir', () => {
      const g = gh(6);
      const dmg = { type: 'damage', source: 'e1', target: 'p1', amount: 4, hpAfter: 90, crit: false } as unknown as BattleEvent;
      const r = heal(2);
      const p = plan([g, dmg, r]);
      expect(p.chips.get(g)).toEqual({ amount: 6, bonus: true });
      expect(p.chips.get(r)).toEqual({ amount: 2, bonus: false });
    });
  });
  it('savaş günlüğü HoT satırını yazmaya devam eder (regen bayrağı almaz)', () => {
    const log = new CombatLog({ unit: () => ({ name: 'Druid', side: 'party' }), skill: (s) => s, status: (s) => s, ground: (s) => s, cause: () => 'Regeneration', globalKind: (s) => s, rowOf: () => 0 });
    // Sahne HoT için yalnız `between` geçirir, `regen` düz yenilenmeye kalır
    expect(log.push(hot(5), { between: true })).toBe(true);
    expect(log.entries().at(-1)!.parts.map((x) => x.t).join('')).toBe('Druid healed +5 from Regeneration');
  });
  it('gerçek savaşta: toplamlar işaretlenen olayların toplamına eşit, HoT tikleri bu birimin kendi tikleri', () => {
    // 2026-11-02: Rejuvenate artık zemin (Healing Rain) bıraktığı için kahramanlarda HoT yok; gerçek HoT kaynağı Marsh Light'ın Fen Glimmer'ı.
    // YZ onu bu dizilimde seçmediği için, kullanılabildiği her turda yaralı dosta elle atılır; gerisi YZ.
    const teams = { party: ['warrior', 'marsh_light', 'defender', 'marsh_light'], enemies: ['warrior', 'mage', 'gambler', 'hexer'] };
    let hotSeen = 0;
    for (const seed of [11, 12, 13, 14]) {
      const b = new Battle(content.battleSetup('random-battle', seed, 'turns', teams, false));
      for (let n = 0; n < 300 && !b.winner; n++) {
        const uid = b.currentActor?.uid;
        if (!uid) break;
        const hurt = b.combatants.find((c) => c.side === 'party' && c.hp > 0 && c.hp < c.maxHp);
        if (hurt && b.applyChoice(uid, { skillId: 'fen_glimmer', targetUid: hurt.uid }).ok) continue;
        if (!b.applyChoice(uid, chooseAction(b, uid, content.aiConfig)).ok) break;
      }
      const statsOf = (uid: string) => {
        const c = b.get(uid);
        return c ? { hpRegen: c.stats.hpRegen ?? 0, mpRegen: c.stats.mpRegen + (c.itemEffects?.turnMp?.mp ?? 0) } : undefined;
      };
      let recent: BattleEvent[] = [];
      for (const e of b.log) {
        if (e.type === 'turnStart') {
          const regen = regenTickEvents(recent, e, statsOf);
          const p = hpTickPlan(recent, e, regen);
          let marked = 0;
          for (const m of regen) if (m.type === 'heal') marked += m.amount;
          for (const m of p.hot) {
            hotSeen++;
            if (m.type !== 'heal') throw new Error('unexpected');
            expect(m.target).toBe(e.actor);
            expect(m.cause).toBe('regen');
            marked += m.amount;
          }
          expect([...p.chips.values()].reduce((t, c) => t + c.amount, 0)).toBe(marked);
        }
        if (e.type === 'skillUsed' || e.type === 'globalUsed' || e.type === 'turnStart' || e.type === 'turnSkipped') recent = [];
        if (e.type !== 'turnStart') recent.push(e);
      }
    }
    expect(hotSeen).toBeGreaterThan(0);
  });
});
