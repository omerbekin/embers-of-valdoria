/**
 * Ömer 2026-11-16 (form Tur 24): Tur 23'te Slow (Hobbled) hız kesmez olunca kaynakları yeniden bağlandı.
 * Roar -> Chilled, Forge Chains -> Saltbound, Hexer ağacı isabet ekleri -> Blinded (örnek gücü). Mire-Bound Tur 26'da (Ömer 2026-11-16) değişti:
 * Chilled eki kalktı, cadı yaşarken uygulanan Saltbound extraTurns tur uzun sürer.
 * Sayılar veriden okunur; YZ değerleri explainChoice terimleriyle sınanır.
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice } from '../src/engine';
import type { BattleMode, Combatant } from '../src/engine';
import { scaleDelta } from '../src/engine/status-stack';
import { treeOf } from '../src/progression';

const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
const HEROES = { 0: 'warrior', 1: 'warrior', 3: 'druid', 7: 'mage' };
function make(enemies: Record<number, string>, mode: BattleMode = 'test'): Battle {
  const b = new Battle(content.battleSetup('random-battle', 5, mode, { party: cells(HEROES), enemies: cells(enemies) }, false));
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  return b;
}
const enemyOf = (b: Battle, def: string): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.defId === def)!;
const statusOf = (skill: string): { status: string; turns: number } => content.skills[skill]!.effects.find((e) => e.type === 'status') as unknown as { status: string; turns: number };
const control = (b: Battle, uid: string, skill: string, opts?: Parameters<typeof explainChoice>[3]): number => {
  const ex = explainChoice(b, uid, content.aiConfig, opts)!;
  const cs = ex.candidates.filter((c) => c.skill === skill);
  expect(cs.length, skill).toBeGreaterThan(0);
  return Math.max(...cs.map((c) => (c.terms as Record<string, number>).control ?? 0));
};

describe('Tur 24 veri', () => {
  it('Roar 1 tur Chilled, Forge Chains 1 tur Saltbound (hasar ve Burning kalır)', () => {
    expect(statusOf('roar')).toMatchObject({ status: 'chilled', turns: 1 });
    expect(statusOf('forge_chains')).toMatchObject({ status: 'saltbound', turns: 1 });
    const fc = content.skills.forge_chains!.effects;
    expect(fc.some((e) => e.type === 'damage')).toBe(true);
    expect(fc.some((e) => e.type === 'dot' && e.status === 'burning')).toBe(true);
    expect(fc.some((e) => e.type === 'status' && e.status === 'slow')).toBe(false);
  });

  it('Mire-Bound (Tur 26) tüm cadılarda Saltbound süre eki, Chilled / hız eki veride yok', () => {
    let n = 0;
    for (const [id, m] of Object.entries(content.mobs)) {
      const e = m.passive?.effect;
      if (e?.type !== 'mireBound') continue;
      n++;
      expect(e.status, id).toBe('saltbound');
      expect(e.extraTurns, id).toBeGreaterThan(0);
      expect((e as Record<string, unknown>).adds, id).toBeUndefined();
      expect((e as Record<string, unknown>).speedMult, id).toBeUndefined();
    }
    expect(n).toBe(5);
  });

  it('Hexer düğümleri isabet eki yerine aynı güçte Blinded verir (Blinded tabanı x güç = eski değer)', () => {
    const H = treeOf('hexer')!;
    const acc = content.statuses.blinded!.accuracyDelta!;
    const old: Record<string, number> = { '2.f2': -0.01, '3.f2': -0.05, '3.fb': -0.2 }; // eski statusPotency isabet ekleri (rank başına)
    for (const [k, v] of Object.entries(old)) {
      const fx = H.nodes[k]!.fx as unknown as Array<{ mod?: { withStatus?: { status: string; strength: number }; statusPotency?: unknown } }>;
      const w = fx.find((f) => f.mod?.withStatus)!.mod!.withStatus!;
      expect(w.status, k).toBe('blinded');
      expect(scaleDelta(acc, w.strength), k).toBeCloseTo(v, 3);
      expect(fx.some((f) => f.mod?.statusPotency), k).toBe(false);
      expect(H.nodes[k]!.text, k).toMatch(/Blind/);
    }
  });
});

describe('Tur 24 YZ değerleri', () => {
  it('Roar: kahramanlara Chilled kontrol değeri taşır', () => {
    const b = make({ 4: 'snowfather', 0: 'snow_wolf' });
    const u = enemyOf(b, 'snowfather');
    u.mp = u.maxMp;
    expect(control(b, u.uid, 'roar')).toBeGreaterThan(0);
  });

  it('Mire-Bound: cadının Saltbound vuruşu, mire payı açıkken daha değerli (ek Saltbound turu)', () => {
    const b = make({ 6: 'fen_witchling', 0: 'moor_raider', 1: 'moor_raider' }); // dostlar: kaçınma 0 / pin değeri ek turla büyür
    const u = enemyOf(b, 'fen_witchling');
    const skill = (content.mobs.fen_witchling!.skills as string[]).find((s) => statusOf(s)?.status === 'saltbound')!;
    expect(skill).toBeDefined();
    const mire = content.aiConfig.value!.debuffShare!.mire ?? 1;
    const on = control(b, u.uid, skill, { value: { debuffShare: { ...content.aiConfig.value!.debuffShare, mire } } as never });
    const off = control(b, u.uid, skill, { value: { debuffShare: { ...content.aiConfig.value!.debuffShare, mire: 0 } } as never });
    expect(on).toBeGreaterThan(off);
  });

  it('Mire-Bound: cadı pasifi yokken mire payının etkisi yok', () => {
    const b = make({ 6: 'fen_witchling' });
    const u = enemyOf(b, 'fen_witchling');
    u.passive = undefined;
    const skill = (content.mobs.fen_witchling!.skills as string[]).find((s) => statusOf(s)?.status === 'saltbound')!;
    const ds = content.aiConfig.value!.debuffShare!;
    const on = control(b, u.uid, skill, { value: { debuffShare: { ...ds, mire: 1 } } as never });
    const off = control(b, u.uid, skill, { value: { debuffShare: { ...ds, mire: 0 } } as never });
    expect(on).toBeCloseTo(off, 9);
  });
});
