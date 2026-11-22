/**
 * Ortak alttan uyarı barı (bottom-warn.css): `host` konumlu bir panel olmalı; bar panelin altında belirir, süre sonunda söner. Host başına tek bar.
 * Kullanan: gear-screen.ts (Blacksmith kendi `.bs-warn` düğümünü aynı CSS ile kullanır).
 */
import './bottom-warn.css';

const timers = new WeakMap<HTMLElement, number>();

export function showBottomWarn(host: HTMLElement, text: string, o: { ok?: boolean; ms?: number } = {}): void {
  let bar = host.querySelector<HTMLElement>(':scope > .ui-warn');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'ui-warn';
    bar.setAttribute('role', 'status');
    host.append(bar);
  }
  bar.textContent = text;
  bar.classList.toggle('ok', !!o.ok);
  bar.classList.remove('on');
  void bar.offsetWidth;
  bar.classList.add('on');
  window.clearTimeout(timers.get(bar));
  const b = bar;
  timers.set(bar, window.setTimeout(() => b.classList.remove('on'), o.ms ?? 2600));
}
