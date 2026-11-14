import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('menu fonts (src/ui/menu-style.ts, src/style.css)', () => {
  it('every @font-face in style.css points at a bundled local font file (works offline), latin and latin-ext', () => {
    const css = readFileSync(join(__dirname, '..', 'src', 'style.css'), 'utf8');
    const urls = [...css.matchAll(/@font-face\s*\{[^}]*url\('([^']+)'\)/g)].map((m) => m[1]!);
    expect(urls.length).toBe(6);
    for (const u of urls) {
      expect(u.startsWith('../assets/fonts/')).toBe(true);
      expect(existsSync(join(__dirname, '..', 'src', u))).toBe(true);
    }
    for (const f of ['Cinzel', 'EBGaramond']) {
      expect(urls.some((u) => u.includes(`${f}-normal-latin.woff2`))).toBe(true);
      expect(urls.some((u) => u.includes(`${f}-normal-latin-ext.woff2`))).toBe(true);
    }
  });
});
