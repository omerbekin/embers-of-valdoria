// Gerçek denetimlere (düğme, rozet) A Band ipucu bağlar: fare üstüne gelince açılır, dokununca sabitlenir (yeniden dokununca / başka yere dokununca kapanır).
// Tarayıcının yerel `title=` balonunun yerine geçer (telefonda hiç görünmezdi). Pasif düğme fareyi yutar; o durumda olaylar üst kaptan dinlenir
// (band-tip.css: button:disabled[data-bt] pointer-events none). Metin değiştirmez; yalnızca görünümü kurar.
import { bandTipHtml, type BandTipSpec } from './band-tip';
import { tipOff, tipOn } from './tip-vis';
import { rectToLocal } from './formation-board-rules';

export type BandTipSource = BandTipSpec | (() => BandTipSpec | null);

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** İpucunun denetime göre yönü: üstte (sığmazsa altta), altta (sığmazsa üstte), solda (sığmazsa sağda), sağda (sığmazsa solda). */
export type TipSide = 'above' | 'below' | 'left' | 'right';

export interface TipPlaceOpts {
  gap?: number;
  pad?: number;
  side?: TipSide;
  /** Üst / alt yerleşimde yatay hiza: denetime ortalı (varsayılan) ya da sağ kenarları hizalı ('end'). */
  align?: 'center' | 'end';
}

/**
 * İpucunun denetime göre yerleşimi, `host` kabına göre (x, y). Varsayılan: üstte; sığmazsa altta. Sınır: kap ipucunu içine alacak kadar büyükse kap
 * (görünümle kesişimi), değilse görünüm (`view`; ör. köşedeki küçük Gear / Formation kabı). Saf işlev; tüm kutular aynı koordinat düzleminde.
 */
export function placeBandTip(anchor: Box, tip: { w: number; h: number }, host: Box, view: Box, gap = 8, pad = 6, side: TipSide = 'above', align: 'center' | 'end' = 'center'): { x: number; y: number } {
  const roomy = host.width >= tip.w + pad * 2 && host.height >= tip.h + pad * 2;
  // Kap görünümden taşıyorsa (kaydırılmış / ekran dışına uzanan kap) sınır ikisinin kesişimi: ipucu ekran dışına itilmez.
  const bd = roomy ? clipBox(host, view) : view;
  const minX = bd.left + pad;
  const minY = bd.top + pad;
  const maxX = bd.left + bd.width - tip.w - pad;
  const maxY = bd.top + bd.height - tip.h - pad;
  const above = anchor.top - tip.h - gap;
  const below = anchor.top + anchor.height + gap;
  const leftOf = anchor.left - tip.w - gap;
  const rightOf = anchor.left + anchor.width + gap;
  let x: number;
  let y: number;
  if (side === 'left' || side === 'right') {
    y = anchor.top + anchor.height / 2 - tip.h / 2;
    if (side === 'left') x = leftOf < minX ? rightOf : leftOf;
    else x = rightOf > maxX ? leftOf : rightOf;
  } else {
    x = align === 'end' ? anchor.left + anchor.width - tip.w : anchor.left + anchor.width / 2 - tip.w / 2;
    if (side === 'above') y = above < minY ? below : above;
    else y = below > maxY ? above : below;
  }
  x = Math.max(minX, Math.min(maxX, x));
  y = Math.max(minY, Math.min(maxY, y));
  return { x: x - host.left, y: y - host.top };
}

function clipBox(a: Box, b: Box): Box {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const width = Math.min(a.left + a.width, b.left + b.width) - left;
  const height = Math.min(a.top + a.height, b.top + b.height) - top;
  return width > 0 && height > 0 ? { left, top, width, height } : b;
}

type ClientRectLike = { left: number; top: number; right: number; bottom: number };

/**
 * İpucunun GERÇEK konum kabının (`offsetParent`) yerel koordinat düzlemi: `loc` tarayıcı dikdörtgenini (ya da öğeyi) o düzleme çevirir, `view` görünür
 * alan. `style.left / top` bu düzlemde yazılır. Döndürülmüş sahnede (telefon dikey, html.rotated) ve ölçekli kapta da doğru. Kendi kurallı
 * yerleşimler (ağaç ipucu gibi) bunu kullanır; düz "denetimin yanında" yerleşim için `positionTip`.
 */
export function tipFrame(pop: HTMLElement): { loc: (r: ClientRectLike | Element) => Box; view: Box } {
  const cb = (pop.offsetParent as HTMLElement | null) ?? document.documentElement;
  const rotated = document.documentElement.classList.contains('rotated') && !!cb.closest('#stage');
  const cr = cb.getBoundingClientRect();
  const loc = (r: ClientRectLike | Element): Box => {
    const l = rectToLocal(r instanceof Element ? r.getBoundingClientRect() : r, cr, cb.offsetWidth, rotated);
    return { left: l.x, top: l.y, width: l.w, height: l.h };
  };
  return { loc, view: loc({ left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }) };
}

/**
 * Açılmış bir ipucunu (`pop`: position absolute, kapta, ölçülebilir) `anchor` öğesinin yanına koyar (varsayılan üstte, sığmazsa altta). TÜM DOM
 * ipuçlarının ortak yerleşimi (Ömer 2026-11-12, "ipucu öğeden çok uzakta"): koordinatlar ipucunun GERÇEK konum kabına (`offsetParent`) göre hesaplanır,
 * eklendiği kaba (`bound`) göre değil. Eski hata: #ui-root kabı position static ve 0 px yüksek; ona göre sıkıştırılan ipucu hep ekranın tepesine
 * (y = 6) yapışırdı. `bound` yalnızca sınırdır (ipucu kabın içine sığıyorsa kabın içinde kalır, sığmıyorsa / kap boşsa görünüm).
 */
export function positionTip(pop: HTMLElement, anchor: Element, o: TipPlaceOpts & { bound?: Element | null } = {}): void {
  const { loc, view } = tipFrame(pop);
  const host = o.bound ? loc(o.bound) : view;
  const p = placeBandTip(loc(anchor), { w: pop.offsetWidth, h: pop.offsetHeight }, host, view, o.gap, o.pad, o.side, o.align);
  pop.style.left = `${Math.round(p.x + host.left)}px`;
  pop.style.top = `${Math.round(p.y + host.top)}px`;
}

/** Etkin eylem denetimi mi (düğme / sekme; pasif değil)? Saf-DOM okuma. Dokunuşta bunların ipucu açılmaz, dokunuş eylemi yapar. */
export function isActionControl(el: HTMLElement): boolean {
  if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return false;
  const role = el.getAttribute('role');
  return el.tagName === 'BUTTON' || role === 'button' || role === 'tab';
}

const hostOf =(target: HTMLElement): HTMLElement => (target.closest('.el-modal, .gr-overlay, .camp-hud') as HTMLElement | null) ?? document.body;

/**
 * `target` için A Band ipucu bağlar. `src` bir spec ya da (her açılışta çağrılan) üretici; üretici null dönerse ipucu açılmaz.
 * Dönen işlev bağı kaldırır. Aynı denetime tekrar bağlanırsa öncekini değiştirir.
 */
export function attachBandTip(target: HTMLElement, src: BandTipSource, o: { host?: HTMLElement; /** Yalnız dokunmada açılır (fare üstüne gelmesi başka bir denetimin ipucuna bırakılır). */ touchOnly?: boolean } = {}): () => void {
  target.removeAttribute('title');
  target.dataset['bt'] = '1';
  let pop: HTMLElement | null = null;
  let pinned = false;
  const spec = (): BandTipSpec | null => (typeof src === 'function' ? src() : src);
  const show = (): void => {
    const s = spec();
    if (!s) return;
    const host = o.host ?? hostOf(target);
    pop ??= document.createElement('div');
    pop.className = 'bt-pop';
    pop.innerHTML = bandTipHtml(s);
    if (pop.parentElement !== host) host.append(pop);
    tipOn(pop);
    positionTip(pop, target, { bound: host });
    // Fare kıpırdamadan denetim gizlenirse (ör. Esc menüsü Valor ölçeğini `hidden` yapar) ipucu asılı kalmasın: açıkken görünürlük yoklanır.
    if (watch === 0) watch = window.setInterval(() => {
      if (!target.isConnected || target.closest('[hidden]') || target.getClientRects().length === 0) hide();
    }, 200);
  };
  let watch = 0;
  const hide = (): void => {
    pinned = false;
    over = false;
    if (watch !== 0) {
      window.clearInterval(watch);
      watch = 0;
    }
    if (pop) tipOff(pop);
  };
  // Pasif düğme fareyi yutar (pointer-events none): o zaman hedef dikdörtgenine bakılır.
  const inside = (e: PointerEvent | MouseEvent): boolean => {
    if (!(target as HTMLButtonElement).disabled) return e.target instanceof Node && target.contains(e.target);
    const r = target.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };
  let over = false;
  let seen = false;
  let off = (): void => undefined;
  // Denetim henüz kapta değilken de bağlanabilsin diye olaylar belgeden dinlenir; denetim kaptan çıkınca bağ kendini kaldırır.
  const alive = (): boolean => {
    if (target.isConnected) {
      seen = true;
      return true;
    }
    if (seen) off();
    return false;
  };
  const onMove = (e: PointerEvent): void => {
    if (o.touchOnly || e.pointerType !== 'mouse' || pinned || !alive()) return;
    const now = inside(e);
    if (now === over) return;
    over = now;
    if (now) show();
    else hide();
  };
  const onClick = (e: MouseEvent): void => {
    const touch = (e as PointerEvent).pointerType ? (e as PointerEvent).pointerType !== 'mouse' : false;
    if (!touch || !alive() || !inside(e)) return;
    // Dokunmada ETKİN düğme / sekme yalnızca çalışır (Ömer 2026-11-03): ipucu açılmaz (içeriği örter, açık kalır). İpucu fareyle üstüne gelince
    // (masaüstü) ya da pasif denetimde ("neden") ve düğme olmayan rozet / bilgi öğelerinde dokununca açılmayı sürdürür.
    if (isActionControl(target)) return;
    if (pinned) hide();
    else {
      show();
      pinned = true;
    }
  };
  const onAway = (e: Event): void => {
    if (pinned && !(e.target instanceof Node && target.contains(e.target))) hide();
  };
  const onFocus = (): void => {
    if (!pinned && target.matches(':focus-visible')) show();
  };
  const onBlur = (): void => {
    if (!pinned) hide();
  };
  document.addEventListener('pointermove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('pointerdown', onAway, true);
  target.addEventListener('focus', onFocus);
  target.addEventListener('blur', onBlur);
  off = () => {
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('pointerdown', onAway, true);
    target.removeEventListener('focus', onFocus);
    target.removeEventListener('blur', onBlur);
    pop?.remove();
    delete target.dataset['bt'];
  };
  return off;
}

/** Pasif denetimin "neden" ipucu: başlık = denetimin adı, tek satır = neden. */
export const reasonSpec = (title: string, why: string): BandTipSpec => ({ title, lines: [{ text: why }] });
