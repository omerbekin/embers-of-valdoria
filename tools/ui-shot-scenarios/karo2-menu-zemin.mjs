// Karo-2 menü mockup zemini: gerçek ana menü (PLAY seçili, karo gizli) ve Settings (kategori seçili, kor elmas gizli) ekranlarını
// public/mockups/menu-thread/ altına WebP zemin + satır konumları (JSON) olarak kaydeder. Mockup (menu-thread.html) bunların üstüne çizer.
// MT_OUT=<public/mockups/menu-thread>. Her boyut ayrı koşulur.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { menuClick, scene } from './_lib.mjs';
import { HIDE_DEBUG, phaserLoc } from './karo2-lib.mjs';
const OUT = resolve(process.env.MT_OUT || 'public/mockups/menu-thread');
mkdirSync(OUT, { recursive: true });
export default async ({ page, wait, view }) => {
  await page.addStyleTag({ content: HIDE_DEBUG });
  await page.addStyleTag({ content: '#boot-loader,.fs-btn,[class*="fullscreen"]{display:none!important}' });
  await wait(1500);
  // ana menü: PLAY seçili, elması gizli (satır kökünün 3. çocuğu = elmas grafiği)
  await scene(page, 'MainMenuScene', (sc) => { sc.menuRows.forEach((r, i) => r.setOn(i === 0)); });
  await wait(700);
  await scene(page, 'MainMenuScene', (sc) => { sc.menuRows[0].root.list[2].setVisible(false); });
  await wait(300);
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const r = await phaserLoc(page, 'MainMenuScene', (sc, k) => {
      const row = sc.menuRows[k].root;
      const m = row.getWorldTransformMatrix();
      const text = row.list.find((o) => o.type === 'Text');
      const line = row.list[1];
      return { x: m.tx, y: m.ty, s: 1, tx: text ? text.x + 8 : 46, tw: text ? text.width - 16 : 100 };
    }, i);
    rows.push(r);
  }
  // satır ölçüleri dünya biriminde: ekran ölçeği = phaserLoc s (1 dünya px)
  const meta = await phaserLoc(page, 'MainMenuScene', (sc) => {
    const row = sc.menuRows[0].root;
    const m = row.getWorldTransformMatrix();
    const text = row.list.find((o) => o.type === 'Text');
    const zone = row.list.find((o) => o.type === 'Zone');
    return { x: m.tx + text.x + 8, y: m.ty, s: 1, w: text.width - 16, zw: zone ? zone.width - 40 : 400, fs: parseFloat(text.style.fontSize) };
  });
  const tEnd = await phaserLoc(page, 'MainMenuScene', (sc) => { const row = sc.menuRows[0].root; const m = row.getWorldTransformMatrix(); const text = row.list.find((o) => o.type === 'Text'); return { x: m.tx + text.x + text.width - 8, y: m.ty, s: 1 }; });
  meta.w = tEnd.x - meta.x;
  meta.fs = await scene(page, 'MainMenuScene', (sc) => parseFloat(sc.menuRows[0].root.list.find((o) => o.type === 'Text').style.fontSize));
  const k = meta.s; // ekran px / dünya px
  const menu = { textX: meta.x, y: meta.y, textW: meta.w, rowW: 0, k };
  menu.rowW = (await phaserLoc(page, 'MainMenuScene', (sc) => { const row = sc.menuRows[0].root; const m = row.getWorldTransformMatrix(); const zone = row.list.find((o) => o.type === 'Zone'); return { x: m.tx + (zone ? zone.width - 40 : 400), y: m.ty, s: 1 }; })).x;
  menu.rowX = rows[0].x;
  menu.rowH = Math.abs(rows[1].y - rows[0].y);
  menu.fs = meta.fs * k;
  const shotMenu = await page.screenshot({ type: 'png' });
  await sharp(shotMenu).webp({ quality: 82 }).toFile(`${OUT}/menu-${view}.webp`);
  // Settings: ilk kategori seçili, kor elmas (st-flame) ve satır elmasları gizli
  await scene(page, 'MainMenuScene', (sc) => { sc.menuRows[0].root.list[2].setVisible(true); });
  await menuClick(page, 'Settings');
  await wait(1800);
  await page.addStyleTag({ content: '.st-flame{display:none!important}.st-diamond::before{display:none!important}' });
  await wait(300);
  const set = await page.evaluate(() => {
    const cat = document.querySelector('.st-cat.on');
    const lab = cat?.querySelector('.st-cat-label');
    const dia = cat?.querySelector('.st-diamond');
    const r = cat.getBoundingClientRect(), l = lab.getBoundingClientRect(), d = dia.getBoundingClientRect();
    const cs = getComputedStyle(lab);
    return { rowX: r.left, rowW: r.width, y: r.top + r.height / 2, rowH: r.height, textX: l.left, textW: l.width, diaX: d.left, fs: parseFloat(cs.fontSize), cats: [...document.querySelectorAll('.st-cat')].map((c) => { const b = c.getBoundingClientRect(); return b.top + b.height / 2; }) };
  });
  const shotSet = await page.screenshot({ type: 'png' });
  await sharp(shotSet).webp({ quality: 82 }).toFile(`${OUT}/settings-${view}.webp`);
  writeFileSync(`${OUT}/pos-${view}.json`, JSON.stringify({ view, menu, settings: set }, null, 1));
  console.log('zemin', view, JSON.stringify({ menu, set }));
};
