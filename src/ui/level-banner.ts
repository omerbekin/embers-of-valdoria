/**
 * Level atlama şeridi (Ömer 2026-10-18): açılır pencere YOK; savaştan çıkınca haritada kısa, engellemeyen bir şerit belirir ve kendiliğinden
 * kaybolur ("Warrior reached Level 2 · 3 stat points · fully healed"). Yönlendirme şeritte değil, Gear düğmesinin ve kahraman yer iminin
 * parlamasındadır (puan harcanana dek). Dokunuşları geçirir (pointer-events yok). Oyun içi metinler İngilizce.
 * Tek birleşik şerit (Ömer 2026-10-23, playtest U3): birden çok kahraman atlayınca kahraman başına satır yerine TEK satır
 * ("Company reached Lv 3 · 3 stat points each"); altında isteğe bağlı ikinci, sakin satır (zafer toparlanması, playtest D6).
 * Şerit açıkken mentor ders kutuları bekler (src/ui/lesson-box.ts > LESSON_BLOCKERS).
 */
import './camp-hud.css';

export interface LevelBannerLine {
  name: string;
  to: number;
  gained: number;
  points: number;
  healed: boolean;
}

/** Şerit metni (saf): tek kahraman "Warrior reached Level 2 · 3 stat points · fully healed". */
export function levelBannerText(l: LevelBannerLine): string {
  const lv = `${l.name} reached Level ${l.to}${l.gained > 1 ? ` (+${l.gained})` : ''}`;
  const pts = `${l.points} stat point${l.points === 1 ? '' : 's'}`;
  return `${lv} · ${pts}${l.healed ? ' · fully healed' : ''}`;
}

/** "Mage", "Mage and Paladin", "Mage, Paladin and Druid". */
const joinNames = (names: string[]): string => (names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/**
 * Birleşik şerit metni (saf; U3). Tek kahraman = levelBannerText. Birden çoksa: takımın (companySize) hepsi atladıysa "Company", değilse adlar;
 * aynı level'a çıktılarsa "reached Lv N", farklıysa "Mage Lv 3, Druid Lv 2"; puan herkese eşitse "N stat points each"; hepsi şifa aldıysa
 * "fully healed".
 */
export function levelBannerSummary(lines: LevelBannerLine[], companySize: number): string {
  if (!lines.length) return '';
  if (lines.length === 1) return levelBannerText(lines[0]!);
  const first = lines[0]!;
  const who = lines.length >= companySize ? 'Company' : joinNames(lines.map((l) => l.name));
  const lv = lines.every((l) => l.to === first.to) ? `${who} reached Lv ${first.to}` : `${who === 'Company' ? 'Company: ' : ''}${lines.map((l) => `${l.name} Lv ${l.to}`).join(', ')}`;
  const pts = lines.every((l) => l.points === first.points) ? `${first.points} stat point${first.points === 1 ? '' : 's'} each` : 'stat points to spend';
  return `${lv} · ${pts}${lines.every((l) => l.healed) ? ' · fully healed' : ''}`;
}

/**
 * Şeridi gösterir; `ms` sonra söner. Dönen: hemen kaldır. `companySize` = aktif takımın boyu ("Company" için), `extra` = ikinci sakin satır
 * (level atlama yoksa yalnız o görünür).
 */
export function showLevelBanner(root: HTMLElement, lines: LevelBannerLine[], ms = 5200, o: { companySize?: number; extra?: string } = {}): () => void {
  document.querySelector('.lv-banner')?.remove();
  const box = document.createElement('div');
  box.className = 'lv-banner';
  box.setAttribute('role', 'status');
  const main = levelBannerSummary(lines, o.companySize ?? lines.length);
  if (main) {
    const row = document.createElement('div');
    row.className = 'lv-line';
    row.textContent = main;
    box.append(row);
  }
  if (o.extra) {
    const row = document.createElement('div');
    row.className = main ? 'lv-line sub' : 'lv-line soft';
    row.textContent = o.extra;
    box.append(row);
  }
  if (!box.childElementCount) return () => undefined;
  root.append(box);
  const out = window.setTimeout(() => box.classList.add('out'), ms);
  const gone = window.setTimeout(() => box.remove(), ms + 600);
  return () => {
    window.clearTimeout(out);
    window.clearTimeout(gone);
    box.remove();
  };
}
