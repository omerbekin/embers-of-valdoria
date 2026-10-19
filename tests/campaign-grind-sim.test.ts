import { describe, expect, it } from 'vitest';
import { autoResolve, canReplay, debugSetLevel, debugTeleport, getMap, newCampaign, nextStep, node } from '../src/campaign';
import { equalAllocateAll, pickFarm, simulateGrind } from '../src/sim/campaign-grind';
import { grindBand, parseWallCap } from '../src/sim/campaign-grind-report';
import { CAMPAIGN_TARGETS } from '../src/sim/campaign-targets';

// Sefer kasma simülatörü (src/sim/campaign-grind.ts): oyuncu kararlarının iç tutarlılığı. Denge ölçümü değil (npm run sim:campaign).
const map = getMap('valdoria');

describe('sefer kasma simülatörü', () => {
  it('duvar sınırı: varsayılan zorluk başına hedef bloğundan, --wall-cap hepsini ya da zorluk başına ezer', () => {
    expect(parseWallCap(undefined)).toEqual(CAMPAIGN_TARGETS.wallCap);
    expect(parseWallCap('7')).toEqual({ easy: 7, medium: 7, hard: 7 });
    expect(parseWallCap('hard:30')).toEqual({ ...CAMPAIGN_TARGETS.wallCap, hard: 30 });
  });

  it('ortalama oyuncunun kasma bandı üst sınırı x(1 + averageGrindExtra)', () => {
    const b = CAMPAIGN_TARGETS.grind.medium.boss;
    expect(grindBand('medium', 'boss', 'good')).toEqual(b);
    expect(grindBand('medium', 'boss', 'average')[1]).toBeCloseTo(b[1] * (1 + CAMPAIGN_TARGETS.averageGrindExtra));
  });

  it('ortalama oyuncu stat puanlarını dört stata eşit dağıtır', () => {
    const s = equalAllocateAll(debugSetLevel(newCampaign({ mode: 'normal', seed: 3 }), 12));
    for (const h of s.roster) {
      const v = (['str', 'dex', 'int', 'luck'] as const).map((k) => h.alloc?.[k] ?? 0);
      expect(h.statPoints ?? 0).toBe(0);
      expect(Math.max(...v) - Math.min(...v)).toBeLessThanOrEqual(1);
    }
  });

  it('kasma yeri: temizlenmiş tekrar oynanabilir düğüm; orada hep kaybeden başka yere geçer', () => {
    let s = debugTeleport(newCampaign({ mode: 'normal', seed: 5 }), 'cairn');
    while (nextStep(s).kind !== 'move') s = autoResolve(s);
    const f = pickFarm(s)!;
    expect(f).toBeTruthy();
    expect(canReplay(map, node(map, f))).toBe(true);
    const other = pickFarm(s, new Map([[f, { w: 0, n: 200 }]]));
    expect(other).not.toBe(f);
  });

  it('koşu sayaçları tutarlı: kasma savaşları düğümlere dağılır, düğüm başına en çok duvar sınırı kadar', () => {
    const wallCap = 2;
    const r = simulateGrind({ difficulty: 'hard', player: 'average', runs: 1, firstSeed: 11, wallCap, retries: 0, preGrind: 2 });
    const nodes = Object.values(r.nodes);
    expect(r.runs).toBe(1);
    expect(nodes.reduce((a, n) => a + n.farmBattles, 0)).toBe(r.grindBattles + r.preGrindBattles);
    expect(nodes.reduce((a, n) => a + n.grindSum + n.grindWall, 0)).toBe(r.grindBattles);
    expect(r.battles).toBe(nodes.reduce((a, n) => a + n.battles + n.farmBattles, 0));
    for (const n of nodes) expect(n.grindSum + n.grindWall).toBeLessThanOrEqual(wallCap * Math.max(1, n.reached));
    expect(r.walls + r.completed).toBeLessThanOrEqual(1);
  });
});
