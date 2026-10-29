import type { Battle } from '../src/engine';

/**
 * Ömer 2026-10-29 AM değişikliği: Mana Overflow Anti-Mage kitinden çıktı (yerine Spellbreaker's Instinct; manaOverflow motor kodu duruyor).
 * Bu mekaniği sınayan eski testler Anti-Mage birimine eski pasifi geri takar (motor kuralı aynı kaldı; yalnızca kit değişti).
 */
export function giveManaOverflow(b: Battle, uid: string, threshold = 30, mana = 5): void {
  const c = b.get(uid)!;
  c.passive = { id: 'mana_overflow', name: 'Mana Overflow', icon: 'overflow', text: 'Magic damage blocked by your magic armor builds up; every 30 blocked, your whole team gains 5 MP.', effect: { type: 'manaOverflow', threshold, mana } };
}
