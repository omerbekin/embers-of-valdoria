// Doğrulama 3+4: Redtithe savaşı (kan çubuğu, skill barı kan çipi) ve haritadan savaşa yükleme ekranı.
import { HIDE, startCampaign } from './_dg.mjs';
import { dismiss, closeLoot, scene } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  await page.addStyleTag({ content: HIDE });
  await startCampaign(page, wait, { idx: 0 });
  await page.addStyleTag({ content: HIDE });
  // 4: yükleme ekranı. Savaş dosyaları yavaş insin (gerçek ağ gibi): /assets/ isteklerine gecikme.
  await page.route('**/assets/**', async (r) => { await new Promise((x) => setTimeout(x, 350)); r.continue(); });
  await page.evaluate(async () => {
    const cs = await import('/src/game/campaign-session.ts');
    const st = await import('/src/campaign/state.ts');
    let t = st.debugTeleport(cs.current(), 'road');
    t = st.debugEnsureClass(t, 'antimage');
    cs.setState(t);
    window.__game.scene.getScene('CampaignMapScene').scene.start('CampaignMapScene');
  });
  await wait(3500);
  await dismiss(page, wait); await closeLoot(page, wait);
  await page.addStyleTag({ content: HIDE });
  console.log('harita adımı', await page.evaluate(async () => (await import('/src/campaign/state.ts')).nextStep(window.__game.scene.getScene('CampaignMapScene').s).kind));
  await shot.slow(0.3);
  await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').launchBattle());
  const seen = [];
  for (let i = 0; i < 12; i++) {
    await shot(`yukleme-c${String(i).padStart(2, '0')}`);
    seen.push(await page.evaluate(() => { const b = document.getElementById('boot'); return b ? { cls: b.className, op: getComputedStyle(b).opacity, disp: getComputedStyle(b).display, bg: getComputedStyle(b).backgroundImage.slice(0, 40), label: b.querySelector('.boot-label')?.textContent, pct: b.querySelector('.boot-pct')?.textContent } : null; }));
  }
  await shot.slow(1);
  console.log('boot durumları', JSON.stringify(seen));
  await page.unroute('**/assets/**');
  for (let i = 0; i < 100; i++) { if (await page.evaluate(() => (window.__game.scene.getScene('BattleScene')?.views?.size ?? 0) > 0)) break; await wait(300); }
  await wait(5000);
  await dismiss(page, wait);
  await page.addStyleTag({ content: HIDE });
  const info = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('BattleScene');
    const cs = sc.battle.combatants.map((c) => ({ id: c.id, cls: c.classId ?? c.class, side: c.side, blood: c.blood, maxBlood: c.maxBlood, hp: c.hp, maxHp: c.maxHp, mp: c.maxMp }));
    return { cs, active: sc.battle.activeId ?? sc.battle.active?.id ?? null, overlays: [...document.querySelectorAll('#ui-root > *')].map((e) => e.className).slice(0, 12) };
  });
  console.log('savaş', JSON.stringify(info));
  await shot('savas-redtithe');
  await wait(6000);
  await shot('savas-redtithe-2');
  console.log('skill bar', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[class*="skill"] [class*="blood"], [class*="blood"]')].slice(0, 8).map((e) => e.className + ' | ' + e.textContent.trim().slice(0, 30)))));
};
