# Thorn Whip · `thorn_whip` (Druid)

## Tur 1 · Claude · ekleme · 2026-11-02
Kendi sheet'leri: 04-thorn-whip (assets/vfx/druid, kaynak assets/source/druid-vfx, kod src/game/art-v2/druid/vfx.ts, sesler data/audio-v2/druid.json). Çizen Terra 6.1, kontrol eden Sol 6.1 (ayrı süreçler). Ham sheet puanları: 6/10 (hepsi 4 tur; ham çıktıdaki magenta halo ve sis Sol'u düşürdü, içe aktarmadaki `clean` alfa eşiği bunu temizler; geçiş kararı oyun içi Sol'dadır). Ses yalnız ölçümle doğrulandı, Ömer dinlemedi. Eski kodla çizilen efekt yedek olarak duruyor (sheet yüklenmezse).

## Tur 2 · Codex (Sol 6.1) · oyun içi kontrol · 2026-11-02
Tur 1: 7/10 KALDI. Düzeltme: sarmaşık asa ucuna bağlanıp hedefe döndürülüp ölçeklendi, dönüş 170 ms erkene alındı. Tur 2: 8/10 GECTI.
Küçük: darbeden hasar sayısına gecikme hissi, parlama hedefi birkaç kare fazla örtüyor.

## Tur 3 · Codex · kontrol (fps + konum) · 2026-11-08

- **FPS: SORUN.** #5–#45, fr0–23 başlangıç aralıkları 16,7–33,3 ms, ortalama ~29 ms (~35 fps); 33–50 ms hedefinden hızlı. #10/fr3 tek adım; en uzun tekrar 2 adım. Sıra akıyor, siyah/boş ara kare yok.
- **Konum: SORUN / doğrulanamadı.** Sprite dayanağı (725,707), hedef değme noktasıyla aynı; açı 27°, flipX açık ve sabit. Merkez kuyruk ucu değildir: kırpımda atan ve asa ucu (~958) görünmediğinden kuyruk bağlantısı ve flipX origin doğrulanamıyor. Tam ekran karede iki uç ölçülsün; merkezde sıçrama yok.
- **Puan: 6/10.** Zamanlama ve asa ucu bağlantısı yeniden kontrol edilmeli.

## Tur 4 · Codex · kontrol (fps + konum + boyut)

- **FPS: SORUN.** #5–#45, fr0–23 geçişleri 16,7–33,3 ms, ortalama ~28,3 ms (~35 fps); hedef 33–50 ms. En fazla iki adım tutuluyor; takılma, siyah/boş ara kare görünmüyor.
- **Konum: SORUN.** Tüm karelerde dayanak (725,707), kayma 0 px; hedefe temas var. Geometrik kuyruk asa ucu (~958,676) için hesaplanmış, ancak wide görüntüsünde görünen sarmaşık ucu ile asa arasında yaklaşık 10–15 oyun px boşluk var; görsel bağlantı tam değil.
- **Boyut: SORUN.** 290×203 px ve en/boy 0,70; ancak erişimi koruyan ölçek de değiştiği için eskiye göre yalnız kalınlık 0,70 değil, hesapla ~0,765; uzunluk ~1,093. Ulaşım hedefe korunuyor, istenen %30 incelme tam değil.
- **Puan: 6/10.**

## Tur N · Claude · düzeltme (fps + konum) · 2026-11-08
Ömer: "fps değerleri ve efektlerin durduğu yerler doğru değil, Codex yeterince dikkatli bakmamış". Yakalama aracı düzeltildi (tools/anim-capture.mjs): Phaser TweenManager süreyi Date.now()'dan alır, elle adımlamada tween'ler duvar saatiyle (yükte ~2x hızlı, yağmur sönüşü ve yumruk düşüşü yanlış kısa görünüyordu) koşuyordu; Date.now() adım saatine bağlandı. Önceki Druid yakalamaları (2026-11-02..) tween zamanlarında yanılıyordu. Oyundaki gerçek fps = sheet fps x ara kare / skillSlowdown (1.2); 8 kareli sheet 12-14 fps efektif oynuyordu (takılma): hepsine 3x kodla ara kare (IB, src/game/art-v2/druid/vfx.ts) eklendi, süre aynı.
Kare süresi 33-50 ms (~30-35 fps, önce 83 ms = 12 fps). Konum: kuyruk thrust asa ucunda (958,676), değme hedefte (725,707), kayma 0. Skill 1 boyut x0.7 (Ömer): kamçı yalnız İNCELDİ (thick 0.62, boy sabit çünkü uzunluk asa ucu-hedef arası; ölçek 1.09x telafisiyle kalınlık ~0.7), sprite 265x265 -> 290x203. Codex Tur 4: görünen uç asa ucundan 10-15 px kısa -> reachPad 12 px eklendi, kalınlık 0.765 ölçüldü -> thick 0.7'den 0.62'ye.

## Tur 5 · Codex · kontrol · 2026-11-08

Sürüm: Real battle · Yakalama: `captures/thorn_whip/wide.png` ve `captures/_druid-measurements.txt` son Thorn Whip bölümü.

- **FPS: uygun.** fr0–23 geçişleri yaklaşık 16,7–33,3 ms, ortalama ~28 ms (~35 fps); 33–50 ms veya daha hızlı hedefini karşılıyor. Tur 3–4'te hızın sorun sayılması hatalıydı.
- **Konum: uygun.** Wide görüntüsünde sarmaşığın sağdaki kuyruğu asa ucuna bağlanıyor; solda kuklaya ulaşıyor ve vuruş parlaması kuklanın üzerinde. Ölçümde dayanak (725,707), açı 16° ve flipX sabit; ölçülen dayanak kayması 0 px. Görüntüde belirgin kopma veya kayma yok.
- **Boyut: hedefe yakın.** Yeni ~311×193 px; eski 265×265 px. Kalınlık oranı 193/265 ≈ 0,728 (%72,8); eşdeğer ölçek hesabı 0,62 × 0,82 / 0,697 ≈ 0,729. Hedef 0,70'e göre ~%4 büyük (2,9 yüzde puanı); Tur 4'teki ~0,765'ten iyileşmiş. Uzunluk 311/265 ≈ 1,17; erişim için uzatma korunuyor.
- **Puan: 8/10 — tamam.** Asa bağlantısı, hedef teması ve hız uygun; kalınlık hedefe yakın.
