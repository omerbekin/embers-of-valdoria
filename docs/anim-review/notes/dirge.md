# Dirge · `dirge` (Grave Chanter)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -18 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/dirge (2026-10-29)
Genel: Bolt vuruşu beklenen hedef kenarında ortalı; yeni kayma yok.

Vuruş anı: Dayanak dx 0, parlaklık merkezi farkı -3 px, görünen kayma -3 px; hedef noktası x=774. Düzeltme gerekmiyor; tamam.
