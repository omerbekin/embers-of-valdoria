// Yuva kilitleri ve harita düşüş yasakları (saf; Ömer 2026-11-01, docs/design/progression/item-design-plan.md T5).
// Kaynak veri: düğümde `opensSlot` (Reedgate: Trinket), haritada `noDropSlots` (Harita 1: Trinket), metinler campaign.json > texts.
// Kilit KAYDA YAZILMAZ, ilerlemeden türer: düğüm ziyaret edildiyse ya da takım o haritayı geçtiyse yuva açıktır. Böylece eski kayıt, ışınlanma ve
// serbest dolaşım aynı sonucu verir. `openSlots` yalnızca debug'ın zorla açtığı yuvadır. Endless bu dosyayı kullanmaz: orada hiçbir yuva kilitli değildir.
import type { SlotId, SlotLocks } from '../progression/items';
import { CONFIG, MAPS } from './data';
import type { CampaignState } from './types';

type Progress = Pick<CampaignState, 'mapId'> & Partial<Pick<CampaignState, 'visited' | 'path' | 'at' | 'openSlots'>>;

/** Yuvayı açan düğüm (haritaların içinden; yuva başına ilk bulunan). */
function opener(slot: string): { map: string; node: string } | undefined {
  for (const m of Object.values(MAPS)) {
    const n = m.nodes.find((x) => x.opensSlot === slot);
    if (n) return { map: m.id, node: n.id };
  }
  return undefined;
}

/** Açan düğümü olan yuvalar (veriden). */
const lockable = (): SlotId[] => Object.values(MAPS).flatMap((m) => m.nodes.flatMap((n) => (n.opensSlot ? [n.opensSlot] : [])));

/** Bulunulan harita, açan haritanın devamı mı (`continues` zinciri: takım o haritayı çoktan geçmiş)? */
function pastMap(mapId: string, target: string): boolean {
  const seen = new Set<string>();
  for (let m = MAPS[mapId]?.continues; m && !seen.has(m); m = MAPS[m]?.continues) {
    if (m === target) return true;
    seen.add(m);
  }
  return false;
}

/** Yuva bu seferde açık mı? Bilinmeyen harita (bozuk kayıt) açık sayılır: kayıt okuma hiçbir item'i yersiz yere çıkarmasın. */
export function slotOpen(s: Progress, slot: SlotId): boolean {
  const src = opener(slot);
  if (!src || !MAPS[s.mapId] || (Array.isArray(s.openSlots) && s.openSlots.includes(slot))) return true;
  if (s.mapId === src.map) return s.at === src.node || (Array.isArray(s.visited) && s.visited.includes(src.node)) || (Array.isArray(s.path) && s.path.includes(src.node));
  return pastMap(s.mapId, src.map);
}

/** Kilitli yuvalar ve kısa nedenleri (arayüz ipucu, takma hatası). */
export function slotLocks(s: Progress): SlotLocks {
  const out: SlotLocks = {};
  for (const k of lockable()) if (!slotOpen(s, k)) out[k] = CONFIG.texts[`slotLocked.${k}`] ?? 'Locked';
  return out;
}

/** Bu haritada düşmeyen, tüccarda ve hediyede çıkmayan yuvalar (haritanın `noDropSlots` alanı; kilitten bağımsız). */
export const noDropSlots = (mapId: string): SlotId[] => MAPS[mapId]?.noDropSlots ?? [];

/** Hamle yeni bir yuva açtıysa tek satırlık bildirim (harita toast'ı); yoksa null. */
export function slotOpenedNote(before: Progress, after: Progress): string | null {
  const opened = lockable().find((k) => !slotOpen(before, k) && slotOpen(after, k));
  return opened ? (CONFIG.texts[`slotOpened.${opened}`] ?? null) : null;
}

/** Debug: yuvayı ilerlemeden bağımsız açar. */
export function debugOpenSlot(s: CampaignState, slot: SlotId): CampaignState {
  return s.openSlots?.includes(slot) ? s : { ...s, openSlots: [...(s.openSlots ?? []), slot] };
}
