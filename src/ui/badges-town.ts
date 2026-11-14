/**
 * Kasaba yerlerinin rozeti (Ömer 2026-11-12, "C"): alınabilir yerin (bekleyen aday, yaralı kahraman için Inn, Temper Stone için demirci) etiket
 * plakasının kenarı kor ışıkla nabız atar; sayı / "!" yok. Kural src/ui/badge-model.ts > townSpotBadge. Hareketi azalt: sabit parıltı.
 */
import Phaser from 'phaser';
import { townSpotBadge, type BadgeStateIn } from './badge-model';
import { reducedMotion } from './motion-pref';

export interface TownBadgeIn {
  action: string;
  recruit: boolean;
  state: BadgeStateIn;
  plate: { x: number; y: number; w: number; h: number };
}

/** Alınabilir yerin plakasına parlayan kenar ekler; yoksa hiçbir şey çizmez. */
export function townBadge(scene: Phaser.Scene, root: Phaser.GameObjects.Container, o: TownBadgeIn): void {
  if (!townSpotBadge(o.action, o.state, o.recruit)) return;
  const { x, y, w, h } = o.plate;
  const g = scene.add.graphics();
  g.lineStyle(7, 0xe0702a, 0.28).strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2);
  g.lineStyle(2, 0xffb35a, 0.95).strokeRoundedRect(x, y, w, h, h / 2);
  root.add(g);
  if (!reducedMotion()) scene.tweens.add({ targets: g, alpha: 0.35, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}
