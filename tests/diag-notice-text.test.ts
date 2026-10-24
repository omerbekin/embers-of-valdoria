import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import notice from '../data/privacy-notice.json';

// Hata raporu gizlilik metni (KVKK tarzı aydınlatma; Ömer 2026-10-16): TEK kaynak data/privacy-notice.json, EN + TR aynı yapıda,
// iletişim privacy@embersofvaldoria.com; kişisel e-posta hiçbir yerde yok.
type Lang = 'en' | 'tr';
const L = notice as unknown as Record<Lang, { title: string; intro: string[]; detailsLabel: string; details: Array<{ heading: string; text: string }>; toggle: string; language: string }> & { contact: string };

describe('Gizlilik metni (privacy-notice.json)', () => {
  it('iletişim adresi ve iki dil aynı yapıda', () => {
    expect(L.contact).toBe('privacy@embersofvaldoria.com');
    for (const k of ['en', 'tr'] as const) {
      const t = L[k];
      expect(t.title.length, k).toBeGreaterThan(3);
      expect(t.intro.length, k).toBe(2);
      expect(t.details.length, k).toBe(6);
      for (const p of t.intro) expect(p.length, `${k} giriş kısa`).toBeLessThanOrEqual(160);
      for (const d of t.details) expect(d.text.length, k).toBeGreaterThan(20);
    }
    expect(L.en.language).toBe('Türkçe');
    expect(L.tr.language).toBe('English');
  });

  it('KVKK başlıkları: sorumlu, ne/neden, toplanmayan, açık rıza, Cloudflare + 30 gün, md. 11 hakları + rapor kimliği', () => {
    const en = L.en.details.map((d) => d.text).join(' ');
    expect(en).toMatch(/\{contact\}/);
    expect(en).toMatch(/consent/i);
    expect(en).toMatch(/Cloudflare, Inc\./);
    expect(en).toMatch(/30 days/);
    expect(en).toMatch(/IP addresses are not stored/);
    expect(L.en.details.at(-1)!.heading).toMatch(/KVKK Art\. 11/);
    expect(en).toMatch(/report ID/);
    const tr = L.tr.details.map((d) => d.text).join(' ');
    expect(tr).toMatch(/\{contact\}/);
    expect(tr).toMatch(/Açık rıza/i);
    expect(tr).toMatch(/30 gün/);
  });

  it('KVKK gözden geçirmesi (2026-10-25): veri sorumlusu, yurt dışı aktarım, pencere düğmeleri iki dilde, tam metin bağlantısı', () => {
    const raw = notice as unknown as Record<Lang, Record<string, unknown> & { details: Array<{ heading: string; text: string; page?: string }> }>;
    expect(Object.keys(raw.tr).sort()).toEqual(Object.keys(raw.en).sort());
    raw.en.details.forEach((d, i) => expect(Object.keys(raw.tr.details[i]!).sort(), `madde ${i}`).toEqual(Object.keys(d).sort()));
    expect(raw.en.details[0]!.text).toBe('Data controller: Ömer Bekin (independent developer). Contact: {contact}.');
    expect(raw.tr.details[0]!.text).toBe('Veri sorumlusu: Ömer Bekin (bireysel geliştirici). İletişim: {contact}.');
    for (const k of ['en', 'tr'] as const) {
      const all = JSON.stringify(raw[k]);
      expect(all, k).not.toMatch(/Embers of Valdoria \(|may be outside|olabilir\)/);
      expect(all, k).not.toMatch(/standard contract|standart sözleşme|adequacy|yeterlilik|Kurul'a bildir/i);
      expect(String(raw[k].fullText), k).toContain('{link}');
      for (const f of ['on', 'off', 'continue', 'close']) expect(typeof raw[k][f], `${k}.${f}`).toBe('string');
    }
    expect(raw.en.details[4]!.text).toMatch(/data processor/);
    expect(raw.en.details[4]!.text).toMatch(/outside Türkiye, for example in the USA and the EU/);
    expect(raw.tr.details[4]!.text).toMatch(/veri işleyen/);
    // Sayfada "aşağıdaki anahtar" karşılıksız kalmasın
    expect(raw.en.details[3]!.page).toMatch(/the switch in Settings > Privacy in the game/);
    expect(raw.tr.details[3]!.page).toMatch(/oyundaki Settings > Privacy anahtarı/);
    expect(raw.tr.on).toBe('Açık');
    expect(raw.tr.continue).toBe('Devam');
  });

  it('kişisel e-posta adresi kodda, veride ve belgelerde yok', () => {
    const bad = ['omerbekinn', '@gmail'].map((s) => s.toLowerCase());
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : /\.(ts|json|md|css|html)$/.test(f) ? [p] : [];
      });
    const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    for (const f of [...walk(join(root, 'src')), ...walk(join(root, 'data')), ...walk(join(root, 'docs/arch'))]) {
      const txt = readFileSync(f, 'utf8').toLowerCase();
      for (const b of bad) expect(txt.includes(b), `${f}: ${b}`).toBe(false);
    }
  });
});
