// a03 son vuruş (zafer), a09 sıra şeridi, a17 sonuç sayıları: gerçek sefer savaşı, tek vuruşta öldürme + otomatik oyun.
import { dbg, startCampaign } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').launchBattle());
  await wait(5000);
  await shot('battle-0-basla');
  await shot.slow(0.3);
  await dbg(page, 'tweak.damage-ohk');
  await dbg(page, 'tweak.damage-ohk');
  await dbg(page, 'battle.autoplay');
  await shot.cast('battle-1-sira', 2400, 400); // a09 sıra şeridi
  await shot.cast('battle-2-vurus', 4000, 250); // a03 son vuruş + a04 ölüm
  await shot.slow(0.5);
  await wait(2500);
  await shot.cast('battle-3-sonuc', 3200, 400); // a17 sonuç sayıları
};
