/**
 * ATEŞ efektleri (gerçekçi ateş: koyu kızıl kenar, turuncu gövde, sarı iç, küçük açık çekirdek; neon yok, duman koyu ve ağır):
 *   Shovel of Embers (Charcoal Burner): kürekten savrulan kor kömür parçaları + kıvılcım bulutu; vuruşta kül bulutu (kör), yere düşüp
 *     tüten kömürler.
 *   Kiln Smoke (Charcoal Burner, sütun boyunca aşama aşama): her hücrede zemin çatlaklarında kor, dipte alev, göğe kalkan koyu duman sütunu.
 *   Ember Toss (Ember Acolyte): alev topu (titreşen katmanlar, alev kuyruğu, duman izi); vuruşta dışa açılan alev yaprakları, duman, kor.
 *   Burn the Ground (Ember Acolyte, 2x2): merkezden hücrelere yayılan kor çatlakları; vuruşta tüm hücrelerde alev yatağı, yanık zemin, duman.
 *   Burn the Field (Ember Hierophant, 2x3): zemine ateş rün dairesi kazınır; vuruşta çember boyunca alev duvarı + her hücrede alev, ağır duman.
 *   Drakefire (Drake Priest): ejder başı biçiminde alev nefesi (açık çene, boynuz) hedefe uçar ve sarar; gövdede kalan alev dilleri.
 *   Dragon's Breath (Drake Priest, X): çapraz kollar boyunca dışarıdan merkeze akan alev jetleri; her hücrede patlama + yanık zemin.
 *   Kindle the Faithful (Drake Priest, dost): zeminde ateş halkası, dostun üstünde sıcak hava kubbesi, sarmal yükselen kor (Haste).
 *     (Ömer: "son kareler yukarı çıkıyor, olmasın": kubbe yerinde söner.)
 *   Hold the Gate (Cinder Gatewarden): yerden yükselen kızgın demir kapı kemeri; vuruşta parmaklık iner (kıvılcım, kor, toz).
 *   Cinder Lash (Lord Morvane): kızgın zincir kırbaç yay çizerek hedefe şaklar; yanık iz, kor püskürmesi, zincir geri çekilir.
 *   Ashfall (Lord Morvane, 2x2): gökten çapraz düşen yanan kül kayaları (duman izli); hücrede küçük alev patlaması, gri kül sütunu.
 *   Iron Decree (Lord Morvane, tüm dostlar Haste): yerden yükselen demir dikenli taç halkası, uçlarında alev; dışa yayılan buyruk halkası.
 *   Pyre of Morvane (Lord Morvane, tüm tahta): her hücrede çatılmış kütükler üstünde uzun odun ateşi (taç biçimli çekirdek), ağır duman.
 *   Holy Ember (Censer Monk): tütsü dumanı izi bırakan altın kor; vuruşta altın kıvılcım, kısa güneş çarkı işareti, tütsü bulutu.
 *   Consecrate (Censer Monk, 2x2): zemine haçlı altın kutsama dairesi; çember boyunca kutsal alev, ortadan yükselen tütsü; vuruşta alevler kabarır.
 */
import type { MobHandVfx } from '../mob-vfx';
import { C, FLAT, TAU, UP, after, bits, clamp01, eo, layer, layers, lerp, puffs, smoke, spray, wob, type CombatantView, type G, type Pt, type VfxCtx, type VfxKit } from './core';
import { FIRE, HOLYFIRE, PYRE, blob, blobPts, chain, crackPath, drawCrack, fan, flame, sagLine, taper, tongues, xf, type FirePal } from './draw';
import { angTo, fly } from './bolts';
import { area, areaCenter, aura, bolt, boardCells } from './flow';
import { columnFx, fumes, motes, rays, ringFx, sigilFx } from './magic';
import { bedTimeline, flameField, type FlamePal } from './flames';
import { BURN, EMBERS, STONE, bodyAt, cellDepth, dust, embers, gore, rubble, sparks, wounds } from './phys';

const hurt = (c: VfxCtx, v: CombatantView): boolean => !c.usage || c.usage.damages.some((d) => d.target === v.combatant.uid && d.amount > 0);
const dirTo = (c: VfxCtx, v: CombatantView | Pt): number => (('container' in v ? v.container.x : v.x) >= c.actor.container.x ? 1 : -1);
const SMOKE = ['#4a423c', '#5a524a', '#433b35', '#625850'];
const ASH = ['#5a544e', '#6a645e', '#4a4440', '#7a746c'];

// ---------------------------------------------------------------------------------------------------------------------
// ortak ateş parçaları

/** Alev topu: titreşen katmanlı çekirdek + geçmiş konumlardan alev kuyruğu (sivrilen, kızıldan dumana). */
function fireball(g: G, p: Pt, r: number, t: number, hist: Pt[], pal: FirePal = FIRE, add?: G): void {
  // kuyruk: eskiden yeniye büyüyen, solan lekeler
  for (let i = hist.length - 1; i >= 1; i--) {
    const h = hist[i]!;
    const q = i / hist.length;
    const rr = r * (1 - q) * 0.95 + 2;
    const col = q < 0.3 ? pal.orange : q < 0.6 ? pal.red : pal.dark;
    g.fillStyle(col, (1 - q) * 0.75).fillCircle(h.x + wob(t * 9 + i, 3) * 3, h.y + wob(t * 7 + i, 5) * 3, rr);
  }
  const fl = (s: number) => 1 + 0.12 * wob(t * 14, s);
  g.fillStyle(pal.dark, 0.6).fillCircle(p.x, p.y, r * 1.35 * fl(1));
  g.fillStyle(pal.red, 0.9).fillCircle(p.x, p.y, r * 1.08 * fl(2));
  g.fillStyle(pal.orange, 0.95).fillCircle(p.x - r * 0.08, p.y - r * 0.05, r * 0.82 * fl(3));
  g.fillStyle(pal.yellow, 0.95).fillCircle(p.x - r * 0.14, p.y - r * 0.1, r * 0.52 * fl(4));
  (add ?? g).fillStyle(pal.core, 0.8).fillCircle(p.x - r * 0.18, p.y - r * 0.14, r * 0.26);
}

/** Dışa açılan alev yaprakları (patlama): her yaprak merkezden dışa sivrilen, titreşen dil; büyüyüp söner. */
function fireBurst(c: VfxCtx, k: VfxKit, p: Pt, R: number, depth: number, o: { dur?: number; n?: number; pal?: FirePal; flat?: number; up?: number } = {}): void {
  const n = o.n ?? 11;
  const pal = o.pal ?? FIRE;
  const petals = Array.from({ length: n }, (_, i) => ({ a: (i / n) * TAU + k.rnd(-0.2, 0.2), L: R * k.rnd(0.6, 1.1), w: R * k.rnd(0.28, 0.42), s: k.rnd(0, 50) }));
  const D = k.slow(o.dur ?? 380);
  layer(c, D, depth, (g, tm) => {
    const q = tm / D;
    const grow = eo(q / 0.4, 2);
    const a = q < 0.25 ? 1 : (1 - (q - 0.25) / 0.75) ** 1.3;
    const t = tm / 1000;
    const flat = o.flat ?? 0.8;
    // yukarı yönlü yapraklar biraz uzun (sıcak hava)
    for (const [col, sc, al] of [
      [pal.dark, 1, 0.55],
      [pal.red, 0.86, 0.85],
      [pal.orange, 0.66, 0.9],
      [pal.yellow, 0.42, 0.85],
    ] as Array<[number, number, number]>) {
      for (const pt of petals) {
        const L = pt.L * grow * sc * (1 + (o.up ?? 0.35) * Math.max(0, -Math.sin(pt.a)));
        const e = { x: p.x + Math.cos(pt.a) * L, y: p.y + Math.sin(pt.a) * L * flat - (o.up ?? 0.35) * L * 0.4 * q };
        const m = { x: lerp(p.x, e.x, 0.45) + wob(t * 10, pt.s) * 5, y: lerp(p.y, e.y, 0.45) + wob(t * 9, pt.s + 1) * 5 };
        taper(g, [p, m, e], pt.w * sc * grow, 0, col, a * al, (s) => pt.w * sc * grow * Math.sin(Math.PI * Math.min(1, s * 0.7 + 0.3)) * (1 - s) ** 0.5);
      }
    }
    g.fillStyle(pal.yellow, 0.8 * a).fillCircle(p.x, p.y, R * 0.3 * grow);
    g.fillStyle(pal.core, 0.7 * a * (1 - q)).fillCircle(p.x, p.y, R * 0.16 * grow);
  });
}

/** Yanık zemin lekeleri (koyu, kenarı düzensiz; içinde sönen kor noktaları): TÜM hücreler tek Graphics'te (çok hücreli alanlarda ucuz). */
function scorch(c: VfxCtx, k: VfxKit, items: Array<{ p: Pt; rx: number; at: number }>, dur: number, o: { ember?: boolean } = {}): void {
  if (!items.length) return;
  const list = items.map((it) => ({ ...it, rs: blob(k, 14, 0.25), dots: Array.from({ length: 5 }, () => ({ x: k.rnd(-0.7, 0.7) * it.rx, y: k.rnd(-0.6, 0.6) * it.rx * FLAT, s: k.rnd(0, 9) })) }));
  const D = k.slow(dur);
  const end = Math.max(...items.map((it) => it.at)) + D;
  const c0 = C('#0e0906');
  const c1 = C('#1c120c');
  const ce = C('#d0581a');
  layer(c, end, k.FLOOR_FX + 2, (g, tm) => {
    for (const it of list) {
      if (tm < it.at) continue;
      const q = (tm - it.at) / D;
      if (q >= 1) continue;
      const a = q < 0.08 ? q / 0.08 : (1 - (q - 0.08) / 0.92) ** 1.2;
      fan(g, it.p, blobPts(it.p, it.rx, it.rx * FLAT, it.rs), c0, 0.55 * a);
      fan(g, it.p, blobPts(it.p, it.rx * 0.7, it.rx * 0.7 * FLAT, it.rs, 0.4), c1, 0.5 * a);
      if (o.ember !== false) for (const d of it.dots) g.fillStyle(ce, 0.6 * a * (0.5 + 0.5 * Math.sin(tm / 70 + d.s)) * (1 - q)).fillCircle(it.p.x + d.x, it.p.y + d.y, 2.5);
    }
  });
}

/** Koyu, ağır yükselen duman sütunu. */
function smokeColumn(c: VfxCtx, k: VfxKit, p: Pt, depth: number, o: { n?: number; w?: number; vy?: [number, number]; s1?: [number, number]; a?: number; delay?: number; hex?: string[]; life?: [number, number] } = {}): void {
  smoke(
    c,
    k,
    puffs(k, p, o.n ?? 6, {
      hex: o.hex ?? SMOKE,
      sx: o.w ?? 30,
      sy: 8,
      vx: [-20, 20],
      vy: o.vy ?? [-200, -120],
      s0: [56, 76],
      s1: (o.s1 ? [o.s1[0] * 1.3, o.s1[1] * 1.3] : [160, 230]) as [number, number],
      life: o.life ?? [1100, 1500],
      a: Math.min(0.85, (o.a ?? 0.55) * 1.3),
      drag: 0.9,
      delay: [o.delay ?? 0, (o.delay ?? 0) + 260],
      rise: 0.12,
    }),
    depth,
  );
}

/** Hücrede alev yatağı (kodla üretilmiş alev dokusu, src/game/mob-vfx-hand/flames.ts): belirir, doruğa çıkar, söner (`at` doruk). */
function cellFire(c: VfxCtx, k: VfxKit, p: Pt, at: number, o: { n?: number; rx?: number; h?: [number, number]; w?: [number, number]; hold?: number; fade?: number; pal?: FlamePal; pre?: number; depth?: number; lean?: number } = {}): void {
  const list = tongues(k, o.n ?? 7, p, o.rx ?? 48, (o.rx ?? 48) * FLAT, o.h ?? [50, 100], o.w ?? [22, 34]);
  const tl = bedTimeline(k, at, { pre: o.pre ?? 90, hold: o.hold ?? 380, fade: o.fade ?? 420 });
  flameField(c, k, list, at + k.slow(o.hold ?? 380) + k.slow(o.fade ?? 420), o.depth ?? cellDepth(p, 2), o.pal ?? 'fire', (tm) => ({ ...tl(tm), lean: o.lean ?? 0 }));
}

// ---------------------------------------------------------------------------------------------------------------------
// SHOVEL OF EMBERS

function coal(g: G, p: Pt, s: number, rot: number, t: number, a = 1): void {
  const f = xf(p, rot);
  const pts = [f(-s, -s * 0.5), f(-s * 0.2, -s * 0.9), f(s * 0.8, -s * 0.6), f(s, s * 0.3), f(s * 0.1, s * 0.85), f(-s * 0.8, s * 0.5)];
  g.fillStyle(C('#1a110c'), a).fillPoints(pts, true);
  const glow = 0.6 + 0.4 * Math.sin(t * 20 + rot * 5);
  g.lineStyle(2, C('#e0601a'), a * glow).strokePoints([f(-s * 0.5, -s * 0.2), f(0, s * 0.1), f(s * 0.5, -s * 0.15)], false);
  g.fillStyle(C('#ff9a3a'), a * glow * 0.7).fillCircle(f(0, 0).x, f(0, 0).y, s * 0.25);
}

function shovelOfEmbers(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(
    c,
    k,
    hitMs,
    '#ff7a1a',
    (v, F) => {
      const dir = dirTo(c, v);
      const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.1));
      const from = { x: k.spot(c.actor).x + dir * c.actor.w * 0.4, y: k.spot(c.actor).y + 10 };
      const chunks = Array.from({ length: 7 }, (_, i) => ({ ox: k.rnd(-24, 24), oy: k.rnd(-30, 30), arc: k.rnd(50, 110), s: k.rnd(9, 15), rot: k.rnd(0, 6), vr: k.rnd(-12, 12), lag: i * 0.03 }));
      layer(c, F, v.container.depth + 3, (g, tm) => {
        const q = tm / F;
        for (const ch of chunks) {
          const u = clamp01((q - ch.lag) / (1 - ch.lag));
          if (u <= 0) continue;
          const x = lerp(from.x, to.x + ch.ox * 0.4, u);
          const y = lerp(from.y, to.y + ch.oy * 0.6, u) - Math.sin(Math.PI * u) * ch.arc;
          const sp = { x: x + ch.ox * Math.sin(Math.PI * u), y: y + ch.oy * Math.sin(Math.PI * u) };
          // sıcak hava izi: kısa turuncu kuyruk
          g.lineStyle(ch.s * 0.9, C('#a8320c'), 0.35).lineBetween(sp.x - dir * 18, sp.y + 6 * Math.cos(Math.PI * u), sp.x, sp.y);
          coal(g, sp, ch.s, ch.rot + ch.vr * u, tm / 1000);
        }
      });
      // savrulan kıvılcım bulutu (kömürlerle birlikte)
      spray(c, k, bits(k, 22, from, { kind: 'ember', ang: [angTo(from, to) - 0.35, angTo(from, to) + 0.25], sp: [600, 1000], size: [1.4, 2.6], life: [260, 420], cols: EMBERS, jx: 10, jy: 10, drag: 2, up: [60, 160] }), v.container.depth + 3, 400, true);
      after(c, F, () => {
        fireBurst(c, k, to, 46, v.container.depth + 3, { n: 8, dur: 300 });
        embers(c, k, to, 18, v.container.depth + 4, { sp: [120, 320], ang: [-Math.PI, 0.2], jx: 20, jy: 20 });
        // kül bulutu (kör)
        smoke(c, k, puffs(k, to, 6, { hex: ['#4a423c', '#5a524a', '#3a342e'], sx: 22, sy: 20, vx: [dir * 20, dir * 110], vy: [-70, -10], s0: [36, 54], s1: [100, 150], life: [800, 1150], a: 0.5, drag: 1.8 }), v.container.depth + 3);
        // kömürler yere düşüp tüter
        spray(c, k, bits(k, 5, to, { kind: 'rock', ang: [-2.4, -0.7], sp: [80, 200], size: [4, 7], life: [700, 1000], cols: ['#1a110c', '#2a1a10'], rim: '#c8501a', jx: 10, jy: 10, floor: k.feet(v).y }), v.container.depth + 3, 1400);
        if (hurt(c, v)) wounds(c, k, v, k.slow(1), [{ A: { x: to.x - dir * 6, y: to.y - 20 }, B: { x: to.x + dir * 26, y: to.y + 16 }, w: 7 }], { pal: BURN, drips: 0, sw: 50 });
      });
    },
    { anim: 'attack' },
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// KILN SMOKE (sütun boyunca aşamalı)

function kilnSmoke(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#ff7a1a', (a) => {
    for (const st of a.stages)
      for (const p of st.cells) {
        const d = cellDepth(p, 2);
        const cr = Array.from({ length: 4 }, (_, i) => crackPath(k, p, { x: p.x + Math.cos((i / 4) * TAU + 0.4) * 60, y: p.y + Math.sin((i / 4) * TAU + 0.4) * 60 * FLAT }, 7, 0.4));
        const pre = k.slow(160);
        layer(c, st.at + k.slow(900), k.FLOOR_FX + 3, (g, tm) => {
          if (tm < st.at - pre) return;
          const grow = eo((tm - st.at + pre) / pre, 2);
          const q = clamp01((tm - st.at) / k.slow(900));
          const al = 1 - q ** 1.4;
          for (const c0 of cr) drawCrack(g, c0, grow, al, 4, C('#140a06'), C('#6a4a3a'), C('#e0601a'), al * (0.6 + 0.3 * Math.sin(tm / 50)));
        });
        cellFire(c, k, p, st.at, { n: 6, rx: 40, h: [40, 80], w: [20, 30], hold: 260, fade: 380, pre: 120, depth: d });
        after(c, st.at, () => {
          smokeColumn(c, k, { x: p.x, y: p.y - 30 }, d + 1, { n: 9, w: 26, vy: [-340, -220], s1: [130, 200], a: 0.66 });
          embers(c, k, { x: p.x, y: p.y - 20 }, 10, d + 2, { sp: [80, 240], ang: [-Math.PI * 0.7, -Math.PI * 0.3], jx: 26, jy: 8, grav: -160 });
          for (const v of st.victims) if (hurt(c, v)) embers(c, k, k.spot(v), 6, v.container.depth + 3, { jx: 20, jy: 30 });
        });
      }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// EMBER TOSS

function emberToss(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(c, k, hitMs, '#ff7a1a', (v, F) => {
    const dir = dirTo(c, v);
    const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.1));
    const from = { x: k.spot(c.actor).x + dir * c.actor.w * 0.35, y: k.spot(c.actor).y - 20 };
    fly(c, k, {
      from,
      to,
      F,
      arc: 40,
      hist: 12,
      depth: v.container.depth + 3,
      draw: (g, p, _an, q, tm, hist) => fireball(g, p, 15 + 5 * q, tm / 1000, hist),
    });
    after(c, F * 0.3, () => smoke(c, k, puffs(k, { x: lerp(from.x, to.x, 0.35), y: lerp(from.y, to.y, 0.35) - 20 }, 2, { hex: SMOKE, sx: 20, sy: 6, vy: [-50, -20], s0: [20, 30], s1: [50, 70], life: [500, 700], a: 0.25, drag: 1 }), v.container.depth + 2));
    after(c, F, () => {
      fireBurst(c, k, to, 70, v.container.depth + 3, { n: 12, dur: 380 });
      embers(c, k, to, 20, v.container.depth + 4, { sp: [120, 360], ang: [-Math.PI, 0.3], jx: 16, jy: 16 });
      smoke(c, k, puffs(k, to, 5, { hex: SMOKE, sx: 20, sy: 20, vy: [-110, -50], s0: [34, 50], s1: [90, 130], life: [700, 1000], a: 0.42, drag: 1.2, delay: [60, 160] }), v.container.depth + 2);
      if (hurt(c, v)) wounds(c, k, v, k.slow(1), [{ A: { x: to.x, y: to.y - 24 }, B: { x: to.x + dir * 24, y: to.y + 20 }, w: 8 }], { pal: BURN, drips: 0, sw: 50 });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// BURN THE GROUND (2x2) / BURN THE FIELD (2x3)

function burnGround(c: VfxCtx, k: VfxKit, hitMs: number, big: boolean): Promise<void> {
  return area(c, k, hitMs, big ? '#ff5a1a' : '#ff4d1a', (a) => {
    const C0 = areaCenter(c, k, a.cells);
    const far = Math.max(...a.cells.map((p) => Math.hypot(p.x - C0.x, (p.y - C0.y) / FLAT)));
    const cracks = a.cells.filter((p) => Math.hypot(p.x - C0.x, p.y - C0.y) > 8).map((p) => crackPath(k, C0, { x: C0.x + (p.x - C0.x) * 1.25, y: C0.y + (p.y - C0.y) * 1.25 }, 12, 0.5));
    const t0 = a.wu * 0.3;
    // hazırlık: merkezden hücrelere kor çatlakları (alev rengi dipte), merkezde ısınan leke
    layer(c, a.at + k.slow(1300), k.FLOOR_FX + 3, (g, tm) => {
      if (tm < t0) return;
      const grow = eo((tm - t0) / (a.at - t0), 1.6);
      const post = clamp01((tm - a.at) / k.slow(1300));
      const al = 1 - post ** 1.3;
      for (const cr of cracks) drawCrack(g, cr, grow, al, 5, C('#120804'), C('#6a4a3a'), C('#f07a24'), al * (0.7 + 0.3 * Math.sin(tm / 45)));
      g.fillStyle(C('#e0601a'), 0.18 * grow * al).fillEllipse(C0.x, C0.y, 80 * grow, 30 * grow);
    });
    if (big)
      sigilFx(c, k, C0, Math.max(150, far * 0.95), {
        col: C('#e06a1c'),
        pale: C('#ffc070'),
        deep: C('#7a2a0c'),
        ticks: 14,
        inner: 'sun',
        arcs: 4,
        peak: a.at,
        end: a.at + k.slow(1200),
        spin: 0.8,
      });
    scorch(c, k, a.cells.map((p) => ({ p, rx: 62, at: a.at })), 1500);
    for (const p of a.cells) {
      cellFire(c, k, p, a.at, { n: big ? 8 : 7, rx: 50, h: big ? [70, 130] : [60, 110], hold: 460, fade: 520, pre: 80 });
    }
    if (big) {
      // çember boyunca alev duvarı (önden arkaya sıralı)
      const R = Math.max(150, far * 0.95);
      const ring = Array.from({ length: 16 }, (_, i) => {
        const an = (i / 16) * TAU;
        return { x: C0.x + Math.cos(an) * R, y: C0.y + Math.sin(an) * R * FLAT, h: k.rnd(50, 90), w: k.rnd(22, 30), seed: k.rnd(0, 99), at: k.rnd(0, 0.5) };
      }).sort((p, q) => p.y - q.y);
      const frontD = Math.max(...a.cells.map((p) => p.y)) + 20;
      flameField(c, k, ring, a.at + k.slow(1000), (f) => (f.y < C0.y ? k.FLOOR_FX + 5 : frontD), 'fire', (tm) => {
        if (tm < a.at - k.slow(60)) return { grow: 0, a: 0 };
        const u = (tm - a.at + k.slow(60)) / k.slow(1060);
        const grow = eo(u / 0.15, 2) * (u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1);
        return { grow, a: clamp01(grow * 1.4) };
      });
    }
    after(c, a.at, () => {
      for (const p of a.cells) {
        smokeColumn(c, k, { x: p.x, y: p.y - 40 }, cellDepth(p, 3), { n: big ? 5 : 4, w: 34, vy: [-170, -100], s1: [110, 160], a: 0.42, delay: 120 });
        embers(c, k, p, 7, cellDepth(p, 4), { sp: [60, 200], jx: 40, jy: 10, grav: -150 });
      }
      k.shake(c.scene, 120, big ? 0.004 : 0.003);
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// DRAKEFIRE: ejder başı biçiminde alev

/**
 * Ejder başı (yerel: +x ileri, burun x=L; çene `jaw` 0-1 açık): alevden yapılmış, düz kâğıt kesik gibi değil. Dış hat boyunca titreşen koyu
 * kızıl alev kabarcıkları, kızıl gövde, ağız ve göz çevresinde turuncu-sarı iç ışık, alnından ve boynundan geriye savrulan alev yelesi.
 */
function drakeHead(g: G, f: (x: number, y: number) => Pt, L: number, jaw: number, t: number, a: number, pal: FirePal, back: number): void {
  const j = 0.12 + 0.25 * jaw;
  const outline: Array<[number, number]> = [
    [-L * 0.25, -L * 0.18],
    [-L * 0.05, -L * 0.34],
    [-L * 0.24, -L * 0.62],
    [L * 0.08, -L * 0.33],
    [L * 0.35, -L * 0.25],
    [L * 0.62, -L * 0.18],
    [L * 0.95, -L * 0.08 - L * j * 0.2],
    [L, -L * 0.02],
    [L * 0.62, L * 0.02 - L * j * 0.1],
    [L * 0.3, L * 0.06],
    [L * 0.68, L * 0.1 + L * j * 0.55],
    [L * 0.6, L * 0.2 + L * j * 0.5],
    [L * 0.15, L * 0.22],
    [-L * 0.25, L * 0.16],
  ];
  // dış hat boyunca örnek noktalar (kenarlar titreşir)
  const per: Pt[] = [];
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i]!;
    const [x1, y1] = outline[(i + 1) % outline.length]!;
    for (let s = 0; s < 3; s++) {
      const u = s / 3;
      const w = wob(t * 10 + i * 1.7 + s, i) * L * 0.03;
      per.push(f(lerp(x0, x1, u), lerp(y0, y1, u) + w));
    }
  }
  // yumuşak kenar: her katman titreşen kaydırmalarla birkaç kez düşük alfayla (düz kâğıt kesik değil, alev gibi solan kenar)
  const jit = (pts: Pt[], k2: number, sc: number) => {
    const cx = pts.reduce((m, p) => m + p.x, 0) / pts.length;
    const cy = pts.reduce((m, p) => m + p.y, 0) / pts.length;
    const ox = wob(t * 13 + k2 * 2.1, k2) * L * 0.035;
    const oy = wob(t * 11 + k2 * 1.7, k2 + 3) * L * 0.035;
    return pts.map((p) => ({ x: cx + (p.x - cx) * sc + ox, y: cy + (p.y - cy) * sc + oy }));
  };
  per.forEach((p, i) => g.fillStyle(pal.dark, a * 0.22).fillCircle(p.x, p.y, L * (0.08 + 0.03 * Math.sin(t * 17 + i * 2.3))));
  for (let i = 0; i < 3; i++) g.fillStyle(pal.dark, a * 0.16).fillPoints(jit(per, i, 1.08), true);
  for (let i = 0; i < 3; i++) g.fillStyle(pal.red, a * 0.32).fillPoints(jit(per, i + 3, 0.98), true);
  // iç ışık: ağız hattı ve alın boyunca turuncu, ağızda sarı (merkezden kaydırılmış, katmanlar eş merkezli değil)
  const inner = (pts: Array<[number, number]>) => pts.map(([x, y], i) => f(x, y + wob(t * 12 + i, 3) * L * 0.02));
  const orange = inner([[-L * 0.1, -L * 0.12], [L * 0.2, -L * 0.2], [L * 0.6, -L * 0.12], [L * 0.9, -L * 0.04], [L * 0.6, L * 0.08], [L * 0.25, L * 0.14], [-L * 0.1, L * 0.08]]);
  for (let i = 0; i < 3; i++) g.fillStyle(pal.orange, a * 0.3).fillPoints(jit(orange, i + 6, 1 - i * 0.08), true);
  const yellow = inner([[L * 0.3, -L * 0.04], [L * 0.62, -L * 0.04], [L * 0.85, 0], [L * 0.6, L * 0.06 + L * j * 0.3], [L * 0.35, L * 0.08]]);
  for (let i = 0; i < 2; i++) g.fillStyle(pal.yellow, a * 0.35).fillPoints(jit(yellow, i + 9, 1 - i * 0.15), true);
  // ağız içi: çene açıkken sıcak çekirdek
  const m = f(L * 0.62, L * 0.06 + L * j * 0.15);
  g.fillStyle(pal.core, a * 0.6 * jaw).fillEllipse(m.x, m.y, L * 0.2, L * 0.08 + L * j * 0.2);
  // göz: koyu yarık + küçük kor
  const e = f(L * 0.42, -L * 0.15);
  g.fillStyle(pal.dark, a).fillEllipse(e.x, e.y, L * 0.13, L * 0.05);
  g.fillStyle(pal.core, a * 0.9).fillCircle(e.x + L * 0.02, e.y, L * 0.02);
  // yele: alından ve boyundan geriye savrulan alev dilleri
  for (let i = 0; i < 6; i++) {
    const u = i / 5;
    const b = f(lerp(L * 0.3, -L * 0.25, u), lerp(-L * 0.26, -L * 0.12, u));
    flame(g, b.x, b.y + L * 0.06, L * (0.28 + 0.12 * Math.sin(i * 1.9)), L * 0.12, t, i * 4.7, a * 0.9, back * 1.6, pal);
  }
}

function drakefire(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(c, k, hitMs, '#ff8a2a', (v, F) => {
    const dir = dirTo(c, v);
    const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.15));
    const from = { x: k.spot(c.actor).x + dir * c.actor.w * 0.4, y: k.spot(c.actor).y - 16 };
    const streams = Array.from({ length: 3 }, (_, i) => ({ oy: (i - 1) * 16, s: k.rnd(0, 50) }));
    layer(c, F + k.slow(120), v.container.depth + 3, (g, tm) => {
      const q = clamp01(tm / F);
      const t = tm / 1000;
      const head = { x: lerp(from.x, to.x, eo(q, 1.3)), y: lerp(from.y, to.y, eo(q, 1.3)) - Math.sin(Math.PI * q) * 20 };
      const fade = tm > F ? 1 - (tm - F) / k.slow(120) : clamp01(q * 6);
      const L = lerp(60, 150, eo(q, 1.5));
      // boynuna akan alev akıntısı: atandan başa titreşen alev kabarcıkları (düz şerit değil)
      for (const st of streams) {
        for (let i = 0; i < 14; i++) {
          const u = i / 13;
          const p = { x: lerp(from.x, head.x - dir * L * 0.25, u), y: lerp(from.y, head.y, u) + st.oy * u + wob(t * 9 - u * 5, st.s) * 9 * u };
          const r = (6 + 14 * u) * (0.85 + 0.15 * Math.sin(t * 20 + i));
          g.fillStyle(FIRE.dark, 0.16 * fade).fillCircle(p.x, p.y, r * 1.5);
          g.fillStyle(u < 0.4 ? FIRE.red : FIRE.orange, 0.32 * fade).fillCircle(p.x, p.y, r);
          g.fillStyle(FIRE.orange, 0.22 * fade).fillCircle(p.x + wob(t * 9, i) * 4, p.y + wob(t * 8, i + 2) * 4, r * 0.75);
          if (u > 0.5) g.fillStyle(FIRE.yellow, 0.3 * fade).fillCircle(p.x, p.y, r * 0.45);
        }
      }
      const ang = Math.atan2(to.y - from.y, to.x - from.x);
      drakeHead(g, xf({ x: head.x - Math.cos(ang) * L * 0.5, y: head.y - Math.sin(ang) * L * 0.5 }, ang, dir), L, 0.4 + 0.6 * eo(q, 3), t, fade, FIRE, -dir);
    });
    after(c, F, () => {
      fireBurst(c, k, to, 90, v.container.depth + 3, { n: 14, dur: 420 });
      // gövdeye yapışan alev dilleri
      const body = k.spot(v);
      const list = tongues(k, 5, { x: body.x, y: body.y + v.h * 0.2 }, v.w * 0.35, 18, [40, 70], [18, 26]);
      const x0 = v.container.x;
      flameField(
        c,
        k,
        list,
        k.slow(620),
        v.container.depth + 2,
        'fire',
        (tm) => {
          const q = tm / k.slow(620);
          return { grow: q < 0.2 ? q / 0.2 : 1 - (q - 0.2) / 0.8, a: 1 };
        },
        { offset: () => ({ x: v.container.x - x0, y: 0 }) },
      );
      embers(c, k, to, 22, v.container.depth + 4, { sp: [120, 360], ang: [-Math.PI, 0.3], jx: 20, jy: 30 });
      smoke(c, k, puffs(k, to, 5, { hex: SMOKE, sx: 24, sy: 30, vy: [-130, -60], s0: [34, 50], s1: [90, 140], life: [800, 1100], a: 0.42, drag: 1.1, delay: [80, 200] }), v.container.depth + 2);
      if (hurt(c, v)) wounds(c, k, v, k.slow(1), [{ A: { x: to.x - dir * 10, y: to.y - 30 }, B: { x: to.x + dir * 34, y: to.y + 26 }, w: 9 }], { pal: BURN, drips: 0, sw: 50 });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// DRAGON'S BREATH (X): çapraz alev jetleri

function dragonsBreath(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#ff5a1a', (a) => {
    const C0 = areaCenter(c, k, a.cells);
    const JET = k.slow(220);
    scorch(c, k, a.stages.flatMap((st) => st.cells.map((p) => ({ p, rx: 56, at: st.at }))), 1400);
    for (const st of a.stages)
      for (const p of st.cells) {
        const dx = p.x - C0.x;
        const dy = p.y - C0.y;
        const L = Math.hypot(dx, dy);
        // köşe hücreler: dışarıdan merkeze doğru (kol yönünde) akan jet; merkez hücre: iki çapraz jetin buluştuğu yer
        const dirs = L > 8 ? [{ x: dx / L, y: dy / L }] : [{ x: 0.85, y: 0.53 }, { x: -0.85, y: 0.53 }];
        for (const d of dirs) {
          const from = { x: p.x + d.x * 170, y: p.y + d.y * 170 * (L > 8 ? 1 : 1) - 40 };
          const to = { x: p.x, y: p.y - 10 };
          const t0 = st.at - JET;
          layer(c, st.at + k.slow(80), cellDepth(p, 3), (g, tm) => {
            if (tm < t0) return;
            const q = clamp01((tm - t0) / JET);
            const fade = tm > st.at ? 1 - (tm - st.at) / k.slow(80) : 1;
            const head = { x: lerp(from.x, to.x, eo(q, 1.4)), y: lerp(from.y, to.y, eo(q, 1.4)) };
            const tailP = { x: lerp(from.x, to.x, Math.max(0, eo(q, 1.4) - 0.55)), y: lerp(from.y, to.y, Math.max(0, eo(q, 1.4) - 0.55)) };
            const pts = Array.from({ length: 8 }, (_, i) => ({ x: lerp(tailP.x, head.x, i / 7) + wob(tm / 60 + i, 2) * 4, y: lerp(tailP.y, head.y, i / 7) + wob(tm / 70 + i, 5) * 4 }));
            taper(g, pts, 2, 34, FIRE.dark, 0.5 * fade);
            taper(g, pts, 2, 26, FIRE.red, 0.85 * fade);
            taper(g, pts, 1, 16, FIRE.orange, 0.9 * fade);
            taper(g, pts, 1, 7, FIRE.yellow, 0.9 * fade);
          });
        }
        cellFire(c, k, p, st.at, { n: 6, rx: 42, h: [50, 95], hold: 380, fade: 460, pre: 40 });
        after(c, st.at, () => {
          fireBurst(c, k, { x: p.x, y: p.y - 20 }, 60, cellDepth(p, 4), { n: 9, dur: 320, flat: 0.6 });
          embers(c, k, p, 8, cellDepth(p, 5), { sp: [80, 240], jx: 30, jy: 8 });
          smokeColumn(c, k, { x: p.x, y: p.y - 40 }, cellDepth(p, 3), { n: 3, w: 26, vy: [-150, -90], s1: [100, 140], a: 0.38, delay: 140 });
        });
      }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// KINDLE THE FAITHFUL: sıcak hava kubbesi + kor sarmalı

function kindleOn(c: VfxCtx, k: VfxKit, v: CombatantView, at: number): void {
  const foot = k.feet(v);
  const R = Math.max(80, v.w * 0.75);
  const H = Math.max(150, v.h * 1.05);
  const t0 = Math.max(0, at - k.slow(300));
  const END = at + k.slow(900);
  sigilFx(c, k, foot, R * 1.05, { col: C('#e0802a'), pale: C('#ffd27a'), deep: C('#7a3a0c'), ticks: 10, inner: 'none', arcs: 3, peak: at, end: END });
  // kubbe: üst yarım elips (önü birimin önünde, ince); içinde titreşen sıcak hava
  layers(c, END, [{ depth: v.container.depth - 1, add: true }, { depth: v.container.depth + 2, add: true }], ([back, front], tm) => {
    if (tm < t0) return;
    const q = clamp01((tm - t0) / (at - t0));
    const post = clamp01((tm - at) / (END - at));
    const a = eo(q, 2) * (1 - post ** 1.5);
    const flare = tm >= at ? Math.exp(-(tm - at) / k.slow(180)) : 0;
    const hh = H * eo(q, 2.2);
    const arc = (from: number, to: number) =>
      Array.from({ length: 21 }, (_, i) => {
        const an = lerp(from, to, i / 20);
        return { x: foot.x + Math.cos(an) * R, y: foot.y - Math.sin(an) * hh + Math.cos(an) * 0 };
      });
    // arka yüz (soluk), ön yüz (ince kenar)
    back!.fillStyle(C('#c0601a'), 0.16 * a).fillPoints([...arc(0, Math.PI), { x: foot.x - R, y: foot.y }], true);
    back!.fillStyle(C('#ffb04a'), 0.08 * a * (1 + flare)).fillPoints([...arc(0.25, Math.PI - 0.25).map((p) => ({ x: foot.x + (p.x - foot.x) * 0.7, y: foot.y + (p.y - foot.y) * 0.75 }))], true);
    for (let i = 1; i <= 3; i++) back!.lineStyle(1.2, C('#e0802a'), 0.22 * a).strokePoints(Array.from({ length: 13 }, (_, j) => ({ x: foot.x + Math.cos((j / 12) * Math.PI) * R * (i / 3.5), y: foot.y - Math.sin((j / 12) * Math.PI) * hh * Math.sqrt(1 - (i / 3.5) ** 2 * 0.5) })), false);
    front!.lineStyle(5, C('#a84a10'), 0.35 * a).strokePoints(arc(0, Math.PI), false);
    front!.lineStyle(2, C('#ffc070'), (0.6 + 0.4 * flare) * a).strokePoints(arc(0, Math.PI), false);
    front!.lineStyle(1.5, C('#ffe2a0'), 0.5 * a * flare).strokePoints(arc(0.3, Math.PI - 0.3), false);
  });
  motes(c, k, { x: foot.x, y: foot.y - 10 }, { n: 16, r: R * 0.8, rise: H * 0.9, cols: ['#ffb04a', '#ff8a2a', '#ffd27a'], size: [1.6, 2.8], life: 900, depth: v.container.depth + 3, delay: 500, orbit: 0.8 });
  // Haste: ayak çevresinde kısa hız çizgileri
  layer(c, END, v.container.depth + 2, (g, tm) => {
    if (tm < at) return;
    const q = (tm - at) / (END - at);
    for (let i = 0; i < 4; i++) {
      const an = q * TAU * 1.5 + (i * TAU) / 4;
      const p0 = { x: foot.x + Math.cos(an) * R * 0.9, y: foot.y - 20 + Math.sin(an) * R * 0.3 };
      const p1 = { x: foot.x + Math.cos(an - 0.5) * R * 0.9, y: foot.y - 20 + Math.sin(an - 0.5) * R * 0.3 };
      g.lineStyle(2, C('#ffc070'), 0.5 * Math.sin(Math.PI * q)).lineBetween(p0.x, p0.y, p1.x, p1.y);
    }
  });
  after(c, at, () => embers(c, k, foot, 10, v.container.depth + 3, { jx: R * 0.7, jy: 10, sp: [60, 180], grav: -140 }));
}
const kindleTheFaithful: MobHandVfx = (c, k, hitMs) => aura(c, k, hitMs, '#ffb04a', (v, at) => kindleOn(c, k, v, at));

// ---------------------------------------------------------------------------------------------------------------------
// HOLD THE GATE: kızgın demir kapı

function gateOn(c: VfxCtx, k: VfxKit, v: CombatantView, at: number): void {
  const foot = k.feet(v);
  const W = Math.max(150, v.w * 1.3);
  const H = Math.max(260, v.h * 1.4);
  const RISE = Math.min(at, k.slow(360));
  const r0 = at - RISE;
  const HOLD = k.slow(520);
  const FADE = k.slow(400);
  const total = at + HOLD + FADE;
  const iron = C('#2a2220');
  const ironE = C('#c8501a');
  const hot = C('#ff9a3a');
  const dir = c.foes?.[0] ? dirTo(c, c.foes[0]) : v.combatant.side === 'enemy' ? -1 : 1;
  const gx = foot.x + dir * v.w * 0.42; // kapı birimin önünde (düşmana dönük yanda)
  layers(c, total, [{ depth: v.container.depth - 2 }, { depth: v.container.depth + 2 }], ([back, front], tm) => {
    if (tm < r0) return;
    const q = clamp01((tm - r0) / RISE);
    const a = tm < at + HOLD ? clamp01(q * 3) : 1 - clamp01((tm - at - HOLD) / FADE);
    const rise = eo(q, 2);
    const top = foot.y - H * rise;
    const x0 = gx - W / 2;
    const x1 = gx + W / 2;
    const glowA = 0.55 + 0.25 * Math.sin(tm / 60);
    // sütunlar + sivri kemer (arka katman)
    for (const x of [x0, x1]) {
      back!.fillStyle(iron, 0.9 * a).fillRect(x - 12, top + H * 0.25, 24, foot.y - top - H * 0.25);
      back!.lineStyle(2, ironE, glowA * a).lineBetween(x - 12, top + H * 0.25, x - 12, foot.y);
      back!.lineStyle(2, ironE, glowA * a).lineBetween(x + 12, top + H * 0.25, x + 12, foot.y);
    }
    const arch = Array.from({ length: 15 }, (_, i) => {
      const u = i / 14;
      const an = Math.PI * u;
      return { x: gx - Math.cos(an) * W / 2, y: top + H * 0.25 - Math.sin(an) ** 0.7 * H * 0.25 - (Math.abs(u - 0.5) < 0.07 ? 12 : 0) };
    });
    back!.lineStyle(22, iron, 0.9 * a).strokePoints(arch, false);
    back!.lineStyle(2.4, hot, glowA * a).strokePoints(arch.map((p) => ({ x: p.x, y: p.y + 10 })), false);
    // parmaklık (portcullis): vuruşa kadar yukarıda, vuruşta iner (ön katman)
    const drop = tm < at ? 0 : eo((tm - at) / k.slow(90), 3);
    const bounce = tm >= at ? 6 * Math.exp(-(tm - at) / k.slow(60)) * Math.sin((tm - at) / k.slow(12)) : 0;
    const pTop = top + H * 0.08 - (1 - drop) * H * 0.55 * rise;
    const pBot = Math.min(foot.y, pTop + H * 0.92) + bounce;
    const bars = 6;
    for (let i = 0; i <= bars; i++) {
      const x = x0 + 12 + ((W - 24) * i) / bars;
      front!.lineStyle(7, iron, 0.92 * a).lineBetween(x, pTop, x, pBot - 16);
      front!.fillStyle(iron, 0.92 * a).fillTriangle(x - 5, pBot - 18, x + 5, pBot - 18, x, pBot);
      front!.lineStyle(1.6, hot, 0.55 * a).lineBetween(x - 2.5, pTop, x - 2.5, pBot - 18);
    }
    for (let j = 1; j <= 3; j++) {
      const y = lerp(pTop, pBot - 20, j / 4);
      front!.lineStyle(6, iron, 0.92 * a).lineBetween(x0 + 10, y, x1 - 10, y);
      front!.lineStyle(1.4, ironE, 0.5 * a).lineBetween(x0 + 10, y - 2, x1 - 10, y - 2);
    }
  });
  layer(c, total, k.FLOOR_FX + 3, (g, tm) => {
    if (tm < r0) return;
    const a = tm < at + HOLD ? clamp01((tm - r0) / RISE) : 1 - clamp01((tm - at - HOLD) / FADE);
    const pulse = tm >= at ? Math.exp(-(tm - at) / k.slow(180)) : 0;
    g.fillStyle(C('#e0601a'), (0.1 + 0.2 * pulse) * a).fillEllipse(gx, foot.y, W * 1.3, W * 0.4);
    g.lineStyle(2, C('#ff9a3a'), (0.4 + 0.4 * pulse) * a).strokeEllipse(gx, foot.y, W * 1.2 * (1 + 0.2 * pulse), W * 0.38 * (1 + 0.2 * pulse));
  });
  after(c, r0, () => dust(c, k, { x: gx, y: foot.y }, v.container.depth + 1, { n: 4, w: W * 0.6, a: 0.24, rise: 30 }));
  after(c, at, () => {
    sparks(c, k, { x: gx, y: foot.y - 4 }, 12, v.container.depth + 3, [-Math.PI + 0.3, -0.3]);
    embers(c, k, { x: gx, y: foot.y - 10 }, 16, v.container.depth + 3, { jx: W * 0.45, jy: 6, sp: [80, 260] });
    dust(c, k, { x: gx, y: foot.y }, v.container.depth + 1, { n: 6, w: W * 0.8, a: 0.34 });
    rubble(c, k, { x: gx, y: foot.y - 2 }, 6, v.container.depth + 1, { cols: STONE, sp: [100, 260], size: [3, 7] });
  });
}
const holdTheGate: MobHandVfx = (c, k, hitMs) => aura(c, k, hitMs, '#ff7a1a', (v, at) => gateOn(c, k, v, at), true);

// ---------------------------------------------------------------------------------------------------------------------
// CINDER LASH: kızgın zincir kırbaç

function cinderLash(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(
    c,
    k,
    hitMs,
    '#ff6a2a',
    (v, F) => {
      const dir = dirTo(c, v);
      const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.1));
      const hand = { x: k.spot(c.actor).x + dir * c.actor.w * 0.35, y: k.spot(c.actor).y - 10 };
      const BACK = k.slow(260);
      const D = Math.hypot(to.x - hand.x, to.y - hand.y);
      layer(c, F + BACK, Math.max(v.container.depth, c.actor.container.depth) + 3, (g, tm) => {
        const t = tm / 1000;
        // zincirin ucu: önce yukarı geriye kalkar, sonra yay çizerek hedefe şaklar; vuruştan sonra geri sarılır
        let tip: Pt;
        let sag: number;
        if (tm < F) {
          const q = tm / F;
          const e = q < 0.35 ? 0 : eo((q - 0.35) / 0.65, 1.6);
          const up = { x: hand.x - dir * 60, y: hand.y - 180 };
          tip = q < 0.35 ? { x: lerp(hand.x, up.x, eo(q / 0.35)), y: lerp(hand.y, up.y, eo(q / 0.35)) } : { x: lerp(up.x, to.x, e), y: lerp(up.y, to.y, e) - Math.sin(Math.PI * e) * 120 };
          sag = -60 * Math.sin(Math.PI * q);
        } else {
          const q = (tm - F) / BACK;
          tip = { x: lerp(to.x, hand.x, eo(q, 2)), y: lerp(to.y, hand.y, eo(q, 2)) + Math.sin(Math.PI * q) * 40 };
          sag = 40 * Math.sin(Math.PI * q);
        }
        const fade = tm > F ? 1 - clamp01((tm - F - BACK * 0.6) / (BACK * 0.4)) : 1;
        const pts = sagLine(hand, tip, sag, 16);
        // kızgın zincir: koyu demir halkalar, kor kenar, zincir boyunca küçük alev dilleri
        chain(g, pts, 13, 7, C('#5a1e0c'), C('#1c0c06'), C('#ff9a3a'), fade);
        g.lineStyle(3, C('#e0601a'), 0.35 * fade).strokePoints(pts, false);
        for (let i = 3; i < pts.length; i += 3) flame(g, pts[i]!.x, pts[i]!.y + 4, 22 + 8 * Math.sin(i), 12, t, i * 3.3, 0.8 * fade, 0, PYRE);
        if (tm < F) g.fillStyle(C('#ffb050'), 0.8 * fade).fillCircle(tip.x, tip.y, 5);
        void D;
      });
      after(c, F, () => {
        fireBurst(c, k, to, 50, v.container.depth + 3, { n: 8, dur: 300, pal: PYRE });
        sparks(c, k, to, 8, v.container.depth + 4);
        embers(c, k, to, 16, v.container.depth + 4, { sp: [120, 320], ang: [-Math.PI, 0.2], jx: 12, jy: 20 });
        if (hurt(c, v)) wounds(c, k, v, k.slow(1), [{ A: { x: to.x - dir * 10, y: to.y - 40 }, B: { x: to.x + dir * 30, y: to.y + 30 }, w: 8, bow: dir * 10 }], { pal: BURN, drips: 0, sw: 50 });
      });
    },
    { anim: 'attack' },
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// ASHFALL: düşen yanan kül kayaları

function ashfall(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#8a6a5a', (a) => {
    scorch(c, k, a.stages.flatMap((st) => st.cells.map((p) => ({ p, rx: 50, at: st.at }))), 1300);
    for (const st of a.stages)
      for (const p of st.cells) {
        for (let i = 0; i < 3; i++) {
          const land = { x: p.x + k.rnd(-36, 36), y: p.y + k.rnd(-10, 10) };
          const at = st.at - (i === 0 ? 0 : k.slow(k.rnd(30, 110)));
          const F = Math.min(at, k.slow(320));
          const from = { x: land.x + k.rnd(120, 200), y: land.y - k.rnd(520, 600) };
          const s = i === 0 ? 14 : k.rnd(7, 10);
          after(c, at - F, () =>
            fly(c, k, {
              from,
              to: land,
              F,
              ease: 1.4,
              hist: 10,
              depth: cellDepth(land, 3),
              draw: (g, pp, an, _q, tm, hist) => {
                // duman izi + yanan kaya
                for (let j = hist.length - 1; j >= 1; j--) g.fillStyle(C('#4a423c'), (1 - j / hist.length) * 0.35).fillCircle(hist[j]!.x, hist[j]!.y, s * (1.2 - j / hist.length * 0.5));
                flame(g, pp.x, pp.y, s * 3.2, s * 1.6, tm / 1000, s, 0.9, -Math.cos(an) * 0.6, FIRE);
                coal(g, pp, s, an, tm / 1000);
              },
            }),
          );
          after(c, at, () => {
            fireBurst(c, k, { x: land.x, y: land.y - 8 }, i === 0 ? 44 : 26, cellDepth(land, 4), { n: 7, dur: 280, flat: 0.55 });
            rubble(c, k, land, i === 0 ? 5 : 2, cellDepth(land, 4), { cols: ['#2a221c', '#3a302a', '#1a120c'], sp: [100, 260], size: [3, 7], rim: '#c8501a' });
          });
        }
        after(c, st.at, () => {
          smokeColumn(c, k, { x: p.x, y: p.y - 30 }, cellDepth(p, 3), { n: 5, w: 30, vy: [-160, -90], s1: [110, 160], a: 0.48, hex: ASH });
          embers(c, k, p, 8, cellDepth(p, 5), { sp: [60, 200], jx: 34, jy: 8 });
          for (const v of st.victims) if (hurt(c, v)) gore(c, k, k.spot(v), UP, 4, v.container.depth + 3, { sp: [60, 160] });
        });
      }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// IRON DECREE: demir dikenli taç halkası

function ironDecree(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return aura(
    c,
    k,
    hitMs,
    '#c0392b',
    (v, at) => {
      const foot = k.feet(v);
      const R = Math.max(110, v.w * 0.85);
      const n = 10;
      const spikes = Array.from({ length: n }, (_, i) => ({ an: (i / n) * TAU + 0.15, h: k.rnd(110, 150) * (i % 2 ? 0.78 : 1), lag: k.rnd(0, 0.25), s: k.rnd(0, 99) }));
      const t0 = Math.max(0, at - k.slow(320));
      const END = at + k.slow(900);
      const iron = C('#262022');
      const hot = C('#e0601a');
      layers(c, END, [{ depth: v.container.depth - 1 }, { depth: v.container.depth + 2 }], ([back, front], tm) => {
        if (tm < t0) return;
        const q = clamp01((tm - t0) / (at - t0));
        const post = clamp01((tm - at) / (END - at));
        const a = 1 - post ** 1.6;
        const flare = tm >= at ? Math.exp(-(tm - at) / k.slow(200)) : 0;
        for (const sp of [...spikes].sort((p1, p2) => Math.sin(p1.an) - Math.sin(p2.an))) {
          const g = Math.sin(sp.an) < 0 ? back! : front!;
          const u = eo(clamp01((q - sp.lag) / (1 - sp.lag)), 2.4);
          if (u <= 0) continue;
          const b = { x: foot.x + Math.cos(sp.an) * R, y: foot.y + Math.sin(sp.an) * R * FLAT };
          const h = sp.h * u;
          const w = 19;
          g.fillStyle(iron, 0.95 * a).fillTriangle(b.x - w, b.y, b.x + w, b.y, b.x + 2, b.y - h);
          g.lineStyle(2, hot, (0.5 + 0.4 * flare) * a).lineBetween(b.x - w * 0.6, b.y - 2, b.x + 1, b.y - h * 0.95);
          g.fillStyle(C('#4a3a36'), 0.6 * a).fillTriangle(b.x + 2, b.y, b.x + w, b.y, b.x + 2, b.y - h);
          if (u > 0.6) flame(g, b.x + 2, b.y - h + 6, 26 + 20 * flare, 13, tm / 1000, sp.s, a * (0.7 + 0.3 * flare), 0, PYRE);
        }
        // taç tabanı: demir halka
        back!.lineStyle(8, iron, 0.9 * a * q).strokePoints(Array.from({ length: 21 }, (_, i) => ({ x: foot.x + Math.cos(Math.PI + (i / 20) * Math.PI) * R, y: foot.y + Math.sin(Math.PI + (i / 20) * Math.PI) * R * FLAT })), false);
        front!.lineStyle(8, iron, 0.9 * a * q).strokePoints(Array.from({ length: 21 }, (_, i) => ({ x: foot.x + Math.cos((i / 20) * Math.PI) * R, y: foot.y + Math.sin((i / 20) * Math.PI) * R * FLAT })), false);
        front!.lineStyle(2, hot, 0.5 * a * q).strokePoints(Array.from({ length: 21 }, (_, i) => ({ x: foot.x + Math.cos((i / 20) * Math.PI) * R, y: foot.y - 3 + Math.sin((i / 20) * Math.PI) * R * FLAT })), false);
      });
      // buyruk halkası: dışa yayılan kızıl-turuncu halka (tüm dostlara Haste)
      after(c, at, () => {
        ringFx(c, k, foot, { r0: R, r1: R * 3.2, dur: 620, col: '#a8300c', pale: '#ff9a3a', w: 7, flat: FLAT, depth: k.FLOOR_FX + 4 });
        ringFx(c, k, foot, { r0: R, r1: R * 2.4, dur: 520, col: '#7a1e08', pale: '#e0601a', w: 4, flat: FLAT, depth: k.FLOOR_FX + 4, delay: 90 });
        embers(c, k, foot, 18, v.container.depth + 3, { jx: R, jy: 14, sp: [80, 240] });
        dust(c, k, foot, v.container.depth + 1, { n: 5, w: R * 1.2, a: 0.28, hex: ['#4a3a32', '#5a4a40'] });
        k.shake(c.scene, 110, 0.003);
      });
    },
    true,
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// PYRE OF MORVANE: her hücrede odun ateşi

function pyreOfMorvane(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#ff4d1a', (a) => {
    // tüm tahta: güvenli hücre yok (olayda hücre listesi yoksa tahtanın her hücresi). Çok hücre: zemin (kütük + yanık) ve kor TEK
    // Graphics'te, alevler kodla üretilmiş alev dokusundan (her dil tek Image) -> aynı anda 12 hücre kasmaz.
    const stages = c.cells.length ? a.stages : [{ cells: boardCells(c, k), victims: c.targets, at: a.at }];
    const pre = k.slow(120);
    const HOLD = k.slow(520);
    const FADE = k.slow(520);
    const piles = stages.flatMap((st) =>
      st.cells.map((p) => ({ p, at: st.at + k.slow(k.rnd(-40, 0)), logs: Array.from({ length: 4 }, (_, i) => ({ an: (i / 4) * Math.PI + k.rnd(-0.2, 0.2), L: k.rnd(70, 90) })), s: k.rnd(0, 99) })),
    );
    const end = Math.max(...piles.map((pl) => pl.at)) + HOLD + FADE;
    const cLog = C('#1a100a');
    const cHot = C('#d0501a');
    layer(c, end, k.FLOOR_FX + 4, (g, tm) => {
      for (const pl of piles) {
        if (tm < pl.at - pre) continue;
        const al = (tm < pl.at ? clamp01((tm - pl.at + pre) / pre) : 1) * (tm < pl.at + HOLD ? 1 : 1 - clamp01((tm - pl.at - HOLD) / FADE));
        if (al <= 0.01) continue;
        // çatılmış kütükler (kömürleşmiş, kenarı kor)
        for (const l of pl.logs) {
          const dx = Math.cos(l.an) * l.L * 0.5;
          const dy = Math.sin(l.an) * l.L * 0.5 * FLAT;
          g.lineStyle(11, cLog, al).lineBetween(pl.p.x - dx, pl.p.y - dy - 4, pl.p.x + dx, pl.p.y + dy - 10);
          g.lineStyle(2, cHot, 0.7 * al).lineBetween(pl.p.x - dx, pl.p.y - dy - 8, pl.p.x + dx, pl.p.y + dy - 14);
        }
      }
    });
    scorch(c, k, piles.map((pl) => ({ p: pl.p, rx: 60, at: pl.at })), 1500);
    for (const pl of piles) {
      const p = pl.p;
      // odun ateşi: alçak diller + taç biçimli üç uzun çekirdek dil
      const list = tongues(k, 4, p, 34, 12, [90, 160], [28, 40]);
      const crown = [-1, 0, 1].map((i) => ({ x: p.x + i * 15, y: p.y - 4 + Math.abs(i), h: 110 + (i === 0 ? 60 : 0), w: 26, seed: pl.s + i * 7, at: 0 }));
      const at = pl.at;
      flameField(c, k, [...list, ...crown].sort((q1, q2) => q1.y - q2.y), at + HOLD + FADE, cellDepth(p, 3), 'pyre', (tm) => {
        if (tm < at - pre) return { grow: 0, a: 0 };
        const grow = tm < at ? eo((tm - at + pre) / pre, 2) * 0.8 : tm < at + HOLD ? 0.8 + 0.2 * Math.exp(-(tm - at) / k.slow(150)) : 0.8 * (1 - (tm - at - HOLD) / FADE);
        return { grow: Math.max(0, grow), a: tm < at + HOLD ? 1 : 1 - clamp01((tm - at - HOLD) / FADE) };
      });
      after(c, at, () => smokeColumn(c, k, { x: p.x, y: p.y - 80 }, cellDepth(p, 3), { n: 3, w: 30, vy: [-200, -130], s1: [120, 170], a: 0.5, delay: 120 }));
    }
    // kor: tüm hücreler tek parçacık kümesinde (her hücre kendi anında)
    const f1 = k.slow(1000) / 1000;
    after(c, a.at - k.slow(40), () =>
      spray(
        c,
        k,
        piles.flatMap((pl) => {
          const d0 = Math.max(0, (pl.at - a.at) / f1) + 40;
          return bits(k, 6, { x: pl.p.x, y: pl.p.y - 40 }, { kind: 'ember', ang: [-Math.PI + 0.4, -0.4], sp: [80, 240], size: [1.6, 3], life: [420, 760], cols: EMBERS, jx: 30, jy: 10, drag: 1.4, delay: [d0, d0 + 80] });
        }),
        Math.max(...piles.map((pl) => pl.p.y)) + 20,
        -180,
        true,
      ),
    );
    after(c, a.at, () => k.shake(c.scene, 160, 0.0045));
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// HOLY EMBER

function holyEmber(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(c, k, hitMs, '#ffcf5a', (v, F) => {
    const dir = dirTo(c, v);
    const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.15));
    const from = { x: k.spot(c.actor).x + dir * c.actor.w * 0.35, y: k.spot(c.actor).y - 24 };
    const trail: Array<Pt & { t: number }> = [];
    fly(c, k, {
      from,
      to,
      F,
      arc: 60,
      wave: 14,
      waveF: 3,
      hist: 14,
      depth: v.container.depth + 3,
      draw: (g, p, _an, _q, tm, hist) => {
        // tütsü dumanı şeridi (krem, ince, dalgalı) + altın kor
        trail.push({ ...p, t: tm });
        const pts = hist.map((h, i) => ({ x: h.x, y: h.y - i * 1.5 }));
        taper(g, [...pts].reverse(), 0, 12, C('#d8ccb0'), 0.3);
        taper(g, [...pts.slice(0, 8)].reverse(), 0, 6, C('#f0e6cc'), 0.4);
        fireball(g, p, 9, tm / 1000, hist.slice(0, 4), HOLYFIRE);
      },
    });
    after(c, F, () => {
      fireBurst(c, k, to, 46, v.container.depth + 3, { n: 9, dur: 300, pal: HOLYFIRE });
      // kısa güneş çarkı işareti (dikey, gövdede)
      layer(
        c,
        k.slow(420),
        v.container.depth + 4,
        (g, tm) => {
          const q = tm / k.slow(420);
          const a = (1 - q) ** 1.4;
          const r = 30 + 26 * eo(q, 2);
          g.lineStyle(3, C('#e8b040'), 0.8 * a).strokeCircle(to.x, to.y, r);
          g.lineStyle(1.5, C('#fff0c0'), a).strokeCircle(to.x, to.y, r * 0.62);
          rays(g, to, 8, r * 1.5, 5, C('#e8b040'), C('#fff4cc'), a * 0.8, q * 0.6);
        },
        true,
      );
      spray(c, k, bits(k, 14, to, { kind: 'streak', ang: [-Math.PI, Math.PI], sp: [160, 380], size: [1.6, 2.6], life: [220, 420], cols: ['#ffd27a', '#ffe8b0', '#e8b040'], drag: 2, a: 0.9 }), v.container.depth + 4, 300, true);
      smoke(c, k, puffs(k, to, 5, { hex: ['#cfc4a8', '#d8ccb0', '#bcb096'], sx: 20, sy: 20, vy: [-60, -20], s0: [30, 44], s1: [80, 120], life: [800, 1100], a: 0.3, drag: 1.2 }), v.container.depth + 2);
      if (hurt(c, v)) embers(c, k, to, 8, v.container.depth + 4, { cols: ['#ffd27a', '#ffb04a'], jx: 10, jy: 10 });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// CONSECRATE (2x2)

function consecrate(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#ffcf5a', (a) => {
    const C0 = areaCenter(c, k, a.cells);
    const far = Math.max(...a.cells.map((p) => Math.hypot(p.x - C0.x, (p.y - C0.y) / FLAT)));
    const R = Math.max(130, far * 1.0);
    const END = a.at + k.slow(1200);
    sigilFx(c, k, C0, R, { col: C('#e0a83a'), pale: C('#fff0c0'), deep: C('#8a5a10'), ticks: 12, inner: 'cross', arcs: 4, peak: a.at, end: END, spin: 0.5, plate: { hex: '#e8b040', a: 0.08 } });
    // çember boyunca kutsal alev (vuruşa doğru yükselir, vuruşta kabarır)
    const ring = Array.from({ length: 14 }, (_, i) => {
      const an = (i / 14) * TAU;
      return { x: C0.x + Math.cos(an) * R * 0.98, y: C0.y + Math.sin(an) * R * 0.98 * FLAT, h: k.rnd(30, 50), w: k.rnd(16, 22), seed: k.rnd(0, 99) };
    }).sort((p, q) => p.y - q.y);
    const t0 = a.wu * 0.3;
    const frontD = Math.max(...a.cells.map((p) => p.y)) + 20;
    flameField(c, k, ring.map((f) => ({ ...f, at: 0, h: f.h * 1.9 })), END, (f) => (f.y < C0.y ? k.FLOOR_FX + 5 : frontD), 'holy', (tm) => {
      if (tm < t0) return { grow: 0, a: 0 };
      const pre = eo((tm - t0) / (a.at - t0), 2);
      const surge = tm >= a.at ? 1 + 0.9 * Math.exp(-(tm - a.at) / k.slow(260)) : 1;
      const post = clamp01((tm - a.at - k.slow(500)) / k.slow(700));
      return { grow: Math.min(1, pre * 0.55 * surge * (1 - post * 0.6)), a: 1 - post };
    });
    // ortadan yükselen tütsü (krem, dalgalı)
    fumes(c, k, C0, { n: 3, spread: 16, h: 260, cols: ['#d8ccb0', '#cfc4a8', '#e8dcc0'], life: 1500, a: 0.35, depth: Math.max(...a.cells.map((p) => p.y)) + 18, w: 14, delay: 100, sway: 22 });
    for (const p of a.cells) cellFire(c, k, p, a.at, { n: 5, rx: 40, h: [40, 80], w: [18, 26], hold: 360, fade: 460, pre: 60, pal: 'holy' });
    after(c, a.at, () => {
      columnFx(c, k, C0, { h: 300, w: 40, col: '#e8b040', core: '#fff4cc', at: 0, dur: 380, depth: Math.max(...a.cells.map((p) => p.y)) + 19, a: 0.7 });
      for (const p of a.cells) spray(c, k, bits(k, 6, p, { kind: 'ember', ang: [-Math.PI + 0.4, -0.4], sp: [60, 180], size: [1.6, 2.6], life: [500, 800], cols: ['#ffd27a', '#ffe8b0'], jx: 30, jy: 8, drag: 1.4 }), cellDepth(p, 4), -100, true);
    });
  });
}

export const FIRE_SKILLS: Readonly<Record<string, MobHandVfx>> = {
  shovel_of_embers: shovelOfEmbers,
  kiln_smoke: kilnSmoke,
  ember_toss: emberToss,
  burn_the_ground: (c, k, h) => burnGround(c, k, h, false),
  burn_the_field: (c, k, h) => burnGround(c, k, h, true),
  drakefire,
  dragons_breath: dragonsBreath,
  kindle_the_faithful: kindleTheFaithful,
  hold_the_gate: holdTheGate,
  cinder_lash: cinderLash,
  ashfall,
  iron_decree: ironDecree,
  pyre_of_morvane: pyreOfMorvane,
  holy_ember: holyEmber,
  consecrate,
};

export { fireball, fireBurst, scorch, smokeColumn, cellFire, coal };
