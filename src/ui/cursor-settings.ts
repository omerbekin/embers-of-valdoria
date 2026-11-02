import {
  CURSOR_CHOICES,
  CURSOR_SIZES,
  cursorArt,
  cursorPrefs,
  detectCursorUiMode,
  onCursorPrefsChange,
  setCursorPrefs,
  stepCursorSize,
  type CursorId,
  type CursorState,
  type CursorUiMode,
} from './cursor-theme';
import { uiSound } from './ui-sound';
import './cursor-settings.css';

/**
 * Settings > UI sayfası (Ömer 2026-11-02): imleç seçimi (plakalar), boyut (− değer +) ve canlı önizleme. Oyun içi DOM Settings (src/ui/settings.ts)
 * ve ana menü Settings sütunu (MainMenuScene, DOM kutusu) AYNI parçayı kullanır. Dokunmatik cihazda imleç yoktur: yalnızca tek satır bilgi ve
 * üç durumun sabit önizlemesi (seçenek / boyut yok). Önizleme: gerçek boyutta koyu + açık şerit, büyütülmüş üç durum, ve fare altında GERÇEK
 * imleci gösteren üç alan (Pointer / Clickable / Disabled).
 */
const STATES: ReadonlyArray<{ s: CursorState; label: string }> = [
  { s: 'def', label: 'Pointer' },
  { s: 'hov', label: 'Clickable' },
  { s: 'press', label: 'Pressed' },
  { s: 'dis', label: 'Disabled' },
];
export const PRESS_HINT = 'Hold the mouse button to see the pressed picture.';
export const TOUCH_LINE = 'Cursor options apply to mouse only. Touch screens have no cursor.';

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

let uidN = 0;
const art = (id: CursorId, s: CursorState, scale: number): string => cursorArt(id, s, scale, `p${uidN++}`).svg;

export function mountCursorPanel(host: HTMLElement, mode: CursorUiMode = detectCursorUiMode()): { destroy(): void } {
  const root = h('div', 'cur-panel');
  host.append(root);
  const touch = mode === 'touch';
  const plateBtns = new Map<CursorId, HTMLButtonElement>();
  const dyn = h('div', 'cur-dyn'); // seçime / boyuta göre yeniden çizilen kısım
  const sizeVal = h('span', 'cur-size-val');
  const minus = h('button', 'cur-step', '−');
  const plus = h('button', 'cur-step', '+');
  const pressBtn = h('button', 'cur-toggle-btn');

  if (touch) root.append(h('div', 'cur-line', TOUCH_LINE));
  else {
    root.append(h('div', 'cur-sec', 'Cursor'));
    const plates = h('div', 'cur-plates');
    plates.setAttribute('role', 'radiogroup');
    plates.setAttribute('aria-label', 'Cursor');
    for (const c of CURSOR_CHOICES) {
      const b = h('button', 'cur-plate');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.innerHTML = `<span class="cur-plate-art">${art(c.id, 'def', 1.5)}</span>`;
      b.append(h('span', 'cur-plate-name', c.name));
      b.addEventListener('click', () => {
        if (cursorPrefs().id !== c.id) uiSound('select');
        setCursorPrefs({ id: c.id });
      });
      plates.append(b);
      plateBtns.set(c.id, b);
    }
    // Ok tuşları plakalar arasında gezer (yatay)
    plates.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const i = CURSOR_CHOICES.findIndex((c) => c.id === cursorPrefs().id);
      const n = CURSOR_CHOICES[(i + d + CURSOR_CHOICES.length) % CURSOR_CHOICES.length]!;
      setCursorPrefs({ id: n.id });
      plateBtns.get(n.id)?.focus();
    });
    root.append(plates);

    root.append(h('div', 'cur-sec', 'Size'));
    const size = h('div', 'cur-size');
    minus.type = plus.type = 'button';
    minus.setAttribute('aria-label', 'Smaller cursor');
    plus.setAttribute('aria-label', 'Bigger cursor');
    minus.addEventListener('click', () => {
      uiSound('select');
      setCursorPrefs({ size: stepCursorSize(cursorPrefs().size, -1) });
    });
    plus.addEventListener('click', () => {
      uiSound('select');
      setCursorPrefs({ size: stepCursorSize(cursorPrefs().size, 1) });
    });
    size.append(minus, sizeVal, plus);
    root.append(size);

    // Press change: fare düğmesi basılıyken basılı resim (varsayılan On)
    const row = h('div', 'cur-toggle');
    row.append(h('span', 'cur-toggle-name', 'Press change'));
    pressBtn.type = 'button';
    pressBtn.setAttribute('role', 'switch');
    pressBtn.setAttribute('aria-label', 'Press change');
    pressBtn.addEventListener('click', () => {
      uiSound('select');
      setCursorPrefs({ press: !cursorPrefs().press });
    });
    row.append(pressBtn);
    root.append(row);
  }
  root.append(dyn);

  const paint = (): void => {
    const p = cursorPrefs();
    for (const [id, b] of plateBtns) {
      b.classList.toggle('on', id === p.id);
      b.setAttribute('aria-checked', String(id === p.id));
    }
    sizeVal.textContent = `${p.size}%`;
    pressBtn.textContent = p.press ? 'On' : 'Off';
    pressBtn.setAttribute('aria-checked', String(p.press));
    minus.disabled = p.size <= CURSOR_SIZES[0]!;
    plus.disabled = p.size >= CURSOR_SIZES[CURSOR_SIZES.length - 1]!;
    const scale = p.size / 100;
    dyn.textContent = '';
    if (!touch) {
      dyn.append(h('div', 'cur-sec', 'Preview'));
      const strips = h('div', 'cur-strips');
      for (const tone of ['dk', 'br']) {
        const strip = h('div', `cur-strip ${tone}`);
        for (const st of STATES) {
          const chip = h('div', `cur-chip${st.s === 'press' && !p.press ? ' off' : ''}`);
          chip.innerHTML = `<span class="cur-chip-art">${art(p.id, st.s, scale)}</span>`;
          chip.append(h('span', 'cur-chip-name', st.label));
          strip.append(chip);
        }
        strips.append(strip);
      }
      dyn.append(strips);
    }
    dyn.append(h('div', 'cur-sec', touch ? 'States' : 'Magnified'));
    const big = h('div', 'cur-big');
    for (const st of STATES) {
      const tile = h('div', `cur-tile${st.s === 'press' && !p.press && !touch ? ' off' : ''}`);
      tile.innerHTML = `<span class="cur-tile-art">${art(p.id, st.s, 2.2)}</span>`;
      tile.append(h('span', 'cur-chip-name', st.label));
      big.append(tile);
    }
    dyn.append(big);
    if (!touch) {
      dyn.append(h('div', 'cur-sec', 'Try it'));
      const zones = h('div', 'cur-try');
      for (const st of STATES.filter((x) => x.s !== 'press')) {
        const z = h('div', `cur-z ${st.s}`);
        z.append(h('span', 'cur-z-name', st.label));
        if (st.s === 'dis') z.setAttribute('aria-disabled', 'true');
        zones.append(z);
      }
      dyn.append(zones, h('div', 'cur-line', p.id === 'system' ? 'Your system cursor shows here.' : p.press ? `Move the mouse over each area. ${PRESS_HINT}` : 'Move the mouse over each area.'));
    }
  };
  paint();
  const off = onCursorPrefsChange(paint);
  return {
    destroy: () => {
      off();
      root.remove();
    },
  };
}
