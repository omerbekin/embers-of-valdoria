import { CONFIG } from './data';
import { node } from './graph';
import { SMITH } from './smith';
import { clearWounds, isDone, isFallen, mapOf, nextStep } from './state';
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

// ---------------------------------------------------------------- kasabada dinlenme (Ömer 2026-10-18, ilerleme TUR 1 madde 10)

/** Bu kasabada kaç kez dinlenildi (kayıtta townRests; bozuk / yok = 0). */
export function townRestCount(s: Pick<CampaignState, 'townRests'>, nodeId: string): number {
  const v = s.townRests?.[nodeId];
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** Dinlenme fiyatının level'ı: aktif takımın (dizilimdeki, düşmüşler dahil) ortalama level'ı, yuvarlanmış; takım yoksa 1. */
export function restPriceLevel(s: Pick<CampaignState, 'roster' | 'active'>): number {
  const ids = new Set((s.active ?? []).filter(Boolean));
  const team = (s.roster ?? []).filter((h) => ids.has(h.id));
  if (!team.length) return 1;
  return Math.max(1, Math.round(team.reduce((a, h) => a + (h.level ?? 1), 0) / team.length));
}

/**
 * Kasabada sıradaki dinlenmenin fiyatı: ilk dinlenme bedava (0), sonrakiler campaign.json > rest.price: base + perLevel x (L - 1), L = takımın
 * ortalama level'ı (restPriceLevel; Ömer 2026-10-26: 15 + 15 x level, L1 = 30). Yuvarlanır.
 */
export function townRestPrice(s: Pick<CampaignState, 'townRests' | 'roster' | 'active'>, nodeId: string): number {
  if (townRestCount(s, nodeId) === 0) return 0;
  const p = CONFIG.rest.price;
  return Math.max(0, Math.round(p.base + p.perLevel * (restPriceLevel(s) - 1)));
}

/** Kasaba dinlenmesinin can oranı (düğümün heal'i; yoksa tam). */
export const townRestHeal = (n: MapNode): number => Math.max(0, Math.min(1, n.heal ?? 1));

/**
 * Kasabada dinlen (ateş başı): yaşayanlar kasabanın heal oranına (tam) iyileşir; düşmüşler KALKMAZ (diriltme yalnızca Valor). İlk dinlenme bedava,
 * sonrakiler ücretli; sayaç kasaba başına. Kasaba değilse ya da altın yetmezse Error. Saf: yeni durum döner.
 */
export function restInTown(s: CampaignState, nodeId: string = s.at): CampaignState {
  const n = node(mapOf(s), nodeId);
  if (n.type !== 'town') throw new Error('You can only rest like this in a town');
  const price = townRestPrice(s, nodeId);
  if (s.gold < price) throw new Error(`Need ${price - s.gold} more gold`);
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  const heal = townRestHeal(n);
  for (const h of t.roster) if (!isFallen(h)) h.hpRatio = Math.round(Math.max(h.hpRatio, heal) * 1000) / 1000;
  clearWounds(t); // kasaba dinlenmesi yaraları siler (Ömer 2026-10-19; kamp silmez)
  t.gold -= price;
  t.townRests = { ...(t.townRests ?? {}), [nodeId]: townRestCount(s, nodeId) + 1 };
  return t;
}

// ---------------------------------------------------------------- demirci yeri (TUR 1 madde 7)

/** Kasabanın demirci yeri (campaign.json > blacksmith.hotspots[kasaba görseli]); kasaba değilse null. Yer yoksa rect'siz (ekran kenarında plaka). */
export function smithHotspot(n: MapNode): TownHotspot | null {
  if (n.type !== 'town') return null;
  const h = n.scene ? SMITH.hotspots?.[n.scene.background] : undefined;
  return { id: 'blacksmith', action: 'smith', label: h?.label ?? 'Blacksmith', rect: h?.rect ?? [0, 0, 0, 0] };
}
