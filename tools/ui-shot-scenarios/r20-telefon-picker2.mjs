import { dbg, dismiss, tutorialsOff } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await tutorialsOff(page);
  await dbg(page, 'campaign.open');
  await wait(2500);
  await dismiss(page, wait);
  await wait(1500);
  await page.waitForSelector('.mw-card', { timeout: 25000 }).catch(() => {});
  await page.locator('.mw-card').nth(1).click({ timeout: 8000 }).catch(() => {});
  await wait(1000);
  await shot('p-top');
  await page.evaluate(() => document.querySelectorAll('.mw-body').forEach((b) => { b.scrollTop = 9999; }));
  await wait(500);
  await shot('p-bottom');
};
