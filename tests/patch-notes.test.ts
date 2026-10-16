import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PAGE_SIZE, PATCH_NOTES, compareVersions, formatPatchDate, patchPage, releaseGroups } from '../src/ui/patch-notes';
import { displayVersionFrom, isSubVersionOf } from '../src/ui/display-version';

// Patch Notes (Ömer 2026-10-11): data/patch-notes.json geçerli olmalı ve en üstteki girdi package.json'daki GÜNCEL taban sürüm ya da
// onun alt sürümü ('0.6.11.1') olmalı (notu yazılmamış sürüm yayınlanamaz). Ekrandaki sürüm o en üst girdidir.
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

describe('Patch Notes verisi', () => {
  it('en üstteki girdi package.json sürümü ya da onun .N alt sürümü; package.json 3 parçalı', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    const top = PATCH_NOTES[0]!.version;
    expect(isSubVersionOf(top, pkg.version), `en üst ${top}, package ${pkg.version}`).toBe(true);
    expect(displayVersionFrom(top, pkg.version)).toBe(top);
  });

  it('taslak (mockup) paylaşımları not almaz', () => {
    for (const r of PATCH_NOTES) for (const g of releaseGroups(r)) for (const line of g.items) expect(line, r.version).not.toMatch(/design preview/i);
  });

  it('sürümler benzersiz, en yeniden eskiye sıralı, tarihler geçerli ve azalmayan sırada değil', () => {
    const vs = PATCH_NOTES.map((r) => r.version);
    expect(new Set(vs).size).toBe(vs.length);
    for (let i = 1; i < PATCH_NOTES.length; i++) {
      expect(compareVersions(PATCH_NOTES[i - 1]!.version, PATCH_NOTES[i]!.version), `${vs[i - 1]} > ${vs[i]}`).toBeGreaterThan(0);
      expect(PATCH_NOTES[i - 1]!.date >= PATCH_NOTES[i]!.date, `${vs[i - 1]} tarihi`).toBe(true);
    }
    for (const r of PATCH_NOTES) {
      expect(r.version, 'sürüm biçimi (3 parça ya da alt sürüm)').toMatch(/^\d+\.\d+\.\d+(\.\d+)?$/);
      expect(r.date, `${r.version} tarih`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(r.date)), `${r.version} tarih`).toBe(false);
    }
  });

  it('her sürümde 1-8 kısa, sade satır; başlıklar New / Changes / Fixes; dosya adı ve iç terim yok', () => {
    for (const r of PATCH_NOTES) {
      const groups = releaseGroups(r);
      expect(groups.length, `${r.version} boş`).toBeGreaterThan(0);
      const lines = groups.flatMap((g) => g.items);
      expect(lines.length, `${r.version} satır sayısı`).toBeGreaterThanOrEqual(1);
      expect(lines.length, `${r.version} satır sayısı`).toBeLessThanOrEqual(8);
      for (const g of groups) {
        if (g.heading) expect(['New', 'Changes', 'Fixes']).toContain(g.heading);
        expect(g.items.length).toBeGreaterThan(0);
      }
      for (const line of lines) {
        expect(line.trim().length, r.version).toBeGreaterThan(5);
        expect(line.length, `${r.version}: çok uzun "${line}"`).toBeLessThanOrEqual(140);
        expect(line, `${r.version}: dosya adı / iç terim "${line}"`).not.toMatch(/\.(ts|json|js|css|png|webp|md)\b|src\/|data\/|mockup|golden|sim:|\bv\d|commit/i);
      }
    }
  });

  it('yardımcılar: tarih biçimi, sürüm karşılaştırma, başlıksız grup', () => {
    expect(formatPatchDate('2026-10-11')).toBe('11 Oct 2026');
    expect(formatPatchDate('bad')).toBe('bad');
    expect(compareVersions('0.6.10', '0.6.9')).toBeGreaterThan(0);
    expect(compareVersions('0.6.9', '0.6.9')).toBe(0);
    expect(compareVersions('0.5.9', '0.6.0')).toBeLessThan(0);
    // 4 parçalı alt sürümler: 0.6.12 > 0.6.11.2 > 0.6.11.1 > 0.6.11 > 0.6.10.9
    expect(compareVersions('0.6.11.1', '0.6.11')).toBeGreaterThan(0);
    expect(compareVersions('0.6.11.2', '0.6.11.1')).toBeGreaterThan(0);
    expect(compareVersions('0.6.11.10', '0.6.11.9')).toBeGreaterThan(0);
    expect(compareVersions('0.6.12', '0.6.11.2')).toBeGreaterThan(0);
    expect(compareVersions('0.6.11', '0.6.10.9')).toBeGreaterThan(0);
    expect(['0.6.11', '0.6.12', '0.6.11.2', '0.6.10', '0.6.11.1'].sort((a, b) => compareVersions(b, a))).toEqual(['0.6.12', '0.6.11.2', '0.6.11.1', '0.6.11', '0.6.10']);
    // görünen sürüm: notların en üstü taban ya da alt sürümüyse o, değilse taban
    expect(displayVersionFrom('0.6.11.1', '0.6.11')).toBe('0.6.11.1');
    expect(displayVersionFrom('0.6.11', '0.6.11')).toBe('0.6.11');
    expect(displayVersionFrom('0.6.10', '0.6.11')).toBe('0.6.11');
    expect(displayVersionFrom('0.6.111', '0.6.11')).toBe('0.6.11');
    expect(displayVersionFrom(undefined, '0.6.11')).toBe('0.6.11');
    expect(releaseGroups({ version: '1.0.0', date: '2026-01-01', items: ['A line'] })).toEqual([{ heading: '', items: ['A line'] }]);
  });
});

describe('Patch Notes sayfalama (Ömer 2026-10-16: sayfa başına en yeni 5 sürüm, Newer / Older)', () => {
  it('sayfa dilimi ve kısma', () => {
    expect(PAGE_SIZE).toBe(5);
    expect(patchPage(38, 0)).toEqual({ page: 0, pages: 8, start: 0, end: 5 });
    expect(patchPage(38, 7)).toEqual({ page: 7, pages: 8, start: 35, end: 38 });
    expect(patchPage(38, 99).page).toBe(7);
    expect(patchPage(38, -3).page).toBe(0);
    expect(patchPage(0, 0)).toEqual({ page: 0, pages: 1, start: 0, end: 0 });
    expect(patchPage(5, 0).pages).toBe(1);
  });

  it('tüm sürümler sayfalara tam bir kez düşer', () => {
    const { pages } = patchPage(PATCH_NOTES.length, 0);
    const seen: string[] = [];
    for (let p = 0; p < pages; p++) {
      const pg = patchPage(PATCH_NOTES.length, p);
      expect(pg.end - pg.start).toBeLessThanOrEqual(PAGE_SIZE);
      seen.push(...PATCH_NOTES.slice(pg.start, pg.end).map((r) => r.version));
    }
    expect(seen).toEqual(PATCH_NOTES.map((r) => r.version));
  });
});
