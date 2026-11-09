# Ağaç fx sözlüğü (skill ağacı düğüm etkileri)

> **Ne için / Güncel mi (2026-11-08):** düğümlerin `fx` alanına ne yazılacağının TEK canlı sözlüğü: fx türleri, koşul / ölçek / değişiklik anahtarları, tetik olayları, eylemler, alıcılar, tabanlar, C4-C6 kancaları. EVET güncel: anahtar listeleri `src/engine/tree-hooks.ts` (`COND`, `SCALE`, `MOD_SPEC`, `TRIGGER_EVENTS`, `TRIGGER_TARGETS`, `TRIGGER_BASES`, `HEAL_POINTS`, `RULE_KINDS`) ve `src/progression/skill-tree-data.ts` + `skill-tree-compile.ts > FX_FIELDS` ile 2026-11-08'de tek tek karşılaştırıldı. Veri şeması, kural modülü, kayıt, motor akışı: `skill-tree-implementation.md`. Eski katalog adları ve faz günlükleri: `docs/archive/design/skill-tree-fx-catalog.md`, `docs/archive/design/skill-tree-implementation.md`.

## Yeni düğüm eklemek için (sırayla)
1. **Tasarım kuralı:** `docs/design/classes/skill-tree-logic.md` (tek kural, satır şekli, kalıplar). Şekil ve kilit sayıları: `docs/design/skill-tree-moments.md` + `data/skill-trees/_rules.json`.
2. **Veri:** `data/skill-trees/<sınıf>.json > nodes`; anahtar `<satır>.<id>` (satır 0 = pasif, 1-3 = aktif skill, 4 = ult; ör. `2.f2`, `4.u3`) ya da `mastery.bar[i]`. Ad en çok 24, metin en çok 150 karakter (`TREE_TEXT_LIMITS`); metin İngilizce. Düğümün içeriği değişince sınıf dosyasındaki `version` artar (kahramana bir kez bedava respec). Düğüm alınamayacaksa `inactive: true`.
3. **fx:** bu belgedeki sözlükten yaz; yeni kanca, alan ya da olay = yeni mekanik = önce Ömer'e sor. Koda eklenecek yerler: bölüm 11 "Kolay genişletme yerleri". Derleyici denetimi (`checkTreeFx`) bilinmeyen anahtarı kırmızı yapar.
4. **YZ değeri (ai-side kuralı):** yeni kanca / olay / durum `src/engine/ai.ts` (`trigEventValue` ve çevresi) ve `ai-value.ts` içinde değer taşır; kural `docs/arch/areas/combat-design.md`, tablo `docs/design/ai-priorities.md`.
5. **Test:** sınıfın testi `tests/skill-tree-fx-<sınıf>.test.ts` (Skald: `tests/skald-tree.test.ts`, Vesper: `tests/vesper.test.ts` içinde `checkTreeFx`); kanca ailesine göre `tests/skill-tree-fx*.test.ts`, `tests/tree-new-triggers.test.ts`; veri ve metin sınırı `tests/skill-tree.test.ts`, `tests/skill-tree-text.test.ts`; YZ kapsamı `tests/ai-coverage.test.ts`. Ağaçsız savaş birebir aynı kalmalı (golden testleri).
6. **Belge:** `docs/design/classes/<sınıf>.md` bölüm 3 (ağaç tablosu) güncellenir; oyuncuya görünen değişiklik `data/patch-notes.json` satırı alır.

## 1. fx türleri

| Tür | Kategori | Biçim | Not |
|---|---|---|---|
| `skill` | (a) | `{ "k":"skill", "sel":"<seçici>", "f":"<alan>", "op":"add\|mul\|set", "v":n, "rank":true }` | Seçici: `self` (cost.amount, cooldown, initialCooldown, count, turnCost, area), `damage` (tüm hasar etkileri), `damage:1` (2. hasar etkisi, 0 tabanlı), `status:slow`, `taunt`, `guard`, `ground`, `bonusScale:armor`. Alanlar beyaz listede; bilinmeyen alan = test kırmızı |
| `passive` | (a) | `{ "k":"passive", "f":"maxBonus", "op":"add", "v":0.02 }` | Pasif yaması (Berserker `rage`, Bulwark `armorAura`) |
| `addEffect` / `replaceEffect` | (b) | `{ "k":"addEffect", "after":"damage", "effect":{ "type":"status", "status":"wound", "turns":2 } }` · `{ "k":"replaceEffect", "sel":"status:stun", "effect":{ … } }` | Var olan SkillEffect türleri: damage, status, randomStatus, dispel, shield, taunt, guard, ground, heal, hot, dot, selfDamage, pull (zorunlu alanlar, durum / zemin adları denetlenir). Yer: `after` / `before` seçici (`damage`, `damage:N`, `status`, `status:<durum>`, etki türü), yoksa sona. `byRank: [r1, r2, …]` = rank'a göre etki. Faz 2a |
| `unitFx` | (b) | `{ "k":"unitFx", "fx":{ "secondWind":{ "below":0.3, "heal":0.1 } } }` | Var olan ItemEffects anahtarları (`UNIT_FX_KEYS`); item'lerden **ayrı kanal** `Combatant.treeFx` (4.1). `rank: true` = sayılar × rank (eşik / süre alanları `below, above, cap, turns, every, max, turnCost` hariç). Faz 2a |
| `hook` | (c) | `{ "k":"hook", "h":"cond\|rage\|trigger\|heal\|target\|rule", … }` | Aileler: `skill-tree-implementation.md` 4.2; biçimleri bölüm 3, 7, 8, 10 (biçim: bölüm 3) |
| (ortak) | | `"rank": true` = v × rank; `"skill": "<id>"` = başka skill'e bağlı düğüm (sinerji: Into the Fire) | |

- **Yüzde kuralı (Ömer 10a: oransal; değer `_rules.json > percentRule`):** "+X% power" = `mul X` (güç × (1 + X·rank)). Metinde "A → B" diye verilen mutlak sayılar (Bellow 25% → 34%, Plated Gauntlet 5% → 15%) `add` / `set`.
- **Uygulama sırası:** satırda sütun sırası (f1 → f2 → f3 → n0 → r → e → m/f → v). `set` kendinden önceki ekleri ezer, sonrakiler `set`'in üstüne biner (ör. Hollow Roar "breaks after 15%", Bellow'un +%9'unu siler; `docs/archive/design/skill-tree-implementation.md` bölüm 10a). **Faz 1a:** Ömer 10a'da Hollow Roar'u "Bellow'un üstüne eklenir" diye cevapladı; bunun için yeni op `base` (temel değeri değiştirir, tüm yamalardan önce uygulanır): Hollow Roar + Bellow 3 = 0,24 (bkz. `docs/archive/design/skill-tree-implementation.md` bölüm 10a).
- **`new: true` + `approved: false`:** oyunda "Awaiting approval" kilidiyle görünür, puan alınamaz.
- **`fx: null`:** etkisi henüz yazılmamış. Test build'inde puan alınabilir (yol ve kilitler test edilsin diye), motor yok sayar, ipucunda "Not active yet" çipi.

- `mode` (Paladin Radiance, Gambler Card Trick): adlı skill biçimi, bölüm 9. `stat`: `{ "k":"stat", "f":"hpMult"|"armorMult", "op":"mul", "v":-0.2 }`. `removeEffect`: bölüm 5; `groundStatus`: bölüm 8.
- **Düğüm bayrakları:** `inactive: true` = düğüm alınamaz ("Inactive: being reworked"), motor fx'ini yok sayar, denetim atlar; alınmış rank'ı olan kayıt geçersiz sayılır, ağaç bedava iade edilir (Mage reworkü 2026-10-29). Mastery bar girdisi de `inactive` taşıyabilir. `new` + `approved: false` = NEW mekanik onayı bekliyor (alınamaz). Veri biçimi: `skill-tree-implementation.md` 2.2.

### Gerçek örnekler
```json
"2.f1": { "name": "Bellow", "text": "Taunt breaks after 3% more of your max HP lost per rank (25% → 34%).", "src": "A:V1:2.f1",
  "fx": [ { "k": "skill", "sel": "taunt", "f": "breakRatio", "op": "add", "v": 0.03, "rank": true } ] }
```
Defender, (a): Taunt `breakRatio` 0,25 → 0,34 (3 rank).
```json
"4.r3": { "name": "Iron Meteor", "text": "Fist Crush's armor scaling rises to 40% of Armor, but it strikes 2 enemies.", "src": "B:V5:4.u3",
  "fx": [ { "k": "skill", "sel": "bonusScale:armor", "f": "pct", "op": "set", "v": 0.4 },
          { "k": "skill", "sel": "self", "f": "count", "op": "set", "v": 2 } ] }
```
Defender ult, (a): iki düz alan.
```json
"2.n0": { "name": "Gore Wheel", "text": "Whirlwind Wounds every enemy it hits for 2 turns.", "src": "A:V1:2.n0",
  "fx": [ { "k": "addEffect", "effect": { "type": "status", "status": "wound", "turns": 2 } } ] },
"2.r": { "name": "Red Arc", "text": "Whirlwind +3% power per rank against Wounded enemies.", "src": "A:V1:2.f2",
  "fx": [ { "k": "hook", "h": "cond", "when": { "targetStatus": "wound" }, "mod": { "powerMul": 0.03 }, "rank": true } ] }
```
Warrior, (b) ve (c/C1).
```json
"bar[1]": { "at": 10, "name": "Second Wind", "text": "The first time you drop below 30% HP in a battle, heal 10% of your max HP.", "src": "B:V3:bar0",
  "fx": [ { "k": "unitFx", "fx": { "secondWind": { "below": 0.3, "heal": 0.1 } } } ] },
"3.ma": { "name": "Final Shield", "text": "When a guarded ally would die, you take the whole killing blow instead.", "src": "A:V3:3.ma",
  "new": true, "approved": false, "fx": [ { "k": "hook", "h": "rule", "rule": "interceptLethal", "scope": "guarded" } ] }
```
Warrior bar (b, var olan `ItemEffects.secondWind`) ve Defender NEW düğüm (onaysız kilitli).

## 2. Yazım kuralları (fx yazarken önce bunu oku)
- **Kanca biçimi:** `{ "k": "hook", "h": "cond", "when"?: {…}, "scale"?: { tek anahtar }, "sel"?, "at"?, "procChance"?, "mod": {…}, "skill"?, "rank"? }`.
- **`when`:** anahtarlar VE ile bağlanır. Ayrıca `"not": {…}` ve `"any": [{…}, …]` yazılabilir.
  - Evet / hayır koşulunda değer `true` olur; `false` koşulu tersine çevirir.
  - Sayı koşulunda tek sayı "en az" demektir. Aralık için `{ "atLeast", "atMost", "eq" }` yazılır.
- **`scale`:** değişikliği bu sayıyla çarpar; 0 çıkarsa değişiklik etkisizdir.
- **`rank: true`:** `mod` içindeki sayıları ve `procChance`'ı rank ile çarpar. `…Set` değişiklikleri ve `addStatus` / `extendStatus` nesnelerinin içi rank ile çarpılmaz.
- **`…Mul` değişiklikleri:** x (1 + v·ölçek) çarpanıdır. `-1` sıfırlar ya da bedava yapar, `+1` iki katına çıkarır.
  - Metindeki "x1,5 → x2" gibi değişimler oran olarak yazılır: 2 / 1,5 - 1 = 0,333.
- **`at` (bağlantı yeri):**
  - `hit` (varsayılan): skill vuruşu, durum uygulama, kullanım sonu, bahis, mana yakma, Omen, bağ, Mana Overflow.
  - `doom`: Doom patlaması.
  - `dot`: DoT tiki.
  - `ground`: zemin tiki.
  - `passiveHeal`: Divine Light pasif şifası.
  - `smite`: Divine Light smite vuruşu (Crusader's Dawn vb.).
  - `aura`: Bulwark Aura payı (`auraPct`; alıcı = hedef).
- **Değişiklik grupları:** bir kancada farklı gruplar karışmaz. Tek istisna: hasar ve vuruş sonrası birlikte olabilir (Mercy Stroke).
- **`sel`:** yalnızca `hit` noktasında yazılır.
  - Hasar ve vuruş sonrası için `damage` ya da `damage:N`.
  - Durum için `status` ya da `status:<durum>`.
  - Diğer gruplarda `sel` yazılmaz.
- **Vuruş sonrası kancalar (`late`):** `hitIsCrit` ya da `killingBlow` koşulu kancayı vuruş sonrasına taşır. Bu kancada yalnızca şunlar kullanılır: `powerMul`, `ignoreDefense`, `flatDamage`, `critDmgMul`, `lifesteal`, `lifestealMul`, `drainMul`, `drainAdd`, `addStatus`, `removeStatus`, `extendStatus`.
- **`procChance` (0-1]:** kanca yalnızca bu şansla tutar. Zar yalnızca gerçek uygulamada atılır; önizleme ve YZ bu kancayı saymaz.
- **Bedel:** `mod.cost` düz ek, `mod.costMul` x (1 + v) çarpanıdır (`-1` = bedava).
  - Bedel kancasında yalnızca kendinle ilgili koşullar kullanılır: `selfHpBelow/Above`, `rageAtLeast/AtMost`, `firstUseOfSkill`, `selfStatus`, `selfTaunting`, `selfHasShield`.
  - Ölçek olarak yalnızca `missingHp` ve `selfRage` kullanılır.

## 3. fx biçimleri ve motorda uygulanış

**fx biçimleri (veri)**
- `addEffect`: `{ k, effect | byRank[], after? | before?, skill? }`. `replaceEffect`: `{ k, sel, effect | byRank[], skill? }` (seçicinin uyduğu TÜM etkiler değişir). Eklenen / değişen etkinin kopyası `treeNode: '<class>:<düğüm>'` taşır (ölçüm için). `skill` yoksa satırın skill'i.
- `unitFx`: `{ k, fx: { <ItemEffects anahtarı>: değer, … }, rank? }`. Derlenmiş `TreeSetup.fx` + `fxNodes` (anahtar -> düğüm kimlikleri) -> `Combatant.treeFx` / `treeFxNodes`. İki düğüm aynı anahtarı verirse `mergeFxValue`: sayı toplanır (`tierDamageMult` bonus olarak: 1 + Σ(v - 1)), bayrak VEYA, dizi birleşir, nesnede sayılar toplanır (eşik / süre alanlarında ilk değer kalır).
- `hook` `cond` (C1): `{ k:'hook', h:'cond', when?, scale?, sel?, mod, skill?, rank? }`. `mod` anahtarları: hasar için `powerMul` (× (1 + v·ölçek); birden çok kanca çarpılır), `critBonus`, `ignoreDefense`, `lifesteal` (düz ek), `lifestealMul`, `guaranteedCrit`, `maxBonus` (Berserker Rage pasifinin maxBonus'una düz ek); durum için `turns`, `chance`; bedel için `cost` (düz ek, en az 0). Hasar ve durum değişikliği aynı kancada olamaz. `sel`: `damage` (varsayılan) / `damage:N` / `status` (turns / chance varsa varsayılan) / `status:<durum>`. `skill`: yoksa satırın skill'i; `'*'` = her skill; pasif satırı ve bar = her skill.
- `hook` `rage` (C2): `{ k:'hook', h:'rage', on?:'hit'|'cast', gain?, floor?, once?, when?, scale?, rule?:'tallyAll', cost?, after?, skill?, rank? }`. `on: 'hit'` her isabetli hasar vuruşunda (hedef başına), `'cast'` (varsayılan) kullanım sonunda; `floor` = Rage en az bu; `once` = savaşta bir kez; `rule: 'tallyAll'` = skill'in Rage kazancı tüm vurulanların toplamı (perCastCap aynen). `cost` = Rage bedeline ek (Headsman's Blow `spendAll` en az miktarı düşer); `after: '<skill>'` = o skill kullanılınca silahlanır, ilk ödemede harcanır (Into the Fire). Rage'i olmayan class'a `gain` / `floor` / `rule` derleme hatası.
- `rank: true` kancalarda `mod` / `gain` / `cost` değerlerini × rank yapar (`floor` hariç).

**Uygulama noktaları (önizleme, YZ değeri ve gerçek vuruş aynı yoldan):** `powerMul` / `maxBonus` -> `Battle.dealtDamageMult` (önizleme ve tehdit hesabı etkiyi de geçirir); `critBonus` / `ignoreDefense` / `lifesteal` / `guaranteedCrit` -> vuruşun etki kopyası (`Battle.treeEffect`: `strike` + `preview.ts > addDamage`; kopya orijinal etkiye WeakMap ile bağlı, `damage:N` sırası bozulmaz); `turns` / `chance` -> `cast` içindeki durum uygulama noktası + önizlemenin durum satırı; `cost` -> `SkillCost.cond` (yalnızca birimin yamalı skill kopyasında) -> `cost.ts > skillCostAmount` (canUse, ödeme, YZ, önizleme hepsi bunu kullanır). unitFx okumaları item kanalıyla birlikte `tree-hooks.ts` okuyucularından: `effNum` (toplam), `effMult`, `effFlag` (VEYA), `effList` (kaynak başına; tetikler item ve ağaç için AYRI çalışır, bir kezlik bayrak ağaçta `Combatant.treeOnce`), `effFirst` (tek kaynaklı: `nthSpellFree`, `moveStride`; önce item).

**Ölçüm (`treeProc`):** ağaç etkisi tetiklenince `{ type:'treeProc', uid, node }` yan kanala gider: `battle.onTreeProc(listener)` (dönen fonksiyon aboneliği kaldırır) ve `battle.treeProcs()` (uid + düğüm başına sayı). Olay kaydına (`battle.log`) ve olay akışına GİRMEZ; ağaçsız savaşta hiç çağrılmaz, kayıt / golden aynı. Sayılan anlar: C1 kancası vuruşu ya da durumu değiştirdi (vuruş başına), Rage kancası tetiklendi (Rage değişmese de), bedel koşulu ödemede tuttu / silah harcandı, tallyAll kullanıldı, addEffect / replaceEffect etkisi uygulandı, unitFx tetiği ağaç kaynağından çalıştı (secondWind, shieldRefresh, lastStand, vengeance, retortStatus, openerStatus, executeLifesteal, onHitDot, restBlessing, critStatuses, tierStatus, killRush). Sürekli unitFx'ler (armorPen, mpCostReduce, turnMp gibi) sayılmaz.

## 4. Koşullar, ölçekler, değişiklikler (C1)

### Koşullar (`when`)
Her satır: motor adı, anlamı ve gerekiyorsa örnek.

**Hedef durumu**
- `targetStatus`: hedefte bu durum var. Değer dize ya da dizi olur; dizide biri yeter. `{ "targetStatus": "wound" }`
- `targetStatusAny`: `targetStatus` ile aynı (katalogdaki adı). `{ "targetStatusAny": ["slow", "stun"] }`
- `targetStatusTurnsAtLeast`: durumun kalan turu en az n. `{ "targetStatusTurnsAtLeast": { "status": "slow", "n": 2 } }`
- `targetStatusStacks`: yığın sayısı (varsayılan Omen). `{ "targetStatusStacks": { "status": "omen", "eq": 3 } }`
- `targetHasAnyStatus`: hedefte en az bir debuff var. `{ "targetHasAnyStatus": true }`
- `targetHasBuff`: hedefte en az bir buff var. `{ "targetHasBuff": false }`
- `targetOpportunist`: hedefte Opportunist listesindeki durumlardan biri var. `{ "targetOpportunist": true }`

**Hedefin canı, MP'si, zırhı ve yeri**
- Can: `targetFullHp`, `targetHpBelow: 0.3`, `targetHpAbove: 0.8`.
- MP:
  - `targetMpZero`: maks MP'si 0'dan büyük ve MP'si 0.
  - `targetMpAbove: 0.5`.
  - `targetMpZeroBefore`: MP mana yakmadan ÖNCE zaten 0'dı (onEmpty vuruşunda).
- Zırh: `targetArmorAboveMine`, `targetArmorAtLeast: 30`.
- `targetDistance`: senin sıran + hedefin sırası; 0 = ikiniz de öndesiniz. `{ "targetDistance": 2 }` ya da `{ "targetDistance": { "atMost": 1 } }`
- `targetRow`: hedef kendi tarafının en ön ya da en arka DOLU sırasında. `{ "targetRow": "back" }`
- `targetOnGround`: hedefin hücresinde bu zemin var. `{ "targetOnGround": "holy_fire" }`
- `targetIsSelf`, `fasterThanTarget`.
- `targetBeside`: "beside" = aynı sıradaki yan şerit (arşiv: `docs/archive/design/skill-tree-implementation.md` bölüm 10a).
- `targetNextTo`: "next to" = dört yönden komşu.

**Hedefle geçmiş**
- `targetNotActed`: hedef bu savaşta hiç eylem yapmadı.
- `targetLastHitMe`: sana skill ile en son vuran düşman.
- `targetHitMeSinceMyTurn`: son turundan beri sana skill ile vurdu.
- `targetMissedMeSinceTurn`: son turundan beri sana skill ıskaladı ya da vuruşu bloklandı.
- `targetIsMyLastTarget`: önceki skill kullanımının düşman hedeflerinden biri.
- `firstHitOnTarget`: bu düşmana savaştaki ilk isabetin.
- `targetDiedSinceMyTurn`: ölü dost hedef, son turundan beri öldü.

**Kendin**
- Can ve durum: `selfHpBelow: 0.5`, `selfHpAbove: 0.9`, `selfStatus: "fortify"`, `selfTaunting`, `selfArmorAbove: 40`.
- `selfHasShield: "spell_ward"`: o skill'in kalkanı üzerinde ayakta.
- Rage:
  - `rageAtLeast: 50`, `rageAtMost: 20`.
  - `rageSpentAtLeast: 40`: bu kullanımda ödenen Rage.
  - `rageSpentLastTurn`.
- Eylem geçmişi: `notMovedLastTurn`, `firstTurn` (savaştaki ilk eylem).
- `firstUseOfSkill`: bu skill'in savaştaki ilk kullanımı; bedel kancasında da çalışır. `{ "when": { "firstUseOfSkill": true }, "mod": { "costMul": -1 } }`
- Diğerleri: `notHitSinceMyTurn`, `lastSkillCostMp` (önceki skill'in MP bedeli vardı), `anyEnemyStatus: "jinxed"`.

**Bu vuruş ve bu kullanım**
- Vuruş sonrası: `hitIsCrit`; `killingBlow` (bu vuruş hedefi öldürdü).
- Vuruşun yeri ve sırası:
  - `targetIsCenter`: alanın tıklanan merkez hücresi; `false` = merkez dışı.
  - `centerHitIndex: 2`: merkezdeki 2. vuruş.
  - `repeatIndexAtLeast: 1`: Double Hit'in tekrar vuruşu.
- `hitCountAtLeast: 3`: kullanım sürerken hedef sayısı, kullanım sonunda isabet eden sayısı.
- `firstHitThisTurn`: bu kullanımda henüz isabet yok.
- Kullanım sonu kancalarında anlamlı olanlar: `killedThisCast`, `hpPaidThisCast`, `silencedAny`, `healedCountBelow: { "below": 0.5, "atLeast": 2 }`.
- Bahis: `betWon`, `betLost`, `betChanceAtLeast: 0.7`, `stakeAtLeast: 20`.

**Vuruş dışı noktalar**
- `at: ground` ile: `groundAgeAtLeast: 2`.
- `at: doom` ile: `firstDoom`, `doomSource: "doom_mark"`, `omenFromTransfer`.
- `incomingArea`: gelen vuruşun skill'i alan skill'i (aura kancası ve C4 `damageTaken` `when`'i).

### Ölçekler (`scale`, TEK anahtar)
- **Hedefin durumu ve zırhı:**
  - `targetStatusTurns: "slow"`: kalan tur.
  - `targetStatusStacks: "omen"`: yığın sayısı.
  - `targetArmor: 1`: her 1 zırh = 1.
  - `selfArmorOver: { "over": 40, "per": 5 }`.
- **Hedefler ve dostlar:**
  - `hitWithStatus: "wound"`: bu kullanımın durumlu, canlı hedef sayısı.
  - `alliesInAura`, `alliesHpBelow: 0.5`.
- **Can, Rage ve mesafe:**
  - `missingHp: 0.1`: kendi eksik canının her %10'u = 1.
  - `targetMissingHp: 0.02`, `selfRage: 1`.
  - `targetDistance: 1`: sıra başına 1.
- **Kullanım sayıları:**
  - `hitCount: 1`: hedef ya da isabet sayısı eksi 1, yani "ilkten sonraki her biri". `{ "minus": 1 }` da yazılabilir.
  - `skillStreak`: bu skill'i daha önce üst üste kaç kez kullandığın; ilk kullanımda 0.
  - `repeatIndex`.
  - `hpPaidAmount: 10`: bu kullanımda ödenen her 10 can = 1.
- **Diğerleri:**
  - `dotTickIndex` (`at: dot`): bu durumun önceki tik sayısı; ilk tikte 0.
  - `buffsRemoved`: bu kullanımda silinen buff sayısı.
  - `hitsTakenSinceLastUse`: bu skill'i son kullandığından beri yediğin skill vuruşu.

### Değişiklikler (`mod`)
Her grup için hangi değişikliklerin olduğu ve nerede çalıştıkları.

**Hasar** (vuruş başına; önizleme, YZ ve gerçek vuruş aynı yoldan geçer)
- `powerMul`: x (1 + v). Çalıştığı yerler: `hit`, `doom`, `dot`, `ground`, `passiveHeal`.
- `critBonus`: kritik şansına ek (`hit`, `doom`).
- `ignoreDefense`: zırh delme (`hit`, `doom`).
- `lifesteal`: düz ek (`hit`, `doom`, `dot`). `lifestealMul`: çarpan.
- `guaranteedCrit`: kesin kritik.
- `noCrit`: kritik olamaz; kesin kritiği de bozar.
- `sureHit`: isabet zarı atılmaz; blok yine olabilir.
- `critDmgMul`: kritik çarpanı x (1 + v). Searing Crit: `{ "mod": { "critDmgMul": 0.06 }, "rank": true }`
- `flatDamage`: zırhtan SONRA eklenen düz hasar. Blood Banshee bunu `scale: { "hpPaidAmount": 10 }` ile kullanır.
- `falloffAdd`: bu hedefin şerit falloff'una ek. `repeatChance`: Double Hit şansına ek.
- `drainMul` / `drainAdd`: Vampiric Bite şifasının çarpanı / oranına ek; yalnızca kendi vuruşunda.
- Opportunist ve Berserker:
  - `passiveBonus`: Opportunist bonusuna ek.
  - `opportunist: true`: hedef listede sayılır.
  - `opportunistAlt`: alternatif bonus; büyük olan geçer.
  - `maxBonus`: Berserker.

**Durum uygulama noktası** (`sel: "status:<durum>"`)
- `turns`, `chance`.
- `statusPotency: { alan: ek }`: durumun gücüne ek.
  - Alanlar: `accuracyDelta`, `evasionDelta`, `critDelta`, `damageTakenMult`, `speedMult`, `healTakenMult`.
  - Jinxed için ayrıca: `attacks` (düşmeden önceki ek saldırı sayısı) ve `keepChance` (düşmeme şansı).
- `permanent: true`: durum süresiz olur.

**Vuruş sonrası** (isabet eden hedef başına; `hit` noktası, `addStatus` ayrıca `passiveHeal`)
- `addStatus: { "status", "turns", "chance"?, "self"? }`: hedefe ya da kendine durum verir.
- `removeStatus: "stun"`: hedeften durumu siler. Mercy Stroke: `{ "skill": "headsmans_blow", "when": { "targetStatus": "stun" }, "mod": { "sureHit": true, "guaranteedCrit": true, "removeStatus": "stun" } }`
- `extendStatus: { "status": "<durum>" | "*", "turns", "chance"? }`: hedefteki durumu uzatır. `*` = hedefteki debuff'lardan seed'li rastgele biri. Let It Ride: `{ "when": { "betWon": true }, "procChance": 0.15, "mod": { "extendStatus": { "status": "*", "turns": 1 } }, "rank": true }`

**Diğer gruplar**
- **Kullanım sonu:** `cooldownSet` (bu kullanımın cooldown'u = v), `cooldownDelta`, `echoChance` (Spell Echo şansına ek), `echoSet`.
- **Bahis:** `winChance`, `winSet`, `stakeMul`. Sure Thing: `{ "when": { "betChanceAtLeast": 0.7 }, "mod": { "stakeMul": -1 } }`
- **Mana yakma** (hedef başına): `manaBurnAdd`, `manaBurnMul`, `emptyChance`, `emptySet`.
- **Omen ekleme** (hedef başına): `omenStacks`, `omenSet`.
- **Dark Bond kopyası:** `bondRatio` (kopya payına düz ek, pay + v; "+3% more of your healing" = 3 puan; 2026-10-27 düzeltmesi, eskiden yanlışlıkla pay x v).
- **Mana Overflow sayacı** (sahibi vurulunca): `blockedMul`. Soaking Robes: `{ "mod": { "blockedMul": 0.04 }, "rank": true }`
- **Bedel:** `cost`, `costMul`.

### Sonradan eklenen koşul, ölçek ve değişiklik anahtarları (kodda var)
- `targetTier: "elite"` (dize ya da dizi, biri yeter; `"boss"` da olur): hedefin rütbesi (Vesper Toll for One).
- `targetLowestHp: true`: hedef, kullanım başında mevcut canı en düşük düşman (eşitlikte hepsi; önizlemede şimdiki can; Knell).
- `targetFrontAtCast: true`: hedef, kullanım başında düşman tarafının en ön dolu sırasında (önizlemede şimdiki dizilim; Wide Toll).
- `selfBells`: bu savaşta sahibin çaldığı çan sayısı; tek sayı = en az, ya da `{ atLeast, atMost }`. Bedel koşulunda da çalışır (`SELF_CONDS`; Angelus: `{ "selfBells": 8 }`). Ölçek olarak da vardır (`scale: { "selfBells": 1 }`, çalınan her çan = 1; Cathedral Choir). Çan nasıl sayılır: bölüm 10.
- `thrown`, `centerCritsAtLeast`, `castMpZeroAtLeast`, `stillStreakAtLeast`: bölüm 9. `incomingArea`: gelen vuruşun skill'i alan skill'i; aura kancasında (`at: aura`) ve C4 `damageTaken` `when`'inde değerlendirilir.
- `mod.critMultAdd`: kritik çarpanına düz ek, item'lerdeki Crit damage gibi (Searing Crit +%6: `0.06`, 1,5 -> 1,56). `mod.drainBond`: Soul Drain şifasının tamamı Dark Bond'lu dosta gider (Lifeline). `mod.echoMul`: Spell Echo şansı x (1 + v), ekler ve sabitten sonra (Endless Refrain).
- `at: smite` ve `at: aura` geçerlidir (bölüm 2 listesi): smite noktasında `powerMul`, `critBonus`, `ignoreDefense`, `lifesteal`, `lifestealMul`, `guaranteedCrit`, `critDmgMul`, `critMultAdd` çalışır.

## 5. Skill alanları (a*) ve (b) ekleri

### a* alanları (`k: "skill"`, `sel` + `f` + `op`)
- `self`: `cost.amount`, `cost.ofCurrent`, `cooldown`, `initialCooldown`, `count`, `turnCost`.
- `damage` / `damage:N`: `power`, `lifesteal`, `ignoreDefense`, `critBonus`, `powerPerRage`, `executeBonus`, `falloff`, `repeatChance`.
- `bet` (hasar etkisinin bahsi): `ratio`, `winMult`, `loseMult`, `perStake`, `winChance`. Penny Ante: `[{ "k": "skill", "sel": "bet", "f": "ratio", "op": "set", "v": 0.05 }, { "k": "skill", "sel": "bet", "f": "winMult", "op": "set", "v": 1.6 }]`
- Durum ve savunma etkileri:
  - `status:<durum>`: `turns`, `chance`.
  - `taunt`: `turns`, `breakRatio`, `allyDamageMult`.
  - `guard`: `turns`, `share`.
  - `ground`: `turns`, `power`.
  - `bonusScale:<stat>`: `pct`.
- Şifa ve kalkan:
  - `heal`: `power`, `missingHpBonus`.
  - `hot`: `power`, `turns`.
  - `shield`: `power`, `bonusPerMana`.
  - `revive`: `hpRatio`, `mpRatio`.
- `manaBurn`: `amount`, `pctMax`, `gainRatio`, `onEmpty.chance`, `onEmpty.turns`, `onEmpty.damage.power`.
- Diğer etkiler:
  - `omen`: `stacks`, `critStacks`.
  - `dot`: `power`, `turns`.
  - `bond`: `ratio`, `turns`.
  - `summon`: `lifespan`.
  - `dispel`: `count`.
  - `randomStatus:<durum>`: `turns`, `weight`.
- **`op: "remove"`** alanı siler. Silinebilen alanlar: `lifespan` (süresiz çağrı), `count` (hepsini sil), `chance` (kesin), `falloff`, `cost.ofCurrent`, `initialCooldown`. `{ "k": "skill", "sel": "summon", "f": "lifespan", "op": "remove", "v": 0 }`

### (b) ekleri
- **`removeEffect`:** `{ "k": "removeEffect", "sel": "damage", "skill"? }`.
  - Hasar etkisi kalmazsa skill yine isabet zarı atar (`treeHitRoll`, arşiv `docs/archive/design/skill-tree-implementation.md` bölüm 10a). Iskalanan düşmana durum, yakım, Omen ya da dispel işlemez.
  - Aynı düğümde önce `removeEffect`, sonra `addEffect` yazılır.
- **`addEffect` / `replaceEffect` etkisindeki yeni bayraklar:**
  - `preHit: true` (yalnızca durum etkisinde): durum, hedefin bu kullanımdaki ilk isabetinde hasardan ÖNCE işler; aynı vuruşun koşulları onu görür. Gore Wheel: `{ "k": "addEffect", "after": "damage", "effect": { "type": "status", "status": "wound", "turns": 2, "preHit": true } }`
  - `permanent: true`: durum, dot ya da zemin süresiz olur.
  - Dispel için `kinds: ["stun", …]`: yalnızca bu durumları siler.
  - Dispel için `self: true`: kendinden siler. Clean Slate: `{ "type": "dispel", "status": "debuff", "self": true }`
- **Ortak Burning değeri (arşiv: `docs/archive/design/skill-tree-implementation.md` bölüm 10a):** TEK yer `data/statuses.json > burning.dot` = `scale: int`, `power: 0.12`, `turns: 2`.
  - `{ "type": "dot", "status": "burning" }` yazmak yeter; eksik alanlar oradan gelir.
  - Bir `status` etkisi ya da `addStatus` Burning verirse miktar yine buradan hesaplanır.

### Ek skill alanları (`skill-tree-compile.ts > FX_FIELDS`'te var)
- `self`: `cost.hpFallback` (yalnız MP bedelinde, oran 0-1: MP yetmezse mevcut canın oranı; Soul Exchange), `ringsBell` (skill'in bir kullanımda çaldığı çan: `true` = 1, sayı = N; Vesper).
- `damage` / `damage:N`: `powerPerBell` (çalınan çan başına ek güç; Vesper).
- `bet`: `hpStake` (yalnız MP bahsinde: bahse can parçası ekler, canı en az 1 bırakır; Mortgage).
- `ground`: `stackMult`, `centerMult` (bölüm 8). `bond`: `permanent` (`op: "on"`). `push`: `crashPower` (itme çarpma hasarı oranı; Mage Ice Crater).
- `brand` (Ley Brand, Anti-Mage): `turns`, `taintPct`, `costMult`, `burnDamagePct`, `explodePct`, `silenceOnEmpty`, `centerTaintMul`, `spread` (bayrak).
- Pasif alanları: `perBell` (Pealing Bells: çan başına güç payı), `dotTurns`, `selfPct`, `extraRows`, `status` (kaldırılabilir).

## 6. Sonradan eklenen yazım araçları

- **`rank: "chance"`** (kanca): yalnızca `procChance` rank ile çarpılır, `mod` sabit kalır ("rank başına %X şansla +1 tur"). Deep Tangle, Far Toss, Long Quiet, Long Con.
- **Durum kancası her yerde:** DoT (`dot`), rastgele durum (`randomStatus`) ve mana boşalma durumu (`onEmpty.status`) de `sel: "status:<ad>"` kancasından geçer (süre eki, `statusPotency`). Fog of Ill Luck, Long Quiet, Long Con.
- **Mana yakma noktasında vuruş bilgisi:** `at: "burn"` kancasında `targetIsCenter` (alanın merkez hücresi) ve yakım öncesi MP. Focused Siphon (`manaBurnMul`), Heart of Quiet (`emptySet 1`).
- **Mana yakma `amount` + `pctMax` birlikte toplanır** (Deep Cut: `pctMax add 0.03, rank`).
- **`dispel` + `random: true`:** adaylardan seed'li rastgele seçim (Prying Blade). Etki, skill'de bir hasar etkisinden SONRA geliyorsa isabete bağlıdır; önce geliyorsa (Spellsplitter, `first: true`) ıskada da işler.
- **`onEmpty.damage` kaldırılabilir** (`op: "remove"`; Shallow Net). Motor boşalma hasarını yalnızca alan varken vurur.
- **`addEffect` + `first: true`:** etkiyi en başa koyar. **Hoşgörülü derleme:** `compileTree` uymayan yer seçicisini başa / sona koyar, başka düğümün kaldırdığı etkiye bakan yamayı sessizce atlar (Spellsplitter + Drained Dry, Desperate Sap + Deep Spring çökmez). `checkTreeFx` sıkı kalır.
- **`needs: "<düğüm>"`** (fx alanı): bu fx o düğümün yamalarından SONRA uygulanır, `checkTreeFx` de önce o düğümü uygular (Whiteout <- Driving Snow, Iron Oath <- Blood Oath).
- **`replaceEffect` + `collapse: k`:** `hot` -> tek `heal`, güç = hot.power x turns x k (Desperate Sap 1,25).
- **Etki koşulu `when`** (status / taunt / dispel / shield / guard etkisinde): yalnızca koşulu tutan alıcıya işler (Ward Taunt: `targetIsSelf`).
- **Pasif alanları:** `dotTurns` (Nature's Grudge'ın Wither süresi, yoksa `turns`), `status` kaldırılabilir (Black Mold: Slow yok), `selfPct` (Bulwark Aura'nın sahibine payı, yoksa `pct`).
- **`{ "k": "stat", "f": "hpMult", "op": "mul", "v": -0.2 }`:** maks can çarpanı (Gaunt Frame).
- **Yeni koşullar:** `oncePerTarget` (kanca her düşmana savaşta bir kez; Grave Shackle), `firstCooldownSkill` (savaşın ilk cooldown'lu skill'i; Warm Hands, First Refrain), `skillStreakOf: { skill, atLeast }` (Blind Zeal). Bedel koşulunda `targetDiedSinceMyTurn` kullanılabilir (Not Yet; kullanılabilirlik geçerli hedeflerden en ucuzuna bakar, ödeme seçilen hedefle).
- **Yeni ölçekler:** `sharpshooterBonus: k` (Sharpshooter'ın o hedefe verdiği bonus x k; Eagle Eye), `stillStreak: { max }` (üst üste Move'suz eylem; Rooted Stance).
- **Aura kancası `at: "aura"` + `auraPct`:** Bulwark Aura payına düz ek; alıcı = hedef, gelen vuruş = o an skill kullanan düşman (Weathered: `incomingArea`). Braced Stance, Tight Formation, Weathered, Rooted Stance.
- **Kural kancası `{ "k": "hook", "h": "rule", "rule": "noMove" }`:** Move yasak (Anchored Stone).
- **`drop: "<düğüm>"`** (kanca): o düğümün kancalarını kaldırır (Blind Zeal, Rising Fervor'un yerine geçer).
- **Guard + `bond: true`:** yalnızca kullanıcının Dark Bond'lu dostuna, bağ sürdükçe; bağ bitince kalkar (Blood Oath). **`bond` + `permanent` (`op: "on"`):** bağ süresiz (Crimson Covenant).
- **unitFx `vengeance.scope: "any"`:** herhangi bir dost düşünce (Last Wall Standing).
- **Düzeltmeler:** bedel koşulu kendi skill id'sini görür ve yalnızca bedel koşulu olan (kancasız) ağaçlı birimde de "ilk kullanım" sayılır (Formed Up); Divine Light koşulu şifadan ÖNCE değerlendirilir (Banner of Dawn); bar süre eki (Knee Shots) kancaların eklediği durumlara da işler; hasarsız skill'de de kritik zarı atılır (Eye of Ruin); Doom Mark öldürmesinde sahibin `onDoomKill`'i > 0 ise Omen geçer (Doom Leaks; ağaçsızda 0, eski davranış).

- Yeni durumlar `Exposed` ve `Sunder`: tanım `data/statuses.json`.

## 7. Tetik (C3) ve C4: olay -> eylem, alıcı, taban, şifa noktaları

Kod yerleri:
- Motor: `src/engine/tree-hooks.ts` (`TriggerHook`, `TriggerAction`, `HealHook`, `TreeBuff`; listeler `TRIGGER_EVENTS`, `TRIGGER_TARGETS`, `TRIGGER_BASES`, `HEAL_POINTS`) ve `src/engine/battle.ts` ("Faz 4a" bölümü).
- Derleyici: `src/progression/skill-tree-compile.ts` (`compileTrigger`, `compileAction`, `compileHeal`).

Ağaçsız savaş birebir aynı kalır:
- Tetik noktaları yalnızca tetik taşıyan birim varsa çalışır; C4 noktaları da yalnızca C4 kancası taşıyan birim varsa.
- Ağaçsız savaşta zar sırası ve olaylar değişmez.

### Genel kurallar
- **Yazım:**
  - Tetik: `{ "k": "hook", "h": "trigger", "on": <olay>, ...süzgeçler, "when"?, "scale"?, "once"?, "every"?, "procChance"?, "rank"?, "do": [<eylem>, ...] }`
  - C4: `{ "k": "hook", "h": "heal", "on": <nokta>, ... }`
- **`rank: true`:**
  - Eylem sayıları rank ile çarpılır: `heal`, `shield`, `hpLoss`, `rage`, `mp`, `sooner`, `charge`, `damage`, `power` ve sayı olan `cooldown`.
  - Buff değerleri de çarpılır.
  - C4'te `mul` ve `ratio` çarpılır.
  - Süre, şans, yığın, eşik ve `min` çarpılmaz.
- **Skill kapsamı:**
  - Skill'e bağlı olaylarda (aşağıda "S" işaretli) ve C4 `healDealt` / `overhealDealt` / `shieldDealt` / `overheal` noktalarında varsayılan, düğüm satırının skill'idir (Grave Robber → Headsman's Blow).
  - Pasif satırında (0) ve mastery barında kapsam yoktur, yani her skill sayılır.
  - `"skill": "*"` ile kapsam açıkça kaldırılır.
  - Öbür olaylarda `skill` verilemez (derleyici hata verir).
- **Koşul ve ölçek:** C1'in koşul (`when`, `not` / `any` dahil) ve ölçek (`scale`) sözlüğü aynen geçerli. Bağlam:
  - `self` = kanca sahibi.
  - `target` = olayın hedefi.
  - `incoming` = olayı düşman çıkardıysa o düşman, skill'i ve hasar türü (gelen skill'in ilk hasar etkisinden).
  - `amount` = olayın miktarı.
- **Yeni koşullar:**
  - `incomingStatus: "<durum>"`: gelen saldıranda bu durum var.
  - `incomingRanged: true/false`: gelen skill'in hareketi `melee` değil.
  - `incomingType: "physical" | "magic"`: gelen hasarın türü.
  - `eventAmount: N | { atLeast, atMost }`: olay miktarı karşılaştırması.
- **Yeni ölçek:** `eventAmount: N` = floor(olay miktarı / N).
- **Bir kez:**
  - `once: true`: savaşta bir kez.
  - `once: "perTarget"`: hedef başına bir kez.
  - `once: "perTurn"`: sahibin turu başına bir kez.
  - `once: "perShield"`: kalkan katmanı başına bir kez; yalnızca `shieldAbsorb`.
  - `every: N`: her N. olayda bir.
  - `procChance`: tohumlu (seed'li) zar.
  - `hpBelow` bir alt eşiği birim başına bir kez geçer (yeniden yukarı çıkıp inse de).
  - `mpBelow` savaşta bir kez.
- **Zincir koruması** (motor güvenliği, denge sınırı değil):
  - Bir tetiğin eylemi yeni tetik doğurabilir. İç içe derinlik en çok 4.
  - Bir zincirde aynı (birim, düğüm) en çok 8 kez işler.
  - Bir kez bayrakları eylemlerden önce yazılır, böylece eylemin doğurduğu aynı olay tetiği yeniden açmaz.
- **Ölçüm:** her tetiklenme ve her C4 uygulaması `treeProc` yazar.
- **YZ ve önizleme:**
  - Tetikler YZ değerine girmez (arşiv: `docs/archive/design/skill-tree-implementation.md` bölüm 4.1).
  - Tetiğin verdiği buff (`TreeBuff`) önizleme, YZ ve gerçek vuruşta aynı yoldan (sanal C1 kancası) okunur, yani önizleme sayısı doğrudur.
  - C4 çarpanları (`treeTakenMult`, `treeHealMult`, `treeShieldMult`) önizlemede de kullanılır. İstisnalar: `bigHit` önizlemede görünmez; `overheal` dönüşümü önizlemede gösterilmez.
- **Durum süzgeci:** statuses.json durumları + motorun özel kodlu durumları (`taunt`, `guard`, `regen`). Özel kodlu durumlar yalnızca süzgeç olarak kullanılabilir, eylemle verilemez.

### Olaylar (`on`)
Olay listesinin kodu: `tree-hooks.ts > TRIGGER_EVENTS` (47 olay). `enemyMissed`: `who` (self / ally / any), `subject` = hedeflenen dost, koşul `targetStatus` saldıran düşmana bakar.
"S" = skill süzgeci var.

| Olay | Ne zaman (kanca sahibi) | Olay hedefi (`to: "target"`) | Süzgeçler | Örnek |
|---|---|---|---|---|
| `battleStart` | savaş başında | — | — | Shield Brothers: `do [{shield 0.1, to auraAllies}]` |
| `turnStart` | sahibin her tur başında | — | — | Stubborn Heart: `when selfHpBelow 0.25`, `heal 0.03` |
| `kill` S | sahip bir düşmanı öldürünce | ölen | `via` skill / dot / doom / ground | Grave Robber: `heal 0.25` + `status fortify 1` |
| `enemyDied` | herhangi bir düşman ölünce | ölen | `status` (+`mine`), `ground` | Kindled Path: `ground holy_fire`, `cooldown -1, cd judgment` |
| `allyFell` | bir dost ölünce (çağrı hariç) | ölen | — | — |
| `statusGained` | sahip bir durum alınca | durumu uygulayan (yoksa sahip) | `status` | Hardened: `status fortify`, `heal 0.02, rank` |
| `statusApplied` S | sahip birine durum uygulayınca | durumu alan | `status` | Stagger Step: `status stun, once`, `sooner 0.3` |
| `statusEnd` | sahipteki durum biterse (`mine`: sahibin uyguladığı durum biterse) | durumu taşıyan | `status`, `end` broken / expired / dispelled, `mine` | Refused to Fall: `status taunt, end broken` |
| `hpBelow` | can eşiğin altına inince | düşmansa vuran | `below` (zorunlu), `who` self / ally / any / bonded / aura | Iron Retort: `below 0.5, once`, `stun 1 to target` |
| `mpBelow` | MP eşiğin altına inince (savaşta bir kez) | — | `below` | Low Tide: `below 0.25`, `free` |
| `skillUse` S | sahip skill kullanınca (etkilerden sonra) | seçilen hedef | `every`, `when firstUseOfSkill` | Thick Skull: `shield 0.03, rank` |
| `echo` / `echoFail` S | Spell Echo zarı tuttu / tutmadı (yalnızca turns modu) | — | — | Sympathy: `cooldown -1, cd others` |
| `jackpot` / `bust` S | bahis kazandı / kaybetti | — | `resource` hp / mp; `amount` = bahis | Blood Debt: `bust, resource hp`, `buff powerMul 0.15` |
| `luckyEscape` | Lucky Escape sahibi kurtarınca | saldıran | — | Death Shrug: `heal 0.1` |
| `manaOverflow` | Mana Overflow her tetiklenişte | — | `amount` = taşan MP | Overflow Spill: `mp 1, to lowestMpAlly, rank` |
| `crit` / `hit` S | sahibin skill vuruşu kritik oldu / isabet etti (vurulan her hedef için) | vurulan | `amount` = cana ulaşan hasar | Hot Streak: `buff guaranteedCrit, skill fire_bolt`; Spin Recovery: `hit`, `heal 0.01, rank` |
| `hitTaken` | sahip skill vuruşu yiyince | vuran | — | — |
| `allyHit` | bir dost bir düşmana skill ile vurunca | vurulan düşman (`source` = vuran dost) | — | Shared Spoils: `when targetStatus overextended`, `mp 4 to source` |
| `dodge` | sahip bir saldırıdan kaçınınca | saldıran | — | Light Step: `mp 2` |
| `enemyMissed` | düşman sahibin tarafına ıskalayınca / kaçırılınca | saldıran (`subject` = hedeflenen dost) | `who` self / ally / any | Woeful Turn: `when targetStatus jinxed`, `staggered to target` |
| `shieldAbsorb` / `shieldBreak` S | sahibin attığı kalkan bir vuruşu emince / kırılınca | saldıran (`subject` = kalkanlı) | `once perShield` | Ice Mirror: `once perShield`, `slow 2 to target` |
| `doom` S | sahibin Doom'u patlayınca | Doom yiyen | `amount` = Omen sayısı | Hour of Ruin: `once`, `cooldown -2, cd doom_mark` |
| `dotTick` | sahibin uyguladığı DoT bir tik vurunca | konak | `status`; `amount` = tik hasarı | Bitter Balm: `heal 0.2, of amount, to lowestHpAlly` |
| `passiveHeal` | Divine Light (pasif şifa) bir dostu iyileştirince | iyileşen | `amount` = şifa | Anointed Arms: `buff powerMul 0.15, to target` |
| `skip` | sahip Skip Turn yapınca | — | — | Held Breath: `buff guaranteedCrit + ignoreDefense 0.3` |
| `enemyMoved` | bir düşman Move yapınca | hareket eden | `near` (en çok uzaklık) | — (Range Keeper freeCast ister) |
| `enemyBuffed` | bir düşman buff alınca | buff alan | `status` | Hunter's Read: `charge 3, rank` |
| `enemyHealed` | bir düşman iyileşince | iyileşen | `amount` = şifa, `prevented` = Wound'un kestiği | Stolen Remedy: `heal 1, of prevented` |
| `payHp` S | sahip skill bedelini canla ödeyince | — | — | Blood Hymn: `heal 1, of hpPaid, to bonded` |
| `dispel` S | sahip bir durumu silince (silinen her durum için) | silinen durumun taşıyanı | `status` | Cauterize: `heal 0.02, to target, rank` |
| `mpEmptied` / `manaBurned` S | sahibin yakması hedefin MP'sini 0'a indirdi / MP yaktı | yakılan | `amount` = yakılan MP | Drink Deep: `manaBurned`, `heal 1, of amount` |
| `revived` S | sahip birini diriltince | dirilen | — | Shielded Return: `shield 0.04, to target, rank` |
| `repeat` S | sahibin tekrar vuruşu (Double Hit) işleyince | vurulan | — | Nimble Fingers: `sooner 0.02, rank` |
| `repeatFail` S | Double Hit zarı tutmadı (tekrar vuruşu yok) | — | — | Rolling Dice |
| `allyFilled` | Mana Overflow bir dostu maks MP'ye doldurdu (sahip Anti-Mage) | dolan dost (`subject` = dost) | — | Brimming Ally |
| `groundEnd` | sahibin bıraktığı zemin bitti | — (alıcı `inGround`: içindeki düşmanlar) | — | Day of Judgment |
| `arrive` | çağrı sahaya indi (dinleyen çağrının kendisi) | çağrı | — | Druid / Undead çağrı düğümleri |
| `summonDeath` | sahibin çağrısı öldü ya da süresi doldu (dinleyen çağıran) | çağrı | `unit`; alıcı `lastHit` (çağrının son vurduğu düşman), `nearestEnemies` | Pox Bloom |
| `crash` | sahibin itmesi çarptı (tahta kenarı, kapalı hücre ya da dolu hücre; Mage itmesi) | itilemeyen birim; `skill` = itmenin skill'i | — | Battering Frost |
| `instinct` | Spellbreaker's Instinct işledi: MP ödeyen düşmanın sıra sayacı kaydı (o düşmanın turları arasında bir kez) | MP ödeyen düşman (`source` aynı) | — | Ready Reflexes |
| `threadConsumed` | Ley Brand bir Ley Thread'i tüketti (hasarsız Brand, iplikli düşman) | iplikli düşman (`source` = sahip, `skill`) | — | Snapping Thread |
| `bellRung` | sahip bir çan çaldı (çan başına bir kez; kaynak fark etmez: skill, tetik, savaş başı) | — | `every` | Counted Strokes, Quickening Peal |

### Eylemler (`do` listesi; her eylemde TAM BİR ana anahtar + `to`)

| Ana anahtar | Anlamı | Yardımcı alanlar | Örnek |
|---|---|---|---|
| `heal: x` | alıcıya taban x şifa (en az 1); şifa kurallarından (Wound, C4) geçer | `of` (varsayılan `maxHp`) | `{ "heal": 0.25 }` |
| `shield: x` | taban x kalkan; `turns` verilirse süreli katman | `of`, `turns`, `magic` | `{ "shield": 0.3, "of": "armor" }` |
| `status: "<ad>"` | durum uygular. Yığınlı durum `stacks` ister, öbürleri `turns` ister. DoT gücü statuses.json'da yoksa `power` + `stat` gerekir. Staggered kendi kuralıyla uygulanır (yalnızca turns modu). | `turns`, `stacks`, `chance`, `power`, `stat` | `{ "status": "stun", "turns": 1, "to": "target" }` |
| `removeStatus: "<ad>"` | alıcıdan o durumu siler | — | Bastion Cry: `{ "removeStatus": "fortify" }` |
| `damage: x` | sahibin `stat` gücü x x hasar. Tür: str/dex fiziksel, int/luck büyü; element verilmezse fiziksel / arcane. Ya da `of: "amount"` ile olay miktarı x x. | `stat`, `of`, `damageType`, `element` | Backlash: `{ "damage": 0.4, "stat": "luck", "element": "dark", "to": "target" }` |
| `rage: n` | +n Rage (yalnızca Rage'li sınıf) | — | — |
| `mp: n` | +n MP (maksimumla sınırlı) | — | `{ "mp": 5 }` |
| `hpLoss: x` | alıcı taban x can kaybeder (en az 1 can kalır) | `of` | Grief's Toll: `{ "hpLoss": 0.1 }` |
| `cooldown: n \| "reset"` | cooldown değişimi. `cd`: `event` (olayın skill'i; varsayılan kapsam), `all`, `others` (olayın skill'i hariç hepsi), `longest`, ya da bir skill id'si | `cd` | Resonant Kill: `{ "cooldown": -1, "cd": "longest" }` |
| `sooner: x` | alıcının bir sonraki turu x oranında erken gelir (turns modu; mevcut Skip Turn hız desteği) | — | Rapid Recall: `{ "sooner": 0.04 }` |
| `buff: { mod }` | sonraki skill'e C1 değişikliği (`TreeBuff`); gruplar damage / status / proc / cast / bet. `uses` (varsayılan 1, 0 = süresiz), `turns` (sahibin tur başında azalır), `skill` (id ya da `event`), `stack` (aynı düğümün buff'ı birikir) | `uses`, `turns`, `skill`, `stack` | Next in Line: `{ "buff": { "powerMul": 0.5, "sureHit": true } }` |
| `free: true` | sonraki skill bedelsiz (HP / MP / Rage) | `uses` | Red Reserve: `{ "free": true }` |
| `clear: true \| "<düğüm>"` | o düğümün buff'ını ve `every` sayacını sıfırlar | — | Unbroken Run: `echoFail` → `{ "clear": true }` |
| `charge: n` | Mana Overflow sayacına +n | — | Hunter's Read: `{ "charge": 3 }` |
| `bell: n` | sahibin çan sayacı +n (alıcı yok; Vesper) | `skill` | Matins: `{ "bell": 1 }` |

**Kullanım sırası:** kullanım sırasında kazanılan buff / free o kullanımda harcanmaz (`pending`); kullanım bitince etkinleşir.

### Alıcılar (`to`; varsayılan `self`)
- `self`: kanca sahibi.
- `target`: olayın hedefi (tablodaki sütun).
- `subject`: olayın konusu (durumu taşıyan, hedeflenen dost, ölen).
- `source`: olayı yapan.
- `allEnemies`, `allAllies`, `otherAllies`.
- `randomEnemy`: seed'li seçim.
- En düşük / en yüksek oran (eşitlikte küçük hücre): `lowestHpAlly` (can oranı), `lowestMpAlly` (MP oranı), `lowestHpEnemy`, `highestHpEnemy`.
- `nearestEnemy`: konuya en yakın düşman.
- `neighbors`: konunun komşuları.
- `castTargets`: sürmekte olan kullanımın hedefleri.
- `bonded`: Dark Bond eşi.
- `auraAllies`: sahibin aurasındaki dostlar.
- `rowBehind`: bu kullanımın vurduğu sıranın hemen arkasındaki sıra (Vesper Forked Peal).
- `adjacentEnemy`: öznenin yanındaki (dört yön) tek düşman (eşitlikte küçük hücre). `lowestHpOtherAlly`: sahibi dışındaki en düşük canlı dost. `placedGround`: bu olayda sahibin tetikle bıraktığı zeminlerin içindeki düşmanlar.

### Tabanlar (`of`; kod: `src/engine/tree-hooks.ts > TRIGGER_BASES`)
- `maxHp`: alıcının maks canı. `ownerMaxHp`: sahibin. `targetMaxHp`: olay hedefinin.
- `currentHp`: alıcının mevcut canı. `ownerCurrentHp`: sahibin.
- `armor`: alıcının görünen zırhı (aura dahil). `ownerArmor`: sahibin.
- `amount`: olay miktarı.
- `hpPaid`: bu kullanımda ödenen can.
- `stake`: bahis.
- `prevented`: Wound'un kestiği şifa.
- `shieldSize`: kırılan kalkanın ilk boyu. `auraBonus`: aura zırh bonusu. `dealt`: olayın verdiği hasar. `ground`: olaydaki zeminin tik gücü. `firstHeal`: biten durumun ilk şifası. `stacks`: ölenin yığını.

### C4 noktaları (`h: "heal"`)

| Nokta | Anlamı | Alanlar | Örnek |
|---|---|---|---|
| `healTaken` | sahibin ALDIĞI şifa x (1 + mul) | `mul`, `when` | Grit: `when selfHpBelow 0.25`, `mul 0.05, rank`; Measured Mending: iki kanca (`mul 0.25` / `not` ile `mul -0.5`) |
| `healDealt` | sahibin VERDİĞİ şifa x (1 + mul); koşul hedefe bakar | `mul`, `skill`, `when` | Soft Hands: `when targetHpBelow 0.5`, `mul 0.04, rank` |
| `overheal` | sahibe gelen şifanın maks canı aşan kısmı kalkana (`turns`) ya da Rage'e (%1 maks can başına `ratio` Rage) döner. `cap`: canı bu oranın üstüne çıkaracak kısım döner (şifa cap'te durur) | `into`, `ratio`, `turns`, `cap`, `skill` | Red Line: `cap 0.5, into shield, ratio 1, turns 2`; Blood Glut: `into rage, ratio 1` |
| `overhealDealt` | sahibin verdiği şifanın fazlası alıcıya kalkan olur | `into: "shield"`, `ratio`, `turns`, `skill` | Overflowing Cup: `into shield, ratio 1` |
| `damageTaken` | alınan hasar x (1 + mul) | `who` self / ally / team, `status` (+`mine`: hasarı alanda sahibin uyguladığı durum), `shield` (alanda sahibin bu skill'den kalkan katmanı), `when` (`incoming*` koşulları) | Hex Ward: `when anyEnemyStatus jinxed`, `mul -0.03, rank` |
| `bigHit` | tek vuruş maks canın `min` oranına ulaşırsa x (1 + mul) | `min`, `mul` | Stand Firm: `min 0.3, mul -0.25` |
| `guardShare` | Guard ile sahibe aktarılan hasar x (1 + mul) | `mul` | Linked Plates: `mul -0.03, rank` |
| `shieldDealt` | sahibin verdiği kalkan skill'i x (1 + mul) | `mul`, `skill`, `when` | Rimeguard: `when targetRow front`, `mul 0.05, rank` |


## 8. Bedava kullanım, zemin, çağrı, durum aktarımı

### Bedava ve gecikmeli kullanım (`cast` eylemi)
- `{ "cast": "<sınıf skill'i> | event", "power"?, "crit"?, "mod"?, "delay"?: 1, "noChain"?: true, "to"? }`: bedel / cooldown / tur harcamadan kullanım. `event` = olayın skill'i (Run It Back). Güç ve kesin kritik kullanım süresince geçici `treeBuff` (`<düğüm>#free`); `mod` C1 değişikliği (damage / status / proc / cast grupları; Thicket Wave'in Stun'ı `addStatus`).
- Kuyruk: olay bitince sırayla çalışır (`queueFree` -> `flushFree`), zincir koruması: bedava kullanım bedava kullanım doğurmaz (`noChain`) ve tek eylemde en çok 8. Hedef ölmüş / geçersizse YZ'nin hedef yolu yeni hedef seçer, o da yoksa atlanır.
- `delay: 1`: sahibin sonraki tur başında, ilk kullanımın aynı merkez hücresine / tahtasına (Twin Meteors, Thicket Wave).

### Zeminler
- Yeni zeminler (`data/grounds.json`): quaking_ground, field_of_shafts, root_field, storm, hall_of_silence, lingering_rain. Renk yer tutucu (`color`), çizim yoksa çökmez.
- Zemin etkisi alanları: `statuses` (tur başı durumları, derleyici `k: "groundStatus"`), `manaBurnPct`, `noDamage` (güç 0), `stackMult` (aynı zemin üstüne atılınca o hücrelerde çarpan; eski zemin o hücreleri bırakır), `centerMult` (merkez hücre çarpanı), `permanent`, hücre başı güç `cellMult`. Seçici `ground:<id>` ile yamalanır.
- Örtüşme kuralı: aynı hücrede aynı tür iki zemin varsa yalnızca en güçlüsü işler (`groundOutranked`).
- Tetik: `groundEnd` (sahip = zemini bırakan, alıcı `inGround`), `enemyDied` süzgeci `ground`; eylem `{ "ground": "<id>", "of": "ground", "power", "turns" | "permanent", "to" }`.

### Çağrı aktarımı (`summon`)
- Her fx `"summon": "treant" | "skeleton"` taşıyabilir: fx çağrının kendi derlemesine gider (`TreeSetup.summons[<id>]`); skill'ler çağrının skill'leri (root_smash, vine_snare / skeleton_strike, skeleton_slash), satır skill'i yok. İzinli türler: skill, addEffect, stat (hpMult, `armorAdd` yalnızca çağrıda), hook (cond / trigger / heal).
- Ceset tüketen çağrı (Raise Dead) iki kopya derler: `skeleton` ve `skeleton#fed`; `"fed": true` fx yalnızca beslenmiş kopyaya gider.
- Motor: çağrı doğarken çağıranın `treeSummons`'ından yamalı skill'ler + kancalar takılır (tetik / şifa listelerine eklenir), maks can / zırh `summonDefFor`'da doğrudan stat üstünde (önizleme de görür).
- Olaylar: `arrive` (dinleyen çağrının kendisi, hedef = çağrı), `summonDeath` (öldü ya da süresi doldu; dinleyen çağıran, süzgeç `unit`, alıcı `lastHit` = çağrının son vurduğu düşman, `nearestEnemies` çağrıya göre).

### Durum / Doom aktarımı
- Eylemler: `spread` (durumu kalan süresiyle aktarır), `doom: <çarpan>, of: stacks | amount` (Doom büyüklüğü: Omen x çarpan), `mark` (`until: turn | hit`), `guard` (0..1], `overflow`.
- Olay alanları: `kill` `via: leap` (sıçrayan Doom), `amount` (Doom büyüklüğü), `dealt` (öldüren vuruşun hasarı); `statusEnd` `amount` = durumun verdiği toplam hasar, süzgeç `fromSkill`; `enemyDied` süzgeçleri `marked`, `by`.
- Derleyici birleşim süzgeçleri: `onlyWith: [düğümler]` (hepsi alındıysa) ve `unless: [düğümler]` (biri alındıysa uygulanmaz). Counter Cut ailesi ve Leaping Mark ailesi bununla tek kanca olur.

## 9. C5 hedef / alan / aura, C6 kural, yeni tetik sözlüğü

### C5: `{ "k": "hook", "h": "target", ... }` (derleme anında skill / pasif kopyası yamalanır)
Skill alanları satırın skill'ine gider (`skill` ile başka skill'e):
- `target`: hedef türü değişimi (taraf değiştiremez). `all_enemies` -> global (menzilsiz), `random_enemies` + `count` (varsayılan 3), `self`. Alan / `areaByPhase` / `splash` silinir.
- `count`: rastgele hedef sayısı.
- `area`: alan birleşimi (`areaDefProblem` ile doğrulanır). Yeni alan alanları: `arm` (plus kolu uzunluğu), `also: row | column` (merkezin sırası / şeridi de), `maxTargets` (ilk N hedefte durur, Brittle Point), `hitsEach` (alandaki her birim N kez; merkezde `hitsAtCenter` ile büyüğü), yeni şekil `rowColumn` (satır + şerit, Earthsplitter).
- `splash`, `range`, `open: false | "thrown"` (fırlatma: arkası dolu hedefe de; COND `thrown`).
- `priority` (yalnızca random_enemies): `armor`, `hitMe`, `hurtMe` ... (hedef önceliği, zar yok).
- `gather: { status, from? }`: kullanımdan önce diğer düşmanlardan yığın çeker (`from` yoksa hepsinden); SCALE `gathered`.
- `guard: { armorPct, ownRow }`: ikinci Guard seti (korunana zırh payı, kendi sıradakiler).
- `groundWide: "touch"`: skill'in zemini şekle değen hücrelere de.
Pasif alanları:
- `aura: { square, magicPct, pct }` (Bulwark Aura: kare / çapraz, dosta büyü zırhı, dost payı).
- `smite: { power, idle, mirror, mul }` + `noSelf` (Divine Light smite noktası: en zayıf düşmana kutsal hasar; `idle` = yaralı dost yokken, `mirror` = şifa kadar).
- `overflow: { to: "lowestMp", mult, noSelf, spill, allies }` (Mana Overflow: tek alıcı / çarpan / sahibe yok / taşanı aktar / dostların büyü zırhı da sayar).
- Stat: `{ "k": "stat", "f": "armorMult", "op": "mul", "v": -0.3 }` (kahramanın kendi zırhı; aura payları bu zırhtan).

### C6: `{ "k": "hook", "h": "rule", "rule": <tür>, ... }`
| Tür | Alanlar | Anlam |
|---|---|---|
| noMove / noTaunt | `while` | Move / Taunt kilidi (ör. guarding iken) |
| immune | `statuses`, `pull` | durum / çekme bağışıklığı (`when` ile, ör. `stillStreakAtLeast`) |
| shorten | `statuses`, `by` | CC süresini kısaltır |
| cheatDeath | `once`, `hp`, `hpRatio`, `below`, `notCrit`, `rage`, `ready`, `do` | ölümcül vuruşta 1 can / oranla dönme; `ready: <skill>` hazırken |
| intercept | `scope: guarded / bonded`, `once` | ölümcül vuruşu üstlenme |
| split | - | hasar paylaştırma |
| ward | `skill` | o skill'den sonra sıradaki tura kadar debuff tutmaz |
| pierce | `statuses`, `shields`, `skill` | hasar azaltan durum / kalkanı yok sayma |
| luck | `add` | Lucky Escape şansı |
| repeatChain | - | tutan tekrar yeniden zarlanır (tekrar olayı `amount` = tekrar sırası) |
| actions / guardBehind | `n` / `share` | yalnızca çağrı: turda N eylem / arkasındakinin hasar payı |
| resummon | `skill`, `mult` | çağrı dururken yeniden çağırma eskisini patlatır |
| fedNoCorpse | `cost` | cesetsiz beslenmiş çağrı (ek MP) |
| rest | `mult` | Rest'in MP'si çarpanla |
Ölçeklenen alanlar (rank): hpRatio, add, share, mult. `do` listesi tetik eylemleriyle aynı.

### Yeni tetik sözlüğü
- Eylemler: `strike` (skill'in ilk hasar etkisiyle gerçek vuruş x oran; `hits`, `pierce`, `skill`, `chain: N` = yanındaki vurulmamış düşmana sıçrar), `steal` (buff çalma, takıma sırayla), `hot` (skill'in yenilenmesi x oran), `smite` (son smite'ı yeniden), damage `summoner`, ground `wide: "beside"`.
- Her eylemde alıcı süzgeçleri: `count`, `rows` (enemyFront), `ifStatus`, `ifMpZero`, `caster` (MP bedelli skill'i olan).
- Alıcılar: beside, behind, rowMates, outsideArea, castFront, lowestHpInCast, randomInCast, mostHurtMe, enemyFront, facing, selfBeside, weakestEnemy, sourceNeighbors. Rastgele seçimler aynı tetik ateşinde ortaktır (hasar + durum aynı düşmana).
- Tetik alanı: `perCast: N` (kullanım başına en fazla N ateş).
- COND: stillStreakAtLeast, castMpZeroAtLeast, thrown, centerCritsAtLeast. SCALE: gathered.
- Durum eylemi: pull `to: laneFront | stepForward`, `areaBack` (yalnızca alanın arka sırası).

### Sonradan eklenen alan, eylem ve kurallar (hpFallback, hpStake, rollStatus, turnedHand)
| Düğüm | fx | Motor |
|---|---|---|
| Paladin 2.n0 Soul Exchange | `[{"k":"skill","sel":"self","f":"cost.hpFallback","op":"set","v":0.25}]` | `SkillCost.hpFallback` (yalnızca MP bedelinde, oran (0, 1)): MP yetmezse bedel mevcut canın oranından (`cost.ts > hpFallbackAmount / skillCostPay`); canUse (can > bedel), ödeme (`resource` olayı `hp`, `payHp` tetiği, `castInfo.hpPaid`), YZ (bedel ağırlığı + kendine can kaybı `skillCostPay`'den), HUD bedel çipi (HP simgesi + miktar, kırmızı değil), etiket "16 MP or 25% of current HP" (`skillCostLabel`), maç kaydı skill satırı. |
| Gambler 3.v Returning Cards | `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"strike":0.6,"to":"castTargets","rollStatus":true}]}]` | strike eylemine `rollStatus: true`: isabet eden ek vuruş skill'in `randomStatus` zarını o hedefe yeniden atar (`rollRandomStatus`, skill etkisiyle aynı yol). |
| Gambler 4.u2 Mortgage | `[{"k":"skill","sel":"bet","f":"hpStake","op":"set","v":0.1}]` | `BetSpec.hpStake` (yalnızca MP bahsinde): `gamble.ts > betStakeParts` (main + hp; canı en az 1 bırakır). Kazanç çarpanı toplamı görür (önizleme, YZ, gerçek zar aynı), kayıpta MP parçası MP'den, can parçası candan (`damage` olayı `origin: self`). YZ'de can parçası can ağırlığıyla. Skill açıklamasına "plus 10% of your max HP (counts as MP)". |
| Hexer 3.v Turned Hand | `[{"k":"hook","h":"rule","rule":"turnedHand"}]` | Yeni kural `turnedHand` (yeni durum YOK): Jinxed'i bu kuralı taşıyan Hexer vermişse taşıyanın sıradaki hasar skill'i (hedefleri karşı tarafta, telgrafsız) YZ'nin seçtiği hedef yerine kendi dostlarından seed'li rastgele birine tek hedef olarak iner (alan / aşama / yan vuruş düşer); bir Jinxed tek saldırı çevirir; dost yoksa normal. `treeProc` Hexer'e yazılır. |

Derleyici: `self` seçicisine `cost.hpFallback`, `bet` seçicisine `hpStake` (ikisi de varsayılan 0, MP dışı / oran dışı = derleme hatası); strike'a `rollStatus`; `RULE_KINDS` + `turnedHand` (alansız).

### Adlı skill biçimi (`mode`)
- Veri: `{ "k": "mode", ... }` (`skill-tree-data.ts > ModeFx`): `mode`, `name`, `text`, `baseText`, `target`, `removeEffects`, `powerMul`; ek düğüm `needs` + `text` / `addEffect` / `splash`. Durum seçimi: `statusPick` (+`firstOnly`), `secondStatus`. Derleyici (`buildModes`) biçimleri, diğer düğümlerin yamaları uygulanmış son skill tanımından kurar (`TreeSetup.modes` -> `Combatant.skillModes`).
- Eylem biçimi taşır (`BattleAction.mode`, `useSkill(..., mode)`); bilinmeyen biçim `Unknown mode` ile reddedilir. Endless replay `use` eylemi `m` alanı taşır. Multiplayer'da ağaç kapalı; protokole biçim eklenmedi.
- Arayüz paneli ve YZ kuralları: `skill-tree-implementation.md` (Biçimli skill).

## 10. Çan (Vesper) ve diğer sonradan eklenen ağaç alanları
- **Eylem `bell: N`:** sahibin çan sayacı N artar (alıcı yok). `skill` verilirse çanı o skill çalmış sayılır; sürmekte olan kullanımda kullanım sonunda çalar. Çan çalınca (`ringsBell` taşıyan skill, `bell` eylemi, savaş başı) `bellRung` olayı çan başına bir kez ateşlenir. Örnekler: Matins (`battleStart` + `bell: 1`), Triple Peal, Passing Bell.
- **Alıcı `rowBehind`:** bu kullanımın vurduğu sıranın hemen arkasındaki sıra (kullanım merkezi, yoksa ilk hedef; Forked Peal).
- **Hedef alanı `bellOnly: "<skill>"`** (`h: "target"`): çanı yalnız bu skill çalar; sınıfın öbür skill'lerinin `ringsBell`'i ve başka skill adına çalan `bell` eylemleri derlemenin sonunda düşer. Yalnız Pealing Bells pasifi olan sınıfta ve sınıfın kendi skill'inde yazılır (Deep Peal; aksi derleme hatası).
- **`smite.dual`** (pasif `smite`, Crusader's Dawn): Divine Light şifası `dual` kat güçlü, aynı miktar her tur en zayıf düşmana smite olur; önizleme, YZ ve skill ipucu aynı değeri okur.

## 11. Kolay genişletme yerleri
- Yeni koşul: `tree-hooks.ts > COND`'a bir satır (`(ctx, arg) => boolean | undefined`); savaş durumu gerekiyorsa `CondHost`'a bir okuyucu + `battle.ts > condHost` getter'ında karşılığı. Bedelde de kullanılacaksa `SELF_CONDS`'a ekle. Derleyici denetimi sözlükten okur, ayrı iş yok.
- Yeni ölçek: `SCALE` (+ gerekiyorsa `SELF_SCALES`).
- Yeni C1 değişikliği: `CondMod` alanı + `battle.ts > addCondMod` + uygulama noktası (`applyEffMods` ya da durum noktası) + derleyicideki `DAMAGE_MODS` / `STATUS_MODS`.
- Yeni addEffect türü: derleyicideki `EFFECT_FIELDS` (zorunlu alanlar); motor zaten tüm SkillEffect türlerini uygular.
- Yeni unitFx anahtarı: `ItemEffects`'e eklenince `UNIT_FX_KEYS` derleme anında eksikliği yakalar; motordaki okuma `effNum` / `effList` ile yazılırsa iki kanal kendiliğinden birleşir.
- C3-C6 kanca aileleri: `TreeHook` birliğine yeni `h`, derleyicide `applyFx > case 'hook'` dalı, motorda uygulama noktası + `treeProc`.


