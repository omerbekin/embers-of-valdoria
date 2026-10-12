// Poz kütüphanesi v2 (Ömer 2026-10-12, future-ideas "Poz listesi kararları" + "Silah ve tutuş kuralları"; docs/design/pose-coverage.md):
// Warrior gövdesiyle 13 ortak poz, silah pozları TEK EL (…1) ve ÇİFT EL (…2) iki takım. Şimdilik YALNIZCA Pose Tester debug sınıfları
// kullanır (data/poses.json > classes.warrior_v2 + classAliases); gerçek Warrior v1'de kalır (tools/make-poses.mjs).
//
// Girdi (ChatGPT, koyu düz zemin, SAYDAMLIK YOK):
//   assets/source/poses/warrior-v2/one-handed.png  4 x 3: idle1 step1 slash1 overhead1 / thrust1 spin1a spin1b spin1c / guard1 raise channel point
//   assets/source/poses/warrior-v2/two-handed.png  4 x 3: idle2 step2 slash2 overhead2 / thrust2 spin2a spin2b spin2c / guard2 throw hit kneel
// Çıktı:
//   assets/poses/warrior-v2/<kare>.png (+ small/)  ortak tuval: ayak ortası tuvalin yatay ortasında, taban aynı satırda, ölçek aynen
//   data/poses.json > classes.warrior_v2            tuval, figür, kutu ve el noktaları (anchor = ana el + açı, offhand = sol el + açı)
//
// Zemin silme: kenarlardan taşma dolgusu (en parlak kanal <= BG), sonra zemine değen koyu kenar piksellerinde alfa rampası (BG..EDGE).
// Figürler bağlı bileşen; her bileşen merkezinin düştüğü hücreye atanır (küçük kopuk parçalar da). thrust1/thrust2 sola bakıyor
// (kaynak hatası): yatay aynalanır (MIRROR).
//
// El noktaları SEEDS'ten (sayfa koordinatı, gözle) + yumruk araması (çelik eldiven piksellerinin ağırlık merkezi). --redetect olmadan
// data/poses.json'daki mevcut el noktaları KORUNUR (pose-editor ile ince ayar yapılabilir).
//
//   node tools/make-poses-v2.mjs [--redetect] [--debug]
//   node tools/make-poses-v2.mjs --preview=<klasör> [--marks] [--scale=0.5]   -> <klasör>/v2-one-<aile>.png, v2-two-<aile>.png
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ID = 'warrior_v2';
const DIR = 'warrior-v2';
const SRC = `assets/source/poses/${DIR}`;
const OUT = `assets/poses/${DIR}`;
const WOUT = 'assets/weapons';
const DATA = 'data/poses.json';
const ALPHA = 40;
const BG = 18;
const EDGE = 60;
const PAD = 6;
const DEBUG = process.argv.includes('--debug');
const REDETECT = process.argv.includes('--redetect');

const SHEETS = [
  {
    file: 'one-handed.png',
    names: [
      ['idle1', 'step1', 'slash1', 'overhead1'],
      ['thrust1', 'spin1a', 'spin1b', 'spin1c'],
      ['guard1', 'raise', 'channel', 'point'],
    ],
  },
  {
    file: 'two-handed.png',
    names: [
      ['idle2', 'step2', 'slash2', 'overhead2'],
      ['thrust2', 'spin2a', 'spin2b', 'spin2c'],
      ['guard2', 'throw', 'hit', 'kneel'],
    ],
  },
];
const MIRROR = new Set(['thrust1', 'thrust2']);

/**
 * El tohumları (sayfa koordinatı, AYNALAMADAN ÖNCE). main = silah eli (ön/sağ el), off = sol el (kalkan / ikinci hançer), angle = silah
 * açısı (derece, saat yönü, 0 = ağız yukarı), offAngle = ikinci el eşyasının açısı. Çift el takımında ikinci el kabzada (bilgi).
 * Ek: back (silah gövdenin arkasında), flip (aynala), hidden (çizilmez), fist (yama yarıçapı).
 */
const SEEDS = {
  idle1: { main: [185, 213], off: [75, 277], angle: 35, offAngle: 10 },
  step1: { main: [490, 230], off: [275, 205], angle: 60, offAngle: -20 },
  slash1: { main: [548, 152], off: [700, 222], angle: -100, offAngle: 20 },
  overhead1: { main: [893, 62], off: [990, 225], angle: 10, offAngle: 20 },
  thrust1: { main: [27, 668], off: [215, 680], angle: -90, offAngle: 10 },
  spin1a: { main: [300, 650], off: [440, 700], angle: -80, offAngle: 10 },
  spin1b: { main: [772, 660], off: [535, 670], angle: 90, offAngle: -10, back: true },
  spin1c: { main: [1002, 655], off: [810, 708], angle: 90, offAngle: 10 },
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
function splitMerged(img, lab, comps) {
  const cw = img.W / 4;
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
function cellsOf(img, lab, comps, names) {
  const cw = img.W / 4;
  const ch = img.H / 3;
  const cells = new Map();
  // büyükten küçüğe: küçük kopuk parça yalnızca figürün kutusuna 12 pikselden yakınsa alınır (zemindeki kırıntılar atılır)
  for (const c of [...comps].sort((a, b) => b.n - a.n)) {
    const col = Math.floor(c.sx / c.n / cw);
    const row = Math.floor(c.sy / c.n / ch);
    const name = names[row]?.[col];
    if (!name) continue;
    const g = cells.get(name);
    if (c.n < 2000 && (!g || c.x1 < g.x0 - 12 || c.x0 > g.x1 + 12 || c.y1 < g.y0 - 12 || c.y0 > g.y1 + 12)) continue;
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

async function bodies(data) {
  const frames = new Map();
  for (const sheet of SHEETS) {
    const img = await load(join(SRC, sheet.file));
    removeBackground(img);
    const { lab, comps: raw } = components(img);
    const comps = splitMerged(img, lab, raw);
    const cells = cellsOf(img, lab, comps, sheet.names);
    for (const [name, f] of cells) {
      // ayak ortası: en büyük bileşenin alt %8'lik bandı
      const c = f.main;
      const band = Math.max(8, Math.round((f.y1 - f.y0 + 1) * 0.08));
      let fx0 = Infinity;
      let fx1 = -Infinity;
      for (let y = f.y1 - band + 1; y <= f.y1; y++) for (let x = f.x0; x <= f.x1; x++) if (lab[y * img.W + x] === c.id) (fx0 = Math.min(fx0, x)), (fx1 = Math.max(fx1, x));
      let footX = Math.round((fx0 + fx1) / 2);
      const mirror = MIRROR.has(name);
      const ex = extract(img, lab, f, mirror);
      if (mirror) footX = f.x0 + f.x1 - footX;
      frames.set(name, { img, f, ex, mirror, footX, left: footX - f.x0, right: f.x1 - footX, up: f.y1 - f.y0 + 1 });
    }
  }
  const all = [...frames.values()];
  const half = Math.max(...all.map((m) => Math.max(m.left, m.right))) + PAD;
  const W = half * 2;
  const H = Math.max(...all.map((m) => m.up)) + PAD * 2;
  const footY = H - PAD;
  mkdirSync(join(OUT, 'small'), { recursive: true });
  const cls = (data.classes ??= {});
  const def = (cls[ID] ??= {});
  def.dir = DIR;
  def.canvas = { w: W, h: H, footX: half, footY };
  const idle = frames.get('idle1');
  def.figure = { w: idle.f.x1 - idle.f.x0 + 1, h: idle.up };
  const old = def.poses ?? {};
  const order = SHEETS.flatMap((s) => s.names.flat());
  def.poses = Object.fromEntries(order.map((n) => [n, old[n] ?? {}]));
  for (const name of order) {
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
    // sayfa -> tuval (aynalı karede x çevrilir)
    const toCanvas = ([x, y]) => ({ x: Math.round((m.mirror ? m.f.x1 - x : x - m.f.x0) + left), y: Math.round(y - m.f.y0 + top) });
    const p = (def.poses[name] ??= {});
    p.box = { x: left, y: top, w, h };
    if (REDETECT || !p.anchor) {
      const s = SEEDS[name];
      const mirrorAngle = (a) => (m.mirror ? -a : a);
      p.anchor = { ...toCanvas(fist(m.img, s.main)), angle: mirrorAngle(s.angle) };
      p.offhand = { ...toCanvas(fist(m.img, s.off)), angle: mirrorAngle(s.offAngle ?? s.angle) };
      for (const k of ['back', 'flip', 'hidden', 'fist']) {
        if (s[k] !== undefined) p[k] = s[k];
        else delete p[k];
      }
    }
    if (DEBUG) console.log(`${name.padEnd(10)} sheet ${m.f.x0},${m.f.y0} ${w}x${h} -> anchor ${JSON.stringify(p.anchor)} off ${JSON.stringify(p.offhand)}`);
  }
  console.log(`${order.length} poses -> ${OUT}/<pose>.png (${W}x${H}, feet at y=${footY}) + small/`);
}

/** tools/make-poses.mjs > composite ile aynı kural (oyun: src/game/poses.ts > drawPoseComposite); silah boyu x weaponScale. */
async function composite(all, def, name, family, look, marks, offPick = null) {
  const M = 140;
  const p0 = def.poses[name];
  const sh = (h) => h && { ...h, x: h.x + M, y: h.y + M };
  const p = { ...p0, anchor: sh(p0.anchor), offhand: sh(p0.offhand) };
  const W = def.canvas.w + 2 * M;
  const H = def.canvas.h + M;
  const footY = def.canvas.footY + M;
  const body = await sharp(join(OUT, `${name}.png`)).extend({ left: M, right: M, top: M, bottom: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  // bir eldeki eşya katmanı (oyundaki drawPoseComposite: kabza el noktasına, açıyla, boy = (görünüm boyu || aile boyu) x weaponScale)
  const item = async (hand, fam0, look0, flip) => {
    const fam = all.weapons[fam0];
    const lk = fam.looks[look0];
    const k = ((lk.length ?? fam.length) * (def.weaponScale ?? 1)) / lk.h;
    const ww = Math.max(1, Math.round(lk.w * k));
    const wh = Math.max(1, Math.round(lk.h * k));
    let wimg = sharp(join(WOUT, fam0, `${look0}.png`)).resize(ww, wh);
    let gx = lk.grip.x * k;
    const gy = lk.grip.y * k;
    if (flip) {
      wimg = wimg.flop();
      gx = ww - gx;
    }
    const ang = fam.upright ? 0 : (hand.angle ?? p.anchor.angle);
    const rot = await sharp(await wimg.png().toBuffer()).rotate(ang, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer({ resolveWithObject: true });
    const a = (ang * Math.PI) / 180;
    const dx = gx - ww / 2;
    const dy = gy - wh / 2;
    const rx = dx * Math.cos(a) - dy * Math.sin(a) + rot.info.width / 2;
    const ry = dx * Math.sin(a) + dy * Math.cos(a) + rot.info.height / 2;
    const off = Math.max(W, H);
    return sharp({ create: { width: off * 3, height: off * 3, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: rot.data, left: Math.round(hand.x - rx) + off, top: Math.round(hand.y - ry) + off }])
      .png()
      .toBuffer()
      .then((b) => sharp(b).extract({ left: off, top: off, width: W, height: H }).png().toBuffer());
  };
  const layer = await item(p.anchor, family, look, p.flip);
  const offLayer = offPick && p.offhand ? await item(p.offhand, offPick[0], offPick[1], false) : null;
  const r = p.fist ?? all.fistRadius;
  const hands = [p.anchor, p.offhand].filter(Boolean);
  const circles = hands.map((h) => `<circle cx="${h.x}" cy="${h.y}" r="${r}" fill="#fff"/>`).join('');
  const fistPatch = await sharp(body).composite([{ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${circles}</svg>`), blend: 'dest-in' }]).png().toBuffer();
  const offL = offLayer ? [{ input: offLayer }] : [];
  const layers = p.hidden ? [{ input: body }, ...offL] : p.back ? [{ input: layer }, { input: body }, ...offL] : offPick && all.weapons[offPick[0]]?.upright ? [{ input: body }, { input: layer }, { input: fistPatch }, ...offL] : [{ input: body }, { input: layer }, ...offL, { input: fistPatch }];
  if (marks) {
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
    const narrow = Math.min(...widths.slice(guard, end).filter((v) => v > 0));
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

const PREVIEW = process.argv.find((a) => a.startsWith('--preview='))?.slice('--preview='.length);
if (PREVIEW) {
  const all = readData();
  const def = all.classes[ID];
  mkdirSync(PREVIEW, { recursive: true });
  const S = Number(process.argv.find((a) => a.startsWith('--scale='))?.slice(8) ?? 0.5);
  const marks = process.argv.includes('--marks');
  const sets = { one: SHEETS[0].names.flat(), two: SHEETS[1].names.flat() };
  const picks = (process.argv.find((a) => a.startsWith('--weapons='))?.slice(10) ?? 'swords:plain,axes:plain').split(',').map((s) => s.split(':'));
  const only = process.argv.find((a) => a.startsWith('--set='))?.slice(6);
  const offArg = process.argv.find((a) => a.startsWith('--off='))?.slice(6).split(':') ?? null;
  for (const [set, list] of Object.entries(sets).filter(([s]) => !only || s === only))
    for (const [family, look] of picks) {
      const cols = 4;
      const cw = Math.round((def.canvas.w + 280) * S);
      const chh = Math.round((def.canvas.h + 140) * S);
      const tiles = [];
      for (let i = 0; i < list.length; i++) {
        const img = await composite(all, def, list[i], family, look, marks, set === 'one' ? offArg : null);
        tiles.push({ input: await sharp(img).resize(cw, chh).png().toBuffer(), left: (i % cols) * cw, top: Math.floor(i / cols) * chh });
      }
      await sharp({ create: { width: cw * cols, height: chh * Math.ceil(list.length / cols), channels: 4, background: { r: 44, g: 38, b: 34, alpha: 1 } } })
        .composite(tiles)
        .png()
        .toFile(join(PREVIEW, `v2-${set}-${family}-${look}${offArg && set === 'one' ? `+${offArg.join('-')}` : ''}.png`));
    }
  console.log(`preview -> ${PREVIEW}/v2-<one|two>-<family>.png`);
} else {
  const data = readData();
  if (!process.argv.includes('--weapons-only')) await bodies(data);
  if (!process.argv.includes('--bodies-only')) await weaponsV2(data);
  writeFileSync(DATA, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`measurements -> ${DATA}`);
}
