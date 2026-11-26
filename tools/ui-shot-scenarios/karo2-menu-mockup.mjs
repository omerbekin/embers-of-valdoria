// Karo-2: menu-thread.html mockup kareleri (5 seçenek x ana menü / Settings; masaüstü menüde 3 karelik hareket dizisi). KARO_OUT=<klasör>.
import sharp from 'sharp';
import { resolve } from 'node:path';
const OUT = resolve(process.env.KARO_OUT || 'karo-out');
export default async ({ page, wait, view }) => {
  const base = page.url().split('/?')[0].replace(/\/$/, '');
  const phone = view === '844x390';
  for (const v of ['v1', 'v2', 'v3', 'v4', 'v5']) {
    for (const scr of ['menu', 'settings']) {
      const ts = scr === 'menu' && !phone ? [0.3, 0.9, 1.5] : [0.9];
      for (const t of ts) {
        await page.goto(`${base}/mockups/menu-thread.html#${v}&scr=${scr}&size=${view}&t=${t}`);
        await page.waitForTimeout(900);
        const buf = await page.screenshot({ type: 'png' });
        const name = `${v}-${scr}-${phone ? 'telefon' : view === '2580x1080' ? '21x9' : 'masaustu'}${ts.length > 1 ? '-t' + String(t).replace('.', '') : ''}`;
        await sharp(buf).jpeg({ quality: 86 }).toFile(`${OUT}/${name}.jpg`);
        // yakın kare (seçili satır çevresi, telefon 2x)
        const pos = await page.evaluate(async (sz) => (await fetch(`menu-thread/pos-${sz}.json`).then((r) => r.json())), view).catch(() => null);
        if (pos) {
          const p = scr === 'menu' ? { x: pos.menu.rowX, y: pos.menu.y, w: pos.menu.rowW - pos.menu.rowX } : { x: pos.settings.rowX, y: pos.settings.y, w: pos.settings.rowW };
          const W = Math.round(Math.min(phone ? 340 : 820, p.w + (phone ? 60 : 140))), H = phone ? 90 : 200;
          const x = Math.max(0, Math.round(p.x - (phone ? 20 : 60))), y = Math.max(0, Math.round(p.y - H / 2));
          const vp = page.viewportSize();
          await sharp(buf).extract({ left: x, top: y, width: Math.min(W, vp.width - x), height: Math.min(H, vp.height - y) }).resize({ width: Math.min(W, vp.width - x) * (phone ? 3 : 1), kernel: 'nearest' }).jpeg({ quality: 88 }).toFile(`${OUT}/${name}-yakin.jpg`);
        }
      }
    }
  }
  console.log('bitti', view);
};
