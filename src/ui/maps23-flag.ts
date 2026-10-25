// Harita 2-3 test bayrağı (tarayıcı tarafı, hafif; maps-2-3.md 9.1): debug > Campaign > Maps 2-3 (test) > "Enable Map 2" ya da adreste ?maps=1.
// Seçim bu tarayıcıda `eov.debug.maps23` anahtarında kalır (/maps23/ kopyasında depo önekli: eov.m23.debug.maps23, src/storage-scope.ts).
// ?maps=1 açar ve hatırlar, ?maps=0 kapatır ve unutur. Kural tarafı: src/campaign/map-flags.ts > setMapOverride (oturum içi).

export const MAPS23_KEY = 'eov.debug.maps23';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const store = (): Store | null => {
  try {
    return typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' ? localStorage : null;
  } catch {
    return null;
  }
};

/** Adresteki ?maps= değeri: '1' açık, '0' kapalı, yoksa null. */
export function mapsParam(search: string): boolean | null {
  const v = new URLSearchParams(search).get('maps');
  if (v === '1') return true;
  if (v === '0') return false;
  return null;
}

/** Bayrak açık mı (adres > kayıtlı seçim). Adres değeri kayda yazılır. */
export function maps23On(search: string = typeof location !== 'undefined' ? location.search : '', s: Store | null = store()): boolean {
  const p = mapsParam(search);
  try {
    if (p === true) s?.setItem(MAPS23_KEY, '1');
    if (p === false) s?.removeItem(MAPS23_KEY);
  } catch {
    // depo yok: yalnız bu açılış
  }
  if (p !== null) return p;
  try {
    return s?.getItem(MAPS23_KEY) === '1';
  } catch {
    return false;
  }
}

/** Debug anahtarı: seçimi kaydeder (açık / kapalı). */
export function setMaps23(on: boolean, s: Store | null = store()): void {
  try {
    if (on) s?.setItem(MAPS23_KEY, '1');
    else s?.removeItem(MAPS23_KEY);
  } catch {
    // depo yok
  }
}
