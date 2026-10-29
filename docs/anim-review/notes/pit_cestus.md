# Iron Cestus · `pit_cestus` (Pit Champion "Gorr")

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -17 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/pit_cestus (2026-10-29)
Genel: Yakın dövüş vuruşu kukla merkezinde; yeni kayma yok.

Vuruş anı: Dayanak dx 0, parlaklık merkezi farkı -3 px, görünen kayma -3 px; kukla merkezi x=725. Düzeltme gerekmiyor; tamam.
