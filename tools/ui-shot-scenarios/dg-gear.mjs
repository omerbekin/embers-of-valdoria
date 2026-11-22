// Doğrulama 5+6: gear uyarı barı gerçek tetikleyici (takılamayan item'a çift tık / sürükleme) + ganimet çantası satırları.
import { HIDE, startCampaign, jumpBefore } from './_dg.mjs';
import { dbg, giveLoot, closeLoot, dismiss } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  await page.addStyleTag({ content: HIDE });
  await startCampaign(page, wait, { idx: 0 });
  await jumpBefore(page, wait, 'dr', 'dr29');
  await page.addStyleTag({ content: HIDE });
  // 6: ganimet penceresi (çanta)
  await giveLoot(page, 'epic');
  await wait(3500);
  await dismiss(page, wait);
  await page.addStyleTag({ content: HIDE });
  const lm = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.gr-bag [data-item], .gr-panel [data-item]')];
    const rect = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
    const grid = document.querySelector('.gr-bag, .gr-bagwrap');
    const ys = new Set(cells.map((c) => Math.round(c.getBoundingClientRect().top)));
    const xs = new Set(cells.map((c) => Math.round(c.getBoundingClientRect().left)));
    const allSlots = [...document.querySelectorAll('[class*="gr-cell"], [class*="gr-slot"]')].filter((e) => e.getBoundingClientRect().width > 20);
    const sy = new Set(allSlots.map((c) => Math.round(c.getBoundingClientRect().top))), sx = new Set(allSlots.map((c) => Math.round(c.getBoundingClientRect().left)));
    return { items: cells.length, rowsItems: ys.size, colsItems: xs.size, slotRows: sy.size, slotCols: sx.size, grid: grid ? rect(grid) : null, vp: [innerWidth, innerHeight], hdr: document.querySelector('.gr-bag-head, .gr-bagcap')?.textContent };
  });
  console.log('ganimet çantası', JSON.stringify(lm));
  await shot('ganimet-canta');
  await closeLoot(page, wait);
  await wait(1500);
  // 5: gear
  await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').openGear?.());
  await wait(2500);
  await dismiss(page, wait);
  await page.addStyleTag({ content: HIDE });
  console.log('gear açık', await page.evaluate(() => !!document.querySelector('.gr-overlay')), await page.evaluate(() => [...document.querySelectorAll('.gr-tab')].map((t) => t.textContent)));
  const bag = await page.evaluate(() => [...document.querySelectorAll('.gr-overlay [data-item]')].map((e) => e.dataset.item).slice(0, 40));
  console.log('torba', JSON.stringify(bag));
  await page.evaluate(() => { const o = window.setTimeout.bind(window); window.setTimeout = (f, ms, ...a) => o(f, ms === 2600 ? 60000 : ms, ...a); });
  let hit = null;
  const cells = page.locator('.gr-overlay [data-item]');
  const n = await cells.count();
  for (let i = 0; i < n && !hit; i++) {
    const c = cells.nth(i);
    if (!(await c.isVisible().catch(() => false))) continue;
    await c.dblclick({ timeout: 2000 }).catch(() => {});
    await wait(350);
    const w = await page.evaluate(() => { const b = document.querySelector('.ui-warn.on'); return b ? b.textContent : null; });
    if (w) hit = { i, w, item: await c.getAttribute('data-item') };
  }
  console.log('uyarı', JSON.stringify(hit));
  if (hit) {
    const geo = await page.evaluate(() => { const b = document.querySelector('.ui-warn.on'); const p = b.parentElement; const r = b.getBoundingClientRect(), q = p.getBoundingClientRect(); const cs = getComputedStyle(b); return { bar: [r.left, r.top, r.right, r.bottom].map(Math.round), panel: [q.left, q.top, q.right, q.bottom].map(Math.round), bg: cs.backgroundColor, op: cs.opacity, host: p.className }; });
    console.log('bar', JSON.stringify(geo));
    await page.mouse.move(3, 3);
    await shot.burst('gear-uyari-b', 60, 4);
    console.log('bar sonra', JSON.stringify(await page.evaluate(() => { const b = document.querySelector('.ui-warn'); const r = b.getBoundingClientRect(); return { r: [r.left, r.top, r.right, r.bottom].map(Math.round), op: getComputedStyle(b).opacity, bg: getComputedStyle(b).backgroundColor, on: b.classList.contains('on') }; })));
  } else await shot('gear-uyari-yok');
};
