/**
 * Hata raporu bildirimi (Ömer 2026-10-16; docs/arch/diagnostics.md). İlk açılışta BİR KEZ (ana menü hazır olunca): kısa açıklama,
 * "Send error reports" anahtarı (varsayılan KAPALI) ve Continue. Settings > Privacy > Error reports satırındaki "Info" aynı pencereyi
 * (Close düğmesiyle) açar. Tasarım kiti Diyalog çerçevesi: `.el-dialog` + `.el-panel corners` + `.el-title` (src/ui/elegant.css),
 * ortak pencere hareketi `.el-modal`, kapatma Continue / Close + Esc + zemine dokunma (onay değişmez; bildirim görülmüş sayılır).
 */
import { dismissOnBackdrop } from '../ui/backdrop';
import { lockInput, unlockInput } from '../ui/input-lock';
import { closeDom } from '../ui/motion';
import { uiSound } from '../ui/ui-sound';
import { diagConsent, markDiagNoticed, onDiagConsentChange, setDiagConsent } from './diag';
import './diag.css';

/** Kısa gizlilik metni (İngilizce; Settings'teki "Info" da bunu gösterir). */
export const PRIVACY_LINES: readonly string[] = [
  'Error reports help us find and fix crashes. They are off unless you turn them on.',
  'When on, the game sends a short technical report if something goes wrong: game version, browser and device type, screen size, memory hints, the current screen, recent game events (screen changes, battle starts, error messages).',
  'No name, account, save data or typed text is sent, and IP addresses are not stored. Reports carry a random ID that is reset when you turn them off. Reports are deleted after 30 days.',
  'Questions: omerbekinn@gmail.com',
];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

let openOverlay: HTMLElement | null = null;

export const isDiagNoticeOpen = (): boolean => !!openOverlay;

/**
 * Pencereyi açar. `mode`: 'first' ilk açılış (Continue), 'info' Settings'ten (Close). Kapanınca bildirim görülmüş sayılır.
 */
export function openDiagNotice(mode: 'first' | 'info' = 'first', onClose?: () => void): void {
  if (openOverlay) return;
  const root = document.getElementById('ui-root') ?? document.body;
  const overlay = el('div', 'el-dialog el-modal dg-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Error reports');
  const panel = el('div', 'el-panel corners el-modal-panel dg-panel');
  const title = el('h2', 'el-title dg-title', 'Error reports');
  const text = el('div', 'dg-text');
  for (const line of PRIVACY_LINES) text.append(el('p', '', line));

  // Anahtar satırı: Settings satırı dili (yazı solda, değer sağda; açıkken önde kor elmas)
  const toggle = el('button', 'dg-toggle');
  toggle.type = 'button';
  toggle.setAttribute('role', 'switch');
  const dia = el('span', 'el-dia hollow');
  const label = el('span', 'dg-label', 'Send error reports');
  const value = el('span', 'dg-value');
  toggle.append(dia, label, value);
  const paint = (on: boolean): void => {
    value.textContent = on ? 'On' : 'Off';
    toggle.setAttribute('aria-checked', String(on));
    toggle.classList.toggle('on', on);
    dia.className = on ? 'el-dia' : 'el-dia hollow';
  };
  paint(diagConsent());
  const offChange = onDiagConsentChange(paint);
  toggle.addEventListener('click', () => {
    uiSound('select');
    setDiagConsent(!diagConsent());
  });

  const row = el('div', 'el-row dg-row');
  const done = el('button', 'el-btn primary', mode === 'first' ? 'Continue' : 'Close');
  done.type = 'button';
  row.append(done);
  panel.append(title, text, toggle, row);
  overlay.append(panel);

  let closing = false;
  const finish = (): void => {
    if (closing) return;
    closing = true;
    markDiagNoticed();
    offChange();
    window.removeEventListener('keydown', onKey, true);
    offBackdrop();
    closeDom(overlay, () => {
      overlay.remove();
      openOverlay = null;
      unlockInput('diag-notice');
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
  done.addEventListener('click', finish);
  window.addEventListener('keydown', onKey, true);
  overlay.addEventListener('mouseup', (e) => e.preventDefault()); // fare bırakması alttaki Phaser sahnesine gitmesin
  root.append(overlay);
  openOverlay = overlay;
  lockInput('diag-notice');
  uiSound('open');
}
