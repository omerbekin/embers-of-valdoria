// Karo galerisi: ana menü, Settings, Codex, Patch notes, Quick Battle takım seçimi. KARO_OUT=<klasör>. Her boyut ayrı koşulur.
import { menuClick, scene } from './_lib.mjs';
import { HIDE_DEBUG, autoRing, autoRingPhaser, hookPhaser, phaserLoc, domLoc, ring, ctxShot, saveManifest } from './karo2-lib.mjs';
export default async ({ page, wait, view }) => {
  await page.addStyleTag({ content: HIDE_DEBUG });
  await hookPhaser(page);
  // ana menü: PLAY satırı seçili (Phaser elmas)
  await scene(page, 'MainMenuScene', (sc) => { sc.menuRows.forEach((r) => r.setOn(false)); sc.menuRows[0].setOn(true); });
  await wait(600);
  const play = await phaserLoc(page, 'MainMenuScene', (sc) => { const r = sc.menuRows[0].root; const m = r.getWorldTransformMatrix(); return { x: m.tx + 10, y: m.ty, s: 16 }; });
  await ring(page, play, 'menu-ana-play');
  await ctxShot(page, play, 'menu-ana-play-tam');
  await autoRingPhaser(page, 'menu-ana');
  // Settings: kategori kor elmas (.st-flame) + satır elması
  await menuClick(page, 'Settings');
  await wait(1800);
  await autoRing(page, 'menu-settings');
  const row = page.locator('.st-row').nth(1);
  await row.hover({ timeout: 3000 }).catch(() => {});
  await page.evaluate(() => document.querySelectorAll('.st-row')[1]?.classList.add('on'));
  await wait(400);
  await autoRing(page, 'menu-settings-satir');
  await page.keyboard.press('Escape');
  await wait(1200);
  // Codex
  await menuClick(page, 'Codex');
  await wait(9000);
  await page.addStyleTag({ content: HIDE_DEBUG });
  await page.locator('.cx-navrow').nth(1).hover({ timeout: 3000 }).catch(() => {});
  await wait(500);
  await autoRing(page, 'menu-codex');
  // Codex içinde birkaç bölüm (liste madde imleri)
  for (let i = 1; i < 4; i++) {
    await page.locator('.cx-navrow').nth(i).click({ timeout: 3000 }).catch(() => {});
    await wait(1200);
    await autoRing(page, 'menu-codex-' + i);
  }
  await page.keyboard.press('Escape');
  await wait(1500);
  await page.keyboard.press('Escape');
  await wait(1000);
  // Quick Battle takım seçimi
  await menuClick(page, 'Play');
  await wait(2500);
  await autoRingPhaser(page, 'menu-play-kartlar');
  await scene(page, 'MainMenuScene', (sc) => sc.cards?.[1]?.run());
  await wait(5000);
  await page.addStyleTag({ content: HIDE_DEBUG });
  await autoRing(page, 'qb-takim');
  await ring(page, await domLoc(page, '.fb-cell.empty', { pseudo: '::after' }), 'qb-izgara');
  await autoRingPhaser(page, 'qb-takim', { limit: 16 });
  await ctxShot(page, { x: 10, y: 10, s: 1 }, 'qb-takim-tam');
  await saveManifest(view);
};
