import { describe, expect, it } from 'vitest';
import { spotHole } from '../src/ui/lesson-box';

// Spot ışığı deliği (src/ui/lesson-box.ts > spotHole): ekran dikdörtgeni -> sahne yereli (dikey telefonda sahne 90 derece döner).

describe('spot ışığı deliği', () => {
  it('düz sahnede dikdörtgen + pay', () => {
    expect(spotHole({ left: 100, top: 50, right: 160, bottom: 90 }, false, 800, 6)).toEqual({ x: 94, y: 44, w: 72, h: 52 });
  });

  it('döndürülmüş sahnede (translateX(vw) rotate(90deg)) yerel x = ekran y, yerel y = vw - ekran x', () => {
    // 400 px genişlikte dikey ekran: ekranda (300..360, 100..140) olan düğme sahnede x 100..140, y 40..100
    expect(spotHole({ left: 300, top: 100, right: 360, bottom: 140 }, true, 400, 0)).toEqual({ x: 100, y: 40, w: 40, h: 60 });
  });
});
