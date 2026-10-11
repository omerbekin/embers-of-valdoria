import { ENDLESS, UI_TEXT as T, buyItem, buybackItem, rerollShop, sellItem, type EndlessRun } from '../endless';
import { sellValue } from '../progression';
import { endlessGearSource } from './endless-gear';
import { openMerchant, type MerchantSource } from '../ui/merchant-screen';

/**
 * Endless tüccarının kaynağı (adaptör): ortak DOM tüccar ekranı (src/ui/merchant-screen.ts) Endless koşusunun saf fonksiyonlarını çağırır
 * (alım / satım / geri alım / yenileme: src/endless/run.ts, merchant.ts). İşlem sonuç vermezse (altın / yer yok) Error fırlatır: ekran uyarır.
 * Kuşanma (Character sayfası açıkken) Gear kaynağıyla aynı (endlessGearSource).
 */
export function endlessMerchantSource(get: () => EndlessRun, set: (r: EndlessRun) => void): MerchantSource {
  const gear = endlessGearSource(get, set);
  const apply = (fn: (r: EndlessRun) => EndlessRun, err: string): void => {
    const r = get();
    const next = fn(r);
    if (next === r) throw new Error(err);
    set(next);
  };
  return {
    ...gear,
    wares: () => (get().shop ?? []).map((e, i) => ({ inst: { uid: `ware-${i}`, id: e.itemId, ...(e.rolls ? { rolls: e.rolls } : {}) }, price: e.price, sold: !!e.sold })),
    buyback: () => (get().buyback ?? []).map((e) => ({ inst: e.item, price: e.price })),
    sellPrice: (inst) => sellValue(inst),
    rerollCost: ENDLESS.shop.rerollCost,
    buy: (i) => apply((r) => buyItem(r, i), T.merchantLines.poor),
    sell: (uid) => apply((r) => sellItem(r, uid), 'Cannot sell that.'),
    buyBack: (i) => apply((r) => buybackItem(r, i), T.merchantLines.poor),
    reroll: () => apply((r) => rerollShop(r), T.merchantLines.poor),
    lines: T.merchantLines,
    name: T.merchantName,
    sub: T.merchantSub,
    ...(get().preview ? { note: T.previewRun } : {}),
  };
}

/** Tüccar ekranını açar (DOM katmanı). `welcome`: varış karşılaması. */
export function openEndlessMerchant(root: HTMLElement, get: () => EndlessRun, set: (r: EndlessRun) => void, o: { welcome: boolean; onLeave: () => void }): () => void {
  return openMerchant(root, endlessMerchantSource(get, set), o);
}
