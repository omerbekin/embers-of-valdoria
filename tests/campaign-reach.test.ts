// Harita 2 deniz ve taraf kuralları (maps-2-3.md 5; M-J deniz yolu + crossing, M-K Black Caravel, M-L Faction, M-M Lighthouse; open-questions 433).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DROWNED_REACH,
  ENCOUNTERS,
  autoResolve,
  battlePlan,
  campaignStock,
  caravelAt,
  caravelPending,
  chooseEvent,
  debugBeatCaravel,
  debugJumpNode,
  debugSetFaction,
  debugSetLit,
  debugSetSea,
  debugStepCaravel,
  debugTeleport,
  debugJumpDrownedReach,
  eventChoices,
  gateOpen,
  getMap,
  isCleared,
  moveOptions,
  moveTo,
  needsShip,
  newCampaign,
  nextStep,
  nodeEncounter,
  nodeVisibility,
  normalizeState,
  passable,
  seaOpen,
  setMapOverride,
  visionOf,
  type CampaignState,
} from '../src/campaign';
import { ITEMS } from '../src/progression/items';
import { choiceChips, resultChips } from '../src/ui/map-window-data';
import drEvents from '../data/campaign/drowned-reach-events.json';

beforeAll(() => setMapOverride(DROWNED_REACH, true));
afterAll(() => setMapOverride(DROWNED_REACH, null));

const map = getMap(DROWNED_REACH);
const node = (id: string) => map.nodes.find((n) => n.id === id)!;
const base = (): CampaignState => newCampaign({ mode: 'normal', seed: 7 });
let reachStart: CampaignState | null = null;
const start = (): CampaignState => (reachStart ??= debugJumpDrownedReach(base()));
const jumpTo = (id: string): CampaignState => debugJumpNode(start(), id);

/** Bulunulan düğümün bekleyen adımlarını (ilk seçenekle) bitirir. */
function settle(s: CampaignState): CampaignState {
  let t = s;
  for (let i = 0; i < 30; i++) {
    const k = nextStep(t).kind;
    if (k === 'move' || k === 'complete') return t;
    t = autoResolve(t);
  }
  return t;
}
const options = (s: CampaignState): string[] => {
  const st = moveOptions(s);
  return [...st.forward, ...st.back];
};

describe('M-J deniz yolları ve crossing düğümleri', () => {
  it('veri: crossing düğümleri güverte savaşı (blocked deck), deniz kenarları yalnız crossing düğümlerine dokunur', () => {
    const crossings = map.nodes.filter((n) => n.crossing).map((n) => n.id);
    expect(crossings.sort()).toEqual(['dr55', 'dr60', 'dr62', 'dr64']);
    for (const id of crossings) expect(ENCOUNTERS[node(id).encounter!]?.blocked, id).toBe('deck');
    for (const e of map.edges.filter((x) => x.sea)) expect(crossings.includes(e.from) || crossings.includes(e.to), `${e.from}-${e.to}`).toBe(true);
    expect(map.edges.filter((e) => e.sea).length).toBeGreaterThan(0);
  });

  it("Fisher's Landing'de gemi yokken adalara gidilemez (Needs a ship); Charter a ship sonrası açılır", () => {
    const at = settle(jumpTo('dr54'));
    expect(at.at).toBe('dr54');
    expect(seaOpen(map, at)).toBe(false);
    expect(needsShip(map, at, 'dr55')).toBe(true);
    expect(needsShip(map, at, 'dr54')).toBe(false);
    expect(options(at)).not.toContain('dr55');
    expect(options(at)).not.toContain('dr60');
    expect(passable(map, at, 'dr54', 'dr55')).toBe(false);
    expect(() => moveTo(at, 'dr55')).toThrow();
    const open = debugSetSea(at, true);
    expect(options(open)).toEqual(expect.arrayContaining(['dr55', 'dr60']));
    expect(needsShip(map, open, 'dr55')).toBe(false);
  });

  it('Ferry Office: taraf yok = 60 altın (Order da), Guild = bedava; seçince deniz açılır, Caravel dolaşmaya başlar; Not now yeniden açılır', () => {
    const ferry = jumpTo('dr38');
    expect(nextStep(ferry)).toMatchObject({ kind: 'event', event: 'dr_ferry_office' });
    expect(eventChoices('dr_ferry_office', ferry).map((c) => c.id)).toEqual(['charter_gold', 'later']);
    expect(eventChoices('dr_ferry_office', { faction: 'order' }).map((c) => c.id)).toEqual(['charter_gold', 'later']);
    expect(eventChoices('dr_ferry_office', { faction: 'guild' }).map((c) => c.id)).toEqual(['charter_favor', 'later']);
    const rich = { ...ferry, gold: 500 };
    const paid = chooseEvent(rich, 'charter_gold');
    expect(paid.gold).toBe(440);
    expect(paid.sea).toBe(true);
    expect(paid.caravel).toEqual({ i: 0 });
    const free = chooseEvent(debugSetFaction(rich, 'guild'), 'charter_favor');
    expect(free.gold).toBe(500);
    expect(free.sea).toBe(true);
    // Not now: Saltmere'ye dönüp geri gelince ofis yeniden sorar; kiralandıktan sonra sormaz
    const later = chooseEvent(rich, 'later');
    const back = moveTo(settle(moveTo(later, 'dr28')), 'dr38');
    expect(nextStep(back)).toMatchObject({ kind: 'event', event: 'dr_ferry_office' });
    const again = moveTo(settle(moveTo(paid, 'dr28')), 'dr38');
    expect(nextStep(again).kind).toBe('move');
  });
});

describe('M-K The Black Caravel', () => {
  const sailing = (): CampaignState => debugSetSea(settle(jumpTo('dr54')), true);

  it('deniz açılınca rotanın başında; oyuncunun her hamlesinde bir durak ilerler (rota döner)', () => {
    const s = sailing();
    const route = map.reach!.caravel!.route;
    expect(route).toEqual(['dr55', 'dr60', 'dr62', 'dr64']);
    expect(caravelAt(map, s)).toBe('dr55');
    const moved = moveTo(s, 'dr60'); // Caravel dr55'te, oyuncu dr60'a: karşılaşma yok, Caravel ilerler
    expect(caravelAt(map, moved)).toBe('dr60');
    expect(caravelPending(map, moved)).toBe(false); // Caravel oyuncunun üstüne gelince savaş açılmaz
    expect(nextStep(moved)).toMatchObject({ kind: 'battle', encounter: node('dr60').encounter });
    let t = s;
    for (let i = 0; i < route.length; i++) t = debugStepCaravel(t);
    expect(caravelAt(map, t)).toBe('dr55');
  });

  it("Caravel'in durağına girince elit savaşı (Marrow + eskortlar); kazanınca batar, durak temizlenir, Gallows Cove açılır", () => {
    const s = sailing();
    expect(gateOpen(map, s, 'dr66')).toBe(false);
    const met = moveTo(s, 'dr55');
    expect(caravelPending(map, met)).toBe(true);
    const step = nextStep(met);
    expect(step).toMatchObject({ kind: 'battle', encounter: map.reach!.caravel!.encounter, caravel: true });
    const plan = battlePlan(met);
    expect(plan.waves?.length ?? 0).toBeGreaterThan(0); // elit: ikinci dalga
    const won = autoResolve(met);
    expect(won.caravel?.beaten).toBe(true);
    expect(caravelAt(map, won)).toBeNull();
    expect(gateOpen(map, won, 'dr66')).toBe(true);
    expect(isCleared(won, 'dr55')).toBe(true);
    expect(nextStep(won).kind).toBe('move');
  });

  it('Caravel batmadan Gallows Cove kapısından geçilmez; debug Sink açar', () => {
    const s = debugSetSea(settle(jumpTo('dr54')), true);
    expect(passable(map, s, 'dr64', 'dr66')).toBe(false);
    const sunk = debugBeatCaravel(s);
    expect(passable(map, sunk, 'dr64', 'dr66')).toBe(true);
    expect(sunk.sea).toBe(true);
  });

  it("Fisher's Landing: Keeper's daughter Caravel'in rotasını söyler", () => {
    expect(JSON.stringify(drEvents)).toContain('the Sound, then the Narrows, then Open Water, then Storm Strait');
  });
});

describe('M-L Faction', () => {
  it('Guild Hall: Order / Guild / Not yet; seçim kalıcı (bir kez); Not yet meydana dönünce yeniden sorar', () => {
    const hall = jumpTo('dr31');
    expect(nextStep(hall)).toMatchObject({ kind: 'event', event: 'dr_guild_hall' });
    expect(eventChoices('dr_guild_hall', hall).map((c) => c.id)).toEqual(['order', 'guild', 'later']);
    const guild = chooseEvent(hall, 'guild');
    expect(guild.faction).toBe('guild');
    const back = moveTo(settle(moveTo(guild, 'dr28')), 'dr31');
    expect(nextStep(back).kind).toBe('move'); // taraf seçildi: yeniden sorulmaz
    const later = chooseEvent(hall, 'later');
    expect(later.faction).toBeUndefined();
    const again = moveTo(settle(moveTo(later, 'dr28')), 'dr31');
    expect(nextStep(again)).toMatchObject({ kind: 'event', event: 'dr_guild_hall' });
  });

  it('Harbor Fort eliti: taraf yok / Order = Bastion (dr_32), Guild = Inquisitor-Captain Vell', () => {
    const fort = node('dr32');
    expect(nodeEncounter(fort, {})).toBe('dr_32');
    expect(nodeEncounter(fort, { faction: 'order' })).toBe('dr_32');
    expect(nodeEncounter(fort, { faction: 'guild' })).toBe('dr_32_vell');
    const at = debugSetFaction(jumpTo('dr32'), 'guild');
    expect(nextStep(at)).toMatchObject({ kind: 'battle', encounter: 'dr_32_vell' });
    const plan = battlePlan(at);
    const names = [plan.units.enemies, ...(plan.waves ?? []).map((w) => w.units)].flatMap((u) => Object.values(u)).map((u) => (u as { displayName?: string }).displayName);
    expect(names).toContain('Inquisitor-Captain Vell');
  });

  it("Monk's Isle: taraf yok = ekmek, Order = dinlenme + relic (offhand hediye), Guild = 2 Oathsworn + 2 Censer Monk savaşı -> sandık", () => {
    // A5: Paladin görevi 'bell' tarafsız (görev süzgeci eventChoicesFor'da), her tarafta 'leave'den önce
    expect(eventChoices('dr_monks_isle', {}).map((c) => c.id)).toEqual(['bread', 'bell', 'leave']);
    expect(eventChoices('dr_monks_isle', { faction: 'order' }).map((c) => c.id)).toEqual(['order_rest', 'bell', 'leave']);
    expect(eventChoices('dr_monks_isle', { faction: 'guild' }).map((c) => c.id)).toEqual(['guild_fight', 'bell', 'leave']);
    const guard = ENCOUNTERS['dr_monks_guard']!;
    expect(guard.units.map((u) => u.class).sort()).toEqual(['inquisition_brother', 'inquisition_brother', 'salt_chaplain', 'salt_chaplain']); // Harita 2 Order sürümleri (open-questions 444)
    const isle = debugSetFaction(jumpTo('dr56'), 'order');
    expect(nextStep(isle)).toMatchObject({ kind: 'event', event: 'dr_monks_isle' });
    const hurt = { ...isle, roster: isle.roster.map((h) => ({ ...h, hpRatio: 0.4 })) };
    const rested = chooseEvent(hurt, 'order_rest');
    expect(rested.pendingLoot?.gift).toBe(true);
    const uid = rested.pendingLoot!.items[0];
    const inst = rested.inventory.find((i) => i.uid === uid);
    if (inst) expect(ITEMS.items.find((d) => d.id === inst.id)?.slot).toBe('offhand');
    expect(rested.roster.some((h) => h.hpRatio > 0.4)).toBe(true);
  });

  it('tüccar stoğu taraf ağırlıklı: Guild silah / takı, Order zırh / offhand; taraf yokken stok birebir eski', () => {
    const town = settle(jumpTo('dr54'));
    const count = (s: CampaignState, slots: string[]) => {
      let n = 0;
      for (let r = 0; r < 40; r++) for (const w of campaignStock(s, 'dr54', r)) if (slots.includes(ITEMS.items.find((d) => d.id === w.itemId)!.slot)) n++;
      return n;
    };
    const order = debugSetFaction(town, 'order');
    const guild = debugSetFaction(town, 'guild');
    expect(count(guild, ['weapon', 'trinket'])).toBeGreaterThan(count(order, ['weapon', 'trinket']));
    expect(count(order, ['armor', 'offhand'])).toBeGreaterThan(count(guild, ['armor', 'offhand']));
    // Harita 1'de taraf etkisizdir (reach.faction yok)
    const v = newCampaign({ mode: 'normal', seed: 3 });
    expect(campaignStock(debugSetFaction(v, 'guild'), v.at)).toEqual(campaignStock(v, v.at));
  });
});

describe('M-M Lighthouse', () => {
  it('Lantern Rock: lambayı yak -> bu haritada görüş +1 (sis daha uzak açılır)', () => {
    const rock = jumpTo('dr45');
    expect(nextStep(rock)).toMatchObject({ kind: 'event', event: 'dr_lantern_rock' });
    expect(eventChoices('dr_lantern_rock', rock).map((c) => c.id)).toEqual(['light']);
    const lit = chooseEvent(rock, 'light');
    expect(lit.lit).toBe(true);
    expect(visionOf(map, lit)).toBe(map.visibility + 1);
    const seen = (s: CampaignState) => Object.values(nodeVisibility(map, s)).filter((v) => v !== 'fog' && v !== 'goal').length;
    expect(seen(lit)).toBeGreaterThan(seen(rock));
    expect(debugSetLit(lit, false).lit).toBeUndefined();
  });
});

describe('kayıt: eski Harita 2 kayıtları', () => {
  it('kaldırılan dr59 (eski sabit Caravel cebi): orada duran takım dr62ye taşınır, kazanılmışsa Caravel batmış sayılır', () => {
    const s = debugSetSea(jumpTo('dr62'), true);
    const legacy = JSON.parse(JSON.stringify({ ...s, at: 'dr59', path: [...s.path, 'dr59'], visited: [...(s.visited ?? []), 'dr59'], cleared: [...(s.cleared ?? []), 'dr59'], done: [...s.done, 'dr59:battle'] }));
    delete legacy.caravel;
    const n = normalizeState(legacy)!;
    expect(n).not.toBeNull();
    expect(n.at).toBe('dr62');
    expect(n.path).not.toContain('dr59');
    expect(n.visited).not.toContain('dr59');
    expect(n.caravel?.beaten).toBe(true);
  });

  it('deniz alanları doğrulanır: bozuk taraf / sea / caravel atılır, geçerli olan kalır', () => {
    const s = jumpTo('dr54');
    const bad = JSON.parse(JSON.stringify({ ...s, faction: 'pirates', sea: 'yes', lit: 1, caravel: { i: 9 } }));
    const n = normalizeState(bad)!;
    expect(n.faction).toBeUndefined();
    expect(n.sea).toBeUndefined();
    expect(n.lit).toBeUndefined();
    expect(n.caravel?.i ?? 0).toBe(0);
    const good = normalizeState(JSON.parse(JSON.stringify({ ...s, faction: 'order', sea: true, lit: true, caravel: { i: 2 } })))!;
    expect(good).toMatchObject({ faction: 'order', sea: true, lit: true, caravel: { i: 2 } });
  });

  it('eski kayıt adadaysa deniz açık sayılır (mahsur kalmaz); Gallows Coveye varılmışsa kapı açık', () => {
    const onIsle = debugTeleport(start(), 'dr56');
    const noSea = { ...onIsle };
    delete noSea.sea;
    expect(seaOpen(map, noSea)).toBe(true);
  });
});

describe('olay çipleri (harita penceresi)', () => {
  it('taraf / gemi / fener / hediye seçenekleri okunur çip verir', () => {
    const text = (id: string, ev: string, f?: 'order' | 'guild') => choiceChips(eventChoices(ev, f ? { faction: f } : {}).find((c) => c.id === id)!).map((c) => c.text);
    expect(text('guild', 'dr_guild_hall')).toContain('Side with the Guild (final)');
    expect(text('charter_gold', 'dr_ferry_office')).toEqual(['60 gold', 'Opens the sea lanes']);
    expect(text('light', 'dr_lantern_rock')).toEqual(['Sight +1 on this map']);
    expect(text('order_rest', 'dr_monks_isle', 'order')).toContain('Uncommon relic');
    expect(resultChips({ charter: true }).map((c) => c.text)).toEqual(['Sea lanes open']);
  });
});
