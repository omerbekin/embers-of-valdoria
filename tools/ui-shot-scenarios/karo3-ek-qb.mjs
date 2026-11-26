// Karo-3 grup mockup tamamlayıcı: Quick Battle takım seçimi (Phaser karoları + ızgara hücresi) ve oyun içi Menu başlık süsü (.gm-rule). KARO_OPT=A|B|C, KARO_OUT=<klasör>.
import { scene } from './_lib.mjs';
import { HIDE_DEBUG, autoRingPhaser, hookPhaser, scanPhaser, domLoc, ring } from './karo2-lib.mjs';
export default async ({ page, wait }) => {
  await page.addStyleTag({ content: HIDE_DEBUG });
  await hookPhaser(page);
  await scene(page, 'MainMenuScene', (sc) => sc.cards?.[1]?.run());
  for (let i = 0; i < 30; i++) { await wait(1000); if ((await scanPhaser(page)).length >= 12) break; }
  await wait(1500);
  await page.addStyleTag({ content: HIDE_DEBUG });
  await autoRingPhaser(page, 'qb-takim', { limit: 16 });
  await ring(page, await domLoc(page, '.fb-cell.empty', { pseudo: '::after' }), 'qb-izgara');
  await page.mouse.move(2, 2);
  await page.locator('.menu-toggle:visible').first().click({ timeout: 4000 }).catch(() => {});
  await wait(1500);
  console.log('menu', await page.locator('.gm-rule').count());
  await ring(page, await domLoc(page, '.gm-rule i'), 'savas-menu-01');
};
