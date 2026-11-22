// Oyunda kontrol (Redtithe step1 v4): oyunun kendi BattleScene'inde (test modu, sessiz) Redtithe oyuncu tarafında, kukla karşısında.
// Döngü durur; idle1 karesi alınır, sonra view.showPose('step') (koşarken gösterilen poz, combatant-view.ts) ile adım pozuna geçilir ve
// 1/60 sn adımlarla ilerletilir (yumuşak geçişin hayalet karesi dahil). Her adımda birimin çevresi kırpılarak kaydedilir.
// Kullanım: node capture.mjs <url> <çıktı klasörü>   (geliştirme sunucusu açık olmalı)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const [URL0, OUT] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const DT = 1000 / 60;
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await page.addInitScript(() => {
  localStorage.setItem('eov.settings.v1', JSON.stringify({ volume: 0, steps: 20 }));
  localStorage.setItem('eov.diag.v1', JSON.stringify({ consent: false, noticed: true }));
  const realNow = Date.now.bind(Date);
  Date.now = () => (window.__vdate === undefined ? realNow() : window.__vdate);
});
await page.goto(`${URL0}/?debug=1`, { timeout: 120000 });
await page.waitForFunction(() => window.__game?.scene?.getScenes(true).length > 0, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(async () => {
  const content = await import('/src/engine/content.ts');
  const { BattleScene } = await import('/src/game/scenes/BattleScene.ts');
  const cells = (units) => Array.from({ length: content.CELL_COUNT }, (_, i) => units.find(([s]) => s === i)?.[1] ?? '');
  window.__seed = 4242;
  const data = { seed: 4242, mode: 'test', teams: { party: cells([[1, 'antimage']]), enemies: cells([[1, 'stonebound_warden']]) }, partySize: 1, enemySize: 1, background: 'ashen-plain' };
  window.__game.scene.getScenes(true)[0]?.scene.start(BattleScene.KEY, data);
});
await page.waitForFunction(() => { const sc = window.__game.scene.getScene('BattleScene'); return !!sc && window.__game.scene.isActive('BattleScene') && sc.views?.get('party-0'); }, null, { timeout: 30000 });
await page.waitForTimeout(4000);
const box = await page.evaluate(() => {
  const sc = window.__game.scene.getScene('BattleScene'); const v = sc.views.get('party-0'); const m = v.sprite.getWorldTransformMatrix();
  const r = window.__game.canvas.getBoundingClientRect(); const k = r.width / 1920;
  window.__game.loop.sleep(); window.__capT = performance.now(); window.__vdate = Date.now();
  return { k, x: r.x + (m.tx - 260) * k, y: r.y + (m.ty - 420) * k, w: 520 * k, h: 470 * k, info: [v.rig?.pose, Math.round(m.tx), Math.round(m.ty), Math.round(v.sprite.displayHeight)] };
});
console.log(JSON.stringify(box));
const clip = { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.w, height: box.h };
const stepN = (n) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) { window.__capT += dt; window.__vdate += dt; window.__game.step(window.__capT, dt); } }, [n, DT]);
await stepN(1);
writeFileSync(`${OUT}/idle.png`, await page.screenshot({ clip }));
const pose = await page.evaluate(() => window.__game.scene.getScene('BattleScene').views.get('party-0').showPose('step'));
console.log('poz', pose);
for (let i = 0; i <= 9; i++) { await stepN(1); writeFileSync(`${OUT}/t${String(i).padStart(2, '0')}.png`, await page.screenshot({ clip })); }
await stepN(20);
writeFileSync(`${OUT}/step.png`, await page.screenshot({ clip }));
await page.evaluate(() => window.__game.scene.getScene('BattleScene').views.get('party-0').showPose(null)); // step1 > idle1 dönüşü
for (let i = 0; i <= 14; i++) { await stepN(1); writeFileSync(`${OUT}/b${String(i).padStart(2, '0')}.png`, await page.screenshot({ clip })); }
await stepN(30);
writeFileSync(`${OUT}/idle-back.png`, await page.screenshot({ clip }));
await b.close();
