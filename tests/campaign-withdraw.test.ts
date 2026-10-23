import { describe, expect, it } from 'vitest';
import { applyBattle, activeHeroes, autoResolve, canWithdraw, debugTeleport, isCleared, moveTo, newCampaign, nextStep, travelRoutes } from '../src/campaign';
import type { CampaignState } from '../src/campaign';

// Ömer 2026-10-23: Brackenridge'e yürüyüp Fight'a basmayınca başka düğüme gidilebilmeli (savaşa girmeden ayrılma)
describe('savaşa girmeden ayrılma', () => {
  it('fight edilmemiş Brackenridge düğümünden Ashford üzerinden başka yere gidilir, düğüm temizlenmemiş kalır', () => {
    let s = debugTeleport(newCampaign({ mode: 'normal', seed: 7 }), 'hills');
    expect(s.at).toBe('hills');
    expect(nextStep(s).kind).toBe('battle');
    expect(canWithdraw(s)).toBe(true);
    const routes = travelRoutes(s);
    expect(routes.has('4')).toBe(true); // geri: temizlenmiş Ashford
    expect(routes.has('cairn')).toBe(false); // ileri: savaş atlanmaz
    expect([...routes.keys()].length).toBeGreaterThan(1); // Ashford'un öteki yolları da
    s = moveTo(s, '4');
    expect(s.at).toBe('4');
    expect(isCleared(s, 'hills')).toBe(false);
    // geri dönünce savaş yine bekler
    s = moveTo(s, 'hills');
    expect(nextStep(s).kind).toBe('battle');
    s = applyBattle(s, { victory: true, units: activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: h.hpRatio, alive: true })) });
    expect(isCleared(s, 'hills')).toBe(true);
    expect(travelRoutes(s).has('cairn')).toBe(true);
  });

  it('ileriye (temizlenmemiş komşu) gidilemez', () => {
    const s = debugTeleport(newCampaign({ mode: 'normal', seed: 7 }), 'hills');
    expect(() => moveTo(s, 'cairn')).toThrow();
  });

  it('duraklatılmış savaşta kilit sürer', () => {
    const s = debugTeleport(newCampaign({ mode: 'normal', seed: 7 }), 'hills');
    const p = { ...s, suspended: { node: 'hills' } } as unknown as CampaignState;
    expect(canWithdraw(p)).toBe(false);
    expect(travelRoutes(p).size).toBe(0);
  });

  it('tutorial yolunda (serbest dolaşım kapalı) savaştan kaçılmaz', () => {
    let s = debugTeleport(newCampaign({ mode: 'normal', seed: 7 }), '2');
    for (let i = 0; i < 5 && nextStep(s).kind !== 'battle'; i++) s = autoResolve(s);
    expect(nextStep(s).kind).toBe('battle');
    expect(canWithdraw(s)).toBe(false);
    expect(travelRoutes(s).size).toBe(0);
  });
});
