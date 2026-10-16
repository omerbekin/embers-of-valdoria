// Açılış yükleme ekranının arka planı (Ömer 2026-10-13, v2 "minimal"): assets/source/loading/loading-bg.png (1672x941 koyu duman + kor
// kıvılcımları, ortada sıcak ışıma; ham: loading-bg-v2-raw.png, eski savaş masası: loading-bg-v1-old.png) -> public/loading/loading-bg.webp
// (1600 genişlik, web için sıkıştırılmış; public: JS paketinden ÖNCE iner). Sağ alttaki taç amblemi ayrı: public/loading/emblem.webp (assets/source/branding/emblem.png'den).
// Ayrıca 96x54'lük (Ömer 2026-10-16: 32x18 telefonda neredeyse düz karanlık görünüyordu; ~0,5 KB) bulanık yer tutucu üretip index.html'deki `/*boot-ph*/url(...)/*boot-ph*/` işaretlerinin arasına base64 olarak yazar:
// kutu ilk karede bu bulanık görüntüyle açılır, asıl resim yüklenince üstüne solar (src/ui/boot-loader.ts, index.html).
//
// Yeniden üretmek için: node tools/make-loading-bg.mjs  (yalnızca yer tutucu: node tools/make-loading-bg.mjs --placeholder)
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets/source/loading/loading-bg.png';
const OUT = 'public/loading/loading-bg.webp';
const WIDTH = 1600;
const QUALITY = 74;
const LIMIT = 200 * 1024;
const PH_W = 96;
const PH_H = 54;
const PH_LIMIT = 3 * 1024;
const onlyPh = process.argv.includes('--placeholder');

mkdirSync('public/loading', { recursive: true });
if (!onlyPh) await sharp(SRC).resize(WIDTH, null, { kernel: sharp.kernel.lanczos3 }).webp({ quality: QUALITY, effort: 6, smartSubsample: true }).toFile(OUT);
const size = statSync(OUT).size;
if (size > LIMIT) throw new Error(`${OUT} ${Math.round(size / 1024)} KB (sınır ${LIMIT / 1024} KB): QUALITY düşür`);

const ph = await sharp(SRC).resize(PH_W, PH_H, { fit: 'cover' }).blur(0.8).webp({ quality: 60, effort: 6 }).toBuffer();
if (ph.length > PH_LIMIT) throw new Error(`yer tutucu ${ph.length} bayt (sınır ${PH_LIMIT}): kaliteyi düşür`);
const url = `url(data:image/webp;base64,${ph.toString('base64')})`;
const html = readFileSync('index.html', 'utf8');
const re = /\/\*boot-ph\*\/.*?\/\*boot-ph\*\//s;
if (!re.test(html)) throw new Error('index.html: /*boot-ph*/ işaretleri yok');
writeFileSync('index.html', html.replace(re, `/*boot-ph*/${url}/*boot-ph*/`));
console.log(`${OUT} ${Math.round(size / 1024)} KB · yer tutucu ${ph.length} bayt -> index.html`);
