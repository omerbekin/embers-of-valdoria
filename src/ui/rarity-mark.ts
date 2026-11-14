// Rarity yalniz renkle degil, sekil + harfle de gosterilir (Settings > Accessibility > Colorblind support; `html.cb` iken gorunur).
// Common = daire C, Uncommon = kare U, Rare = elmas R, Epic = ucgen E, Legendary = yildiz L. Stil: a11y.css.
import './a11y.css';

export const RARITY_LETTER: Record<string, string> = { common: 'C', uncommon: 'U', rare: 'R', epic: 'E', legendary: 'L' };

/** Kartin kosesine eklenecek isaret (renk korlugu kapaliyken CSS ile gizli). */
export function rarityMark(rarity: string): HTMLElement {
  const m = document.createElement('span');
  m.className = `rar-mark rm-${rarity}`;
  m.textContent = RARITY_LETTER[rarity] ?? '';
  m.setAttribute('aria-hidden', 'true');
  return m;
}
