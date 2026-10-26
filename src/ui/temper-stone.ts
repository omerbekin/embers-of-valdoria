/**
 * Ekonomi ikonlari: TEK yer (Ömer 2026-10-26). Temper tasi, Combine, Reroll, Inn ikonlari buradan okunur; ikon yolu degisirse yalniz bu importlar degisir.
 */
import stoneUrl from '../../assets/misc-icons/smith/temper_stone.webp?url';
import combineUrl from '../../assets/misc-icons/smith/combine.webp?url';
import rerollUrl from '../../assets/misc-icons/smith/reroll.webp?url';
import innUrl from '../../assets/misc-icons/town/inn.webp?url';

/** Temper tasi ikonunun adresi (DOM `<img src>`). */
export const TEMPER_STONE_ICON: string = stoneUrl;
export const COMBINE_ICON: string = combineUrl;
export const REROLL_ICON: string = rerollUrl;
export const INN_ICON: string = innUrl;

/** Ikon ogesi (dekoratif). */
export function iconImg(url: string, cls = 'ec-stone-ico'): HTMLImageElement {
  const i = document.createElement('img');
  i.className = cls;
  i.src = url;
  i.alt = '';
  i.draggable = false;
  return i;
}

/** Temper tasi ikon ogesi. */
export const temperStoneImg = (cls = 'ec-stone-ico'): HTMLImageElement => iconImg(TEMPER_STONE_ICON, cls);
