# Lantern Flash · `lantern_flash` (Reef Wrecker)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma 14 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sheet'te hücre etkisi doğru hücre bandında; dayanak dx 0, parlaklık merkezi farkı -4 px. Görünen kayma -4 px, yeni kayma yok; düzeltme gerekmiyor.
