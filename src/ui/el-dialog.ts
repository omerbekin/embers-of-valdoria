/**
 * DOM Diyalog çerçevesi (tasarım kiti; Phaser karşılığı elConfirm / openModal). `.el-dialog` zemin + `.el-panel corners` kutu + `.el-title`,
 * ortak pencere hareketi (`.el-modal`, kapanış `closeDom`), düğmeler altta: ikinciller solda, BİRİNCİL EN SAĞDA (dizideki sıra korunur).
 * Zemine dokunma / Esc yalnızca `onDismiss` verilirse çalışır (No / Cancel ile aynı); zorunlu seçimde verilmez, pencere kapanmaz.
 * Açıkken sahne girişi kilitli (`lockInput`), klavye alttaki oyuna gitmez (debug kısayolu hariç). İçerik `update` ile adım adım değişebilir
 * (ör. seçim -> "Are you sure?"). Kullananlar: src/cloud/ui/dialogs.ts (hesap / bulut kaydı).
 */
import { dismissOnBackdrop } from './backdrop';
import { lockInput, unlockInput } from './input-lock';
import { closeDom } from './motion';
import { uiSound } from './ui-sound';

export interface ElDialogButton {
  label: string;
  /** primary: kor elmaslı (ekranın tek birincil eylemi); danger: kırmızı yazı (geri alınamaz eylem). */
  kind?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
  /** Düğmeyi tutan kod sonradan açıp kapatabilsin diye ad. */
  id?: string;
  onClick: (d: ElDialog) => void;
}

export interface ElDialogContent {
  title: string;
  /** Başlığın altında ortalanmış kısa açıklama. */
  lead?: string;
  body?: HTMLElement[];
  buttons: ElDialogButton[];
  /** Enter (yazı kutusunda da): genelde birincil eylem. */
  onEnter?: (d: ElDialog) => void;
}

export interface ElDialogOpts extends ElDialogContent {
  /** Erişilebilirlik adı (yoksa başlık). */
  label?: string;
  wide?: boolean;
  className?: string;
  /** Zemin / Esc = vazgeç. Verilmezse pencere zorunludur. */
  onDismiss?: (d: ElDialog) => void;
  /** Açılınca odaklanacak öğe (yoksa birincil düğme). */
  focus?: () => HTMLElement | null;
}

export interface ElDialog {
  readonly overlay: HTMLElement;
  readonly panel: HTMLElement;
  /** Düğmeler (id ile). */
  button(id: string): HTMLButtonElement | null;
  /** Altta tek satır durum yazısı ('' gizler). */
  setStatus(text: string, kind?: 'bad' | 'ok'): void;
  /** Bekleme: tüm düğmeler kapalı. */
  setBusy(busy: boolean): void;
  update(c: ElDialogContent): void;
  close(onClosed?: () => void): void;
  readonly closed: boolean;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

let seq = 0;

export function openElDialog(opts: ElDialogOpts, root: HTMLElement = document.getElementById('ui-root') ?? document.body): ElDialog {
  const lockId = `el-dialog-${++seq}`;
  const overlay = el('div', `el-dialog el-modal eld-overlay${opts.className ? ` ${opts.className}` : ''}`);
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const panel = el('div', `el-panel corners el-modal-panel eld-panel${opts.wide ? ' wide' : ''}`);
  overlay.append(panel);
  let content: ElDialogContent = opts;
  let buttons = new Map<string, HTMLButtonElement>();
  let all: HTMLButtonElement[] = [];
  let busy = false;
  let closed = false;
  const status = el('div', 'el-status eld-status');

  const d: ElDialog = {
    overlay,
    panel,
    button: (id) => buttons.get(id) ?? null,
    setStatus(text, kind) {
      status.textContent = text;
      status.className = `el-status eld-status${kind ? ` ${kind}` : ''}`;
      status.hidden = !text;
    },
    setBusy(b) {
      busy = b;
      all.forEach((btn, i) => (btn.disabled = b || !!content.buttons[i]?.disabled));
      overlay.classList.toggle('eld-busy', b);
    },
    update(c) {
      content = c;
      render();
    },
    close(onClosed) {
      if (closed) return;
      closed = true;
      window.removeEventListener('keydown', onKey, true);
      offBackdrop?.();
      closeDom(overlay, () => {
        overlay.remove();
        unlockInput(lockId);
        onClosed?.();
      });
    },
    get closed() {
      return closed;
    },
  };

  function render(): void {
    const title = el('h2', 'el-title eld-title', content.title);
    overlay.setAttribute('aria-label', opts.label ?? content.title);
    const nodes: HTMLElement[] = [title];
    if (content.lead) nodes.push(el('p', 'eld-lead', content.lead));
    if (content.body) nodes.push(...content.body);
    d.setStatus('');
    nodes.push(status);
    const row = el('div', 'eld-foot');
    buttons = new Map();
    all = content.buttons.map((b) => {
      const btn = el('button', `el-btn sm${b.kind === 'primary' ? ' primary' : b.kind === 'danger' ? ' danger' : ''}`, b.label);
      btn.type = 'button';
      btn.disabled = busy || !!b.disabled;
      btn.addEventListener('click', () => {
        if (busy || closed || btn.disabled) return;
        uiSound('select');
        b.onClick(d);
      });
      if (b.id) buttons.set(b.id, btn);
      return btn;
    });
    if (all.length === 1) row.classList.add('single');
    row.append(...all);
    nodes.push(row);
    panel.replaceChildren(...nodes);
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === '`' || e.key === 'F2') return; // debug kısayolu çalışmaya devam eder
    // Üstte başka bir diyalog açıksa yalnızca en üstteki dinler
    const top = root.querySelectorAll('.eld-overlay');
    if (top[top.length - 1] !== overlay) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      if (opts.onDismiss && !busy) opts.onDismiss(d);
    } else if (e.key === 'Enter' && content.onEnter && !busy) {
      e.preventDefault();
      content.onEnter(d);
    }
  };
  const offBackdrop = opts.onDismiss ? dismissOnBackdrop(overlay, panel, () => !busy && opts.onDismiss?.(d)) : null;
  overlay.addEventListener('mouseup', (e) => e.preventDefault()); // fare bırakması alttaki Phaser sahnesine gitmesin
  window.addEventListener('keydown', onKey, true);
  render();
  root.append(overlay);
  lockInput(lockId);
  uiSound('open');
  const f = opts.focus?.() ?? panel.querySelector<HTMLButtonElement>('.el-btn.primary:not(:disabled)');
  f?.focus({ preventScroll: true });
  return d;
}
