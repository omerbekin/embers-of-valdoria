/**
 * MORVANE'IN ASKERLERİ (Rend dili: ağır çelik, ahşap, toprak, kan; parlama yok):
 *   Halberd Chop (Morvane Halberdier) — Ömer 2026-10-18: "biraz sade olmuş": daha ağır çelik okuma (gövde / sırt gölgesi / bileme şeridi,
 *     açıya göre gezinen ince ışık, perçin), gerçek ağırlık (tepede kısa asılı kalış, sonra sert ivme; arkasında 2 soluk ard görüntü ve
 *     yoğun hareket izi; başın altında yaklaştıkça koyulaşan gölge), vuruşta "durma" (kısa titreşim) ve daha iyi toprak / taş fiziği
 *     (gömülen ağız, kalkık toprak dudağı, çukur, yayılan çatlaklar, zeminde seken iri taşlar, ince toprak püskürmesi, yerde yuvarlanan alçak
 *     toz halkası, çıkarken ağızdan dökülen toprak). Hedef ağzın önündeyse gövdede dikey yarık + koyu kan.
 *   Pike Thrust (Morvane Halberdier): uzun pike arkadan patlayıcı hızla göğse saplanır (kısa titreşim), geri çekilir; çevresinde iki soluk
 *     basınç halkası, hedefin arkasından çıkan kan, lif, küçük kıvılcım.
 *   Wall of Pikes (Sworn Guard) — Ömer: "biraz sade": daha kalın saplar, ölçeğe uygun büyük yaprak uçlar, 5 pike sütun boyunca GERÇEKTEN
 *     ilerler (okçunun Pierce'ı gibi); her temasta daha tok vuruş (uçlar geri seker, toz şoku, kıymık, kan, kısa sarsıntı); zeminde derin
 *     sürtünme izi ve arkada sürekli savrulan toz.
 */
import type { MobHandVfx } from '../mob-vfx';
import { C, CELL_DEPTH, FLAT, TAU, UP, after, bits, clamp01, ei, eo, layer, layers, lerp, puffs, smoke, spray, type CombatantView, type Pt, type VfxCtx, type VfxKit } from './core';
import { crackPath, crescent, drawCrack, xf } from './draw';
import { area, melee } from './flow';
import { DUST, EARTH, FIBER, SPLINTER, STONE, bodyAt, dust, gore, halberdHead, pike, shockRing, sparks, wounds } from './phys';

const hurt = (c: VfxCtx, v: CombatantView): boolean => !c.usage || c.usage.damages.some((d) => d.target === v.combatant.uid && d.amount > 0);
const dirTo = (c: VfxCtx, v: CombatantView): number => (v.container.x >= c.actor.container.x ? 1 : -1);

// ---------------------------------------------------------------------------------------------------------------------
// HALBERD CHOP

function chopOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = dirTo(c, v);
  const foot = k.feet(v);
  const R = Math.max(220, Math.min(290, v.h * 1.35));
  const A1 = 0.72; // vuruş açısı (ileri, aşağı ~41°: ağız yere ağzıyla gömülür)
  const A0 = -2.05; // tepede, biraz geride
  const groundY = foot.y + 4;
  const G = { x: v.container.x - dir * v.w * 0.05, y: groundY - 18 }; // ağzın yere değdiği nokta
  const P = { x: G.x - dir * Math.cos(A1) * R, y: G.y - Math.sin(A1) * R };
  const B = { x: P.x + dir * Math.cos(A1) * R * 0.86, y: groundY };
  const angOf = (a: number) => (dir > 0 ? a : Math.PI - a);
  const HANG = 0.22; // iniş süresinin ilk kısmı: tepede asılı kalış (ağırlık)
  const HOLD = k.slow(200);
  const PULL = k.slow(240);
  const GROUND = k.slow(1100);
  const total = T + GROUND;
  const cracks = Array.from({ length: 7 }, (_, i) => {
    const th = (i / 7) * TAU + k.rnd(-0.25, 0.25);
    const L = k.rnd(70, 150) * (Math.abs(Math.cos(th)) * 0.6 + 0.4);
    return crackPath(k, B, { x: B.x + Math.cos(th) * L, y: B.y + Math.sin(th) * L * FLAT }, 10, 0.4);
  });
  const lip = Array.from({ length: 8 }, (_, i) => ({ x: B.x + (i - 3.5) * 15 + k.rnd(-4, 4), y: groundY + k.rnd(-2, 3), w: k.rnd(14, 24), h: k.rnd(6, 10), col: C(k.pick(EARTH)), up: k.rnd(2, 7) }));
  const angAt = (tm: number): number => {
    const q = clamp01(tm / T);
    const m = q < HANG ? 0.04 * (q / HANG) : 0.04 + 0.96 * ei((q - HANG) / (1 - HANG), 2.6);
    return lerp(A0, A1, m);
  };
  layers(c, total, [{ depth: k.FLOOR_FX + 3 }, { depth: v.container.depth + 3 }], ([floor, g], tm) => {
    const air = g!;
    // 1) iniş: tepede kısa asılı kalış, sonra sert ivme; ard görüntüler + yoğun hareket izi + yaklaşan gölge
    if (tm < T + HOLD + PULL) {
      let a: number;
      let al: number;
      if (tm < T) {
        a = angAt(tm);
        al = smooth(clamp01(tm / (T * 0.18)));
        const q = tm / T;
        const tr = clamp01((q - 0.5) / 0.3);
        if (tr > 0) {
          const span = a - angAt(Math.max(0, tm - T * 0.32));
          const A0d = dir > 0 ? a - span : Math.PI - a + span;
          const A1d = dir > 0 ? a : Math.PI - a;
          crescent(air, P, R * 1.04, A0d, A1d, 30, C('#6e6862'), 0.16 * tr);
          crescent(air, P, R * 0.86, A0d, A1d, 16, C('#9a948e'), 0.22 * tr);
          crescent(air, P, R * 1.15, A0d, A1d, 4, C('#b8b2ac'), 0.3 * tr);
          // ard görüntüler: biraz önceki açılarda soluk teber
          for (const [lag, aa] of [
            [0.1, 0.16],
            [0.2, 0.08],
          ] as Array<[number, number]>) {
            const ap = angAt(Math.max(0, tm - T * lag));
            halberdHead(air, xf(P, angOf(ap), dir), R, aa * tr, ap);
          }
        }
      } else {
        const t = tm - T;
        const qp = clamp01((t - HOLD) / PULL);
        a = A1 + 0.016 * Math.sin(t / k.slow(14)) * Math.exp(-t / k.slow(60)) - 0.4 * smooth(qp);
        al = (1 - qp) ** 1.3;
      }
      // başın gölgesi (yaklaştıkça koyu, küçük)
      const head = xf(P, angOf(a), dir)(R, 0);
      const dist = Math.max(0, groundY - head.y);
      const sh = clamp01(1 - dist / 360) * al;
      if (sh > 0.02) floor!.fillStyle(0x000000, 0.32 * sh).fillEllipse(B.x, groundY + 2, 90 + dist * 0.3, 16 + dist * 0.05);
      halberdHead(air, xf(P, angOf(a), dir), R, al, a, 50);
    }
    if (tm < T) return;
    // 2) zemin: çukur, kalkık toprak dudağı (gömülü ağzın önünü örter), çatlaklar, sönen ince kor
    const t = tm - T;
    const gf = 1 - clamp01((t - k.slow(600)) / k.slow(500)) ** 1.4;
    const open = eo(t / k.slow(70), 2);
    floor!.fillStyle(C('#120e0a'), 0.62 * gf).fillEllipse(B.x, groundY - 1, 140 * open, 30 * open);
    floor!.fillStyle(C('#2a221c'), 0.5 * gf).fillEllipse(B.x, groundY - 3, 90 * open, 14 * open);
    const grow = eo(t / k.slow(130), 2);
    for (const cr of cracks) drawCrack(floor!, cr, grow, 0.9 * gf, 3.4, C('#100c08'), C('#6a5a48'), C('#7a3a1c'), 0.45 * gf * Math.exp(-t / k.slow(420)));
    const inBlade = t < HOLD + PULL;
    for (const l of lip) air.fillStyle(l.col, 0.92 * gf * open * (inBlade ? 1 : 0.75)).fillEllipse(l.x, l.y - l.up * open, l.w, l.h);
  });
  // vuruş katmanı: seken iri taşlar + ince toprak + yuvarlanan alçak toz halkası + toz bulutu + kan
  after(c, T, () => {
    const depth = v.container.depth + 4;
    spray(
      c,
      k,
      [
        ...bits(k, 12, { x: B.x, y: groundY - 4 }, { kind: 'rock', ang: [UP - 1.1 + dir * 0.15, UP + 1.1 + dir * 0.15], sp: [240, 520], size: [7, 16], life: [600, 900], cols: STONE, rim: '#a49280', jx: 36, jy: 2, floor: groundY + 6, vr: 8 }),
        ...bits(k, 16, { x: B.x, y: groundY - 3 }, { kind: 'rock', ang: [UP - 1.3, UP + 1.3], sp: [160, 420], size: [2, 4.5], life: [360, 620], cols: EARTH, jx: 44, jy: 2 }),
        ...bits(k, 10, { x: B.x, y: groundY - 2 }, { kind: 'streak', ang: [UP - 0.6, UP + 0.6], sp: [380, 700], size: [1.6, 2.6], life: [200, 360], cols: ['#6a5a48', '#7e6c58'], jx: 30 }),
      ],
      depth,
      1600,
    );
    shockRing(c, k, { x: B.x, y: groundY }, 210, k.FLOOR_FX + 4, { flat: FLAT, col: '#a89884', a: 0.5, dur: 420, w: 8 });
    smoke(
      c,
      k,
      [
        ...puffs(k, { x: B.x, y: groundY - 8 }, 7, { hex: DUST, sx: 50, sy: 4, vx: [-260, 260], vy: [-40, -10], s0: [50, 70], s1: [120, 170], life: [700, 1000], a: 0.38, drag: 3 }),
        ...puffs(k, { x: B.x, y: groundY - 20 }, 4, { hex: ['#6a5e52', '#7e7062'], sx: 30, sy: 8, vy: [-110, -50], s0: [40, 56], s1: [90, 130], life: [600, 900], a: 0.3, drag: 1.6 }),
      ],
      v.container.depth + 1,
    );
    if (hurt(c, v)) {
      const body = k.spot(v);
      const A = { x: body.x - dir * v.w * 0.3, y: body.y - v.h * 0.32 };
      const Bw = { x: body.x - dir * v.w * 0.1, y: body.y + v.h * 0.3 };
      wounds(c, k, v, k.slow(1), [{ A, B: Bw, w: 10, bow: -dir * 8 }], { sw: 60, drips: 4, hold: 300 });
      gore(c, k, { x: body.x - dir * v.w * 0.1, y: body.y }, UP - dir * 0.3, 14, depth, { sp: [140, 340], size: [3, 6], jy: 40 });
    }
    // kor: çok az, ağır (asıl sheet'in alev kimliğinden tek iz)
    spray(c, k, bits(k, 4, { x: B.x, y: groundY - 6 }, { kind: 'ember', ang: [UP - 0.6, UP + 0.6], sp: [40, 110], size: [1.4, 2.2], life: [400, 640], cols: ['#a8501c', '#8a4020'], jx: 26, drag: 1 }), depth, -40, true);
  });
  // çıkarken ağızdan dökülen toprak
  after(c, T + HOLD + k.slow(40), () => spray(c, k, bits(k, 8, { x: B.x - dir * 10, y: groundY - 30 }, { kind: 'rock', ang: [Math.PI * 0.3, Math.PI * 0.7], sp: [20, 80], size: [2.5, 5], life: [400, 600], cols: EARTH, jx: 26, jy: 20, floor: groundY + 4 }), v.container.depth + 4, 1500));
}
const smooth = (u: number) => u * u * (3 - 2 * u);
const halberdChop: MobHandVfx = (c, k, hitMs) =>
  melee(c, k, hitMs, (v, T) => chopOn(c, k, v, T), { shake: [140, 0.0046] });

// ---------------------------------------------------------------------------------------------------------------------
// PIKE THRUST

function pikeThrustOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = dirTo(c, v);
  const hitP = bodyAt(k, v, dir, -0.6, -0.15);
  const L = 330;
  const PEN = 26;
  const SW = Math.min(T, k.slow(150));
  const t0 = T - SW;
  const HOLD = k.slow(90);
  const BACK = k.slow(220);
  const ang = dir > 0 ? 0.04 : Math.PI - 0.04;
  layer(c, T + HOLD + BACK, v.container.depth + 3, (g, tm) => {
    if (tm < t0 - k.slow(60)) return;
    let d: number; // ucun hedef noktasına uzaklığı (+ = geride)
    let a = 1;
    if (tm < t0) {
      d = 170 + 30 * ((t0 - tm) / k.slow(60)); // kısa geri çekiliş (hazırlık)
      a = clamp01(1 - (t0 - tm) / k.slow(60));
    } else if (tm < T) d = lerp(170, -PEN, ei((tm - t0) / SW, 3));
    else if (tm < T + HOLD) d = -PEN + 3 * Math.sin((tm - T) / k.slow(10)) * Math.exp(-(tm - T) / k.slow(40));
    else {
      const q = (tm - T - HOLD) / BACK;
      d = lerp(-PEN, 140, eo(q, 2));
      a = 1 - clamp01((q - 0.4) / 0.6);
    }
    const tip = { x: hitP.x - Math.cos(ang) * d, y: hitP.y - Math.sin(ang) * d };
    const base = { x: tip.x - Math.cos(ang) * L, y: tip.y - Math.sin(ang) * L };
    // hız çizgileri (itişte)
    if (tm >= t0 && tm < T) for (let i = -1; i <= 1; i++) g.lineStyle(1.4, C('#a8a098'), 0.3).lineBetween(tip.x - Math.cos(ang) * 120, tip.y + i * 12 - 4, tip.x - Math.cos(ang) * 40, tip.y + i * 12 - 4);
    pike(g, xf(base, ang, dir), L, a, tm / 80, 10, 1.25);
  });
  after(c, T, () => {
    // iki soluk basınç halkası (sap çevresinde, dikey)
    for (let i = 0; i < 2; i++) shockRing(c, k, { x: hitP.x - dir * (40 + i * 50), y: hitP.y }, 40 + i * 14, v.container.depth + 4, { flat: 2.2, col: '#c8c0b4', a: 0.32 - i * 0.1, dur: 260 + i * 60, w: 4 });
    sparks(c, k, hitP, 4, v.container.depth + 4, dir > 0 ? [-Math.PI * 0.9, -Math.PI * 0.6] : [-Math.PI * 0.4, -Math.PI * 0.1]);
    spray(c, k, bits(k, 5, hitP, { kind: 'shard', ang: [UP - 1, UP + 1], sp: [70, 190], size: [5, 9], life: [520, 800], cols: FIBER, jx: 8, jy: 10, up: [30, 90] }), v.container.depth + 4, 380);
    if (hurt(c, v)) {
      // giriş + arkadan çıkış kanı
      const exit = bodyAt(k, v, dir, 0.55, -0.15);
      gore(c, k, exit, dir > 0 ? -0.3 : Math.PI + 0.3, 14, v.container.depth + 4, { sp: [160, 380], spread: 0.6 });
      gore(c, k, hitP, UP - dir * 0.6, 5, v.container.depth + 4, { sp: [60, 160] });
      wounds(c, k, v, k.slow(1), [{ A: { x: hitP.x, y: hitP.y - 10 }, B: { x: hitP.x + dir * 6, y: hitP.y + 14 }, w: 9 }], { sw: 40, drips: 3, hold: 320 });
    }
  });
}
const pikeThrust: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => pikeThrustOn(c, k, v, T), { shake: [100, 0.0034] });

// ---------------------------------------------------------------------------------------------------------------------
// WALL OF PIKES (sütun boyunca, aşamalı)

/** 5 pike: zeminden yükseklik (px) ve uç öne kayması (bazıları önde): gövde yüksekliğine göre ölçeklenir. */
const PIKES: Array<{ h: number; lead: number }> = [
  { h: 0.22, lead: 6 },
  { h: 0.4, lead: 30 },
  { h: 0.58, lead: 0 },
  { h: 0.76, lead: 34 },
  { h: 0.94, lead: 12 },
];
const PIKE_LEN = 300;

function pikeHit(c: VfxCtx, k: VfxKit, p: Pt, d: Pt, victims: CombatantView[], H: number): void {
  const depth = p.y + CELL_DEPTH + 3;
  const fwd = Math.atan2(d.y, d.x);
  // tok vuruş: toz şoku (zemin + dikey), kıymık (uç hizasında), toprak, kan, kısa sarsıntı
  shockRing(c, k, p, 120, k.FLOOR_FX + 4, { flat: FLAT, col: '#a89884', a: 0.42, dur: 300, w: 6 });
  shockRing(c, k, { x: p.x, y: p.y - H * 0.55 }, 70, depth, { flat: 1.8, col: '#c8c0b4', a: 0.28, dur: 240, w: 4 });
  spray(
    c,
    k,
    [
      ...Array.from({ length: 8 }, () => {
        const pk = k.pick(PIKES);
        const a = fwd + k.rnd(-0.9, 0.9) - 0.4;
        const sp = k.rnd(140, 330);
        return { x: p.x + k.rnd(-10, 10), y: p.y - pk.h * H, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - k.rnd(40, 140), kind: 'shard' as const, size: k.rnd(6, 11), col: C(k.pick(SPLINTER)), life: k.rnd(460, 700), delay: k.rnd(0, 30), floor: p.y + 4 };
      }),
      ...bits(k, 10, { x: p.x, y: p.y - 4 }, { kind: 'rock', ang: [UP - 1.1 + Math.sign(d.x || 1) * 0.3, UP + 1.1 + Math.sign(d.x || 1) * 0.3], sp: [130, 320], size: [2.5, 5.5], life: [320, 560], cols: EARTH, jx: 34, jy: 3, floor: p.y + 6 }),
    ],
    depth,
    1300,
  );
  for (const v of victims) if (hurt(c, v)) gore(c, k, k.spot(v), fwd - 0.4, 12, v.container.depth + 3, { sp: [150, 360], jy: 40 });
  smoke(c, k, puffs(k, { x: p.x, y: p.y - 8 }, 4, { hex: ['#5e5248', '#6e6256', '#4a4038'], sx: 44, sy: 4, vx: [-120, 120], vy: [-30, -6], s0: [44, 60], s1: [100, 140], life: [480, 700], a: 0.3, drag: 2.6 }), depth - 3);
  k.shake(c.scene, 90, 0.0032);
}

function wallOfPikes(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#c0392b', (a) => {
    const nodes = a.stages.filter((s) => s.cells.length).map((s) => ({ x: s.cells.reduce((m, p) => m + p.x, 0) / s.cells.length, y: s.cells.reduce((m, p) => m + p.y, 0) / s.cells.length, victims: s.victims, at: s.at }));
    if (!nodes.length) return;
    let d: Pt = { x: nodes[0]!.x >= c.actor.container.x ? 1 : -1, y: 0 };
    if (nodes.length > 1) {
      const dx = nodes[nodes.length - 1]!.x - nodes[0]!.x;
      const dy = nodes[nodes.length - 1]!.y - nodes[0]!.y;
      const L = Math.hypot(dx, dy);
      if (L > 1) d = { x: dx / L, y: dy / L };
    }
    const H = Math.max(150, ...nodes.flatMap((n) => n.victims.map((v) => v.h))) * 0.85; // pike yükseklikleri gövdeye göre
    const START = 300;
    const t0 = Math.max(0, nodes[0]!.at - k.slow(300));
    const path: Array<Pt & { t: number }> = [{ x: nodes[0]!.x - d.x * START, y: nodes[0]!.y - d.y * START, t: t0 }];
    nodes.forEach((p) => path.push({ x: p.x, y: p.y, t: p.at }));
    const last = path[path.length - 1]!;
    const OUT = k.slow(160);
    path.push({ x: last.x + d.x * 120, y: last.y + d.y * 120, t: last.t + OUT });
    const FADE = k.slow(240);
    const endT = path[path.length - 1]!.t;
    const SCUFF = k.slow(620);
    const total = endT + Math.max(FADE, SCUFF);
    const at = (tm: number): Pt => {
      for (let i = 1; i < path.length; i++) {
        const A = path[i - 1]!;
        const B = path[i]!;
        if (tm <= B.t) {
          const u = clamp01((tm - A.t) / Math.max(1, B.t - A.t));
          const e = i === 1 ? u ** 1.6 : i === path.length - 1 ? 1 - (1 - u) ** 2 : u;
          return { x: lerp(A.x, B.x, e), y: lerp(A.y, B.y, e) };
        }
      }
      return { x: last.x + d.x * 120, y: last.y + d.y * 120 };
    };
    const scuff0 = { x: path[0]!.x + d.x * 40, y: path[0]!.y + d.y * 40 };
    const hitTimes = nodes.map((n) => n.at);
    let prevP = at(t0);
    let prevT = t0;
    let speedS = 0;
    let lastPuff = 0;
    layers(c, total, [{ depth: k.FLOOR_FX + 3 }, { depth: 0 }], ([floor, g], tm) => {
      if (tm < t0) return;
      const air = g!;
      let jolt = 0;
      for (const ht of hitTimes) if (tm >= ht) jolt += 16 * Math.min(1, (tm - ht) / k.slow(10)) * Math.exp(-(tm - ht) / k.slow(60));
      const base = at(Math.min(tm, endT));
      const tip = { x: base.x - d.x * jolt, y: base.y - d.y * jolt };
      const dt = Math.max(1, tm - prevT);
      const vv = Math.hypot(base.x - prevP.x, base.y - prevP.y) / dt;
      speedS = lerp(speedS, clamp01((vv * k.slow(1000)) / 1000 / 1.4), 0.35);
      prevP = base;
      prevT = tm;
      const appear = clamp01((tm - t0) / k.slow(90));
      const alpha = tm <= endT ? appear : 1 - clamp01((tm - endT) / FADE);
      // derin sürtünme izi (iki çizik + geniş sürtme) + arkada savrulan toz
      const sa = tm <= endT ? 1 : 1 - clamp01((tm - endT) / SCUFF);
      const s1 = { x: base.x - d.x * 30, y: base.y - d.y * 30 };
      if (sa > 0.01 && (s1.x - scuff0.x) * d.x + (s1.y - scuff0.y) * d.y > 0) {
        floor!.lineStyle(26, C('#3a3026'), 0.22 * sa).lineBetween(scuff0.x, scuff0.y + 1, s1.x, s1.y + 1);
        floor!.lineStyle(3, C('#1a120c'), 0.65 * sa).lineBetween(scuff0.x, scuff0.y - 6, s1.x, s1.y - 6);
        floor!.lineStyle(2.4, C('#1a120c'), 0.55 * sa).lineBetween(scuff0.x + d.x * 20, scuff0.y + 6, s1.x - d.x * 10, s1.y + 6);
        floor!.lineStyle(1.2, C('#6a5a48'), 0.4 * sa).lineBetween(scuff0.x, scuff0.y - 9, s1.x, s1.y - 9);
      }
      if (tm < endT && speedS > 0.2 && tm - lastPuff > k.slow(70)) {
        lastPuff = tm;
        smoke(c, k, puffs(k, { x: base.x - d.x * 50, y: base.y - d.y * 50 - 6 }, 1, { hex: DUST, sx: 20, sy: 4, vx: [-d.x * 60 - 30, -d.x * 60 + 30], vy: [-40, -14], s0: [30, 40], s1: [70, 100], life: [500, 700], a: 0.24, drag: 2 }), base.y + CELL_DEPTH);
      }
      if (alpha > 0.01) {
        air.setDepth(tip.y + CELL_DEPTH + 1);
        const ang = Math.atan2(d.y, d.x);
        const sy = d.x >= 0 ? 1 : -1;
        for (const [i, pk] of PIKES.entries()) {
          const bob = 2 * Math.sin(tm / k.slow(55) + i * 1.9);
          const tp = { x: tip.x + d.x * pk.lead, y: tip.y - pk.h * H + d.y * pk.lead + bob };
          // hareket izi: ucun arkasında kısa soluk çizgi
          if (speedS > 0.05) {
            air.lineStyle(2, C('#9a948e'), 0.36 * alpha * speedS).lineBetween(tp.x - d.x * 20, tp.y + 6, tp.x - d.x * (20 + 80 * speedS), tp.y + 6);
            air.lineStyle(14, C('#3e3a36'), 0.07 * alpha * speedS).lineBetween(tp.x - d.x * PIKE_LEN * 0.5, tp.y, tp.x - d.x * PIKE_LEN * 1.2, tp.y);
          }
          const baseP = { x: tp.x - Math.cos(ang) * PIKE_LEN, y: tp.y - Math.sin(ang) * PIKE_LEN };
          pike(air, xf(baseP, ang, sy), PIKE_LEN, alpha, tm / 60 + i, 12, 1.45);
        }
      }
    });
    nodes.forEach((p) => after(c, p.at, () => pikeHit(c, k, p, d, p.victims, H)));
    after(c, t0, () => dust(c, k, scuff0, scuff0.y + CELL_DEPTH, { n: 3, w: 40, a: 0.22, rise: 20 }));
  });
}

export const MORVANE_MEN: Readonly<Record<string, MobHandVfx>> = {
  halberd_chop: halberdChop,
  pike_thrust: pikeThrust,
  wall_of_pikes: wallOfPikes,
};
