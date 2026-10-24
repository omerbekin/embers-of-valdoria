/**
 * Hesap / bulut kaydı pencereleri (Faz 1d; taslak public/mockups/account.html v1): görünen ad, hesap silme, ilerleme çakışması, yeni sürüm
 * bildirimi, giriş hatası bildirimi. Çerçeve ortak DOM diyalog (src/ui/el-dialog.ts); metinler account-text.ts.
 * Zemin kuralları: ilk girişteki ad ve çakışma zorunludur (kapanmaz); silme penceresi zeminle kapanmaz (yazılan DELETE kaybolmasın, taslak);
 * ad düzenleme ve yeni sürüm bildirimi zeminle kapanır (Cancel / Later).
 */
import { openElDialog, type ElDialog } from '../../ui/el-dialog';
import { reloadForUpdate } from '../../ui/stale-build';
import type { PendingDecision, SideSummary } from '../cloud';
import { accountApi, type AccountApi } from './api';
import suggestions from '../../../data/display-name-suggestions.json';
import {
  conflictConfirmText,
  DELETE_WORD,
  deleteConfirmOk,
  endlessLine,
  lockedSlotsFor,
  NAME_INPUT_MAX,
  NAME_MAX,
  nameErrorText,
  pinReasonText,
  savedLine,
  signInErrorText,
  slotViews,
  validateDisplayName,
} from './account-text';
import './account.css';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// ---------------------------------------------------------------- görünen ad

/** "Suggest one": iki kelimelik ortaçağ adı (data/display-name-suggestions.json); 24 karakteri aşmaz. */
export function suggestName(rand: () => number = Math.random): string {
  for (let i = 0; i < 8; i++) {
    const a = suggestions.first[Math.floor(rand() * suggestions.first.length)]!;
    const b = suggestions.second[Math.floor(rand() * suggestions.second.length)]!;
    const n = `${a} ${b}`;
    if (n.length <= NAME_MAX) return n;
  }
  return 'Ashen Wanderer';
}

export interface NamePromptOpts {
  initial?: string;
  /** İlk giriş: ad zorunlu (Cancel yok, zemin / Esc kapatmaz). */
  required: boolean;
  api?: AccountApi;
  onSaved?: (name: string) => void;
  onClosed?: () => void;
}

/** Choose a name: 2-24 karakter, sayaç + kısa uyarı, Suggest one, Confirm (birincil, en sağda). */
export function openNamePrompt(o: NamePromptOpts): ElDialog {
  const api = o.api ?? accountApi();
  const input = el('input', 'el-field acc-name-in');
  input.type = 'text';
  input.maxLength = NAME_INPUT_MAX;
  input.placeholder = 'Display name';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Display name');
  input.value = o.initial ?? '';
  const msg = el('span', 'acc-name-msg');
  const count = el('span', 'acc-name-count');
  const meta = el('div', 'acc-name-meta');
  meta.append(msg, count);
  let off: (() => void) | null = null;
  const finish = (d: ElDialog): void => {
    off?.();
    d.close(o.onClosed);
  };
  const paint = (): boolean => {
    const c = validateDisplayName(input.value);
    count.textContent = `${c.length}/${NAME_MAX}`;
    msg.textContent = c.ok ? '' : c.message;
    msg.classList.toggle('bad', !c.ok && !!c.message);
    const ok = d.button('ok');
    if (ok) ok.disabled = !c.ok;
    return c.ok;
  };
  const confirm = (dd: ElDialog): void => {
    const c = validateDisplayName(input.value);
    if (!c.ok) return;
    dd.setBusy(true);
    void api.setDisplayName(c.name).then((r) => {
      if (dd.closed) return;
      dd.setBusy(false);
      paint();
      if (r.ok) {
        o.onSaved?.(r.displayName);
        finish(dd);
      } else dd.setStatus(nameErrorText(r.reason), 'bad');
    });
  };
  const suggest = { label: 'Suggest one', onClick: () => {
    input.value = suggestName();
    paint();
    input.focus();
  } };
  const d = openElDialog({
    title: 'Choose a name',
    lead: `This is how you appear to other players. 2 to ${NAME_MAX} characters.`,
    className: 'acc-dialog',
    body: [input, meta],
    buttons: [...(o.required ? [] : [{ label: 'Cancel', onClick: (dd: ElDialog) => finish(dd) }]), suggest, { label: 'Confirm', kind: 'primary', id: 'ok', onClick: confirm }],
    onEnter: confirm,
    ...(o.required ? {} : { onDismiss: (dd: ElDialog) => finish(dd) }),
    focus: () => input,
  });
  input.addEventListener('input', () => {
    d.setStatus('');
    paint();
  });
  paint();
  // Zorunlu pencere: oturum kapanırsa (süresi doldu, başka sekmede çıkış) kendiliğinden kapanır
  if (o.required) off = api.subscribe((e) => e.type === 'account' && !e.account.signedIn && finish(d));
  return d;
}

// ---------------------------------------------------------------- hesap silme

/** Delete account: DELETE yazılınca açılan tehlikeli düğme; başarıda bu cihazdaki ilerleme kalır. */
export function openDeleteDialog(o: { api?: AccountApi; onDeleted?: () => void } = {}): ElDialog {
  const api = o.api ?? accountApi();
  const hint = el('p', 'acc-dlg-note');
  hint.append('Type ', el('b', 'acc-word', DELETE_WORD), ' to confirm.');
  const input = el('input', 'el-field acc-del-in');
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = DELETE_WORD;
  input.setAttribute('aria-label', `Type ${DELETE_WORD}`);
  const go = (d: ElDialog): void => {
    if (!deleteConfirmOk(input.value)) return;
    d.setBusy(true);
    void api.deleteAccount().then((r) => {
      if (d.closed) return;
      if (r.ok || r.reason === 'signed-out') {
        d.close(() => o.onDeleted?.());
        return;
      }
      d.setBusy(false);
      d.button('go')!.disabled = !deleteConfirmOk(input.value);
      d.setStatus(r.reason === 'offline' ? 'You are offline. Try again when connected.' : 'Could not delete the account. Try again.', 'bad');
    });
  };
  const d = openElDialog({
    title: 'Delete account',
    lead: 'This permanently deletes your cloud save and account. Progress on this device stays.',
    className: 'acc-dialog',
    body: [hint, input],
    buttons: [
      { label: 'Cancel', onClick: (dd) => dd.close() },
      { label: 'Delete account', kind: 'danger', id: 'go', disabled: true, onClick: go },
    ],
    onEnter: go,
    focus: () => input,
  });
  input.addEventListener('input', () => {
    d.setStatus('');
    d.button('go')!.disabled = !deleteConfirmOk(input.value);
  });
  return d;
}

// ---------------------------------------------------------------- ilerleme çakışması

function sideCard(title: string, side: SideSummary, count: number, locked: Set<number>, now: number): HTMLElement {
  const card = el('div', 'acc-side');
  const h = el('h4', 'acc-side-h', title);
  h.append(el('small', '', savedLine(side, now)));
  card.append(h);
  for (const s of slotViews(side, count, locked, now)) {
    const row = el('div', `acc-slot${s.locked ? ' locked' : ''}${s.empty ? ' empty' : ''}`);
    const head = el('div', 'acc-slot-h');
    head.append(el('span', 'acc-slot-n', s.title));
    if (s.ironman) head.append(el('span', 'acc-tag', 'Ironman'));
    row.append(head, el('div', 'acc-slot-l', s.line));
    if (s.sub) row.append(el('div', 'acc-slot-s', s.sub));
    if (s.locked) row.append(el('div', 'acc-slot-lk', 'Not selectable'));
    card.append(row);
  }
  const endless = el('div', 'acc-slot');
  endless.append(el('div', 'acc-slot-h', 'Endless'), el('div', 'acc-slot-l', endlessLine(side)));
  card.append(endless);
  return card;
}

/**
 * Progress conflict: "This device" / "Cloud" kartları (yuvalar, Endless, kayıt zamanı), Ironman sabitlemesinde zayıf taraf "Not selectable"
 * + tek satır neden. Keep this device / Use cloud progress -> "Are you sure?" (diğer taraf yedeklenir) -> resolve(choice). Zorunlu: kapanmaz.
 */
export function openConflictDialog(p: PendingDecision, o: { onClosed?: () => void; now?: () => number } = {}): ElDialog {
  const now = o.now ?? (() => Date.now());
  const count = Math.max(p.local.slots.length, p.cloud.slots.length);
  const step1 = (): Parameters<ElDialog['update']>[0] => {
    const grid = el('div', 'acc-grid2');
    grid.append(sideCard('This device', p.local, count, lockedSlotsFor(p.pins, 'local'), now()), sideCard('Cloud', p.cloud, count, lockedSlotsFor(p.pins, 'cloud'), now()));
    const notes = [...new Set(p.pins.map((x) => pinReasonText(x.reason)))].map((t) => el('p', 'acc-ironnote', t));
    return {
      title: 'Progress conflict',
      lead: 'This device and your cloud save both have progress. Choose which to keep.',
      body: [grid, ...notes],
      buttons: [
        { label: 'Keep this device', onClick: (d) => d.update(step2('local')) },
        { label: 'Use cloud progress', kind: 'primary', onClick: (d) => d.update(step2('cloud')) },
      ],
    };
  };
  const step2 = (choice: 'local' | 'cloud'): Parameters<ElDialog['update']>[0] => ({
    title: 'Are you sure?',
    lead: conflictConfirmText(choice),
    buttons: [
      { label: 'Back', onClick: (d) => d.update(step1()) },
      {
        label: 'Confirm',
        kind: 'primary',
        onClick: (d) => {
          d.setBusy(true);
          void p.resolve(choice).then((r) => {
            if (d.closed) return;
            if (r.ok || r.reason === 'stale') return d.close(o.onClosed);
            d.setBusy(false);
            d.setStatus(r.reason === 'apply-failed' ? 'Could not apply the progress. Try again.' : 'Cloud save is not available right now. Try again.', 'bad');
          });
        },
      },
    ],
  });
  const d = openElDialog({ ...step1(), wide: true, className: 'acc-dialog acc-conflict', label: 'Progress conflict' });
  return d;
}

// ---------------------------------------------------------------- küçük bildirimler

/** Daha yeni sürümün kaydı: yükleme durdu; Reload yeni sürümü yükler (src/ui/stale-build.ts). */
export function openNewerVersionNotice(o: { onClosed?: () => void } = {}): ElDialog {
  return openElDialog({
    title: 'Newer version',
    lead: 'A newer version of the game saved this progress. Reload to update.',
    className: 'acc-dialog',
    buttons: [
      { label: 'Later', onClick: (d) => d.close(o.onClosed) },
      { label: 'Reload', kind: 'primary', onClick: () => reloadForUpdate('cloud newer-version') },
    ],
    onDismiss: (d) => d.close(o.onClosed),
  });
}

let toast: HTMLElement | null = null;

/** Giriş başarısız (?auth=error): üstte kısa bildirim, Dismiss ya da birkaç saniye sonra kaybolur. */
export function showSignInError(reason: string | undefined, root: HTMLElement = document.getElementById('ui-root') ?? document.body): HTMLElement {
  toast?.remove();
  const t = el('div', 'el-panel corners acc-toast');
  t.setAttribute('role', 'alert');
  const text = el('div', 'acc-toast-text');
  text.append(el('b', '', 'Sign-in failed'), el('span', '', signInErrorText(reason)));
  const close = el('button', 'el-link acc-toast-x');
  close.type = 'button';
  close.append(el('span', '', 'Dismiss'));
  const remove = (): void => {
    window.clearTimeout(timer);
    t.classList.add('out');
    window.setTimeout(() => t.remove(), 220);
    if (toast === t) toast = null;
  };
  close.addEventListener('click', remove);
  t.addEventListener('mouseup', (e) => e.preventDefault());
  t.append(text, close);
  root.append(t);
  toast = t;
  const timer = window.setTimeout(remove, 9000);
  return t;
}
