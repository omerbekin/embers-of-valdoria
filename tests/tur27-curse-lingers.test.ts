/**
 * Ömer 2026-11-16 (form Tur 27): Unhallowed (Cursed Ground) = "Lanet uzar". +%35 karanlık hasar kalktı; taşıyana uygulanan her YENİ süreli
 * debuff statuses.json > unhallowed.debuffExtraTurns tur uzun sürer (Stun dahil). Hariç: Unhallowed'ın kendisi, zeminden gelen örnek, yığılan
 * (maxStacks: Omen), kuralla süren (untilResolved) ve kalıcı örnek. Tek kaynak Battle.curseExtraTurns (motor, YZ, önizleme). Sayılar veriden.
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice, previewSkill } from '../src/engine';
import type { AiConfig } from '../src/engine';
import type { BattleEvent, Combatant, CombatantDef } from '../src/engine';
import { aiCoverageInternals as AC } from '../src/engine/ai';
import { DEFAULT_VALUE, ValueContext } from '../src/engine/ai-value';
import { statusPercent, statusTipText } from '../src/game/status-pct';

const S = content.statuses;
const ai: AiConfig = { ...content.aiConfig, global: undefined };
const X = S['unhallowed']!.debuffExtraTurns!;
const MODES = ['turns', 'test'] as const;
const unitDef = (id: string): CombatantDef => (content.mobs[id] ?? content.summons[id] ?? content.classes[id])!;
function arena(party: [string, number][], enemies: [string, number][], mode: 'turns' | 'test' = 'test'): Battle {
  const base = content.battleSetup('random-battle', 1, mode, { party: [], enemies: [] }, false);
  const b = new Battle({ ...base, party: party.map(([id]) => unitDef(id)), partySlots: party.map(([, s]) => s), enemies: enemies.map(([id]) => unitDef(id)), enemySlots: enemies.map(([, s]) => s) });
  b.freeMp = true;
  b.noCooldowns = true;
  b.debug.crit = 'never';
  for (const c of b.combatants) {
    Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0, surviveChance: 0, resilience: 0, blockChance: 0 });
    c.hp = c.maxHp = 5000;
  }
  return b;
}
const P = (b: Battle, slot: number): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot)!;
const E = (b: Battle, slot: number): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const cast = (b: Battle, uid: string, skill: string, target?: string, slot?: number) => {
  lastB = b;
  b.currentUid = uid;
  const r = b.useSkill(uid, skill, target, slot);
  if (!r.ok) throw new Error(`${uid} ${skill}: ${r.reason}`);
};
const curse = (b: Battle, t: Combatant) => {
  expect(b.debugPlaceGround(P(b, 4).uid, 'cursed_ground', t.board, [t.slot], 3).ok).toBe(true);
  expect(t.statuses.some((s) => s.kind === 'unhallowed')).toBe(true);
};
/** Son uygulamanın süresi (status olayı; turns modunda sıra ilerleyince durumda sayaç düşmüş olabilir). */
let lastB: Battle | undefined;
const turnsOf = (t: Combatant, kind: string) => [...(lastB?.log ?? [])].reverse().find((e): e is Extract<BattleEvent, { type: 'status' }> => e.type === 'status' && e.target === t.uid && e.status === kind)?.turns;
const stunTurns = (content.skills.charge!.effects.find((e) => e.type === 'status' && e.status === 'stun') as { turns: number }).turns;
const jinxTurns = (content.skills.jinx!.effects.find((e) => e.type === 'status') as { turns: number }).turns;
const witherTurns = (content.skills.withering_curse!.effects.find((e) => e.type === 'dot') as { turns: number }).turns;

describe('Tur 27 veri', () => {
  it('Unhallowed karanlık hasar çarpanı yok, ek tur var; metinler +%35 demiyor', () => {
    expect(X).toBeGreaterThan(0);
    expect(S['unhallowed']!.elementTakenMult).toBeUndefined();
    expect(S['unhallowed']!.text).not.toContain('35%');
    const cursedTexts = Object.entries(content.grounds).map(([id, g]) => [id, (g as { text?: string }).text ?? ''] as const).filter(([, t]) => t.includes('Unhallowed'));
    expect(cursedTexts.length).toBeGreaterThan(1);
    for (const [id, t] of cursedTexts) expect(t, id).not.toContain('Dark damage');
  });
});

describe('Lanet uzar (motor, iki mod)', () => {
  for (const mode of MODES) {
    it(`${mode}: Unhallowed hedefte Stun ve Jinxed +ek tur; laneti olmayan hedefte aynı`, () => {
      const b = arena([['warrior', 0], ['hexer', 4]], [['warrior', 0], ['warrior', 1]], mode);
      const cursed = E(b, 0);
      const plain = E(b, 1);
      curse(b, cursed);
      cast(b, P(b, 0).uid, 'charge', cursed.uid);
      expect(turnsOf(cursed, 'stun'), mode).toBe(stunTurns + X);
      cast(b, P(b, 4).uid, 'jinx', cursed.uid);
      expect(turnsOf(cursed, 'jinxed'), mode).toBe(jinxTurns + X);
      cast(b, P(b, 4).uid, 'jinx', plain.uid);
      expect(turnsOf(plain, 'jinxed'), mode).toBe(jinxTurns);
    });
    it(`${mode}: Wither (DoT) uzar; Omen yığını ve Unhallowed uzamaz`, () => {
      const b = arena([['hexer', 4]], [['warrior', 0]], mode);
      const t = E(b, 0);
      curse(b, t);
      cast(b, P(b, 4).uid, 'withering_curse', undefined, t.slot);
      expect(turnsOf(t, 'wither'), mode).toBe(witherTurns + X);
      expect(b.curseExtraTurns(t, 'omen')).toBe(0);
      expect(t.statuses.find((s) => s.kind === 'omen')!.turns, mode).toBeLessThanOrEqual(S['omen']!.duration!);
    });
  }
  it('hariçler: zemin kaynaklı, yığılan, kuralla süren, kalıcı, buff ve Unhallowed kendisi', () => {
    const b = arena([['hexer', 4]], [['warrior', 0]]);
    const t = E(b, 0);
    curse(b, t);
    expect(b.curseExtraTurns(t, 'stun')).toBe(X);
    expect(b.curseExtraTurns(t, 'unhallowed')).toBe(0);
    expect(b.curseExtraTurns(t, 'omen')).toBe(0); // maxStacks
    expect(b.curseExtraTurns(t, 'ash_brand')).toBe(0); // untilResolved
    expect(b.curseExtraTurns(t, 'haste')).toBe(0); // buff
    expect(b.curseExtraTurns(t, 'stun', { fromGround: true })).toBe(0);
    expect(b.curseExtraTurns(t, 'wither', { permanent: true })).toBe(0);
    t.statuses = t.statuses.filter((s) => s.kind !== 'unhallowed');
    expect(b.curseExtraTurns(t, 'stun')).toBe(0);
  });
});

describe('Lanet uzar (önizleme, rozet)', () => {
  it('önizleme Unhallowed hedefte uzamış süreyi yazar (durum + DoT)', () => {
    const b = arena([['warrior', 0], ['hexer', 4]], [['warrior', 0]]);
    const t = E(b, 0);
    curse(b, t);
    const stunName = S['stun']!.name;
    const pv = previewSkill(b, P(b, 0).uid, 'charge', t.uid);
    expect(pv.find((p) => p.uid === t.uid)!.statuses!.some((s) => s.startsWith(`${stunName} ${stunTurns + X} turns`))).toBe(true);
    const pw = previewSkill(b, P(b, 4).uid, 'withering_curse', undefined, t.slot);
    expect(pw.find((p) => p.uid === t.uid)!.dot!.turns).toBe(witherTurns + X);
  });
  it('durum rozeti yüzde göstermez; ipucu metni aynen', () => {
    const b = arena([['hexer', 4]], [['warrior', 0]]);
    const t = E(b, 0);
    const inst = { kind: 'unhallowed' as const, source: P(b, 4).uid };
    expect(statusPercent(b, t, inst)).toBeNull();
    expect(statusTipText(b, t, inst, S['unhallowed']!.text!)).toBe(S['unhallowed']!.text);
  });
});

describe('Lanet uzar (YZ)', () => {
  const vc = () => ({ ...DEFAULT_VALUE, ...(content.aiConfig.value ?? {}) });
  const ctxOf = (b: Battle, actor: Combatant) => new ValueContext(b, actor, vc(), (c) => content.aiConfig.profiles[c.ai ?? content.aiConfig.defaultProfile]?.focus ?? 'lowest_ratio');
  it('Unhallowed değeri: karşı tarafta süreli debuff veren varsa eksi, yoksa 0', () => {
    const b = arena([['warrior', 0], ['hexer', 4]], [['warrior', 0]]);
    const t = E(b, 0);
    const ctx = ctxOf(b, P(b, 4));
    expect(AC.statusEffectWorth(ctx, t, 'unhallowed', 2, { from: 'party' })).toBeLessThan(0);
    const b2 = arena([['mage', 4]], [['warrior', 0]]);
    const noDebuff = b2.combatants.find((c) => c.side === 'party')!;
    noDebuff.skills = noDebuff.skills.filter((id) => !content.skills[id]!.effects.some((e) => e.type === 'status' || e.type === 'dot'));
    expect(AC.statusEffectWorth(ctxOf(b2, noDebuff), E(b2, 0), 'unhallowed', 2, { from: 'party' })).toBe(0);
  });
  it('Cursed Ground yerleştirme değeri (groundUnitWorth) düşmanda eksi', () => {
    const b = arena([['warrior', 0], ['hexer', 4]], [['warrior', 0]]);
    const ctx = ctxOf(b, P(b, 4));
    expect(AC.groundUnitWorth(ctx, E(b, 0), 'cursed_ground', 0, 2, 'party')).toBeLessThan(0);
  });
  it('YZ uygulama anı: Unhallowed hedefe Charge adayının kontrol terimi laneti olmayandan büyük (ek Stun turu sayılır)', () => {
    const control = (cursed: boolean) => {
      const b = arena([['warrior', 0], ['hexer', 4]], [['warrior', 0]]);
      const t = E(b, 0);
      if (cursed) curse(b, t);
      const all = explainChoice(b, P(b, 0).uid, ai)!.candidates;
      const cs = all.filter((c) => c.skill === 'charge');
      expect(cs.length).toBeGreaterThan(0);
      return Math.max(...cs.map((c) => (c.terms as Record<string, number>).control ?? 0));
    };
    const off = control(false);
    expect(off).toBeGreaterThan(0);
    expect(control(true)).toBeGreaterThan(off);
  });
});
