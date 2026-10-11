import { describe, expect, it } from 'vitest';
import layout from '../data/battle-layout.json';
import { ELEMENT_ICON, FLOAT_SERIF, damageIconKind, damageSourceKind, floatStyle, floatTimes, lighten, placeFloat, placeFloatClear, floatRiseAt, rowLayout } from '../src/game/float-text';
import { isIconKind } from '../src/ui/icon-kinds';

describe('yüzen yazı stili', () => {
  it('serif ailesi, kalın kontur ve gölge; miss/dodge italik', () => {
    const dmg = floatStyle('damage', 80, '#ffe066');
    expect(dmg.fontFamily).toBe(FLOAT_SERIF);
    expect(dmg.fontStyle).toBe('bold');
    expect(dmg.strokeThickness).toBeGreaterThanOrEqual(5);
    expect(dmg.shadow.offsetY).toBeGreaterThan(0);
    expect(floatStyle('miss', 46, '#cfc7a0').fontStyle).toContain('italic');
    expect(floatStyle('dodge', 46, '#9ad1ff').fontStyle).toContain('italic');
  });

  it('puntoyu korur, çok küçükte 14 px altına inmez', () => {
    expect(floatStyle('heal', 64, '#7dff9b').fontSize).toBe('64px');
    expect(floatStyle('info', 5, '#fff').fontSize).toBe('14px');
  });

  it('üst ışık rengi tabandan açık; miss düz renk', () => {
    expect(floatStyle('heal', 64, '#336699').topLight).toBe(lighten('#336699', 0.55));
    expect(lighten('#000000', 1)).toBe('#ffffff');
    expect(floatStyle('miss', 46, '#cfc7a0').topLight).toBeNull();
  });
});

describe('yüzen yazı süresi', () => {
  it('veriden: en az 2 sn (eskisinden +0,5 sn), son 200 ms solar', () => {
    expect(layout.animation.damageNumberMs).toBeGreaterThanOrEqual(2000);
    expect(layout.animation.floatFadeMs).toBe(200);
    const t = floatTimes(layout.animation.damageNumberMs, layout.animation.floatFadeMs);
    expect(t.fade).toBe(200);
    expect(t.fadeDelay + t.fade).toBe(t.total);
  });
  it('solma süresi toplamı aşmaz', () => expect(floatTimes(100, 200)).toEqual({ total: 100, fadeDelay: 0, fade: 100 }));
});

describe('şerit yığınlama (üst üste binmez)', () => {
  it('ilk yazı şerit 0, ofset 0; sonrakiler üste dizilir', () => {
    const lanes: Array<number | undefined> = [];
    expect(placeFloat(lanes)).toEqual({ lane: 0, offset: 0 });
    lanes[0] = 100;
    const b = placeFloat(lanes);
    expect(b.lane).toBe(1);
    expect(b.offset).toBeCloseTo(95, 5);
  });
  it('biten şerit yeniden kullanılır; yaşayan şeritle çakışmaz', () => {
    const c = placeFloat([undefined, 60]);
    expect(c.lane).toBe(0);
    expect(c.offset).toBe(0);
    const d = placeFloat([70, undefined, 50]);
    expect(d.lane).toBe(1);
    expect(d.offset).toBeCloseTo(70 * 0.95, 5);
  });
});

describe('rakam + ikon satırı', () => {
  it('parçalar tek satırda ortalanır', () => {
    const { lefts, total } = rowLayout([40, 100, 30], 6);
    expect(total).toBe(182);
    expect(lefts[0]).toBe(-91);
    expect(lefts[1]).toBe(-91 + 46);
    expect(lefts[2]! + 30).toBe(91);
  });
});

describe('hasar ikonu (element / kaynak)', () => {
  it('fiziksel ve elementsiz hasarda ikon yok', () => {
    expect(damageIconKind({ element: 'physical' })).toBeNull();
    expect(damageIconKind({})).toBeNull();
  });
  it('element ikonları: ateş, buz, kutsal, arcane, doğa', () => {
    expect(damageIconKind({ element: 'fire' })).toBe('flame');
    expect(damageIconKind({ element: 'ice' })).toBe('blizzard');
    expect(damageIconKind({ element: 'holy' })).toBe('holy');
    expect(damageIconKind({ element: 'arcane' })).toBe('rune');
    expect(damageIconKind({ element: 'nature' })).toBe('leaf');
  });
  it('zemin tiki: zehir -> zehir damlası, yanma -> alev (element ne olursa olsun)', () => {
    expect(damageIconKind({ origin: 'ground', ground: 'poison', element: 'nature' })).toBe('poison');
    expect(damageIconKind({ origin: 'ground', ground: 'burning', element: 'fire' })).toBe('flame');
    expect(damageIconKind({ origin: 'ground', ground: 'holy_fire', element: 'holy' })).toBe('holy');
  });
  it('durum tiki: yara/kanama -> kan damlası; kendine hasar -> ikon yok', () => {
    expect(damageIconKind({ origin: 'status', statusId: 'wound' })).toBe('drop');
    expect(damageIconKind({ origin: 'self', element: 'fire' })).toBeNull();
    expect(damageSourceKind({ origin: 'self' })).toBe('self');
  });
  it('kullanılan tüm ikon adları gerçek piksel ikonlar', () => {
    for (const k of [...Object.values(ELEMENT_ICON), 'poison', 'flame', 'drop', 'burst']) expect(isIconKind(k), k).toBe(true);
  });
});

// Ömer 2026-10-11: geç gelen sayı, yükselmiş eski sayının içine doğmasın (taslak A ile seçilen yığınlama düzeltmesi)
describe('çakışmasız yüzen yazı yığınlaması', () => {
  const o = { life: 2000, rise: 110 };
  const overlapsEver = (a: { offset: number; px: number; age: number }, b: { offset: number; px: number; age: number }) => {
    for (let s = 0; s <= o.life - Math.max(a.age, b.age); s += 25) {
      const ya = a.offset + floatRiseAt(a.age + s, o.life, o.rise), yb = b.offset + floatRiseAt(b.age + s, o.life, o.rise);
      if (ya < yb + b.px * 0.95 && yb < ya + a.px * 0.95) return true;
    }
    return false;
  };
  it('boşken en altta doğar', () => {
    expect(placeFloatClear([], 50, o)).toBe(0);
  });
  it('yaşayan yazılarla ömür boyu çakışmaz (eski placeFloat çakışıyordu)', () => {
    const live = [{ offset: 0, px: 46, age: 1150 }]; // MISS 1,15 sn önce doğdu ve çoktan yükseldi
    const old = placeFloat([46]).offset;
    expect(overlapsEver({ offset: old, px: 44, age: 0 }, live[0]!)).toBe(true);
    const off = placeFloatClear(live, 44, o);
    expect(overlapsEver({ offset: off, px: 44, age: 0 }, live[0]!)).toBe(false);
  });
  it('yer varsa alta, eski yazının altına girer; çok yazıda hepsiyle ayrık', () => {
    // Neredeyse ömrünü bitirmiş yüksek bir yazı alttaki yeri boşaltmıştır
    expect(placeFloatClear([{ offset: 0, px: 50, age: 1900 }], 50, o)).toBe(0);
    const live: Array<{ offset: number; px: number; age: number }> = [];
    for (let i = 0; i < 5; i++) {
      for (const l of live) l.age += 120;
      const off = placeFloatClear(live, 52, o);
      for (const l of live) expect(overlapsEver({ offset: off, px: 52, age: 0 }, l)).toBe(false);
      live.push({ offset: off, px: 52, age: 0 });
    }
  });
});
