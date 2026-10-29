# Wrecker's Gaff · `wreckers_gaff` (The Wrecker-Captain)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -20 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/wreckers_gaff (2026-10-29)
Genel: Kanca yayı ve çarpma/parlama dizisi (#5–#25; sheet s1–s29) çekirdeği x=725, y=707'de; kukla gövde merkezi x=725, y≈707. Geniş patlama hedefte merkezli, sönüşte sıçrama yok.

Vuruş anı: hasar ve parlama soldaki kukla üzerinde. Yeni kayma yok.
Karar önerisi: tamam.

## Tur 3 · Codex · kontrol · 2026-10-29
Görünen vuruş: melee, x=725 kukla merkezi üzerinde ortalı (parlaklık kayması -1 px sola); yarım gövdeden fazla yeni kayma yok.
Karar önerisi: tamam.
