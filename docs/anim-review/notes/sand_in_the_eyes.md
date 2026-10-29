# Sand in the Eyes · `sand_in_the_eyes` (Cutpurse)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -30 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: El yapımı sürüm · Yakalama: `captures/sand_in_the_eyes` (2026-10-29)
Genel: VFX sprite'ı 0 kare; kum parıltısı kukla üstünde.
Vuruş anı: #40'ta parıltı ve hasar işareti kukla merkezine denk geliyor; görünen kayma ~0 px. Düzeltme gerekmiyor.
Karar önerisi: tamam.
