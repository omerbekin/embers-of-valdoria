/**
 * Debug menüsü > Setup > Endless (Endless Lite, open-questions madde 281): ekranı aç, dalgayı kazanılmış say (ödül/dükkân/boss akışını hızlı
 * denemek için), sonraki elit/boss dalgasına atla, altın ver, en iyi koşular listesini sil. Sahne sınıfını içe aktarmaz (Node testinde Phaser yok).
 */
import type Phaser from 'phaser';
import { SCORES_KEY, acknowledgeRunLevelUps, applyOutcome, debugRunLevel, debugRunXp, autoPlayWave, giveItem, grantLegendariesRun, grantRelic, waveKind, wavePlan, type EndlessRun } from '../endless';
import { ENDLESS_SCENE, commit, continueRun, endless, openEndless, openMerchant, recordScore, startRun, storage } from '../game/endless-session';
import type { DebugMenu } from './debug-menu';
import { levelUpText, xpToNext } from '../progression/levels';

const TAB = 'Setup';
const SECTION = 'Endless';
const SCENES = ['BattleScene', 'TeamSelectScene', 'CampaignMapScene', 'MainMenuScene', 'MultiplayerScene', ENDLESS_SCENE];

function open(game: Phaser.Game, data?: object): void {
  const active = SCENES.find((k) => game.scene.isActive(k));
  if (active) (game.scene.getScene(active) as Phaser.Scene).scene.start(ENDLESS_SCENE, data);
  else game.scene.start(ENDLESS_SCENE, data);
}

/** Kampta bekleyen koşu (yoksa kayıtlı olan; o da yoksa rastgele 4 class'lık yeni koşu). */
function readyRun(): EndlessRun {
  const run = endless.run ?? continueRun() ?? startRun(['warrior', 'archer', 'mage', 'druid']);
  return run;
}

export function registerEndlessDebug(game: Phaser.Game, debug: DebugMenu): void {
  debug.register({
    id: 'endless.open',
    tab: TAB,
    section: SECTION,
    icon: 'next',
    label: 'Open Endless',
    hint: 'Open the Endless screen (Continue / New Run / best runs). Also: add ?endless=1 to the address',
    run: () => openEndless(game),
  });
  debug.register({
    id: 'endless.legendaries',
    tab: TAB,
    section: SECTION,
    icon: 'burst',
    label: 'Give all Legendaries',
    hint: 'Put all 10 Legendary items into the run bag (they are not offered in rewards or the shop yet). Also: ?legendary=1',
    run: () => {
      commit(grantLegendariesRun(readyRun()));
      open(game);
    },
  });
  // Level / XP (Ömer 2026-10-17, levels.md): koşunun kahramanlarına; puanlar kampta Gear > Character
  debug.register({
    id: 'endless.xp',
    tab: TAB,
    section: SECTION,
    icon: 'feather',
    label: 'Grant XP (one level)',
    hint: 'Give every hero of the run enough XP for one level; spend the stat points in camp: Gear > Character',
    run: () => {
      const run = readyRun();
      const lv = Math.min(...run.heroes.map((h) => h.level ?? 1));
      const next = debugRunXp(run, xpToNext(lv));
      endless.notice = levelUpText((next.levelUps ?? []).map((u) => ({ name: next.heroes.find((h) => h.id === u.heroId)?.class ?? 'hero', to: u.to })));
      commit(acknowledgeRunLevelUps(next));
      open(game);
    },
  });
  debug.register({
    id: 'endless.level',
    tab: TAB,
    section: SECTION,
    icon: 'muscle',
    label: 'Set level 10',
    hint: 'Set every hero of the run to Level 10 (XP 0; placed stat points reset, 27 points wait in Gear > Character)',
    run: () => {
      commit(debugRunLevel(readyRun(), 10));
      open(game);
    },
  });
  debug.register({
    id: 'endless.win',
    tab: TAB,
    section: SECTION,
    icon: 'helm',
    label: 'Win this wave',
    hint: 'Count the waiting wave as won without fighting (heroes keep their health) and open the reward cards; starts a run if none',
    run: () => {
      const run = readyRun();
      if (run.phase !== 'ready') return open(game);
      const plan = wavePlan(run);
      commit(applyOutcome(run, plan, { victory: true, units: run.heroes.map((h) => ({ heroId: h.id, hpRatio: h.hpRatio, alive: true })), kills: plan.enemies.filter(Boolean).length, turns: 0 }));
      open(game);
    },
  });
  debug.register({
    id: 'endless.auto',
    tab: TAB,
    section: SECTION,
    icon: 'flask',
    label: 'Auto-play wave',
    hint: 'Let the AI play the waiting wave for your side too (instant, no animation) and show the result: rewards or the run summary',
    run: () => {
      const run = readyRun();
      if (run.phase !== 'ready') return open(game);
      const next = autoPlayWave(run);
      commit(next);
      if (next.phase === 'over') recordScore(next); // yenilgi: skor listesine yazılır (savaş ekranındaki yolla aynı)
      open(game);
    },
  });
  debug.register({
    id: 'endless.jump',
    tab: TAB,
    section: SECTION,
    icon: 'skull',
    label: 'Jump to elite/boss',
    hint: 'Move the waiting run to the next elite or boss wave (no rewards are given for the skipped waves)',
    run: () => {
      const run = readyRun();
      if (run.phase !== 'ready') return open(game);
      let w = run.wave + 1;
      while (waveKind(w) === 'normal') w++;
      commit({ ...run, wave: w, stats: { ...run.stats, cleared: w - 1 } });
      open(game);
    },
  });
  debug.register({
    id: 'endless.fallen',
    tab: TAB,
    section: SECTION,
    icon: 'skull',
    label: 'Toggle first hero fallen',
    hint: 'Make the first hero of the run fallen (HP 0) or revive them: a fallen hero is shown greyed in Gear and their gear is locked',
    run: () => {
      const run = readyRun();
      const h = run.heroes[0];
      if (!h) return;
      commit({ ...run, heroes: run.heroes.map((x, i) => (i === 0 ? { ...x, hpRatio: x.hpRatio <= 0 ? 1 : 0 } : x)) });
      if (game.scene.isActive(ENDLESS_SCENE)) open(game);
    },
  });
  // Yara (can ve ölüm reworkü, Ömer 2026-10-19)
  const woundTool = (id: string, label: string, hint: string, delta: number | null): void =>
    debug.register({
      id,
      tab: TAB,
      section: SECTION,
      icon: 'skull',
      label,
      hint,
      run: () => {
        const run = readyRun();
        const heroes = run.heroes.map((x, i) => {
          if (delta !== null && i !== 0) return x;
          const n = delta === null ? 0 : Math.max(0, Math.floor(x.wounds ?? 0) + delta);
          const { wounds: _w, ...rest } = x;
          return n > 0 ? { ...rest, wounds: n } : rest;
        });
        commit({ ...run, heroes });
        if (game.scene.isActive(ENDLESS_SCENE)) open(game);
      },
    });
  woundTool('endless.woundAdd', 'Wound first hero (+1)', 'Give the first hero of the run one wound (lower max HP; with 3 wounds the next fall kills). Shown under the hero health in camp and in the Gear tooltip', 1);
  woundTool('endless.woundRemove', 'Heal one wound (first hero)', 'Remove one wound from the first hero of the run', -1);
  woundTool('endless.woundClear', 'Clear all wounds', 'Remove every wound from the whole party', null);
  debug.register({
    id: 'endless.gold',
    tab: TAB,
    section: SECTION,
    icon: 'clipboard',
    label: 'Give 200 gold',
    hint: 'Add 200 gold to the current Endless run (for the merchant)',
    run: () => {
      const run = readyRun();
      commit({ ...run, gold: run.gold + 200 });
      if (game.scene.isActive(ENDLESS_SCENE)) open(game);
    },
  });
  debug.register({
    id: 'endless.shop',
    tab: TAB,
    section: SECTION,
    icon: 'clipboard',
    label: 'Open merchant',
    hint: 'Open the merchant (Odo the Peddler): in the waiting camp of your run, or else in a throwaway preview run that is not saved or scored. Also: ?merchant=1',
    run: () => openMerchant(game),
  });
  debug.register({
    id: 'endless.relic',
    tab: TAB,
    section: SECTION,
    icon: 'ankh',
    label: 'Give relic',
    hint: 'Give the current Endless run the next relic it does not have yet (a suspended battle is discarded, its setup changed)',
    run: () => {
      const run = readyRun();
      commit(grantRelic(run));
      if (game.scene.isActive(ENDLESS_SCENE)) open(game);
    },
  });
  debug.register({
    id: 'endless.item',
    tab: TAB,
    section: SECTION,
    icon: 'helm',
    label: 'Give item',
    hint: 'Put an item into the Endless bag (equip it on the camp screen with Gear)',
    run: () => {
      commit(giveItem(readyRun()));
      if (game.scene.isActive(ENDLESS_SCENE)) open(game);
    },
  });
  debug.register({
    id: 'endless.scores',
    tab: TAB,
    section: SECTION,
    icon: 'restart',
    label: 'Clear best runs',
    hint: 'Delete the local list of best Endless runs',
    run: () => {
      try {
        storage()?.removeItem(SCORES_KEY);
      } catch {
        /* depo kapalı */
      }
      if (game.scene.isActive(ENDLESS_SCENE)) openEndless(game);
    },
  });
}
