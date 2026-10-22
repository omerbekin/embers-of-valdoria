import { describe, expect, it } from 'vitest';
import { getMap } from '../src/campaign';
import { allRoutes, categoryFirstWin, routeLabel, simulateCampaign, type NodeCategory } from '../src/sim/campaign';
import campaignBalance from '../data/campaign/balance.json';

// Sefer zorluk eğrisi (docs/balance.md > Sefer dengesi): Medium zorluk, oyuncu vekili Medium YZ, seed'li küçük örnek.
// Bant = data/campaign/balance.json > targets.medium ± test.tolerance (örnek küçük). Tam ölçüm: npm run sim:campaign.
const T = campaignBalance.test;
const target = campaignBalance.targets.medium as unknown as Record<NodeCategory, [number, number]>;
// Valor açık (gerçek oyun; Ömer 2026-10-13 form valor2: düşmanlar Valor'lu oyuna göre güçlendirildi, bantlar Valor'lu ölçülür).
const result = simulateCampaign({ difficulty: 'medium', player: 'medium', runs: T.runs, firstSeed: T.firstSeed });
const cat = categoryFirstWin(result);

/**
 * BİLİNEN EKSİK (geçici muafiyet; normalde BOŞ): listedeki kategorinin ÜST sınırı denetlenmez (uyarı yazılır); alt sınır ve diğer kontroller aynen.
 * Sefer denge turunda listeden çıkarılır (campaign-difficulty.test.ts > PENDING_ORDER_GAPS ile aynı kalıp).
 */
export const PENDING_CATEGORY_HIGH: Readonly<Record<string, string>> = {};

describe(`sefer zorluk eğrisi (Medium, ${T.runs} sefer, seed ${T.firstSeed})`, () => {
  for (const c of ['tutorial', 'normal', 'elite', 'boss'] as NodeCategory[]) {
    const [lo, hi] = target[c];
    it(`${c} düğümleri ilk denemede %${lo - T.tolerance}-${Math.min(100, hi + T.tolerance)} kazanılıyor`, () => {
      expect(cat[c], `${c} %${cat[c].toFixed(1)}`).toBeGreaterThanOrEqual(lo - T.tolerance);
      if (c in PENDING_CATEGORY_HIGH) {
        if (cat[c] > hi + T.tolerance) console.warn(`[campaign-balance] BİLİNEN EKSİK: ${c} %${cat[c].toFixed(1)} > ${hi + T.tolerance} (üst sınır muaf: PENDING_CATEGORY_HIGH)`);
        return;
      }
      expect(cat[c], `${c} %${cat[c].toFixed(1)}`).toBeLessThanOrEqual(hi + T.tolerance);
    });
  }

  it('eğri iner: tutorial > normal > elit (boss düğümleri dinlenmeden sonra gelir; Ömer 2026-10-11 denge paketi)', () => {
    expect(cat.tutorial).toBeGreaterThan(cat.normal);
    expect(cat.normal).toBeGreaterThan(cat.elite);
  });

  it(`sefer bitirme oranı hedefte (Medium %${campaignBalance.finish.medium[0]}-${campaignBalance.finish.medium[1]} ± ${T.tolerance})`, () => {
    const finish = (100 * result.completed) / result.runs;
    expect(finish, `bitirme %${finish.toFixed(1)}`).toBeGreaterThanOrEqual(campaignBalance.finish.medium[0]! - T.tolerance);
    expect(finish, `bitirme %${finish.toFixed(1)}`).toBeLessThanOrEqual(campaignBalance.finish.medium[1]! + T.tolerance);
  });

  it('tüm rotalar oynandı ve her savaşlı ana yol düğümü ölçüldü (cepler simde oynanmaz: serbest dolaşım yok)', () => {
    const map = getMap('valdoria');
    expect(Object.keys(result.routes).sort()).toEqual(allRoutes(map).map((r) => routeLabel(map, r)).sort());
    for (const n of map.nodes.filter((x) => x.encounter && !x.optional)) expect(result.nodes[n.id]?.reached, n.id).toBeGreaterThan(0);
  });
});
