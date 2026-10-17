import type Phaser from 'phaser';

/**
 * Play ekranı kart görselleri (Ömer 2026-10-10): assets/cards/<id>.webp (768x1152; asıllar assets/source/cards, üretim
 * `node tools/make-card-art.mjs`). Ana menü görününce arka planda yüklenir (kartlar Play ekranında; açılış yolunda değil, Ömer 2026-10-17). Dosya yoksa kart eski arena
 * arka planına düşer. Kimlikler: quick-battle, quick-battle-endless (Endless mode açıkken), multiplayer.
 */
const files = import.meta.glob('../../assets/cards/*.{webp,png,jpg,jpeg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const cardArtKey = (id: string): string => `card:${id}`;

export function preloadCardArt(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(files)) {
    const id = (path.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
    if (!scene.textures.exists(cardArtKey(id))) scene.load.image(cardArtKey(id), url);
  }
}

/** Bu kimliğin kart görseli DOSYASI var mı (yüklü olmasa da). */
export const hasCardArtFile = (id: string): boolean => Object.keys(files).some((p) => (p.split('/').pop() ?? '').replace(/\.[^.]+$/, '') === id);

/** Kart görselinin doku anahtarı; yüklenmemişse null. */
export const cardArt = (scene: Phaser.Scene, id: string): string | null => (scene.textures.exists(cardArtKey(id)) ? cardArtKey(id) : null);
