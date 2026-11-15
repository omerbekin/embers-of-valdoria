// a19 You are here geçişi + a18 sis / yol çizimi: ilk durağı "kazan", komşuya yürü.
import { dbg, scene, startCampaign, closeLoot } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  await dbg(page, 'campaign.win'); // Mill Road kazanıldı: yollar açılır
  await wait(2500);
  await closeLoot(page, wait);
  await wait(800);
  await shot('walk-0-before');
  const to = await scene(page, 'CampaignMapScene', (sc) => [...sc.travelTargets().keys()][0] ?? null);
  console.log('hedef', to);
  await shot.slow(0.1);
  await scene(page, 'CampaignMapScene', (sc, id) => sc.march(id, false), to);
  await page.keyboard.press('Escape'); // kart yürüyüşü örtmesin
  await shot.cast('walk-1-yurur', 1200, 200);
  await shot.cast('walk-2-varis', 600, 100); // You are here geçişi + yeni yol çizimi
  await shot.slow(1);
  await wait(1500);
  await shot('walk-3-son');
};
