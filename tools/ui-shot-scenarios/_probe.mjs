import { dbg, startCampaign } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  console.log('scenes', await page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join()));
  await dbg(page, 'campaign.shop');
  await wait(7000);
  console.log('scenes', await page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join()));
  console.log('btn', await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.className + '|' + b.textContent.trim().slice(0, 20)).join(' ## ')));
  console.log('mw', await page.evaluate(() => [...document.querySelectorAll('[class*="mw-"],[data-drag]')].map((e) => e.className + '|' + (e.dataset.drag ?? '')).slice(0, 30).join(' ## ')));
  await shot('probe');
};
