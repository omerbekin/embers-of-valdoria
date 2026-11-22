// Tüccar yanında Gear (çift pencere) başlığı: telefonda "GEAR" sekmelere yapışmasın.
import { dbg, startCampaign, domClick } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  for (let i = 0; i < 3; i++) await dbg(page, 'campaign.give-gold');
  await dbg(page, 'campaign.shop'); await wait(3000);
  for (let i = 0; i < 25 && !(await page.locator('.gr-panel').count()); i++) { await page.evaluate(() => { const b = document.querySelector('.cin-end-go') ?? document.querySelector('[aria-label="Skip"]'); b?.click(); }); await wait(1200); }
  await wait(1500);
  await domClick(page, 'Browse wares'); await wait(2000);
  await page.addStyleTag({ content: '.debug-toggle{display:none!important}' });
  await shot('gear-cift');
  console.log(await page.evaluate(() => [...document.querySelectorAll('.gr-pair .gr-lhead')].map((h) => [h.querySelector('.gr-title') && getComputedStyle(h.querySelector('.gr-title')).display, !!h.querySelector('.gr-headtabs')])));
};
