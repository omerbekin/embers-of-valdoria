import { describe, expect, it } from 'vitest';
import { Battle, content, describeSkill, previewForTargets, skillCostAmount, type BattleEvent, type BattleMode, type Combatant, type SkillEffect, type Teams } from '../src/engine';

// Ley Brand (Anti-Mage, Ömer 2026-10-27, open-questions 444): eski Drain Field'ın yerine (skill id drain_field AYNI). Sayılar veriden okunur.

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (enemies: Record<number, string>, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells({ 0: 'antimage' }), enemies: cells(enemies), units: { party: {}, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
const P = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === 0)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const BRAND = content.skills.drain_field!.effects.find((e) => e.type === 'brand') as Extract<SkillEffect, { type: 'brand' }>;
/** MP havuzu olmayan düşman (mob gibi): maxMp 0. */
const noMp = (c: Combatant): Combatant => {
  c.maxMp = 0;
  c.mp = 0;
  c.hp = c.maxHp = 400;
  return c;
};
function brand(b: Battle, slot = 0): BattleEvent[] {
  const me = P(b);
  const from = b.log.length;
  me.cooldowns.drain_field = 0;
  me.mp = me.maxMp;
  const r = b.useSkill(me.uid, 'drain_field', undefined, slot);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return b.log.slice(from);
}
function steal(b: Battle, target: Combatant): BattleEvent[] {
  const me = P(b);
  const from = b.log.length;
  me.cooldowns.mana_burn = 0;
  for (let i = 0; i < 40; i++) {
    const r = b.useSkill(me.uid, 'mana_burn', target.uid);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (target.hp <= 0) break;
    if (b.log.slice(from).some((e) => e.type === 'manaBurn' && e.target === target.uid)) break; // iska ise yeniden
  }
  return b.log.slice(from);
}
const branded = (c: Combatant) => c.statuses.find((s) => s.kind === 'branded');

describe('Ley Brand: veri', () => {
  it('Drain Field yerine Ley Brand: aynı id, alan 3x3, menzil 4, bedel / cooldown aynı, Silence skill\'de yok', () => {
    const sk = content.skills.drain_field!;
    expect(sk.name).toBe('Ley Brand');
    expect(sk.area).toMatchObject({ rows: 3, cols: 3 });
    expect(sk.range).toBe(4);
    expect(sk.cost.amount).toBe(14);
    expect(sk.cooldown).toBe(3);
    expect(sk.effects.some((e) => e.type === 'manaBurn')).toBe(false);
    expect(BRAND.turns).toBe(3);
    expect(content.statuses.branded?.type).toBe('debuff');
    expect(content.statuses.branded?.cc).toBeFalsy();
  });
});

describe('Ley Brand: MP havuzu olmayan düşman', () => {
  it('maks canın taintPct\'i kadar DOLU tainted mana alır; harcayamaz, MP kazanamaz', () => {
    const b = make({ 0: 'warrior' });
    const foe = noMp(E(b));
    const evs = brand(b);
    const pool = Math.round(foe.maxHp * BRAND.taintPct);
    expect(branded(foe)?.turns).toBe(BRAND.turns);
    expect(foe.taint).toBe(pool);
    expect(foe.maxMp).toBe(pool);
    expect(foe.mp).toBe(pool);
    expect(evs.some((e) => e.type === 'taint' && e.target === foe.uid && e.mp === pool && !e.ended)).toBe(true);
    expect(b.mpRoom(foe)).toBe(0);
  });

  it('MP bedelli skill tainted mana ile kullanılamaz', () => {
    const b = make({ 0: 'mage' });
    const foe = E(b);
    const fireBolt = foe.skills.find((id) => (b.skill(id, foe.uid)?.cost.amount ?? 0) > 0 && b.skill(id, foe.uid)!.cost.resource === 'mp')!;
    foe.maxMp = 0;
    foe.mp = 0;
    brand(b);
    expect(foe.mp).toBeGreaterThan(0);
    expect(b.canUse(foe.uid, fireBolt)).toMatchObject({ ok: false, reason: 'Tainted mana' });
  });

  it('ölünce havuz silinir (maxMp 0)', () => {
    const b = make({ 0: 'warrior' });
    const foe = noMp(E(b));
    brand(b);
    foe.hp = 1;
    steal(b, foe);
    expect(foe.hp).toBe(0);
    expect(foe.taint).toBeUndefined();
    expect(foe.maxMp).toBe(0);
  });

  it('Brand silinince (dispel) havuz eylem sonunda silinir, patlamaz', () => {
    const b = make({ 0: 'warrior', 1: 'mage' });
    const foe = noMp(E(b, 0));
    const healer = E(b, 1);
    brand(b);
    healer.mp = healer.maxMp;
    const from = b.log.length;
    const r = b.useSkill(healer.uid, 'mana_barrier', foe.uid);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const evs = b.log.slice(from);
    expect(branded(foe)).toBeUndefined();
    expect(foe.taint).toBeUndefined();
    expect(foe.maxMp).toBe(0);
    expect(evs.some((e) => e.type === 'taint' && e.target === foe.uid && e.ended && e.cause === 'removed')).toBe(true);
    expect(evs.some((e) => e.type === 'damage' && e.target === foe.uid && e.status === 'branded')).toBe(false);
  });

  it('yeniden atış süreyi tazeler, havuzu DOLDURMAZ', () => {
    const b = make({ 0: 'warrior' });
    const foe = noMp(E(b));
    brand(b);
    foe.mp = 7;
    branded(foe)!.turns = 1;
    brand(b);
    expect(branded(foe)?.turns).toBe(BRAND.turns);
    expect(foe.mp).toBe(7);
    expect(foe.maxMp).toBe(foe.taint);
  });

  it('Mana Steal tainted mana\'yı çalar; yanan MP x burnDamagePct büyü hasarı (isabet/kritik yok, büyü zırhı işler)', () => {
    const b = make({ 0: 'warrior' });
    const foe = noMp(E(b));
    brand(b);
    const evs = steal(b, foe);
    const burn = evs.find((e) => e.type === 'manaBurn' && e.target === foe.uid) as Extract<BattleEvent, { type: 'manaBurn' }>;
    expect(burn.amount).toBeGreaterThan(0);
    const hit = evs.find((e) => e.type === 'damage' && e.target === foe.uid && e.status === 'branded') as Extract<BattleEvent, { type: 'damage' }>;
    expect(hit).toBeDefined();
    expect(hit.crit).toBe(false);
    expect(hit.source).toBe(P(b).uid);
    expect(hit.amount + hit.absorbed).toBe(b.tickDamage(BRAND.element ?? 'arcane', 'magic', Math.round(burn.amount * BRAND.burnDamagePct), foe));
  });

  it('Brand\'siz hedefte yakım hasarı yok (eski kural aynı)', () => {
    const b = make({ 0: 'mage' });
    const foe = E(b);
    foe.mp = foe.maxMp;
    const evs = steal(b, foe);
    expect(evs.some((e) => e.type === 'damage' && e.status === 'branded')).toBe(false);
  });

  it('Void Strike eksik tainted mana\'yı sayar (çalmadan sonra hasar artar)', () => {
    const b = make({ 0: 'warrior' });
    const foe = noMp(E(b));
    const me = P(b);
    const vs = (): number => previewForTargets(b, me, 'void_strike', [foe])[0]!.damage!.min;
    const before = vs();
    brand(b);
    branded(foe)!.brand!.markPct = 0; // işaret (markDamagePct) ayrı testte; burada yalnızca eksik mana kuralı
    const full = vs();
    expect(full).toBe(before); // havuz dolu: eksik mana 0
    steal(b, foe);
    expect(foe.mp).toBeLessThan(foe.maxMp);
    expect(vs()).toBeGreaterThan(full);
  });

  it('süre doğal bitince kalan tainted mana x explodePct patlar (damgalayan kaynak), havuz silinir (turns modu)', () => {
    const b = make({ 0: 'warrior' }, 5, 'turns');
    const foe = noMp(E(b));
    const me = P(b);
    for (let i = 0; i < 30 && b.currentActor !== me; i++) expect(b.skipTurn().ok).toBe(true);
    brand(b);
    const left = foe.mp;
    branded(foe)!.turns = 1;
    const from = b.log.length;
    // düşmanın SIRADAKİ tur başı (şu an onun turuysa önce bu tur biter)
    let n = 0;
    do expect(b.skipTurn().ok).toBe(true);
    while (b.currentActor !== foe && ++n < 30);
    const evs = b.log.slice(from);
    const hit = evs.find((e) => e.type === 'damage' && e.target === foe.uid && e.status === 'branded') as Extract<BattleEvent, { type: 'damage' }>;
    expect(hit?.source).toBe(me.uid);
    expect(hit.amount + hit.absorbed).toBe(b.tickDamage('arcane', 'magic', Math.round(left * BRAND.explodePct), foe));
    expect(evs.some((e) => e.type === 'taint' && e.target === foe.uid && e.ended && e.cause === 'expired')).toBe(true);
    expect(foe.taint).toBeUndefined();
    expect(foe.maxMp).toBe(0);
    expect(branded(foe)).toBeUndefined();
  });

  it('tainted mana tur başı MP yenilenmesi almaz (turns modu)', () => {
    const b = make({ 0: 'warrior' }, 5, 'turns');
    const foe = noMp(E(b));
    foe.stats.mpRegen = 9;
    const me = P(b);
    for (let i = 0; i < 30 && b.currentActor !== me; i++) expect(b.skipTurn().ok).toBe(true);
    brand(b);
    foe.mp = 3;
    let n = 0;
    do expect(b.skipTurn().ok).toBe(true);
    while (b.currentActor !== foe && ++n < 30);
    expect(foe.mp).toBe(3);
  });
});

describe('Ley Brand: MP havuzu olan düşman', () => {
  it('MP bedelleri costMult katı (yukarı yuvarlanır); havuz eklenmez', () => {
    const b = make({ 0: 'mage' });
    const foe = E(b);
    const maxMp = foe.maxMp;
    const sk = foe.skills.map((id) => b.skill(id, foe.uid)!).find((s) => s.cost.resource === 'mp' && s.cost.amount > 0)!;
    const base = skillCostAmount(sk.cost, foe);
    brand(b);
    expect(foe.taint).toBeUndefined();
    expect(foe.maxMp).toBe(maxMp);
    expect(skillCostAmount(sk.cost, foe)).toBe(Math.ceil(base * BRAND.costMult));
  });

  it('MP havuzu olup MP\'si 0 olan düşman tainted mana ALMAZ; Void Strike eksik mana eki aynı kalır', () => {
    const b = make({ 0: 'mage' });
    const foe = E(b);
    foe.mp = 0;
    const me = P(b);
    const maxMp = foe.maxMp;
    const vs = (): number => previewForTargets(b, me, 'void_strike', [foe])[0]!.damage!.min;
    const before = vs();
    const evs = brand(b);
    expect(branded(foe)).toBeDefined();
    branded(foe)!.brand!.markPct = 0; // işaret ayrı testte
    expect(foe.taint).toBeUndefined();
    expect(foe.mp).toBe(0);
    expect(foe.maxMp).toBe(maxMp);
    expect(evs.some((e) => e.type === 'taint')).toBe(false);
    expect(vs()).toBe(before);
  });

  it('Mana Steal Branded büyücüden yaktığı MP kadar ek hasar verir', () => {
    const b = make({ 0: 'mage' });
    const foe = E(b);
    foe.mp = foe.maxMp;
    brand(b);
    const evs = steal(b, foe);
    expect(evs.some((e) => e.type === 'damage' && e.target === foe.uid && e.status === 'branded')).toBe(true);
  });
});

describe('Ley Brand: boss ve belirlilik', () => {
  it('boss da Branded olur (CC değil)', () => {
    const b = make({ 0: 'warrior' });
    const foe = noMp(E(b));
    foe.tier = 'boss';
    brand(b);
    expect(branded(foe)).toBeDefined();
    expect(foe.taint).toBeGreaterThan(0);
  });

  it('aynı seed + aynı hamleler = birebir aynı olay akışı (iki mod)', () => {
    for (const mode of ['test', 'turns'] as const) {
      const run = (): string => {
        const b = make({ 0: 'warrior', 1: 'mage' }, 7, mode);
        noMp(E(b, 0));
        const me = P(b);
        for (let i = 0; i < 30 && mode === 'turns' && b.currentActor !== me; i++) b.skipTurn();
        brand(b);
        if (mode === 'test') steal(b, E(b, 0));
        else for (let i = 0; i < 12; i++) b.skipTurn();
        return JSON.stringify(b.log);
      };
      expect(run(), mode).toBe(run());
    }
  });
});

// Ömer 2026-10-29 (open-questions 444): bedel yakımı (castBurnPct) + işaret (markDamagePct: Mana Steal / Void Strike Branded hedefe fazla hasar). Sayılar veriden.
describe('Ley Brand: bedel yakımı (castBurnPct)', () => {
  const cast = (b: Battle, foe: Combatant): { evs: BattleEvent[]; paid: number } => {
    const me = P(b);
    const sk = b.skill('fire_bolt', foe.uid)!;
    const paid = skillCostAmount(sk.cost, foe);
    foe.cooldowns.fire_bolt = 0;
    const from = b.log.length;
    const r = b.useSkill(foe.uid, 'fire_bolt', me.uid);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    return { evs: b.log.slice(from), paid };
  };

  it('veri: castBurnPct ve markDamagePct (Mana Steal + Void Strike) brand etkisinde; skill\'de Silence yok', () => {
    expect(BRAND.castBurnPct).toBeGreaterThan(0);
    expect(BRAND.markDamagePct).toBeGreaterThan(0);
    expect(BRAND.markSkills).toEqual(['mana_burn', 'void_strike']);
    expect(BRAND.silenceOnEmpty).toBeUndefined();
  });

  it('Branded birim MP skill kullanınca (costMult\'lu) bedelin castBurnPct\'i kadar EK MP yakar; yanan MP burnDamagePct hasar (damgalayandan)', () => {
    const b = make({ 0: 'mage' });
    const foe = E(b);
    brand(b);
    foe.mp = foe.maxMp;
    const { evs, paid } = cast(b, foe);
    const burn = Math.round(paid * BRAND.castBurnPct!);
    const mb = evs.find((e) => e.type === 'manaBurn' && e.target === foe.uid) as Extract<BattleEvent, { type: 'manaBurn' }>;
    expect(mb?.amount).toBe(burn);
    expect(mb.source).toBe(P(b).uid);
    expect(evs.some((e) => e.type === 'passive' && e.actor === foe.uid && e.name === 'Brand Burn')).toBe(true);
    const hit = evs.find((e) => e.type === 'damage' && e.target === foe.uid && e.status === 'branded') as Extract<BattleEvent, { type: 'damage' }>;
    expect(hit?.source).toBe(P(b).uid);
    expect(hit.crit).toBe(false);
    expect(hit.amount + hit.absorbed).toBe(b.tickDamage(BRAND.element ?? 'arcane', 'magic', Math.round(burn * BRAND.burnDamagePct), foe));
  });

  it('MP yetmezse kalanı yakar', () => {
    const b = make({ 0: 'mage' });
    const foe = E(b);
    brand(b);
    const paid = skillCostAmount(b.skill('fire_bolt', foe.uid)!.cost, foe);
    foe.mp = paid + 2;
    const { evs } = cast(b, foe);
    const mb = evs.find((e) => e.type === 'manaBurn' && e.target === foe.uid) as Extract<BattleEvent, { type: 'manaBurn' }>;
    expect(Math.round(paid * BRAND.castBurnPct!)).toBeGreaterThan(2);
    expect(mb?.amount).toBe(2);
  });

  it('Brand\'siz birimde ek yakım yok (eski kural aynı)', () => {
    const b = make({ 0: 'mage' });
    const foe = E(b);
    foe.mp = foe.maxMp;
    const { evs } = cast(b, foe);
    expect(evs.some((e) => e.type === 'manaBurn' && e.target === foe.uid)).toBe(false);
    expect(evs.some((e) => e.type === 'damage' && e.status === 'branded')).toBe(false);
  });

  it('önizleme: Branded kullanıcının girdisinde yanacak MP ve kendine hasar', () => {
    const b = make({ 0: 'mage' });
    const foe = E(b);
    brand(b);
    foe.mp = foe.maxMp;
    const paid = skillCostAmount(b.skill('fire_bolt', foe.uid)!.cost, foe);
    const self = previewForTargets(b, foe, 'fire_bolt', [P(b)]).find((p) => p.uid === foe.uid);
    const mp = Math.round(paid * BRAND.castBurnPct!);
    expect(self?.castBurn).toEqual({ mp, damage: b.tickDamage(BRAND.element ?? 'arcane', 'magic', Math.round(mp * BRAND.burnDamagePct), foe) });
  });
});

describe('Ley Brand: işaret (markDamagePct)', () => {
  const avg = (b: Battle, id: string, foe: Combatant): number => previewForTargets(b, P(b), id, [foe]).find((p) => p.uid === foe.uid)!.damage!.avg;

  it('Mana Steal ve Void Strike Branded hedefe x(1 + markDamagePct) hasar (önizleme = vuruş yolu: dealtDamageMult)', () => {
    const b = make({ 0: 'mage' });
    const foe = E(b);
    foe.hp = foe.maxHp = 5000;
    foe.mp = foe.maxMp;
    const before = { ms: avg(b, 'mana_burn', foe), vs: avg(b, 'void_strike', foe) };
    const me = P(b);
    expect(b.dealtDamageMult(me, foe, b.skill('void_strike', me.uid))).toBe(1);
    brand(b);
    foe.mp = foe.maxMp;
    expect(b.dealtDamageMult(me, foe, b.skill('void_strike', me.uid))).toBeCloseTo(1 + BRAND.markDamagePct!, 9);
    expect(b.dealtDamageMult(me, foe, b.skill('mana_burn', me.uid))).toBeCloseTo(1 + BRAND.markDamagePct!, 9);
    expect(b.dealtDamageMult(me, foe, b.skill('drain_field', me.uid))).toBe(1);
    expect(avg(b, 'mana_burn', foe) / before.ms).toBeCloseTo(1 + BRAND.markDamagePct!, 1);
    expect(avg(b, 'void_strike', foe) / before.vs).toBeCloseTo(1 + BRAND.markDamagePct!, 1);
  });

  it('açıklama: bedel yakımı ve "X% more damage" (adlarla)', () => {
    const info = describeSkill(content.skills.drain_field!, P(make({ 0: 'mage' })).stats, content.formulas, content.summons, { statuses: content.statuses, grounds: content.grounds, skills: content.skills });
    const text = JSON.stringify(info);
    expect(text).toContain(`Mana Steal and Void Strike deal ${Math.round(BRAND.markDamagePct! * 100)}% more damage to Branded enemies`);
    expect(text).toContain(`extra MP equal to ${Math.round(BRAND.castBurnPct! * 100)}% of the MP it paid`);
  });
});
