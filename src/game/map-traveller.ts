/**
 * Haritadaki kafile lideri (Ömer 2026-10-19, mockup map-traveller-v3 "W4"): lider tek bekleme pozuyla (assets/poses/<sınıf>-v2 idle1) yolda
 * kayar; adım ritminde hafifçe iner-kalkar (~2.8 px), her ayak basışında küçük toz çıkar; adım pozu döngüsü YOK. Elinde kısa direkte küçük,
 * sabit, çatallı kırmızı-altın flama (F1) taşır: asla dalgalanmaz, yön değişince hep liderin arkasında kalır, yazı yok. Dinlenirken bekleme
 * pozu, flama sabit, sekme yok. Azaltılmış harekette sekme ve toz yok. Poz dosyası yoksa / inmediyse eski tek sprite'a düşer.
 */
import Phaser from 'phaser';
import { characterTexture } from './assets';
import { poseBodyUrl } from './pose-files';
import { poseClass } from './poses';
import { travelGait } from './map-traveller-gait';
import { reducedMotion } from '../ui/motion-pref';

/** Liderin ekran boyu (harita birimi; eskiden 96 idi). */
const LEAD_H = 92;
/** Flama eli: liderin önünde (poz tuvalinden bağımsız sabit sapma). */
const HAND_X = 15;

export class MapTraveller {
  readonly root: Phaser.GameObjects.Container;
  private img: Phaser.GameObjects.Image;
  private pen: Phaser.GameObjects.Container;
  private penArt: Phaser.GameObjects.Graphics;
  private flip: 1 | -1 = 1;
  private lastStep = 0;
  private dead = false;

  constructor(private scene: Phaser.Scene, private world: Phaser.GameObjects.Container, classId: string, spriteId: string, color: string, x: number, y: number) {
    const shadow = scene.add.ellipse(-4, 2, 72, 14, 0x000000, 0.4);
    const tex = characterTexture(scene, spriteId, color);
    this.img = scene.add.image(0, 0, tex.key, tex.real && scene.textures.get(tex.key).has('0') ? '0' : undefined).setOrigin(0.5, 1);
    this.img.setScale(96 / this.img.height);
    this.penArt = scene.add.graphics();
    this.drawPennant(this.penArt);
    this.pen = scene.add.container(HAND_X, 0, [this.penArt]);
    this.root = scene.add.container(x, y, [shadow, this.img, this.pen]);
    world.add(this.root);
    this.setFlip(1);
    this.loadPose(classId);
    scene.events.once('shutdown', () => (this.dead = true));
  }

  /** Bekleme pozu inince eski sprite'ın yerine geçer (inmezse / dosya yoksa eski görünüm kalır). */
  private loadPose(classId: string): void {
    const def = poseClass(classId);
    if (!def) return;
    const small = !!poseBodyUrl(def.dir, 'idle1', true);
    const url = poseBodyUrl(def.dir, 'idle1', small);
    if (!url) return;
    const key = `maptrav:${def.dir}:${small ? 's' : 'f'}`;
    const apply = () => {
      if (this.dead || !this.img.scene || !this.scene.textures.exists(key)) return;
      this.img.setTexture(key);
      const k = LEAD_H / def.figure.h;
      this.img.setOrigin(def.canvas.footX / def.canvas.w, def.canvas.footY / def.canvas.h);
      this.img.setDisplaySize(def.canvas.w * k, def.canvas.h * k);
    };
    if (this.scene.textures.exists(key)) return apply();
    this.scene.load.once(`filecomplete-image-${key}`, apply);
    this.scene.load.image(key, url);
    if (!this.scene.load.isLoading()) this.scene.load.start();
  }

  /** Kısa direk + küçük çatallı flama (sabit; yerel koordinat: ayak orijin, flama sağa doğru, yön tersse kapsayıcı aynalanır). */
  private drawPennant(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(4.4, 0x1d1209, 1);
    g.lineBetween(0, 3, 0, -142);
    g.lineStyle(1.2, 0x8a6a3a, 0.75);
    g.lineBetween(-1, -1, -1, -140);
    g.fillStyle(0x85281a, 1);
    g.lineStyle(1.4, 0xe8c47e, 1);
    const cloth = [
      { x: 0, y: -139 }, { x: 22, y: -136.6 }, { x: 46, y: -133 }, { x: 38, y: -126 }, { x: 46, y: -119 }, { x: 22, y: -120.6 }, { x: 0, y: -117 },
    ];
    g.fillPoints(cloth, true);
    g.strokePoints(cloth, true);
    g.fillStyle(0xf3d999, 1);
    g.fillCircle(12, -128, 2.6);
    const finial = [{ x: 0, y: -142 }, { x: -5, y: -137 }, { x: 0, y: -154 }, { x: 5, y: -137 }];
    g.fillStyle(0xe8c47e, 1);
    g.fillPoints(finial, true);
    g.lineStyle(1, 0x6b4a14, 1);
    g.strokePoints(finial, true);
  }

  /** Yön: 1 = sağa, -1 = sola. Flama her zaman liderin arkasında, yazı yok (ayna sorunu yok). */
  private setFlip(f: 1 | -1): void {
    this.flip = f;
    this.img.setFlipX(f < 0);
    this.pen.x = f * HAND_X;
    this.penArt.scaleX = f > 0 ? -1 : 1;
  }

  facing(): 1 | -1 {
    return this.flip;
  }

  /** Konumla (ayak noktası). `moved` = yürünen yol (px; yalnızca yürürken), `walking` = yolda mı. */
  place(x: number, y: number, face: 1 | -1, walking: boolean, moved: number): void {
    if (this.dead) return;
    this.root.setPosition(x, y);
    if (face !== this.flip) this.setFlip(face);
    let bob = 0;
    if (walking && !reducedMotion()) {
      const g = travelGait(moved);
      bob = g.bob;
      if (g.step !== this.lastStep) this.puff(x - this.flip * 10, y);
      this.lastStep = g.step;
    }
    this.img.y = bob;
    this.pen.y = bob;
  }

  /** Ayak basışında küçük toz (azaltılmış harekette yok). */
  private puff(x: number, y: number): void {
    if (reducedMotion()) return;
    for (let i = 0; i < 2; i++) {
      const c = this.scene.add.circle(x + (Math.random() - 0.5) * 8, y - 1, (2 + Math.random() * 2.4) * 0.7, 0xe4d2ac, 0.6);
      this.world.add(c);
      this.world.moveBelow(c as Phaser.GameObjects.GameObject, this.root);
      this.scene.tweens.add({ targets: c, scale: 2.4, alpha: 0, y: c.y - 7, x: c.x - this.flip * 5, duration: 420, ease: 'Sine.easeOut', onComplete: () => c.destroy() });
    }
  }

  destroy(): void {
    this.root.destroy();
  }
}
