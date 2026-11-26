// Çekim karelerini tek jpg şeride dizer. Kullanım: node compose.mjs <klasör> <çıktı.jpg> <ms,ms,...> [sütun genişliği]
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const [dir, out, list, cw = '480'] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => ({ f, ms: Number(f.match(/-(\d+)ms/)[1]) }));
const want = list.split(',').map(Number);
const pick = want.map((t) => files.reduce((a, b) => (Math.abs(b.ms - t) < Math.abs(a.ms - t) ? b : a)));
const W = Number(cw);
// CROP=x,y,w,h (kare kırpımı), ROT=90|180|270 (önce döndür; dikey telefon çekimi yatay okunsun)
const crop = process.env.CROP?.split(',').map(Number);
const rot = Number(process.env.ROT ?? 0);
const prep = async (file) => {
  let img = sharp(file);
  if (rot) img = sharp(await img.rotate(rot).toBuffer());
  if (crop) img = img.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
  return img.resize({ width: W, kernel: 'nearest' }).toBuffer();
};
const tiles = await Promise.all(pick.map((p) => prep(`${dir}/${p.f}`)));
const meta = await Promise.all(tiles.map((t) => sharp(t).metadata()));
const H = meta[0].height;
const cols = Math.min(3, tiles.length);
const rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: W * cols, height: H * rows, channels: 3, background: '#101010' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % cols) * W, top: Math.floor(i / cols) * H })))
  .jpeg({ quality: 88 }).toFile(out);
console.log(out, pick.map((p) => p.ms).join(','));
