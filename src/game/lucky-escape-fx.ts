/**
 * Lucky Escape anı (Ömer 2026-10-11): Luck primary birimin savaş başına bir kez ölümcül darbeyi tamamen yok sayması, bir bakışta
 * "şans kurtardı" diye okunsun. ~1 sn: zaman bir an takılır (kısa ağır çekim), darbe birimden SEKER (altın-beyaz sapma kıvılcımları,
 * saldıranın vuruşu geri kayar), birimin çevresinde sıcak altın parıltı, altın nal havaya fırlayıp döner ve ışığı yakalar, birim sendeler
 * ama ayakta kalır, kit dilinde "Lucky Escape!" yazısı + gerçek madeni para sesi (data/audio-v2/shared.json > luckyCoin: başparmak
 * fiske tıkı, dar bant metal tınısı, avuca düşüş; saf sinüs yok).
 * Reduced motion: takılma, dönüş, sekme kayması ve sendeleme yok; yalnızca parıltı + yazı. Performans modu: kıvılcımlar yarıya; postFX hiç yok.
 * Ölçüler data/battle-layout.json > animation.luckyEscape.
 */
import Phaser from 'phaser';
import layout from '../../data/battle-layout.json';
import { reducedMotion } from '../ui/motion-pref';
import { perfLite } from '../ui/perf-mode';
import { uiIconName } from '../ui/ui-icons';
import { SHARED_KEY } from './asset-versions';
import { playSfx } from './audio';
import type { CombatantView } from './combatant-view';
import { ensureIcon } from './icons';
import { ensureGlow } from './menu-text';
import { VFX_BASE_KIT } from './vfx';

const cfg = layout.animation.luckyEscape;
const GOLD = Phaser.Display.Color.HexStringToColor(cfg.gold).color;

/** Zamanı bir an takar: tween hızı hitchMs (sahne saati) boyunca x hitchScale, sonra eski hıza döner (bu arada değişmediyse). */
function hitch(scene: Phaser.Scene): void {
  const tw = scene.tweens;
  const base = tw.timeScale;
  if (base <= 0) return;
  const slowed = base * cfg.hitchScale;
  tw.timeScale = slowed;
  // Sahne saatiyle (Battle speed'e uyar; tween hızından bağımsız)
  scene.time.delayedCall(cfg.hitchMs, () => {
    if (tw.timeScale === slowed) tw.timeScale = base;
  });
}

/** Dört köşeli kısa ışık yıldızı (nalın ışığı yakaladığı an). */
function glint(scene: Phaser.Scene, x: number, y: number, size: number, depth: number): void {
  const parts = [0, Math.PI / 2].map((a) => scene.add.rectangle(x, y, size, Math.max(3, size / 9), 0xfffbe6).setRotation(a + Math.PI / 4).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth));
  for (const p of parts) {
    p.setScale(0.2).setAlpha(1);
    scene.tweens.add({ targets: p, scale: 1, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
  }
}

/** Nal dokusunu önceden yükler (boyalı ikon eşzamansız iner; ilk Lucky Escape'te boş kalmasın). */
export function prewarmLuckyEscape(scene: Phaser.Scene): void {
  ensureIcon(scene, uiIconName('luckyEscape'), cfg.gold, false);
}

/**
 * Lucky Escape efektini oynatır. `attacker`: darbeyi vuran (yoksa / kendisiyse sekme yönü hedefin karşı tarafı). Döndürdüğü söz, akışın
 * devam edebileceği an (takılma + sekme) çözülür; nal ve yazı arka planda biter.
 */
export function playLuckyEscape(scene: Phaser.Scene, target: CombatantView, attacker?: CombatantView): Promise<void> {
  const still = reducedMotion();
  const lite = perfLite();
  const c = target.container;
  const cx = c.x;
  const chestY = c.y - target.h * 0.55;
  // Darbenin geldiği yön: saldırana doğru (yoksa karşı taraf)
  const dir = attacker && attacker !== target ? Math.sign(attacker.container.x - cx) || 1 : target.combatant.side === 'party' ? 1 : -1;
  playSfx(scene, 'luckyCoin', SHARED_KEY);
  if (!still) hitch(scene);

  // Sıcak altın parıltı (pişmiş yumuşak doku, ADD; tam ekran efekt yok)
  const glow = scene.add.image(cx, chestY, ensureGlow(scene)).setTint(GOLD).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(target.w * 1.5, target.h * 1.25).setDepth(c.depth + 1).setAlpha(0);
  scene.tweens.add({ targets: glow, alpha: 0.8, duration: cfg.shimmerMs * 0.3, yoyo: true, hold: cfg.shimmerMs * 0.2, ease: 'Sine.easeOut', onComplete: () => glow.destroy() });
  target.sprite.setTintFill(0xfff0c0);
  scene.time.delayedCall(90, () => target.sprite.setTint(0xffe2a0));
  scene.time.delayedCall(cfg.shimmerMs * 0.6, () => target.sprite.clearTint());
  target.ring(cfg.gold, 0.9);

  // Darbe seker: temas noktasında altın-beyaz kıvılcımlar saldırana doğru, yukarı açılı koni
  const hitX = cx + dir * target.w * 0.3;
  VFX_BASE_KIT.burst(scene, hitX, chestY, { colors: cfg.sparks, n: lite ? Math.ceil(cfg.sparkN / 2) : cfg.sparkN, speed: [180, 460], angle: dir > 0 ? [-Math.PI * 0.42, Math.PI * 0.08] : [Math.PI * 0.92, Math.PI * 1.42], gravity: 700, life: [220, 460], size: [5, 10], depth: c.depth + 2 });
  if (!still) {
    // Saldıranın vuruşu kayar (yalnızca sprite ofseti: konum tween'leriyle çakışmaz), birim sendeler ama ayakta kalır
    if (attacker && attacker !== target) scene.tweens.add({ targets: attacker.sprite, x: { from: -dir * cfg.skidPx, to: 0 }, duration: 260, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: target.sprite, x: { from: -dir * cfg.staggerPx, to: 0 }, angle: { from: -dir * 4, to: 0 }, duration: 420, ease: 'Back.easeOut' });
  }

  // Altın nal havaya fırlar, döner, tepede ışığı yakalar ve söner
  // Başın üstünden çıkar ve yazının da üstüne kadar yükselir (gövdenin altın parıltısına ve yazıya karışmasın)
  const headY = c.y - target.h * 0.92;
  const horseshoe = scene.add.image(cx, headY, ensureIcon(scene, uiIconName('luckyEscape'), cfg.gold, false)).setDisplaySize(cfg.coinPx, cfg.coinPx).setDepth(4300); // komşu birimlerin adlarının üstünde
  const sx = horseshoe.scaleX;
  if (still) {
    horseshoe.setY(headY - cfg.coinRise).setAlpha(0);
    scene.tweens.add({ targets: horseshoe, alpha: 1, duration: 160, yoyo: true, hold: cfg.coinMs * 0.6, onComplete: () => horseshoe.destroy() });
  } else {
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: cfg.coinMs,
      onUpdate: (tw) => {
        const u = tw.getValue() ?? 0;
        // Yükselip tepede biraz asılı kalır, sonra hafif düşer
        const up = u < 0.7 ? 1 - Math.pow(1 - u / 0.7, 3) : 1 - 0.12 * ((u - 0.7) / 0.3);
        horseshoe.setPosition(cx + dir * -18 * u, headY - cfg.coinRise * up);
        // Dönüş: yatay ölçek cos ile (madeni para gibi), her yüz dönüşte kısa parlama
        const flip = Math.cos(u * cfg.coinFlips * Math.PI * 2);
        horseshoe.scaleX = sx * Math.max(0.08, Math.abs(flip));
        if (u > 0.12 && Math.abs(flip) > 0.985) horseshoe.setTintFill(0xfff7d0);
        else horseshoe.clearTint();
        horseshoe.setAlpha(u > 0.82 ? 1 - (u - 0.82) / 0.18 : 1);
      },
      onComplete: () => horseshoe.destroy(),
    });
    scene.time.delayedCall(cfg.coinMs * 0.62, () => glint(scene, horseshoe.x, horseshoe.y, cfg.coinPx * 1.4, 4301));
  }

  // Kit dilinde yazı (yüzen yazı şeridi; boyalı nal solunda, kor ışıması arkasında)
  target.floatText('Lucky Escape!', cfg.gold, cfg.textPx, !still, { kind: 'crit', leftIcon: uiIconName('luckyEscape') });

  return new Promise((resolve) => scene.time.delayedCall(still ? 120 : cfg.hitchMs + 180, resolve));
}
