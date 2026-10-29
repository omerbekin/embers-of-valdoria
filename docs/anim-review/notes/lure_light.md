# Lure Light · `lure_light` (Hedge Witch Morwen)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -24 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Verilen vuruştan ~180 ms sonraki karede dayanak dx 0, parlaklık merkezi farkı 0 px; görünen kayma 0 px. Bolt hedefin atana bakan sağ kenarında (x=774); yeni kayma yok; tamam.
