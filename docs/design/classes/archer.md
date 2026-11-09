# Archer

> **Ne için / Güncel mi (2026-11-08):** Archer kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/archer.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `archer` / Marksman |
| Ön sıra önceliği, menzil | 8, menzil 6 |
| Stat (STR / INT / DEX / LUCK) | 13 / 13 / 26 / 8, ana stat DEX (toplam 60) |
| Zırh / büyü zırhı | 10 / 0 |
| YZ profili | `sniper` (`data/ai.json > profiles.sniper`) |
| Pasif | **Sharpshooter**: "The farther the target, the harder you hit: 5% more damage for every row of distance." |

- Nişancı: en arkada durur, uzaktan öldürür. En uzun menzil.
- **Güçlü:** hedef ne kadar uzaksa o kadar çok hasar (Sharpshooter). Quick Shot bedava ve Haste verir.
- **Zayıf:** kırılgan, yakında zayıflar; MP'li skill'ler (Arrow Rain) sık atılamaz.
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Quick Shot (`quick_shot`) | Tek hedef, fiziksel DEX; kendine Haste | 0 / yok | sınıf (6) | hasar physical DEX 0,42; status: status=haste, turns=2, self=true |
| Piercing Arrow (`piercing_arrow`) | Hedefin sütunu boyunca delip geçer, her düşmanda azalır | 3 / 2 | sınıf (6) | hasar physical DEX 0,605, falloff=0,7; area={shape:column, stages:row} |
| Arrow Rain (`arrow_rain`) | Gökten 3x3 alana ok yağmuru | 16 / 3 | sınıf (6) | hasar physical DEX 0,4; area={shape:rect, rows:3, cols:3, anchor:bottom_left} |
| Aimed Shot (`aimed_shot`) | Tek hedef güçlü atış, zırhın yarısını yok sayar | 10 / 3, ilk 3 | sınıf (6) | hasar physical DEX 1,455, ignoreDefense=0,5 |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-archer.test.ts`) ve bu tablo birlikte güncellenir.

## 3. Ağaç

Ağaç iki şeye dallanır: duruş ve nişan (hareket etmemek, mesafeyi tutmak) ve ok yoluna göre iş (yavaşlatma, zırh delme, alan). Menzil sınıfının bedeli "yakına gelince zayıf" olduğundan kontrol (Slow, Blind, Stun) mesafeyi korumayı ödüllendirir.

Veri: `data/skill-trees/archer.json` (sürüm 1, bar "Still Bow Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Sharpshooter (pasif):** dolgu Long Sight, Steady Feet, Gap in the Plate, Killing Distance; anahtar Eagle Eye; yön A Patient Aim (ödül Held Breath, uç Tunnel Vision); yön B Long Pin (ödül Range Keeper, uç Exposed Perch); evrim Dead Center. Anahtar: "Half of your Sharpshooter bonus is also added to your critical chance."
- **Quick Shot:** dolgu Hock Shot, Practiced Release, Sting in the Eye, Spiteful Nock; anahtar Shot to the Knee; yön A Cut the Tendon (ödül Hobbled, uç Leg Shot Only); yön B For the Eyes (ödül Blind Panic, uç Gouging Arrow); evrim Maiming Shot. Anahtar: "Quick Shot critical hits always Slow the target for 2 turns."
- **Piercing Arrow:** dolgu Tempered Point, Weighted Head, Narrow Bodkin, Rivet Breaker; anahtar Bodkin Point; yön A Sunder (ödül Shattered Line, uç Brittle Point); yön B Strip Wards (ödül Through the Guard, uç Spent Quarrel); evrim Siege Bolt. Anahtar: "Piercing Arrow ignores 15% of Armor, or 50% against enemies with more Armor than you."
- **Arrow Rain:** dolgu Thick Volley, Scatter Shot, Rear Volley, Stinging Shower; anahtar Hobbling Hail; yön A Spent Arrows (ödül Killing Field, uç Choking Rain); yön B Lingering Hail (ödül Sky Full of Shafts, uç Endless Hail); evrim Arrow Storm. Anahtar: "Arrow Rain extends every Slow on the enemies it hits by 1 turn."
- **Ult Aimed Shot (tek kol seçilir):** u Killing Shot, Heart Shot, Deathblow; r Trophy, Blood Rush, Next in Line; d Snap Shot, Quick Sight, Lightning Draw; l Draw and Vanish, Light Feet, Ghost Archer.
- **Bar Still Bow Mastery:** 5 Still Hands, 10 Knee Shots, 15 Wide Nock, 20 Full Quiver, 25 Plate Reader.

## 4. YZ notları

- Profil: `data/ai.json > profiles.sniper`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).

## 5. Açık işler / kararlar

- Archer artık sefer başlangıç kahramanı değil: `starterPool` = warrior, skald, paladin, druid. Eski karar (madde 326, "yalnız Warrior ve Archer") geçersiz.
- Dizilimde Archer en arkada, Close Ranks (Guard) menzili dışında kalabilir (Ömer 2026-10-17, madde 340).
- Tutorial sınıf önerisi (Hock Shot + Dexterity) Ömer onayı bekliyor (arşiv madde 481).
- Archer'a özel Ömer denge kararı yok.

## 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/archer.md`.
