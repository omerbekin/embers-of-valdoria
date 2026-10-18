/**
 * El yapımı mob efektlerinin ORTAK ÇEKİRDEĞİ (src/game/mob-vfx-hand.ts kaydı; yalnızca Debug > VFX frame test (in battle) > Hand-coded).
 * Burada: matematik, renk önbelleği, zamanlama (after / land), nesne HAVUZU (Graphics + Image yeniden kullanılır: aynı anda birkaç efekt
 * kasmasın), her karede yeniden çizilen katman sürücüsü (`layer`, `holdLayer`), tek Graphics'te simüle edilen parçacıklar (`spray`), havuzlu
 * duman (`smoke`) ve yumuşak ışık (`glow`). Phaser'ı çalışma zamanında içe aktarmaz (tip + k.Phaser).
 *
 * Katman disiplini (Rend / Glyph of Breaking dersleri): her skill'de TEK ana katman (her karede temizlenip çizilir) + kısa vuruş katmanı
 * (parçacık, duman). Parlama yalnızca büyülerde ve ölçülü; fiziksel vuruşlar normal karışımla, koyu ve mat çizilir.
 */
import type Phaser from 'phaser';
import type { CombatantView } from '../combatant-view';
import type { VfxCtx } from '../vfx';
import type { VfxKit } from '../vfx-versions';

export type Pt = { x: number; y: number };
export type Scene = Phaser.Scene;
export type G = Phaser.GameObjects.Graphics;
export type { VfxCtx, VfxKit, CombatantView };

export const ADD = 1; // Phaser.BlendModes.ADD
export const NORMAL = 0;
/** Aşamalı alan skill'inde aşamalar arası (ms): src/game/mob-vfx.ts ile aynı. */
export const STAGE_STEP = 180;
/** Hücre zemini -> o hücredeki birimin hemen üstü (mob-vfx.ts ile aynı). */
export const CELL_DEPTH = 8;
/** Zemin elipsi basıklığı (hücre perspektifi). */
export const FLAT = 0.36;

// ---------------------------------------------------------------------------------------------------------------------
// matematik

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
export const smooth = (u: number): number => u * u * (3 - 2 * u);
/** Hızlı başlayıp yavaşlayan (p büyüdükçe sert). */
export const eo = (u: number, p = 2): number => 1 - (1 - clamp01(u)) ** p;
/** Yavaş başlayıp hızlanan. */
export const ei = (u: number, p = 2): number => clamp01(u) ** p;
/** 0 -> 1 -> 0 çan. */
export const bell = (u: number): number => Math.sin(Math.PI * clamp01(u));
/** [a, b] aralığında 0-1 (dışında kenetli). */
export const span = (t: number, a: number, b: number): number => clamp01((t - a) / Math.max(1e-6, b - a));
/** Yumuşak, tekrarsız görünen gürültü (üç sinüs). */
export const wob = (t: number, seed: number): number => (Math.sin(t * 1.7 + seed) * 0.5 + Math.sin(t * 2.9 + seed * 1.3) * 0.3 + Math.sin(t * 5.3 + seed * 2.1) * 0.2);
export const TAU = Math.PI * 2;

const colCache = new Map<string, number>();
/** '#rrggbb' -> 0xRRGGBB (önbellekli; her karede Color nesnesi üretilmez). */
export function C(hex: string): number {
  let v = colCache.get(hex);
  if (v === undefined) {
    v = parseInt(hex.slice(1, 7), 16);
    colCache.set(hex, v);
  }
  return v;
}
/** İki rengi karıştırır (0xRRGGBB): t=0 a, t=1 b. */
export function mix(a: number, b: number, t: number): number {
  const m = (sh: number) => Math.round(lerp((a >> sh) & 255, (b >> sh) & 255, clamp01(t))) << sh;
  return m(16) | m(8) | m(0);
}

// ---------------------------------------------------------------------------------------------------------------------
// zamanlama

/** Sahne zaman ölçeğine uyan bekleme (ms zaten k.slow uygulanmış). */
export const after = (c: VfxCtx, ms: number, fn: () => void): void => {
  if (ms <= 0) fn();
  else c.scene.time.delayedCall(ms, fn);
};

export function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

/** Vuruş anı (sheet sürümüyle aynı): kalan sesler + Promise çözülür. */
export function land(c: VfxCtx, at: number): Promise<void> {
  const d = deferred();
  after(c, at, () => {
    for (const x of (c.skill.sfx ?? []).slice(1)) c.sfx(x);
    d.resolve();
  });
  return d.promise;
}

/** Hedefe bu kullanımda gerçekten hasar geldi mi (olaysız önizlemede: evet). */
export function hurt(c: VfxCtx, v: CombatantView): boolean {
  return !c.usage || c.usage.damages.some((d) => d.target === v.combatant.uid && d.amount > 0);
}

/** Hedef saldırganın sağındaysa +1, solundaysa -1. */
export const dirOf = (c: VfxCtx, v: CombatantView | Pt): number => (('container' in v ? v.container.x : v.x) >= c.actor.container.x ? 1 : -1);

/** Saldırganın elinin / ağzının yaklaşık yeri (mermiler buradan çıkar). */
export function handOf(c: VfxCtx, k: VfxKit, toward: Pt, up = 0.12): Pt {
  const b = k.spot(c.actor);
  const d = toward.x >= c.actor.container.x ? 1 : -1;
  return { x: b.x + d * c.actor.w * 0.34, y: b.y - c.actor.h * up };
}

// ---------------------------------------------------------------------------------------------------------------------
// havuz: Graphics ve Image yeniden kullanılır (sahne yeniden kurulunca nesneler sahneyle yok olur; ölüler atlanır)

const gPools = new WeakMap<Scene, G[]>();
const iPools = new WeakMap<Scene, Phaser.GameObjects.Image[]>();
const POOL_MAX = 48;

export function takeG(sc: Scene, depth: number, add = false): G {
  let list = gPools.get(sc);
  if (!list) gPools.set(sc, (list = []));
  let g: G | undefined;
  while (list.length) {
    const x = list.pop()!;
    if (x.scene) {
      g = x;
      break;
    }
  }
  g ??= cheapShapes(sc.add.graphics());
  g.clear();
  return g.setVisible(true).setAlpha(1).setDepth(depth).setBlendMode(add ? ADD : NORMAL).setPosition(0, 0).setScale(1);
}

/**
 * Dolu daire / elips: Phaser bunları yol + üçgenleme (earcut) ile çizer, yüzlerce kıvılcım / damla / zerre her karede pahalıya patlıyordu.
 * Havuzdaki Graphics'lerde üçgen yelpazesiyle çizilir (dışbükey: üçgenleme gerekmez); küçük noktalar tek kare.
 */
function cheapShapes(g: G): G {
  const fan = (x: number, y: number, rx: number, ry: number) => {
    const r = Math.max(rx, ry);
    if (r < 1.6) return g.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    const n = r < 4 ? 6 : r < 10 ? 10 : r < 30 ? 16 : 24;
    let px = x + rx;
    let py = y;
    for (let i = 1; i <= n; i++) {
      const a = (i / n) * TAU;
      const qx = x + Math.cos(a) * rx;
      const qy = y + Math.sin(a) * ry;
      g.fillTriangle(x, y, px, py, qx, qy);
      px = qx;
      py = qy;
    }
    return g;
  };
  g.fillCircle = (x: number, y: number, r: number) => fan(x, y, r, r);
  g.fillEllipse = (x: number, y: number, w: number, h: number) => fan(x, y, w / 2, h / 2);
  return g;
}

export function giveG(sc: Scene, g: G): void {
  if (!g.scene) return;
  g.clear();
  g.setVisible(false);
  const list = gPools.get(sc);
  if (list && list.length < POOL_MAX) list.push(g);
  else g.destroy();
}

export function takeImg(sc: Scene, key: string, depth: number, add = false): Phaser.GameObjects.Image {
  let list = iPools.get(sc);
  if (!list) iPools.set(sc, (list = []));
  let im: Phaser.GameObjects.Image | undefined;
  while (list.length) {
    const x = list.pop()!;
    if (x.scene) {
      im = x;
      break;
    }
  }
  if (im) im.setTexture(key);
  else im = sc.add.image(0, 0, key);
  return im.setVisible(true).setAlpha(1).setDepth(depth).setBlendMode(add ? ADD : NORMAL).setScale(1).setRotation(0).setTint(0xffffff).setOrigin(0.5, 0.5);
}

export function giveImg(sc: Scene, im: Phaser.GameObjects.Image): void {
  if (!im.scene) return;
  im.setVisible(false);
  const list = iPools.get(sc);
  if (list && list.length < POOL_MAX * 2) list.push(im);
  else im.destroy();
}

// ---------------------------------------------------------------------------------------------------------------------
// katman sürücüsü: her karede temizlenip yeniden çizilir

/** `dur` (ms, k.slow uygulanmış) boyunca her karede `draw(g, tm, u)`; bitince Graphics havuza döner. */
export function layer(c: VfxCtx, dur: number, depth: number, draw: (g: G, tm: number, u: number) => void, add = false): void {
  const sc = c.scene;
  const g = takeG(sc, depth, add);
  const D = Math.max(1, dur);
  sc.tweens.addCounter({
    from: 0,
    to: 1,
    duration: D,
    onUpdate: (tw) => {
      const u = tw.getValue() ?? 0;
      g.clear();
      draw(g, u * D, u);
    },
    onComplete: () => giveG(sc, g),
    onStop: () => giveG(sc, g),
  });
}

/** Birden çok Graphics'i aynı sayaçla süren katman (ör. arka + ön şerit, zemin + hava). */
export function layers(c: VfxCtx, dur: number, specs: Array<{ depth: number; add?: boolean }>, draw: (gs: G[], tm: number, u: number) => void): void {
  const sc = c.scene;
  const gs = specs.map((s) => takeG(sc, s.depth, s.add));
  const D = Math.max(1, dur);
  const free = () => gs.forEach((g) => giveG(sc, g));
  sc.tweens.addCounter({
    from: 0,
    to: 1,
    duration: D,
    onUpdate: (tw) => {
      const u = tw.getValue() ?? 0;
      for (const g of gs) g.clear();
      draw(gs, u * D, u);
    },
    onComplete: free,
    onStop: free,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// dokular: yumuşak (LINEAR filtre, tam alfa) ışık ve kabarık duman

function canvasTex(k: VfxKit, sc: Scene, key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): string {
  if (sc.textures.exists(key)) return key;
  const tex = sc.textures.createCanvas(key, w, h);
  if (!tex) return key;
  paint(tex.getContext());
  tex.refresh();
  tex.setFilter(k.Phaser.Textures.FilterMode.LINEAR);
  return key;
}

/** Yumuşak beyaz ışık (tint + ADD). */
export function glowTex(k: VfxKit, sc: Scene): string {
  return canvasTex(k, sc, 'fx:mh-glow', 64, 64, (ctx) => {
    const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.14)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 64, 64);
  });
}

/** Kabarık duman topu: birkaç yumuşak yumrudan oluşan, kenarı düzensiz beyaz bulut (tint ile renklenir, normal karışım). */
export function billowTex(k: VfxKit, sc: Scene, variant = 0): string {
  const v = variant % 3;
  return canvasTex(k, sc, `fx:mh-billow${v}`, 96, 96, (ctx) => {
    const lumps = [
      [
        [48, 50, 30],
        [32, 56, 20],
        [64, 58, 22],
        [44, 34, 20],
        [60, 40, 16],
      ],
      [
        [48, 52, 28],
        [30, 46, 18],
        [66, 48, 20],
        [50, 32, 18],
        [38, 64, 16],
      ],
      [
        [50, 48, 30],
        [34, 38, 18],
        [62, 36, 18],
        [36, 62, 18],
        [64, 62, 18],
      ],
    ][v]!;
    for (const [x, y, r] of lumps) {
      const gr = ctx.createRadialGradient(x!, y!, 0, x!, y!, r!);
      gr.addColorStop(0, 'rgba(255,255,255,0.92)');
      gr.addColorStop(0.55, 'rgba(255,255,255,0.62)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(x!, y!, r!, 0, TAU);
      ctx.fill();
    }
  });
}

/** Parlayan yumuşak ışık: büyüyüp söner (havuzlu Image). Yalnızca büyülerde, ölçülü. */
export function glow(c: VfxCtx, k: VfxKit, p: Pt, w: number, h: number, hex: string, o: { alpha?: number; dur?: number; grow?: number; depth?: number; delay?: number } = {}): void {
  const sc = c.scene;
  const run = () => {
    const im = takeImg(sc, glowTex(k, sc), o.depth ?? k.DEPTH, true).setPosition(p.x, p.y).setTint(C(hex));
    im.setDisplaySize(w, h);
    const sx = im.scaleX;
    const sy = im.scaleY;
    const a0 = o.alpha ?? 0.6;
    const g = o.grow ?? 1.4;
    im.setAlpha(a0);
    sc.tweens.addCounter({
      from: 0,
      to: 1,
      duration: k.slow(o.dur ?? 300),
      onUpdate: (tw) => {
        const u = tw.getValue() ?? 0;
        const e = eo(u, 2);
        im.setScale(sx * lerp(1, g, e), sy * lerp(1, g, e)).setAlpha(a0 * (1 - u) ** 1.4);
      },
      onComplete: () => giveImg(sc, im),
    });
  };
  if (o.delay) after(c, k.slow(o.delay), run);
  else run();
}

// ---------------------------------------------------------------------------------------------------------------------
// duman: havuzlu kabarık bulutlar, tek sayaçla

export interface Puff {
  x: number;
  y: number;
  /** Hız (px/s, yavaşlatılmadan) ve sürtünme (1/s). */
  vx: number;
  vy: number;
  drag?: number;
  /** Başlangıç / bitiş çapı (px). */
  s0: number;
  s1: number;
  life: number;
  delay?: number;
  hex: string;
  a: number;
  /** Dönüş hızı (rad/s). */
  vr?: number;
  /** Doğuşta hızla belirir (0-1 ömrün bu oranında). */
  rise?: number;
}

export function smoke(c: VfxCtx, k: VfxKit, list: Puff[], depth: number, add = false): void {
  if (!list.length) return;
  const sc = c.scene;
  const f = k.slow(1000) / 1000;
  const ims = list.map((p, i) => takeImg(sc, billowTex(k, sc, i), depth, add).setTint(C(p.hex)).setAlpha(0));
  const rot0 = list.map(() => k.rnd(0, TAU));
  const maxMs = Math.max(...list.map((p) => (p.delay ?? 0) + p.life));
  sc.tweens.addCounter({
    from: 0,
    to: 1,
    duration: maxMs * f,
    onUpdate: (tw) => {
      const tMs = (tw.getValue() ?? 0) * maxMs;
      list.forEach((p, i) => {
        const im = ims[i]!;
        const t = tMs - (p.delay ?? 0);
        if (t < 0 || t > p.life) {
          im.setAlpha(0);
          return;
        }
        const s = t / 1000;
        const d = p.drag ?? 1.2;
        const m = (1 - Math.exp(-d * s)) / d;
        const q = t / p.life;
        const r0 = p.rise ?? 0.15;
        const a = p.a * (q < r0 ? q / r0 : (1 - (q - r0) / (1 - r0)) ** 1.3);
        const sz = lerp(p.s0, p.s1, eo(q, 1.6));
        im.setPosition(p.x + p.vx * m, p.y + p.vy * m).setAlpha(a);
        im.setScale(sz / 96);
        im.setRotation(rot0[i]! + (p.vr ?? 0) * s);
      });
    },
    onComplete: () => ims.forEach((im) => giveImg(sc, im)),
  });
}

/** Kolay duman üreteci: `n` bulut, merkez `p` çevresinde. */
export function puffs(
  k: VfxKit,
  p: Pt,
  n: number,
  o: { hex: string[]; sx: number; sy?: number; vx?: [number, number]; vy: [number, number]; s0: [number, number]; s1: [number, number]; life: [number, number]; a: number; delay?: [number, number]; drag?: number; rise?: number },
): Puff[] {
  return Array.from({ length: n }, () => ({
    x: p.x + k.rnd(-o.sx, o.sx),
    y: p.y + k.rnd(-(o.sy ?? 0), o.sy ?? 0),
    vx: k.rnd(o.vx?.[0] ?? -20, o.vx?.[1] ?? 20),
    vy: k.rnd(o.vy[0], o.vy[1]),
    s0: k.rnd(o.s0[0], o.s0[1]),
    s1: k.rnd(o.s1[0], o.s1[1]),
    life: k.rnd(o.life[0], o.life[1]),
    delay: o.delay ? k.rnd(o.delay[0], o.delay[1]) : 0,
    hex: k.pick(o.hex),
    a: o.a * k.rnd(0.75, 1),
    vr: k.rnd(-0.6, 0.6),
    ...(o.drag !== undefined ? { drag: o.drag } : {}),
    ...(o.rise !== undefined ? { rise: o.rise } : {}),
  }));
}

// ---------------------------------------------------------------------------------------------------------------------
// parçacıklar: tek Graphics'te simüle edilir (taş, kıymık, damla, kor, kıvılcım çizgisi, tüy, yaprak)

export type BitKind = 'rock' | 'shard' | 'drop' | 'dot' | 'streak' | 'leaf' | 'ember';

export interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: BitKind;
  size: number;
  col: number;
  /** Ömür (ms, yavaşlatılmadan). */
  life: number;
  delay?: number;
  rot?: number;
  vr?: number;
  /** Yerel şekil (rock / shard / leaf; yoksa üretilir). */
  pts?: Pt[];
  /** Açık kenar rengi (taşın ışık alan yüzü). */
  rim?: number;
  /** Bu parçanın yer çekimi (yoksa spray'inki). */
  grav?: number;
  /** Hava sürtünmesi (1/s). */
  drag?: number;
  /** En yüksek alfa. */
  a?: number;
  /** Yaprak / tüy: yana salınım genliği (px). */
  sway?: number;
  /** Zemin y'si: buraya inen parça durur, yerde kısa kalıp söner. */
  floor?: number;
}

/** Düzensiz taş: 5-7 köşeli. */
export const rockShape = (k: VfxKit): Pt[] => {
  const n = 5 + Math.floor(k.rnd(0, 3));
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU + k.rnd(-0.25, 0.25);
    const r = k.rnd(0.62, 1);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * k.rnd(0.7, 1) };
  });
};
/** Sivri kıymık. */
export const shardShape = (k: VfxKit): Pt[] => {
  const w = k.rnd(0.18, 0.34);
  return [
    { x: 1, y: 0 },
    { x: 0.1, y: w },
    { x: -1, y: k.rnd(-0.05, 0.05) },
    { x: 0.1, y: -w * 0.7 },
  ];
};
/** Yaprak / tüy: uzun, iki ucu sivri. */
export const leafShape = (k: VfxKit): Pt[] => {
  const w = k.rnd(0.28, 0.42);
  return [
    { x: 1, y: 0 },
    { x: 0.35, y: w },
    { x: -0.4, y: w * 0.7 },
    { x: -1, y: 0 },
    { x: -0.4, y: -w * 0.6 },
    { x: 0.35, y: -w * 0.9 },
  ];
};

/** Parçacık kümesini tek Graphics'te oynatır. `gravity` px/s². Fizik yavaşlatılmamış zamanda (k.slow yalnızca süreyi uzatır). */
export function spray(c: VfxCtx, k: VfxKit, bits: Bit[], depth: number, gravity: number, add = false): void {
  if (!bits.length) return;
  for (const b of bits) {
    if ((b.kind === 'rock' || b.kind === 'shard' || b.kind === 'leaf') && !b.pts) b.pts = b.kind === 'rock' ? rockShape(k) : b.kind === 'shard' ? shardShape(k) : leafShape(k);
    b.rot ??= k.rnd(0, TAU);
    b.vr ??= k.rnd(-6, 6);
  }
  const f = k.slow(1000) / 1000;
  const maxMs = Math.max(...bits.map((b) => (b.delay ?? 0) + b.life));
  layer(c, maxMs * f, depth, (g, tm) => {
    const tMs = tm / f;
    for (const b of bits) {
      const t = tMs - (b.delay ?? 0);
      if (t < 0 || t > b.life) continue;
      const s = t / 1000;
      const gv = b.grav ?? gravity;
      const d = b.drag ?? 0;
      const m = d > 0 ? (1 - Math.exp(-d * s)) / d : s;
      let x = b.x + b.vx * m;
      let y = b.y + b.vy * m + 0.5 * gv * s * s;
      let vy = b.vy * (d > 0 ? Math.exp(-d * s) : 1) + gv * s;
      let vx = b.vx * (d > 0 ? Math.exp(-d * s) : 1);
      let landed = false;
      if (b.floor !== undefined && y > b.floor) {
        y = b.floor;
        vy = 0;
        vx = 0;
        landed = true;
      }
      if (b.sway) x += Math.sin(s * 7 + b.rot!) * b.sway * Math.min(1, s * 3);
      const q = t / b.life;
      const a = (b.a ?? 1) * (q < 0.65 ? 1 : 1 - (q - 0.65) / 0.35);
      if (a <= 0.01) continue;
      const r = landed ? b.rot! : b.rot! + b.vr! * s;
      switch (b.kind) {
        case 'drop': {
          // hıza göre uzayan damla (mat); yere inince yassı leke
          if (landed) {
            g.fillStyle(b.col, a * 0.9).fillEllipse(x, y, b.size * 2.2, b.size * 0.8);
            break;
          }
          const sp = Math.hypot(vx, vy) || 1;
          const st = Math.min(b.size * 3.2, sp * 0.018);
          g.lineStyle(b.size, b.col, a).lineBetween(x - (vx / sp) * st, y - (vy / sp) * st, x, y);
          g.fillStyle(b.col, a).fillCircle(x, y, b.size * 0.55);
          break;
        }
        case 'dot':
          g.fillStyle(b.col, a).fillCircle(x, y, b.size * (landed ? 0.8 : 1));
          break;
        case 'ember': {
          // kor: titreyen küçük nokta, sönerken kızıllaşır
          const fl = 0.7 + 0.3 * Math.sin(t * 0.05 + b.rot! * 7);
          g.fillStyle(b.col, a * fl).fillCircle(x, y, b.size * (1 - q * 0.5));
          break;
        }
        case 'streak': {
          // kısa çizgi (kıvılcım / kum / su teli): hız yönünde
          const sp = Math.hypot(vx, vy) || 1;
          const st = Math.min(b.size * 9, sp * 0.03);
          g.lineStyle(Math.max(1, b.size * 0.5), b.col, a).lineBetween(x - (vx / sp) * st, y - (vy / sp) * st, x, y);
          break;
        }
        default: {
          const cs = Math.cos(r);
          const sn = Math.sin(r);
          const sz = b.size;
          const flat = b.kind === 'leaf' ? 0.55 + 0.45 * Math.abs(Math.sin(s * 9 + b.rot!)) : 1; // yaprak dönerken incelir
          const pts = b.pts!.map((p) => ({ x: x + (p.x * cs - p.y * flat * sn) * sz, y: y + (p.x * sn + p.y * flat * cs) * sz }));
          g.fillStyle(b.col, a).fillPoints(pts, true);
          if (b.rim !== undefined) g.lineStyle(Math.max(1.2, sz * 0.14), b.rim, a * 0.85).strokePoints(pts.slice(0, Math.ceil(pts.length / 2)), false);
        }
      }
    }
  }, add);
}

/** Bit üreteci: `n` parça, açı aralığı (rad), hız aralığı (px/s); geri kalan alanlar `o`dan. */
export function bits(
  k: VfxKit,
  n: number,
  p: Pt,
  o: { kind: BitKind; ang: [number, number]; sp: [number, number]; size: [number, number]; life: [number, number]; cols: string[]; jx?: number; jy?: number; up?: [number, number]; delay?: [number, number]; rim?: string; grav?: number; drag?: number; a?: number; sway?: number; floor?: number; vr?: number },
): Bit[] {
  return Array.from({ length: n }, () => {
    const a = k.rnd(o.ang[0], o.ang[1]);
    const sp = k.rnd(o.sp[0], o.sp[1]);
    const b: Bit = {
      x: p.x + k.rnd(-(o.jx ?? 0), o.jx ?? 0),
      y: p.y + k.rnd(-(o.jy ?? 0), o.jy ?? 0),
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (o.up ? k.rnd(o.up[0], o.up[1]) : 0),
      kind: o.kind,
      size: k.rnd(o.size[0], o.size[1]),
      col: C(k.pick(o.cols)),
      life: k.rnd(o.life[0], o.life[1]),
      delay: o.delay ? k.rnd(o.delay[0], o.delay[1]) : 0,
    };
    if (o.rim) b.rim = C(o.rim);
    if (o.grav !== undefined) b.grav = o.grav;
    if (o.drag !== undefined) b.drag = o.drag;
    if (o.a !== undefined) b.a = o.a;
    if (o.sway !== undefined) b.sway = o.sway;
    if (o.floor !== undefined) b.floor = o.floor + k.rnd(-4, 6);
    if (o.vr !== undefined) b.vr = k.rnd(-o.vr, o.vr);
    return b;
  });
}

/** Açı aralığı yardımcıları (ekran: +y aşağı). */
export const UP = -Math.PI / 2;
export const around = (a: number, w: number): [number, number] => [a - w, a + w];

/** Kısa, kontrollü sarsıntı. */
export const shake = (c: VfxCtx, k: VfxKit, ms: number, mag: number): void => {
  k.shake(c.scene, ms, mag);
};
