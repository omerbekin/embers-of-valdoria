/**
 * Telefon boyu efekt çarpanı (Ömer'in "telefonda küçük" şikâyeti, r45): sahne 1920x1080'den ~0,35-0,52 oranında küçüldüğü için
 * okunması gereken nesneler (zar noktası, buz kraterinin halkası) telefonda 20-30 piksele düşüyordu. Kısa ekranda (`html.short`,
 * telefon yatay / dikey) bu nesneler büyür; masaüstünde ve 21:9'da çarpan 1 = efekt bayt bayt eskisi. DOM yoksa (Node testi) 1.
 */
export const PHONE_FX_K = 1.5;

export function phoneFxK(): number {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('short') ? PHONE_FX_K : 1;
}
