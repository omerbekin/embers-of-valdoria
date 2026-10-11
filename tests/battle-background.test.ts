import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { backgroundFloor, backgroundOffsetY, backgroundPlacement, backgroundPool, floorLineMaxY, battleBackground, pickBackground, poolIndex } from '../src/game/battle-background';

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
      'castle-hall': [2000, 729], 'kings-bridge': [2000, 729],
      'duelling-ring-moon': [2000, 667], 'duelling-ring-storm': [2000, 667], 'duelling-ring-snow': [2000, 667],
      'proving-grounds-sunny-afternoon': [2000, 667], 'proving-grounds-sunset': [2000, 667], 'proving-grounds-rain': [2000, 667],
    };
    for (const [id, [w, h]] of Object.entries(sizes)) {
      const f = backgroundFloor(id);
      expect(f, id).not.toBeNull();
      for (const stageW of [1920, 2580]) {
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
    // castle-hall kaldırılır ama en çok %25 yakınlaşır
    const ch = backgroundPlacement('castle-hall', 2000, 729, 1920, 1080);
    expect(ch.y).toBeLessThan(540);
    expect(ch.scale / (1080 / 729)).toBeLessThan(1.25);
  });
});
