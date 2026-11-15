// a20 Ayarlar sayfa geçişi ve kor elmasın kayması.
import { menuClick, castV } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  const cast = castV(shot, wait, view);
  await menuClick(page, 'Settings');
  await wait(1200);
  await shot('settings-0');
  const cats = page.locator('.st-cat');
  const n = await cats.count();
  console.log('kategori', n);
  for (let i = 1; i < Math.min(n, 3); i++) {
    await shot.slow(0.2);
    await cats.nth(i).click({ timeout: 5000 }).catch((e) => console.log('kat', e.message.split('\n')[0]));
    await cast(`settings-${i}`, 480, 60, 4);
    await shot.slow(1);
    await wait(500);
  }
};
