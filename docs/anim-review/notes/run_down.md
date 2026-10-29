# Run Down · `run_down` · Ash Hound

## Tur 1 · Codex · inceleme · 2026-10-29
Sürüm: Real battle   Yakalama: captures/run_down (2026-10-29)
Genel: Koşu alev izi Ash Hound'la birlikte soldaki kuklaya doğru ilerliyor; ayrı `scorch_bite` dizisi hedefte ısırma/isabeti tamamlıyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #1–#2 · run_down s0 | Alev izi Ash Hound merkezinde başlıyor; sonraki örnekte efekt merkezi (1213,739)'a çıkıyor. | ZIPLAMA: Y merkezinde ilk iki örnek arasında ~63 px yukarı sıçrama. | Eğer başlangıç pozu sıçrama değilse s0'ı sonraki Y seviyesine yaklaştırın; sıçrama hareketi kasıtlıysa görsel iz bunu destekliyor. |
| #3–#8 · run_down s1–s2 | Alev izi sola doğru uzayıp ilerliyor; merkez x=1205'ten 919'a inerken y=739 sabit. | - | - |
| #9–#11 · run_down s3–s4 + scorch_bite s0–s2 | Koşu izi x≈900'de biterken ayrı ısırma efekti hedefte (770,707) başlıyor; iki efekt kısa süre üst üste oynuyor. | SIRA: iki ayrı sheet arasındaki görsel bağ zayıf; koşu izi hedefe ulaşmadan biter ve aynı anda ısırma halkası belirir. | Son koşu karesini hedefe yaklaştırın veya iz sönüşünü daha belirgin yapın; ısırma başlangıcını koşunun bitişine bağlayın. |
| #12–#18 · scorch_bite s3–s9 | Ateşli halka hedefte büyüyüp kıvrılarak kapanıyor. | - | - |
| #19–#22 · scorch_bite s9–s10 | Kuklada 10 hasar görünür; efekt yoğun ve parlak. | - | - |
| #23–#37 · scorch_bite s11–s23 | Halka yıldız/kıvılcım formuna daralıp hedefte sönüyor. | - | - |

Konum doğrulaması: hedef kukla (725,802), Ash Hound (1195,802). `run_down` sheet'i 300×300 boyutta; merkez #1'de (1195,802), #2'de (1213,739), #3–#5 x=1205→1140, #6–#8 x=1083→919 ve #9–#11 x=901→891. `scorch_bite` sheet'i 235×235 boyutta, #9–#37 boyunca (770,707)'de sabit. İki sheet ayrı `key` olarak doğru okunuyor; ısırma kuklanın üst gövde hizasında.

Vuruş anı: #18'de (317 ms) `scorch_bite` s9; #19'da (333 ms) 10 hasar beliriyor. Hasar kuklanın üstünde ve doğru hedefte. Koşu izi ise #11'de (183 ms) sona eriyor; ardından ısırma 150 ms daha sürüp hasara ulaşıyor.
Karar önerisi: düzeltilebilir; iki parçalı kurgu ve hedef konumu doğru, ancak koşu izinin hedefe varmadan kesilmesi/ısırmayla örtüşmesi geçişi kopuk gösteriyor. İlk karedeki ~63 px düşey kayma da kasıtlı sıçrayış olup olmadığına göre yumuşatılabilir.

## Tur 1 · Claude · düzeltme · 2026-10-29
- ZIPLAMA (#1–#2): iz ayak hizasında doğup bir kare sonra göğse taşınıyordu; artık ilk karede göğüs hizasında doğuyor (src/game/mob-vfx.ts, trail başlangıcı).
- SIRA (#9–#11): atılma bitince iz 70 ms'de sönüyor (TRAIL_FADE_MS); ısırma tam parlaklıkta izle üst üste oynamıyor.
- İzin hedefe kadar uzaması düşünülmedi: iz köpeğin arkasında akar, köpek kuklanın önünde durur; ısırma kuklada başlar. Kontrolde bu geçiş okunuyor mu bak.
Yeni yakalama: captures/run_down (2026-10-29).

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/run_down (2026-10-29)
Genel: Başlangıç izi artık sabit yükseklikte; koşu izi sönerek hedefte başlayan ısırma halkasına temiz biçimde devrediyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #1–#2 · run_down s0 | İzin merkezi (1213,739)'da sabit; ilk ve ikinci örnek arasında düşey sıçrama yok. | - | - |
| #3–#8 · run_down s1–s2 | İz Ash Hound'la sola doğru akıyor; merkez y=739 sabit, x=1205'ten 919'a ilerliyor. | - | - |
| #9–#11 · run_down s3–s4 + scorch_bite s0–s2 | Hedefte ısırma halkası belirirken koşu izi sırasıyla tam, %61 ve %21 opaklığa düşüyor; #12'de iz kaybolmuş. | - | - |
| #12–#38 · scorch_bite s3–s23 | Isırma halkası hedefin üstünde büyüyüp kıvrılarak sönüyor; dizi kesintisiz okunuyor. | - | - |

Vuruş anı: Efekt hedef kuklanın (725,802) çevresinde; hasar #19'da (333 ms) görünüyor. Doğru. Önceki turdaki iki sorun giderilmiş: #1–#2 Y=739 sabit ve #9–#11'de kısa örtüşme iz kademeli sönerken halkaya geçiş sağlıyor. Atanın arkasında kalan izin hedefe kadar uzamaması bu kurgu için sorun oluşturmuyor.
Karar: tamam. Yeni çizim gerekmiyor.

## Tur 3 · Ömer/Claude · düzeltme · 2026-10-29
Ömer: "yine ayağından çıkıyor". İki sebep bulundu:
- Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyor: aynalı izde alev ucu köpeğin ~200 px ÖNÜNE, kuyruk köpeğin altına düşüyordu. Artık aynalıyken origin x = 1 - 0,85; iz köpeğin arkasından akıyor.
- Çizimde alev 1. satırda karenin %66'sında, 2. satırda %44'ünde: iz alçak başlıyor, 4. karede yukarı zıplıyordu. Origin y kare 0'ın ağırlık merkezi, kareler ona sabitlendi (stabilize ref 0).
Kontrolde bak: iz gövde hizasında mı, köpeğin arkasında mı, kareler arasında dikey zıplama var mı.

## Tur 3 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/run_down (2026-10-29)
Genel: Koşu alevi artık Ash Hound'un gövde hizasında ve arkasında akıyor; ilk üç çizim karesi boyunca dikey seviyesi sabit.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #1–#2 · run_down s0 | Alev izi hound'un arkasında, gövde hizasında sabit; merkez (1213,739). | - | - |
| #3–#5 · run_down s1 | İz hound ilerlerken sola akıyor; merkez Y=739 sabit, X=1205→1140. Görselde alev kuyruğu sağda, hound'un arkasında kalıyor. | - | - |
| #6–#8 · run_down s2 | İz aynı yükseklikte sürüyor; merkez X=1083→919, Y=739. Kare geçişinde ayak hizasına düşme veya yukarı sıçrama görünmüyor. | - | - |
| #9–#11 · run_down s3–s4 + scorch_bite s0–s2 | Koşu izi sönerek hedefteki ısırma halkasına devrediyor. | - | - |
| #12–#38 · scorch_bite s3–s23 | Hedef üstünde halka büyüyor, hasar sayısı #19'da çıkıyor ve efekt sönüyor. | - | - |

Konum doğrulaması: `run_down` kareleri #1–#11'de merkez Y=739; X #1–#2'de 1213, ardından 1205→891'e ilerliyor. Sheet'te alev hound'un önüne geçmiyor; hareket yönünün arkasında kalıyor. Önceki turdaki ayak hizası ve dikey zıplama sorunları giderilmiş.
Vuruş anı: #19'da (333 ms) 10 hasar soldaki kuklada beliriyor; hedef ve zamanlama doğru.
Karar: tamam. Tur 3 düzeltmesi beklendiği gibi; yeni çizim gerekmiyor.

## Tur 4 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -25 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 5 · Claude · düzeltme · 2026-10-29
Görünen ölçüm: ısırma (scorch_bite sheet'i) eski dx 45 ile görünen +43 px. İz dx kullanmıyor (yalnız ısırma kayar). run_down.dx 45 → 0 (açıkça 0: scorch_bite'ın kendi dx 45'i run_down'a miras geliyor; scorch_bite kapsam dışı, dokunulmadı). Beklenen görünen ≈ -2 px.
