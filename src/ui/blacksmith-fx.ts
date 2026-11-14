/**
 * Demirci eylem animasyonları (Ömer 2026-11-12, Form 7: "Bu işlemlere güzel de bir animasyon ekle"). Yalnız görünüm: kural ve kayıt eylemden
 * ÖNCE değişir, animasyon yeni çizimin üstünde oynar; girişi kilitlemez (hayaletler pointer-events: none), en çok ~1,1 sn.
 *  - Temper: kart kor ışığıyla parlar, madalyondan kıvılcım saçılır, artan sayılar eski değerden yeniye sayarak çıkar.
 *  - Combine: üç plakanın hayaleti sonuç kartına uçup içine erir, yeni item'in kartı kor parlamasıyla belirir.
 *  - Reforge: seçili satırın üstünden ışık geçer, yazı havuzdaki adlar arasında kısa süre döner, yeni değer parlayarak oturur.
 * "Reduced motion" açıkken (motion-pref.ts) hiçbiri oynamaz (yalnız ses). CSS: blacksmith.css > "Eylem animasyonları".
 */
import { offsetIn } from './item-tip';
import { reducedMotion } from './motion-pref';
import { worldSound } from './ui-sound';
import { countUp, once, sparks } from './reward-fx';

/** Kartta önizlemesi görünen güncel sayılar (Temper öncesi okunur: "eski" değerler). */
export function captureTemperNums(side: HTMLElement): string[] {
  return numEls(side).map((e) => e.textContent ?? '');
}

/** Güncel değer düğümleri: satır içi "önce" sayıları + büyük güç / blok sayısının ilk metni (DOM sırası; Temper bu yapıyı değiştirmez). */
function numEls(side: HTMLElement): HTMLElement[] {
  const card = side.querySelector<HTMLElement>('.bsv-cardw .it-card');
  if (!card) return [];
  const out: HTMLElement[] = [];
  const big = card.querySelector<HTMLElement>('.it-big-power strong, .it-big-n strong');
  if (big && big.firstChild?.nodeType === 3) {
    // güç sayısını ayrı bir span'e al (yanındaki "→ 17" kalsın)
    const span = document.createElement('span');
    span.className = 'bsfx-big';
    span.textContent = big.firstChild.textContent ?? '';
    big.replaceChild(span, big.firstChild);
  }
  card.querySelectorAll<HTMLElement>('.bsfx-big, .it-diff-was').forEach((e) => out.push(e));
  return out;
}

/** Temper sonrası (yeni çizim yapılmışken): parlama + kıvılcım + sayaç. */
export function playTemperFx(side: HTMLElement, before: string[]): void {
  worldSound('item_metal');
  if (reducedMotion()) return;
  const wrap = side.querySelector<HTMLElement>('.bsv-cardw');
  if (!wrap) return;
  once(wrap, 'bsfx-temper', 1000);
  const medal = wrap.querySelector<HTMLElement>('.it-medal');
  if (medal) {
    const p = offsetIn(medal, wrap);
    sparks(wrap, p.x + medal.offsetWidth / 2, p.y + medal.offsetHeight / 2);
  }
  const now = numEls(side);
  if (now.length === before.length) now.forEach((e, i) => countUp(e, before[i] ?? '', 650));
}

/** Combine öncesi: dolu plakaların yeri ve kopyası (birleşmede hayalet olarak uçar). */
export interface CombineSnap {
  ghosts: Array<{ node: HTMLElement; x: number; y: number; w: number; h: number }>;
}
export function captureCombine(side: HTMLElement): CombineSnap {
  const ghosts: CombineSnap['ghosts'] = [];
  side.querySelectorAll<HTMLElement>('.bsv-plates .gr-slot.gr-plate:not(.empty)').forEach((p) => {
    const at = offsetIn(p, side);
    const node = p.cloneNode(true) as HTMLElement;
    node.removeAttribute('data-tip');
    ghosts.push({ node, x: at.x, y: at.y, w: p.offsetWidth, h: p.offsetHeight });
  });
  return { ghosts };
}

/** Combine sonrası: hayaletler sonuç kartına uçar, kart belirir. */
export function playCombineFx(side: HTMLElement, snap: CombineSnap): void {
  worldSound('ember_ignite');
  const card = side.querySelector<HTMLElement>('.bsv-reveal');
  window.setTimeout(() => worldSound('loot_reveal'), reducedMotion() ? 0 : 480);
  if (reducedMotion() || !card) return;
  const c = offsetIn(card, side);
  const tx = c.x + card.offsetWidth / 2;
  const ty = c.y + Math.min(card.offsetHeight / 2, 90);
  card.classList.add('bsfx-reveal');
  window.setTimeout(() => card.classList.remove('bsfx-reveal'), 1200);
  snap.ghosts.forEach((g, i) => {
    const n = g.node;
    n.classList.add('bsfx-ghost');
    Object.assign(n.style, { left: `${g.x}px`, top: `${g.y}px`, width: `${g.w}px`, height: `${g.h}px` });
    side.append(n);
    const dx = tx - (g.x + g.w / 2);
    const dy = ty - (g.y + g.h / 2);
    const anim = n.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1, filter: 'brightness(1)' },
        { transform: `translate(${dx * 0.35}px, ${dy * 0.35}px) scale(0.85)`, opacity: 1, filter: 'brightness(1.6)', offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0, filter: 'brightness(2.4)' },
      ],
      { duration: 560, delay: i * 70, easing: 'cubic-bezier(0.55, 0, 0.8, 0.4)', fill: 'both' },
    );
    anim.onfinish = () => n.remove();
    window.setTimeout(() => n.remove(), 1200);
  });
  window.setTimeout(() => {
    if (!card.isConnected) return;
    const m = card.querySelector<HTMLElement>('.it-medal');
    const p = m ? offsetIn(m, card) : { x: card.offsetWidth / 2, y: 40 };
    sparks(card, p.x + (m?.offsetWidth ?? 0) / 2, p.y + (m?.offsetHeight ?? 0) / 2, 18);
  }, 480);
}

/** Reforge sonrası: seçili satırda ışık geçer, yazı havuzdaki adlar arasında döner, yeni değer oturur. */
export function playReforgeFx(side: HTMLElement, pool: string[]): void {
  worldSound('ember_ignite');
  if (reducedMotion()) return;
  const row = side.querySelector<HTMLElement>('.bsv-cardw .it-line.it-picked');
  const text = row?.querySelector<HTMLElement>('.it-text');
  if (!row || !text) return;
  once(row, 'bsfx-reroll', 1100);
  const final = text.textContent ?? '';
  const names = pool.length ? pool : [final];
  let i = 0;
  text.classList.add('bsfx-spin');
  const timer = window.setInterval(() => {
    if (!text.isConnected || i >= 8) {
      window.clearInterval(timer);
      text.textContent = final;
      text.classList.remove('bsfx-spin');
      once(row, 'bsfx-set', 600);
      return;
    }
    text.textContent = names[i % names.length] ?? final;
    i++;
  }, 60);
}
