/**
 * HAYVAN / YARATIK yakın dövüşleri (Rend dili): ısırık çeneleri, tırmık, hücum izi.
 *   Bite (Grey Wolf): iki sıra fildişi diş (koyu diş eti, ağız gölgesi) hedefin GÖVDE ORTASINDA (Ömer: "ısırdığı yerin ortası karakterin
 *     ortası") açılıp vuruşta kapanır; diş delikleri, koyu kan, kopan kıl, kısa sarsıntı.
 *   Scorch Bite (Ash Hound): kömürleşmiş dişler, diş etinde kor, çene boyunca küçük alev dilleri; yanık delikleri (iç kor kararır), kor, duman.
 *   Run Down (Ash Hound): hücum boyunca zeminde yanık pati izleri + alçak alev şeridi + toz; vuruşta gövdeye çarpma: kor, alev dilleri, yanık
 *     tırmığı, toz (Ömer: "kurdun izi olacakmış da sonra ısırma gelecekmiş gibi" -> iz gerçekten çarpmayla biter).
 *   Gnaw (Ghoul): sarı, eğri-büğrü, eksik dişli çene iki kez çiğner (ikincisi vuruşta); çürük yeşili delikler, yeşil salya.
 *   Feast (Ghoul): çılgın üç pençe savuruşu (\ / X), çürük kenarlı yırtıklar, iri kan ve et zerresi.
 */
import type { MobHandVfx } from '../mob-vfx';
import { C, after, bits, clamp01, ei, eo, layer, lerp, mix, smoke, puffs, spray, type CombatantView, type G, type Pt, type VfxCtx, type VfxKit } from './core';
import { flame, FIRE, taper, xf } from './draw';
import { melee } from './flow';
import { flameField } from './flames';
import { BLOOD, BURN, FIBER, ROT, bodyAt, dust, embers, gore, punctures, wounds, type Stroke, type WoundPal } from './phys';

// ---------------------------------------------------------------------------------------------------------------------
// çene

interface JawStyle {
  tooth: number;
  toothDark: number;
  gum: number;
  mouth: number;
  /** Diş boyları (üst / alt; köpek dişleri uzun). */
  upper: number[];
  lower: number[];
  /** Düzensizlik (gulyabani). */
  crook?: number;
  /** Diş etinde kor (Ash Hound). */
  ember?: number;
}
const WOLF: JawStyle = { tooth: C('#e9dfc6'), toothDark: C('#8c7c62'), gum: C('#3a1814'), mouth: C('#0e0605'), upper: [10, 36, 12, 12, 36, 10], lower: [9, 30, 10, 30, 9] };
const HOUND: JawStyle = { tooth: C('#5a504a'), toothDark: C('#1e1816'), gum: C('#4a1608'), mouth: C('#140604'), upper: [14, 34, 18, 16, 18, 34, 14], lower: [12, 30, 14, 14, 30, 12], ember: 1 };
const GHOUL: JawStyle = { tooth: C('#cbbf82'), toothDark: C('#6a6232'), gum: C('#2a2a14'), mouth: C('#0a0a04'), upper: [16, 26, 0, 20, 14, 30, 10], lower: [14, 22, 18, 0, 24, 12], crook: 1 };

/**
 * Çene: merkez P, genişlik W, açıklık `open` (0 kapalı, 1 açık), eğim `tilt`. Dişler iki yay boyunca (üst yay aşağı, alt yay yukarı bakar,
 * yaylar ağız açıkken bombeli, kapanırken düzleşip birbirine geçer); kıvrık köpek dişleri, kalın koyu diş eti, arkada ağız gölgesi.
 */
function jaws(g: G, P: Pt, W: number, open: number, tilt: number, st: JawStyle, a: number, seed: number, t = 0): void {
  if (a <= 0.01) return;
  const f = xf(P, tilt);
  const H = W * 0.46;
  const o = Math.max(-0.08, open);
  // ağız gölgesi: içi koyu, kenarı yumuşak (iki katman)
  if (o > 0.04) {
    g.fillStyle(st.mouth, a * 0.28 * o).fillEllipse(P.x, P.y, W * 1.2, H * 2.1 * o + 14);
    g.fillStyle(st.mouth, a * 0.42 * o).fillEllipse(P.x, P.y, W * 0.96, H * 1.6 * o + 8);
  }
  const row = (sign: number, lens: number[]) => {
    const n = lens.length;
    const cy = sign * (H * 0.62 * o + 5); // yayın ortası
    const bow = 10 + 16 * Math.max(0, o); // yay bombesi (açıkken derin)
    const at = (u: number): Pt => f(lerp(-W / 2, W / 2, u), cy + sign * (u * 2 - 1) ** 2 * bow);
    // diş eti: kalın koyu şerit + ince açık iç kenar
    const gum = Array.from({ length: 15 }, (_, i) => at(i / 14));
    const gumOut = gum.map((p) => ({ x: p.x, y: p.y + sign * 5 }));
    // çenenin kapanış izi: diş etinin arkasında soluk hareket bulanıklığı (yalnızca kapanırken)
    if (o > 0.05 && o < 0.9) for (let j = 1; j <= 3; j++) g.lineStyle(10, C('#d8d0c4'), a * 0.07 * (4 - j)).strokePoints(gumOut.map((p) => ({ x: p.x, y: p.y + sign * j * 9 * o })), false);
    g.lineStyle(10, st.gum, a * 0.7).strokePoints(gumOut, false);
    g.lineStyle(2, mix(st.gum, 0x000000, 0.5), a * 0.8).strokePoints(gumOut.map((p) => ({ x: p.x, y: p.y + sign * 5 })), false);
    if (st.ember) g.lineStyle(3, C('#c8501a'), a * 0.6 * (0.7 + 0.3 * Math.sin(t * 13 + sign))).strokePoints(gum, false);
    for (let i = 0; i < n; i++) {
      const L = lens[i]!;
      if (L <= 0) continue;
      const u = (i + 0.5) / n;
      const cr = st.crook ? Math.sin(seed + i * 2.3) * 0.3 : 0;
      const b = at(u);
      const b2 = at(Math.min(1, u + 0.02));
      const ta = Math.atan2(b2.y - b.y, b2.x - b.x);
      const tx = Math.cos(ta);
      const ty = Math.sin(ta);
      // dişin yönü: yayın normali (ağzın içine), uca doğru ağız ortasına kıvrılır
      const nx = -ty * -sign;
      const ny = tx * -sign;
      const w = L > 24 ? 12 : 8;
      const curl = (u - 0.5) * -0.5 + cr;
      const pt = (s: number, side: number): Pt => {
        const ww = (w / 2) * (1 - s) ** 0.9 * side;
        const bend = curl * L * s * s;
        return { x: b.x + nx * L * s + tx * (ww + bend), y: b.y + ny * L * s + ty * (ww + bend) };
      };
      const toothPts = [pt(0, -1), pt(0.45, -1), pt(0.8, -1), pt(1, 0), pt(0.8, 1), pt(0.45, 1), pt(0, 1)];
      g.fillStyle(st.tooth, a).fillPoints(toothPts, true);
      // gölge yüz (hacim) + kök tarafı koyu
      g.fillStyle(st.toothDark, a * 0.75).fillPoints([pt(0, 0.1), pt(0.45, 0.2), pt(0.8, 0.2), pt(1, 0), pt(0.8, 1), pt(0.45, 1), pt(0, 1)], true);
      g.fillStyle(st.toothDark, a * 0.6).fillPoints([pt(0, -1), pt(0.2, -1), pt(0.2, 1), pt(0, 1)], true);
      g.lineStyle(1, mix(st.toothDark, 0x000000, 0.4), a).strokePoints(toothPts, true);
    }
  };
  row(-1, st.upper);
  row(1, st.lower);
}

interface BiteOpt {
  style: JawStyle;
  pal: WoundPal;
  /** Çiğneme sayısı (son çiğneme vuruşta). */
  chomps?: number;
  fire?: boolean;
}

function biteOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number, o: BiteOpt): void {
  const dir = v.container.x >= c.actor.container.x ? 1 : -1;
  const P = bodyAt(k, v, dir, 0, -0.05);
  const W = Math.max(124, Math.min(176, v.w * 1.0));
  const depth = v.container.depth + 3;
  const chomps = o.chomps ?? 1;
  const OPEN = k.slow(150); // her çiğnemenin açılıp kapanma süresi
  const t0 = T - OPEN * chomps;
  const HOLD = k.slow(70);
  const OUT = k.slow(130);
  const total = T + HOLD + OUT;
  const seed = k.rnd(0, 10);
  const tilt = -dir * 0.12;
  const x0 = v.container.x;
  layer(c, total, depth, (g, tm) => {
    if (tm < t0) return;
    const fx = v.container.x - x0;
    let open: number;
    let a: number;
    let push = 0;
    if (tm < T) {
      const tc = (tm - t0) % OPEN;
      const q = tc / OPEN;
      const first = tm - t0 < OPEN;
      // açılır (yavaş), sonra hızla kapanır
      open = q < 0.55 ? eo(q / 0.55, 2) * (first ? 1 : 0.8) : (1 - ei((q - 0.55) / 0.45, 2.2)) * (first ? 1 : 0.8);
      a = clamp01((tm - t0) / k.slow(40));
      push = -dir * 26 * (1 - clamp01((tm - t0) / (T - t0)));
    } else {
      const t = tm - T;
      const qo = clamp01((t - HOLD) / OUT);
      open = -0.06 * Math.exp(-t / k.slow(30)) + 0.25 * qo; // vuruşta dişler biraz geçer, sonra hafif açılıp söner
      a = 1 - qo;
    }
    const pp = { x: P.x + fx + push, y: P.y };
    jaws(g, pp, W, Math.max(-0.06, open), tilt, o.style, a, seed, tm / 1000);
    if (o.fire && a > 0.05) {
      // çene boyunca küçük alev dilleri (kömürleşmiş diş etinden)
      const H = W * 0.42 * Math.max(0, open);
      for (let i = 0; i < 5; i++) {
        const u = (i + 0.5) / 5;
        const x = pp.x + lerp(-W / 2, W / 2, u);
        flame(g, x, pp.y - H - 10, 26 + 10 * Math.sin(i * 1.7), 13, tm / 1000, i * 3.1 + seed, a * 0.85, dir * 0.2, FIRE);
        flame(g, x + 4, pp.y + H + 18, 18, 10, tm / 1000, i * 5.3 + seed, a * 0.6, dir * 0.2, FIRE);
      }
    }
  });
  // vuruş: delikler (diş uçlarının kapandığı yerler), zerreler
  const holes: Array<Pt & { r: number }> = [];
  for (const s of [-1, 1]) for (const u of [0.22, 0.78]) holes.push({ x: P.x + lerp(-W / 2, W / 2, u) + k.rnd(-4, 4), y: P.y + s * k.rnd(8, 14), r: k.rnd(3.2, 4.6) });
  holes.push({ x: P.x + k.rnd(-10, 10), y: P.y - 12, r: 3 });
  if (hurt(c, v)) punctures(c, k, v, T, holes, { pal: o.pal });
  after(c, T, () => {
    if (hurt(c, v)) gore(c, k, P, -Math.PI / 2 + dir * 0.6, o.fire ? 8 : 14, depth + 1, { cols: o.pal === ROT ? ['#2a3008', '#3e4410', '#3e080b', '#2a0507'] : undefined });
    spray(c, k, bits(k, 6, P, { kind: 'shard', ang: [-Math.PI + 0.3, -0.3], sp: [70, 190], size: [6, 10], life: [560, 860], cols: FIBER, jx: 24, jy: 18, up: [40, 100], vr: 6 }), depth + 1, 380);
    if (o.fire) {
      embers(c, k, P, 14, depth + 1, { sp: [80, 260], jx: 30, jy: 20 });
      smoke(c, k, puffs(k, P, 4, { hex: ['#2e2622', '#3a302a', '#26201c'], sx: 26, sy: 20, vy: [-90, -50], s0: [30, 46], s1: [70, 100], life: [560, 820], a: 0.3, drag: 1 }), depth);
    } else if (o.pal === ROT) {
      // yeşil salya damlaları (ağır, aşağı)
      spray(c, k, bits(k, 7, { x: P.x, y: P.y + 10 }, { kind: 'drop', ang: [Math.PI * 0.3, Math.PI * 0.7], sp: [30, 110], size: [3, 4.5], life: [520, 760], cols: ['#5e6c1e', '#4c5a18', '#6a7a22'], jx: W * 0.4, jy: 8 }), depth + 1, 900);
      smoke(c, k, puffs(k, P, 3, { hex: ['#5a6a2a', '#4a5a22'], sx: 24, sy: 18, vy: [-50, -20], s0: [30, 44], s1: [60, 90], life: [520, 760], a: 0.18, drag: 1 }), depth);
    } else smoke(c, k, puffs(k, P, 3, { hex: ['#3a1612', '#4a2018', '#2e1410'], sx: 24, sy: 20, vy: [-40, -10], s0: [30, 44], s1: [60, 84], life: [380, 560], a: 0.2, drag: 1.5 }), depth - 2);
  });
}

const hurt = (c: VfxCtx, v: CombatantView): boolean => !c.usage || c.usage.damages.some((d) => d.target === v.combatant.uid && d.amount > 0);

const bite: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => biteOn(c, k, v, T, { style: WOLF, pal: BLOOD }), { shake: [90, 0.0028] });
const scorchBite: MobHandVfx = (c, k, hitMs) =>
  melee(c, k, hitMs, (v, T) => biteOn(c, k, v, T, { style: HOUND, pal: BURN, fire: true }), { shake: [100, 0.003] });
const gnaw: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => biteOn(c, k, v, T, { style: GHOUL, pal: ROT, chomps: 2 }), { shake: [80, 0.0024] });

// ---------------------------------------------------------------------------------------------------------------------
// FEAST: üç çılgın pençe savuruşu

/** Gulyabani yırtığı: koyu kırmızı et, kenarı siyaha çalan çürük yeşil (net yeşil ağ değil). */
const FEAST_PAL = { edge: '#141408', flesh: '#4a0c0c', deep: '#200404', wet: '#5e1410', dry: '#140806', rim: '#a8b07a', drip: '#3a1a0c' };

function feastOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = v.container.x >= c.actor.container.x ? 1 : -1;
  const P = bodyAt(k, v, dir, 0.08, -0.06);
  const L = Math.max(170, Math.min(230, v.h * 0.78));
  const set = (ang: number, lag: number, scale: number, oy: number): Stroke[] =>
    [-15, 0, 15].map((off, i) => {
      const a = ang + (i - 1) * 0.035;
      const ux = dir * Math.cos(a);
      const uy = Math.sin(a);
      const o = { x: P.x - uy * off, y: P.y + oy + ux * off };
      const h = (L * scale * (i === 1 ? 1 : 0.82)) / 2;
      return { A: { x: o.x - ux * h, y: o.y - uy * h }, B: { x: o.x + ux * h, y: o.y + uy * h }, w: i === 1 ? 6 : 4.5, lag: lag + i * 10, bow: -dir * 8 };
    });
  // \ sonra / sonra büyük \ (son savuruş vuruşta): her savuruşta üç tırnak
  const swipes = [
    { ang: 1.0, lag: -170, sc: 0.7, oy: -24, flip: false },
    { ang: Math.PI - 1.05, lag: -90, sc: 0.72, oy: 16, flip: true },
    { ang: 1.15, lag: 0, sc: 1.0, oy: 0, flip: false },
  ];
  const strokes = swipes.flatMap((w) => {
    const st = set(w.ang, w.lag, w.sc, w.oy);
    return w.flip ? st.map((x) => ({ ...x, A: x.B, B: x.A })) : st;
  });
  wounds(c, k, v, T, strokes, { sw: 80, pal: FEAST_PAL, drips: 5, hold: 240, fade: 400 });
  // pençe savuruşu: her tırmıktan hemen önce soluk, ince hareket yayı (pençenin geçtiği yol)
  const x0 = v.container.x;
  layer(c, T + k.slow(160), v.container.depth + 3, (g, tm) => {
    const fx = v.container.x - x0;
    for (const w of swipes) {
      const t0 = T + k.slow(w.lag) - k.slow(90);
      const q = (tm - t0) / k.slow(110);
      if (q <= 0 || q >= 1) continue;
      const ux = dir * Math.cos(w.ang);
      const uy = Math.sin(w.ang);
      const h = (L * w.sc) / 2;
      const c0 = { x: P.x + fx, y: P.y + w.oy };
      const A = w.flip ? { x: c0.x + ux * h, y: c0.y + uy * h } : { x: c0.x - ux * h, y: c0.y - uy * h };
      const B = w.flip ? { x: c0.x - ux * h, y: c0.y - uy * h } : { x: c0.x + ux * h, y: c0.y + uy * h };
      const head = eo(q, 2);
      const tailU = Math.max(0, head - 0.45);
      const pts = Array.from({ length: 8 }, (_, i) => {
        const u = lerp(tailU, head, i / 7);
        return { x: lerp(A.x, B.x, u) - dir * Math.sin(Math.PI * u) * 14, y: lerp(A.y, B.y, u) };
      });
      const al = Math.sin(Math.PI * q);
      for (const off of [-15, 0, 15]) taper(g, pts.map((p) => ({ x: p.x - uy * off, y: p.y + ux * off })), 0, 4, C('#c8c8a0'), 0.32 * al);
    }
  });
  for (const lag of [-170, -90]) {
    after(c, T + k.slow(lag), () => gore(c, k, P, -Math.PI / 2 + dir * 0.8, 6, v.container.depth + 3, { cols: ['#2a3008', '#3e080b', '#2a0507', '#4a4410'] }));
  }
  after(c, T, () => {
    gore(c, k, P, -Math.PI / 2 + dir * 0.6, 16, v.container.depth + 3, { sp: [160, 380], size: [3, 6.5], cols: ['#2a3008', '#3e080b', '#2a0507', '#560c10', '#3e4410'] });
    spray(c, k, bits(k, 7, P, { kind: 'shard', ang: [-Math.PI + 0.3, -0.3], sp: [70, 200], size: [6, 11], life: [560, 860], cols: FIBER, jx: 26, jy: 22, up: [40, 120], vr: 6 }), v.container.depth + 3, 380);
    smoke(c, k, puffs(k, P, 4, { hex: ['#4a5a22', '#3a4a1a', '#5a6a2a'], sx: 30, sy: 26, vy: [-60, -20], s0: [30, 48], s1: [70, 100], life: [520, 760], a: 0.2, drag: 1.2 }), v.container.depth + 1);
  });
}
const feast: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => feastOn(c, k, v, T), { shake: [110, 0.0032] });

// ---------------------------------------------------------------------------------------------------------------------
// RUN DOWN: yanık pati izleri + alçak alev şeridi, sonra çarpma

function runDown(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  const v0 = c.targets[0];
  const start = k.feet(c.actor);
  return melee(
    c,
    k,
    hitMs,
    (v, T) => {
      const dir = v.container.x >= start.x ? 1 : -1;
      const P = bodyAt(k, v, dir, -0.2, 0.05);
      // çarpma: kor patlaması + alev dilleri gövdeye yaslanır + yanık tırmığı + toz
      const depth = v.container.depth + 3;
      const list = Array.from({ length: 7 }, (_, i) => ({ x: P.x - dir * 10 + Math.sin(i) * 8, y: P.y + (i - 3) * v.h * 0.11 + 30, h: 60 + 30 * Math.sin(i * 1.9), w: 26, seed: i * 7.7, at: 0 }));
      flameField(c, k, list, T + k.slow(520), depth, 'fire', (tm) => {
        if (tm < T - k.slow(40)) return { grow: 0, a: 0 };
        const q = clamp01((tm - T + k.slow(40)) / k.slow(520));
        // alevler hücum yönünde gövdeye yaslanır (yatık)
        return { grow: 1 - q * 0.6, a: q < 0.15 ? q / 0.15 : (1 - (q - 0.15) / 0.85) ** 1.4, lean: dir * 1.4 };
      });
      if (hurt(c, v)) {
        const st: Stroke[] = [-16, 0, 16].map((off, i) => ({ A: { x: P.x - dir * 50, y: P.y - 40 + off }, B: { x: P.x + dir * 60, y: P.y + 20 + off }, w: 6, lag: i * 12, bow: -dir * 6 }));
        wounds(c, k, v, T, st, { pal: BURN, drips: 2, sw: 90 });
      }
      after(c, T, () => {
        embers(c, k, P, 22, depth + 1, { sp: [120, 340], ang: [dir > 0 ? -1.4 : Math.PI - 1.6 + 1.2, dir > 0 ? 0.3 : Math.PI + 1.4], jx: 20, jy: 40 });
        dust(c, k, k.feet(v), v.container.depth - 1, { n: 6, w: 80, hex: ['#4a3a32', '#5a4a40', '#3a2e28'], a: 0.36 });
        smoke(c, k, puffs(k, P, 5, { hex: ['#2e2622', '#3a302a', '#26201c'], sx: 30, sy: 40, vx: [dir * 20, dir * 90], vy: [-100, -50], s0: [36, 54], s1: [80, 120], life: [620, 900], a: 0.3, drag: 1 }), depth - 1);
      });
    },
    {
      shake: [130, 0.0038],
      pre: () => {
        if (!v0) return;
        // hücum izi: atanın evinden hedefe pati izleri + alçak alev şeridi (hücumla eşzamanlı ~300 ms), sonra söner
        const end = { x: v0.container.x - (v0.container.x >= start.x ? 1 : -1) * v0.w * 0.5, y: k.feet(v0).y };
        const dir = end.x >= start.x ? 1 : -1;
        const D = Math.abs(end.x - start.x);
        const RUN = k.slow(300);
        const LIFE = k.slow(900);
        const steps = Math.max(4, Math.floor(D / 46));
        const prints = Array.from({ length: steps }, (_, i) => ({ u: (i + 0.5) / steps, side: i % 2 ? 1 : -1, seed: k.rnd(0, 9) }));
        const flames = Array.from({ length: Math.floor(steps * 1.6) }, (_, i) => ({ u: (i + 0.5) / Math.floor(steps * 1.6), seed: k.rnd(0, 50), h: k.rnd(18, 40) }));
        layer(c, RUN + LIFE, k.FLOOR_FX + 3, (g, tm) => {
          const head = clamp01(tm / RUN);
          for (const p of prints) {
            if (p.u > head) continue;
            const tp = tm - p.u * RUN;
            const age = clamp01(tp / LIFE);
            const x = lerp(start.x, end.x, p.u);
            const y = lerp(start.y, end.y, p.u) + p.side * 7;
            const a = (1 - age) ** 1.2;
            const hot = Math.max(0, 1 - tp / k.slow(380));
            // pati: ana yastık + 3 parmak, kömür; sıcakken kenarı kor
            g.fillStyle(C('#120a06'), 0.7 * a).fillEllipse(x, y, 16, 7);
            for (const [ox, oy] of [[dir * 10, -4], [dir * 11, 1], [dir * 9, 5]] as Array<[number, number]>) g.fillEllipse(x + ox, y + oy * 0.8, 6, 4);
            if (hot > 0.02) g.lineStyle(1.6, C('#d0581a'), 0.7 * hot * a).strokeEllipse(x, y, 17, 8);
          }
        });
        const trail = flames.map((f) => ({ x: lerp(start.x, end.x, f.u), y: lerp(start.y, end.y, f.u) + 4, h: f.h, w: 18, seed: f.seed, at: f.u }));
        flameField(
          c,
          k,
          trail,
          RUN + k.slow(520),
          k.FLOOR_FX + 4,
          'fire',
          () => ({ grow: 1, a: 1, lean: -dir * 0.8 }),
          {
            each: (f, tm) => {
              const tp = (tm - f.at * RUN) / k.slow(420);
              if (tp < 0 || tp > 1) return { g: 0, a: 0 };
              return { g: 0.5 + 0.5 * Math.min(1, tp * 4), a: 0.9 * (tp < 0.2 ? tp / 0.2 : (1 - (tp - 0.2) / 0.8) ** 1.3) };
            },
          },
        );
        // hücumun arkasında savrulan toz
        after(c, k.slow(120), () => dust(c, k, { x: lerp(start.x, end.x, 0.4), y: start.y }, k.FLOOR_FX + 5, { n: 4, w: D * 0.3, hex: ['#4a3a32', '#5a4a40'], a: 0.22, rise: 30 }));
      },
    },
  );
}

export const BEASTS: Readonly<Record<string, MobHandVfx>> = {
  bite,
  scorch_bite: scorchBite,
  gnaw,
  feast,
  run_down: runDown,
};
