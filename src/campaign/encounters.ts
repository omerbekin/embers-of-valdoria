import { applyWounds, valorRevivedCounts, woundCount } from '../progression/wounds';
import { battleSummary, type Battle } from '../engine';
import { battleRulesData, CELL_COUNT, classes, encounterUnit, randomPool, resolveBattleRules, summons, type RulesSpec } from '../engine/content';
import { encounterWaves, encounterWavesById, isInertUnit, objectiveType } from './encounter-waves';
import { CONFIG, ENCOUNTERS, getMap } from './data';
import { node } from './graph';
import { battleSeed } from './seed';
import { mobLook } from './mob-looks';
import { chapterEnemyMods, nodeLevel } from './power';
import { withEnemyLevel } from '../progression/levels';
import { loadoutSetup } from '../progression/loadout';
import { activeHeroes, heroById, replayCount } from './state';
import type { UnitSetup } from '../engine/types';
import type { BattleOutcome, CampaignState, Difficulty, DifficultyEnemyMods, EncounterDef, EncounterUnit, UnitMods } from './types';

/**
 * Karşılaşmalar ve savaş motoruna köprü (saf). Savaş kurallarına dokunmaz: mevcut giriş noktasının istediği hücre listelerini
 * (dizin = yuva, '' = boş), yuva başına birim kurulumlarını (motorun `teams.units`: güçlendirme, özel ad, rütbe, başlangıç canı) ve seed'i üretir;
 * sonucu `battleSummary(battle).units` (ya da birimlerin son canı) üzerinden okur. Motor arayüzü: docs/design/combat.md > Savaş kurulum seçenekleri.
 */
export const ENGINE_CAPS = {
  /** Motor birim bazında güçlendirme/zayıflatma + özel ad + rütbe destekliyor (engine-dev, madde 251). Kapalıysa yedek takımlar oynanır. */
  unitMods: true,
  /** Motor eksik canla başlamayı destekliyor (startHpRatio). Kapalıysa her savaş tam canla başlar. */
  startHp: true,
};

export type EngineCaps = typeof ENGINE_CAPS;

/** Oynanacak karşılaşma: motor güçlendirmeyi desteklemiyorsa ve yedeği varsa yedek. */
export function resolveEncounter(id: string, caps = ENGINE_CAPS): { id: string; def: EncounterDef; fallback: boolean } {
  const def = ENCOUNTERS[id];
  if (!def) throw new Error(`Encounter not found: ${id}`);
  if (!caps.unitMods && def.fallback && ENCOUNTERS[def.fallback]) return { id: def.fallback, def: ENCOUNTERS[def.fallback]!, fallback: true };
  return { id, def, fallback: false };
}

/** Karşılaşmanın düşman hücre listesi (sınıf id'leri). */
export function enemyCells(def: Pick<EncounterDef, 'units'>): string[] {
  const cells = Array.from({ length: CELL_COUNT }, () => '');
  for (const u of def.units) cells[u.slot] = u.class;
  return cells;
}

/** Aktif takımın hücre listesi (sınıf id'leri). */
export function partyCells(s: CampaignState): string[] {
  return s.active.map((id) => (id ? (heroById(s, id)?.class ?? '') : ''));
}

/** Oyuncu birimlerinin motor sırası: motor hücre listesini yuva sırasıyla okur, i. birim 'party-i' olur. */
export const partyHeroOrder = (s: CampaignState): string[] => s.active.filter((id) => id && heroById(s, id));

export interface BattlePlan {
  nodeId: string;
  seed: number;
  encounterId: string;
  encounterName: string;
  usedFallback: boolean;
  party: string[];
  enemies: string[];
  /** Hero id'leri motor sırasıyla (party-0, party-1 ...). */
  heroOrder: string[];
  /** Motorun yuva başına birim kurulumları (teams.units; anahtar = yuva). */
  units: { party: Record<number, UnitSetup>; enemies: Record<number, UnitSetup> };
  /**
   * Dalgalı savaş (EncounterDef.waves; docs/design/waves.md): sonraki dalgaların hücre listeleri + yuva başına kurulumları; motora teams.waves olarak
   * gider. Dalgasız karşılaşmada alan yazılmaz.
   */
  waves?: Array<{ enemies: string[]; units: Record<number, UnitSetup> }>;
  /**
   * Karşılaşma kuralları (EncounterDef.condition / objective / blocked; data/battle-rules.json): motora teams.rules olarak gider. Totem'de `reinforce` =
   * takviye grubunun hücre listesi + kurulumları (dalga biçimi). Kuralsız karşılaşmada alan yazılmaz.
   */
  rules?: RulesSpec & { reinforce?: { enemies: string[]; units: Record<number, UnitSetup> } };
  /** Genel zorluğun yapay zeka değeri (campaign.json > difficulties[x].ai): savaş kurulumuna iletilir. */
  difficulty: Difficulty;
  /** Region battle background id (content-designer: border-road, valley-field, ashen-heights; yoksa varsayılan arka plan). */
  background?: string;
  /** Savaş başı Valor'u (açıksa; motora teams.valor.party olarak gider). */
  valor?: number;
  /** Düşmanların level'ı = düğüm seviyesi (levels.md > Düşman level'ı; ad plakasında "Lv N"). */
  enemyLevel: number;
  /** Düşman yapay zekasının terazi ayarı (bölgenin enemyAi'si, notlar hariç; chooseAction opts.value). Yoksa alan yazılmaz. */
  enemyAi?: Record<string, number>;
}

/**
 * Karşılaşma birimi güçlendirmesi + genel zorluğun düşman güçlendirmesi (campaign.json > difficulties[x].enemy):
 * çarpanlar (hpMult, statMult, powerMult) çarpılır, düz ekler (armorAdd, magicArmorAdd) toplanır. İkisi de yoksa undefined.
 */
export function withDifficulty(mods: UnitMods | undefined, diff: DifficultyEnemyMods | undefined): UnitMods | undefined {
  if (!diff || !Object.keys(diff).length) return mods ? { ...mods } : undefined;
  const out: UnitMods = { ...(mods ?? {}) };
  for (const k of ['hpMult', 'statMult', 'powerMult'] as const)
    if (diff[k] !== undefined && diff[k] !== 1) out[k] = Math.round((out[k] ?? 1) * diff[k]! * 1000) / 1000;
  for (const k of ['armorAdd', 'magicArmorAdd'] as const) if (diff[k]) out[k] = (out[k] ?? 0) + diff[k]!;
  return Object.keys(out).length ? out : undefined;
}

// Dalga listesi (Ömer 2026-10-19 düzeltmesi: dalgalar EKLENİR, bölünmez): src/campaign/encounter-waves.ts
export { encounterWaves, isInertUnit };

/** Bölgenin düşman YZ ayarı (sayısal anahtarlar; `_` notları atılır): planın enemyAi alanı ya da boş. */
function regionEnemyAi(region: { enemyAi?: Record<string, number | string> } | undefined): { enemyAi?: Record<string, number> } {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(region?.enemyAi ?? {})) if (!k.startsWith('_') && typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  return Object.keys(out).length ? { enemyAi: out } : {};
}

/**
 * Karşılaşmanın kural girdisi (BattlePlan.rules). Totem takviye grubu: hedefin `units`'i, yoksa ilk dalganın rütbesiz, nesne olmayan, hedef olmayan
 * birimleri (VARSAYIM, open-questions 418); kurulumlar ilk dalgayla aynı kuraldan (`setups`). Kural yoksa undefined.
 */
function encounterRules(
  def: EncounterDef,
  first: EncounterUnit[],
  setups: (list: EncounterUnit[], out: Record<number, UnitSetup>) => void,
): BattlePlan['rules'] | undefined {
  if (!def.condition && !def.objective && def.blocked === undefined) return undefined;
  const o = def.objective;
  const objective: RulesSpec['objective'] | undefined =
    o === undefined ? undefined : typeof o === 'string' ? o : o.type === 'totem' ? { type: 'totem', every: o.every, maxEnemies: o.maxEnemies } : { ...o };
  const out: NonNullable<BattlePlan['rules']> = {
    ...(def.condition ? { condition: def.condition } : {}),
    ...(objective ? { objective } : {}),
    ...(def.blocked !== undefined ? { blocked: Array.isArray(def.blocked) ? [...def.blocked] : def.blocked } : {}),
  };
  if (objectiveType(o) === 'totem') {
    const own = typeof o === 'object' && o.type === 'totem' ? o.units : undefined;
    const group = own?.length ? own : first.filter((u) => !u.tier && !u.objective && !isInertUnit(u.class));
    if (group.length) {
      const units: Record<number, UnitSetup> = {};
      setups(group, units);
      out.reinforce = { enemies: enemyCells({ units: group }), units };
    }
  }
  return out;
}

export function battlePlan(s: CampaignState, attempt = 0, caps = ENGINE_CAPS): BattlePlan {
  const map = getMap(s.mapId);
  const n = node(map, s.at);
  // Seçenekli olayın savaşı (N2) düğümün kendi karşılaşmasının yerine geçer
  const encId = s.eventChoice?.node === n.id && s.eventChoice.battle ? s.eventChoice.battle : n.encounter;
  if (!encId) throw new Error(`No battle at ${n.id}`);
  const enc = resolveEncounter(encId, caps);
  const party: Record<number, UnitSetup> = {};
  const enemies: Record<number, UnitSetup> = {};
  s.active.forEach((id, cell) => {
    const h = id ? heroById(s, id) : undefined;
    if (!h) return;
    // Güç toplama katmanı (temel + item; ileride level/ağaç): hiçbir şey takılı değilse boş => birim bugünküyle aynı
    const setup: UnitSetup = caps.unitMods ? loadoutSetup(h, { mode: 'campaign' }) : {};
    // Yara (Ömer 2026-10-19, hp-death-rework.md): her yara maks canı rules.wounds.maxHpLoss düşürür (kurulumda hpMult / hpAdd; motor aynı)
    if (caps.unitMods && woundCount(h) > 0) applyWounds(setup, woundCount(h), CONFIG.rules.wounds);
    // Can taşıma: eksik canlı karakter o oranla başlar (motor en az 1 can verir)
    // Düşmüş kahraman (Ömer 2026-10-11, Endless gibi): savaşa CESET olarak girer (yuvasında; savaşta Resurrection ile kalkabilir)
    if (!h.alive || h.hpRatio <= 0) setup.startDead = 'revivable';
    else if (CONFIG.rules.carryHp && caps.startHp && h.hpRatio < 1) setup.startHpRatio = h.hpRatio;
    if (enc.def.partyUndying && caps.unitMods) setup.undying = true; // açılış savaşı kaybedilemez (tutorial)
    if (Object.keys(setup).length) party[cell] = setup;
  });
  // Bölüm ölçeği (data/campaign/power-budget.json): açık ilerleme sistemi yokken 1 => düşmanlar bugünküyle aynı
  const chapterMods = chapterEnemyMods(s.mapId, n.id);
  // Düşman level'ı (Ömer 2026-10-17): düğüm seviyesi; kahramanla aynı temel stat büyümesi (attrAdd), çarpanların üstüne düz ek
  const enemyLevel = nodeLevel(s.mapId, n.id);
  // Bir dalganın düşman kurulumları (ilk dalga ve dalgalı savaşın sonraki dalgaları aynı kuralla)
  // Devriye: seed oynama sayısını içerir (roadmap 2.2: hash(seed, harita, düğüm, oynama sayısı, deneme)); ilk oynayış eskisiyle aynı
  const seed = battleSeed(s.seed, s.mapId, n.id, attempt, s.patrol === n.id ? replayCount(s, n.id) + 1 : 0);
  const enemySetups = (list: EncounterUnit[], enemies: Record<number, UnitSetup>, wave = 0): void => {
    // B3 Break the Totem: kırılacak nesne işareti güç katmanından bağımsız (kural mekaniği)
    if (objectiveType(enc.def.objective) === 'totem') for (const u of list) if (u.objective) enemies[u.slot] = { ...enemies[u.slot], objective: true };
    if (!caps.unitMods) return;
    for (const u of list) {
      const diff = CONFIG.difficulties[s.difficulty];
      // noTierMods: rütbe eki (enemyTier) bu birime uygulanmaz (The Bridge Warden: fazları/telgrafları zaten zor; sim ölçümü, open-questions)
      const es = CONFIG.enemyScale && !CONFIG.enemyScale.skipNodes?.includes(n.id) ? CONFIG.enemyScale : undefined;
      // seferin genel düşman ölçeği (eğitim bölgesi hariç): boss rütbeli -> boss; elit düğümün diğer birimleri -> elite; kalan -> all
      const scale = u.tier === 'boss' ? (es?.boss ?? es?.all) : n.type === 'elite' ? (es?.elite ?? es?.all) : es?.all;
      const rk = s.mapId === (es?.regionsMap ?? CONFIG.maps[0]) ? es?.regions?.[n.region ?? ''] : undefined; // bölge id'leri haritalar arasında tekrar eder
      const regional = rk && rk !== 1 ? withDifficulty(scale, { hpMult: rk, powerMult: rk }) : scale; // bölge çarpanı (Ömer 2026-10-24)
      const own = withDifficulty(withDifficulty(u.mods, regional), u.tier ? n.enemyTierMods?.[u.tier] : undefined); // + düğüme özel rütbe ayarı (seferde)
      // eliteEscort (open-questions 365 seçenek 3): elit düğümde rütbesiz eşlikçilere zorluk eki (rütbeliler enemyTier'dan alır)
      const rank = u.tier ? (u.noTierMods ? undefined : diff?.enemyTier?.[u.tier]) : n.type === 'elite' ? diff?.eliteEscort : undefined;
      const mods = withEnemyLevel(withDifficulty(withDifficulty(withDifficulty(own, chapterMods), diff?.enemy), rank), u.class, enemyLevel);
      // Görünüş (yalnızca sunum): özel çizim (`sprite`; Harita 2 elit / boss, Hex Totem) ya da seed'li mob varyasyonu (src/campaign/mob-looks.ts)
      const look = u.sprite ?? mobLook(u, seed, wave);
      const setup: UnitSetup = {
        ...(mods ? { modifiers: mods } : {}),
        ...(u.name ? { displayName: u.name } : {}),
        ...(look ? { spriteId: look } : {}),
        ...(u.tier ? { tier: u.tier } : {}),
        ...(u.lockSkills?.length ? { lockSkills: [...u.lockSkills] } : {}),
        ...(u.initialCooldownBonus ? { initialCooldownBonus: u.initialCooldownBonus } : {}),
      };
      if (u.objective && objectiveType(enc.def.objective) === 'totem') setup.objective = true;
      if (Object.keys(setup).length) enemies[u.slot] = setup;
    }
  };
  // Dalgalar (Ömer 2026-10-19): Watchtower'dan itibaren; ilk dalga motorun `enemies`i, kalanlar teams.waves
  const [first, ...rest] = encounterWaves(enc.def, n.id, n.type, n.region);
  enemySetups(first!, enemies);
  const waves = rest.map((list, k) => {
    const units: Record<number, UnitSetup> = {};
    enemySetups(list, units, k + 1);
    return { enemies: enemyCells({ units: list }), units };
  });
  const rules = encounterRules(enc.def, first!, enemySetups);
  return {
    nodeId: n.id,
    seed,
    encounterId: enc.id,
    encounterName: enc.def.name,
    usedFallback: enc.fallback,
    party: partyCells(s),
    enemies: enemyCells({ units: first! }),
    heroOrder: partyHeroOrder(s),
    units: { party, enemies },
    ...(waves.length ? { waves } : {}),
    ...(rules ? { rules } : {}),
    difficulty: CONFIG.difficulties[s.difficulty]?.ai ?? CONFIG.defaultDifficulty,
    // Arka plan önceliği: karşılaşma > düğüm > bölge (dosya yoksa sahne varsayılan arka plana düşer)
    background: enc.def.background ?? n.battleBackground ?? map.regions.find((r) => r.id === n.region)?.battleBackground,
    ...(s.valor !== undefined ? { valor: s.valor } : {}),
    enemyLevel,
    ...regionEnemyAi(map.regions.find((r) => r.id === n.region)),
  };
}

/** Motorun birim görünümü (yalnızca okunur alanlar). */
export interface CombatantLike {
  uid: string;
  side: string;
  summoned: boolean;
  hp: number;
  maxHp: number;
}

/** Savaş sonu özeti: 'party-i' birimi heroOrder[i] karakteridir. Çağrılar sayılmaz. */
export function outcomeFrom(plan: Pick<BattlePlan, 'heroOrder'>, victory: boolean, summary: CombatantLike[] | { units: CombatantLike[]; valor?: { left: number; flawless: boolean } }): BattleOutcome {
  const combatants = Array.isArray(summary) ? summary : summary.units;
  const valor = Array.isArray(summary) ? undefined : summary.valor;
  const units = combatants
    .filter((c) => c.side === 'party' && !c.summoned && /^party-\d+$/.test(c.uid))
    .map((c) => {
      const i = Number(c.uid.slice('party-'.length));
      return { heroId: plan.heroOrder[i] ?? '', hpRatio: Math.max(0, Math.min(1, c.hp / Math.max(1, c.maxHp))), alive: c.hp > 0 };
    })
    .filter((u) => u.heroId);
  return { victory, units, ...(valor ? { valorLeft: valor.left, flawless: valor.flawless } : {}) };
}

/**
 * Bitmiş (ya da geri çekilinen) savaştan sefer sonucu: outcomeFrom + savaş içi Valor diriltmeleri (Battle.log; Ömer 2026-10-20: Valor 1 yara
 * siler). Sahne, sim ve geri çekilme bu kapıyı kullanır. `victory` verilmezse savaşın kazananı.
 */
export function battleOutcomeOf(plan: Pick<BattlePlan, 'heroOrder'>, battle: Battle, victory: boolean = battle.winner === 'party'): BattleOutcome {
  const out = outcomeFrom(plan, victory, battleSummary(battle));
  const rv = valorRevivedCounts(battle.log as ReadonlyArray<{ type: string; target?: string; cause?: string }>, plan.heroOrder);
  return Object.keys(rv).length ? { ...out, valorRevived: rv } : out;
}

/** Karşılaşma verisinin doğrulaması: sınıflar rastgele havuzda (test class'ı yok), yuvalar 0..11 ve tekrarsız, yedek geçerli, kilitli skill'ler sınıfın skill'i. */
export function validateEncounters(): string[] {
  const errors: string[] = [];
  for (const [id, def] of Object.entries(ENCOUNTERS)) {
    if (!def.name) errors.push(`${id}: no name`);
    if (!def.units.length) errors.push(`${id}: no units`);
    // dalgalı karşılaşma: her dalga ayrı denetlenir (yuvalar dalga içinde tekrarsız)
    (def.waves ?? []).forEach((w, k) => {
      if (!w.units?.length) errors.push(`${id}: wave ${k + 2} has no units`);
    });
    for (const wave of [def.units, ...(def.waves ?? []).map((w) => w.units ?? [])]) {
      const slots = wave.map((u) => u.slot);
      if (new Set(slots).size !== slots.length) errors.push(`${id}: duplicate slots`);
      for (const u of wave) {
        // Boss (data/bosses) ve mob (data/mobs) tanımları istisna: oynanabilir class değiller ama karşılaşmada kullanılır. Çağrılar (data/summons; Grave Field'ın
        // Risen Skeleton'ları, mob-plan.md 3) hazır çağrı olarak konur (content.battleSetup summoned: true verir).
        if (!randomPool.includes(u.class) && !encounterUnit(u.class) && !summons[u.class]) errors.push(`${id}: class ${u.class} is not a playable class`);
        if (!Number.isInteger(u.slot) || u.slot < 0 || u.slot >= CELL_COUNT) errors.push(`${id}: slot ${u.slot} out of range`);
        for (const sk of u.lockSkills ?? []) if (!(classes[u.class] ?? encounterUnit(u.class) ?? summons[u.class])?.skills.includes(sk)) errors.push(`${id}: ${u.class} has no skill ${sk} to lock`);
        if (u.initialCooldownBonus !== undefined && (!Number.isInteger(u.initialCooldownBonus) || u.initialCooldownBonus < 0)) errors.push(`${id}: bad initialCooldownBonus`);
      }
    }
    if (def.fallback && (!ENCOUNTERS[def.fallback] || ENCOUNTERS[def.fallback]!.fallback)) errors.push(`${id}: bad fallback ${def.fallback}`);
    // Karşılaşma kuralları (data/battle-rules.json): koşul / hedef / düzen id'leri, kapalı hücrede birim yok, totem'de hedef nesne var
    if (def.condition || def.objective || def.blocked !== undefined) {
      try {
        const r = resolveBattleRules(encounterRules(def, def.units, () => {}));
        const blocked = r?.blocked ?? [];
        for (const wave of [def.units, ...(def.waves ?? []).map((w) => w.units ?? [])])
          for (const u of wave) if (blocked.includes(u.slot)) errors.push(`${id}: ${u.class} stands on blocked slot ${u.slot}`);
        for (const s of blocked) if (!Number.isInteger(s) || s < 0 || s >= CELL_COUNT) errors.push(`${id}: blocked slot ${s} out of range`);
        if (r?.objective?.type === 'totem' && !def.units.some((u) => u.objective)) errors.push(`${id}: totem objective without an objective unit`);
        if (r?.objective?.type === 'hold' && (r.objective.row < 0 || r.objective.row * 3 >= CELL_COUNT)) errors.push(`${id}: bad hold row`);
        if (typeof def.blocked === 'string' && !battleRulesData.layouts[def.blocked]) errors.push(`${id}: unknown layout ${def.blocked}`);
      } catch (e) {
        errors.push(`${id}: ${(e as Error).message}`);
      }
    }
    for (const u of def.units) if (u.objective && objectiveType(def.objective) !== 'totem') errors.push(`${id}: objective unit without a totem objective`);
  }
  return errors;
}

/**
 * Karşılaşmanın TÜM dalgalarının birimleri, dalga sırasıyla (önizleme ve "Start battle?" kartı eklenen takviye dalgaları dahil tüm düşmanları
 * gösterir; düğüm bağlamı haritadan: encounter-waves.ts > encounterWavesById). Dalga içinde ön sıradan arkaya.
 */
const allWaveUnits = (id: string, def: Pick<EncounterDef, 'units' | 'waves' | 'objective'>): EncounterUnit[] =>
  encounterWavesById(id, def).flatMap((w) => [...w].sort((a, b) => a.slot - b.slot));

/** Birimin oyuncuya görünen adı: karşılaşmadaki özel ad > class adı > boss/mob adı > id. */
function unitDisplayName(u: { class: string; name?: string }): string {
  return u.name ?? classes[u.class]?.name ?? encounterUnit(u.class)?.name ?? summons[u.class]?.name ?? u.class;
}

/**
 * Bir düğümün düşman önizlemesi (ön sıradan arkaya). `names`: görünen adlar, aynı ad tekrarı birleşik ("2× Iron Mooring");
 * `classes`: sınıf id'leri (ikon/logo için).
 */
export function enemyPreview(encounterId: string, caps = ENGINE_CAPS): { name: string; classes: string[]; names: string[]; leader?: string } {
  const enc = resolveEncounter(encounterId, caps);
  const units = allWaveUnits(enc.id, enc.def);
  const counts = new Map<string, number>();
  for (const u of units) counts.set(unitDisplayName(u), (counts.get(unitDisplayName(u)) ?? 0) + 1);
  const names = [...counts].map(([n, k]) => (k > 1 ? `${k}× ${n}` : n));
  return { name: enc.def.name, classes: units.map((u) => u.class), names, leader: units.find((u) => u.tier)?.name };
}

export const partySize = (s: CampaignState): number => activeHeroes(s).length;

export interface FoeGroup {
  /** Sınıf / mob id'si (ikon). */
  cls: string;
  /** Portre dosyası kimliği (spriteId; yoksa cls). */
  sprite: string;
  name: string;
  /** Aynı birimden kaç tane ("3×"). */
  n: number;
  tier?: 'elite' | 'boss';
}

/**
 * "Start battle?" kartı için düşman grupları (ön sıradan arkaya, aynı ad birleşik) + tek satırlık bilgi. Bilgi YENİ metin değildir, var olan
 * oyun metnidir: önderin (rütbeli birim, yoksa ilk pasifli birim) pasif açıklaması; yoksa boss'un ilk savaş çığlığı (data/bosses > firstBanner).
 */
export type CardInfo = { who?: string; text: string; quote?: boolean };

/** "Start battle?" kartının bilgi satırı: düğümün `lore` cümlesi varsa o (başlıksız), yoksa foeGroups'un önder pasifi / boss çığlığı. */
export function startCardInfo(lore: string | undefined, fallback?: CardInfo): CardInfo | undefined {
  const t = lore?.trim();
  return t ? { text: t } : fallback;
}

export function foeGroups(encounterId: string, caps = ENGINE_CAPS): { groups: FoeGroup[]; info?: { who: string; text: string; quote?: boolean } } {
  const enc = resolveEncounter(encounterId, caps);
  const units = allWaveUnits(enc.id, enc.def);
  const groups: FoeGroup[] = [];
  for (const u of units) {
    const name = unitDisplayName(u);
    const g = groups.find((x) => x.name === name);
    if (g) {
      g.n++;
      continue;
    }
    const def = (classes[u.class] ?? encounterUnit(u.class) ?? summons[u.class]) as { spriteId?: string } | undefined;
    groups.push({ cls: u.class, sprite: u.sprite ?? def?.spriteId ?? u.class, name, n: 1, ...(u.tier ? { tier: u.tier } : {}) });
  }
  type Rich = { passive?: { text?: string }; boss?: { firstBanner?: string } };
  const rich = (cls: string): Rich => (encounterUnit(cls) ?? {}) as Rich;
  const lead = units.find((u) => u.tier) ?? units.find((u) => rich(u.class).passive?.text) ?? units[0];
  if (!lead) return { groups };
  const who = unitDisplayName(lead);
  const lr = rich(lead.class);
  if (lr.passive?.text) return { groups, info: { who, text: lr.passive.text } };
  const quote = units.map((u) => rich(u.class).boss?.firstBanner).find(Boolean);
  if (quote) return { groups, info: { who, text: quote, quote: true } };
  return { groups };
}
