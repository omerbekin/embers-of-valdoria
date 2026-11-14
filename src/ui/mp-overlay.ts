/**
 * Multiplayer DOM katmanı (sahneden bağımsız): üstte bağlantı şeridi (kopma geri sayımı, desync), kısa bildirimler,
 * lobi kodu giriş kutusu (yapıştırma desteği için gerçek <input>) ve panoya kopyalama. Metinler İngilizce.
 */
import { openElDialog, type ElDialog } from './el-dialog';
import { showElToast } from './el-toast';
import { CONFIRM } from './confirm-labels';

const root = (): HTMLElement => document.getElementById('ui-root') ?? document.body;

let banner: HTMLDivElement | null = null;

/** Üst şerit: metin boşsa gizlenir. `kind` rengi belirler. */
export function setBanner(text: string, kind: 'warn' | 'error' | 'info' = 'warn'): void {
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'el-statusband';
    banner.setAttribute('role', 'status');
    root().appendChild(banner);
  }
  banner.textContent = text;
  banner.dataset.kind = kind;
  banner.hidden = !text;
}

/** Kısa bildirim (birkaç saniye). */
export function toast(text: string, ms = 3500): void {
  showElToast(text, { ms });
}

/** Panoya kopyala (eski tarayıcıda gizli textarea yedeği). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

/**
 * Lobi kodu giriş kutusu: kod ya da davet linki yazılır/yapıştırılır. `validate` geçerli kodu döner (geçersizse null).
 * Join'e basınca geçerli kod döner; Cancel / Esc null.
 */
/** KVKK aydınlatması toplama anında (2026-10-25): bağlantı doğrudan kurulur, rakip IP adresini görebilir (public/privacy.html > Genel). */
export const IP_NOTE = 'The other player can see your IP address while you play.';

export function promptCode(validate: (text: string) => string | null): Promise<string | null> {
  return promptText({ title: 'Join lobby', hint: 'Enter the 6-letter lobby code (or paste the invite link)', placeholder: 'ABC DEF', button: 'Join', maxLength: 200, code: true, error: 'That is not a valid lobby code', validate, note: IP_NOTE });
}

/** Oyuncu adı kutusu: harf/rakam/boşluk, 16 karakter; boş bırakılırsa ad silinir ('Player 1/2'). */
export function promptName(initial: string, clean: (text: string) => string): Promise<string | null> {
  return promptText({ title: 'Your name', hint: 'Shown only to your opponent (letters, numbers and spaces, up to 16)', placeholder: 'Player', button: 'Save', maxLength: 16, initial, error: '', validate: (t) => clean(t), allowEmpty: true });
}

interface PromptOptions {
  title: string;
  hint: string;
  placeholder: string;
  button: string;
  maxLength: number;
  error: string;
  validate: (text: string) => string | null;
  initial?: string;
  /** Kod kutusu görünümü (büyük harf, geniş aralık). */
  code?: boolean;
  /** Boş sonuç geçerli ('' döner). */
  allowEmpty?: boolean;
  /** Düğmelerin üstünde küçük not (Join: IP uyarısı). */
  note?: string;
}

function promptText(o: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.className = o.code ? 'el-field eld-code' : 'el-field eld-name';
    input.value = o.initial ?? '';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.maxLength = o.maxLength;
    input.placeholder = o.placeholder;
    if (o.code) input.setAttribute('autocapitalize', 'characters');
    input.setAttribute('aria-label', o.title);
    const body: HTMLElement[] = [input];
    if (o.note) {
      const note = document.createElement('p');
      note.className = 'eld-lead eld-note';
      note.textContent = o.note;
      body.push(note);
    }
    let dlg: ElDialog | null = null;
    let result: string | null = null;
    const submit = (d: ElDialog) => {
      const v = o.validate(input.value);
      if (v || (o.allowEmpty && v === '')) {
        result = v ?? '';
        d.close(() => resolve(result));
      } else d.setStatus(o.error, 'bad');
    };
    dlg = openElDialog({
      title: o.title,
      lead: o.hint,
      body,
      className: 'eld-confirm',
      buttons: [
        { label: CONFIRM.cancel, onClick: (d) => d.close(() => resolve(null)) },
        { label: o.button, kind: 'primary', onClick: submit },
      ],
      onEnter: submit,
      onDismiss: (d) => d.close(() => resolve(null)),
      focus: () => input,
    });
    input.addEventListener('input', () => dlg?.setStatus(''));
  });
}

/** Dış adresi yeni sekmede aç (lobi sekmesi yerinde kalsın: bağlantı kopmasın). Telefonda WhatsApp/Discord uygulaması devralır. */
export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener');
}

/**
 * Pano yoksa yedek: davet metni seçili hâlde gösterilir (oyuncu elle kopyalar). İsteğe bağlı ikinci düğme (ör. Open Discord).
 */
export function showCopyBox(text: string, extra?: { label: string; run: () => void }): void {
  const area = document.createElement('textarea');
  area.className = 'el-field eld-share';
  area.readOnly = true;
  area.value = text;
  area.rows = 3;
  area.setAttribute('aria-label', 'Invite message');
  openElDialog({
    title: 'Copy your invite',
    lead: 'Copy the text below and send it to your friend.',
    body: [area],
    className: 'eld-confirm',
    buttons: [
      { label: 'Close', onClick: (d) => d.close() },
      ...(extra ? [{ label: extra.label, kind: 'primary' as const, onClick: (d: ElDialog) => (extra.run(), d.close()) }] : []),
    ],
    onDismiss: (d) => d.close(),
    focus: () => area,
  });
  window.setTimeout(() => {
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
  }, 60);
}
