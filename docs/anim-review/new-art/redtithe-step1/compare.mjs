// step1 deneme sayfası: üst satır oyun boyu (~190 px figür) yan yana, altında her karenin üst gövde + kollar 4x kırpımı alt alta.
// Kullanım: node compare.mjs <cikti.png> <etiket=dosya> ...
import sharp from 'sharp';
const [OUT, ...items] = process.argv.slice(2);
const list = items.map((s) => { const i = s.indexOf('='); return { label: s.slice(0, i), file: s.slice(i + 1) }; });
const GAME = 0.497, K = 4;
const CROP = { left: 70, top: 20, width: 300, height: 220 };
const W = CROP.width * K, labelH = 44;
const gw = Math.round(450 * GAME), gh = Math.round(412 * GAME);
const colW = Math.floor(W / list.length);
const label = (t, w) => Buffer.from(`<svg width="${w}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><text x="${w / 2}" y="30" font-family="Arial" font-size="26" fill="#e8e8e8" text-anchor="middle">${t}</text></svg>`);
const comps = [];
let y = 0;
for (const [i, it] of list.entries()) {
  comps.push({ input: label(it.label, colW), left: i * colW, top: 0 });
  comps.push({ input: await sharp(it.file).resize(gw, gh, { kernel: 'lanczos3' }).png().toBuffer(), left: i * colW + Math.round((colW - gw) / 2), top: labelH });
}
y = labelH + gh + 20;
for (const it of list) {
  comps.push({ input: label(`${it.label} (4x)`, W), left: 0, top: y });
  y += labelH;
  comps.push({ input: await sharp(it.file).extract(CROP).resize(CROP.width * K, CROP.height * K, { kernel: 'nearest' }).png().toBuffer(), left: 0, top: y });
  y += CROP.height * K + 16;
}
await sharp({ create: { width: W, height: y, channels: 4, background: '#24242c' } }).composite(comps).png().toFile(OUT);
console.log('yazıldı', OUT, W, y);
