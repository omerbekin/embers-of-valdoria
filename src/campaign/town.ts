import { node } from './graph';
import { mapOf, nextStep } from './state';
import type { CampaignState, MapNode, NextStep, TownHotspot, TownSceneDef } from './types';

/**
 * Kasaba ekranı (Ömer 2026-10-12, future-ideas "SIRADA" (1)): saf kurallar ve geometri. Çizim src/game/town-screen.ts'te.
 * Arka plan görünür alanı "cover" ile doldurur (oran korunur, taşan kısım kırpılır); yerler (hotspot) görselin oranıyla tanımlıdır, böylece
 * görsel hangi ekranda nasıl ölçeklenirse ölçeklensin yerler resimdeki nesnenin üstünde kalır.
 */

/** Düğümün kasaba ekranı (yalnızca kasaba düğümünde ve verisi varsa). */
export function townScene(n: MapNode): TownSceneDef | null {
  return n.type === 'town' && n.scene?.hotspots?.length ? n.scene : null;
}

/** Kasaba ekranının arkasında açıldığı adımlar: veda, yeni bölük, hikâye sahnesi (ilk giriş akışı ekranın üstünde oynar) ve kasabanın kendisi. */
const TOWN_STEPS: ReadonlyArray<NextStep['kind']> = ['farewell', 'company', 'story', 'town'];

/** Şu an kasaba ekranı görünmeli mi: görünecekse kasaba düğümünün id'si, yoksa null. */
export function townScreenNode(s: CampaignState): string | null {
  const n = node(mapOf(s), s.at);
  if (!townScene(n)) return null;
  return TOWN_STEPS.includes(nextStep(s).kind) ? n.id : null;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Görselin ekrandaki yeri: sol üst köşe + ölçek (cover). */
export interface Cover {
  x: number;
  y: number;
  scale: number;
  w: number;
  h: number;
}

/**
 * "Cover" yerleşimi: `img` boyutundaki görsel `view` alanını boşluksuz doldurur. Yatayda ortalanır; dikeyde `focusY` (görselin 0-1 satırı)
 * mümkün olduğunca görünür alanın aynı oranına gelir, kenar taşmaz.
 */
export function townCover(img: { w: number; h: number }, view: Rect, focusY = 0.5): Cover {
  const scale = Math.max(view.w / img.w, view.h / img.h);
  const w = img.w * scale;
  const h = img.h * scale;
  const x = view.x + (view.w - w) / 2;
  const fy = Math.min(1, Math.max(0, focusY));
  const y = Math.min(view.y, Math.max(view.y + view.h - h, view.y + view.h * fy - h * fy));
  return { x, y, scale, w, h };
}

/** Yerin ekrandaki dikdörtgeni (görselle birlikte ölçeklenir). */
export function hotspotRect(h: TownHotspot, c: Cover): Rect {
  const [x0, y0, x1, y1] = h.rect;
  return { x: c.x + x0 * c.w, y: c.y + y0 * c.h, w: (x1 - x0) * c.w, h: (y1 - y0) * c.h };
}

/** Ekrandaki noktanın üstündeki yer (üst üste binerse listede SONRAKİ kazanır, çizim sırası gibi). */
export function hotspotAt(def: TownSceneDef, c: Cover, px: number, py: number): TownHotspot | null {
  let hit: TownHotspot | null = null;
  for (const h of def.hotspots) {
    const r = hotspotRect(h, c);
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) hit = h;
  }
  return hit;
}

/** Bu kasabada eylemin karşılığı var mı (tezgâh: tüccarlı kasaba; hikâye NPC'si: hikâyesi olan kasaba). Yoksa yer ekranda gösterilmez. */
export function hotspotOffered(n: MapNode, h: TownHotspot): boolean {
  if (h.action === 'trade') return !!n.merchant;
  if (h.action === 'story') return !!n.story;
  return true;
}

/**
 * Takımın kasaba ekranındaki yerleri (1920 genişlikte ortalı): n kahraman `gap` aralıkla, ayaklar `feetY`. Merkezler soldan sağa.
 */
export function partySpots(n: number, o: { cx: number; feetY: number; gap: number }): Array<{ x: number; y: number }> {
  return Array.from({ length: n }, (_, i) => ({ x: o.cx + (i - (n - 1) / 2) * o.gap, y: o.feetY }));
}
