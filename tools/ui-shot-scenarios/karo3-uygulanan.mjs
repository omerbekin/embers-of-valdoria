// Karo r47 uygulanan 1-3 "sonra" kareleri: ana menü yanan fitil (3 an), Settings fitili (2 an), eşya plakası (köşe süsü yok),
// ağaç ultimate çekirdeği (önce = scale 1 enjekte, sonra = gerçek 1,3). "Önce" menü/plaka kareleri galeri 01-04'ten. KARO_OUT=<klasör>. Her boyut ayrı koşulur.
import { menuClick, scene, startCampaign, dismiss, closeLoot, tutorialsOff, dbg } from './_lib.mjs';
import sharp from 'sharp';
import { HIDE_DEBUG, domLoc, phaserLoc, ring, ctxShot } from './karo2-lib.mjs';
const OUT = process.env.KARO_OUT || 'ui-shots';
/** halkasız yakın kare (fitil animasyon anları) */
async function crop(page, loc, name) {
  if (!loc) { console.log('YOK', name); return; }
  const vp = page.viewportSize();
  const phone = vp.height < 500;
  const W = phone ? 300 : 560, H = phone ? 120 : 200;
  const x = Math.max(0, Math.min(vp.width - W, Math.round(loc.x - W / 2)));
  const y = Math.max(0, Math.min(vp.height - H, Math.round(loc.y - H / 2)));
  const buf = await page.screenshot({ type: 'png', clip: { x, y, width: W, height: H } });
  await sharp(buf).resize({ width: W * (phone ? 2 : 1), kernel: 'nearest' }).jpeg({ quality: 90 }).toFile(`${OUT}/${name}-${vp.width}x${vp.height}.jpg`);
  console.log('KARE', name);
}
export default async ({ page, wait }) => {
  await page.addStyleTag({ content: HIDE_DEBUG });
  // 1) ana menü PLAY satırı: fitil animasyonu, üç an
  await scene(page, 'MainMenuScene', (sc) => { sc.menuRows.forEach((r) => r.setOn(false)); sc.menuRows[0].setOn(true); });
  await wait(500);
  const play = await phaserLoc(page, 'MainMenuScene', (sc) => { const r = sc.menuRows[0].root; const m = r.getWorldTransformMatrix(); return { x: m.tx + 90, y: m.ty, s: 40 }; });
  for (let i = 1; i <= 3; i++) {
    await crop(page, play, `fitil-menu-an${i}`);
    await wait(650);
  }
  await page.screenshot({ path: `${OUT}/fitil-menu-tam-${page.viewportSize().width}x${page.viewportSize().height}.jpg`, quality: 85 });
  // 2) Settings sol sütun fitili
  await menuClick(page, 'Settings');
  await wait(1800);
  const fl = await domLoc(page, '.st-flame canvas');
  if (fl) fl.x += 60;
  for (let i = 1; i <= 2; i++) {
    await crop(page, fl, `fitil-settings-an${i}`);
    await wait(700);
  }
  await page.screenshot({ path: `${OUT}/fitil-settings-tam-${page.viewportSize().width}x${page.viewportSize().height}.jpg`, quality: 85 });
  await page.keyboard.press('Escape');
  await wait(1200);
  // 3) sefer: seviye 9, eşya ver, Gear > Hero plakası, sonra Tree çekirdeği
  await tutorialsOff(page);
  await startCampaign(page, wait, { idx: 0 });
  await page.evaluate(async () => {
    const cs = await import('/src/game/campaign-session.ts');
    const k = await import('/src/campaign/index.ts');
    const st = await import('/src/campaign/state.ts');
    let s = st.debugTeleport(cs.current(), '4');
    s = k.debugSetLevel ? k.debugSetLevel(s, 9) : s;
    cs.setState(s);
    window.__game.scene.getScene('CampaignMapScene').scene.start('CampaignMapScene');
  });
  await wait(3500); await dismiss(page, wait); await closeLoot(page, wait);
  await page.addStyleTag({ content: HIDE_DEBUG });
  for (let i = 0; i < 4; i++) await dbg(page, 'campaign.give-item');
  await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').openGear?.());
  await wait(2500);
  await dismiss(page, wait);
  await page.mouse.move(1, 1);
  const pl = await domLoc(page, '.gr-slot.gr-plate:not(.empty)', { at: 'tl' });
  if (pl) await ring(page, { ...pl, s: 10 }, 'plaka-sonra', { w: 220, h: 130, zoom: 4 });
  await page.screenshot({ path: `${OUT}/plaka-sonra-tam-${page.viewportSize().width}x${page.viewportSize().height}.jpg`, quality: 85 });
  await page.locator('.gr-tab').nth(2).click({ timeout: 4000 }).catch(() => {});
  await wait(2000);
  const core = await domLoc(page, '.gt-ucore');
  for (const ph of ['once', 'sonra']) {
    await page.evaluate((on) => {
      document.getElementById('karo3-core')?.remove();
      if (on) return;
      const st = document.createElement('style');
      st.id = 'karo3-core';
      st.textContent = '.gt-ucore{transform:translate(-50%,-50%)!important}';
      document.head.appendChild(st);
    }, ph === 'sonra');
    await wait(300);
    await ring(page, core, `ult-cekirdek-${ph}`, { w: 300, h: 200, zoom: 2 });
  }
};
