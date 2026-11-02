// Siyah zeminli 4x2 VFX sayfasını (Codex/ChatGPT) gerçek alfalı kaynağa çevirir: assets/source/mob-vfx/<mob>-<skill>.png
// Kullanım: node tools/black-sheet-to-alpha.mjs <girdi.png> <çıktı.png>
// Yöntem: alfa = (en parlak kanal - NOISE) / (SOFT - NOISE) (0-1), renk siyahtan ön-çarpımsız geri alınır (koyu hale kalmaz, ışıma
// koyu zeminde aynı görünür). Her hücrenin en dış 3 pikseli silinir (komşu hücreye taşan kırıntı / dikiş olmasın).
import sharp from 'sharp';

const [inp, out] = process.argv.slice(2);
if (!inp || !out) throw new Error('kullanım: node tools/black-sheet-to-alpha.mjs <girdi> <çıktı>');
const NOISE = 14;
const SOFT = 96;
const EDGE = 3;
const { data, info } = await sharp(inp).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const CW = Math.floor(W / 4);
const CH = Math.floor(H / 2);
const rgba = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    const o = (y * W + x) * 4;
    const cx = x % CW;
    const cy = y % CH;
    const edge = cx < EDGE || cy < EDGE || cx >= CW - EDGE || cy >= CH - EDGE || x >= CW * 4 || y >= CH * 2;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const m = Math.max(r, g, b);
    const a = edge ? 0 : Math.min(1, Math.max(0, (m - NOISE) / (SOFT - NOISE)));
    if (a <= 0) continue;
    rgba[o] = Math.min(255, Math.round(r / a));
    rgba[o + 1] = Math.min(255, Math.round(g / a));
    rgba[o + 2] = Math.min(255, Math.round(b / a));
    rgba[o + 3] = Math.round(a * 255);
  }
}
await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(out);
console.log(`${out} ${W}x${H}`);
