# Undead: tasarım dökümanı

> Kaynak: `data/classes/undead.json`, `data/skills.json`, `data/summons/skeleton.json`, `data/skill-trees/undead.json` (sürüm 1), 2026-11-08. Ağaç mantığı: `skill-tree-logic.md`.

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `undead` / Dark Mage |
| Ön sıra önceliği, menzil | 4, menzil 5 |
| Stat (str / int / dex / luck) | 26 / 26 / 4 / 4, primary INT |
| Zırh | 16 zırh, 0 büyü zırhı |
| YZ | `darkmage` |

- **Güçlü yan:** canını harcayıp geri çalar (Vampiric Bite, Wail of the Dead); Dark Bond ile dostuna şifa taşır; cesetten Skeleton kaldırır. Kazanma %53,4 / %54,3 (2026-11-08), sınıflar arasında en üst grup.
- **Zayıf yan:** kendi canı kaynak olduğu için düşük canda risk; Wail yarım turdan fazla can yer; Skeleton ceset yoksa ~%33 zayıf.

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Sayı |
|---|---|---|---|
| Bone Throw | Tek hedef, karanlık büyü + Slow | 0 / yok | INT güç 0,567; Slow 2 tur; menzil 4 |
| Wail of the Dead | Artı şekli, merkezden dışa dalga; karanlık hasar + zehir zemini. Bedel: mevcut canın %20'si | HP / 3 | güç 0,67; zehir zemini 0,206, 2 tur |
| Dark Bond | Seçilen dosta bağ (kendine değil). Yarım tur harcar | 10 / 2 | 4 tur; oran 0,96 |
| Raise Dead (4. yuva) | Kendi tarafına Skeleton çağırır, ceset tüketir | 24 / 5 (ilk bekleme 1) | ömür 4 tur |

### Dark Bond
- Undead'in Vampiric Bite ile çaldığı canın (veri oranı 0,96) neredeyse aynısı bağlı dosta da şifa olarak gider. Skill `turnCost 0,5`: yarım tur harcar (hızlı tekrar oynama).
- Blood Rite'ın yerine geldi (madde 240). Süre 3 -> 4 tur (Ömer 2026-10-24).
- Dark Bond kahramana özel imza mekaniğidir (Ömer 2026-10-25, form O7); moblarda olmaz.

### Skeleton (`data/summons/skeleton.json`)
- Vurucudur, kalkan değil. Statlar çağıranın item hariç STR'sinden türer: STR = çağıran STR x 1,86, maks can = çağıran STR x 3,0, yenilenme STR x 0,1442. L1 Undead: STR 48, can 78, hız 17, zırh 6.
- Ceset tüketirse **fed** (tam güç), tüketemezse **unfed** (can ve STR x0,67). Skill'leri: Skeleton Strike ve Bone Slash. Etiket `undead` (Holy zayıflığı yalnız Skeleton'da).
- Oyuncu önce tüketilecek ceseti, sonra yuvayı seçer (arşiv madde 232).

## 3. Pasif ve skill ağacı

### Pasif: Vampiric Bite
Etki `soulDrain`, ratio 0,5: verdiği hasarın %50'si kadar can çalar (Skeleton hasarından gelen şifa da aynı oran). Veride `text` yazıldı (2026-11-08).

### Ağaç mantığı
Class kimliği: **kan bedeli ve çalma**. Ağaç bu yüzden "düşük canda güçlen" ile "canı güvenle harca" arasında seçim yaptırır; Dark Bond ve Skeleton ayrı satırlardır.

| Satır | Ana fikir | ea / eb yönü | Evrim (v) |
|---|---|---|---|
| Vampiric Bite | Çalma ve düşük can | **Dying Light** (%50 altı büyü zırhı yok sayar; ma Undying Thirst: ölümcül vuruşta 1 can kalır) / **Black Spittle** (vuruş Wound'lar; mb Stolen Remedy). Kan: Gaunt Frame (çalma %70, maks can -%20) / Rancid Blood (Wound +2 tur, çalma -%20) | Crimson Tide: can ödedikçe çalma büyür |
| Bone Throw | Slow'dan Stun'a | **Shattered Shin** (Slow'luya Stagger şansı; ma Grave Shackle: Slow'lu + %50 altı Stun) / **Skull Cracker** (Silence şansı; mb Jaw Breaker: Silence'lıya Jinx). Kan: Brutal Hurl (Stagger %40, hasar -%20) / Mute Marrow (Silence %50, Slow yok) | Femur Chain: arkadakini de vurur, 3 tur Slow |
| Wail of the Dead | Can bedeli ile güç | **Deeper Cut** (can %30, hasar +%30; ma Blood Banshee: bedel kadar ek hasar) / **Blood Hymn** (bedeli bağlı dosta şifa; mb Gorging Howl: 3+ vurursa bedel geri). Kan: Torn Lungs (bekleme 2, can %40) / Bitter Gift (Blood Hymn x2, hasar -%25) | Banshee's Toll: sahadaki herkese, can %30, çalma x2 |
| Dark Bond | Bağın gücü | **Transfusion** (can taşır; ma Blood Ransom: ölümcül vuruşu sen yersin) / **Soul Shield** (dosta kalkan; mb Blood Oath: hasarın %15'ini sen alırsın). Kan: Bled Dry (Transfusion %30, bekleme 3) / Iron Oath (Oath %60, çalma -%20) | Crimson Covenant: bağ süresiz, biri düşene ya da yeni bağa kadar |

- **Ult kolları (Raise Dead / Skeleton):** u = tutma (Grasping Hands: Slow, Cold Grip, Grave Grasp: ilk vuruş Stun); r = ölümde zehir (Pox Bloom, Spore Cloud, Rot Bomb: Withering'i patlatır); d = ceset (Fresh Meat, Empty Grave: cesetsiz kurma +8 MP, Tomb Knight); l = dayanıklılık (Hulking Frame, Grave Plate, Bone Champion: ölene kadar yaşar, bekleme 7).
- **Mastery bar "Blood Price Mastery":** 5 Opening Cut (ilk can bedelli skill çift çalar), 10 Red Reserve (ilk kez %50 altına inince sonraki skill bedava), 15 Tomb Frost (ilk Bone Throw +1 tur Slow), 20 First Thread (ilk Dark Bond dostu da %5 iyileştirir), 25 Brink Walker (%25 altına inince Wail bekleme sıfırlanır).
- **Neden:** pasifin kimliği can çalmak; ağaç can eşiklerini (%50, %30) ödüllendirir, Dark Bond'u takım şifası yapar.

## 4. Ömer kararları

- 2026-10-17, madde 347: Vampiric Bite oranı 0,35 -> 0,50 (Ömer düzeltmesi; ilk istek 0,385).
- Arşiv madde 195: "undead" etiketi sınıftan kalktı (Holy zayıflığı yalnız Skeleton'da).
- Arşiv madde 240: Undead lifesteal %35; Blood Rite yerine Dark Bond (çalma kadar dosta ver, yarım tur harcar, 3. skille yer değiştir). Tarih arşivde net değil.
- Arşiv madde 232: Raise Dead'de önce ceset, sonra yuva seçilir (Ömer isteği).
- 2026-10-18, madde 351: Skeleton hasarı +%20 (str çarpanı 1,55 -> 1,86), can -%5; ardından hız 12 -> 17 ve can +%10.
- 2026-10-22, madde 393 (17): Rot Bomb Withering'in kalan tiklerinin hepsini bir anda vurur, Withering biter.
- 2026-10-24, madde 414 (4): Dark Bond süresi 3 -> 4 tur.
- 2026-10-25 (`docs/arch/areas/character-design.md`, form O7): yalnız Omen (Hexer) ve Dark Bond (Undead) kahramana özel imza mekaniği.

## 5. Açıklar

- Vampiric Bite `text` alanı 2026-11-08de yazıldı (veri).
- **Veri / metin çelişkisi:** Dark Bond veride 4 tur; ağaç metni Crimson Covenant "no longer ends after 3 turns" diyor. Metin 4'e çevrilmeli (kod / data'ya dokunmadım).
- Dark Bond oranı 0,96: "çalma kadar dosta ver" kararının tam karşılığı mı, teyit edilmedi.
- Raise Dead MP 24; mana turlarında değişti, madde numarası bulunamadı.
