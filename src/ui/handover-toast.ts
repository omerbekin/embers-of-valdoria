/**
 * "Left for the Company" alt kartı (Ömer 2026-10-18, mockup left-gear v3 "Toast"): ayrılan kahramanların üst üste portreleri, bıraktıkları
 * item'ler torba hücresi olarak (nadirlik çerçevesi; üstüne gelince / uzun basınca item ipucu), birincil "Equip now" (ortak Gear'ı açar).
 * Kasaba görünür kalır. Kapanış: sağ üst X (Menu'nün yerinde, nav-close.ts), Esc ya da 10 sn sonra solarak (hepsi "Later" = onay; item'ler zaten torbada).
 * Karta fareyle / dokunarak girince sayaç durur (okurken kaybolmasın), çıkınca kalan süreyle sürer. Oyun içi metinler İngilizce.
 */
import './gear.css';
import './handover-toast.css';
import { itemDef, type ItemInstance } from '../progression';
import { lockInput, unlockInput } from './input-lock';
import { closeDom } from './motion';
import { mountCloseButton } from './nav-close';
import { avatarUrl, className } from './character-panel';
import { itemCell } from './inventory';
import { tipOn, tipOff } from './tip-vis';
import { itemTipNodes, offsetIn } from './item-tip';
import { iconUrl } from './dom-icons';
import { uiIconName, hasUiImage } from './ui-icons';

/** Kartın ekranda kalma süresi (ms) ve solma süresi. */
export const HANDOVER_TOAST_MS = 10_000;
const FADE_MS = 700;
const LONG_PRESS_MS = 380;

export interface HandoverToastData {
  /** Ayrılan kahramanların sınıfları (portre + ad). */
  classes: string[];
  items: ItemInstance[];
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function showHandoverToast(root: HTMLElement, data: HandoverToastData, on: { equip: () => void; later: () => void }): () => void {
  const overlay = el('div', 'gr-overlay ho-ov el-modal');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Left for the Company');
  const panel = el('div', 'gr-panel gr-mini el-modal-panel');
  overlay.append(panel);

  const mid = el('div', 'ho-mid');
  mid.append(el('div', 'gr-title', 'Left for the Company'));
  const hand = el('div', 'gr-mini-sub ho-hand');
  const faces = el('div', 'ho-faces');
  for (const c of data.classes) {
    const f = el('div', 'ho-face');
    f.title = className(c);
    const u = avatarUrl(c);
    if (u) f.style.backgroundImage = `url('${u}')`;
    faces.append(f);
  }
  const names = data.classes.map((c) => className(c)).join(', ');
  hand.append(faces, el('span', '', names ? `${names} leave${data.classes.length > 1 ? '' : 's'} their gear for you` : 'Their gear is in your bag'));
  mid.append(hand);

  const cells = el('div', 'ho-cells');
  const tip = el('div', 'el-tip item-tip');
  tip.setAttribute('role', 'tooltip');
  for (const inst of data.items) {
    if (!itemDef(inst.id)) continue;
    const c = itemCell(inst);
    c.classList.add('ho-cell');
    c.dataset['uid'] = inst.uid;
    cells.append(c);
  }

  const foot = el('div', 'gr-foot');
  const equip = el('button', 'gr-btn primary');
  equip.type = 'button';
  equip.title = 'Opens Gear';
  if (hasUiImage('gear')) {
    const i = el('img', 'ho-gear-ico');
    i.src = iconUrl(uiIconName('gear'));
    i.alt = '';
    equip.append(i);
  }
  equip.append('Equip now');
  foot.append(equip);
  panel.append(mid, cells, foot);
  overlay.append(tip);
  root.append(overlay);

  lockInput('handover-toast');
  let done = false;
  let timer = 0;
  let left = HANDOVER_TOAST_MS;
  let startedAt = 0;
  let unmountX: () => void = () => {};
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    finish(on.later, false);
  };
  const finish = (act: () => void, fade: boolean): void => {
    if (done) return;
    done = true;
    window.removeEventListener('keydown', onKey, true);
    window.clearTimeout(timer);
    unmountX();
    unlockInput('handover-toast');
    if (fade) {
      overlay.classList.add('ho-fade');
      window.setTimeout(() => overlay.remove(), FADE_MS);
    } else closeDom(overlay, () => overlay.remove());
    act();
  };
  const arm = (): void => {
    window.clearTimeout(timer);
    startedAt = performance.now();
    timer = window.setTimeout(() => finish(on.later, true), left);
  };
  const pause = (): void => {
    if (done || !timer) return;
    window.clearTimeout(timer);
    timer = 0;
    left = Math.max(1500, left - (performance.now() - startedAt));
  };
  const resume = (): void => {
    if (!done && !timer) arm();
  };
  window.addEventListener('keydown', onKey, true);
  unmountX = mountCloseButton(overlay, () => finish(on.later, false), 'Close (Later)');
  equip.addEventListener('click', () => finish(on.equip, false));

  // sayaç: karta girince durur, çıkınca kalan süreyle sürer (dokunmatikte dokunuş bırakılınca en az 6 sn daha)
  panel.addEventListener('pointerenter', pause);
  panel.addEventListener('pointerleave', resume);
  panel.addEventListener('pointerdown', () => {
    pause();
    left = Math.max(left, 6000);
  });
  panel.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse') resume();
  });

  // item ipucu: fare üstüne gelince, dokunmatikte uzun basınca
  const showTip = (cell: HTMLElement): void => {
    const inst = data.items.find((i) => i.uid === cell.dataset['uid']);
    if (!inst) return;
    tip.replaceChildren(...itemTipNodes(inst));
    tipOn(tip);
    const p = offsetIn(cell, overlay);
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const x = Math.min(Math.max(6, p.x + cell.offsetWidth / 2 - w / 2), Math.max(6, overlay.clientWidth - w - 6));
    tip.style.left = `${x}px`;
    tip.style.top = `${Math.max(6, p.y - h - 10)}px`;
  };
  const hideTip = (): void => tipOff(tip);
  let press = 0;
  for (const c of Array.from(cells.children) as HTMLElement[]) {
    c.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') showTip(c);
    });
    c.addEventListener('pointerleave', () => {
      hideTip();
      window.clearTimeout(press);
    });
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      window.clearTimeout(press);
      press = window.setTimeout(() => showTip(c), LONG_PRESS_MS);
    });
    c.addEventListener('pointerup', () => {
      window.clearTimeout(press);
      window.setTimeout(hideTip, 1600);
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  arm();
  return () => finish(() => {}, false);
}
