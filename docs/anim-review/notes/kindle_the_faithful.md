# Kindle the Faithful · `kindle_the_faithful` (Drake Priest)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma 18 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: El yapımı sürüm (gerçek savaş); `frames.json` VFX sprite'ı göstermiyor, bu beklenen durum.
Genel: #31'deki altın halka sağ taraftaki iki dost birliğin çevresinde, +4 iyileşme de orada; bu destek alanı kuklaya atılan vuruş/zemin efekti değil. El yapımı efekt `fx()` aynalamasından etkilenmez.
Hizalama: Halka dost birliklerin ayakları altında ortalı. Kukla merkezine göre yaklaşık +550 px görünür; bu kasıtlı dost hedefi yerleşimi olduğundan kayma kusuru değil. Kukla üzerinde vuruş parlaması yok.
Karar önerisi: tamam; destek alanı alıcılarına hizalı.
