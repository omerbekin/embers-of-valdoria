// Doğrulama turu 1: olay penceresi GERÇEK akış. Env: EV=<harita>:<düğüm>:<seçim|x|none>[,...]  (seçim = plaka id, x = X ile kapat, none = yalnız Continue)
import { HIDE, startCampaign, jumpBefore, tapNode, pressCard, winState, stepNow } from './_dg.mjs';
export default async ({ page, shot, wait, view }) => {
  await page.addStyleTag({ content: HIDE });
  await startCampaign(page, wait, { idx: 0 });
  const list = (process.env.EV ?? 'dr:dr29:rumours').split(',');
  for (const spec of list) {
    const [kind, id, act] = spec.split(':');
    const nm = `olay-${id}-${act}`;
    const j = await jumpBefore(page, wait, kind, id);
    await page.addStyleTag({ content: HIDE });
    console.log(`\n== ${spec} ${view} jump`, JSON.stringify(j));
    await shot(`${nm}-0harita`);
    const p = await tapNode(page, wait, id);
    console.log('dokunuş', JSON.stringify(p), 'kart', await page.locator('.sbc-card').count());
    await shot(`${nm}-1kart`);
    let taps = 1;
    if (await pressCard(page, wait)) taps++;
    // yürüyüş + varış animasyonu
    for (let i = 0; i < 20; i++) { await wait(700); if (await page.locator('.mw-win').count()) break; }
    await wait(1200);
    console.log('olay penceresi', JSON.stringify(await winState(page)));
    await shot(`${nm}-2olay`);
    if (act === 'x') {
      await page.locator('.nav-close, [aria-label="Close"]').first().click({ timeout: 4000 }).catch((e) => console.log('X tıklanamadı', e.message.split('\n')[0]));
      taps++;
    } else if (act && act !== 'none') {
      await page.locator(`[data-plate="${act}"]`).first().click({ timeout: 4000 }).catch((e) => console.log('plaka yok', e.message.split('\n')[0]));
      taps++;
      await wait(900);
      console.log('sonuç', JSON.stringify(await winState(page)));
      await shot(`${nm}-3sonuc`);
      if (await page.locator('.mw-win [data-act="0"]').count()) { await page.locator('.mw-win [data-act="0"]').click(); taps++; }
    } else {
      if (await page.locator('.mw-win [data-act="0"]').count()) { await page.locator('.mw-win [data-act="0"]').click(); taps++; }
    }
    await wait(1200);
    if (act === 'none' && await page.locator('.mw-win [data-act="0"]').count()) { console.log('ikinci pencere var:', JSON.stringify(await winState(page))); await shot(`${nm}-3ikinci`); await page.locator('.mw-win [data-act="0"]').click(); taps++; }
    await wait(2000);
    console.log('sonra', JSON.stringify(await stepNow(page)), 'pencere', await page.locator('.mw-win').count(), 'dokunuş sayısı', taps);
    await shot(`${nm}-4sonra`);
    if (act === 'x' && process.env.REVISIT) {
      await tapNode(page, wait, id);
      console.log('yeniden dokunuş: kart', await page.locator('.sbc-card').count(), 'btn', await page.locator('.sbc-acts button').allInnerTexts());
      await pressCard(page, wait);
      await wait(3500);
      console.log('yeniden pencere', JSON.stringify(await winState(page)));
      await shot(`${nm}-5yeniden`);
    }
  }
};
