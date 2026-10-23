// Oyun içi görselleri WebP'ye çevirir (Ömer 2026-10-17, yükleme performansı: GitHub Pages yavaş, boyut belirleyici).
//
// Oyun (src/game/pose-files.ts, assets.ts, sprite-variants.ts, vfx-sheet-files.ts, src/ui/lesson-box.ts) aşağıdaki klasörlerde PNG'nin
// yanındaki aynı adlı .webp dosyasını yükler; PNG'ler asıl kalır (araçlar, poz düzenleyici, Codex > Assets ve testler PNG okur).
// Kalite: kayıplı q90 + KAYIPSIZ alfa (alphaQuality 100) + smartSubsample: boyalı figürlerde PNG'nin ~%25'i, gözle ayırt edilmez
// (ölçüm: tools çıktısı minPSNR > 33 dB, alfa birebir). Kayıpsız WebP ancak ~%65'ine iniyordu.
//
// Ne zaman: bu klasörlere PNG ekleyen / değiştiren HER araçtan sonra (make-poses*.mjs, import-mob-art.mjs, import-characters-v2.py ...).
// Değişmeyen dosya atlanır (assets/webp-manifest.json: PNG içeriğinin özeti); PNG'si silinen WebP de silinir.
// tests/webp-assets.test.ts her PNG'nin güncel WebP'si olduğunu denetler (unutulursa test kırmızı: oyun eski görseli gösterirdi).
//
//   node tools/webp-assets.mjs            yalnızca değişenler
//   node tools/webp-assets.mjs --all      hepsini yeniden üret
//   node tools/webp-assets.mjs --check    yalnızca denetle (eksik / eski varsa çıkış kodu 1)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** WebP'si üretilen klasörler (assets/ altında; alt klasörler dahil). Liste tests/webp-assets.test.ts ile aynı. */
export const WEBP_DIRS = ['poses', 'weapons', 'sprites', 'avatars', 'vfx', 'mob-vfx', 'stat-icons', 'ui-icons', 'misc-icons', 'mob-icons', 'icons-v2', 'tree-icons', 'result-logos', 'ui'];
export const MANIFEST = 'assets/webp-manifest.json';
export const WEBP_OPTS = { quality: 90, alphaQuality: 100, smartSubsample: true, effort: 6 };

const ALL = process.argv.includes('--all');
const CHECK = process.argv.includes('--check');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const rel = (p) => relative('.', p).split('\\').join('/');
const hash = (buf) => createHash('sha1').update(buf).digest('hex').slice(0, 16);

async function main() {
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
  const files = WEBP_DIRS.flatMap((d) => walk(join('assets', d)));
  const pngs = files.filter((f) => f.endsWith('.png'));
  const next = {};
  const todo = [];
  for (const f of pngs) {
    const key = rel(f);
    const h = hash(readFileSync(f));
    next[key] = h;
    const webp = f.replace(/\.png$/, '.webp');
    if (ALL || manifest[key] !== h || !existsSync(webp)) todo.push(f);
  }
  const pngSet = new Set(pngs.map((f) => f.replace(/\.png$/, '')));
  const orphans = files.filter((f) => f.endsWith('.webp') && !pngSet.has(f.replace(/\.webp$/, '')));
  if (CHECK) {
    for (const f of todo) console.log('eski / eksik:', rel(f));
    for (const f of orphans) console.log('PNG\'si yok:', rel(f));
    process.exit(todo.length || orphans.length ? 1 : 0);
  }
  const { default: sharp } = await import('sharp');
  let before = 0;
  let after = 0;
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const f = todo[i++];
      const webp = f.replace(/\.png$/, '.webp');
      const buf = await sharp(f).webp(WEBP_OPTS).toBuffer();
      writeFileSync(webp, buf);
      before += statSync(f).size;
      after += buf.length;
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  for (const f of orphans) unlinkSync(f);
  const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 1)}\n`);
  const mb = (n) => (n / 1048576).toFixed(1);
  console.log(`${todo.length} WebP üretildi (${mb(before)} MB PNG -> ${mb(after)} MB), ${orphans.length} yetim silindi, ${pngs.length - todo.length} güncel.`);
}

await main();
