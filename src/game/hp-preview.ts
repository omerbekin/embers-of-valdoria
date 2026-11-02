/**
 * Hover önizlemesinde can çubuğundaki parlayan parçanın SAF ölçüsü (Phaser'sız, test edilebilir).
 * Değerler motorun önizlemesinden gelir (engine/preview.ts > hpLossMin/hpLossMax: isabet ettiğinde, kritik hariç); burada yeni hesap yoktur.
 */
export interface HpLossSwing {
  /** En çok hasarda parçanın genişliği, çubuğun oranı olarak (0-1). */
  maxWidth: number;
  /** En az hasarın en çok hasara oranı (0-1): parça bu ölçek ile 1 arasında gidip gelir. */
  minScale: number;
}

export function hpLossSwing(hp: number, maxHp: number, lossMin: number, lossMax: number): HpLossSwing {
  const top = Math.min(hp, Math.max(0, lossMax));
  const low = Math.min(top, Math.max(0, lossMin));
  return { maxWidth: maxHp > 0 ? top / maxHp : 0, minScale: top > 0 ? low / top : 1 };
}
