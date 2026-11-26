// Karo galerisi düzeltme: alt uyarı şeridi (.ui-warn), Form your company boş yuva karosu (host ortası). KARO_OUT=<klasör>.
import { startCampaign, tutorialsOff, scene } from './_lib.mjs';
import { HIDE_DEBUG, autoRing, domLoc, ring } from './karo2-lib.mjs';
export default async ({ page, wait }) => {
  await page.addStyleTag({ content: HIDE_DEBUG });
  await tutorialsOff(page);
  await page.evaluate(async () => { (await import('/src/ui/bottom-warn.ts')).showBottomWarn(document.getElementById('ui-root') ?? document.body, 'Pick a hero first.', { ms: 20000 }); });
  await wait(700);
  await autoRing(page, 'fix-uyari');
  await startCampaign(page, wait, { idx: 0 });
  await page.addStyleTag({ content: HIDE_DEBUG });
  await scene(page, 'CampaignMapScene', (sc) => sc.companyModal(4));
  await wait(2000);
  const loc = await domLoc(page, '.cw-empty', { at: 'c' });
  await ring(page, loc && { ...loc, s: 12 }, 'fix-sirket-bos');
};
