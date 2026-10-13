/**
 * Favicon + web app manifest ikonları: kare amblem (Ömer 2026-10-13: taç logosunun alevli tacı, yazısız; eski kale amblemi emblem-raw.png).
 * Kaynak: assets/source/branding/emblem-crown-raw.png (900x900, logo-crown-raw.png'nin üst kısmı, saf siyah zemin) -> siyah zemin yumuşak alfa ile saydam
 * (tools/black-to-alpha.mjs, logo ile aynı yöntem), kırpılır, kareye ortalanır -> assets/source/branding/emblem.png (temiz saydam asıl).
 * İkonlar: favicon-32 saydam; icon-192/512 koyu zeminde (#0d0a07); maskable-512 güvenli bölge payıyla.
 * Çalıştır: node tools/make-logo-icons.mjs   (çıktı: public/icons/favicon-32.png, icon-192.png, icon-512.png, icon-maskable-512.png)
 * Eski piksel 'helm' ikon üretici: tools/make-pwa-icons.ts (artık kullanılmıyor).
 */
import sharp from 'sharp';
import { blackToAlpha } from './black-to-alpha.mjs';

const RAW = 'assets/source/branding/emblem-crown-raw.png';
const EMBLEM = 'assets/source/branding/emblem.png';
const OUT = 'public/icons';
const BG = { r: 13, g: 10, b: 7, alpha: 1 }; // menü arka planı #0d0a07
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const cut = await blackToAlpha(RAW);
const m = await sharp(cut).metadata();
const side = Math.max(m.width, m.height);
await sharp({ create: { width: side, height: side, channels: 4, background: CLEAR } })
  .composite([{ input: cut, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile(EMBLEM);
console.log(EMBLEM, `${side}x${side}`);

/** size: kenar; inset: kenarlardan bırakılan pay oranı; bg: zemin (favicon saydam). */
async function icon(file, size, inset, bg) {
  const inner = Math.round(size * (1 - inset * 2));
  const art = await sharp(EMBLEM).resize(inner, inner, { fit: 'contain', background: CLEAR, kernel: 'lanczos3' }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: art, gravity: 'center' }])
    .png()
    .toFile(`${OUT}/${file}`);
  console.log(file, size);
}

await icon('favicon-32.png', 32, 0, CLEAR);
await icon('icon-192.png', 192, 0.04, BG);
await icon('icon-512.png', 512, 0.04, BG);
await icon('icon-maskable-512.png', 512, 0.12, BG);
