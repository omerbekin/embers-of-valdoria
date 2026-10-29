# Heat Mirage · passive_heat_mirage (Mage pasifi)

## Tur 1 · Claude · ekleme · 2026-10-29
Yeni çizim yok (kodla): pasif tetiklenince ('passive' olayı, EVENT_FX passive_heat_mirage) Mage'in iki ADD sıcak tonlu hayalet kopyası 560 ms dalgalanıp yükselir, göğüste kısa sıcak parlama, 4 ılık duman çizgisi. Test panelinde "Heat Mirage" (Grey Wolf ısırır, kukla Mage). Tur arası bir kez kuralı için test atışında mirageUsed sıfırlanır (BattleScene.vfxTestCast).
Yakalama: captures/heat_mirage. Kontrolde bak: #30–#56 Mage üstünde ısı titreşimi, birim kaymıyor, ani kesilme yok.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/heat_mirage
Genel: Pasif tetiklendikten sonra Mage'in çevresindeki sıcak tonlu ardıl görüntü ve göğüs parlaması okunuyor; hedef vurulurken karakterin dayanağı sabit.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #30 | Vuruş/parlama evresinde hedefte genel beyaz hasar silueti; Heat Mirage yazısı tetik bilgisini gösteriyor. | - | - |
| #42 | Mage üzerinde sıcak renkli ardıl görüntü ve parıltı var; gövde/ayak konumu sabit. | - | - |
| #56 | Ardıl görüntü sönmüş, Mage normal görünümüne dönüyor; ani konum sıçraması yok. | - | - |

Vuruş anı: Pasif, aldığı hasarın hemen ardından görünüyor; animasyon süresince birim kaymıyor.
Karar: tamam; yeni düzeltme gerekmiyor.
