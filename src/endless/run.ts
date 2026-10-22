// Endless koşu durumu ve kuralları (saf; her fonksiyon yeni durum döner, girdiyi değiştirmez). Sayılar data/endless.json'dan.
import { classes } from '../engine/content';
import { BAG_SIZE, ITEMS, RARITY_IDS, canEquip, levelRequirement, defaultEquipSlot, isPlanError, offhandBlocker, planEquip, planMoveEquipped, promoteOffhand, slotsFor, instanceIP, itemDef, itemIP, itemValue, rollItem, type ItemDef, type ItemInstance, type RarityId, type SlotId } from '../progression/items';
import { itemRecovery } from '../progression/loadout';
import { rollDropRarity } from '../progression/drop';
import { bestMoves, FALLEN_GEAR_MSG } from '../progression/equip';
import { RARE, legendaryPool, rollRareDrop } from '../progression/rare';
import { emptyEquipment } from '../progression/items';
import { starterWeapon, starterUid } from '../progression/weapon';
import { fallAfterVictory, healWounds, valorClearWounds, valorRevivedCounts, woundCount } from '../progression/wounds';
import { ENDLESS, endlessCorpses, endlessWoundRules, itemOptionCount, type EndlessConfig, type ItemRolls, type EndlessHero, type EndlessRun, type RewardCard, type ScoreEntry, type ShopEntry, type WaveKind } from './data';
import { rngFor, waveKind, waveLevel, waveSeed, type WavePlan } from './waves';
import type { SuspendedBattle } from './replay';
import { relicOffer, victoryHealOf } from './relics';
import { autoSlots, carrySlots, validSlots } from './formation';
import type { Rng } from '../engine/rng';
import { battleSummary, type Battle } from '../engine';
import { snapshotCarry, type WaveCarry } from './carry';
import type { UnitCarry } from './data';
import { valorRules } from '../engine/content';
import { addValor, canReviveOutside, valorEarned } from '../engine/valor';
import { LEVELS, addXp, allocate, autoAllocate, nodeXpMult, setLevel, xpToNext, type KillRecord, type StatAlloc } from '../progression/levels';
import { applyRespec, applyTree, autoTreeHero, respecBlocked, treeChangeBlocked } from '../progression/skill-tree-hero';
import { treeOf } from '../progression/skill-tree-data';
import type { TreeAlloc } from '../progression/skill-tree';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Yeni koşu: seçilen class'lar (level 1, yalnızca sınıfın başlangıç silahı, tam can). `slots` = koşu başı dizilimi (class'larla aynı sırada hücre; geçersizse /
 * verilmezse otomatik dizilim).
 */
export function newRun(seed: number, classIds: string[], startedAt = new Date().toISOString(), cfg: EndlessConfig = ENDLESS, slots?: number[]): EndlessRun {
  const keep = classIds.map((c, i) => ({ c, i })).filter((x) => classes[x.c]).slice(0, cfg.partySize);
  const picked = keep.map((x) => x.c);
  if (!picked.length) throw new Error('Endless: no valid class picked');
  const want = slots ? keep.map((x) => slots[x.i]) : [];
  const cells = validSlots(want, picked.length) ? want : autoSlots(picked);
  return {
    version: 1,
    seed,
    wave: 1,
    phase: 'ready',
    // Item Güçlendirme x5 (Ömer 2026-10-17): her kahraman sınıfının başlangıç silahıyla başlar
    heroes: picked.map((c, i) => {
      const id = `h${i + 1}`;
      const w = starterWeapon(c, starterUid(id));
      return { id, class: c, hpRatio: 1, level: 1, xp: 0, statPoints: 0, skillPoints: 0, alloc: {}, equipment: w ? { weapon: w } : {}, slot: cells[i]! };
    }),
    gold: 0,
    stats: { cleared: 0, turns: 0, kills: 0 },
    nextItem: 1,
    startedAt,
    valor: addValor(valorRules, 0, valorRules.endless.start),
  };
}

export const heroOf = (run: EndlessRun, id: string): EndlessHero | undefined => run.heroes.find((h) => h.id === id);
/** Endless'ta düşmüş kahraman (can 0; ceset): item takamaz / çıkaramaz (Ömer 2026-10-18, sefer ile aynı kural ve metin). */
export const runHeroFallen = (h: Pick<EndlessHero, 'hpRatio'>): boolean => h.hpRatio <= 0;

/** Gear Score: takılı item'lerin IP toplamı (items.md 2.3; 1 IP ~ +%1 güç). */
export function gearScore(run: Pick<EndlessRun, 'heroes'>): number {
  let ip = 0;
  for (const h of run.heroes)
    for (const inst of Object.values(h.equipment)) if (inst && itemDef(inst.id)) ip += instanceIP(inst);
  return Math.round(ip * 10) / 10;
}

// ------------------------------------------------------------ savaş sonucu

export interface WaveOutcome {
  victory: boolean;
  /** Kahraman başına son durum (motor özeti üzerinden); `slot` = savaş sonundaki hücre (dizilim taşınır), `mpRatio` = MP oranı. */
  units: Array<{ heroId: string; hpRatio: number; alive: boolean; slot?: number; mpRatio?: number }>;
  kills: number;
  turns: number;
  /** Sürekli akış (madde 300): taşınan buff / Rage / kalkan / çağrılar (outcomeFromBattle verir; yoksa yalnızca can, MP ve hücre taşınır). */
  carry?: WaveCarry;
  /** Savaş sonunda kalan Valor ve kusursuz zafer (outcomeFromBattle; yoksa koşunun Valor'u ve kahraman sonuçlarından). */
  valorLeft?: number;
  flawless?: boolean;
  /** Öldürme kaydı (XP payı; progression > trackKills). Yoksa `kills` kadar düşman, kimse düşmeden öldürülmüş sayılır. */
  killLog?: KillRecord[];
  /** Savaş içi Valor diriltmeleri (kahraman başına; Battle.log). Her biri valor.json > revive.clearWounds yara siler (Ömer 2026-10-20). */
  valorRevived?: Record<string, number>;
}

/** Motor özetinin (battleSummary) birim görünümü. */
export interface SummaryUnitLike {
  uid: string;
  side: string;
  summoned: boolean;
  hp: number;
  maxHp: number;
  slot?: number;
  mp?: number;
  maxMp?: number;
}

/** Savaş özeti -> dalga sonucu: 'party-i' birimi heroOrder[i] kahramanıdır; çağrılar sayılmaz. */
export function outcomeFromSummary(plan: Pick<WavePlan, 'heroOrder'>, victory: boolean, units: SummaryUnitLike[], turns: number): WaveOutcome {
  const heroes = units
    .filter((c) => c.side === 'party' && !c.summoned && /^party-\d+$/.test(c.uid))
    .map((c) => ({
      heroId: plan.heroOrder[Number(c.uid.slice('party-'.length))] ?? '',
      hpRatio: clamp01(c.hp / Math.max(1, c.maxHp)),
      alive: c.hp > 0,
      ...(c.slot !== undefined ? { slot: c.slot } : {}),
      ...(c.mp !== undefined && c.maxMp ? { mpRatio: Math.round(clamp01(c.mp / c.maxMp) * 1000) / 1000 } : {}),
    }))
    .filter((u) => u.heroId);
  const kills = units.filter((c) => c.side === 'enemy' && !c.summoned && c.hp <= 0).length;
  return { victory, units: heroes, kills, turns };
}

/** Bitmiş savaş -> dalga sonucu (can, MP, hücre + taşınan durum). Endless'ın tek doğru kapısı (sahne, sim, auto). */
export function outcomeFromBattle(plan: Pick<WavePlan, 'heroOrder'>, battle: Battle): WaveOutcome {
  const sum = battleSummary(battle);
  const rv = valorRevivedCounts(battle.log as ReadonlyArray<{ type: string; target?: string; cause?: string }>, plan.heroOrder);
  const out = { ...outcomeFromSummary(plan, battle.winner === 'party', sum.units, sum.turnsTaken), ...(sum.valor ? { valorLeft: sum.valor.left, flawless: sum.valor.flawless } : {}), ...(Object.keys(rv).length ? { valorRevived: rv } : {}) };
  return out.victory ? { ...out, carry: snapshotCarry(battle, plan.heroOrder) } : out;
}

/**
 * Dalga sonucunu uygular. Yalnızca 'ready' aşamasında ve planın dalgası koşunun dalgasıysa işler (aynı sonuç iki kez yazılmaz).
 * Zafer: can taşıma (seferle aynı: +%20, düşen %20 ile kalkar, boss sonrası tam), dalga +1, ödül kartları. Yenilgi: koşu biter.
 */
/** Boss zaferinin EK şifası (carry.bossHeal; eski veride bossVictoryHeal = tam iyileşme -> 1). */
export const bossHealOf = (cfg: EndlessConfig = ENDLESS): number => {
  const c = cfg.carry as EndlessConfig['carry'] & { bossVictoryHeal?: number };
  return Math.max(0, c.bossHeal ?? c.bossVictoryHeal ?? 1);
};

export function applyOutcome(run: EndlessRun, plan: Pick<WavePlan, 'wave'>, out: WaveOutcome, cfg: EndlessConfig = ENDLESS, catalog: ItemDef[] = ITEMS.items): EndlessRun {
  if (run.phase !== 'ready' || plan.wave !== run.wave) return run;
  const s = clone(run);
  delete s.suspended; // savaş bitti: yarım savaş kaydı artık geçersiz
  s.stats.turns += Math.max(0, out.turns);
  s.stats.kills += Math.max(0, out.kills);
  if (!out.victory) {
    s.phase = 'over';
    s.end = 'defeat';
    for (const u of out.units) {
      const h = heroOf(s, u.heroId);
      if (h) h.hpRatio = u.alive ? u.hpRatio : 0;
    }
    return s;
  }
  const boss = waveKind(run.wave, cfg) === 'boss';
  // Sürekli akış (madde 300): canlı çağrılar hücreleriyle taşınır; kahramanlar onların hücrelerine düşmez
  const summons = (out.carry?.summons ?? []).map((x) => {
    if ((cfg.carry.cooldowns ?? 'carry') === 'carry') return x;
    const { cooldowns: _c, ...rest } = x;
    return rest;
  });
  if (summons.length) s.summons = clone(summons);
  else delete s.summons;
  // Dizilim taşınır: savaş sonundaki hücreler (düşen son hücresine, doluysa en yakın boşa)
  const cells = carrySlots(run.heroes, out.units, summons.map((x) => x.slot));
  for (const h of s.heroes) {
    const c = cells.get(h.id);
    if (c !== undefined) h.slot = c;
  }
  // Zafer şifası (Ömer 2026-10-19, hp-death-rework.md): normal victoryHeal (Pilgrim's Bell daha yüksekse o), elit eliteHeal, boss bossHeal
  const kindNow = waveKind(run.wave, cfg);
  const relicHeal = victoryHealOf(run.relics, cfg);
  const heal = kindNow === 'boss' ? bossHealOf(cfg) : kindNow === 'elite' ? Math.max(cfg.carry.eliteHeal ?? cfg.carry.victoryHeal, relicHeal) : relicHeal;
  const fallenMode = cfg.carry.fallen ?? 'corpse';
  const corpses = fallenMode !== 'rise';
  const wr = endlessWoundRules(cfg);
  const risen = new Set<string>();
  // Savaş içi Valor diriltmesi yara siler (Ömer 2026-10-20; Resurrection / Raise Dead silmez)
  for (const [id, n] of Object.entries(out.valorRevived ?? {})) {
    const h = heroOf(s, id);
    if (!h) continue;
    const w = healWounds(woundCount(h), n * valorClearWounds());
    if (w > 0) h.wounds = w;
    else delete h.wounds;
  }
  for (const u of out.units) {
    const h = heroOf(s, u.heroId);
    if (!h) continue;
    // Düşen kahraman: 'wound' (Ömer 2026-10-19) = dalgayı düşmüş bitiren riseRatio canla yaralı kalkar, lethal yaralıysa ya da dalgaya ceset
    // girip kalkmadıysa CESET; 'corpse' = hep ceset (can 0; boss şifası da kaldırmaz); 'rise' = en eski kural (reviveRatio canla kalkar).
    if (!u.alive && corpses) {
      const before = heroOf(run, u.heroId);
      const f = fallenMode === 'wound' && before && before.hpRatio > 0 ? fallAfterVictory(woundCount(h), wr) : null;
      if (f && !f.corpse) {
        h.hpRatio = f.hpRatio;
        h.wounds = f.wounds;
        delete h.carry; // yaralı kalkan: taşınan buff / Rage / kalkan yok (MP dolu)
        risen.add(h.id);
        continue;
      }
      h.hpRatio = 0;
      const c = out.carry?.heroes[u.heroId];
      if (c?.corpse) h.carry = { corpse: c.corpse };
      else delete h.carry;
      continue;
    }
    // Recovery affix'i (Ömer 2026-10-11): yalnızca takan, yalnızca sağ kalan; can ve MP'ye eklenir
    const rec = u.alive ? itemRecovery(h) : 0;
    h.hpRatio = u.alive ? clamp01(u.hpRatio + heal + rec) : clamp01(cfg.carry.reviveRatio);
    // MP canla aynı oranla (Ömer 2026-10-10; 'full' = eski kural); buff / Rage / kalkan / cooldown yalnızca sağ kalana
    const carry: UnitCarry = u.alive ? { ...(out.carry?.heroes[u.heroId] ?? {}) } : {};
    delete carry.mpRatio;
    delete carry.corpse;
    if ((cfg.carry.cooldowns ?? 'carry') !== 'carry') delete carry.cooldowns;
    if (cfg.carry.mp !== 'full') {
      const mp = u.alive ? (u.mpRatio ?? 1) + heal + rec : cfg.carry.reviveRatio;
      if (clamp01(mp) < 1) carry.mpRatio = Math.round(clamp01(mp) * 1000) / 1000;
    }
    if (Object.keys(carry).length) h.carry = clone(carry);
    else delete h.carry;
  }
  // Hero's Feast: kazanılan her dalga bir hak düşer
  if (s.blessing) {
    s.blessing.waves -= 1;
    if (s.blessing.waves <= 0) delete s.blessing;
  }
  // Valor (Ömer 2026-10-13): savaşta harcanan düşülür; normal +1, elit +2, boss +3 (+1 kusursuz), üst sınır cap
  {
    const kind = waveKind(run.wave, cfg);
    const flawless = out.flawless ?? out.units.every((u) => u.alive);
    s.valor = addValor(valorRules, out.valorLeft ?? run.valor ?? 0, valorEarned(valorRules, kind === 'boss' ? 'boss' : kind === 'elite' ? 'elite' : 'normal', flawless));
  }
  // XP (levels.md): dalga seviyesine göre; level atlayan ayaktaki kahraman tam can + tam MP
  grantWaveXp(s, run.wave, out, cfg);
  for (const id of risen) heroOf(s, id)!.hpRatio = clamp01(wr.riseRatio); // yaralı kalkan level atlasa da riseRatio canla (VARSAYIM 369)
  s.stats.cleared = run.wave;
  s.wave = run.wave + 1;
  // Ortak nadir düşüş (madde 297): kazanılan her dalgada bir zar; dalga başına şans artar, Legendary 11. dalgadan itibaren
  delete s.rareDrop;
  const wk = waveKind(run.wave, cfg);
  const rr = rollRareDrop({ rng: rngFor(s.seed, run.wave, 'rare'), kind: wk === 'normal' ? 'battle' : wk, misses: s.rarePity ?? 0, wave: run.wave });
  s.rarePity = rr.misses;
  if (rr.item) {
    // Torba doluysa nadir item BEKLER (ödül ekranında: yer açılınca alınır, alınmadan devam edilirse kaybolur); zarlar şimdi atılır
    const d = defIn(catalog, rr.item);
    const rolls = d && itemDef(d.id) ? rollItem(d, rngFor(s.seed, run.wave, 'rare-roll'), { ilvl: ilvlCap(run.wave, cfg) }) : undefined; // dalganın seviyesi, taban seviyesiz (Ömer 2026-10-12: Legendary düştüğü seviyede)
    if (addToBag(s, rr.item, catalog, cfg, rolls).ok) s.rareDrop = { itemId: rr.item, wave: run.wave };
    else s.rareDrop = { itemId: rr.item, wave: run.wave, pending: true, ...(rolls ? { rolls } : {}) };
  }
  s.phase = 'reward';
  s.offer = rewardOffer(s, cfg, catalog);
  // Boss zaferi: önce kalıntı seçimi (sahip olunmayan yoksa atlanır), sonra ödül kartları
  if (boss) {
    const relics = relicOffer(s.seed, s.stats.cleared, s.relics, cfg);
    if (relics.length) {
      s.phase = 'relic';
      s.relicOffer = relics;
    }
  }
  return s;
}


/**
 * Dalga XP'si (kahraman başına): xpPerWave x eşik(dalga seviyesi) x tür çarpanı, düşman başına eşit pay; düştükten sonraki öldürmeler fallenShare;
 * geride kalana yakalama bonusu (level farkı cezası yok). Kahraman yoksa boş.
 */
export function waveXp(run: Pick<EndlessRun, 'heroes'>, wave: number, out: Pick<WaveOutcome, 'units' | 'kills' | 'killLog'>, cfg: EndlessConfig = ENDLESS): Record<string, number> {
  const kills: KillRecord[] = out.killLog ?? Array.from({ length: Math.max(0, out.kills) }, () => ({ down: [] }));
  const res: Record<string, number> = {};
  if (!kills.length || !cfg.levels) return res;
  const kind = waveKind(wave, cfg);
  const total = xpToNext(waveLevel(wave, cfg)) * cfg.levels.xpPerWave * nodeXpMult(kind === 'normal' ? 'battle' : kind);
  const per = total / kills.length;
  const fought = out.units.map((u) => run.heroes.find((h) => h.id === u.heroId)).filter((h): h is EndlessHero => !!h);
  for (const h of fought) {
    let raw = 0;
    for (const k of kills) raw += k.down.includes(h.id) ? per * LEVELS.fallenShare : per;
    const others = fought.filter((o) => o.id !== h.id).map((o) => o.level ?? 1);
    const avg = others.length ? others.reduce((a, b) => a + b, 0) / others.length : h.level ?? 1;
    const bonus = Math.min(LEVELS.catchUp.max, Math.max(0, avg - (h.level ?? 1)) * LEVELS.catchUp.perLevel);
    res[h.id] = Math.round(raw * (1 + bonus));
  }
  return res;
}

/** Dalga XP'sini yazar (YERİNDE; `s` klonlanmış olmalı): level atlayan ayaktaki kahraman tam can ve tam MP alır, `levelUps`'a eklenir. */
function grantWaveXp(s: EndlessRun, wave: number, out: WaveOutcome, cfg: EndlessConfig): void {
  for (const [id, xp] of Object.entries(waveXp(s, wave, out, cfg))) {
    const h = heroOf(s, id);
    if (!h) continue;
    giveXp(s, h, xp);
  }
}

/** XP yazar (YERİNDE): level atlayan ayaktaki kahraman tam can ve tam MP alır, `levelUps`'a eklenir (aynı kahramanın kaydı birleşir). */
function giveXp(s: EndlessRun, h: EndlessHero, xp: number): void {
  const up = addXp(h, xp);
  if (!up) return;
  if (h.hpRatio > 0) {
    h.hpRatio = 1;
    if (h.carry?.mpRatio !== undefined) delete h.carry.mpRatio;
  }
  const prev = (s.levelUps ??= []);
  const p = prev.find((x) => x.heroId === up.heroId);
  if (p) p.to = up.to;
  else prev.push(up);
}

/** Veteran's Lesson kartının kahramana vereceği XP: bulunduğu level'dan sonrakine gereken XP x ratio (tavandaki / cesette 0). */
export const lessonXp = (h: EndlessHero, ratio: number): number => (h.hpRatio > 0 && (h.level ?? 1) < LEVELS.maxLevel ? Math.round(xpToNext(h.level ?? 1) * ratio) : 0);

/** Stat puanı dağıt (Gear > Character): geçersizse Error. */
export function allocateRun(run: EndlessRun, heroId: string, add: StatAlloc): EndlessRun {
  const s = clone(run);
  const h = heroOf(s, heroId);
  if (!h) throw new Error('Unknown hero');
  allocate(h, add);
  return s;
}

/** Oyuncu vekili (sim): herkesin puanları ana stata (kural izin verdikçe). */
export function autoAllocateRun(run: EndlessRun): EndlessRun {
  if (!run.heroes.some((h) => (h.statPoints ?? 0) > 0)) return run;
  const s = clone(run);
  for (const h of s.heroes) autoAllocate(h);
  return s;
}

// ------------------------------------------------------------ skill ağacı (Faz 1b; plan skill-tree-implementation.md 3.3 + 10a)
// Kurallar src/progression/skill-tree-hero.ts (sefer src/campaign/tree.ts ile aynı). Geçersiz işlem koşuyu DEĞİŞTİRMEZ (aynı nesne döner);
// kilit Gear ile aynı (gearLockReason: yarım savaş / kalıntı seçimi / bitmiş koşu). Respec bedeli koşu altınından.

/** Ağaç onayı yapılamıyorsa nedeni (yoksa null). `alloc` = onaylanacak TAM dağılım (onaylı ağaç + yeni puanlar). */
export function runTreeBlocked(run: EndlessRun, heroId: string, alloc: TreeAlloc): string | null {
  const lock = gearLockReason(run);
  if (lock) return lock;
  const h = heroOf(run, heroId);
  if (!h) return 'Unknown hero';
  return treeChangeBlocked(h, alloc);
}

/** Ağaç onayı (Gear > Confirm; Faz 3b): doğrulanır, yeni puanlar harcanmamıştan düşer. Geçersizse koşu aynen döner. */
export function setRunHeroTree(run: EndlessRun, heroId: string, alloc: TreeAlloc): EndlessRun {
  if (runTreeBlocked(run, heroId, alloc)) return run;
  const s = clone(run);
  applyTree(heroOf(s, heroId)!, alloc);
  return s;
}

/** Respec yapılamıyorsa nedeni (yoksa null). */
export function respecRunBlocked(run: EndlessRun, heroId: string): string | null {
  const lock = gearLockReason(run);
  if (lock) return lock;
  const h = heroOf(run, heroId);
  if (!h) return 'Unknown hero';
  return respecBlocked(h, run.gold);
}

/** Respec (Ömer 10a): onaylı ağacın TAMAMI sıfırlanır, bedel koşu altınından (`freeRespec` varsa bir kez bedava). Geçersizse koşu aynen döner. */
export function respecRunHeroTree(run: EndlessRun, heroId: string): EndlessRun {
  if (respecRunBlocked(run, heroId)) return run;
  const s = clone(run);
  s.gold -= applyRespec(heroOf(s, heroId)!);
  return s;
}

/** Oyuncu vekili (sim; autoAllocateRun gibi): ağacı olan herkesin harcanmamış puanları odaklı kurulumla harcanır. */
export function autoTreeRun(run: EndlessRun): EndlessRun {
  if (!run.heroes.some((h) => (h.skillPoints ?? 0) > 0 && treeOf(h.class))) return run;
  const s = clone(run);
  for (const h of s.heroes) autoTreeHero(h);
  return s;
}

/** Level bildirimi gösterildi: kayıt silinir. */
export function acknowledgeRunLevelUps(run: EndlessRun): EndlessRun {
  if (!run.levelUps) return run;
  const s = clone(run);
  delete s.levelUps;
  return s;
}

/** Debug: tüm kahramanlara XP. */
export function debugRunXp(run: EndlessRun, amount: number): EndlessRun {
  const s = clone(run);
  for (const h of s.heroes) {
    const up = addXp(h, amount);
    if (up) {
      if (h.hpRatio > 0) h.hpRatio = 1;
      (s.levelUps ??= []).push(up);
    }
  }
  return s;
}

/** Debug: tüm kahramanların level'ı (dağıtılmış puanlar sıfırlanır). */
export function debugRunLevel(run: EndlessRun, level: number): EndlessRun {
  const s = clone(run);
  for (const h of s.heroes) setLevel(h, level);
  return s;
}

/** Kalıntıyı seç (yalnızca 'relic' aşamasında ve teklifteki biri): koşuya eklenir, ödül kartlarına geçilir. */
export function chooseRelic(run: EndlessRun, id: string): EndlessRun {
  if (run.phase !== 'relic' || !run.relicOffer?.includes(id) || run.relics?.includes(id)) return run;
  const s = clone(run);
  s.relics = [...(s.relics ?? []), id];
  delete s.relicOffer;
  s.phase = s.offer ? 'reward' : 'ready';
  return s;
}

/** Kalıntı ver (debug "Give relic"): sahip olunmayan ilk kalıntı (ya da verilen); hepsi varsa durum aynı. Yarım savaş kaydı silinir (kurulum değişti). */
export function grantRelic(run: EndlessRun, id?: string, cfg: EndlessConfig = ENDLESS): EndlessRun {
  const owned = run.relics ?? [];
  const pick = id ?? cfg.relics.list.find((r) => !owned.includes(r.id))?.id;
  if (!pick || owned.includes(pick) || !cfg.relics.list.some((r) => r.id === pick)) return run;
  const s = clone(run);
  s.relics = [...owned, pick];
  delete s.suspended;
  return s;
}

/** Koşudan vazgeç (kamp ekranında, onaylı): skor yine yazılır. */
export function abandonRun(run: EndlessRun): EndlessRun {
  if (run.phase === 'over') return run;
  const s: EndlessRun = { ...clone(run), phase: 'over', end: 'abandoned', offer: undefined, shop: undefined, relicOffer: undefined };
  delete s.shopRerolls;
  delete s.buyback;
  delete s.suspended;
  return s;
}

// ------------------------------------------------------------ yarım kalan savaş

/** Koşunun geçerli yarım savaşı: yalnızca 'ready' aşamasında, aynı dalga ve aynı savaş seed'iyle; değilse null (eski / bozuk kayıt kullanılmaz). */
export function suspendedOf(run: EndlessRun | null): SuspendedBattle | null {
  const x = run?.suspended;
  if (!run || !x || run.phase !== 'ready' || x.wave !== run.wave || x.seed !== waveSeed(run.seed, run.wave)) return null;
  return x;
}

/** Yarım savaşı yazar (`undefined` = siler). Yalnızca 'ready' aşamasında. */
export function withSuspended(run: EndlessRun, x: SuspendedBattle | undefined): EndlessRun {
  if (run.phase !== 'ready') return run;
  const s = clone(run);
  if (x) s.suspended = clone(x);
  else delete s.suspended;
  return s;
}

// ------------------------------------------------------------ item önerisi (ödül kartı + dükkân)

/** Bu dalgada düşebilecek en yüksek item seviyesi. */
export const ilvlCap = (cleared: number, cfg: EndlessConfig = ENDLESS): number => Math.max(1, Math.round(cleared * cfg.items.ilvlPerWave)) + cfg.items.ilvlAhead;

/** Item tanımı: önce verilen katalogda (testler / ileride affix'li örnekler), yoksa items.json'da. */
const defIn = (catalog: ItemDef[], id: string): ItemDef | undefined => catalog.find((d) => d.id === id) ?? itemDef(id);

/** Kahramanın o yuvadaki item'inin IP'si (boş = 0). Hançer iki yuvaya da girer: zayıf olanı; ikinci el kapalıysa (çift el) kalkan önerilmez (Infinity). */
function slotIP(h: EndlessHero, d: ItemDef, catalog: ItemDef[]): number {
  const ipOf = (k: SlotId): number => {
    if (k === 'offhand' && offhandBlocker(h.equipment)) return Infinity;
    const cur = h.equipment[k];
    const cd = cur ? defIn(catalog, cur.id) : undefined;
    if (!cur || !cd) return 0;
    return itemDef(cur.id) ? instanceIP(cur) : itemIP(cd);
  };
  const slots = itemDef(d.id) ? slotsFor(d) : [d.slot];
  return Math.min(...slots.map(ipOf));
}

/** Nadirlik sırası (0 = common). */
const rarityRank = (r: RarityId): number => RARITY_IDS.indexOf(r);

/** Item önerisinin ek koşulları: seviye tavanına ek (elit/boss), örneğin nadirliği (zarlanmış; yoksa tabanın katalog nadirliği). */
export interface PairOptions {
  ilvlBonus?: number;
  /** Önerilecek örneğin nadirliği (Ömer 2026-10-11: önce nadirlik zarlanır, sonra taban seçilir; taban nadirlikten bağımsız). */
  rarity?: RarityId;
  /** Önerilecek örneğin item seviyesi (Ömer 2026-10-11: Endless'ta dalganın seviyesi; yoksa tabanınki). */
  ilvl?: number;
}

/**
 * Takım için yükseltme olan (taban, kahraman) çiftleri: kahraman takabilir (silah ailesi), o nadirlikteki örneğin beklenen gücü yuvadakinden büyük
 * (IP), taban seviye tavanının altında. Sonra en yüksek seviyeli `window` aralığı; `exclude` id'leri ve torbadakiler atlanır. Legendary tabanlar
 * yok (yalnızca ortak nadir düşüş zarı ve tüccarın nadir malı, madde 297).
 */
export function upgradePairs(run: EndlessRun, cleared: number, exclude: string[] = [], cfg: EndlessConfig = ENDLESS, catalog: ItemDef[] = ITEMS.items, o: PairOptions = {}): Array<{ def: ItemDef; heroId: string }> {
  const cap = ilvlCap(cleared, cfg) + (o.ilvlBonus ?? 0);
  const pairs: Array<{ def: ItemDef; heroId: string }> = [];
  for (const d of catalog) {
    if (d.ilvl > cap || exclude.includes(d.id) || bagOf(run).some((i) => i.id === d.id)) continue;
    if (d.rarity === 'legendary') continue;
    const ilvl = o.ilvl !== undefined ? Math.max(d.ilvl, o.ilvl) : d.ilvl;
    const ip = itemIP(d, o.rarity, o.ilvl ?? d.ilvl);
    // Seviye şartı (Item Güçlendirme x6): kahramanın takamayacağı item önerilmez
    for (const h of run.heroes) if (canEquip(h.class, d) && (h.level ?? 1) >= levelRequirement(ilvl) && ip > slotIP(h, d, catalog)) pairs.push({ def: d, heroId: h.id });
  }
  if (!pairs.length) return pairs;
  const top = Math.max(...pairs.map((p) => p.def.ilvl));
  return pairs.filter((p) => p.def.ilvl > top - cfg.items.window);
}

const pickOne = <T>(list: T[], rng: Rng): T | undefined => (list.length ? list[rng.int(0, list.length - 1)] : undefined);

/** Teklif / tezgâh zarı: önerilen kahraman için (silahın ana affix'i onun elementinden), zarlanan nadirlikte; katalog dışı (test) item'de zar yok. */
function rollFor(run: EndlessRun, pair: { def: ItemDef; heroId: string }, rng: Rng, rarity?: RarityId, ilvl?: number): ItemRolls {
  if (!itemDef(pair.def.id)) return undefined;
  const cls = heroOf(run, pair.heroId)?.class;
  return rollItem(pair.def, rng, { ...(cls ? { forClass: cls } : {}), ...(rarity ? { rarity } : {}), ...(ilvl !== undefined ? { ilvl: Math.max(pair.def.ilvl, ilvl) } : {}) });
}

/**
 * Nadirliği zarlanmış bir öneri (Ömer onayı 2026-10-11): tek ağırlık tablosu (items.json > dropRarity; dalganın item seviyesi ve elit / boss
 * hafifçe kaydırır, tavanlı). O nadirlikte yükseltme yoksa bir alt nadirlik denenir (Common'a kadar); hiç yoksa undefined.
 */
function rolledPair(run: EndlessRun, cleared: number, taken: string[], cfg: EndlessConfig, catalog: ItemDef[], rng: Rng, kind: WaveKind, ilvlBonus: number): { def: ItemDef; heroId: string; rarity: RarityId; ilvl: number } | undefined {
  // Örneğin item seviyesi = dalganın seviyesi (+ elit / boss eki; Ömer 2026-10-11): katalog tavanını aşar, item'ler büyümeye devam eder
  const ilvl = ilvlCap(cleared, cfg) + ilvlBonus;
  const rolled = rollDropRarity(rng, ilvl, kind);
  for (let r = rarityRank(rolled); r >= 0; r--) {
    const rarity = RARITY_IDS[r]!;
    const pair = pickOne(upgradePairs(run, cleared, taken, cfg, catalog, { ilvlBonus, rarity, ilvl }), rng);
    if (pair) return { ...pair, rarity, ilvl };
  }
  return undefined;
}

/** Altın kartının miktarı (temizlenen dalgayla büyür). */
export const goldAmount = (cleared: number, cfg: EndlessConfig = ENDLESS): number => Math.round(cfg.rewards.goldBase + cfg.rewards.goldPerWave * cleared);

/**
 * Dalga arası kartlar (seed'li). Normal dalga: item (yoksa x1,5 altın), altın, iyileştirme (+%40).
 * Elit / boss dalgası (data/endless.json > special): `itemCards` farklı item kartı (nadirlik tablosu hafif kayar, seviye tavanı yüksek), x2 / x3 altın,
 * elitte Veteran's Lesson (XP kartı), boss'ta Hero's Feast (tam can + birkaç dalga maks can bonusu). Uygun item kalmazsa item kartının yerine altın.
 */
export function rewardOffer(run: EndlessRun, cfg: EndlessConfig = ENDLESS, catalog: ItemDef[] = ITEMS.items): RewardCard[] {
  const cleared = run.stats.cleared;
  const rng = rngFor(run.seed, cleared, 'reward');
  const kind = waveKind(cleared, cfg);
  const sp = kind === 'elite' ? cfg.special.elite : kind === 'boss' ? cfg.special.boss : null;
  const gold = Math.round(goldAmount(cleared, cfg) * (sp?.goldMult ?? 1));
  const cards: RewardCard[] = [];
  const taken: string[] = [];
  for (let i = 0; i < (sp?.itemCards ?? 1); i++) {
    const pair = rolledPair(run, cleared, taken, cfg, catalog, rng, kind, sp?.ilvlBonus ?? 0);
    if (pair) {
      taken.push(pair.def.id);
      // Zarlar teklif anında atılır (seed'li): kartta görünen değer = alınan değer
      const card: Extract<RewardCard, { kind: 'item' }> = { kind: 'item', itemId: pair.def.id, heroId: pair.heroId, rolls: rollFor(run, pair, rngFor(run.seed, cleared, 'offer-roll', i), pair.rarity, pair.ilvl) };
      // Çok seçenekli item kartı (Ömer 2026-10-18, TUR 1 madde 13; karar 364 "3 itemden biri seçilsin"; kalıntı teklifi gibi): ek item'ler
      // aynı kurallarla, farklı taban. Seed anahtarları ilk ek seçenekte eski iki seçenekli kartla aynı ('offer-alt', 'offer-roll' ... 'alt').
      for (let j = 1; j < itemOptionCount(kind, cfg); j++) {
        const alt = rolledPair(run, cleared, taken, cfg, catalog, j === 1 ? rngFor(run.seed, cleared, 'offer-alt', i) : rngFor(run.seed, cleared, 'offer-alt', i, j), kind, sp?.ilvlBonus ?? 0);
        if (!alt) break;
        taken.push(alt.def.id);
        const rr = j === 1 ? rngFor(run.seed, cleared, 'offer-roll', i, 'alt') : rngFor(run.seed, cleared, 'offer-roll', i, 'alt', j);
        (card.alts ??= []).push({ itemId: alt.def.id, heroId: alt.heroId, rolls: rollFor(run, alt, rr, alt.rarity, alt.ilvl) });
      }
      cards.push(card);
    } else if (!cards.some((c) => c.kind === 'gold')) cards.push({ kind: 'gold', amount: Math.round(gold * 1.5) });
  }
  cards.push({ kind: 'gold', amount: gold });
  if (kind === 'boss') cards.push({ kind: 'feast', hpMult: cfg.special.boss.feastHpMult, waves: cfg.special.boss.feastWaves });
  // Elit: Veteran's Lesson XP kartı (Ömer 2026-10-20; eski %60 iyileştirme kartı Field Surgeon kaldırıldı); normal: Tend the Wounded aynen
  else if (kind === 'elite') cards.push({ kind: 'xp', ratio: cfg.special.elite.xpRatio });
  else cards.push({ kind: 'heal', ratio: cfg.rewards.healRatio });
  // Ceset varken ek kart: "Revive <kahraman>" (Ömer 2026-10-10 takip; ekranda en çok bir tane: kahraman sırasında ilk düşen)
  const fallen = endlessCorpses(cfg) ? run.heroes.find((h) => h.hpRatio <= 0) : undefined;
  // rewards.reviveCard false (Ömer 2026-10-14): kart yok; düşen kahraman yalnızca Valor / Resurrection / Raise Dead ile döner
  if (fallen && cfg.rewards.reviveCard !== false) cards.push({ kind: 'revive', heroId: fallen.id, ratio: cfg.rewards.reviveRatio ?? 0.5 });
  return cards;
}

/**
 * Dükkân stoğu: farklı item'ler, her biri takımda bir yükseltme; nadirlik her mal için aynı tablodan zarlanır (normal dalga kayması); fiyat = örneğin
 * değeri. `reroll` (0 = ilk stok) yenilemenin seed'idir; `avoid` id'leri (yenilemede eski mallar) önce dışarıda tutulur, yetmezse yine gelebilir.
 */
export function shopStock(run: EndlessRun, cfg: EndlessConfig = ENDLESS, catalog: ItemDef[] = ITEMS.items, reroll = 0, avoid: string[] = []): ShopEntry[] {
  const cleared = run.stats.cleared;
  const rng = reroll > 0 ? rngFor(run.seed, cleared, 'shop', reroll) : rngFor(run.seed, cleared, 'shop');
  const out: ShopEntry[] = [];
  const taken: string[] = [];
  for (let i = 0; i < cfg.shop.size; i++) {
    const fresh = avoid.length ? rolledPair(run, cleared, [...taken, ...avoid], cfg, catalog, rng, 'normal', 0) : undefined;
    const pair = fresh ?? rolledPair(run, cleared, taken, cfg, catalog, rng, 'normal', 0);
    if (!pair) break;
    taken.push(pair.def.id);
    // Zarlar tezgâha konurken atılır (seed'li; yenileme numarasıyla): tezgâhta görünen değer = satın alınan değer
    const rolls = rollFor(run, pair, rngFor(run.seed, cleared, 'ware-roll', reroll, i), pair.rarity, pair.ilvl);
    out.push({ itemId: pair.def.id, heroId: pair.heroId, price: itemValue(rolls ? { id: pair.def.id, rolls } : pair.def), rolls });
  }
  // Nadir mal (madde 297): merchant.fromWave'den itibaren her ziyarette (yenileme dahil) ihtimalle bir Legendary, yüksek fiyatla; havuzdan tekdüze
  const rm = RARE.endless.merchant;
  if (run.wave >= rm.fromWave) {
    const rr = rngFor(run.seed, cleared, 'shop-rare', reroll);
    const pool = legendaryPool({ wave: run.wave }, catalog);
    if (pool.length && rr.next() < rm.chance) {
      const d = pool[rr.int(0, pool.length - 1)]!;
      const hero = run.heroes.find((h) => canEquip(h.class, d)) ?? run.heroes[0]!;
      const rolls = rollItem(d, rngFor(run.seed, cleared, 'shop-rare-roll', reroll), { ilvl: ilvlCap(cleared, cfg) }); // dalganın seviyesi, taban seviyesiz (Ömer 2026-10-12)
      out.push({ itemId: d.id, heroId: hero.id, price: Math.round(itemValue({ id: d.id, rolls }) * rm.priceMult), rolls });
    }
  }
  return out;
}

/** Ödülden sonra: dükkân dalgasıysa dükkân, değilse kamp. */
function afterReward(s: EndlessRun, cfg: EndlessConfig, catalog: ItemDef[]): EndlessRun {
  s.offer = undefined;
  if (s.rareDrop?.pending) delete s.rareDrop; // alınmadan bırakılan nadir düşüş kaybolur
  const shopWave = cfg.shop.every > 0 && s.stats.cleared > 0 && s.stats.cleared % cfg.shop.every === 0;
  const stock = shopWave ? shopStock(s, cfg, catalog) : [];
  if (stock.length) {
    s.phase = 'shop';
    s.shop = stock;
  } else {
    s.phase = 'ready';
    s.shop = undefined;
  }
  return s;
}

// ------------------------------------------------------------ torba ve kuşanma (Gear ekranı; seferle aynı kurallar)

/** Torba kapasitesi (data/endless.json > bagSize; yoksa seferin 30'u). */
export const endlessBagSize = (cfg: EndlessConfig = ENDLESS): number => cfg.bagSize ?? BAG_SIZE;

export const bagOf = (run: EndlessRun): ItemInstance[] => run.bag ?? [];

/** Torbada yer var mı (Ömer 2026-10-10: torba doluyken item alınmaz; önce bir item atılır)? */
export const bagHasRoomRun = (run: EndlessRun, cfg: EndlessConfig = ENDLESS): boolean => bagOf(run).length < endlessBagSize(cfg);

/** Torba dolu iken item ödülü kartının ipucu (yoksa null). */
export const rewardBlockedReason = (run: EndlessRun, card: RewardCard, cfg: EndlessConfig = ENDLESS): string | null =>
  card.kind === 'item' && !bagHasRoomRun(run, cfg)
    ? 'Bag full: discard an item first'
    : card.kind === 'revive' && (heroOf(run, card.heroId)?.hpRatio ?? 0) > 0
      ? 'Already back on their feet (Valor)'
      : null;

/**
 * Item'i torbaya koyar (yeni örnek uid'i). Torba doluysa ALINMAZ (ok false; Ömer 2026-10-10: otomatik altına çevirme kaldırıldı, oyuncu önce
 * Gear'dan bir item atar). Bilinmeyen item: ok false.
 */
function addToBag(s: EndlessRun, itemId: string, catalog: ItemDef[], cfg: EndlessConfig, rolls?: ItemRolls): { ok: boolean } {
  const d = defIn(catalog, itemId);
  if (!d) return { ok: false };
  const bag = (s.bag ??= []);
  if (bag.length >= endlessBagSize(cfg)) return { ok: false };
  // Stat zarları koşu seed'inden (Ömer 2026-10-10): aynı koşu + aynı uid = aynı değerler; kayda yazılır
  const uid = `e${s.nextItem}`;
  // Teklifte / tezgâhta zarlanmışsa aynı değerler (görünen = alınan); yoksa (eski kayıt, debug) burada zarlanır
  bag.push({ uid, id: d.id, ...(rolls ? { rolls: clone(rolls) } : itemDef(d.id) ? { rolls: rollItem(d, rngFor(s.seed, 'roll', uid)) } : {}) });
  s.nextItem += 1;
  return { ok: true };
}

/**
 * Bekleyen nadir düşüşü torbaya al (torba doluyken düşen; madde 297 + Ömer 2026-10-10): yer yoksa durum aynen döner. Ödül seçilip ödül
 * ekranından çıkılınca alınmamış nadir düşüş kaybolur.
 */
export function takeRareDrop(run: EndlessRun, cfg: EndlessConfig = ENDLESS, catalog: ItemDef[] = ITEMS.items): EndlessRun {
  const rd = run.rareDrop;
  if (!rd?.pending || !bagHasRoomRun(run, cfg)) return run;
  const s = clone(run);
  if (!addToBag(s, rd.itemId, catalog, cfg, rd.rolls).ok) return run;
  s.rareDrop = { itemId: rd.itemId, wave: rd.wave };
  return s;
}

/** Debug "Give item": torbaya bir item (verilmezse koşu seed'iyle değil, katalogdaki sıradaki rastgele olmayan seçim: torbada olmayan ilki). */
export function giveItem(run: EndlessRun, itemId?: string, cfg: EndlessConfig = ENDLESS, catalog: ItemDef[] = ITEMS.items): EndlessRun {
  const id = itemId ?? catalog.find((d) => !bagOf(run).some((i) => i.id === d.id))?.id;
  if (!id) return run;
  const s = clone(run);
  return addToBag(s, id, catalog, cfg).ok ? s : run;
}

/** Kuşanma yapılabilir mi? Yalnızca kamp / ödül / dükkân aşamasında ve yarım kalan savaş yokken (devam eden savaşın kurulumu değişmesin). */
export function gearLockReason(run: EndlessRun): string | null {
  if (run.phase === 'over') return 'The run is over.';
  if (run.phase === 'relic') return 'Choose a relic first.';
  if (suspendedOf(run)) return 'Finish the suspended battle first.';
  return null;
}

const lockCheck = (run: EndlessRun): void => {
  const why = gearLockReason(run);
  if (why) throw new Error(why);
};

/** Torbadaki item'i kahramana takar; yuvadaki item torbaya döner (sefer `equipItem` ile aynı kural). Hata: Error (Gear ekranı mesajı). */
export function equipFromBag(run: EndlessRun, heroId: string, uid: string, slot?: SlotId, cfg: EndlessConfig = ENDLESS): EndlessRun {
  lockCheck(run);
  const hero = heroOf(run, heroId);
  if (!hero) throw new Error(`Unknown hero: ${heroId}`);
  if (runHeroFallen(hero)) throw new Error(FALLEN_GEAR_MSG);
  const bag = bagOf(run);
  const idx = bag.findIndex((i) => i.uid === uid);
  if (idx < 0) throw new Error(`Item not in the bag: ${uid}`);
  const d = itemDef(bag[idx]!.id);
  if (!d) throw new Error(`Unknown item: ${bag[idx]!.id}`);
  const plan = planEquip(hero.class, hero.equipment, bag[idx]!, slot, { level: hero.level ?? 1 });
  if (isPlanError(plan)) throw new Error(plan.error);
  if (plan.displaced.length && bag.length - 1 + (plan.replaced ? 1 : 0) + plan.displaced.length > endlessBagSize(cfg))
    throw new Error(`Bag is full: no room for ${plan.displaced.map((x) => itemDef(x.id)?.name ?? x.id).join(', ')}`);
  const s = clone(run);
  const h = heroOf(s, heroId)!;
  const nb = [...bagOf(s)];
  const item = nb[idx]!;
  nb.splice(idx, 1);
  if (plan.replaced) nb.splice(idx, 0, plan.replaced);
  nb.push(...plan.displaced);
  const eq = { ...h.equipment, [plan.slot]: { ...item } };
  if (plan.displaced.length) delete eq.offhand;
  h.equipment = eq;
  s.bag = nb;
  return s;
}

/** Yuvadaki item'i torbaya koyar (torba doluysa hata). */
export function unequipToBag(run: EndlessRun, heroId: string, slot: SlotId, cfg: EndlessConfig = ENDLESS): EndlessRun {
  lockCheck(run);
  const hero = heroOf(run, heroId);
  if (!hero) throw new Error(`Unknown hero: ${heroId}`);
  if (runHeroFallen(hero)) throw new Error(FALLEN_GEAR_MSG);
  if (!hero.equipment[slot]) return run;
  if (bagOf(run).length >= endlessBagSize(cfg)) throw new Error('Bag is full');
  const s = clone(run);
  const h = heroOf(s, heroId)!;
  s.bag = [...bagOf(s), h.equipment[slot]!];
  const eq = { ...h.equipment };
  delete eq[slot];
  if (promoteOffhand(eq)) delete eq.offhand; // ana el çıkınca ikinci eldeki hançer ana ele geçer
  h.equipment = eq;
  return s;
}

/** Kuşanılmış item'i aynı kahramanın başka yuvasına taşır; hedef doluysa yer değiştirir (sefer `moveEquipped` ile aynı kural). */
export function moveEquippedRun(run: EndlessRun, heroId: string, from: SlotId, to: SlotId, cfg: EndlessConfig = ENDLESS): EndlessRun {
  lockCheck(run);
  const hero = heroOf(run, heroId);
  if (!hero) throw new Error(`Unknown hero: ${heroId}`);
  if (runHeroFallen(hero)) throw new Error(FALLEN_GEAR_MSG);
  const plan = planMoveEquipped(hero.class, hero.equipment, from, to);
  if ('error' in plan) throw new Error(plan.error);
  if (bagOf(run).length + plan.toBag.length > endlessBagSize(cfg)) throw new Error('Bag is full');
  const s = clone(run);
  const h = heroOf(s, heroId)!;
  const eq = { ...plan.equipment } as Record<string, ItemInstance | null | undefined>;
  for (const k of Object.keys(eq)) if (!eq[k]) delete eq[k];
  h.equipment = eq as typeof h.equipment;
  s.bag = [...bagOf(s), ...plan.toBag];
  return s;
}

/** Torbadaki item'i atar (kalıcı). */
export function discardFromBag(run: EndlessRun, uid: string): EndlessRun {
  lockCheck(run);
  if (!bagOf(run).some((i) => i.uid === uid)) throw new Error(`Item not in the bag: ${uid}`);
  const s = clone(run);
  s.bag = bagOf(s).filter((i) => i.uid !== uid);
  return s;
}

/** "Equip best" (seferle aynı seçici `bestMoves`; primary bonusunu kapatan item seçilmez). Varsayılan: tüm takım, sırayla. */
export function equipBestRun(run: EndlessRun, heroIds?: string[]): EndlessRun {
  lockCheck(run);
  let s = run;
  for (const id of heroIds ?? run.heroes.map((h) => h.id)) {
    const h = heroOf(s, id);
    if (!h || runHeroFallen(h)) continue; // düşmüş kahramanın ekipmanı değişmez (arayüz ve sim aynı; Ömer 2026-10-18)
    for (const m of bestMoves({ class: h.class, equipment: { ...emptyEquipment(), ...h.equipment }, level: h.level ?? 1 }, bagOf(s))) {
      try {
        s = equipFromBag(s, id, m.uid, m.slot);
      } catch {
        /* torba dolu (ikinci el çıkamıyor): bu değişim atlanır */
      }
    }
  }
  return s;
}

/** Yaraları siler (YERİNDE; Endless dinlenme karşılığı, carry.clearWounds): yalnızca yaşayanlar (ceset dinlenmeyle kalkmaz, yarası kalır). */
export function clearRunWounds(s: EndlessRun): void {
  for (const h of s.heroes) if (h.hpRatio > 0) delete h.wounds;
}

/** Kahramanın 7 yuvalı tam ekipmanı (Gear ekranı / stat paneli; boş yuva null). */
export const fullEquipment = (h: EndlessHero) => ({ ...emptyEquipment(), ...h.equipment });


/**
 * Valor ile savaş dışında diriltme (Ömer 2026-10-13): kamp / ödül / tüccar / kalıntı ekranında (yarım savaş yokken), düşmüş kahraman outsideCost
 * Valor'la revive.hpRatio can ve aynı oranda MP ile kalkar. Engel varsa nedeni (yoksa null).
 */
export function valorReviveBlocked(run: EndlessRun, heroId: string): string | null {
  if (run.phase === 'over') return 'The run is over';
  if (run.suspended) return 'Finish the battle first';
  const h = heroOf(run, heroId);
  if (!h || h.hpRatio > 0) return 'This hero has not fallen';
  if (!canReviveOutside(valorRules, run.valor ?? 0)) return `Needs ${valorRules.revive.outsideCost} Valor (you have ${run.valor ?? 0})`;
  return null;
}

export function reviveWithValor(run: EndlessRun, heroId: string, cfg: EndlessConfig = ENDLESS): EndlessRun {
  if (valorReviveBlocked(run, heroId)) return run;
  const s = clone(run);
  const h = heroOf(s, heroId)!;
  s.valor = addValor(valorRules, (s.valor ?? 0) - valorRules.revive.outsideCost, 0);
  const r = clamp01(valorRules.revive.hpRatio);
  h.hpRatio = r;
  const w = healWounds(woundCount(h), valorClearWounds()); // Valor 1 yara siler (Ömer 2026-10-20)
  if (w > 0) h.wounds = w;
  else delete h.wounds;
  if (r < 1 && cfg.carry.mp !== 'full') h.carry = { mpRatio: Math.round(clamp01(valorRules.revive.mpRatio) * 1000) / 1000 };
  else delete h.carry;
  return s;
}

/** Oyuncu vekili (sim): Valor yettikçe düşmüşleri savaş dışında diriltir (kahraman sırasıyla). */
export function autoValorRevive(run: EndlessRun, cfg: EndlessConfig = ENDLESS): EndlessRun {
  let s = run;
  for (const h of run.heroes) if (!valorReviveBlocked(s, h.id)) s = reviveWithValor(s, h.id, cfg);
  return s;
}

/** Item kartının seçenekleri (ilk = kartın kendisi, sonra alts). Item kartı değilse boş. */
export function itemOptions(card: RewardCard): Array<{ itemId: string; heroId: string; rolls?: ItemRolls }> {
  if (card.kind !== 'item') return [];
  return [{ itemId: card.itemId, heroId: card.heroId, ...(card.rolls ? { rolls: card.rolls } : {}) }, ...(Array.isArray(card.alts) ? card.alts : [])];
}

/** Kartı seç (yalnızca 'reward' aşamasında). Çok seçenekli item kartında `option` = alınacak item (0..n-1; karar 364: 3 seçenek). */
export function chooseReward(run: EndlessRun, index: number, cfg: EndlessConfig = ENDLESS, catalog: ItemDef[] = ITEMS.items, option = 0): EndlessRun {
  let card = run.phase === 'reward' ? run.offer?.[index] : undefined;
  if (!card) return run;
  if (card.kind === 'item' && option > 0) {
    const o = itemOptions(card)[option];
    if (!o) return run;
    card = { kind: 'item', ...o };
  }
  const s = clone(run);
  if (card.kind === 'gold') s.gold += card.amount;
  // Şifa / Feast cesetleri kaldırmaz (yalnızca Revive kartı)
  else if (card.kind === 'heal') {
    for (const h of s.heroes) h.hpRatio = h.hpRatio > 0 ? clamp01(h.hpRatio + card.ratio) : 0;
    if (cfg.carry.clearWounds?.includes('heal')) clearRunWounds(s);
  } else if (card.kind === 'xp') {
    // Ayaktaki herkes (yaralı kalkanlar dahil); ceset almaz (VARSAYIM open-questions 370)
    for (const h of s.heroes) {
      const xp = lessonXp(h, card.ratio);
      if (xp > 0) giveXp(s, h, xp);
    }
  } else if (card.kind === 'feast') {
    for (const h of s.heroes) if (h.hpRatio > 0) h.hpRatio = 1;
    if (cfg.carry.clearWounds?.includes('feast')) clearRunWounds(s); // Endless'ın kasaba dinlenmesi karşılığı (VARSAYIM 369)
    s.blessing = { hpMult: card.hpMult, waves: card.waves };
  } else if (card.kind === 'revive') {
    const h = heroOf(s, card.heroId);
    if (!h || h.hpRatio > 0) return run;
    h.hpRatio = clamp01(card.ratio);
    if (h.hpRatio < 1 && cfg.carry.mp !== 'full') h.carry = { mpRatio: Math.round(clamp01(card.ratio) * 1000) / 1000 };
    else delete h.carry;
  }
  else if (!addToBag(s, card.itemId, catalog, cfg, card.rolls).ok) return run; // item torbaya (Gear ekranında takılır); torba doluysa seçilemez
  return afterReward(s, cfg, catalog);
}

/** Dükkândan satın al: yeterli altın ve torbada yer varsa item torbaya girer, satır 'sold' olur. */
export function buyItem(run: EndlessRun, index: number, catalog: ItemDef[] = ITEMS.items, cfg: EndlessConfig = ENDLESS): EndlessRun {
  const e = run.phase === 'shop' ? run.shop?.[index] : undefined;
  if (!e || e.sold || run.gold < e.price || bagOf(run).length >= endlessBagSize(cfg)) return run;
  const s = clone(run);
  if (!addToBag(s, e.itemId, catalog, cfg, e.rolls).ok) return run;
  s.gold -= e.price;
  s.shop![index]!.sold = true;
  return s;
}

/** Tüccardan ayrıl: stok, yenileme sayacı ve bu ziyaretin geri alım listesi silinir. */
export function leaveShop(run: EndlessRun): EndlessRun {
  if (run.phase !== 'shop') return run;
  const s: EndlessRun = { ...clone(run), phase: 'ready' };
  delete s.shop;
  delete s.shopRerolls;
  delete s.buyback;
  return s;
}

/** Kartın / dükkân satırının yerine geçeceği item (arayüz: "replaces Turnshoes"). */
export function replacedItem(run: EndlessRun, heroId: string, itemId: string, catalog: ItemDef[] = ITEMS.items): ItemDef | undefined {
  const h = heroOf(run, heroId);
  const d = defIn(catalog, itemId);
  const cur = h && d ? h.equipment[itemDef(d.id) ? defaultEquipSlot(h.equipment, d) : d.slot] : null;
  return cur ? defIn(catalog, cur.id) : undefined;
}

// ------------------------------------------------------------ skor

export function scoreOf(run: EndlessRun, date = new Date().toISOString()): ScoreEntry {
  return { wave: run.wave, cleared: run.stats.cleared, turns: run.stats.turns, kills: run.stats.kills, classes: run.heroes.map((h) => h.class), gearScore: gearScore(run), date };
}

/** Skor sırası: daha çok temizlenen dalga önde; eşitse daha az tur, sonra daha erken tarih. */
export function compareScores(a: ScoreEntry, b: ScoreEntry): number {
  return b.cleared - a.cleared || a.turns - b.turns || a.date.localeCompare(b.date);
}

/** Listeye ekler, sıralar, ilk N'i tutar. Dönen: yeni liste + eklenenin sırası (listeye giremediyse -1). */
export function addScore(list: ScoreEntry[], entry: ScoreEntry, cfg: EndlessConfig = ENDLESS): { list: ScoreEntry[]; rank: number } {
  const all = [...list, entry].sort(compareScores).slice(0, Math.max(1, cfg.highScores));
  return { list: all, rank: all.indexOf(entry) };
}

export const waveLabel = (kind: WaveKind): string => (kind === 'boss' ? 'Boss wave' : kind === 'elite' ? 'Elite wave' : 'Wave');

/**
 * Önizleme / debug (madde 296): torbada ya da takılı olmayan tüm Legendary'leri torbaya koyar (koşu seed'iyle zarlı). Torba sınırı uygulanmaz
 * (yalnızca test aracı; Legendary'ler Endless ödül / tüccarında yok). ?legendary=1, debug > Endless > Give all Legendaries.
 */
export function grantLegendariesRun(run: EndlessRun): EndlessRun {
  const s = clone(run);
  const have = new Set([...bagOf(s).map((i) => i.id), ...s.heroes.flatMap((h) => Object.values(h.equipment).map((i) => i?.id))]);
  const bag = (s.bag ??= []);
  for (const d of ITEMS.items) {
    if (d.rarity !== 'legendary' || have.has(d.id)) continue;
    const uid = `e${s.nextItem}`;
    s.nextItem += 1;
    bag.push({ uid, id: d.id, rolls: rollItem(d, rngFor(s.seed, 'roll', uid)) });
  }
  return s;
}
