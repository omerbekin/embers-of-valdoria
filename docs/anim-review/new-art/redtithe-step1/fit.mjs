// Redtithe step1 deneme: Terra'nın kıyafet düzenlemesini eski step1 tuvaline (450x412) uzuvlar üst üste gelecek şekilde oturtur.
// Hizalama: alfa (siluet) uyumu, yalnız palto değişiminden etkilenmeyen satırlar (y<200: baş, gövde üstü, kollar; y>355: çizmeler).
// Kullanım (worktree kökünden): node docs/anim-review/new-art/redtithe-step1/fit.mjs <uretilen.png> <cikti.png>
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, 'refs', 'base-step1-old.png');
const [GEN, OUT] = process.argv.slice(2);
if (!GEN || !OUT) { console.error('kullanım: fit.mjs <uretilen.png> <cikti.png>'); process.exit(2); }

const base = await sharp(BASE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = base.info.width, H = base.info.height, B = base.data;
const g = await sharp(GEN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
{ // alfa yoksa köşe renginden anahtarla
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
const trim = await sharp(g.data, { raw: g.info }).extract({ left: gb.x0, top: gb.y0, width: gb.w, height: gb.h }).png().toBuffer();
const rows = [];
for (let y = 0; y < H; y += 2) if (y < 200 || y > 355) rows.push(y);
const cost = (r, ox, oy) => { const rw = r.info.width, rh = r.info.height, R = r.data; let bad = 0, n = 0;
  for (const y of rows) for (let x = 0; x < W; x += 2) { const ba = B[(y * W + x) * 4 + 3] > 60; const gx = x - ox, gy = y - oy;
    const ga = gx >= 0 && gy >= 0 && gx < rw && gy < rh && R[(gy * rw + gx) * 4 + 3] > 60; if (ba || ga) { n++; if (ba !== ga) bad++; } }
  return bad / Math.max(1, n); };
const s0 = bb.h / gb.h;
let best = { c: 9 };
for (let k = -8; k <= 8; k++) { const s = s0 * (1 + k * 0.008);
  const r = await sharp(trim).resize(Math.round(gb.w * s), Math.round(gb.h * s), { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  const oy0 = bb.y1 + 1 - r.info.height, ox0 = Math.round((bb.x0 + bb.x1) / 2 - r.info.width / 2);
  for (let dy = -12; dy <= 12; dy += 1) for (let dx = -30; dx <= 30; dx += 1) { const c = cost(r, ox0 + dx, oy0 + dy); if (c < best.c) best = { c, s, ox: ox0 + dx, oy: oy0 + dy, r }; } }
const r = best.r;
// tuvale yerleştir (taşan kısım kırpılır)
const left = Math.max(0, best.ox), top = Math.max(0, best.oy);
const ex = { left: left - best.ox, top: top - best.oy };
const cw = Math.min(r.info.width - ex.left, W - left), ch = Math.min(r.info.height - ex.top, H - top);
const piece = await sharp(r.data, { raw: r.info }).extract({ left: ex.left, top: ex.top, width: cw, height: ch }).png().toBuffer();
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: piece, left, top }]).png().toFile(OUT);
console.log(JSON.stringify({ out: OUT, scale: +best.s.toFixed(4), offset: [best.ox, best.oy], silhouetteMismatch: +best.c.toFixed(3) }));
if (best.c > 0.2) console.log('UYARI: siluet uyumsuzluğu yüksek (> 0.2): kollar/baş eski kareden kaymış olabilir.');
