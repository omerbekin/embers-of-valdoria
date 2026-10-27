// Harita 2 yan içerik yardımcıları (saf; maps-2-3.md 9, open-questions 428): A1 Wayshrine nimetleri ve sınav kuralları, B1 Salvage Dive
// derinlikleri. Durum geçişleri (dalış, yüzeye çıkış, yenilgi) state.ts'te; savaş kurulumu encounters.ts > battlePlan.
import { classes } from '../engine/content';
import { ENCOUNTERS, SALVAGE_DIVE, WAYSHRINES, type WayshrineDef } from './data';
import type { CampaignState, EncounterDef, Hero, MapNode, UnitMods } from './types';

/** Kayıttaki geçerli nimetler (bilinmeyen / tekrar eden id atılır), kazanma sırasıyla. */
export function boonIds(s: Pick<CampaignState, 'boons'>): string[] {
  const out: string[] = [];
  for (const id of Array.isArray(s.boons) ? s.boons : []) if (typeof id === 'string' && WAYSHRINES[id] && !out.includes(id)) out.push(id);
  return out;
}

/** Gear ekranındaki tek liste: ad + kısa etki. */
export function boonList(s: Pick<CampaignState, 'boons'>): Array<{ id: string; name: string; effect: string }> {
  return boonIds(s).map((id) => ({ id, name: WAYSHRINES[id]!.name, effect: WAYSHRINES[id]!.effect }));
}

/**
 * İki güçlendirmeyi birleştirir: *Mult anahtarları çarpılır, diğer sayılar toplanır (attrAdd / attrMult gibi kayıtlar anahtar anahtar).
 * `a` değişmez. İkisi de boşsa undefined.
 */
export function mergeMods(a: UnitMods | undefined, b: UnitMods | undefined): UnitMods | undefined {
  if (!b || !Object.keys(b).length) return a;
  const out: Record<string, unknown> = { ...(a ?? {}) };
  for (const [k, v] of Object.entries(b)) {
    const mult = k.endsWith('Mult');
    if (typeof v === 'number') {
      const cur = out[k];
      const base = typeof cur === 'number' ? cur : mult ? 1 : 0;
      out[k] = Math.round((mult ? base * v : base + v) * 10000) / 10000;
    } else if (v && typeof v === 'object') {
      const rec: Record<string, number> = { ...((out[k] as Record<string, number> | undefined) ?? {}) };
      for (const [kk, vv] of Object.entries(v as Record<string, number>)) rec[kk] = Math.round((mult ? (rec[kk] ?? 1) * vv : (rec[kk] ?? 0) + vv) * 10000) / 10000;
      out[k] = rec;
    }
  }
  return Object.keys(out).length ? (out as UnitMods) : undefined;
}

/** Takımın tüm nimetlerinin birleşik güçlendirmesi (yoksa undefined). */
export function boonMods(s: Pick<CampaignState, 'boons'>): UnitMods | undefined {
  let out: UnitMods | undefined;
  for (const id of boonIds(s)) out = mergeMods(out, WAYSHRINES[id]!.mods);
  return out;
}

/** Düğümün sunağı (geçerli id ise). */
export const shrineOf = (n: Pick<MapNode, 'shrine'>): WayshrineDef | undefined => (n.shrine ? WAYSHRINES[n.shrine] : undefined);

/** Karşılaşmanın sınav kuralı (yoksa undefined). */
export const trialOf = (encounterId: string | undefined): EncounterDef['trial'] => (encounterId ? ENCOUNTERS[encounterId]?.trial : undefined);

/** Sınıfın ultimate'ı (4. skill yuvası; savaş HUD'ı ve Gear ile aynı kural). Yoksa undefined. */
export const ultSkillOf = (classId: string): string | undefined => classes[classId]?.skills[3];

/**
 * "Only N heroes" (A1 sınavı): dizilimde en öndeki (yuva sırası: ön sıradan arkaya) N ayakta kahraman. Düşmüş kahraman sayılmaz; ayakta
 * kahraman azsa olanlar. `heroes` yoksa herkes (ceset dahil, normal kural).
 */
export function trialHeroIds(s: Pick<CampaignState, 'active' | 'roster'>, heroes: number | undefined, fallen: (h: Hero) => boolean, requireClass?: string): Set<string> {
  const ids = s.active.filter((id): id is string => !!id && s.roster.some((h) => h.id === id));
  if (!heroes || heroes <= 0) return new Set(ids);
  const standing = ids.filter((id) => !fallen(s.roster.find((h) => h.id === id)!));
  // A5 Archer görevi (requireClass): o sınıftan en öndeki ayakta kahraman önce girer, kalan yerler en öndekilere (dizilim sırası korunur)
  const must = requireClass ? standing.find((id) => s.roster.find((h) => h.id === id)!.class === requireClass) : undefined;
  const rest = standing.filter((id) => id !== must).slice(0, Math.max(0, Math.floor(heroes) - (must ? 1 : 0)));
  return new Set(standing.filter((id) => id === must || rest.includes(id)));
}

/** Düğümün dalış karşılaşmaları (2. derinlikten; var olanlar, en çok maxDepth - 1). */
export function diveEncounters(n: Pick<MapNode, 'dive'>): string[] {
  return (n.dive ?? []).filter((id) => !!ENCOUNTERS[id]).slice(0, Math.max(0, SALVAGE_DIVE.maxDepth - 1));
}

/** Düğümün en derin noktası (dalışı yoksa 1). */
export const diveMax = (n: Pick<MapNode, 'dive'>): number => 1 + diveEncounters(n).length;

/** `depth`. derinliğin sandığı (2+; yoksa undefined). */
export const diveChest = (depth: number): SalvageChest | undefined => (depth >= 2 ? SALVAGE_DIVE.chests[depth - 2] : undefined);

export type SalvageChest = (typeof SALVAGE_DIVE.chests)[number];
