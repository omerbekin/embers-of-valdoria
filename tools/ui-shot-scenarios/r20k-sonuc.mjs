// a09 sıra şeridi kayması (ilk düşman ölümü), a03 son vuruş (zafer), a17 sonuç sayımı + MVP: gerçek sefer savaşı (düğüm 2), hile yok, otomatik oyun.
import { battleAt, waitFor, dbg, traceView, traceCount, castV, scene } from './_lib.mjs';
const lowEnemy = () => { const b = window.__game.scene.getScene('BattleScene').battle; const e = (b?.combatants ?? []).filter((x) => x.side === 'enemy' && x.hp > 0); return e.length > 0 && e.some((x) => x.hp < x.maxHp * 0.3); };
export default async ({ page, shot, wait, view }) => {
  const cast = castV(shot, wait, view);
  await battleAt(page, wait, '2', { settle: 6000 });
  await traceView(page, 'die');
  await dbg(page, 'battle.autoplay');
  await waitFor(page, wait, lowEnemy, 150000, 40);
  await shot.slow(0.2);
  await waitFor(page, wait, () => (window.__tr?.die?.n ?? 0) >= 1, 60000, 40);
  await cast('sira-seridi', 1600, 100, 5); // portre kayması + yeşil/gri kenar
  // son düşmana kadar normal hız
  await shot.slow(1);
  await waitFor(page, wait, () => { const b = window.__game.scene.getScene('BattleScene').battle; const e = (b?.combatants ?? []).filter((x) => x.side === 'enemy' && x.hp > 0); return e.length === 1 && e[0].hp < e[0].maxHp * 0.3; }, 150000, 40);
  await shot.slow(0.2);
  await waitFor(page, wait, () => (window.__game.scene.getScene('BattleScene').children.list.some((o) => o.depth === 4600)), 60000, 30);
  await cast('zafer-son-vurus', 1400, 100, 3);
  await cast('sonuc-sayim', 2800, 100, 12);
  await shot.slow(1);
  await wait(2500);
  await shot('sonuc-oturdu');
};
