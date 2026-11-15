import { dbg, dismiss, tutorialsOff } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await tutorialsOff(page);
  await dbg(page, 'campaign.open');
  await wait(2500);
  await dismiss(page, wait);
  await wait(1500);
  await page.waitForSelector('.mw-card', { timeout: 25000 }).catch(() => {});
  await shot('picker-0');
  await page.locator('.mw-card').nth(1).click({ timeout: 8000 }).catch(() => {});
  await wait(800);
  await shot('picker-1-sel');
  await page.evaluate(() => { const b = document.querySelector('.mw-body, .mw-list'); console.log(b && b.className); });
};
