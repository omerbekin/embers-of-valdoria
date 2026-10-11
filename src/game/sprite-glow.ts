import Phaser from 'phaser';
import { stageView } from './stage-view';

/**
 * Hedefleme parıltısı (yeşil = yararlı, kırmızı = zararlı) için önceden pişirilmiş hale dokusu.
 *
 * Eskiden her parlayan birime Phaser postFX Glow takılıyordu: her biri HER karede tuval boyunda (telefonda ~2340x1080) ayrı çerçeve
 * tamponuna çizim + ağır bir örnekleme gölgelendiricisi demekti ve skill değiştirince tamponlar baştan kuruluyordu (zayıf telefonda
 * skill seçimi gecikiyor, boşta bile kare düşüyordu). Şimdi sprite'ın silüetinden BİR KEZ yumuşak bir hale çizilir (2D canvas), doku
 * önbelleğe alınır ve sprite'ın arkasında sıradan bir görsel olarak durur: karede maliyeti tek bir dörtgen.
 *
 * Saf olmayan (Phaser + canvas) küçük modül; görünüm `CombatantView.setGlow` kullanır.
 */

export type GlowWidth = 'thin' | 'wide';

/** Hale ölçüleri (ekran pikseli, 1080 yükseklikte): `rim` dolu kenar, `r` yumuşak sönümün toplam genişliği. */
const SPEC: Record<GlowWidth, { r: number; rim: number; peak: number }> = {
  thin: { r: 5, rim: 1.5, peak: 1 },
  wide: { r: 12, rim: 2.5, peak: 1 },
};

export interface BakedGlow {
  key: string;
  /** Doku pikseli / kare pikseli. */
  s: number;
  /** Sprite kökeni (0.5, 1) ile hizalı dikey köken. */
  originY: number;
}

const cache = new Map<string, BakedGlow | null>();

/** Sprite'ın şu anki karesi için hale dokusu (yoksa pişirir; kaynak okunamazsa null). */
export function bakeGlow(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, width: GlowWidth): BakedGlow | null {
  const frame = sprite.frame;
  const scale = Math.abs(sprite.scaleX) || 1;
  // doku yoğunluğu: ekrandaki boy x render ölçeği (en çok 2); hale bulanık olduğu için daha fazlası gereksiz
  const dens = Math.max(1, Math.min(2, stageView.zoom));
  const s = Math.max(0.05, Math.min(1, scale * dens));
  const key = `glowfx:${frame.texture.key}#${frame.name}:${width}:${Math.round(s * 1000)}`;
  if (cache.has(key) && (cache.get(key) === null || scene.textures.exists(key))) return cache.get(key) ?? null;
  const baked = paint(scene, frame, width, s, dens, key);
  cache.set(key, baked);
  return baked;
}

function paint(scene: Phaser.Scene, frame: Phaser.Textures.Frame, width: GlowWidth, s: number, dens: number, key: string): BakedGlow | null {
  const src = frame.source?.image as CanvasImageSource | undefined;
  if (!src || typeof document === 'undefined') return null;
  const spec = SPEC[width];
  const R = spec.r * dens; // doku pikseli
  const rim = spec.rim * dens;
  const pad = Math.ceil(R + 2);
  const fd = (frame as unknown as { data?: { trim?: boolean; spriteSourceSize?: { x: number; y: number } } }).data;
  const trim = fd?.trim ? (fd.spriteSourceSize ?? null) : null;
  const realW = frame.realWidth;
  const realH = frame.realHeight;
  const w = Math.ceil(realW * s) + pad * 2;
  const h = Math.ceil(realH * s) + pad * 2;
  if (w > 2048 || h > 2048) return null;
  try {
    // 1) beyaz silüet
    const sil = document.createElement('canvas');
    sil.width = w;
    sil.height = h;
    const a = sil.getContext('2d');
    if (!a) return null;
    a.imageSmoothingEnabled = true;
    a.drawImage(src, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, pad + (trim?.x ?? 0) * s, pad + (trim?.y ?? 0) * s, frame.cutWidth * s, frame.cutHeight * s);
    a.globalCompositeOperation = 'source-in';
    a.fillStyle = '#ffffff';
    a.fillRect(0, 0, w, h);
    // 2) hale: silüet halkalar halinde kaydırılarak üst üste (dıştan içe, içe doğru koyulaşır); kenarda dolu ince çizgi
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const b = out.getContext('2d');
    if (!b) return null;
    const rings = Math.max(2, Math.round(R));
    for (let i = rings; i >= 1; i--) {
      const d = (i / rings) * R;
      const steps = Math.max(8, Math.round(d * 2.2));
      const t = d <= rim ? 1 : 1 - (d - rim) / Math.max(0.001, R - rim);
      b.globalAlpha = d <= rim ? spec.peak : Math.max(0.02, 0.28 * t * t * spec.peak);
      for (let k = 0; k < steps; k++) {
        const ang = (k / steps) * Math.PI * 2;
        b.drawImage(sil, Math.cos(ang) * d, Math.sin(ang) * d);
      }
    }
    // silüetin içi sprite'ın altında kalır; yine de yarı saydam pikseller kenarda renk saçmasın diye iç kısım boşaltılır
    b.globalAlpha = 1;
    b.globalCompositeOperation = 'destination-out';
    b.drawImage(sil, 0, 0);
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, out);
    return { key, s, originY: (pad + realH * s) / h };
  } catch {
    return null;
  }
}

/**
 * Sprite'ın arkasında, onu izleyen hale görseli (konum, ayna, kare, ölçek, görünürlük her karede kopyalanır; yalnızca parıltı açıkken).
 * `destroy()` görseli ve kare kancasını kaldırır.
 */
export class SpriteGlow {
  readonly img: Phaser.GameObjects.Image;
  private baked: BakedGlow | null = null;
  private frameId = '';
  private readonly sync = (): void => this.update();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sprite: Phaser.GameObjects.Sprite,
    container: Phaser.GameObjects.Container,
    color: number,
    private readonly width: GlowWidth,
  ) {
    this.img = scene.add.image(0, 0, '__DEFAULT').setTint(color).setVisible(false);
    container.addAt(this.img, Math.max(0, container.getIndex(sprite)));
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.sync);
    this.update();
  }

  private update(): void {
    const img = this.img;
    if (!img.active || !this.sprite.active) {
      this.destroy();
      return;
    }
    const f = this.sprite.frame;
    const id = `${f.texture.key}#${f.name}`;
    if (id !== this.frameId) {
      this.frameId = id;
      this.baked = bakeGlow(this.scene, this.sprite, this.width);
      if (this.baked) img.setTexture(this.baked.key).setOrigin(0.5, this.baked.originY);
    }
    if (!this.baked) {
      img.setVisible(false);
      return;
    }
    const sp = this.sprite;
    img.setPosition(sp.x, sp.y);
    img.setScale(sp.scaleX / this.baked.s, sp.scaleY / this.baked.s);
    img.setFlipX(sp.flipX);
    img.setVisible(sp.visible);
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.sync);
    if (this.img.active) {
      this.scene.tweens.killTweensOf(this.img);
      this.img.destroy();
    }
  }
}
