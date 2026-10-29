# Bone Throw · `bone_throw` · Undead (sınıf)

Ömer 2026-10-29: "undeadin animasyonları çok kötü. mevcut skill icon ve efektlerini referans alma. tamamen skillerin amacına ve elementine göre 0dan özgün düşünerek bir skill effect seti chatgptye çizdirir misin /vfx ile uygulayalım sonra"
Sarma üstüne Ömer: "görsellerin tamamı ya karakterlerin üstünde ya da altında kalıyor. etrafını saramıyor" (çözüm: wrap + ghost; Ömer hayalet saydamlığı 0,45 seçti)
Tasarım: `new-art/undead/brief.md` (mevcut ikon/efektler referans DEĞİL). Skill: tek düşman, karanlık büyü hasarı + 2 tur Slow.

## Tur 1 · Claude · yeni çizim isteği · 2026-10-29
Çizim Codex yerine ChatGPT ile yapıldı (art-pipeline; brief.md prompt'ları). Asıllar `assets/source/undead-vfx/` (4x2, 1774x887, ~443 px kare, gerçek alfa).

## Tur 1 · Claude · ekleme · 2026-10-29
İçe aktarma `node tools/import-class-vfx.mjs undead` -> `assets/vfx/undead/` (320x320 kare, 4x2, alfa korunur). Kesim çizgileri sabit
ızgaradan değil EN BOŞ satır/sütundan (ChatGPT satırları ortada bölünmüyor: ör. 04'te y=452, 05'te y=437); kenara değen küçük komşu
kırıntıları silindi. Ölçüm: hiçbir karede siyah çerçeve / ızgara çizgisi / boş kare yok, içerik kare kenarına değmiyor.
Oynatma `src/game/art-v2/undead/vfx.ts` (kodla çizilen eski efekt kaldırıldı, vuruş anları ve olay sırası aynı):
- `undead/01-bone-throw-fly` (aslı 01-grave-shard-fly): mezar kıymığı, döngü, eldeki çıkıştan hedefin göğsüne kavisle uçar (360 ms, arc 80). Dayanak kıymığın kendisi (0,72; aynalı tarafta 0,28).
- `undead/02-bone-throw-hit` (aslı 02-grave-shard-hit): göğüs hizasında (atana bakan kenar) patlar. Slow tuttuysa 8 karenin hepsi (s5-s8 mezar ayazı aşağı çöker), tutmadıysa yalnız s1-s4 + hızlı sönüş.
- Vuruş: kıymık hedefe vardığı an patlama başlar; efekt Promise'i orada çözülür (eskisiyle aynı). Wrap yok (gövde efekti, hedefin önünde).
Aynalama: Phaser flipX karenin içinde aynalar; asimetrik dayanakta aynalı tarafta origin x = 1 - ox (`sheetAt`).
Yakalama: `node tools/anim-capture.mjs bone_throw` (atan sağda, düşman tarafı; kukla solda).

## Tur 2 · Claude · düzeltme · 2026-10-29
Yakalama: captures/bone_throw (5187, 68 kare, 56 karede sprite). Uçuş doğru: kıymık elden (1107,677) çıkar, kavisle (tepe y≈602) hedefin atana bakan
kenarına (774,684) varır; aynalı tarafta duman şeritleri kıymığın arkasında. Sorun: Slow tuttuğunda 02'nin mezar ayazı (s4-s8) patlamanın göğüs
noktasında kalıyordu: hedefin ~49 px sağında (atana doğru) ve tabanı ayak çizgisinin ~25 px üstünde, havada asılı.
Düzeltme (`src/game/art-v2/undead/vfx.ts` bonethrow, hit sprite'ından hemen sonra): Slow tuttuysa patlama s2-s4 arasında (gecikme 150, süre 220 ms,
Sine) hedefin ortasına (x = hedef x) ve ayak çizgisine (y = ayak - 0,43·boy + 6) çöker. Yeni yakalamada #36'dan itibaren 725,714: ayaz hedefin
ayaklarını sarar. Patlama s1-s2 yine göğüs hizasında, atana bakan kenarda. Slow tutmayan dal değişmedi.

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/bone_throw (2026-10-29)
Genel: Uçuş, çarpma ve Slow ayazı brief'e uygun; belirgin sıçrama veya boş/siyah kare yok.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #6 · s1, #12 · s2, #18 · s4 | Kıymık elden çıkıp kavisle hedefe ilerliyor; flipX sonrasında mor duman kıymığın arkasında. | - | - |
| #20–#27 · s1–s2 | Mor flaş ve kemik parçaları hedefin göğüs/atana bakan kenarında patlıyor; x=774, hedef kenarıyla uyumlu. | - | - |
| #33 · s3, #39 · s4, #45 · s6, #51 · s7, #60 · s8 | Slow ayazı hedefin ayaklarına iniyor ve alçak dumana sönüyor; x=725, y=714. | - | - |

Vuruş anı: #20'de patlama başlıyor (550 ms); temas noktası hedefin atana bakan kenarında, hizası uygun.
Karar önerisi: tamam; belirtilen karelerde sıralama, boyut ve konum akıcı, sheet'te çerçeve/boş kare görünmüyor.
