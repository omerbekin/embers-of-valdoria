// Debug "Objective test" savaşları (Harita 2-3 savaş katmanı; maps-2-3.md M-A / B3 / M-B / M-I / M-J; data/battle-rules.json).
// Saf veri kurucusu: oyuncu tarafı rastgele 4 sınıf, düşman tarafı Harita 2 mobları; kural Teams.rules ile gider (sefer kaydına dokunmaz).
import { content, type BattleMode, type Teams } from '../engine';

export type RulesTestKind = 'tide' | 'storm' | 'urn' | 'survive' | 'totem' | 'hold' | 'deck' | 'mixed';

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
