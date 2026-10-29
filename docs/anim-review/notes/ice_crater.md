# Ice Crater · `ice_crater` · Mage (sınıf skill'i, mob değil)

Ömer 2026-10-29: "vfx ve icon düzenlemeleri de olsun" — Mage reworkünün yeni skill'i şimdilik Blizzard'ın efektini ödünç alıyor; kendi efekti olacak.
Skill: tek düşman. Hedefin ALTINDA buz krateri patlar (buz büyü hasarı + Chilled), sonra hedef 1 hücre itilir (itme/kayma birimin kendi hareketi, efekt değil).
Hücre doluysa itme yerine çarpma olur: o an hedefin gövdesinde küçük bir buz çatlağı / kırılma (ikinci küçük dizi).

## Tur 1 · Claude · yeni çizim isteği · 2026-10-29

İki dizi, ikisi de `new-art/ice_crater/` altına, şeffaf arka plan (siyah / dama zemin YOK, kenarda siyah çerçeve yok):

### A) `ice_crater.png` + `ice_crater.json` — krater patlaması (ana efekt)
- 12 kare, kare 256x256, ızgara 4x3 (row-major), padding 0, fps 16 (json: `frames: 12, fps: 16, frame_size: [256,256], grid: [4,3], order: "row-major", padding_px: 0, pivot: [128, 214]`).
- Dayanak: hedefin AYAK noktası = karede (128, 214). Zemin halkası bu y'de, yatay ortada. Yukarı uzanan buz en çok y≈40'a kadar (kare üstüne değmesin, KESIK olmasın).
- Bakış: yandan görünüm, kamera göz hizası; zemin halkası basık elips (en/boy ~3:1), çapı ~200 px.
- Akış (kareler birbirine akmalı, ani sıçrama yok):
  - s1-s2: ayak altında soluk buz mavisi parıltı ve ince kırağı halkası belirir; zeminde 4-6 ince ışınsal çatlak açılır.
  - s3-s4: çatlaklardan beyaz-mavi ışık sızar, halka hafif çöker (krater ağzı koyulaşır, mavi gölge).
  - s5-s7: VURUŞ (s6 en büyük an): kraterin kenarından yukarı doğru 5-7 sivri buz kristali / buz dikeni fırlar (ortadakiler en uzun ~170 px, kenarlar kısa), hafif dışa yatık; ortada kısa beyaz-mavi patlama ışığı; birkaç buz kıymığı yukarı-dışa saçılır.
  - s8-s9: dikenler çatlar, uçları kırılıp parçalar dışa düşer; ışık söner.
  - s10-s11: dikenler kısalıp krater içine çöker; zeminde kırağı lekesi + birkaç küçük buz parçası kalır, ince soğuk sis yükselir.
  - s12: yalnız soluk kırağı lekesi ve sis izi (sonraki kareye değil boşluğa sönüyor; son kare boş OLMASIN, çok soluk iz kalsın).
- Renk: Mage'in buz dili (Blizzard'ın paleti): beyaz #f4fbff, buz mavisi #8fd8ff, orta #4aa3ff, gölge koyu çelik mavi #1f3f5c. Ateş/mor yok.
- Üslup: ortaçağ, temiz pixel art (net piksel, sınırlı palet, düz gölgeleme); gürültü yok ama boş da değil.
- Hedef birim (kukla) ~122x190 px ekranda; efekt ekranda ~1,3x kare ölçeğinde (yaklaşık 330 px kare) oynar, yani dikenler gövdenin yaklaşık bel-göğüs hizasına kadar çıkar, birimi tamamen kapatmasın (dikenler halkanın ön/arka kenarında, ortası yarı saydam ışık).

### B) `ice_crater_crack.png` + `ice_crater_crack.json` — çarpma çatlağı (küçük)
- 8 kare, 256x256, ızgara 4x2, fps 18, pivot [128,128] (merkez = çarpma noktası, birimin gövdesinin yan kenarı).
- s1-s2: beyaz-mavi küçük darbe parıltısı; s3-s5: yıldız biçiminde buz çatlağı (6-8 kollu, ~120 px) ve 4-6 buz kıymığı dışa; s6-s8: çatlak solup parçalara ayrılıyor, kıymıklar düşüyor, sönüş.
- Aynı palet ve üslup. İçerik karenin ortasında, ~%60'ını kaplasın.

Bitince board.md satırını `ekle` yap. preview.gif isteğe bağlı.


## Tur 1 · Codex · çizim · 2026-10-29
İki yeni dizi çizildi: `new-art/ice_crater/ice_crater.png` (12 kare, 4×3, 256×256, 16 fps, pivot [128,214]) ve `ice_crater_crack.png` (8 kare, 4×2, 256×256, 18 fps, pivot [128,128]); JSON dosyaları aynı klasörde.

Görsel kontrol: iki sheet de row-major sırada açıldı. Her kare ayrı ayrı tarandı; 12/12 ve 8/8 kare dolu, tamamı gerçek alfa kanallı, opak siyah piksel yok, içerik hiçbir kare kenarına değmiyor. Ana efektte yükselen dikenler s6'da en yüksek; sonraki karelerde kısalıp sönüyor. Çarpma dizisinde çatlak s3–s6 arası belirgin, s7–s8'de kıymıklara dağılıyor. İstenen boyut, ızgara ve pivotlar JSON'larda doğrulandı. `draw_sheets.py` yeniden üretim betiği olarak bu klasöre eklendi.

Claude: oyuna ekle ve ardından `kontrol` aşamasına geçir.

## Tur 2 · Claude · yeni çizim isteği (düzeltme) · 2026-10-29
Sheet'e baktım (oyuna kurmadan önce), üç sorun:
1. `ice_crater` s1-s2: halka ilk karede TAM boy ve dolu açık mavi disk olarak beliriyor (EKSIK-ARA). İstenen: s1'de küçük (~%35 çap) ve soluk (alfa ~%40) kırağı halkası, s2 ~%70, s3 tam boy; disk içi dolu açık mavi değil, ince kırağı halkası + yarı saydam (alfa ≤ %45) iç dolgu.
2. `ice_crater` s10-s12: dikenler çöktükten sonra parlak, dolu açık mavi disk geri geliyor (s9'daki koyu krater -> s10 parlak disk: ZIPLAMA renk/ışık). İstenen: krater ağzı koyudan soluk kırağıya yavaşça dönsün, s10 alfa ~%70, s11 ~%45, s12 ~%20; birkaç küçük buz parçası ve 2-3 ince sis kıvrımı kalsın.
3. `ice_crater` s5-s7: ortadaki dolu açık mavi top (daire) STIL: buz değil top gibi okunuyor. Yerine dikenlerin arasından yükselen yarı saydam beyaz-mavi ışık sütunu / parlama (yumuşak kenarlı, merkezde beyaz), s7'de sönmeye başlasın.
4. `ice_crater_crack` s4 -> s5: çatlak ~%50 birden büyüyor (BOYUT). s3-s6 boyunca boyut düzgün artsın (s3 %60, s4 %80, s5 %95, s6 %100), s1-s2 parıltısı da biraz daha büyük (~40 px) olsun.
Kare sayısı, ızgara, pivot, fps aynı kalsın. Aynı dosyalara üzerine yaz.

## Tur 2 · Codex · çizim · 2026-10-29
Tur 2 düzeltmeleri aynı dosyalara yeniden çizildi; `draw_sheets.py` artık yeniden üretim betiği. Ana kraterde s1/s2 halkası %35/%70 boyuta ve düşük alfa değerlerine çekildi, iç dolgu halka seviyesinde yarı saydam bırakıldı; s3'te tam boy. s1-s2 çatlakları da küçük halkayla orantılı. s5-s7 merkezdeki top kaldırılıp sivri kristaller arasına saydam, beyaz merkezli ışık sütunu kondu. s9-s12 krater ağzı koyudan giderek soluk kırağıya iner; alfa sırasıyla s10 %28, s11 %18, s12 %9 (render alfa tepe değeri 72/46/22); küçük parçalar ve ince sis izi kalır. Çarpma çatlağında s3-s6 büyümesi ölçekli olarak %60/%80/%95/%100, ilk iki parıltı yaklaşık 40 px.

Kare kare görsel kontrol: ana sheet s1-s12 ve çarpma sheet s1-s8 ayrı ayrı tarandı. Her kare dolu ve kenarlardan kırpılmamış; ana efektin en yüksek dikeni s6'da, ardından s7-s9'da kısalıyor ve s10-s12'de yalnız düşük alfali kırağı/sis kalıyor. Çarpma çatlağı s3-s6 boyunca düzenli büyüyor, s7-s8'de parçalara ayrılıyor. İki PNG de RGBA şeffaf; opak siyah piksel yok. Her iki JSON'da kare sayısı, ızgara, pivot ve fps istekteki değerlerle aynı.

Claude: iki sheet'i oyuna ekle; board `ekle` olarak kalır.

## Tur 3 · Claude · ekleme · 2026-10-29
Oyuna kuruldu: `assets/vfx/mage/01-ice-crater` (+ `02-ice-crater-crack`), asıllar `assets/source/mage-vfx/`. Efekt `src/game/art-v2/mage/vfx.ts > ice_crater` (skill'in ödünç `vfx: blizzard` alanı kaldırıldı; v2 anahtarı = skill id).
- Krater hedefin ayak noktasına oturur (origin 0.5, 214/256), ekranda halka ≈ 1,8 x birim genişliği; dikenler birimin ARKASINDA, halkanın ön kenarı (kare y ≥ 206, kırpılmış ikinci kopya) birimin önünde. 16 fps + kodla ara kare 2x (crossfade) = 32 fps. Vuruş = s6 (hasar o an).
- Kodla ekler: asa kristali parlaması, ayak altında yatık buz mührü (hazırlık), vuruşta beyaz-mavi ışık + yukarı saçılan buz kıymıkları + ince soğuk sis.
- Çarpma (`crash_ice_crater`, yeni olay kancası): itme yönündeki gövde kenarında `02-ice-crater-crack` (s3-s4 atlanır, büyüme kodla 0,7 -> 1), kısa parlama; dosta çarptıysa onda küçük çatlak.
- Test panelinde: "Mage (class effects)" grubu: Ice Crater (kukla ön sırada, geri itilir) ve Ice Crater crash (kukla arka sırada, tahta kenarına çarpar). Yakalama: captures/ice_crater, captures/ice_crater_crash (kukla arka sırada x=170).
Kontrolde bak: dikenler hedeften çıkıyor gibi mi (ayak/zemin hizası), birimi kapatıyor mu, çarpma çatlağı doğru kenarda mı (geri = oyuncu tarafında sol).

## Tur 3 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/ice_crater + captures/ice_crater_crash (2026-10-29)
Genel: Ana krater ayak altında açılıyor ve dikenler yükselip sönüyor; çarpma sahnesinde hedef sola, tahta kenarına doğru itiliyor ve çatlak bu yöndeki kenarda beliriyor. Krater dikenlerinin yanında karemsi soluk bir leke seçildiği için düzeltme gerekiyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #6–#16 · s1–s6 | Halka ayak tabanında küçükten büyüğe açılıyor; merkez hedefin ayak hizasında kalıyor. s6'da dikenler yükseliyor. | - | - |
| #18–#27 · s8–s13 | Dikenler ve buz etkisi hedef çevresinde devam ediyor; ana sheet'te ani konum/boyut sıçraması yok. Dikenlerin yanındaki zeminde soluk, dikdörtgene yakın bir leke görülüyor. | STIL: efekt yanında atlas/kare sınırı izlenimi veren leke | Leke kaynağını temizle; dikenlerin kenarındaki zemin dokusu çevreyle kesintisiz karışsın. |
| #21–#28 · s10–s13 | Hedefte beyaz gövde silueti ve hasar sayısı görünüyor; bu genel vuruş parlamasıdır, krater görseli birimi kapatmıyor. | - | - |
| #20–#30 · s10–s14 | Dikenler kısalırken halka/sis sönüyor; ayak noktası yerinden sıçramıyor. | - | - |
| #34–#54 · crash sheet s? | Hedef geri itilirken tahta kenarında duruyor; çatlak/parlama hedefin sol kenarında, itme yönünde. | - | - |

Vuruş anı: Kraterin s6 diken tepe noktası (#16 civarı, 517 ms) hasar/parlama evresiyle örtüşüyor; beyaz siluet genel vuruş parlaması olduğundan doğru. Çarpma sahnesinde çatlak hedefin sol kenarında görünüyor. Çarpma yakalamasının `frames.json` dosyasında tüm karelerde `vfx` dizisi boş; bu sahne için koordinat ve sheet karesi eşlemesi JSON'dan doğrulanamadı.
Karar önerisi: düzeltilebilir; yalnız krater dikenleri yanındaki soluk dikdörtgen leke temizlenmeli. Ayak hizası, akış, boyut ve itme yönü uygun.

Claude: Tur 4'te lekeyi temizle; ardından yeniden `kontrol` için board'a al.

## Tur 5 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/ice_crater (Tur 4 sonrası)
Genel: Tur 4 yakalamasında dikenlerin yanındaki dikdörtgen leke artık görünmüyor; krater ayak altında açılıyor, sönüşte düşük yoğunluklu sis ve kırağı izi kalıyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #18 · s? | Hedefin ayaklarında ince mavi halka ve kısa buz kıymıkları; efekt tabanı zemine oturuyor. | - | - |
| #38 · s? | Hasar/parlama sonrasında ayak altında sönük krater izi ve ince soğuk sis var; karemsi leke seçilmiyor. | - | - |
| #52 · s? | Dikenler kaybolmuş, yalnız çok soluk zemin izi/sis kalmış; hedefle hizası korunuyor. | - | - |

Vuruş anı: Yakalamada hasar sayısı buz etkisinin ardından çıkıyor; Tur 3'teki s6 tepe anıyla uyumlu. Önceki leke giderilmiş.
Karar: tamam; yeni düzeltme gerekmiyor.

## Tur 4 · Claude · düzeltme · 2026-10-29
Leke kaynağı iki yerdeydi: 'crossfade+motion' ara kare yöntemi (yer değiştiren ara karede kare sınırı izi bırakıyordu) ve vuruş anındaki büyük yarı saydam hale parlaması (köşeli görünüyordu). Ara kare 'crossfade' oldu, hale t.w*2,2/0,35'ten t.w*1,5/0,25'e indi. Yeni yakalama: captures/ice_crater (60 kare); #18–#52 kırpımlarında dikdörtgen leke görülmüyor.
Kontrolde bak: #18–#30 dikenlerin yanındaki zemin; #38–#52 kalan sis.
