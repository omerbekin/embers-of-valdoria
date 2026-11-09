# Skill ağacı: uygulama referansı (veri şeması, kural modülü, kayıt, motor akışı)

> **Ne için / Güncel mi (2026-11-08):** ağaç sisteminin uygulama referansı: veri şeması, kural modülü, kayıt, motor mimarisi, arayüz. EVET güncel (kodla uyumlu). fx dili (koşul, olay, eylem anahtarları): `skill-tree-fx-reference.md`. Düğüm tasarım kuralı: `classes/skill-tree-logic.md`. Şekil ve kilit sayıları: `skill-tree-moments.md`. Tarihçe (faz günlükleri, taslak tablolar, açık sorular, denge turları): `docs/archive/design/skill-tree-implementation.md`.

Durum: **UYGULANDI.** 13 sınıfın ağacı canlı (`data/skill-trees/`: antimage, archer, cutthroat, defender, druid, gambler, hexer, mage, paladin, skald, undead, vesper, warrior; her biri 60 düğüm + 5 bar = 65, toplam 845). Ana şalter `data/skill-trees/_rules.json > enabled: true`; sefer ve Endless açık, Quick Battle ve multiplayer kapalı (`modes`).

## 0. Kısa özet
- Ağaç içeriği `data/skill-trees/<class>.json` dosyasında; her düğümün etkisi makinenin okuyacağı `fx` biçimindedir (sözlük: `skill-tree-fx-reference.md`).
- Kurallar (kilitler, ea/eb tek yön, ult tek kol + en çok 3 puan, en çok 2 evolve, geri alma) tek saf modülde: `src/progression/skill-tree.ts`. Şekil ve kilit tablosunun sahibi `skill-tree-moments.md`.
- Kayıt: her kahramanda `tree` alanı. Veri değişip dağılım geçersiz kalırsa puanlar geri verilir; `version` değişirse bir kez bedava respec.
- Motor: savaşa girerken kahramanın skill'lerinin **kişisel kopyası** yamalanır (skill id aynı kalır, sayılar değişir). Koşullu / tetikli düğümler ortak kanca ailesiyle çalışır (4.2).
- Ekran: Gear > **Tree** sekmesi (onaylı mockup `public/mockups/skill-tree-gear.html#v4`).

## 1. Kurallar
- Şekil, kilit sayıları, ult tek kol, Mastery bar eşikleri: **`skill-tree-moments.md`** (tek sahip); değerler `data/skill-trees/_rules.json`. Burada yinelenmez.
- **Puan havuzu:** (level − 1) × `skillPointsPerLevel` (= 1). Sefer tavanı L30 -> 29 puan; Endless L50 -> 49 puan (`data/levels.json`, `levels.ts > addXp`).
- **Sayaç:** pasif + 3 aktif satıra harcanan TOPLAM puan (hangi satırdan geldiği önemsiz); ult sayılmaz; Mastery bar aynı sayıyı kullanır (`skill-tree.ts > counter`). Tier ve evolve kilitleri bu sayaca bakar (Ömer 2026-10-21).
- **Yüzde kuralı:** `_rules.json > percentRule` (`mul` = oransal).

## 2. Veri şeması
### 2.1 Dosyalar ve araç
- `data/skill-trees/_rules.json`: şekil ve kilit sayılarının TEK yeri (CLAUDE.md kural 6): `rowShape` (core.js ROW_DEF karşılığı: id, tür, rank, tier, sütun, şerit, gerek), `tierNeed`, `evolveNeed: [23, 38]`, `evolveMax: 2`, `ult` (arms, levels [5,10,15], max 3, singleArm), `barAt: [5, 10, 15, 20, 25]`, `exclusiveEdges: true`, `respec` (base 20 + perLevel x level), `enabled` (ana şalter) ve `modes` (mod başına bayrak: campaign / endless / quick / multiplayer), `percentRule`, `debugFocus`.
- `data/skill-trees/<class>.json`: class başına içerik (aşağıda). Düğüm başına rank/tier tutulmaz (şekil `_rules.json`'dan).
- `tools/tree-import.mjs <class>`: `mix/<class>.js` + `final.js` dosyalarını Node `vm` ile (sahte `window`) okur, her satırı final.js'in seçtiği karmadan alır (Mastery adı + bar pasif satırının karmasından; `content.js > fromSelection` ile aynı kural), ad / metin / kaynak / NEW bayrağını yazar, `fx: null` bırakır. Dosya zaten varsa `fx` alanlarını korur (anahtar bazında birleştirir, metin değiştiyse uyarır). İçe aktarımdan sonra **kaynak JSON'dur**; mockup yalnızca referans kalır. `--check` = mockup ile fark raporu.
- `src/progression/skill-tree-data.ts`: class dosyalarının **statik importu** (content.ts gibi; `npx tsx` sim'i `import.meta.glob` desteklemez) + yapı doğrulayıcı. Yeni class = 1 JSON + 1 import satırı.

### 2.2 Class dosyası (örnek, kısaltılmış)
```json
{
  "class": "warrior",
  "version": 1,
  "picked": { "rows": ["b", "b", "a", "a", "b"], "at": "2026-10-22" },
  "rows": [
    { "skill": "berserker", "passive": true, "karma": "B" },
    { "skill": "melee_attack", "karma": "B" },
    { "skill": "whirlwind", "karma": "A" },
    { "skill": "charge", "karma": "A" }
  ],
  "ult": { "skill": "headsmans_blow", "karma": "B" },
  "mastery": { "name": "Iron Mastery", "bar": [ { "at": 5, "name": "Heavy Hand", "text": "…", "src": "B:V4:bar0", "fx": [ … ] } ] },
  "nodes": { "1.f2": { "name": "Notched Axe", "text": "…", "src": "B:V1:1.f1", "fx": [ … ] } }
}
```
- Satır → skill eşlemesi class dosyasının `skills` sırasıyla aynıdır (satır 1-3 = `skills[0..2]`, ult = `skills[3]`); Warrior satır 1 = `melee_attack` (adı "Double Strike"). Test bunu denetler.
- `version`: içerik değişince artar; kahramanın kayıttaki sürümü farklıysa bir kez bedava sıfırlama hakkı (bölüm 3.3).

- **`inactive: true`** (düğümde ya da bar girdisinde): düğüm alınamaz ("Inactive: being reworked"), motor fx'ini yok sayar, denetim atlar; alınmış rank'ı olan kayıt geçersiz sayılır ve ağaç bedava iade edilir (`skill-tree.ts > isInactive`; Mage reworkü 2026-10-29).
- **`fx` dili ve gerçek örnekler:** `skill-tree-fx-reference.md` bölüm 1.

## 3. Kural modülü ve kayıt
### 3.1 `src/progression/skill-tree.ts` (saf; `levels.ts` yanında)
`core.js`'in TypeScript karşılığı + bölüm 8 (ea/eb tek yön) + onay kilidi. Durum: `TreeAlloc = { v: number; r: Record<string, number> }` (anahtar `'satır.id'`, mockup'taki `S.r` ile aynı).
- Sayım: `treePool(level)`, `spent(a)`, `rowSpent(a, i)`, `ultSpent(a)`, `counter(a)` (ult hariç), `free(level, a)`.
- `check(tree, level, a, key): Block | null`. Kodlar: `unknown`, `max`, `needs`, `tier`, `evo`, `evoCap`, **`ultArm`** (başka ult kolu seçilmiş; 2026-10-22), `ultCap`, `ultLevel`, **`direction`** (karşı edge alınmış), **`unapproved`** (NEW), `points`. Metin İngilizce (UI aynen gösterir: "Tier III needs 10 tree points (have 7)", "Other direction chosen", "Awaiting approval").
- `take` / `untake` (untake = 1 eksiltip `validate`; bozuluyorsa reddeder ve "Needed by X" döner).
- `validate(tree, level, a)`: core.js'teki gibi boş ağaçtan açgözlü yeniden kurulum; ek olarak ea + eb ikisi birden = geçersiz, onaysız NEW = geçersiz, bilinmeyen anahtar = geçersiz.
- `status(...)`: arayüz durumu (max / part / av / tlk / rq / xl / dir / new / inert).
- `barReached(a)`, `evoState(a)`, `anyOpen(level, a)`.
- `repair(tree, level, a) → { alloc, reset, dropped }` (3.3).
- `focusBuild(tree, [A, B], level)`: sim / debug için odaklı kurulum (core.js `focusPlan` + bölüm 8: yön a, kalan 3 puan B satırının Tier I'ine).
- Derleyici ayrı dosya: `src/progression/skill-tree-compile.ts > compileTree(tree, alloc, level) → TreeSetup` (4.1).
- Geri alma / respec kancası: `respecCost(level, rules)` + `respec(a)` (bedel `_rules.json`; kural `_rules.json > respec`).

### 3.2 Testler
- Kural modülü: `tests/skill-tree.test.ts` (boş ağaç, zincir, global sayaç, ea/eb yön kilidi, ult tek kol, evolve kilitleri 23/38, focus check, `untake`, `repair`, veri doğrulama: her sınıf dosyası, ad <= 24, metin <= 150, satır skill'leri sınıf sırasıyla aynı, her `fx` gerçek `skills.json` tanımına karşı derlenir). Metin sınırı ayrıca `tests/skill-tree-text.test.ts`.
- Derleyici ve motor: `tests/skill-tree-engine.test.ts` (bekçi: uid'siz `this.skill(` izin listesi), `tests/skill-tree-fx*.test.ts`, sınıf testleri `tests/skill-tree-fx-<sınıf>.test.ts`; kayıt `tests/skill-tree-save.test.ts`; arayüz modeli `tests/tree-tab.test.ts`; evolve ikonu `tests/skill-tree-evolve.test.ts`; sim vekili `tests/tree-sim.test.ts`.

### 3.3 Kayıt
- **Alan:** sefer `Hero.tree?: TreeAlloc`, Endless `EndlessHero.tree?: TreeAlloc` (aynı şekil). `skillPoints` kalır ve "harcanmamış puan" anlamına gelir (stat puanıyla aynı model).
- **Sürüm:** isteğe bağlı alan olsa da kahraman alanı ekleyen önceki adımlar gibi (v9 level, v11 wounds) sürüm artar: sefer ve Endless kayıt sürümü artar (güncel sürüm `src/campaign/save.ts` ve `src/endless/save.ts` başlığında). Göç gerekmez: alan yok = boş ağaç.
- **Onarım (her okumada, idempotent):** `normalizeLevelFields` yanına `normalizeTree(h)`: (1) tam sayı olmayan / bilinmeyen anahtar atılır, rank'lar tavana kırpılır; (2) `validate(level)` hatalıysa ağacın **tamamı bedava iade** edilir ve geçici `treeReset` bayrağı kurulur (Gear açılınca "Your skill tree was reset after an update. Points refunded." bildirimi); (3) değişmez kural: `skillPoints + spent = (level − 1) × skillPointsPerLevel`, tutmazsa `skillPoints` düzeltilir (geçerli dağılım asla silinmez); (4) kayıttaki `v` class dosyasının `version`'ından farklıysa ve dağılım geçerliyse kalır, bir kez bedava sıfırlama hakkı (`freeRespec`) verilir. Ağaç verisi henüz olmayan class'ın `tree` alanına dokunulmaz.
- **Debug `setLevel`** (levels.ts) dağıtılmış stat puanları gibi ağacı da sıfırlar.
- **Duraklatılmış savaş:** sefer Gear'ı zaten kilitli (`PAUSED_LOCK`). Ayrıca `resumeKey` / `planKey` birim kurulumlarını (`units`) içerdiği için ağaç değişirse kayıt tutmaz, savaş baştan başlar (güvenlik ağı; test: Endless kampında ağaç değişince yarım dalga baştan).
- **Saf durum fonksiyonları:** `setHeroTree(state, heroId, alloc)` (src/campaign/xp.ts > `allocateStats` gibi), `setRunHeroTree(run, heroId, alloc)` (src/endless/run.ts > `allocateRun` gibi), sim vekili için `autoTreeAll` / `autoTreeRun` (`focusBuild` ile). `GearSource.setTree?(heroId, alloc)` (gear-screen.ts > `allocate` kalıbı).
- **Testler:** eski sürüm kaydı yeni sürüme yüklenir (ağaç boş, puanlar aynen); bozuk dağılım iade + bayrak; ea + eb'li kayıt iade; `skillPoints` tutarlılığı; Endless `parseRun` aynı kurallar; `setLevel` sıfırlar; ağaç değişince `resumeKey` değişir.

## 4. Motor etkileri
### 4.1 Mimari
- **Ağaçtan önce:** `Battle.skill(id)` savaş başına ortak tabloya (`setup.skills`) bakar; birime özgü skill katmanı YOK. Pasif birim başına kopyalanır (`createCombatant > passive`). Tek değiştirici katman birim düzeyinde: `UnitSetup.modifiers` (stat) + `itemEffects` (kancalar), güç katmanı `src/progression/loadout.ts > loadoutSetup` (yorumunda "+ ileride level, ağaç" diye yer ayrılmış). Sefer `campaign/encounters.ts:108`, Endless `endless/waves.ts:165` onu çağırıyor; QB / MP çağırmıyor.
- **Uygulanan: birim skill katmanı (aynı id).** `UnitSetup.tree?: TreeSetup` (motor tipi, derlenmiş hâl):
  `{ skills?: Record<skillId, SkillDef> /* yamalı tam tanım */; passive?: PassiveDef; fx?: ItemEffects /* (b) kanalı */; hooks?: TreeHook[] /* (c) */ }`.
  `createSetupCombatant` bunları `Combatant.skillDefs`, `passive`, `treeFx`, `treeHooks` alanlarına yazar. `Battle.skill(id, uid?)` = `get(uid)?.skillDefs?.[id] ?? setup.skills[id]`. Motorda skill okuyan yerler (battle.ts ~35, ai / ai-value / preview / skill-info / cost ~43) aktörün uid'ini geçirir.
- **Neden aynı id (türetilmiş id reddedildi):** eylem günlüğü (replay), maç kaydı, cooldown / carry anahtarları, `src/game` ve `src/ui` içindeki 54 `skills[id]` araması (ikon, vfx, ses, poz) değişmeden çalışır. Reddedilen seçenek: türetilmiş id (`whirlwind@party-0` + `artOf`, Pose Tester kopyaları gibi): 54 arayüz aramasını ve günlükleri bozar.
- **Bekçi test:** battle.ts'te uid'siz `this.skill(` kalmaz (izin listesi hariç); Warrior vs Warrior aynada yalnızca ağaçlı birimin sayıları değişir; ağaçsız savaş (QB / golden kayıtlar) birebir aynı.
- **Derleme yeri:** `src/progression/skill-tree-compile.ts` (saf; motor tiplerini ve `content.skills`'i okur). `loadoutSetup(src)` kahramanın `tree`'si ve mod bayrağı açıksa `tree: compileTree(...)` ekler. Motor ağaç biçimini bilmez, yalnızca derlenmiş tanımı kullanır.
- **Önizleme / YZ:** C1 koşullu çarpanları hasar yolunun içinde (`dealtDamageMult`, `damageSpecFor`, `strike`) uygulanır; böylece önizleme sayısı, YZ değeri ve gerçek vuruş aynı. Tetikler (C3) ilk aşamada YZ değerine girmez (belgelenir).
- **ItemEffects yeniden kullanımı:** ağacın (b) etkileri `c.treeFx` ayrı kanalda; motorda okuma `effectOf(c, key)` ile ikisini birleştirir (sayılar toplanır, bayraklar VEYA, tetikler kaynak başına ayrı bir kez). "Stacking OK" kuralına uyar, item ile ağaç çakışınca biri ötekini silmez.
- **RNG:** şanslı düğümler var olan seed'li durum zarlarını kullanır (`status.chance`, `randomStatus`); `Math.random` yok, motor saflık testi geçer.
- **Savaş dışı sayılar:** Gear ipuçları `patchedSkill(hero, skillId)` (derleyiciden) ile `skill-info.ts` metnini yeni sayılarla üretir; ipucuna "Tree: Gore Wheel, Red Arc" satırı eklenir.

### 4.2 (c) kanca aileleri
| Aile | Ne yapar | Motordaki yer (taslak) |
|---|---|---|
| **C1 koşullu değiştirici** (`cond`) | Koşul tutarsa güç / kritik / zırh delme / lifesteal / durum süresi veya şansı / MP bedeli değişir. Koşul sözlüğü: hedefte durum (+ kalan tur başına ölçek), hedef tam canlı, hedef bu savaşta hiç oynamadı, hedef sana son vuran, hedef son turundan beri sana vurdu, hedefin zırhı (ölçek / seninkinden fazla), kendi canın altında/üstünde, Rage en az/en çok, harcanan Rage, geçen tur Rage harcadın, geçen tur yürümedin, kendi zırhın 40 üstü (ölçek), vurulanlar arasında durumlu sayısı (ölçek), auradaki dost sayısı (ölçek), canı %50 altındaki dost sayısı (ölçek), gelen vuruş alan skill'i | `dealtDamageMult`, `damageSpecFor`, `strike`, durum uygulama noktası, `cost.ts > skillCostAmount`, `effectiveStats` (aura) |
| **C2 Rage** (`rage`) | Vuruşta / koşulda düz Rage, Rage tabanı ("en az 30"), Rage bedeli değişimi (başka skill için de), tüm hedeflerden Rage, tutulan Rage başına güç | Rage kazanç noktası (`formulas.rage`), `cost.ts` (`spendAll` en az miktarı), Berserker pasifi |
| **C3 tetik** (`trigger`) | Olay → eylem: öldürünce, durum kazanınca / bitince (Taunt kırıldı / kırılmadan bitti, Stun bitti), can eşiği ilk geçilince (kendi / dost), savaş başı / tur başı, dost düşünce, skill'in ilk kullanımı / her 3. kullanımı | `announceIfDead`, `statusEnd` olayları, `applyHit`, `advance` (tur başı), skill kullanım sayacı |
| **C4 şifa / kalkan / alınan hasar** (`heal`) | Koşullu alınan şifa çarpanı, fazla şifa → kalkan / Rage, zırh veya maks can oranında kalkan, büyük vuruş indirimi, Guard aktarım çarpanı, "sonraki turuna kadar +%15 hasar alırsın" (yeni durum gerekir) | şifa yolu (`healTakenMult`), `applyHit`, shield etkisi, Guard aktarımı, `statuses.json` |
| **C5 hedef / alan / aura** (`target`) | `random_enemies` hedef önceliği, yeni alan şekli (tam sıra + tam şerit), arka sıraya ek vuruş, ek vuruş, ikinci Guard kümesi, aura şekli / kendi-dost payı ayrımı / dostlara büyü zırhı, yeni zemin türü (Slow veren) | hedef seçimi, `area-shape.ts`, `splashTargets`, `armorAura` (`effectiveStats`), `grounds.json` + zemin tiki |
| **C6 kural** (`rule`) | Tekil kurallar: Move kilidi, Stun/çekilme bağışıklığı, ölümden 1 canla dönme, tur sonuna kadar debuff bağışıklığı, Stun verince sıra hızlanması, durumu tüketip patlatma | `canUseGlobal` (Move), `cc-immunity.ts`, `applyHit` (Lucky Escape / `undying` yakını), `addStatus`, `turn-order.ts` |

- fx anahtarlarının tamamı: `skill-tree-fx-reference.md`.

## 5. Mastery bar
- **Açılış:** `counter(alloc)` ≥ 5 / 10 / 15 / 20 / 25 olunca bonus kendiliğinden açık (sayaç = pasif + 3 aktif satır; ult sayılmaz). Seçim yok. Respec sayacı düşürürse bonus kapanır.
- **İçerik:** pasif satırının karmasından (Warrior: B "Iron Mastery"; Defender: A "Rampart Mastery"), class dosyasında `mastery.bar[i] = { at, name, text, src, fx }`.
- **Motor:** derleyici açılmış bonusların `fx`'ini düğümlerle aynı kanala (`TreeSetup.fx` / `hooks`) ekler; ayrı motor yolu yok. 
- **L50 (30-45):** içerik TBD; sefer tavanı L30 olduğu için seferde etkisiz, Endless'ta sayaç 46'ya kadar çıkabilir.

## 6. Arayüz
- **Yer:** Gear > **Tree** sekmesi (iki sayfayı birden kaplar; Ömer seçimi 2026-10-22). Skill'ler ekranda oyundaki tam skill plakası biçimiyle gösterilir.
- **Tasarım dili (`ui-design-language.md`):** düğüm ve bonus ipucu **A Band** (`band-tip.ts`); bilgi hover'da, dokunmatikte tek dokunuş sabitler; sakin göstergeler; düz metin; kor elmas yalnızca seçili düğümde; birincil düğme en sağda.
- **Parçalar (`ui-reference.md`):** `gear-screen.ts` (sayfa kabı, `heroRail` telefonda), `band-tip.ts`, `confirmIn`, `skill-bar.ts` ipucu sayıları `patchedSkill` ile, kısa ekran `html.short` / `html.compact`, dokunma hedefi ≥ 44 px.

### Gear > Tree sekmesi (2026-10-23)

Onaylı mockup `public/mockups/skill-tree-gear.html#v4` gerçek Gear ekranına sekme olarak girdi. Kural koduna dokunulmadı; `skill-tree.ts` / `skill-tree-hero.ts` olduğu gibi çağrılır.

- **Dosyalar:** `src/ui/tree-tab-model.ts` (DOM'suz: bekleyen puan, Confirm / Reset, yön kilidi, kilit bilgisi, respec bedeli), `tree-tab-layout.ts` (yerleşim; `_rules.json > rowShape`'ten), `tree-tab.ts` (çizim, ipuçları, animasyonlar, olaylar), `tree-tab.css` (mockup stilleri), `tests/tree-tab.test.ts`.
- **Akış:** tık +1 bekleyen; sağ tık / uzun basış (dokunmatik 520 ms) / Delete -1 bekleyen; Reset bekleyenleri siler; Confirm kaynağa yazar (`GearSource.setTree`); onaylı puan yalnızca Respec ile (20 + 5 x level altın; `freeRespec` varsa bedava). `treeReset` bildirimi oturumda kahraman başına bir kez (kayıttaki bayrak silinmez).
- **Görünürlük:** `_rules.json > enabled` true iken; tüccar / ganimet çift penceresinde (`ext`) ve `src.setTree` yoksa sekme yok. Skill puanı rozeti sekme açıkken Sheet'ten Tree'ye taşınır.
- **Debug:** Debug > Campaign > Levels > "Skill tree tab in Gear" şalter kapalıyken de sekmeyi gösterir (yalnızca bellek; şalter ve savaş değişmez).

## 7. Modlar
| Mod | Durum | Gerekçe |
|---|---|---|
| Sefer | **Açık** | Puanlar zaten birikiyor; L30 tavanı = 29 puan. |
| Endless | **Açık** (koşu başına; kahraman L1'den) | L50'ye kadar 2 evolve; koşu kaydında ağaç saklanır. |
| Quick Battle | **Kapalı** | Herkes L1 ve item'siz (Ömer 2026-10-09: QB/MP dokunulmaz). Debug'da "preset build" ile denenir. |
| Multiplayer | **Kapalı** | QB kuralları + lockstep; iki tarafta aynı ağaç verisi gerekir. |
| Sim | Vekil | `autoTreeAll` / `autoTreeRun` (`focusBuild`); bkz. `docs/arch/sims-and-deploy.md` Skill ağacı modu. |

Kaynak: `_rules.json > modes`.

## 8. Referans notları (arşivde)
Kural modülü, kayıt katmanı ve ult tek kol günlükleri (2026-10-22): `docs/archive/design/skill-tree-implementation.md` bölüm 8. Geçerli kurallar yukarıda (3.3) ve `skill-tree-moments.md` 4; kayıt kodu `src/progression/skill-tree-hero.ts`, kurallar `data/skill-trees/_rules.json`.

## 9. Biçimli skill (mode): yapay zeka ve arayüz
Veri ve motor biçimi: `skill-tree-fx-reference.md` (Adlı skill biçimi).
### Yapay zeka
- Radiance: kendi biçimi ve Focused Beam aynı terazide puanlanır (tek düşman kaldıysa ya da tek hedefi öldürecekse Focused Beam öne geçer).
- Card Trick (Stacked Deck): basit kural `statusModePick`: vurulabilir tek düşman -> Stun; düşmanlarda şifacı (başkasına heal / hot) -> Wound; yoksa Slow.

### Arayüz (`src/ui/skill-choice.ts` + `.css`, BattleScene)
- Biçimli skill düğmesine basınca düğmenin üstünde küçük kart paneli: Radiance / Focused Beam (nişangâhlı ikon) ya da Slow / Wound / Stun (durum ikonu ve rengi; Stun'da "First target only"). Hedef istemeyen kart hemen kullanılır; Focused Beam düşman seçtirir: "Focused Beam · Choose an enemy · Cancel" şeridi.
- Vazgeçme: Esc, panel dışına dokunma (o dokunuş skill kullanmaz), aynı düğmeye yeniden basma, Cancel. Panel yalnızca düğüme sahip kahramanda açılır. Telefonda (`html.short`) yazılar gerçek piksel, dokunma hedefi en az 44px. İtalik yok.
- Skill kartı açıklaması: `skill-info.ts` "lane" yayılma satırı.

### Testler
`tests/skill-tree-fx8.test.ts` (derleme, savaşta biçim, YZ, ağaçsız birebir aynılık); `fx4-hag`, `fx5b`, `skill-tree.test.ts` null listeleri güncellendi.

## 10. Evolve ikonu ve animasyonu

Ömer'in genel kuralı (tüm class'lar): bir skill'in evolve düğümü **onaylıysa** o skill'in ikonu o kayıtta döngülü animasyonla gösterilir ve aynı animasyon o skill'in ikonunun göründüğü HER yerde devam eder.

- **Kural tek yerde:** `src/progression/skill-tree-evolve.ts` (saf). Hangi satır hangi skill, evolve düğümü hangisi (`_rules.json > rowShape`, tür `evolve`), onaylı mı (kahramanın KAYITLI `tree` alanında rank >= 1; Tree ekranındaki bekleyen puan sayılmaz), mod açık mı (`_rules.json > enabled` + `modes`: sefer / Endless evet, Quick Battle / multiplayer hayır). `resolveEvolveIcon` skill için `{ evolved, art }` döner.
- **Hangi ikon:** evolve sanatı varsa (`assets/tree-icons/<sınıf>/<satır>_v.png`, ilk dosya `warrior/3_v` = Charge, Herald of Ruin) skill ikonunun YERİNE o gösterilir; yoksa normal skill ikonu animasyonlanır. Sanat eklemek: `python tools/make-tree-icon.py <kaynak.png> <sınıf> <düğüm>` (örn. `... warrior 2_v`), başka kod gerekmez (WebP + manifest otomatik, sanat kendiliğinden bağlanır).
- **Animasyon tek tanım:** `src/ui/evolve-icon.css`. Mekanizma: evolve onaylı skill'in ikon adresi `#evo` işareti taşır (`markEvolved`; boyalı ikonda `...#evo#smooth`), CSS `img[src*='#evo']` seçicisiyle animasyonu verir. Böylece adresi bir `<img>`'e koyan her ekran (Gear Hero satırı, Tree plakası, ipuçları, formasyon kartı, savaş HUD'ı) kendiliğinden animasyonlu olur. Hareket: yavaş kor titremesi (parlaklık / doygunluk) + yumuşak altın kenar parıltısı, ~2,6 sn, yalnızca `filter` (yerleşim kaymaz; en çok ~3 px yumuşak ışık). `html.reduced-motion` / `prefers-reduced-motion` / Performance Mode (`html.perf-lite`) = animasyon durur, sabit ince altın kenar kalır. JS yok. Bekleme (cooldown) gri süzgecini ezmez.
- **Nerede görünür:** Gear > Hero skill plakası + ipucu, Gear > Tree (skill plakası, evolve düğümünün kendisi: onaylanınca `.evo-on`; evolve düğümü sanatı varsa onay öncesi de kendi sanatını gösterir, animasyon yalnızca onaylıyken), formasyon kartı skill satırı + ipucu, savaş: alt skill çubuğu, birim kartı skill satırı + seçili skill önizlemesi, skill ipucu, biçim seçim kartları. Savaşa bilgi `UnitSetup.evolved` / `Combatant.evolved` ile gider (YALNIZCA sunum: skill id listesi, hasar / sıra / RNG etkilemez; `loadoutSetup` mod verilince doldurur). Phaser'da çizilen kahraman skill ikonu yok (savaş HUD'ı DOM; Quick Battle takım seçimi sabit).
- **Sabit kalanlar:** Codex / Wiki (belirli bir kayıt değil), Quick Battle, multiplayer, bekleyen (onaylanmamış) evolve.
- **Debug:** Debug > Campaign > Levels > "Grant Warrior Charge evolve (saved)" (`src/campaign/tree.ts > debugGrantEvolve`): kadrodaki ilk Warrior'a Charge evolve'unu onaylı verir (gereken level'a çıkarır).



## 11. Denge hedefi ve kalıcı kararlar (eski plan 9.2a ve 10a; günlüğün tamamı arşivde)
- **Ağacın güç katkısı:** L15'te tam (odaklı) ağaç, aynı seed'le ağaçsız koşuya göre kazanma oranını yaklaşık **+20-25 puan** artırır (class başına; Ömer 2026-10-22). **Yön dengesi:** aynı class içinde a ve b yönü build'leri arasındaki fark en çok **5 puan**. Düşmanların ağacı yok; ayar tavanla değil karşılaşma ölçekleri ve takaslarla (tavan yok kuralı).
- **Sim:** bayraklar ve rapor `docs/arch/sims-and-deploy.md` > Skill ağacı modu (`--tree focus`, `--level`). Tek 1000'lik seed ±5-7 puan gürültü verir; class kararı için 2 x 3000. Her koşu Ömer onayıyla. Düğüm sayıları ve sınıf bandı: `data/skill-trees/`, `docs/balance.md`.
- **Yüzde kuralı:** oransal (`_rules.json > percentRule`); metinde "A → B" yazan mutlak sayılar `set` / `base`.
- **Respec:** onaydan önce bekleyen puan bedava geri alınır; onaylı ağacın TAMAMI altınla sıfırlanır (bedel `_rules.json > respec`), savaş dışında; tek düğüm geri alma yok; `version` değişince bir kez bedava.
- **Modlar:** sefer + Endless açık, Quick Battle + multiplayer kapalı. Ağacı olmayan class: puanlar birikir. Mastery bar 30-45 (L50) içerik gelene kadar gizli.
- **NEW düğümler** (yeni mekanik) Ömer onayıyla `approved: true` olur; onaysız olan alınamaz.
- Ayrıntılı soru-cevap günlüğü (6 tur): `docs/archive/design/skill-tree-implementation.md` bölüm 10a.

## 12. Açık iş
- Telefon yatay (812x375, 740x360) görsel kontrolü ve reduced-motion elle bakılmadı (Gear > Tree sekmesi ve skill seçim paneli; 2026-10-23'ten kalma). Sahip: `docs/arch/areas/ui-ux.md`.
