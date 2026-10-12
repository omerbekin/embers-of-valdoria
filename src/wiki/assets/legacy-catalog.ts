/**
 * LEGACY kataloğu (Wiki > Legacy): oyunda kullanılmayan, yedeklenen ya da yerine yenisi konan her şey. Saf TypeScript
 * (Phaser'sız, DOM'suz, testlenebilir). HİÇBİR liste elle yazılmaz: dizin taramasından (assets/sprites, assets/avatars)
 * ve oyun verisinden ("kullanılmayan" hesabı: hiçbir skill'in sfx listesinde olmayan ses, hiçbir yerde
 * gösterilmeyen ikon, hiçbir skill'in kullanmadığı efekt türü, class'sız sprite/avatar) türetilir. Her öğe 'neden legacy'
 * etiketi taşır ("Replaced by ..." bilinirse o, bilinmiyorsa "Unused ...").
 * Eski karakter sanatı (sprites_old, concepts, characters-pool) 2026-10-12'de oyundan ve Codex'ten kaldırıldı.
 */
import type { AssetFiles, Catalog } from '../../gallery/catalog';
import { avatarMap } from '../../gallery/catalog';

/** Legacy bölümünün dosya tabloları (Vite `import.meta.glob`; testte fs). */
export type LegacyFiles = AssetFiles;

export type LegacyKind = 'orphan' | 'icon' | 'vfx' | 'sound';

export interface LegacyItem {
  kind: LegacyKind;
  /** Benzersiz kimlik (yol ya da ad). */
  id: string;
  label: string;
  /** Görsel varsa URL. */
  url: string | null;
  /** Neden legacy: "Replaced by ..." ya da "Unused ...". */
  why: string;
  /** Kısa ek bilgi (sahip class, dosya yolu). */
  note: string;
  search: string;
}

export interface LegacyGroup {
  kind: LegacyKind;
  title: string;
  note: string;
  items: LegacyItem[];
}

export interface LegacyCatalog {
  groups: LegacyGroup[];
  total: number;
}

const fileOf = (path: string): string => path.replace(/\\/g, '/').split('/').pop() ?? '';
const stem = (file: string): string => file.replace(/\.[^.]+$/, '');
const dirOf = (path: string): string => path.replace(/\\/g, '/').split('/').slice(-2)[0] ?? '';

const item = (kind: LegacyKind, id: string, label: string, url: string | null, why: string, note: string): LegacyItem => ({
  kind,
  id,
  label,
  url,
  why,
  note,
  search: `legacy ${kind} ${id} ${label} ${why} ${note}`.toLowerCase(),
});

export const LEGACY_TITLES: Record<LegacyKind, { title: string; note: string }> = {
  orphan: { title: 'Unlinked sprite and avatar files', note: 'Files in assets/sprites or assets/avatars that no class or summon points to.' },
  icon: { title: 'Spare icons', note: 'Pixel icons (src/ui/icon-kinds.ts) that no skill, class, stat, status, ground or UI button shows.' },
  vfx: { title: 'Spare animations', note: 'Effect kinds (src/ui/vfx-kinds.ts) that no skill uses. Backups can be brought back by setting a skill\'s vfx.' },
  sound: { title: 'Unused sounds', note: 'Sounds (data/audio.json) that are in no skill\'s sfx list. Some are UI sounds played from code.' },
};

export function buildLegacy(cat: Catalog, files: LegacyFiles): LegacyCatalog {
  const groups: LegacyGroup[] = [];
  const add = (kind: LegacyKind, items: LegacyItem[]): void => {
    groups.push({ kind, ...LEGACY_TITLES[kind], items });
  };
  // --- class'sız sprite klasörleri / avatarlar ---
  const orphans: LegacyItem[] = [];
  for (const [path, url] of Object.entries(files.sprites)) {
    const id = dirOf(path);
    if (cat.orphans.sprites.includes(id)) orphans.push(item('orphan', path, `${id} (${stem(fileOf(path))})`, url, 'Unused: no class or summon points to this sprite folder', `assets/sprites/${id}/${fileOf(path)}`));
  }
  for (const [path, url] of Object.entries(files.avatars)) {
    const id = stem(fileOf(path));
    if (cat.orphans.avatars.includes(id) && avatarMap(files.avatars)[id]) orphans.push(item('orphan', path, `${id} avatar`, url, 'Unused: no class or summon points to this avatar', `assets/avatars/${fileOf(path)}`));
  }
  add('orphan', orphans);

  // --- yedek ikonlar ---
  add('icon', cat.icons.filter((i) => i.category === 'spare').map((i) =>
    item('icon', i.name, i.name, null, cat.fxSprites.includes(i.name) ? 'Unused: no skill, class, stat or status shows it (an animation may still draw it as an effect sprite)' : 'Unused: nothing shows it', 'src/ui/icon-kinds.ts')));

  // --- yedek animasyon türleri ---
  add('vfx', cat.vfxKinds.filter((k) => k.usedBy.length === 0).map((k) =>
    item('vfx', k.kind, k.kind, null, k.backup ? 'Backup: kept in code, no skill uses it' : 'Unused: no skill uses it', 'src/ui/vfx-kinds.ts')));

  // --- kullanılmayan sesler ---
  add('sound', cat.sounds.filter((s) => s.usedBy.length === 0).map((s) =>
    item('sound', s.id, s.label, null, 'Unused: no skill plays it (UI sound or spare)', 'data/audio.json')));

  const kept = groups.filter((g) => g.items.length > 0);
  return { groups: kept, total: kept.reduce((n, g) => n + g.items.length, 0) };
}

