// Boss telgrafı: Unblockable rozeti birimlerin önünde okunur mu + ışık perdesi.
import { startCampaign, scene } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').launchBattle());
  await wait(12000);
  await scene(page, 'BattleScene', (sc) => sc.showTelegraph('t1', 'breaking_span', 'area', 'party', [0, 1, 3, 4]));
  await wait(1200);
  await shot('tele');
};
