# Idle (boşta duruş) · `hollow_king` · The Hollow King (Harita 3 son bossu)

Bu iş bir skill efekti DEĞİL: bossun savaştaki boşta duruş (idle) sprite'ı ve nefes döngüsü. Ömer: "idle sprite aldıklarını
al oyuna" / "5. için /vfx" / "vfxten 1 örnek dene". Deneme: /vfx döngüsü yeni karakter çizimi için işe yarıyor mu.

## Tur 1 · Claude · yeni çizim isteği · 2026-10-29
Karakter (docs/design/campaign/maps-2-3.md 4.3): **The Hollow King**, undead cüce kral. Taşıdığı: **Hollow Crown** (ortası
oyuk, çatlak, eski demir-taş taç; içinde soluk ışık), silahı **Kingsmaul** (iri, ağır, iki elli savaş çekici; taş/demir baş,
rün oyukları). Cüce oranları: kısa, geniş, ağır; uzun örgülü kirli-beyaz sakal. Undead: gri-mavi solgun ölü ten, çökmüş
yanaklar, göz çukurlarında soğuk soluk ışık (Hollow ailesi: Stonebound Warden'ın undead paleti). Eski cüce kral zırhı ve
yırtık, solmuş kraliyet pelerini. Kesinlikle ortaçağ; modern/bilimkurgu öğe yok.

Önceki çizimin sorunu: FRONTAL (önden) duruyordu. Bu kez **yan profil / üç çeyrek yan görünüm, SAĞA bakar**, tıpkı referans
Thane of the Deep (`assets/sprites/thane_of_the_deep/idle.png`) gibi: gövde sağa dönük, yüz profilden ya da yarım profilden
sağa. Oyun düşman tarafında görseli kendisi aynalar; çizim sağa bakmalı.

Duruş: ayakta, ağırlık iki ayakta, ayaklar sabit. Kingsmaul'un başı önünde (sağda) yere dayalı, iki eli sapın üst ucunda
(bekleyen kral duruşu). Böylece çekiç her karede aynı yerde kalır.

İstenen dosya: `docs/anim-review/new-art/hollow_king/hollow_king.png` + `hollow_king.json`.
- Sheet: **2 sütun x 2 satır = 4 kare**, satır satır (row-major), 1024x1536 piksel, hücre 512x768. Şeffaf arka plan (gerçek
  alfa; dama deseni yok, siyah/koyu zemin yok, çerçeve yok, yazı yok, gölge zemini yok).
- Her hücrede aynı karakter, aynı boyut, tam boy (baştan ayağa, tacın ucu ve çekiç kesilmeden), ayak tabanları dört karede
  de aynı yükseklikte, hücrenin altından ~%5 yukarıda; figür hücrede ortalı ve hücre kenarına değmiyor.
- 4 kare = nefes döngüsü (boşta): 1 nötr (nefes vermiş), 2 nefes alıyor (omuzlar + göğüs + taç ~6-8 px yukarı), 3 tam nefes
  (~10-12 px yukarı, pelerin ucu hafif kıpırdar), 4 geri iniyor (2 ile aynı yükseklik). Ayaklar, çekiç başı ve sapın alt
  kısmı dört karede KIPIRDAMAZ; yalnız üst gövde, sakal ucu, pelerin ve göz ışığı çok az değişir. Detaylar (zırh deseni,
  taç biçimi, renkler) karelerin hepsinde birebir aynı; yalnız nefes hareketi farklı. 4 → 1 geçişi kopuk olmamalı.
- Stil: var olan mob sprite'larıyla aynı (boyalı piksel art görünümü, koyu kontur, temiz yüzeyler, gürültüsüz). Referans:
  `assets/sprites/thane_of_the_deep/idle.png` (aynı cüce ailesi, ölçek ve stil), `assets/sprites/stonebound_warden/idle.png`.
- json şeması: `{ "frames": 4, "fps": 2, "frame_size": [512, 768], "grid": [2, 2], "order": "row-major", "padding_px": 0 }`.

Claude bundan sonra: kare 1 → `assets/sprites/hollow_king/idle.png`, 4 kare → boss poz sayfası (boşta döngüsü), test savaşında
düşman tarafında yakalar; Codex `kontrol` eder (yön, ölçek, zemin çizgisi, kareler arası zıplama/titreme, stil).

## Tur 1 · Codex · çizim · 2026-10-29
Tek 2×2 nefes döngüsü sheet'i imagegen ile üretildi; hedeflenen sağa bakan undead cüce kral, Hollow Crown ve yere dayalı Kingsmaul kompozisyonu tarif edildi. Görseli proje yoluna aktarma işlemi tamamlanamadı; çıktı aktarımında araç/komut sınırı oluştu. Kare tutarlılığı, gerçek alfa, ölçü ve hareket kusurları bu nedenle doğrulanamadı. Bilinen kusur: PNG henüz `new-art/hollow_king/hollow_king.png` konumunda değil; aktarım gerekli.

## Tur 1 · Claude · ekleme · 2026-10-29
Görsel Codex oturumunun `~/.codex/generated_images/` klasöründen alındı (Codex 4 deneme üretmiş; son deneme seçildi:
`new-art/hollow_king/hollow_king.png`, diğer 3'ü `new-art/hollow_king/alternatives/alt-1..3.png`). Gerçek alfa (arka plan
saydam), 4 kare aynı ayak çizgisinde (hücrede y 715), aynı genişlikte.
Oyuna: kare 1 → `assets/source/mobs/hollow_king.png` → `assets/sprites/hollow_king/idle.png` + avatar; 4 kare → poz sayfası
(`assets/source/mob-poses/hollow_king.png`, 4x3 ızgaranın ilk satırı) → `assets/sprites/hollow_king/poses.png`;
`data/mob-poses.json > hollow_king`: idle [0,1,2,3], 450 ms/kare, diğer durumlar kare 0. Geçici boss kaydı
`data/bosses/hollow_king.json` (kit yok, inert).
Yakalama: `node tools/anim-capture.mjs --idle hollow_king` → `captures/idle-hollow_king/` (sheet.png = 2 tam döngü;
`closeup.png` = poz 0-3 yakın plan 3x, kesikli camgöbeği çizgi = birimin zemin noktası). frames.json'daki "vfx" kaydı
burada birimin kendi sprite'ı (frame = poz karesi).
Sorular: yön/profil (frontal değil mi), ölçek (soldaki kukla Stonebound Warden ile), ayak zemin çizgisinde mi, kareler
arası zıplama / titreme var mı (ölçüm: poz 2 ile poz 0 arası fark diğerlerinin ~3 katı, pelerin; pop gibi mi?), 3→0 geçişi
akıyor mu, stil diğer moblarla uyumlu mu.

## Tur 2 · Codex · kontrol · 2026-10-29
Yakalama: `captures/idle-hollow_king` (2026-10-29), 2 tam döngü; yakın plan poz 0–3.
Genel: Yön, ölçek ve zemin yerleşimi uygun; poz 2'nin pelerin savrulması nefes hareketinden kopup ani pop yaratıyor, bu yüzden döngü henüz tamam değil.

| Başlık | Gözlem | Karar / öneri |
|---|---|---|
| Yön / profil | Kaynak sheet sağa bakan üç çeyrek profil; savaşta sağ düşman tarafındaki birim `flipX: true` ile sola bakıyor. Frontal değil; doğru yön. | Uygun. |
| Ölçek | Yakalamada Hollow King 154×217, soldaki Stonebound Warden kuklası 122×190. Kral yaklaşık %14 daha uzun; boss için dengeli ve okunaklı. | Uygun; büyütme/küçültme gerekmiyor. |
| Ayak-zemin | Tüm pozlarda çekiç başı ve ayak tabanı camgöbeği zemin çizgisinde sabit; yere basışta görünür kayma yok. | Uygun. |
| Kareler arası zıplama / titreme / pop | `#2 s0 → #3 s1 → #4 s2 → #5 s3` (sonra aynı döngü `#6–#9`): merkez/ayak hattı sabit, bu yüzden karakter zıplamıyor veya titremiyor. Ancak `#4 · s2`'de pelerin ucu bir önceki kareye göre çok daha fazla sağa-aşağı açılıyor; gövde/sakal da belirgin biçimde farklı. 450 ms/kare hızında bu tek karelik siluet değişimi nefes kıpırtısından çok ani savrulma/pop gibi okunuyor. | `s2` pelerinini `s1` ile `s3` arasındaki küçük hareket düzeyine indir; omuz/gövde ve sakal değişimini de yumuşat. Bu, kareyi değiştirme/yeniden çizme ile Claude'un çözebileceği bir düzeltme; tüm sheet için yeni çizim gerekmiyor. |
| `3 → 0` döngü geçişi | `#5 s3 → #6 s0` boyunca ayak, çekiç ve ana siluet aynı hizada; poz 3 nötr poza yakın. Geçiş kopuk değil. | Uygun. |
| Stil | Koyu, dokulu boyalı-piksel görünümü, zırh ve cüce silueti oyunun dünyasına uyuyor; Stonebound Warden'la görsel dil bakımından tutarlı. | Uygun. |
| Siyah çerçeve / hale | Kırmızı-turuncu kontur yakalamada karakterin çevresinde var; verilen açıklamaya göre aktif sıra vurgusu, sprite parçası değil. Kaynak sheet'te çerçeve yok ve PNG alfa kanalı saydam arka plan içeriyor. | Sprite kusuru saymıyorum; kontrol ölçütünü geçiyor. |

Karar: `duzelt`. Yalnız `s2` nefes pozundaki pelerin ve üst gövde hareketini yumuşat; mevcut yön, ölçek, ayak hizası ve diğer kareleri koru. Claude'un kare düzeltmesi yeterli, yeni çizim gerekmiyor.

Son: 2026-10-29 · Codex

## Tur 3 · Claude · düzeltme · 2026-10-29
Poz 2 döngüden çıkarıldı (ölçüm: poz 2'nin diğer üç pozla farkı ~9200 piksel, poz 0-1-3 arası 1500-3900). Yeni boşta sırası
`data/mob-poses.json > hollow_king.idle` = [0, 3, 1, 3] (450 ms/kare): nötr → hafif → nefes alınmış → hafif → nötr; her adım
en küçük farklı komşu. Çizim değişmedi (poz 2 sayfada duruyor, kullanılmıyor). Yeniden yakalandı: `captures/idle-hollow_king`
(sheet.png 2+ döngü, closeup.png = #2-#6 yakın plan: poz 3,1,3,0,3).
Soru: pop gitti mi, döngü akıyor mu, nefes hâlâ görünüyor mu (çok mu hafif kaldı)?

## Tur 4 · Codex · kontrol · 2026-10-29
Yakalama: `captures/idle-hollow_king` (2026-10-29), `sheet.png` ve `closeup.png`.
Genel: [0, 3, 1, 3] sırası nefes hareketini sakin ve tutarlı gösteriyor; önceki büyük pelerin pop'u artık görünmüyor.

| Başlık | Gözlem | Karar / öneri |
|---|---|---|
| Pop | Kullanılan akış `#2 s3 → #3 s1 → #4 s3 → #5 s0 → #6 s3`; pelerin ve gövde silueti komşu kareler arasında küçük değişiyor. Önceki s2 savrulması akışta yok. | Uygun; ani pop gözlenmedi. |
| Döngü akışı | `s3 → s1 → s3 → s0 → s3` geçişlerinde karakterin yeri ve ana silueti kararlı; dönüşte s3'e bağlanış kopuk değil. | Uygun. |
| Nefes görünürlüğü | Yakın planda üst gövde/sakal çevresinde hafif hareket seçiliyor; ritim sakin, fakat küçük ölçekte nefes oldukça ince. Boşta bekleyen ağır zırhlı boss için yine de okunabilir ve rahatsız edici değil. | Uygun; artırmaya gerek yok. |
| Ayak-zemin | Kesikli camgöbeği zemin noktası ayak tabanlarıyla hizalı; kareler arasında taban yükselmesi ya da kayması görünmüyor. | Uygun. |

Karar: `tamam`. Poz 2'nin döngüden çıkarılması pop'u gidermiş; nefes hareketi okunacak kadar mevcut, ayak-zemin teması sabit.

Son: 2026-10-29 · Codex
