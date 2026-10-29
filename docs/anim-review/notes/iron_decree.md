# Iron Decree · `iron_decree` (lord_morvane)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma 20 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: El yapımı sürüm (gerçek savaş); `frames.json` VFX sprite'ı göstermiyor, bu beklenen durum.
Genel: #31'deki turuncu mühür kalkanlı sağ taraftaki birlik çevresinde; bu destek efekti, kuklaya yöneltilmiş vuruş/zemin efekti değil. El yapımı efekt `fx()` aynalamasından etkilenmez.
Hizalama: Destek halkasının merkezi alıcının ayakları altında. Kukla merkezine göre yaklaşık +550 px görünür; ancak farklı, sağ taraftaki dost hedefe ait olduğundan bu bir kayma kusuru değildir. Kukla üzerinde vuruş parlaması görünmüyor.
Karar önerisi: tamam; destek efekti kendi alıcısına hizalı.
