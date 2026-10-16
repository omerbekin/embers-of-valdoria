import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PRIVACY_LINE, SETTINGS_LABELS, SETTINGS_PAGES, pageIndex, pageOf, setSettingsPage, settingsPage, stepPage, type SettingsItemKey } from '../src/ui/settings-pages';

const read = (f: string): string => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

// Settings sayfaları (Ömer 2026-10-16): solda Sound · Gameplay · Display · Privacy, sağda o sayfanın satırları; liste TEK yerde
// (src/ui/settings-pages.ts), ana menü sütunu ve oyun içi DOM ekranı aynısını çizer.
describe('Settings sayfaları', () => {
  it('kategoriler ve satırlar istenen sırada', () => {
    expect(SETTINGS_PAGES.map((p) => p.label)).toEqual(['Sound', 'Gameplay', 'Display', 'Privacy']);
    const labels = (k: Parameters<typeof pageOf>[0]) => pageOf(k).items.map((i) => SETTINGS_LABELS[i]);
    expect(labels('sound')).toEqual(['Master Volume', 'Music', 'Sound Effects', 'UI Sounds']);
    expect(labels('gameplay')).toEqual(['Battle Speed', 'Reduced Motion', 'Tutorials']);
    expect(labels('display')).toEqual(['Performance Mode', 'Show FPS', 'Fullscreen']);
    expect(labels('privacy')).toEqual(['Error Reports', 'Copy Log', 'Privacy Info']);
    expect(PRIVACY_LINE.length).toBeLessThan(90);
  });

  it('her satır tam bir sayfada; sayfa başına en çok 4 satır (telefonda kaydırmasız)', () => {
    const all = SETTINGS_PAGES.flatMap((p) => p.items);
    expect(new Set(all).size).toBe(all.length);
    expect(new Set(all)).toEqual(new Set(Object.keys(SETTINGS_LABELS)));
    for (const p of SETTINGS_PAGES) expect(p.items.length).toBeLessThanOrEqual(4);
  });

  it('son seçilen sayfa oturumda hatırlanır; varsayılan Sound; adım uçlarda döner', () => {
    expect(settingsPage()).toBe('sound');
    setSettingsPage('privacy');
    expect(settingsPage()).toBe('privacy');
    setSettingsPage('nope' as never);
    expect(settingsPage()).toBe('privacy');
    expect(stepPage('privacy', 1)).toBe('sound');
    expect(stepPage('sound', -1)).toBe('privacy');
    expect(stepPage('gameplay', 1)).toBe('display');
    expect(pageIndex('display')).toBe(2);
    setSettingsPage('sound');
  });

  it('iki ekran da listeyi settings-pages.ts\'ten çizer ve her satırı işler', () => {
    const keys = Object.keys(SETTINGS_LABELS) as SettingsItemKey[];
    for (const f of ['src/ui/settings.ts', 'src/game/scenes/MainMenuScene.ts']) {
      const src = read(f);
      expect(src, f).toMatch(/SETTINGS_PAGES/);
      expect(src, f).toMatch(/from '(\.\.\/)*(\.\/)?(ui\/)?settings-pages'|from '\.\/settings-pages'|from '\.\.\/\.\.\/ui\/settings-pages'/);
      for (const k of keys) expect(src, `${f}: ${k}`).toMatch(new RegExp(`case '${k}'`));
    }
  });

  it('DOM: kategori sütunu, sayfa başlığı, içeride satırlar; Back sol üstte; Developer tools kategori sütununda', () => {
    const src = read('src/ui/settings.ts');
    expect(src).toMatch(/'st-cats'/);
    expect(src).toMatch(/'st-page-head'/);
    expect(src).toMatch(/nav\.append\(dev\)/);
    const css = read('src/style.css');
    expect(css).toMatch(/\.st-page \.st-row \{\s*margin-left: calc\(30 \* var\(--u\)\)/);
    expect(css).toMatch(/html\.short \.st-row \{\s*height: 44px/);
    expect(css).toMatch(/html\.short \.st-cat \{\s*height: 44px/);
  });
});
