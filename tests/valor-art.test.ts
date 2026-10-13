import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { BRAZIER_FRAMES, BRAZIER_READY, brazierIconUrl, brazierLooks, brazierUrl } from '../src/ui/valor-braziers';

// Valor mangalları boyalı karelerle (Ömer 2026-10-14): assets/valor, kesim tools/make-valor-icons.mjs, asıl assets/source/valor/brazier-sheet.png
const R = content.valorRules;

/** WebP boyutu (sharp'sız: CI'da sharp kurulu değil). VP8X / VP8L / VP8 başlıkları. */
function webpSize(file: string): { width: number; height: number } {
  const b = readFileSync(file);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return { width: 1 + (v & 0x3fff), height: 1 + ((v >> 14) & 0x3fff) }; }
  return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
}

describe('Valor mangal kareleri (assets/valor)', () => {
  it('kor sayısı kareyi seçer; alev yalnızca dolu mangalda VE Valor eşikteyken', () => {
    expect(R.perBrazier).toBe(4);
    expect(brazierLooks(0, R, R.revive.outsideCost).map((l) => [l.frame, l.ready])).toEqual([
      ['brazier-0', false],
      ['brazier-0', false],
    ]);
    // savaş dışında eşik 4: ilk dolu mangal alevli
    expect(brazierLooks(5, R, R.revive.outsideCost).map((l) => [l.frame, l.ready])).toEqual([
      ['brazier-4', true],
      ['brazier-1', false],
    ]);
    // savaşta eşik 6: dolu mangal da alevsiz kalır (diriltme henüz yok)
    expect(brazierLooks(5, R, R.revive.battleCost).map((l) => [l.frame, l.ready])).toEqual([
      ['brazier-4', false],
      ['brazier-1', false],
    ]);
    expect(brazierLooks(R.cap, R, R.revive.battleCost).every((l) => l.frame === 'brazier-4' && l.ready)).toBe(true);
    for (let v = 0; v <= R.cap; v++) for (const l of brazierLooks(v, R)) expect(BRAZIER_FRAMES).toContain(l.frame);
  });

  it('her kare diskte ve oyunun listesinde; kâse kareleri aynı boyda, alevli kare aynı genişlikte yalnızca daha uzun', async () => {
    const onDisk = readdirSync('assets/valor').map((f) => f.replace(/\.webp$/, '')).sort();
    expect(onDisk).toEqual([...BRAZIER_FRAMES, BRAZIER_READY].sort());
    for (const n of onDisk) expect(brazierUrl(n), n).not.toBe('');
    expect(brazierIconUrl(true)).toBe(brazierUrl(BRAZIER_READY));
    const sizes = BRAZIER_FRAMES.map((n) => webpSize(`assets/valor/${n}.webp`));
    const ready = webpSize(`assets/valor/${BRAZIER_READY}.webp`);
    for (const m of sizes) expect([m.width, m.height]).toEqual([sizes[0]!.width, sizes[0]!.height]);
    expect(sizes[0]!.height).toBeGreaterThanOrEqual(96);
    expect(ready.width).toBe(sizes[0]!.width);
    expect(ready.height!).toBeGreaterThan(sizes[0]!.height!);
  });

  it('asıl sayfa ve kesim aracı yerinde (assets/source oyuna yüklenmez)', () => {
    expect(existsSync('assets/source/valor/brazier-sheet.png')).toBe(true);
    expect(existsSync('tools/make-valor-icons.mjs')).toBe(true);
  });
});
