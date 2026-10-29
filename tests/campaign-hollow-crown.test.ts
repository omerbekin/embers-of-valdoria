// Harita 3 (The Hollow Crown) iskeleti + Harita 2 -> 3 geçişi (maps-2-3.md 4, 5 M-Q; bayrak kapalı).
import { afterEach, describe, expect, it } from 'vitest';
import {
  CONFIG,
  DROWNED_REACH,
  ENCOUNTERS,
  EVENTS,
  HOLLOW_CROWN,
  STORIES,
  TREASURES,
  activeHeroes,
  allRoutes,
  choicePoints,
  continueToMap,
  debugFinishMap2,
  debugJumpHollowCrown,
  debugJumpHollowNode,
  debugSealedTomb,
  finalNode,
  getMap,
  incoming,
  k1Violations,
  longestPeacefulRun,
  mainOutgoing,
  mapEnabled,
  memoryKV,
  newCampaign,
  nextMapFor,
  nextStep,
  nodeLevel,
  normalizeState,
  readSaves,
  setMapOverride,
  undirectedDistances,
  validateMap,
  writeSave,
} from '../src/campaign';
import { content } from '../src/engine';

const map = getMap(HOLLOW_CROWN);
const ids = (pred: (n: (typeof map.nodes)[number]) => boolean) => map.nodes.filter(pred).map((n) => n.id);

afterEach(() => setMapOverride(HOLLOW_CROWN, null));

// Harita 2'yi bitirmek pahalı (yol boyunca ~55 düğüm çözülür): bir kez, seed 77
let finished: ReturnType<typeof debugFinishMap2> | undefined;
const finishMap2 = () => (finished ??= debugFinishMap2(newCampaign({ mode: 'normal', seed: 77, slot: 1 })));

describe('The Hollow Crown: harita verisi', () => {
  it('86 durak, 6 bölge (14/14/14/15/14/15), doğrulama temiz, hepsi ulaşılır; Harita 2nin devamı', () => {
    expect(map.nodes).toHaveLength(86);
    expect(map.regions.map((r) => r.id)).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI']);
    expect(map.regions.map((r) => map.nodes.filter((n) => n.region === r.id).length)).toEqual([14, 14, 14, 15, 14, 15]);
    expect(validateMap(map)).toEqual([]);
    expect(undirectedDistances(map, map.start).size).toBe(86);
    expect(map.start).toBe('hc1');
    expect(finalNode(map)).toBe('hc86');
    expect(map.continues).toBe(DROWNED_REACH);
    expect(CONFIG.maps).toEqual(['valdoria', 'drowned-reach', 'hollow-crown']);
    // id'ler önceki haritalarla çakışmaz
    const other = new Set([...getMap('valdoria').nodes, ...getMap(DROWNED_REACH).nodes].map((n) => n.id));
    expect(map.nodes.filter((n) => other.has(n.id))).toEqual([]);
  });

  it('4 boss: Snowfather, Hollow King, Hearthwarden, Ember; son ikisi art arda (arada dinlenme yok), sonra Mend or Quench', () => {
    const bosses = map.nodes.filter((n) => n.type === 'boss');
    expect(bosses.map((n) => n.id)).toEqual(['hc24', 'hc51', 'hc84', 'hc85']);
    expect(bosses.map((n) => ENCOUNTERS[n.encounter!]!.units.find((u) => u.tier === 'boss')?.name)).toEqual([
      'The Snowfather',
      'The Hollow King',
      'The Hearthwarden',
      'The Ember of the First Hearth',
    ]);
    expect(mainOutgoing(map, 'hc84')).toEqual(['hc85']);
    expect(mainOutgoing(map, 'hc85')).toEqual(['hc86']);
    expect(map.nodes.find((n) => n.id === 'hc86')).toMatchObject({ type: 'event', final: true, name: 'Mend or Quench' });
    // her rota dört bossun hepsinden geçer
    for (const r of allRoutes(map)) for (const b of bosses) expect(r, b.id).toContain(b.id);
  });

  it('cepler (9) tek girişli, ileri yolsuz, kesik yol; Kharduin kolları (hc31-40) yalnız Kharduin\'den', () => {
    const pockets = ids((n) => !!n.optional);
    expect(pockets).toEqual(['hc7', 'hc23', 'hc42', 'hc44', 'hc50', 'hc66', 'hc70', 'hc78', 'hc82']);
    for (const id of pockets) {
      expect(incoming(map, id), id).toHaveLength(1);
      expect(mainOutgoing(map, id), id).toEqual([]);
      expect(map.edges.find((e) => e.to === id)?.style, id).toBe('dashed');
    }
    const spokes = ids((n) => !!n.spoke);
    expect(spokes).toEqual(['hc31', 'hc32', 'hc33', 'hc34', 'hc35', 'hc36', 'hc37', 'hc38', 'hc39', 'hc40']);
    for (const id of spokes) expect(incoming(map, id), id).toEqual(['hc30']);
    expect(map.nodes.find((n) => n.id === 'hc30')).toMatchObject({ name: 'Kharduin, the Last Hall', type: 'town', city: true });
    expect(mainOutgoing(map, 'hc30')).toEqual(['hc41']);
  });

  it('çatallar belgedeki gibi; K1 ve K2 her rotada', () => {
    expect(choicePoints(map)).toEqual(['hc3', 'hc15', 'hc43', 'hc58', 'hc72']);
    expect(k1Violations(map)).toEqual([]);
    const routes = allRoutes(map);
    expect(routes.length).toBeGreaterThan(1);
    for (const r of routes) expect(longestPeacefulRun(map, r), r.join('>')).toBeLessThanOrEqual(2);
    expect(Math.max(...routes.map((r) => r.length))).toBe(map.stopsPerRun);
  });

  it('seviye: ilk 3 durak L20, sonra bölüm 3 rampası, final boss L30', () => {
    expect(['hc1', 'hc2', 'hc3'].map((id) => nodeLevel(HOLLOW_CROWN, id))).toEqual([20, 20, 20]);
    const all = map.nodes.map((n) => nodeLevel(HOLLOW_CROWN, n.id));
    expect(Math.min(...all)).toBe(20);
    expect(Math.max(...all)).toBe(30);
    expect(nodeLevel(HOLLOW_CROWN, 'hc85')).toBe(30);
  });

  it('karşılaşma / olay / hazine / hikâye bağları çözülür; her düşman var olan bir birim (hollow_king kullanılmaz)', () => {
    for (const n of map.nodes) {
      if (n.encounter) {
        const enc = ENCOUNTERS[n.encounter];
        expect(enc, `${n.id} ${n.encounter}`).toBeDefined();
        for (const u of enc!.units) {
          expect(content.classes[u.class] ?? content.encounterUnit(u.class), `${n.encounter}: ${u.class}`).toBeDefined();
          expect(u.class).not.toBe('hollow_king');
        }
      }
      if (n.event) expect(EVENTS[n.event], n.id).toBeDefined();
      if (n.treasure) expect(TREASURES[n.treasure], n.id).toBeDefined();
      if (n.story) expect(STORIES[n.story], n.id).toBeDefined();
      if (['battle', 'elite', 'boss'].includes(n.type)) expect(n.encounter, n.id).toBeDefined();
    }
    for (const ev of Object.entries(EVENTS).filter(([k]) => k.startsWith('hc_')).map(([, v]) => v)) for (const c of ev.choices ?? []) for (const b of c.battle ?? []) expect(ENCOUNTERS[b], b).toBeDefined();
    expect(map.nodes.filter((n) => n.type === 'elite')).toHaveLength(8);
    expect(map.nodes.find((n) => n.id === 'hc46')).toMatchObject({ crossing: true, type: 'battle' });
    expect(map.nodes.filter((n) => n.type === 'town').map((n) => n.name)).toEqual(['Hearthstead', 'Kharduin, the Last Hall']);
    expect(map.nodes.find((n) => n.id === 'hc54')).toMatchObject({ type: 'merchant', merchant: true });
  });

  it('rozetler bölge içinde en az 70 px (1920x1080), kenara %1,5ten yakın değil', () => {
    for (const a of map.nodes) {
      expect(Math.min(a.pos[0], 1 - a.pos[0], a.pos[1], 1 - a.pos[1]), a.id).toBeGreaterThanOrEqual(0.015);
      for (const b of map.nodes)
        if (a.id < b.id && a.region === b.region) expect(Math.hypot((a.pos[0] - b.pos[0]) * 1920, (a.pos[1] - b.pos[1]) * 1080), `${a.id}-${b.id}`).toBeGreaterThanOrEqual(70);
    }
  });
});

describe('Harita 2 -> 3 geçişi (M-Q)', () => {
  it('bayrak kapalı (veri): Harita 2 sonu aynı kalır, "Continue" yok', () => {
    expect(CONFIG.mapFlags?.[HOLLOW_CROWN]?.enabled).toBe(false);
    expect(mapEnabled(HOLLOW_CROWN)).toBe(false);
    const done = finishMap2();
    expect(done.mapId).toBe(DROWNED_REACH);
    expect(nextStep(done).kind).toBe('complete');
    expect(nextMapFor(done)).toBeNull();
    expect(getMap(DROWNED_REACH).complete).toMatchObject({ title: 'Two Crowns', subtitle: 'To Be Continued' });
    expect(() => debugJumpHollowCrown(newCampaign({ mode: 'normal', seed: 9 }))).toThrow();
  });

  it('bayrak açıkken geçiş: kadro, level, ekipman, torba, altın, Valor taşınır; yürüyüş sıfırlanır', () => {
    setMapOverride(HOLLOW_CROWN, true);
    const done = finishMap2();
    expect(nextMapFor(done)).toBe(HOLLOW_CROWN);
    const t = continueToMap(done);
    expect(t.mapId).toBe(HOLLOW_CROWN);
    expect(t.at).toBe('hc1');
    expect(t.path).toEqual(['hc1']);
    expect(t.cleared).toEqual([]);
    expect(t.mapsDone).toEqual(['valdoria', DROWNED_REACH]);
    expect(t.roster.map((h) => [h.id, h.class, h.level, h.xp, h.equipment])).toEqual(done.roster.map((h) => [h.id, h.class, h.level, h.xp, h.equipment]));
    expect(t.active).toEqual(done.active);
    expect(t.inventory).toEqual(done.inventory);
    expect(t.gold).toBe(done.gold);
    expect(t.valor).toEqual(done.valor);
    expect(t.day).toBe(done.day);
    expect(t.sea).toBeUndefined();
    expect(t.caravel).toBeUndefined();
    expect(nextStep(t).kind).toBe('battle'); // kahraman seçimi yok
    // yalnız Harita 2'den geçilir
    expect(() => continueToMap(newCampaign({ mode: 'normal', seed: 1 }), HOLLOW_CROWN)).toThrow();
  });

  it('kayıt: Harita 3 kaydı yüklenir (mapsDone iki harita); eski Harita 2 kaydı aynen', () => {
    setMapOverride(HOLLOW_CROWN, true);
    const kv = memoryKV();
    const done = finishMap2();
    expect(normalizeState(JSON.parse(JSON.stringify(done)), 1)).toMatchObject({ mapId: DROWNED_REACH, mapsDone: ['valdoria'] });
    const t = continueToMap(done);
    writeSave(kv, t, 'auto');
    const back = readSaves(kv).file.slots[1]!.saves.at(-1)!.state;
    expect(back.mapId).toBe(HOLLOW_CROWN);
    expect(back.mapsDone).toEqual(['valdoria', DROWNED_REACH]);
    expect(normalizeState(back, 1)).toMatchObject({ mapId: HOLLOW_CROWN, at: 'hc1' });
  });

  it('Jump to The Hollow Crown: 4 kişilik takım L20, eşyalı, tam can', () => {
    setMapOverride(HOLLOW_CROWN, true);
    const t = debugJumpHollowCrown(finishMap2());
    expect(t.mapId).toBe(HOLLOW_CROWN);
    expect(t.at).toBe('hc1');
    const team = activeHeroes(t);
    expect(team).toHaveLength(4);
    for (const h of team) {
      expect(h.level).toBe(20);
      expect(h.hpRatio).toBe(1);
    }
    // open-questions 454 debug kısayolları: Harita 3 durağına yürüme, mühürlü cüce mezarı (yemin edilmiş)
    const wd = debugJumpHollowNode(t, 'hc20');
    expect(nextStep(wd)).toMatchObject({ kind: 'event', event: 'hc_white_dark' });
    expect(wd.stoneOath).toBeUndefined();
    expect(wd.pendingStatus).toBeUndefined();
    const st = debugSealedTomb(t);
    expect(st.stoneOath).toBe('sworn');
    expect(nextStep(st)).toMatchObject({ kind: 'treasure', node: 'hc42' });
  });
});
