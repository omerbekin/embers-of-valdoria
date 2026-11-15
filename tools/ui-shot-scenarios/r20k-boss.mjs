// a04 boss ölümü: gerçek Bridge Warden savaşı (sefer düğümü 9, 3. dalgada boss). Kahramanlar ölemez (undying) + tek vuruşta öldürme + otomatik oyun.
// Boss vurulunca yavaş çekime geçilir; ölüm kıvılcımı (emberDeath) başlayınca kareler alınır.
import { dbg, battleAt, traceDeath, waitFor, partyUndying, scene, castV } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  const cast = castV(shot, wait, view);
  await battleAt(page, wait, '9', { settle: 6000 });
  await traceDeath(page);
  await dbg(page, 'tweak.damage-ohk'); await dbg(page, 'tweak.damage-ohk');
  await partyUndying(page);
  await dbg(page, 'battle.autoplay');
  await waitFor(page, wait, () => { const b = window.__game.scene.getScene('BattleScene').battle; const c = b?.combatants.find((x) => x.tier === 'boss' && x.hp > 0); return !!c && c.hp < c.maxHp * 0.9; }, 120000, 40);
  await shot.slow(0.15);
  const ok = await waitFor(page, wait, () => !!window.__death, 120000, 40);
  console.log('olum yakalandi', ok);
  await cast('boss-olum', 2400, 100, 7);
  console.log('kivilcim/dikdortgen sayisi', await scene(page, 'BattleScene', (sc) => sc.children.list.filter((o) => o.type === 'Rectangle' && o.blendMode === 1).length), 'zoom', await scene(page, 'BattleScene', (sc) => sc.cameras.main.zoom));
  await shot.slow(1);
};
