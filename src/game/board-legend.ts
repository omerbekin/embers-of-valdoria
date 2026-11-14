/**
 * Quick Battle / Multiplayer takım kurulumunda her tahtanın ALTINDAKİ renk açıklaması (Ömer 2026-11-10): yalnızca tahtanın bir hücresinin üstüne
 * gelince ya da bir kahraman sürüklenirken görünür; başka zaman gizli (kısa solma, data/ui-motion.json > tooltip). Görünüm: src/ui/spot-legend.ts.
 */
import { spotLegendHtml } from '../ui/spot-legend';
import { worldToCss, type SceneBoard } from './scene-board';

export interface BoardLegend {
  /** Konumu yenile (sahne yeniden yerleşince). */
  place: () => void;
  /** Kahraman sürükleniyor mu (kadro rafından ya da tahtadan). */
  setDrag: (on: boolean) => void;
  destroy: () => void;
}

/** `at()` = açıklamanın sol üst köşesi (dünya px, tahtanın hemen altı); `width` = tahta genişliği. */
export function mountBoardLegend(sb: SceneBoard, at: () => { x: number; y: number }, width: number, mirror: boolean): BoardLegend {
  const el = document.createElement('div');
  el.className = 'spot-lg-abs';
  el.innerHTML = spotLegendHtml(mirror);
  (document.getElementById('ui-root') ?? document.body).append(el);
  let hover = false;
  let drag = false;
  const paint = (): void => {
    el.classList.toggle('on', hover || drag);
  };
  const place = (): void => {
    const p = at();
    const c = worldToCss(p.x, p.y);
    el.style.left = `${c.left}px`;
    el.style.top = `${c.top}px`;
    el.style.width = `${width}px`;
    el.style.transform = `scale(${c.gu})`;
  };
  const root = sb.board.el;
  const over = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    const on = !!(e.target as HTMLElement).closest('.fb-cell');
    if (on !== hover) {
      hover = on;
      paint();
    }
  };
  const out = (): void => {
    hover = false;
    paint();
  };
  root.addEventListener('pointermove', over);
  root.addEventListener('pointerleave', out);
  place();
  return {
    place,
    setDrag: (on) => {
      drag = on;
      paint();
    },
    destroy: () => {
      root.removeEventListener('pointermove', over);
      root.removeEventListener('pointerleave', out);
      el.remove();
    },
  };
}
