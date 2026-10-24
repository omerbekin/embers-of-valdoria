/**
 * SPRITE SHEET efektleri (Phaser tarafı): assets/vfx/<sahip>/<NN-ad>.png dosyalarını Phaser spritesheet'i olarak yükler, kare
 * animasyonlarını kaydeder ve sahneye "oynayan sprite" koyar. v2 efektleri bunu `k.sheet(...)` ile kullanır (src/game/vfx-versions.ts).
 *
 *  - Yükleme: BattleScene.preload `preloadVfxSheets` (yalnızca sahnedeki sahiplerin sheet'leri; diğerleri bırakılır: telefon belleği);
 *    yüklenmemişse `ensureVfxSheets` efekt başında tembel yükler.
 *  - Keskinlik: doku NEAREST filtreyle çizilir (pixel art).
 *  - Hız: sheet'in fps'i `slow()` ile skillSlowdown'a uyar (efektin geri kalanıyla aynı yavaşlık); `fps` seçeneği bunu ezer.
 *  - Kare alt kümesi: `frames: [1, 2, 3]` yalnızca o kareleri sırayla oynar; `frame: 3` animasyonsuz tek kare.
 *  - Sprite animasyon bitince kendini yok eder (`keep: true` değilse); `loop: true` döngü (çağıran yok eder).
 */
import Phaser from 'phaser';
import { slow } from './combatant-view';
import { VFX_SHEET_FILES, vfxSheetFile } from './vfx-sheet-files';
import { buildInbetween, stabilizeFrames, trimFrames, type StabilizeOpts } from './vfx-inbetween';

export const vfxSheetKey = (id: string): string => `vfxsheet:${id}`;

const frameSize = (id: string): [number, number] => vfxSheetFile(id)?.meta.frame_size ?? [256, 256];

/** preload() içinde: (verilen ya da tüm) sheet'leri kuyruğa ekler; dokusu olan atlanır. */
export function preloadVfxSheets(scene: Phaser.Scene, ids: readonly string[] = VFX_SHEET_FILES.map((f) => f.id)): number {
  let n = 0;
  for (const id of ids) {
    const f = vfxSheetFile(id);
    if (!f || scene.textures.exists(vfxSheetKey(id))) continue;
    const [fw, fh] = f.meta.frame_size;
    scene.load.spritesheet(vfxSheetKey(id), f.url, { frameWidth: fw, frameHeight: fh, endFrame: f.meta.frames - 1 });
    n++;
  }
  return n;
}

/** Eksik sheet'leri çalışan sahnede yükler (en çok `timeout` ms bekler; yüklenemeyen sheet efekti sessizce atlanır). */
export function ensureVfxSheets(scene: Phaser.Scene, ids: readonly string[], timeout = 4000): Promise<void> {
  const missing = ids.filter((id) => vfxSheetFile(id) && !scene.textures.exists(vfxSheetKey(id)));
  if (!missing.length) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    preloadVfxSheets(scene, missing);
    scene.load.once(Phaser.Loader.Events.COMPLETE, finish);
    scene.time.delayedCall(timeout, finish);
    if (!scene.load.isLoading()) scene.load.start();
  });
}

/** Kare listesine göre animasyon anahtarı (yoksa kaydeder). */
function animFor(scene: Phaser.Scene, id: string, frames: readonly number[] | undefined): string {
  const f = vfxSheetFile(id)!;
  const list = frames ?? Array.from({ length: f.meta.frames }, (_, i) => i);
  const key = `${vfxSheetKey(id)}#${list.join(',')}`;
  if (!scene.anims.exists(key)) scene.anims.create({ key, frames: list.map((frame) => ({ key: vfxSheetKey(id), frame })), frameRate: f.meta.fps, repeat: 0 });
  return key;
}

/** Ara kareli dokunun tüm kareleri için animasyon anahtarı. */
function ibAnim(scene: Phaser.Scene, texKey: string, count: number, start = 0): string {
  const key = start ? `${texKey}#from${start}` : `${texKey}#all`;
  if (!scene.anims.exists(key)) scene.anims.create({ key, frames: Array.from({ length: count - start }, (_, i) => ({ key: texKey, frame: start + i })), frameRate: 12, repeat: 0 });
  return key;
}

export interface SheetOpts {
  /** Karenin ekrandaki kenar uzunluğu (256'lık kare bu boyuta ölçeklenir; içerik karenin ~%40-80'i). Varsayılan 256. */
  size?: number;
  /** Dikey ölçek çarpanı (zemin perspektifi için basık: 0,5 gibi). */
  squashY?: number;
  /**
   * Zemin eğimi (EKRANDA yatay px / dikey px; + = aşağı inince sağa): desen zemin düzlemine yatar, derinlik ekseni dikey değil yuva ızgarasının
   * çaprazını izler (battle-layout.json yuvaları: ~±1,03). squashY dikey bileşen olarak uygulanır. Phaser sprite'ı kaydırma (shear) bilmediği
   * için kareler bir kez türev dokuya pişirilir (içerik %50 geniş kareye); flipX'te eğim aynalanır, yani değer her zaman ekran yönüdür.
   */
  groundTilt?: number;
  /** Sabit kare (animasyonsuz). */
  frame?: number;
  /** Oynanacak kareler (varsayılan hepsi). */
  frames?: number[];
  /** Saniyedeki kare (varsayılan: sheet fps'i; ikisi de slow() ile yavaşlar). */
  fps?: number;
  /** Döngü (çağıran yok eder). */
  loop?: boolean;
  /** Animasyon bitince yok etme (son karede kalır). */
  keep?: boolean;
  depth?: number;
  /** Doku içindeki dayanak noktası (0..1); varsayılan sheet pivotu (orta). Zemine oturan efektlerde alt kenar. */
  origin?: [number, number];
  flipX?: boolean;
  rotation?: number;
  alpha?: number;
  tint?: number;
  blend?: Phaser.BlendModes;
  /** Başlangıç gecikmesi (ms, slow() ile): sprite o ana kadar görünmez. */
  delay?: number;
  /** Kodla ara kare (src/game/vfx-inbetween.ts; varsayılan YOK = asıl kareler): kare sayısı ve fps `sub` kat (süre aynı). */
  inbetween?: { method: string; sub: number };
  /** Kare hizalama (src/game/vfx-inbetween.ts > stabilizeFrames; mob efektleri: mob-vfx.ts): kareler vuruş karesinin yerine oturur. Yoksa asıl kareler. */
  stabilize?: StabilizeOpts;
  /** Animasyon bu (asıl) kareden başlar (varsayılan 0). */
  from?: number;
  /** Her karenin kenarından bu kadar piksel silinir (256'lık kare pikseli): sheet'e çizili dikdörtgen çerçeve (Ember Toss). Yoksa kare aynen. */
  trim?: number;
}

/** Türev dokunun en geniş kenarı (px): kareler bu genişliği aşınca alt satıra geçer. */
const DERIVED_MAX_W = 4096;

/** Türev doku (asıl dokudan bir kez üretilir): kare hizalama ve/ya da kodla ara kare; üretilemezse null (asıl kareler oynar). */
function derivedKey(scene: Phaser.Scene, id: string, ib: { method: string; sub: number } | null, st: StabilizeOpts | undefined, tilt?: { shear: number; squash: number }, trim = 0): string | null {
  const src = vfxSheetKey(id);
  const key = `${src}#d:${ib ? `${ib.method}:${ib.sub}` : '-'}:${st ? JSON.stringify(st) : '-'}:${tilt ? `t${tilt.shear.toFixed(3)}/${tilt.squash}` : '-'}:${trim ? `m${trim}` : '-'}`;
  if (scene.textures.exists(key)) return key;
  try {
    const f = vfxSheetFile(id)!;
    const [fw, fh] = f.meta.frame_size;
    const tex = scene.textures.get(src);
    let frames: HTMLCanvasElement[] = [];
    for (let i = 0; i < f.meta.frames; i++) {
      const fr = tex.get(i);
      const c = document.createElement('canvas');
      c.width = fw;
      c.height = fh;
      c.getContext('2d')!.drawImage(fr.source.image as CanvasImageSource, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0, 0, fw, fh);
      frames.push(c);
    }
    if (trim > 0) frames = trimFrames(frames, trim);
    if (st) frames = stabilizeFrames(frames, st);
    let out = ib ? buildInbetween(frames, ib.method, ib.sub) : frames;
    // zemin eğimi: kare ortasına göre dikey basıklık + yatay kaydırma (x' = x + shear * (y - ortası)); kare genişliği %50 büyür (taşmasın)
    const ow = tilt ? Math.round(fw * 1.5) : fw;
    if (tilt)
      out = out.map((src) => {
        const c = document.createElement('canvas');
        c.width = ow;
        c.height = fh;
        const cx = c.getContext('2d')!;
        cx.imageSmoothingEnabled = false;
        // kaynak (u, v) -> y' = ortası + (v - ortası) * basıklık; x' = ortası + (u - ortası) + shear * (y' - ortası)
        const sq = tilt.squash;
        cx.setTransform(1, 0, tilt.shear * sq, sq, ow / 2 - fw / 2 - (tilt.shear * sq * fh) / 2, (fh * (1 - sq)) / 2);
        cx.drawImage(src, 0, 0);
        return c;
      });
    // kareler ızgarada (en çok DERIVED_MAX_W px genişlik: 5x ara kareli 40 kare tek satırda 10240 px olurdu; telefon GPU'ları 4096-8192'de keser)
    const cols = Math.max(1, Math.min(out.length, Math.floor(DERIVED_MAX_W / ow)));
    const rows = Math.ceil(out.length / cols);
    const ct = scene.textures.createCanvas(key, ow * cols, fh * rows);
    if (!ct) return null;
    out.forEach((c, i) => {
      const gx = (i % cols) * ow;
      const gy = Math.floor(i / cols) * fh;
      ct.context.drawImage(c, gx, gy);
      ct.add(i, 0, gx, gy, ow, fh);
    });
    ct.refresh();
    ct.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return key;
  } catch {
    return null;
  }
}

/**
 * Sahneye oynayan bir sheet sprite'ı koyar; doku yoksa null (efekt çökmez). Dönen sprite'a tween uygulanabilir (taşıma, ölçek, solma).
 */
export function vfxSheet(scene: Phaser.Scene, id: string, x: number, y: number, o: SheetOpts = {}): Phaser.GameObjects.Sprite | null {
  const f = vfxSheetFile(id);
  const key = vfxSheetKey(id);
  if (!f || !scene.textures.exists(key)) return null;
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  const [fw] = frameSize(id);
  const pivot = f.meta.pivot ?? [fw / 2, f.meta.frame_size[1] / 2];
  const ib = o.inbetween && o.inbetween.sub > 1 ? o.inbetween : null;
  const tilt = o.groundTilt ? { shear: o.flipX ? -o.groundTilt : o.groundTilt, squash: o.squashY ?? 1 } : undefined;
  const ibKey = ib || o.stabilize || tilt || o.trim ? derivedKey(scene, id, ib, o.stabilize, tilt, o.trim ?? 0) : null;
  const tilted = !!tilt && !!ibKey; // üretilemezse düz (eğimsiz) çizime döner
  const sub = ibKey && ib ? ib.sub : 1;
  const spr = scene.add.sprite(x, y, ibKey ?? key, (o.frame ?? o.frames?.[0] ?? o.from ?? 0) * sub);
  const k = (o.size ?? fw) / fw;
  if (tilted) spr.setOrigin(0.5, 0.5); // türev karede içerik ortada
  else spr.setOrigin(o.origin?.[0] ?? pivot[0] / fw, o.origin?.[1] ?? pivot[1] / f.meta.frame_size[1]);
  spr.setScale(k, tilted ? k : k * (o.squashY ?? 1));
  spr.setDepth(o.depth ?? 4300);
  if (o.flipX) spr.setFlipX(true);
  if (o.rotation) spr.setRotation(o.rotation);
  if (o.alpha !== undefined) spr.setAlpha(o.alpha);
  if (o.tint !== undefined) spr.setTint(o.tint);
  if (o.blend !== undefined) spr.setBlendMode(o.blend);
  const start = () => {
    if (!spr.active) return;
    spr.setVisible(true);
    if (o.frame !== undefined) return;
    const fps = ((o.fps ?? f.meta.fps) * sub) / (slow(1000) / 1000);
    const first = o.from ?? 0; // animasyon bu (asıl) kareden başlar: yağan ok gibi uçuş karesi ayrı oynadıysa (mob-vfx.ts > tune.fall)
    const akey = ibKey ? ibAnim(scene, ibKey, f.meta.frames * sub, first * sub) : animFor(scene, id, o.frames ?? (first ? Array.from({ length: f.meta.frames - first }, (_, i) => first + i) : undefined));
    spr.play({ key: akey, frameRate: fps, repeat: o.loop ? -1 : 0 });
    if (!o.loop && !o.keep) spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spr.destroy());
  };
  if (o.delay && o.delay > 0) {
    spr.setVisible(false);
    scene.time.delayedCall(slow(o.delay), start);
  } else start();
  return spr;
}

/** Bir sheet karesinin iki dayanak noktası (kare pikseli, 256'lık karede 0-256; alfa ağırlıklı). */
export interface SheetAnchors {
  /** Ağırlık merkezi: sheet'in "vuruş noktası" (göğüs hizasında inen melee/mermi efekti bunu hedefin gövdesine oturtur). */
  core: [number, number];
  /** Zemin teması: içeriğin en alt %25'lik bandının ağırlık merkezi y'si (zemin diski/halkası; efekt bu y'yi hücre zeminine oturtur). */
  baseY: number;
  /** Zemin bandının x ağırlık merkezi (zemin diski/halkasının YATAY ortası; efekt bunu hücre merkezine oturtur). */
  baseX: number;
}

const ANCHOR_BAND = 0.25; // içerik yüksekliğinin alttan bu kadarı "zemin bandı"
const anchorCache = new Map<string, SheetAnchors | null>();

/**
 * Bir karenin dayanak noktaları (`SheetAnchors`). Sheet'ler vuruşu karenin ortasına, zemin halkasını da karenin en altına değil
 * sanatın istediği yere çizer; pivot (kare ortası / alt kenar) bunu bilmez. Çağıran `origin` yapıp efekti hedefe oturtur (mob-vfx.ts).
 * Doku/tuval yoksa (node, yüklenmemiş) ya da kare boşsa null: pivot kullanılır. Sonuç önbelleğe alınır.
 */
export function vfxSheetAnchors(scene: Phaser.Scene, id: string, frame: number): SheetAnchors | null {
  const ck = `${id}#${frame}`;
  if (anchorCache.has(ck)) return anchorCache.get(ck)!;
  let out: SheetAnchors | null = null;
  try {
    const key = vfxSheetKey(id);
    if (typeof document !== 'undefined' && scene.textures.exists(key)) {
      const fr = scene.textures.get(key).get(frame);
      const [fw, fh] = frameSize(id);
      const cv = document.createElement('canvas');
      cv.width = fw;
      cv.height = fh;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      if (cx) {
        cx.drawImage(fr.source.image as CanvasImageSource, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0, 0, fw, fh);
        const px = cx.getImageData(0, 0, fw, fh).data;
        const rowSum = new Float64Array(fh);
        const rowY = new Float64Array(fh);
        let sa = 0;
        let sx = 0;
        let sy = 0;
        for (let y = 0; y < fh; y++)
          for (let x = 0; x < fw; x++) {
            const a = px[(y * fw + x) * 4 + 3]!;
            rowSum[y]! += a;
            sa += a;
            sx += a * x;
            sy += a * y;
          }
        for (let y = 0; y < fh; y++) rowY[y] = rowSum[y]! * y;
        // içerik satırları: gerçek kütle taşıyanlar (zayıf kıvılcım/hale satırları alt kenarı belirlemesin)
        let top = -1;
        let bot = -1;
        for (let y = 0; y < fh; y++)
          if (rowSum[y]! > 255 * 3) {
            if (top < 0) top = y;
            bot = y;
          }
        if (sa > 0 && top >= 0) {
          const from = bot - (bot - top) * ANCHOR_BAND;
          let ba = 0;
          let by = 0;
          let bx = 0;
          for (let y = Math.ceil(from); y <= bot; y++) {
            ba += rowSum[y]!;
            by += rowY[y]!;
            for (let x = 0; x < fw; x++) bx += px[(y * fw + x) * 4 + 3]! * x;
          }
          out = { core: [sx / sa, sy / sa], baseY: ba > 0 ? by / ba : bot, baseX: ba > 0 ? bx / ba : sx / sa };
        }
      }
    }
  } catch {
    out = null; // okunamayan doku (çapraz köken vb.): pivota düşer
  }
  anchorCache.set(ck, out);
  return out;
}

/** Sheet sprite'ının animasyonu bitince (ya da yok edilince) çözülür; null için hemen. */
export function sheetDone(spr: Phaser.GameObjects.Sprite | null): Promise<void> {
  if (!spr || !spr.active) return Promise.resolve();
  return new Promise<void>((resolve) => {
    spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => resolve());
    spr.once(Phaser.GameObjects.Events.DESTROY, () => resolve());
  });
}
