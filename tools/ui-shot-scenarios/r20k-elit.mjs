// a04 elit ölümü: gerçek sefer elit savaşı (düğüm 3, Bandit Chief). Kahramanlar ölemez + tek vuruşta öldürme.
import { dbg, battleAt, traceDeath, waitFor, partyUndying, scene, castV } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  const cast = castV(shot, wait, view);
  await battleAt(page, wait, '3', { settle: 6000 });
  await traceDeath(page);
  await dbg(page, 'tweak.damage-ohk'); await dbg(page, 'tweak.damage-ohk');
  await partyUndying(page);
  await dbg(page, 'battle.autoplay');
  await waitFor(page, wait, () => { const b = window.__game.scene.getScene('BattleScene').battle; const c = b?.combatants.find((x) => x.tier === 'elite' && x.hp > 0); return !!c && c.hp < c.maxHp * 0.9; }, 120000, 40);
  await shot.slow(0.15);
  const ok = await waitFor(page, wait, () => !!window.__death, 120000, 40);
  console.log('olum yakalandi', ok, JSON.stringify(await page.evaluate(() => window.__death)));
  await cast('elit-olum', 2000, 100, 5);
  await shot.slow(1);
};
