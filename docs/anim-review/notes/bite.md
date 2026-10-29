# Bite · `bite` (Grey Wolf)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -36 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Claude · düzeltme · 2026-10-29
Görünen ölçüm (dayanak farkı + parlaklık merkezi): eski dx 75 aynalama düzeltmesinden sonra fazla kaldı, görünen +71 px (kuklanın sağına). data/battle-layout.json > animation.mobVfx.skills.bite.dx 75 → 0. Beklenen görünen ≈ -4 px.
