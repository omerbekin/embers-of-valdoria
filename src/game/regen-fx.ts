/**
 * Tur başı yenilenme görünümü (Ömer 2026-10-11, yüzen yazı taslağı A): yenilenme yüzen sayı OLMAZ. Can / MP çubuğu kısa bir parıltıyla
 * yanıp söner ve çubuğun sağında soluk küçük bir "+1" / "+2 MP" bir an durur. Hangi olayın yenilenme olduğu saf `regen-ticks.ts`'de.
 * Yalnızca dikdörtgen + yazı (postFX yok); Reduced motion'da yazı kaymaz. Ölçüler data/battle-layout.json > animation.regenTick.
 */
import Phaser from 'phaser';
import layout from '../../data/battle-layout.json';
import { reducedMotion } from '../ui/motion-pref';
import { FLOAT_SERIF } from './float-text';

const { hpBar } = layout;
const cfg = layout.animation.regenTick;

/** Görünümün ihtiyaç duyduğu kadarı (CombatantView'a dokunmadan). */
export interface RegenTarget {
  readonly container: Phaser.GameObjects.Container;
  readonly h: number;
}

export function playRegenTick(scene: Phaser.Scene, view: RegenTarget, which: 'hp' | 'mp', amount: number): void {
  if (amount <= 0 || !view.container.active) return;
  const hpY = -view.h - hpBar.offsetY;
  const mpY = hpY + hpBar.height / 2 + hpBar.mpHeight / 2 + 3;
  const y = which === 'hp' ? hpY : mpY;
  const barH = which === 'hp' ? hpBar.height : hpBar.mpHeight;
  const tint = Phaser.Display.Color.HexStringToColor(which === 'hp' ? cfg.hpGlow : cfg.mpGlow).color;
  // Çubuk parıltısı: dış çerçeve + içte yumuşak dolgu, yükselip söner
  const ring = scene.add.rectangle(0, y, hpBar.width + 8, barH + 8, tint, 0).setStrokeStyle(2, tint, 1).setAlpha(0);
  const wash = scene.add.rectangle(0, y, hpBar.width, barH, 0xffffff, 0.35).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  view.container.add([ring, wash]);
  scene.tweens.add({ targets: [ring, wash], alpha: 1, duration: cfg.pulseMs * 0.35, yoyo: true, hold: cfg.pulseMs * 0.15, ease: 'Sine.easeOut', onComplete: () => (ring.destroy(), wash.destroy()) });
  // Soluk küçük yazı: çubuğun sağında (can satırı biraz yukarıda, MP satırı biraz aşağıda: ikisi aynı anda gelince üst üste binmez)
  const text = which === 'hp' ? `+${amount}` : `+${amount} MP`;
  const chip = scene.add
    .text(hpBar.width / 2 + cfg.chipGap, which === 'hp' ? hpY - cfg.chipSplit : mpY + cfg.chipSplit, text, {
      fontFamily: FLOAT_SERIF,
      fontSize: `${cfg.chipPx}px`,
      fontStyle: 'bold',
      color: which === 'hp' ? cfg.hpChip : cfg.mpChip,
      stroke: '#120b06',
      strokeThickness: Math.max(3, Math.round(cfg.chipPx / 6)),
    })
    .setOrigin(0, 0.5)
    .setAlpha(0);
  view.container.add(chip);
  const still = reducedMotion();
  scene.tweens.add({ targets: chip, alpha: cfg.chipAlpha, duration: 140 });
  if (!still) scene.tweens.add({ targets: chip, y: chip.y - cfg.chipDrift, duration: cfg.chipMs, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: chip, alpha: 0, delay: cfg.chipMs - 220, duration: 220, onComplete: () => chip.destroy() });
}
