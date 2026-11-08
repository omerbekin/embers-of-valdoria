/**
 * Thunder Skald - SÜRÜM 2 İKONLARI (2026-11-08, Ömer: tamamlama = ödünç yok). Kendi boyalı 128x128 PNG'leri (Terra 6.1 çizdi; asıllar
 * assets/source/skald-icons, oyundaki kopyalar assets/icons-v2/skald). Anahtar = skill/pasif verisindeki v1 ikon adı (içerik testi geçerli bir
 * ikon türü ister; v2 seçiliyken görsel hep bu PNG):
 *  fistcrush2 = Hammer Spark, bolt = Thunder Strike, taunt2 = War Drum, meteor = Stormcall, judgebeam = Conductor (pasif).
 */
import type { V2SpriteEntry } from '../types';

export const ICONS: Record<string, V2SpriteEntry> = {
  fistcrush2: { image: 'skald/fistcrush2' },
  bolt: { image: 'skald/bolt' },
  taunt2: { image: 'skald/taunt2' },
  meteor: { image: 'skald/meteor' },
  judgebeam: { image: 'skald/judgebeam' },
};

export const SPRITES: Record<string, V2SpriteEntry> = {};
