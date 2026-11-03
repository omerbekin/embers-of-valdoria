# Treant ölme / kaybolma · `summondeath_treant`, `summonvanish_treant` (Druid, Treant)

## Tur 1-6 · Claude · ekleme · 2026-11-02
Kodla çizilen olay efektleri (src/game/art-v2/druid/vfx.ts; sheet yok, Codex çizimi kullanılmadı). Boyut v.w / v.h değerinden gelir. Yakalama: tools/_td.mjs (savaş sahnesinde olayı elle çalıştırır).
Ölme: gövde titrer ve kararır, merkezden dallanan yeşil çatlaklar, köşeli kabuk/kök parçaları, gövde zemin çizgisinde kesilerek toprağa batar, altta koyu ıslak toprak yayılır (damla yok), yapraklar.
Kaybolma: gövde tırtıklı çizgiyle yukarıdan aşağı çözülür, sarı-yeşil ışık, kabuk kıymığı ve yaprak kıvılcımları.
Sol oyun içi: kaybolma 8/10 GEÇTİ (düz kesim hâlâ biraz sert); ölme 7/10 KALDI (6 tur): çatlaklar sarmaşık gibi okunuyor, gövde parçalanmadan bütün iniyor, toprak halkası düz oval. Karar (koordinatör): geçme çizgisi 8. Kaybolma bağlı kaldı; ölme ERTELENDİ 7/10: kod `export const summondeath_treant` olarak duruyor ama export haritasında yok, ölüm v1 koda düşer. 8/10 olunca haritaya eklenir.

## Tur 7-9 · Claude + Codex (Sol) · ekleme · 2026-11-03
Gövde artık sprite karesinden tırtıklı kenarlı 7 parçaya kesiliyor (göğüs/karın ayrı), su çizgisi kaldırıldı, toprak yumuşak eğrili halka. Sol oyun içi: tur 8 7/10, tur 9 8/10 GECTI (ingame/treant_death9-sol-1.md). Haritaya BAĞLANDI. Yakalama: scratchpad cap-death.mjs (runEventFx ile).
