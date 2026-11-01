# Grave Strike · `grave_strike` (risen_skeleton)

## Tur 1 · Claude · ekleme · 2026-11-01
Kendi 8 karelik sheet'i oyuna kuruldu (assets/mob-vfx/risen_skeleton/grave_strike.png; kaynak v2, Ömer onaylı, import-mob-art sığdırmasıyla). Spec: melee, at hit, impact 3, oyunda boy ~235 px; ayar speed 1.35, sub 5 (Map 2 mob satırlarıyla aynı). Eski ödünç artOf kaldırıldı.
Önceki bilinen kusur notları: Sweep kare 5-6'da hafif sıcak tını; Strike kare 1, 5, 6 kenarın 3. pikseline yakındı; Sweep kare 3-4 hücre kenarına yakındı (import sonrası yeniden denetlenecek).

## Tur 2 · Codex · kontrol · 2026-11-01
Sürüm: Real battle   Yakalama: captures/grave_strike (2026-11-01)
Genel: Efekt ve hedef yönü doğru; büyük vuruş parlaması ayrıntıyı örtüyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5–#10 · s1–s2 | Kesik hedef üzerinde gelişiyor | HIZA/YON yok; siyah kare yok | Konumu koru |
| #11–#15 · s3–s4 | Toprak darbesi büyüyor | 150 px ADD daire ayrıntıyı kapatıyor | flash: false; yeniden yakala |
| #21–#34 · s5–s8 | Parçacıklar dağılıp sönüyor | Belirgin ZIPLAMA veya KESIK yok | Kareleri koru |

Konum ve yön: Hedef ve efekt merkezi x=725; flipX: true doğru. Atan 93×190, kukla 122×190 px; boyları uyumlu, spriteScale 1.0 korunsun.
Hız: #5 150 ms → #33 617 ms; sub 5 ve speed 1.35 uygun. #15–#18 k16 vuruş duraklamasıdır. Kaynak kenarlarında belirgin kırpılma yok.
Vuruş anı: impact 3 kaynak s4; #15'te yoğun darbe, #16'da hasar. Zamanlama uygun.
Parlama: #15–#22'de ADD daire ve beyaz siluet ayrıntıyı fazla örtüyor; flash: false sonrası siluet de kontrol edilmeli.
Karar önerisi: duzelt — flash: false; impact 3, speed 1.35, sub 5, konum ve yön korunsun.

## Tur 3 · Codex · kontrol · 2026-11-01
Sürüm: Real battle   Yakalama: captures/grave_strike (2026-11-01, yeni yakalama) ve verilen gerçek savaş kontak sayfası.
Genel: Yuvarlak ADD parlaması kalkmış; çapraz kesik ve toprak saçılması vuruşu güçlü tutuyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5–#10 · s1–s2 | Çapraz kesik açılıyor | Sorun yok | - |
| #11–#18 · s3–s4 | Toprak darbesi yoğunlaşıyor; #16'da hasar ve beyaz siluet başlıyor | Ortak siluet hedefi örtüyor ama efekt okunuyor | - |
| #19–#33 · s4–s8 | Toprak ve parçacıklar dağılıp sönüyor | Siyah veya boş kare, belirgin sıçrama yok | - |

Vuruş anı: #15'te (317 ms, k16/s4) darbe yoğun; #16'da (333 ms) hasar çıkıyor. Zamanlama uygun, impact 3 korunsun. Ortak beyaz hedef silueti #16–#22'de hedefi örtse de efekti gereksiz boğmuyor.
Akış: #5–#33 arası hareket ve sönüş tutarlı; #15–#18 vuruş duraklaması korunmuş. Siyah kare yok; speed 1.35 ve sub 5 uygun.
Zemin ve boy: Gerçek savaş kontak sayfasında Grave Field ve Black Cathedral'in grave-field zeminiyle Burnt Hamlet'in ashen-plain zemininde gösterilen kareler okunuyor. Risen Skeleton diğer birimlerle boyca uyumlu, spriteScale eklemek gerekmiyor.
Karar önerisi: tamam — yuvarlak parlama giderilmiş, darbe ve akış korunmuş.
