// Karo-2: Gear > Tree düğüm karoları önce / sonra. KARO_OUT=<klasör> PHASE=once|sonra. Her boyut ayrı koşulur.
import { startCampaign, dismiss, closeLoot, tutorialsOff } from './_lib.mjs';
import { HIDE_DEBUG, domLoc, ring } from './karo2-lib.mjs';
const PHASE = process.env.PHASE || 'sonra';
export default async ({ page, shot, wait }) => {
  await page.addStyleTag({ content: HIDE_DEBUG });
  await startCampaign(page, wait, { idx: 0 });
  await tutorialsOff(page);
  await page.evaluate(async () => {
    const cs = await import('/src/game/campaign-session.ts');
    const k = await import('/src/campaign/index.ts');
    const st = await import('/src/campaign/state.ts');
    let s = st.debugTeleport(cs.current(), '4');
    s = k.debugSetLevel ? k.debugSetLevel(s, 9) : s;
    cs.setState(s);
    window.__game.scene.getScene('CampaignMapScene').scene.start('CampaignMapScene');
  });
  await wait(3500); await dismiss(page, wait); await closeLoot(page, wait);
  await page.addStyleTag({ content: HIDE_DEBUG });
  await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').openGear?.());
  await wait(2500);
  await dismiss(page, wait);
  await page.locator('.gr-tab').nth(2).click({ timeout: 4000 }).catch(() => {});
  await wait(2000);
  const info = await page.evaluate(() => ({ f: document.querySelectorAll('.gt-nd.k-f').length, e: document.querySelectorAll('.gt-nd.k-e').length, v: document.querySelectorAll('.gt-nd.k-v').length, mk: document.querySelectorAll('.gt-mk').length, medal: document.querySelector('.gt-acts .sh-medal')?.textContent }));
  console.log('agac', JSON.stringify(info));
  await shot(`agac-${PHASE}`);
  await ring(page, await domLoc(page, '.gt-nd.k-f .dm', { pseudo: '::after' }), `agac-filler-${PHASE}`);
  await ring(page, await domLoc(page, '.gt-nd.k-e .dm', { pseudo: '::after' }), `agac-edge-${PHASE}`);
  await ring(page, await domLoc(page, '.gt-nd.k-v', { pseudo: '::after' }), `agac-evolve-${PHASE}`);
  await ring(page, await domLoc(page, '.gt-mk:not(.hide) i'), `agac-saga-${PHASE}`);
  await ring(page, await domLoc(page, '.gt-acts .sh-medal'), `agac-puan-${PHASE}`);
  // Sheet sekmesindeki stat puanı taşı elmas KALIR (karşılaştırma)
  await page.locator('.gr-tab').nth(1).click({ timeout: 4000 }).catch(() => {});
  await wait(1500);
  await ring(page, await domLoc(page, '.sh-medal'), `sheet-stat-puan-${PHASE}`);
};
