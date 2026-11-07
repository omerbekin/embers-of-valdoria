import { describe, expect, it } from 'vitest';
import { Battle, content, describeSkill, previewSkill } from '../src/engine';
import type { BattleEvent, Combatant, CombatantDef, Status, Teams, UnitSetup } from '../src/engine';
import { compileTree, treeOf } from '../src/progression';
import { emptyAlloc, take } from '../src/progression/skill-tree';
import type { TreeData, TreeFx } from '../src/progression/skill-tree-data';
import { buildWiki } from '../src/wiki/catalog';

// Ömer 2026-11-07 (statuses.json > omen.doom.bonusPerExtraTurn): Omen'in süresi UZAMAZ; uzatacak her tur bunun yerine Doom'a +bonus
// (Status.extraTurns). Bonus bu Omen'in her Doom'una işler (süre bitimi, 3 yığında anında, Doom Mark). Sayılar veriden.

const OMEN = content.statuses.omen!;
const DOOM = OMEN.doom!;
const DUR = OMEN.duration!;
const BONUS = DOOM.bonusPerExtraTurn!;
const S = content.skills;
const DET = S.doom_mark!.effects.find((e) => e.type === 'detonate') as { mult: number };
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Ev<T> => e.type === type);
const unitDef = (id: string): CombatantDef => (content.summons[id] ?? content.classes[id])!;

function arena(mode: 'test' | 'turns' = 'test', enemies: string[] = ['warrior']): Battle {
  const base = content.battleSetup('random-battle', 1, mode, { party: [], enemies: [] }, false);
  base.formulas = { ...base.formulas, attributes: { ...base.formulas.attributes, spdVariance: 0 } };
  const b = new Battle({ ...base, party: [unitDef('hexer')], partySlots: [4], enemies: enemies.map(unitDef), enemySlots: enemies.map((_, i) => i) });
  b.freeMp = true;
  for (const c of b.combatants) {
    Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0, surviveChance: 0, resilience: 0, manaEcho: 0 });
    c.hp = c.maxHp = 50000;
  }
  b.debug.crit = 'never';
  return b;
}
const hexOf = (b: Battle) => b.combatants.find((c) => c.side === 'party')!;
const foeOf = (b: Battle, slot = 0) => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const omenOf = (c: Combatant): Status | undefined => c.statuses.find((s) => s.kind === 'omen');
function cast(b: Battle, uid: string, skill: string, target?: string): BattleEvent[] {
  const r = b.useSkill(uid, skill, target);
  if (!r.ok) throw new Error(`${uid} ${skill}: ${r.reason}`);
  return r.events;
}
/** turns modunda: Hexer'in turunda 2 Omen, `extra` bonus tur; Omen patlayana kadar pas. Patlama olayı ve arada geçen taşıyan tur başı sayısı. */
function expireCase(extra: number): { doom: Ev<'doom'> | undefined; turnsSeen: number } {
  const b = arena('turns');
  const h = hexOf(b);
  const w = foeOf(b);
  for (let i = 0; i < 40 && b.currentUid !== h.uid; i++) b.skipTurn();
  cast(b, h.uid, 'evil_eye', w.uid);
  const st = omenOf(w)!;
  st.stacks = 2; // yığın dolmasın (turns modunda tek eylem)
  if (extra) st.extraTurns = extra;
  const start = b.log.length;
  for (let i = 0; i < 80 && omenOf(w) && w.hp > 0; i++) b.skipTurn();
  const di = b.log.findIndex((e, i) => i >= start && e.type === 'doom');
  return { doom: b.log[di] as Ev<'doom'> | undefined, turnsSeen: b.log.slice(start, di).filter((e) => e.type === 'turnStart' && e.actor === w.uid).length };
}

describe('Omen: uzatma yerine Doom bonusu (doom.bonusPerExtraTurn)', () => {
  it('veri: tur başına +%25; taban süre 4', () => {
    expect(BONUS).toBe(0.25);
    expect(DUR).toBe(4);
  });

  it('bonussuz süre bitimi değişmez: x expireMult', () => {
    const { doom } = expireCase(0);
    expect(doom).toMatchObject({ cause: 'expire', omens: 2, mult: DOOM.expireMult });
  });

  it('bonuslu Omen aynı turda patlar (gecikme yok), tur başına +%25', () => {
    const base = expireCase(0).turnsSeen;
    for (const extra of [1, 2]) {
      const { doom, turnsSeen } = expireCase(extra);
      expect(turnsSeen, `extra ${extra}`).toBe(base);
      expect(doom!.mult).toBeCloseTo(DOOM.expireMult * (1 + extra * BONUS), 6);
    }
  });

  it('3 yığında anında Doom da bonuslu', () => {
    const b = arena();
    const h = hexOf(b);
    const w = foeOf(b);
    cast(b, h.uid, 'evil_eye', w.uid);
    cast(b, h.uid, 'evil_eye', w.uid);
    omenOf(w)!.extraTurns = 1;
    const ev = cast(b, h.uid, 'evil_eye', w.uid);
    const d = ofType(ev, 'doom')[0]!;
    expect(d).toMatchObject({ cause: 'complete', omens: 3 });
    expect(d.mult).toBeCloseTo(1 + BONUS, 6);
  });

  it('Doom Mark bonuslu; önizleme aynı çarpan; bonussuz Doom Mark değişmez', () => {
    const b = arena();
    const h = hexOf(b);
    const w = foeOf(b);
    cast(b, h.uid, 'evil_eye', w.uid);
    omenOf(w)!.extraTurns = 2;
    const want = DET.mult * (1 + 2 * BONUS);
    const pv = previewSkill(b, h.uid, 'doom_mark', w.uid).find((x) => x.uid === w.uid)!;
    expect(pv.omen!.doom!.mult).toBeCloseTo(want, 6);
    const d = ofType(cast(b, h.uid, 'doom_mark', w.uid), 'doom')[0]!;
    expect(d).toMatchObject({ cause: 'detonate', omens: 2 });
    expect(d.mult).toBeCloseTo(want, 6);
    const b2 = arena();
    cast(b2, hexOf(b2).uid, 'evil_eye', foeOf(b2).uid);
    expect(ofType(cast(b2, hexOf(b2).uid, 'doom_mark', foeOf(b2).uid), 'doom')[0]!.mult).toBe(DET.mult);
  });

  it('yeni yığın sayacı normal yeniler (taban süre), bonus korunur', () => {
    const b = arena();
    const h = hexOf(b);
    const w = foeOf(b);
    cast(b, h.uid, 'evil_eye', w.uid);
    const st = omenOf(w)!;
    st.extraTurns = 1;
    st.turns = 2;
    cast(b, h.uid, 'evil_eye', w.uid);
    expect(omenOf(w)).toMatchObject({ stacks: 2, turns: DUR, extraTurns: 1 });
  });

  it('Ill Omen: bonus geçen Omen\'le gider', () => {
    const b = arena('test', ['warrior', 'warrior']);
    const h = hexOf(b);
    const [w0, w1] = [foeOf(b, 0), foeOf(b, 1)];
    cast(b, h.uid, 'evil_eye', w0.uid);
    omenOf(w0)!.extraTurns = 2;
    b.debugKill(w0.uid, false);
    expect(omenOf(w1)).toMatchObject({ extraTurns: 2 });
  });

  it('extendStatus (ağaç, Let It Ride ile aynı yol): Omen süresi uzamaz, bonus sayacı artar', () => {
    const H = treeOf('hexer')!;
    const t = JSON.parse(JSON.stringify(H)) as TreeData;
    t.nodes['1.f1']!.fx = [{ k: 'hook', h: 'cond', skill: 'evil_eye', mod: { extendStatus: { status: 'omen', turns: 1 } } } as TreeFx];
    const r = take(t, 30, emptyAlloc(t), '1.f1');
    if (!r.ok) throw new Error(r.block.text);
    const units: Record<number, UnitSetup> = { 0: { tree: compileTree(t, r.alloc)! } };
    const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
    const teams: Teams = { party: cells({ 0: 'hexer' }), enemies: cells({ 0: 'warrior' }), units: { party: units, enemies: {} } };
    const b = new Battle(content.battleSetup('random-battle', 11, 'test', teams, false));
    b.freeMp = true;
    for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0, resilience: 0 });
    b.debug.crit = 'never';
    const h = hexOf(b);
    const w = foeOf(b);
    cast(b, h.uid, 'evil_eye', w.uid);
    h.cooldowns.evil_eye = 0;
    cast(b, h.uid, 'evil_eye', w.uid);
    const st = omenOf(w)!;
    expect(st.turns).toBeLessThanOrEqual(DUR);
    expect(st.extraTurns ?? 0).toBeGreaterThan(0);
    expect(b.doomExtraMult(st)).toBeCloseTo(1 + st.extraTurns! * BONUS, 6);
  });

  it('metin: Omen açıklaması, Doom Mark satırı ve Codex Curses makalesi', () => {
    const defs = { statuses: content.statuses } as Parameters<typeof describeSkill>[4];
    const dm = describeSkill(S.doom_mark!, content.classes.hexer!.stats, content.formulas, {}, defs).lines.join(' | ');
    expect(dm).toContain('would lengthen an Omen add +25% Doom damage per turn instead');
    expect(OMEN.text).toContain('add +25% Doom damage per turn instead');
    expect(JSON.stringify(buildWiki({ sprites: {}, avatars: {} }))).toContain('Omens never last longer');
  });
});
