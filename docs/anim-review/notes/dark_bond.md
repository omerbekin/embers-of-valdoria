# Dark Bond · `dark_bond` · Undead (sınıf)

Ömer 2026-10-29: "undeadin animasyonları çok kötü. mevcut skill icon ve efektlerini referans alma. tamamen skillerin amacına ve elementine göre 0dan özgün düşünerek bir skill effect seti chatgptye çizdirir misin /vfx ile uygulayalım sonra"
Sarma üstüne Ömer: "görsellerin tamamı ya karakterlerin üstünde ya da altında kalıyor. etrafını saramıyor" (çözüm: wrap + ghost; Ömer hayalet saydamlığı 0,45 seçti)
Tasarım: `new-art/undead/brief.md` (mevcut ikon/efektler referans DEĞİL). Skill: tek dost, 4 tur bağ (hasarın %96sını paylaşır), yarım tur.

## Tur 1 · Claude · yeni çizim isteği · 2026-10-29
Çizim Codex yerine ChatGPT ile yapıldı (art-pipeline; brief.md prompt'ları). Asıllar `assets/source/undead-vfx/` (4x2, 1774x887, ~443 px kare, gerçek alfa).

## Tur 1 · Claude · ekleme · 2026-10-29
İçe aktarma `node tools/import-class-vfx.mjs undead` -> `assets/vfx/undead/` (320x320 kare, 4x2, alfa korunur). Kesim çizgileri sabit
ızgaradan değil EN BOŞ satır/sütundan (ChatGPT satırları ortada bölünmüyor: ör. 04'te y=452, 05'te y=437); kenara değen küçük komşu
kırıntıları silindi. Ölçüm: hiçbir karede siyah çerçeve / ızgara çizgisi / boş kare yok, içerik kare kenarına değmiyor.
Oynatma `src/game/art-v2/undead/vfx.ts` (kodla çizilen eski efekt kaldırıldı, vuruş anları ve olay sırası aynı):
- `undead/06-dark-bond-thread` (aslı 06-blood-oath-thread): elden dostun göğsüne gerilen dikenli damar teli (sol uç elde, x ölçeği 260 ms'de açılır, döngü; kalınlık 104 px).
- `undead/05-dark-bond-sigil` (aslı 05-blood-oath-sigil): dostun göğsünde kan mührü (squashY 0,62 yatık halka). Dostu SARAR: wrap split 0,5 + ghost 0,45 (arka yarı gövdenin arkasında, önünde hayalet; ön yarı önünde).
- Vuruş: tel dosta vardığı an hit() (eskisiyle aynı), sonra tel 260 ms daha atar ve söner. Yarım tur kum saati değişmedi.
Aynalama: Phaser flipX karenin içinde aynalar; asimetrik dayanakta aynalı tarafta origin x = 1 - ox (`sheetAt`).
Yakalama: `node tools/anim-capture.mjs dark_bond` (atan sağda, düşman tarafı; kukla solda).

## Tur 2 · Claude · düzeltme · 2026-10-29
Yakalama: captures/dark_bond (5187, HMR kapalı). Test dizilimi: Undead (enemy-1, x 1195) dostu Shieldwarden'ın (enemy-0, x 1136) hemen arkasında;
lich'in asa kristali dostun önüne uzandığı için tel kısa (~118 px, elden göğse, açı -10°). Bu dizilimde doğru, mesafe uzayınca tel uzar.
- Sorun: mühür son karede (s7, soluk halka) ~80 ms durup BİRDEN kayboluyordu (#60 → #61).
- Düzeltme (`src/game/art-v2/undead/vfx.ts` darkbond): mühür `keep: true` ile son karede kalır, animasyon bitince (ANIMATION_COMPLETE) 320 ms'de
  söner. Sarma kopyaları (ön yarı + 0,45 hayalet) alfayı izler. Not: tween gecikmesiyle bağlamak işe yaramadı (yakalamada tween'ler
  animasyondan hızlı akıyor, sönme s4'te başlamıştı), bu yüzden bitişe bağlandı.
- Yakalamanın ilk 4 karesi (#1-#4) önceki ısınma atışının sönen mührü; efektin parçası değil.

## Tur 3 · Codex · kontrol · 2026-10-29
Sürüm: Real battle   Yakalama: captures/dark_bond (2026-10-29, 5187)
Genel: Tel sağdaki Undead'in elinden hemen önündeki dost Shieldwarden'ın göğsüne bağlanıyor; mühür dostun gövdesine yatık sarılıyor ve son sönüş yumuşak.

| Kare (#yakalama · sheet) | Ne görünüyor | Sorun | Öneri |
|---|---|---|---|
| #17–#25 · s1–s2 | Kızıl dikenli tel Undead'in uzattığı el/asadan sola, Shieldwarden'ın göğsüne doğru açılıyor; #25'te erişimi tamamlıyor. | - | - |
| #30–#44 · s2–s3 | Tel vuruşu göğüs hizasında; göğüste kızıl mühür belirip kapanıyor. | - | - |
| #52–#68 · s4–s6 | Mühür halkası dostun göğsünde yatık elips gibi, gövdeyi sarıyor; arka yarı arkada, ön yarı önde ve hayalet kopya görünür. | - | - |
| #74–#84 · s7 | Soluk son mühür sabit kalırken alfa kademeli azalıyor; #84'te çok soluk, #85'te yok. | - | - |

Vuruş anı: Telin hedefi Shieldwarden; sol kukla hedef değil. #25 civarında tel dostun göğsüne erişiyor ve mühür bu dost üzerinde açılıyor; yarım tur kum saati de efektin yanında doğru tarafta. İlk dört yakalama karesi önceki atışın artık sönüşüdür. Seçili kare akışında sıçrama, boş/siyah veya kesik kare/kenar yok; sheet'lerde ızgara ve siyah çerçeve görünmüyor. Son mühür #74–#84 arasında düzenli soluyor, ani kesilme yok. Doğru mu: evet.
Karar önerisi: tamam; Tur 2'deki ani son kare kaybolması düzelmiş.

## Tur 4 · Claude · düzeltme · 2026-10-30
Yakın plan (Tur 3 yakalaması #46): lich cast pozundan çıkıp asasını kaldırınca tel atış anındaki el konumunda kalıyor, sol ucu dostun önünde
BOŞLUKTA asılı duruyordu. Düzeltme (`src/game/art-v2/undead/vfx.ts` darkbond): tel vardıktan sonra her karede elin GÜNCEL konumunu izler
(konum, açı ve boy yeniden hesaplanır; tel yok olunca dinleyici kalkar). Yeni yakalama: #30'da (poz değişimi) tel yeni el konumuna geçer,
bu dizilimde kısa kalır ve mührün içinde söner; boşlukta uç yok. Ölçüm frames.json: #29 x1013 w118 → #30 x1159 w30.
## Tur 5 · Codex · kontrol · 2026-10-30
Yakalama: captures/dark_bond (2026-10-30); yakın plan: #20, #26, #29, #30, #33, #37, #46, #56, #64, #70, #74, #78.
Genel: Tur 4'teki el takibi düzeltmesi çalışıyor; tel lich'in yeni pozunda elde/asada bitiyor, boşlukta asılı sol uç ya da yeni konumda sıçrama/çirkin leke görünmüyor. Tur 3'te tamamlanan dost üzerindeki yatık mühür sarma ve yumuşak sönüş korunmuş.

| Kontrol | Gözlem | Sonuç |
|---|---|---|
| #29→#30 · s2 | Lich'in cast pozu değişirken telin sol ucu yeni el/asaya bağlı kalıyor; eski konumda boşta uç bırakmıyor. Kısa tel mührün içinde sönüyor; gözle görünür sıçrama veya leke yok. | İyi |
| #33, #37, #46 · s3–s5 | Mühür Shieldwarden'ın gövdesini yatık biçimde sarıyor; arka/ön parçalar ve saydam hayalet katmanı yerinde. | Tur 3 kalitesi korunmuş |
| #56 · s6; #64, #70, #74 · s7 | Son mühür sabit konumda kademeli sönüyor; #74'te çok silik, #75'ten itibaren görünmüyor. | Ani kaybolma yok |
| #78 | Önceki efekt bitmiş; görünür artık parça yok. | Temiz |

Atan sağdaki Undead; hedef onun dostu Shieldwarden. Soldaki kuklanın yanındaki kum saati/½ bu skill'in hedefi değil, yarım tur göstergesi. Vuruş/bağ Shieldwarden üzerinde. Karar: Tur 4 düzeltmesi başarılı; tamam.
