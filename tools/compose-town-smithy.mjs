// Harita 2 kasaba sahnelerine demirci ocağını yerleştirir (Ömer 2026-10-27, yer tutucu kalmasın): ChatGPT'nin ham sahneleri
// assets/source/town-parts/raw/town-<id>.png (demircisiz), ocak assets/source/town-parts/smithy.png (gerçek alfa; tools/key-chroma.mjs).
// Çıktı assets/source/backgrounds-v2/town-<id>.png (sonra `node tools/make-town-art.mjs`). Konumlar 1536x1024 kaynak pikselinde:
// [sol, taban y, genişlik]. Demirci tıklama alanı (data/campaign/campaign.json > blacksmith.hotspots) bu yerleşimden hesaplanır ve yazdırılır.
// Yeniden üretmek için: node tools/compose-town-smithy.mjs
import { copyFileSync, existsSync } from 'node:fs';
import sharp from 'sharp';

const PARTS = 'assets/source/town-parts';
const PLACE = {
  reedgate: [560, 560, 280],
  eelwick: [560, 640, 300],
  saltmere: [330, 780, 250],
  'fishers-landing': [560, 690, 280],
};
const W = 1536;
const H = 1024;
const smithy = sharp(`${PARTS}/smithy.png`);
for (const [id, [left, base, width]] of Object.entries(PLACE)) {
  const raw = `${PARTS}/raw/town-${id}.png`;
  if (!existsSync(raw)) copyFileSync(`assets/source/backgrounds-v2/town-${id}.png`, raw);
  const img = await smithy.clone().resize({ width }).toBuffer({ resolveWithObject: true });
  const h = img.info.height;
  const top = base - h;
  // yere oturan yumuşak gölge
  const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><radialGradient id="g"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><ellipse cx="${left + width / 2}" cy="${base - 6}" rx="${width * 0.62}" ry="${width * 0.1}" fill="url(#g)"/></svg>`);
  await sharp(raw).composite([{ input: shadow }, { input: img.data, left, top }]).png().toFile(`assets/source/backgrounds-v2/town-${id}.png`);
  const r = (v) => Math.round(v * 1000) / 1000;
  console.log(`${id}: rect [${r(left / W)}, ${r(top / H)}, ${r((left + width) / W)}, ${r(base / H)}]`);
}
