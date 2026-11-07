// Savaş dışı tüketilebilir malzemeler (Ömer 2026-11-07; data/consumables.json): Healing Draught, Greater Healing Draught, Wound Salve, Revive Ally.
// Çanta yuvası tutmaz: CampaignState.supplies (id -> adet; eski kayıtta yok = boş). Yalnızca sandık / loot düşüşünden gelir (grantLoot çağırır).
import consumablesJson from '../../data/consumables.json';
import { rngFor } from './seed';
import type { CampaignState, LootDrop } from './types';

export interface SupplyDef {
  id: string;
  name: string;
  text: string;
  heal?: number;
  cureWound?: boolean;
  revive?: number;
}

interface DropRow {
  chance: number;
  weights: Record<string, number>;
}

export const SUPPLIES: readonly SupplyDef[] = consumablesJson.items as SupplyDef[];
const DROPS = consumablesJson.drops as Record<string, DropRow>;

export const supplyDef = (id: string): SupplyDef | undefined => SUPPLIES.find((d) => d.id === id);

/** Açıklama metni: {heal} / {revive} yüzdeleri veriden. */
export const supplyText = (d: SupplyDef): string => d.text.replace('{heal}', String(Math.round((d.heal ?? 0) * 100))).replace('{revive}', String(Math.round((d.revive ?? 0) * 100)));

/** Eldeki adet (kayıtta yok / bozuk = 0). */
export const supplyCount = (s: Pick<CampaignState, 'supplies'>, id: string): number => {
  const n = s.supplies?.[id];
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/** Eldeki malzemeler (veri sırasıyla, adedi > 0). */
export const supplyList = (s: Pick<CampaignState, 'supplies'>): Array<{ def: SupplyDef; count: number }> =>
  SUPPLIES.map((def) => ({ def, count: supplyCount(s, def.id) })).filter((x) => x.count > 0);

/** Malzeme ekler (YERİNDE; çağıran klonlamış olmalı). */
export function addSupply(t: CampaignState, id: string, n = 1): void {
  if (!supplyDef(id) || n <= 0) return;
  t.supplies = { ...(t.supplies ?? {}), [id]: supplyCount(t, id) + Math.floor(n) };
}

/** Kayıt temizliği: bilinmeyen id / bozuk adet atılır; boşsa undefined. */
export function normalizeSupplies(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(raw as Record<string, unknown>)) if (supplyDef(id) && typeof n === 'number' && Number.isFinite(n) && n > 0) out[id] = Math.floor(n);
  return Object.keys(out).length ? out : undefined;
}

/**
 * Düğümün loot'una malzeme düşüşü (grantLoot çağırır; `t` klonlanmış): yalnız İLK zafer / ilk sandık (replay 0), tek seed'li zar çifti
 * (şans + hangisi). Dönen: düşen { id: adet } ya da boş. Loot ve nadir düşüş zarına dokunmaz (kendi tuzu).
 */
export function rollSupplyDrop(t: CampaignState, nodeId: string, kind: LootDrop['kind'], replay: number, tag?: string): Record<string, number> {
  const row = DROPS[kind];
  if (!row || replay > 0) return {};
  const rng = tag ? rngFor(t.seed, t.mapId, nodeId, 'supply', kind, replay, tag) : rngFor(t.seed, t.mapId, nodeId, 'supply', kind, replay);
  if (rng.next() >= row.chance) return {};
  const entries = Object.entries(row.weights).filter(([id, w]) => w > 0 && supplyDef(id));
  const total = entries.reduce((a, [, w]) => a + w, 0);
  if (!(total > 0)) return {};
  let x = rng.next() * total;
  let pick = entries[entries.length - 1]![0];
  for (const [id, w] of entries) {
    x -= w;
    if (x < 0) {
      pick = id;
      break;
    }
  }
  addSupply(t, pick, 1);
  return { [pick]: 1 };
}
