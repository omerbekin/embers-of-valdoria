# Vine Snare · `vine_snare` (Druid)

## Tur 1 · Claude · ekleme · 2026-11-02
Kendi sheet'leri: 07-vine-snare, 08-root-lash (assets/vfx/druid, kaynak assets/source/druid-vfx, kod src/game/art-v2/druid/vfx.ts, sesler data/audio-v2/druid.json). Çizen Terra 6.1, kontrol eden Sol 6.1 (ayrı süreçler). Ham sheet puanları: sarmal 6/10, kamçı 8/10 GECTI (hepsi 4 tur; ham çıktıdaki magenta halo ve sis Sol'u düşürdü, içe aktarmadaki `clean` alfa eşiği bunu temizler; geçiş kararı oyun içi Sol'dadır). Ses yalnız ölçümle doğrulandı, Ömer dinlemedi. Eski kodla çizilen efekt yedek olarak duruyor (sheet yüklenmezse).

## Tur 2 · Codex (Sol 6.1) · oyun içi kontrol · 2026-11-02
Tur 2: 7/10 KALDI (kamçı okunmuyor, sarmallar baş hizasına çıkıp gövdeyi örtüyor). Düzeltme: sarmal ölçeği 1.1 -> 0.8 hücre, kamçı 190 -> 260 px ve daha üst derinlik. Tur 3: 7/10 KALDI.
KALAN KUSUR: mobtan moba kök kamçısı hâlâ ayrı okunmuyor, sarmal bacak sıkması zayıf, kökler sonda açık bej silüet olarak kalıp ufalanma yetersiz. Sheet 07 yeniden çizilmeli (daha koyu, bacak hizasında dar halkalar).

## Tur 3 · Claude + Codex · sheet 07 yeniden çizim · 2026-11-02
Sheet 07 yeni brief'le yeniden çizdirildi (koyu kabuk, dar halkalar, bacak hizası, bej yok): job-vine_snare2.json, 4 Terra/Sol turu, en iyi tur 3 = 5/10 KALDI (Sol: hücre sınırı taşması, yükseklik %49). Ham puan eskisinden (6) düşük ama oyunda görünüşü daha koyu ve alçak olduğu için içe aktarıldı (assets/source/druid-vfx/07-vine-snare.png). Eski sheet scratch'te yedekli; kod yedeği (eski çizimle) vinesnare() duruyor.
Oyun içi: sarmal ölçeği 1.15 hücre (en az 230 px), sıkma anında her hücrede yeşil-beyaz halka eklendi. Sol: 7/10 KALDI (iki kez). Kalan kusur: kök kamçısı hedefler arasında ayrı okunmuyor (test düzeninde iki mob yan yana), halkalar üst üste yığılmış dal gibi, sonda ufalanma zayıf. 8'e ulaşılamadı; efekt "açık" bırakıldı.

## Tur 4-6 · Claude + Codex (Sol) · oyun içi · 2026-11-03
vinesnareChain: her hedefe ayrı kamçı (şeritli, 300 ms arayla), halkalar sonda kabuk kırıntısı + toprakla ufalanma. Sol oyun içi 7/10 KALDI üç kez (ingame/vine_snare7..9): kalın kamçı gövdeleri kesişince yığın, halkalar ahşap kelepçe gibi, ufalanma okunmuyor. Bağlı DEĞİL; eski vinesnare oynuyor. Sheet 07 yeni çizim gerekir (Terra ham 5/10 idi).

## Tur 7 · Claude + Codex (Terra/Sol) · sheet 07 yeni çizim (ince sarmaşık, net ufalanma) · 2026-11-03
job-vine_snare3.json, 3 tur, en iyi tur 3 = 5/10 KALDI (vine_snare3/). 8 çizgisine ulaşılmadı: BAĞLANMADI, eski vinesnare oynuyor, assets/source ve assets/vfx değişmedi.

## Tur N · Claude · düzeltme (fps + konum) · 2026-11-08
Ömer: "fps değerleri ve efektlerin durduğu yerler doğru değil, Codex yeterince dikkatli bakmamış". Yakalama aracı düzeltildi (tools/anim-capture.mjs): Phaser TweenManager süreyi Date.now()'dan alır, elle adımlamada tween'ler duvar saatiyle (yükte ~2x hızlı, yağmur sönüşü ve yumruk düşüşü yanlış kısa görünüyordu) koşuyordu; Date.now() adım saatine bağlandı. Önceki Druid yakalamaları (2026-11-02..) tween zamanlarında yanılıyordu. Oyundaki gerçek fps = sheet fps x ara kare / skillSlowdown (1.2); 8 kareli sheet 12-14 fps efektif oynuyordu (takılma): hepsine 3x kodla ara kare (IB, src/game/art-v2/druid/vfx.ts) eklendi, süre aynı.
Kod çizimi (sheet bağlı değil, 07/08 hâlâ açık iş): sarmal iki hedefin ayaklarında, kök sırtı Treant ayağından başlıyor; fps ölçülecek sheet yok. Yakalama (clock düzeltmesinden sonra) ile görsel kontrol: konum tamam. Değişiklik yok.
