/**
 * Sağ tık (Ömer 2026-10-23): tarayıcının bağlam menüsü oyunda hiç açılmaz; sağ tıkın oyun anlamı vardır
 * (savaşta birim kartı / iptal, item ekranlarında hızlı kuşan; ilgili yerler kendi dinleyicilerini taşır).
 * Metin girişlerinde (lobi kodu vb.) menü açık kalır: yapıştırma çalışsın.
 */

/** Bu öğede tarayıcı bağlam menüsü açık kalmalı mı (metin girişi / textarea / contenteditable)? */
export function keepsNativeMenu(el: { tagName?: string; isContentEditable?: boolean; closest?: (s: string) => unknown } | null): boolean {
  if (!el) return false;
  const tag = (el.tagName ?? '').toUpperCase();
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const type = String((el as { type?: string }).type ?? 'text').toLowerCase();
    return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'image', 'file', 'color'].includes(type);
  }
  if (el.isContentEditable) return true;
  return !!el.closest?.('[contenteditable=""],[contenteditable="true"]');
}

/** Belge düzeyinde bağlam menüsü engeli (bir kez). Yerel dinleyiciler (preventDefault) ayrıca çalışmaya devam eder. */
export function installContextMenuBlock(doc: Document = document): void {
  doc.addEventListener('contextmenu', (e) => {
    if (keepsNativeMenu(e.target as HTMLElement | null)) return;
    e.preventDefault();
  });
}

let battleRight = false;

/** Savaş sahnesi sağ tuşu Phaser'a iletmek ister (yalnızca savaşta; diğer sahnelerde sağ/orta tuş Phaser'a hiç ulaşmaz). */
export function setPhaserRightClick(on: boolean): void {
  battleRight = on;
}

/** Bir fare düğmesi olayı Phaser'a verilsin mi? Sol her zaman; sağ yalnızca savaşta; orta asla. */
export function phaserAcceptsButton(button: number): boolean {
  return button === 0 || (button === 2 && battleRight);
}

interface InputManagerLike {
  onMouseDown: (e: MouseEvent) => void;
  onMouseUp: (e: MouseEvent) => void;
}

/** Phaser girişine sarmal: sağ/orta fare düğmesi sol tık eylemlerini tetiklemesin (sağ tık savaşta kendi işine sahiptir). */
export function installPhaserButtonFilter(game: { input: unknown }): void {
  const im = game.input as InputManagerLike;
  for (const k of ['onMouseDown', 'onMouseUp'] as const) {
    const orig = im[k].bind(im);
    im[k] = (e: MouseEvent) => {
      if (!phaserAcceptsButton(e.button)) return;
      orig(e);
    };
  }
}
