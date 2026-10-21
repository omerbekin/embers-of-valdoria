# Skill ağacı (Moments): oyuna ekleme planı

Durum: **PLAN** (kod, veri ve test değişmedi; sim çalıştırılmadı). Hazırlayan: Plan agent, 2026-10-22.
Kaynaklar: `skill-tree-moments.md` (şekil, bölüm 8 = ea/eb tek yön), `skill-tree-moments-variants.md` (bölüm 5-7), mockup `public/mockups/skill-tree-moments/` (`core.js` kurallar, `content.js` içerik çözücü, `app.js` bar/etkileşim, `mix/warrior.js`, `mix/defender.js`, `final.js`). Kod incelemesi: `src/progression/levels.ts`, `src/progression/loadout.ts`, `src/campaign/{types,save,suspend,xp}.ts`, `src/endless/{data,save,replay}.ts`, `src/engine/{types,battle}.ts`, `src/ui/gear-screen.ts`, `data/skills.json`, `data/statuses.json`, `data/grounds.json`, `data/classes/{warrior,defender}.json`.

## 0. Kısa özet (Ömer için)
- Ağaç içeriği `data/skill-trees/<class>.json` dosyasına girer. Mockup'taki seçimden (karma + final.js) küçük bir araçla bir kez üretilir; sonra her düğümün etkisi makinenin okuyacağı biçimde (`fx`) yazılır.
- Kurallar (kilitler, ea/eb tek yön, ult tek kol + en çok 3 puan, en çok 2 evolve, level kilitleri, geri alma) tek saf modülde toplanır: `src/progression/skill-tree.ts`.
- Kayıt: her kahramana `tree` alanı eklenir (sefer kayıt sürümü 11 → 12, Endless 6 → 7). Veri değişip dağılım geçersiz kalırsa puanlar geri verilir.
- Motor: savaşa girerken kahramanın skill'lerinin **kişisel kopyası** yamalanır (skill id aynı kalır, sayılar değişir). Koşullu / tetikli düğümler 6 ortak motor kancası ailesiyle gelir.
- Sayım (Ömer'in seçtiği satırlar): **Warrior** 5 düz sayı (a) · 7 var olan etki (b) · 48 yeni kanca (c; 1'i NEW). **Defender** 13 (a) · 5 (b) · 42 (c; 2'si NEW). Yani düğümlerin ~%75'i motor kancası istiyor. Bu yüzden ağacın asıl hissi Faz 2-5'te gelir, Faz 1 yalnızca boru hattını kurar.
- Ekran: Gear > Sheet sağ sayfası (bugün orada "Skill tree · Coming soon" yazıyor). Yerleşim için mockup seçimi gerekiyor.
- Varsayılan önerisi: sefer ve Endless'ta açık; Quick Battle ve multiplayer'da kapalı (soru).

## 1. Doğrulanan kurallar (belge + core.js; özetle çelişen nokta işaretli)
| Kural | Değer | Kaynak |
|---|---|---|
| Puan havuzu | (level − 1) × `skillPointsPerLevel` (= 1). Sefer tavanı L30 → 29 puan; Endless L50 → 49 puan | `data/levels.json`, `levels.ts > addXp` |
| Satır şekli | f1 (3) → f2 (5) → f3 (5) → n0 notable → r (3) → ea \| eb → ma + fa (ea'dan) / mb + fb (eb'den) → v evolve (ma ya da mb) | `core.js > ROW_DEF` |
| Gerek | Önceki düğümde en az 1 rank | belge bölüm 1 |
| **Sayaç** | **Pasif + 3 aktif satıra harcanan TOPLAM puan** (hangi satırdan geldiği önemsiz). Ult sayılmaz. Mastery bar da aynı sayı | belge bölüm 2, `core.js > counter` |
| Tier kilitleri | Tier II sayaç 5 · III 10 · IV 15 · Evolve I 23 · Evolve II 38 | aynı |
| Evolve | ma ya da mb + sayaç şartı; karakter başına en çok 2 | aynı |
| ea / eb | Birbirini dışlar (yalnızca oyunda): biri alınınca öbür yönün edge + notable + blood price'ı kilitlenir; geri alınınca açılır. Tek yönlü satır evolve öncesi 20 puan; Evolve I L25 / II L40 değişmez (odaklı oyuncu kalan 3 puanı başka satırın Tier I filler'ına koyar) | belge bölüm 8 |
| Ult | 4 kol × 3 düğüm; 1. düğüm L5, 2. L10, 3. L15 (notable); kolda iç düğüm gerek; ult toplamı en çok 3 puan; **tek kol** (Ömer 2026-10-22): bir kolda puan varsa öbür üç kol alınamaz, sonuç en fazla tek kolun 3 düğümü; evolve yok | `core.js > ULT_LV, ULT_MAX, check (ultarm)` |
| Mastery bar | Sayaç 5 / 10 / 15 / 20 / 25'e ulaşınca 5 sabit bonus kendiliğinden açılır (seçim yok). 30-45 (L50) TBD | `app.js > bonusTip`, `core.js > bonusReached` |
| Mockup etkileşimi | Tık +1; sağ tık / dokunmatikte uzun basış −1 (bağımlılığı bozacaksa reddeder: "Needed by X"); altın ikonlu Reset | `app.js` |

**Çelişki notu:** görev özetinde "Tier II/III/IV o satırdaki puana bakar" yazıyordu. Belge ve `core.js` **global sayaç** diyor (satırdan bağımsız). Plan belgeyi izler; bu yüzden ikinci satırın kademeleri birinci satırın puanıyla zaten açık olur (belge bölüm 6 madde 1'deki Ömer varsayımı).

## 2. Veri şeması
### 2.1 Dosyalar ve araç
- `data/skill-trees/_rules.json`: şekil ve kilit sayılarının TEK yeri (CLAUDE.md kural 6): `rowShape` (core.js ROW_DEF karşılığı: id, tür, rank, tier, sütun, şerit, gerek), `tierNeed`, `evolveNeed: [23, 38]`, `evolveMax: 2`, `ultLevels: [5, 10, 15]`, `ultMax: 3`, `barAt: [5, 10, 15, 20, 25]`, `exclusiveEdges: true`, `respec` (bölüm 10'daki cevaba göre), `enabled` (mod başına bayrak: campaign / endless / quick / multiplayer).
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

### 2.3 `fx` dili
| Tür | Kategori | Biçim | Not |
|---|---|---|---|
| `skill` | (a) | `{ "k":"skill", "sel":"<seçici>", "f":"<alan>", "op":"add\|mul\|set", "v":n, "rank":true }` | Seçici: `self` (cost.amount, cooldown, initialCooldown, count, turnCost, area), `damage` (tüm hasar etkileri), `damage:1` (2. hasar etkisi, 0 tabanlı), `status:slow`, `taunt`, `guard`, `ground`, `bonusScale:armor`. Alanlar beyaz listede; bilinmeyen alan = test kırmızı |
| `passive` | (a) | `{ "k":"passive", "f":"maxBonus", "op":"add", "v":0.02 }` | Pasif yaması (Berserker `rage`, Bulwark `armorAura`) |
| `addEffect` / `replaceEffect` | (b) | `{ "k":"addEffect", "after":"damage:0", "effect":{ "type":"status", … } }` | Var olan SkillEffect türleri (status, randomStatus, dispel, shield, taunt, ground…) |
| `unitFx` | (b) | `{ "k":"unitFx", "fx":{ "secondWind":{ … } } }` | Var olan ItemEffects / pasif kancası biçimi; item'lerden **ayrı kanal** (4.1) |
| `hook` | (c) | `{ "k":"hook", "h":"cond\|rage\|trigger\|heal\|target\|rule", … }` | Bölüm 4.2'deki aileler |
| (ortak) | | `"rank": true` = v × rank; `"skill": "<id>"` = başka skill'e bağlı düğüm (sinerji: Into the Fire) | |

- **Yüzde kuralı (öneri, Ömer onayı gerekli):** "+X% power" = `mul X` (güç × (1 + X·rank)). Metinde "A → B" diye verilen mutlak sayılar (Bellow 25% → 34%, Plated Gauntlet 5% → 15%) `add` / `set`.
- **Uygulama sırası:** satırda sütun sırası (f1 → f2 → f3 → n0 → r → e → m/f → v). `set` kendinden önceki ekleri ezer, sonrakiler `set`'in üstüne biner (ör. Hollow Roar "breaks after 15%", Bellow'un +%9'unu siler: soru 10.6). **Faz 1a:** Ömer 10a'da Hollow Roar'u "Bellow'un üstüne eklenir" diye cevapladı; bunun için yeni op `base` (temel değeri değiştirir, tüm yamalardan önce uygulanır): Hollow Roar + Bellow 3 = 0,24 (bkz. Faz 1a notları).
- **`new: true` + `approved: false`:** oyunda "Awaiting approval" kilidiyle görünür, puan alınamaz.
- **`fx: null`:** etkisi henüz yazılmamış. Test build'inde puan alınabilir (yol ve kilitler test edilsin diye), motor yok sayar, ipucunda "Not active yet" çipi. Canlıda ağaç bayrağı kapalı kalır.

### 2.4 Gerçek örnekler
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
  "fx": [ { "k": "hook", "h": "cond", "when": { "target": { "status": "wound" } }, "mod": { "powerMul": 0.03 }, "rank": true } ] }
```
Warrior, (b) ve (c/C1).
```json
"bar[1]": { "at": 10, "name": "Second Wind", "text": "The first time you drop below 30% HP in a battle, heal 10% of your max HP.", "src": "B:V3:bar0",
  "fx": [ { "k": "unitFx", "fx": { "secondWind": { "below": 0.3, "heal": 0.1 } } } ] },
"3.ma": { "name": "Final Shield", "text": "When a guarded ally would die, you take the whole killing blow instead.", "src": "A:V3:3.ma",
  "new": true, "approved": false, "fx": [ { "k": "hook", "h": "rule", "rule": "interceptLethal", "scope": "guarded" } ] }
```
Warrior bar (b, var olan `ItemEffects.secondWind`) ve Defender NEW düğüm (onaysız kilitli).

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
- Geri alma / respec kancası: `respecCost(level, rules)` + `respec(a)` (bedel `_rules.json`; kural soru 10.2).

### 3.2 Testler (Faz 1)
1. Boş ağaç her level'da geçerli; havuz = level − 1.
2. f1 en çok 3 rank; f2 için f1 ≥ 1; zincir boyunca gerek.
3. Tier II sayaç 5'te açılır ve sayaç **global**: başka satırın puanı da açar; ult puanı açmaz.
4. ea alınınca eb, mb, fb kilit (`direction`); ea geri alınınca açılır; kayıtta ea + eb birlikte = `validate` hatası.
5. Ult: L4'te u1 kapalı, L5'te açık; u2 L10, u3 L15; iç düğüm gerek; başka koldan puan `ultArm` (tek kol, 2026-10-22); `ultCap` tavanı kural olarak durur.
6. Evolve: ma/mb yoksa `needs`; sayaç 22'de `evo`, 23'te açık; ikinci evolve 38; üçüncü `evoCap`.
7. Focus check (bölüm 8 kuralıyla): tek yön + 3 puan başka satır → Evolve I **L25**, Evolve II **L40**; L2-L50 arası hiçbir level'da puan boşta kalmaz (`anyOpen`).
8. `untake` bağımlıyı bozuyorsa reddeder ("Needed by"), tier/evolve sayacını düşürüyorsa reddeder.
9. Onaysız NEW düğüm alınamaz; `approved: true` olunca alınır.
10. `repair`: bilinmeyen anahtar atılır; geçersiz kalan dağılım tamamen iade edilir; geçerli dağılım aynen kalır (idempotent).
11. Veri doğrulama (her class dosyası): 48 satır + 12 ult anahtarı, ad ≤ 24, metin ≤ 150, satır skill id'leri class sırasıyla aynı, her `fx` gerçek `skills.json` tanımına karşı derlenir (seçici ve alan var), NEW düğümler `approved` taşır, final.js'te girdisi olan her class'ın dosyası var.
12. Derleyici: Bellow 3 rank → `breakRatio` 0,34; Rally Cry 3 → `allyDamageMult` 0,84; Hollow Roar + Bellow → 0,15 (`set` kuralı); Iron Meteor → `pct` 0,4 + `count` 2; `fx: null` düğüm derlemeye girmez.

### 3.3 Kayıt
- **Alan:** sefer `Hero.tree?: TreeAlloc`, Endless `EndlessHero.tree?: TreeAlloc` (aynı şekil). `skillPoints` kalır ve "harcanmamış puan" anlamına gelir (stat puanıyla aynı model).
- **Sürüm:** isteğe bağlı alan olsa da kahraman alanı ekleyen önceki adımlar gibi (v9 level, v11 wounds) sürüm artar: sefer `SAVE_VERSION` 11 → **12**, Endless 6 → **7** (save.ts başlık yorumuna madde). Göç gerekmez: alan yok = boş ağaç.
- **Onarım (her okumada, idempotent):** `normalizeLevelFields` yanına `normalizeTree(h)`: (1) tam sayı olmayan / bilinmeyen anahtar atılır, rank'lar tavana kırpılır; (2) `validate(level)` hatalıysa ağacın **tamamı bedava iade** edilir ve geçici `treeReset` bayrağı kurulur (Gear açılınca "Your skill tree was reset after an update. Points refunded." bildirimi); (3) değişmez kural: `skillPoints + spent = (level − 1) × skillPointsPerLevel`, tutmazsa `skillPoints` düzeltilir (geçerli dağılım asla silinmez); (4) kayıttaki `v` class dosyasının `version`'ından farklıysa ve dağılım geçerliyse kalır, bir kez bedava sıfırlama hakkı (`freeRespec`) verilir. Ağaç verisi henüz olmayan class'ın `tree` alanına dokunulmaz.
- **Debug `setLevel`** (levels.ts) dağıtılmış stat puanları gibi ağacı da sıfırlar.
- **Duraklatılmış savaş:** sefer Gear'ı zaten kilitli (`PAUSED_LOCK`). Ayrıca `resumeKey` / `planKey` birim kurulumlarını (`units`) içerdiği için ağaç değişirse kayıt tutmaz, savaş baştan başlar (güvenlik ağı; test: Endless kampında ağaç değişince yarım dalga baştan).
- **Saf durum fonksiyonları:** `setHeroTree(state, heroId, alloc)` (src/campaign/xp.ts > `allocateStats` gibi), `setRunHeroTree(run, heroId, alloc)` (src/endless/run.ts > `allocateRun` gibi), sim vekili için `autoTreeAll` / `autoTreeRun` (`focusBuild` ile). `GearSource.setTree?(heroId, alloc)` (gear-screen.ts > `allocate` kalıbı).
- **Testler:** v11 kaydı v12'ye yüklenir (ağaç boş, puanlar aynen); bozuk dağılım iade + bayrak; ea + eb'li kayıt iade; `skillPoints` tutarlılığı; Endless `parseRun` aynı kurallar; `setLevel` sıfırlar; ağaç değişince `resumeKey` değişir.

## 4. Motor etkileri
### 4.1 Mimari (bugünkü durum → öneri)
- **Bugün:** `Battle.skill(id)` savaş başına ortak tabloya (`setup.skills`) bakar; birime özgü skill katmanı YOK. Pasif birim başına kopyalanır (`createCombatant > passive`). Tek değiştirici katman birim düzeyinde: `UnitSetup.modifiers` (stat) + `itemEffects` (kancalar), güç katmanı `src/progression/loadout.ts > loadoutSetup` (yorumunda "+ ileride level, ağaç" diye yer ayrılmış). Sefer `campaign/encounters.ts:108`, Endless `endless/waves.ts:165` onu çağırıyor; QB / MP çağırmıyor.
- **Öneri: birim skill katmanı (aynı id).** `UnitSetup.tree?: TreeSetup` (motor tipi, derlenmiş hâl):
  `{ skills?: Record<skillId, SkillDef> /* yamalı tam tanım */; passive?: PassiveDef; fx?: ItemEffects /* (b) kanalı */; hooks?: TreeHook[] /* (c) */ }`.
  `createSetupCombatant` bunları `Combatant.skillDefs`, `passive`, `treeFx`, `treeHooks` alanlarına yazar. `Battle.skill(id, uid?)` = `get(uid)?.skillDefs?.[id] ?? setup.skills[id]`. Motorda skill okuyan yerler (battle.ts ~35, ai / ai-value / preview / skill-info / cost ~43) aktörün uid'ini geçirir.
- **Neden aynı id:** eylem günlüğü (replay), maç kaydı, cooldown / carry anahtarları, `src/game` ve `src/ui` içindeki 54 `skills[id]` araması (ikon, vfx, ses, poz) değişmeden çalışır. Reddedilen seçenek: türetilmiş id (`whirlwind@party-0` + `artOf`, Pose Tester kopyaları gibi): 54 arayüz aramasını ve günlükleri bozar.
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

### 4.3 Sayım (seçilen satırlar: 4 satır × 12 + ult 12 = 60; ayrıca bar 5)
| Class | (a) düz sayı | (b) var olan etki | (c) yeni kanca | (c) aileler | NEW (c içinde) | Bar (a/b/c) |
|---|---|---|---|---|---|---|
| Warrior (B, B, A, A, ult B) | 5 | 7 | 48 | C1 20 · C2 8 · C3 4 · C4 8 · C5 3 · C6 4 · NEW 1 | 1 | 0 / 3 / 2 |
| Defender (A, A, A, A, ult B) | 13 | 5 | 42 | C1 10 · C3 11 · C4 5 · C5 11 · C6 3 · NEW 2 | 2 | 0 / 1 / 4 |

Faz kapsamı (düğüm, 60 üstünden): Faz 1 = (a) → W 5, D 13 · Faz 2 = + (b) + C1 + C2 → W 40, D 28 · Faz 4 = + C3 + C4 → W 52, D 44 · Faz 5 = + C5 + C6 → W 59, D 58 · NEW onayla → 60.

### 4.4 Warrior (Berserker B, Double Strike B, Whirlwind A, Charge A, Headsman's Blow B)
| Anahtar | Ad | Kat. | Kanca taslağı |
|---|---|---|---|
| 0.f1 | Thick Hide | b | `unitFx.lowHpReduce { below 0.5, reduce 0.02×r }` |
| 0.f2 | Grit | c C4 | can < %25 iken alınan şifa × (1 + 0.05r) |
| 0.f3 | Shared Scars | c C1 | Berserker `maxBonus` + 0.02r × (canı < %50 dost sayısı); mutlak mı oransal mı belirsiz |
| 0.n0 | Iron Retort | c C3 | seni ilk kez %50 altına indiren düşmana Stun 1 (savaşta bir kez) |
| 0.r | Hardened | c C3 | Fortified kazanınca maks canın %2r'si şifa |
| 0.ea | Measured Mending | c C4 | alınan şifa: can < %50 ×1.25, üstünde ×0.5 |
| 0.eb | Stand Firm | c C4 | maks canın %30+'ını alacak tek vuruş ×0.75 |
| 0.ma | Red Line | c C4 | canı %50 üstüne çıkaracak şifa → 2 turluk kalkan (süreli kalkan katmanı var: `ShieldHook.turns`) |
| 0.fa | Grave Pact | c C1 | can < %25: skill lifesteal +0.15; can > %50: hasar ×0.85 |
| 0.fb | Iron Will | c C6 | sana gelen Stun / Slow 1 tur kısa + alınan şifa ×0.8 |
| 0.mb | Not Today | c C6 | savaşta bir kez ölümcül vuruş → 1 can + Fortified 1 (Lucky Escape vuruşu tamamen siler, bu 1 can bırakır) |
| 0.v | Undying Rage | **NEW** | can < %25 iken kritik olmayan vuruş seni 1'in altına indiremez; her kurtarış 10 Rage |
| 1.f1 | Knee Cutter | b | `+status slow 1, chance 0.05r` |
| 1.f2 | Notched Axe | a | `damage:1.power mul 0.04r` |
| 1.f3 | Hard Knocks | c C1 | 2. vuruş `critBonus +0.04r` hedef Slowed ise |
| 1.n0 | Gut Strike | c C1 | 1. vuruştan sonra `+status wound 2` (b) + 2. vuruş ×1.2 hedef Wounded ise (efekt sırası doğrulanacak) |
| 1.r | Bone Saw | c C1 | hedef Wounded ise `ignoreDefense +0.04r` |
| 1.ea | Hamstring | b | 2. vuruştan sonra `+status slow 1` |
| 1.eb | Deep Gash | a | `status:wound.turns set 4` (n0'ın eklediği durum) |
| 1.ma | Hobble | c C1 | hedef Slowed ise Slow +1 tur ve güç ×1.15 |
| 1.fa | Crippling Pair | a | `status:slow.turns set 2` + `damage.power mul −0.15` |
| 1.fb | Third Cut | c C5 | hedef Wounded ise 3. vuruş, bu skill kritik olamaz |
| 1.mb | Butcher's Carve | c C1 | vuruş başına × (1 + 0.05 × hedefteki Wound'un kalan turu) |
| 1.v | Skull and Knee | c C1 | 1. vuruş Slow 1 (b), 2. vuruş Slowed hedefe Stun 1 (C1), cooldown 2 (a) |
| 2.f1 | Steady Spin | a | `damage.lifesteal add 0.02r` |
| 2.f2 | Spin Recovery | c C4 | vurulan düşman başına maks canın %1r'si şifa |
| 2.f3 | Hungry Arc | c C1 | can < %50 iken güç × (1 + 0.03r) |
| 2.n0 | Gore Wheel | b | `+status wound 2` |
| 2.r | Red Arc | c C1 | Wounded hedefe × (1 + 0.03r) |
| 2.ea | Thirst | c C1 | Wounded hedeften lifesteal ×2 |
| 2.eb | Reaping Wind | c C2 | Rage'i yalnız en iyi hedeften değil hepsinden al (formulas kuralı değişir) |
| 2.ma | Blood Glut | c C4 | maks canı aşan Whirlwind şifası → %1 başına 1 Rage |
| 2.fa | Glass Cyclone | c C4 | lifesteal +0.25 (a) + sonraki turuna kadar +%15 alınan hasar (yeni durum) |
| 2.fb | Reaper's Spin | c C1 | Wounded hedefe ×1.3, Wounded olmayana ×0 |
| 2.mb | Crimson Wheel | c C1 | vurulanlar arasındaki her Wounded için herkese +%8 |
| 2.v | Exsanguinate | c C6 | vurulan hedefin Wound'unu tüketir: o vuruş ×1.4 + lifesteal ×2 (`detonate` benzeri) |
| 3.f1 | Rolling Start | c C1 | bu savaşta hiç oynamamış hedefe × (1 + 0.03r) |
| 3.f2 | Vengeful Run | c C1 | sana son vurana × (1 + 0.05r) (son vuran takibi YM14 Grudge'da var) |
| 3.f3 | War Gallop | c C2 | isabette +2r Rage |
| 3.n0 | Roaring Charge | c C2 | savaştaki ilk Charge: Rage = max(Rage, 30) |
| 3.r | Grim Momentum | c C2 | eksik canın her %20'si için +1r Rage |
| 3.ea | Grudge Charge | c C1 | son vurana Stun +1 tur |
| 3.eb | Blood Up | c C2 | tam canlı hedefe vurursa +10 Rage |
| 3.ma | Payback | c C1 | son vurana ×1.4 + hasarın yarısı kadar şifa |
| 3.fa | Martyr's Rush | c C4 | `+taunt 1` (b) + sonraki turuna kadar +%15 alınan hasar (yeni durum) |
| 3.fb | Reckless Heat | c C2 | `status:stun.turns set 1` (a) + 20 Rage |
| 3.mb | Into the Fire | c C2 | Charge'tan sonra sıradaki Headsman's Blow 10 Rage ucuz (sinerji, başka skill) |
| 3.v | Herald of Ruin | c C2 | tutulan Rage başına +%1 güç (harcamadan); Stun bitince 10 Rage iade (C3) |
| 4.u1 | Headsman's Feast | a | `damage.lifesteal set 0.2` |
| 4.u2 | Gravedigger | c C1 | can < %25 iken lifesteal ×2 |
| 4.u3 | Grave Robber | c C3 | öldürürse maks canın %25'i şifa + Fortified 1 |
| 4.r1 | Ringing Headsman | b | `+status stun 1` (sağ kalan hedefe zaten durum uygulanır) |
| 4.r2 | Heavy Toll | c C1 | harcanan Rage ≥ 40 ise Stun 2 tur |
| 4.r3 | Mercy Stroke | c C1 | Stunned hedefe ıskalamaz + `guaranteedCrit`, sonra Stun'ı bitirir |
| 4.d1 | Grim Calm | b | `+status fortify 1, self` |
| 4.d2 | Clean Slate | b | `+dispel debuff` (kendine; `dispel`'e küçük `self` bayrağı) |
| 4.d3 | Executioner's Calm | c C6 | sonraki turuna kadar sana debuff tutmaz |
| 4.l1 | Dreadful Swing | c C5 | hedef + yan komşulara Jinxed (vuruşsuz durum; tur sayısı metinde yok) |
| 4.l2 | Blinding Spray | c C5 | hedef + yan komşulara Blinded 2 |
| 4.l3 | Terror | c C3 | öldürürse tüm düşmanlar Jinxed (tur sayısı metinde yok) |
| bar 5 | Heavy Hand | b | `unitFx.openerStatus { slow, 1, max 1 }` (var olan "ilk hasar skill'i" kancası; metin "first skill") |
| bar 10 | Second Wind | b | `unitFx.secondWind { below 0.3, heal 0.1 }` |
| bar 15 | Crushing Weight | b | Stunned / Slowed / Staggered hedefe +%8 (Opportunist `bonusVsStatus` mantığı, ağaç kanalında) |
| bar 20 | Stubborn Heart | c C3 | tur başında can < %25 ise maks canın %3'ü şifa |
| bar 25 | Stagger Step | c C3 | savaşta bir kez Stun verince sıradaki turun %30 erken (Skip Turn hız desteği benzeri) |

### 4.5 Defender (Bulwark A, Tremor Slam A, Taunt A, Close Ranks A, Fist Crush B)
| Anahtar | Ad | Kat. | Kanca taslağı |
|---|---|---|---|
| 0.f1 | Braced Stance | c C1 | geçen tur yürümediysen auranın SENDEKİ payı + %5r zırh |
| 0.f2 | Drilled Ranks | c C5 | aura dostlara büyü zırhı da verir: senin zırhının %3r'si (yeni aura alanı) |
| 0.f3 | Tight Formation | c C1 | auradaki her dost için + %2r |
| 0.n0 | Shield Brothers | c C3 | savaş başı: auradaki dostlara maks canının %10'u kalkan |
| 0.r | Weathered | c C1 | alan skill'lerine karşı sendeki aura + %5r |
| 0.ea | Rooted Stance | c C3 | üst üste yürümediğin her tur sendeki aura + %10 (en çok + %40; YM4 Stone Patience benzeri) |
| 0.ma | Unyielding | c C6 | Rooted Stance doluyken yürüyene kadar Stun ve çekilme yemezsin |
| 0.fa | Anchored Stone | c C6 | sendeki aura ×1.5, ama hiç yürüyemezsin (Move kilidi) |
| 0.eb | Diagonal Guard | c C5 | aura çapraz dostlara da uzanır (aura şekli artı → 3×3) |
| 0.mb | Living Rampart | c C3 | auradaki dost %30 altına inince Fortified 1 (dost başına savaşta bir kez) |
| 0.fb | Pledged Plate | c C5 | dostların payı %100 (kendi / dost payı ayrılır) + kendi zırhın ×0.7 |
| 0.v | Fortress Aura | c C3 | her tur başında aura zırh bonusu kadar kalkan |
| 1.f1 | Deep Stomp | b | `status:slow` → `randomStatus [slow 3 (ağırlık 0.15r), slow 2 (1 − 0.15r)]` |
| 1.f2 | Shockwave | c C1 | zaten Slowed hedefe × (1 + 0.05r) |
| 1.f3 | Ringing Earth | b | `+status stun 1, chance 0.03r` |
| 1.n0 | Rolling Quake | c C5 | arkadaki sıraya da %50 hasar, Slow'suz |
| 1.r | Fault Strike | c C3 | Tremor Slam'ın her Stun'ı için +2r MP |
| 1.ea | Skull Rattler | c C1 | zaten Slowed hedefe %20 şansla Stun 1 |
| 1.ma | Third Quake | c C3 | her 3. kullanımda ilk vurulana Stun 1 |
| 1.fa | Heavy Landing | a | `status:slow.turns set 3` + `bonusScale:armor.pct set 0` |
| 1.eb | Aftershock Ground | c C5 | 2 turluk "quaking ground": üstündeki düşman tur başında Slowed (zemin bugün yalnız hasar tikler; durum veren zemin yeni) |
| 1.mb | Sinking Earth | b | quaking ground tiki: %15 STR hasar (var olan zemin hasarı; eb'ye bağlı) |
| 1.fb | Endless Tremor | a | `ground.turns set 4` + `damage.power mul −0.4` |
| 1.v | Earthsplitter | c C5 | yeni alan şekli: tam sıra + tam şerit ("past reach"), Slow 3 (a) |
| 2.f1 | Bellow | a | `taunt.breakRatio add 0.03r` |
| 2.f2 | Second Breath | c C3 | Taunt bitince maks canın %3r'si şifa |
| 2.f3 | Thick Skull | c C4 | Taunt maks canın %3r'si kadar kalkan verir (kalkan bugün yalnız stat × güç) |
| 2.n0 | Cover Them | c C3 | dost %30 altına inince Taunt cooldown sıfır |
| 2.r | Rally Cry | a | `taunt.allyDamageMult add −0.02r` |
| 2.ea | Stand Fast | a | `taunt.turns set 3` |
| 2.ma | Weathered the Storm | c C3 | Taunt kırılmadan biterse Fortified 1 |
| 2.fa | Ironbound Oath | a | `taunt.breakRatio` kaldır + `allyDamageMult set 1` |
| 2.eb | Brief Defiance | a | `self.cooldown set 3` |
| 2.mb | Refused to Fall | c C3 | Taunt kırılınca cooldown sıfır + zırhın %30'u kalkan |
| 2.fb | Hollow Roar | a | `cost.amount set 0`, `cooldown set 2`, `breakRatio set 0.15` |
| 2.v | Bastion Cry | b | `+status fortify, self, turns = Taunt süresi` (Taunt erken kırılırsa Fortified sürer mi: soru) |
| 3.f1 | Interlocked | c C5 | korunan dostlara senin zırhının %3r'si zırh |
| 3.f2 | Shield Chain | c C4 | korunan dostlara senin zırhının %4r'si kalkan |
| 3.f3 | Linked Plates | c C4 | sana aktarılan hasar × (1 − 0.03r) |
| 3.n0 | Second Chain | c C5 | kendi sırandaki dostları da korur (ikinci Guard kümesi) |
| 3.r | Linked Shields | c C4 | korunan dost başına zırhının %5r'si kendine kalkan |
| 3.ea | Hold Their Weight | a | `guard.share set 0.65` |
| 3.ma | Final Shield | **NEW** | korunan dost ölecekse öldürücü vuruşu sen alırsın (yakın kod: `interceptLethal`, YM11 `martyrsVow`) |
| 3.fa | Chained to Them | c C6 | `share set 0.8` (a) + sürerken Move ve Taunt kilitli |
| 3.eb | Shield Toss | c C4 | korunan dostlara zırhının %25'i kalkan (Shield Chain ile aynı kanca) |
| 3.mb | Steady Them | b | korunan dostlardan Stun ve Slow sil (`dispel`'e küçük `kinds` süzgeci) |
| 3.fb | Loose Chain | a | `cooldown set 3`, `guard.turns set 2`, `share set 0.35` |
| 3.v | Phalanx | **NEW** | korunan bir dosta gelen hasar tüm korunanlar ve sen arasında eşit bölünür |
| 4.u1 | Payback Fist | c C5 | son turundan beri sana vuranlar önce hedeflenir |
| 4.u2 | Bitter Knuckles | c C1 | onlara ×1.25 |
| 4.u3 | Settle the Score | c C5 | bu savaşta sana en çok hasar vereni her zaman iki kez vurur (hasar defteri) |
| 4.r1 | Plated Gauntlet | a | `bonusScale:armor.pct set 0.15` |
| 4.r2 | Heavier Fall | c C1 | 40 üstündeki her 2 zırh için +%1 |
| 4.r3 | Iron Meteor | a | `pct set 0.4` + `count set 2` |
| 4.d1 | Plate Hunter | c C5 | en zırhlı düşmanlar önce |
| 4.d2 | Can Opener | c C1 | hedefin zırh puanı başına +%1 |
| 4.d3 | Breaker of Walls | c C1 | zırhı seninkinden fazla olana `ignoreDefense 1` |
| 4.l1 | Swift Iron | a | `cooldown set 3` |
| 4.l2 | Pain Into Iron | c C1 | eksik canın her %10'u için MP bedeli −1 (`cost.ts`) |
| 4.l3 | Forge Again | c C3 | öldürürse cooldown sıfır |
| bar 5 | Iron Morning | c C3 | ilk turunda zırhının %50'si kalkan (savaş başı kalkan bugün maks can oranı) |
| bar 10 | First Tremor | c C3 | savaştaki ilk Tremor Slam Slow +1 tur |
| bar 15 | Formed Up | c C3 | savaştaki ilk Close Ranks bedelsiz (`firstSkillFree` benzeri, skill'e özgü) |
| bar 20 | Fault Line | c C3 | senin Stun'ın bitince hedef 1 tur Slowed |
| bar 25 | Last Wall Standing | b | dost düşünce Fortified 1 (`vengeance` kancası, kapsam: tüm dostlar) |

### 4.6 NEW düğümler (Ömer onaylamadı; ilk fazların DIŞINDA)
- **Warrior 0.v Undying Rage** (Berserker evolve), **Defender 3.ma Final Shield** (Close Ranks a yönü notable), **Defender 3.v Phalanx** (Close Ranks evolve).
- Sonuç: onay gelene kadar **Berserker ve Close Ranks evolve'suz**; Defender'ın Close Ranks a yönünde notable kilitli (fa açık). Veri `approved: false`, düğüm görünür ama "Awaiting approval".
- Seçenek (soru 10.4): onay ya da aynı satırın öbür karmasındaki NEW olmayan düğümle değiştirme (Warrior A 0.v Wrathfire; Defender B 3.ma Pinning Line, B 3.v Wall of Chains).

### 4.7 NEW işaretli değil ama fiilen yeni kural / stat getiren (c) düğümler (sorulacak)
- **Warrior:** 0.mb Not Today (Luck dışı ölümden dönme), 0.eb Stand Firm ("tek büyük vuruş" eşiği), 0.ma Red Line (fazla şifa → kalkan), 0.fb Iron Will (CC kısaltma + şifa cezası), 0.f2 Grit / 0.ea Measured Mending (kahramanda koşullu "alınan şifa" çarpanı), 2.eb Reaping Wind (Rage formülü), 2.ma Blood Glut (fazla şifa → Rage), 2.fa Glass Cyclone ve 3.fa Martyr's Rush ("+%15 alınan hasar" için yeni durum; Overextended +%25 ve silinemez), 2.v Exsanguinate (durumu tüketme), 3.v Herald of Ruin (tutulan Rage'den güç), 4.r3 Mercy Stroke (ıskalamaz), 4.d3 Executioner's Calm (debuff bağışıklığı), bar Stagger Step (Stun'la sıra hızlanması).
- **Defender:** 0.ma Unyielding (oyuncuya Stun / çekilme bağışıklığı), 0.fa Anchored Stone ve 3.fa Chained to Them (Move / Taunt kilidi), 0.eb Diagonal Guard (aura şekli), 1.eb Aftershock Ground (durum veren yeni zemin), 1.v Earthsplitter (yeni alan şekli, menzil ötesi), 3.n0 Second Chain (ikinci Guard kümesi), 4.u1 / 4.u2 / 4.u3 (sana vuranların defteri).

## 5. Mastery bar
- **Açılış:** `counter(alloc)` ≥ 5 / 10 / 15 / 20 / 25 olunca bonus kendiliğinden açık (sayaç = pasif + 3 aktif satır; ult sayılmaz). Seçim yok. Respec sayacı düşürürse bonus kapanır.
- **İçerik:** pasif satırının karmasından (Warrior: B "Iron Mastery"; Defender: A "Rampart Mastery"), class dosyasında `mastery.bar[i] = { at, name, text, src, fx }`.
- **Motor:** derleyici açılmış bonusların `fx`'ini düğümlerle aynı kanala (`TreeSetup.fx` / `hooks`) ekler; ayrı motor yolu yok. Kategoriler 4.4 / 4.5 tablolarının son 5 satırında.
- **L50 (30-45):** içerik TBD; sefer tavanı L30 olduğu için seferde etkisiz, Endless'ta sayaç 46'ya kadar çıkabilir. Arayüzde mockup gibi "L50: TBD" yerine gizlemek önerilir (soru 10.13).

## 6. Arayüz
- **Yer:** Gear > **Sheet** sekmesi sağ sayfa (`gear-screen.ts > renderRight`: bugün "Skill tree" başlığı + skill puanı rozeti + "Coming soon"). Sheet sekmesindeki ve harita sol listesindeki "+N" rozetleri, Gear parlaması (`camp-hud.ts`) aynen kalır.
- **Temel görünüm:** `public/mockups/skill-tree-moments.html` (Ömer düzeltmeleriyle): tier bandı ağacın üstünde tek sefer, sütunlar tüm satırlarla hizalı; Mastery bar üstte, yalnızca bonus elmasları + hover ipucu (tier yazısı / evolve çentiği yok); ult artı ağacı; düğüm boyları (filler küçük rank'lı, edge küçük, notable orta ikonlu, blood price, evolve büyük altın). Oyunda yeni: seçilmeyen yön sönük + kilit ("Other direction chosen").
- **Tasarım dili (`ui-design-language.md`):** düğüm ve bonus ipucu **A Band** (`band-tip.ts`); bilgi hover'da, dokunmatikte tek dokunuş sabitler; sakin göstergeler; düz metin; kor elmas yalnızca seçili düğümde; birincil düğme en sağda.
- **Akış (stat sayfası kalıbı, `sh-acts`):** tık / dokunuş = +1 **bekleyen** puan; sağ tık / uzun basış = −1 (yalnızca bekleyen); **Reset** (bekleyeni siler, solda) ve **Confirm** (sağda, `GearSource.setTree`). Onaylanmış puanı geri almak = respec (kural soru 10.2; onay `confirmIn`).
- **Parçalar (`ui-reference.md`):** `gear-screen.ts` (sayfa kabı, `heroRail` telefonda), `band-tip.ts`, `confirmIn`, `skill-bar.ts` ipucu sayıları `patchedSkill` ile, kısa ekran `html.short` / `html.compact`, dokunma hedefi ≥ 44 px.
- **Ek işler:** level bildirimi metni (`levels.ts > levelUpText` "Spend stat points in Gear." → "Spend your points in Gear."), Codex > Mechanics "Skill trees" makalesi (kural 8, `tests/wiki.test.ts`), debug araçları ("Skill tree: focus build", "Skill tree: reset", "Skill tree: Quick Battle preset").
- **Ömer'in mockup seçimi gereken kararlar (ui-dev mockup A / B / C):**
  - A: ağaç sağ sayfaya sığar (küçük düğümler, ult artısı satırların altında).
  - B: sağ sayfa özet (Mastery bar + 5 satırın puanı ve evolve durumu) + "Open tree" ile tam ekran çalışma paneli (mockup düzeni).
  - C: Gear'a üçüncü sekme "Tree", iki sayfayı birden kaplar.
  - Ayrıca: telefonda düzen, Mastery bar'ın yeri, kilitli yönün görünümü, respec düğmesi ve bedel gösterimi, "Not active yet" düğümlerin test görünümü.

## 7. Modlar (öneri = varsayılan; hepsi soru 10.3)
| Mod | Öneri | Gerekçe |
|---|---|---|
| Sefer | **Açık** | Puanlar zaten birikiyor; L30 tavanı → 29 puan (1 evolve + 5, ya da ult 3 puanla evolve L28). |
| Endless | **Açık** (koşu başına; kahraman L1'den) | L50'ye kadar 2 evolve. Koşu kaydında ağaç saklanır. |
| Quick Battle | **Kapalı** | Herkes L1 ve item'siz (Ömer 2026-10-09: QB/MP dokunulmaz). Debug'da "preset build" ile test edilebilir. İleride "Level + hazır build" seçeneği düşünülebilir. |
| Multiplayer | **Kapalı** | QB kuralları + lockstep; iki tarafta aynı ağaç verisi ve doğrulama gerekir. |
| Sim | Bayrakla | `src/sim/cli.ts` için `--level`, `--tree` (Faz 6); sefer / Endless vekili `autoTree`. |

## 8. Fazlar ve agentlar
| Faz | Agent (model) | İş | Ömer ne görür |
|---|---|---|---|
| 0 | ana oturum | Bölüm 10'daki engelleyici soruları sor (1, 2, 3, 4, 7); 3a mockup paralel başlayabilir | Sorular |
| 1a | **engine-dev (Opus)** | İnce dilim: `_rules.json`, `tools/tree-import.mjs`, `data/skill-trees/{warrior,defender}.json` (metin + yalnızca (a) fx: W 5, D 13; NEW yok), `skill-tree.ts` + `skill-tree-compile.ts`, `UnitSetup.tree` + birim skill katmanı (`skill(id, uid)`), pasif yaması, `loadoutSetup` bağlantısı, bölüm 3.2 + 4.1 testleri, bayrak (canlıda kapalı) | Debug'dan "focus build" verilen Defender'ın Taunt / Close Ranks / Fist Crush ipucu sayıları değişir |
| 1b | **campaign-dev (Opus)** | Kayıt (sefer v12, Endless v7), `normalizeTree` + bildirim bayrağı, `setLevel` sıfırlama, `setHeroTree` / `setRunHeroTree`, `autoTreeAll` / `autoTreeRun`, `GearSource.setTree`, testler (3.3) | Eski kayıt sorunsuz açılır |
| 2a | **engine-dev (Opus)** | (b) bağlantıları (`addEffect`, `unitFx` kanalı + `effectOf` birleştirme), C1 `cond` kancası + koşul sözlüğü, C2 Rage kancaları; önizleme / YZ aynı yoldan | |
| 2b | **content-designer (Opus)** | W/D (b) + C1 + C2 düğümlerinin `fx`'i (W 40, D 28 hazır), metin belirsizliklerini Ömer cevaplarıyla çözer, ipucu "Tree:" satırları | Warrior'ın çoğu satırı hissedilir |
| 3a | **ui-dev (Sonnet)** | Mockup A / B / C (`public/mockups/skill-tree-gear.html`, gerçek görünüm); ana oturum 5000 + Pages linki | Seçim |
| 3b | **ui-dev (Sonnet)** | Seçilen ekran: bekleyen / Reset / Confirm, A Band ipuçları, telefon, level metni, Codex makalesi, debug araçları. Motor / kayıt kodu yazmaz (kural modülünü çağırır); respec bedeli kayda dokunuyorsa o parça campaign-dev (Opus) | Oyunda ağaç ekranı |
| 4 | **engine-dev (Opus)** + **content-designer (Opus)** | C3 tetikler + C4 şifa / kalkan; fx (W 52, D 44) | Defender aura / Taunt satırları |
| 5 | **engine-dev (Opus)** + **content-designer (Opus)** | C5 hedef / alan / aura + C6 kurallar (yalnızca 4.7'de onaylananlar; onaysız kalan `approved: false`); fx (W 59, D 58) | |
| 6 | **balance-tester (Opus)** (+ scout Haiku yalnızca sim çalıştırır) | Sim bayrakları + vekil; **Ömer onayıyla** bölüm 9 sim'leri | Tablo + öneri |
| 7 | **engine-dev (Opus)** | Onaylanan NEW düğümler (4.6) | Berserker / Close Ranks evolve |
| 8 | ana oturum → **content-designer (Opus)** → gerekirse engine-dev → balance-tester | Kalan 9 class (Paladin'in satır seçimi `final.js`'te zaten var: a, a, b, a, a), her biri: Ömer final.js'e satırları yazar → `node tools/tree-import.mjs <cls>` → fx + yeni kanca listesi → (yeni kanca varsa) engine-dev → kısa sim (onaylı). Yeni kanca gerekmeyen class tek agent işi | Class class ağaç |

Yayın: ağaç `_rules.json > enabled` ile; Pages'te test için açık (ya da debug bayrağı), canlıya W + D tam (NEW hariç) ve ekran bitince. Her fazda tam `npm test` + `npm run build` (CLAUDE.md test akışı).

## 9. Denge (sim ÇALIŞTIRILMADI; her biri Ömer onayı ister)
### 9.1 Riskli değerler / birleşimler
- **Warrior hayatta kalma yığını:** Thick Hide + Stand Firm + Not Today + Second Wind (bar) + Berserker'in düşük canda +%80'i → düşük canda uzun süre en yüksek hasar. (Undying Rage onaylanırsa daha da güçlü.)
- **Double Strike (0 MP, cooldown'suz temel saldırı) kontrol:** Knee Cutter %15 Slow, Hamstring, Skull and Knee (Slow → Stun her 2 turda), Third Cut (3 vuruş).
- **Whirlwind sustain:** lifesteal 0.20 + 0.06 + Thirst ×2 (Gore Wheel herkesi kanatır) + Spin Recovery + Exsanguinate ×2 → tek atışta büyük şifa. Ayrıca tasarım tuzağı: hasar Wound'dan ÖNCE uygulandığı için Reaper's Spin + Gore Wheel'de ilk Whirlwind yaralı olmayanlara 0 vurur.
- **Charge → Headsman's Blow:** Charge Stun 2 (+1 Grudge Charge), Roaring Charge Rage ≥ 30 (ilk turda Headsman), Into the Fire −10 Rage, ult Mercy Stroke (Stunned hedefe ıskasız kesin kritik) → erken patlama.
- **Defender tanklık:** Rooted Stance + %40, Unyielding (CC bağışıklığı), Fortress Aura (her tur kalkan), Bastion Cry (Taunt + Fortified −%50) + Stand Fast 3 tur, Refused to Fall (kırılınca cooldown sıfır = sonsuz Taunt döngüsü riski).
- **Defender takım zırhı:** Pledged Plate (dostlara zırhın %100'ü), Diagonal Guard (4 kişilik takımda neredeyse herkes), Drilled Ranks (büyü zırhı).
- **Tremor Slam (0 MP) alan kontrolü:** Earthsplitter (sıra + şerit, Slow 3), Aftershock + Endless Tremor (4 turluk Slow zemini).
- **Fist Crush:** Can Opener / Breaker of Walls yüksek zırhlı boss'a karşı.
- **Genel:** düşmanların ağacı yok; sefer ve Endless zorluk eğrisi kolaylaşır. Ayar tavanla değil karşılaşma ölçekleri ve takaslarla (Ömer kuralı: tavan yok).

### 9.2 Sınırlı sim planı
- **Ön koşul (Faz 6):** `src/sim/cli.ts` bayrakları `--level N --tree <preset>` (iki taraf aynı → sınıf eşitliği; tek taraf → ağacın güç artışı); sefer / Endless vekiline `autoTree`.
- **96 hızlı (duman):** W ve D, L25, her satır için odaklı build vs aynı level ağaçsız; çökme yok, yön doğru. Faz 2 sonrası.
- **300 karşılaştırma:** 9.1'deki paketler açık / kapalı çiftleri, L25 ve L30 (ör. Skull and Knee, Charge → Mercy Stroke, Whirlwind sustain paketi, Not Today + Second Wind + Thick Hide, Earthsplitter, Pledged Plate, Bastion Cry + Stand Fast, Refused to Fall).
- **1000 ince:** `sim:campaign` L30 tavanında `autoTree`'li vs ağaçsız (zorluk eğrisi kayması), Endless L40-50; sınıf bandı `docs/balance.md`.
- Akış: Opus değeri uygular → scout sabit komutla sim'i çalıştırıp ham dosyayı yazar → Opus okur, tablo + öneri.

## 10. Açık sorular (Ömer; `open-questions.md` madde 378'e de eklendi)
1. **Yüzde kuralı:** "+4% power per rank" = gücün %4'ü kadar artış (0,40 → 0,416) mı, yoksa güce +0,04 mü? Öneri: oransal.
2. **Respec:** Öneri: Confirm'e kadar bekleyen puan bedava geri alınır; onaylanmış ağacın TAMAMI altınla sıfırlanır (bedel level'la artar, `_rules.json`), sefer her yerde savaş dışı mı yoksa yalnızca kasaba / kamp mı? Tek düğüm geri alma olsun mu? Ağaç verisi değişince bir kez bedava.
3. **Modlar:** sefer + Endless açık, Quick Battle + multiplayer kapalı (debug preset ile test) uygun mu?
4. **NEW düğümler:** Warrior 0.v Undying Rage, Defender 3.ma Final Shield, 3.v Phalanx onaylanıyor mu? Değilse öbür karmanın NEW olmayan düğümüyle değişsin mi (W A 0.v Wrathfire; D B 3.ma Pinning Line / B 3.v Wall of Chains)? Onaya kadar Berserker ve Close Ranks evolve'suz.
5. **Fiilen yeni kural getiren düğümler** (4.7 listesi): tek tek onay. Özellikle "+%15 alınan hasar" için yeni durum mu, Overextended (+%25) mi?
6. **Metin belirsizlikleri:** (a) Jinxed süresi yok: Warrior 4.l1 Dreadful Swing, 4.l3 Terror; (b) "sana son vuran" (3.f2, 3.ea, 3.ma) yalnızca skill vuruşu mu (Grudge YM14 gibi), DoT / zemin de mi?; (c) Shared Scars "+2%" Berserker'in %80'ine mutlak mı?; (d) Hollow Roar'un "%15"i Bellow'un rank'larını siler mi (öneri: evet, blood price)?; (e) Bastion Cry'ın Fortified'ı Taunt erken kırılınca da sürsün mü?; (f) Reaping Wind'de tek kullanım Rage tavanı (perCastCap 20) kalsın mı?; (g) Heavy Hand "ilk skill" mi "ilk hasar skill'i" mi?; (h) Iron Will 1 turluk Stun'ı tamamen siler mi?; (i) Iron Morning / Fortress Aura "zırh" aura ve item dahil mi?; (j) Earthsplitter "past reach" = menzil yok sayılır mı?; (k) Rolling Quake hedef en arka sıradaysa?; (l) Settle the Score: 3 rastgele yerine o düşmana 2 vuruş mu?
7. **Ekran yerleşimi:** mockup A / B / C (bölüm 6).
8. **Ağacı olmayan class'lar:** puanlar birikmeye devam etsin, ekranda "Coming soon" kalsın mı?
9. **Test build'i:** etkisi yazılmamış düğüm ("Not active yet") Pages'te alınabilsin mi?
10. **Rooted Stance "(up to +40%)":** metindeki üst sınır "tavan yok" kuralına aykırı mı, kalsın mı?
11. **Ayrım kuralı:** Warrior B pasif satırındaki genel savunma düğümleri (Thick Hide, Grit, Measured Mending) item = genel stat kuralıyla çakışıyor mu?
12. **Evolve odak şartı:** ea/eb tek yön kuralıyla puanını dağıtan oyuncu da L25'te evolve açabiliyor; "o satırda en az N puan" şartı eklensin mi (belge bölüm 3 notu)?
13. **Mastery bar 30-45 (L50):** Endless'ta ulaşılabilir; içerik ne zaman? O zamana kadar arayüzde gizlensin mi?
14. **Tier kilidi sayacı:** plan GLOBAL sayacı (bölüm 1) varsayıyor; "o satırdaki puan" yorumu uygulanmayacak. Doğru mu?
(Madde 6'ya ek: Gore Wheel + Reaper's Spin'de ilk Whirlwind yaralı olmayanlara 0 vurur, kalsın mı? Gut Strike'ta 2. vuruş aynı kullanımda verilen Wound'u görsün mü?)

### 10a. Cevaplar
**Ömer'in cevapları (2026-10-22, form: https://claude.ai/artifact/UjzsVCcu2D3dikiwrUf94k, db tree/main):**
- Yüzde kuralı: **oransal** ("+4% power" = güç × 1,04; metinde "A → B" yazan mutlak sayılar aynen).
- Respec: onaydan önce bekleyen puan bedava geri alınır; onaylanmış ağacın **tamamı altınla** sıfırlanır (bedel level'la artar), savaş dışında her yerde. Tek düğüm geri alma yok. Ağaç verisi değişince bir kez bedava.
- Modlar: **sefer + Endless açık**, Quick Battle + multiplayer kapalı.
- NEW düğümlerin hepsi **onaylandı**: Warrior Undying Rage; Defender Final Shield, Phalanx; Paladin Focused Beam, Martyr Rising.
- Yeni kural getiren düğümlerin (4.7 listesi) hepsi **tamam**. "%15 fazla hasar alırsın" (Glass Cyclone, Martyr's Rush) için **yeni küçük bir durum** (+%15 alınan hasar, silinebilir).
- Ağacı olmayan class: puanlar birikir, ekranda "Coming soon". Etkisi kodlanmamış düğüm Pages'te **alınabilir**, ipucunda "Not active yet". Mastery bar 30-45 içerik gelene kadar **gizli**.
- Metinler: Jinxed **2 tur**; "sana vuran" = yalnızca **skill vuruşu**; Shared Scars **düz ekleme** (+%80 → +%82); Hollow Roar'un %15'i **Bellow'un üstüne eklenir** (öneriden farklı); Bastion Cry'ın Fortified'ı Taunt bitince/kırılınca **biter**; Reaping Wind 20 Rage sınırı **kalır**; Heavy Hand = ilk **hasar veren** skill; Iron Will 1 turluk Stun'ı **tamamen düşürür**; Iron Morning / Fortress Aura **görünen toplam zırh**; Earthsplitter **menzil yok sayar**; Rolling Quake hedef en arkadaysa **ek vuruş yok**; Settle the Score normal vuruşlara **ek** olarak o düşmana 2 vuruş (öneriden farklı); Gore Wheel'in Wound'u **vuruştan önce** işler.
- Rooted Stance "(up to +40%)" **kalır**; Warrior Berserker satırındaki genel savunma düğümleri **kalır**.
- Ana oturumun önceki kararlardan cevapladıkları: tier sayacı global (soru 14); evolve için ek odak şartı yok (soru 12). Ekran yerleşimi (soru 7): mockup `public/mockups/skill-tree-gear.html` ile seçilecek.
- **İkinci tur NEW onayları (Ömer 2026-10-22, "hepsini onaylıyorum"):** Cutthroat 0.eb Counter Cut; Mage 1.mb Rolling Doom, 2.v Eternal Winter, 4.d3 Twin Meteors; Druid 2.v Thicket Wave, 3.n0 Overflowing Cup, 4.d3 Living Bomb; Undead 0.ma Undying Thirst, 0.mb Stolen Remedy; Hexer 0.v Herald of Ruin, 2.v Plague Curse, 3.v Turned Hand, 4.l3 Last Rite; Anti-Mage 0.v Endless Spring, 3.v Mirror Ward, 4.l3 Grand Theft; Gambler 0.ea Streak, 0.v Run It Back, 2.n0 Due for a Win, 3.ea Stacked Deck; Archer A 0.mb Range Keeper (yalnızca belge; Archer ağaç verisi Piercing Arrow satırı seçilince). Veride 20 düğüm `approved: true`; artık onay bekleyen NEW düğüm yok (fx'ler sonraki faz).

## 11. Uygulamayı engelleyenler
- **Faz 1 için engel yok** (yalnızca (a) düğümler, debug'da bedava sıfırlama, ağaç canlıda kapalı).
- **Faz 2 fx yazımı:** soru 1 (yüzde kuralı) ve 6 (metin belirsizlikleri) cevaplanmalı.
- **Faz 3 ekran:** soru 7 (mockup seçimi) ve 2 (respec kuralı).
- **Canlıya çıkış:** soru 3 (modlar).
- **3 NEW düğüm:** Berserker ve Close Ranks evolve'ları soru 4'e kadar yok.
- **Tasarım gerçeği:** seçilen düğümlerin ~%75'i yeni motor kancası istiyor; ağaç ancak Faz 2-5 sonunda tam hissedilir. Her yeni class da büyük olasılıkla yeni kanca listesi getirir (Faz 8 maliyeti class'a göre değişir).

## Faz 1a notları (engine-dev, 2026-10-22)
Plan ile kod gerçeğinin ayrıldığı yerler ve sonraki fazların bilmesi gerekenler.
- **Bağlanan (a) düğümleri: Warrior 3, Defender 12** (plan 5 / 13). Warrior 1.eb Deep Gash, 1.fa Crippling Pair ve Defender 1.fb Endless Tremor `fx: null` kaldı: seçicileri (wound / slow durumu, zemin) skill'de bugün YOK, başka bir (b) / (c) düğümün eklediği etkiye bakıyorlar. O düğümlerin fx'i yazılınca bunlar da yazılır; `checkTreeFx` testi her fx'i tek başına derler, eksik seçiciyi kırmızı yapar.
- **Yüzde kuralı TEK yerde:** "+X% power" düğümleri fx'te `op: "pct"`; anlamı `data/skill-trees/_rules.json > percentRule` (`"mul"` = oransal, Ömer 10a; `"add"` = düz ek). Çevirmek için yalnızca bu değer değişir (test iki yolu da denetler).
- **Yeni op `base`** (Hollow Roar, 10a cevabı): `set` gibi değer verir ama TÜM yamalardan önce uygulanır, ekler üstüne biner (0,15 + Bellow 0,09 = 0,24). `set` aynen "öncekileri siler" anlamında kalır.
- **Ironbound Oath** = `taunt.breakRatio set 0` (motor: breakRatio 0 / yok = taunt hiç kırılmaz) + `allyDamageMult set 1`. Yeni "unset" op'u gerekmedi.
- **`compileTree(tree, alloc, rules)`:** plandaki `level` parametresi yok (derleyici level'a bakmaz); doğrulama `treeSetupFor(src, mode)` içinde (`validate` hatalıysa ağaç savaşa girmez). Hiçbir etkin fx yoksa (yalnızca fx null düğümler) sonuç `undefined`: birim bugünküyle birebir aynı.
- **`Battle.skill(id, who)`:** `who` uid ya da Combatant olabilir. Ağaçsız savaşta (hiç `skillDefs` yok) eski yol aynen çalışır (`treeUnits` bayrağı). Uid'siz kalan 9 çağrı yapısal yüklemler (hedef seçimi, alan şekli, ceset, dirilme, yakın dövüş, brand); bekçi test (`tests/skill-tree-engine.test.ts`) bunları izin listesiyle tutar. Bir faz bu alanları yamalarsa (ör. alan şekli değiştiren düğüm) o yüklem uid almalı ve listeden çıkmalı. Savaş arayüzü (BattleScene birim kartı + skill çubuğu ipucu / bedel / cooldown) birimin yamalı tanımını gösterir.
- **Modlar:** `_rules.json > enabled: false` (ana şalter) + `modes` (sefer / Endless açık, QB / MP kapalı; Ömer 10a). Bağlantı `loadoutSetup(src, { mode })`: sefer `campaign/encounters.ts`, Endless `endless/waves.ts`. Mod verilmeyen çağrılar (Gear önizlemesi, golden kayıtlar) ağaç almaz.
- **Debug:** Debug > Campaign > Levels > "Skill tree focus build: off / direction A / direction B". Yalnızca bellekte; ana şalter kapalıyken de sefer + Endless kahramanına level'ına göre `focusBuild` verir (ön ayar `_rules.json > debugFocus`: Warrior satır 1 + 2 ult u, Defender 2 + 3 ult r, Paladin 1 + 2). Sayılar savaştaki skill ipuçlarında görünür.
- **NEW düğümler:** 10a ile hepsi `approved: true` (fx null). İçe aktarma aracı var olan `approved` değerini korur.
- **`tools/tree-import.mjs`:** yalnızca istenen class'ı okur; final.js'te `try` taşıyan (seçimi süren) ya da a / b dışı satır harfi olan class'ı açık mesajla reddeder (archer bekliyor).
- **Respec:** `respec(tree)` yalnızca boş ağaç döndürür; altın bedeli (10a) ve `respecCost` Faz 1b / 3 işi.
- **Faz 1b (kayıt) için:** (1) dağılım şimdilik parametre: `LoadoutSource.tree?: TreeAlloc`; kahraman tipine `tree` eklenince sefer / Endless otomatik bağlanır. (2) Okumada `repair(tree, level, raw)` kullanılmalı (`{ alloc, reset, dropped }`; geçersizse tamamı iade). (3) Derlenmiş `TreeSetup` savaş planının `units` alanına girer: sefer duraklatılmış savaş (`suspend.ts`) ve Endless plan anahtarları bu yüzden ağaç değişince değişir (planın 3.3 güvenlik ağı kendiliğinden çalışır; testi 1b yazmalı). (4) `battleStart` olayı birimleri kopyaladığı için ağaçlı birimde `skillDefs` maç kaydına da girer (ağaçsız kayıt değişmez). (5) `setLevel` debug'ı ağacı sıfırlamalı (henüz kayıtta ağaç yok).

## Faz 1b notları (campaign-dev, 2026-10-22)
Kayıt katmanı; plandan ayrılan yerler ve sonraki fazların bilmesi gerekenler. Varsayımlar `open-questions.md` madde 379.
- **Dosyalar:** kahraman / kayıt kuralları TEK yerde `src/progression/skill-tree-hero.ts` (`normalizeTree`, `treeChangeBlocked` + `applyTree`, `respecBlocked` + `applyRespec` + `heroRespecCost`, `autoTreeHero`, `TREE_RESET_NOTICE`). Sefer sarmalayıcıları `src/campaign/tree.ts` (plan xp.ts diyordu; `state.ts` xp.ts'i içe aktardığı için `pausedLock` döngüsü olmasın diye ayrı dosya): `setHeroTree`, `heroTreeBlocked`, `respecHeroTree`, `respecTreeBlocked`, `autoTreeAll`. Endless `src/endless/run.ts`: `setRunHeroTree`, `runTreeBlocked`, `respecRunHeroTree`, `respecRunBlocked`, `autoTreeRun`. Geçersiz işlem durumu DEĞİŞTİRMEZ (aynı nesne döner); nedeni `...Blocked` verir (İngilizce, arayüz aynen gösterebilir).
- **Kayıt biçimi:** `tree` yalnızca en az 1 puan harcanmışsa yazılır (boş ağaç = alan yok; kayıt / bellek karşılaştırması `hasUnsavedProgress` tutarlı kalsın diye tek biçim), `v` her yazışta class dosyasının güncel `version`'ı. Bayraklar `freeRespec` / `treeReset` yalnızca `true` olarak durur. Sefer `SAVE_VERSION` 12, Endless 7; okuma her sürümde `normalizeLevelFields` + `normalizeTree` (idempotent).
- **Sürüm farkı:** okumada `v` != class `version` ve dağılım geçerliyse ağaç kalır, `freeRespec` kurulur ve `v` güncellenir (hak bayrakta durur, aynı farktan ikinci kez verilmez; respec kullanınca silinir).
- **Onay yalnızca ekler:** `setHeroTree(alloc)` = onaylanacak TAM dağılım; onaylı rank düşürülemez, en az 1 yeni puan, yeni puan <= `skillPoints`. Faz 3b Gear: bekleyen puanları ekranda tutar, Confirm'de `GearSource.setTree(heroId, alloc)` çağırır (kaynak bağlantısı sefer + Endless hazır; `GearHero.tree` da geliyor). Respec için `GearSource`'a henüz alan EKLENMEDİ (Faz 3b: `respecHeroTree` / `respecRunHeroTree` + bedel `heroRespecCost`). `treeReset` bildirimi gösterilince bayrağı silen küçük fonksiyon da Faz 3b'nin (şimdi bayrak hiç silinmiyor, yalnızca Set level siler).
- **Kilit:** sefer `PAUSED_LOCK`, Endless `gearLockReason` varken onay / respec reddedilir. Güvenlik ağı testli: şalter açıkken ağaç değişince sefer `canResume` false (savaş baştan), Endless `planKey` değişir.
- **Respec bedeli:** `_rules.json > respec` (base 20 + perLevel 5 x level; provizyon). `skill-tree.ts > respecCost`. Endless koşu altınından.
- **Debug odaklı kurulum önceliği değişti:** araç açıkken kayıtta kendi ağacı olan kahraman kendi ağacıyla girer, ağacı boş olan ön ayarı alır (`skill-tree-compile.ts > treeSetupFor`). Ana şalter `enabled: false` kaldı: kayıtlı ağaç oyunda yalnızca bu araç açıkken savaşa girer.
- **Yeni debug araçları (Debug > Campaign > Levels):** "Spend skill tree points (saved)" (`autoTreeAll`, kayda yazar) ve "Reset skill tree: <class> (<bedel> gold)" (ilk ağaçlı kahraman; altın düşer). "Set level N" artık ağacı da sıfırlar (ipucu metni güncellendi). Endless debug sekmesine ağaç aracı eklenmedi.
- **Sim vekili:** `autoTreeAll` / `autoTreeRun` (`focusBuild`, `FocusOptions.from` = onaylı ağaçtan sürdürür; focusBuild(L) dağılımından başlanınca sonuç focusBuild(L + 1) ile aynı). Ön ayar `debugFocus` (yoksa satır 1 + 2). Sim CLI'ya bağlanmadı (Faz 6).
- **Test yardımcısı:** `tests/level-helpers.ts > leveledRun / leveledCampaign` artık skillPoints'i level'a göre verir (eski hali L50 + 0 puan = okumada düzeltilen imkânsız durum).

## Ult tek kol (2026-10-22)
Ömer kararı: "tüm classlar için ultide tek kol seçilebilsin. Bir yola başlayınca diğerine gidilmesin." Eski "kollar serbest" kuralının yerine geçer; 3 puan tavanı ve L5 / L10 / L15 kilitleri aynen kalır.
- **Kural:** herhangi bir ult kolunun herhangi bir düğümünde puan varsa diğer üç kolun düğümleri alınamaz. Sonuç: en fazla tek kolun 3 düğümü. Veri: `_rules.json > ult.singleArm: true`.
- **Oyun kural modülü** (`src/progression/skill-tree.ts`): `check` yeni blok kodu `ultArm`, metin "One ult path only: the <kolun 1. düğümünün adı> path is already chosen". Sıra: tek kol, sonra `ultCap`, sonra level, sonra gerek (kol doluyken öbür kollar "tavan" değil "başka kol seçildi" der; bugünkü veride `ultCap` yalnızca kol 3 düğümden uzun / tavan 3'ten küçük olursa görülür). `status` eşlemesi `dir` (ea / eb karşı yönüyle aynı görünüm: sönük + kilit). Yardımcılar `ultArmsUsed(a)` / `ultArm(a)`.
- **Kayıt:** iki kolda puan olan dağılım `validate`te geçersiz (tavan içinde bile); okumada `repair` ağacın TAMAMINI bedava iade eder + `treeReset` (bugünkü yol).
- **Odaklı kurulum / sim vekili / debug** (`focusBuild`, `autoTreeHero`, `debugFocusAlloc`): ult puanı hiçbir durumda iki kola dağılmaz; ön ayar kolu doldurulur, başlangıç dağılımında (kahramanın onaylı ağacı) başka kol seçiliyse o kol sürdürülür; kol verilmezse ult puanı yalnızca son "açık düğüm" adımında ilk açılan kola gider ve kural onu o kolda tutar.
- **Mockup'lar:** Moments (`skill-tree-moments/core.js`, kod `ultarm`, görünüm `xl` = kesik çizgili sönük; kol listesinde kapanan kol "closed", çizgisi sönük) ve Gear (`skill-tree-gear/data/core.js` kopyası + `tree-logic.js` durumu `dir` = sönük + kilit simgesi, "Other ult path chosen" çipi). Gear'da bekleyen ult puanı geri alınınca kollar yeniden serbest; onaylı kol yalnızca respec ile değişir.
