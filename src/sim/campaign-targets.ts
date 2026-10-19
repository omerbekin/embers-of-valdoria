// Sefer kasma (serbest dolaşım + devriye) simülatörünün HEDEFLERİ (Ömer 2026-10-19). Tek yer: rapor (campaign-grind-report.ts) ve
// simülatörün varsayılanları (duvar sınırı) buradan okur. Sayılar kolay değişsin diye düz sabit; değişince rapor kendiliğinden uyar.
// Birimler: yüzdeler %, kasma = bir düğümü geçmek için yapılan devriye (kasma) savaşı sayısı, düğüme ulaşan koşu başına ortalama.
import type { Difficulty } from '../campaign';
import type { NodeCategory } from './campaign';

export type GrindCategory = Exclude<NodeCategory, 'tutorial'>;
export type Band = readonly [number, number];

export const CAMPAIGN_TARGETS = {
  /** Normal düğümde ilk deneme kazanma (%), iyi oyuncu. */
  firstWinNormal: [75, 90] as Band,
  /**
   * Düğüm geçmek için kasma savaşı (ortalama, düğüme ulaşan koşu başına). Medium = iyi oyuncunun hedefi; Hard = Medium x2 (elit ve boss dahil; Ömer 2026-10-19);
   * Easy = hiç kasma. Normal düğümde "~0" = en fazla 0,25 (Hard 0,5) kabul.
   */
  grind: {
    easy: { normal: [0, 0.1], elite: [0, 0.1], boss: [0, 0.1] },
    medium: { normal: [0, 0.25], elite: [1, 2], boss: [3, 5] },
    hard: { normal: [0, 0.5], elite: [2, 4], boss: [6, 10] },
  } as Record<Difficulty, Record<GrindCategory, Band>>,
  /** Ortalama oyuncu: aynı bantlar, kasma en fazla bu oran kadar fazla (üst sınır x1,5; iyi oyuncuya oranı da en fazla 1,5). */
  averageGrindExtra: 0.5,
  /** Kasma savaşlarının tüm savaşlara oranı (%). */
  grindShare: [10, 20] as Band,
  /** Normal düğüm zaferinde kalan parti canı (ortalama %; düşen = 0). */
  hpEndNormal: [40, 60] as Band,
  /** Bu kattan uzun savaşlar (tur; tüm savaşların ortalamasına göre) ayrı listelenir. */
  longBattleMult: 2,
  /** Bir düğümde koşuların bu yüzdesinden fazlası duvara vurursa kırmızı. */
  wallRunsMaxPct: 10,
  /** Rota / sınıf kırılımı: en çok ve en az kasan grup arasında bu kattan büyük fark işaretlenir. */
  spreadMax: 2,
  /**
   * Duvar sınırı (Ömer 2026-10-19 seçimi): bir yeni düğüm için bu kadar kasma savaşından sonra hâlâ geçilemezse "duvar" (koşu orada biter).
   * CLI --wall-cap=N hepsini ezer; --wall-cap=easy:5,hard:20 gibi zorluk başına da verilebilir.
   */
  wallCap: { easy: 5, medium: 10, hard: 20 } as Record<Difficulty, number>,
  /** Ek "aşırı kasma" koşusu: Ashford sonrası ilk bölgede önceden yapılan kasma savaşı sayısı. */
  overgrind: 10,
} as const;

/** Değer bantta mı (rapor işareti: yeşil "+" / kırmızı "!"). */
export const inBand = (v: number, b: Band): boolean => v >= b[0] && v <= b[1];
