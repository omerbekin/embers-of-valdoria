// Redtithe step1 denemesi: Redtithe'li savaş; görünüm yürütülür (CombatantView.moveTo ileri, sonra geri: idle1 > step1 > idle1). Yalnız görsel, motor değişmez.
// Yavaş çekimde kareler alınır (redtithe-yuru-<WxH>-cNN.jpg).
import { tutorialsOff, dismiss } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await wait(1500);
  await tutorialsOff(page);
  await page.evaluate(async () => {
    const { content } = await import('/src/engine/index.ts');
    const seed = 4242;
    const teams = { party: content.arrangeTeam(['antimage', 'warrior', 'skald', 'druid']), enemies: content.randomTeam(seed + 7, 4) };
    window.__game.scene.getScenes(true).forEach((s) => s.scene.stop());
    window.__game.scene.start('BattleScene', { seed, mode: 'turns', battleId: content.DEFAULT_BATTLE, teams, partySize: 4, enemySize: 4 });
  });
  await wait(8000);
  await dismiss(page, wait);
  await wait(3000);
  await shot('redtithe-dur');
  await shot.slow(0.2);
  await page.evaluate(() => {
    const sc = window.__game.scene.getScene('BattleScene');
    const v = [...sc.views.values()].find((w) => w.combatant.defId === 'antimage' || w.combatant.classId === 'antimage');
    const hx = v.homeX, hy = v.baseY;
    v.moveTo(hx + 120, hy, 900).then(() => new Promise((r) => setTimeout(r, 400))).then(() => v.moveTo(hx, hy, 900)).then(() => v.setFlip?.(false));
  });
  await shot.cast('redtithe-yuru', 3200, 160);
  await shot.slow(1);
};
