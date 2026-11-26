// Karo-2 MOCKUP: eşya plakası köşe karoları > fildişi üç nokta (gerçek oyun ekranına, oyunun kendi corner-dots.css kuralı enjekte edilerek).
// Kod DEĞİŞMEZ: yalnız çekim anında sayfaya stil basılır. KARO_OUT=<klasör>. Her boyut ayrı koşulur.
// Çıktı: <ekran>-once / <ekran>-sonra (tam) + <ekran>-yakin-once / -sonra (halkalı yakın kare).
import { dbg, startCampaign, tutorialsOff, giveLoot, scene } from './_lib.mjs';
import { HIDE_DEBUG, domLoc, ring, ctxShot } from './karo2-lib.mjs';
const MOCK = async (page, on) =>
  page.evaluate(async (en) => {
    document.getElementById('karo2-mock')?.remove();
    document.querySelectorAll('[data-cdm]').forEach((e) => { e.removeAttribute('data-cdm'); e.removeAttribute('data-cd'); e.style.removeProperty('--cd-sk'); });
    if (!en) return 0;
    const rule = await import('/src/ui/corner-dots-rule.ts');
    const css = (await import('/src/ui/corner-dots.css?raw')).default;
    // oyunun kendi üç nokta kuralı, plaka seçicisiyle (plaka karo kuralından güçlü olsun diye) yeniden yazılır
    const scoped = css.replace(/@property[\s\S]*?\}\s*/, '').replace(/\[data-cd/g, '.gr-slot.gr-plate[data-cdm][data-cd');
    const st = document.createElement('style');
    st.id = 'karo2-mock';
    st.textContent = scoped;
    document.head.appendChild(st);
    let n = 0;
    document.querySelectorAll('.gr-slot.gr-plate:not(.empty)').forEach((el) => {
      const u = parseFloat(getComputedStyle(el).getPropertyValue('--u')) || 1;
      const w = el.offsetWidth / u, h = el.offsetHeight / u;
      el.setAttribute('data-cdm', '');
      el.setAttribute('data-cd', rule.cdCentred(w, h) ? 'c' : 'k');
      el.style.setProperty('--cd-sk', String(rule.cdTier(Math.min(w, h))));
      n++;
    });
    return n;
  }, on);
async function pair(page, wait, name, sel = '.gr-slot.gr-plate:not(.empty)') {
  const loc = await domLoc(page, sel, { at: 'tl' });
  if (!loc) { console.log('YOK', name); return; }
  await page.mouse.move(1, 1);
  await page.evaluate(() => document.activeElement?.blur?.());
  await wait(500);
  const big = { x: loc.x + 160, y: loc.y + 40, s: 12 };
  for (const ph of ['once', 'sonra']) {
    const n = await MOCK(page, ph === 'sonra');
    if (ph === 'sonra') console.log(name, 'plaka', n);
    await wait(300);
    await ctxShot(page, { x: 2, y: 2, s: 1 }, `${name}-${ph}`);
    await ring(page, { ...loc, s: 10 }, `${name}-yakin-${ph}`, { w: 220, h: 130, zoom: 4 });
  }
  await MOCK(page, false);
}
export default async ({ page, wait, view }) => {
  await page.addStyleTag({ content: HIDE_DEBUG });
  await tutorialsOff(page);
  await startCampaign(page, wait, { idx: 0 });
  await page.addStyleTag({ content: HIDE_DEBUG });
  for (let i = 0; i < 4; i++) await dbg(page, 'campaign.give-item');
  await dbg(page, 'campaign.gear');
  await wait(3000);
  await page.addStyleTag({ content: HIDE_DEBUG });
  await pair(page, wait, 'gear-hero');
  await page.keyboard.press('Escape');
  await wait(800);
  await page.keyboard.press('Escape');
  await wait(800);
  await giveLoot(page, 'legendary');
  await wait(5000);
  await page.addStyleTag({ content: HIDE_DEBUG });
  await pair(page, wait, 'ganimet');
  // tüccar tezgâhı (birden çok plaka)
  for (const t of ['Take all', 'Done', 'Leave']) await page.evaluate((x) => { const b = [...document.querySelectorAll('button')].find((e) => e.textContent.trim() === x); b?.click(); }, t);
  await wait(1500);
  for (let i = 0; i < 3; i++) await dbg(page, 'campaign.give-gold');
  await dbg(page, 'campaign.shop');
  for (let i = 0; i < 14; i++) {
    await wait(1200);
    if (await page.locator('.mw-go').count()) break;
    await page.locator('.sd-ch').first().click({ timeout: 2000 }).catch(() => {});
  }
  await page.locator('.mw-go').first().click({ timeout: 5000 }).catch(() => {});
  await wait(2500);
  await page.addStyleTag({ content: HIDE_DEBUG });
  await pair(page, wait, 'tuccar');
};
