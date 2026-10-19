// Debug: 3 dalgalı deneme savaşı (Setup > Test battles > Wave test battle). Veri: data/debug/wave-test.json (yalnızca debug; sefer / Endless
// verisine dokunmaz). Saf: BattleScene'e verilecek başlangıç verisini kurar; oyun kuralı yoktur.
import waveTest from '../../data/debug/wave-test.json';
import { content } from '../engine';
import type { BattleMode, UnitSetup } from '../engine';

interface WaveUnit {
  class: string;
  slot: number;
  unit?: UnitSetup;
}

/** Birim listesi -> hücre listesi (dizin = yuva) + yuvaya göre birim kurulumları. */
function cellsOf(list: readonly WaveUnit[]): { cells: string[]; units: Record<number, UnitSetup> } {
  const cells: string[] = Array.from({ length: content.CELL_COUNT }, () => '');
  const units: Record<number, UnitSetup> = {};
  for (const u of list) {
    cells[u.slot] = u.class;
    if (u.unit) units[u.slot] = u.unit;
  }
  return { cells, units };
}

/** Deneme savaşının sahne verisi: oyuncu tarafı rastgele 4 sınıf (Quick Battle gibi), düşman tarafı 3 dalga (2 + 2 + 1 elit). */
export function waveTestBattleData(seed: number, mode: BattleMode) {
  const first = cellsOf(waveTest.enemies as WaveUnit[]);
  const later = (waveTest.waves as Array<{ enemies: WaveUnit[] }>).map((w) => cellsOf(w.enemies));
  const party = content.randomCells(content.arrangeTeam(content.randomTeam(seed, 4)), seed);
  return {
    seed,
    mode,
    teams: {
      party,
      enemies: first.cells,
      units: { enemies: first.units },
      waves: later.map((w) => ({ enemies: w.cells, units: w.units })),
    },
    partySize: 4,
    enemySize: waveTest.enemies.length,
  };
}
