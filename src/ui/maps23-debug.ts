// Debug > Campaign > "Maps 2-3 (test)" (maps-2-3.md 9.1-9.2, Adım 1): Harita 2'yi bayrak kapalıyken denemek için.
// Kısayolların kural tarafı saf: src/campaign/maps23-debug.ts. Bayrak: src/ui/maps23-flag.ts (eov.debug.maps23 ya da ?maps=1).
import {
  DROWNED_REACH,
  OATHS,
  debugFinishMap1,
  debugJumpDrownedReach,
  debugJumpNode,
  debugJumpRegion,
  debugSetOath,
  debugSetPitBest,
  getMap,
  leaderOf,
  mapEnabled,
  oathDef,
  pitBest,
  pitOf,
  setMapOverride,
  type CampaignState,
} from '../campaign';
import { save, setState } from '../game/campaign-session';
import type { DebugMenu } from './debug-menu';
import { setMaps23 } from './maps23-flag';

export const MAPS23_SECTION = 'Maps 2-3 (test)';
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
  // B5 The Fighting Pit + A4 Hero Oath (open-questions 429)
  debug.register({
    id: 'maps23.pit.jump',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'boot',
    label: 'Jump to Saltmere (Fighting Pit)',
    hint: 'Walk The Drowned Reach to Saltmere (stops on the way count as done), team at its level and healed. In the town, tap "The Fighting Pit". Turns Map 2 on.',
    run: () => {
      enable();
      apply(debugJumpNode(ensureState(), 'dr28'));
    },
  });
  debug.register({
    id: 'maps23.pit.record',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'swap',
    label: () => `Pit record: ${pitBest(ensureState(), 'dr28')} (tap to cycle)`,
    hint: 'Set the Saltmere pit record 0 → 1 → ... → 5 → 0 (only bouts above the record pay). Closes an open pit run.',
    run: () => {
      const s = ensureState();
      const max = pitOf(getMap(DROWNED_REACH).nodes.find((n) => n.id === 'dr28')!)?.tiers.length ?? 5;
      apply(debugSetPitBest(s, 'dr28', (pitBest(s, 'dr28') + 1) % (max + 1)));
    },
  });
  debug.register({
    id: 'maps23.oath.jump',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'boot',
    label: 'Jump to Saltspray Shrine (Hero Oath)',
    hint: 'Walk The Drowned Reach to the Saltspray Shrine (stops on the way count as done), team at its level and healed. Choose "Swear an oath"; later tap the shrine again to break it. Turns Map 2 on.',
    run: () => {
      enable();
      apply(debugJumpNode(ensureState(), 'dr52'));
    },
  });
  debug.register({
    id: 'maps23.oath.cycle',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'swap',
    label: () => {
      const o = ensureState().oath;
      return `Oath: ${o ? (oathDef(o.id)?.name ?? o.id) : 'none'} (tap to cycle)`;
    },
    hint: 'Give the company leader the next oath (Undertow → Breakwater → Gale → none), no shrine or gold needed. Shown in Gear as a small Oath chip.',
    run: () => {
      const s = ensureState();
      const i = s.oath ? OATHS.findIndex((x) => x.id === s.oath!.id) + 1 : 0;
      const lead = leaderOf(s);
      apply(i < OATHS.length && lead ? debugSetOath(s, lead.id, OATHS[i]!.id) : debugSetOath(s, null));
    },
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
