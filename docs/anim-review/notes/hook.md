# Hook · `hook` (Reef Wrecker)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -50 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/hook (2026-10-29)
Genel: Yayılma sırasında (#8–#24; sheet s1–s5) çekirdek x=789→774'a geliyor; vuruş/parlama bölümünde #25–#48 (s6–s24) x=774, y=707 sabit. Kukla merkezi x=725; gövde merkezi y≈707. İlk vuruş başlangıcındaki hareketli çekirdek hedefin sağ kenarına varıyor.

Vuruş anı: hasar ve parlama soldaki kukla üzerinde. Yeni kayma yok.
Karar önerisi: tamam.

## Tur 3 · Codex · kontrol · 2026-10-29
Görünen vuruş: bolt, x=774 hedefin atana bakan kenarı üzerinde ortalı (parlaklık kayması -11 px sola); yarım gövdeden fazla yeni kayma yok.
Karar önerisi: tamam.
