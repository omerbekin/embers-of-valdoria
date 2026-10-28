# Raven's Peck · `ravens_peck` · Raven Seer

## Tur 1 · Codex · inceleme · 2026-10-28
Sürüm: Real battle   Yakalama: captures/ravens_peck (2026-10-28, kullanıcı tarafından güncel olduğu bildirildi)
Genel: Mermi sağdaki Raven Seer'dan çıkıp sola, altın zırhlı hedefe doğru akıyor; kısa mor tüy izi okunaklı, ardından mor-beyaz isabet parlaması geliyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5 · s1 → #12 · s5 | Efekt x=1125'ten x=793'e, y=647'den 704'e ilerliyor; 262×262 kutu sabit. | - | - |
| #13 · s6 → #18 · s9 | Mermi hedefin yanında sabitleniyor; tüyler uzayıp sola yöneliyor. | - | - |
| #19 · s10 → #23 · s10 | Mor-beyaz küre/çarpma parlaması hedefin üzerinde; #20'de 21 hasar sayısı görülüyor. | - | - |
| #24 · s11 → #46 · s24 | Etki küçülüp sönüyor; konum sabit ve kare geçişleri düzenli. | - | - |

Konum doğrulaması: JSON'da ilk görünüm merkezi (1125,647), son hareketli görünüm (774,707); yaklaşık 351 px sola ve 60 px aşağı yol alıyor. Görselde başlangıç Raven Seer'ın önünde, bitiş karşı hedefin hizasında. Kare boyutu tüm süreçte 262×262; belirgin zıplama/kırpılma yok.

Vuruş anı: #19'da (450 ms, s10) çarpma parlaması beliriyor, #20'de (467 ms, s10) 21 hasar sayısı çıkıyor. Efekt hedef tarafında; zamanlama uygun.
Karar önerisi: düzeltilebilir değil, mevcut haliyle tamamlanabilir; belirgin akış, hizalama veya vuruş sorunu görmedim.

## Tur 1 · Claude · geri gönderildi · 2026-10-28
Düzeltme yapılmadı. Board'daki asıl soru açık kaldı: efekt **asanın ucundan** mı çıkıyor? Yakalamada ilk kareler
(#5-#9) kuzgun Raven Seer'ın göğsünün önünde, gövdesini örterek beliriyor gibi; asa başı daha yukarıda / sağda.
Tur 2'de yalnız bunu değerlendir: çıkış noktası asa başına göre nerede (yön + ~px, `frames.json` > units ve vfx x/y),
ilk karede kuzgun atanın gövdesini örtüyor mu, örtüyorsa ne kadar kaydırılmalı. Kalan akış (yol, vuruş, sönüş) Tur 1'de uygun bulundu.

## Tur 2 · Codex · inceleme · 2026-10-28
Sürüm: Real battle   Yakalama: captures/ravens_peck (2026-10-28, güncel)
Genel: Mermi sağdaki Raven Seer'dan sola doğru çıkar; ilk görünüm asa ucuna oturmuyor ve atanın üst gövdesi/kol hizasını kısmen kapatıyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5 · s1 → #9 · s4 | Efekt merkezi (1125,647) → (935,679); Raven Seer merkezi (1195,802). İlk merkez atanın 70 px solunda, 155 px yukarısında. | HIZA: görselde mor çıkış asa başının hizasında değil; gövdenin önünde/üst kol hizasında beliriyor. | Çıkışın içteki başlangıç kısmını asa ucuna, yaklaşık 50–70 px sağa ve asa başının y seviyesine yaklaştırın; gövde üstündeki parlak alanı azaltın. |
| #10 · s4 → #13 · s6 | Mermi sola ilerleyip (774,707)'de hedef kuklanın gövde hizasında duruyor. | - | - |
| #19 · s10 → #23 · s10 | Hedef üzerindeki mor-beyaz çarpma; #20'de 21 hasar. | - | - |
| #24 · s11 → #45 · s24 | Etki hedef üzerinde düzenli biçimde küçülüp sönüyor. | - | - |

Konum doğrulaması: `units` Raven Seer'ı (1195,802), kuklayı (725,802) gösteriyor. İlk VFX merkezi (1125,647); ilk karede efekt alanı Raven'ın gövdesine taşıyor. Görselde asa Raven'ın üst tarafında/gerisinde kalırken mor iz göğüs-omuz hizasından açılıyor; çıkış yaklaşık 50–70 px asa yönüne taşınmalı, kesin asa ucu görselde küçük olduğu için piksel tahmini.

Vuruş anı: #19 (450 ms, s10) çarpma başlıyor, #20 (467 ms) hasar sayısı çıkıyor; hedefte ve uygun.
Karar önerisi: düzeltilebilir; yalnız başlangıç/çıkış noktası asa başına yaklaştırılsın, yol ve isabet akışı Tur 1'de uygun bulundu.

## Tur 2 · Claude · düzeltme · 2026-10-28
Çıkış noktası asa başına taşındı: data/battle-layout.json > ravens_peck srcDx 70 → 45, srcDy -60 → -85.
İlk VFX merkezi (1125,647) → (1150,622): 25 px atana doğru (sağa), 25 px yukarı. Kalan akış değişmedi.
Kontrolde bak: ilk kareler asa başından açılıyor mu, gövdeyi hâlâ örtüyor mu. Yakalama yenilendi.

## Tur 3 · Codex · kontrol · 2026-10-28
Yakalama: captures/ravens_peck (kullanıcı eki, 2026-10-28; yeniden yakalama yapılmadı)
Genel: Asa yönündeki çıkış düzeltmesi amacına ulaşmış; mor etki Raven Seer'ın asa/üst el hizasına taşınmış, atanın gövdesini ilk konumdaki kadar örtmüyor ve yol ile hedefteki çarpma akışı korunmuş.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5 · s1 | Mor başlangıç Raven'ın sağ üst el/asa tarafında beliriyor; VFX merkezi (1150,622), caster merkezi (1195,802). | - | - |
| #6–#13 · s2→s6 | İz sola ve aşağı ilerleyerek hedefe yöneliyor; geçişler düzenli. | - | - |
| #19–#23 · s10 | Mor-beyaz darbe hedef kuklada; hasar #20'de çıkıyor. | - | - |

Vuruş anı: Önceki turdaki gibi hedefte ve uygun; düzeltme bunu etkilememiş.
Karar: tamam. Düzeltme beklentisi karşılandı, yeni belirgin hizalama/akış sorunu yok.
