import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import valdoria from '../data/campaign/valdoria.json';
import { backgroundFloor, backgroundOffsetY, backgroundPlacement, backgroundPool, floorLineMaxY, battleBackground, pickBackground, poolIndex } from '../src/game/battle-background';

/** Sefer bölge arka planları (2026-10-12, tools/make-zone-backgrounds.mjs; docs/design/campaign/fill-plan.md 3). */
const ZONES = ['border-road', 'windy-moor', 'iron-pass', 'misty-marsh', 'grave-field', 'pilgrim-road', 'ashen-plain', 'thornwood-hollow', 'ember-road'];
/** Uzun 1536x1024 görseller (2026-10-13 v3: bölgeler + kings-bridge + castle-hall). */
const TALL = [...ZONES, 'kings-bridge', 'castle-hall'];

const has = (id: string) => ['webp', 'png', 'jpg'].some((e) => existsSync(`assets/backgrounds/${id}.${e}`));

describe('savaş arka planı havuzları', () => {
  it('Quick Battle: 3 Proving Grounds, multiplayer: 3 Duelling Ring; dosyaları var', () => {
    expect(backgroundPool('quick')).toEqual(['proving-grounds-sunny-afternoon', 'proving-grounds-sunset', 'proving-grounds-rain']);
    expect(backgroundPool('multiplayer')).toEqual(['duelling-ring-moon', 'duelling-ring-storm', 'duelling-ring-snow']);
    for (const id of [...backgroundPool('quick'), ...backgroundPool('multiplayer')]) expect(has(id), id).toBe(true);
  });
  it('seçim yalnızca seedden türer (iki oyuncu aynı seed = aynı arka plan) ve havuzun hepsi çıkar', () => {
    for (const seed of [1, 7, 123, 99999, -5]) expect(pickBackground('multiplayer', seed)).toBe(pickBackground('multiplayer', seed));
    const seen = new Set<number>();
    for (let seed = 0; seed < 60; seed++) seen.add(poolIndex(seed, 3));
    expect(seen.size).toBe(3);
  });
  it('sefer kendi arka planını verir (varsa); yoksa savaşın varsayılanı; havuzda dosya yoksa varsayılan', () => {
    const exists = (id: string) => id !== 'missing';
    expect(battleBackground({ explicit: 'border-road', pool: null, seed: 3, fallback: 'castle-hall', exists })).toBe('border-road');
    expect(battleBackground({ explicit: 'missing', pool: null, seed: 3, fallback: 'castle-hall', exists })).toBe('castle-hall');
    expect(backgroundPool('quick')).toContain(battleBackground({ pool: 'quick', seed: 3, fallback: 'castle-hall', exists }));
    expect(battleBackground({ pool: 'quick', seed: 3, fallback: 'castle-hall', exists: () => false })).toBe('castle-hall');
  });
  it('dikey ofset verilmeyen arka planda 0', () => {
    expect(backgroundOffsetY('duelling-ring-storm')).toBe(0);
  });
  // Ömer 2026-10-11: castle-hall'da birimler duvarda süzülüyordu. Zemin çizgisi arka sıranın ayağının üstünde kalmalı, ekran boşluksuz kaplanmalı.
  it('her savaş arka planında zemin çizgisi arka sıranın ayağının üstünde ve ekran kaplı', () => {
    const sizes: Record<string, [number, number]> = {
      'duelling-ring-moon': [2000, 667], 'duelling-ring-storm': [2000, 667], 'duelling-ring-snow': [2000, 667],
      'proving-grounds-sunny-afternoon': [2000, 667], 'proving-grounds-sunset': [2000, 667], 'proving-grounds-rain': [2000, 667],
      ...Object.fromEntries(TALL.map((id) => [id, [1536, 1024] as [number, number]])),
    };
    for (const [id, [w, h]] of Object.entries(sizes)) {
      const f = backgroundFloor(id);
      expect(f, id).not.toBeNull();
      for (const stageW of [1920, 2337, 2580]) {
        const p = backgroundPlacement(id, w, h, stageW, 1080);
        const floorY = p.y + (f! - 0.5) * h * p.scale;
        expect(floorY, id).toBeLessThanOrEqual(floorLineMaxY() + 0.5);
        expect(p.y - (h * p.scale) / 2, id).toBeLessThanOrEqual(0.01);
        expect(p.y + (h * p.scale) / 2, id).toBeGreaterThanOrEqual(1080 - 0.01);
        expect(w * p.scale, id).toBeGreaterThanOrEqual(stageW);
      }
    }
    // Zemini zaten yüksek olan arka planlar dokunulmaz (kaplama ölçeği, ortada)
    expect(backgroundPlacement('duelling-ring-moon', 2000, 667, 1920, 1080)).toEqual({ y: 540, scale: 1080 / 667 });
    // 2026-10-13 v3: castle-hall ve kings-bridge de uzun (1536x1024) görsel; zemini hedefe oturtmak için yukarı kaydırılır, fazladan yakınlaşmaz
    for (const id of ['castle-hall', 'kings-bridge']) {
      const p = backgroundPlacement(id, 1536, 1024, 1920, 1080);
      expect(p.y, id).toBeLessThan(640);
      expect(p.scale, id).toBeCloseTo(1.25, 5);
    }
  });

  // Ömer 2026-10-12: v2 bölge görselleri ön kırpılmaz (1536x1024); savaş tek seferde cover ile ölçekler, zemini hedefe oturtur,
  // 16:9'da görselin çoğu görünür, yakınlaşma yalnızca kaplama kadar (fazladan büyütme yok).
  it('uzun bölge görselleri: zemin hedefte (ya da biraz üstünde), 16:9 görselin en az %80i görünür, ölçek = kaplama', () => {
    for (const id of TALL) {
      const f = backgroundFloor(id)!;
      const p = backgroundPlacement(id, 1536, 1024, 1920, 1080);
      expect(p.scale, id).toBeCloseTo(1.25, 5);
      expect(1080 / (1024 * p.scale), id).toBeGreaterThan(0.8);
      expect(p.y + (f - 0.5) * 1024 * p.scale, id).toBeGreaterThan(floorLineMaxY() - 10); // hedefte (üst kenar ekrana değiyorsa birkaç px yukarıda)
      expect(p.y + (f - 0.5) * 1024 * p.scale, id).toBeLessThanOrEqual(floorLineMaxY() + 0.01);
      const phone = backgroundPlacement(id, 1536, 1024, 2337, 1080);
      expect(phone.scale, id).toBeCloseTo(2337 / 1536, 5);
      expect(phone.y + (f - 0.5) * 1024 * phone.scale, id).toBeCloseTo(floorLineMaxY(), 3);
    }
  });
  // 2026-10-12: her sefer savaşı kendi bölgesinin arka planında (fill-plan 3); bölge yedekleri de gerçek dosya
  it('sefer düğüm ve bölge arka planlarının dosyası var ve zemini ölçülmüş', () => {
    const ids = [...valdoria.regions.map((r) => r.battleBackground), ...valdoria.nodes.map((n) => (n as { battleBackground?: string }).battleBackground).filter(Boolean)];
    for (const id of ids) {
      expect(has(id!), id).toBe(true);
      expect(backgroundFloor(id!), id).not.toBeNull();
    }
    for (const id of ZONES) expect(ids, id).toContain(id);
    const bg = (id: string) => (valdoria.nodes.find((n) => n.id === id) as { battleBackground?: string }).battleBackground;
    expect(bg('9')).toBe('kings-bridge');
    expect(bg('12')).toBe('castle-hall');
    expect(bg('6A')).toBe('misty-marsh');
    expect(bg('gate')).toBe('ember-road');
  });
});
