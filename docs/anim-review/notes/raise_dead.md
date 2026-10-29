# Raise Dead · `raise_dead` · Undead (sınıf)

Ömer 2026-10-29: "undeadin animasyonları çok kötü. mevcut skill icon ve efektlerini referans alma. tamamen skillerin amacına ve elementine göre 0dan özgün düşünerek bir skill effect seti chatgptye çizdirir misin /vfx ile uygulayalım sonra"
Sarma üstüne Ömer: "görsellerin tamamı ya karakterlerin üstünde ya da altında kalıyor. etrafını saramıyor" (çözüm: wrap + ghost; Ömer hayalet saydamlığı 0,45 seçti)
Tasarım: `new-art/undead/brief.md` (mevcut ikon/efektler referans DEĞİL). Skill: cesedi tüketip iskelet çağırır (ceset yoksa beslenmemiş iskelet).

## Tur 1 · Claude · yeni çizim isteği · 2026-10-29
Çizim Codex yerine ChatGPT ile yapıldı (art-pipeline; brief.md prompt'ları). Asıllar `assets/source/undead-vfx/` (4x2, 1774x887, ~443 px kare, gerçek alfa).

## Tur 1 · Claude · ekleme · 2026-10-29
İçe aktarma `node tools/import-class-vfx.mjs undead` -> `assets/vfx/undead/` (320x320 kare, 4x2, alfa korunur). Kesim çizgileri sabit
ızgaradan değil EN BOŞ satır/sütundan (ChatGPT satırları ortada bölünmüyor: ör. 04'te y=452, 05'te y=437); kenara değen küçük komşu
kırıntıları silindi. Ölçüm: hiçbir karede siyah çerçeve / ızgara çizgisi / boş kare yok, içerik kare kenarına değmiyor.
Oynatma `src/game/art-v2/undead/vfx.ts` (kodla çizilen eski efekt kaldırıldı, vuruş anları ve olay sırası aynı):
- `undead/07-raise-dead` (aslı 07-raise-dead): skill anında yalnız s1-s2 (rün halkası) yuvada belirip söner; çağrı olayında (summon_skeleton) tam patlama iskeletin ayak noktasında, iskeleti SARAR (wrap split 0,86, ghost 0,45). İskelet sütunun içinden sarsak hamlelerle yükselir (eski clawRise hareketi, toprak parçacıkları yok).
- Ceset emme olayı (corpsedrain, yalnız ceset varsa): cesetten yuvaya 3 kızıl ruh tutamı (`undead/08-vampiric-bite-wisp`). Test panelinde ceset olmadığı için beslenmemiş hâl oynar (sütun hafif soluk).
- Olay sırası aynı (raise -> corpsedrain -> summon_skeleton). Doğuş Promise'i iskelet yere oturup sütun bitince çözülür (~1,6-1,8 sn; eskisi ~2,4 sn).
Aynalama: Phaser flipX karenin içinde aynalar; asimetrik dayanakta aynalı tarafta origin x = 1 - ox (`sheetAt`).
Yakalama: `node tools/anim-capture.mjs raise_dead` (atan sağda, düşman tarafı; kukla solda).

## Tur 2 · Codex · kontrol · 2026-10-29
Yakalama: `captures/raise_dead` (2026-10-29; beslenmemiş hâl, test panelinde ceset yok). Atan sağdaki Undead; çağrılan Skeleton `enemy-s0/1` x=1136, y=745.

Genel: Rün halkası yuvada belirip sönüyor; iskelet sütunun içinden kademeli yükseliyor, siyah/boş kare veya belirgin sıçrama yok. Patlama doğru yuvada ve ayak çizgisine yakın; sütun gövdenin arkasında, ön hayalet sarımı seçiliyor. Sondaki kesilme düzeltilmeli.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #5–#31 · s1–s2 | Yuvada rün halkası açılıp sönüyor. | - | - |
| #32–#95 · s3–s6 | Patlama iskeletin ayak çizgisinde; sütun arkasında, iskelet kademeli yükseliyor ve hayalet kopya sarıyor. | - | - |
| #65–#111 · s4–s7 | Üç katman kayıtta: arka katman α=0,88, ön hayalet α=0,40, tekrar arka katman α=0,88. | HIZA: istenen hayalet 0,45; yakalamada 0,40. | Ön hayalet katmanını α=0,45 yap. |
| #105–#111 · s7 → #112 · efekt yok | Sütun s7'de sabit kalıp bir sonraki yakalama karesinde tamamen kayboluyor; iskelet kalıyor. | ZAMAN: bitiş ani; kemik tozu dağılışı görünmüyor. | Sona kısa kemik tozu/dağılma geçişi ekle ve sütunu birkaç karede söndür; iskelet yerde sabit kalsın. |

Vuruş/çağrı anı: `summon_skeleton` sırasında patlama doğru noktada ve iskeletin yükselişi okunaklı. Corpsedrain yakalanmadı; testte ceset yok, beslenmemiş hâl oynuyor.
Karar önerisi: düzeltilebilir; ön hayalet alfa değerini 0,45'e eşle ve ani kesilen sona kemik tozu dağılışı ekle.

## Tur 3 · Claude · düzeltme · 2026-10-29
`src/game/art-v2/undead/vfx.ts > summon_skeleton` + yeni `boneDust`:
- Ön hayalet ekranda hep 0,45: beslenmemişte sütun alfası 0,88 olduğundan sarma hayaleti `GHOST / 0.88` verilir (beslenmişte `GHOST`).
- Ani kesilme yok: sütun `keep: true`, son kare (s8) bitince yerinde 0,42 sn'de söner (taban ayak çizgisinde kalır, yukarı kaymaz); aynı anda
  sütun boyunca fildişi kemik tozu zerreleri (beslenmiş 18, beslenmemiş 13, gri) yukarı-dışa süzülüp söner. Doğuş Promise'i aynı anda çözülür (beklenmez).
- Not: yakalamanın sonunda iskeletin silinmesi test panelinin temizliği (keepAfter yok), efektle ilgisi yok.
## Tur 4 · Codex · kontrol · 2026-10-30
Yakalama: `captures/raise_dead` (Tur 3 sonrası; 2026-10-29). Yakın plan: Claude'un `end3` kareleri 60, 90, 108, 114, 118, 121, 124, 128.

Genel: Ön hayalet artık istenen 0,45 alfa ile sarıyor. Sütun son karede takılı kalmak yerine tabanında sabit kalarak yaklaşık 0,27 sn boyunca sönüyor; yakın planda iskelet çevresinde kemik tozu dağılışı da seçiliyor. İskeletin yakalamanın en sonunda kaybolması test paneli temizliği.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #60, #90, #108 · s2, s5, s7 | Arka/ön/arka katman aynı x=1136, y=749'da; alfa değerleri 0,88 / 0,45 / 0,88. | - | - |
| #111–#128 · s7 | Sütun ve ön hayalet aynı dayanakta kademeli sönüyor: #114'te 0,82 / 0,42, #118'de 0,59 / 0,30, #121'de 0,42 / 0,21, #124'te 0,25 / 0,13, #128'de 0,02 / 0,01. Yakın planda sütun boyunca kemik tozu dışa ve yukarı dağılıyor. | - | - |
| #129 sonrası | Sütun kalmıyor; sona doğru iskeletin ve adının kaybolması efekt dizisinin parçası değil, test paneli temizliği. | - | - |

Vuruş/çağrı anı: İskeletin yükselişi okunaklı; çağrı sütunu hedef kuklayla karışmıyor ve kendi yuvasında kalıyor. Bitişte toz/sönüş var, yeni konum sıçraması yok.
Karar: düzeltme başarılı; `raise_dead` tamam.
