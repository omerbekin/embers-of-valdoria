import { dbg } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await dbg(page, 'campaign.solo-valdren');
  await wait(3000);
  await page.evaluate(() => { document.querySelectorAll('[aria-label="Skip"]').forEach((b) => b.click()); });
  await wait(1500);
  await dbg(page, 'campaign.gear');
  await wait(2500);
  await shot('sheet-0-acik');
  await page.locator('.gr-tab').nth(1).click({ timeout: 8000 }).catch((e) => console.log('sekme', e.message.split('\n')[0]));
  await wait(1500);
  await shot('sheet-1-sekme1');
  await page.locator('.gr-tab').nth(0).click({ timeout: 8000 }).catch(() => {});
  await wait(1500);
  await shot('sheet-2-sekme0');
};
