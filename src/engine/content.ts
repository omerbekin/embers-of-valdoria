// İçerik kayıt defteri: data/ altındaki JSON'ları motor tiplerine bağlar.
// Yeni class = data/classes/<id>.json + aşağıya bir satır (skills.json ve ai.json tek dosya, satır gerekmez).
import aiJson from '../../data/ai.json';
import formulasJson from '../../data/formulas.json';
import skillsJson from '../../data/skills.json';
import globalSkillsJson from '../../data/global-skills.json';
import valorJson from '../../data/valor.json';
import wavesJson from '../../data/waves.json';
import firstBattle from '../../data/battles/first-battle.json';
import randomBattle from '../../data/battles/random-battle.json';
import aoeTester from '../../data/classes/aoe_tester.json';
import poseTester1 from '../../data/classes/pose_tester_1.json';
import poseTester2 from '../../data/classes/pose_tester_2.json';
import poseTester3 from '../../data/classes/pose_tester_3.json';
import poseTester4 from '../../data/classes/pose_tester_4.json';
import poseTester5 from '../../data/classes/pose_tester_5.json';
import poseTester6 from '../../data/classes/pose_tester_6.json';
import poseTester7 from '../../data/classes/pose_tester_7.json';
import poseTester8 from '../../data/classes/pose_tester_8.json';
import poseTester9 from '../../data/classes/pose_tester_9.json';
import poseTester10 from '../../data/classes/pose_tester_10.json';
import poseTester11 from '../../data/classes/pose_tester_11.json';
import antimage from '../../data/classes/antimage.json';
import archer from '../../data/classes/archer.json';
import cutthroat from '../../data/classes/cutthroat.json';
import defender from '../../data/classes/defender.json';
import druid from '../../data/classes/druid.json';
import gambler from '../../data/classes/gambler.json';
import hexer from '../../data/classes/hexer.json';
import mage from '../../data/classes/mage.json';
import paladin from '../../data/classes/paladin.json';
import undead from '../../data/classes/undead.json';
import warrior from '../../data/classes/warrior.json';
import skeleton from '../../data/summons/skeleton.json';
import treant from '../../data/summons/treant.json';
import bridgeWarden from '../../data/bosses/bridge_warden.json';
import ironMooring from '../../data/bosses/iron_mooring.json';
import lordMorvane from '../../data/bosses/lord_morvane.json';
import weirWyrm from '../../data/bosses/weir_wyrm.json';
import admiralVane from '../../data/bosses/admiral_vane.json';
import drownedQueen from '../../data/bosses/drowned_queen.json';
import mobRoadThug from '../../data/mobs/road_thug.json';
import mobMoorRaider from '../../data/mobs/moor_raider.json';
import mobBanditCrossbowman from '../../data/mobs/bandit_crossbowman.json';
import mobEmberAcolyte from '../../data/mobs/ember_acolyte.json';
import mobCharcoalBurner from '../../data/mobs/charcoal_burner.json';
import mobShieldwarden from '../../data/mobs/shieldwarden.json';
import mobStoneboundWarden from '../../data/mobs/stonebound_warden.json';
import mobThaneOfTheDeep from '../../data/mobs/thane_of_the_deep.json';
import mobFenWitchling from '../../data/mobs/fen_witchling.json';
import mobHedgeWitchMorwen from '../../data/mobs/hedge_witch_morwen.json';
import mobWillOWisp from '../../data/mobs/will_o_wisp.json';
import mobGhoul from '../../data/mobs/ghoul.json';
import mobDrowned from '../../data/mobs/drowned.json';
import mobDeepRunecaller from '../../data/mobs/deep_runecaller.json';
import mobGraveChanter from '../../data/mobs/grave_chanter.json';
import mobOathswornBrother from '../../data/mobs/oathsworn_brother.json';
import mobCenserMonk from '../../data/mobs/censer_monk.json';
import mobHighPriest from '../../data/mobs/high_priest_of_the_undying.json';
import mobCutpurse from '../../data/mobs/cutpurse.json';
import mobGreyWolf from '../../data/mobs/grey_wolf.json';
import mobRavenwoodPoacher from '../../data/mobs/ravenwood_poacher.json';
import mobRavenSeer from '../../data/mobs/raven_seer.json';
import mobBanditChief from '../../data/mobs/bandit_chief.json';
// Bölge III (mob-plan.md 10)
import mobMorvaneHalberdier from '../../data/mobs/morvane_halberdier.json';
import mobSwornGuard from '../../data/mobs/sworn_guard.json';
import mobAshHound from '../../data/mobs/ash_hound.json';
import mobCinderGatewarden from '../../data/mobs/cinder_gatewarden.json';
import mobEmberHierophant from '../../data/mobs/ember_hierophant.json';
import mobDrakePriest from '../../data/mobs/drake_priest.json';
// Harita 2 The Drowned Reach (maps-2-3.md 3.3; kendi çizimleri, denge yer tutucularının kopyası)
import mobCorsairCutlass from '../../data/mobs/corsair_cutlass.json';
import mobCorsairSlinger from '../../data/mobs/corsair_slinger.json';
import mobSaltCrab from '../../data/mobs/salt_crab.json';
import mobWeirEel from '../../data/mobs/weir_eel.json';
import mobSiren from '../../data/mobs/siren.json';
import mobDrownedKnight from '../../data/mobs/drowned_knight.json';
import mobBrineMaiden from '../../data/mobs/brine_maiden.json';
import mobReaverArcher from '../../data/mobs/reaver_archer.json';
import mobReefWrecker from '../../data/mobs/reef_wrecker.json';
import mobRiverReaver from '../../data/mobs/river_reaver.json';
import mobCliffCrossbowman from '../../data/mobs/cliff_crossbowman.json';
// Harita 2 elit önderleri (kendi kitleri, content-designer 2026-10-27)
import mobReaverChiefHook from '../../data/mobs/reaver_chief_hook.json';
import mobSaltHagMother from '../../data/mobs/salt_hag_mother.json';
import mobGuildEnforcerBastion from '../../data/mobs/guild_enforcer_bastion.json';
import mobInquisitorCaptainVell from '../../data/mobs/inquisitor_captain_vell.json';
import mobWreckerCaptain from '../../data/mobs/wrecker_captain.json';
import mobCorsairCaptainMarrow from '../../data/mobs/corsair_captain_marrow.json';
import mobSirenQueen from '../../data/mobs/siren_queen.json';
import mobSaltBishop from '../../data/mobs/salt_bishop.json';
import mobDrownedChampion from '../../data/mobs/drowned_champion.json';
import groundsJson from '../../data/grounds.json';
import battleRulesJson from '../../data/battle-rules.json';
import statusesJson from '../../data/statuses.json';
import type { AiConfig } from './ai';
import type { BattleSetup } from './battle';
import { Rng } from './rng';
import { planRangeFormation, type FormationWeights, type PlanUnit } from './formation-ai';
import { placementHints, type HintRules, type PlacementHint } from './formation-hints';
import { AREA_TARGETS } from './area-shape';
import { FOE_TARGETS, skillRangeFor } from './range';
import { buildDef } from './stats';
import type { UrnRule, AreaDef, BattleCondition, BattleMode, BattleObjective, BattleRules, CombatantData, CombatantDef, Formulas, GlobalSkillDef, GroundDef, Side, SkillDef, StatusDef, UnitSetup, ValorRules, WaveRules, WaveSetup } from './types';

export interface BattleDef {
  id: string;
  background: string;
  slots: { party: number; enemy: number };
  /** Sabit takımlar (class id'leri). */
  party?: string[];
  enemies?: string[];
  /** Rastgele takımlar: her iki taraf da havuzdan (seed'e göre) `size` farklı class alır. */
  random?: { pool: string[]; size: number };
}

export const formulas: Formulas = formulasJson as unknown as Formulas;

const classData: Record<string, CombatantData> = {
  warrior,
  paladin,
  mage,
  undead,
  archer,
  druid,
  defender,
  antimage,
  gambler,
  cutthroat,
  hexer,
  aoe_tester: aoeTester,
  pose_tester_1: poseTester1,
  pose_tester_2: poseTester2,
  pose_tester_3: poseTester3,
  pose_tester_4: poseTester4,
  pose_tester_5: poseTester5,
  pose_tester_6: poseTester6,
  pose_tester_7: poseTester7,
  pose_tester_8: poseTester8,
  pose_tester_9: poseTester9,
  pose_tester_10: poseTester10,
  pose_tester_11: poseTester11,
} as unknown as Record<string, CombatantData>;

/** Oynanabilir tüm class'lar: iki taraf da aynı havuzdan çeker, görseli sınıfa bağlıdır. */
export const classes: Record<string, CombatantDef> = Object.fromEntries(
  Object.entries(classData).map(([id, data]) => [id, buildDef(data, formulas)]),
);

/**
 * Rastgele takım havuzuna ve denge simülasyonuna giren class id'leri: `testOnly` olmayanlar. Test class'ları (ör. aoe_tester) `classes`ta ve
 * `selectableClasses`ta durur (takım seçimi, debug, wiki, galeri) ama rastgele takımlara ve sim'e girmez.
 */
export const randomPool: string[] = Object.keys(classes).filter((id) => !classes[id]!.testOnly);
/** Oyuncunun takım seçiminde seçebileceği class id'leri (test class'ları dahil; `hidden` olanlar hariç). */
export const selectableClasses: string[] = Object.keys(classes).filter((id) => !classes[id]!.hidden);

/** Class olmayan, yalnızca skill ile çağrılan birimler. */
export const summons: Record<string, CombatantDef> = {
  treant: buildDef(treant as unknown as CombatantData, formulas),
  skeleton: buildDef(skeleton as unknown as CombatantData, formulas),
};

/**
 * Boss tanımları (data/bosses): gizli; rastgele havuzda, takım seçiminde ve denge sim'inde YOK. Yalnızca sefer karşılaşmaları (encounters.json `class`)
 * kullanır. The Bridge Warden ve bağlı yardımcısı Iron Mooring (inert). Class'ların "tam 4 skill / stat toplamı 30" kuralları bunlara uygulanmaz.
 */
export const bosses: Record<string, CombatantDef> = {
  bridge_warden: buildDef(bridgeWarden as unknown as CombatantData, formulas),
  iron_mooring: buildDef(ironMooring as unknown as CombatantData, formulas),
  lord_morvane: buildDef(lordMorvane as unknown as CombatantData, formulas),
  // Harita 2 bossları (kendi kitleri, content-designer 2026-10-27; maps-2-3.md 3.3)
  weir_wyrm: buildDef(weirWyrm as unknown as CombatantData, formulas),
  admiral_vane: buildDef(admiralVane as unknown as CombatantData, formulas),
  drowned_queen: buildDef(drownedQueen as unknown as CombatantData, formulas),
};

const mobData: CombatantData[] = [
  mobRoadThug,
  mobMoorRaider,
  mobBanditCrossbowman,
  mobEmberAcolyte,
  mobCharcoalBurner,
  mobShieldwarden,
  mobStoneboundWarden,
  mobThaneOfTheDeep,
  mobFenWitchling,
  mobHedgeWitchMorwen,
  mobWillOWisp,
  mobGhoul,
  mobDrowned,
  mobDeepRunecaller,
  mobGraveChanter,
  mobOathswornBrother,
  mobCenserMonk,
  mobHighPriest,
  mobCutpurse,
  mobGreyWolf,
  mobRavenwoodPoacher,
  mobRavenSeer,
  mobBanditChief,
  mobMorvaneHalberdier,
  mobSwornGuard,
  mobAshHound,
  mobCinderGatewarden,
  mobEmberHierophant,
  mobDrakePriest,
  mobCorsairCutlass,
  mobCorsairSlinger,
  mobSaltCrab,
  mobWeirEel,
  mobSiren,
  mobDrownedKnight,
  mobBrineMaiden,
  mobReaverArcher,
  mobReefWrecker,
  mobRiverReaver,
  mobCliffCrossbowman,
  mobReaverChiefHook,
  mobSaltHagMother,
  mobGuildEnforcerBastion,
  mobInquisitorCaptainVell,
  mobWreckerCaptain,
  mobCorsairCaptainMarrow,
  mobSirenQueen,
  mobSaltBishop,
  mobDrownedChampion,
] as unknown as CombatantData[];

/**
 * Sefer mobları (data/mobs; N1, docs/design/campaign/fill-plan.md 2): boss'lar gibi GİZLİ birimler. Takım seçiminde, rastgele/hızlı savaşta,
 * Endless havuzunda ve sınıf denge sim'inde YOK; yalnızca sefer karşılaşmaları (encounters.json `class`) kullanır. Class kuralları ("tam 4 skill",
 * stat toplamı) uygulanmaz: mobun 1 temel saldırısı + 1 imza skill'i vardır (birkaçında 3. skill). Yeni mob = data/mobs/<id>.json + yukarıya bir satır.
 */
export const mobs: Record<string, CombatantDef> = Object.fromEntries(mobData.map((d) => [d.id, buildDef(d, formulas)]));

/** Karşılaşmalarda kullanılabilen class olmayan gizli birimler (boss + mob). */
export const encounterUnit = (id: string): CombatantDef | undefined => bosses[id] ?? mobs[id];

// "_not" gibi açıklama alanlarını ayıkla; geriye yalnızca skill tanımları kalır.
export const skills = Object.fromEntries(
  Object.entries(skillsJson as unknown as Record<string, unknown>).filter(([key]) => !key.startsWith('_')),
) as unknown as Record<string, SkillDef>;

const stripNotes = <T>(o: unknown): Record<string, T> =>
  Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([key]) => !key.startsWith('_'))) as Record<string, T>;

/** Buff/debuff tanımları (data/statuses.json). */
export const statuses = stripNotes<StatusDef>(statusesJson);
/** Global skill'ler (data/global-skills.json): rest, skip_turn, move_tile. Class'ların 4 skill'inden ve `skills` tablosundan AYRIDIR. */
export const globalSkills = stripNotes<GlobalSkillDef>(globalSkillsJson);
/** Yerde kalan etki tanımları (data/grounds.json). */
export const grounds = stripNotes<GroundDef>(groundsJson);

/** Valor kuralları (data/valor.json; src/engine/valor.ts). */
export const valorRules = valorJson as unknown as ValorRules;
/** Dalgalı savaş geçiş kuralları (data/waves.json > rules; docs/design/waves.md). */
export const waveRules = wavesJson.rules as WaveRules;

// --- Karşılaşma kuralları (data/battle-rules.json; Harita 2-3 savaş katmanı, maps-2-3.md M-A / B3 / M-B / M-I / M-J) ---

/** data/battle-rules.json biçimi (oyun içi metinler İngilizce; `_` notları atılır). */
export interface BattleRulesData {
  conditions: Record<string, Omit<BattleCondition, 'id'>>;
  objectives: {
    survive: { name: string; goal: string; text: string; rounds: number };
    totem: { name: string; goal: string; text: string; every: number; maxEnemies: number };
    hold: { name: string; goal: string; text: string; row: number };
  };
  layouts: Record<string, { name: string; text: string; blocked: number[] }>;
  /** M-N3 etkileşimli nesneler (Tidewater Urn). */
  devices: Record<string, Omit<UrnRule, 'id'>>;
}
export const battleRulesData = battleRulesJson as unknown as BattleRulesData;

/**
 * Karşılaşmanın kural girdisi (EncounterDef / debug kurulumu): koşul id'si, hedef (id ya da { type, sayılar }), kapalı hücreler (liste ya da
 * layouts anahtarı). Totem takviyesi ayrıca Teams.rules.reinforce ile (dalga biçiminde) gelir.
 */
export interface RulesSpec {
  condition?: string;
  objective?: BattleObjective['type'] | { type: BattleObjective['type']; rounds?: number; every?: number; maxEnemies?: number; row?: number };
  blocked?: number[] | string;
  /** M-N3: etkileşimli nesne (devices anahtarı; `slot` verilirse veri varsayılanı yerine o hücre). */
  device?: string | { id: string; slot?: number };
}

/** Kural girdisinden motorun BattleRules'u (sayılar verilmezse battle-rules.json varsayılanı). Bilinmeyen koşul / düzen / hedef hata verir. Boş girdi = undefined. */
export function resolveBattleRules(spec: RulesSpec | undefined): BattleRules | undefined {
  if (!spec) return undefined;
  const out: BattleRules = {};
  if (spec.condition) {
    const c = battleRulesData.conditions[spec.condition];
    if (!c || spec.condition.startsWith('_')) throw new Error(`Koşul bulunamadı: ${spec.condition}`);
    out.condition = {
      id: spec.condition,
      ...c,
      ...(c.flood ? { flood: { ...c.flood, rows: [...c.flood.rows], boards: [...c.flood.boards] } } : {}),
      ...(c.rangedAccuracy ? { rangedAccuracy: { ...c.rangedAccuracy, motions: [...c.rangedAccuracy.motions] } } : {}),
    };
  }
  if (spec.device) {
    const d = typeof spec.device === 'string' ? { id: spec.device } : spec.device;
    const def = battleRulesData.devices[d.id];
    if (!def || d.id.startsWith('_')) throw new Error(`Nesne bulunamadı: ${d.id}`);
    const { _not: _n, ...rest } = def as typeof def & { _not?: string };
    out.urn = { id: d.id, ...rest, ai: { ...def.ai }, ...(d.slot !== undefined ? { slot: d.slot } : {}) };
  }
  if (spec.objective) {
    const o = typeof spec.objective === 'string' ? { type: spec.objective } : spec.objective;
    const d = battleRulesData.objectives;
    if (o.type === 'survive') out.objective = { type: 'survive', rounds: o.rounds ?? d.survive.rounds };
    else if (o.type === 'totem') out.objective = { type: 'totem', every: o.every ?? d.totem.every, maxEnemies: o.maxEnemies ?? d.totem.maxEnemies };
    else if (o.type === 'hold') out.objective = { type: 'hold', row: o.row ?? d.hold.row };
    else throw new Error(`Hedef bulunamadı: ${(o as { type: string }).type}`);
  }
  if (spec.blocked !== undefined) {
    const list = typeof spec.blocked === 'string' ? battleRulesData.layouts[spec.blocked]?.blocked : spec.blocked;
    if (!list) throw new Error(`Hücre düzeni bulunamadı: ${String(spec.blocked)}`);
    if (list.length) out.blocked = [...list];
    if (typeof spec.blocked === 'string') out.layout = spec.blocked;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Hedefin oyun içi metni (HUD satırı ve ipucu; {n} / {every} doldurulur). */
export function objectiveTexts(o: BattleObjective): { name: string; goal: string; text: string } {
  const d = battleRulesData.objectives[o.type];
  const fill = (s: string) => s.replace(/\{n\}/g, String(o.type === 'survive' ? o.rounds : '')).replace(/\{every\}/g, String(o.type === 'totem' ? o.every : ''));
  return { name: d.name, goal: fill(d.goal), text: fill(d.text) };
}

export const aiConfig = aiJson as unknown as AiConfig;

export const battles: Record<string, BattleDef> = {
  'first-battle': firstBattle,
  'random-battle': randomBattle,
};

/** Oyunun varsayılan savaşı: her seed'de farklı takımlar. */
export const DEFAULT_BATTLE = 'random-battle';

export interface Teams {
  party: string[];
  enemies: string[];
  /** Opsiyonel birim kurulumları (güçlendirme, özel ad, başlangıç canı...); bkz. TeamUnits. Yoksa savaş birebir eskisi gibidir. */
  units?: TeamUnits;
  /** Valor (taraf başına, savaş başı miktarı; yoksa o tarafta Valor yok ve valor_revive görünmez). Sefer/Endless yalnızca party verir. */
  valor?: Partial<Record<Side, number>>;
  /** Crown Surge (taraf başına 'surge' global id'leri; yalnızca sefer, map2-quests-surge.md C12 a). Yoksa Surge görünmez. */
  surge?: Partial<Record<Side, string[]>>;
  /**
   * Dalgalı savaş (docs/design/waves.md): `enemies` İLK dalgadır; burası SONRAKİ dalgalar. Her dalga `enemies` ile aynı biçimde (arrange false: hücre
   * listesi, dizin = yuva, '' = boş; arrange true: sınıf listesi, otomatik dizilir) + isteğe bağlı birim kurulumları (anahtar `units.enemies` ile aynı
   * kural). Yoksa savaş birebir eskisi.
   */
  waves?: TeamWave[];
  /** Karşılaşma kuralları (koşul / hedef / kapalı hücre; resolveBattleRules) + Break the Totem takviye grubu (dalga biçiminde). Yoksa savaş birebir eskisi. */
  rules?: RulesSpec & { reinforce?: TeamWave };
}

/** Sonraki bir dalga (Teams.waves). */
export interface TeamWave {
  enemies: string[];
  units?: TeamUnits['enemies'];
}

/**
 * Birim kurulumları (UnitSetup) taraf başına, ANAHTAR = verilen listedeki konum: `arrange` false iken (hücre listesi; BattleScene ve sefer böyle
 * kurar) hücre/yuva numarası, `arrange` true iken sınıf listesindeki dizin (otomatik dizilimden önceki sıra). Dizi ya da { [anahtar]: UnitSetup } olabilir.
 * Yalnızca o taraf için liste VERİLMİŞSE uygulanır (seed'le çekilen tarafa uygulanmaz).
 */
export interface TeamUnits {
  party?: Record<number, UnitSetup | undefined> | (UnitSetup | undefined)[];
  enemies?: Record<number, UnitSetup | undefined> | (UnitSetup | undefined)[];
}

/**
 * Takım boyutu seçenekleri: her taraf 1..CELL_COUNT (formasyon yuva sayısı = rows x lanes = 12) birim alabilir; 4-4 varsayılandır
 * (data/battles/random-battle.json > random.size). partySize/enemySize yalnızca takım RASTGELE çekilirken kullanılır
 * (sınıf listesi verilmişse listenin uzunluğu geçerlidir). Boyut havuzdaki sınıf sayısını aşarsa sınıflar tekrar eder (ilk tur hep farklı).
 */
export interface TeamSizes {
  partySize?: number;
  enemySize?: number;
}

/** Geçerli takım boyutu (1..CELL_COUNT, tam sayı). */
export function clampTeamSize(n: number): number {
  return Math.max(1, Math.min(CELL_COUNT, Math.floor(Number.isFinite(n) ? n : 1)));
}

function lookup<T>(table: Record<string, T>, id: string, what: string): T {
  const v = table[id];
  if (!v) throw new Error(`${what} bulunamadı: ${id}`);
  return v;
}

/**
 * Takım dizilimi: dayanıklı / yakın dövüş class'lar önde, kırılgan / menzilli olanlar arkada başlar
 * (class'ın `frontPriority` değeri küçük = önde). Eşit önceliklerde verilen sıra korunur.
 * Slot 0 en öndedir; yakın dövüşün menzili ve hedeflenme sırası buna göre belirlenir.
 */
export function arrangeTeam(ids: string[]): string[] {
  return arrangeOrder(ids).map((i) => ids[i]!);
}

/** arrangeTeam'in sırası, girdi dizinleri olarak (birim kurulumlarını dizilmiş listeye taşımak için). */
function arrangeOrder(ids: string[]): number[] {
  return ids
    .map((id, i) => ({ id, i, melee: isMeleeClass(id) ? 0 : 1, p: (classes[id] ?? summons[id])?.frontPriority ?? 99 }))
    .sort((a, b) => a.melee - b.melee || a.p - b.p || a.i - b.i)
    .map((x) => x.i);
}

/**
 * Fisher-Yates karıştırma (seed'li) ve ilk `size` eleman. size havuzu aşarsa yeni bir karıştırma turuyla tamamlanır
 * (her turda sınıflar farklıdır; yinelenme ancak havuz bittikten sonra). size <= havuz için sonuç eskisiyle birebir aynıdır.
 */
function draw(pool: string[], size: number, rng: Rng): string[] {
  const out: string[] = [];
  if (pool.length === 0) return out;
  while (out.length < size) {
    const items = [...pool];
    for (let i = items.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [items[i], items[j]] = [items[j]!, items[i]!];
    }
    out.push(...items.slice(0, size - out.length));
  }
  return out;
}

/** Verilen class listesinden rastgele (seed'li) farklı `size` class seçer ve dizer. Takım seçim ekranının "Randomize" düğmesi. */
export function randomTeam(seed: number, size = 4, pool: string[] = randomPool): string[] {
  return arrangeTeam(draw(pool, clampTeamSize(size), new Rng((seed ^ 0x51ed270b) >>> 0)));
}

/**
 * Bir savaşın takımları. Sabit savaşta listeler aynen döner; rastgele savaşta seed'e göre,
 * her taraf kendi içinde farklı class'lardan oluşur (iki tarafta aynı class olabilir) ve dizilir.
 * Savaşın kendi rastgeleliğinden bağımsızdır (ayrı bir RNG akışı kullanır).
 */
export function rollTeams(battleId: string, seed: number, sizes: TeamSizes = {}): Teams {
  const def = lookup(battles, battleId, 'Savaş');
  if (!def.random) return { party: [...(def.party ?? [])], enemies: [...(def.enemies ?? [])] };
  const rng = new Rng((seed ^ 0x9e3779b9) >>> 0);
  const partySize = clampTeamSize(sizes.partySize ?? def.random.size);
  const enemySize = clampTeamSize(sizes.enemySize ?? def.random.size);
  return {
    party: arrangeTeam(draw(def.random.pool, partySize, rng)),
    enemies: arrangeTeam(draw(def.random.pool, enemySize, rng)),
  };
}

/** Dizilim ızgarası: `rows` sıra x `lanes` şerit. Yuva numarası = sıra * lanes + şerit (sıra 0 = en önde). */
export const GRID = { rows: formulas.formation.rows, lanes: formulas.formation.lanes };
export const CELL_COUNT = GRID.rows * GRID.lanes;

/** Yakın dövüş sınıfı mı (ilk skill'i melee)? Melee yalnızca ön sıradan vurabildiği için dizilimde önce onlar yerleşir. */
export function isMeleeClass(id: string): boolean {
  const def = classes[id] ?? summons[id];
  // Menzil açıkken (range.md) yakın dövüşçü = taban menzili <= 1 (Anti-Mage menzil 4: uzak sınıf gibi dizilir); kapalıyken eski kural (ilk skill melee)
  if (formulas.range?.enabled) return (def?.range ?? formulas.range.default ?? 1) <= 1;
  return skills[def?.skills[0] ?? '']?.motion === 'melee';
}

/**
 * Dizilim planı: her birimin hücresini (girdiyle aynı sırada) verir. Birimler önce öncelik sırasına (frontPriority) dizilir,
 * sonra sıra sıra doldurulur. Kural: bir yakın dövüşçü, ön sıralar DOLU (3 karakter) olmadıkça arka sırada olmaz; bu yüzden bir sıranın
 * boyutu en az geride kalan melee sayısı (en çok 3) kadardır. `pickSize(min, max)` sıra boyutunu, `pickLanes(k)` şeritleri seçer.
 */
function planCells(ids: string[], pickSize: (min: number, max: number) => number, pickLanes: (k: number) => number[]): number[] {
  const order = ids
    .map((id, i) => ({ id, i, melee: isMeleeClass(id) ? 0 : 1, p: (classes[id] ?? summons[id])?.frontPriority ?? 99 }))
    .sort((x, y) => x.melee - y.melee || x.p - y.p || x.i - y.i);
  const slots: number[] = Array.from({ length: ids.length }, () => -1);
  let at = 0;
  for (let row = 0; row < GRID.rows && at < order.length; row++) {
    const rest = order.slice(at);
    const meleeLeft = rest.filter((u) => isMeleeClass(u.id)).length;
    const max = Math.min(GRID.lanes, rest.length);
    // en az: kalan melee sayısı; ayrıca kalan birimler kalan sıralara sığmalı (hiçbir birim dışarıda kalmaz)
    const mustFit = rest.length - GRID.lanes * (GRID.rows - row - 1);
    const min = Math.max(1, Math.min(meleeLeft, max), Math.min(mustFit, max));
    const k = Math.max(min, Math.min(max, pickSize(min, max)));
    const lanes = pickLanes(k);
    for (let j = 0; j < k; j++) slots[rest[j]!.i] = row * GRID.lanes + lanes[j]!;
    at += k;
  }
  return slots;
}

/** Sıra boyutunun varsayılanı: ikişer (3 yakın dövüşçü kalmışsa üç). Şeritler: 1 -> [0], 2 -> [0, 2], 3 -> [0, 1, 2]. */
const defaultLanes = (k: number): number[] => (k === 1 ? [0] : k === 2 ? [0, GRID.lanes - 1] : Array.from({ length: k }, (_, l) => l));

/** Dizilim seçenekleri (menzil açıkken): `foes` = karşı takımın birim id'leri (alan tehdidi buradan; yoksa Quick Battle havuzunun şekilleri), `board` = tahta. */
export interface FormationOptions {
  foes?: string[];
  board?: Side;
}

/** Dizilim için birim özeti (formation-ai.ts): ana menzil, etkin dayanıklılık, taunt, Guard menzili. */
export function planUnitOf(id: string): PlanUnit {
  const def = classes[id] ?? summons[id] ?? mobs[id] ?? bosses[id];
  const own = (def?.skills ?? []).map((s) => skills[s]).filter((s): s is SkillDef => !!s);
  // ana menzil: sınıfın taban menzili (range.md: "menzil temelde sınıfın"); yoksa düşmana vuran ilk hasar skill'inin menzili
  const firstFoe = own.find((s) => FOE_TARGETS.includes(s.target) && s.effects.some((e) => e.type === 'damage'));
  const range = def?.range ?? (firstFoe ? skillRangeFor(firstFoe, undefined, formulas) : (formulas.range?.default ?? 1));
  const k = formulas.armor.k;
  const mit = (a: number) => (Math.max(0, a) + k) / k;
  const st = def?.stats;
  const ehp = st ? st.hp * ((mit(st.armor) + mit(st.magicArmor)) / 2) : 1;
  const guard = own.find((s) => s.target === 'single_ally' && s.effects.some((e) => e.type === 'guard'));
  return {
    range,
    ehp,
    taunt: own.some((s) => s.effects.some((e) => e.type === 'taunt')),
    ...(guard ? { guardRange: guard.range ?? Infinity } : {}),
  };
}

/**
 * Dizilim ipuçları (formation-hints.ts; Ömer 2026-10-18): `ids[i]` sınıf/mob/çağrı id'si, `slots[i]` hücresi (-1 = yerleşmemiş). Yalnızca ÖNERİ;
 * menzil kapalıyken hep boş. Ana menzil planUnitOf ile aynı (YZ dizilimiyle aynı mantık).
 */
export function placementHintsFor(ids: string[], slots: number[]): (PlacementHint | undefined)[] {
  if (!formulas.range?.enabled) return ids.map(() => undefined);
  const rules = (aiJson as unknown as { formationHints: HintRules }).formationHints;
  return placementHints(ids.map((id) => planUnitOf(id).range), slots, GRID.lanes, GRID.rows, rules);
}

/** Hücre listesinden (dizin = yuva, '' = boş) yuva başına ipucu. */
export function placementHintsForCells(cells: string[]): (PlacementHint | undefined)[] {
  const idx = cells.map((id, i) => (id ? i : -1)).filter((i) => i >= 0);
  const hints = placementHintsFor(idx.map((i) => cells[i]!), idx);
  const out: (PlacementHint | undefined)[] = cells.map(() => undefined);
  idx.forEach((slot, k) => (out[slot] = hints[k]));
  return out;
}

/** Birimlerin alan şekilleri (alan hedefli skill'lerinin area tanımları, tekrarsız). */
export function areasOf(ids: string[]): AreaDef[] {
  const seen = new Map<string, AreaDef>();
  for (const id of ids) {
    const def = classes[id] ?? summons[id] ?? mobs[id] ?? bosses[id];
    for (const sid of def?.skills ?? []) {
      const s = skills[sid];
      if (s?.area?.shape && AREA_TARGETS.includes(s.target)) seen.set(JSON.stringify(s.area), s.area);
    }
  }
  return [...seen.values()];
}

let poolAreas: AreaDef[] | undefined;

/** Menzile duyarlı dizilim (menzil açıkken): eski kuralın sonucundan başlayıp formation-ai puanına göre iyileştirir. */
function rangeSlots(ids: string[], start: number[], opts: FormationOptions, rng?: Rng): number[] {
  const foeAreas = opts.foes?.length ? areasOf(opts.foes) : (poolAreas ??= areasOf(randomPool));
  return planRangeFormation(ids.map(planUnitOf), {
    formation: formulas.formation,
    weights: (aiJson as unknown as { formation: FormationWeights }).formation,
    foeAreas,
    start,
    board: opts.board,
    ...(rng ? { rng } : {}),
  });
}

/**
 * Girdi sırasında her birimin otomatik dizilim hücresi. Menzil kapalıyken eski melee kuralı (planCells); açıkken menzile duyarlı
 * (formation-ai.ts: ana skill'ler ilk turdan ulaşsın, kırılganlar geride, taunt önde, Guard menzilinde, alan vuruşuna karşı dağınık).
 */
export function defaultSlots(ids: string[], opts: FormationOptions = {}): number[] {
  const old = planCells(ids, (min, max) => Math.min(max, Math.max(min, 2)), defaultLanes);
  return formulas.range?.enabled ? rangeSlots(ids, old, opts) : old;
}

/**
 * Otomatik dizilim: dönen liste hücre listesidir (dizin = yuva, '' = boş). Yakın dövüşçüler ön sıraları doldurur
 * (bkz. planCells); varsayılan sıra boyutu 2, ön sıradaki 3 melee varsa 3.
 */
export function defaultCells(ids: string[], opts: FormationOptions = {}): string[] {
  const cells: string[] = Array.from({ length: CELL_COUNT }, () => '');
  defaultSlots(ids, opts).forEach((slot, i) => {
    if (slot >= 0) cells[slot] = ids[i]!;
  });
  return cells;
}

/** Rastgele dizilimin her birimin hücresi (girdiyle aynı sırada): sıra boyutları ve şeritler seed'li rastgele, melee kuralı korunur. */
export function randomSlots(ids: string[], seed: number, opts: FormationOptions = {}): number[] {
  const rng = new Rng((seed ^ 0x2545f491) >>> 0);
  if (formulas.range?.enabled) {
    // menzil açık: menzile duyarlı plan + seed'li küçük gürültü (data/ai.json > formation.jitter); eski kural başlangıç noktasıdır
    const old = planCells(ids, (min, max) => Math.min(max, Math.max(min, 2)), defaultLanes);
    return rangeSlots(ids, old, opts, rng);
  }
  const pickLanes = (k: number) => {
    const lanes = Array.from({ length: GRID.lanes }, (_, l) => l);
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [lanes[i], lanes[j]] = [lanes[j]!, lanes[i]!];
    }
    return lanes.slice(0, k);
  };
  return planCells(ids, (min, max) => rng.int(min, max), pickLanes);
}

/**
 * Rastgele dizilim: karakterler 3 şeritten rastgele seçilir (ortadaki şerit de kullanılır). Yakın dövüşçüler ön sıraları doldurur:
 * bir melee, önündeki sıra dolmadıkça (3 karakter) arka sırada olmaz. Dönen liste hücre listesidir.
 */
export function randomCells(ids: string[], seed: number, opts: FormationOptions = {}): string[] {
  const cells: string[] = Array.from({ length: CELL_COUNT }, () => '');
  randomSlots(ids, seed, opts).forEach((slot, i) => {
    if (slot >= 0) cells[slot] = ids[i]!;
  });
  return cells;
}

/**
 * `teams` verilirse onlar kullanılır (taraf başına 1..12 birim, uzunluk serbest; yalnızca bir taraf verilirse diğeri seed'e göre çekilir);
 * verilmezse seed'e göre belirlenir (`partySize`/`enemySize` ile boyut seçilir, varsayılan 4-4). `arrange` true: liste sınıf id'leridir (otomatik dizilir);
 * false: liste hücre listesidir (dizin = yuva, '' = boş).
 */
export function battleSetup(battleId: string, seed: number, mode: BattleMode = 'turns', teams?: Partial<Teams> & TeamSizes, arrange = true): BattleSetup {
  const def = lookup(battles, battleId, 'Savaş');
  // Her taraf için {birim listesi, her birimin yuvası}. Birim sırası (uid'ler) girdi sırasıdır.
  // keys: her birimin verilen listedeki konumu (hücre listesinde yuva, sınıf listesinde dizin): birim kurulumları (teams.units) bununla eşlenir
  type Built = { ids: string[]; slots: number[]; keys?: number[] };
  const layout = (ids: string[], slots: number[], keys?: number[]): Built => ({
    ids: ids.filter((_, i) => slots[i]! >= 0),
    slots: slots.filter((s) => s >= 0),
    ...(keys ? { keys: keys.filter((_, i) => slots[i]! >= 0) } : {}),
  });
  const fromCells = (cells: string[]): Built => {
    const ids: string[] = [];
    const slots: number[] = [];
    cells.forEach((id, slot) => {
      if (id) {
        ids.push(id);
        slots.push(slot);
      }
    });
    return { ids, slots, keys: [...slots] };
  };
  const random = !!def.random;
  const rolled = teams?.party && teams.enemies ? undefined : rollTeams(battleId, seed, { partySize: teams?.partySize, enemySize: teams?.enemySize });
  // menzile duyarlı dizilim karşı takımın alan şekillerine bakar (menzil kapalıyken kullanılmaz)
  const idsOf = (given: string[] | undefined, rolledIds: string[] | undefined) => (given ?? rolledIds ?? []).filter(Boolean);
  const build = (given: string[] | undefined, rolledIds: string[] | undefined, mix: number, opts: FormationOptions): Built => {
    if (given) {
      if (!arrange) return fromCells(given); // hücre listesi (oyuncunun seçim ekranında elle dizdiği; dizin = yuva, '' = boş)
      // sınıf listesi: önce önceliğe göre sıralanır, sonra otomatik dizilir
      const list = given.slice(0, CELL_COUNT);
      const order = arrangeOrder(list);
      const a = order.map((i) => list[i]!);
      return layout(a, defaultSlots(a, opts), order);
    }
    const ids = rolledIds ?? [];
    return layout(ids, random ? randomSlots(ids, seed ^ mix, opts) : defaultSlots(ids, opts));
  };
  const party = build(teams?.party, rolled?.party, 0x1111, { foes: idsOf(teams?.enemies, rolled?.enemies), board: 'party' });
  const enemies = build(teams?.enemies, rolled?.enemies, 0x2222, { foes: idsOf(teams?.party, rolled?.party), board: 'enemy' });
  // Sınıf ya da (hazır çağrı olarak) data/summons birimi
  const unitDef = (id: string): CombatantDef => classes[id] ?? bosses[id] ?? mobs[id] ?? lookup(summons, id, 'Class');
  // Birim kurulumları: verilen kurulum + çağrı id'leri için summoned bayrağı. Hiçbir birimde kurulum yoksa alan hiç yazılmaz (eski davranış).
  const unitsFor = (b: Built, given: TeamUnits['party']): (UnitSetup | undefined)[] | undefined => {
    const out = b.ids.map((id, i) => {
      const key = b.keys?.[i];
      const u = key !== undefined && given ? (given as Record<number, UnitSetup | undefined>)[key] : undefined;
      if (!classes[id] && summons[id]) return { summoned: true, ...(u ?? {}) };
      return u;
    });
    return out.some((u) => u !== undefined) ? out : undefined;
  };
  const partyUnits = unitsFor(party, teams?.units?.party);
  const enemyUnits = unitsFor(enemies, teams?.units?.enemies);
  // Dalgalı savaş: sonraki dalgalar ilk dalgayla aynı yoldan (dizilim karşı takıma bakar); boş dalga atlanır
  const waves: WaveSetup[] = (teams?.waves ?? [])
    .map((w, k) => {
      const b = build(w.enemies, undefined, 0x2222 + 0x101 * (k + 1), { foes: idsOf(teams?.party, rolled?.party), board: 'enemy' });
      const units = unitsFor(b, w.units);
      return { enemies: b.ids.map(unitDef), enemySlots: b.slots, ...(units ? { enemyUnits: units } : {}) };
    })
    .filter((w) => w.enemies.length > 0);
  // Karşılaşma kuralları: Totem takviyesi dalga yolundan (dizilim karşı takıma bakar)
  const rules = resolveBattleRules(teams?.rules);
  if (rules?.objective?.type === 'totem' && teams?.rules?.reinforce) {
    const r = teams.rules.reinforce;
    const b = build(r.enemies, undefined, 0x3333, { foes: idsOf(teams?.party, rolled?.party), board: 'enemy' });
    const units = unitsFor(b, r.units);
    if (b.ids.length) rules.objective.reinforce = { enemies: b.ids.map(unitDef), enemySlots: b.slots, ...(units ? { enemyUnits: units } : {}) };
  }
  return {
    seed,
    mode,
    party: party.ids.map(unitDef),
    enemies: enemies.ids.map(unitDef),
    partySlots: party.slots,
    enemySlots: enemies.slots,
    ...(partyUnits ? { partyUnits } : {}),
    ...(enemyUnits ? { enemyUnits } : {}),
    ...(teams?.valor ? { valor: { ...teams.valor } } : {}),
    ...(teams?.surge ? { surge: Object.fromEntries(Object.entries(teams.surge).map(([k, v]) => [k, [...(v ?? [])]])) } : {}),
    ...(waves.length ? { waves, waveRules: { ...waveRules } } : {}),
    ...(rules ? { rules } : {}),
    skills,
    globalSkills,
    valorRules,
    statuses,
    grounds,
    formulas,
    units: { ...classes, ...summons, ...bosses, ...mobs },
    maxSlots: def.slots,
  };
}

/**
 * Skill'in sahibinin (bu skill'i taşıyan ilk sınıf / çağrı / boss / mob) taban menzili (range.md; savaş dışı ekranlar: Gear, wiki).
 * Sahibi yoksa ya da menzili tanımsızsa undefined (describeSkill varsayılanı kullanır).
 */
export function ownerRangeOf(skillId: string): number | undefined {
  for (const pool of [classes, summons, bosses, mobs]) for (const def of Object.values(pool)) if (def?.skills.includes(skillId)) return def.range;
  return undefined;
}
