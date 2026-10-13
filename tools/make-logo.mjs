/**
 * Ana menü logosu v3 (Ömer 2026-10-13): siyah zeminli ham görselden saydam logo.
 * Kaynak: assets/source/branding/logo-crown-raw.png (Ömer 2026-10-13: alevli demir taç + EMBERS / OF / VALDORIA, 1536x1024, saf siyah zemin; eski kale logosu logo-v3-raw.png).
 * Çıktı:  assets/source/branding/logo.png (saydam asıl; eski logo -> logo-v2-old.png, bir kez)
 *         assets/branding/logo.webp (ana menünün yüklediği; src/game/branding.ts)
 *         (yükleme ekranı logo değil taç amblemi kullanır: public/loading/emblem.webp)
 * Siyah -> saydam: tools/black-to-alpha.mjs. Favicon / uygulama ikonları ayrı kare amblemden: tools/make-logo-icons.mjs.
 * Çalıştır: node tools/make-logo.mjs
 */
import sharp from 'sharp';
import { copyFile, access, stat } from 'node:fs/promises';
import { blackToAlpha } from './black-to-alpha.mjs';

const RAW = 'assets/source/branding/logo-crown-raw.png';
const SRC = 'assets/source/branding/logo.png';
const OLD = 'assets/source/branding/logo-v2-old.png';
const OUT_WEBP = 'assets/branding/logo.webp';
const MAX_W = 1600;

try {
  await access(OLD);
} catch {
  await copyFile(SRC, OLD); // eski (v2) logo bir kez saklanır
  console.log('kept old logo ->', OLD);
}

await sharp(await blackToAlpha(RAW)).png({ compressionLevel: 9 }).toFile(SRC);
const meta = await sharp(SRC).metadata();
console.log(SRC, `${meta.width}x${meta.height}`);

for (const [file, maxW, q] of [[OUT_WEBP, MAX_W, 90]]) {
  await sharp(SRC).resize({ width: Math.min(maxW, meta.width), kernel: 'lanczos3' }).webp({ quality: q, alphaQuality: 90, effort: 6 }).toFile(file);
  const m = await sharp(file).metadata();
  console.log(file, `${m.width}x${m.height}`, `${Math.round((await stat(file)).size / 1024)} KB`);
}
