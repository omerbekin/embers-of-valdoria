import type Phaser from 'phaser';

/**
 * Savaş alanı nesneleri (sprite olmayan, hücreye konan yardımcılar; ör. Tidewater Urn): assets/objects/<id>.webp
 * (asıl assets/source/objects/<id>.png, kesim `node tools/make-object-art.mjs`). Dosya yoksa ya da yüklenemezse çağıran kodla çizilen
 * yedeğe düşer (oyun çökmez). Yükleme savaşta tembel: `loadObjectArt` doku varsa true, yoksa yükler ve bitince `done` çağırır.
 */
const files = import.meta.glob('../../assets/objects/*.{webp,png}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const objectArtKey = (id: string): string => `object:${id}`;

const urlOf = (id: string): string | null => {
  for (const [path, url] of Object.entries(files)) if ((path.split('/').pop() ?? '').replace(/\.[^.]+$/, '') === id) return url;
  return null;
};

export const objectArtIds = (): string[] => Object.keys(files).map((p) => (p.split('/').pop() ?? '').replace(/\.[^.]+$/, ''));

/** Doku hazırsa true; değilse (dosya varsa) yüklemeyi başlatır ve bitince bir kez `done` çağırır, false döner. Dosya yoksa false ve `done` çağrılmaz. */
export function loadObjectArt(scene: Phaser.Scene, id: string, done: () => void): boolean {
  const key = objectArtKey(id);
  if (scene.textures.exists(key)) return true;
  const url = urlOf(id);
  if (!url) return false;
  scene.load.once(`filecomplete-image-${key}`, done);
  scene.load.image(key, url);
  if (!scene.load.isLoading()) scene.load.start();
  return false;
}
