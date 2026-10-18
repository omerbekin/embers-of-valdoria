/**
 * Ortak item etkileşim denetçisi (Ömer 2026-10-11, g1): Gear, tüccar ve ödül torbası aynı davranışı paylaşır.
 *  - `data-tip` taşıyan hücrenin üstüne gelince imlecin yanında item ipucu (src/ui/item-tip.ts); dokunmatikte TEK DOKUNUŞ ipucunu hücrenin
 *    yanına sabitler (altında `tipActions` düğmeleri: Equip / Unequip / Buy / Sell ...), başka item'e dokunmak ipucunu ona geçirir, aynı item'e
 *    yeniden dokunmak ya da boşluğa dokunmak kapatır; dokunuşun click'i yutulur (ekranın seç / çift dokunma / al eylemi çalışmaz; Ömer 2026-10-12);
 *  - `data-drag` taşıyan hücre sürüklenir (fare 6 px; dokunmatikte uzun basıştan sonra kaydırınca: gear-drop.ts > pressStep); hayalet ikon
 *    imleci izler, `data-drop` hedefleri kurala göre parlar / söner (gear-drop.ts > dropAction); torbadan sürüklerken çöp kutusu görünür;
 *  - stat / skill / affix satırlarının açıklaması (`data-stat`, `data-skill`, `data-affix`; savaş HUD'ıyla aynı metin).
 * Kararı çağıran verir (`onDrop`); denetçi yalnızca girdiyi yönetir. Oyun içi metinler İngilizce.
 */
import { affixTip, itemDef, type AffixLine } from '../progression';
import type { Stats } from '../engine';
import { dropAction, isDoubleTap, pressStep, showsTrash, type DropAction, type DragSource, type DropTarget } from './gear-drop';
import { ItemTip, offsetIn, type ItemTipAction } from './item-tip';
import { statBandSpec, statTip } from './stat-tips';
import { bandPipsHtml, bandTipHtml, type BandTipSpec } from './band-tip';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export { offsetIn };

const TRASH_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export interface ItemInteractionHost {
  /** Pencerenin zemini (ipucu, hayalet ve çöp kutusu burada konumlanır). */
  overlay: HTMLElement;
  /** Basışların dinlendiği kap. */
  panel: HTMLElement;
  /** `data-drag` değeri -> sürükleme kaynağı. */
  sourceOf(value: string, el: HTMLElement): DragSource | null;
  /** `data-drop` değeri -> bırakma hedefi. */
  targetOf(value: string): DropTarget | null;
  classOf(heroId: string): string | undefined;
  /** `data-tip` anahtarının ipucu içeriği (boş = ipucu yok). */
  tipNodes(key: string): HTMLElement[];
  /** Dokunmatikte sabitlenen ipucunun eylem düğmeleri (yoksa düğmesiz). */
  tipActions?(key: string): ItemTipAction[];
  /** Üstüne gelinen ipucu anahtarı (yoksa ''): karşılaştırma odağı. */
  onHover?(key: string): void;
  onDragStart?(src: DragSource): void;
  /** Bırakma (hedef / kural sonucu; geçersizse null). Sürükleme iptal / boşluğa bırakma da çağrılır (target null). */
  onDrop(src: DragSource, target: DropTarget | null, action: DropAction | null): void;
  /** Çöp kutusu gösterilsin mi (Gear ve ödül torbası; tüccarda satış tezgâhı var). */
  trash?: boolean;
  /** Stat / skill ipuçları için seçili kahramanın statları (yoksa stat ipucu yok). */
  stats?(): { stats: Stats | null; after: Stats | null; classId?: string };
  /**
   * Dokunmatikte aynı `data-tip` hücresine çift dokunuş (Ömer 2026-10-16, tüccarda torba item'i = sat). true = eylem yapıldı (ipucu kapanır);
   * false / verilmemiş = eski davranış (ikinci dokunuş ipucunu kapatır).
   */
  onDoubleTap?(key: string): boolean;
}

export interface ItemInteractions {
  tip: ItemTip;
  /** Sürükleme sürüyor mu. */
  dragging(): boolean;
  /** Yeniden çizimden sonra bırakma hedeflerini yeniden işaretle (sürüklerken). */
  remark(): void;
  hideTips(): void;
  /** Kısa süre önce sürükleme / uzun basış / ipucu dokunuşu bitti: o kalkışın tıklaması yok sayılmalı. */
  justEnded(): boolean;
  destroy(): void;
}

/** Ortak etkileşimleri bağlar; `destroy` belge dinleyicilerini kaldırır. */
export function attachItemInteractions(h: ItemInteractionHost): ItemInteractions {
  const { overlay, panel } = h;
  const itip = new ItemTip(overlay);
  // --- stat / skill / affix açıklaması (kit tooltip'i)
  const tip = el('div', 'el-tip gr-tip');
  overlay.append(tip);
  let tipFor: HTMLElement | null = null;
  let tipPinned = false;
  const hideTip = (): void => {
    tip.classList.remove('on');
    tipFor = null;
    tipPinned = false;
  };
  const showTip = (t: HTMLElement): void => {
    const hint = t.dataset['hint'];
    const ctx = h.stats?.();
    if (!ctx && hint === undefined) return;
    // Hepsi ortak "A - Band" ipucu (src/ui/band-tip.ts; Ömer 2026-10-18)
    if (hint !== undefined) {
      // kısa ipucu (ikon düğmesi / kahraman yer imi): ad + isteğe bağlı alt satır
      const sub = t.dataset['hintSub'];
      const tone = t.dataset['hintTone'] ?? 'idle';
      const toneColor = tone === 'up' ? '#8fe39a' : tone === 'down' || tone === 'no' ? '#ff8a7a' : tone === 'mixed' ? '#ffd76a' : undefined;
      const hero = t.dataset['hintKind'] === 'Hero';
      const items = t.dataset['hintItems'];
      const spec: BandTipSpec = {
        title: hint,
        ...(hero ? { kind: 'Hero', iconShape: 'round' as const, ...(t.dataset['hintImg'] ? { icon: t.dataset['hintImg'] } : {}), ...(t.dataset['hintLv'] ? { value: `Lv ${t.dataset['hintLv']}`, valueLabel: 'Level' } : {}) } : {}),
        ...(hero && items ? { bodyHtml: `<div class="bt-ln"><span class="dia"></span><div class="tx"><span class="k">Items</span> <span class="n">${items}</span></div>${bandPipsHtml(Number(items.split('/')[0]), Number(items.split('/')[1]))}</div>` } : {}),
        // kahramanda alt satır yalnızca bir item üstündeyken (etki özeti); olağan "Level N · k/7 items" satırı başlıkta zaten var
        ...(sub && !(hero && tone === 'idle') ? { lines: [{ text: sub, ...(toneColor ? { color: toneColor } : {}) }] } : {}),
        noKeywords: true,
      };
      tip.innerHTML = bandTipHtml(spec);
    } else if (!ctx) return;
    else if (t.dataset['affix'] !== undefined) {
      const info = affixTip({ name: t.dataset['affix'] ?? '', desc: t.dataset['desc'] ?? '', tier: (t.dataset['tier'] ?? 'C') as AffixLine['tier'], text: t.dataset['text'] ?? '', range: t.dataset['range'] ?? '' });
      tip.innerHTML = bandTipHtml({ kind: 'Affix', title: info.title, lines: info.lines.map((text) => ({ text })) });
    } else {
      const id = t.dataset['stat'] ?? '';
      const info = ctx.stats ? statTip(id, ctx.stats, t.dataset['delta'] ? ctx.after : null) : null;
      if (!info) return;
      const d = t.dataset['delta'] ? { text: t.dataset['delta'], dir: t.dataset['dir'] === 'down' ? ('down' as const) : ('up' as const) } : undefined;
      tip.innerHTML = bandTipHtml(statBandSpec(id, info, d));
    }
    tip.classList.add('on');
    const p = offsetIn(t, overlay);
    const W = overlay.clientWidth;
    const H = overlay.clientHeight;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    // kısa ipucu (sol kenardaki yer imleri): düğmenin sağında; diğerleri üstünde
    const side = t.dataset['hint'] !== undefined;
    const x = side ? p.x + t.offsetWidth + 10 : p.x + t.offsetWidth / 2 - tw / 2;
    let y = side ? p.y + t.offsetHeight / 2 - th / 2 : p.y - th - 8;
    if (y < 6) y = side ? 6 : p.y + t.offsetHeight + 8;
    tip.style.left = `${Math.max(6, Math.min(W - tw - 6, x))}px`;
    tip.style.top = `${Math.max(6, Math.min(H - th - 6, y))}px`;
    tipFor = t;
  };
  // skill hücreleri savaş HUD'ının kendi tooltip'ini taşır (src/ui/skill-bar.ts): burada yalnızca stat / affix satırları
  // `data-hint`: kısa ipucu (yalnızca üstüne gelince / dokunmatikte uzun basınca; dokunuş düğmenin kendi eylemidir)
  const TIP_SEL = '[data-stat],[data-affix],[data-hint]';

  let hoverKey = '';
  const setHover = (key: string): void => {
    if (key === hoverKey) return;
    hoverKey = key;
    h.onHover?.(key);
  };
  const onOver = (e: PointerEvent): void => {
    if (e.pointerType === 'touch' || drag) return;
    const target = e.target as HTMLElement;
    const it = target.closest<HTMLElement>('[data-tip]');
    if (it) {
      const key = it.dataset['tip'] ?? '';
      if (key !== itip.shownKey) itip.show(key, h.tipNodes(key), e.clientX, e.clientY);
      setHover(key);
      return;
    }
    if (tipPinned) return;
    const t = target.closest<HTMLElement>(TIP_SEL);
    if (t && t !== tipFor) showTip(t);
  };
  const onLocalMove = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch' && itip.shownKey) itip.follow(e.clientX, e.clientY);
  };
  const onOut = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    const target = e.target as HTMLElement;
    const into = e.relatedTarget instanceof Element ? e.relatedTarget : null;
    const it = target.closest<HTMLElement>('[data-tip]');
    if (it && !(into && it.contains(into)) && !into?.closest('[data-tip]')) {
      itip.hide();
      if (!drag) setHover('');
    }
    if (tipPinned) return;
    const t = target.closest<HTMLElement>(TIP_SEL);
    if (t && !(into && t.contains(into))) hideTip();
  };
  const onClickTip = (e: MouseEvent): void => {
    const t = (e.target as HTMLElement).closest<HTMLElement>(TIP_SEL);
    if (t?.dataset['hint'] !== undefined) {
      hideTip();
      return;
    }
    if (!t) {
      if (tipPinned) hideTip();
      return;
    }
    if (tipFor === t && tipPinned) hideTip();
    else {
      showTip(t);
      tipPinned = true;
    }
  };
  // [+] / [−] ya da başka bir yenilemeden sonra satır baştan kurulur: açık stat ipucu (gezinme ya da sabitlenmiş) aynı statın yeni satırına
  // geçirilir, böylece değerler ("POINTS (+1)", "now 18") anında güncellenir (Ömer 2026-10-18)
  let tipSync = 0;
  const syncTip = (): void => {
    tipSync = 0;
    if (!tipFor || tipFor.isConnected || !tip.classList.contains('on')) return;
    const id = tipFor.dataset['stat'];
    if (id === undefined) return;
    const next = overlay.querySelector<HTMLElement>(`[data-stat="${id}"]`);
    if (next) showTip(next);
    else {
      tip.classList.remove('on');
      tipFor = null;
    }
  };
  const tipObserver = new MutationObserver(() => {
    if (!tipSync && tipFor && !tipFor.isConnected) tipSync = requestAnimationFrame(syncTip);
  });
  tipObserver.observe(overlay, { childList: true, subtree: true });
  overlay.addEventListener('pointerover', onOver);
  overlay.addEventListener('pointermove', onLocalMove);
  overlay.addEventListener('pointerout', onOut);
  overlay.addEventListener('click', onClickTip);

  // --- sürükle-bırak
  let drag: { src: DragSource; ghost: HTMLElement; rc: string } | null = null;
  let press: { src: DragSource; x: number; y: number; touch: boolean; t0: number; tipShown: boolean; timer: number; icon: HTMLElement; rc: string; tipKey: string } | null = null;
  let ended = false;
  const markEnded = (): void => {
    ended = true;
    window.setTimeout(() => (ended = false), 0);
  };
  // dokunmatik ipucu dokunuşu: kalkıştan sonra gelen (ayrı görevde de gelebilen) click / dblclick yutulur
  let swallowUntil = 0;
  let lastTouchAt = 0;
  let tap: { el: HTMLElement; key: string; x: number; y: number } | null = null;
  /** Son tek dokunuş (çift dokunuş için; `onDoubleTap`). */
  let lastTap: { key: string; at: number } | null = null;
  const pinTip = (key: string, anchor: HTMLElement): void => {
    if (!key) return;
    itip.pin(key, h.tipNodes(key), anchor, h.tipActions?.(key) ?? []);
    setHover(itip.shownKey);
  };
  const trash = el('div', 'gr-trash');
  trash.dataset['drop'] = 'trash';
  trash.innerHTML = `${TRASH_SVG}<span>Discard</span>`;
  if (h.trash) overlay.append(trash);
  const targetAt = (node: Element | null): DropTarget | null => {
    const t = node?.closest<HTMLElement>('[data-drop]');
    return t ? h.targetOf(t.dataset['drop'] ?? '') : null;
  };
  const remark = (): void => {
    const on = !!drag;
    overlay.classList.toggle('gr-dragging', on);
    overlay.classList.toggle('gr-trash-on', on && !!h.trash && showsTrash(drag?.src));
    overlay.querySelectorAll<HTMLElement>('[data-drop]').forEach((t) => {
      t.classList.remove('drop-ok', 'drop-no', 'drop-off');
      if (!on || !drag) return;
      const tg = h.targetOf(t.dataset['drop'] ?? '');
      const ok = !!tg && dropAction(drag.src, tg, h.classOf).kind !== 'none';
      t.classList.add(ok ? 'drop-ok' : 'drop-no');
      // silah ikinci el yuvasına gidiyorsa bant "Off-hand" der (gear.css > .gp-hint)
      if (ok && t.dataset['drop'] === 'slot:offhand' && 'itemId' in drag.src && itemDef(drag.src.itemId)?.slot === 'weapon') t.classList.add('drop-off');
    });
    if (on && drag) overlay.style.setProperty('--drag-rc', drag.rc);
  };
  const moveGhost = (x: number, y: number): void => {
    if (!drag) return;
    const r = overlay.getBoundingClientRect();
    const s = r.width / Math.max(1, overlay.offsetWidth);
    drag.ghost.style.left = `${(x - r.left) / s}px`;
    drag.ghost.style.top = `${(y - r.top) / s}px`;
  };
  const startDrag = (x: number, y: number): void => {
    if (!press) return;
    window.clearTimeout(press.timer);
    const ghost = el('div', 'gr-ghost');
    ghost.style.setProperty('--rc', press.rc);
    ghost.append(press.icon.cloneNode(true));
    overlay.append(ghost);
    drag = { src: press.src, ghost, rc: press.rc };
    hideTip();
    itip.hide();
    h.onDragStart?.(press.src);
    remark();
    moveGhost(x, y);
  };
  const endDrag = (x: number, y: number, drop: boolean): void => {
    const d = drag;
    drag = null;
    if (press) window.clearTimeout(press.timer);
    press = null;
    if (!d) return;
    d.ghost.remove();
    // hedef, çöp kutusu gizlenmeden önce okunur (gizlenince işaretçi olayları kapanır)
    const tg = drop ? targetAt(document.elementFromPoint(x, y)) : null;
    remark();
    markEnded();
    h.onDrop(d.src, tg, tg ? dropAction(d.src, tg, h.classOf) : null);
  };
  /** Dokunmatikte `data-hint` düğmesine uzun basış: kısa ipucu (parmak kalkınca düğmenin tıklaması yutulur). */
  let hintPress: { timer: number; x: number; y: number } | null = null;
  const clearHintPress = (): void => {
    if (hintPress) window.clearTimeout(hintPress.timer);
    hintPress = null;
  };
  const onDown = (e: PointerEvent): void => {
    tap = null;
    clearHintPress();
    if (e.pointerType === 'touch') {
      lastTouchAt = performance.now();
      if (tipFor?.dataset['hint'] !== undefined) hideTip();
      const hintEl = (e.target as HTMLElement).closest<HTMLElement>('[data-hint]');
      if (hintEl && panel.contains(hintEl))
        hintPress = {
          x: e.clientX,
          y: e.clientY,
          timer: window.setTimeout(() => {
            hintPress = null;
            showTip(hintEl);
            tipPinned = true;
            swallowUntil = performance.now() + 1500;
          }, 380),
        };
      const tipEl = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
      if (!tipEl && itip.shownKey) {
        itip.hide();
        setHover('');
      }
      if (tipEl && panel.contains(tipEl)) tap = { el: tipEl, key: tipEl.dataset['tip'] ?? '', x: e.clientX, y: e.clientY };
    }
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-drag]');
    if (!t || e.button > 0 || !panel.contains(t)) return;
    const srcD = h.sourceOf(t.dataset['drag'] ?? '', t);
    if (!srcD) return;
    const touch = e.pointerType === 'touch';
    const icon = t.querySelector<HTMLElement>('.gr-svg') ?? t;
    const tipKey = t.dataset['tip'] ?? '';
    press = { src: srcD, x: e.clientX, y: e.clientY, touch, t0: performance.now(), tipShown: false, icon, rc: t.style.getPropertyValue('--rc') || '#f3d999', timer: 0, tipKey };
    if (touch)
      press.timer = window.setTimeout(() => {
        if (!press || drag) return;
        // uzun basış: ipucu sabitlenir (tek dokunuşla aynı); parmak kayarsa sürükleme başlar
        press.tipShown = true;
        tap = null;
        pinTip(press.tipKey, t);
      }, 380);
  };
  const onMove = (e: PointerEvent): void => {
    if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 10) tap = null;
    if (hintPress && Math.hypot(e.clientX - hintPress.x, e.clientY - hintPress.y) > 10) clearHintPress();
    if (drag) {
      moveGhost(e.clientX, e.clientY);
      return;
    }
    if (!press) return;
    const step = pressStep({ touch: press.touch, heldMs: performance.now() - press.t0, dist: Math.hypot(e.clientX - press.x, e.clientY - press.y), tipShown: press.tipShown });
    if (step === 'drag') startDrag(e.clientX, e.clientY);
    else if (step === 'cancel') {
      // parmak kaydı (kaydırma): sabitlenmiş ipucu eski yerinde kalmasın
      window.clearTimeout(press.timer);
      press = null;
      if (itip.pinned) {
        itip.hide();
        setHover('');
      }
    }
  };
  const onUp = (e: PointerEvent): void => {
    clearHintPress();
    const tp = tap;
    tap = null;
    if (!drag && tp && e.pointerType === 'touch' && !press?.tipShown) {
      // tek dokunuş: ipucunu bu item'e sabitle (aynı item yeniden = kapat); ekranın click eylemi çalışmaz
      if (press) window.clearTimeout(press.timer);
      press = null;
      const now = performance.now();
      if (h.onDoubleTap && tp.key && isDoubleTap(lastTap, tp.key, now)) {
        lastTap = null;
        if (h.onDoubleTap(tp.key)) {
          itip.hide();
          setHover('');
          swallowUntil = now + 700;
          return;
        }
      } else lastTap = { key: tp.key, at: now };
      if (itip.pinned && itip.shownKey === tp.key) {
        itip.hide();
        setHover('');
      } else pinTip(tp.key, tp.el);
      swallowUntil = performance.now() + 700;
      return;
    }
    if (!drag && press?.touch && press.tipShown) {
      // uzun basıştan sonra parmak kalktı: ipucu açık kalır (bir sonraki dokunuşta kapanır)
      window.clearTimeout(press.timer);
      press = null;
      markEnded();
      return;
    }
    endDrag(e.clientX, e.clientY, true);
  };
  const onCancel = (e: PointerEvent): void => {
    clearHintPress();
    endDrag(e.clientX, e.clientY, false);
  };
  const onTouchMove = (e: TouchEvent): void => {
    if (drag || press?.tipShown) e.preventDefault();
  };
  const onClickCapture = (e: MouseEvent): void => {
    const swallow = performance.now() < swallowUntil;
    if (ended || swallow) {
      swallowUntil = 0;
      e.stopPropagation();
      e.preventDefault();
    }
  };
  const onDblCapture = (e: MouseEvent): void => {
    // dokunmatikte çift dokunuş kuşanmaz / satmaz (eylem ipucunun düğmesinde)
    if (performance.now() - lastTouchAt < 800) {
      e.stopPropagation();
      e.preventDefault();
    }
  };
  const onContext = (e: MouseEvent): void => {
    if ((e.target as HTMLElement).closest('[data-drag]')) e.preventDefault();
  };
  overlay.addEventListener('pointerdown', onDown);
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onCancel);
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  panel.addEventListener('click', onClickCapture, true);
  panel.addEventListener('dblclick', onDblCapture, true);
  panel.addEventListener('contextmenu', onContext);
  return {
    tip: itip,
    dragging: () => !!drag,
    remark,
    hideTips: () => {
      hideTip();
      itip.hide();
    },
    justEnded: () => ended || performance.now() < swallowUntil,
    destroy: () => {
      tipObserver.disconnect();
      clearHintPress();
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('touchmove', onTouchMove);
      if (drag) drag.ghost.remove();
      drag = null;
      press = null;
    },
  };
}
