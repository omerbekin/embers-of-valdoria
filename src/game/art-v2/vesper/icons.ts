/**
 * Vesper - SÜRÜM 2 İKONLARI (Ömer onayı 2026-11-02, "şimdilik"; ileride değişebilir: assets/icons-v2/vesper/<ad>.png dosyasını kopyalayıp değiştirmek yeter).
 * Hazır 128x128 PNG'ler (kaynak: docs/anim-review/new-art/vesper-art/v3/icon-*.png). Anahtar = skill/pasif verisindeki v1 ikon adı:
 *  - radiance = Toll, bolt = Thunderpeal, judgehammer = Cracked Bell, divine = Great Bell of Valdoria, holy = Pealing Bells (pasif)
 * Sınıf logosu assets/misc-icons/class/vesper.png (classLogoName).
 */
import type { V2SpriteEntry } from '../types';

export const ICONS: Record<string, V2SpriteEntry> = {
  radiance: { image: 'vesper/radiance' },
  bolt: { image: 'vesper/bolt' },
  judgehammer: { image: 'vesper/judgehammer' },
  divine: { image: 'vesper/divine' },
  holy: { image: 'vesper/holy' },
};

export const SPRITES: Record<string, V2SpriteEntry> = {};
