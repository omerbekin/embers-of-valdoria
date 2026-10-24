/**
 * Settings sayfaları (Ömer 2026-10-16): TEK kaynak. Ana menü sütunu (`MainMenuScene.buildSettings`) ve oyun içi DOM ekranı
 * (`src/ui/settings.ts`) aynı listeyi çizer: solda kategori sütunu (seçili olanın önünde kor elması), sağda o kategorinin satırları.
 * Son seçilen kategori oturum boyunca hatırlanır (sayfa yenilenince Sound). Saf modül: DOM / Phaser yok (`tests/settings-pages.test.ts`).
 */
export type SettingsPageKey = 'sound' | 'gameplay' | 'display' | 'privacy' | 'account';

/** Satır kimlikleri: her ekran kendi çizimini bu kimliğe bağlar (yeni ayar = buraya + iki çizici). */
export type SettingsItemKey = 'master' | 'music' | 'sfx' | 'ui' | 'speed' | 'motion' | 'tutorials' | 'perf' | 'fps' | 'fullscreen' | 'reports' | 'copyLog' | 'info' | 'account';

export interface SettingsPage {
  key: SettingsPageKey;
  label: string;
  items: readonly SettingsItemKey[];
}

export const SETTINGS_PAGES: readonly SettingsPage[] = [
  { key: 'sound', label: 'Sound', items: ['master', 'music', 'sfx', 'ui'] },
  { key: 'gameplay', label: 'Gameplay', items: ['speed', 'motion', 'tutorials'] },
  // Fullscreen eski Gameplay bölümündeydi; görüntüyle ilgili olduğu için burada (API yoksa satır çizilmez)
  { key: 'display', label: 'Display', items: ['perf', 'fps', 'fullscreen'] },
  { key: 'privacy', label: 'Privacy', items: ['reports', 'copyLog', 'info'] },
  // Hesap / bulut kaydı (accounts-plan.md Faz 1d): ana menüde tam sayfa (src/cloud/ui/account-page.ts), oyun içinde salt okunur satır
  // (OAuth sayfayı yönlendirir). Giriş yoksa (Pages, sunucu kapalı: isLoginAvailable false) kategori hiç görünmez.
  { key: 'account', label: 'Account', items: ['account'] },
];

/** Satır yazıları (oyun içi metin İngilizce). */
export const SETTINGS_LABELS: Record<SettingsItemKey, string> = {
  master: 'Master Volume',
  music: 'Music',
  sfx: 'Sound Effects',
  ui: 'UI Sounds',
  speed: 'Battle Speed',
  motion: 'Reduced Motion',
  tutorials: 'Tutorials',
  perf: 'Performance Mode',
  fps: 'Show FPS',
  fullscreen: 'Fullscreen',
  reports: 'Error Reports',
  copyLog: 'Copy Log',
  info: 'Privacy Info',
  account: 'Account',
};

/** Sayfa görünür mü: Account yalnızca giriş kullanılabilirken (src/cloud/cloud.ts > isLoginAvailable). */
export function pageVisible(key: SettingsPageKey, loginAvailable: boolean): boolean {
  return key !== 'account' || loginAvailable;
}

/** Görünen sayfalar (kategori sütunu). */
export function visiblePages(loginAvailable: boolean): SettingsPage[] {
  return SETTINGS_PAGES.filter((p) => pageVisible(p.key, loginAvailable));
}

/** Privacy sayfasının altındaki kısa gizlilik satırı (ayrıntı: Info penceresi, src/diag/diag-notice.ts). */
export const PRIVACY_LINE = 'Off by default. Anonymous technical data only, kept 30 days.';

/** Raporlar açıkken Privacy sayfasında gösterilen kimlik satırı (KVKK başvurusunda raporları bulmak için). */
export const reportIdLine = (id: string | null): string => (id ? `Your report ID: ${id}` : '');

let current: SettingsPageKey = 'sound';

/** Son seçilen kategori (oturum boyunca; varsayılan Sound). */
export function settingsPage(): SettingsPageKey {
  return current;
}

export function setSettingsPage(key: SettingsPageKey): void {
  if (SETTINGS_PAGES.some((p) => p.key === key)) current = key;
}

export function pageIndex(key: SettingsPageKey): number {
  return Math.max(0, SETTINGS_PAGES.findIndex((p) => p.key === key));
}

/** Kategori sütununda d adım (yukarı -1 / aşağı +1), uçlarda döner; gizli sayfalar (giriş yokken Account) atlanır. */
export function stepPage(key: SettingsPageKey, d: number, loginAvailable = true): SettingsPageKey {
  const list = visiblePages(loginAvailable);
  const n = list.length;
  const i = list.findIndex((p) => p.key === key);
  if (i < 0) return list[0]!.key;
  return list[(((i + d) % n) + n) % n]!.key;
}

export function pageOf(key: SettingsPageKey): SettingsPage {
  return SETTINGS_PAGES[pageIndex(key)]!;
}
