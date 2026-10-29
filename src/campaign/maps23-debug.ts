// Harita 2-3 test kısayolları (saf; maps-2-3.md 9.1-9.2, Adım 1): debug > Campaign > "Maps 2-3 (test)" ve testler kullanır.
// Yeni kural yok: hepsi var olan debugTeleport / autoResolve / continueToMap / debugSetLevel / equipBest yollarının birleşimi.
// Harita 2'ye geçiş `nextMapFor`'a bağlıdır: çağıran önce bayrağı açar (setMapOverride('drowned-reach', true)).
import { EVENTS, getMap, WAYSHRINES } from './data';
import { finalNode } from './graph';
import { grantLoot } from './loot';
import { nodeLevel } from './power';
import { activeHeroes, autoResolve, clone, continueToMap, debugEnsureClass, debugTeleport, moveTo, newCampaign, nextMapFor, nextStep, pathTo } from './state';
import { questDef } from './quests';
import { equipBest } from './gear';
import { autoTreeAll } from './tree';
import { autoAllocateAll, debugSetLevel } from './xp';
import { caravelDef, withReachForRoute, withReachOpen } from './reach';
import type { CampaignState } from './types';

export const DROWNED_REACH = 'drowned-reach';
/** Harita 3 (maps-2-3.md 4; iskelet, campaign.json > mapFlags ile kapalı). */
export const HOLLOW_CROWN = 'hollow-crown';

/** Bulunulan düğümün kendi adımlarını (seed'li ilk seçenekle) bitirir; `move` / `complete` gelince durur. */
function settle(s: CampaignState): CampaignState {
  let t = s;
  for (let i = 0; i < 40; i++) {
    const step = nextStep(t);
    if (step.kind === 'move' || step.kind === 'complete') return t;
    const n = autoResolve(t, step);
    if (n === t) return t;
    t = n;
  }
  return t;
}

/** Ekranda bekleyecek kart / şeritleri atar (debug kısayolu sonrası temiz harita). */
function tidy(s: CampaignState): CampaignState {
  const t = clone(s);
  delete t.pendingLoot;
  delete t.levelUps;
  delete t.formationDue;
  delete t.pendingHandover;
  return t;
}

/** Herkes ayakta, tam can, yarasız (yalnız debug). */
function fullHeal(s: CampaignState): CampaignState {
  const t = clone(s);
  for (const h of t.roster) {
    h.alive = true;
    h.hpRatio = 1;
    if (h.wounds) h.wounds = 0;
  }
  return t;
}

/**
 * Debug "Finish Map 1": Valdoria seferini (aynı seed / mod / zorluk / yuva) Castle Morvane'a ışınlar ve boss'u kazanılmış sayar.
 * Sonuç `complete` adımındadır; Harita 2 açıksa harita sahnesi "Continue to The Drowned Reach" gösterir.
 */
export function debugFinishMap1(s: CampaignState): CampaignState {
  const base = s.mapId === 'valdoria' ? s : newCampaign({ mode: s.mode, seed: s.seed, difficulty: s.difficulty, slot: s.slot, campaignId: s.campaignId });
  const fin = finalNode(getMap('valdoria'));
  return tidy(settle(debugTeleport(base, fin)));
}

/** Takımı `level`'a çıkarır, puanları dağıtır, birkaç elit ganimeti verip en iyisini takar, herkesi iyileştirir. */
function kitOut(s: CampaignState, level: number, lootRolls = 3): CampaignState {
  let t = debugSetLevel(s, level);
  t = autoAllocateAll(t);
  t = autoTreeAll(t);
  const u = clone(t);
  for (let i = 0; i < lootRolls; i++) grantLoot(u, `${u.at}:debug${i}`, 'elite', activeHeroes(u));
  t = equipBest(u);
  return tidy(fullHeal(t));
}

/**
 * Debug "Jump to The Drowned Reach": Harita 1'i bitirir (4 kişilik takım: Ashford bölüğü + Valdren gönüllüsü), Harita 2'nin başına geçer,
 * takımı L10'a çıkarır, makul ekipman verir. Bayrak kapalıysa hata (nextMapFor null).
 */
export function debugJumpDrownedReach(s: CampaignState): CampaignState {
  const done = debugFinishMap1(s);
  if (nextMapFor(done) !== DROWNED_REACH) throw new Error('The Drowned Reach is not enabled');
  const t = continueToMap(done, DROWNED_REACH);
  return kitOut(t, nodeLevel(DROWNED_REACH, getMap(DROWNED_REACH).start));
}

/**
 * Debug "Finish Map 2": Harita 2'nin başından (gerekirse Harita 1 bitirilip geçilir) final düğümüne (Two Crowns) kadar yürür; yoldaki her düğüm
 * seed'li ilk seçenekle çözülür (bosslar kazanılmış). Sonuç `complete` adımındadır; Harita 3 açıksa harita sahnesi "Continue to The Hollow Crown" gösterir.
 */
export function debugFinishMap2(s: CampaignState): CampaignState {
  const map = getMap(DROWNED_REACH);
  if (s.mapId === DROWNED_REACH && nextStep(s).kind === 'complete') return s; // zaten bitmiş
  let t = s.mapId === DROWNED_REACH && t0(s, map.start) ? s : debugJumpDrownedReach(s);
  const route = pathTo(map, finalNode(map));
  t = withReachForRoute(map, t, route);
  for (let i = 0; i < route.length - 1; i++) {
    t = settle(t);
    t = moveTo(t, route[i + 1]!);
  }
  return tidy(settle(t));
}

/** Takım haritanın başında, henüz yürümemiş mi. */
const t0 = (s: CampaignState, start: string): boolean => s.at === start && s.path.length <= 1;

/**
 * Debug "Jump to The Hollow Crown": Harita 2'yi bitirir (debugFinishMap2), Harita 3'ün başına geçer, takımı ilk durağın seviyesine (L20) çıkarır,
 * makul ekipman verir. Bayrak kapalıysa hata (nextMapFor null).
 */
export function debugJumpHollowCrown(s: CampaignState): CampaignState {
  const done = debugFinishMap2(s);
  if (nextMapFor(done) !== HOLLOW_CROWN) throw new Error('The Hollow Crown is not enabled');
  const t = continueToMap(done, HOLLOW_CROWN);
  return kitOut(t, nodeLevel(HOLLOW_CROWN, getMap(HOLLOW_CROWN).start));
}

/**
 * Debug "Jump to region": Harita 2 başından bölgenin ilk düğümüne kadar yürür (her düğüm seed'li ilk seçenekle çözülür, kasabalarda gönüllü
 * alınır), takımı hedef düğümün seviyesine çıkarır ve iyileştirir. Hedef düğümün adımları baştan bekler.
 */
export function debugJumpRegion(s: CampaignState, regionId: string): CampaignState {
  const map = getMap(DROWNED_REACH);
  const target = map.nodes.find((n) => n.region === regionId && !n.optional && !n.spoke);
  if (!target) throw new Error(`No region ${regionId}`);
  let t = s.mapId === DROWNED_REACH ? s : debugJumpDrownedReach(s);
  if (t.at !== map.start || t.path.length > 1) t = debugJumpDrownedReach(t);
  const route = pathTo(map, target.id);
  t = withReachForRoute(map, t, route);
  for (let i = 0; i < route.length - 1; i++) {
    t = settle(t);
    t = moveTo(t, route[i + 1]!);
  }
  return kitOut(t, nodeLevel(DROWNED_REACH, target.id), 2);
}

/**
 * Debug "Jump to stop" (B5 The Fighting Pit: Saltmere; A4 Hero Oath: Saltspray Shrine): Harita 2 başından düğüme kadar yürür (yoldakiler seed'li
 * ilk seçenekle çözülür), takımı düğümün seviyesine çıkarır ve iyileştirir. Hedef düğümün adımları baştan bekler.
 * Aynı fonksiyon: Debug "Jump to Wayshrine / Salvage Dive" (A1 / B1, open-questions 428): bölge atlamasıyla aynı yürüyüş, hedef düğüme kadar (cep dahil);
 * takım hedefin seviyesinde, iyileşmiş. Hedefin adımları baştan bekler (sınav / korunan hazine savaşı).
 */
export function debugJumpNode(s: CampaignState, nodeId: string, classId?: string): CampaignState {
  const map = getMap(DROWNED_REACH);
  if (!map.nodes.some((n) => n.id === nodeId)) throw new Error(`No stop ${nodeId}`);
  let t = s.mapId === DROWNED_REACH ? s : debugJumpDrownedReach(s);
  if (t.at !== map.start || t.path.length > 1) t = debugJumpDrownedReach(t);
  if (classId) t = debugEnsureClass(t, classId); // A5 görev atlaması: görevin sınıfı takımda olsun (düğüm / seçenek görünsün)
  const route = pathTo(map, nodeId);
  t = withReachForRoute(map, t, route);
  for (let i = 0; i < route.length - 1; i++) {
    t = settle(t);
    t = moveTo(t, route[i + 1]!);
  }
  return kitOut(t, nodeLevel(DROWNED_REACH, nodeId), 2);
}

/**
 * Debug "Jump to quest" (A5 Personal Quests, open-questions 431): görevin sınıfı takımda yoksa bir kahramanın yerine girer (çıkan yedeğe), sonra
 * görevin düğümüne kadar yürür (debugJumpNode). Hedefin adımları baştan bekler (cep: görev olayı / savaşı; Paladin: Monk's Isle olayı).
 */
export function debugJumpQuest(s: CampaignState, questId: string): CampaignState {
  const q = questDef(questId);
  if (!q) throw new Error(`No quest ${questId}`);
  return debugJumpNode(s, q.node, q.class);
}

/** Debug: tüm Wayshrine nimetleri (`on`) ya da hiçbiri. */
export function debugSetBoons(s: CampaignState, on: boolean): CampaignState {
  const t = clone(s);
  if (on) t.boons = Object.keys(WAYSHRINES);
  else delete t.boons;
  return t;
}

/** Debug (M-L): tarafı ayarlar (null = seçilmemiş). Kural yok: yalnız `faction` alanı. */
export function debugSetFaction(s: CampaignState, f: 'order' | 'guild' | null): CampaignState {
  const t = clone(s);
  if (f) t.faction = f;
  else delete t.faction;
  return t;
}

/** Debug (M-J): deniz yollarını açar (Charter a ship ile aynı; Caravel dolaşmaya başlar) ya da kapatır. */
export function debugSetSea(s: CampaignState, on: boolean): CampaignState {
  const t = clone(s);
  if (on) {
    t.sea = true;
    if (caravelDef(getMap(t.mapId))) t.caravel ??= { i: 0 };
  } else {
    delete t.sea;
    delete t.caravel;
  }
  return t;
}

/** Debug (M-K): Caravel'i rotasında bir durak ilerletir (karşılaşma bekliyorsa sıfırlar). */
export function debugStepCaravel(s: CampaignState): CampaignState {
  const d = caravelDef(getMap(s.mapId));
  if (!d) return s;
  const t = clone(s);
  t.caravel = { i: ((t.caravel?.i ?? 0) + 1) % d.route.length };
  return t;
}

/** Debug (M-K): Caravel'i yenilmiş say (Gallows Cove kapısı açılır). */
export function debugBeatCaravel(s: CampaignState): CampaignState {
  return withReachOpen(getMap(s.mapId), clone(s));
}

/** Debug (M-M): fener yakıldı / söndü. */
export function debugSetLit(s: CampaignState, on: boolean): CampaignState {
  const t = clone(s);
  if (on) t.lit = true;
  else delete t.lit;
  return t;
}

// ---------------------------------------------------------------- Harita 3 (open-questions 454 a / b / d)

/**
 * Debug "Jump to <Harita 3 durağı>": Harita 3'ün başından hedefe kadar yürür (debugJumpNode gibi; her düğüm seed'li ilk seçenekle çözülür),
 * takımı hedefin seviyesine çıkarır, iyileştirir. Yoldaki Hall of Oaths / The White Dark seçimleri silinir (temiz deneme; debug ayarlar).
 */
export function debugJumpHollowNode(s: CampaignState, nodeId: string): CampaignState {
  const map = getMap(HOLLOW_CROWN);
  if (!map.nodes.some((n) => n.id === nodeId)) throw new Error(`No stop ${nodeId}`);
  let t = s.mapId === HOLLOW_CROWN && t0(s, map.start) ? s : debugJumpHollowCrown(s);
  const route = pathTo(map, nodeId);
  for (let i = 0; i < route.length - 1; i++) {
    t = settle(t);
    t = moveTo(t, route[i + 1]!);
  }
  const u = clone(t);
  delete u.stoneOath;
  delete u.pendingStatus;
  return kitOut(u, nodeLevel(HOLLOW_CROWN, nodeId), 2);
}

/** Debug (454 a): Stone Oath'u ayarlar (null = seçilmemiş). Kural yok: yalnız `stoneOath` alanı. */
export function debugSetStoneOath(s: CampaignState, v: 'sworn' | 'refused' | null): CampaignState {
  const t = clone(s);
  if (v) t.stoneOath = v;
  else delete t.stoneOath;
  return t;
}

/** Debug (454 d): bir sonraki savaş Chilled başlar (The White Dark "Wait it out" ile aynı; veriden) ya da bekleyen durum silinir. */
export function debugSetWhiteDarkChill(s: CampaignState, on: boolean): CampaignState {
  const t = clone(s);
  const c = EVENTS['hc_white_dark']?.choices?.find((x) => x.nextBattleStatus)?.nextBattleStatus;
  if (on && c) t.pendingStatus = { status: c.status, turns: c.turns };
  else delete t.pendingStatus;
  return t;
}

/**
 * Debug (454 a, A): ilk mühürlü cüce mezarına (veride `oathSealed`, sıradaki ilk düğüm) yürür, koruma savaşını kazanılmış sayar ve Stone Oath'u
 * `oath` yapar (varsayılan yeminli): hazine adımı bekler (yeminliyken mühür penceresi, değilse olağan sandık).
 */
export function debugSealedTomb(s: CampaignState, oath: 'sworn' | 'refused' | null = 'sworn'): CampaignState {
  const tomb = getMap(HOLLOW_CROWN).nodes.find((n) => n.oathSealed);
  if (!tomb) throw new Error('No sealed tomb on Map 3');
  let t = debugJumpHollowNode(s, tomb.id);
  for (let i = 0; i < 20; i++) {
    const step = nextStep(t);
    if (step.kind === 'treasure' || step.kind === 'move' || step.kind === 'complete') break;
    const n = autoResolve(t, step);
    if (n === t) break;
    t = n;
  }
  return debugSetStoneOath(tidy(t), oath);
}
