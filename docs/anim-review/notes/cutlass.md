# Cutlass · `cutlass` (Corsair Cutlass)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -46 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/cutlass (2026-10-29)
Genel: Kesme/vuruş/parlama akışı (#1–#43; sheet s3–s24) x=725, y=707 merkezinde; kukla gövde merkezi x=725, y≈707. Sonraki sönüş temiz.

Vuruş anı: hasar ve parlama soldaki kuklanın üstünde. Yeni kayma yok.
Karar önerisi: tamam.

## Tur 3 · Codex · kontrol · 2026-10-29
Görünen vuruş: melee, x=725 kukla merkezi üzerinde ortalı (parlaklık kayması -3 px sola); yarım gövdeden fazla yeni kayma yok.
Karar önerisi: tamam.
