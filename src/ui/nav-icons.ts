/**
 * Ortak gezinme ikon düğmeleri (Ömer 2026-10-14, ikon taslağı D): sol üst Back, sağ üst Menu ve tam ekran AYNI kare çerçevede, AYNI ölçüde.
 * 44 px dokunma alanı içinde 30 px ince altın çerçeve (1 px rgba(217,178,106,.42), dolgu rgba(12,9,6,.45), hover #f3d999) ve ince çizgi simge.
 * Ölçüler TEK yerde (`NAV_BTN`): DOM `style.css > .nav-btn` (--nav-hit / --nav-frame / --nav-icon) ve Phaser `elegant-ui.ts > elBack` buradan okur
 * (`tests/nav-icons.test.ts` CSS'in aynı sayıları taşıdığını denetler). Saf modül: Phaser ve DOM'a bağlı değil.
 */

/** CSS pikseli (oyun biriminden bağımsız: her ekranda fiziksel olarak aynı boy). */
export const NAV_BTN = { hit: 44, frame: 30, icon: 18, edge: 6, gap: 4 } as const;

/**
 * Masaüstü büyütmesi (Ömer 2026-10-17): düğmeler CSS pikseli olduğu için büyük masaüstü pencerede küçük kalıyordu. Dokunmatikte (coarse) 1 (telefon aynen);
 * fare ile ise sahne yüksekliğine (CSS px) göre `NAV_DESKTOP.min`..`max` arası katsayı (`height / per`). Back, Menu ve tam ekran AYNI katsayıyı kullanır.
 */
export const NAV_DESKTOP = { per: 640, min: 1, max: 1.75, step: 0.05 } as const;

/** Düğme katsayısı: dokunmatikte 1; fare ile sahne yüksekliğine göre büyür (0.05 adımlı). */
export function navScaleFor(stageH: number, coarse: boolean): number {
  if (coarse || !(stageH > 0)) return 1;
  const k = Math.min(NAV_DESKTOP.max, Math.max(NAV_DESKTOP.min, stageH / NAV_DESKTOP.per));
  return Math.round(k / NAV_DESKTOP.step) * NAV_DESKTOP.step;
}

/** Çizgi rengi (kit metni), hover rengi, çerçeve. */
export const NAV_COLOR = { line: '#d9c8a2', hover: '#f3d999', border: 'rgba(217, 178, 106, 0.42)', fill: 'rgba(12, 9, 6, 0.45)', ember: '#e0702a', emberLine: '#e0904a' } as const;

/** Simge yolları (24x24 görünüm kutusu). */
export const BACK_PATH = 'M15 4 L7 12 L15 20';
export const MENU_LINES = ['M4 6h16', 'M4 12h5', 'M15 12h5', 'M4 18h16'] as const;
export const MENU_DIAMOND = 'M12 9.2 l2.8 2.8 -2.8 2.8 -2.8 -2.8 z';
export const FS_ENTER_PATH = 'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6';
export const FS_EXIT_PATH = 'M9 3v6H3M21 9h-6V3M15 21v-6h6M3 15h6v6';
export const NAV_STROKE = 1.6;

export type NavIcon = 'back' | 'menu' | 'fs-enter' | 'fs-exit';

const svg = (body: string, cap: 'round' | 'square'): string =>
  `<svg viewBox="0 0 24 24" width="${NAV_BTN.icon}" height="${NAV_BTN.icon}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${NAV_STROKE}" stroke-linecap="${cap}" stroke-linejoin="round">${body}</svg>`;

/** DOM düğmesinin içine konan SVG (renk `currentColor`: hover'da açılır; Menu elmasının kor rengi sabit). */
export function navSvg(kind: NavIcon): string {
  switch (kind) {
    case 'back':
      return svg(`<path d="${BACK_PATH}"/>`, 'round');
    case 'menu':
      return svg(`<path d="${MENU_LINES.join(' ')}"/><path d="${MENU_DIAMOND}" stroke="${NAV_COLOR.emberLine}" fill="${NAV_COLOR.ember}" stroke-width="1"/>`, 'round');
    case 'fs-enter':
      return svg(`<path d="${FS_ENTER_PATH}"/>`, 'square');
    case 'fs-exit':
      return svg(`<path d="${FS_EXIT_PATH}"/>`, 'square');
  }
}

/**
 * GLOBAL HİZA KURALI (Ömer 2026-10-14): sol üst Back, sağ üst Menu / tam ekranın AYNASIDIR. Üçü de ekranın (görünen oyun alanının) üst kenarından
 * `NAV_BTN.edge` px aşağıda, aynı yükseklikte; Back sol kenardan, Menu sağ kenardan aynı `edge` px içeride. Her ekranda, her boyutta aynı hiza.
 */
export const BACK_POS = { edgePx: NAV_BTN.edge } as const;

/**
 * Sol üst Back'in yeri, oyun biriminde. `left` = görünen alanın sol kenarı (stageView.left), `cssScale` = 1 oyun biriminin CSS pikseli.
 * x = düğmenin (44 px dokunma alanının) sol kenarı, y = dikey orta, `scale` = 1 CSS pikselinin oyun birimi (Phaser kabını bununla ölçekle).
 * DOM `.el-back` ve sağ üst `.nav-btn` (style.css) aynı kuralı CSS pikseliyle taşır.
 */
export function backPlacement(left: number, cssScale: number, navK = 1): { x: number; y: number; scale: number } {
  const s = cssScale > 0 ? cssScale : 1;
  const k = navK > 0 ? navK : 1;
  const px = k / s; // 1 taban CSS pikselinin oyun birimi (masaüstü katsayısı dahil)
  return { x: left + NAV_BTN.edge * px, y: (NAV_BTN.edge + NAV_BTN.hit / 2) * px, scale: px };
}
