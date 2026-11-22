// Doğrulama 8: Recruit penceresinde Recommended nedeni ipucu + skill ipucu (telefonda dokunma).
import { HIDE } from './_dg.mjs';
import { dbg, dismiss, closeLoot, tutorialsOff } from './_lib.mjs';
const tips = (page) => page.evaluate(() => {
  const out = [];
  for (const e of document.querySelectorAll('body *, #ui-root *')) {
    const cs = getComputedStyle(e);
    if ((cs.position === 'fixed' || cs.position === 'absolute') && /tip|band|bt-pop/i.test(e.className?.toString() ?? '') && e.getBoundingClientRect().width > 40 && cs.visibility !== 'hidden' && cs.opacity !== '0' && cs.display !== 'none') { const r = e.getBoundingClientRect(); out.push({ cls: e.className.toString().slice(0, 40), r: [r.left, r.top, r.right, r.bottom].map(Math.round), txt: e.textContent.slice(0, 80) }); }
  }
  return { vp: [innerWidth, innerHeight], out };
});
export default async ({ page, shot, wait, view }) => {
  await page.addStyleTag({ content: HIDE });
  await tutorialsOff(page);
  await dbg(page, process.env.RC ?? 'campaign.solo-ashford');
  await wait(3500);
  await dismiss(page, wait);
  await closeLoot(page, wait);
  await page.addStyleTag({ content: HIDE });
  console.log('recruit', await page.evaluate(() => ({ cards: document.querySelectorAll('.mw-card').length, rec: document.querySelectorAll('.hp-rec').length, title: document.querySelector('.mw-t')?.textContent })));
  await shot('rc-0');
  const tap = async (loc) => { const b = await loc.boundingBox(); if (!b) return false; const x = b.x + b.width / 2, y = b.y + b.height / 2; if (view.startsWith('844')) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); return true; };
  const rec = page.locator('.mw-card .hp-rec').first();
  if (await rec.count()) {
    await tap(rec); await wait(900);
    console.log('rec ipucu açık', JSON.stringify(await tips(page)));
    await shot('rc-1-recommended-ipucu');
    await tap(rec); await wait(900);
    console.log('rec ikinci dokunuş sonrası', JSON.stringify((await tips(page)).out.length));
    await page.mouse.click(5, 5); await wait(500);
    console.log('boş yere dokunma sonrası', JSON.stringify((await tips(page)).out.length));
  } else console.log('Recommended satırı yok');
  // skill ipucu: seçili kahramanın detay kartındaki skill ikonu
  const sk = page.locator('.hp-detail .hp-sks [data-skill]').first();
  console.log('skill öğeleri', await page.locator('.hp-detail .hc [data-band]').count(), await sk.count());
  if (await sk.count()) {
    await tap(sk); await wait(900);
    console.log('skill ipucu', JSON.stringify(await tips(page)));
    await shot('rc-2-skill-ipucu');
    await tap(sk); await wait(700);
    console.log('skill 2. dokunuş', JSON.stringify((await tips(page)).out.length));
  }
};
