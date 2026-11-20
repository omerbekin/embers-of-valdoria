// Durum rozeti altındaki yüzde: sefer 9 (boss savaşı); kahramana ve düşmanlara (boss dahil) farklı durumlar basılır, yüzdeler okunur.
import { battleAt, scene } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await battleAt(page, wait, '9', { settle: 14000 });
  await scene(page, 'BattleScene', (sc) => {
    const b = sc.battle;
    const heroes = b.combatants.filter((c) => c.side !== 'enemy');
    const foes = b.combatants.filter((c) => c.side === 'enemy');
    const src = heroes[0].uid;
    for (const t of [heroes[0], ...foes]) for (const k of ['blinded', 'slow', 'exposed', 'stun', 'burning', 'weakened']) b.addStatus(t, { kind: k, turns: 3, source: src }, () => {});
    b.addStatus(heroes[1], { kind: 'haste', turns: 3, source: heroes[1].uid }, () => {});
    sc.refreshBadges();
  });
  await wait(800);
  await shot('durum-yuzde');
};
