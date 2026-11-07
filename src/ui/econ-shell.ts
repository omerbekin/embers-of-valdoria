/**
 * Ekonomi ekranlarının ortak kabuğu (Inn, kamp; Ömer 2026-10-26, taslak public/mockups/economy-ui.html A varyantları): Gear ile aynı örtü + panel
 * (gear.css .gr-overlay / .gr-panel), başlık satırı, Esc / X / zemin ile kapanma (isteğe bağlı), item plakası üstünde A Band-sonrası item ipucu
 * (src/ui/item-tip.ts v3, fare üstüne gelince; dokunmatikte plakaya dokununca sabitlenir). Kural burada yok: ekranlar kendi içeriğini çizer.
 */
import './gear.css';
import './gear-plates.css';
import './econ.css';
import { closeDom } from './motion';
import { lockInput, unlockInput } from './input-lock';
import { dismissOnBackdrop } from './backdrop';
import { mountCloseButton } from './nav-close';
import { uiSound } from './ui-sound';
import { hasUiImage, uiIconName } from './ui-icons';
import { iconUrl } from './dom-icons';
import { ItemTip } from './item-tip';
import { avatarUrl } from './character-panel';
import { bandTipHtml } from './band-tip';
import { attachBandTip, reasonSpec } from './band-tip-attach';
import { tipOn as fadeIn, tipOff as fadeOut } from './tip-vis';
import { woundBandSpec } from './wound-ui';
import { woundRules } from '../campaign';

export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Kit düğmesi (gear.css .gr-btn). `why` doluysa düğme pasif ve neden hem ipucunda hem erişilebilir adda. */
export function button(cls: string, text: string, run: () => void, why?: string | null): HTMLButtonElement {
  const b = el('button', `gr-btn ${cls}`.trim(), text);
  b.type = 'button';
  if (why) {
    b.disabled = true;
    attachBandTip(b, reasonSpec(text, why));
    b.setAttribute('aria-description', why);
  }
  b.addEventListener('click', () => {
    if (!b.disabled) run();
  });
  return b;
}

/** Boyalı altın ikonu (yoksa null). */
export function goldImg(cls = 'gr-price-ico'): HTMLImageElement | null {
  if (!hasUiImage('gold')) return null;
  const i = el('img', cls);
  i.src = iconUrl(uiIconName('gold'));
  i.alt = '';
  i.draggable = false;
  return i;
}

/** Kahraman yüzü (kare portre; yoksa boş çerçeve). */
export function heroFace(classId: string, cls = 'ec-face'): HTMLElement {
  const f = el('div', cls);
  const url = avatarUrl(classId);
  if (url) f.style.backgroundImage = `url(${url})`;
  return f;
}

/** Can çubuğu: `now` dolgu, `ghost` (varsa) bir sonraki adımdaki yeşil iz; yarım/az canda kırmızı. */
export function hpBar(now: number, ghost?: number): HTMLElement {
  const bar = el('div', `ec-hp${now < 0.4 ? ' low' : ''}`);
  if (ghost !== undefined && ghost > now) {
    // Yalnız iyileşecek dilim (şimdiki candan yarınki cana); üstünde ışık süzülür (econ.css .ec-hp i.ghost)
    const g = el('i', 'ghost');
    const n0 = Math.max(0, Math.min(1, now));
    g.style.left = `${Math.round(n0 * 100)}%`;
    g.style.width = `${Math.round((Math.min(1, ghost) - n0) * 100)}%`;
    bar.append(g);
  }
  const f = el('i');
  f.style.width = `${Math.round(Math.max(0, Math.min(1, now)) * 100)}%`;
  bar.append(f);
  return bar;
}

export interface Shell {
  overlay: HTMLElement;
  panel: HTMLElement;
  /** Üstteki başlık ve altındaki gövde için yer; çağıran doldurur. */
  head: HTMLElement;
  body: HTMLElement;
  /** Plakaya ipucu bağlar: `nodes()` item ipucu düğümlerini verir (boş = ipucu yok). */
  /** `touchPin: false` = dokunmatikte ipucu sabitlenmez (ekranda zaten ayrıntı paneli var; ör. kamp Sharpen). */
  tipOn(target: HTMLElement, key: string, nodes: () => HTMLElement[], opts?: { touchPin?: boolean }): void;
  /** Yara noktalarına A Band yara ipucu bağlar (yara sayısı + etkisi; mevcut yara metinlerinden). Yarasızsa bağlamaz. */
  woundTip(target: HTMLElement, wounds: number): void;
  close(): void;
  /** Kapatma durumu değişti (kamp seçilince X belirir): X düğmesini yeniden eşler. */
  syncClose: () => void;
}

/**
 * Kabuğu `root`'a kurar. `closable()` her kapatma denemesinde sorulur (kamp seçimi yapılmadıkça kapanmaz). Esc kendi başına kapatır ya da yutar.
 * `onClosed` kapanma bitince bir kez çağrılır.
 */
export function openShell(root: HTMLElement, o: { label: string; title: string; sub?: string; lock: string; closable: () => boolean; onClosed: () => void; wide?: boolean; /** Telefonda (html.short) pencere tüm sahneyi kaplar: içerik kısa ekrana sığmıyorsa ortak seçenek (Inn, Camp; econ.css > .ec-pfull). */ phoneFull?: boolean }): Shell {
  const overlay = el('div', `gr-overlay el-modal ec-ov${o.phoneFull ? ' ec-pfull' : ''}`);
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', o.label);
  const panel = el('div', `gr-panel el-modal-panel ec-panel${o.wide ? ' wide' : ''}${o.phoneFull ? ' ec-pfull' : ''}`);
  const head = el('div', 'gr-head ec-head');
  head.append(el('div', 'gr-title', o.title));
  if (o.sub) head.append(el('span', 'ec-sub', o.sub));
  const body = el('div', 'ec-body');
  panel.append(head, body);
  overlay.append(panel);
  root.append(overlay);
  uiSound('open');
  lockInput(o.lock);

  const tip = new ItemTip(overlay);
  let band: HTMLElement | null = null;
  let closing = false;
  const sh: Shell = {
    overlay,
    panel,
    head,
    body,
    syncClose: () => undefined,
    tipOn(target, key, nodes, opts) {
      const show = (x: number, y: number): void => tip.show(key, nodes(), x, y);
      target.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'mouse') show(e.clientX, e.clientY);
      });
      target.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'mouse') tip.follow(e.clientX, e.clientY);
      });
      target.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'mouse') tip.hide();
      });
      target.addEventListener('click', (e) => {
        if (opts?.touchPin === false) return;
        if ((e as PointerEvent).pointerType && (e as PointerEvent).pointerType !== 'mouse') tip.pin(key, nodes(), target);
      });
    },
    woundTip(target, wounds) {
      const spec = woundBandSpec(wounds, { rules: woundRules(), town: false });
      if (!spec) return;
      target.classList.add('ec-wtip');
      const place = (): void => {
        if (!band) return;
        const o = overlay.getBoundingClientRect();
        const r = target.getBoundingClientRect();
        const tw = band.offsetWidth;
        const th = band.offsetHeight;
        const x = r.left - o.left + r.width / 2 - tw / 2;
        let y = r.top - o.top - th - 8;
        if (y < 6) y = r.bottom - o.top + 8;
        band.style.left = `${Math.max(6, Math.min(overlay.clientWidth - tw - 6, x))}px`;
        band.style.top = `${Math.max(6, y)}px`;
      };
      const show = (): void => {
        band ??= el('div', 'el-tip gr-tip');
        if (!band.isConnected) overlay.append(band);
        band.innerHTML = bandTipHtml(spec);
        fadeIn(band);
        place();
      };
      target.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'mouse') show();
      });
      target.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'mouse' && band) fadeOut(band);
      });
      target.addEventListener('click', (e) => {
        e.stopPropagation();
        if (band?.classList.contains('on')) fadeOut(band);
        else show();
      });
    },
    close() {
      if (closing || !o.closable()) return;
      closing = true;
      tip.hide();
      if (band) band.remove();
      unmountX?.();
      document.removeEventListener('keydown', onKey, true);
      unlockInput(o.lock);
      closeDom(overlay, () => overlay.remove());
      o.onClosed();
    },
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    sh.close();
  };
  document.addEventListener('keydown', onKey, true);
  dismissOnBackdrop(overlay, panel, () => sh.close());
  // Sabitlenmiş (dokunmayla açılan) item ipucu: ipucunun / kaynak öğenin DIŞINA dokunmak kapatır (telefonda açık kalıp sağdaki ayrıntıyı örtüyordu; Ömer 2026-11-07)
  overlay.addEventListener(
    'pointerdown',
    (e) => {
      const t = e.target as Element | null;
      // yara bandı ipucu (dokunmayla açılan): kendi hedefi dışına dokunmak kapatır
      if (band?.classList.contains('on') && !(t && (band.contains(t) || t.closest('.ec-wtip')))) fadeOut(band);
      if (!tip.pinned) return;
      if (t && (tip.box.contains(t) || t.closest('.gr-slot, .gr-item, [data-tip]'))) return;
      tip.hide();
    },
    true,
  );
  let unmountX: (() => void) | null = null;
  const syncX = (): void => {
    const want = o.closable();
    if (want && !unmountX) unmountX = mountCloseButton(overlay, () => sh.close());
    else if (!want && unmountX) {
      unmountX();
      unmountX = null;
    }
  };
  syncX();
  sh.syncClose = syncX;
  return sh;
}
