// attachBandTip yerleşimi (src/ui/band-tip-attach.ts > placeBandTip): üstte, sığmazsa altta, küçük kapta görünüme göre.
import { describe, expect, it } from 'vitest';
import { placeBandTip, reasonSpec } from '../src/ui/band-tip-attach';

const box = (left: number, top: number, width: number, height: number) => ({ left, top, width, height });

describe('placeBandTip', () => {
  const tip = { w: 300, h: 100 };
  it('denetimin üstünde ortalanır', () => {
    const p = placeBandTip(box(400, 500, 60, 40), tip, box(0, 0, 1000, 800), box(0, 0, 1000, 800));
    expect(p).toEqual({ x: 400 + 30 - 150, y: 500 - 100 - 8 });
  });
  it('üstte yer yoksa altında açılır', () => {
    const p = placeBandTip(box(400, 20, 60, 40), tip, box(0, 0, 1000, 800), box(0, 0, 1000, 800));
    expect(p.y).toBe(20 + 40 + 8);
  });
  it('kenara taşmaz', () => {
    const p = placeBandTip(box(960, 500, 40, 40), tip, box(0, 0, 1000, 800), box(0, 0, 1000, 800));
    expect(p.x).toBe(1000 - 300 - 6);
  });
  it('küçük kapta (köşe düğmeleri) sınır görünümdür, konum kaba göre verilir', () => {
    const host = box(28, 700, 150, 64);
    const p = placeBandTip(box(28, 700, 64, 64), tip, host, box(0, 0, 844, 390 + 400));
    expect(p.x + host.left).toBeGreaterThanOrEqual(6);
    expect(p.y + host.top).toBe(700 - 100 - 8);
  });
  // Ömer 2026-11-12: Formation kartında BLIZZARD ipucu ekranın tepesinde açılıyordu (#ui-root kabı 0 px yüksek, sınır kaptan alınıyordu)
  it('0 px yüksek kap (#ui-root) sınır olmaz: ipucu denetimin üstünde kalır, tepeye yapışmaz', () => {
    const view = box(0, 0, 1920, 1080);
    const p = placeBandTip(box(1331, 630, 243, 60), { w: 440, h: 279 }, box(0, 0, 1920, 0), view, 14);
    expect(p.y).toBe(630 - 279 - 14);
    expect(p.x).toBe(1331 + 243 / 2 - 220);
  });
  it('görünümden taşan kapta sınır görünümle kesişimdir', () => {
    const p = placeBandTip(box(400, 1000, 60, 40), tip, box(0, -500, 1000, 3000), box(0, 0, 1000, 1080));
    expect(p.y).toBe(1000 - 100 - 8 + 500);
    const q = placeBandTip(box(400, 10, 60, 40), tip, box(0, -500, 1000, 3000), box(0, 0, 1000, 1080));
    expect(q.y + -500).toBe(10 + 40 + 8);
  });
  it('altta + sağ hizalı (Gear Blessings); altta yer yoksa üstte', () => {
    const v = box(0, 0, 1000, 800);
    expect(placeBandTip(box(600, 100, 80, 30), tip, v, v, 8, 6, 'below', 'end')).toEqual({ x: 680 - 300, y: 138 });
    expect(placeBandTip(box(600, 750, 80, 30), tip, v, v, 8, 6, 'below').y).toBe(750 - 100 - 8);
  });
  it('solda, dikeyde ortalı (Gear ağaç satırı); solda yer yoksa sağda', () => {
    const v = box(0, 0, 1000, 800);
    expect(placeBandTip(box(500, 400, 100, 40), tip, v, v, 10, 6, 'left')).toEqual({ x: 500 - 300 - 10, y: 420 - 50 });
    expect(placeBandTip(box(100, 400, 100, 40), tip, v, v, 10, 6, 'left').x).toBe(210);
  });
});

describe('reasonSpec', () => {
  it('başlık ve tek satır neden', () => {
    expect(reasonSpec('Heal', 'Not enough Valor.')).toEqual({ title: 'Heal', lines: [{ text: 'Not enough Valor.' }] });
  });
});
