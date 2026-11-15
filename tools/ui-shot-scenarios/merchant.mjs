// a13 tüccar alımı (Odo): altın ver, dükkanı aç, ilk malı satın al.
import { dbg, startCampaign, closeLoot } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  for (let i = 0; i < 3; i++) await dbg(page, 'campaign.give-gold');
  await dbg(page, 'campaign.shop');
  await wait(3000);
  await shot('shop-0-acik');
  await page.locator('.gr-shop-scroll .gr-plate, [data-drag^="ware:"]').first().click({ timeout: 8000 }).catch((e) => console.log('mal', e.message.split('\n')[0]));
  await wait(500);
  await shot('shop-1-secili');
  await shot.slow(0.2);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().startsWith('Buy ·')); if (b) b.click(); });
  await shot.cast('shop-2-alim', 560, 70);
  await shot.slow(1);
  await wait(900);
  await shot('shop-3-sonra');
};
