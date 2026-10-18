/**
 * Mage - SÜRÜM 2 İKONLARI. Kılavuz: docs/design/art-v2.md
 *
 * Karakter referansı (assets/sprites/mage/idle.png): koyu mavi cübbe + altın işleme (daire-çizgi ve baklava mühürleri), elinde mavi
 * kristalli bükülmüş ahşap asa, avucunda MAVİ alev, kemerinde büyü kitabı. Görsel dil: "bilgin elementalist": element (ateş/buz)
 * avuçtaki mavi çekirdekten doğar, altın mühür geometrisiyle biçimlenir. Ateşlerin çekirdeği mavi-beyaz (en sıcak gaz alevi).
 *
 * Bu class'ın v1 ikon adları (ICONS anahtarları): wizhat, echo, fireball, blizzard, manabarrier, meteor
 * SPRITES: boş (efekt dokuları vfx.ts'de gürültüyle üretilir).
 */
import type { V2SpriteEntry } from '../types';
import { crystal } from '../../pixel-art';

// ------------------------------------------------------------------------------------------------ yardımcılar

// ------------------------------------------------------------------------------------------------ ikonlar

export const ICONS: Record<string, V2SpriteEntry> = {
  // ChatGPT boyalı ikonlar (assets/source/class-icons/mage-sheet.png -> python tools/make-class-icons.py mage ...); eski kodla çizimler kaldırıldı.
  fireball: { image: 'mage/fireball' },
  blizzard: { image: 'mage/blizzard' },
  manabarrier: { image: 'mage/manabarrier' },
  meteor: { image: 'mage/meteor' },
  echo: { image: 'mage/echo' },
  /** Fire Bolt: avuçtaki mavi çekirdekten doğan ateş oku; sağ üste fırlayan kuyruklu alev, mavi-beyaz en sıcak çekirdek. */

  /** Blizzard: koyu fırtına bulutu, rüzgârla eğik düşen buz sarkıtları ve önde büyük kar kristali. */

  /** Mana Barrier: altın mühür tabanında yükselen petek yüzeyli mavi kristal kubbe, içinde mana damlası (emdikçe MP); dışa kopan kara lanet kırıkları (dispel). */

  /** Meteor: erimiş çatlaklı kaya, öndeki kızgın kenar, arkasında katmanlı alev ve duman. */

  /** Spell Echo (pasif): mavi avuç alevi, çevresinde dönen altın ok (büyü yeniden hazır) ve arkasında koyu yankı kopyası. */

  /** Logo: mage'in asası: bükülmüş ahşap, altın bilezikler, tepede pençelerin tuttuğu mavi kristal. */
  wizhat: (g) => {
    // asa gövdesi (hafif eğik, bükülme izleri)
    g.line(19, 31, 15.5, 13, 'b', 2.4);
    g.line(18.5, 29, 16, 15, 'k', 0.6);
    for (const y of [27, 22.5, 18]) g.line(15, y + 0.6, 19.5, y - 0.6, 'k', 0.6);
    // altın bilezikler
    g.line(14.4, 20, 18.6, 19.2, 'y', 1.2);
    g.line(13.8, 14.2, 18, 13.4, 'y', 1.4);
    // kristali tutan pençeler
    g.line(14.2, 13.5, 10.5, 8, 'b', 1.3);
    g.line(17.6, 13, 21, 7.5, 'b', 1.3);
    // kristal
    crystal(g, 15.8, 8.5, 9, 15, 'c', 'u');
    g.poly([15.8, 1, 20.3, 6.7, 20.3, 11.5, 15.8, 16], 'U');
    g.line(14, 4.5, 14, 10, 'w', 0.6);
    // sallanan altın tılsım
    g.line(13.3, 15, 10, 21, 'Y', 0.5);
    g.poly([10, 20.5, 11.5, 22.5, 10, 24.5, 8.5, 22.5], 'y');
    g.disc(10, 25.6, 0.7, 'u');
  },
};

// ------------------------------------------------------------------------------------------------ efekt sprite'ları

/**
 * v2 efektlerinin ek çizimleri. 2026-10-09 gerçekçi yeniden tasarımla Mage efektleri dokularını vfx.ts içinde gürültüyle üretir
 * (ateş/alev/duman/kaya/mühür/kalkan); eski çizgi film sprite'ları (bolt, mantle, rock, tongue, icicle, flake, facet...) kaldırıldı.
 */
export const SPRITES: Record<string, V2SpriteEntry> = {};
