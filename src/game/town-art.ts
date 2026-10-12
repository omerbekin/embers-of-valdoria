import type Phaser from 'phaser';

/**
 * Kasaba ekranı arka planları: assets/towns/<id>.webp (asıl assets/source/backgrounds-v2, üretim `node tools/make-town-art.mjs`).
 * Haritanın açılışını yavaşlatmasın diye ilk kasabaya girişte yüklenir; dosya yoksa ekran koyu degradeye düşer (oyun çökmez).
 */
const files = import.meta.glob('../../assets/towns/*.{webp,png,jpg,jpeg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const townArtKey = (id: string): string => `town:${id}`;

const urlOf = (id: string): string | null => {
  for (const [path, url] of Object.entries(files)) if ((path.split('/').pop() ?? '').replace(/\.[^.]+$/, '') === id) return url;
  return null;
};

export const townArtIds = (): string[] => Object.keys(files).map((p) => (p.split('/').pop() ?? '').replace(/\.[^.]+$/, ''));

/** Görsel hazırsa `done` hemen; değilse yüklenince (ya da hata / dosya yoksa yine) bir kez çağrılır. Dönen değer: doku şu an var mı. */
export function loadTownArt(scene: Phaser.Scene, id: string, done: () => void): boolean {
  const key = townArtKey(id);
  if (scene.textures.exists(key)) return true;
  const url = urlOf(id);
  if (!url) return false;
  let fired = false;
  const fire = (): void => {
    if (fired) return;
    fired = true;
    scene.load.off('loaderror', onError);
    done();
  };
  const onError = (file: Phaser.Loader.File): void => {
    if (file.key === key) fire();
  };
  scene.load.once(`filecomplete-image-${key}`, fire);
  scene.load.on('loaderror', onError);
  scene.load.image(key, url);
  if (!scene.load.isLoading()) scene.load.start();
  return false;
}
