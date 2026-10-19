/**
 * HAYDUTLAR / AVCILAR (Rend dili: çelik, ahşap, toz, kan; parlamasız):
 *   Shiv (Cutpurse): kısa hançer iki hızlı dürtüş (ikincisi vuruşta, derin); iki ince yarık, küçük kan.
 *   Sand in the Eyes (Cutpurse): elden hedefin yüzüne yelpaze gibi savrulan kum taneleri; yüzde kum bulutu, taneler süzülür.
 *   Chief's Cleaver (Bandit Chief): hazırlık pozu, tepeden inen ağır satır; gövdede derin çapraz yarık, iri kan, ayakta toz.
 *   Toll Sweep (Bandit Chief): sıra boyunca bel hizasında geniş yatay savuruş; her hedefte yatay kesik, zeminde savrulan toz.
 *   Hold the Tower (Bandit Chief): kendi arkasında yerden yükselen taş kule silueti (mazgallı, sancaklı), vuruşta oturur (toz, çakıl,
 *     zemin halkası); başladığı yerde söner (Ömer: "başta başladığı gibi bitsin").
 *   Billhook (Moor Raider): kancalı bağ ağzı çapraz iner ve geri çekilip yırtar; kıvrık yırtık, saldırgana savrulan lif; Jinx zerrecikleri.
 *   Peat Smoke (Moor Raider): fitilli kil çömlek alanın ortasına atılır, kırılır: her hücrede yerden kabaran koyu turba dumanı, kor.
 *     (Ömer: "olduğu yerde uçup yere düşüyor" sorunu: çömlek saldırgandan gelir, duman yerden yükselir.)
 *   Scatter Quarrels (Bandit Crossbowman): sıranın her hücresine saldırgan tarafından yüksek yayla düşen kısa oklar; zemine saplanır, titrer.
 *   Bolt (Bandit Crossbowman): düz, hızlı kısa ok; hedefin yakın kenarına saplanır, kıymık, küçük kıvılcım.
 *   Cudgel (Road Thug): çivili sopa omuz hizasına iner (Ömer: aşağı); toz şoku, kıymık, zeminde toz halkası.
 *   Hamstring (Road Thug): diz hizasında alçak bıçak savuruşu; bacakta kesik, yere damlayan kan, savrulan toz.
 *   Poacher's Shot (Ravenwood Poacher): hafif yaylı ok; saplanır; kuru sonbahar yaprakları ve tüyler savrulup süzülür.
 *   Tainted Bait (Ravenwood Poacher): kancalı ipli zehirli et yemi yayla düşer, ip şaklar, yem patlar; zehir birikintisi halka halka yayılır, sis, buhar, spor.
 */
import type { MobHandVfx } from '../mob-vfx';
import { C, FLAT, TAU, UP, after, bits, clamp01, ei, eo, layer, lerp, puffs, smoke, spray, type CombatantView, type G, type Pt, type VfxCtx, type VfxKit } from './core';
import { blob, blobPts, crescent, sagLine, xf } from './draw';
import { floorGlow, top } from './grand';
import { angTo, fly } from './bolts';
import { area, areaCenter, bolt, melee, aura } from './flow';
import { fumes, motes } from './magic';
import {
  DUST,
  FIBER,
  GORE,
  STONE,
  bodyAt,
  billhook as drawBillhook,
  arrow,
  cellDepth,
  cleaver,
  club,
  dust,
  embers,
  gore,
  knife,
  quarrel,
  rubble,
  shockRing,
  sparks,
  speedLines,
  splinters,
  swing,
  tail,
  wounds,
  type Stroke,
} from './phys';

const hurt = (c: VfxCtx, v: CombatantView): boolean => !c.usage || c.usage.damages.some((d) => d.target === v.combatant.uid && d.amount > 0);
const dirTo = (c: VfxCtx, v: CombatantView): number => (v.container.x >= c.actor.container.x ? 1 : -1);

// ---------------------------------------------------------------------------------------------------------------------
// SHIV: iki hızlı dürtüş

function shivOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = dirTo(c, v);
  const L = 62;
  const hit1 = bodyAt(k, v, dir, -0.25, -0.18);
  const hit2 = bodyAt(k, v, dir, -0.18, 0.02);
  const J1 = T - k.slow(120);
  const pull = k.slow(60);
  const HOLD = k.slow(70);
  const OUT = k.slow(120);
  const x0 = v.container.x;
  // bıçak: dürtüş başına geri çekilmiş noktadan yarığa (uç), sonra kısa geri; açı hareket yönünde, hafif aşağı
  layer(c, T + HOLD + OUT, v.container.depth + 3, (g, tm) => {
    const fx = v.container.x - x0;
    let tip: Pt;
    let a = 1;
    const back = (p: Pt, d: number): Pt => ({ x: p.x - dir * d, y: p.y - d * 0.28 });
    if (tm < J1) {
      const q = clamp01(tm / J1);
      tip = { x: lerp(back(hit1, 90).x, hit1.x + dir * 8, ei(q, 2.4)), y: lerp(back(hit1, 90).y, hit1.y, ei(q, 2.4)) };
      a = clamp01(q * 4);
    } else if (tm < J1 + pull) {
      const q = (tm - J1) / pull;
      tip = { x: lerp(hit1.x + dir * 8, back(hit2, 46).x, eo(q)), y: lerp(hit1.y, back(hit2, 46).y, eo(q)) };
    } else if (tm < T) {
      const q = (tm - J1 - pull) / (T - J1 - pull);
      tip = { x: lerp(back(hit2, 46).x, hit2.x + dir * 16, ei(q, 2.4)), y: lerp(back(hit2, 46).y, hit2.y, ei(q, 2.4)) };
    } else {
      const t = tm - T;
      const q = clamp01((t - HOLD) / OUT);
      tip = { x: hit2.x + dir * 16 - dir * 70 * eo(q), y: hit2.y - 20 * eo(q) };
      a = 1 - q;
    }
    tip = { x: tip.x + fx, y: tip.y };
    const ang = dir > 0 ? 0.28 : Math.PI - 0.28;
    // hareket çizgileri (yalnızca dürtüşte)
    if (tm < T) speedLines(g, { x: tip.x - Math.cos(ang) * L * 0.6, y: tip.y - Math.sin(ang) * L * 0.6 }, ang, 40, 0.3 * a, C('#a8a098'), 2, 10);
    knife(g, xf({ x: tip.x - Math.cos(ang) * L, y: tip.y - Math.sin(ang) * L }, ang, dir), L, a, tm / 90);
  });
  if (hurt(c, v)) {
    const slit = (p: Pt, lag: number, w: number, len: number): Stroke => ({ A: { x: p.x - dir * len * 0.2, y: p.y - len * 0.5 }, B: { x: p.x + dir * len * 0.2, y: p.y + len * 0.5 }, w, lag });
    wounds(c, k, v, T, [slit(hit1, -120, 4.5, 26), slit(hit2, 0, 6.5, 34)], { sw: 60, cross: 0.4, drips: 3, hold: 260 });
    after(c, J1, () => gore(c, k, hit1, UP + dir * 0.9, 5, v.container.depth + 4, { sp: [80, 220] }));
    after(c, T, () => gore(c, k, hit2, UP + dir * 0.8, 10, v.container.depth + 4, { sp: [100, 280] }));
  }
  after(c, T, () => spray(c, k, bits(k, 4, hit2, { kind: 'shard', ang: [-Math.PI + 0.4, -0.4], sp: [60, 160], size: [5, 8], life: [520, 780], cols: FIBER, jx: 10, jy: 10, up: [30, 90] }), v.container.depth + 4, 380));
}
const shiv: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => shivOn(c, k, v, T), { shake: [70, 0.0022] });

// ---------------------------------------------------------------------------------------------------------------------
// SAND IN THE EYES

const SAND = ['#c8a86a', '#b8945a', '#d8bc84', '#a0804c', '#e0caa0'];
function sandOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = dirTo(c, v);
  const head = bodyAt(k, v, dir, -0.05, -0.62);
  const hand = { x: head.x - dir * (v.w * 0.5 + 70), y: head.y + 40 };
  const F = Math.min(T, k.slow(170));
  const launch = Math.max(0, T - F);
  const ang = angTo(hand, head);
  const sp = (Math.hypot(head.x - hand.x, head.y - hand.y) / (F / k.slow(1000))) * 1.3; // px/s (sürtünmeyle yavaşlar)
  // savrulan taneler: elden yelpaze (bir kısmı yüzü geçer, bir kısmı kısa kalıp düşer)
  after(c, launch, () => {
    spray(
      c,
      k,
      [
        ...bits(k, 46, hand, { kind: 'streak', ang: [ang - 0.32, ang + 0.26], sp: [sp * 0.8, sp * 1.25], size: [2, 3.4], life: [380, 620], cols: SAND, jx: 8, jy: 8, drag: 1.4, delay: [0, 50] }),
        ...bits(k, 26, hand, { kind: 'dot', ang: [ang - 0.35, ang + 0.3], sp: [sp * 0.5, sp * 1.05], size: [1.2, 2.2], life: [500, 800], cols: SAND, jx: 8, jy: 8, drag: 1.1, delay: [0, 70] }),
      ],
      v.container.depth + 3,
      520,
    );
    // elden çıkan ince toz bulutu
    smoke(c, k, puffs(k, hand, 3, { hex: ['#b8a07a', '#c8b08a'], sx: 10, sy: 8, vx: [dir * 120, dir * 260], vy: [-30, 10], s0: [20, 30], s1: [60, 90], life: [420, 620], a: 0.22, drag: 2.4 }), v.container.depth + 2);
  });
  // vuruş: yüzde kabaran kum bulutu (yavaşça çöker), dökülen taneler
  after(c, T, () => {
    smoke(
      c,
      k,
      [
        ...puffs(k, head, 6, { hex: ['#c8ac78', '#b89a68', '#d4bc8c'], sx: 24, sy: 18, vx: [dir * 10, dir * 90], vy: [-40, 20], s0: [40, 60], s1: [110, 160], life: [700, 1050], a: 0.5, drag: 2.2 }),
        ...puffs(k, { x: head.x + dir * 20, y: head.y + 30 }, 3, { hex: ['#a8906a', '#bca07a'], sx: 30, sy: 10, vx: [dir * 20, dir * 60], vy: [20, 60], s0: [30, 44], s1: [80, 110], life: [800, 1100], a: 0.3, drag: 1.6, delay: [60, 160] }),
      ],
      v.container.depth + 3,
    );
    spray(c, k, bits(k, 30, head, { kind: 'dot', ang: [0.2, Math.PI - 0.2], sp: [20, 90], size: [1, 2], life: [700, 1100], cols: SAND, jx: 40, jy: 20, drag: 1 }), v.container.depth + 4, 380);
  });
}
const sandInTheEyes: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => sandOn(c, k, v, T), { shake: [60, 0.0016] });

// ---------------------------------------------------------------------------------------------------------------------
// CHIEF'S CLEAVER

function cleaverOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = dirTo(c, v);
  const R = Math.max(150, Math.min(200, v.h * 0.85));
  const hitP = bodyAt(k, v, dir, -0.1, -0.15);
  const a1 = 0.62;
  const P = { x: hitP.x - dir * Math.cos(a1) * R * 0.92, y: hitP.y - Math.sin(a1) * R * 0.92 };
  swing(c, k, {
    P,
    R,
    dir,
    a0: -2.1,
    a1,
    T,
    ease: 2.2,
    hold: k.slow(170),
    pull: k.slow(170),
    back: -0.35,
    depth: v.container.depth + 3,
    trail: { r0: 0.5, r1: 1.05, col: '#8a807a', a: 0.55, span: 0.9 },
    draw: (g, f, a, ang) => cleaver(g, f, R, a, ang, 58),
  });
  if (hurt(c, v)) {
    const body = k.spot(v);
    const A = { x: body.x - dir * v.w * 0.42, y: body.y - v.h * 0.36 };
    const B = { x: body.x + dir * v.w * 0.32, y: body.y + v.h * 0.22 };
    wounds(c, k, v, T, [{ A, B, w: 13, bow: -dir * 8 }, { A: { x: A.x + dir * 14, y: A.y + 18 }, B: { x: B.x + dir * 10, y: B.y + 12 }, w: 5, lag: 18, bow: -dir * 6 }], { sw: 90, drips: 5, hold: 300 });
    after(c, T, () => gore(c, k, hitP, UP + dir * 0.7, 18, v.container.depth + 4, { sp: [140, 360], size: [3, 6] }));
  }
  after(c, T, () => {
    dust(c, k, k.feet(v), v.container.depth - 1, { n: 5, w: 70, a: 0.3 });
    spray(c, k, bits(k, 6, hitP, { kind: 'shard', ang: [-Math.PI + 0.3, -0.3], sp: [70, 190], size: [6, 10], life: [560, 860], cols: FIBER, jx: 20, jy: 20, up: [40, 100] }), v.container.depth + 4, 380);
  });
}
const chiefsCleaver: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => cleaverOn(c, k, v, T), { shake: [130, 0.004] });

// ---------------------------------------------------------------------------------------------------------------------
// TOLL SWEEP: sıra boyunca yatay savuruş

function tollSweep(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  let done = false;
  return melee(
    c,
    k,
    hitMs,
    (_v, T) => {
      if (done) return;
      done = true;
      const ts = [...c.targets].sort((a, b) => a.container.y - b.container.y);
      if (!ts.length) return;
      const dir = dirTo(c, ts[0]!);
      const pts = ts.map((v) => bodyAt(k, v, dir, -0.15, 0.12));
      // yol: ilk hedefin üstünden (arka şerit) başlayıp son hedefin altına (ön şerit) uzanan yay; saldırgan tarafına bombeli
      const first = pts[0]!;
      const last = pts[pts.length - 1]!;
      const path: Pt[] = [{ x: first.x - dir * 150, y: first.y - 70 }, ...pts, { x: last.x - dir * 40, y: last.y + 60 }];
      const segs = path.slice(1).map((p, i) => Math.hypot(p.x - path[i]!.x, p.y - path[i]!.y));
      const total = segs.reduce((a, b) => a + b, 0);
      const at = (u: number): Pt => {
        let d = u * total;
        for (let i = 0; i < segs.length; i++) {
          if (d <= segs[i]! || i === segs.length - 1) {
            const s = clamp01(d / segs[i]!);
            return { x: lerp(path[i]!.x, path[i + 1]!.x, s), y: lerp(path[i]!.y, path[i + 1]!.y, s) };
          }
          d -= segs[i]!;
        }
        return last;
      };
      // her hedefin geçiş anı: yol üzerindeki payına göre, son hedef ~T
      const lens = pts.map((p) => {
        let best = 0;
        let bd = 1e9;
        for (let i = 0; i <= 40; i++) {
          const q = at(i / 40);
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d < bd) {
            bd = d;
            best = i / 40;
          }
        }
        return best;
      });
      const uLast = lens[lens.length - 1]!;
      const SW = Math.min(T, k.slow(200));
      const t0 = T - SW * uLast;
      const R = 185;
      const hist: Pt[] = [];
      layer(c, T + k.slow(380), Math.max(...ts.map((v) => v.container.depth)) + 3, (g, tm) => {
        if (tm < t0) return;
        const u = clamp01((tm - t0) / SW);
        const p = at(eo(u, 1.2));
        hist.unshift(p);
        if (hist.length > 16) hist.length = 16;
        const fade = tm > t0 + SW ? 1 - clamp01((tm - t0 - SW) / k.slow(200)) : clamp01(u * 5);
        // soluk hareket bulanıklığı (geçilen yol) + bıçak
        tail(g, hist, 54, C('#7a706a'), 0.26 * fade);
        tail(g, hist.slice(0, 9), 22, C('#a8a098'), 0.34 * fade);
        tail(g, hist.slice(0, 6), 5, C('#d8d0c8'), 0.45 * fade);
        const nx = at(Math.min(1, eo(u, 1.2) + 0.03));
        const ang = Math.atan2(nx.y - p.y, nx.x - p.x);
        cleaver(g, xf({ x: p.x - Math.cos(ang - dir * 1.2) * R * 0.85, y: p.y - Math.sin(ang - dir * 1.2) * R * 0.85 }, ang - dir * 1.2, dir), R, fade, ang, 50);
      });
      ts.forEach((v, i) => {
        const tp = t0 + SW * lens[i]!;
        const P = pts[i]!;
        if (hurt(c, v)) {
          wounds(c, k, v, T, [{ A: { x: P.x - dir * v.w * 0.42, y: P.y - 8 }, B: { x: P.x + dir * v.w * 0.42, y: P.y + 14 }, w: 9, lag: (tp - T) / (k.slow(1000) / 1000), bow: 6 }], { sw: 70, drips: 3 });
          after(c, tp, () => gore(c, k, P, UP + dir * 1.0, 10, v.container.depth + 4, { sp: [120, 320] }));
        }
        after(c, tp, () => dust(c, k, k.feet(v), v.container.depth - 1, { n: 4, w: 60, a: 0.28, rise: 40 }));
      });
    },
    { shake: [110, 0.0034] },
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// HOLD THE TOWER: taş kule silueti

function towerOn(c: VfxCtx, k: VfxKit, v: CombatantView, at: number): void {
  const foot = k.feet(v);
  const W = Math.max(120, v.w * 1.15);
  const H = Math.max(240, v.h * 1.35);
  const RISE = Math.min(at, k.slow(420));
  const r0 = at - RISE;
  const HOLD = k.slow(520);
  const FADE = k.slow(420);
  const total = at + HOLD + FADE;
  const stone = C('#4a423c');
  const stoneD = C('#2a2420');
  const stoneL = C('#6e645a');
  const mortar = C('#1c1814');
  const banner = C('#8a2a1c');
  const rows = 9;
  const bricks = Array.from({ length: rows }, (_, r) => Array.from({ length: 4 }, (_, i) => ({ dx: (i + (r % 2) * 0.5) / 4, j: k.rnd(-0.06, 0.06), t: k.rnd(0.85, 1.1) })));
  const depth = v.container.depth - 2; // birimin arkasında
  layer(c, total, depth, (g, tm) => {
    if (tm < r0) return;
    const q = clamp01((tm - r0) / RISE);
    const rise = eo(q, 2.2) + (tm >= at ? 0.03 * Math.exp(-(tm - at) / k.slow(50)) * Math.sin((tm - at) / k.slow(14)) : 0);
    const a = tm < at + HOLD ? clamp01(q * 3) : 1 - clamp01((tm - at - HOLD) / FADE);
    const top = foot.y - H * rise; // kule zeminden yükselir (alt kısmı zemin çizgisinde kesik)
    const x0 = foot.x - W / 2;
    const x1 = foot.x + W / 2;
    // gövde
    g.fillStyle(stoneD, 0.6 * a).fillRect(x0 - 4, top, W + 8, foot.y - top);
    g.fillStyle(stone, 0.55 * a).fillRect(x0, top + 4, W, foot.y - top - 4);
    // üstte koyulaşan, dipte toprağa karışan ton (hayalet taş, düz kutu değil)
    g.fillStyle(0x000000, 0.18 * a).fillRect(x0, top + 4, W, (foot.y - top) * 0.25);
    g.fillStyle(C('#2a2018'), 0.3 * a).fillRect(x0 - 4, foot.y - H * 0.12, W + 8, H * 0.12);
    // tuğla sıraları (yalnızca yükselen kısımda)
    const bh = H / rows;
    for (let r = 0; r < rows; r++) {
      const y = foot.y - (r + 1) * bh;
      if (y < top) break;
      g.lineStyle(2, mortar, 0.6 * a).lineBetween(x0, y, x1, y);
      for (const b of bricks[r]!) {
        const x = x0 + W * (b.dx + b.j);
        if (x > x0 + 4 && x < x1 - 4) g.lineBetween(x, y, x, y + bh);
        g.fillStyle(stoneL, 0.12 * a * b.t).fillRect(x + 3, y + 3, W / 4 - 6, bh * 0.35);
      }
    }
    // mazgallar + ok deliği + sancak
    const mw = W / 5;
    for (let i = 0; i < 5; i += 2) {
      g.fillStyle(stoneD, 0.82 * a).fillRect(x0 - 4 + i * mw, top - mw * 0.9, mw + 2, mw * 0.9 + 4);
      g.fillStyle(stone, 0.78 * a).fillRect(x0 + i * mw, top - mw * 0.8, mw - 2, mw * 0.8 + 4);
    }
    g.fillStyle(C('#120e0c'), 0.85 * a).fillRect(foot.x - 5, top + H * 0.22, 10, H * 0.14);
    const pole = { x: x1 - mw * 0.5, y: top - mw * 0.9 };
    g.lineStyle(3, C('#2a1e14'), a).lineBetween(pole.x, pole.y, pole.x, pole.y - 70);
    const wv = Math.sin(tm / k.slow(90)) * 6;
    g.fillStyle(banner, 0.9 * a).fillPoints([{ x: pole.x, y: pole.y - 70 }, { x: pole.x - 46, y: pole.y - 64 + wv }, { x: pole.x - 40, y: pole.y - 52 + wv * 0.6 }, { x: pole.x - 46, y: pole.y - 40 + wv }, { x: pole.x, y: pole.y - 44 }], true);
    // yan kenarlarda ışık / gölge (hacim)
    g.fillStyle(0x000000, 0.25 * a).fillRect(x1 - W * 0.18, top, W * 0.18, foot.y - top);
    g.fillStyle(C('#c0704a'), 0.1 * a).fillRect(x0, top, W * 0.12, foot.y - top);
  });
  // zemin halkası (taunt): ince kızıl-bakır çift halka, kulenin oturduğu anda nabız
  layer(c, total, k.FLOOR_FX + 3, (g, tm) => {
    if (tm < r0) return;
    const q = clamp01((tm - r0) / RISE);
    const a = tm < at + HOLD ? clamp01(q * 2) : 1 - clamp01((tm - at - HOLD) / FADE);
    const pulse = tm >= at ? Math.exp(-(tm - at) / k.slow(160)) : 0;
    const R = W * (0.9 + 0.25 * pulse);
    g.lineStyle(3, C('#8a3a22'), 0.7 * a).strokeEllipse(foot.x, foot.y, R * 2, R * 2 * 0.36);
    g.lineStyle(1.6, C('#d88a5a'), (0.4 + 0.5 * pulse) * a).strokeEllipse(foot.x, foot.y, R * 1.8, R * 1.8 * 0.36);
  });
  after(c, r0, () => dust(c, k, foot, depth + 3, { n: 4, w: W * 0.6, a: 0.22, rise: 30 }));
  after(c, at, () => {
    dust(c, k, foot, v.container.depth + 1, { n: 7, w: W * 0.9, a: 0.36 });
    rubble(c, k, { x: foot.x, y: foot.y - 4 }, 8, v.container.depth + 1, { cols: STONE, sp: [120, 300], size: [4, 9], spread: 1.2 });
    // kuleden dökülen çakıl
    spray(c, k, bits(k, 8, { x: foot.x, y: foot.y - H * 0.8 }, { kind: 'rock', ang: [Math.PI * 0.3, Math.PI * 0.7], sp: [20, 80], size: [2.5, 5], life: [520, 760], cols: STONE, jx: W * 0.5, jy: 20, floor: foot.y }), depth + 1, 1400);
  });
}
const holdTheTower: MobHandVfx = (c, k, hitMs) => aura(c, k, hitMs, '#c0704a', (v, at) => towerOn(c, k, v, at), true);

// ---------------------------------------------------------------------------------------------------------------------
// BILLHOOK: çapraz iniş + kanca çekişi

function billhookOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = dirTo(c, v);
  const R = 140;
  const hitP = bodyAt(k, v, dir, 0.05, -0.05);
  const a1 = 0.75;
  const P = { x: hitP.x - dir * Math.cos(a1) * R * 0.95, y: hitP.y - Math.sin(a1) * R * 0.95 };
  swing(c, k, {
    P,
    R,
    dir,
    a0: -1.7,
    a1,
    T,
    ease: 2,
    hold: k.slow(60),
    pull: k.slow(210),
    back: -1.1, // kanca geri çekilir: yırtar
    depth: v.container.depth + 3,
    trail: { r0: 0.6, r1: 1.1, col: '#8a807a', a: 0.5, span: 0.8 },
    draw: (g, f, a, ang) => drawBillhook(g, f, R, a, ang),
  });
  if (hurt(c, v)) {
    const body = k.spot(v);
    wounds(c, k, v, T, [{ A: { x: body.x - dir * v.w * 0.3, y: body.y - v.h * 0.32 }, B: { x: body.x + dir * v.w * 0.18, y: body.y + v.h * 0.12 }, w: 9, bow: dir * 16 }], { sw: 80, drips: 3, hold: 260 });
    after(c, T + k.slow(80), () => gore(c, k, hitP, UP - dir * 0.9, 12, v.container.depth + 4, { sp: [120, 300] })); // çekişte saldırgana doğru
  }
  after(c, T + k.slow(70), () => spray(c, k, bits(k, 7, hitP, { kind: 'shard', ang: dir > 0 ? [Math.PI - 0.9, Math.PI + 0.3] : [-0.3, 0.9], sp: [90, 230], size: [6, 10], life: [560, 860], cols: FIBER, jx: 14, jy: 14, up: [30, 90] }), v.container.depth + 4, 420));
  // Jinx: hedefin başında üç soluk mor-kızıl zerre döner
  layer(c, T + k.slow(700), v.container.depth + 4, (g, tm) => {
    if (tm < T) return;
    const q = (tm - T) / k.slow(700);
    const hp = { x: v.container.x, y: v.container.y - v.h - 14 };
    for (let i = 0; i < 3; i++) {
      const an = q * TAU * 1.4 + (i * TAU) / 3;
      const x = hp.x + Math.cos(an) * 30;
      const y = hp.y + Math.sin(an) * 8;
      const a = Math.sin(Math.PI * q) * 0.85;
      g.fillStyle(C('#4a1a3a'), a * 0.5).fillCircle(x, y, 7);
      g.fillStyle(C('#a8507a'), a).fillCircle(x, y, 3);
    }
  });
}
const billhook: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => billhookOn(c, k, v, T), { shake: [100, 0.003] });

// ---------------------------------------------------------------------------------------------------------------------
// PEAT SMOKE: fitilli çömlek + yerden kabaran turba dumanı

const PEAT = ['#7a6a5a', '#8a7a68', '#6a5a4c', '#958470'];
function peatSmoke(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#8a6a48', (a) => {
    const C0 = areaCenter(c, k, a.cells);
    const from = { x: k.spot(c.actor).x + (C0.x >= c.actor.container.x ? 1 : -1) * c.actor.w * 0.3, y: k.spot(c.actor).y - 20 };
    const launch = a.wu * 0.5;
    const F = a.at - launch;
    after(c, launch, () =>
      fly(c, k, {
        from,
        to: { x: C0.x, y: C0.y - 6 },
        F,
        arc: 240,
        depth: top(k, 1),
        hist: 14,
        draw: (g, p, _ang, q, tm, hist) => {
          // ince fitil dumanı izi
          tail(g, hist, 9, C('#5a5048'), 0.25);
          const r = 13;
          g.fillStyle(C('#3a2a1c'), 1).fillCircle(p.x, p.y, r);
          g.fillStyle(C('#5e4430'), 1).fillCircle(p.x - 2, p.y - 2, r * 0.8);
          g.fillStyle(C('#2a1c12'), 1).fillRect(p.x - 5, p.y - r - 5, 10, 6);
          g.lineStyle(2, C('#20160e'), 1).strokeCircle(p.x, p.y, r);
          const sp = 0.6 + 0.4 * Math.sin(tm / 25);
          g.fillStyle(C('#ffb050'), sp).fillCircle(p.x + Math.sin(q * 30) * 2, p.y - r - 9, 3);
        },
      }),
    );
    // vuruş: çömlek kırılır (kil kırıkları), her hücrede yerden kabaran duman + kor + zeminde koyu leke
    after(c, a.at, () => {
      spray(c, k, bits(k, 10, C0, { kind: 'shard', ang: [-Math.PI + 0.2, -0.2], sp: [140, 320], size: [5, 9], life: [480, 720], cols: ['#5e4430', '#3a2a1c', '#7a5a40'], jx: 8, jy: 4, floor: C0.y + 4 }), top(k, 3), 1400);
      for (const p of a.cells) {
        const d = top(k, 2);
        smoke(
          c,
          k,
          [
            ...puffs(k, p, 7, { hex: PEAT, sx: 50, sy: 10, vx: [-80, 80], vy: [-90, -30], s0: [70, 90], s1: [190, 250], life: [1200, 1600], a: 0.72, drag: 1.3, rise: 0.08 }),
            ...puffs(k, { x: p.x, y: p.y - 50 }, 5, { hex: PEAT, sx: 44, sy: 24, vx: [-40, 40], vy: [-130, -60], s0: [60, 80], s1: [160, 220], life: [1300, 1700], a: 0.6, drag: 0.9, delay: [60, 240] }),
          ],
          d,
        );
        embers(c, k, p, 6, d + 1, { sp: [30, 110], jx: 40, jy: 6, life: [500, 900], cols: ['#ff9a3a', '#e86a1c', '#c8501a'] });
        rubble(c, k, p, 3, d, { cols: ['#2e2218', '#3e3022', '#4a3a2a'], sp: [100, 220], size: [3, 6] });
      }
      layer(c, k.slow(1400), k.FLOOR_FX + 3, (g, tm) => {
        const q = tm / k.slow(1400);
        const al = q < 0.1 ? q / 0.1 : (1 - (q - 0.1) / 0.9) ** 1.3;
        for (const p of a.cells) {
          g.fillStyle(C('#1a120c'), 0.35 * al).fillEllipse(p.x, p.y, 120, 40);
          g.fillStyle(C('#c8501a'), 0.18 * al * (0.7 + 0.3 * Math.sin(tm / 60 + p.x))).fillEllipse(p.x, p.y, 40, 12);
        }
      });
      // zeminde hafif kızgınlık: dumanın altında soluk, nefes alan kor parıltısı (Ömer 2026-10-20) + sönen kor benekleri
      floorGlow(c, k, a.cells.map((p) => ({ p, at: 0 })), { rx: 66, hex: '#b8481a', core: '#e87a2a', a: 0.22, pre: 40, hold: 520, fade: 900, pulse: 0.18, depth: k.FLOOR_FX + 4 });
      layer(c, k.slow(1500), k.FLOOR_FX + 5, (g, tm) => {
        const q = tm / k.slow(1500);
        const al = (1 - q) ** 1.2;
        a.cells.forEach((p, i) => {
          for (let j = 0; j < 6; j++) {
            const ax = p.x + Math.sin(i * 7 + j * 2.3) * 52;
            const ay = p.y + Math.cos(i * 3 + j * 1.7) * 11;
            const fl = 0.45 + 0.55 * Math.sin(tm / 85 + j * 2 + i);
            g.fillStyle(C('#e0701e'), 0.5 * al * fl).fillCircle(ax, ay, 2.2);
          }
        });
      });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// SCATTER QUARRELS: hücrelere düşen kısa oklar

function scatterQuarrels(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#c0392b', (a) => {
    const dir = a.cells[0]!.x >= c.actor.container.x ? 1 : -1;
    for (const st of a.stages) {
      st.cells.forEach((p, ci) => {
        const n = 3;
        for (let i = 0; i < n; i++) {
          const land = { x: p.x + k.rnd(-44, 44), y: p.y + k.rnd(-14, 14) };
          const at = st.at - k.slow(i === 0 ? 0 : k.rnd(20, 70)) + k.slow(ci * 14);
          const F = Math.min(at, k.slow(300));
          const from = { x: land.x - dir * k.rnd(260, 320), y: land.y - k.rnd(420, 500) };
          const ang = angTo(from, land);
          after(c, at - F, () =>
            fly(c, k, {
              from,
              to: land,
              F,
              arc: 30,
              ease: 1.15,
              depth: cellDepth(land, 2),
              hold: k.slow(720),
              draw: (g, pp, an) => {
                speedLines(g, pp, an, 50, 0.3, C('#a49a90'), 1);
                quarrel(g, xf(pp, an), 70, 1);
              },
              stuck: (g, pp, _an, t) => {
                // saplanmış: ucu toprağa gömülü (yalnızca arka 2/3 görünür), kısa titrer, sonra söner
                const q = t / k.slow(720);
                const qv = 0.05 * Math.sin(t / k.slow(14)) * Math.exp(-t / k.slow(110));
                const al = q < 0.75 ? 1 : 1 - (q - 0.75) / 0.25;
                const an2 = ang + qv;
                const base = { x: pp.x - Math.cos(an2) * 14, y: pp.y - Math.sin(an2) * 14 };
                quarrel(g, xf({ x: base.x - Math.cos(an2) * 19, y: base.y - Math.sin(an2) * 19 }, an2), 70, al);
                g.fillStyle(C('#2a2018'), 0.6 * al).fillEllipse(pp.x - Math.cos(an2) * 12, pp.y + 2, 18, 6);
              },
            }),
          );
          after(c, at, () => {
            rubble(c, k, land, 3, cellDepth(land, 3), { sp: [90, 220], size: [2.5, 5], spread: 0.9, lean: -dir * 0.4, jx: 8 });
            if (i === 0) dust(c, k, land, cellDepth(land, 1), { n: 2, w: 30, a: 0.24, rise: 26 });
          });
        }
        if (ci === 0)
          for (const v of st.victims)
            if (hurt(c, v)) after(c, st.at, () => gore(c, k, bodyAt(k, v, dir, -0.1, 0), UP + dir * 0.5, 9, v.container.depth + 3, { sp: [100, 260] }));
      });
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// BOLT (crossbow): düz, hızlı kısa ok

function crossbowBolt(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(
    c,
    k,
    hitMs,
    '#d9c9a3',
    (v, F) => {
      const dir = dirTo(c, v);
      const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.08));
      const from = { x: k.spot(c.actor).x + dir * c.actor.w * 0.4, y: k.spot(c.actor).y - 8 };
      const ang0 = angTo(from, to);
      const x0 = v.container.x;
      fly(c, k, {
        from,
        to,
        F,
        arc: 12,
        depth: v.container.depth + 3,
        hold: k.slow(620),
        hist: 8,
        draw: (g, p, an, _q, _t, hist) => {
          tail(g, hist, 6, C('#c8c0b4'), 0.22);
          speedLines(g, p, an, 70, 0.32, C('#b8b0a4'), 3, 7);
          quarrel(g, xf(p, an), 76, 1);
        },
        stuck: (g, p, _an, t) => {
          const q = t / k.slow(620);
          const qv = 0.06 * Math.sin(t / k.slow(13)) * Math.exp(-t / k.slow(100));
          const al = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
          const an2 = ang0 + qv;
          const fx = v.container.x - x0;
          const tip = { x: p.x + fx + Math.cos(an2) * 10, y: p.y + Math.sin(an2) * 10 };
          quarrel(g, xf({ x: tip.x - Math.cos(an2) * 40, y: tip.y - Math.sin(an2) * 40 }, an2), 76, al);
        },
      });
      after(c, F, () => {
        splinters(c, k, to, Math.PI + (dir > 0 ? 0 : Math.PI) + 0.4, 4, v.container.depth + 4, ['#8a6640', '#6e5638', '#c8b896'], [4, 7]);
        sparks(c, k, to, 4, v.container.depth + 4, dir > 0 ? [Math.PI - 1, Math.PI + 1] : [-1, 1]);
        if (hurt(c, v)) gore(c, k, to, UP - dir * 0.6, 7, v.container.depth + 4, { sp: [90, 240], jx: 6, jy: 8 });
      });
    },
    { anim: 'attack' },
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// CUDGEL: çivili sopa omuz hizasına

function cudgelOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = dirTo(c, v);
  const R = 120;
  const hitP = bodyAt(k, v, dir, -0.2, -0.28);
  const a1 = 0.5;
  const P = { x: hitP.x - dir * Math.cos(a1) * R, y: hitP.y - Math.sin(a1) * R };
  swing(c, k, {
    P,
    R,
    dir,
    a0: -2.0,
    a1,
    T,
    ease: 2.3,
    hold: k.slow(110),
    pull: k.slow(170),
    back: -0.5,
    depth: v.container.depth + 3,
    quiver: 0.03,
    trail: { r0: 0.55, r1: 1.05, col: '#8a7a6a', a: 0.45, span: 0.85 },
    draw: (g, f, a, ang) => club(g, f, R, a, ang),
  });
  after(c, T, () => {
    shockRing(c, k, hitP, 60, v.container.depth + 4, { flat: 0.55, col: '#c8b8a0', a: 0.4 });
    smoke(c, k, puffs(k, hitP, 4, { hex: DUST, sx: 16, sy: 14, vx: [dir * 30, dir * 120], vy: [-60, 10], s0: [30, 44], s1: [70, 100], life: [420, 640], a: 0.3, drag: 2.4 }), v.container.depth + 3);
    splinters(c, k, hitP, UP - dir * 0.6, 4, v.container.depth + 4, ['#664830', '#8a6a48', '#4e3a26'], [4, 7]);
    if (hurt(c, v)) gore(c, k, hitP, UP + dir * 0.5, 8, v.container.depth + 4, { sp: [100, 260] });
    // darbe yere iner: ayakta toz halkası
    shockRing(c, k, k.feet(v), 90, k.FLOOR_FX + 4, { flat: 0.32, col: '#a89884', a: 0.5, dur: 320 });
    dust(c, k, k.feet(v), v.container.depth - 1, { n: 4, w: 60, a: 0.26, rise: 30 });
  });
}
const cudgel: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => cudgelOn(c, k, v, T), { shake: [120, 0.0036] });

// ---------------------------------------------------------------------------------------------------------------------
// HAMSTRING: diz hizasında alçak kesik

function hamstringOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = dirTo(c, v);
  const knee = bodyAt(k, v, dir, 0, 0.62);
  const L = 78;
  const SW = Math.min(T, k.slow(150));
  const t0 = T - SW * 0.6;
  // bıçak: yatay, alçak yay (dizin önünden arkasına), soluk iz
  const P = { x: knee.x - dir * 30, y: knee.y - 70 }; // dirsek
  const R = 92;
  const a0 = 1.9;
  const a1 = 0.55;
  layer(c, T + k.slow(260), v.container.depth + 3, (g, tm) => {
    if (tm < t0 - k.slow(40)) return;
    const q = clamp01((tm - t0) / SW);
    const an = lerp(a0, a1 - 0.5, ei(q, 1.5));
    const al = tm < T + k.slow(60) ? clamp01((tm - t0 + k.slow(40)) / k.slow(40)) : 1 - clamp01((tm - T - k.slow(60)) / k.slow(200));
    const A0 = dir > 0 ? Math.PI - a0 : a0;
    const Ai = dir > 0 ? Math.PI - an : an;
    if (q > 0.05 && q < 1) crescent(g, P, R, A0, Ai, 12, C('#b0a8a0'), 0.3 * al, 0.45);
    const tip = { x: P.x + Math.cos(Ai) * R, y: P.y + Math.sin(Ai) * R * 0.45 };
    const ta = Ai + (dir > 0 ? -Math.PI / 2 : Math.PI / 2) * -1;
    knife(g, xf({ x: tip.x - Math.cos(ta) * L, y: tip.y - Math.sin(ta) * L }, ta, -dir), L, al, tm / 80);
  });
  if (hurt(c, v)) {
    wounds(c, k, v, T, [{ A: { x: knee.x - dir * v.w * 0.32, y: knee.y - 6 }, B: { x: knee.x + dir * v.w * 0.28, y: knee.y + 8 }, w: 7, bow: 4 }], { sw: 70, drips: 3, hold: 300 });
    after(c, T, () => {
      gore(c, k, knee, UP + dir * 0.9, 8, v.container.depth + 4, { sp: [80, 220] });
      // yere damlayan kan: zeminde küçük lekeler
      spray(c, k, bits(k, 6, knee, { kind: 'drop', ang: [Math.PI * 0.35, Math.PI * 0.65], sp: [20, 70], size: [2.5, 4], life: [700, 1000], cols: GORE, jx: 16, jy: 6, floor: k.feet(v).y }), v.container.depth + 2, 900);
    });
  }
  after(c, T, () => dust(c, k, k.feet(v), v.container.depth - 1, { n: 4, w: 50, a: 0.26, rise: 24 }));
}
const hamstring: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => hamstringOn(c, k, v, T), { shake: [70, 0.0022] });

// ---------------------------------------------------------------------------------------------------------------------
// POACHER'S SHOT: ok + yapraklar

const LEAVES = ['#8a4a1c', '#a8601e', '#6e3a18', '#7a6a2a', '#5a3a1e', '#b8742a'];
function poachersShot(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(
    c,
    k,
    hitMs,
    '#8a9a4a',
    (v, F) => {
      const dir = dirTo(c, v);
      const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.12));
      const from = { x: k.spot(c.actor).x + dir * c.actor.w * 0.35, y: k.spot(c.actor).y - 16 };
      const x0 = v.container.x;
      let angHit = angTo(from, to);
      fly(c, k, {
        from,
        to,
        F,
        arc: 46,
        depth: v.container.depth + 3,
        hold: k.slow(640),
        hist: 8,
        draw: (g, p, an, _q, _t, hist) => {
          angHit = an;
          tail(g, hist, 4, C('#b8b0a0'), 0.2);
          arrow(g, xf(p, an), 96, 1, { feather: '#4a3222' });
        },
        stuck: (g, p, _an, t) => {
          const q = t / k.slow(640);
          const qv = 0.07 * Math.sin(t / k.slow(12)) * Math.exp(-t / k.slow(110));
          const al = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
          const an2 = angHit + qv;
          const fx = v.container.x - x0;
          const tip = { x: p.x + fx + Math.cos(an2) * 12, y: p.y + Math.sin(an2) * 12 };
          arrow(g, xf({ x: tip.x - Math.cos(an2) * 54, y: tip.y - Math.sin(an2) * 54 }, an2), 96, al, { feather: '#4a3222' });
        },
      });
      after(c, F, () => {
        // kuru yapraklar ve tüyler: savrulup salınarak süzülür
        spray(c, k, bits(k, 10, to, { kind: 'leaf', ang: [-Math.PI, 0], sp: [70, 220], size: [9, 15], life: [900, 1300], cols: LEAVES, jx: 16, jy: 16, drag: 2.4, sway: 14, up: [40, 110], vr: 4 }), v.container.depth + 4, 160);
        spray(c, k, bits(k, 4, to, { kind: 'leaf', ang: [-Math.PI, 0], sp: [60, 160], size: [5, 8], life: [800, 1100], cols: ['#2a2420', '#3a322c'], jx: 8, jy: 8, drag: 2.6, sway: 10, up: [30, 90], vr: 5 }), v.container.depth + 4, 140);
        if (hurt(c, v)) gore(c, k, to, UP - dir * 0.7, 7, v.container.depth + 4, { sp: [80, 220], jx: 6, jy: 8 });
      });
    },
    { anim: 'attack' },
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// TAINTED BAIT (yeniden tasarlandı, Ömer 2026-10-20): ucunda kanca olan ince bir ipe bağlı zehirli et yemi fırlatılır (ip yayda
// sarkar), yere kanca gibi oturur; ip gerilip şaklar, yem patlar: çürük et parçaları fırlar, zehir birikintisi halka halka yayılır,
// kabarcıklar patlar, yerde sürünen yeşil sis, yükselen buhar ve sporlar. Birikinti zemin katmanında, geri kalan her şeyin üstünde.

const VENOM = ['#6fcf4b', '#58b03a', '#8ae05a', '#3e8a2a'];
const MEAT = ['#4a1e16', '#7a3424', '#5a2a1c', '#3a1810'];

/** Ucunda kancalı zehirli yem parçası. */
function baitChunk(g: G, p: Pt, rot: number, a: number, drip = 0): void {
  const f = xf(p, rot);
  g.fillStyle(C('#2a0e0a'), a).fillPoints([f(-15, -9), f(4, -13), f(16, -3), f(13, 10), f(-7, 13), f(-16, 4)], true);
  g.fillStyle(C(MEAT[1]!), a).fillPoints([f(-9, -6), f(4, -9), f(10, -1), f(4, 6), f(-8, 5)], true);
  g.fillStyle(C('#a8d878'), a * 0.55).fillPoints([f(-4, -5), f(3, -6), f(5, -2), f(-2, -1)], true); // zehir parlak yağı
  // kanca
  const h = [f(13, -3), f(21, -8), f(26, -2), f(22, 5), f(17, 3)];
  g.lineStyle(2.6, C('#1c1a18'), a).strokePoints(h, false);
  g.lineStyle(1.2, C('#8a8078'), a * 0.7).strokePoints(h, false);
  if (drip > 0) g.fillStyle(C(VENOM[0]!), a * 0.8).fillCircle(f(-4, 12).x, f(-4, 12).y + drip * 10, 2.4);
}

function taintedBait(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(
    c,
    k,
    hitMs,
    '#6fcf4b',
    (v, F) => {
      const dir = dirTo(c, v);
      const to = { x: v.container.x - dir * v.w * 0.15, y: k.feet(v).y - 8 };
      const from = { x: k.spot(c.actor).x + dir * c.actor.w * 0.3, y: k.spot(c.actor).y - 30 };
      const CUT = k.slow(320);
      const cord = C('#6a5a3e');
      fly(c, k, {
        from,
        to,
        F,
        arc: 190,
        depth: top(k, 1),
        hold: CUT,
        hist: 10,
        draw: (g, p, _an, q, tm, hist) => {
          // ince ip: elden yeme, yayda sarkar (yem indikçe gerilir)
          const line = sagLine(from, p, 26 * (1 - q) + 6, 16);
          g.lineStyle(3, C('#1c140c'), 0.35).strokePoints(line, false);
          g.lineStyle(1.6, cord, 0.9).strokePoints(line, false);
          tail(g, hist, 5, C('#4a9a2a'), 0.3);
          baitChunk(g, p, q * 8, 1, 0.5 + 0.5 * Math.sin(tm / 40));
        },
        stuck: (g, p, _an, t) => {
          // ip şaklar, gevşeyip yere düşer ve söner (yem artık patlamış, yalnızca ip)
          const u = clamp01(t / CUT);
          const line = sagLine(from, to, 8 + 60 * eo(u, 1.5), 16);
          g.lineStyle(1.6, cord, 0.9 * (1 - u)).strokePoints(line, false);
          void p;
        },
      });
      after(c, F, () => {
        const LIFE = k.slow(1700);
        const rs = blob(k, 18, 0.22);
        const bub = Array.from({ length: 9 }, () => ({ a: k.rnd(0, TAU), r: k.rnd(0.15, 0.85), ph: k.rnd(0, 1), sp: k.rnd(0.8, 1.4) }));
        // zemin: zehir birikintisi halka halka yayılır, kabarcıklar kabarıp patlar
        layer(c, LIFE, k.FLOOR_FX + 4, (g, tm) => {
          const q = tm / LIFE;
          const al = q < 0.72 ? 1 : 1 - (q - 0.72) / 0.28;
          const sp = eo(clamp01(tm / k.slow(300)), 2.2);
          const P = { x: to.x, y: to.y + 6 };
          g.fillStyle(C('#142a0c'), 0.5 * al).fillPoints(blobPts(P, 84 * sp, 25 * sp, rs), true);
          g.fillStyle(C('#3e8a2a'), 0.55 * al).fillPoints(blobPts(P, 64 * sp, 18 * sp, rs, 0.3), true);
          g.fillStyle(C('#8ae05a'), 0.22 * al).fillEllipse(P.x - 16, P.y - 2, 34 * sp, 6 * sp);
          for (let i = 0; i < 2; i++) {
            const u = clamp01((tm - i * k.slow(180)) / k.slow(620));
            if (u > 0 && u < 1) g.lineStyle(2.4 * (1 - u) + 0.6, C('#9aea6a'), 0.6 * (1 - u)).strokeEllipse(P.x, P.y, 60 + 150 * eo(u, 2), (60 + 150 * eo(u, 2)) * FLAT);
          }
          for (const b of bub) {
            const ph = (tm / k.slow(520) * b.sp + b.ph) % 1;
            const bx = P.x + Math.cos(b.a) * 62 * b.r * sp;
            const by = P.y + Math.sin(b.a) * 17 * b.r * sp;
            const rr = 2 + ph * 6;
            g.lineStyle(1.6, C('#b4f080'), al * (1 - ph) * 0.85).strokeCircle(bx, by - ph * 5, rr);
            if (ph > 0.88) g.fillStyle(C('#9aea6a'), al * 0.5).fillEllipse(bx, by, rr * 3, rr);
          }
        });
        // yem patlar: çürük et parçaları + zehir damlaları ve jetleri (hepsi birimlerin üstünde)
        const D = top(k, 2);
        spray(c, k, bits(k, 9, to, { kind: 'rock', ang: [-Math.PI + 0.2, -0.2], sp: [160, 380], size: [4, 8], life: [520, 780], cols: MEAT, rim: '#8a5a44', jx: 8, jy: 4, floor: to.y + 8 }), D, 1500);
        spray(
          c,
          k,
          [
            ...bits(k, 20, to, { kind: 'drop', ang: [-Math.PI + 0.25, -0.25], sp: [140, 360], size: [3, 5], life: [420, 660], cols: VENOM, jx: 10, jy: 4, floor: to.y + 8 }),
            ...bits(k, 8, to, { kind: 'streak', ang: [-Math.PI + 0.5, -0.5], sp: [260, 460], size: [2, 3], life: [200, 340], cols: ['#b4f080', '#8ae05a'], jx: 6 }),
          ],
          D,
          1300,
        );
        // yerde sürünen yeşil sis, yükselen buhar, spor zerreleri
        smoke(c, k, puffs(k, to, 6, { hex: ['#4a8a30', '#5aa03a', '#3e7a2a'], sx: 46, sy: 6, vx: [-60, 60], vy: [-34, -10], s0: [60, 80], s1: [150, 200], life: [1100, 1500], a: 0.3, drag: 1.2, delay: [40, 260], rise: 0.12 }), top(k));
        fumes(c, k, to, { n: 5, spread: 40, h: 150, cols: ['#6fcf4b', '#4a9a2a', '#8ae05a'], life: 1300, a: 0.35, depth: top(k, 1), w: 9, delay: 300 });
        motes(c, k, { x: to.x, y: to.y - 6 }, { n: 10, r: 52, rise: 110, cols: ['#b4f080', '#8ae05a'], size: [1.3, 2.2], life: 1300, depth: top(k, 3), delay: 500, a: 0.8 });
        if (hurt(c, v)) gore(c, k, bodyAt(k, v, dir, 0, 0.5), UP, 4, D, { sp: [60, 160] });
      });
    },
    { anim: 'attack' },
  );
}

export const BANDITS: Readonly<Record<string, MobHandVfx>> = {
  shiv,
  sand_in_the_eyes: sandInTheEyes,
  chiefs_cleaver: chiefsCleaver,
  toll_sweep: tollSweep,
  hold_the_tower: holdTheTower,
  billhook,
  peat_smoke: peatSmoke,
  scatter_quarrels: scatterQuarrels,
  crossbow_bolt: crossbowBolt,
  cudgel,
  hamstring,
  poachers_shot: poachersShot,
  tainted_bait: taintedBait,
};
