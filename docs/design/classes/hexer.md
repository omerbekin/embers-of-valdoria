# Hexer

> **Ne için / Güncel mi (2026-11-08):** Hexer kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/hexer.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `hexer` / Curse Caster |
| Ön sıra önceliği, menzil | 6.5, menzil 5 |
| Stat (STR / INT / DEX / LUCK) | 18 / 10 / 6 / 26, ana stat LUCK (toplam 60) |
| Zırh / büyü zırhı | 8 / 0 |
| YZ profili | `hexer` (`data/ai.json > profiles.hexer`) |
| Pasif | **Ill Omen**: "When a cursed enemy dies, its Omens pass to the nearest enemy (at most 2). If Doom or Doom Mark kills it, nothing passes on. Passed Omens never trigger Doom." |

- Lanetçi: LUCK ana stat, uzak menzil, tüm hasarı `scale: luck` büyü / karanlık. Köy kenarı cadısı: kötü alameti (Omen) hedefe biriktirir, üç alamet tamamlanınca **Doom** iner. Kadın (Ömer Ö9). Medieval, hayvan ve kafatası motifi yok (Undead ile karışmasın).
- **Luck'ın rolü (yeni global kural gerekmedi):** isabet = lanetin tutması; kritik lanet = 2 Omen; hasar = `scale: luck`; hedefte biriken Omen hedefin kritik şansını düşürür (Misfortune). Tek "şans" kuralı skill verisinde (`omen.critStacks`).
- **Güçlü:** büyü hasarı (çoğu sınıfın büyü zırhı düşük, zırhlı tanklara verimli); Doom iskasız; rakip kritiklerini bastırır (Misfortune, Jinx); alan baskısı (Withering Curse) + tek hedef bitirici (Doom Mark).
- **Zayıf:** kırılgan; hasarın önemli kısmı ertelenmiş (Omen Doom'a dönene kadar rakip oynar); tek hedefli lanetler Taunt'a tabi; büyü kalkanları (Spell Ward, Mana Barrier) Doom'u emer; Smoke Bomb (Blinded) lanetleri iskalatır.
- Takımdaki yeri: orta-arka sıra hasar vericisi (destek değil: şifa / kalkan / buff yok). Çalışan testler: `tests/hexer.test.ts`, `tests/skill-tree-fx-hexer.test.ts`; motor kuralları `docs/design/combat.md > Hexer`.
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

### Mekanik kuralları (sayılar veride; burada yalnız kural)

**Omen** (`statuses.json > omen`, tooltip "Bad Omen"): debuff, yığın üst sınırı `maxStacks`. Hexer'in isabet eden her laneti +1 Omen, kritik lanet +2 (`critStacks`); iska Omen eklemez. Süre `duration` tur (taşıyanın kendi turları); skill ile eklenen her yeni Omen süreyi tam süreye yeniler (`refreshOnStack`). Resilience zarı yalnız ilk Omen konduğunda atılır, yenileme zarsız. Yığın hedefe aittir: iki Hexer aynı yığını doldurur.

**Doom** (LUCK ölçekli büyü / karanlık; `omen.doom`): (a) yığın `maxStacks`'a ulaştığı an otomatik, (b) süre dolunca yığındaki Omen sayısı kadar (`burstOnExpire`), (c) Doom Mark yığın kaç olursa olsun, çarpan `detonate.mult`. Hasar = `doom.powerPerStack` x Omen sayısı x çarpan. İsabet zarı yok (iska yok), kritik zarı var. Doom Mark patlatınca hedefin tüm Omen'leri harcanır; otomatik Doom ayrıca patlamaz (çift patlama yok).

- **Snapshot:** süre bitimi Doom'u, son Omen'i ekleyen Hexer'in o andaki Luck ve kritik değerleriyle patlar; Hexer ölse de lanetler sürer (Ö3).
- **Misfortune** ayrı durum değil, Omen'in yan etkisi: yığın başına kritik şansı düşer (`critDeltaPerStack`); Omen süresi bitince biter.
- **Uzatma yerine Doom bonusu (Ömer 2026-11-07):** Omen'e tur ekleyecek her etki süreyi uzatmaz, `extraTurns` sayar; Doom çarpanı her ek tur için `bonusPerExtraTurn` artar. Bugün tek kaynak Gambler ağacı "Let It Ride" (`extendStatus`). Kısaltmalar (Resilience, Iron Will, ağaç) aynen çalışır.
- **Guard / kalkan:** skill ile tetiklenen Doom (a, c) skill vuruşunun parçasıdır: Guard paylaşımı ve kalkan işler. Süre bitimi Doom (b) tur başı durum hasarıdır (Wither tiki gibi): Guard'a aktarılmaz (Ö12), kalkan (önce büyü kalkanı) ve Lucky Escape işler. Tur başı sırası: zemin tikleri, Wither tiki, Omen süresi (Doom), yenilenme. Taşıyan zemin ya da Wither tikinde ölürse Doom patlamaz.
- **Taunt:** Doom hedef seçmez, Taunt'tan etkilenmez; taunt'çıya inen Doom Taunt kırılma sayacına eklenir. Evil Eye, Jinx, Doom Mark tek hedefli (Taunt'a tabi), Withering Curse alan skill'i (tabi değil).
- **Çağrılar** (Skeleton, Treant) lanetlenebilir ve çağrılar fazla hasar aldığı için Doom ağır gelir. Diriltilen birim Omen / Wither olmadan döner.

**Wither** (`statuses.json > wither`, değer `withering_curse > effects[dot]`): karakter üstü DoT (LUCK ölçekli, büyü / karanlık). Tik taşıyanın tur başında, zemin tiklerinden sonra, Omen süresinden önce. Tikte isabet ve kritik zarı yok. Yığılmaz: yeniden uygulanırsa süre yenilenir, büyük miktar kalır. Kaynak ölse sürer (Ö3); Guard'a aktarılmaz; kalkan emer. Opportunist (Cutthroat) listesinde Wither var, Omen yok (Ö7).

**Jinxed** (`statuses.json > jinxed`): isabet ve kritik düşer, taşıyanın bir sonraki hasar veren skill'inde ya da süre bitince düşer (`endsOnOwnAttack`). Jinx, Backstab'ın garantili kritiğini bozmaz, yalnız isabet düşer (Ö5). Kritik Jinx yığını tamamlayıp otomatik Doom tetiklerse o Doom kesin kritiktir (`critDoomOnCrit`, yalnız Jinx; Ö15).

**Ill Omen (pasif, `omenTransfer`):** Omen taşıyan düşman ölünce Omen'ler en yakın canlı düşmana geçer (ekran ızgarasında Manhattan uzaklığı; eşitlikte aynı sıra, sonra küçük yuva). Varışta en çok `maxOnArrival`; geçiş asla Doom tetiklemez (zincir yok). `onDoomKill: 0`: Doom ya da Doom Mark öldürürse hiçbir şey geçmez (ağaç düğümü bunu artırabilir). Geçen Omen yenilemez, ölenin kalan süresini taşır (Ö11); snapshot Omen'le birlikte geçer. Pasif, Omen'i bırakan Hexer canlıysa çalışır.

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Evil Eye (`evil_eye`) | Ana saldırı: tek hedefe karanlık büyü hasarı, +1 Omen (kritikse +2). | 0 / yok | sınıf (5) | hasar magic/dark LUCK 0,86; omen: stacks=1, critStacks=2 |
| Withering Curse (`withering_curse`) | Düşman alanına (2 sıra x 3 şerit, önden arkaya aşamalı) hasar + Wither (zamanla hasar) + her vurulana 1 Omen. | 14 / 3 | sınıf (5) | hasar magic/dark LUCK 0,3; dot: status=wither, scale=luck, power=0,1, turns=3; omen: stacks=1, critStacks=2; area={shape:rect, rows:2, cols:3, anchor:bottom_left, stages:row} |
| Jinx (`jinx`) | Tek hedefe hasar + Jinxed (isabet düşer, kritik yok) + 1 Omen. | 2 / 3 | sınıf (5) | hasar magic/dark LUCK 0,73, critBonus=0,25; status: status=jinxed, turns=2; omen: stacks=1, critStacks=2, critDoomOnCrit=true |
| Doom Mark (`doom_mark`) | Ult: vurur, +1 Omen, sonra yığın kaç olursa olsun Doom'u hemen patlatır (güçlendirilmiş). Iskada hiçbir şey olmaz. | 14 / 4, ilk 3 | sınıf (5) | hasar magic/dark LUCK 0,73; omen: stacks=1, critStacks=2; detonate: status=omen, mult=1,65, noTransferOnKill=true |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-hexer.test.ts`) ve bu tablo birlikte güncellenir.

## 3. Ağaç

Ağaç Hexer'i dört satırda işler: pasif Ill Omen, Evil Eye, Withering Curse, Jinx; ult Doom Mark; bar "Verdict Mastery". Önceki belgede ağaç bölümü hiç yoktu.

Veri: `data/skill-trees/hexer.json` (sürüm 1, bar "Verdict Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Ill Omen (pasif):** dolgu Fresh Host, Grim Arithmetic, Crooked Stars, Bitter Interest; anahtar Fate Sealed; yön A Crushing Doom (ödül Ruinous Crit, uç Overcharged Doom); yön B Doom Leaks (ödül Toppling Ruin, uç Final Toll); evrim Passing Bell. Anahtar: "An enemy that survives Doom keeps 1 Omen, so the next Doom comes sooner."
- **Evil Eye:** dolgu Prying Eye, Unblinking, Envy's Edge, Rheumy Stare; anahtar Opening Glare; yön A Glint of Malice (ödül Fatal Glance, uç Strained Eyes); yön B Fixed Stare (ödül Doom Gaze, uç Burning Stare); evrim Eye of Ruin. Anahtar: "Evil Eye on a target with no Omens adds 2 Omens."
- **Withering Curse:** dolgu Plague Breath, Fog of Ill Luck, Leeching Rot, Rot Contagion; anahtar Herd Curse; yön A Broad Curse (ödül Plague Tide, uç Thin Plague); yön B Seeping Rot (ödül Returning Curse, uç Swift Blight); evrim Plague Curse. Anahtar: "If Withering Curse hits 3 or more enemies, each gains 1 extra Omen."
- **Jinx:** dolgu Clinging Jinx, Wobbly Aim, Hex Ward, Rumour Mill; anahtar Double Jinx; yön A Lasting Jinx (ödül Woeful Turn, uç Spiteful Jinx); yön B Backlash (ödül Turned Luck, uç Feeble Jinx); evrim Turned Hand. Anahtar: "Jinxed lasts through the target's next 2 attacks."
- **Ult Doom Mark (tek kol seçilir):** u Leaping Mark, Hungry Leap, Unending Mark; r Gathering Mark, Overflowing Fate, Mark of Many; d Sealing Mark, Heavy Seal, Mark of Silence; l Dread Ward, Cowed Foe, Last Rite.
- **Bar Verdict Mastery:** 5 Quick Fate, 10 Grim Herald, 15 Long Rot, 20 Carrion Feast, 25 Hour of Ruin.

## 4. YZ notları

- Profil: `data/ai.json > profiles.hexer`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).
- `ai.json > profiles.hexer`: Omen değeri odak puanına girer; Doom Mark için `reserveMp` var (skill `ai` alanı). Ill Omen geçişi `omenTransferShare` ile değerlenir (`src/engine/ai.ts`, `src/engine/ai-value.ts`).

## 5. Açık işler / kararlar

- **Kararlar (Ömer 2026-10-07 / 10-08):** Ö1 3. Omen'de Doom hemen patlar. Ö2 süre dolunca Omen sayısı kadar Doom. Ö3 Hexer ölünce lanetler sürer. Ö4 Misfortune Omen'in parçası. Ö5 Jinx Backstab'ı bozmaz. Ö6 Withering Curse 2x3 aşamalı. Ö7 Opportunist: Wither evet, Omen hayır. Ö8 iki Hexer aynı yığını doldurur. Ö9 karakter kadın. Ö10 Doom Mark yığın 3 olmasa da patlatır; DoT Withering Curse'te. Ö11 Ill Omen geçişi süre yenilemez. Ö12 süre bitimi Doom Guard'a aktarılmaz. Ö13 skill ile eklenen her Omen süreyi yeniler (Ö2'deki "yenilenmez" kuralı bununla değişti). Ö14 Doom Mark'ın öldürmesinde Omen geçmez. Ö15 kritik Jinx'in tamamladığı Doom kesin kritik.
- İkon / vfx / ses: `skills.json` `_not` notları hâlâ "yer tutucu" diyor (Omen ikonu `eye`, Wither `poison`, Jinxed `finger`, pasif `soul`; skill ikonları ödünç). Hexer'in kendi sanatı yapıldı mı doğrulanmadı (`src/game/art-v2/hexer` var); kontrol `docs/arch/areas/character-vfx.md`.
- Denge: güç değerleri veriden okunur; `docs/balance.md`. Doom Mark 2 Omen'li kırılgan hedefi tek atışta öldürür (kasıtlı); kritik Withering Curse sık 2 Omen üretirse Doom Mark gücü düşürülür (eski not).

## 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/hexer.md`.
