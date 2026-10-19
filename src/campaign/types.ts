/**
 * Sefer (campaign) tipleri. Saf TypeScript: Phaser/DOM yok, Node'da test edilir (docs/design/campaign/campaign.md).
 */
import type { ReplayAction } from '../endless/replay';

export type NodeType = 'battle' | 'elite' | 'boss' | 'town' | 'event' | 'treasure' | 'rest' | 'merchant';
export type EdgeStyle = 'solid' | 'dashed';
export type CampaignMode = 'normal' | 'ironman';
/** Genel zorluk: sefer başında seçilir, sonra değişmez. */
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyDef {
  name: string;
  /** Yapay zeka zorluğu (savaş kurulumuna iletilir). */
  ai: Difficulty;
  text: string;
  /**
   * Seferdeki TÜM düşman birimlerine eklenen güçlendirme/zayıflatma (karşılaşmanın kendi `mods`'u ile birleşir: çarpanlar çarpılır, düz ekler toplanır).
   * Yalnızca güç alanları: hpMult, statMult, powerMult, armorAdd, magicArmorAdd. Yoksa düşmanlar veride yazıldığı gibi.
   */
  enemy?: DifficultyEnemyMods;
  /** Rütbeli birimlere (elit lider / boss) `enemy`'nin ÜSTÜNE eklenen güçlendirme (aynı birleşme kuralı). */
  enemyTier?: Partial<Record<UnitTier, DifficultyEnemyMods>>;
  /**
   * ELİT düğümdeki rütbesiz birimlere (elit liderin eşlikçileri; elit/boss rütbeliler hariç) `enemy`'nin ÜSTÜNE eklenen güçlendirme
   * (aynı birleşme kuralı). Normal/boss düğüm ve Endless etkilenmez; yoksa 1. Ömer 2026-10-19, open-questions 365 seçenek 3.
   */
  eliteEscort?: DifficultyEnemyMods;
  /** Bu zorlukta sefer kurallarının üstüne yazılanlar (ör. zafer sonrası toparlanma `victoryHeal`). Yoksa campaign.json > rules. */
  rules?: Partial<Pick<CampaignRules, 'victoryHeal' | 'bossVictoryHeal'>>;
}

export type DifficultyEnemyMods = Pick<UnitModifiers, 'hpMult' | 'statMult' | 'powerMult' | 'armorAdd' | 'magicArmorAdd'>;

export interface RecruitDef {
  offer: number;
  pick: number;
  /** before = düğüme varınca (savaştan önce); leave = düğümden ayrılırken. */
  when: 'before' | 'leave';
  /** Adaylardan en az biri alan saldırılı sınıf olsun (Ravenwood: alan saldırılarını öğretir). */
  requireArea?: boolean;
  /**
   * Sabit aday listesi, ilk kahramanın (tutorial kahramanı) sınıfına göre (Ömer 2026-10-14: Ravenwood'da warrior -> druid / undead /
   * gambler, archer -> antimage / cutthroat / undead). Varsa çekiliş yapılmaz; kadroda olan sınıflar çıkarılır.
   */
  byFirstHero?: Record<string, string[]>;
}

export interface MapNode {
  id: string;
  type: NodeType;
  name: string;
  subtitle: string;
  /** Tek cümlelik yer anlatısı (oyun içi, İngilizce; Ömer 2026-10-18 "lore yazdır"): "Start battle?" kartında bilgi satırı olarak çıkar. */
  lore?: string;
  region: string;
  /** Arka planın oranı (x, y), rozet merkezi. */
  pos: [number, number];
  /** Etiket plakasının yeri (varsayılan rozetin altı). */
  label?: 'above' | 'below';
  encounter?: string;
  /** Düğümün savaş arka planı (bölgeninkini ezer; karşılaşmanınki bunu ezer). */
  battleBackground?: string;
  event?: string;
  treasure?: string;
  recruit?: RecruitDef;
  /** Varınca iyileşme oranı (kasaba: 1 = tam). */
  heal?: number;
  endsTutorial?: boolean;
  newCompany?: { size: number; leader: 'firstPick' };
  partyCap?: number;
  city?: boolean;
  final?: boolean;
  teaches?: string;
  /** Dinlenme (Ömer 2026-10-11): ücretsiz iyileşme + altınla diriltme (campaign.json > rest). Dinlenme düğümünde ya da başka bir düğümün adımlarından sonra (Shepherd's Fold: olaydan sonra). */
  rest?: boolean;
  /** Tüccar (Odo; campaign.json > merchant): stok düğümün item seviyesinden. */
  merchant?: boolean;
  /** Tüccar stok boyutu (yoksa campaign.json > merchant.size). Kasabalar (T1): Ashford küçük, Valdren Keep büyük. */
  merchantSize?: number;
  /** Kasabaya girişte bir kez oynayan hikâye sahnesi (events.json > stories; T5, yalnızca metin). */
  story?: string;
  /** Kasaba ekranı (Ömer 2026-10-12): tam ekran arka plan + tıklanabilir yerler (src/campaign/town.ts, src/game/town-screen.ts). */
  scene?: TownSceneDef;
  /**
   * Bu düğümün savaşına özel rütbe çarpanı (yalnızca seferde; karşılaşma Endless ile ortaksa onu bozmadan ayar). Zorluğun enemyTier'ı
   * gibi rütbe -> çarpan; noTierMods'a bakmaz (bilinçli düğüm ayarı). A1-x: boss'lar 21 duraklık yolda güçlenen takıma göre (madde 305).
   */
  enemyTierMods?: Partial<Record<UnitTier, DifficultyEnemyMods>>;
}

/** Kasaba ekranında bir yerin eylemi: tezgâh (Trade), ilan panosu / kışla (aday), hikâye NPC'si (sahne yeniden), ateş (dinlenme notu), çıkış. */
export type TownAction = 'trade' | 'recruit' | 'story' | 'rest' | 'leave' | 'smith'; // smith: demirci (TUR 1 madde 7; kasaba ekranı kendisi açar)

/** Kasaba ekranında tıklanabilir yer. `rect` = arka plan görselinin oranı [x0, y0, x1, y1] (0-1); görsel ölçeklenince birlikte ölçeklenir. */
export interface TownHotspot {
  id: string;
  action: TownAction;
  label: string;
  rect: [number, number, number, number];
  /** Eylem bir şey sunmadığında gösterilen metin (ör. adayı olmayan kasabanın ilan panosu). */
  note?: string;
}

/** Kasaba ekranı: arka plan (assets/towns/<background>.webp), dikey odak (kırpılırken korunacak satır, 0-1) ve yerler. */
export interface TownSceneDef {
  background: string;
  focusY?: number;
  hotspots: TownHotspot[];
}

export interface MapEdge {
  from: string;
  to: string;
  style: EdgeStyle;
  path?: Array<[number, number]>;
}

export interface MapRegion {
  id: string;
  title: string;
  tagline: string;
  label: [number, number];
  battleBackground?: string;
}

export interface CampaignMap {
  id: string;
  title: string;
  subtitle: string;
  blurb: string;
  background: string;
  /** Geniş (21:9) harita görseli; region = eski 16:9 haritanın bu görseldeki kesir dikdörtgeni [x0, y0, x1, y1] (src/game/wide-map.ts). */
  backgroundWide?: { image: string; region: [number, number, number, number] };
  start: string;
  stopsPerRun: number;
  visibility: number;
  alwaysVisible: string[];
  regions: MapRegion[];
  nodes: MapNode[];
  edges: MapEdge[];
}

import type { UnitModifiers, UnitTier } from '../engine/types';
import type { Equipment, ItemInstance, ItemRoll } from '../progression/items';
import type { KillRecord, LevelUp, StatAlloc } from '../progression/levels';

/** Birim bazında güçlendirme/zayıflatma: motorun UnitModifiers'ı (hpMult, statMult, powerMult, spriteScale, actionsPerTurn...). */
export type UnitMods = UnitModifiers;

export interface EncounterUnit {
  class: string;
  slot: number;
  /** Özel ad (motor: displayName). */
  name?: string;
  /** Rütbe (motor: tier): elit lider / boss. */
  tier?: UnitTier;
  boss?: string;
  mods?: UnitMods;
  /** true: zorluğun rütbe eki (campaign.json > difficulties[x].enemyTier) bu birime uygulanmaz; genel `enemy` eki uygulanır. */
  noTierMods?: boolean;
  /** Bu karşılaşmada kullanamayacağı skill'ler (motor: UnitSetup.lockSkills; ör. tutorial düşmanında ultimate yok). */
  lockSkills?: string[];
  /** Başlangıç cooldown'u eki (motor: UnitSetup.initialCooldownBonus; cooldown'lu her skill'e, maxInitial'ı aşabilir). */
  initialCooldownBonus?: number;
}

/** Dalgalı savaşın sonraki bir dalgası (EncounterDef.waves; docs/design/waves.md): birimler ilk dalgayla aynı şemada. */
export interface EncounterWave {
  units: EncounterUnit[];
}

export interface EncounterDef {
  name: string;
  /** İlk dalga (dalgasız karşılaşmada tüm düşmanlar). */
  units: EncounterUnit[];
  /**
   * Dalgalı savaş (Ömer 2026-10-19, docs/design/waves.md): SONRAKİ dalgalar (2., 3. ...); her biri ilk dalga bitince boş düşman tarafına dizilir.
   * Güçlendirme / zorluk / level kuralları ilk dalgadakiyle aynı uygulanır. Yoksa karşılaşma tek dalgadır.
   */
  waves?: EncounterWave[];
  /** Savaş arka planı (assets/backgrounds/<ad>.webp|png|jpg); öncelik: karşılaşma > düğüm > bölge > varsayılan. */
  background?: string;
  /** true: oyuncu kahramanları bu savaşta ölemez (motor UnitSetup.undying; Mill Road açılış savaşı kaybedilemez, docs/design/tutorial.md). */
  partyUndying?: boolean;
  fallback?: string;
  fallbackOnly?: boolean;
}

export interface CampaignRules {
  carryHp: boolean;
  victoryHeal: number;
  /** Boss zaferi: YAŞAYANLAR bu orana iyileşir (düşenler kalkmaz; Ömer 2026-10-11, Endless ile aynı). */
  bossVictoryHeal: number;
  maxSaves: { normal: number; ironman: number };
  /** Sefer yuvası sayısı (3). */
  slots: number;
}

export interface CampaignConfig {
  maps: string[];
  rules: CampaignRules;
  starterPool: string[];
  companyPool: string[];
  recruitPool: string[];
  texts: Record<string, string>;
  tips: Record<string, string>;
  defaultDifficulty: Difficulty;
  difficulties: Record<Difficulty, DifficultyDef>;
  /**
   * Seferin genel düşman ölçeği (Ömer 2026-10-11, ceset kuralı dengesi): her zorlukta aynı, zorluk ekinden ÖNCE (zorluklar arası fark korunur).
   * `all` = rütbesiz ve elit birimler, `boss` = boss rütbeli birimler (`all` yerine). Endless'ı etkilemez (yalnızca sefer battlePlan'ı).
   */
  enemyScale?: { all?: DifficultyEnemyMods; /** Elit düğümdeki boss olmayan birimler (yoksa all). */ elite?: DifficultyEnemyMods; boss?: DifficultyEnemyMods; /** Ölçeğin uygulanmadığı bölgeler (eğitim: I). */ skipRegions?: string[] };
  /**
   * Dinlenme (Ömer 2026-10-11; 2026-10-18 TUR 1 madde 10): kamp ücretsiz iyileşme oranı; kasabada ilk dinlenme bedava, sonrakiler `price`
   * (base + perChapter x bölüm). Dinlenme DİRİLTMEZ (diriltme yalnızca Valor).
   */
  rest: { heal: number; price: { base: number; perChapter: number } };
  /**
   * Serbest dolaşım / devriye (roadmap 2.2-2.3 A; campaign.json > replay): `xp[i]` = düğümün i. yeniden oynanışında XP çarpanı (0 = ilk zafer,
   * son değer taban). Altın ve item çarpanı items.json > loot.repeat'tedir (aynı sayılar). Yoksa yeniden oynama XP'si tam.
   */
  replay?: { xp: number[]; /** Devriyeden geri çekilmede kahraman başına en çok can kaybı (oran, 0-1; Ömer 2026-10-19). */ retreatHpLoss?: number };
  /** Sefer tüccarı (Odo; Endless'takiyle aynı kurallar): stok boyutu, yenileme bedeli, geri alım listesi. */
  merchant: { size: number; rerollCost: number; buybackSize: number };
  /** Kasaba ekranı yerleşimi (1920x1080 birim): kahraman boyu, ayak çizgisi (H oranı; telefonda alt yazıya yer kalsın diye feetYPhone), kahramanlar arası, yer etiketi yazı boyu (masaüstü / telefon). */
  townScreen: { heroHeight: number; feetY: number; feetYPhone: number; gap: number; labelSize: number; labelSizePhone: number };
}

/** Kadrodaki bir karakter. hpRatio 0-1 (savaştan savaşa taşınır). */
export interface Hero {
  id: string;
  class: string;
  hpRatio: number;
  alive: boolean;
  leader?: boolean;
  /** Tutorial takımından mı (Ashford'da ayrılır). */
  tutorial?: boolean;
  /** Level (Ömer 2026-10-17, levels.md; 1-50). Sonradan katılan L1'den başlar. */
  level: number;
  /** Bu level'daki XP (sonraki level'a gereken: progression > xpToNext). */
  xp: number;
  /** Dağıtılmamış temel stat puanları (level başına 3; kayıt sürümü 9, eski kayıtta level'dan tamamlanır). */
  statPoints?: number;
  /** Skill puanları (level başına 1; skill ağacı gelene kadar birikir). */
  skillPoints?: number;
  /** Dağıtılmış temel stat puanları (stat başına puan; progression > baseAttrs). */
  alloc?: StatAlloc;
  /** Takılı item'ler: 6 yuva (weapon, helm, armor, gloves, boots, trinket), boş = null. Güce çevrimi: src/progression/loadout.ts. */
  equipment: Equipment;
}

/**
 * Bir düğümdeki adımlar (sırayla): recruit-before -> farewell -> company -> battle -> treasure -> event -> town -> recruit-leave.
 * Hepsi bitince düğüm temizlenmiş sayılır ve yola çıkılır (move).
 */
export type StepKind = 'hero' | 'recruit' | 'farewell' | 'company' | 'battle' | 'treasure' | 'event' | 'story' | 'town' | 'rest' | 'merchant' | 'volunteer';

/** Sefer durumunun şema sürümü (2: kahraman level/XP/ekipman, torba, altın; eski 1 okunurken tamamlanır: save.ts > normalizeState). */
export const STATE_VERSION = 2;

export interface CampaignState {
  version: 2;
  /** Seferin kimliği (aynı seferin kayıtları buna bakar). */
  campaignId: string;
  mode: CampaignMode;
  /** Genel zorluk (sefer boyunca sabit). */
  difficulty: Difficulty;
  /** Sefer yuvası (0..slots-1). */
  slot: number;
  mapId: string;
  seed: number;
  roster: Hero[];
  /** Aktif takımın dizilimi: 12 hücre (dizin = yuva = sıra*3+şerit), değer = hero id ya da ''. */
  active: string[];
  /** Bulunulan düğüm. */
  at: string;
  /**
   * Yürüyüş günlüğü (başlangıç dahil, sırayla): her girilen düğüm, yolculukta (serbest dolaşım) aradan geçilen temizlenmiş düğümler dahil.
   * İlk geçişte bugünkü rota ile aynıdır. Yürünmüş yollar ardışık çiftlerden çıkar (src/campaign/fog.ts).
   */
  path: string[];
  /** Ayak basılan düğümler (tekil; kayıt sürümü 10, eski kayıtta path'ten türetilir). */
  visited: string[];
  /** İlk içeriği bitmiş (temizlenmiş) düğümler (tekil; eski kayıtta path'ten türetilir). Kasabaya yeniden girmek bunu geri almaz. */
  cleared: string[];
  /** Düğüm başına yeniden oynama (devriye zaferi) sayısı (roadmap 2.2; azalan getiri bundan). */
  replays: Record<string, number>;
  /**
   * Başlatılmış devriye savaşı (temizlenmiş savaş düğümünü yeniden oynama): düğüm id'si. Varken nextStep o düğümün savaşını döndürür; zafer ya da
   * yola çıkmak siler. Yalnızca duraklatılmış savaşla (Retreat to Map) birlikte kayda girer; okunurken duraklatma yoksa atılır.
   */
  patrol?: string;
  /** Tamamlanan adımlar: '<düğüm>:<adım>' (ör. '2:recruit', '2:battle'). */
  done: string[];
  /** Görülen tutorial ipuçları (düğüm id). */
  tipsSeen: string[];
  stats: { victories: number; defeats: number };
  nextHeroId: number;
  /** Sefer torbası (takılı olmayan item'ler; kapasite items.json > bag = 30). */
  inventory: ItemInstance[];
  /** Altın (Aşama 1'de loot/tüccar). */
  gold: number;
  /** Sıradaki item örneği numarası (uid 'i<n>'). */
  nextItemId: number;
  /**
   * Bekleyen teslim (Ashford vedası, items.md karar 7): ayrılan tutorial takımının item'leri torbaya konmuştur; arayüz (Aşama 1) bu kaydı
   * "eski takım bunları size bıraktı" anı olarak gösterip onaylatır (`acknowledgeHandover`). Yoksa ya da onaylandıysa yok.
   */
  pendingHandover?: Handover;
  /** Loot sayaçları (items.md 3.3-3.4): Rare pity, düğüm başına zafer sayısı ('<düğüm>:battle' | '<düğüm>:treasure'; tekrar oynamada azalan ödül). */
  lootState: { rarePity: number; clears: Record<string, number>; rareMisses?: number };
  /** Kasabada dinlenme sayacı (düğüm id -> kaç kez dinlenildi; TUR 1 madde 10: ilk bedava, sonrakiler ücretli). Eski kayıtta yok = hiç. */
  townRests?: Record<string, number>;
  /** Son düşüş: haritada "Spoils" kartı olarak gösterilir, onaylanınca silinir (`acknowledgeLoot`). */
  pendingLoot?: LootDrop;
  /** Açık tüccar (merchant düğümü; Ömer 2026-10-11): tezgâh, bu ziyaretin geri alım listesi, yenileme sayısı. Düğümden ayrılınca silinir. */
  shop?: CampaignShop;
  /**
   * Kapanan tezgâh (Ömer 2026-10-13, "Ashford'a giremiyorum"): kasaba / tüccar düğümünden ayrılmadan (Leave) kapanan tezgâh burada saklanır;
   * aynı düğüme yeniden girilince (revisitNode) aynı mallar, satılanlar ve yenileme sayısı geri gelir (satılan mal yeniden dolmaz). Yola çıkınca silinir.
   */
  closedShop?: CampaignShop;
  /**
   * Seçenekli olayda seçilen seçenek (N2): `battle` = olay savaşı bekliyor (kazanılınca olay biter), `restHeal` = bu düğümün dinlenmesi bu oranla
   * (Shepherd's Fold "Share your bread"). Düğümden ayrılınca silinir. Eski kayıtlarda yok (isteğe bağlı alan; sürüm değişmez).
   */
  eventChoice?: { node: string; choice: string; battle?: string; restHeal?: number };
  /**
   * Valor (Ömer 2026-10-13, data/valor.json): takımın diriltme kaynağı. YOKSA gizli ve birikmez (Valdren Keep hikâyesinden önce); Valdren'in hikâyesi
   * (ya da kasabası) bitince açılır ve hediye ile başlar. Kayıt sürümü 7 (src/campaign/save.ts) eski kayıtları taşır.
   */
  valor?: number;
  /**
   * Duraklatılmış savaş (Ömer 2026-10-14, Endless 0.7.8.1 ile aynı kural): savaş menüsü > Retreat to Map savaşı SIFIRLAMAZ, duraklatır.
   * Bu düğümün savaşı yeniden girilince aynı tura döner (src/campaign/suspend.ts). Varken düğümden ayrılmak, Gear / Formation / Valor
   * diriltmesi kilitli. Zafer ya da yenilgi siler. İsteğe bağlı alan (kayıt sürümü değişmez); bozuk kayıt okunurken atılır.
   */
  suspended?: CampaignSuspended;
  /**
   * Zorunlu Formation (tutorial; Ömer 2026-10-17): savaştan önce katılım olan düğümde (Ravenwood) yeni kahraman katılınca düğüm id'si yazılır;
   * oyuncu Formation'ı açıp kapatana kadar o düğümün savaşı başlamaz, Formation düğmesi parlar (src/campaign/state.ts > formationGate).
   * İsteğe bağlı alan (kayıt sürümü değişmez): eski kayıtta yok = kapı yok (takılma olmaz); başka düğümünse okunurken atılır.
   */
  formationDue?: string;
  /** Gösterilmemiş level atlamaları (Ömer 2026-10-17): haritada "Level Up" kartı gösterilip onaylanınca silinir (`acknowledgeLevelUps`). */
  levelUps?: LevelUp[];
}

/** Sefer savaşının duraklatılmış kaydı: düğüm, savaş seed'i, eylem günlüğü, tur, durum özeti, kurulum parmak izi (src/campaign/suspend.ts). */
export interface CampaignSuspended {
  node: string;
  seed: number;
  actions: ReplayAction[];
  /** Kaydedildiği andaki battle.turnsTaken. */
  turn: number;
  /** Kaydedildiği andaki stateHash (devamda doğrulama). */
  hash: string;
  /** Savaş kurulumunun parmak izi (suspend.ts > resumeKey): takım/ekipman/Valor değiştiyse kayıt kullanılmaz. */
  setup: string;
}

/** Sefer tüccarının tezgâhı (src/campaign/merchant.ts). */
export interface CampaignShop {
  node: string;
  wares: Array<{ itemId: string; rolls?: ItemInstance['rolls']; price: number; sold?: boolean }>;
  buyback: Array<{ item: ItemInstance; price: number }>;
  rerolls: number;
}

/**
 * Bir düğümün düşüşü (kart için): torbaya giren item uid'leri, altın; `left` = torba dolu olduğu için sığmayan item'ler (id). Ömer, madde 280:
 * sığmayan item altına çevrilmez; kart açıkken oyuncu yer açıp alabilir (`takeLeftover`), kart kapanınca (`acknowledgeLoot`) kaybolur.
 */
export interface LootDrop {
  node: string;
  kind: 'battle' | 'elite' | 'boss' | 'treasure';
  items: string[];
  gold: number;
  left?: string[];
  /** Ortak nadir düşüş zarından gelen item id'leri (Spoils kartında altın-turuncu parıltı; madde 297). */
  rare?: string[];
  /** `left` ile aynı sırada: geride kalan item'lerin düşüşte atılmış stat zarları (alınırsa bunlarla gelir). */
  leftRolls?: Array<ItemRoll | undefined>;
  /** Kasaba diyaloğu hediyesi (Spoils kartı başlığı "Gift", altın satırı yok). */
  gift?: boolean;
}

/** Teslim kaydı: kimden (ayrılan kahramanlar), hangi item'ler (torbadaki uid'ler), hangi düğümde. */
export interface Handover {
  node: string;
  from: Array<{ heroId: string; class: string }>;
  items: string[];
}

/** Bir savaşın sonucu (oyuncu birimleri hero id ile). */
export interface BattleOutcome {
  victory: boolean;
  units: Array<{ heroId: string; hpRatio: number; alive: boolean }>;
  /** Savaş sonunda kalan Valor (savaşta harcandıysa azalmış); yoksa durumdaki Valor aynen. */
  valorLeft?: number;
  /** Kusursuz zafer: bu savaşta hiçbir kahraman düşmedi (diriltilse bile düştü sayılır). Yoksa `units`ten: herkes ayakta. */
  flawless?: boolean;
  /** Öldürme kaydı (XP payı; progression > trackKills). Yoksa karşılaşmanın tüm düşmanları, kimse düşmeden öldürülmüş sayılır. */
  kills?: KillRecord[];
}

export type NextStep =
  | { kind: 'hero' }
  | { kind: 'recruit'; node: string; offer: string[] }
  | { kind: 'volunteer'; node: string; offer: string[] }
  | { kind: 'farewell'; node: string }
  | { kind: 'company'; node: string; size: number }
  | { kind: 'battle'; node: string; encounter: string; /** Devriye (temizlenmiş düğümün yeniden oynanışı). */ patrol?: true }
  | { kind: 'treasure'; node: string; treasure: string }
  | { kind: 'event'; node: string; event: string }
  | { kind: 'story'; node: string; story: string }
  | { kind: 'town'; node: string }
  | { kind: 'rest'; node: string }
  | { kind: 'merchant'; node: string }
  /**
   * Yola çıkılabilir. `options` = ileri komşular (eski tek yönlü davranış; otomatik oynatıcılar bunu izler), `back` = serbest dolaşımda geri
   * komşular (yalnızca varsa). Temizlenmiş düğümler üzerinden uzak hedefler: state.ts > travelRoutes.
   */
  | { kind: 'move'; options: string[]; back?: string[] }
  | { kind: 'complete' };
