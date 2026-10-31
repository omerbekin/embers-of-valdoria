// Sefer tüccarı (Odo; Ömer 2026-10-11, Forward Camp düğümü): Endless tüccarıyla aynı kurallar (alım / satım / geri alım / yenileme), saf.
// Raflar kayıtta (Ömer 2026-10-31, CampaignState.merchantStock; tasarım items.md 2.2): ilk varışta kasaba level'ında kurulur, geçen her gün merchant.restockPerDay raf
// (en çok raf sayısı) aktif takımın ortalama level'ında yenilenir, parayla Reroll hepsini takım level'ında yeniler. Hiçbir mal dükkân tavanını (power.ts > shopCeiling) aşmaz.
// Nadirlik: tek tablo (progression > rollDropRarity; düğümün item seviyesiyle). Mal level'ı örneğin zarına yazılır (rollItem > ilvl), taban yalnız türü belirler.
// Fiyat = nadirlik tabanı x (1 + 0,1 x item seviyesi), satış = bu fiyatın yarısı (Ömer 2026-10-26; campaignPrice / campaignSellValue). Sayılar data/campaign/campaign.json > merchant.
// Arayüz: src/game/campaign-merchant.ts (TEK giriş noktası; ortak DOM tüccar ekranı src/ui/merchant-screen.ts).
import { BAG_SIZE, ITEMS, canEquip, instanceIlvl, instanceRarity, itemDef, rollDropRarity, rollItem, type ItemInstance, type RarityId } from '../progression';
import { CONFIG } from './data';
import { nodeIlvl, shopCeiling, townLevel } from './power';
import { rngFor } from './seed';
import { activeHeroes, clone, closeShop, complete, expectStep, mapOf, nextStep, shopKey } from './state';
import { node } from './graph';
import { shopSlotWeight } from './reach';
import { marketPriceMult, marketRerollMult, withRarityFloor } from './hollow-crown';
import type { CampaignShop, CampaignState, MerchantStall, ShopWare } from './types';

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

/** Aktif takımın (yoksa kadronun) ortalama level'ı, yuvarlanmamış: yenileme bedeli ve yeni malların level'ı bunu okur. */
export function campaignTeamLevel(s: CampaignState): number {
  const team = activeHeroes(s).length ? activeHeroes(s) : s.roster;
  return team.length ? team.reduce((a, h) => a + (h.level ?? 1), 0) / team.length : 1;
}

const shelfCount = (s: CampaignState, nodeId: string): number => node(mapOf(s), nodeId).merchantSize ?? CONFIG.merchant.size; // kasabalar (T1): Ashford küçük, Valdren Keep büyük stok

/** Malın level'ı: istenen level (tam sayıya, yarım yukarı), en az 1, dükkân tavanını aşmaz. */
const wareLevel = (s: CampaignState, nodeId: string, want: number): number => Math.max(1, Math.min(shopCeiling(s.mapId, nodeId), Math.round(want)));

/**
 * Rafları doldurur (seed'li: aynı sefer + düğüm + yenileme sayısı + gün + raf = aynı zarlar). Malın level'ı `level` (örneğin zarında; fiyat da ondan).
 * Taban havuzu: Legendary değil, takımdan birinin takabildiği, katalog seviyesi tavanı aşmayan; zaten rafta olanlar çıkmaz. Havuz biterse (küçük takım + düşük tavan)
 * katalog seviyesi süzgeci kalkar: gücü belirleyen örneğin level'ı olduğu için tavan yine aşılmaz, raf boş kalmaz.
 */
function fillShelves(s: CampaignState, nodeId: string, o: { level: number; reroll: number; slots: number[]; taken?: string[] }): Map<number, ShopWare> {
  const ilvl = Math.max(1, nodeIlvl(s.mapId, nodeId)); // nadirlik zarı düğümün item seviyesinde kalır
  const ceiling = shopCeiling(s.mapId, nodeId);
  const team = activeHeroes(s).length ? activeHeroes(s) : s.roster;
  const all = ITEMS.items.filter((d) => d.rarity !== 'legendary' && (!team.length || team.some((h) => canEquip(h.class, d))));
  const bases = all.filter((d) => d.ilvl <= ceiling);
  const out = new Map<number, ShopWare>();
  const used = new Set<string>(o.taken ?? []);
  const map = mapOf(s);
  const nd = node(map, nodeId);
  // Harita 3 The Deep Market (open-questions 454 b): yalnız marketRules'lı düğüm; yoksa çarpan 1, taban yok (eski stok birebir)
  const priceMult = marketPriceMult(nd, s);
  const floor = nd.marketRules?.rarityFloor;
  // M-L Faction: seçilen tarafa göre yuva ağırlıkları (Order zırh / relic, Guild silah / takı; drowned-reach.json > reach.faction). Taraf yoksa eski çekiliş birebir
  const weighted = all.some((d) => shopSlotWeight(map, s, d.slot) !== 1);
  const day = campaignDay(s);
  for (const i of o.slots) {
    const rng = rngFor(s.seed, s.mapId, nodeId, 'shop', o.reroll, 'day', day, 'slot', i);
    const rarity = withRarityFloor(rollDropRarity(rng, ilvl, 'normal'), floor);
    const unused = bases.filter((d) => !used.has(d.id));
    const pool = unused.length ? unused : all.filter((d) => !used.has(d.id));
    if (!pool.length) break;
    const d = weighted ? pickWeighted(pool, (x) => shopSlotWeight(map, s, x.slot), rng) : pool[rng.int(0, pool.length - 1)]!;
    used.add(d.id);
    const fits = team.filter((h) => canEquip(h.class, d));
    const forClass = fits.length ? fits[rng.int(0, fits.length - 1)]!.class : undefined;
    const rolls = rollItem(d, rngFor(s.seed, s.mapId, nodeId, 'ware', o.reroll, 'day', day, i), { rarity, ilvl: o.level, ...(forClass ? { forClass } : {}) });
    const price = campaignPrice({ id: d.id, rolls });
    out.set(i, { itemId: d.id, rolls, price: priceMult === 1 ? price : Math.max(1, Math.round(price * priceMult)), since: day });
  }
  return out;
}

/**
 * Bütün raflar sıfırdan: `reroll` 0 = ilk varışın stoğu (kasaba level'ında), `reroll` > 0 = parayla yenileme (aktif takımın ortalama level'ında). İkisi de tavana uyar.
 * Saf: kayda bakmaz (kayıttaki raflar openCampaignShop'ta).
 */
export function campaignStock(s: CampaignState, nodeId: string = s.at, reroll = 0): ShopWare[] {
  const want = reroll ? campaignTeamLevel(s) : townLevel(s.mapId, nodeId);
  const slots = Array.from({ length: shelfCount(s, nodeId) }, (_, i) => i);
  return [...fillShelves(s, nodeId, { level: wareLevel(s, nodeId, want), reroll, slots }).values()];
}

/**
 * Gün geçmiş tezgâhın yeni rafları (Ömer 2026-10-31): geçen gün x merchant.restockPerDay raf (en çok raf sayısı) takım level'ında yenilenir. Sıra: önce alınmış raflar, sonra
 * en eski mallar, eşitlikte seed'li zar. Tavanı aşan mal (eski kayıt) ya da eksik raf bu sayıya girmeden yenilenir: gün döndükten sonra tavan üstü mal satılmaz.
 */
function restockWares(s: CampaignState, nodeId: string, stall: MerchantStall): ShopWare[] {
  const size = shelfCount(s, nodeId);
  const ceiling = shopCeiling(s.mapId, nodeId);
  const old = stall.wares.slice(0, size);
  const slots = Array.from({ length: size }, (_, i) => i);
  const forced = slots.filter((i) => !old[i] || instanceIlvl({ id: old[i]!.itemId, ...(old[i]!.rolls ? { rolls: old[i]!.rolls } : {}) }) > ceiling);
  const rng = rngFor(s.seed, s.mapId, nodeId, 'restock', 'day', campaignDay(s));
  const rest = slots
    .filter((i) => !forced.includes(i))
    .map((i) => ({ i, w: old[i]!, tie: rng.next() }))
    .sort((a, b) => Number(!!b.w.sold) - Number(!!a.w.sold) || (a.w.since ?? stall.day) - (b.w.since ?? stall.day) || a.tie - b.tie);
  const count = Math.min(size, (campaignDay(s) - stall.day) * (CONFIG.merchant.restockPerDay ?? 2));
  const chosen = new Set([...forced, ...rest.slice(0, count).map((x) => x.i)]);
  const fresh = fillShelves(s, nodeId, {
    level: wareLevel(s, nodeId, campaignTeamLevel(s)),
    reroll: 0,
    slots: [...chosen].sort((a, b) => a - b),
    taken: old.filter((_, i) => !chosen.has(i)).map((w) => w.itemId),
  });
  return slots.flatMap((i) => fresh.get(i) ?? (old[i] ? [old[i]!] : []));
}

/** Ağırlıklı seed'li seçim (tek zar). */
function pickWeighted<T>(pool: T[], weight: (x: T) => number, rng: { next(): number }): T {
  const total = pool.reduce((n, x) => n + weight(x), 0);
  let r = rng.next() * total;
  for (const x of pool) {
    r -= weight(x);
    if (r < 0) return x;
  }
  return pool[pool.length - 1]!;
}

/** Burada tüccar açılabilir mi: tüccar adımı ya da tüccarlı kasabanın kasaba adımı (T1; kasaba Leave'i tezgâhı kapatır). */
export function merchantHere(s: CampaignState): boolean {
  const step = nextStep(s);
  return step.kind === 'merchant' || (step.kind === 'town' && !!node(mapOf(s), s.at).merchant);
}

/**
 * Tüccara varış: tezgâh açılır (tüccar adımında ya da tüccarlı kasabada; bugünün tezgâhı zaten açıksa durum aynen). Hiç gelinmediyse ilk stok, kayıt aynı günse aynı raflar
 * (alınanlar "sold", yenileme sayısı aynı), gün geçtiyse raflar kısmen yenilenir. Geri alım listesi yeni ziyarette boş.
 */
export function openCampaignShop(s: CampaignState): CampaignState {
  if (!merchantHere(s)) throw new Error('The merchant is not here');
  const day = campaignDay(s);
  if (s.shop?.node === s.at && (s.shop.day ?? 0) === day) return s;
  const t = clone(s);
  if (t.shop && t.shop.node !== t.at) closeShop(t); // başka düğümde açık kalmış tezgâh kaydına döner
  const key = shopKey(t.mapId, t.at);
  const open = t.shop ? { wares: t.shop.wares, rerolls: t.shop.rerolls, day: t.shop.day ?? 0 } : undefined;
  const stall = open ?? t.merchantStock?.[key];
  if (!stall) t.shop = { node: t.at, wares: campaignStock(t), buyback: [], rerolls: 0, day };
  else if (stall.day >= day) t.shop = { node: t.at, wares: stall.wares, buyback: [], rerolls: stall.rerolls, day };
  else t.shop = { node: t.at, wares: restockWares(t, t.at, stall), buyback: [], rerolls: 0, day };
  if (t.merchantStock?.[key]) {
    delete t.merchantStock[key];
    if (!Object.keys(t.merchantStock).length) delete t.merchantStock;
  }
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
  const lvl = campaignTeamLevel(s);
  // Harita 3 The Deep Market: yalnız marketRules'lı düğümde çarpan (yoksa 1, eski bedel birebir)
  const mult = s.at ? marketRerollMult(node(mapOf(s), s.at), s) : 1;
  return Math.round((CONFIG.merchant.rerollCost + (CONFIG.merchant.rerollPerLevel ?? 0) * lvl) * mult);
}

/** Malları yenile (campaignRerollCost altın; her yenileme farklı stok): bütün raflar, alınmışlar dahil, takım level'ında yeni mal. */
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
