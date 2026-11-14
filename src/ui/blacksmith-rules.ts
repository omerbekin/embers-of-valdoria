/**
 * Demirci arayüz kuralları (saf, DOM yok; Ömer 2026-11-12): Reforge sekmesi yalnız Epic item kabul eder. Oyun kuralı değişmedi (src/campaign/smith.ts
 * > reforgeSlots / reforgeBlocked zaten Epic ister); bu yalnız arayüzün seçimi: Epic olmayan item demirciye alınmaz, kısa bildirim çıkar.
 */
import { reforgeSlots } from '../campaign';
import { itemDef, type ItemInstance } from '../progression';

/** Reforge'a Epic olmayan item konunca çıkan bildirim (oyun içi metin, İngilizce). */
export const REFORGE_EPIC_ONLY = 'Reforge works on Epic items only';

/** Reforge sekmesi bu item'i alır mı? (Epic, set değil: yeniden zarlanacak affix'i olan item.) */
export const reforgeAccepts = (inst: ItemInstance | null | undefined): boolean => !!inst && !!itemDef(inst.id) && reforgeSlots(inst).length > 0;

/** Reforge'a alınmama nedeni (alınıyorsa null): set parçası ayrı yazılır, kalan her şey "Epic only". */
export function reforgeRejectReason(inst: ItemInstance | null | undefined): string | null {
  if (reforgeAccepts(inst)) return null;
  if (inst && itemDef(inst.id)?.set) return 'Set items cannot be reforged';
  return REFORGE_EPIC_ONLY;
}

/**
 * Sekme değişince Reforge'un seçimi: Temper'deki seçim Epic ise Reforge'a taşınır; Epic değilse Reforge boş görünür (önceki seçim korunmaz,
 * yanlış item gösterilmesin); Temper'de seçim yoksa Reforge'un kendi seçimi kalır.
 */
export function reforgePickOnSwitch(temperPick: ItemInstance | null, reforgePick: string): string {
  if (!temperPick) return reforgePick;
  return reforgeAccepts(temperPick) ? temperPick.uid : '';
}
