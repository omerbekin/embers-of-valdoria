## Redtithe step1 v5: arka hançer tutuşu (content-designer, 2026-11-21)
Ömer (v4 onayı, r41): "Olur, kalan 22 poza devam. 3. koşu adımında daggerı yanlış tutuyor".

Bulgu: hançerler çizimde değil, oyunda yumruğa takılır (`data/poses.json`). Hata ARKA yumruktaki (ana el) hançerde: `itemPoses.daggers["main:step1"].angle` 45 idi (v4 öncesi kol için konmuş). v4'te arka önkol dirsekten (~190,120) yumruğa (~140,165) sola-aşağı ~225° gidiyor; 45° bıçak önkola PARALEL düşüyor, bıçak önkolun üstünden dirseğe doğru geri uzanıyor, topuz yumruğun altından çıkıyor (bilek 90° kırık, olmayan tutuş). Ön yumruktaki hançer (10°, yukarı) doğruydu, dokunulmadı.

Düzeltme: yalnız veri, çizim aynı. Duruştaki (R2) tutuşla aynı el yönü: R2'de önkol 135° (sağa-aşağı), bıçak 45° = önkol yönü - 90°. Koşu adımında aynı kural 225 - 90 = ~135° verir; hançer bandı (`tests/poses.test.ts`, Ömer kuralı "ucu öne" 40..120) en çok 120 izin verdiği için **120** (bilek ~15° kırık, gözle doğal). Bıçak yumruktan öne-hafif aşağı, kemer şişelerinin önünden düşmana doğru.

Değişmeyen: `poses.step1.anchor` açısı 35 (kılıç/balta/topuz/çekiç için). Aynı önkola göre o silahlar da paralele yakın düşer ama kendi bandı 14..50 dik tutuşa izin vermiyor; Ömer'e soru olarak raporlandı, değiştirilmedi.

Kontrol: oyunda çekim (`../redtithe-step1-v4/capture.mjs`), önce | sonra + duruş: `step1-v5-dagger.png`.

## v6: "sol el" (Ömer 2026-11-21: "Sol elde de çok hafif bir bozukluk var. Onu da düzelt onayladım say.")
Bulgu (oyun içi, kamera 5x yakın, `../redtithe-step1-v4/capture-hd.mjs`): ekranın solundaki ARKA yumrukta yumruğun boğum sırası yatay; 120° hançer kabzayı yumruğa çapraz sokuyordu, topuz yumruğun sol üstünden bilek sargısına doğru çıkıyor, kabza yumruktan kayık görünüyordu. `main:step1` 120 -> **100**: kabza boğum sırasıyla aynı yönde yumruğun ortasından geçer, topuz yumruğun solunda, bıçak öne-çok hafif aşağı. Ön yumruk (ekranın sağı, hançer yukarı 10°) yakından bakıldı, tutuş doğru, dokunulmadı. Önce | sonra: `ui-shots-mobil-masaustu/redtithe/step1-v6-el.png`.
