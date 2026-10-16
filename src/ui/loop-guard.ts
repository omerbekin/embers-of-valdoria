/**
 * Oyun döngüsü güvenlik ağı (2026-10-14, 0.7.7 Ashford donması). Phaser'ın requestAnimationFrame döngüsü bir karede yakalanmayan TEK bir
 * hata fırlatılınca bir sonraki kareyi hiç istemez: oyun kalıcı olarak donar (son çizilen kare ekranda kalır, Phaser girdisi ölür, yalnızca
 * DOM düğmeleri çalışır). Bu modül döngünün kare işlevini sarar: hata konsola yazılır (aynı ileti bir kez), döngü sonraki kareyle sürer.
 * Kök hatalar yine düzeltilir; bu ağ yalnızca bir hatanın oyunu tümden kilitlemesini önler.
 */

import { captureError } from '../diag/diag';

export interface GuardLog {
  /** Görülen farklı hata iletileri (en fazla `max`). */
  readonly seen: string[];
  /** Toplam yakalanan hata sayısı. */
  count: number;
}

/** `fn`'yi sarar: fırlattığı hata yutulur ve `onError`'a gider (onError'ın kendi hatası da yutulur). */
export function guarded<A extends unknown[]>(fn: (...a: A) => void, onError: (e: unknown) => void): (...a: A) => void {
  return (...a: A) => {
    try {
      fn(...a);
    } catch (e) {
      try {
        onError(e);
      } catch {
        /* günlük hatası döngüyü durdurmasın */
      }
    }
  };
}

/** Hata günlüğü: aynı ileti yalnızca ilk kez konsola yazılır (her karede tekrarlayan hata konsolu boğmasın). */
export function makeGuardLog(max = 20, write: (msg: string, e: unknown) => void = (m, e) => console.error(`[loop-guard] ${m}`, e)): GuardLog & { add: (e: unknown) => void } {
  const log = {
    seen: [] as string[],
    count: 0,
    add(e: unknown) {
      log.count++;
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      if (log.seen.includes(msg) || log.seen.length >= max) return;
      log.seen.push(msg);
      write(msg, e);
    },
  };
  return log;
}

interface LoopLike {
  step: (time: number) => void;
  stepLimitFPS: (time: number) => void;
  hasFpsLimit?: boolean;
  raf?: { isRunning?: boolean; callback?: (time: number) => void };
}

export const loopErrors = makeGuardLog();

/** Phaser TimeStep'in kare işlevlerini sarar (oyun oluşturulduktan hemen sonra, döngü başlamadan çağrılır; start/resume bunları bağlar). */
export function installLoopGuard(loop: LoopLike): void {
  const step = loop.step;
  const limited = loop.stepLimitFPS;
  // Yeni (ilk kez görülen) hata ileti hata raporuna da gider (src/diag/diag.ts; onay kapalıysa yalnızca yerel iz)
  const onError = (e: unknown): void => {
    const n = loopErrors.seen.length;
    loopErrors.add(e);
    if (loopErrors.seen.length > n) captureError(e, 'frame');
  };
  loop.step = guarded((t: number) => step.call(loop, t), onError);
  loop.stepLimitFPS = guarded((t: number) => limited.call(loop, t), onError);
  // Döngü zaten başladıysa (önbellekten anında açılış) çalışan geri çağrı da sarılır
  if (loop.raf?.isRunning) loop.raf.callback = loop.hasFpsLimit ? loop.stepLimitFPS : loop.step;
}
