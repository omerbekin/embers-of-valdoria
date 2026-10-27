// Savaş alanı nesneleri (src/game/object-art.ts): assets/source/objects/<id>.png (gerçek alfalı; zeminli çizim önce `node tools/key-chroma.mjs`)
// -> assets/objects/<id>.webp (içerik kutusuna kırpılır, yükseklik 384 px'e indirilir, kayıpsız alfa).
// Yeniden üretmek için: node tools/make-object-art.mjs
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets/source/objects';
const OUT = 'assets/objects';
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(SRC).filter((x) => /\.png$/.test(x))) {
  const out = `${OUT}/${f.replace(/\.png$/, '.webp')}`;
  const trimmed = await sharp(`${SRC}/${f}`).trim({ threshold: 8 }).toBuffer();
  await sharp(trimmed).resize({ height: 384, withoutEnlargement: true, kernel: sharp.kernel.lanczos3 }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(out);
  console.log(`${out} ${Math.round(statSync(out).size / 1024)} KB`);
}
