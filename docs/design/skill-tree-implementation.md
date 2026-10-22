# Skill ağacı (Moments): oyuna ekleme planı

Durum: **PLAN** (kod, veri ve test değişmedi; sim çalıştırılmadı). Hazırlayan: Plan agent, 2026-10-22.
Kaynaklar: `skill-tree-moments.md` (şekil, bölüm 8 = ea/eb tek yön), `skill-tree-moments-variants.md` (bölüm 5-7), mockup `public/mockups/skill-tree-moments/` (`core.js` kurallar, `content.js` içerik çözücü, `app.js` bar/etkileşim, `mix/warrior.js`, `mix/defender.js`, `final.js`). Kod incelemesi: `src/progression/levels.ts`, `src/progression/loadout.ts`, `src/campaign/{types,save,suspend,xp}.ts`, `src/endless/{data,save,replay}.ts`, `src/engine/{types,battle}.ts`, `src/ui/gear-screen.ts`, `data/skills.json`, `data/statuses.json`, `data/grounds.json`, `data/classes/{warrior,defender}.json`.

## 0. Kısa özet (Ömer için)
- Ağaç içeriği `data/skill-trees/<class>.json` dosyasına girer. Mockup'taki seçimden (karma + final.js) küçük bir araçla bir kez üretilir; sonra her düğümün etkisi makinenin okuyacağı biçimde (`fx`) yazılır.
- Kurallar (kilitler, ea/eb tek yön, ult tek kol + en çok 3 puan, en çok 2 evolve, level kilitleri, geri alma) tek saf modülde toplanır: `src/progression/skill-tree.ts`.
- Kayıt: her kahramana `tree` alanı eklenir (sefer kayıt sürümü 11 → 12, Endless 6 → 7). Veri değişip dağılım geçersiz kalırsa puanlar geri verilir.
- Motor: savaşa girerken kahramanın skill'lerinin **kişisel kopyası** yamalanır (skill id aynı kalır, sayılar değişir). Koşullu / tetikli düğümler 6 ortak motor kancası ailesiyle gelir.
- Sayım (Ömer'in seçtiği satırlar): **Warrior** 5 düz sayı (a) · 7 var olan etki (b) · 48 yeni kanca (c; 1'i NEW). **Defender** 13 (a) · 5 (b) · 42 (c; 2'si NEW). Yani düğümlerin ~%75'i motor kancası istiyor. Bu yüzden ağacın asıl hissi Faz 2-5'te gelir, Faz 1 yalnızca boru hattını kurar.
- Ekran: Gear > Sheet sağ sayfası (bugün orada "Skill tree · Coming soon" yazıyor). Yerleşim için mockup seçimi gerekiyor. **Seçildi (Ömer 2026-10-22): C**, Gear'a üçüncü sekme "Tree" (bölüm 6).
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
| `addEffect` / `replaceEffect` | (b) | `{ "k":"addEffect", "after":"damage", "effect":{ "type":"status", "status":"wound", "turns":2 } }` · `{ "k":"replaceEffect", "sel":"status:stun", "effect":{ … } }` | Var olan SkillEffect türleri: damage, status, randomStatus, dispel, shield, taunt, guard, ground, heal, hot, dot, selfDamage, pull (zorunlu alanlar, durum / zemin adları denetlenir). Yer: `after` / `before` seçici (`damage`, `damage:N`, `status`, `status:<durum>`, etki türü), yoksa sona. `byRank: [r1, r2, …]` = rank'a göre etki. Faz 2a |
| `unitFx` | (b) | `{ "k":"unitFx", "fx":{ "secondWind":{ "below":0.3, "heal":0.1 } } }` | Var olan ItemEffects anahtarları (`UNIT_FX_KEYS`); item'lerden **ayrı kanal** `Combatant.treeFx` (4.1). `rank: true` = sayılar × rank (eşik / süre alanları `below, above, cap, turns, every, max, turnCost` hariç). Faz 2a |
| `hook` | (c) | `{ "k":"hook", "h":"cond\|rage\|trigger\|heal\|target\|rule", … }` | Bölüm 4.2'deki aileler. Faz 2a: `cond` ve `rage` bağlı (biçim: "Faz 2a notları") |
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
  - **Seçim (Ömer 2026-10-22): C** (`public/mockups/skill-tree-gear.html#v3`, Gear'da üçüncü sekme "Tree", ağaç iki sayfayı birden kaplar). Ömer'in şartı: skill'ler ekranda oyundaki **tam skill plakası** biçimiyle gösterilir (ui-dev mockup'ı buna göre düzeltiyor; Faz 3b bu düzeltilmiş C'yi uygular).
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
| 3b | **ui-dev (Sonnet)** | Seçilen ekran (**C**, Gear'da üçüncü sekme "Tree"; skill'ler tam skill plakasıyla, Ömer 2026-10-22): bekleyen / Reset / Confirm, A Band ipuçları, telefon, level metni, Codex makalesi, debug araçları. Motor / kayıt kodu yazmaz (kural modülünü çağırır); respec bedeli kayda dokunuyorsa o parça campaign-dev (Opus) | Oyunda ağaç ekranı |
| 3c | **content-designer (Opus)** prompt + **art-pipeline (Sonnet)** ChatGPT | **Notable ve evolve görselleri (Ömer 2026-10-22):** class başına ~16 notable (4 satır × n0 / ma / mb + 4 ult kol sonu) + 4 evolve; 11 class ≈ 176 notable + 44 evolve. Notable = tek boyalı ikon (icon-art-style: tek kalın konu, az döküntü). Evolve = **fare üstüne gelince oynayan animasyon** (kare sayfası; biçim örnekle onaylanır). Sıra: önce 1 notable + 1 evolve örneği Ömer onayına, sonra class class. Zaman: fx'ler oturup düğüm adları kesinleşince (Faz 3b ile birlikte) | Düğümlerde görseller |
| 3d | **ui-dev (Sonnet)** | **Ağaç ekranında animasyonlar (Ömer 2026-10-22):** puan verince düğüm dolma / parlama, yol çizgisinin akması, kilit açılma, evolve açılışı, yön kilitlenmesi, Confirm / Reset geçişleri; `data/ui-motion.json` dilinde, telefonda akıcı. Önce mockup (3b mockup'ına eklenir), Ömer görür | Canlı ağaç |
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

### 9.2a Denge hedefleri (Ömer 2026-10-22, "öneriyle git")
- **Ağacın güç katkısı:** L15'te tam (odaklı) ağaç, aynı seed'le ağaçsız koşuya göre kazanma oranını **yaklaşık +20-25 puan** artırır (class başına). (Ömer 2026-10-22: hedef +10-15'ten +20-25'e çekildi, "orta karar kırpma, sert değil"; Faz 7 denge turu aşağıda.)
- **Yön dengesi:** aynı class içinde a ve b yönü build'leri arasındaki kazanma farkı **en çok 5 puan**.
- **Sim'in tutması gerekenler:** girdi = class, level (5 / 10 / 15 / 20), mod, build kimliği (satırlar, yön, evolve, ult kolu), ilvl, zorluk, seed + aynı seed ağaçsız referans. Çıktı = bugünkü tablo + ağaçlı-ağaçsız fark, a-b farkı, düğüm başına tetiklenme sayısı (hiç tetiklenmeyen = ölü düğüm), düşmanın kontrol (Stun / Slow) altında geçirdiği tur payı, skill payı kayması (%40 baskın kuralı), bitmeyen savaş / kaynak tükenmemesi, evolve / ult kolu / Mastery bar katkısı ayrı.
- **Sıra:** düğüm etkileri motora (Faz 2, 4, 5; 11 class) → sim'e ağaç modu (Faz 6, balance-tester) → scout koşturur (her koşu sayısı Ömer onayıyla) → balansçı ayarlar.

### 9.2 Sınırlı sim planı
- **Ön koşul (Faz 6):** `src/sim/cli.ts` bayrakları `--level N --tree <preset>` (iki taraf aynı → sınıf eşitliği; tek taraf → ağacın güç artışı); sefer / Endless vekiline `autoTree`.
- **96 hızlı (duman):** W ve D, L25, her satır için odaklı build vs aynı level ağaçsız; çökme yok, yön doğru. Faz 2 sonrası.
- **300 karşılaştırma:** 9.1'deki paketler açık / kapalı çiftleri, L25 ve L30 (ör. Skull and Knee, Charge → Mercy Stroke, Whirlwind sustain paketi, Not Today + Second Wind + Thick Hide, Earthsplitter, Pledged Plate, Bastion Cry + Stand Fast, Refused to Fall).
- **1000 ince:** `sim:campaign` L30 tavanında `autoTree`'li vs ağaçsız (zorluk eğrisi kayması), Endless L40-50; sınıf bandı `docs/balance.md`.
- Akış: Opus değeri uygular → scout sabit komutla sim'i çalıştırıp ham dosyayı yazar → Opus okur, tablo + öneri.
- **Araç hazır (Faz 6, balance-tester 2026-10-22; denge sim'i KOŞULMADI, yalnızca ≤10 savaşlık işlev denemesi).** Bayraklar ve rapor `docs/arch/sims-and-deploy.md` > Simülatörler > Skill ağacı modu. Sabit komutlar (her biri Ömer onayıyla; `<sp>` = scratchpad):
  - 96 duman: `npx tsx src/sim/cli.ts 96 1 --tree focus --level 15,20,25 --out=<sp>/tree-96.json > <sp>/tree-96.txt`
  - 300 karşılaştırma: `npx tsx src/sim/cli.ts 300 1 --tree focus --level 15,20,25,30 --parts --out=<sp>/tree-300.json > <sp>/tree-300.txt`; sınıf eşitliği aynısı `--side both`; 9.1 paketleri için tek class `--only=warrior` ve satır `--rows=2,1` / kol `--ult=d` ile.
  - 1000 ince: `npx tsx src/sim/cli.ts 1000 1,50001 --tree focus --level 15,20 --out=<sp>/tree-1000.json > <sp>/tree-1000.txt`; sefer `npm run sim:campaign -- 240 1 medium good --tree=a` + bayraksız referans; Endless `npm run sim:endless -- 300 1 --tree=a` + bayraksız referans.
  - Ölçüm sınırı: odaklı build ult kolunu önce doldurur, bu yüzden L15'te a ve b build'i AYNI (yön düğümü L16'da); 9.2a'daki a-b hedefi L20+ ile ölçülür. İlk evolve L28'de (ult 3 puan + sayaç 23), evolve katkısı (`--parts`) L28 altında 0 çıkar.

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
- **Üçüncü tur (Ömer 2026-10-22):** respec bedeli **20 + 5 x level** altın deneme olarak onaylandı (open-questions 379.1); Archer Piercing Arrow satırı = **öneri D (Bodkin Point, `alts.js`)**, `data/skill-trees/archer.json` yazıldı (içe aktarma aracı artık c / d / e öneri satırlarını da okur). Archer'ın yeni NEW düğümü D 2.ea Sunder (yeni durum: zırh -%20, 2 tur) **onay bekliyor** (`approved: false`; testte tek istisna).
- **Dördüncü tur (Ömer 2026-10-22):**
  - **Archer 2.ea Sunder onaylandı** ("onaylıyorum"): `data/skill-trees/archer.json` içinde `approved: true` (içe aktarma aracı var olan onayı korur); testteki bekleyen listesi artık boş, onay bekleyen NEW düğüm kalmadı (fx sonraki faz).
  - **Gambler 3.n0 Trump Card → Crippling Ace** (seçim sayfası A seçeneği): "Card Trick always deals Stun to a Slowed target."; sinerji rozeti High Stakes (Loaded Dice yerine). Sorun: Trump Card'ın Jinx kaynağı seçimde düşmüştü (Loaded Dice A seçildi). Slow'u Gambler kendi verir: High Stakes B Knockout Bet, Swift Suit, Stacked Deck; Long Con Stun'ı uzatır. Yeni mekanik değil (NEW yok), fx null. Mix B + variants V1 düğümü değişti, `gambler.json` yeniden içe aktarıldı.
  - **Anti-Mage 3.fb Ironbound Oath → Cloistered Ward** (ad çakışması Defender 2.fa ile; Ömer "değiştirebilirsin"). Metin ve etki aynı; ad 11 class ağacında ve mockup karma dosyalarında tek. Defender'ın Ironbound Oath'ı aynen kalır. Mix B + variants V4 düğümü değişti, `antimage.json` yeniden içe aktarıldı.
  - **Gear ağaç yerleşimi: C** (`skill-tree-gear.html#v3`, Gear'da üçüncü sekme "Tree"); şart: skill'ler oyundaki tam skill plakası biçimiyle (bölüm 6, Faz 3b).
- **Beşinci tur (Ömer 2026-10-22, fx soruları; seçim sayfası https://claude.ai/artifact/DCzmb37ifbYJUy3C9c45tv; sorular `skill-tree-fx-catalog.md` bölüm 14).** Aşağıda yazılmayanlarda katalog önerisi kabul:
  1. Ad çakışmaları: ikinciler yeniden adlandırıldı (content-designer seçti): Archer 1.f1 Hamstring → **Hock Shot**; Hexer 0.v Herald of Ruin → **Passing Bell**; Undead 4.d2 Gravedigger → **Empty Grave**; Paladin 1.eb Shockwave → **Holy Burst**; Druid 4.u2 Heavy Landing → **Oakfall**; Undead 3.ma Life for Life → **Blood Ransom**; Mage 4.l1 Dead Center → **Crater's Heart**; Cutthroat bar20 Trophy → **Notched Blade**; Gambler bar20 Momentum → **Winning Run**; Hexer 2.fb Gnawing Rot → **Swift Blight**; Gambler 2.r Twist the Knife → **Let It Ride**. Metin/etki aynı; mix + variants düzeltildi, JSON yeniden içe aktarıldı.
  2. Aura "on you" ayrımı Faz 2'ye (öneri).
  3. Paladin "weakest enemy" = kalan canı (sayı olarak) **en az** olan düşman (öneriden farklı); 0.n0 "no ally is wounded" = canı eksik dost yok.
  4. Burning: tüm kaynaklarda **tek ortak** tur başı hasar, `data/` içinde tek yer. Önerilen değer **INT × 0,12 / tur, 2 tur** (sim ayarlayacak).
  5. Lingering Hail %25 = DEX ölçeği. 6. Falloff = düz ek. 7. Durum büyüklüğü = uygulanan duruma büyüklük alanı (a). 8. "A → B" = `base`.
  9. Fresh Host = konakta en az 1 geçmiş Omen. 10. Hasarsız düğümlerde isabet zarı kalır. 11. Swift Suit = mutlak olasılık. 12. Jack of Clubs = yalnız debuff.
  13. Mark of Silence = MP bedelli skill'i olan düşman. 14. Ready Blades = tam ikinci vuruş. 15. Prying Blade = seed'li rastgele buff. 16. Süresiz = `permanent` bayrağı.
  17. Druid bar15 Tight Weave: metin değişti (Root Field'a bağlı değil, var olan etki): "Nature's Wrath deals +5% damage."
  18. Thicket Wave = Stun. 19. Heart of the Wild = `nature` element süzgeci. 20. Still Hands = o tur. 21. Shadow Return Fleet 2 tur. 22. Jinxed 2 tur. 23. Blood Oath Guard bağla biter. 24. Black Spittle = Undead'in kendi skill vuruşları.
  25. Mage Lost in the Snow = **herhangi bir** Blind (öneriden farklı).
  26. Soul Exchange: MP yetmeyince kendiliğinden candan öder (oyuncu seçimi yok, arayüz gerekmez).
  27. Focused Beam ve Stacked Deck: önce **mockup**; bu iki düğümün fx'i mockup seçiminden sonra.
  28. Coin Toss Life = +0,20. 29. Hexer Doom Leaks = Doom Mark'ın öldürmesi **de** sayılır (öneriden farklı). 30. "beside" = `sideNeighbors`, "next to" = 4 yön. 31. Martyr Rising = yalnız cooldown. 32. Bloody Saltire Wound 2 tur.
- **Altıncı tur (Ömer 2026-10-22, ikinci fx soru sayfası; engine-dev uyguladı, testler `tests/skill-tree-fx6.test.ts`):**
  1. **"A → B" kuralı kalır** (Penny Ante, Called Game, Siphon Vein, Feeble Jinx): B yeni taban (`base` / statusPotency düz eki), öteki düğümler üstüne eklenir; uç değerler sim'de görülecek. Dört düğümün fx'i zaten bu kuralla yazılıydı (test: aynı alana ek yapan düğüm B'nin üstüne biner).
  2. **Yeni durum Weakened onaylandı:** verdiği hasar azalır, gücü düğüme göre. `data/statuses.json > weakened` (`damageDealtMult` 0,85 = kaynaksız / debug varsayılanı, `magicDealtMult` yalnız büyü hasarı, `tickAtTurnEnd`: 1 tur = sıradaki turunun tamamı; ikon yer tutucu overextended). Motor: `Battle.weakenedMult` -> `dealtDamageMult` (gerçek vuruş, önizleme, YZ aynı yol). statusPotency alanlarına `damageDealtMult`, `magicDealtMult`, `oneAttack` (> 0: örnek taşıyanın sıradaki hasar skill'inden sonra düşer) eklendi. Wiki > Damage formula listesine "Damage-dealt effects" satırı. Düğümler: Druid 2.f3 Pollen Drift (Nature's Wrath vurduğuna 1 tur, rank başına -%2: potency +0,15 sabit + -0,02 x rank), Gambler 3.eb Distracting Fan (Card Trick vurduğuna 2 tur, -%15, `oneAttack`), Anti-Mage 4.u2 Spell Shatter (Void Strike hedefine 2 tur, yalnız büyü hasarı -%20).
  3. **Druid Gnawing Rot:** ilk tik +%10, ikinci +%20, üçüncü +%30 (yeni ölçek `dotTickNumber`, ilk tik 1).
  4. **Archer Maiming Shot:** Slow ve Blind 1 tur (fx zaten 1); metne "for 1 turn" eklendi (mix + variants, `tree-import`, CRLF korundu).
  5. **Undead 4.r3 Rot Bomb:** Pox Bloom zemini düşünce zeminin içindeki düşmanlarda Withering'in kalan tiklerinin hepsi bir anda vurur (tik miktarı x kalan tur, tikle aynı zırh; hasarı DoT'un sahibi verir), Withering biter. Yeni eylem `detonate: "<DoT durumu>"` + alıcı `placedGround` (bu olayda sahibin tetikle bıraktığı zeminler).
  6. **Druid Living Bomb:** düğüm alınınca Summon Treant bekleme süresi 5 → 3 (`skill self cooldown set 3`).
  7. **Warrior Undying Rage:** 10 Rage yoksa kurtarmaz (cheatDeath kuralında eksi `rage` bedeli ödenebilir olmalı).
  8. **Anti-Mage Spillover:** yalnız Mana Overflow'un taşan MP'si (şimdiki yazım doğrulandı; test: Mana Steal fazlası aktarılmaz).
  9. **Split Ward / Verdant Link (ve Stretched Ward):** ikinci alıcı her zaman hedeften başka bir dost; yoksa ikinci kopya yok (yeni alıcı süzgeci `notTarget`). Verdant Link'te Druid'in kendisi yine sayılmaz (`lowestHpOtherAlly`).
  10. **Paladin 0.fb Fervent Oath yeni metin:** "Anointed Arms' bonus doubles to +30%, but Divine Light heals 25% less." (yeni mekanik yok; 0.fb yalnızca 0.eb Anointed Arms'tan sonra alınabilir). fx: Anointed Arms kancası düşer (`drop 0.eb`), yerine +%30 buff; pasif gücü -%25. **Ömer onayladı (2026-10-22).** Faz 7 denge turunda bu metin tutarlı kalsın diye 0.eb Anointed Arms (+%15) ve 0.fb kırpılmadı.
  11. **Druid Thin Sap:** yenilenme (tur başı şifa) dahil bütün şifa yarıya (`skill hot power pct -0.5` eklendi; Spreading Roots aktarımı da yarı yenilenmeden).
  12. **Cutthroat Carving Arc:** zincirdeki HER kesik isabet edince Wound (2 tur) verir (strike eylemine `cutStatus`). Önceden yalnız ilk kesiğin yanındakine, iskada da veriliyordu.
  13. **Paladin Martyr Rising:** kalkınca Resurrection tam bekleme süresine girer, MP harcanmaz (cheatDeath `ready` skill'i, yalnız turns modunda).
  - **Ömer onayladı ("önerinle git"; yazımlar kalır):** Turned Hand = seed'li rastgele dost, alan saldırısı tek dosta iner; Returning Cards = ikinci zar aynı durumu da verebilir; Coin Toss Life = seferde yaralı girerse %80'in altına inebilir (tavan yok).
  - Kalan null: yalnız mockup bekleyen 5 düğüm (Gambler 3.ea Stacked Deck, 3.ma Double Deal; Paladin 4.d1-d3 Focused Beam satırı).

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

## Faz 2a notları (engine-dev, 2026-10-22)
(b) ve (c/C1, C2) fx türleri motora bağlandı; derleyici + motor + test. Varsayımlar `open-questions.md` madde 383. Veriye yalnızca test için 7 örnek fx yazıldı (metinle birebir): Warrior 2.r Red Arc, 3.f3 War Gallop, 3.n0 Roaring Charge, 3.mb Into the Fire, bar[1] Second Wind; Defender 4.l2 Pain Into Iron, 4.d2 Can Opener. Kalanı Faz 2b (content-designer). `_rules.json > enabled` false kaldı.

**Dosyalar:** `src/engine/tree-hooks.ts` (YENİ, saf: unitFx birleştirme okuyucuları, koşul / ölçek sözlüğü, kanca tipleri, bedel koşulu), `src/engine/battle.ts` (kanca uygulama noktaları + ölçüm), `cost.ts`, `spec.ts`, `preview.ts`, `types.ts`; derleyici `src/progression/skill-tree-compile.ts` (`applyFx`), fx tipleri `skill-tree-data.ts`; test `tests/skill-tree-fx.test.ts`.

**fx biçimleri (veri)**
- `addEffect`: `{ k, effect | byRank[], after? | before?, skill? }`. `replaceEffect`: `{ k, sel, effect | byRank[], skill? }` (seçicinin uyduğu TÜM etkiler değişir). Eklenen / değişen etkinin kopyası `treeNode: '<class>:<düğüm>'` taşır (ölçüm için). `skill` yoksa satırın skill'i.
- `unitFx`: `{ k, fx: { <ItemEffects anahtarı>: değer, … }, rank? }`. Derlenmiş `TreeSetup.fx` + `fxNodes` (anahtar -> düğüm kimlikleri) -> `Combatant.treeFx` / `treeFxNodes`. İki düğüm aynı anahtarı verirse `mergeFxValue`: sayı toplanır (`tierDamageMult` bonus olarak: 1 + Σ(v - 1)), bayrak VEYA, dizi birleşir, nesnede sayılar toplanır (eşik / süre alanlarında ilk değer kalır).
- `hook` `cond` (C1): `{ k:'hook', h:'cond', when?, scale?, sel?, mod, skill?, rank? }`. `mod` anahtarları: hasar için `powerMul` (× (1 + v·ölçek); birden çok kanca çarpılır), `critBonus`, `ignoreDefense`, `lifesteal` (düz ek), `lifestealMul`, `guaranteedCrit`, `maxBonus` (Berserker Rage pasifinin maxBonus'una düz ek); durum için `turns`, `chance`; bedel için `cost` (düz ek, en az 0). Hasar ve durum değişikliği aynı kancada olamaz. `sel`: `damage` (varsayılan) / `damage:N` / `status` (turns / chance varsa varsayılan) / `status:<durum>`. `skill`: yoksa satırın skill'i; `'*'` = her skill; pasif satırı ve bar = her skill.
- `hook` `rage` (C2): `{ k:'hook', h:'rage', on?:'hit'|'cast', gain?, floor?, once?, when?, scale?, rule?:'tallyAll', cost?, after?, skill?, rank? }`. `on: 'hit'` her isabetli hasar vuruşunda (hedef başına), `'cast'` (varsayılan) kullanım sonunda; `floor` = Rage en az bu; `once` = savaşta bir kez; `rule: 'tallyAll'` = skill'in Rage kazancı tüm vurulanların toplamı (perCastCap aynen). `cost` = Rage bedeline ek (Headsman's Blow `spendAll` en az miktarı düşer); `after: '<skill>'` = o skill kullanılınca silahlanır, ilk ödemede harcanır (Into the Fire). Rage'i olmayan class'a `gain` / `floor` / `rule` derleme hatası.
- `rank: true` kancalarda `mod` / `gain` / `cost` değerlerini × rank yapar (`floor` hariç).

**Koşul sözlüğü (`tree-hooks.ts > COND`; `when` nesnesindeki anahtarlar VE'lenir, `not: {…}`, `any: [{…}, …]`):** `targetStatus: '<durum>'`, `targetFullHp`, `targetNotActed` (hedef bu savaşta hiç eylem yapmadı), `targetLastHitMe` (sana skill ile en son vuran düşman), `targetHitMeSinceMyTurn`, `targetArmorAboveMine`, `selfHpBelow: 0-1`, `selfHpAbove: 0-1`, `rageAtLeast: n`, `rageAtMost: n`, `rageSpentAtLeast: n` (bu kullanımda ödenen Rage), `rageSpentLastTurn`, `notMovedLastTurn`, `selfArmorAbove: n`, `incomingArea` (gelen vuruş alan skill'i; savunma kancası fazında kullanılacak).
**Ölçek sözlüğü (`SCALE`; `scale` nesnesinde TEK anahtar, değer çarpan olur):** `targetStatusTurns: '<durum>'`, `targetArmor: n` (her n zırh puanı = 1), `selfArmorOver: { over, per }`, `hitWithStatus: '<durum>'` (bu kullanımın hedeflerinden durumlu canlı sayısı), `alliesInAura`, `alliesHpBelow: 0-1`, `missingHp: 0-1` (eksik canın her bu oranı = 1), `selfRage: n`. Bedel koşulunda (`cost`) yalnızca savaş bağlamı gerektirmeyenler: `SELF_CONDS` (selfHpBelow / Above, rageAtLeast / AtMost) ve `SELF_SCALES` (missingHp, selfRage).

**Uygulama noktaları (önizleme, YZ değeri ve gerçek vuruş aynı yoldan):** `powerMul` / `maxBonus` -> `Battle.dealtDamageMult` (önizleme ve tehdit hesabı etkiyi de geçirir); `critBonus` / `ignoreDefense` / `lifesteal` / `guaranteedCrit` -> vuruşun etki kopyası (`Battle.treeEffect`: `strike` + `preview.ts > addDamage`; kopya orijinal etkiye WeakMap ile bağlı, `damage:N` sırası bozulmaz); `turns` / `chance` -> `cast` içindeki durum uygulama noktası + önizlemenin durum satırı; `cost` -> `SkillCost.cond` (yalnızca birimin yamalı skill kopyasında) -> `cost.ts > skillCostAmount` (canUse, ödeme, YZ, önizleme hepsi bunu kullanır). unitFx okumaları item kanalıyla birlikte `tree-hooks.ts` okuyucularından: `effNum` (toplam), `effMult`, `effFlag` (VEYA), `effList` (kaynak başına; tetikler item ve ağaç için AYRI çalışır, bir kezlik bayrak ağaçta `Combatant.treeOnce`), `effFirst` (tek kaynaklı: `nthSpellFree`, `moveStride`; önce item).

**Ölçüm (`treeProc`):** ağaç etkisi tetiklenince `{ type:'treeProc', uid, node }` yan kanala gider: `battle.onTreeProc(listener)` (dönen fonksiyon aboneliği kaldırır) ve `battle.treeProcs()` (uid + düğüm başına sayı). Olay kaydına (`battle.log`) ve olay akışına GİRMEZ; ağaçsız savaşta hiç çağrılmaz, kayıt / golden aynı. Sayılan anlar: C1 kancası vuruşu ya da durumu değiştirdi (vuruş başına), Rage kancası tetiklendi (Rage değişmese de), bedel koşulu ödemede tuttu / silah harcandı, tallyAll kullanıldı, addEffect / replaceEffect etkisi uygulandı, unitFx tetiği ağaç kaynağından çalıştı (secondWind, shieldRefresh, lastStand, vengeance, retortStatus, openerStatus, executeLifesteal, onHitDot, restBlessing, critStatuses, tierStatus, killRush). Sürekli unitFx'ler (armorPen, mpCostReduce, turnMp gibi) sayılmaz.

**Kolay genişletme yerleri (9 class için):**
- Yeni koşul: `tree-hooks.ts > COND`'a bir satır (`(ctx, arg) => boolean | undefined`); savaş durumu gerekiyorsa `CondHost`'a bir okuyucu + `battle.ts > condHost` getter'ında karşılığı. Bedelde de kullanılacaksa `SELF_CONDS`'a ekle. Derleyici denetimi sözlükten okur, ayrı iş yok.
- Yeni ölçek: `SCALE` (+ gerekiyorsa `SELF_SCALES`).
- Yeni C1 değişikliği: `CondMod` alanı + `battle.ts > addCondMod` + uygulama noktası (`applyEffMods` ya da durum noktası) + derleyicideki `DAMAGE_MODS` / `STATUS_MODS`.
- Yeni addEffect türü: derleyicideki `EFFECT_FIELDS` (zorunlu alanlar); motor zaten tüm SkillEffect türlerini uygular.
- Yeni unitFx anahtarı: `ItemEffects`'e eklenince `UNIT_FX_KEYS` derleme anında eksikliği yakalar; motordaki okuma `effNum` / `effList` ile yazılırsa iki kanal kendiliğinden birleşir.
- C3-C6 kanca aileleri: `TreeHook` birliğine yeni `h`, derleyicide `applyFx > case 'hook'` dalı, motorda uygulama noktası + `treeProc`.

**Bilinen sınırlar (sonraki fazlar):** savunma / aura tarafı koşullar (`incomingArea`, `alliesInAura`) değerlendirilebilir ama aura / alınan hasar uygulama noktası Faz 4/5'te (C4 / C5). Hasarlı skill'deki durum etkisi yalnızca o kullanımda vurulan hedeflere uygulanır: "vurmadan önce Wound" (Gore Wheel + Red Arc aynı kullanımda) bugün ilk vuruşa yetişmez (madde 383/6). Ağaç unitFx değerleri item tavanlarına takılmaz (startCharge hariç; tavan stacking kuralı gereği eklenmedi).

**Katalog eşlemesi (`skill-tree-fx-catalog.md` 12.1 adları -> motor adları):** `targetStatus:<durum>` + `perTurnLeft` -> `when.targetStatus` + `scale.targetStatusTurns`; `noMoveLastTurn` -> `notMovedLastTurn`; `targetHitMeSinceTurn` -> `targetHitMeSinceMyTurn`; `hitCountWithStatus` -> `scale.hitWithStatus`; `alliesBelowHp` -> `scale.alliesHpBelow`; `rageSpent≥N` -> `rageSpentAtLeast`; `selfMissingHp` -> `scale.missingHp`; `selfArmorAbove:40` (ölçek) -> `scale.selfArmorOver { over: 40, per }`. `firstUseOfSkill` bugün yalnızca Rage kancasında `once` olarak var (Roaring Charge); genel "ilk kullanım" koşulu ve katalog 12.1-C'deki 53 yeni anahtar sözlükte YOK (eklenecekler, "Kolay genişletme yerleri").

## Faz 2a+ notları (engine-dev, 2026-10-22)
Faz 2 düğümlerinin (a + a* + b + C1 + C2) hepsi fx olarak yazılabilsin diye motor ve derleyici genişletildi. Veriye fx YAZILMADI, bu content-designer'ın işi. Örnek fx'ler yalnızca testte: `tests/skill-tree-fx2.test.ts` (Gore Wheel, Searing Crit, Mercy Stroke, Sure Thing, Let It Ride). Varsayımlar `open-questions.md` madde 385'te. `_rules.json > enabled` false kaldı.

Ağaçsız savaş birebir aynı: her yeni yol `treeHooks` ya da `treeUnits` ile korunur ve golden'lar değişmedi. Bu bölüm, Faz 2a notlarındaki şu üç satırın yerine geçer: "53 anahtar yok", "Gore Wheel sorunu", "Yeni C1 değişikliği = DAMAGE_MODS".

### Yazım kuralları (fx yazarken önce bunu oku)
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
  - `smite`: sözlükte var ama motorda uygulama noktası YOK (Faz 5).
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
- `targetBeside`: "beside" = aynı sıradaki yan şerit (plan 10a).
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
- `incomingArea`: sözlükte var; savunma uygulama noktası Faz 4/5'te gelecek.

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
- **Dark Bond kopyası:** `bondRatio` (x (1 + v)).
- **Mana Overflow sayacı** (sahibi vurulunca): `blockedMul`. Soaking Robes: `{ "mod": { "blockedMul": 0.04 }, "rank": true }`
- **Bedel:** `cost`, `costMul`.

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
  - Hasar etkisi kalmazsa skill yine isabet zarı atar (`treeHitRoll`, plan 10a). Iskalanan düşmana durum, yakım, Omen ya da dispel işlemez.
  - Aynı düğümde önce `removeEffect`, sonra `addEffect` yazılır.
- **`addEffect` / `replaceEffect` etkisindeki yeni bayraklar:**
  - `preHit: true` (yalnızca durum etkisinde): durum, hedefin bu kullanımdaki ilk isabetinde hasardan ÖNCE işler; aynı vuruşun koşulları onu görür. Gore Wheel: `{ "k": "addEffect", "after": "damage", "effect": { "type": "status", "status": "wound", "turns": 2, "preHit": true } }`
  - `permanent: true`: durum, dot ya da zemin süresiz olur.
  - Dispel için `kinds: ["stun", …]`: yalnızca bu durumları siler.
  - Dispel için `self: true`: kendinden siler. Clean Slate: `{ "type": "dispel", "status": "debuff", "self": true }`
- **Ortak Burning değeri (plan 10a):** TEK yer `data/statuses.json > burning.dot` = `scale: int`, `power: 0.12`, `turns: 2`.
  - `{ "type": "dot", "status": "burning" }` yazmak yeter; eksik alanlar oradan gelir.
  - Bir `status` etkisi ya da `addStatus` Burning verirse miktar yine buradan hesaplanır.

### Uygulama yerleri (kısa)
- **Vuruş (`strike`):** preHit, sureHit, noCrit, critDmgMul, vuruş sonrası kancalar, flatDamage, lifesteal / drain, vuruş sonrası durum kancaları, Mana Overflow çarpanı.
- **Önizleme (`preview.ts > addDamage`):** vuruşla aynı fonksiyonları çağırır: `treeEffect`, `treeMods`, `lateDamage`, `critMultFor`, `treeBet`.
  - Önizleme girdisinde yeni alan `critMult` var (yalnızca ağaçlı aktörde). YZ öldürme ihtimalini bununla hesaplar.
- **`cast`:**
  - Bahis: `treeBet` + `rollBet`.
  - Vuruş bilgisi (sıra / merkez / tekrar), falloff ve Double Hit eki.
  - Durum noktası (`applyTreeStatus`), mana yakma, Omen, dispel.
  - Kullanım sonu: cooldown ve Spell Echo.
  - İzleme: ilk kullanım, son hedefler, seri, MP bedeli.
- **Tur başı:** zemin tiki (`at: ground`), DoT tiki (`at: dot`), Divine Light (`at: passiveHeal`). Süresiz durum ve zeminin süresi azalmaz.
- **Diğer:** `triggerDoom` (`at: doom`), `bondEcho` (bağ).
- **`treeProc`:** her yeni noktada, kanca tutup etkisi olduğunda sayılır.

### Katalog adı -> motor adı (12.1 + D)
Burada olmayan 12.1 adları motorda aynıdır.

**Koşullar ve ölçekler**
- `targetMp=0` -> `targetMpZero`
- `targetStatusStacks:omen=N` -> `targetStatusStacks: { status, eq }`
- `groundAge≥N` -> `groundAgeAtLeast`
- `centerHitIndex=N` -> `centerHitIndex: N`
- `healedCountBelow:x ≥ N` -> `healedCountBelow: { below, atLeast }`
- `hitCount`: koşulda (≥N) `hitCountAtLeast`, ölçekte `scale.hitCount`
- `repeatIndex`: koşulda `repeatIndexAtLeast`, ölçekte `scale.repeatIndex`
- `targetDistance`: koşulda (≥N) `when.targetDistance`, ölçekte `scale.targetDistance`
- `hpPaidAmount` -> `scale.hpPaidAmount: <can başına>`
- `selfHasShield:<skill>` aynen kalır.

**Değişiklikler**
- `statusTurns` -> `turns`
- `lifestealAdd` -> `lifesteal`
- `costDelta` -> `cost`
- `drainMul` (Vampiric Bite) -> `drainMul` / `drainAdd`
- Hedef başına `falloff` -> `falloffAdd`
- Spell Echo `chance` -> `echoChance`
- soulDrain `ratio` -> `drainAdd`
- bond `ratio` -> `bondRatio`
- Mana Overflow sayaç çarpanı -> `blockedMul`
- Opportunist `bonus` ve koşul listesi -> `passiveBonus` / `opportunist` / `opportunistAlt`

### Hâlâ yazılamayan düğüm türleri
- `thrown` (Backstab'ın arkası kapalı atışı; Cu 4.l1, 4.l2): C5, Faz 5.
- `smite` noktası (P 1.fa ve benzerleri): motorda uygulama noktası yok (Faz 5).
- Hedefe bağlı bedel (Not Yet gibi "bu hedefe bedava"): bedel hesabı savaş bağlamını görmez.
- Toplu durum kuralları (Mass Hush gibi alan susturma) ve Black Mold'un pasif durum silmesi: yeni kural gerekir (Faz 4/5 ya da soru).
- C3 tetikleri, C4 auralar, C5 savunma / alınan hasar, C6, yeni durum / zemin ve çağrıya geçen yamalar: kapsam dışı (plan fazları).

## Faz 2c notları (engine-dev, 2026-10-22)
Faz 2'de motor boşluğu yüzünden `null` kalan düğümler için motor / derleyici tamamlandı, fx'ler veriye yazıldı (11 sınıf, 44 düğüm / bar bonusu). Test: `tests/skill-tree-fx2c.test.ts`. Ağaçsız savaş birebir aynı (yeni yolların hepsi `treeHooks` / `treeUnits` / ağaç alanı korumalı; ağaçsız golden'lar yeşil).

### Yeni yazım araçları
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

### Yeni durumlar (`data/statuses.json`)
- **Exposed** (debuff): alınan hasar +%15. Warrior Glass Cyclone / Martyr's Rush kendine 1 tur. İkon yer tutucu (overextended).
- **Sunder** (debuff): zırh -%20 (`armorMult 0.8`, yeni durum alanı). Archer Sunder (Piercing Arrow, 2 tur); Shattered Line Sundered hedefte Aimed Shot'a `ignoreDefense 1`. İkon yer tutucu (guardian).

### Hâlâ `null` (kapsam dışı)
- Archer 2.fa Brittle Point (C5: "2. düşmandan sonra durur").
- Verilen hasarı azaltan durum: Druid Pollen Drift, Gambler Distracting Fan, Anti-Mage Spell Shatter.
- Çağrı aktarımı (Treant / Skeleton satırları), C3-C6, yeni zeminler, Paladin Focused Beam, Gambler Stacked Deck.
- Dokunulmayanlar: "A → B" birikimi (Penny Ante, Called Game, Siphon Vein, Feeble Jinx), Druid Gnawing Rot ilk tik, Archer Maiming Shot süreleri, Gambler 3.n0 Crippling Ace, Eye of Ruin dışındaki Hexer işleri.
- Varsayımlar: `open-questions.md` madde 388.

## Faz 4a notları (engine-dev, 2026-10-22)
C3 tetik (olay → eylem) ve C4 şifa / kalkan / alınan hasar kancaları motora ve derleyiciye eklendi. Kelime dağarcığı C3'ün 142 ve C4'ün 40 satırının çoğunu yazabiliyor; yazılamayanlar aşağıda listeli. Örnek olarak 11 sınıfta 41 düğüme / bar bonusuna fx yazıldı. Test: `tests/skill-tree-fx4a.test.ts`.

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
  - Tetikler YZ değerine girmez (plan 4.1).
  - Tetiğin verdiği buff (`TreeBuff`) önizleme, YZ ve gerçek vuruşta aynı yoldan (sanal C1 kancası) okunur, yani önizleme sayısı doğrudur.
  - C4 çarpanları (`treeTakenMult`, `treeHealMult`, `treeShieldMult`) önizlemede de kullanılır. İstisnalar: `bigHit` önizlemede görünmez; `overheal` dönüşümü önizlemede gösterilmez.
- **Durum süzgeci:** statuses.json durumları + motorun özel kodlu durumları (`taunt`, `guard`, `regen`). Özel kodlu durumlar yalnızca süzgeç olarak kullanılabilir, eylemle verilemez.

### Olaylar (`on`)
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

### Tabanlar (`of`)
- `maxHp`: alıcının maks canı. `ownerMaxHp`: sahibin. `targetMaxHp`: olay hedefinin.
- `currentHp`: alıcının mevcut canı. `ownerCurrentHp`: sahibin.
- `armor`: alıcının görünen zırhı (aura dahil). `ownerArmor`: sahibin.
- `amount`: olay miktarı.
- `hpPaid`: bu kullanımda ödenen can.
- `stake`: bahis.
- `prevented`: Wound'un kestiği şifa.

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

### Katalog adı → motor adı
| Katalog | Motor |
|---|---|
| `onKill`, `onKill(Doom)` | `kill` (+`via doom`) |
| `hpThresholdFirst(self / ally / bonded / ally in aura, x)` | `hpBelow` + `below x` + `who` self / ally / bonded / aura |
| `mpBelowFirst(x)` | `mpBelow` + `below x` |
| `statusGained(s)` / `statusApplied(s)` | `statusGained` / `statusApplied` + `status s` |
| `statusEnd(s)`, `statusEnd(s, kaynak ben)`, `(kırılmadan / kırıldı)` | `statusEnd` + `status s` (+`mine`) (+`end expired / broken`) |
| `enemyDied(status s / onGround g)` | `enemyDied` + `status s` (+`mine`) / `ground g` |
| `onEcho` / `onEchoFail` | `echo` / `echoFail` |
| `onJackpot` / `onBust` / `onLuckyEscape` | `jackpot` / `bust` (+`resource`) / `luckyEscape` |
| `onManaOverflow` | `manaOverflow` |
| `onDodge` / `enemyMissed` | `dodge` / `enemyMissed` |
| `onShieldAbsorb` / `onShieldBreak` | `shieldAbsorb` / `shieldBreak` |
| `onDoom` / `onRepeat` / `onCrit` / `onHit` / `onHitTaken` | `doom` / `repeat` / `crit` / `hit` / `hitTaken` |
| `afterSkillUse`, `everyNthUse n`, `firstUseOfSkill` | `skillUse` (+`every n`) (+`when firstUseOfSkill`) |
| `passiveHeal` / `dotTick` / `onSkipTurn` | `passiveHeal` / `dotTick` / `skip` |
| `enemyMovedNear(≤n)` / `enemyGainedBuff` / `enemyHealed` | `enemyMoved` + `near n` / `enemyBuffed` / `enemyHealed` |
| `onPayHp` / `onDispel` / `targetMpEmptied` / `allyHitTarget` | `payHp` / `dispel` / `mpEmptied` / `allyHit` |
| `turnSooner x` / `nextSkillBuff {...}` | eylem `sooner x` / eylem `buff {...}` |
| "savaş boyu birikir" | `buff` + `uses: 0` + `stack: true` (sıfırlayan olay: `clear`) |
| `freeCast`, `delayedStrike`, `groundEnd`, `summonDeath`, `summonArrive`, `passiveTrigger` | YOK (aşağıda) |

### Yazılan örnek düğümler (41)
- **Warrior:** bar20 Stubborn Heart, bar25 Stagger Step, 0.n0 Iron Retort, 0.r Hardened, 0.f2 Grit, 0.ea Measured Mending, 0.eb Stand Firm, 0.ma Red Line, 2.f2 Spin Recovery, 2.ma Blood Glut, 4.u3 Grave Robber, 4.l3 Terror.
- **Defender:** 2.f2 Second Breath, 2.f3 Thick Skull, 2.n0 Cover Them, 2.ma Weathered the Storm, 2.mb Refused to Fall, 3.f3 Linked Plates, 4.l3 Forge Again.
- **Mage:** bar10 Resonant Kill, bar15 Low Tide, bar20 Momentum, 0.f3 Rapid Recall, 0.eb Sympathy, 1.ma Hot Streak, 3.n0 Ice Mirror.
- **Gambler:** bar10 On a Roll, bar15 Blood Debt, bar25 Death Shrug.
- **Hexer:** 3.f3 Hex Ward, 3.ma Woeful Turn.
- **Druid:** 3.f3 Soft Hands, 3.n0 Overflowing Cup, 3.eb Emergency Bloom.
- **Paladin:** 4.r2 Reaping Dawn.
- **Archer:** 4.r1 Trophy, 4.r3 Next in Line.
- **Anti-Mage:** 0.f3 Overflow Spill.
- **Cutthroat:** bar10 Light Step, bar25 Reaper's Due.
- **Undead:** bar10 Red Reserve.

Öbür C3 / C4 satırları (aşağıdaki liste hariç) bu sözlükle yazılabilir. fx'leri sonraki adımda yazılır; bazıları sayı ister (aşağıda ve madde 389'da).

### Hâlâ yazılamayan C3 / C4 düğümleri
- **Bedava kullanım (`freeCast`: tetikle skill kullanımı):**
  - Archer 0.mb Range Keeper
  - Mage 1.mb Rolling Doom
  - Mage 3.v Shatter Aegis
  - Gambler 0.v Run It Back
  - Paladin 0.ma Chain of Light (ek smite)
- **Gecikmeli vuruş (`delayedStrike`):** Mage 4.d3 Twin Meteors, Druid 2.v Thicket Wave.
- **Zemin doğurma / zemin bitişi** (`groundEnd` olayı yok; yeni zemin kapsam dışı): Paladin 3.ea Undying Flame, 3.mb Wildfire Verdict, 3.v Day of Judgment.
- **Çağrı olayları ve çağrıya ağaç etkisi** (kapsam dışı):
  - Druid 4.d1 Splinter Burst, 4.d2 Brittle Bark, 4.l1 Shieldbark, 4.l2 Thornbark
  - Undead 4.r1 Pox Bloom, 4.r3 Rot Bomb
- **Alan hedefi (C5):** Paladin 1.mb Hammerfall Quake (ölenin sırası).
- **Durum / Doom aktarımı:**
  - Hexer 0.v Herald of Ruin (Omen kadar Doom)
  - Hexer 4.u1 / u2 / u3 Leaping Mark ailesi
  - Druid 0.ea Creeping Blight (kalan turla geçiş)
- **Hasar defteri:** Druid 0.mb Rot to the Core.
- **Tur bedeli eki (`turnCost`):** Mage 0.mb Time Fold.
- **Savaş içinde pasif yaması:** Undead 0.v Crimson Tide.
- **Yeni durum:** Paladin 2.r Iron Return.
- **Aura zırh miktarı tabanı:** Defender 0.v Fortress Aura.
- **Çarpımsal yankı şansı:** Mage 0.ma Endless Refrain (yalnızca toplamalı `echoChance` var).
- **Emişi iki katına çıkarıp aktarma:** Undead 3.n0 Lifeline.
- **"Dostu doldurursa" koşulu:** Anti-Mage 0.ma Brimming Ally.
- **"Sonraki turundan önce dost eliyle ölürse":** Anti-Mage 4.r3 Feeding Frenzy.
- **Guard'ı eylemle verme** (Guard özel kodlu): Anti-Mage 0.mb Spell Sink.
- **"İlk şifa kadar" tabanı:** Druid 3.mb Lifebloom.
- **Yalnızca pasif şifa süzgeci:** Paladin 0.f3 Bedside Watch. `healDealt` pasif şifayı öbür şifalardan ayıramıyor.
- **Hasar eyleminde kritik / pasif:**
  - Cutthroat 0.mb Turned Blade: kesin kritik kısmı yok, Blind kısmı var.
  - Cutthroat 0.eb Counter Cut: "pasif uygulanır" kısmı yok.
- **Doom hasar miktarı:** Hexer 0.fa Overcharged Doom'un geri tepmesi (`doom` olay miktarı Omen sayısı).
- **MP eyleminde taban:** Gambler 4.r2 Clean Sweep (MP = bahis; `mp` eyleminin `of` alanı yok).
- **Öldürme hasar miktarı:** Gambler 4.r3 Domino (`kill` olayında hasar yok).
- **Durum kaynağı skill süzgeci:**
  - Warrior 3.v Herald of Ruin (Charge'ın Stun'u)
  - yaklaşık yazılabilenler: Mage 2.mb Lost in the Snow (Blizzard'ın Blind'ı), Hexer 2.mb Returning Curse, Undead 0.mb Stolen Remedy (senin Wound'un)
- **Kısmen:**
  - Gambler 1.f3 Rolling Dice: "tekrar olmayınca sıfır" olayı yok.
  - Anti-Mage 4.d3 Overflow Strike: "hemen tetiklenir"; `charge` sayaca ekler, anında tetiklemez.

### Kapsam dışı bırakılanlar
- C5 / C6.
- Verilen hasarı azaltan durum.
- Penny Ante / Called Game / Siphon Vein / Feeble Jinx, Gnawing Rot, Maiming Shot, Focused Beam, Stacked Deck.
- `_rules.json` `enabled=false` kaldı.
- Varsayımlar: `open-questions.md` madde 389.

## Faz 4c notları (engine-dev 2026-10-22)

Faz 4b'de null kalan düğümlerin motor / derleyici parçaları. Ağaçsız savaş birebir aynı (tüm yeni noktalar `treeUnits` / `trigOn` arkasında; zar sırası değişmez). Testler `tests/skill-tree-fx4c.test.ts`. Varsayımlar `open-questions.md` madde 393.

### Bedava ve gecikmeli kullanım (`cast` eylemi)
- `{ "cast": "<sınıf skill'i> | event", "power"?, "crit"?, "mod"?, "delay"?: 1, "noChain"?: true, "to"? }`: bedel / cooldown / tur harcamadan kullanım. `event` = olayın skill'i (Run It Back). Güç ve kesin kritik kullanım süresince geçici `treeBuff` (`<düğüm>#free`); `mod` C1 değişikliği (damage / status / proc / cast grupları; Thicket Wave'in Stun'ı `addStatus`).
- Kuyruk: olay bitince sırayla çalışır (`queueFree` -> `flushFree`), zincir koruması: bedava kullanım bedava kullanım doğurmaz (`noChain`) ve tek eylemde en çok 8. Hedef ölmüş / geçersizse YZ'nin hedef yolu yeni hedef seçer, o da yoksa atlanır.
- `delay: 1`: sahibin sonraki tur başında, ilk kullanımın aynı merkez hücresine / tahtasına (Twin Meteors, Thicket Wave).
- Yazılan: Range Keeper, Rolling Doom, Shatter Aegis, Run It Back, Twin Meteors, Thicket Wave. **Chain of Light yazılmadı:** Smite'ın "zincir" noktası motorda yok.

### Zeminler
- Yeni zeminler (`data/grounds.json`): quaking_ground, field_of_shafts, root_field, storm, hall_of_silence, lingering_rain. Renk yer tutucu (`color`), çizim yoksa çökmez.
- Zemin etkisi alanları: `statuses` (tur başı durumları, derleyici `k: "groundStatus"`), `manaBurnPct`, `noDamage` (güç 0), `stackMult` (aynı zemin üstüne atılınca o hücrelerde çarpan; eski zemin o hücreleri bırakır), `centerMult` (merkez hücre çarpanı), `permanent`, hücre başı güç `cellMult`. Seçici `ground:<id>` ile yamalanır.
- Örtüşme kuralı: aynı hücrede aynı tür iki zemin varsa yalnızca en güçlüsü işler (`groundOutranked`).
- Tetik: `groundEnd` (sahip = zemini bırakan, alıcı `inGround`), `enemyDied` süzgeci `ground`; eylem `{ "ground": "<id>", "of": "ground", "power", "turns" | "permanent", "to" }`.
- Yazılan: Aftershock Ground, Endless Tremor, Sinking Earth, Spent Arrows, Lingering Hail, Killing Field, Choking Rain, Endless Hail, Sky Full of Shafts, Root Field, Hushing Moss, Overgrown Field, Mire, Eternal Winter, Hall of Silence, Molten Core, Undying Flame, Fire on Fire, Wildfire Verdict, Day of Judgment. **Arrow Storm (archer 3.v) yazılmadı:** alan şekli (`area`) yamalanamıyor.

### Çağrı aktarımı (`summon`)
- Her fx `"summon": "treant" | "skeleton"` taşıyabilir: fx çağrının kendi derlemesine gider (`TreeSetup.summons[<id>]`); skill'ler çağrının skill'leri (root_smash, vine_snare / skeleton_strike, skeleton_slash), satır skill'i yok. İzinli türler: skill, addEffect, stat (hpMult, `armorAdd` yalnızca çağrıda), hook (cond / trigger / heal).
- Ceset tüketen çağrı (Raise Dead) iki kopya derler: `skeleton` ve `skeleton#fed`; `"fed": true` fx yalnızca beslenmiş kopyaya gider.
- Motor: çağrı doğarken çağıranın `treeSummons`'ından yamalı skill'ler + kancalar takılır (tetik / şifa listelerine eklenir), maks can / zırh `summonDefFor`'da doğrudan stat üstünde (önizleme de görür).
- Olaylar: `arrive` (dinleyen çağrının kendisi, hedef = çağrı), `summonDeath` (öldü ya da süresi doldu; dinleyen çağıran, süzgeç `unit`, alıcı `lastHit` = çağrının son vurduğu düşman, `nearestEnemies` çağrıya göre).
- Yazılan: Druid 4.r1, 4.r2, 4.d1, 4.d2, 4.l1, 4.l2, bar25 Barkskin; Undead 4.u1, 4.u2, 4.u3, 4.r1 Pox Bloom, 4.d1, 4.d3, 4.l1, 4.l2.
- Yazılmayan: Druid 4.u1-u3 (iniş hasarı: alan + "önündeki düşman" noktası yok), 4.r3 Wrathful Oak (çağrıya tur başına 2 eylem yok), 4.d3 Living Bomb (çağrı dururken yeniden çağırma kuralı), 4.l3 Guardian Oak (çağrının dostu koruması); Undead 4.r2 Spore Cloud (zemin eyleminin hücre genişletmesi yok), 4.r3 Rot Bomb (madde 393), 4.d2 Empty Grave (cesetsiz beslenmiş çağrı kuralı). Bu turun kapsamı dışındaydılar.

### Durum / Doom aktarımı
- Eylemler: `spread` (durumu kalan süresiyle aktarır), `doom: <çarpan>, of: stacks | amount` (Doom büyüklüğü: Omen x çarpan), `mark` (`until: turn | hit`), `guard` (0..1], `overflow`.
- Olay alanları: `kill` `via: leap` (sıçrayan Doom), `amount` (Doom büyüklüğü), `dealt` (öldüren vuruşun hasarı); `statusEnd` `amount` = durumun verdiği toplam hasar, süzgeç `fromSkill`; `enemyDied` süzgeçleri `marked`, `by`.
- Derleyici birleşim süzgeçleri: `onlyWith: [düğümler]` (hepsi alındıysa) ve `unless: [düğümler]` (biri alındıysa uygulanmaz). Counter Cut ailesi ve Leaping Mark ailesi bununla tek kanca olur.
- Yazılan: Passing Bell, Leaping Mark, Hungry Leap, Unending Mark, Creeping Blight, Herald of Ruin, Overcharged Doom.

### Tek tek boşluklar
- Rot to the Core, Time Fold, Endless Refrain, Crimson Tide, Fortress Aura, Lifeline, Brimming Ally (`allyFilled`), Spell Sink (`guard`), Feeding Frenzy (`mark` + `enemyDied marked by ally`), Overflow Strike (`overflow`), Lifebloom (`firstHeal`), Bedside Watch (`at: passiveHeal`), Counter Cut + Reckless Grace + Turned Blade, Rolling Dice (`repeatFail`), Clean Sweep (`of stake`), Domino (`of dealt`), Stolen Remedy (`enemyHealed` + `of prevented`), Exposed Perch (`extraRows` + `heal damageTaken incomingRanged`), Second Ward (`of shieldSize` = kırılan kalkanın ilk boyu), Iron Return (`mark until hit` + `heal damageTaken marked`; yeni durum YOK).

### Hata düzeltmeleri
- `of: "hpPaid"` bedel tetiğinde (payHp) 0 dönüyordu: olay miktarına düşer. Blood Hymn ve Bitter Gift buna geçti.
- Bastion Cry: gerçek Fortified durumu (`permanent`, kaynağı düğüm); Taunt bitince `removeStatus fortify node` yalnızca düğümün verdiğini kaldırır, Weathered the Storm'un Fortified'ı kalır; simge görünür.
- Frozen Rebuke: koşul `before` (vuruştan önceki hedef durumları).
- Plague Curse: alıcı `adjacentEnemy` (konağın yanındaki düşman).

## Faz 5a notları (engine-dev 2026-10-22)

C5 (hedef / alan / aura) ve C6 (kural) kanca aileleri motor + derleyicide. Katalog 12.4 / 12.5'teki 135 düğümün (C5 103, C6 32) 125'i yazılabilir: 70'inin fx'i veride (örnekler + 4c'den kalan çağrı düğümleri), 55'inin fx'i aşağıdaki eşleme listesinde (derleyiciden geçti, veriye yazılmadı), 10'u yazılamıyor ya da kapsam dışı. Ağaçsız savaş birebir aynı: her yeni yol ağaçlı birim / ağaç kancası / `treeArmorOn` bayrağıyla kapılı. Önizleme, yapay zeka ve gerçek kullanım aynı yamalı skill tanımını okur (`battle.skill(id, uid)`, `areaCells(..., uid)`); her kural / hedef işleyişi `treeProc` çağırır.

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

### Katalog adı -> motor adı
| Katalog (12.4 / 12.5) | Motor |
|---|---|
| Alan şekli / alt alan değişimi | target `area` (arm, also, rows/cols, maxTargets, hitsAtCenter, hitsEach), `groundWide` |
| Aura / Guard ilişkisi | target `aura`, `guard`; stat `armorMult` |
| Ek hedef seçimi | tetik alıcıları (lowestHpEnemy, weakestEnemy, lowestMpAlly, randomInCast, outsideArea ...) |
| Ek vuruş / sıçrama / zincir | eylem `strike` (+ `chain`, `pierce`), `perCast`, COND centerCritsAtLeast, `splash` |
| Hedef türü / kapsam değişimi | target `target` + `count`, `open: thrown` |
| Hedef önceliği | target `priority` |
| Konum değiştirme | pull `stepForward` + `areaBack` |
| Yeni / değişen zemin | addEffect ground, ground `wide`, `groundWide` |
| Çağrı inişi / çağrı alanı | `arrive` tetiği + `enemyFront` / `facing` / `summoner` |
| Bedel / bahis / Rest kuralı | rule `rest`, skill cost yamaları |
| Buff çalma | eylem `steal` |
| CC kısaltma / bağışıklık / debuff bağışıklığı | rule `shorten`, `immune`, `ward` |
| Durumu tüketip patlatma | cond mod `removeStatus` + `powerMul` (Exsanguinate) |
| Hasar azaltıcı durum + kalkanı yok sayma | rule `pierce` |
| Lucky Escape şansı | rule `luck` |
| MP taşması / pasif kapsamı | target `overflow` |
| Move / Taunt kilidi | rule `noMove`, `noTaunt` |
| Zar zinciri | rule `repeatChain` |
| Çağrı: turda iki eylem / yeniden çağırma | rule `actions`, `resummon` |
| Ölümcül vuruşu üstlenme / paylaştırma | rule `intercept`, `split`, `guardBehind` |
| Ölümden dönme | rule `cheatDeath` |
| İkinci kullanım biçimi / oyuncu seçimi | yazılmadı (aşağıda) |

### Veride yazılan örnekler
- C5: Mage 2.fb, 4.d1, 4.u3; Hexer 2.ea, 2.fa, 4.r1, 4.r2, 4.r3; Anti-Mage 0.ea, 2.eb, 2.mb; Cutthroat 2.eb, 2.ma, 2.v, 4.l1-l3; Paladin 0.ea, 0.v, 1.eb, 3.eb; Defender 0.eb, 0.f2, 0.fb, 3.n0, 3.f1, 4.d1, 4.u1; Druid 0.f2, 1.v, 2.eb, 3.ea; Undead 1.v; Gambler 1.ma.
- C6: Warrior 0.mb, 0.fb, 4.d3; Defender 1.v, 3.ma, 3.v; Undead 3.ma; Archer 2.mb; Hexer 4.l3; Anti-Mage 0.eb, 4.l3; Gambler 1.n0, 1.fb.
- Çağrı (4c kalanları): Druid 4.u1-u3, 4.r3, 4.l3, 4.d3; Undead 4.r2, 4.d2.
- Testler: `tests/skill-tree-fx5a.test.ts` (36 test).

### Veriye yazılmayan, derleyiciden geçen eşleme (55 düğüm)
Her satır o düğümün tam fx'idir. **Faz 5b'de veriye yazıldı** (Cloistered Ward ve Brittle Point düzeltilerek; aşağıda Faz 5b notları).
- Warrior 1.fb Third Cut: `[{"k":"hook","h":"trigger","on":"skillUse","when":{"targetStatus":"wound"},"do":[{"strike":1,"to":"target"}]},{"k":"hook","h":"cond","when":{"targetStatus":"wound"},"mod":{"noCrit":true}}]`
- Warrior 4.l1 Dreadful Swing: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"status":"jinxed","turns":2,"to":"target"},{"status":"jinxed","turns":2,"to":"beside"}]}]`
- Warrior 4.l2 Blinding Spray: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"status":"blinded","turns":2,"to":"target"},{"status":"blinded","turns":2,"to":"beside"}]}]`
- Warrior 2.v Exsanguinate: `[{"k":"hook","h":"cond","when":{"targetStatus":"wound"},"mod":{"powerMul":0.4,"lifestealMul":1,"removeStatus":"wound"}}]`
- Warrior 0.v Undying Rage: `[{"k":"hook","h":"rule","rule":"cheatDeath","below":0.25,"notCrit":true,"hp":1,"rage":-10}]`
- Defender 1.n0 Rolling Quake: `[{"k":"hook","h":"trigger","on":"hit","do":[{"strike":0.5,"to":"behind"}]}]`
- Defender 4.u3 Settle the Score: `[{"k":"hook","h":"target","priority":"hurtMe"},{"k":"hook","h":"trigger","on":"skillUse","do":[{"strike":1,"to":"mostHurtMe"}]}]`
- Defender 0.ma Unyielding: `[{"k":"hook","h":"rule","rule":"immune","statuses":["stun"],"pull":true,"when":{"stillStreakAtLeast":4}}]`
- Defender 3.fa Chained to Them: `[{"k":"skill","sel":"guard","f":"share","op":"set","v":0.8},{"k":"hook","h":"rule","rule":"noMove","while":"guarding"},{"k":"hook","h":"rule","rule":"noTaunt","while":"guarding"}]`
- Paladin 1.ma Hammer Rhythm: `[{"k":"hook","h":"trigger","on":"skillUse","when":{"skillStreakOf":{"skill":"holy_strike","atLeast":2}},"do":[{"strike":1,"to":"target"}]}]`
- Paladin 1.v Hammer of the Heavens: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"strike":0.6,"to":"lowestHpEnemy"}]}]`
- Paladin 3.fb Scattered Flame: `[{"k":"hook","h":"target","area":{"also":"row"}},{"k":"skill","sel":"ground:holy_fire","f":"power","op":"pct","v":-0.3}]`
- Paladin 0.f1 Wrathful Glow: `[{"k":"hook","h":"target","smite":{"power":0.04},"rank":true}]`
- Paladin 0.n0 No Rest for Evil: `[{"k":"hook","h":"target","smite":{"idle":0.3}}]`
- Paladin 0.fa Vengeful Light: `[{"k":"hook","h":"target","smite":{"mul":2}},{"k":"passive","f":"power","op":"pct","v":-0.4}]`
- Paladin 2.v Martyr Rising: `[{"k":"hook","h":"rule","rule":"cheatDeath","once":true,"hpRatio":0.4,"ready":"resurrection"}]`
- Archer 4.d3 Lightning Draw: `[{"k":"hook","h":"trigger","on":"skillUse","when":{"fasterThanTarget":true},"do":[{"strike":0.5,"to":"target"}]}]`
- Archer 2.fa Brittle Point: `[{"k":"hook","h":"target","area":{"maxTargets":2}},{"k":"addEffect","after":"damage","drop":"2.ea","effect":{"type":"status","status":"sunder","turns":2,"potency":0.4}}]`
- Archer 3.v Arrow Storm: `[{"k":"hook","h":"target","area":{"rows":4}},{"k":"addEffect","effect":{"type":"ground","ground":"lingering_rain","turns":2,"scale":"dex","power":0.3}}]`
- Mage 1.v Sunfire: `[{"k":"skill","sel":"damage","f":"power","op":"pct","v":0.4},{"k":"hook","h":"trigger","on":"crit","do":[{"strike":1,"to":"beside"}]}]`
- Mage 2.n0 Hard Frost: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"status":"slow","turns":1,"to":"castFront"}]}]`
- Mage 3.mb Twin Ward: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"cast":"event","power":0.5,"to":"lowestHpAlly","noChain":true}]}]`
- Mage 4.d2 Ember Hail: `[{"k":"hook","h":"trigger","on":"skillUse","drop":"4.d1","do":[{"damage":0.3,"stat":"int","damageType":"magic","element":"fire","to":"outsideArea","count":3},{"status":"burning","turns":2,"to":"outsideArea","count":3}]}]`
- Druid 1.ea Forked Thorn: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"strike":0.6,"to":"adjacentEnemy"},{"status":"wound","turns":2,"to":"adjacentEnemy"}]}]`
- Druid 1.ma Thorn Volley: `[{"k":"hook","h":"trigger","on":"crit","do":[{"strike":0.6,"to":"outsideArea","count":1}]}]`
- Druid 2.fb Briar Prison: `[{"k":"removeEffect","sel":"damage"},{"k":"hook","h":"trigger","on":"skillUse","do":[{"status":"stun","turns":1,"to":"castFront"}]}]`
- Druid 3.fa Thin Sap: `[{"k":"hook","h":"target","target":"all_allies"},{"k":"skill","sel":"heal","f":"power","op":"pct","v":-0.5},{"k":"skill","sel":"self","f":"cooldown","op":"set","v":4}]`
- Druid 3.ma Grove Bloom: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"heal":1,"of":"firstHeal","to":"rowMates"}]}]`
- Druid 3.v Verdant Link: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"cast":"event","to":"lowestHpOtherAlly","noChain":true}]}]`
- Cutthroat 1.eb Backhand Cut: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"strike":0.5,"to":"beside","count":1},{"status":"wound","turns":2,"to":"beside","count":1}]}]`
- Cutthroat 1.mb Carving Arc: `[{"k":"hook","h":"trigger","on":"skillUse","drop":"1.eb","do":[{"strike":0.5,"to":"beside","count":1,"chain":3},{"status":"wound","turns":2,"to":"beside","count":1}]}]`
- Cutthroat 2.fb Spent Belt: `[{"k":"hook","h":"target","area":{"hitsAtCenter":4}},{"k":"skill","sel":"self","f":"cost.amount","op":"set","v":14}]`
- Cutthroat 2.mb Endless Knives: `[{"k":"hook","h":"trigger","on":"crit","perCast":2,"do":[{"strike":1,"to":"target"}]}]`
- Cutthroat 3.eb Exposed in Smoke: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"status":"overextended","turns":1,"to":"lowestHpInCast"}]}]`
- Cutthroat 3.fb Hard Clay: `[{"k":"removeEffect","sel":"status:blinded"},{"k":"hook","h":"trigger","on":"skillUse","do":[{"status":"stun","turns":1,"to":"randomInCast","count":1}]}]`
- Cutthroat 4.u3 Shadow Return: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"status":"shrouded","turns":2,"to":"selfBeside"},{"status":"fleet","turns":2,"to":"selfBeside"}]}]`
- Hexer 2.r Rot Contagion: `[{"k":"hook","h":"trigger","on":"skillUse","procChance":0.1,"rank":true,"do":[{"status":"wither","turns":3,"power":0.2,"stat":"luck","to":"outsideArea","count":1},{"status":"omen","stacks":1,"to":"outsideArea","count":1}]}]`
- Hexer 2.ma Plague Tide: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"status":"omen","stacks":1,"to":"outsideArea","ifStatus":"omen"}]}]`
- Hexer 3.r Rumour Mill: `[{"k":"hook","h":"trigger","on":"skillUse","procChance":0.1,"rank":true,"do":[{"status":"jinxed","turns":2,"to":"adjacentEnemy"}]}]`
- Hexer 4.d3 Mark of Silence: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"status":"silence","turns":1,"to":"rowMates","caster":true},{"status":"silence","turns":1,"to":"target","caster":true}]}]`
- Gambler 1.v Dice Storm: `[{"k":"hook","h":"target","target":"random_enemies","count":3}]`
- Gambler 0.fb Coin Toss Life: `[{"k":"hook","h":"rule","rule":"luck","add":0.2},{"k":"hook","h":"trigger","on":"battleStart","do":[{"hpLoss":0.2}]}]`
- Antimage 2.fa Narrow Siphon: `[{"k":"hook","h":"target","area":{"rows":1,"cols":1}},{"k":"skill","sel":"manaBurn","f":"pctMax","op":"set","v":1}]`
- Antimage 3.fb Cloistered Ward: `[{"k":"hook","h":"target","target":"self"},{"k":"skill","sel":"shield","f":"power","op":"pct","v":0.6}]`
- Antimage 0.fa Lifeline Pact: `[{"k":"hook","h":"target","overflow":{"mult":2}},{"k":"passive","f":"threshold","op":"set","v":45}]`
- Antimage 0.fb Martyr's Overflow: `[{"k":"passive","f":"mana","op":"set","v":8},{"k":"hook","h":"target","overflow":{"noSelf":true}},{"k":"hook","h":"trigger","on":"manaOverflow","do":[{"hpLoss":0.05}]}]`
- Antimage 0.v Endless Spring: `[{"k":"hook","h":"target","overflow":{"allies":true}}]`
- Antimage 1.eb Quickening Steal: `[{"k":"hook","h":"trigger","on":"hit","when":{"targetMpZero":true},"do":[{"status":"haste","turns":1,"to":"lowestMpAlly"}]}]`
- Antimage 3.ea Split Ward: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"cast":"event","power":0.5,"to":"lowestMpAlly","noChain":true}]}]`
- Antimage 3.fa Stretched Ward: `[{"k":"hook","h":"trigger","on":"skillUse","drop":"3.ea","do":[{"cast":"event","power":1,"to":"lowestMpAlly","noChain":true}]},{"k":"skill","sel":"self","f":"cost.amount","op":"set","v":18}]`
- Antimage 4.d2 Ready Blades: `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"buff":{"repeatChance":1},"uses":1,"skill":"mana_burn"}]}]`
- Antimage 4.l1 Rallying Break: `[{"k":"hook","h":"trigger","on":"hit","when":{"targetHasBuff":true},"do":[{"status":"haste","turns":1,"to":"allAllies"}]}]`
- Antimage 4.l2 Turned Boons: `[{"k":"hook","h":"trigger","on":"hit","drop":"4.l1","when":{"targetHasBuff":true},"do":[{"status":"haste","turns":1,"to":"allAllies"},{"mp":4,"to":"allAllies"}]}]`
- Undead 2.v Banshee's Toll: `[{"k":"hook","h":"target","target":"all_enemies"},{"k":"skill","sel":"self","f":"cost.ofCurrent","op":"set","v":0.3},{"k":"hook","h":"cond","mod":{"drainMul":1}}]`
- Undead 0.ma Undying Thirst: `[{"k":"hook","h":"rule","rule":"cheatDeath","once":true,"hp":1,"do":[{"buff":{"drainAdd":1},"uses":1}]}]`

### Yazılamayan / kapsam dışı (10)
(İlk dört motor eksiği **Faz 5c'de yazıldı**; aşağıda Faz 5c notları.)
- Hexer 3.v Turned Hand: düşmanın sıradaki saldırısını kendi dostuna çevirme (yapay zeka hedef seçimine kural; yok).
- Gambler 4.u2 Mortgage: All In'e can bahsi (bahis motorunda can kaynağı yok).
- Gambler 3.v Returning Cards: kart başına ikinci vuruş + YENİ rastgele durum (kartın durum zarı yeniden atılamıyor).
- Paladin 2.n0 Soul Exchange: bedel seçimi (MP ya da can) oyuncu seçimi + arayüz ister.
- Paladin 0.fb Fervent Oath: Divine Light'ın veride dosta hasar bonusu yok (madde 394.16). **10a altıncı turda metin değişti ve yazıldı.**
- Kapsam dışı: Paladin 4.d1-d3 Focused Beam ailesi, Gambler 3.ea Stacked Deck, 3.ma Double Deal.

## Faz 5b notları (content-designer 2026-10-22)

Faz 5a'nın "veriye yazılmayan" 55 düğüm eşlemesi `data/skill-trees/<class>.json`'a yazıldı; her biri düğüm metniyle (sayı, rank, koşul, süre) karşılaştırıldı. `src/` değişmedi. Testler `tests/skill-tree-fx5b.test.ts`. Varsayımlar `open-questions.md` madde 395.

### Metinle uyuşmayıp düzeltilenler (2)
- **Anti-Mage 3.fb Cloistered Ward:** eşlemedeki `skill shield power pct 0.6` yalnızca kalkanın INT kısmını büyütüyordu; Spell Ward'ın asıl kısmı kalan MP payı (`bonusPerMana`). "60% larger" için verilen kalkan çarpanına geçti: `{"k":"hook","h":"heal","on":"shieldDealt","skill":"spell_ward","mul":0.6}` (+ `target self` aynen). Test: kalkan tam x1,6.
- **Archer 2.fa Brittle Point:** eşlemedeki `addEffect ... "potency": 0.4` alanını motor okumuyordu (Sunder %20'de kalırdı). Sunder düğümünün (2.ea) etkisi kalır, büyüklük `cond sel status:sunder, statusPotency { armorMult: -0.2 }` ile 0,8 -> 0,6 (zırh %40 düşük). Alan `maxTargets 2` aynen.
- Öbür 53 düğüm eşlemedeki gibi yazıldı. 394'teki Ömer sorularına bağlı düğümler (Undying Rage, Thin Sap, Carving Arc, Martyr Rising, Split Ward, Verdant Link) şimdiki yazımla kaldı.

### Sözlükle yeni yazılanlar (3)
- **Paladin 0.r Sun-Forged Will:** `{"k":"hook","h":"cond","at":"smite","when":{"targetHpBelow":0.5},"mod":{"powerMul":0.05},"rank":true}`.
- **Paladin 0.ma Chain of Light:** `{"k":"hook","h":"trigger","on":"kill","via":"smite","once":"perTurn","do":[{"smite":true}]}` (ikinci smite de öldürürse üçüncüsü yok).
- **Paladin 1.mb Hammerfall Quake:** `{"k":"hook","h":"trigger","on":"kill","do":[{"strike":0.4,"to":"rowMates"}]}` (Holy Strike öldürünce ölenin sırasındaki düşmanlara Holy Strike'ın %40'lık gerçek vuruşu).

### Soul Exchange (Paladin 2.n0): yazılamadı, motor eksiği
(**Faz 5c'de yazıldı**: `cost.hpFallback`; aşağıda Faz 5c notları.)
Ömer'in kararı (10a beşinci tur, soru 26): MP yetmezse Resurrection'ın bedeli kendiliğinden mevcut canın %25'inden ödenir; seçim / arayüz yok. Var olan sözlük bunu yazamıyor:
- Derleyicinin bedel yamaları yalnızca `cost.amount` ve `cost.ofCurrent`; bedelin kaynağı (`cost.resource`) yamalanamıyor, "yedek kaynak" alanı yok.
- `cost.cond` (koşullu ek / çarpan) var ama birimin kendi MP'sine bakan koşul yok (`selfMp*` yok); "MP yetmiyorsa bedelsiz yap + canı düş" hilesi de bu yüzden kurulamıyor (kurulsa bile `payHp` / `hpPaid` olayları çalışmaz, önizleme "Free" gösterir).
- Eksik motor parçası: `SkillCost`'a yedek bedel alanı (ör. `hpFallback: { ofCurrent: 0.25 }`): `canUse` (MP yetmiyorsa candan ödenebilir mi; kendini öldürmez), ödeme (can düşümü + `payHp` olayı + `hpPaid`), `skillCostAmount` / bedel etiketi / önizleme, yapay zekanın bedel kontrolü, maç kaydı; derleyicide `self` seçicisine `cost.hpFallback` yaması. Bu `engine-dev` işi.

## Faz 5b: kalan null düğümler

11 ağaçta `fx: null` kalan düğümlerin TAMAMI (Faz 5b sonunda 14; Faz 5c motor eksiği 4 düğümü yazdı, kalan 10; 10a altıncı tur 5 karar düğümünü yazdı, kalan 5; Mastery bar'larında null yok). `tests/skill-tree-fx5b.test.ts` bu listeyi birebir denetler.

| Class | Anahtar | Ad | Neden |
|---|---|---|---|
| Gambler | 3.ea | Stacked Deck | mockup bekliyor (Card Trick'ten önce durum seçimi arayüzü) |
| Gambler | 3.ma | Double Deal | mockup bekliyor (Stacked Deck seçimine bağlı; ikinci rastgele durum da motorda yok) |
| Paladin | 4.d1 | Focused Beam | mockup / Ömer kararı bekliyor (Focused Beam satırı) |
| Paladin | 4.d2 | Pillar of Wrath | mockup / Ömer kararı bekliyor (Focused Beam satırı) |
| Paladin | 4.d3 | Lance of Dawn | mockup / Ömer kararı bekliyor (Focused Beam satırı) |

Özet: motor eksiği 0 (Faz 5c), Ömer kararı bekliyor 0 (10a altıncı tur: Spell Shatter, Pollen Drift, Distracting Fan, Fervent Oath, Rot Bomb yazıldı), mockup bekliyor 5.

## Faz 5c notları (engine-dev 2026-10-22)

Faz 5b'de motor eksiği yüzünden null kalan 4 düğüm motora + veriye yazıldı. Ağaçsız savaş birebir aynı: yeni alanlar yalnızca yamalı kopyada (`cost.hpFallback`, `bet.hpStake`), yeni eylem bayrağı / kural yalnızca ağaç kancasında; yeni zar yalnızca kural / bayrak varken atılır. Testler `tests/skill-tree-fx5c.test.ts`. Varsayımlar `open-questions.md` madde 397.

| Düğüm | fx | Motor |
|---|---|---|
| Paladin 2.n0 Soul Exchange | `[{"k":"skill","sel":"self","f":"cost.hpFallback","op":"set","v":0.25}]` | `SkillCost.hpFallback` (yalnızca MP bedelinde, oran (0, 1)): MP yetmezse bedel mevcut canın oranından (`cost.ts > hpFallbackAmount / skillCostPay`); canUse (can > bedel), ödeme (`resource` olayı `hp`, `payHp` tetiği, `castInfo.hpPaid`), YZ (bedel ağırlığı + kendine can kaybı `skillCostPay`'den), HUD bedel çipi (HP simgesi + miktar, kırmızı değil), etiket "16 MP or 25% of current HP" (`skillCostLabel`), maç kaydı skill satırı. |
| Gambler 3.v Returning Cards | `[{"k":"hook","h":"trigger","on":"skillUse","do":[{"strike":0.6,"to":"castTargets","rollStatus":true}]}]` | strike eylemine `rollStatus: true`: isabet eden ek vuruş skill'in `randomStatus` zarını o hedefe yeniden atar (`rollRandomStatus`, skill etkisiyle aynı yol). |
| Gambler 4.u2 Mortgage | `[{"k":"skill","sel":"bet","f":"hpStake","op":"set","v":0.1}]` | `BetSpec.hpStake` (yalnızca MP bahsinde): `gamble.ts > betStakeParts` (main + hp; canı en az 1 bırakır). Kazanç çarpanı toplamı görür (önizleme, YZ, gerçek zar aynı), kayıpta MP parçası MP'den, can parçası candan (`damage` olayı `origin: self`). YZ'de can parçası can ağırlığıyla. Skill açıklamasına "plus 10% of your max HP (counts as MP)". |
| Hexer 3.v Turned Hand | `[{"k":"hook","h":"rule","rule":"turnedHand"}]` | Yeni kural `turnedHand` (yeni durum YOK): Jinxed'i bu kuralı taşıyan Hexer vermişse taşıyanın sıradaki hasar skill'i (hedefleri karşı tarafta, telgrafsız) YZ'nin seçtiği hedef yerine kendi dostlarından seed'li rastgele birine tek hedef olarak iner (alan / aşama / yan vuruş düşer); bir Jinxed tek saldırı çevirir; dost yoksa normal. `treeProc` Hexer'e yazılır. |

Derleyici: `self` seçicisine `cost.hpFallback`, `bet` seçicisine `hpStake` (ikisi de varsayılan 0, MP dışı / oran dışı = derleme hatası); strike'a `rollStatus`; `RULE_KINDS` + `turnedHand` (alansız).

## Faz 7 denge turu (balance-tester 2026-10-22)

Hedef (9.2a, Ömer): ağaç class başına **+20-25 puan**, |a-b| <= 5. Yalnızca `data/skill-trees/<class>.json` düğüm sayıları değişti (`_rules.json > enabled` false; ağaçsız savaş birebir aynı). Görünen sayısı değişen her düğümün `text`'i aynı dosyada güncellendi. Varsayımlar `open-questions.md` madde 398.

- **Genel kırpma:** güç / şans / şifa / kalkan / kritik / zırh delme sayıları (yalnızca artı yöndekiler; metinde aynı yüzde geçen) yaklaşık yarıya, okunur sayıya yuvarlandı (Mage ve Cutthroat / Gambler x0,7, Archer x0,65, diğerleri x0,5). Bedel (eksi) tarafları, süreler, cooldown'lar, eşikler (%50 can altı gibi), stack / sayı tavanları DEĞİŞMEDİ. Metinde sayısı olmayan nitel düğümler (Stun, Wound, cheatDeath, "double"...) değişmedi.
- **Tutarlılık düzeltmeleri:** başka düğümün değerini kopyalayan `drop` düğümleri tabana göre ayarlandı (Cutthroat 0.fb / 0.mb / 1.mb, Druid 4.u2 / 4.u3 / 4.d2, Mage 4.d2, Undead 4.r2); Paladin 0.eb (Fervent Oath'un "doubles to +30%" metni için) ve Undead 3.ea / 3.fa (Transfusion %15 / %30) kırpılmadı; Undead 1.fb "always Silences" toplamı %100 kalacak şekilde, 1.fa "12% → 40%".
- **Class ince ayarı:** Defender 2.f1 (Taunt kırılma +%2 / rank, 25 → 31), 2.r (dostlar -%1 / rank, 10 → 13), 4.r1 (Fist Crush zırh %10), 4.r3 (%30); Warrior 1.fb Third Cut yarım güç, 1.n0 +%5, 1.ma +%5, 1.mb +%2 / tur, 4.u1 can çalma %10, bar Crushing Weight +%3; Druid 1.ea / 1.ma %20, 1.fa +%15, 1.fb 10 MP, 4.u1 %20 (4.u3 +%100 korunur); Cutthroat 2.mb ek bıçak %50, 2.ea +%20; Hexer 1.fb +%15 ve 4 MP; Undead 1.eb Silence %20.
- **Sonuç (1000 savaş, seed 50001, L15 / 20 / 25, yalnızca oyuncu tarafı ağaçlı):** genel ağaçsız %49-50 → a %73-74, b %73-79 (fark +23 / +25 / +23 a, +29 b). L25'te b yönü bütün class'larda a'dan güçlü (genel +6 puan); bu sim bütçesinde kapatılamadı (madde 398).
