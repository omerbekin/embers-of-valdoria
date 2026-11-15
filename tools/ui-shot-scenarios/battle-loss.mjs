// a03 yenilgi (soğuk ton): dost takımı öldür, düşman son vuruşu yapsın.
import { dbg, startCampaign } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').launchBattle());
  await wait(5000);
  await shot.slow(0.3);
  await dbg(page, 'tweak.damage-ohk');
  await dbg(page, 'tweak.damage-ohk');
  await dbg(page, 'battle.autoplay'); // oyuncu da vurur; kaybetmek için otomatiği kapat, sırayı atla
  await dbg(page, 'battle.autoplay');
  for (let i = 0; i < 4; i++) { await dbg(page, 'battle.skip-turn'); await wait(300); }
  await shot.cast('loss-1-vurus', 4000, 250);
  await shot.slow(0.5);
  await wait(2500);
  await shot.cast('loss-2-sonuc', 2400, 400);
};
