# Raise Dead · `raise_dead` · Undead (sınıf)

Ömer 2026-10-29: "undeadin animasyonları çok kötü. mevcut skill icon ve efektlerini referans alma. tamamen skillerin amacına ve elementine göre 0dan özgün düşünerek bir skill effect seti chatgptye çizdirir misin /vfx ile uygulayalım sonra"
Sarma üstüne Ömer: "görsellerin tamamı ya karakterlerin üstünde ya da altında kalıyor. etrafını saramıyor" (çözüm: wrap + ghost; Ömer hayalet saydamlığı 0,45 seçti)
Tasarım: `new-art/undead/brief.md` (mevcut ikon/efektler referans DEĞİL). Skill: cesedi tüketip iskelet çağırır (ceset yoksa beslenmemiş iskelet).

## Tur 1 · Claude · yeni çizim isteği · 2026-10-29
Çizim Codex yerine ChatGPT ile yapıldı (art-pipeline; brief.md prompt'ları). Asıllar `assets/source/undead-vfx/` (4x2, 1774x887, ~443 px kare, gerçek alfa).

## Tur 1 · Claude · ekleme · 2026-10-29
İçe aktarma `node tools/import-class-vfx.mjs undead` -> `assets/vfx/undead/` (320x320 kare, 4x2, alfa korunur). Kesim çizgileri sabit
ızgaradan değil EN BOŞ satır/sütundan (ChatGPT satırları ortada bölünmüyor: ör. 04'te y=452, 05'te y=437); kenara değen küçük komşu
kırıntıları silindi. Ölçüm: hiçbir karede siyah çerçeve / ızgara çizgisi / boş kare yok, içerik kare kenarına değmiyor.
Oynatma `src/game/art-v2/undead/vfx.ts` (kodla çizilen eski efekt kaldırıldı, vuruş anları ve olay sırası aynı):
- `undead/07-raise-dead` (aslı 07-raise-dead): skill anında yalnız s1-s2 (rün halkası) yuvada belirip söner; çağrı olayında (summon_skeleton) tam patlama iskeletin ayak noktasında, iskeleti SARAR (wrap split 0,86, ghost 0,45). İskelet sütunun içinden sarsak hamlelerle yükselir (eski clawRise hareketi, toprak parçacıkları yok).
- Ceset emme olayı (corpsedrain, yalnız ceset varsa): cesetten yuvaya 3 kızıl ruh tutamı (`undead/08-vampiric-bite-wisp`). Test panelinde ceset olmadığı için beslenmemiş hâl oynar (sütun hafif soluk).
- Olay sırası aynı (raise -> corpsedrain -> summon_skeleton). Doğuş Promise'i iskelet yere oturup sütun bitince çözülür (~1,6-1,8 sn; eskisi ~2,4 sn).
Aynalama: Phaser flipX karenin içinde aynalar; asimetrik dayanakta aynalı tarafta origin x = 1 - ox (`sheetAt`).
Yakalama: `node tools/anim-capture.mjs raise_dead` (atan sağda, düşman tarafı; kukla solda).

## Tur 2 · Codex · kontrol · 2026-10-29
Yakalama: `captures/raise_dead` (2026-10-29; beslenmemiş hâl, test panelinde ceset yok). Atan sağdaki Undead; çağrılan Skeleton `enemy-s0/1` x=1136, y=745.

Genel: Rün halkası yuvada belirip sönüyor; iskelet sütunun içinden kademeli yükseliyor, siyah/boş kare veya belirgin sıçrama yok. Patlama doğru yuvada ve ayak çizgisine yakın; sütun gövdenin arkasında, ön hayalet sarımı seçiliyor. Sondaki kesilme düzeltilmeli.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5–#31 · s1–s2 | Yuvada rün halkası açılıp sönüyor. | - | - |
| #32–#95 · s3–s6 | Patlama iskeletin ayak çizgisinde; sütun arkasında, iskelet kademeli yükseliyor ve hayalet kopya sarıyor. | - | - |
| #65–#111 · s4–s7 | Üç katman kayıtta: arka katman α=0,88, ön hayalet α=0,40, tekrar arka katman α=0,88. | HIZA: istenen hayalet 0,45; yakalamada 0,40. | Ön hayalet katmanını α=0,45 yap. |
| #105–#111 · s7 → #112 · efekt yok | Sütun s7'de sabit kalıp bir sonraki yakalama karesinde tamamen kayboluyor; iskelet kalıyor. | ZAMAN: bitiş ani; kemik tozu dağılışı görünmüyor. | Sona kısa kemik tozu/dağılma geçişi ekle ve sütunu birkaç karede söndür; iskelet yerde sabit kalsın. |

Vuruş/çağrı anı: `summon_skeleton` sırasında patlama doğru noktada ve iskeletin yükselişi okunaklı. Corpsedrain yakalanmadı; testte ceset yok, beslenmemiş hâl oynuyor.
Karar önerisi: düzeltilebilir; ön hayalet alfa değerini 0,45'e eşle ve ani kesilen sona kemik tozu dağılışı ekle.

## Tur 3 · Claude · düzeltme · 2026-10-29
`src/game/art-v2/undead/vfx.ts > summon_skeleton` + yeni `boneDust`:
- Ön hayalet ekranda hep 0,45: beslenmemişte sütun alfası 0,88 olduğundan sarma hayaleti `GHOST / 0.88` verilir (beslenmişte `GHOST`).
- Ani kesilme yok: sütun `keep: true`, son kare (s8) bitince yerinde 0,42 sn'de söner (taban ayak çizgisinde kalır, yukarı kaymaz); aynı anda
  sütun boyunca fildişi kemik tozu zerreleri (beslenmiş 18, beslenmemiş 13, gri) yukarı-dışa süzülüp söner. Doğuş Promise'i aynı anda çözülür (beklenmez).
- Not: yakalamanın sonunda iskeletin silinmesi test panelinin temizliği (keepAfter yok), efektle ilgisi yok.
## Tur 4 · Codex · kontrol · 2026-10-30
Yakalama: `captures/raise_dead` (Tur 3 sonrası; 2026-10-29). Yakın plan: Claude'un `end3` kareleri 60, 90, 108, 114, 118, 121, 124, 128.

Genel: Ön hayalet artık istenen 0,45 alfa ile sarıyor. Sütun son karede takılı kalmak yerine tabanında sabit kalarak yaklaşık 0,27 sn boyunca sönüyor; yakın planda iskelet çevresinde kemik tozu dağılışı da seçiliyor. İskeletin yakalamanın en sonunda kaybolması test paneli temizliği.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #60, #90, #108 · s2, s5, s7 | Arka/ön/arka katman aynı x=1136, y=749'da; alfa değerleri 0,88 / 0,45 / 0,88. | - | - |
| #111–#128 · s7 | Sütun ve ön hayalet aynı dayanakta kademeli sönüyor: #114'te 0,82 / 0,42, #118'de 0,59 / 0,30, #121'de 0,42 / 0,21, #124'te 0,25 / 0,13, #128'de 0,02 / 0,01. Yakın planda sütun boyunca kemik tozu dışa ve yukarı dağılıyor. | - | - |
| #129 sonrası | Sütun kalmıyor; sona doğru iskeletin ve adının kaybolması efekt dizisinin parçası değil, test paneli temizliği. | - | - |

Vuruş/çağrı anı: İskeletin yükselişi okunaklı; çağrı sütunu hedef kuklayla karışmıyor ve kendi yuvasında kalıyor. Bitişte toz/sönüş var, yeni konum sıçraması yok.
Karar: düzeltme başarılı; `raise_dead` tamam.

## Tur 5 · Codex · inceleme · 2026-10-31
Sürüm: Real battle · Yakalama: `captures/raise_dead_fed` (193 kare; beslenmiş hâl + `corpsedrain`, ilk yakalama). Atan sağdaki Undead (x=1195), hedef kukla x=725, ceset en soldaki kukla (x≈170); çağrılan Skeleton yuvada x=1136, y=745.

Genel: Cesetten çıkan kızıl ruh tutamları iki/üç eşzamanlı akış halinde atan yuvaya gidiyor ve emme okunuyor. Çağrı tabanı sabit; Ömer'in “hafif titreme / bozulma” hissi görüntü/sahne kaymasından değil, doğuş sütunundaki hızlı değişen kemikli siluetlerden ve bunların yükselen iskeletle üst üste binmesinden geliyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #52–#60 · `08-vampiric-bite-wisp` s1–s2 | Cesedin (x≈170) üstünden kızıl hayalet tutamları çıkar; #60–#84'te yay çizerek sağa ilerleyip caster/yuvanın (x=1136) sol yanına varır, #88–#92'de son mor iz söner. İkinci/üçüncü tutamlar kademeli ekleniyor. | - | - |
| #60–#84 · wisp s1–s5 | Birden çok tutam aynı anda görünür; biri cesetten çıkarken öndeki tutam yuvaya yaklaşır. Başlangıç ve varış noktaları görsel olarak bağlı. | - | - |
| #108–#116 · `07-raise-dead` s2–s3 | Sütun tabanı ve çağrı merkezi sabit; üstte mor/yeşil enerji açılır, ilk kemik/el silueti belirir. | - | - |
| #120–#136 · `07-raise-dead` s3–s5 | Kare ilerledikçe kemikli ellerin sayısı/konumu ve yeşil üst alevin konturu belirgin biçimde değişiyor; gerçek iskelet de sütunun içinden görünmeye başlıyor. | BOZULMA: sütun içi kemik/alev şekilleri ardışık karelerde görsel olarak zıplıyor; çift el/iskelet silueti yükselen iskeletle çakışıp titreme hissini büyütüyor. Ekran veya sahne değil. | Sütunun s3–s5 geçişlerini daha tutarlı siluetle yumuşat; tekrar eden/ayrı kemik eli şekillerini azalt ya da iskeletin okunur hale geldiği karelerle çakışmasını azalt. |
| #138–#166 · `07-raise-dead` s5–s8 | “SKELETON” adı/sağlık çubuğu görünür; yarı saydam iskelet sütunun içinden belirginleşip #166'da net, ayakta durur. Konumu yuvada sabit. | Hafif üst üste binme sütun/iskelet sınırında; birim kayması yok. | Sütun siluetini iskelet okunur olmaya başladığında geri çekmek geçişi temizler. |
| #172–#186 · s8 / son durum | Yeşil halka iskelet çevresinde belirip soluyor; iskelet ve yazısının sönmesi test panelinin temizliği. | Efekt kusuru değil. | - |

Titreme şikâyetine cevap: #120–#136 (s3–s5) en belirgin aralık; #108–#116'da da sütunun üst konturu değişiyor. #138–#166'da görülen biçimlenme/şeffaflık değişimi iskeletin doğuş animasyonu; iskeletin x/y dayanağı sabit. Arka plan, zemin, kuklalar ve Undead ekranda oynamıyor. Kaynak ağırlıkla sütun (kareler arası kemik/alev silueti), ikincil olarak sütunla iskeletin aynı yerde üst üste çizilmesi; ekran titremesi değil.

Ceset emme: okunuyor. Ruh tutamları ceset noktasından kademeli çıkıyor, havada kıvrılıp sağa yöneliyor ve Undead'in yanındaki yuvaya kadar geliyor. Tutamlar parlak ve gövdeden ayrık; başlangıç/varış seçiliyor. #68–#84'te birden fazla tutamın eşzamanlı görünmesi emme fikrini güçlendiriyor; belirgin boşluk veya yanlış hedef yok.

Çağrı/konum: `frames.json`'daki VFX dayanağı (x=1136, y≈749; 252×252) ile Skeleton yuvası (x=1136, y=745) örtüşüyor. Görüntüde zemin ve birimler sabit; çağrı tabanı da kaymıyor. Bu nedenle genel kayma `ZIPLAMA` değil, sütun içi çizim geçişi.

Karar önerisi: düzeltilebilir; özellikle `07-raise-dead` s3–s5 görsel silueti ve yükselen iskeletle örtüşme azaltılırsa Ömer'in bildirdiği titreme hissi düşer. Ceset emme akışı korunabilir.

## Tur 6 · Claude · düzeltme · 2026-10-31
Test: yeni panel girdisi `raise_dead_fed` (kuklanın yanında ikinci kukla, x~190; atıştan önce ölür, ceset o; beslenmiş hâl + corpsedrain). `node tools/anim-capture.mjs raise_dead_fed --url http://localhost:5177`.
Üç kusur bulundu, hepsi kareden / ölçümden:
1. **Takılma (asıl hata, tahmin değil):** beslenmiş atışta olay kuyruğu sonsuza dek duruyordu. Geçici izleme: `before sheetDone true false 8` (sütun `keep: true`, animasyon ÇOKTAN bitmiş, ANIMATION_COMPLETE bir daha gelmez). Yükseliş süresi sütun animasyonundan yalnız ~0,2 sn kısa; kare hızı düşünce (görünmez tarayıcıda her seferinde) sıra bozuluyor. Düzeltme `src/game/vfx-sheets.ts > sheetDone`: animasyon bitmişse hemen çözülür. Bütün efektlere yarar, başka davranış değişmez.
2. **Ekran titremesi (Codex Tur 5 "ekran sabit" dedi; ölçüm aksini gösteriyor):** arka planın sabit bir parçasının kareler arası kayması ölçüldü. Önce: #98-#136 (~0,64 sn) kesintisiz, en çok ±4 px; 6 ayrı `shake` üst üste biniyor (açılış 420 ms + patlama + her hamlede bir + oturuş). Sonra: #110-#121 (patlama) ve #136-#141 (oturuş), ikisi arası tam sabit. Açılış ve hamle sarsıntıları kaldırıldı, patlama 180 ms / 0,002, oturuş 110 ms / 0,0012 (beslenmemiş biraz daha az).
3. **Gövde titremesi:** `clawRise` her karede x'e rastgele ±1 px ekliyordu; kaldırıldı, sarsak hamleler ve yalpalama kaldı.
4. **Sütun kareden kareye sıçrıyor (Codex Tur 5, #120-#136):** 8 kare ~6,7 fps. Kodla ara kare eklendi (`crossfade`, 3x; süre aynı, Ice Crater ile aynı yöntem). Çizime dokunulmadı.
Süre değişmedi. Sondaki yeşil halka ve iskeletin silinmesi test paneli temizliği (`vanish`).

## Tur 7 · Codex · kontrol · 2026-10-31
Yakalama: kullanıcı ekleri `rd_rise2` ve yakın plan `rd_c1b` (beslenmiş doğuş; #96–#186, sütun geçişi #108–#138).
Genel: Sütun geçişleri Tur 6'daki ara karelerle artık belirgin biçimde akıyor; yükselen iskelet sütun içinde okunabiliyor. Görsel olarak kalan bozulma dikkat çeken bir sorun oluşturmuyor.

| Kare | Gözlem | Sonuç |
|---|---|---|
| #108–#120 · s2–s3 | Mor taban patlamasının üstünde yeşil-beyaz sütun ve ilk el/iskelet konturu açılıyor. | Taban sabit; geçiş kademeli. |
| #120–#136 · s3–s5 | Kemikli siluet ve alev konturu ara karelerle daha sık değişiyor; iskelet sütun içinden belirginleşiyor. | Eski ani kare sıçraması yumuşamış; iskelet seçilebilir. Hafif katman üst üste gelişi var, belirgin görsel bozulma/titreme yok. |
| #138–#186 · s5–s8 ve son | İskelet netleşip ayakta kalıyor; sütun ve çevre enerjisi sönüyor. | Doğuş okunaklı, bitiş temiz. |

Titreme ölçüsü: Tur 6'da raporlanan ekran kayması ölçümü (arka plan en çok ±4 px → düzeltme sonrası patlama/oturuş aralıklarında sabit) not edildi; bu görsel kontrolde ekrandaki kaymayı karelerden yeniden ölçmüyorum. Görsel izlenim olarak kalan bozulma yok denecek kadar az.
Karar: tamam; sütun geçişi ve iskelet okunurluğu yeterli.

## Tur 8 · Claude · düzeltme · 2026-10-31
Ömer: (1) cesetli atışta önce yuvada efekt patlıyor, sonra ruhlar taşınıp aynı yerde iskelet çıkıyor: "ilk efekti gösterme". Ceset tüketiliyorsa `raise` rün halkası oynatmaz (yalnız asa ışığı). Cesetsiz hal aynı. (2) İlk atışta sütunun başı kasıyordu, cesetsizde belirgin: Tur 6'da eklenen 3x ara kare dokusu efekt anında üretiliyordu. Artık sahne açılışında pişer (`vfx-sheets.ts > prewarmVfxForSkills`, BattleScene birim kurulumu). Görünmez tarayıcıda ölçüm: doku atıştan ~0,5 sn sonra (sahne açılışı) hazır, sütun 3,5 sn+ sonra başlıyor, başlangıcında 180 ms üstü boşluk yok.

## Tur 9 · Claude · düzeltme · 2026-10-31
Ömer: kasma Tur 8'den sonra da görünüyor (cesetsiz). Yakın plan: `raise` sütunun ilk iki karesini yuvada oynatıp ~600 ms'de aniden kayboluyordu, ~230 ms boşluk, sonra `summon_skeleton` aynı kareleri baştan oynatıyordu. Görüntü kasması buydu; Tur 8'deki doku pişirme tek başına çözmedi. Rün halkası `raise`ten tamamen kalktı (cesetli ve cesetsiz): asa ışığından sonra sütun doğrudan başlar.

## Tur 10 · Claude · ayar · 2026-10-31
Ömer: sütun orta hızda, iskelet ondan hızlı yükseliyor, fark kasma hissi veriyor; çok az yavaşlat. Yükseliş beslenmiş 640 -> 760 ms, beslenmemiş 760 -> 900 ms (~%18). İkisi de sütun bitmeden biter: başlangıç gecikmesi + yükseliş 947 / 1114 ms, sütun 1000 / 1143 ms.

## Tur 11 · Claude · ayar · 2026-10-31
Ömer: iskeletin çıkışı ile sütun arasında saniye başına kare farkı var. Yükseliş her ekran karesinde (~60) güncelleniyordu, sütun 24 / 21 fps. `clawRise` artık konumunu sütunun o anki karesinden alır (`sync`, sütun yoksa `stepFps` ile zaman): sütun karesi değişmeden iskelet oynamaz (18 adım 750 ms, 19 adım 905 ms).
