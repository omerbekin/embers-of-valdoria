// Debug "Objective test" savaşları (Harita 2-3 savaş katmanı; maps-2-3.md M-A / B3 / M-B / M-I / M-J; data/battle-rules.json).
// Saf veri kurucusu: oyuncu tarafı rastgele 4 sınıf, düşman tarafı Harita 2 mobları; kural Teams.rules ile gider (sefer kaydına dokunmaz).
import { content, type BattleMode, type Teams } from '../engine';

export type RulesTestKind = 'tide' | 'storm' | 'urn' | 'survive' | 'totem' | 'hold' | 'deck' | 'mixed' | 'blizzard' | 'heat' | 'cavein' | 'caveheavy' | 'darkness' | 'lantern' | 'thunder_tide' | 'thunder_urn' | 'thunder_iron' | 'thunder_dark' | 'thunder_ice' | 'eye' | 'rod' | 'rolling' | 'encased' | 'noise' | 'temper' | 'mob_vaulter' | 'mob_shardwalker' | 'mob_delver' | 'mob_gloamstalker' | 'mob_cinderleaper' | 'mob_slagcart' | 'mob_thunderwright' | 'mob_stormcaller' | 'mob_eel' | 'mob_ram' | 'kit_wolf' | 'kit_axeman' | 'kit_crawler' | 'kit_skald' | 'kit_witch' | 'kit_knight' | 'kit_golem' | 'kit_wight' | 'kit_rime_hound' | 'kit_slinger' | 'kit_rime_witch' | 'kit_hollow' | 'kit_molten';

/** Debug düğmeleri (oyun içi metin İngilizce): tür, etiket, ipucu. */
export const RULES_TESTS: ReadonlyArray<{ kind: RulesTestKind; label: string; hint: string }> = [
  { kind: 'tide', label: 'Tide', hint: 'Tide floods both front rows at the start and every 4 turns; units in the water are Soaked (fire taken -50%, Speed -10%, Burning put out)' },
  { kind: 'storm', label: 'Storm', hint: 'Storm: every ranged attack on both sides (Arrow Rain too) has 15% less chance to hit (enemies: 2 Corsair Cutlasses, 2 Corsair Slingers)' },
  { kind: 'urn', label: 'Tidewater Urn', hint: 'A Tidewater Urn stands on your middle cell: a hero next to it can spend the turn to flood one of your rows (3 uses). Enemies throw fire (Corsair Slingers, Reaver Archers)' },
  { kind: 'survive', label: 'Survive', hint: 'Survive 6 turns: when the last turn ends your party escapes and wins' },
  { kind: 'totem', label: 'Break the Totem', hint: 'A Hex Totem calls 2 Drowned every 2 turns (up to 5 enemies) and blocks the win until it is broken' },
  { kind: 'hold', label: 'Hold the Bridge', hint: 'Lose at once if your front row is ever empty' },
  { kind: 'deck', label: "Ship's deck", hint: 'Crossing deck: the mast cell (row 3, middle) and the rail cell (row 4, top) are closed on both boards' },
  { kind: 'mixed', label: 'Tide + deck + Survive', hint: 'All at once: Tide, the ship deck cells and a 6-turn Survive objective' },
  { kind: 'blizzard', label: 'Blizzard + Mage', hint: 'Map 3 Blizzard: a marked row becomes Chill Ground, snow on snow turns to Ice. A Mage is in your party: Ice Crater on a Chilled enemy freezes it' },
  { kind: 'heat', label: 'Heat', hint: 'Map 3 Heat: every turn a random row is marked and burns for 2 turns from the next turn on' },
  { kind: 'cavein', label: 'Cave-in', hint: 'Map 3 Cave-in: a marked cell on each board collapses the next turn (damage + Slow, closed for the battle)' },
  { kind: 'caveheavy', label: 'Cave-in heavy + Darkness', hint: 'Heavy Cave-in in the dark: two cells per board every 2 turns, and your heroes only reach two enemy rows' },
  { kind: 'darkness', label: 'Darkness', hint: 'Map 3 Darkness: heroes only target the enemy front row and the row behind it; any fire skill lights the field for 2 turns' },
  { kind: 'thunder_tide', label: 'Lightning + Tide', hint: 'Test Storm Testers on a Tide field: a bolt on water arcs through all connected water (Live Water) and Stuns a hero in water; on dry cells it pushes the hero back on the turn bar (Shocked)' },
  { kind: 'thunder_urn', label: 'Lightning + Urn', hint: 'Flood a row with the Tidewater Urn: its water carries lightning too' },
  { kind: 'thunder_iron', label: 'Iron Draws the Bolt', hint: 'A Warrior and a Paladin are in your party: Test Iron Bolt gains damage from the target Armor. Compare the preview on heavy and light heroes' },
  { kind: 'thunder_dark', label: 'Thunderflash', hint: 'Darkness: when a Storm Tester throws lightning the field is lit for one hero turn and the nearest hero is Blinded' },
  { kind: 'thunder_ice', label: 'Shatter', hint: 'Blizzard makes Ice (snow on snow). A bolt on Ice blows it apart: physical damage on the cell and around it. Debug > Ground reactions > Shatter does it at once' },
  { kind: 'eye', label: 'Eye of the Storm', hint: 'Blizzard with an Eye Tester in the enemy top lane: mobs in that lane ignore the Chill Ground and the ranged penalty, heroes do not. Kill it and the lane feels the snow' },
  { kind: 'rod', label: 'Thunder Rod', hint: 'Rod Testers drive iron rods into empty cells on your side. Each turn lightning arcs to heroes next to a rod. A hero next to it can use Topple Rod (button appears while a rod stands)' },
  { kind: 'rolling', label: 'Rolling Thunder', hint: 'Rod Testers call a bolt: a lightning token enters the turn bar and the row glows. When the token reaches the front the row is struck. Haste and Slow do not change it, killing the caster does not stop it' },
  { kind: 'encased', label: 'Encased', hint: 'Blizzard: two soldiers start in ice blocks with their own bar. Non-fire damage hits the block, fire shatters it. Blocks mend every turn' },
  { kind: 'noise', label: 'Wake the Halls', hint: 'Noise counter on the rule line: crits, explosions and area skills fill it; when it is full a Hollow Warden rises. Debug > Noise +5 fills it quickly' },
  { kind: 'temper', label: 'Tempering', hint: 'Temper Testers flip stance each turn: Red-hot (orange tint, immune to Fire) and Quenched (blue tint, half Armor; Fire heats it again)' },
  { kind: 'mob_vaulter', label: 'Clan Vaulter', hint: 'Pole Vault: leaps over your front row to hit a hero behind it, then takes 25% more damage until its next turn. No back-row hero, no vault.' },
  { kind: 'mob_shardwalker', label: 'Shardwalker', hint: 'Blizzard: Shardwalk reaches any hero who is Chilled. Keep every hero off the Chill Ground and it can only hit your front row.' },
  { kind: 'mob_delver', label: 'Hollow Delver', hint: 'Undermine: it dives (faded, cannot be targeted) and a crack marks a hero cell. Move away: it comes up for nothing and is Staggered. Stay: it hits hard.' },
  { kind: 'mob_gloamstalker', label: 'Gloamstalker', hint: 'Darkness: Dark Step reaches any row. Light the field with a fire skill and it can only hit your front row.' },
  { kind: 'mob_cinderleaper', label: 'Cinderleaper', hint: 'Through the Flame reaches any hero who is Burning or stands on Burning ground and leaves 1 turn of Burning ground there. No flames: a plain front-row hit.' },
  { kind: 'mob_slagcart', label: 'Slagcart Golem', hint: 'It marks a row, then charges along it next turn (damage + 2 turns of Burning). The turn after that it is Cooling: no action, Armor 0. Hit it then.' },
  { kind: 'mob_thunderwright', label: 'Thunderwright', hint: 'A Warrior and a Paladin are in your party. Anvil Strike Shocks. Ring the Anvil starts on the most armored hero and jumps to the next two; lightning gains damage from Armor.' },
  { kind: 'mob_stormcaller', label: 'Clan Stormcaller', hint: 'Tide: Fork Stuns a hero who is Soaked or stands in water, and pushes back a dry one. Rolling Thunder sends a token through the turn bar.' },
  { kind: 'mob_eel', label: 'Gloam Eel', hint: 'Black Water (Darkness + Tide): its bite sets water alive only while the eel stands in water. In the dark a bite on a hero in water also flashes the field (Thunderflash).' },
  { kind: 'mob_ram', label: 'Stormhorn Ram', hint: 'Hit it with a melee skill and your hero is Shocked. Headlong: it charges a lane and pushes the first hero one row back.' },
  { kind: 'kit_wolf', label: 'Snow Wolf', hint: 'Frost Bite makes a hero Chilled; a second bite freezes. Pack Tactics: stronger with wolves in the same row.' },
  { kind: 'kit_axeman', label: 'Clan Axeman', hint: 'Blizzard: it stays free of Chilled and Frozen. Below half HP it hits 20% harder. Cleave hits your front row.' },
  { kind: 'kit_crawler', label: 'Cave Crawler', hint: 'Darkness: it always goes for the nearest hero and deals 25% more damage.' },
  { kind: 'kit_skald', label: 'Clan Skald', hint: 'Allies in its row gain Haste each turn. Chant hastes all allies. Mock costs a hero the next action.' },
  { kind: 'kit_witch', label: 'Pyre Witch', hint: 'Ember Acolytes set the ground on fire. Spread the Flame widens a Burning cell; Kindling adds damage for each Burning cell.' },
  { kind: 'kit_knight', label: 'Cinder Knight', hint: 'Brand burns its target. Hold the Gate draws attacks. Searing Rebuke hurts melee attackers.' },
  { kind: 'kit_golem', label: 'Forge Golem', hint: 'Vent burns a whole lane. When it dies, its cell and the cells around it burn for 2 turns.' },
  { kind: 'kit_wight', label: 'Wight', hint: 'Its skill hits give Chilled, and never freeze.' },
  { kind: 'kit_rime_hound', label: 'Rime Hound', hint: 'Rime Bite makes a hero Chilled; a second bite freezes. Run Down reaches any row.' },
  { kind: 'kit_slinger', label: 'Clan Slinger', hint: 'Ice Shot makes a hero Chilled, and freezes one already Chilled.' },
  { kind: 'kit_rime_witch', label: 'Rime Witch', hint: 'Sodden Hex soaks a hero; a Soaked hero becomes Chilled at the start of each turn, and never freezes.' },
  { kind: 'kit_hollow', label: 'Hollow Warden', hint: 'Darkness: it takes 25% less damage until the field is lit.' },
  { kind: 'kit_molten', label: 'Molten Hound', hint: 'Run Down leaves Burning Ground under its target.' },
  { kind: 'lantern', label: 'Darkness + Lantern', hint: 'Darkness with a Lantern on your side: the field stays lit until enemies break it' },
];

const ENEMIES: Record<number, string> = { 0: 'drowned', 2: 'drowned', 6: 'fen_witchling', 8: 'will_o_wisp' };

const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');

/** BattleScene başlangıç verisi (scene.start / restart): seed, mod, takımlar + karşılaşma kuralı. */
export function rulesTestBattleData(seed: number, mode: BattleMode, kind: RulesTestKind) {
  const party = content.randomCells(content.arrangeTeam(content.randomTeam(seed, 4)), seed);
  const enemyAt: Record<number, string> = { ...ENEMIES };
  const units: NonNullable<Teams['units']>['enemies'] = {};
  let rules: NonNullable<Teams['rules']>;
  if (kind === 'tide') rules = { condition: 'tide' };
  else if (kind === 'storm') {
    rules = { condition: 'storm' };
    Object.assign(enemyAt, { 0: 'corsair_cutlass', 2: 'corsair_cutlass', 6: 'corsair_slinger', 8: 'corsair_slinger' });
  } else if (kind === 'urn') {
    rules = { device: 'tidewater_urn' };
    Object.assign(enemyAt, { 0: 'corsair_cutlass', 2: 'moor_raider', 6: 'corsair_slinger', 8: 'reaver_archer' });
  }
  else if (kind === 'survive') rules = { objective: 'survive' };
  else if (kind === 'hold') rules = { objective: 'hold' };
  else if (kind === 'deck') rules = { blocked: 'deck' };
  else if (kind === 'mixed') rules = { condition: 'tide', blocked: 'deck', objective: 'survive' };
  else if (kind === 'blizzard') {
    rules = { condition: 'blizzard' };
    if (!party.includes('mage')) party[party.findIndex((x) => !!x)] = 'mage'; // Frozen'ı denemek için Ice Crater
  } else if (kind === 'heat') rules = { condition: 'heat' };
  else if (kind === 'cavein') rules = { caveIn: 'cave_in' };
  else if (kind === 'caveheavy') rules = { condition: 'darkness', caveIn: 'cave_in_heavy' };
  else if (kind === 'darkness') rules = { condition: 'darkness' };
  else if (kind === 'lantern') rules = { condition: 'darkness', lantern: 'lantern' };
  else if (kind === 'eye') {
    rules = { condition: 'blizzard' };
    Object.assign(enemyAt, { 0: 'eye_tester', 6: 'corsair_slinger', 2: 'corsair_cutlass', 8: 'corsair_slinger' });
  } else if (kind === 'rod' || kind === 'rolling') {
    rules = {};
    Object.assign(enemyAt, { 0: 'drowned', 2: 'drowned', 6: 'rod_tester', 8: 'rod_tester' });
    for (const s of [6, 8]) units[s] = { lockSkills: [kind === 'rod' ? 'rolling_thunder' : 'thunder_rod'] };
  } else if (kind === 'encased') {
    rules = { condition: 'blizzard' };
    Object.assign(enemyAt, { 0: 'corsair_cutlass', 1: 'morvane_halberdier', 2: 'morvane_halberdier', 8: 'corsair_slinger' });
    units[1] = { displayName: 'Frozen Halberdier', encased: true };
    units[2] = { displayName: 'Frozen Halberdier', encased: true };
  } else if (kind === 'noise') rules = { noise: 'wake_the_halls' };
  else if (kind === 'temper') {
    rules = {};
    Object.assign(enemyAt, { 0: 'temper_tester', 2: 'temper_tester' });
  }
  else if (kind.startsWith('mob_')) {
    // Harita 3 4. dilim: mob başına tek deneme (ön sıra iki tane; arkada var olan kadro)
    const SET: Record<string, { id: string; rules: NonNullable<Teams['rules']>; back?: Record<number, string> }> = {
      mob_vaulter: { id: 'clan_vaulter', rules: {} },
      mob_shardwalker: { id: 'shardwalker', rules: { condition: 'blizzard' } },
      mob_delver: { id: 'hollow_delver', rules: {} },
      mob_gloamstalker: { id: 'gloamstalker', rules: { condition: 'darkness' } },
      mob_cinderleaper: { id: 'cinderleaper', rules: { condition: 'heat' }, back: { 6: 'ember_acolyte', 8: 'ember_acolyte' } },
      mob_slagcart: { id: 'slagcart_golem', rules: { condition: 'heat' } },
      mob_thunderwright: { id: 'thunderwright', rules: {} },
      mob_stormcaller: { id: 'drowned', rules: { condition: 'tide' }, back: { 6: 'clan_stormcaller', 8: 'clan_stormcaller' } },
      mob_eel: { id: 'gloam_eel', rules: { condition: 'dark_tide' } },
      mob_ram: { id: 'stormhorn_ram', rules: {} },
      kit_wolf: { id: 'snow_wolf', rules: {} },
      kit_axeman: { id: 'clan_axeman', rules: { condition: 'blizzard' } },
      kit_crawler: { id: 'cave_crawler', rules: { condition: 'darkness' } },
      kit_skald: { id: 'clan_axeman', rules: {}, back: { 6: 'clan_skald', 8: 'clan_slinger' } },
      kit_witch: { id: 'drowned', rules: {}, back: { 6: 'pyre_witch', 8: 'ember_acolyte' } },
      kit_knight: { id: 'cinder_knight', rules: {} },
      kit_golem: { id: 'forge_golem', rules: {}, back: { 6: 'pyre_witch' } },
      kit_wight: { id: 'wight', rules: {} },
      kit_rime_hound: { id: 'rime_hound', rules: {} },
      kit_slinger: { id: 'drowned', rules: {}, back: { 6: 'clan_slinger', 8: 'clan_slinger' } },
      kit_rime_witch: { id: 'drowned', rules: {}, back: { 6: 'rime_witch', 8: 'rime_witch' } },
      kit_hollow: { id: 'hollow_warden', rules: { condition: 'darkness' } },
      kit_molten: { id: 'molten_hound', rules: {} },
    };
    const s = SET[kind]!;
    Object.assign(enemyAt, { 0: s.id, 2: s.id }, s.back);
    rules = s.rules;
    if (kind === 'mob_thunderwright') {
      if (!party.includes('warrior')) party[party.findIndex((x) => !!x)] = 'warrior';
      if (!party.includes('paladin')) party[party.findIndex((x) => !!x && x !== 'warrior')] = 'paladin';
    }
  }
  else if (kind.startsWith('thunder_')) {
    // Şimşek kuralları: test mobu (Storm Tester, testOnly; sefere bağlı değil)
    Object.assign(enemyAt, { 0: 'drowned', 2: 'drowned', 6: 'storm_tester', 8: 'storm_tester' });
    rules = kind === 'thunder_tide' ? { condition: 'tide' } : kind === 'thunder_urn' ? { device: 'tidewater_urn' } : kind === 'thunder_dark' ? { condition: 'darkness' } : kind === 'thunder_ice' ? { condition: 'blizzard' } : {};
    if (kind === 'thunder_iron') {
      if (!party.includes('warrior')) party[party.findIndex((x) => !!x)] = 'warrior';
      if (!party.includes('paladin')) party[party.findIndex((x) => !!x && x !== 'warrior')] = 'paladin';
    }
  }
  else {
    enemyAt[4] = 'iron_mooring';
    units[4] = { objective: true, displayName: 'Hex Totem' };
    rules = { objective: 'totem', reinforce: { enemies: cells({ 0: 'drowned', 2: 'drowned' }) } };
  }
  const enemies = cells(enemyAt);
  return {
    seed,
    mode,
    teams: { party, enemies, ...(Object.keys(units).length ? { units: { enemies: units } } : {}), rules },
    partySize: 4,
    enemySize: enemies.filter(Boolean).length,
  };
}

/** Debug "Map 2 boss test" (engine-dev 2026-10-27; open-questions 437): Harita 2 bosslarının kuralları (Slick Hide, Surge kadansı, Ballista atışı, Crown of Salt, Champion'ın dirilişi). */
export type BossTestKind = 'wyrm' | 'vane' | 'queen';
export const BOSS_TESTS: ReadonlyArray<{ kind: BossTestKind; label: string; hint: string }> = [
  { kind: 'wyrm', label: 'Weir-Wyrm (Tide)', hint: 'The Weir-Wyrm with 2 Weir Eels on a Tide field: in Flooded water it takes 30% less physical damage; from 60% HP it calls a Surge every 2 turns' },
  { kind: 'vane', label: 'Admiral Vane', hint: 'Admiral Vane with his Harpoon Ballista: the Ballista marks your weakest hero every turn and fires a turn later until it is broken' },
  { kind: 'queen', label: 'Drowned Queen', hint: 'The Drowned Queen with the Drowned Champion: every Flooded cell lowers her damage taken by 2%; the Champion rises twice in water, and again at her 30% HP' },
];

/** BattleScene başlangıç verisi: rastgele 4 kahraman + boss ve eşlikçileri (sefer kaydına dokunmaz). */
export function bossTestBattleData(seed: number, mode: BattleMode, kind: BossTestKind) {
  const party = content.randomCells(content.arrangeTeam(content.randomTeam(seed, 4)), seed);
  const boss = (id: string, scale: number) => ({ tier: 'boss' as const, displayName: content.bosses[id]!.name, modifiers: { spriteScale: scale } });
  const at: Record<number, string> =
    kind === 'wyrm' ? { 1: 'weir_wyrm', 0: 'weir_eel', 2: 'weir_eel' } : kind === 'vane' ? { 4: 'admiral_vane', 3: 'harpoon_ballista', 0: 'corsair_cutlass', 2: 'corsair_cutlass' } : { 4: 'drowned_queen', 1: 'drowned_champion', 6: 'brine_maiden' };
  const units: NonNullable<Teams['units']>['enemies'] =
    kind === 'wyrm' ? { 1: boss('weir_wyrm', 3) } : kind === 'vane' ? { 4: boss('admiral_vane', 2.2), 3: { displayName: 'Harpoon Ballista' } } : { 4: boss('drowned_queen', 1.65), 1: { tier: 'elite', displayName: content.mobs.drowned_champion!.name } };
  const enemies = cells(at);
  return {
    seed,
    mode,
    teams: { party, enemies, units: { enemies: units }, ...(kind === 'wyrm' ? { rules: { condition: 'tide' } } : {}) },
    partySize: 4,
    enemySize: enemies.filter(Boolean).length,
  };
}

export type TouchTestKind = 'golem' | 'snowfather' | 'pack' | 'hierarch' | 'ember' | 'king' | 'matriarch' | 'warden' | 'hearthwarden' | 'brannoc' | 'bearer' | 'oathkeeper';
export const TOUCH_TESTS: ReadonlyArray<{ kind: TouchTestKind; label: string; hint: string }> = [
  { kind: 'golem', label: 'Overheat (Golem)', hint: 'Forge-Master Golem: every action fills the Heat bar, fire fills it faster, ice and water drain it. Full bar: Vent, it loses a turn with 0 Armor. Units tab has Heat +2' },
  { kind: 'snowfather', label: 'Thundersnow', hint: 'The Snowfather: use Set HP below 50%. Each Round a lane is marked and struck the next Round. Whiteout darkens the board; a bolt lights it' },
  { kind: 'pack', label: 'Pack Rotation', hint: 'The Pack-Mother with 3 wolves: hurt a front wolf, at the next Round it swaps with a healthier one behind. Her attacks heal wounded wolves 5%' },
  { kind: 'hierarch', label: 'The Long Sermon', hint: 'The Ashborn Hierarch on a Heat field: a 3-Round sermon. Enough damage staggers it; Silence and Stun do not. If it finishes, Burning ground heals the Ashborn' },
  { kind: 'ember', label: 'Storm in the Chimney', hint: 'The Ember with the Tidewater Urn: use Set HP below 30%. Flare turns to lightning and Urn water conducts it' },
  { kind: 'matriarch', label: 'Greater Kindling', hint: 'The Pyre Matriarch: Stoke marks 2x2 cells that burn, Spread the Flame widens them. She deals 5% more damage for each Burning cell on the field' },
  { kind: 'warden', label: 'Cinder Warden', hint: 'The Cinder Warden: Tempering swaps stance each turn. Hold the Gate draws attacks. Slag Wall marks a lane that burns' },
  { kind: 'hearthwarden', label: 'Forge-Heat + Quench', hint: 'The Hearthwarden: a row is marked each Round and burns the next. Quench puts out every Burning cell and heals her for each. Temper the Crown burns your whole side' },
  { kind: 'brannoc', label: 'Clan Chief Brannoc', hint: 'Clan Chief Brannoc with a Skald and 2 Axemen: his row gains Haste each turn, Rally the Clan hastes a row, Skullsplitter gives Sunder. He cannot be Chilled or Frozen' },
  { kind: 'bearer', label: 'Frozen Ranks', hint: 'The Frozen Standard-Bearer: while he stands, his allies cannot be Chilled and take less damage in a full row. He can be Chilled and Frozen himself. Kill him and the rest lose it' },
  { kind: 'oathkeeper', label: 'Stone Oath', hint: 'The Oathkeeper: each ally that dies gives him +6 armor and +6 magic armor for the rest of the battle. Verdict gives Sunder' },
  { kind: 'king', label: 'The King Hears', hint: 'The Hollow King with Noise on: each fill raises a Warden and the King calls one more for free. Units tab has Noise +5' },
];

/** Harita 3 boss / elit dokunuşu denemesi (maps-2-3.md E1-E6): rastgele 4 kahraman + taşıyan ve eşlikçileri (sefer kaydına dokunmaz). */
export function touchTestBattleData(seed: number, mode: BattleMode, kind: TouchTestKind) {
  const party = content.randomCells(content.arrangeTeam(content.randomTeam(seed, 4)), seed);
  const boss = (id: string, scale: number) => ({ tier: 'boss' as const, displayName: content.bosses[id]!.name, modifiers: { spriteScale: scale } });
  const SETS: Record<TouchTestKind, { at: Record<number, string>; units: NonNullable<Teams['units']>['enemies']; rules?: NonNullable<Teams['rules']> }> = {
    golem: { at: { 1: 'forge_master_golem', 0: 'shieldwarden' }, units: { 1: { tier: 'elite', displayName: 'Forge-Master Golem' } }, rules: { condition: 'heat' } },
    snowfather: { at: { 1: 'snowfather', 0: 'ash_hound', 2: 'ash_hound' }, units: { 1: boss('snowfather', 2.2) }, rules: { condition: 'blizzard' } },
    pack: { at: { 1: 'pack_mother', 0: 'grey_wolf', 3: 'grey_wolf', 4: 'grey_wolf' }, units: { 1: { tier: 'elite', displayName: 'The Pack-Mother' } } },
    hierarch: { at: { 7: 'ashborn_hierarch', 6: 'pitch_boiler', 0: 'cinderleaper' }, units: { 7: { tier: 'elite', displayName: 'The Ashborn Hierarch' }, 6: { displayName: 'Pyre Witch' } }, rules: { condition: 'heat' } },
    ember: { at: { 1: 'ember_of_the_first_hearth' }, units: { 1: boss('ember_of_the_first_hearth', 3) }, rules: { device: 'tidewater_urn' } },
    matriarch: { at: { 7: 'pyre_matriarch', 6: 'ember_acolyte', 8: 'ember_acolyte', 1: 'ash_hound' }, units: { 7: { tier: 'elite', displayName: 'The Pyre Matriarch' } }, rules: { condition: 'darkness' } },
    warden: { at: { 1: 'cinder_warden', 0: 'cinder_knight', 2: 'cinder_knight', 7: 'pyre_witch' }, units: { 1: { tier: 'elite', displayName: 'The Cinder Warden' } }, rules: { condition: 'heat' } },
    brannoc: { at: { 1: 'clan_chief_brannoc', 0: 'clan_axeman', 2: 'clan_axeman', 7: 'clan_skald' }, units: { 1: { tier: 'elite', displayName: 'Clan Chief Brannoc' } } },
    bearer: { at: { 1: 'frozen_standard_bearer', 0: 'frozen_halberdier', 2: 'frozen_halberdier', 7: 'frozen_crossbowman' }, units: { 1: { tier: 'elite', displayName: 'The Frozen Standard-Bearer' }, 0: { displayName: 'Frozen Halberdier' }, 2: { displayName: 'Frozen Halberdier' }, 7: { displayName: 'Frozen Crossbowman' } }, rules: { condition: 'blizzard' } },
    oathkeeper: { at: { 1: 'oathkeeper', 0: 'stonebound_warden', 2: 'stonebound_warden', 7: 'deep_runecaller' }, units: { 1: { tier: 'elite', displayName: 'The Oathkeeper' } } },
    hearthwarden: { at: { 4: 'hearthwarden', 0: 'forge_golem', 2: 'forge_golem' }, units: { 4: boss('hearthwarden', 1.65) } },
    king: { at: { 4: 'hollow_king', 0: 'stonebound_warden', 2: 'stonebound_warden', 7: 'deep_runecaller' }, units: { 4: boss('hollow_king', 2.4), 0: { displayName: 'Hollow Warden' }, 2: { displayName: 'Hollow Warden' }, 7: { displayName: 'Hollow Runecaller' } }, rules: { condition: 'darkness', noise: 'wake_the_halls' } },
  };
  const set = SETS[kind];
  const enemies = cells(set.at);
  return {
    seed,
    mode,
    teams: { party, enemies, units: { enemies: set.units }, ...(set.rules ? { rules: set.rules } : {}) },
    partySize: 4,
    enemySize: enemies.filter(Boolean).length,
  };
}
