/**
 * Dizilim menzil göstergesi (Phaser ipuçları için): Sefer Formation tahtasının hover kutusuyla AYNI kural ve cümleler
 * (src/ui/formation-board-rules.ts: fitOfHint, reachRows, reachText, fitAccent; menzil bayrağı boardRangeUi).
 * Quick Battle / Multiplayer (TeamSelectScene) ve Endless takım seçimi bunu kullanır; kopya kural yok.
 */
import { content, placementHintText, type PlacementHint } from '../engine';
import { boardRangeUi } from '../ui/formation-board-data';
import { fitAccent, fitOfHint, reachRows, reachText, rowName } from '../ui/formation-board-rules';
import type { PhChip, PhLine } from './band-tip';

export interface ReachTipParts {
  accent: string;
  chips: PhChip[];
  lines: PhLine[];
  foot?: string;
  footHex?: string;
  rowLabel: string;
}

/** Sınıfın ana menzili (null = menzilsiz / Global). */
export function classRange(classId: string): number | null {
  const r = content.planUnitOf(classId).range;
  return Number.isFinite(r) ? r : null;
}

/** Hücredeki birim için menzil ipucu parçaları; menzil sistemi kapalıysa null (eski görünüm). `cell` = 0-11 (sıra = cell / 3). */
export function reachTipParts(name: string, classId: string, cell: number, hint: PlacementHint | undefined): ReachTipParts | null {
  if (!boardRangeUi() || cell < 0) return null;
  const row = Math.floor(cell / 3);
  const range = classRange(classId);
  const fit = fitOfHint(hint);
  const n = reachRows(range, row);
  const lines: PhLine[] = [{ text: reachText(n), ...(n <= 0 ? { hex: '#ffb7a6' } : {}) }];
  if (fit === 'weak') lines.push({ text: 'Exposed in front', hex: '#f3d08a' });
  const chips: PhChip[] = [
    { text: rowName(row), tone: 'ac' },
    { text: 'Range', num: range === null ? 'Global' : String(range), tone: 'v' },
    { text: `Enemy rows hit ${n}/4`, tone: n <= 0 ? 'warn' : 'ok' },
  ];
  return { accent: fitAccent(n, fit), chips, lines, rowLabel: rowName(row), ...(hint ? { foot: placementHintText(name, hint), footHex: fit === 'bad' ? '#e8806a' : '#ffb35a' } : {}) };
}
