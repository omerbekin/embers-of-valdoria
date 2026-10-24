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
import notice from '../../data/privacy-notice.json';
import './diag.css';

/** Gizlilik metni (KVKK tarzı aydınlatma; Ömer 2026-10-16): TEK kaynak data/privacy-notice.json. Varsayılan İngilizce, pencerede
 *  "Türkçe" / "English" yazı anahtarıyla Türkçe (oturum boyunca hatırlanır). Kısa giriş her zaman görünür, ayrıntılar "Details" altında. */
export type NoticeLang = 'en' | 'tr';
export interface NoticeText {
  title: string;
  intro: string[];
  detailsLabel: string;
  details: Array<{ heading: string; text: string }>;
  /** Tam metin bağlantısı satırı; {link} yerine /privacy bağlantısı. */
  fullText: string;
  toggle: string;
  on: string;
  off: string;
  continue: string;
  close: string;
  language: string;
}
/** Tam gizlilik metni (public/privacy.html; hesap sayfasıyla aynı göreli adres, GitHub Pages alt yolunda da çalışır). */
const PRIVACY_URL = 'privacy.html';
export const PRIVACY_CONTACT: string = notice.contact;
/** Dildeki metin ({contact} yerine iletişim adresi yazılmış). */
export function noticeText(lang: NoticeLang): NoticeText {
  const t = notice[lang] as NoticeText;
  return { ...t, details: t.details.map((d) => ({ heading: d.heading, text: d.text.split('{contact}').join(PRIVACY_CONTACT) })) };
}
let lang: NoticeLang = 'en';

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
  const title = el('h2', 'el-title dg-title');
  const text = el('div', 'dg-text');
  const intro = el('div', 'dg-intro');
  const more = el('button', 'dg-more');
  more.type = 'button';
  const details = el('div', 'dg-details');
  details.hidden = true;
  more.setAttribute('aria-expanded', 'false');
  more.addEventListener('click', () => {
    uiSound('tab');
    details.hidden = !details.hidden;
    more.setAttribute('aria-expanded', String(!details.hidden));
    more.classList.toggle('open', !details.hidden);
    if (!details.hidden) text.scrollTop += details.getBoundingClientRect().top - text.getBoundingClientRect().top - 8;
  });
  const full = el('p', 'dg-full');
  text.append(intro, more, details, full);

  // Anahtar satırı: Settings satırı dili (yazı solda, değer sağda; açıkken önde kor elmas)
  const toggle = el('button', 'dg-toggle');
  toggle.type = 'button';
  toggle.setAttribute('role', 'switch');
  const dia = el('span', 'el-dia hollow');
  const label = el('span', 'dg-label');
  const value = el('span', 'dg-value');
  toggle.append(dia, label, value);
  const paint = (on: boolean): void => {
    const t = noticeText(lang);
    value.textContent = on ? t.on : t.off;
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

  const done = el('button', 'el-btn primary');
  done.type = 'button';

  // Dil anahtarı (kutusuz yazı düğmesi, solda); metin dile göre yeniden yazılır
  const langBtn = el('button', 'el-link dg-lang');
  langBtn.type = 'button';
  const fill = (): void => {
    const t = noticeText(lang);
    overlay.setAttribute('aria-label', t.title);
    overlay.lang = lang;
    title.textContent = t.title;
    intro.replaceChildren(...t.intro.map((line) => el('p', '', line)));
    more.textContent = t.detailsLabel;
    details.replaceChildren(...t.details.flatMap((d) => [el('h3', 'dg-h', d.heading), el('p', '', d.text)]));
    const [before = '', after = ''] = t.fullText.split('{link}');
    const a = el('a', '', '/privacy');
    a.href = PRIVACY_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    full.replaceChildren(before, a, after);
    label.textContent = t.toggle;
    done.textContent = mode === 'first' ? t.continue : t.close;
    paint(diagConsent());
    langBtn.textContent = t.language;
    langBtn.lang = lang === 'en' ? 'tr' : 'en';
  };
  langBtn.addEventListener('click', () => {
    uiSound('tab');
    lang = lang === 'en' ? 'tr' : 'en';
    fill();
  });
  fill();

  const row = el('div', 'el-row dg-row');
  row.append(langBtn, done);
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
