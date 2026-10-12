// Sefer verisi: data/campaign/*.json dosyalarını sefer tiplerine bağlar ("_not" açıklama alanları atılır).
import valdoriaJson from '../../data/campaign/valdoria.json';
import campaignJson from '../../data/campaign/campaign.json';
import encountersJson from '../../data/campaign/encounters.json';
import eventsJson from '../../data/campaign/events.json';
import type { CampaignConfig, CampaignMap, EncounterDef } from './types';
import type { RarityId } from '../progression/items';

const strip = <T>(o: unknown): Record<string, T> =>
  Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([k]) => !k.startsWith('_'))) as Record<string, T>;

export const MAPS: Record<string, CampaignMap> = {
  valdoria: valdoriaJson as unknown as CampaignMap,
};

export const CONFIG: CampaignConfig = campaignJson as unknown as CampaignConfig;

export const ENCOUNTERS: Record<string, EncounterDef> = strip<EncounterDef>(encountersJson);

export interface EventText {
  title: string;
  text: string;
  reward?: string;
}

/**
 * Seçenekli olayın bir seçeneği (N2; yalnızca var olan yapı taşları). Sıra: bedel (`cost` altın) -> can (`hpLoss` MEVCUT canın oranı, kimse
 * ölmez; `heal` maks canın oranı) -> `gold` -> `chest` (var olan hazine sandığı loot'u) -> `restHeal` (bu düğümün dinlenme oranı). `battle`:
 * sırayla ilk VAR OLAN karşılaşma oynanır (yoksa seçenek gösterilmez); kazanınca `win` ödülü verilir ve olay biter. `result`: sonuç metni.
 */
export interface EventChoice {
  id: string;
  label: string;
  hint?: string;
  result?: string;
  cost?: number;
  gold?: number;
  hpLoss?: number;
  heal?: number;
  chest?: boolean;
  /** Küçük sandık: sandık zarından yalnızca bu kadar item; o zaman `gold` sandığın altını olarak Spoils kartında görünür (cadının bedelli seçenekleri). */
  chestItems?: number;
  restHeal?: number;
  battle?: string[];
  win?: { gold?: number; chest?: boolean };
}

export interface EventDef extends EventText {
  choices?: EventChoice[];
}

export const EVENTS: Record<string, EventDef> = (eventsJson as unknown as { events: Record<string, EventDef> }).events;
/** Diyalog sahnesinde bir soru: NPC'nin repliği + 2-3 cevap; `likes` cevaplar NPC'nin hoşuna gider (gizli sayaç). */
export interface DialogueStep {
  text: string;
  choices: Array<{ label: string; likes?: boolean }>;
}

/**
 * Kasaba hikâye sahnesi (T5): düz metin ya da DİYALOG (Ömer 2026-10-12, Ashford). Diyalog: `dialogue` adımları sırayla, hoşa giden cevaplar
 * sayılır; sayı >= `likeThreshold` ise `liked` metni + `gift` (tek item, ör. Common), değilse `disliked` vedası (ceza yok). Bir kez oynar.
 */
export interface StoryDef extends EventText {
  speaker?: string;
  dialogue?: DialogueStep[];
  likeThreshold?: number;
  gift?: { rarity: RarityId };
  liked?: string;
  disliked?: string;
}

/** Kasaba hikâye sahneleri (T5; sis açma YOK; düğümün `story` alanı). */
export const STORIES: Record<string, StoryDef> = (eventsJson as unknown as { stories?: Record<string, StoryDef> }).stories ?? {};
export const TREASURES: Record<string, EventText> = (eventsJson as unknown as { treasures: Record<string, EventText> }).treasures;

export function getMap(id: string): CampaignMap {
  const m = MAPS[id];
  if (!m) throw new Error(`Campaign map not found: ${id}`);
  return m;
}
