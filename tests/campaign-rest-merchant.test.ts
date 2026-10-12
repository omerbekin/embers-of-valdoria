import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  autoResolve,
  buyBackItem,
  buyWare,
  campaignStock,
  debugTeleport,
  isFallen,
  leaveMerchant,
  newCampaign,
  nextStep,
  nodeIlvl,
  openCampaignShop,
  rerollCampaignShop,
  restAtCamp,
  reviveAtCamp,
  reviveCost,
  sellToMerchant,
  addItem,
  type CampaignState,
} from '../src/campaign';
import { BAG_SIZE, itemDef, itemValue, sellValue } from '../src/progression';

// Valdoria A1-x (Ömer 2026-10-11): Riverside Camp = dinlenme (ücretsiz %50 iyileşme + altınla diriltme), Forward Camp = tüccar (Odo, Endless kuralları).
const at = (node: string, seed = 5): CampaignState => debugTeleport(newCampaign({ mode: 'normal', seed }), node);

describe('dinlenme noktası (Riverside Camp)', () => {
  it('adım rest; dinlenmek ücretsiz: yaşayanlar maks canın %50si kadar iyileşir (en çok tam), düşmüş kalkmaz; adım tamamlanır', () => {
    let s = at('river');
    expect(nextStep(s)).toEqual({ kind: 'rest', node: 'river' });
    s = { ...s, gold: 40, roster: s.roster.map((h, i) => ({ ...h, hpRatio: [0.2, 0.7, 0, 1][i] ?? 1, alive: i !== 2 })) };
    const r = restAtCamp(s);
    expect(r.gold).toBe(40);
    expect(r.roster.map((h) => h.hpRatio)).toEqual([0.7, 1, 0, 1].slice(0, s.roster.length));
    expect(isFallen(r.roster[2]!)).toBe(true);
    expect(nextStep(r).kind).toBe('move');
    expect(() => restAtCamp(r)).toThrow();
  });

  it('diriltme altınla: fiyat = base + perIlvl x düğümün item seviyesi; reviveRatio canla kalkar; altın yetmezse ya da düşmemişse hata', () => {
    const base = at('river');
    const cost = reviveCost(base);
    expect(cost).toBe(CONFIG.rest.reviveCost.base + CONFIG.rest.reviveCost.perIlvl * nodeIlvl(base.mapId, 'river'));
    expect(cost).toBeGreaterThan(0);
    const fallen = base.roster[1]!.id;
    const s = { ...base, gold: cost, roster: base.roster.map((h) => (h.id === fallen ? { ...h, hpRatio: 0, alive: false } : h)) };
    const r = reviveAtCamp(s, fallen);
    expect(r.gold).toBe(0);
    const h = r.roster.find((x) => x.id === fallen)!;
    expect([h.alive, h.hpRatio]).toEqual([true, CONFIG.rest.reviveRatio]);
    expect(nextStep(r)).toEqual({ kind: 'rest', node: 'river' }); // diriltme adımı bitirmez
    expect(() => reviveAtCamp({ ...s, gold: cost - 1 }, fallen)).toThrow(/gold/);
    expect(() => reviveAtCamp(s, base.roster[0]!.id)).toThrow();
    expect(() => reviveAtCamp(at('10'), fallen)).toThrow(); // dinlenme adımı dışında yok
  });

  it('vekil (sim) altın yettikçe düşmüşleri diriltir, sonra dinlenir; yetmeyen düşmüş kalır', () => {
    const base = at('river');
    const cost = reviveCost(base);
    const [x, y] = [base.roster[0]!.id, base.roster[1]!.id];
    const s = { ...base, gold: cost + 5, roster: base.roster.map((h) => (h.id === x || h.id === y ? { ...h, hpRatio: 0, alive: false } : h)) };
    const r = autoResolve(s, nextStep(s));
    expect(r.gold).toBe(5);
    const fallen = r.roster.filter((h) => isFallen(h));
    expect(fallen).toHaveLength(1);
    const up = r.roster.find((h) => (h.id === x || h.id === y) && !isFallen(h))!;
    expect(up.hpRatio).toBe(Math.min(1, CONFIG.rest.reviveRatio + CONFIG.rest.heal));
    expect(nextStep(r).kind).toBe('move');
  });

  it('otomatik çözüm (sim) dinlenir: ücretsiz iyileşme, altın harcanmaz', () => {
    const s = { ...at('river'), gold: 99 };
    const r = autoResolve(s, nextStep(s));
    expect(r.gold).toBe(99);
    expect(nextStep(r).kind).toBe('move');
  });
});

describe('tüccar (Forward Camp, Odo)', () => {
  const shopAt = (gold = 5000): CampaignState => openCampaignShop({ ...at('camp'), gold, inventory: [] }); // ışınlanma yolda loot toplar: torba boş başlar

  it('adım merchant; tezgâh seed\'li: merchant.size mal, aynı sefer aynı stok, legendary yok, item seviyesi düğümü aşmaz, fiyat = değer', () => {
    const s = at('camp');
    expect(nextStep(s)).toEqual({ kind: 'merchant', node: 'camp' });
    const t = openCampaignShop(s);
    const ilvl = nodeIlvl(s.mapId, 'camp');
    expect(t.shop!.wares).toHaveLength(CONFIG.merchant.size);
    expect(openCampaignShop(at('camp')).shop).toEqual(t.shop);
    expect(new Set(t.shop!.wares.map((w) => w.itemId)).size).toBe(t.shop!.wares.length);
    for (const w of t.shop!.wares) {
      const d = itemDef(w.itemId)!;
      expect(d.rarity).not.toBe('legendary');
      expect(d.ilvl).toBeLessThanOrEqual(ilvl);
      expect(w.price).toBe(itemValue({ id: w.itemId, ...(w.rolls ? { rolls: w.rolls } : {}) }));
    }
    expect(openCampaignShop(t)).toBe(t); // açıkken yeniden kurulmaz
    expect(() => openCampaignShop(at('river'))).toThrow();
  });

  it('al / sat / geri al: altın ve torba doğru değişir; satılan bu ziyarette aynı fiyata geri alınır', () => {
    let s = shopAt();
    const w = s.shop!.wares[0]!;
    s = buyWare(s, 0);
    expect(s.gold).toBe(5000 - w.price);
    expect(s.shop!.wares[0]!.sold).toBe(true);
    const bought = s.inventory[s.inventory.length - 1]!;
    expect(bought.id).toBe(w.itemId);
    expect(() => buyWare(s, 0)).toThrow(/Sold/);
    const before = s.gold;
    s = sellToMerchant(s, bought.uid);
    expect(s.gold).toBe(before + sellValue(bought));
    expect(s.inventory.find((i) => i.uid === bought.uid)).toBeUndefined();
    expect(s.shop!.buyback).toHaveLength(1);
    s = buyBackItem(s, 0);
    expect(s.gold).toBe(before);
    expect(s.inventory.find((i) => i.uid === bought.uid)).toBeTruthy();
    expect(s.shop!.buyback).toHaveLength(0);
  });

  it('kurallar: altın yetmezse, torba doluysa hata; geri alım listesi buybackSize ile sınırlı', () => {
    expect(() => buyWare(shopAt(0), 0)).toThrow(/gold/);
    let full = shopAt();
    while (full.inventory.length < BAG_SIZE) full = addItem(full, 'turnshoes').state;
    expect(() => buyWare(full, 0)).toThrow(/Bag/);
    let s = full;
    for (const it of [...s.inventory].slice(0, CONFIG.merchant.buybackSize + 2)) s = sellToMerchant(s, it.uid);
    expect(s.shop!.buyback).toHaveLength(CONFIG.merchant.buybackSize);
  });

  it('yenileme rerollCost altın; stok değişir; ayrılınca tezgâh kapanır ve adım tamamlanır', () => {
    let s = shopAt(100);
    const first = s.shop!.wares;
    s = rerollCampaignShop(s);
    expect(s.gold).toBe(100 - CONFIG.merchant.rerollCost);
    expect(s.shop!.rerolls).toBe(1);
    expect(s.shop!.wares).toEqual(campaignStock(s, 'camp', 1));
    expect(s.shop!.wares).not.toEqual(first);
    expect(() => rerollCampaignShop({ ...s, gold: 0 })).toThrow(/gold/);
    s = leaveMerchant(s);
    expect(s.shop).toBeUndefined();
    expect(nextStep(s).kind).toBe('move');
  });

  it('otomatik çözüm (sim) alışveriş yapmadan geçer', () => {
    const s = { ...at('camp'), gold: 300 };
    const r = autoResolve(s, nextStep(s));
    expect(r.gold).toBe(300);
    expect(r.shop).toBeUndefined();
    expect(nextStep(r).kind).toBe('move');
  });
});
