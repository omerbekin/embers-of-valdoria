/**
 * Depo kapsamı (Harita 2-3 test kopyası, 2026-10-25): `maps-2-3` dalının derlemesi GitHub Pages'te ana oyunla AYNI origin'de
 * `/embers-of-valdoria/maps23/` altında yayınlanır. localStorage / sessionStorage origin başınadır; bu kopya ana oyunun `eov.*` kayıtlarını
 * OKUMAMALI ve BOZMAMALI. Sayfa yolu `/maps23/` içeriyorsa `window.localStorage` ve `window.sessionStorage` önekli bir sarmalayıcıyla
 * değiştirilir: `eov.X` -> `eov.m23.X`, diğer anahtarlar `eov.m23.~X`. Kod içindeki dağınık `'eov.'` sabitleri değişmez; anahtar listesi
 * (length / key / clear) yalnızca kopyanın kendi anahtarlarını görür. main.ts'in İLK import'u (storage-migrate'ten de önce).
 * Yerel önizleme (5002, yol `/`) ve ana oyun etkilenmez. Bulut senkronu bu kopyada kapalı (src/cloud/cloud.ts > browserDeps).
 */

export const ISOLATED_SEGMENT = '/maps23/';
export const SCOPE_PREFIX = 'eov.m23.';
const OTHER = '~';

/** Bu sayfa ayrı kapsamlı test kopyası mı (yol `/maps23/` içeriyor). */
export function isIsolatedCopy(pathname: string | undefined = typeof location !== 'undefined' ? location.pathname : undefined): boolean {
  return !!pathname && pathname.includes(ISOLATED_SEGMENT);
}

/** Uygulamanın anahtarı -> gerçek depodaki anahtar. */
export function scopedKey(key: string): string {
  return key.startsWith('eov.') ? SCOPE_PREFIX + key.slice(4) : SCOPE_PREFIX + OTHER + key;
}

/** Gerçek depodaki anahtar -> uygulamanın anahtarı (kopyanın değilse null). */
export function unscopedKey(raw: string): string | null {
  if (!raw.startsWith(SCOPE_PREFIX)) return null;
  const rest = raw.slice(SCOPE_PREFIX.length);
  return rest.startsWith(OTHER) ? rest.slice(OTHER.length) : `eov.${rest}`;
}

/** Önekli depo: okuma / yazma / silme yalnız kopyanın anahtarlarında; liste yalnız onları gösterir. */
export function scopedStorage(base: Storage): Storage {
  const own = (): string[] => {
    const out: string[] = [];
    for (let i = 0; i < base.length; i++) {
      const k = base.key(i);
      const u = k === null ? null : unscopedKey(k);
      if (u !== null) out.push(u);
    }
    return out;
  };
  const api = {
    getItem: (k: string): string | null => base.getItem(scopedKey(String(k))),
    setItem: (k: string, v: string): void => base.setItem(scopedKey(String(k)), String(v)),
    removeItem: (k: string): void => base.removeItem(scopedKey(String(k))),
    key: (i: number): string | null => own()[i] ?? null,
    clear: (): void => {
      for (const k of own()) base.removeItem(scopedKey(k));
    },
    get length(): number {
      return own().length;
    },
  };
  return api as Storage;
}

/** Kopyadaysa `win.localStorage` / `win.sessionStorage` önekli sarmalayıcıyla değiştirilir. Kurulduysa true. */
export function installStorageScope(win: (Window & typeof globalThis) | undefined = typeof window !== 'undefined' ? window : undefined): boolean {
  if (!win || !isIsolatedCopy(win.location?.pathname)) return false;
  let done = false;
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      const base = win[name];
      if (!base) continue;
      Object.defineProperty(win, name, { value: scopedStorage(base), configurable: true, enumerable: true, writable: false });
      done = true;
    } catch {
      // erişilemeyen depo (gizli mod): oyun zaten deposuz çalışır
    }
  }
  return done;
}

installStorageScope();
