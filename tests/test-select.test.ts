import { describe, expect, it } from 'vitest';
// @ts-expect-error saf JS aracı, tip bildirimi yok
import { selectTests } from '../tools/test-select.mjs';

type Sel = { mode: 'full' | 'fast'; reason: string; text: string };
const sel = (f: string[]) => selectTests(f) as Sel;

// Gönderimde test seçimi (Ömer 2026-11-15): tek tam/sınıflandırılamayan dosya tam test, yalnız arayüz/belge hızlı
describe('gönderim test seçimi', () => {
  it.each([
    'data/skills.json', 'src/engine/battle.ts', 'src/progression/loadout.ts', 'src/storage-migrate.ts', 'tests/golden/record.ts',
    'tests/fixtures/golden/quick.json', 'vitest.slow-list.ts', 'vitest.config.ts', 'package.json', 'package-lock.json', 'tsconfig.json',
    'tools/push-queue.mjs', 'tools/test-select.mjs',
  ])('%s tam test ister', (f) => {
    expect(sel([f]).mode).toBe('full');
    expect(sel([f]).text).toBe(`test: tam (sebep: ${f})`);
  });

  it('yalnız arayüz/belge dosyaları hızlı', () => {
    const files = ['src/ui/settings.ts', 'src/game/scenes/MainMenuScene.ts', 'src/ui/elegant.css', 'public/privacy.html', 'assets/x.png', 'docs/arch/areas/push-queue.md', 'tools/ui-shot.mjs', 'CLAUDE.md', 'data/patch-notes.json'];
    expect(sel(files)).toMatchObject({ mode: 'fast', text: `test: hızlı (yalnız arayüz: ${files.length} dosya)` });
  });

  it('karışık listede bir tam dosya yeter', () => {
    expect(sel(['src/ui/a.ts', 'docs/x.md', 'data/items.json'])).toMatchObject({ mode: 'full', reason: 'data/items.json' });
  });

  it('sınıflandırılamayan dosya tam test', () => {
    for (const f of ['src/main.ts', 'src/cloud/cloud.ts', 'tests/foo.test.ts', 'vite.config.ts', 'tools/other.mjs', 'cloudflare/src/index.ts']) {
      expect(sel(['src/ui/a.ts', f]).mode).toBe('full');
    }
    expect(sel(['src/main.ts']).text).toBe('test: tam (sebep: sınıflandırılamayan src/main.ts)');
  });

  it('boş liste ve ters eğik çizgi', () => {
    expect(sel([]).mode).toBe('full');
    expect(sel(['src' + String.fromCharCode(92) + 'ui' + String.fromCharCode(92) + 'a.ts']).mode).toBe('fast');
    expect(sel(['src' + String.fromCharCode(92) + 'engine' + String.fromCharCode(92) + 'a.ts']).mode).toBe('full');
  });

  it('0.9.8.4 ve 0.9.8.5 değişiklikleri tam test seçerdi (CI kırıkları data/ + src/engine)', () => {
    expect(sel(['data/skills.json', 'src/engine/battle.ts', 'src/ui/stale-build.ts']).mode).toBe('full');
    expect(sel(['data/account-notice.json', 'src/cloud/cloud.ts', 'src/ui/settings.ts', 'tests/cloud-sync.test.ts']).mode).toBe('full');
  });
});
