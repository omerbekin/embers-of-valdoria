# Hold the Gate · `hold_the_gate` (Cinder Gatewarden)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma 23 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sheet'te alev duvarı mob onune, oyuncu tarafına uzanıyor; self/ground için baseX'ten 110 px sola dayanak bilinçli. Parlaklık merkezi farkı +2 px; görünen kayma -108 px, yarım gövdeyi aşsa da beklenen ön yerleşimle uyumlu; düzeltme gerekmiyor, tamam.
