#!/usr/bin/env node
/**
 * public/privacy.html üretici (accounts-plan.md Faz 1c). Kaynak: data/account-notice.json + data/privacy-notice.json + data/privacy-page.json
 * (yalnızca sayfadaki ortak bölüm; maddede `page` varsa sayfa `text` yerine onu, `list` varsa altında madde listesi yazar) (TEK kaynak;
 * sayfayı elle düzenleme). Bağımsız statik sayfa: dış betik yok, italik yok, oyunun koyu Cinzel / EB Garamond görünümü, telefonda okunur.
 * Dil: #en (varsayılan) / #tr bağlantıları, CSS :target ile (JS yok). Yazı tipleri assets/fonts'tan public/fonts'a kopyalanır.
 * Kullanım: `node tools/gen-privacy-page.mjs` (JSON değişince çalıştır; çıktı commit'lenir). tests/account-notice-text.test.ts
 * çıktının güncel olduğunu denetler.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PRIVACY_PAGE_PATH = join(ROOT, 'public', 'privacy.html');
/** Sayfadaki "Last updated" tarihi: metin değiştikçe elle güncellenir (çıktı deterministik kalsın diye bugünün tarihi kullanılmaz). */
export const LAST_UPDATED = '2026-10-25';
const FONTS = ['Cinzel-normal-latin.woff2', 'Cinzel-normal-latin-ext.woff2', 'EBGaramond-normal-latin.woff2', 'EBGaramond-normal-latin-ext.woff2'];

const UI = {
  en: { page: 'Privacy', updated: 'Last updated', back: 'Play the game', other: 'Türkçe', otherId: 'tr' },
  tr: { page: 'Gizlilik', updated: 'Son güncelleme', back: 'Oyuna dön', other: 'English', otherId: 'en' },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function fill(text, contact) {
  return esc(text).split('{contact}').join(`<a href="mailto:${esc(contact)}">${esc(contact)}</a>`);
}

function noticeHtml(n, lang, id) {
  const t = n[lang];
  const parts = [`<section class="notice" aria-labelledby="${id}"><h2 id="${id}">${esc(t.title)}</h2>`];
  for (const p of t.intro) parts.push(`<p class="intro">${fill(p, n.contact)}</p>`);
  parts.push('<dl>');
  for (const d of t.details) {
    const list = d.list ? `<ul>${d.list.map((li) => `<li>${fill(li, n.contact)}</li>`).join('')}</ul>` : '';
    parts.push(`<dt>${esc(d.heading)}</dt><dd>${fill(d.page ?? d.text, n.contact)}${list}</dd>`);
  }
  parts.push('</dl></section>');
  return parts.join('\n');
}

function langHtml(account, diag, general, lang) {
  const u = UI[lang];
  return `<article class="lang" id="${lang}" lang="${lang}">
<header>
<p class="game">Embers of Valdoria</p>
<h1>${esc(u.page)}</h1>
<nav class="switch"><a href="#${u.otherId}" hreflang="${u.otherId}">${esc(u.other)}</a></nav>
<p class="updated">${esc(u.updated)}: ${LAST_UPDATED}</p>
</header>
${noticeHtml(account, lang, `${lang}-account`)}
${noticeHtml(diag, lang, `${lang}-reports`)}
${noticeHtml(general, lang, `${lang}-general`)}
<footer><a href="./">${esc(u.back)}</a></footer>
</article>`;
}

const CSS = `
@font-face{font-family:'Cinzel';font-weight:400 900;font-display:swap;src:url('fonts/Cinzel-normal-latin-ext.woff2') format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'Cinzel';font-weight:400 900;font-display:swap;src:url('fonts/Cinzel-normal-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212,U+FEFF,U+FFFD}
@font-face{font-family:'EB Garamond';font-weight:400 800;font-display:swap;src:url('fonts/EBGaramond-normal-latin-ext.woff2') format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'EB Garamond';font-weight:400 800;font-display:swap;src:url('fonts/EBGaramond-normal-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212,U+FEFF,U+FFFD}
:root{--bg:#120d09;--panel:#1a130d;--txt:#d9c8a2;--on:#f3d999;--muted:#a8977a;--gold:#d9b26a;--ember:#ffb35a;--line1:rgba(217,178,106,.16);--line2:rgba(217,178,106,.3);--line3:rgba(217,178,106,.55);
--display:Cinzel,Georgia,'Palatino Linotype',serif;--body:'EB Garamond',Georgia,'Palatino Linotype',serif}
*{box-sizing:border-box;font-style:normal}
html{background:var(--bg);-webkit-text-size-adjust:100%}
body{margin:0;background:radial-gradient(ellipse at 50% 0,#2a1c10 0,var(--bg) 60%) no-repeat,var(--bg);color:var(--txt);font:400 19px/1.55 var(--body)}
main{max-width:760px;margin:0 auto;padding:32px 16px 48px}
.lang{display:none}
#en{display:block}
#tr:target{display:block}
#tr:target~#en{display:none}
header{text-align:center;padding-bottom:20px;border-bottom:1px solid var(--line2);margin-bottom:8px}
.game{font:600 14px/1.2 var(--display);letter-spacing:.22em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}
h1{font:600 34px/1.15 var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--on);margin:0 0 14px;text-shadow:0 2px 4px rgba(12,8,5,.95)}
h2{font:600 22px/1.25 var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--on);margin:36px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line1)}
.switch a,footer a{display:inline-block;min-height:44px;padding:10px 18px;font:600 15px/24px var(--display);letter-spacing:.12em;text-transform:uppercase;color:var(--gold);text-decoration:none;border:1px solid var(--line2)}
.switch a:hover,.switch a:focus-visible,footer a:hover,footer a:focus-visible{color:var(--ember);border-color:var(--line3)}
.updated{font-size:15px;color:var(--muted);margin:14px 0 0}
.intro{color:var(--on);margin:0 0 10px}
dl{margin:18px 0 0}
dt{font:600 15px/1.3 var(--display);letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin:20px 0 4px}
dd{margin:0}
dd ul{margin:6px 0 0;padding-left:22px}
a{color:var(--ember);overflow-wrap:anywhere}
footer{text-align:center;margin-top:44px;padding-top:20px;border-top:1px solid var(--line2)}
@media (max-width:520px){body{font-size:18px}h1{font-size:26px}h2{font-size:18px}main{padding-top:22px}}
`;

/** Sayfa metnini üretir (yan etkisiz; test bunu dosyayla karşılaştırır). */
export function buildPrivacyPage() {
  const account = JSON.parse(readFileSync(join(ROOT, 'data', 'account-notice.json'), 'utf8'));
  const diag = JSON.parse(readFileSync(join(ROOT, 'data', 'privacy-notice.json'), 'utf8'));
  const general = JSON.parse(readFileSync(join(ROOT, 'data', 'privacy-page.json'), 'utf8'));
  return `<!doctype html>
<!-- ÜRETİLDİ: tools/gen-privacy-page.mjs (kaynak data/account-notice.json + data/privacy-notice.json + data/privacy-page.json). Elle düzenleme. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>Privacy | Embers of Valdoria</title>
<meta name="description" content="Privacy notice for Embers of Valdoria: accounts, cloud save and error reports.">
<style>${CSS}</style>
</head>
<body>
<main>
${langHtml(account, diag, general, 'tr')}
${langHtml(account, diag, general, 'en')}
</main>
</body>
</html>
`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  mkdirSync(join(ROOT, 'public', 'fonts'), { recursive: true });
  for (const f of FONTS) copyFileSync(join(ROOT, 'assets', 'fonts', f), join(ROOT, 'public', 'fonts', f));
  writeFileSync(PRIVACY_PAGE_PATH, buildPrivacyPage());
  console.log(`wrote ${PRIVACY_PAGE_PATH}`);
}
