import { describe, expect, it } from 'vitest';
import notice from '../data/account-notice.json';
import diagNotice from '../data/privacy-notice.json';
import { ACCOUNT_NOTICE_CONTACT, accountNoticeText } from '../src/cloud/account-notice';

// Hesap / bulut kaydı gizlilik metni (accounts-plan.md Faz 1c): TEK kaynak data/account-notice.json, EN + TR aynı yapıda,
// iletişim privacy@embersofvaldoria.com. Kişisel e-posta denetimi tests/diag-notice-text.test.ts içinde (data/ ve src/ taranır).
type Lang = 'en' | 'tr';
type T = { title: string; intro: string[]; detailsLabel: string; details: Array<{ heading: string; text: string }>; checkbox: string; language: string };
const L = notice as unknown as Record<Lang, T> & { contact: string };

describe('Hesap gizlilik metni (account-notice.json)', () => {
  it('iletişim adresi ve iki dil aynı yapıda', () => {
    expect(L.contact).toBe('privacy@embersofvaldoria.com');
    expect(ACCOUNT_NOTICE_CONTACT).toBe(L.contact);
    for (const k of ['en', 'tr'] as const) {
      const t = L[k];
      expect(t.title.length, k).toBeGreaterThan(3);
      expect(t.intro.length, k).toBe(2);
      expect(t.details.length, k).toBe(10);
      for (const p of t.intro) expect(p.length, `${k} giriş kısa`).toBeLessThanOrEqual(160);
      for (const d of t.details) {
        expect(d.heading.length, k).toBeGreaterThan(2);
        expect(d.text.length, k).toBeGreaterThan(20);
      }
      expect(Object.keys(t).sort(), k).toEqual(Object.keys(L.en).sort());
    }
    expect(L.en.language).toBe('Türkçe');
    expect(L.tr.language).toBe('English');
  });

  it('zorunlu onay kutusu etiketi', () => {
    expect(L.en.checkbox).toBe('I have read the privacy notice');
    expect(L.tr.checkbox.length).toBeGreaterThan(5);
  });

  it('içerik: sağlayıcılar, toplananlar, toplanmayanlar, Cloudflare, saklama, silme, yaş, haklar', () => {
    const en = L.en.details.map((d) => d.text).join(' ');
    expect(en).toMatch(/\{contact\}/);
    expect(en).toMatch(/Google/);
    expect(en).toMatch(/Discord/);
    expect(en).toMatch(/display name/);
    expect(en).toMatch(/hash/);
    expect(en).toMatch(/cloud save/);
    expect(en).toMatch(/No email address, profile picture/);
    expect(en).toMatch(/IP addresses/);
    expect(en).toMatch(/user agent/);
    expect(en).toMatch(/Access tokens/);
    expect(en).toMatch(/multiplayer and leaderboards/);
    expect(en).toMatch(/Cloudflare, Inc\./);
    expect(en).toMatch(/outside Türkiye/);
    expect(en).toMatch(/24 months/);
    expect(en).toMatch(/30 days/);
    expect(en).toMatch(/Delete account/);
    expect(en).toMatch(/support ID/);
    expect(en).toMatch(/13 or older/);
    expect(L.en.details.at(-1)!.heading).toMatch(/KVKK Art\. 11 \/ GDPR/);
    const tr = L.tr.details.map((d) => d.text).join(' ');
    expect(tr).toMatch(/\{contact\}/);
    expect(tr).toMatch(/24 ay/);
    expect(tr).toMatch(/30 gün/);
    expect(tr).toMatch(/13 yaş/);
    expect(tr).toMatch(/Cloudflare, Inc\./);
    expect(L.tr.details.at(-1)!.heading).toMatch(/KVKK md\. 11 \/ GDPR/);
  });

  it('accountNoticeText: {contact} doldurulur', () => {
    for (const k of ['en', 'tr'] as const) {
      const t = accountNoticeText(k);
      const all = [...t.intro, ...t.details.map((d) => d.text)].join(' ');
      expect(all).not.toMatch(/\{contact\}/);
      expect(all).toContain('privacy@embersofvaldoria.com');
    }
  });

  it('hata raporu metni artık yalnızca raporlar için "hesap/kayıt gönderilmez" diyor', () => {
    const d = diagNotice as unknown as Record<Lang, T>;
    expect(d.en.intro[1]).toMatch(/^When on, .*Reports never include your name, account, save data/);
    expect(d.en.intro.join(' ')).not.toMatch(/is ever sent/);
    expect(d.tr.intro[1]).toMatch(/Raporlarda ad, hesap, kayıt verisi/);
  });
});

describe('public/privacy.html', () => {
  it('üretici çıktısıyla aynı (JSON değiştiyse: node tools/gen-privacy-page.mjs)', async () => {
    const { readFileSync } = await import('node:fs');
    // @ts-expect-error: .mjs araç modülünün tip bildirimi yok
    const gen = (await import('../tools/gen-privacy-page.mjs')) as { buildPrivacyPage: () => string; PRIVACY_PAGE_PATH: string };
    const norm = (s: string): string => s.replace(/\r\n/g, '\n');
    const html = norm(readFileSync(gen.PRIVACY_PAGE_PATH, 'utf8'));
    expect(html).toBe(norm(gen.buildPrivacyPage()));
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/italic|<em>|<i>/i);
    expect(html).toContain('id="en"');
    expect(html).toContain('id="tr"');
    expect(html).toContain('mailto:privacy@embersofvaldoria.com');
  });
});
