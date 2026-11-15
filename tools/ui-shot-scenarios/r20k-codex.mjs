// a14 Codex madde geçişi.
import { menuClick, castV } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  const cast = castV(shot, wait, view);
  await menuClick(page, 'Codex');
  await wait(9000);
  await shot('codex-0');
  const items = page.locator('.cx-row');
  console.log('codex öğe', await items.count());
  await shot.slow(0.2);
  await items.nth(2).click({ timeout: 5000 }).catch((e) => console.log('codex', e.message.split('\n')[0]));
  await cast('codex-gecis', 600, 60, 3);
  await shot.slow(1);
  await wait(500);
  await shot.slow(0.2);
  await items.nth(4).click({ timeout: 5000 }).catch((e) => console.log('codex', e.message.split('\n')[0]));
  await cast('codex-gecis2', 600, 60, 3);
  await shot.slow(1);
};
