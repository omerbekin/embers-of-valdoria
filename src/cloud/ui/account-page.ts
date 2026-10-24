/**
 * Settings > Account sayfası (Faz 1d; taslak public/mockups/account.html v1 "Rows"). Ana menü Settings sütunu (MainMenuScene) sayfa
 * başlığını Phaser ile çizer, satırları bu DOM kutusu (.acc-host) çizer: gerçek onay kutusu, bağlantı, düğmeler, kendi içinde kayma.
 * Girişsiz: Google / Discord satırları zorunlu "I have read the privacy notice" kutusuna bağlı (çevrimdışıyken kapalı) + misafir notu.
 * Girişli: görünen ad (Edit), bağlı sağlayıcılar + Link, senkron durumu + Sync now, Support ID + Copy, Delete account (tehlikeli) + Sign out.
 * Giriş tam sayfa yönlendirmedir (OAuth): bu yüzden yalnızca ana menüde; oyun içi Settings yalnızca salt okunur satır gösterir.
 */
import { accountNoticeText } from '../account-notice';
import { accountApi, isOnline } from './api';
import { ACCOUNT_SOON, canSyncNow, cloudStatusLine, PROVIDERS, providerName, type ProviderKey } from './account-text';
import { openDeleteDialog, openNamePrompt } from './dialogs';
import { uiSound } from '../../ui/ui-sound';
import './account.css';

const PRIVACY_URL = 'privacy.html';
const GUEST_NOTE = 'Playing without an account keeps your progress on this device only.';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const btn = (label: string | Node, cls: string, onClick: () => void, disabled = false): HTMLButtonElement => {
  const b = el('button', `el-btn sm${cls ? ` ${cls}` : ''}`);
  b.type = 'button';
  b.append(label);
  b.disabled = disabled;
  b.addEventListener('click', () => {
    if (b.disabled) return;
    uiSound('select');
    onClick();
  });
  return b;
};

const row = (label: string, sub: string | null, acts: Node[], plain = false): HTMLElement => {
  const r = el('div', `acc-row${plain ? ' plain' : ''}`);
  const l = el('div', 'acc-lbl', label);
  if (sub !== null) l.append(el('small', '', sub));
  const a = el('div', 'acc-acts');
  a.append(...acts);
  r.append(l, a);
  return r;
};

const dotText = (on: boolean, text: string): HTMLElement => {
  const s = el('span', on ? '' : 'acc-dim');
  s.append(el('span', `acc-dot ${on ? 'ok' : 'off'}`), text);
  return s;
};

const providerMark = (p: ProviderKey, text: string): HTMLElement => {
  const s = el('span', 'acc-prov');
  s.append(el('span', 'acc-pmark', p === 'google' ? 'G' : 'D'), text);
  return s;
};

/** Onay kutusu etiketi: "privacy notice" kelimeleri gizlilik sayfasını yeni sekmede açar. */
function consentLabel(): HTMLElement {
  const text = accountNoticeText('en').checkbox;
  const span = el('span', '');
  const at = text.toLowerCase().indexOf('privacy notice');
  const link = (t: string): HTMLAnchorElement => {
    const a = el('a', '', t);
    a.href = PRIVACY_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.addEventListener('click', (e) => e.stopPropagation()); // bağlantı kutuyu işaretlemesin
    return a;
  };
  if (at < 0) span.append(text, ' (', link('read'), ')');
  else span.append(text.slice(0, at), link(text.slice(at, at + 14)), text.slice(at + 14));
  return span;
}

export interface AccountPage {
  root: HTMLElement;
  destroy(): void;
}

/** Hesap sayfasını `host` içine kurar; hesap / durum / çevrimiçi değişince yeniden çizer. */
export function mountAccountPage(host: HTMLElement, o: { onHidden?: () => void } = {}): AccountPage {
  const root = el('div', 'acc-page');
  host.append(root);
  let agreed = false;
  let note = '';
  let noteKind: '' | 'ok' | 'warn' = '';
  let alive = true;
  const say = (text: string, kind: '' | 'ok' | 'warn' = 'ok'): void => {
    note = text;
    noteKind = kind;
    render();
  };

  /** Özellik kapalı: v1 Rows görünümünde devre dışı Google / Discord satırları + misafir notu (onay kutusu ve etkin düğme yok). */
  function renderComingSoon(): HTMLElement[] {
    const rows = PROVIDERS.map((p) => {
      const r = row(providerName(p), null, [el('span', 'acc-soon', ACCOUNT_SOON.tag)]);
      r.classList.add('off');
      r.setAttribute('aria-disabled', 'true');
      return r;
    });
    return [el('div', 'acc-sec', 'Sign in'), el('p', 'acc-note acc-intro', ACCOUNT_SOON.intro), ...rows, el('p', 'acc-note', ACCOUNT_SOON.guest)];
  }

  function renderSignedOut(): HTMLElement[] {
    const api = accountApi();
    const online = isOnline();
    const gate: HTMLButtonElement[] = [];
    const signIn = (p: ProviderKey): void => {
      const r = api.startLogin({ provider: p, mode: 'login', consentAccepted: agreed });
      if (!r.ok) say(r.reason === 'consent' ? 'Tick the privacy notice box first.' : 'Sign-in is not available right now.', 'warn');
    };
    const rows = PROVIDERS.map((p) => {
      const b = btn(providerMark(p, `Sign in with ${providerName(p)}`), '', () => signIn(p), !online || !agreed);
      gate.push(b);
      return row(providerName(p), 'Save progress to the cloud', [b]);
    });
    const chk = el('label', 'el-check acc-consent');
    const box = el('input', '');
    box.type = 'checkbox';
    box.checked = agreed;
    box.disabled = !online;
    box.addEventListener('change', () => {
      agreed = box.checked;
      uiSound('select');
      for (const b of gate) b.disabled = !online || !agreed;
    });
    chk.append(box, el('span', 'box'), consentLabel());
    const out: HTMLElement[] = [el('div', 'acc-sec', 'Sign in'), ...rows, chk, el('p', 'acc-note', GUEST_NOTE)];
    if (!online) out.push(el('p', 'acc-note warn', 'You are offline. Sign-in needs a connection.'));
    return out;
  }

  function renderSignedIn(): HTMLElement[] {
    const api = accountApi();
    const acc = api.getAccount();
    const online = isOnline();
    const status = api.getCloudStatus();
    const out: HTMLElement[] = [el('div', 'acc-sec', 'Profile')];
    const name = acc.displayName ? el('span', 'acc-val', acc.displayName) : el('span', 'acc-dim', 'Not set');
    out.push(row('Display name', null, [name, btn(acc.displayName ? 'Edit' : 'Choose', '', () => openNamePrompt({ initial: acc.displayName ?? '', required: false, api, onSaved: () => say('Name saved.') }))]));
    for (const p of PROVIDERS) {
      const linked = acc.providers.includes(p);
      const acts: Node[] = [dotText(linked, linked ? 'Connected' : 'Not linked')];
      if (!linked)
        acts.push(
          btn(`Link ${providerName(p)}`, '', () => {
            const r = api.startLogin({ provider: p, mode: 'link', consentAccepted: true });
            if (!r.ok) say('Linking is not available right now.', 'warn');
          }, !online),
        );
      out.push(row(providerName(p), null, acts));
    }
    out.push(el('div', 'acc-sec', 'Sync'));
    const busy = status === 'syncing';
    out.push(
      row('Cloud save', cloudStatusLine(status, acc.local?.lastSyncAt ?? null, Date.now(), online), [
        btn(busy ? 'Syncing...' : 'Sync now', '', () => void api.syncNow().then(() => render()), !canSyncNow(status, online)),
      ]),
    );
    out.push(el('div', 'acc-sec', 'Account'));
    const id = acc.supportId ?? '';
    out.push(
      row('Support ID', id, [
        btn('Copy', '', () => {
          void navigator.clipboard?.writeText(id).then(
            () => say('Support ID copied.'),
            () => say('Could not copy. Select the ID and copy it by hand.', 'warn'),
          );
        }, !id),
      ]),
    );
    out.push(
      row('', null, [
        btn('Delete account', 'danger', () => openDeleteDialog({ api, onDeleted: () => say('Account deleted. Progress on this device stays.') })),
        btn('Sign out', 'primary', () => {
          void api.signOut().then((r) => {
            if (r.ok) say('Signed out. Progress stays on this device.');
            else say(r.reason === 'offline' ? 'You are offline. Try again when connected.' : 'Could not sign out. Try again.', 'warn');
          });
        }),
      ], true),
    );
    return out;
  }

  function render(): void {
    if (!alive) return;
    const api = accountApi();
    if (!api.cloudEnabled()) {
      root.replaceChildren(...renderComingSoon());
      return;
    }
    if (!api.isLoginAvailable()) {
      root.replaceChildren();
      o.onHidden?.();
      return;
    }
    const nodes = api.getAccount().signedIn ? renderSignedIn() : renderSignedOut();
    const n = el('p', `acc-note${noteKind ? ` ${noteKind}` : ''}`, note);
    n.setAttribute('aria-live', 'polite');
    root.replaceChildren(...nodes, n);
  }

  const offCloud = accountApi().subscribe((e) => {
    if (e.type === 'account' || e.type === 'status') render();
  });
  const onNet = (): void => render();
  window.addEventListener('online', onNet);
  window.addEventListener('offline', onNet);
  const tick = window.setInterval(render, 30_000); // "3 min ago" güncel kalsın
  host.addEventListener('mouseup', (e) => e.preventDefault()); // fare bırakması alttaki Phaser sahnesine gitmesin
  render();
  // Sunucu ulaşılmazsa (503 / ağ hatası) giriş gizlenir: sayfa da kalkar (onHidden)
  if (accountApi().cloudEnabled()) void accountApi().checkLoginAvailable().then(() => render());

  return {
    root,
    destroy() {
      alive = false;
      offCloud();
      window.removeEventListener('online', onNet);
      window.removeEventListener('offline', onNet);
      window.clearInterval(tick);
      root.remove();
    },
  };
}
