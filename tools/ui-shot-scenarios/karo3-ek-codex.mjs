// Karo-3 grup mockup tamamlayıcı: Codex gezinti satırı, boş durum, filtre karoları (Codex geç yüklenebildiği için bekleyerek). KARO_OPT=A|B|C, KARO_OUT=<klasör>.
import { menuClick } from './_lib.mjs';
import { HIDE_DEBUG, domLoc, ring } from './karo2-lib.mjs';
export default async ({ page, wait }) => {
  await page.addStyleTag({ content: HIDE_DEBUG });
  await menuClick(page, 'Codex');
  await page.waitForSelector('.cx-navrow', { timeout: 40000 }).catch(() => {});
  await wait(2500);
  await page.addStyleTag({ content: HIDE_DEBUG });
  await page.locator('.cx-navrow').nth(1).hover({ timeout: 3000 }).catch(() => {});
  await wait(600);
  await ring(page, await domLoc(page, '.cx-navrow.on .el-dia'), 'menu-codex-01');
  for (const i of [1, 3]) {
    await page.locator('.cx-navrow').nth(i).click({ timeout: 3000 }).catch(() => {});
    await wait(1800);
    if (i === 1) await ring(page, await domLoc(page, '.cx-empty .el-dia'), 'menu-codex-1-01');
    else { await page.waitForSelector('.cx-filters > summary', { state: 'visible', timeout: 15000 }).catch(() => {}); await wait(800); }
    if (i === 3) await ring(page, await domLoc(page, '.cx-filters > summary', { pseudo: '::before' }), 'menu-codex-3-01');
  }
};
