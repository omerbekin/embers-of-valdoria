/**
 * Hangi sahne hangi karakter görsellerine ihtiyaç duyar (telefon belleği, 0.8.2 Grave Field çökmesi; Ömer 2026-10-16).
 * Eskiden her sahne ve ana menünün arka plan yüklemesi TÜM sprite'ları (her mobun idle'ı + elit/boss poz sayfaları ~60 MB doku) yükleyip
 * savaşta da tutuyordu; telefonda tarayıcı sekmeyi bellek yüzünden kapatıp ana menüye düşüyordu. Artık:
 *  - savaş yalnızca sahnedeki birimlerin (+ skill ile çağrılabilen birimlerin) görsellerini yükler, gerisini bırakır (`battleSpriteIds`);
 *  - harita / takım seçimi / menü yalnızca sınıfların, çağrıların ve tüccarın görsellerini ister (`classSpriteIds`; moblar yalnızca savaşta).
 * Saf (Phaser'sız) kimlik listeleri; yükleme ve bırakma src/game/assets.ts > preloadAssets.
 */
import { content } from '../engine';

/** Tüccar figürü (src/game/merchant-art.ts > MERCHANT_ID; o modül Phaser çeker, burada sabit). */
const MERCHANT = 'merchant';

const unitDef = (id: string) => content.classes[id] ?? content.bosses[id] ?? content.mobs[id] ?? content.summons[id];

/** Çağrılabilen birimlerin görselleri (skill `summon` etkisi yalnızca data/summons id'lerini çağırır): az ve küçük, hep yüklü. */
const summonSpriteIds = (): string[] => Object.values(content.summons).map((d) => d.spriteId);

/** Savaştaki birim kimlikleri (sınıf / mob / boss / çağrı id'si) -> yüklenecek sprite klasörleri (`assets/sprites/<id>`). */
export function battleSpriteIds(units: readonly (string | null | undefined)[]): string[] {
  const out = new Set<string>(summonSpriteIds());
  for (const u of units) {
    if (!u) continue;
    out.add(unitDef(u)?.spriteId ?? u);
  }
  return [...out];
}

/** Savaş dışı ekranların (harita, kasaba, takım seçimi, ana menü arka plan yüklemesi) karakter görselleri: sınıflar + çağrılar + tüccar. */
export function classSpriteIds(): string[] {
  return [...new Set([...Object.values(content.classes).map((d) => d.spriteId), ...summonSpriteIds(), MERCHANT])];
}
