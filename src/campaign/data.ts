// Sefer verisi: data/campaign/*.json dosyalarını sefer tiplerine bağlar ("_not" açıklama alanları atılır).
import valdoriaJson from '../../data/campaign/valdoria.json';
import campaignJson from '../../data/campaign/campaign.json';
import encountersJson from '../../data/campaign/encounters.json';
import eventsJson from '../../data/campaign/events.json';
// Harita 2 (The Drowned Reach; maps-2-3.md 3): ayrı dosyalar, anahtarlar dr önekli; aşağıda Harita 1 verisiyle birleşir
import drownedReachJson from '../../data/campaign/drowned-reach.json';
import drEncountersJson from '../../data/campaign/drowned-reach-encounters.json';
import drEventsJson from '../../data/campaign/drowned-reach-events.json';
// Harita 2 yan içerik (A1 Wayshrines, B1 Salvage Dive; maps-2-3.md 9)
import sideJson from '../../data/campaign/side-content.json';
import type { CampaignConfig, CampaignMap, EncounterDef, Faction, UnitMods } from './types';
import { RARITY_IDS, type RarityId } from '../progression/items';

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
  /** A4 Hero Oath: seçenek yemin penceresini açar (yemin edilince ya da yemin varken pencere kapanınca olay biter; src/campaign/oath.ts). */
  oath?: boolean;
  /** A5 Personal Quests: seçenek bu görevindir (sınıfı kadroda yoksa gizli); kazanılan savaş ya da savaşsız seçenek görevi bitirir. */
  quest?: string;
  /** A5: "Walk away": olay bitmez, pencere kapanır, kafile yola çıkabilir; sonra dönülür (state.ts > canWithdraw). */
  walkAway?: boolean;
  /** M-L: seçenek tarafı seçer (bir kez, geri alınmaz; src/campaign/reach.ts). */
  faction?: Faction;
  /** M-L: seçenek yalnız bu tarafta (ya da listedeki taraflarda) görünür ('none' = taraf seçilmemişken). Yoksa herkese. */
  needFaction?: Faction | 'none' | Array<Faction | 'none'>;
  /** M-J "Charter a ship": deniz yollarını açar (Black Caravel dolaşmaya başlar). */
  charter?: boolean;
  /** M-M: Lantern Rock feneri yakılır (bu haritada görüş eki, reach.lighthouse). */
  light?: boolean;
  /** Tek hediye item (var olan hediye yolu, loot.ts > grantGift): nadirlik + isteğe bağlı yuva süzgeci (ör. relic = offhand). */
  gift?: { rarity?: RarityId; slots?: string[] };
}

export interface EventDef extends EventText {
  choices?: EventChoice[];
  /**
   * Olay bitmiş olsa da düğüme yeniden varınca yeniden açılır, şart sağlanana kadar ('charter' = deniz yolları kapalıyken, 'faction' = taraf
   * seçilmemişken; state.ts > moveTo). "Not yet" seçeneği böylece kalıcı kayıp yaratmaz.
   */
  again?: 'charter' | 'faction';
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
   * Sonsöz sayfası (beğenilse de beğenilmese de, son sayfadan sonra; tekrar okumada da): yalnız kapanış metni, kendi başına hiçbir şey açmaz
   * (Ömer 2026-10-28, open-questions 450: Harita 2 zincirlerine de sonsöz). Valdren Keep'te komutan Valor'u anlatır (Ömer 2026-10-13).
   */
  epilogue?: { title?: string; text: string };
  /**
   * Sonsöz Continue'su Valor dersini açar (Codex > Lessons + mangal gösterimi 0'dan; yalnız Valdren Keep, the_wardens_oath). Sonsözden ayrı bayrak
   * (open-questions 450). Valor'un açılması ve hediyesi kural tarafında (state.ts > complete, data/valor.json > campaign).
   */
  valorLesson?: boolean;
  /** Hediye satırındaki özne (yoksa 'he'): "She presses a small bundle into your hands." (Ysolt, Keeper's Daughter; open-questions 450). */
  pronoun?: 'he' | 'she';
}

/** Hikâye sonunda hediye verilince replik altındaki not (NPC'nin `pronoun` alanıyla; varsayılan "He"). */
/** Sonsöz Continue'su Valor dersini açar mı (yalnız `valorLesson` bayrağıyla; sonsöz tek başına açmaz, open-questions 450). */
export const epilogueUnlocksValor = (def: Pick<StoryDef, 'valorLesson'>): boolean => def.valorLesson === true;

export const storyGiftNote = (def: Pick<StoryDef, 'pronoun'>): string => `${def.pronoun === 'she' ? 'She' : 'He'} presses a small bundle into your hands.`;

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
  /**
   * Ömer 2026-10-25 (open-questions 417): hediye `chance` olasılıkla `rarity` nadirliğinde gelir, tutmazsa `gift` nadirliğinde kalır; tek seed'li
   * zar (sefer + harita + düğüm; loot.ts > treasureGiftRarity): yeniden deneme / yükleme sonucu değiştirmez.
   */
  giftUpgrade?: { rarity: RarityId; chance: number };
}

export interface TreasureDef extends EventText {
  loot?: TreasureLoot;
}

export const TREASURES: Record<string, TreasureDef> = Object.assign({}, ...EVENT_FILES.map((f) => strip<TreasureDef>(f.treasures)));

/** Hazine sandığı verisinin şekil denetimi (testlerde): nadirlik adları geçerli, `giftUpgrade` yalnız `gift` ile, ondan yüksek ve 0 < chance < 1. Boş = geçerli. */
export function validateTreasures(defs: Record<string, TreasureDef> = TREASURES): string[] {
  const errs: string[] = [];
  const rarities: readonly string[] = RARITY_IDS;
  for (const [id, d] of Object.entries(defs)) {
    const l = d.loot;
    if (!l) continue;
    if (l.gift !== undefined && !rarities.includes(l.gift)) errs.push(`${id}: unknown gift rarity ${l.gift}`);
    for (const k of ['maxItems', 'gold'] as const) {
      const v = l[k];
      if (v !== undefined && !(Number.isInteger(v) && v >= 0)) errs.push(`${id}: ${k} must be a non-negative integer`);
    }
    const u = l.giftUpgrade;
    if (u) {
      if (l.gift === undefined) errs.push(`${id}: giftUpgrade needs gift`);
      if (!rarities.includes(u.rarity)) errs.push(`${id}: unknown giftUpgrade rarity ${u.rarity}`);
      else if (l.gift !== undefined && rarities.indexOf(u.rarity) <= rarities.indexOf(l.gift)) errs.push(`${id}: giftUpgrade rarity must be above gift`);
      if (!(typeof u.chance === 'number' && u.chance > 0 && u.chance < 1)) errs.push(`${id}: giftUpgrade chance must be between 0 and 1`);
    }
  }
  return errs;
}

export function getMap(id: string): CampaignMap {
  const m = MAPS[id];
  if (!m) throw new Error(`Campaign map not found: ${id}`);
  return m;
}

/** A1 Wayshrine nimeti (data/campaign/side-content.json > wayshrines; metinler İngilizce). */
export interface WayshrineDef {
  name: string;
  /** Kısa etki satırı ("+3% max HP"). */
  effect: string;
  /** Sınavın gösterilen kuralı (kural karşılaşmada). */
  trial: string;
  /** Her savaşta her kahramana eklenen güçlendirme: *Mult çarpılır, *Add toplanır (side-content.ts > boonMods). */
  mods: UnitMods;
}

/** B1 Salvage Dive kuralı: en çok derinlik ve 2. derinlikten itibaren sandıklar (chests[0] = 2. derinlik). */
export interface SalvageDiveDef {
  maxDepth: number;
  chests: Array<{ gifts: RarityId[]; gold: number }>;
}

export const WAYSHRINES: Record<string, WayshrineDef> = strip<WayshrineDef>(sideJson.wayshrines);
export const SALVAGE_DIVE: SalvageDiveDef = sideJson.salvageDive as unknown as SalvageDiveDef;
