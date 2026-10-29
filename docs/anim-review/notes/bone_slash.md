# Bone Slash · `bone_slash` · Skeleton (Undead çağrısı)

Ömer 2026-10-29: "undeadin animasyonları çok kötü. mevcut skill icon ve efektlerini referans alma. tamamen skillerin amacına ve elementine göre 0dan özgün düşünerek bir skill effect seti chatgptye çizdirir misin /vfx ile uygulayalım sonra"
Sarma üstüne Ömer: "görsellerin tamamı ya karakterlerin üstünde ya da altında kalıyor. etrafını saramıyor" (çözüm: wrap + ghost; Ömer hayalet saydamlığı 0,45 seçti)
Tasarım: `new-art/undead/brief.md` (mevcut ikon/efektler referans DEĞİL). Skill: hedef + iki yan şerit (perpendicular splash), fiziksel.

## Tur 1 · Claude · yeni çizim isteği · 2026-10-29
Çizim Codex yerine ChatGPT ile yapıldı (art-pipeline; brief.md prompt'ları). Asıllar `assets/source/undead-vfx/` (4x2, 1774x887, ~443 px kare, gerçek alfa).

## Tur 1 · Claude · ekleme · 2026-10-29
İçe aktarma `node tools/import-class-vfx.mjs undead` -> `assets/vfx/undead/` (320x320 kare, 4x2, alfa korunur). Kesim çizgileri sabit
ızgaradan değil EN BOŞ satır/sütundan (ChatGPT satırları ortada bölünmüyor: ör. 04'te y=452, 05'te y=437); kenara değen küçük komşu
kırıntıları silindi. Ölçüm: hiçbir karede siyah çerçeve / ızgara çizgisi / boş kare yok, içerik kare kenarına değmiyor.
Oynatma `src/game/art-v2/undead/vfx.ts` (kodla çizilen eski efekt kaldırıldı, vuruş anları ve olay sırası aynı):
- `undead/09-bone-slash` (aslı 09-bone-slash): kemik tozundan kesik yayı hedef(ler)in dikey açıklığını kapsar (en az 240 px), atan sağdaysa aynalı; yan şerit ikinci vuruşu dikey aynalı (flipY) dönüş kesiği.
- Skill id `skeleton_slash`; test anahtarı `bone_slash` (sheet adında geçmesi için).
- Vuruş zamanlaması aynı: ana hedef 85 ms (yan şerit varsa 60 ms) sonra; yan şeritler gate(1) ile.
Aynalama: Phaser flipX karenin içinde aynalar; asimetrik dayanakta aynalı tarafta origin x = 1 - ox (`sheetAt`).
Yakalama: `node tools/anim-capture.mjs bone_slash` (atan sağda, düşman tarafı; kukla solda).

## Tur 2 · Codex · kontrol · 2026-10-29
Sürüm: Real battle · Yakalama: kullanıcı ekleri (`sheet.png`, `frame_008`, `frame_016`, `frame_028`; 16,7 ms adım)
Genel: 43 yakalama karesinde yaklaşma, kesiğin genişlemesi, vuruş ve toz halinde dağılma sırası okunuyor; ancak efekt hedef gövdesini ve kısmen atanı fazla kaplıyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5–#11 · s0–s1 | Mor kenarlı kemik yayı açılıyor ve hedefin üzerine geliyor | HIZA: temas hedef gövdesinde, fakat 302 px'lik efekt iki birimin siluetine taşıyor | Efekt ölçüsünü yaklaşık %75'e indir: 302 → 225 px; hedef merkezine göre dx ~0 px, dy ~0 px koru |
| #12–#19 · s2–s3 | Beyaz vuruş parlaması ve `22` hasar sayısı; yay hâlâ parlak | Boyut/örtme: parlama anında hedef neredeyse tamamen beyaz efekt altında; başlangıçta atan da yay arkasında kalıyor | Aynı 225 px boyut; vuruş karesinde alfa ~0,8, takipte ~0,55'e düşür; hasar/parlama anı korunmalı |
| #20–#31 · s4–s6 | Yay parçalanıp hedef çevresinde mor kemik tozu olarak dağılıyor | Sönüş akışı tutarlı, belirgin zıplama veya siyah kenar görünmüyor; küçültme sonrası parçacıklar okunmalı | Kare dizisi ve 18 fps korunmalı; yeni boyutta kenar kırpılması olmadığını kontrol et |
| #32–#43 · s6–s7 | Efekt silinmiş; sahnede hedef ve atan ayrık | BOS değil: boşluk efektin bitişinden sonra, kalan süre temiz | - |

Vuruş anı: #12–#19 (sheet s2–s3) içinde beyaz parlama hedef kuklanın gövdesinde ve `22` hasar sayısı aynı bölgede beliriyor; zamanlama uyumlu. Ancak yay vuruş boyunca hedefi gereğinden fazla örtüyor.
Karar: duzelt. 302 px → yaklaşık 225 px (%75); dayanak hedef merkezi, dx 0 px / dy 0 px; 18 fps korunsun. Vuruş karesinde alfa ~0,8, devamında ~0,55; kare kenarında siyah çerçeve yok, yay akışı düzgün.

## Tur 2 · Claude · düzeltme · 2026-10-29
Yakalama boşluğu: araç filtresi doğru eşleşiyor (`vfxsheet:undead/09-bone-slash` -> `_bone_slash`); 22:48 yakalaması 43 kare / 31 karede sprite verdi. Önceki "1 kare 0 sprite" sonucu kod/araç hatası değil, sunucu yükü (5187'de `page.goto` 120 sn zaman aşımı, yeniden denemeler) ya da 5173 yenilenmesi kaynaklıydı; araç değişmedi.
Codex önerisi uygulandı (`src/game/art-v2/undead/vfx.ts` > boneslash): boy `max(225, açıklık/0.9 × 0.75)` (tek hedefte 302 -> 225 px), dayanak aynı (hedef merkezi); alfa 0,8, 200 ms sonra 120 ms'de 0,55'e iner; 18 fps korunur.

## Tur 3 · Codex · kontrol · 2026-10-29
Sürüm: Real battle · Yakalama: kullanıcı ekleri (`sheet.png`, `frame_008`, `frame_013`, `frame_020`, `frame_028`; 16,7 ms adım)
Genel: Tur 2'deki küçültme akışın ölçüsünü iyileştirmiş; kesik hedefe ulaşıyor ve ayak-baş açıklığını kapsıyor, ancak ilk yay hâlâ atan ile hedef arasındaki siluetleri fazla örtüyor.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5–#11 · s0–s1 | Mor-beyaz kesik yayı hedefe doğru açılıyor; frame_008'de yaklaşık 225 px yüksekliğinde | HIZA/örtme: hedefin başından ayağına kadar kesik var, fakat yay atanın önünü ve hedef siluetinin büyük kısmını kapatıyor | Boyu 225 → 190 px'e indir (~%16); dayanak hedef merkezi ve dx/dy 0 px kalsın. 190 px, görünen yaklaşık 155 px'lik hedefi baştan ayağa kapsar |
| #12–#19 · s2–s3 | Vuruşta hedef tam beyaz siluet oluyor, `21` hasar sayısı beliriyor | Okunabilirlik: frame_013'te beyaz parlama hedefin tüm görünür gövdesini siliyor; hedef kimin vurulduğu olarak seçilemiyor | 190 px boyu ve alfa 0,8 → 0,55 sönüşünü koru; vuruş anında hedefin dış konturu/silueti seçilebilir kalacak şekilde beyaz kaplamayı azalt |
| #20–#31 · s4–s6 | Mor parçacıklar hedef çevresinde dağılıp sönüyor | - | Dizi akışı ve 18 fps uygun; ani sıçrama, siyah kenar veya kareden kırpılma görünmüyor |
| #32–#43 · s6–s7 | Efekt yok, iki birim ayrık duruyor | - | Temiz bitiş |

Vuruş anı: #12–#19 (sheet s2–s3), hasar sayısı ve parlama doğru zamanda; fakat #13 / frame_013'te hedef gövdesi tümüyle beyaz olduğundan okunurluk yetersiz. Atan sağda (skeleton etiketi araçta ally of caster olsa da çağrılmış birim); soldaki kukla hedef ve vuruş yeri doğru.
Karar: duzelt. Boy 225 → 190 px (~%16 küçült), hedef merkezi dayanağı/dx 0/dy 0 ve 18 fps koru; vuruş parlamasında hedef siluetinin ayırt edilebilirliğini koru. Siyah kenar/kırpılma ve akış sorunu yok.

## Tur 3 · Claude · düzeltme · 2026-10-29
Boy `max(190, açıklık/0.9 × 0.63)` (tek hedefte 190 px; iki yan şeritte orantılı büyür); dayanak, alfa (0,8 -> 0,55) ve 18 fps aynı.
Vuruştaki tam beyaz siluet bu efektin değil, motorun ortak darbe parlaması (`combatant-view.ts` setTintFill, hitFlashMs): tüm skill'lerde aynı; burada değiştirilmedi (kapsam dışı, ana oturuma soruldu).

## Tur 4 · Codex · kontrol · 2026-10-29
Sürüm: Real battle · Yakalama: kullanıcı ekleri (`sheet.png`, `frame_008`, `frame_011`, `frame_016`, `frame_022`, `frame_028`; 16,7 ms adım)
Genel: 190 px'lik kesik hedefe ulaşıp görünür gövde açıklığını kapsıyor; önceki boyuta göre örtme azalmış, akış ve sönüş temiz.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5–#11 · s0–s1 | Mor-beyaz yay açılarak soldaki hedefin gövdesine temas ediyor; sağdaki Skeleton atandır | - | 190 px boy ve hedefe dayanak uygun; hedef kapsaması baştan ayağa yeterli, atan ve hedef örtmesi kabul edilebilir düzeyde |
| #12–#19 · s2–s3 | Vuruş ve hasar sayısı; hedef tam beyaz siluet oluyor | Bu beyazlık tüm skill'lerdeki ortak motor darbe parlamasıdır; Bone Slash efektinin kusuru olarak değerlendirilmedi | Efekt ayarı gerekmiyor |
| #20–#31 · s4–s6 | Mor parçacıklar hedef çevresinde dağılıp sönüyor | - | Akışta ani sıçrama yok; siyah kenar ve kareden kırpılma görünmüyor |
| #32–#43 · s6–s7 | Efekt sönmüş, sahne temiz | - | - |

Vuruş anı: #12–#19 (sheet s2–s3), hasar ve darbe anı yerinde. Tam beyaz siluet ortak `setTintFill` darbe parlamasıdır ve bu efektin kusuru sayılmamıştır. Atan sağdaki Skeleton; hedef soldaki kukla ve kesik doğru hedefe ulaşıyor.
Karar: tamam. Tur 3'te istenen 190 px boy uygulanmış; hedef kapsaması yeterli, örtme kabul edilebilir, akış düzgün, siyah kenar veya kırpılma yok.
