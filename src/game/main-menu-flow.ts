/**
 * Ana menü akışının saf kararları (Phaser'sız; `tests/main-menu-flow.test.ts`). Sahne: `src/game/scenes/MainMenuScene.ts`.
 *
 * Görünümler (Ömer 2026-10-08, taslak menu-flow.html (onaydan sonra silindi), animasyon 1 "March to the map"):
 *  - menu: sol sütunda logo + kutusuz yazı listesi (Play · Settings · Codex; Multiplayer Play kartlarında, Ömer 2026-10-08), arkada sefer haritası
 *  - play: harita yaklaşır (x1,18, hafif kararma), menü sola kayar, üç kart (Campaign · Quick Battle · Multiplayer) aşağıdan yükselir
 *  - settings / mp: menü sola çekilir, harita kararıp hafif bulanıklaşır, aynı sol sütunda aynı yazı stiliyle içerik belirir
 * Back / Esc bir önceki görünüme döner (kartlardan açılan Multiplayer sütunu kartlara, ana menüden açılanlar menüye).
 */

export type MenuView = 'menu' | 'play' | 'settings' | 'mp';
export type MenuItemKey = 'play' | 'mp' | 'settings' | 'codex';

/** Ana menü yazı listesi (sırası ekrandaki sıradır). Codex = wiki (ad Ömer onayı bekliyor). */
export const MAIN_ITEMS: ReadonlyArray<{ key: MenuItemKey; label: string }> = [
  { key: 'play', label: 'Play' },
  { key: 'settings', label: 'Settings' },
  { key: 'codex', label: 'Codex' },
];

/** Arka plan haritasının her görünümdeki hali: yakınlaşma, kararma (0-1 siyah örtü), bulanıklık (0-1). */
export interface BackdropLook {
  zoom: number;
  dark: number;
  blur: number;
}

export function backdropFor(view: MenuView): BackdropLook {
  switch (view) {
    case 'play':
      return { zoom: 1.18, dark: 0.2, blur: 0 };
    case 'settings':
    case 'mp':
      return { zoom: 1, dark: 0.45, blur: 1 };
    default:
      return { zoom: 1, dark: 0, blur: 0 };
  }
}

/** Klavye seçimi: yukarı/aşağı ile listede dolaşır (uçlarda başa/sona sarar). */
export function moveSelection(index: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return (((index + delta) % count) + count) % count;
}

/** Back / Esc hedefi: kartlardan açılan Multiplayer sütunu kartlara döner; diğerleri menüye; menüde Esc bir şey yapmaz (null). */
export function backTarget(view: MenuView, cameFrom: MenuView | null): MenuView | null {
  if (view === 'menu') return null;
  if (view === 'mp' && cameFrom === 'play') return 'play';
  return 'menu';
}

/** Campaign kartının düğmeleri: kayıt varsa Continue (birincil) · New · Load; kayıt yoksa New birincil, Load pasif. */
export function campaignButtons(hasLatest: boolean, anySaves: boolean): Array<{ id: 'continue' | 'new' | 'load'; label: string; primary: boolean; enabled: boolean }> {
  const out: Array<{ id: 'continue' | 'new' | 'load'; label: string; primary: boolean; enabled: boolean }> = [];
  if (hasLatest) out.push({ id: 'continue', label: 'Continue', primary: true, enabled: true });
  out.push({ id: 'new', label: 'New', primary: !hasLatest, enabled: true });
  out.push({ id: 'load', label: 'Load', primary: false, enabled: anySaves });
  return out;
}

/** Sahneye dışarıdan istenen açılış: Load Game / New Campaign penceresi kartların üstünde açılır; debug görünümü doğrudan açar. */
export function initialView(open: 'load' | 'new' | undefined, view: MenuView | undefined): MenuView {
  if (open) return 'play';
  return view ?? 'menu';
}

/** Endless en iyi dalga (yerel skor listesi `eov.endless.scores.v1` ham metninden; yoksa / bozuksa 0). Menü hafif kalsın diye endless/save.ts yüklenmez. */
export function endlessBestWave(raw: string | null): number {
  try {
    const data = JSON.parse(raw ?? 'null') as { scores?: Array<{ wave?: unknown }> } | null;
    return (data?.scores ?? []).reduce((a, e) => (typeof e?.wave === 'number' && Number.isFinite(e.wave) && e.wave > a ? e.wave : a), 0);
  } catch {
    return 0;
  }
}

/** Kayıt zamanı kısa yazı ("just now", "5m ago", "2h ago", "3d ago"). */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const m = Math.max(0, Math.floor((now - t) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 48 * 60) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}
