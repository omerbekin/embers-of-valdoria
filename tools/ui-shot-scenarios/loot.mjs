// a07 Rare ışık süpürmesi (rare ganimet), a06 item uçuşu (tek tek al + Take all), a05 altın sayacı.
import { startCampaign, giveLoot, domClick } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await startCampaign(page, wait, { idx: 0 });
  await shot.slow(0.25);
  await giveLoot(page, 'rare');
  await shot.cast('loot-a07-giris', 3000, 150); // satırlar kayarak girer, rare satırda ışık süpürmesi
  await shot.slow(1);
  await wait(1500);
  await shot('loot-a07-oturdu');
  await shot.slow(0.2);
  await page.locator('[data-drag^="loot:"]').first().click({ timeout: 5000 }).catch((e) => console.log('satır tıklanamadı', e.message.split('\n')[0]));
  await shot.cast('loot-a06-ucus', 1200, 100); // item çantaya uçar
  await shot.slow(1);
};
