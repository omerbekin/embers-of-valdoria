// step1 v2 karşılaştırma: üstte R2 duruş | eski step1 denemesi | yeni step1 (aynı ölçek, tam figür 1x),
// altında aynı sırayla baş/boyun 4x kırpımı. Kullanım: node karsilastirma.mjs <cikti.png> <idle1> <step1-eski> <step1-yeni>
import sharp from 'sharp';
const [OUT, ...files] = process.argv.slice(2);
const labels = ['R2 durus (idle1)', 'eski step1 denemesi', 'yeni step1 (v2)'];
const CROP = { left: 190, top: 15, width: 130, height: 110 }, K = 4, colW = CROP.width * K, labH = 40;
const lab = (t) => Buffer.from(`<svg width="${colW}" height="${labH}" xmlns="http://www.w3.org/2000/svg"><text x="${colW / 2}" y="28" font-family="Arial" font-size="24" fill="#eee" text-anchor="middle">${t}</text></svg>`);
const comps = [];
for (const [i, f] of files.entries()) {
  const x = i * (colW + 10);
  comps.push({ input: lab(labels[i]), left: x, top: 0 });
  comps.push({ input: await sharp(f).png().toBuffer(), left: x + Math.round((colW - 450) / 2), top: labH });
  comps.push({ input: lab(labels[i] + ' - bas/boyun 4x'), left: x, top: labH + 420 });
  comps.push({ input: await sharp(f).extract(CROP).resize(colW, CROP.height * K, { kernel: 'nearest' }).png().toBuffer(), left: x, top: labH * 2 + 420 });
}
// ayak çizgisi kılavuzu yok; aynı tuval, aynı ölçek.
await sharp({ create: { width: files.length * (colW + 10) - 10, height: labH * 2 + 420 + CROP.height * K + 10, channels: 4, background: '#2a2a33' } }).composite(comps).png().toFile(OUT);
console.log('yazıldı', OUT);
