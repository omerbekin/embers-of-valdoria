// "Performance mode" ayarı (Ömer 2026-10-11; Settings > Gameplay, ana menü Settings sütunu da aynı kaynak): Auto / On / Off.
// Açıkken (src/game/perf-apply.ts uygular): tuval mantıksal boyutun ~0,67 katında çizilir ve CSS büyütür (yerleşim koordinatları aynı),
// kare hızı 30'a sınırlanır, tam ekran FX geçişleri (postFX parıltı / ısı titremesi) atlanır, süs niteliğindeki boşta animasyonlar durur.
// Auto: zayıf cihaz tahmini (dokunmatik + az çekirdek / az bellek) ya da ölçülen kare süresi (src/ui/fps-meter.ts) yüksekse açılır;
// ölçümle tespit kalıcıdır (bir sonraki açılışta hemen açık başlar). Oyun kuralı / motor değişmez; yalnızca sunum.
// "Show FPS" ayarı (varsayılan kapalı): köşede küçük FPS + kare süresi göstergesi (src/ui/fps-meter.ts).
export type PerfSetting = 'auto' | 'on' | 'off';
export const PERF_SETTINGS: readonly PerfSetting[] = ['auto', 'on', 'off'];

const KEY = 'eov.perfMode';
const AUTO_KEY = 'eov.perfAuto';
const FPS_KEY = 'eov.showFps';

const listeners = new Set<(lite: boolean) => void>();
const fpsListeners = new Set<(on: boolean) => void>();

// okunan değerler bellekte tutulur (kare ölçer her karede sorar; localStorage'a her karede gidilmez)
const mem = new Map<string, string | null>();

function read(key: string): string | null {
  if (mem.has(key)) return mem.get(key)!;
  let v: string | null = null;
  try {
    v = window.localStorage?.getItem(key) ?? null;
  } catch {
    v = null;
  }
  mem.set(key, v);
  return v;
}

function write(key: string, v: string): void {
  mem.set(key, v);
  try {
    window.localStorage?.setItem(key, v);
  } catch {
    /* depolama yok: yalnızca bu oturum */
  }
}

/** Kayıtlı değeri okur (bozuk / yok = auto). */
export function parsePerfSetting(raw: string | null | undefined): PerfSetting {
  return raw === 'on' || raw === 'off' ? raw : 'auto';
}

export const perfSettingLabel = (v: PerfSetting): string => (v === 'on' ? 'On' : v === 'off' ? 'Off' : 'Auto');

export interface DeviceHints {
  /** navigator.hardwareConcurrency */
  cores?: number | undefined;
  /** navigator.deviceMemory (GB; Chrome yuvarlar: 0.5, 1, 2, 4, 8) */
  memory?: number | undefined;
  /** Dokunmatik birincil girdi (pointer: coarse) */
  coarse?: boolean | undefined;
}

/**
 * Donanım ipucuyla zayıf cihaz tahmini (saf). Bilerek temkinli: yalnızca dokunmatik cihazda ve belirgin zayıf donanımda (bellek <= 2 GB ya da
 * <= 4 çekirdek). Orta sınıf telefonlar (ör. 4 GB / 8 çekirdek) buradan değil ölçülen kare süresinden yakalanır (`frameTimeSaysSlow`).
 */
export function lowEndGuess(h: DeviceHints): boolean {
  if (!h.coarse) return false;
  if (h.memory !== undefined && h.memory > 0 && h.memory <= 2) return true;
  if (h.cores !== undefined && h.cores > 0 && h.cores <= 4) return true;
  return false;
}

/** Ölçüm penceresinin kare süreleri (ms) yavaş mı (saf): ortanca 24 ms'den uzun (≈ 42 fps altı) ve yeterli örnek. */
export const SLOW_FRAME_MS = 24;
export function frameTimeSaysSlow(frames: readonly number[]): boolean {
  if (frames.length < 30) return false;
  const s = [...frames].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]! > SLOW_FRAME_MS;
}

function hints(): DeviceHints {
  if (typeof navigator === 'undefined') return {};
  let coarse = false;
  try {
    coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
  } catch {
    coarse = false;
  }
  return { cores: navigator.hardwareConcurrency, memory: (navigator as unknown as { deviceMemory?: number }).deviceMemory, coarse };
}

export function perfSetting(): PerfSetting {
  return parsePerfSetting(read(KEY));
}

/** Auto modunda ölçümle zayıf bulundu mu (kalıcı). */
export function autoDetected(): boolean {
  return read(AUTO_KEY) === '1';
}

/** Saf karar: ayar + tahmin + ölçüm -> performans modu açık mı. */
export function resolvePerfLite(setting: PerfSetting, guess: boolean, measuredSlow: boolean): boolean {
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return guess || measuredSlow;
}

let cached: boolean | null = null;

/** Performans modu şu an etkin mi (her yerden ucuz okunur). */
export function perfLite(): boolean {
  cached ??= resolvePerfLite(perfSetting(), lowEndGuess(hints()), autoDetected());
  return cached;
}

function recompute(): void {
  const before = cached;
  cached = null;
  const now = perfLite();
  if (now !== before) for (const fn of listeners) fn(now);
}

export function setPerfSetting(v: PerfSetting): void {
  write(KEY, v);
  recompute();
  for (const fn of settingListeners) fn(v);
}

/** Ölçüm (fps-meter) zayıf cihaz buldu: Auto'da açılır ve hatırlanır. */
export function noteMeasuredSlow(): void {
  if (autoDetected()) return;
  write(AUTO_KEY, '1');
  recompute();
}

/** Etkin durum değişince (ayar ya da Auto tespiti). */
export function onPerfLiteChange(fn: (lite: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const settingListeners = new Set<(v: PerfSetting) => void>();
/** Ayar değişince (Settings ekranları birbirini güncel tutar). */
export function onPerfSettingChange(fn: (v: PerfSetting) => void): () => void {
  settingListeners.add(fn);
  return () => settingListeners.delete(fn);
}

/** Satırda bir sonraki değer (dokununca / sağ ok): Auto -> On -> Off -> Auto; `d` -1 geri. */
export function cyclePerfSetting(v: PerfSetting, d = 1): PerfSetting {
  const i = PERF_SETTINGS.indexOf(v);
  return PERF_SETTINGS[(i + (d < 0 ? PERF_SETTINGS.length - 1 : 1)) % PERF_SETTINGS.length]!;
}

// ---------------------------------------------------------------- Show FPS

export function showFps(): boolean {
  return read(FPS_KEY) === '1';
}

export function setShowFps(on: boolean): void {
  write(FPS_KEY, on ? '1' : '0');
  for (const fn of fpsListeners) fn(on);
}

export function onShowFpsChange(fn: (on: boolean) => void): () => void {
  fpsListeners.add(fn);
  return () => fpsListeners.delete(fn);
}
