/**
 * Ortak kapanış yığını (Ömer 2026-11-12, Tur 8 "pencere / geri tuşu / Esc tutarlılığı"): açık her DOM penceresi / örtüsü kendini buraya
 * yazar (X'li pencereler `mountCloseButton` ile kendiliğinden). Esc ve Android geri tuşu YALNIZCA en üstteki pencereyi kapatır, X ile aynı
 * işi yapar. Hiçbir pencere açık değilken Esc / geri sahnenin kendi Esc'ine gider (harita: Menu açar); geri tuşu uygulamadan çıkarmaz.
 * Geri tuşu: dokunmatikte tek bir "bekçi" history girişi tutulur; geri basılınca bekçi harcanır, en üst pencere kapanır, bekçi yeniden konur.
 */
export interface CloseEntry {
  /** X ile aynı kapanış. */
  close: () => void;
  /** Esc / geri için özel davranış (ör. Gear önce ipucunu kapatır); verilmezse `close`. */
  esc?: () => void;
}

const stack: CloseEntry[] = [];
let installed = false;
let synthetic = false;

/** Yığına ekler; dönen işlev kaldırır (pencere kapanınca çağrılır; birden çok çağrı güvenli). */
export function pushClose(entry: CloseEntry): () => void {
  install();
  stack.push(entry);
  return () => {
    const i = stack.lastIndexOf(entry);
    if (i >= 0) stack.splice(i, 1);
  };
}

export function closeDepth(): number {
  return stack.length;
}

/** En üstteki pencereyi kapatır (Esc / geri); pencere yoksa false. */
export function closeTop(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  (top.esc ?? top.close)();
  return true;
}

function onKey(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || synthetic || e.defaultPrevented || stack.length === 0) return;
  // yazı alanındaki Esc alanın kendi işidir (ad girişi blur eder)
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  e.stopImmediatePropagation();
  e.preventDefault();
  closeTop();
}

function guardBack(): void {
  try {
    history.pushState({ eovGuard: 1 }, ''); // URL verilmez: hash (Wiki / debug yönlendirmesi) bozulmaz
  } catch {
    /* history yok / kapalı */
  }
}

/** Koruma girdisi yoksa (Chrome kullanıcı dokunuşu olmadan eklenen girdiyi geri tuşunda atlar) bir dokunuştan sonra yeniden koyar. */
function ensureGuard(): void {
  try {
    const st = history.state as { eovGuard?: number } | null;
    if (!st || !st.eovGuard) guardBack();
  } catch {
    /* yok */
  }
}

function onPop(): void {
  guardBack(); // bekçiyi yeniden koy: geri tuşu hiçbir zaman uygulamadan çıkarmaz
  if (closeTop()) return;
  // pencere yok: sahnenin kendi Esc'ine bırak (alt görünümden ana menüye döner; ana menüde / haritada yıkıcı bir şey olmaz)
  synthetic = true;
  try {
    const ev = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true } as KeyboardEventInit);
    window.dispatchEvent(ev);
  } finally {
    synthetic = false;
  }
}

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const mm = typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null;
  const coarse = !!mm && (mm('(pointer: coarse)').matches || mm('(display-mode: standalone)').matches);
  const touch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0;
  return coarse || touch;
}

let backInstalled = false;

/**
 * Geri tuşu korumasını AÇILIŞTA kurar (main.ts): pencere hiç açılmamış olsa da (ör. Load ekranı) geri tuşu oyunu kapatmaz.
 * Dokunmatik / PWA'da kurulur; masaüstünde tarayıcının geri düğmesi sayfayı terk edebilir. `force`: testler.
 */
export function installBackGuard(force = false): void {
  if (backInstalled || typeof window === 'undefined') return;
  if (!force && !isTouchDevice()) return;
  backInstalled = true;
  guardBack();
  window.addEventListener('popstate', onPop);
  window.addEventListener('pointerup', ensureGuard, true);
}

function install(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('keydown', onKey, true);
  installBackGuard();
}

/** Yalnız testler: yığını sıfırlar. */
export function resetCloseStackForTests(): void {
  stack.length = 0;
}
