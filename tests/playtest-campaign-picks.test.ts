import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  arrivalPreSteps,
  arrivalStepLines,
  autoResolve,
  debugTeleport,
  getMap,
  joinLevel,
  moveTo,
  newCampaign,
  nextStep,
  node,
  temporaryCompany,
  travelRoutes,
  victoryRecovery,
  victoryRecoveryNote,
  type CampaignState,
} from '../src/campaign';
import { LEVELS } from '../src/progression/levels';
import { levelBannerSummary } from '../src/ui/level-banner';
import { REGION_VIEW, hudClear } from '../src/game/region-view';

// Playtest 2026-10-23 seçimleri, sefer tarafı (docs/design/playtest-2026-10-23-picks.md): U1, U3, U8, H2, H3, D6, D12.

const map = getMap('valdoria');
const fresh = (seed = 21): CampaignState => newCampaign({ mode: 'normal', seed });
function finish(s: CampaignState): CampaignState {
  let t = s;
  for (let g = 0; g < 30 && nextStep(t).kind !== 'move' && nextStep(t).kind !== 'complete'; g++) t = autoResolve(t);
  return t;
}

describe('H3 / H2: düğüm kartının "First" satırı', () => {
  it('Ravenwood (yoldaş önce), Ashford (veda + bölük); adım bitince boş', () => {
    const s = finish(fresh());
    expect(arrivalPreSteps(s, '2')).toEqual(['recruit']);
    expect(arrivalPreSteps(s, '4')).toEqual(['farewell', 'company']);
    expect(arrivalPreSteps(s, 'cairn')).toEqual([]);
    expect(arrivalStepLines(s, '4')).toEqual([CONFIG.texts['stepFarewell'], CONFIG.texts['stepCompany']]);
    const after = finish(debugTeleport(fresh(), '4'));
    expect(arrivalPreSteps(after, '4')).toEqual([]);
  });

  it('veda uyarısı ve geçici kadro: metinler veride, tutorial kadrosu Ashford\'a kadar', () => {
    expect(CONFIG.texts['stepFarewell']).toMatch(/stays behind/);
    expect(CONFIG.texts['stepCompany']).toBe('Form your company.');
    expect(CONFIG.texts['tutorialCompany']).toBe('Temporary company');
    expect(temporaryCompany(finish(fresh()))).toBe(true);
    expect(temporaryCompany(finish(debugTeleport(fresh(), '4')))).toBe(false);
  });
});

describe('D6: zafer toparlanması notu ve Hillside Camp', () => {
  it('oran veriden (normal / elit / boss), metin yüzdeyi yazar', () => {
    const s = finish(debugTeleport(fresh(), '4'));
    expect(victoryRecovery({ ...s, at: 'cairn' })).toBe(CONFIG.rules.victoryHeal);
    expect(victoryRecovery({ ...s, at: '3' })).toBe(CONFIG.rules.eliteVictoryHeal);
    expect(victoryRecovery({ ...s, at: '9' })).toBe(CONFIG.rules.bossVictoryHeal);
    expect(victoryRecoveryNote(0.25)).toBe('After the victory the living recover 25% health.');
    expect(victoryRecoveryNote(1)).toBe(CONFIG.texts['victoryRecoveryFull']);
    expect(victoryRecoveryNote(0)).toBeNull();
  });

  it('Cairn Hill cebi: ücretsiz dinlenme noktası, rotaya / seçim noktasına girmez', () => {
    const n = node(map, 'hillcamp');
    expect([n.type, n.region, n.optional, n.rest]).toEqual(['rest', 'I', true, true]);
    expect(map.edges.find((e) => e.to === 'hillcamp')).toMatchObject({ from: 'cairn', style: 'dashed' });
    let s = finish(debugTeleport(fresh(), '4'));
    s = finish(moveTo(finish(moveTo(s, 'hills')), 'cairn'));
    expect(travelRoutes(s).has('hillcamp')).toBe(true);
    s = moveTo(s, 'hillcamp');
    expect(nextStep(s)).toEqual({ kind: 'rest', node: 'hillcamp' });
  });
});

describe('D12: yoldaş takımın ortalama level\'ında', () => {
  it('joinBelow 0: ortalama (aşağı yuvarlanır)', () => {
    expect(LEVELS.joinBelow).toBe(0);
    const s = finish(debugTeleport(fresh(), '4'));
    const lv = (n: number): CampaignState => ({ ...s, roster: s.roster.map((h) => ({ ...h, level: n })) });
    expect(joinLevel(lv(3))).toBe(3);
    expect(joinLevel(lv(1))).toBe(1);
  });
});

describe('U3: tek birleşik level şeridi', () => {
  const l = (name: string, to: number, points = 1, healed = true) => ({ name, to, gained: 1, points, healed });
  it('takımın hepsi aynı level: "Company reached Lv 3 · 1 stat point each · fully healed"', () => {
    expect(levelBannerSummary([l('Defender', 3), l('Mage', 3), l('Paladin', 3)], 3)).toBe('Company reached Lv 3 · 1 stat point each · fully healed');
  });
  it('bir kısmı / farklı level / tek kahraman', () => {
    expect(levelBannerSummary([l('Mage', 3, 2), l('Paladin', 3, 2, false)], 3)).toBe('Mage and Paladin reached Lv 3 · 2 stat points each');
    expect(levelBannerSummary([l('Mage', 3), l('Druid', 2, 3)], 2)).toBe('Company: Mage Lv 3, Druid Lv 2 · stat points to spend · fully healed');
    expect(levelBannerSummary([l('Warrior', 2, 3)], 3)).toBe('Warrior reached Level 2 · 3 stat points · fully healed');
    expect(levelBannerSummary([], 3)).toBe('');
  });
});

describe('U1: bölge görünümünde üst HUD bandı', () => {
  // Kamera artık görselin üstüne taşmaz (Harita 2 playtest 2026-10-25, siyah şerit); üst bandın ortasındaki durak HUD altında sayılır,
  // regionCamera / clearMid onu kaydırma ya da yakınlaşmayla dışarı alır (tests/region-camera.test.ts).
  it('üst orta kutudaki durak HUD altında; yanındaki değil', () => {
    const ins = { left: 396, top: REGION_VIEW.hudTop, right: 0, bottom: 104, topHalfW: REGION_VIEW.hudTopHalfW, bottomW: 220 };
    expect(hudClear({ x: 960, y: 80 }, { x: 960, y: 540 }, 1, { w: 1920, h: 1080 }, ins)).toBe(false);
    expect(hudClear({ x: 1500, y: 80 }, { x: 960, y: 540 }, 1, { w: 1920, h: 1080 }, ins)).toBe(true);
    expect(REGION_VIEW.hudTop).toBeGreaterThan(100);
  });
});
