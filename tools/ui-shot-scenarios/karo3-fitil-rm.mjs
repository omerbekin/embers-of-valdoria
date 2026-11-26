// Karo r47 fitil kanıtı: hareket açıkken iki an FARKLI, hareketi azalt açıkken iki an AYNI olmalı (ana menü PLAY + Settings kategori). Kareleri karşılaştırır, sonucu yazar.
import { menuClick, scene } from './_lib.mjs';
import { HIDE_DEBUG, domLoc, phaserLoc } from './karo2-lib.mjs';
const clip = (l, w, h) => ({ x: Math.max(0, Math.round(l.x - 20)), y: Math.max(0, Math.round(l.y - h / 2)), width: w, height: h });
async function pair(page, wait, c) {
  const a = await page.screenshot({ clip: c });
  await wait(700);
  const b = await page.screenshot({ clip: c });
  return a.equals(b) ? 'AYNI' : 'FARKLI';
}
export default async ({ page, wait }) => {
  for (const rm of [false, true]) {
    await page.evaluate(async (on) => (await import('/src/ui/motion-pref.ts')).setReducedMotion(on), rm);
    await page.addStyleTag({ content: HIDE_DEBUG });
    await scene(page, 'MainMenuScene', (sc) => { sc.menuRows.forEach((r) => r.setOn(false)); sc.menuRows[0].setOn(true); });
    await wait(600);
    const play = await phaserLoc(page, 'MainMenuScene', (sc) => { const m = sc.menuRows[0].root.getWorldTransformMatrix(); return { x: m.tx, y: m.ty, s: 40 }; });
    console.log('SONUC menu', rm ? 'hareketi-azalt' : 'hareket', await pair(page, wait, clip(play, 300, 70)));
    // yalnız fitil çizimi (satırın Graphics komut tamponu): ekrandaki başka hareketten bağımsız
    const buf = () => page.evaluate(() => { const r = window.__game.scene.getScene('MainMenuScene').menuRows[0].root; return JSON.stringify(r.list.filter((o) => o.type === 'Graphics').map((g) => g.commandBuffer)); });
    const b1 = await buf(); await wait(700); const b2 = await buf();
    console.log('SONUC menu-fitil-cizimi', rm ? 'hareketi-azalt' : 'hareket', b1 === b2 ? 'AYNI' : 'FARKLI', b1.length);
    await menuClick(page, 'Settings');
    await wait(1800);
    const fl = await domLoc(page, '.st-flame canvas', { at: 'l' });
    console.log('SONUC settings', rm ? 'hareketi-azalt' : 'hareket', fl ? await pair(page, wait, clip(fl, 300, 60)) : 'YOK');
    await page.keyboard.press('Escape');
    await wait(1200);
  }
};
