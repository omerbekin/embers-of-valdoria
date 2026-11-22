// Taunt kırma (Ömer 2026-11-21, form r39): turu atlatan her durum (veride skipTurn: Stun, Frozen, Cooling) Taunt'u kırar (breaksTaunt).
// Turu atlatmayan CC (Electrocuted, Silenced) kırmaz. Liste veriden okunur.
import { describe, expect, it } from 'vitest';
import { Battle, content, describeSkill } from '../src/engine';
import type { BattleMode, Combatant, Side } from '../src/engine';
import { buildMechanics } from '../src/wiki/catalog';

const MODES: BattleMode[] = ['turns', 'test'];
const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
const at = (b: Battle, side: Side, slot: number): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === slot)!;
const statuses = Object.entries(content.statuses);
const skipping = statuses.filter(([, d]) => d.skipTurn).map(([k]) => k);
const notSkipping = statuses.filter(([, d]) => !d.skipTurn).map(([k]) => k);

describe('Taunt kırma: turu atlatan her durum', () => {
  it('veri: her skipTurn durumu breaksTaunt; turu atlatmayan hiçbir durum kırmaz (Electrocuted dahil)', () => {
    expect(skipping.length).toBeGreaterThanOrEqual(3);
    for (const k of skipping) expect(content.statuses[k]!.breaksTaunt, k).toBe(true);
    for (const k of notSkipping) expect(content.statuses[k]!.breaksTaunt ?? false, k).toBe(false);
    expect(notSkipping).toContain(content.formulas.thunder.wetInto);
  });

  for (const mode of MODES)
    it(`${mode}: taunt'lı Defender her skipTurn durumunu yiyince taunt o anda kırılır; Electrocuted kırmaz`, () => {
      for (const kind of [...skipping, content.formulas.thunder.wetInto!]) {
        const b = new Battle(content.battleSetup('random-battle', 7, mode, { party: cells({ 0: 'defender', 1: 'mage' }), enemies: cells({ 0: 'archer' }) }, false));
        const d = at(b, 'party', 0);
        expect(b.debugCast(d.uid, 'taunt').ok).toBe(true); // turns modunda sıra beklemeden
        expect(d.statuses.some((s) => s.kind === 'taunt')).toBe(true);
        const from = b.log.length;
        expect(b.debugAddStatus(d.uid, kind, 2).ok).toBe(true);
        const breaks = !!content.statuses[kind]!.breaksTaunt;
        expect(d.statuses.some((s) => s.kind === 'taunt'), kind).toBe(!breaks);
        expect(b.log.slice(from).some((e) => e.type === 'statusEnd' && e.target === d.uid && e.status === 'taunt' && e.broken), kind).toBe(breaks);
        if (breaks) {
          // taunt kalktı: düşmanın tek hedefli saldırısı artık başka dosta da gider
          const archer = at(b, 'enemy', 0);
          expect(b.validTargets(archer.uid, archer.skills[0]!).map((c) => c.uid)).toContain(at(b, 'party', 1).uid);
        }
      }
    });

  it('oyuncu metni (skill açıklaması + Wiki) kıran durumların hepsini veriden sayar', () => {
    const names = skipping.map((k) => content.statuses[k]!.name);
    const def = content.classes['defender']!;
    const info = describeSkill(content.skills['taunt']!, def.stats, content.formulas, content.summons, { statuses: content.statuses });
    const text = JSON.stringify(info);
    for (const n of names) expect(text, n).toContain(n);
    const wiki = JSON.stringify(buildMechanics());
    expect(wiki).toContain('lose its turn');
    for (const n of names) expect(wiki, n).toContain(n);
  });
});
