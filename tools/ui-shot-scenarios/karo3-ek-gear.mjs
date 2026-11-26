// Karo-3 grup mockup tamamlayıcı: Gear item ipucu madde imi (.it-dia) ve bölücü ortası (.it-rule). KARO_OPT=A|B|C, KARO_OUT=<klasör>.
import { dbg, startCampaign, tutorialsOff, dismiss } from './_lib.mjs';
import { HIDE_DEBUG, domLoc, ring } from './karo2-lib.mjs';
export default async ({ page, wait }) => {
  await page.addStyleTag({ content: HIDE_DEBUG });
  await tutorialsOff(page);
  await startCampaign(page, wait, { idx: 0 });
  await page.addStyleTag({ content: HIDE_DEBUG });
  await wait(1500);
  await page.mouse.move(2, 2);
  await page.keyboard.press('Escape');
  await wait(1500);
  await ring(page, await domLoc(page, '.gm-rule i'), 'savas-menu-01');
  await page.keyboard.press('Escape');
  await wait(1000);
  for (let i = 0; i < 4; i++) await dbg(page, 'campaign.give-item');
  await dbg(page, 'campaign.gear');
  await wait(3000);
  await dismiss(page, wait);
  await page.addStyleTag({ content: HIDE_DEBUG });
  await page.locator('.gr-slot.gr-plate:not(.empty)').first().hover({ timeout: 4000 }).catch(() => {});
  await wait(1200);
  await ring(page, await domLoc(page, '.it-rule', { pseudo: '::after' }), 'gear-itemtip-01');
  await ring(page, await domLoc(page, '.it-line .it-dia', { pseudo: '::after' }), 'gear-itemtip-02');
};
