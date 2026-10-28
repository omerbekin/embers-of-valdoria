import { describe, expect, it } from 'vitest';
import { Battle, content, describePassive, describeSkill, previewSkill, skillCostAmount } from '../src/engine';
import type { BattleEvent, BattleMode } from '../src/engine';

/**
 * Warrior "Berserker" (wr1, Ömer 2026-10-17; ult-summon seçim sayfası):
 *  - Pasif Berserker: eksik cana göre hasar (eskisi) + CAN kaybedince Rage (rageOnHurt: maks canın %1'i başına perHpPercent, vuruş başına perHitCap).
 *  - Whirlwind: verdiği hasarın bir kısmı can olarak döner (lifesteal).
 *  - Ultimate Headsman's Blow (Abyssal Cry'ın yerine): tek hedef yakın dövüş, TÜM Rage'i harcar (en az cost.amount);
 *    güç = power + powerPerRage x harcanan Rage, x(1 + executeBonus x hedefin eksik can oranı).
 * Sayılar veriden okunur; iki savaş modunda da çalışır.
 */
const R = content.formulas.rage;
const W = content.classes.warrior!;
const hurt = (W.passive!.effect as { rageOnHurt?: { perHpPercent: number; perHitCap?: number } }).rageOnHurt!;
const HB = content.skills.headsmans_blow!;
const HBD = HB.effects[0] as Extract<(typeof HB.effects)[number], { type: 'damage' }>;
const WW = content.skills.whirlwind!.effects.find((e) => e.type === 'damage') as { lifesteal?: number };
const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type);

function mk(party: Record<number, string>, enemies: Record<number, string>, mode: BattleMode = 'test'): Battle {
  const b = new Battle(content.battleSetup('random-battle', 1, mode, { party: cells(party), enemies: cells(enemies) }, false));
  for (const c of b.combatants) Object.assign(c.stats, { critChance: 0, accuracy: 10, evasion: 0, surviveChance: 0 });
  b.debugClearCooldowns();
  return b;
}
const act = (b: Battle, uid: string, skill: string, target?: string): BattleEvent[] => {
  const r = b.useSkill(uid, skill, target);
  if (!r.ok) throw new Error(`${uid} ${skill}: ${r.reason}`);
  return r.events;
};
const expectedHurt = (lost: number, maxHp: number) => Math.round(Math.min(hurt.perHitCap ?? Infinity, (lost / maxHp) * 100 * hurt.perHpPercent));

describe('Berserker: hasar alınca Rage (veri)', () => {
  it('Warrior pasifi rage türünde, rageOnHurt pozitif; Whirlwind lifesteal taşır; ultimate Headsman\'s Blow', () => {
    expect(W.passive!.effect.type).toBe('rage');
    expect(hurt.perHpPercent).toBeGreaterThan(0);
    expect(WW.lifesteal).toBeGreaterThan(0);
    expect(WW.lifesteal).toBeLessThan(1);
    expect(W.skills[3]).toBe('headsmans_blow');
    expect(HB.motion).toBe('melee');
    expect(HB.target).toBe('single_enemy');
    expect(HBD.powerPerRage).toBeGreaterThan(0);
    expect(HBD.executeBonus).toBeGreaterThan(0);
    expect(content.skills.abyssal_cry).toBeUndefined();
    expect(content.statuses.abyssal_fury).toBeUndefined();
  });
});

describe('Berserker: hasar alınca Rage (motor)', () => {
  for (const mode of ['test', 'turns'] as const) {
    it(`can kaybı Rage verir (rage olayı cause 'hurt'), formül veriden (${mode})`, () => {
      const b = mk({ 0: 'warrior' }, { 0: 'archer' }, mode);
      const w = b.get('party-0')!;
      w.maxHp = w.hp = 200; // küçük can: vuruş canın belirgin payı
      const events = act(b, 'enemy-0', 'quick_shot', 'party-0');
      const dmg = ofType(events, 'damage').filter((e) => e.target === 'party-0');
      const lost = dmg.reduce((s, e) => s + e.amount, 0);
      expect(lost).toBeGreaterThan(0);
      const rage = ofType(events, 'rage').filter((e) => e.actor === 'party-0');
      expect(rage.length).toBe(dmg.filter((e) => expectedHurt(e.amount, 200) > 0).length);
      expect(rage.length).toBeGreaterThan(0);
      expect(rage.every((e) => e.cause === 'hurt')).toBe(true);
      expect(w.rage).toBe(dmg.reduce((s, e) => s + expectedHurt(e.amount, 200), 0));
    });
  }

  it('vuruş başına üst sınır perHitCap; bar dolunca olay yok', () => {
    const b = mk({ 0: 'warrior' }, { 0: 'archer' });
    const w = b.get('party-0')!;
    w.hp = w.maxHp = 100000;
    // canın %50'si gitse bile kazanç vuruş başına sınırlı (iç hesap; olay applyHit'te)
    const r = (b as unknown as { hurtRageGain: (a: unknown, t: unknown, l: number) => number }).hurtRageGain(b.get('enemy-0'), w, 50000);
    expect(r).toBe(Math.min(hurt.perHitCap ?? Infinity, R.max));
    w.rage = R.max;
    const events = act(b, 'enemy-0', 'quick_shot', 'party-0');
    expect(ofType(events, 'rage').filter((e) => e.actor === 'party-0')).toHaveLength(0);
  });

  it('kalkanın emdiği hasar ve öldürücü vuruş Rage vermez; Rage\'siz sınıf hasar alınca Rage almaz', () => {
    const b = mk({ 0: 'warrior', 1: 'mage' }, { 0: 'archer' });
    const w = b.get('party-0')!;
    w.shield = 100000;
    let events = act(b, 'enemy-0', 'quick_shot', 'party-0');
    expect(ofType(events, 'rage')).toHaveLength(0);
    w.shield = 0;
    w.hp = 1;
    events = act(b, 'enemy-0', 'quick_shot', 'party-0');
    expect(w.hp).toBe(0);
    expect(ofType(events, 'rage')).toHaveLength(0);
    const m = mk({ 0: 'mage' }, { 0: 'archer' });
    expect(ofType(act(m, 'enemy-0', 'quick_shot', 'party-0'), 'rage')).toHaveLength(0);
  });
});

describe('Whirlwind lifesteal', () => {
  for (const mode of ['test', 'turns'] as const) {
    it(`her isabet eden vuruşun can kaybının lifesteal payı kadar iyileştirir (${mode})`, () => {
      const b = mk({ 0: 'warrior' }, { 0: 'defender', 1: 'defender', 2: 'defender' }, mode);
      const w = b.get('party-0')!;
      w.hp = Math.round(w.maxHp / 3);
      w.mp = w.maxMp;
      for (let i = 0; i < 40 && mode === 'turns' && b.currentUid !== 'party-0'; i++) b.skipTurn();
      const events = act(b, 'party-0', 'whirlwind', 'enemy-0'); // alan skill'i: ön sıradaki düşman anchor
      const hits = ofType(events, 'damage').filter((e) => e.source === 'party-0' && e.amount > 0);
      expect(hits.length).toBeGreaterThan(0);
      const heals = ofType(events, 'heal').filter((e) => e.target === 'party-0' && e.source === 'party-0');
      expect(heals.map((h) => h.amount)).toEqual(hits.map((h) => Math.round(h.amount * WW.lifesteal!)));
    });
  }
});

describe("Headsman's Blow", () => {
  /** Zırhsız, büyük canlı hedef: önizleme ortalaması gücün doğrusal fonksiyonu olsun. */
  const arena = (mode: BattleMode = 'test') => {
    const b = mk({ 0: 'warrior' }, { 0: 'defender' }, mode);
    const foe = b.get('enemy-0')!;
    foe.stats.armor = 0;
    foe.hp = foe.maxHp = 1000000;
    b.get('party-0')!.stats.str = 1000;
    return b;
  };
  const avg = (b: Battle) => previewSkill(b, 'party-0', 'headsmans_blow', 'enemy-0')[0]!.damage!.avg;

  it('bedel: tüm Rage (en az cost.amount); etiket ve açıklama bunu söyler', () => {
    expect(HB.cost).toMatchObject({ resource: 'rage', spendAll: true });
    expect(skillCostAmount(HB.cost, { hp: 1, mp: 0, rage: R.max })).toBe(R.max);
    expect(skillCostAmount(HB.cost, { hp: 1, mp: 0, rage: 0 })).toBe(HB.cost.amount);
    const info = describeSkill(HB, W.stats, content.formulas);
    const text = info.lines.join(' ');
    expect(text).toContain('per Rage spent');
    expect(text).toContain(`up to ${Math.round(HBD.executeBonus! * 100)}% more damage`);
    expect(describePassive(W.passive!, W.stats, content.formulas)).toContain('Losing HP gives Rage');
  });

  it('hasar harcanan Rage ile doğrusal büyür (önizleme): güç = power + powerPerRage x Rage', () => {
    const b = arena();
    const w = b.get('party-0')!;
    w.rage = HB.cost.amount;
    const low = avg(b);
    w.rage = R.max;
    const high = avg(b);
    const want = (HBD.power + HBD.powerPerRage! * R.max) / (HBD.power + HBD.powerPerRage! * HB.cost.amount);
    expect(high / low).toBeCloseTo(want, 1);
  });

  it('hasar hedefin eksik canıyla büyür: x(1 + executeBonus x eksik oran)', () => {
    const b = arena();
    b.get('party-0')!.rage = R.max;
    const full = avg(b);
    const foe = b.get('enemy-0')!;
    foe.hp = foe.maxHp / 2;
    expect(avg(b) / full).toBeCloseTo(1 + HBD.executeBonus! * 0.5, 1);
  });

  for (const mode of ['test', 'turns'] as const) {
    it(`gerçek vuruş ödemeden ÖNCEKİ Rage ile hesaplanır ve önizleme aralığında kalır; Rage 0'a iner (${mode})`, () => {
      const b = arena(mode);
      const w = b.get('party-0')!;
      for (let i = 0; i < 40 && mode === 'turns' && b.currentUid !== 'party-0'; i++) b.skipTurn();
      b.debugClearCooldowns('party-0');
      w.rage = R.max;
      const pv = previewSkill(b, 'party-0', 'headsmans_blow', 'enemy-0')[0]!.damage!;
      const events = act(b, 'party-0', 'headsmans_blow', 'enemy-0');
      const hit = ofType(events, 'damage').find((e) => e.target === 'enemy-0')!;
      expect(hit.amount).toBeGreaterThanOrEqual(pv.min);
      expect(hit.amount).toBeLessThanOrEqual(pv.max);
      expect(ofType(events, 'rage')[0]).toMatchObject({ actor: 'party-0', delta: -R.max, after: 0 });
    });
  }

  it('freeRage (debug): Rage harcanmaz ama hasar mevcut Rage\'e göre', () => {
    const b = arena();
    b.freeRage = true;
    const w = b.get('party-0')!;
    w.rage = R.max;
    const pv = previewSkill(b, 'party-0', 'headsmans_blow', 'enemy-0')[0]!.damage!;
    const events = act(b, 'party-0', 'headsmans_blow', 'enemy-0');
    const hit = ofType(events, 'damage').find((e) => e.target === 'enemy-0')!;
    expect(hit.amount).toBeGreaterThanOrEqual(pv.min);
    expect(ofType(events, 'rage').some((e) => e.delta < 0)).toBe(false);
  });

  it('aynı seed + aynı girdi = aynı olaylar', () => {
    const run = () => {
      const b = new Battle(content.battleSetup('random-battle', 3, 'turns', { party: ['warrior', 'warrior'], enemies: ['archer', 'defender'] }));
      for (const c of b.combatants) if (c.maxRage !== undefined) c.rage = R.max;
      for (let i = 0; i < 40 && !b.winner; i++) b.skipTurn();
      return JSON.stringify(b.log);
    };
    expect(run()).toBe(run());
  });
});
