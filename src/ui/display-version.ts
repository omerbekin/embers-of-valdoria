// Ekranda görünen sürüm (Ömer 2026-10-11): package.json 3 parçalı taban sürümdür (0.6.11); küçük güncellemeler alt sürüm alır (0.6.11.1)
// ve yalnızca data/patch-notes.json'un EN ÜSTTEKİ girdisinde yazar. Derlemede vite.config.ts > __DISPLAY_VERSION__ tek satırlık sabit
// olarak gömülür (notlar dosyası menü paketine girmez); tanımsızsa (ör. araç dışı çalıştırma) __APP_VERSION__.

/** `v` taban sürümün kendisi ya da onun '.N' alt sürümü mü (0.6.11 / 0.6.11.3 -> 0.6.11 için evet; 0.6.111 hayır). */
export function isSubVersionOf(v: string, base: string): boolean {
  return v === base || (v.startsWith(`${base}.`) && /^\d+$/.test(v.slice(base.length + 1)));
}

/** Görünen sürüm: notların en üst sürümü taban sürümün kendisi ya da '.N' alt sürümüyse o, değilse taban (saf; testli). */
export function displayVersionFrom(top: string | undefined, base: string): string {
  if (!top) return base;
  return isSubVersionOf(top, base) ? top : base;
}

const base = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';
export const DISPLAY_VERSION: string = typeof __DISPLAY_VERSION__ === 'string' ? displayVersionFrom(__DISPLAY_VERSION__, base) : base;
