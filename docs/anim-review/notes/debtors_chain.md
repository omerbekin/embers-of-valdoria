# Debtor's Chain · `debtors_chain` (Guild Enforcer "Bastion")

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -26 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Verilen vuruştan ~180 ms sonraki karede dayanak dx 0, parlaklık merkezi farkı -4 px; görünen kayma -4 px. Vuruş kukla merkezinde, yeni kayma yok; tamam.
