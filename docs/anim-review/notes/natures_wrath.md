# Nature's Wrath · `natures_wrath` (Druid)

## Tur 1 · Claude · ekleme · 2026-11-02
Kendi sheet'leri: 03-wrath-surge (assets/vfx/druid, kaynak assets/source/druid-vfx, kod src/game/art-v2/druid/vfx.ts, sesler data/audio-v2/druid.json). Çizen Terra 6.1, kontrol eden Sol 6.1 (ayrı süreçler). Ham sheet puanları: 6/10 (hepsi 4 tur; ham çıktıdaki magenta halo ve sis Sol'u düşürdü, içe aktarmadaki `clean` alfa eşiği bunu temizler; geçiş kararı oyun içi Sol'dadır). Ses yalnız ölçümle doğrulandı, Ömer dinlemedi. Eski kodla çizilen efekt yedek olarak duruyor (sheet yüklenmezse).

## Tur 2 · Codex (Sol 6.1) · oyun içi kontrol · 2026-11-02
Karar: 8/10 GECTI (2. tur). Not: ilk karelerde yoğun kökler hedeflerin havalanmasını gölgeliyor; 4-6. karelerde suyun sönüşü soluk, çapraz şeritler gibi.
Küçük kusur olarak kaldı.

## Tur 3 · Codex · kontrol (fps + konum) · 2026-11-08

- **FPS: TAMAM.** Her hücrede #5–#61, fr0–23 başlangıç aralıkları 33–50 ms (~24–30 fps); aynı kare en çok 3 adım (#9–#11/fr2). Üç sprite eşzamanlı; ölçüm dosyasındaki 0 ms değerleri ayrı hücrelerin aynı anda kaydıdır, kare süresi değildir. Akış var, siyah/boş ara kare yok.
- **Konum: TAMAM.** Dayanaklar her karede (784,757), (725,814), (665,871); istenen merkezlere fark (0,0) px. Açı 0°, flipX kapalı; kayma veya sıçrama yok.
- **Puan: 9/10.** Ölçülen fps ve üç hücre konumu uygun.

## Tur 4 · Codex · kontrol (fps + konum + boyut)

- **FPS: TAMAM.** #5–#61, fr0–23 geçişleri ~33–50 ms (~20–30 fps); en fazla 3 adım tekrar. Takılma, siyah/boş ara kare görünmüyor.
- **Konum: TAMAM.** Her karede üç dayanak (784,757), (725,814), (665,871); her birinde kayma 0 px ve hücre yerleşimi korunuyor.
- **Boyut: TAMAM.** Sheet 214×214 px; hesaplanan eski boyut ~306 px, 214/306 ≈ 0,70. Üç hücre dayanağı ve alan yerleşimi korunuyor.
- **Puan: 9/10.**

## Tur N · Claude · düzeltme (fps + konum) · 2026-11-08
Ömer: "fps değerleri ve efektlerin durduğu yerler doğru değil, Codex yeterince dikkatli bakmamış". Yakalama aracı düzeltildi (tools/anim-capture.mjs): Phaser TweenManager süreyi Date.now()'dan alır, elle adımlamada tween'ler duvar saatiyle (yükte ~2x hızlı, yağmur sönüşü ve yumruk düşüşü yanlış kısa görünüyordu) koşuyordu; Date.now() adım saatine bağlandı. Önceki Druid yakalamaları (2026-11-02..) tween zamanlarında yanılıyordu. Oyundaki gerçek fps = sheet fps x ara kare / skillSlowdown (1.2); 8 kareli sheet 12-14 fps efektif oynuyordu (takılma): hepsine 3x kodla ara kare (IB, src/game/art-v2/druid/vfx.ts) eklendi, süre aynı.
3 hücre sheet'i (784,757)(725,814)(665,871) kayma 0; kare ~33-50 ms. Skill 2 boyut x0.7 (Ömer): S = max(240, hücre genişliği*1.25) x 0.7 (sheet 305 px -> ~214 px). Kök sırtı yolu ve hücre merkezi aynı. Codex Tur 4 fps/konum/boyut TAMAM 9/10.
