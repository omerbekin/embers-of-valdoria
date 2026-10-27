// Debug > Campaign > "Maps 2-3 (test)" (maps-2-3.md 9.1-9.2, Adım 1): Harita 2'yi bayrak kapalıyken denemek için.
// Kısayolların kural tarafı saf: src/campaign/maps23-debug.ts. Bayrak: src/ui/maps23-flag.ts (eov.debug.maps23 ya da ?maps=1).
import { DROWNED_REACH, WAYSHRINES, debugFinishMap1, debugJumpDrownedReach, debugJumpNode, debugJumpRegion, debugSetBoons, diveMax, getMap, mapEnabled, setMapOverride, type CampaignState } from '../campaign';
import { save, setState } from '../game/campaign-session';
import type { DebugMenu } from './debug-menu';
import { setMaps23 } from './maps23-flag';

export const MAPS23_SECTION = 'Maps 2-3 (test)';
export const SIDE_SECTION = 'Map 2 side content';
const TAB = 'Campaign';

/** Kısayollar bayrağı da açar (yoksa geçiş görünmez). */
function enable(): void {
  setMapOverride(DROWNED_REACH, true);
  setMaps23(true);
}

export function registerMaps23Debug(debug: DebugMenu, reload: () => void, ensureState: () => CampaignState): void {
  const apply = (s: CampaignState) => {
    setState(s);
    save('auto');
    reload();
  };
  debug.register({
    id: 'maps23.enable',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'eye',
    on: () => mapEnabled(DROWNED_REACH),
    label: () => `Enable Map 2: ${mapEnabled(DROWNED_REACH) ? 'on' : 'off'}`,
    hint: 'Show "Continue to The Drowned Reach" after Castle Morvane (remembered in this browser; the address flag ?maps=1 does the same, ?maps=0 turns it off). Off = the game as players see it.',
    run: () => {
      const on = !mapEnabled(DROWNED_REACH);
      setMapOverride(DROWNED_REACH, on);
      setMaps23(on);
    },
  });
  debug.register({
    id: 'maps23.jump',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'boot',
    label: 'Jump to The Drowned Reach',
    hint: 'Finish Map 1 automatically (same seed; 4-hero company), cross to the start of The Drowned Reach at Lv 10 with a few elite drops equipped, everyone healed. Replaces the current campaign in its slot. Turns Map 2 on.',
    run: () => {
      enable();
      apply(debugJumpDrownedReach(ensureState()));
    },
  });
  for (const r of getMap(DROWNED_REACH).regions) {
    debug.register({
      id: `maps23.region.${r.id}`,
      tab: TAB,
      section: MAPS23_SECTION,
      icon: 'swap',
      label: `Jump to region ${r.id}`,
      hint: `${r.title ?? r.id}: walk The Drowned Reach to the first stop of this region (stops on the way count as done), team set to that stop's level and healed. Turns Map 2 on.`,
      run: () => {
        enable();
        apply(debugJumpRegion(ensureState(), r.id));
      },
    });
  }
  // A1 Wayshrines / B1 Salvage Dive (open-questions 428): düğüme atla, nimetleri ver / sil
  const map2 = getMap(DROWNED_REACH);
  for (const n of map2.nodes.filter((x) => x.shrine || (x.dive?.length ?? 0) > 0)) {
    const sh = n.shrine ? WAYSHRINES[n.shrine] : undefined;
    debug.register({
      id: `maps23.side.${n.id}`,
      tab: TAB,
      section: SIDE_SECTION,
      icon: 'boot',
      label: `${sh ? 'Wayshrine' : 'Salvage Dive'} ${n.region}: ${n.name}`,
      hint: sh
        ? `Walk The Drowned Reach to this optional shrine (team at its level, healed); its trial battle waits. ${sh.trial} Win: ${sh.name} (${sh.effect}). Turns Map 2 on.`
        : `Walk The Drowned Reach to this guarded treasure (team at its level, healed). Win the fight, then the "Dive deeper?" window offers up to ${diveMax(n) - 1} more depths. Turns Map 2 on.`,
      run: () => {
        enable();
        apply(debugJumpNode(ensureState(), n.id));
      },
    });
  }
  debug.register({
    id: 'maps23.boons.all',
    tab: TAB,
    section: SIDE_SECTION,
    icon: 'eye',
    label: 'Grant all Wayshrine blessings',
    hint: 'Give the company every Wayshrine blessing (they show in Gear, next to the gold, and apply in every battle).',
    run: () => apply(debugSetBoons(ensureState(), true)),
  });
  debug.register({
    id: 'maps23.boons.none',
    tab: TAB,
    section: SIDE_SECTION,
    icon: 'swap',
    label: 'Clear Wayshrine blessings',
    hint: 'Remove every Wayshrine blessing from the company.',
    run: () => apply(debugSetBoons(ensureState(), false)),
  });
  debug.register({
    id: 'maps23.finish1',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'burst',
    label: 'Finish Map 1 → transition',
    hint: 'Teleport to Castle Morvane (same seed) and count the boss as won: the map shows the "Map Complete" window with "Continue to The Drowned Reach". Turns Map 2 on.',
    run: () => {
      enable();
      apply(debugFinishMap1(ensureState()));
    },
  });
}
