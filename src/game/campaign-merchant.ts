import { campaignRerollCost, markMerchantIntroSeen, merchantIntroSeen, buyBackItem, buyWare, rerollCampaignShop, sellToMerchant, type CampaignState } from '../campaign';
import { UI_TEXT as T } from '../endless/ui-text';
import { sellValue } from '../progression';
import { campaignGearSource } from '../ui/gear-screen';
import { openMerchant, type MerchantSource } from '../ui/merchant-screen';

/**
 * Sefer tüccarının (Odo, merchant düğümü; Ömer 2026-10-11) TEK giriş noktası: ortak DOM tüccar ekranını (src/ui/merchant-screen.ts, ui-dev)
 * seferin saf tüccar kurallarıyla (src/campaign/merchant.ts) açar. Ekran değişirse yalnızca bu dosya uyarlanır. Kuşanma Gear kaynağıyla aynı.
 * İşlem sonuç vermezse (altın / yer yok) kurallar Error fırlatır: ekran uyarır.
 */
export function campaignMerchantSource(get: () => CampaignState, set: (s: CampaignState) => void, sub = 'Travelling merchant · Forward Camp'): MerchantSource {
  const gear = campaignGearSource(get, set);
  const apply = (fn: (s: CampaignState) => CampaignState): void => set(fn(get()));
  return {
    ...gear,
    wares: () => (get().shop?.wares ?? []).map((w, i) => ({ inst: { uid: `ware-${i}`, id: w.itemId, ...(w.rolls ? { rolls: w.rolls } : {}) }, price: w.price, sold: !!w.sold })),
    buyback: () => (get().shop?.buyback ?? []).map((e) => ({ inst: e.item, price: e.price })),
    sellPrice: (inst) => sellValue(inst),
    rerollCost: campaignRerollCost(get()),
    buy: (i) => apply((s) => buyWare(s, i)),
    sell: (uid) => apply((s) => sellToMerchant(s, uid)),
    buyBack: (i) => apply((s) => buyBackItem(s, i)),
    reroll: () => apply((s) => rerollCampaignShop(s)),
    lines: T.merchantLines,
    name: T.merchantName,
    sub,
  };
}

/** Sefer tüccarını açar (varışta karşılama). `onLeave`: oyuncu ayrılınca (sahne düğüm adımını tamamlar). */
export function openCampaignMerchant(root: HTMLElement, get: () => CampaignState, set: (s: CampaignState) => void, o: { onLeave: () => void; sub?: string; leaveLabel?: string }): () => void {
  // Ekran kendini kapatmaz (Endless'ta da çağıran kapatır): Move on önce ekranı kapatır, sonra sahne adımı tamamlar (tek sefer)
  // Karşılama ("Today's pick") her açılışta yalnızca bir kez: tezgâh zaten açıkken ikinci açma isteği (ör. aynı düğüme tekrar tıklama) yeni karşılama kurmaz
  if (openNow) return openNow;
  let close: (() => void) | null = null;
  const done = (): void => {
    openNow = null;
  };
  const leave = (): void => {
    if (!close) return;
    const c = close;
    close = null;
    done();
    c();
    o.onLeave();
  };
  // Tanışma paneli tüccar örneği başına bir kez (kayıtta kalır); sonraki girişlerde doğrudan tezgâh açılır
  const welcome = !merchantIntroSeen(get());
  if (welcome) set(markMerchantIntroSeen(get()));
  close = openMerchant(root, campaignMerchantSource(get, set, o.sub), { welcome, onLeave: leave, ...(o.leaveLabel ? { leaveLabel: o.leaveLabel } : {}) });
  openNow = () => {
    const c = close;
    close = null;
    done();
    c?.();
  };
  return openNow;
}

let openNow: (() => void) | null = null;
