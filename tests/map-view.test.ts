import { describe, expect, it } from 'vitest';
import { MAP_ZOOM, canPan, clampMid, clampZoom, midLimits, wheelAction, zoomTowardMid } from '../src/game/map-view';

// 21:9 harita çerçevesi (geniş görsel; eski 16:9 bölge dünyada 0-1920)
const frame = { left: -221, right: 2462, top: 0, bottom: 1080 };

describe('sefer haritası görünümü (kaydırma / yakınlaştırma)', () => {
  it('yakınlaştırma 1,0-1,4 arasında kalır', () => {
    expect(clampZoom(0.5)).toBe(MAP_ZOOM.min);
    expect(clampZoom(3)).toBe(MAP_ZOOM.max);
    expect(clampZoom(1.23)).toBe(1.23);
  });

  it('16:9 ekranda harita sağa sola kaydırılır ama çerçeveden asla çıkılmaz', () => {
    const v = { w: 1920, h: 1080 };
    const l = midLimits(frame, v);
    expect(l.minX).toBe(-221 + 960);
    expect(l.maxX).toBe(2462 - 960);
    expect(l.minY).toBe(l.maxY); // dikeyde yer yok
    expect(clampMid({ x: -5000, y: 0 }, frame, v)).toEqual({ x: l.minX, y: 540 });
    expect(clampMid({ x: 9999, y: 9999 }, frame, v)).toEqual({ x: l.maxX, y: 540 });
    expect(canPan({ x: l.minX, y: 540 }, frame, v)).toMatchObject({ left: false, right: true, up: false, down: false });
  });

  it('çerçeveden geniş görünümde (21:9 ve üstü) kaydırma yok, harita ortada', () => {
    const v = { w: 2800, h: 1080 };
    const c = clampMid({ x: 0, y: 0 }, frame, v);
    expect(c.x).toBeCloseTo((frame.left + frame.right) / 2);
    expect(canPan(c, frame, v)).toEqual({ left: false, right: false, up: false, down: false });
  });

  it('yakınlaşınca dikey kaydırma da açılır', () => {
    const v = { w: 1920 / 1.4, h: 1080 / 1.4 };
    const p = canPan({ x: 960, y: 540 }, frame, v);
    expect(p.up && p.down && p.left && p.right).toBe(true);
  });

  it('tekerlek (Ömer 2026-10-11): fare tekerleği ve Ctrl + tekerlek (trackpad sıkıştırması) yakınlaştırır; yalnızca belirgin yatay hareket kaydırır', () => {
    expect(wheelAction({ dx: 0, dy: -50, ctrl: true })).toEqual({ zoom: MAP_ZOOM.step, panX: 0, panY: 0 });
    expect(wheelAction({ dx: 0, dy: -100, ctrl: false })).toEqual({ zoom: MAP_ZOOM.step, panX: 0, panY: 0 });
    expect(wheelAction({ dx: 0, dy: 100, ctrl: false })).toEqual({ zoom: -MAP_ZOOM.step, panX: 0, panY: 0 });
    expect(wheelAction({ dx: 40, dy: 5, ctrl: false })).toEqual({ zoom: 0, panX: 40, panY: 0 });
  });

  it('imlece doğru yakınlaştırma: imlecin altındaki nokta yerinde kalır; sınırda çerçeveye kısılır (kaydırma gibi)', () => {
    const z = 1.4;
    const v = { w: 1920 / z, h: 1080 / z };
    // ortadan uzak, çerçeve içinde: imlecin dünya noktası ekranda aynı yerde
    const cursor = { x: 900, y: 500 };
    const offset = { x: 200, y: -100 };
    const mid = zoomTowardMid(cursor, offset, z, frame, v);
    expect(mid.x + offset.x / z).toBeCloseTo(cursor.x);
    expect(mid.y + offset.y / z).toBeCloseTo(cursor.y);
    // çerçeve köşesine doğru: orta sınırda durur, görünüm çerçeveden taşmaz
    const edge = zoomTowardMid({ x: -221, y: 0 }, { x: -900, y: -500 }, z, frame, v);
    const l = midLimits(frame, v);
    expect(edge).toEqual({ x: l.minX, y: l.minY });
    expect(edge.x - v.w / 2).toBeGreaterThanOrEqual(frame.left - 1e-9);
    expect(edge.y - v.h / 2).toBeGreaterThanOrEqual(frame.top - 1e-9);
    // uzaklaşma (1,0): dikeyde yer yok, orta dikeyde sabit
    expect(zoomTowardMid({ x: 900, y: 100 }, { x: 0, y: -400 }, 1, frame, { w: 1920, h: 1080 }).y).toBe(540);
  });
});
