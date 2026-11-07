import { describe, expect, it } from 'vitest';
import { PLAY_STEP_CAP_MS, activeHeroes, addPlayTime, applyBattle, debugTeleport, newCampaign, normalizeState, playTimeText, earnGold, type CampaignState } from '../src/campaign';

// Sefer defteri (Ömer 2026-11-07 endstats): kazanılan altın, oynama süresi, düşen kahraman; isteğe bağlı alanlar, eski kayıt 0
const at = (node: string): CampaignState => debugTeleport(newCampaign({ mode: 'normal', seed: 5 }), node);

describe('sefer defteri', () => {
  it('eski kayıt (alan yok) okunur, sayaçlar 0 sayılır; bozuk değer atılır', () => {
    const s = at('moor');
    const old = JSON.parse(JSON.stringify(s)) as CampaignState;
    delete old.stats.goldEarned;
    delete old.stats.playMs;
    delete old.stats.fallen;
    const n = normalizeState(old)!;
    expect(n).toBeTruthy();
    expect(n.stats.goldEarned ?? 0).toBe(0);
    const bad = normalizeState({ ...old, stats: { ...old.stats, goldEarned: -5, playMs: 'x', fallen: 2.6 } })!;
    expect(bad.stats.goldEarned).toBeUndefined();
    expect(bad.stats.playMs).toBeUndefined();
    expect(bad.stats.fallen).toBe(3);
  });

  it('altın kazancı sayılır, harcama sayılmaz', () => {
    const t = JSON.parse(JSON.stringify(at('moor'))) as CampaignState;
    const g0 = t.gold;
    const e0 = t.stats.goldEarned ?? 0;
    earnGold(t, 40);
    earnGold(t, -10);
    expect(t.gold).toBe(g0 + 40);
    expect(t.stats.goldEarned).toBe(e0 + 40);
  });

  it('zafer loot altını ve savaşı düşmüş bitiren kahraman deftere yazılır', () => {
    const s = at('moor');
    const [a] = activeHeroes(s);
    const out = applyBattle(s, { victory: true, units: activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: h.id === a!.id ? 0 : 0.5, alive: h.id !== a!.id })) });
    expect((out.stats.goldEarned ?? 0) - (s.stats.goldEarned ?? 0)).toBe(out.gold - s.gold);
    expect((out.stats.fallen ?? 0) - (s.stats.fallen ?? 0)).toBe(1);
  });

  it('oynama süresi: adım başına üst sınır; yazı', () => {
    const s = at('moor');
    expect(addPlayTime(s, 60_000).stats.playMs).toBe(60_000);
    expect(addPlayTime(s, 10 * PLAY_STEP_CAP_MS).stats.playMs).toBe(PLAY_STEP_CAP_MS);
    expect(addPlayTime(s, -5)).toBe(s);
    expect([playTimeText(undefined), playTimeText(45 * 60_000), playTimeText((3 * 60 + 12) * 60_000)]).toEqual(['0m', '45m', '3h 12m']);
  });
});
