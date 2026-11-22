// Tur 40: Settings kutu yüksekliği sayfalar arası (önce = eski kural enjekte, sonra = yeni). BEFORE=1 eski görünüm.
import { menuClick } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  await page.addStyleTag({ content: '.debug-toggle{display:none!important}' });
  if (process.env.BEFORE) await page.addStyleTag({ content: '.st-pages{display:block!important}.st-pages>.st-page{grid-area:auto}.st-overlay .st-pages>.st-page[hidden]{display:none!important}' });
  await menuClick(page, 'Settings'); await wait(1500);
  const n = await page.locator('.st-cat:visible').count();
  const out = [];
  for (let i = 0; i < n; i++) {
    await page.locator('.st-cat:visible').nth(i).click({ force: true }); await wait(900);
    out.push(await page.evaluate(() => { const r = (s) => { const b = document.querySelector(s)?.getBoundingClientRect(); return b ? [b.x, b.y, b.width, b.height].map((v) => Math.round(v)).join(',') : '-'; }; return { col: r('.st-col'), pages: r('.st-pages'), cats: r('.st-cats'), scrollH: document.querySelector('.st-col').scrollHeight }; }));
    if (i === 0 || i === 2) await shot(`settings-${process.env.BEFORE ? 'once' : 'sonra'}-${i}`);
  }
  console.log(view, process.env.BEFORE ? 'ONCE' : 'SONRA', JSON.stringify(out));
};
