import { dbg, closeLoot } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await dbg(page, 'campaign.solo-ashford');
  await wait(3000);
  await page.evaluate(() => { document.querySelectorAll('[aria-label="Skip"]').forEach((b) => b.click()); });
  await wait(1500);
  await closeLoot(page, wait);
  console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.mw-panel, .mw-body, .mw-split, .hp-detail, .hc, .mw-acts')].map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return [e.className.toString().slice(0, 40), Math.round(r.y), Math.round(r.height), cs.overflowY, cs.display, e.scrollHeight]; }))));
  await page.locator('.mw-card').nth(1).click({ timeout: 6000 }).catch(() => {});
  await wait(800);
  await shot('rc-sel');
};
