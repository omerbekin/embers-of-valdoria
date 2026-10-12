# İkinci el nesneleri (yay / tılsım) ve Skill ağacı: TASLAK (ÖNERİ)

Durum: **TASLAK, hiçbiri onaylı değil.** Tarih 2026-10-12. Yalnızca tasarım; kod, veri ve commit yok.
Oyun içi adlar İngilizce, açıklamalar Türkçe. Tüm sayılar **PROVİZYON** (balance-tester ölçecek).
**[YENİ MEKANİK]** etiketi = bugün oyunda olmayan kural; Ömer onaylamadan uygulanmaz (hafıza kuralı: yeni mekanik açıkça sorulur).
**[MEVCUT]** etiketi = motorda/veride zaten var olan bir mekaniğin yeniden kullanımı.

Dayanak: `data/items.json` (`_grip`, `weaponFamilies`, `affixDefs`, `rareDrop`), `docs/design/progression/items.md` (1.7: skill değiştiren etkiler skill ağacına), `roadmap.md` 1.3 (güç bütçesi: ağaç +%5 / +%15 / +%25), `future-ideas.md` (skill ağacı, set kararları, tutuş kuralları), `pose-coverage.md` (13 ortak poz + ikinci el katmanı).

---

# BÖLÜM A: YAY VE TILSIM KULLANANLARA İKİNCİ EL NESNELERİ

## A.0 Sorun

Bugünkü kural (Ömer onayı 2026-10-12): ikinci el yuvasına yalnızca tek el silahın yanında kalkan (Maces & Shields) ya da ikinci hançer takılır. `two` / `bow` / `charm` tutuşu ikinci eli kapatır.

Sonuç: Archer, Gambler, Hexer ve asa kullananlar (Mage, Druid, Undead) **bir item yuvasını tümden kaybediyor**. Çift el silahlara bugün hiçbir telafi yok (affix sayısı ve değeri tek el ile aynı). 7 yuvanın biri boş = item gücünün kabaca %10-12'si eksik. Bu bir denge açığıdır; aşağıdaki öneri bunu kapatır.

## A.1 Önerilen yeni ikinci el aileleri

Yapı: `weaponFamilies` gibi, ama `slot: offhand` olan aileler. Her ailenin bir **eşleştiği tutuşu** (`pairs`) vardır: o aile yalnızca o tutuştaki silahın yanına takılır.

| Aile (in-game) | Sınıflar | Eşleştiği tutuş | Ana affix (main, C) | Tema |
|---|---|---|---|---|
| **Quivers** | Archer | bow | c_phys, c_acc | Sadak: sırtta çapraz, tüyleri omuzdan görünür |
| **Gaming Kits** | Gambler | charm | c_phys, c_mp | Zar kupası, işaretli deste kutusu, sikke kesesi, fal (tarot) kesesi |
| **Fetishes** | Hexer | charm | c_dark, c_dot | Ritüel mumu, iğne yastığı, cadı şişesi, mezar feneri |

Neden Gambler ve Hexer için **iki ayrı aile** (öneri): tema net kalır (Hexer zar kupası tutmaz), imza affix'leri sınıfın kendi mekaniğine bağlanabilir (Gambler: bahis; Hexer: Omen). Loot'ta kayıp olmaz çünkü düşüş zaten "takımın kullanabileceği" aileden seçilir (A.5). Alternatif: tek ortak **Curios** ailesi (her ikisi takar, temalar karışık); karar listesinde soruldu.

### Tutuş kuralının yeni hâli (öneri)

| Ana el | İkinci el yuvasına ne takılır |
|---|---|
| Tek el (one) ya da silahsız | Kalkan (Maces & Shields sınıfları) ya da ikinci hançer (bugünkü gibi) |
| Yay (bow) | Yalnızca **Quiver** |
| Tılsım (charm) | Gambler: **Gaming Kit**; Hexer: **Fetish** |
| Çift el (two: asalar, Dane Axe, Avenger's Maul) | Hiçbir şey (bugünkü gibi); telafi için A.2 |

- Yay çıkarılıp tek el silaha geçilirse (Archer'da olmaz ama kural genel olsun) eşleşmeyen ikinci el item'i **torbaya döner** (bugünkü çift el kuralıyla aynı davranış; torba doluysa değişim engellenir).
- Gear'da ikinci el yuvası, ana eldeki silaha göre ipucu gösterir: "Quiver", "Gaming Kit", "Fetish", "Shield / Dagger" ya da kilit ikonu + "Two-handed: no off-hand".

## A.2 Asa kullananlar (Mage, Druid, Undead) ve diğer çift el silahlar

Asalar çift eldir, ikinci el yok. Bu **tematik olarak doğru** (büyücü asayı iki elle tutar) ama yukarıdaki yuva açığı sürer. Üç yol:

| Seçenek | Ne | Artı | Eksi |
|---|---|---|---|
| (a) Hiçbir şey yapma | Asa kullananlar 1 yuva eksik | Sıfır iş | Kalıcı ~%10 güç açığı, 3 sınıf (+ çift el Warrior) cezalı |
| **(b) Çift el telafisi (ÖNERİ)** | `grip: two` silahların affix DEĞERLERİ x1,5 **[YENİ KURAL]**; Gear tooltip'inde tek satır: "Two-handed: +50% affix values" | Tek kural, görsel/poz işi yok, Dane Axe ve Avenger's Maul'u da adil yapar; nadirlik = affix sayısı kuralı bozulmaz | Değer sim ile ayarlanmalı (x1,5 tahmini: silah ağırlığı 1,5 + ikinci el 0,8 ≈ x1,53) |
| (c) Asaya özel "belt" nesnesi | **Tomes** ailesi: büyü kitabı belde zincirle asılı, eli kapatmaz | Asa kullananlar da toplar; güzel görünüm | Tutarsızlık (Warrior'ın çift el baltası neden kitap alamıyor?); yeni aile + sanat + poz verisi |

**Öneri: (b).** Not: yay ve tılsım (b)'den yararlanmaz; onların telafisi artık kendi ikinci el aileleridir.

## A.3 Affix'ler: mevcut havuz + imza affix'leri

### A.3.1 Mevcut havuzdan (yeniden kullanım)

İkinci el item'i, diğer yuvalar gibi nadirliğine göre C/B/A kademelerinden çeker. Önerilen **yuva izni genişletmeleri** (bugün `slots` kısıtı var):

| Affix | Bugün nerede | Öneri | Gerekçe |
|---|---|---|---|
| b_pen (Armor penetration) | weapon, gloves | **+ Quivers** ("Bodkin points") | Okçunun zırh delme fantezisi |
| b_crit / b_critdmg | weapon, gloves | **+ Gaming Kits** | Şans sınıfı kritik ile yaşar |
| a_keen | weapon, gloves | + Gaming Kits | aynı |
| c_eva | boots, gloves | + Quivers | hafif okçu |
| a_potency | (yuva kısıtı yok, needs debuff) | Fetishes'te `classFit` ile doğal çıkar | değişiklik gerekmez |

Diğer tüm affix'ler (c_hp, c_armor, c_mp, b_speed, b_marmor, b_resil, a_primary, a_gdmg ...) kısıtsız olduğu için zaten çıkabilir. `affixRules.classFit` (x2 ağırlık) ikinci el için de çalışır.

### A.3.2 İmza affix'leri (aileye özel; hepsi ÖNERİ)

Kural (items.md 1.7 ile uyum): item'ler **belirli bir skill'i** değiştirmez. Bu yüzden imzalar "temel saldırı", "bahis", "Omen" gibi **genel mekaniklere** bağlandı; aile tek sınıfa ait olduğu için pratikte o sınıfın kimliğini besler.

**Quivers (Archer)**

| Affix (in-game) | Kademe | Metin | Mekanik | Değer (ilvl 10, PROVİZYON) |
|---|---|---|---|---|
| **Spare Arrow** | B | "{0}% chance your free basic attack strikes again" | **[MEVCUT]** Loaded Dice'taki `repeatChance`; yeni olan: item'den 0 MP'li temel saldırıya eklenmesi **[YENİ KANCA, küçük]** | %8-12 |
| **Long Fletching** | C | "+{0}% damage per row of distance" | **[MEVCUT]** Archer pasifi Sharpshooter (`longshot.perRow` 0,08); affix bu sayıya ekler **[YENİ KANCA, küçük]** | +%1-1,5 / sıra |
| **Steady Draw** | A | "+{0}% damage with skills that cost MP while Hasted" | **[YENİ MEKANİK]** (Quick Shot Haste veriyor: Haste sürerken MP'li skill'ler güçlenir) | +%10-14 |

**Gaming Kits (Gambler)**

| Affix (in-game) | Kademe | Metin | Mekanik | Değer |
|---|---|---|---|---|
| **Weighted Odds** | B | "+{0}% chance to win your bets" | **[MEVCUT]** `bet.winChance` (High Stakes %50, All In %75); affix ekler **[YENİ KANCA]**; tavan %90 | +%5-8 |
| **Charmed Life** | C | "+{0}% Lucky Escape chance" | **[MEVCUT]** Lucky Escape (%30, savaşta bir kez); bu sayı zaten a_endure'un bir parçası, burada tek başına | +%4-6 |
| **House Edge** | A | "Losing a bet refunds {0}% of the stake" | **[YENİ MEKANİK]** | %25-35 |

**Fetishes (Hexer)**

| Affix (in-game) | Kademe | Metin | Mekanik | Değer |
|---|---|---|---|---|
| **Ill Portent** | B | "{0}% chance to place 1 extra Omen" | **[MEVCUT]** Omen (`critStacks` mantığı); yeni olan şans kaynağı **[YENİ KANCA]** | %8-12 |
| **Grave Wick** | C | "+{0}% Withering damage" | c_dot'un Wither'e özel hâli. Alternatif: yalnızca c_dot'u kullan (yeni affix yok) | +%6 |
| **Long Shadow** | A | "Omens last {0} turn longer before bursting into Doom" | **[YENİ MEKANİK]** (Omen sayacı 3 tur, +1); Doom'u geciktirmek bazen kötü, bu yüzden "seçmeli" güç | +1 tur |

Öneri: ilk sürümde yalnızca **B ve C imzaları** (mevcut mekaniğe kanca: Spare Arrow, Long Fletching, Weighted Odds, Charmed Life, Ill Portent, Grave Wick). A kademesindeki üç yeni mekanik (Steady Draw, House Edge, Long Shadow) ikinci adıma kalsın.

## A.4 Görünüm ve pozlar (yeni poz YOK)

Ortak 13 poz listesi ve planlanan **ikinci el katmanı** (pose-coverage.md madde 6: kalkan/hançer için zaten gerekli, el noktası + poz başına açı + önde/arkada bayrağı) kullanılır.

| Aile | Nerede çizilir | Poz etkisi |
|---|---|---|
| **Quiver** | **Sırtta** çapraz, tüyler arka omuzun üstünden çıkar (yandan bakışta silüet net okunur). Elde DEĞİL. | Gövdeye bağlı yeni bir **"back" bağlantı noktası** gerekir (poz başına konum + açı; kod/veri işi, yeni gövde çizimi değil). bow_shot / bow_sky'da çeken el omuza gider: sadağa uzanıyormuş gibi okunur, ek çizim yok. kneel'de sadak eğik kalır. Alternatif: kalçada (bel); yay kolu kalçayı kapattığı için daha az görünür. |
| **Gaming Kit** | **İkinci elde** küçük prop (zar kupası / kese / deste kutusu). Ana elde tılsım (zar/kart) zaten "yumrukta küçük item". | throw: ana el fırlatır, kupa ikinci elde kalır. raise / point: ikinci el yanda, prop görünür. channel: iki el önde, prop iki elin arasında. Ek poz yok. |
| **Fetish** | **İkinci elde** (mum, iğne yastığı, cadı şişesi); **fener** el yerine bel kancasına asılı çizilebilir (sallanma yok, sabit). | Hexer'in ana elinde bebek (hex doll) var; point (Evil Eye) ana elle bebekle yapılır, ikinci el mumu tutar. channel: mum öne gelir (lanet ritüeli gibi okunur). |

- Görsel dili silahlarla aynı: **aile görünümü + nadirlik parlaması**; Legendary'nin kendine has görünümü İLERİDE (silahlar için alınmış karar ile aynı).
- Asset: aile başına 1 katman çizimi (sadak, kupa/kese, mum/fener) + ikon (128/64). Gaming Kit ve Fetish'te taban başına ayrı prop çizmek isteğe bağlı (ilk sürüm: aile başına tek prop).

## A.5 1-Legendary kuralı ve loot

- **1 Legendary kuralı aynen geçerli** ("Only one Legendary per hero"). İkinci el Legendary'si, silah Legendary'siyle yarışır: Windrunner Longbow taşıyan Archer, Legendary sadak takamaz. Bu bilinçli bir seçimdir (iki Legendary'yi aynı kahramanda toplamak yasak kalır).
- **Legendary havuzu:** aile başına 1 Legendary (A.6), `rareDrop` havuzuna `minChapter: 2` ile (Valdoria'da çıkmaz; bölüm 1 havuzu küçük kalsın). Endless'ta mevcut kural: 11. dalgadan itibaren ve tüccarın nadir malında.
- **Normal loot:** `slots.offhand` ağırlığı (0,8) değişmez. İkinci el yuvası zarlandığında taban, **takımın kullanabileceği ikinci el ailelerinden** seçilir: `loot.usableWeaponChance` (0,8) ikinci ele de uygulanır **[KÜÇÜK KURAL DEĞİŞİKLİĞİ]**. Takımda Archer yoksa sadak düşme şansı %20'ye iner (tüccara satılır).
- **Tüccar stoğu ve Endless ödül kartları:** aynı tablo; ek kural yok.
- **Equip best:** ana el adayının değeri = silah + uyumlu ikinci elin en iyisi (bugünkü `equip.ts` mantığı); yay/tılsım artık "kapatan" değil "eşleşen" tutuş sayılır.
- Set item'leri: ikinci el set parçası şimdilik YOK (setler henüz kapalı).

## A.6 Örnek item'ler (aile x nadirlik)

Affix değerleri ilvl'e göre zarlanır (`base + perIlvl x ilvl`, x1,5). Örnek değerler ilvl ~10 için yaklaşıktır; "main" = katalogda sabit ana C affix'i. Common 1 affix, Uncommon 2 (C,C), Rare 3 (C,C,B), Epic 4 (C,C,B,A), Legendary 4 sabit + etki.

### Quivers (Archer)

| Nadirlik | Item (in-game) | ilvl | Main | Tipik diğer zarlar |
|---|---|---|---|---|
| Common | **Hide Quiver** | 2 | c_phys (+%2) | — |
| Common | **Linen Arrow Bag** | 4 | c_acc (+%2) | — |
| Uncommon | **Tooled Leather Quiver** | 6 | c_phys | + Long Fletching ya da c_eva |
| Uncommon | **Fletcher's Quiver** | 8 | c_acc | + c_hp |
| Rare | **Bodkin Quiver** | 9 | c_phys (+%6) | c_acc, **b_pen** (%5) |
| Rare | **Ranger's Back Quiver** | 10 | c_acc | Long Fletching, **Spare Arrow** (%10) |
| Epic | **Crow-Feather Quiver** | 10 | c_phys | c_acc, Spare Arrow, a_primary (+DEX) |
| Epic | **Warden's Arrow Case** | 14 | c_phys | c_hp, b_speed, a_speedpct |
| Legendary | **Quiver of the Grey Hawk** | (düştüğü yerin ilvl'i) | sabit: c_phys, Long Fletching, b_pen, a_keen | Etki **Hawk's Volley**: "Every 3rd attack also hits a random second enemy for 50% power." **[MEVCUT kanca]** Windrunner'ın `firstAttackEcho`'su "her 3. saldırı" sayaçlı hâliyle **[KÜÇÜK YENİ]** |

### Gaming Kits (Gambler)

| Nadirlik | Item (in-game) | ilvl | Main | Tipik diğer zarlar |
|---|---|---|---|---|
| Common | **Tin Dice Cup** | 2 | c_phys | — |
| Common | **Coin Pouch** | 4 | c_mp (+4 MP) | — |
| Uncommon | **Marked Deck Case** | 6 | c_phys | + Charmed Life |
| Uncommon | **Cardsharp's Sleeve** | 8 | c_mp | + c_acc |
| Rare | **Fortune-Teller's Pouch** (tarot kesesi) | 9 | c_phys | c_mp, **Weighted Odds** (+%6) |
| Rare | **Bone Dice Box** | 10 | c_phys | Charmed Life, b_crit |
| Epic | **Gilded Wager Purse** | 10 | c_phys | c_mp, Weighted Odds, a_keen |
| Epic | **The Hanged Man's Deck** | 14 | c_mp | Charmed Life, b_critdmg, a_primary (+LUCK) |
| Legendary | **Lady Fortune's Purse** | — | sabit: c_phys, c_mp, Weighted Odds, a_primary | Etki **Fortune Smiles**: "Your first bet each battle always wins." **[YENİ MEKANİK]** (bahis zarını bir kez atla) |

### Fetishes (Hexer)

| Nadirlik | Item (in-game) | ilvl | Main | Tipik diğer zarlar |
|---|---|---|---|---|
| Common | **Tallow Candle** | 2 | c_dark | — |
| Common | **Knotted Cord** | 4 | c_dot | — |
| Uncommon | **Pin Cushion** (iğne yastığı) | 6 | c_dark | + Grave Wick |
| Uncommon | **Grave Lantern** | 8 | c_dot | + c_mpregen |
| Rare | **Witch Bottle** | 9 | c_dark | c_dot, **Ill Portent** (%10) |
| Rare | **Black Candle** | 10 | c_dark | c_mp, b_mpcost |
| Epic | **Gallows Lantern** | 10 | c_dark | Grave Wick, Ill Portent, a_potency |
| Epic | **Hag's Needle Case** | 14 | c_dot | c_hp, b_resil, a_primary (+LUCK) |
| Legendary | **Candle of the Seventh Night** | — | sabit: c_dark, c_dot, Ill Portent, a_potency | Etki **Seventh Night**: "When Doom strikes, enemies right next to the target are Jinxed for 1 turn." **[MEVCUT]** Jinxed durumu + "hemen yanındaki" komşuluk (Ash Brand'de var) |

---

# BÖLÜM B: SKILL AĞACI TASLAĞI

## B.0 Bugünkü durum (özet)

- 11 sınıf, sınıf başına **tam 4 skill**: 1. = bedelsiz temel saldırı (0 MP), 2-3. = cooldown'lu skill'ler, **4. = ultimate** (uzun cooldown / başlangıç cooldown'u ya da Rage; `a_ultcd` affix'i "Ultimate" diye anıyor). Her sınıfın 1 pasifi var.
- Kaynak: MP (herkes), Warrior'da ek Rage (0-50).
- **Level/XP henüz YOK**: kahramanlarda `level: 1, xp: 0` alanları hazır (roadmap aşama 2). Endless'ta da koşu level 1 başlıyor, level yok.
- Güç bütçesi (roadmap 1.3, `data/campaign/power-budget.json`): bölüm sonlarında ağaç **+%5 / +%15 / +%25**, level +%10 / +%20 / +%30, item +%15 / +%30 / +%45. Düşman telafisi x0,8 (yalnızca **açık** sistemler; bugün yalnızca "item").
- İş bölümü (mevcut kararlar): **item = genel stat ve genel trait'ler**; **set = sınıf pasifini ve kaynağını sayısal büyütür** (Ömer 2026-10-11); **skill'in işleyişini değiştirmek = skill ağacının işi** (items.md 1.7). Ömer'in ağaç fikri: küçük "filler" düğümler + ileride MAJOR düğümler (skill'e güçlü yeni özellik ya da skill'in evrimi).

## B.1 Üç alternatif yapı

| | (a) **Skill yolları** (Skill Paths) | (b) **Yetenek ızgarası** (Talent Grid) | (c) **Uzmanlıklar** (Specializations) |
|---|---|---|---|
| Ne | Her skill'in kendi sırası: küçük düğümler + 1 çatal (2'den 1) + 1 ustalık (evrim) | Sınıf başına ~5x4 ızgara: stat filler'ları, pasifler, skill değiştiriciler; komşu düğüm açılır | Belli levelda 2 alt sınıftan biri seçilir (ör. Warrior: Berserker / Warlord); seçim 2 skill'i ve pasifi değiştirir |
| Artılar | Anlaşılması en kolay ("bu skill'imi güçlendiriyorum"); telefonda 4 satır = 4 skill; doğrudan "evrim" fikrini karşılar; skill tooltip'i değişikliği gösterir; item'lerle çakışmaz | Ömer'in "filler stat + major" fikrine en yakın; esnek; uzun vadede zengin | En güçlü kimlik; içerik az (sınıf başına 2 paket); YZ ve denge kolay (2 seçenek ölç) |
| Eksiler | 44 skill x 5 düğüm = ~220 düğüm içerik; skill dışı (genel) gelişim yok | Telefonda kalabalık; genel stat düğümleri item'lerle çift sayar (+HP, +kritik); en çok tasarım + denge işi | Level başına büyüme hissi zayıf (tek büyük seçim); seviyeler arası "puan" yok; sınıf sayısı fiilen 22'ye çıkar (sanat/ikon/ses) |
| Efor | Orta: veri ağırlıklı (sayı değişiklikleri), ustalıkların bir kısmı motor işi | Büyük | Orta-büyük (yeni skill varyantları + sanat) |
| Denge | Her düğüm küçük ve ölçülebilir; çatal A/B ayrı ölçülür | Kombinasyon patlaması, ölçmesi zor | 22 "sınıf" ayrı ayrı ölçülür |

**ÖNERİ: (a) Skill yolları**, çatal + ustalık ile. Ömer'in "filler + major" fikrini skill içinde karşılar (filler = skill'e küçük sayı; major = çatal ve ustalık), item'lerle çift sayımı yapısal olarak engeller. (c) ileride bölüm 3 "son düzey" ödülü olarak eklenebilir (ayrı karar).

## B.2 Önerilen yapı: Skill Paths

Her sınıfta **4 yol** (her skill için bir yol), her yolda **5 düğüm**, soldan sağa:

| # | Düğüm | Bedel | Açılma levelı | Ne yapar |
|---|---|---|---|---|
| 1 | Filler I | 1 puan | 2 | Skill'e küçük sayı (güç, bedel, süre) |
| 2 | Filler II | 1 puan | 4 | Küçük sayı ya da küçük kaynak etkisi |
| 3 | **Fork** (çatal) | 2 puan | 6 | **2 seçenekten 1** (A ya da B); diğeri kilitlenir (değiştirmek = sıfırlama) |
| 4 | Filler III | 2 puan | 12 | Orta sayı |
| 5 | **Mastery** (ustalık / evrim) | 4 puan | 18 (ultimate yolunda 22) | Skill'e yeni özellik |

- Yol başına 10 puan, sınıf başına **40 puan**; elde en çok **29 puan** (aşağıda) = ağacın ~%72'si. Yani oyuncu **en çok 2 ustalık** alır ve hangi skill'ini "yıldız" yapacağını seçer.
- Düğümler sırayla açılır (Filler I almadan Filler II olmaz).
- **Pasif için yol YOK** (öneri): pasif ve kaynağın sayısal büyümesi set item'lerinin işi (Ömer kararı 2026-10-11); ağaç oraya girerse ikisi aynı şeyi yapar.
- **Genel stat düğümü YOK** (öneri): +can, +kritik, +ana stat item'lerin işi. Filler'lar yalnızca **o skill'in** sayılarını değiştirir. (Ömer'in ilk fikri "+%3 can, +2 DEX" gibi filler'lardı; bu yüzden karar listesinde soruluyor.)

## B.3 Puan ekonomisi

| Konu | Öneri (PROVİZYON) |
|---|---|
| Max level | **30** (bölüm başına 10: bölüm 1 = L1-10, bölüm 2 = L11-20, bölüm 3 = L21-30; item seviyesi ilvl 1-30 ile aynı ritim) |
| Puan | Level 2'den itibaren **her levelda 1 puan** = L30'da 29 puan. Bölüm 1 sonunda 9 puan (tüm filler'lar + 1-2 çatal), bölüm 2 sonunda 19 (çatallar + ilk ustalık), bölüm 3 sonunda 29 |
| Ayrı stat puanı | YOK; level başına küçük otomatik stat artışı zaten roadmap aşama 2'de (level bütçesi ayrı) |
| Sıfırlama (respec) | **Kasabada ve dinlenme duraklarında ücretsiz**; yol üzerinde sıfırlama yok. Çatal değiştirmek de sıfırlamadır. Ironman'da aynı kural |
| Sefer | Puan kahramana kalıcı (kayıtta `tree` alanı roadmap'te öngörülmüş). Takıma sonradan katılan kahraman bölüm seviyesinin 1-2 altında gelir (öneri), puanları harcanmamış |
| Quick Battle / Multiplayer | **Ağaç YOK** (karar K2 / 8: QB ve MP'ye dokunulmaz). 4'e 4 denge bantları (%44-56) etkilenmez |

### Endless: ayrı, koşuya bağlı ağaç (öneri)

- Endless koşusu L1 başlar (bugünkü gibi). **Her dalga zaferi 1 level = 1 puan** **[YENİ, Endless]**; boss dalgası (10, 20) ek +1. Ortalama koşu (~12-13. dalga) ~13 puan: filler'lar + 2-3 çatal + belki 1 ustalık.
- Ağaç verisi **seferle aynı** (tek içerik), puanlar **koşuya ait**, koşu bitince silinir. Sefer kahramanı Endless'a taşınmaz.
- Sıfırlama: dalgalar arasında ücretsiz (roguelite: dene-gör).
- Roadmap'teki "3 karttan 1: skill puanı" kartı ek kaynak olarak kalabilir (Endless dengesi düğmesi).
- Endless düşman ölçeği (`data/endless.json > scaling`) ağaç açılınca yeniden ayarlanır (sim:endless).

## B.4 Tam örnek: WARRIOR (tüm sayılar PROVİZYON)

Temel: Double Strike (0 MP, 2 vuruş x STR %40), Whirlwind (8 MP, cd 3, tüm düşmanlar STR %69), Charge (10 MP, cd 3, arka sıraya ulaşır, STR %67,5 + Stun 1), **Abyssal Cry** (ultimate, 30 Rage, cd 5: sonraki 3 saldırı +1 sıra menzil ve +%50 STR). Pasif Berserker.

### Yol 1: Double Strike

| Düğüm | Ad (in-game) | Etki | Mekanik |
|---|---|---|---|
| Filler I | **Honed Edge** | Her vuruş %40 -> %44 | sayı |
| Filler II | **Battle Hunger** | Her isabetli vuruş +2 Rage (normal Rage kazancına ek) | MEVCUT (Rage) |
| Fork A | **Sunder** | 2. vuruş hedefi 2 tur Wounded yapar (alınan şifa -%25) | MEVCUT (wound) |
| Fork B | **Third Blow** | %25 ihtimalle skill bir kez daha vurur | MEVCUT (`repeatChance`, Loaded Dice) |
| Filler III | **Keen Follow-through** | Double Strike'a +%10 kritik şansı | MEVCUT (`critBonus`, Jinx) |
| Mastery | **Relentless** | Double Strike öldürürse 2 tur Haste | MEVCUT (öldürünce kancası, Battle Rhythm) |

### Yol 2: Whirlwind

| Düğüm | Ad | Etki | Mekanik |
|---|---|---|---|
| Filler I | **Wide Arc** | Güç %69 -> %75 | sayı |
| Filler II | **Light Feet** | Bedel 8 -> 6 MP | sayı |
| Fork A | **Bleeding Gale** | Vurulan herkes 2 tur Wounded | MEVCUT |
| Fork B | **Eye of the Storm** | Whirlwind sonrası Warrior 1 tur Blessed (alınan hasar -%30) | MEVCUT (blessed) |
| Filler III | **Storm of Rage** | Whirlwind'in Rage kazancı x1,5 | sayı (Rage kuralı) |
| Mastery | **Maelstrom** | Cooldown 3 -> 2 ve vurulanlar 1 tur Slow | sayı + MEVCUT (slow) |

### Yol 3: Charge

| Düğüm | Ad | Etki | Mekanik |
|---|---|---|---|
| Filler I | **Momentum** | Güç %67,5 -> %74 | sayı |
| Filler II | **Rush** | Bedel 10 -> 8 MP | sayı |
| Fork A | **Shatter** | Hedef, bir sonraki turuna kadar Overextended (+%25 hasar alır) | MEVCUT (overextended; boss durumu) |
| Fork B | **War Path** | Charge sonrası Warrior 2 tur Haste | MEVCUT |
| Filler III | **Impact Rage** | Charge isabeti +8 Rage | MEVCUT |
| Mastery | **Trampling Charge** | Charge öldürürse cooldown'u hemen sıfırlanır | MEVCUT (Gambler pasifinin "hazır olma" mekaniği) |

### Yol 4: Abyssal Cry (ultimate; ustalık L22)

| Düğüm | Ad | Etki | Mekanik |
|---|---|---|---|
| Filler I | **Deep Lungs** | Abyssal Fury +%50 STR -> +%60 STR | sayı |
| Filler II | **Echoing Cry** | Fury 3 saldırı -> 4 saldırı | sayı |
| Fork A | **Rallying Roar** | Hemen yanındaki dostlar 2 tur Haste | MEVCUT (Haste + "yanındaki" komşuluk, aura affix'lerinde var) |
| Fork B | **Abyssal Hunger** | Fury sürerken %15 can çalma | MEVCUT (life leech) |
| Filler III | **Quick Temper** | Bedel 30 -> 25 Rage | sayı |
| Mastery | **Abyss Unbound** | Abyssal Cry yalnızca yarım tur harcar | MEVCUT (yarım tur, madde 240 / Pilgrim's Stride) |

## B.5 Tam örnek: HEXER (tüm sayılar PROVİZYON)

Temel: Evil Eye (0 MP, LUCK %65 karanlık + 1 Omen, kritikse 2), Withering Curse (14 MP, cd 3, 2x3 alan, %22,5 + Wither 3 tur + 1 Omen), Jinx (2 MP, cd 3, %55, +%25 kritik, Jinxed 2 tur + 1 Omen), **Doom Mark** (ultimate, 14 MP, cd 4, başlangıç cd 2: vurur + Omen + Doom x1,5). 3 Omen = Doom. Pasif Ill Omen.

### Yol 1: Evil Eye

| Düğüm | Ad | Etki | Mekanik |
|---|---|---|---|
| Filler I | **Piercing Gaze** | Güç %65 -> %71 | sayı |
| Filler II | **Baleful Stare** | Evil Eye'a +%10 kritik şansı (kritik = 2 Omen) | MEVCUT (`critBonus`) |
| Fork A | **Malign Gaze** | Hedef 1 tur Jinxed | MEVCUT |
| Fork B | **Soul Siphon** | İsabette +2 MP | MEVCUT (MP kazanımı) |
| Filler III | **Mark of Ruin** | Hedefteki her Omen için +%10 hasar (en çok +%20) | **[YENİ MEKANİK]** (duruma göre hasar) |
| Mastery | **Third Eye** | Evil Eye rastgele ikinci bir düşmana da %50 güçle vurur (Omen dahil) | MEVCUT (ikinci hedef yankısı, Windrunner) |

### Yol 2: Withering Curse

| Düğüm | Ad | Etki | Mekanik |
|---|---|---|---|
| Filler I | **Deeper Rot** | Wither tik gücü %10 -> %12 | sayı |
| Filler II | **Spreading Blight** | Bedel 14 -> 12 MP | sayı |
| Fork A | **Long Wither** | Wither 3 -> 4 tur | sayı |
| Fork B | **Rotting Flesh** | Vurulanlar 2 tur Wounded | MEVCUT |
| Filler III | **Grave Soil** | İlk vuruş %22,5 -> %27 | sayı |
| Mastery | **Creeping Doom** | Her Wither tikinde %20 ihtimalle +1 Omen | **[YENİ MEKANİK]** (DoT'tan Omen) |

### Yol 3: Jinx

| Düğüm | Ad | Etki | Mekanik |
|---|---|---|---|
| Filler I | **Sharper Hex** | Kritik bonusu +%25 -> +%35 | sayı |
| Filler II | **Twisted Thread** | Güç %55 -> %60 | sayı |
| Fork A | **Hex Knot** | Jinxed, hedefin sonraki **2** hasar skill'ine kadar sürer (bugün 1) | **[YENİ, küçük]** (durum varyantı) |
| Fork B | **Bad Luck Charm** | Jinx ayrıca 2 tur Slow | MEVCUT |
| Filler III | **Crooked Fate** | Jinxed isabet cezası -%20 -> -%30 | **[YENİ, küçük]** (durum varyantı) |
| Mastery | **Curse of Silence** | Cooldown 3 -> 2; kritik Jinx hedefi 1 tur Silenced yapar | sayı + MEVCUT (silence) |

### Yol 4: Doom Mark (ultimate; ustalık L22)

| Düğüm | Ad | Etki | Mekanik |
|---|---|---|---|
| Filler I | **Heavy Doom** | Patlama x1,5 -> x1,65 | sayı |
| Filler II | **Patient Doom** | Başlangıç cooldown'u 2 -> 1 | sayı |
| Fork A | **Chain of Doom** | Doom Mark öldürürse Ill Omen yine çalışır (en çok 1 Omen geçer) | MEVCUT (bayrağı kapat: `noTransferOnKill`) |
| Fork B | **Harvest** | Patlayan her Omen için 5 MP geri (en çok 15) | MEVCUT (MP kazanımı) |
| Filler III | **Dread** | Bedel 14 -> 12 MP | sayı |
| Mastery | **Final Omen** | Patlama, hedefin hemen yanındakilere hasarın %50'si kadar vurur | MEVCUT (Ash Brand komşuluk hasarı) |

## B.6 Item'lerle ilişki: çift sayım olmasın, düğme az olsun

**Üç sistemin şeridi (öneri, kural olarak yazılsın):**

| Sistem | Neyi büyütür | Neyi YAPMAZ |
|---|---|---|
| Item (affix, Legendary trait) | Genel statlar: can, zırh, kritik, hız, element %, MP; genel trait | Belirli bir skill'i değiştirmez |
| Set (ileride) | Sınıf pasifi ve kaynağı (sayısal) | Skill işleyişi |
| **Skill ağacı** | **Tek tek skill'lerin** sayıları ve davranışı | Genel stat ve pasif |

- Ağaçtaki "güç %40 -> %44" skill'in kendi katsayısına yazılır; item'lerin "+%X hasar"ı onun üstüne çarpılır. Bu doğal ve öngörülebilir (iki ayrı kova, her biri sınırlı).
- Kritik gibi tavanlı statlarda: ağacın skill'e özel kritik bonusu (`critBonus`) item tavanına (`caps.crit` 15) **sayılmaz** ama düğüm başına en çok +%10 (tasarım kuralı).
- **Az sayıda merkezi düğme** (balance-tester bunları oynatır, tek tek düğüme dokunmaz):
  1. `treeRules.power`: tüm sayısal düğüm farklarını ölçekler (item'deki `affixRules.power` gibi). %10 güç artışı yazan düğüm, power 0,8 iken %8 olur.
  2. **Puan hızı**: level başına puan ve max level (L30 / 29 puan).
  3. **Güç bütçesi** `power-budget.json > tree` sütunu (+%5 / +%15 / +%25) ve ağaç açılınca `activeSystems`'e "tree" eklenir: düşmanlar beklenen ağaç gücünün x0,8'i kadar büyür (mevcut telafi düğmesi).
  4. Endless: `endless.json` içinde dalga başına level (1) ve ölçek.
- **Kazanma oranları kayar:** sefer ve Endless'ta oyuncu güçlenir, düşman ölçeği telafi eder; Quick Battle/MP'de ağaç olmadığı için 4'e 4 sınıf bantları değişmez. Ölçüm:
  - `sim:campaign`: oyuncu vekili için sınıf başına **hazır yapı** (önerilen build) gerekir; vekil puanları ona göre harcar.
  - Her çatal için A ve B ayrı ölçülür: aynı sınıfta iki seçeneğin sefer bitirme farkı en çok ~3 puan olmalı (biri hep seçiliyorsa diğeri güçlendirilir).
  - Ustalıklar: tek bir ustalık sınıfın kazanma oranını bölüm sonunda +5 puandan fazla oynatmamalı.

## B.7 Yeni mekanikler listesi (onay gerekir)

**Bölüm A (ikinci el):**
1. Ailenin eşleştiği tutuş (`pairs`): yay -> Quiver, tılsım -> Gaming Kit / Fetish.
2. Çift el telafisi: `grip: two` silahta affix değerleri x1,5 (seçenek b).
3. Affix yuva izinleri: b_pen ve c_eva sadakta; b_crit, b_critdmg, a_keen Gaming Kit'te.
4. İmza affix'leri: Spare Arrow (temel saldırıya repeatChance), Long Fletching (Sharpshooter'a ek), Weighted Odds (bahis kazanma şansı), Charmed Life (Lucky Escape şansı), Ill Portent (ek Omen şansı), Grave Wick (Wither hasarı).
5. İkinci adım (A kademesi, tamamen yeni): Steady Draw, House Edge, Long Shadow.
6. Legendary etkileri: Hawk's Volley (her 3. saldırıda yankı), Fortune Smiles (ilk bahis kesin kazanır, YENİ), Seventh Night (Doom komşularını Jinx'ler).
7. `usableWeaponChance` ikinci el düşüşüne de uygulanır.
8. Çizim: "back" bağlantı noktası (sadak) + ikinci el prop katmanı (zaten planlı).

**Bölüm B (ağaç):**
1. Level / XP sistemi (roadmap aşama 2; ağacın ön şartı).
2. Ağaç verisi + "skill değiştirici" katmanı: savaştan önce skill verisine sayı farkları uygulanır (çoğu düğüm bu: veri işi). Skill tooltip'i ve önizleme değişmiş sayıyı göstermeli.
3. Gerçekten yeni motor kuralları (az): Mark of Ruin (Omen başına hasar), Creeping Doom (DoT'tan Omen), Hex Knot ve Crooked Fate (Jinxed varyantları).
4. Mevcut mekaniklerin skill'e bağlanması (küçük motor işi): öldürünce Haste / cooldown sıfırlama, yanındaki dostlara Haste, ikinci hedef yankısı, yarım tur ultimate, komşu patlama hasarı.
5. Endless'ta dalga başına level ve koşuya bağlı ağaç.
6. Sıfırlama kuralı (kasaba/dinlenme ücretsiz).
7. Sim için sınıf başına hazır yapı (ayrıca oyuncuya "Recommended" düğmesi olarak da kullanılabilir).

## B.8 Arayüz taslağı (sözle)

- **Yer:** Gear ekranında kahraman panelinin üstünde iki sekme: **Gear | Skills**. Ayrı bir ana düğme yok (harita ve kasabada zaten Gear var). Harcanmamış puan varsa Gear düğmesinde ve Skills sekmesinde kor elmas rozeti + sayı.
- **Düzen (telefon yatay, 1920x1080 mantıksal):**
  - Üst şerit: sol üstte "◂ Back  Esc"; ortada kahraman adı, sınıf, **Level 7**, "**3 points**".
  - Sol ~%62: **4 yatay satır** (her skill bir satır, ~180 birim yükseklik = rahat dokunma). Satır başında skill ikonu + adı; sağa doğru 5 düğüm: Filler'lar küçük elmas, **çatal** üst üste iki elmas (A üstte, B altta), **ustalık** büyük elmas. Düğümler arasında ince altın çizgi; alınmış düğüm kor renginde dolu, alınabilir olan parlayan kenarlı, kilitli olan soluk + level etiketi ("Lv 12").
  - Sağ ~%38: **ayrıntı paneli**. Seçilen düğümün adı (Cinzel), etkisi (EB Garamond italik), "önce -> sonra" sayılar (ör. "Whirlwind: 69% -> 75% STR"), bedel, düğme **Learn** (kit birincil). Çatalda: "Choosing this locks Bleeding Gale until reset."
  - Alt şerit: **Reset** (yalnızca kasaba/dinlenmede etkin; değilse soluk ve "Reset in towns" ipucu) ve **Recommended** (puanları hazır yapıya göre dağıtır, onay sorar).
- **Dokunma:** düğüme dokun = seç ve ayrıntıyı göster; ikinci kez öğrenmek için Learn'e bas (yanlış dokunmayla puan harcanmaz).
- **Endless:** dalgalar arası ekranda kahraman portrelerinin altında puan rozeti; dokununca aynı Skills paneli açılır (Reset her zaman etkin).
- **Savaşta:** skill tooltip'i ağaçla değişmiş sayıları ve alınmış çatal/ustalığı tek satırla gösterir ("Mastery: Maelstrom").
- **Codex:** sınıf sayfasında ağaç salt okunur gösterilir.
- Tasarım kiti: Twin Formations dili (Cinzel başlık, ince altın çizgiler, kor elmaslar, kutusuz yazı düğmeleri).

---

## Varsayımlar (open-questions'a eklenmeli)

- Çift el silahlara bugün telafi olmadığı kodda görüldü (`equip.ts`: yalnızca ikinci el yuvası kapanıyor); x1,5 tahmini sim ile doğrulanmalı.
- Max level 30 ve bölüm başına 10 level, ilvl ritmine göre varsayıldı; level sistemi henüz tasarlanmadı.
- 4. skill'in "ultimate" olduğu `a_ultcd` affix'inden ve cooldown yapısından çıkarıldı.

---

# BÖLÜM C: LEVEL / XP SİSTEMİ TASLAĞI (ÖNERİ, 2026-10-12)

Ömer'in kararları (future-ideas 2026-10-12): max level **30**, her level **1 ağaç puanı** (L30'da 29 puan), Endless aynı ağacı kullanır ama puanlar **koşuya ait**, düşmanlarda ağaç yok, çatal yalnızca sıfırlamayla değişir, **sıfırlama kasaba ve dinlenme durağında ama ALTINLA** (B.3'teki "ücretsiz" önerisinin yerine geçer), ağaçta **pasif yolu olacak** (set item'leriyle çakışmayan etkiler). Bu bölüm ağacın ön şartı olan level/XP'yi önerir. **Tüm sayılar PROVİZYON** (balance-tester ölçecek). Her karar için seçenekler ve öneri (★) var; karar Ömer'in.

## C.0 Bugün

- Kahramanda `level: 1, xp: 0` alanları var, kullanılmıyor. Valdoria (bölüm 1) 26 düğüm: 13 Battle, 3 Elite, 2 Boss, 2 Town, 1 Rest. Tipik rota ~14 zafer (10 Battle + 2 Elite + 1-2 Boss).
- Düşen kahraman zaferde kalkmaz; dinlenmede altınla (20 + 6 x ilvl), kasabada ücretsiz kalkar.
- Güç bütçesi `power-budget.json`: level sütunu bölüm sonlarında **+%10 / +%20 / +%30**, `activeSystems` bugün yalnızca "item".

## C.1 Seferde XP kazanımı

**XP kaynağı** (karar L1):

| | Seçenek | Not |
|---|---|---|
| a ★ | **Kazanılan savaş başına sabit XP, düğüm türüne göre**: Battle 80, Elite 150, Boss 250; bölüm çarpanı x1 / x1,75 / x2,5 | Sade, öngörülebilir; rota seçimi (elit riski = XP) anlamlı |
| b | Öldürülen düşman başına XP (düşman türü x bölüm) | Daha "klasik RPG"; ama çağrılan birimler ve "son vuruşu kim yaptı" sorusu karmaşıklaştırır |
| c | XP yok, **düğüm tamamlayınca level** (milestone) | En sade; ama farm anlamsızlaşır (roadmap 5a: farm = loot + XP) |

- Olaylar (event) seçenek metninde küçük XP verebilir ("+40 XP"); hazine vermez. Yenilgi XP vermez.
- **Farm:** roadmap 2.3 A azalan getiri (%60 / %40 / %25, taban %25) XP'ye de uygulanır (zaten onaylı). 2.3 B **seviye farkı cezası** (bölüm seviyesinin 3+ üstü XP yarı, 5+ üstü %10) burada sorulur (karar L7).

**Yedekteki (bench) kahramanlar** (karar L2):

| | Seçenek |
|---|---|
| a | Yalnızca savaşa giren kahramanlar XP alır |
| b ★ | Savaşa girenler %100, yedektekiler **%50**; takımın en yüksek levelının 3+ altındaki herkes **x1,5** (yetişme) |
| c | Herkes tam XP (fiilen tüm kadro aynı level) |

- Savaşta düşen ama savaşı kazanan takımdaki kahraman **tam XP alır** (★; ceza zaten diriltme altını). Diriltilmeden ceset olarak taşınan kahraman sonraki savaşlarda yedek oranı alır.

## C.2 XP eğrisi (L30'a)

Hedef: **bölüm başına 10 level** (bölüm 1 sonu L10, bölüm 2 sonu L20, bölüm 3 sonu L30), item seviyesi ritmiyle (ilvl 1-30) aynı.

**Eğri biçimi** (karar L3):

| | Seçenek | Sonraki levela XP | L1->10 / L10->20 / L20->30 | Toplam |
|---|---|---|---|---|
| a ★ | **Doğrusal artan** | 100 + 10 x (L-1) | 1.260 / 2.350 / 3.350 | 6.960 |
| b | Üstel | 100 x 1,12^(L-1) | 1.478 / 4.867 / 15.115 | ~21.460 (bölüm çarpanı çok büyümeli, farm cezası sertleşir) |
| c | Sabit savaş sayısı | her level = ~1,4 tipik savaş, XP ödülü bölümle büyür | eşit | hissiyat düz, "geç level zor" yok |

Kontrol (a): bölüm 1 tipik rota 10 x 80 + 2 x 150 + 250 = **1.350 XP = ~L10**; bölüm 2 (x1,75) 2.362 = ~L20; bölüm 3 (x2,5) 3.375 = ~L30. Elitleri atlayan oyuncu bölüm sonunda ~1 level geride kalır, farm ile kapatabilir. L30'da XP birikmez (çubuk "MAX").

**Level, puan dışında ne verir?** (karar L4):

| | Seçenek | Güç bütçesine etkisi |
|---|---|---|
| a | **Hiçbir şey**; stat kaynağı yalnızca item'ler | Bütçenin level sütunu sıfırlanır, ağaç sütunu büyür. En temiz iş bölümü; ama "level atladım, güçlendim" hissi yalnızca puan harcayınca gelir |
| b ★ | **Küçük otomatik büyüme**: level başına taban 4 statın (STR/INT/DEX/LUCK) **+%1**'i (L30 = +%29, tam sayıya yuvarlanır); zırh ve büyü zırhı değişmez | Roadmap'teki level sütunuyla (+%10/+%20/+%30) birebir; item hâlâ en büyük kaynak (+%45) |
| c | Yalnızca ana stat (`primary`) level başına +2 (x2 ölçek) | Basit, sınıf kimliğini korur; can büyümez (tank hissi zayıf) |

## C.3 Endless'ta level

Endless koşusu L1 başlar, **level ve puanlar koşuya ait**, koşu bitince silinir; sefer kahramanı taşınmaz. (karar L5)

| | Seçenek | Ortalama koşu (12-18. dalga) |
|---|---|---|
| a ★ | **Kazanılan her dalga = 1 level** (29. dalga zaferi = L30). "Level = dalga" | L13-19, 12-18 puan: filler'lar + 2-3 çatal + belki 1 ustalık |
| b | Dalga başına XP, seferle aynı eğri x hız çarpanı; elit/boss dalgası ek XP | Esnek, ama oyuncunun kafasında hesap zor |
| c | İlk 10 dalga her dalga 1 level, sonra 2 dalgada 1 | Geç oyun yavaş; L30'a erişilmez (reach30 hedefi zaten %0-5) |

- B.3'teki "boss dalgası +1 puan" önerisi (a) ile **kalkar** (L30 tavanını aşardı). 3 karttan 1'deki "skill puanı" kartı yerine isteğe bağlı **"+1 level"** kartı.
- Endless'ta sıfırlama (karar L8): kamp ekranında **koşu altınıyla** (★, seferle aynı dil) / yalnızca tüccar dalgalarında / ücretsiz.

## C.4 Düşen kahraman ve yeni katılan

**Düşen kahraman** (karar L6):

| | Seçenek |
|---|---|
| a ★ | Level/XP kaybı yok (ceza: diriltme altını + ceset yedek XP oranı alır) |
| b | O levelda biriken XP'nin %50'si gider (level düşmez) |
| c | Diriltilene kadar XP alamaz |

**Yeni katılan (recruit)** (karar L6b):

| | Seçenek |
|---|---|
| a | Level 1 |
| b ★ | **max(bölüm başlangıç levelı, takım ortalaması - 1)**, XP o levelın başında, **puanlar harcanmamış** (oyuncu dağıtır) |
| c | Takımın en yüksek levelı (en cömert; kadro değiştirmek bedava olur) |

## C.5 Kayıt verisi

- Kahraman: `level`, `xp` (var), yeni `skillPoints` (harcanmamış), `tree` (düğüm -> alındı; çatalda seçilen harf). Sefer: `resetCount` (sıfırlama fiyatı artacaksa).
- Şema sürümü 2 -> 3. Eski kayıtlar (karar L9): **a ★ tamamlanmış düğümlerden geriye dönük XP hesaplanır** (ilerleme kaybolmaz) / b herkes L1'de kalır.
- Endless: koşu kaydında kahraman başına `level`, `tree`, `skillPoints` (koşu bitince silinir).
- Saf fonksiyonlar `xpForNext(level)`, `levelFromXp(xp)`; sayılar yeni `data/campaign/progression.json` (öneri) içinde, koda gömülmez.

## C.6 Arayüz

- **Zafer ekranı:** her portrenin altında ince altın **XP çubuğu**; kazanılan XP ~0,8 sn'de dolarak akar, "+150 XP" EB Garamond italik. Yedekteki kahramanlar küçük satırda "+75 XP (bench)".
- **Level atlama anı:** çubuk dolunca portrede kor kıvılcım patlaması + "LEVEL 7" (Cinzel, altın), altında "+1 Skill Point" kor elması. Birden çok level tek animasyonda: "LEVEL 7 → 9". Reduced motion: yalnızca yazı. Ses: kısa koro nefesi / çelik sürtünmesi (medieval kuralı, çan yok).
- **Rozet:** harcanmamış puan varsa harita/kasabada Gear düğmesinde kor elması + sayı; Gear ekranında **Gear | Skills** sekmesi (B.8).
- **Kahraman paneli:** ad altında "Lv 7" + XP çubuğu (dokununca "820 / 1,160 XP").
- **Savaş HUD'ı:** tooltip'te küçük "Lv 7"; ayrı çubuk yok.
- **Endless:** dalga sonrası kamp ekranında aynı çubuk ve level anı; Skills paneli oradan açılır.
- Debug (Campaign): Set level (planlı), Give XP, Level up all, Free reset.

## C.7 Denge: kazanma oranı kayması ve merkezi düğmeler

- Level açılınca `activeSystems`e **"level"** eklenir: düşman ölçeği beklenen level gücünün x0,8'i kadar büyür (düğüm derinliğine göre; oyuncunun GERÇEK levelına göre değil). Beklenen levelda olan oyuncunun kazanma oranı bugünkü hedefte kalır; **fazla level = kolay** (farm ödülü), **eksik level = zor** (elit atlamanın bedeli). Bilinçli kayma; sim:campaign iki profil ölçer (tipik rota / elitsiz rota).
- Quick Battle ve Multiplayer: level YOK; 4'e 4 sınıf bantları (%44-56) değişmez.
- `sim:campaign` oyuncu vekili XP kazanır, level atlar, puanları sınıfın hazır yapısına (Recommended) göre harcar.
- **Merkezi düğmeler** (`progression.json`; balance-tester yalnızca bunlarla oynar):
  1. `xp.rate` genel XP çarpanı (1,0).
  2. `xp.node` (80 / 150 / 250) ve `xp.chapterMult` (1 / 1,75 / 2,5).
  3. `curve.base` 100, `curve.step` 10, `maxLevel` 30.
  4. `levelStats.perLevel` 0,01 (L4 b ise).
  5. `bench.share` 0,5; `catchUp` (3 level, x1,5).
  6. `endless.levelsPerWave` 1.
  7. `reset.cost` = base + perLevel x level (öneri **15 + 4 x level**: L10 = 55, L30 = 135 altın; diriltme fiyatıyla aynı düzende). Her sıfırlamada artsın mı (karar L8b): hayır ★ / her seferinde +%25.
- Ölçüm hedefleri (öneri): bölüm sonu ortalama level 10/20/30 ±1 (tipik rota); seviye farkı cezası açıkken farm ile en çok +3 level.

## C.8 Ağaçla bağlantı (karar mockup sonrası)

- Mockup: Skill Paths / Talent Grid / Specializations / Paths + Spec (WARRIOR örneği) ve aynı yolun üç filler sürümü (skill sayısı / genel stat / karışık). Dosya oturum scratchpad'inde: `skilltree-mockup.html`.
- **Pasif yolu (Ömer kararı):** sınıf pasifine bağlı 5. yol. Set item'leri pasifin SAYISINI büyütür (Berserker +%80 -> daha fazla); pasif yolu pasifin **tetiklediği yeni davranışlar** verir (ör. düşük canda Rage kazanımı, ölümcül vuruşu bir kez 1 canla atlatma, Berserker bonusunun yarısını komşu dosta yayma). 5 yol x 10 = **50 puan**, elde 29: oyuncu yaklaşık 3 yolu doldurur. (Mockup sayaç "29 / 40"ı 4 skill yolu için gösterir, pasif yolu ayrıca eklenir.)
- Pasif yolundaki bazı etkiler **YENİ MEKANİK**tir (ölümcül vuruşu 1 canla atlatma Gambler'ın Lucky Escape'ine yakın; komşuya pasif yaymak ve "canı %50 altında alınan hasar -%8" yeni): onay gerekir.
