// Inn'de biri bırakılınca yerine yedekteki kahraman alınabilir (Ömer 2026-10-26): reserveTakeBlocked / recruitFromReserve.
import { describe, expect, it } from 'vitest';
import { legacyBlank } from './legacy-start';
import { activeHeroes, autoResolve, campBlocked, campUsed, completeSimple, skipCamp, useCamp, debugFinishMap1, debugTeleport, debugValdrenReserve, heroById, leaveAtInn, newCampaign, nextStep, normalizeState, recruitFromReserve, recruitInTown, recruitOffer, reserveTakeBlocked, swapHero, swapOffer, townRecruitOffer, type CampaignState } from '../src/campaign';

function town(): CampaignState {
  let s = debugTeleport(newCampaign({ mode: 'normal', seed: 4242 }), '7');
  for (let i = 0; i < 20 && nextStep(s).kind !== 'town'; i++) s = autoResolve(s);
  expect(nextStep(s).kind).toBe('town');
  return s;
}

describe('yedekten takıma alma', () => {
  it('yer yoksa engelli, Inn\'e bırakınca boş yere girer ve yedekten çıkar', () => {
    const s = town();
    const spare = { ...s.roster[0]!, id: 'spare-1' };
    const withReserve: CampaignState = { ...s, reserve: [spare] };
    expect(reserveTakeBlocked(withReserve, 'spare-1')).toMatch(/full/);
    const id = activeHeroes(withReserve)[0]!.id;
    const t = leaveAtInn(withReserve, id);
    expect(reserveTakeBlocked(t, 'spare-1')).toBeNull();
    const back = recruitFromReserve(t, 'spare-1');
    expect(heroById(back, 'spare-1')).toBeTruthy();
    expect(back.active.includes('spare-1')).toBe(true);
    expect(back.reserve).toBeUndefined();
  });

  it('yedekte olmayan kahraman ve kasaba dışı engelli', () => {
    const s = town();
    expect(reserveTakeBlocked(s, 'nobody')).not.toBeNull();
    expect(() => recruitFromReserve(s, 'nobody')).toThrow();
  });
});

describe('Harita 1 Barracks: yedek takası (Ömer 2026-10-31)', () => {
  it('yedek boşken değişiklik yok: takas önerisi boş, işe alım aynı, Ashford\'da takas yok', () => {
    const s = town();
    expect(swapOffer(s)).toEqual({ recruits: [], reserve: [] });
    expect(townRecruitOffer(s)).toEqual(recruitOffer(s, '7'));
    const t = recruitInTown(s, townRecruitOffer(s)[0]!);
    expect(t.roster.length).toBe(s.roster.length + 1);
    expect(t.reserve).toBeUndefined();
    expect(nextStep(completeSimple(s, 'town')).kind).toBe('volunteer');
    let ash = debugTeleport(newCampaign({ mode: 'normal', seed: 4242 }), '4');
    for (let i = 0; i < 20 && nextStep(ash).kind !== 'town'; i++) ash = autoResolve(ash);
    expect(swapOffer(ash)).toBeNull();
  });

  it('yedekte kahraman varken takas: bölük boyu ve hücre korunur, geri alınır, yeni aday yok', () => {
    const s = debugValdrenReserve(newCampaign({ mode: 'normal', seed: 4242 }));
    expect(s.at).toBe('7');
    expect(nextStep(s).kind).toBe('town');
    expect(s.roster).toHaveLength(4);
    const offer = swapOffer(s)!;
    expect(offer.recruits).toEqual([]);
    expect(offer.reserve).toHaveLength(1);
    const spare = offer.reserve[0]!;
    const out = s.roster.find((h) => h.leader)!;
    const cell = s.active.indexOf(out.id);
    const a = swapHero(s, spare.id, out.id);
    expect(a.roster).toHaveLength(4);
    expect(a.active[cell]).toBe(spare.id);
    expect(a.reserve!.map((h) => h.id)).toEqual([out.id]);
    expect(heroById(a, spare.id)!.leader).toBe(true);
    const b = swapHero(a, out.id, spare.id);
    expect(b.active[cell]).toBe(out.id);
    expect(b.reserve!.map((h) => h.id)).toEqual([spare.id]);
    expect(normalizeState(JSON.parse(JSON.stringify(a)))!.reserve).toEqual(a.reserve);
    expect(() => swapHero(s, townRecruitOffer(s)[0]!, out.id)).toThrow(); // havuzdan yabancı aday takası yok
  });

  it('takas işe alımı bozmaz: aday listesi aynı kalır, bölük doluyken seçilen yedeğe gider, yer varken Inn akışı çalışır', () => {
    // Eski kayıt: Valdren'de sınır 4 (yeni seferde sınır 3, dört kişi ve yedek ancak King's Bridge sonrası olur)
    const s = debugValdrenReserve(legacyBlank({ mode: 'normal', seed: 4242 }));
    const spare = s.reserve![0]!;
    const list = townRecruitOffer(s);
    expect(list.length).toBeGreaterThan(0);
    const a = swapHero(s, spare.id, s.roster.find((h) => !h.leader)!.id);
    expect(townRecruitOffer(a)).toEqual(list);
    const t = recruitInTown(a, list[0]!);
    expect(t.roster).toHaveLength(4);
    expect(t.reserve!.map((h) => h.class)).toContain(list[0]);
    const room = leaveAtInn(t, activeHeroes(t)[0]!.id);
    const waiting = t.reserve![0]!;
    expect(recruitFromReserve(room, waiting.id).active).toContain(waiting.id);
  });

  it('normal Harita 1 sonunda bölük dört, yedek boş', () => {
    const end = debugFinishMap1(newCampaign({ mode: 'normal', seed: 4242 }));
    expect(end.roster).toHaveLength(4);
    expect(end.reserve).toBeUndefined();
  });
});

describe('kampı seçmeden bırakma', () => {
  it('adım biter, kamp kullanılmamış kalır; geri gelince kullanılabilir', () => {
    let s = debugTeleport(newCampaign({ mode: 'normal', seed: 4242 }), 'hillcamp');
    for (let i = 0; i < 20 && nextStep(s).kind !== 'rest'; i++) s = autoResolve(s);
    expect(nextStep(s).kind).toBe('rest');
    const left = skipCamp(s);
    expect(nextStep(left).kind).toBe('move');
    expect(campUsed(left)).toBeNull();
    expect(campBlocked(left, { kind: 'rest' })).toBeNull();
    const rested = useCamp(left, { kind: 'rest' });
    expect(campUsed(rested)).toBe('rest');
    expect(campBlocked(rested, { kind: 'rest' })).not.toBeNull();
  });
});
