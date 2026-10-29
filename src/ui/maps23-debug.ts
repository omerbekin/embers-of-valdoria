// Debug > Campaign > "Maps 2-3 (test)" (maps-2-3.md 9.1-9.2, Adım 1): Harita 2'yi bayrak kapalıyken denemek için.
// Kısayolların kural tarafı saf: src/campaign/maps23-debug.ts. Bayrak: src/ui/maps23-flag.ts (eov.debug.maps23 ya da ?maps=1).
import {
  DROWNED_REACH,
  HOLLOW_CROWN,
  OATHS,
  QUEST_LIST,
  WAYSHRINES,
  debugFinishMap1,
  debugFinishMap2,
  debugJumpHollowCrown,
  debugJumpHollowNode,
  debugSealedTomb,
  debugSetStoneOath,
  debugSetWhiteDarkChill,
  debugJumpDrownedReach,
  debugJumpNode,
  debugJumpQuest,
  debugJumpRegion,
  debugSetBoons,
  debugSetOath,
  debugSetPitBest,
  debugBeatCaravel,
  debugSetFaction,
  debugSetLit,
  debugSetSea,
  debugStepCaravel,
  caravelAt,
  caravelBeaten,
  seaOpen,
  FACTION_NAMES,
  diveMax,
  getMap,
  questBonusLine,
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
export const SIDE_SECTION = 'Map 2 side content';
export const SEA_SECTION = 'Map 2 sea and factions';
const TAB = 'Campaign';

/** Kısayollar bayrağı da açar (yoksa geçiş görünmez). */
function enable(): void {
  setMapOverride(DROWNED_REACH, true);
  setMaps23(true);
}

/** Harita 3 kısayolları bayrağı açar. */
function enable3(): void {
  enable();
  setMapOverride(HOLLOW_CROWN, true);
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
  // A5 Personal Quests (open-questions 431): görev düğümüne atla (sınıf takımda yoksa bir kahramanın yerine girer)
  for (const q of QUEST_LIST) {
    const n = map2.nodes.find((x) => x.id === q.node);
    const cls = q.class.charAt(0).toUpperCase() + q.class.slice(1);
    debug.register({
      id: `maps23.quest.${q.id}`,
      tab: TAB,
      section: SIDE_SECTION,
      icon: 'boot',
      label: `Quest (${cls}): ${q.name}`,
      hint: `Walk The Drowned Reach to ${n?.name ?? q.node} (team at its level, healed). If no ${cls} is in the company, one joins in place of the last hero (who goes to the reserve). Finish it: title "${q.title}", ${questBonusLine(q)}. Turns Map 2 on.`,
      run: () => {
        enable();
        apply(debugJumpQuest(ensureState(), q.id));
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
  // M-J / M-K / M-L / M-M (src/campaign/reach.ts, open-questions 433)
  const stops: Array<[string, string, string]> = [
    ['dr31', 'Guild Hall (choose a side)', 'Walk to the Guild Hall in Saltmere; the faction choice waits. "Not yet" asks again when you come back.'],
    ['dr32', 'Harbor Fort (faction elite)', 'Walk to Harbor Fort. Order side or no side: Guild Enforcer Bastion. Guild side: Inquisitor-Captain Vell.'],
    ['dr38', 'Ferry Office (charter a ship)', 'Walk to the Ferry Office; "Charter a ship" opens the sea lanes (60 gold, or free for the Guild side).'],
    ['dr45', 'Lantern Rock (lighthouse)', 'Walk to Lantern Rock; lighting the lamp gives +1 sight for the rest of the map.'],
    ['dr54', "Fisher's Landing (harbour)", "Walk to Fisher's Landing, where the sea lanes start. The Keeper's daughter tells the Black Caravel's route."],
    ['dr56', "Monk's Isle (faction event)", "Walk to Monk's Isle (opens the sea lanes on the way). No side: bread. Order: rest and a relic. Guild: a fight for a chest."],
  ];
  for (const [id, label, hint] of stops)
    debug.register({
      id: `maps23.sea.${id}`,
      tab: TAB,
      section: SEA_SECTION,
      icon: 'boot',
      label: `Jump to ${label}`,
      hint: `${hint} Team at the stop's level, healed. Turns Map 2 on.`,
      run: () => {
        enable();
        apply(debugJumpNode(ensureState(), id));
      },
    });
  debug.register({
    id: 'maps23.sea.faction',
    tab: TAB,
    section: SEA_SECTION,
    icon: 'swap',
    label: () => {
      const f = ensureState().faction;
      return `Side: ${f ? FACTION_NAMES[f] : 'none'} (tap to cycle)`;
    },
    hint: 'Cycle the company\'s side none → Order → Guild → none. Changes the Harbor Fort elite, Monk\'s Isle, merchant stock and the Ferry Office price.',
    run: () => {
      const s = ensureState();
      apply(debugSetFaction(s, !s.faction ? 'order' : s.faction === 'order' ? 'guild' : null));
    },
  });
  const map2Sea = getMap(DROWNED_REACH);
  debug.register({
    id: 'maps23.sea.lanes',
    tab: TAB,
    section: SEA_SECTION,
    icon: 'eye',
    on: () => {
      const s = ensureState();
      return s.mapId === DROWNED_REACH && seaOpen(map2Sea, s);
    },
    label: () => {
      const s = ensureState();
      return `Sea lanes: ${s.mapId === DROWNED_REACH && seaOpen(map2Sea, s) ? 'open' : 'closed'}`;
    },
    hint: 'Open the sea lanes as if a ship was chartered (the Black Caravel starts sailing), or close them again. Closing does not move a team already on an isle.',
    run: () => {
      const s = ensureState();
      apply(debugSetSea(s, !s.sea));
    },
  });
  debug.register({
    id: 'maps23.sea.caravel.step',
    tab: TAB,
    section: SEA_SECTION,
    icon: 'swap',
    label: () => {
      const s = ensureState();
      const at = s.mapId === DROWNED_REACH ? caravelAt(map2Sea, s) : null;
      return `Move the Black Caravel (now: ${at ? map2Sea.nodes.find((n) => n.id === at)?.name ?? at : 'not sailing'})`;
    },
    hint: 'Move the Black Caravel one stop along its route (The Sound → The Narrows → Open Water → Storm Strait). Only while the sea lanes are open and it is not sunk.',
    run: () => apply(debugStepCaravel(ensureState())),
  });
  debug.register({
    id: 'maps23.sea.caravel.beat',
    tab: TAB,
    section: SEA_SECTION,
    icon: 'burst',
    on: () => {
      const s = ensureState();
      return s.mapId === DROWNED_REACH && caravelBeaten(map2Sea, s);
    },
    label: 'Sink the Black Caravel',
    hint: 'Count the Black Caravel as defeated: the sea lanes open and Gallows Cove unlocks.',
    run: () => apply(debugBeatCaravel(ensureState())),
  });
  debug.register({
    id: 'maps23.sea.lit',
    tab: TAB,
    section: SEA_SECTION,
    icon: 'eye',
    on: () => !!ensureState().lit,
    label: () => `Lighthouse: ${ensureState().lit ? 'lit' : 'dark'}`,
    hint: 'Light or put out the Lantern Rock lamp (+1 sight on this map while lit).',
    run: () => {
      const s = ensureState();
      apply(debugSetLit(s, !s.lit));
    },
  });
  // Harita 3 (The Hollow Crown) iskeleti: bayrak campaign.json > mapFlags['hollow-crown'] (kapalı)
  debug.register({
    id: 'maps23.enable3',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'eye',
    on: () => mapEnabled(HOLLOW_CROWN),
    label: () => `Enable Map 3: ${mapEnabled(HOLLOW_CROWN) ? 'on' : 'off'}`,
    hint: 'Show "Continue to The Hollow Crown" after the Two Crowns ending of Map 2 (remembered in this browser, same switch as ?maps=1). Off = Map 2 ends with "To Be Continued", as players see it.',
    run: () => {
      const on = !mapEnabled(HOLLOW_CROWN);
      setMapOverride(HOLLOW_CROWN, on);
      setMaps23(on);
    },
  });
  debug.register({
    id: 'maps23.finish2',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'burst',
    label: 'Finish Map 2 → transition',
    hint: 'Walk The Drowned Reach to its end (every stop on the way counts as won, same seed) and stop at the Two Crowns ending: the "Map Complete" window with "Continue to The Hollow Crown". Turns Map 3 on.',
    run: () => {
      enable3();
      apply(debugFinishMap2(ensureState()));
    },
  });
  debug.register({
    id: 'maps23.jump3',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'boot',
    label: 'Jump to The Hollow Crown',
    hint: 'Finish Maps 1 and 2 automatically (same seed), cross to the start of The Hollow Crown at Lv 20 with a few elite drops equipped, everyone healed. Placeholder enemies and town art. Replaces the current campaign in its slot. Turns Map 3 on.',
    run: () => {
      enable3();
      apply(debugJumpHollowCrown(ensureState()));
    },
  });
  // Harita 3 düğüm kuralları (open-questions 454 a / b / d; src/campaign/hollow-crown.ts)
  const hcStops: Array<[string, string, string]> = [
    ['hc20', 'The White Dark (Map 3)', '"Wait it out" costs no health, but the company starts the next battle Chilled for 2 turns.'],
    ['hc31', 'Hall of Oaths (Map 3)', 'Swear: kin prices at the Deep Market, but the dwarf tombs are sealed. Refuse: outsider prices, tombs open to plunder.'],
    ['hc54', 'The Deep Market (Map 3)', 'Only this merchant: higher prices, no Common wares. Cheaper if the Stone Oath was sworn.'],
  ];
  for (const [id, label, hint] of hcStops)
    debug.register({
      id: `maps23.hc.${id}`,
      tab: TAB,
      section: MAPS23_SECTION,
      icon: 'boot',
      label: `Jump to ${label}`,
      hint: `${hint} Walks Map 3 from its start (slow the first time), team at the stop's level, healed, oath and chill cleared. Turns Map 3 on.`,
      run: () => {
        enable3();
        apply(debugJumpHollowNode(ensureState(), id));
      },
    });
  debug.register({
    id: 'maps23.hc.oath',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'swap',
    label: () => `Stone Oath: ${ensureState().stoneOath ?? 'none'} (tap to cycle)`,
    hint: 'Cycle the Hall of Oaths choice none → sworn → refused → none. Sworn: Deep Market discount, dwarf tombs (Rune Vault, Treasury Vault, Kings\' Armory) give nothing. Refused or none: no discount, tombs give their chest. Reopen the Deep Market on a new day to see new prices.',
    run: () => {
      const s = ensureState();
      apply(debugSetStoneOath(s, !s.stoneOath ? 'sworn' : s.stoneOath === 'sworn' ? 'refused' : null));
    },
  });
  debug.register({
    id: 'maps23.hc.chill',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'eye',
    on: () => !!ensureState().pendingStatus,
    label: () => {
      const p = ensureState().pendingStatus;
      return `Next battle starts ${p ? `${p.status} (${p.turns} turns)` : 'normal'}`;
    },
    hint: 'Toggle the White Dark cost: the next battle (any battle) starts with every hero Chilled for 2 turns, then it is gone.',
    run: () => {
      const s = ensureState();
      apply(debugSetWhiteDarkChill(s, !s.pendingStatus));
    },
  });
  debug.register({
    id: 'maps23.hc.sealedtomb',
    tab: TAB,
    section: MAPS23_SECTION,
    icon: 'boot',
    label: 'Jump to a sealed dwarf tomb (oath sworn)',
    hint: 'Walk Map 3 to the first dwarf tomb, win its guardians and set the Stone Oath to sworn: the treasure window says the rune seal holds and nothing is taken. Cycle the oath above before opening it to see the normal chest.',
    run: () => {
      enable3();
      apply(debugSealedTomb(ensureState()));
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
