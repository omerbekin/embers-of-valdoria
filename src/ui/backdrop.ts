// Oyun geneli kural (Ömer 2026-10-09; CLAUDE.md > Geri / Menu kuralı): pencereler (Gear, Menu, kahraman paneli, Formation, yuva tarayıcısı...)
// panelin DIŞINA, kararan zemine tıklanınca / dokununca kapanır. Zorunlu seçimler ve onay pencereleri kapanmaz (onayda en çok "Cancel").
// Basış panelin içinde başlayıp dışarıda bırakılırsa (sürükleme) kapanmaz: hem basış hem bırakış zeminde olmalı.

/** DOM penceresi: `overlay` kararan zemin, `panel` içerik kutusu (ya da "bu hedef panelin içinde mi" sınaması). Kaldırma işlevi döner. */
export function dismissOnBackdrop(overlay: HTMLElement, panel: HTMLElement | ((t: Node) => boolean), onDismiss: () => void): () => void {
  // Köşe düğmeleri (X / Menu / tam ekran = .nav-btn) örtünün çocuğu ama panelin dışında: bunlara basış "zemin dokunuşu" SAYILMAZ. Aksi halde
  // X'e dokununca pencere pointerup'ta kapanır, düğme yer değiştirir ve ardından gelen click alttaki (tam ekran) düğmeye düşerdi (Ömer 2026-10-19).
  const inside = (t: EventTarget | null): boolean => {
    if (!(t instanceof Node)) return false;
    if (t instanceof Element && t.closest('.nav-btn')) return true;
    // Panelin dışında ama örtünün çocuğu olan açık ipuçları (skill ağacı önizlemesi + / − düğmeleri) zemin sayılmaz
    if (t instanceof Element && t.closest('.tt-tip')) return true;
    return typeof panel === 'function' ? panel(t) : panel.contains(t);
  };
  let downOutside = false;
  const onDown = (e: PointerEvent): void => {
    downOutside = !inside(e.target) && overlay.contains(e.target as Node);
  };
  const onUp = (e: PointerEvent): void => {
    const ok = downOutside && !inside(e.target) && overlay.contains(e.target as Node);
    downOutside = false;
    if (ok) onDismiss();
  };
  overlay.addEventListener('pointerdown', onDown);
  overlay.addEventListener('pointerup', onUp);
  return () => {
    overlay.removeEventListener('pointerdown', onDown);
    overlay.removeEventListener('pointerup', onUp);
  };
}

/** Phaser penceresi için saf karar: basış ve bırakış ikisi de panel dikdörtgeninin dışındaysa zemin dokunuşudur. */
export function isBackdropTap(down: { x: number; y: number } | null, up: { x: number; y: number }, rect: { x: number; y: number; w: number; h: number }): boolean {
  const out = (p: { x: number; y: number }) => p.x < rect.x || p.x > rect.x + rect.w || p.y < rect.y || p.y > rect.y + rect.h;
  return !!down && out(down) && out(up);
}
