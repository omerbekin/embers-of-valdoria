// Set açılışı (2026-11-26): Codex > Set items makalesi (Mechanics / Campaign).
import { menuClick } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await page.evaluate(() => { try { window.Phaser?.GAMES?.[0] && (window.Phaser.GAMES[0].sound.mute = true); window.__game && (window.__game.sound.mute = true); } catch {} });
  await menuClick(page, 'Codex');
  await page.waitForSelector('.cx-search-input', { timeout: 40000 }).catch(() => {});
  await wait(2500);
  await page.fill('.cx-search-input', 'Set items').catch((e) => console.log('arama', e.message.split('\n')[0]));
  await wait(1500);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.cx-row')].map((r) => r.textContent.trim()).slice(0, 12));
  console.log('satırlar', JSON.stringify(rows));
  await page.locator('.cx-row', { hasText: 'Set items' }).first().click({ timeout: 5000 }).catch((e) => console.log('satır', e.message.split('\n')[0]));
  await wait(2000);
  console.log('makale', await page.evaluate(() => document.querySelector('.cx-article')?.textContent.slice(0, 400)));
  await shot('codex-set-items');
  await page.evaluate(() => { const a = document.querySelector('.cx-article'); const sc = a && [a, ...a.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 20 && getComputedStyle(e).overflowY !== 'visible'); if (sc) sc.scrollTop = sc.scrollHeight * 0.55; });
  await wait(800);
  await shot('codex-set-items-alt');
};
