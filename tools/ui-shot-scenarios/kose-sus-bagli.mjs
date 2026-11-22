// Kose susu (uc nokta) baglama: onceki / sonraki karsilastirma cekimleri. KS_PHASE=once|sonra ve KS_ONLY=<ad,ad> ortam degiskenleri.
// Kullanim: KS_PHASE=once node tools/ui-shot.mjs tools/ui-shot-scenarios/kose-sus-bagli.mjs --url http://localhost:<port> --out <klasor> --view 1920x1080
// Cikti adi: <ekran>-<once|sonra>-<WxH>.jpg. Her boyut ayri kosulur (kampanya senaryolari iki boyutu bir kosuda tasimaz).
import { dbg, startCampaign, scene, domClick, tutorialsOff, dismiss } from './_lib.mjs';
const PHASE = process.env.KS_PHASE || 'sonra';
const ONLY = (process.env.KS_ONLY || '').split(',').filter(Boolean);
const want = (n) => !ONLY.length || ONLY.includes(n);
const hideDebug = (page) => page.addStyleTag({ content: '.debug-toggle,#debug-toggle,.debug-fab,[class*="debug-btn"],#debug-root>button{display:none!important}' });
export default async ({ page, shot, wait, view }) => {
  const S = (n) => shot(`${n}-${PHASE}`);
  const probe = async (n) => { const r = await page.evaluate(() => (window.__cdProbe ? window.__cdProbe() : null)); if (r) console.log(view, n, JSON.stringify(r)); };
  await hideDebug(page);
  await tutorialsOff(page);
  // 1) Settings (ana menu)
  if (want('settings')) {
    const { menuClick } = await import('./_lib.mjs');
    await menuClick(page, 'Settings');
    await wait(1500);
    await S('settings');
    await probe('settings');
    await page.keyboard.press('Escape');
    await wait(600);
  }
  // 2) Savas: dalgali test savasi (skill plakasi, Round etiketi, aksiyon menusu) + skill ipucu
  if (want('savas')) {
    await dbg(page, 'battle.wave-test-turns');
    await wait(5000);
    await page.waitForSelector('.bh-skills .bp', { timeout: 90000 }).catch(() => console.log(view, 'savas: HUD yok'));
    await wait(7000);
    await hideDebug(page);
    await page.evaluate(() => document.querySelectorAll('button').forEach((b) => { if (b.textContent === 'DEBUG') b.style.display = 'none'; }));
    await S('savas');
    await probe('savas');
    const bp = page.locator('.bh-skills .bp:not(.pas)').first();
    await bp.hover({ timeout: 5000 }).catch(() => {});
    await wait(1000);
    await S('savas-ipucu');
    await probe('savas-ipucu');
    await page.mouse.move(5, 5);
  }
  // 3) Sefer: dugum karti, olay penceresi, hikaye diyalogu, tuccar, gear
  await startCampaign(page, wait, { idx: 0 });
  await hideDebug(page);
  if (want('dugum')) {
    await page.evaluate(() => { const sc = window.__game.scene.getScene('CampaignMapScene'); const n = sc.map.nodes.find((x) => x.type === 'battle' && x.id !== sc.s.at); sc.confirmBattle(n.id, () => {}); });
    await wait(1500);
    await S('dugum');
    await probe('dugum');
    await page.keyboard.press('Escape');
    await wait(500);
    await page.evaluate(() => document.querySelectorAll('.sbc').forEach((x) => x.remove()));
  }
  if (want('olay')) {
    await page.evaluate(async () => {
      const d = await import('/src/campaign/data.ts');
      const sc = window.__game.scene.getScene('CampaignMapScene');
      document.querySelectorAll('.mw').forEach((x) => x.remove());
      sc.choiceEvent('dr_guild_hall', sc.map.nodes[0].id, d.EVENTS['dr_guild_hall'].choices ?? []);
    });
    await wait(1500);
    await S('olay');
    await probe('olay');
    await page.evaluate(() => document.querySelectorAll('.mw').forEach((x) => x.remove()));
  }
  if (want('diyalog')) {
    await page.evaluate(async () => {
      const m = await import('/src/ui/story-dialog.ts');
      const root = document.getElementById('ui-root') ?? document.body;
      const h = m.openStoryDialog(root, { title: 'The Ferryman', speaker: 'Cutthroat', place: 'Saltmere', portrait: 'cutthroat', onPick: () => {} });
      h.update({ narr: 'Rain drums on the pier and the lantern swings.', said: 'You look like trouble. Trouble pays double.', choices: ['Hear him out', 'Walk away'], step: 0, total: 3 });
      window.__sdh = h;
    });
    await wait(1500);
    await S('diyalog');
    await probe('diyalog');
    await page.evaluate(() => window.__sdh?.close());
    await wait(500);
  }
  if (want('tuccar')) {
    for (let i = 0; i < 3; i++) await dbg(page, 'campaign.give-gold');
    await dbg(page, 'campaign.shop');
    // debug 'campaign.shop' once anlati penceresi (.sd-ch), sonra karsilama karti (.mw-go = Browse wares), sonra tezgah
    for (let i = 0; i < 14; i++) {
      await wait(1200);
      if (await page.locator('.mw-go').count()) break;
      await page.locator('.sd-ch').first().click({ timeout: 2000 }).catch(() => {});
    }
    await page.locator('.mw-go').first().click({ timeout: 5000 }).catch(() => {});
    await wait(2500);
    await S('tuccar');
    await probe('tuccar');
    await page.locator('.gr-shop-scroll .gr-plate, [data-drag^="ware:"]').first().click({ timeout: 8000 }).catch(() => {});
    await wait(600);
    await S('tuccar-secili');
    await page.keyboard.press('Escape');
    await wait(800);
  }
  if (want('gear')) {
    for (let i = 0; i < 4; i++) await dbg(page, 'campaign.give-item');
    await dbg(page, 'campaign.gear');
    await wait(3000);
    await S('gear-hero');
    await probe('gear-hero');
    const sk = page.locator('.hsk:not(.pas) .ic').first();
    await sk.hover({ timeout: 5000 }).catch(() => {});
    await wait(900);
    await S('gear-hero-skill-ipucu');
    await page.mouse.move(5, 5);
    await page.locator('.gr-cell:not(.empty), .gr-item').first().click({ timeout: 5000 }).catch(() => {});
    await wait(900);
    await S('gear-canta');
    await probe('gear-canta');
    await page.keyboard.press('Escape');
    await wait(800);
  }
  // 4) Savas sonucu: dalgali test savasinda debug "Preview victory" (tools.result-victory)
  if (want('sonuc')) {
    await dbg(page, 'battle.wave-test-turns');
    await wait(4000);
    await page.waitForSelector('.bh-skills .bp', { timeout: 90000 }).catch(() => console.log(view, 'sonuc: HUD yok'));
    await wait(5000);
    await dbg(page, 'tools.result-victory');
    await wait(7000);
    await S('sonuc');
  }
};
