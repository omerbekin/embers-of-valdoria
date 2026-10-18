/**
 * Level atlama şeridi (Ömer 2026-10-18): açılır pencere YOK; savaştan çıkınca haritada kısa, engellemeyen bir şerit belirir ve kendiliğinden
 * kaybolur ("Warrior reached Level 2 · 3 stat points · fully healed"). Yönlendirme şeritte değil, Gear düğmesinin ve kahraman yer iminin
 * parlamasındadır (puan harcanana dek). Dokunuşları geçirir (pointer-events yok). Oyun içi metinler İngilizce.
 */
import './camp-hud.css';

export interface LevelBannerLine {
  name: string;
  to: number;
  gained: number;
  points: number;
  healed: boolean;
}

/** Şerit metni (saf): tek kahraman "Warrior reached Level 2 · 3 stat points · fully healed"; birden çoksa her biri ayrı satır. */
export function levelBannerText(l: LevelBannerLine): string {
  const lv = `${l.name} reached Level ${l.to}${l.gained > 1 ? ` (+${l.gained})` : ''}`;
  const pts = `${l.points} stat point${l.points === 1 ? '' : 's'}`;
  return `${lv} · ${pts}${l.healed ? ' · fully healed' : ''}`;
}

/** Şeridi gösterir; `ms` sonra söner. Dönen: hemen kaldır. */
export function showLevelBanner(root: HTMLElement, lines: LevelBannerLine[], ms = 5200): () => void {
  document.querySelector('.lv-banner')?.remove();
  const box = document.createElement('div');
  box.className = 'lv-banner';
  box.setAttribute('role', 'status');
  for (const l of lines) {
    const row = document.createElement('div');
    row.className = 'lv-line';
    row.textContent = levelBannerText(l);
    box.append(row);
  }
  root.append(box);
  const out = window.setTimeout(() => box.classList.add('out'), ms);
  const gone = window.setTimeout(() => box.remove(), ms + 600);
  return () => {
    window.clearTimeout(out);
    window.clearTimeout(gone);
    box.remove();
  };
}
