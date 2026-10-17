// Poz kütüphanesi v2 (Ömer 2026-10-12, future-ideas "Poz listesi kararları" + "Silah ve tutuş kuralları"; docs/design/pose-coverage.md).
//
// ===== NASIL: yeni bir sınıfa KENDİ gövdesini vermek (aynı 26 kare; yay yoksa 24) =====================================================================
//  1. ChatGPT sayfalarını (koyu düz zemin, saydamlık YOK, karakter sağa baksın; sola bakan hücre otomatik aynalanır) şuraya koy:
//       assets/source/poses/<id>-v2/one-handed.png  4 x 3: idle1 step1 slash1 overhead1 / thrust1 spin1a spin1b spin1c / guard1 raise channel point
//       assets/source/poses/<id>-v2/two-handed.png  4 x 3: idle2 step2 slash2 overhead2 / thrust2 spin2a spin2b spin2c / guard2 throw hit kneel
//       assets/source/poses/<id>-v2/bow.png         2 x 1: bow_shot bow_sky   (İSTEĞE BAĞLI: yalnızca yay kullanan sınıf; yoksa 24 kare,
//                                                    yay tutuşu tek el takımına düşer). Sayfa boyu / hücre boyu serbest (1024x1536, 1536x1024...).
//     (<id> = data/classes/<id>.json kimliği, ör. archer.) Hücre sırası Warrior v2 ile birebir aynı olmalı.
//  2. node tools/make-poses-v2.mjs --class=<id>
//       -> assets/poses/<id>-v2/<kare>.png (+ small/) ve data/poses.json > classes.<id>_v2 (ayak/taban/boy Warrior v2 ile aynı ölçekte:
//          her sayfa, karelerinin boyu Warrior v2'nin aynı karelerine (medyan oran) denk gelecek şekilde ölçeklenir). Tutuş takımları,
//          durumlar, itemPoses, heightFit ve weaponScale yoksa warrior_v2'den kopyalanır (sonra elle değiştirilebilir; yeniden üretimde korunur).
//       -> data/poses.json > classAliases: o sınıfın Pose Tester'ı (ör. "Pose Tester IV (Archer)") artık bu gövdeyi kullanır (yoksa warrior_v2).
//  3. Kontrol: node tools/make-poses-v2.mjs --class=<id> --preview=<klasör> --marks   (yeşil artı = ana el, mavi = ikinci el)
//     El noktaları Warrior v2'deki oranlardan tahmin edilir (yalnızca kutuya göre oran); yanlışsa ince ayar: node tools/pose-editor.mjs ya da
//     assets/source/poses/<id>-v2/config.json:
//       { "mirror": ["thrust1"], "noMirror": ["spin1b"], "seeds": { "idle1": { "main": [185, 213], "off": [75, 277] } } }
//     (seeds = sayfa koordinatı, aynalamadan önce; verilen kare yeniden algılanır; "steelHands": true = çelik eldiven araması).
//     Tek kare düzeltmesi: assets/source/poses/<id>-v2/override-<kare>.png (tek figür, koyu düz #121212 zemin, ör. 1024x1536) o kareyi
//     sayfalardan ALIR; boyu yerine geçtiği karenin boyuna eşitlenir (taban/ayak ortası aynı kural). Tohumu config.json > seeds.<kare>
//     içinde O DOSYANIN koordinatıyla verilir. Yeni poz eskisinden belirgin kısa/uzunsa (kambur isabet) config.json > "overrideScale":
//     { "hit": 1.2 } ek çarpanı kafa boyunu diğer karelere eşitler.
//     Sınıfa özel EK poz (ortak 26 karede olmayan, ör. Cutthroat cross_cut): assets/source/poses/<id>-v2/extra-<poz>.png (tek figür, koyu
//     düz #121212 zemin, ör. 1024x1536). override gibi normalize edilir: boyu config.json > "extraRef".<poz> karesinin (yoksa idle1) boyuna
//     eşitlenir (+ overrideScale.<poz> çarpanı); el tohumu ZORUNLU: config.json > seeds.<poz> (o dosyanın koordinatı, angle / offAngle ile;
//     bayraklar da: "hidden": true = eşya kareye BOYALI, oyun silah / tılsım çizmez, büyü çıkışı ikinci el noktası; ör. Hexer doll_stab).
//     Kare tüm tutuş takımlarında ortaktır; skill'e bağlamak pt_* kopyasının pozuyla (tools/make-pose-testers.mjs > POSE).
//     Önizleme: --preview=<klasör> --set=extra [--weapons=daggers:rondel --off=daggers:rondel] --marks
//     DAR DURUŞ (Ömer 2026-10-13, "çok geniş duruyorlar"): assets/source/poses/<id>-v2/narrow.png (Warrior: warrior-v2-narrow/narrow.png),
//     3 x 3: idle1 idle2 guard1 / guard2 raise channel / point throw hit (sağa bakan, koyu düz zemin). Ana sayfalardan SONRA, override /
//     extra'dan ÖNCE uygulanır; bu 9 karenin override-<kare>.png dosyaları YOK SAYILIR (dar sayfa onların yerine geçer). Ölçek: Warrior'da
//     eski karelerin boyu x NARROW_SCALE (dar duruş daha uzun; kafa boyu eşit kalsın), diğer sınıflarda Warrior v2'nin dar kareleri (medyan).
//     El tohumları config.json > "narrowSeeds".<kare> (narrow.png koordinatı); yoksa Warrior v2'deki orandan tahmin.
//     EL KURALI (Ömer 2026-10-13, "eller yer değiştirmesin"): main = karakterin SAĞ eli (silah), off = SOL eli (kalkan / ikinci hançer /
//     bebek), HER karede. 3/4 önden sağa bakan gövdede sağ kol arka (resimde soldaki) omuzdan çıkar; point'te işaret eden el sol eldir (off).
//     Yay kareleri istisna: yay (main) öndeki elde.
//     Sonra npm test (tests/poses-v2-classes.test.ts). Silah sayfaları yalnızca Warrior çalıştırmasında (ya da --weapons-only) yeniden kesilir.
// ========================================================================================================================================
//
// Warrior v2 (referans gövde, classes.warrior_v2): 13 ortak poz, silah pozları TEK EL (…1) ve ÇİFT EL (…2) + yay (bow_shot, bow_sky).
// Ek sayfa assets/source/poses/warrior-v2-extra/extra.png (3 x 2: idle2 slash1 slash2 / spin2a bow_shot bow_sky; Ömer 2026-10-13) eski
// sayfaların o hücrelerinin YERİNE geçer (eski sayfalar olduğu gibi kalır). Gerçek Warrior v1'de kalır (tools/make-poses.mjs).
//
// Çıktı: assets/poses/<id>-v2/<kare>.png (+ small/), ortak tuval: ayak ortası tuvalin yatay ortasında, taban aynı satırda.
//        data/poses.json > classes.<id>_v2: tuval, figür, kutu ve el noktaları (anchor = ana el + açı, offhand = sol el + açı, src = kaynak).
//
// Zemin silme: kenarlardan taşma dolgusu (en parlak kanal <= BG), sonra zemine değen koyu kenar piksellerinde alfa rampası (BG..EDGE).
// Figürler bağlı bileşen; her bileşen merkezinin düştüğü hücreye atanır (küçük kopuk parçalar da). Yön: Warrior'da thrust1/thrust2
// sola bakıyor (kaynak hatası, MIRROR); diğer sınıflarda her hücrenin silueti Warrior v2'nin aynı karesiyle düz ve aynalı karşılaştırılır.
//
// El noktaları: Warrior'da SEEDS (sayfa koordinatı, gözle) + yumruk araması (çelik eldiven piksellerinin ağırlık merkezi). --redetect
// olmadan data/poses.json'daki mevcut el noktaları KORUNUR (kaynağı aynı kalan karede; tuval değişirse kutuyla birlikte taşınır).
//
//   node tools/make-poses-v2.mjs [--class=<id>] [--redetect] [--debug] [--bodies-only | --weapons-only]
//   node tools/make-poses-v2.mjs [--class=<id>] --preview=<klasör> [--marks] [--scale=0.5] [--set=one|two|bow|extra] [--frames=idle2,slash2] [--weapons=bows:hunting]
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import sharp from 'sharp';

const argOf = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const CLS = argOf('class') ?? 'warrior';
const REF = 'warrior_v2';
const ID = `${CLS}_v2`;
const IS_REF = ID === REF;
const DIR = `${CLS}-v2`;
const SRCROOT = 'assets/source/poses';
const SRC = `${SRCROOT}/${DIR}`;
const OUT = `assets/poses/${DIR}`;
const WOUT = 'assets/weapons';
const DATA = 'data/poses.json';
const ALPHA = 40;
const BG = 18;
const EDGE = 60;
const PAD = 6;
const DEBUG = process.argv.includes('--debug');
const REDETECT = process.argv.includes('--redetect');

const ONE = [
  ['idle1', 'step1', 'slash1', 'overhead1'],
  ['thrust1', 'spin1a', 'spin1b', 'spin1c'],
  ['guard1', 'raise', 'channel', 'point'],
];
const TWO = [
  ['idle2', 'step2', 'slash2', 'overhead2'],
  ['thrust2', 'spin2a', 'spin2b', 'spin2c'],
  ['guard2', 'throw', 'hit', 'kneel'],
];
const BOW = [['bow_shot', 'bow_sky']];
/** Her v2 gövdenin 26 karesi (sıra = data/poses.json > poses sırası). */
const FRAMES = [...ONE.flat(), ...TWO.flat(), ...BOW.flat()];

/** Sınıfa özel ek sayfalar: listedeki hücreler ana sayfaların aynı adlı hücrelerinin YERİNE geçer (sonra gelen kazanır). */
const CLASS_EXTRAS = {
  warrior: [{ file: `${SRCROOT}/warrior-v2-extra/extra.png`, names: [['idle2', 'slash1', 'slash2'], ['spin2a', 'bow_shot', 'bow_sky']] }],
};
/** Dar duruş sayfası (narrow.png, 3 x 3): bu 9 kare ana sayfalardaki (ve override'lardaki) karelerin yerine geçer. */
const NARROW = [
  ['idle1', 'idle2', 'guard1'],
  ['guard2', 'raise', 'channel'],
  ['point', 'throw', 'hit'],
];
const NARROW_FILE = IS_REF ? `${SRCROOT}/warrior-v2-narrow/narrow.png` : join(SRC, 'narrow.png');
/** Warrior dar sayfasının ölçek çarpanı (eski karelerin boyuna göre; dar duruş daha dik = daha uzun, kafa boyu eşit kalsın). */
const NARROW_SCALE = 1.0;
/** Warrior ana sayfalarında sola bakan hücreler (kaynak hatası). */
const REF_MIRROR = new Set(['thrust1', 'thrust2']);

const CONFIG = existsSync(join(SRC, 'config.json')) ? JSON.parse(readFileSync(join(SRC, 'config.json'), 'utf8')) : {};

/**
 * Warrior el tohumları (sayfa koordinatı, AYNALAMADAN ÖNCE). main = silah eli (ön/sağ el), off = sol el (kalkan / ikinci hançer / yayda
 * kirişi çeken el), angle = silah açısı (derece, saat yönü, 0 = ağız yukarı), offAngle = ikinci el eşyasının açısı. Çift el takımında
 * ikinci el kabzada (bilgi). Ek: back (silah gövdenin arkasında), flip (aynala), hidden (çizilmez), fist (yama yarıçapı).
 */
const SEEDS = {
  idle1: { main: [185, 213], off: [75, 277], angle: 35, offAngle: 10 },
  // 2026-10-13 el kuralı: geriye uzanan kol SAĞ kol (silah), göğüsteki yumruk sol (kalkan); hazır tutuş: ağız yukarı-öne
  step1: { main: [275, 205], off: [490, 230], angle: 35, offAngle: 10 },
  slash1: { main: [548, 152], off: [700, 222], angle: -100, offAngle: 20 },
  overhead1: { main: [893, 62], off: [990, 225], angle: 10, offAngle: 20 },
  thrust1: { main: [27, 668], off: [215, 680], angle: -90, offAngle: 10 },
  spin1a: { main: [300, 650], off: [440, 700], angle: -80, offAngle: 10 },
  spin1b: { main: [772, 660], off: [535, 670], angle: 90, offAngle: -10, back: true },
  spin1c: { main: [810, 708], off: [1002, 655], angle: 90, offAngle: 90 }, // önden görünüm: sağ el resimde solda (göğüste)
  guard1: { main: [60, 1190], off: [208, 1150], angle: 30, offAngle: 0 },
  raise: { main: [327, 990], off: [452, 1158], angle: 0, offAngle: 20 },
  channel: { main: [715, 1140], off: [645, 1140], angle: 80, offAngle: 80 },
  point: { main: [795, 1188], off: [1000, 1124], angle: 160, offAngle: 80 },
  idle2: { main: [112, 268], off: [112, 250], angle: 165 },
  step2: { main: [355, 140], off: [355, 140], angle: -30 },
  slash2: { main: [550, 180], off: [560, 180], angle: -100 },
  overhead2: { main: [900, 45], off: [900, 45], angle: -10 },
  thrust2: { main: [28, 668], off: [28, 668], angle: -90 },
  spin2a: { main: [300, 655], off: [300, 655], angle: -90 },
  spin2b: { main: [775, 665], off: [775, 665], angle: 90 },
  spin2c: { main: [1000, 662], off: [1000, 662], angle: 90 },
  guard2: { main: [210, 1110], off: [40, 1110], angle: 90 },
  throw: { main: [280, 1220], off: [530, 1090], angle: 190, offAngle: 60 },
  hit: { main: [680, 1240], off: [650, 1240], angle: 150 },
  kneel: { main: [925, 1375], off: [925, 1375], angle: 100 },
};
/**
 * Warrior dar sayfası (warrior-v2-narrow/narrow.png, 1536 x 1024) tohumları. main = SAĞ el (resimde arkadaki / soldaki kol). Hazır tutuş
 * (Ömer 2026-10-13, "tek elli kılıç böyle mi tutulur"): idle1 / guard1 tek el silahı yumrukta ağzı YUKARI ve hafif ÖNE (30-35°).
 */
const NARROW_SEEDS = {
  idle1: { main: [283, 157], off: [380, 127], angle: 22, offAngle: 10 }, // yumruk kalçada: 22° ağız yüzün önünden geçmez
  idle2: { main: [712, 186], off: [712, 186], angle: 40 },
  guard1: { main: [1125, 135], off: [1267, 73], angle: 30, offAngle: 0 },
  guard2: { main: [390, 404], off: [390, 404], angle: 15 },
  raise: { main: [745, 352], off: [830, 477], angle: 0, offAngle: 20 },
  channel: { main: [1303, 453], off: [1273, 453], angle: 80, offAngle: 80 },
  point: { main: [255, 800], off: [465, 740], angle: 30, offAngle: 80 }, // işaret eden (açık) el SOL el = off
  throw: { main: [727, 690], off: [890, 817], angle: 190, offAngle: 60 },
  hit: { main: [1207, 808], off: [1207, 808], angle: 150 },
};
/** Warrior ek sayfası (extra.png, 1536 x 1024) tohumları. */
const EXTRA_SEEDS = {
  idle2: { main: [222, 258], off: [205, 240], angle: 165 },
  slash1: { main: [970, 145], off: [615, 192], angle: 80, offAngle: 20 },
  slash2: { main: [1385, 285], off: [1368, 270], angle: 125 },
  spin2a: { main: [130, 700], off: [140, 690], angle: -100 },
  bow_shot: { main: [965, 580], off: [690, 570], angle: 0, offAngle: 0 },
  bow_sky: { main: [1440, 500], off: [1190, 595], angle: -40, offAngle: 0 },
};

async function load(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

/**
 * Koyu düz zemini siler: kenardan taşma dolgusu + kenar alfa rampası (yerinde). `holes` (silah sayfaları): kapalı kalan büyük koyu zemin
 * cepleri de silinir (yay ile kirişi arası; gövde sayfasında KAPALI: zırhın koyu iç bölgeleri silinmesin).
 */
function removeBackground(img, holes = false) {
  const { data, W, H } = img;
  const mx = (p) => Math.max(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
  const bg = new Uint8Array(W * H);
  const fill = (seeds, mark = 1) => {
    const st = [...seeds];
    const got = [];
    while (st.length) {
      const p = st.pop();
      if (bg[p] || mx(p) > BG) continue;
      bg[p] = mark;
      got.push(p);
      const x = p % W;
      if (x > 0) st.push(p - 1);
      if (x < W - 1) st.push(p + 1);
      if (p >= W) st.push(p - W);
      if (p < W * (H - 1)) st.push(p + W);
    }
    return got;
  };
  const edge = [];
  for (let x = 0; x < W; x++) edge.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) edge.push(y * W, y * W + W - 1);
  fill(edge);
  if (holes)
    for (let p = 0; p < W * H; p++) {
      if (bg[p] || mx(p) > BG) continue;
      const got = fill([p], 2);
      if (got.length >= 150) for (const q of got) bg[q] = 1; // küçük koyu iç bölge (2) eşyanın parçası kalır

    }
  for (let p = 0; p < W * H; p++) if (bg[p] === 2) bg[p] = 0;
  for (let p = 0; p < W * H; p++) {
    if (bg[p]) {
      data[p * 4 + 3] = 0;
      continue;
    }
    const x = p % W;
    const nearBg = (x > 0 && bg[p - 1]) || (x < W - 1 && bg[p + 1]) || (p >= W && bg[p - W]) || (p < W * (H - 1) && bg[p + W]);
    const m = mx(p);
    data[p * 4 + 3] = nearBg && m < EDGE ? Math.round((255 * (m - BG)) / (EDGE - BG)) : 255;
  }
}

/** Bağlı bileşenler (4 komşu, alfa > ALPHA); 30 pikselden küçükler atlanır. */
function components(img) {
  const { data, W, H } = img;
  const lab = new Int32Array(W * H).fill(-1);
  const out = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] <= ALPHA || lab[y * W + x] >= 0) continue;
      const id = out.length;
      const st = [y * W + x];
      lab[y * W + x] = id;
      const c = { id, n: 0, sx: 0, sy: 0, x0: x, x1: x, y0: y, y1: y };
      while (st.length) {
        const p = st.pop();
        const px = p % W;
        const py = (p - px) / W;
        c.n++;
        c.sx += px;
        c.sy += py;
        if (px < c.x0) c.x0 = px;
        if (px > c.x1) c.x1 = px;
        if (py < c.y0) c.y0 = py;
        if (py > c.y1) c.y1 = py;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const qx = px + dx;
          const qy = py + dy;
          if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
          const q = qy * W + qx;
          if (lab[q] < 0 && data[q * 4 + 3] > ALPHA) {
            lab[q] = id;
            st.push(q);
          }
        }
      }
      out.push(c);
    }
  return { lab, comps: out.filter((c) => c.n >= 30) };
}

/**
 * İki komşu figür bir kenar pikseliyle birleşmişse (pelerin uçları) hücre sınırının ±40 pikselinde en az dolu sütundan böler: sınırın iki
 * yanında da büyük kütle (figür) varsa. Taşan kol gibi küçük parçalar bölünmez.
 */
function splitMerged(img, lab, comps, cols = 4) {
  const cw = img.W / cols;
  let next = Math.max(...comps.map((c) => c.id)) + 1;
  const out = [];
  for (const c of comps) {
    let cut = null;
    for (let b = cw; b < img.W; b += cw) {
      if (c.x0 > b - 40 || c.x1 < b + 40) continue;
      let left = 0;
      let right = 0;
      const col = new Map();
      for (let y = c.y0; y <= c.y1; y++)
        for (let x = c.x0; x <= c.x1; x++) {
          if (lab[y * img.W + x] !== c.id) continue;
          if (x < b) left++;
          else right++;
          if (Math.abs(x - b) <= 40) col.set(x, (col.get(x) ?? 0) + 1);
        }
      if (left < 15000 || right < 15000) continue;
      let best = b;
      for (let x = b - 40; x <= b + 40; x++) if ((col.get(x) ?? 0) < (col.get(best) ?? 0)) best = x;
      cut = best;
    }
    if (cut === null) {
      out.push(c);
      continue;
    }
    const a = { id: c.id, n: 0, sx: 0, sy: 0, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    const r = { ...a, id: next++ };
    for (let y = c.y0; y <= c.y1; y++)
      for (let x = c.x0; x <= c.x1; x++) {
        const p = y * img.W + x;
        if (lab[p] !== c.id) continue;
        const t = x < cut ? a : r;
        lab[p] = t.id;
        t.n++;
        t.sx += x;
        t.sy += y;
        t.x0 = Math.min(t.x0, x);
        t.x1 = Math.max(t.x1, x);
        t.y0 = Math.min(t.y0, y);
        t.y1 = Math.max(t.y1, y);
      }
    if (DEBUG) console.log(`split merged figures at x=${cut}`);
    out.push(a, r);
  }
  return out;
}

/** Çelik eldiven pikseli: dolu, doygunluğu düşük, orta-açık ton. */
function steel(img, x, y) {
  const i = (y * img.W + x) * 4;
  if (img.data[i + 3] < 200) return false;
  const r = img.data[i];
  const g = img.data[i + 1];
  const b = img.data[i + 2];
  const mx = Math.max(r, g, b);
  return mx > 95 && mx - Math.min(r, g, b) < 40;
}

/** Tohum çevresinde yumruk: yarıçap içinde çelik piksellerin ağırlık merkezi (yoksa tohum). */
function fist(img, [x0, y0], r = 18) {
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let y = y0 - r; y <= y0 + r; y++)
    for (let x = x0 - r; x <= x0 + r; x++) {
      if (x < 0 || y < 0 || x >= img.W || y >= img.H || (x - x0) ** 2 + (y - y0) ** 2 > r * r) continue;
      if (steel(img, x, y)) {
        n++;
        sx += x;
        sy += y;
      }
    }
  return n > 30 ? [sx / n, sy / n] : [x0, y0];
}

const readData = () => (existsSync(DATA) ? JSON.parse(readFileSync(DATA, 'utf8')) : {});

/** Hücre başına figür: o hücreye düşen tüm bileşenler (kutu + etiket kümesi). */
function cellsOf(img, lab, comps, names, cols = 4, rows = 3) {
  const cw = img.W / cols;
  const ch = img.H / rows;
  const cells = new Map();
  // büyükten küçüğe: küçük kopuk parça yalnızca figürün kutusuna 12 pikselden yakınsa alınır (zemindeki kırıntılar atılır)
  for (const c of [...comps].sort((a, b) => b.n - a.n)) {
    const col = Math.floor(c.sx / c.n / cw);
    const row = Math.floor(c.sy / c.n / ch);
    let name = names[row]?.[col];
    if (!name) continue;
    if (c.n < 2000) {
      // küçük parça: kutusuna EN YAKIN figüre (merkezi komşu hücreye düşen kopuk yumruk / ayak kendi figürüne gider)
      const gap = (g) => Math.max(g.x0 - c.x1, c.x0 - g.x1, g.y0 - c.y1, c.y0 - g.y1, 0);
      let best = null;
      for (const [n, g] of cells) if (gap(g) <= 12 && (!best || gap(g) < best.d || (gap(g) === best.d && n === name))) best = { n, d: gap(g) };
      if (!best) continue;
      name = best.n;
    }
    const f = cells.get(name) ?? { ids: new Set(), n: 0, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, main: null };
    f.ids.add(c.id);
    f.n += c.n;
    f.x0 = Math.min(f.x0, c.x0);
    f.x1 = Math.max(f.x1, c.x1);
    f.y0 = Math.min(f.y0, c.y0);
    f.y1 = Math.max(f.y1, c.y1);
    if (!f.main || c.n > f.main.n) f.main = c;
    cells.set(name, f);
  }
  for (const n of names.flat()) if (!cells.has(n)) throw new Error(`${n}: figür bulunamadı`);
  return cells;
}

/** Figürün temiz RGBA tamponu (kutu boyu; başka hücrenin pikselleri atılır; aynalı kare yatay çevrilir). */
function extract(img, lab, f, mirror) {
  const w = f.x1 - f.x0 + 1;
  const h = f.y1 - f.y0 + 1;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = f.x0 + x;
      const sy = f.y0 + y;
      const si = (sy * img.W + sx) * 4;
      const l = lab[sy * img.W + sx];
      let a = img.data[si + 3];
      if (l >= 0 && !f.ids.has(l)) a = 0;
      if (a < 24) a = 0;
      else if (a >= 245) a = 255;
      const di = (y * w + (mirror ? w - 1 - x : x)) * 4;
      buf[di] = img.data[si];
      buf[di + 1] = img.data[si + 1];
      buf[di + 2] = img.data[si + 2];
      buf[di + 3] = a;
    }
  return { buf, w, h };
}

/** Bu sınıfın sayfaları: ana sayfalar (bow.png varsa o da), sonra ek sayfalar (CLASS_EXTRAS + config.extras; aynı adlı hücreyi ezer). */
function sheetsFor() {
  const list = [
    { file: join(SRC, 'one-handed.png'), names: ONE, seeds: IS_REF ? SEEDS : null },
    { file: join(SRC, 'two-handed.png'), names: TWO, seeds: IS_REF ? SEEDS : null },
  ];
  if (existsSync(join(SRC, 'bow.png'))) list.push({ file: join(SRC, 'bow.png'), names: BOW, seeds: null });
  for (const e of CLASS_EXTRAS[CLS] ?? []) list.push({ ...e, seeds: IS_REF ? EXTRA_SEEDS : null, extra: true });
  for (const e of CONFIG.extras ?? []) list.push({ file: join(SRC, e.file), names: e.names, seeds: null, extra: true });
  // dar duruş sayfası (narrow.png): ana / ek sayfalardan sonra, override'lardan önce
  const narrow = existsSync(NARROW_FILE);
  if (narrow) list.push({ file: NARROW_FILE, names: NARROW, seeds: IS_REF ? NARROW_SEEDS : null, extra: true, narrow: true });
  // tek kare yerine geçenler: override-<kare>.png (tek figür, koyu düz zemin; en son gelir, her şeyi ezer)
  for (const f of existsSync(SRC) ? readdirSync(SRC).sort() : []) {
    const m = /^override-(.+)\.png$/.exec(f);
    if (!m) continue;
    if (!FRAMES.includes(m[1])) throw new Error(`${f}: bilinmeyen kare ${m[1]}`);
    if (narrow && NARROW.flat().includes(m[1])) {
      console.log(`${f}: YOK SAYILDI (narrow.png ${m[1]} karesinin yerine geçer)`);
      continue;
    }
    list.push({ file: join(SRC, f), names: [[m[1]]], seeds: null, extra: true, override: true });
  }
  // sınıfa özel ek poz: extra-<poz>.png (ortak listede OLMAYAN ad; override gibi tek figür, ölçeği extraRef karesine göre)
  for (const f of existsSync(SRC) ? readdirSync(SRC).sort() : []) {
    const m = /^extra-(.+)\.png$/.exec(f);
    if (!m) continue;
    if (FRAMES.includes(m[1])) throw new Error(`${f}: ${m[1]} ortak bir kare (override-${m[1]}.png kullan)`);
    list.push({ file: join(SRC, f), names: [[m[1]]], seeds: null, extra: true, override: true, extraPose: m[1] });
  }
  for (const s of list) if (!existsSync(s.file)) throw new Error(`${s.file} yok (how-to: dosyanın başı)`);
  return list;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 1;
};

/** Alfa silueti (kutuya gerilmiş GW x GH ızgara, 0/1). */
const GW = 40;
const GH = 60;
function silhouette(buf, w, h, flip = false) {
  const out = new Uint8Array(GW * GH);
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) {
      let x = Math.min(w - 1, Math.floor(((gx + 0.5) * w) / GW));
      if (flip) x = w - 1 - x;
      const y = Math.min(h - 1, Math.floor(((gy + 0.5) * h) / GH));
      out[gy * GW + gx] = buf[(y * w + x) * 4 + 3] > 128 ? 1 : 0;
    }
  return out;
}
const iou = (a, b) => {
  let i = 0;
  let u = 0;
  for (let k = 0; k < a.length; k++) {
    i += a[k] & b[k];
    u += a[k] | b[k];
  }
  return u ? i / u : 0;
};

/**
 * Yön tespiti: hücrenin silueti Warrior v2'nin aynı karesine (sağa bakan referans) düz mü aynalı mı daha çok benziyor. Referans yoksa null.
 * Dönen { mirror, straight, flipped } (IoU).
 */
async function detectFacing(name, ex, refDef) {
  const rp = refDef?.poses?.[name];
  const file = join('assets/poses', refDef?.dir ?? 'warrior-v2', `${name}.png`);
  if (!rp?.box || !existsSync(file)) return null;
  const { data } = await sharp(file).ensureAlpha().extract({ left: rp.box.x, top: rp.box.y, width: rp.box.w, height: rp.box.h }).raw().toBuffer({ resolveWithObject: true });
  const ref = silhouette(data, rp.box.w, rp.box.h);
  const straight = iou(silhouette(ex.buf, ex.w, ex.h), ref);
  const flipped = iou(silhouette(ex.buf, ex.w, ex.h, true), ref);
  return { mirror: flipped > straight + 0.02, straight, flipped };
}

/** Pose Tester'ın kimliği (adı "Pose Tester <n> (<sınıf adı>)"), yoksa null. */
function testerOf(cls) {
  const real = existsSync(`data/classes/${cls}.json`) ? JSON.parse(readFileSync(`data/classes/${cls}.json`, 'utf8')).name : null;
  if (!real) return null;
  for (const f of readdirSync('data/classes').filter((x) => /^pose_tester_\d+\.json$/.test(x))) {
    const d = JSON.parse(readFileSync(`data/classes/${f}`, 'utf8'));
    if (d.name?.endsWith(`(${real})`)) return d.id;
  }
  return null;
}

/** Warrior v2'den kopyalanan (yoksa) sınıf ayarları. */
const INHERIT = ['heightFit', 'idleSprite', 'defaultWeapon', 'weaponScale', 'cycles', 'grips', 'gripFallback', 'gripWeapon', 'states', 'hitRecoil', 'itemPoses'];

async function bodies(data) {
  const cls = (data.classes ??= {});
  const refDef = cls[REF];
  if (!IS_REF && !refDef?.poses) throw new Error(`${REF} yok: önce node tools/make-poses-v2.mjs (Warrior) çalıştır`);
  const sheets = sheetsFor();
  /** ad -> { img, lab, f, footX (sayfa), sheet } (sonraki sayfa ezer) */
  const raw = new Map();
  const baseH = new Map(); // Warrior: ana sayfadaki boy (ek sayfanın ölçeği için)
  for (const sheet of sheets) {
    const img = await load(sheet.file);
    removeBackground(img);
    const cols = sheet.names[0].length;
    const rows = sheet.names.length;
    const { lab, comps: rawComps } = components(img);
    const comps = splitMerged(img, lab, rawComps, cols);
    const cells = cellsOf(img, lab, comps, sheet.names, cols, rows);
    const got = new Map();
    for (const [name, f] of cells) {
      // ayak ortası: figürün (tüm bileşenleri; kopuk ayak da) alt %8'lik bandı
      const band = Math.max(8, Math.round((f.y1 - f.y0 + 1) * 0.08));
      let fx0 = Infinity;
      let fx1 = -Infinity;
      for (let y = f.y1 - band + 1; y <= f.y1; y++) for (let x = f.x0; x <= f.x1; x++) if (f.ids.has(lab[y * img.W + x])) (fx0 = Math.min(fx0, x)), (fx1 = Math.max(fx1, x));
      got.set(name, { img, lab, f, footX: Math.round((fx0 + fx1) / 2), sheet, h: f.y1 - f.y0 + 1 });
    }
    // sayfa ölçeği: Warrior ana sayfaları 1; Warrior ek sayfası = eski karelerin boyu / yeni boy (medyan); diğer sınıflar Warrior v2'ye
    let scale = 1;
    const ratios = [];
    if (sheet.narrow) {
      // dar sayfa: Warrior'da eski karelerin boyu x NARROW_SCALE; diğer sınıflarda Warrior v2'nin aynı (dar) kareleri (ana sayfa kuralı)
      for (const [n, g] of got) {
        if (IS_REF) {
          if (baseH.has(n)) ratios.push((baseH.get(n) / g.h) * NARROW_SCALE);
        } else if (refDef.poses[n]?.box) ratios.push(refDef.poses[n].box.h / g.h);
      }
      if (!IS_REF && CONFIG.narrowScale) ratios.splice(0, ratios.length, ...ratios.map((r) => r * CONFIG.narrowScale));
    } else if (sheet.override) {
      // tek kare: yerine geçtiği karenin (ölçeklenmiş) boyuna eşitlenir (Warrior extra.png ile aynı kural; sınıfın ortak boyu korunur)
      // config.overrideScale.<kare>: ek çarpan (yeni poz eskisinden kısa/uzunsa, ör. kambur isabet karesi; kafa boyu diğer karelere denk gelsin)
      // ek poz (extra-<poz>.png): eşi yok, boyu extraRef karesine (yoksa idle1) eşitlenir
      for (const [n, g] of got) {
        const ref = sheet.extraPose ? (CONFIG.extraRef?.[n] ?? 'idle1') : n;
        if (raw.has(ref)) ratios.push(((raw.get(ref).h * raw.get(ref).scale) / g.h) * (CONFIG.overrideScale?.[n] ?? 1));
      }
    } else if (IS_REF) {
      if (sheet.extra) for (const [n, g] of got) if (baseH.has(n)) ratios.push(baseH.get(n) / g.h);
    } else for (const [n, g] of got) if (refDef.poses[n]?.box) ratios.push(refDef.poses[n].box.h / g.h);
    if (ratios.length) scale = median(ratios);
    if (Math.abs(scale - 1) < 0.004) scale = 1;
    console.log(`${relative('.', sheet.file).replaceAll('\\', '/')}: ${got.size} cells, scale ${scale.toFixed(3)}${ratios.length ? ` (median of ${ratios.length})` : ''}`);
    for (const [n, g] of got) {
      if (IS_REF && !sheet.extra) baseH.set(n, g.h);
      raw.set(n, { ...g, scale });
    }
  }
  // yay kareleri İSTEĞE BAĞLI (yalnızca yay kullanan sınıf: bow.png); yoksa 24 kare, yay tutuşu tek el takımına düşer
  const hasBow = BOW.flat().every((n) => raw.has(n));
  const extraPoses = sheets.filter((x) => x.extraPose).map((x) => x.extraPose);
  const list = [...(hasBow ? FRAMES : FRAMES.filter((n) => !BOW.flat().includes(n))), ...extraPoses];
  for (const n of list) if (!raw.has(n)) throw new Error(`${n}: hiçbir sayfada yok`);

  const frames = new Map();
  for (const name of list) {
    const g = raw.get(name);
    const { f, scale: s } = g;
    const ex0 = extract(g.img, g.lab, f, false);
    // yön: Warrior ana sayfası REF_MIRROR; diğerleri siluet (config.mirror / noMirror önce gelir)
    const det = await detectFacing(name, ex0, refDef);
    let mirror = IS_REF ? !g.sheet.extra && REF_MIRROR.has(name) : !!det?.mirror;
    if (CONFIG.mirror?.includes(name)) mirror = true;
    if (CONFIG.noMirror?.includes(name)) mirror = false;
    if (det && (DEBUG || det.mirror !== mirror)) console.log(`${name.padEnd(9)} facing: straight ${det.straight.toFixed(2)} flipped ${det.flipped.toFixed(2)} -> ${mirror ? 'MIRROR' : 'as is'}${det.mirror !== mirror ? ' (override)' : ''}`);
    const ex1 = mirror ? extract(g.img, g.lab, f, true) : ex0;
    let ex = ex1;
    if (s !== 1) {
      const w = Math.max(1, Math.round(ex1.w * s));
      const h = Math.max(1, Math.round(ex1.h * s));
      const buf = await sharp(ex1.buf, { raw: { width: ex1.w, height: ex1.h, channels: 4 } }).resize(w, h, { kernel: sharp.kernel.lanczos3 }).raw().toBuffer();
      ex = { buf, w, h };
    }
    const footOff = (mirror ? f.x1 - g.footX : g.footX - f.x0) * s; // ayak ortasının kutunun solundan uzaklığı (tuval yönünde)
    frames.set(name, { ...g, ex, mirror, left: Math.round(footOff), right: Math.round(ex.w - footOff), up: ex.h });
  }
  const all = [...frames.values()];
  const half = Math.max(...all.map((m) => Math.max(m.left, m.right))) + PAD;
  const W = half * 2;
  const H = Math.max(...all.map((m) => m.up)) + PAD * 2;
  const footY = H - PAD;
  mkdirSync(join(OUT, 'small'), { recursive: true });
  const def = (cls[ID] ??= {});
  def.dir = DIR;
  if (!IS_REF) for (const k of INHERIT) if (def[k] === undefined && refDef[k] !== undefined) def[k] = structuredClone(refDef[k]);
  if (def.grips) {
    if (!hasBow) {
      delete def.grips.bow;
      def.gripFallback = { ...def.gripFallback, bow: 'one' };
    } else if (!def.grips.bow && refDef?.grips?.bow) {
      def.grips.bow = structuredClone(refDef.grips.bow);
      if (def.gripFallback) delete def.gripFallback.bow;
    }
  }
  // yay kareleri yoksa: Warrior'dan gelen aile x poz ayarlarından olmayan pozlar (bow_sky...) atılır
  for (const m of Object.values(def.itemPoses ?? {}))
    for (const key of Object.keys(m)) {
      const pose = key.replace(/^(main|off):/, '');
      if (pose !== '*' && !list.includes(pose)) delete m[key];
    }
  def.canvas = { w: W, h: H, footX: half, footY };
  const idle = frames.get('idle1');
  def.figure = { w: idle.ex.w, h: idle.up };
  const old = def.poses ?? {};
  def.poses = Object.fromEntries(list.map((n) => [n, old[n] ?? {}]));
  for (const name of list) {
    const m = frames.get(name);
    const { buf, w, h } = m.ex;
    const left = half - m.left;
    const top = footY - h;
    const canvas = await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
      .extend({ left, right: W - left - w, top, bottom: H - top - h, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    await sharp(canvas).png({ compressionLevel: 9 }).toFile(join(OUT, `${name}.png`));
    await sharp(canvas).resize(Math.round(W / 2), Math.round(H / 2), { kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).toFile(join(OUT, 'small', `${name}.png`));
    const s = m.scale;
    // sayfa -> tuval (aynalı karede x çevrilir, ölçekli) ve tersi
    const toCanvas = ([x, y]) => ({ x: Math.round((m.mirror ? m.f.x1 - x : x - m.f.x0) * s + left), y: Math.round((y - m.f.y0) * s + top) });
    const toSheet = (cx, cy) => [Math.round(m.mirror ? m.f.x1 - (cx - left) / s : m.f.x0 + (cx - left) / s), Math.round(m.f.y0 + (cy - top) / s)];
    const p = (def.poses[name] ??= {});
    const src = relative(SRCROOT, m.sheet.file).replaceAll('\\', '/');
    // eski veride src yok: ana sayfa sayılır
    const oldSrc = p.src ?? relative(SRCROOT, join(SRC, ONE.flat().includes(name) ? 'one-handed.png' : TWO.flat().includes(name) ? 'two-handed.png' : 'bow.png')).replaceAll('\\', '/');
    const box = { x: left, y: top, w, h };
    // dar sayfadan gelen karenin tohumu narrow.png koordinatıdır (config.narrowSeeds); seeds.<kare> ana sayfa koordinatı (kullanılmaz)
    const cfgSeed = m.sheet.narrow ? CONFIG.narrowSeeds?.[name] : CONFIG.seeds?.[name];
    if (!REDETECT && !cfgSeed && p.anchor && p.box && oldSrc === src) {
      // aynı kaynak: el noktaları korunur; tuval / ölçek değiştiyse kutuyla birlikte taşınır
      const mv = (q) => q && { ...q, x: Math.round(box.x + ((q.x - p.box.x) * box.w) / p.box.w), y: Math.round(box.y + ((q.y - p.box.y) * box.h) / p.box.h) };
      p.anchor = mv(p.anchor);
      if (p.offhand) p.offhand = mv(p.offhand);
    } else {
      const seed = cfgSeed ?? m.sheet.seeds?.[name];
      const rp = refDef?.poses?.[name];
      if (seed?.main) {
        // Warrior tohumu ya da config tohumu (sayfa koordinatı); açı tohumdan, yoksa Warrior v2'den
        const mirrorAngle = (a) => (m.mirror ? -a : a);
        const ang = seed.angle !== undefined ? mirrorAngle(seed.angle) : (rp?.anchor.angle ?? 0);
        const offAng = seed.offAngle !== undefined ? mirrorAngle(seed.offAngle) : seed.angle !== undefined ? ang : (rp?.offhand?.angle ?? ang);
        const hand = (q) => (IS_REF || CONFIG.steelHands ? fist(m.img, q) : q);
        p.anchor = { ...toCanvas(hand(seed.main)), angle: ang };
        p.offhand = { ...toCanvas(hand(seed.off ?? seed.main)), angle: offAng };
        if (m.sheet.seeds) for (const k of ['back', 'flip', 'hidden', 'fist']) {
          if (seed[k] !== undefined) p[k] = seed[k];
          else delete p[k];
        }
        else for (const k of ['back', 'flip', 'hidden', 'fist', 'open']) {
          // config tohumundaki bayrak önce (ör. ek pozda "hidden": true = eşya kareye boyalı), yoksa Warrior v2'nin aynı karesi
          if (cfgSeed?.[k] !== undefined) p[k] = cfgSeed[k];
          else if (rp?.[k] !== undefined) p[k] = rp[k];
          else delete p[k];
        }
      } else if (rp?.anchor && rp.box) {
        // Warrior v2'deki oran (kutuya göre) -> bu karenin sayfasında tohum -> yumruk araması; açı ve bayraklar Warrior v2'den
        const at = (q) => toSheet(box.x + ((q.x - rp.box.x) * box.w) / rp.box.w, box.y + ((q.y - rp.box.y) * box.h) / rp.box.h);
        const hand = (q) => (CONFIG.steelHands ? fist(m.img, at(q), 22) : at(q));
        p.anchor = { ...toCanvas(hand(rp.anchor)), angle: rp.anchor.angle };
        const ro = rp.offhand ?? rp.anchor;
        p.offhand = { ...toCanvas(hand(ro)), angle: ro.angle ?? rp.anchor.angle };
        for (const k of ['back', 'flip', 'hidden', 'fist', 'open']) {
          if (rp[k] !== undefined) p[k] = rp[k];
          else delete p[k];
        }
      } else throw new Error(`${name}: el tohumu yok${extraPoses.includes(name) ? ` (ek poz: config.json > seeds.${name} zorunlu)` : ''}`);
    }
    p.box = box;
    p.src = src;
    if (DEBUG) console.log(`${name.padEnd(10)} ${src} sheet ${m.f.x0},${m.f.y0} -> ${w}x${h} anchor ${JSON.stringify(p.anchor)} off ${JSON.stringify(p.offhand)}`);
  }
  // Pose Tester takma adı: bu sınıfın test sınıfı kendi gövdesini kullanır
  if (!IS_REF) {
    const pt = testerOf(CLS);
    if (pt) {
      data.classAliases ??= {};
      data.classAliases[pt] = ID;
      console.log(`classAliases.${pt} -> ${ID}`);
    }
  }
  console.log(`${list.length} poses${hasBow ? '' : ' (no bow.png: bow grip -> one-handed set)'} -> ${OUT}/<pose>.png (${W}x${H}, feet at y=${footY}, figure ${def.figure.w}x${def.figure.h}) + small/`);
}

/**
 * Oyundaki src/game/poses.ts > drawPoseComposite kuralı (itemPlacement + itemPoses aile ayarı dahil): arkadaki eşyalar, gövde, öndeki
 * eşyalar, yumruk yaması, en üstte önde duran kalkan. Silah boyu x weaponScale.
 */
async function composite(all, def, name, family, look, marks, offPick = null) {
  const M = 140;
  const p0 = def.poses[name];
  const sh = (h) => h && { ...h, x: h.x + M, y: h.y + M };
  const p = { ...p0, anchor: sh(p0.anchor), offhand: sh(p0.offhand) };
  const W = def.canvas.w + 2 * M;
  const H = def.canvas.h + M;
  const footY = def.canvas.footY + M;
  const body = await sharp(join(OUT, `${name}.png`)).extend({ left: M, right: M, top: M, bottom: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const override = (fam, slot) => {
    const f = def.itemPoses?.[fam];
    return { ...f?.['*'], ...f?.[name], ...f?.[`${slot}:${name}`] };
  };
  // bir eldeki eşyanın yerleşimi + katmanı (poses.ts > itemPlacement)
  const item = async (slot, fam0, look0) => {
    const fam = all.weapons[fam0];
    const lk = fam?.looks[look0];
    if (!lk || p.hidden) return null;
    const o = override(fam0, slot);
    if (o.hidden) return null;
    const handName = o.hand ?? slot;
    const hand = handName === 'main' ? p.anchor : p.offhand ? { ...p.offhand, angle: p.offhand.angle ?? p.anchor.angle } : null;
    if (!hand) return null;
    const k = (((lk.length ?? fam.length) * (def.weaponScale ?? 1)) / lk.h) * (o.scale ?? 1);
    const ww = Math.max(1, Math.round(lk.w * k));
    const wh = Math.max(1, Math.round(lk.h * k));
    let wimg = sharp(join(WOUT, fam0, `${look0}.png`)).resize(ww, wh);
    let gx = lk.grip.x * k;
    const gy = lk.grip.y * k;
    const ang = o.angle ?? (fam.upright ? 0 : hand.angle);
    // poses.ts > edgeFlip: ağzı olan görünüm (fam.edge) ağzı öne bakacak şekilde aynalanır (sarkarken öteki yan)
    const na = ((((ang + 180) % 360) + 360) % 360) - 180;
    const edge = fam.edge?.[look0];
    const eflip = !!edge && !!def.grips && (edge === 'left') !== (na > 140 || na < -150);
    if (o.flip ?? (slot === 'main' && !!p.flip) !== eflip) {
      wimg = wimg.flop();
      gx = ww - gx;
    }
    const rot = await sharp(await wimg.png().toBuffer()).rotate(ang, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer({ resolveWithObject: true });
    const a = (ang * Math.PI) / 180;
    const dx = gx - ww / 2;
    const dy = gy - wh / 2;
    const rx = dx * Math.cos(a) - dy * Math.sin(a) + rot.info.width / 2;
    const ry = dx * Math.sin(a) + dy * Math.cos(a) + rot.info.height / 2;
    const off = Math.max(W, H);
    const x = hand.x + (o.dx ?? 0);
    const y = hand.y + (o.dy ?? 0);
    const buf = await sharp({ create: { width: off * 3, height: off * 3, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: rot.data, left: Math.round(x - rx) + off, top: Math.round(y - ry) + off }])
      .png()
      .toBuffer()
      .then((b) => sharp(b).extract({ left: off, top: off, width: W, height: H }).png().toBuffer());
    return { slot, hand: handName, hx: hand.x, hy: hand.y, back: o.back ?? (slot === 'main' ? !!p.back : false), top: slot === 'off' && !!fam.upright, buf };
  };
  const items = [await item('main', family, look), offPick ? await item('off', offPick[0], offPick[1]) : null].filter(Boolean);
  const r = p.fist ?? all.fistRadius;
  const front = items.filter((i) => !i.back);
  const pts = front.map((i) => ({ x: i.hx, y: i.hy }));
  const main = front.find((i) => i.slot === 'main');
  if (main && main.hand === 'main' && !items.some((i) => i.slot === 'off') && p.offhand) pts.push(p.offhand);
  const circles = pts.map((h) => `<circle cx="${h.x}" cy="${h.y}" r="${r}" fill="#fff"/>`).join('');
  const fistPatch = pts.length && r > 0 ? await sharp(body).composite([{ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${circles}</svg>`), blend: 'dest-in' }]).png().toBuffer() : null;
  const layers = [
    ...items.filter((i) => i.back).map((i) => ({ input: i.buf })),
    { input: body },
    ...items.filter((i) => !i.back && !i.top).map((i) => ({ input: i.buf })),
    ...(fistPatch ? [{ input: fistPatch }] : []),
    ...items.filter((i) => !i.back && i.top).map((i) => ({ input: i.buf })),
  ];
  // poses.ts: kalkan varsa sağ eldeki silah + yumruğu kalkanın da üstünde
  const mainTop = items.some((i) => !i.back && i.top) ? items.find((i) => i.slot === 'main' && !i.back && i.hand === 'main') : null;
  if (mainTop) {
    layers.push({ input: mainTop.buf });
    if (r > 0) layers.push({ input: await sharp(body).composite([{ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><circle cx="${mainTop.hx}" cy="${mainTop.hy}" r="${r}" fill="#fff"/></svg>`), blend: 'dest-in' }]).png().toBuffer() });
  }
  if (marks) {
    const hands = [p.anchor, p.offhand].filter(Boolean);
    const mk = hands.map((h, i) => `<path d="M${h.x - 8} ${h.y}H${h.x + 8}M${h.x} ${h.y - 8}V${h.y + 8}" stroke="${i ? '#4dc3ff' : '#4dff88'}" stroke-width="2"/>`).join('');
    layers.push({ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${mk}<line x1="0" y1="${footY}" x2="${W}" y2="${footY}" stroke="#ffffff40"/><text x="8" y="28" font-size="24" fill="#fff" font-family="sans-serif">${name}</text></svg>`) });
  }
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toBuffer();
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// Silah sayfaları v2 (Ömer 2026-10-12): assets/source/poses/weapons-v2/*.png, 1536x1024, 3 x 2, koyu zemin, eşya dikey (baş/uç YUKARI,
// kabza aşağıda). Çıktı assets/weapons/<aile>/<görünüm>.png (+ small/), ölçüm data/poses.json > weapons.<aile> (kabza noktası, boy).
// swords / axes v1 aracında kalır (tools/make-poses.mjs). Görünüm sırası = nadirlik dizini (rarityLook); tılsımlar item'e göre (itemLook).
const WSRC = 'assets/source/poses/weapons-v2';
const WEAPON_SHEETS = [
  { file: 'maces-daggers.png', cells: [[['maces', 'flanged'], ['maces', 'morningstar'], ['maces', 'ornate']], [['daggers', 'plain'], ['daggers', 'rondel'], ['daggers', 'curved']]] },
  { file: 'staves-bows.png', cells: [[['staves', 'ash'], ['staves', 'oak'], ['staves', 'rune']], [['bows', 'short'], ['bows', 'hunting'], ['bows', 'longbow']]] },
  { file: 'shields-charms.png', cells: [[['shields', 'round'], ['shields', 'heater'], ['shields', 'tower']], [['charms', 'cards'], ['charms', 'dice'], ['charms', 'doll']]] },
  { file: 'twohanded-coin.png', cells: [[['greataxes', 'dane'], ['greataxes', 'bearded'], ['greataxes', 'double']], [['mauls', 'maul'], ['mauls', 'hammer'], ['charms', 'coin']]] },
  { file: 'twohanded-2.png', cells: [[['greataxes', 'greataxe'], ['greatswords', 'greatsword'], ['mauls', 'warmaul']]] },
];
/**
 * Aile ölçüleri: length = boy (v1 Warrior gövde tuvali pikseli; sınıfın weaponScale'i ile çarpılır), lengths = görünüme özel boy,
 * grip = kabza kuralı: 'sword' (balçak altı dar şerit), frac (üstten oran, o satırdaki en geniş dolu parçanın ortası; last = son parça:
 * aynalı yayın gövdesi, kiriş değil), 'center' (kutu ortası: kalkan, tılsım). upright = el açısından bağımsız dik çizilir (kalkan, yay).
 * mirror = kesimde yatay aynala (yay: kiriş sayfada sağda; karakter sağa baktığı için kiriş gövdeye, yay sırtı öne). hold = ailenin tutuşu.
 */
const WEAPON_SPEC = {
  maces: { length: 205, grip: { frac: 0.8 } },
  daggers: { length: 125, grip: { frac: 0.73 } },
  staves: { length: 400, grip: { frac: 0.6 }, hold: 'two' },
  bows: { length: 330, grip: { frac: 0.5, last: true }, hold: 'bow', upright: true, mirror: true },
  shields: { length: 165, lengths: { round: 145, tower: 160 }, grip: 'center', upright: true, hold: 'offhand' },
  charms: { length: 70, lengths: { doll: 115, coin: 60 }, grip: 'center', hold: 'charm' },
  greataxes: { length: 330, grip: { frac: 0.76 }, hold: 'two' },
  mauls: { length: 320, grip: { frac: 0.78 }, hold: 'two' },
  greatswords: { length: 340, grip: 'sword', hold: 'two' },
};

/** Satır başına dolu aralıklar (alfa > 128): [{ a, b }] parçalar. */
function rowRuns(buf, w, y) {
  const runs = [];
  let a = -1;
  for (let x = 0; x <= w; x++) {
    const on = x < w && buf[(y * w + x) * 4 + 3] > 128;
    if (on && a < 0) a = x;
    if (!on && a >= 0) {
      runs.push({ a, b: x - 1 });
      a = -1;
    }
  }
  return runs;
}

function measureGripV2(spec, buf, w, h) {
  if (spec.grip === 'center') return { x: Math.round(w / 2), y: Math.round(h * 0.55) };
  if (spec.grip === 'sword') {
    const widths = Array.from({ length: h }, (_, y) => {
      const r = rowRuns(buf, w, y);
      return r.length ? r[r.length - 1].b - r[0].a + 1 : 0;
    });
    let guard = Math.floor(h * 0.45);
    for (let y = guard; y < h; y++) if (widths[y] > widths[guard]) guard = y;
    const end = Math.floor(h * 0.93);
    // balçağın altındaki dar şerit: en dar tek satır (topuz ucu) değil, alt kısımdaki ortanca genişlik (yuvarlak topuz ucu yanıltmasın)
    const strip = widths.slice(guard + Math.round(h * 0.03), Math.floor(h * 0.85)).filter((v) => v > 0).sort((a, b) => a - b);
    const narrow = strip[Math.floor(strip.length * 0.3)] ?? Math.min(...widths.slice(guard, end).filter((v) => v > 0));
    let g0 = guard;
    while (g0 < end && widths[g0] > narrow * 1.5) g0++;
    let g1 = g0;
    while (g1 + 1 < end && widths[g1 + 1] <= narrow * 1.5) g1++;
    const y = Math.round((g0 + g1) / 2);
    const r = rowRuns(buf, w, y);
    return { x: Math.round((r[0].a + r[r.length - 1].b) / 2), y };
  }
  const y = Math.round(h * spec.grip.frac);
  const r = rowRuns(buf, w, y);
  if (!r.length) return { x: Math.round(w / 2), y };
  // son parça (aynalı yayın gövdesi; kiriş solda) ya da en geniş parça (sap; yanındaki kırıntı değil)
  const run = spec.grip.last ? r[r.length - 1] : r.reduce((m, q) => (q.b - q.a > m.b - m.a ? q : m));
  return { x: Math.round((run.a + run.b) / 2), y };
}

async function weaponsV2(data) {
  const w = (data.weapons ??= {});
  const seen = {};
  for (const sheet of WEAPON_SHEETS) {
    const img = await load(join(WSRC, sheet.file));
    removeBackground(img, true);
    const { lab, comps } = components(img);
    const names = sheet.cells.map((row) => row.map(([f, l]) => `${f}/${l}`));
    // hücreye düşen tüm parçalar (büyükten küçüğe; küçük kırıntı yalnızca eşyanın kutusuna yakınsa)
    const cw = img.W / 3;
    const ch = img.H / 2;
    const cells = new Map();
    for (const c of [...comps].sort((a, b) => b.n - a.n)) {
      const name = names[Math.floor(c.sy / c.n / ch)]?.[Math.floor(c.sx / c.n / cw)];
      if (!name) continue;
      const g = cells.get(name);
      if (c.n < 1500 && (!g || c.x1 < g.x0 - 12 || c.x0 > g.x1 + 12 || c.y1 < g.y0 - 12 || c.y0 > g.y1 + 12)) continue;
      const f = g ?? { ids: new Set(), x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
      f.ids.add(c.id);
      f.x0 = Math.min(f.x0, c.x0);
      f.x1 = Math.max(f.x1, c.x1);
      f.y0 = Math.min(f.y0, c.y0);
      f.y1 = Math.max(f.y1, c.y1);
      cells.set(name, f);
    }
    for (const name of names.flat()) {
      const f = cells.get(name);
      if (!f) throw new Error(`${sheet.file}: ${name} bulunamadı`);
      const [family, look] = name.split('/');
      const spec = WEAPON_SPEC[family];
      const ex = extract(img, lab, f, !!spec.mirror);
      const dir = join(WOUT, family);
      mkdirSync(join(dir, 'small'), { recursive: true });
      const png = await sharp(ex.buf, { raw: { width: ex.w, height: ex.h, channels: 4 } }).png().toBuffer();
      await sharp(png).png({ compressionLevel: 9 }).toFile(join(dir, `${look}.png`));
      await sharp(png).resize(Math.round(ex.w / 2), Math.round(ex.h / 2), { kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).toFile(join(dir, 'small', `${look}.png`));
      const grip = measureGripV2(spec, ex.buf, ex.w, ex.h);
      (seen[family] ??= []).push(look);
      const fam = (w[family] ??= {});
      fam.length = spec.length;
      if (spec.upright) fam.upright = true;
      else delete fam.upright;
      if (spec.hold) fam.hold = spec.hold;
      fam.looks ??= {};
      fam.looks[look] = { w: ex.w, h: ex.h, grip, ...(spec.lengths?.[look] ? { length: spec.lengths[look] } : {}) };
      if (DEBUG) console.log(`${name.padEnd(20)} ${ex.w}x${ex.h} grip ${grip.x},${grip.y}`);
    }
  }
  for (const [family, looks] of Object.entries(seen)) {
    const f = w[family];
    f.order = looks;
    f.looks = Object.fromEntries(looks.map((l) => [l, f.looks[l]]));
  }
  console.log(`${Object.values(seen).flat().length} weapon looks -> ${WOUT}/<family>/<look>.png + small/`);
}

const PREVIEW = argOf('preview');
if (PREVIEW) {
  const all = readData();
  const def = all.classes[ID];
  if (!def) throw new Error(`classes.${ID} yok: önce node tools/make-poses-v2.mjs --class=${CLS}`);
  mkdirSync(PREVIEW, { recursive: true });
  const S = Number(argOf('scale') ?? 0.5);
  const marks = process.argv.includes('--marks');
  const sets = { one: ONE.flat(), two: TWO.flat(), bow: BOW.flat(), extra: Object.keys(def.poses).filter((n) => !FRAMES.includes(n)) };
  const defaults = { one: 'swords:plain', two: 'greataxes:dane', bow: 'bows:hunting', extra: 'swords:plain' };
  const only = argOf('set');
  const offArg = argOf('off')?.split(':') ?? null;
  const pick = argOf('frames')?.split(',');
  for (const [set, list0] of Object.entries(sets).filter(([s]) => !only || s === only)) {
    const list = (pick ? list0.filter((n) => pick.includes(n)) : list0).filter((n) => def.poses[n]);
    if (!list.length) continue;
    const picks = (argOf('weapons') ?? defaults[set]).split(',').map((s) => s.split(':'));
    for (const [family, look] of picks) {
      const cols = 4;
      const cw = Math.round((def.canvas.w + 280) * S);
      const chh = Math.round((def.canvas.h + 140) * S);
      const tiles = [];
      for (let i = 0; i < list.length; i++) {
        const img = await composite(all, def, list[i], family, look, marks, set === 'one' || set === 'extra' ? offArg : null);
        tiles.push({ input: await sharp(img).resize(cw, chh).png().toBuffer(), left: (i % cols) * cw, top: Math.floor(i / cols) * chh });
      }
      await sharp({ create: { width: cw * Math.min(cols, list.length), height: chh * Math.ceil(list.length / cols), channels: 4, background: { r: 44, g: 38, b: 34, alpha: 1 } } })
        .composite(tiles)
        .png()
        .toFile(join(PREVIEW, `${CLS}-${set}-${family}-${look}${offArg && (set === 'one' || set === 'extra') ? `+${offArg.join('-')}` : ''}.png`));
    }
  }
  console.log(`preview -> ${PREVIEW}/${CLS}-<one|two|bow|extra>-<family>-<look>.png`);
} else {
  const data = readData();
  if (!process.argv.includes('--weapons-only')) await bodies(data);
  if (!process.argv.includes('--bodies-only') && (IS_REF || process.argv.includes('--weapons-only'))) await weaponsV2(data);
  writeFileSync(DATA, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`measurements -> ${DATA}`);
}

// Oyun bu PNG'lerin .webp kopyasını yükler: değişenlerin WebP'si hemen üretilir (tools/webp-assets.mjs, tests/webp-assets.test.ts)
await import('./webp-assets.mjs');
