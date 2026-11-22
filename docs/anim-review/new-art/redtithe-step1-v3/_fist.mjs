// Yumruk kayması: tabandaki (refs/step1-v2.png) yumruk yaması adayda ±12 px aranır (dx,dy).
import sharp from 'sharp';
const ld = async (f) => (await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
const base = await ld(process.argv[2]);
for (const f of process.argv.slice(3)) { const c = await ld(f); const W = base.info.width; const out = [];
  for (const [fx, fy] of [[113, 213], [325, 205]]) { let best = [1e18, 0, 0];
    for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) { let s = 0;
      for (let y = fy - 14; y <= fy + 14; y++) for (let x = fx - 14; x <= fx + 14; x++) { const p = (y * W + x) * 4, q = ((y + dy) * W + x + dx) * 4; for (let k = 0; k < 4; k++) s += Math.abs(base.data[p + k] - c.data[q + k]); }
      if (s < best[0]) best = [s, dx, dy]; }
    out.push(`(${best[1]},${best[2]})`); }
  console.log(f.split('/').pop(), 'arka', out[0], 'on', out[1]); }
