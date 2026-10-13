/**
 * Siyah zeminli (opak) boyalı görseli saydam yapar; logo (tools/make-logo.mjs) ve amblem ikonları (tools/make-logo-icons.mjs) ortak.
 * Yöntem: kenarlardan bulanık parlaklığı "neredeyse siyah" piksellerden taşma dolgusu = dış zemin. Alfa parlaklığa göre yumuşak
 * (ışıma, duman, kıvılcım yarı saydam) ve zeminden uzaklaştıkça artar (içteki koyu taşlar opak kalır). Renk siyahtan
 * "ön-çarpımsız" geri alınır (c / alfa): koyu hale kalmaz, ışıma koyu zeminde aynı görünür. Sonuç saydam kenarlardan kırpılır.
 */
import sharp from 'sharp';

const BG_MAX = 12; // bulanık parlaklığı bunun altında kalan pikseller dış zemine akabilir
const BLUR = 5; // dolgu bulanık parlaklıkta yürür: koyu taş dokusundaki ince çatlaklardan içeri sızmaz
const NOISE = 6; // bunun altı siyah gürültü: tam saydam (kırpma kenarı temiz kalsın)
const SOFT = 70; // parlaklık alfası: (max kanal - NOISE) / (SOFT - NOISE)
const DEPTH = 7; // zeminden bu kadar piksel içerisi tam opak

/** Ham görsel yolu (ya da tampon) -> kırpılmış saydam PNG tamponu. `trim: false` = kırpmadan (kareleri ortak kutuya hizalamak için; tools/make-valor-icons.mjs). */
export async function blackToAlpha(file, { trim = true } = {}) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const mx = new Uint8Array(n);
  for (let i = 0; i < n; i++) mx[i] = Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  const soft = await sharp(Buffer.from(mx), { raw: { width: w, height: h, channels: 1 } }).blur(BLUR).extractChannel(0).raw().toBuffer();

  // 1) Dış zemin: kenardan taşma dolgusu
  const bg = new Uint8Array(n);
  const q = new Int32Array(n);
  let qh = 0;
  let qt = 0;
  const seed = (i) => {
    if (!bg[i] && soft[i] < BG_MAX) {
      bg[i] = 1;
      q[qt++] = i;
    }
  };
  for (let x = 0; x < w; x++) seed(x), seed((h - 1) * w + x);
  for (let y = 0; y < h; y++) seed(y * w), seed(y * w + w - 1);
  while (qh < qt) {
    const i = q[qh++];
    const x = i % w;
    if (x > 0) seed(i - 1);
    if (x < w - 1) seed(i + 1);
    if (i >= w) seed(i - w);
    if (i < n - w) seed(i + w);
  }

  // 2) Zemine uzaklık (BFS, DEPTH'e kadar)
  const dist = new Uint8Array(n).fill(255);
  qh = qt = 0;
  for (let i = 0; i < n; i++) if (bg[i]) (dist[i] = 0), (q[qt++] = i);
  while (qh < qt) {
    const i = q[qh++];
    const d = dist[i] + 1;
    if (d > DEPTH) continue;
    const x = i % w;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
      if (j < 0 || j >= n || dist[j] <= d) continue;
      dist[j] = d;
      q[qt++] = j;
    }
  }

  // 3) Alfa + ön-çarpımsız renk (dış zeminde yalnızca parlaklık alfası; içeride zeminden uzaklaştıkça opak)
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const lum = Math.min(1, Math.max(0, mx[i] - NOISE) / (SOFT - NOISE));
    const deep = Math.min(1, dist[i] / DEPTH);
    const a = Math.max(lum, deep * deep * (3 - 2 * deep));
    for (let c = 0; c < 3; c++) out[i * 4 + c] = a > 0 ? Math.min(255, Math.round(data[i * 3 + c] / a)) : 0;
    out[i * 4 + 3] = Math.round(a * 255);
  }
  const png = await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  if (!trim) return png;
  return sharp(png).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }).png().toBuffer();
}
