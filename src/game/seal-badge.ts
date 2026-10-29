/**
 * Taş Yemini mühür madalyonu (Ömer 2026-10-29, seçenek A): yeminliyken cüce mezarı düğümünün (`oathSealed`) üstünde
 * rün madalyonu; Caravel yelken madalyonuyla aynı konum / ölçü / yapı. Rozetin kendisi değişmez.
 */
import Phaser from 'phaser';

const RUNE = 0x8fb4d6; // soluk buz mavisi (Harita 3 soğuk taş dili)

/** Küçük rün: dikey gövde + iki çapraz kol (Algiz benzeri). */
function rune(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, col: number, a = 1, w = 1.8): void {
  g.lineStyle(w, col, a);
  g.lineBetween(x, y - s, x, y + s);
  g.lineBetween(x, y - 0.1 * s, x - 0.75 * s, y - 0.9 * s);
  g.lineBetween(x, y - 0.1 * s, x + 0.75 * s, y - 0.9 * s);
}

/** Düğüm kabına (c) mühür madalyonunu ekler. R = çerçeve yarıçapı. */
export function drawOathSeal(scene: Phaser.Scene, c: Phaser.GameObjects.Container, R: number): void {
  const g = scene.add.graphics();
  const sy = -R - 16;
  g.fillStyle(0x0d0906, 0.92).fillCircle(0, sy, 14).lineStyle(1.6, RUNE, 0.95).strokeCircle(0, sy, 14);
  g.lineStyle(1, RUNE, 0.45).strokeCircle(0, sy, 10.5);
  rune(g, 0, sy + 0.5, 6.5, 0xdbe9f5, 0.97);
  c.add(g);
}
