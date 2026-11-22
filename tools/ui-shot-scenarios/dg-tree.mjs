// Doğrulama 7 + 9: telefon skill ağacı (düzen A) ve Sheet ana stat işareti. Env: CLS=antimage|mage
import { HIDE, startCampaign } from './_dg.mjs';
import { dismiss, closeLoot, tutorialsOff } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  await page.addStyleTag({ content: HIDE });
  await startCampaign(page, wait, { idx: 0 });
  await tutorialsOff(page);
  const cls = process.env.CLS ?? 'antimage';
  await page.evaluate(async (c) => {
    const cs = await import('/src/game/campaign-session.ts');
    const k = await import('/src/campaign/index.ts');
    const st = await import('/src/campaign/state.ts');
    let s = st.debugTeleport(cs.current(), '4');
    s = st.debugEnsureClass(s, c);
    s = k.debugSetLevel ? k.debugSetLevel(s, 6) : s;
    cs.setState(s);
    window.__game.scene.getScene('CampaignMapScene').scene.start('CampaignMapScene');
  }, cls);
  await wait(3500); await dismiss(page, wait); await closeLoot(page, wait);
  await page.addStyleTag({ content: HIDE });
  await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').openGear?.());
  await wait(2500);
  await dismiss(page, wait);
  await page.addStyleTag({ content: HIDE });
  const marks = await page.evaluate(() => [...document.querySelectorAll('.gr-mark, .gr-hero')].map((e) => e.className.toString().slice(0, 30) + '|' + (e.dataset.hero ?? e.dataset.id ?? '') + '|' + e.getAttribute('aria-label')));
  console.log('marks', JSON.stringify(marks), 'tabs', await page.evaluate(() => [...document.querySelectorAll('.gr-tab')].map((t) => t.textContent)));
  // kahramanı seç
  const idx = await page.evaluate((c) => { const m = [...document.querySelectorAll('.gr-mark')]; return m.findIndex((e) => (e.getAttribute('aria-label') ?? '').toLowerCase().includes(c === 'antimage' ? 'redtithe' : c) || (e.dataset.hero ?? '').includes(c)); }, cls);
  console.log('hero idx', idx);
  if (idx >= 0) await page.locator('.gr-mark').nth(idx).click({ timeout: 4000 }).catch((e) => console.log('mark click', e.message.split('\n')[0]));
  await wait(800);
  // Sheet
  await page.locator('.gr-tab').nth(1).click({ timeout: 4000 }).catch(() => {});
  await wait(1200);
  console.log('sheet ana stat', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[class*="main"], [class*="prim"], .gr-stat')].slice(0, 20).map((e) => e.className.toString().slice(0, 50) + ' | ' + e.textContent.trim().slice(0, 30)))));
  await shot(`sheet-${cls}`);
  // Tree
  await page.locator('.gr-tab').nth(2).click({ timeout: 4000 }).catch(() => {});
  await wait(1800);
  await shot(`agac-${cls}-0`);
  console.log('ağaç', JSON.stringify(await page.evaluate(() => ({ one: !!document.querySelector('.gt.one'), nodes: document.querySelectorAll('[data-node],[data-key]').length, hold: !!document.querySelector('[data-hold]'), badge: document.querySelector('[data-badge]')?.textContent, lvl: document.querySelector('[data-dyn="lvl"]')?.textContent, side: document.querySelector('.gt-sidebody')?.textContent.slice(0, 120) }))));
  const st = () => page.evaluate(() => ({ badge: document.querySelector('[data-badge]')?.textContent, lvl: document.querySelector('[data-dyn="lvl"]')?.textContent, mastery: document.querySelector('.gt-bar, .gt-mast')?.textContent?.slice(0, 40), title: document.querySelector('.gt-sidebody')?.textContent.slice(0, 70), hold: (() => { const h = document.querySelector('[data-hold]'); return h ? { cls: h.className, dis: h.getAttribute('aria-disabled'), txt: h.textContent.trim(), r: [...Object.values(h.getBoundingClientRect().toJSON())].slice(0, 4).map(Math.round) } : null; })() }));
  // düğüme dokun: ikinci sütunun ilk düğümü
  const nodes = await page.evaluate(() => [...document.querySelectorAll('.gt-body [data-key], .gt-body [data-node]')].map((e) => ({ k: e.dataset.key ?? e.dataset.node, r: (() => { const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2, b.width]; })() })).filter((n) => n.r[2] > 20 && n.r[1] > 0 && n.r[1] < 390 && n.r[0] < 330));
  console.log('görünür düğümler', JSON.stringify(nodes.slice(0, 12)));
  const before = await st();
  console.log('önce', JSON.stringify(before));
  const pick = nodes.find((n) => n.k === '0.f2'); if (pick) { await page.touchscreen.tap(pick.r[0], pick.r[1]); await wait(600); console.log('kilitli düğüm', JSON.stringify(await st())); await shot('agac-' + cls + '-kilitli'); } const f1 = nodes.find((n) => n.k === '0.f1'); if (f1) { await page.touchscreen.tap(f1.r[0], f1.r[1]); await wait(700); } const pick2 = f1;
  if (pick2) { console.log('dokunulan', pick2.k, JSON.stringify(await st())); await shot(`agac-${cls}-1-dokun`); }
  const hb = page.locator('[data-hold]');
  const bb = await hb.boundingBox();
  console.log('hold kutusu', JSON.stringify(bb));
  const holdFor = async (ms) => { const b = await hb.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await wait(ms); await page.mouse.up(); await wait(500); };
  for (let i = 0; i < 6; i++) {
    await holdFor(i === 0 ? 300 : 1800);
    console.log('basılı tutma', i, i === 0 ? '(300ms kısa)' : '(1800ms)', JSON.stringify(await st()));
    if (i === 1) await shot(`agac-${cls}-2-tutunca`);
  }
  await shot(`agac-${cls}-3-son`);
  const f2 = nodes.find((n) => n.k === '0.f2'); if (f2) { await page.touchscreen.tap(f2.r[0], f2.r[1]); await wait(600); for (let i = 0; i < 3; i++) { await holdFor(1800); console.log('puan tüketme', i, JSON.stringify(await st())); } }
  await shot(`agac-${cls}-4-puan-bitti`);
};
