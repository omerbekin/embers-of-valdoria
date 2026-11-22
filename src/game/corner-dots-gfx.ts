import type Phaser from 'phaser';
import { CD_COLOR_HEX, cdCentred, cdDot, cdPitch, type CdPos } from '../ui/corner-dots-rule';

/**
 * Phaser çerçeveleri için köşe süsü: yuvarlak üç nokta (kural tek yerde `src/ui/corner-dots-rule.ts`; DOM ikizi `src/ui/corner-dots.ts` + `corner-dots.css`).
 * (x, y, w, h) = çerçevenin kenar çizgileri (sol üst köşe + ölçü). `scale` = çerçevenin masaüstüne göre büyütülmüşlüğü (ör. bandTip `s`): kademe
 * ölçü / scale ile seçilir, nokta scale ile büyür; böylece nokta / kutu oranı her ölçekte aynı kalır.
 */
export function drawCornerDots(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, o: { pos?: CdPos; scale?: number; alpha?: number } = {}): void {
  const s = o.scale ?? 1;
  const wd = w / s;
  const hd = h / s;
  const short = Math.min(wd, hd);
  const d = cdDot(short) * s;
  const pt = cdPitch(short) * s;
  g.fillStyle(CD_COLOR_HEX, o.alpha ?? 1);
  const dot = (cx: number, cy: number): void => void g.fillCircle(cx, cy, d / 2);
  if (cdCentred(wd, hd)) {
    for (const i of [-1, 0, 1]) {
      dot(x + w / 2 + i * pt, y);
      dot(x + w / 2 + i * pt, y + h);
    }
    return;
  }
  const pos = o.pos ?? 'br';
  for (const i of [1, 2, 3]) {
    dot(x + i * pt + d / 2, y);
    dot(x + w - i * pt - d / 2, pos === 'tr' ? y : y + h);
  }
}
