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
import { affixTip, type AffixLine } from '../progression';
import type { Stats } from '../engine';
import { dropAction, isDoubleTap, pressStep, showsTrash, type DropAction, type DragSource, type DropTarget } from './gear-drop';
import { ItemTip, offsetIn, type ItemTipAction } from './item-tip';
import { statTip, statTipSegments } from './stat-tips';

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
    const ctx = h.stats?.();
    if (!ctx) return;
    const line = (l: string, color?: string): HTMLElement => {
      const d = el('div', 'gr-tip-l');
      if (color) d.style.color = color;
      d.append(...statTipSegments(l).map((g) => (g.dir ? el('span', `gr-tip-d ${g.dir}`, g.text) : document.createTextNode(g.text))));
      return d;
    };
    if (t.dataset['affix'] !== undefined) {
      const info = affixTip({ name: t.dataset['affix'] ?? '', desc: t.dataset['desc'] ?? '', tier: (t.dataset['tier'] ?? 'C') as AffixLine['tier'], text: t.dataset['text'] ?? '', range: t.dataset['range'] ?? '' });
      tip.replaceChildren(el('b', '', info.title), ...info.lines.map((l) => line(l)));
    } else {
      const info = ctx.stats ? statTip(t.dataset['stat'] ?? '', ctx.stats, t.dataset['delta'] ? ctx.after : null) : null;
      if (!info) return;
      const head = el('b', '', info.title);
      if (t.dataset['delta']) head.append(el('span', `gr-tip-d ${t.dataset['dir'] ?? ''}`, ` (${t.dataset['delta']})`));
      tip.replaceChildren(head, ...info.lines.map((l) => line(l)));
    }
    tip.classList.add('on');
    const p = offsetIn(t, overlay);
    const W = overlay.clientWidth;
    const H = overlay.clientHeight;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const x = p.x + t.offsetWidth / 2 - tw / 2;
    let y = p.y - th - 8;
    if (y < 6) y = p.y + t.offsetHeight + 8;
    tip.style.left = `${Math.max(6, Math.min(W - tw - 6, x))}px`;
    tip.style.top = `${Math.max(6, Math.min(H - th - 6, y))}px`;
    tipFor = t;
  };
  // skill hücreleri savaş HUD'ının kendi tooltip'ini taşır (src/ui/skill-bar.ts): burada yalnızca stat / affix satırları
  const TIP_SEL = '[data-stat],[data-affix]';

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
      t.classList.remove('drop-ok', 'drop-no');
      if (!on || !drag) return;
      const tg = h.targetOf(t.dataset['drop'] ?? '');
      const ok = !!tg && dropAction(drag.src, tg, h.classOf).kind !== 'none';
      t.classList.add(ok ? 'drop-ok' : 'drop-no');
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
  const onDown = (e: PointerEvent): void => {
    tap = null;
    if (e.pointerType === 'touch') {
      lastTouchAt = performance.now();
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
  const onCancel = (e: PointerEvent): void => endDrag(e.clientX, e.clientY, false);
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
