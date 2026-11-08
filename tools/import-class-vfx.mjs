#!/usr/bin/env node
// SINIF VFX sheet içe aktarıcı (v2 sanat sürümü, docs/arch/assets.md > Sanat sürümleri): ChatGPT'nin çizdiği 4x2 sheet'leri
// assets/source/<sınıf>-vfx/<ad>.png'den alıp oyunun okuduğu assets/vfx/<sınıf>/<NN-ad>.png + .json biçimine çevirir.
//
//   node tools/import-class-vfx.mjs undead            içe aktar (sonra: node tools/webp-assets.mjs)
//   node tools/import-class-vfx.mjs undead --check    yalnızca ölç (yazmaz)
//   node tools/import-class-vfx.mjs vesper --only 04-cracked-bell   yalnız bu sheet
//
// ChatGPT sheet'leri tam ızgaralı değildir (1774x887 = 443,5 px kare; satırlar arası boşluk ortada değil, içerik bölme çizgisini
// geçebilir). Bu yüzden kesim çizgileri sabit ızgaradan değil, beklenen çizginin çevresindeki EN BOŞ satır / sütundan seçilir; kare kenarına
// değen küçük kırıntılar (komşu karenin taşması) silinir. Hizalama sheet başına (SHEETS > align):
//   keep    kare kendi yerinde (kesilen hücrenin ortası karenin ortası): çizimin kendi hareketi korunur (patlama, mühür, kesik)
//   center  alfa ağırlık merkezi karenin ortasına (uçan / döngü sheet'leri: mermi ve ruh tutamı yerinde kalır, kod taşır)
// Ek seçenek `clean: <0-254>`: alfa bu değerin altı silinir, üstü yeniden ölçeklenir (çizim aracının macenta çıkarma halesi / sis lekesi).
//   ground  içeriğin tabanı sabit taban çizgisine, taban bandının yatay ortası karenin ortasına (zemin efektleri: ayak çizgisine oturur)
// Siyah çerçeve / ızgara çizgisi / numara yok; alfa korunur. Çıktı karesi FRAME px (kare küçültülür).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sharp = createRequire(join(ROOT, 'package.json'))('sharp');

const DEFAULT_FRAME = 320;
/** Zemin efektlerinde içerik tabanının kare yüksekliğindeki yeri (pivot y). */
const GROUND_BASE = 0.94;

const CLASSES = {
  cutthroat: [
    { src: '01-smoke-bomb', out: '01-smoke-bomb', title: 'Smoke Bomb: clay bomb bursts into a low smoke bank', align: 'ground', fps: 11, shift: { 0: [-32, 0] } }, // s1'in bombası s2'nin kırılma noktasına (ground hizası bombayı 32 px sağa atıyordu)
    { src: '02-smoke-bomb-fly', out: '02-smoke-bomb-fly', title: 'Smoke Bomb: spinning clay bomb (flight loop)', align: 'center', fps: 16 },
  ],
  skald: [
    { src: '01-drum-pulse', out: '01-drum-pulse', title: 'War Drum: ground shockwave ring with lightning threads', align: 'ground', fps: 13 },
    { src: '02-drum-beat', out: '02-drum-beat', title: 'War Drum: sound rings off the drum skin', align: 'keep', fps: 18 },
    { src: '03-hammer-wave', out: '03-hammer-wave', title: 'Hammer Spark: travelling shock crescent (loop)', align: 'keep', fps: 14 },
    { src: '04-hammer-impact', out: '04-hammer-impact', title: 'Hammer Spark: half iron half lightning impact', align: 'keep', fps: 18 },
    { src: '05-sky-bolt', out: '05-sky-bolt', title: 'Thunder Strike: lightning bolt hits the ground', align: 'ground', fps: 14 },
    { src: '06-stormcall-arc', out: '06-stormcall-arc', title: 'Stormcall: chain lightning arc between targets', align: 'keep', fps: 20 },
    { src: '07-hammer-charge', out: '07-hammer-charge', title: 'Lightning gathering around the hammer head', align: 'keep', fps: 11 },
  ],
  vesper: [
    { src: '01-toll-ring', out: '01-toll-ring', title: 'Toll: holy sound ring', align: 'keep', fps: 18 },
    { src: '02-thunder-bell', out: '02-thunder-bell', title: 'Thunderpeal: spectral bell turning to thunder', align: 'keep', fps: 15 },
    { src: '03-thunder-bolt', out: '03-thunder-bolt', title: 'Thunderpeal: lightning bolt on a cell', align: 'ground', fps: 17 },
    { src: '04-cracked-bell', out: '04-cracked-bell', title: 'Cracked Bell: cracked bronze bell falls and splits', align: 'keep', fps: 14 }, // tur 5 çizimi: kare boyları tutarlı, ölçek düzeltmesi gerekmedi
    { src: '05-great-bell', out: '05-great-bell', title: 'Great Bell of Valdoria: colossal bell swings and strikes', align: 'keep', fps: 9, frame: 440, scale: { 4: 0.92, 5: 0.92, 6: 0.92, 7: 0.92 }, shift: { 4: [0, 10], 5: [0, 10], 6: [0, 10], 7: [0, 10] } }, // ekranda 700 px: 320 kare fazla iri piksel olurdu
    { src: '06-great-bell-burst', out: '06-great-bell-burst', title: 'Great Bell of Valdoria: holy column with lightning on a cell', align: 'ground', fps: 14 },
  ],
  druid: [
    { src: '01-healing-rain', out: '01-healing-rain', title: 'Healing Rain: pale green-blue rain with a soft healing glow on a cell', align: 'ground', fps: 10, clean: 90 },
    { src: '02-healing-pool', out: '02-healing-pool', title: 'Healing Rain ground: shallow rain pool (loop)', align: 'keep', fps: 8, clean: 80 },
    { src: '03-wrath-surge', out: '03-wrath-surge', title: "Nature's Wrath: roots and a water surge erupt from a cell", align: 'ground', fps: 10, clean: 80 },
    { src: '04-thorn-whip', out: '04-thorn-whip', title: 'Thorn Whip: thorny vine lash', align: 'keep', fps: 14, clean: 80 },
    { src: '05-treant-rise', out: '05-treant-rise', title: 'Summon Treant: earth splits, mossy roots rise', align: 'ground', fps: 7, clean: 80 },
    { src: '06-root-fist', out: '06-root-fist', title: 'Root Smash: root fist slams down', align: 'ground', fps: 11, clean: 80 },
    { src: '07-vine-snare', out: '07-vine-snare', title: 'Vine Snare: root coil cinches', align: 'ground', fps: 10, clean: 80 },
    { src: '08-root-lash', out: '08-root-lash', title: 'Vine Snare: root lash (flight loop)', align: 'center', fps: 16, clean: 80 },
  ],
  undead: [
    { src: '01-grave-shard-fly', out: '01-bone-throw-fly', title: 'Bone Throw: grave shard (flight loop)', align: 'center', fps: 16 },
    { src: '02-grave-shard-hit', out: '02-bone-throw-hit', title: 'Bone Throw: shard burst + grave chill', align: 'keep', fps: 14 },
    { src: '03-wail-scream', out: '03-wail-of-the-dead-scream', title: 'Wail of the Dead: spectral scream', align: 'keep', fps: 14 },
    { src: '04-wail-grave', out: '04-wail-of-the-dead-grave', title: 'Wail of the Dead: wailing ghost + grave miasma (per cell)', align: 'ground', fps: 12, wrap: 0.8 },
    { src: '05-blood-oath-sigil', out: '05-dark-bond-sigil', title: 'Dark Bond: blood-oath sigil', align: 'keep', fps: 12, wrap: 0.5 },
    { src: '06-blood-oath-thread', out: '06-dark-bond-thread', title: 'Dark Bond: thorny vein thread (loop)', align: 'keep', fps: 14 },
    { src: '07-raise-dead', out: '07-raise-dead', title: 'Raise Dead: grave eruption', align: 'ground', fps: 11, wrap: 0.86 },
    { src: '08-soul-drain', out: '08-vampiric-bite-wisp', title: 'Vampiric Bite: crimson soul wisp (loop)', align: 'center', fps: 14 },
    { src: '09-bone-slash', out: '09-bone-slash', title: 'Bone Slash: bone-dust slash arc', align: 'keep', fps: 18 },
  ],
};

const cls = process.argv[2];
const CHECK = process.argv.includes('--check');
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null; // yalnız bu kaynaklar (ör. --only 04-cracked-bell)
const list = CLASSES[cls]?.filter((s) => !ONLY || ONLY.includes(s.src));
if (!list) {
  console.error(`kullanım: node tools/import-class-vfx.mjs <${Object.keys(CLASSES).join('|')}> [--check]`);
  process.exit(1);
}

const A_MIN = 16; // bu alfanın altı "boş" sayılır (ölçüm)

/** [a, b) aralığında alfa dolu piksel sayısı en az olan çizgi (eşitlikte beklenen yere en yakın). */
function emptiestLine(count, lo, hi, want) {
  let best = want;
  let bestN = Infinity;
  for (let i = Math.max(1, lo); i < hi; i++) {
    const n = count(i);
    if (n < bestN || (n === bestN && Math.abs(i - want) < Math.abs(best - want))) {
      bestN = n;
      best = i;
    }
  }
  return best;
}

/** Hücreyi (x0..x1, y0..y1) RGBA tamponuna kopyalar; kenara değen küçük bileşenler (komşu taşması) silinir. */
function cutCell(data, W, x0, y0, x1, y1) {
  const w = x1 - x0;
  const h = y1 - y0;
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) data.copy(px, y * w * 4, ((y0 + y) * W + x0) * 4, ((y0 + y) * W + x1) * 4);
  // bağlı bileşenler (4-komşu, alfa >= A_MIN)
  const lab = new Int32Array(w * h).fill(-1);
  const comps = [];
  const stack = [];
  let total = 0;
  for (let i = 0; i < w * h; i++) {
    if (lab[i] >= 0 || px[i * 4 + 3] < A_MIN) continue;
    const id = comps.length;
    let n = 0;
    let edge = false;
    stack.push(i);
    lab[i] = id;
    while (stack.length) {
      const j = stack.pop();
      n++;
      const x = j % w;
      const y = (j - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < h - 1 ? j + w : -1])
        if (k >= 0 && lab[k] < 0 && px[k * 4 + 3] >= A_MIN) {
          lab[k] = id;
          stack.push(k);
        }
    }
    comps.push({ n, edge });
    total += n;
  }
  let removed = 0;
  const drop = new Set(comps.flatMap((c, i) => (c.edge && c.n < total * 0.01 ? [i] : [])));
  for (let i = 0; i < w * h; i++) {
    if (lab[i] >= 0 && drop.has(lab[i])) {
      px[i * 4 + 3] = 0;
      removed++;
    } else if (lab[i] < 0) px[i * 4 + 3] = 0; // A_MIN altı gürültü: tamamen saydam
  }
  return { px, w, h, removed };
}

/** Yarı saydam sis / anahtar rengi artığı (macenta çıkarma halesi) temizliği: alfa `lo` altı 0, üstü yeniden ölçeklenir (SHEETS > clean). */
function cleanAlpha(px, lo) {
  for (let i = 3; i < px.length; i += 4) px[i] = px[i] <= lo ? 0 : Math.round(((px[i] - lo) * 255) / (255 - lo));
}

function stats(px, w, h) {
  let sa = 0, sx = 0, sy = 0, n = 0, x0 = w, y0 = h, x1 = -1, y1 = -1, dark = 0;
  const rows = new Float64Array(h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = px[i + 3];
      if (a < A_MIN) continue;
      n++;
      sa += a;
      sx += a * x;
      sy += a * y;
      rows[y]++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (a > 200 && px[i] + px[i + 1] + px[i + 2] < 30) dark++;
    }
  return { n, cx: sx / sa, cy: sy / sa, x0, y0, x1, y1, dark, rows };
}

/** Taban: alttan, genişliğin %3'ünden fazla dolu ilk satır; taban bandının (alttan %12) yatay ağırlık merkezi. */
function groundAnchor(px, w, h, st) {
  let base = st.y1;
  for (let y = st.y1; y > st.y0; y--)
    if (st.rows[y] > w * 0.03) {
      base = y;
      break;
    }
  const from = base - (st.y1 - st.y0) * 0.12;
  let sa = 0, sx = 0;
  for (let y = Math.max(0, Math.floor(from)); y <= base; y++)
    for (let x = 0; x < w; x++) {
      const a = px[(y * w + x) * 4 + 3];
      sa += a;
      sx += a * x;
    }
  return { base, bx: sa ? sx / sa : st.cx };
}

const outDir = join(ROOT, 'assets', 'vfx', cls);
if (!CHECK) mkdirSync(outDir, { recursive: true });
const report = [];
for (const s of list) {
  const FRAME = s.frame ?? DEFAULT_FRAME;
  const file = join(ROOT, 'assets', 'source', `${cls}-vfx`, `${s.src}.png`);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const filled = (x0, x1, y0, y1, vertical, i) => {
    let n = 0;
    if (vertical) for (let y = y0; y < y1; y++) n += data[(y * W + i) * 4 + 3] >= A_MIN ? 1 : 0;
    else for (let x = x0; x < x1; x++) n += data[(i * W + x) * 4 + 3] >= A_MIN ? 1 : 0;
    return n;
  };
  const ym = emptiestLine((y) => filled(0, W, 0, 0, false, y), Math.round(H * 0.42), Math.round(H * 0.58), Math.round(H / 2));
  const rowsY = [[0, ym], [ym, H]];
  const cells = [];
  for (const [ya, yb] of rowsY) {
    const xs = [0];
    for (let c = 1; c < 4; c++) xs.push(emptiestLine((x) => filled(0, 0, ya, yb, true, x), Math.round((W * c) / 4 - W * 0.06), Math.round((W * c) / 4 + W * 0.06), Math.round((W * c) / 4)));
    xs.push(W);
    for (let c = 0; c < 4; c++) {
      const cell = cutCell(data, W, xs[c], ya, xs[c + 1], yb);
      if (s.clean) cleanAlpha(cell.px, s.clean);
      cells.push(cell);
    }
  }
  // her karenin dayanağı (hücre pikseli) ve karede oturacağı yer (kesir); kare kenarı hiçbir karede içerik taşmayacak kadar büyük seçilir
  const fx = 0.5;
  const fy = s.align === 'ground' ? GROUND_BASE : 0.5;
  const anchors = cells.map((c) => {
    const st = stats(c.px, c.w, c.h);
    if (s.align === 'center') return { st, ax: st.cx, ay: st.cy };
    if (s.align === 'ground') {
      const g = groundAnchor(c.px, c.w, c.h, st);
      return { st, ax: g.bx, ay: g.base };
    }
    return { st, ax: c.w / 2, ay: c.h / 2 };
  });
  const side = Math.ceil(
    Math.max(
      ...cells.map((c) => Math.max(c.w, c.h)),
      ...anchors.map(({ st, ax, ay }) => Math.max((ax - st.x0) / fx, (st.x1 - ax) / (1 - fx), (ay - st.y0) / fy, (st.y1 - ay) / (1 - fy))),
    ) + 4,
  );
  const frames = [];
  const lines = [];
  for (const [i, c] of cells.entries()) {
    const { ax, ay } = anchors[i];
    const left = Math.round(side * fx - ax);
    const top = Math.round(side * fy - ay);
    // kare içinde kalan kısım (taşan kenar kırpılır; ölçüde "cut" sayılır)
    const canvas = Buffer.alloc(side * side * 4);
    let cut = 0;
    for (let y = 0; y < c.h; y++)
      for (let x = 0; x < c.w; x++) {
        const a = c.px[(y * c.w + x) * 4 + 3];
        if (!a) continue;
        const tx = x + left;
        const ty = y + top;
        if (tx < 0 || ty < 0 || tx >= side || ty >= side) {
          if (a >= A_MIN) cut++;
          continue;
        }
        c.px.copy(canvas, (ty * side + tx) * 4, (y * c.w + x) * 4, (y * c.w + x) * 4 + 4);
      }
    // kare ölçeği (SHEETS > scale: { kareNo: oran }, oran <= 1): çizimde büyüyen kareyi komşularının boyuna getirir; karenin yatay ortası ve alt kenarı sabit kalır
    const sc = s.scale?.[i] ?? 1;
    const inner = Math.round(FRAME * sc);
    const scaled = await sharp(canvas, { raw: { width: side, height: side, channels: 4 } }).resize(inner, inner, { kernel: 'lanczos3' }).raw().toBuffer();
    const resized = Buffer.alloc(FRAME * FRAME * 4);
    const ox = Math.round((FRAME - inner) / 2);
    const oy = FRAME - inner;
    for (let y = 0; y < inner; y++) scaled.copy(resized, ((oy + y) * FRAME + ox) * 4, y * inner * 4, (y + 1) * inner * 4);
    // kare kaydırma (SHEETS > shift: { kareNo: [dx, dy] }, çıktı pikseli): hizalamanın bozduğu tek kareyi yerine koyar; dışarı taşan saydam kabul edilir
    const [dx, dy] = s.shift?.[i] ?? [0, 0];
    const small = Buffer.alloc(resized.length);
    for (let y = 0; y < FRAME; y++)
      for (let x = 0; x < FRAME; x++) {
        const tx = x + dx;
        const ty = y + dy;
        if (tx >= 0 && ty >= 0 && tx < FRAME && ty < FRAME) resized.copy(small, (ty * FRAME + tx) * 4, (y * FRAME + x) * 4, (y * FRAME + x) * 4 + 4);
      }
    const so = stats(small, FRAME, FRAME);
    let edge = 0;
    for (let t = 0; t < FRAME; t++) for (const [x, y] of [[t, 0], [t, FRAME - 1], [0, t], [FRAME - 1, t]]) if (small[(y * FRAME + x) * 4 + 3] >= A_MIN) edge++;
    frames.push(small);
    lines.push(`  s${i + 1}: cell ${c.w}x${c.h} kırıntı ${c.removed}px taşan ${cut}px | çıktı dolu ${so.n} kutu ${so.x0},${so.y0}-${so.x1},${so.y1} merkez ${so.cx.toFixed(0)},${so.cy.toFixed(0)} kenar ${edge} siyah ${so.dark}${so.n < 500 ? '  BOS!' : ''}`);
  }
  report.push(`${s.out} (kaynak ${s.src}, ${W}x${H}, satır kesimi y=${ym}, hücre ${side}px -> ${FRAME}, hizalama ${s.align})`, ...lines);
  if (CHECK) continue;
  const sheet = Buffer.alloc(FRAME * 4 * FRAME * 2 * 4);
  frames.forEach((f, i) => {
    const gx = (i % 4) * FRAME;
    const gy = Math.floor(i / 4) * FRAME;
    for (let y = 0; y < FRAME; y++) f.copy(sheet, ((gy + y) * FRAME * 4 + gx) * 4, y * FRAME * 4, (y + 1) * FRAME * 4);
  });
  await sharp(sheet, { raw: { width: FRAME * 4, height: FRAME * 2, channels: 4 } }).png({ compressionLevel: 9 }).toFile(join(outDir, `${s.out}.png`));
  const meta = {
    slug: s.out,
    title: s.title,
    source: `assets/source/${cls}-vfx/${s.src}.png`,
    frames: 8,
    fps: s.fps,
    duration_ms: Math.round((8 / s.fps) * 1000),
    frame_size: [FRAME, FRAME],
    sheet_size: [FRAME * 4, FRAME * 2],
    grid: [4, 2],
    order: 'row-major',
    padding_px: 0,
    pivot: s.align === 'ground' ? [FRAME / 2, Math.round(FRAME * GROUND_BASE)] : [FRAME / 2, FRAME / 2],
    align: s.align,
    ...(s.wrap ? { wrap: { split: s.wrap } } : {}),
  };
  writeFileSync(join(outDir, `${s.out}.json`), JSON.stringify(meta, null, 2) + '\n');
}
console.log(report.join('\n'));
if (!CHECK) console.log(`\nyazıldı: assets/vfx/${cls}/ (sonra: node tools/webp-assets.mjs)`);
