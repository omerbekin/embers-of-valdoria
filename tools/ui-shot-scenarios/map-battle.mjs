// a02 haritadan savaşa geçiş (yakınlaşma + kor karartma + küçük yükleme göstergesi), ardından a01 açılış bandı.
import { startCampaign, scene } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  await shot('mb-0-harita');
  await shot.slow(0.1);
  await scene(page, 'CampaignMapScene', (sc) => sc.launchBattle());
  await shot.cast('mb-1-gecis', 1500, 60);
  await shot.slow(1);
  await wait(1500);
  await shot.cast('mb-2-bant', 1500, 250);
};
