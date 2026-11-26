// Mirage Veil (pasif evrimi karakter parıltısı) + vuruş beyazlaması çekimi. Kullanım (worktree kökü):
//   MODE=glow|hit VIEW=1920x1080|844x390 node docs/anim-review/new-art/mirage-veil/with-server.mjs docs/anim-review/new-art/mirage-veil/capture.mjs <çıktı klasörü> <etiket>
// glow: solda evrimsiz Mage (slot 1), sağda evrimli Mage (slot 7); idle + pasif tetiklenme anı. hit: evrimsiz Mage'e vuruş tepkisi (beyazlama) bir kare.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [URL0, OUT, TAG] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const [W, H] = (process.env.VIEW ?? '1920x1080').split('x').map(Number);
const MODE = process.env.MODE ?? 'glow';
const DT = 1000 / 60;
const b = await chromium.launch({ args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: W < 1200, isMobile: W < 1200 });
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
  const data = { seed: 4242, mode: 'test', teams: { party: cells([[1, 'mage'], [7, 'mage']]), enemies: cells([[1, 'stonebound_warden']]), units: { party: { 7: { evolved: ['heat_mirage'] } }, enemies: [] } }, partySize: 2, enemySize: 1, background: 'ashen-plain' };
  window.__game.scene.getScenes(true)[0]?.scene.start(BattleScene.KEY, data);
});
await page.waitForFunction(() => { const sc = window.__game.scene.getScene('BattleScene'); return !!sc && window.__game.scene.isActive('BattleScene') && sc.views?.get('party-1'); }, null, { timeout: 30000 });
await page.waitForTimeout(3000);
await page.evaluate(() => { window.__game.loop.sleep(); window.__capT = performance.now(); window.__vdate = Date.now(); });
const stepN = (n) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) { window.__capT += dt; window.__vdate += dt; window.__game.step(window.__capT, dt); } }, [n, DT]);
const info = await page.evaluate(() => { const sc = window.__game.scene.getScene('BattleScene'); return [...sc.views.entries()].map(([k, v]) => [k, v.combatant.defId, v.combatant.slot, v.combatant.evolved ?? null, !!v.passiveGlow]); });
console.log(JSON.stringify(info)); console.log(JSON.stringify(await page.evaluate(() => { const v = window.__game.scene.getScene('BattleScene').views.get('party-1'); return { w: v.w, h: v.h, items: v.passiveGlow.items.map((i) => [i.x, i.y, i.displayWidth, i.displayHeight, i.alpha, i.blendMode, i.visible, v.container.getIndex(i)]), spr: v.container.getIndex(v.sprite) }; })));
const shot = async (name, clip) => page.screenshot({ path: `${OUT}/${name}.png`, ...(clip ? { clip } : {}) });
if (MODE === 'glow') {
  await stepN(30); await shot(`${TAG}-idle-a`);
  await stepN(60); await shot(`${TAG}-idle-b`); if (W >= 1200) await shot(`${TAG}-zoom`, { x: 230, y: 580, width: 600, height: 260 });
  // pasif tetiklenmesi: evrimli Mage için gerçek 'passive' olayı (yazı + parıltı güçlenir)
  await page.evaluate(() => { const sc = window.__game.scene.getScene('BattleScene'); const me = sc.battle.living('party').find((x) => x.slot === 7); void sc.playEvent({ type: 'passive', actor: me.uid, passive: 'heat_mirage', name: 'Heat Mirage' }); });
  await stepN(14); await shot(`${TAG}-tetik-a`);
  await stepN(10); await shot(`${TAG}-tetik-b`);
} else {
  // vuruş beyazlaması: ilk Mage'e orta kademe darbe, parlamanın tepesi
  await page.evaluate(() => { const sc = window.__game.scene.getScene('BattleScene'); sc.views.get('party-0').hit(0.15); });
  await stepN(2); await shot(`${TAG}-vurus`);
}
await b.close();
