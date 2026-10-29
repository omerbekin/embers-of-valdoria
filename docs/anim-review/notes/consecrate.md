# Consecrate · `consecrate` (Censer Monk)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -11 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: el yapımı sürüm (battle `hand`); `frames.json` VFX sprite 0 kare normal. Yakalama: `captures/consecrate` (2026-10-29)
Genel: altın hücre mührü/parıltısı kuklanın ayak hizasındaki hedef hücrede merkezli.
Vuruş anı: #60–#70'te görünen etki merkezi x≈725, kukla/hücre merkezi x=725; kayma ≈0 px. Aynalama düzeltmesi sonrası yeni kayma yok.
Karar: tamam; düzeltme gerekmiyor.
