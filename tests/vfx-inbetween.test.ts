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

// El yapımı mob efektleri (Ömer 2026-10-18: "tüm düşman karakterlerinin animasyonunu ... sıfırdan baştan yarat"): her mob skill'inin
// kodla çizilen sürümü var (Debug > VFX frame test (in battle) > Hand-coded); gerçek savaşlar bunları kullanmaz.
describe('el yapımı mob efektleri (src/game/mob-vfx-hand.ts)', () => {
  it('MOB_VFX_SPECS\'teki her skill\'in el yapımı efekti var ve fazlası yok', async () => {
    const { MOB_HAND_VFX } = await import('../src/game/mob-vfx-hand');
    const specs = Object.keys(MOB_VFX_SPECS).sort();
    expect(Object.keys(MOB_HAND_VFX).sort()).toEqual(specs);
    for (const id of specs) expect(typeof MOB_HAND_VFX[id]).toBe('function');
  });
  it('gerçek savaş varsayılanında el yapımı efekt kapalı', async () => {
    const { mobVfxTest } = await import('../src/game/mob-vfx');
    expect(mobVfxTest.on).toBe(false);
    expect(mobVfxTest.hand).toBeNull();
  });
});
