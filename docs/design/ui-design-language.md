# Arayüz tasarım dili (2026 ekim, Ömer onaylı)

Ömer 2026-10-18: "yeni yaptığımız bu tasarım diline oyunun geneli için kural olarak oluştur. Sonraki sessionlarda yeni arayüz yaparken ana mantık buradaki gibi olsun."

Bu belge, 2026-10-18 günü onaylanan mockup turlarından çıkan ANA MANTIKTIR. Yeni bir ekran, pencere ya da ipucu yapan herkes, yazmadan önce bunu okur.
- Hangi dosyanın / işlevin kullanılacağı: `ui-reference.md`.
- Yazı tipi, renk, düğme sırası: CLAUDE.md > Tasarım kiti.

## 1. Temel ilkeler

1. **Önce mevcut parça.** Aynı işi gören ortak parça varsa onu kullan (bölüm 2). Yeni bir görünüm uydurma. Yeni parça gerekiyorsa onu ORTAK (global) kur ki başka ekran da kullanabilsin. Örnek: Formation ızgarası seferde, Quick Battle'da ve Multiplayer'da aynı.
1b. **Üç ekran boyutu (Ömer 2026-10-27).** Her arayüz, mockup ve sahne görseli 16:9 (1920x1080), 21:9 (2580x1080) ve telefon (yatay ~844x390, `html.short` / `html.compact`) için birlikte tasarlanır. Kenara yaslanan öğeler `stageView.left/right` ile yerleşir; kasaba/sahne görsellerinde kırpılan şeritte (21:9'da üst/alt, telefonda yanlar) tıklanacak yer olmaz; dokunma hedefleri telefonda da en az 44px. Mockup'lar ve doğrulama ekran görüntüleri üç boyutta da çıkarılır.
2. **Sınırları koru.** Mevcut bir ekranı yenilerken pencerenin boyutu, yeri ve çerçevesi aynı kalır. Yalnızca içerik iyileşir.
3. **Sade ve ferah.**
   - Boş, ölü alan bırakma. Ama her şeyi birbirinin içine de sıkıştırma: bloklar arasında nefes payı olsun.
   - Göstergeler sakin olsun: ince kenar rengi, küçük nokta. Baskın yeşil tik, kırmızı çarpı ya da dolgu kullanma.
4. **Bilgi hover'da, ekranda kalıcı değil.** Ayrıntı fareyle üstüne gelince açılır; tıklamak zorunlu değildir. Dokunmatikte tek dokunuş sabitler. Kalıcı cetvel, uyarı şeridi ya da tekrar eden yardım cümlesi koyma. Örnek: Formation'daki "Good spot" şeridi kaldırıldı, menzil cetveli hover kutusuna taşındı.
4b. **Abartısız animasyon (Ömer 2026-10-22).** Her yeni ya da yenilenen arayüz, şablonu uygularken uygun yerlerde sakin animasyon kullanır: kartta/düğmede hover'da hafif yükselme (birkaç px) + ince altın kenar parlaması, pencere/kart girişinde kısa sıralı belirme, seçimde yumuşak vurgu. Süreler kısa (yaklaşık 120-250 ms), zıplama/sallanma/dönme yok. Değerler `data/ui-motion.json`'dan gelir. Seçim kartları (karakter, companion, ödül gibi) ana menü kart mantığını kullanır.
5. **Düz yazı, arayüzde italik YOK (Ömer 2026-10-23).** Arayüzdeki her yazı (açıklama, yönerge, ipucu, alt başlık, uyarı, item satırları) düz EB Garamond olur. İtalik YALNIZCA hikâye anlatımında, bir hikâye unsuruna kısaca atıf yaparken kullanılır (ör. hikâye/olay metninde bir yer ya da kişi adına vurgu). Yeni arayüzde italik yazılmaz; eski italikler kaldırılır. Harita düğümü kartındaki lore/devriye satırı (`.sbc-info`) da düz yazılır (Ömer 2026-10-27; eski hafif-italik istisnası kalktı).
6. **Etiketler tek satırda.** Ad altındaki çipler (rol / Range N / sıra gibi) tek satıra sığar.
7. **Etkileşim kuralları.**
   - Tıklama seçer.
   - Yer değiştirme yalnızca sürükleyip birinin üstüne bırakınca olur; tık-tık ile yer değişmez.
   - Yuvalar arası taşıma (Ömer 2026-10-23): dolu bir yuvadaki öğe, onu kabul eden başka bir yuvaya sürüklenebilir (ör. main hand ↔ off hand, ring ↔ ring). Hedef doluysa ikisi yer değiştirir; hedefteki öğe kaynağa uymuyorsa çantaya döner.
   - Çift tık hızlı eylemdir (al / sat).
   - Düğmelerde ikincil eylemler solda, birincil eylem en sağda.
8. **Bonus yazımı (Ömer 2026-10-27).** Aynı havuzda toplanan (toplamsal) bonus "+12% damage" yazılır (item Global damage, Hero Oath hasarı/kritiği, Wayshrine *Add nimetleri, crit chance, accuracy, evasion...). Diğer bonuslarla ÇARPILAN ayrı çarpan "×1.2 damage", 1'in altındaysa "×0.8" yazılır (durumlar, pasifler, element hasarı / direnci, Speed / Max HP / Max MP affix'leri, kritik çarpanı, skill tree düğümleri...). **Hesap da yazıya uyar (Ömer 2026-10-27):** bir düğümün rank'ları tek çarpanda toplanır, birbirini çarpmaz ("×1.06 per rank" rank 3 = ×1.18, rank 5 = ×1.30; rank yükselince eski bonusun yerine yenisi gelir); ayrı "×" kaynaklar birbirini çarpar (iki ×1.1 item = ×1.21, item ×1.1 + düğüm ×1.18 = 1.1 × 1.18, iki farklı düğüm de çarpılır; birleşme tablosu `src/engine/tree-hooks.ts > STACK_FORM`, test `tests/bonus-stacking.test.ts`); "+%" ve düz "+45" yazılanlar toplanır. Yazı her yerde `src/engine/bonus-text.ts` (`multText`, `moreText`, `lessText`, `addPctText`) ile üretilir; item şablonlarında `{0}` toplamsal, `{m0}` ×(1+v), `{l0}` ×(1−v) (yanlış biçim `validateItems` hatası). Oyuncuya açıklama: Codex > Mechanics > "How bonuses combine". Test: `tests/bonus-text.test.ts`.

## 2. Onaylı parçalar (her yerde aynı görünür)

| Ne | Görünüm | Kaynak / mockup |
|---|---|---|
| İpucu / küçük bilgi kutusu | **A Band**: solda ikon, renkli başlık şeridi, sağda değer, çipler, elmaslı ayırıcı | `src/ui/band-tip.ts/.css`, `mockups/tooltips.html` A |
| Item satırı / şeridi / listesi | **Gear > Hero item plakası**: kare ikon, yuva etiketi, Cinzel ad, Power / iL / affix özeti, köşe elmasları. Ek bilgi (fiyat) plakanın içinde sağda; kim takar bilgisi plakada yok | `src/ui/gear-plates.css`, `character-panel.ts` |
| Item önizlemesi | **Item ipucu v3**: madalyon ikon, nadirlik kurdelesi, iL, kademe etiketli satırlar, değer, kahraman satırları. Hover ile açılır | `src/ui/item-tip.ts` |
| Skill listesi | **A Plates**. **Pasif HER ZAMAN 1. sırada** | `skill-bar.ts > skillPlateHtml`, `mockups/skills-block.html` A |
| Karakter / kahraman kartı | **A**: portre, ad + sağda "Lv X", tek satır çipler, HP/MP çubukları, yalnızca 4 temel stat (STR / DEX / INT / LUCK, ana stat turuncu), skill'ler (pasif önce), pasif ayrı bölüm yok | `mockups/character-card.html` A, `mockups/formation.html` A |
| Evolve ikonu (skill) | Evolve düğümü ONAYLI skill'in ikonu o kayıtta HER yerde yavaş kor titremesi + altın kenar parıltısı (~2,6 sn döngü); evolve sanatı varsa ikon onunla değişir. Codex / Wiki ve Quick Battle sabit | `src/ui/evolve-icon.ts/.css`, `skill-tree-implementation.md > Evolve ikonu ve animasyonu` |
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
