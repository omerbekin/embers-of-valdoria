/**
 * Dizilim ipucu rozeti (Ömer 2026-10-18; kural src/engine/formation-hints.ts): uygunsuz hücredeki birimin köşesinde küçük "!" elması.
 * Yalnızca öneri: yerleşimi engellemez. Quick Battle, sefer Formation ve Endless takım seçimi aynı rozeti kullanır.
 */
import Phaser from 'phaser';
import type { PlacementHint } from '../engine';
import { EL, diamondPts, elText } from './elegant-ui';

const BAD = 0xe8806a; // EL.BAD

/** Rozet (merkez x, y; boy r). Ulaşamıyor = kırmızımsı dolu, önde açıkta = kor çerçeveli. */
export function hintBadge(scene: Phaser.Scene, x: number, y: number, hint: PlacementHint, r = 11): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const col = hint.kind === 'outOfReach' ? BAD : EL.EMBER2;
  g.fillStyle(0x0a0705, 0.9).fillPoints(diamondPts(0, 0, r + 3), true);
  g.fillStyle(col, 0.95).fillPoints(diamondPts(0, 0, r), true);
  c.add([g, elText(scene, 0, 0.5, '!', Math.round(r * 1.25), '#1a0c06', { em: 0 }).setOrigin(0.5)]);
  return c;
}

/** İpucu metninin rengi. */
export const hintColor = (hint: PlacementHint): string => (hint.kind === 'outOfReach' ? EL.BAD : '#ffb35a');
