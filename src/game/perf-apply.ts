import Phaser from 'phaser';
import layout from '../../data/battle-layout.json';
import { onPerfLiteChange, perfLite } from '../ui/perf-mode';
import { setLiteRender } from '../ui/viewport';

/**
 * Performans modunu oyuna uygular (Ömer 2026-10-11; ayar src/ui/perf-mode.ts):
 * - tuval düşük çözünürlük (src/ui/viewport.ts > stageMetrics, `stage.liteRenderScale`; kamera yakınlaştırması aynı oranda, koordinatlar aynı);
 * - kare hızı sınırı `stage.liteFps` (Phaser TimeStep sınırlayıcısı çalışırken açılıp kapanır);
 * - tam ekran postFX geçişleri (skill efektlerindeki sprite parıltısı, ısı titremesi, bulanıklık...) atlanır: çağıranlar `fx` yoksa
 *   efektsiz devam eder (hepsi `if (fx)` / try ile yazılı). Hedefleme parıltısı zaten ucuz pişmiş dokudur (src/game/sprite-glow.ts).
 * Kapalıyken oyun birebir eskisi gibi.
 */
export function installPerfMode(game: Phaser.Game): void {
  guardPostFx();
  const apply = (lite: boolean): void => {
    setLiteRender(lite);
    document.documentElement.classList.toggle('perf-lite', lite); // DOM süs animasyonları (ör. evolve ikonu, src/ui/evolve-icon.css) durur
    setFpsLimit(game, lite ? layout.stage.liteFps : 0);
  };
  apply(perfLite());
  onPerfLiteChange(apply);
}

/** TimeStep'e çalışırken kare sınırı (0 = sınırsız). Phaser'ın sınırlayıcısı aralığı tam 1000/fps alınca 60 Hz ekranda 20 fps'e düşebildiği için pay bırakılır. */
function setFpsLimit(game: Phaser.Game, fps: number): void {
  const loop = game.loop as Phaser.Core.TimeStep & { _limitRate: number; raf: { callback: (t: number) => void } };
  loop.fpsLimit = fps;
  loop.hasFpsLimit = fps > 0;
  loop._limitRate = fps > 0 ? 1000 / fps - 4 : 0;
  loop.delta = 0;
  if (loop.started) loop.raf.callback = fps > 0 ? loop.stepLimitFPS.bind(loop) : loop.step.bind(loop);
}

let guarded = false;

/** Performans modunda postFX (tuval boyunda ek geçiş) ekleyen FX yöntemleri hiçbir şey eklemez; preFX (nesne boyunda) dokunulmaz. */
function guardPostFx(): void {
  if (guarded) return;
  guarded = true;
  const FX = (Phaser.GameObjects.Components as unknown as { FX?: { prototype: Record<string, unknown> } }).FX;
  if (!FX) return;
  const proto = FX.prototype;
  for (const name of ['addGlow', 'addShadow', 'addPixelate', 'addVignette', 'addShine', 'addBlur', 'addGradient', 'addBloom', 'addCircle', 'addBarrel', 'addDisplacement', 'addWipe', 'addReveal', 'addBokeh', 'addTiltShift']) {
    const orig = proto[name];
    if (typeof orig !== 'function') continue;
    proto[name] = function (this: { isPost?: boolean }, ...args: unknown[]) {
      if (this.isPost && perfLite()) return undefined;
      return (orig as (...a: unknown[]) => unknown).apply(this, args);
    };
  }
}
