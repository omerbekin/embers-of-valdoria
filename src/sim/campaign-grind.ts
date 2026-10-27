// Sefer KASMA simülatörü (Ömer 2026-10-19): serbest dolaşım + devriye (temizlenmiş düğümü yeniden oynama) ile oynayan oyuncu vekili.
// npm run sim:campaign (varsayılan --mode=grind; rapor src/sim/campaign-grind-report.ts, hedefler src/sim/campaign-targets.ts).
// Oyun kuralları (campaign.md 2.3; src/campaign/state.ts moveOptions / travelRoutes / startPatrol) aynen çağrılır; burada yalnızca oyuncunun kararları:
// - Yeni düğümde kaybedince aynı savaşı `retries` (2) kez daha dener (yenilgi = son kayda dönüş: savaşa giren takım birebir aynı, seed değişir).
// - Yine kaybederse son kayda (o düğüme yürümeden önceki duruma) döner ve `grindStep` (1) kasma savaşı yapar, sonra düğümü bir kez dener
//   (kas -> dene döngüsü). Kasma yeri: en verimli temizlenmiş tekrar oynanabilir düğüm (pickFarm; puan = beklenen XP x sıradaki ödül oranı x
//   tahmini kazanma şansı). Kaybedilen kasma savaşı bedelsizdir (son kayda dönüş) ama savaş sayılır.
// - O düğüm için `wallCap` kasma savaşından sonra hâlâ geçemezse DUVAR: koşu orada biter (onWall 'force' = zorla geçilir, ölçüm sürer).
//   Kasma yeri hiç yoksa (ör. Ashford sonrası ilk savaş, tutorial) kasma yerine düz tekrar; 1 + retries + wallCap denemede geçemezse duvar (farmsız).
// - Stat puanı: iyi oyuncu ana stata (autoAllocateAll, Medium YZ), ortalama oyuncu dört stata eşit (Easy YZ). İkisi de "Equip best".
// - Valor: iyi oyuncu Medium YZ'nin değer tartan Valor kuralıyla, ortalama oyuncu sim'e özel geç kuralla (lateValorChoice: dost düşünce bir oyuncu turu
//   gecikmeyle, bedel yetiyorsa diriltir; Ömer 2026-10-20). İkisi de zaferden sonra savaş dışı ceset diriltmeyi (autoValorRevive) kullanır.
// - Can (oyuncu varsayımı; ekonomi reworkü 2026-10-26, open-questions 424): ateş başı dinlenmesi yok. Savaştan önce önce Valor ile yara siler
//   (simValorWoundHeal: bir savaş dışı diriltme payının üstündeki Valor'la en çok yaralı kahramanın 1 yarası; iyi ve ortalama oyuncu aynı). Sonra Inn
//   (innCycle): iyileşen Inn konukları geri alınır (elit / boss öncesi hepsi); simNeedsRest (normal öncesi ort. can `healAt` %50 altı YA DA 2+ yaralı;
//   elit / boss öncesi %75 altı YA DA herhangi yara) doğruysa en kötü kahraman (4 kişilikte en çok 1) son temizlenen kasabanın Inn'ine bırakılır;
//   normal öncesi takım eksik ilerler, elit / boss öncesi devriyeyle gün geçirip bekler (en çok 8 savaş, 2 yenilgi üst üste = vazgeç). Yürümek bedava.
// - Level farmı (Ömer 2026-10-26; open-questions 425): sıradaki yeni düğümden önce fark = düğüm level - aktif takımın ort. level'ı (Inn'dekiler hariç)
//   iki tipte de 2'yi aşarsa (ortalama 3 -> 2, Ömer 2026-10-27) farm: (1) ulaşılabilir, hiç gidilmemiş, rotada olmayan savaşlı düğüm (yan dal; ilk zaferin XP / loot /
//   altını): elit / savaşlı hazine / savaşlı olay fark <= 1 iken ve önce (getiri), normal savaş fark eşik içindeyse; aynı sınıfta en yüksek level'lı; kaybedilirse son kayda dönülür, o düğüm atlanır (duvar sayılmaz); (2) yan dal yoksa
//   devriye: en az tekrarlanmış (XP çarpanı en yüksek), sonra level'ı en yüksek, farkı eşik içinde kalan düğüm. Fark eşiğe inince ya da hedef başına
//   LEVEL_FARM_CAP (6) farm savaşında devam. Rota aynı kalır; duvar / kasma kuralları ayrı sayılır.
// - Kamp (tek seçim, simCampChoice): yaralı varsa Tend, ort. can %60 altıysa Rest, yoksa Sharpen (takılı en değerli item), olmazsa Train (en düşük level).
// - Demirci (demircili temizlenmiş kasaba varsa, her yola çıkışta): önce Combine (Ömer 2026-10-26: Common'lar girmez; torbada 3+ Uncommon+ item:
//   aynı taban üçlüsü önce, yoksa en düşük değerli üç; para sıradaki Temper payını karşılamıyorsa ertelenir), sonra Temper: eldeki taş + altınla
//   takılı en değerli item'den başlayarak. Reforge / Reroll kullanılmaz.
// - Tüccar (--merchant, varsayılan sell; Ömer 2026-10-20): tüccar adımında / tüccarlı kasabada, parası sıradaki Temper payından fazlaysa takılı
//   item'dan IP olarak daha iyi bir mal alır. 'sell' = önce torbayı satar: Common'lar ve Combine'a giremeyenler satılır, Combine'lık en değerli
//   SIM_COMBINE_KEEP (6) item bekler; para Temper payını karşılamıyorsa hepsi satılır. --rest-price etkisiz (dinlenme kalktı).
// - Seçenek bayrakları (--repeat, --valor-revive, --rest-price): YALNIZCA bu sim sürecinde bellekteki veriyi geçici değiştirir (simOverrides; koşu
//   bitince eski değerler geri konur), veri dosyası ve oyun kodu değişmez.
import { valorInBattle, valorOutside, type ValorSimMode } from './valor-mode';
import { type AiDifficulty } from '../engine';
import { valorRules } from '../engine/content';
import { valorEarned } from '../engine/valor';
import {
  CONFIG,
  activeHeroes,
  applyBattle,
  continueToMap,
  withReachOpen,
  autoAllocateAll,
  autoResolve,
  autoValorRevive,
  buyWare,
  openCampaignShop,
  sellToMerchant,
  battlePlan,
  battleXp,
  canReplay,
  clearedNodes,
  completeSimple,
  equipBest,
  farewell,
  formCompany,
  getMap,
  isFallen,
  moveTo,
  newCampaign,
  nextStep,
  node,
  battleOutcomeOf,
  pickHero,
  recruit,
  replayCount,
  replayMult,
  rngFor,
  roamOpen,
  shuffle,
  startPatrol,
  temperItem,
  temperPreview,
  temperStonesOf,
  combineItemBlocked,
  combineItems,
  combinePreview,
  dayOf,
  innGuests,
  innLeaveBlocked,
  innTakeBlocked,
  leaveAtInn,
  takeFromInn,
  revisitNode,
  townHasSmith,
  useCamp,
  nodeLevel,
  travelRoutes,
  visitedNodes,
  type CampaignState,
  type Difficulty,
} from '../campaign';
import { BAG_SIZE, canEquip, classUsesOffhand, fitsSlot, instanceIlvl, instanceIP, instanceRarity, instanceRoll, itemDef, itemValue, ITEMS, RARITY_IDS, SLOT_IDS, type RarityId } from '../progression/items';
import { woundCount } from '../progression/wounds';
import { autoTreeHeroes, withTreesInMemory } from './tree-sim';
import type { TreeDir } from '../progression/skill-tree-data';
import { ATTRS, LEVELS, addXp, allocate, campaignMaxLevel, canAddPoint, xpToNext } from '../progression/levels';
import { addCarry, allRoutes, emptyCarry, fightPlan, routeLabel, simCampChoice, simInnPicks, simInnReady, simMapChain, simNeedsRest, simValorWoundHeal, type SimCarry } from './campaign';
import { CAMPAIGN_TARGETS } from './campaign-targets';

export type PlayerType = 'good' | 'average';
/** Oyuncu tipinin savaş YZ vekili: iyi = Medium, ortalama = Easy. */
export const PLAYER_AI: Record<PlayerType, AiDifficulty> = { good: 'medium', average: 'easy' };

export interface GrindSimOptions {
  /** Skill ağacı (Faz 6; --tree=a|b): oyuncu vekili puanları odaklı kurulumla bu yönde harcar, ağaç bu süreçte bellekte açık (tree-sim.ts). */
  tree?: TreeDir;
  difficulty: Difficulty;
  player: PlayerType;
  runs: number;
  firstSeed?: number;
  /** Koşu i'nin rotası: (i + routeOffset) % rota sayısı (paralel parçalar için). */
  routeOffset?: number;
  /** Duvar sınırı (kasma savaşı); yoksa CAMPAIGN_TARGETS.wallCap[zorluk]. */
  wallCap?: number;
  /** Yeni düğümde ilk yenilgiden sonra kasmadan önceki tekrar sayısı (varsayılan 2). */
  retries?: number;
  /** Bir kas -> dene döngüsündeki kasma savaşı (varsayılan 1). */
  grindStep?: number;
  /** Duvarda: 'stop' = koşu biter (varsayılan), 'force' = düğüm zorla geçilir, ölçüm sürer. */
  onWall?: 'stop' | 'force';
  /** Aşırı kasma koşusu: Ashford sonrası ilk iki tekrar oynanabilir düğüm temizlenince önceden yapılan kasma savaşı (varsayılan 0). */
  preGrind?: number;
  /** Inn eşiği (simNeedsRest: normal savaş öncesi yaşayanların ort. can oranı; 0 = Inn kullanmaz). Varsayılan 0,5. */
  healAt?: number;
  valor?: ValorSimMode;
  /** Tekrar (devriye) loot kesintisi (items.json > loot.repeat), yalnızca simde: today = veri aynen (varsayılan), soft / nocap / off (repeatPreset). */
  repeat?: RepeatMode;
  /** Tüccardan alışveriş (varsayılan 'sell' (Ömer 2026-10-20); 'off' = eski ölçümle birebir): 'on' = alır, 'sell' = önce torbayı satar sonra alır. */
  merchant?: MerchantMode;
  /** Valor diriltme bedeli [savaşta, savaş dışında] (valor.json > revive), yalnızca simde. */
  valorRevive?: [number, number];
  /** Ücretli kasaba dinlenmesinin L1 fiyatı (campaign.json > rest.price.base; level başına artış aynen), yalnızca simde. */
  restPrice?: number;
  /** Güç kaldıracı ölçümü (yalnızca sim; varsayılan 0 = bugünkü davranış). Bkz. GrindBonus. */
  bonus?: Partial<GrindBonus>;
  /**
   * Ölçülen harita (--map; varsayılan Harita 1). Harita 2+: her koşu önce önceki haritaları aynı seed ve aynı oyuncu kurallarıyla oynar
   * (simMapChain), bitirirse continueToMap ile taşınır; sayaçlar (düğüm, rota, ekonomi, ön kasma) yalnız hedef haritanın. Önceki haritada
   * duvara vuran koşu hedefe ulaşamaz: sonuçta sayılmaz, carry.prevStopped'a yazılır. Bonuslar (level / altın) bölük kurulunca (Harita 1) verilir.
   */
  map?: string;
}

/**
 * Güç kaldıracı (--bonus-level / --bonus-ilvl / --bonus-gold; Ömer 2026-10-20): hangi kaynağın kazanma oranını ne kadar değiştirdiği.
 * level: bölük kurulunca (Ashford, newCompany adımı) kadrodaki herkes XP eşiklerini doldurarak N level atlar (stat / skill puanı oyun kuralıyla;
 *   proxy normal dağıtır, level atlayan tam iyileşir), sonra XP eğrisi normal işler (sonradan katılan joinLevel'la ortalamadan gelir).
 * ilvl: her savaş kurulumunda (yeni düğüm ve kasma) takılı her item'in seviyesi +N (geçici kopya; kayıttaki item, demirci tavanı, tüccar
 *   ve seviye şartı değişmez; bölüm tavanını aşabilir).
 * gold: bölük kurulunca bir kez +N altın (proxy demirci / tüccar / dinlenme kurallarıyla harcar).
 */
export interface GrindBonus {
  level: number;
  ilvl: number;
  gold: number;
}
export const NO_BONUS: GrindBonus = { level: 0, ilvl: 0, gold: 0 };
export const bonusOf = (b?: Partial<GrindBonus>): GrindBonus => ({ ...NO_BONUS, ...(b ?? {}) });

/** Takılı item'leri +n ilvl ile kopyalanmış durum (yalnızca savaş kurulumu için; n <= 0 ise aynen). */
export function withIlvlBonus(s: CampaignState, n: number): CampaignState {
  if (!(n > 0)) return s;
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  for (const h of t.roster)
    for (const k of SLOT_IDS) {
      const it = h.equipment?.[k];
      if (it && itemDef(it.id)) h.equipment![k] = { ...it, rolls: { ...instanceRoll(it), ilvl: instanceIlvl(it) + n } };
    }
  return t;
}

/** Kadrodaki herkese n level (XP eşiği doldurularak, oyunun addXp kuralı; level atlayan ayaktaysa tam iyileşir). */
export function withLevelBonus(s: CampaignState, n: number): CampaignState {
  if (!(n > 0)) return s;
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  for (const h of t.roster) {
    for (let k = 0; k < n; k++) if (!addXp(h, Math.max(1, xpToNext(h.level ?? 1) - (h.xp ?? 0)), LEVELS, campaignMaxLevel())) break;
    if (!isFallen(h)) h.hpRatio = 1;
  }
  return t;
}

export type RepeatMode = 'today' | 'soft' | 'nocap' | 'off';
export type MerchantMode = 'off' | 'on' | 'sell';
type RepeatRow = { items: number; gold: number; maxRarity: RarityId };

/** --repeat seçenekleri: bugünkü tablodan türetilir (today = aynen; soft = 1 / 0,8 / 0,65 / 0,5 tavan aynen; nocap = oran aynen tavan yok; off = hepsi 1). */
export function repeatPreset(mode: RepeatMode, today: readonly RepeatRow[] = ITEMS.loot.repeat): RepeatRow[] {
  const soft = [1, 0.8, 0.65, 0.5];
  switch (mode) {
    case 'soft':
      return today.map((r, i) => ({ ...r, items: soft[Math.min(i, soft.length - 1)]!, gold: soft[Math.min(i, soft.length - 1)]! }));
    case 'nocap':
      return today.map((r) => ({ ...r, maxRarity: 'legendary' as RarityId }));
    case 'off':
      return today.map(() => ({ items: 1, gold: 1, maxRarity: 'legendary' as RarityId }));
    default:
      return today.map((r) => ({ ...r }));
  }
}

/**
 * Seçenek bayraklarını bellekteki veriye uygular (yalnızca bu süreç; dosya yazılmaz) ve geri alma fonksiyonu döner. Oyun kodu bu değerleri her
 * çağrıda okur (rollLoot > ITEMS.loot.repeat, townRestPrice > CONFIG.rest.price, Battle / YZ > valorRules.revive), koşu boyunca geçerli olur.
 */
export function simOverrides(o: Pick<GrindSimOptions, 'repeat' | 'valorRevive' | 'restPrice'>): () => void {
  const undo: Array<() => void> = [];
  if (o.repeat && o.repeat !== 'today') {
    const old = ITEMS.loot.repeat;
    ITEMS.loot.repeat = repeatPreset(o.repeat, old);
    undo.push(() => (ITEMS.loot.repeat = old));
  }
  if (o.valorRevive) {
    const old = { ...valorRules.revive };
    valorRules.revive.battleCost = o.valorRevive[0];
    valorRules.revive.outsideCost = o.valorRevive[1];
    undo.push(() => Object.assign(valorRules.revive, old));
  }
  // restPrice: ücretli kasaba dinlenmesi kalktı (Ömer 2026-10-26, yerine Inn); bayrak artık etkisiz (balance-tester kaldırabilir)
  return () => undo.reverse().forEach((f) => f());
}

/** Ekonomi ve ölüm / Valor sayaçları (tüm koşuların toplamı; paralel parçalar toplanır). */
export interface GrindEcon {
  /** Altının kaynağı: ilk zafer normal / elit / boss, tekrar (devriye) zaferi, hazine sandığı, item satışı. */
  goldBattle: number;
  goldElite: number;
  goldBoss: number;
  goldReplay: number;
  goldTreasure: number;
  goldSell: number;
  /** Tüccarda harcanan. */
  goldMerchant: number;
  /** Düşen item: ilk zafer, tekrar zaferi, hazine; torba dolu olduğu için kaybolan (bunlara dahil). */
  itemsFirst: number;
  itemsReplay: number;
  itemsTreasure: number;
  itemsLost: number;
  /** Düşen item'lerin nadirlik dağılımı (kaybolanlar dahil). */
  rarity: Record<string, number>;
  /** Düşen item'lerden koşu içinde en az bir kez takılan. */
  itemsEquipped: number;
  itemsSold: number;
  itemsBought: number;
  /** Alınan item'lerden takılan. */
  boughtEquipped: number;
  merchantVisits: number;
  /** Kazanılan savaş sonunda düşmüş kalıp yaralı kalkan (+1 yara) ve 3 yarayla ceset olan kahraman. */
  wounds: number;
  corpses: number;
  /** Valor: savaş kazancı (tavan sonrası), tavana vurup boşa giden, Valdren hediyesi; savaşta / savaş dışında harcanan ve diriltme sayısı. */
  valorEarned: number;
  valorWasted: number;
  valorGift: number;
  valorSpentBattle: number;
  valorSpentOut: number;
  revivesBattle: number;
  revivesOut: number;
  /** Savaş dışı Valor ile silinen yara (simValorWoundHeal; Ömer 2026-10-26). Harcanan Valor valorSpentOut'a da girer. */
  woundsHealedValor: number;
  /** Ekonomi reworkü (2026-10-26): harita başı / sonu gün (dayOf; koşu başına toplam), Inn (bırakma, geri alma, kalış günü toplamı, beklerken devriye savaşı). */
  dayStart: number;
  dayEnd: number;
  innLeaves: number;
  innReturns: number;
  innDays: number;
  innBattles: number;
  /** Kamp seçimleri (simCampChoice). */
  campRest: number;
  campTend: number;
  campSharpen: number;
  campTrain: number;
  /** Temper taşı: kazanılan (düşüş) ve demircide harcanan; Combine sayısı ve altını. */
  stonesGained: number;
  stonesSpent: number;
  combines: number;
  goldCombine: number;
  /** Level farmı (Ömer 2026-10-26): yeni düğümden önce takım geride kalınca; yan dal ilk zafer savaşı / devriye savaşı ayrı, temizlenen yan dal,
   *  6 farm tavanına ulaşılan hedef düğüm, hedef düğüm başına farm savaşı. */
  lfNew: number;
  /** lfNew'in elit / savaşlı hazine / olay olanı. */
  lfRich: number;
  lfPatrol: number;
  sideCleared: number;
  lfCap: number;
  lfNodes: Record<string, number>;
}

/** Toplanabilir düğüm sayaçları (paralel parçalar birleştirilir). */
export interface GrindNodeAgg {
  /** Düğüme ulaşan koşu (ilk deneme). */
  reached: number;
  firstWins: number;
  cleared: number;
  /** Geçen koşularda yeni düğüm denemesi toplamı ve kasma savaşı toplamı; kasma gereken koşu sayısı. */
  attemptsSum: number;
  grindSum: number;
  grindRuns: number;
  /** Duvara vuran koşuların o düğüm için yaptığı kasma savaşları. */
  grindWall: number;
  walls: number;
  /** Duvarın kasma yeri olmadan (düz tekrarla) olanı. */
  noFarmWalls: number;
  /** Bu düğümün kendi savaşları (yeni düğüm denemeleri; kasma savaşları farmBattles'ta). */
  battles: number;
  wins: number;
  hpEndSum: number;
  deathsOnWin: number;
  hpStartSum: number;
  turnsSum: number;
  /** Tur histogramı (tüm savaşlar: yeni düğüm + bu düğümde yapılan kasma). */
  turnHist: Record<string, number>;
  /** İlk varışta: takımın ort. level'ı, takılı item'lerin ort. item seviyesi, kahraman başına takılı item. */
  lvSum: number;
  ilvlSum: number;
  gearSum: number;
  /** Bu düğüm kasma yeri olarak: savaş / zafer. */
  farmBattles: number;
  farmWins: number;
  /** İlk varışta: takılı item başına ort. IP, kahraman başına toplam IP, kahraman başına yara, takımdaki ceset. */
  ipSum: number;
  ipHeroSum: number;
  woundInSum: number;
  corpseInSum: number;
  /** Bu düğümün kazanılan savaşlarında alınan yara / ceset. */
  woundsTaken: number;
  corpses: number;
}

export interface GrindGroupAgg {
  runs: number;
  completed: number;
  walls: number;
  /** Düğüm geçmek için yapılan kasma savaşı (aşırı kasma koşusunun ön kasması hariç). */
  grind: number;
  battles: number;
}

export interface GrindSimResult {
  difficulty: Difficulty;
  player: PlayerType;
  preGrind: number;
  wallCap: number;
  runs: number;
  completed: number;
  walls: number;
  /** Tüm savaşlar (yeni düğüm denemeleri + kasma), kasma savaşları, ön kasma (aşırı kasma koşusu), yenilgiler. */
  battles: number;
  grindBattles: number;
  preGrindBattles: number;
  defeats: number;
  goldEarned: number;
  /** --bonus-gold ile verilen altın (goldEarned'e dahil DEĞİL; harcamalar ve kesedeki altın bunu da içerir). */
  goldBonus: number;
  goldSmith: number;
  goldRest: number;
  tempers: number;
  rests: number;
  /** Koşu sonunda takımın ort. level'ı toplamı. */
  levelEnd: number;
  /** Seçenekler (metin; parçalar birleşince ilkinden). */
  repeat: RepeatMode;
  merchant: MerchantMode;
  /** Güç kaldıracı (parçalar birleşince ilkinden; toplanmaz). */
  bonus: GrindBonus;
  /** Yalnız Harita 1 dışı ölçümde: ölçülen harita ve önceki haritadan taşınan takımın özeti (src/sim/campaign.ts > SimCarry). */
  map?: string;
  carry?: SimCarry;
  econ: GrindEcon;
  nodes: Record<string, GrindNodeAgg>;
  routes: Record<string, GrindGroupAgg>;
  classes: Record<string, GrindGroupAgg>;
}

const emptyNode = (): GrindNodeAgg => ({
  reached: 0, firstWins: 0, cleared: 0, attemptsSum: 0, grindSum: 0, grindRuns: 0, grindWall: 0, walls: 0, noFarmWalls: 0, battles: 0, wins: 0, hpEndSum: 0,
  deathsOnWin: 0, hpStartSum: 0, turnsSum: 0, turnHist: {}, lvSum: 0, ilvlSum: 0, gearSum: 0, farmBattles: 0, farmWins: 0,
  ipSum: 0, ipHeroSum: 0, woundInSum: 0, corpseInSum: 0, woundsTaken: 0, corpses: 0,
});
const emptyEcon = (): GrindEcon => ({
  goldBattle: 0, goldElite: 0, goldBoss: 0, goldReplay: 0, goldTreasure: 0, goldSell: 0, goldMerchant: 0, itemsFirst: 0, itemsReplay: 0, itemsTreasure: 0,
  itemsLost: 0, rarity: Object.fromEntries(RARITY_IDS.map((r) => [r, 0])), itemsEquipped: 0, itemsSold: 0, itemsBought: 0, boughtEquipped: 0, merchantVisits: 0,
  wounds: 0, corpses: 0, valorEarned: 0, valorWasted: 0, valorGift: 0, valorSpentBattle: 0, valorSpentOut: 0, revivesBattle: 0, revivesOut: 0, woundsHealedValor: 0,
  dayStart: 0, dayEnd: 0, innLeaves: 0, innReturns: 0, innDays: 0, innBattles: 0, campRest: 0, campTend: 0, campSharpen: 0, campTrain: 0,
  stonesGained: 0, stonesSpent: 0, combines: 0, goldCombine: 0, lfNew: 0, lfRich: 0, lfPatrol: 0, sideCleared: 0, lfCap: 0, lfNodes: {},
});
const emptyGroup = (): GrindGroupAgg => ({ runs: 0, completed: 0, walls: 0, grind: 0, battles: 0 });
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Ortalama oyuncu: stat puanlarını dört stata eşit dağıtır (her puan en az puan almış, kurala uyan stata; eşitlikte str, dex, int, luck). */
export function equalAllocateAll(s: CampaignState): CampaignState {
  if (!s.roster.some((h) => (h.statPoints ?? 0) > 0)) return s;
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  for (const h of t.roster) {
    while ((h.statPoints ?? 0) > 0) {
      const cur = h.alloc ?? {};
      const k = ATTRS.filter((a) => canAddPoint(h.class, cur, a)).sort((a, b) => (cur[a] ?? 0) - (cur[b] ?? 0))[0];
      if (!k) break;
      allocate(h, { [k]: 1 });
    }
  }
  return t;
}

/** Düğümde (kazanılırsa) takımın alacağı toplam XP (ilk zafer çarpanıyla; level farkı / yakalama kuralları dahil). */
export function expectedXp(s: CampaignState, nodeId: string): number {
  const n = node(getMap(s.mapId), nodeId);
  if (!n.encounter) return 0;
  const t = { ...s, at: nodeId } as CampaignState;
  const units = activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: 1, alive: true }));
  return Object.values(battleXp(t, { victory: true, units }, n.encounter)).reduce((a, b) => a + b, 0);
}

/**
 * Kasma yeri (VARSAYIM, open-questions): yola çıkılabilir durumda gidilebilen temizlenmiş tekrar oynanabilir düğümler arasında
 * puan = beklenen XP (expectedXp) x sıradaki devriyenin ödül oranı (replay.xp) x bu koşudaki kazanma tahmini ((zafer + 1) / (savaş + 2)) en yüksek olan.
 */
export function pickFarm(s: CampaignState, record?: Map<string, { w: number; n: number }>): string | null {
  if (!roamOpen(s) || nextStep(s).kind !== 'move') return null;
  const map = getMap(s.mapId);
  const reach = travelRoutes(s);
  let best: string | null = null;
  let bestScore = -1;
  for (const id of clearedNodes(s)) {
    if (!canReplay(map, node(map, id)) || (id !== s.at && !reach.has(id))) continue;
    const r = record?.get(id) ?? { w: 0, n: 0 };
    const score = expectedXp(s, id) * replayMult(replayCount(s, id) + 1) * ((r.w + 1) / (r.n + 2));
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

/** Level farmı eşiği (Ömer 2026-10-26): düğüm level - aktif takımın ort. level'ı bu farkı aşarsa farm; iyi 2, ortalama 2 (Ömer 2026-10-27: ortalama 3 -> 2, ortalama oyuncu hiç farm yapmıyordu). Tavan: hedef başına 6 savaş. */
export const LEVEL_FARM_GAP: Record<PlayerType, number> = { good: 2, average: 2 };
export const LEVEL_FARM_CAP = 6;
const teamLevel = (s: CampaignState): number => mean(activeHeroes(s).map((h) => h.level ?? 1));

/** Getirisi yüksek yan dal (elit, savaşlı hazine / olay) yalnız fark bu kadar ya da azken (Ömer 2026-10-26: "lvl farkı azsa onları da yapabilir"). */
export const LEVEL_FARM_RICH_GAP = 1;

/**
 * Level farmı (1): ulaşılabilir, hiç gidilmemiş, rotada olmayan savaşlı düğüm (yan dal). Normal savaş: fark <= gap; elit / savaşlı hazine / savaşlı
 * olay: fark <= LEVEL_FARM_RICH_GAP. Getiri önce: uygun elit / hazine / olay varsa normalden önce; aynı sınıfta en yüksek level'lı.
 */
function pickSideNode(s: CampaignState, route: string[], skip: Set<string>, gap: number): string | null {
  if (nextStep(s).kind !== 'move') return null;
  const map = getMap(s.mapId);
  const seen = new Set(visitedNodes(s));
  const lv = teamLevel(s);
  let best: string | null = null;
  let bestKey = -Infinity;
  for (const id of travelRoutes(s).keys()) {
    const n = node(map, id);
    if (seen.has(id) || route.includes(id) || skip.has(id) || !n.encounter) continue;
    const rich = n.type === 'elite' || n.type === 'treasure' || n.type === 'event';
    if (!rich && n.type !== 'battle') continue;
    const l = nodeLevel(s.mapId, id);
    if (l - lv > (rich ? Math.min(gap, LEVEL_FARM_RICH_GAP) : gap)) continue;
    const key = (rich ? 1000 : 0) + l;
    if (key <= bestKey) continue;
    best = id;
    bestKey = key;
  }
  return best;
}

/** Level farmı (2): devriye; en az tekrarlanmış (XP çarpanı en yüksek), sonra level'ı en yüksek, farkı eşik içinde kalan temizlenmiş düğüm. */
function pickLevelPatrol(s: CampaignState, gap: number): string | null {
  if (!roamOpen(s) || nextStep(s).kind !== 'move') return null;
  const map = getMap(s.mapId);
  const reach = travelRoutes(s);
  const lv = teamLevel(s);
  let best: string | null = null;
  let bm = -1;
  let bl = -Infinity;
  for (const id of clearedNodes(s)) {
    if (!canReplay(map, node(map, id)) || (id !== s.at && !reach.has(id))) continue;
    const l = nodeLevel(s.mapId, id);
    if (l - lv > gap) continue;
    const m = replayMult(replayCount(s, id) + 1);
    if (m > bm + 1e-9 || (Math.abs(m - bm) < 1e-9 && l > bl)) {
      best = id;
      bm = m;
      bl = l;
    }
  }
  return best;
}

const clearedTowns = (s: CampaignState): string[] => {
  const map = getMap(s.mapId);
  return clearedNodes(s).filter((id) => node(map, id).type === 'town');
};

/** Demircili temizlenmiş kasabalar (Ömer 2026-10-26: demirci 2. kasabadan; serbest dolaşımda yürümek bedava). */
const smithTowns = (s: CampaignState): string[] => clearedTowns(s).filter((id) => townHasSmith(node(getMap(s.mapId), id)));

/** Sim Combine'a girebilir mi (Ömer 2026-10-26): oyunun kuralı (torbada, Legendary / set değil) + Common DEĞİL (Common'lar satılır). */
const simCombinable = (s: CampaignState, uid: string): boolean => !combineItemBlocked(s, uid) && instanceRarity(s.inventory.find((i) => i.uid === uid)!) !== 'common';

/** Sıradaki Temper payı: takılı en değerli, taşı yeten ve takanın level'ı uygun item'in Temper altını (yoksa 0). */
function temperReserve(s: CampaignState): number {
  const gear = activeHeroes(s)
    .flatMap((h) => SLOT_IDS.map((k) => h.equipment?.[k]).filter((x): x is NonNullable<typeof x> => !!x))
    .sort((a, b) => itemValue(b) - itemValue(a));
  for (const w of gear) {
    const p = temperPreview(s, w.uid);
    if (p?.after && p.stonesHave >= p.stones && (!p.blocked || p.blocked.includes('gold'))) return p.price;
  }
  return 0;
}

/** Tüccarda satılmadan Combine için torbada bekleyen en çok item (iki üçlü). */
export const SIM_COMBINE_KEEP = 6;

/** Inn sim bekleme sınırı: Inn'deki kahraman iyileşene kadar en çok bu kadar devriye savaşı (kaybedilen dahil). */
export const SIM_INN_MAX_BATTLES = 8;

/** Takımın (yaşayan) bir kahramanına göre malın IP kazancı: uygun yuvadaki takılı item'den IP farkı (boş yuva = 0); en iyi kahraman. */
function wareGain(s: CampaignState, w: { itemId: string; rolls?: unknown }): number {
  const d = itemDef(w.itemId);
  if (!d) return 0;
  const ip = instanceIP({ id: w.itemId, rolls: w.rolls });
  let best = 0;
  for (const h of activeHeroes(s)) {
    if (isFallen(h) || !canEquip(h.class, d)) continue;
    for (const k of SLOT_IDS) {
      if (!fitsSlot(d, k) || (k === 'offhand' && !classUsesOffhand(h.class))) continue;
      const cur = h.equipment?.[k];
      best = Math.max(best, ip - (cur ? instanceIP(cur) : 0));
    }
  }
  return best;
}

export function simulateGrind(o: GrindSimOptions): GrindSimResult {
  const restore = simOverrides(o);
  try {
    return withTreesInMemory(!!o.tree, () => simulateGrindRuns(o));
  } finally {
    restore();
  }
}

function simulateGrindRuns(o: GrindSimOptions): GrindSimResult {
  // Zincir (--map): hedef Harita 1 değilse önceki haritalar önce oynanır, sayaçları atılan bir kopyaya (scratch) yazılır.
  const chain = simMapChain(o.map ?? CONFIG.maps[0]!);
  const chainRoutes = chain.map((id) => allRoutes(getMap(id)));
  let map = getMap(chain[0]!);
  const wallCap = o.wallCap ?? CAMPAIGN_TARGETS.wallCap[o.difficulty];
  const retries = o.retries ?? 2;
  const grindStep = Math.max(1, o.grindStep ?? 1);
  const healAt = o.healAt ?? 0.5;
  const ai = PLAYER_AI[o.player];
  const res: GrindSimResult = {
    difficulty: o.difficulty, player: o.player, preGrind: o.preGrind ?? 0, wallCap, runs: 0, completed: 0, walls: 0, battles: 0, grindBattles: 0,
    preGrindBattles: 0, defeats: 0, goldEarned: 0, goldBonus: 0, goldSmith: 0, goldRest: 0, tempers: 0, rests: 0, levelEnd: 0,
    repeat: o.repeat ?? 'today', merchant: o.merchant ?? 'sell', bonus: bonusOf(o.bonus), econ: emptyEcon(), nodes: {}, routes: {}, classes: {},
  };
  if (chain.length > 1) {
    res.map = chain[chain.length - 1]!;
    res.carry = emptyCarry();
  }
  const bonus = res.bonus;
  // Sayaçların yazıldığı sonuç: hedef haritada `res`, önceki haritalarda atılan kopya
  const scratch: GrindSimResult = JSON.parse(JSON.stringify({ ...res, carry: undefined })) as GrindSimResult;
  let R = res;
  let E = R.econ;
  const nodeAgg = (id: string) => (R.nodes[id] ??= emptyNode());
  // Koşu içi item izleme (her koşuda sıfırlanır): düşen / alınan item uid'leri ve takılmış olanlar
  let dropped = new Set<string>();
  let bought = new Set<string>();
  let worn = new Set<string>();
  const track = (t: CampaignState): CampaignState => {
    for (const h of t.roster)
      for (const k of SLOT_IDS) {
        const uid = h.equipment?.[k]?.uid;
        if (uid && !worn.has(uid) && (dropped.has(uid) || bought.has(uid))) {
          worn.add(uid);
          if (dropped.has(uid)) E.itemsEquipped++;
          else E.boughtEquipped++;
        }
      }
    return t;
  };
  const withTree = (s: CampaignState): CampaignState => (o.tree ? { ...s, roster: autoTreeHeroes(s.roster, o.tree) } : s);
  const prepare = (s: CampaignState) => track(equipBest(withTree(o.player === 'good' ? autoAllocateAll(s) : equalAllocateAll(s))));
  /** Bir loot işleminin (zafer / sandık) düşürdüğü item'ler ve altın: kaynak sayaçlarına. */
  const countLoot = (before: CampaignState, after: CampaignState, src: 'first' | 'replay' | 'treasure', gold: 'goldBattle' | 'goldElite' | 'goldBoss' | 'goldReplay' | 'goldTreasure') => {
    E[gold] += after.gold - before.gold;
    let n = 0;
    for (const inst of after.inventory) {
      const k = Number(inst.uid.slice(1));
      if (inst.uid.startsWith('i') && k >= before.nextItemId && k < after.nextItemId) {
        dropped.add(inst.uid);
        E.rarity[instanceRarity(inst)] = (E.rarity[instanceRarity(inst)] ?? 0) + 1;
        n++;
      }
    }
    const pl = after.pendingLoot;
    const prevLeft = pl && before.pendingLoot?.node === pl.node ? (before.pendingLoot.left?.length ?? 0) : 0;
    (pl?.left ?? []).slice(prevLeft).forEach((id, i) => {
      const r = instanceRarity({ id, rolls: pl!.leftRolls?.[prevLeft + i] });
      E.rarity[r] = (E.rarity[r] ?? 0) + 1;
      E.itemsLost++;
      n++;
    });
    if (src === 'first') E.itemsFirst += n;
    else if (src === 'replay') E.itemsReplay += n;
    else E.itemsTreasure += n;
  };
  /** Zafer uygulanır + sayaçlar (loot, Valor, yara); `a` = yeni düğümün kendi zaferi ise o düğümün sayaçları. */
  const win = (t: CampaignState, out: Parameters<typeof applyBattle>[1], a?: GrindNodeAgg): CampaignState => {
    const patrol = t.patrol === t.at;
    const type = node(map, t.at).type;
    const after = applyBattle(t, out);
    countLoot(t, after, patrol ? 'replay' : 'first', patrol ? 'goldReplay' : type === 'boss' ? 'goldBoss' : type === 'elite' ? 'goldElite' : 'goldBattle');
    // Valor (applyBattle ile aynı hesap): savaşta harcanan, kazanılan, tavana vurup boşa giden
    if (t.valor !== undefined && after.valor !== undefined) {
      const start = out.valorLeft ?? t.valor;
      E.valorSpentBattle += Math.max(0, t.valor - start);
      const flawless = out.flawless ?? out.units.every((u) => u.alive && u.hpRatio > 0);
      const raw = patrol ? 0 : valorEarned(valorRules, type === 'boss' ? 'boss' : type === 'elite' ? 'elite' : 'normal', flawless);
      E.valorEarned += after.valor - start;
      E.valorWasted += Math.max(0, raw - (after.valor - start));
    }
    E.revivesBattle += Object.values(out.valorRevived ?? {}).reduce((x, y) => x + y, 0);
    // Savaş sonunda düşmüş: ayakta girdiyse yaralı kalkar (+1 yara) ya da lethal yarayla ceset olur (girerken ceset olan sayılmaz)
    for (const u of out.units) {
      if (u.alive && u.hpRatio > 0) continue;
      const b = t.roster.find((h) => h.id === u.heroId);
      const h = after.roster.find((x) => x.id === u.heroId);
      if (!b || !h || isFallen(b)) continue;
      const corpse = isFallen(h);
      if (corpse) E.corpses++;
      else E.wounds++;
      if (a) corpse ? a.corpses++ : a.woundsTaken++;
    }
    return after;
  };
  /** Savaş dışı Valor diriltmesi (sayaçlı). */
  const reviveOut = (t: CampaignState): CampaignState => {
    if (!valorOutside(o.valor)) return t;
    const after = autoValorRevive(t);
    if (t.valor !== undefined && after.valor !== undefined) E.valorSpentOut += t.valor - after.valor;
    E.revivesOut += after.roster.filter((h) => !isFallen(h) && t.roster.some((b) => b.id === h.id && isFallen(b))).length;
    return after;
  };
  /** Valdren hediyesi gibi savaş dışı Valor açılışı. */
  const gift = (t: CampaignState, after: CampaignState): CampaignState => {
    if (t.valor === undefined && after.valor !== undefined) E.valorGift += after.valor;
    return after;
  };
  const merchantMode = o.merchant ?? 'sell';

  for (let i = 0; i < o.runs; i++) {
    const seed = (o.firstSeed ?? 1) + i;
    let route: string[] = [];
    let label = '';
    // Seçimler düğüme bağlı seed'li (son kayda dönüşte yeniden yaşanan adım aynı seçimi yapar)
    const pick = (tag: string) => rngFor(seed, 'campaign-grind', tag);
    let s: CampaignState = newCampaign({ mode: 'normal', seed, difficulty: o.difficulty });
    let base: CampaignState | null = null;
    let ctx = new Map<string, { tries: number; grinds: number }>();
    let farmRec = new Map<string, { w: number; n: number }>();
    let grindFor: string | null = null;
    let sideFor: string | null = null;
    let skipSide = new Set<string>();
    let levelFarm = new Map<string, number>();
    let grindLeft = 0;
    let preLeft = 0;
    let wall = false;
    let stop = false;
    let runGrind = 0;
    let runBattles = 0;
    let spent = 0;
    let runBonusGold = 0;
    let goldStart = 0;
    let stoneStart = 0;
    let stonesRun = 0;
    const company = new Set<string>();

    /** Savaş öncesi: önce savaş dışı Valor yara silme (diriltme payı üstü), sonra gerekirse kasaba dinlenmesi (hard = sıradaki elit / boss). */
    const heal = (t: CampaignState): CampaignState => {
      if (valorOutside(o.valor)) {
        const v = simValorWoundHeal(t);
        if (v.healed) {
          E.woundsHealedValor += v.healed;
          E.valorSpentOut += (t.valor ?? 0) - (v.state.valor ?? 0);
          t = v.state;
        }
      }
      return t;
    };
    /**
     * Demirci (demircili temizlenmiş kasaba varsa, her yola çıkışta): 1) Combine: torbada birleştirilebilir 3+ item varsa (aynı taban üçlüsü önce,
     * yoksa en düşük değerli üç) parası yettikçe birleştirir, sonra Equip best; 2) Temper: eldeki taş + altınla takılı en değerli item'den başlayarak.
     */
    const smith = (t: CampaignState): CampaignState => {
      if (!smithTowns(t).length) return t;
      for (let guard = 0; guard < 10; guard++) {
        const pool = t.inventory.filter((i) => simCombinable(t, i.uid)).sort((a, b) => itemValue(a) - itemValue(b));
        if (pool.length < 3) break;
        const byBase = new Map<string, typeof pool>();
        for (const i of pool) byBase.set(i.id, [...(byBase.get(i.id) ?? []), i]);
        const same = [...byBase.values()].find((g) => g.length >= 3);
        const uids = (same ?? pool).slice(0, 3).map((i) => i.uid);
        const p = combinePreview(t, uids);
        if (p.blocked || t.gold - p.price < temperReserve(t)) break; // para darsa Combine ertelenir (önce Temper; tüccarda satılır)
        t = combineItems(t, uids);
        E.combines++;
        E.goldCombine += p.price;
        spent += p.price;
        t = track(equipBest(t));
      }
      for (let guard = 0; guard < 60; guard++) {
        const gear = activeHeroes(t)
          .flatMap((h) => SLOT_IDS.map((k) => h.equipment?.[k]).filter((x): x is NonNullable<typeof x> => !!x))
          .sort((a, b) => itemValue(b) - itemValue(a));
        let done = false;
        for (const w of gear) {
          const p = temperPreview(t, w.uid);
          if (!p || p.blocked || !p.after) continue;
          t = temperItem(t, w.uid);
          R.goldSmith += p.price;
          R.tempers++;
          E.stonesSpent += p.stones;
          stonesRun += p.stones;
          spent += p.price;
          done = true;
          break;
        }
        if (!done) break;
      }
      return t;
    };
    /**
     * Tüccar (--merchant; tüccar adımında ya da tüccarlı kasabanın kasaba adımında, ilk varışta). VARSAYIM (open-questions): pay = sıradaki
     * Temper (en değerli silah) + bir ücretli dinlenme; bu payın üstündeki parayla IP kazancı en yüksek mal alınır, sonra Equip best.
     */
    const shop = (t: CampaignState): CampaignState => {
      if (merchantMode === 'off') return t;
      t = openCampaignShop(t);
      E.merchantVisits++;
      // 'sell': Common'lar ve Combine'a giremeyenler satılır; Combine'lık (Uncommon+) item'ler torbada bekler. Para sıradaki Temper payını
      // karşılamıyorsa önce hepsi satılır (Ömer 2026-10-26).
      // Torba dolmasın: en çok SIM_COMBINE_KEEP (6 = iki üçlü) Combine'lık item bekler, en değerliler.
      const sellAll = t.gold < temperReserve(t);
      const keep = new Set(
        sellAll ? [] : t.inventory.filter((i) => simCombinable(t, i.uid)).sort((a, b) => itemValue(b) - itemValue(a)).slice(0, SIM_COMBINE_KEEP).map((i) => i.uid),
      );
      if (merchantMode === 'sell')
        for (const inst of [...t.inventory]) {
          if (keep.has(inst.uid)) continue;
          const g = t.gold;
          t = sellToMerchant(t, inst.uid);
          E.goldSell += t.gold - g;
          E.itemsSold++;
        }
      for (let guard = 0; guard < 20; guard++) {
        const top = activeHeroes(t)
          .map((h) => h.equipment?.weapon)
          .filter((w): w is NonNullable<typeof w> => !!w)
          .sort((a, b) => itemValue(b) - itemValue(a))[0];
        const tp = top ? temperPreview(t, top.uid) : null;
        const reserve = tp && !tp.blocked && tp.after ? tp.price : 0;
        if (t.inventory.length >= BAG_SIZE) break;
        const wares = t.shop!.wares;
        const pickIdx = wares
          .map((w, i) => ({ i, w, g: w.sold ? 0 : wareGain(t, w) }))
          .filter((x) => x.g > 0 && t.gold - x.w.price >= reserve)
          .sort((x, y) => y.g - x.g)[0]?.i;
        if (pickIdx === undefined) break;
        const price = wares[pickIdx]!.price;
        const uid = `i${t.nextItemId}`;
        t = buyWare(t, pickIdx);
        bought.add(uid);
        E.itemsBought++;
        E.goldMerchant += price;
        spent += price;
        t = track(equipBest(t));
      }
      return t;
    };
    const hist = (a: GrindNodeAgg, turns: number) => (a.turnHist[turns] = (a.turnHist[turns] ?? 0) + 1);
    /** Bir kasma savaşı (yola çıkılabilir durumda): kazanırsa durum ilerler, kaybederse son kayda dönülür (durum aynen). */
    const grindOnce = (forNode: string | null, inn = false, farmAt?: string): boolean => {
      s = heal(prepare(s));
      const f = farmAt ?? pickFarm(s, farmRec);
      if (!f) return false;
      let t = s.at === f ? s : moveTo(s, f);
      t = startPatrol(t);
      const rec = farmRec.get(f) ?? { w: 0, n: 0 };
      const plan = battlePlan(withIlvlBonus(t, bonus.ilvl), rec.n - rec.w); // kaybedilen devriye yeniden oynanınca seed değişsin
      const battle = fightPlan(plan, ai, valorInBattle(o.valor), o.player === 'average');
      const fa = nodeAgg(f);
      fa.farmBattles++;
      hist(fa, battle.turnsTaken);
      R.battles++;
      runBattles++;
      if (forNode) {
        ctx.get(forNode)!.grinds++;
        R.grindBattles++;
        runGrind++;
      } else if (inn) E.innBattles++;
      else if (farmAt) E.lfPatrol++;
      else R.preGrindBattles++;
      rec.n++;
      if (battle.winner === 'party') {
        rec.w++;
        fa.farmWins++;
        s = reviveOut(win(t, battleOutcomeOf(plan, battle, true)));
      } else R.defeats++;
      farmRec.set(f, rec);
      return true;
    };
    /**
     * Inn (Ömer 2026-10-26; oyuncu varsayımı, open-questions 424). Yürümek bedava ve gün harcamaz; gün yalnız zaferle (ilk zafer / devriye) döner.
     * Yeni düğümden önce sırayla:
     * 1) innFetch: Inn'de iyileşmiş (simInnReady) kahramanlar bırakıldıkları kasabadan geri alınır; elit / boss öncesi iyileşmemiş olanlar da.
     * 2) simNeedsRest doğruysa simInnPicks (4 kişilik takımda en çok 1, en kötüsü) en son temizlenen kasabanın Inn'ine bırakılır.
     *    Normal düğüm öncesi takım eksik İLERLER (gün ilerledikçe Inn iyileştirir, sonra 1. adım geri alır). Elit / boss öncesi bekler: devriye
     *    yaparak gün geçirir (en çok SIM_INN_MAX_BATTLES savaş, üst üste 2 yenilgide vazgeçer), sonra geri alır.
     * Yedekle doldurma yok (yedek yalnız Saltmere kışlasında; sim'de 0).
     */
    const atTown = (t: CampaignState, town: string): CampaignState | null => {
      const u = revisitNode(t.at === town ? t : moveTo(t, town));
      return nextStep(u).kind === 'town' ? u : null;
    };
    const innFetch = (all: boolean): void => {
      const towns = [...new Set(innGuests(s).filter((g) => g.mapId === s.mapId && (all || simInnReady(g.hero))).map((g) => g.town))];
      for (const town of towns) {
        let u = atTown(s, town);
        if (!u) continue;
        for (const g of innGuests(u, town))
          if ((all || simInnReady(g.hero)) && !innTakeBlocked(u, g.hero.id)) {
            E.innDays += dayOf(u) - g.day;
            E.innReturns++;
            u = takeFromInn(u, g.hero.id);
          }
        s = prepare(completeSimple(u, 'town'));
      }
    };
    const innCycle = (hard: boolean): void => {
      innFetch(hard);
      if (!simNeedsRest(s, healAt, hard)) return;
      if (hard && !pickFarm(s, farmRec)) return; // bekleyecek devriye yok: tam takımla dene
      const towns = clearedTowns(s);
      const town = towns[towns.length - 1];
      if (!town) return;
      let t = atTown(s, town);
      if (!t) return;
      let left = 0;
      for (const id of simInnPicks(t, healAt, hard))
        if (!innLeaveBlocked(t, id)) {
          t = leaveAtInn(t, id);
          left++;
        }
      if (!left) return;
      E.innLeaves += left;
      s = completeSimple(t, 'town');
      if (!hard) return;
      // Gün geçir: devriye (yalnız zafer gün ilerletir); üst üste 2 yenilgide vazgeç (eksik takım devriyeyi kaldıramıyor)
      const clock = (x: CampaignState) => dayOf(x) + (x.dayProgress ?? 0);
      for (let k = 0, lost = 0; k < SIM_INN_MAX_BATTLES && lost < 2 && innGuests(s, town).some((g) => !simInnReady(g.hero)); k++) {
        const c0 = clock(s);
        if (!grindOnce(null, true)) break;
        lost = clock(s) > c0 ? 0 : lost + 1;
      }
      innFetch(true);
    };
    const hitWall = (id: string, noFarm: boolean) => {
      const a = nodeAgg(id);
      a.walls++;
      a.grindWall += ctx.get(id)?.grinds ?? 0;
      if (noFarm) a.noFarmWalls++;
      wall = true;
      if ((o.onWall ?? 'stop') === 'stop') stop = true;
      else s = win(s, { victory: true, units: activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: h.hpRatio, alive: !isFallen(h) })) });
    };

    let reachedTarget = true;
    for (let phase = 0; phase < chain.length; phase++) {
    const last = phase === chain.length - 1;
    map = getMap(chain[phase]!);
    R = last ? res : scratch;
    E = R.econ;
    const routes = chainRoutes[phase]!;
    route = routes[(i + (o.routeOffset ?? 0)) % routes.length]!;
    label = routeLabel(map, route);
    if (phase > 0) {
      if (nextStep(s).kind !== 'complete') {
        // önceki harita bitmedi (duvar): hedefe ulaşılamadı, koşu sayılmaz
        res.carry!.attempted++;
        res.carry!.prevStopped++;
        reachedTarget = false;
        break;
      }
      // M-J / M-K: sim olay seçmez (Charter a ship yok); Harita 2 deniz kilidi ve Caravel kapısı simde açık sayılır (eski davranış)
      s = withReachOpen(getMap(chain[phase]!), continueToMap(s, chain[phase]!));
      if (last) {
        res.carry!.attempted++;
        addCarry(res.carry!, s);
      }
    }
    // Harita başına sıfırlanan koşu durumu (Harita 1 tek aşamada bugünkü davranışla aynı)
    base = null;
    ctx = new Map();
    farmRec = new Map();
    grindFor = null;
    sideFor = null;
    skipSide = new Set();
    levelFarm = new Map();
    grindLeft = 0;
    preLeft = last ? (o.preGrind ?? 0) : 0;
    wall = false;
    stop = false;
    runGrind = 0;
    runBattles = 0;
    spent = 0;
    if (phase > 0) runBonusGold = 0;
    goldStart = phase > 0 ? s.gold : 0;
    stoneStart = temperStonesOf(s);
    stonesRun = 0;
    E.dayStart += dayOf(s);
    dropped = new Set();
    bought = new Set();
    worn = new Set();

    for (let guard = 0; guard < 20000 && !stop; guard++) {
      const step = nextStep(s);
      if (step.kind === 'complete') break;
      switch (step.kind) {
        case 'hero':
          s = pickHero(s, CONFIG.starterPool[pick('hero').int(0, CONFIG.starterPool.length - 1)]!);
          break;
        case 'recruit':
        case 'volunteer': {
          const c = step.offer[pick(`recruit:${step.node}`).int(0, step.offer.length - 1)]!;
          s = recruit(s, c);
          if (step.kind === 'volunteer') company.add(c);
          break;
        }
        case 'farewell':
          s = farewell(s);
          break;
        case 'company': {
          const picks = shuffle(CONFIG.companyPool, pick('company')).slice(0, step.size);
          picks.forEach((c) => company.add(c));
          s = formCompany(s, picks);
          s = withLevelBonus(s, bonus.level);
          if (bonus.gold > 0) {
            s = { ...s, gold: s.gold + bonus.gold };
            runBonusGold += bonus.gold;
          }
          break;
        }
        case 'treasure': {
          const t = completeSimple(s, step.kind);
          countLoot(s, t, 'treasure', 'goldTreasure');
          s = t;
          break;
        }
        case 'town':
          if (node(map, s.at).merchant) s = shop(s);
          s = gift(s, completeSimple(s, step.kind));
          break;
        case 'event':
        case 'story':
          s = gift(s, completeSimple(s, step.kind));
          break;
        case 'merchant':
          s = autoResolve(shop(s), step);
          break;
        case 'rest': {
          const c = simCampChoice(s);
          s = useCamp(s, c);
          E[c.kind === 'rest' ? 'campRest' : c.kind === 'tend' ? 'campTend' : c.kind === 'sharpen' ? 'campSharpen' : 'campTrain']++;
          break;
        }
        case 'battle': {
          const id = step.node;
          const c = ctx.get(id) ?? { tries: 0, grinds: 0 };
          ctx.set(id, c);
          const a = nodeAgg(id);
          s = prepare(s);
          const party = activeHeroes(withIlvlBonus(s, bonus.ilvl)); // güç sütunları savaşa giren (bonuslu) item'lerle
          if (c.tries === 0) {
            a.reached++;
            a.hpStartSum += mean(party.map((h) => h.hpRatio));
            a.lvSum += mean(party.map((h) => h.level ?? 1));
            const items = party.flatMap((h) => SLOT_IDS.map((k) => h.equipment?.[k]).filter((x): x is NonNullable<typeof x> => !!x));
            a.ilvlSum += mean(items.map((x) => instanceIlvl(x)));
            a.gearSum += items.length / Math.max(1, party.length);
            a.ipSum += mean(items.map((x) => instanceIP(x)));
            a.ipHeroSum += items.reduce((x, y) => x + instanceIP(y), 0) / Math.max(1, party.length);
            a.woundInSum += mean(party.map((h) => woundCount(h)));
            a.corpseInSum += party.filter((h) => isFallen(h)).length;
          }
          const plan = battlePlan(withIlvlBonus(s, bonus.ilvl), c.tries);
          const battle = fightPlan(plan, ai, valorInBattle(o.valor), o.player === 'average');
          c.tries++;
          a.battles++;
          a.turnsSum += battle.turnsTaken;
          hist(a, battle.turnsTaken);
          R.battles++;
          runBattles++;
          if (battle.winner === 'party') {
            a.wins++;
            if (c.tries === 1) a.firstWins++;
            a.cleared++;
            a.attemptsSum += c.tries;
            a.grindSum += c.grinds;
            if (c.grinds > 0) a.grindRuns++;
            const out = battleOutcomeOf(plan, battle, true);
            a.hpEndSum += mean(out.units.map((u) => (u.alive ? u.hpRatio : 0)));
            a.deathsOnWin += out.units.filter((u) => !u.alive).length;
            s = reviveOut(win(s, out, a));
            if (sideFor === id) {
              E.sideCleared++;
              sideFor = null;
            }
            break;
          }
          R.defeats++;
          if (sideFor === id) {
            // yan dal farmı kaybedildi: son kayda dön (yan dala yürümeden önceki durum), bu düğüm atlanır; duvar / kasma sayılmaz
            skipSide.add(id);
            sideFor = null;
            s = base!;
            break;
          }
          if (c.tries < 1 + retries) break; // aynı savaşı yeniden dene (son kayıt = aynı takım)
          const canFarm = !!base && !!pickFarm(base, farmRec);
          if (!canFarm) {
            if (c.tries >= 1 + retries + wallCap) hitWall(id, true);
          } else if (c.grinds >= wallCap) hitWall(id, false);
          else {
            s = base!; // son kayda dön (düğüme yürümeden önceki durum), kas
            grindFor = id;
            grindLeft = grindStep;
          }
          break;
        }
        case 'move': {
          if (grindLeft > 0 && grindFor) {
            if (!grindOnce(grindFor)) grindLeft = 0;
            else grindLeft--;
            break;
          }
          if (preLeft > 0 && roamOpen(s)) {
            const farmable = clearedNodes(s).filter((id) => canReplay(map, node(map, id))).length;
            if (farmable >= 2) {
              while (preLeft > 0 && grindOnce(null)) preLeft--;
              preLeft = 0;
              break;
            }
          }
          const seen = new Set(visitedNodes(s));
          const target = route.find((id) => !seen.has(id));
          if (!target) {
            stop = true;
            break;
          }
          const tt = node(map, target).type;
          s = heal(smith(s));
          innCycle(tt === 'elite' || tt === 'boss'); // elit / boss öncesi sıkı dinlenme eşiği (2026-10-26)
          // Level farmı (Ömer 2026-10-26): takım hedefin gerisindeyse önce yan dal ilk zaferleri, sonra devriye; hedef başına en çok LEVEL_FARM_CAP
          const lfGap = LEVEL_FARM_GAP[o.player];
          const lfN = levelFarm.get(target) ?? 0;
          if (nodeLevel(s.mapId, target) - teamLevel(s) > lfGap) {
            if (lfN < LEVEL_FARM_CAP) {
              const side = pickSideNode(s, route, skipSide, lfGap);
              if (side) {
                levelFarm.set(target, lfN + 1);
                E.lfNew++;
                if (node(map, side).type !== 'battle') E.lfRich++;
                E.lfNodes[target] = (E.lfNodes[target] ?? 0) + 1;
                base = s;
                sideFor = side;
                s = moveTo(s, side);
                break;
              }
              const pf = pickLevelPatrol(s, lfGap);
              if (pf) {
                levelFarm.set(target, lfN + 1);
                E.lfNodes[target] = (E.lfNodes[target] ?? 0) + 1;
                grindOnce(null, false, pf);
                break;
              }
            } else if (lfN === LEVEL_FARM_CAP) {
              E.lfCap++;
              levelFarm.set(target, lfN + 1); // bir kez say
            }
          }
          base = s;
          s = moveTo(s, target);
          break;
        }
      }
    }
    }
    if (!reachedTarget) continue;
    E.dayEnd += dayOf(s);
    E.stonesGained += temperStonesOf(s) + stonesRun - stoneStart;
    const done = !wall && nextStep(s).kind === 'complete';
    res.runs++;
    if (done) res.completed++;
    if (wall) res.walls++;
    res.goldEarned += s.gold + spent - runBonusGold - goldStart;
    res.goldBonus += runBonusGold;
    res.levelEnd += mean(activeHeroes(s).map((h) => h.level ?? 1));
    const groups = [(res.routes[label] ??= emptyGroup()), ...[...company].map((c) => (res.classes[c] ??= emptyGroup()))];
    for (const g of groups) {
      g.runs++;
      if (done) g.completed++;
      if (wall) g.walls++;
      g.grind += runGrind;
      g.battles += runBattles;
    }
  }
  return res;
}

/** Sayı alanlarını iç içe toplar (paralel parçalar; metin alanları ilk parçadan). */
function deepAdd(into: Record<string, unknown>, from: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(from)) {
    if (typeof v === 'number') into[k] = ((into[k] as number | undefined) ?? 0) + v;
    else if (v && typeof v === 'object') deepAdd((into[k] ??= {}) as Record<string, unknown>, v as Record<string, unknown>);
    else if (!(k in into)) into[k] = v;
  }
}

/** Paralel parçaların sonuçlarını toplar (aynı zorluk, oyuncu tipi ve ön kasma). */
export function mergeGrindResults(parts: GrindSimResult[]): GrindSimResult {
  const out = JSON.parse(JSON.stringify(parts[0]!)) as GrindSimResult;
  for (const p of parts.slice(1)) deepAdd(out as unknown as Record<string, unknown>, p as unknown as Record<string, unknown>);
  out.wallCap = parts[0]!.wallCap;
  out.preGrind = parts[0]!.preGrind;
  out.bonus = bonusOf(parts[0]!.bonus);
  return out;
}
