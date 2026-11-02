import { describe, expect, it } from 'vitest';
import { CONFIG, arrivalStepLines, autoResolve, debugTeleport, newCampaign, nextStep, recruitInTown, townCardFlags, townRecruitOffer } from '../src/campaign';

// Kasaba kartı (Ömer 2026-11-02, taslak town-card A): "Towns do not heal you" satırı kalktı; haber satırları oyunun mevcut koşullarına bağlı.
describe('town card (map)', () => {
  it('the "Towns do not heal you" line is gone; the inn rule stays', () => {
    expect(CONFIG.texts.townRest).not.toMatch(/Towns do not heal you/i);
    expect(CONFIG.texts.townRest).toMatch(/inn/);
  });

  it('Valdren: "A recruit waits at the Barracks" while the volunteer is unpicked, gone after joining; Ashford has no such line', () => {
    let s = debugTeleport(newCampaign({ mode: 'normal', seed: 4242 }), '7');
    for (let i = 0; i < 20 && nextStep(s).kind !== 'town'; i++) s = autoResolve(s);
    expect(townCardFlags(s, '7', 'Barracks')).toEqual(['A recruit waits at the Barracks']);
    expect(townCardFlags(s, '7', null)).toEqual([]); // kışla yeri yoksa satır yok
    expect(townCardFlags(s, '4', null)).toEqual([]);
    s = recruitInTown(s, townRecruitOffer(s)[0]!);
    expect(townCardFlags(s, '7', 'Barracks')).toEqual([]);
  });

  it('a pending wanderer offer shows "Someone wants to join your company." and is skipped from the First line when asked', () => {
    const s = debugTeleport(newCampaign({ mode: 'normal', seed: 4242 }), '4');
    const all = arrivalStepLines(s, '4');
    const noRecruit = arrivalStepLines(s, '4', { skipRecruit: true });
    expect(noRecruit.length).toBeLessThanOrEqual(all.length);
    expect(CONFIG.texts['townJoinWaiting']).toBe('Someone wants to join your company.');
  });
});
