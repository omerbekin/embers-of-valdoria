/**
 * Tüccar (Odo) DOM ekranı (Ömer 2026-10-18, ortak envanter v3 "Ledger"; taslak #v3&enc=merchant): solda TEZGÂH paneli (başlık "ODO THE PEDDLER" +
 * kese, konuşma satırı, sekmeler Buy & Sell | Buyback, mallar, yenileme simgesi), sağda ORTAK ENVANTER (Gear defteri; torba hücrelerinin altında
 * satış fiyatı). Kapatma: Menu'nün yerinde ortak X (src/ui/nav-close.ts). Alım: malı torbaya / kahramana / yuvaya sürükle, çift tıkla ya da
 * seç + "Buy"; satış: torba item'ini tezgâha sürükle ya da ipucundaki "Sell"; geri alım aynı ziyarette. Kurallar (fiyat, yenileme bedeli, geri
 * alım) AYNI; kurallar saf modüllerde (src/endless/run.ts, src/campaign/merchant.ts), bu ekran kaynağı (MerchantSource) çağırır.
 * Varışta karşılama (seçenek C): soldaki yarım panelde Odo tam boy + selam + günün öne çıkan malı; "Browse wares" ile panel sola kayıp çekilir.
 * Görünüm: src/ui/gear.css (gr-shop*, mw-*). Oyun içi metinler İngilizce.
 */
import { reducedMotion } from './motion-pref';
import { uiSound, worldSound } from './ui-sound';
import './gear.css';
import './gear-plates.css';
import { instanceColor, instanceRarity, instanceSubtitle, itemDef, rarityIndex, type ItemInstance, type SlotId } from '../progression';
import { dismissOnBackdrop } from './backdrop';
import { goldImg } from './ui-icons';
import { fadeToward, flyIcon, forgetGold, goldCount, purseBlush } from './reward-fx';
import { attachBandTip } from './band-tip-attach';
import { avatarUrl, itemPlate } from './character-panel';
import { itemCell } from './inventory';
import { itemTipBody, itemTipNodes, type ItemTipAction } from './item-tip';
import { isDoubleTap } from './gear-drop';
import { supplyIconSvg } from './supply-icons';
import { equippedTipNodes, heroTipExtra, openGear, phoneLayout, type GearApi, type GearExt, type GearSource } from './gear-screen';
import { affixContext } from '../progression';
import odoFull from '../../assets/sprites/merchant/idle.png?url';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const btn = (cls: string, text: string, run: () => void): HTMLButtonElement => {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', run);
  return b;
};
const goldIcon = goldImg;

export interface MerchantWare {
  inst: ItemInstance;
  price: number;
  sold: boolean;
}

export interface MerchantSupplyWare {
  id: string;
  name: string;
  text: string;
  price: number;
  sold: boolean;
  color?: string;
  rarityName?: string;
}

export type MerchantLine = 'idle' | 'poor' | 'buy' | 'sell' | 'sold' | 'buyback' | 'reroll' | 'bagFull' | 'empty';

/** Tüccar ekranının kaynağı (Endless adaptörü: src/game/endless-merchant.ts). İşlemler hata durumunda Error fırlatır. */
export interface MerchantSource extends GearSource {
  wares(): MerchantWare[];
  buyback(): Array<{ inst: ItemInstance; price: number }>;
  sellPrice(inst: ItemInstance): number;
  rerollCost: number;
  buy(index: number): void;
  /** Malzeme rafı (sefer; respec malzemeleri, Ömer 2026-11-14). Yoksa / boşsa bölüm çizilmez. */
  supplyWares?(): MerchantSupplyWare[];
  /** Malzeme rafından al (çanta yeri tutmaz); hata Error. */
  buySupply?(index: number): void;
  sell(uid: string): void;
  buyBack(index: number): void;
  reroll(): void;
  /** Tüccarın konuşma satırları. */
  lines: Record<MerchantLine, string>;
  name: string;
  sub: string;
  /** Düğümün kendi tüccarı (MapNode.trader): avatar kimliği (assets/avatars/<id>.png, varsa <id>_figure.png karşılama figürü) ve karşılama satırı. Yoksa Odo. */
  portrait?: string;
  greeting?: string;
  kicker?: string;
  /** Üstte uyarı (önizleme koşusu) ya da ''. */
  note?: string;
}

type ShopSel = { kind: 'ware'; index: number } | { kind: 'bb'; index: number } | { kind: 'sup'; index: number } | null;
type EquipTo = { heroId: string; slot?: SlotId };

/** Karşılamanın selamı (Odo). */
const GREETING = 'Ah, the heroes of the hour! Steel, leather and a lucky charm or two. Honest prices. Well, honest enough.';

/** Yenileme simgesi (dairesel ok; nav-icons.ts dilinde ince çizgi). */
const REROLL_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5"/><path d="M19.5 4v4.5H15"/></svg>';

/**
 * Tüccar ekranını açar; `welcome` = varış karşılaması (seçenek C). Gear ekranı (src/ui/gear-screen.ts) yanında tezgâh paneli olarak açılır.
 * Dönen: kapat (görünüm değişince çağıran kapatır). Kapatma (X / Esc / zemin) = `onLeave`.
 */
export function openMerchant(root: HTMLElement, src: MerchantSource, o: { welcome?: boolean; onLeave: () => void; leaveLabel?: string }): () => void {
  forgetGold('merchant-purse');
  worldSound('coin_count'); // tezgâh açılır: sikkeler meşe tezgâha sayılır
  let api: GearApi | null = null;
  let overlayEl: HTMLElement | null = null;
  let tab: 'sell' | 'bb' = 'sell';
  let sel: ShopSel = null;
  let lastScrollTab: 'sell' | 'bb' = tab;
  let line: MerchantLine = 'idle';
  /** Mala son dokunuş (çift dokunma = satın al; yeniden çizimden sonra da sürer). */
  let lastWareTap: { key: string; at: number } | null = null;
  // gr-fixhead: üst kısım sabit, yalnızca mal listesi kayar (Ömer 2026-11-01; gear.css > .gr-fixhead)
  const side = el('div', 'gr-panel gr-gear gr-ledger gr-shop gr-fixhead');
  side.dataset['drop'] = 'wares';
  const curHero = () => api?.hero();
  const instOf = (key: string): ItemInstance | undefined => {
    const i = key.indexOf(':');
    const kind = key.slice(0, i);
    const id = Number(key.slice(i + 1));
    if (kind === 'ware') return src.wares()[id]?.inst;
    if (kind === 'bb') return src.buyback()[id]?.inst;
    return undefined;
  };
  const flash = (t: string, ok = false): void => api?.flash(t, ok);
  /** Yeni alınan item (alımdan önceki torbaya göre) ve isteğe bağlı kuşanma. */
  const afterAcquire = (before: Set<string>, equip?: EquipTo): void => {
    if (!equip) return;
    const added = src.bag().find((i) => !before.has(i.uid));
    if (added) api?.equip(equip.heroId, added.uid, equip.slot);
  };
  const equipOf = (heroId: string | undefined, slot: SlotId | undefined): EquipTo | undefined => (heroId ? { heroId, ...(slot ? { slot } : {}) } : undefined);

  // ---- Alım / satım animasyonları (a13; reward-fx.ts ortak parçalar) ----
  const icoRect = (key: string): { rect: DOMRect; ico: Element | null } | null => {
    const c = overlayEl?.querySelector<HTMLElement>(`[data-tip="${key}"]`);
    if (!c) return null;
    const ico = c.querySelector('.gp-ico, .gr-item-ico, img, svg') ?? c;
    return { rect: ico.getBoundingClientRect(), ico };
  };
  const purseEl = (): HTMLElement | null => overlayEl?.querySelector<HTMLElement>('.gr-gold') ?? null;
  /** Alınan item satıcı satırından çantadaki yeni hücresine uçar (300 ms). */
  const flyToBag = (from: { rect: DOMRect; ico: Element | null } | null, before: Set<string>): void => {
    if (!from || !overlayEl) return;
    const added = src.bag().find((i) => !before.has(i.uid));
    const cell = added ? overlayEl.querySelector<HTMLElement>(`.gr-bag [data-tip="bag:${added.uid}"]`) : null;
    if (!cell) return;
    cell.style.visibility = 'hidden';
    flyIcon(overlayEl, from.rect, from.ico, cell, { ms: 300, onLand: () => (cell.style.visibility = '') });
  };
  const blush = (): void => purseBlush(purseEl());

  const doBuy = (index: number, equip?: EquipTo): void => {
    const w = src.wares()[index];
    if (!w || w.sold) return;
    if (src.gold() < w.price) {
      line = 'poor';
      uiSound('error');
      api?.rerender();
      blush();
      return;
    }
    if (src.bag().length >= src.bagSize) {
      line = 'bagFull';
      uiSound('error');
      api?.rerender();
      return;
    }
    const name = itemDef(w.inst.id)?.name ?? '';
    const before = new Set(src.bag().map((i) => i.uid));
    const from = icoRect(`ware:${index}`);
    try {
      src.buy(index);
    } catch (err) {
      flash(err instanceof Error ? err.message : String(err));
      return;
    }
    uiSound('buy');
    line = 'buy';
    if (sel?.kind === 'ware' && sel.index === index) sel = null;
    flash(`${name} added to your bag`, true);
    afterAcquire(before, equip);
    api?.rerender();
    flyToBag(from, before);
  };
  const doBuySupply = (index: number): void => {
    const w = src.supplyWares?.()[index];
    if (!w || w.sold) return;
    if (src.gold() < w.price) {
      line = 'poor';
      uiSound('error');
      api?.rerender();
      blush();
      return;
    }
    try {
      src.buySupply?.(index);
    } catch (err) {
      flash(err instanceof Error ? err.message : String(err));
      return;
    }
    uiSound('buy');
    line = 'buy';
    if (sel?.kind === 'sup' && sel.index === index) sel = null;
    flash(`${w.name} added to your supplies`, true);
    api?.rerender();
  };
  /** Malzeme plakası: item plakasıyla aynı kalıp (gr-plate, nadirlik rengi --rc, köşe elmasları), ikon + "Supply" etiketi + ad + kısa metin, sağda fiyat. */
  const supplyPlateFor = (w: MerchantSupplyWare, i: number): HTMLButtonElement => {
    const b = el('button', 'gr-slot gr-plate gr-supply-plate');
    b.type = 'button';
    if (w.color) b.style.setProperty('--rc', w.color);
    const ico = el('span', 'gp-ico');
    ico.innerHTML = supplyIconSvg(w.id);
    const tx = el('div', 'gr-slot-text gp-tx');
    tx.append(el('div', 'gp-lbl', w.rarityName ? `Supply · ${w.rarityName}` : 'Supply'), el('div', 'gr-slot-name', w.name), el('div', 'gp-l2', w.text));
    const poor = !w.sold && src.gold() < w.price;
    const tag = el('span', `gp-price${poor ? ' bad' : ''}`);
    if (w.sold) tag.textContent = 'SOLD';
    else {
      const gi = goldIcon('gp-price-ico');
      if (gi) tag.append(gi);
      tag.append(String(w.price));
    }
    b.append(ico, tx, tag);
    if (w.sold) b.classList.add('sold');
    if (sel?.kind === 'sup' && sel.index === i) b.classList.add('on');
    attachBandTip(b, () => ({ kind: w.rarityName ? `Supply · ${w.rarityName}` : 'Supply', title: w.name, ...(w.color ? { accent: w.color } : {}), lines: [{ text: w.text }, { text: 'Use it from the Supplies row in Gear.' }] }));
    b.addEventListener('click', () => {
      const now = performance.now();
      if (isDoubleTap(lastWareTap, `sup:${i}`, now) && !w.sold) {
        lastWareTap = null;
        doBuySupply(i);
        return;
      }
      lastWareTap = { key: `sup:${i}`, at: now };
      sel = { kind: 'sup', index: i };
      line = poor ? 'poor' : 'idle';
      renderSide();
    });
    return b;
  };
  const doSell = (uid: string): void => {
    const inst = src.bag().find((x) => x.uid === uid);
    if (!inst) return;
    const price = src.sellPrice(inst);
    const name = itemDef(inst.id)?.name ?? '';
    const from = icoRect(`bag:${uid}`);
    try {
      src.sell(uid);
    } catch (err) {
      flash(err instanceof Error ? err.message : String(err));
      return;
    }
    uiSound('sell');
    line = 'sold';
    api?.clearSel();
    flash(`Sold ${name} for ${price} gold`, true);
    api?.rerender();
    if (overlayEl && from) fadeToward(overlayEl, from.rect, from.ico, side, purseEl());
  };
  const doBuyBack = (index: number, equip?: EquipTo): void => {
    const e = src.buyback()[index];
    if (!e) return;
    if (src.gold() < e.price) {
      line = 'poor';
      uiSound('error');
      api?.rerender();
      blush();
      return;
    }
    sel = null;
    const before = new Set(src.bag().map((i) => i.uid));
    const from = icoRect(`bb:${index}`);
    try {
      src.buyBack(index);
    } catch (err) {
      flash(err instanceof Error ? err.message : String(err));
      return;
    }
    uiSound('buy');
    line = 'buyback';
    afterAcquire(before, equip);
    api?.rerender();
    flyToBag(from, before);
  };
  const doReroll = (): void => {
    try {
      src.reroll();
    } catch (err) {
      flash(err instanceof Error ? err.message : String(err));
      return;
    }
    uiSound('confirm');
    line = 'reroll';
    sel = null;
    api?.rerender();
  };

  /** Mal / geri alım plakası: Gear > Hero item plakası (character-panel.ts itemPlate) + sağ kenarda yalnızca fiyat (altın ikonu + sayı; yetmeyen kırmızı). */
  const plateFor = (inst: ItemInstance, price: number | 'SOLD', poor: boolean, tip: string, drag: boolean, selected: boolean): HTMLButtonElement => {
    const tag = el('span', `gp-price${poor ? ' bad' : ''}`);
    if (price === 'SOLD') tag.textContent = 'SOLD';
    else {
      const gi = goldIcon('gp-price-ico');
      if (gi) tag.append(gi);
      tag.append(String(price));
    }
    const b = itemPlate(inst, curHero()?.class, tag, true);
    b.dataset['tip'] = tip;
    if (drag) b.dataset['drag'] = tip;
    if (selected) b.classList.add('on');
    return b;
  };

  /** Çerçevesiz altın sayısı: çanta altındaki Supplies / Purse şeridinde (Ömer 2026-11-11 Form 6; başlıkta değil). */
  function goldChip(): HTMLElement {
    const purse = el('div', 'gr-gold', String(src.gold()));
    const gi = goldIcon('gr-ui-ico');
    if (gi) {
      purse.classList.add('gr-has-ico');
      purse.prepend(gi);
    }
    attachBandTip(purse, { title: 'Gold' });
    goldCount(purse, src.gold(), 'merchant-purse'); // sayaç dönüşü (reward-fx.ts)
    return purse;
  }

  // --- tezgâh paneli
  function renderSide(): void {
    const phone = phoneLayout();
    const head = el('div', 'gr-head gr-lhead');
    head.append(el('div', 'gr-title', src.name));
    const kids: HTMLElement[] = [head];
    if (!phone) kids.push(el('div', 'gr-shop-sub', src.sub));
    // konuşma satırı (kafa portresi + balon)
    const talk = el('div', 'gr-odo');
    const face = el('div', 'gr-face');
    const url = avatarUrl(src.portrait ?? 'merchant');
    if (url) face.style.backgroundImage = `url("${url}")`;
    talk.append(face, el('div', 'gr-odo-line', src.lines[line]));
    kids.push(talk);
    // sekmeler: Buy & Sell | Buyback
    const tabs = el('div', 'gr-tabs gr-shoptabs');
    tabs.setAttribute('role', 'tablist');
    const bbCount = src.buyback().length;
    for (const [k, label] of [['sell', 'Buy & Sell'], ['bb', 'Buyback']] as const) {
      const b = btn(`gr-tab${tab === k ? ' on' : ''}`, label, () => {
        if (tab === k) return;
        tab = k;
        sel = null;
        uiSound('tab');
        renderSide();
      });
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(tab === k));
      if (k === 'bb' && bbCount) b.append(el('span', 'gr-pt sk', String(bbCount)));
      tabs.append(b);
    }
    kids.push(tabs);
    const pane = el('div', 'gr-shoppane gr-shopfix');
    /** Yalnızca bu kutu kayar (tekerlek / dokunma / ince çubuk); başlık satırı ve üstündeki her şey sabit. */
    const scroller = el('div', 'gr-shopscroll');
    if (tab === 'sell') {
      // mallar (satılmış soluk, yetmeyen altın kırmızı fiyat) + yenileme (simge + küçük fiyat)
      const sec = el('div', 'gr-sec gr-wares-head', 'Wares');
      const reroll = el('button', 'el-btn sm gr-reroll');
      reroll.type = 'button';
      reroll.dataset['hint'] = 'Reroll wares';
      reroll.setAttribute('aria-label', 'Reroll wares');
      reroll.innerHTML = REROLL_SVG;
      const cost = el('span', 'gr-cost', String(src.rerollCost));
      const cgi = goldIcon();
      if (cgi) cost.prepend(cgi);
      reroll.append(cost);
      reroll.disabled = src.gold() < src.rerollCost;
      reroll.addEventListener('click', doReroll);
      sec.append(reroll);
      const wares = el('div', 'gr-wares gr-wplates');
      src.wares().forEach((w, i) => {
        const poor = !w.sold && src.gold() < w.price;
        const b = plateFor(w.inst, w.sold ? 'SOLD' : w.price, poor, `ware:${i}`, !w.sold, sel?.kind === 'ware' && sel.index === i);
        if (w.sold) b.classList.add('sold');
        b.addEventListener('click', () => {
          const now = performance.now();
          if (isDoubleTap(lastWareTap, `ware:${i}`, now) && !w.sold) {
            lastWareTap = null;
            doBuy(i);
            return;
          }
          lastWareTap = { key: `ware:${i}`, at: now };
          sel = { kind: 'ware', index: i }; // tıklama her zaman seçer (playtest U9)
          line = poor ? 'poor' : 'idle';
          renderSide();
        });
        wares.append(b);
      });
      if (!src.wares().length) wares.append(el('div', 'gr-card-empty', src.lines.empty));
      // malzeme rafı (respec malzemeleri; varsa): mallarla aynı plaka, aynı seçim / çift dokunuş
      const sups = src.supplyWares?.() ?? [];
      if (sups.length) {
        wares.append(el('div', 'gr-sec gr-wares-head gr-supply-head', 'Supplies'));
        sups.forEach((w, i) => wares.append(supplyPlateFor(w, i)));
      }
      // satış kutusu: torba item'ini buraya sürükle (ya da seç + dokun)
      const box = el('div', 'gr-sellbox');
      box.dataset['drop'] = 'wares';
      const bi = goldIcon('gr-ui-ico');
      if (bi) box.append(bi);
      const txt = el('div', 'gr-sellbox-t', 'Drag an item here from the bag to sell it for half its worth.');
      txt.append(el('i', '', 'Or select the item, then tap here.'));
      box.append(txt);
      box.addEventListener('click', () => {
        const uid = api?.selected();
        if (uid) doSell(uid);
      });
      scroller.append(wares, box);
      pane.append(sec, scroller);
    } else {
      // geri alım (bu ziyaret)
      const row = el('div', 'gr-bb-row gr-wplates');
      const list = src.buyback();
      list.forEach((e, i) => {
        const b = plateFor(e.inst, e.price, src.gold() < e.price, `bb:${i}`, true, sel?.kind === 'bb' && sel.index === i);
        b.addEventListener('click', () => {
          sel = { kind: 'bb', index: i };
          line = 'buyback';
          renderSide();
        });
        row.append(b);
      });
      if (!list.length) row.append(el('div', 'gr-card-empty', 'Sold something by mistake? It waits here until you leave.'));
      scroller.append(row);
      if (list.length) scroller.append(el('div', 'gr-shop-sub', 'Sold this visit. Buy back for the price you sold at, until you leave.'));
      pane.append(scroller);
    }
    kids.push(pane);
    // seçimin eylemi (birincil): tıklayarak seçilen mal / geri alım
    const strip = el('div', 'gr-shopact');
    if (sel?.kind === 'ware') {
      const w = src.wares()[sel.index];
      if (w && !w.sold) {
        const short = w.price - src.gold();
        const full = src.bag().length >= src.bagSize;
        const index = sel.index;
        const b = btn('el-btn sm primary', short > 0 ? `Need ${short} more` : full ? 'Bag full' : `Buy · ${w.price}`, () => doBuy(index));
        b.disabled = short > 0 || full;
        strip.append(b);
      }
    } else if (sel?.kind === 'sup') {
      const w = src.supplyWares?.()[sel.index];
      const index = sel.index;
      if (w && !w.sold) {
        const short = w.price - src.gold();
        const b = btn('gr-btn primary', short > 0 ? `Need ${short} more` : `Buy · ${w.price}`, () => doBuySupply(index));
        b.disabled = short > 0;
        strip.append(b);
      }
    } else if (sel?.kind === 'bb') {
      const e = src.buyback()[sel.index];
      const index = sel.index;
      if (e) {
        const b = btn('el-btn sm primary', src.gold() < e.price ? `Need ${e.price - src.gold()} more` : `Buy back · ${e.price}`, () => doBuyBack(index));
        b.disabled = src.gold() < e.price;
        strip.append(b);
      }
    }
    if (strip.childElementCount) kids.push(strip);
    if (src.note) kids.push(el('div', 'gr-shop-sub', src.note));
    // yeniden çizim (seçim, satın alma, yenileme) listeyi başa sarmasın: aynı sekmede kaydırma konumu korunur
    const prev = side.querySelector<HTMLElement>('.gr-shopscroll');
    const keepTop = prev && lastScrollTab === tab ? prev.scrollTop : 0;
    side.replaceChildren(...kids);
    lastScrollTab = tab;
    if (keepTop) scroller.scrollTop = keepTop;
  }

  // --- karşılama (seçenek C): yarım panel kayıp çekilir, arkada tüccar hazır
  let welcomeEl: HTMLElement | null = null;
  const dismissWelcome = (): void => {
    const w = welcomeEl;
    if (!w || !overlayEl) return;
    welcomeEl = null;
    uiSound('confirm');
    overlayEl.classList.remove('mw-on');
    w.classList.add('gone');
    window.setTimeout(() => w.remove(), reducedMotion() ? 0 : 560);
  };
  const showWelcome = (overlay: HTMLElement): void => {
    const wares = src.wares().filter((w) => !w.sold);
    const best = [...wares].sort((a, b) => rarityIndex(instanceRarity(b.inst)) - rarityIndex(instanceRarity(a.inst)) || b.price - a.price)[0];
    const rare = best && rarityIndex(instanceRarity(best.inst)) >= rarityIndex('epic');
    const w = el('div', 'mw-welcome');
    const half = el('div', 'mw-half');
    const fig = el('img', 'mw-odo');
    fig.src = (src.portrait && avatarUrl(`${src.portrait}_figure`)) || (src.portrait && avatarUrl(src.portrait)) || odoFull;
    fig.alt = '';
    fig.draggable = false;
    const card = el('div', 'mw-wcard');
    card.append(el('div', 'mw-kick', src.kicker ?? 'A travelling merchant'), el('div', 'mw-name', src.name), el('div', 'mw-greet', `"${src.greeting ?? GREETING}"`));
    if (best) {
      card.append(el('div', 'mw-notice', rare ? 'Rare ware in stock today' : "Today's pick"));
      const hl = el('div', 'mw-hl');
      const i = src.wares().indexOf(best);
      hl.append(itemCell(best.inst, { tip: `ware:${i}` }));
      const t = el('div', 'mw-hl-t');
      const d = itemDef(best.inst.id);
      const n = el('div', 'mw-hl-name', d?.name ?? '');
      n.style.color = instanceColor(best.inst);
      const p = el('div', 'mw-hl-price', `${best.price}`);
      const gi = goldIcon();
      if (gi) p.prepend(gi);
      // tüm özellikler: yüzen ipucunun aynı satırları (nadirlik / yuva / seviye, C / B / A affix'ler + aralık, Legendary etkisi)
      const sub = el('div', 'it-sub', instanceSubtitle(best.inst));
      t.append(n, sub, p);
      hl.append(t);
      const stats = el('div', 'mw-stats');
      stats.append(...itemTipBody(best.inst));
      card.append(hl, stats);
    }
    card.append(btn('el-btn primary mw-go', 'Browse wares', dismissWelcome));
    half.append(fig, card);
    w.append(half);
    overlay.append(w);
    overlay.classList.add('mw-on');
    welcomeEl = w;
    // Kartın dışına (Odo, arkadaki dükkân, boş alan) dokununca karşılama kapanır = "Browse wares" (Ömer 2026-10-14, zemin kuralı)
    const off = dismissOnBackdrop(overlay, card, () => {
      off();
      dismissWelcome();
    });
  };

  const ext: GearExt = {
    side,
    purse: () => [goldChip()],
    noTrash: true,
    attach: (overlay, a) => {
      overlayEl = overlay;
      api = a;
      overlay.classList.add('gr-shop-overlay');
      overlay.setAttribute('aria-label', src.name);
      if (o.welcome) showWelcome(overlay);
    },
    render: renderSide,
    price: (inst) => src.sellPrice(inst),
    onKey: (e) => {
      if (!welcomeEl) return false;
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        dismissWelcome();
      }
      return true;
    },
    sourceOf: (v, t) => {
      if (v.startsWith('ware:')) return { kind: 'ware', index: Number(v.slice(5)), itemId: t.dataset['item'] ?? '' };
      if (v.startsWith('bb:')) return { kind: 'bb', index: Number(v.slice(3)), itemId: t.dataset['item'] ?? '' };
      return null;
    },
    targetOf: (v) => (v === 'wares' ? { kind: 'wares' } : null),
    onDrop: (s, _tg, act) => {
      if (act?.kind === 'buy') doBuy(act.index, equipOf(act.heroId, act.slot));
      else if (act?.kind === 'buyback') doBuyBack(act.index, equipOf(act.heroId, act.slot));
      else if (act?.kind === 'sell') doSell(act.uid);
      else if (s.kind === 'ware' || s.kind === 'bb') {
        if (act?.kind === 'none' && act.reason) flash(act.reason === 'Cannot use' ? 'That hero cannot use this item.' : act.reason);
      } else return false;
      return true;
    },
    tipNodes: (key) => {
      if (!key.startsWith('ware:') && !key.startsWith('bb:')) return null;
      const inst = instOf(key);
      if (!inst) return [];
      const hero = curHero();
      const state = hero ? { ...(affixContext(hero, inst) ?? {}), level: hero.level } : undefined;
      return [...itemTipNodes(inst, hero?.class, heroTipExtra(src.heroes(), inst, true), state), ...equippedTipNodes(src.heroes(), inst, hero)];
    },
    tipActions: (key) => {
      const i = key.indexOf(':');
      const kind = key.slice(0, i);
      const index = Number(key.slice(i + 1));
      const hero = curHero();
      if (kind === 'ware') {
        const w = src.wares()[index];
        if (!w || w.sold) return [];
        const short = w.price - src.gold();
        const full = src.bag().length >= src.bagSize;
        const acts: ItemTipAction[] = [{ label: short > 0 ? `Need ${short} more` : full ? 'Bag full' : `Buy · ${w.price}`, disabled: short > 0 || full, primary: !hero, run: () => doBuy(index) }];
        if (hero) acts.push({ label: 'Buy & equip', disabled: short > 0 || full, run: () => doBuy(index, { heroId: hero.id }) });
        return acts;
      }
      if (kind === 'bb') {
        const e = src.buyback()[index];
        if (!e) return [];
        const short = e.price - src.gold();
        return [{ label: short > 0 ? `Need ${short} more` : `Buy back · ${e.price}`, disabled: short > 0, run: () => doBuyBack(index) }];
      }
      return null;
    },
    bagActions: (uid) => {
      const inst = src.bag().find((x) => x.uid === uid);
      return inst ? [{ label: `Sell · ${src.sellPrice(inst)}`, primary: false, run: () => doSell(uid) }] : [];
    },
    onDoubleTap: (key) => {
      if (key.startsWith('ware:')) return (doBuy(Number(key.slice(5))), true);
      if (key.startsWith('bb:')) return (doBuyBack(Number(key.slice(3))), true);
      // torba item'ine çift tık / çift dokunuş = SAT (Ömer 2026-10-18); kuşanmak için sürükle ya da ipucu
      if (key.startsWith('bag:')) return (doSell(key.slice(4)), true);
      return undefined;
    },
  };
  return openGear(root, src, { ext, onClose: () => o.onLeave() });
}
