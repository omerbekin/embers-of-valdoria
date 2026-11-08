# hammer_spark

## Tur 1 · Claude · ekleme · 2026-11-08
Hammer Spark (Thunder Skald). Yeni kendi efekti: 07 hammer-charge (çekiç başında şimşek), 03 hammer-wave (yarım ay şok dalgası, hedefe yol alır), 04 hammer-impact. Poz: overhead2 -> throw. Menzil satışı: Skald yerinde durur, dalga gider.
Yakalama: captures/hammer_spark. Çizim: assets/source/skald-vfx (Terra 6.1). Kod: src/game/art-v2/skald/vfx.ts.

## Tur 2 ? Codex ? kontrol ? 2026-11-08
S?r?m: Real battle   Yakalama: captures/hammer_spark (2026-11-08)
Genel: Y?k ve hedef patlamas? okunuyor; dalga hedefin ?n?nde belirgin s?re bekliyor.

| Kare (#yakalama ? sheet) | Ne g?r?n?yor | Sorun | ?neri |
|---|---|---|---|
| #5?#51 ? y?k s1?s8 | Sa?daki Skald'?n kald?rd??? ?eki? ba??nda y?k | Siyah/bo? kare ya da konum z?plamas? g?r?nm?yor | - |
| #52?#66 ? dalga s1?s3 | Dalga soldaki kuklaya ilerliyor | - | - |
| #67?#79 ? dalga s4?s6 | Dalga x?745'te, kuklan?n ?n?nde sabit kal?yor | ZAMAN: yakla??k 216 ms havada bekliyor | Var?? ile patlamay? ayn? ana getir; beklemeyi kald?r |
| #80?#110 ? patlama s1?s8 | Patlama kukla merkezinde, s?n?yor | Siyah/bo? kare veya istenmeyen z?plama yok | - |

Vuru? an?: Dalga #67'de hedefe var?yor; patlama ve hasar #80'de ba?l?yor. Do?ru mu: hay?r, arada yakla??k 216 ms bekleme var. Karar: d?zeltilebilir; duzelt.


## Tur 3 ? Codex ? kontrol ? 2026-11-08
S?r?m: Real battle   Yakalama: captures/hammer_spark (2026-11-08)
Genel: Y?k, dalgan?n soldaki kuklaya yolculu?u ve patlama okunuyor.

| Kare | Ne g?r?n?yor | Sorun | ?neri |
|---|---|---|---|
| #49?#70 ? dalga | Dalga sa?dan sola ilerleyip hedefe ula??yor | - | - |
| #71?#90 ? patlama | Var???n ard?ndan kukla ?zerinde patlama ve s?n?? | - | - |

Vuru? an?: Dalga #70'te hedefte, patlama ve hasar #71'de ba?l?yor; ?nceki bekleme kalkm??. Do?ru mu: evet. Karar: tamam.


## Tur 4 ? Codex ? kontrol ? 2026-11-08
S?r?m: Real battle   Yakalama: captures/hammer_spark (2026-11-08)
Genel: Yak?n mesafeye gelmi? Skald ve iki evre okunuyor; ilk kesi?in temas? ile fiziksel hasar ili?kisi belirsiz.

| Kare (#yakalama ? sheet) | Ne g?r?n?yor | Sorun | ?neri |
|---|---|---|---|
| #1?#4 ? efekt yok | Skald kuklaya yakla?m??; ilk kay?t 383 ms | Ad?m?n ba?lang?c? kay?t d???nda; toplam mesafe ve yakla?ma ak??? do?rulanam?yor | Ba?lang?c? da kapsayan yakalama ile ad?m? kontrol et |
| #5?#17 ? dalga s1?s4 | Kesik kukla ?zerinde, #14'te ?eki?ten ?izgi ??k?yor | ZAMAN/H?ZA: kesik 450 ms'den itibaren hedefte, ?eki? fiziksel temas? okunmuyor; ilk hasar g?r?nm?yor | ?lk fiziksel vuru?u ?eki? hareketi ve temasla e?le?tir, varsa ilk hasar? o ana koy |
| #18?#20 ? etki yok ? patlama s1 | #18'de sheet efekti yok ama ba?lant? s?r?yor, #19 patlama, #20 hasar | Siyah ekran de?il; k?sa ge?i? | - |
| #20?#46 ? patlama s1?s8 | ?im?ek hedefte b?y?y?p s?n?yor, ??k?? ?eki? ucuna yak?n | Siyah kare veya belirgin konum s??ramas? yok; kareler 60 Hz yakalamada ak?yor | - |

Vuru? an?: ?kinci elektrikli temas #19'da, 5 hasar #20'de; bu e?le?me do?ru. ?lk fiziksel kesik #5'te ba?lamas?na ra?men ayr? fiziksel temas/hasar a??k de?il. Karar: d?zeltilebilir; duzelt. Yakalama 383 ms'de ba?lad???ndan ad?m mesafesi ve ba?lang?? z?plamas? kesin onaylanamaz.


## Tur 5 ? Codex ? kontrol ? 2026-11-08
S?r?m: Real battle   Yakalama: captures/hammer_spark (2026-11-08)
Genel: ?ki hasar evresi ve ?eki?ten ??kan elektrik okunuyor; ilk fiziksel temas h?l? g?rsel olarak kurulmam??.

| Kare (#yakalama ? sheet) | Ne g?r?n?yor | Sorun | ?neri |
|---|---|---|---|
| #5?#6 ? kesik s1 | 450 ms kesik kuklada ba?l?yor; 467 ms 5 hasar ve parlama | HIZA: #6 tam ekranda ?eki? ba?? kukladan yakla??k 200 oyun px sa?da, temas g?r?nm?yor | ?lk kesik/hasar an?nda ?ekici hedefe ula?t?r veya darbeyi a??k?a temas ettiren bir g?rsel ba? kur |
| #12?#13 ? kesik s3 | 567 ms 10 hasar; 583 ms ?eki? ba??ndan kuklaya elektrik | ?kinci say? elektrik g?r?nmeden yakla??k 16 ms ?nce; iki hasar aras?nda yakla??k 100 ms var | Elektrik temas?n? ve ikinci hasar? ayn? kareye yakla?t?r |
| #18?#45 ? patlama s1?s8 | Kuklada elektrik patlamas? b?y?y?p s?n?yor | Belirgin siyah kare veya konum s??ramas? yok | - |

Vuru? an?: ?lk hasar kesikle neredeyse e?zamanl?, fakat ?eki? kuklaya de?miyor; ikinci hasar ile elektrik aras?nda bir yakalama karesi fark var. ?lk fiziksel temas do?rulanmad??? i?in karar: duzelt. Kay?t 383 ms'de ba?lad???ndan yakla?man?n ba?lang?c? do?rulanam?yor.


## Tur 6 ? Codex ? kontrol ? 2026-11-08
S?r?m: Real battle   Yakalama: captures/hammer_spark (2026-11-08)
Genel: ?ki hasar olay? ve elektrik patlamas? ayr? okunuyor; ilk fiziksel temas ve istenen 100 ms aral?k h?l? do?rulanm?yor.

| Kare (#yakalama ? sheet) | Ne g?r?n?yor | Sorun | ?neri |
|---|---|---|---|
| #5?#6 ? kesik s1 | 450 ms kesik; 467 ms 6 hasar ve kuklada parlama | HIZA: #6 tam ekranda Skald??n ?eki? ba?? kuklan?n sa? kenar?ndan yakla??k 100 oyun px sa?da; fiziksel temas g?r?nm?yor | ?lk fiziksel hasar an?nda ?ekici kuklaya de?dir veya a??k temas ba?? kur |
| #13?#19 ? kesik s3?s4 + patlama s1 | Elektrik ba?? 583 ms?de belirir; 14 hasar 683 ms?de patlamayla ??kar | ZAMAN: iki say? 467?683 ms, yakla??k 216 ms aral?kl?; istenen 100 ms de?il. Elektrik ba?? ikinci say?dan yakla??k 100 ms ?nce g?r?n?r | ?kinci hasar ve elektrik ?ak???n? ilk fiziksel temastan yakla??k 100 ms sonraya e?le?tir |
| #19?#45 ? patlama s1?s8 | Kukla ?n?nde patlama b?y?r ve s?ner | Belirgin siyah kare veya konum s??ramas? yok | - |

Vuru? an?: ?lk say? #6?da, ikinci say? ve patlama #19?da. ?kinci say? patlamayla e?le?iyor; ilk ?eki? temas? g?r?nmedi?i ve aral?k ~216 ms oldu?u i?in karar: duzelt. Yakalama 383 ms?de ba?lad???ndan yakla?man?n ba?lang?c? do?rulanam?yor.


## Tur 7 ? Codex ? kontrol ? 2026-11-08
S?r?m: Real battle ? Yakalama: captures/hammer_spark

| Kare | Ne g?r?n?yor | Sorun | ?neri |
|---|---|---|---|
| #5?#9 ? 450?517 ms | Sa?daki Skald yak?nla?m??, kesik soldaki kuklan?n ?zerinde | ?eki? ba?? kuklan?n sa? kenar?na ?ok yak?n ama arada h?l? g?r?n?r bo?luk var; fiziksel temas a??k?a okunmuyor | ?eki? ba??n? ilk darbede kuklan?n kenar?na de?dir |
| #11 ? 550 ms | ?eki? taraf?ndaki temas b?lgesinde elektrik k?v?lc?m? beliriyor | Kesik ba?lang?c?ndan yakla??k 100 ms sonra; 60 Hz yakalamada 70 ms hedefinden yakla??k iki kare ge? | ?lk fiziksel temas ile elektrik ba?lang?c?n? yakla??k 70 ms aral??a getir |

Karar: duzelt. Hasar say?lar?n?n zamanlamas? de?erlendirilmedi; ba?lang??taki yakla?ma kayd?n d???nda.
