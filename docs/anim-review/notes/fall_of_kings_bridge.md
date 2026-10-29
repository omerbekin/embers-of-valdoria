# Fall of King's Bridge · `fall_of_kings_bridge` (bridge_warden)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma 21 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: El yapımı sürüm (gerçek savaş); `frames.json` VFX sprite'ı göstermiyor, bu beklenen durum.
Genel: Alevli hücre dizisi oyuncu tarafına uzanıyor; son vuruş bölgesi kuklanın hücresini kapsıyor. `fx()` aynalaması bu el yapımı etkiye uygulanmaz.
Vuruş/zemin anı: #31'de alevli hücre alanının sağ ucu kukla merkezine (~604 ekran px; oyun x=725) denk geliyor. Görünen merkez kayması yaklaşık 0 px; yarım gövdeyi aşan kayma yok.
Karar önerisi: tamam; düzeltme gerekmiyor.
