# Root Smash · `root_smash` (Druid)

## Tur 1 · Claude · ekleme · 2026-11-02
Kendi sheet'leri: 06-root-fist (assets/vfx/druid, kaynak assets/source/druid-vfx, kod src/game/art-v2/druid/vfx.ts, sesler data/audio-v2/druid.json). Çizen Terra 6.1, kontrol eden Sol 6.1 (ayrı süreçler). Ham sheet puanları: 7/10 (hepsi 4 tur; ham çıktıdaki magenta halo ve sis Sol'u düşürdü, içe aktarmadaki `clean` alfa eşiği bunu temizler; geçiş kararı oyun içi Sol'dadır). Ses yalnız ölçümle doğrulandı, Ömer dinlemedi. Eski kodla çizilen efekt yedek olarak duruyor (sheet yüklenmezse).

## Tur 2 · Codex (Sol 6.1) · oyun içi kontrol · 2026-11-02
Tur 1: 7/10 KALDI. Düzeltme: yumruk büyütüldü, 150 px ek düşüş tween'i. Tur 2: 8/10 GECTI.
Küçük: yumruk boğumları belirgin değil, siluet sıkı kök demeti gibi.

## Tur 3 · Codex · kontrol (fps + konum) · 2026-11-08

- **FPS: TAMAM.** #5–#56, fr0–23 başlangıç aralıkları 33–50 ms (~24–30 fps); aynı kare en çok 3 adım (#15–#17/fr5). Sıra akıyor, siyah/boş ara kare yok.
- **Konum: TAMAM.** Düşüşte x=725 sabit, y=650→800: #5 (725,650), #15 (725,689), #22 (725,776), #29 (725,800). Hedef ayağına ulaşıp orada kalıyor; 150 px düşüş hareketi sıçrama değil. flipX açık ve sabit, yatay kayma yok.
- **Puan: 9/10.** Ölçülen fps ve düşüş dayanağı uygun.

## Tur N · Claude · düzeltme (fps + konum) · 2026-11-08
Ömer: "fps değerleri ve efektlerin durduğu yerler doğru değil, Codex yeterince dikkatli bakmamış". Yakalama aracı düzeltildi (tools/anim-capture.mjs): Phaser TweenManager süreyi Date.now()'dan alır, elle adımlamada tween'ler duvar saatiyle (yükte ~2x hızlı, yağmur sönüşü ve yumruk düşüşü yanlış kısa görünüyordu) koşuyordu; Date.now() adım saatine bağlandı. Önceki Druid yakalamaları (2026-11-02..) tween zamanlarında yanılıyordu. Oyundaki gerçek fps = sheet fps x ara kare / skillSlowdown (1.2); 8 kareli sheet 12-14 fps efektif oynuyordu (takılma): hepsine 3x kodla ara kare (IB, src/game/art-v2/druid/vfx.ts) eklendi, süre aynı.
Yumruk sheet'i 3x ara kare (24 kare, 33-50 ms). Düşüş 150 px, 333 ms = sheet'in değme karesi (orijinal kare 3, t~700 ms): yumruk (725,800) hedef ayağında oturuyor, kayma 0, flipX origin 0.5 simetrik. Codex Tur 3: 9/10 fps+konum TAMAM.
