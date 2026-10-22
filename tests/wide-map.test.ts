import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import valdoria from '../data/campaign/valdoria.json';
import { FULL_REGION, coverShift, focusCrop, imageToRegion, placeArt, regionAspect, regionToImage, type Region } from '../src/game/wide-map';
import layout from '../data/battle-layout.json';

// Eski çizimin geniş görseli (1916x821; 2026-10-22 Harita 1 yeniden çiziminde kaldırıldı) ve SIFT ile ölçülmüş bölgesi:
// yerleşim hesabı (wide-map.ts) yeni bir geniş görsel geldiğinde aynı kuralla kullanılır, testler bu ölçümle saf hesabı sınar.
const WIDE = { w: 1916, h: 821 };
const OLD = { w: 1672, h: 941 }; // assets/campaign/valdoria-bg.webp (yeni çizim de aynı boyda)
const region: Region = [0.08229, 0.00077, 0.79804, 0.94083];

describe('Harita 1 yeni çizimin geniş (21:9) görseli (Ömer onayı 2026-10-22)', () => {
  const NEW = { w: 2195, h: 941 }; // assets/campaign/valdoria-bg-wide.webp
  const wide = (valdoria as unknown as { backgroundWide?: { image: string; region: Region } }).backgroundWide!;
  it('veride geniş görsel ve bölgesi var, dosya assets/campaign altında', () => {
    expect(valdoria.background).toBe('valdoria-bg');
    expect(wide.image).toBe('valdoria-bg-wide');
    expect(existsSync(`assets/campaign/${wide.image}.webp`)).toBe(true);
  });
  it('bölge = 16:9 görselin (1672x941) birebir yeri: x 261..1933 px, tam yükseklik', () => {
    expect(wide.region[0] * NEW.w).toBeCloseTo(261, 0);
    expect(wide.region[2] * NEW.w).toBeCloseTo(1933, 0);
    expect(wide.region[1]).toBe(0);
    expect(wide.region[3]).toBe(1);
    expect(regionAspect(NEW.w, NEW.h, wide.region)).toBeCloseTo(OLD.w / OLD.h, 3);
  });
  it('16:9 görünüm değişmez (bölge 0-1920 x 0-1080i 16:9 görselle aynı ölçekte kaplar), 21:9 ekranda yanlar da görselden', () => {
    const p = placeArt(NEW.w, NEW.h, wide.region, { x: 0, y: 0, w: 1920, h: 1080 });
    const q = placeArt(OLD.w, OLD.h, FULL_REGION, { x: 0, y: 0, w: 1920, h: 1080 });
    expect(p.scale).toBeCloseTo(q.scale, 3);
    expect(p.top).toBeCloseTo(0, 6);
    expect(p.bottom).toBeGreaterThanOrEqual(1080);
    // 21:9 (1080 x 21/9 = 2520 genişlik): görünen alan -300..2220
    expect(p.left).toBeLessThanOrEqual(-299);
    expect(p.right).toBeGreaterThanOrEqual(2220);
  });
});

describe('geniş harita görseli: bölge yapılandırması', () => {
  it('bölge 0-1 içinde ve eski haritanın oranını (~16:9, 1672x941) verir', () => {
    for (const v of region) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(region[0]).toBeLessThan(region[2]);
    expect(region[1]).toBeLessThan(region[3]);
    expect(regionAspect(WIDE.w, WIDE.h, region)).toBeCloseTo(OLD.w / OLD.h, 2);
  });
  it('düğüm eşlemesi gidip gelir (eski kesir -> geniş kesir -> eski kesir)', () => {
    for (const n of valdoria.nodes) {
      const back = imageToRegion(regionToImage(n.pos as [number, number], region), region);
      expect(back[0]).toBeCloseTo(n.pos[0]!, 9);
      expect(back[1]).toBeCloseTo(n.pos[1]!, 9);
    }
  });
  it('ölçülen noktalar: Mill Road kıyıda (geniş görselin sol kısmı), eski Castle Morvane noktası kuzeydoğu dağlarda', () => {
    const mill = regionToImage([0.146, 0.846], region); // eski çizimdeki Mill Road konumu (ölçüm eski görsele göre)
    // kalibrasyon noktası: eski Castle Morvane konumu (A1-x'te düğüm taşındı; ölçüm görsel üstünde sabit)
    const morvane = regionToImage([0.924, 0.17], region);
    expect(mill[0]).toBeGreaterThan(0.15);
    expect(mill[0]).toBeLessThan(0.25);
    // eski haritadaki piksel (0,924 x 1672, 0,17 x 941) benzerlik dönüşümüyle (ölçek 0,8202, kaydırma 157,7 / 0,6) geniş görselde:
    expect(Math.abs(morvane[0] * WIDE.w - (157.66 + 0.924 * 1672 * 0.8202))).toBeLessThan(2);
    expect(Math.abs(morvane[1] * WIDE.h - (0.63 + 0.17 * 941 * 0.8202))).toBeLessThan(2);
  });
});

describe('geniş harita görseli: yerleşim', () => {
  it('bölge dünyada 0-1920 x 0-1080e oturur (düğüm konumları değişmez), görsel yanlara taşar', () => {
    const p = placeArt(WIDE.w, WIDE.h, region, { x: 0, y: 0, w: 1920, h: 1080 });
    expect(p.x + region[0] * WIDE.w * p.scale).toBeCloseTo(0, 6);
    expect(p.x + region[2] * WIDE.w * p.scale).toBeCloseTo(1920, 6);
    expect(p.y + region[1] * WIDE.h * p.scale).toBeCloseTo(0, 6);
    expect(Math.abs(p.y + region[3] * WIDE.h * p.scale - 1080)).toBeLessThan(1);
    expect(p.left).toBeLessThan(-200); // solda deniz
    expect(p.right).toBeGreaterThan(2400); // sağda yeni arazi
  });
  it('geniş görsel yoksa eski görsel aynı kuralla (bölge tamamı): eski davranış', () => {
    const p = placeArt(OLD.w, OLD.h, FULL_REGION, { x: 0, y: 0, w: 1920, h: 1080 });
    expect(p.left).toBeCloseTo(0, 6);
    expect(p.right).toBeCloseTo(1920, 6);
  });
  it('kaydırma: görsel görünen alanı kaplayabiliyorsa boşluk kalmayacak kadar kayar; daha darsa ortalanır', () => {
    expect(coverShift({ left: -268, right: 2522 }, 0, 1920)).toBe(0); // 16:9: değişmez
    expect(coverShift({ left: -268, right: 2522 }, -330, 2250)).toBeCloseTo(-62); // ultrawide: soldaki boşluk kapanır
    expect(coverShift({ left: 0, right: 1920 }, -330, 2250)).toBeCloseTo(0); // dar görsel ortada (yanlar kenar dolgusu)
    expect(coverShift({ left: 100, right: 1900 }, -330, 2250)).toBeCloseTo(-40);
  });
});

describe('Play kartı görsel odağı', () => {
  const focus = layout.backgrounds.cardFocus as unknown as Record<string, [number, number]>;
  it('odak noktası kartın tam ortasında, kart boşluksuz dolu (kırpma görselin içinde)', () => {
    for (const id of ['proving-grounds-sunny-afternoon', 'duelling-ring-moon']) {
      const f = focus[id]!;
      const c = focusCrop(2000, 667, 460, 640, f);
      expect(c.cropX + c.cropW / 2).toBeCloseTo(f[0] * 2000, 6);
      expect(c.cropY + c.cropH / 2).toBeCloseTo(f[1] * 667, 6);
      expect(c.cropX).toBeGreaterThanOrEqual(-1e-6);
      expect(c.cropY).toBeGreaterThanOrEqual(-1e-6);
      expect(c.cropX + c.cropW).toBeLessThanOrEqual(2000 + 1e-6);
      expect(c.cropY + c.cropH).toBeLessThanOrEqual(667 + 1e-6);
      expect(c.cropW * c.scale).toBeCloseTo(460, 6);
      expect(c.cropH * c.scale).toBeCloseTo(640, 6);
    }
  });
  it('kart görselleri (assets/cards, 768x1152): genişlik tam, kesit üstten başlar (savaşçılar üstte), yakınlaşma yok denecek kadar az', () => {
    for (const id of ['quick-battle', 'quick-battle-endless', 'multiplayer']) {
      const c = focusCrop(768, 1152, 460, 640, focus[id]!);
      expect(c.cropY).toBeGreaterThanOrEqual(-1e-6);
      expect(c.cropY).toBeLessThan(2);
      expect(c.cropW).toBeGreaterThan(767);
      expect(c.cropY + c.cropH).toBeLessThanOrEqual(1152 + 1e-6);
    }
  });
  it('odak yoksa eski davranış: ortalı kaplama', () => {
    const c = focusCrop(2000, 667, 460, 640);
    expect(c.cropX + c.cropW / 2).toBeCloseTo(1000, 6);
    expect(c.cropH).toBeCloseTo(667, 6);
  });
});
