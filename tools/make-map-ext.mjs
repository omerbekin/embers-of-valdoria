// Sefer haritası arka planlarının KENAR TAŞMASI (Harita 2 playtest 2026-10-25, Ömer seçeneği (a)): telefonda HUD / sol sütun yüzünden
// harita kenarındaki duraklar (Harita 1 hoard, Harita 2 dr1-3, dr75-77) takım orada değilken tam görünmüyordu; kamera görselin dışına
// çıkamadığı için kaydırma yetmiyordu. Görsel dört kenardan genişletilir, kamera bu taşma alanına da kayabilir (siyah alan yok).
//
// Yeni görsel üretilmez: taşma = görselin kenardan AYNALANMASI; kenardan uzaklaştıkça artan bulanıklık (kademeli karışım, dikiş yok) ve dış
// kenara doğru hafif koyulaşan, biraz soluklaşan vinyet. İç dikdörtgen asıl görselle piksel piksel aynı (düğüm konumları değişmez).
// Çıktı: assets/campaign/<ad>-ext.webp; haritanın JSON'una yazılacak `backgroundExt` (image, region, content) burada yazdırılır.
//   region  = 16:9 sefer alanının (dünya 0-1920 x 0-1080, düğüm pos'ları) taşmalı görseldeki dikdörtgeni (kesir)
//   content = asıl (taşmasız) görselin taşmalı görseldeki dikdörtgeni (kesir; bölge yakınlaştırmasının "kaplama" ölçeği buna göre)
// Ölçü: PAD_X / PAD_Y görsel pikseli (dünya ~ x1,15); telefon HUD'unda kenar durakları için gereken pay tests/region-camera.test.ts ile sınanır.
//
// Yeniden üretmek için: node tools/make-map-ext.mjs
import { statSync } from 'node:fs';
import sharp from 'sharp';

const PAD_X = 320;
const PAD_Y = 144;
/** Bulanıklık kademeleri (sigma) ve kenardan uzaklık (px) eşikleri: 0 = asıl ayna, sonra giderek daha bulanık. */
const BLUR = [3, 9, 22, 44];
const RAMP = [0, 12, 44, 120, 240];
/** Dış kenarda koyulaşma (çarpan) ve soluklaşma (gri karışım) oranları. */
const DARK = 0.5;
const DESAT = 0.35;
const TONE = [74, 64, 56]; // edgeFillers ile aynı sıcak koyu ton (0x4a4038)

const MAPS = [
  // [kaynak görsel (assets/campaign), 16:9 bölgesi bu görselde (kesir; geniş görselde backgroundWide.region)]
  { src: 'valdoria-bg-wide', region: [0.11891, 0, 0.88064, 1] },
  { src: 'drowned-reach-bg', region: [0, 0, 1, 1] },
];

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const r5 = (v) => Math.round(v * 100000) / 100000;

for (const m of MAPS) {
  const inPath = `assets/campaign/${m.src}.webp`;
  const meta = await sharp(inPath).metadata();
  const w = meta.width;
  const h = meta.height;
  const W = w + 2 * PAD_X;
  const H = h + 2 * PAD_Y;
  const mirrored = await sharp(inPath).removeAlpha().extend({ top: PAD_Y, bottom: PAD_Y, left: PAD_X, right: PAD_X, extendWith: 'mirror' }).raw().toBuffer();
  const levels = [mirrored];
  for (const s of BLUR) levels.push(await sharp(mirrored, { raw: { width: W, height: H, channels: 3 } }).blur(s).raw().toBuffer());
  const out = Buffer.alloc(W * H * 3);
  const maxD = Math.hypot(PAD_X, PAD_Y);
  for (let y = 0; y < H; y++) {
    const dy = y < PAD_Y ? PAD_Y - y : y >= PAD_Y + h ? y - (PAD_Y + h - 1) : 0;
    for (let x = 0; x < W; x++) {
      const dx = x < PAD_X ? PAD_X - x : x >= PAD_X + w ? x - (PAD_X + w - 1) : 0;
      const i = (y * W + x) * 3;
      if (!dx && !dy) {
        out[i] = mirrored[i];
        out[i + 1] = mirrored[i + 1];
        out[i + 2] = mirrored[i + 2];
        continue;
      }
      const d = Math.hypot(dx, dy);
      // bulanıklık kademeleri arasında yumuşak karışım
      let k = RAMP.length - 1;
      for (let j = 1; j < RAMP.length; j++)
        if (d < RAMP[j]) {
          k = j;
          break;
        }
      const t = d >= RAMP[RAMP.length - 1] ? 1 : smooth((d - RAMP[k - 1]) / (RAMP[k] - RAMP[k - 1]));
      const a = d >= RAMP[RAMP.length - 1] ? levels[levels.length - 1] : levels[k - 1];
      const b = d >= RAMP[RAMP.length - 1] ? levels[levels.length - 1] : levels[k];
      // vinyet: kenara göre (yatay / dikey ayrı oran, köşede birleşir)
      const v = smooth(Math.min(1, Math.max(dx / PAD_X, dy / PAD_Y, d / maxD)));
      const dark = 1 - DARK * v;
      const de = DESAT * v;
      let r = a[i] + (b[i] - a[i]) * t;
      let g = a[i + 1] + (b[i + 1] - a[i + 1]) * t;
      let bl = a[i + 2] + (b[i + 2] - a[i + 2]) * t;
      const lum = 0.3 * r + 0.59 * g + 0.11 * bl;
      r = (r + (lum - r) * de) * dark + TONE[0] * (1 - dark) * 0.35;
      g = (g + (lum - g) * de) * dark + TONE[1] * (1 - dark) * 0.35;
      bl = (bl + (lum - bl) * de) * dark + TONE[2] * (1 - dark) * 0.35;
      out[i] = Math.max(0, Math.min(255, Math.round(r)));
      out[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      out[i + 2] = Math.max(0, Math.min(255, Math.round(bl)));
    }
  }
  const outPath = `assets/campaign/${m.src.replace(/-wide$/, '')}-ext.webp`;
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 86, smartSubsample: true }).toFile(outPath);
  const [x0, y0, x1, y1] = m.region;
  const fx = (px) => r5((PAD_X + px) / W);
  const fy = (py) => r5((PAD_Y + py) / H);
  const ext = {
    image: outPath.split('/').pop().replace(/\.webp$/, ''),
    region: [fx(x0 * w), fy(y0 * h), fx(x1 * w), fy(y1 * h)],
    content: [fx(0), fy(0), fx(w), fy(h)],
  };
  console.log(`${outPath}  ${W}x${H}  ${(statSync(outPath).size / 1024).toFixed(0)} KB`);
  console.log(`  "backgroundExt": ${JSON.stringify(ext)}`);
}
