/**
 * Sefer haritası görünümünün saf hesapları (Phaser'sız; test edilir): yakınlaştırma aralığı, kaydırma sınırı (21:9 harita çerçevesi),
 * kaydırma düğmelerinin etkinliği, tekerlek / trackpad girdisinin yorumu. Sahne: src/game/scenes/CampaignMapScene.ts.
 */

/** Harita yakınlaştırması (Ömer 2026-10-09: küçük bir aralık). Kameranın gerçek yakınlaştırması bunun render ölçeğiyle çarpımı. */
export const MAP_ZOOM = { min: 1, max: 1.4, step: 0.1 } as const;

export const clampZoom = (z: number): number => Math.min(MAP_ZOOM.max, Math.max(MAP_ZOOM.min, Math.round(z * 100) / 100));

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface View {
  /** Görünen dünya genişliği / yüksekliği (tuval / gerçek yakınlaştırma). */
  w: number;
  h: number;
}

/** Kamera ortasının gidebileceği aralık: görünüm çerçeveden asla taşmaz; çerçeveden genişse ortada sabit kalır. */
export function midLimits(b: Bounds, v: View): { minX: number; maxX: number; minY: number; maxY: number } {
  const cx = (b.left + b.right) / 2;
  const cy = (b.top + b.bottom) / 2;
  const fx = v.w >= b.right - b.left;
  const fy = v.h >= b.bottom - b.top;
  return {
    minX: fx ? cx : b.left + v.w / 2,
    maxX: fx ? cx : b.right - v.w / 2,
    minY: fy ? cy : b.top + v.h / 2,
    maxY: fy ? cy : b.bottom - v.h / 2,
  };
}

/** Kamera ortasını çerçeveye kısar. */
export function clampMid(mid: { x: number; y: number }, b: Bounds, v: View): { x: number; y: number } {
  const l = midLimits(b, v);
  return { x: Math.min(l.maxX, Math.max(l.minX, mid.x)), y: Math.min(l.maxY, Math.max(l.minY, mid.y)) };
}

/** Hangi yöne kaydırılabilir (◂ ▸ düğmeleri, ok tuşları); 1 px tolerans. */
export function canPan(mid: { x: number; y: number }, b: Bounds, v: View): { left: boolean; right: boolean; up: boolean; down: boolean } {
  const l = midLimits(b, v);
  return { left: mid.x > l.minX + 1, right: mid.x < l.maxX - 1, up: mid.y > l.minY + 1, down: mid.y < l.maxY - 1 };
}

/**
 * Tekerlek / trackpad (Ömer 2026-10-11): fare tekerleği YAKINLAŞTIRIR (yukarı = yakın), Ctrl + tekerlek (trackpad sıkıştırması) de; yalnızca
 * belirgin yatay hareket (trackpad iki parmak sağa-sola, Shift + tekerlek) kaydırır. Sayfa kaymaz (sahne olayı yutar).
 */
export function wheelAction(e: { dx: number; dy: number; ctrl: boolean }, _room: { vertical: boolean } = { vertical: false }): { zoom: number; panX: number; panY: number } {
  if (e.ctrl || Math.abs(e.dy) >= Math.abs(e.dx)) return { zoom: e.dy < 0 ? MAP_ZOOM.step : e.dy > 0 ? -MAP_ZOOM.step : 0, panX: 0, panY: 0 };
  return { zoom: 0, panX: e.dx, panY: 0 };
}

/**
 * İmlece doğru yakınlaştırma: imlecin altındaki dünya noktası (`cursor`) ekranda yerinde kalır. `offset` = imlecin görünüm ortasına göre
 * EKRAN pikseli (tuval), `camZoom` = yeni gerçek yakınlaştırma. Sonuç kamera ortası, çerçeveye kısılı (kaydırma gibi sınırda durur).
 */
export function zoomTowardMid(cursor: { x: number; y: number }, offset: { x: number; y: number }, camZoom: number, b: Bounds, v: View): { x: number; y: number } {
  return clampMid({ x: cursor.x - offset.x / camZoom, y: cursor.y - offset.y / camZoom }, b, v);
}

/**
 * Dünya noktası -> sahne (#stage) yerel CSS pikseli (start-battle kartının halkası / ok ucu; Ömer 2026-10-18 hata: halka boş yerdeydi).
 * `cam`: ana kamera (merkezden yakınlaşır: ekran = (dünya - scroll - genişlik/2) * zoom + genişlik/2, tuval pikseli).
 * `canvas`: tuvalin sahne içindeki CSS kutusu (#game ofseti + Phaser FIT ortalama payı; dar/geniş pencerede tuval ortalanır, kenarda
 * siyah bant kalır) ve tuvalin piksel boyu. Nokta tuvalin dışındaysa null (kart ortalanır).
 */
export function worldToStageCss(
  p: { x: number; y: number },
  cam: { scrollX: number; scrollY: number; zoom: number; width: number; height: number },
  canvas: { left: number; top: number; cssW: number; cssH: number; pxW: number; pxH: number },
): { x: number; y: number } | null {
  const sx = (p.x - cam.scrollX - cam.width / 2) * cam.zoom + cam.width / 2;
  const sy = (p.y - cam.scrollY - cam.height / 2) * cam.zoom + cam.height / 2;
  if (sx < 0 || sy < 0 || sx > canvas.pxW || sy > canvas.pxH) return null;
  return { x: canvas.left + (sx * canvas.cssW) / (canvas.pxW || 1), y: canvas.top + (sy * canvas.cssH) / (canvas.pxH || 1) };
}
