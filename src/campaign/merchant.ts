// Sefer tüccarı (Odo; Ömer 2026-10-11, Forward Camp düğümü): Endless tüccarıyla aynı kurallar (alım / satım / geri alım / yenileme), saf.
// Stok: tek nadirlik tablosu (progression > rollDropRarity) + düğümün item seviyesine kadar taban item'ler, örnek takımdan birinin sınıfı için zarlanır;
// fiyat = nadirlik tabanı x (1 + 0,1 x item seviyesi), satış = bu fiyatın yarısı (Ömer 2026-10-26; campaignPrice / campaignSellValue); stok GÜNLÜK
// yenilenir (CampaignState.day). Sayılar data/campaign/campaign.json > merchant.
// Arayüz: src/game/campaign-merchant.ts (TEK giriş noktası; ortak DOM tüccar ekranı src/ui/merchant-screen.ts).
import { BAG_SIZE, ITEMS, canEquip, instanceIlvl, instanceRarity, itemDef, rollDropRarity, rollItem, type ItemInstance, type RarityId } from '../progression';
import { CONFIG } from './data';
import { nodeIlvl } from './power';
import { rngFor } from './seed';
import { activeHeroes, clone, closeShop, complete, expectStep, mapOf, nextStep } from './state';
import { node } from './graph';
import type { CampaignShop, CampaignState } from './types';

/** Seferin günü (campaign-dev'in CampaignState.day alanı; Inn / kamp / dinlenme ilerletir). Alan yoksa (eski kayıt ya da henüz eklenmediyse) 0. */
export const campaignDay = (s: CampaignState): number => Math.max(0, Math.floor((s as CampaignState & { day?: number }).day ?? 0));

/**
 * Sefer tüccarı fiyatı (Ömer 2026-10-26, form econ/main): priceBase[nadirlik] x (1 + pricePerIlvl x item seviyesi), yuvarlanır, en az 1.
 * IP değerinden bağımsız (itemValue Endless tüccarında ve Reforge'da kalır). Nadirlik tabanı yoksa Epic'inki.
 */
export function campaignPrice(inst: Pick<ItemInstance, 'id'> & { rolls?: unknown }): number {
  return Math.max(1, Math.round(rarityPrice(instanceRarity(inst), instanceIlvl(inst))));
}

/** Nadirlik + item seviyesinin (yuvarlanmamış) tüccar fiyatı: priceBase[nadirlik] x (1 + pricePerIlvl x ilvl). Demircinin Combine bedeli de kullanır. */
export function rarityPrice(rarity: RarityId, ilvl: number): number {
  const M = CONFIG.merchant;
  const base = M.priceBase[rarity] ?? M.priceBase['epic'] ?? 0;
  return base * (1 + (M.pricePerIlvl ?? 0) * Math.max(0, ilvl));
}

/** Seferde satış değeri = tüccar fiyatının yarısı (items.json > budget.sellRatio), en az 1. Alım fiyatıyla tutarlı: al-sat kârı yok. */
export const campaignSellValue = (inst: Pick<ItemInstance, 'id'> & { rolls?: unknown }): number => Math.max(1, Math.round(campaignPrice(inst) * ITEMS.budget.sellRatio));

/**
 * Tezgâh stoğu (Ömer 2026-10-26: GÜNLÜK yenilenme): seed'li, aynı sefer + düğüm + yenileme sayısı + gün = aynı mallar; gün değişince bütün raflar yeni.
 * O gün alınmış raf (merchantSold = alındığı gün) yalnız ilk (yenilenmemiş) stokta "sold".
 */
export function campaignStock(s: CampaignState, nodeId: string = s.at, reroll = 0): CampaignShop['wares'] {
  const ilvl = Math.max(1, nodeIlvl(s.mapId, nodeId));
  const team = activeHeroes(s).length ? activeHeroes(s) : s.roster;
  const bases = ITEMS.items.filter((d) => d.rarity !== 'legendary' && d.ilvl <= ilvl && (!d.family || team.some((h) => canEquip(h.class, d))));
  const out: CampaignShop['wares'] = [];
  const used = new Set<string>();
  const size = node(mapOf(s), nodeId).merchantSize ?? CONFIG.merchant.size; // kasabalar (T1): Ashford küçük, Valdren Keep büyük stok
  const day = campaignDay(s);
  const sold = reroll ? undefined : s.merchantSold?.[`${s.mapId}:${nodeId}`]; // yalnız ilk (yenilenmemiş) stokta
  for (let i = 0; i < size; i++) {
    const rng = rngFor(s.seed, s.mapId, nodeId, 'shop', reroll, 'day', day, 'slot', i);
    const rarity = rollDropRarity(rng, ilvl, 'normal');
    const pool = bases.filter((d) => !used.has(d.id));
    if (!pool.length) break;
    const d = pool[rng.int(0, pool.length - 1)]!;
    used.add(d.id);
    const fits = team.filter((h) => canEquip(h.class, d));
    const forClass = fits.length ? fits[rng.int(0, fits.length - 1)]!.class : undefined;
    const rolls = rollItem(d, rngFor(s.seed, s.mapId, nodeId, 'ware', reroll, 'day', day, i), { rarity, ...(forClass ? { forClass } : {}) });
    out.push({ itemId: d.id, rolls, price: campaignPrice({ id: d.id, rolls }), ...(sold?.[i] === day ? { sold: true } : {}) });
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
  const day = campaignDay(s);
  if (s.shop?.node === s.at && (s.shop.day ?? 0) === day) return s;
  const t = clone(s);
  // Kapanan tezgâh aynı gün geri gelir; gün değiştiyse (ya da açık tezgâhın günü eskidiyse) yeni günün stoğu kurulur
  t.shop = t.closedShop?.node === t.at && (t.closedShop.day ?? 0) === day ? t.closedShop : { node: t.at, wares: campaignStock(t), buyback: [], rerolls: 0, day };
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
    t.merchantSold = { ...(t.merchantSold ?? {}), [k]: { ...(t.merchantSold?.[k] ?? {}), [index]: campaignDay(t) } };
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
  const price = itemDef(item.id) ? campaignSellValue(item) : 0;
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
