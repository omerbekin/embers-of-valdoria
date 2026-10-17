/**
 * Yükleme ekranı (Ömer 2026-10-09): ilk açılışta index.html'deki düz HTML/CSS kutusu (#boot; Phaser ve fontlardan önce görünür) ve
 * sonradan bir sahne eksik dosyalarını yüklerken aynı kutu (kısa yükleyici). Tasarım kiti dili: ortada logo (2026-10-13), ince altın çubuk, yüzde.
 * İlerleme: modüller yüklendi -> ana menünün dosyaları (Phaser yükleyicisi) -> fontlar -> menü hazır (kutu solarak kapanır).
 * Ölçüm: menü hazır olunca performance mark 'menu-ready' (açılış süresi).
 * Arka plan (Ömer 2026-10-13, "Dusk"): gün batımında uzak kale (public/loading/loading-bg.webp, tools/make-loading-bg.mjs), sağ altta taç amblemi
 * public/loading/emblem.webp (sağ altta dönen alevli taç amblemi); index.html'deki satır içi betik
 * bulanık yer tutucunun üstüne solarak açar (`bg-ready`). Kısa yükleyici aynı kutuyu açtığı için aynı arka planı taşır.
 */

let shownAt = 0;
let bootDone = false;
/** Bekleyen kapanış zamanlayıcıları: kutu yeniden açılınca iptal edilir (yoksa önceki kapanış yeni açılan kutuyu gizler). */
let hideTimers: number[] = [];

const el = (): HTMLElement | null => (typeof document === 'undefined' ? null : document.getElementById('boot'));

/** İlerlemeyi gösterir (0-1). `label` alt yazı (ör. "Loading"). */
export function setBootProgress(p: number, label?: string): void {
  const root = el();
  if (!root) return;
  const v = Math.max(0, Math.min(1, p));
  const fill = root.querySelector<HTMLElement>('.boot-fill');
  const pct = root.querySelector<HTMLElement>('.boot-pct');
  if (fill) fill.style.width = `${(v * 100).toFixed(1)}%`;
  if (pct) pct.textContent = `${Math.round(v * 100)}%`;
  if (label) {
    const l = root.querySelector<HTMLElement>('.boot-label');
    if (l) l.textContent = label;
  }
}

function show(label: string): void {
  const root = el();
  if (!root) return;
  // Önceki kapanış (ör. sahnenin kod parçası indi, hemen ardından sahnenin dosyaları inmeye başladı) yeni gösterimi gizlemesin:
  // 0.8.3.8'de savaşın poz dosyaları inerken kutu 420 ms sonra kapanıyor, dakikalarca siyah ekran kalıyordu.
  for (const t of hideTimers.splice(0)) window.clearTimeout(t);
  root.classList.remove('boot-off', 'boot-hidden');
  shownAt = performance.now();
  setBootProgress(0, label);
}

function hide(): void {
  const root = el();
  if (!root) return;
  setBootProgress(1);
  // çok kısa gösterimde göz kırpmasın: en az 250 ms görünür kalır, sonra solar
  const wait = Math.max(0, 250 - (performance.now() - shownAt));
  hideTimers.push(
    window.setTimeout(() => {
      root.classList.add('boot-off');
      hideTimers.push(window.setTimeout(() => root.classList.add('boot-hidden'), 420));
    }, wait),
  );
}

/** İlk menü hazır: açılış kutusu kapanır (bir kez). */
export function markBootReady(): void {
  if (typeof performance !== 'undefined' && !performance.getEntriesByName('menu-ready').length) performance.mark('menu-ready');
  if (bootDone) return;
  bootDone = true;
  hide();
  for (const fn of readyHooks.splice(0)) fn();
}

export const bootFinished = (): boolean => bootDone;

const readyHooks: Array<() => void> = [];

/** Açılış bitince bir kez çağrılır (bitmişse hemen): ör. sonraki ekranların kodunu arka planda indirmek (src/game/lazy-scenes.ts). */
export function whenBootReady(fn: () => void): void {
  if (bootDone) fn();
  else readyHooks.push(fn);
}

/**
 * Kod parçası (dynamic import: Codex, debug menüsü, ilk kez açılan sahne) yükleniyor: açılıştan sonra 150 ms'den uzun sürerse aynı kutu
 * kısa yükleyici olarak görünür, bitince kapanır. Açılış sırasında (doğrudan bağlantı: ?seed=, ?campaign=1...) açılış kutusu zaten açıktır.
 */
export function trackChunkLoad<T>(p: Promise<T>): Promise<T> {
  if (!bootDone || typeof window === 'undefined') return p;
  let visible = false;
  const timer = window.setTimeout(() => {
    visible = true;
    show('Loading');
    setBootProgress(0.5);
  }, 150);
  const done = (): void => {
    window.clearTimeout(timer);
    if (visible) hide();
  };
  p.then(done, done);
  return p;
}

/** Asgari Phaser yükleyici arayüzü (test edilebilir, Phaser'a bağımlı değil). */
export interface LoaderLike {
  list: { size: number };
  on(ev: string, fn: (v: number) => void): unknown;
  once(ev: string, fn: () => void): unknown;
}

/**
 * Sahnenin preload'u dosya kuyruğa aldıysa: açılışta ilerlemeyi açılış kutusuna bağlar; açılıştan sonra (ör. savaşa girerken eksik
 * sprite / arka plan / poz dosyaları) 150 ms'den uzun sürerse aynı kutuyu kısa yükleyici olarak açar, bitince kapatır.
 * Açılıştan sonra dosya sayısı yükleyici BAŞLARKEN ('start') ölçülür: preload içinde bu çağrıdan sonra kuyruğa giren dosyalar da
 * (savaşta pozlar ve efekt sayfaları preloadAssets'ten sonra eklenir) sayılır. Phaser preload biter bitmez start'ı çağırır.
 */
export function trackSceneLoad(loader: LoaderLike, range: [number, number] = [0.15, 0.9]): void {
  if (!bootDone) {
    if (loader.list.size === 0) return;
    loader.on('progress', (v: number) => setBootProgress(range[0] + (range[1] - range[0]) * v));
    return;
  }
  loader.once('start', () => {
    if (loader.list.size > 0) showWhileLoading(loader);
  });
}

function showWhileLoading(loader: LoaderLike): void {
  let visible = false;
  const timer = window.setTimeout(() => {
    visible = true;
    show('Loading');
  }, 150);
  loader.on('progress', (v: number) => visible && setBootProgress(v));
  loader.once('complete', () => {
    window.clearTimeout(timer);
    if (visible) hide();
  });
}
