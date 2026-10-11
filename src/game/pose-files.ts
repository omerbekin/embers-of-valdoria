/**
 * Poz kütüphanesi DOSYALARI (Phaser'sız, DOM'suz: Codex ve testler de okur). Vite derlemede tarar; yalnızca URL'ler pakete girer, dosyalar
 * BattleScene bir pozlu sınıfı kurarken iner (src/game/pose-rig.ts; tembel, sınıf başına).
 *   assets/poses/<dir>/<poz>.png (+ small/)        gövde pozları (eller boş)
 *   assets/weapons/<aile>/<görünüm>.png (+ small/)  silah katmanı
 * Asıllar assets/source/poses/ (oyuna yüklenmez); kesim `node tools/make-poses.mjs`.
 */
const bodyFiles = import.meta.glob('../../assets/poses/*/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const bodySmall = import.meta.glob('../../assets/poses/*/small/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const weaponFiles = import.meta.glob('../../assets/weapons/*/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const weaponSmall = import.meta.glob('../../assets/weapons/*/small/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** '<klasör>/<ad>' -> URL (yol sonundaki iki parça; small/ alt klasörü atlanır). */
function index(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(files)) {
    const parts = path.split('/').filter((p) => p !== 'small');
    const name = (parts.pop() ?? '').replace(/\.[^.]+$/, '');
    out[`${parts.pop() ?? ''}/${name}`] = url;
  }
  return out;
}

const BODY = index(bodyFiles);
const BODY_SMALL = index(bodySmall);
const WEAPON = index(weaponFiles);
const WEAPON_SMALL = index(weaponSmall);

/** Gövde pozu URL'si (`small` = yarı boy); dosya yoksa null. */
export const poseBodyUrl = (dir: string, pose: string, small = false): string | null => (small ? BODY_SMALL : BODY)[`${dir}/${pose}`] ?? null;
/** Silah görünümü URL'si (`small` = yarı boy); dosya yoksa null. */
export const weaponUrl = (family: string, look: string, small = false): string | null => (small ? WEAPON_SMALL : WEAPON)[`${family}/${look}`] ?? null;

/** Diskteki tüm poz/silah dosyaları (Codex Assets kapsamı: tests/wiki-assets.test.ts). */
export const POSE_FILE_PATHS: readonly string[] = [...Object.keys(bodyFiles), ...Object.keys(bodySmall), ...Object.keys(weaponFiles), ...Object.keys(weaponSmall)].map((p) => p.replace(/^(\.\.\/)+/, ''));
