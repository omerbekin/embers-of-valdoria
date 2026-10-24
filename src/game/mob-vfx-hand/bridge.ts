/**
 * KING'S BRIDGE BOSS (Bridge Warden): demir, zincir, köprü taşı, nehir suyu ve kor.
 *   Anchor Smash: zincirli dev demir çapa tepeden savrulup hedefin önüne çakılır; kollar toprağa gömülür, kor ışıklı çatlaklar, moloz,
 *     toz halkası, kıvılcım, ağır sarsıntı; çapa geri çekilirken zincir gerilir.
 *   Breaking Span (sıra / faz 2: 2x3): her hücrede köprü tahtaları kırılıp havaya savrulur, aralarından camgöbeği nehir suyu fışkırır;
 *     ardında dönen su birikintisi.
 *   Chain Hook: kızgın halkalı zincir ucundaki kancayla hedefe fırlar, yakalar (kıvılcım, kan), sonra gerilip geri sarılır (çekiş).
 *   Ash Brand: hedefin göğsüne ateş halkası kazınır, içinde haç belirir; vuruşta haç biçimli alev parlaması, yanık haç izi, kül pulları.
 *   Fall of King's Bridge (tüm tahta, faz 3): merkezden tüm hücrelere kor ışıklı çatlaklar yayılır, köprü taşları kalkıp düşer, her
 *     hücrede çatlaktan alev patlar; ağır toz, moloz, uzun sarsıntı.
 */
import type { MobHandVfx } from '../mob-vfx';
import { C, FLAT, TAU, UP, after, bits, clamp01, ei, eo, layer, layers, lerp, puffs, smoke, spray, type CombatantView, type Pt, type VfxCtx, type VfxKit } from './core';
import { PYRE, chain, column, crackPath, drawCrack, sagLine, taper, xf } from './draw';
import { area, areaCenter, bolt, boardCells, melee } from './flow';
import { rays, ringFx } from './magic';
import { BURN, IRON, SPLINTER, STONE, anchor, bodyAt, dust, embers, gore, rubble, shockRing, sparks, wounds } from './phys';
import { cellFire, fireBurst, scorch, smokeColumn } from './fire';
import { condense, floorGlow, top } from './grand';

const hurt = (c: VfxCtx, v: CombatantView): boolean => !c.usage || c.usage.damages.some((d) => d.target === v.combatant.uid && d.amount > 0);
const dirTo = (c: VfxCtx, v: CombatantView | Pt): number => (('container' in v ? v.container.x : v.x) >= c.actor.container.x ? 1 : -1);
const HOTCHAIN = { body: C('#4a2410'), dark: C('#140804'), hi: C('#ff9a3a') };

// ---------------------------------------------------------------------------------------------------------------------
// ANCHOR SMASH

function anchorOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = dirTo(c, v);
  const foot = k.feet(v);
  const G0 = { x: foot.x - dir * v.w * 0.42, y: foot.y + 2 };
  const hand = { x: c.actor.container.x + dir * c.actor.w * 0.3, y: c.actor.container.y - c.actor.h * 0.7 };
  const R = 150;
  const SW = Math.min(T, k.slow(230));
  const t0 = T - SW;
  const HOLD = k.slow(260);
  const PULL = k.slow(260);
  const cracks = Array.from({ length: 7 }, (_, i) => crackPath(k, G0, { x: G0.x + Math.cos((i / 7) * TAU + 0.3) * k.rnd(90, 170), y: G0.y + Math.sin((i / 7) * TAU + 0.3) * k.rnd(90, 170) * FLAT }, 12, 0.4));
  layers(c, T + HOLD + PULL + k.slow(600), [{ depth: k.FLOOR_FX + 3 }, { depth: Math.max(v.container.depth, c.actor.container.depth) + 3 }], ([floor, g], tm) => {
    if (tm < t0) return;
    let crown: Pt; // çapanın taç noktası (kolların birleştiği alt uç)
    let ang: number; // sapın yönü (taçtan halkaya)
    let a = 1;
    if (tm < T) {
      const q = ei((tm - t0) / SW, 2);
      // yay: atanın arkasından tepeden hedefin önüne
      const an = lerp(-2.4, -0.2, q);
      const L = Math.hypot(G0.x - hand.x, G0.y - hand.y);
      const base = Math.atan2(G0.y - hand.y, G0.x - hand.x);
      const A = dir > 0 ? base + (an + 0.2) : base - (an + 0.2);
      crown = { x: hand.x + Math.cos(A) * L, y: hand.y + Math.sin(A) * L - 8 };
      ang = Math.atan2(hand.y - crown.y, hand.x - crown.x);
      a = clamp01((tm - t0) / k.slow(50));
    } else {
      const t = tm - T;
      const qp = clamp01((t - HOLD) / PULL);
      crown = { x: G0.x - dir * 30 * eo(qp), y: G0.y - 6 + 14 * Math.exp(-t / k.slow(40)) * 0 - 70 * eo(qp) };
      ang = Math.atan2(hand.y - crown.y, hand.x - crown.x);
      a = 1 - qp;
    }
    if (a > 0.01) {
      const ring = { x: crown.x + Math.cos(ang) * R, y: crown.y + Math.sin(ang) * R };
      chain(g!, sagLine(hand, ring, tm < T ? -20 : 30, 14), 14, 7, HOTCHAIN.body, HOTCHAIN.dark, HOTCHAIN.hi, a);
      // çapa: yerel +x taçtan halkaya ters (anchor() başı +x'te çizer: taç R'de) -> pivotu halkaya koy, açıyı ters çevir
      anchor(g!, xf(ring, ang + Math.PI), R, a, tm / 100);
    }
    if (tm < T) return;
    const t = tm - T;
    const gf = 1 - clamp01((t - k.slow(700)) / k.slow(500));
    const grow = eo(t / k.slow(140), 2);
    floor!.fillStyle(C('#120a06'), 0.6 * gf).fillEllipse(G0.x, G0.y, 170 * grow, 50 * grow);
    for (const cr of cracks) drawCrack(floor!, cr, grow, gf, 4.5, C('#100804'), C('#6a4a3a'), C('#f07a24'), gf * (0.6 + 0.3 * Math.sin(t / 50)) * Math.exp(-t / k.slow(700)));
  });
  after(c, T, () => {
    const depth = v.container.depth + 4;
    shockRing(c, k, G0, 230, k.FLOOR_FX + 4, { flat: FLAT, col: '#c8a888', a: 0.5, dur: 420, w: 8 });
    rubble(c, k, G0, 14, depth, { cols: STONE, rim: '#c8501a', sp: [240, 560], size: [6, 14] });
    sparks(c, k, { x: G0.x, y: G0.y - 10 }, 12, depth, [-Math.PI + 0.2, -0.2]);
    embers(c, k, G0, 14, depth, { jx: 50, jy: 8, sp: [80, 260] });
    dust(c, k, G0, v.container.depth + 1, { n: 8, w: 130, a: 0.42, hex: ['#5a4a40', '#6a5a4e', '#4a3e34'] });
    if (hurt(c, v)) gore(c, k, bodyAt(k, v, dir, -0.2, 0), UP - dir * 0.3, 12, depth, { sp: [120, 320] });
  });
}
const anchorSmash: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => anchorOn(c, k, v, T), { shake: [170, 0.0055] });

// ---------------------------------------------------------------------------------------------------------------------
// BREAKING SPAN

const RIVER = ['#3ab8c0', '#6ad0d8', '#a8eef0', '#2a8a98'];
function breakingSpan(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#6ad0d8', (a) => {
    for (const st of a.stages)
      for (const p of st.cells) {
        const d = top(k, 3);
        // hazırlık: hücrede köprü tahtası çizgileri belirir ve çatlar
        const t0 = Math.max(0, st.at - k.slow(260));
        layer(c, st.at + k.slow(1200), k.FLOOR_FX + 3, (g, tm) => {
          if (tm < t0) return;
          const pre = eo((tm - t0) / (st.at - t0), 2);
          const post = clamp01((tm - st.at) / k.slow(1200));
          const al = 1 - post ** 1.2;
          // tahtalar (vuruşa kadar), vuruştan sonra dönen su birikintisi
          if (tm < st.at) {
            for (let i = -2; i <= 2; i++) {
              g.fillStyle(C('#5a3e26'), 0.5 * pre).fillRect(p.x - 60, p.y + i * 9 - 4, 120, 7);
              g.lineStyle(1.4, C('#2a1a0c'), 0.7 * pre).strokeRect(p.x - 60, p.y + i * 9 - 4, 120, 7);
            }
          } else {
            const R = 70 * eo(post / 0.2, 2);
            g.fillStyle(C('#0e3a44'), 0.55 * al).fillEllipse(p.x, p.y, R * 2, R * 0.66);
            // köpük halkası: hücrede genişleyip sönen ince, açık halka (görkem, Ömer 2026-10-20)
            const fu = clamp01(post / 0.35);
            if (fu < 1) g.lineStyle(3 * (1 - fu) + 1, C('#c8f4f6'), 0.7 * (1 - fu)).strokeEllipse(p.x, p.y, 70 + 150 * eo(fu, 2), (70 + 150 * eo(fu, 2)) * FLAT);
            for (let arm = 0; arm < 3; arm++) {
              const pts = Array.from({ length: 12 }, (_, i) => {
                const s = i / 11;
                const an = tm / k.slow(200) + (arm * TAU) / 3 + s * 3;
                return { x: p.x + Math.cos(an) * R * (1 - s * 0.8), y: p.y + Math.sin(an) * R * (1 - s * 0.8) * 0.33 };
              });
              taper(g, pts, 1, 5, C('#6ad0d8'), 0.6 * al);
            }
          }
        });
        after(c, st.at, () => {
          // tahta kırıkları savrulur (dönerek), su fışkırır (iri damlalar + çizgiler + köpük)
          spray(c, k, bits(k, 9, p, { kind: 'shard', ang: [UP - 1.1, UP + 1.1], sp: [240, 520], size: [16, 26], life: [650, 950], cols: SPLINTER, jx: 44, jy: 6, floor: p.y + 6, vr: 10 }), d + 1, 1500);
          spray(
            c,
            k,
            [
              ...bits(k, 34, p, { kind: 'drop', ang: [UP - 0.55, UP + 0.55], sp: [320, 680], size: [4, 7], life: [520, 840], cols: RIVER, jx: 34, jy: 4, floor: p.y + 6 }),
              ...bits(k, 14, p, { kind: 'streak', ang: [UP - 0.3, UP + 0.3], sp: [500, 820], size: [2, 3.4], life: [260, 440], cols: ['#a8eef0', '#e0fbff'], jx: 20 }),
            ],
            d,
            1500,
          );
          smoke(c, k, puffs(k, { x: p.x, y: p.y - 40 }, 6, { hex: ['#a8d8dc', '#c8e8ea', '#88c0c8'], sx: 30, sy: 30, vy: [-220, -120], s0: [46, 66], s1: [110, 160], life: [650, 950], a: 0.42, drag: 1.6 }), d - 1);
          for (const v of st.victims) if (hurt(c, v)) gore(c, k, k.spot(v), UP, 6, top(k, 4), { sp: [80, 220] });
        });
      }
    // görkem: her aşamada hücrelerden yükselen ince su sütunu (tek Graphics), zemin ışıltısı, doruğa toplanan nehir zerreleri, ikinci halka
    for (const st of a.stages) {
      if (!st.cells.length) continue;
      const mid = areaCenter(c, k, st.cells);
      const far = Math.max(...st.cells.map((p) => Math.hypot(p.x - mid.x, (p.y - mid.y) / FLAT)), 90);
      layer(
        c,
        st.at + k.slow(760),
        top(k, 1),
        (g, tm) => {
          const t = tm - st.at;
          if (t < -k.slow(40) || t > k.slow(640)) return;
          const q = clamp01(t / k.slow(640));
          const rise = eo(clamp01((t + k.slow(40)) / k.slow(140)), 2);
          for (const p of st.cells) column(g, p.x, p.y - 6, 200 * rise * (1 - q * 0.4), 30 * (1 - q * 0.6), C('#3ab8c0'), C('#e0fbff'), 0.32 * (1 - q) ** 1.3);
        },
        true,
      );
      floorGlow(c, k, st.cells.map((p) => ({ p, at: st.at })), { rx: 74, hex: '#1a6a78', core: '#6ad0d8', a: 0.2, pre: 100, hold: 380, fade: 800 });
      condense(c, k, { x: mid.x, y: mid.y - 14 }, { hex: ['#a8eef0', '#6ad0d8', '#e0fbff'], at: st.at, r: far * 1.1 + 60, depth: top(k, 5), n: 14, life: 380, flash: { hex: '#6ad0d8', w: far * 1.4 + 100, h: 120, a: 0.25 } });
      after(c, st.at, () => {
        ringFx(c, k, mid, { r0: 40, r1: far * 1.5 + 90, dur: 620, col: '#2a8a98', pale: '#a8eef0', w: 7, flat: FLAT, depth: k.FLOOR_FX + 4, a: 0.7 });
        ringFx(c, k, mid, { r0: 30, r1: far * 1.15 + 70, dur: 520, col: '#1a6a78', pale: '#e0fbff', w: 3.5, flat: FLAT, depth: k.FLOOR_FX + 4, delay: 120, a: 0.6 });
      });
    }
    after(c, a.at, () => k.shake(c.scene, 130, 0.0038));
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// CHAIN HOOK

function chainHook(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(
    c,
    k,
    hitMs,
    '#ff8a3a',
    (v, F) => {
      const dir = dirTo(c, v);
      const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.1));
      const hand = { x: k.spot(c.actor).x + dir * c.actor.w * 0.35, y: k.spot(c.actor).y - 6 };
      const HOLD = k.slow(110);
      const BACK = k.slow(300);
      const x0 = v.container.x;
      layer(c, F + HOLD + BACK, Math.max(v.container.depth, c.actor.container.depth) + 3, (g, tm) => {
        let tip: Pt;
        let a = 1;
        let sag: number;
        if (tm < F) {
          const q = eo(tm / F, 1.2);
          tip = { x: lerp(hand.x, to.x, q), y: lerp(hand.y, to.y, q) - Math.sin(Math.PI * q) * 40 };
          sag = 0;
        } else if (tm < F + HOLD) {
          tip = { x: to.x + (v.container.x - x0), y: to.y };
          sag = 0;
        } else {
          const q = (tm - F - HOLD) / BACK;
          tip = { x: lerp(to.x + (v.container.x - x0), hand.x, ei(q, 1.6)), y: lerp(to.y, hand.y, ei(q, 1.6)) };
          sag = 20 * Math.sin(Math.PI * q);
          a = 1 - clamp01((q - 0.75) / 0.25);
        }
        chain(g, sagLine(hand, tip, sag, 18), 13, 6.5, HOTCHAIN.body, HOTCHAIN.dark, HOTCHAIN.hi, a);
        g.lineStyle(3, C('#e0601a'), 0.25 * a).strokePoints(sagLine(hand, tip, sag, 18), false);
        // kanca: yarım daire + sivri uç (hedefe dönük)
        const ang = Math.atan2(tip.y - hand.y, tip.x - hand.x);
        const f = xf(tip, ang, dir);
        const hook = Array.from({ length: 10 }, (_, i) => {
          const an = Math.PI * 0.5 + (i / 9) * Math.PI * 1.15;
          return f(Math.cos(an) * 16 - 4, Math.sin(an) * 16 + 16);
        });
        g.lineStyle(9, IRON.dark, a).strokePoints(hook, false);
        g.lineStyle(5, C('#5a3020'), a).strokePoints(hook, false);
        g.lineStyle(1.6, HOTCHAIN.hi, 0.7 * a).strokePoints(hook.slice(2, 7), false);
        const e = hook[hook.length - 1]!;
        g.fillStyle(IRON.dark, a).fillTriangle(e.x - 4, e.y - 4, e.x + 4, e.y + 4, e.x + Math.cos(ang) * 14, e.y + Math.sin(ang) * 14);
      });
      after(c, F, () => {
        sparks(c, k, to, 10, v.container.depth + 4);
        embers(c, k, to, 8, v.container.depth + 4, { jx: 10, jy: 10 });
        if (hurt(c, v)) gore(c, k, to, UP - dir * 0.6, 10, v.container.depth + 4, { sp: [100, 260] });
      });
      after(c, F + HOLD, () => gore(c, k, to, Math.PI + (dir > 0 ? 0 : Math.PI), 4, v.container.depth + 4, { sp: [60, 160] }));
    },
    { anim: 'attack' },
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// ASH BRAND

function ashBrand(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(c, k, hitMs, '#ff6a1a', (v, F) => {
    const P = bodyAt(k, v, dirTo(c, v), 0, -0.2);
    const R = Math.max(46, v.w * 0.4);
    const x0 = v.container.x;
    const END = F + k.slow(900);
    // görkem (Ömer 2026-10-20): zeminde kor ısısı, doruğa toplanan kor, ikinci (dönen, damgalı) dış halka, yükselen kor ve kül
    const foot = k.feet(v);
    floorGlow(c, k, [{ p: foot, at: F }], { rx: R * 1.5, hex: '#8a2a10', core: '#e0601a', a: 0.22, pre: 220, hold: 420, fade: 700 });
    condense(c, k, P, { hex: ['#ff9a3a', '#e0601a', '#ffd890'], at: F, r: R * 2.2, depth: top(k, 5), n: 14, life: 420, flat: 1, flash: { hex: '#e0601a', w: R * 3, h: R * 2.4, a: 0.3 } });
    layer(
      c,
      END,
      top(k, 3),
      (g, tm) => {
        const p = { x: P.x + (v.container.x - x0), y: P.y };
        const q = clamp01(tm / F);
        const post = clamp01((tm - F) / (END - F));
        const a = eo(q, 1.5) * (1 - post ** 1.3);
        const flare = tm >= F ? Math.exp(-(tm - F) / k.slow(200)) : 0;
        // ateş halkası (kazınır: çevre boyunca dolar), içinde haç belirir
        const L = TAU * eo(q, 1.4);
        const ringPts = Array.from({ length: 28 }, (_, i) => ({ x: p.x + Math.cos(-Math.PI / 2 + (L * i) / 27) * R, y: p.y + Math.sin(-Math.PI / 2 + (L * i) / 27) * R }));
        g.lineStyle(9, PYRE.dark, 0.5 * a).strokePoints(ringPts, false);
        g.lineStyle(4, PYRE.orange, 0.9 * a).strokePoints(ringPts, false);
        g.lineStyle(1.6, PYRE.core, (0.6 + 0.4 * flare) * a).strokePoints(ringPts, false);
        const cr = R * 0.8 * eo(clamp01((q - 0.4) / 0.6), 2) * (1 + 0.6 * flare);
        for (const an of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) taper(g, [p, { x: p.x + Math.cos(an) * cr * (an === -Math.PI / 2 || an === Math.PI / 2 ? 1.25 : 1), y: p.y + Math.sin(an) * cr * (an === Math.PI / 2 || an === -Math.PI / 2 ? 1.25 : 1) }], 7, 1, PYRE.yellow, a);
        if (flare > 0.02) rays(g, p, 4, R * 2.4 * (0.6 + 0.4 * flare), 10, PYRE.orange, PYRE.core, flare, 0);
        // dış halka: halkanın ardından dönerek belirir, çevresinde kısa damga çentikleri
        const q2 = clamp01((tm - F * 0.35) / (F * 0.65 + k.slow(120)));
        if (q2 > 0) {
          const R2 = R * 1.6;
          const a2 = eo(q2, 1.6) * (1 - post ** 1.1);
          g.lineStyle(2, PYRE.orange, 0.7 * a2).strokeEllipse(p.x, p.y, R2 * 2, R2 * 2);
          g.lineStyle(1, PYRE.core, 0.5 * a2).strokeEllipse(p.x, p.y, R2 * 1.9, R2 * 1.9);
          for (let i = 0; i < 12; i++) {
            const an = (i / 12) * TAU + tm / k.slow(900);
            g.lineStyle(2, PYRE.yellow, 0.7 * a2).lineBetween(p.x + Math.cos(an) * R2 * 0.9, p.y + Math.sin(an) * R2 * 0.9, p.x + Math.cos(an) * R2 * 1.05, p.y + Math.sin(an) * R2 * 1.05);
          }
        }
      },
      true,
    );
    after(c, F, () => {
      fireBurst(c, k, P, 54, top(k, 3), { n: 8, dur: 320, pal: PYRE });
      embers(c, k, P, 22, top(k, 4), { jx: 24, jy: 24, sp: [100, 280], grav: -120 });
      if (hurt(c, v))
        wounds(
          c,
          k,
          v,
          k.slow(1),
          [
            { A: { x: P.x, y: P.y - R * 0.8 }, B: { x: P.x, y: P.y + R * 0.9 }, w: 8 },
            { A: { x: P.x - R * 0.7, y: P.y }, B: { x: P.x + R * 0.7, y: P.y }, w: 8, lag: 10 },
          ],
          { pal: BURN, drips: 0, sw: 40, hold: 400 },
        );
      // kül pulları (gri, yavaş süzülür)
      spray(c, k, bits(k, 18, P, { kind: 'leaf', ang: [-Math.PI, 0], sp: [40, 140], size: [3, 5], life: [900, 1300], cols: ['#5a544e', '#6a645e', '#4a4440'], jx: 30, jy: 30, drag: 2.4, sway: 8, up: [20, 60], vr: 4 }), top(k, 4), 90);
      smokeColumn(c, k, P, top(k, 2), { n: 4, w: 20, vy: [-100, -50], s1: [80, 120], a: 0.35 });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// FALL OF KING'S BRIDGE (tüm tahta)

function fallOfKingsBridge(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#ff5a1a', (a) => {
    const cells = c.cells.length ? a.cells : boardCells(c, k);
    const C0 = areaCenter(c, k, cells);
    const t0 = a.wu * 0.2;
    // merkezden her hücreye kor ışıklı çatlaklar (hazırlıkta yayılır)
    const cracks = cells.map((p) => crackPath(k, C0, { x: p.x + (p.x - C0.x) * 0.15, y: p.y + (p.y - C0.y) * 0.15 }, 14, 0.5));
    layer(c, a.at + k.slow(1600), k.FLOOR_FX + 3, (g, tm) => {
      if (tm < t0) return;
      const grow = eo((tm - t0) / (a.at - t0), 1.4);
      const post = clamp01((tm - a.at - k.slow(600)) / k.slow(1000));
      const al = 1 - post;
      for (const cr of cracks) drawCrack(g, cr, grow, al, 6, C('#0e0604'), C('#6a4a3a'), C('#f07a24'), al * (0.7 + 0.3 * Math.sin(tm / 40)));
    });
    // köprü taşları: her hücrede bir levha kalkar, eğilir, düşer (tümü tek Graphics'te)
    const slabs = cells.map((p) => ({ p, w: k.rnd(70, 96), h: k.rnd(16, 22), tilt: k.rnd(-0.5, 0.5), v0: k.rnd(110, 160) }));
    const cSlab = C('#3a3430');
    const cTop = C('#5c5650');
    const cEdge = C('#1a1614');
    const cHot = C('#c8501a');
    layer(c, a.at + k.slow(700), top(k, 2), (g, tm) => {
      if (tm < a.at - k.slow(80)) return;
      const t = tm - a.at + k.slow(80);
      const al = 1 - clamp01((t - k.slow(500)) / k.slow(280));
      for (const sl of slabs) {
        const s2 = t / k.slow(1000);
        const up = sl.v0 * s2 - 0.5 * 900 * s2 * s2; // yukarı fırlar, düşer
        if (up < -30) continue;
        const f = xf({ x: sl.p.x, y: sl.p.y - Math.max(-20, up) }, sl.tilt * Math.min(1, t / k.slow(200)));
        const P4 = [f(-sl.w / 2, -sl.h), f(sl.w / 2, -sl.h), f(sl.w / 2, 0), f(-sl.w / 2, 0)];
        g.fillStyle(cSlab, al).fillTriangle(P4[0]!.x, P4[0]!.y, P4[1]!.x, P4[1]!.y, P4[2]!.x, P4[2]!.y).fillTriangle(P4[0]!.x, P4[0]!.y, P4[2]!.x, P4[2]!.y, P4[3]!.x, P4[3]!.y);
        const m1 = f(sl.w / 2, -sl.h * 0.6);
        const m0 = f(-sl.w / 2, -sl.h * 0.6);
        g.fillStyle(cTop, al).fillTriangle(P4[0]!.x, P4[0]!.y, P4[1]!.x, P4[1]!.y, m1.x, m1.y).fillTriangle(P4[0]!.x, P4[0]!.y, m1.x, m1.y, m0.x, m0.y);
        g.lineStyle(2, cEdge, al).strokePoints(P4, true);
        g.lineStyle(1.6, cHot, 0.6 * al).lineBetween(P4[3]!.x, P4[3]!.y, P4[2]!.x, P4[2]!.y);
      }
    });
    scorch(c, k, cells.map((p) => ({ p, rx: 58, at: a.at })), 1600);
    for (const p of cells) cellFire(c, k, p, a.at + k.slow(40), { n: 4, rx: 40, h: [60, 120], hold: 420, fade: 520, pre: 30, pal: 'pyre', depth: top(k, 2) });
    after(c, a.at, () => {
      // patlama / moloz / toz: çok hücrede yalnızca bir kısmında (her hücrede ayrı Graphics kasmasın); alevler her hücrede
      cells.forEach((p, i) => {
        if (i % 2 === 0) fireBurst(c, k, { x: p.x, y: p.y - 16 }, 50, top(k, 4), { n: 8, dur: 320, pal: PYRE, flat: 0.6 });
        if (i % 3 === 0) rubble(c, k, p, 6, top(k, 4), { cols: STONE, rim: '#c8501a', sp: [160, 400], size: [4, 10] });
        dust(c, k, p, top(k, 3), { n: 2, w: 60, a: 0.32, hex: ['#5a4a40', '#6a5a4e'] });
        if (i % 2 === 1) smokeColumn(c, k, { x: p.x, y: p.y - 40 }, top(k, 3), { n: 2, w: 30, vy: [-170, -100], s1: [110, 150], a: 0.42, delay: 180 });
      });
      ringFx(c, k, C0, { r0: 60, r1: 700, dur: 700, col: '#7a2a0c', pale: '#f07a24', w: 9, flat: FLAT, depth: k.FLOOR_FX + 4, a: 0.7 });
      // ikinci, geç gelen halka (daha ince, ardından)
      ringFx(c, k, C0, { r0: 40, r1: 520, dur: 620, col: '#5a1a08', pale: '#ffa860', w: 4, flat: FLAT, depth: k.FLOOR_FX + 4, delay: 160, a: 0.6 });
      // kül pulları: tahtanın üstünden yavaşça yağar
      spray(c, k, cells.flatMap((p, i) => (i % 2 ? bits(k, 3, { x: p.x, y: p.y - 280 }, { kind: 'leaf', ang: [Math.PI * 0.3, Math.PI * 0.7], sp: [10, 60], size: [3, 5], life: [1300, 1900], cols: ['#5a544e', '#6a645e', '#4a4440'], jx: 50, jy: 30, drag: 1.4, sway: 12, vr: 4, delay: [i * 20, i * 20 + 300] }) : [])), top(k, 4), 70);
      k.shake(c.scene, 320, 0.007);
    });
    // görkem (Ömer 2026-10-20): zeminde kor ısısı, her hücreden yükselen ince ışık sütunu (tek Graphics), doruğa toplanan kor
    const farB = Math.max(...cells.map((p) => Math.hypot(p.x - C0.x, (p.y - C0.y) / FLAT)), 200);
    floorGlow(c, k, cells.map((p) => ({ p, at: a.at })), { rx: 72, hex: '#7a2410', core: '#e0601a', a: 0.24, pre: 160, hold: 700, fade: 1000, pulse: 0.15 });
    layer(
      c,
      a.at + k.slow(1500),
      top(k, 1),
      (g, tm) => {
        const t = tm - a.at;
        if (t < -k.slow(60) || t > k.slow(1300)) return;
        const rise = eo(clamp01((t + k.slow(60)) / k.slow(200)), 2);
        const fade = t < k.slow(500) ? 1 : (1 - (t - k.slow(500)) / k.slow(800)) ** 1.3;
        for (const p of cells) column(g, p.x, p.y - 10, 250 * rise, 32, C('#a8300c'), C('#ffc890'), 0.26 * rise * fade);
      },
      true,
    );
    condense(c, k, { x: C0.x, y: C0.y - 10 }, { hex: ['#ff7a3a', '#d0401a', '#ffa860'], at: a.at, r: farB * 0.9, depth: top(k, 5), n: 28, life: 560, flat: 0.55, size: [1.8, 3], flash: { hex: '#d0501a', w: farB * 1.2, h: farB * 0.5, a: 0.3 } });
  });
}

export const BRIDGE: Readonly<Record<string, MobHandVfx>> = {
  anchor_smash: anchorSmash,
  breaking_span: breakingSpan,
  chain_hook: chainHook,
  ash_brand: ashBrand,
  fall_of_kings_bridge: fallOfKingsBridge,
};
