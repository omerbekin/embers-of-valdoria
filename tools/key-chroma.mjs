// Düz renkli (ör. #00ff00 yeşil / #ff00ff macenta) zeminli ChatGPT çizimini gerçek alfalı PNG'ye çevirir (Harita 2 nesneleri / ikonları).
// Kullanım: node tools/key-chroma.mjs <girdi.png> <çıktı.png> [--tol=70]
// Zemin rengi köşelerden okunur; kenardan taşma dolgusu (yalnızca zemin rengine yakın pikseller) siler, kenarda 1 px yumuşatma + renk sızıntısı temizliği yapar.
import sharp from 'sharp';

const [inp, out] = process.argv.slice(2);
const tol = Number((process.argv.find((a) => a.startsWith('--tol=')) ?? '--tol=70').split('=')[1]);
if (!inp || !out) throw new Error('kullanım: node tools/key-chroma.mjs <girdi> <çıktı> [--tol=70]');
const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (x, y) => (y * W + x) * 4;
const corners = [px(1, 1), px(W - 2, 1), px(1, H - 2), px(W - 2, H - 2)].map((i) => [data[i], data[i + 1], data[i + 2]]);
const bg = [0, 1, 2].map((c) => Math.round(corners.reduce((a, k) => a + k[c], 0) / 4));
const dist = (i) => Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
const gone = new Uint8Array(W * H);
const stack = [];
const push = (x, y) => {
  const k = y * W + x;
  if (gone[k] || dist(k * 4) > tol) return;
  gone[k] = 1;
  stack.push(x, y);
};
for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
while (stack.length) {
  const y = stack.pop(), x = stack.pop();
  if (x > 0) push(x - 1, y);
  if (x < W - 1) push(x + 1, y);
  if (y > 0) push(x, y - 1);
  if (y < H - 1) push(x, y + 1);
}
// Kapalı cepler (ör. yay ile kiriş arası): zemin rengine çok yakın (tol/2) her piksel bağlantıdan bağımsız silinir; çizimde böyle saf renk olmaz
for (let k = 0; k < W * H; k++) if (!gone[k] && dist(k * 4) <= tol * 0.55) gone[k] = 1;
// Kenar halkası: silinen alana komşu piksellerde zemin rengine yakınlığa göre kısmi alfa + zemin rengi sızıntısı temizliği
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const k = y * W + x, i = k * 4;
    if (gone[k]) { data[i + 3] = 0; continue; }
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && gone[yy * W + xx]) { near = true; break; } }
    if (!near) continue;
    const d = dist(i);
    if (d < tol * 1.6) data[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (d - tol) / (tol * 0.6))));
    // renk sızıntısı: zemin renginin baskın kanalını komşu kanalların ortalamasına çek
    const hi = bg.indexOf(Math.max(...bg));
    const others = [0, 1, 2].filter((c) => c !== hi);
    const lim = Math.max(data[i + others[0]], data[i + others[1]]);
    if (bg[hi] > 200 && data[i + hi] > lim + 10 && bg.filter((v) => v > 200).length === 1) data[i + hi] = lim + 10;
  }
await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);
console.log(`${out} ${W}x${H} zemin rgb(${bg.join(',')}) tol ${tol}`);
