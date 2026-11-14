/**
 * DOM bildirimi (Phaser `elToast` ikizi, Ömer 2026-11-09): üst ortada ince altın çizgili gradyan bant, düz EB Garamond yazı; yeşil / kırmızı dolgu YOK
 * (hata yalnızca küçük elmasın rengiyle ayrılır). Tek örnek; `#ui-root` içinde. Kullananlar: mp-overlay.ts > toast, match-copy.ts > showToast.
 */
import './elegant.css';

let el: HTMLDivElement | null = null;
let timer = 0;

export function showElToast(message: string, o: { bad?: boolean; ms?: number } = {}): void {
  if (typeof document === 'undefined') return;
  if (!el) {
    el = document.createElement('div');
    el.className = 'el-toast';
    el.setAttribute('role', 'status');
    (document.getElementById('ui-root') ?? document.body).appendChild(el);
  }
  el.textContent = message;
  el.classList.toggle('bad', !!o.bad);
  el.classList.add('on');
  window.clearTimeout(timer);
  timer = window.setTimeout(() => el?.classList.remove('on'), o.ms ?? 2800);
}
