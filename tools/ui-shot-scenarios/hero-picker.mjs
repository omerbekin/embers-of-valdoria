// a15 kahraman seçici portre geçişi: satırlara hover + tıklama, geçiş ortasından kareler.
import { dbg, dismiss } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await dbg(page, 'campaign.open');
  await wait(2500);
  await dismiss(page, wait);
  await wait(1500);
  await shot('picker-start');
  await page.locator('.mw-card').nth(1).hover();
  await shot.cast('picker-hover', 300, 60);
  await page.locator('.mw-card').nth(2).click();
  await shot.cast('picker-click', 300, 60);
  await wait(400);
  await shot('picker-end');
};
