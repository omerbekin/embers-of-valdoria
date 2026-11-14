// Savaş dışı tüketilebilir malzemeler (Ömer 2026-11-07; data/consumables.json): Healing Draught, Greater Healing Draught, Wound Salve, Revive Ally.
// Çanta yuvası tutmaz: CampaignState.supplies (id -> adet; eski kayıtta yok = boş). Yalnızca sandık / loot düşüşünden gelir (grantLoot çağırır).
import consumablesJson from '../../data/consumables.json';
import { rngFor } from './seed';
import { dropChances, type DropKind, type DropRarity } from '../progression/drop';
import { ITEMS } from '../progression/items';
import type { CampaignState, LootDrop } from './types';

export interface SupplyDef {
  id: string;
  name: string;
  text: string;
  heal?: number;
  cureWound?: boolean;
  revive?: number;
  /** Respec malzemesi (Ömer 2026-11-14): seçilen kahramanın skill ağacının tamamı sıfırlanır (Tome of Unlearning). */
  resetTree?: boolean;
  /** Respec malzemesi: dağıtılmış stat puanlarının tamamı geri gelir (Draught of Rebirth). */
  resetStats?: boolean;
  /** Çerçeve nadirliği (yoksa sade); `rarityTo` varsa iki rengin karışımı, `rarityBlend` = rarityTo payı. */
  rarity?: DropRarity;
  rarityTo?: DropRarity;
  rarityBlend?: number;
  /** Kaynak -> nadirlik listesi (şans ve fiyat bu nadirliklerin ortalaması; yalnız respec malzemeleri). */
  from?: Partial<Record<RespecSource, DropRarity[]>>;
}

/** Respec malzemelerinin tek kaynakları: boss loot'u ve tüccar stoğu (savaş / elit / sandık YOK). */
export type RespecSource = 'boss' | 'merchant';
/** Düşüş zarı kaynağı: boss + elit (elit şansı bossunkinden türer; `from` yalnız boss / merchant anahtarlı). */
export type RespecChanceSource = RespecSource | 'elite';

interface DropRow {
  chance: number;
  weights: Record<string, number>;
}

export const SUPPLIES: readonly SupplyDef[] = consumablesJson.items as SupplyDef[];
/** Elit düşüş çarpanı (data/consumables.json > respecEliteMult). */
export const ELITE_MULT: number = (consumablesJson as { respecEliteMult?: number }).respecEliteMult ?? 0;
const DROPS = consumablesJson.drops as Record<string, DropRow>;

export const supplyDef = (id: string): SupplyDef | undefined => SUPPLIES.find((d) => d.id === id);

/** Kaynağı olan (respec) malzemeler, veri sırasıyla. */
export const respecSupplies = (src?: RespecSource): SupplyDef[] => SUPPLIES.filter((d) => (src ? !!d.from?.[src]?.length : !!d.from));

/** Kahramanı sıfırlayan malzeme mi (YZ / sim kullanmaz; arayüzde kahraman seçme penceresi). */
export const isRespecSupply = (d: SupplyDef | undefined): boolean => !!d && (!!d.resetTree || !!d.resetStats);

/**
 * Düşme / görünme şansı (0-1), var olan item nadirlik tablosundan türer (data/items.json > dropRarity): düğümün item seviyesinde, kaynağın zarı
 * (boss = 'boss' kayması, tüccar = rafların 'normal' zarı) ile `from[kaynak]` nadirliklerinin olasılıklarının ortalaması. Kaynak yoksa 0.
 */
export function respecChance(d: SupplyDef, src: RespecChanceSource, ilvl: number): number {
  if (src === 'elite') return respecChance(d, 'boss', ilvl) * ELITE_MULT; // Ömer 2026-11-14: elit = aynı seviyedeki boss şansının yarısı (çarpan veride)
  const rs = d.from?.[src];
  if (!rs?.length) return 0;
  const kind: DropKind = src === 'boss' ? 'boss' : 'normal';
  const c = dropChances(Math.max(1, ilvl), kind);
  return rs.reduce((a, r) => a + (c[r] ?? 0), 0) / rs.length / 100;
}

const hex = (c: string): number[] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
/** Malzemenin çerçeve rengi: nadirlik rengi (data/items.json > rarities), `rarityTo` varsa karışım. Nadirliksiz = undefined (sade). */
export function supplyColor(d: SupplyDef): string | undefined {
  const col = (r?: string): string | undefined => ITEMS.rarities.find((x) => x.id === r)?.color;
  const a = col(d.rarity);
  if (!a) return undefined;
  const b = col(d.rarityTo);
  if (!b) return a;
  const t = Math.max(0, Math.min(1, d.rarityBlend ?? 0.5));
  const [x, y] = [hex(a), hex(b)];
  return `#${x.map((v, i) => Math.round(v * (1 - t) + y[i]! * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Çerçevenin adı (kurdele): "Epic" ya da "Rare-Epic". */
export function supplyRarityName(d: SupplyDef): string | undefined {
  const nm = (r?: string): string | undefined => ITEMS.rarities.find((x) => x.id === r)?.name;
  const a = nm(d.rarity);
  const b = nm(d.rarityTo);
  return a && b ? `${a}-${b}` : a;
}

/**
 * Boss / elit loot'unun respec malzemesi zarı (grantLoot çağırır; `t` klonlanmış): HER zaferde zarlanır (Ömer 2026-11-14), her malzeme kendi
 * seed'li zarı (tuz 'respec-supply'; replay > 0 ise sayı da tuza girer, ilk zafer zarı eskisiyle aynı). Elit şansı = boss şansı x ELITE_MULT.
 * Dönen: düşenler { id: 1 }.
 */
export function rollRespecDrop(t: CampaignState, nodeId: string, kind: LootDrop['kind'], replay: number, ilvl: number): Record<string, number> {
  if (kind !== 'boss' && kind !== 'elite') return {};
  const out: Record<string, number> = {};
  for (const d of respecSupplies('boss')) {
    const rng = replay > 0 ? rngFor(t.seed, t.mapId, nodeId, 'respec-supply', d.id, replay) : rngFor(t.seed, t.mapId, nodeId, 'respec-supply', d.id);
    if (rng.next() >= respecChance(d, kind, ilvl)) continue;
    addSupply(t, d.id, 1);
    out[d.id] = 1;
  }
  return out;
}

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
