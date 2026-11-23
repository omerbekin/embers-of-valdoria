// 1.0 öncesi kontrol (2026-11-23): Harita 1 > 2 > 3 zinciri: durum taşıma, geçiş anında kayıt / yükleme, oyun sonu sonrası kayıt.
import { afterEach, describe, expect, it } from 'vitest';
import {
  CINEMATIC_IDS,
  DROWNED_REACH,
  HOLLOW_CROWN,
  activeHeroes,
  continueToMap,
  debugFinishMap1,
  debugFinishMap2,
  debugFinishMap3,
  dueCinematic,
  markCinematicSeen,
  memoryKV,
  newCampaign,
  nextMapFor,
  nextStep,
  normalizeState,
  readSaves,
  setMapOverride,
  writeSave,
  type CampaignState,
} from '../src/campaign';

afterEach(() => {
  setMapOverride(DROWNED_REACH, null);
  setMapOverride(HOLLOW_CROWN, null);
});

const roundTrip = (s: CampaignState): CampaignState => {
  const kv = memoryKV();
  expect(writeSave(kv, s, 'auto').ok).toBe(true);
  const back = readSaves(kv).file.slots[s.slot ?? 1]!.saves.at(-1)!.state;
  const n = normalizeState(JSON.parse(JSON.stringify(back)), s.slot ?? 1);
  expect(n).not.toBeNull();
  return n!;
};
const team = (s: CampaignState) => activeHeroes(s).map((h) => [h.id, h.class, h.level, h.xp, h.equipment, h.tree]);

describe('Harita zinciri 1 > 2 > 3', () => {
  it('1 > 2: harita sonunda kayıt yüklenir ("Continue" kalır); geçişte takım, altın, torba, ağaç, seviye taşınır; geçiş sonrası kayıt da sağlam', () => {
    setMapOverride(DROWNED_REACH, true);
    const done = debugFinishMap1(newCampaign({ mode: 'normal', seed: 31, slot: 1 }));
    expect(nextStep(done).kind).toBe('complete');
    expect(nextMapFor(done)).toBe(DROWNED_REACH);
    const loaded = roundTrip(done);
    expect(nextStep(loaded).kind).toBe('complete');
    expect(nextMapFor(loaded)).toBe(DROWNED_REACH);
    for (const src of [done, loaded]) {
      const t = continueToMap(src);
      expect(t.mapId).toBe(DROWNED_REACH);
      expect(t.mapsDone).toEqual(['valdoria']);
      expect(team(t)).toEqual(team(src));
      expect(t.gold).toBe(src.gold);
      expect(t.inventory).toEqual(src.inventory);
      expect(t.day).toBe(src.day);
      expect(t.stats).toEqual(src.stats);
      expect(activeHeroes(t).length).toBeGreaterThan(0);
      const back = roundTrip(t);
      expect(back).toMatchObject({ mapId: DROWNED_REACH, at: t.at });
      expect(team(back)).toEqual(team(t));
      expect(back.gold).toBe(t.gold);
      expect(nextStep(back).kind).not.toBe('complete');
    }
  });

  it('3 sonu: oyun bitince adım "complete", sıradaki harita yok; kayıt yüklenince hâlâ bitmiş, sinema tekrar oynamaz, seçim korunur', () => {
    setMapOverride(DROWNED_REACH, true);
    setMapOverride(HOLLOW_CROWN, true);
    const m2 = debugFinishMap2(newCampaign({ mode: 'normal', seed: 77, slot: 1 }));
    const end = debugFinishMap3(continueToMap(m2, HOLLOW_CROWN), 'quench');
    expect(end.mapId).toBe(HOLLOW_CROWN);
    expect(end.mapsDone).toEqual(['valdoria', DROWNED_REACH]);
    expect(nextStep(end).kind).toBe('complete');
    expect(nextMapFor(end)).toBeNull();
    expect(end.crownChoice).toBe('quench');
    // kapanış sineması bir kez: görüldü işaretlenip kaydedilince "Continue" ile yüklenen kayıtta yeniden çıkmaz
    const seenAll = CINEMATIC_IDS.reduce((a, id) => markCinematicSeen(a, id), end);
    const back = roundTrip(seenAll);
    expect(nextStep(back).kind).toBe('complete');
    expect(nextMapFor(back)).toBeNull();
    expect(back.crownChoice).toBe('quench');
    expect(dueCinematic(back, 'map')).toBeNull();
    // bitmiş seferden yeni sefer: temiz başlar
    const fresh = newCampaign({ mode: 'normal', seed: 78, slot: 1 });
    expect(fresh.mapId).toBe('valdoria');
    expect(fresh.mapsDone ?? []).toEqual([]);
    expect(fresh.crownChoice).toBeUndefined();
  });
});
