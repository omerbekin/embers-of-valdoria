# Chain Hook · `chain_hook` (bridge_warden)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -55 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/chain_hook (2026-10-29)
Genel: Vuruş evresinde (#10–#44; sheet s3–s23) efekt merkezi x=774; kukla merkezi x=725. ~49 px sağa kaymış; ayna düzeltmesinden sonra kayma yönü tersine dönmüş. Öneri: dx -49 px.

Vuruş anı: hasar/parlama soldaki kuklada; konum frames.json birim koordinatlarıyla kontrol edildi.
Karar önerisi: düzeltilebilir; dx -49 px.

## Tur 3 · Claude · düzeltme · 2026-10-29
Değişiklik yok, ölçüm açıklaması: chain_hook 'bolt' + 'hit' skill'i; tasarım gereği vuruş hedefin gövde merkezinde DEĞİL, atana bakan kenarında (ilk temas, data/battle-layout.json > animation.contactEdgeRatio 0.4): 725 + 0,4 × 122 = 774. frames.json'daki x=774 tam bu temas noktası, kayma değil. dx -49 verilirse çarpma kuklanın ortasına girer. Kontrolde bak: çarpma patlaması kuklanın sağ (atana bakan) kenarına oturuyor mu; oturuyorsa tamam.

## Tur 4 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/chain_hook (2026-10-29)
Genel: Vuruş dizisi (#10–#44; sheet s3–s23) çekirdeği x=774, y=707'de sabit; kukla gövde merkezi x=725, y≈707. Bolt teması atana bakan kenarda ve doğru.

Vuruş anı: #10'dan itibaren temas/hasar parlaması kuklanın sağ kenarında; hasar soldaki kuklada doğru. Kayma yok.
Karar önerisi: tamam.

## Tur 5 · Codex · kontrol · 2026-10-29
Görüntü: verilen vuruştan ~180 ms sonraki kare; hedef merkez x=725 (bolt tasarım teması x=774).
Genel: bolt temas çekirdeği hedefin atana bakan kenarında, x=774; beklenen x=774. Parlaklık merkezi yalnız ~11 px sola; yarım gövdeyi aşan kayma yok.
Karar önerisi: tamam; ek kaydırma gerekmiyor.

