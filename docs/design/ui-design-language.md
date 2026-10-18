# Arayüz tasarım dili (2026 ekim, Ömer onaylı)

Ömer 2026-10-18: "yeni yaptığımız bu tasarım diline oyunun geneli için kural olarak oluştur. Sonraki sessionlarda yeni arayüz yaparken ana mantık buradaki gibi olsun."

Bu belge, 2026-10-18 günü onaylanan mockup turlarından çıkan ANA MANTIKTIR. Yeni bir ekran, pencere ya da ipucu yapan herkes, yazmadan önce bunu okur.
- Hangi dosyanın / işlevin kullanılacağı: `ui-reference.md`.
- Yazı tipi, renk, düğme sırası: CLAUDE.md > Tasarım kiti.

## 1. Temel ilkeler

1. **Önce mevcut parça.** Aynı işi gören ortak parça varsa onu kullan (bölüm 2). Yeni bir görünüm uydurma. Yeni parça gerekiyorsa onu ORTAK (global) kur ki başka ekran da kullanabilsin. Örnek: Formation ızgarası seferde, Quick Battle'da ve Multiplayer'da aynı.
2. **Sınırları koru.** Mevcut bir ekranı yenilerken pencerenin boyutu, yeri ve çerçevesi aynı kalır. Yalnızca içerik iyileşir.
3. **Sade ve ferah.**
   - Boş, ölü alan bırakma. Ama her şeyi birbirinin içine de sıkıştırma: bloklar arasında nefes payı olsun.
   - Göstergeler sakin olsun: ince kenar rengi, küçük nokta. Baskın yeşil tik, kırmızı çarpı ya da dolgu kullanma.
4. **Bilgi hover'da, ekranda kalıcı değil.** Ayrıntı fareyle üstüne gelince açılır; tıklamak zorunlu değildir. Dokunmatikte tek dokunuş sabitler. Kalıcı cetvel, uyarı şeridi ya da tekrar eden yardım cümlesi koyma. Örnek: Formation'daki "Good spot" şeridi kaldırıldı, menzil cetveli hover kutusuna taşındı.
5. **Düz yazı.** Açıklamalar düz EB Garamond olur. İtalik yalnızca kısa bir lore / flavor cümlesinde kullanılır.
6. **Etiketler tek satırda.** Ad altındaki çipler (rol / Range N / sıra gibi) tek satıra sığar.
7. **Etkileşim kuralları.**
   - Tıklama seçer.
   - Yer değiştirme yalnızca sürükleyip birinin üstüne bırakınca olur; tık-tık ile yer değişmez.
   - Çift tık hızlı eylemdir (al / sat).
   - Düğmelerde ikincil eylemler solda, birincil eylem en sağda.

## 2. Onaylı parçalar (her yerde aynı görünür)

| Ne | Görünüm | Kaynak / mockup |
|---|---|---|
| İpucu / küçük bilgi kutusu | **A Band**: solda ikon, renkli başlık şeridi, sağda değer, çipler, elmaslı ayırıcı | `src/ui/band-tip.ts/.css`, `mockups/tooltips.html` A |
| Item satırı / şeridi / listesi | **Gear > Hero item plakası**: kare ikon, yuva etiketi, Cinzel ad, Power / iL / affix özeti, köşe elmasları. Ek bilgi (fiyat) plakanın içinde sağda; kim takar bilgisi plakada yok | `src/ui/gear-plates.css`, `character-panel.ts` |
| Item önizlemesi | **Item ipucu v3**: madalyon ikon, nadirlik kurdelesi, iL, kademe etiketli satırlar, değer, kahraman satırları. Hover ile açılır | `src/ui/item-tip.ts` |
| Skill listesi | **A Plates**. **Pasif HER ZAMAN 1. sırada** | `skill-bar.ts > skillPlateHtml`, `mockups/skills-block.html` A |
| Karakter / kahraman kartı | **A**: portre, ad + sağda "Lv X", tek satır çipler, HP/MP çubukları, yalnızca 4 temel stat (STR / DEX / INT / LUCK, ana stat turuncu), skill'ler (pasif önce), pasif ayrı bölüm yok | `mockups/character-card.html` A, `mockups/formation.html` A |
| Stat listesi | Gear Sheet A | `mockups/stats-panels.html` |
| Izgara hücresi uygunluk | Seçili ya da sürüklenen birim için HER hücrede hafif renk (iyi / zayıf / ulaşamaz). Hover kutusu: "X · FRONT ROW", tek cümle, 4 parçalı çubuk | Formation A (ortak bileşen) |
| Sefer haritası düğümleri | C çerçeveleri, biraz küçük; çift yol | `src/game/map-frames.ts`, `mockups/map-nodes.html` |
| Sonuç ekranı | A (plaket, satır başına birim, özet şeridi) | `result-screen.ts`, `mockups/battle-result.html` |

## 3. Çalışma akışı

1. **Mockup.** Ömer'in "mockup" isteği ui-dev (Sonnet) agent'ına gider. Mockup oyunun gerçek görünümündedir: gerçek CSS, sanat ve fontlar. `public/mockups/<ad>.html` içinde A / B / C seçenek olur, her biri tek satır Türkçe notla.
2. **Yayın.** Ana oturum mockup'ı 5000'e ve Pages'e koyar, iki linki verir.
3. **Seçim.** Ömer seçer, genelde düzeltmelerle. Düzeltme gelirse eski seçenekler silinir ve yeni 3 seçenek yapılır.
4. **Oyuna ekleme.** Seçilen seçenek ortak parçalarla oyuna eklenir.
5. **Kural.** Ömer bir görünümü "global" ya da "kural" derse bu belgeye ve `.claude/agents/ui-dev.md`'ye yazılır.
