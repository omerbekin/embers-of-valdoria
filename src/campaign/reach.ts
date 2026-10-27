// Harita 2 deniz kuralları (saf; docs/design/campaign/maps-2-3.md 5): M-J deniz yolları + crossing, M-K The Black Caravel (gezici elit),
// M-L Faction (Order / Guild), M-M Lantern Rock feneri. Kural yalnızca veride `reach` / `sea` / `crossing` / `factionEncounter` olan haritada
// çalışır (Harita 1 etkilenmez). Sayılar data/campaign/drowned-reach.json > reach. Durum alanları isteğe bağlı (kayıt sürümü 12 kalır):
// CampaignState.faction / sea / lit / caravel. state.ts bu yardımcıları çağırır; bu dosya state.ts'i içe aktarmaz (döngü yok).
import { edgeEither, neighbors } from './graph';
import type { CampaignMap, CampaignState, Faction, MapNode } from './types';
import type { EventChoice, EventDef } from './data';

type ReachState = Pick<CampaignState, 'sea' | 'lit' | 'caravel' | 'faction' | 'at'> & { visited?: string[]; path?: string[] };

const visitedOf = (s: ReachState): string[] => (Array.isArray(s.visited) ? s.visited : (s.path ?? []));

// ---------------------------------------------------------------- M-J deniz yolları

/** Haritada deniz yolu var mı? */
export const hasSea = (map: CampaignMap): boolean => map.edges.some((e) => e.sea);

const landCache = new WeakMap<CampaignMap, Set<string>>();

/** Kara: başlangıçtan deniz yolu geçmeden (iki yönlü) ulaşılan düğümler. */
export function landNodes(map: CampaignMap): Set<string> {
  let set = landCache.get(map);
  if (set) return set;
  set = new Set([map.start]);
  const queue = [map.start];
  while (queue.length) {
    const id = queue.shift()!;
    for (const nb of neighbors(map, id)) {
      if (set.has(nb) || edgeEither(map, id, nb)?.sea) continue;
      set.add(nb);
      queue.push(nb);
    }
  }
  landCache.set(map, set);
  return set;
}

/** Ada düğümü mü (yalnız deniz yoluyla ulaşılır)? */
export const isIsland = (map: CampaignMap, id: string): boolean => hasSea(map) && !landNodes(map).has(id);

/**
 * Deniz yolları açık mı: "Charter a ship" seçildiyse (`sea`) ya da takım zaten bir adaya ayak bastıysa (bu kuraldan önceki kayıt / debug ışınlama:
 * adada kalan takım mahsur kalmasın). Deniz yolu olmayan haritada her zaman açık.
 */
export function seaOpen(map: CampaignMap, s: ReachState): boolean {
  if (!hasSea(map) || s.sea) return true;
  return visitedOf(s).some((id) => isIsland(map, id)) || isIsland(map, s.at);
}

/** Bu düğüme deniz yolu kilidi yüzünden gidilemiyor mu ("Needs a ship" rozeti)? */
export const needsShip = (map: CampaignMap, s: ReachState, id: string): boolean => isIsland(map, id) && !seaOpen(map, s);

// ---------------------------------------------------------------- M-K The Black Caravel

export const caravelDef = (map: CampaignMap) => map.reach?.caravel;

/** Caravel yenildi mi (ya da kapısı zaten açılmış: kapı düğümüne daha önce varılmış eski kayıt)? */
export function caravelBeaten(map: CampaignMap, s: ReachState): boolean {
  const d = caravelDef(map);
  if (!d) return true;
  return !!s.caravel?.beaten || visitedOf(s).includes(d.gate) || s.at === d.gate;
}

/** Caravel dolaşıyor mu (deniz yolları açık ve yenilmedi)? */
export const caravelActive = (map: CampaignMap, s: ReachState): boolean => !!caravelDef(map)?.route.length && seaOpen(map, s) && !caravelBeaten(map, s);

/** Caravel'in şu anki düğümü (dolaşmıyorsa null). */
export function caravelAt(map: CampaignMap, s: ReachState): string | null {
  const d = caravelDef(map);
  if (!d || !caravelActive(map, s)) return null;
  const i = s.caravel?.i ?? 0;
  return d.route[((i % d.route.length) + d.route.length) % d.route.length] ?? null;
}

/** Bulunulan düğümde Caravel'in elit savaşı bekliyor mu (oyuncu Caravel'in düğümüne girdi)? */
export function caravelPending(map: CampaignMap, s: ReachState): boolean {
  return !!s.caravel?.met && s.caravel.met === s.at && caravelAt(map, s) === s.at;
}

/** Kapı düğümü (Gallows Cove) açık mı? Kapı olmayan düğüm her zaman açık. */
export const gateOpen = (map: CampaignMap, s: ReachState, id: string): boolean => caravelDef(map)?.gate !== id || caravelBeaten(map, s);

/**
 * Oyuncu hamlesi (state.ts > moveTo, YERİNDE): Caravel dolaşıyorsa ve oyuncu onun düğümüne girdiyse karşılaşma (`met`; Caravel yerinde kalır),
 * yoksa Caravel rotasında bir düğüm ilerler. Ara düğümlerden geçen yolculuk tek hamledir (ara düğümler tetiklenmez).
 */
export function caravelAfterMove(map: CampaignMap, t: CampaignState, to: string): void {
  if (!caravelActive(map, t)) return;
  const d = caravelDef(map)!;
  const i = t.caravel?.i ?? 0;
  if (caravelAt(map, t) === to) t.caravel = { i, met: to };
  else t.caravel = { i: (i + 1) % d.route.length };
}

/** Caravel yenildi (YERİNDE). */
export function beatCaravel(t: CampaignState): void {
  t.caravel = { i: t.caravel?.i ?? 0, beaten: true };
}

/** Kenardan geçilebilir mi: deniz yolu kapalıysa adaya, Caravel yenilmeden kapı düğümüne gidilmez. */
export function passable(map: CampaignMap, s: ReachState, from: string, to: string): boolean {
  if (edgeEither(map, from, to)?.sea && !seaOpen(map, s)) return false;
  return gateOpen(map, s, to);
}

/**
 * Deniz yolları açık + Caravel yenilmiş durum (YENİ nesne): simler (olay seçmeyen sefer simi Harita 2'de eski davranışla, kilitsiz oynasın)
 * ve debug ışınlaması için. Deniz yolu olmayan haritada durum aynen döner.
 */
export function withReachOpen<T extends CampaignState>(map: CampaignMap, s: T): T {
  if (!hasSea(map) && !caravelDef(map)) return s;
  return { ...s, ...(hasSea(map) ? { sea: true as const } : {}), ...(caravelDef(map) ? { caravel: { i: s.caravel?.i ?? 0, beaten: true as const } } : {}) };
}

/** Yürüyüş deniz yolundan ya da Caravel kapısından geçiyorsa kilitler açılmış durum (debug ışınlama / atlama takılmasın), yoksa aynı durum. */
export function withReachForRoute<T extends CampaignState>(map: CampaignMap, s: T, route: string[]): T {
  const sea = route.some((id, i) => i > 0 && !!edgeEither(map, route[i - 1]!, id)?.sea);
  const gate = route.includes(caravelDef(map)?.gate ?? '');
  return sea || gate ? withReachOpen(map, s) : s;
}

/** Düğüm kilidi (harita rozeti / bilgi kartı): 'ship' = deniz yolu kapalı, 'caravel' = kapı Caravel yenilmeden kapalı. */
export function nodeLock(map: CampaignMap, s: ReachState, id: string): 'ship' | 'caravel' | null {
  if (needsShip(map, s, id)) return 'ship';
  if (!gateOpen(map, s, id)) return 'caravel';
  return null;
}

/** Bu düğüme girilince oynanacak karşılaşma: Caravel oradaysa onun eliti, yoksa düğümünki (taraf seçimine göre). */
export function encounterAt(map: CampaignMap, s: ReachState, n: MapNode): string | undefined {
  const d = caravelDef(map);
  if (d && caravelAt(map, s) === n.id) return d.encounter;
  return nodeEncounter(n, s);
}

// ---------------------------------------------------------------- M-L Faction

/** Düğümün şu an oynanacak karşılaşması: seçilen tarafa göre (factionEncounter) ya da düğümün kendisi. */
export function nodeEncounter(n: MapNode, s: Pick<CampaignState, 'faction'>): string | undefined {
  return (s.faction && n.factionEncounter?.[s.faction]) || n.encounter;
}

/** Seçenek bu durumda görünür mü (needFaction)? */
export function choiceVisible(c: EventChoice, s?: Pick<CampaignState, 'faction'>): boolean {
  if (!c.needFaction) return true;
  const want = Array.isArray(c.needFaction) ? c.needFaction : [c.needFaction];
  return want.includes(s?.faction ?? 'none');
}

/** Tüccar stoğunda yuvanın ağırlığı (seçilen tarafa göre; yoksa 1). */
export function shopSlotWeight(map: CampaignMap, s: Pick<CampaignState, 'faction'>, slot: string): number {
  const w = s.faction ? map.reach?.faction?.shopWeights[s.faction]?.[slot] : undefined;
  return typeof w === 'number' && w > 0 ? w : 1;
}

export const FACTION_NAMES: Record<Faction, string> = { order: 'The Order of St. Brann', guild: 'The Harbor Guild' };

// ---------------------------------------------------------------- M-M Lighthouse

/** Görüş mesafesi: haritanın `visibility`'si + yakılmış fenerin eki. */
export function visionOf(map: CampaignMap, s: { lit?: unknown }): number {
  return map.visibility + (s.lit ? Math.max(0, map.reach?.lighthouse?.visibility ?? 0) : 0);
}

// ---------------------------------------------------------------- olayların yeniden açılması

/** Olay bitmiş olsa da yeniden açılmalı mı (EventDef.again şartı henüz sağlanmadı)? */
export function eventAgain(map: CampaignMap, s: ReachState, def: EventDef | undefined): boolean {
  if (def?.again === 'charter') return !seaOpen(map, s);
  if (def?.again === 'faction') return !s.faction;
  return false;
}
