// Guild Hall: X sonrası uzaklaşıp dönünce olay yeniden soruluyor mu (gerçek dokunuşlar).
import { HIDE, startCampaign, jumpBefore, tapNode, pressCard, winState, stepNow } from './_dg.mjs';
export default async ({ page, shot, wait }) => {
  await page.addStyleTag({ content: HIDE });
  await startCampaign(page, wait, { idx: 0 });
  await jumpBefore(page, wait, 'dr', 'dr31');
  await page.addStyleTag({ content: HIDE });
  await tapNode(page, wait, 'dr31'); await pressCard(page, wait);
  for (let i = 0; i < 20; i++) { await wait(700); if (await page.locator('.mw-win').count()) break; }
  await wait(1200);
  await page.locator('.nav-close, [aria-label="Close"]').first().click();
  await wait(2500);
  console.log('X sonrası', JSON.stringify(await stepNow(page)));
  await tapNode(page, wait, 'dr28'); console.log('kart dr28', await page.locator('.sbc-card').count());
  if (await page.locator('.sbc-acts button').count()) await pressCard(page, wait);
  await wait(6000);
  console.log('dr28 varış', JSON.stringify(await stepNow(page)), 'pencere', await page.locator('.mw-win').count());
  await shot('olay-dr31-geri-kasaba');
  console.log('kasaba butonları', await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 14)));
  await page.evaluate(async () => { const st = await import('/src/campaign/state.ts'); const sc = window.__game.scene.getScene('CampaignMapScene'); sc.commit(st.completeSimple(sc.s, 'town')); });
  await wait(2500);
  console.log('kasabadan çıkış', JSON.stringify(await stepNow(page)));
  await tapNode(page, wait, 'dr31'); console.log('kart dr31', await page.locator('.sbc-card').count());
  await pressCard(page, wait);
  for (let i = 0; i < 20; i++) { await wait(700); if (await page.locator('.mw-win').count()) break; }
  await wait(1200);
  console.log('dr31 dönüş', JSON.stringify(await stepNow(page)), JSON.stringify(await winState(page)));
  await shot('olay-dr31-geri-donunce');
};
