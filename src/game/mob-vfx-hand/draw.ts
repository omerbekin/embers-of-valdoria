/**
 * El yapımı mob efektlerinin ÇİZİM PARÇALARI (her karede bir Graphics'e çizilir): yerel çerçeve (silah/yaratık şekilleri), sivrilen çizgi,
 * hilal hareket izi, alev dili (katmanlı, titreşen; neon değil), zemin rün dairesi (Glyph dili), ışık sütunu, zincir, çatlak, leke / su
 * birikintisi, sarmal şerit, kuş silueti. Renkler çağıranda; burada yalnızca biçim.
 */
import { C, FLAT, TAU, clamp01, lerp, wob, type G, type Pt, type VfxKit } from './core';

// ---------------------------------------------------------------------------------------------------------------------
// yerel çerçeve: (x boyunca, y dik) -> dünya. `sy` = -1 aynalar (saldırgan yönü).

export type Xf = (x: number, y: number) => Pt;
export function xf(P: Pt, ang: number, sy = 1): Xf {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return (x, y) => ({ x: P.x + c * x - s * y * sy, y: P.y + s * x + c * y * sy });
}
export const poly = (f: Xf, pts: ReadonlyArray<readonly [number, number]>): Pt[] => pts.map(([x, y]) => f(x, y));

/** Düzensiz birim halka (leke, birikinti, taş disk): `n` köşe, yarıçap 1 +- j. */
export function blob(k: VfxKit, n: number, j: number): number[] {
  return Array.from({ length: n }, () => 1 + k.rnd(-j, j));
}
/** Merkezden yıldız biçimli (leke, birikinti) çokgen: üçgen yelpazesiyle (üçgenleme yok, ucuz). */
export function fan(g: G, C0: Pt, pts: Pt[], col: number, a: number): void {
  if (a <= 0.005 || pts.length < 3) return;
  g.fillStyle(col, a);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    g.fillTriangle(C0.x, C0.y, p.x, p.y, q.x, q.y);
  }
}

/** blob'u elips olarak çizilecek noktalara çevirir. */
export function blobPts(C0: Pt, rx: number, ry: number, rs: number[], rot = 0): Pt[] {
  const n = rs.length;
  return rs.map((r, i) => {
    const a = (i / n) * TAU + rot;
    return { x: C0.x + Math.cos(a) * rx * r, y: C0.y + Math.sin(a) * ry * r };
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// çizgiler

/**
 * İki kenar dizisi arasını üçgen şeridiyle doldurur (çokgen üçgenlemesi YOK: fillPoints'e göre çok ucuz; alev, şerit, iz gibi her karede
 * yüzlerce kez çizilen şekiller için). L ve R aynı uzunlukta.
 */
export function strip(g: G, L: Pt[], R: Pt[], col: number, a: number): void {
  if (a <= 0.005) return;
  g.fillStyle(col, a);
  for (let i = 0; i < L.length - 1; i++) {
    const l0 = L[i]!;
    const l1 = L[i + 1]!;
    const r0 = R[i]!;
    const r1 = R[i + 1]!;
    g.fillTriangle(l0.x, l0.y, r0.x, r0.y, l1.x, l1.y);
    g.fillTriangle(r0.x, r0.y, r1.x, r1.y, l1.x, l1.y);
  }
}

/** Sivrilen şerit: `pts` boyunca kalınlık w0 -> w1 (dolu çokgen). */
export function taper(g: G, pts: Pt[], w0: number, w1: number, col: number, a: number, wf?: (s: number) => number): void {
  const n = pts.length;
  if (n < 2 || a <= 0.005) return;
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const q = pts[Math.min(n - 1, i + 1)]!;
    const o = pts[Math.max(0, i - 1)]!;
    let dx = q.x - o.x;
    let dy = q.y - o.y;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const s = i / (n - 1);
    const w = (wf ? wf(s) : lerp(w0, w1, s)) / 2;
    L.push({ x: p.x - dy * w, y: p.y + dx * w });
    R.push({ x: p.x + dy * w, y: p.y - dx * w });
  }
  strip(g, L, R, col, a);
}

/**
 * Hilal hareket izi: merkez `P`, yarıçap `r`, açı a0 -> a1 (baş a1'de). Kalınlık başta `w`, kuyrukta 0; `flat` dikey basıklık
 * (zemine yatan iz için FLAT). Fiziksel silah izi için soluk gri, büyü için renkli.
 */
export function crescent(g: G, P: Pt, r: number, a0: number, a1: number, w: number, col: number, a: number, flat = 1, n = 18): void {
  if (Math.abs(a1 - a0) < 0.01 || a <= 0.005) return;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = a0 + ((a1 - a0) * i) / n;
    return { x: P.x + Math.cos(t) * r, y: P.y + Math.sin(t) * r * flat };
  });
  taper(g, pts, 0, w, col, a, (s) => w * s ** 1.4 * (s > 0.92 ? (1 - s) / 0.08 * 0.6 + 0.4 : 1));
}

/** Elips halka (zemin). */
export const ring = (g: G, P: Pt, r: number, w: number, col: number, a: number, flat = FLAT): void => {
  if (a > 0.005 && r > 0.5) g.lineStyle(w, col, a).strokeEllipse(P.x, P.y, r * 2, r * 2 * flat);
};

/** Elips yayı (zemin rün dairesinin dönen parçaları). */
export function arcPts(P: Pt, r: number, a0: number, a1: number, flat = FLAT, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = a0 + ((a1 - a0) * i) / n;
    return { x: P.x + Math.cos(t) * r, y: P.y + Math.sin(t) * r * flat };
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// alev

export interface FirePal {
  dark: number;
  red: number;
  orange: number;
  yellow: number;
  core: number;
}
/** Gerçekçi ateş: koyu kızıl kenar, turuncu gövde, sarı iç, çok küçük açık çekirdek (ADD yok). */
export const FIRE: FirePal = { dark: C('#5e1606'), red: C('#a8320c'), orange: C('#e2681c'), yellow: C('#f7aa3c'), core: C('#ffe2a0') };
/** Kutsal ateş: altın-krem. */
export const HOLYFIRE: FirePal = { dark: C('#7a4a10'), red: C('#c07a1c'), orange: C('#e8a836'), yellow: C('#f8d470'), core: C('#fff4cc') };
/** Kor ateşi (cehennemsi, koyu): Morvane. */
export const PYRE: FirePal = { dark: C('#3e0a04'), red: C('#8e1e08'), orange: C('#d0521a'), yellow: C('#f09a34'), core: C('#ffd890') };

/**
 * Tek alev dili: taban (x, y), boy h, taban eni w, zaman t (sn), tohum, yön eğimi `lean` (-1..1). Dört katman, kenarları yukarı akan
 * dalgayla titrer, uç rüzgârla salınır. `a` genel alfa.
 */
export function flame(g: G, x: number, y: number, h: number, w: number, t: number, seed: number, a = 1, lean = 0, pal: FirePal = FIRE, lite = false): void {
  if (a <= 0.01 || h < 2) return;
  const hh = h * (1 + 0.14 * wob(t * 9, seed));
  const layer = (sw: number, sh: number, col: number, al: number, n: number) => {
    const H = hh * sh;
    const W = w * sw;
    const L: Pt[] = [];
    const R: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const prof = Math.sin(Math.PI * Math.min(1, s * 0.82 + 0.18)) ** 0.75 * (1 - s) ** 0.35;
      const sway = (lean * 0.5 + 0.22 * wob(t * 6 - s * 3, seed)) * H * s * s;
      const rip = Math.sin(s * 11 - t * 16 + seed) * W * 0.07 * s;
      const cx = x + sway;
      const cy = y - H * s;
      L.push({ x: cx - (W / 2) * prof + rip, y: cy });
      R.push({ x: cx + (W / 2) * prof + rip * 0.6, y: cy });
    }
    strip(g, L, R, col, al);
  };
  if (lite) {
    // hafif sürüm (çok hücreli alanlarda: tüm tahta ateşi): üç katman, az nokta
    layer(1, 1, pal.dark, 0.45 * a, 6);
    layer(0.8, 0.85, pal.orange, 0.78 * a, 6);
    layer(0.42, 0.5, pal.yellow, 0.75 * a, 5);
    return;
  }
  layer(1.3, 1.08, pal.dark, 0.16 * a, 8); // yumuşak dış hale (sıcak hava)
  layer(1, 1, pal.dark, 0.42 * a, 9);
  layer(0.86, 0.9, pal.red, 0.72 * a, 9);
  layer(0.66, 0.74, pal.orange, 0.8 * a, 8);
  layer(0.42, 0.52, pal.yellow, 0.78 * a, 7);
  layer(0.2, 0.26, pal.core, 0.65 * a, 5);
}

/** Alev yatağı: dillerin konumları bir kez üretilir (y'ye göre sıralı), her kare ölçek / alfa ile çizilir. */
export interface Tongue {
  x: number;
  y: number;
  h: number;
  w: number;
  seed: number;
  /** Bu dilin büyümeye başladığı oran (0-1). */
  at: number;
}
export function tongues(k: VfxKit, n: number, P: Pt, rx: number, ry: number, h: [number, number], w: [number, number]): Tongue[] {
  return Array.from({ length: n }, () => {
    const a = k.rnd(0, TAU);
    const r = Math.sqrt(k.rnd(0, 1));
    const edge = 1 - r * 0.5; // ortadakiler uzun
    return { x: P.x + Math.cos(a) * rx * r, y: P.y + Math.sin(a) * ry * r, h: k.rnd(h[0], h[1]) * edge, w: k.rnd(w[0], w[1]), seed: k.rnd(0, 100), at: k.rnd(0, 1) };
  }).sort((p, q) => p.y - q.y);
}
export function fireBed(g: G, list: Tongue[], t: number, grow: number, a: number, lean = 0, pal: FirePal = FIRE, lite = false): void {
  for (const f of list) {
    const gg = clamp01((grow - f.at * 0.5) / 0.5);
    if (gg <= 0) continue;
    flame(g, f.x, f.y, f.h * gg, f.w * (0.5 + 0.5 * gg), t, f.seed, a, lean, pal, lite);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// zemin büyüsü (Glyph dili): dış/iç halka, dönen rün çentikleri, dönen yay parçaları, ortada şekil

export interface SigilOpt {
  /** Ana renk, açık renk, koyu (geniş hale) renk. */
  col: number;
  pale: number;
  deep: number;
  /** Dönüş (rad). */
  rot: number;
  /** Görünürlük 0-1. */
  a: number;
  /** Ek parlaklık (vuruş anı) 0-1. */
  flare?: number;
  /** Rün çentiği sayısı (0 = yok). */
  ticks?: number;
  inner?: 'diamond' | 'cross' | 'star' | 'tri' | 'none' | 'eye' | 'sun';
  flat?: number;
  /** Dönen yay parçası sayısı. */
  arcs?: number;
}
export function sigil(g: G, P: Pt, R: number, o: SigilOpt): void {
  const flat = o.flat ?? FLAT;
  const a = o.a;
  if (a <= 0.01) return;
  const fl = o.flare ?? 0;
  const e = (an: number, r: number): Pt => ({ x: P.x + Math.cos(an) * r, y: P.y + Math.sin(an) * r * flat });
  g.lineStyle(R * 0.11, o.deep, a * 0.28).strokeEllipse(P.x, P.y, R * 2, R * 2 * flat);
  g.lineStyle(Math.max(2, R * 0.03), o.col, a * 0.95).strokeEllipse(P.x, P.y, R * 2, R * 2 * flat);
  g.lineStyle(Math.max(1.2, R * 0.014), o.pale, a * (0.45 + 0.55 * fl)).strokeEllipse(P.x, P.y, R * 1.94, R * 1.94 * flat);
  g.lineStyle(Math.max(1.5, R * 0.022), o.col, a * 0.8).strokeEllipse(P.x, P.y, R * 1.3, R * 1.3 * flat);
  const n = o.ticks ?? 12;
  for (let i = 0; i < n; i++) {
    const an = (i / n) * TAU + o.rot;
    const p0 = e(an, R * 0.68);
    const p1 = e(an, R * 0.92);
    g.lineStyle(Math.max(1.5, R * 0.02), o.pale, a * 0.8).lineBetween(p0.x, p0.y, p1.x, p1.y);
    const m = e(an, R * 0.8);
    const t2 = e(an + 0.09, R * (i % 3 === 0 ? 0.87 : i % 3 === 1 ? 0.73 : 0.8));
    g.lineStyle(Math.max(1.2, R * 0.017), o.col, a * 0.8).lineBetween(m.x, m.y, t2.x, t2.y);
  }
  const arcs = o.arcs ?? 3;
  for (let i = 0; i < arcs; i++) {
    const a0 = -o.rot * 1.6 + (i * TAU) / arcs;
    g.lineStyle(Math.max(1.5, R * 0.022), o.col, a * 0.65).strokePoints(arcPts(P, R * 1.12, a0, a0 + 0.85, flat, 10), false);
  }
  const d = R * 0.34;
  const shape = o.inner ?? 'diamond';
  const pts: Pt[] | null =
    shape === 'diamond'
      ? [e(0, d), e(Math.PI / 2, d * 1.25), e(Math.PI, d), e(-Math.PI / 2, d * 1.25)]
      : shape === 'tri'
        ? [0, 1, 2].map((i) => e(o.rot * 0.5 + (i * TAU) / 3 - Math.PI / 2, d * 1.3))
        : shape === 'star'
          ? Array.from({ length: 10 }, (_, i) => e(-Math.PI / 2 + (i * TAU) / 10 + o.rot * 0.3, i % 2 ? d * 0.5 : d * 1.35))
          : null;
  if (pts) {
    g.fillStyle(o.col, a * (0.14 + 0.45 * fl)).fillPoints(pts, true);
    g.lineStyle(Math.max(1.5, R * 0.022), o.pale, a).strokePoints(pts, true);
  } else if (shape === 'cross' || shape === 'sun') {
    const L = d * 1.6;
    for (const an of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const q = e(an, L);
      g.lineStyle(Math.max(2, R * 0.03), o.pale, a).lineBetween(P.x, P.y, q.x, q.y);
    }
    if (shape === 'sun') g.lineStyle(Math.max(1.5, R * 0.02), o.col, a).strokeEllipse(P.x, P.y, d * 1.4, d * 1.4 * flat);
  } else if (shape === 'eye') {
    const L = d * 1.5;
    const up = Array.from({ length: 9 }, (_, i) => {
      const s = i / 8;
      return { x: P.x - L + 2 * L * s, y: P.y - Math.sin(Math.PI * s) * L * 0.55 * flat };
    });
    const dn = up.map((p) => ({ x: p.x, y: 2 * P.y - p.y }));
    g.lineStyle(Math.max(1.5, R * 0.022), o.pale, a).strokePoints(up, false).strokePoints(dn, false);
    g.fillStyle(o.col, a * (0.5 + 0.5 * fl)).fillEllipse(P.x, P.y, L * 0.5, L * 0.5 * flat * 1.4);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// ışık sütunu: yumuşak kenarlı dikey ışık (alt dolgun, üst söner)

export function column(g: G, x: number, yBase: number, h: number, w: number, col: number, core: number, a: number): void {
  if (a <= 0.01 || h < 2) return;
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const y0 = yBase - (h * i) / segs;
    const y1 = yBase - (h * (i + 1)) / segs;
    const f = (1 - i / segs) ** 1.2;
    g.fillStyle(col, a * 0.22 * f).fillRect(x - w, y1, w * 2, y0 - y1);
    g.fillStyle(col, a * 0.38 * f).fillRect(x - w * 0.55, y1, w * 1.1, y0 - y1);
    g.fillStyle(core, a * 0.55 * f).fillRect(x - w * 0.16, y1, w * 0.32, y0 - y1);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// zincir: çizgi boyunca halkalar (bir yüzden, bir yandan görünür; koyu demir + ince açık kenar)

export function chain(g: G, pts: Pt[], link: number, th: number, body: number, dark: number, hi: number, a: number): void {
  if (pts.length < 2 || a <= 0.01) return;
  let acc = 0;
  let idx = 0;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!;
    const q = pts[i]!;
    const L = Math.hypot(q.x - p.x, q.y - p.y);
    if (L < 0.01) continue;
    const ang = Math.atan2(q.y - p.y, q.x - p.x);
    while (acc <= L) {
      const u = acc / L;
      const cx = lerp(p.x, q.x, u);
      const cy = lerp(p.y, q.y, u);
      const f = xf({ x: cx, y: cy }, ang);
      if (idx % 2 === 0) {
        // yüzden görünen halka (oval)
        const o = Array.from({ length: 10 }, (_, j) => f(Math.cos((j / 10) * TAU) * link * 0.62, Math.sin((j / 10) * TAU) * th * 1.15));
        g.lineStyle(th * 0.62, dark, a).strokePoints(o, true);
        g.lineStyle(th * 0.34, body, a).strokePoints(o, true);
        const hp = o.slice(6, 9);
        g.lineStyle(1.1, hi, a * 0.6).strokePoints(hp, false);
      } else {
        // yandan görünen halka (kalın çubuk)
        const A = f(-link * 0.6, 0);
        const B = f(link * 0.6, 0);
        g.lineStyle(th * 0.85, dark, a).lineBetween(A.x, A.y, B.x, B.y);
        g.lineStyle(th * 0.45, body, a).lineBetween(A.x, A.y, B.x, B.y);
      }
      idx++;
      acc += link;
    }
    acc -= L;
  }
}

/** a'dan b'ye sarkan eğri (zincir / ip): `sag` px aşağı. */
export function sagLine(a: Pt, b: Pt, sag: number, n = 14): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = i / n;
    return { x: lerp(a.x, b.x, s), y: lerp(a.y, b.y, s) + Math.sin(Math.PI * s) * sag };
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// çatlak

export interface Crack {
  main: Pt[];
  branches: Array<{ at: number; pts: Pt[] }>;
}
/** a'dan b'ye zikzak çatlak, iki küçük dal. `flat` dik sapmayı basıklaştırır (zemin). */
export function crackPath(k: VfxKit, a: Pt, b: Pt, jag = 11, flat = 0.6): Crack {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const N = 8;
  const main = Array.from({ length: N + 1 }, (_, i) => {
    const s = i / N;
    const j = i === 0 || i === N ? 0 : k.rnd(-1, 1) * jag * Math.sin(Math.PI * s);
    return { x: a.x + dx * s + nx * j, y: a.y + dy * s + ny * j * flat };
  });
  const branches = [0.35, 0.7].map((at) => {
    const p = main[Math.round(at * N)]!;
    const side = k.pick([-1, 1]);
    const bl = L * k.rnd(0.16, 0.28);
    const bx = (dx / L) * 0.55 + nx * side * 0.85;
    const by = (dy / L) * 0.55 + ny * side * 0.85 * flat;
    return { at, pts: [p, { x: p.x + bx * bl * 0.5 + k.rnd(-4, 4), y: p.y + by * bl * 0.5 }, { x: p.x + bx * bl, y: p.y + by * bl }] };
  });
  return { main, branches };
}

/** Çoklu çizginin [0, u] kısmı (uzunluğa göre). */
export function partial(pts: Pt[], u: number): Pt[] {
  if (u >= 1) return pts;
  if (u <= 0 || pts.length < 2) return [];
  const seg = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y));
  let left = seg.reduce((a, b) => a + b, 0) * u;
  const out: Pt[] = [pts[0]!];
  for (let i = 0; i < seg.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (left >= seg[i]!) {
      out.push(b);
      left -= seg[i]!;
    } else {
      const v = left / seg[i]!;
      out.push({ x: lerp(a.x, b.x, v), y: lerp(a.y, b.y, v) });
      break;
    }
  }
  return out;
}

/** Çatlak çizimi (koyu yarık + üstte soluk kenar; isteğe bağlı dipte renkli ışık). */
export function drawCrack(g: G, cr: Crack, grow: number, a: number, w: number, dark: number, lit: number, glowCol?: number, glowA = 0): void {
  const pm = partial(cr.main, grow);
  if (pm.length < 2 || a <= 0.01) return;
  if (glowCol !== undefined && glowA > 0.01) g.lineStyle(w * 2.6, glowCol, glowA * 0.35).strokePoints(pm, false);
  g.lineStyle(w, dark, a).strokePoints(pm, false);
  if (glowCol !== undefined && glowA > 0.01) g.lineStyle(Math.max(1, w * 0.45), glowCol, glowA).strokePoints(pm, false);
  g.lineStyle(1, lit, a * 0.35).strokePoints(
    pm.map((p) => ({ x: p.x, y: p.y - w * 0.6 })),
    false,
  );
  for (const br of cr.branches) {
    const pb = partial(br.pts, clamp01((grow - br.at) / (1 - br.at)));
    if (pb.length >= 2) g.lineStyle(w * 0.62, dark, a * 0.85).strokePoints(pb, false);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// sarmal şerit (gövdeye sarılıp yükselen): önden geçen kısım `front`, arkası `back`

export function spiral(
  front: G,
  back: G,
  base: Pt,
  o: { H: number; R: number; head: number; len: number; phase: number; turns: number; w: number; cols: [number, number, number]; a: number; tilt?: number; shrink?: number },
): void {
  const N = 26;
  let prev: { x: number; y: number; z: number } | null = null;
  for (let i = 0; i <= N; i++) {
    const s = o.head - o.len + (o.len * i) / N;
    if (s < 0 || s > 1.25) {
      prev = null;
      continue;
    }
    const ang = s * TAU * o.turns + o.phase;
    const rad = o.R * (1 - (o.shrink ?? 0.35) * s);
    const p = { x: base.x + Math.sin(ang) * rad, y: base.y - s * o.H + Math.cos(ang) * rad * (o.tilt ?? 0.18), z: Math.cos(ang) };
    if (prev) {
      const along = i / N;
      const a = o.a * along ** 1.2 * (s > 1 ? clamp01((1.25 - s) / 0.25) : 1);
      const g = p.z + prev.z > 0 ? front : back;
      const w = o.w * (0.3 + 0.7 * along);
      g.lineStyle(w * 1.9, o.cols[0], a * 0.4).lineBetween(prev.x, prev.y, p.x, p.y);
      g.lineStyle(w, o.cols[1], a * 0.85).lineBetween(prev.x, prev.y, p.x, p.y);
      g.lineStyle(Math.max(1.2, w * 0.3), o.cols[2], a).lineBetween(prev.x, prev.y, p.x, p.y);
    }
    prev = p;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// kuş silueti (karga / kuzgun): gövde, baş, gaga, kanatlar (çırpış `flap` -1..1), kuyruk; `dir` baktığı yön

export function bird(g: G, x: number, y: number, s: number, flap: number, dir: number, body: number, rim: number, a: number, tilt = 0): void {
  if (a <= 0.01) return;
  const f = xf({ x, y }, tilt * dir, 1);
  const P = (px: number, py: number) => f(px * dir * s, py * s);
  const wingY = -flap * 1.05;
  const wing = (side: number) => [P(-0.15, -0.05), P(-0.55, wingY * 0.55 - 0.15 * side), P(-1.15, wingY - 0.1 * side), P(-0.95, wingY * 0.7 + 0.12), P(-0.6, wingY * 0.3 + 0.18), P(0.2, 0.08)];
  // arka kanat (biraz koyu, geride)
  g.fillStyle(body, a * 0.75).fillPoints(wing(-1).map((p) => ({ x: p.x + dir * s * 0.12, y: p.y - s * 0.08 })), true);
  // gövde + kuyruk
  g.fillStyle(body, a).fillEllipse(x - dir * s * 0.05, y, s * 1.15, s * 0.42);
  g.fillPoints([P(-0.5, -0.06), P(-1.05, -0.2), P(-1.1, 0.12), P(-0.5, 0.1)], true);
  // baş + gaga
  g.fillCircle(P(0.52, -0.1).x, P(0.52, -0.1).y, s * 0.2);
  g.fillPoints([P(0.66, -0.16), P(0.98, -0.04), P(0.66, 0.0)], true);
  // ön kanat
  g.fillStyle(body, a).fillPoints(wing(1), true);
  g.lineStyle(Math.max(1, s * 0.05), rim, a * 0.55).strokePoints(wing(1).slice(1, 4), false);
}
