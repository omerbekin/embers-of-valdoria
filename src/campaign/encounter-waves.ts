// Seferde karşılaşmanın dalgaları (saf; Ömer 2026-10-19 düzeltmesi, docs/design/waves.md > 0. Ekleme kuralı). Savaş planı (encounters.ts),
// önizleme / "Start battle?" kartı ve XP yedek sayımı (xp.ts) aynı listeyi buradan alır (döngüsel içe aktarma olmasın diye ayrı modül).
import { classes, encounterUnit, summons } from '../engine/content';
import { buildWaves, reinforceConfig, waveOpening } from '../engine/wave-split';
import { ENCOUNTERS, MAPS } from './data';
import type { EncounterDef, EncounterUnit } from './types';

/** Sıra almayan yardımcı nesne mi (Iron Mooring): takviye şablonuna girmez, önderle kendi dalgasında kalır. */
export const isInertUnit = (cls: string): boolean => !!(classes[cls] ?? encounterUnit(cls) ?? summons[cls])?.inert;

/** Bölgenin sıradan birimlerinden takviye şablonu (data/waves.json > reinforce.regionGroups; eşlikçisi olmayan karşılaşma için). */
export const regionReinforcement = (region: string | undefined): EncounterUnit[] =>
  ((region ? reinforceConfig.regionGroups?.[region] : undefined) ?? []) as EncounterUnit[];

/**
 * Karşılaşmanın dalgaları (ilk eleman = 1. dalga). Karşılaşmanın kendi `waves` alanı varsa tam liste = [units, ...waves] (veri önceliklidir).
 * Yoksa dalgalar açıkken (data/waves.json > campaign) ve düğüm tutorial'ın dalgasız düğümlerinden değilse karşılaşmaya takviye dalgaları
 * EKLENİR (wave-split.ts > buildWaves; normal 2, elit 2, boss 3 dalga; olay / hazine savaşı normal sayılır). Kapalıyken tek dalga.
 */
export function encounterWaves(def: Pick<EncounterDef, 'units' | 'waves'>, nodeId: string, nodeType: string, region?: string): EncounterUnit[][] {
  const later = (def.waves ?? []).filter((w) => w.units.length > 0).map((w) => w.units);
  if (later.length) return [def.units, ...later];
  const o = waveOpening.campaign;
  if (!o.enabled || o.skipNodes.includes(nodeId)) return [def.units];
  return buildWaves(def.units, o.count[nodeType] ?? o.count.battle ?? 1, isInertUnit, regionReinforcement(region));
}

/** Karşılaşmayı kullanan ilk sefer düğümü (önizleme bağlamı: düğüm id'si, türü, bölgesi). Yoksa undefined (ör. yalnızca Endless). */
export function nodeForEncounter(encounterId: string): { id: string; type: string; region?: string } | undefined {
  for (const map of Object.values(MAPS)) {
    const n = map.nodes.find((x) => x.encounter === encounterId);
    if (n) return { id: n.id, type: n.type, region: n.region };
  }
  return undefined;
}

/** Karşılaşmanın seferdeki dalgaları, düğüm bağlamı haritadan bulunarak (önizleme / XP yedeği). Düğümü olmayan karşılaşma: units + `waves`. */
export function encounterWavesById(encounterId: string, def: Pick<EncounterDef, 'units' | 'waves'> | undefined = ENCOUNTERS[encounterId]): EncounterUnit[][] {
  if (!def) return [];
  const n = nodeForEncounter(encounterId);
  if (!n) return [def.units, ...(def.waves ?? []).map((w) => w.units).filter((u) => u.length)];
  return encounterWaves(def, n.id, n.type, n.region);
}
