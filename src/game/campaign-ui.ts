import { textRes } from './stage-view';
import Phaser from 'phaser';
import { EL } from './elegant-ui';
import { BODY_FONT } from '../ui/menu-style';
import { openMapDialog } from '../ui/map-confirm';

/**
 * Sefer ekranlarının ortak parçaları (ana menü ve harita): pencere (modal), sınıf kartı, can çubuğu, taç.
 * Görünüm tasarım kitidir (src/game/elegant-ui.ts; CLAUDE.md > Tasarım kiti): ince çerçeveli koyu panel, altın Cinzel başlık,
 * EB Garamond metin, kit düğmeleri. Her parça verilen `layer` container'ına eklenir (harita sahnesinde arayüz kamerası katmanı).
 */

export const W = 1920;
export const H = 1080;

export interface ModalButton {
  label: string;
  primary?: boolean;
  run: () => void;
}

export interface Modal {
  root: Phaser.GameObjects.Container;
  close: () => void;
  /** İçerik alanı (pencere içi, başlık ve düğmeler hariç). */
  area: { x: number; y: number; w: number; h: number };
}

/** Ortalanmış, sarılmış gövde metni (EB Garamond). */
export function bodyText(scene: Phaser.Scene, x: number, y: number, text: string, width: number, size = 25, color: string = EL.NOTE): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: BODY_FONT, fontSize: `${size}px`, color, wordWrap: { width, useAdvancedWrap: true }, align: 'center', lineSpacing: 4 })
    .setResolution(textRes())
    .setShadow(0, 2, EL.SH_DARK, 4, false, true)
    .setOrigin(0.5, 0);
}

/**
 * Ortada pencere (Ömer 2026-11-11, "B" seçildi): haritanın eski onay / kart pencereleri artık DOM Diyalog (`src/ui/map-confirm.ts`, Cloud / hesap
 * pencereleriyle AYNI kod): kutulu X, düğmeler sağda (birincil en sağda). `width` / `height` / `y` / `dim` / `fit` artık kullanılmaz (pencere içeriğe göre boyutlanır).
 * Zemine dokunma: `onDismiss` verilirse kapatır; zorunlu seçimlerde verilmez.
 */
export function openModal(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  o: {
    title: string;
    subtitle?: string;
    text?: string;
    width?: number;
    height?: number;
    buttons?: ModalButton[];
    dim?: number;
    y?: number;
    fit?: boolean;
    /** Zemine (panelin dışına) dokununca / X / Esc: pencereyi kapatan işlev. Verilmezse zorunlu seçimdir. */
    onDismiss?: () => void;
    /** false = onDismiss verilse de zemine dokunmak kapatmaz (varsayılan true). */
    dismissOnBackdrop?: boolean;
    /** Başlığın altında kahraman yüzleri (Farewell). */
    faces?: Array<{ spriteId: string; name: string; color?: string }>;
  },
): Modal {
  return openMapDialog(scene, layer, o);
}

/** İnce can çubuğu (0-1): savaştaki can çubuğuyla AYNI görünüm (Ömer 2026-11-11): koyu kahve zemin, ince soluk altın çerçeve, soldan sağa koyu -> açık yeşil dolgu (battle-hud.css > .bh-hpmp .bh-bar.hp). */
export function hpBar(scene: Phaser.Scene, x: number, y: number, w: number, h: number, ratio: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const r = Phaser.Math.Clamp(ratio, 0, 1);
  g.fillStyle(0x1d150d, 1).fillRect(x, y, w, h);
  if (r > 0) g.fillGradientStyle(0x4f9a32, 0x7fbf3f, 0x4f9a32, 0x7fbf3f, 1).fillRect(x + 1, y + 1, Math.max(2, (w - 2) * r), h - 2);
  g.lineStyle(1, 0xd9b26a, 0.22).strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  return g;
}

/** Küçük taç (lider işareti), merkez (cx, cy): ince altın çizgi + kor taş. */
export function crown(scene: Phaser.Scene, cx: number, cy: number, s = 1): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const pts = [-14, 8, -14, -6, -7, 1, 0, -10, 7, 1, 14, -6, 14, 8].map((v) => v * s);
  const p = Array.from({ length: pts.length / 2 }, (_, i) => new Phaser.Math.Vector2(cx + pts[i * 2]!, cy + pts[i * 2 + 1]!));
  g.fillStyle(0x2a1d10, 0.95).fillPoints(p, true);
  g.lineStyle(1.5, EL.ON_N, 1).strokePoints(p, true);
  g.fillStyle(EL.EMBER, 1).fillCircle(cx, cy + 3 * s, 2.5 * s);
  return g;
}

/**
 * Yara bölümü (Ömer 2026-10-23, V1 "Scar + dots"): HP çubuğunun sağ ucunda koyu kırmızı taralı bölüm (x, y, w, h = bölümün kutusu), sol kenarı çentikli.
 * Kısa süre solarak belirir (`fadeMs` 0 = anında). DOM eşi: src/ui/wound-ui.css > .wd-scar.
 */
export function woundScar(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fadeMs: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x1e0a08, 0.95).fillRect(x, y, w, h);
  g.lineStyle(1.5, 0xbe3c2c, 0.5);
  const step = 5;
  const slant = h * 0.5;
  for (let k = -slant; k < w; k += step) {
    // çizgi (x+k, y+h) -> (x+k+slant, y), kutuya kırpılmış
    let ax = k;
    let ay = h;
    let bx = k + slant;
    let by = 0;
    if (ax < 0) {
      ay = h - (-ax / slant) * h;
      ax = 0;
    }
    if (bx > w) {
      by = ((bx - w) / slant) * h;
      bx = w;
    }
    if (bx <= 0 || ax >= w) continue;
    g.lineBetween(x + ax, y + ay, x + bx, y + by);
  }
  g.fillStyle(0xc8503c, 0.75).fillRect(x, y, 2, h);
  if (fadeMs > 0) {
    g.setAlpha(0);
    scene.tweens.add({ targets: g, alpha: 1, duration: fadeMs, ease: EL.EASE });
  }
  return g;
}

/** Elmas noktalar (toplam = ölümcül sınır; dolu = yara); (x, y) = ilk noktanın merkezi; toplam genişliği döndürür. DOM eşi: wound-ui.ts > woundPipsEl. */
export function woundPips(scene: Phaser.Scene, x: number, y: number, wounds: number, total: number): { g: Phaser.GameObjects.Graphics; width: number } {
  const g = scene.add.graphics();
  const r = 6;
  const gap = 17;
  for (let i = 0; i < total; i++) {
    const cx = x + i * gap;
    const pts = [new Phaser.Math.Vector2(cx, y - r), new Phaser.Math.Vector2(cx + r, y), new Phaser.Math.Vector2(cx, y + r), new Phaser.Math.Vector2(cx - r, y)];
    if (i < wounds) {
      g.fillStyle(wounds >= total ? 0xe8806a : 0xb8402c, 1).fillPoints(pts, true).lineStyle(1.5, 0xe8806a, 1).strokePoints(pts, true);
      g.lineStyle(1.5, 0x1a0705, 1).lineBetween(cx + 1, y - r + 2, cx - 1, y + r - 2);
    } else g.lineStyle(1.5, EL.GOLD, 0.45).strokePoints(pts, true);
  }
  return { g, width: (total - 1) * gap + 2 * r };
}
