import { describe, expect, it } from 'vitest';
import { Battle, content, describeSkill, explainChoice, previewSkill } from '../src/engine';
import { skillNumbers } from '../src/engine/skill-info';
import type { BattleEvent, Combatant, CombatantDef, StatusDef } from '../src/engine';
import { buildWiki } from '../src/wiki/catalog';

// Ömer 2026-11-26 (r49): Doom'a yığın başı sabit taban (statuses.json > omen.doom.flatPerStack, skill damage.flat gibi).
// Doom = (Luck x powerPerStack + flatPerStack) x yığın x çarpan; Doom Mark x1,5 tabanı da çarpar; taban yokken eski sonuç birebir.
// r50 (balance-tester): veride taban VAR (Hexer Doom B: 2,704 + %27,6 Luck). Testler tabanı bu savaşın setup'ına açıkça koyar (0 = tabansız).

const OMEN = content.statuses.omen!;
const DOOM = OMEN.doom!;
const MAX = OMEN.maxStacks!;
const DET = content.skills.doom_mark!.effects.find((e) => e.type === 'detonate') as { mult: number };
const FLAT = 3;
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const unitDef = (id: string): CombatantDef => (content.summons[id] ?? content.classes[id])!;

function arena(flat?: number, spm = 1, mode: 'test' | 'turns' = 'test'): Battle {
  const base = content.battleSetup('random-battle', 1, mode, { party: [], enemies: [] }, false);
  base.formulas = { ...base.formulas, attributes: { ...base.formulas.attributes, spdVariance: 0 }, damage: { ...base.formulas.damage, variance: 0, elementVariance: {} } };
  if (flat !== undefined) {
    const om: StatusDef = { ...base.statuses!.omen!, doom: { ...base.statuses!.omen!.doom!, flatPerStack: flat } };
    base.statuses = { ...base.statuses, omen: om };
  }
  const b = new Battle({ ...base, party: [unitDef('hexer')], partySlots: [4], enemies: [unitDef('warrior')], enemySlots: [0] });
  b.freeMp = true;
  for (const c of b.combatants) {
    Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0, surviveChance: 0, resilience: 0, manaEcho: 0, magicArmor: 0, armor: 0 });
    c.hp = c.maxHp = 50000;
  }
  hexOf(b).stats.spellPowerMult = spm;
  b.debug.crit = 'never';
  return b;
}
const hexOf = (b: Battle) => b.combatants.find((c) => c.side === 'party')!;
const foeOf = (b: Battle) => b.combatants.find((c) => c.side === 'enemy')!;
function cast(b: Battle, uid: string, skill: string, target: string): BattleEvent[] {
  const r = b.useSkill(uid, skill, target);
  if (!r.ok) throw new Error(`${skill}: ${r.reason}`);
  return r.events;
}
/** Doom'u tetikleyen olaylardaki Omen hasarı (Doom olayından sonraki 'damage', status 'omen'). */
const doomDamage = (ev: BattleEvent[]): number => ev.filter((e): e is Ev<'damage'> => e.type === 'damage' && e.status === 'omen').reduce((s, e) => s + e.amount, 0);
/** Doom'suz dolu yığın: evil_eye ile MAX'a tamamlar (L1 Hexer, zırhsız hedef). */
function completeDoom(b: Battle): BattleEvent[] {
  const h = hexOf(b);
  const w = foeOf(b);
  for (let i = 0; i < MAX - 1; i++) cast(b, h.uid, 'evil_eye', w.uid);
  w.hp = w.maxHp;
  return cast(b, h.uid, 'evil_eye', w.uid);
}
/** Beklenen Doom (zırhsız, sapmasız): (ham stat x ölçek x spm x oran + taban x spm) x yığın x çarpan. */
const expected = (h: Combatant, omens: number, mult: number, flat: number, spm = 1): number =>
  Math.round((h.stats[DOOM.scale] * content.formulas.scaling[DOOM.scale] * spm * DOOM.powerPerStack + flat * spm) * omens * mult);

describe('Doom sabit taban (doom.flatPerStack)', () => {
  it('r50: veri tabanı L1 Hexer Doom hasarını eski tabansız orandan (0,38) en çok %1 oynatır', () => {
    const OLD_RATE = 0.38; // r50 öncesi powerPerStack: L1 hasarı aynı kalsın kuralı (Ömer 2026-11-26)
    const luck = content.classes.hexer!.attributes[DOOM.scale] * content.formulas.scaling[DOOM.scale];
    const now = luck * DOOM.powerPerStack + (DOOM.flatPerStack ?? 0);
    expect(Math.abs(now / (luck * OLD_RATE) - 1)).toBeLessThanOrEqual(0.01);
  });

  it('taban yokken (alan yok / 0) Doom eskisiyle birebir', () => {
    const z = completeDoom(arena(0));
    expect(doomDamage(z)).toBe(expected(hexOf(arena(0)), MAX, 1, 0));
  });

  it('L1: 3 yığında anında Doom = (Luck x oran + taban) x yığın', () => {
    const b = arena(FLAT);
    const ev = completeDoom(b);
    expect(ev.some((e) => e.type === 'doom' && e.cause === 'complete')).toBe(true);
    expect(doomDamage(ev)).toBe(expected(hexOf(b), MAX, 1, FLAT));
    expect(Math.abs(doomDamage(ev) - doomDamage(completeDoom(arena(0))) - FLAT * MAX)).toBeLessThanOrEqual(1);
  });

  it('Doom Mark x mult tabanı da çarpar; önizleme gerçek hasarla aynı', () => {
    const b = arena(FLAT);
    const h = hexOf(b);
    const w = foeOf(b);
    cast(b, h.uid, 'evil_eye', w.uid);
    const pv = previewSkill(b, h.uid, 'doom_mark', w.uid).find((x) => x.uid === w.uid)!;
    const ev = cast(b, h.uid, 'doom_mark', w.uid);
    const d = doomDamage(ev);
    const de = ev.find((e): e is Ev<'doom'> => e.type === 'doom')!; // Doom Mark önce kendi Omen'ini ekler
    expect(de).toMatchObject({ cause: 'detonate', mult: DET.mult });
    expect(d).toBe(expected(h, de.omens, DET.mult, FLAT));
    expect(pv.omen!.doom!.hpLoss).toBeCloseTo(d, 0);
  });

  it('skill gücü çarpanı (spellPowerMult) tabanı da ölçekler', () => {
    const b = arena(FLAT, 1.2);
    expect(doomDamage(completeDoom(b))).toBe(expected(hexOf(b), MAX, 1, FLAT, 1.2));
  });

  it('süre bitimi Doom: snapshot çarpanı (sonradan değişse de) ve expireMult tabanı çarpar', () => {
    const b = arena(FLAT, 1.2, 'turns');
    const h = hexOf(b);
    const w = foeOf(b);
    for (let i = 0; i < 40 && b.currentUid !== h.uid; i++) b.skipTurn();
    cast(b, h.uid, 'evil_eye', w.uid);
    const st = w.statuses.find((s) => s.kind === 'omen')!;
    st.stacks = MAX - 1; // dolmasın
    expect(st.snapSpm).toBe(1.2);
    h.stats.spellPowerMult = 1; // süre bitiminde snapshot kullanılır (expected ham statı okur)
    const start = b.log.length;
    for (let i = 0; i < 80 && w.statuses.some((s) => s.kind === 'omen'); i++) b.skipTurn();
    const tail = b.log.slice(start);
    expect(tail.find((e) => e.type === 'doom')).toMatchObject({ cause: 'expire', omens: MAX - 1, mult: DOOM.expireMult });
    expect(doomDamage(tail)).toBe(expected(h, MAX - 1, DOOM.expireMult, FLAT, 1.2));
  });

  it('taban yokken snapshot çarpanı yazılmaz (durum nesnesi eskisiyle aynı)', () => {
    const b = arena(0, 1.2);
    cast(b, hexOf(b).uid, 'evil_eye', foeOf(b).uid);
    expect(foeOf(b).statuses.find((s) => s.kind === 'omen')!.snapSpm).toBeUndefined();
  });

  it('metinler tabanı gösterir (skill yazısı, sayı, Codex)', () => {
    const b = arena(FLAT);
    const h = hexOf(b);
    const defs = { statuses: { ...content.statuses, omen: { ...OMEN, doom: { ...DOOM, flatPerStack: FLAT } } } };
    const lines = describeSkill(content.skills.evil_eye!, h.stats, content.formulas, {}, defs).lines.join(' | ');
    expect(lines).toContain(`${FLAT} + `);
    const n = skillNumbers(content.skills.evil_eye!, h.stats, content.formulas, defs).find((x) => x.label === 'Doom / Omen')!;
    expect(n.value).toBe(expected(h, 1, 1, FLAT));
    const dm = describeSkill(content.skills.doom_mark!, h.stats, content.formulas, {}, defs).lines.join(' | ');
    expect(dm).toContain(`${Number((FLAT * DET.mult).toFixed(3))} + `);
    // Codex içeriği küresel content'ten okur: tabanı yalnız bu çağrı için koyup geri al
    const prev = DOOM.flatPerStack;
    DOOM.flatPerStack = FLAT;
    try {
      expect(JSON.stringify(buildWiki({ sprites: {}, avatars: {} }))).toContain(`${FLAT} + ${Math.round(DOOM.powerPerStack * 100)}% of the curser`);
    } finally {
      if (prev === undefined) delete DOOM.flatPerStack;
      else DOOM.flatPerStack = prev;
    }
  });

  it('YZ: dolmayan Omen yığınının ertelenmiş değeri (curse) tabanla artar', () => {
    const curse = (flat?: number): number => {
      const b = arena(flat);
      const ex = explainChoice(b, hexOf(b).uid, { ...content.aiConfig, global: undefined })!;
      return Math.max(...ex.candidates.filter((c) => c.skill === 'evil_eye').map((c) => c.terms?.curse ?? 0));
    };
    const share = content.aiConfig.profiles.hexer!.omenValueShare ?? 0.85;
    const a = curse(0);
    const f = curse(FLAT);
    expect(a).toBeGreaterThan(0);
    const stacks = (content.skills.evil_eye!.effects.find((e) => e.type === 'omen') as { stacks: number }).stacks;
    // isabet zarsız arenada (accuracy 10, kaçınma 0, kritik 0): fark = taban x yığın x omenValueShare
    expect(f - a).toBeCloseTo(FLAT * stacks * share, 3);
  });
});
