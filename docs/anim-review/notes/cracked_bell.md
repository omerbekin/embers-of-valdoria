# Cracked Bell · `cracked_bell` (Vesper)

## Tur 1 · Claude · ekleme · 2026-11-02
Kendi sheet'i oyuna kuruldu: 04-cracked-bell (kaynak assets/source/vesper-vfx, kod src/game/art-v2/vesper/vfx.ts, sesler crackedBellFall, crackedBellHit). Çizen Terra 6.1, kontrol eden Sol 6.1 (ayrı süreçler): sheet puanı 6/10 (4 tur, KALDI; en iyi tur 4). Çizimde 5. karede çan %20 büyüyordu: import'ta kare ölçeği 0,83. İkon ödünç kalır. Ses yalnız ölçümle doğrulandı, Ömer dinlemedi.
Yakalama: captures/cracked_bell (test modu).
Ne olur: asa kalkar, çatlak çan hedefin başına iner (ağız başın üstünde, gövde okunur), 4. karede hasar + altın parlama + çatlaktan ışık, çan ikiye ayrılır.
Durum: bkz. board.md (Sol oyun içi kararı 2026-11-02).

## Tur 2 · Codex (Sol 6.1) · kontrol · 2026-11-02
Terra sheet'i 2 tur daha çizdi (tur 5: 6/10, tur 6: 5/10; tur 5 kullanıldı, ölçek düzeltmesi kaldırıldı). anim-capture önceki atışın kuyruğunu temizlemek için oyun saatini 4 sn ilerletiyor (ilk 16 karelik "ters sıra" artefaktı giderildi).
Oyun içi karar: 7/10 KALDI (iki kontrol). Kalan: asa hazırlığı ilk hasardan sonra belirginleşiyor (asa ucu ışığı + bekleme 130 -> 300 ms uzatıldı, Sol hâlâ geç buldu); çan yarılması iki ayrı bütün çan gibi (çizimde yarıların kırık iç kenarı eksik); #17-26 çan eni büyüyor.
Öneri: sheet'i "iki yarı, kırık iç kenar, gövde ayrılıyor" tarifiyle bir kez daha çizdirmek (coordinator izni gerek: 2 tur sınırı doldu).

## Tur 3 · Codex (Sol 6.1) · kontrol · 2026-11-02
Terra 2 tur daha çizdi (tur 7: 6/10, tur 8: 5/10 sheet puanı; tur 7 kullanıldı): iki ayrı yarım çan, kırık iç kenar, çan eni sabit. Kod: asa ucunda büyüyen halka (SH_RING) + ışık, çan bundan 420 ms sonra düşer (vfx.ts cracked_bell).
Oyun içi karar: 8/10 GECTI. Yön doğru, siyah çerçeve yok, hedef okunuyor, vuruş ve hasar #24'te birlikte, en sıçraması yok.
Kalan küçük kusurlar: #24→29 çan temas noktasından ~20-25 px yukarı çekiliyor; #34-38 yarıların alt ağızları hâlâ fazla bütün (çift çan çağrışımı tam kaybolmadı); #1 hazırlık halkası asa ucuna göre biraz iri.
