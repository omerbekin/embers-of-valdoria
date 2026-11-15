// Boss telegraph: gerçek Bridge Warden savaşı; Breaking Span / Fall of the Bridge uyarısı çıkınca yavaş çekim. Kahramanlar ölemez, otomatik oyun.
import { battleAt, waitFor, partyUndying, dbg, castV } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  const cast = castV(shot, wait, view);
  await battleAt(page, wait, '9', { settle: 6000 });
  await partyUndying(page);
  await dbg(page, 'battle.autoplay');
  await dbg(page, 'tweak.damage.9999'); // yalnız ilk dalgaları hızlı geçmek için; boss gelince 1x
  await waitFor(page, wait, () => { const b = window.__game.scene.getScene('BattleScene').battle; return !!b && b.combatants.some((x) => x.tier === 'boss'); }, 120000, 100);
  await dbg(page, 'tweak.damage.1');
  const ok = await waitFor(page, wait, () => window.__game.scene.getScene('BattleScene').telegraphViews.size > 0, 180000, 60);
  console.log('telegraph', ok);
  await shot.slow(0.25);
  await wait(300);
  await cast('tele', 2400, 200, 6);
  await shot.slow(1);
};
