// Multiplayer takım seçiminin "hazır" sancakları (mockup: public/mockups/ready-state-v4.html#b2art).
// Sen Ready'e basınca sol (kırmızı/altın) sancaklar tepeden iner, rakip hazır olunca sağdakiler (mavi/gümüş) iner; ikisi hazırken
// sancaklar düz ve hareketsiz durur, sıcak ateş ışığı + tepeden ışık huzmesi belirir. Hazır bozulunca sancaklar yukarı sarılır.
// Dış (kenar) sancaklar büyük, iç (orta) sancaklar küçük. Azaltılmış harekette tüm geçişler anında.
import Phaser from 'phaser';
import playerUrl from '../../assets/ui/ready-banners/banner-player.webp?url';
import enemyUrl from '../../assets/ui/ready-banners/banner-enemy.webp?url';
import { BANNER_ASPECT, bannerState, bannerWidths } from './ready-banners-logic';
import { vGradient } from './elegant-ui';
import { reducedMotion } from '../ui/motion-pref';

export const BANNER_KEYS = { player: 'ready-banner-player', enemy: 'ready-banner-enemy' } as const;

export function preloadReadyBanners(scene: Phaser.Scene): void {
  if (!scene.textures.exists(BANNER_KEYS.player)) scene.load.image(BANNER_KEYS.player, playerUrl);
  if (!scene.textures.exists(BANNER_KEYS.enemy)) scene.load.image(BANNER_KEYS.enemy, enemyUrl);
}

interface Flag {
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  left: boolean;
  inner: boolean;
  r: number; // 0..1 inme oranı
  top: number;
  h: number;
  tw?: Phaser.Tweens.Tween;
}

export class ReadyBanners {
  private flags: Flag[] = [];
  private beam: Phaser.GameObjects.Graphics;
  private beamL = 0;
  private beamR = 0;
  private lit = 0;
  private st = { left: false, right: false, both: false };
  private beamTw?: Phaser.Tweens.Tween;

  constructor(private scene: Phaser.Scene, depth: number) {
    this.beam = scene.add.graphics().setDepth(depth - 1);
    const ok = scene.textures.exists(BANNER_KEYS.player) && scene.textures.exists(BANNER_KEYS.enemy);
    if (!ok) return; // eksik asset oyunu çökertmez: sancak yok
    for (const left of [true, false]) {
      for (const inner of [false, true]) {
        const key = left ? BANNER_KEYS.player : BANNER_KEYS.enemy;
        const glow = scene.add.image(0, 0, key).setOrigin(0.5, 0).setDepth(depth).setTint(0xff8a2a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
        const img = scene.add.image(0, 0, key).setOrigin(0.5, 0).setDepth(depth + 0.1);
        this.flags.push({ img, glow, left, inner, r: 0, top: 0, h: 0 });
      }
    }
  }

  /** x'ler dünya koordinatı: outerL/outerR dış sancak ortaları, innerL/innerR iç sancak ortaları. */
  layout(p: { outerL: number; outerR: number; innerL: number; innerR: number; margin: number; beamL: number; beamR: number }): void {
    const w = bannerWidths(p.margin);
    for (const f of this.flags) {
      const tw = f.inner ? w.inner : w.outer;
      f.h = tw * BANNER_ASPECT;
      const x = f.inner ? (f.left ? p.innerL : p.innerR) : f.left ? p.outerL : p.outerR;
      f.img.setPosition(x, f.top).setDisplaySize(tw, f.h);
      f.glow.setPosition(x, f.top).setDisplaySize(tw * 1.06, f.h * 1.03);
      this.apply(f);
    }
    this.beamL = p.beamL;
    this.beamR = p.beamR;
    this.drawBeam();
  }

  private apply(f: Flag): void {
    const r = f.r;
    f.img.setVisible(r > 0.001);
    f.glow.setVisible(r > 0.001 && this.lit > 0.01);
    if (r <= 0.001) return;
    const tex = f.img.texture.getSourceImage() as { width: number; height: number };
    const k = f.img.displayHeight / tex.height;
    const shift = (1 - r) * 0.14 * f.h; // mockup: kumaş iner gibi hafif kayar
    const cropY = shift / k;
    f.img.setCrop(0, cropY, tex.width, Math.min(tex.height - cropY, (r * f.h) / k));
    f.img.y = f.top - shift;
    f.glow.setCrop(0, cropY, tex.width, Math.min(tex.height - cropY, (r * f.h) / k));
    f.glow.y = f.top - shift;
    f.glow.setAlpha(this.lit * 0.5);
    f.img.setTint(0xffffff);
    if (this.lit > 0.01) f.img.setTint(Phaser.Display.Color.GetColor(255, Math.round(255 - 18 * this.lit), Math.round(255 - 60 * this.lit)));
  }

  private drawBeam(): void {
    const g = this.beam.clear();
    const draw = (cx: number, a: number) => {
      if (a < 0.01) return;
      const w = 170;
      // düz huzme (mockup'taki eğim yok: sancaklar gibi dik ve sakin)
      vGradient(g, cx - w / 2, 0, w, 700, 0xffaa46, [[0, 0.32 * a], [1, 0]]);
    };
    draw(this.beamL, this.beamLv);
    draw(this.beamR, this.beamRv);
  }
  private beamLv = 0;
  private beamRv = 0;

  /** Durumu uygula (yeniden çizim yok; geçişler yalnızca değişen sancakta oynar). */
  set(mine: boolean, opp: boolean): void {
    const next = bannerState(mine, opp);
    const rm = reducedMotion();
    for (const f of this.flags) {
      const on = f.left ? next.left : next.right;
      const was = f.left ? this.st.left : this.st.right;
      if (on === was && f.tw) continue;
      f.tw?.stop();
      const to = on ? 1 : 0;
      if (rm) {
        f.r = to;
        this.apply(f);
        continue;
      }
      f.tw = this.scene.tweens.add({
        targets: f,
        r: to,
        duration: on ? 1500 : 800,
        delay: on && f.inner ? 300 : 0,
        ease: on ? 'Cubic.easeOut' : 'Cubic.easeIn',
        onUpdate: () => this.apply(f),
        onComplete: () => this.apply(f),
      });
    }
    const beamTo = (left: boolean) => (next.both ? 1 : (left ? next.left : next.right) ? 0.35 : 0);
    const litTo = next.both ? 1 : 0;
    this.st = next;
    const tgt = { l: beamTo(true), r: beamTo(false), lit: litTo };
    this.beamTw?.stop();
    if (rm) {
      this.beamLv = tgt.l;
      this.beamRv = tgt.r;
      this.lit = tgt.lit;
      this.refreshAll();
      return;
    }
    const cur = { l: this.beamLv, r: this.beamRv, lit: this.lit };
    this.beamTw = this.scene.tweens.add({
      targets: cur,
      l: tgt.l,
      r: tgt.r,
      lit: tgt.lit,
      duration: 1000,
      onUpdate: () => {
        this.beamLv = cur.l;
        this.beamRv = cur.r;
        this.lit = cur.lit;
        this.refreshAll();
      },
    });
  }

  private refreshAll(): void {
    this.drawBeam();
    for (const f of this.flags) this.apply(f);
  }

  destroy(): void {
    this.beamTw?.stop();
    for (const f of this.flags) {
      f.tw?.stop();
      f.img.destroy();
      f.glow.destroy();
    }
    this.beam.destroy();
    this.flags = [];
  }
}
