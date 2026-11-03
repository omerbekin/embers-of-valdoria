// Ortak "nadir düşüş" zarı (Ömer onayı 2026-10-10, madde 297): her kazanılan savaşta BİR zar (sefer ve Endless). Saf ve seed'li.
// İsabette dal: set parçası (setsEnabled + düğümün havuzu; kapalıyken düşüş yok) ya da Legendary. Kötü şans koruması: düşüşsüz her zafer şansı artırır,
// düşüşte sıfırlanır. Akıllı loot YOK (Ömer: FOMO): uygun havuzdan tekdüze seçim, takım sınıfına ağırlık yok, sahip olunan Legendary yine düşebilir.
import type { Rng } from '../engine/rng';
import { ITEMS, type ItemDef } from './items';

export type RareBattleKind = 'battle' | 'elite' | 'boss';

/** items.json > rareDrop (tüm sayılar veride). */
export interface RareDropConfig {
  chance: Record<RareBattleKind, number>;
  /** Düşüşsüz her zaferde şansa eklenen pay (0,005 = +%0,5). */
  pityPerMiss: number;
  /** İsabette dal payları: set parçası / Legendary (toplamı 1'den küçükse kalan = hiçbir şey). */
  split: { set: number; legendary: number };
  /** Set düşüşü açık mı: false iken set dalı hiçbir şey vermez. */
  setsEnabled: boolean;
  /** Dropper olmayan düğümde set dalı = Legendary dalı x bu oran (Ömer planı: Legendary'nin yarısı). */
  setOfLegendary?: number;
  /** Bölüm başına Legendary dal çarpanı (Valdoria = 1: 0,5). */
  chapterLegendaryMult: Record<string, number>;
  endless: {
    /** Dalga başına şansa ek (0,001 = +%0,1). */
    perWave: number;
    /** Endless ek şansı bu dalgadan SONRA artmaya başlar (Ömer 2026-10-12: yalnızca geç dalgalarda, yumuşak). Yoksa 0. */
    perWaveFrom?: number;
    /** Legendary bu dalgadan itibaren uygun. */
    legendaryFromWave: number;
    /** Tüccar (Odo): bu dalgadan itibaren her ziyarette `chance` ihtimalle bir nadir mal, fiyat = değer x priceMult. */
    merchant: { fromWave: number; chance: number; priceMult: number };
  };
}

export const RARE: RareDropConfig = (ITEMS as unknown as { rareDrop: RareDropConfig }).rareDrop;

export interface RareRollInput {
  rng: Rng;
  kind: RareBattleKind;
  /** Düşüşsüz geçen zafer sayısı (kayıtta). */
  misses: number;
  /** Sefer: bölüm (Legendary uygunluğu minChapter + bölüm çarpanı). */
  chapter?: number;
  /** Endless: dalga (şans artışı + Legendary dalga kapısı). */
  wave?: number;
  catalog?: ItemDef[];
  cfg?: RareDropConfig;
  /** Düğümün set havuzları (sets.ts > setDropPools): yoksa set düşmez. Endless vermez; verilse de dalga + boss kapısı set'i kapatır. */
  setPools?: { dropper: ItemDef[]; map: ItemDef[] };
}

export interface RareRollResult {
  /** Düşen item id'si (yoksa undefined). */
  item?: string;
  branch: 'none' | 'set' | 'legendary';
  /** Güncel sayaç: düşüşte 0, değilse +1. */
  misses: number;
  /** Bu zarın şansı (rapor / test için). */
  chance: number;
}

/** Bu zaferin nadir düşüş şansı. */
export function rareChance(kind: RareBattleKind, misses: number, wave?: number, cfg: RareDropConfig = RARE): number {
  return cfg.chance[kind] + cfg.pityPerMiss * Math.max(0, misses) + (wave !== undefined ? cfg.endless.perWave * Math.max(0, wave - (cfg.endless.perWaveFrom ?? 0)) : 0);
}

/** Uygun Legendary havuzu: sefer = minChapter <= bölüm; Endless = dalga kapısından sonra hepsi. */
export function legendaryPool(o: { chapter?: number; wave?: number }, catalog: ItemDef[] = ITEMS.items, cfg: RareDropConfig = RARE): ItemDef[] {
  const leg = catalog.filter((d) => d.rarity === 'legendary' && !d.eventOnly); // olay item'i (eventOnly) zarla düşmez
  if (o.wave !== undefined) return o.wave >= cfg.endless.legendaryFromWave ? leg : [];
  return leg.filter((d) => (d.minChapter ?? 1) <= (o.chapter ?? 1));
}

/**
 * Set dalının payı ve havuzu: bossta ve Endless'ta yok; asıl düşüren elitte split.set; diğer düğümde Legendary dalı x setOfLegendary, harita havuzundan.
 * Kapalıyken (setsEnabled false) ya da havuz boşken pay 0.
 */
function setBranch(o: RareRollInput, cfg: RareDropConfig, legShare: number): { share: number; pool: ItemDef[] } {
  const none = { share: 0, pool: [] as ItemDef[] };
  if (!cfg.setsEnabled || !o.setPools || o.wave !== undefined || o.kind === 'boss') return none;
  if (o.kind === 'elite' && o.setPools.dropper.length) return { share: cfg.split.set, pool: o.setPools.dropper };
  return { share: legShare * (cfg.setOfLegendary ?? 0), pool: o.setPools.map };
}

/** Bir zaferin nadir düşüş zarı (seed'li; zar sayısı sabit: iki zar + isabette havuz seçimi). */
export function rollRareDrop(o: RareRollInput): RareRollResult {
  const cfg = o.cfg ?? RARE;
  const chance = rareChance(o.kind, o.misses, o.wave, cfg);
  const miss = (): RareRollResult => ({ branch: 'none', misses: o.misses + 1, chance });
  if (o.rng.next() >= chance) return miss();
  const r = o.rng.next();
  const legShare = cfg.split.legendary * (o.chapter !== undefined ? (cfg.chapterLegendaryMult[String(o.chapter)] ?? 1) : 1);
  const set = setBranch(o, cfg, legShare);
  if (r < set.share && set.pool.length) {
    const d = set.pool[o.rng.int(0, set.pool.length - 1)]!;
    return { item: d.id, branch: 'set', misses: 0, chance };
  }
  // Set dalı boşa geldi (kapalı ya da oran dışı): düşüş olmadığı için sayaç sıfırlanmaz
  if (r < cfg.split.set) return miss();
  if (r < cfg.split.set + legShare) {
    const pool = legendaryPool({ chapter: o.chapter, wave: o.wave }, o.catalog ?? ITEMS.items, cfg);
    if (!pool.length) return miss();
    const d = pool[o.rng.int(0, pool.length - 1)]!; // tekdüze: akıllı loot yok
    return { item: d.id, branch: 'legendary', misses: 0, chance };
  }
  return miss();
}
