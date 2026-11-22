import { HIDE, startCampaign, jumpBefore } from './_dg.mjs';
import { giveLoot, dismiss } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await page.addStyleTag({ content: HIDE });
  await startCampaign(page, wait, { idx: 0 });
  await jumpBefore(page, wait, 'dr', 'dr29');
  await giveLoot(page, 'epic');
  await wait(4500);
  await dismiss(page, wait);
  await page.addStyleTag({ content: HIDE });
  console.log(JSON.stringify(await page.evaluate(() => {
    const out = []; let e = document.querySelector('.gr-bagonly .gr-bag');
    for (let i = 0; e && i < 7; i++, e = e.parentElement) { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); out.push({ cls: e.className.slice(0, 40), top: Math.round(r.top), h: Math.round(r.height), sh: e.scrollHeight, ov: c.overflowY, disp: c.display, mh: c.maxHeight, ar: c.gridAutoRows }); }
    const cell = document.querySelector('.gr-bagonly .gr-bag > *'); const cr = cell?.getBoundingClientRect();
    return { out, cell: cr && [Math.round(cr.width), Math.round(cr.height)], kids: document.querySelectorAll('.gr-bagonly .gr-bag > *').length, vp: [innerWidth, innerHeight] };
  })));
  await shot('loot');
};
