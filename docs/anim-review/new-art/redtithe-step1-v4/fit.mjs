// Redtithe step1 v4 yerleştirici: üretilen tam beden koşu karesini oyun tuvaline (450x412) oturtur.
// Arka plan opaksa köşe renginden anahtarlanır; figür kırpılır, boyu H px olacak şekilde ölçeklenir (idle1 = 380), ayak tabanı y=405
// (canvas.footY 406, box alt kenarı footY), kutu ortası x = 225 + DX (öbür sınıfların step1 kutusu tuval ortasından ~15-25 px önde).
// Kullanım: node fit.mjs <ham.png> <çıktı.png> [--h 380] [--dx 15]
import sharp from 'sharp';
const a = process.argv.slice(2);
const opt = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? +a.splice(i, 2)[1] : d; };
const H = opt('h', 380), DX = opt('dx', 15);
const [IN, OUT] = a;
const g = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const d = g.data, w = g.info.width, h = g.info.height;
let opaque = true; for (let i = 3; i < d.length; i += 4 * 97) if (d[i] < 250) { opaque = false; break; }
if (opaque) { const c = [0, w - 1, (h - 1) * w, h * w - 1].map((p) => [d[p * 4], d[p * 4 + 1], d[p * 4 + 2]]);
  const bg = [0, 1, 2].map((k) => c.reduce((s, v) => s + v[k], 0) / 4);
  for (let p = 0; p < w * h; p++) { const e = Math.abs(d[p * 4] - bg[0]) + Math.abs(d[p * 4 + 1] - bg[1]) + Math.abs(d[p * 4 + 2] - bg[2]); if (e < 40) d[p * 4 + 3] = 0; }
  console.log('not: arka plan anahtarlandı'); }
let x0 = w, y0 = h, x1 = -1, y1 = -1;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
const bw = x1 - x0 + 1, bh = y1 - y0 + 1, s = H / bh, nw = Math.round(bw * s), nh = H;
const fig = await sharp(d, { raw: g.info }).extract({ left: x0, top: y0, width: bw, height: bh }).resize(nw, nh, { kernel: 'lanczos3' }).png().toBuffer();
const left = Math.round(225 + DX - nw / 2), top = 406 - nh;
if (left < 0 || left + nw > 450 || top < 0) console.log('UYARI: figür tuvale sığmıyor', { left, nw, top });
await sharp({ create: { width: 450, height: 412, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: fig, left: Math.max(0, left), top: Math.max(0, top) }]).png().toFile(OUT);
console.log(JSON.stringify({ out: OUT, src: [w, h], scale: +s.toFixed(4), box: { x: Math.max(0, left), y: top, w: nw, h: nh } }));
