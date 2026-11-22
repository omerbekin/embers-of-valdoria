// Doğrulama 2: oyun sonu. Env: END=mend|quench|map2|credits. Debug düğmesiyle kayıt kurulur, sinema -> jenerik -> kart akışı çekilir.
import { HIDE, startCampaign } from './_dg.mjs';
import { dbg, dismiss } from './_lib.mjs';
const sizes = (page) => page.evaluate(() => {
  const bad = [];
  for (const sel of ['.cin button', '.crd button', '.crd .nav-btn', '.cin .nav-btn', '.mw-win button', '.mw-win .nav-btn', '.sd-ch']) for (const b of document.querySelectorAll(sel)) { const r = b.getBoundingClientRect(); if (r.width && r.height) bad.push(sel + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  const over = [...document.querySelectorAll('.cin *, .crd *, .mw-win *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1); }).slice(0, 5).map((e) => e.className + ' ' + Math.round(e.getBoundingClientRect().right) + '/' + Math.round(e.getBoundingClientRect().bottom));
  return { btns: bad, overflow: over, vp: innerWidth + 'x' + innerHeight };
});
export default async ({ page, shot, wait, view }) => {
  await page.addStyleTag({ content: HIDE });
  const mode = process.env.END ?? 'mend';
  if (mode === 'credits') {
    await dbg(page, 'maps23.credits');
    for (let i = 0; i < 9 && await page.locator('.crd').count(); i++) {
      await wait(1000);
      console.log('jenerik', i, JSON.stringify(await sizes(page)), await page.locator('.crd-page').innerText());
      await shot(`son-jenerik-menu-${i}`);
      const was = await page.locator('.crd-page').innerText().catch(() => ''); await page.locator('.crd').click({ position: { x: 300, y: 200 } }).catch(() => {}); for (let k = 0; k < 8; k++) { await wait(250); if ((await page.locator('.crd-page').innerText().catch(() => '')) !== was) break; }
    }
    return;
  }
  await startCampaign(page, wait, { idx: 0 });
  await page.addStyleTag({ content: HIDE });
  await dbg(page, mode === 'map2' ? 'maps23.finish2' : `maps23.finish3.${mode}`);
  // debug kaydı kurar (yavaş olabilir) ve sahneyi yeniler
  let seen = 0;
  for (let t = 0; t < 220; t++) {
    await wait(700);
    await page.addStyleTag({ content: HIDE }).catch(() => {});
    const st = await page.evaluate(() => ({ cin: !!document.querySelector('.cin'), end: !!document.querySelector('.cin-end'), crd: !!document.querySelector('.crd'), win: !!document.querySelector('.mw-win'), ch: !!document.querySelector('.sd-ch') }));
    if (mode === 'map2' && st.win) break;
    if (st.cin && !st.end && st.ch) {
      await wait(2500);
      seen++;
      console.log('sinema satır', seen, JSON.stringify(await sizes(page)), await page.evaluate(() => document.querySelector('.sd-body')?.innerText.slice(0, 120)));
      await shot(`son-${mode}-sinema${seen}`);
      await page.locator('.sd-ch').first().click({ timeout: 3000 }).catch(() => {});
      await wait(1800);
    } else if (st.end) {
      await wait(1500);
      console.log('kapanış kartı', JSON.stringify(await sizes(page)));
      await shot(`son-${mode}-kapanis`);
      await page.keyboard.press('Enter');
      await wait(1500);
    } else if (st.crd) {
      for (let i = 0; i < 9 && await page.locator('.crd').count(); i++) {
        await wait(1200);
        console.log('jenerik', i, JSON.stringify(await sizes(page)), (await page.locator('.crd-page').innerText().catch(() => '')).replace(/\n/g, ' / '));
        await shot(`son-${mode}-jenerik${i}`);
        const was = await page.locator('.crd-page').innerText().catch(() => ''); await page.locator('.crd').click({ position: { x: 300, y: 200 } }).catch(() => {}); for (let k = 0; k < 8; k++) { await wait(250); if ((await page.locator('.crd-page').innerText().catch(() => '')) !== was) break; }
      }
    } else if (st.win && seen) { break; }
  }
  await wait(1500);
  console.log('harita sonu', JSON.stringify(await page.evaluate(() => ({ title: document.querySelector('.mw-t')?.textContent, labels: [...document.querySelectorAll('.mw-win [data-act]')].map((b) => b.textContent.trim()), txt: document.querySelector('.mw-txt')?.innerText.slice(0, 160) }))), JSON.stringify(await sizes(page)));
  await shot(`son-${mode}-kart`);
};
