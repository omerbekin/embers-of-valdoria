# Menzil sistemi
> **Ne için / Güncel mi (2026-11-08):** menzil kuralı (Ömer kararı 2026-10-17, sonra güncellendi) ve kod/veri yolları. Güncel; tek sahip menzil kuralının. Tarihçe (ilk değerler, uygulama sırası): `docs/archive/design/range-history.md`.


Amaç: arka sıranın engelsiz vurulmasını bitirmek; dizilim, Move ve öne çıkma riski anlam kazansın.

## Tahta ve mesafe
- Her taraf 4 sıra x 3 şerit; iki taraf yan yana toplam 8 sıra.
- **Mesafe** = saldıranın kendi tarafındaki GERÇEK sıra derinliği (ön sıra 0 ... en arka 3) + hedefin derinliği + 1. Ön sıra ↔ ön sıra = 1; en arka ↔ en arka = 7.
- **Hedef tarafında boş ön sıralar sayılmaz** (hedefin derinliği, kendi tarafının en öndeki DOLU sırasından sayılır): düşman ön sırasını boşaltarak melee'den kaçamaz. Saldıranın tarafında boş sıralar sayılır: geride durmak menzil kaybettirir.

## Menzil kimde
- **Menzil temelde SINIFIN özelliğidir** (Ömer notu: "fundamental olarak sınıf"). Sınıfın taban menzili skill'lerine geçer; özel skill'ler istisna olarak kendi değerini taşıyabilir. Skill kartında "Range N" yazar. Güncel değerler aşağıdaki onaylı tablo ve `data/classes/<sınıf>.json > range`.
- **Gökten / herkese vuran skill'ler** (Fist Crush, Radiance'ın düşman kısmı, Murder of Crows gibi) menzilsizdir; kartta "Global".
- **Charge ve Backstab da menzile bağlıdır** (Ömer: istisna yok).
- **Dost skill'leri (şifa, buff, kalkan) de menzil taşır**; bugünkü skill'lerde kısıtlanması gereken bir durum varsa öneri getirilir (Ömer'in tahmini: şimdilik yok).
- **Düşmanlar:** tüm mob skill'leri arketipe göre menzil alır (melee 1, mızrak 2, okçu/arbalet 6, büyücü 5, boss özel); tablo Ömer'in onayına gelir.
- **Tüm modlar** aynı kural (sefer, Endless, Quick Battle, çok oyunculu).

## Kural ayrıntıları
- **AoE:** menzil hedeflenen merkez hücreye bakar; alanın kenarı menzil dışına taşabilir.
- **Taunt:** yalnızca taunt eden menzildeyse zorlar; değilse saldıran menzildeki diğer hedefleri seçebilir.
- **Menzilde hedef yoksa:** skill gri olur; birim Move ile yaklaşır ya da başka skill seçer. YZ menzile girmek için konum almayı öğrenir. Ömer 2026-11-01: yakın dövüşçü YZ, kendinden başka şu an vurabilen dost yoksa saldırı erişimini kaybedecek şekilde geri çekilmez; geride kaldıysa riske bakmadan menzile döner (Skip atıp beklemez). Vuran başka dost varken yaralıyken geri çekilebilir. Her iki tarafın YZ'si için geçerli.
- **Gösterge:** skill kartında "Range N" + skill seçilince ulaşılabilen düşman hücreleri parlar (ulaşılamayanlar soluk).

## Onaylanan menzil tablosu (Ömer 2026-10-17, sayfa rangetable/main)
- **Sınıf tabanı:** Warrior 1, Defender 1, Cutthroat 1, Paladin 4, Druid 5 (Ömer 2026-10-17 denge denemesi: 4 -> 5), Anti-Mage 4, Gambler 5, Undead 5, Hexer 5, Mage 6, Archer 6 (Ömer 2026-10-17: 7 -> 6 after the first range test; Archer was untouchable at depth 3, 71% QB win), **Skald 2** (Ömer 2026-11-08: "uzatılmış yakın dövüşçü", YAKIN DÖVÜŞ grubunda; 3 -> 2).
- **Yakın dövüş grubu (Ömer 2026-11-08):** taban menzili <= 2 (`formulas.json > range.meleeMax`) olan sınıf/çağrı yakın dövüşçü sayılır: Warrior, Defender, Cutthroat, Skald. Otomatik dizilimde önce yerleşir, takım kartında "Melee", YZ'de yakın dövüşçü kuralları (aşağıdaki geri çekilme kuralı dahil). Range 2 moblar (teber / mızrak) da YZ'de bu gruba girer (Ömer 2026-11-08 onayladı: morvane_halberdier, frozen_halberdier, frozen_standard_bearer, sworn_guard).
- **Skill istisnaları:** Charge 4; Backstab **3** (Ömer: Cutthroat ön sırada olsun; ön sıradan zaten 3. sıraya ulaşır); Saltire Cut 3; Smoke Bomb 4 (**kendi tarafına atılırken de menzil 4**); Bone Throw 4; Drain Field **4** (merkez seçildiği için 2. sıradan bile en arkaya atar); **Mana Steal 4** (Ömer: Anti-Mage bu senaryoda uzak sınıf; tüm skill'leri 4); Treant skill'leri 4; Skeleton skill'leri 1; **Stormcall 3** (Ömer 2026-11-08: Skald ultisi; Hammer Spark / Thunder Strike sınıf tabanı 2, War Drum kendi merkezli alan, menzilsiz). Rest / Skip Turn / Move / Valor Revive menzilsiz.
- **Global:** Fist Crush, Radiance, Card Trick, Murder of Crows, Breaking Span, Fall of King's Bridge, Pyre of Morvane. Meteor / Blizzard / Arrow Rain Global DEĞİL.
- **Dost skill'leri:** kısıt yok, **Close Ranks hariç (Defender): seçilen dost menzil 2 (`skills.json > close_ranks`), onun sırasındaki dostlar menzilden bağımsız** (Ömer: "şimdilik böyle, duruma göre değiştiririz"). Diğerleri sınırsız.
- **Moblar:** arketip (yakın 1, teber/mızrak 2, okçu/arbalet 6, büyücü 5, kendine/dostuna menzilsiz) + istisnalar: Run Down 3, Burn the Field **5**, Peat Smoke 4, Rockfall 4, Drag Under 2, Chain Hook 4, Anchor Smash 2, Ashfall 6, Cinder Lash 5.
- **Geri dönüş hazırlığı (Ömer: en deneysel değişiklik):** tüm sistem tek veri bayrağı arkasında (`range.enabled`); kapalıyken eski hedefleme birebir. Kod ayrı modülde.

## YZ dizilimi (engine-dev 2026-10-17; Ömer: "Quick Battle'da YZ dizilimini menzile ve diğer etkenlere göre kursun")
- Menzil açıkken otomatik dizilimler (Quick Battle Randomize, oyuncunun Auto arrange'ı / sefer önerilen hücre, sim'in rastgele savaşları, Endless normal dalgaları) `src/engine/formation-ai.ts` ile kurulur; ağırlıklar `data/ai.json > formation`. Elle yerleştirilmiş sefer/boss karşılaşmaları DEĞİŞMEZ. Menzil kapalıyken eski dizilim birebir.
- Puan: ana menzil (sınıf tabanı) düşmanın ön sırasına ilk turdan ulaşmalı (ulaşamazsa büyük ceza), ne kadar derine ulaşırsa o kadar iyi; kendi ön sıradan geride durmak güvenlik (kırılgan birimde daha değerli); taunt'lu birim önde; Guard sahibi dostlarına menzilinde; düşmanın alan şekilleri (bilinmiyorsa Quick Battle havuzunun şekilleri; tahtanın yarısından büyük şekiller sayılmaz) iki kırılganı birlikte vuruyorsa ceza. Rastgele dizilimde seed'li küçük gürültü (çeşitlilik).
- Tipik sonuç: menzil 1 önde, mızrak (2) ikinci sırada önündeki yakın dövüşçünün arkasında, Paladin/Anti-Mage (4) ve 5'likler (Druid, Gambler, Undead, Hexer) 1-2. sıra, Mage ve Archer (6) arka sıralarda.


## Dizilim ipuçları (Ömer 2026-10-18)
- Dizilim ekranlarında (sefer Formation, Quick Battle, MP, Endless) uygunsuz hücredeki birime yalnızca ÖNERİ: `src/engine/formation-hints.ts` (kural formation-ai ile aynı), eşikler `data/ai.json > formationHints`. Varsayımlar: `docs/archive/design/open-questions-archive.md` madde 349.

## Kod ve veri
- **Menzil değiştirmek için:** sınıf tabanı `data/classes/<sınıf>.json > range`; skill istisnası `data/skills.json > <id>.range`; mob `data/mobs/*.json`; çağrı `data/summons/`; varsayılan ve yakın dövüş sınırı `data/formulas.json > range` (`default`, `meleeMax`). Test: `tests/range.test.ts` (eski kural testleri `tests/range-helpers.ts > rangeOff`); wiki ve skill kartı otomatik okur; bu belgedeki onaylı tablo elle güncellenir.
- Kod ayrıntısı (eski `docs/arch/battle-engine.md` Stat sistemi maddesinden taşındı): **MENZİL (docs/design/range.md, Ömer 2026-10-17; en deneysel değişiklik, tek bayrak `formulas.json > range.enabled`):** her skill'in menzili = skill `range` ?? birimin (sınıf/mob/çağrı/boss) `range`'i ?? `range.default`; `skill.global` ve hedef seçimi olmayan türler menzilsiz; dost skill'leri yalnızca kendi `range`'i varsa kısıtlanır (Close Ranks 2). Mesafe = saldıranın kendi tarafındaki gerçek sıra derinliği + hedefin derinliği (hedef tarafının en öndeki DOLU sırasından) + 1; kendi tarafında sıra farkı. Alan skill'inde menzil anchor hücreye bakar; taunt yalnızca menzildeyse zorlar (yalnızca tek hedefli skill; alan / rastgele / herkese vuran skill zorlanmaz ama YZ'de `ai.json > value.tauntPull` 0,7 ile ulaşılabilen taunter varken taunt'sız hedeflere giden hasar/baskı/öldürme değerinin %70'i silinir, `ai.ts > tauntPullOf`, playtest 2026-10-23 D5; sefer bölgesi düşman YZ ayarı `valdoria.json > regions[].enemyAi` -> `BattlePlan.enemyAi` -> `chooseAction(..., { value })`, bölge I pressureShare 0,125; test `tests/taunt-pull.test.ts`); menzilde hedef yoksa canUse 'No target in range', targetProblem 'Out of range'. Kod: saf kural `src/engine/range.ts`, kancalar `battle.ts` (`rangeOn`, `rangeOf`, `distanceTo`, `inRange`, `reachesFrom`, `skillReachesFromCell`), YZ konum alma `src/engine/ai-range.ts` (`bestMoveRange`: geri çekilme / menzile girme (eşitlikte uzak birim en derin hücre) / yaklaşma / aura; `advanceValue` menzil dalı), önizleme `preview.ts` (menzil dışı anchor = boş), dizilim `content.isMeleeClass` (açıkken taban menzil <= 1), arayüz `src/ui/skill-tags.ts` (kart 'Range N' / 'Global'), `src/game/target-cells.ts > outOfRangeCells` (menzil dışı düşman hücreleri soluk), Codex Basics > Range (`src/wiki/catalog.ts > rangeArticle`), tutorial Move durumu. Bayrak KAPALI = eski kural birebir: melee skiller düşmanın en öndeki dolu sırasına ulaşır (`formation.meleeRows`, skill `reach` / `ignoreReach` / `ignoreFrontRow`); altın kayıtlar menzil kapalı koşar (`tests/golden/harness.ts > rangeOff`), eski kural testleri `tests/range-helpers.ts > rangeOff` ile; menzil testleri `tests/range.test.ts`.
