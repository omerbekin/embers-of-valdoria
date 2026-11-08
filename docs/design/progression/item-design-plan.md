# Item Design planı ve kararlar (Ömer 2026-11-01)
> **Ne için / Güncel mi (2026-11-08):** Item Design sırası, Trinket yuvası, set ve affix kararları. CANLI sahip; `items.md` ile çelişirse bu belge geçerli. Alan durumu: `docs/arch/areas/item-design.md`.

Sahip: Item Design sohbeti. Form: https://claude.ai/artifact/4NRvdHvZtQZEesdVuYU4J2 (db `picks/main`). Bu belge `items.md` ile çelişirse bu belge geçerlidir; iş bitince `items.md` güncellenir.

## Sıra (A1)

1. Affix ölçüm aracı (her affix'in gerçek güç değeri)
2. Trinket yuvası
3. Affix dağılımı
4. Affix dengesi
5. Set sistemi ve iki pilot set
6. Kalan setler, yeni tabanlar, sanat
7. Son denge, mob telafisi

## Trinket yuvası

- **T1:** Ring kalıcı güç verir (ana stat, MP, regen, hasar). Trinket koşullu güç verir (savaş başı, öldürme, düşük can, destek). Yeni kural yok, mevcut affixler paylaşılır.
- **T2:** Cursed item'ler 1.0 sonrasına kaldı.
- **T3 (2026-11-01 güncel):** Yuvalar Ring ve Trinket, ayrı Kolye yuvası yok. Bugünkü item'lerin görselleri yeniden hazırlanıp Ring olarak düzenlenir, uygun olanlar Trinket'te kullanılır. Liste aşağıda, "Ring ve Trinket dağılımı". Eski kayıtlardaki takılar aynı kurala göre taşınır, hiçbir item kaybolmaz.
- **T4:** Fazladan yuvanın gücü ölçülür, mob can ve hasarıyla telafi edilir.
- **T5 (yeni kural onaylı):** Yuva baştan açık değil, seferde Harita 2'de Reedgate'te açılır. Harita 1'de Trinket düşmez, tüccarda da çıkmaz. Harita 2'de Reedgate'ten önce düşebilir, yuva açılana kadar çantada bekler (Ömer 2026-11-01). Endless'ta yuva baştan açıktır.

## Seçilen set bonusları (2026-11-01, yeni kural onaylı, sayılar örnek)

- **Ashguard Vigil:** Banked Coals. Son kural aşağıda, "Set Pilot son seçimleri".
- **Raven's Shroud:** Unseen.
- **Conclave of Embers:** The Conclave Answers.
- **Gallows Pact:** Hangman's Rope.
- **Kingsfall Regalia:** Royal Command.
- **Wayfarer's Oath:** Road Hound.

## Set Pilot son seçimleri (Ömer 2026-11-03)

**Sayılar ölçülmedi.** Hiçbiri simde denenmedi; motor gelince ölçülür. Veri `data/items.json > sets`. `setsEnabled` kapalı, oyuncu görmez.

### Ashguard Vigil

Parçalar: Ashguard Helm, Ashguard Hauberk, Ashguard Gauntlets, Ashguard Greaves.

| Parça | Bonus |
|---|---|
| 2 | +3 Armor, +2 Magic Armor |
| 3, Warrior | Berserker `perHpPercent` 0,4 → 0,5 |
| 3, Defender | Bulwark Aura `pct` 0,4 → 0,5 |
| 3, Paladin | Divine Light `power` 0,27 → 0,32 |
| 4 | Banked Coals |

Banked Coals:

- Armor sonrası hasarın yarısı bankalanır.
- Her vuruşun kendi 3 turluk eşit tiki olur. Örnek: 40 hasar = 20 hemen, 6,7 x 3.
- Tikler toplanır, süre sıfırlanmaz.
- Köz hasarının türü vuruştan gelir.
- Fortified ve Blessed köz hasarını azaltmaz.
- Köz öldürebilir.

### Wayfarer's Oath

Parçalar: Milestone Boots, Drover's Gloves, Drover's Signet.

| Parça | Bonus |
|---|---|
| 2 | Tur başına +0,75 can |
| 3 | Road Hound |

Road Hound:

| Değer | Sayı |
|---|---|
| Can | 2,0 x takanın ana statı |
| Hasar | 0,5 x takanın ana statı |
| Hız | 17 |
| YZ | `aggressive` |

- Ana stat item hariç sayılır (Skeleton ve Treant kuralı).
- Her çağrı gibi x2 hasar alır (`formulas.summon.damageTakenMultiplier`).

### Motor adımı (yapıldı, bayrak kapalı; dal agent/sets-engine)

Kod: `src/progression/sets.ts`, `data/items.json > setItems` (parçalar), `battle.ts > bankCoal / applyCoalTicks / spawnSetHounds`. `setsEnabled` false; parçalar yalnızca Debug > Campaign > Give pilot sets ile gelir, bonuslar parçayla çalışır. Bayrak düşüşü ve Codex yazısını açar.

**Banked Coals**

- Düşman skill vuruşunda zırhtan sonraki hasarın `bankShare`i aşağı yuvarlanır, kalan anında. 40 hasar: 20 + 7, 7, 6.
- Tik taşıyanın kendi tur başında, DoT'lardan hemen sonra; `test` modunda eylem sonunda. Her tik yuvarlanır, kalan son tikte.
- DoT, zemin, kendi hasarı ertelenmez. Tik kalkana düşer, Lucky Escape çalışır, Fortified / Blessed düşmez, öldürebilir. Ölünce korlar söner.
- Rozet durumu `banked_coals`: bekleyen toplam (stacks), silinmez.

**Road Hound**

- `data/summons/road_hound.json` (görünüş Grey Wolf, zırh 6 / 0, Skeleton gibi). `summonerScale.from: primary`, `damage` eklendi.
- Kurucuda, her iki modda: taşıyanın bitişiğindeki boş hücre (öndeki sıra önce), bir tane, savaşta geri gelmez. Boş hücre yoksa gelmez.
- Kayıtlı set birimi `content.setSummons`, skill listesi Codex'te bayrak kapalıyken gizli.

**Düşüş (`rollRareDrop`, `setPools`)**

- Boss ve Endless yok. Asıl düşüren elit: `split.set`. Diğer düğüm: Legendary dalı x `setOfLegendary` (0,5), harita havuzundan. Takımda (roster) takacak sınıf yoksa o sınıf seti düşmez.

**Yapılmayan**

- Hover tooltip'inin (floatTip) pasif metni yamayı göstermez, çubuk ipucu gösterir.
- `setsEnabled` açmak ve sayıların ölçümü (sim) Ömer'in onayıyla.

### Kalan 4 set, Sadak, Focus Orb (Lead 2026-11-07, sayılar ÖLÇÜLMEDİ)

- **Kingsfall Regalia** (nötr, Valdoria / Black Cathedral, Helm Armor Ring): 2 parça +12 Max HP +0,25 HP Regen; 3 parça +30 Max HP, +2 Armor, +2 Magic Armor, -0,5 Speed.
- **Gallows Pact** (Gambler, Hexer; Drowned Reach / Hag's Island): 2 parça +4% Lucky Escape +2% Crit; 3 parça Hexer Ill Omen 2 -> 3 Omen, Gambler Double or Nothing %25 -> %30; 4 parça +20% Crit damage, +6% Lucky Escape, -20 Max HP.
- **Raven's Shroud** (Cutthroat, Archer, Anti-Mage; Drowned Reach / The Wrecker's Hall): 2 parça +4% Evasion +3% Crit; 3 parça Opportunist %25 -> %30, Sharpshooter 0,05 -> 0,065 / sıra, Spellbreaker 0,10 -> 0,13; 4 parça +0,5 Speed, +6% Evasion, -3 Armor.
- **Conclave of Embers** (Mage, Druid, Undead, Vesper; The Hollow Crown / Hierarch's Pulpit): 2 parça +12 Max MP +1 MP Regen; 3 parça Heat Mirage 0,361 -> 0,43, Nature's Grudge 0,15 -> 0,18, Vampiric Bite 0,5 -> 0,6, Pealing Bells 0,07 -> 0,085; 4 parça +20 Max MP, +1 MP Regen, -20 Max HP.
- Adlı özel kurallar (Ömer 2026-11-07 seçimleri, set-rules-proposal B1-B4; sayılar `data/items.json` > sets, YZ payları `data/ai.json` > value.setRules / global.command):
  - **Unseen** (Raven's Shroud 4, `dodgeCrit`): taşıyan bir vuruştan kaçınınca sonraki skill kullanımı kesin kritik (alan skill'inde her vuruş); kullanım bitince söner.
  - **Hangman's Rope** (Gallows Pact 4, `escapeStatus`): Lucky Escape ölümcül vuruşu yok sayınca 1 tur Fortified.
  - **The Conclave Answers** (Conclave of Embers 4, `counterAttack`): düşman taşıyana skill kullanınca taşıyan temel saldırısıyla (ilk skill, tek hedefli hasar) %50 güçte bedava karşılık verir; taşıyanın turları arasında 1 kez; menzil / ön sıra / taunt normal; sersem, buzda, yerin altında ya da Silence'ta (MP bedelli temel) karşılık yok.
  - **Royal Command** (Kingsfall Regalia 3, `allyTurn`): savaşta bir kez global eylem: taşıyanın turu harcanır, seçilen dost hemen ek tur alır (sayacı değişmez). test modunda yalnız hak harcanır.
- Eski not: başlangıçta yeni mekanik yoktu; yalnız mevcut stat anahtarları ve mevcut pasif alanları.
- **Sadak / Focus Orb:** ikinci el item'i, `pairs` alanı (`bow` / `charm`), ailesi silahınki (bows / charms). Yay yalnız Sadak, tılsım yalnız Focus Orb, çift el hiçbirini almaz; uymayan ikinci el silah değişiminde torbaya çıkar. Sadak yalnız Archer, Focus Orb Gambler + Hexer. 4'er taban (Common -> Epic), örtük stat yok, Block affix'i çıkmaz. İmza affix'lerden **Spare Arrow** yapıldı (Ömer 2026-11-07 C1, `b_sparearrow`, B kademe, yalnız Sadak: `pairsOnly: bow`; 0 MP temel saldırının vuruşu %8-12 (ilvl 1 -> 41) şansla aynı hedefe bir kez daha, `fx:basicRepeat`); diğerleri (Long Fletching, Weighted Odds, Ill Portent, Grave Wick) YAPILMADI. Sırtta sadak çizimi (poz bağlantı noktası) yapılmadı.
- **Equip best:** torba ya da ekipmanda set parçası varsa her set için "setin en iyi parçaları + kalanı açgözlü" planı denenir, toplam puan (yuva puanları + `setBonusScore`) yüksekse seçilir. Değerleme `items.json > setValue` (sınıf satırı 2,5 IP, kural 4 IP, statlar affix IP'leriyle), PROVIZYON.

**İki set**

- Set item'leri katalogda yok: affix (C, C, B), ilvl, ikon, çizim.
- Düşüş oranları ölçülmedi.
- Takılı parça sayımı, ipucu satırları, YZ değerlemesi yok.

## Set kuralları, 2. tur (2026-11-01; S5'in boss kısmının yerine geçer)

- **Parça eşiği:** 2 + 3 + 4. 2 parça ortak stat, 3 parça pasif büyütme, 4 parça eşsiz kural. 3 parçalı nötr setlerde 2 parça ortak stat, 3 parça eşsiz kural (Ömer onayı 2026-11-01).
- **Yuvalar:** Sınıf setleri Helm, Armor, Gloves, Boots. Kingsfall Helm, Armor, Ring. Wayfarer Boots, Gloves, Ring.
- **Boss set düşürmez.** Boss tek seferlik, hikâye ağırlığıyla kalır. Set elitlerden ve o haritanın normal savaşlarından düşer.
- **Harita başına 2 set.** Harita 1 setleri geride kalırsa Temper ile yükseltilir.

| Set | Harita | Düşüren elit |
|---|---|---|
| Ashguard Vigil | Valdoria | Deserters' Camp |
| Kingsfall Regalia | Valdoria | Black Cathedral |
| Gallows Pact | Drowned Reach | Hag's Island |
| Raven's Shroud | Drowned Reach | The Wrecker's Hall |
| Conclave of Embers | The Hollow Crown | Hierarch's Pulpit |
| Wayfarer's Oath | The Hollow Crown | Oathkeeper's Court |

## Ring ve Trinket dağılımı (2026-11-01)

- **Ring:** Copper Ring, Pilgrim's Band (Pilgrim's Token'ın yeni adı ve çizimi).
- **Trinket:** Saint's Medal, Ashen Locket, Rabbit's Foot, Wolf-Tooth Charm, Flashpowder Locket, Clapper of the Sunken Bell, Heart of the Forge.
- **Yer:** Trinket yuvası Reedgate'te açılır.
- **Yeni tabanlar:** Maces ailesine iki çift el: Great Mace (Common, ilvl 4, bakır görünüm kalır), Long-Hafted Mace (Rare, ilvl 10).
- **Çekiç ikonları:** War Hammer, Horseman's Hammer, Templar's Hammer kendi çizimlerini alır (Ömer 2026-11-01).

## Bekleyen kararlardan gelenler (2026-11-01)

- **Yetişme bonusu:** Şimdi yok. Set düşüş oranları ölçülünce gerekirse eklenir.
- **Oynanmayan sınıf:** Yalnız kadrodaki sınıfların setleri düşer.
- **Sadak ve Focus Orb:** 6. adımda yeni eşya olarak yapılır; imza stat'ları da onlarla gelir.
- **Warrior çift el:** Maces ailesine Legendary olmayan çift el silahlar eklenir, yeni ikonlarla. Ölçüm: seviye 4'ten sonra Warrior silah düşüşlerinin %36'sı çift el.

## Affix dağılımı

- **D1:** Yuva kimlikleri formdaki tablodaki gibi; tam tablo Ömer onayıyla uygulandı (2026-11-01, `data/items.json > affixDefs`), Battle aura Off-hand'den çıktı. Çift el ağırlığı 2,5 kaldı (Ömer 2026-11-01).
- **D2:** 6 element direnci tek çekiliş hakkı: önce "direnç" çıkar, sonra element seçilir.
- **D3:** Her yuvada çıkan 6 A affix (Primary, All attributes, Recovery, Swift ultimate, Immunity, Endurance) 2-3 yuvaya iner. Ömer'in 2026-10-13 "her yuvada" kararının yerine geçer.
- **D4:** Sınıfa uygun affix ağırlığı (2 kat) B ve A kademelerine de yayılır, hiçbir affix tamamen kapanmaz.

## Affix dengesi

- **B1:** İki tur ölçüm: 75 affix'in hepsi ön saf, arka hasar ve destek kahramanında kaba tarama, sonra uçlara uzun ölçüm; sefer ve Endless. Her simden önce Ömer'e sorulur.
- **B2:** Seviyeyle büyümede yalnız ölçümde uç çıkanların eğimi kısılır.
- **B3:** Yeni tavan yok, eski tavanlar kalır. Fazla güçlü olanın değeri ve ödünleşmesi değişir.
- **B4:** Gold find (`c_gold`) ve Experience (`c_xp`) item'lerden kalkar. Altın ve XP artışı ileride başka bir kaynaktan gelebilir (`future-ideas.md`).

## Set kuralları

- **S1:** 4 sınıf grubu seti ve 2 nötr set; önce 1 sınıf ve 1 nötr pilot oyunda denenir, sonra gerisi.
- **S2:** 3-4 parçalı setler olur, nötrler genelde daha az parçalı. Sınıf setleri 4 parça, iki nötr set 3 parça.
- **S3:** Set parçasının affixleri sabit C, C, B. Epic'in A'sı yok, yerine set bonusu var. Değerler seviye ve zarla.
- **S4 (yeni kural onaylı):** Küçük bonus ortak stat. Tam set bonusu sınıfa göre ayrı satır; ipucunda takana ait satır parlak.
- **S5 (yeni kural onaylı):** Belirli boss ya da elit belirli seti düşürür (asıl kaynak). Ek olarak normal savaşlarda, Legendary şansının %50'si kadar, o haritanın setinden bir parça düşebilir. Böylece parça için boss ya da eliti kesmek zorunlu değildir.
- **S6:** Temper olur, Reforge ve Combine olmaz.
- **S7:** Legendary ile set aynı kahramanda serbest. Kahraman başına 1 Legendary kuralı aynen.
- **S8:** Set item'leri Endless'ta düşmez; Endless'ta geriye dönük farm yok.

## Set içeriği (2. tur bekliyor)

Altı set de yapılacak: Ashguard Vigil, Raven's Shroud, Conclave of Embers, Gallows Pact, Kingsfall Regalia, Wayfarer's Oath. Ömer'in notları:

- Dört sınıf seti: parça sayısı 1 artar (3 yerine 4).
- Ashguard Vigil, Raven's Shroud: bonusların gücü artar.
- Gallows Pact: Hexer'in bonusu değişir.
- Kingsfall Regalia, Wayfarer's Oath: 3 parça bonusu değişir. Ömer: "tamamlanmış setler oyunda hiç olmayan eşsiz özellikler vermeli". Bu, sınıf setlerine de uygulanıp uygulanmayacağı 2. turda sorulur; önceki "set yalnızca pasif ve kaynak sayılarını büyütür" kuralı bununla birlikte yeniden yazılır.

## Affix dengesi, 1. tur sayıları (Ömer 2026-11-02): hazırlandı, gönderimden geri tutuldu
Speed % / Quick start / Mana shield / Victor's breath kısılması ve Piercing blows / Immunity yükseltmesi hazırdı (yama: Item Design scratchpad affix-round1.patch), Ömer silah işinden ayırdı. Min-max aralığı kararı ve sim sonrası uygulanır.
