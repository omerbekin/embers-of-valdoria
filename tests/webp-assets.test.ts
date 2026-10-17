/**
 * Oyun görsellerin PNG asıllarının yanındaki .webp kopyalarını yükler (Ömer 2026-10-17 yükleme performansı; tools/webp-assets.mjs).
 * Bir araç PNG'yi değiştirip WebP'yi yeniden üretmeyi unutursa oyun ESKİ görseli gösterirdi: bu test her PNG'nin güncel WebP'si olduğunu
 * (assets/webp-manifest.json'daki içerik özeti) ve PNG'siz WebP kalmadığını denetler. Kırmızıysa: node tools/webp-assets.mjs
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// tools/webp-assets.mjs > WEBP_DIRS ile aynı
const WEBP_DIRS = ['poses', 'weapons', 'sprites', 'avatars', 'vfx', 'mob-vfx', 'stat-icons', 'ui-icons', 'misc-icons', 'mob-icons', 'icons-v2'];

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p.split('\\').join('/'));
  }
  return out;
}

const files = WEBP_DIRS.flatMap((d) => walk(`assets/${d}`));
const manifest = JSON.parse(readFileSync('assets/webp-manifest.json', 'utf8')) as Record<string, string>;
const FIX = 'node tools/webp-assets.mjs';

describe('WebP kopyaları (tools/webp-assets.mjs)', () => {
  it('her PNG\'nin güncel bir WebP kopyası var', () => {
    const stale: string[] = [];
    for (const f of files.filter((x) => x.endsWith('.png'))) {
      const h = createHash('sha1').update(readFileSync(f)).digest('hex').slice(0, 16);
      if (manifest[f] !== h || !existsSync(f.replace(/\.png$/, '.webp'))) stale.push(f);
    }
    expect(stale, `WebP'si eksik / eski (çalıştır: ${FIX})`).toEqual([]);
  });

  it('PNG\'si olmayan WebP yok', () => {
    const pngs = new Set(files.filter((x) => x.endsWith('.png')).map((x) => x.replace(/\.png$/, '')));
    expect(files.filter((x) => x.endsWith('.webp') && !pngs.has(x.replace(/\.webp$/, ''))), `yetim WebP (çalıştır: ${FIX})`).toEqual([]);
  });
});
