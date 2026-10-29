// Harita 3 (The Hollow Crown) düğüm kuralları (Ömer 2026-10-29, open-questions 454 a / b / d). Saf; state.ts'i içe aktarmaz (döngü yok).
// - Hall of Oaths (hc31): CampaignState.stoneOath ('sworn' = The Deep Market indirimi + `oathSealed` cüce mezarlarının hazinesi alınmaz;
//   'refused' / kararsız = indirim yok, mezarlar açık). Ömer 2026-10-29: devriye cezası kaldırıldı.
// - The Deep Market (hc54): YALNIZ bu düğümün tüccarı (MapNode.marketRules): fiyat çarpanı + nadirlik tabanı. Harita 1-2 ve Endless tüccarı aynen.
// - The White Dark (hc20) "Wait it out": CampaignState.pendingStatus (sonraki savaşın başında takıma Chilled; savaş bitince silinir).
// Sayılar veride (hollow-crown.json / hollow-crown-events.json), PROVİZYON.
import type { Status } from '../engine/types';
import { DROP_RARITIES, type DropRarity } from '../progression/drop';
import type { RarityId } from '../progression/items';
import type { CampaignState, MapNode } from './types';

/** Düğümün tüccar fiyat çarpanı (marketRules yoksa 1): priceMult, yemin edildiyse (1 - oathDiscount) ile çarpılır. */
export function marketPriceMult(n: Pick<MapNode, 'marketRules'>, s: Pick<CampaignState, 'stoneOath'>): number {
  const r = n.marketRules;
  if (!r) return 1;
  const base = r.priceMult ?? 1;
  const off = s.stoneOath === 'sworn' ? Math.max(0, Math.min(1, r.oathDiscount ?? 0)) : 0;
  return Math.max(0, base * (1 - off));
}

/** Düğümün yenileme bedeli çarpanı (marketRules yoksa 1): rerollMult, yemin edildiyse (1 - oathDiscount) ile çarpılır. */
export function marketRerollMult(n: Pick<MapNode, 'marketRules'>, s: Pick<CampaignState, 'stoneOath'>): number {
  const r = n.marketRules;
  if (!r) return 1;
  const off = s.stoneOath === 'sworn' ? Math.max(0, Math.min(1, r.oathDiscount ?? 0)) : 0;
  return Math.max(0, (r.rerollMult ?? 1) * (1 - off));
}

/** Nadirlik tabanı: zarlanan nadirlik tabanın altındaysa tabana çıkar (taban yoksa aynen; Legendary dokunulmaz). */
export function withRarityFloor<R extends RarityId>(rarity: R, floor: DropRarity | undefined): R {
  if (!floor) return rarity;
  const order = DROP_RARITIES as readonly string[];
  const i = order.indexOf(rarity);
  const f = order.indexOf(floor);
  return i >= 0 && f > i ? (floor as R) : rarity;
}

/** Cüce mezarının hazinesi bu kayıtta mühürlü mü (düğüm `oathSealed` + Stone Oath yeminli). Mühürlüyken hazine adımı ganimet vermez. */
export function oathSealedFor(n: Pick<MapNode, 'oathSealed'>, s: Pick<CampaignState, 'stoneOath'>): boolean {
  return n.oathSealed === true && s.stoneOath === 'sworn';
}

/**
 * Yemin reddedilmişken ilk yağmalanan cüce mezarı mı (yalnız metin: "the dead of Kharduin watch you take it"; mekanik yok). Başka bir
 * `oathSealed` düğümün hazine adımı daha önce bittiyse false.
 */
export function oathFirstPlunder(nodes: readonly Pick<MapNode, 'id' | 'oathSealed'>[], s: Pick<CampaignState, 'stoneOath' | 'done'>, nodeId: string): boolean {
  if (s.stoneOath !== 'refused') return false;
  const tombs = nodes.filter((n) => n.oathSealed === true);
  if (!tombs.some((n) => n.id === nodeId)) return false;
  return !tombs.some((n) => n.id !== nodeId && s.done.includes(`${n.id}:treasure`));
}

/** Bekleyen savaş başı durumu bu kahraman için (motorun startStatuses biçimi; kaynak kahramanın kendisi). */
export function pendingStartStatuses(s: Pick<CampaignState, 'pendingStatus'>, uid: string): Status[] | undefined {
  const p = s.pendingStatus;
  if (!p || !(p.turns > 0)) return undefined;
  return [{ kind: p.status, turns: Math.floor(p.turns), source: uid }];
}
