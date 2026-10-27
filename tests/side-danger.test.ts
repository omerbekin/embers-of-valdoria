// Yan karşılaşma uyarısı (Ömer 2026-10-27): yol dışındaki savaş çevredeki ana yol savaşlarından belirgin güçlüyse kart söyler (yalnız bilgi).
import { describe, expect, it } from 'vitest';
import { newCampaign } from '../src/campaign';
import { CONFIG, getMap } from '../src/campaign/data';
import { battlePlan } from '../src/campaign/encounters';
import { isSideFight, planStrength, roadBaseline, sideBand, sideDanger, SIDE_DANGER_LINE } from '../src/campaign/side-danger';

const map1 = () => newCampaign({ mode: 'normal', seed: 1, difficulty: 'medium' });
const map2 = () => newCampaign({ mode: 'normal', seed: 1, mapId: 'drowned-reach', difficulty: 'medium' });

describe('side-danger', () => {
  it('eşikler veriden; bant sırası doğru', () => {
    const c = CONFIG.sideDanger;
    expect(c.ratio).toBeGreaterThan(1);
    expect(c.strongRatio).toBeGreaterThan(c.ratio);
    expect(sideBand(c.ratio - 0.01)).toBeNull();
    expect(sideBand(c.ratio)).toBe('stronger');
    expect(sideBand(c.strongRatio)).toBe('much');
    expect(SIDE_DANGER_LINE.stronger).toBe('Stronger than the road ahead');
  });

  it('yalnız yan düğümlere bakar: ana yol savaşı, boss ve yol üstü elit uyarı almaz', () => {
    const m = getMap('valdoria');
    const byId = (id: string) => m.nodes.find((n) => n.id === id)!;
    expect(isSideFight(byId('hoard'))).toBe(true);
    expect(isSideFight(byId('deserters'))).toBe(true); // isteğe bağlı elit
    expect(isSideFight(byId('moor'))).toBe(false);
    expect(isSideFight(byId('9'))).toBe(false);
    expect(isSideFight(byId('8C'))).toBe(false);
    const s = map1();
    for (const id of ['moor', 'hills', 'cairn', '9', '8C']) expect(sideDanger(s, id)).toBeNull();
  });

  it("Harita 1: Raiders' Hoard yoldan güçlü (ilk korunan hazine), Supply Wagons değil", () => {
    const s = map1();
    expect(sideDanger(s, 'hoard')).not.toBeNull();
    // Sunken Shrine: komşu ana yol savaşı Grave Field'ın Risen Skeleton'ları artık mob (2026-10-28, open-questions 448) ve güce sayılıyor;
    // eskiden çağrı oldukları için ölçüye girmiyordu. Shrine Grave Field'la aynı güçte (oran ~1,04), uyarı almaz.
    expect(sideDanger(s, 'shrine')).toBeNull();
    expect(sideDanger(s, 'wagons')).toBeNull();
  });

  it("Harita 2: Siren Queen's Rock (isteğe bağlı elit) uyarı alır", () => {
    expect(sideDanger(map2(), 'dr65')?.band).toBe('stronger');
  });

  it('güç ölçüsü düşman canı ve gücüyle artar; taban bir ana yol savaşının gücü', () => {
    const s = map1();
    const p = battlePlan({ ...s, at: 'hoard' });
    const base = planStrength(p);
    const up = structuredClone(p);
    for (const u of Object.values(up.units.enemies)) u.modifiers = { ...(u.modifiers ?? {}), hpMult: (u.modifiers?.hpMult ?? 1) * 1.5 };
    expect(planStrength(up)).toBeGreaterThan(base);
    expect(roadBaseline(s, 'hoard')).toBeGreaterThan(0);
  });
});
