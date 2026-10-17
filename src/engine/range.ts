/**
 * MENZİL SİSTEMİ (docs/design/range.md, Ömer 2026-10-17; en deneysel değişiklik: geri alınabilir olsun diye ayrı modül).
 * Tek veri bayrağı: formulas.json > range.enabled. Kapalıyken motor ESKİ erişim kuralını kullanır (melee yalnızca en öndeki dolu sıraya;
 * skill reach / ignoreReach / ignoreFrontRow) ve bu modülün hiçbir kuralı devreye girmez. Saf fonksiyonlar; Battle bunları ince kancalarla çağırır.
 *
 * Kural özeti:
 * - Mesafe (karşı taraf) = saldıranın kendi tarafındaki GERÇEK sıra derinliği (ön 0 ... arka 3; boş sıralar sayılır) + hedefin derinliği
 *   (hedef tarafının en öndeki DOLU sırasından) + 1. Ön ↔ ön 1, arka ↔ arka 7.
 * - Mesafe (kendi tarafı: dost skill'i, kendi tahtasına atılan alan) = sıra farkı.
 * - Menzil = skill.range ?? birimin (sınıf/mob/çağrı) range'i ?? range.default. skill.global ya da hedef seçimi olmayan tür = menzilsiz.
 * - Dost skill'leri (single_ally, dead_ally) yalnızca KENDİ range'i varsa kısıtlanır (Guard 2); diğerleri sınırsız.
 */
import type { Formulas, SkillDef, SkillTarget } from './types';

/** Menzil sistemi açık mı (formulas.json > range.enabled)? */
export const rangeEnabled = (formulas: Pick<Formulas, 'range'>): boolean => !!formulas.range?.enabled;

/** Hedef seçimi olmayan (menzilin anlamsız olduğu) türler. */
export const NO_RANGE_TARGETS: readonly SkillTarget[] = ['self', 'all_allies', 'empty_tile'];
/** Dost hedefli tek seçimli türler: yalnızca skill'in kendi range'i varsa kısıtlanır. */
export const ALLY_TARGETS: readonly SkillTarget[] = ['single_ally', 'dead_ally'];
/** Düşmanı hedefleyen türler (YZ konum alma). */
export const FOE_TARGETS: readonly SkillTarget[] = ['single_enemy', 'area_enemies', 'random_enemies', 'all_enemies', 'everyone', 'area_any'];

/**
 * Skill'in menzili (Infinity = menzilsiz): global / hedef seçimi yok / range'siz dost skill'i -> Infinity; yoksa skill.range ?? sahibin menzili ?? default.
 * Sistem kapalıyken de bir sayı döner (gösterim için); kural uygulanıp uygulanmayacağına çağıran rangeEnabled ile karar verir.
 */
export function skillRangeFor(skill: SkillDef, ownerRange: number | undefined, formulas: Pick<Formulas, 'range'>): number {
  if (skill.global || NO_RANGE_TARGETS.includes(skill.target)) return Infinity;
  if (skill.range !== undefined) return skill.range;
  if (ALLY_TARGETS.includes(skill.target)) return Infinity;
  return ownerRange ?? formulas.range?.default ?? 1;
}

/**
 * Hücre mesafesi. `fromRow`: saldıranın kendi tarafındaki sırası (kendi tahtasında değilse 0 sayılır); `sameSide`: hedef saldıranın kendi tahtasında mı;
 * `targetRow`: hedef hücrenin sırası; `targetFront`: hedef tahtasının en öndeki dolu sırası (yalnızca karşı tarafta kullanılır).
 */
export function cellDistance(fromRow: number, sameSide: boolean, targetRow: number, targetFront: number): number {
  if (sameSide) return Math.abs(fromRow - targetRow);
  return fromRow + Math.max(0, targetRow - targetFront) + 1;
}

/** Skill kartı etiketi: 'Range N' / 'Global'; hedef seçimi olmayan ya da sınırsız dost skill'inde boş. Sistem kapalıyken boş. */
export function rangeLabel(skill: SkillDef, ownerRange: number | undefined, formulas: Pick<Formulas, 'range'>): string {
  if (!rangeEnabled(formulas) || NO_RANGE_TARGETS.includes(skill.target)) return '';
  if (ALLY_TARGETS.includes(skill.target) && skill.range === undefined) return '';
  const r = skillRangeFor(skill, ownerRange, formulas);
  return r === Infinity ? 'Global' : `Range ${r}`;
}

/** Skill kartı açıklama satırı (rangeLabel boşsa boş). */
export function rangeLine(skill: SkillDef, ownerRange: number | undefined, formulas: Pick<Formulas, 'range'>): string {
  const label = rangeLabel(skill, ownerRange, formulas);
  if (!label) return '';
  if (label === 'Global') return 'Global: reaches any target, no range limit';
  const n = skillRangeFor(skill, ownerRange, formulas);
  if (ALLY_TARGETS.includes(skill.target)) return `${label}: only allies up to ${n} row${n === 1 ? '' : 's'} away from you`;
  const area = skill.target === 'area_enemies' || skill.target === 'area_any' ? '; the cell you aim at must be in range, the area may spill past it' : '';
  return `${label}: ${n === 1 ? 'front row to front row only' : `targets up to ${n} steps away (your row depth + their depth behind their front row + 1)`}${area}`;
}
