// Karo galerisi (yalnız biçim paneli): savaş HUD (sıra çubuğu, sırası gelen birim, skill ipucu, durum satırı, Lucky Escape), sonuç ekranı. KARO_OUT=<klasör>.
import { dbg, scene } from './_lib.mjs';
import { HIDE_DEBUG, autoRing, autoRingPhaser, hookPhaser, domLoc, ring, ctxShot, saveManifest } from './karo2-lib.mjs';
export default async ({ page, wait, view }) => {
  await page.addStyleTag({ content: HIDE_DEBUG });
  await hookPhaser(page);
  // Test savaşı: Gambler (Luck birincil = Lucky Escape elması) + Hexer + Warrior + Mage
  await page.evaluate(async () => {
    const { content } = await import('/src/engine/index.ts');
    const seed = 4242;
    const data = { seed, mode: 'test', teams: { party: content.randomCells(content.arrangeTeam(['gambler', 'hexer', 'warrior', 'mage']), seed), enemies: content.randomCells(content.randomTeam(seed + 7, 4), seed + 7) }, partySize: 4, enemySize: 4 };
    window.__game.scene.getScenes(true)[0].scene.start('BattleScene', data);
  });
  await page.waitForSelector('.bh-skills .bp', { timeout: 90000 }).catch(() => console.log(view, 'HUD yok'));
  await wait(6000);
  await page.addStyleTag({ content: HIDE_DEBUG });
  for (let i = 0; i < 8 && !(await page.locator('.bh-lucky').count()); i++) { await dbg(page, 'battle.cycle-actor'); await wait(1500); }
  console.log('lucky', await page.locator('.bh-lucky').count(), 'i', await page.locator('.bh-lucky i').count());
  // skill biçim seçimi paneli (Radiance / Card Trick ağaç seçimi): ağaç kurmak yerine panel doğrudan açılır (ZORLANMIŞ kare; ok ucu .sc-arrow)
  const mp = await scene(page, 'BattleScene', (sc) => {
    const id = document.querySelector('.bp[data-skill]:not(.pas)')?.getAttribute('data-skill');
    const a = sc.currentActor ?? sc.battle.combatants.find((c) => c.side !== 'enemy' && JSON.stringify(c.skills ?? c.def?.skills ?? '').includes(id)) ?? sc.battle.combatants.find((c) => c.defId === 'hexer');
    const base = id && sc.battle.skill(id, a);
    if (!a || !base) return 'yok ' + JSON.stringify({ a: !!a, id, base: !!base });
    sc.openModePanel(a, id, { keepBase: true, baseText: base.name + ' as usual.', list: [{ id: 'slow', name: 'Slow', text: 'Adds Slow for 2 turns.', status: 'slow', skill: base }, { id: 'stun', name: 'Stun', text: 'Adds Stun for 1 turn.', status: 'stun', skill: base }] });
    return 'ok ' + id;
  });
  console.log('mode panel', mp);
  await wait(1200);
  await autoRing(page, 'savas-bicim');
  await ctxShot(page, { x: 5, y: 5, s: 1 }, 'savas-bicim-tam');
};
