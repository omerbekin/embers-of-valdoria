# Powder Keg · `powder_keg` (Corsair Captain "Marrow")

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma 12 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Bolt/ground karesinde dayanak dx 0, parlaklık merkezi farkı -3 px; görünen kayma -3 px. Bolt beklenen temas noktası olan kuklanın atana bakan sağ kenarında (x=774); yeni kayma yok, tamam.
