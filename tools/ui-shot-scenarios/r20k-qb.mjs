// a16 Quick Battle takım seçimi: karoların sırayla belirmesi.
// Doğru yol: Play -> kartlar açılınca Quick Battle kartı (klavye Enter'ının çağırdığı run). Kart başlığına fare tıklaması defteri açar, takım seçimine geçmez.
import { menuClick, castV, scene } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  const cast = castV(shot, wait, view);
  await menuClick(page, 'Play');
  await wait(2500);
  await shot.slow(0.15);
  const ok = await scene(page, 'MainMenuScene', (sc) => { const k = sc.cards?.[1]; if (!k) return false; k.run(); return true; });
  console.log('qb karti run', ok);
  await cast('qb-takim', 2400, 100, 4);
  await shot.slow(1);
  await wait(1500);
  console.log('aktif sahneler', await page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join()));
  await shot('qb-oturdu');
};
