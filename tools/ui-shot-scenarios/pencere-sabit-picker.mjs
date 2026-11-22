// Kahraman seçici: (1) pencere dış kutusu her kahramanda aynı mı (ölçüm + çekim), (2) skill / pasif ipucu, (3) Recruit "Recommended" nedeni.
import { dbg, dismiss, tutorialsOff } from './_lib.mjs';
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10); }, sel);
const hide = (page) => page.addStyleTag({ content: '.debug-toggle{display:none!important}' });
async function open(page, wait, id) {
  await tutorialsOff(page);
  await dbg(page, id);
  await wait(3000);
  await dismiss(page, wait);
  await wait(1500);
  for (let i = 0; i < 40 && !(await page.locator('.mw-card').count()); i++) { await dismiss(page, wait); await wait(1500); }
  await page.waitForSelector('.mw-card', { timeout: 20000 });
  await hide(page);
}
async function tipOf(page, wait, sel, nth, name, shot) {
  const loc = page.locator(sel).nth(nth);
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.hover({ force: true });
  await wait(500);
  const t = await page.evaluate(() => { const w = document.querySelector('.gr-sktip-fl, .bt'); if (!w) return null; const r = w.getBoundingClientRect(); return { text: w.textContent.slice(0, 110), rect: [r.x, r.y, r.width, r.height].map(Math.round), inView: r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
  await shot(name);
  await page.mouse.move(2, 2);
  await wait(300);
  return t;
}
export default async ({ page, shot, wait, view }) => {
  const mode = process.env.SCEN ?? 'choose';
  if (mode === 'choose') {
    await open(page, wait, 'campaign.open');
    const n = await page.locator('.mw-card').count();
    const rows = [];
    for (let i = 0; i < n; i++) {
      await page.locator('.mw-card').nth(i).click({ timeout: 8000 }).catch(() => {});
      await wait(900);
      rows.push({ name: await page.evaluate(() => document.querySelector('.mw-card.sel .nm')?.textContent), panel: await rect(page, '.mw-panel'), detail: await rect(page, '.hp-detail') });
      await shot(`hero${i}`);
    }
    const tips = [];
    tips.push(await tipOf(page, wait, '.hp-detail .hsk.pas', 0, 'tip-passive', shot));
    tips.push(await tipOf(page, wait, '.hp-detail .hsk:not(.pas)', 3, 'tip-ult', shot));
    console.log(view, 'CHOOSE', JSON.stringify(rows), 'TIPS', JSON.stringify(tips));
  } else {
    await open(page, wait, 'campaign.solo-ashford');
    const n = await page.locator('.mw-card').count();
    const rows = [];
    for (let i = 0; i < n; i++) {
      await page.locator('.mw-card').nth(i).hover({ force: true });
      await wait(500);
      const t = await page.evaluate(() => { const w = document.querySelector('.bt'); return w ? w.textContent : null; });
      rows.push({ i, name: await page.evaluate((k) => document.querySelectorAll('.mw-card')[k]?.querySelector('.nm')?.textContent, i), rec: await page.evaluate((k) => !!document.querySelectorAll('.mw-card')[k]?.querySelector('.hp-rec'), i), tip: t, panel: await rect(page, '.mw-panel') });
      if (i === 0) await shot('rec-tip-row0');
      if (i === n - 1) await shot('rec-tip-rowLast');
    }
    await page.mouse.move(2, 2);
    const tips = [];
    tips.push(await tipOf(page, wait, '.hp-detail .hsk.pas', 0, 'rec-tip-passive', shot));
    tips.push(await tipOf(page, wait, '.hp-detail .hsk:not(.pas)', 1, 'rec-tip-skill2', shot));
    console.log(view, 'RECRUIT', JSON.stringify(rows), 'TIPS', JSON.stringify(tips));
  }
};
