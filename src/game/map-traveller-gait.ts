/** Harita lideri yürüyüş ritmi (saf; Phaser'sız, test edilir). */
/** Bir adımın yolu (px) ve sekme yüksekliği (mockup: 32 px / 2.8 px; oyun yürüyüşü hızlı olduğu için adım uzun). */
export const STRIDE = 96;
export const BOB = 2.8;

/** Yürüdüğü yola (px) göre sekme (yukarı = negatif) ve kaçıncı adım olduğu. */
export function travelGait(moved: number): { bob: number; step: number } {
  const f = (((moved / STRIDE) % 1) + 1) % 1;
  return { bob: -BOB * Math.abs(Math.sin(f * Math.PI)), step: Math.floor(moved / STRIDE) };
}
