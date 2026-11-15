#!/usr/bin/env node
// Ekran görüntüsü aracı: her agent kendi GÖRÜNMEZ Chromium'unu açar (uygulama paneli gerekmez, 30 sn zaman aşımı yok).
//   node tools/ui-shot.mjs <senaryo.mjs> --url http://localhost:<port> --out <klasör> [--view 1280x720,844x390,1720x720]
// Senaryo: `export default async ({ page, shot, wait, view }) => { ... }` (her görünüm boyu için baştan çalışır).
//   shot(ad)                    -> <ad>-<WxH>.jpg
//   shot.burst(ad, ms, adet)    -> <ad>-<WxH>-01.jpg ... (kareler arası ms; animasyon ortası)
//   shot.slow(k) + shot.cast(ad, ms, aralık) -> yavaş çekimde arka arkaya kareler (<ad>-<WxH>-cNN.jpg); hızlı geçişler için
//   wait(ms)                    -> bekle
// Ses kapalı (eov.settings.v1 volume 0), ?debug=1 ile açılır, window.__game hazır olunca senaryo başlar.
// Geliştirme sunucusunu kendi portunda başlat (5173 / 5191 başkasının olabilir).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const url = opt('url', 'http://localhost:5173');
const out = resolve(opt('out', 'ui-shots'));
const views = opt('view', '1280x720,844x390').split(',').map((v) => v.trim()).filter(Boolean);
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('kullanım: node tools/ui-shot.mjs <senaryo.mjs> --url http://localhost:<port> --out <klasör> [--view 1280x720,844x390]');
  process.exit(1);
}
mkdirSync(out, { recursive: true });
const scenario = (await import(pathToFileURL(resolve(file)).href)).default;
const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = 0;
let count = 0;
try {
  for (const v of views) {
    const [width, height] = v.split('x').map(Number);
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: height < 500 && width < 1000 });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('eov.settings.v1', JSON.stringify({ volume: 0, steps: 20 }));
      localStorage.setItem('eov.diag.v1', JSON.stringify({ consent: false, noticed: true }));
    });
    await page.addInitScript(() => {
      // yavaş çekim: rAF zamanı ölçeklenir (Phaser), CSS / WAAPI animasyonlarının hızı düşürülür
      let k = 1, last = null, virt = 0;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => raf((t) => { if (last === null) { last = t; virt = t; } if (t !== last) { virt += (t - last) * k; last = t; } cb(virt); });
      setInterval(() => { if (k !== 1 || window.__slowDirty) { document.getAnimations().forEach((a) => { a.playbackRate = k; }); window.__slowDirty = k !== 1; } }, 25);
      window.__slowSet = (x) => { k = x; window.__slowDirty = true; };
    });
    page.on('pageerror', (e) => console.error(`[${v}] sayfa hatası: ${e.message.split('\n')[0]}`));
    const wait = (ms) => page.waitForTimeout(ms);
    const snap = async (name) => {
      await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 80 });
      count++;
    };
    const shot = (name) => snap(`${name}-${v}`);
    shot.burst = async (name, ms = 150, n = 5) => {
      for (let i = 1; i <= n; i++) {
        await snap(`${name}-${v}-${String(i).padStart(2, '0')}`);
        if (i < n) await page.waitForTimeout(ms);
      }
    };
    // shot.slow(k): oyun + sayfa animasyonlarını k kat yavaşlatır (1 = normal). Ekran görüntüsü ~0,5 sn sürdüğünden hızlı geçişi (100-400 ms)
    // yakalamak için TETİKLEMEDEN ÖNCE shot.slow(0.2), sonra shot.cast / burst, sonunda shot.slow(1).
    shot.slow = (k) => page.evaluate((x) => window.__slowSet?.(x), k);
    // shot.cast(ad, ms, aralık): yavaşlatılmış oyunda arka arkaya kare alır (ms/aralık kare, en çok 24); çıktı <ad>-<WxH>-cNN.jpg
    shot.cast = async (name, ms = 1500, every = 100) => {
      const n = Math.max(2, Math.min(24, Math.round(ms / every)));
      for (let i = 1; i <= n; i++) await snap(`${name}-${v}-c${String(i).padStart(2, '0')}`);
    };
    try {
      await page.goto(`${url}/?debug=1`, { timeout: 120000 });
      await page.waitForFunction(() => window.__game?.scene?.getScenes(true).length > 0, null, { timeout: 90000 });
      await page.waitForFunction(() => typeof window.__dbgRun === 'function', null, { timeout: 90000 }).catch(() => {}); // debug menüsü tembel yüklenir
      await page.waitForTimeout(1500);
      await scenario({ page, shot, wait, view: v });
    } catch (e) {
      console.error(`HATA [${v}]: ${e.message.split('\n')[0]}`);
      failed++;
      await snap(`_hata-${v}`).catch(() => {});
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(`${count} görüntü -> ${out}`);
if (failed) process.exitCode = 1;
