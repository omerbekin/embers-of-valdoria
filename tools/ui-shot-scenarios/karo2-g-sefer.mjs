// Karo galerisi: sefer ekranları (harita, düğüm kartı, olay, hikâye diyaloğu, Gear Hero / çanta / item ipucu, tüccar, ganimet). KARO_OUT=<klasör>.
// KARO_ONLY=<ad,ad> ile bölüm seçilir. Her boyut ayrı koşulur.
import { dbg, startCampaign, tutorialsOff, giveLoot, domClick } from './_lib.mjs';
import { HIDE_DEBUG, autoRing, autoRingPhaser, hookPhaser, domLoc, ring, ctxShot, saveManifest } from './karo2-lib.mjs';
const ONLY = (process.env.KARO_ONLY || '').split(',').filter(Boolean);
const want = (n) => !ONLY.length || ONLY.includes(n);
const full = (page, n) => ctxShot(page, { x: 5, y: 5, s: 1 }, n);
export default async ({ page, wait, view }) => {
  await page.addStyleTag({ content: HIDE_DEBUG });
  await hookPhaser(page);
  await tutorialsOff(page);
  await startCampaign(page, wait, { idx: 0, onPicker: async (p) => { await autoRing(p, 'sefer-secici'); } });
  await page.addStyleTag({ content: HIDE_DEBUG });
  await wait(1500);
  if (want('harita')) {
    await autoRing(page, 'sefer-harita');
    await autoRingPhaser(page, 'sefer-harita', { limit: 8 });
    await full(page, 'sefer-harita-tam');
  }
  if (want('dugum')) {
    await page.evaluate(() => { const sc = window.__game.scene.getScene('CampaignMapScene'); const n = sc.map.nodes.find((x) => x.type === 'battle' && x.id !== sc.s.at); sc.confirmBattle(n.id, () => {}); });
    await wait(1800);
    await autoRing(page, 'sefer-dugum');
    await full(page, 'sefer-dugum-tam');
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
    await wait(1800);
    await autoRing(page, 'sefer-olay');
    await full(page, 'sefer-olay-tam');
    await page.evaluate(() => document.querySelectorAll('.mw').forEach((x) => x.remove()));
  }
  if (want('diyalog')) {
    await page.evaluate(async () => {
      const m = await import('/src/ui/story-dialog.ts');
      const root = document.getElementById('ui-root') ?? document.body;
      const h = m.openStoryDialog(root, { title: 'The Ferryman', speaker: 'Cutthroat', place: 'Saltmere', portrait: 'cutthroat', onPick: () => {} });
      h.update({ narr: 'Rain drums on the pier and the lantern swings.', said: 'You look like trouble. Trouble pays double.', choices: ['Hear him out', 'Walk away'], step: 1, total: 3 });
      window.__sdh = h;
    });
    await wait(1500);
    await page.locator('.sd-ch').first().hover({ timeout: 3000 }).catch(() => {});
    await wait(500);
    await autoRing(page, 'sefer-diyalog');
    await full(page, 'sefer-diyalog-tam');
    await page.evaluate(() => window.__sdh?.close());
    await wait(500);
  }
  if (want('gear')) {
    for (let i = 0; i < 4; i++) await dbg(page, 'campaign.give-item');
    await dbg(page, 'campaign.gear');
    await wait(3000);
    await page.addStyleTag({ content: HIDE_DEBUG });
    // A: eşya plakası köşe karosu (ilk dolu plaka, sol üst)
    await ring(page, await domLoc(page, '.gr-slot.gr-plate:not(.empty)', { pseudo: '::before' }), 'gear-plaka-kose');
    await autoRing(page, 'gear-hero');
    await full(page, 'gear-hero-tam');
    const plate = page.locator('.gr-slot.gr-plate:not(.empty)').first();
    await plate.hover({ timeout: 4000 }).catch(() => {});
    await wait(1000);
    await autoRing(page, 'gear-itemtip');
    await full(page, 'gear-itemtip-tam');
    await page.mouse.move(5, 5);
    await page.locator('.gr-cell:not(.empty), .gr-item').first().click({ timeout: 5000 }).catch(() => {});
    await wait(900);
    await autoRing(page, 'gear-canta');
    await full(page, 'gear-canta-tam');
    await page.keyboard.press('Escape');
    await wait(800);
    await page.keyboard.press('Escape');
    await wait(800);
  }
  if (want('tuccar')) {
    for (let i = 0; i < 3; i++) await dbg(page, 'campaign.give-gold');
    await dbg(page, 'campaign.shop');
    for (let i = 0; i < 14; i++) {
      await wait(1200);
      if (await page.locator('.mw-go').count()) break;
      await page.locator('.sd-ch').first().click({ timeout: 2000 }).catch(() => {});
    }
    await autoRing(page, 'sefer-tuccar-giris');
    await page.locator('.mw-go').first().click({ timeout: 5000 }).catch(() => {});
    await wait(2500);
    await autoRing(page, 'sefer-tuccar');
    await full(page, 'sefer-tuccar-tam');
    await page.keyboard.press('Escape');
    await wait(1000);
    await page.keyboard.press('Escape');
    await wait(1000);
  }
  if (want('ganimet')) {
    await giveLoot(page, 'legendary');
    await wait(5000);
    await page.addStyleTag({ content: HIDE_DEBUG });
    await autoRing(page, 'sefer-ganimet');
    await full(page, 'sefer-ganimet-tam');
    await ring(page, await domLoc(page, '.gr-slot.gr-plate:not(.empty)', { pseudo: '::before' }), 'ganimet-plaka-kose');
  }
  await saveManifest(view);
};
