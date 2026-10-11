import { describe, expect, it } from 'vitest';
import { slotRect, solvePhoneBadges, sortByPriority, type BadgeUnit, type PhoneBadgeOpts } from '../src/game/badge-layout';
import layout from '../data/battle-layout.json';

// Telefon rozetleri (Ömer 2026-10-11, taslak B): öncelikli rozetler + "+N" sayacı, hiçbir şeye binmez (src/game/badge-layout.ts).
const unit = (id: string, x: number, barY: number): BadgeUnit => {
  const ownBar = { x0: x - 55, y0: barY - 11, x1: x + 55, y1: barY + 30 };
  const body = { x0: x - 42, y0: barY + 24, x1: x + 42, y1: barY + 214 };
  return { id, x, barY, barHalfW: 52, left: 0, right: 0, ownBar, body, parts: [ownBar, { x0: x - 45, y0: barY - 40, x1: x + 45, y1: barY - 16 }, body] };
};
const si = layout.statusIcon;
const O: PhoneBadgeOpts = { size: si.phoneSize, gapBar: si.gapBar, gapItem: si.gapItem, margin: si.margin, perSide: si.phonePerSide, top: si.size / 2 };
const overlap = (a: { x0: number; y0: number; x1: number; y1: number }, b: typeof a) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe('telefon rozet planı', () => {
  it('veri: telefon rozeti 844x390 da en az ~14 gerçek px (ölçek 390/1080)', () => {
    expect(si.phoneSize * (390 / 1080)).toBeGreaterThanOrEqual(14);
    expect(si.phonePriority.slice(0, 2)).toEqual(['stun', 'silence']);
  });

  it('yalnız birim: tüm durumlar sığarsa sayaç yok; sığmazsa ilk k-1 + "+N" (sayaç bir yuva)', () => {
    const one = solvePhoneBadges([unit('a', 500, 500)], new Map([['a', 3]]), O).get('a')!;
    expect(one.shown).toBe(3);
    expect(one.more).toBe(0);
    const many = solvePhoneBadges([unit('a', 500, 500)], new Map([['a', 9]]), O).get('a')!;
    expect(many.slots.length).toBe(O.perSide * 2);
    expect(many.shown).toBe(O.perSide * 2 - 1);
    expect(many.more).toBe(9 - many.shown);
    // yuva sırası: sağ 1, sol 1, sağ 2...
    expect(many.slots.slice(0, 3)).toEqual([{ dir: 1, i: 0 }, { dir: -1, i: 0 }, { dir: 1, i: 1 }]);
  });

  it('yoğun 4v4 (yuvalar 0, 1, 3, 4): hiçbir rozet / sayaç başka birimin parçasına ya da rozetine binmez; her birimde en az bir şey görünür', () => {
    const s = layout.partySlots as Array<{ x: number; y: number }>;
    const us = [0, 1, 3, 4].map((k, n) => unit(`p${n}`, s[k]!.x, s[k]!.y - 190 - 24));
    const counts = new Map(us.map((u) => [u.id, 4]));
    const plans = solvePhoneBadges(us, counts, O);
    const rects = new Map(us.map((u) => [u.id, plans.get(u.id)!.slots.map((sl) => slotRect(u, sl, O.size, O.gapBar, O.gapItem, O.top))]));
    for (const u of us) {
      const p = plans.get(u.id)!;
      expect(p.slots.length).toBeGreaterThan(0);
      // tek yuvada en önemli rozet (sayaç yok); 2+ yuvada k-1 rozet + "+N"
      if (p.slots.length === 1) expect([p.shown, p.more]).toEqual([1, 0]);
      else expect(p.shown + p.more).toBe(4);
      for (const r of rects.get(u.id)!) {
        for (const v of us) {
          // komşunun gövdesi bu birimin kendi çubuğunu zaten kesiyorsa (en sıkışık çapraz) o gövde engel sayılmaz; çubuk, ad ve rozetler her zaman
          const others = v === u ? v.parts.filter((x) => x !== v.ownBar) : [...v.parts.filter((x) => !(x === v.body && overlap(u.ownBar, x))), ...rects.get(v.id)!];
          for (const b of others) expect(overlap(r, b), `${u.id} vs ${v.id}`).toBe(false);
        }
      }
    }
  });

  it('öncelik: debuff önce, sonra listedeki sıra, eşitlikte az tur; listede olmayan sona', () => {
    const list = [
      { id: 'haste', debuff: false, turns: 2 },
      { id: 'wound', debuff: true, turns: 3 },
      { id: 'mystery', debuff: true, turns: 1 },
      { id: 'stun', debuff: true, turns: 1 },
      { id: 'fortify', debuff: false, turns: 1 },
    ];
    expect(sortByPriority(list, si.phonePriority).map((b) => b.id)).toEqual(['stun', 'wound', 'mystery', 'fortify', 'haste']);
  });

  it('tek yuva kalan birim: "+N" yerine en önemli durumun rozeti', () => {
    // sağ ve sol yuvaları kapatan iki komşu çubuğu; yalnızca sağ 2. yuva açık kalsın diye engeller elle
    const u = unit('a', 500, 500);
    const blockR0 = { ...unit('r', 0, 0), id: 'r', parts: [{ x0: 560, y0: 480, x1: 602, y1: 530 }, { x0: 700, y0: 480, x1: 800, y1: 530 }], ownBar: { x0: -999, y0: -999, x1: -998, y1: -998 }, body: undefined };
    const blockL = { ...unit('l', 0, 0), id: 'l', parts: [{ x0: 250, y0: 480, x1: 440, y1: 530 }], ownBar: { x0: -999, y0: -999, x1: -998, y1: -998 }, body: undefined };
    const p = solvePhoneBadges([u, blockR0, blockL], new Map([['a', 4], ['r', 0], ['l', 0]]), O).get('a')!;
    expect(p.slots.length).toBe(1);
    expect(p.shown).toBe(1);
    expect(p.more).toBe(0);
  });

  it('rozetsiz birimin planı boş', () => {
    expect(solvePhoneBadges([unit('a', 0, 0)], new Map([['a', 0]]), O).get('a')).toEqual({ size: O.size, slots: [], shown: 0, more: 0 });
  });
});
