# Wail of the Dead · `wail_of_the_dead` · Undead (sınıf)

Ömer 2026-10-29: "undeadin animasyonları çok kötü. mevcut skill icon ve efektlerini referans alma. tamamen skillerin amacına ve elementine göre 0dan özgün düşünerek bir skill effect seti chatgptye çizdirir misin /vfx ile uygulayalım sonra"
Sarma üstüne Ömer: "görsellerin tamamı ya karakterlerin üstünde ya da altında kalıyor. etrafını saramıyor" (çözüm: wrap + ghost; Ömer hayalet saydamlığı 0,45 seçti)
Tasarım: `new-art/undead/brief.md` (mevcut ikon/efektler referans DEĞİL). Skill: artı alan, karanlık büyü hasarı + 2 tur zehir zemini; bedel mevcut canın %20si.

## Tur 1 · Claude · yeni çizim isteği · 2026-10-29
Çizim Codex yerine ChatGPT ile yapıldı (art-pipeline; brief.md prompt'ları). Asıllar `assets/source/undead-vfx/` (4x2, 1774x887, ~443 px kare, gerçek alfa).

## Tur 1 · Claude · ekleme · 2026-10-29
İçe aktarma `node tools/import-class-vfx.mjs undead` -> `assets/vfx/undead/` (320x320 kare, 4x2, alfa korunur). Kesim çizgileri sabit
ızgaradan değil EN BOŞ satır/sütundan (ChatGPT satırları ortada bölünmüyor: ör. 04'te y=452, 05'te y=437); kenara değen küçük komşu
kırıntıları silindi. Ölçüm: hiçbir karede siyah çerçeve / ızgara çizgisi / boş kare yok, içerik kare kenarına değmiyor.
Oynatma `src/game/art-v2/undead/vfx.ts` (kodla çizilen eski efekt kaldırıldı, vuruş anları ve olay sırası aynı):
- `undead/03-wail-of-the-dead-scream` (aslı 03-wail-scream): atanın ağzının önünde çığlık atan hayalet yüz, ses halkaları hedefe doğru (origin x 0,3; aynalı tarafta 0,7), 14 fps.
- `undead/04-wail-of-the-dead-grave` (aslı 04-wail-grave): vurulan HER hücrede yerden hayalet fırlar, taban sisi kalır. Zemin efekti: taban (kare y 0,94) hücre zeminine oturur. Hücrede birim varsa SARAR (wrap split 0,8, ghost 0,45): hayalet gövdenin arkasında, önünde 0,45 hayalet kopya; sis ayağın önünde. Boş hücrede aynı derinlik kuralı hücre y'si ile.
- Vuruş: merkez hücre efekti + hit() eskisi gibi ~0,62 sn; kollar 200 ms sonra (releaseStage sırası aynı).
Aynalama: Phaser flipX karenin içinde aynalar; asimetrik dayanakta aynalı tarafta origin x = 1 - ox (`sheetAt`).
Yakalama: `node tools/anim-capture.mjs wail_of_the_dead` (atan sağda, düşman tarafı; kukla solda).


## Tur 2 · Codex · inceleme · 2026-10-29
Sürüm: Real battle   Yakalama: captures/wail_of_the_dead (2026-10-29)
Genel: Atışın gerçek bölümü (#15'ten sonrası) çığlık ve çok hücreli mezar efektini tutarlı biçimde birleştiriyor; yerleşim ve katmanlama amaca uygun.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #15–#44 · 03 s1–s7 | Çığlık yüzü atananın önünde, x=1137; sağdaki atanın ağızı hizasında ve sola, kuklaya doğru bakıyor. | - | - |
| #15–#29 · 04 merkez s6–s8; #30–#44 · s6–s8 | Merkez hücrede hayalet kuklayı sarıyor; gövde arkada, aynı karedeki %45 kopya önde ve mezar sisi ayakların önünde. | - | - |
| #15–#44 · 04 boş hücreler s4–s8 | Boş hücre hayaletleri hücre tabanından yükseliyor; dolu hücrenin hayaletiyle aynı derinlik mantığında ve kuklanın ön/arka ayrımı okunuyor. | - | - |
| #45–#60 · 03 s7–s8 → 04 s1–s3 | Ses halkaları sona ererken merkez hayalet etkisi sürüyor; sonra kollar ve zemindeki sis/zehir izleri kalıyor. | - | - |

Vuruş anı: #15'te (250 ms, sheet başlangıç kareleri) merkez mezar efekti ve çığlık aynı anda başlıyor; hasar sayısı bu vuruşun ardından görünür (#55 yakın planında 19). Kolların #20'ler civarında yükselmesi, merkezin açılışından sonra geliyor; ses halkalarıyla kollar kısa süre örtüşüyor. Olay sırası okunaklı. İlk ~14 kare önceki atışın kuyruğu, değerlendirmeye alınmadı. Doğru mu: evet (hasar görünümü vuruşun ardından gelir; efektlerin örtüşmesi akışı bozmuyor).

Konum: Mezardaki sis havuzu ayak çizgisine (y=802) oturuyor; kare boyutu 287 px, etki merkezi x=725 y=802. Yakın planlarda taban sisi ayağın önünde ve ayağı zemine bağlı gösteriyor; geride ya da havada kalmıyor. Kaydırma: 0 px.
Çığlık: x=1137 y=653 konumundaki yüz atananın ağzının önünde; baş/ağız hizası uygun, sola hedefe dönük. Kaydırma veya yön düzeltmesi gerekmiyor.
Sarma/derinlik: Merkezde opak hayalet gövdenin arkasında, aynı konumdaki alpha 0,45 kopya önde, taban sisi daha da önde. Boş hücrelerde tabanları hücre zeminine basıyor; derinlik doğru.
Karar önerisi: tamam; kayma, yön, katman veya zamanlama düzeltmesi gerekmiyor.

## Tur 3 · Claude · düzeltme · 2026-10-29
Yakın plan kontrolü (Codex Tur 2 "0 px" dedi): dayanak içeriğin ALT kenarındaydı (BASE_Y 0,94), yani sis havuzunun alt kenarı ayak çizgisinde, havuzun
kendisi ayağın ARKASINDA kalıyordu (ayak havuzun önünde, kenarında). 04'ün taban havuzu kare y ~0,86-0,94 arasında; dayanak havuzun ortasına alındı
(`GRAVE_POOL_Y` 0,9; `src/game/art-v2/undead/vfx.ts > wailCell`): sprite ~11 px aşağı, ayak havuzun içinde durur, havuz ayağın önüne taşar; boş kol
hücrelerinde havuz hücre plakasının ortasına oturur. Konum/derinlik/zamanlama başka değişmedi. Yeni yakalama: captures/wail_of_the_dead.

## Tur 4 · Codex · kontrol · 2026-10-29
Yakalama: captures/wail_of_the_dead (2026-10-29; ilk ~25 kare önceki atışın kuyruğu, değerlendirme dışı). Karşılaştırma: f58→g57 merkez havuz, f92→g90 sönen sis, g100 kol hücreleri.

Merkez havuz: düzeltme başarılı. g57'de ayaklar havuzun içinde; mor sis ayağın önüne taşıyor ve zeminle birleşiyor. Havuz havada değil, gereğinden aşağı da oturmuyor. f58'deki önceki görünümde havuz ayağın gerisinde/kenarında kalıyordu.
Kol hücreleri: g100'de havuzlar ilgili hücre plakalarının ortasında. Sönüşte (g90) zemin izi de zemine bağlı kalıyor. Yeni yatay kayma veya katman/derinlik sorunu görünmüyor. İlk ~25 kare eski atış kuyruğu olduğundan kusur sayılmadı.
Karar: tamam.
