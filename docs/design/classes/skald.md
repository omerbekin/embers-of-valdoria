# Thunder Skald: tasarım dökümanı

> **Durum:** kahraman Ömer onaylı (2026-11-07; varsayımlar `docs/design/open-questions.md` "Q-NEW. Thunder Skald"). Skill sayıları `data/skills.json`, sınıf `data/classes/skald.json` (denge turu ayrı iş). Bu belge şimdilik yalnız ağacı anlatır.

## 1-2. Kimlik ve kit

Kısaca: STR ön sıra kahramanı, **uzatılmış yakın dövüşçü** (Ömer 2026-11-08: yakın dövüş grubunda, menzil 2, Stormcall 3); pasif **Conductor** (Slow / Stun / Shocked düşmana şimşek hasarı +%25), skill'ler **Hammer Spark** (fiziksel + şimşek bölünmüş vuruş, 0 MP), **Thunder Strike** (Shocked verir), **War Drum** (kendi merkezli 3x3, dostlara Haste), ult **Stormcall** (zincir şimşek, Shocked). Ayrıntı veride ve `tests/skald.test.ts`'te.

**Erişim (Ömer 2026-11-08):** Skald seferde **başlangıç kahramanı** (`starterPool`, solo açılış sırası Hammer Spark > Thunder Strike > War Drum > Stormcall) ve bölük/aday havuzunda (`companyPool`, `recruitPool`). Yoldaş önerisi rolü **ön saf** (Ömer 2026-11-08: yakın dövüş grubu; `frontPriority` 3 -> 2, roles `["front"]`; önceden boştu).

## 3. Skill ağacı (`data/skill-trees/skald.json`, sürüm 1, 2026-11-08)

- Mantık: `docs/design/classes/skill-tree-logic.md`. Genel "+%X hasar" yok: her düğüm bir Skald skill'inin oynanışını değiştirir, koşulu ya da bedeli var.
- Yalnız mevcut fx kancaları. Sayılar tahmin; sim Ömer onayıyla.
- Ağacın fikri: **Slow -> Stun -> MP / cooldown** zinciri (Conductor) ve **Haste'li ekip** (War Drum). Hammer Spark sıçrar, Thunder Strike yavaşlatır, War Drum Stormcall'u hızlandırır.
- Conductor'ı her vuruşta açmamak için Hammer Spark'ın durumları koşullu (cond addStatus) eklenir, skill etkisine (addEffect) değil.
- Test: `tests/skald-tree.test.ts` (düğüm davranışı), `tests/ai-coverage.test.ts` bölüm 7c (her tetik YZ'de).

### Conductor (pasif)

| Düğüm | Ad | Etki (oyun içi metin) |
|---|---|---|
| f1 | Copper Coil | Conductor bonus +3% per rank. |
| f2 | Static Recall | Once per turn, when you hit a Shocked enemy, restore 1 MP per rank. |
| f3 | Static Charge | Your skills have +2% critical chance per rank against Slowed, Stunned or Shocked enemies. |
| n0 | First Spark | Your first hit on each enemy Slows it for 1 turn. |
| r | Pressure Front | Your skills deal 3% more damage per rank to Slowed enemies. |
| ea | Rolling Thunder | Once per turn, when you hit a Shocked enemy, your next turn comes 10% sooner. |
| ma | Storm Tempo | Once per turn, when you hit a Slowed enemy, lower Thunder Strike's cooldown by 1 turn. |
| fa | Overdrive | Rolling Thunder brings your next turn 20% sooner (instead of 10%). Conductor bonus -10%. |
| eb | Thunderclap | Your hits on Slowed enemies have a 10% chance to Stun them for 1 turn. |
| fb | Hammerfall | Thunderclap Stuns with a 25% chance (instead of 10%). Thunder Strike costs 4 more MP. |
| mb | Struck Senseless | When you Stun an enemy, restore 4 MP and lower Stormcall's cooldown by 1 turn. |
| v | Living Storm | Conductor bonus +10%. Once per cast, when you kill a Slowed, Stunned or Shocked enemy, cast a free Thunder Strike at 50% power on a random enemy. |

### Hammer Spark

| Düğüm | Ad | Etki (oyun içi metin) |
|---|---|---|
| f1 | Drumbeat Swing | While Hasted, Hammer Spark deals 4% more damage per rank. |
| f2 | Spark Gap | Hammer Spark has +2% critical chance per rank against Shocked enemies. |
| f3 | Iron Drag | Hammer Spark has a 3% chance per rank to Slow the target for 1 turn. |
| n0 | Hammer and Anvil | Every 3rd Hammer Spark strikes the target a second time. |
| r | Same Nail | Hammer Spark deals 3% more damage per rank to the enemy you hit last. |
| ea | Through the Line | Hammer Spark also strikes the enemy behind the target for 40% damage. |
| ma | Rolling Hammer | If Hammer Spark hits 2 enemies, your next turn comes 10% sooner. |
| fa | Heavy Throw | Through the Line strikes for 80% damage (instead of 40%). Hammer Spark costs 4 MP. |
| eb | Split the Storm | Against Shocked enemies, Hammer Spark ignores 20% of armor and magic armor. |
| fb | Cold Iron | Split the Storm ignores 40% (instead of 20%). Hammer Spark deals 20% less damage to enemies that are not Shocked. |
| mb | Thunder Anvil | Hammer Spark has a 25% chance to Stun Shocked enemies for 1 turn. |
| v | Returning Hammer | Hammer Spark +15% power. The hammer flies back through a random enemy for 50% damage. |

### Thunder Strike

| Düğüm | Ad | Etki (oyun içi metin) |
|---|---|---|
| f1 | Opening Bolt | Thunder Strike deals 5% more damage per rank to enemies at full HP. |
| f2 | Sky Mark | Thunder Strike has +3% critical chance per rank against Slowed or Stunned enemies. |
| f3 | Grounding | When Thunder Strike kills an enemy, restore 2 MP per rank. |
| n0 | Forked Bolt | Thunder Strike also strikes the enemies beside the target for 40% damage. |
| r | Earthed Bolt | When Thunder Strike hits a Slowed enemy, restore 2 MP per rank. |
| ea | Thunderhead | Thunder Strike Slows every enemy it hits for 1 turn. |
| ma | Storm Lock | Thunder Strike has a 30% chance to Stun already Slowed enemies for 1 turn. |
| fa | Iron Sky | Thunderhead's Slow lasts 2 turns (instead of 1). Thunder Strike's cooldown is 1 turn longer. |
| eb | Quick Thunder | While Hasted, Thunder Strike's cooldown is 1 turn shorter. |
| fb | Restless Sky | While Hasted, Thunder Strike's cooldown is 2 turns shorter (instead of 1). Without Haste, it costs 4 more MP. |
| mb | Drumroll Thunder | While Hasted, Thunder Strike deals 20% more damage. |
| v | Second Thunder | Thunder Strike +15% power. A second bolt falls on the same spot at the start of your next turn for 60% power. |

### War Drum

| Düğüm | Ad | Etki (oyun içi metin) |
|---|---|---|
| f1 | Taut Skin | War Drum's Haste gives 3% more Speed per rank. |
| f2 | Marching Beat | War Drum restores 1 MP per rank for each ally it Hastes (you not counted). |
| f3 | Battle Rhythm | Units Hasted by your War Drum take 2% less damage per rank. |
| n0 | Call and Answer | Everyone War Drum Hastes gets their next turn 10% sooner. |
| r | War Song | Units Hasted by your War Drum deal 2% more damage per rank. |
| ea | Dancing Steps | War Drum also gives Fleet for 2 turns. |
| ma | Full Chorus | If War Drum Hastes 3 or more units, Thunder Strike's cooldown resets. |
| fa | Wild Dance | Dancing Steps' Fleet lasts 4 turns (instead of 2). War Drum costs 6 more MP. |
| eb | Storm Drum | Each War Drum lowers Stormcall's cooldown by 1 turn. |
| fb | Thunder Drum | Each War Drum lowers Stormcall's cooldown by 2 turns (instead of 1). War Drum Hastes only you. |
| mb | Storm Song | While Hasted, Stormcall deals 20% more damage. |
| v | Saga of Storms | War Drum's Haste lasts 1 turn longer. Each War Drum casts a free Thunder Strike at 60% power on a random enemy. |

### Stormcall (ult)

| Düğüm | Ad | Etki (oyun içi metin) |
|---|---|---|
| u1 | Long Arc | Stormcall's jumps deal 85% damage (instead of 75%). |
| u2 | Iron Magnet | Stormcall deals 2% more damage for every 10 armor the target has. |
| u3 | Storm Breaker | When Stormcall kills an enemy, cast a free Thunder Strike on a random enemy. |
| r1 | Storm March | Stormcall is ready 1 turn sooner at the start of battle. |
| r2 | Thunder Tempo | After Stormcall, your next turn comes 25% sooner. |
| r3 | Rolling Drums | Stormcall resets War Drum's cooldown. |
| d1 | Heavy Air | Stormcall Slows every enemy it hits for 1 turn. |
| d2 | Overload | Stormcall has a 25% chance to Stun already Slowed enemies for 1 turn. |
| d3 | Grounded Storm | When Stormcall Stuns an enemy, restore 6 MP and reset Thunder Strike's cooldown. |
| l1 | Saga of Thunder | Stormcall Hastes you for 2 turns. |
| l2 | Chorus | After Stormcall, your next War Drum costs no MP. |
| l3 | Final Verse | When Stormcall kills an enemy, all allies get their next turn 10% sooner. |

### Saga Mastery (bar)

| Puan | Ad | Etki |
|---|---|---|
| 5 | Opening Verse | Your first War Drum each battle costs no MP. |
| 10 | Thunder Memory | The first time you Stun an enemy each battle, restore 5 MP. |
| 15 | Drummer's Pace | You start each battle Hasted for 1 turn. |
| 20 | Charged Air | Conductor bonus +5%. |
| 25 | Last Saga | When an ally falls, your next turn comes 30% sooner. |

### Motor / YZ ekleri (ağaçla birlikte, 2026-11-08)

- `tree-hooks.ts > castCount`: kullanım sonunda hedef listesindeki canlı DOSTLAR da sayılır (dost hedef isabet zarı atmaz). Eskiden buff skill'inde sayı hep 0'dı; Marching Beat / Full Chorus bunu ister. Düşman hedefli skill'de değişiklik yok.
- `battle.ts > aiProcStatuses`: procChance'lı koşullu durum kancaları (Iron Drag) YZ'de şansıyla sayılır (eskiden hiç sayılmazdı). Diğer sınıfların procChance'lı durum kancaları da artık YZ'de değer alır.
- `ai.ts > treeTriggerValue`: koşullu eklenen durumlar (Thunderclap / Thunder Anvil / Storm Lock / Overload Stun'u) `statusApplied` tetiklerini değerler (Struck Senseless, Grounded Storm, Thunder Memory).
- `ai.ts > controlValue + treeBuffExtra`: dosta verilen buff'ın ağaç eki (statusPotency + "bu durumu taşıyan dost daha az hasar alır" kancası) değerlenir (Taut Skin, War Song, Battle Rhythm).

### Öneriler (yeni kanca / mekanik; Ömer 2026-11-08 altısını da ONAYLADI, henüz uygulanmadı)

1. **War Drum alanı büyüsün** (3x3 -> 3x5 gibi): `self_area` alanı yamalanamıyor ("war_drum is not an area skill"). Wild Dance bunun yerine kondu.
2. **Conductor durum listesi yaması** (ör. Chilled eklemek): pasifin `statuses` alanı ağaçtan değişmiyor.
3. **Stormcall +1 sekme**: zincirin `jumps` alanı yamalanabilir değil.
4. **Hammer Spark bölünme payı** (fiziksel / şimşek oranı): `split` payı yamalanamıyor.
5. **Tetik procChance rank ölçeği**: trigger kancasında `rank: 'chance'` procChance'ı ölçmüyor (yalnız cond kancada). Mage 0.f3 Rime Touch bundan etkileniyor olabilir (hata adayı).
6. **Shocked tetiği**: Shocked `statusApplied` olayından geçmiyor (`shock()` doğrudan ekliyor); "Shocked verince" düğümleri yazılamıyor.
