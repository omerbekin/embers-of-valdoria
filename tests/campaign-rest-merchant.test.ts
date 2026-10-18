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
  sellToMerchant,
  addItem,
  type CampaignState,
} from '../src/campaign';
import { BAG_SIZE, itemDef, itemValue, sellValue } from '../src/progression';

// Valdoria A1-x (Ömer 2026-10-11): Riverside Camp = dinlenme (ücretsiz %50 iyileşme; 2026-10-18'den beri diriltme yok), Forward Camp = tüccar (Odo, Endless kuralları).
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

  it('dinlenme DİRİLTMEZ (Ömer 2026-10-18, TUR 1 madde 10): veride diriltme fiyatı yok; eski diriltme çağrısı durumu değiştirmez; vekil düşmüşü kaldırmaz', () => {
    expect((CONFIG.rest as Record<string, unknown>).reviveCost).toBeUndefined();
    expect((CONFIG.rest as Record<string, unknown>).reviveRatio).toBeUndefined();
    const base = at('river');
    const fallen = base.roster[1]!.id;
    const s = { ...base, gold: 999, roster: base.roster.map((h) => (h.id === fallen ? { ...h, hpRatio: 0, alive: false } : h)) };
    expect(reviveAtCamp(s, fallen)).toBe(s);
    const r = autoResolve(s, nextStep(s));
    expect(r.gold).toBe(999);
    expect(isFallen(r.roster.find((h) => h.id === fallen)!)).toBe(true);
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
