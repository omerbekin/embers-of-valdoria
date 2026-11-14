/** Debug menüsü > Campaign > Badges > "Badge demo state": rozet zincirini denemek için (kahramanlara puan + torbaya yeni item). */
import type Phaser from 'phaser';
import { ITEMS, xpToNext } from '../progression';
import { addItem, bagHasRoom, debugGrantXp, debugTeleport, getMap, newCampaign, type CampaignState } from '../campaign';
import { current, setState, MAP_SCENE } from '../game/campaign-session';
import type { DebugMenu } from './debug-menu';
import { snapshotSeen } from './badges';

const TAB = 'Campaign';
const SECTION = 'Badges';

export function registerBadgeDebug(game: Phaser.Game, debug: DebugMenu): void {
  debug.register({
    id: 'badges.demo',
    tab: TAB,
    section: SECTION,
    icon: 'muscle',
    label: 'Badge demo state',
    hint: 'Campaign: every hero gains 2 levels (unspent stat + skill tree points) and 2 new items land in the bag, then the map opens. Open Gear to follow the badge chain (map Gear button, hero bookmark, tabs, stat tiles / tree nodes / new items).',
    run: () => {
      let s: CampaignState = current() ?? newCampaign({ mode: 'normal', seed: Math.floor(Date.now() % 1_000_000_000) });
      if (!s.roster.length) s = debugTeleport(s, getMap(s.mapId).nodes.find((n) => n.type === 'town')?.id ?? s.at);
      setState(s);
      snapshotSeen(); // şu anki torba görülmüş: aşağıdaki 2 item yeni sayılır
      for (let k = 0; k < 2; k++) {
        const team = s.roster.filter((h) => s.active.includes(h.id));
        const lv = team.length ? Math.min(...team.map((h) => h.level)) : 1;
        s = debugGrantXp(s, xpToNext(lv));
      }
      const pool = ITEMS.items.filter((d) => d.rarity === 'rare' && !d.set);
      for (let i = 0; i < 2 && pool.length && bagHasRoom(s); i++) s = addItem(s, pool[(s.nextItemId * 7 + i * 13) % pool.length]!.id).state;
      setState(s);
      document.dispatchEvent(new CustomEvent('gear:refresh'));
      const active = ['BattleScene', 'TeamSelectScene', 'CampaignMapScene', 'MainMenuScene'].find((k) => game.scene.isActive(k));
      if (active) (game.scene.getScene(active) as Phaser.Scene).scene.start(MAP_SCENE);
      else game.scene.start(MAP_SCENE);
    },
  });
}
