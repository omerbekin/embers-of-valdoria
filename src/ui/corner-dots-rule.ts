/**
 * Köşe süsü = yuvarlak üç nokta (Ömer 2026-11-21, mockup uc-nokta-3 onaylı). Saf kural: DOM (`corner-dots.ts`, `corner-dots.css`) ve Phaser
 * (`src/game/corner-dots-gfx.ts`) AYNI fonksiyonları kullanır; kutu başına elle sayı yazılmaz.
 *
 * Boy: tek nokta boyu, taban 4 px (V05); kutunun KISA kenarına (masaüstü piksel, 1920x1080 birimi) göre:
 *   80 altı +%25 · 80-150 +%50 · 150-300 +%75 · 300 ve üstü +%100.
 * Konum: yalnız kısa kenar 70 altı VE kareye yakın (en / boy <= 1,25) kutularda üst + alt kenara ortalı; öbür her yerde bugünkü köşe konumunda
 * (sol üst + sağ alt; üst iki köşede karosu olan çerçevede sol üst + sağ üst).
 * Telefon: nokta kutu ölçeğinden türer (kutu ölçeği = --u / HUD ölçeği), yani nokta / kutu oranı masaüstündeki oranı AŞMAZ.
 */
export const CD_BASE = 4;
export const CD_CENTRE_MAX_SHORT = 70;
export const CD_CENTRE_MAX_RATIO = 1.25;
/** Nokta rengi (V05 fildişi). */
export const CD_COLOR = '#f6e8bc';
export const CD_COLOR_HEX = 0xf6e8bc;

/** Kısa kenara (masaüstü px) göre kademe çarpanı. */
export const cdTier = (shortDesk: number): number => (shortDesk >= 300 ? 2 : shortDesk >= 150 ? 1.75 : shortDesk >= 80 ? 1.5 : 1.25);
/** Okunur kademe yazısı (+%25 gibi). */
export const cdTierText = (shortDesk: number): string => `+${Math.round((cdTier(shortDesk) - 1) * 100)}%`;
/** Ortalı mı (üst + alt kenar) yoksa köşede mi. Ölçüler masaüstü px. */
export const cdCentred = (wDesk: number, hDesk: number): boolean => {
  const lo = Math.min(wDesk, hDesk);
  const hi = Math.max(wDesk, hDesk);
  return lo > 0 && lo < CD_CENTRE_MAX_SHORT && hi / lo <= CD_CENTRE_MAX_RATIO;
};
/** Nokta çapı (masaüstü px). */
export const cdDot = (shortDesk: number): number => CD_BASE * cdTier(shortDesk);
/** Noktalar arası adım (masaüstü px): en az 8 x kademe, en az çapın 1,9 katı (CSS ikizi corner-dots.css --cd-pt). */
export const cdPitch = (shortDesk: number): number => Math.max(8 * cdTier(shortDesk), cdDot(shortDesk) * 1.9);
/** Köşe grubunun yanı: 'br' = sol üst + sağ alt, 'tr' = sol üst + sağ üst. */
export type CdPos = 'br' | 'tr';
