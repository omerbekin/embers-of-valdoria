// Tarama: seçim / sekme / satır değişince pencerenin dış kutusu oynuyor mu. Her adımdan sonra pencere kutuları ölçülür, farklar yazılır.
// SCEN=gear|shop|smith|inn|codex|settings|qb|formation
import { dbg, dismiss, tutorialsOff, startCampaign, menuClick, scene } from './_lib.mjs';
const SEL = '.fbw-win, .st-title, .st-cat, .gr-panel, .mw-panel, .el-modal-panel, .st-col, .wk-overlay > *, .el-dialog, .fm-panel, [class*=formation] > [class*=panel]';
const snap = (page) => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').map((e) => { const r = e.getBoundingClientRect(); return [String(e.className).split(/\s+/).slice(0, 3).join('.'), ...[r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10)]; }).filter((a) => a[3] * a[4] > 20000 || /^st-/.test(a[0])), SEL);
const hide = (page) => page.addStyleTag({ content: '.debug-toggle{display:none!important}' });
const settle = async (page, wait) => { for (let i = 0; i < 25 && !(await page.locator('.gr-panel').count()); i++) { await dismiss(page, wait); await wait(1200); } await wait(800); };
export default async ({ page, shot, wait, view }) => {
  const scen = process.env.SCEN ?? 'gear';
  const log = [];
  const step = async (name, fn) => { try { await fn(); } catch (e) { log.push([name, 'HATA ' + e.message.split('\n')[0].slice(0, 90)]); return; } await wait(1100); log.push([name, await snap(page)]); };
  const click = (sel, n = 0) => async () => { await page.locator(sel).nth(n).click({ timeout: 6000, force: true }); };
  await tutorialsOff(page);
  if (scen === 'gear') {
    await dbg(page, 'campaign.solo-valdren'); await wait(3000); await dismiss(page, wait); await wait(1500);
    for (let i = 0; i < 4; i++) await dbg(page, 'campaign.give-item');
    await dbg(page, 'campaign.gear'); await wait(2500); await hide(page);
    log.push(['acik', await snap(page)]);
    await step('tab1', click('.gr-tab', 1));
    await step('tab2', click('.gr-tab', 2));
    await step('tab0', click('.gr-tab', 0));
    await step('hero1', click('.gr-heroes > *', 1));
    await step('tab1+hero1', click('.gr-tab', 1));
    await step('tab2+hero1', click('.gr-tab', 2));
    await step('hero0', click('.gr-heroes > *', 0));
  } else if (scen === 'shop') {
    await startCampaign(page, wait, { idx: 0 });
    for (let i = 0; i < 3; i++) await dbg(page, 'campaign.give-gold');
    await dbg(page, 'campaign.shop'); await wait(3000); await settle(page, wait); await hide(page);
    log.push(['acik', await snap(page)]); await shot('shop-acik');
    await step('mal1', click('[data-drag^="ware:"]', 0));
    await step('mal2', click('[data-drag^="ware:"]', 2));
    await step('buyback', click('.gr-shoptabs .gr-tab', 1));
    await step('sell', click('.gr-shoptabs .gr-tab', 0));
  } else if (scen === 'smith') {
    await startCampaign(page, wait, { idx: 0 });
    await dbg(page, 'campaign.blacksmith-fill'); await wait(3000); await settle(page, wait); await hide(page);
    log.push(['acik', await snap(page)]); await shot('smith-acik');
    await step('bag0', click('.gr-bag [data-drag^="bag:"]', 0));
    await step('bag1', click('.gr-bag [data-drag^="bag:"]', 1));
    await step('bag2', click('.gr-bag [data-drag^="bag:"]', 3));
  } else if (scen === 'inn') {
    await startCampaign(page, wait, { idx: 0 });
    await dbg(page, 'campaign.inn'); await wait(3000); await hide(page);
    log.push(['acik', await snap(page)]);
    log.push(['buttons', await page.evaluate(() => [...document.querySelectorAll('.el-modal-panel button, .gr-panel button')].map((b) => b.textContent.trim()).slice(0, 12))]);
  } else if (scen === 'codex') {
    await menuClick(page, 'Codex'); await wait(9000); await hide(page);
    log.push(['acik', await snap(page)]);
    await step('row2', click('.cx-nav > *', 2));
    await step('row6', click('.cx-nav > *', 6));
    await step('row12', click('.cx-nav > *', 12));
  } else if (scen === 'settings') {
    await menuClick(page, 'Settings'); await wait(1500); await hide(page);
    log.push(['acik', await snap(page)]);
    const n = await page.locator('.st-cat').count();
    for (let i = 1; i < n; i++) await step('kat' + i, click('.st-cat', i));
  } else if (scen === 'formation') {
    await dbg(page, 'campaign.solo-valdren'); await wait(3000); await dismiss(page, wait); await wait(1500);
    await scene(page, 'CampaignMapScene', (sc) => { sc.openFormation(); return true; }); await wait(2500); await hide(page);
    log.push(['acik', await snap(page)]);
    log.push(['cells', await page.evaluate(() => [...document.querySelectorAll('.fbw-win [class]')].map((e) => String(e.className)).filter((c) => /cell|hero|slot|card/.test(c)).slice(0, 14))]);
    const cells = page.locator('.fbw-win [class*=cell], .fbw-win [class*=hero]');
    const n = await cells.count();
    for (let i = 0; i < Math.min(n, 4); i++) await step('cell' + i, click('.fbw-win [class*=cell], .fbw-win [class*=hero]', i));
  } else if (scen === 'qb') {
    await menuClick(page, 'Play'); await wait(2500);
    await scene(page, 'MainMenuScene', (sc) => { sc.cards?.[1]?.run(); return true; });
    await wait(4000); await hide(page);
    log.push(['qb', await page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join())]);
  }
  console.log(view, scen, JSON.stringify(log));
};
