import { describe, expect, it } from 'vitest';
import { Battle, content, describeSkill, explainChoice, previewSkill } from '../src/engine';
import type { AiConfig, BattleEvent, Combatant, Teams, UnitSetup } from '../src/engine';
import { compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take } from '../src/progression/skill-tree';

/**
 * Close Ranks aura payı (Ömer 2026-11-18): Close Ranks'in Guard verdiği dost, Guard sürdükçe Defender'ın Bulwark Aura (armorAura) anlık payının
 * auraShare katını alır (pasif %40 x 0,25 = Defender zırhının %10'u). Komşu olup aurayı zaten alan dost iki kez almaz (büyük olan); Defender düşünce kalkar.
 * Sayılar veriden: data/skills.json > close_ranks (guard.auraShare), data/classes/defender.json > passive.effect.pct.
 */

const cells = (map: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => map[i] ?? '');
const guardFx = () => content.skills.close_ranks!.effects.find((e) => e.type === 'guard') as { auraShare: number; share: number; turns: number };
const auraPct = () => (content.classes.defender!.passive!.effect as { pct: number }).pct;
const at = (b: Battle, side: 'party' | 'enemy', slot: number): Combatant => b.combatants.find((c) => c.side === side && c.slot === slot)!;
const make = (party: Record<number, string>, mode: 'test' | 'turns' = 'test', units: Record<number, UnitSetup> = {}) => {
  const teams: Teams = { party: cells(party), enemies: cells({ 0: 'warrior', 1: 'warrior', 2: 'warrior' }), units: { party: units, enemies: {} } };
  const b = new Battle(content.battleSetup('random-battle', 3, mode, teams, false));
  for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0 });
  b.debug.crit = 'never';
  return b;
};
const cast = (b: Battle, actor: Combatant, target: Combatant): BattleEvent[] => {
  actor.cooldowns.close_ranks = 0;
  actor.mp = actor.maxMp;
  const r = b.useSkill(actor.uid, 'close_ranks', target.uid);
  if (!r.ok) throw new Error(`close_ranks: ${r.reason}`);
  return r.events;
};
// Ön sıra (0): 0 Defender, 1 Warrior (komşu), 2 Archer (komşu DEĞİL; aynı sıra)
const PARTY = { 0: 'defender', 1: 'warrior', 2: 'archer' };

describe('Close Ranks aura payı', () => {
  it('veri: auraShare 0,25; cooldown 4; Defender canı 160', () => {
    expect(guardFx().auraShare).toBe(0.25);
    expect(content.skills.close_ranks!.cooldown).toBe(4);
    expect(content.classes.defender!.overrides?.hp).toBe(160);
  });

  for (const mode of ['test', 'turns'] as const) {
    it(`${mode}: komşu olmayan Guard'lı dost aura payının auraShare katını alır; komşu dost tam payı alır (iki kez değil)`, () => {
      const b = make(PARTY, mode);
      const def = at(b, 'party', 0);
      const war = at(b, 'party', 1);
      const arc = at(b, 'party', 2);
      if (mode === 'turns') for (let i = 0; i < 300 && b.currentUid !== def.uid; i++) b.skipTurn();
      expect(b.auraArmor(arc)).toBe(0);
      const warBefore = b.auraArmor(war);
      expect(warBefore).toBeCloseTo(def.stats.armor * auraPct(), 6);
      cast(b, def, war);
      expect(arc.statuses.find((s) => s.kind === 'guard')).toMatchObject({ source: def.uid, auraShare: guardFx().auraShare });
      // pasif %40 x 0,25 = Defender zırhının %10'u
      expect(b.auraArmor(arc)).toBeCloseTo(def.stats.armor * auraPct() * guardFx().auraShare, 6);
      expect(b.effectiveStats(arc).armor - arc.stats.armor).toBeCloseTo(def.stats.armor * auraPct() * guardFx().auraShare, 6);
      // komşu Warrior: tam aura, Guard payı üstüne eklenmez
      expect(b.auraArmor(war)).toBeCloseTo(warBefore, 6);
    });
  }

  it('Guard bitince (ya da paysız bir Guard yerine geçince) bonus kalkar', () => {
    const b = make(PARTY);
    const def = at(b, 'party', 0);
    const arc = at(b, 'party', 2);
    cast(b, def, at(b, 'party', 1));
    expect(b.auraArmor(arc)).toBeGreaterThan(0);
    arc.statuses = arc.statuses.filter((s) => s.kind !== 'guard');
    expect(b.auraArmor(arc)).toBe(0);
    // payı olmayan Guard (ör. başka bir koruma) bonus vermez
    arc.statuses.push({ kind: 'guard', turns: 3, source: def.uid, share: 0.5 });
    expect(b.auraArmor(arc)).toBe(0);
  });

  it('Guard süresi dolunca (turns modu, taşıyanın kendi turları) bonus kalkar', () => {
    const b = make(PARTY, 'turns');
    const def = at(b, 'party', 0);
    const arc = at(b, 'party', 2);
    for (let i = 0; i < 300 && b.currentUid !== def.uid; i++) b.skipTurn();
    cast(b, def, at(b, 'party', 1));
    expect(b.auraArmor(arc)).toBeGreaterThan(0);
    for (let i = 0; i < 300 && arc.statuses.some((s) => s.kind === 'guard'); i++) b.skipTurn();
    expect(arc.statuses.some((s) => s.kind === 'guard')).toBe(false);
    expect(b.auraArmor(arc)).toBe(0);
  });

  it('Defender düşünce bonus kalkar (Guard durumu kalsa da); dirilirse Guard sürdükçe geri gelir', () => {
    const b = make(PARTY);
    const def = at(b, 'party', 0);
    const arc = at(b, 'party', 2);
    cast(b, def, at(b, 'party', 1));
    const gained = b.auraArmor(arc);
    expect(gained).toBeGreaterThan(0);
    def.hp = 0;
    expect(b.auraArmor(arc)).toBe(0);
    def.hp = def.maxHp;
    expect(b.auraArmor(arc)).toBeCloseTo(gained, 6);
  });

  it('ağaç aura payını artırınca (Tight Formation) Guard payı onunla ölçeklenir', () => {
    const D = treeOf('defender')!;
    // Tight Formation (0.f3) önkoşulu: aynı daldan önceki 4 puan
    let a = emptyAlloc(D);
    for (const k of ['0.f1', '0.f1', '0.f1', '0.f2', '0.f3']) {
      const r = take(D, 30, a, k);
      if (!r.ok) throw new Error(k);
      a = r.alloc;
    }
    const tree = compileTree(D, a)!;
    const b = make(PARTY, 'test', { 0: { tree } });
    const def = at(b, 'party', 0);
    const war = at(b, 'party', 1);
    const arc = at(b, 'party', 2);
    cast(b, def, war);
    // komşu Warrior'ın tam payı ağaçla %40'ın üstünde; Archer'ınki onun auraShare katı
    expect(b.auraArmor(war)).toBeGreaterThan(def.stats.armor * auraPct() + 1e-6);
    expect(b.auraArmor(arc)).toBeCloseTo(b.auraArmor(war) * guardFx().auraShare, 6);
  });

  it('metin + önizleme: açıklama payı yazar, önizleme komşu olmayan dosta "+N armor while guarded" gösterir', () => {
    const b = make(PARTY);
    const def = at(b, 'party', 0);
    const text = describeSkill(content.skills.close_ranks!, def.stats, content.formulas).lines.join(' ');
    expect(text).toContain(`gain ${Math.round(guardFx().auraShare * 100)}% of its armor bonus`);
    const pv = previewSkill(b, def.uid, 'close_ranks', at(b, 'party', 1).uid);
    const n = Math.round(def.stats.armor * auraPct() * guardFx().auraShare);
    expect(pv.find((p) => p.uid === at(b, 'party', 2).uid)!.statuses).toContain(`+${n} armor while guarded`);
    expect(pv.find((p) => p.uid === at(b, 'party', 1).uid)!.statuses?.some((s) => s.includes('while guarded'))).toBe(false);
  });

  it('YZ: Close Ranks değeri yeni zırhı sayar (komşu olmayanda terim var, yalnız komşuda yok; paysız 0)', () => {
    const ai: AiConfig = { ...content.aiConfig, global: undefined };
    const b = make(PARTY);
    const def = at(b, 'party', 0);
    const war = at(b, 'party', 1);
    const arc = at(b, 'party', 2);
    expect(b.guardAuraGain(def, arc, guardFx().auraShare)).toBeCloseTo(def.stats.armor * auraPct() * guardFx().auraShare, 6);
    expect(b.guardAuraGain(def, war, guardFx().auraShare)).toBe(0);
    expect(b.guardAuraGain(def, arc, 0)).toBe(0);
    def.cooldowns.close_ranks = 0;
    def.mp = def.maxMp;
    const cands = explainChoice(b, def.uid, ai)!.candidates.filter((c) => c.skill === 'close_ranks');
    expect(cands.some((c) => (c.notes ?? []).some((n) => n.startsWith('guard aura armor')))).toBe(true);
    // yalnız komşu dost: terim yok
    const b2 = make({ 0: 'defender', 1: 'warrior' });
    const d2 = at(b2, 'party', 0);
    d2.cooldowns.close_ranks = 0;
    const c2 = explainChoice(b2, d2.uid, ai)!.candidates.filter((c) => c.skill === 'close_ranks');
    expect(c2.some((c) => (c.notes ?? []).some((n) => n.startsWith('guard aura armor')))).toBe(false);
  });
});
