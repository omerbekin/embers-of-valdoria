// Endless denge eğrisi (hafif): seed'li küçük örnekte simülatör (src/sim/endless.ts) hedef bantların içinde kalır.
// Hedefler ve tolerans: data/endless.json > balance. Tam rapor: npm run sim:endless -- 6000 (geç boss'lar çok koşu ister).
import { describe, expect, it } from 'vitest';
import { ENDLESS } from '../src/endless';
import { keyMetrics, simulateEndless, summarize } from '../src/sim/endless';

interface Balance {
  targets: { earlyMinWin: [number, number]; bossWin: Record<string, [number, number]>; mean: [number, number] };
  test: { runs: number; firstSeed: number; maxWave: number; tolerance: { earlyMinWin: number; bossWin: number; mean: number } };
}
const BAL = (ENDLESS as unknown as { balance: Balance }).balance;
const T = BAL.test;

describe('endless balance (seeded sample)', () => {
  const res = simulateEndless({ runs: T.runs, firstSeed: T.firstSeed, maxWave: T.maxWave });
  const k = keyMetrics(res);

  it('is deterministic for the same seeds', () => {
    const again = simulateEndless({ runs: 4, firstSeed: T.firstSeed, maxWave: T.maxWave });
    expect(again.runs.map((r) => r.reached)).toEqual(res.runs.slice(0, 4).map((r) => r.reached));
  });

  it('keeps the curve inside the target bands', () => {
    const msg = JSON.stringify(k);
    expect(k.earlyMinWin, msg).toBeGreaterThanOrEqual(BAL.targets.earlyMinWin[0] - T.tolerance.earlyMinWin);
    // İlk boss: bant ± tolerans (örnek küçük; sonraki boss'lara 48 koşuda çok az koşu ulaşır, onlar sim:endless ile ölçülür)
    const [b0, b1] = BAL.targets.bossWin[String(ENDLESS.bossEvery)]!;
    expect(k.firstBossWin, msg).toBeGreaterThanOrEqual(b0 - T.tolerance.bossWin);
    expect(k.firstBossWin, msg).toBeLessThanOrEqual(b1 + T.tolerance.bossWin);
    const [m0, m1] = BAL.targets.mean;
    expect(k.mean, msg).toBeGreaterThanOrEqual(m0 - T.tolerance.mean);
    expect(k.mean, msg).toBeLessThanOrEqual(m1 + T.tolerance.mean);
  });

  it('boss targets step down ~10 points per boss (data)', () => {
    const waves = Object.keys(BAL.targets.bossWin).map(Number).sort((a, b) => a - b);
    expect(waves[0]).toBe(ENDLESS.bossEvery);
    for (let i = 1; i < waves.length; i++) {
      expect(waves[i]! - waves[i - 1]!).toBe(ENDLESS.bossEvery);
      expect(BAL.targets.bossWin[String(waves[i - 1])]![0] - BAL.targets.bossWin[String(waves[i])]![0]).toBe(10);
    }
  });

  it('survival only goes down and the boss is the first big drop', () => {
    const s = summarize(res);
    for (let w = 2; w < s.survival.length; w++) expect(s.survival[w]!).toBeLessThanOrEqual(s.survival[w - 1]!);
    // 10. dalganın kazanma oranı ilk 9 dalganın hepsinden düşük (boss = ilk ciddi sınav)
    const early = s.winRate.slice(1, ENDLESS.bossEvery).filter((v) => !Number.isNaN(v));
    expect(s.winRate[ENDLESS.bossEvery]!).toBeLessThan(Math.min(...early));
  });
});
