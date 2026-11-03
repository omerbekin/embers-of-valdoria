import { describe, expect, it } from 'vitest';
import { desktopBadgeSlots, slotRect, solvePhoneBadges, sortByPriority, type BadgeUnit, type PhoneBadgeOpts } from '../src/game/badge-layout';
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

  it('yalnız birim: tüm durumlar sığarsa sayaç yok; sığmazsa ilk k-1 + "+N"; buff HEP solda, debuff HEP sağda', () => {
    const one = solvePhoneBadges([unit('a', 500, 500)], new Map([['a', { left: 2, right: 3 }]]), O).get('a')!;
    expect([one.left.shown, one.left.more, one.right.shown, one.right.more]).toEqual([2, 0, 3, 0]);
    expect(one.left.slots.every((s) => s.dir === -1)).toBe(true);
    expect(one.right.slots.every((s) => s.dir === 1)).toBe(true);
    expect(one.left.slots.map((s) => s.i)).toEqual([0, 1]);
    const many = solvePhoneBadges([unit('a', 500, 500)], new Map([['a', { left: 9, right: 9 }]]), O).get('a')!;
    expect(many.right.slots.length).toBe(O.perSide);
    expect(many.right.shown).toBe(O.perSide - 1);
    expect(many.right.more).toBe(9 - many.right.shown);
    expect(many.left.slots.every((s) => s.dir === -1)).toBe(true);
  });

  it('taraf kararlı: debuff eklenip çıkarılınca buff yuvaları yerinde kalır', () => {
    const a = solvePhoneBadges([unit('a', 500, 500)], new Map([['a', { left: 1, right: 0 }]]), O).get('a')!;
    const b = solvePhoneBadges([unit('a', 500, 500)], new Map([['a', { left: 1, right: 2 }]]), O).get('a')!;
    expect(b.left).toEqual(a.left);
    expect(a.left.slots).toEqual([{ dir: -1, i: 0 }]);
  });

  it('yoğun 4v4: hiçbir rozet / sayaç başka birimin parçasına ya da rozetine binmez', () => {
    const s = layout.partySlots as Array<{ x: number; y: number }>;
    const us = [0, 1, 3, 4].map((k, n) => unit(`p${n}`, s[k]!.x, s[k]!.y - 190 - 24));
    const counts = new Map(us.map((u) => [u.id, { left: 2, right: 2 }]));
    const plans = solvePhoneBadges(us, counts, O);
    const rects = new Map(us.map((u) => [u.id, [plans.get(u.id)!.left, plans.get(u.id)!.right].filter((sd) => !sd.forced).flatMap((sd) => sd.slots).map((sl) => slotRect(u, sl, O.size, O.gapBar, O.gapItem, O.top))]));
    for (const u of us) {
      const p = plans.get(u.id)!;
      // taraf sabit ve asla tamamen kaybolmaz: sıkışık dizilimde bile her tarafta en az bir rozet
      expect(p.left.slots.length).toBeGreaterThan(0);
      expect(p.right.slots.length).toBeGreaterThan(0);
      for (const sd of [p.left, p.right]) {
        // tek yuvada en önemli rozet (sayaç yok); 2+ yuvada k-1 rozet + "+N"
        if (sd.slots.length === 1) expect([sd.shown, sd.more]).toEqual([1, 0]);
        else expect(sd.shown + sd.more).toBe(2);
      }
      for (const r of rects.get(u.id)!) {
        for (const v of us) {
          // komşunun gövdesi bu birimin kendi çubuğunu zaten kesiyorsa (en sıkışık çapraz) o gövde engel sayılmaz; çubuk, ad ve rozetler her zaman
          const others = v === u ? v.parts.filter((x) => x !== v.ownBar) : [...v.parts.filter((x) => !(x === v.body && overlap(u.ownBar, x))), ...rects.get(v.id)!];
          for (const b of others) expect(overlap(r, b), `${u.id} vs ${v.id}`).toBe(false);
        }
      }
    }
  });

  it('öncelik: debuff önce, sonra listedeki sıra, eşitlikte girdi sırası; listede olmayan sona', () => {
    const list = [
      { id: 'haste', debuff: false, turns: 2 },
      { id: 'wound', debuff: true, turns: 3 },
      { id: 'mystery', debuff: true, turns: 1 },
      { id: 'stun', debuff: true, turns: 1 },
      { id: 'fortify', debuff: false, turns: 1 },
    ];
    expect(sortByPriority(list, si.phonePriority).map((b) => b.id)).toEqual(['stun', 'wound', 'mystery', 'fortify', 'haste']);
  });

  it('tek yuva kalan taraf: "+N" yerine en önemli durumun rozeti', () => {
    // sağ 2. yuvadan sonrasını ve sol tarafı kapatan engeller: sağda yalnızca ilk yuva açık
    const u = unit('a', 500, 500);
    const blockR = { ...unit('r', 0, 0), id: 'r', parts: [{ x0: 610, y0: 480, x1: 800, y1: 530 }], ownBar: { x0: -999, y0: -999, x1: -998, y1: -998 }, body: undefined };
    const p = solvePhoneBadges([u, blockR], new Map([['a', { left: 0, right: 4 }], ['r', { left: 0, right: 0 }]]), O).get('a')!;
    expect(p.right.slots.length).toBe(1);
    expect(p.right.shown).toBe(1);
    expect(p.right.more).toBe(0);
    expect(p.left.slots).toEqual([]);
  });

  it('tamamen kapalı taraf: en önemli durum ilk yuvada zorla gösterilir, karşı tarafa taşınmaz', () => {
    const u = unit('a', 500, 500);
    const wall = { ...unit('w', 0, 0), id: 'w', parts: [{ x0: 300, y0: 400, x1: 700, y1: 600 }], ownBar: { x0: -999, y0: -999, x1: -998, y1: -998 }, body: undefined };
    const p = solvePhoneBadges([u, wall], new Map([['a', { left: 3, right: 1 }], ['w', { left: 0, right: 0 }]]), O).get('a')!;
    expect(p.left.forced).toBe(true);
    expect(p.left.slots).toEqual([{ dir: -1, i: 0 }]);
    expect([p.left.shown, p.left.more]).toEqual([1, 0]);
    expect(p.right.slots).toEqual([{ dir: 1, i: 0 }]);
  });

  it('rozetsiz birimin planı boş', () => {
    const e = { slots: [], shown: 0, more: 0 };
    expect(solvePhoneBadges([unit('a', 0, 0)], new Map([['a', { left: 0, right: 0 }]]), O).get('a')).toEqual({ size: O.size, left: e, right: e });
  });

  it('masaüstü: buff HEP solda, debuff HEP sağda; hiçbiri gizlenmez / geçmez; ekleme-çıkarma karşı tarafı oynatmaz', () => {
    const kinds = [true, false, true, false, false, true, false];
    const slots = desktopBadgeSlots(kinds, 4);
    expect(slots.length).toBe(kinds.length);
    slots.forEach((s, n) => expect(s.dir).toBe(kinds[n] ? 1 : -1));
    // aynı taraf içinde girdi sırası: 0,1,2,3 sonra ikinci satır
    expect(slots.filter((s) => s.dir === -1).map((s) => [s.col, s.row])).toEqual([[0, 0], [1, 0], [2, 0], [3, 0]]);
    expect(desktopBadgeSlots([false, false, false, false, false], 4)[4]).toEqual({ dir: -1, col: 0, row: 1 });
    // debuff eklenince buff'ların yeri değişmez
    const withoutDebuffs = desktopBadgeSlots([false, false, false], 4);
    const withDebuffs = desktopBadgeSlots([true, false, true, false, true, false], 4).filter((s) => s.dir === -1);
    expect(withDebuffs).toEqual(withoutDebuffs);
  });
});
