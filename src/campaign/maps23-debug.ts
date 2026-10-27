// Harita 2-3 test kısayolları (saf; maps-2-3.md 9.1-9.2, Adım 1): debug > Campaign > "Maps 2-3 (test)" ve testler kullanır.
// Yeni kural yok: hepsi var olan debugTeleport / autoResolve / continueToMap / debugSetLevel / equipBest yollarının birleşimi.
// Harita 2'ye geçiş `nextMapFor`'a bağlıdır: çağıran önce bayrağı açar (setMapOverride('drowned-reach', true)).
import { getMap, WAYSHRINES } from './data';
import { finalNode } from './graph';
import { grantLoot } from './loot';
import { nodeLevel } from './power';
import { activeHeroes, autoResolve, clone, continueToMap, debugTeleport, moveTo, newCampaign, nextMapFor, nextStep, pathTo } from './state';
import { equipBest } from './gear';
import { autoTreeAll } from './tree';
import { autoAllocateAll, debugSetLevel } from './xp';
import type { CampaignState } from './types';

export const DROWNED_REACH = 'drowned-reach';

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
  for (let i = 0; i < route.length - 1; i++) {
    t = settle(t);
    t = moveTo(t, route[i + 1]!);
  }
  return kitOut(t, nodeLevel(DROWNED_REACH, target.id), 2);
}

/**
 * Debug "Jump to Wayshrine / Salvage Dive" (A1 / B1, open-questions 428): bölge atlamasıyla aynı yürüyüş, hedef düğüme kadar (cep dahil);
 * takım hedefin seviyesinde, iyileşmiş. Hedefin adımları baştan bekler (sınav / korunan hazine savaşı).
 */
export function debugJumpNode(s: CampaignState, nodeId: string): CampaignState {
  const map = getMap(DROWNED_REACH);
  if (!map.nodes.some((n) => n.id === nodeId)) throw new Error(`No stop ${nodeId}`);
  let t = s.mapId === DROWNED_REACH ? s : debugJumpDrownedReach(s);
  if (t.at !== map.start || t.path.length > 1) t = debugJumpDrownedReach(t);
  const route = pathTo(map, nodeId);
  for (let i = 0; i < route.length - 1; i++) {
    t = settle(t);
    t = moveTo(t, route[i + 1]!);
  }
  return kitOut(t, nodeLevel(DROWNED_REACH, nodeId), 2);
}

/** Debug: tüm Wayshrine nimetleri (`on`) ya da hiçbiri. */
export function debugSetBoons(s: CampaignState, on: boolean): CampaignState {
  const t = clone(s);
  if (on) t.boons = Object.keys(WAYSHRINES);
  else delete t.boons;
  return t;
}
