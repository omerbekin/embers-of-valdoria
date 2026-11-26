/**
 * Menü seçili satır işareti = "yanan fitil" (Ömer 2026-11-25, r47: mockup menu-thread V5 + "buna animasyon eklemen lazım kesinlikle").
 * Karonun yerinde kor uç yanar (hafif titrer), oradan yazının altına inen ince fitil çizgisi + sağa gevşeyen iplik; bir kıvılcım
 * fitil boyunca soldan sağa ilerler, sonda kül grisine döner. Hareketi azalt = sabit kare (t sabit).
 * Saf geometri: çizim ilkelleri (çizgi parçası / nokta) üretir; Phaser (`src/game/menu-fuse-gfx.ts`) ve DOM tuvali (`drawFuseCanvas`) aynısını çizer.
 * Kullanan yerler: ana menü satırları (MainMenuScene.makeRow), Settings sol sütunu (settings.ts > st-flame).
 */
export type Rgb = readonly [number, number, number];
export type FusePrim =
  | { k: 'seg'; x1: number; y1: number; x2: number; y2: number; w: number; c: Rgb; a: number }
  | { k: 'dot'; x: number; y: number; r: number; c: Rgb; a: number };

export interface FuseGeom {
  /** kor ucun yeri (karonun eski yeri, satır ortası) */
  hx: number;
  hy: number;
  /** fitilin yatay çizgisinin yüksekliği (yazının altı) */
  lineY: number;
  /** fitilin sağ ucu (yazının sağı + biraz) */
  xEnd: number;
  /** ölçek (masaüstü satırında ~1,4; telefon küçük) */
  u: number;
  /** telefon: iplik seyrek, duman yok */
  lite?: boolean;
}

const EMB: Rgb = [255, 179, 90];
const EMB2: Rgb = [224, 112, 42];
const GOLD: Rgb = [217, 178, 106];
const ASH: Rgb = [150, 140, 128];
const CORE: Rgb = [255, 246, 220];
const THREAD: Rgb = [214, 150, 90];

const mix = (a: Rgb, b: Rgb, p: number): Rgb => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];
/** çizgi rengi: kor (0) > altın (0,3) > kül (1) */
const lineCol = (p: number): Rgb => (p < 0.3 ? mix(EMB, GOLD, p / 0.3) : mix(GOLD, ASH, (p - 0.3) / 0.7));
const lineA = (p: number): number => (p < 0.3 ? 0.9 - p : 0.6 * (1 - (p - 0.3) / 0.7));

/** Fitil yolu (kor uçtan yazının altına kıvrılan, sonra düz giden çizgi) noktaları. */
export function fusePath(g: FuseGeom): Array<[number, number]> {
  const { hx, hy, lineY, xEnd, u } = g;
  const pts: Array<[number, number]> = [];
  const bend = 34 * u;
  for (let i = 0; i <= 8; i++) {
    const s = i / 8;
    // ikinci derece eğri: (hx,hy) > kontrol (hx+14u, lineY) > (hx+34u, lineY)
    const x = (1 - s) * (1 - s) * hx + 2 * (1 - s) * s * (hx + 14 * u) + s * s * (hx + bend);
    const y = (1 - s) * (1 - s) * hy + 2 * (1 - s) * s * lineY + s * s * lineY;
    pts.push([x, y]);
  }
  const n = Math.max(2, Math.round((xEnd - hx - bend) / (g.lite ? 10 : 6)));
  for (let i = 1; i <= n; i++) pts.push([hx + bend + ((xEnd - hx - bend) * i) / n, lineY]);
  return pts;
}

/** Kor titreşimi (0,72..1): iki sinüs toplamı, düzensiz görünür ama seed / rastgele gerektirmez. */
export const fuseFlicker = (t: number): number => 0.86 + 0.09 * Math.sin(t * 9.1) + 0.05 * Math.sin(t * 13.7 + 1.3);

/** t saniyesindeki çizim ilkelleri. */
export function fusePrims(g: FuseGeom, t: number): FusePrim[] {
  const out: FusePrim[] = [];
  const { hx, hy, lineY, xEnd, u, lite } = g;
  const w = Math.max(1, 1.2 * u);
  const path = fusePath(g);
  // uzunluk boyunca oran (p) hesabı
  const len: number[] = [0];
  for (let i = 1; i < path.length; i++) len.push(len[i - 1]! + Math.hypot(path[i]![0] - path[i - 1]![0], path[i]![1] - path[i - 1]![1]));
  const total = len[len.length - 1]! || 1;
  for (let i = 1; i < path.length; i++) {
    const p = len[i]! / total;
    out.push({ k: 'seg', x1: path[i - 1]![0], y1: path[i - 1]![1], x2: path[i]![0], y2: path[i]![1], w, c: lineCol(p), a: Math.max(0, lineA(p)) });
  }
  // gevşek iplik: çizginin düz kısmında sarmal (ön yarı parlak, arka yarı sönük), soldan sağa yavaş akar
  const x0 = hx + 30 * u;
  if (xEnd > x0 + 8) {
    const step = lite ? 3 : 1.6;
    const lam = 110 * u;
    let prev: [number, number] | null = null;
    for (let x = x0; x <= xEnd; x += step) {
      const p = (x - x0) / (xEnd - x0);
      const amp = 4.5 * u * (1 - 0.55 * p);
      const th = ((x - x0) / lam) * Math.PI * 2 - t * 0.9;
      const y = lineY + amp * Math.sin(th);
      const front = Math.cos(th) > 0;
      if (prev) {
        out.push({ k: 'seg', x1: prev[0], y1: prev[1], x2: x, y2: y, w: Math.max(0.8, 1.2 * u * (front ? 1 : 0.7) * (1 - 0.4 * p)), c: front ? THREAD : ASH, a: Math.max(0, (1 - Math.pow(p, 1.6)) * (front ? 0.95 : 0.35)) });
      }
      prev = [x, y];
    }
  }
  // kıvılcım: fitil boyunca kor uçtan sağa ilerler (2,2 sn'de bir), ilerledikçe söner
  const sp = (t / 2.2) % 1;
  const at = sp * total;
  let k = 1;
  while (k < len.length - 1 && len[k]! < at) k++;
  const seg = len[k]! - len[k - 1]! || 1;
  const f = (at - len[k - 1]!) / seg;
  const sx = path[k - 1]![0] + (path[k]![0] - path[k - 1]![0]) * f;
  const sy = path[k - 1]![1] + (path[k]![1] - path[k - 1]![1]) * f;
  const life = 1 - sp;
  out.push({ k: 'dot', x: sx, y: sy, r: 3.6 * u * (0.5 + 0.5 * life), c: EMB2, a: 0.28 * life });
  out.push({ k: 'dot', x: sx, y: sy, r: 1.4 * u * (0.6 + 0.4 * life), c: CORE, a: 0.95 * life });
  // kor uç: titreyen ışıma + parlak çekirdek
  const fl = fuseFlicker(t);
  out.push({ k: 'dot', x: hx, y: hy, r: 9 * u * fl, c: EMB2, a: 0.18 * fl });
  out.push({ k: 'dot', x: hx, y: hy, r: 5.5 * u * fl, c: EMB, a: 0.42 * fl });
  out.push({ k: 'dot', x: hx, y: hy, r: 3.2 * u, c: EMB, a: 0.9 });
  out.push({ k: 'dot', x: hx, y: hy, r: 1.9 * u, c: CORE, a: 1 });
  // ince duman (telefonda yok)
  if (!lite) {
    for (let i = 0; i < 2; i++) {
      const p = (t * 0.35 + i / 2) % 1;
      out.push({ k: 'dot', x: hx + Math.sin(p * 6 + i) * 3 * u, y: hy - p * 20 * u, r: (1.4 + p * 2.6) * u, c: ASH, a: 0.2 * (1 - p) });
    }
  }
  return out;
}

/** DOM tuvaline çizer (Settings sol sütunu). */
export function drawFuseCanvas(ctx: CanvasRenderingContext2D, prims: FusePrim[]): void {
  ctx.lineCap = 'round';
  for (const p of prims) {
    const col = `rgba(${Math.round(p.c[0])},${Math.round(p.c[1])},${Math.round(p.c[2])},${p.a.toFixed(3)})`;
    if (p.k === 'seg') {
      ctx.strokeStyle = col;
      ctx.lineWidth = p.w;
      ctx.beginPath();
      ctx.moveTo(p.x1, p.y1);
      ctx.lineTo(p.x2, p.y2);
      ctx.stroke();
    } else {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.3, p.r), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export const rgbHex = (c: Rgb): number => (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);
