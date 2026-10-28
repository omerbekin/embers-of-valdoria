# Animasyon incelemesi: Codex + Claude ortak süreci

Skill VFX kare dizilerinin (sprite sheet) düzeltilmesi için ortak çalışma alanı. Codex izler ve not alır, Claude
düzeltir; düzeltilemeyen dizi için Codex yeni dizi çizer, Claude ekler, Codex kontrol eder. İki taraf sohbet üzerinden
değil, bu klasördeki dosyalar üzerinden haberleşir. Ömer yalnızca sırayı karşı tarafa söyler ("board'a bak").

Kapsam (2026-10-28): yalnız skill efektleri. Karakter gövde animasyonları, silah tutuşu ve verimlilik sonra
(docs/design/future-ideas.md, 2026-10-28 satırı).

## Klasör

| Yol | Ne |
|---|---|
| `board.md` | Durum tablosu: her skill hangi aşamada, sıra kimde. Her iki taraf da işini bitirince burayı günceller. |
| `notes/<skill-id>.md` | Skill başına not dosyası. Turlar alt alta eklenir, eski tur silinmez. |
| `new-art/<skill-id>/` | Codex'in çizdiği yeni kare dizisi (sheet + json). Claude buradan oyuna alır. |

`skill-id`: src/game/mob-vfx.ts > `MOB_VFX_SPECS` anahtarı (ör. `broadside`). Test panelindeki listede görünen ad
farklıysa not başlığına ikisini de yaz.

## Aşamalar (board.md "Durum" sütunu)

| Durum | Sıra kimde | Ne yapılır |
|---|---|---|
| `incele` | Codex | Skill'i test ekranında izle, kareleri tek tek incele, nota "Tur N · Codex · inceleme" bölümü yaz. |
| `duzelt` | Claude | Notlara göre kes / hizala / sırala / zamanlamayı ayarla. Ne yaptığını "Tur N · Claude · düzeltme" olarak yaz. |
| `kontrol` | Codex | Düzeltmeye bak. İyiyse `tamam`, değilse yeni inceleme turu yazıp `duzelt`. |
| `yeni-cizim` | Codex | Claude kesip hizalayarak çözemedi; istenen dizi notta tarif edilir. Codex `new-art/<skill-id>/` altına çizer. |
| `ekle` | Claude | Yeni diziyi oyuna alır, sonra `kontrol`. |
| `tamam` | - | Bitti. |

`incele` nasıl yapılır: oyundaki gerçek görünüm yakalama aracıyla dosyaya alınır, inceleme bu dosyalardan yapılır.
1. Yakalama yoksa ya da eskiyse: `node tools/anim-capture.mjs <skill-id>` (geliştirme sunucusu 5173 açık olmalı; ses
   kapalı, görünmez tarayıcı). Çıktı `captures/<skill-id>/`:
   - `sheet.png`: oyundan yakalanan kareler yan yana, efekt bölgesine kırpılmış, **ızgaralı: oyun koordinatında 50 px** (1920x1080 taban, frames.json ile aynı birim; belirgin çizgiler 100 px).
     Her karenin üstünde `#N` (yakalama karesi), `ms` (atıştan beri oyun zamanı) ve `sheet k` (oyunun o an çizdiği
     sprite karesi, 0'dan başlar) yazar.
   - `frame_NNN.png`: aynı karelerin tam ekran hali (1600x900). Ayrıntı için tek tek aç.
   - `frames.json`: her karede efekt sprite'larının konumu (x, y: sprite merkezi, 1920x1080 oyun koordinatı), boyutu
     (w, h), açısı, saydamlığı. Piksel ölçümünü buradan doğrula.
2. Önce `sheet.png` ile bütün akışa bak (ms sütunu gerçek hızı verir: 1/60 sn adım), sonra şüpheli kareleri tam
   ekran aç. Asıl sheet görselini (`assets/mob-vfx/<mob>/<skill>.png`) de karşılaştır.
3. board.md "Not" sütunundaki şüpheye mutlaka açıkça cevap ver.

**Kim kime atıyor (önce bunu oku):** testte skill'i ATAN her zaman mob'dur, ekranın SAĞINDA (düşman tarafı).
HEDEF solda duran kukladır (oyuncu tarafı, ör. Stonebound Warden). Yani hasar sayısının ve vuruş parlamasının
soldaki kuklada çıkması DOĞRUDUR. Yakın dövüş mob'u vurmak için hedefin yanına yürür, sonra geri döner.
Zemin skill'leri (`cells`) oyuncu tarafının hücrelerine düşer; atanın yanında olması beklenmez.
Konumlar `frames.json` > `units` (role: caster / target).

Real battle sürümü sheet karelerinin arasına kodla ara kare ekler (ör. 3x: 8 kare → 24). `sheet k` bu genişletilmiş
dizideki sıradır; asıl sheet karesi = k / ara kare sayısı (aşağı yuvarla) + 1. Notta hem yakalama karesini (`#N`)
hem asıl sheet karesini yaz. Ara kare fazlalığı tek başına sorun değildir.

Bir taraf işini bitirince: not dosyasına turunu yazar, board.md'de durumu ve "Son" sütununu (tarih + kim) günceller.

## İnceleme notu formatı (Codex)

```
## Tur 1 · Codex · inceleme · 2026-10-28
Sürüm: Real battle   Yakalama: captures/<skill-id> (tarih)
Genel: tek cümle, bütün dizi nasıl görünüyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5 · s1 | kılıç ucunda küçük kıvılcım | - | - |
| #12→#13 · s3→s4 | alev topu | ZIPLAMA: ~15px yukarı sıçrıyor | s4'ü 15px aşağı |
| #18 · s6 | patlama | BOYUT: önceki kareye göre ~%40 büyük, ani | s6'yı %80'e küçült ya da s5-s6 arasına ara kare |

Vuruş anı: #16'da efekt hedefe değiyor, hasar sayısı #17'de çıkıyor. Doğru mu: evet / hayır (neden).
Karar önerisi: düzeltilebilir / yeni çizim gerekli (neden).
```

Kurallar:
- Kare numarası 1'den başlar; sheet'te sol üst kare 1, satır satır sağa ve aşağı (json'daki `order: row-major`).
  Sheet dosyası: `assets/mob-vfx/<mob>/<skill>.png` (Original), `assets/mob-vfx-tween/<mob>/` (ChatGPT 16f).
- Konum farkını yön + yaklaşık piksel olarak yaz (kare 256px kabul; "biraz" yerine "~15px").
- Boyut farkını yüzde olarak yaz.
- Sorun kodları: `ZIPLAMA` (konum sıçraması), `BOYUT` (ani büyüme / küçülme), `SIRA` (kare yanlış yerde),
  `EKSIK-ARA` (iki kare arası çok farklı, ara kare yok), `BOS` (boş / siyah / kesik kare), `KESIK` (efekt kare
  kenarında kırpılmış), `DONGU` (son ile ilk kare kopuk), `ZAMAN` (çok hızlı / yavaş, vuruş anı yanlış),
  `HIZA` (efekt karakterden ya da hedeften kopuk duruyor), `YON` (yanlış tarafa bakıyor), `STIL` (oyunun
  diline uymuyor). Birden fazla olabilir.
- Oyundan yakalanan kareler asıl ölçüdür; asıl sheet görseli neden öyle göründüğünü anlamak için.
- Konum ölçerken `sheet.png` ızgarası oyun koordinatında 50 px'tir (görüntü küçültülmüş olsa da;
  kesin değer için `frames.json`).

## Yeni çizim isteği (Claude → Codex)

Claude notta "Tur N · Claude · yeni çizim isteği" yazar: kaç kare, kare boyutu, ızgara, hangi karelerin korunacağı,
efektin hangi noktadan başlayıp nereye gittiği, karakterin skill'deki duruşu (hangi el, silah, yön), vuruş karesi.
Codex `new-art/<skill-id>/` altına şunları koyar:
- `<skill-id>.png`: sheet, şeffaf arka plan (siyah zemin yok), json'daki ızgara ile
- `<skill-id>.json`: mevcut sheet json'larıyla aynı şema (`frames`, `fps`, `frame_size`, `grid`, `order`, `padding_px`)
- İsteğe bağlı `preview.gif`: kontrol için

Sanat kuralları: ortaçağ, temiz (gürültüsüz ama boş değil), kareler birbirine akmalı, siyah çerçeve yok.

## Codex için sabit kurallar

- Oyunun sesi hep kapalı: her yeni sekmede ilk iş tarayıcı konsolunda
  `localStorage.setItem('eov.settings.v1', JSON.stringify({volume:0, steps:20})); location.reload()`
  çalıştır (Master 0 = müzik + efekt + arayüz sesi kapalı). Konsol yoksa Settings > Master Volume 0.
- Oyun: http://localhost:5000 > Debug > Characters > Animation tests > "VFX frame test (in battle)".
- Yalnız bu klasöre (`docs/anim-review/`) yaz. Kod, `assets/`, `data/` dosyalarına dokunma; onları Claude değiştirir.
- Git işlemi yapma (commit / push yok).
