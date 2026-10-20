// Hazır sancaklarının saf mantığı (Phaser'sız; test edilir). Çizim: src/game/ready-banners.ts
/** Sancak sahne durumu: hangi taraf indi, ikisi birden mi (ışık/parıltı). */
export function bannerState(mine: boolean, opp: boolean): { left: boolean; right: boolean; both: boolean } {
  return { left: mine, right: opp, both: mine && opp };
}

/** Sancak oranı 360:1000. */
export const BANNER_ASPECT = 1000 / 360;

/** Dış sancak genişliği yan boşluğa sığar; iç sancak ondan küçüktür. */
export function bannerWidths(margin: number): { outer: number; inner: number } {
  const outer = Math.max(48, Math.min(150, Math.floor(margin - 8)));
  return { outer, inner: Math.round(outer * 0.7) };
}
