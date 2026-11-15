// a11 kasaba kor ışığı (ateş / fener) + a10 yoldaş katılımı (Ashford'da yoldaş seç, sol panelde satır kayar).
import { dbg, closeLoot, domClick } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await dbg(page, 'campaign.solo-ashford');
  await wait(3000);
  await page.evaluate(() => { document.querySelectorAll('[aria-label="Skip"]').forEach((b) => b.click()); });
  await wait(1500);
  await closeLoot(page, wait);
  await shot("town-0-yoldas-secimi");
  for (let i = 0; i < 5; i++) {
    await page.locator('.mw-card').nth(1).click({ timeout: 6000 }).catch(() => {});
    await wait(600);
    if (await page.locator('.mw-card.sel').count()) break;
  }
  await shot.slow(0.2);
  const clicked = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^(recruit|choose|confirm|join)/i.test(x.textContent.trim()) && !x.disabled); if (b) b.click(); return b?.textContent.trim() ?? null; });
  console.log('onay düğmesi', clicked);
  await shot.cast('town-1-katilim', 1500, 150); // satır soldan kayar + altın parıltı + "joins the company"
  await shot.slow(1);
  await wait(1200);
  await shot.cast('town-2-isik', 2000, 400); // kasaba ışık noktaları
};
