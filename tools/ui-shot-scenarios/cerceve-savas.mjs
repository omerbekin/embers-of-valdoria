// Çerçeve kontrolü: gerçek sefer savaşı, debug düğmesi gizli; dost sırasında portre + (telefonda) birim kartı. Kullanım: ui-shot.mjs cerceve-savas.mjs --view 1920x1080,844x390
import { startCampaign } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').launchBattle());
  await wait(6000);
  await page.evaluate(() => document.querySelectorAll('button').forEach((b) => { if (b.textContent === 'DEBUG') b.style.display = 'none'; }));
  await shot('cerceve-savas-0');
  await page.evaluate(() => { const sc = window.__game.scene.getScenes(true).find((s) => s.pinCardOf); const ids = [...document.querySelectorAll('.bh-cell')].map((c) => c.dataset.uid); for (const id of ids.slice(0, 2)) sc.pinCardOf(id); });
  await wait(1500);
  await shot('cerceve-savas-1-kartlar');
};
