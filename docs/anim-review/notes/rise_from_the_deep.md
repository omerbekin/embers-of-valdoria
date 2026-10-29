# Rise from the Deep · `rise_from_the_deep` (Tide Caller)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -11 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Asıl sheet'te zemin efekti Tide Caller'ın altı/önünde; dayanak dx 0, parlaklık merkezi farkı +3 px. Görünen +3 px kayma yeni hizalama sorunu değil; düzeltme gerekmiyor, tamam.
