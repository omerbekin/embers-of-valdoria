# Murder of Crows · `murder_of_crows` (Raven Seer)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -18 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: El yapımı sürüm (gerçek savaş); `frames.json` VFX sprite'ı göstermiyor, bu beklenen durum.
Genel: Saldırı kukla/hücre tarafında sonuçlanıyor; #31'de hasar bildirimi kuklanın (~604 ekran px; oyun x=725) üstünde. Sağdaki mor durum halkası saldırı vuruşu değil.
Vuruş anı: Görünen saldırı/vuruş merkezi kukla merkeziyle örtüşüyor; tahmini kayma ~0 px. `fx()` aynalaması el yapımı etkiye uygulanmaz.
Karar önerisi: tamam; yeni hizalama düzeltmesi gerekmiyor.
