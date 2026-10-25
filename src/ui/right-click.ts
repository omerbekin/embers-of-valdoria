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

/**
 * Savaşta boş yere sağ tık sırası: seçili bir şey (taşıma / mod paneli / skill-hedef seçimi) varsa bu tık YALNIZCA onu iptal eder,
 * açık kart bir sonraki sağ tıkta kapanır; hiçbir şey seçili değilse kart kapanır.
 */
export function rightClickAction(hasSelection: boolean): 'cancel-selection' | 'close-cards' {
  return hasSelection ? 'cancel-selection' : 'close-cards';
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
  onTouchStart: (e: TouchEvent) => void;
}

/**
 * Tuvalde başlamayan basış Phaser'a ulaşmaz (Harita 2 hata avı 2026-10-25). Phaser fare / dokunma basışını ve bırakmasını window üzerinden de
 * dinler ve DOM öğesinin (debug menüsü Close, Formation, tam ekran, pencere zemini) üstündeki tıklamayı alttaki Phaser nesnesine de verir: debug
 * menüsünü kapatan tık sefer haritasında üstteki bölge adına düşüp haritayı habersizce uzak görünüme atıyordu. Kural: basış tuvalde değilse
 * basış da, eşleşen fare bırakması da atılır; tuvalde başlayıp dışarıda biten sürükleme bırakması geçer. Dokunma: başladığı öğe tuval değilse atılır
 * (dokunmanın sonraki olayları aynı öğeye gider; Phaser bilinmeyen parmağın bırakmasını yok sayar).
 */
export function createPressGate(isCanvas: (t: EventTarget | null) => boolean): { down(t: EventTarget | null): boolean; up(): boolean; touchStart(t: EventTarget | null): boolean } {
  let outside = false;
  return {
    down(t) {
      outside = !isCanvas(t);
      return !outside;
    },
    up() {
      const ok = !outside;
      outside = false;
      return ok;
    },
    touchStart: (t) => isCanvas(t),
  };
}

/**
 * Phaser girişine sarmal: sağ/orta fare düğmesi sol tık eylemlerini tetiklemesin (sağ tık savaşta kendi işine sahiptir); tuvalde başlamayan
 * basış (DOM öğesi üstünde) Phaser'a geçmesin (createPressGate).
 */
export function installPhaserButtonFilter(game: { input: unknown; canvas?: HTMLCanvasElement | null }): void {
  const im = game.input as InputManagerLike;
  const gate = createPressGate((t) => !game.canvas || t === game.canvas);
  const down = im.onMouseDown.bind(im);
  im.onMouseDown = (e: MouseEvent) => {
    if (!phaserAcceptsButton(e.button)) return;
    if (!gate.down(e.target)) return;
    down(e);
  };
  const up = im.onMouseUp.bind(im);
  im.onMouseUp = (e: MouseEvent) => {
    if (!phaserAcceptsButton(e.button)) return;
    if (!gate.up()) return;
    up(e);
  };
  const touch = im.onTouchStart?.bind(im);
  if (touch) im.onTouchStart = (e: TouchEvent) => gate.touchStart(e.target) && touch(e);
}
