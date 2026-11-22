// Redtithe step1 v3 birleştirici (v2'nin kopyası; v3 farkı: arka kol kutusu kuşak ucunu (x>=135, y>=212) almaz, kuşak kenarında çentik kalıyordu).
// Eski başlık: Redtithe step1 v2 birleştirici (Ömer 2026-11-21: "boyun fıtığı gibi, biraz dik dursun").
// Düzenlemeyi bugünkü step1 (b5caed38, refs/base-step1-r2.png) karesine kemer altı + bacaklardan hizalar;
// MASKE içindeki (kemer üstü gövde, baş, örgü üstü, iki kol ve yumruklar) TÜM pikselleri düzenlemeden, gerisini tabandan alır.
// Ek yeri denetimi: maske sınırındaki 3 px şeritte taban ile düzenleme farkı (seam) yazılır; yüksekse aday elenir.
// Kullanım (worktree kökünden): node docs/anim-review/new-art/redtithe-step1-v3/compose.mjs <uretilen.png> <cikti.png> [--mask maske.png]
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const mi = args.indexOf('--mask');
const MASK_OUT = mi >= 0 ? args[mi + 1] : null;
const [GEN, OUT] = args.filter((a, i) => !a.startsWith('--') && (mi < 0 || i !== mi + 1));
if (!GEN || !OUT) { console.error('kullanım: compose.mjs <uretilen.png> <cikti.png> [--mask maske.png]'); process.exit(2); }

const BELT_Y = 182;
// Maske: kemer üstü her şey + iki kol bölgesi (yumruklar dahil) + ön önkol kapsülü (dirsek -> yumruk, kemer çizgisini kesen önkol ek yeri
// vermesin diye); kese, kuşak, kâse, bacaklar tabandan.
const segD = (px, py, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy))); return Math.hypot(px - a[0] - t * vx, py - a[1] - t * vy); };
const inMask = (x, y) => y < BELT_Y || (x < 168 && y < 238 && !(x >= 135 && y >= 212)) || (x > 300 && y < 238) || segD(x, y, [286, 160], [334, 208]) < 20;

const base = await sharp(join(HERE, 'refs', 'base-step1-r2.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = base.info.width, H = base.info.height, B = base.data;
let g = await sharp(GEN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
{
  const d = g.data, gw = g.info.width, gh = g.info.height;
  let opaque = true;
  for (let i = 3; i < d.length; i += 4 * 97) if (d[i] < 250) { opaque = false; break; }
  if (opaque) {
    const c = [0, gw - 1, (gh - 1) * gw, gh * gw - 1].map((p) => [d[p * 4], d[p * 4 + 1], d[p * 4 + 2]]);
    const bg = [0, 1, 2].map((k) => c.reduce((s, v) => s + v[k], 0) / 4);
    for (let p = 0; p < gw * gh; p++) if (Math.abs(d[p * 4] - bg[0]) + Math.abs(d[p * 4 + 1] - bg[1]) + Math.abs(d[p * 4 + 2] - bg[2]) < 40) d[p * 4 + 3] = 0;
    console.log('not: alfa yoktu, arka plan anahtarlandı');
  }
}
const bbox = (data, w, h) => { let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }; };
const bb = bbox(B, W, H), gb = bbox(g.data, g.info.width, g.info.height);
const genTrim = await sharp(g.data, { raw: g.info }).extract({ left: gb.x0, top: gb.y0, width: gb.w, height: gb.h }).png().toBuffer();
// Hizalama örnekleri: maske dışı (kemer altı, bacaklar, çizmeler).
const samples = [];
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (!inMask(x, y)) samples.push(y * W + x);
const cost = (r, ox, oy) => { const rw = r.info.width, rh = r.info.height, R = r.data; let sum = 0;
  for (const p of samples) { const x = p % W, y = (p / W) | 0, gx = x - ox, gy = y - oy;
    let q = -1; if (gx >= 0 && gy >= 0 && gx < rw && gy < rh) q = (gy * rw + gx) * 4;
    const ga = q >= 0 ? R[q + 3] : 0, ba = B[p * 4 + 3]; if (ba < 20 && ga < 20) continue;
    for (let k = 0; k < 3; k++) sum += Math.abs(B[p * 4 + k] * ba - (q >= 0 ? R[q + k] : 0) * ga) / 255;
    sum += Math.abs(ba - ga); }
  return sum / samples.length; };
const s0 = bb.h / gb.h;
let best = { c: Infinity };
for (let k = -10; k <= 10; k++) { const s = s0 * (1 + k * 0.006);
  const r = await sharp(genTrim).resize(Math.round(gb.w * s), Math.round(gb.h * s), { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  const oy0 = bb.y1 + 1 - r.info.height, ox0 = Math.round(bb.x0 + bb.w / 2 - r.info.width / 2);
  for (let dy = -12; dy <= 12; dy++) for (let dx = -24; dx <= 24; dx++) { const c = cost(r, ox0 + dx, oy0 + dy); if (c < best.c) best = { c, s, ox: ox0 + dx, oy: oy0 + dy, r }; } }
const r = best.r, rw = r.info.width, rh = r.info.height, R = r.data;
const G = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const gx = x - best.ox, gy = y - best.oy;
  if (gx >= 0 && gy >= 0 && gx < rw && gy < rh) R.copy(G, (y * W + x) * 4, (gy * rw + gx) * 4, (gy * rw + gx) * 4 + 4); }
const O = Buffer.from(B);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inMask(x, y)) { const p = (y * W + x) * 4; G.copy(O, p, p, p + 4); }
// Ek yeri: maske sınırına <=3 px uzaklıktaki opak pikseller, taban - düzenleme farkı (0-255 ortalama).
let seamSum = 0, seamN = 0, seamBad = 0;
for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
  const m = inMask(x, y); let edge = false;
  for (let d = -3; d <= 3 && !edge; d++) if (inMask(x + d, y) !== m || inMask(x, y + d) !== m) edge = true;
  if (!edge) continue; const p = (y * W + x) * 4; if (B[p + 3] < 60 && G[p + 3] < 60) continue;
  let dd = Math.abs(B[p + 3] - G[p + 3]); for (let k = 0; k < 3; k++) dd += Math.abs(B[p + k] - G[p + k]); dd /= 4;
  seamSum += dd; seamN++; if (dd > 60) seamBad++; }
let outside = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!inMask(x, y)) { const p = (y * W + x) * 4; for (let k = 0; k < 4; k++) if (O[p + k] !== B[p + k]) { outside++; break; } }
await sharp(O, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT);
if (MASK_OUT) { const M = Buffer.alloc(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = (y * W + x) * 4; const a = inMask(x, y); M[p] = a ? 255 : 40; M[p + 1] = a ? 60 : 40; M[p + 2] = 40; M[p + 3] = 255; }
  await sharp(M, { raw: { width: W, height: H, channels: 4 } }).png().toFile(MASK_OUT); }
console.log(JSON.stringify({ out: OUT, scale: +best.s.toFixed(4), offset: [best.ox, best.oy], fitCost: +best.c.toFixed(2), seamMean: +(seamSum / Math.max(1, seamN)).toFixed(1), seamBadPx: seamBad, seamPx: seamN, outsideMaskDiff: outside }));
