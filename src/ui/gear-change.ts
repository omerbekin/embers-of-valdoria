// Gear'da sefer durumu değişti (skill puanı, stat puanı, eşya giyme / çıkarma / yer değiştirme / atma, Respec malzemesi) haberi.
// Ömer 2026-11-21: bu değişiklikler otomatik kayda girsin. UI oyun katmanını çağırmaz; oyun tarafı (src/game/campaign-session.ts) dinleyici kaydeder.
let listener: (() => void) | null = null;

/** Tek dinleyici (en son kaydeden geçerli). */
export function onGearChange(fn: (() => void) | null): void {
  listener = fn;
}

export function gearChanged(): void {
  listener?.();
}
