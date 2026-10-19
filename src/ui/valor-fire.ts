// Valor penceresi "yanan kenar" efekti (Ömer 2026-10-19: Nöbet düzeni + V1 Yanan kenar; taslak public/mockups/valor-v4.html #v1).
// Sancağa basılı tutunca düzensiz, tırtıklı bir yanma çizgisi alttan sürünerek yükselir; parlaklığı titrer, çizgiden birkaç kıvılcım uçar.
// Küçük (56x98) tuvale piksel piksel çizilir, CSS ile büyür. Reduced motion: titreme / kıvılcım yok, yalnızca sakin yükselen kenar.
export const FIRE_W = 56;
export const FIRE_H = 98;
const AMP = 0.55;

const hash = (x: number, y: number, z: number): number => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const sm = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
function vn(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = sm(x - xi);
  const fy = sm(y - yi);
  const fz = sm(z - zi);
  const a = lerp(lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), fx), lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), fx), fy);
  const b = lerp(lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), fx), lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), fx), fy);
  return lerp(a, b, fz);
}
const fbm = (x: number, y: number, z: number): number => vn(x, y, z) * 0.62 + vn(x * 2.1 + 7, y * 2.1 + 3, z * 1.3) * 0.38;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

/** Bir sancağın yanma tuvali: `draw(p, nowMs)` p = 0..1 ilerleme; `clear()` temizler. */
export class BurnEdge {
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly img: ImageData | null;
  private sparks: Spark[] = [];
  private last = 0;

  constructor(
    cv: HTMLCanvasElement,
    private readonly quiet: () => boolean,
  ) {
    cv.width = FIRE_W;
    cv.height = FIRE_H;
    this.ctx = cv.getContext('2d');
    this.img = this.ctx?.createImageData(FIRE_W, FIRE_H) ?? null;
  }

  draw(p: number, now: number): void {
    const { ctx, img } = this;
    if (!ctx || !img) return;
    const quiet = this.quiet();
    const t = quiet ? 0 : now / 1000;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
    this.last = now;
    const px = img.data;
    const s = p * (1 + AMP) - AMP / 2;
    for (let y = 0; y < FIRE_H; y++) {
      const yb = 1 - y / (FIRE_H - 1);
      for (let x = 0; x < FIRE_W; x++) {
        const n = fbm(x * 0.1, y * 0.05, t * 0.9);
        const d = s - (yb + (n - 0.5) * AMP);
        const i = (y * FIRE_W + x) * 4;
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        if (p > 0 && d > -0.07) {
          const fl = quiet ? 0.9 : 0.72 + 0.28 * vn(t * 9, x * 0.35, 5);
          if (d < 0) {
            r = 255;
            g = 130;
            b = 40;
            a = (1 + d / 0.07) * 0.35 * fl;
          } else if (d < 0.045) {
            r = 255;
            g = 225;
            b = 140;
            a = 0.95 * fl;
          } else if (d < 0.17) {
            const u = (d - 0.045) / 0.125;
            r = 255;
            g = 170 - 70 * u;
            b = 50 - 20 * u;
            a = (0.8 - 0.4 * u) * fl;
          } else {
            const hole = vn(x * 0.45, y * 0.3, t * 2.5);
            a = hole > 0.68 ? 0.05 : Math.max(0.1, 0.34 * Math.exp(-(d - 0.17) * 4)) * fl;
            r = 235;
            g = 95;
            b = 30;
          }
        }
        px[i] = r;
        px[i + 1] = g;
        px[i + 2] = b;
        px[i + 3] = Math.min(255, a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    if (quiet) return;
    // kıvılcımlar: yanma çizgisinden yukarı uçar (kısa ömürlü, tek piksel)
    const edgeY = FIRE_H * (1 - Math.min(1, p));
    if (Math.random() < 0.16) this.sparks.push({ x: Math.random() * FIRE_W, y: edgeY + Math.random() * 6, vx: (Math.random() - 0.5) * 14, vy: -(26 + Math.random() * 30), life: 0, max: 0.6 + Math.random() * 0.5 });
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const q = this.sparks[i]!;
      q.life += dt;
      if (q.life > q.max) {
        this.sparks.splice(i, 1);
        continue;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      const u = 1 - q.life / q.max;
      ctx.fillStyle = `rgba(255,${Math.round(150 + 90 * u)},${Math.round(50 + 60 * u)},${0.95 * u})`;
      ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
    }
  }

  clear(): void {
    this.sparks.length = 0;
    this.last = 0;
    this.ctx?.clearRect(0, 0, FIRE_W, FIRE_H);
  }
}
