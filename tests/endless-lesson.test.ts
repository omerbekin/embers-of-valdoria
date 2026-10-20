// Veteran's Lesson (Ömer 2026-10-20): elit dalga sonrası iyileştirme kartı (Field Surgeon) kalktı, yerine XP kartı.
import { describe, expect, it } from 'vitest';
import endlessJson from '../data/endless.json';
import { ENDLESS, cardText, cardTitle, chooseReward, lessonXp, newRun, parseRun, rewardOffer, SAVE_VERSION, type EndlessRun } from '../src/endless';
import { LEVELS, xpToNext } from '../src/progression/levels';

const fresh = (): EndlessRun => newRun(21, ['warrior', 'archer', 'mage', 'druid'], '2026-10-20T00:00:00.000Z');
const after = (cleared: number, run: EndlessRun = fresh()): EndlessRun => ({ ...run, wave: cleared + 1, phase: 'reward', stats: { cleared, turns: 0, kills: 0 } });
const pick = (run: EndlessRun, kind: string): number => (run.offer ?? []).findIndex((c) => c.kind === kind);
const withOffer = (run: EndlessRun): EndlessRun => ({ ...run, offer: rewardOffer(run) });

describe("endless: Veteran's Lesson (elit sonrası XP kartı)", () => {
  it('veri: special.elite.xpRatio 0,3; eski healRatio kalktı; normal kart %20 aynen', () => {
    expect(endlessJson.special.elite.xpRatio).toBe(0.3);
    expect('healRatio' in endlessJson.special.elite).toBe(false);
    expect(endlessJson.rewards.healRatio).toBe(0.2);
  });

  it('elit dalgada iyileştirme kartı yok, XP kartı var; normal dalgada Tend the Wounded aynen; boss Feast', () => {
    const elite = rewardOffer(after(5));
    expect(elite.find((c) => c.kind === 'heal')).toBeUndefined();
    expect(elite.find((c) => c.kind === 'xp')).toEqual({ kind: 'xp', ratio: ENDLESS.special.elite.xpRatio });
    const normal = rewardOffer(after(4));
    expect(normal.find((c) => c.kind === 'heal')).toEqual({ kind: 'heal', ratio: ENDLESS.rewards.healRatio });
    expect(normal.find((c) => c.kind === 'xp')).toBeUndefined();
    const boss = rewardOffer(after(10));
    expect(boss.some((c) => c.kind === 'feast')).toBe(true);
    expect(boss.some((c) => c.kind === 'xp' || c.kind === 'heal')).toBe(false);
  });

  it('kart metni İngilizce ve orandan', () => {
    const c = { kind: 'xp', ratio: 0.3 } as const;
    expect(cardTitle(c)).toBe("Veteran's Lesson");
    expect(cardText(c)).toBe('Every hero gains 30% of the experience needed for their next level.');
    expect(cardTitle({ kind: 'heal', ratio: 0.6 })).toBe('Tend the Wounded');
  });

  it('XP = bulunduğu level eşiği x 0,3; ayaktakiler (yaralılar dahil) alır, ceset almaz', () => {
    const base = fresh();
    base.heroes[0]!.level = 3;
    base.heroes[0]!.xp = 0;
    base.heroes[1]!.level = 7;
    base.heroes[1]!.xp = 5;
    base.heroes[1]!.wounds = 1;
    base.heroes[1]!.hpRatio = 0.1;
    base.heroes[2]!.hpRatio = 0; // ceset
    base.heroes[2]!.level = 4;
    base.heroes[2]!.xp = 2;
    const r = withOffer(after(5, base));
    const s = chooseReward(r, pick(r, 'xp'));
    expect(s.heroes[0]!.xp).toBe(Math.round(xpToNext(3) * 0.3));
    expect(s.heroes[0]!.level).toBe(3);
    expect(s.heroes[1]!.xp).toBe(5 + Math.round(xpToNext(7) * 0.3));
    expect(s.heroes[1]!.hpRatio).toBe(0.1); // level atlamadı: şifa yok
    expect(s.heroes[2]!).toMatchObject({ level: 4, xp: 2, hpRatio: 0 });
    expect(s.offer).toBeUndefined();
    expect(s.phase === 'ready' || s.phase === 'shop').toBe(true);
  });

  it('level atlatır: eşiğe yakın kahraman bir üst level, artan XP taşınır, tam can, levelUps kaydı, puanlar', () => {
    const base = fresh();
    const h = base.heroes[0]!;
    h.level = 5;
    h.xp = xpToNext(5) - 10;
    h.hpRatio = 0.4;
    const sp = h.statPoints ?? 0;
    const r = withOffer(after(5, base));
    const s = chooseReward(r, pick(r, 'xp'));
    const gain = Math.round(xpToNext(5) * 0.3);
    expect(s.heroes[0]!.level).toBe(6);
    expect(s.heroes[0]!.xp).toBe(gain - 10);
    expect(s.heroes[0]!.hpRatio).toBe(1);
    expect((s.heroes[0]!.statPoints ?? 0)).toBeGreaterThan(sp);
    expect(s.levelUps?.find((u) => u.heroId === h.id)).toMatchObject({ from: 5, to: 6 });
  });

  it('tavandaki kahraman XP almaz; lessonXp cesette 0', () => {
    const base = fresh();
    base.heroes[0]!.level = LEVELS.maxLevel;
    base.heroes[0]!.xp = 0;
    expect(lessonXp(base.heroes[0]!, 0.3)).toBe(0);
    expect(lessonXp({ ...base.heroes[1]!, hpRatio: 0 }, 0.3)).toBe(0);
    const r = withOffer(after(5, base));
    const s = chooseReward(r, pick(r, 'xp'));
    expect(s.heroes[0]!).toMatchObject({ level: LEVELS.maxLevel, xp: 0 });
  });

  it('eski kayıt: bekleyen %60 iyileştirme kartı bozulmadan okunur ve seçilince şifa verir', () => {
    const base = after(5);
    base.heroes.forEach((h) => (h.hpRatio = 0.3));
    const old: EndlessRun = { ...base, offer: [{ kind: 'gold', amount: 10 }, { kind: 'heal', ratio: 0.6 }] };
    const loaded = parseRun(JSON.stringify({ version: SAVE_VERSION, run: old }));
    expect(loaded?.offer?.[1]).toEqual({ kind: 'heal', ratio: 0.6 });
    const s = chooseReward(loaded!, 1);
    expect(s.heroes.every((h) => Math.abs(h.hpRatio - 0.9) < 1e-9)).toBe(true);
  });
});
