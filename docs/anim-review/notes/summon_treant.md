# Summon Treant · `summon_treant` (Druid)

## Tur 1 · Claude · ekleme · 2026-11-02
Kendi sheet'leri: 05-treant-rise (assets/vfx/druid, kaynak assets/source/druid-vfx, kod src/game/art-v2/druid/vfx.ts, sesler data/audio-v2/druid.json). Çizen Terra 6.1, kontrol eden Sol 6.1 (ayrı süreçler). Ham sheet puanları: 6/10 (hepsi 4 tur; ham çıktıdaki magenta halo ve sis Sol'u düşürdü, içe aktarmadaki `clean` alfa eşiği bunu temizler; geçiş kararı oyun içi Sol'dadır). Ses yalnız ölçümle doğrulandı, Ömer dinlemedi. Eski kodla çizilen efekt yedek olarak duruyor (sheet yüklenmezse).

## Tur 2 · Codex (Sol 6.1) · oyun içi kontrol · 2026-11-02
Karar: 8/10 GECTI (1. oyun içi tur).
Telefon boyutu kontrol edilmedi.

## Tur 3 · Codex · kontrol (fps + konum) · 2026-11-08

- **FPS: SORUN.** #5–#108, fr0–23 başlangıç aralıkları 66,7–83,3 ms (~12–15 fps); 33–50 ms hedefinden yavaş. Her kare 4–5 adım tutuluyor; #13–#17/fr2 beş adım ve takılma ölçütünü aşıyor. Sıra akıyor, siyah/boş ara kare yok.
- **Konum: TAMAM.** Dayanak tüm dizide (1810,863), Treant ayağına fark (0,0) px; açı 0°, flipX kapalı. Kayma veya sıçrama yok.
- **Puan: 6/10.** Oynatma hızını 33–50 ms/kare bandına çekip yeniden ölç.

## Tur 4 · Codex · kontrol (fps + konum + boyut)

- **FPS: TAMAM.** #5–#75, fr0–23 geçişleri ilkinde ~33 ms, diğerlerinde ~50 ms; ~20–30 fps ve hedef bandında. En fazla 3 adım tekrar; takılma, siyah/boş ara kare görünmüyor.
- **Konum: TAMAM.** Tüm karelerde dayanak (1810,863), kayma 0 px; Treant zemin dayanağına hizalı.
- **Boyut: TAMAM.** 196×196 px; önceki W×2,0 = 280 px, yeni W×1,4 = 196 px: 196/280 = 0,70. Çağrı yerinde kalıyor.
- **Puan: 9/10.**

## Tur N · Claude · düzeltme (fps + konum) · 2026-11-08
Ömer: "fps değerleri ve efektlerin durduğu yerler doğru değil, Codex yeterince dikkatli bakmamış". Yakalama aracı düzeltildi (tools/anim-capture.mjs): Phaser TweenManager süreyi Date.now()'dan alır, elle adımlamada tween'ler duvar saatiyle (yükte ~2x hızlı, yağmur sönüşü ve yumruk düşüşü yanlış kısa görünüyordu) koşuyordu; Date.now() adım saatine bağlandı. Önceki Druid yakalamaları (2026-11-02..) tween zamanlarında yanılıyordu. Oyundaki gerçek fps = sheet fps x ara kare / skillSlowdown (1.2); 8 kareli sheet 12-14 fps efektif oynuyordu (takılma): hepsine 3x kodla ara kare (IB, src/game/art-v2/druid/vfx.ts) eklendi, süre aynı.
05-treant-rise 5.5 fps / 1.2 = 4.6 fps (kare başı 217 ms) idi: 3x ara kare + fps 8 -> kare başı ~50 ms (3 adım), 24 kare ~1.5 sn Treant doğuşuyla uyumlu. Konum (1810,863) Treant ayağı, kayma 0. Skill 4 boyut x0.7 (Ömer): S = W*2.0 -> W*1.4 (sheet 280 -> ~196 px). Codex Tur 4: fps/konum/boyut TAMAM 9/10.
