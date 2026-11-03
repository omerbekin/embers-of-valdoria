/**
 * Dizilim menzil göstergesi yardımcısı: sınıfın ana menzili. Kutunun kendisi `reach-tip-dom.ts` (Sefer Formation ile aynı DOM bileşeni).
 */
import { content } from '../engine';

/** Sınıfın ana menzili (null = menzilsiz / Global). */
export function classRange(classId: string): number | null {
  const r = content.planUnitOf(classId).range;
  return Number.isFinite(r) ? r : null;
}
