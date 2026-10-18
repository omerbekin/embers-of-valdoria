/**
 * ÖLÜLER / BOĞULMUŞLAR (büyüler Glyph dilinde katmanlı ve ölçülü; fiziksel kısımlar Rend gibi koyu):
 *   Dirge (Grave Chanter): ağzından halkalarla başlayan ağıt; dalgalı ses cepheleri (titreşen çift çizgi hilaller) hedefe akar, aralarında
 *     ruh telleri; vuruşta çınlayan iç içe halkalar, gövdeyi saran mor sis, gövdeye sarılıp yükselen iki ağıt şeridi, süzülen nota-rün
 *     işaretleri; ayakta çöken ağır halka (Slow). (Ömer: "Dirge de biraz sade": ses / ağıt kimliği daha gösterişli, yine kontrollü.)
 *   Call the Buried (Grave Chanter): çağrı yuvasında toprak kabarır, çatlaklardan mor mezar ışığı sızar; vuruşta toprağı yararak çıkan
 *     iskelet eli, savrulan toprak, alçak mor alev, toz.
 *   Bone Rite (High Priest): üç kemik mızrağı yelpaze gibi açılıp hedefte birleşir; kemik kıymıkları, koyu kan (Wound), mor sis.
 *   Requiem (High Priest, sütun boyunca aşamalı): her hücrede yerden yükselen çığlık atan hayalet (oyuk gözler, uzayan ağız), sonra
 *     yukarı dağılan teller; zeminde mor sis. (Ömer: biraz yukarı.)
 *   Unholy Benediction (High Priest, dost): dostun başına inen mor hale, üstten düşen ışık sütunu, içinde süzülen kemik parçaları, sarmal zerre.
 *   Clutch (Drowned): hedefin ayağında bulanık su birikintisi; çürük, yosunlu el fırlayıp kavrar; sıçrayan damlalar, kabarcıklar (Silence).
 *   Drag Under (Drowned): ayakta dönen girdap, yükselip bacaklara dolanan yosun dalları, vuruşta aşağı çekiş, sıçrama, kabarcıklar.
 */
import type { MobHandVfx } from '../mob-vfx';
import { C, FLAT, TAU, UP, after, bits, clamp01, eo, layer, layers, lerp, puffs, smoke, spray, wob, type CombatantView, type G, type Pt, type VfxCtx, type VfxKit } from './core';
import { blob, blobPts, crackPath, drawCrack, flame, spiral, taper, xf } from './draw';
import { fly } from './bolts';
import { area, aura, bolt, melee } from './flow';
import { fumes, motes, ringFx, sigilFx } from './magic';
import { GORE, bodyAt, cellDepth, dust, gore, rubble, wounds } from './phys';

const hurt = (c: VfxCtx, v: CombatantView): boolean => !c.usage || c.usage.damages.some((d) => d.target === v.combatant.uid && d.amount > 0);
const dirTo = (c: VfxCtx, v: CombatantView | Pt): number => (('container' in v ? v.container.x : v.x) >= c.actor.container.x ? 1 : -1);

const VIOLET = { deep: C('#2a0f4a'), dark: C('#4a1e7a'), body: C('#8a4ad0'), pale: C('#d8c0ff'), mist: '#5a3a8a' };
const GHOST = { body: C('#b8a8d8'), edge: C('#6a5a9a'), hollow: C('#0e0818') };

// ---------------------------------------------------------------------------------------------------------------------
// DIRGE

/** Dalgalı ses cephesi: `dir` yönüne bombeli yay, yay boyunca sinüs titreşimi (ses); dış koyu mor, iç açık lila. */
function soundFront(g: G, p: Pt, dir: number, r: number, a: number, t: number, amp: number): void {
  const span = 1.0;
  const N = 22;
  const pts = (rr: number, ph: number) =>
    Array.from({ length: N + 1 }, (_, i) => {
      const th = -span + (2 * span * i) / N;
      const rw = rr + Math.sin(i * 1.3 + t * 40 + ph) * amp * Math.cos((th / span) * Math.PI * 0.5);
      return { x: p.x + dir * (Math.cos(th) * rw * 0.5 - rr * 0.45), y: p.y + Math.sin(th) * rw };
    });
  const outer = pts(r, 0);
  g.lineStyle(Math.max(4, r * 0.16), VIOLET.dark, a * 0.35).strokePoints(outer, false);
  g.lineStyle(Math.max(2, r * 0.06), VIOLET.body, a * 0.85).strokePoints(outer, false);
  g.lineStyle(1.4, VIOLET.pale, a).strokePoints(pts(r * 0.97, 0.7), false);
  g.lineStyle(1.2, VIOLET.body, a * 0.55).strokePoints(pts(r * 0.8, 1.9), false);
}

/** Küçük nota-rün işareti (sap + baş + bayrak): ağıt kimliği. */
function noteRune(g: G, x: number, y: number, s: number, a: number, col: number): void {
  g.fillStyle(col, a).fillEllipse(x, y, s * 0.9, s * 0.62);
  g.lineStyle(Math.max(1.2, s * 0.14), col, a).lineBetween(x + s * 0.4, y, x + s * 0.4, y - s * 1.6);
  g.lineBetween(x + s * 0.4, y - s * 1.6, x + s * 0.95, y - s * 1.15);
}

function dirge(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  const mouth = (): Pt => ({ x: c.actor.container.x + (c.targets[0] ? dirTo(c, c.targets[0]) : -1) * c.actor.w * 0.18, y: c.actor.container.y - c.actor.h * 0.82 });
  return bolt(
    c,
    k,
    hitMs,
    '#a55cff',
    (v, F) => {
      const dir = dirTo(c, v);
      const hitP = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.2));
      const m = mouth();
      const depth = Math.max(v.container.depth, c.actor.container.depth) + 2;
      // 1) ses cepheleri: ağızdan dört dalga, büyüyerek akar; aralarında iki ruh teli
      const W = 4;
      const wisps = Array.from({ length: 3 }, () => ({ oy: k.rnd(-40, 40), ph: k.rnd(0, TAU) }));
      layer(
        c,
        F + k.slow(80),
        depth,
        (g, tm) => {
          const t = tm / 1000;
          for (let i = 0; i < W; i++) {
            const t0 = F * i * 0.13;
            const t1 = F * (0.64 + i * 0.12);
            if (tm < t0) continue;
            const u = clamp01((tm - t0) / (t1 - t0));
            const fade = tm > t1 ? clamp01(1 - (tm - t1) / k.slow(70)) : Math.min(1, u * 5);
            if (fade <= 0) continue;
            const e = eo(u, 1.3);
            const p = { x: lerp(m.x, hitP.x, e), y: lerp(m.y, hitP.y, e) };
            soundFront(g, p, dir, lerp(26, 100, e), fade * (0.55 + 0.45 * e), t + i, 6 * (1 - e) + 2);
          }
          const lu = clamp01(tm / F);
          for (const w of wisps) {
            const pts = Array.from({ length: 12 }, (_, i) => {
              const s = Math.max(0, lu - 0.4) + (i / 11) * Math.min(lu, 0.4);
              return { x: lerp(m.x, hitP.x, s), y: lerp(m.y, hitP.y, s) + w.oy * Math.sin(Math.PI * s) + Math.sin(s * 12 + w.ph + t * 8) * 8 };
            });
            taper(g, pts, 0, 5, VIOLET.body, 0.35 * Math.sin(Math.PI * lu));
          }
        },
        true,
      );
      // 2) vuruş: çınlayan iç içe halkalar, mor sis, nota-rünleri
      after(c, F, () => {
        for (let i = 0; i < 3; i++) ringFx(c, k, hitP, { r0: 14, r1: 120 + i * 30, dur: 420 + i * 80, col: '#6a2ab0', pale: '#e0c8ff', w: 6 - i, flat: 1, depth: v.container.depth + 3, delay: i * 70, a: 0.8 });
        smoke(c, k, puffs(k, k.spot(v), 6, { hex: ['#5a3a8a', '#4a2a7a', '#6a4a9a'], sx: v.w * 0.35, sy: v.h * 0.3, vy: [-40, -10], s0: [50, 70], s1: [110, 150], life: [700, 1000], a: 0.32, drag: 1.4 }), v.container.depth + 1);
        // notalar: gövdeden yukarı süzülür, salınır
        const notes = Array.from({ length: 5 }, () => ({ x: k.rnd(-v.w * 0.45, v.w * 0.45), y0: k.rnd(-v.h * 0.6, -v.h * 0.1), s: k.rnd(9, 14), ph: k.rnd(0, TAU), d: k.rnd(0, 220) }));
        layer(
          c,
          k.slow(1100),
          v.container.depth + 3,
          (g, tm) => {
            for (const n of notes) {
              const q = clamp01((tm - k.slow(n.d)) / k.slow(800));
              if (q <= 0 || q >= 1) continue;
              const a = Math.sin(Math.PI * q) * 0.85;
              noteRune(g, v.container.x + n.x + Math.sin(q * 6 + n.ph) * 10, v.container.y + n.y0 - q * 90, n.s, a, VIOLET.pale);
            }
          },
          true,
        );
        // Slow: ayakta çöken ağır halka
        ringFx(c, k, k.feet(v), { r0: v.w * 1.1, r1: v.w * 0.5, dur: 520, col: '#3a1a6a', pale: '#9a6ad8', w: 5, flat: FLAT, depth: k.FLOOR_FX + 4, delay: 120, a: 0.8 });
      });
      // 3) ağıt şeritleri: gövdeye sarılıp yükselir (önü birimin önünde)
      const H = Math.max(150, v.h * 1.25);
      layers(c, F * 0.85 + k.slow(700), [{ depth: v.container.depth - 1, add: true }, { depth: v.container.depth + 2, add: true }], ([back, front], tm) => {
        const u = (tm - F * 0.85) / k.slow(700);
        if (u < 0) return;
        const head = lerp(0.05, 1.3, eo(u, 1.4));
        const fade = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
        for (let r = 0; r < 2; r++) spiral(front!, back!, k.feet(v), { H, R: Math.max(46, v.w * 0.55), head, len: 0.7, phase: r * Math.PI + u * 3.2, turns: 1.6, w: 11, cols: [VIOLET.deep, VIOLET.body, VIOLET.pale], a: fade * 0.75 });
      });
    },
    {
      pre: () => {
        // hazırlık: ağızdan yayılan soluk halkalar (dikey)
        const m = mouth();
        for (let i = 0; i < 3; i++) ringFx(c, k, m, { r0: 6, r1: 50, dur: 300, col: '#6a2ab0', pale: '#d8c0ff', w: 3, flat: 1.2, depth: c.actor.container.depth + 2, delay: i * 90, a: 0.6 });
      },
    },
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// CALL THE BURIED

/** İskelet eli (yerel: taban 0, +y yukarı): avuç + beş parmak (kemik), `curl` 0 açık .. 1 pençe. */
function boneHand(g: G, base: Pt, s: number, curl: number, a: number, tilt: number, col = C('#d8d0bc'), dark = C('#6a6250'), rim?: number, x0 = -0.3): void {
  const f = xf(base, -Math.PI / 2 + tilt);
  if (x0 > 1.1) return; // tamamı toprağın altında
  // ön kol kemikleri (x0'ın altı toprakta)
  for (const o of [-5, 5]) {
    const p0 = f(s * Math.min(0.9, x0), o * s * 0.02);
    const p1 = f(s * 0.95, o * s * 0.03);
    g.lineStyle(s * 0.12, dark, a).lineBetween(p0.x, p0.y, p1.x, p1.y);
    g.lineStyle(s * 0.08, col, a).lineBetween(p0.x, p0.y, p1.x, p1.y);
  }
  const palm = f(s * 1.05, 0);
  g.fillStyle(dark, a).fillEllipse(palm.x, palm.y, s * 0.42, s * 0.42);
  g.fillStyle(col, a).fillEllipse(palm.x, palm.y, s * 0.34, s * 0.34);
  for (let i = 0; i < 5; i++) {
    const sp = (i - 2) * 0.32 + (i === 0 ? -0.3 : 0);
    const L = s * (i === 0 ? 0.5 : i === 2 ? 0.78 : 0.68);
    let p = f(s * 1.15, (i - 2) * s * 0.11);
    let an = sp;
    for (let j = 0; j < 3; j++) {
      const seg = L / 3;
      an += curl * 0.6 * (i === 0 ? -1 : 1);
      const q = { x: p.x + Math.cos(-Math.PI / 2 + tilt + an) * seg, y: p.y + Math.sin(-Math.PI / 2 + tilt + an) * seg };
      g.lineStyle(s * 0.085, dark, a).lineBetween(p.x, p.y, q.x, q.y);
      g.lineStyle(s * 0.055, col, a).lineBetween(p.x, p.y, q.x, q.y);
      g.fillStyle(col, a).fillCircle(q.x, q.y, s * 0.035);
      p = q;
    }
    if (rim !== undefined) g.fillStyle(rim, a * 0.8).fillCircle(p.x, p.y, s * 0.03);
  }
}

function callTheBuried(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return aura(
    c,
    k,
    hitMs,
    '#a55cff',
    (v, at) => {
      const side = v.combatant.side === 'party' ? 'party' : 'enemy';
      const P = c.usage?.slot !== undefined ? k.cellMid(side, c.usage.slot) : { x: v.container.x + (v.combatant.side === 'enemy' ? -1 : 1) * 150, y: k.feet(v).y };
      const cracks = Array.from({ length: 5 }, (_, i) => crackPath(k, P, { x: P.x + Math.cos((i / 5) * TAU + 0.3) * 70, y: P.y + Math.sin((i / 5) * TAU + 0.3) * 70 * FLAT }, 9, 0.4));
      const t0 = Math.max(0, at - k.slow(420));
      const END = at + k.slow(900);
      const rs = blob(k, 14, 0.2);
      layer(c, END, k.FLOOR_FX + 3, (g, tm) => {
        if (tm < t0) return;
        const grow = eo((tm - t0) / (at - t0), 1.6);
        const post = clamp01((tm - at) / (END - at));
        const al = 1 - post ** 1.3;
        // kabaran toprak tümseği
        g.fillStyle(C('#2a2018'), 0.7 * al).fillPoints(blobPts({ x: P.x, y: P.y - 4 * grow }, 70 * grow, 22 * grow, rs), true);
        g.fillStyle(C('#3e3024'), 0.6 * al).fillPoints(blobPts({ x: P.x, y: P.y - 8 * grow }, 46 * grow, 12 * grow, rs, 0.5), true);
        for (const cr of cracks) drawCrack(g, cr, grow, al, 4, C('#0e0a08'), C('#5a4a3a'), C('#a55cff'), al * (0.5 + 0.4 * Math.sin(tm / 60)));
      });
      // alçak mor alev + çıkan el (önde)
      const handT = at - k.slow(60);
      layer(c, END, P.y + 30, (g, tm) => {
        if (tm < t0) return;
        const post = clamp01((tm - at) / (END - at));
        const al = 1 - post ** 1.3;
        const pre = eo((tm - t0) / (at - t0), 2);
        for (let i = 0; i < 4; i++) flame(g, P.x + (i - 1.5) * 22, P.y + 2, (24 + 12 * Math.sin(i * 2)) * pre * (1 + (tm > at ? 0.6 * Math.exp(-(tm - at) / k.slow(200)) : 0)), 16, tm / 1000, i * 9.1, al * 0.85, 0, { dark: C('#1a0a2a'), red: C('#3a1a6a'), orange: C('#6a2ab0'), yellow: C('#a55cff'), core: C('#e0c8ff') });
        if (tm < handT) return;
        const q = clamp01((tm - handT) / k.slow(160));
        const rise = eo(q, 2.4);
        const curl = tm < at + k.slow(120) ? 0.1 : 0.1 + 0.8 * eo((tm - at - k.slow(120)) / k.slow(200), 2);
        // el topraktan çıkar: taban zeminin altında, zemin üstü kısım görünür
        const S = 76;
        const D = (1 - rise) * 1.75; // toprağın altında kalan pay (s cinsinden)
        boneHand(g, { x: P.x, y: P.y + 2 + D * S }, S, curl, al * clamp01(q * 4), 0.15, C('#d8d0bc'), C('#4a4238'), C('#c8a0ff'), D);
        // önde toprak dudağı: kolun zemine girdiği yeri örter
        for (let i = 0; i < 5; i++) g.fillStyle(C(i % 2 ? '#3e3024' : '#2a2018'), al).fillEllipse(P.x + (i - 2) * 11, P.y + 4 + Math.abs(i - 2) * 1.5, 18, 8);
        // ele mor kenar ışığı (ölçülü)
        g.fillStyle(C('#a55cff'), 0.1 * al).fillCircle(P.x, P.y - 70 * rise, 40);
      });
      after(c, at - k.slow(60), () => {
        rubble(c, k, P, 12, P.y + 31, { sp: [180, 420], size: [5, 11], cols: ['#2a2018', '#3e3024', '#4a3a2a'] });
        dust(c, k, P, P.y + 29, { n: 6, w: 70, hex: ['#4a3e34', '#5a4c40'], a: 0.36 });
        motes(c, k, P, { n: 10, r: 40, rise: 140, cols: ['#a55cff', '#c8a0ff'], size: [1.6, 2.6], life: 800, depth: P.y + 32 });
        k.shake(c.scene, 100, 0.003);
      });
    },
    true,
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// BONE RITE

function boneSpike(g: G, f: (x: number, y: number) => Pt, L: number, a: number): void {
  const pts = [f(-L * 0.5, -3), f(-L * 0.35, -6), f(-L * 0.3, -3.5), f(L * 0.5, 0), f(-L * 0.3, 3.5), f(-L * 0.35, 6), f(-L * 0.5, 3)];
  g.fillStyle(C('#4a4238'), a).fillPoints(pts.map((p, i) => (i === 3 ? p : p)), true);
  g.fillStyle(C('#e0d8c4'), a).fillPoints([f(-L * 0.48, -2), f(-L * 0.32, -4.5), f(-L * 0.28, -2.2), f(L * 0.46, 0), f(-L * 0.28, 1.5), f(-L * 0.48, 1.6)], true);
  g.lineStyle(1, C('#8a8070'), a).lineBetween(f(-L * 0.2, 0.5).x, f(-L * 0.2, 0.5).y, f(L * 0.3, 0.2).x, f(L * 0.3, 0.2).y);
}

function boneRite(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(c, k, hitMs, '#a55cff', (v, F) => {
    const dir = dirTo(c, v);
    const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.12));
    const from = { x: k.spot(c.actor).x + dir * c.actor.w * 0.35, y: k.spot(c.actor).y - 30 };
    for (let i = 0; i < 3; i++) {
      const arc = (i - 1) * 110;
      const tgt = { x: to.x, y: to.y + (i - 1) * 14 };
      fly(c, k, {
        from: { x: from.x, y: from.y + (i - 1) * 10 },
        to: tgt,
        F,
        arc,
        ease: 1.2,
        hist: 10,
        depth: v.container.depth + 3,
        draw: (g, p, an, _q, _t, hist) => {
          taper(g, [...hist].reverse(), 0, 14, VIOLET.dark, 0.35);
          taper(g, [...hist.slice(0, 6)].reverse(), 0, 6, VIOLET.body, 0.5);
          boneSpike(g, xf(p, an), 62, 1);
        },
      });
    }
    after(c, F, () => {
      spray(c, k, bits(k, 12, to, { kind: 'shard', ang: dir > 0 ? [-0.9, 0.9] : [Math.PI - 0.9, Math.PI + 0.9], sp: [140, 360], size: [5, 10], life: [460, 700], cols: ['#e0d8c4', '#c8bea8', '#a89e88'], jx: 10, jy: 14, up: [40, 120], vr: 9 }), v.container.depth + 4, 1100);
      ringFx(c, k, to, { r0: 10, r1: 70, dur: 300, col: '#6a2ab0', pale: '#e0c8ff', w: 5, flat: 1, depth: v.container.depth + 4 });
      smoke(c, k, puffs(k, to, 4, { hex: ['#5a3a8a', '#4a2a7a'], sx: 16, sy: 20, vy: [-50, -10], s0: [30, 44], s1: [80, 110], life: [600, 900], a: 0.3, drag: 1.4 }), v.container.depth + 2);
      if (hurt(c, v)) {
        gore(c, k, to, UP + dir * 0.5, 12, v.container.depth + 4, { sp: [120, 300] });
        wounds(c, k, v, k.slow(1), [-14, 0, 14].map((o, i) => ({ A: { x: to.x - dir * 6, y: to.y + o - 4 }, B: { x: to.x + dir * 30, y: to.y + o + 6 }, w: 5, lag: i * 10 })), { sw: 50, drips: 3 });
      }
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// REQUIEM (aşamalı): çığlık atan hayaletler

function ghost(g: G, p: Pt, s: number, wail: number, t: number, a: number, seed: number): void {
  // kefen: yuvarlak baş, omuzlardan aşağı genişleyip üç dalgalı uçla biten gövde, iki yana savrulan kol telleri
  const N = 14;
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const w = s * (u < 0.3 ? 0.38 + u * 0.5 : 0.53 - (u - 0.3) * 0.2);
    const sway = Math.sin(u * 5 - t * 6 + seed) * s * 0.14 * u;
    L.push({ x: p.x - w + sway, y: p.y + s * 0.35 + u * s * 1.9 });
    R.push({ x: p.x + w + sway, y: p.y + s * 0.35 + u * s * 1.9 });
  }
  // dalgalı alt kenar (üç uç)
  const bottom: Pt[] = Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    const x = lerp(L[N]!.x, R[N]!.x, u);
    return { x, y: L[N]!.y + Math.abs(Math.sin(u * Math.PI * 3 + t * 4 + seed)) * s * 0.35 };
  });
  const body = [...L, ...bottom, ...R.reverse()];
  g.fillStyle(GHOST.edge, a * 0.4).fillPoints(body.map((q) => ({ x: p.x + (q.x - p.x) * 1.12, y: q.y + 4 })), true);
  g.fillStyle(GHOST.body, a * 0.45).fillPoints(body, true);
  // kollar: omuzdan yukarı / yana kalkan ince teller (çığlık)
  for (const sd of [-1, 1]) {
    const pts = Array.from({ length: 8 }, (_, i) => {
      const u = i / 7;
      return { x: p.x + sd * (s * 0.45 + u * s * 0.7), y: p.y + s * 0.55 - u * s * (0.4 + 0.3 * wail) + Math.sin(u * 4 + t * 7 + sd) * s * 0.08 };
    });
    taper(g, pts, s * 0.16, s * 0.03, GHOST.body, a * 0.5);
  }
  // baş
  g.fillStyle(GHOST.edge, a * 0.45).fillCircle(p.x, p.y + s * 0.2, s * 0.48);
  g.fillStyle(GHOST.body, a * 0.55).fillCircle(p.x, p.y + s * 0.2, s * 0.42);
  g.fillStyle(0xffffff, a * 0.2).fillEllipse(p.x - s * 0.12, p.y + s * 0.05, s * 0.3, s * 0.22);
  // oyuk gözler (iri, eğik) + uzayan ağız
  g.fillStyle(GHOST.hollow, a * 0.95).fillEllipse(p.x - s * 0.16, p.y + s * 0.16, s * 0.18, s * (0.22 + 0.06 * wail));
  g.fillEllipse(p.x + s * 0.16, p.y + s * 0.16, s * 0.18, s * (0.22 + 0.06 * wail));
  g.fillEllipse(p.x, p.y + s * (0.44 + 0.1 * wail), s * (0.16 + 0.06 * wail), s * (0.16 + 0.34 * wail));
}

function requiem(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#a55cff', (a) => {
    for (const st of a.stages)
      for (const p of st.cells) {
        const d = cellDepth(p, 3);
        const seed = k.rnd(0, 9);
        const RISE = k.slow(240);
        const OUT = k.slow(560);
        const s = 66;
        layer(c, st.at + OUT, d, (g, tm) => {
          if (tm < st.at - RISE) return;
          const t = tm / 1000;
          let y: number;
          let al: number;
          let wail: number;
          if (tm < st.at) {
            const q = (tm - st.at + RISE) / RISE;
            y = p.y - 40 - 150 * eo(q, 2);
            al = clamp01(q * 2);
            wail = q * 0.6;
          } else {
            const q = (tm - st.at) / OUT;
            y = p.y - 190 - 70 * eo(q, 1.5);
            al = (1 - q) ** 1.3;
            wail = 0.6 + 0.4 * Math.exp(-(tm - st.at) / k.slow(140));
          }
          ghost(g, { x: p.x + wob(t * 3, seed) * 6, y }, s, wail, t, al, seed);
        }, true);
        // zeminde mor sis + yukarı dağılan teller
        after(c, st.at - RISE, () => smoke(c, k, puffs(k, p, 4, { hex: ['#4a2a6a', '#5a3a7a', '#3a2a5a'], sx: 46, sy: 10, vx: [-30, 30], vy: [-20, -4], s0: [50, 70], s1: [110, 150], life: [900, 1200], a: 0.36, drag: 1.6 }), d - 2));
        after(c, st.at, () => {
          fumes(c, k, { x: p.x, y: p.y - 150 }, { n: 4, spread: 26, h: 170, cols: ['#9a8ac0', '#8a9a8a', '#b8a8d8'], life: 900, a: 0.4, depth: d + 1, w: 6, delay: 120, add: true });
          for (const v of st.victims) if (hurt(c, v)) ringFx(c, k, k.spot(v), { r0: 10, r1: 60, dur: 320, col: '#6a2ab0', pale: '#d8c0ff', w: 4, flat: 1, depth: v.container.depth + 3 });
        });
      }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// UNHOLY BENEDICTION

function benedictionOn(c: VfxCtx, k: VfxKit, v: CombatantView, at: number): void {
  const foot = k.feet(v);
  const headY = v.container.y - v.h - 26;
  const t0 = Math.max(0, at - k.slow(360));
  const END = at + k.slow(900);
  const bones = Array.from({ length: 6 }, () => ({ x: k.rnd(-0.6, 0.6), d: k.rnd(0, 0.5), r: k.rnd(0, 6), vr: k.rnd(-4, 4) }));
  layers(c, END, [{ depth: v.container.depth - 1, add: true }, { depth: v.container.depth + 2, add: true }, { depth: v.container.depth + 3 }], ([back, front, solid], tm) => {
    if (tm < t0) return;
    const q = clamp01((tm - t0) / (at - t0));
    const post = clamp01((tm - at) / (END - at));
    const a = eo(q, 1.5) * (1 - post ** 1.4);
    const flare = tm >= at ? Math.exp(-(tm - at) / k.slow(200)) : 0;
    // hale: yukarıdan iner, başın üstüne oturur
    const hy = lerp(headY - 140, headY, eo(q, 2.2));
    const R = Math.max(44, v.w * 0.42);
    back!.lineStyle(7, VIOLET.dark, 0.5 * a).strokeEllipse(v.container.x, hy, R * 2, R * 0.6);
    front!.lineStyle(3, VIOLET.body, 0.9 * a).strokePoints(Array.from({ length: 13 }, (_, i) => ({ x: v.container.x + Math.cos((i / 12) * Math.PI) * R, y: hy + Math.sin((i / 12) * Math.PI) * R * 0.3 })), false);
    front!.lineStyle(1.6, VIOLET.pale, (0.6 + 0.4 * flare) * a).strokePoints(Array.from({ length: 13 }, (_, i) => ({ x: v.container.x + Math.cos((i / 12) * Math.PI) * R * 0.94, y: hy + Math.sin((i / 12) * Math.PI) * R * 0.28 })), false);
    // ışık perdesi: haleden ayağa düşen soluk sütun
    const h = (foot.y - hy) * eo(q, 1.6);
    back!.fillStyle(VIOLET.body, 0.12 * a * (1 + flare)).fillRect(v.container.x - R, hy, R * 2, h);
    back!.fillStyle(VIOLET.pale, 0.1 * a * (1 + flare)).fillRect(v.container.x - R * 0.35, hy, R * 0.7, h);
    // süzülen kemik parçaları (normal karışım)
    for (const b of bones) {
      const u = clamp01((q - b.d) / (1 - b.d)) * 0.7 + post * 0.3;
      if (u <= 0) continue;
      const p = { x: v.container.x + b.x * R * 1.6, y: lerp(hy, foot.y - 20, u) };
      const f = xf(p, b.r + b.vr * u);
      solid!.lineStyle(4, C('#4a4238'), a).lineBetween(f(-7, 0).x, f(-7, 0).y, f(7, 0).x, f(7, 0).y);
      solid!.lineStyle(2.4, C('#d8d0bc'), a).lineBetween(f(-7, 0).x, f(-7, 0).y, f(7, 0).x, f(7, 0).y);
      solid!.fillStyle(C('#d8d0bc'), a).fillCircle(f(-7, 0).x, f(-7, 0).y, 2.5).fillCircle(f(7, 0).x, f(7, 0).y, 2.5);
    }
  });
  sigilFx(c, k, foot, Math.max(70, v.w * 0.7), { col: VIOLET.body, pale: VIOLET.pale, deep: VIOLET.deep, ticks: 8, inner: 'none', arcs: 2, peak: at, end: END });
  motes(c, k, { x: foot.x, y: foot.y - 10 }, { n: 14, r: v.w * 0.5, rise: v.h * 1.1, cols: ['#c8a0ff', '#a55cff', '#e0c8ff'], size: [1.6, 2.6], life: 900, depth: v.container.depth + 3, delay: 400, orbit: 0.7 });
}
const unholyBenediction: MobHandVfx = (c, k, hitMs) => aura(c, k, hitMs, '#a55cff', (v, at) => benedictionOn(c, k, v, at));

// ---------------------------------------------------------------------------------------------------------------------
// CLUTCH / DRAG UNDER

const MURK = { deep: C('#0c1a18'), body: C('#1e3a34'), light: C('#3a6a5e'), foam: C('#a8c8c0') };
const WEED = [C('#2a3a1e'), C('#3a4a24'), C('#1e2a16')];

function puddle(g: G, p: Pt, rx: number, rs: number[], a: number, t: number): void {
  g.fillStyle(MURK.deep, 0.7 * a).fillPoints(blobPts(p, rx, rx * 0.32, rs), true);
  g.fillStyle(MURK.body, 0.75 * a).fillPoints(blobPts({ x: p.x, y: p.y - 2 }, rx * 0.8, rx * 0.24, rs, 0.4), true);
  g.lineStyle(1.5, MURK.light, 0.5 * a).strokeEllipse(p.x, p.y - 2, rx * 1.2 * (0.8 + 0.2 * Math.sin(t * 3)), rx * 0.34 * (0.8 + 0.2 * Math.sin(t * 3)));
}

/** Çürük el (yerel: taban, yukarı): kalın şişkin parmaklar, yosun telleri. */
function drownedHand(g: G, base: Pt, s: number, curl: number, a: number, tilt: number): void {
  const flesh = C('#6a7a6a');
  const dark = C('#2e3a30');
  const f = xf(base, -Math.PI / 2 + tilt);
  const arm = [f(-s * 0.2, -s * 0.16), f(s * 0.9, -s * 0.13), f(s * 0.9, s * 0.13), f(-s * 0.2, s * 0.16)];
  g.fillStyle(dark, a).fillPoints(arm.map((p, i) => ({ x: p.x + (i < 2 ? -2 : 2), y: p.y })), true);
  g.fillStyle(flesh, a).fillPoints(arm, true);
  const palm = f(s * 1.02, 0);
  g.fillStyle(flesh, a).fillEllipse(palm.x, palm.y, s * 0.5, s * 0.46);
  g.lineStyle(2, dark, a * 0.8).strokeEllipse(palm.x, palm.y, s * 0.5, s * 0.46);
  for (let i = 0; i < 5; i++) {
    let p = f(s * 1.15, (i - 2) * s * 0.12);
    let an = (i - 2) * 0.28 + (i === 0 ? -0.4 : 0);
    const L = s * (i === 0 ? 0.42 : 0.6);
    for (let j = 0; j < 2; j++) {
      an += curl * 0.8 * (i === 0 ? -1 : 1);
      const q = { x: p.x + Math.cos(-Math.PI / 2 + tilt + an) * (L / 2), y: p.y + Math.sin(-Math.PI / 2 + tilt + an) * (L / 2) };
      g.lineStyle(s * 0.14, dark, a).lineBetween(p.x, p.y, q.x, q.y);
      g.lineStyle(s * 0.1, flesh, a).lineBetween(p.x, p.y, q.x, q.y);
      p = q;
    }
    g.fillStyle(C('#1a1a12'), a).fillCircle(p.x, p.y, s * 0.035);
  }
  // yosun telleri
  for (let i = 0; i < 3; i++) {
    const p0 = f(s * (0.3 + i * 0.25), (i - 1) * s * 0.1);
    g.lineStyle(2, WEED[i % 3]!, a * 0.9).strokePoints([p0, { x: p0.x + 10 + i * 3, y: p0.y + 14 }, { x: p0.x + 6 + i * 4, y: p0.y + 30 }], false);
  }
}

function clutchOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const foot = k.feet(v);
  const P = { x: foot.x - dirTo(c, v) * v.w * 0.15, y: foot.y };
  const rs = blob(k, 16, 0.18);
  const t0 = Math.max(0, T - k.slow(200));
  const END = T + k.slow(820);
  layer(c, END, k.FLOOR_FX + 3, (g, tm) => {
    if (tm < t0) return;
    const grow = eo((tm - t0) / k.slow(150), 2);
    const post = clamp01((tm - T - k.slow(300)) / k.slow(520));
    puddle(g, P, 80 * grow, rs, 1 - post, tm / 1000);
  });
  layer(c, END, v.container.depth + 2, (g, tm) => {
    const hT = T - k.slow(110);
    if (tm < hT) return;
    const q = clamp01((tm - hT) / k.slow(110));
    const post = clamp01((tm - T - k.slow(300)) / k.slow(420));
    const rise = eo(q, 2) * (1 - eo(post, 2));
    const curl = tm < T ? 0 : eo((tm - T) / k.slow(90), 2) * 0.9;
    drownedHand(g, { x: P.x, y: P.y + 10 }, 92 * Math.max(0.05, rise), curl, clamp01(q * 3) * (1 - post), dirTo(c, v) * -0.25);
    // el su yüzeyinden çıkar: önünde su halkası
    g.lineStyle(3, MURK.foam, 0.5 * (1 - post)).strokeEllipse(P.x, P.y + 4, 46, 12);
  });
  after(c, T - k.slow(110), () => spray(c, k, bits(k, 18, P, { kind: 'drop', ang: [-Math.PI + 0.3, -0.3], sp: [160, 380], size: [2.5, 4.5], life: [460, 700], cols: ['#3a6a5e', '#5a8a7e', '#a8c8c0'], jx: 20, jy: 4, floor: P.y + 6 }), v.container.depth + 3, 1300));
  after(c, T, () => {
    if (hurt(c, v)) gore(c, k, bodyAt(k, v, dirTo(c, v), 0, 0.5), UP, 6, v.container.depth + 3, { sp: [60, 180], cols: GORE });
    bubbles(c, k, P, v.container.depth + 3, 900);
    // Silence: ağız hizasında koyu camgöbeği zerreler
    motes(c, k, { x: v.container.x, y: v.container.y - v.h * 0.8 }, { n: 6, r: 20, rise: 30, cols: ['#3a6a5e', '#5a8a7e'], size: [1.4, 2.2], life: 700, depth: v.container.depth + 4 });
  });
}

function bubbles(c: VfxCtx, k: VfxKit, p: Pt, depth: number, life: number): void {
  const list = Array.from({ length: 10 }, () => ({ x: k.rnd(-40, 40), d: k.rnd(0, 0.5), s: k.rnd(2, 5), h: k.rnd(60, 140) }));
  layer(c, k.slow(life), depth, (g, tm) => {
    const u = tm / k.slow(life);
    for (const b of list) {
      const q = clamp01((u - b.d) / (1 - b.d));
      if (q <= 0 || q >= 1) continue;
      const x = p.x + b.x + Math.sin(q * 9 + b.x) * 4;
      const y = p.y - b.h * q;
      g.lineStyle(1.4, MURK.foam, (1 - q) * 0.8).strokeCircle(x, y, b.s);
      g.fillStyle(0xffffff, (1 - q) * 0.4).fillCircle(x - b.s * 0.3, y - b.s * 0.3, b.s * 0.3);
    }
  });
}

const clutch: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => clutchOn(c, k, v, T), { shake: [80, 0.0024] });

function dragUnderOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const foot = k.feet(v);
  const P = { x: foot.x, y: foot.y };
  const t0 = Math.max(0, T - k.slow(220));
  const END = T + k.slow(900);
  // girdap: dönen spiral kollar (zemin)
  layer(c, END, k.FLOOR_FX + 3, (g, tm) => {
    if (tm < t0) return;
    const grow = eo((tm - t0) / k.slow(200), 2);
    const post = clamp01((tm - T - k.slow(300)) / k.slow(600));
    const a = grow * (1 - post);
    const R = 95 * grow;
    g.fillStyle(MURK.deep, 0.7 * a).fillEllipse(P.x, P.y, R * 2, R * 2 * 0.32);
    g.fillStyle(MURK.body, 0.6 * a).fillEllipse(P.x, P.y, R * 1.5, R * 1.5 * 0.32);
    const rot = tm / k.slow(160);
    for (let arm = 0; arm < 4; arm++) {
      const pts = Array.from({ length: 16 }, (_, i) => {
        const s = i / 15;
        const an = rot + (arm * TAU) / 4 + s * 3.2;
        return { x: P.x + Math.cos(an) * R * (1 - s * 0.85), y: P.y + Math.sin(an) * R * (1 - s * 0.85) * 0.32 };
      });
      taper(g, pts, 1, 6, MURK.light, 0.7 * a);
      taper(g, pts, 0.5, 2, MURK.foam, 0.5 * a);
    }
    g.fillStyle(0x000000, 0.4 * a).fillEllipse(P.x, P.y, R * 0.4, R * 0.12);
  });
  // yosun dalları: yükselir, bacaklara dolanır, vuruşta aşağı çeker
  const vines = Array.from({ length: 4 }, (_, i) => ({ x: (i - 1.5) * 26, ph: k.rnd(0, TAU), h: k.rnd(80, 130) }));
  layers(c, END, [{ depth: v.container.depth - 1 }, { depth: v.container.depth + 2 }], ([back, front], tm) => {
    if (tm < t0) return;
    const q = clamp01((tm - t0) / (T - t0));
    const pull = tm < T ? 0 : eo((tm - T) / k.slow(140), 2);
    const post = clamp01((tm - T - k.slow(250)) / k.slow(400));
    const a = 1 - post;
    vines.forEach((vn, i) => {
      const h = vn.h * eo(q, 1.6) * (1 - 0.6 * pull);
      const pts = Array.from({ length: 12 }, (_, j) => {
        const s = j / 11;
        const wrap = Math.sin(s * 6 + vn.ph + tm / k.slow(90)) * (14 + 10 * s);
        return { x: P.x + vn.x * (1 - s * 0.6) + wrap, y: P.y - s * h, z: Math.cos(s * 6 + vn.ph) };
      });
      const g = i % 2 ? front! : back!;
      taper(g, pts, 14, 3, WEED[i % 3]!, a);
      taper(g, pts, 6, 1.5, C('#4a5a2a'), a * 0.8);
    });
  });
  after(c, T, () => {
    spray(c, k, bits(k, 20, P, { kind: 'drop', ang: [-Math.PI + 0.2, -0.2], sp: [140, 360], size: [2.5, 4.5], life: [460, 720], cols: ['#3a6a5e', '#5a8a7e', '#a8c8c0'], jx: 40, jy: 6, floor: P.y + 6 }), v.container.depth + 3, 1300);
    bubbles(c, k, P, v.container.depth + 3, 1000);
    if (hurt(c, v)) gore(c, k, bodyAt(k, v, dirTo(c, v), 0, 0.4), UP, 6, v.container.depth + 3, { sp: [60, 180] });
  });
}
const dragUnder: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => dragUnderOn(c, k, v, T), { shake: [110, 0.003] });

export const UNDEAD: Readonly<Record<string, MobHandVfx>> = {
  dirge,
  call_the_buried: callTheBuried,
  bone_rite: boneRite,
  requiem,
  unholy_benediction: unholyBenediction,
  clutch,
  drag_under: dragUnder,
};
