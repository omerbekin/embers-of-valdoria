# Black Cutlass · `black_cutlass` (Corsair Captain "Marrow")

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -32 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 3 · Codex · kontrol · 2026-10-29
Görünen vuruş: melee, x=725 kukla merkezi üzerinde ortalı (parlaklık kayması -2 px sola); yarım gövdeden fazla yeni kayma yok.
Karar önerisi: tamam.
