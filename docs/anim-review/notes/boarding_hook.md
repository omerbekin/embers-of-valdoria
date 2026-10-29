# Boarding Hook · `boarding_hook` (Reaver Chief "Hook")

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -45 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/boarding_hook (2026-10-29)
Genel: Çengel uçuşu ve geri dönüşü kuklanın gövdesine ulaşıyor; çarpma/parlama anı (#13–#23; sheet s10–s21) çekirdeği x=725, y≈707'de, kukla merkeziyle çakışıyor. Sonraki döngülü çekiş evrelerinde (#54–#70; s14–s33) çekirdek hedefin merkezinde kalıyor.

Vuruş anı: parıltı ve hasar soldaki kuklada. Yeni kayma yok.
Karar önerisi: tamam.

## Tur 3 · Codex · kontrol · 2026-10-29
Görünen vuruş: bolt, x=774 hedefin atana bakan kenarı üzerinde ortalı (parlaklık kayması -1 px sola); yarım gövdeden fazla yeni kayma yok.
Karar önerisi: tamam.
