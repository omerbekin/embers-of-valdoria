/**
 * ESKİ SÜRÜM SEKMESİ: oyun açıkken yeni sürüm yayınlanırsa (GitHub Pages / Cloudflare) eski hash'li parçalar sunucudan silinir; sekme
 * sonra tembel yüklenen bir ekranı (ör. campaign-slots-ui) açmaya çalışınca "Failed to fetch dynamically imported module" alır ve
 * düğme hiçbir şey yapmaz (0.8.3 telefonda Continue). Çözüm: bu hatada sayfayı bir kez yenile (yeni sürüm yüklenir; kayıt localStorage'da
 * durur). Yenileme döngüsüne girmesin diye RELOAD_GAP_MS içinde ikinci kez yenilemez.
 */
import { logEvent } from '../diag/diag';

const KEY = 'eov.staleReloadAt';
const RELOAD_GAP_MS = 30_000;

/** Tarayıcıların "modül parçası yüklenemedi" mesajları (Chrome, Safari, Firefox). */
export function isStaleChunkError(reason: unknown): boolean {
  const msg = reason instanceof Error ? reason.message : String(reason ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(msg);
}

/** Son yenilemeden yeterince zaman geçtiyse true (ve zamanı yazar). */
export function shouldReload(now: number, store: Pick<Storage, 'getItem' | 'setItem'>): boolean {
  try {
    const last = Number(store.getItem(KEY) ?? 0);
    if (now - last < RELOAD_GAP_MS) return false;
    store.setItem(KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

/** Yeni sürümü yüklemek için sayfayı yeniler (kayıt localStorage'da durur). Bulut kaydı "newer version" bildirimi de bunu kullanır. */
export function reloadForUpdate(reason: unknown): void {
  logEvent('info', `stale build reload: ${reason instanceof Error ? reason.message : String(reason)}`.slice(0, 200));
  location.reload();
}

function reloadOnce(reason: unknown): boolean {
  if (!shouldReload(Date.now(), sessionStorage)) return false;
  reloadForUpdate(reason);
  return true;
}

export function installStaleBuildReload(): void {
  // Vite'in kendi olayı (önyüklenen parça bulunamadı)
  window.addEventListener('vite:preloadError', (e) => {
    if (reloadOnce((e as Event & { payload?: unknown }).payload)) e.preventDefault();
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (isStaleChunkError(e.reason) && reloadOnce(e.reason)) e.preventDefault();
  });
}
