#!/usr/bin/env node
// Kare birleştirici (token tasarrufu): node tools/ui-shot-sheet.mjs <çıkış.jpg> <kare1.jpg> <kare2.jpg> ... [--cols 2] [--w 640]
import { resolve } from 'node:path';
import sharp from 'sharp';
const a = process.argv.slice(2);
const opt = (n, d) => { const i = a.indexOf(`--${n}`); return i >= 0 ? +a.splice(i, 2)[1] : d; };
const cols = opt('cols', 2);
const w = opt('w', 640);
const [out, ...files] = a;
const tiles = await Promise.all(files.map((f) => sharp(resolve(f)).resize({ width: w }).toBuffer({ resolveWithObject: true })));
const h = Math.max(...tiles.map((t) => t.info.height));
const rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: cols * w, height: rows * h, channels: 3, background: '#000' } })
  .composite(tiles.map((t, i) => ({ input: t.data, left: (i % cols) * w, top: Math.floor(i / cols) * h })))
  .jpeg({ quality: 80 }).toFile(resolve(out));
console.log(`${files.length} kare -> ${out}`);
