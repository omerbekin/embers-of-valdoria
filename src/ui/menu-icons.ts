import type { MenuItemId } from '../game/session-flow';
import { uiIconName } from './ui-icons';
import { iconUrl } from './dom-icons';

/**
 * Oyun içi Menu satırlarının ikonları (Ömer 2026-10-12: ortak ortalı menü, ◇ elmasların yerine yazının önünde küçük ikon). Her işlev için
 * oyunun ZATEN kullandığı ikon seçildi:
 *  - codex / settings / mainMenu: boyalı arayüz ikonları (assets/ui-icons: kitap, dişli + çekiç, kâğıt tomarı listesi = "Menu" ikonu)
 *  - teamSelect (hızlı savaşta "Leave" = takım seçimine dön): `ui:formation` (dört takım kalkanı; harita Formation bağlantısı)
 *  - retreat (Retreat to Map / Camp): `ui:move` (ayak izi + ok; savaş HUD'ı Move) - ayrı geri çekilme ikonu yok, en yakın olan
 *  - resume: piksel `next` (debug "Skip tutorial / Continue" ve sıra atlama düğmeleri)
 *  - save: piksel `clipboard` (debug > Campaign > Saves > "Save now"), load ve newGame: piksel `restart` (debug "Load last save" / Battle setup)
 * Ad art-registry'den görsele çözülür (`iconUrl`): boyalı PNG ya da kodla çizilen piksel ikon. Bu modül tembel yüklenir (game-menu.ts),
 * ana menünün ilk indirmesine ikon motoru girmez.
 */
export const MENU_ICON: Record<MenuItemId, string> = {
  resume: 'next',
  codex: uiIconName('codex'),
  settings: uiIconName('settings'),
  newGame: 'restart',
  teamSelect: uiIconName('formation'),
  retreat: uiIconName('move'),
  save: 'clipboard',
  load: 'restart',
  mainMenu: uiIconName('menu'),
};

/** Menü satırı ikonunun resim adresi (çizilemezse boş). */
export const menuIconUrl = (id: MenuItemId): string => iconUrl(MENU_ICON[id], '#d9b26a');
