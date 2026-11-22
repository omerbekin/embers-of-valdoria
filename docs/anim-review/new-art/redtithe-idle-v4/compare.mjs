// Karşılaştırma görseli: bugünkü kare + adaylar; üst sıra oyun boyu (~190 px figür), alt sıra kol bölgesi 4x.
// Kullanım: node compare.mjs <cikti.png> <etiket=dosya> ...
import sharp from 'sharp';
const [OUT, ...items] = process.argv.slice(2);
const list = items.map((s) => { const i = s.indexOf('='); return { label: s.slice(0, i), file: s.slice(i + 1) }; });
const BG = '#24242c';
const GAME = 0.497; // 382 px -> ~190 px
const CROP = { left: 96, top: 100, width: 160, height: 150 }, K = 4; // arka kol + omuz bölgesi
const colW = CROP.width * K, gap = 24, labelH = 40;
const gameW = Math.round(450 * GAME), gameH = Math.round(412 * GAME);
const H = labelH + gameH + gap + CROP.height * K + gap;
const W = list.length * (colW + gap) + gap;
const comps = [];
for (const [i, it] of list.entries()) {
  const x = gap + i * (colW + gap);
  const g = await sharp(it.file).resize(gameW, gameH, { kernel: 'lanczos3' }).png().toBuffer();
  comps.push({ input: g, left: x + Math.round((colW - gameW) / 2), top: labelH });
  const c = await sharp(it.file).extract(CROP).resize(CROP.width * K, CROP.height * K, { kernel: 'nearest' }).png().toBuffer();
  comps.push({ input: c, left: x, top: labelH + gameH + gap });
  const svg = `<svg width="${colW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><text x="${colW / 2}" y="28" font-family="Arial" font-size="24" fill="#e8e8e8" text-anchor="middle">${it.label}</text></svg>`;
  comps.push({ input: Buffer.from(svg), left: x, top: 0 });
}
await sharp({ create: { width: W, height: H, channels: 4, background: BG } }).composite(comps).png().toFile(OUT);
console.log('yazıldı', OUT, W, H);
