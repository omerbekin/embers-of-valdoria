// a13 tüccar (Odo): yetersiz altın, alım (item çantaya uçar + kese sayar), satış.
import { dbg, startCampaign, castV } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  const cast = castV(shot, wait, view);
  await startCampaign(page, wait, { idx: 0 });
  const click = (txt) => page.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().startsWith(t) && !x.disabled); if (b) b.click(); return !!b; }, txt);
  // debug 'campaign.shop' önce 'Forward Camp' anlatı penceresini açar; Continue ile tezgâha geçilir
  const cont = async () => { const b = page.getByText(/^s*(Continue|Browse wares)s*$/i).first(); if (!(await b.count())) return false; await b.click({ timeout: 3000 }).catch(() => {}); return true; };
  // debug 'campaign.shop' önce anlatı penceresi (.sd-ch Continue) açar; ardından karşılama kartı (.mw-go = Browse wares) gelir, o kapanınca tezgâh
  const openShop = async () => {
    await dbg(page, 'campaign.shop');
    for (let i = 0; i < 14; i++) {
      await wait(1200);
      if (await page.locator('.mw-go').count()) break;
      await page.locator('.sd-ch').first().click({ timeout: 2000 }).catch(() => {});
    }
    await page.locator('.mw-go').first().click({ timeout: 5000 }).catch((e) => console.log('browse', e.message.slice(0, 80)));
    await wait(2000);
  };
  const pickWare = () => page.locator('[data-drag^="ware:"], .gr-shop-scroll .gr-plate').first().click({ timeout: 8000 }).catch((e) => console.log('mal', e.message.split('\n')[0]));
  // 1) yetersiz altın
  await openShop();
  console.log('altin (baslangic)', await page.evaluate(() => document.querySelector('.gr-gold')?.textContent));
  await pickWare();
  await wait(500);
  await shot.slow(0.2);
  console.log('buy basildi', await click('Buy'));
  await cast('tuccar-yetersiz', 800, 70, 3);
  await shot.slow(1);
  await wait(800);
  await page.keyboard.press('Escape');
  await wait(900);
  // 2) alım
  for (let i = 0; i < 3; i++) await dbg(page, 'campaign.give-gold');
  for (let i = 0; i < 2; i++) await dbg(page, 'campaign.give-item');
  await openShop();
  await pickWare();
  await wait(500);
  await shot.slow(0.2);
  console.log('buy basildi', await click('Buy ·'));
  await cast('tuccar-alim', 1400, 100, 4);
  await shot.slow(1);
  await wait(1200);
  // 3) satış
  await page.locator('.gr-bag [data-tip^="bag:"]').first().click({ timeout: 6000 }).catch((e) => console.log('canta', e.message.split('\n')[0]));
  await wait(500);
  await shot.slow(0.2);
  console.log('sell basildi', await click('Sell'));
  await cast('tuccar-satis', 1400, 100, 4);
  await shot.slow(1);
};
