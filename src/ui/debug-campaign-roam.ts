/**
 * Debug menüsü > Campaign sekmesi: serbest dolaşım / devriye araçları (campaign-dev; roadmap 2.10). Reset replays (devriye sayaçları ve azalan
 * getiri baştan), Teleport (keşfedilmiş herhangi bir düğüme; kadro ve ilerleme aynen kalır, yol baştan kurulmaz). Sahne sınıflarını içe
 * aktarmaz (Node testinde Phaser yok): haritayı anahtarla yeniden açar.
 */
import type Phaser from 'phaser';
import { debugResetReplays, debugRoamTeleport, discoveredNodes, getMap, isCleared, nextReplayMult, patrolAvailable, replayCount, visitedNodes } from '../campaign';
import { current, setState, MAP_SCENE } from '../game/campaign-session';
import { debugButton, debugHeading, type DebugMenu } from './debug-menu';
import { CAMPAIGN_TAB } from './debug-campaign';

const SCENES = ['BattleScene', 'TeamSelectScene', 'CampaignMapScene', 'MainMenuScene'];

/** Haritayı (yeniden) açar: etkin sahne haritaya geçer. */
function openMap(game: Phaser.Game): void {
  const active = SCENES.find((k) => game.scene.isActive(k));
  if (active) (game.scene.getScene(active) as Phaser.Scene).scene.start(MAP_SCENE);
  else game.scene.start(MAP_SCENE);
}

export function registerCampaignRoamDebug(game: Phaser.Game, debug: DebugMenu, tab: string = CAMPAIGN_TAB): void {
  debug.register({
    id: 'campaign.reset-replays',
    tab,
    section: 'Progress',
    icon: 'clipboard',
    label: 'Reset replays',
    hint: 'Free roaming: forget how many times each cleared stop was fought again (the next patrol pays the first replay rate again). Needs a loaded campaign.',
    run: () => {
      const s = current();
      if (!s) return;
      setState(debugResetReplays(s));
      openMap(game);
    },
  });
  debug.registerPanel({
    id: 'campaign.roam-teleport',
    tab,
    render: (el) => {
      el.append(debugHeading('Teleport (free roaming)'));
      const s = current();
      const note = document.createElement('div');
      note.className = 'debug-note';
      if (!s) {
        note.textContent = 'No campaign loaded.';
        el.append(note);
        return;
      }
      const map = getMap(s.mapId);
      const seen = discoveredNodes(map, visitedNodes(s));
      const grid = document.createElement('div');
      grid.className = 'debug-grid';
      for (const n of map.nodes.filter((x) => seen.has(x.id) && x.id !== s.at)) {
        const tag = isCleared(s, n.id) ? (patrolAvailable(s, n.id) ? ` · patrol ${Math.round(nextReplayMult(s, n.id) * 100)}%` : ' · cleared') : '';
        grid.append(
          debugButton(`${n.id} ${n.name}${tag}`, () => {
            const now = current();
            if (!now) return;
            setState(debugRoamTeleport(now, n.id));
            openMap(game);
          }, { title: `${n.subtitle}: move the company there at once (heroes, items and progress stay; the stop's content waits if it is not cleared yet). Locked while a battle is paused.` }),
        );
      }
      el.append(grid);
      const replays = Object.entries(s.replays ?? {}).map(([id, k]) => `${id} x${k}`);
      note.textContent = `At ${s.at} · discovered ${seen.size}/${map.nodes.length} · replays: ${replays.length ? replays.join(', ') : 'none'} · here: ${replayCount(s, s.at)}`;
      el.append(note);
    },
  });
}
