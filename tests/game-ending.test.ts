import { afterEach, describe, expect, it } from 'vitest';
import {
  CINEMATICS,
  CINEMATIC_IDS,
  DROWNED_REACH,
  HOLLOW_CROWN,
  SAVE_KEY,
  SAVE_VERSION,
  activeHeroes,
  chooseEvent,
  cinematicTitle,
  continueToMap,
  crownChoiceEvent,
  debugFinishMap1,
  debugFinishMap2,
  debugFinishMap3,
  dueCinematic,
  getMap,
  markCinematicSeen,
  mapEndSummary,
  memoryKV,
  newCampaign,
  nextMapFor,
  nextStep,
  normalizeState,
  readSaves,
  resolveCinematicBg,
  setMapOverride,
  writeSave,
  type CampaignState,
} from '../src/campaign';
import { existsSync } from 'node:fs';
import { mapOnlyStats } from '../src/campaign/ledger';
import { RARITY_IDS, instanceRarity } from '../src/progression/items';
import { CREDITS, creditPages } from '../src/ui/credits-data';

// Oyun sonu (Ömer 2026-11-21 form r38-r39): Harita 2-3 harita sonu kartı, Mend or Quench seçimi kayıtta (sürüm 15), kapanış sineması dala göre,
// jenerik taslağı (data/credits.json). Kod src/campaign/ending.ts, cinematics.ts, maps23-debug.ts > debugFinishMap3; görünüm src/ui/credits.ts.
afterEach(() => {
  setMapOverride(HOLLOW_CROWN, null);
  setMapOverride(DROWNED_REACH, null);
});

// Harita 2-3'ü yürümek pahalı: bir kez (seed 77), sonra kopyalardan
let m2: CampaignState | undefined;
const finishMap2 = (): CampaignState => {
  setMapOverride(DROWNED_REACH, true);
  setMapOverride(HOLLOW_CROWN, true);
  return (m2 ??= debugFinishMap2(newCampaign({ mode: 'normal', seed: 77, slot: 1 })));
};
let mend: CampaignState | undefined;
const finishMend = (): CampaignState => (mend ??= debugFinishMap3(continueToMap(finishMap2(), HOLLOW_CROWN), 'mend'));
const has = (f: string, id: string): boolean => existsSync(`assets/${f}/${id}.webp`);
const ENDING = ['first_fire_mend', 'first_fire_quench'];

describe('Mend or Quench seçimi kayıtta', () => {
  it('olay verisi: iki seçenek, her biri kendi seçimini yazar; Harita 3 son düğümü', () => {
    expect(crownChoiceEvent(HOLLOW_CROWN)).toEqual({ node: 'hc86', choices: [{ id: 'mend', crownChoice: 'mend' }, { id: 'quench', crownChoice: 'quench' }] });
    expect(crownChoiceEvent('valdoria')).toBeNull();
  });

  it('seçim kayda yazılır; olay biter, harita biter; başka alan değişmez (altın, can aynı)', () => {
    const t = finishMend();
    expect(t.crownChoice).toBe('mend');
    expect(nextStep(t).kind).toBe('complete');
    const q = debugFinishMap3(t, 'quench'); // aynı düğümde olay sıfırlanır, yeniden seçilir
    expect(q.crownChoice).toBe('quench');
    expect(q.gold).toBe(t.gold);
    expect(activeHeroes(q).map((h) => h.hpRatio)).toEqual(activeHeroes(t).map((h) => h.hpRatio));
    expect(() => chooseEvent(q, 'mend')).toThrow(); // olay bitti: ikinci seçim yok
  });

  it('kayıt sürümü 15: yazılır, okunur, seçim korunur', () => {
    expect(SAVE_VERSION).toBe(15);
    const kv = memoryKV();
    const t = finishMend();
    expect(writeSave(kv, t, 'auto').ok).toBe(true);
    expect(JSON.parse(kv.getItem(SAVE_KEY)!).version).toBe(15);
    expect(readSaves(kv).file.slots[t.slot]!.saves.at(-1)!.state.crownChoice).toBe('mend');
  });

  it('eski kayıt (sürüm 14) taşınır: olay bitmişse seçim eventChoice`tan kurtarılır, kurtarılamazsa ilk seçenek (mend); bitmemişse alan yok; bozuk değer atılır', () => {
    const q = debugFinishMap3(finishMend(), 'quench');
    const old = (s: CampaignState): CampaignState => {
      const c = structuredClone(s);
      delete c.crownChoice;
      return c;
    };
    // eventChoice son düğümde kalır: seçim kurtarılır
    expect(q.eventChoice).toMatchObject({ node: 'hc86', choice: 'quench' });
    expect(normalizeState(old(q), 1)!.crownChoice).toBe('quench');
    // eventChoice yok: varsayılan = olayın ilk seçeneği
    const lost = old(q);
    delete lost.eventChoice;
    expect(normalizeState(lost, 1)!.crownChoice).toBe('mend');
    // olay bitmemiş (Harita 3 başı): alan yazılmaz
    const start = continueToMap(finishMap2(), HOLLOW_CROWN);
    expect(normalizeState(structuredClone(start), 1)!.crownChoice).toBeUndefined();
    // bozuk değer atılır (olay bitmemişse yerine bir şey yazılmaz)
    expect(normalizeState({ ...structuredClone(start), crownChoice: 'burn' } as unknown as CampaignState, 1)!.crownChoice).toBeUndefined();
    // sürüm 14 dosyası okunur, taşındı sayılır (yeniden yazılır)
    const kv = memoryKV();
    kv.setItem(
      SAVE_KEY,
      JSON.stringify({ version: 14, counter: 1, lastSlot: 1, slots: [null, { campaignId: q.campaignId, mode: 'normal', difficulty: q.difficulty, startedAt: 't', lastPlayed: 't', saves: [{ id: 'y', kind: 'auto', savedAt: 't', mode: 'normal', campaignId: q.campaignId, summary: {}, state: old(q) }] }, null] }),
    );
    const r = readSaves(kv);
    expect(r.corrupt).toBe(false);
    expect(r.migrated).toBe(true);
    expect(r.file.slots[1]!.saves[0]!.state.crownChoice).toBe('quench');
  });
});

describe('Harita 3 kapanış sineması (iki dal)', () => {
  it('Harita 1 finaliyle aynı düzen: 4 sahne (1 / 2 / 1 / 1 satır) + kapanış kartı = haritanın bitiş metni; jenerik açılır', () => {
    const fin = CINEMATICS['morvane_falls']!;
    for (const id of ENDING) {
      const def = CINEMATICS[id]!;
      expect(def.scenes.map((s) => s.lines.length)).toEqual(fin.scenes.map((s) => s.lines.length));
      expect(def.endCard).toBe(getMap(HOLLOW_CROWN).complete!.text);
      expect(def.credits).toBe(true);
      for (const sc of def.scenes) {
        expect(resolveCinematicBg(sc.bg, has), `${id}: ${sc.bg}`).not.toBeNull(); // yeni çizim yok: hepsi var olan görsele düşer
        for (const l of sc.lines) expect(l.text.length, l.text).toBeLessThanOrEqual(160);
      }
    }
  });

  it('dallar: başlık ve son sahne metni farklı, ilk üç sahne aynı', () => {
    const [a, b] = ENDING.map((id) => CINEMATICS[id]!);
    const map = getMap(HOLLOW_CROWN);
    expect(cinematicTitle(ENDING[0]!, map)).toBe('The Crownbearer');
    expect(cinematicTitle(ENDING[1]!, map)).toBe('The Dark Hearth');
    expect(a!.scenes.slice(0, 3)).toEqual(b!.scenes.slice(0, 3));
    expect(a!.scenes[3]!.lines[0]!.text).not.toBe(b!.scenes[3]!.lines[0]!.text);
    expect(a!.scenes[3]!.bg).not.toBe(b!.scenes[3]!.bg);
  });

  it('seçime göre doğru dal oynar; bir kez; Ember zaferinde (seçimden önce) oynamaz; Harita 1-2 bitişinde oynamaz', () => {
    const t = finishMend();
    const seen = (s: CampaignState): CampaignState => CINEMATIC_IDS.filter((id) => !ENDING.includes(id)).reduce((a, id) => markCinematicSeen(a, id), s);
    expect(dueCinematic(seen(t), 'map')).toBe('first_fire_mend');
    expect(dueCinematic(markCinematicSeen(seen(t), 'first_fire_mend'), 'map')).toBeNull();
    expect(dueCinematic(seen(debugFinishMap3(t, 'quench')), 'map')).toBe('first_fire_quench');
    // olay bekliyor (Ember yenildi, seçim yok): kapanış yok
    const waiting = structuredClone(t);
    waiting.done = waiting.done.filter((d) => d !== 'hc86:event');
    delete waiting.crownChoice;
    delete waiting.eventChoice;
    expect(nextStep(waiting).kind).toBe('event');
    expect(dueCinematic(seen(waiting), 'map')).toBeNull();
    // Harita 2 bitişi
    expect(dueCinematic(seen(finishMap2()), 'map')).toBeNull();
  });
});

describe('harita sonu kartı (Harita 1, 2, 3)', () => {
  it('başlık / alt başlık / hikâye haritanın bitiş verisinden; sayılar sefer toplamı (Harita 1 ile aynı alanlar)', () => {
    const one = mapEndSummary(debugFinishMap1(newCampaign({ mode: 'normal', seed: 77 })), 'drowned-reach');
    expect([one.title, one.subtitle]).toEqual(['Valdoria Conquered', 'Map Complete']);
    const labels = one.stats.map((s) => s.label);
    expect(labels).toEqual(['Battles won', 'Defeats', 'Days', 'Gold on hand', 'Gold earned', 'Play time', 'Heroes fallen']);

    const s2 = finishMap2();
    expect(nextMapFor(s2)).toBe(HOLLOW_CROWN);
    const two = mapEndSummary(s2, nextMapFor(s2));
    expect([two.title, two.subtitle]).toEqual(['Two Crowns', 'Map Complete']);
    expect(two.story).toBe(getMap(DROWNED_REACH).complete!.text);
    expect(two.stats.map((s) => s.label)).toEqual(labels);
    expect(two.stats[0]!.value).toBe(String(mapOnlyStats(s2).victories)); // yalnız bu harita (Harita 2'ye debug ile girildi: başlangıç yok = sıfırdan)
    expect(two.heroes).toHaveLength(activeHeroes(s2).length);
    expect(two.loot.length).toBeLessThanOrEqual(3);
    setMapOverride(HOLLOW_CROWN, false);
    expect(mapEndSummary(s2, nextMapFor(s2)).subtitle).toBe('To Be Continued'); // Harita 3 kapalıyken

    const s3 = finishMend();
    const three = mapEndSummary(s3, nextMapFor(s3));
    expect([three.title, three.subtitle]).toEqual(['The First Fire', 'Campaign Complete']);
    expect(three.story).toBe(getMap(HOLLOW_CROWN).complete!.text);
    expect(Number(three.stats[0]!.value)).toBe(s3.stats.victories - s2.stats.victories); // yalnız Harita 3; sefer toplamı `total` satırında
    expect(mapEndSummary(s3, null, true).story).toBe(''); // sinemanın kapanış kartı az önce gösterdi
  });

  it('harita sonu kartı: üstte yalnız o haritanın sayıları, altında sefer toplamı; eski kayıt bozulmaz', () => {
    const base = debugFinishMap1(newCampaign({ mode: 'normal', seed: 78, slot: 2 }));
    setMapOverride(DROWNED_REACH, true);
    const s = JSON.parse(JSON.stringify(base)) as CampaignState;
    s.stats = { victories: 12, defeats: 2, goldEarned: 900, playMs: 3_600_000, fallen: 1 };
    s.day = 7;
    // Harita 1: başlangıç yok = toplamın kendisi (bugünkü sayılar)
    expect(mapOnlyStats(s)).toEqual({ victories: 12, defeats: 2, days: 7, goldEarned: 900, playMs: 3_600_000, fallen: 1 });
    const t = continueToMap(s, DROWNED_REACH);
    expect(t.mapStart).toEqual({ victories: 12, defeats: 2, goldEarned: 900, playMs: 3_600_000, fallen: 1, day: 7 });
    t.stats = { victories: 20, defeats: 3, goldEarned: 1500, playMs: 5_400_000, fallen: 2 };
    t.day = 12;
    const m = mapOnlyStats(t);
    expect(m).toEqual({ victories: 8, defeats: 1, days: 6, goldEarned: 600, playMs: 1_800_000, fallen: 1 });
    const sum = mapEndSummary(t, HOLLOW_CROWN);
    expect(sum.stats.find((x) => x.label === 'Battles won')!.value).toBe('8');
    expect(sum.stats.find((x) => x.label === 'Gold earned')!.value).toBe('600');
    expect(sum.stats.find((x) => x.label === 'Days')!.value).toBe('6');
    expect(sum.total).toBe('20 won · 3 defeats · 12 days · 1,500 gold earned · 1h 30m · 2 fallen');
    // kayıt turu: mapStart korunur; eski kayıtta (alan yok) ve bozuksa toplamın kendisi, kayıt yüklenir
    expect(normalizeState(JSON.parse(JSON.stringify(t)))!.mapStart).toEqual(t.mapStart);
    const old = JSON.parse(JSON.stringify(t)) as Record<string, unknown>;
    delete old.mapStart;
    expect(normalizeState(old)).not.toBeNull();
    expect(mapOnlyStats(normalizeState(old)!).victories).toBe(20);
    const bad = JSON.parse(JSON.stringify(t)) as Record<string, unknown>;
    bad.mapStart = { victories: 'x' };
    expect(normalizeState(bad)!.mapStart).toBeUndefined();
    expect(SAVE_VERSION).toBe(15); // yeni alan isteğe bağlı: kayıt sürümü değişmedi
  });

  it('en iyi item: nadirlik sırasıyla (sonra ilvl), en çok 3', () => {
    const s = finishMend();
    const r = mapEndSummary(s, null).loot.map((x) => (RARITY_IDS as readonly string[]).indexOf(instanceRarity(x.item)));
    expect(r.length).toBeGreaterThan(0);
    expect([...r].sort((a, b) => b - a)).toEqual(r);
  });
});

describe('jenerik taslağı (data/credits.json)', () => {
  it('başlık sayfası, satırı olan bölümler, kapanış; boş bölüm çizilmez; kişisel bilgi yok', () => {
    const pages = creditPages();
    expect(pages[0]).toEqual({ kind: 'title', heading: '', lines: ['Embers of Valdoria'] });
    expect(pages.at(-1)!.kind).toBe('closing');
    expect(CREDITS.sections.map((s) => s.heading)).toEqual(['Design & Direction', 'Code', 'Art', 'Audio', 'Tools', 'Special Thanks']);
    expect(pages.filter((p) => p.kind === 'section').every((p) => p.lines.length > 0)).toBe(true);
    expect(pages.some((p) => p.heading === 'Design & Direction')).toBe(false); // Ömer dolduracak
    const all = JSON.stringify(CREDITS.sections) + CREDITS.closing;
    expect(all).not.toMatch(/@|https?:|www\./);
    expect(creditPages({ title: 'X', pageMs: 1, sections: [{ heading: 'A', lines: [' '] }], closing: '' })).toEqual([{ kind: 'title', heading: '', lines: ['X'] }]);
  });
});
