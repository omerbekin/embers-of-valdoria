import { describe, expect, it } from 'vitest';
import { Battle, content } from '../src/engine';
import type { Combatant } from '../src/engine';
import { ITEMS, partRange, tierPool } from '../src/progression/items';

// Ömer 2026-11-07: sınıfa bağlı olmayan ikinci el affix'leri: Long Fletching (Sadak), Ill Portent ve Grave Wick (Focus Orb). Sayılar PROVİZYON.
const pool = (tier: 'A' | 'B' | 'C', family: string) => tierPool(tier, 'offhand', 10, { slot: 'offhand', family });

describe('ikinci el imza affix havuzları ve değerleri', () => {
  it('yalnızca kendi türünde çıkar', () => {
    for (const k of ITEMS.offhandKinds.map((x) => x.id)) {
      expect(pool('B', k).includes('b_longfletching'), k).toBe(k === 'quivers');
      expect(pool('B', k).includes('b_weightedodds'), k).toBe(k === 'orbs');
      expect(pool('A', k).includes('a_illportent'), k).toBe(k === 'orbs');
      expect(pool('C', k).includes('c_gravewick'), k).toBe(k === 'orbs');
    }
    expect(tierPool('B', 'offhand', 10)).not.toContain('b_longfletching');
    expect(tierPool('C', 'weapon', 10)).not.toContain('c_gravewick');
  });
  it('değerler: ilvl 2 / 10', () => {
    const r = (id: string, ilvl: number) => partRange(ITEMS.affixDefs[id]!.parts[0]!, ilvl, 0.5);
    expect(r('b_longfletching', 2)[0]).toBeGreaterThanOrEqual(4);
    expect(r('b_longfletching', 2)[1]).toBeLessThanOrEqual(6);
    expect(r('b_longfletching', 10)[1]).toBeGreaterThanOrEqual(9);
    expect(partRange(ITEMS.affixDefs.c_gravewick!.parts[0]!, 2, 0.5)[0]).toBeGreaterThanOrEqual(6);
    const wo = ITEMS.affixDefs.b_weightedodds!.parts[0]!;
    expect(partRange(wo, 2, 0.5)[0]).toBeGreaterThanOrEqual(2);
    expect(partRange(wo, 10, 0.5)[1]).toBeGreaterThanOrEqual(6);
    expect(wo.to).toBe('fx:mpCostReduce');
    expect(ITEMS.affixDefs.a_illportent!.parts[0]!.fixed).toBe(true);
    expect(ITEMS.affixDefs.a_illportent!.parts[0]!.base).toBe(1);
    expect(ITEMS.affixDefs.c_gravewick!.parts.map((p) => p.to)).toEqual(['mod:dotPowerAdd']);
  });
});

describe('Ill Portent -> Omen (Doom bonusu)', () => {
  const mk = (potency: number) => {
    const cells = Array.from({ length: 12 }, (_, i) => (i === 0 ? 'hexer' : ''));
    const foes = Array.from({ length: 12 }, (_, i) => (i === 0 ? 'warrior' : ''));
    const b = new Battle(content.battleSetup('random-battle', 5, 'test', { party: cells, enemies: foes }, false));
    b.freeMp = true;
    const h = b.combatants.find((c) => c.side === 'party')!;
    const w = b.combatants.find((c) => c.side === 'enemy')!;
    for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, resilience: 0 }), (c.hp = c.maxHp = 50000);
    h.itemEffects = { ...(h.itemEffects ?? {}), potencyTurns: potency };
    b.debug.crit = 'never';
    return { b, h, w };
  };
  const omen = (c: Combatant) => c.statuses.find((s) => s.kind === 'omen');
  it('Omen süresi uzamaz, extraTurns = 1, Doom +%25', () => {
    const { b, h, w } = mk(1);
    expect(b.useSkill(h.uid, 'evil_eye', w.uid).ok).toBe(true);
    const st = omen(w)!;
    expect(st.turns).toBeLessThanOrEqual(content.statuses.omen!.duration!);
    expect(st.extraTurns).toBe(1);
    expect(b.doomExtraMult(st)).toBeCloseTo(1.25, 6);
    h.cooldowns.evil_eye = 0;
    b.useSkill(h.uid, 'evil_eye', w.uid);
    expect(omen(w)!.extraTurns).toBe(1); // birikmez
  });
  it('etkisiz: bonus yok', () => {
    const { b, h, w } = mk(0);
    b.useSkill(h.uid, 'evil_eye', w.uid);
    expect(omen(w)!.extraTurns ?? 0).toBe(0);
  });
});
