# Ley Thread · status_ley_thread / statususe_ley_thread (AM)

## Tur 1 · Claude · ekleme · 2026-10-29
Yeni çizim yok (kodla, antimage/vfx.ts leyLine): durum bağlanınca AM elinden hedef göğsüne ince, dalgalı mor ley çizgisi (çiz 180 / tut 220 / sön 280 ms) + düğüm; durum tüketilince gergin parlak çizgi + düğüm patlaması. Test panelinde "Ley Thread" ve "Ley Thread (brand)" (önce Mana Burn, sonra Drain Field tüketir).
Yakalama: captures/ley_thread, captures/ley_thread_brand. Kontrolde bak: brand #38–#56 çizgi el->göğüs, #110–#124 gergin çizgi.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/ley_thread_brand + captures/ley_thread
Genel: Ley Brand'de hedefe bağlanan ince mor çizgi belirgin; durum tüketiminde çizgi geriliyor ve hedef çevresindeki düğüm patlıyor. Mana Steal/Drain Field yakalamaları aynı yön ve bağlantıyı doğruluyor.

| Kare (#yakalama) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| brand #38–#56 | Anti-Mage'in elinden hedefin göğsüne uzanan ince mor çizgi ve hedefte düğüm; sonraki karelerde çizgi gerilerek çözülüyor. | - | - |
| brand #110–#124 | Tüketim anında çizgi hedefe bağlı kalıyor, mor düğüm hedef üzerinde açılıyor ve sönüyor. | - | - |
| ley_thread #20–#41 | Mana Steal akışında bağlantı sağdaki atandan soldaki hedefe uzanıyor; mavi mana parçacıkları ve mor çizgi üst üste okunaklı. | - | - |

Vuruş anı: Tüketim/MP kaybı anında bağ hedefe ulaşıyor; efekt yanlış tarafa yönelmiyor.
Karar: tamam; yeni düzeltme gerekmiyor.
