// B5 The Fighting Pit (Ömer seçimi 2026-10-25, maps-2-3.md 9; campaign-dev 2026-10-27, open-questions 429): saf veri ve kurallar.
// Durum geçişleri (enterPit / fightPit / leavePit / losePit ve applyBattle'daki zafer) state.ts'te; bu modül state.ts'i içe aktarmaz.
import pitsJson from '../../data/campaign/pits.json';
import type { CampaignState, MapNode } from './types';

/** Bir kademe: karşılaşma + ödül (altın; `chest` = ek olarak hazine sandığı loot'u). Ödül yalnız yeni rekor kademesinde. */
export interface PitTier {
  encounter: string;
  gold: number;
  chest?: boolean;
}

export interface PitDef {
  name: string;
  text: string;
  tiers: PitTier[];
}

export const PITS: Record<string, PitDef> = Object.fromEntries(Object.entries(pitsJson as Record<string, unknown>).filter(([k]) => !k.startsWith('_'))) as Record<string, PitDef>;

/** Düğümün arenası (kasaba düğümünde `pit` alanı ve verisi varsa). */
export const pitOf = (n: Pick<MapNode, 'pit' | 'type'>): PitDef | null => (n.type === 'town' && n.pit ? (PITS[n.pit] ?? null) : null);

/** Arenadaki rekor (en yüksek kazanılan kademe; 0 = hiç). */
export const pitBest = (s: Pick<CampaignState, 'pitBest'>, nodeId: string): number => s.pitBest?.[nodeId] ?? 0;

/** Açık koşuda sıradaki kademe (0 tabanlı sıra; koşu yoksa 0). */
export const pitNextIndex = (s: Pick<CampaignState, 'pit'>): number => s.pit?.wins ?? 0;

/** Kademe (0 tabanlı) yeni rekor mu (ödül verir mi)? */
export const pitTierPays = (s: Pick<CampaignState, 'pitBest'>, nodeId: string, index: number): boolean => index + 1 > pitBest(s, nodeId);
