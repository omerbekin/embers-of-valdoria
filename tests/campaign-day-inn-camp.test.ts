// Gün, Inn, kamp ve demirci yeri (Ömer 2026-10-26, form econ/main; campaign-dev). Kurallar: data/campaign/campaign.json > _rest.
import { afterEach, describe, expect, it } from 'vitest';
import {
  CONFIG,
  DROWNED_REACH,
  activeHeroes,
  advanceDay,
  autoResolve,
  campBlocked,
  campTrainXp,
  campUsed,
  clearedNodes,
  clone,
  completeSimple,
  continueToMap,
  dayOf,
  dayProgressOf,
  debugFinishMap1,
  debugTeleport,
  getMap,
  heroById,
  innGuests,
  innHotspot,
  innLeaveBlocked,
  innTakeBlocked,
  leaveAtInn,
  moveTo,
  newCampaign,
  nextStep,
  normalizeState,
  patrolAvailable,
  recruitOffer,
  revisitNode,
  setMapOverride,
  smithHotspot,
  startPatrol,
  takeFromInn,
  travelRoute,
  useCamp,
  type CampaignState,
} from '../src/campaign';
import { instanceIlvl } from '../src/progression/items';

afterEach(() => setMapOverride(DROWNED_REACH, null));

function at(target: string, until: string, seed = 4242): CampaignState {
  let s = debugTeleport(newCampaign({ mode: 'normal', seed }), target);
  for (let i = 0; i < 20 && nextStep(s).kind !== until; i++) s = autoResolve(s);
  expect(nextStep(s).kind).toBe(until);
  return s;
}
const finish = (s: CampaignState): CampaignState => {
  let t = s;
  for (let i = 0; i < 20 && nextStep(t).kind !== 'move'; i++) t = autoResolve(t);
  return t;
};
/** Temizlenmiş, devriye açık bir düğüme yürü (yoksa test hatası). */
function toPatrol(s: CampaignState): CampaignState {
  const id = clearedNodes(s).find((x) => x !== s.at && patrolAvailable(s, x) && travelRoute(s, x));
  expect(id).toBeTruthy();
  return moveTo(s, id!);
}
/** Gün sayacı tek sayı: gün + ilerleme. */
const clock = (s: CampaignState): number => dayOf(s) + dayProgressOf(s);

describe('gün (2 tamamlama = 1 gün)', () => {
  it('yeni sefer gün 1; eski kayıtta alan yok = gün 1, ilerleme 0', () => {
    const s = newCampaign({ mode: 'normal', seed: 1 });
    expect([s.day, s.dayProgress]).toEqual([1, 0]);
    const old = clone(s);
    delete old.day;
    delete old.dayProgress;
    expect([dayOf(old), dayProgressOf(old)]).toEqual([1, 0]);
    expect(normalizeState(JSON.parse(JSON.stringify(old)))).toMatchObject({ day: 1, dayProgress: 0 });
  });

  it('düğümün ilk zaferi bir tamamlama: iki zafer bir gün', () => {
    let s = autoResolve(newCampaign({ mode: 'normal', seed: 3 })); // kahraman
    expect(nextStep(s).kind).toBe('battle');
    s = autoResolve(s);
    expect([dayOf(s), dayProgressOf(s)]).toEqual([1, 0.5]);
    const t = clone(s);
    expect(advanceDay(t)).toBe(true);
    expect([dayOf(t), dayProgressOf(t)]).toEqual([2, 0]);
  });

  it('devriye zaferi bir tamamlama; yürümek, kasaba ve kamp gün harcamaz', () => {
    let s = finish(at('7', 'town'));
    const c0 = clock(s);
    s = toPatrol(s);
    expect(clock(s)).toBe(c0);
    const p = autoResolve(startPatrol(s));
    expect(clock(p)).toBe(c0 + 0.5);
    const camp = at('river', 'rest');
    expect(clock(useCamp(camp, { kind: 'rest' }))).toBe(clock(camp));
    const town = at('7', 'town');
    expect(clock(completeSimple(town, 'town'))).toBe(clock(town));
  });

  it('harita geçişinde gün sürer', () => {
    setMapOverride(DROWNED_REACH, true);
    const done = { ...debugFinishMap1(newCampaign({ mode: 'normal', seed: 77 })), day: 9, dayProgress: 0.5 };
    expect([continueToMap(done).day, continueToMap(done).dayProgress]).toEqual([9, 0.5]);
  });
});

describe('Inn', () => {
  it('bırakılan kahraman takımdan çıkar, Inn kaydında durur; sınıfı aday listesine dönmez', () => {
    const s = at('7', 'town');
    const h = activeHeroes(s)[0]!;
    const t = leaveAtInn(s, h.id);
    expect(heroById(t, h.id)).toBeUndefined();
    expect(t.active.includes(h.id)).toBe(false);
    expect(innGuests(t, '7').map((x) => x.hero.id)).toEqual([h.id]);
    expect(t.inn![0]).toMatchObject({ mapId: 'valdoria', town: '7', day: dayOf(s) });
    expect(recruitOffer(t, '7')).not.toContain(h.class);
    expect(t.roster.filter((x) => x.leader).length).toBe(1); // lider gittiyse liderlik devredilir
  });

  it('her yeni gün %50 maks can ve 1 yara (tam cana, 0 yaraya kadar); Inn XP vermez', () => {
    const s0 = at('7', 'town');
    const id = activeHeroes(s0)[0]!.id;
    const s = { ...s0, roster: s0.roster.map((h) => (h.id === id ? { ...h, hpRatio: 0.2, wounds: 2, xp: 0 } : h)) };
    const t = leaveAtInn(s, id);
    const g = clone(t);
    g.dayProgress = 0.5;
    advanceDay(g);
    expect(g.inn![0]!.hero).toMatchObject({ hpRatio: 0.7, wounds: 1 });
    g.dayProgress = 0.5;
    advanceDay(g);
    expect(g.inn![0]!.hero.hpRatio).toBe(1);
    expect(g.inn![0]!.hero.wounds).toBeUndefined();
    // yarım gün iyileştirmez
    const h = clone(t);
    advanceDay(h);
    expect(h.inn![0]!.hero.hpRatio).toBe(0.2);
    // savaş kazanılsa da Inn'deki kahraman XP almaz
    const after = autoResolve(startPatrol(toPatrol(finish(t))));
    expect(after.inn![0]!.hero.xp).toBe(0);
  });

  it('ceset ve son ayakta kalan bırakılamaz; kasaba dışında Inn yok', () => {
    const s = at('7', 'town');
    const [a, ...rest] = activeHeroes(s);
    const dead = { ...s, roster: s.roster.map((h) => (h.id === a!.id ? { ...h, alive: false, hpRatio: 0 } : h)) };
    expect(innLeaveBlocked(dead, a!.id)).toMatch(/dead/);
    let t = s;
    for (const h of rest) t = leaveAtInn(t, h.id);
    expect(innLeaveBlocked(t, a!.id)).toMatch(/stay/);
    expect(innLeaveBlocked(at('10', 'battle'), activeHeroes(at('10', 'battle'))[0]!.id)).toMatch(/town/);
  });

  it('yalnız bırakıldığı kasabada geri alınır, takımda yer olmalı', () => {
    const s = at('7', 'town');
    const id = activeHeroes(s)[0]!.id;
    const t = leaveAtInn(s, id);
    const back = takeFromInn(t, id);
    expect(heroById(back, id)).toBeTruthy();
    expect(back.active.includes(id)).toBe(true);
    expect(back.inn).toBeUndefined();
    // başka kasabada (Ashford) alınamaz
    const elsewhere = { ...at('4', 'town'), inn: t.inn };
    expect(innTakeBlocked(elsewhere, id)).toMatch(/Valdren Keep/);
    // takım doluysa alınamaz
    const full = { ...t, roster: [...t.roster, { ...t.roster[0]!, id: 'x1' }, { ...t.roster[0]!, id: 'x2' }] };
    expect(innTakeBlocked(full, id)).toMatch(/full/);
  });

  it('harita geçişinde Inn\'deki kahraman iyileştiği kadarıyla takıma döner (yarası silinir)', () => {
    setMapOverride(DROWNED_REACH, true);
    const done = debugFinishMap1(newCampaign({ mode: 'normal', seed: 77 }));
    const w = clone(done);
    const h = w.roster.pop()!;
    w.active = w.active.map((x) => (x === h.id ? '' : x));
    w.inn = [{ hero: { ...h, hpRatio: 0.6, wounds: 1 }, mapId: 'valdoria', town: '7', day: 1 }];
    const t = continueToMap(w);
    expect(t.inn).toBeUndefined();
    expect(heroById(t, h.id)).toMatchObject({ hpRatio: 0.6 });
    expect(heroById(t, h.id)!.wounds).toBeUndefined();
    expect(t.active.includes(h.id)).toBe(true);
  });
});

describe('kamp (bir kez, tek seçim)', () => {
  it('Rest: yaşayanlar +%50; ikinci kez kullanılamaz, tekrar ziyaret açmaz', () => {
    const s0 = at('river', 'rest');
    const s = { ...s0, roster: s0.roster.map((h) => ({ ...h, hpRatio: 0.3 })) };
    const t = useCamp(s, { kind: 'rest' });
    expect(t.roster.every((h) => h.hpRatio === 0.8)).toBe(true);
    expect(campUsed(t, 'river')).toBe('rest');
    expect(() => useCamp(t, { kind: 'rest' })).toThrow();
    expect(revisitNode(t)).toBe(t);
  });

  it('Tend wounds: bir kahramanın 1 yarası; yarasız kahraman olmaz', () => {
    const s0 = at('river', 'rest');
    const id = activeHeroes(s0)[0]!.id;
    expect(campBlocked(s0, { kind: 'tend', heroId: id })).toMatch(/no wounds/);
    const s = { ...s0, roster: s0.roster.map((h) => (h.id === id ? { ...h, wounds: 2 } : h)) };
    expect(heroById(useCamp(s, { kind: 'tend', heroId: id }), id)!.wounds).toBe(2 - CONFIG.camp.tendWounds);
  });

  it('Train: bir kahramana o noktadaki normal savaş payının yarısı kadar XP', () => {
    const s = at('river', 'rest');
    const h = activeHeroes(s)[0]!;
    const xp = campTrainXp(s, h.id);
    expect(xp).toBeGreaterThan(0);
    const t = useCamp(s, { kind: 'train', heroId: h.id });
    const after = heroById(t, h.id)!;
    expect(after.level > h.level || after.xp === h.xp + xp).toBe(true);
  });

  it('Sharpen: bir item bedava +1 Temper (altın değişmez)', () => {
    const s = { ...at('river', 'rest'), gold: 3 };
    const h = activeHeroes(s).find((x) => x.equipment.weapon)!;
    const w = h.equipment.weapon!;
    const t = useCamp(s, { kind: 'sharpen', uid: w.uid });
    expect(instanceIlvl(heroById(t, h.id)!.equipment.weapon!)).toBe(instanceIlvl(w) + 1);
    expect(t.gold).toBe(3);
    expect(campBlocked(s, { kind: 'sharpen', uid: 'nope' })).toBe('Unknown item');
  });
});

describe('kasaba yerleri: Inn her kasabada, demirci 2. kasabadan', () => {
  it('Ashford: Inn var, demirci yok; diğer kasabalar (Harita 2 dahil): ikisi de; ateş başı yeri kalmadı', () => {
    const towns = ['valdoria', DROWNED_REACH].flatMap((m) => getMap(m).nodes.filter((n) => n.type === 'town'));
    expect(towns.length).toBe(6);
    for (const n of towns) {
      expect(innHotspot(n)).toBeTruthy();
      expect(n.scene!.hotspots.some((h) => h.action === 'rest')).toBe(false);
      expect(!!smithHotspot(n)).toBe(n.id !== '4');
      expect((n as { heal?: number }).heal).toBeUndefined(); // varış şifası yok
    }
  });
});
