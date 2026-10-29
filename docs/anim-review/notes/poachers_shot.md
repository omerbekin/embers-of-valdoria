# Poacher's Shot · `poachers_shot` (Ravenwood Poacher)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma 18 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/poachers_shot (2026-10-29)
Genel: Bolt'un varış/hasar dizisi (#6–#48; sheet s3–s10) sonrasında çekirdek x=774, y=707'de sabit. Kukla x=725, genişlik 122; atana bakan kenar 725 + 0,4×122 = 774; y=707 gövde merkezi.

Vuruş anı: hasar ve darbe efekti kuklanın sağ kenarında, tasarıma uygun. Yeni kayma yok.
Karar önerisi: tamam.

## Tur 3 · Codex · kontrol · 2026-10-29
Görünen vuruş: bolt, x=774 hedefin atana bakan kenarı üzerinde ortalı (parlaklık kayması -5 px sola); yarım gövdeden fazla yeni kayma yok.
Karar önerisi: tamam.
