// Son vuruş anı (Ömer 2026-11-15, Tur 20 a03): savaş biterken kısa ağır çekim (hız 0,4) + kenarlardan hafif koyulaşma, sonra kısa bekleme,
// sonra sonuç ekranı. Yenilgide aynısı soğuk tonda. Sarsıntı / flaş yok. Reduced motion: yalnız bekleme (ağır çekim ve koyulaşma yok).
// Süreler data/ui-motion.json > finalBlow. Hız ayarına (debug hızı) saygı: ağır çekim mevcut ölçeğin üstüne çarpılır.
import Phaser from 'phaser';
import { MOTION } from '../ui/motion';
import { reducedMotion } from '../ui/motion-pref';
import { FULL_W, FULL_X0 } from '../ui/viewport';

const H = 1080;

/** Kenar koyulaşması dokusu (ortası şeffaf, kenarlar koyu); sıcak (zafer) ve soğuk (yenilgi) iki renk. */
function vignetteKey(scene: Phaser.Scene, cold: boolean): string {
  const key = `final-vignette-${cold ? 'cold' : 'warm'}`;
  if (scene.textures.exists(key)) return key;
  const w = 512;
  const h = 288;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.38, w / 2, h / 2, w * 0.62);
  const rgb = cold ? '8,18,40' : '10,6,3';
  g.addColorStop(0, `rgba(${rgb},0)`);
  g.addColorStop(1, `rgba(${rgb},${cold ? 0.62 : 0.5})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  tex.refresh();
  return key;
}

/**
 * Son vuruş nefesi: çözülünce sonuç ekranı açılabilir. `restore` ağır çekimi bitirip debug zaman ölçeğini geri koyar (sahne verir).
 * Dönen `release` koyulaşmayı yavaşça kaldırır (sonuç ekranı açılırken çağrılır).
 */
export async function playFinalBlow(
  scene: Phaser.Scene,
  victory: boolean,
  hooks: { setScale(mult: number): void; wait(ms: number): Promise<void> },
): Promise<{ release(): void }> {
  const cfg = MOTION.finalBlow;
  if (reducedMotion()) {
    await hooks.wait(cfg.holdMs);
    return { release: () => undefined };
  }
  const v = scene.add.image(FULL_X0 + FULL_W / 2, H / 2, vignetteKey(scene, !victory)).setDisplaySize(FULL_W, H).setDepth(4600).setAlpha(0);
  scene.tweens.add({ targets: v, alpha: 1, duration: cfg.slowMs, ease: 'Sine.easeOut' });
  hooks.setScale(cfg.slowScale);
  await hooks.wait(cfg.slowMs * cfg.slowScale); // ölçekli zamanda: gerçek süre slowMs
  hooks.setScale(1);
  await hooks.wait(cfg.holdMs);
  return {
    release: () => {
      if (!v.scene) return;
      scene.tweens.add({ targets: v, alpha: 0, duration: cfg.releaseMs, onComplete: () => v.destroy() });
    },
  };
}
