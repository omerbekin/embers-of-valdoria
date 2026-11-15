# Alan: Karakter tasarımı ve sınıf dengesi
> **Ne için / Güncel mi (2026-11-08):** karakter tasarımı alanı canlı durumu ve kararlar. 2026-11-08 kararlarına kadar güncel.


**Değer nerede:** skill değerleri `data/skills.json`, sınıf `data/classes/`, ağaç `data/skill-trees/<sınıf>.json`, mob `data/mobs/`; bant testi `tests/balance-checks.ts`, golden `tests/fixtures/golden/` (üretim `npx tsx tests/golden/record.ts`).

**Agent buradan başlar:** sınıf belgesi `docs/design/classes/<sınıf>.md`, kararlar bu belgenin Durum / Kararlar bölümleri (açık sorular `docs/design/open-questions.md`; eski Q-NEW maddeleri `docs/archive/design/open-questions-archive.md`), test `tests/balance-checks.ts`.

## Kurallar
- Sayı değişikliği yalnız Ömer'in seçimiyle; yeni mekanik/durum/zemin tepkisi önce sorulur, uygulanmaz.
- Başka sınıfa kendiliğinden dokunulmaz; bant dışı kayma raporlanır + öneri. Bant %44-56 (`data/balance.json`).
- Yüzde sonuçları en çok 3 ondalık. Her ölçümde tüm sınıflar birleşik gösterilir.
- Yeni skill/durum/zemin/ağaç tetiği YZ değeri + testiyle gelir.
- Makinede aynı anda tek sim; sim Ömer onayıyla. Tam test yalnız `ready` öncesi.

## Ölçüm
- `npx tsx src/sim/cli.ts <n> 1` ve `<n> 50001`; kesin ölçüm `5000 900001`, `5000 300001` (test seed'leri). Çıktılar scratchpad'e.
- Sim Quick Battle'dır, ağaçsızdır: ağaç güçlenmeleri görünmez. 300 savaşta grup farkı 5-13 puan: bu boyutta sayı kararı verme (Defender 39,6 çıktı, 5000'de 47,3). 1000 ile yön, 5000 ile karar.
- Sefer `src/sim/campaign-cli.ts 96 1 medium good`, Endless `src/sim/endless-cli.ts 96 1`.

## Durum (2026-11-08 gece, 5000 x 2: 900001 / 300001; Warrior zırh 16 + DS 0.35, Skald menzil 2, Vesper Thunder After enemyMissed)
- **Hexer ağacı (2026-11-15, Tur 20-21; dal agent/balance-tester-hexer-morvane, gönderilmedi):** Fog of Ill Luck -3% -> -1% / rank, Wobbly Aim -3% -> -5% (-20% -> -45%), Hex Ward 4% -> 5%, Rumour Mill 5% -> 10%; Leeching Rot %4'te kaldı (Ömer r21). Tur 21 Yol B: Clinging Jinx keepChance %10 -> %25 / rank, Lasting Jinx 3 -> 5 tur (Jinx temel bekleme / süre aynı). L20 300 savaş (Hexer n=130, gürültü ±8): Yol A (Withering Curse, rows 2,3) +28,5 (hedef üstü; Leeching Rot geri dönünce), Yol B (Jinx, rows 3,1) +16,2 -> +20,0 (deneme 1: %20 / 4 tur) -> +22,3; fark 6,2 (hedef <=5 tutmadı, 2 deneme bitti). Satır 1+2 (varsayılan focus) +10,0. **Tur 22 (Lasting Jinx = garanti komşu sekmesi, süre 2):** Yol A +28,5 (değişmez; 16 puan satır 2'de), Yol B +15,4 (5 turluk eski hâl +22,3'tü); deneme 2 (Clinging %30, Wobbly -%6, Hex Ward %7 / rank) +14,6, fark yok, veri Tur 21 sayılarına geri alındı. Sebep: sekmeyle gelen Jinxed ağaç güçlerini taşımaz (yalın -%20, 1 saldırıda düşer; Rumour Mill'inki de öyle). Fark 13 (hedef <=5 tutmadı). **Tur 22 ikinci karar (zincir sekme %50 + Rumour Mill, Jinxed -%10; 100 savaş, Hexer n=45, gürültü ±12):** Yol B +15,6, Yol A +26,7, fark 11,1; zincir tetikleniyor (3.ea birim başına 4,71, Jinx satırı 3,01). Hedef tutmadı; değer oynatılmadı. **Seçenek 2 (geçerli):** Yol B +24,6, Yol A +28,5, fark 3,9 (hedef tuttu); Jinx payı %21,4 -> %34,7, Evil Eye %36,4 -> %24,4. **Tur 22 üçüncü karar (zincir + Jinx beklemesi 2, -%10 isabet yok; 100 savaş):** Yol B +13,3, Yol A +26,7, fark 13,4; Jinx skill payı %21,7 -> %42,7 (baskın işareti), Evil Eye %37,3 -> %18,0; 3.ea tetiklenme Jinx başına ~%54 (beklenen %60).
Warrior 55,5 / 54,3 | Undead 54,4 / 53,8 | Skald 53,4 / 53,5 | Druid 53,1 / 54,0 | Anti-Mage 51,9 / 51,6 | Hexer 50,8 / 51,6 | Mage 48,7 / 49,3 | Gambler 47,9 / 47,0 | Cutthroat 47,5 / 48,2 | Archer 47,2 / 49,1 | Vesper 47,3 / 46,1 | Paladin 47,1 / 45,7 | Defender 45,5 / 45,6. Hepsi bantta. Skald menzil 3'te 48,9 / 51,3 idi (+2-4,5 puan). Sim ağaçsız: Vesper Thunder After burada görünmez.

- **Warrior karar (Ömer 2026-11-08 akşam):** zırh 16, Double Strike 0.35 (iki vuruş). Zırh 16 + DS 0.38 ölçümü 56,0 / 52,9 idi; DS 0.35 Ömer'in isteğiyle ölçülmedi.
- **Warrior tanı (2026-11-08, 1000 x 2):** mana baskısı kaldırılınca (formulas mpPerInt 0.2->1, mpRegenPerInt 0.15->0.165, yalnız kopyada) Warrior 56,8 -> 55,2; düşmüyor. Yüksekliği mana reworkünden değil kendi gücünden. Zırh 15 / Double Strike 0,36 ile 1000 x seed 1'de %50,2 idi; 18 / 0,38'e dönüş (Ömer "şimdilik değiştirme") yükseltti. Mana sınıfları mana baskısıyla 2-4 puan düşüyor (Rest: Skald 11,4, Paladin 10,8, Druid 10,0, Mage 9,2; Warrior 2,8).

Son kararlar (2026-11-08, Ömer): Paladin Radiance 18 / Resurrection 14 MP kaldı; Judgment düşman hasarı +%5 (0,315, holy_fire 0,399; şifa aynı). Warrior: sabaha kadarki ara karar zırh 18 / DS 0,38 idi (tarihçe); akşam kararı ve GEÇERLİ değer zırh 16 / Double Strike 0,35 (yukarıdaki Durum ve Warrior karar satırı). Skald denge turu (kök sebep: 0.9.11 manası, havuz 32, Rest %21; War Drum 20 MP'yle YZ Stormcall için MP saklıyordu, pay %1,6): War Drum MP 20 -> 8, bekleme 5 -> 4, Haste 2 -> 3 tur; Thunder Strike MP 10 -> 6, bekleme 3 -> 4, güç 0,95 -> 0,85; Stormcall MP 22 -> 18, güç 1,1 -> 1,0; Hammer Spark 0,6 -> 0,57. Skald PENDING'den çıktı. Ayrıntı `docs/balance.md`.
Önceki (2026-11-03): Nature's Wrath 0,64 + Soaked 1 tur; Vesper iki kez +%3; Defender Armor 38, Taunt kırılma 0,30; Gambler +%5; Holy Strike 0,627; Blizzard 0,70. Her Soaked Burning'i söndürür; tüm şimşek hasarı ±%50 (`formulas.damage.elementVariance`).

## Healing Rain
İç id `rejuvenate` kalır, görünen ad Healing Rain. Tek hücre `area_any`, yalnız kendi tahtası, boş hücreye de atılır. Şifa 0,675 + `healing_rain` zemini 0,225 x 3 tur, Hallowed verir (yeni durum yok). Su sayılır (Ömer), ıslatmaz. Ağaç sürümü 3.

## Açık işler
1. **Sefer + Endless ölçüldü (96'şar, 2026-11-03):** Harita 1 bitirme %77, boss ilk deneme %48-49; Endless ortalama dalga 18,6 (hedef 17-22). Endless boss 30-50 kazanma hedefin üstünde (%50-77), ama örnek küçük (n=10-17). Sayı değişmedi.
2. **Druid muafiyeti** `PENDING_BALANCE`'ta (bir grup 56,5): görsel rework bitince 5000 ile yeniden bakılır, sayıya şimdilik dokunulmaz (Ömer).
3. **Healing Rain görseli:** tüm Druid skilleri + Treant + skilleri rework'ü Character vfx alanında. `src/game/vfx.ts` zemin rengi geçici.
4. **Healing Rain tarayıcı kontrolü:** 16:9'da hedef seçimi, zemin, ipucu, ağaç metinleri geçti, konsol hatası yok. Doğrulanmadı: zemin ipucu ve hedef seçimi 21:9 ve telefonda, şifa sayısının çıkması, ağacın üst kademeleri.
5. **Skald ağacı v1** (2026-11-08): `data/skill-trees/skald.json`, tablo + 6 öneri `docs/design/classes/skald.md` bölüm 3; sayılar sim bekler. 6 önerinin durumu (2026-11-14): Ömer onayladı, altı yama yolu motorda açıldı (dal agent/skald-hooks, `tests/skald-tree-paths.test.ts`); ağaç düğümleri değişmedi, Wild Dance kaldı. Yan etki: Mage Rime Touch artık %6 x rank; Hexer 2.r / 3.r de %5 x rank (Ömer 2026-11-15 r19, veride `rank: 'chance'`). Açık: yolları kullanan yeni düğümler (Ömer kararı). Ağaçlı ölçüm (r19): `docs/balance.md` > Ağaçlı ölçüm 2026-11-15.
6. **Skald menzil değişti, ölçüldü (53,4 / 53,5, bantta)** (Ömer 2026-11-08): yakın dövüş grubu, taban menzil 3 -> 2, Stormcall istisnası 3, frontPriority 3 -> 2, yoldaş önerisi ön saf. Yakın dövüş eşiği `range.meleeMax` 2 (Range 2 moblar da YZ'de yakın dövüşçü).
7. **Vesper Thunder After (2026-11-08):** Blind'lı düşman ıskalayınca 1 çan (`enemyMissed`). Ağaç düğümü: QB sim'i ölçmez (ağaçsız); sefer sim'inde görünür.

## Tuzaklar
- Spreading Roots komşulara TAM güçte zemin verir (Ömer kabul etti); güçlü görünürse bedel konuşulur. Sim bunu ölçmez.
- Zemin tikleri ilk şifa kancalarını tetiklemez (Soft Hands, Emergency Bloom, Overflowing Cup, Lifebloom).
- Kahramanlarda HoT kalmadı; HoT'a dayanan test/özellik Marsh Light'ın Fen Glimmer'ını kullanır.
- Wrath hasarı Druid'i düşürmüyor (0,58'de hasar 87 → 79, kazanma aynı): gücü Soaked süresinden geliyordu.
- `src/engine/ai-value.ts > isHealSkillGround`: Druid YZ değerini tutar, kaldırılırsa Snowfather's Roar tetiklenmez.

## Kararlar (geçerli kurallar; tam tarihçe `docs/archive/arch/areas/character-design.md`)
- **Hexer ağacı (Ömer 2026-11-15 form r21):** Tur 20 değerleri kabul (Fog -%1, Wobbly -%5, Hex Ward %5, Rumour Mill %10 / rank); Leeching Rot DEĞİŞMEZ (%4). Yol B için Jinx bekleme / süre sayıları (Jinx, Lasting Jinx, Clinging Jinx) denenebilir; yalnız var olan sayılar, yeni mekanik yok. Hedef Yol B +20..+25, iki yol farkı <=5; Yol A hedeften çıkarılmaz.
- **Lasting Jinx (Ömer 2026-11-15 Tur 22):** süre uzatma kalktı (Jinx uzun sürmesi fazlaydı); düğüm alınınca Jinx HER kullanımda hedefin yanındaki bir düşmanı da Jinxler (zar yok, 2 tur, `to: adjacentEnemy`; yanında düşman yoksa sekme yok). Rumour Mill (%10 / rank) ve Clinging Jinx (%25 / rank) aynen kalır; ağaçsız Jinx süresi / beklemesi değişmez. (Aynı gün aşağıdaki satırla değişti.)
- **Lasting Jinx son hâli (Ömer 2026-11-15, Tur 22 ikinci karar):** yalnız 3.ea alan Hexer'de Jinx %50 şansla hedefin yanındaki düşmana seker, seken de aynı şansla sıradaki yan düşmana (zincir; aynı düşmana iki kez değil, aday bitince durur). Rumour Mill şansı (%10 / rank) bu şansa EKLENİR (3 rank = %80), Rumour Mill ayrı zar atmaz. Jinxed isabet -%10 daha (-%20 -> -%30, Wobbly Aim ekleri üstüne); kritik yok kuralı, süre (2 tur) ve ağaçsız Jinx aynı. Seken Jinx Jinx'in kendi etkisiyle iner (ağaç güçleri sekende de; varsayım, Q-NEW). Motor: tetik eylemi `bounce`, kanca `addChanceOf` (Ömer onaylı). (-%10 isabet aşağıdaki satırla kalktı.)
- **Lasting Jinx iki özellik (Ömer 2026-11-15, Tur 22 üçüncü karar):** zincir sekme aynen; Jinxed -%10 isabet ÇIKTI, yerine düğüm alınınca Jinx beklemesi 3 -> 2 (ağaçsız Jinx 3). Spiteful Jinx (3.fa) alınırsa onun 5'i geçerli. Kural: evolve olmayan düğüm en çok 2 özellik (`docs/design/classes/skill-tree-logic.md` bölüm 1). (Aşağıdaki satırla değişti.)
- **Lasting Jinx geçerli hâli (Ömer 2026-11-15, Tur 22 dördüncü karar, seçenek 2):** Jinx beklemesi 3'e döndü. Düğüm: %50 (+ Rumour Mill %10 / rank) şansla Jinx hedefin yanındaki TEK düşmana seker, onu Jinxler ve Jinx'in tam hasarını vurur (`bounceMax: 1`, `bounceHit: 1`). 300 savaş: seçenek 1 (%50 hasar) Yol B +20,8 / Yol A +28,5 / fark 7,7; seçenek 2 Yol B +24,6 / Yol A +28,5 / fark 3,9 HEDEFTE; seçenek 3 (zincir, %25 düşüş) ve Leeching Rot koşulu gerekmedi.
- **İmza mekanikleri:** YALNIZ Omen (Hexer) ve Dark Bond (Undead) kahramana özel; wither/weakened/wound mobda olabilir. Yeni mob kitine bunlar verilmez (content-designer brief'ine yazılır). Harita 1 Omen mobları buna göre değişmeli.
- **Blood Warden:** yalnız konsept, motora bir şey eklenmez; belge `docs/design/future-ideas/blood-warden.md`, istemler `docs/design/future-ideas/blood-warden-art.md`. Açık: v2 sanat son mu.
- **Karakter kademeleri:** taslak, Ömer onaylamadı (T1-T3 bölünmesi, Endless eşikleri, MP bütçesi); MP bedeli yeni mekanik, açıkça sorulur. Belge `docs/design/progression/character-tiers.md`.
- **Vesper (Bellwarden):** kutsal + şimşek hasarcı, destek değil; pasif her çan sonrakilere +%5; ret = Clapper of the Sunken Bell relic'i; katılım = kışlada yedek; QB/Endless/MP'de hep açık. Çan sayacı Endless dalgaları arasında sıfırlanır.
- **Mage:** yalnız ateş + buz; Storm zemini = Chill Ground; Frozen doğrudan verilmedikçe Chilled sayılır; Stun ve Frozen birlikte işler. Tüm şimşek hasarı ±%50; her Soaked Burning'i söndürür; Taunt kırılma 0,30 son.
- **Anti-Mage Ley Brand:** yakma atışta (castBurnPct 0,75) + işaret (işaretliye Mana Steal / Void Strike %40 daha fazla), kontrol yok; Ley Thread 1,5; pasif Spellbreaker's Instinct (`tests/am-thread-instinct.test.ts`).
- 300 savaş grupları 5-13 puan sapar: hep iki seed grubunu birleştir.
