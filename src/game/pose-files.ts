/**
 * Poz kütüphanesi DOSYALARI (Phaser'sız, DOM'suz: Codex ve testler de okur). Vite derlemede tarar; yalnızca URL'ler pakete girer, dosyalar
 * BattleScene bir pozlu sınıfı kurarken iner (src/game/pose-rig.ts; tembel, sınıf başına).
 *   assets/poses/<dir>/<poz>.png (+ small/)        gövde pozları (eller boş)
 *   assets/weapons/<aile>/<görünüm>.png (+ small/)  silah katmanı
 * Asıllar assets/source/poses/ (oyuna yüklenmez); kesim `node tools/make-poses.mjs`.
 * Oyun PNG'lerin yanındaki aynı adlı .webp dosyalarını yükler (~4 kat küçük; `node tools/webp-assets.mjs`, tests/webp-assets.test.ts).
 */
const bodyFiles = import.meta.glob('../../assets/poses/*/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const bodySmall = import.meta.glob('../../assets/poses/*/small/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const weaponFiles = import.meta.glob('../../assets/weapons/*/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const weaponSmall = import.meta.glob('../../assets/weapons/*/small/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

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

// ---------------------------------------------------------------- atlaslar (Ömer 2026-10-18, yükleme performansı)
//
// Savaş tek tek ~130 küçük dosya yerine birkaç atlas indirir (assets/pose-atlas; tools/pack-pose-atlases.py, tests/pose-atlas.test.ts).
// index.json: atlas -> { tür, sahip (gövde klasörü / silah ailesi), yarı boy mu, kare -> [x, y, w, h] }. Kareler kırpılmadan paketlidir:
// pişirme tek dosyayla aynı pikselleri okur. Tek tek dosyalar Codex (Assets > Poses) ve araçlar için yerinde durur.
import atlasIndex from '../../assets/pose-atlas/index.json';

const atlasFiles = import.meta.glob('../../assets/pose-atlas/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

interface AtlasInfo {
  kind: 'body' | 'weapon';
  owner: string;
  small: boolean;
  w: number;
  h: number;
  frames: Record<string, [number, number, number, number]>;
}
const ATLASES = (atlasIndex as unknown as { atlases: Record<string, AtlasInfo> }).atlases;
const ATLAS_URL: Record<string, string> = Object.fromEntries(Object.entries(atlasFiles).map(([p, url]) => [(p.split('/').pop() ?? '').replace(/\.webp$/, ''), url]));

/** Bir karenin atlastaki yeri: atlas kimliği + doku anahtarı + URL + dikdörtgen. */
export interface AtlasFrame {
  atlas: string;
  /** Phaser doku anahtarı (`posebody:<klasör>:<atlas>` / `poseweapon:<aile>:<atlas>`; önek ve ikinci parça bırakma kuralına bağlı). */
  key: string;
  url: string;
  rect: readonly [number, number, number, number];
}

const FRAME_INDEX = new Map<string, AtlasFrame>();
for (const [atlas, a] of Object.entries(ATLASES)) {
  const url = ATLAS_URL[atlas];
  if (!url) continue;
  const key = `${a.kind === 'body' ? 'posebody' : 'poseweapon'}:${a.owner}:${atlas}`;
  for (const [name, rect] of Object.entries(a.frames)) FRAME_INDEX.set(`${a.kind}|${a.owner}|${a.small ? 1 : 0}|${name}`, { atlas, key, url, rect });
}

/** Gövde pozunun atlas karesi (`small` = yarı boy); yoksa null. */
export const poseBodyFrame = (dir: string, pose: string, small = false): AtlasFrame | null => FRAME_INDEX.get(`body|${dir}|${small ? 1 : 0}|${pose}`) ?? null;
/** Silah görünümünün atlas karesi; yoksa null. */
export const weaponFrame = (family: string, look: string, small = false): AtlasFrame | null => FRAME_INDEX.get(`weapon|${family}|${small ? 1 : 0}|${look}`) ?? null;
/** Test: tüm atlaslar (kimlik -> bilgi). */
export const POSE_ATLASES: Readonly<Record<string, AtlasInfo>> = ATLASES;

/** Diskteki tüm poz/silah dosyaları (Codex Assets kapsamı: tests/wiki-assets.test.ts). */
export const POSE_FILE_PATHS: readonly string[] = [...Object.keys(bodyFiles), ...Object.keys(bodySmall), ...Object.keys(weaponFiles), ...Object.keys(weaponSmall)].map((p) => p.replace(/^(\.\.\/)+/, ''));
