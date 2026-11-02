import { chromium } from 'playwright';
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1600, height: 900 } });
await page.addInitScript(() => { localStorage.setItem('eov.settings.v1', JSON.stringify({ volume: 0, steps: 20 })); localStorage.setItem('eov.diag.v1', JSON.stringify({ consent: false, noticed: true })); });
await page.goto('http://localhost:5177/?debug=1', { timeout: 120000 });
await page.waitForFunction(() => window.__game?.scene?.getScenes(true).length > 0, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(async () => { const m = await import('/src/ui/debug-vfx-battle.ts'); m.openVfxBattleTest(window.__game); window.__vbh = m.vfxBattleTestHandle; });
await page.waitForTimeout(3000);
await page.evaluate(() => window.__vbh().pick('natures_wrath'));
await page.waitForTimeout(10000);
await page.evaluate(async () => { const m = await import('/src/game/vfx.ts'); const sc = window.__game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('battle')); window.__g = m.groundArea(sc, 'healing_rain', 'party', [1, 2, 4], 0); document.querySelector('.vb-panel')?.classList.add('min'); });
await page.waitForTimeout(1500);
for (const n of [1,2,3]) { await page.screenshot({ path: process.argv[2] + n + '.png' }); await page.waitForTimeout(450); }

await b.close();
