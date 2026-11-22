// Redtithe idle1 (v4 R2) oyunda: Redtithe'li 4'lü takımla savaş açılır, ilk kare çekilir (oyun boyu kol/omuz denetimi).
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
  await wait(4000);
  console.log('sahneler', await page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join()));
  await shot('redtithe-savas');
};
