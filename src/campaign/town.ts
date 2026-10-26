import { node } from './graph';
import { SMITH } from './smith';
import { isDone, mapOf, nextStep } from './state';
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

/**
 * Kasabanın hikâyesi dinlendi mi (Ömer 2026-10-23: hikâye bir kez; Ashford Charcoal Burner, Valdren Keep Commander)? Kayıttaki `done` listesinden
 * (`<düğüm>:story`, ya da kasaba adımı bitmişse): yeni alan yok, eski kayıtlarda da doğru okunur. Hikâyesiz kasaba: false.
 */
export const storyHeard = (s: Pick<CampaignState, 'done'>, n: MapNode): boolean => !!n.story && isDone(s as CampaignState, n.id, 'story');

/**
 * Bu kasabada eylemin karşılığı var mı (tezgâh: tüccarlı kasaba; hikâye NPC'si: hikâyesi olan kasaba ve hikâye henüz dinlenmemişse). Yoksa yer
 * ekranda gösterilmez. `s` verilirse dinlenmiş hikâyenin NPC'si kaldırılır (Ömer 2026-10-23: hikâye tekrar oynamaz).
 */
export function hotspotOffered(n: MapNode, h: TownHotspot, s?: Pick<CampaignState, 'done'>): boolean {
  if (h.hidden) return false;
  if (h.action === 'trade') return !!n.merchant;
  if (h.action === 'story') return !!n.story && !(s && storyHeard(s, n));
  if (h.action === 'rest') return false; // ESKİ ateş başı (2026-10-26 kalktı; yerine Inn)
  return true;
}

/**
 * Takımın kasaba ekranındaki yerleri (1920 genişlikte ortalı): n kahraman `gap` aralıkla, ayaklar `feetY`. Merkezler soldan sağa.
 */
export function partySpots(n: number, o: { cx: number; feetY: number; gap: number }): Array<{ x: number; y: number }> {
  return Array.from({ length: n }, (_, i) => ({ x: o.cx + (i - (n - 1) / 2) * o.gap, y: o.feetY }));
}

/**
 * Kasabadaki i. kahramanın bekleme animasyonu hangi kareden başlasın (yan yana duranlar aynı anda kıpırdamasın). Kare sayısını AŞMAZ:
 * çoğu sınıfın bekleme görseli TEK karedir; eskiden `i % 2` verilirdi ve ikinci kahramanda Phaser var olmayan 2. kareyi okuyup hata
 * fırlatıyordu (0.7.7 Ashford donması: hata oyun döngüsünü durdurdu; yeniden açılışta kasaba yarım çizildi, Farewell penceresi ve Menu yoktu).
 */
export function idleStartFrame(index: number, totalFrames: number): number {
  const n = Math.floor(totalFrames);
  return n > 1 ? Math.abs(Math.floor(index)) % n : 0;
}

// ---------------------------------------------------------------- ESKİ kasaba dinlenmesi (ateş başı; Ömer 2026-10-26'da kalktı, yerine Inn)

/**
 * ESKİ (ateş başı dinlenme kalktı, Ömer 2026-10-26 form econ/main; yerine Inn: state.ts > leaveAtInn). Kasaba ekranı / harita kartı (ui-dev)
 * güncellenene dek derlensin diye duruyor: eski kayıttaki sayacı okur, artık yazılmaz. @deprecated
 */
export function townRestCount(s: Pick<CampaignState, 'townRests'>, nodeId: string): number {
  const v = s.townRests?.[nodeId];
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** ESKİ (ateş başı dinlenme kalktı, 2026-10-26): fiyat yok, 0 döner. @deprecated */
export function townRestPrice(_s: Pick<CampaignState, 'townRests' | 'roster' | 'active'>, _nodeId: string): number {
  return 0;
}

/** ESKİ (ateş başı dinlenme kalktı, 2026-10-26): hiçbir şey yapmaz, durum aynen döner (iyileşme: Inn, kamp, Valor). @deprecated */
export function restInTown(s: CampaignState, _nodeId: string = s.at): CampaignState {
  return s;
}

// ---------------------------------------------------------------- demirci yeri (TUR 1 madde 7)

/** Kasabada demirci var mı (Ömer 2026-10-26: 2. kasabadan itibaren; Ashford `smith: false`). */
export const townHasSmith = (n: MapNode): boolean => n.type === 'town' && n.smith !== false;

/**
 * Kasabanın demirci yeri (campaign.json > blacksmith.hotspots[kasaba görseli]); kasaba değilse ya da demircisi yoksa (Ashford) null. Yer yoksa
 * rect'siz (ekran kenarında plaka).
 */
export function smithHotspot(n: MapNode): TownHotspot | null {
  if (!townHasSmith(n)) return null;
  const h = n.scene ? SMITH.hotspots?.[n.scene.background] : undefined;
  return { id: 'blacksmith', action: 'smith', label: h?.label ?? 'Blacksmith', rect: h?.rect ?? [0, 0, 0, 0] };
}

/** Kasabanın Inn yeri (veride action 'inn' olan yer; Ömer 2026-10-26: her kasabada Inn). Kasaba değilse ya da veride yoksa null. */
export const innHotspot = (n: MapNode): TownHotspot | null => (n.type === 'town' ? (n.scene?.hotspots.find((h) => h.action === 'inn') ?? null) : null);
