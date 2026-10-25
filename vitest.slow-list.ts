/**
 * YAVAŞ TEST LİSTESİ (TEK yer; 2026-10-14). Burada yazan dosyalar `npm run test:slow` ile koşar, `npm run test:fast` bunları atlar.
 * `npm test` (CI dahil) HER ŞEYİ koşar. Ölçüm (16 çekirdek, tam koşu altında; çoğu süre dosya yüklenirken yapılan simülasyon):
 * campaign-difficulty ~108 sn, balance / balance-b ~91 sn, campaign-balance ~40 sn, golden ~16 sn, endless-balance ~15 sn.
 * Yeni bir test tek başına ~3 sn'yi aşıyorsa (denge simi, büyük kayıt karşılaştırması) buraya ekle.
 */
export const SLOW_TESTS: readonly string[] = [
  'tests/balance.test.ts',
  'tests/balance-b.test.ts',
  'tests/campaign-balance.test.ts',
  'tests/campaign-difficulty.test.ts',
  'tests/campaign-map-sim.test.ts',
  'tests/endless-balance.test.ts',
  'tests/golden.test.ts',
];
