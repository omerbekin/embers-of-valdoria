# Chief's Cleaver · `chiefs_cleaver` (Bandit Chief)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma 21 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/chiefs_cleaver (2026-10-29)
Genel: Vuruş/parlama evresinde (#19–#31; sheet s15–s24) efekt merkezi x=725, kukla merkezi x=725. Kayma yok; zemin darbesi oyuncu hücresinde.

Vuruş anı: hasar/parlama soldaki kuklada; konum frames.json birim koordinatlarıyla kontrol edildi.
Karar önerisi: tamam; ek düzeltme gerekmiyor.

## Tur 3 · Codex · kontrol · 2026-10-29
Görüntü: verilen vuruştan ~180 ms sonraki kare; hedef merkez x=725.
Genel: Görünen vuruş merkezi hedef kukla merkezinde; parlaklık farkı ~3 px sola. Yeni kayma yok.
Karar önerisi: tamam; ek kaydırma gerekmiyor.

