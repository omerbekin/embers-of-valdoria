/**
 * Poz kütüphanesi - Phaser tarafı (src/game/poses.ts saf kuralları kullanır): pozlu sınıfın gövde pozlarını ve silah görsellerini TEMBEL
 * yükler (yalnızca savaşta o sınıf varsa; yalnızca silahının tutuş takımı ve takılı silah görseli), her (sınıf, silah görünümü) için gövde +
 * silah birleşimini tek bir canvas atlasına PİŞİRİR. Dosyalar PNG asılların WebP kopyaları (src/game/pose-files.ts).
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
import './pose-mode'; // gerçek sınıfların çizimi (v2 / debug v1): kayıtlı seçim pozlu birimler kurulmadan uygulanır
import { texturesInUse } from './assets';
import { GLOW_PAD, POSES, drawPoseComposite, frameExtent, gripFrames, isReleasablePoseTexture, pixelsBlank, poseBounds, poseClass, poseClassIds, poseOwner, toneImageData, weaponKey, type PoseClassDef, type WeaponPick } from './poses';

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

/** Bir birimin poz ihtiyacı: sınıfı ve çizilecek silahı (BattleScene birimin silahını preload'da bilir: `unitWeaponPick`). */
export interface PoseNeed {
  classId: string;
  pick: WeaponPick | null;
}

/**
 * preload() içinde: pozlu birimlerin YALNIZCA gerekenlerini kuyruğa ekler (dokusu olan atlanır): her birimin silahının tutuş takımındaki
 * gövde kareleri (`gripFrames`: atlas tam olarak bunları pişirir; ör. çift el baltalı Warrior'da tek el kareleri inmez) ve yalnızca
 * takılı silah / ikinci el görselleri. Eskiden her sınıfın tüm pozları ve TÜM silahlar iniyordu (8 sınıflı Quick Battle ~16 MB; Ömer
 * 2026-10-17 yükleme performansı). Sınıf listesi (string) verilirse sınıfın varsayılan silahı. Dönen: kuyruğa giren dosya.
 */
export function preloadPoses(scene: Phaser.Scene, needs: readonly (PoseNeed | string)[] = poseClassIds()): number {
  let n = 0;
  const add = (key: string, url: string | null) => {
    if (!url || scene.textures.exists(key)) return;
    scene.load.image(key, url);
    n++;
  };
  for (const need of needs) {
    const { classId, pick } = typeof need === 'string' ? { classId: need, pick: poseClass(need)?.defaultWeapon ?? null } : need;
    const def = poseClass(classId);
    if (!def) continue;
    const small = useSmall(def);
    for (const pose of gripFrames(def, pick?.grip)) add(bodyKey(def.dir, pose, small), poseBodyUrl(def.dir, pose, small));
    for (const w of pick ? [pick, ...(pick.offhand ? [pick.offhand] : [])] : []) add(weaponTex(w.family, w.look, small), weaponUrl(w.family, w.look, small));
  }
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
  const tex = (family: string, look: string, tone?: string): CanvasImageSource | null => {
    const wk = find(weaponTex(family, look, false), weaponTex(family, look, true));
    const img = wk ? (scene.textures.get(wk).getSourceImage() as CanvasImageSource) : null;
    return img && tone ? toned(wk!, img, tone) : img;
  };
  const weapon = pick ? tex(pick.family, pick.look, pick.tone) : null;
  const off = pick?.offhand ? tex(pick.offhand.family, pick.offhand.look, pick.offhand.tone) : null; // ikinci el (kalkan / hançer)
  return { body: (pose) => scene.textures.get(keys[pose]!).getSourceImage() as CanvasImageSource, weapon, off };
}

/** Tonlanmış silah kaynakları ('<doku>~<ton>' -> tuval): pişirmede kaynak; releasePoseSources bırakır. */
const tonedCache = new Map<string, HTMLCanvasElement>();

/**
 * Silah çiziminin nadirlik tonlu kopyası (data/poses.json > rarityTone; taban başına tek çizim, Ömer 2026-10-17). Tuval / piksel okunamazsa
 * (bellek, güvenlik) çizimin kendisi: ton yalnızca görünüş, hiçbir şey bozulmaz.
 */
function toned(texKey: string, img: CanvasImageSource, tone: string): CanvasImageSource {
  const t = POSES.rarityTone?.[tone];
  if (!t) return img;
  const key = `${texKey}~${tone}`;
  const hit = tonedCache.get(key);
  if (hit) return hit;
  const w = (img as HTMLImageElement).naturalWidth || (img as { width: number }).width;
  const h = (img as HTMLImageElement).naturalHeight || (img as { height: number }).height;
  if (!w || !h) return img;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  try {
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('no ctx');
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    toneImageData(data.data, t);
    ctx.putImageData(data, 0, 0);
  } catch {
    freeCanvas(c);
    return img;
  }
  tonedCache.set(key, c);
  return c;
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
  if (!src) return bakedAtOtherDensity(scene, key, halfW, up); // kaynaklar bırakıldıysa (releasePoseSources) aynı atlasın başka yoğunluğu
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
  let canvas = paintAtlas(W, H, items, s, def, pick, src);
  if (!canvas) {
    // tuval belleği dolu (telefon): ekranda olmayan hale dokularını bırakıp bir kez daha dene; yine olmazsa bugünkü sprite
    releasePoseTextures(scene);
    canvas = paintAtlas(W, H, items, s, def, pick, src);
    if (!canvas) return null;
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

/**
 * Aynı (sınıf, silah) atlasının başka yoğunlukta pişmiş hali (ör. ekran boyu değiştikten sonra çağrılan birim; kaynak gövdeler savaş kurulunca
 * bırakılmıştır): yoğunluk anahtardan okunur, ölçek çağıranda `display / density` ile düzelir. Yoksa null.
 */
function bakedAtOtherDensity(scene: Phaser.Scene, key: string, halfW: number, up: number): PoseTexture | null {
  const prefix = key.slice(0, key.lastIndexOf(':') + 1);
  const other = scene.textures.getTextureKeys().find((k) => k.startsWith(prefix) && /^\d+$/.test(k.slice(prefix.length)));
  if (!other) return null;
  const d = Number(other.slice(prefix.length)) / 100;
  return { key: other, density: d, realW: Math.ceil(halfW * 2 * d), realH: Math.ceil(up * d) };
}

/**
 * Savaş kurulunca (tüm birimlerin atlası pişti): gövde pozu ve silah KAYNAK dokularını bırakır (telefon belleği; 4 pozlu sınıfta ~25-35 MB).
 * Yalnızca pişirmede kaynak olarak kullanılırlar; sonraki savaşın preload'u yeniden yükler, bu savaşta yeniden pişirme gerekirse
 * `ensurePoseSources` tembel yükler (debug silah değiştirme), çağrılan birim önce aynı atlasın başka yoğunluğuna düşer. Dönen: atılan sayı.
 */
export function releasePoseSources(scene: Phaser.Scene): number {
  const inUse = texturesInUse(scene.game);
  let n = 0;
  for (const key of scene.textures.getTextureKeys()) {
    if (inUse.has(key) || !(key.startsWith('posebody:') || key.startsWith('poseweapon:'))) continue;
    scene.textures.remove(key);
    n++;
  }
  for (const c of tonedCache.values()) freeCanvas(c);
  tonedCache.clear();
  return n;
}

/** Bu birimlerin (sınıf + silah) kaynak dokuları eksikse çalışan sahnede yükler (en çok `timeout` ms bekler; dosya inmezse çağıran eski görünümde kalır). */
export function ensurePoseSources(scene: Phaser.Scene, needs: readonly (PoseNeed | string)[], timeout = 6000): Promise<void> {
  if (preloadPoses(scene, needs) === 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    scene.load.once(Phaser.Loader.Events.COMPLETE, finish);
    scene.time.delayedCall(timeout, finish);
    if (!scene.load.isLoading()) scene.load.start();
  });
}

interface AtlasItem {
  name: string;
  x0: number;
  y0: number;
  w: number;
  h: number;
  px: number;
  py: number;
}

/** Tuvali kurar ve kareleri çizer. Bağlam alınamazsa ya da çizim boş kaldıysa (tuval bellek sınırı) tuvali bırakıp null. */
function paintAtlas(W: number, H: number, items: readonly AtlasItem[], s: number, def: PoseClassDef, pick: WeaponPick | null, src: NonNullable<ReturnType<typeof sources>>): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const fail = (): null => {
    freeCanvas(canvas);
    return null;
  };
  const ctx = canvas.getContext('2d');
  if (!ctx) return fail();
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
  // Boş kare denetimi: tarayıcı tuval bellek sınırını aşınca bağlam verir ama çizmez (iOS Safari) -> saydam (görünmez) birim olmasın
  const first = items[0];
  if (first) {
    try {
      if (pixelsBlank(ctx.getImageData(first.px, first.py, first.w, first.h).data, 3)) return fail();
    } catch {
      return fail();
    }
  }
  return canvas;
}

/** Tuvalin arka belleğini hemen bırakır (iOS Safari tuval belleğini çöp toplamayı beklemeden geri alır). */
function freeCanvas(img: unknown): void {
  if (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) {
    img.width = 0;
    img.height = 0;
  }
}

/**
 * Hiçbir açık sahnenin göstermediği hale dokularını (`atlases` / `keepBodies` ile pişmiş atlasları / başka sınıfların gövde pozlarını da) atar ve
 * tuvallerini bırakır. Atlaslar her (sınıf, silah) için ayrı ve oturum boyunca birikiyordu: telefonda bellek dolunca yeni pişen atlas boş
 * kalıyordu (ayna savaşta aynı sınıfın farklı silahlı kopyası görünmezdi). Gerekince yeniden pişer / preload yeniden yükler. Dönen: atılan sayı.
 * `atlases` / `keepBodies` yalnızca yeni savaşın preload'unda (önceki savaşın birimleri yokken): `releaseForBattle`.
 */
export function releasePoseTextures(scene: Phaser.Scene, opts: { atlases?: boolean; keepBodies?: ReadonlySet<string> } = {}): number {
  const inUse = texturesInUse(scene.game);
  let n = 0;
  for (const key of scene.textures.getTextureKeys()) {
    if (!isReleasablePoseTexture(key, inUse, opts)) continue;
    const img = scene.textures.get(key).getSourceImage();
    scene.textures.remove(key);
    freeCanvas(img); // atlas / hale tuvali (kaynak görseller <img>: dokunulmaz)
    n++;
  }
  return n;
}

/**
 * Yeni savaşın preload'unda (preloadPoses'tan önce): önceki savaşların atlaslarını ve hale dokularını, ayrıca bu savaşta olmayan sınıfların
 * gövde pozlarını bırakır. `classIds` verilmezse (rastgele takım) gövde pozları tutulur.
 */
export function releaseForBattle(scene: Phaser.Scene, classIds?: readonly string[]): number {
  const keepBodies = classIds ? new Set(classIds.map((c) => poseClass(c)?.dir).filter((d): d is string => !!d)) : undefined;
  return releasePoseTextures(scene, { atlases: true, keepBodies });
}
