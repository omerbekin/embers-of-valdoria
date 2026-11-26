import type Phaser from 'phaser';
import fxData from '../../data/passive-evolve-fx.json';

/**
 * Pasif evrimi = karakter efekti (Ömer 2026-11-23): pasifi evrimleşmiş birimin etrafında parıltı YALNIZ pasif tetiklenince, kısa süre (sürekli parıltı yok;
 * Ömer 2026-11-24). Skill animasyonu değil, karakterin üstünde duran efekt. Evrim yoksa HİÇBİR ŞEY çizilmez.
 * Renk / biçim sınıf başına veride (data/passive-evolve-fx.json); başka sınıfın pasif evrimi aynı kalıbı satır ekleyerek kullanır.
 * Maliyet: bekleme anında sıfır iş (tween/zamanlayıcı yok); tetikte kısa tween. Yalnızca sunum; motor aynı.
 */
export interface PassiveEvolveFxSpec {
  passive: string;
  core: string;
  mid: string;
  edge: string;
  width: number;
  height: number;
  burstAlpha: number;
  rimBurst: number;
  burstMs: number;
  moteCount: number;
  moteAlpha: number;
  moteColors: string[];
}

const SPECS = fxData as unknown as Record<string, PassiveEvolveFxSpec | string>;

/** Saf karar: birimin pasifi evrimleşmişse (Combatant.evolved pasifin id'sini içeriyor) ve sınıfın satırı varsa spec, yoksa null. */
export function passiveEvolveFx(c: { defId: string; passive?: { id: string } | null; evolved?: readonly string[] }): PassiveEvolveFxSpec | null {
  const s = SPECS[c.defId];
  if (!s || typeof s === 'string') return null;
  if (!c.passive || c.passive.id !== s.passive) return null;
  return c.evolved?.includes(s.passive) ? s : null;
}

/** Phaser.BlendModes.ADD (testte Phaser yüklenmesin diye sabit). */
const ADD = 1;
const between = (a: number, b: number): number => a + Math.random() * (b - a);
const hexInt = (h: string): number => parseInt(h.slice(1), 16);

function glowTexture(scene: Phaser.Scene, key: string, spec: PassiveEvolveFxSpec): void {
  if (scene.textures.exists(key)) return;
  const W = 48;
  const H = 64;
  const tex = scene.textures.createCanvas(key, W, H);
  if (!tex) return;
  const ctx = tex.getContext();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x + 0.5 - W / 2) / (W / 2), (y + 0.5 - H / 2) / (H / 2));
      if (d >= 1) continue;
      ctx.globalAlpha = Math.round((1 - d) ** 1.15 * 8) / 8; // az basamaklı yumuşak sönüm (piksel art ışıması)
      ctx.fillStyle = d < 0.3 ? spec.core : d < 0.65 ? spec.mid : spec.edge;
      ctx.fillRect(x, y, 1, 1);
    }
  tex.refresh();
}

export interface PassiveEvolveFxHandle {
  /** Pasif tetiklendi: parıltı kısa süre güçlenir. */
  burst(): void;
  destroy(): void;
  /** Testler ve çizim doğrulaması için: oluşturulan görseller. */
  readonly items: Phaser.GameObjects.GameObject[];
}

/** Parıltıyı birimin kabına kurar (sprite'ın ARKASINA: karakteri ve çubukları örtmez). */
export function mountPassiveEvolveFx(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  sprite: Phaser.GameObjects.Sprite,
  size: { w: number; h: number },
  spec: PassiveEvolveFxSpec,
  lite: boolean,
  /** Sprite silüetini izleyen kenar parıltısı (SpriteGlow; CombatantView verir). Verilmezse yalnız yumuşak hale. */
  rim?: { img: Phaser.GameObjects.Image; destroy(): void },
): PassiveEvolveFxHandle {
  const key = `fx:passiveevo:${spec.core}${spec.mid}${spec.edge}`;
  glowTexture(scene, key, spec);
  const at = Math.max(0, container.getIndex(sprite));
  // Ömer 2026-11-24: sürekli parıltı / nabız YOK; her şey yalnız pasif tetiklenince kısa süre görünür (eski gücün ~%20'si, veride).
  const flare = scene.add.image(0, -size.h * 0.5, key).setDisplaySize(size.w * spec.width * 1.25, size.h * spec.height * 1.15).setBlendMode(ADD).setAlpha(0);
  container.addAt(flare, at);
  const items: Phaser.GameObjects.GameObject[] = [flare];
  if (rim) {
    rim.img.setTint(hexInt(spec.mid)).setBlendMode(ADD).setAlpha(0);
    items.push(rim.img);
  }
  const mote = (): void => {
    if (!container.active || container.alpha < 0.5) return;
    const m = scene.add.rectangle(between(-size.w * 0.3, size.w * 0.3), -size.h * between(0.1, 0.6), 4, 4, hexInt(spec.moteColors[Math.floor(Math.random() * spec.moteColors.length)]!)).setBlendMode(ADD).setAlpha(spec.moteAlpha);
    container.add(m);
    scene.tweens.add({ targets: m, y: m.y - between(40, 80), alpha: 0, duration: 1100, onComplete: () => m.destroy() });
  };
  return {
    items,
    burst: () => {
      if (!flare.active) return;
      scene.tweens.killTweensOf(flare);
      flare.setAlpha(0);
      scene.tweens.add({ targets: flare, alpha: spec.burstAlpha, duration: spec.burstMs * 0.25, yoyo: true, hold: spec.burstMs * 0.1, ease: 'Quad.easeOut' });
      if (rim && rim.img.active) {
        scene.tweens.killTweensOf(rim.img);
        rim.img.setAlpha(0);
        scene.tweens.add({ targets: rim.img, alpha: spec.rimBurst, duration: spec.burstMs * 0.25, yoyo: true, hold: spec.burstMs * 0.1, ease: 'Quad.easeOut' });
      }
      if (!lite) for (let i = 0; i < spec.moteCount; i++) scene.time.delayedCall(i * 90, mote);
    },
    destroy: () => {
      for (const it of items) scene.tweens.killTweensOf(it);
      rim?.destroy();
      for (const it of items) if (it.active) it.destroy();
    },
  };
}
