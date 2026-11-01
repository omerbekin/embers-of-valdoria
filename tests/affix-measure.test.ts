// Affix ölçüm aracı (src/sim/affix-measure.ts): plan veriden gelir, affix yalnız ölçülen kahramana gider, aynı seed aynı sonuç, satır biçimi sabit.
import { describe, expect, it } from 'vitest';
import { ITEMS, affixValues, itemRecovery, loadout, type Equipment } from '../src/progression';
import { MEASURE_SLOT, ROW_HEADER, affixUsable, baseKit, buildResult, chapterForIlvl, defaultOptions, endlessWindow, formatReport, formatRow, jobsFor, pairedDiff, planEntries, runSeed, withAffix, type MeasureOptions, type SeedMetrics } from '../src/sim/affix-measure';

const tiny = (over: Partial<MeasureOptions> = {}): MeasureOptions => ({ ...defaultOptions(), seeds: 2, affixes: ['a_gdmg'], types: ['front'], ilvls: [10], envs: ['endless'], waves: 2, battles: 1, ...over });

describe('affix ölçüm aracı', () => {
  it('liste veriden gelir; her affix planda', () => {
    const plan = planEntries(defaultOptions());
    expect(new Set(plan.map((p) => p.affix))).toEqual(new Set(Object.keys(ITEMS.affixDefs)));
  });

  it('yaramayan affix "uygun değil": koşulmaz, üç tipe de yaramayan yedek sınıfta ölçülür', () => {
    expect(affixUsable('warrior', 'c_fire')).toBe(false);
    expect(affixUsable('mage', 'c_fire')).toBe(true);
    const plan = planEntries({ ...defaultOptions(), affixes: ['c_dark'] });
    expect(plan.filter((p) => p.type !== 'alt').every((p) => !p.usable)).toBe(true);
    const alt = plan.find((p) => p.type === 'alt')!;
    expect(alt.usable).toBe(true);
    expect(alt.team).toContain(alt.cls);
    const fireJobs = jobsFor(tiny({ affixes: ['c_fire'], types: ['front', 'back'] }));
    expect(fireJobs.filter((j) => j.affix).map((j) => j.type)).toEqual(['back']);
  });

  it('affix yalnız eklenir, temel takım değişmez; savaş dışı affix de item üstünden okunur', () => {
    const kit = baseKit('warrior', 4, 'uncommon', 'h1');
    const before = loadout({ class: 'warrior', equipment: kit as Equipment }).affixes.map((a) => a.id);
    const eq = withAffix(kit, 'a_recovery', 1, 30);
    expect(kit[MEASURE_SLOT]).toBeUndefined();
    // değer ölçülen ilvl'den gelir, temel takımın seviyesinden değil
    expect(loadout({ class: 'warrior', equipment: eq as Equipment }).affixes.find((a) => a.id === 'a_recovery')!.values).toEqual(affixValues('a_recovery', 30, 0.5));
    expect(loadout({ class: 'warrior', equipment: eq as Equipment }).affixes.map((a) => a.id).sort()).toEqual([...before, 'a_recovery'].sort());
    expect(itemRecovery({ class: 'warrior', equipment: eq as Equipment })).toBeGreaterThan(0);
    expect(itemRecovery({ class: 'warrior', equipment: kit as Equipment })).toBe(0);
    expect(loadout({ class: 'warrior', equipment: kit as Equipment }).affixes.map((a) => a.id)).toEqual(before);
  });

  it('dilimler item seviyesine denk gelir', () => {
    expect(chapterForIlvl(10).map).toBe('valdoria');
    expect(chapterForIlvl(30).map).toBe('hollow-crown');
    const w = endlessWindow(30, 10);
    expect(w.last - w.first + 1).toBe(10);
    expect(w.first).toBeLessThanOrEqual(28);
    expect(w.last).toBeGreaterThanOrEqual(28);
  });

  it('eşli fark: ortalama ve güven aralığı', () => {
    expect(pairedDiff([2, 2], [1, 1])).toEqual({ mean: 1, ci: 0 });
    expect(pairedDiff([3, 1], [1, 1]).mean).toBe(1);
    expect(pairedDiff([3, 1], [1, 1]).ci).toBeGreaterThan(0);
  });

  it('belirlilik: aynı seed aynı sonuç (iki ortam)', () => {
    const o = tiny();
    const team = ['warrior', 'mage', 'paladin', 'archer'];
    expect(runSeed('endless', team, 10, 3, o, 'a_gdmg', 0)).toEqual(runSeed('endless', team, 10, 3, o, 'a_gdmg', 0));
    expect(runSeed('campaign', team, 10, 3, o, 'a_gdmg', 0)).toEqual(runSeed('campaign', team, 10, 3, o, 'a_gdmg', 0));
  });

  it('çıktı biçimi: satırlar başlıkla aynı sütunda, uygun değil yazar', () => {
    const o = tiny({ affixes: ['a_gdmg', 'c_fire'], envs: ['endless'] });
    const m = (score: number): SeedMetrics => ({ score, win: 50, turns: 20, gold: 100 + score, xp: [10, 10, 10, 10] });
    const data: Record<string, SeedMetrics[]> = {};
    for (const j of jobsFor(o)) data[j.key] = [m(j.affix ? 50 : 40), m(j.affix ? 62 : 40)];
    const res = buildResult(o, data, 5);
    const cols = ROW_HEADER.split('|').length;
    for (const r of res.rows) expect(formatRow(r).split('|').length).toBe(cols);
    const fire = res.rows.find((r) => r.affix === 'c_fire')!;
    expect(fire.usable).toBe(false);
    expect(formatRow(fire)).toContain('uygun değil');
    const dmg = res.rows.find((r) => r.affix === 'a_gdmg')!;
    expect(dmg.diff).toBe(16);
    expect(dmg.perIp).toBeCloseTo(16 / dmg.ip, 3);
    expect(res.extremes[0]!.strongest.map((r) => r.affix)).toEqual(['a_gdmg']);
    expect(res.baselines).toEqual([{ env: 'endless', ilvl: 10, team: ['warrior', 'mage', 'paladin', 'archer'], score: 40, win: 50, turns: 20 }]);
    expect(formatReport(res)).toContain('IP başına en güçlü');
    expect(JSON.parse(JSON.stringify(res)).rows.length).toBe(res.rows.length);
  });
});
