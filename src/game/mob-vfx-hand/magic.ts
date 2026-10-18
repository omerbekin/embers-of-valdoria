/**
 * BÜYÜ efekt parçaları (Glyph of Breaking dili: katmanlı, okunur, ölçülü ışık): yükselen dalgalı buhar / ruh telleri, ışık zerrecikleri
 * (yükselen ya da sarmal), zamanlı zemin rün dairesi, ışık sütunu, küre (mermi), kırık şimşek, ince ışın yıldızı, ses / şok halkası.
 * ADD yalnızca küçük çekirdeklerde ve düşük alfada; gövdeler normal karışımla, koyu kenarlı çizilir (neon değil).
 */
import { C, FLAT, TAU, clamp01, eo, layer, layers, lerp, smooth, wob, type G, type Pt, type VfxCtx, type VfxKit } from './core';
import { column, sigil, spiral, taper, type SigilOpt } from './draw';

/** Yükselen dalgalı teller (zehir buharı, büyü dumanı, ruh): her tel kendi fazıyla salınır, baştan solar. */
export function fumes(
  c: VfxCtx,
  k: VfxKit,
  p: Pt,
  o: { n: number; spread: number; h: number; cols: string[]; life: number; a: number; depth: number; w?: number; delay?: number; sway?: number; add?: boolean },
): void {
  const list = Array.from({ length: o.n }, () => ({ x: k.rnd(-o.spread, o.spread), ph: k.rnd(0, TAU), d: k.rnd(0, o.delay ?? 200), h: o.h * k.rnd(0.7, 1.15), col: C(k.pick(o.cols)), w: (o.w ?? 7) * k.rnd(0.7, 1.2) }));
  const life = k.slow(o.life);
  const maxD = k.slow(Math.max(...list.map((l) => l.d)));
  layer(
    c,
    life + maxD,
    o.depth,
    (g, tm) => {
      for (const l of list) {
        const t = tm - k.slow(l.d);
        if (t <= 0 || t > life) continue;
        const q = t / life;
        const head = eo(q, 1.6) * l.h;
        const tailH = Math.max(0, head - l.h * 0.55);
        const a = o.a * (q < 0.2 ? q / 0.2 : (1 - (q - 0.2) / 0.8) ** 1.2);
        const pts: Pt[] = [];
        for (let i = 0; i <= 12; i++) {
          const y = lerp(tailH, head, i / 12);
          const s = y / l.h;
          pts.push({ x: p.x + l.x + Math.sin(s * 5 + l.ph + t / k.slow(180)) * (o.sway ?? 14) * (0.3 + s), y: p.y - y });
        }
        taper(g, pts, l.w * 0.3, l.w, l.col, a * 0.5, (s) => l.w * Math.sin(Math.PI * s) ** 0.6);
        taper(g, pts, l.w * 0.15, l.w * 0.45, l.col, a, (s) => l.w * 0.45 * Math.sin(Math.PI * s) ** 0.6);
      }
    },
    o.add,
  );
}

/** Işık zerrecikleri (ADD, küçük): yükselir ya da (`orbit`) birimin çevresinde sarmal çizer. */
export function motes(
  c: VfxCtx,
  k: VfxKit,
  p: Pt,
  o: { n: number; r: number; rise: number; cols: string[]; size: [number, number]; life: number; depth: number; delay?: number; orbit?: number; flat?: number; a?: number; inward?: boolean },
): void {
  const list = Array.from({ length: o.n }, () => ({ a0: k.rnd(0, TAU), r: o.r * Math.sqrt(k.rnd(0.1, 1)), d: k.rnd(0, o.delay ?? 300), s: k.rnd(o.size[0], o.size[1]), col: C(k.pick(o.cols)), h: o.rise * k.rnd(0.6, 1.2), y0: k.rnd(-10, 10) }));
  const life = k.slow(o.life);
  layer(
    c,
    life + k.slow(o.delay ?? 300),
    o.depth,
    (g, tm) => {
      for (const m of list) {
        const t = tm - k.slow(m.d);
        if (t <= 0 || t > life) continue;
        const q = t / life;
        const ang = m.a0 + (o.orbit ?? 0) * q * TAU;
        const rr = o.inward ? m.r * (1 - eo(q, 1.5) * 0.9) : m.r;
        const x = p.x + Math.cos(ang) * rr;
        const y = p.y + m.y0 + Math.sin(ang) * rr * (o.flat ?? FLAT) - m.h * eo(q, 1.3);
        const a = (o.a ?? 1) * Math.sin(Math.PI * q) * (0.75 + 0.25 * Math.sin(t / 30 + m.a0 * 9));
        g.fillStyle(m.col, a * 0.35).fillCircle(x, y, m.s * 2.2);
        g.fillStyle(m.col, a).fillCircle(x, y, m.s);
      }
    },
    true,
  );
}

/** Zamanlı rün dairesi: `t0`-`peak` arası belirir (dönerek), `peak`te parlar, `end`e kadar söner. Zemin derinliğinde (FLOOR_FX). */
export function sigilFx(c: VfxCtx, k: VfxKit, P: Pt, R: number, o: Omit<SigilOpt, 'a' | 'rot' | 'flare'> & { peak: number; end: number; spin?: number; depth?: number; grow?: number; plate?: { hex: string; a: number } }): void {
  const dur = o.end;
  layer(
    c,
    dur,
    o.depth ?? k.FLOOR_FX + 3,
    (g, tm) => {
      const pre = clamp01(tm / o.peak);
      const post = clamp01((tm - o.peak) / Math.max(1, dur - o.peak));
      const a = smooth(clamp01(pre * 1.5)) * (1 - post ** 1.5);
      const flare = tm < o.peak ? 0 : Math.max(0, 1 - (tm - o.peak) / k.slow(220));
      const rr = R * (0.6 + 0.4 * smooth(pre)) * (1 + (o.grow ?? 0.15) * post);
      if (o.plate) g.fillStyle(C(o.plate.hex), o.plate.a * a).fillEllipse(P.x, P.y, rr * 2.1, rr * 2.1 * (o.flat ?? FLAT));
      sigil(g, P, rr, { ...o, a, rot: (tm / k.slow(900)) * (o.spin ?? 1), flare });
    },
    true,
  );
}

/** Işık sütunu: `at` anında yerden göğe çakar, kısa sürede incelip söner. */
export function columnFx(c: VfxCtx, k: VfxKit, p: Pt, o: { h: number; w: number; col: string; core: string; at: number; dur?: number; depth: number; a?: number; rise?: number }): void {
  const D = k.slow(o.dur ?? 420);
  const cc = C(o.col);
  const cr = C(o.core);
  layer(
    c,
    o.at + D,
    o.depth,
    (g, tm) => {
      if (tm < o.at - k.slow(o.rise ?? 60)) return;
      const q = (tm - o.at) / D;
      const up = q < 0 ? 1 - Math.abs(q) * D / k.slow(o.rise ?? 60) : 1;
      const h = o.h * (0.6 + 0.4 * eo(clamp01(q + 0.3), 3)) * clamp01(up);
      const w = o.w * (1 - clamp01(q) * 0.7);
      const a = (o.a ?? 1) * (q < 0 ? clamp01(up) : (1 - clamp01(q)) ** 1.4);
      column(g, p.x, p.y, h, w, cc, cr, a);
    },
    true,
  );
}

/** Küre (büyü mermisi): koyu dış hale, renkli gövde, küçük açık çekirdek; titrer. `t` sn. */
export function orb(g: G, p: Pt, r: number, deep: number, body: number, core: number, a: number, t: number, add?: G): void {
  const fl = 1 + 0.08 * wob(t * 12, r);
  g.fillStyle(deep, a * 0.35).fillCircle(p.x, p.y, r * 1.7 * fl);
  g.fillStyle(body, a * 0.9).fillCircle(p.x, p.y, r * fl);
  (add ?? g).fillStyle(core, a * 0.9).fillCircle(p.x - r * 0.12, p.y - r * 0.12, r * 0.45);
}

/** Kırık şimşek / ark: a'dan b'ye zikzak (tohumlu), isteğe bağlı bir dal; koyu hale + renkli gövde + ince açık çekirdek. */
export function bolt(g: G, a: Pt, b: Pt, seed: number, o: { jag: number; w: number; col: number; core: number; halo: number; alpha: number; n?: number; branch?: boolean }): void {
  const n = o.n ?? 9;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const s = i / n;
    const j = i === 0 || i === n ? 0 : Math.sin(seed * 13.7 + i * 7.3) * o.jag * Math.sin(Math.PI * s);
    return { x: a.x + dx * s + nx * j, y: a.y + dy * s + ny * j };
  });
  g.lineStyle(o.w * 3, o.halo, o.alpha * 0.25).strokePoints(pts, false);
  g.lineStyle(o.w, o.col, o.alpha * 0.9).strokePoints(pts, false);
  g.lineStyle(Math.max(1, o.w * 0.35), o.core, o.alpha).strokePoints(pts, false);
  if (o.branch) {
    const m = pts[Math.floor(n * 0.5)]!;
    const e = { x: m.x + dx * 0.25 + nx * o.jag * 2 * Math.sign(Math.sin(seed)), y: m.y + dy * 0.25 + ny * o.jag * 2 * Math.sign(Math.sin(seed)) };
    g.lineStyle(o.w * 0.6, o.col, o.alpha * 0.7).lineBetween(m.x, m.y, (m.x + e.x) / 2 + nx * 4, (m.y + e.y) / 2 + ny * 4);
    g.lineStyle(o.w * 0.4, o.col, o.alpha * 0.6).lineBetween((m.x + e.x) / 2 + nx * 4, (m.y + e.y) / 2 + ny * 4, e.x, e.y);
  }
}

/** İnce ışın yıldızı (vuruş anı, ölçülü): `n` ince çizgi, ortası açık. */
export function rays(g: G, p: Pt, n: number, len: number, w: number, col: number, core: number, a: number, rot: number, flat = 1): void {
  for (let i = 0; i < n; i++) {
    const an = rot + (i / n) * TAU;
    const L = len * (i % 2 ? 0.55 : 1);
    const e = { x: p.x + Math.cos(an) * L, y: p.y + Math.sin(an) * L * flat };
    taper(g, [p, e], w, 0, col, a * 0.7);
    taper(g, [p, { x: lerp(p.x, e.x, 0.6), y: lerp(p.y, e.y, 0.6) }], w * 0.4, 0, core, a);
  }
}

/** Genişleyen halka (ses dalgası / şok): `flat` basıklık, iki çizgi. */
export function ringFx(c: VfxCtx, k: VfxKit, p: Pt, o: { r0: number; r1: number; dur: number; col: string; pale?: string; w: number; flat?: number; depth: number; delay?: number; a?: number; add?: boolean }): void {
  const D = k.slow(o.dur);
  const d0 = k.slow(o.delay ?? 0);
  const cc = C(o.col);
  const cp = C(o.pale ?? o.col);
  layer(
    c,
    D + d0,
    o.depth,
    (g, tm) => {
      const u = (tm - d0) / D;
      if (u < 0) return;
      const e = eo(u, 2.4);
      const r = lerp(o.r0, o.r1, e);
      const a = (o.a ?? 1) * (1 - u) ** 1.3;
      const f = o.flat ?? 1;
      g.lineStyle(Math.max(1.5, o.w * (1 - u)), cc, a * 0.7).strokeEllipse(p.x, p.y, r * 2, r * 2 * f);
      g.lineStyle(Math.max(1, o.w * 0.4 * (1 - u)), cp, a).strokeEllipse(p.x, p.y, r * 1.92, r * 1.92 * f);
    },
    o.add ?? true,
  );
}

/** Gövdeye sarılıp yükselen iki şerit (ağıt, şifa, kutsama): önü birimin önünde, arkası arkasında. */
export function spiralFx(c: VfxCtx, k: VfxKit, base: Pt, depth: number, o: { H: number; R: number; at: number; dur: number; cols: [string, string, string]; w: number; turns?: number; n?: number; a?: number; add?: boolean }): void {
  const cols: [number, number, number] = [C(o.cols[0]), C(o.cols[1]), C(o.cols[2])];
  const D = k.slow(o.dur);
  layers(c, o.at + D, [{ depth: depth - 1, add: o.add ?? true }, { depth: depth + 2, add: o.add ?? true }], ([back, front], tm) => {
    const u = (tm - o.at) / D;
    if (u < 0) return;
    const head = lerp(0.05, 1.3, smooth(u) * 0.75 + u * 0.25);
    const fade = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25;
    for (let i = 0; i < (o.n ?? 2); i++) spiral(front!, back!, base, { H: o.H, R: o.R * (0.75 + 0.25 * Math.min(1, u * 3)), head, len: 0.7, phase: (i * TAU) / (o.n ?? 2) + u * 3.2, turns: o.turns ?? 1.6, w: o.w, cols, a: fade * (o.a ?? 1) });
  });
}
