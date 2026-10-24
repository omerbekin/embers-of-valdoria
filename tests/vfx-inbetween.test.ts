import { describe, expect, it } from 'vitest';
import { IB_CFG, IB_METHODS } from '../src/game/vfx-inbetween';
import { MOB_VFX_SPECS, flightRotation, mobRealPlay, type MobTune } from '../src/game/mob-vfx';
import layout from '../data/battle-layout.json';

// Kodla ara kare (Ömer 2026-10-18 ara kare testi): gerçek savaşlar varsayılanda değişmemeli, test sayfasının skill'leri gerçek.
describe('vfx ara kare ayarları (data/vfx-inbetween.json)', () => {
  it('oyun içi oynatıcıda ara kare AÇIK (Ömer 2026-10-20) ve yöntemi/katı geçerli', () => {
    expect(IB_CFG.player.enabled).toBe(true);
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
  it('test ezmesi gerçek savaş varsayılanında kapalı (el yapımı kararı skill verisinden gelir)', async () => {
    const { mobVfxTest } = await import('../src/game/mob-vfx');
    expect(mobVfxTest.on).toBe(false);
    expect(mobVfxTest.hand).toBeNull();
  });
});

// Ömer 2026-10-20 mob VFX kararları: 18 skill gerçek savaşta el yapımı, gererisi asıl sheet + kodla ara kare; ayarlar veride.
const HAND_DECIDED = [
  'shiv', 'sand_in_the_eyes', 'rend', 'tainted_bait', 'murder_of_crows', 'peat_smoke', 'glyph_of_breaking', 'consecrate', 'unholy_benediction',
  'marsh_glow', 'burn_the_ground', 'burn_the_field', 'kindle_the_faithful', 'iron_decree', 'pyre_of_morvane', 'breaking_span', 'ash_brand', 'fall_of_kings_bridge',
];
describe('mob VFX gerçek savaş kararları (data/battle-layout.json > animation.mobVfx.skills)', () => {
  const skills = layout.animation.mobVfx.skills as Record<string, MobTune>;
  it('tam olarak 18 skill el yapımı ve hepsinin el yapımı efekti var', async () => {
    const { MOB_HAND_VFX } = await import('../src/game/mob-vfx-hand');
    const hand = Object.entries(skills).filter(([, t]) => t.hand).map(([id]) => id);
    expect(hand.sort()).toEqual([...HAND_DECIDED].sort());
    for (const id of hand) expect(typeof MOB_HAND_VFX[id]).toBe('function');
  });
  it('her ayar satırı bilinen bir mob skill\'i ve alanları geçerli', () => {
    for (const [id, t] of Object.entries(skills)) {
      expect(MOB_VFX_SPECS[id], id).toBeTruthy();
      if (typeof t.ib === 'string') expect(IB_METHODS, `${id}.ib`).toContain(t.ib);
      if (t.sub !== undefined) expect(IB_CFG.subOptions, `${id}.sub`).toContain(t.sub);
      if (t.bite) expect(MOB_VFX_SPECS[t.bite], `${id}.bite`).toBeTruthy();
      if (t.fall) expect(t.fromAbove, `${id}.fromAbove`).toBeGreaterThan(0);
      if (t.single) expect(MOB_VFX_SPECS[id]!.mode, `${id}.single`).toBe('cells');
    }
  });
  it('gerçek sürüm: el yapımı skill ara karesiz, diğerleri ara kareli (varsayılan 3x, geçişli skill\'ler 5x, zıplayanlar saf crossfade)', () => {
    expect(mobRealPlay('rend')).toEqual({ hand: true, ib: null });
    expect(mobRealPlay('dirge').ib).toEqual({ method: 'crossfade+motion', sub: IB_CFG.player.sub });
    expect(mobRealPlay('sanctuary').ib?.method).toBe('crossfade');
    expect(mobRealPlay('billhook').ib?.sub).toBe(5);
    expect(mobRealPlay('run_down').ib).not.toBeNull();
  });
  it('mızraklılar hedefe 30 px az yaklaşır, Run Down Scorch Bite sheet\'iyle vurur', () => {
    expect(skills.halberd_chop!.standOff).toBe(30);
    expect(skills.pike_thrust!.standOff).toBe(30);
    expect(skills.run_down!.bite).toBe('scorch_bite');
  });
  it('mermi eğimi: sağa uçan aşağı eğik mermi yatay yola döner, aynalı (sola uçan) da', () => {
    // yatay yol, sheet 45 derece aşağı eğik: -45 derece döner
    expect(flightRotation({ x: 0, y: 0 }, { x: 100, y: 0 }, 45, false)).toBeCloseTo(-Math.PI / 4, 5);
    // aynalı: yol tam sola (PI), sheet aynalı 45 derece aşağı-sola bakar: baş yönü PI-45; döndürme +45 derece
    expect(flightRotation({ x: 100, y: 0 }, { x: 0, y: 0 }, 45, true)).toBeCloseTo(Math.PI / 4, 5);
    // yol zaten sheet eğimindeyse dönme yok
    expect(flightRotation({ x: 0, y: 0 }, { x: 100, y: 100 }, 45, false)).toBeCloseTo(0, 5);
  });
});
