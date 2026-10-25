// Harita bayrakları (saf; Ömer 2026-10-25, maps-2-3.md 9.1): Harita 2-3 bayrak arkasında yazılır, main'e erken birleşse de oyuncu görmez.
// Veri: campaign.json > mapFlags (`enabled: false` = kapalı). Geçersiz kılma yalnızca bu oturumda: tarayıcı tarafı (src/ui/maps23-debug.ts)
// açılışta debug anahtarını / ?maps=1'i okuyup `setMapOverride` çağırır. Sim ve testler geçersiz kılma vermezse veri neyse o.
import { CONFIG } from './data';

const overrides = new Map<string, boolean>();

/** Bu oturumda bir haritanın bayrağını geçersiz kılar (null = kaldır, veriye dön). */
export function setMapOverride(mapId: string, on: boolean | null): void {
  if (on === null) overrides.delete(mapId);
  else overrides.set(mapId, on);
}

/** Harita oyuncuya açık mı: geçersiz kılma > campaign.json > mapFlags (listede yoksa açık). */
export function mapEnabled(mapId: string): boolean {
  const o = overrides.get(mapId);
  if (o !== undefined) return o;
  return CONFIG.mapFlags?.[mapId]?.enabled ?? true;
}

/** Sefer sırasında `mapId`'den sonraki harita (campaign.json > maps); yoksa ya da kapalıysa null. */
export function nextMapId(mapId: string): string | null {
  const i = CONFIG.maps.indexOf(mapId);
  const next = i >= 0 ? CONFIG.maps[i + 1] : undefined;
  return next && mapEnabled(next) ? next : null;
}
