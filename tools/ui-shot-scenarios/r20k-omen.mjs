// Omen elmas parlaması (+1 / kritik +2) ve Resilience tur vurgusu: gerçek sefer savaşı (düğüm 2), takıma Hexer eklenir (debug görev atlamasının sınıf ekleme yolu); kritik hep açık, otomatik oyun.
// (Test Mode savaşında oyun sırasız olduğundan otomatik oynamıyor; o yüzden sefer savaşı.)
import { dbg, battleAt, waitFor, traceView, castV, scene } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  const cast = castV(shot, wait, view);
  await battleAt(page, wait, '2', { ensure: 'hexer', settle: 6000 });
  await traceView(page, 'glowSeals');
  await traceView(page, 'flashBadge');
  // Elle tetikleme: düşmanlara Resilience %100 (Hexer'in tur sürdüren debuff'ı 1 tur kısalır -> rozet vurgusu); gerçek savaşta düşmanda Resilience olmaz
  await scene(page, 'BattleScene', (sc) => { for (const c of sc.battle.combatants) if (c.side === 'enemy') c.stats.resilience = 1; });
  await dbg(page, 'tweak.crit.always');
  await dbg(page, 'battle.autoplay');
  await shot.slow(0.2);
  const g = await waitFor(page, wait, () => (window.__tr?.glowSeals?.n ?? 0) >= 1, 150000, 40);
  console.log('glowSeals', g, await page.evaluate(() => window.__tr?.glowSeals?.args));
  await cast('omen-elmas', 2400, 150, 4);
  const f = await waitFor(page, wait, () => (window.__tr?.flashBadge?.n ?? 0) >= 1, 150000, 60);
  console.log('flashBadge (Resilience)', f);
  if (f) await cast('resilience-tur', 1600, 100, 3);
  await shot.slow(1);
};
