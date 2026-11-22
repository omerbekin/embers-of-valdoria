// The First Fire's Verdict vuruş efekti: "Ocak mührü" (Ömer form r41 B, 2026-11-21). Özgün kod çizimi; v1 / Meteor parçası kullanılmaz.
// Hedefin ayağının altında altın mühür halkası (çift çizgi, taç dişleri + taş noktaları) belirir ve dönerek daralır; daralma bitince
// halkanın içinden yukarı beyaz-altın alev sütunu fışkırır; sönerken zeminde mühür izi ve beyaz korlar kalır.
// Renk yalnız beyaz + soluk altın (+ koyu altın kontur): ateş kırmızısı / turuncusu yok (pure hasar, element yok).
// Dokular düşük çözünürlüklü tuvale piksel piksel çizilir (NEAREST), bir kez üretilir.
import Phaser from 'phaser';
import type { CombatantView } from './combatant-view';
import { color, slow } from './combatant-view';
import { playSceneSfxDef } from './audio';
import { FIRST_FIRE_SFX } from './first-fire-ui';
import { reducedMotion } from '../ui/motion-pref';

// Sprite sürümü (Codex çizimi, 2026-11-21, Ömer "kota açılınca çizdirip güzelleştir"; v3 = Tur 4-5, v2 "kod çizimiyle aynı duruyor"
// denince): assets/first-fire/seal.png (6 kare: 4 dönüş + kilit + kor izi) ve column.png (6 alev karesi, 5 dil + korlar). Bayrak `firstFireArt.mode` ('code' = eski kod çizimi; debug Battle > Rules'tan değişir). Dosya yoksa ya da
// henüz yüklenmediyse vuruş kod çizimiyle oynar (eksik asset çökertmez); yükleme uyarı / başlangıç olayında başlar (ensureFirstFireArt).
const ART_PNG = import.meta.glob('../../assets/first-fire/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const ART_META = import.meta.glob('../../assets/first-fire/*.json', { eager: true, import: 'default' }) as Record<string, { frames: number; frame_size: [number, number] }>;
const artFile = (name: string) => {
  const url = ART_PNG[`../../assets/first-fire/${name}.png`];
  const meta = ART_META[`../../assets/first-fire/${name}.json`];
  return url && meta ? { url, meta, key: `ff:sheet-${name}` } : null;
};
const SEAL_ART = artFile('seal');
const COLUMN_ART = artFile('column');

/** Hangi çizim oynar: 'code' (ilk kod çizimi, varsayılan: Ömer 2026-11-21 "Eski hali kalsın") ya da 'sprite' (Codex sheet'leri, yedek; debug'dan açılır). */
export const firstFireArt: { mode: 'sprite' | 'code' } = { mode: 'code' };

/** Sheet'leri çalışan sahnede yükler (yoksa / yüklüyse bir şey yapmaz). */
export function ensureFirstFireArt(scene: Phaser.Scene): void {
  if (firstFireArt.mode !== 'sprite') return;
  let queued = 0;
  for (const a of [SEAL_ART, COLUMN_ART]) {
    if (!a || scene.textures.exists(a.key)) continue;
    const [frameWidth, frameHeight] = a.meta.frame_size;
    scene.load.spritesheet(a.key, a.url, { frameWidth, frameHeight, endFrame: a.meta.frames - 1 });
    queued++;
  }
  if (!queued) return;
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    for (const a of [SEAL_ART, COLUMN_ART]) if (a && scene.textures.exists(a.key)) scene.textures.get(a.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
  if (!scene.load.isLoading()) scene.load.start();
}

// Sheet kare düzeni (v3, Tur 4): mühür 0-3 dönüş, 4 kilit, 5 kor izi (yoksa iz yerine son dönüş karesi); sütun N titreşim karesi.
const SEAL_SPIN = 4;
const SEAL_LOCK = 4;
const SEAL_MARK = (SEAL_ART?.meta.frames ?? 0) > 5 ? 5 : -1;
const COL_SPRITE_FRAMES = COLUMN_ART?.meta.frames ?? 1;
/** Sütun sprite'ının en / boy oranı (görüntü eni boydan türetilir, alev silueti ezilmesin). */
const COL_SPRITE_RATIO = COLUMN_ART ? COLUMN_ART.meta.frame_size[0] / COLUMN_ART.meta.frame_size[1] : 0;

const spriteReady = (scene: Phaser.Scene) => firstFireArt.mode === 'sprite' && !!SEAL_ART && !!COLUMN_ART && scene.textures.exists(SEAL_ART.key) && scene.textures.exists(COLUMN_ART.key);

/** Telefon düzeninde sprite mühür eni ve alev eni çarpanı (alev boyu bunun karekökü kadar uzar). */
export const FIRST_FIRE_PHONE_SCALE = 1.45;

/** Zamanlama (ms, Battle speed ile `slow`): daralma + fışkırma yükselişi = beklenen kısım (bugünkü ödünç düşüşle aynı 420 ms). */
export const FIRST_FIRE_FX_MS ={ appear: 110, contract: 360, rise: 60, hold: 150, fade: 110, markFade: 460 } as const;

const GOLD_DARK = '#6b4c1c';
const GOLD = '#e6c162';
const GOLD_PALE = '#f6dd94';
const WHITE_GOLD = '#fff3c8';
const WHITE = '#ffffff';

type Px = { c: string; a: number } | null;

/** Piksel tuvali: önce renk ızgarası, sonra boş komşulara otomatik kontur (oyunun piksel dili). */
function pixelTexture(scene: Phaser.Scene, key: string, w: number, h: number, shade: (x: number, y: number) => Px, outline?: { c: string; a: number }): string {
  if (scene.textures.exists(key)) return key;
  const grid: Px[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) grid.push(shade(x, y));
  if (outline) {
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && (grid[y * w + x]?.a ?? 0) >= 0.5 && grid[y * w + x]!.c !== outline.c;
    const add: number[] = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const cur = grid[y * w + x];
        if (cur && cur.a >= 0.5) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) add.push(y * w + x);
      }
    for (const i of add) grid[i] = { c: outline.c, a: outline.a };
  }
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = grid[y * w + x];
      if (!p || p.a <= 0) continue;
      ctx.globalAlpha = Math.round(p.a * 6) / 6;
      ctx.fillStyle = p.c;
      ctx.fillRect(x, y, 1, 1);
    }
  ctx.globalAlpha = 1;
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

const SEAL_W = 120;
const SEAL_H = 44;
const SEAL_FRAMES = 4;
const TEETH = 8;

/**
 * Mühür halkası (zemin elipsi içinde çizilir; piksel kare kalır). `frame` motiflerin dönüş evresi (4 kare = bir diş aralığı),
 * `bright` kilitlenme anı: halkalar beyaza yakın.
 */
function sealTexture(scene: Phaser.Scene, frame: number, bright = false): string {
  const key = `ff:seal${bright ? 'b' : ''}${frame}`;
  const step = (Math.PI * 2) / TEETH;
  const phase = (frame / SEAL_FRAMES) * step;
  return pixelTexture(
    scene,
    key,
    SEAL_W,
    SEAL_H,
    (x, y) => {
      const u = (x + 0.5 - SEAL_W / 2) / (SEAL_W / 2);
      const v = (y + 0.5 - SEAL_H / 2) / (SEAL_H / 2);
      const r = Math.hypot(u, v);
      if (r >= 0.985) return null;
      const lit = v < -0.1; // üstten ışık: arka yarı parlak, ön yarı koyu altın
      const ringC = bright ? (lit ? WHITE : WHITE_GOLD) : lit ? GOLD_PALE : GOLD;
      // dış çift çizgi
      if (r >= 0.9) return { c: ringC, a: 1 };
      if (r >= 0.855 && r < 0.875) return { c: bright ? WHITE_GOLD : GOLD, a: 0.85 };
      // iç halka
      if (r >= 0.6 && r < 0.66) return { c: ringC, a: 1 };
      // halkalar arası: taç dişleri (uzun) ve taş noktalı kısa dişler, dönen
      if (r >= 0.66 && r < 0.855) {
        const ang = Math.atan2(v, u) - phase;
        const k = Math.round(ang / step);
        const d = Math.abs(ang - k * step);
        const tall = (((k % 2) + 2) % 2) === 0;
        const tip = tall ? 0.85 : 0.76;
        const half = 0.2 * (tip - r) / (tip - 0.66);
        if (r < tip && d < half) return { c: bright ? WHITE : lit ? WHITE_GOLD : GOLD_PALE, a: 1 };
        if (!tall && r >= 0.79 && r < 0.84 && d < 0.05) return { c: WHITE, a: 1 };
        return { c: GOLD, a: 0.14 };
      }
      // iç alan: ocağın soluk parıltısı, merkeze doğru beyazlaşır
      if (r < 0.6) return { c: r < 0.22 ? WHITE_GOLD : GOLD_PALE, a: (bright ? 0.5 : 0.22) * (1 - r / 0.6) + 0.04 };
      return null;
    },
    { c: GOLD_DARK, a: 0.9 },
  );
}

const COL_W = 32;
const COL_H = 112;
const COL_FRAMES = 3;

/** Beyaz-altın alev sütunu (origin altta): beyaz çekirdek, soluk altın kenar, üstte kopan diller; 3 titreşim karesi. */
/** `res` 1 = normal, 2 = büyük birim (boss): aynı biçim iki kat ince pikselle (iri piksel blokları olmasın). */
function columnTexture(scene: Phaser.Scene, frame: number, res = 1): string {
  const ph = frame * 2.1;
  const CW = COL_W * res;
  const CH = COL_H * res;
  return pixelTexture(
    scene,
    `ff:column${res}-${frame}`,
    CW,
    CH,
    (x, y) => {
      const u = (x + 0.5 - CW / 2) / (CW / 2);
      const yn = (y + 0.5) / CH; // 0 üst, 1 alt
      // gövde: tabanda geniş, kenarı dalgalı (iki ayrı frekans: düz levha gibi durmasın)
      const hw = 0.5 + 0.38 * yn + 0.1 * Math.sin(yn * 23 + ph) + 0.06 * Math.sin(yn * 9 - ph * 1.7);
      let d = Math.abs(u) / hw;
      // üst kısım: üç sallanan alev dili (orta en uzun); dillerin dışı boş
      const SPLIT = 0.45;
      if (yn < SPLIT) {
        let best = 9;
        const tongues = [
          { c: -0.42, top: 0.16 + 0.07 * Math.sin(ph + 0.4), w: 0.3 },
          { c: 0, top: 0.0 + 0.05 * Math.sin(ph * 1.3), w: 0.4 },
          { c: 0.42, top: 0.2 + 0.07 * Math.sin(ph + 2.2), w: 0.3 },
        ];
        tongues.forEach((t, k) => {
          if (yn <= t.top) return;
          const sway = 0.1 * Math.sin(yn * 11 + ph + k * 1.9) * (SPLIT - yn) * 2;
          const tw = t.w * Math.pow((yn - t.top) / (SPLIT - t.top), 0.7);
          best = Math.min(best, Math.abs(u - t.c - sway) / Math.max(0.04, tw));
        });
        // dillerin tabanı gövdeye karışır
        const mix = (yn / SPLIT) ** 3;
        d = Math.min(best, d / Math.max(0.01, mix));
      }
      if (d >= 1) return null;
      const a = yn < 0.12 ? 0.75 : 1;
      if (d < 0.38) return { c: WHITE, a };
      if (d < 0.72) return { c: WHITE_GOLD, a };
      return { c: GOLD_PALE, a: a * 0.9 };
    },
    { c: '#8a6420', a: 0.6 },
  );
}

/** Yumuşak zemin parlaması (elips, ADD ile). */
function glowTexture(scene: Phaser.Scene): string {
  return pixelTexture(scene, 'ff:glow', 48, 18, (x, y) => {
    const d = Math.hypot((x + 0.5 - 24) / 24, (y + 0.5 - 9) / 9);
    if (d >= 1) return null;
    return { c: d < 0.35 ? WHITE : d < 0.7 ? WHITE_GOLD : GOLD_PALE, a: (1 - d) ** 1.2 };
  });
}

/** Sütunun arkasındaki yumuşak dikey hale (ADD): levha gibi sert kenarı ışığa yayar. */
function haloTexture(scene: Phaser.Scene): string {
  return pixelTexture(scene, 'ff:halo', 20, 56, (x, y) => {
    const d = Math.hypot((x + 0.5 - 10) / 10, (y + 0.5 - 30) / 30);
    if (d >= 1) return null;
    return { c: d < 0.4 ? WHITE_GOLD : GOLD_PALE, a: (1 - d) ** 2 * 0.8 };
  });
}

const wait = (scene: Phaser.Scene, ms: number) => new Promise<void>((resolve) => scene.time.delayedCall(ms, resolve));
const rnd = (a: number, b: number) => Phaser.Math.FloatBetween(a, b);

/** Beyaz kor parçacıkları: halkanın üstünden yükselir, yana sürüklenir, söner (kare piksel). */
function embers(scene: Phaser.Scene, x: number, y: number, spread: number, n: number, depth: number): void {
  for (let i = 0; i < n; i++) {
    const s = Math.random() < 0.35 ? 6 : 4;
    const px = x + rnd(-spread, spread);
    const py = y - rnd(0, 30);
    const r = scene.add.rectangle(Math.round(px / 2) * 2, Math.round(py / 2) * 2, s, s, color(Math.random() < 0.6 ? WHITE : WHITE_GOLD)).setDepth(depth);
    const life = slow(rnd(480, 820));
    const dx = rnd(-26, 26);
    const dy = -rnd(70, 150);
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: life,
      ease: 'Quad.easeOut',
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        r.setPosition(Math.round((px + dx * k) / 2) * 2, Math.round((py + dy * k) / 2) * 2).setAlpha(1 - k * k);
      },
      onComplete: () => r.destroy(),
    });
  }
}

/** Hedefin ölçüsü: mühür genişliği ve sütun boyu (boss gibi büyük birimlerde büyür, küçüklerde alt sınır). */
export function firstFireFxSize(w: number, h: number): { sealW: number; colW: number; colH: number } {
  return {
    sealW: Math.round(Math.min(440, Math.max(170, w * 1.35))),
    colW: Math.round(Math.min(240, Math.max(84, w * 0.85))),
    colH: Math.round(Math.min(720, Math.max(300, h * 1.9))),
  };
}

/**
 * Vuruş: mühür belirir + daralır (~0,36 sn), fışkırma yükselince (~0,42 sn) Promise çözülür (hasar sayısı hemen ardından), sütun ve
 * mühür izi arkada söner (toplam ~1 sn). Ekran parlaması yok; yalnız kilitlenmede çok küçük sarsıntı (Reduced motion'da yok).
 */
export async function firstFireStrikeFx(scene: Phaser.Scene, target: CombatantView): Promise<void> {
  const T = FIRST_FIRE_FX_MS;
  const fx = target.container.x;
  const fy = target.container.y - 4; // ayak çizgisi
  const base = target.container.depth;
  const sprite = spriteReady(scene);
  // telefonda (html.short) sahne küçülür: sprite mühür ve alev büyür ki taç motifleri ve alev dilleri seçilsin (Codex Tur 6). Kod çizimi eski ölçüde.
  const phoneK = sprite && typeof document !== 'undefined' && document.documentElement.classList.contains('short') ? FIRST_FIRE_PHONE_SCALE : 1;
  const raw = firstFireFxSize(target.w, target.h);
  const size = { sealW: Math.round(raw.sealW * phoneK), colW: raw.colW, colH: Math.round(raw.colH * Math.sqrt(phoneK)) };
  const sealH = Math.round((size.sealW * SEAL_H) / SEAL_W);
  playSceneSfxDef(scene, FIRST_FIRE_SFX.strike_seal);
  if (!sprite) ensureFirstFireArt(scene); // ilk vuruş yüklenmeden geldiyse bu vuruş kod çizimi, sonrakiler sprite
  const setSeal = (img: Phaser.GameObjects.Image, f: number, bright = false) => (sprite ? img.setTexture(SEAL_ART!.key, bright ? SEAL_LOCK : f % SEAL_SPIN) : img.setTexture(sealTexture(scene, f, bright)));
  const setColumn = (img: Phaser.GameObjects.Image, f: number, res: number) => (sprite ? img.setTexture(COLUMN_ART!.key, f % COL_SPRITE_FRAMES) : img.setTexture(columnTexture(scene, f, res)));
  const colFrames = sprite ? COL_SPRITE_FRAMES : COL_FRAMES;
  // sprite alevinde görüntü eni sheet oranından (siluet ezilmez); kod çiziminde eski ölçü
  const colW = sprite && COL_SPRITE_RATIO ? Math.round(size.colH * COL_SPRITE_RATIO * phoneK) : size.colW;

  // 1) zemin parıltısı + mühür halkası: geniş ve saydam belirir, dönerek hedefin ayağına daralır
  const glow = scene.add.image(fx, fy, glowTexture(scene)).setDisplaySize(size.sealW * 0.8, sealH * 0.8).setDepth(base - 3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  const seal = setSeal(scene.add.image(fx, fy, '__WHITE'), 0).setDepth(base - 2).setAlpha(0);
  const setSealScale = (k: number) => seal.setDisplaySize(Math.round(size.sealW * k), Math.round(sealH * k));
  setSealScale(1.75);
  scene.tweens.add({ targets: seal, alpha: 1, duration: slow(T.appear) });
  scene.tweens.add({ targets: glow, alpha: 0.55, duration: slow(T.contract) });
  let frame = 0;
  const spin = scene.time.addEvent({ delay: slow(55), loop: true, callback: () => setSeal(seal, (frame = (frame + 1) % SEAL_FRAMES)) });
  await new Promise<void>((resolve) =>
    scene.tweens.addCounter({
      from: 1.75,
      to: 1,
      duration: slow(T.contract),
      ease: 'Quad.easeIn',
      onUpdate: (tw) => setSealScale(tw.getValue() ?? 1),
      onComplete: () => resolve(),
    }),
  );
  spin.remove();
  setSealScale(1);

  // 2) kilitlenme: halka beyaza döner, sütun fışkırır
  setSeal(seal, frame, true);
  playSceneSfxDef(scene, FIRST_FIRE_SFX.strike_hit);
  if (!reducedMotion()) scene.cameras.main.shake(slow(90), 0.003);
  scene.tweens.add({ targets: glow, alpha: 0.95, displayWidth: size.sealW * 1.05, displayHeight: sealH * 1.05, duration: slow(T.rise), yoyo: true, hold: slow(T.hold) });
  const res = size.colW > 150 ? 2 : 1; // büyük birimde ince piksel
  // sprite alevi (v3) hedefin ÖNÜNDE, normal karışımla, hafif saydam: alev silueti (diller, V boşluklar, kontur) okunur, hedef
  // alevin içinden seçilir. Kod çiziminde eski düzen: sütun arkada, önde ADD kopya.
  const back = setColumn(scene.add.image(fx, fy + 2, '__WHITE'), 0, res).setOrigin(0.5, 1).setDepth(sprite ? base + 1 : base - 1).setDisplaySize(colW, size.colH).setAlpha(sprite ? 0.88 : 1);
  const front = setColumn(scene.add.image(fx, fy + 2, '__WHITE'), 1, res).setOrigin(0.5, 1).setDepth(base + 1.1).setDisplaySize(colW * 0.78, size.colH * 0.94).setBlendMode(Phaser.BlendModes.ADD).setAlpha(sprite ? 0.12 : 0.45);
  const halo = scene.add.image(fx, fy + 2, haloTexture(scene)).setOrigin(0.5, 0.95).setDepth(base - 1.5).setDisplaySize(colW * 1.9, size.colH * 1.05).setBlendMode(Phaser.BlendModes.ADD).setAlpha(sprite ? 0.15 : 0.4);
  const cols = [halo, back, front];
  for (const c of cols) {
    const sy = c.scaleY;
    c.setScale(c.scaleX, sy * 0.12);
    scene.tweens.add({ targets: c, scaleY: sy, duration: slow(T.rise), ease: 'Cubic.easeOut' });
  }
  let cf = 0;
  const flicker = scene.time.addEvent({
    delay: slow(45),
    loop: true,
    callback: () => {
      cf++;
      setColumn(back, cf % colFrames, res);
      setColumn(front, (cf + Math.ceil(colFrames / 2)) % colFrames, res);
    },
  });
  embers(scene, fx, fy - 10, colW * 0.45, 6, base + 2);
  await wait(scene, slow(T.rise));

  // 3) kuyruk (beklenmez): sütun incelip yukarı kopar, mühür izi zeminde parlayıp söner, korlar yükselir
  void (async () => {
    await wait(scene, slow(T.hold));
    embers(scene, fx, fy - size.colH * 0.3, colW * 0.35, 5, base + 2);
    scene.tweens.add({ targets: cols, scaleX: (o: Phaser.GameObjects.Image) => o.scaleX * 0.3, y: fy - 24, alpha: 0, duration: slow(T.fade), ease: 'Quad.easeIn' });
    await wait(scene, slow(T.fade));
    flicker.remove();
    for (const c of cols) c.destroy();
    // mühür izi: sprite'ta kor izi karesi (kırık kor yayları) + üstünde ADD parıltı kısa süre kor gibi titreyip söner
    if (sprite && SEAL_MARK >= 0) {
      seal.setTexture(SEAL_ART!.key, SEAL_MARK);
      const ember = scene.add.image(fx, fy, SEAL_ART!.key, SEAL_MARK).setDisplaySize(seal.displayWidth, seal.displayHeight).setDepth(base - 1.9).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);
      scene.tweens.add({ targets: ember, alpha: { from: 0.85, to: 0.35 }, duration: slow(70), yoyo: true, repeat: 1 });
      scene.tweens.add({ targets: ember, alpha: 0, delay: slow(280), duration: slow(T.markFade - 280), ease: 'Quad.easeIn', onComplete: () => ember.destroy() });
    } else setSeal(seal, frame);
    embers(scene, fx, fy, size.sealW * 0.4, 4, base + 2);
    scene.tweens.add({ targets: seal, alpha: 0, displayWidth: size.sealW * 1.06, displayHeight: sealH * 1.06, duration: slow(T.markFade), ease: 'Quad.easeIn', onComplete: () => seal.destroy() });
    scene.tweens.add({ targets: glow, alpha: 0, duration: slow(T.markFade * 0.7), onComplete: () => glow.destroy() });
  })();
}
