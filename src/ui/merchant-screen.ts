/**
 * Endless tüccarı (Odo) DOM ekranı (Ömer 2026-10-11, g1): solda TEZGÂH (konuşma satırı, 3x3 mal, yenileme, geri alım), sağda ORTAK
 * INVENTORY (Gear'daki torbanın aynısı; satış fiyatı etiketli). Karşılaştırma için "Character" (C) Character sayfasını tezgâhın üstünde açar
 * (kahraman satırları üstüne gelinen mala / item'e göre). Alım: malı torbaya sürükle, çift tıkla ya da seç + "Buy"; satış: torba item'ini
 * tezgâha sürükle ya da seç + "Sell"; geri alım aynı ziyarette. Varışta karşılama (seçenek C): soldaki yarım panelde Odo tam boy + selam +
 * günün öne çıkan malı; "Browse wares" ile panel sola kayıp çekilir. Kurallar saf modüllerde (src/endless/run.ts: buyItem / sellItem ...),
 * bu ekran kaynağı (MerchantSource) çağırır. Görünüm: src/ui/gear.css (gr-shop*, mw-*). Oyun içi metinler İngilizce.
 */
import { closeDom } from './motion';
import { reducedMotion } from './motion-pref';
import { uiSound } from './ui-sound';
import './gear.css';
import { instanceColor, instanceRarity, itemDef, rarityIndex, type ItemInstance, type SlotId } from '../progression';
import { lockInput, unlockInput } from './input-lock';
import { iconUrl } from './dom-icons';
import { hasUiImage, uiIconName } from './ui-icons';
import type { Stats } from '../engine';
import { avatarUrl, className, renderCharacter } from './character-panel';
import { itemCell, renderInventory } from './inventory';
import { itemTipNodes } from './item-tip';
import { attachItemInteractions } from './item-drag';
import { isDoubleTap } from './gear-drop';
import { confirmIn, heroRail, heroTipExtra, phoneLayout, viewTabs, type GearSource } from './gear-screen';
import { primaryCheck, PRIMARY_BONUS_NAME, canEquip, ITEMS } from '../progression';
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
/** Boyalı altın ikonu (yoksa ikonsuz). */
const goldIcon = (cls = 'gr-price-ico'): HTMLImageElement | null => {
  if (!hasUiImage('gold')) return null;
  const i = el('img', cls);
  i.src = iconUrl(uiIconName('gold'));
  i.alt = '';
  i.draggable = false;
  return i;
};

export interface MerchantWare {
  inst: ItemInstance;
  price: number;
  sold: boolean;
}

export type MerchantLine = 'idle' | 'poor' | 'buy' | 'sell' | 'sold' | 'buyback' | 'reroll' | 'bagFull' | 'empty';

/** Tüccar ekranının kaynağı (Endless adaptörü: src/game/endless-merchant.ts). İşlemler hata durumunda Error fırlatır. */
export interface MerchantSource extends GearSource {
  wares(): MerchantWare[];
  buyback(): Array<{ inst: ItemInstance; price: number }>;
  sellPrice(inst: ItemInstance): number;
  rerollCost: number;
  buy(index: number): void;
  sell(uid: string): void;
  buyBack(index: number): void;
  reroll(): void;
  /** Tüccarın konuşma satırları. */
  lines: Record<MerchantLine, string>;
  name: string;
  sub: string;
  /** Üstte uyarı (önizleme koşusu) ya da ''. */
  note?: string;
}

type ShopSel = { kind: 'ware'; index: number } | { kind: 'bag'; uid: string } | { kind: 'bb'; index: number } | null;

/** Karşılamanın selamı (Odo). */
const GREETING = 'Ah, the heroes of the hour! Steel, leather and a lucky charm or two. Honest prices. Well, honest enough.';

/** Tüccar ekranını açar; `welcome` = varış karşılaması (seçenek C). Dönen: kapat (görünüm değişince çağıran kapatır). */
export function openMerchant(root: HTMLElement, src: MerchantSource, o: { welcome?: boolean; onLeave: () => void }): () => void {
  const overlay = el('div', 'gr-overlay gr-shop-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', src.name);
  const panel = el('div', 'gr-panel gr-gear gr-shop');
  overlay.append(panel);
  root.append(overlay);
  lockInput('merchant');
  let heroId = src.heroes()[0]?.id ?? '';
  let sel: ShopSel = null;
  let hoverKey = '';
  let dragKey = '';
  let charOpen = false;
  let view: 'char' | 'inv' = 'inv';
  let line: MerchantLine = 'idle';
  let flashText = '';
  let curStats: Stats | null = null;
  let afterStats: Stats | null = null;
  let closeAsk: (() => void) | null = null;
  /** Mala son dokunuş (çift dokunma = satın al; yeniden çizimden sonra da sürer). */
  let lastWareTap: { key: string; at: number } | null = null;
  const heroOf = (id: string) => src.heroes().find((h) => h.id === id);
  const curHero = () => heroOf(heroId) ?? src.heroes()[0];
  /** İpucu / odak anahtarı -> item örneği ("ware:3", "bb:0", "bag:<uid>", "slot:helm"). */
  const instOf = (key: string): ItemInstance | undefined => {
    const i = key.indexOf(':');
    const kind = key.slice(0, i);
    const id = key.slice(i + 1);
    if (kind === 'ware') return src.wares()[Number(id)]?.inst;
    if (kind === 'bb') return src.buyback()[Number(id)]?.inst;
    if (kind === 'bag') return src.bag().find((x) => x.uid === id);
    if (kind === 'slot') return curHero()?.equipment[id as SlotId] ?? undefined;
    return undefined;
  };
  const selKey = (): string => (sel?.kind === 'ware' ? `ware:${sel.index}` : sel?.kind === 'bb' ? `bb:${sel.index}` : sel?.kind === 'bag' ? `bag:${sel.uid}` : '');

  const ix = attachItemInteractions({
    overlay,
    panel,
    sourceOf: (v, t) => {
      if (v.startsWith('ware:')) return { kind: 'ware', index: Number(v.slice(5)), itemId: t.dataset['item'] ?? '' };
      if (v.startsWith('bag:')) return { kind: 'bag', uid: v.slice(4), itemId: t.dataset['item'] ?? '' };
      if (v.startsWith('slot:')) return { kind: 'slot', heroId, slot: v.slice(5) as SlotId };
      return null;
    },
    targetOf: (v) => (v === 'bag' ? { kind: 'bag' } : v === 'wares' ? { kind: 'wares' } : v.startsWith('slot:') ? { kind: 'slot', heroId, slot: v.slice(5) as SlotId } : v.startsWith('hero:') ? { kind: 'hero', heroId: v.slice(5) } : null),
    classOf: (id) => heroOf(id)?.class,
    tipNodes: (key) => {
      const inst = instOf(key);
      if (!inst) return [];
      // Character sayfası kapalıyken her kahramana etkisi ipucunda (açıkken kahraman kartlarında)
      return itemTipNodes(inst, curHero()?.class, key.startsWith('slot:') ? [] : heroTipExtra(src.heroes(), inst, !charOpen || phoneLayout()));
    },
    onHover: (key) => {
      const k = key.startsWith('slot:') ? '' : key;
      if (k === hoverKey) return;
      hoverKey = k;
      if (charOpen) renderLeft();
    },
    onDragStart: (s) => {
      dragKey = s.kind === 'ware' ? `ware:${s.index}` : s.kind === 'bag' ? `bag:${s.uid}` : '';
      if (charOpen && dragKey) renderLeft();
    },
    onDrop: (s, _tg, act) => {
      dragKey = '';
      if (act?.kind === 'buy') doBuy(act.index);
      else if (act?.kind === 'sell') doSell(act.uid);
      else if (act?.kind === 'equip') tryEquip(act.heroId, act.uid);
      else if (act?.kind === 'unequip') run(() => src.unequip(act.heroId, act.slot), 'equip');
      else if (charOpen) renderLeft();
      void s;
    },
    stats: () => ({ stats: curStats, after: afterStats, ...(curHero() ? { classId: curHero()!.class } : {}) }),
  });

  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    closeDom(overlay, () => overlay.remove());
    document.removeEventListener('keydown', onKey, true);
    ix.destroy();
    unlockInput('merchant');
  };
  const onKey = (e: KeyboardEvent): void => {
    if (welcomeEl) {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        dismissWelcome();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (closeAsk && overlay.querySelector('.gr-confirm')) {
        closeAsk();
        closeAsk = null;
      } else if (charOpen && !phoneLayout()) toggleChar(false);
      else if (sel) {
        sel = null;
        renderAll();
      }
    } else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
      e.stopPropagation();
      if (phoneLayout()) {
        view = view === 'char' ? 'inv' : 'char';
        renderAll();
      } else toggleChar(!charOpen);
    }
  };
  document.addEventListener('keydown', onKey, true);

  /** İşlem + yeniden çizim (hata: uyarı satırı + hata sesi). */
  const run = (fn: () => void, sound: Parameters<typeof uiSound>[0], next?: MerchantLine): boolean => {
    try {
      fn();
      uiSound(sound);
      if (next) line = next;
      renderAll();
      return true;
    } catch (err) {
      flashText = err instanceof Error ? err.message : String(err);
      uiSound('error');
      renderAll();
      return false;
    }
  };
  const doBuy = (index: number): void => {
    const w = src.wares()[index];
    if (!w || w.sold) return;
    if (src.gold() < w.price) {
      line = 'poor';
      uiSound('error');
      renderAll();
      return;
    }
    if (src.bag().length >= src.bagSize) {
      line = 'bagFull';
      uiSound('error');
      renderAll();
      return;
    }
    const name = itemDef(w.inst.id)?.name ?? '';
    if (run(() => src.buy(index), 'buy', 'buy')) flash(`${name} added to your bag`);
    if (sel?.kind === 'ware' && sel.index === index) sel = null;
  };
  const doSell = (uid: string): void => {
    const inst = src.bag().find((x) => x.uid === uid);
    if (!inst) return;
    const price = src.sellPrice(inst);
    const name = itemDef(inst.id)?.name ?? '';
    if (sel?.kind === 'bag' && sel.uid === uid) sel = null;
    if (run(() => src.sell(uid), 'sell', 'sold')) flash(`Sold ${name} for ${price} gold`);
  };
  const doBuyBack = (index: number): void => {
    const e = src.buyback()[index];
    if (!e) return;
    if (src.gold() < e.price) {
      line = 'poor';
      uiSound('error');
      renderAll();
      return;
    }
    sel = null;
    run(() => src.buyBack(index), 'buy', 'buyback');
  };
  const tryEquip = (target: string, uid: string): void => {
    const h = heroOf(target);
    const inst = src.bag().find((x) => x.uid === uid);
    const d = inst ? itemDef(inst.id) : undefined;
    if (!h || !inst || !d) return;
    heroId = target;
    if (!canEquip(h.class, d)) {
      const fam = ITEMS.weaponFamilies.find((f) => f.id === d.family);
      flashText = `${className(h.class)} cannot use ${fam?.name ?? 'this weapon'}.`;
      uiSound('error');
      renderAll();
      return;
    }
    const go = (): void => void run(() => src.equip(target, uid), 'equip');
    const pc = primaryCheck(h, { equip: inst });
    if (pc.lost && pc.primary) {
      closeAsk = confirmIn(overlay, `${pc.overtakenBy.map((k) => k.toUpperCase()).join(' and ')} would exceed ${pc.primary.toUpperCase()} on the ${className(h.class)}. ${PRIMARY_BONUS_NAME[pc.primary]} will be disabled.`, 'Equip anyway', go);
      return;
    }
    go();
  };
  const flash = (t: string): void => {
    flashText = t;
    renderFoot();
  };
  const toggleChar = (on: boolean): void => {
    charOpen = on;
    uiSound('tab');
    renderAll();
  };

  // --- çizim
  const head = el('div', 'gr-head');
  const body = el('div', 'gr-body');
  const left = el('div', 'gr-stall');
  left.dataset['drop'] = 'wares';
  const right = el('div', 'gr-right');
  const foot = el('div', 'gr-foot');
  body.append(left, right);
  panel.append(head, body, foot);

  const focusInst = (): ItemInstance | null => instOf(dragKey || hoverKey || selKey()) ?? null;
  function renderHead(): void {
    const l = el('div', 'gr-head-l');
    l.append(el('div', 'gr-title', src.name));
    if (phoneLayout())
      l.append(
        viewTabs(view, (k) => {
          view = k;
          renderAll();
        }, ['Character', 'Wares']),
      );
    else l.append(el('div', 'gr-shop-sub', src.sub));
    const purse = el('div', 'gr-gold', `${src.gold()} gold`);
    const gi = goldIcon('gr-ui-ico');
    if (gi) {
      purse.classList.add('gr-has-ico');
      purse.prepend(gi);
    }
    head.replaceChildren(l, purse);
  }
  function renderLeft(): void {
    const phone = phoneLayout();
    const showChar = phone ? view === 'char' : charOpen;
    const bar = el('div', 'gr-stall-bar');
    if (!phone) {
      bar.append(el('div', 'gr-sec', showChar ? 'Character' : 'Wares'));
      bar.append(btn(`gr-chip${showChar ? ' on' : ''}`, showChar ? 'Wares (C)' : 'Character (C)', () => toggleChar(!charOpen)));
    }
    if (showChar) {
      const r = renderCharacter({
        heroes: src.heroes(),
        heroId,
        focus: focusInst(),
        compact: phone,
        onHero: (id) => {
          heroId = id;
          renderAll();
        },
        onSlotDouble: (slot) => {
          const h = curHero();
          if (h) run(() => src.unequip(h.id, slot), 'equip');
        },
      });
      curStats = r.stats;
      afterStats = r.after;
      left.replaceChildren(...(phone ? [] : [bar]), r.el);
      left.classList.add('char');
      if (ix.dragging()) ix.remark();
      return;
    }
    left.classList.remove('char');
    // konuşma satırı (kafa portresi + balon)
    const talk = el('div', 'gr-odo');
    const face = el('div', 'gr-face');
    const url = avatarUrl('merchant');
    if (url) face.style.backgroundImage = `url("${url}")`;
    talk.append(face, el('div', 'gr-odo-line', src.lines[line]));
    // mallar (3x3; satılmış soluk, yetmeyen altın kırmızı fiyat)
    const wares = el('div', 'gr-wares');
    src.wares().forEach((w, i) => {
      const poor = !w.sold && src.gold() < w.price;
      const cell = itemCell(w.inst, { selected: sel?.kind === 'ware' && sel.index === i, ...(w.sold ? {} : { drag: `ware:${i}` }), tip: `ware:${i}`, price: w.sold ? null : w.price, priceBad: poor });
      const b = cell.querySelector<HTMLButtonElement>('button')!;
      if (w.sold) {
        b.classList.add('sold');
        cell.querySelector('.gr-price')!.textContent = 'SOLD';
      }
      b.addEventListener('click', () => {
        if (ix.justEnded()) return;
        const now = performance.now();
        if (isDoubleTap(lastWareTap, `ware:${i}`, now) && !w.sold) {
          lastWareTap = null;
          doBuy(i);
          return;
        }
        lastWareTap = { key: `ware:${i}`, at: now };
        sel = sel?.kind === 'ware' && sel.index === i ? null : { kind: 'ware', index: i };
        line = poor ? 'poor' : 'idle';
        renderAll();
      });
      wares.append(cell);
    });
    if (!src.wares().length) wares.append(el('div', 'gr-card-empty', src.lines.empty));
    // yenileme (altın ikonu + bedel)
    const can = src.gold() >= src.rerollCost;
    const reroll = btn('gr-btn sm gr-reroll', 'Reroll wares', () => run(() => src.reroll(), 'confirm', 'reroll'));
    const cost = el('span', 'gr-cost', String(src.rerollCost));
    const gi = goldIcon();
    if (gi) cost.prepend(gi);
    reroll.append(cost);
    reroll.disabled = !can;
    // geri alım (bu ziyaret)
    const bb = el('div', 'gr-buyback');
    const list = src.buyback();
    bb.append(el('div', 'gr-sec', 'Buy back · this visit'));
    const row = el('div', 'gr-bb-row');
    if (!list.length) row.append(el('div', 'gr-card-empty', 'Sold something by mistake? Buy it back here until you move on.'));
    list.forEach((e, i) => {
      const cell = itemCell(e.inst, { selected: sel?.kind === 'bb' && sel.index === i, tip: `bb:${i}`, price: e.price, priceBad: src.gold() < e.price });
      cell.querySelector('button')!.addEventListener('click', () => {
        sel = sel?.kind === 'bb' && sel.index === i ? null : { kind: 'bb', index: i };
        line = 'buyback';
        renderAll();
      });
      row.append(cell);
    });
    bb.append(row);
    left.replaceChildren(...(phone ? [] : [bar]), talk, wares, reroll, bb);
  }
  function renderRight(): void {
    const phone = phoneLayout();
    const hero = curHero();
    const scroll = right.querySelector<HTMLElement>('.gr-bag')?.scrollTop ?? 0;
    const inv = renderInventory({
      items: src.bag(),
      size: src.bagSize,
      title: 'Your bag',
      ...(charOpen && hero ? { usableClass: hero.class } : {}),
      selected: sel?.kind === 'bag' ? sel.uid : '',
      price: (inst) => src.sellPrice(inst),
      onTap: (uid) => {
        sel = sel?.kind === 'bag' && sel.uid === uid ? null : { kind: 'bag', uid };
        line = 'sell';
        renderAll();
      },
      onDouble: (uid) => {
        const h = curHero();
        if (charOpen && h) tryEquip(h.id, uid);
      },
    });
    right.replaceChildren(...(phone && view === 'char' ? [heroRail(src.heroes(), heroId, (id) => {
      heroId = id;
      renderAll();
    }), inv] : [inv]));
    const g = right.querySelector<HTMLElement>('.gr-bag');
    if (g) g.scrollTop = scroll;
  }
  function renderFoot(): void {
    const hint = el('div', `gr-foot-hint${flashText ? ' warn' : ''}`, flashText || src.note || 'Drag a ware into your bag to buy it; drag a bag item onto the stall to sell it.');
    flashText = '';
    const acts: HTMLElement[] = [btn('gr-btn', 'Move on', () => o.onLeave())];
    // seçimin eylemi (birincil, en sağda)
    if (sel?.kind === 'ware') {
      const w = src.wares()[sel.index];
      if (w && !w.sold) {
        const short = w.price - src.gold();
        const full = src.bag().length >= src.bagSize;
        const index = sel.index;
        const b = btn('gr-btn primary', short > 0 ? `Need ${short} more` : full ? 'Bag full' : `Buy · ${w.price}`, () => doBuy(index));
        b.disabled = short > 0 || full;
        acts.push(b);
      }
    } else if (sel?.kind === 'bag') {
      const inst = src.bag().find((x) => x.uid === (sel as { uid: string }).uid);
      const uid = sel.uid;
      if (inst) acts.push(btn('gr-btn primary', `Sell · ${src.sellPrice(inst)}`, () => doSell(uid)));
    } else if (sel?.kind === 'bb') {
      const e = src.buyback()[sel.index];
      const index = sel.index;
      if (e) {
        const b = btn('gr-btn primary', src.gold() < e.price ? `Need ${e.price - src.gold()} more` : `Buy back · ${e.price}`, () => doBuyBack(index));
        b.disabled = src.gold() < e.price;
        acts.push(b);
      }
    }
    foot.replaceChildren(hint, ...acts);
  }
  function renderAll(): void {
    if (closed) return;
    ix.hideTips();
    const phone = phoneLayout();
    panel.classList.toggle('gr-phone', phone);
    panel.classList.toggle('show-char', phone && view === 'char');
    panel.classList.toggle('show-inv', phone && view === 'inv');
    renderHead();
    renderLeft();
    renderRight();
    renderFoot();
  }

  // --- karşılama (seçenek C): yarım panel kayıp çekilir, arkada tüccar hazır
  let welcomeEl: HTMLElement | null = null;
  const dismissWelcome = (): void => {
    const w = welcomeEl;
    if (!w) return;
    welcomeEl = null;
    uiSound('confirm');
    overlay.classList.remove('mw-on');
    w.classList.add('gone');
    window.setTimeout(() => w.remove(), reducedMotion() ? 0 : 560);
  };
  if (o.welcome) {
    const wares = src.wares().filter((w) => !w.sold);
    const best = [...wares].sort((a, b) => rarityIndex(instanceRarity(b.inst)) - rarityIndex(instanceRarity(a.inst)) || b.price - a.price)[0];
    const rare = best && rarityIndex(instanceRarity(best.inst)) >= rarityIndex('epic');
    const w = el('div', 'mw-welcome');
    const half = el('div', 'mw-half');
    const fig = el('img', 'mw-odo');
    fig.src = odoFull;
    fig.alt = '';
    fig.draggable = false;
    const card = el('div', 'mw-card');
    card.append(el('div', 'mw-kick', 'A travelling merchant'), el('div', 'mw-name', src.name), el('div', 'mw-greet', `"${GREETING}"`));
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
      t.append(n, p);
      hl.append(t);
      card.append(hl);
    }
    card.append(btn('gr-btn primary mw-go', 'Browse wares', dismissWelcome));
    half.append(fig, card);
    w.append(half);
    overlay.append(w);
    overlay.classList.add('mw-on');
    welcomeEl = w;
  }
  renderAll();
  return close;
}
