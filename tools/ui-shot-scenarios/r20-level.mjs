// a12 seviye şeridi: debug XP sonrası şerit ne kadar görünür kalıyor, kim kaldırıyor.
import { dbg, startCampaign } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  page.on('console', (m) => { if (/BANNER/.test(m.text())) console.log(m.text().slice(0, 900)); });
  await page.evaluate(() => {
    const rm = Element.prototype.remove;
    Element.prototype.remove = function () {
      if (this.classList && this.classList.contains('lv-banner')) console.log('BANNER-REMOVE ' + new Error().stack.split('\n').slice(1, 7).join(' | '));
      return rm.call(this);
    };
  });
  await dbg(page, 'campaign.xp');
  for (let i = 0; i < 8; i++) {
    await wait(400);
    const r = await page.evaluate(() => { const b = document.querySelector('.lv-banner'); if (!b) return null; const q = b.getBoundingClientRect(); return [b.textContent, Math.round(q.x), Math.round(q.y), Math.round(q.width), Math.round(q.height), getComputedStyle(b).opacity]; });
    console.log(i, JSON.stringify(r));
    if (r && i === 1) await shot('lv-banner');
  }
};
