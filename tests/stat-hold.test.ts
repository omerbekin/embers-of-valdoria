// Gear > Sheet: stat kutusunu basılı tutarak puan verme (Ömer 2026-11-01, mockup gear-primary-hold B "Ray"):
// tutma dolunca TEK puan hemen işlenir; erken bırakma / kısa tık / puansız tutma / kural engeli puan vermez.
import { describe, expect, it } from 'vitest';
import cfg from '../data/ui-motion.json';
import { createHold, type HoldClock } from '../src/ui/stat-hold';
import { baseCapReason, pointDiff } from '../src/ui/character-panel';
import { allocate, canAddPoint } from '../src/progression';

/** Elle sürülen zaman: advance(ms) kareleri 16 ms adımlarla ilerletir. */
function clock() {
  let t = 0;
  let id = 0;
  let q: Array<{ id: number; fn: (ts: number) => void }> = [];
  const c: HoldClock = {
    now: () => t,
    raf: (fn) => {
      q.push({ id: ++id, fn });
      return id;
    },
    caf: (i) => {
      q = q.filter((x) => x.id !== i);
    },
  };
  const advance = (ms: number): void => {
    const end = t + ms;
    while (t < end) {
      t = Math.min(end, t + 16);
      const run = q;
      q = [];
      for (const r of run) r.fn(t);
    }
  };
  return { c, advance };
}

function rig(can = true) {
  const k = clock();
  const log = { done: 0, refused: 0, progress: 0 };
  const h = createHold({
    canStart: () => can,
    onProgress: (p) => (log.progress = p),
    onDone: () => log.done++,
    onRefuse: () => log.refused++,
    clock: k.c,
  });
  return { h, k, log };
}

describe('hold to spend a stat point', () => {
  const HOLD = cfg.statHold.holdMs;

  it('the hold time comes from data/ui-motion.json (600 ms)', () => {
    expect(HOLD).toBe(600);
  });

  it('a full hold spends exactly one point, immediately at the end', () => {
    const { h, k, log } = rig();
    h.down();
    k.advance(HOLD - 40);
    expect(log.done).toBe(0);
    k.advance(80);
    expect(log.done).toBe(1);
    expect(log.progress).toBe(1);
  });

  it('keeping the button down after it filled gives no second point; a new press does', () => {
    const { h, k, log } = rig();
    h.down();
    k.advance(HOLD * 3);
    expect(log.done).toBe(1);
    h.up();
    h.down();
    k.advance(HOLD + 40);
    expect(log.done).toBe(2);
  });

  it('releasing early spends nothing and rewinds the fill to zero', () => {
    const { h, k, log } = rig();
    h.down();
    k.advance(HOLD / 2);
    expect(log.progress).toBeGreaterThan(0.3);
    h.up();
    k.advance(1000);
    expect(log.done).toBe(0);
    expect(log.progress).toBe(0);
  });

  it('a short click (down + up at once) spends nothing', () => {
    const { h, k, log } = rig();
    h.down();
    h.up();
    k.advance(1000);
    expect(log.done).toBe(0);
  });

  it('with no point to spend the hold never starts: refused, nothing spent', () => {
    const { h, k, log } = rig(false);
    h.down();
    k.advance(HOLD * 2);
    expect(log.refused).toBe(1);
    expect(log.done).toBe(0);
    expect(log.progress).toBe(0);
  });

  it('pressing again mid-rewind resumes from where the fill is', () => {
    const { h, k, log } = rig();
    h.down();
    k.advance(300);
    h.up();
    k.advance(40);
    h.down();
    k.advance(HOLD);
    expect(log.done).toBe(1);
  });
});

describe('1-point preview and base stat rule', () => {
  const hero = { id: 'w', class: 'warrior', level: 5, statPoints: 2, alloc: {}, equipment: {} } as never;

  it('preview lists what one point of the stat changes, and the stat itself goes up by 1', () => {
    const d = pointDiff(hero, 'str');
    expect(d.length).toBeGreaterThan(0);
    expect(d.find((x) => x.id === 'str')?.text).toBe('+1');
    expect(d.every((x) => x.dir === 'up' || x.dir === 'down')).toBe(true);
  });

  it('preview does not change the hero (a short click never spends)', () => {
    const before = JSON.stringify(hero);
    pointDiff(hero, 'str');
    expect(JSON.stringify(hero)).toBe(before);
  });

  it('when the base stat rule blocks a stat, the reason names the stat and the others total', () => {
    // bir temel stat diğer üçünün toplamını aşamaz: STR'yi sınıra kadar it
    const h = { class: 'warrior', statPoints: 500, alloc: {} } as { class: string; statPoints: number; alloc: Record<string, number> };
    let guard = 0;
    while (canAddPoint(h.class, h.alloc, 'str') && guard++ < 500) allocate(h as never, { str: 1 });
    expect(canAddPoint(h.class, h.alloc, 'str')).toBe(false);
    const msg = baseCapReason(h.class, h.alloc, 'str', 'Strength');
    expect(msg).toContain('Cannot add to Strength');
    expect(msg).toContain('the other three added together');
    expect(msg).toMatch(/others total \d+/);
  });
});
