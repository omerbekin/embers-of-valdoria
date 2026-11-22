// Sıra çubuğu ve hız durumunun bitişi (Ömer 2026-11-21, form r39; denetim 2.1): tahmin, hız durumlarının (veride speedMult taşıyanlar: Haste,
// Chilled) kalan süresini hesaba katar; durum bittikten sonraki turlar durumsuz hızla hesaplanır. Olaysız ilerleyişte (yalnız Rest) çubuk =
// gerçek sıra, durum bitişi dahil. Sıra yalnız `turns` modunda var (test modunda çubuk boş).
import { describe, expect, it } from 'vitest';
import { Battle, content } from '../src/engine';
import type { Combatant, Side } from '../src/engine';

const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
const SPEED = Object.entries(content.statuses).filter(([, d]) => d.speedMult !== undefined && d.speedMult !== 1).map(([k]) => k);
const at = (b: Battle, side: Side, slot: number): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === slot)!;

function make(seed: number): Battle {
  const b = new Battle(content.battleSetup('random-battle', seed, 'turns', { party: cells({ 0: 'warrior', 1: 'mage', 4: 'archer' }), enemies: cells({ 0: 'warrior', 1: 'druid', 4: 'paladin' }) }, false));
  for (const c of b.combatants) c.hp = c.maxHp = 50000;
  return b;
}
/** Yalnız Rest ile n tur oynatır; gerçek aktör sırası (şu anki dahil). */
function playRests(b: Battle, n: number): string[] {
  const seen: string[] = [];
  for (let i = 0; i < n && !b.winner; i++) {
    const uid = b.currentUid!;
    seen.push(uid);
    b.get(uid)!.mp = 0; // Rest MP doluyken kullanılamaz; MP sırayı etkilemez
    const r = b.applyChoice(uid, { skillId: 'rest' });
    expect(r.ok, `${uid}: ${!r.ok ? r.reason : ''}`).toBe(true);
  }
  return seen;
}

describe('sıra çubuğu: hız durumu bitişi', () => {
  it('veri: hız durumları var (Haste hızlandırır, Chilled yavaşlatır)', () => {
    expect(SPEED).toEqual(expect.arrayContaining(['haste', 'chilled']));
    expect(content.statuses.haste!.speedMult!).toBeGreaterThan(1);
    expect(content.statuses.chilled!.speedMult!).toBeLessThan(1);
  });

  for (const kind of ['haste', 'chilled'])
    for (const turns of [1, 2])
      for (const side of ['party', 'enemy'] as const)
        for (const who of ['other', 'current'] as const)
          it(`${kind} ${turns} tur kala, ${side} tarafında (${who === 'current' ? 'sırası gelen birim' : 'bekleyen birim'}): çubuk = gerçek sıra`, () => {
            for (const seed of [1, 4, 9]) {
              const b = make(seed);
              const n = content.formulas.turn.queueLength * 3; // durum bitişini ve sonrasını kapsayacak kadar uzun tahmin
              // sırası gelen birim mi, bekleyen birim mi: gerekirse bir tur ilerlet
              let u = who === 'current' ? b.get(b.currentUid!)! : b.combatants.find((c) => c.side === side && c.uid !== b.currentUid)!;
              if (who === 'current' && u.side !== side) {
                for (let i = 0; i < 12 && b.get(b.currentUid!)!.side !== side; i++) playRests(b, 1);
                u = b.get(b.currentUid!)!;
              }
              expect(u.side).toBe(side);
              b.debugAddStatus(u.uid, kind, turns);
              u.statuses.find((s) => s.kind === kind)!.turns = turns; // Resilience / debuff kısaltması olmadan tam kalan süre
              const predicted = b.turnQueue(n);
              const actual = playRests(b, n);
              expect(actual, `seed ${seed}`).toEqual(predicted);
              expect(u.statuses.some((s) => s.kind === kind), 'durum bitti').toBe(false);
            }
          });

  it('kalıcı / zemin kaynaklı hız durumu tahminde bitmez (eski davranış)', () => {
    const b = make(4);
    const u = at(b, 'party', 1);
    b.debugAddStatus(u.uid, 'haste', 2);
    u.statuses.find((s) => s.kind === 'haste')!.permanent = true;
    const n = content.formulas.turn.queueLength + 4;
    const predicted = b.turnQueue(n);
    expect(playRests(b, n)).toEqual(predicted);
    expect(u.statuses.some((s) => s.kind === 'haste')).toBe(true);
  });
});
