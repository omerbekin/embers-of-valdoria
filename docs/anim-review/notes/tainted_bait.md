# Tainted Bait · `tainted_bait` (Ravenwood Poacher)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma 31 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: El yapımı sürüm · Yakalama: `captures/tainted_bait` (2026-10-29)
Genel: VFX sprite'ı 0 kare; yeşil zemin çemberi hedef hücresine oturuyor.
Vuruş anı: #40'ta çemberin merkezi kukla/hücre merkeziyle çakışıyor; görünen kayma ~0 px. Düzeltme gerekmiyor.
Karar önerisi: tamam.
