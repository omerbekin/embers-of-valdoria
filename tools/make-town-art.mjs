// Kasaba ekranı arka planları (Ömer 2026-10-12, future-ideas "SIRADA" (1)): assets/source/backgrounds-v2/town-<id>.png (ChatGPT, 1536x1024)
// -> assets/towns/town-<id>.webp. Kaynak 1536x1024; lanczos3 ile 1.5 kat 2304x1536'ya BÜYÜTÜLÜR (ayrıntı katmaz; ekranda ikinci bir
// doğrusal büyütmeyi azaltır). 2026-10-27 denendi: 2 kat en yakın komşu (3072, pixel-art büyütme) 21:9'da gözle aynı (ChatGPT/Codex çıktısı
// temiz piksel ızgarası değil) ama dosya +%10-50; lanczos3 kaldı. Sahnede "cover" ile görünür alanı doldurur (src/campaign/town.ts > townCover).
//
// Yeniden üretmek için: node tools/make-town-art.mjs
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets/source/backgrounds-v2';
const OUT = 'assets/towns';
const QUALITY = 92;
const LIMIT = 1400 * 1024;

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(SRC).filter((x) => /^town-.*\.png$/.test(x))) {
  const out = `${OUT}/${f.replace(/\.png$/, '.webp')}`;
  await sharp(`${SRC}/${f}`).resize(2304, null, { kernel: sharp.kernel.lanczos3 }).webp({ quality: QUALITY, effort: 6, smartSubsample: true }).toFile(out);
  const size = statSync(out).size;
  if (size > LIMIT) throw new Error(`${out} ${Math.round(size / 1024)} KB (sınır ${LIMIT / 1024} KB): QUALITY düşür`);
  console.log(`${out} ${Math.round(size / 1024)} KB`);
}
