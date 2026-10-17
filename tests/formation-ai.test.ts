import { describe, expect, it } from 'vitest';
import aiJson from '../data/ai.json';
import { content } from '../src/engine';
import { planRangeFormation, type FormationWeights, type PlanUnit } from '../src/engine/formation-ai';
import { withOldLayout } from './range-helpers';

// Menzile duyarlı YZ dizilimi (Ömer 2026-10-17; src/engine/formation-ai.ts, ağırlıklar data/ai.json > formation). Quick Battle Randomize,
// otomatik dizilim, sim ve Endless dalgaları bunu kullanır; menzil kapalıyken eski dizilim (golden kayıtlar + mechanics testleri eski kuralı sınar).

const LANES = content.formulas.formation.lanes;
const W = (aiJson as unknown as { formation: FormationWeights }).formation;
const rangeOf = (id: string) => (content.classes[id] ?? content.mobs[id])!.range ?? content.formulas.range!.default;
const rowsOf = (ids: string[], slots: number[]) => Object.fromEntries(ids.map((id, i) => [id, Math.floor(slots[i]! / LANES)]));
const frontRow = (slots: number[]) => Math.min(...slots.map((s) => Math.floor(s / LANES)));

/** Menzil açıkken (bayrak verisi ne olursa olsun) çalıştır. */
function rangeOn<T>(fn: () => T): T {
  const r = content.formulas.range!;
  const was = r.enabled;
  r.enabled = true;
  try {
    return fn();
  } finally {
    r.enabled = was;
  }
}

/** Her birim ana menziliyle düşmanın ön sırasına ilk turdan ulaşır (kendi sırası + 0 + 1 <= menzil). */
function expectReachesFront(ids: string[], slots: number[]) {
  ids.forEach((id, i) => expect(Math.floor(slots[i]! / LANES) + 1, `${id} @${slots[i]}`).toBeLessThanOrEqual(rangeOf(id)));
}

function expectValid(slots: number[], n: number) {
  expect(slots).toHaveLength(n);
  expect(new Set(slots).size).toBe(n);
  for (const s of slots) expect(s >= 0 && s < content.CELL_COUNT).toBe(true);
}

describe('YZ dizilimi menzile duyarlı (menzil açık)', () => {
  it('hepsi uzak: herkes ilk turdan düşman ön sırasına ulaşır; Archer (7) en derinde, Mage (6) ön sırada değil', () => {
    rangeOn(() => {
      const ids = ['archer', 'mage', 'hexer', 'druid'];
      for (const slots of [content.defaultSlots(ids), ...[1, 2, 3, 4, 5].map((s) => content.randomSlots(ids, s))]) {
        expectValid(slots, ids.length);
        expectReachesFront(ids, slots);
        const rows = rowsOf(ids, slots);
        expect(rows.archer).toBe(Math.max(...Object.values(rows)));
        expect(rows.mage).toBeGreaterThan(frontRow(slots));
      }
    });
  });

  it('2 yakın + 2 uzak: yakın dövüşçüler ön sırada, uzaklar arkada ve menzilde', () => {
    rangeOn(() => {
      const ids = ['warrior', 'cutthroat', 'archer', 'mage'];
      for (const slots of [content.defaultSlots(ids), ...[1, 2, 3, 4, 5].map((s) => content.randomSlots(ids, s))]) {
        expectValid(slots, ids.length);
        expectReachesFront(ids, slots);
        const rows = rowsOf(ids, slots);
        expect(rows.warrior).toBe(0);
        expect(rows.cutthroat).toBe(0);
        expect(rows.archer).toBeGreaterThan(0);
        expect(rows.mage).toBeGreaterThan(0);
      }
    });
  });

  it('Defender + Archer + Mage + Hexer: taunt eden Defender ön sırada tek başına, kırılganlar arkada; alan tehdidinde üç kırılgan aynı sıraya yığılmaz', () => {
    rangeOn(() => {
      const ids = ['defender', 'archer', 'mage', 'hexer'];
      const foes = ['mage', 'archer', 'warrior', 'gambler']; // alan şekli olan düşmanlar
      for (const slots of [content.defaultSlots(ids, { foes }), ...[1, 2, 3, 4, 5].map((s) => content.randomSlots(ids, s, { foes }))]) {
        expectValid(slots, ids.length);
        expectReachesFront(ids, slots);
        const rows = rowsOf(ids, slots);
        expect(rows.defender).toBe(0);
        for (const id of ['archer', 'mage', 'hexer']) expect(rows[id], id).toBeGreaterThan(0);
        expect(new Set([rows.archer, rows.mage, rows.hexer]).size).toBeGreaterThan(1);
      }
    });
  });

  it('mızraklı moblar (menzil 2) ikinci sırada, önlerinde yakın dövüşçü', () => {
    rangeOn(() => {
      const spear = 'morvane_halberdier';
      expect(rangeOf(spear)).toBe(2);
      const melee = 'road_thug';
      expect(rangeOf(melee)).toBe(1);
      const ids = [spear, spear, melee, 'bandit_crossbowman'];
      for (const slots of [content.defaultSlots(ids), ...[1, 2, 3].map((s) => content.randomSlots(ids, s))]) {
        expectValid(slots, ids.length);
        expectReachesFront(ids, slots);
        expect(Math.floor(slots[2]! / LANES)).toBe(0);
        expect(Math.floor(slots[0]! / LANES)).toBe(1);
        expect(Math.floor(slots[1]! / LANES)).toBe(1);
      }
    });
  });

  it('Guard sahibi korunacak kırılgan dosta menzilinde kalır (Guard terimi olmasa daha geride dururdu)', () => {
    const tank: PlanUnit = { range: 1, ehp: 200, taunt: true };
    const squishy: PlanUnit = { range: Infinity, ehp: 50, taunt: false };
    const opts = { formation: content.formulas.formation, weights: W, foeAreas: [], start: [0, 3] };
    const free = planRangeFormation([tank, squishy], opts);
    const guarded = planRangeFormation([{ ...tank, guardRange: 2 }, squishy], opts);
    const gap = (s: number[]) => Math.abs(Math.floor(s[0]! / LANES) - Math.floor(s[1]! / LANES));
    expect(gap(free)).toBeGreaterThan(2);
    expect(gap(guarded)).toBeLessThanOrEqual(2);
  });

  it('belirleyici: aynı girdi aynı dizilim; Randomize seed\'e göre farklı dizilimler de üretir', () => {
    rangeOn(() => {
      const ids = ['paladin', 'druid', 'antimage', 'gambler', 'undead'];
      expect(content.defaultSlots(ids)).toEqual(content.defaultSlots(ids));
      expect(content.randomSlots(ids, 42)).toEqual(content.randomSlots(ids, 42));
      const seen = new Set<string>();
      for (let s = 1; s <= 30; s++) seen.add(content.randomSlots(ids, s).join(','));
      expect(seen.size).toBeGreaterThan(1);
      const a = content.battleSetup('random-battle', 9, 'test');
      const b = content.battleSetup('random-battle', 9, 'test');
      expect([a.partySlots, a.enemySlots]).toEqual([b.partySlots, b.enemySlots]);
    });
  });

  it('rastgele savaşlarda (sim) her birim ilk turdan düşman ön sırasına ulaşır', () => {
    rangeOn(() => {
      for (let seed = 1; seed <= 60; seed++) {
        const s = content.battleSetup('random-battle', seed, 'test');
        expectReachesFront(s.party.map((d) => d.id), s.partySlots!);
        expectReachesFront(s.enemies.map((d) => d.id), s.enemySlots!);
      }
    });
  });
});

describe('menzil kapalı: eski dizilim birebir', () => {
  it('bayrak kapalıyken dizilim düşman bilgisini (foes) yok sayar ve menzil açık dizilimden bağımsızdır', () => {
    const ids = ['defender', 'archer', 'mage', 'hexer'];
    const off = withOldLayout(content.formulas, () => ({
      plain: content.defaultSlots(ids),
      foes: content.defaultSlots(ids, { foes: ['mage', 'archer'] }),
      rnd: content.randomSlots(ids, 7),
      rndFoes: content.randomSlots(ids, 7, { foes: ['mage'] }),
    }));
    expect(off.foes).toEqual(off.plain);
    expect(off.rndFoes).toEqual(off.rnd);
    // eski kural: ikişer, şerit 0 ve 2; sıra = yakın dövüş önce, sonra frontPriority
    // eski kural: sıralara ikişer, şerit 0 ve 2; yakın dövüş önce, sonra frontPriority (Defender, Hexer | Mage, Archer)
    expect(off.plain).toEqual([0, 5, 3, 2]);
  });
});
