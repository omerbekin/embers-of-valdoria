# Thunder Skald

> **Ne için / Güncel mi (2026-11-08):** Thunder Skald kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/skald.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `skald` / Storm Hammer |
| Ön sıra önceliği, menzil | 2, menzil 2 |
| Stat (STR / INT / DEX / LUCK) | 24 / 10 / 8 / 18, ana stat STR (toplam 60) |
| Zırh / büyü zırhı | 12 / 0 |
| YZ profili | `aggressive` (`data/ai.json > profiles.aggressive`) |
| Pasif | **Conductor**: "Your lightning deals 25% more damage to targets that are Slowed, Stunned or Shocked, or that your own hit Shocks, Slows or Stuns." |

- STR ön sıra kahramanı, **uzatılmış yakın dövüşçü** (Ömer 2026-11-08: yakın dövüş grubunda, taban menzil 2, Stormcall istisna menzil 3). Yoldaş önerisi rolü ön saf.
- Pasif **Conductor:** Slow / Stun / Shocked düşmana şimşek hasarı fazla. Skill'ler: Hammer Spark (0 MP), Thunder Strike (Shocked verir), War Drum (dostlara Haste), ult Stormcall (zincir şimşek). Ayrıntı veride ve `tests/skald.test.ts`'te.
- **Erişim (Ömer 2026-11-08):** seferde başlangıç kahramanı (`starterPool`; solo açılış sırası Hammer Spark > Thunder Strike > War Drum > Stormcall), bölük / aday havuzunda (`companyPool`, `recruitPool`).
- Kahraman Ömer onaylı (2026-11-07); varsayımlar `docs/archive/design/open-questions-archive.md` "Q-NEW. Thunder Skald" (madde 518).
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Hammer Spark (`hammer_spark`) | Temel saldırı: tek hedefe fiziksel + şimşek bölünmüş vuruş (yarısı armor, yarısı magicArmor); tek isabet / kritik zarı. | 0 / yok | sınıf (2) | hasar physical STR 0,57, split={share:0.5, damageType:magic, element:lightning} |
| Thunder Strike (`thunder_strike`) | Tek hedefe şimşek hasarı, hedefi Shocked yapar. | 6 / 4 | sınıf (2) | hasar magic/lightning STR 0,85; thunder={shocks:true} |
| War Drum (`war_drum`) | Kendi hücresi merkezli 3x3 alan (yalnız kendi tahtası): içindeki dostlar (kendisi dahil) Haste alır. | 8 / 4 | sınıf (2) | status: status=haste, turns=3; area={shape:rect, rows:3, cols:3} |
| Stormcall (`stormcall`) | Ult: tek düşmana şimşek, sonra en zırhlı iki düşmana zıplar (falloff); her isabet Shocked. | 18 / 5, ilk 2 | 3 | hasar magic/lightning STR 1, falloff=0,75; splash={pattern:armor, jumps:2}; thunder={shocks:true} |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skald-tree.test.ts`) ve bu tablo birlikte güncellenir.

## 3. Ağaç

Ağacın fikri: **Slow -> Stun -> MP / cooldown** zinciri (Conductor) ve **Haste'li ekip** (War Drum). Genel "+%X hasar" yok. Conductor'ı her vuruşta açmamak için Hammer Spark'ın durumları koşullu (cond addStatus) eklenir, skill etkisine (addEffect) değil. Test: `tests/skald-tree.test.ts` (düğüm davranışı), `tests/ai-coverage.test.ts` bölüm 7c (her tetik YZ'de). Sayılar tahmin; sim Ömer onayıyla.

Veri: `data/skill-trees/skald.json` (sürüm 1, bar "Saga Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Conductor (pasif):** dolgu Copper Coil, Static Recall, Static Charge, Pressure Front; anahtar First Spark; yön A Rolling Thunder (ödül Storm Tempo, uç Overdrive); yön B Thunderclap (ödül Struck Senseless, uç Hammerfall); evrim Living Storm. Anahtar: "Your first hit on each enemy Slows it for 1 turn."
- **Hammer Spark:** dolgu Drumbeat Swing, Spark Gap, Iron Drag, Same Nail; anahtar Hammer and Anvil; yön A Through the Line (ödül Rolling Hammer, uç Heavy Throw); yön B Split the Storm (ödül Thunder Anvil, uç Cold Iron); evrim Returning Hammer. Anahtar: "Every 3rd Hammer Spark strikes the target a second time."
- **Thunder Strike:** dolgu Opening Bolt, Sky Mark, Grounding, Earthed Bolt; anahtar Forked Bolt; yön A Thunderhead (ödül Storm Lock, uç Iron Sky); yön B Quick Thunder (ödül Drumroll Thunder, uç Restless Sky); evrim Second Thunder. Anahtar: "Thunder Strike also strikes the enemies beside the target for 40% damage."
- **War Drum:** dolgu Taut Skin, Marching Beat, Battle Rhythm, War Song; anahtar Call and Answer; yön A Dancing Steps (ödül Full Chorus, uç Wild Dance); yön B Storm Drum (ödül Storm Song, uç Thunder Drum); evrim Saga of Storms. Anahtar: "Everyone War Drum Hastes gets their next turn 10% sooner."
- **Ult Stormcall (tek kol seçilir):** u Long Arc, Iron Magnet, Storm Breaker; r Storm March, Thunder Tempo, Rolling Drums; d Heavy Air, Overload, Grounded Storm; l Saga of Thunder, Chorus, Final Verse.
- **Bar Saga Mastery:** 5 Opening Verse, 10 Thunder Memory, 15 Drummer's Pace, 20 Charged Air, 25 Last Saga.

## 4. YZ notları

- Profil: `data/ai.json > profiles.aggressive`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).
- `tree-hooks.ts > castCount`: kullanım sonunda hedef listesindeki canlı DOSTLAR da sayılır (Marching Beat / Full Chorus bunu ister).
- `battle.ts > aiProcStatuses`: `procChance`'lı koşullu durum kancaları (Iron Drag) YZ'de şansıyla sayılır; diğer sınıfların kancaları da artık değer alır.
- `ai.ts > treeTriggerValue`: koşullu eklenen durumlar `statusApplied` tetiklerini değerler (Struck Senseless, Grounded Storm, Thunder Memory). `ai.ts > controlValue + treeBuffExtra`: dosta verilen buff'ın ağaç eki değerlenir (Taut Skin, War Song, Battle Rhythm).

## 5. Açık işler / kararlar

- **Altı öneri: onay bekliyor, uygulanmadı** (Ömer 2026-11-08: ağacı henüz görmedi, formla gösterilecek; durumun sahibi `docs/arch/areas/character-design.md` > Açık iş 5): (1) War Drum alanı büyüsün (`self_area` alanı yamalanamıyor; Wild Dance bunun yerine kondu). (2) Conductor durum listesi yaması (pasifin `statuses` alanı ağaçtan değişmiyor). (3) Stormcall +1 sekme (`jumps` yamalanamıyor). (4) Hammer Spark bölünme payı (`split` yamalanamıyor). (5) Tetik `procChance` rank ölçeği (trigger kancasında `rank: 'chance'` ölçmüyor; Mage 0.f3 Rime Touch etkilenebilir, hata adayı). (6) Shocked `statusApplied` olayından geçmiyor (`shock()` doğrudan ekliyor), "Shocked verince" düğümleri yazılamıyor.
- Ağaç sim'i ve denge turu Ömer onayıyla.

## 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/skald.md`.
