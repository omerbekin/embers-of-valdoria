/**
 * MUHAFIZLAR / DERİNLİKLER / TARİKAT (taş, çelik, kristal; büyülü kısımlar Glyph gibi ölçülü):
 *   Gatestone Slam (Stonebound Warden): oyma kapı taşı hedefin ayağına çakılır; şok tozu halkası, yayılan çatlaklar, savrulan taş;
 *     taş yerinde (Ömer: "sona doğru yukarı çıkıyor" olmasın) çatlayıp moloza döner ve söner.
 *   Rockfall (Stonebound Warden): sıranın her hücresine gökten kayalar düşer (toz izli); çarpınca parçalanır, toz bulutu, çatlak.
 *   Pick of the Deep (Thane of the Deep): madenci kazması tepeden iner, ağzında derin mavi rün çizgisi; zırh / taş kırıntısı, az mavi kıvılcım.
 *   Oath of Stone (Thane): çevresinde yerden yükselen mavi kristal sütunlar ve taş parçaları, rün halkası; vuruşta kilitlenir (nabız),
 *     sonunda yere geri gömülür (küçülmez, uçmaz).
 *   Shield Wall (Thane, dost): dostun önünde yerden yükselen üç yarı saydam çelik kule kalkanı; vuruşta kenetlenir (çınlama halkası).
 *   Rune Spark (Deep Runecaller): dönen camgöbeği rün baklavası hedefin yakın kenarına çarpar; kristal kırıklarına dağılır, ince ışın, halka.
 *   Shield Bash (Shieldwarden / Cinder Gatewarden): yuvarlak kalkan öne savrulup çarpar; dikey şok tozu, tahta / demir kırıntısı.
 *   Hold the Line (Shieldwarden): önünde yerden yükselen büyük çelik kalkan amblemi; vuruşta yere çakılır (toz, çatlak), mavi halka.
 *   Penance Flail (Oathsworn Brother): dikenli demir gülle zincirle döner ve hedefin ayağına iner; çatlak, toz halkası, soluk altın kıvılcım;
 *     başta atanın kefaret kanı (bedel) birkaç damla.
 *   Sanctuary (Oathsworn Brother, dost): dostun başının üstünde (Ömer: biraz yukarı) beliren tunç çan sallanır ve çalar: altın ses
 *     halkaları, yere inen ışık perdesi, zemin halkası, zerreler.
 */
import type { MobHandVfx } from '../mob-vfx';
import { C, FLAT, TAU, UP, after, bits, clamp01, ei, eo, layer, layers, lerp, puffs, smoke, spray, type CombatantView, type G, type Pt, type VfxCtx, type VfxKit } from './core';
import { chain, crackPath, drawCrack, poly, sagLine, taper, xf } from './draw';
import { fly } from './bolts';
import { area, aura, bolt, melee } from './flow';
import { motes, rays, ringFx, sigilFx, spiralFx } from './magic';
import { DUST, GORE, IRON, STEEL, STONE, bodyAt, cellDepth, dust, gore, pick, rubble, shockRing, sparks, splinters, swing } from './phys';

const hurt = (c: VfxCtx, v: CombatantView): boolean => !c.usage || c.usage.damages.some((d) => d.target === v.combatant.uid && d.amount > 0);
const dirTo = (c: VfxCtx, v: CombatantView | Pt): number => (('container' in v ? v.container.x : v.x) >= c.actor.container.x ? 1 : -1);

// ---------------------------------------------------------------------------------------------------------------------
// GATESTONE SLAM

function gatestone(g: G, p: Pt, W: number, H: number, a: number, crack: number): void {
  // ön yüz + üst yüz (perspektif), oyma rün, kenar aşınması
  const x0 = p.x - W / 2;
  const top = p.y - H;
  g.fillStyle(C('#2a2622'), a).fillRect(x0 - 3, top - 3, W + 6, H + 3);
  g.fillStyle(C('#5a544c'), a).fillRect(x0, top, W, H);
  g.fillStyle(C('#6e675e'), a).fillPoints([{ x: x0, y: top }, { x: x0 + 14, y: top - 12 }, { x: x0 + W + 14, y: top - 12 }, { x: x0 + W, y: top }], true);
  g.fillStyle(C('#3e3933'), a).fillPoints([{ x: x0 + W, y: top }, { x: x0 + W + 14, y: top - 12 }, { x: x0 + W + 14, y: p.y - 12 }, { x: x0 + W, y: p.y }], true);
  g.lineStyle(3, C('#2a2622'), a).strokeRect(x0 + W * 0.2, top + H * 0.18, W * 0.6, H * 0.64);
  g.lineStyle(2.4, C('#2e2a26'), a).lineBetween(p.x, top + H * 0.26, p.x, top + H * 0.74);
  g.lineBetween(p.x - W * 0.18, top + H * 0.4, p.x + W * 0.18, top + H * 0.4);
  if (crack > 0) {
    g.lineStyle(2.4, C('#141210'), a).strokePoints(
      [
        { x: x0 + W * 0.3, y: top },
        { x: x0 + W * 0.42, y: top + H * 0.3 * crack },
        { x: x0 + W * 0.36, y: top + H * 0.6 * crack },
        { x: x0 + W * 0.5, y: top + H * crack },
      ],
      false,
    );
    g.lineStyle(2, C('#141210'), a).strokePoints([{ x: x0 + W, y: top + H * 0.3 }, { x: x0 + W * (1 - 0.3 * crack), y: top + H * 0.5 }], false);
  }
}

function gatestoneOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const foot = k.feet(v);
  const dir = dirTo(c, v);
  const P = { x: foot.x - dir * (v.w * 0.5 + 30), y: foot.y + 4 }; // hedefin önüne (saldırgan tarafına) çakılır: gövdeyi örtmez
  const W = 78;
  const H = 96;
  const FALL = Math.max(T, k.slow(110));
  const t0 = T - FALL;
  const HOLD = k.slow(260);
  const OUT = k.slow(240);
  const cracks = Array.from({ length: 6 }, (_, i) => crackPath(k, P, { x: P.x + Math.cos((i / 6) * TAU + 0.2) * k.rnd(90, 150), y: P.y + Math.sin((i / 6) * TAU + 0.2) * k.rnd(90, 150) * FLAT }, 10, 0.4));
  layer(c, T + HOLD + OUT + k.slow(500), k.FLOOR_FX + 3, (g, tm) => {
    if (tm < T) return;
    const t = tm - T;
    const grow = eo(t / k.slow(110), 2);
    const al = 1 - clamp01((t - HOLD - OUT) / k.slow(500));
    g.fillStyle(C('#120e0a'), 0.5 * al).fillEllipse(P.x, P.y, 150 * grow, 44 * grow);
    for (const cr of cracks) drawCrack(g, cr, grow, al, 4, C('#120e0a'), C('#6a5a48'), C('#d0701a'), 0.5 * al * Math.exp(-t / k.slow(300)));
  });
  layer(c, T + HOLD + OUT, v.container.depth + 2, (g, tm) => {
    if (tm < t0) return;
    let y: number;
    let a = 1;
    let crack = 0;
    if (tm < T) {
      const q = (tm - t0) / FALL;
      y = P.y - 320 * (1 - ei(q, 2.2));
      a = clamp01(q * 5);
    } else {
      const t = tm - T;
      y = P.y + 10 * eo(t / k.slow(60)) + 3 * Math.exp(-t / k.slow(40)) * Math.sin(t / k.slow(10)); // gömülür, kısa titrer, aynı yerde kalır
      crack = eo(t / k.slow(160));
      a = 1 - clamp01((t - HOLD) / OUT);
    }
    // gölge
    g.fillStyle(0x000000, 0.3 * a * clamp01(1 - (P.y - y) / 320)).fillEllipse(P.x, P.y, W * 1.2, 20);
    gatestone(g, { x: P.x, y }, W, H, a, crack);
  });
  after(c, T, () => {
    shockRing(c, k, P, 170, k.FLOOR_FX + 4, { flat: FLAT, col: '#b8a890', a: 0.55, dur: 360, w: 7 });
    dust(c, k, P, v.container.depth + 3, { n: 8, w: 110, a: 0.42 });
    rubble(c, k, { x: P.x, y: P.y - 4 }, 12, v.container.depth + 3, { cols: STONE, rim: '#8a8478', sp: [220, 520], size: [5, 12] });
    if (hurt(c, v)) gore(c, k, bodyAt(k, v, dir, 0, 0.3), UP, 6, v.container.depth + 4, { sp: [80, 200] });
  });
  // sonunda moloza döner: taş parçaları yere dökülür
  after(c, T + HOLD, () => rubble(c, k, { x: P.x, y: P.y - 30 }, 8, v.container.depth + 3, { cols: STONE, sp: [60, 160], size: [6, 12], spread: 1.4 }));
}
const gatestoneSlam: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => gatestoneOn(c, k, v, T), { shake: [150, 0.0048] });

// ---------------------------------------------------------------------------------------------------------------------
// ROCKFALL

function rockShapeAt(g: G, p: Pt, s: number, rot: number, a: number, pts: Pt[]): void {
  const f = xf(p, rot);
  const P = pts.map((q) => f(q.x * s, q.y * s));
  g.fillStyle(C('#3a3532'), a).fillPoints(P, true);
  g.fillStyle(C('#5c5650'), a).fillPoints(P.slice(0, Math.ceil(P.length / 2) + 1).concat([f(0, 0)]), true);
  g.lineStyle(2, C('#1e1a18'), a).strokePoints(P, true);
  g.lineStyle(1.6, C('#8a8478'), a * 0.6).strokePoints(P.slice(0, Math.ceil(P.length / 2)), false);
}

function rockfall(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return area(c, k, hitMs, '#c08a3a', (a) => {
    for (const st of a.stages)
      for (const p of st.cells) {
        for (let i = 0; i < 3; i++) {
          const big = i === 0;
          const land = big ? { x: p.x, y: p.y } : { x: p.x + k.rnd(-40, 40), y: p.y + k.rnd(-12, 12) };
          const at = st.at - (big ? 0 : k.slow(k.rnd(30, 90)));
          const F = Math.min(at, k.slow(360));
          const s = big ? k.rnd(44, 52) : k.rnd(16, 24);
          const n = 7;
          const shape = Array.from({ length: n }, (_, j) => ({ x: Math.cos((j / n) * TAU) * k.rnd(0.7, 1), y: Math.sin((j / n) * TAU) * k.rnd(0.65, 1) }));
          const vr = k.rnd(-4, 4);
          after(c, at - F, () =>
            fly(c, k, {
              from: { x: land.x + k.rnd(-40, 40), y: land.y - k.rnd(560, 640) },
              to: { x: land.x, y: land.y - s * 0.6 },
              F,
              ease: 1.7,
              hist: 6,
              depth: cellDepth(land, 3),
              draw: (g, pp, _an, q, tm, hist) => {
                taper(g, [...hist].reverse(), 0, s * 1.4, C('#8a7a68'), 0.18);
                g.fillStyle(0x000000, 0.25 * q).fillEllipse(land.x, land.y, s * 2.4 * (0.5 + 0.5 * q), s * 0.7 * (0.5 + 0.5 * q));
                rockShapeAt(g, pp, s, vr * (tm / 1000), 1, shape);
              },
            }),
          );
          after(c, at, () => {
            rubble(c, k, land, big ? 10 : 4, cellDepth(land, 4), { cols: STONE, rim: '#8a8478', sp: big ? [200, 480] : [120, 300], size: big ? [6, 13] : [3, 7] });
            if (big) {
              dust(c, k, land, cellDepth(land, 3), { n: 6, w: 80, a: 0.4 });
              shockRing(c, k, land, 110, k.FLOOR_FX + 4, { flat: FLAT, col: '#a89884', a: 0.45, dur: 320 });
              const cr = Array.from({ length: 4 }, (_, j) => crackPath(k, land, { x: land.x + Math.cos((j / 4) * TAU + 0.5) * 80, y: land.y + Math.sin((j / 4) * TAU + 0.5) * 80 * FLAT }, 8, 0.4));
              layer(c, k.slow(1000), k.FLOOR_FX + 3, (g, tm) => {
                const q = tm / k.slow(1000);
                for (const c0 of cr) drawCrack(g, c0, eo(q / 0.12, 2), 1 - clamp01((q - 0.5) / 0.5), 3.5, C('#120e0a'), C('#6a5a48'));
              });
            }
          });
        }
        for (const v of st.victims) if (hurt(c, v)) after(c, st.at, () => gore(c, k, k.spot(v), UP, 7, v.container.depth + 4, { sp: [80, 220] }));
      }
    after(c, a.at, () => k.shake(c.scene, 140, 0.0042));
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// PICK OF THE DEEP

function pickOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = dirTo(c, v);
  const R = 150;
  const hitP = bodyAt(k, v, dir, -0.2, -0.2);
  const a1 = 0.55;
  const P = { x: hitP.x - dir * Math.cos(a1) * R * 0.95 - dir * 10, y: hitP.y - Math.sin(a1) * R * 0.95 - 50 };
  swing(c, k, {
    P,
    R,
    dir,
    a0: -2.0,
    a1,
    T,
    ease: 2.2,
    hold: k.slow(130),
    pull: k.slow(180),
    back: -0.45,
    depth: v.container.depth + 3,
    trail: { r0: 0.8, r1: 1.25, col: '#3a5a9a', a: 0.5, span: 0.85 },
    draw: (g, f, a, ang) => pick(g, f, R, a, ang, 1),
  });
  after(c, T, () => {
    rubble(c, k, hitP, 6, v.container.depth + 4, { cols: ['#4a4a52', '#5a5a64', '#3a3a42'], sp: [140, 320], size: [3, 7], lean: -dir * 0.4 });
    sparks(c, k, hitP, 6, v.container.depth + 4, dir > 0 ? [-Math.PI, -Math.PI / 2] : [-Math.PI / 2, 0], ['#8ac8ff', '#c8e8ff', '#5a9aff']);
    layer(
      c,
      k.slow(300),
      v.container.depth + 4,
      (g, tm) => {
        const q = tm / k.slow(300);
        rays(g, hitP, 6, 40 + 30 * q, 4, C('#2a5ab0'), C('#c8e8ff'), (1 - q) ** 1.5, 0.3);
      },
      true,
    );
    shockRing(c, k, hitP, 50, v.container.depth + 4, { flat: 0.6, col: '#8aa8d0', a: 0.4 });
    if (hurt(c, v)) gore(c, k, hitP, UP + dir * 0.5, 10, v.container.depth + 4, { sp: [100, 280] });
  });
}
const pickOfTheDeep: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => pickOn(c, k, v, T), { shake: [110, 0.0034] });

// ---------------------------------------------------------------------------------------------------------------------
// OATH OF STONE: kristal sütunlar

/** Kristal prizma (taban p, boy h, en w): ön yüz koyu mavi, açık kenar, sivri uç; yarı saydam. */
function crystal(g: G, p: Pt, h: number, w: number, lean: number, a: number, glow: number): void {
  const tip = { x: p.x + lean * h, y: p.y - h };
  const sh = { x: p.x + lean * h * 0.8, y: p.y - h * 0.8 };
  const L = [{ x: p.x - w / 2, y: p.y }, { x: sh.x - w / 2, y: sh.y }, tip, { x: sh.x + w / 2, y: sh.y }, { x: p.x + w / 2, y: p.y }];
  g.fillStyle(C('#0e2a5a'), 0.7 * a).fillPoints(L, true);
  g.fillStyle(C('#2a6ad0'), 0.55 * a).fillPoints([{ x: p.x, y: p.y }, { x: sh.x, y: sh.y }, tip, { x: sh.x + w / 2, y: sh.y }, { x: p.x + w / 2, y: p.y }], true);
  g.lineStyle(1.6, C('#a8d8ff'), (0.6 + 0.4 * glow) * a).strokePoints([{ x: p.x - w / 2, y: p.y }, { x: sh.x - w / 2, y: sh.y }, tip], false);
  g.lineStyle(1.2, C('#5a9aff'), 0.7 * a).lineBetween(p.x, p.y, sh.x, sh.y);
}

function oathOn(c: VfxCtx, k: VfxKit, v: CombatantView, at: number): void {
  const foot = k.feet(v);
  const R = Math.max(90, v.w * 0.75);
  const n = 9;
  const items = Array.from({ length: n }, (_, i) => ({ an: (i / n) * TAU + k.rnd(-0.15, 0.15), h: k.rnd(60, 120), w: k.rnd(16, 26), lean: k.rnd(-0.18, 0.18), lag: k.rnd(0, 0.35), rock: i % 3 === 1 }));
  const t0 = Math.max(0, at - k.slow(360));
  const HOLD = k.slow(480);
  const SINK = k.slow(360);
  const END = at + HOLD + SINK;
  sigilFx(c, k, foot, R * 1.15, { col: C('#3a8aff'), pale: C('#c8e8ff'), deep: C('#0e2a6a'), ticks: 12, inner: 'diamond', arcs: 3, peak: at, end: END, spin: 0.7 });
  layers(c, END, [{ depth: v.container.depth - 1 }, { depth: v.container.depth + 2 }], ([back, front], tm) => {
    if (tm < t0) return;
    const q = clamp01((tm - t0) / (at - t0));
    const glow = tm >= at ? Math.exp(-(tm - at) / k.slow(220)) : 0;
    const sink = clamp01((tm - at - HOLD) / SINK); // sonunda yere gömülür
    for (const it of [...items].sort((p1, p2) => Math.sin(p1.an) - Math.sin(p2.an))) {
      const g = Math.sin(it.an) < 0 ? back! : front!;
      const u = eo(clamp01((q - it.lag) / (1 - it.lag)), 2.6) * (1 - ei(sink, 1.6));
      if (u <= 0.01) continue;
      const b = { x: foot.x + Math.cos(it.an) * R, y: foot.y + Math.sin(it.an) * R * FLAT };
      if (it.rock) {
        const s = it.w * 0.9 * u;
        g.fillStyle(C('#3a3532'), 1).fillPoints([{ x: b.x - s, y: b.y }, { x: b.x - s * 0.7, y: b.y - s * 1.2 }, { x: b.x + s * 0.4, y: b.y - s * 1.4 }, { x: b.x + s, y: b.y - s * 0.4 }, { x: b.x + s * 0.9, y: b.y }], true);
        g.lineStyle(1.4, C('#6a645e'), 0.8).lineBetween(b.x - s * 0.7, b.y - s * 1.2, b.x + s * 0.4, b.y - s * 1.4);
      } else crystal(g, b, it.h * u, it.w, it.lean, 1, glow);
    }
  });
  spiralFx(c, k, foot, v.container.depth, { H: v.h * 1.1, R: R * 0.9, at: at - k.slow(100), dur: 700, cols: ['#0e2a6a', '#3a8aff', '#c8e8ff'], w: 6, a: 0.6 });
  after(c, t0, () => dust(c, k, foot, v.container.depth + 3, { n: 4, w: R, a: 0.24, rise: 30 }));
  after(c, at, () => {
    rubble(c, k, foot, 8, v.container.depth + 3, { cols: STONE, sp: [100, 260], size: [3, 8], jx: R * 0.8 });
    motes(c, k, foot, { n: 12, r: R, rise: v.h, cols: ['#5a9aff', '#c8e8ff'], size: [1.6, 2.6], life: 800, depth: v.container.depth + 3 });
    k.shake(c.scene, 100, 0.003);
  });
  after(c, at + HOLD, () => dust(c, k, foot, v.container.depth + 3, { n: 5, w: R * 1.2, a: 0.28, rise: 20 }));
}
const oathOfStone: MobHandVfx = (c, k, hitMs) => aura(c, k, hitMs, '#3aa0ff', (v, at) => oathOn(c, k, v, at), true);

// ---------------------------------------------------------------------------------------------------------------------
// SHIELD WALL (dost) / HOLD THE LINE (kendi)

/** Kule kalkanı (yüzden): üstte düz, altta sivri; çelik çerçeve, perçin, ortada dikey kabartma; yarı saydam büyü çeliği. */
function towerShield(g: G, p: Pt, W: number, H: number, a: number, glint: number, solid = 0.5): void {
  const pts = [
    { x: p.x - W / 2, y: p.y - H },
    { x: p.x + W / 2, y: p.y - H },
    { x: p.x + W / 2, y: p.y - H * 0.3 },
    { x: p.x, y: p.y },
    { x: p.x - W / 2, y: p.y - H * 0.3 },
  ];
  g.fillStyle(C('#1a2a40'), solid * a).fillPoints(pts, true);
  g.fillStyle(C('#5a7aa8'), solid * 0.55 * a).fillPoints(pts.map((q) => ({ x: p.x + (q.x - p.x) * 0.84, y: p.y - H * 0.5 + (q.y - p.y + H * 0.5) * 0.86 })), true);
  g.lineStyle(5, C('#2a3a54'), a).strokePoints(pts, true);
  g.lineStyle(1.6, C('#c8dcf0'), (0.5 + 0.5 * glint) * a).strokePoints([pts[4]!, pts[0]!, pts[1]!], false);
  g.lineStyle(3, C('#8aa8d0'), 0.7 * a).lineBetween(p.x, p.y - H * 0.92, p.x, p.y - H * 0.1);
  for (const q of [pts[0]!, pts[1]!, { x: p.x - W * 0.42, y: p.y - H * 0.4 }, { x: p.x + W * 0.42, y: p.y - H * 0.4 }]) {
    g.fillStyle(C('#2a3a54'), a).fillCircle(q.x + (q.x < p.x ? 6 : -6), q.y + 7, 3.4);
    g.fillStyle(C('#c8dcf0'), a * 0.8).fillCircle(q.x + (q.x < p.x ? 5 : -7), q.y + 6, 1.2);
  }
  if (glint > 0.02) g.lineStyle(2.4, 0xffffff, 0.6 * glint * a).lineBetween(p.x - W * 0.3, p.y - H * 0.85, p.x - W * 0.05, p.y - H * 0.55);
}

function shieldRise(c: VfxCtx, k: VfxKit, v: CombatantView, at: number, o: { n: number; W: number; H: number; spread: number; front: number; slam?: boolean }): void {
  const foot = k.feet(v);
  const dir = c.foes?.[0] ? (c.foes[0].container.x >= v.container.x ? 1 : -1) : v.combatant.side === 'enemy' ? -1 : 1;
  const t0 = Math.max(0, at - k.slow(320));
  const HOLD = k.slow(520);
  const OUT = k.slow(380);
  const END = at + HOLD + OUT;
  const list = Array.from({ length: o.n }, (_, i) => ({ off: (i - (o.n - 1) / 2) * o.spread, lag: Math.abs(i - (o.n - 1) / 2) * 0.12 }));
  layer(c, END, v.container.depth + 2, (g, tm) => {
    if (tm < t0) return;
    const q = clamp01((tm - t0) / (at - t0));
    const glint = tm >= at ? Math.exp(-(tm - at) / k.slow(180)) : 0;
    const a = 1 - clamp01((tm - at - HOLD) / OUT);
    for (const s of list) {
      const u = o.slam ? (tm < at ? eo(clamp01((q - s.lag) / (1 - s.lag)), 2) : 1) : eo(clamp01((q - s.lag) / (1 - s.lag)), 2.4);
      const base = { x: foot.x + dir * o.front + s.off * 0.25, y: foot.y + 4 + s.off * 0.5 };
      const lift = o.slam ? (1 - u) * -60 + (tm >= at ? 4 * Math.exp(-(tm - at) / k.slow(40)) : 0) : 0;
      const Hh = o.H * (o.slam ? 1 : u);
      if (Hh < 4) continue;
      towerShield(g, { x: base.x, y: base.y + lift }, o.W, Hh, a * clamp01(u * 2), glint, 0.55);
    }
  });
  sigilFx(c, k, foot, Math.max(80, v.w * 0.8), { col: C('#5a8ad0'), pale: C('#d8e8ff'), deep: C('#1a2a50'), ticks: 10, inner: 'none', arcs: 3, peak: at, end: END });
  after(c, at, () => {
    ringFx(c, k, { x: foot.x + dir * o.front, y: foot.y - o.H * 0.5 }, { r0: 20, r1: 110, dur: 360, col: '#5a8ad0', pale: '#e8f0ff', w: 4, flat: 1.4, depth: v.container.depth + 3, a: 0.7 });
    sparks(c, k, { x: foot.x + dir * o.front, y: foot.y - o.H * 0.6 }, 5, v.container.depth + 3, [-Math.PI, 0], ['#e8f0ff', '#a8c8f0']);
    if (o.slam) {
      dust(c, k, { x: foot.x + dir * o.front, y: foot.y }, v.container.depth + 3, { n: 6, w: o.W, a: 0.36 });
      const cr = Array.from({ length: 4 }, (_, j) => crackPath(k, { x: foot.x + dir * o.front, y: foot.y }, { x: foot.x + dir * o.front + Math.cos(j * 1.6 + 0.4) * 80, y: foot.y + Math.sin(j * 1.6 + 0.4) * 80 * FLAT }, 8, 0.4));
      layer(c, k.slow(900), k.FLOOR_FX + 3, (g, tm) => {
        const q2 = tm / k.slow(900);
        for (const c0 of cr) drawCrack(g, c0, eo(q2 / 0.12, 2), 1 - clamp01((q2 - 0.5) / 0.5), 3.5, C('#120e0a'), C('#6a5a48'));
      });
      k.shake(c.scene, 110, 0.0034);
    }
  });
}
const shieldWall: MobHandVfx = (c, k, hitMs) => aura(c, k, hitMs, '#7fb8e8', (v, at) => shieldRise(c, k, v, at, { n: 3, W: 62, H: 150, spread: 70, front: v.w * 0.42 }));
const holdTheLine: MobHandVfx = (c, k, hitMs) => aura(c, k, hitMs, '#b9c8dc', (v, at) => shieldRise(c, k, v, at, { n: 1, W: 120, H: 230, spread: 0, front: v.w * 0.5, slam: true }), true);

// ---------------------------------------------------------------------------------------------------------------------
// RUNE SPARK

function runeSpark(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  return bolt(c, k, hitMs, '#4fe3ff', (v, F) => {
    const dir = dirTo(c, v);
    const to = k.contact(c.actor, v, bodyAt(k, v, dir, 0, -0.12));
    const from = { x: k.spot(c.actor).x + dir * c.actor.w * 0.35, y: k.spot(c.actor).y - 20 };
    fly(c, k, {
      from,
      to,
      F,
      arc: 24,
      hist: 10,
      depth: v.container.depth + 3,
      draw: (g, p, _an, q, tm, hist) => {
        taper(g, [...hist].reverse(), 0, 12, C('#1a7fa8'), 0.4);
        for (let i = 2; i < hist.length; i += 2) g.fillStyle(C('#9ff3ff'), (1 - i / hist.length) * 0.8).fillCircle(hist[i]!.x + Math.sin(i * 2) * 4, hist[i]!.y + Math.cos(i * 2) * 4, 2);
        const s = 14 + 4 * q;
        const rot = tm / 60;
        const f = xf(p, rot);
        const d = poly(f, [[0, -s * 1.25], [s, 0], [0, s * 1.25], [-s, 0]]);
        g.fillStyle(C('#0e3a4a'), 0.85).fillPoints(d, true);
        g.fillStyle(C('#2fd8ff'), 0.6).fillPoints(poly(f, [[0, -s * 0.8], [s * 0.6, 0], [0, s * 0.8], [-s * 0.6, 0]]), true);
        g.lineStyle(2, C('#bff6ff'), 1).strokePoints(d, true);
        g.lineStyle(1.2, C('#bff6ff'), 0.6).strokeEllipse(p.x, p.y, s * 3.2, s * 1.2);
      },
    });
    after(c, F, () => {
      spray(c, k, bits(k, 10, to, { kind: 'shard', ang: dir > 0 ? [Math.PI - 1.2, Math.PI + 1.2] : [-1.2, 1.2], sp: [160, 380], size: [5, 10], life: [420, 640], cols: ['#2a2624', '#3a3430', '#4a423a'], rim: '#7fe9ff', jx: 8, jy: 10, up: [40, 120], vr: 9 }), v.container.depth + 4, 1200);
      layer(
        c,
        k.slow(300),
        v.container.depth + 4,
        (g, tm) => {
          const q = tm / k.slow(300);
          rays(g, to, 4, 60 + 30 * q, 6, C('#1aa8d8'), C('#e0fbff'), (1 - q) ** 1.4, 0);
          g.fillStyle(C('#2fd8ff'), 0.25 * (1 - q)).fillCircle(to.x, to.y, 30 + 20 * q);
        },
        true,
      );
      ringFx(c, k, to, { r0: 10, r1: 70, dur: 300, col: '#1aa8d8', pale: '#bff6ff', w: 4, flat: 1, depth: v.container.depth + 4 });
      if (hurt(c, v)) gore(c, k, to, UP - dir * 0.5, 5, v.container.depth + 4, { sp: [80, 200] });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// SHIELD BASH

function shieldBashOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = dirTo(c, v);
  const hitP = bodyAt(k, v, dir, -0.55, 0.15);
  const W = 70;
  const H = 128;
  const t0 = T - Math.min(T, k.slow(150));
  const OUT = k.slow(220);
  // kalkanın darbe hareketi: atanın kendi kalkanının önünde, hedefe savrulan yarı saydam kalkan izi + iki ard görüntü (ağır itiş)
  const posAt = (tm: number): Pt => {
    if (tm < T) {
      const q = (tm - t0) / (T - t0);
      return { x: hitP.x - dir * 120 * (1 - ei(q, 2.2)), y: hitP.y };
    }
    const t = tm - T;
    return { x: hitP.x - dir * 30 * eo(t / OUT) + dir * 5 * Math.exp(-t / k.slow(30)), y: hitP.y };
  };
  layer(c, T + OUT, v.container.depth + 3, (g, tm) => {
    if (tm < t0) return;
    const fade = tm < T ? clamp01((tm - t0) / k.slow(40)) : 1 - clamp01((tm - T) / OUT);
    if (tm < T)
      for (const [lag, aa] of [
        [k.slow(40), 0.12],
        [k.slow(20), 0.2],
      ] as Array<[number, number]>) {
        const pp = posAt(Math.max(t0, tm - lag));
        towerShield(g, { x: pp.x, y: pp.y + H * 0.5 }, W, H, aa * fade, 0, 0.35);
      }
    const p = posAt(tm);
    towerShield(g, { x: p.x, y: p.y + H * 0.5 }, W, H, 0.6 * fade, tm >= T ? Math.exp(-(tm - T) / k.slow(100)) : 0, 0.4);
    if (tm < T) for (let i = -1; i <= 1; i++) g.lineStyle(1.6, C('#b8b0a8'), 0.3 * fade).lineBetween(p.x - dir * (W * 0.6 + 50), p.y + i * 30, p.x - dir * W * 0.6, p.y + i * 30);
  });
  after(c, T, () => {
    shockRing(c, k, hitP, 80, v.container.depth + 4, { flat: 1.3, col: '#c8d4e0', a: 0.5, w: 6 });
    smoke(c, k, puffs(k, hitP, 4, { hex: DUST, sx: 10, sy: 30, vx: [dir * 40, dir * 140], vy: [-30, 30], s0: [30, 44], s1: [70, 100], life: [420, 620], a: 0.28, drag: 2.4 }), v.container.depth + 3);
    splinters(c, k, hitP, UP - dir * 0.8, 5, v.container.depth + 4, ['#5a3e26', '#664830', '#3a2a1c'], [4, 8]);
    sparks(c, k, hitP, 5, v.container.depth + 4, dir > 0 ? [Math.PI - 1, Math.PI + 1] : [-1, 1], ['#e8f0ff', '#a8c8f0', '#ffffff']);
    if (hurt(c, v)) gore(c, k, bodyAt(k, v, dir, 0, -0.1), UP + dir * 0.6, 7, v.container.depth + 4, { sp: [100, 260] });
  });
}
const shieldBash: MobHandVfx = (c, k, hitMs) => melee(c, k, hitMs, (v, T) => shieldBashOn(c, k, v, T), { shake: [120, 0.0038] });

// ---------------------------------------------------------------------------------------------------------------------
// PENANCE FLAIL

function flailBall(g: G, p: Pt, r: number, a: number, rot: number): void {
  for (let i = 0; i < 8; i++) {
    const an = rot + (i * TAU) / 8;
    const tip = { x: p.x + Math.cos(an) * r * 1.6, y: p.y + Math.sin(an) * r * 1.6 };
    g.fillStyle(IRON.dark, a).fillTriangle(p.x + Math.cos(an - 0.35) * r, p.y + Math.sin(an - 0.35) * r, p.x + Math.cos(an + 0.35) * r, p.y + Math.sin(an + 0.35) * r, tip.x, tip.y);
  }
  g.fillStyle(IRON.dark, a).fillCircle(p.x, p.y, r + 2);
  g.fillStyle(IRON.body, a).fillCircle(p.x, p.y, r);
  g.fillStyle(IRON.mid, a).fillCircle(p.x - r * 0.3, p.y - r * 0.3, r * 0.45);
  g.fillStyle(STEEL.glint, a * 0.5).fillCircle(p.x - r * 0.38, p.y - r * 0.38, r * 0.14);
}

function flailOn(c: VfxCtx, k: VfxKit, v: CombatantView, T: number): void {
  const dir = dirTo(c, v);
  const foot = k.feet(v);
  const G0 = { x: foot.x - dir * v.w * 0.3, y: foot.y - 14 };
  const hand = { x: c.actor.container.x + dir * c.actor.w * 0.4, y: c.actor.container.y - c.actor.h * 0.55 };
  const SW = Math.min(T, k.slow(220));
  const t0 = T - SW;
  const HOLD = k.slow(160);
  const OUT = k.slow(240);
  layer(c, T + HOLD + OUT, Math.max(v.container.depth, c.actor.container.depth) + 3, (g, tm) => {
    if (tm < t0) return;
    let ball: Pt;
    let a = 1;
    if (tm < T) {
      // başın üstünden geniş yayla yere iner
      const q = ei((tm - t0) / SW, 1.8);
      const an = lerp(-Math.PI * 0.95, -0.15, q);
      const L = Math.hypot(G0.x - hand.x, G0.y - hand.y);
      const base = Math.atan2(G0.y - hand.y, G0.x - hand.x);
      const A = dir > 0 ? base + (an + 0.15) : base - (an + 0.15);
      ball = { x: hand.x + Math.cos(A) * L, y: hand.y + Math.sin(A) * L };
      a = clamp01((tm - t0) / k.slow(40));
    } else {
      const t = tm - T;
      ball = { x: G0.x, y: G0.y + 4 * Math.exp(-t / k.slow(40)) };
      a = 1 - clamp01((t - HOLD) / OUT);
    }
    const pts = sagLine(hand, ball, tm < T ? -10 : 26, 12);
    chain(g, pts, 11, 5.5, IRON.body, IRON.dark, IRON.edge, a);
    flailBall(g, ball, 15, a, tm / 120);
  });
  after(c, T, () => {
    shockRing(c, k, G0, 120, k.FLOOR_FX + 4, { flat: FLAT, col: '#c8b890', a: 0.5, dur: 340 });
    dust(c, k, G0, v.container.depth + 2, { n: 6, w: 80, a: 0.38 });
    rubble(c, k, G0, 9, v.container.depth + 3, { sp: [180, 420], size: [4, 9] });
    sparks(c, k, G0, 7, v.container.depth + 3, [-Math.PI + 0.3, -0.3], ['#ffd890', '#f0c060', '#fff0c8']);
    const cr = Array.from({ length: 5 }, (_, j) => crackPath(k, G0, { x: G0.x + Math.cos(j * 1.3 + 0.2) * k.rnd(60, 110), y: G0.y + Math.sin(j * 1.3 + 0.2) * k.rnd(60, 110) * FLAT }, 8, 0.4));
    layer(c, k.slow(900), k.FLOOR_FX + 3, (g, tm) => {
      const q = tm / k.slow(900);
      for (const c0 of cr) drawCrack(g, c0, eo(q / 0.1, 2), 1 - clamp01((q - 0.5) / 0.5), 3.5, C('#120e0a'), C('#6a5a48'), C('#e0b050'), 0.4 * Math.exp(-q * 5));
    });
    if (hurt(c, v)) gore(c, k, bodyAt(k, v, dir, 0, 0.4), UP, 8, v.container.depth + 4, { sp: [80, 220] });
  });
}
function penanceFlail(c: VfxCtx, k: VfxKit, hitMs: number): Promise<void> {
  // kefaret bedeli: atanın gövdesinden birkaç koyu damla (MEVCUT canın %8'i)
  const b = k.spot(c.actor);
  spray(c, k, bits(k, 5, { x: b.x, y: b.y - 10 }, { kind: 'drop', ang: [Math.PI * 0.35, Math.PI * 0.65], sp: [20, 70], size: [2.5, 4], life: [600, 900], cols: GORE, jx: 16, jy: 20, floor: k.feet(c.actor).y }), c.actor.container.depth + 2, 900);
  return melee(c, k, hitMs, (v, T) => flailOn(c, k, v, T), { shake: [130, 0.004] });
}

// ---------------------------------------------------------------------------------------------------------------------
// SANCTUARY: tunç çan

function bell(g: G, p: Pt, s: number, swingA: number, a: number, shine: number): void {
  const f = xf(p, swingA + Math.PI / 2); // +x aşağı (asılı)
  const body = poly(f, [[0, -s * 0.28], [s * 0.18, -s * 0.34], [s * 0.6, -s * 0.4], [s * 0.95, -s * 0.62], [s * 1.02, -s * 0.66], [s * 1.02, s * 0.66], [s * 0.95, s * 0.62], [s * 0.6, s * 0.4], [s * 0.18, s * 0.34], [0, s * 0.28]]);
  g.fillStyle(C('#4a2e10'), a).fillPoints(body, true);
  g.fillStyle(C('#a8742a'), a).fillPoints(poly(f, [[s * 0.04, -s * 0.22], [s * 0.6, -s * 0.33], [s * 0.94, -s * 0.54], [s * 0.94, -s * 0.1], [s * 0.04, -s * 0.05]]), true);
  g.fillStyle(C('#e0b050'), a * (0.5 + 0.5 * shine)).fillPoints(poly(f, [[s * 0.1, -s * 0.18], [s * 0.6, -s * 0.28], [s * 0.88, -s * 0.44], [s * 0.88, -s * 0.34], [s * 0.1, -s * 0.12]]), true);
  g.lineStyle(3, C('#2a1a08'), a).strokePoints(body, true);
  const lip0 = f(s * 1.0, -s * 0.66);
  const lip1 = f(s * 1.0, s * 0.66);
  g.lineStyle(6, C('#6a4418'), a).lineBetween(lip0.x, lip0.y, lip1.x, lip1.y);
  g.lineStyle(2, C('#f0c870'), a * 0.8).lineBetween(f(s * 0.7, -s * 0.44).x, f(s * 0.7, -s * 0.44).y, f(s * 0.7, s * 0.44).x, f(s * 0.7, s * 0.44).y);
  // dil (tokmak)
  const cl = f(s * 1.06, Math.sin(swingA * 2.2) * s * 0.18);
  g.fillStyle(C('#2a1a08'), a).fillCircle(cl.x, cl.y, s * 0.1);
  // askı halkası
  const top = f(-s * 0.08, 0);
  g.lineStyle(4, C('#3a2410'), a).strokeCircle(top.x, top.y, s * 0.1);
}

function sanctuaryOn(c: VfxCtx, k: VfxKit, v: CombatantView, at: number): void {
  const foot = k.feet(v);
  const P = { x: v.container.x, y: v.container.y - v.h - 96 }; // başın epey üstü (Ömer: biraz yukarı)
  const s = 64;
  const t0 = Math.max(0, at - k.slow(360));
  const END = at + k.slow(1000);
  layer(c, END, v.container.depth + 3, (g, tm) => {
    if (tm < t0) return;
    const q = clamp01((tm - t0) / (at - t0));
    const post = clamp01((tm - at - k.slow(500)) / k.slow(500));
    const a = eo(q, 2) * (1 - post);
    // sallanma: geriye çekilir, vuruşta öne savrulup çalar, sonra sönümlü salınır
    const sw = tm < at ? -0.35 * eo(q, 1.5) : 0.42 * Math.exp(-(tm - at) / k.slow(320)) * Math.cos((tm - at) / k.slow(70));
    const shine = tm >= at ? Math.exp(-(tm - at) / k.slow(200)) : 0;
    bell(g, { x: P.x, y: P.y - 50 * (1 - eo(q, 2)) }, s, sw, a, shine);
  });
  after(c, at, () => {
    for (let i = 0; i < 3; i++) ringFx(c, k, { x: P.x, y: P.y + s * 0.7 }, { r0: s * 0.6, r1: s * 2.4 + i * 30, dur: 520, col: '#a8742a', pale: '#fff0c0', w: 5 - i, flat: 0.45, depth: v.container.depth + 3, delay: i * 120, a: 0.75 });
    motes(c, k, { x: P.x, y: P.y + s }, { n: 14, r: s * 0.8, rise: -90, cols: ['#ffd27a', '#fff0c0'], size: [1.6, 2.6], life: 900, depth: v.container.depth + 3 });
  });
  // ışık perdesi: çandan ayağa inen soluk altın sütun (ölçülü)
  layer(
    c,
    END,
    v.container.depth - 1,
    (g, tm) => {
      if (tm < at - k.slow(40)) return;
      const q = clamp01((tm - at + k.slow(40)) / k.slow(260));
      const post = clamp01((tm - at - k.slow(400)) / k.slow(560));
      const a = q * (1 - post);
      const top = P.y + s * 0.8;
      const h = (foot.y - top) * eo(q, 2);
      g.fillStyle(C('#e8b040'), 0.12 * a).fillRect(P.x - s * 0.95, top, s * 1.9, h);
      g.fillStyle(C('#fff0c0'), 0.12 * a).fillRect(P.x - s * 0.4, top, s * 0.8, h);
    },
    true,
  );
  sigilFx(c, k, foot, Math.max(70, v.w * 0.7), { col: C('#e0a83a'), pale: C('#fff0c0'), deep: C('#7a4a10'), ticks: 8, inner: 'cross', arcs: 2, peak: at + k.slow(120), end: END });
}
const sanctuary: MobHandVfx = (c, k, hitMs) => aura(c, k, hitMs, '#ffcf5a', (v, at) => sanctuaryOn(c, k, v, at));

export const GUARDIANS: Readonly<Record<string, MobHandVfx>> = {
  gatestone_slam: gatestoneSlam,
  rockfall,
  pick_of_the_deep: pickOfTheDeep,
  oath_of_stone: oathOfStone,
  shield_wall: shieldWall,
  hold_the_line: holdTheLine,
  rune_spark: runeSpark,
  shield_bash: shieldBash,
  penance_flail: penanceFlail,
  sanctuary,
};
