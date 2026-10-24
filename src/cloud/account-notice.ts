/**
 * Hesap / bulut kaydı gizlilik metni (accounts-plan.md Faz 1c; Ömer 2026-10-24 kararları). TEK kaynak data/account-notice.json.
 * Arayüz YOK: giriş penceresi (Faz 1d) metni buradan okur; public/privacy.html aynı JSON'dan tools/gen-privacy-page.mjs ile üretilir.
 * Varsayılan İngilizce, "Türkçe" / "English" anahtarıyla Türkçe. `checkbox` = girişte zorunlu "okudum" kutusu (karar 7).
 */
import notice from '../../data/account-notice.json';

export type AccountNoticeLang = 'en' | 'tr';
export interface AccountNoticeText {
  title: string;
  intro: string[];
  detailsLabel: string;
  details: Array<{ heading: string; text: string }>;
  /** Girişte zorunlu onay kutusunun etiketi. */
  checkbox: string;
  /** Diğer dile geçiş anahtarının yazısı. */
  language: string;
}

export const ACCOUNT_NOTICE_CONTACT: string = notice.contact;
export const ACCOUNT_NOTICE_LANGS: readonly AccountNoticeLang[] = ['en', 'tr'];

/** Dildeki metin ({contact} yerine iletişim adresi yazılmış). */
export function accountNoticeText(lang: AccountNoticeLang = 'en'): AccountNoticeText {
  const t = notice[lang] as AccountNoticeText;
  const fill = (s: string): string => s.split('{contact}').join(ACCOUNT_NOTICE_CONTACT);
  return { ...t, intro: t.intro.map(fill), details: t.details.map((d) => ({ heading: d.heading, text: fill(d.text) })) };
}
