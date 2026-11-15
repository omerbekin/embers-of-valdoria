// a08 Gear sekme geçişi + kahraman değişimi (kenar parlaması).
import { dbg, domClick } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await dbg(page, 'campaign.solo-valdren'); // 2 kahramanlı sefer, Valdren Keep
  await wait(3000);
  await page.evaluate(() => { document.querySelectorAll('[aria-label="Skip"]').forEach((b) => b.click()); });
  await wait(1500);
  for (let i = 0; i < 4; i++) await dbg(page, 'campaign.give-item');
  await dbg(page, 'campaign.gear');
  await wait(2500);
  await shot('gear-0-acik');
  await shot.slow(0.2);
  await page.locator('.gr-tab').nth(1).click({ timeout: 8000 }).catch((e) => console.log('sekme', e.message.split('\n')[0]));
  await shot.cast('gear-1-sekme', 300, 50);
  await wait(300);
  await page.locator('.gr-hero').nth(1).click({ timeout: 8000 }).catch((e) => console.log('kahraman', e.message.split('\n')[0]));
  await shot.cast('gear-2-kahraman', 300, 50);
  await shot.slow(1);
  await wait(800);
  await shot('gear-3-son');
};
