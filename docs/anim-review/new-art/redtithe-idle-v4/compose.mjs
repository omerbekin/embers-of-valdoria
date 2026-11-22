// Redtithe idle v4 birleştirici: üretilen düzenlemeyi bugünkü idle1'e hizalar ve
// YALNIZ arka önkol bölgesinden (ROI) değişen pikselleri alır; ROI dışı bugünkü kareyle bire bir aynı.
// Kullanım (worktree kökünden): node docs/anim-review/new-art/redtithe-idle-v4/compose.mjs <uretilen.png> <cikti.png> [--base <taban.png>]
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const bi = args.indexOf('--base');
const BASE = bi >= 0 ? args[bi + 1] : join(HERE, 'refs', 'base-idle1.png');
const fi = args.indexOf('--fist');
const FIST = fi >= 0 ? args[fi + 1].split(',').map(Number) : null;
const [GEN, OUT] = args.filter((a, i) => !a.startsWith('--') && (bi < 0 || i !== bi + 1) && (fi < 0 || i !== fi + 1));
if (!GEN || !OUT) { console.error('kullanım: compose.mjs <uretilen.png> <cikti.png> [--base taban.png]'); process.exit(2); }

// ROI: dirsekten (kol kıvrımı, y~153) aşağısı, arka kolun eski ve yeni yeri + kese/kemer önü.
const ROI = { x0: 96, y0: 152, x1: 246, y1: 248 };
const inRoi = (x, y) => x >= ROI.x0 && x < ROI.x1 && y >= ROI.y0 && y < ROI.y1;
const THR = 70;      // RGB mutlak fark toplamı (ya da alfa farkı*3) eşiği
const MIN_CC = 30;   // daha küçük değişen adacıklar (gürültü) atılır
const DILATE = 2;

const base = await sharp(BASE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = base.info.width, H = base.info.height, B = base.data;

// Üretilen görsel: alfa yoksa köşe renginden arka planı anahtarla.
let g = await sharp(GEN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
{
  const d = g.data, gw = g.info.width, gh = g.info.height;
  let opaque = true;
  for (let i = 3; i < d.length; i += 4 * 97) if (d[i] < 250) { opaque = false; break; }
  if (opaque) {
    const c = [0, gw - 1, (gh - 1) * gw, gh * gw - 1].map((p) => [d[p * 4], d[p * 4 + 1], d[p * 4 + 2]]);
    const bg = [0, 1, 2].map((k) => c.reduce((s, v) => s + v[k], 0) / 4);
    for (let p = 0; p < gw * gh; p++) {
      const dd = Math.abs(d[p * 4] - bg[0]) + Math.abs(d[p * 4 + 1] - bg[1]) + Math.abs(d[p * 4 + 2] - bg[2]);
      if (dd < 40) d[p * 4 + 3] = 0;
    }
    console.log('not: üretilen görselde alfa yoktu, arka plan köşe renginden anahtarlandı', bg.map(Math.round));
  }
}
const bbox = (data, w, h) => {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
};
const bb = bbox(B, W, H);
const gb = bbox(g.data, g.info.width, g.info.height);
const genTrim = await sharp(g.data, { raw: g.info }).extract({ left: gb.x0, top: gb.y0, width: gb.w, height: gb.h }).png().toBuffer();

// Taban örnek noktaları (ROI dışı, opak ya da kenar), her 3 px.
const samples = [];
for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (!inRoi(x, y)) samples.push(y * W + x);

const render = async (s) => {
  const nw = Math.max(1, Math.round(gb.w * s)), nh = Math.max(1, Math.round(gb.h * s));
  const r = await sharp(genTrim).resize(nw, nh, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  return r;
};
const cost = (r, ox, oy) => {
  const rw = r.info.width, rh = r.info.height, R = r.data;
  let sum = 0;
  for (const p of samples) {
    const x = p % W, y = (p / W) | 0;
    const gx = x - ox, gy = y - oy;
    let gr = 0, gg = 0, gbv = 0, ga = 0;
    if (gx >= 0 && gy >= 0 && gx < rw && gy < rh) { const q = (gy * rw + gx) * 4; gr = R[q]; gg = R[q + 1]; gbv = R[q + 2]; ga = R[q + 3]; }
    const ba = B[p * 4 + 3];
    if (ba < 20 && ga < 20) continue;
    sum += Math.abs(B[p * 4] * ba - gr * ga) / 255 + Math.abs(B[p * 4 + 1] * ba - gg * ga) / 255 + Math.abs(B[p * 4 + 2] * ba - gbv * ga) / 255 + Math.abs(ba - ga);
  }
  return sum / samples.length;
};

const s0 = bb.h / gb.h;
let best = { c: Infinity };
for (let k = -10; k <= 10; k++) {
  const s = s0 * (1 + k * 0.006);
  const r = await render(s);
  const oy0 = bb.y1 + 1 - r.info.height; // tabanlar hizalı
  const ox0 = Math.round(bb.x0 + bb.w / 2 - r.info.width / 2);
  for (let dy = -10; dy <= 10; dy++) for (let dx = -24; dx <= 24; dx++) {
    const c = cost(r, ox0 + dx, oy0 + dy);
    if (c < best.c) best = { c, s, ox: ox0 + dx, oy: oy0 + dy, r };
  }
}
const r = best.r, rw = r.info.width, rh = r.info.height, R = r.data;
const G = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const gx = x - best.ox, gy = y - best.oy;
  if (gx >= 0 && gy >= 0 && gx < rw && gy < rh) R.copy(G, (y * W + x) * 4, (gy * rw + gx) * 4, (gy * rw + gx) * 4 + 4);
}

// ROI içinde değişen pikseller.
let mask = new Uint8Array(W * H);
for (let y = ROI.y0; y < ROI.y1; y++) for (let x = ROI.x0; x < ROI.x1; x++) {
  const p = y * W + x, ba = B[p * 4 + 3], ga = G[p * 4 + 3];
  const d = Math.abs(B[p * 4] * ba - G[p * 4] * ga) / 255 + Math.abs(B[p * 4 + 1] * ba - G[p * 4 + 1] * ga) / 255 + Math.abs(B[p * 4 + 2] * ba - G[p * 4 + 2] * ga) / 255 + Math.abs(ba - ga) * 3;
  if (d > THR) mask[p] = 1;
}
// Küçük adacıkları at.
const seen = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) if (mask[p] && !seen[p]) {
  const st = [p], comp = []; seen[p] = 1;
  while (st.length) { const q = st.pop(); comp.push(q); const x = q % W, y = (q / W) | 0;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + ax, ny = y + ay; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n = ny * W + nx; if (mask[n] && !seen[n]) { seen[n] = 1; st.push(n); } } }
  if (comp.length < MIN_CC) for (const q of comp) mask[q] = 0;
}
for (let i = 0; i < DILATE; i++) {
  const m2 = mask.slice();
  for (let y = ROI.y0; y < ROI.y1; y++) for (let x = ROI.x0; x < ROI.x1; x++) { const p = y * W + x; if (mask[p]) continue;
    if ((x > 0 && mask[p - 1]) || (x < W - 1 && mask[p + 1]) || (y > 0 && mask[p - W]) || (y < H - 1 && mask[p + W])) m2[p] = 1; }
  mask = m2;
}
// --fist x,y verilirse: maske iki kapsülle sınırlanır (dirsek->eski yumruk, dirsek->yeni yumruk); kese/kuşak gibi yan değişiklikler tabana döner.
if (FIST) {
  const ELBOW = [160, 156], OLD = [130, 230], R = 17;
  const segD = (px, py, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy))); return Math.hypot(px - a[0] - t * vx, py - a[1] - t * vy); };
  for (let y = ROI.y0; y < ROI.y1; y++) for (let x = ROI.x0; x < ROI.x1; x++) { const p = y * W + x; if (mask[p] && segD(x, y, ELBOW, OLD) > R && segD(x, y, ELBOW, FIST) > R) mask[p] = 0; }
}
const O = Buffer.from(B);
let taken = 0;
for (let p = 0; p < W * H; p++) if (mask[p]) { G.copy(O, p * 4, p * 4, p * 4 + 4); taken++; }
// Doğrulama: ROI dışı fark 0 olmalı.
let outside = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!inRoi(x, y)) { const p = (y * W + x) * 4; if (O[p] !== B[p] || O[p + 1] !== B[p + 1] || O[p + 2] !== B[p + 2] || O[p + 3] !== B[p + 3]) outside++; }
await sharp(O, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT);
console.log(JSON.stringify({ out: OUT, scale: +best.s.toFixed(4), offset: [best.ox, best.oy], fitCost: +best.c.toFixed(2), roi: ROI, pixelsTakenFromEdit: taken, outsideRoiDiff: outside }));
if (best.c > 15) console.log('UYARI: hizalama kötü (fitCost > 15); düzenleme ROI dışında figürü de değiştirmiş, sonuç ek yerinden kopuk olabilir.');
if (outside) process.exit(1);
