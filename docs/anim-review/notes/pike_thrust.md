# Pike Thrust · `pike_thrust` (Morvane Halberdier)

## Tur 1 · Claude · düzeltme · 2026-10-29
Düşman tarafı aynalama hatası düzeltildi (src/game/mob-vfx.ts `fx()`): Phaser flipX dokuyu karenin içinde aynalıyor, origin'i aynalamıyordu; vuruş içeriği hedeften (1 - 2·ox)·boy px kayıyordu. Bu skill'de eski kayma -21 px (eksi = sola / hedefin ötesine). Kontrolde bak: vuruş / zemin efekti hedefin (ya da hücrenin) üstünde ortalı mı, yeni kayma var mı.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/pike_thrust (2026-10-29)
Genel: Vuruş/parlama evresinde (#19–#27; sheet s9–s12) efekt merkezi x=745, kukla merkezi x=725. ~20 px sağa kaymış. Öneri: dx -20 px.

Vuruş anı: hasar/parlama soldaki kuklada; konum frames.json birim koordinatlarıyla kontrol edildi.
Karar önerisi: düzeltilebilir; dx -20 px.

## Tur 3 · Claude · düzeltme · 2026-10-29
Eski dx 20 (aynalama kaymasını, -21 px, telafi ediyordu) kaldırıldı: data/battle-layout.json > animation.mobVfx.skills.pike_thrust artık { size 0.77, standOff 30 }. Beklenen: vuruş merkezi x≈725 (kukla merkezi).

## Tur 4 · Codex · kontrol · 2026-10-29
Görüntü: verilen vuruştan ~180 ms sonraki kare; hedef merkez x=725.
Genel: Önceki +20 px ölçümü tekrarlanmıyor: görünen vuruş kukla merkezinde, parlaklık farkı ~1 px sağa. Yeni kayma yok.
Karar önerisi: tamam; ek kaydırma gerekmiyor.

