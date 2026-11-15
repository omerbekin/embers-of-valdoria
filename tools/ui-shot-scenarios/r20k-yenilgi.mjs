// a03 YENİLGİ (soğuk ton): gerçek sefer savaşı (düğüm 2); iki taraf tek vuruşta öldürür, oyuncu sırayı atlar, düşman kazanır.
import { battleAt, waitFor, dbg, castV } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  const cast = castV(shot, wait, view);
  await battleAt(page, wait, '2', { settle: 6000 });
  await dbg(page, 'tweak.damage.9999');
  await shot.slow(0.2);
  for (let i = 0; i < 6; i++) { await dbg(page, 'battle.skip-turn'); await wait(500); }
  await waitFor(page, wait, () => (window.__game.scene.getScene('BattleScene').children.list.some((o) => o.depth === 4600)), 120000, 30);
  await cast('yenilgi-son-vurus', 1400, 100, 3);
  await cast('yenilgi-sonuc', 2400, 100, 10);
  await shot.slow(1);
};
