import type { Battle } from '../src/engine';

/**
 * Ömer 2026-10-29 Mage reworkü: Mana Barrier ve Spell Echo Mage kitinden çıktı (skills.json'da `retired`, spellEcho etkisi Gambler / Geometer'de sürüyor).
 * Bu mekanikleri sınayan eski testler Mage birimine Mana Barrier'ı geri verir (motor kuralı aynı kaldı; yalnızca kit değişti).
 */
export function giveManaBarrier(b: Battle): Battle {
  for (const c of b.combatants) if (c.defId === 'mage' && !c.skills.includes('mana_barrier')) c.skills.push('mana_barrier');
  return b;
}

/** Mage birimine eski Spell Echo pasifini (verilen şansla) takar. */
export function giveSpellEcho(b: Battle, uid: string, chance = 0.25): void {
  const c = b.get(uid)!;
  c.passive = { id: 'spell_echo', name: 'Spell Echo', icon: 'echo', text: 'Damaging spells with a cooldown have a chance to be ready again immediately.', effect: { type: 'spellEcho', chance } };
}
