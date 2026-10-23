/**
 * Pencerenin sağ üst X kapatma düğmesi (Ömer 2026-10-18, ortak envanter v3): X, Menu düğmesinin YERİNE geçer; pencere açıkken Menu gizlenir,
 * kapanınca geri gelir. Tam ekran düğmesi yerinde kalır (X ile arasında ayraç yok). Ölçü ve simge Back / Menu / tam ekranla aynı
 * (src/ui/nav-icons.ts > NAV_BTN, navSvg('close'); CSS style.css > html.close-btn-on). İç içe pencerelerde sayaçla çalışır.
 * Her X'li pencere bunu kullanır (ayrı konum yazılmaz).
 */
import { navSvg, type NavIcon } from './nav-icons';

let open = 0;

/**
 * Hayalet dokunuş koruması (Ömer 2026-10-19): X kalkınca Menu / tam ekran düğmesi aynı köşeye kayar; kapanışı başlatan dokunuşun
 * click'i ona düşmesin diye kısa süre `.nav-btn` tıklamaları yutulur (yalnızca gerçek kullanıcı girdisi).
 */
function swallowGhostClick(ms = 450): void {
  const stop = (e: Event): void => {
    if (e.isTrusted && e.target instanceof Element && e.target.closest('.nav-btn')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };
  window.addEventListener('click', stop, true);
  setTimeout(() => window.removeEventListener('click', stop, true), ms);
}
const sync = (): void => {
  document.documentElement.classList.toggle('close-btn-on', open > 0);
};

/**
 * X düğmesini `host` içine ekler; dönen işlev düğmeyi kaldırır (Menu geri gelir). Esc'i pencere kendisi yönetir. `icon`: aynı yerde başka
 * yazısız ikon (ör. sinematiğin Skip'i: 'skip').
 */
export function mountCloseButton(host: HTMLElement, onClose: () => void, label = 'Close', icon: NavIcon = 'close'): () => void {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nav-btn settings-toggle close-toggle';
  b.innerHTML = navSvg(icon);
  b.title = label;
  b.setAttribute('aria-label', label);
  b.addEventListener('click', () => onClose());
  host.append(b);
  open++;
  sync();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    b.remove();
    swallowGhostClick();
    open = Math.max(0, open - 1);
    sync();
  };
}
