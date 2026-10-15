/**
 * Sefer haritası sis bulutlarının yerleşimi (saf, testli; Ömer 2026-10-14 telefon testi):
 * gidilebilecek her düğüm, adı/alt yazısı ve oraya giden yol ASLA bulutla örtülmez. Bulut parçaları
 * (sisli / hedef / kapalı düğümün çevresinde 3 parça) açık alanlara (dikdörtgen) değiyorsa uzağa itilir,
 * gerekirse küçültülür, hiç sığmıyorsa çizilmez. Sis görünür menzilin ötesinde başlar.
 */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Puff {
  x: number;
  y: number;
  sx: number;
  sy: number;
  /** Parçanın yatay salınım yönü (+1 / -1), yalnızca sunum. */
  drift: number;
}

/** Bulut dokusu 256x160; görünür kısmın yarı genişlik/yüksekliği (ölçek 1'de) + yatay salınım payı. */
export const CLOUD_HALF = { w: 128 * 0.85, h: 80 * 0.85 };
export const CLOUD_DRIFT = 26;
const PUSH_STEP = 16;
const PUSH_MAX = 260;
const SHRINKS = [1, 0.8, 0.62, 0.45];

/** Elips (bulut parçası, salınım payı dahil) bir dikdörtgene değiyor mu? */
export function puffHits(p: Puff, r: Rect): boolean {
  const hw = CLOUD_HALF.w * p.sx + CLOUD_DRIFT;
  const hh = CLOUD_HALF.h * p.sy;
  const cx = Math.max(r.x0, Math.min(p.x, r.x1));
  const cy = Math.max(r.y0, Math.min(p.y, r.y1));
  const dx = (p.x - cx) / hw;
  const dy = (p.y - cy) / hh;
  return dx * dx + dy * dy < 1;
}

/** Bir sisli düğümün ham (itilmemiş) bulut parçaları: kimlikten belirleyici. */
export function basePuffs(id: string, x: number, y: number): Puff[] {
  let h = 0;
  for (const ch of id) h = (h * 17 + ch.charCodeAt(0)) >>> 0;
  return [0, 1, 2].map((k) => ({
    x: x + ((h >> k) % 50) - 25 + (k - 1) * 40,
    y: y + 20 + (k - 1) * 18,
    sx: 1.1 + k * 0.25,
    sy: 0.9 + k * 0.15,
    drift: k % 2 ? 1 : -1,
  }));
}

/**
 * Parçaları açık alanlardan uzaklaştırır: değdiği alanın merkezinden dışarı doğru adım adım itilir (en çok PUSH_MAX),
 * sığmazsa küçültülür, yine sığmazsa atılır. Dönen parçaların hiçbiri açık alana değmez.
 */
export function placePuffs(puffs: Puff[], clear: Rect[]): Puff[] {
  const out: Puff[] = [];
  for (const base of puffs) {
    let placed: Puff | null = null;
    for (const k of SHRINKS) {
      let p: Puff = { ...base, sx: base.sx * k, sy: base.sy * k };
      for (let moved = 0; moved <= PUSH_MAX; moved += PUSH_STEP) {
        const hit = clear.find((r) => puffHits(p, r));
        if (!hit) {
          placed = p;
          break;
        }
        let dx = p.x - (hit.x0 + hit.x1) / 2;
        let dy = p.y - (hit.y0 + hit.y1) / 2;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6) {
          dx = 0;
          dy = 1;
        } else {
          dx /= len;
          dy /= len;
        }
        p = { ...p, x: p.x + dx * PUSH_STEP, y: p.y + dy * PUSH_STEP };
      }
      if (placed) break;
    }
    if (placed) out.push(placed);
  }
  return out;
}

/** Yol örnek noktalarını küçük açık kutulara çevirir (yolun kendisi + biraz pay). */
export function roadRects(pts: { x: number; y: number }[], pad = 14, every = 4): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < pts.length; i += every) {
    const p = pts[i]!;
    out.push({ x0: p.x - pad, y0: p.y - pad, x1: p.x + pad, y1: p.y + pad });
  }
  const last = pts[pts.length - 1];
  if (last) out.push({ x0: last.x - pad, y0: last.y - pad, x1: last.x + pad, y1: last.y + pad });
  return out;
}
