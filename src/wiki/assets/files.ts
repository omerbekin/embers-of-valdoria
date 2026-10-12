import { assetFiles } from '../../gallery/files';
import type { LegacyFiles } from './legacy-catalog';

/**
 * Wiki > Assets / Legacy görsel dosyaları: sprites/avatars gallery/files.ts'ten gelir (Vite `import.meta.glob`, elle liste yok).
 * Eski karakter sanatı klasörleri (sprites_old, concepts, characters-pool) 2026-10-12'de kaldırıldı.
 */
export const legacyFiles: LegacyFiles = assetFiles;
