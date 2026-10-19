/**
 * CADILAR / BATAKLIK / KUZGUN (büyüler Glyph dilinde katmanlı, ölçülü ışık; sıvı ve tüy gerçekçi fizikle):
 *   Cauldron Splash (Hedge Witch Morwen): kazandan fırlayan yeşil iksir topağı yayla ayağa düşer; iri damlalar, yayılan birikinti,
 *     kabarcık, gövdeye kıvrılan yeşil buhar (Wither).
 *   Hag's Mark (Morwen): hedefin göğsünde dikenli böğürtlen halkası örülür, ortasında yeşil göz açılır (kısık göz bebeği); vuruşta göz
 *     tam açılır, halka nabız atar; sonra göz kapanır, dikenler dumana döner.
 *   Lure Light (Morwen): fener ışığı küresi (ince kafes) büyüleyici dalgalı yolla süzülür, ardında altın zerreler; vuruşta yumuşak altın
 *     parlama, küre zerrelere dağılıp başın çevresinde döner (Jinxed).
 *   Hex Bolt (Fen Witchling): dönen ince lanet halkalı mor-pembe küre, yeşil ruh izi; vuruşta gövdede üç çentikli lanet dairesi + sarmal duman.
 *   Bog Curse (Fen Witchling, 2x3): her hücrede bulanık bataklık suyu, kabarcıklar, yükselen sarı-yeşil miazma; vuruşta bataklık gazı.
 *   Spark (Will-o'-Wisp): dalgalı yolla süzülen camgöbeği bataklık ışığı (alev biçimli); vuruşta kısa dallı şimşekler, halka, zerre.
 *   Marsh Glow (Will-o'-Wisp, dost): zeminde bataklık ışığı halkası, yumuşak yeşil ışık sütunu, sarmal yükselen zerreler ve küçük ışıklar.
 *   Raven's Peck (Raven Seer): kanat çırpan kuzgun süzülerek gelir, vuruşta gagalar; siyah tüyler savrulur, kuzgun yukarı dönüp tüye dağılır.
 *   Murder of Crows (Raven Seer, 2x2): alanın üstünde dar bir girdapta dönen karga sürüsü (Ömer: "biraz yukarı, birbirinden çok
 *     dağılmasın"); vuruşta hücrelere dalış, tüy patlaması, zeminde mor leke; sonra dağılıp kaybolurlar.
 */
import type { MobHandVfx } from '../mob-vfx';
import { C, FLAT, TAU, UP, after, bits, clamp01, eo, layer, layers, lerp, puffs, smoke, spray, type CombatantView, type G, type Pt, type VfxCtx, type VfxKit } from './core';
import { bird, blob, blobPts, flame, taper, xf, type FirePal } from './draw';
import { fly } from './bolts';
import { area, areaCenter, aura, bolt } from './flow';
import { bolt as zap, columnFx, fumes, motes, orb, rays, ringFx, sigilFx, spiralFx } from './magic';
import { bodyAt, cellDepth, gore } from './phys';
import { condense, floorGlow, top } from './grand';

const hurt = (c: VfxCtx, v: CombatantView): boolean => !c.usage || c.usage.damages.some((d) => d.target === v.combatant.uid && d.amount > 0);
const dirTo = (c: VfxCtx, v: CombatantView | Pt): number => (('container' in v ? v.container.x : v.x) >= c.actor.container.x ? 1 : -1);
const fromHand = (c: VfxCtx, k: VfxKit, dir: number, up = 24): Pt => ({ x: k.spot(c.actor).x + dir * c.actor.w * 0.35, y: k.spot(c.actor).y - up });

const BREW = { deep: C('#1e3a0c'), body: C('#5aa020'), light: C('#a6e22e'), foam: C('#d8f08a') };
const BREW_HEX = ['#a6e22e', '#7ac020', '#5aa020', '#c8f060'];

// ---------------------------------------------------------------------------------------------------------------------
// CAULDRON SPLASH

function cauldronSplash(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(c, k, hitMs, '#a6e22e', (v, F) => {
    const dir = dirTo(c, v);
    const to = { x: v.container.x - dir * v.w * 0.1, y: k.feet(v).y - 6 };
    const rs = blob(k, 18, 0.24);
    const LIFE = k.slow(1300);
    fly(c, k, {
      from: fromHand(c, k, dir, 10),
      to,
      F,
      arc: 190,
      hist: 10,
      depth: v.container.depth + 2,
      hold: LIFE,
      draw: (g, p, an, _q, tm, hist) => {
        // sıvı topak: hıza göre uzar, titrer; arkasında damla izi
        for (let i = 2; i < hist.length; i += 2) g.fillStyle(BREW.body, (1 - i / hist.length) * 0.7).fillCircle(hist[i]!.x, hist[i]!.y, 6 * (1 - i / hist.length) + 1.5);
        const f = xf(p, an);
        const w = 1 + 0.12 * Math.sin(tm / 30);
        g.fillStyle(BREW.deep, 0.9).fillEllipse(p.x, p.y, 34 * w, 24 / w);
        g.fillStyle(BREW.body, 1).fillPoints([f(-16, 0), f(-6, -11), f(10, -10), f(17, 0), f(8, 10), f(-8, 10)], true);
        g.fillStyle(BREW.light, 0.9).fillEllipse(p.x - 3, p.y - 4, 12, 6);
        g.fillStyle(BREW.foam, 0.8).fillCircle(p.x - 5, p.y - 5, 2.5);
      },
      stuck: (g, p, _an, t) => {
        const q = t / LIFE;
        const al = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
        const sp = eo(clamp01(t / k.slow(200)), 2.2);
        g.fillStyle(BREW.deep, 0.6 * al).fillPoints(blobPts({ x: p.x, y: p.y + 6 }, 92 * sp, 28 * sp, rs), true);
        g.fillStyle(BREW.body, 0.7 * al).fillPoints(blobPts({ x: p.x, y: p.y + 5 }, 72 * sp, 20 * sp, rs, 0.4), true);
        g.fillStyle(BREW.light, 0.35 * al).fillEllipse(p.x - 20, p.y + 2, 36 * sp, 6 * sp);
        for (let i = 0; i < 6; i++) {
          const ph = (t / k.slow(380) + i * 0.29) % 1;
          g.lineStyle(1.6, BREW.foam, al * (1 - ph) * 0.8).strokeCircle(p.x + Math.sin(i * 2.3) * 56 * sp, p.y + 6 + Math.cos(i * 1.7) * 12 * sp - ph * 6, 2 + ph * 5);
        }
      },
    });
    after(c, F, () => {
      spray(c, k, bits(k, 24, to, { kind: 'drop', ang: [-Math.PI + 0.2, -0.2], sp: [160, 420], size: [3, 5.5], life: [420, 680], cols: BREW_HEX, jx: 14, jy: 4, floor: to.y + 8 }), v.container.depth + 3, 1400);
      fumes(c, k, to, { n: 6, spread: 50, h: 200, cols: ['#7ac020', '#a6e22e', '#5a8a20'], life: 1300, a: 0.38, depth: v.container.depth + 2, w: 10, delay: 260, sway: 18 });
      if (hurt(c, v)) spray(c, k, bits(k, 8, bodyAt(k, v, dir, 0, 0.3), { kind: 'drop', ang: [Math.PI * 0.35, Math.PI * 0.65], sp: [20, 60], size: [3, 4.5], life: [700, 1000], cols: BREW_HEX, jx: 26, jy: 30 }), v.container.depth + 3, 700);
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// HAG'S MARK: dikenli halka + göz

function eye(g: G, p: Pt, W: number, open: number, a: number, t: number): void {
  const H = W * 0.42 * open;
  const lid = (s: number) => Array.from({ length: 13 }, (_, i) => {
    const u = i / 12;
    return { x: p.x - W / 2 + W * u, y: p.y + s * Math.sin(Math.PI * u) * H };
  });
  if (open > 0.03) {
    g.fillStyle(C('#0e1a06'), a * 0.9).fillPoints([...lid(-1), ...lid(1).reverse()], true);
    // iris + kısık göz bebeği
    const ir = Math.min(H, W * 0.24);
    g.fillStyle(C('#4a8a18'), a).fillCircle(p.x, p.y, ir);
    g.fillStyle(C('#a6e22e'), a * 0.9).fillCircle(p.x, p.y, ir * 0.72);
    g.fillStyle(C('#0a1004'), a).fillEllipse(p.x, p.y, ir * 0.3, ir * 1.5);
    g.fillStyle(0xffffff, a * 0.5).fillCircle(p.x - ir * 0.35, p.y - ir * 0.35, ir * 0.16);
  }
  g.lineStyle(4, C('#1a2a0c'), a).strokePoints(lid(-1), false).strokePoints(lid(1), false);
  g.lineStyle(1.6, C('#c8f060'), a * 0.8).strokePoints(lid(-1).map((q) => ({ x: q.x, y: q.y - 2 })), false);
  // kirpik dikenleri
  for (let i = 1; i < 6; i++) {
    const u = i / 6;
    const q = { x: p.x - W / 2 + W * u, y: p.y - Math.sin(Math.PI * u) * H };
    g.lineStyle(2, C('#1a2a0c'), a).lineBetween(q.x, q.y, q.x + (u - 0.5) * 10, q.y - 10 - 4 * Math.sin(t * 5 + i));
  }
}

function hagsMark(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(c, k, hitMs, '#a6e22e', (v, F) => {
    const P = bodyAt(k, v, dirTo(c, v), 0, -0.25);
    const R = Math.max(62, v.w * 0.55);
    const thorns = Array.from({ length: 3 }, (_, i) => ({ ph: (i * TAU) / 3 + k.rnd(-0.3, 0.3), wob: k.rnd(6, 10) }));
    const END = F + k.slow(1000);
    const x0 = v.container.x;
    layer(c, END, v.container.depth + 3, (g, tm) => {
      const fx = v.container.x - x0;
      const p = { x: P.x + fx, y: P.y };
      const q = clamp01(tm / F);
      const post = clamp01((tm - F - k.slow(450)) / k.slow(550));
      const a = (1 - post ** 1.2) * clamp01(q * 3);
      const pulse = tm >= F ? Math.exp(-(tm - F) / k.slow(200)) : 0;
      // böğürtlen halkası: üç dikenli dal sarmal örülür (dikenler sıklaşır)
      for (const th of thorns) {
        const L = eo(q, 1.6) * TAU * 0.9;
        const pts = Array.from({ length: 30 }, (_, i) => {
          const an = th.ph + (L * i) / 29;
          const rr = R * (1 + 0.08 * pulse) + Math.sin(an * 4 + th.ph) * th.wob;
          return { x: p.x + Math.cos(an) * rr, y: p.y + Math.sin(an) * rr * 0.85 };
        });
        taper(g, pts, 2, 6, C('#1a1a0c'), a);
        g.lineStyle(1.4, C('#4a5a1e'), a * 0.8).strokePoints(pts, false);
        for (let i = 3; i < pts.length; i += 4) {
          const t0 = pts[i]!;
          const t1 = pts[i - 1]!;
          const nx = -(t0.y - t1.y);
          const ny = t0.x - t1.x;
          const l = Math.hypot(nx, ny) || 1;
          g.fillStyle(C('#1a1a0c'), a).fillTriangle(t0.x - 3, t0.y, t0.x + 3, t0.y, t0.x + (nx / l) * 9, t0.y + (ny / l) * 9);
        }
      }
      // göz: vuruşa doğru açılır, sonra kapanır
      const open = tm < F ? eo(clamp01((q - 0.3) / 0.7), 2) * 0.8 : tm < F + k.slow(400) ? 0.8 + 0.2 * pulse : 0.8 * (1 - clamp01((tm - F - k.slow(400)) / k.slow(260)));
      eye(g, p, R * 1.1, open, a, tm / 1000);
    });
    // yeşil hale ve vuruş nabzı (ADD, düşük)
    after(c, F, () => {
      ringFx(c, k, P, { r0: R * 0.6, r1: R * 1.7, dur: 420, col: '#4a8a18', pale: '#c8f060', w: 5, flat: 0.85, depth: v.container.depth + 4 });
      motes(c, k, P, { n: 12, r: R, rise: 40, cols: ['#a6e22e', '#c8f060'], size: [1.6, 2.6], life: 800, depth: v.container.depth + 4, flat: 0.85 });
    });
    after(c, F + k.slow(500), () => smoke(c, k, puffs(k, P, 5, { hex: ['#2a3418', '#3a4420', '#1e2812'], sx: R * 0.8, sy: R * 0.6, vy: [-60, -20], s0: [30, 44], s1: [70, 100], life: [600, 850], a: 0.34, drag: 1.2 }), v.container.depth + 3));
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// LURE LIGHT

function lureLight(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(c, k, hitMs, '#e0b04a', (v, F) => {
    const dir = dirTo(c, v);
    const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.3));
    const from = fromHand(c, k, dir, 40);
    fly(c, k, {
      from,
      to,
      F,
      arc: 80,
      wave: 40,
      waveF: 3,
      hist: 16,
      depth: v.container.depth + 3,
      draw: (g, p, _an, q, tm, hist) => {
        // altın zerre izi
        for (let i = 2; i < hist.length; i += 2) {
          const h = hist[i]!;
          g.fillStyle(C('#ffd27a'), (1 - i / hist.length) * 0.6).fillCircle(h.x + Math.sin(i * 1.7 + tm / 60) * 6, h.y + Math.cos(i * 1.3 + tm / 70) * 6, 2.2);
        }
        orb(g, p, 12 + 2 * Math.sin(tm / 50), C('#8a5a10'), C('#f0b848'), C('#fff4cc'), 1, tm / 1000);
        // ince fener kafesi
        g.lineStyle(1.4, C('#5a3a10'), 0.9).strokeCircle(p.x, p.y, 15);
        g.lineBetween(p.x, p.y - 15, p.x, p.y + 15);
        g.lineBetween(p.x - 10, p.y - 11, p.x + 10, p.y + 11);
        g.lineStyle(2, C('#5a3a10'), 0.9).lineBetween(p.x - 5, p.y - 18, p.x + 5, p.y - 18);
        void q;
      },
    });
    after(c, F, () => {
      layer(
        c,
        k.slow(380),
        v.container.depth + 4,
        (g, tm) => {
          const q = tm / k.slow(380);
          const a = (1 - q) ** 1.5;
          g.fillStyle(C('#f0b848'), 0.25 * a).fillCircle(to.x, to.y, 50 + 30 * q);
          rays(g, to, 4, 70 + 30 * q, 6, C('#e0a83a'), C('#fff4cc'), a, Math.PI / 4);
        },
        true,
      );
      // Jinxed: başın çevresinde dönen altın zerreler
      motes(c, k, { x: v.container.x, y: v.container.y - v.h - 10 }, { n: 8, r: 34, rise: 6, cols: ['#ffd27a', '#e0a83a'], size: [1.8, 2.8], life: 1000, depth: v.container.depth + 4, orbit: 1.5, flat: 0.3, delay: 80 });
      spray(c, k, bits(k, 12, to, { kind: 'dot', ang: [-Math.PI, Math.PI], sp: [60, 200], size: [1.4, 2.4], life: [400, 700], cols: ['#ffd27a', '#fff0c0'], drag: 2.4 }), v.container.depth + 4, 0, true);
      if (hurt(c, v)) gore(c, k, to, UP, 3, v.container.depth + 4, { sp: [60, 140] });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// HEX BOLT

function hexBolt(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(c, k, hitMs, '#b04fa8', (v, F) => {
    const dir = dirTo(c, v);
    const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.15));
    fly(c, k, {
      from: fromHand(c, k, dir),
      to,
      F,
      arc: 30,
      hist: 12,
      depth: v.container.depth + 3,
      draw: (g, p, _an, _q, tm, hist) => {
        // yeşil ruh izi (dalgalı)
        const pts = hist.map((h, i) => ({ x: h.x, y: h.y + Math.sin(i * 0.9 + tm / 40) * 6 }));
        taper(g, [...pts].reverse(), 0, 9, C('#4a8a3a'), 0.4);
        orb(g, p, 11, C('#5a1a5a'), C('#c04fb8'), C('#ffd0f4'), 1, tm / 1000);
        // dönen ince lanet halkası (üç çentik)
        const rot = tm / 70;
        g.lineStyle(1.6, C('#e08ad8'), 0.85).strokeEllipse(p.x, p.y, 40, 16);
        for (let i = 0; i < 3; i++) {
          const an = rot + (i * TAU) / 3;
          const q = { x: p.x + Math.cos(an) * 20, y: p.y + Math.sin(an) * 8 };
          g.fillStyle(C('#ffd0f4'), 0.9).fillCircle(q.x, q.y, 2.4);
        }
      },
    });
    after(c, F, () => {
      // gövdede lanet dairesi: halka + üç çentik + dönen sarmal
      layer(
        c,
        k.slow(650),
        v.container.depth + 4,
        (g, tm) => {
          const q = tm / k.slow(650);
          const a = q < 0.15 ? q / 0.15 : (1 - (q - 0.15) / 0.85) ** 1.3;
          const r = 34 + 22 * eo(q, 2);
          g.lineStyle(5, C('#5a1a5a'), 0.4 * a).strokeCircle(to.x, to.y, r);
          g.lineStyle(2, C('#e08ad8'), a).strokeCircle(to.x, to.y, r);
          for (let i = 0; i < 3; i++) {
            const an = -Math.PI / 2 + (i * TAU) / 3 + q * 1.5;
            g.lineStyle(2.4, C('#ffd0f4'), a).lineBetween(to.x + Math.cos(an) * r * 0.75, to.y + Math.sin(an) * r * 0.75, to.x + Math.cos(an) * r * 1.2, to.y + Math.sin(an) * r * 1.2);
          }
          const sp = Array.from({ length: 16 }, (_, i) => {
            const an = q * 6 + i * 0.5;
            const rr = r * 0.85 * (i / 15);
            return { x: to.x + Math.cos(an) * rr, y: to.y + Math.sin(an) * rr };
          });
          g.lineStyle(1.6, C('#c04fb8'), a * 0.8).strokePoints(sp, false);
        },
        true,
      );
      smoke(c, k, puffs(k, to, 4, { hex: ['#4a2a4a', '#3a3a2a', '#5a2a5a'], sx: 14, sy: 14, vy: [-60, -20], s0: [26, 40], s1: [70, 100], life: [600, 900], a: 0.32, drag: 1.2 }), v.container.depth + 3);
      if (hurt(c, v)) gore(c, k, to, UP, 4, v.container.depth + 4, { sp: [60, 160] });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// BOG CURSE (2x3)

function bogCurse(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#9cab3c', (a) => {
    for (const st of a.stages)
      for (const p of st.cells) {
        const t0 = Math.max(0, st.at - k.slow(420));
        const rs = blob(k, 16, 0.22);
        const END = st.at + k.slow(1300);
        layer(c, END, k.FLOOR_FX + 3, (g, tm) => {
          if (tm < t0) return;
          const grow = eo((tm - t0) / (st.at - t0), 1.8);
          const post = clamp01((tm - st.at - k.slow(400)) / k.slow(900));
          const al = grow * (1 - post);
          g.fillStyle(C('#1a1e0c'), 0.65 * al).fillPoints(blobPts(p, 66 * grow, 22 * grow, rs), true);
          g.fillStyle(C('#3a4214'), 0.6 * al).fillPoints(blobPts({ x: p.x, y: p.y - 2 }, 50 * grow, 15 * grow, rs, 0.5), true);
          g.fillStyle(C('#9cab3c'), 0.18 * al).fillEllipse(p.x - 12, p.y - 4, 30 * grow, 5 * grow);
          for (let i = 0; i < 5; i++) {
            const ph = (tm / k.slow(460) + i * 0.31 + p.x * 0.01) % 1;
            g.lineStyle(1.6, C('#c8d86a'), al * (1 - ph) * 0.7).strokeCircle(p.x + Math.sin(i * 2.1 + p.x) * 40 * grow, p.y + Math.cos(i * 1.6) * 10 * grow - ph * 6, 2 + ph * 6);
          }
        });
        after(c, t0, () => fumes(c, k, p, { n: 4, spread: 40, h: 170, cols: ['#9cab3c', '#b8c850', '#6a7a24'], life: 1200, a: 0.34, depth: cellDepth(p, 2), w: 11, delay: 200, sway: 16 }));
        after(c, st.at, () => {
          smoke(c, k, puffs(k, { x: p.x, y: p.y - 10 }, 3, { hex: ['#8a9a3a', '#a8b84a', '#6a7a2a'], sx: 30, sy: 6, vy: [-120, -60], s0: [40, 56], s1: [100, 140], life: [800, 1100], a: 0.4, drag: 1.2 }), cellDepth(p, 3));
          spray(c, k, bits(k, 6, p, { kind: 'drop', ang: [-Math.PI + 0.4, -0.4], sp: [100, 240], size: [2.5, 4], life: [400, 600], cols: ['#3a4214', '#5a6a20', '#9cab3c'], jx: 30, jy: 6, floor: p.y + 4 }), cellDepth(p, 4), 1200);
        });
        if (st.cells[0] === p) after(c, st.at, () => { for (const v of st.victims) if (hurt(c, v)) motes(c, k, k.spot(v), { n: 6, r: v.w * 0.4, rise: 60, cols: ['#9cab3c', '#c8d86a'], size: [1.4, 2.2], life: 700, depth: v.container.depth + 3, flat: 1 }); });
      }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// SPARK (Will-o'-Wisp)

const WISP_PAL: FirePal = { dark: C('#0c3a34'), red: C('#1a6a5e'), orange: C('#3aa898'), yellow: C('#8ae0d0'), core: C('#e0fff8') };

function wispSpark(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(c, k, hitMs, '#6fc9b8', (v, F) => {
    const dir = dirTo(c, v);
    const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.15));
    fly(c, k, {
      from: fromHand(c, k, dir, 30),
      to,
      F,
      arc: 50,
      wave: 34,
      waveF: 4,
      hist: 14,
      depth: v.container.depth + 3,
      draw: (g, p, _an, _q, tm, hist) => {
        for (let i = 1; i < hist.length; i++) g.fillStyle(C('#3aa898'), (1 - i / hist.length) * 0.5).fillCircle(hist[i]!.x, hist[i]!.y, 6 * (1 - i / hist.length) + 1);
        flame(g, p.x, p.y + 12, 34, 20, tm / 1000, 3, 1, -dir * 0.6, WISP_PAL);
      },
    });
    after(c, F, () => {
      const seeds = [k.rnd(0, 9), k.rnd(0, 9), k.rnd(0, 9)];
      layer(
        c,
        k.slow(260),
        v.container.depth + 4,
        (g, tm) => {
          const q = tm / k.slow(260);
          const a = (1 - q) ** 1.2;
          seeds.forEach((s, i) => {
            const an = -Math.PI / 2 + (i - 1) * 0.9 + Math.sin(s) * 0.3;
            const e = { x: to.x + Math.cos(an) * 70, y: to.y + Math.sin(an) * 60 + 30 };
            zap(g, to, e, s + Math.floor(tm / 40), { jag: 10, w: 3, col: C('#6fc9b8'), core: C('#e0fff8'), halo: C('#1a6a5e'), alpha: a, branch: true });
          });
        },
        true,
      );
      ringFx(c, k, to, { r0: 8, r1: 60, dur: 280, col: '#1a6a5e', pale: '#8ae0d0', w: 4, flat: 1, depth: v.container.depth + 4 });
      motes(c, k, to, { n: 10, r: 30, rise: 70, cols: ['#6fc9b8', '#8ae0d0'], size: [1.4, 2.4], life: 700, depth: v.container.depth + 4, flat: 1 });
      if (hurt(c, v)) gore(c, k, to, UP, 3, v.container.depth + 4, { sp: [60, 140] });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// MARSH GLOW (dost)

function marshGlowOn(c: VfxCtx, k: VfxKit, v: CombatantView, at: number): void {
  const foot = k.feet(v);
  const END = at + k.slow(900);
  const R0 = Math.max(76, v.w * 0.72);
  sigilFx(c, k, foot, R0, { col: C('#5ac87a'), pale: C('#c8ffd8'), deep: C('#1a5a2a'), ticks: 8, inner: 'none', arcs: 3, peak: at, end: END, spin: 0.6, plate: { hex: '#5ac87a', a: 0.08 } });
  // görkem (Ömer 2026-10-20): ters dönen ikinci halka, zeminde soluk bataklık ışığı, doruğa toplanan ışık zerreleri, küçük süzülen bataklık ışıkları
  sigilFx(c, k, foot, R0 * 1.5, { col: C('#4ab86a'), pale: C('#c8ffd8'), deep: C('#1a5a2a'), ticks: 12, inner: 'none', arcs: 2, peak: at + k.slow(140), end: END + k.slow(200), spin: -0.7 });
  floorGlow(c, k, [{ p: foot, at }], { rx: R0 * 1.1, hex: '#2a7a40', core: '#7dff9b', a: 0.2, pre: 200, hold: 520, fade: 800, pulse: 0.12 });
  columnFx(c, k, foot, { h: v.h * 1.5, w: v.w * 0.42, col: '#5ac87a', core: '#d8ffe0', at: at - k.slow(80), dur: 620, depth: top(k, 2), a: 0.55, rise: 200 });
  spiralFx(c, k, foot, v.container.depth, { H: v.h * 1.2, R: Math.max(40, v.w * 0.5), at: at - k.slow(120), dur: 700, cols: ['#1a5a2a', '#5ac87a', '#d8ffe0'], w: 6, a: 0.7 });
  condense(c, k, { x: foot.x, y: foot.y - 16 }, { hex: ['#7dff9b', '#c8ffd8', '#5ac87a'], at, r: R0 * 1.3, depth: top(k, 4), n: 16, life: 460, flash: { hex: '#7dff9b', w: R0 * 1.5, h: R0 * 1.0, a: 0.3 } });
  motes(c, k, { x: foot.x, y: foot.y - 10 }, { n: 24, r: v.w * 0.55, rise: v.h * 1.2, cols: ['#7dff9b', '#c8ffd8', '#5ac87a'], size: [1.6, 2.6], life: 1000, depth: top(k, 3), delay: 500 });
  motes(c, k, { x: foot.x, y: foot.y - 10 }, { n: 4, r: v.w * 0.7, rise: v.h * 0.9, cols: ['#c8ffd8', '#7dff9b'], size: [3.2, 4.4], life: 1300, depth: top(k, 3), delay: 700, orbit: 0.5, a: 0.8 });
}
const marshGlow: MobHandVfx = (c, k, hitMs) => aura(c, k, hitMs, '#7dff9b', (v, at) => marshGlowOn(c, k, v, at));

// ---------------------------------------------------------------------------------------------------------------------
// RAVEN'S PECK

const RAVEN = { body: C('#120c18'), rim: C('#9a6ad8') };
const FEATHER = ['#120c18', '#1e1626', '#2a2034', '#0c0810'];

function ravensPeck(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(c, k, hitMs, '#a55cff', (v, F) => {
    const dir = dirTo(c, v);
    const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.35));
    const from = fromHand(c, k, dir, 60);
    const OUT = k.slow(360);
    layer(c, F + OUT, v.container.depth + 3, (g, tm) => {
      let p: Pt;
      let flap: number;
      let a = 1;
      let tilt = 0;
      if (tm < F) {
        const q = tm / F;
        const e = eo(q, 1.2);
        p = { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) - Math.sin(Math.PI * e) * 90 + (q > 0.8 ? (q - 0.8) * 60 : 0) };
        flap = Math.sin(tm / k.slow(28)) * (q > 0.8 ? 0.4 : 1);
        tilt = q > 0.75 ? 0.5 * (q - 0.75) / 0.25 : -0.15;
      } else {
        // gagaladıktan sonra yukarı geri döner ve tüye dağılır
        const q = (tm - F) / OUT;
        p = { x: to.x - dir * 80 * eo(q), y: to.y - 130 * eo(q) };
        flap = Math.sin(tm / k.slow(22));
        a = (1 - q) ** 1.5;
        tilt = -0.5;
      }
      bird(g, p.x, p.y, 48, flap, dir, RAVEN.body, RAVEN.rim, a, tilt);
    });
    after(c, F, () => {
      spray(c, k, bits(k, 14, to, { kind: 'leaf', ang: [-Math.PI, 0.4], sp: [90, 260], size: [6, 11], life: [800, 1200], cols: FEATHER, jx: 12, jy: 12, drag: 2.6, sway: 12, up: [30, 100], vr: 5 }), v.container.depth + 4, 150);
      layer(
        c,
        k.slow(260),
        v.container.depth + 4,
        (g, tm) => {
          const q = tm / k.slow(260);
          rays(g, to, 6, 46 + 20 * q, 4, C('#7a3ac0'), C('#e0c8ff'), (1 - q) ** 1.4, 0.4);
        },
        true,
      );
      smoke(c, k, puffs(k, to, 3, { hex: ['#2a1a3a', '#3a2a4a'], sx: 12, sy: 12, vy: [-60, -20], s0: [24, 34], s1: [60, 80], life: [500, 700], a: 0.3, drag: 1.4, delay: [200, 320] }), v.container.depth + 3);
      if (hurt(c, v)) gore(c, k, to, UP - dir * 0.4, 7, v.container.depth + 4, { sp: [80, 200] });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// MURDER OF CROWS (2x2)

function murderOfCrows(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#a55cff', (a) => {
    const C0 = areaCenter(c, k, a.cells);
    const H = 230; // girdabın zemin üstü yüksekliği (Ömer: biraz yukarı)
    const n = 10;
    const crows = Array.from({ length: n }, (_, i) => ({ ph: (i / n) * TAU, r: k.rnd(50, 95), hy: k.rnd(-26, 26), s: k.rnd(30, 40), cell: a.cells[i % a.cells.length]!, f: k.rnd(0, 9) }));
    const t0 = a.wu * 0.25;
    const DIVE = k.slow(160);
    const OUT = k.slow(420);
    const END = a.at + OUT;
    const depth = Math.max(...a.cells.map((p) => p.y)) + 20;
    layers(c, END, [{ depth: k.FLOOR_FX + 4, add: true }, { depth }], ([floor, air], tm) => {
      if (tm < t0) return;
      const t = tm / 1000;
      // zeminde dönen mor gölge halkası
      const pre = eo((tm - t0) / (a.at - t0), 1.5);
      const post = clamp01((tm - a.at) / OUT);
      floor!.lineStyle(6, C('#3a1a6a'), 0.35 * pre * (1 - post)).strokeEllipse(C0.x, C0.y, 220 * pre, 220 * pre * FLAT);
      floor!.lineStyle(2, C('#9a6ad8'), 0.4 * pre * (1 - post)).strokeEllipse(C0.x, C0.y, 200 * pre, 200 * pre * FLAT);
      for (const cr of crows) {
        let p: Pt;
        let a2 = 1;
        let tilt = 0;
        const orbitAng = cr.ph + (tm - t0) / k.slow(260);
        const orbitP = { x: C0.x + Math.cos(orbitAng) * cr.r, y: C0.y - H + cr.hy + Math.sin(orbitAng) * cr.r * 0.35 };
        const dirX = -Math.sin(orbitAng) >= 0 ? 1 : -1;
        if (tm < a.at - DIVE) {
          p = orbitP;
          a2 = clamp01((tm - t0) / k.slow(200));
        } else if (tm < a.at) {
          const q = (tm - a.at + DIVE) / DIVE;
          p = { x: lerp(orbitP.x, cr.cell.x, ei2(q)), y: lerp(orbitP.y, cr.cell.y - 30, ei2(q)) };
          tilt = 0.8;
        } else {
          const q = (tm - a.at) / OUT;
          const an = Math.atan2(cr.cell.y - C0.y, cr.cell.x - C0.x + 0.01) + cr.ph * 0.3;
          p = { x: cr.cell.x + Math.cos(an) * 260 * eo(q), y: cr.cell.y - 30 - 240 * eo(q, 1.4) };
          a2 = (1 - q) ** 1.3;
          tilt = -0.4;
        }
        bird(air!, p.x, p.y, cr.s, Math.sin(t * 22 + cr.f), dirX, RAVEN.body, RAVEN.rim, a2, tilt);
      }
    });
    after(c, a.at, () => {
      for (const p of a.cells) {
        spray(c, k, bits(k, 10, { x: p.x, y: p.y - 30 }, { kind: 'leaf', ang: [-Math.PI, 0], sp: [100, 280], size: [6, 10], life: [800, 1200], cols: FEATHER, jx: 30, jy: 10, drag: 2.6, sway: 12, up: [20, 80], vr: 5 }), cellDepth(p, 4), 150);
        layer(
          c,
          k.slow(900),
          k.FLOOR_FX + 3,
          (g, tm) => {
            const q = tm / k.slow(900);
            const al = q < 0.1 ? q / 0.1 : (1 - (q - 0.1) / 0.9) ** 1.2;
            g.fillStyle(C('#1a0e2a'), 0.45 * al).fillEllipse(p.x, p.y, 110, 36);
            g.lineStyle(2, C('#7a3ac0'), 0.4 * al).strokeEllipse(p.x, p.y, 96, 30);
          },
          false,
        );
      }
      for (const v of c.targets) if (hurt(c, v)) gore(c, k, k.spot(v), UP, 6, v.container.depth + 3, { sp: [80, 200] });
      k.shake(c.scene, 90, 0.0028);
    });
  });
}
const ei2 = (u: number) => clamp01(u) ** 2;

export const HEXES: Readonly<Record<string, MobHandVfx>> = {
  cauldron_splash: cauldronSplash,
  hags_mark: hagsMark,
  lure_light: lureLight,
  hex_bolt: hexBolt,
  bog_curse: bogCurse,
  wisp_spark: wispSpark,
  marsh_glow: marshGlow,
  ravens_peck: ravensPeck,
  murder_of_crows: murderOfCrows,
};
