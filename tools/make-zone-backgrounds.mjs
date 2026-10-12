// Sefer bölge savaş arka planları (2026-10-12): assets/source/backgrounds-v2/<id>.png (1536x1024, zemin çizgisi ~%60-62)
// -> assets/backgrounds/<id>.webp (2000x729: mevcut castle-hall / kings-bridge oranı).
// Kırpma: tam genişlik, 560 px yükseklik; üst kenar her görselin ölçülen zemin çizgisine göre seçilir (zemin kırpılmış görselin
// FLOOR_IN_CROP kesrine düşer). Büyütme lanczos3 (mevcut arka planlar gibi yumuşak; 1,302 kat tam sayı olmadığı için NEAREST
// pikselleri eşitsiz kalınlaştırırdı). Zemin kesirleri data/battle-layout.json > backgrounds.floor'a yazılır (çıktıda listelenir).
//
// Yeniden üretmek için: node tools/make-zone-backgrounds.mjs
import { statSync } from 'node:fs';
import sharp from 'sharp';

const SRC_DIR = 'assets/source/backgrounds-v2';
const OUT_DIR = 'assets/backgrounds';
const OUT_W = 2000;
const OUT_H = 729;
const SRC_W = 1536;
const CROP_H = Math.round((SRC_W * OUT_H) / OUT_W); // 560
const FLOOR_IN_CROP = 0.65;
const QUALITY = 82;

/** Kaynakta (1024 yükseklik) ölçülen zemin çizgisi: çit / duvar / sahne öğelerinin dibi, yürünebilir toprağın başladığı y. */
const FLOOR_SRC_Y = {
  'border-road': 625,
  'windy-moor': 625,
  'iron-pass': 615,
  'misty-marsh': 625,
  'grave-field': 620,
  'pilgrim-road': 640,
  'ashen-plain': 620,
  'thornwood-hollow': 615,
  'ember-road': 625,
};

const floors = {};
for (const [id, fy] of Object.entries(FLOOR_SRC_Y)) {
  const top = Math.max(0, Math.min(1024 - CROP_H, Math.round(fy - FLOOR_IN_CROP * CROP_H)));
  const out = `${OUT_DIR}/${id}.webp`;
  await sharp(`${SRC_DIR}/${id}.png`)
    .extract({ left: 0, top, width: SRC_W, height: CROP_H })
    .resize(OUT_W, OUT_H, { kernel: sharp.kernel.lanczos3 })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(out);
  floors[id] = Math.round(((fy - top) / CROP_H) * 1000) / 1000;
  console.log(`${out} top=${top} floor=${floors[id]} ${Math.round(statSync(out).size / 1024)} KB`);
}
console.log(JSON.stringify(floors));
