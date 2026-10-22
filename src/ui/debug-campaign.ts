/**
 * Debug menüsü > Campaign sekmesi (campaign-dev): haritayı aç, düğüme ışınlan, düğümü kazanılmış say, sis aç/kapa, can taşımayı göster,
 * kayıt al / son kayda dön / tüm kayıtları sil, Normal-Ironman değiştir. Sahne sınıflarını içe aktarmaz (Node testinde Phaser yok): anahtarla açar.
 */
import type Phaser from 'phaser';
import { activeHeroes, autoTreeAll, respecHeroTree, respecTreeBlocked, debugToggleFallen, debugWounds, debugGrantXp, debugSetLevel, grantLoot, withSuspended, addGold, addItem, bagHasRoom, grantAllLegendaries, debugTeleport, debugWinNode, getMap, latestSave, newCampaign, nextStep, nodeIlvl, rngFor, stopNumber, wipeSaves, type CampaignState } from '../campaign';
import { BAG_SIZE, ITEMS, LEVELS, RARITY_IDS, campaignMaxLevel, debugTreeFocus, heroRespecCost, makeItem, treeOf, treeSpent, setDebugTreeFocus, statPointsAt, xpToNext } from '../progression';
import { current, loadEntry, startNewCampaign, loadLastSave, save, session, setState, storage, MAP_SCENE } from '../game/campaign-session';
import { debugButton, debugHeading, type DebugMenu } from './debug-menu';
import { menuStyle } from './menu-style';
import { setTreeTabDebug, treeTabDebug, treeTabEnabled } from './tree-tab-model';
import { LESSONS, TUTORIAL } from '../tutorial/lessons';
import { isLessonSeen, resetTutorials, setTutorialsOn, tutorialsOn } from '../tutorial/store';

export const CAMPAIGN_TAB = 'Campaign';

const SCENES = ['BattleScene', 'TeamSelectScene', 'CampaignMapScene', 'MainMenuScene'];

/** Haritayı (yeniden) açar: etkin sahne haritaya geçer. */
function openMap(game: Phaser.Game): void {
  const active = SCENES.find((k) => game.scene.isActive(k));
  if (active) (game.scene.getScene(active) as Phaser.Scene).scene.start(MAP_SCENE);
  else game.scene.start(MAP_SCENE);
}

const ensureState = (): CampaignState => current() ?? (setState(newCampaign({ mode: 'normal', seed: Math.floor(Date.now() % 1_000_000_000) })), current()!);

export function registerCampaignDebug(game: Phaser.Game, debug: DebugMenu): void {
  const reload = () => openMap(game);
  debug.register({
    id: 'campaign.open',
    tab: CAMPAIGN_TAB,
    section: 'Map',
    icon: 'boot',
    label: 'Open map',
    hint: 'Open the campaign map (starts a new Normal campaign if none is loaded)',
    run: () => {
      ensureState();
      reload();
    },
  });
  const startCard = (elite: boolean) => () => {
    ensureState();
    const scene = game.scene.isActive(MAP_SCENE) ? (game.scene.getScene(MAP_SCENE) as unknown as { debugStartBattleCard?: (e: boolean) => void }) : undefined;
    if (scene?.debugStartBattleCard) scene.debugStartBattleCard(elite);
    else reload();
  };
  debug.register({
    id: 'campaign.start-battle-card',
    tab: CAMPAIGN_TAB,
    section: 'Map',
    icon: 'burst',
    label: 'Open Start battle card',
    hint: 'Open the "Start battle?" card next to the current / first reachable battle node (Fight does nothing in this debug view). Close with X, Esc or the dark backdrop.',
    run: startCard(false),
  });
  debug.register({
    id: 'campaign.start-battle-card-elite',
    tab: CAMPAIGN_TAB,
    section: 'Map',
    icon: 'helm',
    label: 'Start battle card (elite)',
    hint: 'Same card for the first Elite node (elite frame + tag).',
    run: startCard(true),
  });
  // Savaşsız düğümler için aynı kart (Ömer 2026-10-18): her tür için ilk düğümde açılır
  const placeCard = (type: string, label: string, icon: string, verb: string) =>
    debug.register({
      id: `campaign.node-card-${type}`,
      tab: CAMPAIGN_TAB,
      section: 'Map',
      icon,
      label,
      hint: `Open the same anchored card for the first ${type} stop (badge, name, lore line, "${verb}"; no enemy portraits). The action does nothing in this debug view. Close with X, Esc or the dark backdrop.`,
      run: () => {
        ensureState();
        const scene = game.scene.isActive(MAP_SCENE) ? (game.scene.getScene(MAP_SCENE) as unknown as { debugNodeCard?: (t: string) => void }) : undefined;
        if (scene?.debugNodeCard) scene.debugNodeCard(type);
        else reload();
      },
    });
  placeCard('town', 'Start card (town)', 'shield', 'Enter');
  placeCard('rest', 'Start card (camp)', 'flame', 'Rest');
  placeCard('merchant', 'Start card (merchant)', 'clover', 'Trade');
  placeCard('treasure', 'Start card (treasure)', 'dice', 'Open');
  placeCard('event', 'Start card (event)', 'feather', 'Continue');
  placeCard('boss', 'Start card (boss)', 'burst', 'Fight');
  // Harita pencereleri (Ömer 2026-10-19, taslak map-events): örnek veriyle açılır, kayıt değişmez
  const mapWindow = (kind: string, label: string, icon: string, hint: string) =>
    debug.register({
      id: `campaign.window-${kind}`,
      tab: CAMPAIGN_TAB,
      section: 'Map windows',
      icon,
      label,
      hint: `${hint} Sample data only: actions do nothing. Close with X, Esc or the dark backdrop.`,
      run: () => {
        ensureState();
        const scene = game.scene.isActive(MAP_SCENE) ? (game.scene.getScene(MAP_SCENE) as unknown as { debugMapWindow?: (k: string) => void }) : undefined;
        if (scene?.debugMapWindow) scene.debugMapWindow(kind);
        else reload();
      },
    });
  mapWindow('hero', 'Hero window', 'helm', 'Centered plaque with hero cards (bust, role, short blurb, leader crown). Open the map first.');
  mapWindow('recruit', 'Recruit window', 'shield', 'Centered plaque with recruit cards (Paladin, Hexer, Druid).');
  mapWindow('event-fold', 'Event window (Fold)', 'feather', 'Event plaque with four choice plates; picking one shows the result plaque.');
  mapWindow('event-witch', 'Event window (Witch)', 'feather', 'Event plaque with a costly choice (gold, blood, fight, leave).');
  mapWindow('treasure', 'Treasure window', 'dice', 'Treasure plaque (no "defeated" chip; the stamp is on the map).');
  mapWindow('rest', 'Rest window', 'flame', 'Rest plaque with two sample fallen heroes (Gear left, Rest right).');
  mapWindow('hearth', 'Campfire note', 'flame', 'Small anchored card next to the campfire (shows next to the spot when the town screen is open).');
  mapWindow('board', 'Notice board note', 'dice', 'Small anchored card for the notice board.');
  mapWindow('barracks', 'Barracks card', 'shield', 'Small anchored card with recruit cards.');
  debug.register({
    id: 'campaign.stamps',
    tab: CAMPAIGN_TAB,
    section: 'Map windows',
    icon: 'skull',
    label: 'Mark guarded stops cleared (stamps)',
    hint: 'Marks every guarded treasure / event stop as cleared so the "<ENCOUNTER> DEFEATED" skull stamp shows next to it on the map. Changes the loaded campaign.',
    run: () => {
      const s = ensureState();
      const ids = getMap(s.mapId).nodes.filter((n) => n.encounter && (n.type === 'treasure' || n.type === 'event')).map((n) => n.id);
      setState({ ...s, cleared: [...new Set([...(s.cleared ?? []), ...ids])] });
      reload();
    },
  });
  debug.register({
    id: 'campaign.fog',
    tab: CAMPAIGN_TAB,
    section: 'Map',
    icon: 'eye',
    on: () => session.revealFog,
    label: () => (session.revealFog ? 'Reveal fog: on' : 'Reveal fog: off'),
    hint: 'Show every stop ahead (fog off) or hide what is more than two stops away (normal rule)',
    run: () => {
      session.revealFog = !session.revealFog;
      if (game.scene.isActive(MAP_SCENE)) reload();
    },
  });
  // Bölge görünümü (Harita 1 yeniden çizim 2026-10-22, src/game/region-view.ts): kapalı -> I -> II -> III -> kapalı
  let regionDbg: string | null = null;
  debug.register({
    id: 'campaign.region',
    tab: CAMPAIGN_TAB,
    section: 'Map',
    icon: 'eye',
    on: () => regionDbg !== null,
    label: () => (regionDbg ? `Region view: ${regionDbg}` : 'Region view: off'),
    hint: 'Cycle the map\'s region view: zoom to region I, II, III, then the whole map. Neighbour stops show faded; stops of unseen regions stay hidden',
    run: () => {
      const ids = getMap(current()?.mapId ?? 'valdoria').regions.map((r) => r.id);
      const i = regionDbg === null ? 0 : ids.indexOf(regionDbg) + 1;
      regionDbg = ids[i] ?? null;
      const scene = game.scene.isActive(MAP_SCENE) ? (game.scene.getScene(MAP_SCENE) as unknown as { debugRegionView?: (r: string | null) => void }) : undefined;
      if (scene?.debugRegionView) scene.debugRegionView(regionDbg);
      else openMap(game);
    },
  });
  debug.register({
    id: 'campaign.hp',
    tab: CAMPAIGN_TAB,
    section: 'Map',
    icon: 'heart',
    on: () => session.showHp,
    label: () => (session.showHp ? 'Show carried HP: on' : 'Show carried HP: off'),
    hint: 'Show each hero\'s carried health as a percentage on the map (the Data list below shows it too)',
    run: () => {
      session.showHp = !session.showHp;
      if (game.scene.isActive(MAP_SCENE)) reload();
    },
  });
  debug.register({
    id: 'campaign.new',
    tab: CAMPAIGN_TAB,
    section: 'Map',
    icon: 'restart',
    label: 'New campaign',
    hint: 'Start a fresh Normal campaign (Medium) in the current slot (Slot 1 if none is loaded); the old saves in that slot are replaced',
    run: () => {
      startNewCampaign('normal', 'medium', current()?.slot ?? 0);
      reload();
    },
  });
  debug.register({
    id: 'campaign.mode',
    tab: CAMPAIGN_TAB,
    section: 'Map',
    icon: 'swap',
    label: () => `Mode: ${current()?.mode === 'ironman' ? 'Ironman' : 'Normal'}`,
    hint: 'Debug only: switch the loaded campaign between Normal and Ironman (in the game the mode is fixed at the start; save rules follow the mode)',
    run: () => {
      const s = ensureState();
      setState({ ...s, mode: s.mode === 'ironman' ? 'normal' : 'ironman' });
      reload();
    },
  });
  debug.register({
    id: 'campaign.win',
    tab: CAMPAIGN_TAB,
    section: 'Progress',
    icon: 'sword',
    label: 'Win this stop',
    hint: 'Count the battle at the current stop as won (health does not change) and return to the map',
    run: () => {
      const s = ensureState();
      setState(debugWinNode(s));
      reload();
    },
  });
  // Duraklatılmış savaş (Retreat to Map, Ömer 2026-10-14): durumu göster / sil / bozarak "could not be restored" yolunu dene
  debug.register({
    id: 'campaign.paused-clear',
    tab: CAMPAIGN_TAB,
    section: 'Progress',
    icon: 'pause',
    label: () => {
      const p = current()?.suspended;
      return p ? `Clear paused battle (stop ${p.node}, turn ${p.turn + 1})` : 'Clear paused battle (none)';
    },
    hint: 'Remove the paused battle (Retreat to Map) at the current stop: the locks lift and the battle starts over. Not saved until the next save',
    run: () => {
      const s = current();
      if (!s?.suspended) return;
      setState(withSuspended(s, undefined));
      reload();
    },
  });
  debug.register({
    id: 'campaign.paused-break',
    tab: CAMPAIGN_TAB,
    section: 'Progress',
    icon: 'burst',
    label: 'Break paused battle',
    hint: 'Corrupt the paused battle record so resuming fails: tapping the stop shows "could not be restored" and the battle starts over',
    run: () => {
      const s = current();
      if (!s?.suspended) return;
      setState(withSuspended(s, { ...s.suspended, hash: 'broken' }));
      reload();
    },
  });
  debug.register({
    id: 'campaign.skip-tutorial',
    tab: CAMPAIGN_TAB,
    section: 'Progress',
    icon: 'next',
    label: 'Skip tutorial',
    hint: 'Jump to Ashford Village (the tutorial heroes say farewell, then you form your company of three)',
    run: () => {
      setState(debugTeleport(ensureState(), '4'));
      reload();
    },
  });
  debug.register({
    id: 'campaign.handover-toast',
    tab: CAMPAIGN_TAB,
    section: 'Progress',
    icon: 'clipboard',
    label: 'Left for the Company card',
    hint: 'Show the town "Left for the Company" bottom card with sample gear from a Warrior and a Gambler. Hover / long-press an item for its tooltip; Equip now opens Gear; X, Esc or 10 seconds (fades out, hovering the card pauses it) close it.',
    run: () => {
      const s = ensureState();
      const rng = { int: (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1)) };
      const items = ['woodcutters_axe', 'worn_deck'].map((id, i) => makeItem(id, `dbg-handover-${i}`, rng));
      const root = document.getElementById('ui-root') ?? document.body;
      void import('./handover-toast').then(({ showHandoverToast }) =>
        showHandoverToast(root, { classes: ['warrior', 'gambler'], items }, {
          equip: () => void import('./gear-screen').then((g) => g.openGearScreen(root, { get: () => current() ?? s, set: setState })),
          later: () => {},
        }),
      );
    },
  });
  // --- Item'ler (madde 280): Gear ekranı, item / altın ver, torbayı doldur
  const giveItem = (rarity?: string): void => {
    const s = ensureState();
    if (!bagHasRoom(s)) return;
    const cap = Math.max(nodeIlvl(s.mapId, s.at), 2);
    const pool = ITEMS.items.filter((d) => (rarity ? d.rarity === rarity : true) && d.ilvl <= (rarity ? 99 : cap));
    if (!pool.length) return;
    const rng = rngFor(s.seed, 'debug-item', s.nextItemId);
    setState(addItem(s, pool[rng.int(0, pool.length - 1)]!.id).state);
    document.dispatchEvent(new CustomEvent('gear:refresh'));
  };
  const openGear = (): void => {
    const scene = game.scene.isActive(MAP_SCENE) ? (game.scene.getScene(MAP_SCENE) as unknown as { openGear?: () => void }) : undefined;
    if (scene?.openGear) scene.openGear();
    else reload();
  };
  debug.register({
    id: 'campaign.gear',
    tab: CAMPAIGN_TAB,
    section: 'Items',
    icon: 'helm',
    label: 'Open Gear',
    hint: 'Open the Gear screen (equip items from the bag) for the current campaign; opens the map first if needed',
    run: openGear,
  });
  debug.register({
    id: 'campaign.fallen',
    tab: CAMPAIGN_TAB,
    section: 'Items',
    icon: 'skull',
    label: 'Toggle first hero fallen',
    hint: 'Make the first hero of the formation fallen (or revive them): their gear is locked in Gear while fallen (stat points can still be spent)',
    run: () => {
      setState(debugToggleFallen(ensureState()));
      reload();
    },
  });
  // Yara (can ve ölüm reworkü, Ömer 2026-10-19; docs/design/hp-death-rework.md)
  const woundTool = (id: string, label: string, hint: string, delta: number | null): void =>
    debug.register({
      id,
      tab: CAMPAIGN_TAB,
      section: 'Items',
      icon: 'skull',
      label,
      hint,
      run: () => {
        setState(debugWounds(ensureState(), delta));
        reload();
      },
    });
  woundTool('campaign.woundAdd', 'Wound first hero (+1)', 'Give the first hero of the formation one wound (each wound: lower max HP; with 3 wounds the next fall kills). Shown in the Gear hero bookmark tooltip', 1);
  woundTool('campaign.woundRemove', 'Heal one wound (first hero)', 'Remove one wound from the first hero of the formation', -1);
  woundTool('campaign.woundClear', 'Clear all wounds', 'Remove every wound from the whole roster (as a town rest does)', null);
  // Level / XP (Ömer 2026-10-17, levels.md)
  const levelOfTeam = (): number => {
    const s = ensureState();
    const team = s.active.filter(Boolean).map((id) => s.roster.find((h) => h.id === id)).filter((h) => !!h);
    return team.length ? Math.min(...team.map((h) => h!.level)) : 1;
  };
  debug.register({
    id: 'campaign.xp',
    tab: CAMPAIGN_TAB,
    section: 'Levels',
    icon: 'feather',
    label: 'Grant XP (one level)',
    hint: 'Give every hero in the formation enough XP for one level (no popup: a short banner shows on the map, the Gear button and the hero bookmark glow until the points are spent)',
    run: () => {
      setState(debugGrantXp(ensureState(), xpToNext(levelOfTeam())));
      reload();
    },
  });
  for (const lv of [1, 5, 10, 20, 30])
    debug.register({
      id: `campaign.level-${lv}`,
      tab: CAMPAIGN_TAB,
      section: 'Levels',
      icon: 'muscle',
      label: `Set level ${lv}`,
      hint: `Set every hero to Level ${lv} (XP 0; the campaign stops at Level ${campaignMaxLevel()}); placed stat points and the skill tree are reset, ${statPointsAt(lv)} stat points and ${(lv - 1) * LEVELS.skillPointsPerLevel} skill points wait to be spent`,
      run: () => {
        setState(debugSetLevel(ensureState(), lv));
        reload();
      },
    });
  debug.register({
    id: 'campaign.enemy-levels',
    tab: CAMPAIGN_TAB,
    section: 'Levels',
    icon: 'muscle',
    label: () => `Enemy levels: ${LEVELS.enemies?.enabled ? 'on' : 'off'}`,
    hint: 'Turn enemy level growth on or off for this session (campaign and Endless; off = enemies keep their Level 1 stats, the "Lv N" label stays). The next battle uses it.',
    on: () => !!LEVELS.enemies?.enabled,
    run: () => {
      const e = (LEVELS.enemies ??= { enabled: true });
      e.enabled = !e.enabled;
    },
  });
  // Skill ağacı Faz 1a (docs/design/skill-tree-implementation.md): ağaç arayüzü yokken etkisi yazılmış (a) düğümlerin sayılarını görmek için;
  // yalnızca bellekte (kayda yazmaz), _rules.json ana şalteri kapalıyken de sefer + Endless kahramanlarına level'ına göre odaklı kurulum verir
  debug.register({
    id: 'campaign.tree-focus',
    tab: CAMPAIGN_TAB,
    section: 'Levels',
    icon: 'feather',
    label: () => `Skill tree focus build: ${debugTreeFocus() ? `direction ${debugTreeFocus()!.dir.toUpperCase()}` : 'off'}`,
    hint: 'Cycle off / direction A / direction B. While on, Warrior, Defender and Paladin heroes in campaign and Endless battles get a focused skill tree build for their level (session only, not saved). A hero with a saved skill tree (see Spend skill tree points) fights with that tree instead. Only nodes with written effects change numbers (Warrior: Double Strike, Whirlwind, Headsman\'s Blow; Defender: Taunt, Close Ranks, Fist Crush). Check the skill tooltips in the next battle; use Set level 10 / 20 / 30 for bigger builds.',
    on: () => !!debugTreeFocus(),
    run: () => {
      const f = debugTreeFocus();
      setDebugTreeFocus(!f ? { dir: 'a' } : f.dir === 'a' ? { dir: 'b' } : null);
    },
  });
  // Skill ağacı Faz 3b: Gear > Tree sekmesi ana şalter kapalıyken de görünsün (yalnızca bellekte; savaşı etkilemez)
  debug.register({
    id: 'campaign.tree-tab',
    tab: CAMPAIGN_TAB,
    section: 'Levels',
    icon: 'feather',
    label: () => `Skill tree tab in Gear: ${treeTabEnabled() ? 'shown' : 'hidden'}`,
    hint: 'Show or hide the Tree tab (Gear: Hero, Sheet, Tree) for this session even while the skill tree main switch is off. Battles are not affected. Reopen Gear after toggling.',
    on: () => treeTabEnabled(),
    run: () => setTreeTabDebug(!treeTabDebug()),
  });
  // Skill ağacı Faz 1b (kayıt): ağaç ekranı (Faz 3b) gelene kadar kayda ağaç yazmak / respec'i denemek için. Savaşa yalnızca ana şalter açıkken
  // ya da yukarıdaki odaklı kurulum açıkken girer (kayıtta ağacı olan kahraman kendi ağacıyla)
  debug.register({
    id: 'campaign.tree-auto',
    tab: CAMPAIGN_TAB,
    section: 'Levels',
    icon: 'feather',
    label: 'Spend skill tree points (saved)',
    hint: 'Every hero whose class has a skill tree spends their unspent skill points on a focused build, saved into the campaign (as a player would on the tree screen). Classes without a tree keep their points. Battles use the saved tree only while "Skill tree focus build" is on (the skill tree is still switched off in the game).',
    run: () => {
      setState(autoTreeAll(ensureState()));
      reload();
    },
  });
  // Etiket her çizimde okunur: sefer yoksa yeni sefer AÇMAZ (current; ensureState yalnızca run içinde)
  const respecTarget = (s: CampaignState | null = current()) =>
    s ? (activeHeroes(s).find((h) => treeOf(h.class) && treeSpent(h) > 0) ?? activeHeroes(s).find((h) => treeOf(h.class))) : undefined;
  debug.register({
    id: 'campaign.tree-respec',
    tab: CAMPAIGN_TAB,
    section: 'Levels',
    icon: 'feather',
    label: () => {
      const h = respecTarget();
      return h ? `Reset skill tree: ${h.class} (${heroRespecCost(h)} gold)` : 'Reset skill tree (no hero with a tree)';
    },
    hint: 'Reset the whole skill tree of the first formation hero with a spent tree, paying gold (free once after a tree data update). Points return as unspent skill points. Nothing happens without enough gold, during a paused battle or with an empty tree.',
    run: () => {
      const s = ensureState();
      const h = respecTarget(s);
      if (!h || respecTreeBlocked(s, h.id)) return;
      setState(respecHeroTree(s, h.id));
      reload();
    },
  });
  debug.register({
    id: 'campaign.alloc',
    tab: CAMPAIGN_TAB,
    section: 'Levels',
    icon: 'team',
    label: 'Open stat allocation',
    hint: 'Open Gear on the Sheet tab (level, XP bar, stat points: drag the point stone onto a stat or tap +)',
    run: () => {
      const s = ensureState();
      if (!s.roster.length) setState(debugTeleport(s, getMap(s.mapId).nodes.find((n) => n.type === 'town')?.id ?? s.at));
      const scene = game.scene.isActive(MAP_SCENE) ? (game.scene.getScene(MAP_SCENE) as unknown as { openGear?: (h?: string, t?: boolean, a?: () => void, v?: 'char' | 'inv') => void }) : undefined;
      if (scene?.openGear) scene.openGear(undefined, false, undefined, 'char');
      else reload();
    },
  });
  // LOOT ekranı (Ömer 2026-10-18): kazanılan savaş / sandık sonrası ortak envanterin yanında ganimet alanı
  const dropLoot = (fullBag: boolean): void => {
    let s = ensureState();
    if (!s.roster.length) s = debugTeleport(s, getMap(s.mapId).nodes.find((n) => n.type === 'town')?.id ?? s.at);
    setState(s);
    if (fullBag) for (let i = 0; i < BAG_SIZE && bagHasRoom(current()!); i++) giveItem();
    const t = JSON.parse(JSON.stringify(current()!)) as CampaignState;
    grantLoot(t, t.at, 'elite', activeHeroes(t));
    setState(t);
    reload();
  };
  debug.register({
    id: 'campaign.loot',
    tab: CAMPAIGN_TAB,
    section: 'Items',
    icon: 'dice',
    label: 'Open Loot screen',
    hint: 'Grant an elite drop at this stop and open the Loot screen on the map: drag the items into the bag or a hero slot (or tap them), or leave them. Gold shows there too',
    run: () => dropLoot(false),
  });
  debug.register({
    id: 'campaign.loot-xp',
    tab: CAMPAIGN_TAB,
    section: 'Items',
    icon: 'burst',
    label: 'Open Loot screen (with XP)',
    hint: 'Same Loot screen with made-up XP rows: bars fill hero by hero, the first hero levels up; tap a row to open that hero character screen',
    run: () => {
      sessionStorage.setItem('proto.debugLootXp', '1');
      dropLoot(false);
    },
  });
  debug.register({
    id: 'campaign.loot-full',
    tab: CAMPAIGN_TAB,
    section: 'Items',
    icon: 'team',
    label: 'Open Loot screen (bag full)',
    hint: 'Same, with a full bag: items cannot be taken until you make room (drag a bag item to the trash)',
    run: () => dropLoot(true),
  });
  debug.register({
    id: 'campaign.shop',
    tab: CAMPAIGN_TAB,
    section: 'Items',
    icon: 'clover',
    label: "Open Odo's shop (campaign)",
    hint: "Jump to the first Merchant stop and open Odo the Peddler: shop panel on the left (Buy & Sell, Buyback, reroll icon), Gear on the right, X closes",
    run: () => {
      const s = ensureState();
      const id = getMap(s.mapId).nodes.find((n) => n.type === 'merchant')?.id;
      if (id) setState(debugTeleport(s, id));
      reload();
    },
  });
  // Demirci (Ömer 2026-10-18, ilerleme TUR 1 madde 7): şehre (Valdren Keep) ışınlanmadan, bulunulan seferin üstünde açılır
  debug.register({
    id: 'campaign.blacksmith',
    tab: CAMPAIGN_TAB,
    section: 'Items',
    icon: 'muscle',
    label: 'Open Blacksmith',
    hint: 'Open the Blacksmith screen for the current campaign: pick an item (bag or equipped), then Temper (+1 item level, up to the best item level of this chapter) or Reforge (Epic only). Use Give 100 gold / Give epic first. In a town it is the Blacksmith place on the town screen',
    run: () => {
      const s = ensureState();
      const root = document.getElementById('ui-root');
      if (!root) return;
      void import('./blacksmith-screen').then((m) => m.openBlacksmith(root, () => current() ?? s, (x) => setState(x), { sub: 'Debug' }));
    },
  });
  debug.register({
    id: 'campaign.give-item',
    tab: CAMPAIGN_TAB,
    section: 'Items',
    icon: 'dice',
    label: 'Give item',
    hint: "Put a random item of this stop's item level into the bag",
    run: () => giveItem(),
  });
  for (const r of RARITY_IDS.filter((x) => ITEMS.items.some((d) => d.rarity === x)))
    debug.register({
      id: `campaign.give-${r}`,
      tab: CAMPAIGN_TAB,
      section: 'Items',
      icon: r === 'epic' ? 'burst' : r === 'rare' ? 'rune' : 'shield',
      label: `Give ${r}`,
      hint: `Put a random ${r} item (any item level) into the bag`,
      run: () => giveItem(r),
    });
  debug.register({
    id: 'campaign.give-legendaries',
    tab: CAMPAIGN_TAB,
    section: 'Items',
    icon: 'burst',
    label: 'Give all Legendaries',
    hint: 'Put all 10 Legendary items into the bag (they do not drop yet). Also: add ?legendary=1 to the address and open Gear',
    run: () => {
      setState(grantAllLegendaries(ensureState()));
      document.dispatchEvent(new CustomEvent('gear:refresh'));
    },
  });
  debug.register({
    id: 'campaign.give-gold',
    tab: CAMPAIGN_TAB,
    section: 'Items',
    icon: 'clover',
    label: 'Give 100 gold',
    hint: 'Add 100 gold to the campaign purse',
    run: () => {
      setState(addGold(ensureState(), 100));
      document.dispatchEvent(new CustomEvent('gear:refresh'));
    },
  });
  debug.register({
    id: 'campaign.fill-bag',
    tab: CAMPAIGN_TAB,
    section: 'Items',
    icon: 'team',
    label: 'Fill the bag',
    hint: `Fill the bag up to ${BAG_SIZE} items with random gear (to test a full bag)`,
    run: () => {
      for (let i = 0; i < BAG_SIZE && bagHasRoom(ensureState()); i++) giveItem();
    },
  });
  debug.register({
    id: 'campaign.clear-bag',
    tab: CAMPAIGN_TAB,
    section: 'Items',
    icon: 'flame',
    label: 'Empty the bag',
    hint: 'Remove every item in the bag (equipped items stay)',
    run: () => {
      setState({ ...ensureState(), inventory: [] });
      document.dispatchEvent(new CustomEvent('gear:refresh'));
    },
  });
  debug.register({
    id: 'campaign.save',
    tab: CAMPAIGN_TAB,
    section: 'Saves',
    icon: 'clipboard',
    label: 'Save now',
    hint: 'Write an autosave of the current campaign now (Ironman keeps a single save)',
    run: () => {
      if (current()) save('auto');
      if (game.scene.isActive(MAP_SCENE)) reload();
    },
  });
  debug.register({
    id: 'campaign.load-last',
    tab: CAMPAIGN_TAB,
    section: 'Saves',
    icon: 'restart',
    label: 'Load last save',
    hint: 'Go back to the newest save (as after a defeat)',
    run: () => {
      const s = current();
      if (s) loadLastSave();
      else {
        const e = latestSave(storage());
        if (e) loadEntry(e);
      }
      if (current()) reload();
    },
  });
  debug.register({
    id: 'campaign.wipe',
    tab: CAMPAIGN_TAB,
    section: 'Saves',
    icon: 'flame',
    label: 'Wipe all saves',
    hint: 'Delete every campaign save in this browser (the loaded campaign stays open)',
    run: () => wipeSaves(storage()),
  });
  // --- Tutorial (mentor dersleri; data/tutorial.json, docs/design/tutorial.md)
  debug.register({
    id: 'campaign.tutorials',
    tab: CAMPAIGN_TAB,
    section: 'Tutorial',
    icon: 'book',
    on: () => tutorialsOn(),
    label: () => (tutorialsOn() ? 'Tutorials: on' : 'Tutorials: off'),
    hint: 'Turn the mentor lessons on or off (same as Settings > Gameplay > Tutorials)',
    run: () => setTutorialsOn(!tutorialsOn()),
  });
  debug.register({
    id: 'campaign.tutorials-reset',
    tab: CAMPAIGN_TAB,
    section: 'Tutorial',
    icon: 'restart',
    label: 'Reset tutorials',
    hint: 'Forget every seen lesson and turn tutorials on: lessons show again (Mill Road is step by step again). Codex > Lessons empties.',
    run: () => resetTutorials(),
  });
  // Zorunlu Formation kapısı (Ravenwood; Ömer 2026-10-17): bulunulan savaş düğümünde Formation açılana kadar savaş başlamaz
  debug.register({
    id: 'campaign.formation-gate',
    tab: CAMPAIGN_TAB,
    section: 'Tutorial',
    icon: 'shield',
    label: () => (current()?.formationDue ? 'Formation gate: on (open Formation to clear)' : 'Formation gate: require here'),
    hint: 'Like Ravenwood after the recruit: the tip "Arrange your formation" shows and the Formation button (bottom left) glows until the tip closes or Formation is opened; the battle here waits (needs a battle at this stop and tutorials on)',
    run: () => {
      const s = ensureState();
      setState({ ...s, formationDue: s.at });
      reload();
    },
  });
  debug.registerPanel({
    id: 'campaign.lessons',
    tab: CAMPAIGN_TAB,
    render: (el) => {
      el.append(debugHeading('Trigger a lesson'));
      const grid = document.createElement('div');
      grid.className = 'debug-grid';
      const box = () => import('./lesson-box');
      for (const l of LESSONS)
        grid.append(debugButton(`${isLessonSeen(l.id) ? '✓ ' : ''}${l.title}`, () => void box().then((m) => m.showLesson(l.id, { force: true })), { title: `${l.group}: show this lesson now (marks it seen; forced Mill Road steps show as plain cards here)` }));
      grid.append(debugButton('Defeat hint', () => void box().then((m) => m.showMentorLine('A word of advice', TUTORIAL.defeatHints.default)), { title: 'Show a Region III defeat hint box (after two losses at the same battle)' }));
      el.append(grid);
    },
  });
  debug.registerPanel({
    id: 'campaign.teleport',
    tab: CAMPAIGN_TAB,
    render: (el) => {
      el.append(debugHeading('Teleport to stop'));
      const grid = document.createElement('div');
      grid.className = 'debug-grid';
      for (const n of getMap('valdoria').nodes) {
        grid.append(
          debugButton(`${n.id} ${n.name}${n.optional ? ' (pocket)' : ''}`, () => {
            setState(debugTeleport(ensureState(), n.id));
            reload();
          }, { title: `${n.subtitle}: the road from Mill Road is rebuilt, earlier stops count as done, missing heroes are picked automatically` }),
        );
      }
      el.append(grid);
      const s = current();
      const info = document.createElement('div');
      info.className = 'debug-note';
      info.textContent = s
        ? `Slot ${s.slot + 1} · campaign seed ${s.seed} · ${s.mode} · ${s.difficulty} · stop ${stopNumber(s)}/${getMap(s.mapId).stopsPerRun} at ${s.at} · next: ${nextStep(s).kind} · HP: ${s.roster.map((h) => `${h.class} ${Math.round(h.hpRatio * 100)}%`).join(', ') || '-'}`
        : 'No campaign loaded.';
      el.append(info);
    },
  });

  // Ana menü (Play kartları, Settings ve Multiplayer sütunları; src/game/scenes/MainMenuScene.ts)
  const openMenu = (view: 'menu' | 'play' | 'settings' | 'mp') => {
    const active = [...SCENES, 'MultiplayerScene'].find((k) => game.scene.isActive(k));
    if (active) (game.scene.getScene(active) as Phaser.Scene).scene.start('MainMenuScene', { view });
    else game.scene.start('MainMenuScene', { view });
  };
  const views: Array<['menu' | 'play' | 'settings' | 'mp', string, string, string]> = [
    ['menu', 'Main menu', 'frame', 'Open the main menu (Play · Settings · Codex)'],
    ['play', 'Play cards', 'sword', 'Open the main menu on the Play cards (Campaign · Quick Battle · Multiplayer)'],
    ['settings', 'Menu settings', 'gear', 'Open the main menu on its Settings column'],
    ['mp', 'Menu multiplayer', 'team', 'Open the main menu on its Multiplayer column (name, Host, Join)'],
  ];
  for (const [view, label, icon, hint] of views) {
    debug.register({ id: `menu.${view}`, tab: CAMPAIGN_TAB, section: 'Main menu', icon, label, hint, run: () => openMenu(view) });
  }
  // Menü stili önizlemesi (src/ui/menu-style.ts): ?menu=new zarif stil, ?menu=old mevcut stil; sayfa yeniden yüklenir
  debug.register({
    id: 'menu.style',
    tab: CAMPAIGN_TAB,
    section: 'Main menu',
    icon: 'swap',
    label: () => `Menu style: ${menuStyle === 'elegant' ? 'new' : 'old'}`,
    on: () => menuStyle === 'elegant',
    hint: 'Switch the main menu look between the current style and the new elegant preview (Cinzel / EB Garamond). Reloads the page with ?menu=new or ?menu=old',
    run: () => {
      const q = new URLSearchParams(window.location.search);
      q.set('menu', menuStyle === 'elegant' ? 'old' : 'new');
      window.location.search = q.toString();
    },
  });
}
