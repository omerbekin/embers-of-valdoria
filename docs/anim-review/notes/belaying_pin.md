# Belaying Pin · `belaying_pin` (Dock Rat)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -21 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Düşman tarafı aynalama sonrası: vuruş skill'lerinde dayanak dx 0, görünen fark sırasıyla bone_rite -3 px, cinder_lash -4 px, belaying_pin -4 px, harpoon_line -2 px; hedef merkezinde (bolt'larda tasarım temas kenarında), yeni kayma yok. Tar Blaze zemin bandının dayanağı beklenen hücre merkezi x=725'te; alfa/parlaklık merkezinin -72 px farkı taban bandını temsil etmediğinden yerleşim doğru. Düzeltme gerekmiyor.
