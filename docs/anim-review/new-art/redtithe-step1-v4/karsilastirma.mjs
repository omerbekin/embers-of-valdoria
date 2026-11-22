// step1 v4 karşılaştırma. Üst sıra: R2 duruş | v3 | v4 (1x, aynı ölçek; ayak çizgisi hizalı) + altında baş/boyun 2x.
// Alt sıralar: başka sınıfların idle1 + step1 çifti (1x, aynı ölçek, aynı ayak çizgisi) eğim kıyası için.
// Kullanım: node karsilastirma.mjs <cikti.png> <idle1> <v3> <v4>
import sharp from 'sharp';
const [OUT, ...four] = process.argv.slice(2);
const top = ['R2 durus (idle1)', 'v3 (onceki adim)', 'v4 (kosu adimi)'];
const refs = [['warrior-v2', 'Warrior'], ['cutthroat-v2', 'Cutthroat'], ['paladin-v2', 'Paladin'], ['archer-v3', 'Archer']];
const LAB = 34, GAP = 14, FEET = 470; // her hücrede ayak çizgisi y = FEET
const lab = (t, w) => Buffer.from(`<svg width="${w}" height="${LAB}" xmlns="http://www.w3.org/2000/svg"><text x="8" y="25" font-family="Arial" font-size="22" fill="#eee">${t}</text></svg>`);
const feet = async (f) => { const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); for (let y = info.height - 1; y >= 0; y--) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 60) return y; return info.height; };
const comps = []; let W = 0, y = 0;
// üst sıra
let x = 0; const CW = 460;
for (const [i, f] of four.entries()) {
  const m = await sharp(f).metadata(), fy = await feet(f);
  comps.push({ input: lab(top[i], CW), left: x, top: y });
  comps.push({ input: await sharp(f).png().toBuffer(), left: x + Math.round((CW - m.width) / 2), top: y + LAB + FEET - fy - 30 });
  comps.push({ input: await sharp(f).extract({ left: 200, top: 15, width: 150, height: 150 }).resize(300, 300, { kernel: 'nearest' }).png().toBuffer(), left: x + 80, top: y + LAB + FEET });
  x += CW + GAP;
}
W = Math.max(W, x); y += LAB + FEET + 300 + 30;
comps.push({ input: Buffer.from(`<svg width="1800" height="40" xmlns="http://www.w3.org/2000/svg"><text x="8" y="28" font-family="Arial" font-size="24" fill="#ffd27a">Referans: baska siniflarin ayni pozu (idle1 | step1), ayni olcek</text></svg>`), left: 0, top: y }); y += 44;
for (let r = 0; r < 2; r++) {
  x = 0; let rowH = 0;
  for (const [dir, name] of refs.slice(r * 2, r * 2 + 2)) {
    for (const p of ['idle1', 'step1']) {
      const f = `assets/poses/${dir}/${p}.png`; const m = await sharp(f).metadata(), fy = await feet(f);
      comps.push({ input: lab(`${name} ${p}`, m.width), left: x, top: y });
      comps.push({ input: await sharp(f).png().toBuffer(), left: x, top: y + LAB + FEET - fy - 10 });
      x += m.width + 4; rowH = Math.max(rowH, LAB + FEET);
    }
    x += GAP * 3;
  }
  W = Math.max(W, x); y += rowH + 10;
}
await sharp({ create: { width: W, height: y, channels: 4, background: '#2a2a33' } }).composite(comps).png().toFile(OUT);
console.log('yazildi', OUT, W, y);
