/**
 * Valor mangalları boyalı karelere (Ömer 2026-10-14): tek satırlık siyah zeminli sayfadan 6 kare.
 * Kaynak: assets/source/valor/brazier-sheet.png (2172x724, saf siyah zemin, eşit aralıklı 6 aynı mangal):
 *   1 soğuk kömür, 2 bir kor, 3 iki, 4 üç, 5 dört kor (dolu), 6 dolu + parlak alev (diriltme HAZIR).
 * Çıktı: assets/valor/brazier-0..4.webp (yanan kor sayısı) + brazier-ready.webp (alevli), yüksekliği H px (kâse kutusu).
 * Hizalama: tüm kareler AYNI yatay kutu + aynı taban çizgisiyle kesilir (kare değişince mangal kaymaz); kâse kareleri
 * ortak üst sınırda, alevli kare aynı ölçekte yalnızca yukarı uzar (alev kâse kutusunun üstüne taşar; src/ui/valor.css).
 * Siyah -> saydam: tools/black-to-alpha.mjs (yumuşak alfa, ışıma/kıvılcım yarı saydam).
 * Çalıştır: node tools/make-valor-icons.mjs
 */
import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import { blackToAlpha } from './black-to-alpha.mjs';

const SHEET = 'assets/source/valor/brazier-sheet.png';
const OUT = 'assets/valor';
const FRAMES = 6;
const H = 128; // kâse karesinin çıktı yüksekliği (telefonda ~3x yoğunlukta ~40 CSS px)
const PAD = 4; // kaynak pikselde kutu payı
const ALPHA_MIN = 24; // kutu ölçümünde bunun altı yok sayılır (sönük hale/gürültü)
const BODY_FROM = 0.55; // sayfa yüksekliğinin bu oranının altı = demir gövde (kor/alev yok): yatay çapa

const meta = await sharp(SHEET).metadata();
const cw = Math.floor(meta.width / FRAMES);
const ch = meta.height;
const cells = [];
for (let i = 0; i < FRAMES; i++) {
  const raw = await sharp(SHEET).extract({ left: i * cw, top: 0, width: cw, height: ch }).png().toBuffer();
  const png = await blackToAlpha(raw, { trim: false });
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  let bx0 = info.width, bx1 = -1; // demir gövde (kâse + ayaklar, BODY_FROM altı): karede kayan mangalın çapası
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] >= ALPHA_MIN) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (y >= BODY_FROM * info.height) {
          if (x < bx0) bx0 = x;
          if (x > bx1) bx1 = x;
        }
      }
  const cx = (bx0 + bx1) / 2;
  cells.push({ png, w: info.width, h: info.height, cx, y0, y1, l: cx - x0, r: x1 - cx });
  console.log(`frame ${i + 1}: box ${x0},${y0} - ${x1},${y1}, body centre ${cx}`);
}

// ortak kutu: sayfadaki mangallar hücre ızgarasına göre birkaç piksel kayar, bu yüzden her kare KENDİ gövde merkezine göre kesilir;
// yarı genişlik tüm karelerin en genişi, taban en alttaki; üst = kâse karelerinin en üstü (alevli kare kendi üstü)
const half = Math.ceil(Math.max(...cells.map((c) => Math.max(c.l, c.r)))) + PAD;
const bottom = Math.min(ch - 1, Math.max(...cells.map((c) => c.y1)) + PAD);
const bowlTop = Math.max(0, Math.min(...cells.slice(0, FRAMES - 1).map((c) => c.y0)) - PAD);
const readyTop = Math.max(0, Math.min(bowlTop, cells[FRAMES - 1].y0 - PAD));
const width = half * 2 + 1;
const scale = H / (bottom - bowlTop + 1);
const outW = Math.round(width * scale);

await mkdir(OUT, { recursive: true });
const names = ['brazier-0', 'brazier-1', 'brazier-2', 'brazier-3', 'brazier-4', 'brazier-ready'];
for (let i = 0; i < FRAMES; i++) {
  const top = i === FRAMES - 1 ? readyTop : bowlTop;
  const hh = bottom - top + 1;
  const file = `${OUT}/${names[i]}.webp`;
  const left = Math.round(cells[i].cx) - half;
  if (left < 0 || left + width > cw) throw new Error(`frame ${i + 1}: box leaves its cell`);
  await sharp(cells[i].png)
    .extract({ left, top, width, height: hh })
    .resize({ width: outW, height: Math.round(hh * scale), kernel: 'lanczos3', fit: 'fill' })
    .webp({ quality: 90, alphaQuality: 95, effort: 6 })
    .toFile(file);
  const m = await sharp(file).metadata();
  console.log(file, `${m.width}x${m.height}`, `${Math.round((await stat(file)).size / 1024)} KB`);
}
