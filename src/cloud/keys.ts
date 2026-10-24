/**
 * Bulut senkronu anahtar listesi (accounts-plan.md > Kayıt senkronu; Ömer 2026-10-24 karar 4: yalnızca ilerleme senkronlanır, ayarlar cihazda
 * kalır). Hafif modül: ana menünün de kullandığı kv-storage.ts buradan okur. Yeni bir `eov.*` anahtarı bilinçli karar ister
 * (tests/cloud-sync.test.ts anahtar anlık görüntüsü kırmızıya döner).
 */
export const SYNC_KEYS = ['eov.campaign.v1', 'eov.endless.v1', 'eov.endless.scores.v1', 'eov.tutorial.v1'] as const;
export type SyncKey = (typeof SYNC_KEYS)[number];

/** Buluttan inen paket uygulanmadan önce yerel ilerlemenin yedeği (kendisi senkronlanmaz). */
export const BACKUP_KEY = 'eov.cloud.backup.v1';

const SET: ReadonlySet<string> = new Set(SYNC_KEYS);
export const isSyncKey = (key: string): key is SyncKey => SET.has(key);
