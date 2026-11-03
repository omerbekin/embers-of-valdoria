import './phone-buttons.css';

/**
 * Telefonda (html.short) çerçeveli düğmeler 30 px görünür (phone-buttons.css); dokunma alanı yine >= 44 px kalmalı.
 * Çerçeve çizimine dokunmadan (::before/::after elmaslarla dolu) bunu tek yerden çözer: boş yere (düğme dışı) yapılan bir tıklama,
 * en çok 44 px'e genişletilmiş bir düğme kutusunun içine düşüyorsa o düğmeye yönlendirilir. Üstte başka bir öğe varsa (pencere, ipucu) yönlendirmez.
 */
export const PHONE_HIT_PX = 44;
const SEL = '.el-btn,.gr-btn,.gr-chip,.bb-trigger,.ct-b,.bs-tab,.gr-tab';

/** Saf: kutuyu her iki yönde en az `min` px olacak şekilde ortadan büyütür. */
export function growBox(r: { left: number; top: number; width: number; height: number }, min = PHONE_HIT_PX) {
  const gx = Math.max(0, (min - r.width) / 2);
  const gy = Math.max(0, (min - r.height) / 2);
  return { left: r.left - gx, top: r.top - gy, right: r.left + r.width + gx, bottom: r.top + r.height + gy };
}

/** (x, y) noktasına en yakın (genişletilmiş kutusu noktayı içeren) görünür, etkin düğme; yoksa null. */
export function nearestSlopButton(x: number, y: number, root: ParentNode = document): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestD = Infinity;
  root.querySelectorAll<HTMLElement>(SEL).forEach((b) => {
    if ((b as HTMLButtonElement).disabled || b.getAttribute('aria-disabled') === 'true') return;
    const r = b.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const g = growBox(r);
    if (x < g.left || x > g.right || y < g.top || y > g.bottom) return;
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    if (d >= bestD) return;
    // yalnızca gerçekten en üstte duran (başka öğe tarafından örtülmeyen) düğme
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!top || !(top === b || b.contains(top))) return;
    best = b;
    bestD = d;
  });
  return best;
}

let installed = false;
let redirecting = false;

export function installPhoneButtons(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'click',
    (ev) => {
      if (redirecting || !ev.isTrusted || ev.detail === 0) return; // klavye / betik tıklaması değil, gerçek dokunuş
      if (!document.documentElement.classList.contains('short')) return;
      const t = ev.target as Element | null;
      if (t?.closest?.(SEL)) return;
      const b = nearestSlopButton(ev.clientX, ev.clientY);
      if (!b) return;
      ev.stopImmediatePropagation();
      ev.preventDefault();
      redirecting = true;
      try {
        b.click();
      } finally {
        redirecting = false;
      }
    },
    true,
  );
}
