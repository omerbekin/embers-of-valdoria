/**
 * Hazır SPRITE SHEET efekt dosyaları (assets/vfx/<sahip>/<NN-ad>.png + aynı adlı .json): Vite derleme sırasında taranır (elle liste yok).
 * Kimlik `<sahip>/<NN-ad>` (ör. 'defender/05-ground-crack'); sahip = sürüm anahtarı (class id). Yalnızca v2 efektleri kullanır
 * (`k.sheet(...)`, src/game/vfx-sheets.ts). Kaynak/asıl dosyalar assets/source/<sahip>-vfx altındadır ve oyuna YÜKLENMEZ.
 * Phaser'sız: wiki (Codex > Assets > Versions) de buradan okur.
 */

/** Sheet metası (assets/vfx/<sahip>/<ad>.json; ChatGPT paketinin animation.json biçimi). */
export interface VfxSheetMeta {
  slug?: string;
  title?: string;
  frames: number;
  fps: number;
  duration_ms?: number;
  frame_size: [number, number];
  sheet_size?: [number, number];
  grid?: [number, number];
  order?: string;
  padding_px?: number;
  pivot?: [number, number];
}

export interface VfxSheetFile {
  id: string;
  owner: string;
  name: string;
  url: string;
  meta: VfxSheetMeta;
}

// oyun PNG'nin .webp kopyasını yükler (tools/webp-assets.mjs)
const pngs = import.meta.glob('../../assets/vfx/*/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const metas = import.meta.glob('../../assets/vfx/*/*.json', { eager: true, import: 'default' }) as Record<string, VfxSheetMeta>;

const FALLBACK_META: VfxSheetMeta = { frames: 8, fps: 10, frame_size: [256, 256], grid: [4, 2] };

/** Yol -> kimlik ('../../assets/vfx/defender/05-ground-crack.png' -> 'defender/05-ground-crack'). */
export function vfxSheetId(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  const file = (parts.pop() ?? '').replace(/\.[^.]+$/, '');
  return `${parts.pop() ?? ''}/${file}`;
}

/** Tüm sheet'ler (kimliğe göre sıralı). */
export const VFX_SHEET_FILES: readonly VfxSheetFile[] = Object.entries(pngs)
  .map(([path, url]) => {
    const id = vfxSheetId(path);
    const [owner = '', name = ''] = id.split('/');
    const meta = metas[path.replace(/\.webp$/, '.json')] ?? FALLBACK_META;
    return { id, owner, name, url, meta };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

/**
 * SEFER MOBU sheet'leri (Bölge II, ChatGPT 2026-10-16): assets/mob-vfx/<mob>/<skill>.png + .json, kimlik 'mob/<mob>/<skill>' (owner = mob id).
 * Sürüm sisteminin dışında (mob bir sürüm anahtarı değil): src/game/mob-vfx.ts skill id'sine göre oynatır. İçe aktarma
 * `node tools/import-mob-art.mjs vfx` (asıllar assets/source/mob-vfx).
 */
const mobPngs = import.meta.glob('../../assets/mob-vfx/*/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const mobMetas = import.meta.glob('../../assets/mob-vfx/*/*.json', { eager: true, import: 'default' }) as Record<string, VfxSheetMeta>;

export const mobSheetId = (mob: string, skill: string): string => `mob/${mob}/${skill}`;

export const MOB_VFX_SHEET_FILES: readonly VfxSheetFile[] = Object.entries(mobPngs)
  .map(([path, url]) => {
    const [owner = '', name = ''] = vfxSheetId(path).split('/');
    return { id: mobSheetId(owner, name), owner, name, url, meta: mobMetas[path.replace(/\.webp$/, '.json')] ?? FALLBACK_META };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export const vfxSheetFile = (id: string): VfxSheetFile | undefined => VFX_SHEET_FILES.find((f) => f.id === id) ?? MOB_VFX_SHEET_FILES.find((f) => f.id === id);

/** Bu birimlerin (mob id'leri) mob sheet kimlikleri: savaş preload'u yalnızca sahnedeki mobların efektlerini yükler. */
export const mobSheetsOf = (units: readonly string[]): string[] => MOB_VFX_SHEET_FILES.filter((f) => units.includes(f.owner)).map((f) => f.id);

/** Bir sahibin sheet kimlikleri. */
export const vfxSheetsOf = (owner: string): string[] => VFX_SHEET_FILES.filter((f) => f.owner === owner).map((f) => f.id);
