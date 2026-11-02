import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Battle, content } from '../src/engine';
import { dotOutgoingMult } from '../src/engine/stats';
import { skillNumbers } from '../src/engine/skill-info';
import { previewSkill } from '../src/engine/preview';
import { attributePower } from '../src/engine/stats';
import type { UnitModifiers } from '../src/engine/types';

/** DoT formülü (Ömer 2026-11-02, A): stat x skill gücü x (1 + Increased damage + DoT damage) x (1 + Potency). Motor, önizleme, yazı ve YZ aynı çarpan. */
const cells = (at: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
const DOT = content.classes.hexer!.skills.find((id) => content.skills[id]!.effects.some((e) => e.type === 'dot'))!;
const effect = content.skills[DOT]!.effects.find((e) => e.type === 'dot') as { status: string; scale: 'int'; power: number };

function make(m: Partial<UnitModifiers> = {}, mode: 'turns' | 'test' = 'test') {
  const b = new Battle(content.battleSetup('random-battle', 5, mode, { party: cells({ 0: 'hexer' }), enemies: cells({ 0: 'warrior' }), units: { party: { 0: { modifiers: m as UnitModifiers } }, enemies: {} } }, false));
  b.debug.dodge = 'never';
  const h = b.combatants.find((c) => c.side === 'party')!;
  const e = b.combatants.find((c) => c.side === 'enemy')!;
  return { b, h, e };
}

describe('dotOutgoingMult', () => {
  it('Increased ve DoT toplanır, Potency ayrı çarpar; çarpan yoksa tam 1', () => {
    expect(dotOutgoingMult({})).toBe(1);
    expect(dotOutgoingMult({ damageMult: 1.2, dotPowerMult: 1.3, potencyMult: 1.5 })).toBeCloseTo(1.5 * 1.5, 9);
    expect(dotOutgoingMult({ damageMult: 1.2, dotPowerMult: 1.3 })).toBeCloseTo(1.5, 9);
    expect(dotOutgoingMult({ potencyMult: 1.5 })).toBeCloseTo(1.5, 9);
  });
});

describe.each(['turns', 'test'] as const)('%s modu', (mode) => {
  it('uygulanan miktar formülle aynı; önizleme ve skill yazısı aynı sayıyı görür', () => {
    const mods = { damageAdd: 0.2, dotPowerAdd: 0.3, potencyAdd: 0.5 };
    const { b, h, e } = make(mods, mode);
    expect(h.stats.damageMult).toBeCloseTo(1.2, 9);
    expect(h.stats.dotPowerMult).toBeCloseTo(1.3, 9);
    expect(h.stats.potencyMult).toBeCloseTo(1.5, 9);
    const want = Math.round(attributePower(h.stats, effect.scale, content.formulas) * effect.power * 1.5 * 1.5);
    const preview = previewSkill(b, h.uid, DOT, e.uid).find((x) => x.uid === e.uid)?.dot;
    expect(preview?.status).toBe(effect.status);
    const num = skillNumbers(content.skills[DOT]!, h.stats, content.formulas).find((x) => x.label.includes('/ turn'));
    expect(String(num?.value)).toContain(String(want));
    if (mode === 'turns') for (let i = 0; i < 50 && b.currentUid !== h.uid; i++) b.skipTurn();
    expect(b.useSkill(h.uid, DOT, e.uid).ok).toBe(true);
    expect(e.statuses.find((s) => s.kind === effect.status)?.amount).toBe(want);
  });
  it('Increased damage tek başına da DoT\'u büyütür', () => {
    const plain = make({}, mode);
    const inc = make({ damageAdd: 0.5 }, mode);
    for (const x of [plain, inc]) {
      if (mode === 'turns') for (let i = 0; i < 50 && x.b.currentUid !== x.h.uid; i++) x.b.skipTurn();
      expect(x.b.useSkill(x.h.uid, DOT, x.e.uid).ok).toBe(true);
    }
    const amt = (x: typeof plain) => x.e.statuses.find((s) => s.kind === effect.status)!.amount!;
    expect(amt(inc)).toBe(Math.round(attributePower(inc.h.stats, effect.scale, content.formulas) * effect.power * 1.5));
    expect(amt(inc)).toBeGreaterThan(amt(plain));
  });
});

describe('veri', () => {
  it('a_potency yüzdesi ayrı çarpana gider, DoT damage kendi havuzunda kalır', () => {
    const text = readFileSync('data/items.json', 'utf8');
    expect(text).toContain('mod:potencyAdd');
    expect(text).toContain('mod:dotPowerAdd');
  });
});
