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
});

describe('reasonSpec', () => {
  it('başlık ve tek satır neden', () => {
    expect(reasonSpec('Heal', 'Not enough Valor.')).toEqual({ title: 'Heal', lines: [{ text: 'Not enough Valor.' }] });
  });
});
