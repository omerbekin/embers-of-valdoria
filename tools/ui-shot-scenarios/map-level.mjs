// a12 seviye şeridi (başlıkla çakışma?) + parti Lv tik + altın halka.
import { dbg, startCampaign } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  await shot('level-0-before');
  await shot.slow(0.2);
  await dbg(page, 'campaign.xp'); // bir level ver, harita yenilenir, şerit çıkar
  await shot.cast('level-1-serit', 2200, 220);
  await shot.slow(1);
  await wait(1500);
  await shot('level-2-sonra');
};
