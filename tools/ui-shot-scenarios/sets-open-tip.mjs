// Set açılışı (2026-11-26): Debug > Give pilot sets, iki Kingsfall parçası takılı, torbadaki üçüncünün ipucu (set adı, eşikler, aktif bonus) + Odran ring ipucu (Potency).
import { dbg, dismiss, tutorialsOff } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await page.evaluate(() => { try { window.__game && (window.__game.sound.mute = true); } catch {} });
  await tutorialsOff(page);
  await dbg(page, 'campaign.solo-valdren');
  await wait(3000);
  await dismiss(page, wait);
  for (let i = 0; i < 6; i++) { await dbg(page, 'campaign.xp'); await wait(300); } // set parçaları Level 7+ ister
  await dismiss(page, wait);
  await dbg(page, 'campaign.give-sets');
  await dbg(page, 'campaign.gear');
  await wait(2500);
  await dismiss(page, wait);
  for (const id of ['kingsfall_crown', 'kingsfall_mantle']) {
    await page.locator(`.gr-overlay [data-item="${id}"]`).first().dblclick({ timeout: 4000 }).catch((e) => console.log('tak', id, e.message.split('\n')[0]));
    await wait(700);
  }
  // takılı parça (2 parça takılı): sayaç 2/3, (2) satırı etkin, (3) satırları soluk; torbadaki parçanın ipucu kendini takılı sayar (3/3, loadout.ts > affixContext)
  console.log('takili', await page.evaluate(() => [...document.querySelectorAll('.gr-overlay [data-item="kingsfall_crown"]')].map((e) => e.className).join(' | ')));
  for (const [id, name] of [['kingsfall_crown', 'ipucu-kingsfall-takili'], ['kingsfall_signet', 'ipucu-kingsfall'], ['odrans_ring', 'ipucu-odran']]) {
    const c = page.locator(`.gr-overlay [data-item="${id}"]`).first();
    await c.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    await c.hover({ timeout: 4000 }).catch((e) => console.log('hover', id, e.message.split('\n')[0]));
    await wait(1200);
    let tip = await page.evaluate(() => [...document.querySelectorAll('.item-tip')].find((t) => getComputedStyle(t).display !== 'none')?.textContent ?? null);
    if (!tip) { await c.click({ timeout: 3000 }).catch(() => {}); await wait(1200); tip = await page.evaluate(() => [...document.querySelectorAll('.item-tip')].find((t) => getComputedStyle(t).display !== 'none')?.textContent ?? null); }
    console.log(name, tip?.slice(0, 260), JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.item-tip .it-set-row')].filter((r) => r.offsetParent).map((r) => (r.classList.contains('on') ? 'ON ' : 'off ') + r.textContent.slice(0, 22)))));
    await shot(name);
    await page.mouse.move(5, 5);
    await wait(500);
  }
};
