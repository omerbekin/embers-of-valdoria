// Harita 2 yan içerik: B5 The Fighting Pit (Saltmere) ve A4 Hero Oath (Saltspray Shrine). maps-2-3.md 9; open-questions 429.
import { afterEach, describe, expect, it } from 'vitest';
import {
  DROWNED_REACH,
  ENCOUNTERS,
  EVENTS,
  OATHS,
  OATH_DATA,
  PITS,
  activeHeroes,
  applyBattle,
  battlePlan,
  breakOath,
  breakOathBlocked,
  chooseEvent,
  clone,
  completeSimple,
  debugJumpNode,
  enterPit,
  fightPit,
  getMap,
  hotspotOffered,
  leavePit,
  losePit,
  newCampaign,
  nextStep,
  normalizeState,
  oathHealMult,
  pitBlocked,
  pitView,
  setMapOverride,
  swearBlocked,
  swearOath,
  type BattleOutcome,
  type CampaignState,
} from '../src/campaign';
import { content } from '../src/engine';

afterEach(() => setMapOverride(DROWNED_REACH, null));

const map = getMap(DROWNED_REACH);
const node = (id: string) => map.nodes.find((n) => n.id === id)!;

/** Saltmere (dr28) kasaba adımında, hikâye dinlenmiş. */
function atSaltmere(seed = 11): CampaignState {
  setMapOverride(DROWNED_REACH, true);
  let t = debugJumpNode(newCampaign({ mode: 'normal', seed }), 'dr28');
  if (nextStep(t).kind === 'story') t = completeSimple(t, 'story');
  expect(t.at).toBe('dr28');
  expect(nextStep(t).kind).toBe('town');
  return t;
}

/** Savaş sonucu: her kahraman verilen canla (0 = düştü). */
const outcome = (s: CampaignState, victory: boolean, hp: (i: number) => number): BattleOutcome => ({
  victory,
  units: activeHeroes(s).map((h, i) => ({ heroId: h.id, hpRatio: hp(i), alive: hp(i) > 0 })),
  flawless: false,
});

describe('The Fighting Pit: veri', () => {
  it('Saltmere arenası: 5 kademe, karşılaşmalar var ve geçerli sınıflar, kasaba yeri yalnız arenalı kasabada', () => {
    const n = node('dr28');
    expect(n.pit).toBe('saltmere_pit');
    const def = PITS[n.pit!]!;
    expect(def.tiers).toHaveLength(5);
    for (const t of def.tiers) {
      const enc = ENCOUNTERS[t.encounter];
      expect(enc, t.encounter).toBeTruthy();
      for (const u of enc!.units) expect(content.classes[u.class] ?? content.encounterUnit?.(u.class), `${t.encounter} ${u.class}`).toBeTruthy();
      expect(t.gold).toBeGreaterThan(0);
    }
    // ödüller kademe kademe artar; son kademede elit
    expect(def.tiers.map((t) => t.gold)).toEqual([...def.tiers.map((t) => t.gold)].sort((a, b) => a - b));
    expect(ENCOUNTERS[def.tiers[4]!.encounter]!.units.some((u) => u.tier === 'elite')).toBe(true);
    const h = n.scene!.hotspots.find((x) => x.action === 'pit')!;
    expect(h.label).toBe('The Fighting Pit');
    expect(hotspotOffered(n, h)).toBe(true);
    expect(hotspotOffered(node('dr15') ?? n, h)).toBe(!!(node('dr15') ?? n).pit);
  });
});

describe('The Fighting Pit: kurallar', () => {
  it('giriş -> kademe savaşı (tek dalga), zafer: şifa yok, altın + rekor, kademe arası; çıkış kazanılanları korur', () => {
    let s = atSaltmere();
    expect(pitBlocked(s)).toBeNull();
    s = enterPit(s);
    const st = nextStep(s);
    expect(st).toMatchObject({ kind: 'battle', node: 'dr28', encounter: 'dr_pit_1', pit: true });
    const plan = battlePlan(s);
    expect(plan.encounterId).toBe('dr_pit_1');
    expect(plan.pitTier).toBe(1);
    expect(plan.waves).toBeUndefined(); // arena kademesi tek dalga
    const gold0 = s.gold;
    const xp0 = activeHeroes(s).map((h) => h.xp + h.level * 1000);
    let a = applyBattle(s, outcome(s, true, () => 0.6));
    expect(a.pit).toEqual({ node: 'dr28', wins: 1 });
    expect(a.pitBest).toEqual({ dr28: 1 });
    expect(a.gold).toBe(gold0 + PITS['saltmere_pit']!.tiers[0]!.gold);
    // zafer şifası yok: can savaştaki gibi (level atlayan tam iyileşir)
    for (const h of activeHeroes(a)) {
      const before = activeHeroes(s).find((x) => x.id === h.id)!;
      if (h.level === before.level) expect(h.hpRatio).toBe(0.6);
    }
    expect(activeHeroes(a).map((h) => h.xp + h.level * 1000).some((v, i) => v > xp0[i]!)).toBe(true);
    expect(nextStep(a).kind).toBe('town'); // kademe arası: kasaba adımı (pencere)
    expect(pitView(a)).toMatchObject({ wins: 1, next: 2, nextPays: true, best: 1 });
    // ikinci kademe
    a = fightPit(a);
    expect(nextStep(a)).toMatchObject({ kind: 'battle', encounter: 'dr_pit_2', pit: true });
    a = applyBattle(a, outcome(a, true, () => 0.4));
    expect(a.pitBest).toEqual({ dr28: 2 });
    const gold2 = a.gold;
    const out = leavePit(a);
    expect(out.pit).toBeUndefined();
    expect(out.gold).toBe(gold2);
    expect(nextStep(out).kind).toBe('town');
    // yeniden giriş: rekor altındaki kademe ödül vermez (altın ve XP aynı)
    let r = enterPit(out);
    const xpBefore = activeHeroes(r).map((h) => [h.level, h.xp]);
    r = applyBattle(r, outcome(r, true, () => 0.5));
    expect(r.gold).toBe(gold2);
    expect(activeHeroes(r).map((h) => [h.level, h.xp])).toEqual(xpBefore);
    expect(r.pitBest).toEqual({ dr28: 2 });
    expect(pitView(r)).toMatchObject({ wins: 1, next: 2, nextPays: false });
  });

  it('sandıklı kademe hazine loot\'u verir; son kademeden sonra yalnız çıkış', () => {
    let s = enterPit(atSaltmere(12));
    for (let i = 0; i < 5; i++) {
      if (i > 0) s = fightPit(s);
      s = applyBattle(s, outcome(s, true, () => 0.9));
      if (i === 2) {
        expect(s.pendingLoot?.kind).toBe('treasure');
        expect(s.pendingLoot?.gold).toBe(PITS['saltmere_pit']!.tiers[2]!.gold);
        delete s.pendingLoot;
      }
    }
    expect(s.pitBest).toEqual({ dr28: 5 });
    expect(pitView(s)).toMatchObject({ wins: 5, next: null });
    expect(() => fightPit(s)).toThrow();
  });

  it('yenilgi / pes: koşu biter, o kademe ödülsüz, düşen ayaktaki kahraman yaralı kalkar, önceki ödüller kalır', () => {
    let s = enterPit(atSaltmere(13));
    s = applyBattle(s, outcome(s, true, () => 0.7));
    const gold1 = s.gold;
    s = fightPit(s);
    const lost = losePit(s, outcome(s, false, (i) => (i === 0 ? 0 : 0.3)));
    expect(lost.pit).toBeUndefined();
    expect(lost.gold).toBe(gold1);
    expect(lost.pitBest).toEqual({ dr28: 1 });
    expect(lost.stats.defeats).toBe(s.stats.defeats + 1);
    const [first, ...rest] = activeHeroes(lost);
    expect(first!.alive).toBe(true);
    expect(first!.wounds).toBe((activeHeroes(s)[0]!.wounds ?? 0) + 1);
    for (const h of rest) expect(h.hpRatio).toBe(0.3);
    expect(nextStep(lost).kind).toBe('town');
  });

  it('kayıt: açık koşu (başlamış savaş atılır) ve rekor okunur; bozuk değerler atılır', () => {
    let s = enterPit(atSaltmere(14));
    s = applyBattle(s, outcome(s, true, () => 0.8));
    s = fightPit(s);
    const back = normalizeState(JSON.parse(JSON.stringify(s)))!;
    expect(back.pit).toEqual({ node: 'dr28', wins: 1 });
    expect(back.pitBest).toEqual({ dr28: 1 });
    expect(nextStep(back).kind).toBe('town');
    const bad = normalizeState({ ...JSON.parse(JSON.stringify(s)), pit: { node: 'dr1', wins: 9 }, pitBest: { dr28: -1 } })!;
    expect(bad.pit).toBeUndefined();
    expect(bad.pitBest).toBeUndefined();
    // eski kayıt (alan yok) değişmeden okunur
    const old = clone(s);
    delete old.pit;
    delete old.pitBest;
    const o = normalizeState(JSON.parse(JSON.stringify(old)))!;
    expect(o.pit).toBeUndefined();
    expect(o.pitBest).toBeUndefined();
  });
});

describe('Hero Oath', () => {
  /** Saltspray Shrine (dr52) olay adımında. */
  function atShrine(seed = 21): CampaignState {
    setMapOverride(DROWNED_REACH, true);
    const t = debugJumpNode(newCampaign({ mode: 'normal', seed }), 'dr52');
    expect(t.at).toBe('dr52');
    expect(nextStep(t).kind).toBe('event');
    return t;
  }

  it('veri: tek tapınak (Saltspray Shrine), 2-3 yemin, her biri bir artı ve bir eksi; olayda yemin seçeneği', () => {
    expect(map.nodes.filter((n) => n.oathShrine).map((n) => n.id)).toEqual(['dr52']);
    expect(OATHS.length).toBeGreaterThanOrEqual(2);
    expect(OATHS.length).toBeLessThanOrEqual(3);
    for (const o of OATHS) {
      expect(Object.keys(o.plus).length, o.id).toBeGreaterThan(0);
      expect(Object.keys(o.minus).length, o.id).toBeGreaterThan(0);
    }
    expect(OATHS.find((o) => o.id === 'undertow')).toMatchObject({ name: 'Oath of the Undertow', plus: { damageAdd: 0.12 }, minus: { restHealMult: 0.5 } });
    expect(EVENTS['dr_saltspray_shrine']!.choices!.some((c) => c.oath)).toBe(true);
  });

  it('yemin: tek kahraman, savaş kurulumuna artı/eksi, şifa eksisi, altınla bozulur, kayıtta kalır', () => {
    let s = atShrine();
    const [a, b] = activeHeroes(s);
    expect(swearBlocked(s, a!.id, 'undertow')).toBeNull();
    s = chooseEvent(swearOath(s, a!.id, 'undertow'), 'oath');
    expect(s.oath).toEqual({ hero: a!.id, id: 'undertow' });
    expect(nextStep(s).kind).not.toBe('event');
    // aynı anda tek yeminli
    expect(swearBlocked(s, b!.id, 'gale')).toBe('Someone is already sworn');
    expect(() => swearOath(s, b!.id, 'gale')).toThrow();
    // şifa çarpanı yalnız yeminliye
    expect(oathHealMult(s, a!.id, 'rest')).toBe(0.5);
    expect(oathHealMult(s, b!.id, 'rest')).toBe(1);
    expect(oathHealMult(s, a!.id, 'victory')).toBe(1);
    // kayıt
    const back = normalizeState(JSON.parse(JSON.stringify(s)))!;
    expect(back.oath).toEqual(s.oath);
    expect(normalizeState({ ...JSON.parse(JSON.stringify(s)), oath: { hero: 'nobody', id: 'undertow' } })!.oath).toBeUndefined();
    expect(normalizeState({ ...JSON.parse(JSON.stringify(s)), oath: { hero: a!.id, id: 'nope' } })!.oath).toBeUndefined();
    // bozma: altın yetmezse olmaz, yetince bedel düşer
    const poor = { ...clone(s), gold: OATH_DATA.breakCost - 1 };
    expect(breakOathBlocked(poor)).toBe('Not enough gold');
    const rich = { ...clone(s), gold: OATH_DATA.breakCost + 5 };
    const broken = breakOath(rich);
    expect(broken.oath).toBeUndefined();
    expect(broken.gold).toBe(5);
    expect(swearBlocked(broken, b!.id, 'gale')).toBeNull();
  });

  it('savaş kurulumu: Undertow hasar eki, Breakwater can çarpanı + hasar eksisi (başka kahraman etkilenmez)', () => {
    let s = atSaltmere(31);
    const [a, b] = activeHeroes(s);
    const cell = (id: string) => s.active.indexOf(id);
    const base = battlePlan(enterPit(s)).units.party;
    // tapınak dışında yemin edilemez: test için doğrudan durum
    s = { ...clone(s), oath: { hero: a!.id, id: 'undertow' } };
    const p1 = battlePlan(enterPit(s)).units.party;
    expect(p1[cell(a!.id)]?.modifiers?.damageAdd ?? 0).toBeCloseTo((base[cell(a!.id)]?.modifiers?.damageAdd ?? 0) + 0.12, 6);
    expect(p1[cell(b!.id)]?.modifiers?.damageAdd ?? 0).toBeCloseTo(base[cell(b!.id)]?.modifiers?.damageAdd ?? 0, 6);
    s = { ...clone(s), oath: { hero: a!.id, id: 'breakwater' } };
    const p2 = battlePlan(enterPit(s)).units.party;
    expect(p2[cell(a!.id)]?.modifiers?.hpMult ?? 1).toBeCloseTo((base[cell(a!.id)]?.modifiers?.hpMult ?? 1) * 1.15, 4);
    expect(p2[cell(a!.id)]?.modifiers?.damageAdd ?? 0).toBeCloseTo((base[cell(a!.id)]?.modifiers?.damageAdd ?? 0) - 0.08, 6);
    // Gale: zafer şifası yarım (arena dışı normal savaş kuralı; şifa çarpanı)
    s = { ...clone(s), oath: { hero: a!.id, id: 'gale' } };
    expect(oathHealMult(s, a!.id, 'victory')).toBe(0.5);
    expect(p2[cell(b!.id)]?.modifiers?.hpMult ?? 1).toBeCloseTo(base[cell(b!.id)]?.modifiers?.hpMult ?? 1, 6);
  });

  it('tapınak dışında yemin / bozma yok', () => {
    const s = atSaltmere(41);
    const h = activeHeroes(s)[0]!;
    expect(swearBlocked(s, h.id, 'undertow')).toBe('Only at the shrine');
    expect(breakOathBlocked({ ...clone(s), oath: { hero: h.id, id: 'undertow' }, gold: 999 })).toBe('Only at the shrine');
  });
});
