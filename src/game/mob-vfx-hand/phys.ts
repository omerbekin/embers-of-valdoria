/**
 * FİZİKSEL efekt parçaları (Rend dili: gerçekçi, koyu, parlamasız): yara izleri (kesik / yırtık / yanık; koyulaşıp söner, damlar süzülür,
 * birimle birlikte kayar), diş delikleri, kan / toprak / taş / kıymık / toz patlamaları, silah savuruşu sürücüsü ve silah çizimleri
 * (bıçak, satır, kanca, sopa, kazma, teber, çapa, kalkan, mızrak, ok, kısa ok). Silahlar mat çelik + ahşap; çelikte yalnızca açıya göre
 * gezinen ince ışık çizgisi ("metal" okunsun), yere yaklaşan ağır başın altında koyulaşan gölge.
 */
import { C, CELL_DEPTH, TAU, after, bits, clamp01, eo, layer, lerp, mix, puffs, smooth, smoke, spray, type CombatantView, type G, type Pt, type VfxCtx, type VfxKit } from './core';
import { crescent, poly, taper, xf, type Xf } from './draw';

// ---------------------------------------------------------------------------------------------------------------------
// paletler

export const GORE = ['#2a0507', '#3e080b', '#560c10', '#6e1214'];
export const EARTH = ['#54473b', '#685848', '#40352c', '#76654f'];
export const STONE = ['#4a4440', '#5c5650', '#3a3532', '#6a625a'];
export const DUST = ['#7e7062', '#8e8072', '#665a4e'];
export const FIBER = ['#5e554e', '#7a6f66', '#463c36', '#4a3a2c', '#5a4634'];
export const SPLINTER = ['#6e5638', '#86684a', '#4e3a26', '#5e4a32'];
export const EMBERS = ['#ff9a3a', '#ffb050', '#e86a1c', '#ffd27a'];

// ---------------------------------------------------------------------------------------------------------------------
// yara izleri (Rend'in genelleştirilmiş hali)

export interface WoundPal {
  edge: string;
  flesh: string;
  deep: string;
  wet: string;
  dry: string;
  rim: string;
  /** Damla rengi (yoksa wet/flesh karışımı). */
  drip?: string;
  /** Yanık: iç, sönerken kor rengi bırakır (ADD yok; yalnızca renk). */
  ember?: string;
}
export const BLOOD: WoundPal = { edge: '#170705', flesh: '#4a080b', deep: '#240306', wet: '#631012', dry: '#160605', rim: '#c9a99a' };
/** Gulyabani: çürük yeşil-siyah kenar, sarımsı-yeşil iç (zehirli). */
export const ROT: WoundPal = { edge: '#10140a', flesh: '#3c4a14', deep: '#1a2008', wet: '#5e6c1e', dry: '#141808', rim: '#b8c48a', drip: '#4c5a18' };
/** Yanık: kömür kenar, içte sönen kor. */
export const BURN: WoundPal = { edge: '#120806', flesh: '#5a1e08', deep: '#1c0a04', wet: '#a8400e', dry: '#140806', rim: '#d8a070', ember: '#d0581a' };

export interface Stroke {
  A: Pt;
  B: Pt;
  /** Kalınlık (px). */
  w: number;
  /** Bu tırnağın / ağzın gecikmesi (ms, yavaşlatılmadan). */
  lag?: number;
  /** Bombe (px; işaretli). */
  bow?: number;
}

/** İz şeridi çokgeni (Rend'in rakePoly'si). */
function strokePoly(A: Pt, B: Pt, bow: number, head: number, wAt: (s: number) => number, rag: number[][]): { poly: Pt[]; mid: Pt[]; top: Pt[] } {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const N = 16;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const mid: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const s = (head * i) / N;
    const bw = Math.sin(Math.PI * s) * bow;
    const cx = A.x + dx * s + nx * bw;
    const cy = A.y + dy * s + ny * bw;
    const j = Math.min(rag[0]!.length - 1, Math.round(s * (rag[0]!.length - 1)));
    const w = wAt(s) / 2;
    mid.push({ x: cx, y: cy });
    left.push({ x: cx + nx * w * rag[0]![j]!, y: cy + ny * w * rag[0]![j]! });
    right.push({ x: cx - nx * w * rag[1]![j]!, y: cy - ny * w * rag[1]![j]! });
  }
  const top = [...((left[N >> 1]?.y ?? 0) < (right[N >> 1]?.y ?? 0) ? left : right)];
  return { poly: [...left, ...right.reverse()], mid, top };
}

/**
 * Yara izleri: her şerit A'dan B'ye `sw` ms'de açılır (vuruştan hemen önce başlar, ~T'de ortadan geçer), `hold` taze kalır, `fade` içinde
 * koyulaşıp hafifçe kapanarak söner; `drips` kalın damla süzülür. İzler birimle birlikte kayar (geri itilince üstünde kalır).
 */
export function wounds(c: VfxCtx, k: VfxKit, v: CombatantView, T: number, strokes: Stroke[], o: { sw?: number; hold?: number; fade?: number; drips?: number; pal?: WoundPal; cross?: number; depth?: number } = {}): void {
  const pal = o.pal ?? BLOOD;
  const SW = Math.min(T * 0.7, k.slow(o.sw ?? 110));
  const start = T - SW * (o.cross ?? 0.6);
  const HOLD = k.slow(o.hold ?? 240);
  const FADE = k.slow(o.fade ?? 420);
  const total = T + HOLD + FADE + k.slow(80);
  const cEdge = C(pal.edge);
  const cFlesh = C(pal.flesh);
  const cDeep = C(pal.deep);
  const cWet = C(pal.wet);
  const cDry = C(pal.dry);
  const cRim = C(pal.rim);
  const cEmber = pal.ember ? C(pal.ember) : null;
  const cSmear = C('#8a7a70');
  const rs = strokes.map((s) => ({ ...s, rag: [0, 1].map(() => Array.from({ length: 17 }, () => k.rnd(0.68, 1.22))) }));
  const x0 = v.container.x;
  const sx0 = v.sprite.x;
  const drips = Array.from({ length: o.drips ?? 4 }, (_, i) => ({ r: i % rs.length, s: k.rnd(0.3, 0.75), t0: T + k.slow(k.rnd(90, 260)), v: k.rnd(45, 80), max: k.rnd(28, 52) }));
  const cDrip = pal.drip ? C(pal.drip) : mix(cWet, cFlesh, 0.4);
  layer(c, total, v.container.depth + (o.depth ?? 2), (g, tm) => {
    const fx = v.container.x - x0 + (v.sprite.x - sx0);
    const post = clamp01((tm - T - HOLD) / FADE);
    const dry = smooth(clamp01((tm - T) / (HOLD + FADE * 0.6)));
    const alpha = 1 - post ** 1.4;
    for (const r of rs) {
      const t0 = start + k.slow(r.lag ?? 0);
      if (tm < t0) continue;
      const q = clamp01((tm - t0) / SW);
      const head = 1 - (1 - q) ** 3;
      const since = Math.max(0, tm - t0 - SW);
      const wAt = (s: number) => {
        const open = smooth(clamp01((head - s) / 0.28 + since / k.slow(70) + 0.25));
        const tp = clamp01(s / 0.1) ** 0.7 * clamp01((1 - s) / 0.38) ** 0.9;
        return r.w * tp * open * (1 - 0.35 * post);
      };
      const A = { x: r.A.x + fx, y: r.A.y };
      const B = { x: r.B.x + fx, y: r.B.y };
      const bow = r.bow ?? 0;
      const outer = strokePoly(A, B, bow, head, (s) => wAt(s) * 1.6, r.rag);
      const inner = strokePoly(A, B, bow, head, wAt, r.rag);
      const core = strokePoly(A, B, bow, head, (s) => wAt(s) * 0.45, r.rag);
      if (outer.poly.length < 4) continue;
      g.fillStyle(mix(cEdge, cDry, dry * 0.6), 0.82 * alpha).fillPoints(outer.poly, true);
      g.fillStyle(mix(mix(cWet, cFlesh, clamp01((tm - T) / k.slow(140))), cDry, dry * 0.75), 0.95 * alpha).fillPoints(inner.poly, true);
      // yanık izinde çekirdek kor rengiyle başlar, kömürleşerek kararır
      const coreCol = cEmber !== null ? mix(cEmber, cDeep, clamp01((tm - T) / (HOLD + FADE * 0.5))) : mix(cDeep, cDry, dry * 0.8);
      g.fillStyle(coreCol, 0.9 * alpha).fillPoints(core.poly, true);
      const rimA = 0.14 * (1 - dry) * alpha;
      if (rimA > 0.01 && inner.top.length > 3) g.lineStyle(1.2, cRim, rimA).strokePoints(inner.top.slice(2, -3), false);
      if (q < 1) {
        const n = inner.mid.length;
        const tip = inner.mid[n - 1]!;
        const back = inner.mid[Math.max(0, n - 6)]!;
        const sa = 0.3 * Math.sin(Math.PI * q);
        g.lineStyle(1.6, cSmear, sa).lineBetween(back.x, back.y, tip.x, tip.y);
        g.lineStyle(3.5, cSmear, sa * 0.35).lineBetween(back.x, back.y, tip.x, tip.y);
      }
    }
    for (const d of drips) {
      if (tm < d.t0) continue;
      const r = rs[d.r]!;
      const bw = Math.sin(Math.PI * d.s) * (r.bow ?? 0);
      const Lr = Math.hypot(r.B.x - r.A.x, r.B.y - r.A.y) || 1;
      const px = r.A.x + (r.B.x - r.A.x) * d.s + (-(r.B.y - r.A.y) / Lr) * bw + fx;
      const py = r.A.y + (r.B.y - r.A.y) * d.s + ((r.B.x - r.A.x) / Lr) * bw + 3;
      const ts = (tm - d.t0) / k.slow(1000);
      const len = Math.min(d.max, d.v * ts * (1 + ts * 0.8));
      const col = mix(cDrip, cDry, dry * 0.65);
      g.fillStyle(col, 0.95 * alpha).fillCircle(px, py, 3.4);
      g.lineStyle(4.6, col, 0.92 * alpha).lineBetween(px, py, px, py + len);
      g.fillStyle(col, 0.97 * alpha).fillEllipse(px, py + len + 1, 8.5, 10.5);
    }
  });
}

/** Diş / pençe delikleri: koyu oval, taze kırmızı iç, birkaçından damla. Birimle kayar. */
export function punctures(c: VfxCtx, k: VfxKit, v: CombatantView, T: number, pts: Array<Pt & { r: number }>, o: { pal?: WoundPal; hold?: number; fade?: number } = {}): void {
  const pal = o.pal ?? BLOOD;
  const HOLD = k.slow(o.hold ?? 300);
  const FADE = k.slow(o.fade ?? 420);
  const total = T + HOLD + FADE;
  const x0 = v.container.x;
  const sx0 = v.sprite.x;
  const drips = pts.filter((_, i) => i % 2 === 0).map((p) => ({ p, v: k.rnd(40, 70), max: k.rnd(20, 40), t0: T + k.slow(k.rnd(60, 200)) }));
  layer(c, total, v.container.depth + 2, (g, tm) => {
    if (tm < T) return;
    const fx = v.container.x - x0 + (v.sprite.x - sx0);
    const open = eo((tm - T) / k.slow(50), 2);
    const post = clamp01((tm - T - HOLD) / FADE);
    const a = 1 - post ** 1.4;
    const dry = smooth(clamp01((tm - T) / (HOLD + FADE * 0.6)));
    for (const p of pts) {
      const r = p.r * open;
      g.fillStyle(C(pal.edge), 0.85 * a).fillEllipse(p.x + fx, p.y, r * 2.3, r * 2.8);
      g.fillStyle(mix(C(pal.wet), C(pal.dry), dry * 0.7), 0.95 * a).fillEllipse(p.x + fx, p.y, r * 1.5, r * 1.9);
      g.fillStyle(C(pal.deep), a).fillEllipse(p.x + fx, p.y + r * 0.2, r * 0.7, r * 0.9);
    }
    for (const d of drips) {
      if (tm < d.t0) continue;
      const ts = (tm - d.t0) / k.slow(1000);
      const len = Math.min(d.max, d.v * ts * (1 + ts));
      const col = mix(pal.drip ? C(pal.drip) : C(pal.wet), C(pal.dry), dry * 0.6);
      g.lineStyle(4, col, 0.92 * a).lineBetween(d.p.x + fx, d.p.y + 2, d.p.x + fx, d.p.y + 2 + len);
      g.fillStyle(col, 0.95 * a).fillEllipse(d.p.x + fx, d.p.y + 3 + len, 7.5, 9.5);
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// patlamalar (vuruş katmanı)

/** Koyu kan zerreleri: `ang` yönünde (rad) savrulur. */
export function gore(c: VfxCtx, k: VfxKit, p: Pt, ang: number, n: number, depth: number, o: { spread?: number; sp?: [number, number]; jx?: number; jy?: number; cols?: string[]; size?: [number, number] } = {}): void {
  const w = o.spread ?? 0.8;
  const cols = o.cols ?? GORE;
  spray(
    c,
    k,
    [
      ...bits(k, Math.ceil(n * 0.6), p, { kind: 'rock', ang: [ang - w, ang + w], sp: o.sp ?? [120, 330], size: o.size ?? [2.5, 5], life: [360, 600], cols, jx: o.jx ?? 16, jy: o.jy ?? 22, up: [40, 140] }),
      ...bits(k, Math.floor(n * 0.4), p, { kind: 'drop', ang: [ang - w * 0.7, ang + w * 0.7], sp: o.sp ?? [140, 360], size: [3, 5], life: [360, 560], cols, jx: o.jx ?? 12, jy: o.jy ?? 16, up: [60, 160] }),
    ],
    depth,
    1300,
  );
}

/** Toprak / taş kırıkları + ince toprak: zeminden yukarı yelpaze. */
export function rubble(c: VfxCtx, k: VfxKit, p: Pt, n: number, depth: number, o: { spread?: number; sp?: [number, number]; size?: [number, number]; cols?: string[]; lean?: number; rim?: string; jx?: number } = {}): void {
  const w = o.spread ?? 1.15;
  const a0 = -Math.PI / 2 + (o.lean ?? 0);
  spray(
    c,
    k,
    [
      ...bits(k, n, p, { kind: 'rock', ang: [a0 - w, a0 + w], sp: o.sp ?? [200, 470], size: o.size ?? [6, 14], life: [440, 720], cols: o.cols ?? EARTH, jx: o.jx ?? 30, jy: 3, delay: [0, 30], vr: 7, floor: p.y + 6, ...(o.rim ? { rim: o.rim } : {}) }),
      ...bits(k, Math.round(n * 0.9), p, { kind: 'rock', ang: [a0 - w * 1.1, a0 + w * 1.1], sp: [140, 380], size: [1.8, 3.6], life: [320, 560], cols: o.cols ?? EARTH, jx: (o.jx ?? 30) * 1.2, jy: 3, delay: [0, 40] }),
    ],
    depth,
    1500,
  );
}

/** Alçak toz bulutu (yere yayılır) + biraz yükselen. */
export function dust(c: VfxCtx, k: VfxKit, p: Pt, depth: number, o: { n?: number; w?: number; hex?: string[]; a?: number; rise?: number; delay?: number } = {}): void {
  const n = o.n ?? 6;
  const w = o.w ?? 70;
  const hex = o.hex ?? DUST;
  smoke(
    c,
    k,
    [
      ...puffs(k, p, n, { hex, sx: w * 0.5, sy: 4, vx: [-w * 1.6, w * 1.6], vy: [-30, -6], s0: [46, 66], s1: [110, 170], life: [560, 860], a: (o.a ?? 0.34) * 1.25, drag: 2.6, delay: [o.delay ?? 0, (o.delay ?? 0) + 60] }),
      ...puffs(k, { x: p.x, y: p.y - 10 }, Math.ceil(n / 2), { hex, sx: w * 0.3, sy: 6, vy: [-(o.rise ?? 80), -(o.rise ?? 80) * 0.5], s0: [30, 46], s1: [70, 100], life: [480, 720], a: (o.a ?? 0.34) * 0.75, drag: 1.6, delay: [o.delay ?? 0, (o.delay ?? 0) + 80] }),
    ],
    depth,
  );
}

/** Hareketli toz izi / koyu duman teli. */
export function wisp(c: VfxCtx, k: VfxKit, p: Pt, depth: number, hex = ['#3e3a36', '#4a4440'], n = 2, a = 0.16): void {
  smoke(c, k, puffs(k, p, n, { hex, sx: 16, sy: 4, vy: [-90, -60], s0: [20, 30], s1: [50, 70], life: [640, 860], a, drag: 0.8, delay: [40, 120] }), depth);
}

/** Kıymık (ahşap) / lif. */
export function splinters(c: VfxCtx, k: VfxKit, p: Pt, ang: number, n: number, depth: number, cols = SPLINTER, size: [number, number] = [5, 10]): void {
  spray(c, k, bits(k, n, p, { kind: 'shard', ang: [ang - 0.9, ang + 0.9], sp: [120, 300], size, life: [420, 680], cols, jx: 10, jy: 10, up: [40, 120], vr: 9 }), depth, 1200);
}

/** Kor zerreleri (ateş): yavaş yükselip söner (ADD; küçük, az). */
export function embers(c: VfxCtx, k: VfxKit, p: Pt, n: number, depth: number, o: { sp?: [number, number]; ang?: [number, number]; jx?: number; jy?: number; life?: [number, number]; size?: [number, number]; grav?: number; cols?: string[] } = {}): void {
  spray(c, k, bits(k, n, p, { kind: 'ember', ang: o.ang ?? [-Math.PI + 0.4, -0.4], sp: o.sp ?? [60, 200], size: o.size ?? [1.6, 3], life: o.life ?? [420, 760], cols: o.cols ?? EMBERS, jx: o.jx ?? 20, jy: o.jy ?? 10, drag: 1.4 }), depth, o.grav ?? -90, true);
}

/** Kısa kıvılcım çizgileri (çelik çeliğe / taşa): soluk, sarımsı, az. */
export function sparks(c: VfxCtx, k: VfxKit, p: Pt, n: number, depth: number, ang: [number, number] = [-Math.PI, 0], cols = ['#ffd890', '#ffc060', '#fff0c8']): void {
  spray(c, k, bits(k, n, p, { kind: 'streak', ang, sp: [260, 620], size: [1.6, 2.6], life: [120, 260], cols, jx: 6, jy: 6, a: 0.85 }), depth, 900, true);
}

// ---------------------------------------------------------------------------------------------------------------------
// silah savuruşu

export interface SwingOpt {
  /** Savuruş merkezi (omuz / el), yarıçap (sap boyu: baş R'de). */
  P: Pt;
  R: number;
  dir: number;
  /** Açılar (rad, dir=+1 için; 0 = ileri yatay, -PI/2 = yukarı, +PI/2 = aşağı). */
  a0: number;
  a1: number;
  /** Vuruş anı (ms) ve iniş ivmesi (üs). */
  T: number;
  ease?: number;
  /** Başlangıçta belirme oranı (0-1 iniş süresinin). */
  appear?: number;
  /** Vuruştan sonra kalış ve geri çekilip sönme (ms, slow). */
  hold: number;
  pull: number;
  /** Geri çekilme açısı (a1'e eklenir). */
  back?: number;
  /** Silah çizimi (yerel çerçeve: +x sap boyunca, +y ağız tarafı). */
  draw: (g: G, f: Xf, a: number, ang: number) => void;
  /** Hareket izi: yarıçap oranları [iç, dış], renk, alfa. */
  trail?: { r0: number; r1: number; col: string; a: number; span?: number };
  /** Zemin y'si: başın altında koyulaşan gölge (ağır silah). */
  ground?: number;
  depth: number;
  /** Vuruşta titreşim (rad). */
  quiver?: number;
  /** Silah başlangıçta bu kadar ms önce görünür (T'nin içinden). */
  lead?: number;
}

/** Silahı a0'dan a1'e (ivmelenerek) savurur, vuruşta kısa titretir, sonra geri çekip söndürür; son kısmında soluk hareket izi. */
export function swing(c: VfxCtx, k: VfxKit, o: SwingOpt): void {
  const total = o.T + o.hold + o.pull;
  const ease = o.ease ?? 2.1;
  const sy = o.dir;
  const angOf = (a: number) => (o.dir > 0 ? a : Math.PI - a);
  const tr = o.trail;
  const cTrail = tr ? C(tr.col) : 0;
  layer(c, total, o.depth, (g, tm) => {
    let a: number;
    let al: number;
    let tA = 0;
    if (tm < o.T) {
      const q = tm / o.T;
      a = lerp(o.a0, o.a1, ei(q, ease));
      al = smooth(clamp01(q / (o.appear ?? 0.2)));
      tA = al * clamp01((q - 0.3) / 0.3);
    } else {
      const t = tm - o.T;
      const qp = clamp01((t - o.hold) / o.pull);
      const quiver = (o.quiver ?? 0.012) * Math.sin(t / k.slow(16)) * Math.exp(-t / k.slow(70));
      a = o.a1 + quiver + (o.back ?? -0.3) * smooth(qp);
      al = (1 - qp) ** 1.3;
      tA = 1 - clamp01(t / k.slow(70));
    }
    // hareket izi: geçilen yayın son parçası (soluk, normal karışım)
    if (tr && tA > 0.02) {
      const spanA = (tr.span ?? 0.5) * (tm < o.T ? clamp01(tm / o.T) ** 1.2 : 1);
      const aEnd = tm < o.T ? a : o.a1;
      const Pm = o.P;
      for (const [rr, w, am] of [
        [o.R * tr.r1, 9, 0.5],
        [o.R * lerp(tr.r0, tr.r1, 0.5), 18, 0.18],
        [o.R * tr.r0, 5, 0.3],
      ] as Array<[number, number, number]>) {
        const A0 = o.dir > 0 ? aEnd - spanA : Math.PI - aEnd + spanA;
        const A1 = o.dir > 0 ? aEnd : Math.PI - aEnd;
        crescent(g, Pm, rr, A0, A1, w, cTrail, tr.a * am * tA);
      }
    }
    // ağır başın gölgesi (zemine yaklaştıkça koyu, küçük)
    if (o.ground !== undefined) {
      const f = xf(o.P, angOf(a), sy);
      const h = f(o.R, 0);
      const dist = Math.max(0, o.ground - h.y);
      const sh = clamp01(1 - dist / 320);
      if (sh > 0.02) g.fillStyle(0x000000, 0.28 * sh * al).fillEllipse(h.x, o.ground + 2, 70 + dist * 0.25, 14 + dist * 0.04);
    }
    o.draw(g, xf(o.P, angOf(a), sy), al, a);
  });
}
const ei = (u: number, p: number) => clamp01(u) ** p;

// ---------------------------------------------------------------------------------------------------------------------
// silahlar (yerel çerçeve: 0 = el / pivot, +x sap boyunca, +y ağız tarafı)

export const STEEL = { dark: C('#1c1f22'), body: C('#50565c'), mid: C('#71787e'), edge: C('#b4b9be'), glint: C('#e6eaee') };
export const IRON = { dark: C('#16120f'), body: C('#3a3430'), mid: C('#544c46'), edge: C('#8a8078'), glint: C('#c8c0b8') };
export const WOOD = { dark: C('#22170e'), body: C('#664830'), hi: C('#8a6a48') };

/** Sap: x0'dan x1'e ahşap (koyu kenar, gövde, ince açık şerit); `fade` arka uçta solar. */
export function haft(g: G, f: Xf, x0: number, x1: number, th: number, a: number, fade = true, wood = WOOD): void {
  const seg = fade
    ? ([
        [x0, lerp(x0, x1, 0.25), 0.25],
        [lerp(x0, x1, 0.25), lerp(x0, x1, 0.5), 0.65],
        [lerp(x0, x1, 0.5), x1, 1],
      ] as Array<[number, number, number]>)
    : ([[x0, x1, 1]] as Array<[number, number, number]>);
  for (const [s0, s1, aa] of seg) {
    const A = f(s0, 0);
    const B = f(s1, 0);
    g.lineStyle(th, wood.dark, a * aa).lineBetween(A.x, A.y, B.x, B.y);
    g.lineStyle(th * 0.6, wood.body, a * aa).lineBetween(A.x, A.y, B.x, B.y);
    const A2 = f(s0, -th * 0.16);
    const B2 = f(s1, -th * 0.16);
    g.lineStyle(Math.max(1, th * 0.13), wood.hi, a * aa * 0.8).lineBetween(A2.x, A2.y, B2.x, B2.y);
  }
}

/** Çelik yüzey: gövde, sırtta koyu, kenara doğru açık bileme şeridi, ince kenar; `ang` ile gezinen ince ışık çizgisi. */
export function steel(g: G, f: Xf, body: Array<[number, number]>, edge: Array<[number, number]>, bevel: Array<[number, number]>, a: number, ang: number, pal = STEEL): void {
  const B = poly(f, body);
  g.fillStyle(pal.body, a).fillPoints(B, true);
  if (bevel.length && edge.length) g.fillStyle(pal.mid, a).fillPoints([...poly(f, bevel), ...poly(f, edge).reverse()], true);
  if (edge.length) g.lineStyle(1.6, pal.edge, a * 0.8).strokePoints(poly(f, edge), false);
  g.lineStyle(1.4, pal.dark, a).strokePoints(B, true);
  // gezinen ışık: açıya göre kenar boyunca kayan kısa açık çizgi (parlama değil; metal okunur)
  if (edge.length >= 2) {
    const u = (Math.sin(ang * 3.1) + 1) / 2;
    const i = Math.min(edge.length - 2, Math.floor(u * (edge.length - 1)));
    const p0 = f(edge[i]![0], edge[i]![1]);
    const p1 = f(edge[i + 1]![0], edge[i + 1]![1]);
    g.lineStyle(2.2, STEEL.glint, a * 0.55 * Math.abs(Math.sin(ang * 2.3 + 0.6))).lineBetween(p0.x, p0.y, p1.x, p1.y);
  }
}

/** Teber başı (R = sap boyu): hilal ağız, üst sivri uç, arka kanca, sap yuvası. */
export function halberdHead(g: G, f: Xf, R: number, a: number, ang: number, bw = 46): void {
  haft(g, f, R * 0.3, R * 0.98, 12, a);
  // arka kanca + üst uç
  g.fillStyle(STEEL.body, a).fillPoints(poly(f, [[R * 0.77, -4], [R * 0.71, -bw * 0.46], [R * 0.75, -bw * 0.42], [R * 0.87, -4]]), true);
  g.lineStyle(1.3, STEEL.dark, a).strokePoints(poly(f, [[R * 0.77, -4], [R * 0.71, -bw * 0.46], [R * 0.75, -bw * 0.42], [R * 0.87, -4]]), true);
  steel(g, f, [[R * 0.95, -6], [R * 1.19, 0], [R * 0.95, 6]], [[R * 0.96, -5], [R * 1.18, 0]], [], a, ang);
  steel(
    g,
    f,
    [[R * 0.71, 4], [R * 0.65, bw * 0.5], [R * 0.655, bw * 0.95], [R * 0.77, bw * 1.2], [R * 0.91, bw * 1.13], [R * 1.0, bw * 0.78], [R * 0.95, 4]],
    [[R * 0.655, bw * 0.95], [R * 0.77, bw * 1.2], [R * 0.91, bw * 1.13], [R * 1.0, bw * 0.78]],
    [[R * 0.675, bw * 0.82], [R * 0.775, bw * 1.04], [R * 0.9, bw * 0.98], [R * 0.975, bw * 0.72]],
    a,
    ang,
  );
  // sırt gölgesi + perçinler + bilezik
  g.fillStyle(STEEL.dark, a * 0.55).fillPoints(poly(f, [[R * 0.71, 4], [R * 0.69, bw * 0.34], [R * 0.93, bw * 0.3], [R * 0.95, 4]]), true);
  for (const x of [0.76, 0.88]) {
    const p = f(R * x, bw * 0.2);
    g.fillStyle(STEEL.dark, a).fillCircle(p.x, p.y, 2.6);
    g.fillStyle(STEEL.edge, a * 0.6).fillCircle(p.x - 0.6, p.y - 0.6, 1);
  }
  const s0 = f(R * 0.69, -8);
  const s1 = f(R * 0.69, 8);
  g.lineStyle(7, STEEL.dark, a).lineBetween(s0.x, s0.y, s1.x, s1.y);
  const s2 = f(R * 0.96, -7);
  const s3 = f(R * 0.96, 7);
  g.lineStyle(6, STEEL.dark, a).lineBetween(s2.x, s2.y, s3.x, s3.y);
}

/** Kısa bıçak (hançer): uç +x'te; `L` boy. */
export function knife(g: G, f: Xf, L: number, a: number, ang: number): void {
  const grip = [[-L * 0.42, -4], [-L * 0.02, -4.5], [-L * 0.02, 4.5], [-L * 0.42, 4]] as Array<[number, number]>;
  g.fillStyle(C('#3a2618'), a).fillPoints(poly(f, grip), true);
  g.lineStyle(1.2, C('#160e08'), a).strokePoints(poly(f, grip), true);
  for (const x of [-0.32, -0.2, -0.08]) {
    const p0 = f(L * x, -4.5);
    const p1 = f(L * x, 4.5);
    g.lineStyle(1.2, C('#20140c'), a * 0.8).lineBetween(p0.x, p0.y, p1.x, p1.y);
  }
  const gd0 = f(0, -10);
  const gd1 = f(0, 10);
  g.lineStyle(4.5, IRON.dark, a).lineBetween(gd0.x, gd0.y, gd1.x, gd1.y);
  steel(g, f, [[0, -5], [L * 0.7, -4.4], [L, 0], [L * 0.62, 5.5], [0, 5]], [[L * 0.62, 5.5], [L * 0.86, 3], [L, 0]], [[L * 0.08, 2.2], [L * 0.6, 3.2], [L * 0.94, 0.6]], a, ang);
  const r0 = f(L * 0.04, -0.6);
  const r1 = f(L * 0.8, -0.8);
  g.lineStyle(1, STEEL.dark, a * 0.6).lineBetween(r0.x, r0.y, r1.x, r1.y);
}

/** Satır (geniş, dikdörtgen ağızlı, çentikli): sap 0..R*0.5, ağız R*0.5..R. */
export function cleaver(g: G, f: Xf, R: number, a: number, ang: number, bw = 62): void {
  haft(g, f, R * 0.02, R * 0.56, 13, a, false);
  for (const x of [0.12, 0.3, 0.46]) {
    const p0 = f(R * x, -6.5);
    const p1 = f(R * x, 6.5);
    g.lineStyle(2, WOOD.dark, a * 0.7).lineBetween(p0.x, p0.y, p1.x, p1.y);
  }
  const nick = (x: number) => [[R * (x - 0.02), bw], [R * x, bw * 0.9], [R * (x + 0.02), bw]] as Array<[number, number]>;
  const body: Array<[number, number]> = [[R * 0.5, -10], [R * 1.02, -12], [R * 1.06, bw * 0.3], [R * 1.04, bw * 1.04], ...nick(0.86), [R * 0.64, bw * 0.98], [R * 0.52, bw * 0.62], [R * 0.5, 8]];
  steel(g, f, body, [[R * 0.52, bw * 0.62], [R * 0.64, bw * 0.98], [R * 0.84, bw], [R * 1.04, bw * 1.04]], [[R * 0.56, bw * 0.55], [R * 0.66, bw * 0.84], [R * 0.84, bw * 0.86], [R * 1.02, bw * 0.9]], a, ang, IRON);
  // pas lekeleri + sırt deliği
  g.fillStyle(C('#4a2a18'), a * 0.4).fillEllipse(f(R * 0.78, bw * 0.3).x, f(R * 0.78, bw * 0.3).y, 18, 10);
  const h = f(R * 0.94, bw * 0.12);
  g.fillStyle(C('#0c0a08'), a).fillCircle(h.x, h.y, 5);
  g.lineStyle(1, IRON.edge, a * 0.5).strokeCircle(h.x, h.y, 5);
}

/** Bağ (billhook): sap + öne kıvrılan kancalı ağız. */
export function billhook(g: G, f: Xf, R: number, a: number, ang: number): void {
  haft(g, f, R * 0.02, R * 0.5, 11, a, false);
  const body: Array<[number, number]> = [[R * 0.48, -7], [R * 0.9, -9], [R * 1.08, -2], [R * 1.14, 14], [R * 1.08, 34], [R * 0.98, 40], [R * 1.02, 26], [R * 0.98, 14], [R * 0.86, 10], [R * 0.48, 7]];
  steel(g, f, body, [[R * 0.98, 40], [R * 1.02, 26], [R * 0.98, 14], [R * 0.86, 10], [R * 0.5, 7]], [[R * 0.97, 33], [R * 0.96, 18], [R * 0.86, 5], [R * 0.52, 3]], a, ang);
  const s0 = f(R * 0.48, -8);
  const s1 = f(R * 0.48, 8);
  g.lineStyle(6, STEEL.dark, a).lineBetween(s0.x, s0.y, s1.x, s1.y);
}

/** Budaklı sopa (demir çivili): sap kalınlaşarak başa varır. */
export function club(g: G, f: Xf, R: number, a: number, ang: number): void {
  const body: Array<[number, number]> = [[0, -6], [R * 0.5, -9], [R * 0.82, -15], [R * 1.02, -14], [R * 1.08, 0], [R * 1.02, 15], [R * 0.82, 16], [R * 0.5, 9], [0, 6]];
  g.fillStyle(WOOD.body, a).fillPoints(poly(f, body), true);
  g.fillStyle(WOOD.dark, a * 0.5).fillPoints(poly(f, [[R * 0.4, 4], [R * 0.82, 10], [R * 1.04, 8], [R * 1.04, 15], [R * 0.82, 16], [R * 0.4, 9]]), true);
  g.lineStyle(1.6, WOOD.dark, a).strokePoints(poly(f, body), true);
  g.lineStyle(1.3, WOOD.hi, a * 0.6).strokePoints(poly(f, [[R * 0.1, -5], [R * 0.5, -8], [R * 0.82, -13]]), false);
  // budaklar + demir çiviler
  for (const [x, y] of [[0.6, -4], [0.78, 6], [0.9, -8]] as Array<[number, number]>) g.fillStyle(WOOD.dark, a * 0.8).fillEllipse(f(R * x, y).x, f(R * x, y).y, 7, 5);
  for (const [x, y, s] of [[0.86, -15, -1], [0.98, -14, -1], [0.92, 16, 1], [1.06, 6, 1], [0.76, 15, 1]] as Array<[number, number, number]>) {
    const b0 = f(R * x, y);
    const b1 = f(R * x + 2, y + s * 7);
    g.lineStyle(3, IRON.dark, a).lineBetween(b0.x, b0.y, b1.x, b1.y);
    g.lineStyle(1, IRON.edge, a * 0.7).lineBetween(b0.x, b0.y, b1.x, b1.y);
  }
  void ang;
}

/** Kazma (madenci): sap + iki uçlu demir baş (öne sivri uç, arkaya keski). */
export function pick(g: G, f: Xf, R: number, a: number, ang: number, rune?: number): void {
  haft(g, f, R * 0.18, R * 1.04, 12, a);
  const head: Array<[number, number]> = [[R * 0.9, -46], [R * 0.98, -20], [R * 1.08, -12], [R * 1.08, 12], [R * 0.98, 18], [R * 0.94, 64], [R * 0.9, 18], [R * 0.86, -16]];
  steel(g, f, head, [[R * 0.98, 18], [R * 0.94, 64]], [[R * 0.95, 20], [R * 0.93, 54]], a, ang, IRON);
  g.fillStyle(IRON.dark, a).fillRect(f(R, 0).x - 8, f(R, 0).y - 8, 16, 16);
  if (rune !== undefined && rune > 0.01) {
    // derin rün: ağız boyunca ince mavi çizgi (ölçülü)
    const p0 = f(R * 0.96, 22);
    const p1 = f(R * 0.94, 56);
    g.lineStyle(5, C('#1a4a9a'), a * rune * 0.4).lineBetween(p0.x, p0.y, p1.x, p1.y);
    g.lineStyle(1.8, C('#8ac8ff'), a * rune).lineBetween(p0.x, p0.y, p1.x, p1.y);
  }
}

/** Mızrak / pike: sap + bilezik + yaprak uç (uç +x'te, `L` boy). */
export function pike(g: G, f: Xf, L: number, a: number, ang: number, th = 9, leaf = 1): void {
  haft(g, f, 0, L - 26 * leaf, th, a);
  const l = leaf;
  steel(g, f, [[L - 30 * l, -4], [L - 18 * l, -10 * l], [L + 26 * l, 0], [L - 18 * l, 10 * l], [L - 30 * l, 4]], [[L - 18 * l, -10 * l], [L + 26 * l, 0]], [[L - 16 * l, -6 * l], [L + 18 * l, 0]], a, ang);
  const r0 = f(L - 26 * l, 0);
  const r1 = f(L + 20 * l, 0);
  g.lineStyle(1.4, STEEL.dark, a * 0.6).lineBetween(r0.x, r0.y, r1.x, r1.y);
  const b0 = f(L - 34 * l, -th * 0.7);
  const b1 = f(L - 34 * l, th * 0.7);
  g.lineStyle(7, STEEL.dark, a).lineBetween(b0.x, b0.y, b1.x, b1.y);
}

/** Ok: sap, demir uç, tüyler (uç +x'te). */
export function arrow(g: G, f: Xf, L: number, a: number, fl: { feather: string; shaft?: string; head?: string } = { feather: '#5a3a24' }): void {
  const A = f(-L * 0.5, 0);
  const B = f(L * 0.42, 0);
  g.lineStyle(5.5, C('#22160c'), a).lineBetween(A.x, A.y, B.x, B.y);
  g.lineStyle(3.2, C(fl.shaft ?? '#8a6640'), a).lineBetween(A.x, A.y, B.x, B.y);
  g.fillStyle(C(fl.head ?? '#3c3e40'), a).fillPoints(poly(f, [[L * 0.36, -7.5], [L * 0.58, 0], [L * 0.36, 7.5], [L * 0.41, 0]]), true);
  g.lineStyle(1, C('#a0a4a8'), a * 0.6).lineBetween(f(L * 0.4, -4).x, f(L * 0.4, -4).y, f(L * 0.55, 0).x, f(L * 0.55, 0).y);
  for (const s of [-1, 1]) g.fillStyle(C(fl.feather), a).fillPoints(poly(f, [[-L * 0.5, 0], [-L * 0.46, 11 * s], [-L * 0.26, 9 * s], [-L * 0.28, 0]]), true);
}

/** Kısa ok (arbalet): kalın, kısa, ağır uç. */
export function quarrel(g: G, f: Xf, L: number, a: number): void {
  const A = f(-L * 0.5, 0);
  const B = f(L * 0.36, 0);
  g.lineStyle(7.5, C('#1e140a'), a).lineBetween(A.x, A.y, B.x, B.y);
  g.lineStyle(4.6, C('#7a5634'), a).lineBetween(A.x, A.y, B.x, B.y);
  g.fillStyle(IRON.body, a).fillPoints(poly(f, [[L * 0.3, -7.5], [L * 0.58, 0], [L * 0.3, 7.5]]), true);
  g.lineStyle(1.2, IRON.edge, a * 0.7).lineBetween(f(L * 0.32, -5).x, f(L * 0.32, -5).y, f(L * 0.55, 0).x, f(L * 0.55, 0).y);
  for (const s of [-1, 1]) g.fillStyle(C('#c8b896'), a * 0.95).fillPoints(poly(f, [[-L * 0.5, 0], [-L * 0.46, 6 * s], [-L * 0.32, 5 * s], [-L * 0.32, 0]]), true);
}

/** Yuvarlak kalkan (yüzden; merkez 0,0): tahta, demir çember, göbek; `rx` yarıçap, `flat` yandan görünüm basıklığı. */
export function roundShield(g: G, P: Pt, rx: number, flat: number, a: number, ang: number): void {
  const ry = rx;
  const w = rx * flat;
  g.fillStyle(WOOD.dark, a).fillEllipse(P.x, P.y, w * 2 + 6, ry * 2 + 6);
  g.fillStyle(C('#5a3e26'), a).fillEllipse(P.x, P.y, w * 2, ry * 2);
  for (let i = -2; i <= 2; i++) g.lineStyle(1.4, WOOD.dark, a * 0.7).lineBetween(P.x - w * 0.95, P.y + i * ry * 0.36, P.x + w * 0.95, P.y + i * ry * 0.36);
  g.lineStyle(6, IRON.body, a).strokeEllipse(P.x, P.y, w * 2, ry * 2);
  g.lineStyle(1.4, IRON.edge, a * 0.6).strokeEllipse(P.x, P.y, w * 2 - 4, ry * 2 - 4);
  g.fillStyle(IRON.body, a).fillEllipse(P.x, P.y, w * 0.7, ry * 0.7);
  g.fillStyle(IRON.mid, a).fillEllipse(P.x - w * 0.08, P.y - ry * 0.08, w * 0.4, ry * 0.4);
  g.fillStyle(STEEL.glint, a * 0.4 * Math.abs(Math.sin(ang))).fillEllipse(P.x - w * 0.12, P.y - ry * 0.14, w * 0.14, ry * 0.14);
}

/** Demir çapa (gemi): sap + halka + iki kollu kanca (ağırlık aşağıda, uçlar yukarı kıvrık). Yerel: +x sap boyunca başa. */
export function anchor(g: G, f: Xf, R: number, a: number, ang: number): void {
  const shaft: Array<[number, number]> = [[0, -7], [R * 0.86, -9], [R * 0.86, 9], [0, 7]];
  g.fillStyle(IRON.body, a).fillPoints(poly(f, shaft), true);
  g.lineStyle(1.6, IRON.dark, a).strokePoints(poly(f, shaft), true);
  g.lineStyle(1.2, IRON.edge, a * 0.5).lineBetween(f(4, -5).x, f(4, -5).y, f(R * 0.84, -7).x, f(R * 0.84, -7).y);
  // halka (sap ucunda) + çapraz çubuk
  const ring0 = f(-12, 0);
  g.lineStyle(7, IRON.dark, a).strokeCircle(ring0.x, ring0.y, 12);
  g.lineStyle(3.5, IRON.mid, a).strokeCircle(ring0.x, ring0.y, 12);
  const s0 = f(R * 0.18, -34);
  const s1 = f(R * 0.18, 34);
  g.lineStyle(11, IRON.dark, a).lineBetween(s0.x, s0.y, s1.x, s1.y);
  g.lineStyle(6, IRON.body, a).lineBetween(s0.x, s0.y, s1.x, s1.y);
  // kollar: başta (R) iki yana kıvrılıp geri dönen yay + sivri tırnak
  for (const s of [-1, 1]) {
    const arm = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      return f(R * (0.92 - 0.42 * t * t), s * R * 0.46 * Math.sin(t * Math.PI * 0.62));
    });
    g.lineStyle(17, IRON.dark, a).strokePoints(arm, false);
    g.lineStyle(10, IRON.body, a).strokePoints(arm, false);
    g.lineStyle(2, IRON.edge, a * 0.45).strokePoints(arm.map((p) => ({ x: p.x, y: p.y - 3 })), false);
    const tip = arm[arm.length - 1]!;
    const t0 = arm[arm.length - 2]!;
    const dx = tip.x - t0.x;
    const dy = tip.y - t0.y;
    const L = Math.hypot(dx, dy) || 1;
    const fl = { x: tip.x + (dx / L) * 22, y: tip.y + (dy / L) * 22 };
    g.fillStyle(IRON.body, a).fillTriangle(tip.x - (dy / L) * 11, tip.y + (dx / L) * 11, tip.x + (dy / L) * 11, tip.y - (dx / L) * 11, fl.x, fl.y);
    g.lineStyle(1.4, IRON.dark, a).strokeTriangle(tip.x - (dy / L) * 11, tip.y + (dx / L) * 11, tip.x + (dy / L) * 11, tip.y - (dx / L) * 11, fl.x, fl.y);
  }
  const crown = f(R * 0.92, 0);
  g.fillStyle(IRON.body, a).fillCircle(crown.x, crown.y, 13);
  g.lineStyle(1.6, IRON.dark, a).strokeCircle(crown.x, crown.y, 13);
  void ang;
}

/** Göbek noktası: birimin gövdesinde bir yer (oran: x = -1 saldırgan tarafı .. +1 arka, y = -1 baş .. +1 ayak). */
export function bodyAt(k: VfxKit, v: CombatantView, dir: number, x: number, y: number): Pt {
  const b = k.spot(v);
  return { x: b.x + dir * x * v.w * 0.5, y: b.y + y * v.h * 0.5 };
}

/** Vuruş sonrası ince soluk "basınç" halkası (fiziksel darbe; normal karışım, toz rengi). */
export function shockRing(c: VfxCtx, k: VfxKit, p: Pt, r: number, depth: number, o: { flat?: number; col?: string; a?: number; dur?: number; w?: number } = {}): void {
  const col = C(o.col ?? '#cbbba6');
  layer(c, k.slow(o.dur ?? 260), depth, (g, _tm, u) => {
    const e = eo(u, 2.6);
    const rr = r * (0.25 + 0.75 * e);
    g.lineStyle(Math.max(1, (o.w ?? 5) * (1 - u)), col, (o.a ?? 0.45) * (1 - u) ** 1.4).strokeEllipse(p.x, p.y, rr * 2, rr * 2 * (o.flat ?? 1));
  });
}

/** Hücre derinliği (zemin noktası -> o hücredeki birimin hemen üstü). */
export const cellDepth = (p: Pt, d = 1): number => p.y + CELL_DEPTH + d;

/** Hareket çizgileri (atılan cismin arkasında 2-3 ince soluk çizgi). */
export function speedLines(g: G, p: Pt, dirAng: number, len: number, a: number, col = C('#a49a90'), n = 3, gap = 8): void {
  const ux = Math.cos(dirAng);
  const uy = Math.sin(dirAng);
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * gap;
    const s = { x: p.x - uy * o, y: p.y + ux * o };
    const L = len * (1 - Math.abs(i - (n - 1) / 2) * 0.3);
    g.lineStyle(1.4, col, a * (1 - Math.abs(i - (n - 1) / 2) * 0.3)).lineBetween(s.x - ux * L, s.y - uy * L, s.x, s.y);
  }
}

/** Sivrilen iz (mermi kuyruğu): noktalar en yeniden eskiye. */
export function tail(g: G, pts: Pt[], w: number, col: number, a: number): void {
  if (pts.length < 2) return;
  taper(g, [...pts].reverse(), 0, w, col, a);
}

export { TAU, after };
