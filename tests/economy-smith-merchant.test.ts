import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import {
  CONFIG,
  SMITH,
  activeHeroes,
  campaignPrice,
  combineItems,
  rarityPrice,
  reforgePrice,
  combinePreview,
  combineRng,
  debugTeleport,
  grantLoot,
  newCampaign,
  rollTemperStones,
  temperItem,
  temperPreview,
  temperStoneCost,
  type CampaignState,
} from '../src/campaign';
import { DROP, ITEMS, RARITY_IDS, instanceIlvl, instanceRarity, makeItem, type ItemInstance, type RarityId } from '../src/progression';

// Ömer 2026-10-26 (form econ/main): Temper taşı, taşlı Temper, Combine, tüccar fiyatı / tablo.
const fresh = (): CampaignState => ({ ...newCampaign({ mode: 'normal', seed: 11 }), gold: 10000, inventory: [] });
/** Takımlı durum (kasaba 7'ye ışınlanmış; yoldaki loot / taş temizlenir). */
const base = (): CampaignState => {
  const s: CampaignState = { ...debugTeleport(newCampaign({ mode: 'normal', seed: 11 }), '7'), gold: 10000, inventory: [] };
  delete s.temperStones;
  delete s.pendingLoot;
  return s;
};
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const nonLeg = ITEMS.items.filter((d) => d.rarity !== 'legendary');
const mk = (uid: string, rarity: RarityId, ilvl: number, id = nonLeg[0]!.id): ItemInstance => makeItem(id, uid, new Rng(uid.length * 7 + ilvl), { rarity, ilvl });

describe('Temper taşı (yeni kaynak)', () => {
  it('tablo: boss 1-3 taş (%60 / %30 / %10), elit %50 ile 1 taş; diğerleri 0', () => {
    const n = 20000;
    const rng = new Rng(5);
    const boss = [0, 0, 0, 0];
    const elite = [0, 0];
    for (let i = 0; i < n; i++) boss[rollTemperStones(rng, 'boss')]!++;
    for (let i = 0; i < n; i++) elite[rollTemperStones(rng, 'elite')]!++;
    expect(boss[0]).toBe(0);
    expect(boss[1]! / n).toBeCloseTo(0.6, 1);
    expect(boss[2]! / n).toBeCloseTo(0.3, 1);
    expect(boss[3]! / n).toBeCloseTo(0.1, 1);
    expect(elite[1]! / n).toBeCloseTo(0.5, 1);
    expect(rollTemperStones(rng, 'battle')).toBe(0);
    expect(rollTemperStones(rng, 'treasure')).toBe(0);
  });

  it('yalnız İLK zafer: boss ilk zaferi taş verir, devriye (tekrar) vermez; seed\'li, düşüş kartında yazar; loot zarı aynı', () => {
    const t = clone(fresh());
    const party = activeHeroes(t);
    const before = clone(t);
    const d1 = grantLoot(t, '7', 'boss', party);
    expect(d1.stones).toBeGreaterThanOrEqual(1);
    expect(d1.stones).toBeLessThanOrEqual(3);
    expect(t.temperStones).toBe(d1.stones);
    expect(t.pendingLoot?.stones).toBe(d1.stones);
    const again = clone(before);
    expect(grantLoot(again, '7', 'boss', party)).toEqual(d1); // aynı seed = aynı sonuç
    const d2 = grantLoot(t, '7', 'boss', party);
    expect(d2.stones).toBeUndefined();
    expect(t.temperStones).toBe(d1.stones);
    const n = clone(fresh());
    expect(grantLoot(n, '7', 'battle', activeHeroes(n)).stones).toBeUndefined();
    expect(n.temperStones).toBeUndefined();
  });
});

describe('Temper: taş + altın', () => {
  const town = (stones: number, inst: ItemInstance): CampaignState => ({ ...base(), mapId: 'valdoria', temperStones: stones, inventory: [inst] });
  it('1 taş; hedef item seviyesi 15\'in üstündeyse 2 taş; taş yetmezse engel; taş ve altın düşer', () => {
    expect(SMITH.temper.stones).toBe(1);
    expect(SMITH.temper.highStones).toBe(2);
    expect(SMITH.temper.highAbove).toBe(15);
    expect(temperStoneCost(mk('a', 'common', 14))).toBe(1); // 14 -> 15
    expect(temperStoneCost(mk('a', 'common', 15))).toBe(2); // 15 -> 16
    const inst = mk('i900', 'rare', 5);
    const p0 = temperPreview(town(0, inst), inst.uid)!;
    expect(p0.stones).toBe(1);
    expect(p0.stonesHave).toBe(0);
    expect(p0.blocked).toMatch(/1 more Temper Stone$/);
    expect(() => temperItem(town(0, inst), inst.uid)).toThrow(/Temper Stone/);
    const s = town(3, inst);
    const p = temperPreview(s, inst.uid)!;
    expect(p.blocked).toBeNull();
    const t = temperItem(s, inst.uid);
    expect(t.temperStones).toBe(2);
    expect(t.gold).toBe(s.gold - p.price);
    expect(instanceIlvl(t.inventory[0]!)).toBe(6);
  });
});

describe('Combine', () => {
  const withBag = (items: ItemInstance[], gold = 10000): CampaignState => ({ ...base(), gold, inventory: items, nextItemId: 500 });

  it('nadirlik = sıra ortalaması, kesir kadar üst ihtimali; ilvl = ortalama aşağı; bedel küçük; 3 item yok olur, 1 yeni gelir', () => {
    const items = [mk('a', 'rare', 7, nonLeg[0]!.id), mk('b', 'rare', 8, nonLeg[1]!.id), mk('c', 'epic', 8, nonLeg[2]!.id)];
    const s = withBag(items);
    const p = combinePreview(s, ['a', 'b', 'c']);
    expect(p.blocked).toBeNull();
    expect(p.rarityLow).toBe('rare');
    expect(p.rarityHigh).toBe('epic');
    expect(p.upChance).toBeCloseTo(1 / 3, 6);
    expect(p.ilvl).toBe(7); // 23 / 3 = 7,67 -> 7
    expect(p.sameBase).toBeNull();
    expect(p.price).toBeGreaterThan(0);
    expect(p.price).toBeLessThan(100);
    const t = combineItems(s, ['a', 'b', 'c']);
    expect(t.inventory).toHaveLength(1);
    const out = t.inventory[0]!;
    expect(out.uid).toBe('i500');
    expect(['rare', 'epic']).toContain(instanceRarity(out));
    expect(instanceIlvl(out)).toBe(7);
    expect(ITEMS.items.find((d) => d.id === out.id)!.ilvl).toBeLessThanOrEqual(7);
    expect(t.gold).toBe(s.gold - p.price);
    expect(combineItems(s, ['c', 'a', 'b'])).toEqual(t); // seed'li: sıra fark etmez, aynı kayıt = aynı sonuç
  });

  it('üst ihtimali dağılımı: 2,33 -> ~%33 bir üst', () => {
    const items = [mk('a', 'rare', 5), mk('b', 'rare', 5), mk('c', 'epic', 5)];
    const s = withBag(items);
    let up = 0;
    const n = 600;
    for (let i = 0; i < n; i++) if (instanceRarity(combineItems(s, ['a', 'b', 'c'], new Rng(1000 + i)).inventory[0]!) === 'epic') up++;
    expect(up / n).toBeGreaterThan(0.26);
    expect(up / n).toBeLessThan(0.41);
  });

  it('3\'ü aynı tabansa sonuç aynı taban (yeni affix\'ler); kesir yoksa nadirlik sabit', () => {
    const id = nonLeg.find((d) => d.slot === 'weapon')!.id;
    const items = [mk('a', 'uncommon', 4, id), mk('b', 'uncommon', 4, id), mk('c', 'uncommon', 4, id)];
    const s = withBag(items);
    const p = combinePreview(s, ['a', 'b', 'c']);
    expect(p.sameBase).toBe(id);
    expect(p.upChance).toBe(0);
    for (let i = 0; i < 20; i++) {
      const out = combineItems(s, ['a', 'b', 'c'], new Rng(i)).inventory[0]!;
      expect(out.id).toBe(id);
      expect(instanceRarity(out)).toBe('uncommon');
    }
    expect(combineRng(s, ['a', 'b', 'c']).next()).toBe(combineRng(s, ['c', 'b', 'a']).next());
  });

  it('kurallar: tam 3 farklı item; takılı item konamaz; Legendary konamaz; sonuç en çok Epic; altın yetmezse engel', () => {
    const items = [mk('a', 'epic', 5), mk('b', 'epic', 5), mk('c', 'epic', 5)];
    const s = withBag(items);
    expect(combinePreview(s, ['a', 'b']).blocked).toMatch(/Choose 3/);
    expect(combinePreview(s, ['a', 'a', 'b']).blocked).toMatch(/Choose 3/);
    const e = combinePreview(s, ['a', 'b', 'c']);
    expect(e.rarityHigh).toBe('epic');
    expect(e.upChance).toBe(0);
    const leg = ITEMS.items.find((d) => d.rarity === 'legendary')!;
    const sl = withBag([...items.slice(0, 2), makeItem(leg.id, 'L', new Rng(1))]);
    expect(combinePreview(sl, ['a', 'b', 'L']).blocked).toMatch(/Legendary/);
    const h = s.roster[0]!;
    const worn = { ...s, inventory: items.slice(0, 2), roster: s.roster.map((x) => (x.id === h.id ? { ...x, equipment: { ...x.equipment, helm: items[2]! } } : x)) };
    expect(combinePreview(worn, ['a', 'b', 'c']).blocked).toMatch(/Unequip/);
    expect(() => combineItems(worn, ['a', 'b', 'c'])).toThrow(/Unequip/);
    expect(combinePreview({ ...s, gold: 0 }, ['a', 'b', 'c']).blocked).toMatch(/more gold/);
    expect(RARITY_IDS.indexOf(instanceRarity(combineItems(s, ['a', 'b', 'c']).inventory[0]!))).toBeLessThanOrEqual(RARITY_IDS.indexOf('epic'));
  });
});

describe('tüccar / düşüş tablosu (Ömer 2026-10-26)', () => {
  it('düşüş ve tüccar tablosu 64 / 25 / 8,5 / 2,5; fiyat tabanları 20 / 40 / 90 / 200, seviye başına +%10; savaş altını x0,85', () => {
    expect(DROP.weights).toEqual({ common: 64, uncommon: 25, rare: 8.5, epic: 2.5 });
    expect(CONFIG.merchant.priceBase).toMatchObject({ common: 20, uncommon: 40, rare: 90, epic: 200 });
    expect(CONFIG.merchant.pricePerIlvl).toBe(0.1);
    expect(ITEMS.loot.gold).toMatchObject({ battle: 3.4, elite: 6.8, boss: 13.6 });
  });
});

describe('Reroll affix (Reforge) fiyatı (Ömer 2026-10-26)', () => {
  it('= 0,5 x sefer tüccarı fiyatı (Epic: rarityPrice(epic, ilvl)), her tekrarda x1,5', () => {
    const e = mk('r1', 'epic', 8);
    expect(SMITH.reforge.valueRatio).toBe(0.5);
    expect(reforgePrice(e)).toBe(Math.round(0.5 * campaignPrice(e)));
    expect(campaignPrice(e)).toBe(Math.round(rarityPrice('epic', 8)));
    expect(reforgePrice({ ...e, reforges: 2 })).toBe(Math.round(0.5 * campaignPrice(e) * 1.5 * 1.5));
  });
});
