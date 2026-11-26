import type Phaser from 'phaser';
import { motion, MOTION } from '../ui/motion';
import { holdBoot } from '../ui/boot-loader';

/**
 * Tasarım kiti ekran geçişi (kararıp açılma): sahne kararır, sonra `key` sahnesi açılır (yeni sahne elScreenIn ile açılır). Azaltılmış
 * harekette hemen. Phaser'ı yalnızca tür olarak kullanır (headless testlerde içe aktarılabilir); `elGo` (elegant-ui) bunu çağırır.
 */
export function screenGo(scene: Phaser.Scene, key: string, data?: object, opts?: { loading?: boolean }): void {
  // Yükleme ekranı basışta açılır (Phaser karesini beklemeden; yavaş cihazda kararma kare başına ilerler), yeni sahne kurulunca kapanır (stage.ts)
  if (opts?.loading) holdBoot('Loading');
  const m = motion('screen');
  const [r, g, b] = MOTION.screen.color as [number, number, number];
  const go = (): void => void (scene.sys.isActive() && scene.scene.start(key, data));
  const cam = scene.cameras?.main;
  if (m.outMs <= 0 || !cam || cam.fadeEffect.isRunning) return go();
  scene.input.enabled = false; // kararırken ikinci tık başka yere gitmesin
  cam.once('camerafadeoutcomplete', go);
  cam.fadeOut(m.outMs, r, g, b);
}
