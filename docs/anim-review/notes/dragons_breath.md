# Dragon's Breath · `dragons_breath` (Drake Priest)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma 20 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/dragons_breath (2026-10-29)
Genel: Zemin bandının dayanağı beklenen oyuncu hücrelerinde; vuruş evresinde kayma yok.

Vuruş/zemin anı: Dayanak dx 0, parlaklık merkezi farkı +3 px, görünen kayma +3 px. Hücre merkezleri x=725, 599, 480; efekt doğru hücrelerde. Düzeltme gerekmiyor; tamam.
