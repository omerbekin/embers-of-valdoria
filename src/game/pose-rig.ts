/**
 * Poz kütüphanesi - Phaser tarafı (src/game/poses.ts saf kuralları kullanır): pozlu sınıfın gövde pozlarını ve silah görsellerini TEMBEL
 * yükler (yalnızca savaşta o sınıf varsa), her (sınıf, silah görünümü) için gövde + silah birleşimini tek bir canvas atlasına PİŞİRİR.
 *
 *  - Kare başına bir poz; her kare kendi sınır kutusuna kırpılır (bellek), Phaser "trim" bilgisiyle hepsi aynı gerçek boyda görünür:
 *    ayak ortası karenin alt-ortası, sprite kökeni (0.5, 1) bugünkü gibi. Böylece hedefleme parıltısı (sprite-glow), hayalet izleri
 *    (afterimage), vuruş beyaz parlaması (tint) ve düşman tarafı aynası silah dahil kendiliğinden çalışır.
 *  - Çözünürlük: pişirme yoğunluğu = ekrandaki boy x render ölçeği (en çok 2, en çok 1:1 kaynak). Yoğunluk <= 0,5 ya da Performance mode
 *    açıkken yarı boy (small/) dosyalar iner; kaynak dokular pişirmeden sonra da önbellekte kalır (aynı savaşta başka silah gelirse).
 */
import Phaser from 'phaser';
import layout from '../../data/battle-layout.json';
import { perfLite } from '../ui/perf-mode';
import { stageView } from './stage-view';
import { poseBodyUrl, weaponUrl } from './pose-files';
import { GLOW_PAD, POSES, drawPoseComposite, frameExtent, gripFrames, poseBounds, poseClass, poseClassIds, poseOwner, weaponKey, type PoseClassDef, type WeaponPick } from './poses';

const bodyKey = (dir: string, pose: string, small: boolean) => `posebody:${dir}:${pose}${small ? ':s' : ''}`;
const weaponTex = (family: string, look: string, small: boolean) => `poseweapon:${family}:${look}${small ? ':s' : ''}`;

/** Ekrandaki ölçek (gövde tuvali pikseli -> oyun birimi): figür spriteBox yüksekliğinin `heightFit` katı. */
export const poseDisplayScale = (def: PoseClassDef, spriteScale = 1): number => ((layout.spriteBox.height * def.heightFit) / def.figure.h) * spriteScale;

/** Pişirme yoğunluğu (doku pikseli / gövde tuvali pikseli). */
function density(def: PoseClassDef, spriteScale = 1): number {
  const dens = Math.max(1, Math.min(2, stageView.zoom));
  return Math.min(1, poseDisplayScale(def, spriteScale) * dens);
}
const useSmall = (def: PoseClassDef): boolean => perfLite() || density(def) <= 0.5;

/**
 * preload() içinde: verilen sınıflardan pozu olanların gövde pozlarını ve silah görsellerini kuyruğa ekler (dokusu olan atlanır).
 * `classIds` verilmezse tüm pozlu sınıflar (rastgele takımlı Quick Battle: takım preload'da henüz belli değil). Dönen: kuyruğa giren dosya.
 */
export function preloadPoses(scene: Phaser.Scene, classIds: readonly string[] = poseClassIds()): number {
  let n = 0;
  const add = (key: string, url: string | null) => {
    if (!url || scene.textures.exists(key)) return;
    scene.load.image(key, url);
    n++;
  };
  const wanted = classIds.filter((c, i) => classIds.indexOf(c) === i && poseClass(c));
  if (!wanted.length) return 0;
  let small = false;
  for (const id of wanted) {
    const def = poseClass(id)!;
    small ||= useSmall(def);
    for (const pose of Object.keys(def.poses)) add(bodyKey(def.dir, pose, useSmall(def)), poseBodyUrl(def.dir, pose, useSmall(def)));
  }
  for (const [family, f] of Object.entries(POSES.weapons)) for (const look of f.order) add(weaponTex(family, look, small), weaponUrl(family, look, small));
  return n;
}

/** Bu sınıfın tüm gövde pozları ve verilen silahın görseli yüklü mü (değilse görünüm bugünkü tek sprite'a düşer). */
function sources(scene: Phaser.Scene, def: PoseClassDef, pick: WeaponPick | null): { body: (pose: string) => CanvasImageSource; weapon: CanvasImageSource | null; off: CanvasImageSource | null } | null {
  const small = useSmall(def);
  const find = (big: string, sm: string) => (scene.textures.exists(small ? sm : big) ? (small ? sm : big) : scene.textures.exists(small ? big : sm) ? (small ? big : sm) : null);
  const keys: Record<string, string> = {};
  for (const pose of gripFrames(def, pick?.grip)) {
    const k = find(bodyKey(def.dir, pose, false), bodyKey(def.dir, pose, true));
    if (!k) return null;
    keys[pose] = k;
  }
  const tex = (family: string, look: string): CanvasImageSource | null => {
    const wk = find(weaponTex(family, look, false), weaponTex(family, look, true));
    return wk ? (scene.textures.get(wk).getSourceImage() as CanvasImageSource) : null;
  };
  const weapon = pick ? tex(pick.family, pick.look) : null;
  const off = pick?.offhand ? tex(pick.offhand.family, pick.offhand.look) : null; // ikinci el (kalkan / hançer)
  return { body: (pose) => scene.textures.get(keys[pose]!).getSourceImage() as CanvasImageSource, weapon, off };
}

export interface PoseTexture {
  key: string;
  /** Doku pikseli / gövde tuvali pikseli. */
  density: number;
  /** Kare gerçek boyu (doku pikseli). */
  realW: number;
  realH: number;
}

/**
 * (sınıf, silah) birleşim atlası: varsa önbellekten, yoksa pişirir. Kaynak dosyalar yüklenmemişse null (çağıran bugünkü sprite'ta kalır).
 * Kare adları = poz adları.
 */
export function bakePoseTexture(scene: Phaser.Scene, classId: string, pick: WeaponPick | null, spriteScale = 1): PoseTexture | null {
  const def = poseClass(classId);
  if (!def || typeof document === 'undefined') return null;
  const s = density(def, spriteScale);
  const key = `pose:${poseOwner(classId)}:${pick ? weaponKey(pick) : 'none'}:${Math.round(s * 100)}`; // takma adlı sınıf asıl sahibin atlasını paylaşır
  const { halfW, up } = frameExtent(def, pick);
  const realW = Math.ceil(halfW * 2 * s);
  const realH = Math.ceil(up * s);
  if (scene.textures.exists(key)) return { key, density: s, realW, realH };
  const src = sources(scene, def, pick);
  if (!src) return null;
  const fx0 = def.canvas.footX - halfW;
  const fy0 = def.canvas.footY - up;
  // kareler: her poz kendi kutusunda (gerçek karenin içine kırpılmış), raf (shelf) yerleşimi
  const items = gripFrames(def, pick?.grip).map((name) => {
    const b = poseBounds(def, name, pick);
    const x0 = Math.max(fx0, Math.floor(b.x0));
    const y0 = Math.max(fy0, Math.floor(b.y0));
    const x1 = Math.min(fx0 + halfW * 2, Math.ceil(b.x1));
    const y1 = Math.min(def.canvas.footY, Math.ceil(b.y1));
    return { name, x0, y0, w: Math.max(1, Math.ceil((x1 - x0) * s)), h: Math.max(1, Math.ceil((y1 - y0) * s)), px: 0, py: 0 };
  });
  const maxW = Math.min(4096, Math.max(1024, ...items.map((i) => i.w)));
  let x = 0;
  let y = 0;
  let row = 0;
  for (const it of items) {
    if (x + it.w > maxW) {
      x = 0;
      y += row + 2;
      row = 0;
    }
    it.px = x;
    it.py = y;
    x += it.w + 2;
    row = Math.max(row, it.h);
  }
  const W = Math.max(...items.map((i) => i.px + i.w));
  const H = y + row;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const glowPx = Math.max(2, GLOW_PAD * s * 0.6);
  for (const it of items) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(it.px, it.py, it.w, it.h);
    ctx.clip();
    ctx.setTransform(s, 0, 0, s, it.px - it.x0 * s, it.py - it.y0 * s);
    drawPoseComposite(ctx, def, it.name, src.body(it.name), src.weapon && pick ? { img: src.weapon, pick, offImg: src.off } : null, glowPx);
    ctx.restore();
  }
  const tex = scene.textures.addCanvas(key, canvas);
  if (!tex) return null;
  for (const it of items) {
    const f = tex.add(it.name, 0, it.px, it.py, it.w, it.h);
    f?.setTrim(realW, realH, Math.round((it.x0 - fx0) * s), Math.round((it.y0 - fy0) * s), it.w, it.h);
  }
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return { key, density: s, realW, realH };
}
