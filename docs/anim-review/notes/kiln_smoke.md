# Kiln Smoke · `kiln_smoke` · Charcoal Burner

## Tur 1 · Codex · inceleme · 2026-10-28
Sürüm: Real battle   Yakalama: captures/kiln_smoke (2026-10-28, kullanıcı tarafından güncel olduğu bildirildi)
Genel: Zeminde soldan sağa olmayan, sağdan sola ilerleyen dört duman/alev çıkışı oluşturuyor; her çıkışın kısa alevi ve ardından yükselen gri dumanı anlaşılır, fakat başlangıç telegraph'ı ile geniş alan etkisinin sınırı tam belirgin değil.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5 · s1 → #8 · s2 | İlk turuncu alev x=725, y=787 merkezinde; ince açık renkli zemin çerçevesi erken karelerde görünüyor. | HIZA: etki karakterden uzakta ve ilk alevin neyi hedeflediği belirsiz. | İlk çıkışı Charcoal Burner'ın ayaklarına/önündeki zemine yaklaştırın veya telegraph'ı açıkça ileriye yönlendirin. |
| #9 · s3 → #20 · s7 | İlk sütun büyüyüp duman çıkarırken ikinci alev aynı anda x=540'da beliriyor. | - | - |
| #21 · s8 → #46 · s24 | Dört sütun ardışık olarak x=725, 540, 355, 170 merkezlerinde beliriyor; sütunlar kısmen üst üste biniyor. | - | - |
| #47 · s16 → #85 · s24 | Dumanın gerisinde aynı alev/duman döngüsü sürüyor, sonra kayboluyor. | ZAMAN: son sütunlar uzun süre (yaklaşık 650 ms) düşük yoğunlukla kalıyor; bitiş sönüşü yavaş. | Son duman katmanlarını biraz daha erken soldurup bitişi sıkılaştırın. |

Konum doğrulaması: efekt kutusu 224×224 sabit; ilk üç ardışık konum arası 185 px sola kayıyor, y=787 sabit. Dört çıkışın akışı sheet'te görülebiliyor ve karakterleri tamamen örtmüyor; duman kolonları gövdenin gerisinde/solunda kalıyor.

Vuruş anı: yakalamada hasar sayısı görünmüyor; bu dizi çevresel zemin saldırısı olarak okunuyor, ancak ilk alev karaktere çok uzak olduğundan isabet alanı gözle teyit edilemiyor.
Karar önerisi: düzeltilebilir; ilk çıkışın karakter/zeminle hizası ve son dumanın sönüş süresi ayarlanmalı. Yeni çizim gerektiren bir sorun yok.

## Tur 1 · Claude · geri gönderildi · 2026-10-28
Düzeltme yapılmadı: "ilk alev karakterden uzak" bulgusu rolden kaynaklı olabilir. Kiln Smoke bir zemin skill'i
(`cells`): ATAN Charcoal Burner (sağda), alevler OYUNCU tarafının hücrelerine düşer; atanın yanında olması beklenmez.
Testte oyuncu tarafında yalnız bir kukla var (soldaki), diğer hücreler boş. Tur 2'de değerlendir: dört sütun oyuncu
tarafındaki hücrelere oturuyor mu (kukla x=725 hücresinde biri kuklanın üstüne düşüyor mu), duman kuklayı ne kadar
örtüyor, sütunlar arası 185 px aralık hücre aralığıyla uyumlu mu. Sönüşün uzunluğu (~650 ms) bulgusu geçerli; onu da tut.

## Tur 2 · Codex · inceleme · 2026-10-28
Sürüm: Real battle   Yakalama: captures/kiln_smoke (2026-10-28, güncel)
Genel: Dört çıkış oyuncu tarafındaki hücre çizgisine düzenli aralıkla oturuyor; ilk sütun kuklanın merkez hücresini vuruyor ve duman katmanları hedefi belirgin biçimde örtüyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5 · s1 → #13 · s7 | İlk alev merkezi (725,787); hedef merkezi (725,802). Efekt kutusu 224×224; kuklanın ayak/gövde alanıyla aynı hücrede. | - | - |
| #20 · s9 → #54 · s22 | Ardışık sütun merkezleri x=725, 540, 355, 170; y=787. | - | - |
| #14 · s7 → #40 · s21 | Beyaz-gri ve turuncu duman kuklanın siluetinin üstüne taşıyor, özellikle merkez hücrede hedefi kısmen saklıyor. | HIZA: geniş duman hedef siluetini örtüyor; alan etkisi anlaşılır ama hedef okunurluğu düşüyor. | Duman opaklığını/yoğunluğunu kuklanın merkez gövdesinde azaltın ya da dumanı biraz geriye/zemine yatırın. |
| #47 · s24 → #85 · s24 | Son sütunların düşük yoğunluklu dumanı sürüyor; son etkinin görünürlüğü yaklaşık 650 ms daha devam ediyor. | ZAMAN: sönüş uzun. | Son sütunların alpha düşüşünü erkene çekip yaklaşık 200–300 ms kısaltın. |

Konum doğrulaması: `units` hedefi (725,802), atıcıyı (1195,802) gösteriyor. Dört merkez 725, 540, 355, 170; oyuncu tarafındaki sıra boyunca 185 px aralıklı. İlk hücre tam kuklanın merkez çizgisine düşüyor; sonraki hücreler sola doğru eşit aralıkla yayılıyor. Efekt kutusu 224×224, kuklanın gövdesiyle örtüşme görsel olarak belirgin.

Vuruş anı: sayısal hasar yok; bu zemin hücre saldırısında ilk alev kuklanın hücresine oturuyor, konum doğru. Hasar testi yerine alan ve örtüşme değerlendirildi.
Karar önerisi: düzeltilebilir; hücre konumları/aralıkları doğru, hedefin okunurluğu için duman yoğunluğu ve uzun sönüş ayarlansın.

## Tur 2 · Claude · düzeltme · 2026-10-28
- Duman saydamlığı: yeni `alpha` ayarı 0.8 (efekt %20 daha saydam; kukla daha okunur).
- Duman biraz zemine: dy -15 → -5 (10 px aşağı).
- Sönüş: speed 1.2 (bütün dizi %20 hızlı). Yakalamada VFX kare sayısı 81 → 72 (~150 ms kısa), son VFX 1400 ms.
Kontrolde bak: kukla yeterince okunuyor mu; sönüş hâlâ uzunsa söyle (hız 1.3'e çıkabilir ya da sona fadeOut eklenebilir).

## Tur 3 · Codex · kontrol · 2026-10-28
Yakalama: captures/kiln_smoke (kullanıcı eki, 2026-10-28; yeniden yakalama yapılmadı)
Genel: Hedefin üstündeki duman artık daha saydam ve biraz daha alçakta; kukla silueti önceki kontrole göre daha rahat seçiliyor. Dört hücrelik sıra korunmuş, dizi 1400 ms civarında sonlanıyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5–#13 · s1→s7 | İlk alev kuklanın hücresinde; JSON merkezi (725,797), kukla merkezi (725,802). Duman alpha 0.8. | - | - |
| #14–#40 · s7→s21 | Duman kuklanın üstüne taşsa da saydamlığı sayesinde siluet okunuyor; alana yayılım belirgin. | - | - |
| #47–#84 · s24 | Son duman incelip kayboluyor; yakalamanın son karesi 1383 ms, VFX 1400 ms civarında bitiyor. | - | - |

Vuruş anı: Sayısal hasar yok; çevresel hücre etkisinde ilk alev hedef hücresine oturuyor. Okunurluk ve zamanlama yeterli.
Karar: tamam. Opaklık ve süre düzeltmeleri gözlenen sorunları gideriyor; ek ayar gerektiren belirgin kusur kalmamış.
