# Rend · `rend` (Grey Wolf)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -28 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: El yapımı sürüm · Yakalama: `captures/rend` (2026-10-29)
Genel: VFX sprite'ı 0 kare; ayrı çizik izi belirgin değil, hasar göstergesi kukla merkezinde.
Vuruş anı: #40–#60 hasar göstergesinin merkezi kukla merkeziyle çakışıyor; görünen kayma ~0 px. Düzeltme gerekmiyor.
Karar önerisi: tamam.
