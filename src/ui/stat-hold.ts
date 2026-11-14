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
/** Geri bildirim süreleri (bitiş parıltısı, rakam büyümesi, '+1' süzülmesi, reddetme kenarı): stat kutusu ve skill ağacı düğümü AYNI değerleri kullanır. */
export const HOLD_FEEDBACK: { doneMs: number; bumpMs: number; riseMs: number; nopeMs: number } = cfg.statHold;

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

/**
 * Basılı tutma hareketleri, ORTAK (stat kutusu: character-panel.ts; skill ağacı düğümü: tree-tab.ts, Ömer 2026-11-14 "statların mantığına çevir").
 * Stat kutusu (Ömer 2026-11-01, mockup gear-primary-hold B "Ray"): BASILI TUTMA (fare / dokunma / Enter-Space) `hold` sayacını sürer;
 * ray `--h` ile soldan sağa dolar, dolunca `onSpend`. Erken bırakma, imleç kutudan çıkması, işaretçi iptali ya da odak kaybı geri sarar (puan yok).
 * Kısa tık / dokunuş ve fare hover'ı `onPreview(true)` ile 1 puanlık önizlemeyi açar (harcamaz); fare gidince, başka yere dokununca kapanır.
 * Tutarken sayfa kaydırması (touch-action), metin seçimi (user-select) ve uzun dokunma menüsü (contextmenu) araya girmez.
 */
export function attachHoldSpend(row: HTMLElement, o: { canStart: () => boolean; onRefuse: () => void; onSpend: (viaKey: boolean) => void; onPreview: (on: boolean) => void; swallowClick: () => boolean }): void {
  let viaKey = false;
  const hold = createHold({
    canStart: o.canStart,
    onProgress: (p) => row.style.setProperty('--h', p.toFixed(4)),
    onHolding: (on) => row.classList.toggle('holding', on),
    onRefuse: () => {
      row.classList.add('nope');
      window.setTimeout(() => row.classList.remove('nope'), HOLD_FEEDBACK.nopeMs);
      o.onRefuse();
    },
    onDone: () => o.onSpend(viaKey),
  });
  row.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    viaKey = false;
    if (o.canStart()) {
      try {
        row.setPointerCapture(e.pointerId);
      } catch {
        /* yakalama yok */
      }
    }
    o.onPreview(true);
    hold.down();
  });
  row.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') o.onPreview(true);
  });
  row.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') {
      o.onPreview(false);
      hold.up(); // yakalama varken imleç dışarı çıkarsa da geri sarar (aşağıdaki sınır denetimi)
    }
  });
  // Yakalanmış işaretçi kutu dışına çıkınca pointerleave gelmez: sınır denetimi
  row.addEventListener('pointermove', (e) => {
    if (!hold.holding()) return;
    const r = row.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) hold.up();
  });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) row.addEventListener(t, () => hold.up());
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  row.addEventListener('dragstart', (e) => e.preventDefault());
  row.addEventListener('click', (e) => {
    // Kısa tık puan harcamaz; önizleme açık kalır. Puan varken dokunmatikte stat ipucunu sabitlemesin diye yutulur; puan yokken olağan ipucu kuralı (bugünkü gibi).
    if (o.swallowClick()) e.stopPropagation();
  });
  row.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
      e.preventDefault();
      viaKey = true;
      o.onPreview(true);
      hold.down();
    } else if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
  });
  row.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.key === ' ') hold.up();
  });
  row.addEventListener('blur', () => {
    hold.up();
    o.onPreview(false);
  });
}
