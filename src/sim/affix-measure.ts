// Affix ölçüm aracı (Ömer 2026-11-01, docs/design/progression/item-design-plan.md adım 1 ve B1): her affix'in gerçek güç değeri.
// YALNIZCA ölçer: data/items.json'a ve oyun kurallarına dokunmaz. Affix listesi veriden okunur (items.json > affixDefs).
//
// Kullanım: npm run sim:affix -- --out=<dosya.json> [--seeds=96] [--first=1] [--affixes=a_gdmg,c_hp] [--types=front,back,support,alt]
//   [--heroes=front:warrior,back:mage,support:paladin,mate:archer] [--ilvl=10,30] [--env=campaign,endless] [--kit=uncommon] [--kit-ratio=0.35] [--level-ratio=0.8]
//   [--battles=8] [--waves=10] [--jobs=N] [--top=10] [--list]
//
// Yöntem: her ortam + item seviyesi + takım için önce affix'siz TEMEL koşulur, sonra ölçülen kahramana yalnız o affix ortalama zarla (q = 0,5)
// eklenir; aynı seed'ler, seed başına fark alınır (eşli fark), güven aralığı bu farkların %95 normal yaklaşımı.
// Ölçü: GÜÇ PUANI (0-100) = savaş başına takımın savaş sonu ortalama canı; kaybedilen ya da oynanmayan savaş 0. Hem kazanmayı hem kalan canı taşır.
//
// Ortamlar seferin / Endless'ın tamamı DEĞİL, item seviyesine denk gelen DİLİMİDİR (tam koşuda item seviyesi akar, affix etkisi gürültüde kaybolur):
// - sefer: ilvl'in bölümünün haritası (power-budget.json > chapters), rotanın o ilvl'e kadarki son `battles` savaşı; bir deneme, kaybedilen savaş zorla geçilir.
// - Endless: ilvl'e denk dalganın çevresinde `waves` dalga (boss dahil); kayıpta koşu biter.
// İkisinde de sim'in kendi döngüsü (simulateCampaign / simulateEndless) çalışır: can taşıma, kamp, ödül kartı, Recovery, yara, altın, XP oyundaki gibi.
// Item alınmaz (gear: 'none'), kalıntı seçilmez: dilim boyunca aynı temel takım kalır; ölçülen affix boş tılsım yuvasında tek statlı item'le gelir. Savaş dışı affix'ler: Recovery ve Scarred hide güç puanına yansır;
// prog:gold / prog:xp hedefli affix olursa altın / XP farkı olarak yazılır (ekonomi satırı, IP sıralamasına girmez); Gold find ve Experience 2026-11-01'de kalktı, bugün böyle affix yok.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Rng } from '../engine';
import { classes, randomPool } from '../engine/content';
import {
  CONFIG,
  POWER_BUDGET,
  autoFormation,
  debugSetValor,
  getMap,
  isBattleNode,
  mapEnabled,
  newCampaign,
  node,
  nodeDepth,
  nodeIlvl,
  nodeSteps,
  withReachOpen,
  type CampChoice,
  type CampaignMap,
  type CampaignState,
  type Hero,
} from '../campaign';
import { valorRules } from '../engine/content';
import { ENDLESS, type EndlessHero, type EndlessRun } from '../endless';
import {
  ITEMS,
  SLOT_IDS,
  affixDef,
  affixFit,
  affixIP,
  affixValues,
  blocksOffhand,
  canEquip,
  gripOf,
  itemDef,
  levelAt,
  rollItem,
  setLevel,
  starterEquipment,
  totalXpFor,
  type AffixDef,
  type Equipment,
  type ItemDef,
  type ItemInstance,
  type RarityId,
  type SlotId,
} from '../progression';
import { allRoutes, simCampChoice, simulateCampaign } from './campaign';
import { simulateEndless } from './endless';

export type HeroType = 'front' | 'back' | 'support' | 'alt';
export type SimEnv = 'campaign' | 'endless';

/**
 * Kahraman tipleri (gerekçe): ön saf Warrior: en önde (frontPriority 1, menzil 1), hem vurur hem vurulur, savunma ve saldırı affix'leri aynı kahramanda görünür
 * (Defender'ın hasarı düşük, saldırı affix'lerini olduğundan zayıf gösterirdi). Arka hasar Mage: en arkada (frontPriority 7, menzil 6), iki büyü elementi + MP,
 * element ve mana affix'lerini sınar (Archer yalnız fiziksel). Destek Paladin: şifa + diriltme, başlangıç kalkanı var, blok ve destek affix'lerini sınar
 * (Druid'in çağrısı ölçümü karıştırırdı). Dördüncü sabit yoldaş Archer: takım iki ön, iki arka olsun; ölçülmez. `alt`: üç tipe de yaramayan affix
 * (ör. Dark damage, Shield power) havuzda ona yarayan ilk sınıfta ölçülür; o sınıf yoldaşın yerine geçer.
 */
export const DEFAULT_HEROES: Record<Exclude<HeroType, 'alt'> | 'mate', string> = { front: 'warrior', back: 'mage', support: 'paladin', mate: 'archer' };
const MAIN_TYPES = ['front', 'back', 'support'] as const;

/**
 * Gerçek oyuncunun geride kalması (sim:campaign vekili, 4 koşu, 2026-11-01): Harita 1 sonunda düğüm ilvl 10 iken takılı item'ler ortalama seviye ~4, nadirlik ~0,85
 * (Common 0, Uncommon 1), level ~7,6 / 10; Harita 2 sonunda ilvl 20 iken seviye ~6, nadirlik ~1,35, level ~17 / 20. Takım tepe seviyede kurulursa her savaş kazanılır,
 * affix farkı görünmez. Harita 3 ve Endless için ölçülmedi, aynı oran varsayıldı.
 */
export const SIM_LAG = { kit: 0.35, level: 0.8 };
const lagged = (v: number, ratio: number) => Math.max(1, Math.round(v * ratio));

export interface MeasureOptions {
  seeds: number;
  firstSeed: number;
  affixes: string[];
  types: HeroType[];
  heroes: typeof DEFAULT_HEROES;
  ilvls: number[];
  envs: SimEnv[];
  kit: RarityId;
  /** Temel takımın item seviyesi = ilvl x oran; kahraman level'ı = dilimin level'ı x oran (gerçek oyuncu geride gelir; SIM_LAG). */
  kitRatio: number;
  levelRatio: number;
  /** Sefer diliminin savaş sayısı / Endless diliminin dalga sayısı. */
  battles: number;
  waves: number;
}

export const defaultOptions = (): MeasureOptions => ({
  seeds: 96,
  firstSeed: 1,
  affixes: Object.keys(ITEMS.affixDefs),
  types: ['front', 'back', 'support', 'alt'],
  heroes: { ...DEFAULT_HEROES },
  ilvls: [10, 30],
  envs: ['campaign', 'endless'],
  kit: 'uncommon',
  kitRatio: SIM_LAG.kit,
  levelRatio: SIM_LAG.level,
  battles: 8,
  waves: 10,
});

// ------------------------------------------------------------ uygunluk

/** Sınıf affix'in yuvalarından birine item takabilir mi (ör. Block yalnız kalkan yuvasında: ikinci el takamayan sınıfa yaramaz). */
export const canCarryAffix = (classId: string, def: Pick<AffixDef, 'slots'>): boolean =>
  !def.slots || def.slots.some((slot) => ITEMS.items.some((d) => d.slot === slot && canEquip(classId, d)));

/** Affix bu sınıfa yarar mı: veri ipucu `needs` tam uyum + taşıyabileceği yuva. */
export const affixUsable = (classId: string, id: string): boolean => {
  const def = affixDef(id);
  return !!def && affixFit(classId, { id, def }) >= 1 && canCarryAffix(classId, def);
};

/** Üç tipe de yaramayan affix için havuzdaki ilk uygun sınıf; yoksa undefined. */
export const altClassFor = (id: string): string | undefined => randomPool.find((c) => affixUsable(c, id));

/** Ekonomi affix'i: savaş gücü değil altın / XP verir (fark ayrıca yazılır, IP sıralamasına girmez). */
export const economyKind = (id: string): 'gold' | 'xp' | undefined => {
  const to = affixDef(id)?.parts[0]?.to;
  return to === 'prog:gold' ? 'gold' : to === 'prog:xp' ? 'xp' : undefined;
};

// ------------------------------------------------------------ takım item'leri

const hashOf = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Ölçülen affix'in yuvası: örtük statı yok (loadout yalnız silah ve ikinci elde okur), item'in tek statı ölçülen affix olur. */
export const MEASURE_SLOT: SlotId = 'trinket';

/** Yuva için taban: sınıfın takabildiği, seviyesi ilvl'i aşmayan en yüksek taban (Legendary hariç; eşitlikte veri sırası). */
function pickBase(classId: string, slot: SlotId, ilvl: number, like?: ItemDef): ItemDef | undefined {
  const pool = ITEMS.items.filter((d) => d.slot === slot && d.rarity !== 'legendary' && canEquip(classId, d) && d.ilvl <= ilvl && (!like || (d.family === like.family && gripOf(d) === gripOf(like))));
  return pool.reduce<ItemDef | undefined>((best, d) => (!best || d.ilvl > best.ilvl ? d : best), undefined);
}

/**
 * Temel takım: her kahramana sabit item (silah başlangıç silahıyla aynı aile + tutuş; çift el silah varsa ikinci el yok). Zarlar sınıf + yuva + seviyeden
 * seed'li, değerler ortalama zarda: koşudan koşuya ve affix'ten affix'e aynı. Kademeler nadirliğin kademeleri (uncommon: C, C).
 * Tılsım yuvası (MEASURE_SLOT) boş kalır: ölçülen affix orada, başka hiçbir stat taşımayan item'le gelir.
 */
export function baseKit(classId: string, ilvl: number, rarity: RarityId, heroId: string): Partial<Equipment> {
  const start = starterEquipment(classId, heroId);
  const eq: Partial<Equipment> = {};
  for (const slot of SLOT_IDS) {
    if (slot === MEASURE_SLOT) continue;
    const old = start[slot];
    const like = old ? itemDef(old.id) : undefined;
    if (slot === 'offhand' && eq.weapon && blocksOffhand(itemDef(eq.weapon.id)!)) continue;
    if (slot === 'offhand' && !old) continue; // başlangıçta ikinci eli olmayan sınıf ikinci el taşımaz (Mage, Archer...)
    const d = pickBase(classId, slot, ilvl, slot === 'weapon' || slot === 'offhand' ? like : undefined) ?? (like && like.rarity !== 'legendary' ? like : undefined);
    if (!d) continue;
    const roll = rollItem(d, new Rng(hashOf(`${classId}|${slot}|${ilvl}`)), { forClass: classId, rarity, ilvl: Math.max(d.ilvl, ilvl) });
    const inst: ItemInstance = { uid: `kit-${heroId}-${slot}`, id: d.id, rolls: { ...roll, affixes: roll.affixes.map((a) => ({ ...a, q: 0.5 })) } };
    eq[slot] = inst;
  }
  return eq;
}

/**
 * Kitin kopyası, ölçüm yuvasında yalnız bu affix'i taşıyan item'le (ortalama zar, değer `ilvl`den; temel takımın seviyesinden bağımsız).
 * Değer yuvadan bağımsız, affix'in `slots` listesi yalnız uygunluğu belirler. Immunity gibi seçimli affix seed'e göre seçimleri dolaşır.
 */
export function withAffix(eq: Partial<Equipment>, id: string, seed: number, ilvl: number): Partial<Equipment> {
  const def = affixDef(id);
  if (!def) throw new Error(`Unknown affix: ${id}`);
  const base = ITEMS.items.find((d) => d.slot === MEASURE_SLOT && d.rarity !== 'legendary' && !d.effect);
  if (!base) throw new Error(`No plain ${MEASURE_SLOT} base`);
  const x = def.choices?.length ? def.choices[seed % def.choices.length] : undefined;
  const inst: ItemInstance = { uid: `measure-${id}`, id: base.id, rolls: { rarity: base.rarity, ilvl, affixes: [{ id, q: 0.5, ...(x ? { x } : {}) }] } };
  return { ...eq, [MEASURE_SLOT]: inst };
}

// ------------------------------------------------------------ dilimler

/** Item seviyesinin bölümü (power-budget.json). */
export function chapterForIlvl(ilvl: number) {
  const ch = POWER_BUDGET.chapters.find((c) => c.map && ilvl >= c.ilvl[0] && ilvl <= c.ilvl[1]);
  if (!ch?.map) throw new Error(`No campaign chapter for item level ${ilvl}`);
  return ch as typeof ch & { map: string };
}

export type SliceOptions = Pick<MeasureOptions, 'kit' | 'kitRatio' | 'levelRatio' | 'battles' | 'waves'>;

/** Rotanın dilimi: o ilvl'i aşmayan düğümlerin son `battles` savaşının başladığı dizin. */
export function sliceStart(map: CampaignMap, route: string[], ilvl: number, battles: number): number {
  const fights = route.map((id, i) => ({ id, i })).filter((x) => isBattleNode(node(map, x.id)) && nodeIlvl(map.id, x.id) <= ilvl);
  return fights.length ? fights[Math.max(0, fights.length - battles)]!.i : 0;
}

/** Sefer dilimi başlangıcı: dilimin ilk düğümünde, önceki düğümler bitmiş, takım hazır (level = düğümün seviyesi). */
export function campaignSliceState(seed: number, route: string[], team: string[], ilvl: number, o: SliceOptions, gear: (i: number, eq: Partial<Equipment>) => Partial<Equipment>): CampaignState {
  const mapId = chapterForIlvl(ilvl).map;
  const map = getMap(mapId);
  const start = sliceStart(map, route, ilvl, o.battles);
  const at = route[start]!;
  const before = route.slice(0, start);
  const level = lagged(levelAt(chapterForIlvl(ilvl).chapter, nodeDepth(mapId, at)), o.levelRatio);
  const s = newCampaign({ mode: 'normal', seed, mapId });
  s.roster = team.map((c, i) => {
    const id = `h${i + 1}`;
    const hero: Hero = { id, class: c, hpRatio: 1, alive: true, ...(i === 0 ? { leader: true as const } : {}), level: 1, xp: 0, statPoints: 0, skillPoints: 0, alloc: {}, equipment: gear(i, baseKit(c, lagged(ilvl, o.kitRatio), o.kit, id)) as Equipment };
    setLevel(hero, level);
    return hero;
  });
  s.nextHeroId = team.length + 1;
  s.at = at;
  s.path = [...before, at];
  s.visited = [...before, at];
  s.cleared = before.filter((id) => nodeSteps(map, node(map, id)).length > 0);
  s.done = before.flatMap((id) => nodeSteps(map, node(map, id)).map((k) => `${id}:${k}`));
  return withReachOpen(map, debugSetValor(autoFormation(s), valorRules.campaign.gift));
}

/** Endless diliminin dalgaları: ilvl'e denk dalga (ilvlCap) ortada; koşu `first` ile `last` arasında oynanır. */
export function endlessWindow(ilvl: number, waves: number): { first: number; last: number } {
  const center = Math.max(1, ilvl - ENDLESS.items.ilvlAhead);
  const first = Math.max(1, center - Math.floor(waves / 2) + 1);
  return { first, last: first + waves - 1 };
}

/** Endless dilimi başlangıcı: dalga `first`, dalganın seviyesinde takım, sabit item'ler. */
export function endlessSliceRun(run: EndlessRun, ilvl: number, o: SliceOptions, gear: (i: number, eq: Partial<Equipment>) => Partial<Equipment>): EndlessRun {
  const { first } = endlessWindow(ilvl, o.waves);
  const level = lagged(1 + (first - 1) * (ENDLESS.levels?.levelPerWave ?? 1), o.levelRatio);
  return {
    ...run,
    wave: first,
    stats: { ...run.stats, cleared: first - 1 },
    heroes: run.heroes.map((h, i): EndlessHero => {
      const hero = { ...h, equipment: gear(i, baseKit(h.class, lagged(ilvl, o.kitRatio), o.kit, h.id)) as EndlessHero['equipment'] };
      setLevel(hero, level);
      return hero;
    }),
  };
}

// ------------------------------------------------------------ tek koşu

export interface SeedMetrics {
  /** Güç puanı (0-100). */
  score: number;
  /** Kazanılan savaş oranı (%). */
  win: number;
  /** Savaş başına ortalama tur (saldırı affix'i kısaltır). */
  turns: number;
  /** Koşu sonu takım altını, kahraman başına toplam XP. */
  gold: number;
  xp: number[];
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const heroXp = (h: { level?: number; xp?: number }): number => totalXpFor(h.level ?? 1) + (h.xp ?? 0);

/** Kampta yalnız Tend / Rest: Sharpen ve Train takım item'ini ve level'ı koşular arasında kaydırır (ölçümü karıştırır). */
const sliceCamp = (s: CampaignState): CampChoice => {
  const c = simCampChoice(s);
  return c.kind === 'sharpen' || c.kind === 'train' ? { kind: 'rest' } : c;
};

/** Bir koşu: `carrier` kahramanına (takım dizini) affix eklenir, `affix` yoksa temel. */
export function runSeed(env: SimEnv, team: string[], ilvl: number, seed: number, o: SliceOptions, affix?: string, carrier = 0): SeedMetrics {
  const gear = (i: number, eq: Partial<Equipment>) => (affix && i === carrier ? withAffix(eq, affix, seed, ilvl) : eq);
  if (env === 'endless') {
    const { last } = endlessWindow(ilvl, o.waves);
    let end: EndlessRun | undefined;
    const res = simulateEndless({ runs: 1, firstSeed: seed, classes: team, gear: 'none', relics: 'none', maxWave: last, setupRun: (run) => endlessSliceRun(run, ilvl, o, gear), onRunEnd: (run) => (end = run) });
    const waves = res.runs[0]!.waves;
    const wins = waves.filter((w) => w.win);
    return { score: (wins.reduce((a, w) => a + w.he, 0) / o.waves) * 100, win: (wins.length / o.waves) * 100, turns: avg(waves.map((w) => w.t)), gold: end!.gold, xp: end!.heroes.map(heroXp) };
  }
  const ch = chapterForIlvl(ilvl);
  const routes = allRoutes(getMap(ch.map));
  let end: CampaignState | undefined;
  const res = simulateCampaign({
    difficulty: CONFIG.defaultDifficulty,
    player: 'medium',
    runs: 1,
    firstSeed: seed,
    routeOffset: seed % routes.length,
    map: ch.map,
    gear: 'none',
    maxAttempts: 1,
    continueOnStuck: true,
    startState: (sd, route) => campaignSliceState(sd, route, team, ilvl, o, gear),
    stopWhen: (s) => nodeIlvl(s.mapId, s.at) > ilvl,
    campChoice: sliceCamp,
    onRunEnd: (s) => (end = s),
  });
  const nodes = Object.values(res.nodes);
  const reached = nodes.reduce((a, n) => a + n.reached, 0);
  const wins = nodes.reduce((a, n) => a + n.firstWins, 0);
  const hp = nodes.reduce((a, n) => a + n.hpEndSum, 0);
  return { score: reached ? (hp / reached) * 100 : 0, win: reached ? (wins / reached) * 100 : 0, turns: reached ? nodes.reduce((a, n) => a + n.turnsSum, 0) / reached : 0, gold: end!.gold, xp: end!.roster.map(heroXp) };
}

// ------------------------------------------------------------ iş listesi

export interface Job {
  key: string;
  env: SimEnv;
  ilvl: number;
  team: string[];
  affix?: string;
  carrier?: number;
  type?: HeroType;
  cls?: string;
}

const teamKey = (team: string[]) => team.join('+');
const baseKey = (env: SimEnv, ilvl: number, team: string[]) => `base|${env}|${ilvl}|${teamKey(team)}`;
const mainTeam = (o: MeasureOptions) => [o.heroes.front, o.heroes.back, o.heroes.support, o.heroes.mate];
/** `alt` takımı: yoldaşın yerine ölçülen sınıf (zaten takımdaysa aynı takım). */
const altTeam = (o: MeasureOptions, cls: string) => (mainTeam(o).includes(cls) ? mainTeam(o) : [o.heroes.front, o.heroes.back, o.heroes.support, cls]);

/** Plan: uygun olmayan satırlar koşmaz, satırda "uygun değil" diye yazar. */
export interface PlanEntry {
  affix: string;
  type: HeroType;
  cls: string;
  team: string[];
  usable: boolean;
}

export function planEntries(o: MeasureOptions): PlanEntry[] {
  const out: PlanEntry[] = [];
  const team = mainTeam(o);
  for (const affix of o.affixes) {
    if (!affixDef(affix)) throw new Error(`Unknown affix: ${affix}`);
    for (const type of MAIN_TYPES) if (o.types.includes(type)) out.push({ affix, type, cls: o.heroes[type], team, usable: affixUsable(o.heroes[type], affix) });
    if (o.types.includes('alt') && !MAIN_TYPES.some((t) => affixUsable(o.heroes[t], affix))) {
      const cls = altClassFor(affix);
      out.push({ affix, type: 'alt', cls: cls ?? '-', team: cls ? altTeam(o, cls) : team, usable: !!cls });
    }
  }
  return out;
}

export function jobsFor(o: MeasureOptions): Job[] {
  const jobs = new Map<string, Job>();
  const plan = planEntries(o).filter((p) => p.usable);
  for (const env of o.envs) {
    for (const ilvl of o.ilvls) {
      for (const p of plan) {
        const base = baseKey(env, ilvl, p.team);
        if (!jobs.has(base)) jobs.set(base, { key: base, env, ilvl, team: p.team });
        const key = `${env}|${ilvl}|${p.affix}|${p.type}`;
        jobs.set(key, { key, env, ilvl, team: p.team, affix: p.affix, carrier: p.team.indexOf(p.cls), type: p.type, cls: p.cls });
      }
    }
  }
  return [...jobs.values()];
}

export function runJob(job: Job, o: MeasureOptions): SeedMetrics[] {
  const out: SeedMetrics[] = [];
  for (let i = 0; i < o.seeds; i++) out.push(runSeed(job.env, job.team, job.ilvl, o.firstSeed + i, o, job.affix, job.carrier ?? 0));
  return out;
}

// ------------------------------------------------------------ istatistik + satırlar

/** Eşli fark özeti: ortalama, %95 güven aralığının yarısı (normal yaklaşım; tek seed'de 0). */
export function pairedDiff(a: number[], base: number[]): { mean: number; ci: number } {
  const n = Math.min(a.length, base.length);
  if (!n) return { mean: 0, ci: 0 };
  const d = Array.from({ length: n }, (_, i) => a[i]! - base[i]!);
  const mean = d.reduce((x, y) => x + y, 0) / n;
  if (n < 2) return { mean, ci: 0 };
  const v = d.reduce((x, y) => x + (y - mean) ** 2, 0) / (n - 1);
  return { mean, ci: 1.96 * Math.sqrt(v / n) };
}

const round = (v: number, k = 3) => Math.round(v * 10 ** k) / 10 ** k;

export interface AffixRow {
  affix: string;
  name: string;
  tier: string;
  type: HeroType;
  cls: string;
  ilvl: number;
  env: SimEnv;
  /** false: bu sınıfa yaramaz, koşulmadı. */
  usable: boolean;
  /** Mevcut IP değeri (ortalama zar, bu ilvl). */
  ip: number;
  /** Ortalama zardaki değerler. */
  values: number[];
  /** Güç puanı farkı ve %95 güven aralığının yarısı. */
  diff?: number;
  ci?: number;
  /** Kazanma oranı farkı (puan). */
  winDiff?: number;
  winCi?: number;
  /** Savaş başına tur farkı (eksi = daha kısa savaş). */
  turnDiff?: number;
  turnCi?: number;
  /** IP başına güç (fark / IP). Ekonomi satırında yok. */
  perIp?: number;
  /** Fark sıfırdan anlamlı mı (aralık sıfırı geçmiyor). */
  sig?: boolean;
  /** Ekonomi satırı: altın ya da XP farkı (%), güç yerine bu okunur. */
  economy?: { kind: 'gold' | 'xp'; pct: number; ci: number };
}

export interface BaseRow {
  env: SimEnv;
  ilvl: number;
  team: string[];
  score: number;
  win: number;
  turns: number;
}

export interface MeasureResult {
  options: Omit<MeasureOptions, 'affixes'> & { affixCount: number };
  notes: string[];
  baselines: BaseRow[];
  rows: AffixRow[];
  extremes: Array<{ env: SimEnv; ilvl: number; strongest: AffixRow[]; weakest: AffixRow[] }>;
  perSeed?: Record<string, number[]>;
}

/** Ham koşulardan (iş anahtarı -> seed sonuçları) satırları ve uçları kurar. */
export function buildResult(o: MeasureOptions, data: Record<string, SeedMetrics[]>, top = 10): MeasureResult {
  const rows: AffixRow[] = [];
  for (const env of o.envs) {
    for (const ilvl of o.ilvls) {
      for (const p of planEntries(o)) {
        const def = affixDef(p.affix)!;
        const values = affixValues(p.affix, ilvl, 0.5);
        const ip = round(affixIP(p.affix, values));
        const row: AffixRow = { affix: p.affix, name: def.name, tier: def.tier, type: p.type, cls: p.cls, ilvl, env, usable: p.usable, ip, values };
        rows.push(row);
        if (!p.usable) continue;
        const base = data[baseKey(env, ilvl, p.team)];
        const got = data[`${env}|${ilvl}|${p.affix}|${p.type}`];
        if (!base || !got) throw new Error(`Missing runs for ${p.affix} ${env} ${ilvl}`);
        const d = pairedDiff(got.map((m) => m.score), base.map((m) => m.score));
        const w = pairedDiff(got.map((m) => m.win), base.map((m) => m.win));
        const tu = pairedDiff(got.map((m) => m.turns), base.map((m) => m.turns));
        Object.assign(row, { diff: round(d.mean), ci: round(d.ci), winDiff: round(w.mean), winCi: round(w.ci), turnDiff: round(tu.mean), turnCi: round(tu.ci), sig: Math.abs(d.mean) > d.ci && d.ci > 0 });
        const eco = economyKind(p.affix);
        if (eco) {
          const carrier = p.team.indexOf(p.cls);
          const read = (m: SeedMetrics) => (eco === 'gold' ? m.gold : m.xp[carrier] ?? 0);
          const mean = avg(base.map(read));
          const e = pairedDiff(got.map(read), base.map(read));
          row.economy = { kind: eco, pct: mean ? round((e.mean / mean) * 100, 2) : 0, ci: mean ? round((e.ci / mean) * 100, 2) : 0 };
        } else if (ip > 0) row.perIp = round(d.mean / ip, 4);
      }
    }
  }
  const baselines: BaseRow[] = Object.entries(data)
    .filter(([k]) => k.startsWith('base|'))
    .map(([k, ms]) => {
      const [, env, ilvl, team] = k.split('|') as [string, SimEnv, string, string];
      return { env, ilvl: Number(ilvl), team: team.split('+'), score: round(avg(ms.map((m) => m.score))), win: round(avg(ms.map((m) => m.win))), turns: round(avg(ms.map((m) => m.turns))) };
    });
  const extremes = o.envs.flatMap((env) =>
    o.ilvls.map((ilvl) => {
      const list = rows.filter((r) => r.env === env && r.ilvl === ilvl && r.perIp !== undefined).sort((a, b) => b.perIp! - a.perIp! || a.affix.localeCompare(b.affix) || a.type.localeCompare(b.type));
      return { env, ilvl, strongest: list.slice(0, top), weakest: list.slice(-top).reverse() };
    }),
  );
  const notes: string[] = [];
  for (const ilvl of o.ilvls) {
    if (o.envs.includes('campaign') && !mapEnabled(chapterForIlvl(ilvl).map)) notes.push(`Sefer ilvl ${ilvl}: ${chapterForIlvl(ilvl).map} haritası oyunda henüz kapalı (bayrak), düşman sayıları yer tutucu olabilir.`);
  }
  if (o.affixes.some((id) => affixDef(id)?.choices?.length)) notes.push('Seçimli affix (Immunity): seçim seed sırasına göre dolaşır, sonuç seçimlerin ortalamasıdır.');
  const { affixes: _a, ...rest } = o;
  return { options: { ...rest, affixCount: o.affixes.length }, notes, baselines, rows, extremes };
}

// ------------------------------------------------------------ tablo

const TYPE_TR: Record<HeroType, string> = { front: 'ön', back: 'arka', support: 'destek', alt: 'yedek' };
const ENV_TR: Record<SimEnv, string> = { campaign: 'sefer', endless: 'endless' };
const sign = (v: number, k = 2) => `${v >= 0 ? '+' : ''}${v.toFixed(k)}`;

export const ROW_HEADER = 'affix | kademe | tip (sınıf) | ilvl | ortam | fark (güç puanı) ± %95 | kazanma farkı | tur farkı | IP | IP başına güç';

/** Tablo satırı (tek satır; `|` ile ayrılı, her satırda aynı sütun sayısı). */
export function formatRow(r: AffixRow): string {
  const head = `${r.name} (${r.affix}) | ${r.tier} | ${TYPE_TR[r.type]} (${r.cls}) | ${r.ilvl} | ${ENV_TR[r.env]}`;
  if (!r.usable) return `${head} | uygun değil | - | - | ${r.ip} | -`;
  const star = r.sig ? '*' : '';
  const diff = `${sign(r.diff ?? 0)} ± ${(r.ci ?? 0).toFixed(2)}${star}`;
  const win = `${sign(r.winDiff ?? 0, 1)} ± ${(r.winCi ?? 0).toFixed(1)}`;
  const per = r.economy ? `${r.economy.kind === 'gold' ? 'altın' : 'XP'} ${sign(r.economy.pct, 1)}% ± ${r.economy.ci.toFixed(1)}` : r.perIp === undefined ? '-' : sign(r.perIp, 3);
  const turn = `${sign(r.turnDiff ?? 0, 2)} ± ${(r.turnCi ?? 0).toFixed(2)}`;
  return `${head} | ${diff} | ${win} | ${turn} | ${r.ip} | ${per}`;
}

export function formatReport(res: MeasureResult): string {
  const L: string[] = [];
  const o = res.options;
  L.push(`AFFIX ÖLÇÜMÜ: ${o.affixCount} affix, ${o.seeds} seed (ilk ${o.firstSeed}), temel takım ${o.kit} (item seviyesi ilvl x ${o.kitRatio}, level x ${o.levelRatio}), sefer dilimi ${o.battles} savaş, Endless dilimi ${o.waves} dalga`);
  L.push('Güç puanı: savaş başına takımın savaş sonu ortalama canı (0-100; kaybedilen ya da oynanmayan savaş 0). * = fark sıfırdan anlamlı.');
  for (const n of res.notes) L.push(`Not: ${n}`);
  L.push('', 'TEMEL (affix\'siz)');
  for (const b of res.baselines) L.push(`  ${ENV_TR[b.env]} ilvl ${b.ilvl} ${b.team.join('+')}: güç puanı ${b.score.toFixed(1)}, kazanma %${b.win.toFixed(1)}, savaş başına ${b.turns.toFixed(1)} tur`);
  L.push('', ROW_HEADER);
  for (const r of res.rows) L.push(formatRow(r));
  for (const x of res.extremes) {
    if (!x.strongest.length) continue;
    L.push('', `UÇLAR: ${ENV_TR[x.env]} ilvl ${x.ilvl}, IP başına en güçlü`);
    x.strongest.forEach((r, i) => L.push(`  ${i + 1}. ${formatRow(r)}`));
    L.push(`UÇLAR: ${ENV_TR[x.env]} ilvl ${x.ilvl}, IP başına en zayıf`);
    x.weakest.forEach((r, i) => L.push(`  ${i + 1}. ${formatRow(r)}`));
  }
  return L.join('\n');
}

// ------------------------------------------------------------ CLI

function parseCli(args: string[]): { o: MeasureOptions; out?: string; jobs: number; top: number; part?: [number, number]; list: boolean } {
  const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const nums = (v: string) => v.split(',').map(Number);
  const o = defaultOptions();
  if (flag('seeds')) o.seeds = Number(flag('seeds'));
  if (flag('first')) o.firstSeed = Number(flag('first'));
  if (flag('affixes')) o.affixes = flag('affixes')!.split(',');
  if (flag('types')) o.types = flag('types')!.split(',') as HeroType[];
  if (flag('ilvl')) o.ilvls = nums(flag('ilvl')!);
  if (flag('env')) o.envs = flag('env')!.split(',') as SimEnv[];
  if (flag('kit')) o.kit = flag('kit') as RarityId;
  if (flag('kit-ratio')) o.kitRatio = Number(flag('kit-ratio'));
  if (flag('level-ratio')) o.levelRatio = Number(flag('level-ratio'));
  if (flag('battles')) o.battles = Number(flag('battles'));
  if (flag('waves')) o.waves = Number(flag('waves'));
  for (const pair of (flag('heroes') ?? '').split(',').filter(Boolean)) {
    const [k, c] = pair.split(':') as [keyof typeof DEFAULT_HEROES, string];
    if (!(k in o.heroes) || !classes[c]) throw new Error(`--heroes: ${pair}`);
    o.heroes[k] = c;
  }
  const p = flag('part');
  return {
    o,
    ...(flag('out') ? { out: flag('out')! } : {}),
    jobs: Math.max(1, Number(flag('jobs') ?? Math.min(12, cpus().length - 1))),
    top: Number(flag('top') ?? 10),
    ...(p ? { part: p.split('/').map(Number) as [number, number] } : {}),
    list: args.includes('--list'),
  };
}

function runPart(args: string[], i: number, n: number): Promise<Record<string, SeedMetrics[]>> {
  const script = fileURLToPath(import.meta.url);
  const childArgs = [...process.execArgv, script, ...args.filter((a) => !a.startsWith('--out=') && !a.startsWith('--jobs=')), `--part=${i}/${n}`];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, childArgs, { stdio: ['ignore', 'pipe', 'inherit'] });
    let buf = '';
    child.stdout.on('data', (d) => (buf += d));
    child.on('exit', (code) => (code === 0 ? resolve(JSON.parse(buf) as Record<string, SeedMetrics[]>) : reject(new Error(`part ${i}/${n} exit ${code}`))));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { o, out, jobs, top, part, list } = parseCli(args);
  const all = jobsFor(o);
  if (list) {
    const plan = planEntries(o);
    for (const p of plan) console.log(`${p.affix} ${p.type} ${p.cls} ${p.usable ? '' : 'uygun değil'}`);
    console.log(`${all.length} iş, ${all.length * o.seeds} koşu (${o.affixes.length} affix)`);
    return;
  }
  if (part) {
    const [i, n] = part;
    const res: Record<string, SeedMetrics[]> = {};
    all.forEach((j, k) => {
      if (k % n === i) res[j.key] = runJob(j, o);
    });
    process.stdout.write(JSON.stringify(res));
    return;
  }
  if (!out) throw new Error('--out=<dosya.json> gerekli');
  const started = Date.now();
  const n = Math.min(jobs, all.length);
  const data: Record<string, SeedMetrics[]> = {};
  if (n <= 1) for (const j of all) data[j.key] = runJob(j, o);
  else for (const r of await Promise.all(Array.from({ length: n }, (_, i) => runPart(args, i, n)))) Object.assign(data, r);
  const ms = Date.now() - started;
  const res = buildResult(o, data, top);
  res.perSeed = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.map((m) => round(m.score, 2))]));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ ...res, elapsedMs: ms, runs: all.length * o.seeds, workers: n }, null, 1));
  console.log(formatReport(res));
  console.log(`\nSüre: ${(ms / 1000).toFixed(1)} sn, ${all.length * o.seeds} koşu, ${n} iş parçası (koşu başına ${((ms * n) / Math.max(1, all.length * o.seeds)).toFixed(0)} ms iş).`);
  console.log(`Ham sonuç: ${out}`);
}

// Yalnız doğrudan çalıştırılınca (test içe aktarınca koşmaz)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
