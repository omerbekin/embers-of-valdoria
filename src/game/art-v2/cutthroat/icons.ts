/**
 * Cutthroat - SÜRÜM 2 İKONLARI (yalnızca ikon; animasyon ve ses v1'de kalır). Kılavuz: docs/design/icon-redraw-plan.md > 4.11
 *
 * Hepsi ChatGPT boyalı resimdir (kaynak assets/source/class-icons/cutthroat-sheet.png, kesici tools/make-class-icons.py).
 * v1 ikon adları (ICONS anahtarları): venomedge (Venom Edge), saltire (Saltire Cut), smokebomb (Smoke Bomb), backstab (Backstab), opportunist (pasif).
 * Class logosu (cutthroatlogo) v1'de kalır; amblem assets/misc-icons/class/cutthroat.png.
 */
import type { V2SpriteEntry } from '../types';

export const ICONS: Record<string, V2SpriteEntry> = {
  venomedge: { image: 'cutthroat/venomedge' },
  saltire: { image: 'cutthroat/saltire' },
  smokebomb: { image: 'cutthroat/smokebomb' },
  backstab: { image: 'cutthroat/backstab' },
  opportunist: { image: 'cutthroat/opportunist' },
};

export const SPRITES: Record<string, V2SpriteEntry> = {};
