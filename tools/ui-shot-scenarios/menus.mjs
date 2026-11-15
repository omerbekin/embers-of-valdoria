// a14 Codex, a20 Ayarlar sayfa geçişi, a16 Quick Battle takım seçimi: ana menüden.
import { domClick } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await shot('menu-0');
  await domClick(page, 'Settings');
  await wait(900);
  await shot('settings-0');
  const cats = page.locator('.st-cat');
  const n = await cats.count();
  for (let i = 1; i < Math.min(n, 4); i++) {
    await shot.slow(0.2);
    await cats.nth(i).click({ timeout: 5000 }).catch(() => {});
    await shot.cast(`settings-${i}`, 240, 60); // sayfa geçişi + kayan elmas
    await shot.slow(1);
    await wait(500);
  }
  await page.keyboard.press('Escape');
  await wait(800);
  await domClick(page, 'Codex');
  await wait(1500);
  await shot('codex-0');
  const items = page.locator('.cx-item, .codex button, .cdx-item, [class*=codex] button');
  console.log('codex öğe', await items.count());
  await shot.slow(0.2);
  await items.nth(2).click({ timeout: 5000 }).catch((e) => console.log('codex', e.message.split('\n')[0]));
  await shot.cast('codex-1', 300, 60);
  await shot.slow(1);
  await wait(500);
  await page.keyboard.press('Escape');
  await wait(800);
  await domClick(page, 'Play');
  await wait(1200);
  await shot('play-0');
  await shot.slow(0.2);
  await domClick(page, 'Quick Battle');
  await wait(2500);
  await shot.cast('qb-team', 1200, 150); // karo belirme / nefes
};
