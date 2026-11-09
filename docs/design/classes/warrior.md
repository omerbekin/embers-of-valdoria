# Warrior

> **Ne için / Güncel mi (2026-11-08):** Warrior kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/warrior.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `warrior` / Melee Bruiser |
| Ön sıra önceliği, menzil | 1, menzil 1 |
| Stat (STR / INT / DEX / LUCK) | 26 / 12 / 8 / 14, ana stat STR (toplam 60) |
| Zırh / büyü zırhı | 16 / 0, kaynak rage |
| YZ profili | `aggressive` (`data/ai.json > profiles.aggressive`) |
| Pasif | **Berserker**: "The lower your HP, the harder you hit: up to 80% more damage at the brink of death. Losing HP also gives Rage." |

- Ön saf yakın dövüş bruiser: kalkansız, iki elli baltayla dalan, kanla beslenen savaşçı. Dalar, kan kaybeder, kanla geri döner ve bitirir.
- **Güçlü:** canı düştükçe çok sert vurur; Rage ile tek dev darbe; Whirlwind ile can çalar.
- **Zayıf:** büyü zırhı yok; gücü düşük cana bağlı, sağlam başlayan savaşta yavaş açılır; kontrolü (Slow, Stun) azdır, ağaç bunu doldurur.
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Double Strike (`melee_attack`) | Tek hedefe iki fiziksel vuruş; Rage üretir | 0 / yok | sınıf (1) | hasar physical STR 0,35; hasar physical STR 0,35 |
| Whirlwind (`whirlwind`) | İlk iki düşman sırasını süpürür (rect 2x3); verdiği hasarın bir kısmı can olur | 8 / 3 | sınıf (1) | hasar physical STR 0,45, lifesteal=0,2; area={shape:rect, rows:2, cols:3, anchor:bottom_left} |
| Charge (`charge`) | Arka sıradaki dahil tek hedefe atılır, hasar + Stun | 10 / 4 | 4 | hasar physical STR 0,675; status: status=stun, turns=2; ignoreFrontRow=true |
| Headsman's Blow (`headsmans_blow`) | Tüm Rage'i (en az 30) harcayıp tek dev balta darbesi | 30 rage (hepsi) / 5, ilk 1 | sınıf (1) | hasar physical STR 0,5, powerPerRage=0,025 |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-warrior.test.ts`) ve bu tablo birlikte güncellenir.

## 3. Ağaç

Ağaç "can düşük + Rage" kimliğini her skill'e yayar. Double Strike ve Whirlwind Wound ile ortak dil kurar (yaralı hedef = bonus); Charge Rage'i Headsman'a taşır.

Veri: `data/skill-trees/warrior.json` (sürüm 1, bar "Iron Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Berserker (pasif):** dolgu Thick Hide, Grit, Shared Scars, Hardened; anahtar Iron Retort; yön A Measured Mending (ödül Red Line, uç Grave Pact); yön B Stand Firm (ödül Not Today, uç Iron Will); evrim Undying Rage. Anahtar: "The first enemy to drop you below 50% HP is Stunned for 1 turn."
- **Double Strike:** dolgu Knee Cutter, Notched Axe, Hard Knocks, Bone Saw; anahtar Gut Strike; yön A Hamstring (ödül Hobble, uç Crippling Pair); yön B Deep Gash (ödül Butcher's Carve, uç Third Cut); evrim Skull and Knee. Anahtar: "Double Strike's first hit Wounds for 2 turns, so its second hit lands on a Wounded target for 8% increased damage."
- **Whirlwind:** dolgu Steady Spin, Spin Recovery, Hungry Arc, Red Arc; anahtar Gore Wheel; yön A Thirst (ödül Blood Glut, uç Glass Cyclone); yön B Reaping Wind (ödül Crimson Wheel, uç Reaper's Spin); evrim Exsanguinate. Anahtar: "Whirlwind Wounds every enemy it hits for 2 turns."
- **Charge:** dolgu Rolling Start, Vengeful Run, War Gallop, Grim Momentum; anahtar Roaring Charge; yön A Grudge Charge (ödül Payback, uç Martyr's Rush); yön B Blood Up (ödül Into the Fire, uç Reckless Heat); evrim Herald of Ruin. Anahtar: "Your first Charge each battle raises your Rage to at least 30."
- **Ult Headsman's Blow (tek kol seçilir):** u Headsman's Feast, Gravedigger, Grave Robber; r Ringing Headsman, Heavy Toll, Mercy Stroke; d Grim Calm, Clean Slate, Executioner's Calm; l Dreadful Swing, Blinding Spray, Terror.
- **Bar Iron Mastery:** 5 Heavy Hand, 10 Second Wind, 15 Crushing Weight, 20 Stubborn Heart, 25 Stagger Step.

## 4. YZ notları

- Profil: `data/ai.json > profiles.aggressive`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).

## 5. Açık işler / kararlar

- Headsman's Blow yalnız harcanan Rage ile büyür (Ömer 2026-11-08 doğruladı: bugünkü haliyle kalır). Eski "hedefin eksik canıyla büyür" kuralı kaldırıldı; `executeBonus` motor desteği ağaç düğümleri için duruyor.
- Berserker kararı (Ömer 2026-10-17): kalkansız iki elli balta; can kaybı Rage verir, Rage yalnız vurarak gelmez. Whirlwind ilk iki düşman sırasını süpürür (Ömer 2026-10-20).
- Zırh ve Double Strike gücü 2026-11-08 akşamı indirildi (Ömer "şimdilik değiştirme" demişti); bu son hâl için sim yok.
- Ağaç düğüm sayıları tahmin; ağaç sim'i Ömer onayıyla.

## 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/warrior.md`.
