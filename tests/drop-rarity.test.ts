import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine';
import { DROP, DROP_RARITIES, ITEMS, dropChances, dropShift, instanceRarity, itemDef, rollDropRarity, rollLoot, validateDropRarity } from '../src/progression';
import { newRun, rewardOffer, shopStock, type EndlessRun } from '../src/endless';

// Düşüş nadirliği (Ömer onayı 2026-10-11): tek ağırlık tablosu; Common norm, Uncommon güzel bulgu, Rare dikkat çekici, Epic her dalgada gerçekten
// özel. Dalga / item seviyesi ve elit / boss yalnızca hafif kaydırır, sert tavanlı. Taban item nadirlikten bağımsız. Legendary bu tablodan çıkmaz.

describe('tek nadirlik tablosu', () => {
  it('veri geçerli; Legendary tabloda yok; Common > Uncommon > Rare > Epic', () => {
    expect(validateDropRarity()).toEqual([]);
    expect(DROP_RARITIES).toEqual(['common', 'uncommon', 'rare', 'epic']);
    const w = DROP.weights;
    expect(w.common > w.uncommon && w.uncommon > w.rare && w.rare > w.epic).toBe(true);
  });

  it('kayma hafif ve tavanlı: en uç durumda bile Common norm, Epic %5\'in altında', () => {
    expect(dropShift(0)).toBe(0);
    expect(dropShift(999, 'boss')).toBe(DROP.shift.max);
    const lo = dropChances(0);
    const hi = dropChances(999, 'boss');
    expect(lo.common).toBeGreaterThan(60);
    expect(hi.common).toBeGreaterThan(50);
    expect(hi.common).toBeGreaterThan(hi.uncommon + hi.rare + hi.epic);
    expect(hi.epic).toBeLessThan(5);
    expect(hi.rare).toBeGreaterThan(lo.rare);
    expect(dropChances(10, 'elite').epic).toBeGreaterThan(dropChances(10).epic);
  });

  it('zar belirleyici ve ağırlıklara uyar (10.000 zar)', () => {
    const rng = new Rng(3);
    const n: Record<string, number> = { common: 0, uncommon: 0, rare: 0, epic: 0 };
    for (let i = 0; i < 10_000; i++) n[rollDropRarity(rng, 10)]!++;
    const c = dropChances(10);
    for (const r of DROP_RARITIES) expect(Math.abs(n[r]! / 100 - c[r])).toBeLessThan(1.5);
    expect(rollDropRarity(new Rng(9), 5)).toBe(rollDropRarity(new Rng(9), 5));
  });
});

describe('sefer loot\'u', () => {
  const party = ['warrior', 'mage', 'archer', 'gambler'].map((c) => ({ class: c }));

  it('nadirlik tablodan, taban nadirlikten bağımsız; Legendary yok; boss / hazine ilk zaferde en az Rare (karar korunur)', () => {
    let epic = 0;
    let total = 0;
    let commonBaseRare = 0;
    for (let i = 0; i < 2000; i++) {
      const r = rollLoot({ rng: new Rng(i), kind: 'battle', chapter: 1, ilvl: 10, party });
      expect(r.rarities).toHaveLength(r.items.length);
      r.items.forEach((id, k) => {
        const d = itemDef(id)!;
        expect(d.rarity).not.toBe('legendary');
        expect(r.rarities[k]).not.toBe('legendary');
        if (d.rarity === 'common' && r.rarities[k] !== 'common') commonBaseRare++;
        if (r.rarities[k] === 'epic') epic++;
        total++;
      });
      for (const kind of ['boss', 'treasure'] as const) expect(['rare', 'epic']).toContain(rollLoot({ rng: new Rng(i), kind, chapter: 1, ilvl: 10, party }).rarities[0]);
    }
    expect(commonBaseRare).toBeGreaterThan(0); // taban nadirlikten bağımsız
    expect(epic / total).toBeLessThan(0.06); // Epic gerçekten özel
    expect(epic).toBeGreaterThan(0);
  });
});

describe('Endless: ödül kartları ve tüccar', () => {
  const PARTY = ['warrior', 'archer', 'mage', 'druid'];
  const after = (cleared: number, seed: number): EndlessRun => ({ ...newRun(seed, PARTY, 't'), wave: cleared + 1, phase: 'reward', stats: { cleared, turns: 0, kills: 0 } });

  it('Epic yağmuru yok: 6-10. dalga ödül + tüccar teklifinde Epic az, Common çoğunluk', () => {
    const n: Record<string, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    for (let seed = 1; seed <= 150; seed++)
      for (const cleared of [5, 6, 7, 8, 9, 10]) {
        const run = after(cleared, seed);
        for (const c of rewardOffer(run)) if (c.kind === 'item') n[instanceRarity({ id: c.itemId, rolls: c.rolls })]!++;
        if (cleared === 5) for (const e of shopStock(run)) n[instanceRarity({ id: e.itemId, rolls: e.rolls })]!++; // tüccar (nadir mal 11. dalgadan itibaren)
      }
    const total = Object.values(n).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(500);
    expect(n.epic! / total).toBeLessThan(0.08);
    expect(n.common! / total).toBeGreaterThan(0.45);
    expect(n.legendary).toBe(0); // tüccarın nadir malı 11. dalgadan itibaren
  });

  it('boss / elit kartı artık en az Rare / Epic değil; nadirlik örneğin zarında, fiyat örneğin değeri', () => {
    const rar = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) for (const c of rewardOffer(after(10, seed))) if (c.kind === 'item') rar.add(c.rolls!.rarity!);
    expect(rar.has('common') || rar.has('uncommon')).toBe(true);
    expect(ITEMS.items.some((d) => d.rarity === 'epic')).toBe(true);
  });
});
