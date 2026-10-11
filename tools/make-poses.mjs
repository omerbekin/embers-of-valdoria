// Karakter poz kütüphanesi (Ömer 2026-10-11, future-ideas "Karakter animasyonları: ortak poz kütüphanesi + dinamik silah"): Warrior denemesi.
//
// Girdi (ChatGPT, gerçek saydamlık):
//   assets/source/poses/<sınıf>/body-sheet.png     4 sütun x 3 satır, 12 poz, satır satır; eller BOŞ (kabza tutar gibi yumruk)
//   assets/source/poses/<sınıf>/weapons-sheet.png  3 x 2, silahlar dikey (ağız yukarı); satır 1 kılıçlar, satır 2 baltalar
// Çıktı:
//   assets/poses/<sınıf>/<poz>.png        ortak tuval: ayaklar AYNI taban çizgisinde, ayak ortası tuvalin yatay ortasında, ölçek aynen (yeniden örnekleme yok)
//   assets/poses/<sınıf>/small/<poz>.png  yarı boy (zayıf ekran / küçük çizim; çalışma anı yoğunluğa göre seçer)
//   assets/weapons/<aile>/<görünüm>.png (+ small/)  kırpılmış silah; kabza (tutma) noktası ÖLÇÜLÜR
//   data/poses.json                        ölçülen alanlar güncellenir (tuval, figür kutusu, silah kabzası); el noktaları (anchor) KORUNUR,
//                                           yalnızca eksikse yumruk aramasıyla önceden doldurulur (--redetect = hepsini yeniden ara)
//
// Hücreler KUSURSUZ varsayılmaz: figürler bağlı bileşen olarak bulunur (alfa > 40), her bileşen merkezinin düştüğü hücreye atanır (dönme
// pozlarında kollar komşu hücreye taşıyor; hücre kesimi kolu keserdi). Taban: bileşenin en alt satırı; ayak ortası: alttaki %8'lik bandın
// kutusunun ortası. Arka plandaki çok soluk hale (alfa < 32) silinir, neredeyse dolu alfa (>= 245) tam doluya çekilir.
//
// Yeniden üretmek için: node tools/make-poses.mjs [--redetect] [--debug]
// Önizleme (kesmeden, yalnızca data/poses.json + çıktı dosyalarından): node tools/make-poses.mjs --preview=<klasör>  -> <klasör>/poses-<aile>.png
//   (12 poz x o ailenin 3 görünümü, oyundaki birleştirme kuralıyla; el noktaları yeşil artı ile işaretli: --marks)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const CLASS = 'warrior';
const BODY = `assets/source/poses/${CLASS}/body-sheet.png`;
const WEAPONS = `assets/source/poses/${CLASS}/weapons-sheet.png`;
const OUT = `assets/poses/${CLASS}`;
const WOUT = 'assets/weapons';
const DATA = 'data/poses.json';
const ALPHA = 40;
const DEBUG = process.argv.includes('--debug');
const REDETECT = process.argv.includes('--redetect');
/** Tuval kenar payı (piksel). */
const PAD = 6;

/** Satır satır 12 poz (ad = data/poses.json anahtarı). */
const POSES = [
  ['idle', 'step', 'slash', 'overhead'],
  ['spin1', 'spin2', 'spin3', 'raise'],
  ['channel', 'throw', 'hit', 'kneel'],
];
/** Silah sayfası: satır = aile, sütun = görünüm (sıra: sade -> süslü; nadirlik eşlemesi data/poses.json > rarityLook). */
const WEAPON_GRID = [
  ['swords', ['plain', 'engraved', 'ornate']],
  ['axes', ['plain', 'bearded', 'ornate']],
];

/**
 * Yumruk araması için tohumlar (sayfa koordinatı; gözle). Arama tohumun çevresinde (yarıçap 26) çelik eldiven pikselleri (doygunluğu düşük,
 * açık) arar ve ağırlık merkezini alır. `angle`: silahın ilk açısı (derece, saat yönü; 0 = ağız yukarı). `off`: ikinci el (varsa).
 */
const SEEDS = {
  idle: { main: [148, 288], off: [102, 284], angle: 35 },
  step: { main: [402, 268], off: [380, 262], angle: 70 },
  slash: { main: [545, 182], off: [560, 178], angle: -95 },
  overhead: { main: [886, 50], off: [886, 50], angle: -20 },
  spin1: { main: [248, 683], angle: 85 },
  spin2: { main: [558, 690], angle: 80 },
  spin3: { main: [786, 744], angle: 95 },
  raise: { main: [858, 800], angle: 150 },
  channel: { main: [270, 1154], off: [240, 1146], angle: 80 },
  throw: { main: [596, 1124], angle: 80 },
  hit: { main: [672, 1196], off: [640, 1186], angle: 20 },
  kneel: { main: [938, 1378], off: [912, 1372], angle: 180 },
};

async function load(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

/** Bağlı bileşenler (4 komşu, alfa > ALPHA); 200 pikselden küçükler atlanır. */
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
  return { lab, comps: out.filter((c) => c.n >= 200) };
}

/** Bileşenin pikselleri temiz bir RGBA tamponuna (kutu boyunda): başka bileşenin pikselleri ve soluk hale atılır. */
function extract(img, lab, c) {
  const w = c.x1 - c.x0 + 1;
  const h = c.y1 - c.y0 + 1;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = c.x0 + x;
      const sy = c.y0 + y;
      const si = (sy * img.W + sx) * 4;
      const l = lab[sy * img.W + sx];
      let a = img.data[si + 3];
      // başka figürün pikseli değil; kendi bileşeni ya da (eşik altı kenar yumuşatması) bileşensiz kenar pikseli
      if (l >= 0 && l !== c.id) a = 0;
      if (a < 32) a = 0;
      else if (a >= 245) a = 255;
      const di = (y * w + x) * 4;
      buf[di] = img.data[si];
      buf[di + 1] = img.data[si + 1];
      buf[di + 2] = img.data[si + 2];
      buf[di + 3] = a;
    }
  return { buf, w, h };
}

/** Çelik eldiven pikseli: dolu, doygunluğu düşük, orta-açık ton. */
function steel(img, x, y) {
  const i = (y * img.W + x) * 4;
  if (img.data[i + 3] < 200) return false;
  const r = img.data[i];
  const g = img.data[i + 1];
  const b = img.data[i + 2];
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx > 95 && mx - mn < 40;
}

/** Tohum çevresinde yumruk: yarıçap içinde çelik piksellerin ağırlık merkezi (yoksa tohum). */
function fist(img, [x0, y0], r = 26) {
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

async function bodies(data) {
  const img = await load(BODY);
  const { lab, comps } = components(img);
  if (comps.length !== 12) throw new Error(`body sheet: ${comps.length} figür bulundu (12 bekleniyordu)`);
  const cw = img.W / 4;
  const ch = img.H / 3;
  const cells = new Map();
  for (const c of comps) {
    const col = Math.floor(c.sx / c.n / cw);
    const row = Math.floor(c.sy / c.n / ch);
    const name = POSES[row]?.[col];
    if (!name || cells.has(name)) throw new Error(`figür hücreye oturmadı: ${col},${row}`);
    cells.set(name, c);
  }
  // ayak ortası ve yukarı/yana uzanım
  const meas = new Map();
  for (const [name, c] of cells) {
    const band = Math.max(8, Math.round((c.y1 - c.y0 + 1) * 0.08));
    let fx0 = Infinity;
    let fx1 = -Infinity;
    for (let y = c.y1 - band + 1; y <= c.y1; y++)
      for (let x = c.x0; x <= c.x1; x++) if (lab[y * img.W + x] === c.id) (fx0 = Math.min(fx0, x)), (fx1 = Math.max(fx1, x));
    const footX = Math.round((fx0 + fx1) / 2);
    meas.set(name, { c, footX, left: footX - c.x0, right: c.x1 - footX, up: c.y1 - c.y0 + 1 });
  }
  const half = Math.max(...[...meas.values()].map((m) => Math.max(m.left, m.right))) + PAD;
  const W = half * 2;
  const H = Math.max(...[...meas.values()].map((m) => m.up)) + PAD * 2;
  const footY = H - PAD; // taban çizgisi (ayakların en alt pikseli bu satırın hemen üstünde)
  mkdirSync(join(OUT, 'small'), { recursive: true });
  const cls = (data.classes ??= {});
  const def = (cls[CLASS] ??= {});
  def.dir = CLASS;
  def.canvas = { w: W, h: H, footX: half, footY };
  const idle = meas.get('idle');
  def.figure = { w: idle.c.x1 - idle.c.x0 + 1, h: idle.up };
  const old = def.poses ?? {};
  def.poses = Object.fromEntries(POSES.flat().map((n) => [n, old[n] ?? {}])); // sabit sıra
  for (const name of POSES.flat()) {
    const m = meas.get(name);
    const { buf, w, h } = extract(img, lab, m.c);
    const left = half - m.left;
    const top = footY - h;
    const canvas = await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
      .extend({ left, right: W - left - w, top, bottom: H - top - h, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    await sharp(canvas).png({ compressionLevel: 9 }).toFile(join(OUT, `${name}.png`));
    await sharp(canvas).resize(Math.round(W / 2), Math.round(H / 2), { kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).toFile(join(OUT, 'small', `${name}.png`));
    // sayfa koordinatı -> tuval koordinatı
    const toCanvas = ([x, y]) => ({ x: Math.round(x - m.c.x0 + left), y: Math.round(y - m.c.y0 + top) });
    const p = (def.poses[name] ??= {});
    p.box = { x: left, y: top, w, h };
    if (REDETECT || !p.anchor) {
      const s = SEEDS[name];
      p.anchor = { ...toCanvas(fist(img, s.main)), angle: s.angle };
      if (s.off) p.offhand = toCanvas(fist(img, s.off));
      else delete p.offhand;
    }
    if (DEBUG) console.log(`${name.padEnd(9)} box ${m.c.x0},${m.c.y0} ${w}x${h} foot ${m.footX} -> anchor ${JSON.stringify(p.anchor)}`);
  }
  console.log(`12 poses -> ${OUT}/<pose>.png (${W}x${H}, feet at y=${footY}) + small/`);
}

/** Satır başına alfa genişliği profili (kırpılmış silah). */
function rowSpans(buf, w, h) {
  const spans = [];
  for (let y = 0; y < h; y++) {
    let a = -1;
    let b = -1;
    for (let x = 0; x < w; x++)
      if (buf[(y * w + x) * 4 + 3] > 128) {
        if (a < 0) a = x;
        b = x;
      }
    spans.push(a < 0 ? null : { a, b, w: b - a + 1 });
  }
  return spans;
}

/**
 * Kabza noktası. Kılıç: alt yarıdaki en geniş satır = balçak (crossguard); balçağın altı ile topuz arasındaki dar şeridin ortası.
 * Balta: üstteki geniş baş bitince sap başlar; tutma sapın %62'si (baştan uca), çift el için sapın alt-orta kısmı.
 */
function measureGrip(family, buf, w, h) {
  const s = rowSpans(buf, w, h);
  const widths = s.map((r) => (r ? r.w : 0));
  if (family === 'swords') {
    let guard = Math.floor(h * 0.45);
    for (let y = Math.floor(h * 0.45); y < h; y++) if (widths[y] > widths[guard]) guard = y;
    // sap: balçaktan topuza kadar (son %4 topuzun ucu sayılmaz) en dar satırların ilk kesintisiz şeridi
    const end = Math.floor(h * 0.96);
    const narrow = Math.min(...widths.slice(guard, end).filter((v) => v > 0));
    let g0 = guard;
    while (g0 < end && widths[g0] > narrow * 1.5) g0++;
    let g1 = g0;
    while (g1 + 1 < end && widths[g1 + 1] <= narrow * 1.5) g1++;
    const y = Math.round((g0 + g1) / 2);
    const r = s[y];
    return { x: Math.round((r.a + r.b) / 2), y, from: g0, to: g1 };
  }
  // balta: baş = üstten genişliği sapın 1,8 katını aşan son satır
  const lower = widths.slice(Math.floor(h * 0.6)).filter((v) => v > 0);
  const haft = lower.sort((a, b) => a - b)[Math.floor(lower.length / 2)];
  let head = 0;
  for (let y = 0; y < h * 0.7; y++) if (widths[y] > haft * 1.8) head = y;
  const y = Math.round(head + (h - 1 - head) * 0.62);
  const r = s[y];
  return { x: Math.round((r.a + r.b) / 2), y, from: head, to: h - 1 };
}

async function weapons(data) {
  const img = await load(WEAPONS);
  const { lab, comps } = components(img);
  if (comps.length !== 6) throw new Error(`weapons sheet: ${comps.length} silah bulundu (6 bekleniyordu)`);
  const cw = img.W / 3;
  const ch = img.H / 2;
  const w = (data.weapons ??= {});
  for (const c of comps) {
    const col = Math.floor(c.sx / c.n / cw);
    const row = Math.floor(c.sy / c.n / ch);
    const [family, looks] = WEAPON_GRID[row];
    const look = looks[col];
    const ex = extract(img, lab, c);
    const dir = join(WOUT, family);
    mkdirSync(join(dir, 'small'), { recursive: true });
    const png = await sharp(ex.buf, { raw: { width: ex.w, height: ex.h, channels: 4 } }).png().toBuffer();
    await sharp(png).png({ compressionLevel: 9 }).toFile(join(dir, `${look}.png`));
    await sharp(png).resize(Math.round(ex.w / 2), Math.round(ex.h / 2), { kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).toFile(join(dir, 'small', `${look}.png`));
    const grip = measureGrip(family, ex.buf, ex.w, ex.h);
    const fam = (w[family] ??= {});
    fam.looks ??= {};
    fam.looks[look] = { w: ex.w, h: ex.h, grip: { x: grip.x, y: grip.y } };
    if (DEBUG) console.log(`${family}/${look.padEnd(8)} ${ex.w}x${ex.h} grip ${grip.x},${grip.y} (span ${grip.from}-${grip.to})`);
  }
  // görünüm sırası sabit (sade -> süslü)
  for (const [family, looks] of WEAPON_GRID) {
    const f = w[family];
    f.order = looks;
    f.looks = Object.fromEntries(looks.map((l) => [l, f.looks[l]]));
  }
  console.log(`6 weapons -> ${WOUT}/<family>/<look>.png + small/`);
}

/**
 * Oyundaki birleştirmenin (src/game/poses.ts > drawPoseComposite) sharp karşılığı: silah kabzası el noktasına, açıyla döndürülmüş, ailenin
 * boyuna ölçekli; `back` değilse gövdenin önünde ve yumruk yaması (el çevresindeki gövde pikselleri) silahın üstüne yeniden konur.
 */
async function composite(all, def, name, family, look, marks) {
  // önizleme tuvali: gövde tuvalinin çevresinde M payı (silah tuvalden taşar; oyunda kare sınır kutusu silahı da kapsar)
  const M = 130;
  const p0 = def.poses[name];
  const sh = (h) => h && { ...h, x: h.x + M, y: h.y + M };
  const p = { ...p0, anchor: sh(p0.anchor), offhand: sh(p0.offhand) };
  const W = def.canvas.w + 2 * M;
  const H = def.canvas.h + M;
  const footY = def.canvas.footY + M;
  const body = await sharp(join(OUT, `${name}.png`)).extend({ left: M, right: M, top: M, bottom: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const fam = all.weapons[family];
  const lk = fam.looks[look];
  const k = fam.length / lk.h;
  const ww = Math.max(1, Math.round(lk.w * k));
  const wh = Math.max(1, Math.round(lk.h * k));
  let wimg = sharp(join(WOUT, family, `${look}.png`)).resize(ww, wh);
  let gx = lk.grip.x * k;
  const gy = lk.grip.y * k;
  if (p.flip) {
    wimg = wimg.flop();
    gx = ww - gx;
  }
  const rot = await sharp(await wimg.png().toBuffer()).rotate(p.anchor.angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer({ resolveWithObject: true });
  const a = (p.anchor.angle * Math.PI) / 180;
  const dx = gx - ww / 2;
  const dy = gy - wh / 2;
  const rx = dx * Math.cos(a) - dy * Math.sin(a) + rot.info.width / 2;
  const ry = dx * Math.sin(a) + dy * Math.cos(a) + rot.info.height / 2;
  const off = Math.max(W, H);
  const layer = await sharp({ create: { width: off * 3, height: off * 3, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: rot.data, left: Math.round(p.anchor.x - rx) + off, top: Math.round(p.anchor.y - ry) + off }])
    .png()
    .toBuffer()
    .then((b) => sharp(b).extract({ left: off, top: off, width: W, height: H }).png().toBuffer()); // sharp extract'ı composite'ten ÖNCE uygular: iki adım
  const r = p.fist ?? all.fistRadius;
  const hands = [p.anchor, p.offhand].filter(Boolean);
  const circles = hands.map((h) => `<circle cx="${h.x}" cy="${h.y}" r="${r}" fill="#fff"/>`).join('');
  const fistPatch = await sharp(body).composite([{ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${circles}</svg>`), blend: 'dest-in' }]).png().toBuffer();
  const layers = p.hidden ? [{ input: body }] : p.back ? [{ input: layer }, { input: body }] : [{ input: body }, { input: layer }, { input: fistPatch }];
  if (marks) {
    const m = hands.map((h, i) => `<path d="M${h.x - 6} ${h.y}H${h.x + 6}M${h.x} ${h.y - 6}V${h.y + 6}" stroke="${i ? '#4dc3ff' : '#4dff88'}" stroke-width="2"/>`).join('');
    layers.push({ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${m}<line x1="0" y1="${footY}" x2="${W}" y2="${footY}" stroke="#ffffff40"/></svg>`) });
  }
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toBuffer();
}

const PREVIEW = process.argv.find((a) => a.startsWith('--preview='))?.slice('--preview='.length);
if (PREVIEW) {
  const all = readData();
  const def = all.classes[CLASS];
  mkdirSync(PREVIEW, { recursive: true });
  const list = process.argv.find((a) => a.startsWith('--poses='))?.slice(8).split(',') ?? POSES.flat();
  const S = Number(process.argv.find((a) => a.startsWith('--scale='))?.slice(8) ?? 0.5);
  const cols = Math.min(6, list.length);
  const ZOOM = process.argv.includes('--zoom');
  const ZR = 60;
  const cw = ZOOM ? 240 : Math.round((def.canvas.w + 260) * S);
  const chh = ZOOM ? 240 : Math.round((def.canvas.h + 130) * S);
  for (const family of Object.keys(all.weapons)) {
    const looks = all.weapons[family].order;
    const tiles = [];
    for (let i = 0; i < list.length; i++)
      for (let j = 0; j < looks.length; j++) {
        const img = await composite(all, def, list[i], family, looks[j], process.argv.includes('--marks'));
        // --zoom: el çevresi (±ZR) 2 kat (yumruk-kabza oturuşunu denetlemek için)
        const a = def.poses[list[i]].anchor;
        const view = ZOOM ? await sharp(img).extract({ left: Math.max(0, a.x + 130 - ZR), top: Math.max(0, a.y + 130 - ZR), width: ZR * 2, height: ZR * 2 }).resize(cw, chh, { kernel: 'nearest' }).png().toBuffer() : await sharp(img).resize(cw, chh).png().toBuffer();
        tiles.push({ input: view, left: (i % cols) * cw, top: (Math.floor(i / cols) * looks.length + j) * chh });
      }
    const rows = Math.ceil(list.length / cols) * looks.length;
    await sharp({ create: { width: cw * cols, height: chh * rows, channels: 4, background: { r: 44, g: 38, b: 34, alpha: 1 } } }).composite(tiles).png().toFile(join(PREVIEW, `poses-${family}.png`));
  }
  console.log(`preview -> ${PREVIEW}/poses-<family>.png`);
} else {
  const data = readData();
  await bodies(data);
  await weapons(data);
  writeFileSync(DATA, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`measurements -> ${DATA}`);
}
