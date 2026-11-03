// Gerçek denetimlere (düğme, rozet) A Band ipucu bağlar: fare üstüne gelince açılır, dokununca sabitlenir (yeniden dokununca / başka yere dokununca kapanır).
// Tarayıcının yerel `title=` balonunun yerine geçer (telefonda hiç görünmezdi). Pasif düğme fareyi yutar; o durumda olaylar üst kaptan dinlenir
// (band-tip.css: button:disabled[data-bt] pointer-events none). Metin değiştirmez; yalnızca görünümü kurar.
import { bandTipHtml, type BandTipSpec } from './band-tip';
import { tipOff, tipOn } from './tip-vis';

export type BandTipSource = BandTipSpec | (() => BandTipSpec | null);

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * İpucunun denetime göre yerleşimi, `host` kabına göre (x, y). Üstte; sığmazsa altta. Sınır: kap ipucunu içine alacak kadar büyükse kap, değilse
 * görünüm (`view`; ör. köşedeki küçük Gear / Formation kabı). Saf işlev.
 */
export function placeBandTip(anchor: Box, tip: { w: number; h: number }, host: Box, view: Box, gap = 8, pad = 6): { x: number; y: number } {
  const roomy = host.width >= tip.w + pad * 2 && host.height >= tip.h + pad * 2;
  const bd = roomy ? host : view;
  const minX = bd.left + pad;
  const minY = bd.top + pad;
  let x = anchor.left + anchor.width / 2 - tip.w / 2;
  let y = anchor.top - tip.h - gap;
  if (y < minY) y = anchor.top + anchor.height + gap;
  x = Math.max(minX, Math.min(bd.left + bd.width - tip.w - pad, x));
  y = Math.max(minY, Math.min(bd.top + bd.height - tip.h - pad, y));
  return { x: x - host.left, y: y - host.top };
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
export function attachBandTip(target: HTMLElement, src: BandTipSource, o: { host?: HTMLElement } = {}): () => void {
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
    const h = host.getBoundingClientRect();
    const a = target.getBoundingClientRect();
    const view = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const p = placeBandTip(a, { w: pop.offsetWidth, h: pop.offsetHeight }, h, view);
    pop.style.left = `${p.x}px`;
    pop.style.top = `${p.y}px`;
  };
  const hide = (): void => {
    pinned = false;
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
    if (e.pointerType !== 'mouse' || pinned || !alive()) return;
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
