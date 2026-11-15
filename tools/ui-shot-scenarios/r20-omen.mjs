// Omen elmas parlaması: kritik +2 (iki elmas arka arkaya), normal +1.
import { startCampaign, scene } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').launchBattle());
  await wait(12000);
  await shot.slow(0.08);
  await scene(page, 'BattleScene', (sc) => { const v = [...sc.views.values()].find((x) => x.unit?.side === 'enemy' || true); window.__v = [...sc.views.values()].filter((x) => x.setSeals); const t = window.__v[window.__v.length - 1]; t.setSeals({ stacks: 3, max: 5, turns: 3, color: '#b36bff' }); t.glowSeals(1, 2, true); });
  await shot.cast("omen", 1500, 90);
  await shot.slow(1);
};
