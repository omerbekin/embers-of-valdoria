// Endless dalga üretici (saf, seed'li; Math.random yok). Dalga -> motorun mevcut savaş girişi (hücre listeleri + yuva başına UnitSetup + seed).
import { CELL_COUNT, bosses, classes, encounterUnit, randomCells, randomPool, summons } from '../engine/content';
import { escortsOf, hasLeader, reinforcementGroup, waveOpening } from '../engine/wave-split';
import { Rng } from '../engine/rng';
import type { UnitModifiers, UnitSetup } from '../engine/types';
import { loadoutSetup } from '../progression/loadout';
import { applyWounds, woundCount } from '../progression/wounds';
import { LEVELS, withEnemyLevel } from '../progression/levels';
import { ITEMS } from '../progression/items';
import { ENDLESS, encounter, endlessCorpses, endlessWoundRules, type EndlessConfig, type EndlessRun, type WaveKind } from './data';
import { withRelics } from './relics';
import { heroSlots } from './formation';
import { carrySetup, heroRef, summonRef } from './carry';

/** FNV-1a + karıştırma: parçalardan seed (sefer seed.ts ile aynı yöntem; endless kendi kopyasını taşır, sefer modülüne bağlanmaz). */
export function hashSeed(...parts: Array<string | number>): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    const s = `${p}|`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) % 1_000_000_000;
}

export const rngFor = (seed: number, ...parts: Array<string | number>): Rng => new Rng(hashSeed(seed, ...parts));

/** Dalga türü: her bossEvery'de boss, her eliteEvery'de elit, diğerleri normal. */
export function waveKind(wave: number, cfg: EndlessConfig = ENDLESS): WaveKind {
  if (cfg.bossEvery > 0 && wave % cfg.bossEvery === 0) return 'boss';
  if (cfg.eliteEvery > 0 && wave % cfg.eliteEvery === 0) return 'elite';
  return 'normal';
}

/** Normal dalganın düşman sayısı. */
export function enemyCount(wave: number, cfg: EndlessConfig = ENDLESS): number {
  let n = cfg.enemyCount[0]?.count ?? 4;
  for (const r of cfg.enemyCount) if (wave >= r.fromWave) n = r.count;
  return Math.max(1, Math.min(CELL_COUNT, n));
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Endless dalgasının seviyesi (levels.md): 1 + (dalga - 1) x levelPerWave, tavan L50. Dalganın düşmanları bu level'dadır. */
export function waveLevel(wave: number, cfg: EndlessConfig = ENDLESS): number {
  const per = cfg.levels?.levelPerWave ?? 1;
  return Math.max(1, Math.min(LEVELS.maxLevel, 1 + Math.floor((Math.max(1, wave) - 1) * per)));
}

/** Dalganın düşman güçlenmesi (1. dalga: yok). */
export function waveMods(wave: number, cfg: EndlessConfig = ENDLESS): UnitModifiers | undefined {
  const k = Math.max(0, wave - 1);
  if (!k) return undefined;
  // Boss basamağı (Ömer 2026-10-13, form valor2: her boss bir öncekinden ~10 puan zor): b. boss'un can/güç ek çarpanı scaling.bossMult[b];
  // liste bitince son değerde kalır (dalga güçlenmesi sürer). Yalnızca dalga numarasına bağlı (oyuncu gücüne değil).
  const step = waveKind(wave, cfg) === 'boss' ? bossMult(Math.floor(wave / cfg.bossEvery) - 1, cfg) : 1;
  return { hpMult: r3((1 + cfg.scaling.hpPerWave * k) * step), statMult: r3(1 + cfg.scaling.statPerWave * k), powerMult: r3((1 + cfg.scaling.powerPerWave * k) * step) };
}

/** b. boss'un (0 = 10. dalga) ek can/güç çarpanı: scaling.bossMult listesi, liste bitince son değer (liste yoksa 1). */
export function bossMult(b: number, cfg: EndlessConfig = ENDLESS): number {
  const list = cfg.scaling.bossMult ?? [];
  if (b < 0 || !list.length) return 1;
  return list[Math.min(b, list.length - 1)]!;
}

/** İki güçlendirmenin birleşimi: çarpanlar çarpılır, kalan alanlar (spriteScale, actionsPerTurn, ekler) karşılaşmadan gelir. */
export function combineMods(base: UnitModifiers | undefined, extra: UnitModifiers | undefined): UnitModifiers | undefined {
  if (!extra) return base ? { ...base } : undefined;
  const out: UnitModifiers = { ...(base ?? {}) };
  for (const k of ['hpMult', 'statMult', 'powerMult'] as const) if (extra[k] !== undefined) out[k] = r3((out[k] ?? 1) * extra[k]!);
  return out;
}

/** Özel dalganın karşılaşması: elit koşu seed'ine göre seçilir, boss'lar sırayla döner (10: ilk boss, 20: ikinci ...). */
export function specialEncounter(seed: number, wave: number, cfg: EndlessConfig = ENDLESS): string | null {
  const kind = waveKind(wave, cfg);
  const pick = (list: string[], i: number) => {
    const ok = list.filter((id) => encounter(id));
    return ok.length ? ok[((i % ok.length) + ok.length) % ok.length]! : null;
  };
  if (kind === 'boss') return pick(cfg.bosses, wave / cfg.bossEvery - 1);
  if (kind === 'elite') return pick(cfg.elites, hashSeed(seed, wave, 'elite'));
  return null;
}

export interface WavePlan {
  wave: number;
  kind: WaveKind;
  /** Ekranda gösterilen ad ('Wave 7', 'The Bandit Chief'...). */
  name: string;
  seed: number;
  /** Hücre listeleri (dizin = yuva, '' = boş): BattleScene'in `teams` girişi. */
  party: string[];
  enemies: string[];
  /** Kahraman id'leri motor sırasıyla (party-0, party-1 ...); taşınan çağrının hücresi ''. */
  heroOrder: string[];
  units: { party: Record<number, UnitSetup>; enemies: Record<number, UnitSetup> };
  difficulty: EndlessConfig['difficulty'];
  /** Karşılaşmanın kendi arka planı (boss); yoksa ekran havuzdan seçer. */
  background?: string;
  /** Düşman önizlemesi (ön sıradan arkaya; özel ad > class adı). */
  enemyNames: string[];
  /** Savaş başı Valor'u (koşunun Valor'u; motora teams.valor.party). */
  valor: number;
  /** Düşmanların level'ı = dalga seviyesi (levels.md > Düşman level'ı; ad plakasında "Lv N"). */
  enemyLevel: number;
  /**
   * Dalgalı savaş (motor dalgası; docs/design/waves.md; Endless "dalgası" = bir savaş, bu ise o savaşın içindeki düşman dalgalarıdır): sonraki
   * dalgaların hücre listeleri + yuva başına kurulumları (motora teams.waves). Dalgalar açıkken (6. savaştan) yazılır; normal savaşta ek rastgele grup, elit / boss'ta takviyeler önce + önder son dalgada.
   */
  waves?: Array<{ enemies: string[]; units: Record<number, UnitSetup> }>;
}

const unitName = (cls: string, name?: string) => name ?? classes[cls]?.name ?? bosses[cls]?.name ?? cls;

/** Sıra almayan yardımcı nesne (Iron Mooring): takviye şablonuna girmez, önderle kendi dalgasında kalır. */
const isInert = (cls: string): boolean => !!(classes[cls] ?? encounterUnit(cls) ?? summons[cls])?.inert;

/** Savaşın seed'i: koşu seed'i + dalga (deneme yok: yenilgide koşu biter; geri çekilmek aynı savaşı verir). */
export const waveSeed = (seed: number, wave: number): number => hashSeed(seed, wave, 'battle');

/** Dalganın savaş planı (saf; aynı koşu durumu = aynı plan). */
export function wavePlan(run: EndlessRun, cfg: EndlessConfig = ENDLESS): WavePlan {
  const wave = run.wave;
  const kind = waveKind(wave, cfg);
  const seed = waveSeed(run.seed, wave);
  // Oyuncu: koşunun dizilimi (koşu başında seçilen, sonra her zaferde savaş sonundaki hücreler; eski kayıt = otomatik); motor hücreleri yuva sırasıyla okur
  const party = Array.from({ length: CELL_COUNT }, () => '');
  const partyUnits: Record<number, UnitSetup> = {};
  const live = run.heroes.filter((h) => classes[h.class]);
  const slots = heroSlots(live);
  const placed: Array<{ id: string; slot: number }> = [];
  // Sürekli akış (madde 300): taşınan çağrılar hücrelerine (kahraman hücresiyle çakışan / bilinmeyen çağrı düşer); motor uid'i = hücre sırası
  const heroCells = new Set(live.map((_, i) => slots[i]!));
  const summonCells = new Map<number, number>();
  (run.summons ?? []).forEach((x, k) => {
    if (summons[x.unit] && x.slot >= 0 && x.slot < CELL_COUNT && !heroCells.has(x.slot) && !summonCells.has(x.slot)) summonCells.set(x.slot, k);
  });
  const occupied = [...new Set([...heroCells, ...summonCells.keys()])].filter((c) => c >= 0).sort((a, b) => a - b);
  const uidAt = new Map(occupied.map((c, i) => [c, `party-${i}`]));
  const refUid = new Map<string, string>();
  live.forEach((h, i) => slots[i]! >= 0 && refUid.set(heroRef(h.id), uidAt.get(slots[i]!)!));
  for (const [cell, k] of summonCells) refUid.set(summonRef(k), uidAt.get(cell)!);
  const uidOf = (ref: string) => refUid.get(ref);
  // Dalga arası cooldown: 'carry' (varsayılan) kaldığı yerden, 'clear' sıfır, 'initial' her dalga savaş başı gibi; ilk dalga hep savaş başı
  const cdMode = cfg.carry.cooldowns ?? 'carry';
  const skipInitial = wave > 1 && cdMode !== 'initial';
  const keepCd = { cooldowns: cdMode === 'carry' };
  const corpses = endlessCorpses(cfg);
  live.forEach((h, i) => {
    const slot = slots[i]!;
    if (slot < 0) return;
    party[slot] = h.class;
    placed.push({ id: h.id, slot });
    // Güç katmanı (item; ileride level/ağaç) + can taşıma
    // Güç: item (loadout) + kalıntılar (koşu boyu; kalkan / ilk eylem / düşünce şifa kancaları + kritik / zırh ekleri)
    const setup: UnitSetup = withRelics({ ...loadoutSetup(h, { effects: ITEMS.effectRules.endless, mode: 'endless' }) }, run.relics, cfg); // Epic etkileri: madde 292 (c)
    // Hero's Feast (boss ödülü): kalan dalgalarda maks can çarpanı (item güçlendirmesiyle birleşir)
    if (run.blessing && run.blessing.waves > 0 && run.blessing.hpMult !== 1)
      setup.modifiers = { ...(setup.modifiers ?? {}), hpMult: r3((setup.modifiers?.hpMult ?? 1) * run.blessing.hpMult) };
    // Yara (Ömer 2026-10-19, hp-death-rework.md): her yara maks can -carry.wounds.maxHpLoss (kurulumda hpMult / hpAdd; motor aynı)
    if (woundCount(h) > 0) applyWounds(setup, woundCount(h), endlessWoundRules(cfg));
    if (h.hpRatio < 1) setup.startHpRatio = Math.max(0, h.hpRatio);
    // Taşınan durum (MP oranı, buff'lar, Rage, kalkan, cooldown'lar) + dalga arası cooldown kuralı
    Object.assign(setup, carrySetup(h.carry, uidAt.get(slot)!, uidOf, keepCd));
    if (cfg.carry.mp === 'full') delete setup.startMpRatio; // MP her dalgada dolu (Ömer 2026-10-19; eski kayıttaki oran yok sayılır)
    if (skipInitial) setup.skipInitialCooldown = true;
    // Önceki dalgada düşen kahraman bu savaşa CESET olarak girer (hücresinde; Resurrection / Revive kartı kaldırır)
    if (corpses && h.hpRatio <= 0) {
      setup.startDead = h.carry?.corpse ?? 'revivable';
      delete setup.startHpRatio;
    }
    if (Object.keys(setup).length) partyUnits[slot] = setup;
  });
  for (const [cell, k] of summonCells) {
    const x = run.summons![k]!;
    party[cell] = x.unit;
    const owner = x.owner ? uidOf(heroRef(x.owner)) : undefined;
    partyUnits[cell] = {
      ...carrySetup(x, uidAt.get(cell)!, uidOf, keepCd),
      startHp: x.hp,
      ...(owner ? { owner } : {}),
      ...(x.lifespan !== undefined ? { lifespan: x.lifespan } : {}),
      ...(x.empowered !== undefined ? { empowered: x.empowered } : {}),
    };
  }
  // Motor sırası (dizin = 'party-i'): kahraman id'si, çağrı hücresi ''
  const heroAt = new Map(placed.map((p) => [p.slot, p.id]));
  const heroOrder = occupied.map((c) => heroAt.get(c) ?? '');

  const enemyUnits: Record<number, UnitSetup> = {};
  const scale = waveMods(wave, cfg);
  // Düşman level'ı (Ömer 2026-10-17): dalga seviyesi; kahramanla aynı temel stat büyümesi (attrAdd; dalga çarpanlarının üstüne düz ek)
  const enemyLevel = waveLevel(wave, cfg);
  let enemies: string[];
  let name = `Wave ${wave}`;
  let background: string | undefined;
  let enemyNames: string[];
  let waves: NonNullable<WavePlan['waves']> = [];
  const encId = specialEncounter(run.seed, wave, cfg);
  const enc = encId ? encounter(encId) : undefined;
  // Savaş içi dalgalar (Ömer 2026-10-19; docs/design/waves.md > Açılış): data/waves.json > endless.fromBattle'dan itibaren, savaş türüne göre sayı
  const open = waveOpening.endless;
  const subWaves = open.enabled && wave >= open.fromBattle ? Math.max(1, Math.floor(open.count[kind] ?? 1)) : 1;
  type Unit = NonNullable<ReturnType<typeof encounter>>['units'][number];
  // Karşılaşma birimlerinden bir dalga (hücreler + kurulumlar; dalga güçlenmesi / level ilk dalgayla aynı kural)
  const encGroup = (list: readonly Unit[]): { cells: string[]; units: Record<number, UnitSetup>; names: string[] } => {
    const cells = Array.from({ length: CELL_COUNT }, () => '');
    const units: Record<number, UnitSetup> = {};
    for (const u of list) {
      cells[u.slot] = u.class;
      const mods = withEnemyLevel(combineMods(u.mods, scale), u.class, enemyLevel);
      const setup: UnitSetup = { ...(mods ? { modifiers: mods } : {}), ...(u.name ? { displayName: u.name } : {}), ...(u.tier ? { tier: u.tier } : {}) };
      if (Object.keys(setup).length) units[u.slot] = setup;
    }
    return { cells, units, names: [...list].sort((a, b) => a.slot - b.slot).map((u) => unitName(u.class, u.name)) };
  };
  // Rastgele havuzdan bir dalga: k = 0 bugünkü normal savaşın birebir aynısı (aynı seed parçaları); k >= 1 ayrı seed, önceki dalgaların class'ları tekrar etmez
  const used = new Set<string>();
  const randomGroup = (k: number): { cells: string[]; units: Record<number, UnitSetup>; names: string[] } => {
    // Normal dalga: rastgele havuzdan farklı class'lar (Geometer gibi test class'ları havuzda yok), seed'li rastgele dizilim
    const rng = k === 0 ? rngFor(run.seed, wave, 'enemies') : rngFor(run.seed, wave, 'enemies', k);
    const fresh = randomPool.filter((c) => !used.has(c));
    const pool = fresh.length >= enemyCount(wave, cfg) ? fresh : [...randomPool];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const ids = pool.slice(0, Math.min(pool.length, enemyCount(wave, cfg)));
    for (const c of ids) used.add(c);
    // menzil açıkken dizilim menzile duyarlı; alan tehdidi kahramanların şekillerinden (src/engine/formation-ai.ts)
    const cells = randomCells(ids, k === 0 ? hashSeed(run.seed, wave, 'cells') : hashSeed(run.seed, wave, 'cells', k), { foes: live.map((h) => h.class), board: 'enemy' });
    const units: Record<number, UnitSetup> = {};
    cells.forEach((c, slot) => {
      const mods = c ? withEnemyLevel(scale ? { ...scale } : undefined, c, enemyLevel) : undefined;
      if (mods) units[slot] = { modifiers: mods };
    });
    return { cells, units, names: cells.filter(Boolean).map((c) => unitName(c)) };
  };
  let groups: Array<{ cells: string[]; units: Record<number, UnitSetup>; names: string[] }>;
  if (enc) {
    name = enc.name;
    background = enc.background;
    const explicit = (enc.waves ?? []).filter((w) => w.units.length > 0).map((w) => w.units);
    if (explicit.length) {
      // Karşılaşmanın kendi `waves` alanı önceliklidir (tam liste = units + waves)
      groups = [enc.units, ...explicit].map(encGroup);
    } else {
      // Ekleme kuralı (Ömer 2026-10-19 düzeltmesi; seferle aynı, wave-split.ts > buildWaves): karşılaşma aynen kalır, subWaves - 1 takviye
      // EKLENİR = eşlikçilerin kopyası; eşlikçi yoksa (Bridge Warden) takviye rastgele grup. Önderli savaşta takviyeler önce, önder son dalgada.
      const tmpl = reinforcementGroup(escortsOf(enc.units, isInert));
      const extra = Array.from({ length: subWaves - 1 }, (_, k) => (tmpl.length ? encGroup(tmpl) : randomGroup(k + 1)));
      groups = hasLeader(enc.units) ? [...extra, encGroup(enc.units)] : [encGroup(enc.units), ...extra];
    }
  } else {
    groups = Array.from({ length: subWaves }, (_, k) => randomGroup(k));
  }
  const [first, ...rest] = groups;
  enemies = first!.cells;
  Object.assign(enemyUnits, first!.units);
  // Önizleme: savaşın tüm dalgalarının düşmanları sırayla
  enemyNames = groups.flatMap((g) => g.names);
  waves = rest.map((g) => ({ enemies: g.cells, units: g.units }));
  return {
    wave,
    kind,
    name,
    seed,
    party,
    enemies,
    heroOrder,
    units: { party: partyUnits, enemies: enemyUnits },
    difficulty: cfg.difficulty,
    ...(background ? { background } : {}),
    enemyNames,
    valor: run.valor ?? 0,
    enemyLevel,
    ...(waves.length ? { waves } : {}),
  };
}
