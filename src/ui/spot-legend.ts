/**
 * Dizilim tahtası renk açıklaması: tahtadaki hücre noktalarının anlamı (yeşil iyi yer / turuncu önde açıkta / kırmızı menzil dışı).
 * Tek bileşen (Ömer 2026-11-10, docs/design/ui-design-language.md 4.6): sefer Formation penceresi ve Endless seçimi hep gösterir,
 * Quick Battle / Multiplayer tahtanın altında yalnızca hücre üstüne gelince ya da kahraman sürüklenirken gösterir (src/game/board-legend.ts).
 * Renkler motorun uygunluk ipucundan (tahta noktalarıyla aynı üç renk).
 */
import './spot-legend.css';

const SPOTS: Array<[color: string, label: string, hint: string]> = [
  ['#8fc65a', 'Good spot', 'Good spot: reaches the enemy from here'],
  ['#e0a43a', 'Exposed in front', 'Exposed in front: weaker spot'],
  ['#e8806a', 'Out of reach', 'Out of reach: cannot hit the enemy'],
];

/** Tek satır: elmas + etiket, sağa solan altın saç çizgisi (`mirror`: çizgi solda, ayna tahta için). */
export function spotLegendHtml(mirror = false): string {
  const items = SPOTS.map(([c, t, h]) => `<span class="it" title="${h}"><i style="color:${c}"></i><span>${t}</span></span>`).join('');
  return mirror ? `<div class="spot-lg mirror"><span class="ln"></span>${items}</div>` : `<div class="spot-lg">${items}<span class="ln"></span></div>`;
}
