// Mage evolve çekimi (SKILL=fire_bolt|blizzard|ice_crater, FOES=1,4 düşman yuvaları): taban / evolve karşılaştırma çekimi (oyunun kendi BattleScene'i, test modu, sessiz).
// Kullanım (worktree kökü): node docs/anim-review/new-art/sunfire-pilot/with-server.mjs docs/anim-review/new-art/sunfire-pilot/capture.mjs <çıktı klasörü>
// Ortam: VIEW=1920x1080 | 390x844 (telefon dikey), EVO=1 (evolve), STEP = kare aralığı (1/60 sn adım), N = kare sayısı.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const [URL0, OUT] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const [W, H] = (process.env.VIEW ?? '1920x1080').split('x').map(Number);
const EVO = process.env.EVO === '1';
const SKILL = process.env.SKILL ?? 'fire_bolt';
const STEP = Number(process.env.STEP ?? 3), N = Number(process.env.N ?? 40);
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
await page.evaluate(async (FOES) => {
  const content = await import('/src/engine/content.ts');
  const { BattleScene } = await import('/src/game/scenes/BattleScene.ts');
  const cells = (units) => Array.from({ length: content.CELL_COUNT }, (_, i) => units.find(([s]) => s === i)?.[1] ?? '');
  const data = { seed: 4242, mode: 'test', teams: { party: cells([[1, 'mage']]), enemies: cells(FOES.map((s) => [s, 'stonebound_warden'])) }, partySize: 1, enemySize: 1, background: 'ashen-plain' };
  window.__game.scene.getScenes(true)[0]?.scene.start(BattleScene.KEY, data);
}, (process.env.FOES ?? '1,4').split(',').map(Number));
await page.waitForFunction(() => { const sc = window.__game.scene.getScene('BattleScene'); return !!sc && window.__game.scene.isActive('BattleScene') && sc.views?.get('party-0'); }, null, { timeout: 30000 });
await page.waitForTimeout(3000);
await page.evaluate(() => { window.__game.loop.sleep(); window.__capT = performance.now(); window.__vdate = Date.now(); });
const stepN = (n) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) { window.__capT += dt; window.__vdate += dt; window.__game.step(window.__capT, dt); } }, [n, DT]);
const r = await page.evaluate(([evo, skill]) => {
  const sc = window.__game.scene.getScene('BattleScene');
  const me = sc.battle.living('party').find((x) => x.slot === 1);
  const v = sc.views.get('party-0');
  if (evo) { me.evolved = [skill]; v.combatant.evolved = [skill]; }
  if (me) sc.galleryCaster = me.uid;
  return sc.debugCastSkill(skill);
}, [EVO, SKILL]);
if (r) console.log('hata', r);
const canvas = await page.evaluate(() => { const r = window.__game.canvas.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
const clip = W >= 1200 ? { x: 480, y: 380, width: 960, height: 520 } : canvas;
for (let i = 0; i < N; i++) { await stepN(STEP); writeFileSync(`${OUT}/f${String(i).padStart(2, '0')}-${Math.round((i + 1) * STEP * DT)}ms.png`, await page.screenshot({ clip })); }
console.log('tamam', EVO ? 'evolve' : 'taban', W + 'x' + H, JSON.stringify(canvas));
await b.close();
