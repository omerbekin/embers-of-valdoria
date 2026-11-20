/**
 * ESKİ SÜRÜM SEKMESİ: oyun açıkken yeni sürüm yayınlanırsa (GitHub Pages / Cloudflare) eski hash'li parçalar sunucudan silinir; sekme
 * sonra tembel yüklenen bir ekranı (ör. campaign-slots-ui) açmaya çalışınca "Failed to fetch dynamically imported module" alır ve
 * düğme hiçbir şey yapmaz (0.8.3 telefonda Continue). Çözüm: bu hatada sayfayı bir kez yenile (yeni sürüm yüklenir; kayıt localStorage'da
 * durur). Yenileme döngüsüne girmesin diye RELOAD_GAP_MS içinde ikinci kez yenilemez. Çevrimdışıysa yenilemez (handleChunkError).
 */
import { logEvent } from '../diag/diag';
// Statik: çevrimdışıyken tembel parça yüklenemez (düzeltilen hatanın kendisi)
import { showElToast } from './el-toast';

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

/** Çevrimdışıyken parça yüklenemedi: yenilemek tarayıcının "internet yok" sayfasını açar (oyun gider); oyunda kalınır. */
export const OFFLINE_CHUNK_TEXT = 'No connection. Reconnect and try again.';

export interface ChunkErrorDeps {
  /** navigator.onLine (false kesin çevrimdışı; true yanılabilir). */
  online: () => boolean;
  /** Sayfa sunucusu yanıt veriyor mu (gerçek bağlantı denetimi). */
  probe: () => Promise<boolean>;
  reload: (reason: unknown) => boolean;
  warn: (msg: string) => void;
}

/**
 * Parça yükleme hatası (sağlamlık taraması B2, 2026-11-15): çevrimdışıysa yenilemez, İngilizce uyarı verir. Çevrimiçi görünüyorsa önce sayfa
 * sunucusu yoklanır (onLine yanılabilir); yanıt yoksa uyarı, varsa eskisi gibi bir kez yenileme. Olay her durumda yakalanmış sayılır (true):
 * preventDefault eşzamanlı çağrılmalı, yoklama sonradan biter.
 */
export function handleChunkError(reason: unknown, d: ChunkErrorDeps): true {
  if (!d.online()) {
    logEvent('info', 'chunk load failed offline: no reload');
    d.warn(OFFLINE_CHUNK_TEXT);
    return true;
  }
  void d.probe().then(
    (ok) => {
      if (!ok) {
        logEvent('info', 'chunk load failed, server unreachable: no reload');
        d.warn(OFFLINE_CHUNK_TEXT);
      } else if (!d.reload(reason)) logEvent('info', 'chunk load failed again within reload gap');
    },
    () => d.warn(OFFLINE_CHUNK_TEXT),
  );
  return true;
}

const browserDeps: ChunkErrorDeps = {
  online: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
  probe: async () => {
    try {
      const r = await fetch(location.pathname || '/', { method: 'HEAD', cache: 'no-store' });
      return r.status > 0;
    } catch {
      return false;
    }
  },
  reload: reloadOnce,
  warn: (msg) => showElToast(msg, { bad: true, ms: 5000 }),
};

export function installStaleBuildReload(): void {
  // Vite'in kendi olayı (önyüklenen parça bulunamadı)
  window.addEventListener('vite:preloadError', (e) => {
    if (handleChunkError((e as Event & { payload?: unknown }).payload, browserDeps)) e.preventDefault();
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (isStaleChunkError(e.reason) && handleChunkError(e.reason, browserDeps)) e.preventDefault();
  });
}
