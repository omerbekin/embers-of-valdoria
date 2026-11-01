// Stat kutusunu basılı tutarak puan verme (Ömer 2026-11-01, mockup gear-primary-hold B "Ray"): DOM'suz sayaç.
// Tutma sürerken ilerleme 0-1 akar (`onProgress`); dolunca TEK kez `onDone` (1 puan); erken bırakınca dolgu geri sarar, puan gitmez.
// Bir tutuş tek puan verir: dolduktan sonra basılı kalmak yeni puan üretmez, yeni puan için bırakıp yeniden basmak gerekir.
// Süreler data/ui-motion.json > statHold; zamanlayıcı enjekte edilebilir (testler elle sürer).
import cfg from '../../data/ui-motion.json';

export interface HoldTimes {
  holdMs: number;
  rewindFullMs: number;
  rewindMinMs: number;
}

export interface HoldClock {
  now(): number;
  raf(fn: (ts: number) => void): number;
  caf(id: number): void;
}

export const HOLD_TIMES: HoldTimes = cfg.statHold;

const browserClock = (): HoldClock => ({
  now: () => performance.now(),
  raf: (fn) => requestAnimationFrame(fn),
  caf: (id) => cancelAnimationFrame(id),
});

export interface HoldOpts {
  /** Basılabilir mi (puan var ve kural izin veriyor)? Hayırsa `onRefuse` çağrılır, sayaç başlamaz. */
  canStart(): boolean;
  onProgress(p: number): void;
  /** Tutma doldu: puanı işle. */
  onDone(): void;
  onRefuse?(): void;
  /** Tutma başladı / bitti (görsel sınıf için). */
  onHolding?(on: boolean): void;
  times?: HoldTimes;
  clock?: HoldClock;
}

export interface Hold {
  down(): void;
  up(): void;
  progress(): number;
  holding(): boolean;
}

export function createHold(o: HoldOpts): Hold {
  const t = o.times ?? HOLD_TIMES;
  const clock = o.clock ?? browserClock();
  let raf = 0;
  let prog = 0;
  let t0 = -1;
  let active = false;
  let finished = false;
  const set = (p: number): void => {
    prog = p;
    o.onProgress(p);
  };
  const stop = (): void => {
    if (raf) clock.caf(raf);
    raf = 0;
  };
  const tick = (ts: number): void => {
    if (!active) return;
    if (t0 < 0) t0 = ts - prog * t.holdMs;
    const p = Math.min(1, (ts - t0) / t.holdMs);
    set(p);
    if (p >= 1) {
      stop();
      finished = true;
      active = false;
      o.onHolding?.(false);
      o.onDone();
      return;
    }
    raf = clock.raf(tick);
  };
  const rewind = (): void => {
    stop();
    const from = prog;
    if (from <= 0) return;
    const dur = Math.max(t.rewindMinMs, from * t.rewindFullMs);
    let s0 = -1;
    const back = (ts: number): void => {
      if (active) return;
      if (s0 < 0) s0 = ts;
      const q = Math.min(1, (ts - s0) / dur);
      set(from * (1 - q * q));
      if (q < 1) raf = clock.raf(back);
      else raf = 0;
    };
    raf = clock.raf(back);
  };
  return {
    down(): void {
      if (active || finished) return;
      if (!o.canStart()) {
        o.onRefuse?.();
        return;
      }
      active = true;
      t0 = -1;
      stop();
      o.onHolding?.(true);
      raf = clock.raf(tick);
    },
    up(): void {
      finished = false;
      if (!active) return;
      active = false;
      o.onHolding?.(false);
      if (prog < 1) rewind();
    },
    progress: () => prog,
    holding: () => active,
  };
}
