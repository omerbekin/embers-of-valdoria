/**
 * Simülatörlerde Valor kipi (Ömer 2026-10-13, karşılaştırma için; CLI ortam değişkeni VALOR): 'on' (varsayılan: savaşta + savaş dışı diriltme),
 * 'off' (Valor öncesi oyun), 'battle' (yalnızca savaşta), 'outside' (yalnızca savaş dışı).
 */
export type ValorSimMode = 'on' | 'off' | 'battle' | 'outside';
export const valorInBattle = (m: ValorSimMode | undefined): boolean => m === undefined || m === 'on' || m === 'battle';
export const valorOutside = (m: ValorSimMode | undefined): boolean => m === undefined || m === 'on' || m === 'outside';
export function valorMode(): ValorSimMode {
  const v = (typeof process !== 'undefined' ? process.env.VALOR : undefined) ?? 'on';
  return v === 'off' || v === 'battle' || v === 'outside' ? v : 'on';
}
