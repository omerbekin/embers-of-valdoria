// Sefer verisi: data/campaign/*.json dosyalarını sefer tiplerine bağlar ("_not" açıklama alanları atılır).
import valdoriaJson from '../../data/campaign/valdoria.json';
import campaignJson from '../../data/campaign/campaign.json';
import encountersJson from '../../data/campaign/encounters.json';
import eventsJson from '../../data/campaign/events.json';
// Harita 2 (The Drowned Reach; maps-2-3.md 3): ayrı dosyalar, anahtarlar dr önekli; aşağıda Harita 1 verisiyle birleşir
import drownedReachJson from '../../data/campaign/drowned-reach.json';
import drEncountersJson from '../../data/campaign/drowned-reach-encounters.json';
import drEventsJson from '../../data/campaign/drowned-reach-events.json';
import type { CampaignConfig, CampaignMap, EncounterDef } from './types';
import type { RarityId } from '../progression/items';

const strip = <T>(o: unknown): Record<string, T> =>
  Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([k]) => !k.startsWith('_'))) as Record<string, T>;

export const MAPS: Record<string, CampaignMap> = {
  valdoria: valdoriaJson as unknown as CampaignMap,
  'drowned-reach': drownedReachJson as unknown as CampaignMap,
};

export const CONFIG: CampaignConfig = campaignJson as unknown as CampaignConfig;

export const ENCOUNTERS: Record<string, EncounterDef> = { ...strip<EncounterDef>(encountersJson), ...strip<EncounterDef>(drEncountersJson) };

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

type EventsFile = { events: Record<string, EventDef>; stories?: Record<string, StoryDef>; treasures: Record<string, TreasureDef> };
const EVENT_FILES = [eventsJson, drEventsJson] as unknown as EventsFile[];

export const EVENTS: Record<string, EventDef> = Object.assign({}, ...EVENT_FILES.map((f) => f.events));
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
  /**
   * Sonsöz sayfası (beğenilse de beğenilmese de, son sayfadan sonra; tekrar okumada da). Valdren Keep'te komutan Valor'u anlatır (Ömer 2026-10-13);
   * Valor'un açılması ve hediyesi kural tarafında (state.ts > complete, data/valor.json > campaign).
   */
  epilogue?: { title?: string; text: string };
}

/** Kasaba hikâye sahneleri (T5; sis açma YOK; düğümün `story` alanı). */
export const STORIES: Record<string, StoryDef> = Object.assign({}, ...EVENT_FILES.map((f) => f.stories ?? {}));
/**
 * Hazine sandığının içeriği (isteğe bağlı; Harita 1 cepleri, map-1-rework.md 3a). Yalnız var olan ödül türleri: `maxItems` sandık zarından en çok
 * bu kadar item, `itemsDelta` standart sandığın item sayısına ek (negatif = eksik), `gold` sabit altın (sandığın altını yerine), `gift`
 * düğümün item seviyesinde bu nadirlikte bir hediye item'i (kasaba hediyesiyle aynı kural, loot.ts > grantGift). Yoksa standart sandık.
 */
export interface TreasureLoot {
  maxItems?: number;
  itemsDelta?: number;
  gold?: number;
  gift?: RarityId;
}

export interface TreasureDef extends EventText {
  loot?: TreasureLoot;
}

export const TREASURES: Record<string, TreasureDef> = Object.assign({}, ...EVENT_FILES.map((f) => strip<TreasureDef>(f.treasures)));

export function getMap(id: string): CampaignMap {
  const m = MAPS[id];
  if (!m) throw new Error(`Campaign map not found: ${id}`);
  return m;
}
