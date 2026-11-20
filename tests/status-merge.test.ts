/**
 * Ömer 2026-11-16 (form Tur 23): aynı işi yapan iki modifier birlikte durmaz (istisna: Quenched / Cooling). Birleşen durumlar, örnek gücü
 * (Status.strength), eski id taşıması ve yeni DoT kuralları (Bleeding hareket tiki, Poisoned yığını, Wither emişi, Searing buff silmesi).
 * Sayılar veriden okunur (data/statuses.json, data/grounds.json, data/skills.json).
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice } from '../src/engine';
import type { BattleEvent, Combatant, Status } from '../src/engine';
import { aiCoverageInternals as AC } from '../src/engine/ai';
import { DEFAULT_VALUE, ValueContext } from '../src/engine/ai-value';
import { STATUS_NAME_OVERRIDE } from '../src/engine/skill-info';
import { STATUS_ALIASES, migrateStatus, scaleDelta, scaleMult } from '../src/engine/status-stack';
import { cleanCarry } from '../src/endless/carry';

const S = content.statuses;
const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
type Priv = {
  addStatus(c: Combatant, s: Status, emit: (e: BattleEvent) => void): void;
  tickStatusOnce(c: Combatant, s: Status, emit: (e: BattleEvent) => void): void;
  tickDispel(c: Combatant, s: Status, emit: (e: BattleEvent) => void): void;
  debugEmit: (e: BattleEvent) => void;
};
const priv = (b: Battle) => b as unknown as Priv;
function mk(party: Record<number, string>, enemies: Record<number, string>, mode: 'turns' | 'test' = 'test', seed = 1): Battle {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells(enemies) }, false));
  b.debugClearCooldowns();
  for (const c of b.combatants) {
    Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0, surviveChance: 0, resilience: 0 });
    c.hp = c.maxHp = 5000;
  }
  return b;
}
const add = (b: Battle, c: Combatant, s: Status) => priv(b).addStatus(c, s, priv(b).debugEmit);
const P = (b: Battle) => b.combatants.find((c) => c.side === 'party')!;
const E = (b: Battle) => b.combatants.find((c) => c.side === 'enemy')!;
const vc = () => ({ ...DEFAULT_VALUE, ...(content.aiConfig.value ?? {}) });
const ctxOf = (b: Battle, actor: Combatant) => new ValueContext(b, actor, vc(), (c) => content.aiConfig.profiles[c.ai ?? content.aiConfig.defaultProfile]?.focus ?? 'lowest_ratio');

describe('birleşen durumlar: veri', () => {
  it('eski durumlar silindi, adları taşıma tablosunda; Slow id\'si Hobbled adıyla kalır', () => {
    for (const id of ['fleet', 'shaken', 'staggered', 'overreached', 'blood_cursed', 'shredded']) {
      expect(S[id], id).toBeUndefined();
      const to = STATUS_ALIASES[id]!;
      expect(S[to.kind], id).toBeDefined();
    }
    expect(S.slow!.name).toBe('Hobbled');
    expect(STATUS_NAME_OVERRIDE.slow).toBe(S.slow!.name);
  });

  it('tek iş tek durumda: hız yalnız Chilled, kaçınma kesme yalnız Hobbled, kritik kesme yalnız Jinxed', () => {
    const speedDown = Object.entries(S).filter(([, d]) => d.type === 'debuff' && (d.speedMult ?? 1) < 1).map(([id]) => id);
    expect(speedDown).toEqual(['chilled']);
    const evaDown = Object.entries(S).filter(([, d]) => d.type === 'debuff' && ((d.evasionMult ?? 1) < 1 || d.noEvasion)).map(([id]) => id);
    expect(evaDown).toEqual(['slow']);
    expect(S.jinxed!.accuracyDelta).toBeUndefined();
    expect(S.jinxed!.critDelta).toBeLessThan(0);
    expect(S.blessed!.damageTakenMult).toBeUndefined();
    expect(S.blessed!.magicTakenMult).toBeLessThan(1);
    expect(S.fortify!.damageTakenMult).toBeLessThan(1);
  });
});

describe('örnek gücü (Status.strength) ve eski id taşıması', () => {
  it('migrateStatus: Fleet -> yarım Shrouded, Shaken -> 1/3 Blinded, Staggered -> Stun, Blood Cursed -> 1,4 Wound, Shredded -> Sunder', () => {
    expect(migrateStatus({ kind: 'fleet', turns: 2, source: 'x' } as unknown as Status)).toMatchObject({ kind: 'shrouded', strength: 0.5, turns: 2 });
    expect(migrateStatus({ kind: 'shaken', turns: 1, source: 'x' } as unknown as Status)).toMatchObject({ kind: 'blinded', strength: 0.333 });
    expect(migrateStatus({ kind: 'staggered', turns: 1, source: 'x' } as unknown as Status).kind).toBe('stun');
    expect(migrateStatus({ kind: 'blood_cursed', turns: 1, source: 'x' } as unknown as Status)).toMatchObject({ kind: 'wound', strength: 1.4 });
    expect(migrateStatus({ kind: 'shredded', turns: 1, source: 'x' } as unknown as Status).kind).toBe('sunder');
    const same = { kind: 'slow', turns: 1, source: 'x' } as Status;
    expect(migrateStatus(same)).toEqual(same);
  });

  it('kayıt taşıması (Endless carry): eski id yeni duruma döner', () => {
    const c = cleanCarry({ statuses: [{ kind: 'fleet', turns: 2, source: 'party-0' }] })!;
    expect(c.statuses).toEqual([expect.objectContaining({ kind: 'shrouded', strength: 0.5 })]);
  });

  it('güç tanım değerine uygulanır: yarım Shrouded +%10 kaçınma, 1/3 Blinded -%10 isabet; boss ölçeği güçten sonra', () => {
    const b = mk({ 0: 'archer' }, { 0: 'warrior' });
    const me = P(b);
    me.stats.evasion = 0.1;
    add(b, me, { kind: 'shrouded', turns: 2, source: me.uid, strength: 0.5 });
    expect(b.effectiveStats(me).evasion).toBeCloseTo(0.1 + scaleDelta(S.shrouded!.evasionDelta!, 0.5), 6);
    // tam Shrouded zayıfı ezer (refresh-strongest), zayıf güçlüyü ezmez
    add(b, me, { kind: 'shrouded', turns: 1, source: me.uid });
    expect(me.statuses.filter((s) => s.kind === 'shrouded')).toHaveLength(1);
    expect(b.effectiveStats(me).evasion).toBeCloseTo(0.1 + S.shrouded!.evasionDelta!, 6);
    add(b, me, { kind: 'shrouded', turns: 3, source: me.uid, strength: 0.5 });
    expect(b.effectiveStats(me).evasion).toBeCloseTo(0.1 + S.shrouded!.evasionDelta!, 6);
    const boss = mk({ 0: 'archer' }, { 0: 'warrior' });
    const e = E(boss);
    e.tier = 'boss';
    e.stats.accuracy = 1;
    add(boss, e, { kind: 'blinded', turns: 2, source: P(boss).uid, strength: 0.333 });
    const k = content.formulas.ccImmunity!.debuffStrength!.boss!;
    expect(boss.effectiveStats(e).accuracy).toBeCloseTo(1 + scaleDelta(S.blinded!.accuracyDelta!, 0.333) * k, 6);
  });

  it('Exposed: karşı vuruşlara kritik şansı eki; boss %25 güçle', () => {
    for (const tier of [undefined, 'boss'] as const) {
      const b = mk({ 0: 'warrior' }, { 0: 'warrior' });
      const e = E(b);
      if (tier) e.tier = tier;
      const base = b.critVs(P(b), e);
      add(b, e, { kind: 'exposed', turns: 1, source: P(b).uid });
      const k = tier ? content.formulas.ccImmunity!.debuffStrength!.boss! : 1;
      expect(b.critVs(P(b), e)).toBeCloseTo(base + S.exposed!.critTakenDelta! * k, 6);
      expect(b.statusMult(e, 'damageTakenMult')).toBe(1);
    }
  });

  it('Wound: skill %50, Blood Curse zemini 1,4 güç (%70); scaleMult veriden', () => {
    expect(scaleMult(S.wound!.healTakenMult!, content.grounds.blood_curse!.statusStrength!)).toBeCloseTo(0.3, 6);
    const b = mk({ 0: 'druid' }, { 0: 'warrior' });
    add(b, E(b), { kind: 'wound', turns: 2, source: P(b).uid });
    expect(b.statusMult(E(b), 'healTakenMult')).toBeCloseTo(S.wound!.healTakenMult!, 6);
  });
});

describe('yeni DoT kuralları', () => {
  for (const mode of ['test', 'turns'] as const) {
    it(`Bleeding: kendi hareketinin turunda bir ek tik (moveTickMult); hareketsiz turda yok (${mode})`, () => {
      const extra = Math.round(S.bleeding!.moveTickMult! - 1);
      expect(extra).toBeGreaterThan(0);
      const bleedHits = (move: boolean): number => {
        const b = mk({ 0: 'warrior' }, { 0: 'warrior' }, mode, 3);
        const me = P(b);
        if (mode === 'turns') for (let i = 0; i < 40 && b.currentUid !== me.uid; i++) b.skipTurn();
        expect(b.currentUid === me.uid || mode === 'test').toBe(true);
        me.statuses.push({ kind: 'bleeding', turns: 5, source: E(b).uid, amount: 20 });
        expect(b.moveBleedDamage(me)).toBe(extra * b.statusTickDamage(me, me.statuses.at(-1)!));
        const n = b.log.length;
        const r = move ? b.useGlobal(me.uid, 'move_tile', 1) : b.useSkill(me.uid, me.skills[0]!, E(b).uid);
        expect(r.ok, r.ok ? '' : r.reason).toBe(true);
        return b.log.slice(n).filter((e) => e.type === 'damage' && e.target === me.uid && (e as { status?: string }).status === 'bleeding').length;
      };
      expect(bleedHits(true)).toBe(extra);
      expect(bleedHits(false)).toBe(0);
    });
  }

  it('Poisoned yığılır (dotStacks sınırı); tik hasarı yığınla çarpılır', () => {
    const b = mk({ 0: 'undead' }, { 0: 'warrior' });
    const e = E(b);
    const cap = S.poisoned!.dotStacks!;
    add(b, e, { kind: 'poisoned', turns: 3, source: P(b).uid, amount: 10 });
    const one = b.statusTickDamage(e, e.statuses.find((s) => s.kind === 'poisoned')!);
    for (let i = 0; i < cap + 2; i++) add(b, e, { kind: 'poisoned', turns: 3, source: P(b).uid, amount: 10 });
    const st = e.statuses.filter((s) => s.kind === 'poisoned');
    expect(st).toHaveLength(1);
    expect(st[0]!.stacks).toBe(cap);
    expect(b.statusTickDamage(e, st[0]!)).toBe(one * cap);
  });

  it('Wither: tik hasarının drainToSource payı kaynağa şifa (lifesteal); kaynak ölüyse yok', () => {
    const b = mk({ 0: 'hexer' }, { 0: 'warrior' });
    const h = P(b);
    const e = E(b);
    h.hp = 1000;
    const st: Status = { kind: 'wither', turns: 3, source: h.uid, amount: 100 };
    e.statuses.push(st);
    const n = b.log.length;
    priv(b).tickStatusOnce(e, st, priv(b).debugEmit);
    const dmg = b.log.slice(n).filter((x): x is Extract<BattleEvent, { type: 'damage' }> => x.type === 'damage' && x.target === e.uid).reduce((t, x) => t + x.amount, 0);
    const heal = b.log.slice(n).find((x): x is Extract<BattleEvent, { type: 'heal' }> => x.type === 'heal' && x.target === h.uid);
    expect(dmg).toBeGreaterThan(0);
    expect(heal?.amount).toBe(Math.round(dmg * S.wither!.drainToSource!));
  });

  it('Searing: her tikte silinebilir bir buff silinir (en uzun kalan önce)', () => {
    const b = mk({ 0: 'paladin' }, { 0: 'warrior' });
    const e = E(b);
    e.statuses.push({ kind: 'fortify', turns: 2, source: e.uid }, { kind: 'haste', turns: 4, source: e.uid });
    const st: Status = { kind: 'searing', turns: 3, source: P(b).uid, amount: 10 };
    e.statuses.push(st);
    priv(b).tickDispel(e, st, priv(b).debugEmit);
    const left = e.statuses.filter((s) => S[s.kind]?.type === 'buff').map((s) => s.kind);
    expect(left).toHaveLength(2 - S.searing!.dispelBuffs!);
    expect(left).toEqual(['fortify']);
  });

  it('YZ: Searing buff\'lı hedefte daha değerli; Wither emişi eksik canla değerli; Bleeding hareketin bedeli', () => {
    const b = mk({ 0: 'paladin' }, { 0: 'warrior' });
    const ctx = ctxOf(b, P(b));
    const e = E(b);
    const bare = AC.statusEffectWorth(ctx, e, 'searing', 2);
    e.statuses.push({ kind: 'fortify', turns: 3, source: e.uid });
    expect(AC.statusEffectWorth(ctx, e, 'searing', 2)).toBeLessThan(bare);
    const me = P(b);
    me.statuses.push({ kind: 'bleeding', turns: 3, source: e.uid, amount: 20 });
    expect(b.moveBleedDamage(me)).toBeGreaterThan(0);
  });
});

describe('YZ değerleri: birleşen durumlar', () => {
  it('Bleeding: kanayan birimin kendi hareketi (cellDelta) ek tik kadar eksi; kanamasız 0', () => {
    const b = mk({ 0: 'warrior' }, { 0: 'warrior' });
    const me = P(b);
    const ctx = ctxOf(b, me);
    expect(AC.cellDelta(ctx, me, 'party', 1)).toBe(0);
    me.statuses.push({ kind: 'bleeding', turns: 3, source: E(b).uid, amount: 20 });
    expect(AC.cellDelta(ctxOf(b, me), me, 'party', 1)).toBeCloseTo(-b.moveBleedDamage(me), 6);
  });

  it('Wither emişi: kullanan yaralıyken Withering Curse curse terimi büyür, tam canda emiş 0', () => {
    const curse = (missing: boolean) => {
      const b = mk({ 4: 'hexer' }, { 0: 'warrior', 1: 'warrior' });
      b.freeMp = true;
      const h = P(b);
      if (missing) h.hp = Math.round(h.maxHp / 2);
      return Math.max(...explainChoice(b, h.uid, { ...content.aiConfig, global: undefined })!.candidates.filter((c) => c.skill === 'withering_curse').map((c) => c.terms?.curse ?? 0));
    };
    expect(curse(true)).toBeGreaterThan(curse(false));
  });

  it('Exposed / Sunder düşmana eksi (bizim kritik ve fiziksel kazancımız); Blessed dosta büyü saldıranlara karşı artı, fiziksele 0', () => {
    const b = mk({ 0: 'warrior', 1: 'archer' }, { 0: 'warrior' });
    for (const c of b.combatants) c.stats.critChance = 0.2;
    const ctx = ctxOf(b, P(b));
    const foe = E(b);
    foe.stats.armor = 30;
    expect(AC.statusEffectWorth(ctx, foe, 'exposed', 1)).toBeLessThan(0);
    expect(AC.statusEffectWorth(ctx, foe, 'sunder', 1)).toBeLessThan(0);
    const phys = mk({ 0: 'warrior' }, { 0: 'warrior' });
    expect(AC.statusEffectWorth(ctxOf(phys, P(phys)), P(phys), 'blessed', 2)).toBeCloseTo(0, 6);
    const mag = mk({ 0: 'warrior' }, { 0: 'mage' });
    expect(AC.statusEffectWorth(ctxOf(mag, P(mag)), P(mag), 'blessed', 2)).toBeGreaterThan(0);
  });

  it('Weakened fiziksel saldırana, Spellbound büyücüye değerli (kit payı)', () => {
    const w = mk({ 0: 'archer' }, { 0: 'warrior' });
    const m = mk({ 0: 'archer' }, { 0: 'mage' });
    const worth = (b: Battle, kind: string) => AC.statusEffectWorth(ctxOf(b, P(b)), E(b), kind, 1);
    expect(worth(w, 'weakened')).toBeLessThan(worth(m, 'weakened'));
    expect(worth(m, 'spellbound')).toBeLessThan(worth(w, 'spellbound'));
  });
});

describe('Staggered -> Stun: kendi turunda gelen 1 tur Stun sıradaki turunu yakar', () => {
  it('Lost in Smoke benzeri: kendi eyleminde Stun alan birim sonraki turunu oynamaz (turnSkipped stunned), sonra durum biter', () => {
    const b = mk({ 0: 'warrior' }, { 0: 'warrior' }, 'turns', 3);
    const me = P(b);
    for (let i = 0; i < 40 && b.currentUid !== me.uid; i++) b.skipTurn();
    expect(b.currentUid).toBe(me.uid);
    add(b, me, { kind: 'stun', turns: 1, source: E(b).uid }); // kendi turunda (eski Staggered gibi)
    expect(b.useSkill(me.uid, me.skills[0]!, E(b).uid).ok).toBe(true);
    const n = b.log.length;
    for (let i = 0; i < 40 && b.currentUid !== me.uid; i++) b.skipTurn();
    const ev = b.log.slice(n);
    expect(ev.some((e) => e.type === 'turnSkipped' && e.actor === me.uid && (e as { stunned?: boolean }).stunned)).toBe(true);
    expect(me.statuses.some((s) => s.kind === 'stun')).toBe(false);
  });
});
