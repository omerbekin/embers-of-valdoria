# Skill ağacı mantığı (tüm class'lar)

> **Ne için / Güncel mi (2026-11-08):** düğüme NE yazılacağının tasarım kuralı (CANLI sahip; 13 sınıfın ağacı bu kurala göre yazıldı). Nasıl yazılacağı (fx sözlüğü, yeni düğüm adımları): `../skill-tree-fx-reference.md`. Şekil ve kilit sayıları: `../skill-tree-moments.md` + `data/skill-trees/_rules.json`.

Kaynak: mevcut ağaçlar (Warrior, Paladin, Mage, Hexer, Defender, Undead, Cutthroat) incelendi, 2026-11-08.
Şekil ve kilit sayıları: `data/skill-trees/_rules.json`, `docs/design/skill-tree-moments.md`.
Tarihçe (arşiv): `docs/archive/design/skill-tree-{structures,mastery,mastery-v2,moments-variants}.md`, `skill-trees-grimdawn.md`. Ömer kararları (2026-10-20/21): her düğüm 1 puan, puan = level − 1, evolve yerinde evrilir (yeni aktif skill yok), 1. evolve L25 / 2. evolve L40, ult tek kol (+ şekli, L5/L10/L15, evolve yok), Mastery bar sayacı ult'u saymaz; ağaçta genel stat düğümü yok (item = genel stat, set = pasif/kaynak sayısı).
Bu belge "düğüme ne yazılır" sorusunu cevaplar.

## 0. Pasif (ağacın kökü)

- Pasif sınıfın imza mekaniğidir; ağaç ilk satırı pasifin kendisidir (Berserker, Divine Light, Spellbreaker's Instinct...).
- Pasifin ağaç satırı da aynı şekli izler (dolgu, n0, yön, ödül, bedelli uç, evrim); evrim pasifin davranışını değiştirir.
- Pasif genel stat vermez; bir koşula ya da kaynağa bağlanır (düşük can, MP ödeyen düşman, durumlu hedef).
- Pasifin bar'ı ve diğer satırlar pasifin temasına bağlanır: ağaç sınıf kimliğini her skill'e taşır.
- Örnekler: `classes/warrior.md`, `paladin.md`, `antimage.md` bölüm 3.

## 1. Tek kural

- Ağaç **skill'in oynanışını** değiştirir. Genel stat vermez.
- Genel stat item'ın işi. Set bonusu pasifin işi.
- "Skill'lerin +%X hasar" gibi koşulsuz düğüm yazılmaz.
- Her güç ekinin bir **koşulu**, **ölçeği** ya da **bedeli** vardır.

## 2. Satır şekli (her skill satırı)

| Düğüm | Tür | Rank | Ne yazılır |
|---|---|---|---|
| f1, f2, f3 | dolgu | 3 / 5 / 5 | Skill'in kendi mekaniğine bağlı küçük ek (koşullu güç, ölçek, durum şansı) |
| n0 | notable | 1 | Skill'e yeni bir davranış katar (anahtar) |
| r | dolgu | 3 | n0'nun davranışına binen küçük ek |
| ea / eb | yön | 1 | İki ayrı oyun tarzı; biri alınınca öbürü kilitlenir |
| ma / mb | ödül | 1 | Seçilen yönün büyük ödülü |
| fa / fb | kan bedeli | 1 | Yönü uca taşır, karşılığında açık bir bedel; çıkmaz sokak |
| v | evrim | 1 | Skill'in davranışı değişir (ayrı "more" çarpanı sayılır) |

- Şema ve rank / tier / kilit değerleri: `../skill-tree-moments.md` bölüm 1-2, değer `data/skill-trees/_rules.json > rowShape`.
- Sıra doğrusal: f1 > f2 > f3 > n0 > r > ea|eb > ma, fa | fb, mb > v.
- Önceki düğüm hep alınmış olur. Sonraki düğüm ona güvenebilir.
- fa ea'nın arkasında, fb eb'nin arkasında.

## 3. Dolgu (f, r) kalıpları

| Kalıp | Örnek |
|---|---|
| Durumlu hedefe güç | Mage: Chilled'a +%X |
| Ölçek | Paladin: seri kullanım başına; Hexer: vurulan hedef başına |
| Durum şansı (rank'lı) | Warrior: Slow şansı `byRank` |
| Durum gücü | Hexer: Jinxed isabeti daha çok düşürür (`statusPotency`) |
| Küçük kaynak | Defender: Stun tutunca MP |

## 4. Yön (ea / eb) ve ödül (ma / mb)

- İki yön iki farklı soruya cevap verir. Örnek: "çok hedef mi, tek hedef mi?"
- ma / mb yalnızca kendi yönünü ödüllendirir.
- Ödül çoğu zaman bir **tetik** olur: öldürünce, Stun tutunca, üçüncü seride.

## 5. Kan bedeli (fa / fb)

- Kazanç + bedel aynı düğümde.
- Çoğu zaman yönün düğümünü güçlü hâliyle değiştirir (`drop: "<düğüm>"`).
- Bedel örnekleri: MP artar, bekleme uzar, güç düşer, bir durum kalkar.
- Sınır (cap) eklenmez. Denge bedelle kurulur.

## 6. Evrim (v)

- Skill'in yaptığı iş değişir: ikinci vuruş, bedava kullanım, yayılma.
- Düz "+%30 güç" tek başına evrim değildir; yanında bir davranış olmalı.

## 7. Ult ve Mastery bar

| Parça | Kural |
|---|---|
| Ult kolları (u / r / d / l) | Her kol tek tema; 3 düğüm L5 / L10 / L15; yalnız tek kol |
| Mastery bar (5 / 10 / 15 / 20 / 25) | Class kimliğine küçük, otomatik ekler; genel hasar değil |

## 8. Teknik kurallar

- Mevcut fx kancaları kullanılır: hangileri ve nasıl yazılacağı `../skill-tree-fx-reference.md`. Yeni kanca = yeni mekanik = Ömer'e sorulur.
- **Düğümü eklerken adımlar** (tasarım kuralı bu belge -> veri `data/skill-trees/<sınıf>.json` -> fx `../skill-tree-fx-reference.md` -> YZ değeri `src/engine/ai.ts` -> test `tests/skill-tree-fx-<sınıf>.test.ts`, `tests/skill-tree-text.test.ts`, `tests/ai-coverage.test.ts` -> belge `classes/<sınıf>.md` bölüm 3): ayrıntı `../skill-tree-fx-reference.md` başındaki "Yeni düğüm eklemek için".
- Her tetik YZ değeriyle ve testle gelir (`src/engine/ai.ts`, `tests/ai-coverage.test.ts`).
- Oyun içi metin İngilizce, kısa: "Toll deals 15% more damage to ...".
- Yüzde sonuçları en çok 3 ondalık.
- Sayılar sim ile oturur; sim Ömer'in onayıyla.

## 9. Örnek: Vesper (2026-11-08)

| Satır | Tema | ea yönü | eb yönü |
|---|---|---|---|
| Pealing Bells | Çan ritmi | Hız + cooldown | Cracked Bell da çalar, düşük MP |
| Toll | Seri çalma | Seri: Shaken + Great Bell yakın | En düşük cana, öldürünce çan |
| Thunderpeal | Blind + sıra | Arka sıraya vuruş | Blind'lıya Stun + kritik |
| Cracked Bell | Stun + tek hedef | Stun zinciri (Thunderpeal sıfırlanır) | Elit / boss vurucu |

Ayrıntı: `docs/design/classes/vesper.md` bölüm 3.
