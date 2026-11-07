import type { Formulas } from '../src/engine';

/**
 * Tur başına hız zarı kapalı kurulum (Ömer 2026-11-07: hız her tur ±spdVariance zarlanır). Sıra sırasına değil başka bir mekaniğe bakan
 * senaryo testleri için: sıra yalnızca hız + sayaçtan gelir (zar yok), test seed'e göre şans eseri bozulmaz.
 */
export const noPace = <T extends { formulas: Formulas }>(setup: T): T => ({ ...setup, formulas: { ...setup.formulas, attributes: { ...setup.formulas.attributes, spdVariance: 0 } } });
