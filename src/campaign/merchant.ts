// Sefer tüccarı (Odo; Ömer 2026-10-11, Forward Camp düğümü): Endless tüccarıyla aynı kurallar (alım / satım / geri alım / yenileme), saf.
// Stok: tek nadirlik tablosu (progression > rollDropRarity) + düğümün item seviyesine kadar taban item'ler, örnek takımdan birinin sınıfı için zarlanır;
// fiyat = örneğin değeri, satış = değerin yarısı (progression > itemValue / sellValue). Sayılar data/campaign/campaign.json > merchant.
// Arayüz: src/game/campaign-merchant.ts (TEK giriş noktası; ortak DOM tüccar ekranı src/ui/merchant-screen.ts).
import { BAG_SIZE, ITEMS, canEquip, itemDef, itemValue, rollDropRarity, rollItem, sellValue, type ItemInstance } from '../progression';
import { CONFIG } from './data';
import { nodeIlvl } from './power';
import { rngFor } from './seed';
import { activeHeroes, clone, complete, expectStep, mapOf, nextStep } from './state';
import { node } from './graph';
import type { CampaignShop, CampaignState } from './types';

/** Tezgâh stoğu (seed'li: aynı sefer + düğüm + yenileme sayısı = aynı mallar). */
export function campaignStock(s: CampaignState, nodeId: string = s.at, reroll = 0): CampaignShop['wares'] {
  const ilvl = Math.max(1, nodeIlvl(s.mapId, nodeId));
  const rng = rngFor(s.seed, s.mapId, nodeId, 'shop', reroll);
  const team = activeHeroes(s).length ? activeHeroes(s) : s.roster;
  const bases = ITEMS.items.filter((d) => d.rarity !== 'legendary' && d.ilvl <= ilvl && (!d.family || team.some((h) => canEquip(h.class, d))));
  const out: CampaignShop['wares'] = [];
  const used = new Set<string>();
  const size = node(mapOf(s), nodeId).merchantSize ?? CONFIG.merchant.size; // kasabalar (T1): Ashford küçük, Valdren Keep büyük stok
  for (let i = 0; i < size; i++) {
    const rarity = rollDropRarity(rng, ilvl, 'normal');
    const pool = bases.filter((d) => !used.has(d.id));
    if (!pool.length) break;
    const d = pool[rng.int(0, pool.length - 1)]!;
    used.add(d.id);
    const fits = team.filter((h) => canEquip(h.class, d));
    const forClass = fits.length ? fits[rng.int(0, fits.length - 1)]!.class : undefined;
    const rolls = rollItem(d, rngFor(s.seed, s.mapId, nodeId, 'ware', reroll, i), { rarity, ...(forClass ? { forClass } : {}) });
    out.push({ itemId: d.id, rolls, price: itemValue({ id: d.id, rolls }) });
  }
  return out;
}

/** Burada tüccar açılabilir mi: tüccar adımı ya da tüccarlı kasabanın kasaba adımı (T1; kasaba Leave'i tezgâhı kapatır). */
export function merchantHere(s: CampaignState): boolean {
  const step = nextStep(s);
  return step.kind === 'merchant' || (step.kind === 'town' && !!node(mapOf(s), s.at).merchant);
}

/** Tüccara varış: tezgâh kurulur (tüccar adımında ya da tüccarlı kasabada; zaten açıksa durum aynen). */
export function openCampaignShop(s: CampaignState): CampaignState {
  if (!merchantHere(s)) throw new Error('The merchant is not here');
  if (s.shop?.node === s.at) return s;
  const t = clone(s);
  t.shop = { node: t.at, wares: campaignStock(t), buyback: [], rerolls: 0 };
  return t;
}

const shopOf = (s: CampaignState): CampaignShop => {
  if (!s.shop || s.shop.node !== s.at) throw new Error('The merchant is not here');
  return s.shop;
};

/** Malı satın al: altın ve torba yeri yeterse örnek torbaya (aynı zarlar), satır "sold". */
export function buyWare(s: CampaignState, index: number): CampaignState {
  const w = shopOf(s).wares[index];
  if (!w || w.sold) throw new Error('Sold out');
  if (s.gold < w.price) throw new Error('Not enough gold');
  if (s.inventory.length >= BAG_SIZE) throw new Error('Bag is full');
  const t = clone(s);
  const tw = t.shop!.wares[index]!;
  t.gold -= tw.price;
  t.inventory.push({ uid: `i${t.nextItemId++}`, id: tw.itemId, ...(tw.rolls ? { rolls: tw.rolls } : {}) });
  tw.sold = true;
  return t;
}

/** Torbadaki item'i sat (takılı olanlar satılmaz): altın += satış değeri; bu ziyaretin geri alım listesine girer. */
export function sellToMerchant(s: CampaignState, uid: string): CampaignState {
  shopOf(s);
  const idx = s.inventory.findIndex((i) => i.uid === uid);
  if (idx < 0) throw new Error('Item not in the bag');
  const t = clone(s);
  const [item] = t.inventory.splice(idx, 1) as [ItemInstance];
  const price = itemDef(item.id) ? sellValue(item) : 0;
  t.gold += price;
  const list = [...t.shop!.buyback, { item, price }];
  t.shop!.buyback = list.slice(Math.max(0, list.length - Math.max(1, CONFIG.merchant.buybackSize)));
  return t;
}

/** Geri alım: bu ziyarette satılan item aynı fiyata torbaya döner (aynı uid). */
export function buyBackItem(s: CampaignState, index: number): CampaignState {
  const e = shopOf(s).buyback[index];
  if (!e) throw new Error('Nothing to buy back');
  if (s.gold < e.price) throw new Error('Not enough gold');
  if (s.inventory.length >= BAG_SIZE) throw new Error('Bag is full');
  const t = clone(s);
  t.gold -= e.price;
  t.inventory.push({ ...t.shop!.buyback[index]!.item });
  t.shop!.buyback.splice(index, 1);
  return t;
}

/** Malları yenile (merchant.rerollCost altın; her yenileme farklı stok). */
export function rerollCampaignShop(s: CampaignState): CampaignState {
  const shop = shopOf(s);
  if (s.gold < CONFIG.merchant.rerollCost) throw new Error('Not enough gold');
  const t = clone(s);
  t.gold -= CONFIG.merchant.rerollCost;
  t.shop!.rerolls = shop.rerolls + 1;
  t.shop!.wares = campaignStock(t, t.at, t.shop!.rerolls);
  return t;
}

/** Tüccardan ayrıl: tezgâh kapanır, düğümün adımı tamamlanır. */
export function leaveMerchant(s: CampaignState): CampaignState {
  expectStep(s, 'merchant');
  const t = clone(s);
  delete t.shop;
  complete(t, 'merchant');
  return t;
}
