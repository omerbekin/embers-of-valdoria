import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  activeHeroes,
  allRoutes,
  applyBattle,
  autoResolve,
  battlePlan,
  choicePoints,
  completeSimple,
  debugTeleport,
  farewell,
  formCompany,
  getMap,
  isAreaClass,
  isBattleNode,
  k1Violations,
  leaderOf,
  longestPeacefulRun,
  mergePoints,
  moveHero,
  moveTo,
  newCampaign,
  nextStep,
  node,
  nodeVisibility,
  partyCap,
  pickHero,
  recruit,
  recruitHoldsBattle,
  recruitOffer,
  stopNumber,
  validateMap,
  edgeVisibility,
  pendingTip,
  markTipSeen,
  isComplete,
  type CampaignState,
} from '../src/campaign';
import { randomPool } from '../src/engine/content';

const map = getMap('valdoria');
const fresh = (seed = 1234) => newCampaign({ mode: 'normal', seed });

/** Adımları otomatik çözerek verilen düğüme kadar ilerler (yol seçimlerinde `choose` ilk uygun seçeneği verir). */
function playTo(s: CampaignState, target: string, choose: (opts: string[]) => string = (o) => o[0]!): CampaignState {
  let t = s;
  for (let guard = 0; guard < 200; guard++) {
    const step = nextStep(t);
    if (t.at === target && step.kind !== 'hero') return t;
    if (step.kind === 'complete') return t;
    if (step.kind === 'move') t = moveTo(t, step.options.length === 1 ? step.options[0]! : choose(step.options));
    else t = autoResolve(t, step);
  }
  throw new Error('guard');
}

describe('sefer haritası: graf', () => {
  it('27 düğüm (A1-x + Cairn Hill), geçerli bağlantılar, bölgeler, 1 başlangıç ve 1 final', () => {
    expect(map.nodes).toHaveLength(27); // 2026-10-19: Cairn Hill (Windy Moor ile çatal arası)
    expect(validateMap(map)).toEqual([]);
    expect(map.regions.map((r) => r.id)).toEqual(['I', 'II', 'III']);
    expect(map.start).toBe('1');
    expect(map.nodes.filter((n) => n.final).map((n) => n.id)).toEqual(['12']);
    expect(map.nodes.filter((n) => n.type === 'rest').map((n) => n.name)).toEqual(['Riverside Camp']);
    expect(map.nodes.filter((n) => n.type === 'merchant').map((n) => n.name)).toEqual(['Forward Camp']);
    expect(node(map, '9').name).toBe("King's Bridge");
    for (const n of map.nodes) {
      expect(n.pos[0], n.id).toBeGreaterThan(0);
      expect(n.pos[0], n.id).toBeLessThan(1);
      expect(n.pos[1], n.id).toBeGreaterThan(0);
      expect(n.pos[1], n.id).toBeLessThan(1);
      expect(n.name).toMatch(/^[A-Za-z' .]+$/); // oyun içi metin İngilizce
    }
  });

  it('eğitim aynen (Mill Road -> Ravenwood -> Ruined Watchtower -> Ashford), A1-x konumları', () => {
    expect(['1', '2', '3', '4'].map((id) => node(map, id).name)).toEqual(['Mill Road', 'Ravenwood', 'Ruined Watchtower', 'Ashford Village']);
    expect(node(map, '2').pos).toEqual([0.224, 0.639]);
    expect(node(map, '3').pos).toEqual([0.281, 0.407]);
    expect(node(map, '4').pos).toEqual([0.229, 0.231]);
  });

  it('seçim noktaları cairn, 7, pilgrim, 10; birleşmeler 7, grave, river, camp; kenar stilleri (tek yol düz, seçimli kesik)', () => {
    expect(choicePoints(map).sort()).toEqual(['10', '7', 'cairn', 'pilgrim']);
    expect(mergePoints(map).sort()).toEqual(['7', 'camp', 'grave', 'river']);
    for (const e of map.edges) {
      const single = map.edges.filter((x) => x.from === e.from).length === 1 && map.edges.filter((x) => x.to === e.to).length === 1;
      expect(e.style, `${e.from}->${e.to}`).toBe(single ? 'solid' : 'dashed');
    }
  });

  it('24 rota, hepsi 22 durak ve finale ulaşır; her rotada 17 savaşlı durak', () => {
    const routes = allRoutes(map);
    expect(routes).toHaveLength(24);
    for (const r of routes) {
      expect(r).toHaveLength(map.stopsPerRun);
      expect(r[0]).toBe('1');
      expect(r[r.length - 1]).toBe('12');
      const battles = r.filter((id) => isBattleNode(node(map, id))).length;
      expect(battles, r.join('-')).toBe(17);
    }
  });

  it("K1: her dalda en az bir savaş (Witch's Hut korunan olay, Ömer 2026-10-11); K2: hiçbir rotada 2den fazla savaşsız durak art arda yok", () => {
    expect(k1Violations(map)).toEqual([]);
    for (const r of allRoutes(map)) expect(longestPeacefulRun(map, r), r.join('-')).toBeLessThanOrEqual(2);
  });
});

describe('ilerleme: seçim noktası, serbest dolaşım, birleşme', () => {
  it('başlangıç: kahraman seçimi, sonra Mill Road savaşı; tek yol ilerler', () => {
    let s = fresh();
    expect(nextStep(s)).toEqual({ kind: 'hero' });
    expect(() => moveTo(s, '2')).toThrow();
    s = pickHero(s, 'archer');
    expect(nextStep(s)).toEqual({ kind: 'battle', node: '1', encounter: 'mill_road_thugs' });
    expect(() => moveTo(s, '2')).toThrow(); // savaş bitmeden yola çıkılmaz
    s = autoResolve(s);
    expect(nextStep(s)).toEqual({ kind: 'move', options: ['2'] });
    s = moveTo(s, '2');
    expect(s.at).toBe('2');
    expect(stopNumber(s)).toBe(2);
  });

  it('seçim noktasında yol KİLİTLENMEZ (serbest dolaşım, roadmap 2.1): seçilmeyen dala geri dönülür; birleşmede tek yola döner', () => {
    let s = playTo(fresh(), '4');
    s = playTo(s, '4');
    // Ashford'u bitir: tutorial düğümleri (Watchtower ve öncesi) geri yol değil
    while (nextStep(s).kind !== 'move') s = autoResolve(s);
    expect(nextStep(s)).toEqual({ kind: 'move', options: ['moor'] });
    s = playTo(s, 'moor');
    while (nextStep(s).kind !== 'move') s = autoResolve(s);
    expect(nextStep(s)).toEqual({ kind: 'move', options: ['cairn'], back: ['4'] });
    s = playTo(s, 'cairn');
    while (nextStep(s).kind !== 'move') s = autoResolve(s);
    expect(nextStep(s)).toEqual({ kind: 'move', options: ['5B', 'charcoal'], back: ['moor'] });
    s = moveTo(s, 'charcoal');
    while (nextStep(s).kind !== 'move') s = autoResolve(s);
    s = moveTo(s, 'cairn'); // geri
    s = moveTo(s, '5B'); // seçilmeyen dal açık
    expect(s.at).toBe('5B');
    expect(nextStep(s).kind).toBe('battle');
    s = playTo(s, '7');
    expect(s.path).toEqual(['1', '2', '3', '4', 'moor', 'cairn', 'charcoal', 'cairn', '5B', '7']);
    s = playTo(s, 'grave', (o) => o[2]!);
    expect(s.path.slice(-2)).toEqual(['5A', 'grave']);
  });

  it('tam sefer 22 durakta biter (Valdoria Conquered)', () => {
    const s = playTo(fresh(), '12');
    const done = (() => {
      let t = s;
      while (!isComplete(t)) t = autoResolve(t);
      return t;
    })();
    expect(done.path).toHaveLength(22);
    expect(isComplete(done)).toBe(true);
    expect(done.stats.victories).toBe(17); // varsayılan seçimler ilk kolları izler (5B, 6B, 8A, Thornwood): 17 savaşlı durak
  });

  it("olay ve korunan hazine: hazine önce savaş, sonra sandık; Witch's Hut önce savaş, sonra olay", () => {
    let s = playTo(fresh(), '6B', (o) => (o.includes('6B') ? '6B' : o[0]!));
    expect(nextStep(s).kind).toBe('battle');
    s = autoResolve(s);
    expect(nextStep(s)).toEqual({ kind: 'treasure', node: '6B', treasure: 'dwarven_mine' });
    s = completeSimple(s, 'treasure');
    expect(nextStep(s)).toEqual({ kind: 'move', options: ['grave'], back: ['7'] });
    let a = playTo(fresh(), '6A', (o) => (o.includes('6A') ? '6A' : o[0]!));
    expect(nextStep(a)).toEqual({ kind: 'battle', node: '6A', encounter: 'witchs_hut_guard' });
    a = autoResolve(a);
    expect(nextStep(a)).toEqual({ kind: 'event', node: '6A', event: 'witchs_hut' });
    a = completeSimple(a, 'event');
    expect(nextStep(a).kind).toBe('move');
  });
});

describe('sis ve görünürlük', () => {
  it('bir sonraki durak tam (near), ikinci durak tür+ad (far), ötesi sis; Castle Morvane baştan hedef olarak görünür', () => {
    const s = fresh();
    const v = nodeVisibility(map, s);
    expect(v['1']).toBe('current');
    expect(v['2']).toBe('near');
    expect(v['3']).toBe('far');
    expect(v['4']).toBe('fog');
    expect(v['9']).toBe('fog');
    expect(v['12']).toBe('goal');
    expect(map.visibility).toBe(2);
  });

  it('seçim noktasında iki dal da görünür; seçilmeyen dal KAPANMAZ (d = 1 kalır, sise dönmez), geçilenler cleared', () => {
    let s = playTo(fresh(), '4');
    let v = nodeVisibility(map, s);
    expect(v['moor']).toBe('near');
    expect(v['cairn']).toBe('far');
    expect([v['5B'], v['charcoal']]).toEqual(['fog', 'fog']);
    expect(v['7']).toBe('fog');
    s = playTo(s, 'cairn');
    v = nodeVisibility(map, s);
    expect([v['5B'], v['charcoal']]).toEqual(['near', 'near']);
    expect(v['7']).toBe('far');
    while (nextStep(s).kind !== 'move') s = autoResolve(s);
    s = moveTo(s, 'charcoal');
    v = nodeVisibility(map, s);
    expect(v['5B']).toBe('far'); // iki yönlü mesafe 2 (charcoal - cairn - 5B)
    expect(v['cairn']).toBe('cleared');
    expect(v['7']).toBe('near');
    expect([v['6A'], v['6B'], v['5A']]).toEqual(['far', 'far', 'far']);
    const e = map.edges.find((x) => x.from === 'cairn' && x.to === '5B')!;
    expect(edgeVisibility(map, s, v, e)).toBe('visible');
    expect(edgeVisibility(map, s, v, map.edges.find((x) => x.from === 'cairn' && x.to === 'charcoal')!)).toBe('walked');
    expect(edgeVisibility(map, s, v, map.edges.find((x) => x.from === 'charcoal' && x.to === '7')!)).toBe('open');
  });

  it('sis kapatılınca (debug) her şey görünür', () => {
    const v = nodeVisibility(map, fresh(), true);
    expect(Object.values(v).filter((x) => x === 'fog' || x === 'goal')).toEqual([]);
  });
});

describe('tutorial takım akışı', () => {
  it('1 karakter -> Ravenwood: 3 adaydan 1 (en az biri alan saldırılı) -> Ashford: veda + serbest 3 kişilik takım (ilk seçilen lider) -> Valdren Keep çıkışı: 3 adaydan 1', () => {
    let s = pickHero(fresh(77), 'warrior');
    expect(s.roster).toHaveLength(1);
    expect(leaderOf(s)!.class).toBe('warrior');
    expect(partyCap(s)).toBe(1);
    s = autoResolve(s);
    s = moveTo(s, '2');
    const step = nextStep(s);
    expect(step.kind).toBe('recruit');
    const offer = (step as { offer: string[] }).offer;
    expect(offer).toHaveLength(3);
    expect(offer).not.toContain('warrior');
    expect(offer.some(isAreaClass)).toBe(true);
    const beforeRecruit = s;
    s = recruit(s, offer[1]!);
    // Ravenwood: katılımdan sonra savaş kendiliğinden başlamaz (önce Formation; Ömer 2026-10-16)
    expect(recruitHoldsBattle(beforeRecruit, s)).toBe(true);
    expect(s.roster).toHaveLength(2);
    expect(s.roster.every((h) => h.tutorial)).toBe(true);
    expect(partyCap(s)).toBe(2);
    expect(nextStep(s).kind).toBe('battle');
    s = playTo(s, '4');
    expect(nextStep(s)).toEqual({ kind: 'farewell', node: '4' });
    s = farewell(s);
    expect(s.roster).toHaveLength(0);
    expect(s.active.filter(Boolean)).toHaveLength(0);
    expect(nextStep(s)).toEqual({ kind: 'company', node: '4', size: 3 });
    expect(() => formCompany(s, ['mage', 'mage', 'archer'])).toThrow();
    expect(() => formCompany(s, ['mage', 'archer'])).toThrow();
    expect(() => formCompany(s, ['mage', 'archer', 'aoe_tester'])).toThrow();
    s = formCompany(s, ['druid', 'warrior', 'archer']); // tutorial sınıfı (warrior) yeniden seçilebilir
    expect(s.roster.map((h) => h.class)).toEqual(['druid', 'warrior', 'archer']);
    expect(leaderOf(s)!.class).toBe('druid');
    expect(s.roster.some((h) => h.tutorial)).toBe(false);
    expect(activeHeroes(s)).toHaveLength(3);
    expect(nextStep(s)).toEqual({ kind: 'story', node: '4', story: 'ash_on_the_wind' }); // kasaba sahnesi (T5), sonra kasaba
    s = completeSimple(s, 'story');
    expect(nextStep(s)).toEqual({ kind: 'town', node: '4' });
    s = completeSimple(s, 'town');
    expect(partyCap(s)).toBe(3);
    s = playTo(s, '7');
    expect(nextStep(s).kind).toBe('story');
    s = completeSimple(s, 'story');
    expect(nextStep(s).kind).toBe('town');
    s = completeSimple(s, 'town');
    const vol = nextStep(s);
    expect(vol.kind).toBe('volunteer');
    const vOffer = (vol as { offer: string[] }).offer;
    expect(vOffer).toHaveLength(3);
    for (const c of ['druid', 'warrior', 'archer']) expect(vOffer).not.toContain(c);
    expect(partyCap(s)).toBe(3);
    const beforeVolunteer = s;
    s = recruit(s, vOffer[0]!);
    expect(recruitHoldsBattle(beforeVolunteer, s)).toBe(false); // Valdren Keep (ayrılırken): savaş yok, etkilenmez
    expect(s.roster).toHaveLength(4);
    expect(s.roster[3]!.tutorial).toBeUndefined();
    expect(partyCap(s)).toBe(4);
    expect(nextStep(s).kind).toBe('move');
  });

  it('lider Ashford ekranında seçilebilir; dizilim değiştirilebilir', () => {
    let s = playTo(fresh(5), '4');
    s = farewell(s);
    s = formCompany(s, ['mage', 'defender', 'gambler'], 2);
    expect(leaderOf(s)!.class).toBe('gambler');
    const mage = s.roster[0]!.id;
    const before = s.active.indexOf(mage);
    const target = s.active.findIndex((c, i) => !c && i !== before);
    s = moveHero(s, mage, target);
    expect(s.active.indexOf(mage)).toBe(target);
    expect(s.active[before]).toBe('');
  });

  it('takım ve aday havuzu 11 oynanabilir sınıf (Geometer yok); başlangıç havuzu yalnızca Warrior + Archer (Ömer 2026-10-14)', () => {
    expect(CONFIG.starterPool).toEqual(['warrior', 'archer']);
    for (const pool of [CONFIG.companyPool, CONFIG.recruitPool]) {
      expect(pool).toHaveLength(11);
      expect(pool).not.toContain('aoe_tester');
      for (const c of pool) expect(randomPool).toContain(c);
    }
    for (const c of CONFIG.starterPool) expect(randomPool).toContain(c);
  });

  it('pickHero yalnızca başlangıç havuzundaki sınıfı kabul eder', () => {
    for (const c of CONFIG.recruitPool.filter((x) => !CONFIG.starterPool.includes(x))) expect(() => pickHero(fresh(), c), c).toThrow();
    expect(() => pickHero(fresh(), 'aoe_tester')).toThrow();
    expect(leaderOf(pickHero(fresh(), 'archer'))!.class).toBe('archer');
  });

  it('Ravenwood adayları ilk kahramana göre sabit (seed fark etmez): Warrior -> Druid/Undead/Gambler, Archer -> Anti-Mage/Cutthroat/Undead', () => {
    const want: Record<string, string[]> = { warrior: ['druid', 'undead', 'gambler'], archer: ['antimage', 'cutthroat', 'undead'] };
    for (const [hero, list] of Object.entries(want)) {
      for (const seed of [1, 2, 3, 42, 777]) {
        const s = moveTo(autoResolve(pickHero(fresh(seed), hero)), '2');
        expect(recruitOffer(s, '2'), `${hero} ${seed}`).toEqual(list);
        expect((nextStep(s) as { offer: string[] }).offer).toEqual(list);
        expect(list.some(isAreaClass)).toBe(true); // Ravenwood alan saldırısını öğretir
      }
    }
  });
});
describe('can taşıma', () => {
  it('zaferde hayatta kalanlar +victoryHeal; savaşı düşmüş bitiren %10 canla yaralı kalkar, ceset girip kalkmayan ceset kalır (Ömer 2026-10-19)', () => {
    // tavan level: XP level atlatmasın (level atlayınca tam iyileşme bu testin can kuralını örterdi; levels.md)
    const maxed = (x: CampaignState): CampaignState => ({ ...x, roster: x.roster.map((h) => ({ ...h, level: 50, xp: 0 })) });
    let s = maxed(playTo(fresh(9), '3'));
    const [a, b] = s.roster;
    s = applyBattle(s, { victory: true, units: [{ heroId: a!.id, hpRatio: 0.5, alive: true }, { heroId: b!.id, hpRatio: 0, alive: false }] });
    expect(s.roster[0]!.hpRatio).toBeCloseTo(0.5 + CONFIG.rules.eliteVictoryHeal!); // düğüm 3 elit: %50
    expect(s.roster[1]).toMatchObject({ hpRatio: CONFIG.rules.wounds.riseRatio, alive: true, wounds: 1 }); // yaralı kalkar
    // ceset olarak girip kalkmayan: ceset kalır, yeni yara yok, sonraki savaşa ceset girer
    s = { ...s, roster: s.roster.map((h) => (h.id === b!.id ? { ...h, hpRatio: 0, alive: false } : h)) };
    s = applyBattle({ ...s, done: s.done.filter((k) => !k.endsWith(':battle')) }, { victory: true, units: [{ heroId: a!.id, hpRatio: 0.5, alive: true }, { heroId: b!.id, hpRatio: 0, alive: false }] });
    expect(s.roster[1]).toMatchObject({ hpRatio: 0, alive: false, wounds: 1 });
    expect(battlePlan(s).units.party[s.active.indexOf(b!.id)]?.startDead).toBe('revivable'); // sonraki savaşa ceset olarak girer
    let t = maxed(playTo(fresh(9), '3'));
    t = applyBattle(t, { victory: true, units: [{ heroId: t.roster[0]!.id, hpRatio: 0.95, alive: true }] });
    expect(t.roster[0]!.hpRatio).toBe(1); // tavan 1
  });

  it('boss zaferi YAŞAYANLARI tam iyileştirir (düşen yaralı %10 kalkar); kasaba varışta yaşayanları tam iyileştirir, cesedi KALDIRMAZ (TUR 1 madde 10); yenilgi yalnızca sayaç', () => {
    let s = playTo(fresh(11), '9');
    const team = activeHeroes(s);
    s = applyBattle(s, { victory: true, units: team.map((h, i) => ({ heroId: h.id, hpRatio: i === 0 ? 0 : 0.1, alive: i !== 0 })) });
    expect(s.roster.find((h) => h.id === team[0]!.id)).toMatchObject({ hpRatio: CONFIG.rules.wounds.riseRatio, alive: true, wounds: 1 });
    expect(team.slice(1).every((h) => s.roster.find((x) => x.id === h.id)!.hpRatio === 1)).toBe(true);
    let t = playTo(fresh(11), '3');
    t = { ...t, roster: t.roster.map((h) => ({ ...h, level: 50, xp: 0 })) }; // XP level atlatmasın (tam iyileşme)
    t = applyBattle(t, { victory: true, units: t.roster.map((h) => ({ heroId: h.id, hpRatio: 0.1, alive: true })) });
    expect(t.roster[0]!.hpRatio).toBeCloseTo(0.1 + CONFIG.rules.eliteVictoryHeal!); // düğüm 3 elit
    const lost = applyBattle(t, { victory: false, units: [] });
    expect(lost.stats.defeats).toBe(1);
    expect(lost.roster).toEqual(t.roster);
    const down = t.roster[1]!.id;
    t = { ...t, roster: t.roster.map((h) => (h.id === down ? { ...h, hpRatio: 0, alive: false } : h)) };
    t = moveTo(t, '4');
    expect(t.roster.every((h) => (h.id === down ? h.hpRatio === 0 && !h.alive : h.hpRatio === 1 && h.alive))).toBe(true); // dinlenme diriltmez (Ömer 2026-10-18)
  });
});

describe('determinizm ve debug', () => {
  it('Valdren Keep adayları rastgele havuzdan: aynı seed = aynı adaylar; farklı seed çoğunlukla farklı', () => {
    const at7 = (seed: number) => debugTeleport(fresh(seed), '7');
    expect(recruitOffer(at7(42), '7')).toEqual(recruitOffer(at7(42), '7'));
    const offers = new Set([1, 2, 3, 4, 5, 6].map((seed) => recruitOffer(at7(seed), '7').join(',')));
    expect(offers.size).toBeGreaterThan(1);
    for (const seed of [1, 2, 3]) {
      const s = at7(seed);
      const owned = s.roster.map((h) => h.class);
      for (const c of recruitOffer(s, '7')) {
        expect(CONFIG.recruitPool).toContain(c);
        expect(owned).not.toContain(c);
      }
    }
  });

  it('ışınlanma: yol kurulur, önceki adımlar bitmiş, kadro dolu; ipucu yok (dersler data/tutorial.json)', () => {
    const s = debugTeleport(fresh(3), 'thorn');
    expect(s.at).toBe('thorn');
    expect(s.path).toEqual(['1', '2', '3', '4', 'moor', 'cairn', '5B', '7', '6B', 'grave', 'pilgrim', '8A', 'river', '9', '10', 'thorn']);
    expect(s.roster).toHaveLength(4);
    expect(nextStep(s).kind).toBe('battle');
    const t = debugTeleport(fresh(3), '1');
    expect(t.roster).toHaveLength(1);
    // eski Tip kartı içeriği mentor derslerine taşındı (data/tutorial.json): harita ipucu artık yok
    expect(pendingTip(t)).toBeNull();
    expect(pendingTip(markTipSeen(t))).toBeNull();
  });

  it('durum saf: işlemler girdiyi değiştirmez', () => {
    const s = fresh();
    const copy = JSON.stringify(s);
    pickHero(s, 'warrior');
    expect(JSON.stringify(s)).toBe(copy);
  });
});
