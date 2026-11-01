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
   * Eğri gereği kolay düğümler (Ömer 2026-11-01, Harita 1 eğrisi): bandın ÜSTÜNDE kalmaları kusur değil (rapor `~` yazar, özet bunları ayrı sayar).
   * Ashford sonrası ilk düğümler (tek kişi de geçebilmeli), Valdren sonrası ilk savaşlar (3. kişi), King's Bridge sonrası ilk savaş (4. kişi).
   */
  easyByDesign: { valdoria: ['moor', 'hills', 'cairn', '6B', '6A', '5A', '10'] } as Record<string, readonly string[]>,
  /** Tek kahramanla ilk denemede kazanma, düğüm başına en az (%), Medium iyi oyuncu (Ömer 2026-11-01: hafif hafif zorlaşır; --solo-check). */
  soloFirstWinMin: { moor: 80, hills: 80, cairn: 75 } as Record<string, number>,
  /**
   * Düğüm geçmek için kasma savaşı. Medium = iyi oyuncunun hedefi; Hard = Medium x2 (elit ve boss dahil; Ömer 2026-11-01); Easy = hiç kasma.
   * ÖLÇÜ (Ömer 2026-11-01): Medium / Hard elit ve boss = KASIP GEÇEN koşu başına (isGrinderMeasure; ilk denemede geçemeyip kasan oyuncu kaç kasınca geçer;
   * duvara vuran koşular bu ortalamaya GİRMEZ, duvar ayrı wallRunsMaxPct sınırıyla ölçülür). Normal düğüm ve Easy = düğüme ulaşan koşu başına (duvar kasması dahil); normalde "~0" = en fazla 0,25 (Hard 0,5) kabul.
   */
  grind: {
    easy: { normal: [0, 0.1], elite: [0, 0.1], boss: [0, 0.1] },
    medium: { normal: [0, 0.25], elite: [2, 3], boss: [3, 4] },
    hard: { normal: [0, 0.5], elite: [4, 6], boss: [6, 8] },
  } as Record<Difficulty, Record<GrindCategory, Band>>,
  /** Boss düğümünde ilk deneme kazanma (%), Medium iyi oyuncu (Ömer 2026-11-01: kabaca %30-50). */
  bossFirstWin: [30, 50] as Band,
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

/** Bu zorluk + kategoride kasma hedefi kasıp geçen koşu başına mı ölçülür (değilse ulaşan koşu başına). */
export const isGrinderMeasure = (d: Difficulty, c: GrindCategory): boolean => c !== 'normal' && d !== 'easy';

/** Değer bantta mı (rapor işareti: yeşil "+" / kırmızı "!"). */
export const inBand = (v: number, b: Band): boolean => v >= b[0] && v <= b[1];
