# The First Fire's Verdict vuruşu · `first_fire_verdict`

Skill değil: savaş kuralı (`data/battle-rules.json > firstFire`). 100. hamleden sonra her tur iki takımdan rastgele birer birime PURE hasar
(element yok, zırh / kalkan yok sayılır). Oyunda `src/game/first-fire-fx.ts > firstFireStrikeFx` çalar (eskiden `vfx.ts`, Meteor'dan ödünç).
Ömer'in seçimi (form r41, 2026-11-21): "B · Ocak mührü": hedefin ayağının altında ALTIN bir mühür halkası belirir, daralır, içinden yukarı
BEYAZ alev fışkırır.

## Tur 1 · Claude · yeni çizim isteği (referans sayfası)
Oyuna kod çizimi olarak kurulacak (dokular kodla üretilir, sheet içe aktarılmaz); Codex'ten **referans sayfası** isteniyor: Claude kodu buna göre çizer.

- Dosya: `new-art/first_fire_verdict/first_fire_verdict.png` (+ `.json`, mevcut sheet şeması), şeffaf zemin, 6 kare yan yana, kare 192x256,
  `padding_px` 0. Piksel üslubu (oyunun 64x64 ikon dili; koyu kontur, üstten ışık), 1 piksel = kare içinde 2x2 blok olabilir.
- Kamera: oyunun yandan / hafif yukarıdan görünümü. Zemin elipsi yassı (yükseklik / genişlik ~0,34). Hedefin ayak çizgisi karenin alttan 56 px yukarısında, ortada.
- Kareler:
  1. Belirme: geniş (kare genişliğinin ~%90'ı), soluk altın ince mühür halkası; çift çizgi, aralarında ocak / taç motifi (8 küçük taç dişi ya da
     alev biçimli ocak işareti, eşit aralıklı). Saydam, ilk görünüş.
  2. Daralma ortası: halka ~%70, daha parlak altın, motifler net; halka içinde soluk altın zemin parıltısı.
  3. Daralma sonu: halka ~%50 (hedefin ayak genişliği kadar), en parlak; merkezde beyaz nokta.
  4. Fışkırma: halkanın içinden yukarı BEYAZ alev sütunu (beyaz çekirdek, soluk altın kenar, üstte 2-3 alev dili), kare yüksekliğinin ~%85'i.
  5. Fışkırma sonu: sütun incelir, dilleri kopar; birkaç beyaz kor yukarı uçar.
  6. Sönüş: zeminde parlayan mühür izi (daralmış halka, soluk) + 3-5 beyaz kor parçacığı.
- Renk: yalnız beyaz + soluk altın (+ koyu altın kontur). Ateş kırmızısı / turuncusu YOK (pure hasar ateş sanılmasın). Kalkan parlaması, element izi yok.
- Vuruş karesi: 4 (hasar sayısı bu karede çıkar).
- Süre hedefi: belirme + daralma ~0,36-0,42 sn, fışkırma ~0,3 sn, sönüş ~0,4 sn; art arda iki vuruşta ekranı boğmamalı.

## Tur 1 · Codex · çizim
YAPILMADI: 2026-11-21 Codex kotası doldu ("usage limit", 15:50'ye kadar). Referans sayfası yok; Claude doğrudan kod çizimine geçti.

## Tur 1 · Claude · ekleme
- Kod çizimi `src/game/first-fire-fx.ts` (dokular `ff:*`, piksel tuval, otomatik koyu altın kontur). Akış ve ölçüler `docs/arch/areas/character-vfx.md` > "Durum: First Fire vuruşu".
- Kendi denetimim (oyundan yakalanan kareler, 1/60 sn elle ilerletme; boss test savaşı + "First Fire: jump", herkes ölemez, otomatik oyun):
  - Tur 1a: sütun dar ve kısa (göğüs hizası), düz beyaz levha gibi. Düzeltildi: sütun `w*0,85 x h*1,9`, üç sallanan alev dili, iki frekanslı kenar, arkada yumuşak ADD hale.
  - Tur 1b: Weir-Wyrm'de (w 420) sütun iri piksel blokları; büyük birimde doku iki kat çözünürlük. Hale kenarı kutu gibi görünüyordu: düşüş yumuşatıldı, alfa 0,4.
- Kontrol için yakalama: `ui-shots-mobil-masaustu/first-fire/muhur/` (serit.png + vuruş anı 1920x1080 / 844x390). Sıra Codex'te (kota açılınca kontrol).

## Tur 2 · Claude · yeni çizim isteği (sprite; Ömer 2026-11-21: "Olur ama kota açılınca çizdirip güzelleştir")
Ömer kod çizimi Ocak mührünü onayladı; Codex aynı tasarımı sprite olarak güzelleştirir. Zamanlama, renk, ölçekleme ve sesler AYNI kalır (Claude kodda tutar).
Önce kısa inceleme: `ui-shots-mobil-masaustu/first-fire/muhur/serit.png` + `vurus-ani-1920x1080.png` (bugünkü kod çizimi) için 3-6 maddelik not.

Çizilecek iki sheet (`new-art/first_fire_verdict/`), şeffaf zemin, keskin piksel (kenar yumuşatma yok; alfa yalnız 0, 0.5, 1 gibi birkaç kademe), yatay tek sıra, `padding_px` 0:
1. `seal.png` + `seal.json`: 5 kare, kare 180x66 (zemine yatık elips, yükseklik / genişlik 0,367; elips karenin tamamını kaplar, kenarda 1 px boşluk).
   - Kare 0-3: aynı mühür, motifler saat yönünde dönüyor (4 kare = bir motif aralığı, döngü dikişsiz).
   - Kare 4: "kilit" karesi: aynı mühür, halkalar ve motifler beyaza yakın parlak.
   - Tasarım: dış çift çizgi halka + iç halka; aralarında 8 motif: 4 taç dişi (uzun, sivri) ve 4 ocak işareti (küçük alev biçimli ocak / mangal glifi) dönüşümlü; ince işli (küçük noktalar, çentikler). İç alan soluk altın parıltı, merkeze doğru beyazlaşan, düşük alfa.
   - Işık üstten: elipsin arka (üst) yarısı açık, ön (alt) yarısı koyu altın. Dış kenarda ve motiflerde 1 px koyu altın kontur.
2. `column.png` + `column.json`: 3 kare (titreşim döngüsü), kare 64x224, origin alt orta (alevin tabanı karenin alt kenarında).
   - Beyaz çekirdek, soluk altın kenar, en dışta 1 px koyu altın kontur (yarı saydam); tabanda geniş, yukarı daralan; üstte 3 sallanan alev dili (orta en uzun, karenin üst kenarına kadar). Karelerde diller ve kenar dalgası farklı (titreşim).
- Palet (yalnız bunlar): beyaz `#ffffff`, beyaz-altın `#fff3c8`, soluk altın `#f6dd94`, altın `#e6c162`, koyu altın kontur `#6b4c1c`. Kırmızı / turuncu YOK.
- json şeması: `{ "frames": N, "fps": 18, "frame_size": [w, h], "sheet_size": [W, H], "grid": [N, 1], "order": "row-major", "padding_px": 0 }`.
- `preview.png`: iki sheet'in 4x büyütülmüş hali (kontrol için). Üretim betiği aynı klasörde kalsın.


## Tur 2 · Codex · inceleme + çizim · 2026-11-21
Sürüm: gerçek savaş; verilen bugünkü `serit.png`, `vurus-ani-1920x1080.png` ve boss montajı.

- 33–400 ms: altın elips hedefin ayaklarına bağlı; daralma ve kilit okunuyor. Halka üzerindeki işaretler oyun ölçeğinde küçük ve birbirine benziyor.
- 500 ms vuruşunda sütun halkanın içinden çıkıyor; 30 hasar sayısı aynı evrede beliriyor. Beyaz çekirdek ve altın kenar ateş kırmızısına kaçmıyor.
- 1920×1080 karede parlak sütun ve hasar sayısı küçük hedefin adını ve can çubuğunu kısmen örtüyor; hedef yine ayırt ediliyor.
- Boss montajında 600–900 ms sütun büyük gövdeye ve arayüze biniyor, fakat mühür ayakta kalıyor; görüntülerden kesin zamanlama veya konum ölçüsü çıkarılamaz.
- 767–1033 ms sönüşünde sütun çekiliyor ve mühür izi kalıyor. Yeni sprite'ın gerçek savaşta küçük hedefte ve bossta okunurluğu ayrıca kontrol edilmeli.

Çizim: `new-art/first_fire_verdict/seal.png` (5 × 180×66), `column.png` (3 × 64×224), JSON dosyaları, 4× `preview.png` ve üretim betiği `draw.py`. Şeffaf zemin, beş renkli palet ve piksel kenarları kullanıldı. Dört taç ve dört ocak işareti dönüşümlü olduğundan bir motif aralığı sonunda türler yer değiştirir; dikişsiz döngü için dört karede iki motif aralığı (çeyrek tur) dönüyor. Kilit karesi ilk yönelimde parlak. Sütun alt orta dayanaklı; zamanlama, ölçek ve ses mevcut kodda kalacak.

Karar: **ekle**; Claude oyuna kurduktan sonra Codex gerçek oyun kareleriyle kontrol edecek.

## Tur 3 · Claude · ekleme · 2026-11-21
- Sheetler `assets/first-fire/seal.png|json` ve `column.png|json` olarak oyuna kuruldu (`src/game/first-fire-fx.ts`); zamanlama, renk, ölçek ve sesler aynı.
- Kareler tembel yüklenir (ilk uyarıda); yüklenmemişse eski kod çizimi kullanılır. Debug > Battle > Rules > `First Fire art: sprite / code (old)` ile eski çizime dönülür.
- Kontrol için gerçek savaş kareleri (boss deneme savaşı, Weir Eel hedef): `ui-shots-mobil-masaustu/first-fire/muhur/serit-v2.png`, `vurus-ani-v2-1920x1080.png`, `vurus-ani-v2-2580x1080.png`, `vurus-ani-v2-844x390.png`.
- Ölçülen: belirme ~33 ms, kilit ~400 ms, sütun tam ve hasar sayısı ~470 ms, sütun sonu ~800 ms, iz ~1,4 sn'de söner.

## Tur 3 · Codex · kontrol
- 33–367 ms karelerinde çift halkalı mühür hedefin ayağında belirip daralıyor ve kilitleniyor; 1067 ms'de zemin izi kalıyor. Küçük motifler savaş ölçeğinde tek tek seçilmese de mühür biçimi okunuyor.
- 467–733 ms'de sütun mührün içinden yükseliyor; beyaz çekirdek, soluk altın kenar ve üstteki alev dilleri çizimle uyumlu. Hasar sayısı vuruş evresinde görünüyor.
- Efekt beyaz ve soluk altın görünüyor; kırmızı veya turuncu efekt görülmüyor. Mühür ve sütun kenarları keskin piksel karakterini koruyor.
- 1920×1080 ve 2580×1080 görüntülerde mühür ve sütun rahat seçiliyor; 844×390'da ince motifler kaybolsa da mühür ve vuruş sütunu ayırt ediliyor.
- Vuruş parlaması küçük hedefin gövdesini geçici olarak beyazlatıyor, adı ve can çubuğuyla örtüşüyor; hedefin çevresi ve konumu seçilebilir kalıyor. Kısa vuruş evresi için kapanma kabul edilebilir. Karar: **tamam**.

(Not, Claude: Codex bu bölümü ve board satırını Türkçe harfler "?" olarak bozuk yazdı; aynı içerik Claude tarafından UTF-8 olarak yeniden yazıldı.)

## Tur 4 · Claude · yeni çizim isteği (v3) · 2026-11-21
Ömer kod çizimi ile Tur 2 sprite'ını oyunda yan yana gördü: **"ikisi de aynı duruyor"**. Tur 2 çizimi oyun boyutunda kod çiziminden ayırt edilmiyor; "güzelleştir" isteği karşılanmadı. Sorunlar (oyun karelerinde, 1x):
- Mühür: 8 küçük motif ve üç ince çizgi oyunda (genişlik ~170 px) tek bir altın elipse dönüşüyor; motifler seçilmiyor.
- Sütun: neredeyse düz kenarlı, beyaz bir kutu / levha gibi; alev biçimi okunmuyor (dillerin arası boşluksuz, gövde yukarı daralmıyor).
Başarı ölçütü: 1920x1080 ve 844x390'da eski (kod) ve yeni yan yana konduğunda fark **bir bakışta** görülmeli. Zamanlama, ölçek ve sesler AYNI (kodda).

Palet yine yalnız: `#ffffff`, `#fff3c8`, `#f6dd94`, `#e6c162`, kontur `#6b4c1c`. Kırmızı / turuncu YOK. Keskin piksel, alfa yalnız birkaç kademe, şeffaf zemin, yatay tek sıra, `padding_px` 0. Mevcut `seal.*` / `column.*` dosyalarının ÜSTÜNE yaz (aynı adlar), `draw.py` güncellensin; json şeması aynı.

1. `seal.png` + `seal.json`: **6 kare, kare 180x66** (elips tam kare, kenarda 1 px boşluk). Az ama BÜYÜK motif:
   - **Kalın dış halka**: 4-5 px bant (üst yarı soluk altın / beyaz-altın, alt yarı altın), iki yanda 1 px koyu altın kontur.
   - **İnce iç halka**: 1-2 px, yarıçapın ~%55'inde.
   - Halkalar arasında **4 büyük motif** (90° aralıkla), her biri aynı "taç + ocak alevi" işareti: üç sivri dişli taç, ortadaki dişin içinde küçük alev. Her motif **en az 18 px geniş, 13 px yüksek**, beyaz-altın dolgu + 1 px koyu kontur; motif bandın dışına taşabilir (okunurluk öncelik). Motifler dik durur (eğilmez), yalnız konumları elips boyunca döner.
   - Ortada dönmeyen **küçük amblem**: ocak kâsesi (mangal) ve üstünde taç biçimli alev, ~28x18 px, beyaz-altın + kontur.
   - İç alan: hafif soluk altın parıltı (düşük alfa), amblem net.
   - Kare 0-3: motifler saat yönünde döner; 4 karede çeyrek tur (22,5° / kare), döngü dikişsiz. Amblem sabit.
   - Kare 4 = **kilit**: halkalar, motifler ve amblem beyaz / beyaz-altın, iç alan belirgin parlak (alfa yüksek), dış halkanın içine 1-2 px soluk altın parıltı halkası. Kilit anı kare 0-3'ten belirgin ayrı görünmeli.
   - Kare 5 = **kor izi** (sönüş): aynı geometri ama halkalar kırık kor parçaları (kısa yaylar, aralarında boşluk), her parçanın ortası beyaz / beyaz-altın, kenarı soluk altın; motifler ve amblem soluk altın, birkaç beyaz kıvılcım pikseli. Söner gibi görünmeli.
2. `column.png` + `column.json`: **6 kare, kare 80x240**, origin alt orta (alevin tabanı alt kenarda). Gerçek ALEV silueti:
   - Tabanda geniş (~64 px), yukarı belirgin daralan: yüksekliğin ortasında gövde en çok ~40 px. 8 px'den uzun dik düz kenar YOK (kutu gibi durmasın).
   - **5 alev dili** (orta en uzun, karenin üstüne ~10 px kalana kadar; iki yan orta boy; iki dış küçük). Diller arasında **şeffaf V boşluklar** yüksekliğin ~%45'ine kadar iner; diller kıvrık (S biçimi), uçları sivri.
   - İçte **parlak beyaz çekirdek** (damla biçimli, tabandan yüksekliğin ~%55'ine), sonra beyaz-altın, sonra soluk altın, en dışta 1-2 px altın kenar ve 1 px koyu altın kontur (yarı saydam olabilir).
   - Üstte **kopan korlar**: her karede 2-4 küçük kor (2x2 / 3x3, beyaz ya da beyaz-altın, konturlu), dillerin üstünde ve arasında; kareden kareye yükselir.
   - 6 kare dalgalanma döngüsü: diller sallanır, boyları sırayla değişir, döngü dikişsiz.
3. `preview.png`: iki sheet 4x. Ek olarak **`preview-1x.png`**: oyun boyutunda karşılaştırma, kum renginde zemin (`#b08a58`) üstünde: üst satır ESKİ (`assets/first-fire/` içindeki şimdiki sheetlerden mühür kare 0 → 170x62, kilit kare 4, sütun kare 0 → 100x300), alt satır YENİ (aynı boyutlarda; mühür kare 0, kilit, kor izi; sütun kare 0 ve 3). Ölçekleme en yakın komşu (NEAREST). Bu görüntüde eski ile yeni bir bakışta farklı görünmüyorsa çizimi büyüt / sadeleştir, sonra bitir.
- Not: `assets/first-fire/` içindeki eski dosyaları preview için OKU ama değiştirme; Claude oyuna kopyalar.

## Tur 4 · Codex · çizim
- Altı kareli mühür ve alev dizileri, JSON dosyaları ve üretim betiği `new-art/first_fire_verdict/` altında hazır. Büyük taçlı motifler, sabit ocak amblemi, ayrı kilit ve kırık kor izi çizildi; alev beş dil ve yükselen korlarla yeniden oluşturuldu.
- `preview-1x.png` açılarak incelendi: eski ince elipse karşı büyük motifler ve eski düz sütuna karşı ayrık, sivri alev dilleri bir bakışta ayırt ediliyor. Oyun içi sonuç Claude ekledikten sonra kontrol edilmeli.
- Karar: **ekle**.

(Not, Claude: Codex bu bölümü ve board satırını yine "?" harfleriyle yazdı; Claude UTF-8 olarak yeniden yazdı.)

## Tur 5 · Claude · alev düzeltme isteği · 2026-11-21
v3 oyuna kuruldu (alev hedefin önünde, normal karışım, alfa 0,88). Oyun karesi 1x (üst satır eski kod çizimi, alt satır v3): mühürdeki taçlar artık seçiliyor, alevin üst dilleri görünüyor. AMA alevin gövdesi parlak kum zemin önünde hâlâ tek parça krem bir leke; iç yapı ve kenar okunmuyor (soluk altın / beyaz-altın zeminle aynı parlaklıkta).
Yalnız `column.png|json` yeniden çiz (6 kare, 80x240, aynı palet, mühür DEĞİŞMEZ):
- Dış kenar daha koyu ve kalın: en dışta 1 px `#6b4c1c` kontur TAM opak, içinde 3-4 px `#e6c162` altın bant (bugün 1-2 px).
- Gövdenin içinde **iç içe alev katmanları**: altın bant içinde soluk altın alev, onun içinde beyaz-altın alev, en içte beyaz çekirdek; her katman kendi sivri dilleriyle (katman sınırları düz dikey çizgi değil, yukarı sivrilen dil biçimli). Böylece parlak zeminde bile alev biçimi içten de okunur.
- Taban daha geniş (alt satırda ~72 px) ve tabanda 2-3 küçük yan dil dışa taşsın; gövde yukarı belirgin daralsın.
- Korlar biraz daha büyük (3x3 / 4x4) ve daha çok (3-5), konturlu.
- `preview-1x.png`'yi güncelle (yeni alevi, kum zeminde ve ayrıca açık zeminde `#e8d8b0` göster). Kontrol: açık zeminde alev kenarı ve iç katmanlar bir bakışta görünmeli.

## Tur 5 · Codex · çizim
- Opak koyu kontur, kalın altın bant, sivri iç katmanlar, geniş taban ve beş konturlu kor çizildi; mühür korundu.
- 1x önizleme kum ve açık zeminde incelendi: kenar ve iç katmanlar seçiliyor. Oyun içi görünüm eklemeden sonra doğrulanmalı.
- Karar: **ekle**.

## Tur 6 · Claude · ekleme (v3) · 2026-11-21
- Tur 4 mühür + Tur 5 alev `assets/first-fire/` altına kuruldu. Kodda: alev eni sheet oranından (80/240), alev hedefin ÖNÜNDE normal karışım alfa 0,88 (önde ADD kopya 0,12, hale 0,15); sönüşte kor izi karesi + ADD parıltı iki kez titreyip söner. Zamanlama ve sesler aynı; eski kod çizimi debug düğmesiyle döner.
- Kontrol kareleri (gerçek savaş, boss deneme savaşı, hedef Defender; boss karesi doğrudan çağrı): `ui-shots-mobil-masaustu/first-fire/muhur/karsilastirma-v3.png` (1x kırpım: 1. satır eski 1920, 2. yeni 1920, 3. eski 844, 4. yeni 844), `vurus-ani-v3-1920x1080.png`, `vurus-ani-v3-844x390.png`, `vurus-ani-v3-boss-1920x1080.png`.
- Ölçüt (Ömer): eski ile yeni yan yana konunca fark bir bakışta görülmeli.

## Tur 6 · Codex · kontrol
- 1920×1080 karşılaştırmasında fark bir bakışta görülüyor: yeni mühürde iri taçlar ve kalın halka, eski ince ve bezemesiz görünen elipsten ayrılıyor; fışkırma da daha sivri ve katmanlı.
- 844×390 karşılaştırmasında fark bir bakışta yeterince görülmüyor: iki sürüm de küçük, parlak bir halka ve dikey ışık sütunu gibi duruyor; taçların biçimi ve alev katmanları savaş kalabalığında seçilmiyor.
- Masaüstünde mühür motifleri özellikle daralma ve iz evrelerinde okunuyor; boss karesinde de taçlar belirgin. Küçük hedefte orta amblem karakter ve parlama altında örtülüyor, telefonda motifler tek tek okunmuyor.
- Boss karesinde alevin daralan silueti, sivri dilleri ve iç katmanları okunuyor; küçük hedefte parlak çekirdek baskın, telefonda alevden çok ince bir ışık sütunu görünüyor. Efekt beyaz ve soluk altın; koyu altın kontur var, kırmızı veya turuncu görünmüyor.
- Karar: **duzelt**. Mobil oyun ölçeğinde eski sürümden hemen ayrılacak kadar az ve daha belirgin taç motifi ile daha geniş, ayrık alev dilleri ve kontrastlı katmanlar dene; 844×390 gerçek savaşta eski-yeni karşılaştırmasını tekrar göster.

## Tur 7 · Claude · düzeltme · 2026-11-21
- Codex Tur 6 notuna göre telefonda (html.short, 844x390) sprite mühür eni ve alev eni 1,45 kat, alev boyu 1,2 kat büyütüldü (`FIRST_FIRE_PHONE_SCALE`); masaüstü ve kod çizimi değişmedi.
- `karsilastirma-v3.png` yeniden üretildi (satır 3-4 artık 240x250 1x kırpım; yeni 844 satırı telefon ölçeğiyle), `vurus-ani-v3-844x390.png` yenilendi.

## Tur 7 · Codex · kontrol
- 844×390 eski/yeni karşılaştırmasında fark artık bir bakışta görülüyor: yeni alev 167 ve 367 ms karelerinde eski dar, beyaz sütundan daha geniş, altın kenarlı ve sivri siluetli.
- Yeni mühür daralma ve iz evrelerinde eski ince elipsten daha iri ve parlak görünüyor; taç motifleri telefon ölçeğinde küçük ve kalabalık savaşta tek tek her zaman okunmuyor.
- Tam 844×390 vuruş karesinde alev hedefin üzerinde belirgin; parlak çekirdek gövdenin bir bölümünü geçici olarak örtüyor. Karar: **tamam**; eski ve yeni telefon ölçeğinde ayırt ediliyor.
