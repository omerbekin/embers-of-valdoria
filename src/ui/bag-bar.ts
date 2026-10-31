/**
 * Çanta çubuğu (Ömer 2026-10-31, taslak gear-bag-sheet A3): çantanın göründüğü TÜM Gear bölümlerinde (Hero, tüccar, demirci, ganimet, ödül torbası,
 * Endless kamp) torba başlığındaki üç düğme TEK yerde: [All items / Usable by X] [Equip best v] [filtre ikonu].
 * Equip best anlamlı değilse (`best` verilmez: ganimet / ödül torbası) o düğme yok. Item türü filtresi bir kayıt verisi değildir: ekran açıkken
 * ekranın elinde durur (kayıt şemasına dokunmaz). Türler gerçek yuva verisinden türer (`ITEMS.slots`).
 */
import './bag-bar.css';
import { ITEMS, itemDef } from '../progression';

export interface BagKind {
  id: string;
  name: string;
}
/** Çantada süzülebilen item türleri = yuvalar (veriden; elle liste yok). */
export const bagKinds = (): BagKind[] => ITEMS.slots.map((s) => ({ id: s.id, name: s.name }));

/** Kapalı türdeki item'leri çıkarır (saf). */
export function visibleByKind<T extends { id: string }>(items: readonly T[], hidden: ReadonlySet<string>): T[] {
  if (!hidden.size) return [...items];
  return items.filter((i) => {
    const d = itemDef(i.id);
    return !d || !hidden.has(d.slot);
  });
}

export type BagMenu = 'best' | 'kinds' | null;

export interface BagBarOpts {
  /** "All items / Usable by X" düğmesi (bugünkü işlev). */
  filter?: { on: boolean; label: string; toggle: () => void };
  /** Equip best menüsü; yoksa düğme yok. `hero` yoksa (kahraman seçili değil) yalnızca Whole company. */
  best?: { hero?: { label: string; off?: boolean; title?: string; run: () => void }; all: { title?: string; run: () => void }; label: string };
  hidden: ReadonlySet<string>;
  toggleKind: (id: string) => void;
  open: BagMenu;
  setOpen: (m: BagMenu) => void;
}

const SVG = 'http://www.w3.org/2000/svg';
function svg(path: string, cls: string): SVGElement {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', cls);
  const p = document.createElementNS(SVG, 'path');
  p.setAttribute('d', path);
  s.append(p);
  return s;
}
/** Süzgeç (huni) ve aşağı ok: mevcut ikon setinde yoktu, basit çizgi SVG. */
const FUNNEL = 'M3 5h18l-7 8.5V20l-4-2v-4.5z';
const CARET = 'M6 9l6 6 6-6';

/**
 * Menüyü Gear örtüsünün (`.gr-overlay`) içine, düğmesinin altına (sığmazsa üstüne) ve örtüye sığacak biçimde yerleştirir. Menü torba sayfasının
 * İÇİNDE kalsaydı dar çift pencerelerde (tüccar / ganimet yanındaki torba sayfası) sayfanın kaydırma kabı onu keserdi. Yerleşim bağlandıktan
 * sonraki karede yapılır; eski menüler her çizimde `clearBagMenus` ile temizlenir.
 */
export function clearBagMenus(overlay: HTMLElement): void {
  overlay.querySelectorAll(':scope > .bb-menu').forEach((m) => m.remove());
}
function place(menu: HTMLElement, trigger: HTMLElement): void {
  requestAnimationFrame(() => {
    const overlay = trigger.closest<HTMLElement>('.gr-overlay');
    if (!overlay || !trigger.isConnected) return;
    clearBagMenus(overlay);
    overlay.append(menu);
    const o = overlay.getBoundingClientRect();
    const k = o.width ? overlay.clientWidth / o.width : 1;
    const r = trigger.getBoundingClientRect();
    const W = overlay.clientWidth;
    const H = overlay.clientHeight;
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    const left = Math.max(6, Math.min(W - mw - 6, (r.right - o.left) * k - mw));
    let top = (r.bottom - o.top) * k + 6;
    if (top + mh > H - 6) top = (r.top - o.top) * k - mh - 6 >= 6 ? (r.top - o.top) * k - mh - 6 : Math.max(6, H - mh - 6);
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.style.visibility = 'visible';
  });
}

function btn(cls: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  if (text) b.textContent = text;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

/** Torba başlığına konacak düğmeler (soldan sağa). */
export function bagBarEls(o: BagBarOpts): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (o.filter) {
    const f = o.filter;
    out.push(btn(`gr-chip${f.on ? ' on' : ''}`, f.label, f.toggle));
  }
  if (o.best) {
    const b = o.best;
    const wrap = document.createElement('div');
    wrap.className = 'bb-wrap';
    const t = btn(`gr-chip bb-trigger${o.open === 'best' ? ' open' : ''}`, b.label, () => o.setOpen(o.open === 'best' ? null : 'best'));
    t.append(svg(CARET, 'bb-caret'));
    t.dataset['tut'] = 'best'; // mentor dersi vurgusu (data/tutorial.json > gear)
    t.setAttribute('aria-haspopup', 'menu');
    t.setAttribute('aria-expanded', String(o.open === 'best'));
    t.title = 'Equip the best items';
    wrap.append(t);
    if (o.open === 'best') {
      const m = document.createElement('div');
      m.className = 'bb-menu';
      m.setAttribute('role', 'menu');
      const items: Array<{ label: string; title?: string; off?: boolean; run: () => void }> = [];
      if (b.hero) items.push(b.hero);
      items.push({ label: 'Whole company', ...(b.all.title ? { title: b.all.title } : {}), run: b.all.run });
      for (const it of items) {
        const r = btn(`bb-item${it.off ? ' off' : ''}`, it.label, () => {
          o.setOpen(null);
          it.run();
        });
        r.setAttribute('role', 'menuitem');
        if (it.title) r.title = it.title;
        m.append(r);
      }
      wrap.append(m);
      place(m, t);
    }
    out.push(wrap);
  }
  const wrap = document.createElement('div');
  wrap.className = 'bb-wrap';
  const active = o.hidden.size > 0;
  const k = btn(`gr-chip bb-ico bb-trigger${active ? ' on' : ''}${o.open === 'kinds' ? ' open' : ''}`, '', () => o.setOpen(o.open === 'kinds' ? null : 'kinds'));
  k.append(svg(FUNNEL, 'bb-funnel'));
  if (active) k.append(Object.assign(document.createElement('i'), { className: 'bb-dot' }));
  k.setAttribute('aria-label', active ? 'Item type filter (active)' : 'Item type filter');
  k.setAttribute('aria-haspopup', 'menu');
  k.setAttribute('aria-expanded', String(o.open === 'kinds'));
  k.title = 'Show item types';
  wrap.append(k);
  if (o.open === 'kinds') {
    const m = document.createElement('div');
    m.className = 'bb-menu bb-kinds';
    m.setAttribute('role', 'menu');
    for (const kind of bagKinds()) {
      const shown = !o.hidden.has(kind.id);
      const r = btn(`bb-item bb-kind${shown ? ' on' : ''}`, '', () => o.toggleKind(kind.id));
      r.setAttribute('role', 'menuitemcheckbox');
      r.setAttribute('aria-checked', String(shown));
      r.dataset['kind'] = kind.id;
      const box = document.createElement('i');
      box.className = 'bb-box';
      r.append(box, document.createTextNode(kind.name));
      m.append(r);
    }
    wrap.append(m);
    place(m, k);
  }
  out.push(wrap);
  return out;
}

/** Menü açıkken menünün ve düğmesinin DIŞINA dokunmak menüyü kapatır (dokunma altındaki öğeye de geçer). */
export function installBagMenuDismiss(overlay: HTMLElement, isOpen: () => boolean, close: () => void): void {
  overlay.addEventListener(
    'pointerdown',
    (e) => {
      if (!isOpen()) return;
      const t = e.target as Element | null;
      if (t?.closest('.bb-menu, .bb-trigger')) return;
      close();
    },
    true,
  );
}
