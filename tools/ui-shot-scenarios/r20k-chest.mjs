// a06 sandık: dokununca açılış, item'ler 300 ms arayla tek tek, "Take all" düğmesi ve alınca item'lerin çantaya uçuşu (debug > Open chest scene).
import { dbg, startCampaign, castV } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  const cast = castV(shot, wait, view);
  await startCampaign(page, wait, { idx: 0 });
  await dbg(page, 'campaign.chest');
  await wait(2500);
  await shot('chest-0-kapali');
  await shot.slow(0.2);
  const [w, h] = view.split('x').map(Number);
  await page.mouse.click(w / 2, h / 2);
  await cast('chest-1-acilis', 3000, 150, 8);
  await shot.slow(1);
  await wait(2500);
  await shot('chest-2-dugme');
  await shot.slow(0.2);
  const ok = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /take all|continue/i.test(x.textContent) && !x.disabled); if (b) b.click(); return b?.textContent.trim() ?? false; });
  console.log('dugme', ok);
  await cast('chest-3-take-all', 2400, 100, 6);
  await shot.slow(1);
};
