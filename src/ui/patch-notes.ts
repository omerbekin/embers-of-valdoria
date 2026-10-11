// Patch Notes penceresi (Ömer 2026-10-11): ana menüde sağ alttaki sürüm yazısına dokununca açılır. İçerik data/patch-notes.json
// (en yeni sürüm en üstte; sade, oyuncuya yönelik satırlar). Kit "Diyalog" çerçevesi: kararan zemin + ortada panel (src/ui/elegant.css
// > .el-dialog / .el-panel / .el-title / .el-heading), ortak pencere hareketi (.el-modal; Reduced motion = 0 ms), kapatma = Close + Esc +
// zemine dokunma. Liste kendi içinde kayar; en yeni sürüm açık, eskiler başlığa dokununca açılır/kapanır. Ayrı kod parçası (MainMenuScene
// dynamic import): menü paketine yük olmaz. Saf yardımcılar (releaseGroups, formatPatchDate, compareVersions) testlidir.
import notes from '../../data/patch-notes.json';
import { dismissOnBackdrop } from './backdrop';
import { lockInput, unlockInput } from './input-lock';
import { closeDom } from './motion';
import { uiSound } from './ui-sound';
import './patch-notes.css';

export interface PatchGroup {
  heading: string;
  items: string[];
}

export interface PatchRelease {
  version: string;
  date: string;
  items?: string[];
  groups?: PatchGroup[];
}

export const PATCH_NOTES = (notes as { releases: PatchRelease[] }).releases;

/** Sürümün satır grupları: `groups` varsa onlar, yoksa başlıksız tek grup (`items`). */
export function releaseGroups(r: PatchRelease): PatchGroup[] {
  if (r.groups?.length) return r.groups;
  return r.items?.length ? [{ heading: '', items: r.items }] : [];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-10-11' -> '11 Oct 2026' (bozuksa olduğu gibi). */
export function formatPatchDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/** Sürüm karşılaştırma (0.6.10 > 0.6.9): a > b ise pozitif. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

let openOverlay: HTMLElement | null = null;

/** Pencereyi açar (zaten açıksa bir şey yapmaz). `onClose` kapanınca çağrılır. */
export function openPatchNotes(onClose?: () => void): void {
  if (openOverlay) return;
  const root = document.getElementById('ui-root') ?? document.body;
  const overlay = el('div', 'el-dialog el-modal pn-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Patch Notes');
  const panel = el('div', 'el-panel corners el-modal-panel pn-panel');
  const title = el('h2', 'el-title pn-title', 'Patch Notes');
  const list = el('div', 'pn-list');

  PATCH_NOTES.forEach((r, i) => {
    const sec = el('section', 'pn-rel');
    const head = el('button', 'pn-head');
    head.type = 'button';
    const dia = el('span', i === 0 ? 'el-dia' : 'el-dia hollow'); // kor elmas yalnızca en yeni sürümde
    const ver = el('span', 'pn-ver', `v${r.version}`);
    const date = el('span', 'pn-date', formatPatchDate(r.date));
    const chev = el('span', 'pn-chev', '▾');
    chev.setAttribute('aria-hidden', 'true');
    head.append(dia, ver, date, chev);
    const body = el('div', 'pn-body');
    for (const g of releaseGroups(r)) {
      if (g.heading) body.append(el('h3', 'el-heading pn-heading', g.heading));
      const ul = el('ul', 'pn-items');
      for (const line of g.items) ul.append(el('li', '', line));
      body.append(ul);
    }
    const setOpen = (on: boolean): void => {
      sec.classList.toggle('open', on);
      head.setAttribute('aria-expanded', String(on));
      body.hidden = !on;
    };
    setOpen(i === 0);
    head.addEventListener('click', () => {
      uiSound('tab');
      const on = !sec.classList.contains('open');
      setOpen(on);
      // açılan sürümün başlığı listenin üstüne gelsin (telefonda kısa alan)
      if (on) list.scrollTop += sec.getBoundingClientRect().top - list.getBoundingClientRect().top;
    });
    sec.append(head, body);
    list.append(sec);
  });

  const row = el('div', 'el-row pn-row');
  const close = el('button', 'el-btn primary', 'Close');
  close.type = 'button';
  row.append(close);
  panel.append(title, list, row);
  overlay.append(panel);

  let closing = false;
  const finish = (): void => {
    if (closing) return;
    closing = true;
    window.removeEventListener('keydown', onKey, true);
    offBackdrop();
    closeDom(overlay, () => {
      overlay.remove();
      openOverlay = null;
      unlockInput('patch-notes');
      onClose?.();
    });
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === '`' || e.key === 'F2') return; // debug kısayolu çalışmaya devam eder
    e.stopImmediatePropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      finish();
    }
  };
  const offBackdrop = dismissOnBackdrop(overlay, panel, finish);
  close.addEventListener('click', finish);
  window.addEventListener('keydown', onKey, true);
  // Fare bırakması alttaki Phaser sahnesine gitmesin; asıl güvence giriş kilidi
  overlay.addEventListener('mouseup', (e) => e.preventDefault());

  root.append(overlay);
  openOverlay = overlay;
  lockInput('patch-notes');
  uiSound('open');
  close.focus({ preventScroll: true });
}

export const isPatchNotesOpen = (): boolean => !!openOverlay;
