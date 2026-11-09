# Undead

> **Ne için / Güncel mi (2026-11-08):** Undead kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/undead.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `undead` / Dark Mage |
| Ön sıra önceliği, menzil | 4, menzil 5 |
| Stat (STR / INT / DEX / LUCK) | 26 / 26 / 4 / 4, ana stat INT (toplam 60) |
| Zırh / büyü zırhı | 16 / 0 |
| YZ profili | `darkmage` (`data/ai.json > profiles.darkmage`) |
| Pasif | **Vampiric Bite**: "Heal for 50% of the damage you deal. Your Skeleton's hits heal you the same way." |

- Karanlık büyücü: canını harcayıp geri çalar, dostuna şifa taşır, cesetten Skeleton kaldırır.
- **Güçlü:** Vampiric Bite ve Wail of the Dead ile can çalma; Dark Bond ile şifa; Skeleton çağrısı.
- **Zayıf:** kendi canı kaynak olduğu için düşük canda risk; Wail yarım turdan fazla can yer; Skeleton ceset yoksa zayıf.
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Bone Throw (`bone_throw`) | Tek hedef, karanlık büyü + Slow | 0 / yok | 4 | hasar magic/dark INT 0,567; status: status=slow, turns=2 |
| Wail of the Dead (`wail_of_the_dead`) | Artı şekli, merkezden dışa dalga; karanlık hasar + zehir zemini. Bedel: mevcut canın %20'si | mevcut canın %20'si / 3 | sınıf (5) | hasar magic/dark INT 0,67; ground: ground=poison, turns=2, scale=int, power=0,206; area={shape:plus, stages:distance} |
| Dark Bond (`dark_bond`) | Seçilen dosta bağ (kendine değil). Yarım tur harcar | 10 / 2 | sınıf (5) | bond: turns=4, ratio=0,96; turnCost=0,5 |
| Raise Dead (`raise_dead`) | Kendi tarafına Skeleton çağırır, ceset tüketir | 24 / 5, ilk 1 | sınıf (5) | summon: unit=skeleton, lifespan=4, consumeCorpse=true |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-undead.test.ts`) ve bu tablo birlikte güncellenir.

### Dark Bond ve Skeleton
- **Dark Bond:** Vampiric Bite ile çalınan canın veri oranı kadarı bağlı dostta da şifa olur. Skill yarım tur harcar (`turnCost 0,5`). Blood Rite'ın yerine geldi (madde 240). Kahramana özel imza mekaniğidir (Ömer 2026-10-25), moblarda olmaz.
- **Skeleton** (`data/summons/skeleton.json`): vurucudur, kalkan değil; statlar çağıranın item hariç STR'sinden türer. Ceset tüketirse fed (tam güç), tüketemezse unfed (zayıf). Etiket `undead` (Holy zayıflığı yalnız Skeleton'da). Oyuncu önce tüketilecek ceseti, sonra yuvayı seçer (arşiv madde 232).

## 3. Ağaç

Ağaç "düşük canda güçlen" ile "canı güvenle harca" arasında seçim yaptırır; can eşiklerini ödüllendirir. Dark Bond ve Skeleton ayrı satırlar.

Veri: `data/skill-trees/undead.json` (sürüm 1, bar "Blood Price Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Vampiric Bite (pasif):** dolgu Thin Blood, Tithe Collector, Open Veins, Last Drop; anahtar Sanguine Thirst; yön A Dying Light (ödül Undying Thirst, uç Gaunt Frame); yön B Black Spittle (ödül Stolen Remedy, uç Rancid Blood); evrim Crimson Tide. Anahtar: "While below 50% HP, the first hit you land each turn drains double through Vampiric Bite."
- **Bone Throw:** dolgu Knee Breaker, Marrow Leech, Skull Rattle, Numb Joints; anahtar Crippling Bone; yön A Shattered Shin (ödül Grave Shackle, uç Brutal Hurl); yön B Skull Cracker (ödül Jaw Breaker, uç Mute Marrow); evrim Femur Chain. Anahtar: "Bone Throw's Slow lasts 3 turns instead of 2."
- **Wail of the Dead:** dolgu Bloody Breath, Lingering Moan, Fearful Keening, Tithe Refund; anahtar Scream of Need; yön A Deeper Cut (ödül Blood Banshee, uç Torn Lungs); yön B Blood Hymn (ödül Gorging Howl, uç Bitter Gift); evrim Banshee's Toll. Anahtar: "While you are below 50% HP, Wail of the Dead deals 15% increased damage."
- **Dark Bond:** dolgu Thick Blood, Kindred Pulse, Kindred Guard, Blood Kin; anahtar Lifeline; yön A Transfusion (ödül Blood Ransom, uç Bled Dry); yön B Soul Shield (ödül Blood Oath, uç Iron Oath); evrim Crimson Covenant. Anahtar: "When the bonded ally drops below 30% HP, your next hit drains double and sends all of it to them."
- **Ult Raise Dead (tek kol seçilir):** u Grasping Hands, Cold Grip, Grave Grasp; r Pox Bloom, Spore Cloud, Rot Bomb; d Fresh Meat, Empty Grave, Tomb Knight; l Hulking Frame, Grave Plate, Bone Champion.
- **Bar Blood Price Mastery:** 5 Opening Cut, 10 Red Reserve, 15 Tomb Frost, 20 First Thread, 25 Brink Walker.

## 4. YZ notları

- Profil: `data/ai.json > profiles.darkmage`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).

## 5. Açık işler / kararlar

- "undead" etiketi sınıftan kalktı; Holy zayıflığı yalnız Skeleton'da (arşiv madde 195).
- Rot Bomb Withering'in kalan tiklerinin hepsini bir anda vurur, Withering biter (Ömer 2026-10-22).
- **Teyit edilmedi:** Dark Bond oranı "çalma kadar dosta ver" kararının tam karşılığı mı. Raise Dead MP'si mana turlarında değişti.

## 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/undead.md`.
