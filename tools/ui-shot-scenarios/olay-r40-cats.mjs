import { menuClick } from './_lib.mjs';
export default async ({ page, wait, view }) => {
  await menuClick(page, 'Settings'); await wait(1500);
  const n = await page.locator('.st-cat:visible').count();
  for (const i of [0, n - 1]) {
    await page.locator('.st-cat:visible').nth(i).click({ force: true }); await wait(900);
    console.log(view, i, JSON.stringify(await page.evaluate(() => [...document.querySelector('.st-cats').children].map((c) => [c.className, c.hidden, Math.round(c.getBoundingClientRect().height), getComputedStyle(c).display]))));
  }
};
