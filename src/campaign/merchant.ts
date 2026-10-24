// Sefer tüccarı (Odo; Ömer 2026-10-11, Forward Camp düğümü): Endless tüccarıyla aynı kurallar (alım / satım / geri alım / yenileme), saf.
// Stok: tek nadirlik tablosu (progression > rollDropRarity) + düğümün item seviyesine kadar taban item'ler, örnek takımdan birinin sınıfı için zarlanır;
// fiyat = örneğin değeri, satış = değerin yarısı (progression > itemValue / sellValue). Sayılar data/campaign/campaign.json > merchant.
// Arayüz: src/game/campaign-merchant.ts (TEK giriş noktası; ortak DOM tüccar ekranı src/ui/merchant-screen.ts).
import { BAG_SIZE, ITEMS, canEquip, itemDef, itemValue, rollDropRarity, rollItem, sellValue, type ItemInstance } from '../progression';
import { CONFIG } from './data';
import { nodeIlvl } from './power';
import { rngFor } from './seed';
import { activeHeroes, clone, closeShop, complete, expectStep, mapOf, nextStep } from './state';
import { node } from './graph';
import type { CampaignShop, CampaignState } from './types';

/**
 * Yavaş yenilenme (Ömer 2026-10-24, "node yaptıkça yavaş yavaş değişsin, 2 node 1 item"): sefer ilerlemesi = temizlenen düğüm + devriye
 * zaferi sayısı; her merchant.rotateEvery ilerlemede bir raf sırayla (0, 1, 2 ...) yeni mala döner. Rafın kaçıncı kez döndüğü zarın parçası.
 */
export function shopRotations(s: CampaignState): number {
  const progress = s.cleared.length + Object.values(s.replays ?? {}).reduce((a, n) => a + n, 0);
  return Math.floor(progress / Math.max(1, CONFIG.merchant.rotateEvery));
}

/** Tezgâh stoğu (seed'li: aynı sefer + düğüm + yenileme sayısı + ilerleme = aynı mallar; ilerledikçe raflar teker teker değişir; alınmış raf ilerleme artana dek "sold"). */
export function campaignStock(s: CampaignState, nodeId: string = s.at, reroll = 0): CampaignShop['wares'] {
  const ilvl = Math.max(1, nodeIlvl(s.mapId, nodeId));
  const team = activeHeroes(s).length ? activeHeroes(s) : s.roster;
  const bases = ITEMS.items.filter((d) => d.rarity !== 'legendary' && d.ilvl <= ilvl && (!d.family || team.some((h) => canEquip(h.class, d))));
  const out: CampaignShop['wares'] = [];
  const used = new Set<string>();
  const size = node(mapOf(s), nodeId).merchantSize ?? CONFIG.merchant.size; // kasabalar (T1): Ashford küçük, Valdren Keep büyük stok
  const turns = shopRotations(s);
  const sold = reroll ? undefined : s.merchantSold?.[`${s.mapId}:${nodeId}`]; // yalnız ilk (yenilenmemiş) stokta
  for (let i = 0; i < size; i++) {
    const gen = Math.floor(turns / size) + (i < turns % size ? 1 : 0); // bu raf kaç kez döndü
    const boughtAt = sold?.[i];
    const refill = boughtAt !== undefined && turns > boughtAt; // alınmış raf, ilerleme artınca yeni malla dolar
    const salt: Array<string | number> = refill ? ['refill', boughtAt] : [];
    const rng = gen ? rngFor(s.seed, s.mapId, nodeId, 'shop', reroll, 'slot', i, gen, ...salt) : rngFor(s.seed, s.mapId, nodeId, 'shop', reroll, 'slot', i, ...salt);
    const rarity = rollDropRarity(rng, ilvl, 'normal');
    const pool = bases.filter((d) => !used.has(d.id));
    if (!pool.length) break;
    const d = pool[rng.int(0, pool.length - 1)]!;
    used.add(d.id);
    const fits = team.filter((h) => canEquip(h.class, d));
    const forClass = fits.length ? fits[rng.int(0, fits.length - 1)]!.class : undefined;
    const rolls = rollItem(d, rngFor(s.seed, s.mapId, nodeId, 'ware', reroll, i, gen, ...salt), { rarity, ...(forClass ? { forClass } : {}) });
    out.push({ itemId: d.id, rolls, price: Math.round(itemValue({ id: d.id, rolls }) * (1 + (CONFIG.merchant.priceGrowth ?? 0) * (ilvl - 1))), ...(boughtAt === turns ? { sold: true } : {}) });
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
  t.shop = t.closedShop?.node === t.at ? t.closedShop : { node: t.at, wares: campaignStock(t), buyback: [], rerolls: 0 };
  delete t.closedShop;
  return t;
}

const seenKey = (s: Pick<CampaignState, 'mapId' | 'at'>): string => `${s.mapId}:${s.at}`;

/** Bu tüccarın ("Today's pick") tanışma paneli daha önce gösterildi mi (kayıtla kalıcı). */
export function merchantIntroSeen(s: Pick<CampaignState, 'mapId' | 'at' | 'merchantSeen'>): boolean {
  return !!s.merchantSeen?.[seenKey(s)];
}

/** Tanışma paneli gösterildi diye işaretle (zaten işaretliyse durum aynen). */
export function markMerchantIntroSeen(s: CampaignState): CampaignState {
  if (merchantIntroSeen(s)) return s;
  return { ...s, merchantSeen: { ...(s.merchantSeen ?? {}), [seenKey(s)]: 1 } };
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
  if (!t.shop!.rerolls) {
    const k = `${t.mapId}:${t.at}`;
    t.merchantSold = { ...(t.merchantSold ?? {}), [k]: { ...(t.merchantSold?.[k] ?? {}), [index]: shopRotations(t) } };
  }
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

/** Yenileme bedeli (Ömer 2026-10-24, "lvl ile scalelensin"): merchant.rerollCost + rerollPerLevel x aktif takımın ortalama level'ı. */
export function campaignRerollCost(s: CampaignState): number {
  const team = activeHeroes(s).length ? activeHeroes(s) : s.roster;
  const lvl = team.length ? team.reduce((a, h) => a + (h.level ?? 1), 0) / team.length : 1;
  return Math.round(CONFIG.merchant.rerollCost + (CONFIG.merchant.rerollPerLevel ?? 0) * lvl);
}

/** Malları yenile (campaignRerollCost altın; her yenileme farklı stok). */
export function rerollCampaignShop(s: CampaignState): CampaignState {
  const shop = shopOf(s);
  const cost = campaignRerollCost(s);
  if (s.gold < cost) throw new Error('Not enough gold');
  const t = clone(s);
  t.gold -= cost;
  t.shop!.rerolls = shop.rerolls + 1;
  t.shop!.wares = campaignStock(t, t.at, t.shop!.rerolls);
  return t;
}

/** Tüccardan ayrıl: tezgâh kapanır, düğümün adımı tamamlanır. */
export function leaveMerchant(s: CampaignState): CampaignState {
  expectStep(s, 'merchant');
  const t = clone(s);
  closeShop(t);
  complete(t, 'merchant');
  return t;
}
