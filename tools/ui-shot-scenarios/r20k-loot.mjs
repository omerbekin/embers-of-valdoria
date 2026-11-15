// a06 item uçuşu (tek tek al) ve "Take all" sırası: sefer ganimet ekranı.
import { startCampaign, giveLoot, castV } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  const cast = castV(shot, wait, view);
  await startCampaign(page, wait, { idx: 0 });
  await giveLoot(page, 'epic');
  await wait(4000);
  await shot('loot-oturdu');
  await shot.slow(0.2);
  await page.locator('[data-drag^="loot:"]').first().click({ timeout: 5000 }).catch((e) => console.log('satır', e.message.split('\n')[0]));
  await cast('loot-tek-ucus', 1400, 100, 4);
  await shot.slow(1);
  await wait(1200);
  await shot.slow(0.2);
  const ok = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /take all/i.test(x.textContent) && !x.disabled); if (b) b.click(); return !!b; });
  console.log('take all basildi', ok);
  await cast('loot-take-all', 3000, 150, 6);
  await shot.slow(1);
};
