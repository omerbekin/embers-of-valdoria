import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/campaign';
import { simulateCampaign } from '../src/sim/campaign';
import { simulateGrind } from '../src/sim/campaign-grind';
import { grindReport } from '../src/sim/campaign-grind-report';

// Sefer simülatörü harita seçimi (--map): Harita 1 ölçümü aynen kalır, Harita 2 her koşuda Harita 1'den zincirle taşınan takımla oynanır.
// Yavaş (Harita 1 + Harita 2 tam koşu): vitest.slow-list.ts.
const H1 = CONFIG.maps[0]!;
const H2 = 'drowned-reach';
const meta = { runs: 1, firstSeed: 3, secs: 0, opts: { retries: 2, grindStep: 1, onWall: 'stop', healAt: 0.5 }, caps: { easy: 5, medium: 10, hard: 20 } };

describe('sefer simi harita seçimi', () => {
  it('Harita 1: map verilmesi ya da verilmemesi aynı sonuç; sonuçta harita / taşıma alanı yok, rapor eskisi gibi', () => {
    const a = simulateGrind({ difficulty: 'medium', player: 'good', runs: 1, firstSeed: 3 });
    const b = simulateGrind({ difficulty: 'medium', player: 'good', runs: 1, firstSeed: 3, map: H1 });
    expect(b).toEqual(a);
    expect('map' in a || 'carry' in a).toBe(false);
    expect(grindReport([a], meta)).not.toContain('HARİTA:');
    const f = simulateCampaign({ difficulty: 'medium', player: 'medium', runs: 1, firstSeed: 3 });
    expect(simulateCampaign({ difficulty: 'medium', player: 'medium', runs: 1, firstSeed: 3, map: H1 })).toEqual(f);
    expect('map' in f || 'carry' in f).toBe(false);
  });

  it('Harita 2 (kasma modu): önce Harita 1 aynı seed ile oynanır, takım taşınır; sayaçlar yalnız Harita 2 düğümlerinin', () => {
    const h1 = simulateGrind({ difficulty: 'medium', player: 'good', runs: 1, firstSeed: 3, preGrind: 0 });
    const h2 = simulateGrind({ difficulty: 'medium', player: 'good', runs: 1, firstSeed: 3, preGrind: 0, map: H2 });
    expect(h2.map).toBe(H2);
    expect(h2.carry!.attempted).toBe(1);
    expect(h2.carry!.prevStopped).toBe(h1.completed ? 0 : 1);
    if (h1.completed) {
      expect(h2.runs).toBe(1);
      // Harita 2'nin başındaki level = aynı seed'li Harita 1 koşusunun son level'ı (zincir aynı koşuyu oynar)
      expect(h2.carry!.levelSum).toBeCloseTo(h1.levelEnd, 6);
      expect(h2.carry!.partySum).toBeGreaterThan(0);
      expect(Object.keys(h2.nodes).length).toBeGreaterThan(0);
      for (const id of Object.keys(h2.nodes)) expect(id.startsWith('dr')).toBe(true);
      const txt = grindReport([h2], meta);
      expect(txt).toContain('HARİTA:');
      expect(txt).toContain('BAŞLANGIÇ');
      expect(txt).toContain('KAHRAMAN KAYBI');
    }
  });

  it('Harita 2 (düz mod): takım Harita 1 sonundan taşınır, düğüm sayaçları yalnız Harita 2', () => {
    const r = simulateCampaign({ difficulty: 'medium', player: 'medium', runs: 1, firstSeed: 3, map: H2 });
    expect(r.map).toBe(H2);
    expect(r.runs).toBe(1);
    expect(r.carry!.attempted).toBe(1);
    expect(r.carry!.levelSum).toBeGreaterThan(1);
    for (const id of Object.keys(r.nodes)) expect(id.startsWith('dr')).toBe(true);
    expect(Object.values(r.classes).every((c) => c.heroRuns === 0)).toBe(true); // tutorial kahramanı ölçüsü yalnız Harita 1'de
  });
});
