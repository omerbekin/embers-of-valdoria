import { isAccuracyCritDebuff } from './cc-immunity';
import { hpFallbackAmount, skillCostAmount } from './cost';
import { damageRange, missingHpHealMult, rollCrit, rollDamage, rollHeal, shieldAmount, type DamageSpec, type Range } from './formulas';
import { cursorAnchorSlot, isShapeArea, screenCellOf, shapeCells, shapeStages } from './area-shape';
import { pickSideNeighbors } from './formation';
import { betMultipliers, betStakeParts } from './gamble';
import { burnAmountFor, emptyProcApplies } from './mana-burn';
import { Rng } from './rng';
import { ITEM_HOOK_CAPS } from './item-caps';
import { isUnblockableHit } from './unblockable';
import { mergeRefreshStrongest, statusStackMode } from './status-stack';
import { bonusScaleRaw, damageSpecFor, type DamageEffect } from './spec';
import { cellDistance, FOE_TARGETS, rangeEnabled, skillRangeFor } from './range';
import { applySummonerScale, applySummonVariant, applyUnitModifiers, armorReduction, attributePower, hitOutcome, roundSpeed, speedMin } from './stats';
import type { Attribute, Attributes, Corpse, CorpseChoice, CorpseState, DamageOrigin, Element, PassiveEffect } from './types';
import { advanceTurn, predictQueue, turnProgress, type TurnSlot } from './turn-order';
import { condHolds, defaultSel, effArr, effFirst, effFlag, effList, fxBags, effMult, effNum, markOnce, modGroups, MOD_SPEC, newModAcc, onceUsed, scaleOf, selMatches, SET_MODS, type CastInfo, type CondCtx, type HitInfo, type TickInfo, type CondHook, type CondHost, type CondMod, type ModGroup, type RageHook, type TreeModAcc, type TreeProcEvent, type TreeQuery, type RuleHook, type TriggerHook, type TriggerAction, type TriggerEvent, type TriggerBase, type HealHook, type HealPoint } from './tree-hooks';
import type { ActionInfo, ItemEffects, AreaDef, AreaStage, BattleAction, BattleEvent, BattleMode, BetSpec, Combatant, CombatantDef, Formulas, GlobalSkillDef, GroundDef, GroundEffect, ShieldHook, Side, SkillDef, SkillEffect, SkillModeSet, Status, StatusDef, Telegraph, TreeSetup, UnitSetup, ValorRules, WaveRules, WaveSetup } from './types';

export interface BattleSetup {
  seed: number;
  party: CombatantDef[];
  enemies: CombatantDef[];
  /** Her birimin yuvası (party/enemies ile aynı sırada); yoksa 0,1,2... */
  partySlots?: number[];
  enemySlots?: number[];
  skills: Record<string, SkillDef>;
  /** Global skill'ler (data/global-skills.json): rest / skip_turn / move_tile; yoksa hiçbir birim global skill kullanamaz. */
  globalSkills?: Record<string, GlobalSkillDef>;
  /** Buff/debuff tanımları (data/statuses.json). */
  statuses?: Record<string, StatusDef>;
  /** Yerde kalan etki tanımları (data/grounds.json). */
  grounds?: Record<string, GroundDef>;
  formulas: Formulas;
  /** Çağrılabilecek birimlerin tanımları (id -> tanım). */
  units: Record<string, CombatantDef>;
  /** Her tarafın en fazla kaç yuvası var (çağrı için boş yer aranır). */
  maxSlots: { party: number; enemy: number };
  /** turns (varsayılan): hıza göre sıralı. test: sırasız, herkes istediği an oynar. */
  mode?: BattleMode;
  /**
   * Birim başına opsiyonel kurulum (party/enemies ile AYNI sırada; boş/eksik eleman = seçenek yok): güçlendirme/zayıflatma, özel ad, rütbe, başlangıç
   * canı/MP'si, hazır çağrı. Verilmezse savaş birebir eskisi gibidir (aynı seed = aynı savaş). Bkz. UnitSetup, docs/design/combat.md > Savaş kurulum seçenekleri.
   */
  partyUnits?: (UnitSetup | undefined)[];
  enemyUnits?: (UnitSetup | undefined)[];
  /** Valor kuralları (data/valor.json); yoksa Valor eylemi hiç kullanılamaz. */
  valorRules?: ValorRules;
  /**
   * Taraf başına savaş başı Valor'u (Ömer 2026-10-13): yalnızca verilen tarafta global 'valor' eylemi (valor_revive) vardır. Sefer ve Endless yalnızca
   * party verir (düşmanların Valor'u yok); hızlı savaş / multiplayer hiç vermez (eylem görünmez, savaş birebir eskisi).
   */
  valor?: Partial<Record<Side, number>>;
  /**
   * Debug (Setup > Mob battle > Ignore range): bu savaşta menzil / erişim sınırı YOK; her skill her düşman hücresini hedefleyebilir (YZ dahil).
   * Varsayılan false = hiçbir davranış değişmez. Backstab'ın "arkası boş" şartı ve taunt bundan etkilenmez.
   */
  ignoreRange?: boolean;
  /**
   * Dalgalı savaş (Ömer 2026-10-19, docs/design/waves.md): `enemies` İLK dalgadır; burası SONRAKİ dalgalar (2., 3. ...). Mevcut dalganın tüm savaşan
   * düşmanları düşünce sıradaki dalga düşman tahtasına dizilir; savaş ancak son dalga bitince kazanılır. Yoksa / boşsa savaş birebir eskisi.
   */
  waves?: WaveSetup[];
  /** Dalga geçiş kuralları (data/waves.json > rules). Dalga varken verilmezse DEFAULT_WAVE_RULES. */
  waveRules?: WaveRules;
}

/** Dalga kuralları verilmediğinde (yalnızca motor testleri / eski çağıranlar): data/waves.json'daki varsayılanla aynı nötr kurallar. */
export const DEFAULT_WAVE_RULES: WaveRules = { turnOrder: 'keep', healRatio: 0, mpRatio: 0, clearCorpses: true, clearEnemyGrounds: true, cancelEnemyTelegraphs: true };

/** Debug: hasar çarpanı ve kritik/kaçınma zorlaması (varsayılan: 1, auto, auto = oyun kuralı aynen). */
export interface DebugFlags {
  damageMult: number;
  /** always: her vuruş kritik; never: hiç kritik yok. */
  crit: 'auto' | 'always' | 'never';
  /** always: hasar veren her vuruş iska olur ('dodge' olayı: hedef kaçındı); never: hiç iska yok (dodge da miss de). */
  dodge: 'auto' | 'always' | 'never';
  /** always: hasar veren her vuruş 'miss' olur (saldıranın isabeti yetmedi); dodge 'always' ile birlikteyse dodge kazanır. Yoksa/auto: oyun kuralı. */
  miss?: 'auto' | 'always';
  /** Debug "Force block (every blockable hit)": kural gereği bloklanabilen her vuruş bloklanır (kalkansız birim ve düşman dahil). Yoksa/false: oyun kuralı. */
  block?: boolean;
}

/** Yapay zeka (ya da arayüz) seçimini motora çevirmek için yapısal giriş: skillId bir class skill'i ya da global skill id'si olabilir. */
export interface ChoiceLike {
  skillId: string;
  targetUid?: string;
  /** Move Tile: hedef boş yuva. */
  slot?: number;
  /** area_any alan skill'i: anchor hücrenin tahtası (yoksa karşı taraf). */
  board?: Side;
  /** Ceset tüketen çağrı (Raise Dead): tüketilecek düşman cesedinin uid'si. */
  corpseUid?: string;
  /** Faz 8: skill ağacı biçimi (Focused Beam, Stacked Deck kartı); yoksa skill'in kendi biçimi. */
  mode?: string;
}

/** Faz 8: etkin skill biçimi (kullanım ya da arayüz hedef seçimi süresince Battle.skill(id, uid) bu tanımı döndürür). */
interface ActiveMode {
  uid: string;
  skillId: string;
  def: SkillDef;
}

/** Hasar olayının kaynak bilgisi (BattleEvent 'damage' > origin/element/damageType/ground/groundId). */
interface HitMeta {
  origin: DamageOrigin;
  element?: Element;
  damageType?: 'physical' | 'magic';
  ground?: string;
  groundId?: string;
  /** Durum kaynaklı hasar (Wither tiki, Doom): damage olayına `status` olarak yazılır. */
  status?: Status['kind'];
}

/** Faz 4a: tetik olayı (Battle.fireTrig). target = bağlamın hedefi (koşullar / eylem 'target'), subject = olayın öznesi, source = sebep olan. */
interface TrigEv {
  on: TriggerEvent;
  target?: Combatant;
  subject?: Combatant;
  source?: Combatant;
  /** Olayın skill'i (süzgeç skill, cooldown 'event', buff skill 'event'). */
  skill?: string;
  /** Gelen vuruşun skill'i (koşul incomingRanged / incomingArea). */
  incomingSkill?: SkillDef | null;
  status?: string;
  statusSource?: string;
  end?: 'broken' | 'expired' | 'dispelled';
  amount?: number;
  prevented?: number;
  /** Eşik geçişi (hpBelow / mpBelow): önceki ve sonraki oran. */
  before?: number;
  after?: number;
  via?: 'skill' | 'dot' | 'doom' | 'ground' | 'leap' | 'smite';
  resource?: 'hp' | 'mp';
  /** enemyDied: ölenin durumları ve durduğu zeminler. */
  statuses?: readonly Status[];
  grounds?: readonly string[];
  shield?: ShieldHook;
  /** Olay sahibin kullanımı başlarken (bedel ödemesi) oldu: verdiği buff bu kullanıma işlemez. */
  inCast?: boolean;
  // ---- Faz 4c ----
  /** Kullanımın alan merkezi / tahtası (skillUse, echo: bedava ve gecikmeli kullanım aynı hücrelere). */
  center?: number;
  board?: Side;
  /** Olaydan önceki hedef durumları (koşul `before`; trig ilk dağıtımda yazar). */
  preStatuses?: Status[];
  /** Altıncı tur (Rot Bomb): bu olayda tetiklerin bıraktığı zeminler (trigGround yazar; alıcı placedGround). */
  placed?: GroundEffect[];
  /** groundEnd: biten zemin; enemyDied: ölenin durduğu en güçlü zemin gücü. */
  groundFx?: GroundEffect;
  groundAmt?: number;
  /** statusEnd: biten durum örneği (Lifebloom ilk şifa, Rot to the Core defteri). */
  st?: Status;
  /** Olayın verdiği hasar (kill: öldüren vuruş; doom: Doom hasarı). */
  dealt?: number;
  /** summonDeath: çağrının id'si. */
  unit?: string;
  /** Faz 5a (Living Bomb): eylem miktarlarının ek çarpanı (ölçekle çarpılır; yoksa 1). */
  mult?: number;
}

/** Faz 4c: bedava / gecikmeli kullanım (TriggerAction.cast). */
interface FreeCast {
  owner: string;
  skill: string;
  node: string;
  target?: string;
  center?: number;
  power: number;
  crit: boolean;
  mod?: CondMod;
  noChain: boolean;
  /** Gecikmeli: sahibin kalan tur başı sayısı. */
  delay?: number;
}

/** Global skill'in oyun içi sonucu için birim başına son eylem türü (yapay zeka salınımı önlemek için okur). */
export type LastActionKind = 'skill' | 'rest' | 'skip' | 'move' | 'valor' | 'pass';

export type ActionResult = { ok: true; events: BattleEvent[] } | { ok: false; reason: string };
export type CanUse = { ok: true } | { ok: false; reason: string };

type Listener = (event: BattleEvent) => void;

/** Bir eylemin (skill / global skill / pas) uygulanmadan hemen önceki bilgisi (BattleObserver.before). */
export interface ObservedAction {
  kind: 'skill' | 'global' | 'pass';
  actorUid: string;
  /** skill: skill id'si; global: global skill id'si. */
  id?: string;
  /** skill: vurulacak/etkilenecek birimler (alan skill'inde pencere); global move: yok. */
  targetUids?: string[];
  /** Alan/şerit skill'inde merkez hücre; Move Tile'da hedef yuva. */
  center?: number;
  /** Alan/şerit skill'inde kapsanan tüm hücreler (boş olanlar dahil). */
  cells?: number[];
  /** area_any (Smoke Bomb): alanın atıldığı tahta. */
  board?: Side;
}

/**
 * Salt-okunur gözlemci (maç kaydı için; src/engine/match-log.ts). Motorun durumunu ve rastgele sayı akışını DEĞİŞTİRMEZ: yalnızca çağrılır.
 * before: geçerli bir eylem, durum değişmeden hemen önce; after: eylem bitti (kazanan belirlendi, sıra henüz ilerlemedi). Sersemlik pasında before gelmez, yalnızca after gelir.
 */
export interface BattleObserver {
  before?(info: ObservedAction): void;
  after?(actorUid: string): void;
}
type Emit = (event: BattleEvent) => void;

const opposite = (side: Side): Side => (side === 'party' ? 'enemy' : 'party');

/**
 * Boş yuva "hedef kimliği": Move Tile'ın hedefi birim değil boş bir yuvadır (hedef türü 'empty_tile'). `targetUid` alanı taşıyan arayüz/YZ yolları
 * için yuva `tile:<yuva>` biçiminde yazılır; useSkill/act bunu yuvaya çevirir (slot parametresi de aynı işi görür).
 */
export const tileUid = (slot: number): string => `tile:${slot}`;
export const slotOfTileUid = (uid?: string): number | undefined => {
  const m = /^tile:(\d+)$/.exec(uid ?? '');
  return m ? Number(m[1]) : undefined;
};

/**
 * Savaş durumu ve kuralları. Saf TypeScript; aynı seed + aynı eylemler = aynı olaylar.
 * turns modunda sırası gelmeyen aktör oynayamaz; test modunda sıra yoktur.
 * Dizilim: her tarafın `formation.rows` sırası (0 = en önde) ve her sırada `formation.lanes` şeridi var; yuva = sıra * lanes + şerit.
 * Menzil (docs/design/range.md): her skill'in menzili var (sınıfın `range`'i, skill `range` ile ezilebilir; `global` = menzilsiz); bkz. distanceTo / inRange.
 */
export class Battle {
  readonly seed: number;
  readonly mode: BattleMode;
  readonly combatants: Combatant[];
  readonly log: BattleEvent[] = [];
  winner: Side | null = null;
  /** turns modunda şu an sırası gelen aktörün uid'si (test modunda hep null). */
  currentUid: string | null = null;
  /** Şimdiye kadar oynanan (veya pas geçilen) tur sayısı. */
  turnsTaken = 0;
  /** Debug: true iken hiçbir skill MP harcamaz ve MP yetersizliği engel olmaz (iki taraf için de). */
  freeMp = false;
  /** Debug (Test Mode): true iken Rage harcanmaz ve Rage yetersizliği engel olmaz (iki taraf için de; freeMp ile aynı desen). */
  freeRage = false;
  /** Debug (Test Mode): true iken cooldown hiç başlamaz ve cooldown'daki skill da kullanılabilir (iki taraf için de). */
  noCooldowns = false;
  /** Debug bayrakları (yalnızca debug menüsünden değişir; varsayılanlar oyunu hiç etkilemez, rastgele sayı akışı da aynı kalır). */
  readonly debug: DebugFlags = { damageMult: 1, crit: 'auto', dodge: 'auto', miss: 'auto' };
  /** İsteğe bağlı gözlemci (maç kaydı); yoksa hiçbir şey değişmez. */
  observer: BattleObserver | null = null;
  /** debugCast sürerken true: menzil/taunt kısıtları yok sayılır. */
  private debugCasting = false;
  /**
   * Cesetler (madde 222): ölen her ÇAĞRI OLMAYAN birim yuvasında ceset bırakır (uid -> durum). revivable = Resurrection ile diriltilebilir,
   * consumed = Raise Dead tüketti (diriltilemez, yuvası rezerve değil). Dirilince kayıt silinir. Çağrıların ölümü ceset bırakmaz.
   */
  private readonly corpseState = new Map<string, CorpseState>();
  /** Ceset sırası (ölüm anı): uid -> artan sayı (corpses() listesinin sırası). */
  private readonly corpseOrder = new Map<string, number>();
  private corpseCounter = 0;

  /** Eşit sayaçta önce oynayan taraf: seed'e göre belirlenir ki hiçbir taraf kalıcı avantaj almasın. */
  private readonly tieFirst: Side;
  private readonly rng: Rng;
  private readonly setup: BattleSetup;
  private readonly listeners = new Set<Listener>();
  private readonly announcedDead = new Set<string>();
  /** Luck-primary "Lucky Escape" hakkını kullanmış birimler. */
  private readonly luckySaved = new Set<string>();
  /** Son applyHit çağrısı Lucky Escape ile yok sayıldı mı (strike'ın Rage / Mana Overflow yan etkileri için). */
  private lastHitLucky = false;
  private summonCount = 0;
  /** Birim başına üst üste Skip Turn sayısı (başka bir eylem sıfırlar) ve son eylem türü. */
  private readonly skipStreak = new Map<string, number>();
  private readonly lastKind = new Map<string, LastActionKind>();
  /** Şu an işlenen skill'in Rage kazancı: hedef uid -> o hedefe yapılan vuruşların kazancı toplamı (yalnızca Rage'li kullanıcıda; yoksa null). */
  private rageTally: Map<string, number> | null = null;
  /** Şu an işlenen skill'in harcadığı Rage (powerPerRage: Headsman's Blow); ödemeden ÖNCEKİ Rage (bedel atlansa da). Yoksa null. */
  private castRage: number | null = null;
  /** Bu skill sırasında ölürse yığını Ill Omen ile GEÇMEYECEK hedefler (detonate noTransferOnKill: Doom Mark); skill bitince null. */
  private noTransferKill: Set<string> | null = null;
  /** Şu an işlenen skill (strike'ın skill'e bakan pasifleri için: Rebuke yalnızca yakın dövüş); skill bitince null. */
  private castingSkill: SkillDef | null = null;
  /** Faz 2c: şu an skill kullanan birim (aura kancalarının gelen vuruş bağlamı: Weathered); skill bitince null. */
  private castingActor: Combatant | null = null;
  /** Birimin aldığı son hasarın kaynağı ve türü (uid -> {source, origin}): Last Ember (YM2) öldürenin bir skill vuruşu olup olmadığına bakar. */
  private readonly lastHitOn = new Map<string, { source: string; origin: DamageOrigin; amount?: number }>();
  /** Başlangıç cooldown'u olan birimler: ilk turunun başında azalmayacak skill'ler (uid -> skill id'leri). */
  private readonly initialHold = new Map<string, Set<string>>();
  private groundCount = 0;
  /** Tur başına birden çok eylemli birimin (actionsPerTurn) bu turda kalan ek eylemi (uid -> sayı); turu başlayınca yazılır. */
  private readonly actionsLeft = new Map<string, number>();
  /** Yerde duran (süreli) etkiler. */
  readonly ground: GroundEffect[] = [];
  /** Bekleyen telgraflar (gecikmeli saldırılar: Breaking Span, Ash Brand, Fall of King's Bridge); oluşturulma sırasıyla. */
  readonly telegraphs: Telegraph[] = [];
  private telegraphCount = 0;
  /** Bu turunda yeni telgraf kuran birimler (bir turda en fazla bir yeni telgraf); birimin turu başlayınca silinir. */
  private readonly telegraphedThisTurn = new Set<string>();
  /** Faz kilidi: bu eylemde faz eşiği geçmiş boss'lar (tek eylem tek eşik); her eylem / tur başı temizlenir. */
  private readonly phaseCrossed = new Set<string>();
  /** Faz girişinde yardımcılar kopuyor: kırılma Stagger / iptal vermez. */
  private snappingAnchors = false;
  /** Valor (taraf başına kalan; yalnızca setup.valor'da verilen taraflar). Ömer 2026-10-13, data/valor.json. */
  private readonly valorPool = new Map<Side, number>();
  /** Bu savaşta düşen (çağrı olmayan, savaşa ceset olarak GİRMEMİŞ) birimler: kusursuz zafer (flawless Valor) bunlara bakar. */
  private readonly fellInBattle = new Set<string>();
  /** Dalgalı savaş: sonraki dalgalar (boş dalgalar atılır) ve şu anki dalganın dizini (0 = ilk dalga). */
  private readonly laterWaves: WaveSetup[];
  private waveIdx = 0;
  /** Savaşta skill ağaçlı (yamalı skill, unitFx ya da kanca) en az bir birim var mı; yoksa skill() birim aramadan ortak tabloya gider ve ağaç izlemesi çalışmaz. */
  private treeUnits = false;
  /** Faz 8: biçimli kullanım (act / useSkill `mode`): kullanım süresince (bedava kullanım kuyruğundan önce biter). */
  private modeCast: ActiveMode | null = null;
  /** Faz 8: arayüzün hedef seçme önizlemesi (Focused Beam seçildi, düşman bekleniyor): yalnızca o birim + skill; her eylem başında silinir. */
  private viewMode: ActiveMode | null = null;
  /** Faz 5a: ağaç pasif ekleri işler mi (ağaçlı birim ya da yalnızca pasifi yamalı Drilled Ranks / Endless Spring birimi); yoksa ifadeler aynen. */
  private treeArmorOn = false;

  constructor(setup: BattleSetup) {
    this.setup = setup;
    this.seed = setup.seed;
    this.mode = setup.mode ?? 'turns';
    this.rng = new Rng(setup.seed);
    this.tieFirst = (Math.imul(setup.seed >>> 0, 2654435761) >>> 16) % 2 === 0 ? 'party' : 'enemy';
    this.laterWaves = (setup.waves ?? []).filter((w) => w.enemies.length > 0);
    this.combatants = [
      ...setup.party.map((d, i) => createSetupCombatant(d, 'party', setup.partySlots?.[i] ?? i, `party-${i}`, setup.partyUnits?.[i], setup.formulas)),
      ...setup.enemies.map((d, i) => createSetupCombatant(d, 'enemy', setup.enemySlots?.[i] ?? i, `enemy-${i}`, setup.enemyUnits?.[i], setup.formulas)),
    ];
    this.treeUnits = this.combatants.some(hasTree);
    this.treeArmorOn = this.treeUnits || this.combatants.some(treeAura);
    // Endless: önceki dalgada düşen birim savaşa ceset olarak girer (UnitSetup.startDead); verilmezse savaş aynı
    const units = [...setup.party.map((_, i) => setup.partyUnits?.[i]), ...setup.enemies.map((_, i) => setup.enemyUnits?.[i])];
    // Taşınan çağrı (Endless; sahibi bu savaşta): statları sahibinden yeniden türer (savaşta çağrıldığı gibi; Ömer 2026-10-18). Sahipsiz / kuralsız = aynen
    this.combatants.forEach((c, i) => {
      const owner = c.summoned && c.owner ? this.combatants.find((o) => o.uid === c.owner && !o.summoned) : undefined;
      const baseDef = owner ? setup.units[c.defId] : undefined;
      if (!owner || !baseDef?.summonerScale) return;
      const def = this.summonDefFor(owner, baseDef, c.empowered);
      const unit = units[i];
      const ratio = c.maxHp > 0 ? c.hp / c.maxHp : 1;
      c.stats = { ...def.stats };
      c.maxHp = def.stats.hp;
      const finite = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v);
      c.hp = Math.max(1, Math.min(c.maxHp, Math.round(finite(unit?.startHp) ? unit.startHp : c.maxHp * ratio)));
      if (owner.level !== undefined) c.level = owner.level;
    });
    this.combatants.forEach((c, i) => {
      const dead = units[i]?.startDead;
      if (!dead || c.summoned) return;
      c.hp = 0;
      c.statuses = [];
      c.shield = 0;
      c.magicShield = 0;
      this.announcedDead.add(c.uid);
      this.leaveCorpse(c);
      if (dead === 'consumed') this.corpseState.set(c.uid, 'consumed');
    });
    // Valor: yalnızca verilen tarafta (0..cap)
    if (setup.valorRules) for (const side of ['party', 'enemy'] as const) {
      const v = setup.valor?.[side];
      if (v !== undefined) this.valorPool.set(side, Math.max(0, Math.min(setup.valorRules.cap, Math.floor(v))));
    }
    // Başlangıç cooldown'u (initialCooldown): yalnızca turns modunda ve class birimlerinde; test modunda cooldown zaten yok
    if (this.mode === 'turns') for (const c of this.combatants) this.applyInitialCooldowns(c);
    // Boss: faz 1 ve bağlı yardımcı sayısı rozeti (Anchored); boss yoksa hiçbir şey değişmez
    for (const c of this.combatants) {
      if (!c.boss) continue;
      if (c.boss.phases?.length) c.phase = 1;
      this.refreshAnchored(c);
    }
    // Head Start (YM15, mob pasifi): savaş başında Skip Turn gibi hız desteği (ilk turuna kadar); yalnızca turns modunda
    const headStart = this.mode === 'turns' ? this.combatants.filter((c) => c.hp > 0 && c.passive?.effect.type === 'headStart') : [];
    for (const c of headStart) {
      const e = c.passive!.effect as Extract<PassiveEffect, { type: 'headStart' }>;
      if (e.speedBoost > 0) this.speedBoost.set(c.uid, e.speedBoost);
    }
    // Dalgalı savaş: ilk dalganın düşmanları dalga 0 (dalgasız savaşta alan yazılmaz)
    if (this.waveCount > 1) for (const c of this.combatants) if (c.side === 'enemy') c.wave = 0;
    this.record({ type: 'battleStart', seed: this.seed, combatants: this.combatants.map(cloneCombatant) });
    if (this.waveCount > 1) this.record({ type: 'waveStart', index: 0, total: this.waveCount, combatants: [], removed: [], queue: [] });
    for (const c of headStart) this.record({ type: 'passive', actor: c.uid, passive: c.passive!.id, name: c.passive!.name });
    // Faz 4a: tetik / C4 kancası taşıyan birimler (yalnızca ağaçlı savaş) ve savaş başı tetiği
    if (this.treeUnits) {
      this.trigUnits = this.combatants.filter((c) => c.treeHooks?.some((h) => h.h === 'trigger'));
      this.healUnits = this.combatants.filter((c) => c.treeHooks?.some((h) => h.h === 'heal'));
      if (this.trigOn) this.trigAll({ on: 'battleStart' }, (e) => this.record(e));
    }
    if (this.mode === 'turns') this.advance((e) => this.record(e));
  }

  /**
   * Skill'lerin `initialCooldown` değerini sayaca yazar (üst sınır formulas.json > cooldown.maxInitial).
   * Sayaç normal cooldown sayacıdır; yalnızca birimin İLK turunun başındaki azalma atlanır, böylece skill, birimin
   * ilk N turunda kullanılamaz ve ilk turunda sayaç N gösterir.
   */
  private applyInitialCooldowns(c: Combatant): void {
    if (c.summoned || c.skipInitialCooldown) return;
    const max = this.setup.formulas.cooldown?.maxInitial ?? 0;
    for (const id of c.skills) {
      const sk = this.skill(id, c);
      // Kurulum eki (UnitSetup.initialCooldownBonus): cooldown'lu her skill'e (cooldown ya da initialCooldown > 0); maxInitial'ı aşabilir
      const bonus = (sk?.cooldown ?? 0) > 0 || (sk?.initialCooldown ?? 0) > 0 ? Math.max(0, Math.floor(c.initialCooldownBonus ?? 0)) : 0;
      let n = Math.min(max, Math.floor(sk?.initialCooldown ?? 0)) + bonus;
      // Ultimate cooldown -1 (item affix, Ömer 2026-10-11): yalnızca başlangıç cooldown'u olan skill'lerde, en az 0
      const ult = effNum(c, 'ultCdReduce');
      if (ult > 0 && (sk?.initialCooldown ?? 0) > 0) n = Math.max(0, n - Math.floor(ult));
      if (n <= 0) continue;
      c.cooldowns[id] = n;
      let held = this.initialHold.get(c.uid);
      if (!held) this.initialHold.set(c.uid, (held = new Set()));
      held.add(id);
    }
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get formulas(): Formulas {
    return this.setup.formulas;
  }

  /** Dalgalı savaş: toplam dalga sayısı (dalgasız savaşta 1). */
  get waveCount(): number {
    return 1 + this.laterWaves.length;
  }

  /** Şu anki dalganın dizini (0 = ilk dalga). */
  get waveIndex(): number {
    return this.waveIdx;
  }

  /** Henüz gelmemiş dalgaların düşman tanımları (HUD önizlemesi için; sırayla). Dalgasız savaşta ya da son dalgada boş. */
  upcomingWaves(): CombatantDef[][] {
    return this.laterWaves.slice(this.waveIdx).map((w) => [...w.enemies]);
  }

  /** Dalga kuralları (verilmediyse DEFAULT_WAVE_RULES). */
  get waveRules(): WaveRules {
    return this.setup.waveRules ?? DEFAULT_WAVE_RULES;
  }

  get(uid: string): Combatant | undefined {
    return this.combatants.find((c) => c.uid === uid);
  }

  living(side: Side): Combatant[] {
    return this.combatants.filter((c) => c.side === side && c.hp > 0);
  }

  /** Birimin son eylem türü (skill / rest / skip / move / pass); henüz eylemi yoksa tanımsız. */
  lastActionOf(uid: string): LastActionKind | undefined {
    return this.lastKind.get(uid);
  }

  /** Birimin üst üste kaç kez Skip Turn kullandığı. */
  skipStreakOf(uid: string): number {
    return this.skipStreak.get(uid) ?? 0;
  }

  private noteAction(uid: string, kind: LastActionKind): void {
    this.lastKind.set(uid, kind);
    this.skipStreak.set(uid, kind === 'skip' ? (this.skipStreak.get(uid) ?? 0) + 1 : 0);
    // Skill ağacı koşul izlemesi (yalnızca ağaçlı savaş): eylem yaptı, son turundan beri vuranlar sıfırlanır, harcanan Rage bir önceki eyleme kayar
    if (this.treeUnits) {
      this.actedUids.add(uid);
      this.hitSince.delete(uid);
      this.missedSince.delete(uid);
      this.turnAt.set(uid, ++this.treeClock);
      this.prevRage.set(uid, this.curRage.get(uid) ?? 0);
      this.curRage.delete(uid);
      // Faz 2c (Rooted Stance): üst üste Move yapılmayan eylem sayısı
      this.stillCount.set(uid, kind === 'move' ? 0 : (this.stillCount.get(uid) ?? 0) + 1);
    }
  }

  /** Bir tarafın canlı birimleri, öndekinden arkadakine (slot sırası). */
  livingByDepth(side: Side): Combatant[] {
    return this.living(side).sort((a, b) => a.slot - b.slot);
  }

  /** Bir durum tanımı (data/statuses.json); taunt/guard/regen gibi özel kodlu durumların tanımı yoktur. */
  statusDef(kind: string): StatusDef | undefined {
    return this.setup.statuses?.[kind];
  }

  /** Birimin üzerindeki durumların bir çarpanının (hız, alınan hasar, alınan şifa) çarpımı. */
  statusMult(c: Combatant, key: 'speedMult' | 'damageTakenMult' | 'healTakenMult', skip?: ReadonlySet<string>): number {
    let m = 1;
    for (const s of c.statuses) {
      if (skip?.has(s.kind)) continue;
      // Ağaç statusPotency: durumun çarpanına düz ek (yalnızca ağaçla uygulanan örnekte var)
      const v = this.statusDef(s.kind)?.[key];
      m *= s.potency?.[key] !== undefined ? Math.max(0, (v ?? 1) + s.potency[key]!) : (v ?? 1);
    }
    if (key === 'speedMult') m *= this.mireSpeedMult(c);
    return m;
  }

  /**
   * Mire-Bound (YM7, mob pasifi mireBound): birimin üstünde pasifin durumundan (Omen) en az 1 yığın varken, KARŞI taraftaki canlı her taşıyan
   * hızını x speedMult yapar; birden çok kaynakta tek (en güçlüsü). Yoksa 1.
   */
  mireSpeedMult(c: Combatant): number {
    let m = 1;
    for (const a of this.combatants) {
      const e = a.passive?.effect;
      if (e?.type !== 'mireBound' || a.hp <= 0 || a.side === c.side) continue;
      if (!c.statuses.some((s) => s.kind === e.status && (s.stacks ?? 1) > 0)) continue;
      m = Math.min(m, e.speedMult);
    }
    return m;
  }

  /** Bone Ward (YM10, mob pasifi boneWard): kendi tarafında canlı bir çağrı varken alınan TÜM hasar çarpanı (1 - reduce); yoksa 1. */
  passiveTakenMult(target: Combatant): number {
    const e = target.passive?.effect;
    // Close Ranks (YM20): aynı sıradaki her diğer canlı sıra alan dost için -perAlly (toplamsal; en az 0)
    if (e?.type === 'closeRanks') return Math.max(0, 1 - e.perAlly * this.rowMatesOf(target));
    if (e?.type !== 'boneWard') return 1;
    return this.combatants.some((a) => a.side === target.side && a.summoned && a.hp > 0 && a.uid !== target.uid && !a.inert) ? 1 - e.reduce : 1;
  }

  /**
   * Bu vuruş kural gereği bloklanabilir mi (kalkandan bağımsız): yalnızca DÜŞMANIN fiziksel vuruşu; büyü ve "Unblockable" (src/engine/unblockable.ts:
   * hasar etkisinde `unblockable` bayrağı = Backstab, ya da telgraflı boss skill'i) hayır. `skill` verilmezse yalnızca etkinin bayrağına bakılır.
   */
  blockableHit(actor: Combatant, target: Combatant, effect: Pick<DamageEffect, 'damageType' | 'unblockable'>, skill?: Pick<SkillDef, 'telegraph'> | null): boolean {
    return actor.side !== target.side && effect.damageType === 'physical' && !isUnblockableHit(skill, effect);
  }

  /**
   * Blok şansı (Ömer 2026-10-18; 0-1): `target`'ın kalkanı (item kancası `blockChance`, tavan items.json > caps.block) `actor`'ün bu hasar
   * etkisini bloklayabilir mi (blockableHit). İsabet zarsız (sure) vuruşu çağıran eler. Önizleme / YZ isabet şansını x(1 - blok) ile çarpar.
   */
  blockChance(actor: Combatant, target: Combatant, effect: Pick<DamageEffect, 'damageType' | 'unblockable'>, skill?: Pick<SkillDef, 'telegraph'> | null): number {
    const c = this.unitBlockChance(target);
    if (!(c > 0) || !this.blockableHit(actor, target, effect, skill)) return 0;
    return c;
  }

  /** Birimin kalkan blok şansı (0-1; tavan dahil, kalkansızda 0). Savaş birim kartı "BLOCK n%" satırı bunu gösterir. Saf. */
  unitBlockChance(c: Partial<Pick<Combatant, 'itemEffects' | 'treeFx'>>): number {
    const v = effNum(c, 'blockChance');
    return v > 0 ? Math.min(ITEM_HOOK_CAPS.block, v) : 0;
  }

  /**
   * Blok zarı: şans 0 ise (kalkansız hedef, büyü, Unblockable, sure) rastgele sayı TÜKETMEZ (QB / altın kayıtlar birebir). Debug "Force block"
   * (`debug.block`): kural gereği bloklanabilen her vuruş (kalkan şartı yok, iki taraf) bloklanır; zar yine şansa göre atılır (sayı akışı aynı).
   */
  private rollBlock(actor: Combatant, target: Combatant, effect: DamageEffect, sure: boolean): boolean {
    const skill = this.castingSkill;
    const chance = sure ? 0 : this.blockChance(actor, target, effect, skill);
    const rolled = chance > 0 && this.rng.next() < chance;
    if (this.debug.block && !sure && this.blockableHit(actor, target, effect, skill)) return true;
    return rolled;
  }

  /** Alınan hasarın toplam çarpanı: durumlar (Fortified/Blessed...) x taunt eden dostun koruması (taunt'lı olmayan dostlar). */
  damageTakenMult(target: Combatant, attacker?: Combatant, type?: 'physical' | 'magic', skill?: SkillDef | null): number {
    // Faz 5a (Through the Guard): saldıranın pierce kuralının yok saydığı durumlar çarpılmaz (kural yoksa ifade aynı)
    const pierce = attacker?.treeHooks && attacker.side !== target.side ? this.pierceOf(attacker) : null;
    let m = this.statusMult(target, 'damageTakenMult', pierce?.statuses);
    if (!target.statuses.some((s) => s.kind === 'taunt')) {
      let protect = 1;
      for (const ally of this.living(target.side)) {
        if (ally.uid === target.uid) continue;
        for (const s of ally.statuses) if (s.kind === 'taunt' && s.allyMult !== undefined) protect = Math.min(protect, s.allyMult);
      }
      m *= protect;
    }
    // Warden's Oath (item etkisi adjacentGuard): ekranda yan komşu dostun koruması; birden çok kaynakta en yükseği
    const oath = this.adjacentGuardOf(target);
    if (oath > 0) m *= 1 - oath;
    // Global defense / Endurance (item affix'leri, Ömer 2026-10-11): yoksa çarpılmaz
    // Ağaç kanalı (treeFx) item'le birleşir: Global defense toplanır, Endurance kaynak başına ayrı eşikle (tree-hooks.ts)
    const dtr = effNum(target, 'damageTakenReduce');
    if (dtr) m *= 1 - Math.min(ITEM_HOOK_CAPS.damageTaken, dtr);
    for (const { v: lr } of effList(target, 'lowHpReduce')) if (target.hp > 0 && target.hp < lr.below * target.maxHp) m *= 1 - Math.min(ITEM_HOOK_CAPS.damageTaken, lr.reduce);
    // Bone Ward (mob pasifi): yoksa çarpılmaz
    const bw = this.passiveTakenMult(target);
    if (bw !== 1) m *= bw;
    // Faz 4a C4 (damageTaken): hasarı alanın tarafındaki C4 kancaları (yalnızca ağaçlı savaş; önizleme ve gerçek vuruş aynı)
    if (this.healOn) {
      const tm = this.treeTakenMult(target, attacker, type, skill);
      if (tm !== 1) m *= tm;
    }
    return m;
  }

  /** Saldıranın ekranda yan komşusu olan canlı dostlarından gelen en yüksek hasar aurası (item affix auraDamage; yoksa 0). */
  private auraDamageOf(actor: Combatant): number {
    let best = 0;
    for (const a of this.living(actor.side)) if (a.uid !== actor.uid && effNum(a, 'auraDamage') > best && this.sideAdjacent(a, actor)) best = effNum(a, 'auraDamage');
    return best;
  }

  /** Hedefin ekranda yan komşusu olan (sideNeighbors) canlı dostlarından gelen en yüksek adjacentGuard (yoksa 0). */
  private adjacentGuardOf(target: Combatant): number {
    let best = 0;
    for (const a of this.living(target.side)) if (a.uid !== target.uid && a.board === target.board && effNum(a, 'adjacentGuard') > best) {
      const map = this.setup.formulas.formation.sideNeighbors?.[target.board]?.[target.slot];
      const alive = this.living(target.side).filter((c) => c.uid !== target.uid && c.board === target.board);
      const near = map ? pickSideNeighbors(map, (slot) => alive.some((c) => c.slot === slot)) : alive.filter((c) => this.rowOf(c.slot) === this.rowOf(target.slot) && Math.abs(this.laneOf(c.slot) - this.laneOf(target.slot)) === 1).map((c) => c.slot);
      if (near.includes(a.slot)) best = effNum(a, 'adjacentGuard');
    }
    return best;
  }

  /**
   * Yer etkisinin bir tikte hedefe vereceği büyü hasarı: ham miktar (bırakanın statından sabitlenmiş) x element zayıflığı x (1 - büyü zırhı azalması).
   * Kritik/isabet yok; sapma yok (tik sabit). Önizleme ve tik aynı fonksiyonu kullanır.
   */
  groundTickDamage(groundId: string, amount: number, target: Combatant): number {
    return this.tickDamage(this.setup.grounds?.[groundId]?.element ?? 'physical', 'magic', amount, target);
  }

  /** D11 (Holy Ground): şifa zemini mi (grounds.json > heal)? Şifa zemini hasar vermez, bırakanın tarafını iyileştirir. */
  isHealGround(groundId: string): boolean {
    return this.setup.grounds?.[groundId]?.heal === true;
  }

  /** Şifa zemininin bir tikte hedefe vereceği şifa (alınan şifa çarpanı dahil, eksik canla sınırlı değil); önizleme ile aynı. */
  groundTickHeal(amount: number, target: Combatant): number {
    return Math.round(amount * this.statusMult(target, 'healTakenMult'));
  }

  /**
   * Sabit (sapmasız, kritiksiz, isabet zarsız) tik hasarı: ham miktar x element zayıflığı x (1 - zırh azalması; büyüde büyü zırhı). Yer etkisi tiki ve
   * karakter üstü DoT (Wither) aynı kuralı kullanır; önizleme de bu fonksiyonu kullanır.
   */
  tickDamage(element: Element, damageType: 'physical' | 'magic', amount: number, target: Combatant): number {
    const f = this.setup.formulas;
    const weak = target.tags.reduce((m, tag) => m * (f.weaknesses?.[tag]?.[element] ?? 1), 1);
    const st = this.effectiveStats(target);
    const red = armorReduction(damageType === 'magic' ? st.magicArmor : st.armor, f);
    const bw = this.passiveTakenMult(target); // Bone Ward: tik hasarı da azalır (yoksa 1, ifade aynı)
    return Math.max(f.damage.minDamage, Math.round(amount * weak * (1 - red) * bw));
  }

  /** DoT durumunun (statuses.json > dot) bir tikte hedefe vereceği hasar (önizleme ve gerçek tik aynı). */
  dotTickDamage(kind: string, amount: number, target: Combatant): number {
    const dot = this.statusDef(kind)?.dot;
    return this.tickDamage(dot?.element ?? 'physical', dot?.damageType ?? 'magic', amount, target);
  }

  // --- Yığılan durum (Omen) ve Doom (Hexer) ---

  /** Birimdeki `kind` yığını (yoksa 0). */
  stacksOf(uid: string, kind: string): number {
    return this.get(uid)?.statuses.find((s) => s.kind === kind)?.stacks ?? 0;
  }

  /** Yığılan durumun Doom'u için hasar belirtimi (zayıflık, alınan hasar çarpanları; isabet zarı yok). */
  private doomSpec(target: Combatant, kind: string, power: number): DamageSpec | null {
    const doom = this.statusDef(kind)?.doom;
    if (!doom) return null;
    const f = this.setup.formulas;
    const weak = target.tags.reduce((m, tag) => m * (f.weaknesses?.[tag]?.[doom.element] ?? 1), 1);
    return {
      damageType: doom.damageType,
      scale: doom.scale,
      power: doom.powerPerStack * power * weak,
      extra: 0,
      takenMultiplier: (target.summoned ? f.summon.damageTakenMultiplier : 1) * this.damageTakenMult(target),
    };
  }

  /** Doom hesabında saldıran yerine geçen stat nesnesi: yalnızca ölçek statı (snapshot ya da canlı değer). */
  private static scaleOnly(scale: string, value: number): Combatant['stats'] {
    return { [scale]: value, spellPowerMult: 1 } as unknown as Combatant['stats'];
  }

  /**
   * Doom'un hedefe hasar aralığı (kritik hariç; min/max/avg) ve kritikte en yüksek değer: `omens` yığın x `mult` çarpan, ölçek statı `statValue`
   * (canlı Hexer'in o anki değeri ya da snapshot). Büyü zırhı, zayıflık, alınan hasar çarpanları dahil; kalkan hariç. Saf (önizleme ve YZ).
   */
  doomRange(target: Combatant, kind: string, omens: number, mult: number, statValue: number): Range | null {
    const spec = this.doomSpec(target, kind, omens * mult);
    const doom = this.statusDef(kind)?.doom;
    if (!spec || !doom || omens <= 0) return null;
    return damageRange(Battle.scaleOnly(doom.scale, statValue), this.effectiveStats(target), spec, this.setup.formulas);
  }

  /** Doom hesabındaki ölçek statı: birimin stat değeri x skill gücü çarpanı (birim güçlendirmesi powerMult; normalde 1). Önizleme de bunu kullanır. */
  static doomStat(c: Pick<Combatant, 'stats'>, scale: Attribute): number {
    return c.stats[scale] * (c.stats.spellPowerMult ?? 1);
  }

  /** Yığına yazılan snapshot: ekleyenin doom ölçek statı, geçerli kritik şansı ve kritik çarpanı. */
  private stackSnapshot(actor: Combatant, kind: string): Pick<Status, 'snapStat' | 'snapCrit' | 'snapCritMult'> {
    const doom = this.statusDef(kind)?.doom;
    return { snapStat: doom ? Battle.doomStat(actor, doom.scale) : 0, snapCrit: this.effectiveStats(actor).critChance, snapCritMult: actor.stats.critMult };
  }

  /**
   * Yığın ekler (Omen): yoksa durumu süresiyle (statuses.json > duration; Resilience zarı yalnızca burada) başlatır, varsa yığını artırır;
   * `refreshOnStack` ise süre tam `duration`'a YENİLENİR (Ömer 2026-10-08, Ö2 güncellendi; Resilience zarı yenilemede atılmaz), değilse süreye dokunmaz.
   * Snapshot ve kaynak son ekleyene yazılır. Olaylar: status (stacks) + omen. `autoDoom` ve yığın maxStacks'e ulaştıysa Doom anında;
   * `critDoom` (critDoomOnCrit etkisi + kritik vuruş): o Doom KESİN kritik.
   */
  private addStacks(target: Combatant, kind: Status['kind'], n: number, actor: Combatant, emit: Emit, crit: boolean, autoDoom: boolean, critDoom = false): void {
    const def = this.statusDef(kind);
    if (!def?.maxStacks || n <= 0 || target.hp <= 0) return;
    const max = def.maxStacks;
    let st = target.statuses.find((s) => s.kind === kind);
    const before = st?.stacks ?? 0;
    const snap = this.stackSnapshot(actor, kind);
    if (!st) {
      this.addStatus(target, { kind, turns: def.duration ?? 3, source: actor.uid, stacks: Math.min(max, n), ...snap }, emit);
      st = target.statuses.find((s) => s.kind === kind);
      if (!st) return; // tutmadı (bağışıklık, Debuff resistance, Ashen Crown)
    } else {
      st.stacks = Math.min(max, before + n);
      st.source = actor.uid;
      if (def.refreshOnStack) st.turns = Math.max(st.turns, def.duration ?? 3);
      Object.assign(st, snap);
      emit({ type: 'status', target: target.uid, status: kind, turns: st.turns, source: actor.uid, stacks: st.stacks });
    }
    emit({ type: 'omen', source: actor.uid, target: target.uid, delta: (st.stacks ?? 0) - before, stacks: st.stacks ?? 0, max, ...(crit ? { crit: true } : {}), cause: 'skill' });
    if (autoDoom && (st.stacks ?? 0) >= max && def.doom) this.triggerDoom(target, st, 1, 'complete', actor, emit, undefined, critDoom);
  }

  /**
   * Doom: yığını tüketip patlatır. complete / detonate: tetikleyen (canlı, eylem yapan) Hexer'in o anki ölçek statı ve kritik şansı; skill vuruşunun
   * parçası (Guard paylaşımı, kalkan, kalkan kancaları, Lucky Escape normal; origin 'skill'). expire: yığındaki snapshot (son ekleyen; ölmüş olabilir),
   * tur başı durum hasarı: Guard'a AKTARILMAZ (madde Ö12), origin 'status'. İsabet zarı yok; sapma ve ayrı kritik zarı var (seed'li RNG).
   * Ölümde Ill Omen Doom kuralıyla (onDoomKill) çalışır (Doom Mark noTransferOnKill ise hiç çalışmaz). `forceCrit`: kritik zarı ATILMAZ, Doom kesin
   * kritik (kritik Jinx'in tamamladığı Doom; debug 'never' yine kapatır).
   */
  private triggerDoom(target: Combatant, status: Status, mult: number, cause: 'complete' | 'expire' | 'detonate', trigger: Combatant | undefined, emit: Emit, skillId?: string, forceCrit = false): void {
    const doom = this.statusDef(status.kind)?.doom;
    const omens = status.stacks ?? 0;
    if (this.trigOn) this.doomSize.set(status, omens * mult); // Faz 4c (Leaping Mark): öldüren Doom'un büyüklüğü (Omen x çarpan)
    // Skill ağacı (at 'doom'): patlatanın (canlı tetikleyen ya da yığının sahibi) C1 kancaları; koşullar patlamadan ÖNCEKİ hedefi görür
    const live0 = cause !== 'expire' && trigger !== undefined && trigger.hp > 0;
    const owner = live0 ? trigger : this.get(status.source);
    let dm: TreeModAcc | null = null;
    if (owner?.treeHooks && doom && omens > 0 && target.hp > 0) {
      const tick: TickInfo = { firstDoom: !this.doomsBy.get(owner.uid), ...(skillId ? { doomSource: skillId } : {}), ...(status.transferred ? { fromTransfer: true } : {}) };
      dm = this.treeMods(owner, target, skillId ? this.skill(skillId, owner.uid) : null, undefined, { at: 'doom', tick, roll: true });
    }
    if (owner && this.treeUnits && doom && omens > 0 && target.hp > 0) this.doomsBy.set(owner.uid, (this.doomsBy.get(owner.uid) ?? 0) + 1);
    const had = target.statuses.includes(status);
    target.statuses = target.statuses.filter((s) => s !== status);
    if (had) emit({ type: 'statusEnd', target: target.uid, status: status.kind, cause: 'doom' });
    if (!doom || omens <= 0 || target.hp <= 0) return;
    const f = this.setup.formulas;
    const live = live0;
    const statValue = live ? Battle.doomStat(trigger!, doom.scale) : (status.snapStat ?? 0);
    const critChance = live ? this.effectiveStats(trigger!).critChance : (status.snapCrit ?? 0);
    const critMult = live ? trigger!.stats.critMult : (status.snapCritMult ?? f.attributes.critMult);
    const src = live ? trigger! : (this.get(status.source) ?? target);
    emit({ type: 'doom', source: src.uid, target: target.uid, omens, mult, cause, ...(skillId ? { skill: skillId } : {}), ...(forceCrit ? { sureCrit: true } : {}) });
    const spec0 = this.doomSpec(target, status.kind, omens * mult)!;
    const spec = dm?.ignoreDefense ? { ...spec0, ignoreDefense: Math.min(1, Math.max(0, (spec0.ignoreDefense ?? 0) + dm.ignoreDefense)) } : spec0;
    const base = rollDamage(Battle.scaleOnly(doom.scale, statValue), this.effectiveStats(target), spec, f, this.rng);
    const sure = forceCrit || !!dm?.guaranteedCrit;
    const rolled = dm?.noCrit ? { crit: false } : sure ? { crit: true } : rollCrit({ critChance: dm?.critBonus ? Math.min(1, Math.max(0, critChance + dm.critBonus)) : critChance, critMult }, this.rng);
    const crit = this.debug.crit === 'auto' ? rolled.crit : sure && !dm?.noCrit ? this.debug.crit !== 'never' : this.debug.crit === 'always';
    const total = Math.max(f.damage.minDamage, Math.round(base * (crit ? critMult * (dm?.critDmg ?? 1) : 1) * this.debug.damageMult * (dm?.power ?? 1)));
    if (dm && owner) this.treeProcAll(owner.uid, dm.nodes);
    const meta: HitMeta = { origin: cause === 'expire' ? 'status' : 'skill', element: doom.element, damageType: doom.damageType, status: status.kind };
    const guard = cause === 'expire' ? undefined : target.statuses.find((s) => s.kind === 'guard');
    const guardian = guard ? this.get(guard.source) : undefined;
    let dealt = 0;
    if (guard && guardian && guardian !== target && guardian.hp > 0) {
      const redirected = Math.round(total * (guard.share ?? 0.5));
      dealt += this.applyHit(src, target, total - redirected, doom.damageType, crit, emit, false, meta);
      if (redirected > 0) dealt += this.applyHit(src, guardian, this.guardShareCut(guardian, redirected, src), doom.damageType, crit, emit, true, meta);
    } else {
      const lost = this.applyHit(src, target, total, doom.damageType, crit, emit, false, meta);
      // Ağaç Doom lifesteal (Feast of Ruin): patlatana, hedefin kaybettiği canın oranı
      dealt = lost;
      if (dm?.lifesteal && owner && owner.hp > 0 && lost > 0) this.bondEcho(owner, this.applyHeal(owner, owner, Math.round(lost * dm.lifesteal), false, emit), emit);
    }
    // Faz 4a: Doom tetiği (patlatan / yığının sahibi; hedef = Doom yiyen; koşul targetHpAbove 0 = sağ kaldı)
    if (this.trigOn && owner) this.trig([owner], { on: 'doom', target, subject: target, amount: omens, dealt, ...(skillId ? { skill: skillId } : {}) }, emit);
    this.announceIfDead(target, emit, status);
    if (guardian) this.announceIfDead(guardian, emit);
  }

  /**
   * Ill Omen (pasif omenTransfer): ölen birimin yığını (Doom ile öldüyse `doomed`: tüketilen yığının kalanı, onDoomKill kadar), yığının kaynağı canlıysa
   * ve bu pasifi taşıyorsa, ölenin tahtasındaki en yakın canlı birime geçer. Varışta en fazla maxOnArrival (ve maxStacks - 1: Doom tetiklemez);
   * ölenin kalan süresini (en az 1) ve snapshot'ını taşır; alıcıda yığın varsa alıcının sayacı korunur.
   */
  private illOmen(dead: Combatant, emit: Emit, doomed?: Status): void {
    const list = doomed ? [doomed] : dead.statuses.filter((s) => (this.statusDef(s.kind)?.maxStacks ?? 0) > 0 && (s.stacks ?? 0) > 0);
    // Doom Mark (detonate noTransferOnKill) bu birimi öldürdüyse: yığın silinir, hiçbir şey geçmez (Ömer 2026-10-08)
    const erased = !!this.noTransferKill?.has(dead.uid);
    if (erased) {
      for (const st of list) {
        if (doomed) continue; // Doom zaten tüketti ve sildi
        dead.statuses = dead.statuses.filter((s) => s !== st);
        emit({ type: 'statusEnd', target: dead.uid, status: st.kind, cause: 'erased' });
      }
      // Faz 2c (Doom Leaks tam hâli): Doom Mark'ın öldürmesi de Doom öldürmesi sayılır: sahibinin onDoomKill'i (ağaç) > 0 ise o kadar Omen yine geçer.
      // Ağaçsız Hexer'de onDoomKill 0: buradan döner (eski davranış birebir)
      const leaks = list.some((st) => {
        const pe = this.get(st.source)?.passive?.effect;
        return pe?.type === 'omenTransfer' && pe.onDoomKill > 0;
      });
      if (!leaks) return;
    }
    for (const st of list) {
      const owner = this.get(st.source);
      const pe = owner?.passive?.effect;
      if (!owner || owner.hp <= 0 || pe?.type !== 'omenTransfer' || pe.status !== st.kind || owner.side === dead.side) continue;
      if (!doomed && !erased) {
        dead.statuses = dead.statuses.filter((s) => s !== st);
        emit({ type: 'statusEnd', target: dead.uid, status: st.kind, cause: 'ill_omen' });
      }
      const pass = doomed || erased ? pe.onDoomKill : (st.stacks ?? 0);
      const to = this.nearestLivingAlly(dead);
      const def = this.statusDef(st.kind);
      if (!to || pass <= 0 || !def?.maxStacks) continue;
      const cap = Math.min(pe.maxOnArrival, def.maxStacks - 1);
      const ex = to.statuses.find((s) => s.kind === st.kind);
      const before = ex?.stacks ?? 0;
      const after = Math.min(cap, before + pass);
      if (after <= before) continue;
      const snap = { snapStat: st.snapStat, snapCrit: st.snapCrit, snapCritMult: st.snapCritMult };
      emit({ type: 'passive', actor: owner.uid, passive: owner.passive!.id, name: owner.passive!.name });
      let turns: number;
      if (ex) {
        ex.stacks = after;
        ex.source = owner.uid;
        Object.assign(ex, snap);
        if (this.treeUnits) ex.transferred = true;
        turns = ex.turns; // alıcının sayacı korunur (uzamaz)
      } else {
        turns = Math.max(1, st.turns); // ölenin kalan süresi (yeni 3 tur değil; Resilience zarı yok: taze lanet değil)
        to.statuses.push({ kind: st.kind, turns, source: owner.uid, stacks: after, ...snap, ...(this.treeUnits ? { transferred: true } : {}) });
      }
      emit({ type: 'omenTransfer', source: owner.uid, from: dead.uid, to: to.uid, stacks: after - before, after });
      emit({ type: 'omen', source: owner.uid, target: to.uid, delta: after - before, stacks: after, max: def.maxStacks, cause: 'transfer' });
      emit({ type: 'status', target: to.uid, status: st.kind, turns, source: owner.uid, stacks: after });
    }
  }

  /**
   * Ölen birimin tahtasındaki EN YAKIN canlı dostu (Ill Omen alıcısı; çağrılar dahil): ekran ızgarasında (formation.screenGrid) Manhattan uzaklığı en küçük;
   * eşitlikte önce aynı sıra (derinlik), sonra küçük yuva. Izgara yoksa sıra/şerit Manhattan. Belirleyici.
   */
  nearestLivingAlly(dead: Combatant): Combatant | undefined {
    const grid = this.setup.formulas.formation.screenGrid?.[dead.board];
    const pos = (slot: number) => grid?.[slot] ?? { col: this.rowOf(slot), row: this.laneOf(slot) };
    const p = pos(dead.slot);
    const dist = (c: Combatant) => Math.abs(pos(c.slot).col - p.col) + Math.abs(pos(c.slot).row - p.row);
    const sameRow = (c: Combatant) => (this.rowOf(c.slot) === this.rowOf(dead.slot) ? 0 : 1);
    return this.combatants
      .filter((c) => c.uid !== dead.uid && c.hp > 0 && c.side === dead.side && c.board === dead.board)
      .sort((a, b) => dist(a) - dist(b) || sameRow(a) - sameRow(b) || a.slot - b.slot)[0];
  }

  /** Skip Turn hız desteği (birim uid -> +oran; 1 = %100): birimin bir sonraki turunun başlamasına kadar sürer. */
  private readonly speedBoost = new Map<string, number>();

  /** Birimin Skip Turn hız desteği (0 = yok; 1 = +%100: sayaç iki kat hızlı dolar). Bir sonraki turu başlayınca sıfırlanır. UI hız çubuğu/rozeti için. */
  speedBoostOf(uid: string): number {
    return this.speedBoost.get(uid) ?? 0;
  }

  /** Destek HARİÇ hız: stat x durum çarpanları (Slow/Haste). */
  baseSpeedOf(c: Combatant): number {
    return Math.max(speedMin(this.setup.formulas), roundSpeed(c.stats.spd * this.statusMult(c, 'speedMult'), this.setup.formulas));
  }

  /**
   * Sıra hesabında kullanılan hız: stat x (durum çarpanları + Skip Turn desteği). Destek TOPLAMSALdır (yüzdeler toplanır):
   * Haste (x1,4) + %100 = x2,4; Slow (x0,7) + %100 = x1,7; durumsuz = x2.
   */
  speedOf(c: Combatant): number {
    const boost = this.speedBoostOf(c.uid);
    if (boost <= 0) return this.baseSpeedOf(c);
    return Math.max(speedMin(this.setup.formulas), roundSpeed(c.stats.spd * (this.statusMult(c, 'speedMult') + boost), this.setup.formulas));
  }

  /** Dex-primary Hunter's Mark: saldıran hedefinden daha HIZLIYSA (geçerli hız, Slow/Haste dahil; geçici Skip desteği hariç) hasar çarpanı 1 + hunterMark; değilse 1. */
  hunterMarkMult(actor: Combatant, target: Combatant): number {
    const m = actor.stats.hunterMark ?? 0;
    return m > 0 && this.baseSpeedOf(actor) > this.baseSpeedOf(target) ? 1 + m : 1;
  }

  /**
   * Saldırının hedefe göre verdiği hasar çarpanı: Hunter's Mark x Giantslayer (item etkisi tierDamageMult: hedef elit / boss rütbeli ya da boss tanımlı).
   * Etki yoksa hunterMarkMult ile aynı. Önizleme ve yapay zeka da bunu kullanır.
   */
  dealtDamageMult(actor: Combatant, target: Combatant, skill?: SkillDef | null, effect?: DamageEffect, q: TreeQuery = {}): number {
    const gs = effMult(actor, 'tierDamageMult');
    let m = this.hunterMarkMult(actor, target) * (gs && (target.tier !== undefined || target.boss !== undefined) ? gs : 1);
    // Mob pasifleri (YM14 Grudge, YM16 Pack Tactics, YM19 Shares of the Dead): giden hasar çarpanı; pasif yoksa 1 (ifade aynı)
    const pm = actor.passive ? this.passiveDealtMult(actor, target, skill) : 1;
    if (pm !== 1) m *= pm;
    // Altıncı tur (Weakened): saldıranın üstündeki "verilen hasar" durumları (statuses.json damageDealtMult / magicDealtMult + ağaç statusPotency); yoksa 1
    const wm = actor.statuses.length ? this.weakenedMult(actor, effect?.damageType ?? skill?.effects.find((e): e is DamageEffect => e.type === 'damage')?.damageType) : 1;
    if (wm !== 1) m *= wm;
    // Skill ağacı C1 koşullu güç (cond powerMul / maxBonus; tree-hooks.ts): kancası olmayan birimde hiç hesaplanmaz (ifade aynı)
    if (actor.treeHooks) {
      const tm = this.treeMods(actor, target, skill, effect, q);
      if (tm && tm.power !== 1) m *= tm.power;
    }
    // Hasar aurası (item affix auraDamage): yan komşu dosttan; yoksa çarpılmaz
    const aura = this.living(actor.side).some((a) => effNum(a, 'auraDamage') > 0) ? this.auraDamageOf(actor) : 0;
    return aura > 0 ? m * (1 + aura) : m;
  }

  /**
   * Altıncı tur (Weakened): birimin VERDİĞİ hasar çarpanı. Her durum için (tanımdaki değer ?? 1) + örneğin statusPotency eki (en az 0); `magicDealtMult`
   * yalnızca büyü hasarında. Çarpanlar çarpılır. Durum yoksa 1.
   */
  weakenedMult(c: Combatant, type?: 'physical' | 'magic'): number {
    let m = 1;
    for (const s of c.statuses) {
      const d = this.statusDef(s.kind);
      const all = d?.damageDealtMult;
      const pa = s.potency?.damageDealtMult;
      if (all !== undefined || pa !== undefined) m *= Math.max(0, (all ?? 1) + (pa ?? 0));
      if (type === 'magic') {
        const mg = d?.magicDealtMult;
        const pm = s.potency?.magicDealtMult;
        if (mg !== undefined || pm !== undefined) m *= Math.max(0, (mg ?? 1) + (pm ?? 0));
      }
    }
    return Math.round(m * 1e6) / 1e6;
  }

  // --- Skill ağacı kancaları (Faz 2a; src/engine/tree-hooks.ts, docs/design/skill-tree-implementation.md "Faz 2a notları") ---
  // Ağaçsız savaşta (treeUnits false) hiçbiri çalışmaz ve izleme haritaları dolmaz: olay akışı, zar sırası ve kayıtlar birebir eski.

  /** Önizleme / YZ / gerçek vuruşun hedef listesi (cond ölçeği hitWithStatus). cast ve previewForTargets kurar. */
  private condTargetList: readonly Combatant[] | null = null;
  /** Önizleme: ölçeklerin göreceği hedef listesi (previewForTargets çağırır; bitince null). */
  setCondTargets(list: readonly Combatant[] | null): readonly Combatant[] | null {
    const prev = this.condTargetList;
    this.condTargetList = list;
    return prev;
  }
  /** Koşul izleme (yalnızca treeUnits): son skill vuranı, son turundan beri vuranlar, eylem yapmışlar, önceki / şimdiki eylemde harcanan Rage. */
  private readonly lastSkillHit = new Map<string, string>();
  private readonly hitSince = new Map<string, Set<string>>();
  private readonly actedUids = new Set<string>();
  private readonly prevRage = new Map<string, number>();
  private readonly curRage = new Map<string, number>();
  /** Faz 2a+ izleme (yalnızca treeUnits): ıskalayanlar, isabet geçmişi, son hedefler, MP bedeli, seri, yenen vuruşlar, ölüm saati, Doom sayısı. */
  private readonly missedSince = new Map<string, Set<string>>();
  private readonly landedOn = new Map<string, Set<string>>();
  private readonly lastTargetsOf = new Map<string, string[]>();
  private readonly lastMpCost = new Map<string, boolean>();
  private readonly streakOf = new Map<string, { skill: string; n: number }>();
  private readonly hitsTaken = new Map<string, number>();
  private readonly hitsAtUse = new Map<string, number>();
  private readonly diedAt = new Map<string, number>();
  private readonly turnAt = new Map<string, number>();
  private readonly doomsBy = new Map<string, number>();
  private treeClock = 0;
  /** Bu kullanımın sonuçları (cast kurar; kullanım bitince null). */
  private castInfo: CastInfo | null = null;
  /** Bu kullanımda preHit durumu uygulanan hedefler. */
  private preHitDone: Set<string> | null = null;
  /** Bu kullanımda ödenen Rage (cast içinde; cond rageSpentAtLeast). */
  private castPaid: { uid: string; rage: number } | null = null;
  /** Ağacın değiştirdiği etki kopyası -> skill'deki asıl etki (seçici 'damage:N' sırası asıl etkiye bakar). */
  private readonly effOrig = new WeakMap<object, DamageEffect>();
  /** Ölçüm: düğüm başına tetiklenme (anahtar 'uid|düğüm') ve dinleyiciler (olay akışına / kayda GİRMEZ). */
  private readonly procCounts = new Map<string, number>();
  private readonly procListeners = new Set<(e: TreeProcEvent) => void>();

  /** Ağaç kaynaklı etki tetiklenince çağrılır ({ type: 'treeProc', uid, node }); sim düğüm başına sayar. Dönen fonksiyon dinlemeyi bırakır. */
  onTreeProc(listener: (e: TreeProcEvent) => void): () => void {
    this.procListeners.add(listener);
    return () => this.procListeners.delete(listener);
  }
  /** Bu savaştaki ağaç tetiklenmeleri (birim + düğüm başına sayı). */
  treeProcs(): Array<{ uid: string; node: string; count: number }> {
    return [...this.procCounts].map(([k, count]) => {
      const i = k.indexOf('|');
      return { uid: k.slice(0, i), node: k.slice(i + 1), count };
    });
  }
  private treeProc(uid: string, node: string): void {
    const k = `${uid}|${node}`;
    this.procCounts.set(k, (this.procCounts.get(k) ?? 0) + 1);
    for (const l of this.procListeners) l({ type: 'treeProc', uid, node });
  }
  private treeProcAll(uid: string, nodes: readonly string[]): void {
    for (const n of new Set(nodes)) this.treeProc(uid, n);
  }
  /** unitFx anahtarının ağaç kaynağı tetiklendi: o anahtarı veren düğümler. */
  private fxProc(c: Combatant, key: string): void {
    for (const n of c.treeFxNodes?.[key] ?? []) this.treeProc(c.uid, n);
  }

  private condHostImpl?: CondHost;
  private get condHost(): CondHost {
    const lanes = this.setup.formulas.formation.lanes;
    return (this.condHostImpl ??= {
      alliesOf: (c) => this.living(c.side).filter((a) => a.uid !== c.uid && !a.inert),
      enemiesOf: (c) => this.living(opposite(c.side)).filter((a) => !a.inert),
      armorOf: (c) => this.effectiveStats(c).armor,
      speedOf: (c) => this.baseSpeedOf(c),
      lastSkillHitter: (uid) => this.lastSkillHit.get(uid),
      hitSinceTurn: (self, attacker) => !!this.hitSince.get(self)?.has(attacker),
      hitSinceTurnAny: (self) => (this.hitSince.get(self)?.size ?? 0) > 0,
      missedSinceTurn: (self, attacker) => !!this.missedSince.get(self)?.has(attacker),
      hitBefore: (actor, target) => !!this.landedOn.get(actor)?.has(target),
      acted: (uid) => this.actedUids.has(uid),
      lastAction: (uid) => this.lastKind.get(uid),
      prevRageSpent: (uid) => this.prevRage.get(uid) ?? 0,
      lastTargets: (uid) => this.lastTargetsOf.get(uid) ?? [],
      lastSkillCostMp: (uid) => !!this.lastMpCost.get(uid),
      skillStreak: (uid, skill) => (this.streakOf.get(uid)?.skill === skill ? this.streakOf.get(uid)!.n : 0),
      gathered: (uid) => this.gatheredN.get(uid) ?? 0,
      centerCrits: () => this.centerCritN,
      hitsTakenSinceUse: (uid, skill) => (this.hitsTaken.get(uid) ?? 0) - (this.hitsAtUse.get(`${uid}|${skill}`) ?? 0),
      diedSinceTurn: (self, target) => {
        const d = this.diedAt.get(target);
        return d !== undefined && d >= (this.turnAt.get(self) ?? 0);
      },
      groundsAt: (c) => this.ground.filter((g) => g.board === c.board && g.slots.includes(c.slot)).map((g) => g.ground),
      rowOf: (c) => this.rowOf(c.slot),
      occupiedRows: (c) => {
        const rows = this.living(c.side).filter((a) => !a.inert && a.board === c.board).map((a) => this.rowOf(a.slot));
        return rows.length ? { front: Math.min(...rows), back: Math.max(...rows) } : { front: this.rowOf(c.slot), back: this.rowOf(c.slot) };
      },
      statusType: (kind) => this.statusDef(kind)?.type,
      distance: (a, b) => Math.floor(a.slot / lanes) + Math.floor(b.slot / lanes),
      beside: (a, b) => a.uid !== b.uid && a.board === b.board && this.sideAdjacent(a, b),
      nextTo: (a, b) => a.uid !== b.uid && a.board === b.board && Math.abs(this.rowOf(a.slot) - this.rowOf(b.slot)) + Math.abs(this.laneOf(a.slot) - this.laneOf(b.slot)) === 1,
      castTargets: () => this.condTargetList,
      inAura: (owner, ally) => {
        const e = owner.passive?.effect;
        if (e?.type !== 'armorAura' || owner.hp <= 0 || ally.uid === owner.uid || ally.side !== owner.side || ally.board !== owner.board) return false;
        return this.auraReaches(owner, ally);
      },
      isAreaSkill: (skill) => (skill.target === 'area_enemies' || skill.target === 'area_any') && isShapeArea(skill.area),
      firedOn: (self, node, target) => this.firedOnSet.has(`${self}|${node}|${target}`),
      stillStreak: (uid) => this.stillCount.get(uid) ?? 0,
    });
  }
  /** Faz 2c izleme (yalnızca ağaçlı savaş): "her düşmana bir kez" kancalarının tetiklendiği hedefler ('uid|düğüm|hedef') ve Move'suz eylem serisi. */
  private readonly firedOnSet = new Set<string>();
  private readonly stillCount = new Map<string, number>();
  /** Faz 2c: etki koşulu (SkillEffect.when) bu alıcı için tutuyor mu (koşul yoksa true). */
  private effWhen(actor: Combatant, effect: SkillEffect, target: Combatant, skill: SkillDef | null | undefined): boolean {
    return !effect.when || condHolds(effect.when, this.condCtx(actor, target, skill));
  }
  /** Faz 2c: skill'de bu etkiden ÖNCE bir hasar etkisi var mı (durum / silme yalnızca o zaman isabete bağlı; veride hep böyle: ağaçsızda aynı). */
  private damageBefore(skill: SkillDef, effect: SkillEffect): boolean {
    const i = skill.effects.indexOf(effect);
    return skill.effects.slice(0, i < 0 ? skill.effects.length : i).some((e) => e.type === 'damage');
  }
  /**
   * Faz 2c (at 'aura'): zırh aurası sahibinin `receiver`a verdiği paya kancaların düz eki (auraPct x ölçek). Alıcı = hedef; gelen vuruş = şu an skill
   * kullanan düşman (Weathered: incomingArea). Kanca yoksa 0.
   */
  private auraHookPct(owner: Combatant, receiver: Combatant): number {
    if (!owner.treeHooks) return 0;
    let add = 0;
    for (const h of owner.treeHooks) {
      if (h.h !== 'cond' || h.at !== 'aura' || !h.mod.auraPct) continue;
      const ctx = this.condCtx(owner, receiver, null);
      ctx.node = h.node;
      const inc = this.castingActor;
      if (inc && inc.side !== owner.side) ctx.incoming = { actor: inc, skill: this.castingSkill };
      if (!condHolds(h.when, ctx)) continue;
      add += h.mod.auraPct * scaleOf(h.scale, ctx);
    }
    return add;
  }

  /** Kancanın bu kullanımda harcanan Rage'i: gerçek kullanımda ödenen, önizlemede / YZ'de ödenecek. */
  private rageSpentFor(actor: Combatant, skill: SkillDef | null | undefined): number {
    if (this.castPaid && this.castPaid.uid === actor.uid) return this.castPaid.rage;
    return skill?.cost.resource === 'rage' ? skillCostAmount(skill.cost, actor) : 0;
  }
  private condCtx(actor: Combatant, target: Combatant | undefined, skill: SkillDef | null | undefined, extra?: TreeQuery): CondCtx {
    const cast = this.castInfo && this.castPaid?.uid === actor.uid && (!skill || skill.id === this.castInfo.skill) ? this.castInfo : undefined;
    return {
      self: actor,
      ...(target ? { target } : {}),
      skill: skill ?? null,
      rageSpent: this.rageSpentFor(actor, skill),
      host: this.condHost,
      ...(cast ? { cast } : {}),
      ...(extra?.hit ? { hit: extra.hit } : {}),
      ...(extra?.tick ? { tick: extra.tick } : {}),
      ...(extra?.crit !== undefined ? { crit: extra.crit } : {}),
      ...(extra?.killed !== undefined ? { killed: extra.killed } : {}),
    };
  }

  /**
   * Tutan C1 kancaları (saf; `roll` true ise procChance'lı kancalar için zar atılır, false ise o kancalar SAYILMAZ). Süzgeç: bağlantı yeri, skill
   * kapsamı, değişiklik grubu, `late` (vuruş sonrası koşul) evresi ve seçici (damage / status / proc grupları etkiye bakar).
   */
  private heldHooks(actor: Combatant, target: Combatant | undefined, skill: SkillDef | null | undefined, q: TreeQuery & { groups: readonly ModGroup[]; effect?: SkillEffect }): Array<{ h: CondHook; s: number }> {
    const hooks = actor.treeHooks;
    if (!hooks) return [];
    const at = q.at ?? 'hit';
    const orig: SkillEffect | undefined = q.effect ? (this.effOrig.get(q.effect) ?? q.effect) : undefined;
    const dIdx = orig && skill && orig.type === 'damage' ? skill.effects.filter((e) => e.type === 'damage').indexOf(orig) : -1;
    const out: Array<{ h: CondHook; s: number }> = [];
    let ctx: CondCtx | undefined;
    for (const h of hooks) {
      if (h.h !== 'cond' || (h.at ?? 'hit') !== at) continue;
      if (h.skill && h.skill !== skill?.id) continue;
      if (q.late !== undefined && !!h.late !== q.late) continue;
      const gs = modGroups(h.mod);
      if (!q.groups.some((g) => gs.has(g))) continue;
      if (q.groups.some((g) => g === 'damage' || g === 'status' || g === 'proc') && at === 'hit') {
        const sel = h.sel ?? defaultSel(h.mod);
        if (orig ? !selMatches(sel, orig, dIdx) : sel !== 'damage') continue;
      }
      if (h.procChance !== undefined && !q.roll) continue;
      ctx ??= this.condCtx(actor, target, skill, q);
      ctx.node = h.node;
      if (!condHolds(h.when, ctx)) continue;
      const s = scaleOf(h.scale, ctx);
      if (!s) continue;
      if (h.procChance !== undefined && !(this.rng.next() < h.procChance)) continue;
      out.push({ h, s });
    }
    // Faz 4a: tetiğin verdiği geçici güç (TreeBuff) sanal C1 kancası gibi okunur (yalnızca vuruş noktası, vuruş öncesi evre; bekleyen sayılmaz)
    for (const b of actor.treeBuffs ?? []) {
      if (!b.mod || b.pending || at !== 'hit' || q.late === true) continue;
      if (b.skill && b.skill !== skill?.id) continue;
      const gs = modGroups(b.mod);
      if (!q.groups.some((g) => gs.has(g))) continue;
      if (q.groups.some((g) => g === 'damage' || g === 'status' || g === 'proc')) {
        const sel = defaultSel(b.mod);
        if (orig ? !selMatches(sel, orig, dIdx) : sel !== 'damage') continue;
      }
      out.push({ h: { h: 'cond', node: b.node, mod: b.mod }, s: b.s });
    }
    return out;
  }

  /**
   * C1 koşullu değiştiricilerin (hasar + durum grupları) bu (aktör, hedef, skill, etki) için toplamı; kancası yoksa ya da hiçbiri tutmazsa null.
   * Saf (durum değiştirmez; `roll` yalnızca durum uygulama noktasında). `effect` verilmezse yalnızca skill geneli ('damage' seçicili) kancalar.
   * `late` false (varsayılan): vuruş öncesi kancalar; true: vuruş sonrası koşullu (hitIsCrit / killingBlow) kancalar.
   */
  treeMods(actor: Combatant, target: Combatant | undefined, skill: SkillDef | null | undefined, effect?: SkillEffect, q: TreeQuery = {}): TreeModAcc | null {
    if (!actor.treeHooks) return null;
    const held = this.heldHooks(actor, target, skill, { ...q, late: q.late ?? false, groups: ['damage', 'status'], ...(effect ? { effect } : {}) });
    if (!held.length) return null;
    const out = newModAcc();
    let opp: { add: number; force: boolean; alt: number } | null = null;
    for (const { h, s } of held) {
      const m = h.mod;
      if (m.powerMul) out.power *= Math.max(0, 1 + m.powerMul * s);
      if (m.maxBonus) {
        // Rage pasifi (Berserker): maxBonus'a düz ek -> çarpan oranı (1 + (mb + ek) x eksik) / (1 + mb x eksik); pasif yoksa etkisiz
        const pe = actor.passive?.effect;
        if (pe?.type === 'rage' && actor.maxHp > 0) {
          const miss = 1 - actor.hp / actor.maxHp;
          out.power *= (1 + (pe.maxBonus + m.maxBonus * s) * miss) / (1 + pe.maxBonus * miss);
        }
      }
      if (m.critBonus) out.critBonus += m.critBonus * s;
      if (m.ignoreDefense) out.ignoreDefense += m.ignoreDefense * s;
      if (m.lifesteal) out.lifesteal += m.lifesteal * s;
      if (m.lifestealMul) out.lifestealMul *= Math.max(0, 1 + m.lifestealMul * s);
      if (m.guaranteedCrit) out.guaranteedCrit = true;
      if (m.critDmgMul) out.critDmg *= Math.max(0, 1 + m.critDmgMul * s);
      if (m.sureHit) out.sureHit = true;
      if (m.noCrit) out.noCrit = true;
      if (m.falloffAdd) out.falloffAdd += m.falloffAdd * s;
      if (m.flatDamage) out.flat += m.flatDamage * s;
      if (m.repeatChance) out.repeat += m.repeatChance * s;
      if (m.drainMul) out.drainMul *= Math.max(0, 1 + m.drainMul * s);
      if (m.drainAdd) out.drainAdd += m.drainAdd * s;
      if (m.drainBond) out.drainBond = true;
      if (m.passiveBonus || m.opportunist || m.opportunistAlt) {
        opp ??= { add: 0, force: false, alt: 0 };
        if (m.passiveBonus) opp.add += m.passiveBonus * s;
        if (m.opportunist) opp.force = true;
        if (m.opportunistAlt) opp.alt = Math.max(opp.alt, m.opportunistAlt * s);
      }
      if (m.turns) out.turns += m.turns * s;
      if (m.chance) out.chance += m.chance * s;
      if (m.statusPotency) for (const [k, v] of Object.entries(m.statusPotency)) (out.potency ??= {})[k] = (out.potency[k] ?? 0) + v * s;
      if (m.permanent) out.permanent = true;
      out.nodes.push(h.node);
    }
    // Opportunist (bonusVsStatus) yamaları: spec.ts tabanı uyguladı; burada (1 + yeni bonus) / (1 + taban bonus) oranı güce eklenir
    const pe = actor.passive?.effect;
    if (opp && pe?.type === 'bonusVsStatus' && target) {
      const base = target.statuses.some((s) => pe.statuses.includes(s.kind));
      const now = Math.max(base || opp.force ? pe.bonus + opp.add : 0, opp.alt);
      out.power *= (1 + now) / (1 + (base ? pe.bonus : 0));
    }
    return out;
  }

  /** Hasar etkisinin bu hedefe karşı ağaçla değişmiş kopyası (kritik eki, zırh delme, lifesteal, kesin kritik); değişiklik yoksa aynı nesne. Önizleme de kullanır. */
  treeEffect(actor: Combatant, target: Combatant, skill: SkillDef | null | undefined, effect: DamageEffect, q: TreeQuery = {}): DamageEffect {
    if (!actor.treeHooks) return effect;
    return this.applyEffMods(effect, this.treeMods(actor, target, skill, effect, q));
  }
  private applyEffMods(effect: DamageEffect, tm: TreeModAcc | null): DamageEffect {
    if (!tm || (!tm.critBonus && !tm.ignoreDefense && !tm.lifesteal && tm.lifestealMul === 1 && !tm.guaranteedCrit && !tm.noCrit && !tm.repeat && !tm.falloffAdd)) return effect;
    const copy: DamageEffect = { ...effect };
    if (tm.critBonus) copy.critBonus = (copy.critBonus ?? 0) + tm.critBonus;
    if (tm.ignoreDefense) copy.ignoreDefense = Math.min(1, Math.max(0, (copy.ignoreDefense ?? 0) + tm.ignoreDefense));
    if (tm.lifesteal || tm.lifestealMul !== 1) copy.lifesteal = Math.max(0, ((copy.lifesteal ?? 0) + tm.lifesteal) * tm.lifestealMul);
    if (tm.guaranteedCrit) copy.guaranteedCrit = true;
    if (tm.noCrit) delete copy.guaranteedCrit;
    if (tm.repeat) copy.repeatChance = Math.max(0, Math.min(1, (copy.repeatChance ?? 0) + tm.repeat));
    if (tm.falloffAdd && copy.falloff !== undefined) copy.falloff = copy.falloff + tm.falloffAdd;
    this.effOrig.set(copy, this.effOrig.get(effect) ?? effect);
    return copy;
  }

  /**
   * Vuruşun kritik çarpanı (ağaç critDmgMul dahil; noCrit = kritik yok). Önizleme / YZ / gerçek vuruş aynı. Kancasızda actor.stats.critMult.
   */
  critMultFor(actor: Combatant, target: Combatant, skill: SkillDef | null | undefined, effect: DamageEffect, q: TreeQuery = {}): number {
    const base = actor.stats.critMult;
    if (!actor.treeHooks) return base;
    const pre = this.treeMods(actor, target, skill, effect, q);
    const late = this.treeMods(actor, target, skill, effect, { ...q, late: true, crit: true });
    return base * (pre?.critDmg ?? 1) * (late?.critDmg ?? 1);
  }

  /**
   * Vuruş sonrası (hitIsCrit) kancaların hasar katsayısı: güç çarpanı x zırh delme oranı (zırh azalması yeniden hesaplanır) + düz ek. `crit` bilinir.
   * Kanca yoksa { mult: 1, flat: 0 }. Önizleme kritik ve normal dal için ayrı çağırır.
   */
  lateDamage(actor: Combatant, target: Combatant, skill: SkillDef | null | undefined, effect: DamageEffect, spec: DamageSpec, crit: boolean, q: TreeQuery = {}): { mult: number; flat: number; critDmg: number; nodes: string[] } {
    const none = { mult: 1, flat: 0, critDmg: 1, nodes: [] as string[] };
    if (!actor.treeHooks?.some((h) => h.h === 'cond' && h.late)) return none;
    const tm = this.treeMods(actor, target, skill, effect, { ...q, late: true, crit });
    if (!tm) return none;
    let mult = tm.power;
    if (tm.ignoreDefense) {
      const f = this.setup.formulas;
      const st = this.effectiveStats(target);
      const armor = spec.damageType === 'physical' ? st.armor : st.magicArmor;
      const ig0 = spec.ignoreDefense ?? 0;
      const ig1 = Math.min(1, Math.max(0, ig0 + tm.ignoreDefense));
      const keep = (ig: number) => 1 - armorReduction(armor * (1 - ig), f);
      mult *= keep(ig1) / Math.max(0.0001, keep(ig0));
    }
    return { mult, flat: tm.flat, critDmg: tm.critDmg, nodes: tm.nodes };
  }

  /** Bahis yaması (winChance / winSet / stakeMul): ağaçlı bahis tanımı ve bahis çarpanı. Saf; önizleme ve gerçek zar aynı (`write`: gerçek zar, şans kullanım bilgisine yazılır). */
  treeBet(actor: Combatant, target: Combatant | undefined, skill: SkillDef | null | undefined, bet: BetSpec, write = false): { bet: BetSpec; stakeMul: number; nodes: string[] } {
    if (!actor.treeHooks) return { bet, stakeMul: 1, nodes: [] };
    let win = bet.winChance;
    let set: number | undefined;
    const nodes: string[] = [];
    for (const { h, s } of this.heldHooks(actor, target, skill, { groups: ['bet'] })) {
      if (!h.mod.winChance && h.mod.winSet === undefined) continue;
      if (h.mod.winChance) win += h.mod.winChance * s;
      if (h.mod.winSet !== undefined) set = h.mod.winSet;
      nodes.push(h.node);
    }
    const chance = Math.max(0, Math.min(1, set ?? win));
    // Bahis miktarı koşulları kazanma şansını görür (betChanceAtLeast; yalnızca gerçek kullanımda bilgi var)
    if (write && this.castInfo && this.castPaid?.uid === actor.uid) this.castInfo.betChance = chance;
    let stakeMul = 1;
    for (const { h, s } of this.heldHooks(actor, target, skill, { groups: ['bet'] })) {
      if (!h.mod.stakeMul) continue;
      stakeMul *= Math.max(0, 1 + h.mod.stakeMul * s);
      nodes.push(h.node);
    }
    return { bet: chance === bet.winChance ? bet : { ...bet, winChance: chance }, stakeMul, nodes };
  }

  /** Grup kancalarının toplamı (kullanım sonu, mana yakma, Omen, bağ, Mana Overflow); procChance kancaları zarla (yalnızca gerçek uygulama). */
  private sumHooks(actor: Combatant, target: Combatant | undefined, skill: SkillDef | null | undefined, group: ModGroup, q: TreeQuery = {}): { sum: Partial<Record<keyof CondMod, number>>; set: Partial<Record<keyof CondMod, number>>; nodes: string[] } {
    const sum: Partial<Record<keyof CondMod, number>> = {};
    const set: Partial<Record<keyof CondMod, number>> = {};
    const nodes: string[] = [];
    for (const { h, s } of this.heldHooks(actor, target, skill, { ...q, groups: [group] })) {
      for (const [k, v] of Object.entries(h.mod) as Array<[keyof CondMod, unknown]>) {
        if (MOD_SPEC[k]?.g !== group || typeof v !== 'number') continue;
        if (SET_MODS.has(k)) set[k] = v;
        else if (k.endsWith('Mul')) sum[k] = ((sum[k] ?? 1) as number) * Math.max(0, 1 + v * s);
        else sum[k] = ((sum[k] ?? 0) as number) + v * s;
      }
      nodes.push(h.node);
    }
    return { sum, set, nodes };
  }

  /** C2 Rage kancalarından bu tetikte (vuruş / kullanım) tutanlar ve miktarları. */
  private rageHooksFor(actor: Combatant, target: Combatant | undefined, skill: SkillDef | null | undefined, on: 'hit' | 'cast'): Array<{ h: RageHook; gain: number }> {
    const out: Array<{ h: RageHook; gain: number }> = [];
    let ctx: CondCtx | undefined;
    for (const h of actor.treeHooks ?? []) {
      if (h.h !== 'rage' || h.rule || (h.gain === undefined && h.floor === undefined)) continue;
      if ((h.on ?? 'cast') !== on || (h.skill && h.skill !== skill?.id)) continue;
      if (h.once && actor.treeOnce?.includes(h.node)) continue;
      ctx ??= this.condCtx(actor, target, skill);
      if (!condHolds(h.when, ctx)) continue;
      out.push({ h, gain: (h.gain ?? 0) * scaleOf(h.scale, ctx) });
    }
    return out;
  }
  private grantTreeRage(actor: Combatant, list: Array<{ h: RageHook; gain: number }>, emit: Emit): void {
    if (actor.maxRage === undefined) return;
    for (const { h, gain } of list) {
      if (h.once) (actor.treeOnce ??= []).push(h.node);
      const cur = actor.rage ?? 0;
      const after = Math.max(0, Math.min(actor.maxRage, Math.max(Math.round(cur + gain), h.floor ?? 0)));
      this.treeProc(actor.uid, h.node);
      if (after === cur) continue;
      actor.rage = after;
      emit({ type: 'rage', actor: actor.uid, delta: after - cur, after, max: actor.maxRage });
    }
  }

  // --- Faz 4a: C3 tetikler (olay -> eylem) + C4 şifa / kalkan / alınan hasar kancaları (tree-hooks.ts > TriggerHook / HealHook) ---
  // Yalnızca ağaçlı savaşta ve kancayı taşıyan birimde çalışır (trigUnits / healUnits boşsa hiçbir nokta çalışmaz: zar sırası ve olaylar aynı).
  // Tetikler YZ değerine girmez (plan 4.1); verdiği buff'lar (TreeBuff) önizleme / YZ / gerçek vuruşta aynı yoldan (heldHooks) okunur.

  /** Tetik / C4 kancası taşıyan birimler (kurulumda bir kez). */
  private trigUnits: Combatant[] = [];
  private healUnits: Combatant[] = [];
  /** Zincir koruması (motor güvenliği, denge sınırı DEĞİL): iç içe tetik derinliği ve bir zincirde düğüm başına tetiklenme. */
  private trigDepth = 0;
  private readonly trigChain = new Map<string, number>();
  private static readonly TRIG_MAX_DEPTH = 4;
  private static readonly TRIG_MAX_PER_CHAIN = 8;
  /** 'uid|düğüm' -> sayaç (every); tur başına bir kez (perTurn: uid -> düğümler); kalkan katmanı başına bir kez (perShield). */
  private readonly trigCount = new Map<string, number>();
  private readonly trigTurnOnce = new Map<string, Set<string>>();
  private readonly shieldFired = new WeakMap<ShieldHook, Set<string>>();

  private get trigOn(): boolean {
    return this.trigUnits.length > 0;
  }
  private get healOn(): boolean {
    return this.healUnits.length > 0;
  }
  private hasTrig(c: Combatant | undefined, on: TriggerEvent): c is Combatant {
    return !!c?.treeHooks?.some((h) => h.h === 'trigger' && h.on === on);
  }
  /** Olayı dinleyicilere dağıtır (`owners`: kanca sahibi adayları; yalnızca bu olayı dinleyen canlı birimler işlenir). */
  private trig(owners: readonly (Combatant | undefined)[], ev: TrigEv, emit: Emit): void {
    // Faz 4c: olaydan önceki hedef durumları (koşul `before`): ilk dağıtımda bir kez (aynı olaydaki önceki tetiklerin verdiği durumlar sayılmaz)
    if (ev.target && !ev.preStatuses) ev.preStatuses = [...ev.target.statuses];
    const seen = new Set<string>();
    for (const o of owners) {
      if (!o || seen.has(o.uid) || o.hp <= 0 || !this.hasTrig(o, ev.on)) continue;
      seen.add(o.uid);
      this.fireTrig(o, ev, emit);
    }
  }
  /** Bu olayı dinleyen tüm tetik birimleri (süzgeç: `pick`). */
  private trigAll(ev: TrigEv, emit: Emit, pick: (u: Combatant) => boolean = () => true): void {
    if (!this.trigOn) return;
    this.trig(this.trigUnits.filter(pick), ev, emit);
  }

  private fireTrig(owner: Combatant, ev: TrigEv, emit: Emit): void {
    if (this.trigDepth >= Battle.TRIG_MAX_DEPTH) return;
    for (const h of owner.treeHooks ?? []) {
      if (h.h !== 'trigger' || h.on !== ev.on || owner.hp <= 0) continue;
      if (this.noChain.has(`${owner.uid}|${h.node}`)) continue; // Faz 4c: bu düğümün bedava kullanımı kendini yeniden tetiklemez
      if (!this.trigMatches(owner, h, ev)) continue;
      const tkey = ev.target?.uid ?? '';
      if (h.once === true && owner.treeOnce?.includes(h.node)) continue;
      if (h.once === 'perTarget' && this.firedOnSet.has(`${owner.uid}|${h.node}|${tkey}`)) continue;
      if (h.once === 'perTurn' && this.trigTurnOnce.get(owner.uid)?.has(h.node)) continue;
      if (h.once === 'perShield' && (!ev.shield || this.shieldFired.get(ev.shield)?.has(h.node))) continue;
      if (h.on === 'hpBelow' && ev.subject && this.firedOnSet.has(`${owner.uid}|${h.node}|@${ev.subject.uid}`)) continue;
      if (h.on === 'mpBelow' && owner.treeOnce?.includes(h.node)) continue;
      const skillDef = ev.skill ? this.skill(ev.skill, owner.uid) : null;
      const ctx = this.condCtx(owner, ev.target, skillDef && owner.skills.includes(skillDef.id) ? skillDef : null);
      ctx.node = h.node;
      if (ev.amount !== undefined) ctx.amount = ev.amount;
      if (h.when && 'before' in h.when && ev.target && ev.preStatuses) ctx.preTarget = { ...ev.target, statuses: ev.preStatuses };
      if (ev.source && ev.source.side !== owner.side) {
        // Gelen vuruşun türü: gelen skill'in ilk hasar etkisinden (Mirror Ward: yalnızca büyü vuruşu)
        const dmgEff = ev.incomingSkill?.effects.find((e) => e.type === 'damage') as { damageType?: 'physical' | 'magic' } | undefined;
        ctx.incoming = { actor: ev.source, ...(ev.incomingSkill !== undefined ? { skill: ev.incomingSkill } : {}), ...(dmgEff?.damageType ? { type: dmgEff.damageType } : {}) };
      }
      if (!condHolds(h.when, ctx)) continue;
      const s = scaleOf(h.scale, ctx) * (ev.mult ?? 1);
      if (!s) continue;
      if (h.every) {
        const ck = `${owner.uid}|${h.node}`;
        const n = (this.trigCount.get(ck) ?? 0) + 1;
        this.trigCount.set(ck, n);
        if (n % h.every !== 0) continue;
      }
      if (h.procChance !== undefined && h.procChance < 1 && !(this.rng.next() < h.procChance)) continue;
      const chainKey = `${owner.uid}|${h.node}`;
      const fired = this.trigChain.get(chainKey) ?? 0;
      if (fired >= Battle.TRIG_MAX_PER_CHAIN) continue;
      this.trigChain.set(chainKey, fired + 1);
      // Bir kez bayrakları eylemlerden ÖNCE yazılır (eylemin doğurduğu aynı olay kendini yeniden tetiklemez)
      if (h.once === true || h.on === 'mpBelow') (owner.treeOnce ??= []).push(h.node);
      if (h.once === 'perTarget') this.firedOnSet.add(`${owner.uid}|${h.node}|${tkey}`);
      if (h.once === 'perTurn') {
        let set = this.trigTurnOnce.get(owner.uid);
        if (!set) this.trigTurnOnce.set(owner.uid, (set = new Set()));
        set.add(h.node);
      }
      if (h.once === 'perShield' && ev.shield) {
        let set = this.shieldFired.get(ev.shield);
        if (!set) this.shieldFired.set(ev.shield, (set = new Set()));
        set.add(h.node);
      }
      if (h.on === 'hpBelow' && ev.subject) this.firedOnSet.add(`${owner.uid}|${h.node}|@${ev.subject.uid}`);
      if (h.perCast !== undefined) {
        // Faz 5a (Endless Knives): kullanım başına en çok N ateş (sayaç kullanım başında sıfırlanır)
        const ck = `${owner.uid}|${h.node}`;
        const n = this.castFires.get(ck) ?? 0;
        if (n >= h.perCast) continue;
        this.castFires.set(ck, n + 1);
      }
      this.treeProc(owner.uid, h.node);
      this.trigDepth++;
      const prevPick = this.pickCache;
      this.pickCache = new Map();
      try {
        for (const a of h.do) this.runTrigAction(owner, h, a, ev, s, emit);
      } finally {
        this.pickCache = prevPick;
        this.trigDepth--;
        if (this.trigDepth === 0) this.trigChain.clear();
      }
    }
  }

  /** Olay süzgeçleri (skill / durum / zemin / bitiş / mine / who / eşik / yol / kaynak / uzaklık). */
  private trigMatches(owner: Combatant, h: TriggerHook, ev: TrigEv): boolean {
    if (h.skill && h.skill !== ev.skill) return false;
    if (h.on === 'enemyDied') {
      if (h.status && !(ev.statuses ?? []).some((st) => st.kind === h.status && (!h.mine || st.source === owner.uid))) return false;
      if (h.ground && !(ev.grounds ?? []).includes(h.ground)) return false;
      // Faz 4c: işaret (Feeding Frenzy) ve öldüren (dost / kendisi / takım)
      if (h.marked && !(ev.subject && this.isMarked(owner, h.node, ev.subject))) return false;
      if (h.by) {
        const k = ev.source;
        if (!k || k.side !== owner.side) return false;
        if (h.by === 'ally' && k === owner) return false;
        if (h.by === 'self' && k !== owner) return false;
      }
    } else if (h.on === 'enemyHealed') {
      // Faz 4c (Stolen Remedy): iyileşen düşman bu durumu taşıyor (mine: sahibin verdiği)
      if (h.status && !(ev.target?.statuses ?? []).some((st) => st.kind === h.status && (!h.mine || st.source === owner.uid))) return false;
    } else if (h.on === 'groundEnd') {
      if (h.ground && ev.groundFx?.ground !== h.ground) return false;
    } else if (h.status && h.status !== ev.status) return false;
    if (h.unit && h.unit !== ev.unit) return false;
    if (h.fromSkill && h.fromSkill !== ev.st?.fromSkill) return false;
    if (h.on === 'statusEnd') {
      if (h.mine ? ev.statusSource !== owner.uid : ev.subject !== owner) return false;
      if (h.end && h.end !== ev.end) return false;
    }
    if (h.on === 'hpBelow' || h.on === 'enemyMissed') {
      const subj = ev.subject;
      if (!subj) return false;
      const who = h.who ?? (h.on === 'hpBelow' ? 'self' : 'any');
      if (who === 'self' && subj !== owner) return false;
      if (who === 'ally' && (subj === owner || subj.side !== owner.side)) return false;
      if (who === 'any' && subj.side !== owner.side) return false;
      if (who === 'bonded' && this.bondPartnerOf(owner.uid) !== subj.uid) return false;
      if (who === 'aura' && !this.condHost.inAura(owner, subj)) return false;
    }
    if (h.below !== undefined) {
      if (ev.before === undefined || ev.after === undefined || !(ev.before >= h.below && ev.after < h.below)) return false;
    }
    if (h.via && h.via !== ev.via) return false;
    if (h.resource && h.resource !== ev.resource) return false;
    if (h.near !== undefined && (!ev.target || this.condHost.distance(owner, ev.target) > h.near)) return false;
    return true;
  }

  /** Eylemin alıcıları (canlı; sıra almayan nesne hariç). */
  /**
   * Faz 5a: alıcı süzgeçleri (ifStatus: alıcıda durum var; caster: alıcının MP bedelli skill'i var) + aynı tetik ateşinde rastgele seçimli yeni
   * hedeflerin (outsideArea / randomInCast / sayılı beside) tek seçimi: sonraki eylemler aynı alıcıyı kullanır (Flung Embers: hasar + Burning aynı düşmana).
   */
  private trigRecipients(owner: Combatant, a: TriggerAction, ev: TrigEv): Combatant[] {
    const shared = this.pickCache && (a.to === 'outsideArea' || a.to === 'randomInCast' || (a.to === 'beside' && a.count !== undefined));
    const key = shared ? `${a.to}|${a.count ?? 1}` : '';
    let list = shared && this.pickCache!.has(key) ? this.pickCache!.get(key)!.filter((c) => c.hp > 0) : this.trigRecipients0(owner, a, ev);
    if (shared && !this.pickCache!.has(key)) this.pickCache!.set(key, list);
    if (a.ifStatus !== undefined) list = list.filter((c) => c.statuses.some((s) => s.kind === a.ifStatus));
    if (a.ifMpZero) list = list.filter((c) => c.maxMp > 0 && c.mp <= 0);
    if (a.caster) list = list.filter((c) => c.skills.some((id) => this.skill(id, c.uid)?.cost.resource === 'mp' && (this.skill(id, c.uid)?.cost.amount ?? 0) > 0));
    return list;
  }
  /** Tek tetik ateşinin paylaşılan rastgele seçimleri (fireTrig kurar; yoksa paylaşım yok). */
  private pickCache: Map<string, Combatant[]> | null = null;

  private trigRecipients0(owner: Combatant, a: TriggerAction, ev: TrigEv): Combatant[] {
    const alive = (c: Combatant | undefined | null): c is Combatant => !!c && c.hp > 0 && !c.inert;
    const enemies = () => this.living(opposite(owner.side)).filter((c) => !c.inert);
    // Altıncı tur: notTarget = olayın hedefi alıcı olamaz (Split Ward / Verdant Link)
    const allies = () => this.living(owner.side).filter((c) => !c.inert && !(a.notTarget && c === ev.target));
    const ratio = (c: Combatant) => (c.maxHp > 0 ? c.hp / c.maxHp : 1);
    const lowest = (list: Combatant[], f: (c: Combatant) => number) => (list.length ? [[...list].sort((x, y) => f(x) - f(y) || x.slot - y.slot)[0]!] : []);
    const ref = ev.subject ?? ev.target ?? owner;
    switch (a.to ?? 'self') {
      case 'self':
        return alive(owner) ? [owner] : [];
      case 'target':
        return alive(ev.target) ? [ev.target] : [];
      case 'subject':
        return alive(ev.subject) ? [ev.subject] : [];
      case 'source':
        return alive(ev.source) ? [ev.source] : [];
      case 'allEnemies':
        return enemies();
      case 'allAllies':
        return allies();
      case 'otherAllies':
        return allies().filter((c) => c !== owner);
      case 'randomEnemy': {
        const list = enemies();
        return list.length ? [list.length === 1 ? list[0]! : list[this.rng.int(0, list.length - 1)]!] : [];
      }
      case 'lowestHpAlly':
        return lowest(allies(), ratio);
      case 'lowestMpAlly':
        return lowest(allies().filter((c) => c.maxMp > 0), (c) => c.mp / c.maxMp);
      case 'lowestHpEnemy':
        return lowest(enemies(), ratio);
      case 'highestHpEnemy':
        return lowest(enemies(), (c) => -ratio(c));
      case 'nearestEnemy':
        return lowest(
          enemies().filter((c) => c !== ref && c.board === ref.board),
          (c) => Math.abs(this.rowOf(c.slot) - this.rowOf(ref.slot)) + Math.abs(this.laneOf(c.slot) - this.laneOf(ref.slot)),
        );
      case 'neighbors':
        return this.living(ref.side).filter((c) => !c.inert && this.condHost.nextTo(ref, c));
      case 'castTargets':
        return (this.condTargetList ?? []).filter((c) => alive(c));
      case 'bonded': {
        const p = this.bondPartnerOf(owner.uid);
        const u = p ? this.get(p) : undefined;
        return alive(u) ? [u] : [];
      }
      case 'auraAllies':
        return allies().filter((c) => this.condHost.inAura(owner, c));
      // ---- Faz 4c ----
      case 'adjacentEnemy':
        return lowest(enemies().filter((c) => c !== ref && this.condHost.nextTo(ref, c)), (c) => c.slot);
      case 'nearestEnemies': {
        // Tahta fark etmez (çağrı kendi tahtasında, düşman karşıda): hücre mesafesi (sıra + şerit; tahta farkı ön sıralar arası 1)
        const d = (c: Combatant) => (c.board === ref.board ? Math.abs(this.rowOf(c.slot) - this.rowOf(ref.slot)) : this.rowOf(c.slot) + this.rowOf(ref.slot) + 1) + Math.abs(this.laneOf(c.slot) - this.laneOf(ref.slot));
        return enemies()
          .filter((c) => c !== ref)
          .sort((x, y) => d(x) - d(y) || x.slot - y.slot)
          .slice(0, Math.max(1, a.count ?? 1));
      }
      case 'lastHit': {
        const s = ev.subject ? this.summonLastHit.get(ev.subject.uid) : undefined;
        const u = s ? this.get(s) : undefined;
        return alive(u) && u.side !== owner.side ? [u] : [];
      }
      case 'inGround': {
        const g = ev.groundFx;
        return g ? this.living(opposite(g.sourceSide)).filter((c) => !c.inert && c.board === g.board && g.slots.includes(c.slot)) : [];
      }
      case 'lowestHpOtherAlly':
        return lowest(allies().filter((c) => c !== owner), ratio);
      case 'placedGround': {
        const gs = (ev.placed ?? []).filter((g) => g.source === owner.uid);
        return enemies().filter((c) => gs.some((g) => g.board === c.board && g.slots.includes(c.slot)));
      }
      // ---- Faz 5a (C5) ----
      case 'beside': {
        const list = this.living(ref.side).filter((c) => !c.inert && c !== ref && this.sideAdjacent(ref, c)).sort((x, y) => x.slot - y.slot);
        return a.count !== undefined ? this.pickN(list, a.count) : list;
      }
      case 'behind': {
        const b = this.behindSlotOf(ref);
        const u = b === null ? undefined : this.living(ref.side).find((c) => !c.inert && c !== ref && c.board === ref.board && c.slot === b);
        return u ? [u] : [];
      }
      case 'rowMates':
        return this.living(ref.side).filter((c) => !c.inert && c !== ref && c !== owner && c.board === ref.board && this.rowOf(c.slot) === this.rowOf(ref.slot)).sort((x, y) => x.slot - y.slot);
      case 'outsideArea': {
        const inCast = new Set((this.condTargetList ?? []).map((c) => c.uid));
        return this.pickN(enemies().filter((c) => !inCast.has(c.uid)), a.count);
      }
      case 'castFront': {
        const list = (this.condTargetList ?? []).filter((c) => alive(c) && c.side !== owner.side);
        const front = list.length ? Math.min(...list.map((c) => this.rowOf(c.slot))) : -1;
        return list.filter((c) => this.rowOf(c.slot) === front);
      }
      case 'lowestHpInCast':
        return lowest((this.condTargetList ?? []).filter((c) => alive(c) && c.side !== owner.side), (c) => c.hp);
      case 'randomInCast':
        return this.pickN((this.condTargetList ?? []).filter((c) => alive(c) && c.side !== owner.side), a.count ?? 1);
      case 'mostHurtMe': {
        const led = this.hurtBy.get(owner.uid);
        const list = led ? enemies().filter((c) => (led.get(c.uid) ?? 0) > 0) : [];
        return lowest(list, (c) => -(led!.get(c.uid) ?? 0));
      }
      case 'enemyFront': {
        // Düşman tahtasının en öndeki dolu `rows` sırası (çağrının inişi; Crashing Arrival / Oakfall)
        const list = enemies().filter((c) => c.board === c.side);
        const rows = [...new Set(list.map((c) => this.rowOf(c.slot)))].sort((x, y) => x - y).slice(0, Math.max(1, a.rows ?? 1));
        return list.filter((c) => rows.includes(this.rowOf(c.slot))).sort((x, y) => x.slot - y.slot);
      }
      case 'facing': {
        // Öznenin şeridindeki en öndeki düşman (karşısındaki; Falling Oak)
        const lane = this.laneOf(ref.slot);
        return lowest(enemies().filter((c) => c.board === c.side && this.laneOf(c.slot) === lane), (c) => this.rowOf(c.slot));
      }
      case 'sourceNeighbors':
        return alive(ev.source) ? this.living(ev.source.side).filter((c) => !c.inert && this.condHost.nextTo(ev.source!, c)) : [];
      case 'selfBeside':
        return alive(owner) ? [owner, ...allies().filter((c) => c !== owner && this.sideAdjacent(owner, c)).sort((x, y) => x.slot - y.slot)] : [];
      case 'weakestEnemy':
        return lowest(enemies(), (c) => c.hp);
    }
    return [];
  }

  /** Faz 5a: listeden seed'li rastgele `n` birim (yoksa tümü; liste n'den kısaysa zar atılmaz). Sıra = yuva sırası. */
  private pickN(list: Combatant[], n: number | undefined): Combatant[] {
    if (n === undefined || list.length <= n) return list;
    const pool = [...list];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = this.rng.int(0, i);
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, n).sort((x, y) => x.slot - y.slot);
  }

  /** Faz 5a (C5 hedef önceliği): karışık havuzda öncelikli düşmanları başa alır (kendi aralarında karıştırma sırası; zar atmaz). */
  private prioritize(actor: Combatant, pool: Combatant[], kind: 'hitMe' | 'armor' | 'hurtMe'): void {
    const key = (c: Combatant): number => {
      if (kind === 'hitMe') return this.hitSince.get(actor.uid)?.has(c.uid) ? 1 : 0;
      if (kind === 'armor') return this.effectiveStats(c).armor;
      return this.hurtBy.get(actor.uid)?.get(c.uid) ?? 0;
    };
    const order = new Map(pool.map((c, i) => [c.uid, i]));
    pool.sort((x, y) => key(y) - key(x) || order.get(x.uid)! - order.get(y.uid)!);
  }

  /** Eylem miktarının tabanı. */
  private trigBase(owner: Combatant, rec: Combatant, base: TriggerBase, ev: TrigEv, h?: TriggerHook): number {
    switch (base) {
      case 'maxHp':
        return rec.maxHp;
      case 'ownerMaxHp':
        return owner.maxHp;
      case 'targetMaxHp':
        return ev.target?.maxHp ?? 0;
      case 'currentHp':
        return rec.hp;
      case 'ownerCurrentHp':
        return owner.hp;
      case 'armor':
        return this.effectiveStats(rec).armor;
      case 'ownerArmor':
        return this.effectiveStats(owner).armor;
      case 'amount':
        return ev.amount ?? 0;
      case 'hpPaid':
        // Faz 4c: bedel tetiği (payHp) kullanım bilgisi kurulmadan atılır: miktar olayın kendisi (ödenen can)
        if (this.castInfo && this.castPaid?.uid === owner.uid) return this.castInfo.hpPaid;
        return ev.on === 'payHp' ? (ev.amount ?? 0) : 0;
      case 'stake':
        return this.castInfo && this.castPaid?.uid === owner.uid ? (this.castInfo.stake ?? 0) : (ev.amount ?? 0);
      case 'prevented':
        return ev.prevented ?? 0;
      // ---- Faz 4c ----
      case 'shieldSize':
        return ev.shield?.size ?? 0;
      case 'auraBonus': {
        // Sahibin zırh aurasının dosta verdiği zırh (görünen toplam zırh x aura payı; 10a: görünen toplam zırh)
        const e = owner.passive?.effect;
        return e?.type === 'armorAura' ? this.effectiveStats(owner).armor * Math.max(0, e.pct) : 0;
      }
      case 'dealt':
        return ev.dealt ?? 0;
      case 'ground': {
        // Biten zemin (groundEnd) ya da öznenin (ölenin) hücresindeki kancanın türünden en güçlü zemin (hücre çarpanı dahil)
        if (ev.groundFx) return ev.groundFx.amount;
        const c = ev.subject;
        if (!c) return 0;
        return Math.max(0, ...this.ground.filter((g) => g.board === c.board && g.slots.includes(c.slot) && (!h?.ground || g.ground === h.ground)).map((g) => g.amount * (g.cellMult?.[c.slot] ?? 1)));
      }
      case 'firstHeal':
        // Faz 5a (Grove Bloom): skillUse'da hedefin bu kullanımdaki ilk şifası
        return ev.st?.first ?? (ev.on === 'skillUse' && ev.target ? (this.castHealed.get(ev.target.uid) ?? 0) : 0);
      case 'stacks': {
        // Ölenin (olaydaki durumlardan) yığın sayısı; kancanın durumu, yoksa omen
        const kind = h?.status ?? 'omen';
        return (ev.statuses ?? []).filter((s) => s.kind === kind && (!h?.mine || s.source === owner.uid)).reduce((t, s) => t + (s.stacks ?? 0), 0);
      }
    }
    return 0;
  }

  private runTrigAction(owner: Combatant, h: TriggerHook, a: TriggerAction, ev: TrigEv, s: number, emit: Emit): void {
    const f = this.setup.formulas;
    // Faz 4c: alıcısız / hücreli eylemler (bedava kullanım, zemin, Mana Overflow)
    if (a.cast !== undefined) return this.queueFree(owner, h, a, ev);
    if (a.ground !== undefined) return this.trigGround(owner, h, a, ev, s, emit);
    if (a.overflow) return this.fireOverflow(owner, owner, emit);
    if (a.steal) return this.trigSteal(owner, h, a, ev, emit);
    if (a.smite) {
      // Faz 5a (Chain of Light): son smite aynı güçle hemen yeniden (yeni en zayıf düşmana); smite yoksa bir şey olmaz
      const ls = this.lastSmite.get(owner.uid);
      if (ls) this.passiveSmite(owner, ls.scale, ls.sm, ls.healed, emit);
      return;
    }
    for (const rec of this.trigRecipients(owner, a, ev)) {
      if (rec.hp <= 0) continue;
      if (a.strike !== undefined) {
        // Faz 5a (C5 ek vuruş): sahibin skill'inin ilk hasar etkisiyle gerçek vuruş (isabet / kritik / zırh / tetikler); dosta vurmaz. Ek vuruşun
        // tetiklediği aynı düğüm kendini yeniden tetiklemez (noChain). `chain`: vurulanın yanındaki (beside) henüz vurulmamış düşmana sıçrar, toplam N kesik
        if (rec.side === owner.side || owner.hp <= 0) continue;
        const sid = a.skill && a.skill !== 'event' ? a.skill : ev.skill;
        const def = sid ? this.skill(sid, owner.uid) : undefined;
        const eff0 = def?.effects.find((e) => e.type === 'damage') as DamageEffect | undefined;
        if (!def || !eff0) continue;
        const eff = a.pierce ? { ...eff0, ignoreDefense: 1 } : eff0;
        const prevSkill = this.castingSkill;
        if (!prevSkill) this.castingSkill = def;
        const nk = `${owner.uid}|${h.node}`;
        const had = this.noChain.has(nk);
        this.noChain.add(nk);
        try {
          const done = new Set<string>(ev.target ? [ev.target.uid] : []);
          let cur: Combatant | undefined = rec;
          for (let cut = 0; cur && cut < Math.max(1, a.chain ?? 1) && owner.hp > 0; cut++) {
            const t: Combatant = cur;
            done.add(t.uid);
            for (let k = 0; k < Math.max(1, a.hits ?? 1) && t.hp > 0 && owner.hp > 0; k++) {
              const r = this.strike(owner, t, eff, emit, a.strike * s, false);
              // Faz 5c (Returning Cards): isabet eden ek vuruş skill'in durum zarını yeniden atar (yeni, bağımsız zar)
              const rs = a.rollStatus && r.landed ? def.effects.find((e) => e.type === 'randomStatus') : undefined;
              if (rs && rs.type === 'randomStatus') this.rollRandomStatus(owner, t, def, rs, emit);
              // Altıncı tur (Carving Arc): isabet eden her kesik durumu verir
              if (a.cutStatus && r.landed && t.hp > 0 && this.statusDef(a.cutStatus.status)) this.addStatus(t, { kind: a.cutStatus.status as Status['kind'], turns: a.cutStatus.turns, source: owner.uid, cause: h.node }, emit, h.node);
            }
            cur = a.chain ? this.living(t.side).filter((c) => !c.inert && !done.has(c.uid) && this.sideAdjacent(t, c)).sort((x, y) => x.slot - y.slot)[0] : undefined;
          }
        } finally {
          if (!had) this.noChain.delete(nk);
          this.castingSkill = prevSkill;
        }
        continue;
      }
      if (a.detonate !== undefined) {
        // Altıncı tur (Rot Bomb): alıcıdaki DoT durumunun kalan tiklerinin hepsi bir anda (tik miktarı x kalan tur; tikle aynı zırh), durum biter.
        // Hasarı DoT'un sahibi verir (tik gibi); kaynağı kim olursa olsun (Druid / Hexer Withering'i de)
        if (rec.side === owner.side) continue;
        for (const st of rec.statuses.filter((x) => x.kind === a.detonate)) {
          const dot = this.statusDef(st.kind)?.dot;
          if (!dot || rec.hp <= 0) continue;
          const dd = this.dotTickDamage(st.kind, st.amount ?? 0, rec) * Math.max(1, st.turns);
          rec.statuses = rec.statuses.filter((x) => x !== st);
          emit({ type: 'statusEnd', target: rec.uid, status: st.kind, source: owner.uid, cause: h.node });
          this.applyHit(this.get(st.source) ?? owner, rec, dd, dot.damageType, false, emit, false, { origin: 'status', element: dot.element, damageType: dot.damageType, status: st.kind });
          this.announceIfDead(rec, emit);
        }
        continue;
      }
      if (a.hot !== undefined) {
        // Faz 5a (Spreading Roots): skill'in yenilenmesi (hot) alıcıya oranla
        const sid = a.skill && a.skill !== 'event' ? a.skill : ev.skill;
        const hot = (sid ? this.skill(sid, owner.uid) : undefined)?.effects.find((e) => e.type === 'hot');
        if (!hot || hot.type !== 'hot' || rec.side !== owner.side) continue;
        const hm = owner.stats.healPowerMult;
        const amount = Math.round(attributePower(owner.stats, hot.scale, this.setup.formulas) * (hm !== undefined && hm !== 1 ? hot.power * hm : hot.power) * a.hot * s);
        if (amount > 0) this.addStatus(rec, { kind: 'regen', turns: hot.turns, source: owner.uid, amount, critChance: this.effectiveStats(owner).critChance, critMult: owner.stats.critMult }, emit, h.node);
        continue;
      }
      if (a.heal !== undefined) {
        const amt = Math.max(1, Math.round(this.trigBase(owner, rec, a.of ?? 'maxHp', ev, h) * a.heal * s));
        this.applyHeal(owner, rec, amt, false, emit, h.node);
      } else if (a.shield !== undefined) {
        this.treeShield(owner, rec, h.node, Math.round(this.trigBase(owner, rec, a.of ?? 'maxHp', ev, h) * a.shield * s), a.turns, !!a.magic, emit);
      } else if (a.status !== undefined) {
        if (a.status === 'taunt') {
          // Faz 4c (Shieldbark): özel kodlu Taunt (kırılma eşiği / dost çarpanı yok)
          this.addStatus(rec, { kind: 'taunt', turns: a.turns ?? 1, source: owner.uid, taken: 0 }, emit, h.node);
          continue;
        }
        const def = this.statusDef(a.status);
        if (!def) continue;
        if (def.maxStacks) {
          this.addStacks(rec, a.status as Status['kind'], a.stacks ?? 1, owner, emit, false, true);
          continue;
        }
        if (a.status === 'staggered') {
          this.applyStagger(rec, owner, emit);
          continue;
        }
        if (a.chance !== undefined && a.chance < 1 && !(this.rng.next() < a.chance)) continue;
        // Faz 4c: örnek düğümü taşır (kaynağa göre silme: removeStatus node), süresiz (Bastion Cry: Taunt sürerken)
        const st: Status = { kind: a.status as Status['kind'], turns: a.turns ?? 1, source: owner.uid, cause: h.node, ...(a.permanent ? { permanent: true } : {}) };
        if (def.dot) {
          const scale = (a.stat ?? def.dot.scale) as Attribute | undefined;
          const power = a.power ?? def.dot.power;
          if (scale && power) st.amount = Math.round(attributePower(owner.stats, scale, f) * power);
        }
        this.addStatus(rec, st, emit, h.node);
      } else if (a.removeStatus !== undefined) {
        const gone = rec.statuses.filter((x) => x.kind === a.removeStatus && (!a.node || x.cause === h.node));
        if (!gone.length) continue;
        rec.statuses = rec.statuses.filter((x) => !gone.includes(x));
        for (const g of gone) emit({ type: 'statusEnd', target: rec.uid, status: g.kind, dispelled: true, source: owner.uid, cause: h.node });
      } else if (a.damage !== undefined) {
        const type = a.damageType ?? (a.stat === 'str' || a.stat === 'dex' ? 'physical' : 'magic');
        const element = (a.element ?? (type === 'physical' ? 'physical' : 'arcane')) as Element;
        // Faz 4c: of 'dealt' (olayın verdiği hasar; Domino), kesin kritik (Turned Blade), sınıf pasifinin hasar eki (Opportunist: Counter Cut)
        const flat = a.of === 'amount' ? (ev.amount ?? 0) : a.of === 'dealt' ? (ev.dealt ?? 0) : undefined;
        const pm = (a.crit ? owner.stats.critMult : 1) * (a.passive ? this.trigPassiveMult(owner, rec) : 1);
        // Faz 5a (Crashing Arrival): çağrının kancasında çağıranın statı
        const statSrc = a.summoner && owner.owner ? (this.get(owner.owner) ?? owner) : owner;
        const dmg =
          flat !== undefined
            ? Math.max(1, Math.round(flat * a.damage * s * pm))
            : this.tickDamage(element, type, Math.round(attributePower(statSrc.stats, a.stat as Attribute, f) * a.damage * s * pm), rec);
        if (dmg <= 0) continue;
        this.applyHit(owner, rec, dmg, type, !!a.crit, emit, false, { origin: 'status', element, damageType: type });
        this.announceIfDead(rec, emit);
      } else if (a.rage !== undefined) {
        if (rec.maxRage === undefined) continue;
        const cur = rec.rage ?? 0;
        const after = Math.max(0, Math.min(rec.maxRage, Math.round(cur + a.rage * s)));
        if (after === cur) continue;
        rec.rage = after;
        emit({ type: 'rage', actor: rec.uid, delta: after - cur, after, max: rec.maxRage });
      } else if (a.mp !== undefined) {
        // Faz 4c: of taban (Clean Sweep: bahis); yoksa düz MP
        const gain = Math.max(0, Math.min(Math.round((a.of ? this.trigBase(owner, rec, a.of, ev, h) : 1) * a.mp * s), rec.maxMp - rec.mp));
        if (gain <= 0) continue;
        rec.mp += gain;
        emit({ type: 'mpRegen', actor: rec.uid, amount: gain, after: rec.mp, cause: h.node });
      } else if (a.hpLoss !== undefined) {
        const loss = Math.max(0, Math.min(rec.hp - 1, Math.round(this.trigBase(owner, rec, a.of ?? 'maxHp', ev, h) * a.hpLoss * s)));
        if (loss <= 0) continue;
        rec.hp -= loss;
        emit({ type: 'damage', source: owner.uid, target: rec.uid, amount: loss, absorbed: 0, hpAfter: rec.hp, shieldAfter: rec.shield, magicShieldAfter: rec.magicShield, crit: false, origin: 'self' });
      } else if (a.cooldown !== undefined) {
        const ids = this.trigCdIds(rec, a.cd ?? h.skill ?? 'event', ev);
        for (const id of ids) {
          if (a.cooldown === 'reset') delete rec.cooldowns[id];
          else {
            const cd = Math.max(0, (rec.cooldowns[id] ?? 0) + Math.round(a.cooldown * s));
            if (cd > 0) rec.cooldowns[id] = cd;
            else delete rec.cooldowns[id];
          }
        }
      } else if (a.sooner !== undefined) {
        if (this.mode === 'turns' && a.sooner * s > 0) this.speedBoost.set(rec.uid, Math.max(this.speedBoostOf(rec.uid), a.sooner * s));
      } else if (a.buff !== undefined || a.free) {
        rec.treeHooks ??= []; // buff'ı kancasız dost alırsa ağaç okuma yolları açılır (boş liste: başka hiçbir şey değişmez)
        const list = (rec.treeBuffs ??= []);
        const skill = a.skill === 'event' ? ev.skill : a.skill;
        const uses = a.free ? (a.uses ?? 1) : a.uses === 0 ? undefined : (a.uses ?? 1);
        const pending = this.castingActor === rec || (!!ev.inCast && rec === owner);
        const old = list.find((b) => b.node === h.node && !!b.free === !!a.free);
        if (old && a.stack) {
          old.s += s;
          if (uses !== undefined) old.uses = uses;
          if (a.turns !== undefined) old.turns = a.turns;
        } else {
          if (old) list.splice(list.indexOf(old), 1);
          list.push({ node: h.node, s, ...(a.buff ? { mod: a.buff } : {}), ...(a.free ? { free: true } : {}), ...(skill ? { skill } : {}), ...(uses !== undefined ? { uses } : {}), ...(a.turns !== undefined ? { turns: a.turns } : {}), ...(pending ? { pending: true } : {}) });
        }
      } else if (a.clear !== undefined) {
        const node = a.clear === true ? h.node : a.clear;
        if (rec.treeBuffs) rec.treeBuffs = rec.treeBuffs.filter((b) => b.node !== node);
        this.trigCount.delete(`${rec.uid}|${node}`);
      } else if (a.charge !== undefined) {
        if (rec.passive?.effect.type === 'manaOverflow') rec.charge += a.charge * s;
      } else if (a.doom !== undefined) {
        // Faz 4c: Doom (Passing Bell: ölenin Omen'i; Leaping Mark: olayın Doom büyüklüğü)
        const omens = this.trigBase(owner, rec, a.of ?? 'stacks', ev, h) * a.doom * s;
        if (omens > 0) this.doomBurst(owner, rec, omens, emit);
      } else if (a.spread !== undefined) {
        // Faz 4c (Creeping Blight): ölenin durumu kalan süresi ve gücüyle (kaynağı aynı)
        const from = (ev.statuses ?? []).find((x) => x.kind === a.spread && (!h.mine || x.source === owner.uid));
        if (!from || from.turns <= 0) continue;
        this.addStatus(rec, { kind: from.kind, turns: from.turns, source: from.source, ...(from.amount !== undefined ? { amount: from.amount } : {}), ...(from.potency ? { potency: { ...from.potency } } : {}) }, emit, h.node);
      } else if (a.guard !== undefined) {
        // Faz 4c (Spell Sink): sahip alıcıyı Guard'lar (1 tur; alıcının tur başında biter)
        if (rec === owner) continue;
        this.addStatus(rec, { kind: 'guard', turns: a.turns ?? 1, source: owner.uid, share: a.guard }, emit, h.node);
      } else if (a.mark) {
        this.addMark(owner, h.node, rec, a.until ?? 'turn');
      }
    }
  }

  /** Cooldown eyleminin skill'leri ('event' / 'all' / 'others' / 'longest' / id). */
  private trigCdIds(rec: Combatant, cd: string, ev: TrigEv): string[] {
    if (cd === 'all') return Object.keys(rec.cooldowns);
    if (cd === 'others') return Object.keys(rec.cooldowns).filter((id) => id !== ev.skill);
    if (cd === 'longest') {
      const ids = Object.keys(rec.cooldowns);
      return ids.length ? [ids.reduce((b, id) => ((rec.cooldowns[id] ?? 0) > (rec.cooldowns[b] ?? 0) ? id : b), ids[0]!)] : [];
    }
    const id = cd === 'event' ? ev.skill : cd;
    return id ? [id] : [];
  }

  // --- Faz 4c: bedava / gecikmeli kullanım, tetik zemini, Mana Overflow, Doom, işaret ---

  /** Bedava kullanım kuyruğu (sürmekte olan eylem bitince sırayla) ve gecikmeli kullanımlar (sahibin tur başında sayaç). */
  private readonly freeQueue: FreeCast[] = [];
  private readonly delayedFree: FreeCast[] = [];
  private freeFlushing = false;
  /** Bedava kullanımın olayları üst eylemin olay listesine gider (arayüz aynı eylemde oynatır). */
  private freeEmit: Emit | null = null;
  /** 'uid|düğüm': bedava kullanımı sürerken kendini yeniden tetiklemeyen düğümler (noChain). */
  private readonly noChain = new Set<string>();
  /** Zincir koruması: bir boşaltmada en fazla bu kadar bedava kullanım (motor güvenliği, denge sınırı DEĞİL). */
  private static readonly FREE_MAX = 8;
  /** Çağrının en son skill ile vurduğu düşman (Pox Bloom; yalnızca ağaçlı savaşta yazılır). */
  private readonly summonLastHit = new Map<string, string>();
  /** Faz 4c (Lifebloom): bu kullanımda hedef başına ilk şifa (sonraki hot durumuna 'first' olarak yazılır). */
  private readonly castHealed = new Map<string, number>();
  private readonly doomSize = new WeakMap<Status, number>();
  /** İşaretler: 'sahip|düğüm' -> işaretli uid -> bitiş ('turn' = işaretlinin tur başı, 'hit' = ilk vuruş). */
  private readonly marks = new Map<string, Map<string, 'turn' | 'hit'>>();
  /** Son Doom'un büyüklüğü (Omen x çarpan; Leaping Mark: öldüren Doom). */

  private queueFree(owner: Combatant, h: TriggerHook, a: TriggerAction, ev: TrigEv): void {
    const skill = a.cast === 'event' ? ev.skill : a.cast;
    if (!skill || !owner.skills.includes(skill)) return;
    let target: string | undefined;
    let center: number | undefined;
    if (a.to) {
      const r = this.trigRecipients(owner, a, ev)[0];
      if (!r) return;
      target = r.uid;
    } else if (ev.center !== undefined) center = ev.center;
    else if (ev.target && ev.target.hp > 0) target = ev.target.uid;
    const q: FreeCast = { owner: owner.uid, skill, node: h.node, ...(target ? { target } : {}), ...(center !== undefined ? { center } : {}), power: a.power ?? 1, crit: !!a.crit, ...(a.mod ? { mod: a.mod } : {}), noChain: !!a.noChain };
    if (a.delay) this.delayedFree.push({ ...q, delay: a.delay });
    else this.freeQueue.push(q);
  }

  /** Kuyruktaki bedava kullanımları çalıştırır (eylem sonu / tur başı; iç içe çağrı kuyruğa ekler, döngü alır). */
  private flushFree(emit: Emit): void {
    if (this.freeFlushing || !this.freeQueue.length) return;
    this.freeFlushing = true;
    const prev = this.freeEmit;
    this.freeEmit = emit;
    let n = 0;
    try {
      while (this.freeQueue.length && !this.winner && n++ < Battle.FREE_MAX) this.runFree(this.freeQueue.shift()!);
      this.freeQueue.length = 0;
    } finally {
      this.freeEmit = prev;
      this.freeFlushing = false;
    }
  }

  private runFree(q: FreeCast): void {
    const owner = this.get(q.owner);
    if (!owner || owner.hp <= 0 || !owner.skills.includes(q.skill)) return;
    const node = `${q.node}#free`;
    const mod: CondMod = { ...(q.mod ?? {}), ...(q.power !== 1 ? { powerMul: q.power - 1 } : {}), ...(q.crit ? { guaranteedCrit: true } : {}) };
    owner.treeHooks ??= [];
    if (Object.keys(mod).length) (owner.treeBuffs ??= []).push({ node, mod, skill: q.skill, uses: 1, s: 1 });
    const key = `${owner.uid}|${q.node}`;
    if (q.noChain) this.noChain.add(key);
    try {
      this.cast(owner.uid, q.skill, q.target, q.center, false, undefined, undefined, { power: q.power });
    } finally {
      if (q.noChain) this.noChain.delete(key);
      if (owner.treeBuffs) owner.treeBuffs = owner.treeBuffs.filter((b) => b.node !== node);
    }
  }

  /** Gecikmeli kullanımlar: sahibin tur başında sayaç azalır, dolanlar kuyruğa (sahibi ölmüşse silinir). */
  private tickDelayedFree(actor: Combatant): void {
    for (const d of [...this.delayedFree]) {
      const o = this.get(d.owner);
      if (!o || o.hp <= 0) {
        this.delayedFree.splice(this.delayedFree.indexOf(d), 1);
        continue;
      }
      if (d.owner !== actor.uid) continue;
      d.delay = (d.delay ?? 1) - 1;
      if (d.delay > 0) continue;
      this.delayedFree.splice(this.delayedFree.indexOf(d), 1);
      this.freeQueue.push(d);
    }
  }

  /** Tetik zemini: alıcıların (`to` yoksa öznenin; ölmüş olsa da) hücresine; üst üste kuralına uyar (yields). */
  private trigGround(owner: Combatant, h: TriggerHook, a: TriggerAction, ev: TrigEv, s: number, emit: Emit): void {
    const def = this.setup.grounds?.[a.ground!];
    if (!def) return;
    const units = (a.to ?? 'subject') === 'subject' ? (ev.subject ? [ev.subject] : []) : this.trigRecipients(owner, a, ev);
    const f = this.setup.formulas;
    const amount = Math.max(0, Math.round(a.of ? this.trigBase(owner, owner, a.of, ev, h) * (a.power ?? 1) * s : a.stat ? attributePower(owner.stats, a.stat as Attribute, f) * (a.power ?? 0) * s : 0));
    for (const u of units) {
      // Faz 5a (Spore Cloud): wide 'beside' = alıcının yan (aynı sıra, yan şerit) hücreleri de (boş hücre dahil)
      const slots = a.wide === 'beside' ? [u.slot, ...this.besideSlots(u)].sort((x, y) => x - y) : [u.slot];
      const g: GroundEffect = {
        id: `g${this.groundCount++}`,
        ground: a.ground!,
        board: u.board,
        slots,
        turns: a.turns ?? 1,
        source: owner.uid,
        sourceSide: owner.side,
        amount,
        ...(a.permanent ? { permanent: true } : {}),
        age: 0,
        yields: true,
        ...(amount <= 0 ? { noDamage: true } : {}),
      };
      this.ground.push(g);
      (ev.placed ??= []).push(g);
      emit({ type: 'ground', id: g.id, ground: g.ground, board: g.board, slots: g.slots, turns: g.turns });
    }
  }

  /** Faz 5a: birimin "beside" hücreleri (aynı sıra, şerit farkı 1; boş olabilir), yuva sırasıyla. */
  private besideSlots(u: Combatant): number[] {
    const lanes = this.setup.formulas.formation.lanes;
    const row = this.rowOf(u.slot);
    const lane = this.laneOf(u.slot);
    return [lane - 1, lane + 1].filter((l) => l >= 0 && l < lanes).map((l) => row * lanes + l);
  }

  // --- Faz 5a: C6 kuralları (yalnızca ağaçlı savaş; kancasız birimde hiçbiri okunmaz) ---

  /** Savaşta sahibine en çok hasar verenler defteri (hedef uid -> kaynak uid -> toplam can kaybı; yalnızca treeUnits). */
  private readonly hurtBy = new Map<string, Map<string, number>>();
  /** Ward kuralı: sıradaki turuna kadar debuff tutmayan birimler. */
  private readonly wardUntil = new Set<string>();
  /** Living Bomb: hemen öldürülen çağrının ölüm tetiği çarpanı. */
  private readonly burstMult = new Map<string, number>();

  /** Birimin bu türden, şu an geçerli (while / when tutan) kuralları. */
  private rulesOf(c: Combatant | undefined, kind: RuleHook['rule'], target?: Combatant): RuleHook[] {
    if (!c?.treeHooks || !this.treeUnits) return [];
    const out: RuleHook[] = [];
    for (const h of c.treeHooks) {
      if (h.h !== 'rule' || h.rule !== kind) continue;
      if (h.while === 'guarding' && !this.living(c.side).some((a) => a !== c && a.statuses.some((s) => s.kind === 'guard' && s.source === c.uid))) continue;
      if (h.when) {
        const ctx = this.condCtx(c, target, null);
        ctx.node = h.node;
        if (!condHolds(h.when, ctx)) continue;
      }
      out.push(h);
    }
    return out;
  }

  /** immune / ward / shorten: duruma uygulanacak hali (null = işlemez). Kancasız birimde durum aynen döner. */
  private treeStatusRule(target: Combatant, status: Status): Status | null {
    if (!target.treeHooks || !this.treeUnits) return status;
    const imm = this.rulesOf(target, 'immune').find((h) => h.statuses?.includes(status.kind));
    if (imm) {
      this.treeProc(target.uid, imm.node);
      return null;
    }
    const def = this.statusDef(status.kind);
    if (this.wardUntil.has(target.uid) && def?.type === 'debuff' && status.source !== target.uid) {
      const w = this.rulesOf(target, 'ward')[0];
      if (w) this.treeProc(target.uid, w.node);
      return null;
    }
    let turns = status.turns;
    for (const h of this.rulesOf(target, 'shorten')) {
      if (!h.statuses?.includes(status.kind) || status.permanent) continue;
      turns -= h.by ?? 1;
      this.treeProc(target.uid, h.node);
    }
    if (turns === status.turns) return status;
    return turns <= 0 ? null : { ...status, turns };
  }

  /** Lucky Escape şansı: stat + ağaç luck kuralları (tavan 1). */
  private surviveOf(c: Combatant): number {
    const base = c.stats.surviveChance ?? 0;
    if (!c.treeHooks || !this.treeUnits) return base;
    return Math.max(0, Math.min(1, base + this.rulesOf(c, 'luck').reduce((t, h) => t + (h.add ?? 0), 0)));
  }

  /** cheatDeath: bu ölümcül hasarda işleyen kural (ilk uyan); yoksa null. */
  private cheatDeathRule(target: Combatant, crit: boolean): RuleHook | null {
    for (const h of this.rulesOf(target, 'cheatDeath')) {
      if (h.once && target.treeOnce?.includes(h.node)) continue;
      if (h.below !== undefined && !(target.hp < h.below * target.maxHp)) continue;
      if (h.notCrit && crit) continue;
      if (h.ready && (!target.skills.includes(h.ready) || (target.cooldowns[h.ready] ?? 0) > 0)) continue;
      // Altıncı tur (Undying Rage): Rage bedeli (eksi rage) ödenemiyorsa kurtarmaz
      if (h.rage !== undefined && h.rage < 0 && (target.rage ?? 0) < -h.rage) continue;
      return h;
    }
    return null;
  }

  /** cheatDeath sonrası: bir kez bayrağı, Rage, ölçüm, `do` eylemleri (target / source = öldürecek olan). */
  private afterCheatDeath(target: Combatant, killer: Combatant, h: RuleHook, emit: Emit): void {
    if (h.once) (target.treeOnce ??= []).push(h.node);
    this.treeProc(target.uid, h.node);
    // Altıncı tur (Martyr Rising): `ready` skill'i kalkınca tam bekleme süresine girer (MP harcanmaz; cooldown yalnızca turns modunda, skill kullanımıyla aynı kural)
    if (h.ready && this.mode === 'turns' && !this.noCooldowns) {
      const cd = this.skill(h.ready, target.uid)?.cooldown ?? 0;
      if (cd > 0) target.cooldowns[h.ready] = cd;
    }
    if (h.rage && target.maxRage !== undefined) {
      const cur = target.rage ?? 0;
      const after = Math.max(0, Math.min(target.maxRage, cur + h.rage));
      if (after !== cur) {
        target.rage = after;
        emit({ type: 'rage', actor: target.uid, delta: after - cur, after, max: target.maxRage });
      }
    }
    if (!h.do?.length) return;
    const hook: TriggerHook = { h: 'trigger', node: h.node, on: 'hpBelow', do: h.do };
    const ev: TrigEv = { on: 'hpBelow', target: killer, source: killer, subject: target };
    for (const a of h.do) this.runTrigAction(target, hook, a, ev, 1, emit);
  }

  /** intercept: hedefin ölümcül vuruşunu üstlenecek dost (korumacı / bağlı); yoksa undefined. */
  private interceptorFor(target: Combatant): { unit: Combatant; h: RuleHook } | undefined {
    for (const u of this.living(target.side)) {
      if (u === target || u.inert || !u.treeHooks) continue;
      for (const h of this.rulesOf(u, 'intercept', target)) {
        if (h.once && u.treeOnce?.includes(h.node)) continue;
        const ok = h.scope === 'bonded' ? this.bondPartnerOf(u.uid) === target.uid : target.statuses.some((s) => s.kind === 'guard' && s.source === u.uid);
        if (ok) return { unit: u, h };
      }
    }
    return undefined;
  }

  /** guardBehind (Guardian Oak): hedefin hemen önündeki (aynı şerit, bir sıra önde) kurallı dost hedefi konumla korur. */
  private positionalGuard(target: Combatant): Status | undefined {
    const lanes = this.setup.formulas.formation.lanes;
    if (this.rowOf(target.slot) === 0) return undefined;
    const front = target.slot - lanes;
    const g = this.living(target.side).find((c) => c !== target && !c.inert && c.board === target.board && c.slot === front && c.treeHooks?.some((h) => h.h === 'rule' && h.rule === 'guardBehind'));
    const h = g ? this.rulesOf(g, 'guardBehind')[0] : undefined;
    return g && h ? { kind: 'guard', turns: 1, source: g.uid, share: h.share ?? 0.5, cause: h.node } : undefined;
  }

  /** pierce: saldıranın bu vuruşta yok saydığı durumlar / kalkan (kural yoksa null). */
  private pierceOf(actor: Combatant | undefined): { statuses: Set<string>; shields: boolean } | null {
    if (!actor?.treeHooks || !this.treeUnits) return null;
    const list = this.rulesOf(actor, 'pierce').filter((h) => !h.skill || h.skill === this.castingSkill?.id);
    if (!list.length) return null;
    return { statuses: new Set(list.flatMap((h) => h.statuses ?? [])), shields: list.some((h) => h.shields) };
  }

  /** Gathering Mark: hedefe `from` (yoksa tüm) başka düşmandan 1'er yığın çekilir (yuva sırasıyla; yığını olmayan atlanır). */
  /** Faz 5a: birimin bir sıra önündeki hücre (aynı şerit, aynı tahta; canlı birim yoksa), yoksa null. */
  private stepForwardSlot(c: Combatant): number | null {
    const lanes = this.setup.formulas.formation.lanes;
    if (this.rowOf(c.slot) === 0) return null;
    const to = c.slot - lanes;
    return this.combatants.some((o) => o.hp > 0 && o.side === c.side && o.board === c.board && o.slot === to) ? null : to;
  }

  /** Hücre kümesi + dört yönden değen hücreler (sıralı). */
  private touchingSlots(slots: readonly number[]): number[] {
    const { rows, lanes } = this.setup.formulas.formation;
    const out = new Set(slots);
    for (const s of slots) {
      const r = this.rowOf(s);
      const l = this.laneOf(s);
      for (const [dr, dl] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nr = r + dr;
        const nl = l + dl;
        if (nr >= 0 && nr < rows && nl >= 0 && nl < lanes) out.add(nr * lanes + nl);
      }
    }
    return [...out].sort((x, y) => x - y);
  }

  /** Faz 5a (Overflowing Fate): son kullanımda çekilen yığın sayısı (gather). */
  private readonly gatheredN = new Map<string, number>();
  /** Faz 5a (X Marks the Throat): bu kullanımda merkez hücreye gelen kritik vuruş sayısı. */
  private centerCritN = 0;
  /** Faz 5a (perCast): bu kullanımda düğüm başına tetik ateşi. */
  private readonly castFires = new Map<string, number>();

  /**
   * Faz 5a (Grand Theft): alıcının (to, varsayılan target) tüm buff'larını söker ve sahibin takımına dağıtır (sahip + dostlar, hücre sırasıyla, sırayla
   * birer birer; aynı türü taşıyan dostta tur yenilenir). Taunt / Guard özel kodlu: çalınmaz.
   */
  private trigSteal(owner: Combatant, h: TriggerHook, a: TriggerAction, ev: TrigEv, emit: Emit): void {
    const team = [owner, ...this.living(owner.side).filter((c) => c !== owner && !c.inert).sort((x, y) => x.slot - y.slot)].filter((c) => c.hp > 0);
    let i = 0;
    for (const rec of this.trigRecipients(owner, { ...a, to: a.to ?? 'target' }, ev)) {
      if (rec.side === owner.side) continue;
      const buffs = rec.statuses.filter((s) => s.kind !== 'taunt' && s.kind !== 'guard' && this.statusDef(s.kind)?.type === 'buff');
      for (const st of buffs) {
        rec.statuses = rec.statuses.filter((x) => x !== st);
        emit({ type: 'statusEnd', target: rec.uid, status: st.kind, dispelled: true, source: owner.uid });
        const to = team[i++ % team.length];
        if (to) this.addStatus(to, { ...st, source: owner.uid }, emit, h.node);
      }
    }
  }

  private gatherStacks(actor: Combatant, target: Combatant, g: { status: string; from?: number }, emit: Emit): void {
    const donors = this.living(target.side).filter((c) => c !== target && !c.inert && c.statuses.some((s) => s.kind === g.status && (s.stacks ?? 0) > 0)).sort((x, y) => x.slot - y.slot);
    let moved = 0;
    for (const d of donors.slice(0, g.from ?? donors.length)) {
      const st = d.statuses.find((s) => s.kind === g.status)!;
      st.stacks = (st.stacks ?? 1) - 1;
      if (st.stacks <= 0) {
        d.statuses = d.statuses.filter((s) => s !== st);
        emit({ type: 'statusEnd', target: d.uid, status: st.kind, dispelled: true, source: actor.uid });
      } else emit({ type: 'status', target: d.uid, status: st.kind, turns: st.turns, source: st.source, stacks: st.stacks });
      moved++;
    }
    this.gatheredN.set(actor.uid, moved);
    if (moved > 0) this.addStacks(target, g.status as Status['kind'], moved, actor, emit, false, false);
  }

  /** Üst üste kuralı (ağacın doğurduğu zemin, yields): hücrede aynı türden, aynı tarafın, en az bu kadar güçlü başka zemin var mı. */
  private groundOutranked(g: GroundEffect, slot: number): boolean {
    const mine = g.amount * (g.cellMult?.[slot] ?? 1);
    return this.ground.some((o) => o !== g && o.ground === g.ground && o.board === g.board && o.sourceSide === g.sourceSide && !o.noDamage && o.slots.includes(slot) && o.amount * (o.cellMult?.[slot] ?? 1) >= mine && (!o.yields || o.amount * (o.cellMult?.[slot] ?? 1) > mine || this.ground.indexOf(o) < this.ground.indexOf(g)));
  }

  /** Fire on Fire: yeni zemin, aynı türden zemin zaten olan hücrelerde x mult; eski zemin o hücreleri bırakır (biri iki kez tiklemez). */
  private stackGround(g: GroundEffect, mult: number, emit: Emit): void {
    for (const old of [...this.ground]) {
      if (old.ground !== g.ground || old.board !== g.board || old.sourceSide !== g.sourceSide) continue;
      const shared = old.slots.filter((s) => g.slots.includes(s));
      if (!shared.length) continue;
      for (const s of shared) (g.cellMult ??= {})[s] = (g.cellMult[s] ?? 1) * mult;
      emit({ type: 'groundEnd', id: old.id });
      old.slots = old.slots.filter((s) => !shared.includes(s));
      if (!old.slots.length) {
        this.ground.splice(this.ground.indexOf(old), 1);
        continue;
      }
      old.id = `g${this.groundCount++}`;
      emit({ type: 'ground', id: old.id, ground: old.ground, board: old.board, slots: old.slots, turns: old.turns });
    }
  }

  /** Ağaç zeminlerinin tur başı etkisi (grounds.json statuses / manaBurnPct + zemine eklenen durumlar): içinde tur başlatan düşmana. */
  private groundTurnStart(actor: Combatant, emit: Emit): void {
    for (const g of [...this.ground]) {
      if (g.board !== actor.board || !g.slots.includes(actor.slot) || g.sourceSide === actor.side || actor.hp <= 0) continue;
      const def = this.setup.grounds?.[g.ground];
      const list = [...(def?.statuses ?? []), ...(g.statuses ?? [])];
      if (!list.length && !def?.manaBurnPct) continue;
      const src = this.get(g.source) ?? actor;
      if (def?.manaBurnPct && actor.maxMp > 0 && actor.mp > 0) {
        const burn = Math.min(actor.mp, Math.max(1, Math.round(actor.maxMp * def.manaBurnPct)));
        actor.mp -= burn;
        emit({ type: 'resource', actor: actor.uid, resource: 'mp', amount: burn, after: actor.mp });
      }
      for (const st of list) {
        if (!this.statusDef(st.status) || (st.mpZero && !(actor.maxMp > 0 && actor.mp <= 0))) continue;
        this.addStatus(actor, { kind: st.status as Status['kind'], turns: st.turns ?? 1, source: src.uid }, emit, g.ground);
      }
    }
  }

  /** Mana Overflow'un bir tetiklenişi (pasif sayacı eşiği geçince ya da Overflow Strike): tüm takıma MP; dolan dost tetiği (allyFilled). */
  private fireOverflow(owner: Combatant, attacker: Combatant, emit: Emit): void {
    const overflow = owner.passive?.effect;
    if (overflow?.type !== 'manaOverflow' || owner.hp <= 0) return;
    emit({ type: 'passive', actor: owner.uid, passive: owner.passive!.id, name: owner.passive!.name });
    const give = (ally: Combatant, amount: number): number => {
      const gain = Math.min(amount, ally.maxMp - ally.mp);
      if (gain <= 0) return 0;
      ally.mp += gain;
      emit({ type: 'mpRegen', actor: ally.uid, amount: gain, after: ally.mp });
      if (this.trigOn && ally.mp >= ally.maxMp) this.trig([owner], { on: 'allyFilled', target: ally, subject: ally }, emit);
      return gain;
    };
    if (!overflow.to && !overflow.spill && !overflow.noSelf && overflow.mult === undefined) {
      for (const ally of this.living(owner.side)) give(ally, overflow.mana);
    } else {
      // Faz 5a (Conduit / Lifeline Pact / Martyr's Overflow / Spillover): tek alıcı, çarpan, sahipsiz dağıtım, taşanı en az MP'liye
      const recips = this.living(owner.side).filter((c) => !c.inert && !(overflow.noSelf && c === owner));
      const per = Math.round(overflow.mana * (overflow.mult ?? 1));
      const leastMp = (): Combatant | undefined => recips.filter((c) => c.hp > 0 && c.mp < c.maxMp).sort((x, y) => x.mp - y.mp || x.slot - y.slot)[0];
      let left = 0;
      if (overflow.to === 'lowestMp') {
        const pool = per * recips.length;
        const t = leastMp();
        left = t ? pool - give(t, pool) : pool;
      } else for (const ally of recips) left += per - give(ally, per);
      if (overflow.spill) {
        for (let k = 0; k < 8 && left > 0; k++) {
          const t = leastMp();
          if (!t) break;
          left -= give(t, left);
        }
      }
    }
    if (this.trigOn) this.trig([owner], { on: 'manaOverflow', target: attacker, source: attacker, amount: overflow.mana }, emit);
  }

  /** Tetik hasarına sınıf pasifinin hasar eki (Opportunist: hedefte listedeki durum varsa 1 + bonus; ağaç yamalı pasif). */
  private trigPassiveMult(owner: Combatant, rec: Combatant): number {
    const pe = owner.passive?.effect;
    return pe?.type === 'bonusVsStatus' && rec.statuses.some((x) => pe.statuses.includes(x.kind)) ? 1 + pe.bonus : 1;
  }

  /** Tetik Doom'u: sahibin canlı statıyla `omens` Omen'lik Doom (yığın taşımayan hedefte de; sıçrayan Doom = leap). */
  private doomBurst(owner: Combatant, rec: Combatant, omens: number, emit: Emit): void {
    const n = Math.max(1, Math.round(omens));
    this.triggerDoom(rec, { kind: 'omen', turns: 1, source: owner.uid, stacks: n, leap: true }, 1, 'detonate', owner, emit);
  }

  private addMark(owner: Combatant, node: string, rec: Combatant, until: 'turn' | 'hit'): void {
    const k = `${owner.uid}|${node}`;
    let m = this.marks.get(k);
    if (!m) this.marks.set(k, (m = new Map()));
    m.set(rec.uid, until);
  }
  private isMarked(owner: Combatant, node: string, c: Combatant): boolean {
    return !!this.marks.get(`${owner.uid}|${node}`)?.has(c.uid);
  }

  /** Ağaç kalkanı: `turns` verilirse süreli katman (sahibin katmanı büyür, süresi yenilenir), yoksa düz havuz. Olay: shield. */
  private treeShield(source: Combatant, target: Combatant, id: string, amount: number, turns: number | undefined, magic: boolean, emit: Emit): void {
    if (amount <= 0 || target.hp <= 0 || target.inert) return;
    this.trimShieldHooks(target);
    if (magic) target.magicShield += amount;
    else target.shield += amount;
    if (turns !== undefined) {
      const hooks = (target.shieldHooks ??= []);
      const same = hooks.find((x) => x.skill === id && x.caster === source.uid && x.magic === magic);
      if (same) {
        same.amount += amount;
        same.size = same.amount;
        same.turns = turns;
      } else hooks.push({ skill: id, caster: source.uid, magic, amount, onAbsorb: {}, turns, size: amount });
    }
    emit({ type: 'shield', source: source.uid, target: target.uid, amount, shieldAfter: target.shield, magicShieldAfter: target.magicShield, magic });
  }

  /** Ölüm tetikleri: öldüren (kill; skill = öldürenin sürmekte olan kullanımı, yol skill / dot / doom / ground), düşmanlar (enemyDied), dostlar (allyFell). */
  private deathTrig(c: Combatant, emit: Emit, doomed?: Status): void {
    const lh = this.lastHitOn.get(c.uid);
    const killer = lh ? this.get(lh.source) : undefined;
    const grounds = this.ground.filter((g) => g.board === c.board && g.slots.includes(c.slot)).map((g) => g.ground);
    if (killer && killer.side !== c.side) {
      const via = doomed ? (doomed.leap ? 'leap' : 'doom') : this.smiting ? 'smite' : lh!.origin === 'status' ? 'dot' : lh!.origin === 'ground' ? 'ground' : 'skill';
      const skill = killer === this.castingActor && this.castingSkill ? this.castingSkill.id : undefined;
      this.trig([killer], { on: 'kill', target: c, subject: c, source: killer, via, ...(doomed ? { amount: this.doomSize.get(doomed) ?? doomed.stacks ?? 0 } : {}), ...(lh?.amount !== undefined ? { dealt: lh.amount } : {}), ...(skill ? { skill } : {}) }, emit);
    }
    this.trigAll({ on: 'enemyDied', target: c, subject: c, ...(killer ? { source: killer } : {}), statuses: [...c.statuses], grounds }, emit, (u) => u.side !== c.side);
    if (!c.summoned) this.trigAll({ on: 'allyFell', target: c, subject: c, ...(killer ? { source: killer } : {}) }, emit, (u) => u.side === c.side && u !== c);
    this.summonDeathTrig(c, emit);
  }

  /** Faz 4c: çağrı öldü ya da süresi doldu (dinleyen = çağıran; hedef / özne = çağrı, son vurduğu düşman `lastHit`). */
  private summonDeathTrig(c: Combatant, emit: Emit): void {
    if (!this.trigOn || !c.summoned || !c.owner) return;
    const owner = this.get(c.owner);
    // Faz 5a (Living Bomb): yeniden çağırmayla öldürülen çağrının ölüm tetikleri `mult` kat
    const mult = this.burstMult.get(c.uid);
    if (owner) this.trig([owner], { on: 'summonDeath', unit: c.defId, target: c, subject: c, ...(mult !== undefined ? { mult } : {}) }, emit);
  }

  /** Durum bitişi tetiği: taşıyan (mine olmayan kancalar) ve uygulayan (mine kancaları). */
  private statusEndTrig(holder: Combatant, st: Status, end: 'broken' | 'expired' | 'dispelled', emit: Emit): void {
    if (!this.trigOn) return;
    this.trig([holder, this.get(st.source)], { on: 'statusEnd', subject: holder, target: holder, status: st.kind, statusSource: st.source, end, st, amount: st.dealt ?? 0 }, emit);
  }

  /** Can eşiği geçişi (hpBelow): hasarı alanın tarafındaki dinleyiciler; hedef = saldıran (yalnızca düşmansa). */
  private hpCrossTrig(target: Combatant, hp0: number, attacker: Combatant, emit: Emit): void {
    if (!this.trigOn || target.hp <= 0 || target.maxHp <= 0 || hp0 <= target.hp) return;
    this.trigAll({ on: 'hpBelow', subject: target, source: attacker, ...(attacker.side !== target.side ? { target: attacker } : {}), before: hp0 / target.maxHp, after: target.hp / target.maxHp }, emit, (u) => u.side === target.side);
  }

  /** Buff kullanımı (sahibin kullanım sonu): bekleyenler etkinleşir, kapsamı uyan sayaçlılar 1 azalır. */
  private useTreeBuffs(actor: Combatant, skillId: string): void {
    if (!actor.treeBuffs?.length) return;
    actor.treeBuffs = actor.treeBuffs.filter((b) => {
      if (b.pending) {
        delete b.pending;
        return true;
      }
      if (b.uses === undefined || (b.skill && b.skill !== skillId)) return true;
      b.uses--;
      return b.uses > 0;
    });
  }
  /** Süreli buff'lar sahibin tur başında azalır. */
  private tickTreeBuffs(actor: Combatant): void {
    if (!actor.treeBuffs?.length) return;
    actor.treeBuffs = actor.treeBuffs.filter((b) => {
      if (b.turns === undefined) return true;
      b.turns--;
      return b.turns > 0;
    });
  }

  /** C4: `on` noktasındaki kancalar (sahip `owner`), koşul tutanlar ve ölçek. */
  private healHooks(owner: Combatant, on: HealPoint, target: Combatant | undefined, skill: SkillDef | null | undefined, incoming?: CondCtx['incoming']): Array<{ h: HealHook; s: number }> {
    const out: Array<{ h: HealHook; s: number }> = [];
    for (const h of owner.treeHooks ?? []) {
      if (h.h !== 'heal' || h.on !== on) continue;
      if (h.skill && h.skill !== skill?.id) continue;
      const ctx = this.condCtx(owner, target, skill);
      ctx.node = h.node;
      if (incoming) ctx.incoming = incoming;
      if (!condHolds(h.when, ctx)) continue;
      const s = scaleOf(h.scale, ctx);
      if (s) out.push({ h, s });
    }
    return out;
  }

  /**
   * C4 alınan hasar çarpanı (damageTaken): hasarı alanın tarafındaki C4 sahipleri (who self / ally / team, alanın durumu / kalkan katmanı). Saf
   * (önizleme / YZ / gerçek vuruş aynı); `procs` yalnızca gerçek vuruşta ölçüm yazar.
   */
  treeTakenMult(target: Combatant, attacker?: Combatant, type?: 'physical' | 'magic', skill?: SkillDef | null, procs = false): number {
    if (!this.healOn) return 1;
    let m = 1;
    const inc = attacker ? { actor: attacker, ...(skill !== undefined ? { skill } : {}), ...(type ? { type } : {}) } : undefined;
    for (const u of this.healUnits) {
      if (u.hp <= 0 || u.side !== target.side) continue;
      for (const { h, s } of this.healHooks(u, 'damageTaken', target, null, inc)) {
        const who = h.who ?? 'self';
        if (who === 'self' && u !== target) continue;
        if (who === 'ally' && u === target) continue;
        if (h.status && !target.statuses.some((st) => st.kind === h.status && (!h.mine || st.source === u.uid))) continue;
        if (h.shield && !target.shieldHooks?.some((x) => x.skill === h.shield && x.caster === u.uid && x.amount > 0)) continue;
        if (h.marked && !this.isMarked(u, h.node, target)) continue;
        m *= Math.max(0, 1 + (h.mul ?? 0) * s);
        if (procs) {
          this.treeProc(u.uid, h.node);
          // Faz 4c (Iron Return): 'vuruşa kadar' işareti gerçek vuruşta tükenir
          if (h.marked && this.marks.get(`${u.uid}|${h.node}`)?.get(target.uid) === 'hit') this.marks.get(`${u.uid}|${h.node}`)!.delete(target.uid);
        }
      }
    }
    return m;
  }

  /** C4 büyük vuruş indirimi (bigHit): tek vuruş maks canın `min` oranına ulaşırsa x (1 + mul). */
  private bigHitCut(target: Combatant, attacker: Combatant, amount: number): number {
    let out = amount;
    for (const { h, s } of this.healHooks(target, 'bigHit', attacker, this.castingSkill, { actor: attacker, skill: this.castingSkill })) {
      if (amount < (h.min ?? 1) * target.maxHp) continue;
      out = Math.max(0, Math.round(out * Math.max(0, 1 + (h.mul ?? 0) * s)));
      this.treeProc(target.uid, h.node);
    }
    return out;
  }

  /** C4 Guard payı (guardShare): korumacıya aktarılan hasar x (1 + mul). */
  private guardShareCut(guardian: Combatant, redirected: number, attacker: Combatant): number {
    if (!this.healOn || !guardian.treeHooks || redirected <= 0) return redirected;
    let out = redirected;
    for (const { h, s } of this.healHooks(guardian, 'guardShare', attacker, null)) {
      out = Math.max(0, Math.round(out * Math.max(0, 1 + (h.mul ?? 0) * s)));
      this.treeProc(guardian.uid, h.node);
    }
    return out;
  }

  /** C4 verilen şifa çarpanı (healTaken alanın + healDealt verenin kancaları). Saf; önizleme de kullanır. */
  treeHealMult(source: Combatant, target: Combatant, skill: SkillDef | null | undefined, nodes?: Array<[string, string]>): number {
    if (!this.healOn) return 1;
    let m = 1;
    for (const { h, s } of this.healHooks(target, 'healTaken', source, null)) {
      m *= Math.max(0, 1 + (h.mul ?? 0) * s);
      nodes?.push([target.uid, h.node]);
    }
    for (const { h, s } of this.healHooks(source, 'healDealt', target, skill)) {
      m *= Math.max(0, 1 + (h.mul ?? 0) * s);
      nodes?.push([source.uid, h.node]);
    }
    return m;
  }

  /** C4 verilen kalkan çarpanı (shieldDealt). Saf; önizleme de kullanır. */
  treeShieldMult(actor: Combatant, target: Combatant, skill: SkillDef | null | undefined, nodes?: string[]): number {
    if (!this.healOn || !actor.treeHooks) return 1;
    let m = 1;
    for (const { h, s } of this.healHooks(actor, 'shieldDealt', target, skill)) {
      m *= Math.max(0, 1 + (h.mul ?? 0) * s);
      nodes?.push(h.node);
    }
    return m;
  }

  /** Kalkanı tetik / C4 için katman olarak izlenecek kaster mı (shieldAbsorb / shieldBreak tetiği ya da damageTaken shield süzgeci). */
  private treeShieldLayer(actor: Combatant): boolean {
    return !!actor.treeHooks?.some((h) => (h.h === 'trigger' && (h.on === 'shieldAbsorb' || h.on === 'shieldBreak')) || (h.h === 'heal' && h.shield !== undefined));
  }

  /**
   * Ağaçlı şifa (C4 kancası olan veren ya da alan): alınan / verilen şifa çarpanı, fazla şifanın kalkana / Rage'e dönüşümü (overheal: alanın,
   * overhealDealt: verenin; `cap` = canı bu oranın üstüne çıkaracak kısım). Kancasız şifa applyHeal'in eski yolundan geçer.
   */
  private treeHeal(source: Combatant, target: Combatant, wantedRaw: number, crit: boolean, emit: Emit, cause?: string): number {
    const skill = source === this.castingActor ? this.castingSkill : null;
    const nodes: Array<[string, string]> = [];
    const wound = Math.round(wantedRaw * this.statusMult(target, 'healTakenMult'));
    const prevented = Math.max(0, wantedRaw - wound);
    const wanted = Math.max(0, Math.round(wound * this.treeHealMult(source, target, skill, nodes)));
    let amount = Math.max(0, Math.min(wanted, target.maxHp - target.hp));
    const over = this.healHooks(target, 'overheal', source, skill);
    const overDealt = this.healHooks(source, 'overhealDealt', target, skill);
    // Red Line (cap): canı cap oranının üstüne çıkaracak şifa dönüşür (şifa cap'te durur)
    let capped = 0;
    const capH = over.filter((x) => x.h.cap !== undefined).sort((a, b) => a.h.cap! - b.h.cap!)[0];
    if (capH) {
      const capHp = Math.round(capH.h.cap! * target.maxHp);
      const room = Math.max(0, capHp - target.hp);
      capped = Math.max(0, wanted - room);
      amount = Math.min(amount, room);
    }
    const excess = Math.max(0, wanted - amount - capped);
    // Boş şifa olayı üretilmez (eski kural); dönüşecek fazla varsa yalnızca dönüşüm işler
    const emptyHeal = amount === 0 && (source === target || wanted === 0);
    const convertible = capped > 0 || (excess > 0 && (over.some((x) => x.h.cap === undefined) || overDealt.length > 0));
    if (emptyHeal && !convertible) return 0;
    if (!emptyHeal) {
      target.hp += amount;
      emit({ type: 'heal', source: source.uid, target: target.uid, amount, hpAfter: target.hp, crit, ...(cause ? { cause } : {}) });
    }
    for (const [uid, node] of nodes) this.treeProc(uid, node);
    for (const { h } of over) {
      const conv = h.cap !== undefined ? (h === capH?.h ? capped : 0) : excess;
      if (conv <= 0) continue;
      this.treeProc(target.uid, h.node);
      if (h.into === 'shield') this.treeShield(target, target, h.node, Math.round(conv * (h.ratio ?? 1)), h.turns, false, emit);
      else if (h.into === 'rage' && target.maxRage !== undefined && target.maxHp > 0) {
        const cur = target.rage ?? 0;
        const after = Math.min(target.maxRage, cur + Math.floor(((conv / target.maxHp) * 100 + 1e-9) * (h.ratio ?? 1)));
        if (after > cur) {
          target.rage = after;
          emit({ type: 'rage', actor: target.uid, delta: after - cur, after, max: target.maxRage });
        }
      }
    }
    for (const { h } of overDealt) {
      if (excess <= 0 || h.into !== 'shield') continue;
      this.treeProc(source.uid, h.node);
      this.treeShield(source, target, h.node, Math.round(excess * (h.ratio ?? 1)), h.turns, false, emit);
    }
    if (this.trigOn && amount > 0) this.trigAll({ on: 'enemyHealed', target, subject: target, source, amount, prevented }, emit, (u) => u.side !== target.side);
    return amount;
  }

  /** Bedel koşulları ödendi (gerçek kullanım): tutanlar ölçülür, silahlanmış olanlar harcanır. Faz 2c: bağlamda skill + hedef (Formed Up, Not Yet). */
  private payCostConds(actor: Combatant, skill: SkillDef, target?: Combatant): void {
    for (const c of skill.cost.cond ?? []) {
      const armed = !c.after || !!actor.treeArmed?.includes(c.node);
      if (!armed) continue;
      const x: CondCtx = { self: actor, skillId: c.skill ?? skill.id, ...(target ? { target } : {}), host: this.condHost };
      if (condHolds(c.when, x) && scaleOf(c.scale, x) !== 0) this.treeProc(actor.uid, c.node);
      if (c.after) actor.treeArmed = actor.treeArmed!.filter((n) => n !== c.node);
    }
  }
  /** Bu skill kullanılınca silahlanan bedel koşulları (CostCond.after; birimin yamalı skill'lerinde). */
  private armCostConds(actor: Combatant, skillId: string): void {
    for (const d of Object.values(actor.skillDefs ?? {})) {
      for (const c of d.cost.cond ?? []) if (c.after === skillId && !actor.treeArmed?.includes(c.node)) (actor.treeArmed ??= []).push(c.node);
    }
  }

  /**
   * Mob pasiflerinin GİDEN hasar çarpanı (YM14, YM16, YM19; Bölge I): Grudge (temel saldırı, ona en son skill ile vuran düşmana), Pack Tactics
   * (aynı sıradaki diğer canlı aynı tür dost başına), Shares of the Dead (ölen dost başına birikim). `skill` verilmezse Grudge uygulanmaz.
   */
  passiveDealtMult(actor: Combatant, target: Combatant, skill?: SkillDef | null): number {
    const e = actor.passive?.effect;
    if (!e || actor.side === target.side) return 1;
    if (e.type === 'grudge') return skill?.id === e.skill && actor.grudgeOn === target.uid ? 1 + e.bonus : 1;
    if (e.type === 'packTactics') return 1 + e.perAlly * this.packMatesOf(actor);
    if (e.type === 'sharesOfDead') return 1 + e.perDeath * (actor.shares ?? 0);
    // Blood Scent (YM21): canı eşiğin altındaki hedefe ek hasar
    if (e.type === 'bloodScent') return target.hp > 0 && target.hp < e.below * target.maxHp ? 1 + e.bonus : 1;
    return 1;
  }

  /** Close Ranks: aynı tahtada aynı sıradaki diğer canlı, sıra alan dost sayısı (tür fark etmez). */
  rowMatesOf(c: Combatant): number {
    return this.combatants.filter((a) => a.uid !== c.uid && a.hp > 0 && !a.inert && a.side === c.side && a.board === c.board && this.rowOf(a.slot) === this.rowOf(c.slot)).length;
  }

  /** Pack Tactics: aynı tahtada aynı sıradaki diğer canlı aynı tür (defId) dost sayısı. */
  packMatesOf(c: Combatant): number {
    return this.combatants.filter((a) => a.uid !== c.uid && a.hp > 0 && a.side === c.side && a.board === c.board && a.defId === c.defId && this.rowOf(a.slot) === this.rowOf(c.slot)).length;
  }

  /** Hide in the Brush: birimin şeridinde (aynı tahta) önündeki bir sırada canlı dost var mı. */
  coveredInLane(c: Combatant): boolean {
    return this.combatants.some((a) => a.uid !== c.uid && a.hp > 0 && a.side === c.side && a.board === c.board && !a.inert && this.laneOf(a.slot) === this.laneOf(c.slot) && this.rowOf(a.slot) < this.rowOf(c.slot));
  }

  /** Flock Shield (YM18): kullanılmamışsa ve saldıran düşmansa, skill vuruşunun alınan hasar çarpanı (1 - reduce); yoksa 1. */
  flockMult(actor: Combatant, target: Combatant): number {
    const e = target.passive?.effect;
    return e?.type === 'flockShield' && !target.passiveUsed && actor.side !== target.side ? 1 - e.reduce : 1;
  }

  /** 'everyone' hedefli skill'lerde bir etkinin bu hedefe uygulanıp uygulanmadığı (diğer skill'lerde hep evet). */
  effectAppliesTo(skill: SkillDef, effect: SkillEffect, target: Combatant, actor: Combatant): boolean {
    // area_any (Smoke Bomb): etki yalnızca `side` tarafındaki birimlere (alan hangi tahtaya atılırsa atılsın; veri doğrulaması side'ı zorunlu kılar)
    if (skill.target === 'area_any') return effect.side === undefined || (effect.side === 'allies') === (target.side === actor.side);
    if (skill.target !== 'everyone') return true;
    const alliedDefault = effect.type === 'heal' || effect.type === 'hot' || effect.type === 'shield' || effect.type === 'guard' || effect.type === 'bond' || (effect.type === 'dispel' && effect.status === 'debuff');
    const side = effect.side ?? (alliedDefault ? 'allies' : 'enemies');
    return (side === 'allies') === (target.side === actor.side);
  }

  private effectTargets(skill: SkillDef, effect: SkillEffect, targets: Combatant[], actor: Combatant): Combatant[] {
    return skill.target === 'everyone' || skill.target === 'area_any' ? targets.filter((c) => this.effectAppliesTo(skill, effect, c, actor)) : targets;
  }

  /**
   * ESKİ erişim kuralı (yalnızca formulas.range.enabled false): yakın dövüş skill'inin menzil eki = skill `reach`. Hem hedeflenebilecek düşman sıraları
   * (meleeRows + reach) hem de saldıranın kendi sırası için kullanılır.
   */
  reachOf(_actor: Combatant | string, skill: SkillDef): number {
    return skill.reach ?? 0;
  }

  // --- Menzil kancaları (docs/design/range.md; kural src/engine/range.ts; bayrak formulas.range.enabled) ---

  /** Menzil sistemi açık mı? Kapalıyken aşağıdaki menzil kancaları "her şey menzilde" der ve eski erişim kuralı işler. */
  get rangeOn(): boolean {
    return rangeEnabled(this.setup.formulas);
  }

  /** Debug kurulumu: bu savaşta menzil / erişim sınırı yok mu (BattleSetup.ignoreRange)? */
  get ignoreRange(): boolean {
    return !!this.setup.ignoreRange;
  }

  /** Skill menzilsiz mi ("Global" ya da hedef seçimi olmayan tür / range'siz dost skill'i)? */
  isGlobalRange(skill: SkillDef): boolean {
    return skillRangeFor(skill, 1, this.setup.formulas) === Infinity;
  }

  /** Birimin taban (sınıf) menzili: birim verisindeki `range`; yoksa formulas.json > range.default. */
  unitRange(c: Combatant): number {
    return this.setup.units[c.defId]?.range ?? this.setup.formulas.range?.default ?? 1;
  }

  /** Skill'in bu birim için menzili (Infinity = menzilsiz); range.ts > skillRangeFor. */
  rangeOf(actor: Combatant | string, skill: SkillDef): number {
    const a = typeof actor === 'string' ? this.get(actor) : actor;
    return skillRangeFor(skill, a ? this.unitRange(a) : undefined, this.setup.formulas);
  }

  /** Bir tahtanın en öndeki DOLU sırası (canlı birim; 0 = en önde). `moved`: varsayımsal yer değiştirme (YZ). Tahta boşsa 0. */
  frontOccupiedRow(board: Side, moved?: { uid: string; slot: number }): number {
    let front = Infinity;
    for (const c of this.combatants) {
      if (c.hp <= 0 || c.board !== board) continue;
      const slot = moved && c.uid === moved.uid ? moved.slot : c.slot;
      front = Math.min(front, this.rowOf(slot));
    }
    return front === Infinity ? 0 : front;
  }

  /** Saldırandan `board` tahtasındaki `slot` hücresine mesafe (range.ts > cellDistance). `from`: saldıranın varsayımsal hücresi; `moved`: hedef tahtasında varsayımsal yer değiştirme. */
  distanceTo(actor: Combatant, board: Side, slot: number, opts?: { from?: number; moved?: { uid: string; slot: number } }): number {
    const from = opts?.from ?? actor.slot;
    const fromRow = actor.board === actor.side || board === actor.side ? this.rowOf(from) : 0;
    return cellDistance(fromRow, board === actor.side, this.rowOf(slot), board === actor.side ? 0 : this.frontOccupiedRow(board, opts?.moved));
  }

  /** Hücre bu skill'in menzilinde mi? Sistem kapalıyken ve debugCast sırasında hep evet. Alan skill'inde hücre = hedeflenen anchor. */
  inRange(actor: Combatant, skill: SkillDef, board: Side, slot: number, opts?: { from?: number; moved?: { uid: string; slot: number } }): boolean {
    if (!this.rangeOn || this.debugCasting || this.setup.ignoreRange) return true;
    const r = this.rangeOf(actor, skill);
    return r === Infinity || this.distanceTo(actor, board, slot, opts) <= r;
  }

  /**
   * Varsayımsal birim (`defId` menzilli, `side` tarafında) `slot` hücresinden bu skill'le karşı taraftaki bir canlı birime ulaşır mı (YZ: diriltme/çağrı
   * hücresi)? Karşı tarafı hedeflemeyen skill'de evet. Alan skill'inde en yakın birim ölçülür (yaklaşık).
   */
  skillReachesFromCell(defId: string | undefined, side: Side, skill: SkillDef, slot: number): boolean {
    if (!FOE_TARGETS.includes(skill.target) || this.setup.ignoreRange) return true;
    const r = skillRangeFor(skill, defId ? this.setup.units[defId]?.range : undefined, this.setup.formulas);
    if (r === Infinity) return true;
    const foe = opposite(side);
    const front = this.frontOccupiedRow(foe);
    return this.living(foe).some((c) => c.board === foe && cellDistance(this.rowOf(slot), false, this.rowOf(c.slot), front) <= r);
  }

  /** Birim `from` hücresindeyken bu skill'in menzilinde en az bir geçerli hedef var mı (YZ konum alma; bedel/cooldown denetlenmez)? */
  reachesFrom(actor: Combatant, skill: SkillDef, from: number): boolean {
    if (this.rangeOf(actor, skill) === Infinity) return true;
    const foe = opposite(actor.side);
    const moved = { uid: actor.uid, slot: from };
    switch (skill.target) {
      case 'single_enemy':
      case 'random_enemies':
      case 'all_enemies':
      case 'everyone':
        return this.living(foe).some((c) => c.board === foe && this.inRange(actor, skill, c.board, c.slot, { from }) && (!skill.requiresOpenBehind || this.openBehindProblem(c) === null));
      case 'area_enemies':
      case 'area_any': {
        const total = this.setup.formulas.formation.rows * this.setup.formulas.formation.lanes;
        const boards: Side[] = skill.target === 'area_any' ? [foe, actor.side] : [foe];
        return boards.some((b) => Array.from({ length: total }, (_, i) => i).some((i) => this.inRange(actor, skill, b, i, { from, moved }) && this.areaWindowAt(actor.uid, skill.id, i, b).length > 0));
      }
      case 'single_ally':
        return this.living(actor.side).some((c) => c.board === actor.side && (!skill.excludeSelf || c.uid !== actor.uid) && this.inRange(actor, skill, c.board, c.uid === actor.uid ? from : c.slot, { from }));
      default:
        return true;
    }
  }

  /**
   * `foe` bu skill'le `target`'a, hedef `slot` hücresindeyken (varsayılan: şu anki) ulaşır mı (YZ: geri çekilme / konum alma)? Hedef tahtasının en
   * öndeki dolu sırası hedefin varsayımsal hücresiyle hesaplanır. Taunt/arkası boş kuralı denetlenmez.
   */
  reachedBy(foe: Combatant, skill: SkillDef, target: Combatant, slot = target.slot): boolean {
    return this.inRange(foe, skill, target.board, slot, { moved: { uid: target.uid, slot } });
  }

  /**
   * Skill HASARI hesabında kullanılan stat'lar (vuruş zarı, önizleme, YZ tahmini). Abyssal Fury'nin bonus STR eki (attackAttrPct) 2026-10-17'de
   * kaldırıldı; şimdilik gerçek stat nesnesi (hasara özel stat eki gelirse tek yer burası).
   */
  attackStats(c: Combatant): Combatant['stats'] {
    return c.stats;
  }

  /**
   * Zırh aurası (Defender gibi) ve durumların isabet/kaçınma ekleri (Blinded/Shrouded: statuses.json > accuracyDelta/evasionDelta) dahil,
   * savaştaki geçerli stat'lar. Hiçbiri yoksa gerçek stat nesnesi döner. İsabet/kaçınma 0'ın altına inmez; hit şansı ayrıca [0, hit.max] arasına sıkışır.
   * Aura: kaynağın KENDİ zırhının pct'si, kendine ve artı şeklindeki komşu dostlara; bir birim en fazla maxStacks kaynaktan (en büyükler) alır.
   */
  effectiveStats(c: Combatant, extraCrit = 0): Combatant['stats'] {
    // Boss bağı (Anchored): canlı her yardımcı (Iron Mooring) zırh + büyü zırhı ekler
    const anchor = c.boss?.anchor;
    const anchors = anchor ? this.anchorsOf(c).length : 0;
    // Mob pasifleri: Stone Patience (birikmiş zırh) ve Deep Hoard (mevcut MP'nin oranı kadar zırh + büyü zırhı); yoksa 0
    const pe = c.passive?.effect;
    const hoard = pe?.type === 'deepHoard' && c.hp > 0 ? Math.round(c.mp * pe.mpRatio) : 0;
    // Faz 5a: ağaç zırh ekleri (aura büyü zırhı, guard zırhı); ağaçsızda hesaplanmaz (0)
    const tb = this.treeArmorOn ? this.treeArmorBonus(c) : null;
    const bonus = this.auraArmor(c) + anchors * (anchor?.armorAdd ?? 0) + (c.patience ?? 0) + hoard + (tb?.armor ?? 0);
    const magicBonus = anchors * (anchor?.magicArmorAdd ?? 0) + hoard + (tb?.magic ?? 0);
    let acc = 0;
    // Faz 2c (Sunder): durumun zırh çarpanı (statuses.json armorMult + ağaç statusPotency); yoksa 1
    let armorMult = 1;
    // Hide in the Brush (YM17, mob pasifi): şeridinde önünde canlı dost varken kaçınma eki; yoksa 0
    let eva = pe?.type === 'hideInBrush' && c.hp > 0 && this.coveredInLane(c) ? pe.evasion : 0;
    // extraCrit: vuruşun kendi kritik eki (skill hasarının critBonus'u, Jinx); durum ekleriyle birlikte toplanıp [0, 1]'e kırpılır
    let crit = extraCrit;
    const noMisfortune = this.ignoresMisfortune(c); // boss: Omen'in kritik düşüşü işlemez (madde 272)
    for (const s of c.statuses) {
      const d = this.statusDef(s.kind);
      acc += (d?.accuracyDelta ?? 0) + (s.potency?.accuracyDelta ?? 0);
      eva += (d?.evasionDelta ?? 0) + (s.potency?.evasionDelta ?? 0);
      // Kritik eki (Jinxed: kritik yok) ve yığın başına kritik eki (Omen Misfortune); sonuç [0, 1]. Ağaç statusPotency düz ek
      crit += (d?.critDelta ?? 0) + (s.potency?.critDelta ?? 0) + (noMisfortune ? 0 : (d?.critDeltaPerStack ?? 0) * (s.stacks ?? 0));
      if (d?.armorMult !== undefined || s.potency?.armorMult !== undefined) armorMult *= Math.max(0, (d?.armorMult ?? 1) + (s.potency?.armorMult ?? 0));
    }
    if (bonus <= 0 && magicBonus <= 0 && acc === 0 && eva === 0 && crit === 0 && armorMult === 1) return c.stats;
    return {
      ...c.stats,
      armor: armorMult === 1 ? c.stats.armor + bonus : Math.round((c.stats.armor + bonus) * armorMult * 10000) / 10000,
      magicArmor: c.stats.magicArmor + magicBonus,
      accuracy: Math.max(0, Math.round((c.stats.accuracy + acc) * 10000) / 10000),
      evasion: Math.max(0, Math.round((c.stats.evasion + eva) * 10000) / 10000),
      critChance: Math.min(1, Math.max(0, Math.round((c.stats.critChance + crit) * 10000) / 10000)),
    };
  }

  /** Zırh aurasının kapsaması: artı şekli (sahip + 4 yön komşusu); Faz 5a `square` (Diagonal Guard): 3x3 kare. */
  private auraReaches(a: Combatant, c: Combatant): boolean {
    const dr = Math.abs(this.rowOf(a.slot) - this.rowOf(c.slot));
    const dl = Math.abs(this.laneOf(a.slot) - this.laneOf(c.slot));
    const e = a.passive?.effect;
    return e?.type === 'armorAura' && e.square ? dr <= 1 && dl <= 1 : dr + dl <= 1;
  }

  /** Faz 5a (Drilled Ranks, aura magicPct; Interlocked, guard armorPct): ağaç kaynaklı zırh / büyü zırhı ekleri. Kaynak yoksa 0 (ağaçsızda hiç çağrılmaz). */
  private treeArmorBonus(c: Combatant): { armor: number; magic: number } {
    let armor = 0;
    const gains: number[] = [];
    let maxStacks = 1;
    for (const a of this.combatants) {
      const e = a.passive?.effect;
      if (e?.type !== 'armorAura' || !e.magicPct || a === c || a.hp <= 0 || a.side !== c.side || a.board !== c.board || !this.auraReaches(a, c)) continue;
      gains.push(a.stats.armor * e.magicPct);
      maxStacks = Math.max(maxStacks, e.maxStacks);
    }
    gains.sort((x, y) => y - x);
    const magic = gains.slice(0, maxStacks).reduce((t, g) => t + g, 0);
    for (const s of c.statuses) {
      if (s.kind !== 'guard' || !s.armorPct) continue;
      const g = this.get(s.source);
      if (g && g.hp > 0) armor += g.stats.armor * s.armorPct;
    }
    return { armor: Math.round(armor * 10000) / 10000, magic: Math.round(magic * 10000) / 10000 };
  }

  /** Birimin aldığı toplam aura zırhı (pasif armorAura kaynaklarından). */
  auraArmor(c: Combatant): number {
    const gains: number[] = [];
    let maxStacks = 1;
    for (const a of this.combatants) {
      const e = a.passive?.effect;
      if (e?.type !== 'armorAura' || a.hp <= 0 || a.side !== c.side || a.board !== c.board) continue;
      if (!this.auraReaches(a, c)) continue;
      // Faz 2c: sahibin kendine payı (selfPct; yoksa pct) + aura kancaları (auraPct; ağaçsızda 0)
      const pct = (a === c ? (e.selfPct ?? e.pct) : e.pct) + (a.treeHooks ? this.auraHookPct(a, c) : 0);
      gains.push(a.stats.armor * Math.max(0, pct));
      maxStacks = Math.max(maxStacks, e.maxStacks);
    }
    gains.sort((x, y) => y - x);
    return gains.slice(0, maxStacks).reduce((t, g) => t + g, 0);
  }

  // --- Boss: fazlar, bağlı yardımcılar, Stagger, telgraflar (The Bridge Warden; docs/design/bosses/bridge-warden.md) ---

  /** Bir tarafın SAVAŞAN canlı birimleri (sıra almayan yardımcı nesneler hariç): savaşın bitişi bunlarla belirlenir. */
  fighting(side: Side): Combatant[] {
    return this.living(side).filter((c) => !c.inert);
  }

  /** Birimin boss fazı (fazsız birimde 1). */
  phaseOf(c: Combatant | string): number {
    const u = typeof c === 'string' ? this.get(c) : c;
    return u?.phase ?? 1;
  }

  /** Skill'in bu kullanıcı için geçerli alanı: faza göre alan (areaByPhase; fazına eşit/küçük en büyük anahtar), yoksa skill.area. */
  areaOf(skillId: string, actorUid?: string): AreaDef | undefined {
    const skill = this.skill(skillId, actorUid);
    if (!skill) return undefined;
    const byPhase = skill.areaByPhase;
    if (!byPhase || !actorUid) return skill.area;
    const phase = this.phaseOf(actorUid);
    let best: AreaDef | undefined;
    let bestKey = -Infinity;
    for (const [k, a] of Object.entries(byPhase)) {
      const n = Number(k);
      if (n <= phase && n > bestKey) {
        best = a;
        bestKey = n;
      }
    }
    return best ?? skill.area;
  }

  /** Boss'un canlı bağlı yardımcıları (boss.anchor.unit id'li, aynı taraftaki canlı birimler; slot sırasıyla). */
  anchorsOf(owner: Combatant): Combatant[] {
    const id = owner.boss?.anchor?.unit;
    if (!id) return [];
    return this.combatants.filter((c) => c.uid !== owner.uid && c.side === owner.side && c.defId === id && c.hp > 0).sort((a, b) => a.slot - b.slot);
  }

  /** Anchored rozeti: yığın = canlı yardımcı sayısı (0'da kalkar). Kural (zırh eki) effectiveStats'ta; bu yalnızca bilgi. */
  private refreshAnchored(owner: Combatant, emit?: Emit): void {
    if (!owner.boss?.anchor || !this.statusDef('anchored')) return;
    const n = owner.hp > 0 ? this.anchorsOf(owner).length : 0;
    const st = owner.statuses.find((s) => s.kind === 'anchored');
    if (n <= 0) {
      if (st) {
        owner.statuses = owner.statuses.filter((s) => s !== st);
        emit?.({ type: 'statusEnd', target: owner.uid, status: 'anchored' });
      }
      return;
    }
    if (st) st.stacks = n;
    else owner.statuses.push({ kind: 'anchored', turns: 1, source: owner.uid, stacks: n });
    emit?.({ type: 'status', target: owner.uid, status: 'anchored', turns: 1, source: owner.uid, stacks: n });
  }

  /** Stagger: birim sıradaki tek eylemini kaybeder (yalnızca turns modunda; üst üste binmez). */
  private applyStagger(c: Combatant, source: Combatant, emit: Emit): void {
    if (this.mode !== 'turns' || c.hp <= 0 || c.statuses.some((s) => s.kind === 'staggered')) return;
    c.statuses.push({ kind: 'staggered', turns: 1, source: source.uid });
    emit({ type: 'status', target: c.uid, status: 'staggered', turns: 1, source: source.uid });
  }

  /** Eylem anında (tur başı ya da ek eylem başı) Stagger varsa bu eylem yanar: olay 'staggered', sonra ek eylem varsa sürer, yoksa tur biter. */
  private tryStagger(actor: Combatant, emit: Emit): boolean {
    if (this.mode !== 'turns' || this.winner || actor.hp <= 0) return false;
    const st = actor.statuses.find((s) => s.kind === 'staggered');
    if (!st) return false;
    actor.statuses = actor.statuses.filter((s) => s !== st);
    emit({ type: 'statusEnd', target: actor.uid, status: 'staggered', consumed: true });
    emit({ type: 'staggered', actor: actor.uid });
    this.noteAction(actor.uid, 'skill'); // eylem harcandı sayılır: ek eylemi varsa sürer
    this.finishAction(actor, emit);
    return true;
  }

  /** Fazın can eşiği (yuvarlanmış can değeri): faz i+2'ye `hp <= phaseHp(i)` iken girilir. */
  private phaseHp(c: Combatant, i: number): number {
    return Math.round(c.maxHp * (c.boss?.phases?.[i]?.at ?? 0));
  }

  /**
   * Faz kilidi: bu eylemde boss'un canı en fazla bu değere iner (tek eylem tek eşik; son faza bu eylemde girildiyse ölemez). Fazsız birimde 0.
   */
  private phaseFloor(c: Combatant): number {
    const ph = c.boss?.phases;
    if (!ph?.length) return 0;
    const k = (c.phase ?? 1) - 1; // geçilmiş eşik sayısı
    if (this.phaseCrossed.has(c.uid)) return k < ph.length ? this.phaseHp(c, k) + 1 : 1;
    return k + 1 < ph.length ? this.phaseHp(c, k + 1) + 1 : k < ph.length ? 1 : 0;
  }

  /** Hasar sonrası: eşik geçildiyse yeni faza girilir (bu eylemde en fazla bir kez). */
  private checkPhase(c: Combatant, emit: Emit): void {
    const ph = c.boss?.phases;
    if (!ph?.length || c.hp <= 0 || this.phaseCrossed.has(c.uid)) return;
    const k = (c.phase ?? 1) - 1;
    if (k < ph.length && c.hp <= this.phaseHp(c, k)) this.enterPhase(c, k + 2, emit);
  }

  /** Faza giriş: eylem sayısı, güç, zırh; olay 'phase'; yardımcılar kopar; girişte telgraf (Fall). */
  private enterPhase(c: Combatant, phase: number, emit: Emit): void {
    const def = c.boss?.phases?.[phase - 2];
    if (!def) return;
    c.phase = phase;
    this.phaseCrossed.add(c.uid);
    if (def.actionsPerTurn !== undefined) c.actionsPerTurn = Math.max(1, Math.floor(def.actionsPerTurn));
    if (def.powerMult !== undefined || def.armorMult !== undefined) {
      c.stats = {
        ...c.stats,
        spellPowerMult: (c.stats.spellPowerMult ?? 1) * (def.powerMult ?? 1),
        // 0,1'e yuvarlanır
        armor: Math.round(c.stats.armor * (def.armorMult ?? 1) * 10) / 10,
        magicArmor: Math.round(c.stats.magicArmor * (def.armorMult ?? 1) * 10) / 10,
      };
    }
    emit({ type: 'phase', actor: c.uid, phase, hp: c.hp, maxHp: c.maxHp, banner: def.banner });
    if (def.breakAnchors) {
      this.snappingAnchors = true;
      try {
        for (const a of this.anchorsOf(c)) {
          a.hp = 0;
          this.announceIfDead(a, emit);
        }
      } finally {
        this.snappingAnchors = false;
      }
    }
    if (def.telegraphOnEnter) {
      const sk = this.skill(def.telegraphOnEnter, c);
      if (sk?.telegraph) {
        // Aynı anda tek alan telgrafı: bekleyen alan telgrafının yerini girişteki telgraf alır
        for (const t of this.telegraphs.filter((x) => x.source === c.uid && x.kind === 'area')) this.cancelTelegraph(t, 'phase', emit);
        const foes = this.livingByDepth(opposite(c.side)).filter((u) => !u.inert && u.board === opposite(c.side));
        this.createTelegraph(c, sk, foes, undefined, emit, false);
        if (this.mode === 'turns' && !this.noCooldowns && (sk.cooldown ?? 0) > 0) c.cooldowns[sk.id] = sk.cooldown!;
      }
    }
  }

  /** Bir birim öldü: boss bağları (yardımcı kırıldı / boss öldü) ve telgraf iptalleri. announceIfDead çağırır. */
  private bossDeathRules(c: Combatant, emit: Emit): void {
    // Damgalı ya da kaynağı ölen telgraflar iptal
    for (const t of [...this.telegraphs]) {
      if (t.source === c.uid) this.cancelTelegraph(t, 'source_dead', emit);
      else if (t.bound === c.uid) this.cancelTelegraph(t, 'bound_dead', emit);
    }
    // Yardımcı kırıldı: boss Stagger + bekleyen telgraf iptali (faz kopuşunda yok)
    for (const owner of this.combatants) {
      const anchor = owner.boss?.anchor;
      if (!anchor || owner.hp <= 0 || owner.side !== c.side || anchor.unit !== c.defId || owner.uid === c.uid) continue;
      const snap = this.snappingAnchors;
      emit({ type: 'anchorBroken', anchor: c.uid, owner: owner.uid, stagger: !snap && anchor.stagger, left: this.anchorsOf(owner).length });
      if (!snap) {
        if (anchor.stagger) this.applyStagger(owner, c, emit);
        for (const t of this.telegraphs.filter((x) => x.source === owner.uid && anchor.cancel.includes(x.skill))) this.cancelTelegraph(t, 'anchor', emit);
      }
      this.refreshAnchored(owner, emit);
    }
    // Boss öldü: yardımcıları da çöker
    if (c.boss?.anchor) {
      this.snappingAnchors = true;
      try {
        for (const a of this.anchorsOf(c)) {
          a.hp = 0;
          this.announceIfDead(a, emit);
        }
      } finally {
        this.snappingAnchors = false;
      }
    }
  }

  /** Tahtanın tüm hücreleri (yuva sırasıyla). */
  private allCells(): number[] {
    const { rows, lanes } = this.setup.formulas.formation;
    return Array.from({ length: rows * lanes }, (_, i) => i);
  }

  /** Keystone'lar (güvenli hücreler): şerit başına `perLane`, sıraları seed'li; tek hücreliyse hepsi aynı sırada olmaz. */
  private rollKeystones(perLane: number): number[] {
    const { rows, lanes } = this.setup.formulas.formation;
    const out: number[] = [];
    const firstRows: number[] = [];
    for (let lane = 0; lane < lanes; lane++) {
      const pool = Array.from({ length: rows }, (_, r) => r);
      for (let k = 0; k < Math.min(perLane, rows); k++) {
        const r = pool.splice(this.rng.int(0, pool.length - 1), 1)[0]!;
        if (k === 0) firstRows.push(r);
        out.push(r * lanes + lane);
      }
    }
    // Hepsi aynı sıradaysa (tek Keystone/şerit) son şeridinki başka sıraya kayar
    if (perLane === 1 && lanes > 1 && rows > 1 && firstRows.every((r) => r === firstRows[0])) {
      const r = (firstRows[0]! + 1 + this.rng.int(0, rows - 2)) % rows;
      out[out.length - 1] = r * lanes + (lanes - 1);
    }
    return out.sort((a, b) => a - b);
  }

  /** Damganın (brand) çözülme hücreleri: damgalının O ANKİ hücresi merkezli şekil (kendi tahtasında). */
  brandCells(skillId: string, bound: Combatant): number[] {
    const area = this.skill(skillId)?.telegraph?.area ?? { shape: 'plus' as const };
    return shapeCells(area, bound.slot, bound.board, this.setup.formulas.formation);
  }

  /** Telgrafın ŞU ANKİ işaretli hücreleri (brand: damgalının anlık hücresi), güvenli hücreler hariç. */
  telegraphCells(t: Telegraph): number[] {
    let cells = t.cells;
    if (t.kind === 'brand') {
      const b = t.bound ? this.get(t.bound) : undefined;
      cells = b && b.hp > 0 ? this.brandCells(t.skill, b) : [];
    }
    return cells.filter((s) => !t.safeCells?.includes(s));
  }

  /** Telgrafı kurar (skill'in etkileri UYGULANMAZ): hücreler kaydedilir, olay 'telegraph'. `countTurn`: bir-turda-bir sınırına sayılır mı. */
  private createTelegraph(actor: Combatant, skill: SkillDef, targets: Combatant[], cells: number[] | undefined, emit: Emit, countTurn = true): Telegraph | null {
    const tg = skill.telegraph;
    if (!tg) return null;
    const board = opposite(actor.side);
    const t: Telegraph = { id: `t${this.telegraphCount++}`, source: actor.uid, skill: skill.id, kind: tg.kind, board, cells: [], marked: [], waitFor: [], createdAt: this.turnsTaken };
    if (tg.kind === 'brand') {
      const bound = targets[0];
      if (!bound || bound.hp <= 0) return null;
      t.bound = bound.uid;
      t.board = bound.board;
      if (tg.status) this.addStatus(bound, { kind: tg.status, turns: 1, source: actor.uid }, emit);
      t.cells = this.brandCells(skill.id, bound);
    } else if (tg.wholeBoard) {
      t.cells = this.allCells();
      if (tg.keystones) t.safeCells = this.rollKeystones(tg.keystones.perLane);
    } else {
      t.cells = [...(cells ?? [])];
    }
    // Adalet kuralı (M3): şu an karşı tarafta canlı, sersem olmayan her savaşan birim en az bir kez oynamadan çözülmez
    t.waitFor = this.fighting(opposite(actor.side))
      .filter((c) => !c.statuses.some((s) => this.statusDef(s.kind)?.skipTurn))
      .map((c) => c.uid);
    if (t.kind === 'area') t.marked = this.combatants.filter((c) => c.hp > 0 && c.board === t.board && c.side === t.board && t.cells.includes(c.slot) && !t.safeCells?.includes(c.slot)).map((c) => c.uid);
    this.telegraphs.push(t);
    if (countTurn) this.telegraphedThisTurn.add(actor.uid);
    emit({ type: 'telegraph', id: t.id, source: t.source, skill: t.skill, kind: t.kind, board: t.board, cells: [...t.cells], ...(t.safeCells ? { safeCells: [...t.safeCells] } : {}), ...(t.bound ? { bound: t.bound } : {}) });
    return t;
  }

  /** Telgrafı iptal eder (olay telegraphCancel); damga durumunu siler. */
  private cancelTelegraph(t: Telegraph, cause: string, emit: Emit): void {
    const i = this.telegraphs.indexOf(t);
    if (i < 0) return;
    this.telegraphs.splice(i, 1);
    this.clearBrand(t, emit);
    emit({ type: 'telegraphCancel', id: t.id, source: t.source, skill: t.skill, cause });
  }

  private clearBrand(t: Telegraph, emit: Emit): void {
    const kind = this.skill(t.skill, t.source)?.telegraph?.status;
    const b = t.bound ? this.get(t.bound) : undefined;
    if (!b || !kind) return;
    const st = b.statuses.find((s) => s.kind === kind && s.source === t.source);
    if (!st) return;
    b.statuses = b.statuses.filter((s) => s !== st);
    emit({ type: 'statusEnd', target: b.uid, status: kind, consumed: true });
  }

  /**
   * Kaynağın telgraflarını çözer: turns modunda kaynağın tur başında (adalet kuralı sağlanmadıysa ertelenir: telegraphDelay), test modunda kaynağın
   * bir sonraki eyleminden önce (adalet kuralı yok).
   */
  private resolveTelegraphsOf(actor: Combatant, emit: Emit): void {
    for (const t of [...this.telegraphs]) {
      if (t.source !== actor.uid || actor.hp <= 0 || this.winner) continue;
      if (this.mode === 'test') {
        if (t.createdAt >= this.turnsTaken) continue;
      } else {
        t.waitFor = t.waitFor.filter((uid) => (this.get(uid)?.hp ?? 0) > 0);
        if (t.waitFor.length > 0) {
          emit({ type: 'telegraphDelay', id: t.id, source: t.source, skill: t.skill, waiting: [...t.waitFor] });
          continue;
        }
      }
      this.resolveTelegraph(t, actor, emit);
    }
  }

  /** Telgrafın çözülmesi: işaretli hücrelerdeki (güvenli hariç) karşı taraf birimlerine skill'in etkileri; isabet zarı YOK (kaçmak için uyarıldılar). */
  private resolveTelegraph(t: Telegraph, src: Combatant, emit: Emit): void {
    const skill = this.skill(t.skill, src);
    const tg = skill?.telegraph;
    this.telegraphs.splice(this.telegraphs.indexOf(t), 1);
    if (!skill || !tg) return;
    if (tg.kind === 'brand') {
      const b = t.bound ? this.get(t.bound) : undefined;
      if (!b || b.hp <= 0 || (tg.status && !b.statuses.some((s) => s.kind === tg.status))) {
        emit({ type: 'telegraphCancel', id: t.id, source: t.source, skill: t.skill, cause: !b || b.hp <= 0 ? 'bound_dead' : 'dispel' });
        return;
      }
    }
    const cells = this.telegraphCells(t);
    const marked = t.marked.filter((u) => (this.get(u)?.hp ?? 0) > 0);
    const victims = this.combatants.filter((c) => c.hp > 0 && c.board === t.board && c.side !== src.side && cells.includes(c.slot)).sort((a, b) => a.slot - b.slot);
    this.clearBrand(t, emit);
    emit({ type: 'telegraphResolve', id: t.id, source: src.uid, skill: t.skill, board: t.board, cells: [...cells], hit: victims.map((v) => v.uid), avoided: tg.kind === 'brand' ? [] : marked.filter((u) => !victims.some((v) => v.uid === u)) });
    for (const effect of skill.effects) {
      if (effect.type === 'damage') {
        // Unblockable (src/engine/unblockable.ts): telgraf çözülmesi zarsızdır ve bloklanamaz; bayrak açıkça verilir (strike'ta castingSkill yok)
        const hit = isUnblockableHit(skill, effect) ? { ...effect, unblockable: true } : effect;
        victims.forEach((v, i) => {
          if (v.hp > 0) this.strike(src, v, hit, emit, 1, i === 0, true);
        });
      } else if (effect.type === 'ground') {
        this.placeGround(src, effect, t.board, cells, emit);
      } else if (effect.type === 'status') {
        for (const v of victims) if (v.hp > 0) this.addStatus(v, { kind: effect.status, turns: effect.turns, source: src.uid }, emit, effect.cause);
      }
    }
    const after = src.boss?.afterResolve;
    if (after && src.hp > 0 && after.skills.includes(t.skill)) this.addStatus(src, { kind: after.status, turns: after.turns, source: src.uid }, emit);
  }

  /** Hücrelere yer etkisi bırakır (skill vuruşu ve telgraf çözülmesi ortak). */
  private placeGround(actor: Combatant, effect: Extract<SkillEffect, { type: 'ground' }>, board: Side, slots: number[], emit: Emit): void {
    if (slots.length === 0) return;
    const g: GroundEffect = {
      id: `g${this.groundCount++}`,
      ground: effect.ground,
      board,
      slots: [...slots],
      turns: effect.turns,
      source: actor.uid,
      sourceSide: actor.side,
      amount: Math.round(attributePower(actor.stats, effect.scale, this.setup.formulas) * effect.power),
      scale: effect.scale,
      sourceStat: actor.stats[effect.scale],
      power: effect.power,
    };
    this.ground.push(g);
    emit({ type: 'ground', id: g.id, ground: g.ground, board: g.board, slots: g.slots, turns: g.turns });
  }

  /**
   * Bekleyen telgrafların birime TEHDİDİ (önizleme, YZ): birim `slot`'ta (varsayılan: şu anki hücresi) dursa hangi telgraflar onu vurur ve beklenen
   * hasar (ortalama, kalkan dahil değil). Brand: damgalı hep vurulur (hücresi taşınır), komşu ise damgalının hücresine göre. Saf.
   */
  telegraphThreat(uid: string, slot?: number): Array<{ telegraph: Telegraph; avg: number; min: number; max: number }> {
    const c = this.get(uid);
    if (!c || c.hp <= 0) return [];
    const at = slot ?? c.slot;
    const out: Array<{ telegraph: Telegraph; avg: number; min: number; max: number }> = [];
    for (const t of this.telegraphs) {
      const src = this.get(t.source);
      if (!src || src.side === c.side || t.board !== c.board) continue;
      let hits: boolean;
      if (t.kind === 'brand') {
        const b = t.bound ? this.get(t.bound) : undefined;
        if (!b || b.hp <= 0) continue;
        const center = b.uid === c.uid ? at : b.slot;
        const area = this.skill(t.skill, src)?.telegraph?.area ?? { shape: 'plus' as const };
        hits = b.uid === c.uid || shapeCells(area, center, b.board, this.setup.formulas.formation).includes(at);
      } else hits = t.cells.includes(at) && !t.safeCells?.includes(at);
      if (!hits) continue;
      out.push({ telegraph: t, ...this.telegraphDamage(t, c) });
    }
    return out;
  }

  /** Telgraf çözülürse birime vereceği hasar aralığı (kritik hariç, kalkan düşülmemiş; isabet zarı yok). Kaynak ölmüşse 0. Saf. */
  telegraphDamage(t: Telegraph, c: Combatant): { avg: number; min: number; max: number } {
    const src = this.get(t.source);
    let avg = 0;
    let min = 0;
    let max = 0;
    if (!src || src.hp <= 0) return { avg, min, max };
    const tsk = this.skill(t.skill, src);
    for (const e of tsk?.effects ?? []) {
      if (e.type !== 'damage') continue;
      const r = damageRange(this.attackStats(src), this.effectiveStats(c), damageSpecFor(src, c, e, this.setup.formulas, 1, true, this.damageTakenMult(c, src, e.damageType, tsk), this.dealtDamageMult(src, c, tsk, e), e.bonusScale ? this.effectiveStats(src) : undefined), this.setup.formulas);
      avg += r.avg;
      min += r.min;
      max += r.max;
    }
    return { avg, min, max };
  }

  /**
   * Kontrol bağışıklığı (madde 271): birim formulas.json > ccImmunity.tiers rütbesinde mi (boss; data/bosses boss tanımlı birim de)? Elitler değil. Saf.
   */
  ccImmune(c: Pick<Combatant, 'tier' | 'boss'>): boolean {
    const imm = this.setup.formulas.ccImmunity;
    if (!imm) return false;
    return (c.tier !== undefined && imm.tiers.includes(c.tier)) || c.boss !== undefined;
  }

  /** Bu durum bu birime işlemez mi (CC durumu + bağışık birim)? Önizleme ve YZ de bunu okur. Saf. */
  statusBlocked(c: Pick<Combatant, 'tier' | 'boss'>, kind: string): boolean {
    const d = this.statusDef(kind);
    if (!d) return false;
    // Faz 5a: ağaç kuralı immune (önizleme / YZ de görür); kancasız birimde okunmaz
    const full = c as Partial<Combatant>;
    if (full.treeHooks && full.uid && this.rulesOf(full as Combatant, 'immune').some((h) => h.statuses?.includes(kind))) return true;
    // Madde 272: isabet/kritik düşüren debuff'lar (Blinded, Jinxed) da (ccImmunity.accuracyCrit)
    const blockable = !!d.cc || (!!this.setup.formulas.ccImmunity?.accuracyCrit && isAccuracyCritDebuff(d));
    return blockable && this.ccImmune(c);
  }

  /** Madde 272: bu birimde Omen'in yığın başına kritik düşüşü (Misfortune, critDeltaPerStack) yok sayılır mı (boss, ccImmunity.omenCrit)? Saf. */
  ignoresMisfortune(c: Pick<Combatant, 'tier' | 'boss'>): boolean {
    return !!this.setup.formulas.ccImmunity?.omenCrit && this.ccImmune(c);
  }

  /** Birim taunt'a uymaz mı (boss: tek hedefli skill'leri taunt'lı düşmana zorlanmaz; madde 271)? Saf. */
  ignoresTaunt(c: Pick<Combatant, 'tier' | 'boss'>): boolean {
    return !!this.setup.formulas.ccImmunity?.taunt && this.ccImmune(c);
  }

  /** Thrifty: bu birimin sıradaki skill'i MP bedelsiz mi (item etkisi firstSkillFree, ilk skill henüz kullanılmadı)? Saf. */
  thriftyFree(actor: Combatant, resource: string): boolean {
    return resource === 'mp' && effFlag(actor, 'firstSkillFree') && !actor.freeSkillUsed;
  }

  /** Staff of the Last Ember: bu birimin sıradaki bu skill'i N. büyü olarak bedelsiz mi (MP bedelli skill, sayaç+1 N'nin katı)? Saf. */
  nthSpellFree(actor: Combatant, skill: SkillDef): boolean {
    const ne = effFirst(actor, 'nthSpellFree'); // sayaçlı: tek kaynak (item önce)
    return !!ne && ne.every > 0 && skill.cost.resource === 'mp' && skillCostAmount(skill.cost, actor) > 0 && ((actor.spellCount ?? 0) + 1) % ne.every === 0;
  }

  /** Ekranda yan komşu mu (formation.sideNeighbors; harita yoksa aynı sıra, şerit farkı 1)? Saf. */
  private sideAdjacent(a: Combatant, b: Combatant): boolean {
    if (a.board !== b.board || a.uid === b.uid) return false;
    const map = this.setup.formulas.formation.sideNeighbors?.[b.board]?.[b.slot];
    const alive = this.living(b.side).filter((c) => c.uid !== b.uid && c.board === b.board);
    const near = map ? pickSideNeighbors(map, (slot) => alive.some((c) => c.slot === slot)) : alive.filter((c) => this.rowOf(c.slot) === this.rowOf(b.slot) && Math.abs(this.laneOf(c.slot) - this.laneOf(b.slot)) === 1).map((c) => c.slot);
    return near.includes(a.slot);
  }

  /** Mantle of Valdren (shieldRefresh): can eşiğin altına inince bir kez kalkan. */
  private checkShieldRefresh(target: Combatant, emit: Emit): void {
    // Kaynak başına ayrı (item / ağaç kanalı; tree-hooks.ts): her kaynağın kendi "bir kez" bayrağı
    for (const { v: sr, src } of effList(target, 'shieldRefresh')) {
      if (onceUsed(target, src, 'shieldRefresh') || target.hp <= 0 || target.hp >= sr.below * target.maxHp) continue;
      markOnce(target, src, 'shieldRefresh');
      const add = Math.max(1, Math.round(target.maxHp * sr.ratio));
      target.shield += add;
      emit({ type: 'passive', actor: target.uid, passive: 'valdren_mantle', name: 'Mantle of Valdren' });
      emit({ type: 'shield', source: target.uid, target: target.uid, amount: add, shieldAfter: target.shield, magicShieldAfter: target.magicShield, magic: false });
      if (src === 'tree') this.fxProc(target, 'shieldRefresh');
    }
  }

  /** Second Wind (item etkisi secondWind): savaşta bir kez, can eşiğin altına inince şifa. */
  private checkSecondWind(target: Combatant, emit: Emit): void {
    for (const { v: sw, src } of effList(target, 'secondWind')) {
      if (onceUsed(target, src, 'secondWind') || target.hp <= 0 || target.hp >= sw.below * target.maxHp) continue;
      markOnce(target, src, 'secondWind');
      emit({ type: 'passive', actor: target.uid, passive: 'second_wind', name: 'Second Wind' });
      this.applyHeal(target, target, Math.max(1, Math.round(target.maxHp * sw.heal)), false, emit);
      if (src === 'tree') this.fxProc(target, 'secondWind');
    }
  }

  /** Birim çekilemez/itilemez mi (boss bağışıklığı ya da Unyielding)? Saf. */
  immuneToDisplacement(c: Combatant): boolean {
    // Faz 5a (Unyielding): ağaç kuralı immune pull
    return !!c.boss?.unyielding?.immuneDisplacement || (!!this.setup.formulas.ccImmunity?.displacement && this.ccImmune(c)) || effFlag(c, 'steadfast') || (!!c.treeHooks && this.rulesOf(c, 'immune').some((h) => h.pull));
  }

  /**
   * advanceToFront (Warrior Charge; madde 271): skill sonrası kullanıcının geçeceği ön sıra hücresi; zaten ön sıradaysa, kendi tahtasında değilse ya da ön
   * sırada boş hücre yoksa null. Öncelik: kendi şeridinin ön hücresi; doluysa ön sıradaki en yakın boş hücre (şerit farkı en az, eşitlikte küçük şerit).
   * Boş = üstünde canlı birim yok (ceset hücresi boş sayılır, Move kuralı). `slot`: varsayımsal başlangıç hücresi (YZ). Saf.
   */
  advanceDestination(c: Combatant, slot = c.slot): number | null {
    if (c.hp <= 0 || c.inert || c.board !== c.side || this.rowOf(slot) === 0) return null;
    const lanes = this.setup.formulas.formation.lanes;
    const lane = this.laneOf(slot);
    const free = (s: number) => !this.combatants.some((o) => o.hp > 0 && o.uid !== c.uid && o.board === c.board && o.slot === s);
    const order = Array.from({ length: lanes }, (_, l) => l).sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane) || a - b);
    for (const l of order) if (free(l)) return l;
    return null;
  }

  /** Çekme (pull laneFront) hedefi bu birimi nereye götürür (kendi şeridinin en öndeki boş hücresi; yoksa null). Saf. */
  pullDestination(c: Combatant): number | null {
    if (c.inert || c.board !== c.side || this.immuneToDisplacement(c)) return null;
    const lanes = this.setup.formulas.formation.lanes;
    for (let row = 0; row < this.rowOf(c.slot); row++) {
      const to = row * lanes + this.laneOf(c.slot);
      if (!this.combatants.some((o) => o.hp > 0 && o.board === c.board && o.slot === to)) return to;
    }
    return null;
  }

  /** Yuvanın sırası (0 = en önde) ve şeridi. */
  rowOf(slot: number): number {
    return Math.floor(slot / this.setup.formulas.formation.lanes);
  }

  laneOf(slot: number): number {
    return slot % this.setup.formulas.formation.lanes;
  }

  /** Şu an sırası gelen aktör (turns modunda). */
  get currentActor(): Combatant | undefined {
    return this.currentUid ? this.get(this.currentUid) : undefined;
  }

  /** Sıra çubuğu: şu anki aktör + sonrakiler (uid listesi). Ölüm/çağrı sonrası yeniden hesaplanır. */
  turnQueue(count = this.setup.formulas.turn.queueLength): string[] {
    if (this.mode !== 'turns') return [];
    return predictQueue(this.turnSlots(), this.setup.formulas.turn.threshold, count, this.currentUid, this.tieFirst);
  }

  /**
   * Sıra çubuğu ÖNİZLEMESİ: şu anki aktör `skillId`'yi kullanırsa sıra nasıl olur (skill'in turnCost'u: yarım turn skill'de aktörün sayacından eşiğin yarısı
   * düşer, sonraki sırası yarı sürede gelir). Global skill / bilinmeyen id / tam turn skill = turnQueue ile aynı. Savaşı değiştirmez.
   */
  turnQueueAfter(skillId: string, count = this.setup.formulas.turn.queueLength): string[] {
    if (this.mode !== 'turns') return [];
    return predictQueue(this.turnSlots(), this.setup.formulas.turn.threshold, count, this.currentUid, this.tieFirst, this.turnCostOf(skillId, this.currentUid ?? undefined));
  }

  /** Skill'in turn bedeli (0 < x <= 1; yoksa 1). Global skill'ler ve bilinmeyen id'ler 1. `actorUid`: kullanıcının (ağaçla yamalı) tanımı. */
  turnCostOf(skillId: string, actorUid?: string): number {
    const c = this.skill(skillId, actorUid)?.turnCost;
    const base = c !== undefined && c > 0 && c <= 1 ? c : 1;
    // Faz 4c (Time Fold): tetik buff'ının tur bedeli (bekleyen sayılmaz; en küçüğü)
    const buffs = actorUid ? this.get(actorUid)?.treeBuffs : undefined;
    if (!buffs?.length) return base;
    let out = base;
    for (const b of buffs) {
      const t = b.mod?.turnCost;
      if (t === undefined || b.pending || (b.skill && b.skill !== skillId) || !(t > 0 && t <= 1)) continue;
      out = Math.min(out, t);
    }
    return out;
  }

  /** Birimin sıra sayacı doluluğu, 0-1 (SPEED çubuğu). Yalnızca turns modunda; test modunda ya da bilinmeyen/ölü birimde null. Salt okunur. */
  turnProgressOf(uid: string): number | null {
    const c = this.get(uid);
    if (this.mode !== 'turns' || !c || c.hp <= 0) return null;
    return turnProgress(c.turnCounter, this.setup.formulas.turn.threshold);
  }

  /** Madde 258: birimin bir sonraki ölümcül vuruşu Lucky Escape ile tamamen yok sayma şansı (Luck primary; savaşta hakkı kullanıldıysa 0). */
  luckyEscapeChance(uid: string): number {
    const c = this.get(uid);
    if (!c || this.luckySaved.has(uid)) return 0;
    return Math.max(0, Math.min(1, c.stats.surviveChance ?? 0));
  }

  /**
   * Skill tanımı. `who` (birim uid'i ya da birimin kendisi) verilirse önce o birimin skill ağacıyla YAMALANMIŞ tanımına bakar
   * (Combatant.skillDefs; docs/design/skill-tree-implementation.md 4.1: skill id aynı, yalnızca sayılar değişir), yoksa ortak tablo.
   * Ağaçsız savaşta (hiçbir birimde skillDefs yok) doğrudan ortak tablo: davranış ve hız eskisiyle aynı.
   * Bekçi test (tests/skill-tree-engine.test.ts): bu dosyada uid'siz `this.skill(` yalnızca izin listesindeki yapısal yüklemlerde kalır.
   */
  skill(skillId: string, who?: string | Combatant): SkillDef | undefined {
    const m = this.modeCast ?? this.viewMode;
    if (m && who !== undefined && m.skillId === skillId && (typeof who === 'string' ? who : who.uid) === m.uid) return m.def;
    if (who !== undefined && this.treeUnits) {
      const own = (typeof who === 'string' ? this.get(who) : who)?.skillDefs?.[skillId];
      if (own) return own;
    }
    return this.setup.skills[skillId];
  }

  /**
   * Yan vuruşlu (`splash`) tek hedef skill'inin, seçilen hedefin yanında vuracağı canlı düşmanlar (slot sırasıyla).
   * 'perpendicular': hedefin EKRANDA görünen üst ve alt komşusu (formulas.json > formation.sideNeighbors, layout koordinatlarından
   * üretilir; her yönün en yakın DOLU hücresi, boş/ölü hücre atlanır). Harita yoksa eski kural: aynı sıra, şerit farkı 1.
   * 'row' (yalnızca single_ally; Close Ranks): seçilen dostun SIRASINDAKİ (alan şekli 'row', area-shape.shapeCells) diğer canlı dostlar, KULLANICI hariç.
   */
  splashTargets(skillId: string, chosen: Combatant, actorUid?: string): Combatant[] {
    const skill = this.skill(skillId, actorUid);
    if (skill?.splash?.pattern === 'row' && skill.target === 'single_ally') {
      const cells = shapeCells({ shape: 'row' }, chosen.slot, chosen.board, this.setup.formulas.formation);
      return this.living(chosen.side)
        .filter((c) => c.uid !== chosen.uid && c.uid !== actorUid && c.board === chosen.board && cells.includes(c.slot))
        .sort((a, b) => a.slot - b.slot);
    }
    if (!skill?.splash || skill.target !== 'single_enemy') return [];
    if (skill.splash.pattern === 'chain') return this.chainTargets(chosen, skill.splash.jumps ?? 0);
    // Faz 5a (ağaç; Femur Chain): hedefin hemen ARKASINDAKİ canlı birim (aynı şerit, bir sıra derin; boşsa yok)
    // Faz 8 (Lance of Dawn): hedefin ŞERİDİNDE ondan daha derindeki tüm canlı birimler (önden arkaya)
    if (skill.splash.pattern === 'lane') {
      const lane = this.laneOf(chosen.slot);
      const row = this.rowOf(chosen.slot);
      return this.living(chosen.side)
        .filter((c) => c.uid !== chosen.uid && c.board === chosen.board && !c.inert && this.laneOf(c.slot) === lane && this.rowOf(c.slot) > row)
        .sort((a, b) => this.rowOf(a.slot) - this.rowOf(b.slot));
    }
    if (skill.splash.pattern === 'behind') {
      const b = this.behindSlotOf(chosen);
      const u = b === null ? undefined : this.living(chosen.side).find((c) => c.uid !== chosen.uid && c.board === chosen.board && c.slot === b && !c.inert);
      return u ? [u] : [];
    }
    const map = this.setup.formulas.formation.sideNeighbors?.[chosen.board]?.[chosen.slot];
    if (map) {
      const alive = this.living(chosen.side).filter((c) => c.uid !== chosen.uid && c.board === chosen.board);
      return pickSideNeighbors(map, (slot) => alive.some((c) => c.slot === slot)).map((slot) => alive.find((c) => c.slot === slot)!);
    }
    const row = this.rowOf(chosen.slot);
    const lane = this.laneOf(chosen.slot);
    return this.living(chosen.side)
      .filter((c) => c.uid !== chosen.uid && c.board === chosen.board && this.rowOf(c.slot) === row && Math.abs(this.laneOf(c.slot) - lane) === 1)
      .sort((a, b) => a.slot - b.slot);
  }

  /**
   * Zincir (splash 'chain', Treant Vine Snare; Ömer 2026-10-18): seçilen hedeften başlayarak her adımda SON vurulana en yakın, henüz vurulmamış canlı
   * düşman (aynı tahta); en çok `jumps` sıçrama. Mesafe ekran ızgarasında (formation.screenGrid; area-shape.screenCellOf) Öklid; eşitlikte küçük yuva.
   * Menzile bakmaz (ilk hedefin menzili seçimde denetlenir). Sıra = vuruş sırası (falloff bu sırayla azalır).
   */
  chainTargets(chosen: Combatant, jumps: number): Combatant[] {
    const fm = this.setup.formulas.formation;
    const pool = this.living(chosen.side).filter((c) => c.uid !== chosen.uid && c.board === chosen.board);
    const out: Combatant[] = [];
    let from = chosen;
    for (let j = 0; j < jumps && pool.length > 0; j++) {
      const a = screenCellOf(fm, chosen.board, from.slot);
      const d2 = (c: Combatant) => {
        const b = screenCellOf(fm, chosen.board, c.slot);
        return (a.col - b.col) ** 2 + (a.row - b.row) ** 2;
      };
      pool.sort((x, y) => d2(x) - d2(y) || x.slot - y.slot);
      from = pool.shift()!;
      out.push(from);
    }
    return out;
  }

  /** Skill tek bir hedef seçilmesini gerektiriyor mu? */
  needsTargetChoice(skillId: string, who?: string | Combatant): boolean {
    // Faz 5a: who = kullanan (ağaç hedef türünü değiştirebilir: Thornstorm Lash tek hedef -> rastgele); verilmezse temel tanım
    const t = this.skill(skillId, who)?.target;
    return t === 'single_enemy' || t === 'single_ally' || t === 'dead_ally' || t === 'area_enemies' || t === 'area_any';
  }

  /** Çağrı skill'i mi (yeri oyuncu seçer)? */
  needsSlotChoice(skillId: string): boolean {
    return !!this.skill(skillId)?.effects.some((e) => e.type === 'summon');
  }

  /** Alan skill'i mi (target 'area_enemies' / 'area_any' + area.shape; oyuncu bir anchor hücre seçer, hücre boş olabilir)? */
  isAreaSkill(skillId: string, who?: string | Combatant): boolean {
    return this.isShapeSkill(skillId, who);
  }

  /** Şekil (hücre kümesi) tabanlı alan skill'i mi (area.shape: row | column | rect | plus | x)? Tüm alan skill'leri şekillidir (isAreaSkill ile aynı). */
  isShapeSkill(skillId: string, who?: string | Combatant): boolean {
    const skill = this.skill(skillId, who);
    return (skill?.target === 'area_enemies' || skill?.target === 'area_any') && isShapeArea(skill.area);
  }

  /** İki tahtaya da atılabilen alan skill'i mi (target 'area_any': Smoke Bomb)? Anchor tahtası `board` ile seçilir. */
  isAnyBoardArea(skillId: string, who?: string | Combatant): boolean {
    return this.isShapeSkill(skillId, who) && this.skill(skillId, who)!.target === 'area_any';
  }

  /** Aşamalı (area.stages) alan skill'i mi? */
  isStagedSkill(skillId: string, who?: string | Combatant): boolean {
    return this.isShapeSkill(skillId, who) && !!this.skill(skillId, who)!.area!.stages;
  }

  /** Alan skill'inin bu kullanıcı için geçerli tahtası: area_any'de istenen tahta (yoksa karşı taraf), diğerlerinde hep karşı taraf. */
  private areaBoard(actor: Combatant | undefined, skillId: string, board?: Side): Side {
    const foe: Side = actor ? opposite(actor.side) : 'enemy';
    return board && this.isAnyBoardArea(skillId, actor) ? board : foe;
  }

  /**
   * Alan skill'inin anchor hücreye göre kapsadığı tüm hücreler (boş olanlar dahil; gösterim için), yuva sırasıyla.
   * `board`: hücrelerin ait olduğu tahta (varsayılan 'enemy'; rect'in ekrandaki sol-alt köşesi tahtaya göre ayna).
   */
  areaCells(skillId: string, centerSlot: number, board: Side = 'enemy', actorUid?: string): number[] {
    const skill = this.skill(skillId, actorUid);
    if (!skill || !this.isShapeSkill(skillId, actorUid)) return [];
    // actorUid: faza göre alan (Breaking Span faz 2+: rect 2x3; areaOf)
    return shapeCells(this.areaOf(skillId, actorUid)!, centerSlot, board, this.setup.formulas.formation);
  }

  /** Arayüz: imlecin durduğu hücreden motorun anchor hücresi (area-shape.cursorAnchorSlot; oyuncu tahtasında 2 derinlikli rect'te imleç = sol-alt köşe). */
  cursorAnchor(skillId: string, cursorSlot: number, board: Side, actorUid?: string): number {
    return this.isShapeSkill(skillId, actorUid) ? cursorAnchorSlot(this.areaOf(skillId, actorUid), cursorSlot, board, this.setup.formulas.formation) : cursorSlot;
  }

  /** Alan skill'inin hücreleri aşamalara bölünmüş (aşamasız skill: tek aşama). Her aşama yuva sırasıyla; boş hücreler dahil. */
  areaStageCells(skillId: string, centerSlot: number, board: Side = 'enemy', actorUid?: string): number[][] {
    const skill = this.skill(skillId, actorUid);
    if (!skill || !this.isShapeSkill(skillId, actorUid)) return [];
    return shapeStages(this.areaOf(skillId, actorUid)!, centerSlot, board, this.setup.formulas.formation);
  }

  /**
   * UI/vfx için: aşamalı skill'in anchor'a göre aşamaları (hücreler + vurulacak birimler, aşama sırasıyla). Aşamasız skill'de tek aşama.
   * Cast edilince `skillUsed.stages` ile aynıdır (aşamalı skill'lerde). Savaşı değiştirmez. `board`: yalnızca area_any'de anlamlı.
   */
  areaStages(actorUid: string, skillId: string, anchorSlot: number, board?: Side): AreaStage[] {
    const actor = this.get(actorUid);
    if (!actor) return [];
    const b = this.areaBoard(actor, skillId, board);
    const hits = this.areaWindowAt(actorUid, skillId, anchorSlot, b);
    return this.areaStageCells(skillId, anchorSlot, b, actorUid).map((cells) => ({ cells, targets: hits.filter((c) => cells.includes(c.slot)).map((c) => c.uid) }));
  }

  /**
   * Alan skill'inin anchor hücreye göre vurduğu/etkilediği birimler. Şekil hücre kümesi 'vurulabilir hücreler'i belirler; ölü/boş hücreler boşluktur,
   * yakın dövüşte erişilemeyen (arkadaki) hücreler validTargets ile elenir. Sıra: aşamalı skill'de aşama sırasıyla (aşama içinde derinlik sırası),
   * aşamasızda derinlik sırası (öndeki önce; falloff bu sırayla azalır). `board`: area_any'de anchor tahtası (yoksa karşı taraf); area_any alandaki
   * birimlerden en az bir etkinin uygulandığı (side) canlı birimleri döndürür; area_enemies yalnızca düşmanları.
   */
  areaWindowAt(actorUid: string, skillId: string, centerSlot: number, board?: Side): Combatant[] {
    const skill = this.skill(skillId, actorUid);
    if (!skill || !this.isShapeSkill(skillId, actorUid)) return [];
    const actor = this.get(actorUid);
    const b = this.areaBoard(actor, skillId, board);
    const stages = this.areaStageCells(skillId, centerSlot, b, actorUid);
    const cells = new Set(stages.flat());
    // Menzil açık: menzil yalnızca anchor hücreye bakar (shapeAnchors / cast); alandaki her canlı birim vurulur (kenar menzil dışına taşabilir).
    // Kapalı (eski kural): yakın dövüşte erişilemeyen hücreler validTargets ile elenir.
    const own: Side = actor?.side ?? 'party';
    const pool = !this.rangeOn ? this.validTargets(actorUid, skillId) : skill.target === 'area_any' ? [...this.livingByDepth(opposite(own)), ...this.livingByDepth(own)] : this.livingByDepth(opposite(own));
    let hits = pool.filter((c) => c.board === b && cells.has(c.slot));
    // area_any: hiçbir etkinin uygulanmadığı birimler (ör. yalnızca düşmana giden etki varken dostlar) hedef sayılmaz
    if (actor && skill.target === 'area_any') hits = hits.filter((c) => skill.effects.some((e) => this.effectAppliesTo(skill, e, c, actor)));
    // Faz 5a (Brittle Point): alan, vuruş sırasıyla en çok maxTargets hedefte durur (alan yoksa liste aynı)
    const cap = this.areaOf(skillId, actorUid)?.maxTargets;
    if (stages.length <= 1) return cap ? hits.slice(0, cap) : hits;
    const ordered = stages.flatMap((st) => hits.filter((c) => st.includes(c.slot)));
    return cap ? ordered.slice(0, cap) : ordered;
  }

  /**
   * UI için: bu alan skill'inin SEÇİLEBİLİR anchor hücreleri (tahtada, artan sırada). Boş hücre de anchor olabilir: şekil en az bir
   * vurulabilir (canlı, erişilebilir) birimi kapsıyorsa geçerlidir. Alan skill'i değilse boş liste. `board`: area_any'de hangi tahta (yoksa karşı taraf).
   */
  shapeAnchors(actorUid: string, skillId: string, board?: Side): number[] {
    const actor = this.get(actorUid);
    if (!actor || !this.isAreaSkill(skillId, actor)) return [];
    const b = this.areaBoard(actor, skillId, board);
    const total = this.setup.formulas.formation.rows * this.setup.formulas.formation.lanes;
    const skill = this.skill(skillId, actorUid)!;
    return Array.from({ length: total }, (_, i) => i).filter((i) => this.inRange(actor, skill, b, i) && this.areaWindowAt(actorUid, skillId, i, b).length > 0);
  }

  /** TÜM seçilebilir anchor hücreleri (tahta + yuva): area_enemies'de yalnızca karşı tahta; area_any'de önce karşı, sonra kendi tahtası. */
  shapeAnchorCells(actorUid: string, skillId: string): Array<{ board: Side; slot: number }> {
    const actor = this.get(actorUid);
    if (!actor || !this.isAreaSkill(skillId, actor)) return [];
    const boards: Side[] = this.isAnyBoardArea(skillId, actor) ? [opposite(actor.side), actor.side] : [opposite(actor.side)];
    return boards.flatMap((board) => this.shapeAnchors(actorUid, skillId, board).map((slot) => ({ board, slot })));
  }

  /**
   * UI hover: anchor hücreye atılırsa kapsanan hücreler (tahtaya sığdırılmış), vurulacak birimler (uid, yuva sırasıyla) ve geçerlilik.
   * valid=false ise reason nedeni yazar; cells yine de döner (hücre aralık dışı değilse) ki UI şekli soluk gösterebilsin. Savaşı değiştirmez.
   * `board`: yalnızca area_any'de anlamlı (kendi tahtan ya da karşı tahta; yoksa karşı taraf).
   */
  shapePreviewCells(actorUid: string, skillId: string, anchorSlot: number, board?: Side): { cells: number[]; targets: string[]; valid: boolean; reason?: string } {
    const actor = this.get(actorUid);
    const total = this.setup.formulas.formation.rows * this.setup.formulas.formation.lanes;
    if (!actor || !this.skill(skillId, actor)) return { cells: [], targets: [], valid: false, reason: 'Unknown unit or skill' };
    if (!this.isAreaSkill(skillId, actor)) return { cells: [], targets: [], valid: false, reason: 'Not an area skill' };
    if (!Number.isInteger(anchorSlot) || anchorSlot < 0 || anchorSlot >= total) return { cells: [], targets: [], valid: false, reason: 'Invalid cell' };
    const b = this.areaBoard(actor, skillId, board);
    const cells = this.areaCells(skillId, anchorSlot, b, actorUid);
    const targets = this.areaWindowAt(actorUid, skillId, anchorSlot, b).map((c) => c.uid);
    if (!this.inRange(actor, this.skill(skillId, actor)!, b, anchorSlot)) return { cells, targets, valid: false, reason: 'Out of range' };
    if (targets.length > 0) return { cells, targets, valid: true };
    if (this.isAnyBoardArea(skillId, actor)) return { cells, targets, valid: false, reason: b === actor.side ? 'No ally in the area' : 'No enemy in the area' };
    const inShape = this.livingByDepth(opposite(actor.side)).some((c) => c.board === b && cells.includes(c.slot));
    return { cells, targets, valid: false, reason: inShape ? (this.rangeOn ? 'No target in range' : 'No target in reach') : 'No enemy in the area' };
  }

  /** Anchor olarak seçilen (canlı) birimin hücresine göre areaWindowAt (birim erişim dışında da olabilir: yalnızca hücreyi belirler). area_any'de birimin tahtası. */
  areaWindow(actorUid: string, skillId: string, anchorUid: string): Combatant[] {
    const actor = this.get(actorUid);
    const anchor = this.get(anchorUid);
    if (!actor || !anchor || anchor.hp <= 0) return [];
    if (this.isAnyBoardArea(skillId, actor)) return this.areaWindowAt(actorUid, skillId, anchor.slot, anchor.board);
    if (anchor.board !== opposite(actor.side)) return [];
    return this.areaWindowAt(actorUid, skillId, anchor.slot);
  }

  /** Çağrı skill'inin birimi hangi tahtaya koyacağı: daima kullanıcının KENDİ tahtası (Raise Dead dahil; eski düşman tahtasına çağrı kaldırıldı, madde 222). */
  summonBoard(actorUid: string, _skillId?: string): Side {
    return this.get(actorUid)?.side ?? 'party';
  }

  // --- Cesetler (madde 222) ---

  /** Bir tarafın cesetleri (ölü, çağrı olmayan birimler; revivable ya da consumed), ölüm sırasıyla (ilk ölen önce). UI: ankh (revivable) / kuru kafa (consumed) işaretleri. */
  corpses(side: Side): Corpse[] {
    return this.combatants
      .filter((c) => c.side === side && this.corpseState.has(c.uid) && c.hp <= 0)
      .sort((a, b) => (this.corpseOrder.get(a.uid) ?? 0) - (this.corpseOrder.get(b.uid) ?? 0))
      .map((c) => ({ uid: c.uid, slot: c.slot, side: c.side, state: this.corpseState.get(c.uid)! }));
  }

  /** Birimin cesedi (yoksa null: canlı, çağrı ya da hiç ölmemiş). */
  corpseOf(uid: string): Corpse | null {
    const c = this.get(uid);
    const state = this.corpseState.get(uid);
    return c && state && c.hp <= 0 ? { uid: c.uid, slot: c.slot, side: c.side, state } : null;
  }

  /** Skill ceset tüketen bir çağrı mı (summon etkisi + consumeCorpse: Raise Dead)? */
  consumesCorpse(skillId: string): boolean {
    return !!this.skill(skillId)?.effects.some((e) => e.type === 'summon' && e.consumeCorpse);
  }

  /**
   * Ceset tüketen çağrının (Raise Dead) seçebileceği cesetler (madde 230): kullanıcının KARŞI tarafındaki diriltilebilir (revivable, çağrı olmayan)
   * cesetler, yuva sırasıyla; her biri `danger` (o birim diriltilirse karşı takıma vereceği değer) ve `why` (gerekçe) taşır. Boş = tüketilecek ceset yok
   * (çağrı beslenmemiş gelir). Ceset tüketmeyen skill'de boş. Savaşı değiştirmez (UI seçim + YZ).
   */
  corpseChoices(actorUid: string, skillId: string): CorpseChoice[] {
    const actor = this.get(actorUid);
    if (!actor || !this.consumesCorpse(skillId)) return [];
    return this.corpses(opposite(actor.side))
      .filter((c) => c.state === 'revivable')
      .sort((a, b) => a.slot - b.slot)
      .map((c) => {
        const unit = this.get(c.uid)!;
        const d = this.corpseDanger(unit);
        return { uid: c.uid, slot: c.slot, name: unit.name, danger: d.danger, why: d.why };
      });
  }

  /** Oyuncu ceset seçmek zorunda mı (ceset tüketen çağrı + en az bir tüketilebilir ceset)? */
  needsCorpseChoice(actorUid: string, skillId: string): boolean {
    return this.corpseChoices(actorUid, skillId).length > 0;
  }

  /**
   * Ceset tehlikesi (formulas.json > corpseDanger): (tehdit + en iyi skill değeri) x (maks can / hpRef) x [diriltici: reviverMult]
   * x [kendi tarafında yaşayan bir diriltici onu diriltebiliyor (yuvası boş): revivableMult]. Tehdit = max(str, int, dex) + hız (YZ kill önceliğiyle aynı).
   * Saf ve belirleyici.
   */
  corpseDanger(unit: Combatant): { danger: number; why: string } {
    const cfg = this.setup.formulas.corpseDanger ?? { hpRef: 100, reviverMult: 1.5, revivableMult: 1.5 };
    const f = this.setup.formulas;
    const r1 = (n: number) => Math.round(n * 10) / 10;
    // tehdit ağırlığı veride (corpseDanger.threatMult; yoksa 1)
    const threat = (Math.max(unit.stats.str, unit.stats.int, unit.stats.dex) + unit.stats.spd) * (cfg.threatMult ?? 1);
    let best = 0;
    let bestName = '';
    for (const id of unit.skills) {
      const sk = this.skill(id, unit);
      if (!sk) continue;
      let v = 0;
      for (const e of sk.effects) {
        if (e.type === 'damage' || e.type === 'heal') v += attributePower(unit.stats, e.scale, f) * e.power + (e.type === 'damage' ? bonusScaleRaw(e.bonusScale, unit.stats) * (unit.stats.spellPowerMult ?? 1) : 0);
        else if (e.type === 'hot') v += attributePower(unit.stats, e.scale, f) * e.power * e.turns;
        else if (e.type === 'shield') v += attributePower(unit.stats, e.scale, f) * e.power * 0.5;
      }
      if (v > best) {
        best = v;
        bestName = sk.name;
      }
    }
    const hpFactor = unit.maxHp / Math.max(1, cfg.hpRef);
    let danger = (threat + best) * hpFactor;
    const parts = [`(threat ${r1(threat)} + best skill ${r1(best)}${bestName ? ` ${bestName}` : ''}) x HP ${Math.round(hpFactor * 100) / 100}`];
    const canRevive = (c: Combatant) => c.skills.some((id) => this.skill(id, c)?.effects.some((e) => e.type === 'revive'));
    if (canRevive(unit)) {
      danger *= cfg.reviverMult;
      parts.push(`x reviver ${cfg.reviverMult}`);
    }
    // Madde 257: diriltme cesedin hücresine bağlı değil; tarafında boş bir hücre olması yeter
    const cellFree = this.freeSlots(unit.side).length > 0;
    const reviver = cellFree ? this.livingByDepth(unit.side).find((c) => !c.summoned && c.uid !== unit.uid && canRevive(c)) : undefined;
    if (reviver) {
      danger *= cfg.revivableMult;
      parts.push(`x revivable by ${reviver.name} ${cfg.revivableMult}`);
    }
    return { danger: r1(danger), why: parts.join(' ') };
  }

  /**
   * Yapay zekanın (ve oyuncu seçmeden önceki önizlemenin) tüketeceği ceset: corpseChoices içinde EN TEHLİKELİ olan (eşitlikte küçük yuva).
   * Yoksa null (çağrı beslenmemiş gelir). Savaşı değiştirmez. Eski "en son ölen" kuralı madde 230 ile kalktı.
   */
  corpseToConsume(actorUid: string, skillId?: string): Corpse | null {
    const actor = this.get(actorUid);
    if (!actor) return null;
    const id = skillId ?? actor.skills.find((s) => this.consumesCorpse(s));
    if (!id) return null;
    const best = this.corpseChoices(actorUid, id).reduce<CorpseChoice | null>((top, c) => (!top || c.danger > top.danger ? c : top), null);
    return best ? this.corpseOf(best.uid) : null;
  }

  /**
   * Çağrı skill'inin hangi varyantla çağıracağı (UI tooltip/önizleme ve YZ için; savaşı değiştirmez): ceset tüketen çağrıda
   * { empowered: true/false, corpse } (beslenmiş / beslenmemiş), diğer çağrılarda { empowered: undefined, corpse: null }.
   * `corpseUid`: oyuncunun seçtiği ceset (geçerliyse o; verilmezse/geçersizse YZ önerisi = en tehlikeli). `slot`: seçilen yuva (geçerliyse o; yoksa varsayılan).
   */
  summonPreview(actorUid: string, skillId: string, corpseUid?: string, slot?: number): { unit: CombatantDef | null; empowered: boolean | undefined; corpse: Corpse | null; slot: number | null } {
    const effect = this.skill(skillId, actorUid)?.effects.find((e) => e.type === 'summon');
    if (!effect || effect.type !== 'summon') return { unit: null, empowered: undefined, corpse: null, slot: null };
    const def = this.setup.units[effect.unit];
    const free = this.summonSlots(actorUid, skillId);
    const spot = slot !== undefined && free.includes(slot) ? slot : this.summonSlotFor(actorUid, skillId);
    const actor = this.get(actorUid);
    if (!effect.consumeCorpse) return { unit: def && actor ? this.summonDefFor(actor, def, undefined) : (def ?? null), empowered: undefined, corpse: null, slot: spot };
    const chosen = corpseUid && this.corpseChoices(actorUid, skillId).some((c) => c.uid === corpseUid) ? this.corpseOf(corpseUid) : null;
    const corpse = chosen ?? this.corpseToConsume(actorUid, skillId);
    // Faz 5a (Empty Grave): ceset yokken fedNoCorpse kuralı (bedel + ek MP yetiyorsa) gerçek kullanımla aynı beslenmiş çağrıyı gösterir
    let fed = !!corpse;
    if (!fed && actor?.treeHooks && !this.corpseChoices(actorUid, skillId).length) {
      const fr = this.rulesOf(actor, 'fedNoCorpse')[0];
      const sk = this.skill(skillId, actorUid)!;
      const pay = sk.cost.resource === 'mp' ? skillCostAmount(sk.cost, actor) : 0;
      if (fr && (this.freeMp || actor.mp >= pay + Math.max(0, fr.cost ?? 0))) fed = true;
    }
    return { unit: def ? (actor ? this.summonDefFor(actor, def, fed) : applySummonVariant(def, fed ? 'fed' : 'unfed', this.setup.formulas)) : null, empowered: fed, corpse, slot: spot };
  }

  /**
   * Çağıranın çağıracağı birimin tanımı (saf; savaşı değiştirmez): çağırandan türeyen statlar (Ömer 2026-10-18: `summonerScale`, çağıranın
   * item HARİÇ temel statı = Stats.summonBase ?? kendi temel statları) -> ceset varyantı (fed/unfed; `empowered` undefined = varyantsız) ->
   * Summon mastery (item affix: maks can ve skill gücü). Çağrı etkisi ve summonPreview aynı yolu kullanır.
   */
  summonDefFor(actor: Combatant, baseDef: CombatantDef, empowered: boolean | undefined): CombatantDef {
    const f = this.setup.formulas;
    const scaled = applySummonerScale(baseDef, summonerAttrs(actor), f);
    const variantDef = empowered === undefined ? scaled : applySummonVariant(scaled, empowered ? 'fed' : 'unfed', f);
    // Summon mastery (item affix, Ömer 2026-10-11): çağrının maks canı ve skill gücü; yoksa tanım aynen
    const sp = effNum(actor, 'summonPower');
    const out = sp > 0 ? applyUnitModifiers(variantDef, { hpMult: 1 + sp, powerMult: 1 + sp }, f) : variantDef;
    // Faz 4c: çağıranın ağacından çağrıya geçen maks can çarpanı / zırh eki (ağaçsız savaşta yok)
    const ts = this.summonTree(actor, baseDef.id, empowered);
    if (!ts || ((ts.hpMult ?? 1) === 1 && !ts.armorAdd)) return out;
    // Doğrudan stat üstünde (yeniden türetme ceset varyantının can çarpanını silerdi)
    return { ...out, stats: { ...out.stats, hp: Math.max(1, Math.round(out.stats.hp * (ts.hpMult ?? 1))), armor: Math.max(0, out.stats.armor + (ts.armorAdd ?? 0)) } };
  }

  /** Faz 4c: çağıranın bu çağrıya geçen ağacı (beslenmiş çağrıda '<id>#fed' kopyası). */
  private summonTree(actor: Combatant, unit: string, empowered: boolean | undefined): TreeSetup | undefined {
    const ts = this.treeUnits ? actor.treeSummons : undefined;
    if (!ts) return undefined;
    return (empowered ? ts[`${unit}#fed`] : undefined) ?? ts[unit];
  }

  /**
   * Diriltme hedefinin neden seçilemeyeceği (UI tooltip, önizleme): null = diriltilebilir. 'Corpse was consumed' (Raise Dead tüketti),
   * 'Cell is taken' (yuvasında canlı birim var), 'Not a fallen ally' (canlı, çağrı ya da düşman).
   */
  reviveBlockReason(actorUid: string, targetUid: string): string | null {
    const actor = this.get(actorUid);
    const t = this.get(targetUid);
    if (!actor || !t || t.side !== actor.side || t.hp > 0 || t.summoned || t.removed) return 'Not a fallen ally';
    if (this.corpseState.get(t.uid) === 'consumed') return 'Corpse was consumed';
    // Madde 257: cesedin hücresi dolu olabilir (dirilen seçilen BOŞ hücreye gelir); yalnızca kendi tarafında hiç boş hücre yoksa diriltilemez
    if (this.freeSlots(actor.side).length === 0) return 'No free cell';
    return null;
  }

  /** Skill bir diriltme skill'i mi (revive etkisi; Resurrection): iki adımlı seçim = önce ölü dost (hedef), sonra boş hücre (reviveSlots). */
  isReviveSkill(skillId: string): boolean {
    return !!this.skill(skillId)?.effects.some((e) => e.type === 'revive');
  }

  /**
   * Diriltme skill'inin dirilen dostu koyabileceği hücreler (madde 257): kullanıcının KENDİ tahtasındaki tüm boş (canlı birim olmayan) hücreler, küçükten
   * büyüğe. Cesetler (kendi cesedi ya da başka bir ölü dostunki) hücreyi doldurmaz. Diriltme skill'i değilse boş.
   */
  reviveSlots(actorUid: string, skillId: string): number[] {
    const actor = this.get(actorUid);
    if (!actor || !this.isReviveSkill(skillId)) return [];
    return this.freeSlots(actor.side);
  }

  /**
   * Hedef seçilmiş diriltmenin varsayılan hücresi (YZ önerisi, UI ön seçimi, hücre verilmeyen eski çağrılar): ölünün kendi hücresi boşsa o; değilse ona en
   * yakın boş hücre (sıra farkı + şerit farkı; eşitlikte öndeki, sonra küçük yuva). Boş hücre yoksa null.
   */
  reviveSlotFor(actorUid: string, skillId: string, targetUid: string): number | null {
    const actor = this.get(actorUid);
    const t = this.get(targetUid);
    if (!actor || !t || !this.isReviveSkill(skillId)) return null;
    return this.nearestFreeSlot(actor.side, t.slot);
  }

  /** Ceset kaydı: çağrı olmayan birim öldüğünde (revivable). */
  private leaveCorpse(c: Combatant): boolean {
    if (c.summoned || c.inert) return false; // çağrı ve yardımcı nesne ceset bırakmaz
    this.corpseState.set(c.uid, 'revivable');
    this.corpseOrder.set(c.uid, ++this.corpseCounter);
    return true;
  }

  /** Dirilen birimin ceset kaydı biter. */
  private clearCorpse(uid: string): void {
    this.corpseState.delete(uid);
    this.corpseOrder.delete(uid);
  }

  /**
   * Çağrı skill'i için seçilebilecek yuvalar: kullanıcının KENDİ tahtasındaki tüm boş (canlı birim olmayan) yuvalar, küçükten büyüğe. Madde 257
   * (ai-priorities K7 / Faz 4): ölü dostun cesedinin hücresi artık AYRILMIŞ DEĞİL; çağrı (ör. Skeleton) cesedin üstüne gelebilir, çünkü Resurrection
   * dirilen dostu seçilen herhangi bir boş hücreye koyar. Çağrı skill'i değilse boş.
   */
  summonSlots(actorUid: string, skillId: string): number[] {
    if (!this.get(actorUid) || !this.needsSlotChoice(skillId)) return [];
    return this.freeSlots(this.summonBoard(actorUid, skillId));
  }

  /** Çağrının varsayılan (yapay zeka) yuvası: summonSlots içinden; yakın dövüşçü çağrı en öndeki, diğerleri en arkadaki yuvaya. Yer yoksa null. */
  summonSlotFor(actorUid: string, skillId: string): number | null {
    const effect = this.skill(skillId, actorUid)?.effects.find((e) => e.type === 'summon');
    const def = effect && effect.type === 'summon' ? this.setup.units[effect.unit] : undefined;
    const free = this.summonSlots(actorUid, skillId);
    if (!def || free.length === 0) return null;
    const melee = this.setup.skills[def.skills[0] ?? '']?.motion === 'melee';
    return melee ? free[0]! : free[free.length - 1]!;
  }

  /** Bir tahtadaki boş (canlı birim olmayan) yuvalar (küçükten büyüğe). Çağrılar için summonSlots kullanılır (ölü dost yuvaları hariç). */
  freeSlots(side: Side): number[] {
    const out: number[] = [];
    for (let slot = 0; slot < this.setup.maxSlots[side]; slot++) {
      if (!this.combatants.some((c) => c.board === side && c.slot === slot && c.hp > 0)) out.push(slot);
    }
    return out;
  }

  /** Yakın dövüş görünümlü skill mi (motion melee; yalnızca görsel/öğretici; kural menzildir: rangeOf)? */
  isMelee(skillId: string): boolean {
    return this.skill(skillId)?.motion === 'melee';
  }

  /**
   * Bu skill için seçilebilecek hedefler (çoklu hedefli skill'de: hepsi). Menzil (range.md): tek hedef / rastgele / tümü yalnızca menzildeki birimler;
   * alan skill'inde menzildeki anchor'lardan vurulabilecek birimlerin birleşimi; dost skill'inde sıra farkı. Taunt'lı düşman yalnızca MENZİLDEYSE zorlar.
   */
  validTargets(actorUid: string, skillId: string): Combatant[] {
    const actor = this.get(actorUid);
    const skill = this.skill(skillId, actorUid);
    if (!actor || !skill) return [];
    switch (skill.target) {
      case 'self':
        return [actor];
      case 'single_enemy':
      case 'area_enemies':
      case 'random_enemies':
      case 'all_enemies': {
        if (skill.target === 'area_enemies' && this.rangeOn) return this.areaReachable(actor, skill);
        let list = this.livingByDepth(opposite(actor.side));
        if (this.rangeOn) {
          // Menzil (range.md): taunt bundan SONRA uygulanır, yani menzil dışındaki taunter zorlamaz
          list = list.filter((c) => this.inRange(actor, skill, c.board, c.slot));
        } else if (skill.motion === 'melee' && !skill.ignoreReach && !this.debugCasting && !this.setup.ignoreRange) {
          // ESKİ kural: ön sıra, düşmanın kendi tahtasındaki birimlere göre belirlenir
          const home = list.filter((c) => c.board === c.side);
          const limit = this.meleeRowLimit(home.map((c) => this.rowOf(c.slot)), this.reachOf(actor, skill));
          list = list.filter((c) => c.board !== c.side || this.rowOf(c.slot) <= limit);
        }
        // Backstab: yalnızca arkası boş hedefler (menzil gibi bir erişim kuralı; taunt bundan SONRA uygulanır: arkası dolu taunter seçilemez)
        if (skill.requiresOpenBehind && !this.debugCasting) list = list.filter((c) => this.openBehindProblem(c) === null);
        if (skill.target === 'single_enemy' && !this.debugCasting && !this.ignoresTaunt(actor)) {
          const taunters = list.filter((c) => c.statuses.some((s) => s.kind === 'taunt'));
          if (taunters.length > 0) list = taunters;
        }
        return list;
      }
      case 'single_ally':
        // excludeSelf (Guard): kullanıcı kendini hedefleyemez
        return this.livingByDepth(actor.side).filter((c) => (!skill.excludeSelf || c.uid !== actor.uid) && this.inRange(actor, skill, c.board, c.slot));
      case 'all_allies':
        return this.livingByDepth(actor.side);
      case 'dead_ally':
        // Düşmüş dostlar (çağrılar hariç); cesedi tüketildiyse (Raise Dead) diriltilemez. Madde 257: cesedin hücresinde canlı birim (ör. Skeleton) olması
        // ENGEL DEĞİL: Resurrection önce ölüyü, sonra kendi tarafında boş bir hücreyi seçer (reviveSlots); boş hücre yoksa canUse 'No free cell'.
        return this.combatants
          .filter((c) => c.side === actor.side && c.board === c.side && c.hp <= 0 && !c.summoned && !c.removed && this.corpseState.get(c.uid) !== 'consumed' && this.inRange(actor, skill, c.board, c.slot))
          .sort((x, y) => x.slot - y.slot);
      case 'everyone':
        // Dost kısmı menzilsiz; düşman kısmı menzile bağlı (Radiance global: hepsi)
        return [...this.livingByDepth(actor.side), ...this.livingByDepth(opposite(actor.side)).filter((c) => this.inRange(actor, skill, c.board, c.slot))];
      case 'area_any':
        // İki tahtaya da atılabilen alan (Smoke Bomb): menzildeki anchor'lardan kapsanan canlı birimler (menzil kapalıyken alandaki her canlı birim); etkiler `side` ile ayrılır (taunt yok)
        if (!this.rangeOn) return [...this.livingByDepth(opposite(actor.side)), ...this.livingByDepth(actor.side)];
        return this.areaReachable(actor, skill);
      case 'empty_tile':
        return []; // hedef birim değil boş yuva: freeTiles(uid)
    }
  }

  /** Alan skill'inin menzildeki anchor'larından vurulabilecek birimlerin birleşimi (önce karşı tahta, yuva sırasıyla). */
  private areaReachable(actor: Combatant, skill: SkillDef): Combatant[] {
    const seen = new Set<string>();
    const out: Combatant[] = [];
    for (const { board, slot } of this.shapeAnchorCells(actor.uid, skill.id)) {
      for (const c of this.areaWindowAt(actor.uid, skill.id, slot, board)) {
        if (seen.has(c.uid)) continue;
        seen.add(c.uid);
        out.push(c);
      }
    }
    const foe = opposite(actor.side);
    return out.sort((a, b) => (a.board === b.board ? a.slot - b.slot : a.board === foe ? -1 : 1));
  }

  /** Bir birimin hemen ARKASINDAKİ hücre (bir sıra daha derin, aynı şerit, kendi tahtasında); en arka sıradaysa null. */
  behindSlotOf(c: Combatant): number | null {
    const { rows, lanes } = this.setup.formulas.formation;
    const behind = c.slot + lanes;
    return behind < rows * lanes ? behind : null;
  }

  /**
   * requiresOpenBehind (Backstab) kuralı: hedefin arkası BOŞ mu? Boşsa null; değilse oyuncuya gösterilecek neden (İngilizce):
   * 'No room behind the target' (hedef en arka sırada) ya da 'Target is shielded from behind' (arkasındaki hücrede CANLI birim var).
   * Karar: yalnızca canlı birim engeller; ceset ve ölü dostun ayrılmış (fallenSlots) hücresi engel DEĞİLDİR.
   */
  openBehindProblem(target: Combatant): string | null {
    const behind = this.behindSlotOf(target);
    if (behind === null) return 'No room behind the target';
    if (this.combatants.some((o) => o.hp > 0 && o.board === target.board && o.slot === behind)) return 'Target is shielded from behind';
    return null;
  }

  /**
   * UI/önizleme: bu skill bu hedefe kullanılabilir mi? Kullanılabilirse null; değilse neden (ör. Backstab: 'No room behind the target' /
   * 'Target is shielded from behind'; menzil: 'Out of range'; taunt: 'Must target the taunting enemy'). Bedel/sıra denetlenmez (canUse ayrı).
   */
  targetProblem(actorUid: string, skillId: string, targetUid: string): string | null {
    const actor = this.get(actorUid);
    const skill = this.skill(skillId, actorUid);
    const target = this.get(targetUid);
    if (!actor || !skill || !target) return 'Invalid target';
    if (target.hp <= 0 && skill.target !== 'dead_ally') return 'Target is dead';
    if (this.validTargets(actorUid, skillId).some((c) => c.uid === targetUid)) return null;
    if (skill.excludeSelf && targetUid === actorUid) return this.selfTargetReason(skill);
    if (skill.target === 'single_enemy' && target.side !== actor.side) {
      if (skill.requiresOpenBehind) {
        const p = this.openBehindProblem(target);
        if (p) return p;
      }
      if (!this.inRange(actor, skill, target.board, target.slot)) return 'Out of range';
      const tauntingFoe = !this.ignoresTaunt(actor) && this.living(target.side).some((c) => c.statuses.some((s) => s.kind === 'taunt'));
      return tauntingFoe ? 'Must target the taunting enemy' : this.rangeOn ? 'Out of range' : 'Out of reach';
    }
    if ((skill.target === 'single_ally' || skill.target === 'dead_ally') && target.side === actor.side && !this.inRange(actor, skill, target.board, target.slot)) return 'Out of range';
    return 'Invalid target';
  }

  /** excludeSelf skill'inde kullanıcı kendini seçtiyse neden: Guard 'Cannot guard yourself', diğerleri 'Cannot target yourself'. */
  private selfTargetReason(skill: SkillDef): string {
    return skill.effects.some((e) => e.type === 'guard') ? 'Cannot guard yourself' : 'Cannot target yourself';
  }

  /** Aktör şu an bu skill'i kullanabilir mi (sıra, bedel, yer, savaş durumu)? */
  canUse(actorUid: string, skillId: string): CanUse {
    if (this.winner) return { ok: false, reason: 'Battle is over' };
    const actor = this.get(actorUid);
    if (!actor) return { ok: false, reason: 'No such unit' };
    if (actor.hp <= 0) return { ok: false, reason: 'Unit is dead' };
    if (this.mode === 'turns' && this.currentUid !== actorUid) return { ok: false, reason: "Not this unit's turn" };
    if (!actor.skills.includes(skillId)) return { ok: false, reason: 'Unit does not have this skill' };
    const skill = this.skill(skillId, actorUid);
    if (!skill) return { ok: false, reason: 'Unknown skill' };
    if (actor.lockedSkills?.includes(skillId)) return { ok: false, reason: 'Locked' };
    // Faz 5a (Chained to Them): ağaç kuralı noTaunt (taunt veren skill)
    if (actor.treeHooks && skill.effects.some((e) => e.type === 'taunt') && this.rulesOf(actor, 'noTaunt').length) return { ok: false, reason: 'Chained: cannot Taunt' };
    // Boss fazı şartı (Ash Brand faz 2, Fall faz 3) ve bağlı yardımcı şartı (Chain Hook: canlı Iron Mooring)
    if ((skill.minPhase ?? 1) > this.phaseOf(actor)) return { ok: false, reason: 'Not in this phase' };
    if (skill.requiresAlly && !this.combatants.some((c) => c.hp > 0 && c.side === actor.side && c.defId === skill.requiresAlly)) {
      return { ok: false, reason: `Needs a standing ${this.setup.units[skill.requiresAlly]?.name ?? skill.requiresAlly}` };
    }
    // Telgraf sınırları: aynı anda tek alan telgrafı + tek damga; bir turda en fazla bir yeni telgraf (turns modunda)
    if (skill.telegraph) {
      const mine = this.telegraphs.filter((t) => t.source === actorUid);
      if (mine.some((t) => t.kind === skill.telegraph!.kind)) return { ok: false, reason: skill.telegraph.kind === 'brand' ? 'A brand is already burning' : 'A collapse is already pending' };
      if (this.mode === 'turns' && this.telegraphedThisTurn.has(actorUid)) return { ok: false, reason: 'One warning per turn' };
    }
    if (this.mode === 'turns' && !this.noCooldowns && (actor.cooldowns[skillId] ?? 0) > 0) return { ok: false, reason: 'On cooldown' };
    // ESKİ kural (menzil kapalı): yakın dövüş yalnızca kendi takımının ön sırasındaki birimlerden (ignoreFrontRow / ignoreReach istisna)
    if (!this.rangeOn && !this.setup.ignoreRange && skill.motion === 'melee' && skill.target !== 'self' && !skill.ignoreFrontRow && !skill.ignoreReach && actor.board === actor.side && this.rowOf(actor.slot) > this.frontRowOf(actor.side) + this.reachOf(actor, skill)) {
      return { ok: false, reason: 'Melee: front row only' };
    }
    const resource = skill.cost.resource;
    // Faz 2c (Not Yet): hedefe bağlı bedel koşulu varsa geçerli hedeflerden EN UCUZU (ödeme seçilen hedefle: cast)
    const tAmount = (): number => {
      const env = { host: this.condHost };
      const base = skillCostAmount(skill.cost, actor);
      if (!skill.cost.cond?.length) return base;
      return Math.min(base, ...this.validTargets(actorUid, skillId).map((t) => skillCostAmount(skill.cost, actor, { ...env, target: t })));
    };
    const amount = this.thriftyFree(actor, resource) || this.nthSpellFree(actor, skill) ? 0 : tAmount(); // oranlı bedel (ofCurrent): mevcut kaynağın oranı, en az 1
    // Silence (statuses.json > blocksMpSkills, madde 260): MP bedelli skill kullanılamaz (Unlimited MP debug'ı da bunu açmaz); bedelsizler ve global eylemler serbest
    if (resource === 'mp' && amount > 0 && this.isSilenced(actorUid)) return { ok: false, reason: 'Silenced' };
    // Soul Exchange (cost.hpFallback; yalnızca yamalı kopya): MP yetmezse bedel candan ödenebiliyorsa (can > yedek bedel) kullanılabilir
    if (resource === 'mp' && !this.freeMp && actor.mp < amount && !(skill.cost.hpFallback && actor.hp > hpFallbackAmount(skill.cost, actor))) return { ok: false, reason: 'Not enough MP' };
    if (resource === 'rage' && !this.freeRage && (actor.rage ?? 0) < amount) return { ok: false, reason: 'Not enough rage' };
    if (resource === 'hp' && actor.hp <= amount) return { ok: false, reason: 'Not enough HP' };
    if (skill.effects.some((e) => e.type === 'summon') && this.summonSlots(actorUid, skillId).length === 0) {
      return { ok: false, reason: 'No free slot' };
    }
    if (this.validTargets(actorUid, skillId).length === 0) {
      const reason = skill.target === 'dead_ally' ? this.noReviveReason(actor) : skill.requiresOpenBehind ? 'No target with room behind it' : skill.excludeSelf ? (skill.effects.some((e) => e.type === 'guard') ? 'No ally to guard' : 'No other ally') : this.rangeOn ? 'No target in range' : 'No target in reach';
      return { ok: false, reason };
    }
    // Diriltme (madde 257): dirilen kendi tarafında seçilen BOŞ hücreye gelir; hiç boş hücre yoksa kullanılamaz
    if (this.isReviveSkill(skillId) && this.reviveSlots(actorUid, skillId).length === 0) return { ok: false, reason: 'No free cell' };
    return { ok: true };
  }

  /** Birim susturulmuş mu (statuses.json > blocksMpSkills taşıyan bir durum: Silence)? MP bedelli skill'leri kullanamaz. Saf (UI, YZ, önizleme). */
  isSilenced(uid: string): boolean {
    const c = this.get(uid);
    return !!c && c.statuses.some((s) => this.statusDef(s.kind)?.blocksMpSkills);
  }

  /** Diriltilecek hedef yoksa neden: tüm düşmüş dostların cesedi tüketildiyse 'Corpse was consumed', aksi halde 'No fallen ally'. */
  private noReviveReason(actor: Combatant): string {
    const fallen = this.combatants.filter((c) => c.side === actor.side && c.hp <= 0 && !c.summoned && !c.removed);
    return fallen.length > 0 && fallen.every((c) => this.corpseState.get(c.uid) === 'consumed') ? 'Corpse was consumed' : 'No fallen ally';
  }

  /** Aktörün şu an kullanabileceği en az bir skill'i var mı? */
  hasUsableSkill(actorUid: string): boolean {
    return (this.get(actorUid)?.skills ?? []).some((id) => this.canUse(actorUid, id).ok);
  }

  /**
   * Class skill'i ya da (skillId global bir id ise) global skill kullanır; global skill'de `slot` Move Tile'ın hedef boş yuvasıdır.
   * `board`: yalnızca area_any (Smoke Bomb) alan skill'inde anchor hücrenin tahtası (yoksa karşı taraf; `targetUid = 'tile:<yuva>'` kendi tahtası).
   * `corpseUid`: ceset tüketen çağrıda (Raise Dead) tüketilecek düşman cesedi (corpseChoices'tan); ceset varken ZORUNLU ('Choose a corpse to consume'),
   * hiç ceset yokken verilirse yok sayılır. Çağrıda `slot` summonSlots'tan biri olmalı (verilmezse varsayılan yuva).
   */
  useSkill(actorUid: string, skillId: string, targetUid?: string, slot?: number, board?: Side, corpseUid?: string, mode?: string): ActionResult {
    if (this.globalDef(skillId)) {
      this.viewMode = null;
      return this.useGlobal(actorUid, skillId, slot ?? slotOfTileUid(targetUid), slotOfTileUid(targetUid) === undefined ? targetUid : undefined);
    }
    return this.withModeCast(actorUid, skillId, mode, () => this.cast(actorUid, skillId, targetUid, slot, false, board, corpseUid));
  }

  /** Tek giriş noktası: class skill'i ya da global skill ({kind:'global', id, slot?}). */
  act(actorUid: string, action: BattleAction): ActionResult {
    if (action.kind === 'global') {
      this.viewMode = null;
      return this.useGlobal(actorUid, action.id, action.slot ?? slotOfTileUid(action.targetUid), slotOfTileUid(action.targetUid) === undefined ? action.targetUid : undefined);
    }
    return this.withModeCast(actorUid, action.skillId, action.mode, () => this.cast(actorUid, action.skillId, action.targetUid, action.slot, false, action.board, action.corpseUid));
  }

  /** Yapay zeka seçimini uygular; seçim yoksa (null) turu pas geçer (skipTurn). */
  applyChoice(actorUid: string, choice: ChoiceLike | null): ActionResult {
    if (!choice) return this.skipTurn();
    return choice.mode !== undefined ? this.useSkill(actorUid, choice.skillId, choice.targetUid, choice.slot, choice.board, choice.corpseUid, choice.mode) : this.useSkill(actorUid, choice.skillId, choice.targetUid, choice.slot, choice.board, choice.corpseUid);
  }

  // ---------------------------------------------------------------- Skill biçimleri (Faz 8: Focused Beam, Stacked Deck)

  /** Birimin bu skill için biçim kümesi (ağaçta biçim veren düğüm yoksa undefined: arayüz seçim paneli açmaz, YZ biçim denemez). */
  skillModes(uid: string, skillId: string): SkillModeSet | undefined {
    return this.get(uid)?.skillModes?.[skillId];
  }

  /**
   * Arayüz: hedef seçme sırasında biçimin önizlemesi (Focused Beam seçildi, düşman bekleniyor): `mode` verilince o birim + skill için skill(),
   * validTargets, önizleme biçimin tanımını görür; null = kapat. Hiçbir eylem bunu kullanmaz (her eylem başında silinir; eylem biçimi `mode` ile taşır).
   */
  setViewMode(uid: string, skillId: string, mode: string | null): boolean {
    if (mode === null) {
      this.viewMode = null;
      return true;
    }
    const m = this.skillModes(uid, skillId)?.list.find((x) => x.id === mode);
    this.viewMode = m ? { uid, skillId, def: m.skill } : null;
    return !!m;
  }

  /**
   * YZ / arayüz değerlendirmesi: `fn` süresince bu birim + skill biçimin tanımını görür (önceki önizleme biçimi geri gelir; eylem değil, zar yok).
   * Biçim yoksa skill'in kendi tanımıyla çalışır.
   */
  withMode<T>(uid: string, skillId: string, mode: string, fn: () => T): T {
    const prev = this.viewMode;
    const m = this.skillModes(uid, skillId)?.list.find((x) => x.id === mode);
    this.viewMode = m ? { uid, skillId, def: m.skill } : null;
    try {
      return fn();
    } finally {
      this.viewMode = prev;
    }
  }

  /** Biçimli kullanım: biçim geçerliyse kullanım süresince skill() biçim tanımını döndürür; başarılı kullanım biçim düğümünü ölçüme yazar. */
  private withModeCast(actorUid: string, skillId: string, mode: string | undefined, run: () => ActionResult): ActionResult {
    this.viewMode = null;
    if (mode === undefined) return run();
    const m = this.skillModes(actorUid, skillId)?.list.find((x) => x.id === mode);
    if (!m) return { ok: false, reason: 'Unknown mode' };
    this.modeCast = { uid: actorUid, skillId, def: m.skill };
    try {
      const r = run();
      if (r.ok) this.treeProc(actorUid, m.node);
      return r;
    } finally {
      this.modeCast = null;
    }
  }

  /** Global skill tanımı (data/global-skills.json). */
  globalDef(id: string): GlobalSkillDef | undefined {
    return this.setup.globalSkills?.[id];
  }

  /**
   * Bu savaşta tanımlı global skill id'leri (rest, skip_turn, move_tile, valor_revive). `side` verilirse o tarafın kullanamayacağı türler (Valor'u
   * olmayan tarafta 'valor') çıkarılır: HUD düğmeleri ve listActions bunu kullanır.
   */
  globalSkillIds(side?: Side): string[] {
    const ids = Object.keys(this.setup.globalSkills ?? {});
    return side ? ids.filter((id) => this.globalDef(id)?.kind !== 'valor' || this.valorOf(side) !== null) : ids;
  }

  // ---------------------------------------------------------------- Valor (Ömer 2026-10-13)

  /** Tarafın kalan Valor'u; o tarafta Valor yoksa (hızlı savaş, düşmanlar) null. */
  valorOf(side: Side): number | null {
    return this.valorPool.has(side) ? this.valorPool.get(side)! : null;
  }

  /** Valor kuralları (data/valor.json); savaşta Valor yoksa da kurallar okunabilir (arayüz metni). */
  get valorRules(): ValorRules | undefined {
    return this.setup.valorRules;
  }

  /** Debug: tarafın Valor'unu ayarlar (0..cap; o tarafta Valor yoksa açar). */
  debugSetValor(side: Side, v: number): void {
    const cap = this.setup.valorRules?.cap ?? 8;
    this.valorPool.set(side, Math.max(0, Math.min(cap, Math.floor(v))));
  }

  /** Bu savaşta düşen birim var mı (taraf; çağrılar ve savaşa ceset olarak girenler sayılmaz). Kusursuz zafer = false. */
  anyFell(side: Side): boolean {
    for (const uid of this.fellInBattle) if (this.get(uid)?.side === side) return true;
    return false;
  }

  /**
   * Valor ile diriltilebilecek düşmüş dostlar: aktörün tarafında, çağrı değil, cesedi TÜKETİLMEMİŞ ve kendi tahtasında (sızıp düşman tahtasında ölen
   * diriltilmez). Boş hücre yoksa hiçbiri (sıra: ölüm sırası).
   */
  valorTargets(actorUid: string): Combatant[] {
    const actor = this.get(actorUid);
    if (!actor || this.freeSlots(actor.side).length === 0) return [];
    return this.combatants
      .filter((c) => c.side === actor.side && c.hp <= 0 && !c.summoned && !c.inert && c.board === c.side && this.corpseState.get(c.uid) === 'revivable')
      .sort((a, b) => (this.corpseOrder.get(a.uid) ?? 0) - (this.corpseOrder.get(b.uid) ?? 0));
  }

  /** Valor ile dirilen dostun hücresi: cesedinin hücresi boşsa o, değilse Resurrection'ın kuralıyla en yakın boş hücre (sıra + şerit farkı). */
  valorSlotFor(targetUid: string): number | null {
    const t = this.get(targetUid);
    if (!t) return null;
    return this.nearestFreeSlot(t.side, t.slot);
  }

  private nearestFreeSlot(side: Side, near: number): number | null {
    const free = this.freeSlots(side);
    if (free.length === 0) return null;
    if (free.includes(near)) return near;
    const dist = (s: number) => Math.abs(this.rowOf(s) - this.rowOf(near)) + Math.abs(this.laneOf(s) - this.laneOf(near));
    return [...free].sort((a, b) => dist(a) - dist(b) || this.rowOf(a) - this.rowOf(b) || a - b)[0]!;
  }

  /**
   * Birimin Move Tile için seçebileceği boş yuvalar (kendi tarafında, ÜZERİNDE CANLI BİRİM OLMAYAN yuvalar; küçükten büyüğe).
   * Madde 258 (Ömer): ölü dostun ceset hücresine de geçilebilir (ceset orada kalır; diriltme hücreye bağlı değil: Resurrection boş bir hücre seçer,
   * çağrılar da cesedin üstüne gelebilir). Düşman tahtasına sızmış birim hareket edemez.
   */
  freeTiles(actorUid: string): number[] {
    const actor = this.get(actorUid);
    if (!actor || actor.hp <= 0 || actor.board !== actor.side) return [];
    return this.freeSlots(actor.side);
  }

  /**
   * Bir tarafın tahtasında diriltilmeyi bekleyen (düşmüş, çağrı olmayan, cesedi TÜKETİLMEMİŞ) dostların boş yuvaları (bilgi amaçlı; madde 258'den beri
   * hiçbir kuralı kısıtlamaz: Move ve çağrılar bu hücrelere girebilir).
   */
  fallenSlots(side: Side): number[] {
    return this.combatants
      .filter((c) => c.side === side && c.board === side && c.hp <= 0 && !c.summoned && this.corpseState.get(c.uid) !== 'consumed' && !this.combatants.some((o) => o.hp > 0 && o.board === side && o.slot === c.slot))
      .map((c) => c.slot)
      .sort((a, b) => a - b);
  }

  /**
   * Birimin `slot` yuvasındaki (varsayılan: şu anki) SIRA SIRALAMASI: kendi tahtasındaki canlı birimlerin dolu sıraları arasında kaçıncı (0 = en önde).
   * Düşmanın yakın dövüşü sıralamaya göre işler (eski kural: meleeRows + reach'ten küçükse hedeflenebilir).
   */
  rowRank(uid: string, slot?: number): number {
    const c = this.get(uid);
    if (!c) return 0;
    const at = slot ?? c.slot;
    const rows = new Set(this.combatants.filter((o) => o.uid !== uid && o.hp > 0 && o.board === c.board && o.side === c.side).map((o) => this.rowOf(o.slot)));
    rows.add(this.rowOf(at));
    return [...rows].sort((a, b) => a - b).indexOf(this.rowOf(at));
  }

  /**
   * ESKİ erişim kuralı (yalnızca range.enabled false): yakın dövüşün bir tahtada ulaşabildiği en derin sıra (mutlak sıra numarası; bu ve önündeki dolu
   * sıralar vurulabilir). Taban: en öndeki `formation.meleeRows` DOLU sıra; `reach` bunun üstüne MUTLAK sıra ekler (boş sıraları atlamaz, madde 284).
   * `rows`: tahtadaki canlı birimlerin sıraları. Boşsa -1.
   */
  meleeRowLimit(rows: number[], reach: number): number {
    const occupied = [...new Set(rows)].sort((a, b) => a - b);
    if (occupied.length === 0) return -1;
    const base = occupied[Math.min(occupied.length, Math.max(1, this.setup.formulas.formation.meleeRows)) - 1]!;
    return base + Math.max(0, reach);
  }

  /** ESKİ kural: birim `slot` yuvasındayken karşı tarafın `reach` menzilli yakın dövüşü ona ulaşır mı (YZ meleeIncoming)? Sızmış birim her zaman. */
  inMeleeReach(uid: string, reach: number, slot?: number): boolean {
    const c = this.get(uid);
    if (!c) return false;
    if (c.board !== c.side) return true;
    const at = slot ?? c.slot;
    const rows = this.combatants.filter((o) => o.uid !== uid && o.hp > 0 && o.board === c.board && o.side === c.side).map((o) => this.rowOf(o.slot));
    rows.push(this.rowOf(at));
    return this.rowOf(at) <= this.meleeRowLimit(rows, reach);
  }

  /** ESKİ kural: birim `slot` yuvasındayken yakın dövüş skill'i (reach ile) kullanabilir mi ('Melee: front row only', varsayımsal yuva için). */
  canMeleeFrom(uid: string, slot: number, reach = 0): boolean {
    const c = this.get(uid);
    if (!c) return false;
    const rows = this.combatants.filter((o) => o.uid !== uid && o.hp > 0 && o.board === c.board && o.side === c.side).map((o) => this.rowOf(o.slot));
    const front = Math.min(this.rowOf(slot), ...rows);
    return this.rowOf(slot) <= front + reach;
  }

  /** Global skill şu an kullanılabilir mi (sıra, mod, MP dolu mu, üst üste skip sınırı, boş yuva)? `slot`: Move Tile hedefi (verilirse geçerli olmalı). */
  canUseGlobal(actorUid: string, id: string, slot?: number, targetUid?: string): CanUse {
    const def = this.globalDef(id);
    if (!def) return { ok: false, reason: 'Unknown action' };
    if (this.winner) return { ok: false, reason: 'Battle is over' };
    const actor = this.get(actorUid);
    if (!actor) return { ok: false, reason: 'No such unit' };
    if (actor.hp <= 0) return { ok: false, reason: 'Unit is dead' };
    if (actor.summoned) return { ok: false, reason: 'Summoned units cannot use this' };
    if (this.mode === 'turns' && this.currentUid !== actorUid) return { ok: false, reason: "Not this unit's turn" };
    if (def.turnsOnly && this.mode !== 'turns') return { ok: false, reason: 'Only in turn mode' };
    if (def.kind === 'rest') {
      if (actor.maxMp <= 0) return { ok: false, reason: 'No MP' };
      if (actor.mp >= actor.maxMp) return { ok: false, reason: 'MP is full' };
    } else if (def.kind === 'skip') {
      if (this.skipStreakOf(actorUid) >= (def.maxConsecutive ?? 1)) return { ok: false, reason: 'Cannot skip again' };
    } else if (def.kind === 'valor') {
      const have = this.valorOf(actor.side);
      const rules = this.setup.valorRules;
      if (have === null || !rules) return { ok: false, reason: 'No Valor in this battle' };
      if (have < rules.revive.battleCost) return { ok: false, reason: `Needs ${rules.revive.battleCost} Valor (you have ${have})` };
      const targets = this.valorTargets(actorUid);
      if (targets.length === 0) return { ok: false, reason: this.freeSlots(actor.side).length === 0 ? 'No free cell' : 'No fallen ally to revive' };
      if (targetUid !== undefined && !targets.some((t) => t.uid === targetUid)) return { ok: false, reason: 'Not a fallen ally' };
      if (slot !== undefined && !this.freeSlots(actor.side).includes(slot)) return { ok: false, reason: 'That cell is not free' };
    } else {
      // Faz 2c (Anchored Stone): ağaç kuralı noMove (Faz 5a: while / when; Chained to Them)
      if (actor.treeHooks && this.rulesOf(actor, 'noMove').length) return { ok: false, reason: 'Anchored: cannot move' };
      if (actor.board !== actor.side) return { ok: false, reason: 'Cannot move here' };
      const free = this.freeTiles(actorUid);
      if (free.length === 0) return { ok: false, reason: 'No empty cell' };
      if (slot !== undefined && !free.includes(slot)) return { ok: false, reason: 'Invalid cell' };
    }
    return { ok: true };
  }

  /**
   * Global skill kullanır ve turu bitirir. rest: +def.mp MP (üst sınırı aşmaz; olay mpRegen). skip: turu geçer; sayaç normal düşer ama birimin bir sonraki turuna
   * kadar hızı +def.speedBonus (1 = %100: sayaç iki kat hızlı dolar, sıradaki tur yarı sürede gelir; olay turnSkipped voluntary + speedBoost), üst üste en çok
   * def.maxConsecutive kez; cooldown/MP sayaçları normal işler.
   * move: kendi tarafındaki boş `slot` yuvasına geçer (olay moved {actor, from, to}); sıra, ön sıra kuralı, aura/yan komşuluk, taunt/guard yeni yuvaya göre kendiliğinden güncellenir
   * (hepsi yuvadan hesaplanır). Olay akışı her zaman 'globalUsed' ile başlar.
   */
  useGlobal(actorUid: string, id: string, slot?: number, targetUid?: string): ActionResult {
    const def = this.globalDef(id);
    const can = this.canUseGlobal(actorUid, id, slot, targetUid);
    if (!can.ok) return can;
    if (def!.kind === 'move' && slot === undefined) return { ok: false, reason: 'Pick an empty cell' };
    if (def!.kind === 'valor' && targetUid === undefined) return { ok: false, reason: 'Pick a fallen ally' };
    const actor = this.get(actorUid)!;
    const events: BattleEvent[] = [];
    const emit: Emit = (e) => {
      events.push(e);
      this.record(e);
    };
    this.phaseCrossed.clear();
    if (this.mode === 'test') this.resolveTelegraphsOf(actor, emit);
    this.observer?.before?.({ kind: 'global', actorUid, id, ...(slot !== undefined ? { center: slot } : {}), ...(targetUid !== undefined ? { targetUids: [targetUid] } : {}) });
    emit({ type: 'globalUsed', actor: actor.uid, id });
    if (def!.kind === 'rest') {
      // Faz 5a (Spendthrift): rest kuralı Rest'in MP'sini çarpar
      const rr = actor.treeHooks ? this.rulesOf(actor, 'rest')[0] : undefined;
      if (rr) this.treeProc(actor.uid, rr.node);
      const gain = Math.min(rr ? Math.round((def!.mp ?? 0) * (rr.mult ?? 1)) : (def!.mp ?? 0), actor.maxMp - actor.mp);
      actor.mp += gain;
      emit({ type: 'mpRegen', actor: actor.uid, amount: gain, after: actor.mp });
      // Vigil (item etkisi restBlessing): Rest ayrıca durum + maks canın oranı şifa
      for (const { v: rb, src } of effList(actor, 'restBlessing')) {
        emit({ type: 'passive', actor: actor.uid, passive: 'vigil', name: 'Vigil' });
        if (this.statusDef(rb.status)) this.addStatus(actor, { kind: rb.status as Status['kind'], turns: rb.turns, source: actor.uid }, emit, 'vigil');
        if (rb.healRatio > 0) this.applyHeal(actor, actor, Math.max(1, Math.round(actor.maxHp * rb.healRatio)), false, emit, 'vigil');
        if (src === 'tree') this.fxProc(actor, 'restBlessing');
      }
    } else if (def!.kind === 'skip') {
      // Sayaç normal düşer (taşan kısım korunur); bunun yerine bir sonraki tura kadar hız +speedBonus (varsayılan %100) artar.
      const bonus = this.mode === 'turns' ? Math.max(0, def!.speedBonus ?? 1) : 0;
      if (bonus > 0) this.speedBoost.set(actor.uid, bonus);
      emit({ type: 'turnSkipped', actor: actor.uid, voluntary: true, ...(bonus > 0 ? { speedBoost: bonus } : {}) });
      if (this.trigOn) this.trig([actor], { on: 'skip' }, emit);
    } else if (def!.kind === 'valor') {
      this.valorRevive(actor, this.get(targetUid!)!, slot, emit);
    } else {
      const from = actor.slot;
      actor.slot = slot!;
      emit({ type: 'moved', actor: actor.uid, from, to: actor.slot });
      if (this.trigOn) this.trigAll({ on: 'enemyMoved', target: actor, subject: actor, source: actor }, emit, (u) => u.side !== actor.side);
    }
    // Pilgrim's Road Boots (moveStride): Move yarım tur harcar ve kaçınma buff'ı verir
    const stride = def!.kind === 'move' ? effFirst(actor, 'moveStride') : undefined; // sayaçlı: tek kaynak (item önce)
    if (stride) {
      emit({ type: 'passive', actor: actor.uid, passive: 'pilgrims_stride', name: "Pilgrim's Stride" });
      this.addStatus(actor, { kind: stride.status as Status['kind'], turns: stride.turns, source: actor.uid }, emit);
    }
    this.flushFree(emit); // Faz 4c: Move'un tetiklediği bedava kullanım (Range Keeper)
    this.noteAction(actor.uid, def!.kind === 'rest' ? 'rest' : def!.kind === 'skip' ? 'skip' : def!.kind === 'valor' ? 'valor' : 'move');
    this.finishAction(actor, emit, stride ? stride.turnCost : 1);
    return { ok: true, events };
  }

  /**
   * Valor ile diriltme (global 'valor'): tarafın Valor'undan battleCost düşer, hedef cesedinin hücresinde (doluysa `slot` ya da en yakın boş hücre)
   * revive.hpRatio canla / mpRatio MP'yle kalkar; Resurrection'ın dirilişiyle aynı temizlik (durumlar, kalkan, Rage, sayaç sıfır), yenilenme yok.
   * Olaylar: valor {side, spent, after} + revive {source, target, slot, from, cause 'valor'}. Rastgelelik yok.
   */
  private valorRevive(actor: Combatant, target: Combatant, slot: number | undefined, emit: Emit): void {
    const rules = this.setup.valorRules!;
    const free = this.freeSlots(actor.side);
    const to = slot !== undefined && free.includes(slot) ? slot : this.valorSlotFor(target.uid)!;
    const after = (this.valorOf(actor.side) ?? 0) - rules.revive.battleCost;
    this.valorPool.set(actor.side, after);
    emit({ type: 'valor', side: actor.side, spent: rules.revive.battleCost, after });
    const from = target.slot;
    target.board = target.side;
    target.slot = to;
    target.hp = Math.max(1, Math.round(target.maxHp * rules.revive.hpRatio));
    target.mp = Math.round(target.maxMp * rules.revive.mpRatio);
    target.shield = 0;
    target.magicShield = 0;
    delete target.shieldHooks;
    target.statuses = [];
    target.turnCounter = 0;
    if (target.maxRage !== undefined) target.rage = 0;
    this.announcedDead.delete(target.uid);
    this.clearCorpse(target.uid);
    emit({ type: 'revive', source: actor.uid, target: target.uid, hpAfter: target.hp, mpAfter: target.mp, slot: to, from, cause: 'valor' });
  }

  /** Aktörün şu an yapabileceği tüm eylemler: class skill'leri ve global skill'ler (ok: kullanılabilir mi, reason: neden değil, slots: Move Tile yuvaları). */
  listActions(actorUid: string): ActionInfo[] {
    const actor = this.get(actorUid);
    if (!actor) return [];
    const out: ActionInfo[] = actor.skills.map((id) => {
      const c = this.canUse(actorUid, id);
      return { kind: 'skill', id, ok: c.ok, ...(c.ok ? {} : { reason: c.reason }) };
    });
    for (const id of this.globalSkillIds(actor.side)) {
      const c = this.canUseGlobal(actorUid, id);
      out.push({ kind: 'global', id, ok: c.ok, ...(c.ok ? {} : { reason: c.reason }), ...(this.globalDef(id)?.kind === 'move' && c.ok ? { slots: this.freeTiles(actorUid) } : {}), ...(this.globalDef(id)?.kind === 'valor' && c.ok ? { targets: this.valorTargets(actorUid).map((t) => t.uid) } : {}) });
    }
    return out;
  }

  /** Şu an kullanılabilir (ok) eylemler. */
  legalActions(actorUid: string): ActionInfo[] {
    return this.listActions(actorUid).filter((a) => a.ok);
  }


  /**
   * Debug: skill'i bedel, bekleme, menzil, sıra ve kullanıcının skill listesi kurallarını yok sayarak oynatır (animasyon/ses galerisi).
   * Hedef geçersizse ilk uygun hedefe/hücreye gider. Sıra ilerlemez, MP/bekleme harcanmaz, savaş bitmez.
   */
  debugCast(actorUid: string, skillId: string, targetUid?: string, slot?: number, corpseUid?: string): ActionResult {
    if (!this.get(actorUid)) return { ok: false, reason: 'No such unit' };
    if (!this.skill(skillId, actorUid)) return { ok: false, reason: 'Unknown skill' };
    this.debugCasting = true;
    try {
      return this.cast(actorUid, skillId, targetUid, slot, true, undefined, corpseUid);
    } finally {
      this.debugCasting = false;
    }
  }

  private cast(actorUid: string, skillId: string, targetUid: string | undefined, slot: number | undefined, debug: boolean, boardArg?: Side, corpseArg?: string, fc?: { power: number }): ActionResult {
    // Faz 4c: `fc` = bedava kullanım (tetik): bedel / cooldown / tur / menzil denetimi yok, eylem sayılmaz; olaylar üst eyleme gider
    if (!fc) this.phaseCrossed.clear(); // faz kilidi eylem başına
    if (this.treeUnits) {
      this.castHealed.clear();
      if (!fc) {
        this.castFires.clear();
        this.centerCritN = 0;
      }
    }
    if (!debug && !fc) {
      const can = this.canUse(actorUid, skillId);
      if (!can.ok) return can;
      if (slot !== undefined && this.needsSlotChoice(skillId) && !this.summonSlots(actorUid, skillId).includes(slot)) return { ok: false, reason: 'Invalid slot' };
      if (slot !== undefined && this.isReviveSkill(skillId) && !this.reviveSlots(actorUid, skillId).includes(slot)) return { ok: false, reason: 'That cell is not free' };
    }
    // Ceset tüketen çağrı (Raise Dead, madde 230): oyuncu cesedi seçer (ceset varken zorunlu); debug oynatmada seçilmezse YZ önerisi (en tehlikeli)
    let corpseUid: string | undefined;
    if (this.consumesCorpse(skillId)) {
      const choices = this.corpseChoices(actorUid, skillId);
      if (choices.length > 0) {
        if (corpseArg && choices.some((c) => c.uid === corpseArg)) corpseUid = corpseArg;
        else if (debug) corpseUid = this.corpseToConsume(actorUid, skillId)?.uid;
        else if (!corpseArg) return { ok: false, reason: 'Choose a corpse to consume' };
        else return { ok: false, reason: this.corpseState.get(corpseArg) === 'consumed' ? 'Corpse was consumed' : 'Invalid corpse' };
      }
    }
    // Çağrının yuvası (skillUsed olayına da yazılır): seçilen ya da varsayılan; debug oynatmada yer yoksa herhangi bir boş yuva
    let summonSpot: number | null = null;
    if (this.needsSlotChoice(skillId)) {
      const okSlots = this.summonSlots(actorUid, skillId);
      const anyFree = this.freeSlots(this.summonBoard(actorUid, skillId));
      summonSpot = slot !== undefined && (okSlots.includes(slot) || (debug && anyFree.includes(slot))) ? slot : this.summonSlotFor(actorUid, skillId);
      if (summonSpot === null && debug) summonSpot = anyFree[0] ?? null;
    }
    const actor = this.get(actorUid)!;
    const skill = this.skill(skillId, actorUid)!;
    const f = this.setup.formulas;

    let targets = this.validTargets(actorUid, skillId);
    if (debug && targets.length === 0 && !this.needsSlotChoice(skillId)) return { ok: false, reason: skill.target === 'dead_ally' ? 'No fallen ally' : 'No target' };
    let centerSlot: number | undefined;
    let centerCells: number[] | undefined;
    const hit = new Set<string>();
    /** Bu skill'de en az bir KRİTİK vuruş alan hedefler (Omen critStacks). */
    const critHit = new Set<string>();
    const splashUids = new Set<string>();
    let stageGroups: AreaStage[] | undefined;
    let stageTargets: Combatant[][] | undefined;
    let areaBoard: Side | undefined;
    if (this.isAreaSkill(skillId, actor)) {
      // Anchor: seçilen birimin hücresi ya da (boş olabilen) seçilen hücre. Anchor birimi erişim dışında (arkada) da olabilir: yalnızca hücreyi belirler.
      // area_any (Smoke Bomb): tahta = anchor biriminin tahtası; `tile:<yuva>` = kendi tahtası; yoksa `boardArg` (varsayılan karşı taraf).
      const anyBoard = this.isAnyBoardArea(skillId, actor);
      const tileSlot = anyBoard ? slotOfTileUid(targetUid) : undefined;
      const anchorUnit = targetUid && tileSlot === undefined ? this.get(targetUid) : undefined;
      const board: Side = anyBoard ? (tileSlot !== undefined ? actor.side : anchorUnit && anchorUnit.hp > 0 ? anchorUnit.board : (boardArg ?? opposite(actor.side))) : opposite(actor.side);
      const anchor = anchorUnit && anchorUnit.hp > 0 && anchorUnit.board === board ? anchorUnit : undefined;
      const total = this.setup.formulas.formation.rows * this.setup.formulas.formation.lanes;
      const center = anchor ? anchor.slot : (tileSlot ?? slot ?? (debug ? targets.find((c) => c.board === board)?.slot ?? targets[0]?.slot : undefined));
      if (center === undefined || !Number.isInteger(center) || center < 0 || center >= total) return { ok: false, reason: 'Invalid target' };
      if (!debug && !fc && !this.inRange(actor, skill, board, center)) return { ok: false, reason: 'Out of range' };
      targets = this.areaWindowAt(actorUid, skillId, center, board);
      if (!debug && targets.length === 0) return { ok: false, reason: anyBoard && board === actor.side ? 'No ally in the area' : 'No target in the area' };
      centerSlot = center;
      areaBoard = board;
      centerCells = this.areaCells(skillId, center, board, actorUid);
      // Aşamalı vuruş: hedefler aşamalara bölünür (areaWindowAt zaten aşama sırasıyla döner)
      if (this.isStagedSkill(skillId, actor)) {
        const all = targets;
        const cellsByStage = this.areaStageCells(skillId, center, board, actorUid);
        stageTargets = cellsByStage.map((cells) => all.filter((c) => cells.includes(c.slot)));
        stageGroups = cellsByStage.map((cells, i) => ({ cells, targets: stageTargets![i]!.map((c) => c.uid) }));
      }
    } else if (skill.target === 'random_enemies') {
      // Rastgele (seed'li) farklı `count` düşman
      const pool = [...targets];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = this.rng.int(0, i);
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
      }
      // Faz 5a (C5 hedef önceliği; yalnızca ağaç kopyası): öncelikli düşmanlar başa (karıştırma sırası korunur), kalan yer rastgele
      if (skill.treePriority) this.prioritize(actor, pool, skill.treePriority);
      targets = pool.slice(0, skill.count ?? 3).sort((x, y) => x.slot - y.slot);
    } else if (this.needsTargetChoice(skillId, actor)) {
      const chosen = targets.find((c) => c.uid === targetUid) ?? (debug ? targets[0] : undefined);
      if (!chosen) {
        if (skill.excludeSelf && targetUid === actorUid) return { ok: false, reason: this.selfTargetReason(skill) };
        return { ok: false, reason: skill.target === 'dead_ally' && targetUid && this.corpseState.get(targetUid) === 'consumed' ? 'Corpse was consumed' : (targetUid && skill.requiresOpenBehind && this.targetProblem(actorUid, skillId, targetUid)) || 'Invalid target' };
      }
      targets = [chosen];
      // Yan vuruşlu (splash) skill: seçilen hedefin yanındaki hücreler de vurulur (ilk hedef = seçilen)
      for (const s of this.splashTargets(skillId, chosen, actorUid)) {
        targets.push(s);
        splashUids.add(s.uid);
      }
    }
    // Diriltme (madde 257): dirilen dostun hücresi = seçilen boş hücre (canUse/üstteki denetim geçerliliği sağladı); verilmezse varsayılan (reviveSlotFor:
    // kendi hücresi boşsa o, değilse en yakın boş hücre). Debug oynatmada geçersiz hücre de varsayılana düşer.
    let reviveSpot: number | null = null;
    if (this.isReviveSkill(skillId) && targets[0] && targets[0].hp <= 0) {
      const free = this.reviveSlots(actorUid, skillId);
      reviveSpot = slot !== undefined && free.includes(slot) ? slot : this.reviveSlotFor(actorUid, skillId, targets[0].uid);
      if (reviveSpot === null) return { ok: false, reason: 'No free cell' };
    }

    // Faz 5c (Hexer Turned Hand, rule turnedHand): Jinxed'i veren Hexer'in kuralı varsa saldırı YZ'nin seçtiği hedef yerine saldıranın kendi dostuna
    // (seed'li rastgele, kendisi hariç) tek hedef olarak iner; alan / aşama / yan vuruş düşer. Kuralsız savaşta zar atılmaz (akış birebir aynı)
    const turned = !debug && !fc && !skill.telegraph ? this.turnedHandAlly(actor, skill, targets) : null;
    if (turned) {
      targets = [turned.ally];
      centerSlot = undefined;
      centerCells = undefined;
      stageGroups = undefined;
      stageTargets = undefined;
      areaBoard = undefined;
      splashUids.clear();
    }
    // Faz 2c (Not Yet): hedefe bağlı bedel seçilen hedefle ödenir; canUse en ucuz hedefe baktı, seçilen hedefin bedeli yetmiyorsa kullanılamaz
    const costEnv = skill.cost.cond?.length ? { target: targets[0], host: this.condHost } : undefined;
    if (!debug && !fc && costEnv) {
      const need = this.thriftyFree(actor, skill.cost.resource) || this.nthSpellFree(actor, skill) ? 0 : skillCostAmount(skill.cost, actor, costEnv);
      const r = skill.cost.resource;
      if (r === 'mp' && !this.freeMp && actor.mp < need && !(skill.cost.hpFallback && actor.hp > hpFallbackAmount(skill.cost, actor))) return { ok: false, reason: 'Not enough MP' };
      if (r === 'rage' && !this.freeRage && (actor.rage ?? 0) < need) return { ok: false, reason: 'Not enough rage' };
      if (r === 'hp' && actor.hp <= need) return { ok: false, reason: 'Not enough HP' };
    }
    const events: BattleEvent[] = [];
    const parentEmit = fc ? this.freeEmit : null;
    // Aşamalı skill: aşama sürerken çıkan HER olay aşama numarasını taşır (stage)
    let stage: number | undefined;
    const emit: Emit = (e) => {
      const ev: BattleEvent = stage === undefined ? e : { ...e, stage };
      events.push(ev);
      if (parentEmit) parentEmit(ev);
      else this.record(ev);
    };

    // Test modu: kaynağın bekleyen telgrafları bir sonraki eyleminden ÖNCE çözülür (turns modunda tur başında)
    if (!debug && !fc && this.mode === 'test') this.resolveTelegraphsOf(actor, emit);
    if (!debug && !fc) this.observer?.before?.({ kind: 'skill', actorUid, id: skillId, targetUids: targets.map((t) => t.uid), ...(centerSlot !== undefined ? { center: centerSlot, cells: centerCells } : {}), ...(areaBoard && skill.target === 'area_any' ? { board: areaBoard } : {}) });
    // Backstab (requiresOpenBehind): görsel ışınlanma hücresi (hedefin arkası) ve dönüş hücresi; gerçek yer değiştirme yok
    const backTarget = skill.requiresOpenBehind ? targets[0] : undefined;
    const behind = backTarget ? this.behindSlotOf(backTarget) : null;
    emit({
      type: 'skillUsed',
      actor: actor.uid,
      skill: skill.id,
      targets: targets.map((t) => t.uid),
      ...(centerSlot !== undefined ? { center: centerSlot, anchor: centerSlot, cells: centerCells } : {}),
      ...(stageGroups ? { stages: stageGroups } : {}),
      ...(areaBoard && skill.target === 'area_any' ? { board: areaBoard } : {}),
      ...(backTarget && behind !== null ? { behindSlot: behind, behindBoard: backTarget.board, from: actor.slot } : {}),
      ...(summonSpot !== null ? { slot: summonSpot } : reviveSpot !== null ? { slot: reviveSpot } : {}),
      ...(corpseUid ? { corpseUid } : {}),
      ...(this.turnCostOf(skill.id, actor.uid) < 1 ? { turnCost: this.turnCostOf(skill.id, actor.uid) } : {}),
    });

    if (turned) {
      this.turnedJinx.add(turned.st); // "sıradaki saldırı": aynı Jinxed ikinci kez çevirmez (ağaç Jinxed'i birden çok saldırı tutsa da)
      this.treeProc(turned.owner, turned.node);
    }
    if (!debug && !fc && this.mode === 'turns' && !this.noCooldowns && (skill.cooldown ?? 0) > 0) actor.cooldowns[skill.id] = skill.cooldown!;

    const resource = skill.cost.resource;
    // Thrifty (item etkisi firstSkillFree): savaştaki ilk skill'in MP bedeli 0; ilk skill kullanıldıktan sonra normal
    // Staff of the Last Ember (nthSpellFree): her N. büyü (MP bedelli skill) bedelsiz ve güçlü
    const lastEmber = !debug && !fc && this.nthSpellFree(actor, skill);
    if (!debug && !fc && effFirst(actor, 'nthSpellFree') && skill.cost.resource === 'mp' && skillCostAmount(skill.cost, actor) > 0) actor.spellCount = (actor.spellCount ?? 0) + 1;
    if (lastEmber) {
      actor.empowerMult = effFirst(actor, 'nthSpellFree')!.power;
      emit({ type: 'passive', actor: actor.uid, passive: 'last_ember', name: 'The Last Ember' });
    }
    const cost = fc || this.thriftyFree(actor, resource) || lastEmber ? 0 : skillCostAmount(skill.cost, actor, costEnv); // oranlı bedel (Wail: mevcut canın %20'si) ödeme anındaki kaynaktan
    // Headsman's Blow (powerPerRage): hasar, ödemeden önceki Rage'e göre (spendAll ile tamamı harcanır; freeRage debug'ında Rage aynı kalır)
    this.castRage = skill.effects.some((e) => e.type === 'damage' && e.powerPerRage) ? (actor.rage ?? 0) : null;
    if (!debug && !fc && effFlag(actor, 'firstSkillFree') && !actor.freeSkillUsed) {
      actor.freeSkillUsed = true;
      if (resource === 'mp' && skillCostAmount(skill.cost, actor) > 0) emit({ type: 'passive', actor: actor.uid, passive: 'thrifty', name: 'Thrifty' });
    }
    // Skill ağacı bedel koşulları (SkillCost.cond): ölçüm + silahlanmış koşul harcanır (bedel yukarıda zaten koşullu hesaplandı)
    if (!debug && !fc && skill.cost.cond) this.payCostConds(actor, skill, targets[0]);
    // Soul Exchange (cost.hpFallback): MP yetmiyorsa bedel kendiliğinden mevcut canın oranından ödenir (can olayı, payHp tetiği, hpPaid; seçim yok)
    const paidRes: typeof resource = resource === 'mp' && skill.cost.hpFallback && !debug && !this.freeMp && cost > 0 && actor.mp < cost ? 'hp' : resource;
    const paidAmt = paidRes !== resource ? hpFallbackAmount(skill.cost, actor) : cost;
    if (!debug && paidAmt > 0 && !(paidRes === 'mp' && this.freeMp) && !(paidRes === 'rage' && this.freeRage)) {
      const resource = paidRes;
      const cost = paidAmt;
      if (resource === 'rage') {
        actor.rage = (actor.rage ?? 0) - cost;
        emit({ type: 'rage', actor: actor.uid, delta: -cost, after: actor.rage, max: actor.maxRage ?? 0 });
      } else {
        const before = actor[resource];
        actor[resource] -= cost;
        emit({ type: 'resource', actor: actor.uid, resource, amount: cost, after: actor[resource] });
        // Faz 4a: bedel tetikleri (can ödendi: payHp; MP eşiğin altına ilk iniş: mpBelow)
        if (this.trigOn && resource === 'hp') this.trig([actor], { on: 'payHp', skill: skill.id, amount: cost, inCast: true, ...(targets[0] ? { target: targets[0] } : {}) }, emit);
        if (this.trigOn && resource === 'mp' && actor.maxMp > 0) this.trig([actor], { on: 'mpBelow', skill: skill.id, amount: cost, inCast: true, before: before / actor.maxMp, after: actor.mp / actor.maxMp }, emit);
      }
    }
    // Ağaçlı savaş: bu kullanımda ödenen Rage (cond rageSpentAtLeast / rageSpentLastTurn) ve skill'in hedefleri (ölçek hitWithStatus)
    if (this.treeUnits) {
      const paid = !debug && resource === 'rage' && !this.freeRage ? cost : 0;
      this.castPaid = { uid: actor.uid, rage: paid };
      if (paid > 0) this.curRage.set(actor.uid, paid);
      this.condTargetList = targets;
      this.castInfo = { skill: skill.id, landed: new Set(), kills: 0, hpPaid: !debug && paidRes === 'hp' ? paidAmt : 0, silenced: 0, buffsRemoved: 0, healedRatios: [] };
      this.preHitDone = skill.effects.some((e) => e.type === 'status' && e.preHit) ? new Set() : null;
    }
    // Skill ağacı (plan 10a): hasarı kaldırılan skill (treeHitRoll) yine isabet zarı atar; düşman hedefe durumlar yalnızca isabet edince işler
    const preRolled = !!skill.treeHitRoll && !skill.effects.some((e) => e.type === 'damage');
    if (preRolled && !skill.telegraph) {
      for (const t of targets) {
        if (t.side === actor.side || t.hp <= 0) continue;
        const o = hitOutcome(this.effectiveStats(actor), this.effectiveStats(t), f, this.rng.next());
        if (o === 'hit') {
          hit.add(t.uid);
          this.castInfo?.landed.add(t.uid);
          // Faz 2c (Eye of Ruin): hasar kalksa da kritik zarı atılır (kritik isabet critStacks verir: "3 on a crit")
          if (rollCrit(this.effectiveStats(actor), this.rng).crit) critHit.add(t.uid);
        } else {
          emit({ type: o, source: actor.uid, target: t.uid });
          this.noteMiss(actor, t);
        }
      }
    }
    const gated = (c: Combatant) => !preRolled || c.side === actor.side || hit.has(c.uid);
    // Faz 5a (Gathering Mark / Mark of Many): etkilerden ÖNCE başka düşmanlardan hedefe yığın çekilir (yalnızca ağaç kopyası)
    if (skill.treeGather && targets[0] && targets[0].hp > 0 && targets[0].side !== actor.side && !skill.telegraph) this.gatherStacks(actor, targets[0], skill.treeGather, emit);

    // Rage'li kullanıcı: bu skill'in isabet eden hasar vuruşları hedef başına toplanır (strike doldurur), skill bitince tek kazanç olarak işlenir
    this.rageTally = !debug && actor.maxRage !== undefined ? new Map() : null;
    this.castingSkill = skill; // strike'ın skill'e bakan pasifleri (Rebuke: yakın dövüş) için
    this.castingActor = actor;
    // Doom Mark: vuruşu ya da patlaması hedefi öldürürse hedefin Omen'leri silinir, Ill Omen çalışmaz
    this.noTransferKill = skill.effects.some((e) => e.type === 'detonate' && e.noTransferOnKill) ? new Set(targets.map((c) => c.uid)) : null;
    // Aşamasız skill tek grup (tüm hedefler). Aşamalı skill: her aşama sırayla tüm etkileri uygular (aşama başına bir kez çalışması sorun olan
    // etkiler (bahis, kalkan tüketme, mana çalma kazancı, kendine etkiler) aşamalı skill'de veri doğrulamasıyla yasak: stagedEffectProblem).
    // Telgraflı skill: etkiler şimdi uygulanmaz (grup yok); aşağıda telgraf kurulur, sahibin sonraki turunda çözülür
    const groups: Array<{ targets: Combatant[]; cells?: number[] }> = skill.telegraph ? [] :
      stageTargets && stageGroups ? stageTargets.map((ts, i) => ({ targets: ts, cells: stageGroups![i]!.cells })) : [{ targets, ...(centerCells ? { cells: centerCells } : {}) }];
    let repeatAnnounced = false;
    // endsOnOwnAttack (Jinxed): bu hasar skill'inin TÜM vuruşları durumdan etkilenir, skill bitince durum düşer
    const ownAttackEnds = skill.effects.some((e) => e.type === 'damage') ? actor.statuses.filter((s) => this.statusDef(s.kind)?.endsOnOwnAttack || (s.potency?.oneAttack ?? 0) > 0) : []; // Altıncı tur: potency oneAttack (Distracting Fan)
    const hitIndex = new Map<SkillEffect, number>(); // etki başına toplam vuruş sırası (falloff ve ilk-hedef ekleri aşamalar boyunca sürer)
    for (const [gi, group] of groups.entries()) {
    stage = stageGroups ? gi : undefined;
    for (const effect of skill.effects) {
      const ts = this.effectTargets(skill, effect, group.targets, actor);
      switch (effect.type) {
        case 'damage': {
          // Bahis: skill başına bir kez zar atılır; kazanç/kayıp çarpanı tüm vuruşlara uygulanır
          let betMult = 1;
          if (effect.bet) {
            // Skill ağacı bahis yaması (winChance / winSet / stakeMul); kancasızda aynı zar
            const tb = actor.treeHooks ? this.treeBet(actor, ts[0], skill, effect.bet, true) : null;
            betMult = this.rollBet(actor, tb?.bet ?? effect.bet, emit, tb?.stakeMul ?? 1);
            if (tb?.nodes.length) this.treeProcAll(actor.uid, tb.nodes);
          }
          const base = hitIndex.get(effect) ?? 0;
          hitIndex.set(effect, base + ts.length);
          if (betMult > 0) {
            ts.forEach((target, i) => {
              const idx = base + i;
              if (target.hp <= 0 || actor.hp <= 0) return; // Rebuke (mob pasifi) saldıranı vuruş ortasında öldürebilir
              // Şerit skill'inde her yeni hedef bir öncekinin `falloff` katı hasar alır (öndekinden arkadakine)
              // Skill ağacı: vuruş bilgisi (sıra / merkez / tekrar) ve bu hedefin falloff eki / Double Hit eki; kancasızda ifade birebir eski
              const isCenter = centerSlot !== undefined ? target.board === areaBoard && target.slot === centerSlot : undefined;
              // Faz 5a (Thrown Stiletto): requiresOpenBehind gevşetilmiş skill'de arkası dolu hedefe vuruş = fırlatma
              const thrown = !!skill.treeThrown && this.openBehindProblem(target) !== null;
              const hi = (extra: HitInfo): HitInfo | undefined => (actor.treeHooks ? { index: idx, ...(isCenter !== undefined ? { center: isCenter } : {}), mpBefore: target.mp, ...(thrown ? { thrown: true } : {}), ...extra } : undefined);
              const tmT = actor.treeHooks ? this.treeMods(actor, target, skill, effect, { hit: hi({})! }) : null;
              const fo = effect.falloff && tmT?.falloffAdd ? effect.falloff + tmT.falloffAdd : effect.falloff;
              const mult = (fo ? Math.pow(fo, idx) : 1) * betMult * (splashUids.has(target.uid) ? skill.splash?.mult ?? 1 : 1);
              const r = this.strike(actor, target, effect, emit, mult, idx === 0, false, hi({ ...(isCenter ? { centerHit: 1 } : {}) }));
              if (r.landed) hit.add(target.uid);
              if (r.crit) critHit.add(target.uid);
              // X şekli gibi: anchor (merkez) hücredeki birim hitsAtCenter kez vurulur (her vuruş ayrı isabet/hasar/kritik zarı)
              // Faz 5a (Butcher's Cross): hitsEach = alandaki HER birim o kadar kez (merkez: hitsAtCenter ile büyüğü); yoksa ifade aynen
              const atCenter = centerSlot !== undefined && target.board === areaBoard && target.slot === centerSlot;
              const each = skill.area?.hitsEach;
              if (atCenter || each !== undefined) {
                const times = atCenter ? Math.max(skill.area?.hitsAtCenter ?? 1, each ?? 1) : each!;
                for (let k = 1; k < times && target.hp > 0; k++) {
                  const rc = this.strike(actor, target, effect, emit, mult, false, false, hi(atCenter ? { centerHit: k + 1 } : {}));
                  if (rc.landed) hit.add(target.uid);
                  if (rc.crit) critHit.add(target.uid);
                }
              }
              // Çifte vuruş: aynı vuruş bir kez daha (zar her hedef için bir kez atılır)
              const rch = tmT?.repeat ? Math.min(1, (effect.repeatChance ?? 0) + tmT.repeat) : effect.repeatChance;
              const rolledRep = !!rch && this.rng.next() < rch;
              if (!rolledRep && rch && this.trigOn && target.hp > 0) this.trig([actor], { on: 'repeatFail', target, subject: target, skill: skill.id }, emit);
              if (rolledRep && target.hp > 0) {
                if (!repeatAnnounced) {
                  repeatAnnounced = true;
                  emit({ type: 'passive', actor: actor.uid, passive: 'gamble_double', name: 'Double Hit' });
                }
                const r2 = this.strike(actor, target, effect, emit, mult, false, false, hi({ repeat: 1 }));
                // Faz 5a (Boxcars): olay miktarı = tekrar sırası (1 = ilk tekrar, zar sayısı - 1)
                if (this.trigOn) this.trig([actor], { on: 'repeat', target, subject: target, skill: skill.id, amount: 1 }, emit);
                if (r2.landed) hit.add(target.uid);
                if (r2.crit) critHit.add(target.uid);
                // Faz 5a (Endless Rattle): repeatChain kuralı: tutan her tekrar aynı şansla yeniden zarlanır (motor güvenlik sınırı 8)
                if (actor.treeHooks && this.rulesOf(actor, 'repeatChain').length) {
                  for (let n = 2; n <= 8 && target.hp > 0 && actor.hp > 0 && this.rng.next() < rch!; n++) {
                    const rn = this.strike(actor, target, effect, emit, mult, false, false, hi({ repeat: n }));
                    if (this.trigOn) this.trig([actor], { on: 'repeat', target, subject: target, skill: skill.id, amount: n }, emit);
                    if (rn.landed) hit.add(target.uid);
                    if (rn.crit) critHit.add(target.uid);
                  }
                }
              }
            });
          }
          // Shield Crush gibi: kullanıcının kalkanı tüm hedefler vurulduktan sonra tüketilir
          if (effect.bonusFromShield?.consume && actor.shield > 0) {
            const spent = actor.shield;
            actor.shield = 0;
            this.trimShieldHooks(actor);
            emit({ type: 'shield', source: actor.uid, target: actor.uid, amount: -spent, shieldAfter: 0, magicShieldAfter: actor.magicShield, magic: false });
          }
          break;
        }
        case 'heal':
          for (const target of ts) {
            if (target.hp <= 0) continue;
            if (this.castInfo && this.castPaid?.uid === actor.uid) this.castInfo.healedRatios.push(target.maxHp > 0 ? target.hp / target.maxHp : 1);
            const hm = actor.stats.healPowerMult; // Support power (affix): yoksa güç aynen
            const base = rollHeal(actor.stats, effect.scale, hm !== undefined && hm !== 1 ? effect.power * hm : effect.power, f, this.rng);
            const { crit, mult } = rollCrit(this.effectiveStats(actor), this.rng); // kritik: şifanın SON çarpanı (geçerli kritik şansı: Misfortune/Jinxed dahil)
            // missingHpBonus (Radiance): hedef başına eksik can oranıyla artar; alan yoksa ifade birebir eskisi (QB/MP determinizmi)
            const low = effect.missingHpBonus ? missingHpHealMult(effect.missingHpBonus, target.hp, target.maxHp) : 1;
            // Faz 5a: bedava kullanımın gücü (Verdant Link / Twin Ward) şifaya da; normal kullanımda fc yok
            const healed = this.applyHeal(actor, target, Math.round((low === 1 ? base * mult : base * mult * low) * (fc?.power ?? 1)), crit, emit);
            if (this.treeUnits && !this.castHealed.has(target.uid)) this.castHealed.set(target.uid, healed);
          }
          break;
        case 'revive':
          for (const target of ts) {
            if (target.hp > 0) continue;
            // Madde 257: dirilen seçilen boş hücreye gelir (ceset hücresi dolu olabilir); hücre bu skill'de yalnızca ilk (seçilen) ölü için anlamlı
            const from = target.slot;
            const to = reviveSpot !== null && target === targets[0] ? reviveSpot : target.slot;
            target.board = target.side;
            target.slot = to;
            target.hp = Math.max(1, Math.round(target.maxHp * effect.hpRatio));
            target.mp = Math.round(target.maxMp * effect.mpRatio);
            target.shield = 0;
            target.magicShield = 0;
            delete target.shieldHooks;
            target.statuses = [];
            target.turnCounter = 0;
            if (target.maxRage !== undefined) target.rage = 0;
            this.announcedDead.delete(target.uid);
            this.clearCorpse(target.uid);
            emit({ type: 'revive', source: actor.uid, target: target.uid, hpAfter: target.hp, mpAfter: target.mp, slot: to, from });
            if (this.trigOn) this.trig([actor], { on: 'revived', target, subject: target, skill: skill.id }, emit);
            // Diriltme sonrası yenilenme (veri: revive.regen): sonraki `turns` turunun başında maks canın `ratio`'su (sabit, kritiksiz; durum olayı cause 'revival')
            if (effect.regen && effect.regen.turns > 0 && effect.regen.ratio > 0) {
              const amount = Math.max(1, Math.round(target.maxHp * effect.regen.ratio));
              this.addStatus(target, { kind: 'regen', turns: effect.regen.turns, source: actor.uid, amount, critChance: 0, critMult: 1, cause: 'revival' }, emit, 'revival');
            }
          }
          break;
        case 'hot':
          for (const target of ts) {
            if (target.hp <= 0) continue;
            this.addStatus(
              target,
              {
                kind: 'regen',
                turns: effect.turns,
                source: actor.uid,
                amount: Math.round(attributePower(actor.stats, effect.scale, f) * (actor.stats.healPowerMult !== undefined && actor.stats.healPowerMult !== 1 ? effect.power * actor.stats.healPowerMult : effect.power)),
                critChance: this.effectiveStats(actor).critChance,
                critMult: actor.stats.critMult,
                ...(this.treeUnits && this.castHealed.has(target.uid) ? { first: this.castHealed.get(target.uid) } : {}),
              },
              emit,
            );
          }
          break;
        case 'shield':
          for (const target of effect.self ? [actor] : ts) {
            if (target.hp <= 0 || target.inert) continue; // sıra almayan yardımcı nesne kalkan almaz
            const sm = actor.stats.shieldPowerMult; // Shield / Support power (affix): kaynağı bu birim olan her kalkan; yoksa güç aynen
            const amount0 = shieldAmount(actor.stats, effect.scale, sm !== undefined && sm !== 1 ? effect.power * sm : effect.power, f) + Math.round((effect.bonusPerMana ?? 0) * actor.mp); // kritik uygulanmaz
            // Faz 4a C4 (shieldDealt): verenin kalkan çarpanı (Rimeguard); kancasızda miktar aynen
            const shNodes: string[] = [];
            const shMul = this.healOn && actor.treeHooks ? this.treeShieldMult(actor, target, skill, shNodes) : 1;
            const amount1 = shMul !== 1 ? Math.max(0, Math.round(amount0 * shMul)) : amount0;
            const amount = fc && fc.power !== 1 ? Math.max(0, Math.round(amount1 * fc.power)) : amount1; // Faz 5a: bedava kullanımın gücü (Split Ward)
            if (shNodes.length) this.treeProcAll(actor.uid, shNodes);
            const magic = effect.shieldType === 'magic';
            this.trimShieldHooks(target);
            if (magic) target.magicShield += amount;
            else target.shield += amount;
            // Kancalı kalkan (onAbsorb): havuzun bu kısmı bu skill'e ait; aynı atanın aynı skill'i yeniden atılırsa katman büyür
            // Faz 4a: kalkan tetiği / C4 kalkan süzgeci taşıyan atanın kalkanı da katman olarak izlenir (onAbsorb boş; ağaçsızda aynı)
            if ((effect.onAbsorb || (this.treeUnits && this.treeShieldLayer(actor))) && amount > 0) {
              const hooks = (target.shieldHooks ??= []);
              const same = hooks.find((h) => h.skill === skill.id && h.caster === actor.uid && h.magic === magic);
              if (same) {
                same.amount += amount;
                if (this.treeUnits) same.size = same.amount;
                this.shieldFired.delete(same); // yeniden atılan kalkan: 'perShield' tetikleri yeniden işler
              } else hooks.push({ skill: skill.id, caster: actor.uid, magic, amount, onAbsorb: { ...(effect.onAbsorb ?? {}) }, ...(this.treeUnits ? { size: amount } : {}) });
            }
            emit({ type: 'shield', source: actor.uid, target: target.uid, amount, shieldAfter: target.shield, magicShieldAfter: target.magicShield, magic });
          }
          break;
        case 'dispel': {
          // Faz 2c: hasardan SONRA gelen silme yalnızca isabet edilen düşmana (Prying Blade); koşullu etki (when) alıcı başına. Veride hasarlı dispel yok
          const dmgGate = this.damageBefore(skill, effect);
          for (const target of effect.self ? [actor] : ts) {
            if (target.hp <= 0 || !gated(target)) continue;
            if (dmgGate && !effect.self && target.side !== actor.side && !hit.has(target.uid)) continue;
            if (effect.when && !this.effWhen(actor, effect, target, skill)) continue;
            const gone = this.dispel(target, effect.status, effect.count, actor, skill.id, emit, effect.kinds, effect.random);
            if (this.castInfo && effect.status === 'buff' && target.side !== actor.side) this.castInfo.buffsRemoved += gone.length;
          }
          break;
        }
        case 'bond':
          for (const target of ts) {
            if (target.hp <= 0 || target.uid === actor.uid) continue;
            this.formBond(actor, target, effect.turns, effect.ratio, emit, effect.permanent);
          }
          break;
        case 'manaBurn': {
          let total = 0;
          // Vuruşa bağlı yakım / çalma (Mana Steal; Ömer 2026-10-11): hasar veren skill'de yalnızca GERÇEKTEN isabet edilen hedefler (iska / kaçınma /
          // Lucky Escape = yakım yok; alan skill'inde her hedef ayrı). Hasarsız yakım (Drain Field) isabet zarı atmaz, tüm hedeflere işler.
          const burnHit = skill.effects.some((e) => e.type === 'damage');
          for (const target of ts) {
            if (target.hp <= 0) continue;
            if (burnHit && !hit.has(target.uid)) continue;
            if (!gated(target)) continue;
            // Yakım: sabit `amount` ya da hedefin maks MP'sinin `pctMax` oranı (madde 260), mevcut MP'yle sınırlı
            // Skill ağacı (burn grubu): yakıma düz ek / çarpan, boşalma zarı eki / sabiti; kancasızda ifade birebir eski
            // Faz 2c: mana yakma noktasında vuruş bilgisi (merkez hücre: Focused Siphon, Heart of Quiet; yakım öncesi MP)
            const burnCenter = centerSlot !== undefined ? target.board === areaBoard && target.slot === centerSlot : undefined;
            const bm = actor.treeHooks ? this.sumHooks(actor, target, skill, 'burn', { roll: true, hit: { ...(burnCenter !== undefined ? { center: burnCenter } : {}), mpBefore: target.mp } }) : null;
            const mpBefore = target.mp;
            const burned0 = burnAmountFor(effect, target);
            const burned = bm && (bm.sum.manaBurnAdd || bm.sum.manaBurnMul !== undefined) ? Math.min(target.mp, Math.max(0, Math.round((burned0 + (bm.sum.manaBurnAdd ?? 0)) * (bm.sum.manaBurnMul ?? 1)))) : burned0;
            const empties = burned !== burned0 ? !!effect.onEmpty && target.hp > 0 && target.maxMp > 0 && target.mp - burned <= 0 : emptyProcApplies(effect, target);
            if (bm?.nodes.length) this.treeProcAll(actor.uid, bm.nodes);
            if (burned > 0) {
              target.mp -= burned;
              total += burned;
              emit({ type: 'manaBurn', source: actor.uid, target: target.uid, amount: burned, mpAfter: target.mp });
              if (this.trigOn) {
                this.trig([actor], { on: 'manaBurned', target, subject: target, skill: skill.id, amount: burned }, emit);
                if (mpBefore > 0 && target.mp <= 0) this.trig([actor], { on: 'mpEmptied', target, subject: target, skill: skill.id, amount: burned }, emit);
              }
            }
            // Mana boşaldı (bu yakımla 0'a indi ya da zaten 0'dı): hedef başına bağımsız zar; tutarsa durum (Silence) + isabet zarsız hasar
            const spec = effect.onEmpty;
            if (!spec || !empties) continue;
            const ech = bm && (bm.set.emptySet !== undefined || bm.sum.emptyChance) ? Math.max(0, Math.min(1, bm.set.emptySet ?? spec.chance + (bm.sum.emptyChance ?? 0))) : spec.chance;
            const success = this.rng.next() < ech;
            emit({ type: 'emptyProc', source: actor.uid, target: target.uid, skill: skill.id, chance: ech, success, status: spec.status });
            if (!success) continue;
            // Faz 2c: ağaçlı kullanıcıda boşalma durumu da durum kancasından geçer (Long Quiet: süre eki; Silence sayımı applyTreeStatus'ta)
            if (actor.treeHooks) this.applyTreeStatus(actor, target, skill, { type: 'status', status: spec.status, turns: spec.turns }, spec.status, spec.turns, 1, emit);
            else {
              this.addStatus(target, { kind: spec.status, turns: spec.turns, source: actor.uid }, emit);
              if (spec.status === 'silence' && this.castInfo && this.castPaid?.uid === actor.uid && target.statuses.some((x) => x.kind === 'silence')) this.castInfo.silenced++;
            }
            // Boşalma hasarı (ağaç kaldırabilir: Shallow Net; yoksa hasar yok, en az 1 hasar kuralı işlemez)
            if (spec.damage) this.strike(actor, target, { type: 'damage', ...spec.damage }, emit, 1, false, true, actor.treeHooks ? { mpBefore } : undefined);
          }
          const gain = Math.min(Math.floor(total * (effect.gainRatio ?? 0)), actor.maxMp - actor.mp);
          if (gain > 0) {
            actor.mp += gain;
            emit({ type: 'mpRegen', actor: actor.uid, amount: gain, after: actor.mp });
          }
          break;
        }
        case 'taunt':
          // Faz 2c (Ward Taunt): koşullu taunt, grubun hedeflerinden biri koşulu tutarsa
          if (effect.when && !ts.some((t) => this.effWhen(actor, effect, t, skill))) break;
          this.addStatus(actor, { kind: 'taunt', turns: effect.turns, source: actor.uid, taken: 0, ...(effect.allyDamageMult !== undefined ? { allyMult: effect.allyDamageMult } : {}), ...(effect.breakRatio ? { breakAt: Math.max(1, Math.round(actor.maxHp * effect.breakRatio)) } : {}) }, emit);
          break;
        case 'guard':
          for (const target of ts) {
            if (target.hp <= 0 || (effect.when && !this.effWhen(actor, effect, target, skill))) continue;
            // Faz 2c (Blood Oath): bağa bağlı guard yalnızca kullanıcının bağladığı dosta, süresiz; bağ bitince / kopunca kalkar (dropBondGuards)
            if (effect.bond) {
              if (target.uid === actor.uid || !target.statuses.some((s) => s.kind === 'dark_bond' && s.source === actor.uid)) continue;
              this.addStatus(target, { kind: 'guard', turns: effect.turns, source: actor.uid, share: effect.share, permanent: true, bond: true }, emit);
            } else this.addStatus(target, { kind: 'guard', turns: effect.turns, source: actor.uid, share: effect.share, ...(effect.armorPct ? { armorPct: effect.armorPct } : {}) }, emit);
          }
          // Faz 5a (Second Chain): kullanıcının kendi sırasındaki dostlar da korunur (ikinci Guard kümesi; seçilenler ve kullanıcı hariç)
          if (effect.ownRow && !effect.bond) {
            for (const c of this.living(actor.side)) {
              if (c === actor || c.inert || c.board !== actor.board || this.rowOf(c.slot) !== this.rowOf(actor.slot) || ts.includes(c)) continue;
              this.addStatus(c, { kind: 'guard', turns: effect.turns, source: actor.uid, share: effect.share, ...(effect.armorPct ? { armorPct: effect.armorPct } : {}) }, emit);
            }
          }
          break;
        case 'status': {
          // Hasar veren skill'lerde yalnızca gerçekten vurulanlar; hasar yoksa (saf buff/debuff) tüm hedefler
          const hasDamage = skill.effects.some((e) => e.type === 'damage');
          // preHit (Gore Wheel): strike vuruştan önce uyguladı
          if (effect.preHit && hasDamage && !effect.self) break;
          // Faz 2c: isabet koşulu yalnızca bu etkiden ÖNCE hasar varsa (Shrapnel Shell: hasar eklenen Smoke Bomb'un dostlara Shrouded'ı bozulmaz);
          // koşullu etki (when): hedefe gidende alıcı başına, kendine gidende grubun hedeflerinden biri
          if (effect.self && effect.when && !ts.some((t) => this.effWhen(actor, effect, t, skill))) break;
          const recipients0 = effect.self ? [actor] : this.damageBefore(skill, effect) ? ts.filter((c) => hit.has(c.uid)) : ts.filter(gated);
          const recipients1 = effect.when && !effect.self ? recipients0.filter((r) => this.effWhen(actor, effect, r, skill)) : recipients0;
          // Faz 8 (Stacked Deck: Stun yalnızca ilk karta): yalnızca grubun ilk hedefi
          const recipients = effect.firstOnly && !effect.self ? recipients1.filter((r) => r === group.targets[0]) : recipients1;
          // `chance`: her (canlı) alıcı için BAĞIMSIZ zar (alıcı başına bir rng sayısı; chance yoksa/1 ise zar atılmaz, akış eskisiyle aynı)
          const chance = effect.chance ?? 1;
          for (const r of recipients) {
            if (r.hp <= 0) continue;
            // Skill ağacı C1 (durum uygulama noktası): koşullu süre / şans / büyüklük / süresiz alıcı başına; kancası yoksa ifade birebir eski
            if (this.applyTreeStatus(actor, r, skill, effect, effect.status, effect.turns, chance, emit, effect.cause) && effect.treeNode) this.treeProc(actor.uid, effect.treeNode);
          }
          break;
        }
        case 'randomStatus': {
          const recipients = this.damageBefore(skill, effect) ? ts.filter((c) => hit.has(c.uid)) : ts.filter(gated);
          const total = effect.options.reduce((a, o) => a + o.weight, 0);
          for (const r of recipients) {
            if (r.hp <= 0 || total <= 0) continue;
            this.rollRandomStatus(actor, r, skill, effect, emit, r === group.targets[0]);
            if (effect.treeNode) this.treeProc(actor.uid, effect.treeNode);
          }
          break;
        }
        case 'pull': {
          // Chain Hook (M6): isabet eden hedef kendi şeridinin en öndeki boş hücresine çekilir (önünde boş hücre yoksa yerinde kalır)
          const hasDamage = skill.effects.some((e) => e.type === 'damage');
          // Faz 5a (Grasp and Drag): yalnızca alanın arka sırasındakiler, bir sıra öne (önündeki hücre boşsa)
          let pulled = hasDamage ? ts.filter((c) => hit.has(c.uid)) : ts;
          if (effect.areaBack && pulled.length) {
            const back = Math.max(...ts.map((c) => this.rowOf(c.slot)));
            pulled = pulled.filter((c) => this.rowOf(c.slot) === back);
          }
          for (const r of pulled) {
            const to = r.hp <= 0 ? null : effect.to === 'stepForward' ? this.stepForwardSlot(r) : this.pullDestination(r);
            if (to === null) continue;
            const from = r.slot;
            r.slot = to;
            emit({ type: 'moved', actor: r.uid, from, to, cause: skill.id, by: actor.uid });
          }
          break;
        }
        case 'ground': {
          // Tek hedefli skill (D7, Tainted Bait): zemin hedefin hücresine (hedefin tahtası) konur; alan skill'inde şeklin hücreleri
          const single = centerSlot === undefined && skill.target === 'single_enemy' ? ts[0] : undefined;
          // Faz 5a (Banshee's Toll; yalnızca ağaçla hedefi değişen skill): alansız çok hedefli kullanımda zemin hedeflerin hücrelerine
          const spread = centerSlot === undefined && !single && this.treeUnits && actor.skillDefs?.[skill.id] && (skill.target === 'all_enemies' || skill.target === 'random_enemies') ? ts.filter((c) => c.board === opposite(actor.side)).map((c) => c.slot).sort((x, y) => x - y) : null;
          if (centerSlot === undefined && !single && !spread?.length) break;
          // area_any (D11 Radiance): zemin alanın atıldığı tahtaya; `side` o tahtanın tarafına uymuyorsa konmaz (dost zemini yalnızca kendi tahtana)
          const groundBoard: Side = single ? single.board : skill.target === 'area_any' && areaBoard ? areaBoard : opposite(actor.side);
          if (skill.target === 'area_any' && effect.side && (effect.side === 'allies') !== (groundBoard === actor.side)) break;
          const slots0 = single ? [single.slot] : spread?.length ? spread : (group.cells ?? this.areaCells(skillId, centerSlot!, groundBoard, actorUid));
          // Faz 5a (Sea of Fire): alanın dört yönden değdiği hücreler de (aynı tahta)
          const slots = effect.treeWide === 'touch' ? this.touchingSlots(slots0) : slots0;
          const g: GroundEffect = {
            id: `g${this.groundCount++}`,
            ground: effect.ground,
            board: groundBoard,
            slots,
            turns: effect.turns,
            source: actor.uid,
            sourceSide: actor.side,
            amount: Math.round(attributePower(actor.stats, effect.scale, f) * effect.power * (fc?.power ?? 1)),
            scale: effect.scale,
            sourceStat: actor.stats[effect.scale],
            power: effect.power,
            ...(effect.permanent ? { permanent: true } : {}),
            ...(this.treeUnits ? { age: 0 } : {}),
          };
          // Faz 4c (ağaç): gücü 0 olan zemin hasar vermez (yalnızca durum), tur başı ek durumlar, hücre başına güç (merkez / üst üste)
          if (this.treeUnits) {
            if (g.amount <= 0) g.noDamage = true;
            if (effect.statuses?.length) g.statuses = effect.statuses.map((x) => ({ ...x }));
            if (effect.centerMult !== undefined && effect.centerMult !== 1 && centerSlot !== undefined && slots.includes(centerSlot)) (g.cellMult ??= {})[centerSlot] = effect.centerMult;
            if (effect.stackMult !== undefined && effect.stackMult !== 1) this.stackGround(g, effect.stackMult, emit);
          }
          this.ground.push(g);
          emit({ type: 'ground', id: g.id, ground: g.ground, board: g.board, slots: g.slots, turns: g.turns });
          break;
        }
        case 'omen': {
          // Yığın (Omen): yalnızca isabet edenlere; kritik vuruş alana critStacks. Aynı skill'de detonate varsa otomatik Doom bastırılır (çift patlama yok)
          const kind = effect.status ?? 'omen';
          const hasDamage = skill.effects.some((e) => e.type === 'damage');
          const recipients = hasDamage ? ts.filter((c) => hit.has(c.uid)) : ts;
          const auto = !skill.effects.some((e) => e.type === 'detonate' && e.status === kind);
          for (const r of recipients.filter(gated)) {
            if (r.hp <= 0) continue;
            const crit = critHit.has(r.uid) && effect.critStacks !== undefined;
            let n = crit ? effect.critStacks! : effect.stacks;
            // Skill ağacı (omen grubu): eklenen yığına düz ek / sabit; kancasızda aynı
            const om = actor.treeHooks ? this.sumHooks(actor, r, skill, 'omen', { roll: true }) : null;
            if (om && (om.set.omenSet !== undefined || om.sum.omenStacks)) {
              n = Math.max(0, Math.round(om.set.omenSet ?? n + (om.sum.omenStacks ?? 0)));
              this.treeProcAll(actor.uid, om.nodes);
            }
            this.addStacks(r, kind, n, actor, emit, crit, auto, crit && effect.critDoomOnCrit === true);
          }
          break;
        }
        case 'detonate': {
          // Doom Mark: isabet eden hedefteki yığın (kaç olursa olsun, en az 1) çarpanla anında patlar; iskada hiçbir şey olmaz (yığın ve sayaç yerinde)
          const hasDamage = skill.effects.some((e) => e.type === 'damage');
          for (const r of hasDamage ? ts.filter((c) => hit.has(c.uid)) : ts) {
            const st = r.statuses.find((s) => s.kind === effect.status);
            if (r.hp <= 0 || !st || (st.stacks ?? 0) <= 0) continue;
            this.triggerDoom(r, st, effect.mult, 'detonate', actor, emit, skill.id);
          }
          break;
        }
        case 'dot': {
          // Karakter üstü DoT (Wither): miktar uygulama anında sabitlenir; yeniden uygulanınca süre max(kalan, yeni), büyük miktar (ve kaynağı) kalır
          const dm = actor.stats.dotPowerMult; // DoT damage / Potency (affix): yoksa güç aynen
          const amount = Math.round(attributePower(actor.stats, effect.scale, f) * (dm !== undefined && dm !== 1 ? effect.power * dm : effect.power));
          for (const r of this.damageBefore(skill, effect) ? ts.filter((c) => hit.has(c.uid)) : ts.filter(gated)) {
            if (r.hp <= 0) continue;
            // Faz 2c: ağaçlı kullanıcıda DoT durumu da durum kancasından geçer (Fog of Ill Luck: Wither'e büyüklük eki); miktar skill'in
            if (actor.treeHooks) this.applyTreeStatus(actor, r, skill, { type: 'status', status: effect.status, turns: effect.turns }, effect.status, effect.turns, 1, emit, undefined, { amount, ...(effect.permanent ? { permanent: true } : {}) });
            else this.addStatus(r, { kind: effect.status, turns: effect.turns, source: actor.uid, amount, ...(effect.permanent ? { permanent: true } : {}) }, emit); // en güçlü miktar addStatus'ta kalır
          }
          break;
        }
        case 'selfDamage': {
          const amount = Math.min(actor.hp - 1, Math.round(actor.maxHp * effect.ratio));
          if (amount > 0) {
            if (this.castInfo && this.castPaid?.uid === actor.uid) this.castInfo.hpPaid += amount;
            actor.hp -= amount;
            emit({ type: 'damage', source: actor.uid, target: actor.uid, amount, absorbed: 0, hpAfter: actor.hp, shieldAfter: actor.shield, magicShieldAfter: actor.magicShield, crit: false, origin: 'self' });
          }
          break;
        }
        case 'summon': {
          const baseDef = this.setup.units[effect.unit];
          const board = actor.side; // çağrılar daima kendi tahtasına
          const spot = baseDef ? summonSpot : null;
          if (!baseDef || spot === null) break;
          // Ceset tüketen çağrı (Raise Dead): seçilen (oyuncu) / en tehlikeli (YZ) düşman cesedini tüketir -> beslenmiş (fed); ceset yoksa beslenmemiş (unfed)
          let empowered: boolean | undefined;
          if (effect.consumeCorpse) {
            const corpse = corpseUid && this.corpseState.get(corpseUid) === 'revivable' ? this.corpseOf(corpseUid) : null;
            empowered = !!corpse;
            if (corpse) {
              this.corpseState.set(corpse.uid, 'consumed');
              emit({ type: 'corpseConsumed', uid: corpse.uid, by: actor.uid, slot: corpse.slot, side: corpse.side });
            } else if (actor.treeHooks && !this.corpseChoices(actor.uid, skill.id).length) {
              // Faz 5a (Empty Grave): ceset yokken fedNoCorpse kuralı ek MP ile yine beslenmiş çağırır (MP yetmezse beslenmemiş)
              const fr = this.rulesOf(actor, 'fedNoCorpse')[0];
              const extra = fr ? Math.max(0, fr.cost ?? 0) : 0;
              if (fr && (debug || this.freeMp || actor.mp >= extra)) {
                if (extra > 0 && !debug && !this.freeMp) {
                  actor.mp -= extra;
                  emit({ type: 'resource', actor: actor.uid, resource: 'mp', amount: extra, after: actor.mp });
                }
                empowered = true;
                this.treeProc(actor.uid, fr.node);
              }
            }
          }
          // Faz 5a (Living Bomb): resummon kuralı: sahibin aynı çağrısı sahadaysa hemen ölür (ölüm tetikleri mult kat)
          if (actor.treeHooks) {
            const rb = this.rulesOf(actor, 'resummon').find((h) => !h.skill || h.skill === skill.id);
            if (rb) {
              for (const old of this.combatants.filter((c) => c.summoned && c.owner === actor.uid && c.defId === effect.unit && c.hp > 0)) {
                this.burstMult.set(old.uid, rb.mult ?? 1);
                this.treeProc(actor.uid, rb.node);
                const lost = old.hp;
                old.hp = 0;
                emit({ type: 'damage', source: actor.uid, target: old.uid, amount: lost, absorbed: 0, hpAfter: 0, shieldAfter: old.shield, magicShieldAfter: old.magicShield, crit: false, origin: 'self' });
                this.announceIfDead(old, emit);
              }
            }
          }
          // Çağrı çağıranla büyür (Ömer 2026-10-18): statlar çağıranın item hariç temel statından, level = çağıranın level'ı
          const def = this.summonDefFor(actor, baseDef, empowered);
          const summoned = createCombatant(def, actor.side, spot, `${actor.side}-s${this.summonCount++}`);
          summoned.board = board;
          summoned.owner = actor.uid;
          if (actor.level !== undefined) summoned.level = actor.level;
          summoned.summoned = true;
          summoned.lifespan = effect.lifespan;
          if (empowered !== undefined) summoned.empowered = empowered;
          // Faz 4c: çağıranın ağacından geçen skill yamaları ve kancalar (can / zırh summonDefFor'da)
          const ts = this.summonTree(actor, effect.unit, empowered);
          if (ts?.skills) {
            const own = Object.entries(ts.skills).filter(([id]) => summoned.skills.includes(id));
            if (own.length) summoned.skillDefs = Object.fromEntries(own);
          }
          if (ts?.hooks?.length) {
            summoned.treeHooks = ts.hooks;
            if (ts.hooks.some((h) => h.h === 'trigger')) this.trigUnits.push(summoned);
            if (ts.hooks.some((h) => h.h === 'heal')) this.healUnits.push(summoned);
            // Faz 5a (Wrathful Oak): çağrının tur başına eylem sayısı
            const act = ts.hooks.find((h): h is RuleHook => h.h === 'rule' && h.rule === 'actions');
            if (act && (act.n ?? 1) > 1) summoned.actionsPerTurn = Math.floor(act.n!);
          }
          this.combatants.push(summoned);
          emit({ type: 'summon', actor: actor.uid, combatant: cloneCombatant(summoned), ...(empowered !== undefined ? { empowered } : {}) });
          // Faz 4c: sahaya indi (dinleyen çağrının kendisi; hedef = çağrı)
          if (this.trigOn) this.trig([summoned], { on: 'arrive', unit: effect.unit, target: summoned, subject: summoned }, emit);
          break;
        }
      }
      // Ağacın eklediği / değiştirdiği etki (treeNode) ölçümü: durumlar alıcıya işlendiğinde yukarıda; diğer türler skill isabet ettiyse (hasarsızda her zaman)
      if (effect.treeNode && effect.type !== 'status' && effect.type !== 'randomStatus' && (hit.size > 0 || !skill.effects.some((e) => e.type === 'damage'))) this.treeProc(actor.uid, effect.treeNode);
    }
    }
    stage = undefined;
    if (skill.telegraph) this.createTelegraph(actor, skill, targets, centerCells, emit);
    // advanceToFront (Warrior Charge, madde 271): kullanıcı ön sırada değilse ön sıraya geçer (önce kendi şeridi; isabet etse de etmese de)
    if (skill.advanceToFront && actor.hp > 0) {
      const to = this.advanceDestination(actor);
      if (to !== null) {
        const from = actor.slot;
        actor.slot = to;
        emit({ type: 'moved', actor: actor.uid, from, to, cause: skill.id, by: actor.uid, advance: true });
      }
    }

    // Windrunner Longbow (firstAttackEcho): savaştaki ilk hasar skill'i, hedefler dışından rastgele bir düşmana da vurur
    const echoPower = effNum(actor, 'firstAttackEcho');
    const echoEffect = skill.effects.find((e): e is DamageEffect => e.type === 'damage');
    if (!debug && echoPower && !actor.echoUsed && echoEffect && !skill.telegraph) {
      actor.echoUsed = true;
      const hitUids = new Set(targets.map((c) => c.uid));
      const pool = this.living(actor.side === 'party' ? 'enemy' : 'party').filter((c) => !hitUids.has(c.uid) && !c.inert);
      if (pool.length > 0) {
        const other = pool[this.rng.int(0, pool.length - 1)]!;
        emit({ type: 'passive', actor: actor.uid, passive: 'windrunner', name: 'Windrunner' });
        this.strike(actor, other, echoEffect, emit, echoPower, false);
        this.announceIfDead(other, emit);
      }
    }
    // Iron Retort (retortStatus): yakın dövüş skill'iyle isabet ettirilen taşıyan, saldırana durum verir
    if (!debug && skill.motion === 'melee' && actor.hp > 0) {
      for (const uid of hit) {
        const t = this.get(uid);
        if (!t) continue;
        for (const { v: rs, src } of effList(t, 'retortStatus')) {
          if (t.hp <= 0 || t.side === actor.side || !this.statusDef(rs.status) || actor.hp <= 0) continue;
          emit({ type: 'passive', actor: t.uid, passive: 'iron_retort', name: 'Iron Retort' });
          this.addStatus(actor, { kind: rs.status as Status['kind'], turns: rs.turns, source: t.uid }, emit, 'iron_retort');
          if (src === 'tree') this.fxProc(t, 'retortStatus');
        }
      }
    }
    // Blinding Opener (openerStatus): savaştaki ilk hasar skill'inin isabet ettiği hedeflerden en çok `max` tanesi (yalnızca o vuruşun alanı)
    for (const { v: op, src } of debug ? [] : effList(actor, 'openerStatus')) {
      if (onceUsed(actor, src, 'openerStatus') || !skill.effects.some((e) => e.type === 'damage') || hit.size === 0) continue;
      markOnce(actor, src, 'openerStatus');
      const victims = targets.filter((t) => hit.has(t.uid) && t.hp > 0 && t.side !== actor.side).slice(0, Math.max(0, op.max));
      if (victims.length && this.statusDef(op.status)) {
        emit({ type: 'passive', actor: actor.uid, passive: 'blinding_opener', name: 'Blinding Opener' });
        for (const v of victims) this.addStatus(v, { kind: op.status as Status['kind'], turns: op.turns, source: actor.uid }, emit, 'blinding_opener');
        if (src === 'tree') this.fxProc(actor, 'openerStatus');
      }
    }
    if (actor.empowerMult !== undefined) delete actor.empowerMult;
    for (const s of ownAttackEnds) {
      if (!actor.statuses.includes(s)) continue;
      // Ağaç statusPotency (Jinxed): attacks = düşmeden önce ek saldırı sayısı, keepChance = düşmeme şansı (yalnızca ağaçla uygulanan örnekte)
      if ((s.potency?.attacks ?? 0) >= 1) {
        s.potency = { ...s.potency, attacks: s.potency!.attacks! - 1 };
        continue;
      }
      if (s.potency?.keepChance && this.rng.next() < s.potency.keepChance) continue;
      actor.statuses = actor.statuses.filter((x) => x !== s);
      emit({ type: 'statusEnd', target: actor.uid, status: s.kind, consumed: true });
    }

    // Rage kazancı: skill başına tek (en yüksek tek hedefin toplamı; perCastCap ile sınırlı), yalnızca isabet eden hasar vuruşlarından
    if (this.rageTally && this.rageTally.size > 0 && actor.maxRage !== undefined) {
      const cap = f.rage.perCastCap;
      const rg = effNum(actor, 'rageGain'); // Resource mastery (affix): Rage kazancı; yoksa aynen
      // Skill ağacı C2 'tallyAll' (Reaping Wind): en iyi tek hedef yerine tüm vurulanların toplamı (perCastCap aynen)
      const all = actor.treeHooks?.find((h): h is RageHook => h.h === 'rage' && h.rule === 'tallyAll' && (!h.skill || h.skill === skill.id));
      if (all) this.treeProc(actor.uid, all.node);
      const raw = all ? [...this.rageTally.values()].reduce((t, v) => t + v, 0) : Math.max(...this.rageTally.values());
      const gain = Math.round(Math.min(cap, raw) * (rg > 0 ? 1 + rg : 1));
      const after = Math.min(actor.maxRage, (actor.rage ?? 0) + gain);
      const delta = after - (actor.rage ?? 0);
      this.rageTally = null;
      if (delta > 0) {
        actor.rage = after;
        emit({ type: 'rage', actor: actor.uid, delta, after, max: actor.maxRage });
      }
    }
    this.rageTally = null;
    // Skill ağacı C2: kullanım sonu Rage kancaları (düz Rage / taban / bir kez) ve bu skill'le silahlanan bedel koşulları (Into the Fire)
    if (!debug && actor.treeHooks && actor.maxRage !== undefined && actor.hp > 0) {
      const list = this.rageHooksFor(actor, undefined, skill, 'cast');
      if (list.length) this.grantTreeRage(actor, list, emit);
    }
    if (!debug && actor.skillDefs) this.armCostConds(actor, skill.id);
    // Faz 5a (Executioner's Calm): ward kuralı: bu skill'den sonra sahibin sıradaki turuna kadar debuff tutmaz
    if (!debug && actor.treeHooks && actor.hp > 0 && this.rulesOf(actor, 'ward').some((h) => !h.skill || h.skill === skill.id)) this.wardUntil.add(actor.uid);
    // Skill ağacı kullanım sonu (cast grubu): bu kullanımın cooldown'u (set / delta) ve Spell Echo şansı; koşullar bu kullanımın sonucunu görür
    let echoMod: { add: number; set?: number; mul?: number } | null = null;
    if (!debug && actor.treeHooks && this.castInfo) {
      this.castInfo.done = true;
      const ch = this.sumHooks(actor, undefined, skill, 'cast', { roll: true });
      if (ch.nodes.length) {
        if (this.mode === 'turns' && !this.noCooldowns && (ch.set.cooldownSet !== undefined || ch.sum.cooldownDelta)) {
          const cd = Math.max(0, Math.round(ch.set.cooldownSet ?? (actor.cooldowns[skill.id] ?? 0) + (ch.sum.cooldownDelta ?? 0)));
          if (cd > 0) actor.cooldowns[skill.id] = cd;
          else delete actor.cooldowns[skill.id];
        }
        if (ch.set.echoSet !== undefined || ch.sum.echoChance || ch.sum.echoMul !== undefined) echoMod = { add: ch.sum.echoChance ?? 0, ...(ch.set.echoSet !== undefined ? { set: ch.set.echoSet } : {}), ...(ch.sum.echoMul !== undefined ? { mul: ch.sum.echoMul } : {}) };
        this.treeProcAll(actor.uid, ch.nodes);
      }
    }
    // Faz 4a: kullanım sonu tetiği (skillUse; koşullar bu kullanımın sonucunu görür, hedef = ilk hedef)
    // Faz 4c: alan merkezi / tahtası (gecikmeli vuruş aynı hücrelere)
    const castPlace = centerSlot !== undefined ? { center: centerSlot, board: areaBoard ?? opposite(actor.side) } : {};
    if (!debug && this.trigOn && actor.hp > 0) this.trig([actor], { on: 'skillUse', skill: skill.id, ...(targets[0] ? { target: targets[0] } : {}), ...castPlace }, emit);
    // Ağaç izleme (yalnızca ağaçlı savaş): ilk kullanım, son hedefler, MP bedeli, seri, kullanım anındaki yenen vuruş sayısı
    if (!debug && this.treeUnits) {
      // Faz 2c: yalnızca bedel koşulu taşıyan (kancasız) ağaçlı birim de sayılır (Formed Up: ilk Close Ranks bedeli)
      if (hasTree(actor) && !actor.treeUsed?.includes(skill.id)) (actor.treeUsed ??= []).push(skill.id);
      if (hasTree(actor) && (skill.cooldown ?? 0) > 0) actor.treeCdUsed = true;
      this.lastTargetsOf.set(actor.uid, targets.filter((c) => c.side !== actor.side).map((c) => c.uid));
      this.lastMpCost.set(actor.uid, resource === 'mp' && cost > 0);
      const sk = this.streakOf.get(actor.uid);
      this.streakOf.set(actor.uid, { skill: skill.id, n: sk?.skill === skill.id ? sk.n + 1 : 1 });
      this.hitsAtUse.set(`${actor.uid}|${skill.id}`, this.hitsTaken.get(actor.uid) ?? 0);
    }
    this.castInfo = null;
    this.preHitDone = null;
    this.castPaid = null;
    this.condTargetList = null;
    this.castRage = null;
    this.noTransferKill = null;
    this.castingSkill = null;
    this.castingActor = null;
    // Faz 4c (Time Fold): tur bedeli buff'ı harcanmadan ÖNCE okunur
    const turnCost = this.turnCostOf(skill.id, actor.uid);
    // Faz 4a: tetik buff'ları: bu kullanımda kazanılanlar etkinleşir, kapsamı uyan sayaçlılar harcanır
    if (!debug && actor.treeBuffs) this.useTreeBuffs(actor, skill.id);

    // Ward-Etcher (YM6, mob pasifi): MP harcadığı skill'den sonra zırhı en düşük dosta harcanan MP x perMp süreli büyü kalkanı
    const we = actor.passive?.effect;
    if (!debug && we?.type === 'wardEtcher' && resource === 'mp' && cost > 0 && !this.freeMp && actor.hp > 0) this.wardEtch(actor, cost, we.perMp, we.turns, emit);

    // Int-primary Mana Echo: skill sonrası ihtimalle MP bedelinin yarısı (yukarı yuvarla, en az 1) geri gelir; bedelsiz skill'de zar atılmaz
    if (!debug && resource === 'mp' && cost > 0 && !this.freeMp && (actor.stats.manaEcho ?? 0) > 0 && this.rng.next() < actor.stats.manaEcho) {
      const back = Math.min(Math.max(1, Math.ceil(cost / 2)), actor.maxMp - actor.mp);
      emit({ type: 'passive', actor: actor.uid, passive: 'primary_int', name: 'Mana Echo' });
      if (back > 0) {
        actor.mp += back;
        emit({ type: 'mpRegen', actor: actor.uid, amount: back, after: actor.mp });
      }
    }

    // Pasif: Spell Echo, cooldown'lu bir hasar skill'i bazen anında yeniden hazır olur
    const echo = actor.passive?.effect;
    const echoChance = echoMod ? Math.max(0, Math.min(1, (echoMod.set ?? (echo?.type === 'spellEcho' ? echo.chance : 0) + echoMod.add) * (echoMod.mul ?? 1))) : echo?.type === 'spellEcho' ? echo.chance : 0;
    if (!debug && !fc && echo?.type === 'spellEcho' && this.mode === 'turns' && (skill.cooldown ?? 0) > 0 && skill.effects.some((e) => e.type === 'damage')) {
      // Zar sırası eskisiyle aynı (uygun kullanımda tek zar); Faz 4a: sonucu tetiğe gider (echo / echoFail)
      if (this.rng.next() < echoChance) {
        delete actor.cooldowns[skill.id];
        emit({ type: 'passive', actor: actor.uid, passive: actor.passive!.id, name: actor.passive!.name });
        if (this.trigOn) this.trig([actor], { on: 'echo', skill: skill.id, ...(targets[0] ? { target: targets[0] } : {}), ...castPlace }, emit);
      } else if (this.trigOn) this.trig([actor], { on: 'echoFail', skill: skill.id }, emit);
    }

    if (!debug && !fc) {
      // Faz 4c: tetiklerin kuyruğa koyduğu bedava kullanımlar eylem bitmeden (tur ilerlemeden) çalışır
      stage = undefined;
      this.modeCast = null; // Faz 8: biçim yalnızca bu kullanım; tetiklerin bedava kullanımları skill'in kendi biçimiyle
      this.flushFree(emit);
      this.noteAction(actor.uid, 'skill');
      this.finishAction(actor, emit, turnCost);
    }
    return { ok: true, events };
  }

  /**
   * Bahis zarı: bahsi hesaplar, zar atar, kaybedilirse bahsi kullanıcıdan düşer; hasar çarpanını döndürür (0 = iska).
   * Can bahsi canı en fazla 1'e indirir (öldürmez; Lucky Escape'e gerek kalmaz). Olay: 'passive' (Jackpot! / Bust!) + hasar ya da kaynak olayı.
   */
  private rollBet(actor: Combatant, bet: BetSpec, emit: Emit, stakeMul = 1): number {
    // Ağaç stakeMul (Sure Thing): bahis miktarı çarpanı; kazanç çarpanı bahisle ölçekleniyorsa (perStake) değişen miktarı görür
    // Mortgage (bet.hpStake; yalnızca yamalı kopya): ek can bahsi kazançta MP sayılır, kayıpta candan düşer (canı en az 1 bırakır)
    const parts = betStakeParts(bet, actor.maxHp, actor.hp, actor.mp, stakeMul);
    const stake = parts.main + parts.hp;
    const m = betMultipliers(bet, stake);
    const won = this.rng.next() < bet.winChance;
    if (this.castInfo && this.castPaid?.uid === actor.uid) {
      this.castInfo.bet = won ? 'won' : 'lost';
      this.castInfo.stake = stake;
    }
    emit({ type: 'passive', actor: actor.uid, passive: won ? 'gamble_win' : 'gamble_lose', name: won ? 'Jackpot!' : 'Bust!' });
    if (won) {
      if (this.trigOn) this.trig([actor], { on: 'jackpot', amount: stake, resource: bet.resource === 'hp' ? 'hp' : 'mp', ...(this.castingSkill && this.castingActor === actor ? { skill: this.castingSkill.id } : {}) }, emit);
      return m.win;
    }
    if (parts.main > 0) {
      if (bet.resource === 'hp') {
        actor.hp -= parts.main;
        emit({ type: 'damage', source: actor.uid, target: actor.uid, amount: parts.main, absorbed: 0, hpAfter: actor.hp, shieldAfter: actor.shield, magicShieldAfter: actor.magicShield, crit: false, origin: 'self' });
      } else {
        actor.mp -= parts.main;
        emit({ type: 'resource', actor: actor.uid, resource: 'mp', amount: parts.main, after: actor.mp });
      }
    }
    const hpLost = Math.min(parts.hp, actor.hp - 1);
    if (hpLost > 0) {
      actor.hp -= hpLost;
      emit({ type: 'damage', source: actor.uid, target: actor.uid, amount: hpLost, absorbed: 0, hpAfter: actor.hp, shieldAfter: actor.shield, magicShieldAfter: actor.magicShield, crit: false, origin: 'self' });
    }
    if (this.trigOn) this.trig([actor], { on: 'bust', amount: stake, resource: bet.resource === 'hp' ? 'hp' : 'mp', ...(this.castingSkill && this.castingActor === actor ? { skill: this.castingSkill.id } : {}) }, emit);
    return m.lose;
  }

  /** Ward-Etcher hedefi: kendisi hariç (yalnızsa kendisi) canlı, sıra alan dostlardan geçerli zırhı en düşük olan (eşitlikte küçük yuva). */
  wardEtchTarget(actor: Combatant): Combatant | undefined {
    const pool = this.living(actor.side).filter((c) => !c.inert && c.uid !== actor.uid);
    const list = pool.length > 0 ? pool : [actor];
    return [...list].sort((a, b) => this.effectiveStats(a).armor - this.effectiveStats(b).armor || a.slot - b.slot)[0];
  }

  private wardEtch(actor: Combatant, spent: number, perMp: number, turns: number, emit: Emit): void {
    const target = this.wardEtchTarget(actor);
    const amount = Math.round(spent * perMp);
    if (!target || amount <= 0) return;
    emit({ type: 'passive', actor: actor.uid, passive: actor.passive!.id, name: actor.passive!.name });
    this.trimShieldHooks(target);
    target.magicShield += amount;
    const hooks = (target.shieldHooks ??= []);
    const same = hooks.find((h) => h.skill === actor.passive!.id && h.caster === actor.uid && h.magic);
    if (same) {
      same.amount += amount;
      same.turns = turns;
    } else hooks.push({ skill: actor.passive!.id, caster: actor.uid, magic: true, amount, onAbsorb: {}, turns });
    emit({ type: 'shield', source: actor.uid, target: target.uid, amount, shieldAfter: target.shield, magicShieldAfter: target.magicShield, magic: true });
  }

  /** Süreli (fiziksel, her hasarı emen) kalkan katmanı (Crown of Ash, YM23): `turns` taşıyanın tur başında azalır; aynı kaynak katmanı büyütür ve süreyi yeniler. */
  private timedShield(source: Combatant, target: Combatant, id: string, amount: number, turns: number, emit: Emit): void {
    if (amount <= 0 || target.hp <= 0) return;
    emit({ type: 'passive', actor: source.uid, passive: id, name: source.passive?.name ?? id });
    this.trimShieldHooks(target);
    target.shield += amount;
    const hooks = (target.shieldHooks ??= []);
    const same = hooks.find((h) => h.skill === id && h.caster === source.uid && !h.magic);
    if (same) {
      same.amount += amount;
      same.turns = turns;
    } else hooks.push({ skill: id, caster: source.uid, magic: false, amount, onAbsorb: {}, turns });
    emit({ type: 'shield', source: source.uid, target: target.uid, amount, shieldAfter: target.shield, magicShieldAfter: target.magicShield, magic: false });
  }

  /** Turns modunda: sırası gelen aktör hiçbir şey yapamıyorsa (ör. MP bitti) turunu pas geçer. */
  skipTurn(): ActionResult {
    if (this.mode !== 'turns') return { ok: false, reason: 'Turns are only used in turn mode' };
    if (this.winner) return { ok: false, reason: 'Battle is over' };
    const actor = this.currentActor;
    if (!actor) return { ok: false, reason: 'No active unit' };
    const events: BattleEvent[] = [];
    const emit: Emit = (e) => {
      events.push(e);
      this.record(e);
    };
    this.observer?.before?.({ kind: 'pass', actorUid: actor.uid });
    emit({ type: 'turnSkipped', actor: actor.uid });
    this.noteAction(actor.uid, 'pass');
    this.finishAction(actor, emit);
    return { ok: true, events };
  }

  /**
   * Eylem sonrası: çağrının süresi dolduysa kaldır, kazananı belirle, turns modunda sırayı ilerlet.
   * `turnCost` (skill'in turnCost'u; varsayılan 1): sayaçtan eşiğin bu katı düşer (0,5 = yarım turn: sonraki sıra yarı sürede gelir).
   */
  private finishAction(actor: Combatant, emit: Emit, turnCost = 1): void {
    this.turnsTaken++;
    if (actor.flickered) actor.flickered = false; // Flicker (YM8): kendi turu başına bir kez
    if (actor.openingDamageMult !== undefined) delete actor.openingDamageMult; // ilk eylem bitti
    // Telgraf adalet kuralı: bu birim oynadı (eylem, pas ya da sersemlik)
    for (const t of this.telegraphs) if (t.waitFor.includes(actor.uid)) t.waitFor = t.waitFor.filter((u) => u !== actor.uid);
    if (this.mode === 'turns' && actor.summoned && actor.lifespan !== undefined && actor.hp > 0) {
      actor.lifespan--;
      if (actor.lifespan <= 0) {
        actor.hp = 0;
        emit({ type: 'despawn', target: actor.uid });
        this.breakAllBonds(actor, emit);
        this.summonDeathTrig(actor, emit);
      }
    }
    // Savaşın bitişi ya da sıradaki dalga (dalgalı savaş); sıra almayan yardımcı nesneler (inert) sayılmaz
    const wave = this.resolveEnd(emit);
    this.observer?.after?.(actor.uid);
    // Tur başına ek eylem (UnitModifiers.actionsPerTurn): skill / Rest / Move'dan sonra aynı birim aynı turda yeniden oynar (tur başı işlemleri yok).
    // Skip Turn, sersemlik ve pas turu bitirir. Sayaç yalnızca turun SON eyleminde düşer.
    const left = this.actionsLeft.get(actor.uid) ?? 0;
    this.actionsLeft.delete(actor.uid);
    const kind = this.lastKind.get(actor.uid);
    if (this.mode === 'turns' && !this.winner && !wave && left > 0 && actor.hp > 0 && this.currentUid === actor.uid && (kind === 'skill' || kind === 'rest' || kind === 'move') && !actor.statuses.some((s) => this.statusDef(s.kind)?.skipTurn)) {
      this.actionsLeft.set(actor.uid, left - 1);
      emit({ type: 'turnStart', actor: actor.uid, queue: this.turnQueue(), extra: true });
      this.tryStagger(actor, emit); // Stagger: bu ek eylem yanar
      return;
    }
    // Tur sonu süreleri (tickAtTurnEnd: Silence): taşıyanın turu bitince 1 azalır; biten durum kalkar
    if (this.mode === 'turns' && this.currentUid === actor.uid) this.tickTurnEnd(actor, emit);
    if (this.mode === 'turns' && !this.winner) actor.turnCounter -= this.setup.formulas.turn.threshold * turnCost;
    wave?.(); // yeni dalga: sıra kuralı (reset sayaçları sıfırlar) + waveStart olayı, sıra ilerlemeden önce
    if (this.mode === 'turns' && !this.winner) this.advance(emit);
  }

  /**
   * Savaşın bitişi (kazanan + battleEnd) ya da dalgalı savaşta sıradaki dalga. Dalgasız savaşta eski kuralın aynısı: düşman tarafında savaşan
   * kalmadıysa oyuncu kazanır (iki taraf aynı anda bitse de), yoksa oyuncu tarafı bittiyse düşman kazanır.
   * Dalgalı savaşta düşman dalgası bitince waveCleared; sonraki dalga varsa ve oyuncu tarafında savaşan kaldıysa dalga dizilir ve dönüş değeri
   * waveStart'ı yayınlayan bitirici fonksiyondur (çağıran, sıra sayaçlarını ayarladıktan sonra çağırır); oyuncu tarafı da bittiyse düşman kazanır.
   */
  private resolveEnd(emit: Emit): (() => void) | null {
    if (this.winner) return null;
    const enemyDone = this.fighting('enemy').length === 0;
    const partyDone = this.fighting('party').length === 0;
    if (enemyDone && this.waveCount > 1) emit({ type: 'waveCleared', index: this.waveIdx, total: this.waveCount });
    if (enemyDone && this.waveIdx < this.laterWaves.length) {
      if (!partyDone) return this.spawnWave(emit);
      this.winner = 'enemy';
    } else if (enemyDone) this.winner = 'party';
    else if (partyDone) this.winner = 'enemy';
    if (this.winner) emit({ type: 'battleEnd', winner: this.winner });
    return null;
  }

  /**
   * Sıradaki dalgayı dizer (data/waves.json > rules): önceki dalganın düşmüşleri savaştan çıkar (ceset kalkar), düşman tarafının zemin etkileri ve
   * telgrafları temizlenir, isteğe bağlı dalga arası yenilenme, yeni düşmanlar (başlangıç cooldown'u, boss fazı, Head Start) eklenir. Oyuncu
   * tarafının durumu (can, MP, Rage, cooldown, durumlar, çağrılar) aynen sürer. Dönen fonksiyon sıra kuralını uygular ve waveStart'ı yayınlar.
   * Rastgele sayı tüketmez.
   */
  private spawnWave(emit: Emit): () => void {
    const rules = this.waveRules;
    const def = this.laterWaves[this.waveIdx]!;
    this.waveIdx++;
    const index = this.waveIdx;
    const removed: string[] = [];
    if (rules.clearCorpses)
      for (const c of this.combatants) {
        if (c.side !== 'enemy' || c.hp > 0 || c.removed) continue;
        c.removed = true;
        this.clearCorpse(c.uid);
        removed.push(c.uid);
      }
    if (rules.cancelEnemyTelegraphs) for (const t of [...this.telegraphs]) if (this.get(t.source)?.side === 'enemy') this.cancelTelegraph(t, 'wave', emit);
    if (rules.clearEnemyGrounds)
      for (const g of [...this.ground]) {
        if (g.board !== 'enemy' && g.sourceSide !== 'enemy') continue;
        this.ground.splice(this.ground.indexOf(g), 1);
        emit({ type: 'groundEnd', id: g.id });
      }
    // Dalga arası yenilenme (varsayılan 0): canlı oyuncu birimleri (yardımcı nesne hariç)
    for (const c of this.fighting('party')) {
      if (rules.healRatio > 0 && c.hp < c.maxHp) this.applyHeal(c, c, Math.max(1, Math.round(c.maxHp * rules.healRatio)), false, emit, 'wave');
      const mp = rules.mpRatio > 0 ? Math.max(0, Math.min(Math.round(c.maxMp * rules.mpRatio), c.maxMp - c.mp)) : 0;
      if (mp > 0) {
        c.mp += mp;
        emit({ type: 'mpRegen', actor: c.uid, amount: mp, after: c.mp, cause: 'wave' });
      }
    }
    // Yeni düşmanlar: verilen yuva doluysa (canlı birim) en yakın boş yuva; yer yoksa birim gelmez. startDead / owner yok sayılır.
    const added: Combatant[] = [];
    def.enemies.forEach((d, i) => {
      const slot = this.nearestFreeSlot('enemy', def.enemySlots?.[i] ?? i);
      if (slot === null) return;
      const given = def.enemyUnits?.[i];
      let unit: UnitSetup | undefined;
      if (given) {
        const { startDead: _dead, owner: _owner, ...rest } = given;
        unit = rest;
      }
      const c = createSetupCombatant(d, 'enemy', slot, `enemy-w${index + 1}-${i}`, unit, this.setup.formulas);
      if (hasTree(c)) this.treeUnits = true;
      if (hasTree(c) || treeAura(c)) this.treeArmorOn = true;
      c.wave = index;
      this.combatants.push(c);
      added.push(c);
    });
    if (this.mode === 'turns') for (const c of added) this.applyInitialCooldowns(c);
    for (const c of added) if (c.boss?.phases?.length) c.phase = 1;
    for (const c of added) if (c.boss) this.refreshAnchored(c);
    const headStart = this.mode === 'turns' ? added.filter((c) => c.passive?.effect.type === 'headStart') : [];
    for (const c of headStart) {
      const e = c.passive!.effect as Extract<PassiveEffect, { type: 'headStart' }>;
      if (e.speedBoost > 0) this.speedBoost.set(c.uid, e.speedBoost);
    }
    return () => {
      // 'keep' (Ömer 2026-10-19): kimsenin sayacı değişmez, sıra kaldığı yerden sürer; yeni düşmanlar savaşa yeni giriyormuş gibi sayaç 0'dan
      // (createSetupCombatant) başlar ve hızlarına göre mevcut sıraya girer (eşitlikte savaşın tieFirst kuralı). 'reset': herkes 0'dan.
      if (this.mode === 'turns' && rules.turnOrder === 'reset') for (const c of this.combatants) if (c.hp > 0) c.turnCounter = 0;
      emit({ type: 'waveStart', index, total: this.waveCount, combatants: added.map(cloneCombatant), removed, queue: this.mode === 'turns' ? this.turnQueue() : [] });
      for (const c of headStart) emit({ type: 'passive', actor: c.uid, passive: c.passive!.id, name: c.passive!.name });
    };
  }

  /** tickAtTurnEnd durumlarının süresi (Silence): turu biten birimde 1 azalır, 0'da statusEnd. */
  private tickTurnEnd(actor: Combatant, emit: Emit): void {
    for (const status of [...actor.statuses]) {
      if (!this.statusDef(status.kind)?.tickAtTurnEnd || !actor.statuses.includes(status) || status.permanent) continue;
      status.turns--;
      if (status.turns > 0) continue;
      actor.statuses = actor.statuses.filter((s) => s !== status);
      emit({ type: 'statusEnd', target: actor.uid, status: status.kind });
    }
  }

  /** Sıradaki aktörü belirler; onun turu başlarken bekleme, durum ve MP işlemlerini yapıp turnStart yayınlar. */
  private advance(emit: Emit): void {
    const slots = this.turnSlots();
    const next = advanceTurn(slots, this.setup.formulas.turn.threshold, this.tieFirst);
    for (const s of slots) {
      const c = this.get(s.uid);
      if (c) c.turnCounter = s.counter;
    }
    this.currentUid = next?.uid ?? null;
    const actor = next ? this.get(next.uid) : undefined;
    if (!next || !actor) return;
    this.speedBoost.delete(actor.uid); // Skip Turn desteği, birimin sıradaki turu başlayınca biter
    if (actor.extraTurnGranted) actor.extraTurnGranted = false; // Whisper of Morvane: tur başına en çok bir ek eylem
    if (effArr(actor, 'earlyImmunity')) actor.ownTurns = (actor.ownTurns ?? 0) + 1; // Immunity affix'inin süresi (kendi turları)
    this.phaseCrossed.clear();
    this.telegraphedThisTurn.delete(actor.uid);
    if ((actor.actionsPerTurn ?? 1) > 1) this.actionsLeft.set(actor.uid, actor.actionsPerTurn! - 1);
    // Kendi turunun başında: bekleme süreleri 1 azalır
    const held = this.initialHold.get(actor.uid);
    this.initialHold.delete(actor.uid);
    for (const id of Object.keys(actor.cooldowns)) {
      if (held?.has(id)) continue; // başlangıç cooldown'u: ilk turda azalmaz (ilk N turda kullanılamaz)
      actor.cooldowns[id] = Math.max(0, (actor.cooldowns[id] ?? 0) - 1);
      if (actor.cooldowns[id] === 0) delete actor.cooldowns[id];
    }
    // Stone Patience (YM4, mob pasifi): son turundan beri hasar almadıysa birikimli zırh (zemin/DoT tiklerinden ÖNCE; o tiklerin hasarı sıfırlar)
    const sp = actor.passive?.effect;
    if (sp?.type === 'stonePatience' && actor.hp > 0) {
      if (!actor.patienceHurt && (actor.patience ?? 0) < sp.max) {
        actor.patience = Math.min(sp.max, (actor.patience ?? 0) + sp.armor);
        emit({ type: 'passive', actor: actor.uid, passive: actor.passive!.id, name: actor.passive!.name });
      }
      actor.patienceHurt = false;
    }
    // Sersemlemiş (skipTurn) birim bu turu oynayamaz; durum süresi aşağıda azalmadan önce okunur
    let skipThisTurn = actor.statuses.some((st) => this.statusDef(st.kind)?.skipTurn);
    // Yerdeki etkiler: bu birimin hücresinde duran (düşman) etkiler hasar verir
    for (const g of [...this.ground]) {
      // D11 (Holy Ground): şifa zemini yalnızca bırakanın tarafındaki birimi iyileştirir (kritiksiz sabit tik), kimseye hasar vermez
      if (this.isHealGround(g.ground)) {
        if (g.board === actor.board && g.slots.includes(actor.slot) && g.sourceSide === actor.side && actor.hp > 0 && g.amount > 0) this.applyHeal(this.get(g.source) ?? actor, actor, g.amount, false, emit, g.ground);
        continue;
      }
      if (g.board !== actor.board || !g.slots.includes(actor.slot) || g.sourceSide === actor.side || actor.hp <= 0) continue;
      // Faz 4c (ağaç zemini): hasarsız zemin tiklemez; ağacın doğurduğu zemin aynı türden daha güçlü zemin hücredeyse tiklemez (üst üste kuralı)
      if (g.noDamage || (g.yields && this.groundOutranked(g, actor.slot))) continue;
      const src = this.get(g.source) ?? actor;
      // Skill ağacı (at 'ground'): bırakanın kancaları (güç çarpanı; koşul groundAgeAtLeast); kancasızda aynı
      const gm = src.treeHooks ? this.treeMods(src, actor, null, undefined, { at: 'ground', tick: { age: g.age ?? 0 }, roll: true }) : null;
      const gd = this.groundTickDamage(g.ground, g.cellMult?.[actor.slot] ? Math.round(g.amount * g.cellMult[actor.slot]!) : g.amount, actor);
      if (gm) this.treeProcAll(src.uid, gm.nodes);
      this.applyHit(src, actor, gm && gm.power !== 1 ? Math.max(this.setup.formulas.damage.minDamage, Math.round(gd * gm.power)) : gd, 'magic', false, emit, false, { origin: 'ground', element: this.setup.grounds?.[g.ground]?.element ?? 'physical', damageType: 'magic', ground: g.ground, groundId: g.id });
      this.announceIfDead(actor, emit);
    }
    // Bu birimin bıraktığı yer etkilerinin süresi azalır (bırakan ölmüşse etki biter). tickOn (Last Ember): sayaç ve ömür o birimin
    for (const g of [...this.ground]) {
      const src = this.get(g.tickOn ?? g.source);
      if ((g.tickOn ?? g.source) === actor.uid) {
        if (!g.permanent) g.turns--;
        if (g.age !== undefined) g.age++;
      }
      if (g.turns <= 0 || !src || src.hp <= 0) {
        this.ground.splice(this.ground.indexOf(g), 1);
        emit({ type: 'groundEnd', id: g.id });
        // Faz 4c: zemin bitişi tetiği (bırakan canlıysa; Day of Judgment)
        if (this.trigOn && g.turns <= 0) this.trig([this.get(g.source)], { on: 'groundEnd', groundFx: g }, emit);
      }
    }
    // Karakter üstü DoT tikleri (Wither): zemin tiklerinden HEMEN sonra; isabet/kritik yok, Guard'a aktarılmaz, kalkan ve Lucky Escape normal
    for (const st of [...actor.statuses]) {
      const dot = this.statusDef(st.kind)?.dot;
      if (!dot || actor.hp <= 0 || !actor.statuses.includes(st)) continue;
      const src: Combatant = this.get(st.source) ?? actor;
      // Skill ağacı (at 'dot'): kaynağın kancaları (güç / lifesteal; ölçek dotTickIndex); kancasızda aynı
      const tm = src.treeHooks ? this.treeMods(src, actor, null, undefined, { at: 'dot', tick: { index: st.ticks ?? 0 }, roll: true }) : null;
      if (this.treeUnits) st.ticks = (st.ticks ?? 0) + 1;
      const dd = this.dotTickDamage(st.kind, st.amount ?? 0, actor);
      if (tm) this.treeProcAll(src.uid, tm.nodes);
      const lost = this.applyHit(src, actor, tm && tm.power !== 1 ? Math.max(this.setup.formulas.damage.minDamage, Math.round(dd * tm.power)) : dd, dot.damageType, false, emit, false, { origin: 'status', element: dot.element, damageType: dot.damageType, status: st.kind });
      if (this.treeUnits) st.dealt = (st.dealt ?? 0) + lost;
      if (tm?.lifesteal && src !== actor && src.hp > 0 && lost > 0) this.bondEcho(src, this.applyHeal(src, src, Math.round(lost * tm.lifesteal), false, emit), emit);
      if (this.trigOn && src !== actor) this.trig([src], { on: 'dotTick', target: actor, subject: actor, status: st.kind, amount: lost }, emit);
      this.announceIfDead(actor, emit);
    }
    // Yığılan durumun süresi (Omen, madde Ö2): taşıyanın tur başında 1 azalır; dolunca yığın sayısı kadar Doom patlar (burstOnExpire; snapshot ile).
    // DoT tikinden SONRA, yenilenmeden ÖNCE; taşıyan zemin/DoT tikinde öldüyse patlamaz (Ill Omen ölümde yığını zaten geçirdi)
    for (const st of [...actor.statuses]) {
      const def = this.statusDef(st.kind);
      if (!def?.maxStacks || actor.hp <= 0 || !actor.statuses.includes(st) || st.permanent) continue;
      st.turns--;
      if (st.turns > 0) continue;
      if (def.burstOnExpire && def.doom && (st.stacks ?? 0) > 0) this.triggerDoom(actor, st, def.doom.expireMult ?? 1, 'expire', undefined, emit);
      else {
        actor.statuses = actor.statuses.filter((s) => s !== st);
        emit({ type: 'statusEnd', target: actor.uid, status: st.kind });
      }
    }
    if (actor.hp <= 0) skipThisTurn = true;
    // Süreli durumlar: tur bazlı şifa işler, süreler azalır, biten durumlar kalkar
    for (const status of [...actor.statuses]) {
      if (!actor.statuses.includes(status)) continue;
      if (this.statusDef(status.kind)?.maxStacks) continue; // yığılan durumun süresi yukarıda işlendi
      if (this.statusDef(status.kind)?.untilResolved) continue; // kuralla süren durum (Ash Brand, Staggered, Anchored)
      if (this.statusDef(status.kind)?.tickAtTurnEnd) continue; // Silence: süre turun SONUNDA azalır (finishAction > tickTurnEnd)
      // Dark Bond: süre yalnızca bağı KURANIN turlarında azalır; bağlı dosttaki kopya kendi turunda azalmaz (sahibininkiyle eşitlenir)
      if (status.kind === 'dark_bond' && status.source !== actor.uid) continue;
      if (status.kind === 'regen' && actor.hp > 0) {
        const { crit, mult } = rollCrit({ critChance: status.critChance ?? 0, critMult: status.critMult ?? 1 }, this.rng);
        this.applyHeal(this.get(status.source) ?? actor, actor, Math.round((status.amount ?? 0) * mult), crit, emit);
      }
      if (status.permanent) continue; // ağaç: süresiz durum (soru 14.16)
      status.turns--;
      const mirror = status.kind === 'dark_bond' ? this.bondCopy(actor.uid, status.partner) : undefined;
      if (mirror) mirror.status.turns = status.turns;
      if (status.turns <= 0) {
        actor.statuses = actor.statuses.filter((s) => s !== status);
        emit({ type: 'statusEnd', target: actor.uid, status: status.kind });
        if (this.trigOn) this.statusEndTrig(actor, status, 'expired', emit);
        if (mirror) {
          mirror.unit.statuses = mirror.unit.statuses.filter((s) => s !== mirror.status);
          emit({ type: 'statusEnd', target: mirror.unit.uid, status: 'dark_bond' });
        }
        if (status.kind === 'dark_bond' && status.source === actor.uid) this.dropBondGuards(actor.uid, emit); // Faz 2c: bağa bağlı guard da biter
      }
    }
    // Faz 4c (ağaç zeminleri): içinde tur başlatan düşmana MP yakma ve durumlar (süre durumlarından SONRA: 1 turluk Slow bu turu kapsar)
    if (this.treeUnits && actor.hp > 0 && this.ground.length) this.groundTurnStart(actor, emit);
    // Süreli kalkan katmanları (Ward-Etcher, YM6): taşıyanın tur başında 1 azalır; biten katmanın kalanı havuzdan silinir
    if (actor.shieldHooks?.some((h) => h.turns !== undefined)) this.tickTimedShields(actor, emit);
    // Str: tur başı düz can yenilenmesi (Str x hpRegenPerStr, yuvarlanır)
    const hpRegen = Math.round(actor.stats.hpRegen ?? 0);
    if (actor.hp > 0 && !skipThisTurn && hpRegen > 0 && actor.hp < actor.maxHp) this.applyHeal(actor, actor, hpRegen, false, emit);
    // Censer Smoke (YM12, mob pasifi): aynı şeritteki (kendisi dahil) keşişin dumanı tur başında maks canın oranı kadar şifa (en güçlü tek kaynak)
    if (actor.hp > 0 && actor.hp < actor.maxHp) {
      const smoke = this.censerSourceOf(actor);
      if (smoke) this.applyHeal(smoke.unit, actor, Math.max(1, Math.round(actor.maxHp * smoke.ratio)), false, emit, 'censer_smoke');
    }
    // MP yenilenir (Ember Heart: can eşiğin üstündeyse ek MP; item etkisi turnMp)
    let bonusMp = 0;
    for (const { v: th } of effList(actor, 'turnMp')) if (actor.hp > th.above * actor.maxHp) bonusMp += th.mp;
    const regen = Math.max(0, Math.min(actor.stats.mpRegen + bonusMp, actor.maxMp - actor.mp));
    if (regen > 0) {
      actor.mp += regen;
      emit({ type: 'mpRegen', actor: actor.uid, amount: regen, after: actor.mp });
    }
    // Pasif: Divine Light, tur başında en yaralı dostu iyileştirir
    const dl = actor.passive?.effect;
    if (dl?.type === 'divineLight' && actor.hp > 0 && !skipThisTurn) {
      // Faz 5a (Fervent Oath): noSelf = şifa sahibini seçemez (alan yoksa liste aynı)
      const hurt = this.living(actor.side).filter((c) => c.hp < c.maxHp && !(dl.noSelf && c === actor)).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      let dlHealedAmt: number | null = null;
      if (hurt) {
        emit({ type: 'passive', actor: actor.uid, passive: actor.passive!.id, name: actor.passive!.name });
        // Skill ağacı (at 'passiveHeal'): güç çarpanı ve iyileşene durum (addStatus); kancasızda aynı. Faz 2c (Banner of Dawn): proc koşulları
        // şifadan ÖNCE değerlendirilir ("hedef %50'nin altındaydı"), etkileri şifadan sonra işler
        const pm = actor.treeHooks ? this.treeMods(actor, hurt, null, undefined, { at: 'passiveHeal', roll: true }) : null;
        if (pm) this.treeProcAll(actor.uid, pm.nodes);
        const heldProc = actor.treeHooks ? this.heldHooks(actor, hurt, null, { at: 'passiveHeal', groups: ['proc'], roll: true }) : null;
        const dlHealed = this.applyHeal(actor, hurt, Math.round(attributePower(actor.stats, dl.scale, this.setup.formulas) * dl.power * (pm?.power ?? 1)), false, emit);
        dlHealedAmt = dlHealed;
        if (heldProc?.length) this.applyProcHooks(actor, hurt, null, heldProc, emit);
        if (this.trigOn) this.trig([actor], { on: 'passiveHeal', target: hurt, subject: hurt, amount: dlHealed }, emit);
      }
      // Faz 5a C5 smite: yalnızca ağaç kopyasında (smite alanı); ağaçsızda yok
      if (dl.smite && actor.hp > 0 && !this.winner) this.passiveSmite(actor, dl.scale, dl.smite, dlHealedAmt, emit);
    }
    // Telgraflar (Breaking Span, Ash Brand, Fall): sahibinin tur başında, eylemlerinden ÖNCE çözülür (adalet kuralı sağlanmadıysa ertelenir)
    if (actor.hp > 0 && this.telegraphs.length > 0) {
      this.resolveTelegraphsOf(actor, emit);
      this.resolveEnd(emit)?.(); // dalgalı savaş: yeni dalga dizilir, bu birimin turu sürer
      if (this.winner) return;
    }
    // Faz 4a: süreli tetik buff'ları azalır, tur başına bir kez bayrakları silinir, tur başı tetiği (yalnızca ağaçlı savaş)
    if (this.treeUnits && actor.hp > 0) {
      this.tickTreeBuffs(actor);
      this.trigTurnOnce.delete(actor.uid);
      this.wardUntil.delete(actor.uid); // Faz 5a: ward sahibin tur başında biter
      // Faz 4c: 'tur'a kadar süren işaretler (Feeding Frenzy) işaretlinin kendi turu başında silinir
      for (const m of this.marks.values()) if (m.get(actor.uid) === 'turn') m.delete(actor.uid);
      if (this.trigOn) this.trig([actor], { on: 'turnStart' }, emit);
      // Faz 4c: gecikmeli vuruşlar (Twin Meteors, Thicket Wave) sahibin tur başında; kuyruk eylemden önce boşalır
      if (this.delayedFree.length) this.tickDelayedFree(actor);
      if (this.freeQueue.length) {
        this.flushFree(emit);
        this.resolveEnd(emit)?.();
        if (this.winner) return;
      }
    }
    emit({ type: 'turnStart', actor: next.uid, queue: this.turnQueue() });
    if (skipThisTurn) {
      emit({ type: 'turnSkipped', actor: actor.uid, stunned: actor.hp > 0 });
      this.actionsLeft.delete(actor.uid); // sersemlik tüm turu (ek eylemler dahil) yer
      this.finishAction(actor, emit);
    } else this.tryStagger(actor, emit); // Stagger: turun ilk eylemi yanar
  }

  /** Smite sürerken (öldürme yolu 'smite'). */
  private smiting = false;

  /**
   * Faz 5a C5 smite (Divine Light): canı (mevcut) en düşük düşmana kutsal büyü hasarı: INT gücü x (power + şifa yoksa idle) + şifa x mirror, x mul,
   * x at 'smite' C1 kancaları. Hasar zırh / büyü zırhıyla (tickDamage) ve applyHit'ten geçer; öldürme yolu 'smite'.
   */
  /** Faz 5a (Chain of Light): birimin son smite parametreleri. */
  private readonly lastSmite = new Map<string, { scale: Attribute; sm: NonNullable<Extract<PassiveEffect, { type: 'divineLight' }>['smite']>; healed: number | null }>();

  private passiveSmite(actor: Combatant, scale: Attribute, sm: NonNullable<Extract<PassiveEffect, { type: 'divineLight' }>['smite']>, healed: number | null, emit: Emit): void {
    this.lastSmite.set(actor.uid, { scale, sm, healed });
    const foes = this.living(opposite(actor.side)).filter((c) => !c.inert);
    const target = [...foes].sort((x, y) => x.hp - y.hp || x.slot - y.slot)[0];
    if (!target) return;
    const ratio = (sm.power ?? 0) + (healed === null ? (sm.idle ?? 0) : 0);
    let amount = ratio > 0 ? attributePower(actor.stats, scale, this.setup.formulas) * ratio : 0;
    if (sm.mirror && healed) amount += healed * sm.mirror;
    amount *= sm.mul ?? 1;
    if (!(amount > 0)) return;
    const pm = actor.treeHooks ? this.treeMods(actor, target, null, undefined, { at: 'smite', roll: true }) : null;
    if (pm) {
      amount *= pm.power;
      this.treeProcAll(actor.uid, pm.nodes);
    }
    const dmg = this.tickDamage('holy', 'magic', Math.round(amount), target);
    if (dmg <= 0) return;
    emit({ type: 'passive', actor: actor.uid, passive: actor.passive!.id, name: actor.passive!.name });
    this.smiting = true;
    try {
      this.applyHit(actor, target, dmg, 'magic', false, emit, false, { origin: 'status', element: 'holy', damageType: 'magic' });
      this.announceIfDead(target, emit);
    } finally {
      this.smiting = false;
    }
  }

  /** Censer Smoke kaynağı: birimin şeridinde (aynı tahta) canlı, censerSmoke pasifli dost (kendisi dahil); birden çoksa en güçlüsü. Yoksa null. */
  censerSourceOf(c: Combatant): { unit: Combatant; ratio: number } | null {
    let best: { unit: Combatant; ratio: number } | null = null;
    for (const a of this.combatants) {
      const e = a.passive?.effect;
      if (e?.type !== 'censerSmoke' || a.hp <= 0 || a.side !== c.side || a.board !== c.board || this.laneOf(a.slot) !== this.laneOf(c.slot)) continue;
      if (!best || e.ratio > best.ratio) best = { unit: a, ratio: e.ratio };
    }
    return best;
  }

  /** Süreli kalkan katmanları (ShieldHook.turns): 1 azalır; 0'da katmanın kalan miktarı havuzdan düşer (olay: shield, negatif miktar). */
  private tickTimedShields(c: Combatant, emit: Emit): void {
    for (const h of [...(c.shieldHooks ?? [])]) {
      if (h.turns === undefined) continue;
      h.turns--;
      if (h.turns > 0) continue;
      const cut = Math.min(h.amount, h.magic ? c.magicShield : c.shield);
      if (h.magic) c.magicShield -= cut;
      else c.shield -= cut;
      c.shieldHooks = c.shieldHooks!.filter((x) => x !== h);
      if (cut > 0) emit({ type: 'shield', source: h.caster, target: c.uid, amount: -cut, shieldAfter: c.shield, magicShieldAfter: c.magicShield, magic: h.magic });
    }
    if (c.shieldHooks?.length === 0) delete c.shieldHooks;
  }

  private turnSlots(): TurnSlot[] {
    return this.combatants
      .filter((c) => c.hp > 0 && !c.inert) // sıra almayan yardımcı nesne (Iron Mooring) sırada yok
      .map((c) => ({
        uid: c.uid,
        side: c.side,
        slot: c.slot,
        spd: this.speedOf(c),
        counter: c.turnCounter,
        ...(this.speedBoostOf(c.uid) > 0 ? { baseSpd: this.baseSpeedOf(c) } : {}),
      }));
  }

  /** `cause`: görsel neden (skill etkisinin `cause` alanı, ör. 'vines'); `status` olayına aynen yazılır. */
  /** Ağaç izleme: düşman bu birimi son turundan beri ıskaladı / blokladı (cond targetMissedMeSinceTurn). */
  private noteMiss(actor: Combatant, target: Combatant): void {
    if (!this.treeUnits || actor.side === target.side) return;
    let set = this.missedSince.get(target.uid);
    if (!set) this.missedSince.set(target.uid, (set = new Set()));
    set.add(actor.uid);
  }

  /**
   * Skill'in durum etkisini alıcıya uygular (status case ve preHit). C1 durum kancaları (süre / şans / büyüklük / süresiz; procChance zarlı) alıcı başına;
   * DoT tanımlı durumun (Burning) ortak miktarı statuses.json > dot'tan. Kancasız ve DoT'suz durumda ifade ve zar sırası birebir eski. Uygulandıysa true.
   */
  private applyTreeStatus(actor: Combatant, r: Combatant, skill: SkillDef | null | undefined, effect: SkillEffect, kind: Status['kind'], turns: number, chance: number, emit: Emit, cause?: string, extra?: { amount?: number; permanent?: boolean }): boolean {
    const tm = actor.treeHooks ? this.treeMods(actor, r, skill, effect, { roll: true }) : null;
    const ch = tm ? Math.max(0, Math.min(1, chance + tm.chance)) : chance;
    if (ch < 1 && !(this.rng.next() < ch)) return false;
    const st: Status = { kind, turns: tm ? Math.max(1, Math.round(turns + tm.turns)) : turns, source: actor.uid };
    if (tm?.potency) st.potency = { ...tm.potency };
    if (tm?.permanent || extra?.permanent || (effect.type === 'status' && effect.permanent)) st.permanent = true;
    const dot = this.statusDef(kind)?.dot;
    // Faz 2c: skill'in DoT etkisinin miktarı (extra.amount) önce; yoksa statuses.json > dot ortak değeri (Burning)
    if (extra?.amount !== undefined) st.amount = extra.amount;
    else if (dot?.scale && dot.power) st.amount = Math.round(attributePower(actor.stats, dot.scale, this.setup.formulas) * dot.power);
    this.addStatus(r, st, emit, cause);
    if (tm) this.treeProcAll(actor.uid, tm.nodes);
    if (kind === 'silence' && r.side !== actor.side && this.castInfo && this.castPaid?.uid === actor.uid && r.statuses.some((x) => x.kind === 'silence')) this.castInfo.silenced++;
    return true;
  }

  /** Ağaç vuruş sonrası kancaları (proc grubu): durum ekle (hedefe / kendine), hedeften durum sil, hedefteki durumu uzat. procChance zarlı. */
  private runProcHooks(actor: Combatant, target: Combatant, skill: SkillDef | null | undefined, q: TreeQuery & { effect?: SkillEffect }, emit: Emit): void {
    this.applyProcHooks(actor, target, skill, this.heldHooks(actor, target, skill, { ...q, groups: ['proc'], roll: true }), emit);
  }
  /** Tutan proc kancalarını uygular (Faz 2c: koşul ile uygulama ayrılabilir: Divine Light şifadan önce değerlendirir). */
  private applyProcHooks(actor: Combatant, target: Combatant, skill: SkillDef | null | undefined, held: Array<{ h: CondHook; s: number }>, emit: Emit): void {
    for (const { h } of held) {
      const m = h.mod;
      let fired = false;
      if (m.addStatus) {
        const a = m.addStatus;
        const who = a.self ? actor : target;
        // Faz 2c: eklenen durum da durum kancalarından geçer (Knee Shots: aynı Slow'u uzatır); şans zarı applyTreeStatus'ta (eski sırayla aynı tek zar)
        if (who.hp > 0 && this.statusDef(a.status) && this.applyTreeStatus(actor, who, skill, { type: 'status', status: a.status as Status['kind'], turns: a.turns }, a.status as Status['kind'], a.turns, a.chance ?? 1, emit, h.node)) fired = true;
      }
      if (m.removeStatus && target.hp > 0) {
        const gone = target.statuses.filter((x) => x.kind === m.removeStatus);
        if (gone.length) {
          target.statuses = target.statuses.filter((x) => x.kind !== m.removeStatus);
          for (const g of gone) emit({ type: 'statusEnd', target: target.uid, status: g.kind, dispelled: true, source: actor.uid, cause: h.node });
          fired = true;
        }
      }
      if (m.extendStatus && target.hp > 0 && (m.extendStatus.chance === undefined || m.extendStatus.chance >= 1 || this.rng.next() < m.extendStatus.chance)) {
        const ex = m.extendStatus;
        const pool = ex.status === '*' ? target.statuses.filter((x) => this.statusDef(x.kind)?.type === 'debuff' && !x.permanent && !this.statusDef(x.kind)?.untilResolved) : target.statuses.filter((x) => x.kind === ex.status);
        const pick = ex.status === '*' && pool.length > 1 ? pool[this.rng.int(0, pool.length - 1)] : pool[0];
        if (pick) {
          pick.turns += Math.round(ex.turns);
          emit({ type: 'status', target: target.uid, status: pick.kind, turns: pick.turns, source: pick.source, ...(pick.stacks !== undefined ? { stacks: pick.stacks } : {}) });
          fired = true;
        }
      }
      if (fired) this.treeProc(actor.uid, h.node);
      // Faz 2c (oncePerTarget): bu düşmana bir daha tetiklenmez
      if (fired && h.when && 'oncePerTarget' in h.when) this.firedOnSet.add(`${actor.uid}|${h.node}|${target.uid}`);
    }
  }

  private addStatus(target: Combatant, status: Status, emit: Emit, cause?: string): void {
    // Faz 4c (Herald of Ruin): durumu doğuran skill (uygulayan o an kendi kullanımındaysa); yalnızca ağaçlı savaş
    if (this.treeUnits && !status.fromSkill && this.castingSkill && this.castingActor?.uid === status.source) status = { ...status, fromSkill: this.castingSkill.id };
    // Crown of the Ashen King (ignoreFirstDebuff): savaşta uygulanan ilk debuff yok sayılır (kendi kendine uygulananlar hariç)
    if (effFlag(target, 'ignoreFirstDebuff') && !target.debuffIgnored && status.source !== target.uid && this.statusDef(status.kind)?.type === 'debuff') {
      target.debuffIgnored = true;
      emit({ type: 'immune', target: target.uid, status: status.kind, source: status.source, ...(cause ? { cause } : {}) });
      emit({ type: 'passive', actor: target.uid, passive: 'ashen_crown', name: 'Ashen Crown' });
      return;
    }
    const isDebuff = this.statusDef(status.kind)?.type === 'debuff';
    // Immunity (item affix, Ömer 2026-10-11): zarlanan TEK durum, birimin ilk N turunda tutmaz (Debuff resistance zarı bu sürede atılmaz)
    const imm = effArr(target, 'earlyImmunity')?.find((e) => e.status === status.kind);
    if (imm && status.source !== target.uid && (target.ownTurns ?? 0) <= imm.turns) {
      emit({ type: 'immune', target: target.uid, status: status.kind, source: status.source, ...(cause ? { cause } : {}) });
      emit({ type: 'passive', actor: target.uid, passive: 'item_immunity', name: 'Immunity' });
      return;
    }
    // Debuff resistance (item affix): başkasının debuff'ı ihtimalle hiç tutmaz; etki yoksa zar atılmaz
    const avoid = effNum(target, 'debuffAvoid');
    if (avoid > 0 && isDebuff && status.source !== target.uid && this.rng.next() < avoid) {
      emit({ type: 'immune', target: target.uid, status: status.kind, source: status.source, ...(cause ? { cause } : {}) });
      emit({ type: 'passive', actor: target.uid, passive: 'item_resist', name: 'Resisted' });
      return;
    }
    // Potency (item affix): kaynağın uyguladığı süreli debuff'lar uzun (sersemletme, yığılan ve kuralla süren durumlar hariç)
    const potSrc = status.source !== target.uid ? this.get(status.source) : undefined;
    const pot = potSrc ? effNum(potSrc, 'potencyTurns') : 0;
    if (pot > 0 && isDebuff) {
      const d = this.statusDef(status.kind);
      if (d && !d.skipTurn && !d.maxStacks && !d.untilResolved) status = { ...status, turns: status.turns + Math.floor(pot) };
    }
    // Kontrol bağışıklığı (madde 271): boss rütbesi CC durumlarını (statuses.json > cc: Stun, Slow, Silence) yemez; durum uygulanmaz, 'Immune' yazısı.
    // Madde 272: isabet/kritik düşüren debuff'lar (Blinded, Jinxed; ccImmunity.accuracyCrit) aynı akış.
    if (this.statusBlocked(target, status.kind)) {
      emit({ type: 'immune', target: target.uid, status: status.kind, source: status.source, ...(cause ? { cause } : {}) });
      emit({ type: 'passive', actor: target.uid, passive: 'cc_immune', name: 'Immune' });
      return;
    }
    // Faz 5a C6: ward (debuff tutmaz) ve shorten (süre kısalır; 0'a inerse işlemez); kancasız birimde dokunulmaz
    if (target.treeHooks && this.treeUnits) {
      const ruled = this.treeStatusRule(target, status);
      if (!ruled) {
        emit({ type: 'immune', target: target.uid, status: status.kind, source: status.source, ...(cause ? { cause } : {}) });
        return;
      }
      status = ruled;
    }
    // Boss kontrol direnci (Unyielding): Stun yerine Stagger (bir eylem kaybı); diğer debuff'lar 1 tur kısa (en az 1; yığılan ve kuralla süren durumlar hariç)
    const uy = target.boss?.unyielding;
    if (uy) {
      const d = this.statusDef(status.kind);
      if (uy.stunToStagger && d?.skipTurn) {
        emit({ type: 'passive', actor: target.uid, passive: 'unyielding', name: 'Unyielding' });
        this.applyStagger(target, this.get(status.source) ?? target, emit);
        return;
      }
      if (d?.type === 'debuff' && !d.maxStacks && !d.untilResolved && status.turns > 1 && uy.debuffDurationDelta) status = { ...status, turns: Math.max(1, status.turns + uy.debuffDurationDelta) };
    }
    // Str-primary Resilience: karaktere uygulanan her debuff, uygulanırken ihtimalle 1 tur kısalır (en az 1 kalır; 1 turluk debuff'ta zar atılmaz).
    // Yer etkilerinin kendi süresi (ground turns) buradan geçmez; yalnızca karakter üstünde tutulan durumlar etkilenir.
    const resilience = target.stats.resilience ?? 0;
    // Iron Will (item etkisi debuffShorten): Resilience ile TEK zarda toplanır, tavan `cap`; etki yoksa zar ve şans eskisiyle aynı
    // Ağaç kanalıyla birleşik: şanslar toplanır, tavan en yükseği (tek zar; tree-hooks.ts)
    const iws = effList(target, 'debuffShorten');
    const shorten = iws.length ? Math.min(Math.max(...iws.map((x) => x.v.cap)), resilience + iws.reduce((t, x) => t + x.v.chance, 0)) : resilience;
    if (shorten > 0 && this.statusDef(status.kind)?.type === 'debuff' && status.turns > 1 && this.rng.next() < shorten) {
      status = { ...status, turns: status.turns - 1 };
      emit({ type: 'passive', actor: target.uid, passive: resilience > 0 ? 'primary_str' : 'iron_will', name: resilience > 0 ? 'Resilience' : 'Iron Will' });
    }
    // Debuff yığılmaz (Ömer 2026-10-10; statuses.json > stack 'refresh-strongest'): birimde TEK örnek; süre max(kalan, yeni), güç (DoT miktarı) ve
    // kaynak en güçlü uygulamanın. Resilience / Unyielding kısaltması yeni uygulamaya yukarıda işlendi (zar her uygulamada atılır, akış aynı).
    if (statusStackMode(this.statusDef(status.kind)) === 'refresh-strongest') {
      const old = target.statuses.find((s) => s.kind === status.kind);
      if (old) status = mergeRefreshStrongest(old, status);
    }
    // Aynı türden durum yenisiyle değişir; tur bazlı şifa (regen) ve Dark Bond kopyası kaynağa göre ayrı tutulur (iki farklı Undead aynı dostu bağlayabilir)
    const perSource = status.kind === 'regen' || status.kind === 'dark_bond';
    target.statuses = target.statuses.filter((s) => !(s.kind === status.kind && (!perSource || s.source === status.source)));
    target.statuses.push(status);
    emit({ type: 'status', target: target.uid, status: status.kind, turns: status.turns, source: status.source, ...(cause ? { cause } : {}), ...(status.partner ? { partner: status.partner } : {}), ...(status.stacks !== undefined ? { stacks: status.stacks } : {}) });
    // Kontrol (CC) durumu (data/statuses.json > breaksTaunt, şu an Stun): taunt'ı olan birim bunu yerse taunt uygulandığı AN silinir (süre kısalsa da, 1 tur olsa da)
    if (this.statusDef(status.kind)?.breaksTaunt && target.statuses.some((s) => s.kind === 'taunt')) {
      const broken = target.statuses.find((s) => s.kind === 'taunt')!;
      target.statuses = target.statuses.filter((s) => s.kind !== 'taunt');
      emit({ type: 'statusEnd', target: target.uid, status: 'taunt', broken: true });
      if (this.trigOn) this.statusEndTrig(target, broken, 'broken', emit);
    }
    // Faz 4a: durum tetikleri (kazanan: statusGained, uygulayan: statusApplied, düşmana buff: enemyBuffed)
    if (this.trigOn) {
      const src = this.get(status.source);
      const skill = src && src === this.castingActor && this.castingSkill ? this.castingSkill.id : undefined;
      this.trig([target], { on: 'statusGained', target: src ?? target, subject: target, ...(src ? { source: src } : {}), status: status.kind, statusSource: status.source }, emit);
      if (src) this.trig([src], { on: 'statusApplied', target, subject: target, source: src, status: status.kind, statusSource: status.source, ...(skill ? { skill } : {}) }, emit);
      if (this.statusDef(status.kind)?.type === 'buff') this.trigAll({ on: 'enemyBuffed', target, subject: target, status: status.kind }, emit, (u) => u.side !== target.side);
    }
  }

  // --- Dispel, kalkan kancaları, Dark Bond ---

  /**
   * Silinebilecek durumlar (dispel adayı): statuses.json'da türü `kind` (buff/debuff) olan ve `dispellable: false` olmayanlar; EN UZUN süreli önce,
   * eşitlikte önce uygulanan (dizi sırası). Özel kodlu durumlar (taunt, guard, regen) tanımsız olduğu için silinmez. Saf.
   */
  dispelCandidates(c: Combatant, kind: 'buff' | 'debuff'): Status[] {
    return c.statuses
      .map((s, i) => ({ s, i, d: this.statusDef(s.kind) }))
      .filter((x) => x.d?.type === kind && x.d.dispellable !== false)
      .sort((a, b) => b.s.turns - a.s.turns || a.i - b.i)
      .map((x) => x.s);
  }

  /** Hedefteki `kind` durumlarını siler (count yoksa hepsi); her biri için statusEnd {dispelled, source, cause}. Silinenleri döndürür. */
  private dispel(target: Combatant, kind: 'buff' | 'debuff', count: number | undefined, source: Combatant, cause: string, emit: Emit, kinds?: readonly string[], random?: boolean): Status[] {
    const pool = kinds ? this.dispelCandidates(target, kind).filter((s) => kinds.includes(s.kind)) : this.dispelCandidates(target, kind);
    // Faz 2c (Prying Blade): seed'li rastgele seçim (karıştırılmış adaylardan ilk `count`); aday yoksa zar atılmaz
    if (random && pool.length > 1) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = this.rng.int(0, i);
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
      }
    }
    const picks = pool.slice(0, count ?? Infinity);
    for (const s of picks) {
      target.statuses = target.statuses.filter((x) => x !== s);
      emit({ type: 'statusEnd', target: target.uid, status: s.kind, dispelled: true, source: source.uid, cause });
      // Damga (Ash Brand) silindi: bağlı telgraf iptal
      for (const t of this.telegraphs.filter((x) => x.bound === target.uid && this.skill(x.skill, x.source)?.telegraph?.status === s.kind)) this.cancelTelegraph(t, 'dispel', emit);
      // Faz 4a: silinen her durum için silenin tetiği (dispel) ve durum bitişi (statusEnd dispelled)
      if (this.trigOn) {
        const skill = source === this.castingActor && this.castingSkill ? this.castingSkill.id : undefined;
        this.trig([source], { on: 'dispel', target, subject: target, source, status: s.kind, statusSource: s.source, ...(skill ? { skill } : {}) }, emit);
        this.statusEndTrig(target, s, 'dispelled', emit);
      }
    }
    return picks;
  }

  /** Kancalı kalkan katmanlarını havuza sığdırır (havuz kancasız bir yoldan azaldıysa: Shield Crush tüketmesi vb.); en eski katman önce kırpılır. */
  private trimShieldHooks(c: Combatant): void {
    if (!c.shieldHooks) return;
    for (const magic of [true, false]) {
      let excess = c.shieldHooks.filter((h) => h.magic === magic).reduce((t, h) => t + h.amount, 0) - (magic ? c.magicShield : c.shield);
      for (const h of c.shieldHooks) {
        if (excess <= 0) break;
        if (h.magic !== magic) continue;
        const cut = Math.min(h.amount, excess);
        h.amount -= cut;
        excess -= cut;
      }
    }
    c.shieldHooks = c.shieldHooks.filter((h) => h.amount > 0);
    if (c.shieldHooks.length === 0) delete c.shieldHooks;
  }

  /** Bir havuzdan emilen miktarı kancalı katmanlara (eskiden yeniye) yazar; kancalı katmanlar kancasız kalkandan önce tükenir. */
  private drainHooks(c: Combatant, magic: boolean, taken: number, out: Array<{ hook: ShieldHook; part: number }>): void {
    let left = taken;
    for (const h of c.shieldHooks ?? []) {
      if (left <= 0) break;
      if (h.magic !== magic) continue;
      const part = Math.min(h.amount, left);
      if (part <= 0) continue;
      h.amount -= part;
      left -= part;
      out.push({ hook: h, part });
    }
  }

  /**
   * Kalkan kancası (onAbsorb): kancalı kalkan bir skill vuruşunu emdi. madde 241: burnMana, dispelChance (RASTGELE bir buff) ve giveMana
   * (sabit MP, maks'ı aşmaz) kalkanın emdiği HER darbede. Olaylar: shieldTrigger, sonra manaBurn / statusEnd {dispelled} / mpRegen (cause = skill).
   */
  private absorbTrigger(hook: ShieldHook, bearer: Combatant, attacker: Combatant, part: number, emit: Emit): void {
    const spec = hook.onAbsorb;
    let burned = 0;
    let dispelled: Status | undefined;
    let mana = 0;
    // Madde 241 (Ömer): her şey kalkanın emdiği HER darbede (çok vuruşlu saldırı = her vuruşta)
    if (attacker.hp > 0) {
      if (spec.burnMana) burned = Math.max(0, Math.min(attacker.mp, spec.burnMana));
      if (spec.dispelChance) {
        const pool = this.dispelCandidates(attacker, 'buff');
        // zar yalnızca silinecek buff varken; silinecek buff RASTGELE biri (seed'li RNG; ikinci sayı yalnızca birden çok aday varsa)
        if (pool.length > 0 && this.rng.next() < spec.dispelChance) dispelled = pool.length === 1 ? pool[0] : pool[this.rng.int(0, pool.length - 1)];
      }
    }
    if (spec.giveMana && bearer.hp > 0 && bearer.maxMp > 0) mana = Math.max(0, Math.min(Math.round(spec.giveMana), bearer.maxMp - bearer.mp));
    if (burned <= 0 && !dispelled && mana <= 0) return;
    emit({ type: 'shieldTrigger', bearer: bearer.uid, caster: hook.caster, attacker: attacker.uid, skill: hook.skill, absorbed: part, ...(burned > 0 ? { burned } : {}), ...(dispelled ? { dispelled: dispelled.kind } : {}), ...(mana > 0 ? { mana } : {}) });
    if (burned > 0) {
      attacker.mp -= burned;
      emit({ type: 'manaBurn', source: bearer.uid, target: attacker.uid, amount: burned, mpAfter: attacker.mp, cause: hook.skill });
    }
    if (dispelled) {
      attacker.statuses = attacker.statuses.filter((s) => s !== dispelled);
      emit({ type: 'statusEnd', target: attacker.uid, status: dispelled.kind, dispelled: true, source: bearer.uid, cause: hook.skill });
    }
    if (mana > 0) {
      bearer.mp += mana;
      emit({ type: 'mpRegen', actor: bearer.uid, amount: mana, after: bearer.mp, cause: hook.skill });
    }
  }

  /** Dark Bond: `ownerUid`'nin kurduğu bağın bağlı dosttaki kopyası (yoksa undefined). */
  private bondCopy(ownerUid: string, partnerUid: string | undefined): { unit: Combatant; status: Status } | undefined {
    const unit = partnerUid ? this.get(partnerUid) : undefined;
    const status = unit?.statuses.find((s) => s.kind === 'dark_bond' && s.source === ownerUid);
    return unit && status ? { unit, status } : undefined;
  }

  /** Birimin KURDUĞU geçerli bağın bağlı dostu (uid); bağ yoksa / öbür uç kopmuşsa null. UI (bağ çizgisi) ve YZ için. */
  bondPartnerOf(uid: string): string | null {
    const c = this.get(uid);
    const own = c?.statuses.find((s) => s.kind === 'dark_bond' && s.source === uid);
    const copy = c && own ? this.bondCopy(uid, own.partner) : undefined;
    return copy && copy.unit.hp > 0 && c!.hp > 0 ? copy.unit.uid : null;
  }

  /** Birimin kurduğu bağı koparır (kendi durumu + dosttaki kopya); olay statusEnd {cause: 'bond_broken'}. */
  private breakOwnedBond(owner: Combatant, emit: Emit): void {
    const own = owner.statuses.find((s) => s.kind === 'dark_bond' && s.source === owner.uid);
    if (!own) return;
    this.dropBondGuards(owner.uid, emit);
    owner.statuses = owner.statuses.filter((s) => s !== own);
    emit({ type: 'statusEnd', target: owner.uid, status: 'dark_bond', cause: 'bond_broken' });
    const copy = this.bondCopy(owner.uid, own.partner);
    if (copy) {
      copy.unit.statuses = copy.unit.statuses.filter((s) => s !== copy.status);
      emit({ type: 'statusEnd', target: copy.unit.uid, status: 'dark_bond', cause: 'bond_broken' });
    }
  }

  /** Birimin dahil olduğu TÜM bağları koparır (kurduğu bağ + kendisine kurulmuş bağlar): ölüm, debug temizliği. */
  private breakAllBonds(c: Combatant, emit: Emit): void {
    this.breakOwnedBond(c, emit);
    for (const copy of c.statuses.filter((s) => s.kind === 'dark_bond' && s.source !== c.uid)) {
      const owner = this.get(copy.source);
      if (owner && owner.statuses.some((s) => s.kind === 'dark_bond' && s.source === owner.uid && s.partner === c.uid)) this.breakOwnedBond(owner, emit);
      else if (c.statuses.includes(copy)) {
        c.statuses = c.statuses.filter((s) => s !== copy);
        emit({ type: 'statusEnd', target: c.uid, status: 'dark_bond', cause: 'bond_broken' });
      }
    }
  }

  /** Faz 2c (Blood Oath): sahibin bağa bağlı guard'ları kalkar (bağ bitti / koptu). Böyle guard yoksa olay yok. */
  private dropBondGuards(ownerUid: string, emit: Emit): void {
    for (const c of this.combatants) {
      const gone = c.statuses.filter((s) => s.kind === 'guard' && s.bond && s.source === ownerUid);
      if (!gone.length) continue;
      c.statuses = c.statuses.filter((s) => !gone.includes(s));
      emit({ type: 'statusEnd', target: c.uid, status: 'guard', cause: 'bond_broken' });
    }
  }

  /**
   * Dark Bond kurar: önce kullanıcının eski bağı kopar (aynı anda tek bağ), sonra iki uca 'dark_bond' durumu (süre kullanıcının turlarıyla).
   * Faz 2c (Crimson Covenant): `permanent` = bağ süre ile bitmez (biri düşünce ya da yeni bağda kopar).
   */
  private formBond(owner: Combatant, partner: Combatant, turns: number, ratio: number, emit: Emit, permanent?: boolean): void {
    this.breakOwnedBond(owner, emit);
    const p = permanent ? { permanent: true } : {};
    this.addStatus(owner, { kind: 'dark_bond', turns, source: owner.uid, partner: partner.uid, ratio, ...p }, emit);
    this.addStatus(partner, { kind: 'dark_bond', turns, source: owner.uid, partner: owner.uid, ratio, ...p }, emit);
  }

  /**
   * Dark Bond kopyası: `healer`'ın lifesteal kazancı (`amount`: GERÇEKTEN iyileştiği miktar; canı doluyken 0 = kopya yok, madde 241) bağlı dosta `ratio` katıyla
   * şifa olur (dostun can maks'ını aşmaz, Wound gibi alınan şifa çarpanları dostta uygulanır). Olay: heal {cause: 'dark_bond'}.
   */
  private bondEcho(healer: Combatant, amount: number, emit: Emit): void {
    if (amount <= 0) return;
    const own = healer.statuses.find((s) => s.kind === 'dark_bond' && s.source === healer.uid);
    const copy = own ? this.bondCopy(healer.uid, own.partner) : undefined;
    if (!own || !copy || copy.unit.hp <= 0 || copy.unit.hp >= copy.unit.maxHp) return;
    // Skill ağacı (bond grubu): kopya oranı x (1 + v); kancasızda aynı
    const bm = healer.treeHooks ? this.sumHooks(healer, copy.unit, null, 'bond') : null;
    if (bm?.nodes.length) this.treeProcAll(healer.uid, bm.nodes);
    this.applyHeal(healer, copy.unit, Math.round(amount * (own.ratio ?? 1) * (bm?.sum.bondRatio ?? 1)), false, emit, 'dark_bond');
  }

  /**
   * Tek bir hasar vuruşu: isabet zarı (TEK zar; accuracy vs evasion; iska = 'dodge' (hedef kaçındı) ya da 'miss' (saldıran isabet ettiremedi) olayı)
   * -> zar -> kritik (SON çarpan) -> guard paylaşımı -> kalkan -> can.
   * `powerMult`: arkaya sıçrayan kısmî hasar için güç çarpanı.
   */
  /**
   * Faz 5c (Turned Hand): saldıranın taşıdığı Jinxed'i veren birimde `turnedHand` kuralı varsa saldıranın kendi dostlarından seed'li rastgele biri
   * (kendisi hariç, canlı, sıra alan). Yalnızca hasar skill'i ve tüm hedefleri karşı taraftaysa; dost yoksa null (saldırı normal). Zar yalnızca kural varken.
   */
  private readonly turnedJinx = new WeakSet<Status>();
  private turnedHandAlly(actor: Combatant, skill: SkillDef, targets: Combatant[]): { ally: Combatant; owner: string; node: string; st: Status } | null {
    if (!this.treeUnits || !targets.length || !skill.effects.some((e) => e.type === 'damage') || targets.some((t) => t.side === actor.side)) return null;
    for (const st of actor.statuses) {
      if (st.kind !== 'jinxed' || !st.source || this.turnedJinx.has(st)) continue;
      const rule = this.rulesOf(this.get(st.source), 'turnedHand')[0];
      if (!rule) continue;
      const allies = this.living(actor.side).filter((c) => c !== actor && !c.inert);
      if (!allies.length) return null;
      const ally = this.pickN(allies, 1)[0]!;
      return { ally, owner: st.source, node: rule.node, st };
    }
    return null;
  }

  /** randomStatus zarı (ağırlıklı seçim + uygulama); skill etkisi ve Returning Cards'ın (strike rollStatus) yeniden zarı aynı yol. */
  private rollRandomStatus(actor: Combatant, r: Combatant, skill: SkillDef, effect: Extract<SkillEffect, { type: 'randomStatus' }>, emit: Emit, first = true): void {
    const total = effect.options.reduce((a, o) => a + o.weight, 0);
    if (r.hp <= 0 || total <= 0) return;
    let roll = this.rng.next() * total;
    const pick = effect.options.find((o) => (roll -= o.weight) < 0) ?? effect.options[effect.options.length - 1]!;
    if (pick.firstOnly && !first) return; // Faz 8 (Double Deal): ilk hedefe özel durum (Stun) sonraki karta işlemez
    // Faz 2c: ağaçlı kullanıcıda seçilen durum da durum kancasından geçer (Long Con: Card Trick'in Stun'u)
    if (actor.treeHooks) this.applyTreeStatus(actor, r, skill, { type: 'status', status: pick.status, turns: pick.turns }, pick.status, pick.turns, 1, emit);
    else this.addStatus(r, { kind: pick.status, turns: pick.turns, source: actor.uid }, emit);
  }

  private strike(actor: Combatant, target: Combatant, effect: DamageEffect, emit: Emit, powerMult: number, extras: boolean, sure = false, info?: HitInfo): { landed: boolean; crit?: boolean } {
    const f = this.setup.formulas;
    // Skill ağacı (Faz 2a): C1 koşullar vuruştan ÖNCEKİ duruma bakar (etki kopyası: kritik / zırh delme / lifesteal; güç dealtDamageMult'ta), C2 isabet
    // Rage'i de öyle; ölçüm yalnızca vuruş isabet edince. Kancası olmayan birimde hiçbiri hesaplanmaz (zar ve olay akışı aynı)
    const baseEffect = effect;
    const tq: TreeQuery = info ? { hit: info } : {};
    let treeMods = actor.treeHooks ? this.treeMods(actor, target, this.castingSkill, effect, tq) : null;
    if (treeMods) effect = this.applyEffMods(effect, treeMods);
    let rageHits = actor.treeHooks && this.rageTally ? this.rageHooksFor(actor, target, this.castingSkill, 'hit') : null;
    // Zarlar her zaman atılır (debug zorlaması rastgele sayı akışını değiştirmez); vuruş başına TEK zar üç sonuca ayrışır
    // İsabet/kaçınma: durum ekleri (Blinded/Shrouded) dahil geçerli stat'lar (effectiveStats); hit şansı [0, hit.max]
    // `sure`: isabet zarı YOK (Drain Field onEmpty hasarı; zar da tüketilmez, debug iska zorlaması uygulanmaz). Ağaç sureHit aynı (blok yine olabilir)
    const noRoll = sure || !!treeMods?.sureHit;
    let outcome: ReturnType<typeof hitOutcome> = noRoll ? 'hit' : hitOutcome(this.effectiveStats(actor), this.effectiveStats(target), f, this.rng.next());
    if (noRoll) outcome = 'hit';
    else if (this.debug.dodge === 'always') outcome = 'dodge';
    else if (this.debug.miss === 'always') outcome = 'miss';
    else if (this.debug.dodge === 'never') outcome = 'hit';
    // The Gambler's Last Coin (rerollMiss): savaşta bir kez, iska / kaçınma yeniden zarlanır (debug zorlamasında değil)
    if (outcome !== 'hit' && !noRoll && effFlag(actor, 'rerollMiss') && !actor.rerollUsed && this.debug.dodge === 'auto' && this.debug.miss === 'auto') {
      actor.rerollUsed = true;
      emit({ type: 'passive', actor: actor.uid, passive: 'last_coin', name: 'The Last Coin' });
      outcome = hitOutcome(this.effectiveStats(actor), this.effectiveStats(target), f, this.rng.next());
    }
    if (outcome !== 'hit') {
      emit({ type: outcome, source: actor.uid, target: target.uid });
      this.noteMiss(actor, target);
      // Faz 4a: kaçınan (dodge) ve hedefin tarafı (enemyMissed: ıska ya da kaçınma; hedef = saldıran)
      if (this.trigOn && actor.side !== target.side) {
        const ev = { target: actor, subject: target, source: actor, incomingSkill: this.castingSkill } as const;
        if (outcome === 'dodge') this.trig([target], { on: 'dodge', ...ev }, emit);
        this.trigAll({ on: 'enemyMissed', ...ev }, emit, (u) => u.side === target.side);
      }
      return { landed: false };
    }
    // Blok (Ömer 2026-10-18): kalkanlı hedef düşmanın doğrudan fiziksel vuruşunu TAMAMEN bloklar: hasar 0, ek etkiler (Stun, Wound...) yok,
    // vuruş isabet etmemiş sayılır (dodge gibi). Şans yoksa zar atılmaz.
    if (this.rollBlock(actor, target, effect, sure)) {
      emit({ type: 'block', source: actor.uid, target: target.uid });
      this.noteMiss(actor, target);
      return { landed: false };
    }
    // Skill ağacı preHit (Gore Wheel, plan 10a): durum hasardan ÖNCE işler; bu hedefin bu kullanımdaki ilk isabetinde. Koşullar ve bu vuruş onu görür
    if (this.preHitDone && this.castingSkill && !this.preHitDone.has(target.uid)) {
      this.preHitDone.add(target.uid);
      let any = false;
      for (const pe of this.castingSkill.effects) {
        if (pe.type !== 'status' || !pe.preHit || pe.self || target.hp <= 0) continue;
        this.applyTreeStatus(actor, target, this.castingSkill, pe, pe.status, pe.turns, pe.chance ?? 1, emit, pe.cause);
        any = true;
      }
      if (any && actor.treeHooks) {
        effect = baseEffect;
        treeMods = this.treeMods(actor, target, this.castingSkill, effect, tq);
        if (treeMods) effect = this.applyEffMods(effect, treeMods);
        if (this.rageTally) rageHits = this.rageHooksFor(actor, target, this.castingSkill, 'hit');
      }
    }
    // Flock Shield (YM18): savaşta bir kez ilk isabet eden düşman skill vuruşu azalır; yoksa 1 (ifade aynı)
    const flock = this.flockMult(actor, target);
    const spec = damageSpecFor(actor, target, effect, f, powerMult, extras, flock !== 1 ? this.damageTakenMult(target, actor, effect.damageType, this.castingSkill) * flock : this.damageTakenMult(target, actor, effect.damageType, this.castingSkill), this.dealtDamageMult(actor, target, this.castingSkill, effect, tq), effect.bonusScale ? this.effectiveStats(actor) : undefined, this.castRage ?? undefined);
    if (this.healOn) this.treeTakenMult(target, actor, effect.damageType, this.castingSkill, true); // C4 ölçümü (yalnızca gerçek vuruş)
    if (flock !== 1) {
      target.passiveUsed = true;
      emit({ type: 'passive', actor: target.uid, passive: target.passive!.id, name: target.passive!.name });
    }
    const targetStats = this.effectiveStats(target);
    const base = rollDamage(this.attackStats(actor), targetStats, spec, f, this.rng);
    // Garantili kritik (Backstab): kritik zarı ATILMAZ, kritik çarpanı uygulanır (debug 'never' yine kapatır; Jinxed bunu bozmaz: madde Ö5).
    // Kritik şansı durum ekleriyle (Jinxed, Omen Misfortune) geçerli değerdir (effectiveStats).
    // critBonus (Jinx): bu skill'in vuruşunda kritik şansına ek (generic)
    // Ağaç noCrit: kritik olamaz (zar atılmaz; guaranteedCrit'i de bozar)
    const rolled = treeMods?.noCrit ? { crit: false } : effect.guaranteedCrit ? { crit: true } : rollCrit(this.effectiveStats(actor, effect.critBonus ?? 0), this.rng);
    const crit = this.debug.crit === 'auto' ? rolled.crit : this.debug.crit === 'always';
    if (crit && info?.center && actor.treeHooks) this.centerCritN++; // Faz 5a (X Marks the Throat): bu kullanımda merkez kritikleri
    // Ağaç: kritik çarpanı (critDmgMul), vuruş sonrası kancalar (hitIsCrit: güç / zırh delme / kritik çarpanı / düz ek) ve düz hasar (flatDamage)
    const late = actor.treeHooks ? this.lateDamage(actor, target, this.castingSkill, baseEffect, spec, crit, tq) : null;
    const mult = crit ? actor.stats.critMult * (treeMods?.critDmg ?? 1) * (late?.critDmg ?? 1) : 1;
    const flat = (treeMods?.flat ?? 0) + (late?.flat ?? 0);
    // openingDamageMult (endless Banner of the Bridge): yalnızca birimin ilk eyleminde; yoksa x1 (sonuç birebir aynı)
    const raw = base * mult * this.debug.damageMult * (actor.openingDamageMult ?? 1) * (actor.empowerMult ?? 1);
    const total = Math.max(f.damage.minDamage, Math.round(late || flat ? raw * (late?.mult ?? 1) + flat : raw));

    // Faz 5a (Guardian Oak): Guard durumu yoksa konumla Guard (yalnızca ağaçlı savaş)
    const guard = target.statuses.find((s) => s.kind === 'guard') ?? (this.treeUnits ? this.positionalGuard(target) : undefined);
    const guardian = guard ? this.get(guard.source) : undefined;
    let hpLoss: number;
    const meta: HitMeta = { origin: 'skill', element: effect.element ?? 'physical', damageType: effect.damageType };
    // Oathkeeper's Bulwark (interceptLethal): ölümcül vuruş, yan komşu dosttaki taşıyana gider (savaşta bir kez); hedefe bu vuruştan hiçbir şey olmaz
    const pool = (type: string) => target.hp + target.shield + (type === 'magic' ? target.magicShield : 0);
    if (target.hp > 0 && total >= pool(effect.damageType)) {
      const keeper = this.living(target.side).find((c) => effFlag(c, 'interceptLethal') && !c.interceptUsed && this.sideAdjacent(c, target));
      if (keeper) {
        keeper.interceptUsed = true;
        emit({ type: 'passive', actor: keeper.uid, passive: 'oathkeeper', name: "Oathkeeper's Vow" });
        this.applyHit(actor, keeper, total, effect.damageType, crit, emit, true, meta);
        this.announceIfDead(keeper, emit);
        return { landed: false };
      }
      // Martyr's Vow (YM11, mob pasifi): savaşta bir kez, bitişik (artı şekli) dostun ölümcül vuruşunu taşıyan alır; hasar kendi zırhına göre ölçeklenir
      const martyr = this.martyrFor(target);
      if (martyr) {
        martyr.passiveUsed = true;
        emit({ type: 'passive', actor: martyr.uid, passive: martyr.passive!.id, name: martyr.passive!.name });
        const ign = spec.ignoreDefense ?? 0;
        const armorOf = (c: Combatant) => (effect.damageType === 'physical' ? this.effectiveStats(c).armor : this.effectiveStats(c).magicArmor) * (1 - ign);
        const keep = (c: Combatant) => 1 - armorReduction(armorOf(c), f);
        const moved = Math.max(f.damage.minDamage, Math.round((total * keep(martyr)) / Math.max(0.0001, keep(target))));
        this.applyHit(actor, martyr, moved, effect.damageType, crit, emit, true, meta);
        this.announceIfDead(martyr, emit);
        return { landed: false };
      }
      // Faz 5a C6 intercept (Final Shield: korunan; Blood Ransom: bağlı dost): ölümcül vuruşu kurallı dost alır
      const ic = this.treeUnits ? this.interceptorFor(target) : undefined;
      if (ic) {
        if (ic.h.once) (ic.unit.treeOnce ??= []).push(ic.h.node);
        this.treeProc(ic.unit.uid, ic.h.node);
        this.applyHit(actor, ic.unit, total, effect.damageType, crit, emit, true, meta);
        this.announceIfDead(ic.unit, emit);
        return { landed: false };
      }
    }
    // Bloodletter (item etkisi executeLifesteal): vuruştan ÖNCE hedefin canı eşiğin altında mı
    const exes = effList(actor, 'executeLifesteal').filter((x) => target.hp < x.v.below * target.maxHp);
    let lucky: boolean;
    const phalanx = guard && guardian && guardian !== target && guardian.hp > 0 && guardian.treeHooks ? this.rulesOf(guardian, 'split')[0] : undefined;
    if (phalanx && guardian) {
      // Faz 5a (Phalanx): hasar korumacı + korumacının tüm korunanları arasında eşit bölünür (her pay ayrı vuruş; hedefin payı asıl vuruş)
      const others = this.living(target.side).filter((c) => c !== target && c !== guardian && c.statuses.some((s) => s.kind === 'guard' && s.source === guardian.uid));
      const part = Math.max(0, Math.round(total / (2 + others.length)));
      this.treeProc(guardian.uid, phalanx.node);
      hpLoss = this.applyHit(actor, target, part, effect.damageType, crit, emit, false, meta);
      lucky = this.lastHitLucky;
      for (const o of [guardian, ...others]) {
        if (o.hp <= 0 || part <= 0) continue;
        this.applyHit(actor, o, this.guardShareCut(o, part, actor), effect.damageType, crit, emit, true, meta);
        if (o !== guardian) this.announceIfDead(o, emit);
      }
    } else if (guard && guardian && guardian !== target && guardian.hp > 0) {
      const redirected = Math.round(total * (guard.share ?? 0.5));
      hpLoss = this.applyHit(actor, target, total - redirected, effect.damageType, crit, emit, false, meta);
      lucky = this.lastHitLucky;
      // Guard payı korumacıya ayrı bir vuruştur: hedefin Lucky Escape'i onu iptal etmez (madde 258)
      // Korumacının payı kendi vuruşudur: korumacının kalkanı varsa o pay bloklanabilir (asıl hedefin payı ve ek etkileri aynen)
      if (redirected > 0) {
        if (this.rollBlock(actor, guardian, effect, sure)) emit({ type: 'block', source: actor.uid, target: guardian.uid, guard: true });
        else this.applyHit(actor, guardian, this.guardShareCut(guardian, redirected, actor), effect.damageType, crit, emit, true, meta);
      }
    } else {
      hpLoss = this.applyHit(actor, target, total, effect.damageType, crit, emit, false, meta);
      lucky = this.lastHitLucky;
    }

    // Rage: isabet eden hasar vuruşu, vurulan hasarın hedefin maks canına yüzdesine göre kazanç (hedef başına toplanır; formulas.json > rage)
    // Lucky Escape ile yok sayılan vuruş hiç olmamış sayılır: Rage, lifesteal, Soul Drain, Mana Overflow yok ve "isabet etti" sayılmaz
    // (vuruşa bağlı durumlar: Stun, Wound, Omen... bu hedefe uygulanmaz). Guard payı korumacıya normal işlemiştir.
    if (lucky) {
      if (guardian) this.announceIfDead(guardian, emit);
      return { landed: false };
    }
    if (treeMods) for (const n of treeMods.nodes) this.treeProc(actor.uid, n);
    if (late?.nodes.length) this.treeProcAll(actor.uid, late.nodes);
    // Ağaç izleme: bu düşmana isabet geçmişi, bu kullanımın isabet edenleri; vuruş sonrası (killingBlow) lifesteal / drain kancaları
    let post: TreeModAcc | null = null;
    if (this.treeUnits) {
      if (actor.side !== target.side) {
        let set = this.landedOn.get(actor.uid);
        if (!set) this.landedOn.set(actor.uid, (set = new Set()));
        set.add(target.uid);
      }
      if (this.castInfo && this.castPaid?.uid === actor.uid) this.castInfo.landed.add(target.uid);
      if (actor.treeHooks?.some((h) => h.h === 'cond' && h.late)) {
        post = this.treeMods(actor, target, this.castingSkill, baseEffect, { ...tq, late: true, crit, killed: target.hp <= 0 });
        if (post && !post.lifesteal && post.lifestealMul === 1 && post.drainMul === 1 && !post.drainAdd && !post.drainBond) post = null;
        if (post) this.treeProcAll(actor.uid, post.nodes);
      }
    }
    if (actor.treeHooks?.some((h) => h.h === 'cond' && modGroups(h.mod).has('proc')) || actor.treeBuffs?.some((x) => x.mod && !x.pending && modGroups(x.mod).has('proc'))) this.runProcHooks(actor, target, this.castingSkill, { ...tq, effect: baseEffect, crit, killed: target.hp <= 0 }, emit);
    if (rageHits?.length) this.grantTreeRage(actor, rageHits, emit);
    if (this.rageTally && actor.maxRage !== undefined) {
      const r = f.rage;
      const gain = Math.min(r.perHitCap, r.hitBase + r.perHpPercent * ((total / Math.max(1, target.maxHp)) * 100));
      this.rageTally.set(target.uid, (this.rageTally.get(target.uid) ?? 0) + gain);
    }
    for (const { v: exe, src } of exes) {
      if (actor.hp <= 0 || hpLoss <= 0) break;
      emit({ type: 'passive', actor: actor.uid, passive: 'bloodletter', name: 'Bloodletter' });
      this.applyHeal(actor, actor, Math.max(1, Math.round(hpLoss * exe.ratio)), false, emit);
      if (src === 'tree') this.fxProc(actor, 'executeLifesteal');
    }
    // Emberbrand (onHitDot): isabet eden vuruş hedefe DoT bırakır (miktar uygulamada sabitlenir; yenisi süreyi max(kalan, yeni) yapar, büyük miktar kalır)
    for (const { v: burn, src } of effList(actor, 'onHitDot')) {
      if (!(hpLoss > 0 && target.hp > 0 && this.statusDef(burn.status))) continue;
      const amount = Math.max(1, Math.round(attributePower(this.attackStats(actor), effect.scale, f) * burn.power * (actor.stats.dotPowerMult ?? 1)));
      this.addStatus(target, { kind: burn.status as Status['kind'], turns: burn.turns, source: actor.uid, amount }, emit, 'emberbrand'); // en güçlü miktar addStatus'ta kalır
      if (src === 'tree') this.fxProc(actor, 'onHitDot');
    }
    // Heart of the Forge (critHealAlly): kritik vuruşta en yaralı dost iyileşir
    const forge = effNum(actor, 'critHealAlly');
    if (forge && crit && hpLoss > 0) {
      const hurt = this.living(actor.side).filter((c) => !c.inert && c.hp < c.maxHp).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      if (hurt) {
        emit({ type: 'passive', actor: actor.uid, passive: 'forge_heart', name: 'Heart of the Forge' });
        this.applyHeal(actor, hurt, Math.max(1, Math.round(hpLoss * forge)), false, emit);
      }
    }
    // Whisper of Morvane (killExtraTurn): skill vuruşuyla öldürünce ihtimalle aynı turda bir eylem daha (tur başına en çok bir kez; zincir yok)
    const whisper = effNum(actor, 'killExtraTurn');
    if (whisper && target.hp <= 0 && hpLoss > 0 && !actor.extraTurnGranted && this.mode === 'turns' && this.currentUid === actor.uid && this.rng.next() < whisper) {
      actor.extraTurnGranted = true;
      this.actionsLeft.set(actor.uid, (this.actionsLeft.get(actor.uid) ?? 0) + 1);
      emit({ type: 'passive', actor: actor.uid, passive: 'morvane_whisper', name: 'Whisper of Morvane' });
    }
    // Mana Spring (item etkisi critMp): kendi kritik vuruşunda MP (maks'ı aşmaz); EYLEM başına bir kez (alan / çok vuruşlu skill'ler MP yağdırmasın)
    const springMp = crit && actor.hp > 0 && actor.springAt !== this.turnsTaken ? Math.min(effNum(actor, 'critMp'), actor.maxMp - actor.mp) : 0;
    if (springMp > 0) {
      actor.springAt = this.turnsTaken;
      actor.mp += springMp;
      emit({ type: 'mpRegen', actor: actor.uid, amount: springMp, after: actor.mp, cause: 'mana_spring' });
    }
    const ls = post ? Math.max(0, ((effect.lifesteal ?? 0) + post.lifesteal) * post.lifestealMul) : effect.lifesteal;
    if (ls && actor.hp > 0) {
      // Madde 241: canı doluyken can çalınmaz; Dark Bond kopyası yalnızca GERÇEKTEN iyileşen miktar
      const healed = this.applyHeal(actor, actor, Math.round(hpLoss * ls), false, emit);
      this.bondEcho(actor, healed, emit);
    }
    this.itemHitHooks(actor, target, effect, hpLoss, crit, emit);
    // Pasif: Soul Drain, verilen her hasarın bir kısmı kullanıcıya şifa
    // (çağrılanların verdiği hasardan da sahibi faydalanır)
    const drainer = actor.passive?.effect.type === 'soulDrain' ? actor : actor.owner ? this.get(actor.owner) : undefined;
    const drain = drainer?.passive?.effect;
    if (drainer && drain?.type === 'soulDrain' && drainer.hp > 0 && hpLoss > 0) {
      // Skill ağacı (Vampiric Bite): drainAdd = orana düz ek, drainMul = şifa çarpanı (yalnızca kendi vuruşunda; çağrının vuruşu yamalanmaz)
      const own = drainer === actor && !!(treeMods || post);
      const ratio = own ? (drain.ratio + (treeMods?.drainAdd ?? 0) + (post?.drainAdd ?? 0)) * (treeMods?.drainMul ?? 1) * (post?.drainMul ?? 1) : drain.ratio;
      // Faz 4c (Lifeline): şifanın tamamı Dark Bond'lu dosta (bağ yoksa sahibine)
      const bondTo = own && (treeMods?.drainBond || post?.drainBond) ? this.get(this.bondPartnerOf(drainer.uid) ?? '') : undefined;
      if (bondTo && bondTo.hp > 0) this.applyHeal(drainer, bondTo, Math.max(1, Math.round(hpLoss * Math.max(0, ratio))), false, emit);
      else {
        const healed = this.applyHeal(drainer, drainer, Math.max(1, Math.round(hpLoss * Math.max(0, ratio))), false, emit);
        this.bondEcho(drainer, healed, emit);
      }
    }
    // Pasif: Mana Overflow, büyü zırhının engellediği hasar birikir; eşikte tüm takıma mana
    const overflow = target.passive?.effect;
    if (overflow?.type === 'manaOverflow' && effect.damageType === 'magic' && target.hp > 0) {
      const r = armorReduction(targetStats.magicArmor, f);
      if (r > 0) {
        // Skill ağacı (Soaking Robes): sahibinin kancası sayaca çarpan (blockedMul); kancasızda ifade aynı
        const bm = target.treeHooks ? this.sumHooks(target, actor, null, 'overflow') : null;
        const bmul = bm?.sum.blockedMul ?? 1;
        if (bm?.nodes.length) this.treeProcAll(target.uid, bm.nodes);
        target.charge += bmul !== 1 ? ((total * r) / (1 - r)) * bmul : (total * r) / (1 - r);
        while (target.charge >= overflow.threshold) {
          target.charge -= overflow.threshold;
          this.fireOverflow(target, actor, emit);
        }
      }
    }
    // Faz 5a (Endless Spring): dostun büyü zırhının engellediği büyü hasarı, `allies` bayraklı Mana Overflow sahibinin sayacına da yazılır
    if (this.treeArmorOn && effect.damageType === 'magic' && target.hp > 0) {
      for (const am of this.living(target.side)) {
        const oe = am.passive?.effect;
        if (am === target || oe?.type !== 'manaOverflow' || !oe.allies) continue;
        const r = armorReduction(targetStats.magicArmor, f);
        if (r <= 0) continue;
        am.charge += (total * r) / (1 - r);
        while (am.charge >= oe.threshold) {
          am.charge -= oe.threshold;
          this.fireOverflow(am, actor, emit);
        }
      }
    }
    // Flicker (YM8, mob pasifi): düşman skill vuruşu isabet edince kısa süreli kaçınma buff'ı; kendi turu başına bir kez
    const fl = target.passive?.effect;
    if (fl?.type === 'flicker' && target.hp > 0 && !target.flickered && actor.side !== target.side) {
      target.flickered = true;
      emit({ type: 'passive', actor: target.uid, passive: target.passive!.id, name: target.passive!.name });
      this.addStatus(target, { kind: fl.status, turns: fl.turns, source: target.uid }, emit, target.passive!.id);
    }
    // Rebuke (YM3, mob pasifi): yakın dövüş skill'inin fiziksel vuruşunda zırhın engellediği hasarın bir kısmı saldırana döner (saldıranın zırhı uygulanır)
    const rb = target.passive?.effect;
    if (rb?.type === 'rebuke' && effect.damageType === 'physical' && this.castingSkill?.motion === 'melee' && target.hp > 0 && actor.hp > 0 && actor.side !== target.side) {
      const red = armorReduction(targetStats.armor * (1 - (spec.ignoreDefense ?? 0)), f);
      const landedOnTarget = guard && guardian && guardian !== target && guardian.hp > 0 ? total - Math.round(total * (guard.share ?? 0.5)) : total;
      const back = red > 0 && red < 1 ? Math.round(((landedOnTarget * red) / (1 - red)) * rb.ratio) : 0;
      if (back > 0) {
        emit({ type: 'passive', actor: target.uid, passive: target.passive!.id, name: target.passive!.name });
        this.applyHit(target, actor, this.tickDamage('physical', 'physical', back, actor), 'physical', false, emit, false, { origin: 'status', element: 'physical', damageType: 'physical' });
        this.announceIfDead(actor, emit);
      }
    }
    // Molten Shed (YM22, mob pasifi): savaşta bir kez, düşman skill vuruşu canı ilk kez eşiğin altına indirince karşı tarafa sabit ateş + kendine Fortified
    const ms = target.passive?.effect;
    if (ms?.type === 'moltenShed' && !target.passiveUsed && target.hp > 0 && target.hp < ms.below * target.maxHp && actor.side !== target.side) this.moltenShed(target, ms, emit);
    // Faz 4a: isabet tetikleri (vuran: hit / crit, vurulan: hitTaken, vuranın dostları: allyHit); öldürme tetiği announceIfDead'de
    if (this.trigOn && actor.side !== target.side) {
      const sk = this.castingSkill && actor === this.castingActor ? this.castingSkill.id : undefined;
      const ev = { target, subject: target, source: actor, amount: hpLoss, ...(sk ? { skill: sk } : {}) } as const;
      this.trig([actor], { on: 'hit', ...ev }, emit);
      if (crit) this.trig([actor], { on: 'crit', ...ev }, emit);
      this.trig([target], { on: 'hitTaken', ...ev, target: actor, subject: target, incomingSkill: this.castingSkill }, emit);
      this.trigAll({ on: 'allyHit', ...ev, subject: actor }, emit, (u) => u.side === actor.side && u !== actor);
    }
    this.announceIfDead(target, emit);
    if (guardian) this.announceIfDead(guardian, emit);
    return { landed: true, crit };
  }

  /** Molten Shed (YM22): patlama; karşı taraftaki her canlı sıra alan birime sabit tik hasarı (zırh uygulanır), sonra taşıyana durum. */
  private moltenShed(c: Combatant, e: Extract<PassiveEffect, { type: 'moltenShed' }>, emit: Emit): void {
    c.passiveUsed = true;
    emit({ type: 'passive', actor: c.uid, passive: c.passive!.id, name: c.passive!.name });
    const raw = Math.round(attributePower(c.stats, e.scale, this.setup.formulas) * e.power);
    for (const foe of this.living(opposite(c.side)).filter((u) => !u.inert)) {
      if (raw > 0) this.applyHit(c, foe, this.tickDamage(e.element, 'magic', raw, foe), 'magic', false, emit, false, { origin: 'status', element: e.element, damageType: 'magic' });
      this.announceIfDead(foe, emit);
    }
    if (this.statusDef(e.status)) this.addStatus(c, { kind: e.status, turns: e.turns, source: c.uid }, emit, c.passive!.id);
  }

  /** Martyr's Vow taşıyıcısı: hedefin aynı tahtadaki artı komşusu (ön/arka/sol/sağ), canlı, pasifi henüz kullanılmamış; yoksa undefined. */
  martyrFor(target: Combatant): Combatant | undefined {
    return this.combatants.find((c) => {
      if (c.passive?.effect.type !== 'martyrsVow' || c.passiveUsed || c.hp <= 0 || c.uid === target.uid || c.side !== target.side || c.board !== target.board) return false;
      return Math.abs(this.rowOf(c.slot) - this.rowOf(target.slot)) + Math.abs(this.laneOf(c.slot) - this.laneOf(target.slot)) === 1;
    });
  }

  /**
   * İsabet eden skill vuruşundan sonra item kancaları (Ömer 2026-10-11; affix + yeni Legendary'ler): Life leech, Serrated Edge (kritikte durumlar),
   * Battle Rhythm (öldürünce Haste + MP), Marked Quarry (elit / boss'a durum). Etki yoksa hiçbir şey yapmaz (zar da tüketmez).
   */
  private itemHitHooks(actor: Combatant, target: Combatant, effect: DamageEffect, hpLoss: number, crit: boolean, emit: Emit): void {
    if ((!actor.itemEffects && !actor.treeFx) || hpLoss <= 0) return;
    // Item + ağaç kanalı (tree-hooks.ts): Life leech toplanır (tek şifa); tetikler kaynak başına ayrı (item önce)
    const leech = effNum(actor, 'leech');
    if (leech && actor.hp > 0) {
      const amount = Math.round(hpLoss * leech);
      if (amount > 0) this.applyHeal(actor, actor, amount, false, emit, 'leech');
    }
    for (const [fx, src] of fxBags(actor)) this.hitHooksOf(fx, src, actor, target, effect, crit, emit);
  }

  private hitHooksOf(fx: ItemEffects, src: 'item' | 'tree', actor: Combatant, target: Combatant, effect: DamageEffect, crit: boolean, emit: Emit): void {
    const proc = (key: string) => src === 'tree' && this.fxProc(actor, key);
    if (fx.critStatuses && crit && target.hp > 0) {
      proc('critStatuses');
      emit({ type: 'passive', actor: actor.uid, passive: 'serrated_edge', name: 'Serrated Edge' });
      for (const cs of fx.critStatuses) {
        if (!this.statusDef(cs.status) || target.hp <= 0) continue;
        const amount = cs.power ? Math.max(1, Math.round(attributePower(this.attackStats(actor), effect.scale, this.setup.formulas) * cs.power * (actor.stats.dotPowerMult ?? 1))) : undefined;
        this.addStatus(target, { kind: cs.status as Status['kind'], turns: cs.turns, source: actor.uid, ...(amount !== undefined ? { amount } : {}) }, emit, 'serrated_edge');
      }
    }
    if (fx.tierStatus && target.hp > 0 && (target.tier !== undefined || target.boss !== undefined) && this.statusDef(fx.tierStatus.status)) {
      proc('tierStatus');
      this.addStatus(target, { kind: fx.tierStatus.status as Status['kind'], turns: fx.tierStatus.turns, source: actor.uid }, emit, 'marked_quarry');
    }
    if (fx.killRush && target.hp <= 0 && actor.hp > 0) {
      proc('killRush');
      emit({ type: 'passive', actor: actor.uid, passive: 'battle_rhythm', name: 'Battle Rhythm' });
      if (this.statusDef(fx.killRush.status)) this.addStatus(actor, { kind: fx.killRush.status as Status['kind'], turns: fx.killRush.turns, source: actor.uid }, emit, 'battle_rhythm');
      const gain = Math.min(Math.round(actor.maxMp * fx.killRush.mpRatio), actor.maxMp - actor.mp);
      if (gain > 0) {
        actor.mp += gain;
        emit({ type: 'mpRegen', actor: actor.uid, amount: gain, after: actor.mp, cause: 'battle_rhythm' });
      }
    }
  }

  /** Last Stand (item etkisi lastStand): can eşiğin altına İLK inişte durum + tüm silinebilir debuff'lar silinir (savaşta bir kez). */
  private checkLastStand(target: Combatant, emit: Emit): void {
    for (const { v: ls, src } of effList(target, 'lastStand')) {
      if (onceUsed(target, src, 'lastStand') || target.hp <= 0 || target.hp >= ls.below * target.maxHp) continue;
      markOnce(target, src, 'lastStand');
      emit({ type: 'passive', actor: target.uid, passive: 'last_stand', name: 'Last Stand' });
      this.dispel(target, 'debuff', 99, target, 'last_stand', emit);
      if (this.statusDef(ls.status)) this.addStatus(target, { kind: ls.status as Status['kind'], turns: ls.turns, source: target.uid }, emit, 'last_stand');
      if (src === 'tree') this.fxProc(target, 'lastStand');
    }
  }

  /** Hasarı kalkana (büyüyse önce büyü kalkanına) ve cana uygular; canı düşüren miktarı döndürür. */
  private applyHit(actor: Combatant, target: Combatant, amount: number, type: 'physical' | 'magic', crit: boolean, emit: Emit, redirected: boolean, meta: HitMeta): number {
    this.lastHitLucky = false;
    // Faz 4a C4 (bigHit, Stand Firm): düşman skill vuruşu maks canın eşiğini aşarsa indirilir (yalnızca kancalı hedefte)
    if (this.healOn && target.treeHooks && meta.origin === 'skill' && actor.side !== target.side && amount > 0) amount = this.bigHitCut(target, actor, amount);
    // Luck-primary Lucky Escape (madde 258): kalkanlardan sonra kalan hasar canı bitirecekse, savaş başına bir kez şansla vuruş TAMAMEN
    // yok sayılır: can ve kalkan değişmez, kalkan kancaları/taunt sayacı/lifesteal gibi yan etkiler işlemez (seed'li RNG; zar yalnızca ölümcülse atılır).
    // Faz 5a (Through the Guard): saldıranın pierce kuralı kalkanı yok sayar (yalnızca skill vuruşu)
    const noShield = meta.origin === 'skill' && !!actor.treeHooks && actor.side !== target.side && !!this.pierceOf(actor)?.shields;
    const wouldAbsorb = noShield ? 0 : Math.min(type === 'magic' ? target.magicShield : 0, amount);
    const wouldRest = noShield ? amount : amount - wouldAbsorb - Math.min(target.shield, amount - wouldAbsorb);
    const sc = this.surviveOf(target); // Faz 5a: ağaç luck kuralı (kancasızda stat aynen)
    if (wouldRest >= target.hp && target.hp > 0 && !target.undying && sc > 0 && !this.luckySaved.has(target.uid) && this.rng.next() < sc) {
      this.luckySaved.add(target.uid);
      this.lastHitLucky = true;
      emit({
        type: 'damage',
        source: actor.uid,
        target: target.uid,
        amount: 0,
        absorbed: 0,
        hpAfter: target.hp,
        shieldAfter: target.shield,
        magicShieldAfter: target.magicShield,
        crit,
        ...(redirected ? { redirected: true } : {}),
        origin: meta.origin,
        ...(meta.element ? { element: meta.element } : {}),
        ...(meta.damageType ? { damageType: meta.damageType } : {}),
        ...(meta.ground ? { ground: meta.ground, groundId: meta.groundId } : {}),
        ...(meta.status ? { status: meta.status } : {}),
        luckyEscape: true,
      });
      emit({ type: 'passive', actor: target.uid, passive: 'primary_luck', name: 'Lucky Escape' });
      if (this.trigOn) this.trig([target], { on: 'luckyEscape', target: actor, source: actor }, emit);
      return 0;
    }
    let rest = amount;
    let absorbed = 0;
    let pendingBreak = false;
    const hp0 = target.hp;
    // Kancalı kalkanlar (onAbsorb): emilen miktar önce kancalı katmanlara yazılır; tetikler hasar olayından SONRA işlenir
    this.trimShieldHooks(target);
    const hooked: Array<{ hook: ShieldHook; part: number }> = [];
    if (type === 'magic' && !noShield) {
      const a = Math.min(target.magicShield, rest);
      target.magicShield -= a;
      rest -= a;
      absorbed += a;
      this.drainHooks(target, true, a, hooked);
    }
    const b = noShield ? 0 : Math.min(target.shield, rest);
    target.shield -= b;
    rest -= b;
    absorbed += b;
    this.drainHooks(target, false, b, hooked);
    if (hooked.length > 0) this.trimShieldHooks(target);
    // Boss faz kilidi (Ember Heart): tek eylem en fazla bir eşik geçer; fazla hasar eşiğin 1 altında durur
    if (target.boss?.phases && rest > 0) rest = Math.max(0, Math.min(rest, target.hp - this.phaseFloor(target)));
    // Ölemez birim (UnitSetup.undying; Mill Road açılış savaşı): can 1'de durur
    if (target.undying && rest > 0) rest = Math.max(0, Math.min(rest, target.hp - 1));
    // Faz 5a C6 cheatDeath (Not Today, Undying Rage, Martyr Rising, Last Rite): ölümcül hasar canı `hp` (ya da maks canın hpRatio'su) bırakır
    const saved = this.treeUnits && target.treeHooks && target.hp > 0 && rest >= target.hp ? this.cheatDeathRule(target, crit) : null;
    const keepHp = saved ? (saved.hpRatio !== undefined ? Math.max(1, Math.round(target.maxHp * saved.hpRatio)) : Math.max(1, saved.hp ?? 1)) : 0;
    if (saved) rest = Math.max(0, target.hp - keepHp);
    target.hp = Math.max(0, target.hp - rest);
    if (this.treeUnits && rest > 0 && actor.side !== target.side) {
      // Faz 5a: hasar defteri (mostHurtMe alıcısı, hurtMe önceliği)
      let led = this.hurtBy.get(target.uid);
      if (!led) this.hurtBy.set(target.uid, (led = new Map()));
      led.set(actor.uid, (led.get(actor.uid) ?? 0) + rest);
    }
    const hurtRage = this.hurtRageGain(actor, target, rest);
    const taunt = target.statuses.find((s) => s.kind === 'taunt' && s.breakAt !== undefined);
    if (taunt && rest > 0) {
      taunt.taken = (taunt.taken ?? 0) + rest;
      if (taunt.taken >= (taunt.breakAt ?? Infinity)) {
        target.statuses = target.statuses.filter((s) => s !== taunt);
        pendingBreak = true;
      }
    }
    emit({
      type: 'damage',
      source: actor.uid,
      target: target.uid,
      amount: rest,
      absorbed,
      hpAfter: target.hp,
      shieldAfter: target.shield,
      magicShieldAfter: target.magicShield,
      crit,
      ...(redirected ? { redirected: true } : {}),
      origin: meta.origin,
      ...(meta.element ? { element: meta.element } : {}),
      ...(meta.damageType ? { damageType: meta.damageType } : {}),
      ...(meta.ground ? { ground: meta.ground, groundId: meta.groundId } : {}),
      ...(meta.status ? { status: meta.status } : {}),
    });
    if (pendingBreak) emit({ type: 'statusEnd', target: target.uid, status: 'taunt', broken: true });
    if (pendingBreak && taunt && this.trigOn) this.statusEndTrig(target, taunt, 'broken', emit);
    if (saved) {
      // Martyr Rising: maks canın oranıyla kalkar (canı o orandan azsa yükselir)
      if (target.hp < keepHp) {
        const up = keepHp - target.hp;
        target.hp = keepHp;
        emit({ type: 'heal', source: target.uid, target: target.uid, amount: up, hpAfter: target.hp, crit: false, cause: saved.node });
      }
      this.afterCheatDeath(target, actor, saved, emit);
    }
    if (hurtRage > 0) {
      target.rage = Math.min(target.maxRage!, (target.rage ?? 0) + hurtRage);
      emit({ type: 'rage', actor: target.uid, delta: hurtRage, after: target.rage, max: target.maxRage!, cause: 'hurt' });
    }
    if (target.boss?.phases && target.hp > 0) this.checkPhase(target, emit);
    this.checkSecondWind(target, emit);
    this.checkShieldRefresh(target, emit);
    this.checkLastStand(target, emit);
    if (rest > 0 || absorbed > 0) {
      this.damagedPassives(actor, target, meta, emit);
      if (this.trigOn) {
        this.lastHitOn.get(target.uid)!.amount = rest;
        if (actor.summoned && actor.side !== target.side) this.summonLastHit.set(actor.uid, target.uid);
      }
    }
    // Kalkan kancaları yalnızca DOĞRUDAN bir saldırganın skill vuruşunda (yer etkisi tiki / kendine hasar tetiklemez)
    if (meta.origin === 'skill' && actor.side !== target.side) for (const { hook, part } of hooked) this.absorbTrigger(hook, target, actor, part, emit);
    // Faz 4a: kalkan tetikleri (kalkanı atanın: emdi / kırıldı) ve can eşiği geçişi (hpBelow)
    if (this.trigOn) {
      if (meta.origin === 'skill' && actor.side !== target.side) {
        for (const { hook, part } of hooked) {
          const caster = this.get(hook.caster);
          const ev = { target: actor, subject: target, source: actor, skill: hook.skill, amount: part, shield: hook, incomingSkill: this.castingSkill } as const;
          this.trig([caster], { on: 'shieldAbsorb', ...ev }, emit);
          if (hook.amount <= 0) this.trig([caster], { on: 'shieldBreak', ...ev }, emit);
        }
      }
      if (rest > 0) this.hpCrossTrig(target, hp0, actor, emit);
    }
    return rest;
  }

  /**
   * Berserker (rage pasifi rageOnHurt, Ömer 2026-10-17): Rage'li birim CAN kaybedince Rage kazanır: kaybedilen can maks canın %1'i başına
   * perHpPercent (vuruş başına en fazla perHitCap; Resource mastery affix'i kazancı artırır). Kalkanın emdiği, kendi verdiği hasar ve
   * ölümcül vuruş (birim düştü) sayılmaz; Rage barı doluysa 0. Dönen değer gerçekten eklenecek miktar (olayı applyHit yazar).
   */
  private hurtRageGain(actor: Combatant, target: Combatant, lost: number): number {
    const pe = target.passive?.effect;
    if (pe?.type !== 'rage' || !pe.rageOnHurt || target.maxRage === undefined || lost <= 0 || target.hp <= 0 || actor.uid === target.uid || target.maxHp <= 0) return 0;
    const r = pe.rageOnHurt;
    let gain = (lost / target.maxHp) * 100 * r.perHpPercent;
    if (r.perHitCap !== undefined) gain = Math.min(r.perHitCap, gain);
    const rg = effNum(target, 'rageGain');
    gain = Math.round(gain * (rg > 0 ? 1 + rg : 1));
    return Math.max(0, Math.min(target.maxRage - (target.rage ?? 0), gain));
  }

  /**
   * Hasar alınınca (can ya da kalkan) çalışan mob pasifleri (YM1, YM4, YM13) ve son vuranın kaydı (YM2 Last Ember). Pasif yoksa yalnızca kayıt yazılır
   * (rastgele sayı tüketmez; savaş akışı aynı).
   */
  private damagedPassives(actor: Combatant, target: Combatant, meta: HitMeta, emit: Emit): void {
    this.lastHitOn.set(target.uid, { source: actor.uid, origin: meta.origin });
    const pe = target.passive?.effect;
    // Grudge (YM14): kin, ona en son SKILL ile vuran düşmana geçer
    if (pe?.type === 'grudge' && meta.origin === 'skill' && actor.side !== target.side) target.grudgeOn = actor.uid;
    // Skill ağacı koşul izlemesi (yalnızca ağaçlı savaş; "sana vuran" = yalnızca düşman SKILL vuruşu, plan 10a): son vuran + son turundan beri vuranlar
    if (this.treeUnits && meta.origin === 'skill' && actor.side !== target.side) {
      this.lastSkillHit.set(target.uid, actor.uid);
      let set = this.hitSince.get(target.uid);
      if (!set) this.hitSince.set(target.uid, (set = new Set()));
      set.add(actor.uid);
      this.hitsTaken.set(target.uid, (this.hitsTaken.get(target.uid) ?? 0) + 1);
    }
    // Stone Patience: herhangi bir hasar birikmiş zırhı sıfırlar
    if (pe?.type === 'stonePatience') {
      target.patienceHurt = true;
      if (target.patience) target.patience = 0;
    }
    // Cut and Run: savaşta bir kez, can eşiğin altına ilk inişte Shrouded + hız desteği (Skip Turn gibi: sıradaki turu daha erken)
    if (pe?.type === 'cutAndRun' && !target.passiveUsed && target.hp > 0 && target.hp < pe.below * target.maxHp) {
      target.passiveUsed = true;
      emit({ type: 'passive', actor: target.uid, passive: target.passive!.id, name: target.passive!.name });
      this.addStatus(target, { kind: pe.status, turns: pe.turns, source: target.uid }, emit, target.passive!.id);
      if (this.mode === 'turns' && pe.speedBoost > 0) this.speedBoost.set(target.uid, Math.max(this.speedBoostOf(target.uid), pe.speedBoost));
    }
    // Vessel of the Choir: bir dostu (taşıyan hariç) düşman skill'inden hasar aldıkça MP
    if (meta.origin === 'skill' && actor.side !== target.side) {
      for (const p of this.combatants) {
        const e = p.passive?.effect;
        if (e?.type !== 'choirVessel' || p.hp <= 0 || p.uid === target.uid || p.side !== target.side) continue;
        const gain = Math.max(0, Math.min(e.mpPerHit, p.maxMp - p.mp));
        if (gain <= 0) continue;
        p.mp += gain;
        emit({ type: 'mpRegen', actor: p.uid, amount: gain, after: p.mp, cause: p.passive!.id });
      }
    }
  }

  /**
   * Nature's Grudge (pasif naturesGrudge): ölen çağrı olmayan kahramanın tarafındaki her taşıyan (canlı ya da ölen kahramanın kendisi), öldürmenin
   * sahibine (lastHitOn: son vuran; DoT/zemin ölümünde kaynağı) `turns` tur `status` + `dot` uygular. Öldüren yoksa, ölmüşse, sıra almayan nesneyse ya da
   * aynı taraftansa olmaz. Durumlar addStatus kurallarıyla (yenileme, direnç, bağışıklık) eklenir; Wither tiki taşıyanın scale gücü x power.
   */
  private naturesGrudge(dead: Combatant, emit: Emit): void {
    if (dead.summoned || dead.inert) return;
    const lh = this.lastHitOn.get(dead.uid);
    const killer = lh ? this.get(lh.source) : undefined;
    if (!killer || killer.hp <= 0 || killer.side === dead.side || killer.inert) return;
    const f = this.setup.formulas;
    for (const d of this.combatants) {
      const e = d.passive?.effect;
      if (e?.type !== 'naturesGrudge' || d.side !== dead.side || d.summoned || (d.hp <= 0 && d !== dead)) continue;
      if (killer.hp <= 0) break;
      emit({ type: 'passive', actor: d.uid, passive: d.passive!.id, name: d.passive!.name });
      // Faz 2c: Slow ağaçla kaldırılabilir (Black Mold); Wither'in ayrı süresi dotTurns (Deep Rot; yoksa turns)
      if (e.status && this.statusDef(e.status)) this.addStatus(killer, { kind: e.status, turns: e.turns, source: d.uid }, emit, d.passive!.id);
      if (this.statusDef(e.dot)?.dot) {
        const dm = d.stats.dotPowerMult; // DoT damage / Potency (affix): skill DoT'larıyla aynı
        const amount = Math.round(attributePower(d.stats, e.scale, f) * (dm !== undefined && dm !== 1 ? e.power * dm : e.power));
        this.addStatus(killer, { kind: e.dot, turns: e.dotTurns ?? e.turns, source: d.uid, amount }, emit, d.passive!.id);
      }
    }
  }

  /** `doomed`: birim Doom ile öldüyse tüketilen yığın (Ill Omen yalnızca onDoomKill kadar geçirir). */
  private announceIfDead(c: Combatant, emit: Emit, doomed?: Status): void {
    if (c.hp > 0 || this.announcedDead.has(c.uid) || c.lifespan === 0) return;
    this.announcedDead.add(c.uid);
    if (this.treeUnits) {
      this.diedAt.set(c.uid, this.treeClock);
      const caster = this.castPaid ? this.get(this.castPaid.uid) : undefined;
      if (this.castInfo && caster && caster.side !== c.side) this.castInfo.kills++;
    }
    // Çağrı olmayan birim yuvasında ceset bırakır (revivable); çağrının ölümü (sahibiyle birlikte ölmesi dahil) ceset bırakmaz
    const corpse = this.leaveCorpse(c);
    if (!c.summoned && !c.inert) this.fellInBattle.add(c.uid);
    emit({ type: 'death', target: c.uid, corpse });
    if (this.trigOn && !c.inert) this.deathTrig(c, emit, doomed);
    // fallAllyHealRatio (endless Last Rites): düşen kahramanın canlı dostları maks canlarının bu oranı kadar iyileşir
    if (!c.summoned && c.fallAllyHealRatio) for (const a of this.living(c.side)) if (!a.summoned && a !== c) this.applyHeal(c, a, Math.round(a.maxHp * c.fallAllyHealRatio), false, emit, 'last_rites');
    // Vengeance (item etkisi): ekranda yan komşu dost (çağrı değil) düşünce taşıyan durumları kazanır
    if (!c.summoned) for (const a of this.living(c.side)) {
      for (const { v: vg, src } of effList(a, 'vengeance')) {
        if (a === c || (vg.scope !== 'any' && !this.sideAdjacent(a, c))) continue; // Faz 2c: scope 'any' = herhangi bir dost (Last Wall Standing)
        emit({ type: 'passive', actor: a.uid, passive: 'vengeance', name: 'Vengeance' });
        for (const st of vg.statuses) if (this.statusDef(st)) this.addStatus(a, { kind: st as Status['kind'], turns: vg.turns, source: a.uid }, emit, 'vengeance');
        if (src === 'tree') this.fxProc(a, 'vengeance');
      }
    }
    // Nature's Grudge (Druid pasifi): çağrı olmayan bir dost kahraman (Druid'in kendisi dahil) düşünce öldüren düşman Slow + Wither alır
    this.naturesGrudge(c, emit);
    // Last Ember (YM2, mob pasifi): bir düşman SKILL vuruşuyla öldüyse öldürenin hücresi süreli yanan zemin olur (zemin/DoT ile ölümde olmaz)
    const le = c.passive?.effect;
    const lh = this.lastHitOn.get(c.uid);
    if (le?.type === 'lastEmber' && lh?.origin === 'skill') {
      const killer = this.get(lh.source);
      if (killer && killer.hp > 0 && killer.side !== c.side && !killer.inert) {
        const g: GroundEffect = {
          id: `g${this.groundCount++}`,
          ground: le.ground,
          board: killer.board,
          slots: [killer.slot],
          turns: le.turns,
          source: c.uid,
          sourceSide: c.side,
          amount: Math.round(attributePower(c.stats, le.scale, this.setup.formulas) * le.power),
          scale: le.scale,
          sourceStat: c.stats[le.scale],
          power: le.power,
          tickOn: killer.uid,
        };
        this.ground.push(g);
        emit({ type: 'passive', actor: c.uid, passive: c.passive!.id, name: c.passive!.name });
        emit({ type: 'ground', id: g.id, ground: g.ground, board: g.board, slots: g.slots, turns: g.turns });
      }
    }
    // Shares of the Dead (YM19, mob pasifi): çağrı olmayan bir dost ölünce Fortified + kalıcı hasar eki (yığılır)
    if (!c.summoned && !c.inert) for (const a of this.living(c.side)) {
      const e = a.passive?.effect;
      if (e?.type !== 'sharesOfDead' || a === c) continue;
      a.shares = (a.shares ?? 0) + 1;
      emit({ type: 'passive', actor: a.uid, passive: a.passive!.id, name: a.passive!.name });
      if (this.statusDef(e.status)) this.addStatus(a, { kind: e.status, turns: e.turns, source: a.uid }, emit, a.passive!.id);
    }
    // Crown of Ash (YM23, boss pasifi): çağrı olmayan bir dost ölünce maks canın oranı kadar süreli kalkan (katman yığılır)
    if (!c.summoned && !c.inert) for (const a of this.living(c.side)) {
      const e = a.passive?.effect;
      if (e?.type !== 'crownOfAsh' || a === c) continue;
      this.timedShield(a, a, a.passive!.id, Math.round(a.maxHp * e.ratio), e.turns, emit);
    }
    // Corpse Hunger (YM9, mob pasifi): çağrı olmayan herhangi bir birim ölünce taşıyan maks canının oranı kadar iyileşir
    if (!c.summoned && !c.inert) for (const a of this.combatants) {
      const e = a.passive?.effect;
      if (e?.type !== 'corpseHunger' || a.hp <= 0 || a === c || a.hp >= a.maxHp) continue;
      emit({ type: 'passive', actor: a.uid, passive: a.passive!.id, name: a.passive!.name });
      this.applyHeal(a, a, Math.max(1, Math.round(a.maxHp * e.ratio)), false, emit, a.passive!.id);
    }
    // Dark Bond: ölen birimin kurduğu ya da taşıdığı bağ kopar
    this.breakAllBonds(c, emit);
    // Ill Omen (Hexer pasifi): ölenin Omen'leri en yakın canlı dostuna geçer
    this.illOmen(c, emit, doomed);
    // Boss: yardımcı kırıldı (Stagger, telgraf iptali) / boss öldü (yardımcıları çöker); ölen birime bağlı telgraflar iptal
    if (this.telegraphs.length > 0 || c.boss || this.combatants.some((o) => o.boss?.anchor?.unit === c.defId)) this.bossDeathRules(c, emit);
    // Çağıran ölünce çağırdıkları da ölür
    for (const s of this.combatants) {
      if (s.owner === c.uid && s.hp > 0) {
        s.hp = 0;
        this.announceIfDead(s, emit);
      }
    }
  }

  /** Şifa uygular; GERÇEKTEN iyileşen miktarı döndürür (can maks'ı ve alınan şifa çarpanları sonrası). */
  private applyHeal(source: Combatant, target: Combatant, wantedRaw: number, crit: boolean, emit: Emit, cause?: string): number {
    if (target.inert) return 0; // sıra almayan yardımcı nesne şifa almaz
    // Faz 4a: C4 kancalı veren / alan (yalnızca ağaçlı savaş) ağaç yolundan geçer
    if (this.healOn && (source.treeHooks?.some((h) => h.h === 'heal') || target.treeHooks?.some((h) => h.h === 'heal'))) return this.treeHeal(source, target, wantedRaw, crit, emit, cause);
    const wanted = Math.round(wantedRaw * this.statusMult(target, 'healTakenMult')); // Wound gibi durumlar alınan şifayı azaltır
    const amount = Math.max(0, Math.min(wanted, target.maxHp - target.hp));
    if (amount === 0 && (source === target || wanted === 0)) return 0; // boş şifa olayı üretme
    target.hp += amount;
    emit({ type: 'heal', source: source.uid, target: target.uid, amount, hpAfter: target.hp, crit, ...(cause ? { cause } : {}) });
    if (this.trigOn && amount > 0) this.trigAll({ on: 'enemyHealed', target, subject: target, source, amount, prevented: Math.max(0, wantedRaw - wanted) }, emit, (u) => u.side !== target.side);
    return amount;
  }

  /** Bir tarafın en önde duran canlı biriminin sırası (0 = en önde). */
  frontRowOf(side: Side): number {
    const rows = this.living(side).filter((c) => c.board === side).map((c) => this.rowOf(c.slot));
    return rows.length ? Math.min(...rows) : 0;
  }

  // --- Debug araçları (yalnızca debug menüsü çağırır; oyun kuralı değişmez, durum olay akışıyla UI'a yansır) ---

  private readonly debugEmit: Emit = (e) => this.record(e);

  private checkWinner(): void {
    this.resolveEnd(this.debugEmit)?.(); // dalgalı savaş: debug ile son düşman ölünce sıradaki dalga gelir
  }

  /** Debug: birimi öldürür (olaylar: death; takım biterse battleEnd). */
  debugKill(uid: string, allowEnd = true): ActionResult {
    const c = this.get(uid);
    if (!c || c.hp <= 0) return { ok: false, reason: 'Unit is not alive' };
    if (this.winner) return { ok: false, reason: 'Battle is over' };
    c.hp = 0;
    c.shield = 0;
    c.magicShield = 0;
    delete c.shieldHooks;
    this.record({ type: 'resource', actor: c.uid, resource: 'hp', amount: 0, after: 0 });
    this.announceIfDead(c, this.debugEmit);
    if (allowEnd) this.checkWinner();
    return { ok: true, events: [] };
  }

  /** Debug: düşmüş (çağrı olmayan) birimi (hücresi doluysa en yakın boş hücrede), maks canının `ratio` kadarıyla diriltir (debug aracı: tüketilmiş cesedi de diriltir; ceset kaydı silinir). */
  debugRevive(uid: string, ratio = 1): ActionResult {
    const c = this.get(uid);
    if (!c || c.hp > 0) return { ok: false, reason: 'Unit is not dead' };
    if (this.winner) return { ok: false, reason: 'Battle is over' };
    if (c.summoned) return { ok: false, reason: 'Summons cannot be revived' };
    if (c.removed) return { ok: false, reason: 'Unit left the battle' };
    // Madde 257: hücresi doluysa en yakın boş hücrede dirilir (Resurrection'ın varsayılan hücre kuralı); hiç boş hücre yoksa olmaz
    const free = this.freeSlots(c.side);
    if (free.length === 0) return { ok: false, reason: 'No free cell' };
    const from = c.slot;
    if (c.board !== c.side || !free.includes(c.slot)) {
      const dist = (s: number) => Math.abs(this.rowOf(s) - this.rowOf(c.slot)) + Math.abs(this.laneOf(s) - this.laneOf(c.slot));
      c.board = c.side;
      c.slot = [...free].sort((a, b) => dist(a) - dist(b) || this.rowOf(a) - this.rowOf(b) || a - b)[0]!;
    }
    c.hp = Math.max(1, Math.round(c.maxHp * ratio));
    c.mp = Math.round(c.maxMp * ratio);
    c.shield = 0;
    c.magicShield = 0;
    delete c.shieldHooks;
    c.statuses = [];
    c.turnCounter = 0;
    if (c.maxRage !== undefined) c.rage = 0;
    this.announcedDead.delete(c.uid);
    this.clearCorpse(c.uid);
    this.record({ type: 'revive', source: c.uid, target: c.uid, hpAfter: c.hp, mpAfter: c.mp, slot: c.slot, from });
    return { ok: true, events: [] };
  }

  /** Debug: can, mana ya da Rage'i ayarlar (can 0 = öldür; ölü birimde can > 0 = diriltir; rage yalnızca Rage'li birimde). */
  debugSetResource(uid: string, resource: 'hp' | 'mp' | 'rage', value: number): ActionResult {
    const c = this.get(uid);
    if (!c) return { ok: false, reason: 'No such unit' };
    if (resource === 'rage') {
      if (c.maxRage === undefined) return { ok: false, reason: 'Unit has no rage' };
      const v = Math.max(0, Math.min(c.maxRage, Math.round(value)));
      const before = c.rage ?? 0;
      c.rage = v;
      if (v !== before) this.record({ type: 'rage', actor: c.uid, delta: v - before, after: v, max: c.maxRage });
      return { ok: true, events: [] };
    }
    const max = resource === 'hp' ? c.maxHp : c.maxMp;
    const v = Math.max(0, Math.min(max, Math.round(value)));
    if (resource === 'hp') {
      if (v <= 0) return this.debugKill(uid);
      if (c.hp <= 0) return this.debugRevive(uid, v / c.maxHp);
    } else if (c.hp <= 0) return { ok: false, reason: 'Unit is dead' };
    if (c[resource] === v) return { ok: true, events: [] };
    c[resource] = v;
    this.record({ type: 'resource', actor: c.uid, resource, amount: 0, after: v });
    return { ok: true, events: [] };
  }

  /** Debug: bir tarafın (ya da herkesin) canlı birimlerinin can ve manasını doldurur. */
  debugFill(side?: Side): void {
    for (const c of this.combatants) {
      if (c.hp <= 0 || (side && c.side !== side)) continue;
      this.debugSetResource(c.uid, 'hp', c.maxHp);
      this.debugSetResource(c.uid, 'mp', c.maxMp);
    }
  }

  /** Debug: bekleme sürelerini sıfırlar (verilen birim ya da herkes). */
  debugClearCooldowns(uid?: string): void {
    for (const c of this.combatants) {
      if (uid && c.uid !== uid) continue;
      c.cooldowns = {};
      this.initialHold.delete(c.uid);
    }
  }

  /** Debug: tanımlı bir durumu (data/statuses.json) birime ekler. */
  debugAddStatus(uid: string, kind: string, turns = 3): ActionResult {
    const c = this.get(uid);
    if (!c || c.hp <= 0) return { ok: false, reason: 'Unit is not alive' };
    const def = this.statusDef(kind);
    if (!def) return { ok: false, reason: 'Unknown status' };
    // Yığılan durum (Omen): her eklemede +1 yığın (snapshot = taşıyanın kendi statı; kaynağı Hexer değil, Ill Omen çalışmaz); 3'te Doom
    if (def.maxStacks) this.addStacks(c, kind as Status['kind'], 1, c, this.debugEmit, false, true);
    else this.addStatus(c, { kind: kind as Status['kind'], turns: Math.max(1, Math.round(turns)), source: c.uid, ...(def.dot ? { amount: 1 } : {}) }, this.debugEmit);
    return { ok: true, events: [] };
  }

  /** Debug: birimin tüm durumlarını ve kalkanlarını temizler. */
  debugClearStatuses(uid: string): void {
    const c = this.get(uid);
    if (!c) return;
    this.breakAllBonds(c, this.debugEmit); // bağın öbür ucunda sahipsiz kopya kalmasın
    c.statuses = [];
    c.shield = 0;
    c.magicShield = 0;
    delete c.shieldHooks;
  }

  /** Debug: tüm düşmüş (çağrı olmayan) birimleri diriltir. */
  debugReviveAll(): void {
    for (const c of this.combatants) if (c.hp <= 0 && !c.summoned) this.debugRevive(c.uid);
  }

  /** Debug: her şeyi eski haline getirir (galeri sonrası): ölüler diri, çağrılar gider, durum/kalkan/yer etkisi temiz, can/mana dolu. */
  debugResetAll(): void {
    for (const c of this.combatants) {
      if (c.summoned && c.hp > 0) {
        c.hp = 0;
        this.announcedDead.add(c.uid);
        this.record({ type: 'despawn', target: c.uid });
      }
    }
    for (const g of [...this.ground]) {
      this.ground.splice(this.ground.indexOf(g), 1);
      this.record({ type: 'groundEnd', id: g.id });
    }
    for (const t of [...this.telegraphs]) this.cancelTelegraph(t, 'debug', this.debugEmit);
    this.debugReviveAll();
    for (const c of this.combatants) if (c.hp > 0) this.debugClearStatuses(c.uid);
    this.debugFill();
  }

  private record(e: BattleEvent): void {
    this.log.push(e);
    for (const l of this.listeners) l(e);
  }
}

/** Çağıranın çağrılarına geçen temel statları (item HARİÇ): Stats.summonBase (güç katmanı verdiyse) ya da birimin kendi temel statları. */
function summonerAttrs(c: Combatant): Attributes {
  const s = c.stats.summonBase;
  return s ? { ...s } : { str: c.stats.str, int: c.stats.int, dex: c.stats.dex, luck: c.stats.luck };
}

function createCombatant(def: CombatantDef, side: Side, slot: number, uid: string): Combatant {
  return {
    uid,
    defId: def.id,
    name: def.name,
    spriteId: def.spriteId,
    ...(def.spriteScale ? { spriteScale: def.spriteScale } : {}),
    color: def.color,
    logo: def.logo,
    side,
    board: side,
    slot,
    stats: { ...def.stats },
    hp: def.stats.hp,
    maxHp: def.stats.hp,
    mp: def.stats.mp,
    maxMp: def.stats.mp,
    shield: 0,
    magicShield: 0,
    statuses: [],
    tags: [...(def.tags ?? [])],
    skills: [...def.skills],
    summoned: false,
    lifespan: undefined,
    ai: def.ai,
    ...(def.passive ? { passive: def.passive } : {}),
    charge: 0,
    turnCounter: 0,
    cooldowns: {},
    ...(def.maxRage !== undefined ? { rage: 0, maxRage: def.maxRage } : {}),
    ...(def.boss ? { boss: def.boss } : {}),
    ...(def.inert ? { inert: true } : {}),
  };
}

/**
 * Savaş kurulumundaki birim (UnitSetup opsiyonel): güçlendirme tanıma uygulanır (statlar formüllerle yeniden türetilir), sonra özel ad / rütbe /
 * başlangıç canı ve MP'si / hazır çağrı bayrağı yazılır. `unit` yoksa ya da boşsa createCombatant ile birebir aynı birim döner. Rastgelelik kullanmaz.
 */
function createSetupCombatant(baseDef: CombatantDef, side: Side, slot: number, uid: string, unit: UnitSetup | undefined, formulas: Formulas): Combatant {
  if (!unit) return createCombatant(baseDef, side, slot, uid);
  const mods = unit.modifiers;
  // Taşınan ceset tüketen çağrı (Endless): beslenmiş / beslenmemiş varyantı (savaşta çağrıldığı gibi)
  const variantDef = unit.empowered !== undefined && baseDef.variants ? applySummonVariant(baseDef, unit.empowered ? 'fed' : 'unfed', formulas) : baseDef;
  // Faz 2c (Gaunt Frame): ağacın maks can çarpanı yalnızca stat türetiminde modifiers.hpMult ile çarpılır (c.modifiers aynen kalır)
  const th = unit.tree?.hpMult;
  const statMods = th !== undefined && th !== 1 ? { ...(mods ?? {}), hpMult: (mods?.hpMult ?? 1) * th } : mods;
  const c = createCombatant(applyUnitModifiers(variantDef, statMods, formulas), side, slot, uid);
  // Faz 5a (Pledged Plate): ağacın kendi zırh çarpanı (türetilmiş zırha; aura payları bu zırhtan hesaplanır)
  const tam = unit.tree?.armorMult;
  if (tam !== undefined && tam !== 1) c.stats = { ...c.stats, armor: Math.max(0, Math.round(c.stats.armor * tam * 10000) / 10000) };
  if (unit.displayName) c.displayName = unit.displayName;
  if (unit.tier) c.tier = unit.tier;
  if (unit.level !== undefined && Number.isFinite(unit.level) && unit.level >= 1) c.level = Math.floor(unit.level);
  if (unit.summonBase) c.stats.summonBase = { ...unit.summonBase };
  if (mods && Object.keys(mods).length > 0) c.modifiers = { ...mods, ...(mods.attrMult ? { attrMult: { ...mods.attrMult } } : {}), ...(mods.attrAdd ? { attrAdd: { ...mods.attrAdd } } : {}) };
  const actions = Math.floor(mods?.actionsPerTurn ?? 1);
  if (actions > 1) c.actionsPerTurn = actions;
  const finite = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v);
  // Başlangıç canı: mutlak değer öncelikli; ölü başlanamaz (en az 1), maks canı aşmaz
  const hp = finite(unit.startHp) ? unit.startHp : finite(unit.startHpRatio) ? c.maxHp * unit.startHpRatio : undefined;
  if (hp !== undefined) c.hp = Math.max(1, Math.min(c.maxHp, Math.round(hp)));
  const mp = finite(unit.startMp) ? unit.startMp : finite(unit.startMpRatio) ? c.maxMp * unit.startMpRatio : undefined;
  if (mp !== undefined) c.mp = Math.max(0, Math.min(c.maxMp, Math.round(mp)));
  // Kalıntı kancaları (endless; verilmezse birim aynı): savaş başı kalkan, ilk eylem hasar çarpanı, düşünce dostlara şifa
  if (finite(unit.startShieldRatio) && unit.startShieldRatio > 0) c.shield += Math.round(c.maxHp * unit.startShieldRatio);
  if (finite(unit.openingDamageMult) && unit.openingDamageMult !== 1) c.openingDamageMult = unit.openingDamageMult;
  if (finite(unit.fallAllyHealRatio) && unit.fallAllyHealRatio > 0) c.fallAllyHealRatio = unit.fallAllyHealRatio;
  // Epic item etkileri (madde 292): verilmezse birim aynı
  const ie = unit.itemEffects;
  if (ie && Object.keys(ie).length > 0) {
    c.itemEffects = JSON.parse(JSON.stringify(ie)) as ItemEffects;
    if (finite(ie.startShieldRatio) && ie.startShieldRatio > 0) c.shield += Math.round(c.maxHp * ie.startShieldRatio);
    if (finite(ie.startCharge) && ie.startCharge > 0) c.turnCounter = Math.round(formulas.turn.threshold * Math.min(ITEM_HOOK_CAPS.initiative, ie.startCharge));
    if (ie.shieldRefresh && ie.shieldRefresh.start > 0) c.shield += Math.round(c.maxHp * ie.shieldRefresh.start); // Mantle of Valdren
  }
  // Skill ağacı (derlenmiş; docs/design/skill-tree-implementation.md 4.1): birimin kendi skill'lerinin yamalı tanımları + yamalı pasif.
  // Verilmezse birim aynı. Skill id'leri değişmez; listede olmayan skill ve id'si farklı pasif yok sayılır.
  const tr = unit.tree;
  if (tr?.skills) {
    const own = Object.entries(tr.skills).filter(([id]) => c.skills.includes(id));
    if (own.length) c.skillDefs = Object.fromEntries(own);
  }
  if (tr?.passive && c.passive && tr.passive.id === c.passive.id) c.passive = tr.passive;
  if (unit.evolved?.length) c.evolved = unit.evolved.filter((id) => c.skills.includes(id)); // yalnızca sunum (ikon animasyonu)
  // Faz 8: skill biçim seçimleri (birimin skill listesindekiler)
  if (tr?.modes) {
    const own = Object.entries(tr.modes).filter(([id]) => c.skills.includes(id));
    if (own.length) c.skillModes = Object.fromEntries(own);
  }
  // Faz 2a: (b) unitFx kanalı (item'lerden ayrı; savaş başı etkileri item'inkiler gibi burada) + (c) kancalar. Verilmezse birim aynı
  const tf = tr?.fx;
  if (tf && Object.keys(tf).length > 0) {
    c.treeFx = JSON.parse(JSON.stringify(tf)) as ItemEffects;
    if (tr!.fxNodes) c.treeFxNodes = tr!.fxNodes;
    if (finite(tf.startShieldRatio) && tf.startShieldRatio > 0) c.shield += Math.round(c.maxHp * tf.startShieldRatio);
    if (finite(tf.startCharge) && tf.startCharge > 0) c.turnCounter = Math.round(formulas.turn.threshold * Math.min(ITEM_HOOK_CAPS.initiative, effNum(c, 'startCharge')));
    if (tf.shieldRefresh && tf.shieldRefresh.start > 0) c.shield += Math.round(c.maxHp * tf.shieldRefresh.start);
  }
  if (tr?.hooks?.length) c.treeHooks = tr.hooks;
  if (tr?.summons && Object.keys(tr.summons).length) c.treeSummons = tr.summons;
  // Hazır çağrı (ör. düşman Skeleton): çağrı kuralları, sahipsiz ve süresiz
  if (unit.summoned) c.summoned = true;
  if (unit.lockSkills && unit.lockSkills.length > 0) c.lockedSkills = [...unit.lockSkills];
  if (unit.undying) c.undying = true;
  if (finite(unit.initialCooldownBonus) && unit.initialCooldownBonus > 0) c.initialCooldownBonus = Math.floor(unit.initialCooldownBonus);
  // Endless sürekli akış: taşınan durum (Rage, buff'lar, kalkan, çağrı sahibi/ömrü); verilmezse birim aynı
  if (finite(unit.startRage) && c.maxRage !== undefined) c.rage = Math.max(0, Math.min(c.maxRage, Math.round(unit.startRage)));
  if (unit.startStatuses && unit.startStatuses.length > 0) c.statuses = unit.startStatuses.map((s) => ({ ...s }));
  if (finite(unit.startShield) && unit.startShield > 0) c.shield = Math.max(c.shield, Math.round(unit.startShield));
  if (finite(unit.startMagicShield) && unit.startMagicShield > 0) c.magicShield = Math.max(c.magicShield, Math.round(unit.startMagicShield));
  if (unit.startShieldHooks && unit.startShieldHooks.length > 0) c.shieldHooks = unit.startShieldHooks.map((h) => ({ ...h, onAbsorb: { ...h.onAbsorb } }));
  if (unit.owner) c.owner = unit.owner;
  if (finite(unit.lifespan)) c.lifespan = Math.max(1, Math.floor(unit.lifespan));
  if (unit.empowered !== undefined && c.summoned) c.empowered = unit.empowered;
  if (unit.skipInitialCooldown) c.skipInitialCooldown = true;
  if (unit.startCooldowns) for (const [k, v] of Object.entries(unit.startCooldowns)) if (finite(v) && v > 0 && c.skills.includes(k)) c.cooldowns[k] = Math.floor(v);
  return c;
}

/** Birimde skill ağacı izi var mı (yamalı skill, unitFx kanalı ya da kanca). */
const hasTree = (c: Combatant): boolean => !!(c.skillDefs || c.treeFx || c.treeHooks || c.treeSummons || c.skillModes);
/** Faz 5a: yalnızca pasifi yamalı (kancasız) ağaçta da aura büyü zırhı (Drilled Ranks) işler. */
const treeAura = (c: Combatant): boolean => {
  const e = c.passive?.effect;
  return (e?.type === 'armorAura' && !!e.magicPct) || (e?.type === 'manaOverflow' && !!e.allies);
};

function cloneCombatant(c: Combatant): Combatant {
  return {
    ...c,
    stats: { ...c.stats },
    tags: [...c.tags],
    skills: [...c.skills],
    ...(c.lockedSkills ? { lockedSkills: [...c.lockedSkills] } : {}),
    cooldowns: { ...c.cooldowns },
    statuses: c.statuses.map((s) => ({ ...s })),
    ...(c.shieldHooks ? { shieldHooks: c.shieldHooks.map((h) => ({ ...h, onAbsorb: { ...h.onAbsorb } })) } : {}),
  };
}
