/** Ana menü yazı tipleri (eski classic / ?menu=old dalı 2026-11-09'da silindi; menü her zaman zarif stil). Fontlar yerel (`assets/fonts`, @font-face `src/style.css`); yükleme `menu-fonts.ts`. */

/** Başlık / menü satırı yazısı (Cinzel; yüklenmezse serif yedek). */
export const DISPLAY_FONT = "Cinzel, Georgia, 'Palatino Linotype', serif";
/** Açıklama / alt yazı (EB Garamond). */
export const BODY_FONT = "'EB Garamond', Georgia, 'Palatino Linotype', serif";
/** Sayı yazısı (Palatino: Georgia'nın eski stil rakamları okunmaz). Tek kaynak; CSS ikizi tokens.css > --font-num. */
export const NUM_FONT = "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif";
