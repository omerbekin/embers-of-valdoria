import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PRIVACY_LINE, SETTINGS_LABELS, SETTINGS_PAGES, pageIndex, pageOf, pageVisible, setSettingsPage, settingsPage, stepPage, visiblePages, type SettingsItemKey } from '../src/ui/settings-pages';
import { ACCOUNT_SOON, ACCOUNT_SOON_LINE } from '../src/cloud/ui/account-text';

const read = (f: string): string => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

// Settings sayfaları (Ömer 2026-10-16): solda Sound · Gameplay · Display · Privacy, sağda o sayfanın satırları; liste TEK yerde
// (src/ui/settings-pages.ts), ana menü sütunu ve oyun içi DOM ekranı aynısını çizer.
describe('Settings sayfaları', () => {
  it('kategoriler ve satırlar istenen sırada', () => {
    expect(SETTINGS_PAGES.map((p) => p.label)).toEqual(['Sound', 'Gameplay', 'Display', 'UI', 'Privacy', 'Accessibility', 'Account']);
    const labels = (k: Parameters<typeof pageOf>[0]) => pageOf(k).items.map((i) => SETTINGS_LABELS[i]);
    expect(labels('sound')).toEqual(['Master Volume', 'Music', 'Sound Effects', 'UI Sounds']);
    expect(labels('gameplay')).toEqual(['Battle Speed', 'Tutorials']);
    expect(labels('access')).toEqual(['Text Size', 'Colorblind Support', 'Reduce Motion']);
    expect(labels('display')).toEqual(['Performance Mode', 'Show FPS', 'Fullscreen']);
    expect(labels('ui')).toEqual([]); // UI sayfası tek DOM parçasıdır (imleç; src/ui/cursor-settings.ts)
    expect(labels('privacy')).toEqual(['Error Reports', 'Copy Log', 'Privacy Info']);
    expect(labels('account')).toEqual(['Account']);
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
    expect(stepPage('privacy', 1)).toBe('access');
    expect(stepPage('sound', -1)).toBe('account');
    // Giriş yokken (Pages / sunucu kapalı) Account atlanır
    expect(stepPage('privacy', 1, false)).toBe('access');
    expect(stepPage('sound', -1, false)).toBe('access');
    expect(stepPage('account', 1, false)).toBe('sound');
    expect(stepPage('gameplay', 1)).toBe('display');
    expect(pageIndex('display')).toBe(2);
    setSettingsPage('sound');
  });

  it('UI sekmesi telefon / dokunmatik düzende gizli, masaüstünde görünür; adımlama onu atlar', () => {
    expect(pageVisible('ui', true)).toBe(true);
    expect(pageVisible('ui', true, true)).toBe(false);
    expect(visiblePages(true, true).some((p) => p.key === 'ui')).toBe(false);
    expect(stepPage('display', 1, true, true)).toBe('privacy');
    expect(stepPage('display', 1)).toBe('ui');
  });

  it('Account sayfası yalnızca giriş kullanılabilirken görünür', () => {
    expect(pageVisible('account', false)).toBe(false);
    expect(pageVisible('account', true)).toBe(true);
    expect(pageVisible('privacy', false)).toBe(true);
    expect(visiblePages(false).map((p) => p.key)).toEqual(['sound', 'gameplay', 'display', 'ui', 'privacy', 'access']);
    expect(visiblePages(true).map((p) => p.key)).toEqual(['sound', 'gameplay', 'display', 'ui', 'privacy', 'access', 'account']);
  });

  it('Account: ana menü DOM sayfasını kurar, oyun içi salt okunur satır; giriş yokken kategori gizli', () => {
    const menu = read('src/game/scenes/MainMenuScene.ts');
    expect(menu).toMatch(/fullAccount: true/); // tek Settings ekranı (Ömer 2026-11-11): ana menü aynı DOM ekranını tam hesap sayfasıyla açar
    const dom = read('src/ui/settings.ts');
    expect(dom).toMatch(/accountLine\(/);
    expect(dom).toMatch(/cat\.hidden = !pageVisible\(k, login, touch\)/);
    expect(dom).toMatch(/const login = accountShown\(\)/);
  });

  it('Account anahtarı kapalıyken (data/cloud.json enabled:false) her ana makinede görünür ve coming soon metnini çizer', () => {
    const api = read('src/cloud/ui/api.ts');
    expect(api).toMatch(/isLoginAvailable\(\) \|\| !a\.cloudEnabled\(\)/);
    expect(ACCOUNT_SOON.intro).toBe('Sign in with Google or Discord to keep your progress in the cloud and continue on any device. Coming soon.');
    expect(ACCOUNT_SOON.tag).toBe('Coming soon');
    expect(ACCOUNT_SOON.guest).toBe('Your progress is saved on this device.');
    expect(ACCOUNT_SOON_LINE).toBe('Accounts: coming soon');
    const page = read('src/cloud/ui/account-page.ts');
    expect(page).toMatch(/if \(!api\.cloudEnabled\(\)\) \{\s*root\.replaceChildren\(\.\.\.renderComingSoon\(\)\)/);
    expect(page).toMatch(/ACCOUNT_SOON\.intro/);
    expect(page).toMatch(/ACCOUNT_SOON\.guest/);
    const soon = page.slice(page.indexOf('function renderComingSoon'), page.indexOf('function renderSignedOut'));
    expect(soon).not.toMatch(/checkbox|btn\(/); // onay kutusu ve etkin düğme yok
    expect(read('src/ui/settings.ts')).toMatch(/ACCOUNT_SOON_LINE/);
    expect(read('data/cloud.json')).toMatch(/"enabled": (true|false)/);
  });

  it('Settings ekranı listeyi settings-pages.ts ekrani çizer ve her satırı işler (Phaser kopyası yok)', () => {
    const keys = Object.keys(SETTINGS_LABELS) as SettingsItemKey[];
    expect(read('src/game/scenes/MainMenuScene.ts')).not.toMatch(/SETTINGS_PAGES/);
    for (const f of ['src/ui/settings.ts']) {
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
    expect(css).toMatch(/html\.short \.st-cat \{\s*height: 34px/);
  });
});
