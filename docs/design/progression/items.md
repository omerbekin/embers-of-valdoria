# Item (eşya) sistemi: canlı çekirdek
> **Ne için / Güncel mi (2026-11-08):** Item sisteminin bugün geçerli çekirdeği: yuvalar, ilvl ve silah gücü, affix, düşüş, altın, fiyat. Her sayı `data/items.json` ve `data/campaign/campaign.json`'dan alındı; sayı kopyası yerine "geçerli sayı: dosya > alan" yazılır. Çelişkide `item-design-plan.md` (Trinket, set, affix dağılımı kararları) ve veri geçerli. Tam eski metin (6 yuva dönemi, trait'ler, IP fiyatı, 3 bölümlük plan): `docs/archive/design/progression/items-history.md`. Alan durumu: `docs/arch/areas/item-design.md`.

## Değiştirme rehberi (en sık işler)
| İş | Değer nerede | Test | Belge |
|---|---|---|---|
| Affix değeri / yeni affix / yuva havuzu | `data/items.json > affixDefs` (parts: base + perIlvl, step, ip, to; `slots`; `tier`) | `tests/items-data.test.ts`, `affix-distribution.test.ts`, `item-affix-round2.test.ts` | `item-design-plan.md`, `docs/arch/areas/item-design.md` |
| Tüm affix'lerin ortak güç düğmesi | `affixRules.power`, `rollFloorByRarity`, `classFit`, `drawGroups` | `items-data.test.ts`, `affix-measure.test.ts` | bu belge |
| Silah gücü / tutuş / tip | `weaponPower`, `weaponTypes`, `twoHandMelee`, `implicits` | `item-power.test.ts`, `weapon-types.test.ts` | bu belge |
| Düşüş nadirliği ve kayma | `dropRarity` (weights, shift) | `loot.test.ts` | bu belge |
| Düşen item sayısı, altın, minimum nadirlik | `loot` (dropMult, perPartyMember, minItems, gold, rarityFloor) | `loot.test.ts` | bu belge |
| Legendary düşüş şansı, pity, set payı | `rareDrop` (chance, pityPerMiss, split, setOfLegendary, setsEnabled) | `loot.test.ts`, `sets-engine.test.ts` | `item-design-plan.md` |
| Sefer tüccar fiyatı, raf, reroll | `data/campaign/campaign.json > merchant` | `economy-smith-merchant.test.ts`, `campaign-rest-merchant.test.ts` | bu belge |
| Demirci (Temper, Reforge, Combine, taş) | `campaign.json > blacksmith` | `economy-smith-merchant.test.ts` | bu belge |
| Yeni item / Legendary / etki | `items.items`, `effects` (Legendary etkisi: kanca `src/engine/types.ts > ItemEffects`) | `items-data.test.ts`, `item-effects.test.ts`, `item-icons.test.ts` | `item-design-plan.md` |
| Set | `sets`, `setItems`, `setValue` | `sets-all.test.ts`, `set-rules-2026-11-07.test.ts` | `item-design-plan.md` |
| Tavanlar (crit, hız, MP bedeli ...) | `caps` | `item-caps.test.ts` | bu belge |

Her değişiklikten sonra: sayı değiştiyse `data/patch-notes.json`'a satır, `docs/arch/areas/item-design.md` Durum güncellenir; goldenlar için `npx tsx tests/golden/record.ts`. Yeni stat veya kural Ömer'e sorulmadan eklenmez. Kod: `src/progression/items.ts` (zar, değer, güç), `loadout.ts` (takılı toplam, tavan kırpma), `loot.ts`, `equip.ts`, `sets.ts`, `weapon.ts`; sefer tarafı `src/campaign/loot.ts`, `smith.ts`, `merchant` kodu `src/campaign/`.

## 1. Yapı
- **8 yuva** (`items.json > slots`): Weapon (ağırlık 1,5), Off-hand (0,8), Helm (0,8), Armor (1,3), Gloves (0,8), Boots (0,8), Ring (0,8), Trinket (0,8). Ring baştan açık. Trinket seferde Reedgate'te açılır; yalnız Harita 1 Trinket düşürmez (`data/campaign/valdoria.json > noDropSlots`), Endless'ta baştan açık.
- **Katalog:** 153 item (`items.items`): Common 40, Uncommon 35, Rare 33, Epic 26, Legendary 19. Ayrı liste `setItems` (22 parça, 6 set) ana havuzlardan ayrıdır.
- **Nadirlik = affix sayısı** (`rarities[].tiers`): Common C; Uncommon C, C; Rare C, C, B; Epic C, C, B, A; Legendary C, C, B, A + benzersiz etki (`effects`, 19 kayıt, hepsi Legendary). Kalite statı güçlendirmez: değer yalnızca item seviyesiyle büyür. Kahraman başına en çok 1 Legendary. Aynı etki iki item'den toplanmaz (`effectRules.stack` false).
- **Item seviyesi (ilvl):** sefer düğümünün seviyesi (bölüm başına `blacksmith.ilvlPerChapter` = 10); Endless'ta dalga seviyesi. Takma şartı = max(`levelReq.min`, ilvl - `levelReq.offset`) (offset 3, min 1). Seviye sabit; Temper yükseltir.
- **Havuz sınıfı:** her affix `affixDefs[].slots` yuvalarında çıkar (yuva kimliği: hangi affix hangi yuvada, tablosu `item-design-plan.md` D1-D4 ve veri). 6 element direnci tek havuz girdisidir (`drawGroups`). Zar sınıfa hafif yatkın (`classFit` ağırlık 2). Ana affix tabanın örtük statıdır, havuzdan muaftır.

## 2. Affix değeri
- Değer = (`parts.base` + `parts.perIlvl` x ilvl) x `affixRules.power` (bugün 1,6), `step` adımına yuvarlanır; `noPower` parçalar (ana stat, tüm statlar, hız, Immunity turu) çarpılmaz.
- Zar: ±`rolls.spread` (0,25) aralık; alt sınır nadirliğe göre `affixRules.rollFloorByRarity` (common 0, uncommon 0,1, rare 0,2, epic 0,3, legendary 0,4). Legendary q = 1.
- `ip` = bir birimin Item Points değeri (Equip best, endless tüccar değeri, Gear Score). Örnek ilvl-10 değerleri belgede tutulmaz; `node -e` ile `affixDefs`'ten hesaplanır.
- **Tavanlar** (`caps`, `loadout.ts` kırpar): crit 25, accuracy 10, evasion 15, spd 3, mpCost 50, resist 40, recovery 20, damageTaken 90, aAffixCopies 2 (diğerleri veride).
- Block kalkanda taban şans sabit (`items[].implicitBase`); `b_blockbreak` saldırganın değerini hedefin Block şansından düşer. Blok kuralı: `combat.md`.

## 3. Silah
- **Silah gücü** (`weaponPower`): taban + `perIlvl` x ilvl = bugün 7,5 + 2,8 x ilvl; x tutuş (`grip`: one 1, two 1,45, bow 1,35) x tip (`weaponTypes[].power`) x çift el yakın dövüş (`twoHandMelee.power` 1,15); `step` 1'e yuvarlanır. Hasar = stat x skill gücü x (1 + güç/100). Yalnız hasar; şifa ve kalkan değil.
- **Tipler** (`weaponTypes`, örtük stat `implicits`): sword, axe (güç 1,1, hız %5 az), mace (1,18, %9), hammer (1,05, %2; Daze), dagger (0,85), bow, staff, charm, wand, rod, spear, hatchet. Çift el yakın dövüş ek hız cezası `twoHandMelee.spdLess` (5).
- **Aileler** (`weaponFamilies`): hangi sınıf hangi aileyi takar ve ana affix listesi (`mains`); Warrior'ın elinde çekiç olmaz. İkinci el türleri `offhandKinds` (Shield, Quiver, Focus Orb, Tome, Lantern, Relic); yalnız Sadak yayla takılır, çift el diğerini kapatır.
- **Başlangıç:** `starterWeapons`, `starterOffhands` (Common, ilvl 1). Başlangıç silahı katlamanın sıfır noktasıdır (`src/progression/weapon.ts`; Quick Battle güç katmanı kullanmaz).
- Örtük statlar affix değildir (zar yok, `power` işlemez), tavanlara dahil, IP'ye girer.

## 4. Düşüş (sefer ve Endless ortak tablo)
- **Nadirlik** (`dropRarity.weights`): Common 64, Uncommon 25, Rare 8,5, Epic 2,5. Kayma `shift`: perIlvl 0,015 + elit 0,15 / boss 0,3 / hazine 0,15, en çok 0,5 (kademe i ağırlığı x(1 + kayma x i)). Legendary bu tabloda yok.
- **Legendary / set** (`rareDrop`): her kazanılan savaşta bir zar; taban şans normal 0,01, elit 0,03, boss 0,06; her düşüşsüz zaferde +0,005 (pity); split set 0,75 / legendary 0,25; `setsEnabled` bugün false (set düşüşü kapalı, parçalar Debug'dan); Endless: 15. dalgadan sonra dalga başına +0,002, Legendary 11. dalgadan, Endless tüccarı 11. dalgadan %10 şansla Legendary (fiyat x3).
- **Sayı ve altın** (`loot`): sefer düşüşü x`dropMult` (0,65); takım üyesi başına beklenen item normal 0,5, elit 0,75, boss 1; en az item elit 1, boss 1, sandık 1; elit en az Uncommon, boss en az Rare; sandık 2 + 0,5 x takım - 1. Altın x ilvl: normal 3,4, elit 6,8, boss 13,6, sandık 25. Tekrar oynanan düğümde altın, düşüş ve nadirlik tavanı ilk zaferle aynı (`repeat`).
- Düşen item sayısı ve nadirlik zorluktan bağımsızdır.
- **Torba:** 30 yuva (`items.bag`), dolunca fazlası Spoils kartında geride kalır; Gear'da Discard her zaman var.
- **Endless:** item kartı normal ve elit dalgada 2, boss sonrası 3 seçenek (`data/endless.json > rewards`); tüccar IP değeriyle fiyatlar (`budget.goldPerIP` 10, `sellRatio` 0,5).

## 5. Fiyat, tüccar, demirci (sefer)
- **Tüccar fiyatı** (`campaign.json > merchant`): `priceBase` (Common 20, Uncommon 40, Rare 90, Epic 200, Legendary 450) x (1 + `pricePerIlvl` 0,1 x ilvl); satış bunun yarısı. 9 raf (`size`), günde `restockPerDay` 2 raf yenilenir; reroll = `rerollCost` 15 + `rerollPerLevel` 7,5 x ortalama level. Dükkân en çok bir sonraki kasabaya kadarki en güçlü mobun level'ı kadar ilvl satar (`src/campaign/power.ts > shopCeiling`).
- **Demirci** (`blacksmith`; Ashford'da yok, ikinci kasabadan itibaren): Temper = item seviyesi bölüm tavanına kadar +1, bedel altın (`temper.gainRatio` 1,59, `minPrice` 2, Legendary x2) + taş (`stones` 1, ilvl 15 üstü `highStones` 2); Reforge (yalnız Epic): `reforge.valueRatio` 0,5 x tüccar fiyatı, her tekrarda x1,5; Combine: torbadan 3 item -> 1, bedel `combine.valueRatio` 0,2. Taş düşüşü `blacksmith.stones` (boss ilk zaferi, elit ilk zaferi). Kamp Sharpen bedavadır. Kod `src/campaign/smith.ts`.
- Eski IP altın değeri (`budget.goldPerIP`) yalnız Endless tüccarı ve Equip best değerlemesi içindir.

## 6. Güç bütçesi ve sefer dengesi
Item'in toplam katkısı ve düşman telafisi `data/campaign/power-budget.json` + `src/campaign/power.ts` içindedir; denge bantları ve ölçüm: `docs/balance.md`, `docs/arch/areas/campaign.md`.

## Kapsam dışı
Set kuralları, Trinket, affix dağılımı kararları: `item-design-plan.md`. Legendary etki listesi: `data/items.json > effects` (eski etki önerileri `docs/archive/design/progression/item-effects.md`). İlerleme planı tarihçesi: `docs/archive/design/progression/roadmap-2026-10.md`.
