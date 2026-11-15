import { startCampaign, scene } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  await shot.slow(0.2);
  await scene(page, 'CampaignMapScene', (sc) => { window.__log = []; const t0 = performance.now(); const iv = setInterval(() => { const c = sc.cameras.main; window.__log.push([Math.round(performance.now() - t0), +c.zoom.toFixed(3), sc.scene.isActive()]); }, 100); setTimeout(() => clearInterval(iv), 4000); sc.launchBattle(); });
  await shot.cast('g', 1000, 50);
  await shot.slow(1);
  console.log(JSON.stringify(await page.evaluate(() => window.__log)));
};
