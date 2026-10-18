import { describe, expect, it } from 'vitest';
import { IB_CFG, IB_METHODS } from '../src/game/vfx-inbetween';
import { MOB_VFX_SPECS } from '../src/game/mob-vfx';

// Kodla ara kare (Ömer 2026-10-18 ara kare testi): gerçek savaşlar varsayılanda değişmemeli, test sayfasının skill'leri gerçek.
describe('vfx ara kare ayarları (data/vfx-inbetween.json)', () => {
  it('oyun içi oynatıcıda varsayılan KAPALI ve yöntemi/katı geçerli', () => {
    expect(IB_CFG.player.enabled).toBe(false);
    expect(IB_METHODS).toContain(IB_CFG.player.method);
    expect(IB_CFG.player.sub).toBeGreaterThan(1);
    expect(IB_CFG.subOptions.every((n) => Number.isInteger(n) && n >= 2)).toBe(true);
  });
  it('test sayfasındaki skill\'ler MOB_VFX_SPECS\'te var ve hızlar tanımlı', () => {
    for (const s of IB_CFG.test.skills) expect(MOB_VFX_SPECS[s.skill]).toBeTruthy();
    expect(IB_CFG.test.speeds).toEqual([0.25, 0.5, 1]);
  });
});
