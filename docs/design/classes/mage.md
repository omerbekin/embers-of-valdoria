# Mage

> **Ne için / Güncel mi (2026-11-08):** Mage kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/mage.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `mage` / Elemental Mage |
| Ön sıra önceliği, menzil | 7, menzil 6 |
| Stat (STR / INT / DEX / LUCK) | 20 / 26 / 6 / 8, ana stat INT (toplam 60) |
| Zırh / büyü zırhı | 12 / 0 |
| YZ profili | `caster` (`data/ai.json > profiles.caster`) |
| Pasif | **Heat Mirage**: "When an enemy hits the Mage in melee, Burning Ground appears under it for 1 turn (once per round). The Mage takes 10% less Fire and Ice damage." |

- Ateş + buz büyücüsü, arka sıra. Kit: Fire Bolt, Blizzard, Ice Crater, Meteor + pasif Heat Mirage (Ömer reworkü 2026-10-29: Ice Crater Mana Barrier'ın, Heat Mirage Spell Echo'nun yerine geldi).
- Mana Barrier `skills.json`'da `retired: true` olarak duruyor: hiçbir kahramanın kitinde değil, motor kuralı ve eski testler (`tests/mage-legacy-helpers.ts`) korunuyor. Spell Echo etkisi (`spellEcho`) Gambler ve test sınıflarında sürüyor.
- Güçlü / zayıf yan yazılmadı (belgede hiç yoktu).
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Fire Bolt (`fire_bolt`) | Tek düşmana ateş büyü hasarı. | 4 / yok | sınıf (6) | hasar magic/fire INT 1 |
| Blizzard (`blizzard`) | Düşman alanına (3 sıra x 2 şerit) buz büyü hasarı; zemini Chill Ground. | 14 / 2 | sınıf (6) | hasar magic/ice INT 0,7; area={shape:rect, rows:3, cols:2, anchor:bottom_left} |
| Ice Crater (`ice_crater`) | Tek düşman: buz hasarı + Chilled, sonra hedef oyuncunun seçtiği yönde 1 hücre itilir; çarpma ek buz hasarı. | 8 / 3 | sınıf (6) | hasar magic/ice INT 0,85; status: status=chilled, turns=2; push: crashPower=0,2, scale=int, element=ice |
| Meteor (`meteor`) | Artı şekilli alana ateş büyü hasarı + 2 tur Burning zemin. | 20 / 3, ilk 2 | sınıf (6) | hasar magic/fire INT 0,628; ground: ground=burning, turns=2, scale=int, power=0,361; area={shape:plus} |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-mage.test.ts`) ve bu tablo birlikte güncellenir.

### Mage kuralları (Ömer kararları)
- **Frozen (Ömer 2026-10-31):** buz atışı zaten Chilled olan düşmanı dondurur (1 tur kayıp), ateş çözer. Kural: `campaign/maps-2-3.md` M-D. Tek Mage Frozen'da (Ömer 2026-11-01): Frozen ağaç ödülüdür (Deep Freeze, Glacier Crater); Chilled / Ice Crater süresi uzatılmaz.
- **Chilled:** Slow'dan ayrı durum, ikisi birlikte durabilir (çarpanlar çarpılır); CC sayılır, boss bağışıktır. Sayılar `statuses.json > chilled`. Chill Ground (`grounds.json > storm`, Blizzard'ın zemini) içinde turuna başlayan Chilled alır, Slow almaz; Ice (`ice_ground`) Slow vermeye devam eder.
- **Ice Crater:** yön yalnız sıra ya da şerit boyunca (çapraz yok). Hücre doluysa ya da tahta dışıysa itme olmaz, hedef çarpar (hedef ve hücredeki birim `crashPower` hasarı alır). Yer değiştirme bağışık birim (boss, steadfast) itilmez, yalnız hasar + Chilled alır. Hedef ölürse itme yok. Zemin bırakmaz.
- **Ice Crater arayüzü:** hedef seçilince çevresinde 4 ok çıkar (adım 2/2); gidilebilir yön buz mavisi, çarpma yönü kırmızı "Crash N". Esc / sağ tık / Back / ok dışı dokunma yön adımını kapatır. Hedef itilemiyorsa ok çıkmaz.
- **Heat Mirage:** yakın dövüş skill'iyle (`motion: melee`) Mage'e vuran düşmanın hücresi 1 turluk Burning Ground olur; Mage'in iki turu arasında en çok bir kez; uzaktan vuruş ve ölümcül vuruş tetiklemez. Pasifin ikinci etkisi (genel "Frost Skin" küçük etkisi, veride ayrı ad yok): ateş ve buz hasarından %10 az alır (`elemResist`).

## 3. Ağaç

Ağaç v5: Heat Mirage / Ice Crater satırları 2026-10-29'da yeniden yazıldı (sürüm artışı = bedava respec). Mirage Veil (Ömer 2026-10-31): saldıran Chilled yerine 1 tur Blinded olur; Burning zeminde Chilled tutmaz, ağaç düğümü için de istisna yok. Blizzard'ın Slow koşullu düğümleri (Numbing Cold, Flash Freeze, Black Ice) Chilled'ı da sayar.

Veri: `data/skill-trees/mage.json` (sürüm 5, bar "Arcane Tempo Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Heat Mirage (pasif):** dolgu Heat Haze, Searing Mirage, Rime Touch, Cold Comfort; anahtar Lingering Mirage; yön A Backdraft (ödül Stoked Flames, uç Pyre Heart); yön B Rime Skin (ödül Brittle Cold, uç Hoarfrost); evrim Mirage Veil. Anahtar: "Heat Mirage's Burning Ground lasts 2 turns instead of 1."
- **Fire Bolt:** dolgu Focused Bolt, Searing Crit, Clean Shot, Finisher; anahtar Weak Spot; yön A Keen Gaze (ödül Hot Streak, uç Unstable Focus); yön B Execution Bolt (ödül Rolling Doom, uç Reckless Bolt); evrim Sunfire. Anahtar: "Fire Bolt critical hits ignore 20% of Magic Armor."
- **Blizzard:** dolgu Biting Gale, Numbing Cold, Driving Snow, Snow Blindness; anahtar Hard Frost; yön A Flash Freeze (ödül Winter's Grip, uç Black Ice); yön B Whiteout (ödül Lost in the Snow, uç Howling Squall); evrim Eternal Winter. Anahtar: "Blizzard always Slows the enemies in the front row of its area for 1 turn."
- **Ice Crater:** dolgu Deep Crater, Hard Landing, Bitter Frost, Long Chill; anahtar Frozen Crater; yön A Frostbitten Mark (ödül Glacial Spike, uç Battering Frost); yön B Deep Freeze (ödül Black Frost, uç Permafrost); evrim Glacier Crater. Anahtar: "Ice Crater leaves Chill Ground for 2 turns where its target ends up."
- **Ult Meteor (tek kol seçilir):** u Long Smoulder, White Heat, Sea of Fire; r Concussion, Ringing Ears, Earthshaker; d Flung Embers, Ember Hail, Twin Meteors; l Crater's Heart, Molten Core, Extinction.
- **Bar Arcane Tempo Mastery:** 5 Opening Spark, 10 Resonant Kill, 15 Low Tide, 20 Momentum, 25 Encore.

## 4. YZ notları

- Profil: `data/ai.json > profiles.caster`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).
- Ice Crater yönünü YZ basit puanla seçer: kendi tarafının zararlı zeminine itme > çarpma (iki birime hasar) > öne / kalabalığa itme.

## 5. Açık işler / kararlar

- Ödünç görsel: Chilled ve Ice Crater ikonu `blizzard`, Ice Crater vfx `blizzard`, Heat Mirage ikonu `flame`; yön okları kodla çizilir. Kendi sanatı yok.
- Frozen'ın sefer ve Endless etkisi ölçülmedi.
- Karar günlüğü: `docs/archive/design/open-questions-archive.md` madde 452 (rework), 457 (ağaç).

## 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/mage.md`.
