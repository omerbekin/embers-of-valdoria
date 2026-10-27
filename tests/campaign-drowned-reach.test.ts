// Harita 2 (The Drowned Reach) iskeleti + harita geçişi M-Q (maps-2-3.md 3, 5, 8, 9.1-9.2; Adım 1).
import { afterEach, describe, expect, it } from 'vitest';
import {
  CONFIG,
  DROWNED_REACH,
  ENCOUNTERS,
  EVENTS,
  STORIES,
  TREASURES,
  activeHeroes,
  allRoutes,
  choicePoints,
  completeSimple,
  continueToMap,
  debugFinishMap1,
  debugJumpDrownedReach,
  debugJumpRegion,
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
  outgoing,
  readSaves,
  setMapOverride,
  swapHero,
  swapOffer,
  undirectedDistances,
  validateMap,
  writeSave,
} from '../src/campaign';
import { content } from '../src/engine';
import { MAPS23_KEY, maps23On, mapsParam } from '../src/ui/maps23-flag';

const map = getMap(DROWNED_REACH);
const ids = (pred: (n: (typeof map.nodes)[number]) => boolean) => map.nodes.filter(pred).map((n) => n.id);

afterEach(() => setMapOverride(DROWNED_REACH, null));

describe('The Drowned Reach: harita verisi', () => {
  it('88 durak (82 + 6 Wayshrine cebi; dr59 Black Caravel cebi M-K ile kalktı), 6 bölge (13/16/14/15/15/15), doğrulama temiz, hepsi bağlı', () => {
    expect(map.nodes).toHaveLength(88);
    expect(map.regions.map((r) => r.id)).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI']);
    expect(map.regions.map((r) => map.nodes.filter((n) => n.region === r.id).length)).toEqual([13, 16, 14, 15, 15, 15]);
    expect(validateMap(map)).toEqual([]);
    expect(undirectedDistances(map, map.start).size).toBe(88);
    expect(map.start).toBe('dr1');
    expect(finalNode(map)).toBe('dr83');
    expect(map.continues).toBe('valdoria');
    // düğüm id'leri Harita 1 ile çakışmaz (global skip listeleri, done işaretleri)
    const v = new Set(getMap('valdoria').nodes.map((n) => n.id));
    expect(map.nodes.filter((n) => v.has(n.id))).toEqual([]);
  });

  it('cepler: tek giriş, ileri yol yok, kesik yol; Saltmere kolları (spoke): tek giriş Saltmere, ileri yol yok', () => {
    const pockets = ids((n) => !!n.optional);
    expect(pockets.sort()).toEqual(['dr11', 'dr18', 'dr25', 'dr35', 'dr51', 'dr65', 'dr67', 'dr77', 'dr84', 'dr85', 'dr86', 'dr87', 'dr88', 'dr89'].sort());
    for (const id of pockets) {
      expect(incoming(map, id), id).toHaveLength(1);
      expect(mainOutgoing(map, id), id).toEqual([]);
      expect(map.edges.find((e) => e.to === id)?.style, id).toBe('dashed');
    }
    const spokes = ids((n) => !!n.spoke);
    expect(spokes).toHaveLength(10);
    for (const id of spokes) {
      expect(incoming(map, id), id).toEqual(['dr28']);
      expect(mainOutgoing(map, id), id).toEqual([]); // kolun ucunda en çok bir cep (ör. Inquisition House -> cep)
      for (const o of outgoing(map, id)) expect(map.nodes.find((n) => n.id === o)?.optional, `${id}->${o}`).toBe(true);
    }
    expect(map.nodes.find((n) => n.id === 'dr28')).toMatchObject({ name: 'Saltmere', type: 'town', city: true });
  });

  it('K1 (dal başına savaş) ve K2 (en çok 2 savaşsız durak üst üste) her rotada', () => {
    expect(k1Violations(map)).toEqual([]);
    const routes = allRoutes(map);
    expect(routes.length).toBeGreaterThan(1);
    for (const r of routes) expect(longestPeacefulRun(map, r), r.join('>')).toBeLessThanOrEqual(2);
    expect(Math.min(...routes.map((r) => r.length))).toBeGreaterThanOrEqual(45);
    expect(choicePoints(map).length).toBeGreaterThanOrEqual(5);
  });

  it('seviye eğrisi L10-20: ilk 3 durak L10, bölgeler sırayla yükselir, final L20', () => {
    expect(['dr1', 'dr2', 'dr3'].map((id) => nodeLevel(DROWNED_REACH, id))).toEqual([10, 10, 10]);
    // Ömer 2026-10-25 (form K3 = b): dr4-6 L11, L10 -> L12 sıçraması yumuşar
    expect(['dr4', 'dr5', 'dr6'].map((id) => nodeLevel(DROWNED_REACH, id))).toEqual([11, 11, 11]);
    const lv = (r: string) => map.nodes.filter((n) => n.region === r).map((n) => nodeLevel(DROWNED_REACH, n.id));
    let prevMax = 0;
    for (const r of map.regions) {
      const l = lv(r.id);
      expect(Math.min(...l), r.id).toBeGreaterThanOrEqual(Math.max(10, prevMax - 1));
      prevMax = Math.max(...l);
    }
    expect(Math.max(...map.nodes.map((n) => nodeLevel(DROWNED_REACH, n.id)))).toBe(20);
    expect(nodeLevel(DROWNED_REACH, 'dr82')).toBe(20);
  });

  it('karşılaşma / olay / hazine / hikâye bağları çözülür; her düşman var olan bir class', () => {
    for (const n of map.nodes) {
      if (n.encounter) {
        const enc = ENCOUNTERS[n.encounter];
        expect(enc, `${n.id} ${n.encounter}`).toBeDefined();
        for (const u of [...enc!.units, ...(enc!.waves ?? []).flatMap((w) => w.units)]) expect(content.classes[u.class] ?? content.encounterUnit(u.class), `${n.encounter}: ${u.class}`).toBeDefined();
      }
      if (n.event) expect(EVENTS[n.event], n.id).toBeDefined();
      if (n.treasure) expect(TREASURES[n.treasure], n.id).toBeDefined();
      if (n.story) expect(STORIES[n.story], n.id).toBeDefined();
    }
    // Crossing durakları güverte savaşı (M-J, crossing true); Black Caravel artık gezici (M-K, reach.caravel), sabit düğüm yok
    for (const id of ['dr55', 'dr60', 'dr62', 'dr64']) {
      expect(map.nodes.find((n) => n.id === id)?.subtitle, id).toMatch(/^Crossing/);
      expect(map.nodes.find((n) => n.id === id)?.crossing, id).toBe(true);
    }
    expect(map.nodes.find((n) => n.name === 'The Black Caravel')).toBeUndefined();
    expect(ENCOUNTERS[map.reach!.caravel!.encounter]).toBeDefined();
  });

  it('kendi çizimli Harita 2 mobları: adı geçen her birim kendi id\'siyle; 3.3 kiti, ailesi ve rolü', () => {
    // ad -> [id, aile, skill'ler] (maps-2-3.md 3.3; pasifler motor gelene kadar yer tutucu)
    const own: Record<string, [string, string, string[]]> = {
      'Corsair Cutlass': ['corsair_cutlass', 'corsairs', ['cutlass', 'rake']],
      'Corsair Slinger': ['corsair_slinger', 'corsairs', ['sling_stone', 'pitch_pot']],
      'Salt Crab': ['salt_crab', 'beasts', ['pincer', 'burrow']],
      'Weir Eel': ['weir_eel', 'beasts', ['eel_bite', 'lunge']],
      Siren: ['siren', 'hexes', ['lament', 'chorus']],
      'Drowned Knight': ['drowned_knight', 'sunken_court', ['rusted_blade', 'shield_of_brine']],
      'Brine Maiden': ['brine_maiden', 'sunken_court', ['lament_of_salt', 'tidal_mend']],
      'Reaver Archer': ['reaver_archer', 'bandits', ['pitch_arrow', 'fire_volley']],
      'Reef Wrecker': ['reef_wrecker', 'bandits', ['hook', 'lantern_flash']],
    };
    const seen = new Set<string>();
    for (const [key, enc] of Object.entries(ENCOUNTERS))
      if (key.startsWith('dr_'))
        for (const u of enc.units) {
          const o = own[u.name ?? ''];
          if (!o) continue;
          expect(u.class, `${key} ${u.name}`).toBe(o[0]);
          seen.add(o[0]);
        }
    expect([...seen].sort()).toEqual(Object.values(own).map(([id]) => id).sort());
    for (const [name, [id, family, skills]] of Object.entries(own)) {
      const m = content.mobs[id]!;
      expect(m.name, id).toBe(name);
      expect(m.spriteId, id).toBe(id);
      expect(m.family, id).toBe(family);
      expect(m.skills, id).toEqual(skills);
      expect(m.role, id).not.toMatch(/Morvane|Brann/);
    }
    // Pitch Pot / Pitch Arrow ateşi: Burning ground ve Burning (Tide suyu söndürür: M-B)
    expect(content.skills['pitch_pot']!.effects.some((e) => e.type === 'ground' && e.ground === 'burning')).toBe(true);
    expect(content.skills['pitch_arrow']!.effects.some((e) => e.type === 'dot' && e.status === 'burning')).toBe(true);
    expect(content.skills['lunge']!.ignoreReach).toBe(true);
  });

  it('kasabalar: Reedgate, Eelwick, Saltmere (Odo\'s Chandlery), Fisher\'s Landing; hikâye NPC\'si ve tüccar', () => {
    const towns = map.nodes.filter((n) => n.type === 'town');
    expect(towns.map((n) => n.name)).toEqual(['Reedgate', 'Eelwick', 'Saltmere', "Fisher's Landing"]);
    for (const t of towns) {
      expect(t.merchant, t.id).toBe(true);
      expect(t.story, t.id).toBeTruthy();
      expect(t.scene, t.id).toBeDefined();
    }
    expect(JSON.stringify(towns.find((n) => n.name === 'Saltmere')!.scene)).toContain("Odo's Chandlery");
  });

  it('rozetler bölge içinde en az 70 px (1920x1080), kenara %1,5ten yakın değil', () => {
    for (const a of map.nodes) {
      expect(Math.min(a.pos[0], 1 - a.pos[0], a.pos[1], 1 - a.pos[1]), a.id).toBeGreaterThanOrEqual(0.015);
      for (const b of map.nodes)
        if (a.id < b.id && a.region === b.region) expect(Math.hypot((a.pos[0] - b.pos[0]) * 1920, (a.pos[1] - b.pos[1]) * 1080), `${a.id}-${b.id}`).toBeGreaterThanOrEqual(70);
    }
  });
});

describe('Harita geçişi (M-Q)', () => {
  it('bayrak açık (Ömer 2026-10-26); kapatılınca Morvane sonrası geçiş yok, Map 1 sonu aynı', () => {
    expect(CONFIG.mapFlags?.[DROWNED_REACH]?.enabled).toBe(true);
    setMapOverride(DROWNED_REACH, false);
    expect(mapEnabled(DROWNED_REACH)).toBe(false);
    const done = debugFinishMap1(newCampaign({ mode: 'normal', seed: 77 }));
    expect(nextStep(done).kind).toBe('complete');
    expect(nextMapFor(done)).toBeNull();
    expect(getMap('valdoria').complete).toBeUndefined();
  });

  it('bayrak açıkken geçiş: kadro, level, ekipman, torba, altın, Valor taşınır; yürüyüş sıfırlanır', () => {
    setMapOverride(DROWNED_REACH, true);
    const done = debugFinishMap1(newCampaign({ mode: 'normal', seed: 77 }));
    expect(nextMapFor(done)).toBe(DROWNED_REACH);
    const t = continueToMap(done);
    expect(t.mapId).toBe(DROWNED_REACH);
    expect(t.at).toBe('dr1');
    expect(t.path).toEqual(['dr1']);
    expect(t.cleared).toEqual([]);
    expect(t.mapsDone).toEqual(['valdoria']);
    expect(t.roster).toEqual(done.roster);
    expect(t.active).toEqual(done.active);
    expect(t.inventory).toEqual(done.inventory);
    expect(t.gold).toBe(done.gold);
    expect(t.valor).toEqual(done.valor);
    expect(nextStep(t).kind).toBe('battle'); // Harita 2'de kahraman seçimi yok
    expect(() => continueToMap(newCampaign({ mode: 'normal', seed: 1 }), DROWNED_REACH)).toThrow();
  });

  it('geçişte yaşayan kahramanların yaraları silinir (Ömer 2026-10-26 D1 b); ceset ceset kalır, yarası değişmez', () => {
    setMapOverride(DROWNED_REACH, true);
    const done = debugFinishMap1(newCampaign({ mode: 'normal', seed: 77 }));
    const w = JSON.parse(JSON.stringify(done)) as typeof done;
    const [a, b, c] = w.roster;
    a!.wounds = 2;
    b!.wounds = 1;
    c!.wounds = 3;
    c!.alive = false;
    c!.hpRatio = 0;
    const t = continueToMap(w);
    expect(t.roster[0]!.wounds ?? 0).toBe(0);
    expect(t.roster[1]!.wounds ?? 0).toBe(0);
    expect(t.roster[2]!.alive).toBe(false);
    expect(t.roster[2]!.wounds).toBe(3);
    expect(w.roster[0]!.wounds).toBe(2); // giriş durumu değişmez
  });

  it('kayıt: geçiş sonrası kayıt yüklenir; eski Harita 1 kaydı aynen kalır (mapsDone yok)', () => {
    setMapOverride(DROWNED_REACH, true);
    const kv = memoryKV();
    const old = newCampaign({ mode: 'normal', seed: 5 });
    expect(normalizeState(JSON.parse(JSON.stringify(old)))).toEqual(old);
    const t = continueToMap(debugFinishMap1(newCampaign({ mode: 'normal', seed: 5, slot: 1 })));
    writeSave(kv, t, 'auto');
    const back = readSaves(kv).file.slots[1]!.saves.at(-1)!.state;
    expect(back.mapId).toBe(DROWNED_REACH);
    expect(back.mapsDone).toEqual(['valdoria']);
    expect(normalizeState(back, 1)).toMatchObject({ mapId: DROWNED_REACH, at: 'dr1' });
    // bilinmeyen harita adı mapsDone'dan atılır
    expect(normalizeState({ ...JSON.parse(JSON.stringify(old)), mapsDone: ['nowhere'] })?.mapsDone).toBeUndefined();
  });

  it('Map 1 rotaları bozulmadı', () => {
    const v = getMap('valdoria');
    expect(validateMap(v)).toEqual([]);
    expect(k1Violations(v)).toEqual(['road -> fold']); // bilinen istisna (campaign.test.ts)
    expect(allRoutes(v).every((r) => r.length === v.stopsPerRun)).toBe(true);
  });
});

describe('Maps 2-3 debug kısayolları ve bayrak', () => {
  it('Jump to The Drowned Reach: 4 kişilik takım L10, eşyalı, tam can', () => {
    setMapOverride(DROWNED_REACH, true);
    const t = debugJumpDrownedReach(newCampaign({ mode: 'normal', seed: 9 }));
    expect(t.mapId).toBe(DROWNED_REACH);
    expect(t.at).toBe('dr1');
    const team = activeHeroes(t);
    expect(team).toHaveLength(4);
    for (const h of team) {
      expect(h.level).toBe(10);
      expect(h.hpRatio).toBe(1);
      expect(Object.values(h.equipment).filter(Boolean).length).toBeGreaterThan(1);
    }
  });

  it('Jump to region: bölgenin ilk durağı, takım o durağın seviyesinde', () => {
    setMapOverride(DROWNED_REACH, true);
    const start = debugJumpDrownedReach(newCampaign({ mode: 'normal', seed: 9 }));
    for (const r of ['II', 'IV', 'VI']) {
      const t = debugJumpRegion(start, r);
      const n = map.nodes.find((x) => x.id === t.at)!;
      expect(n.region, r).toBe(r);
      expect(activeHeroes(t)[0]!.level, r).toBe(nodeLevel(DROWNED_REACH, n.id));
    }
  });

  it('Saltmere kışla değişimi (K1 = b): takım 4 kalır, çıkan yedeğe gider, geri alınır, kayıtta kalır', () => {
    setMapOverride(DROWNED_REACH, true);
    let t = debugJumpRegion(debugJumpDrownedReach(newCampaign({ mode: 'normal', seed: 9 })), 'III');
    expect(t.at).toBe('dr28');
    if (nextStep(t).kind === 'story') t = completeSimple(t, 'story');
    expect(nextStep(t).kind).toBe('town');
    const offer = swapOffer(t)!;
    expect(offer.recruits).toHaveLength(3);
    expect(offer.reserve).toEqual([]);
    const owned = new Set(t.roster.map((h) => h.class));
    expect(offer.recruits.some((c) => owned.has(c))).toBe(false);
    const out = t.roster.find((h) => h.leader) ?? t.roster[0]!;
    const cell = t.active.indexOf(out.id);
    const a = swapHero(t, offer.recruits[0]!, out.id);
    expect(a.roster).toHaveLength(4);
    expect(a.reserve!.map((h) => h.id)).toEqual([out.id]);
    expect(a.reserve![0]!.leader).toBeUndefined();
    const inc = a.roster.find((h) => h.class === offer.recruits[0])!;
    expect(a.active[cell]).toBe(inc.id);
    expect(inc.leader).toBe(true);
    expect(inc.level).toBeGreaterThan(1);
    // aday listesinde yedekteki / takımdaki sınıf yok; yedekteki geri alınabilir
    const o2 = swapOffer(a)!;
    expect(o2.recruits).not.toContain(out.class);
    expect(o2.recruits).not.toContain(inc.class);
    expect(o2.reserve.map((h) => h.id)).toEqual([out.id]);
    const b = swapHero(a, out.id, inc.id);
    expect(b.roster.map((h) => h.id).sort()).toEqual(t.roster.map((h) => h.id).sort());
    expect(b.active[cell]).toBe(out.id);
    expect(b.roster.find((h) => h.id === out.id)).toEqual(out);
    expect(b.reserve!.map((h) => h.id)).toEqual([inc.id]);
    // kayıt: yedek okunur, bozuk girdi atılır; sürüm aynı
    const back = normalizeState(JSON.parse(JSON.stringify(b)))!;
    expect(back.reserve).toEqual(b.reserve);
    expect(normalizeState({ ...JSON.parse(JSON.stringify(b)), reserve: [{ id: 'x' }] })!.reserve).toBeUndefined();
    // başka yerde değişim yok; takımda olmayan / önerilmeyen hata
    expect(swapOffer(debugJumpDrownedReach(newCampaign({ mode: 'normal', seed: 9 })))).toBeNull();
    expect(() => swapHero(t, 'no_such_class', out.id)).toThrow();
    expect(() => swapHero(t, offer.recruits[0]!, 'h999')).toThrow();
  });

  it('bayrak kapalıyken Jump hata verir', () => {
    setMapOverride(DROWNED_REACH, false);
    expect(() => debugJumpDrownedReach(newCampaign({ mode: 'normal', seed: 9 }))).toThrow();
  });

  it('?maps=1 açar ve hatırlar, ?maps=0 kapatır; anahtar eov.debug.maps23', () => {
    const m = new Map<string, string>();
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
    expect(mapsParam('?maps=1')).toBe(true);
    expect(mapsParam('?x=2')).toBeNull();
    expect(maps23On('', s)).toBe(false);
    expect(maps23On('?maps=1', s)).toBe(true);
    expect(m.get(MAPS23_KEY)).toBe('1');
    expect(maps23On('', s)).toBe(true);
    expect(maps23On('?maps=0', s)).toBe(false);
    expect(maps23On('', s)).toBe(false);
  });
});
