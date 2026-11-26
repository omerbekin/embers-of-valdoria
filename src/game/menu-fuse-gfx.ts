import type Phaser from 'phaser';
import { fusePrims, rgbHex, type FuseGeom } from '../ui/menu-fuse';

/** Yanan fitili (src/ui/menu-fuse.ts) bir Phaser Graphics'e çizer (her karede temizleyip yeniden). */
export function drawFuseGfx(g: Phaser.GameObjects.Graphics, geom: FuseGeom, t: number): void {
  g.clear();
  for (const p of fusePrims(geom, t)) {
    if (p.a <= 0.004) continue;
    if (p.k === 'seg') g.lineStyle(p.w, rgbHex(p.c), p.a).lineBetween(p.x1, p.y1, p.x2, p.y2);
    else g.fillStyle(rgbHex(p.c), p.a).fillCircle(p.x, p.y, Math.max(0.3, p.r));
  }
}
