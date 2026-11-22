/**
 * Jenerik ekranı (Ömer 2026-11-21 form r38-r39): Harita 3 kapanış sinemasından sonra (CampaignMapScene) ve ana menü > Credits. Tam ekran koyu
 * katman, ortada bir sayfa (oyun adı, sonra her bölüm, sonra kapanış cümlesi); sayfa `pageMs` sonra kendiliğinden ilerler. Dokunma / Space /
 * Enter = sonraki sayfa, X (sağ üst) / Esc = kapat. Son sayfadan sonra kapanır. Metin data/credits.json (taslak). Oyun durumu değişmez.
 */
import './credits.css';
import { CREDITS, creditPages } from './credits-data';
import { mountCloseButton } from './nav-close';
import { lockInput, unlockInput } from './input-lock';
import { reducedMotion } from './motion-pref';

export interface CreditsHandle {
  /** Sessizce kapatır (onDone çağrılmaz). */
  close(): void;
}

const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

export function openCredits(root: HTMLElement, onDone?: () => void): CreditsHandle {
  const pages = creditPages();
  const el = document.createElement('div');
  el.className = `crd${reducedMotion() ? ' still' : ''}`;
  el.innerHTML = '<div class="crd-page"></div><div class="crd-dots"></div>';
  root.append(el);
  lockInput('credits');
  const page = el.querySelector<HTMLElement>('.crd-page')!;
  const dots = el.querySelector<HTMLElement>('.crd-dots')!;
  let at = -1;
  let timer = 0;
  let closed = false;
  const show = (i: number): void => {
    at = i;
    const p = pages[i]!;
    page.className = `crd-page ${p.kind}`;
    page.innerHTML = `${p.heading ? `<h2 class="crd-h">${esc(p.heading)}</h2><i class="crd-rule"></i>` : ''}${p.lines.map((l) => `<p class="crd-l">${esc(l)}</p>`).join('')}`;
    // sayfa değişimi: yumuşak belirme (azaltılmış harekette yok)
    page.classList.remove('in');
    void page.offsetWidth;
    page.classList.add('in');
    dots.innerHTML = pages.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    window.clearTimeout(timer);
    timer = window.setTimeout(next, Math.max(1500, CREDITS.pageMs || 5000));
  };
  function next(): void {
    if (closed) return;
    if (at + 1 >= pages.length) return finish();
    show(at + 1);
  }
  const cleanup = (): void => {
    if (closed) return;
    closed = true;
    window.clearTimeout(timer);
    unmountClose();
    window.removeEventListener('keydown', onKey, true);
    el.remove();
    unlockInput('credits');
  };
  function finish(): void {
    cleanup();
    onDone?.();
  }
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      next();
    }
  };
  el.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.nav-btn')) return;
    next();
  });
  window.addEventListener('keydown', onKey, true);
  const unmountClose = mountCloseButton(el, finish, 'Close');
  show(0);
  return { close: cleanup };
}
