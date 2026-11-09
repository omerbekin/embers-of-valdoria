# Anti-Mage

> **Ne için / Güncel mi (2026-11-08):** Anti-Mage kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/antimage.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `antimage` / Mana Hunter |
| Ön sıra önceliği, menzil | 3.5, menzil 4 |
| Stat (STR / INT / DEX / LUCK) | 8 / 26 / 12 / 14, ana stat INT (toplam 60) |
| Zırh / büyü zırhı | 12 / 40 |
| YZ profili | `antimage` (`data/ai.json > profiles.antimage`) |
| Pasif | **Spellbreaker's Instinct**: "When an enemy uses a skill that costs MP on your team, your next turn comes 10% sooner (once per round)." |

- Mana avcısı: kadın, hançer fırlatır (savaşta hedefe koşmadan yerinden atar). Düşmanın büyü gücünü yakar; düşman takımı MP harcayınca tur sırası öne kayar.
- **Güçlü:** büyücü ve MP'li düşmana karşı çok güçlü; büyü zırhı yüksek; MP'siz düşmana da "tainted mana" ile hasar yazar; takımına kalkan taşır.
- **Zayıf:** zırh düşük, fiziksel hasara açık; düz hasarı sınırlı, gücü damga + yakım zincirine bağlı.
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

Ley Brand'in skill id'si `drain_field` (Drain Field'ın yerine geldi, Ömer 2026-10-27); görsel ve ses Drain Field'ınki, durum ikonu yer tutucu, Instinct ikonu ödünç (overflow).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Mana Steal (`mana_burn`) | Tek hedefe arcane büyü hasarı, MP yakar, yakılanın yarısını sana verir, 2 tur Ley Thread bırakır | 0 / yok | 4 | hasar magic/arcane INT 0,665; manaBurn: amount=7, gainRatio=0,5; status: status=ley_thread, turns=2 |
| Ley Brand (`drain_field`) | 3x3 alandaki her düşmana 3 tur Branded. MP'siz düşman maks canının %20'si kadar tainted mana alır; MP'li düşmanın bedelleri 1,5 kat. Yakılan her MP hasar olur; süre bitince kalan tainted mana patlar | 12 / 3 | 4 | brand: turns=3, taintPct=0,2, costMult=1,5, burnDamagePct=0,49, explodePct=0,49, castBurnPct=0,5, markDamagePct=0,4, markSkills=[mana_burn, void_strike], threadTurns=2, threadBurnMult=1,5, element=arcane; area={shape:rect, rows:3, cols:3, anchor:bottom_left} |
| Spell Ward (`spell_ward`) | Dosta ya da kendine büyü kalkanı; emdiği her darbede saldıranın MP'sini yakar, buff'ını silme şansı | 12 / 3 | sınıf (4) | shield: scale=int, power=0,75, shieldType=magic, onAbsorb={burnMana:8, dispelChance:0.25} |
| Void Strike (`void_strike`) | Tek hedefe büyük arcane hasar; hedefin eksik MP'si hasarı büyütür | 28 / 3, ilk 3 | sınıf (4) | hasar magic/arcane INT 0,95, bonusPerMissingMana=1 |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-antimage.test.ts`) ve bu tablo birlikte güncellenir.

## 3. Ağaç

Ağaç "yak, işaretle, hızlan": Instinct tempo, Mana Steal tek hedef MP hırsızlığı, Ley Brand alan baskısı, Spell Ward takım koruması.

Veri: `data/skill-trees/antimage.json` (sürüm 5, bar "Warden's Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Spellbreaker's Instinct (pasif):** dolgu Keen Senses, Taut Thread, Thread Sense, Pull Taut; anahtar Long Thread; yön A Quickened Instinct (ödül Ready Reflexes, uç Hair Trigger); yön B Twin Thread (ödül Snapping Thread, uç Thin Thread); evrim Spellbreaker's Fury. Anahtar: "Ley Thread lasts 1 turn longer."
- **Mana Steal:** dolgu Generous Cut, Deep Pockets, Deep Cut, Bare Steel; anahtar Prying Blade; yön A Siphon Vein (ödül Drink Deep, uç Drained Dry); yön B Quickening Steal (ödül Tempo Thief, uç Hurried Hands); evrim Spellsplitter. Anahtar: "Mana Steal removes one random buff from its target."
- **Ley Brand:** dolgu Deep Taint, Searing Brand, Heavy Toll, Bitter Burst; anahtar Hush of the Brand; yön A Focused Brand (ödül Lasting Brand, uç Narrow Brand); yön B Wider Brand (ödül Searing Grasp, uç Thin Brand); evrim Spreading Brand. Anahtar: "A Branded enemy whose mana reaches 0 is Silenced for 1 turn."
- **Spell Ward:** dolgu Layered Ward, Ward Mending, Deep Reserve, Shelter Echo; anahtar Purging Ward; yön A Split Ward (ödül Second Ward, uç Stretched Ward); yön B Ward Taunt (ödül Bastion of Null, uç Cloistered Ward); evrim Mirror Ward. Anahtar: "Spell Ward first removes every debuff from the warded ally."
- **Ult Void Strike (tek kol seçilir):** u Crippling Void, Spell Shatter, Void Shackle; r Opening for All, Shared Spoils, Feeding Frenzy; d Swift Void, Ready Blades, Threaded Void; l Rallying Break, Turned Boons, Grand Theft.
- **Bar Warden's Mastery:** 5 Ready Stance, 10 Quick Fingers, 15 Wide Basin, 20 Warded Steps, 25 Void Focus.

## 4. YZ notları

- Profil: `data/ai.json > profiles.antimage`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).

## 5. Açık işler / kararlar

- **Ley Brand kuralı (Ömer 2026-10-27 / 10-29, arşiv madde 444):** 3x3 alandaki her düşman Branded olur (boss dahil, CC değil), hasar ve isabet zarı yok. MP havuzu olmayan düşman maks canının bir payı kadar "tainted mana" alır (harcayamaz, yenilenme almaz; Mana Steal çalar, Spell Ward yakar, Void Strike eksik manayı sayar); MP'li düşmanın bedelleri 1,5 kat. Branded birimin yakılan / çalınan MP'sinin yarısı büyü hasarı olur; süre doğal bitince kalan tainted mana'nın yarısı damgalayandan patlar. Yeniden atış süreyi tazeler, havuzu doldurmaz. Silence skill'de yok, ağaçta (Hush of the Brand). Sayılar: `data/skills.json > drain_field`.
- Mana Steal Ley Thread bırakır (2 tur): iplikli hedefte Brand 2 tur uzun, yakım 1,5 kat, iplik tüketilir; Branded hedefe Mana Steal ve Void Strike %40 fazla vurur (Ömer 2026-10-29; `castBurnPct`, `threadBurnMult`, `markDamagePct`). Spell Ward dosta ya da kendine atılır (madde 240).
- **Açık (Lead kararı):** Drained Dry düğüm metni "burns 15 MP instead of 10" Mana Steal'in 10 MP yaktığını varsayar; veri 7 MP yakıyor. Düğüm metni ya da değer hizalanmalı.
- Ağaçta Mana Overflow düğümlerinin `inactive` temizliği kontrol edilmedi. Ağaç sim ile oturmadı.

## 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/antimage.md`.
