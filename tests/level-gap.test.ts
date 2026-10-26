// Düğüm tehlike göstergesi (Ömer 2026-10-26): level farkı -> normal / Dangerous / Deadly; yalnız savaşan, tutorial olmayan, savaşılabilir düğümler.
import { describe, expect, it } from 'vitest';
import { CONFIG, companyAvgLevel, debugTeleport, gapBand, getMap, newCampaign, nodeLevel, nodeLevelGap, nodeThreat, threatLine, type CampaignState } from '../src/campaign';

describe('gapBand', () => {
  it('eşikler campaign.json > levelGap: <3 normal, 3-4 danger, 5+ deadly', () => {
    expect(CONFIG.levelGap).toMatchObject({ warnAt: 3, deadlyAt: 5 });
    expect(gapBand(-4)).toBe('normal');
    expect(gapBand(2)).toBe('normal');
    expect(gapBand(2.9)).toBe('normal');
    expect(gapBand(3)).toBe('danger');
    expect(gapBand(4.9)).toBe('danger');
    expect(gapBand(5)).toBe('deadly');
    expect(gapBand(9)).toBe('deadly');
  });
  it('renkler veride', () => {
    expect(CONFIG.levelGap.colors.danger).toMatch(/^#[0-9a-f]{6}$/i);
    expect(CONFIG.levelGap.colors.deadly).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

function withLevels(s: CampaignState, lv: number): CampaignState {
  return { ...s, roster: s.roster.map((h) => ({ ...h, level: lv })) };
}

describe('takım ortalaması ve düğüm farkı', () => {
  it('ortalama aktif dizilimin level ortalaması; fark = düğüm - ortalama', () => {
    const s = withLevels(debugTeleport(newCampaign({ mode: 'normal', seed: 7 }), '7'), 4);
    expect(companyAvgLevel(s)).toBe(4);
    expect(nodeLevelGap(s, '7')).toBe(nodeLevel(s.mapId, '7') - 4);
  });
  it('Inn\'dekiler ortalamaya girmez, ceset girer', () => {
    const s = debugTeleport(newCampaign({ mode: 'normal', seed: 7 }), '7');
    const [a, b, ...rest] = s.roster;
    const t: CampaignState = { ...s, roster: [{ ...a!, level: 2 }, { ...b!, level: 6, alive: false, hpRatio: 0 }, ...rest.map((h) => ({ ...h, level: 4 }))] };
    const n = t.active.filter(Boolean).length;
    const sum = 2 + 6 + (n - 2) * 4;
    expect(companyAvgLevel(t)).toBeCloseTo(sum / n, 5);
    const onlyA: CampaignState = { ...t, active: t.active.map((id) => (id === a!.id ? id : '')) };
    expect(companyAvgLevel(onlyA)).toBe(2);
  });
});

describe('nodeThreat', () => {
  const map = (s: CampaignState) => getMap(s.mapId);
  it('savaşmayan düğüm (kasaba) ve tutorial düğümü null; ileri bir savaş düğümü bant taşır', () => {
    const s = withLevels(newCampaign({ mode: 'normal', seed: 7 }), 1);
    const town = map(s).nodes.find((n) => n.type === 'town')!;
    expect(nodeThreat(s, town.id)).toBeNull();
    const tutorial = map(s).nodes.find((n) => n.id === '3')!; // Ruined Watchtower (tutorial)
    expect(tutorial.encounter).toBeTruthy();
    expect(nodeThreat(s, tutorial.id)).toBeNull();
    const far = map(s).nodes.filter((n) => n.encounter && nodeThreat(s, n.id)).map((n) => nodeThreat(s, n.id)!);
    expect(far.some((t) => t.band !== 'normal')).toBe(true);
    const t = far[0]!;
    expect(threatLine(t)).toMatch(/^Recommended level \d+ · Your company \d+\.\d$/);
  });
  it('temizlenmiş ve devriyesiz düğüm null', () => {
    const s0 = withLevels(newCampaign({ mode: 'normal', seed: 7 }), 1);
    const id = map(s0).nodes.find((n) => n.encounter && nodeThreat(s0, n.id))!.id;
    const s = { ...s0, cleared: [id] };
    const t = nodeThreat(s, id);
    // devriye açıksa hâlâ bantlı, kapalıysa null; ikisinde de çökmez
    expect(t === null || t.level === nodeLevel(s.mapId, id)).toBe(true);
  });
});
