# Harita 2 ve 3: The Drowned Reach / The Hollow Crown (TASLAK, Ömer onayı bekliyor)

Durum: **ONAYLANDI (Ömer 2026-10-20, karar formu https://claude.ai/artifact/SfCQKJLkNNJuuxUGJG2P2h). Yapım zamanı: 1.0 SONRASI** (Ömer notu: "Tüm planı not al. 1.0 sonrası yapılacak"). Hiçbir veri/kod yazılmadı; bu belge tam plan ve 7. bölümdeki sırayla yapılır (`campaign-dev` iskelet + geçiş → engine-dev mekanikler → content-designer mob kartları → art-pipeline). Oyun içi adlar İngilizce, açıklamalar Türkçe. Sayılar PROVİZYON (denge balance-tester'ın işi).

**Ömer'in kararları (form, 2026-10-20):** Harita 2 = The Drowned Reach, Harita 3 = The Hollow Crown; iki taç omurgası; bitiş seçimi Mend/Quench VAR; boyut 83/86; boss sayısı 3/4; iki final bossu arasında dinlenme YOK; **M-A'dan M-Q'ya tüm mekanikler EVET** (Darkness tam sürüm: hedefleme kısıtı + Lantern; zorla hareket M-N2 EVET: Hook kahramanı ön sıraya çeker; Tidewater Urn EVET; kesit harita EVET; harita geçişi "Continue to..." EVET); Pyre Witch Kindling = **hasar sürümü** (yanan hücre başına +%5 hasar, MP yok); sanat **TAM** (lean değil); mob dengesi ~9 yeni / ~8 gelişmiş / ~9 aynen uygun; ilk adım = Harita 2 iskeleti + geçiş.

Ömer'in isteği (2026-10-20): 2. ve 3. harita birbirini takip etsin, 1. haritanın devamını getirsin; ufak yeni mekanikler ve zorluklar; farklı ortamlar; moblar tekrar edebilir / alternatif gelişmiş hâl / tamamen yeni; her harita 1. haritanın en az 3 katı (1. harita 27 düğüm → en az 81); özgün ol, çıtayı yüksek tut.

---

## 1. Üç haritanın yayı: Kül, Tuz, Taş

| Harita | Ad | Element / his | Başlık ipucu |
|---|---|---|---|
| 1 | **Valdoria** (var) | Kül · ateş · yanan toprak · kuzeye tırmanış | Lord Morvane'nin Crown of Ash'i |
| 2 | **The Drowned Reach** (Boğulmuş Kıyı) | Tuz · su · gelgit · doğuya, nehir boyunca denize iniş | Crown of Salt; Sunken Court |
| 3 | **The Hollow Crown** (Oyuk Taç) | Taş · buz · karanlık · kuzeydeki dağa tırmanış, sonra dağın içine iniş | Hearthcrown; the First Hearth |

**Hikâye omurgası ("iki taç").** Morvane öldü ama Crown of Ash ne yandı ne kırıldı. Castle Morvane'nin mahzeninde bir nehir haritası ve Morvane'nin elinden tek satır: *"If I fall, carry it to the sea. The Tide must never wear it."* Morvane bir fatih değil, üçüncü **Crownbearer**'dı: taç bir kafestir; içinde Valdoria'nın kurucularının dağdan çıkarıp bir daha söndüremediği **Ember of the First Hearth** yatar. Taşıyan içten içe yanar ve Ember'ı doyurmak için toprağı yakar. Kurucular tacı ikiye bölmüştü: **Ash** (ateş yarısı, dağda/kuzeyde) ve **Salt** (su yarısı, denizde, Maredh'in batık sarayında). Morvane ölünce Ash yarısı sahipsiz kaldı; Tide (deniz) kendi yarısıyla ona uzanıyor: Grey Tide yükseliyor, boğulanlar kıyıya yürüyor.

- **Harita 2 sonu:** Drowned Queen (Crown of Salt'ı takan) yenilir. İki yarı bölüğün elinde; yarılar birbirini çeker ve **kuzeye**, dağa doğru. *"What was split must be mended, or ended."*
- **Harita 3 sonu:** The First Hearth'te Hearthwarden (ocağa kaynamış ilk kral) ve ardından Ember'ın kendisi. Final seçimi (isteğe bağlı, form): **Mend** (bir kahraman tacı takar, Valdoria'nın yeni Crownbearer'ı olur; bitiş metni ağır) ya da **Quench** (iki yarı ocağa atılır, Harita 2'den taşınan Tidewater ile söndürülür; Valdoria tacı olmadan kalır). İki metin, iki unvan; mekanik fark yok.

Harita 1'in bitiş yazısı ("The Ash Curse is broken. Valdoria is free again.") Harita 2 açılınca "...so you believed." tonuyla devam eder; Harita 1'in metni değişmez.

Bu omurganın alternatifi (form sorusu): Harita 2 = **Greyhaven**, başkent (şehir haritası: sokaklar, kanalizasyon, katakomb, arena; Ash bir darbenin örtüsüydü, Naip tacı istiyor). Ortam olarak çok farklı ama insan düşman ağırlıklı ve mob çeşidi dar; önerim Drowned Reach.

---

## 2. Her iki harita için ortak kurallar

- **Boyut:** Harita 2 = 83 düğüm, Harita 3 = 86 düğüm (Harita 1: 27). Her harita 6 bölge (region), bölge başına 12-17 düğüm; her bölgede 1-2 çatal, en az 1 isteğe bağlı cep (çıkmaz dal: elit ya da korunan hazine; serbest dolaşım + farm için).
- **Düğüm türleri:** var olanlar (battle, elite, boss, town, treasure, event, rest, merchant) + yeni **crossing** (deniz/göl geçişi: güvertede savaş, devriye oynanır; Harita 2 ve Harita 3'te 1 kez).
- **Level:** Harita 2 = L11-20, Harita 3 = L21-30 (levels.md bölüm kuralı). Bölge başına ~1,6 level; ilk bölgenin ilk 3 düğümü bir alt level (geçiş yumuşak). Kahraman farmsız harita sonunda tavanın 1-2 altında kalır; elitler hafif, bosslar ciddi farm ister (future-ideas 2026-10-12 kuralı).
- **Boss sayısı:** Harita 1'de 2; Harita 2'de 3 (bölge sonu + final), Harita 3'te 4 (iki final düğümü art arda). Boss zaferi tam şifa (var olan kural), iki final düğümü arasında dinlenme YOK (seçenek: form).
- **Dalgalar:** var olan ekleme kuralı aynen (normal 2, elit 2, boss 3 Round). Elit ve boss eşlikçileri her düğümde farklı (Harita 1 kuralı).
- **Kasabalar:** her haritada 3-4 kasaba; her kasabada demirci, tüccar, kışla (recruit), ateş başı ve 1 hikâye NPC'si. Odo (tüccar) Harita 2'de Saltmere'de "Odo's Chandlery" ile döner, Harita 3'te Kharduin'de.
- **Mob kuralı (Ömer 2026-10-16 yönü sürüyor):** her haritada yeni sıradan mob 8-9; gelişmiş sürüm 7-8 (aynı çizim/palet + 1 skill ya da pasif değişir); aynen dönen 8-10. Oynanabilir sınıf skill'leri kopyalanmaz. MP yenileme/çalma pasifi yok.
- **Mekanik ilkesi:** her haritanın tek bir ana "savaş koşulu" (battle condition) ve ona bağlı bir durum var: Harita 2 **Tide + Flooded ground / Soaked**, Harita 3 **Blizzard/Darkness + Chill**. Harita 1'in Burning ground'u iki haritada da anlam değiştirir: suda söner, buzda ısıtır. Yeni mekanikler 5. bölümde tek tek onaya sunulur.

---

## 3. Harita 2: THE DROWNED REACH

**Başlık / alt başlık / blurb:** *THE DROWNED REACH · Campaign Map II · From the Long Stair to the Throne of Brine: 83 stops, 6 regions.*
**Giriş metni (EN):** *"The ash has settled over Valdoria, but the Crown of Ash would not burn and would not break. In the vault beneath Castle Morvane you found a river chart and a single line in Morvane's hand: 'If I fall, carry it to the sea. The Tide must never wear it.' The river runs east, down the Long Stair, to the Drowned Reach."*
**Harita görseli:** kuş bakışı; solda Northern Heights'ın eteği, ortada nehir ve delta, sağda gri deniz ve adalar, sağ altta yarı batık saray. 21:9 geniş sürüm aynı yöntemle.

### 3.1 Bölgeler

| # | Bölge | Ortam | Savaş arka planı | Ana aile | Düğüm |
|---|---|---|---|---|---|
| I | **The Lower Valdren** | nehir boğazı, hızlı akıntı, taşkın çiftlikler | `river-gorge` | River Reavers (Bandits), Undead | 12 |
| II | **The Saltmarsh** | kamış deltası, kazıklı köyler, tuzlalar, yılan balığı bentleri | `saltmarsh` | Hexes, Beasts, Undead | 15 |
| III | **Saltmere, the Harbor City** | liman şehri, gri deniz, yarı batık katedral | `saltmere-docks` | Dock Rats (Bandits), Corsairs, Order/Guild | 13 |
| IV | **The Wrecking Coast** | falezler, sahte fenerler, gemi mezarlığı | `wreck-cliffs` | Wreckers (Bandits), Beasts | 14 |
| V | **The Drowned Isles** | deniz yolları, adalar, fırtına, manastır | `storm-deck` / `siren-rocks` | Corsairs, Sirens (Hexes) | 15 |
| VI | **The Sunken Court** | Maredh'in batık sarayı, yeşil su, soluk ışık | `sunken-court` | The Sunken Court (Undead) | 14 |

### 3.2 Düğüm listesi

Tür: B savaş, E elit, S boss, T kasaba, Tr hazine (g = korunan), Ev olay, R dinlenme, M tüccar, X crossing (güverte). "opt" = isteğe bağlı cep. Birimler Medium tabanı; dalga takviyesi otomatik.

**I · The Lower Valdren (L10-12)**

| # | Düğüm | Tür | Birimler | Ders / not |
|---|---|---|---|---|
| 1 | The Long Stair | B | 2 Ember Acolyte + Charcoal Burner ("Ash Pilgrims") | tanıdık düşmanla ısınma; tarikat kalıntısı tacı izliyor |
| 2 | Ferrymen's Rest | R | | |
| 3 | The Rapids | B | 2 River Reaver + Reaver Archer | Reaver = Moor Raider gelişmiş (Undertow) |
| 4 | Drowned Mill | B | 2 Drowned + Ghoul + Fen Witchling | **ilk Tide savaşı** (M1/M2 öğretilir) |
| 5 | Barge Wreck | Tr-g | 2 Weir Eel + Drowned | Weir Eel sudan ısırır |
| 6 | Floodplain Farms | Ev | seçenek: çiftçilere yardım (savaş: 2 Reaver + Archer; kazan: sandık + altın) / geç | |
| 7 | Tollhouse | E | **Reaver Chief "Hook"** + 2 River Reaver + Reaver Archer | çatal 3→(4|5) burada birleşir |
| 8 | Hangman's Oak | B | 2 Wreck Ghoul + Tide Caller | ilk çağırıcı: Drowned sudan kalkar |
| 9 | Old Weir Road | B | 2 River Reaver + Fen Witchling + Marsh Light | |
| 10 | Widow's Ford | B | 2 Weir Eel + 2 Drowned | Tide ağır |
| 11 | Chapel of the Ford | Tr | opt (10'dan çıkmaz) | |
| 12 | Reedgate | T | | köy; kışla, demirci, ateş başı |

**II · The Saltmarsh (L12-14)**

| # | Düğüm | Tür | Birimler | Not |
|---|---|---|---|---|
| 13 | Reedway | B | 2 Fen Witchling + Marsh Light + Drowned | |
| 14 | Salt Pans | B | 2 Salt Crab + Salt Hag | Crab: Shell; Hag: Call the Tide |
| 15 | Stilt Hamlet | Ev | eel-wives: takas / lore | |
| 16 | Eelwick | T | | kazıklı kasaba; NPC Weir-Warden |
| 17 | The Great Weir | B | 2 Weir Eel + Tide Caller + Drowned | |
| 18 | Hag's Island | E | **Salt Hag Mother** + 2 Fen Witchling + Marsh Light | opt |
| 19 | Sunken Chapel | Tr-g | 2 Wreck Ghoul + Drowned Knight | ilk şövalye (Deathless Tide) |
| 20 | Heron Flats | B | Salt Crab + Weir Eel + Salt Hag + Marsh Light | |
| 21 | The Drowned Causeway | B | 3 Drowned + Tide Caller | |
| 22 | Smugglers' Reeds | Ev | öde / savaş (2 Reaver + 2 Reaver Archer) | |
| 23 | Tidewatch Tower | R | | |
| 24 | Brine Pools | B | 2 Salt Hag + 2 Salt Crab | |
| 25 | Eel-Mother's Lair | Tr-g | 3 Weir Eel | opt |
| 26 | The Weir Mouth | **S** | **The Weir-Wyrm** + 2 Weir Eel | bölge bossu |
| 27 | Saltmere Gate | B | 2 Oathsworn Brother + Censer Monk | Order karantina noktası (Harita 1 ailesi döner) |

**III · Saltmere, the Harbor City (L14-15)**

| # | Düğüm | Tür | Birimler | Not |
|---|---|---|---|---|
| 28 | Saltmere | T | | **HUB**: demirci, Odo's Chandlery, kışla, Ferry Office, Inquisition House, Guild Hall, katedral kapısı |
| 29 | Fishmarket | Ev | söylentiler, küçük takas | |
| 30 | Chandlers' Row | B | 2 Cutpurse + 2 Road Thug ("Dock Rats") | Harita 1 tutorial mobları şehir paletinde |
| 31 | Guild Hall / Inquisition House | Ev | **FACTION seçimi** (M-L): Order ya da Guild | |
| 32 | Harbor Fort | E | Order tarafı: **Guild Enforcer "Bastion"** + 2 Dock Rat + Corsair Slinger · Guild tarafı: **Inquisitor-Captain Vell** + 2 Oathsworn + Censer Monk | seçime göre |
| 33 | Sewer Outfall | B | 2 Wreck Ghoul + 2 Drowned + Marsh Light | |
| 34 | The Drowned Cathedral | B | Drowned Knight + 2 Drowned + Tide Caller | |
| 35 | The Crypt Stair | Tr-g | 3 Wreck Ghoul + Drowned Knight | opt |
| 36 | Chainwalk | B | 2 Corsair Cutlass + Corsair Slinger + Dock Rat | Corsair girişi |
| 37 | The Old Mole | B | 2 Reef Wrecker + Cliff Crossbowman + Reef Hound | |
| 38 | Ferry Office | Ev | **Charter a ship** (M-J): altın ya da faction iyiliği → deniz yolları açılır | |
| 39 | Beacon Quay | R | | |
| 40 | Quarantine Yard | B | 2 Wreck Ghoul + Tide Caller + Salt Hag | |

**IV · The Wrecking Coast (L15-17)**

| # | Düğüm | Tür | Birimler | Not |
|---|---|---|---|---|
| 41 | Gull Cliffs | B | 2 Reef Hound + 2 Cliff Crossbowman | |
| 42 | Wreckers' Beacon | B | 2 Reef Wrecker + Cliff Crossbowman + Salt Hag | |
| 43 | Smugglers' Cave | Tr-g | 2 Dock Rat + 2 Corsair Cutlass | |
| 44 | Bone Beach | B | 2 Drowned + Drowned Knight + Tide Caller | gemi mezarlığı |
| 45 | Lantern Rock | Ev | **fener** (M-M): bu haritada görüş +1 | |
| 46 | Widow's Watch | Ev | gemiyi kurtar (savaş: 3 Reef Wrecker + Crossbowman; kazan: sandık) / wreckers'ın payını al (altın, savaş yok) | |
| 47 | The Hanging Stair | B | 2 Reef Hound + Reef Wrecker + Cliff Crossbowman + Marsh Light | |
| 48 | Wreck of the *Valdren Pride* | B | 2 Corsair Cutlass + 2 Corsair Slinger | **ilk güverte savaşı** (M-I: direk/küpeşte hücreleri kapalı) |
| 49 | Cliff Chapel | R | | |
| 50 | The Wrecker's Hall | E | **The Wrecker-Captain** + 2 Reef Wrecker + Cliff Crossbowman + Salt Hag | |
| 51 | Sea Cave Hoard | Tr-g | 2 Salt Crab + 2 Weir Eel | opt |
| 52 | Saltspray Shrine | Ev | lore + küçük şifa | |
| 53 | Gallows Point | B | 2 Drowned Knight + 2 Wreck Ghoul | |
| 54 | Fisher's Landing | T | | balıkçı köyü; adalara iskele |

**V · The Drowned Isles (L17-18)**

| # | Düğüm | Tür | Birimler | Not |
|---|---|---|---|---|
| 55 | The Sound | X | 2 Corsair Cutlass + Corsair Slinger + Reef Hound | güverte |
| 56 | Monk's Isle | Ev/Tr | Order tarafı: bedava dinlenme + relic · Guild tarafı: savaş (2 Oathsworn + 2 Censer Monk) → sandık | faction |
| 57 | Siren Rocks | B | 2 Siren + 2 Drowned | **Storm** koşulu |
| 58 | Gull Isle | B | 3 Reef Hound + Corsair Slinger | |
| 59 | The Black Caravel | E (gezici) | **Corsair Captain "Marrow"** + 3 Corsair Cutlass + Corsair Slinger | **M-K**: 55/60/62/64 arasında dolaşır |
| 60 | The Narrows | X | Siren + 2 Corsair Cutlass + Corsair Slinger | |
| 61 | Hermit's Skerry | R | | |
| 62 | Open Water | X | 2 Weir Eel + Tide Caller + Drowned | |
| 63 | Pirate Cove | B | 3 Corsair Cutlass + 2 Corsair Slinger | |
| 64 | Storm Strait | X | 2 Siren + 2 Corsair Slinger | Storm |
| 65 | Siren Queen's Rock | E | **The Siren Queen** + 2 Siren + 2 Drowned | opt |
| 66 | Gallows Cove | **S** | **Admiral Vane** + 2 Corsair Cutlass + Corsair Slinger + Siren; yardımcı nesne **Harpoon Ballista** | Caravel yenilince açılır |
| 67 | Salt Monastery Vault | Tr | opt | |
| 68 | Drowned Shoal | B | 2 Drowned Knight + Tide Caller + Brine Maiden | ilk Maiden |
| 69 | The Sunken Stair | Ev | saraya iniş; lore | |

**VI · The Sunken Court (L18-20)**

| # | Düğüm | Tür | Birimler | Not |
|---|---|---|---|---|
| 70 | The Drowned Gate | B | 2 Drowned Knight + Brine Maiden + Drowned | |
| 71 | Hall of Tides | B | 2 Tide Caller + 2 Drowned | çağrı seli |
| 72 | The Salt Garden | Tr-g | 2 Salt Crab + 2 Brine Maiden | |
| 73 | Courtiers' Walk | B | Drowned Knight + Siren + Brine Maiden + Wreck Ghoul | |
| 74 | The Bishop's Chapel | E | **The Salt Bishop** + 2 Brine Maiden + Drowned Knight | |
| 75 | Flooded Library | Ev | lore: Hearthcrown nasıl bölündü; dinlenme sonucu | |
| 76 | Kennels of the Deep | B | 2 Reef Hound + 2 Weir Eel + Tide Caller | |
| 77 | Armory of Maredh | Tr-g | 3 Drowned Knight | opt |
| 78 | The Long Gallery | B | 2 Siren + 2 Drowned Knight + Brine Maiden | |
| 79 | The Champion's Stair | E | **The Drowned Champion** + 2 Drowned Knight + Tide Caller | |
| 80 | Last Camp | R | | |
| 81 | Antechamber | B | 2 Brine Maiden + Tide Caller + 2 Drowned Knight | her şey birlikte |
| 82 | Throne of Brine | **S** | **The Drowned Queen** + 2 Brine Maiden + Drowned Champion (eskort) | final |
| 83 | Two Crowns | Ev | bitiş metni; yarılar kuzeye çeker | |

Çatal/birleşmeler: 3→(4|5)→7; 8→(9|10)→12; 13→(14|17)→20; 28 çevresi yıldız (29-40 Saltmere'ye bağlı); 41→(42|44)→47; 54→(55|60)→63; 70→(71|73)→76. Opt cepler: 11, 18, 25, 35, 51, 65, 67, 77 (8 düğüm).

### 3.3 Moblar

| Mob | Aile | Durum | Rol | Pasif (yeni = **kalın**) | Kit özeti |
|---|---|---|---|---|---|
| Ember Acolyte, Charcoal Burner | Ember Cult | aynen | | Last Ember | 1. düğüm |
| Ghoul ("Wreck Ghoul"), Drowned | Undead | aynen (ad) | ön | Corpse Hunger | |
| Fen Witchling, Will-o'-Wisp ("Marsh Light") | Hexes | aynen | arka | Mire-Bound / Flicker | |
| Cutpurse, Road Thug ("Dock Rat") | Bandits | aynen (şehir paleti) | | Cut and Run | 30, 43 |
| Bandit Crossbowman ("Cliff Crossbowman") | Bandits | aynen | arka | Cut and Run | |
| Oathsworn Brother, Censer Monk | Brann's Order | aynen | | Martyr's Vow / Censer Smoke | Inquisition |
| **River Reaver** | Bandits | gelişmiş Moor Raider | ön | **Undertow**: Flooded hücredeki kahramana vuruşu 1 tur Slow | Raid Cut (aynı) + Boat Hook (tek, menzil +1, Slow) |
| **Reaver Archer** | Bandits | gelişmiş Crossbowman (yay) | arka | Cut and Run | Bolt → Pitch Arrow (tek + 2 tur Burning; suya düşerse söner) + **Fire Volley** (bir sıra hasar + 2 tur Burning Ground, Flooded hücre tutuşmaz; Ömer formu A1 a 2026-10-25, Scatter Quarrels yerine) |
| **Reef Wrecker** | Bandits | gelişmiş Reaver (fener + kanca) | ön | Undertow | Hook + Lantern Flash (bir sıra, 1 tur Shrouded kaybı / isabet -) |
| **Corsair Cutlass** | Corsairs (YENİ aile) | YENİ | ön, DEX | **Boarding**: dalga takviyesiyle girince 1 tur Haste | Cutlass (tek) + Rake (bir sıra, 0,5) |
| **Corsair Slinger** | Corsairs | YENİ | arka | Boarding | Sling Stone (tek) + Pitch Pot (hücre + 2 tur Burning ground) |
| **Salt Crab** | Beasts | YENİ | ön, tank | **Shell**: ilk kritik yiyene kadar zırh x1,5 | Pincer (tek + Slow) + Burrow (kendine Fortified) |
| **Weir Eel** | Beasts | YENİ | ön/sudan | **Slick**: Flooded hücredeyken kaçınma +%20 | Bite (tek, Soaked'a +) + Lunge (arka sıraya, ignoreReach) |
| **Reef Hound** | Beasts | gelişmiş Ash Hound (palet) | ön | Blood Scent | Scorch Bite → Brine Bite (Soaked) + Run Down |
| **Salt Hag** | Hexes | gelişmiş Fen Witchling | arka, caster | Mire-Bound (cadı yaşarken Saltbound kahramanlar %20 yavaş) | **Saltbound** (1 tur: yer değiştiremez/geri çekilemez/hareketli skill kullanamaz, kaçınma 0) + **Call the Tide** (1 sıra Flooded 2 tur) |
| **Siren** | Hexes | YENİ | arka, caster | **Lure**: Siren'ı skill ile vuran kahraman 1 tur **Spellbound** alır (çağrılar almaz) | Lament (tek, Slow) + Chorus (bir sütun hasar + Soaked) |
| **Tide Caller** | Undead | gelişmiş Grave Chanter | arka, çağırıcı | Bone Ward | Call the Buried → **Rise from the Deep** (Flooded hücreye Drowned çağırır) |
| **Drowned Knight** | Sunken Court | YENİ | ön, zırhlı | **Deathless Tide**: Flooded hücrede ölünce bir kez %30 canla kalkar | Rusted Blade (tek) + Shield of Brine (dosta Guard) |
| **Brine Maiden** | Sunken Court | YENİ | arka, şifacı | **Salt Tears**: tur başı Flooded hücredeki dostları %5 iyileştirir | Lament of Salt (tek) + Tidal Mend (tek dost şifa) |

**Elitler (pasif + 3 aktif):** Reaver Chief "Hook" (Undertow + Boarding Hook: arka sıradaki kahramanı ön sıraya çeker → **zorla hareket**, yeni mekanik M-N2; alternatifi: Slow + ağır vuruş) · Salt Hag Mother (Call the Tide 2 sıra + geniş Saltbound; güçlü sürüm, ayrıntı sonra) · Guild Enforcer "Bastion" / Inquisitor-Captain Vell (faction'a göre biri) · The Wrecker-Captain (Lantern Flash geniş + Undertow) · Corsair Captain "Marrow" (gezici; Boarding + Rake) · The Siren Queen (Chorus tüm tahta + Soaked, Lure güçlü sürüm; ayrıntı sonra) · The Salt Bishop (High Priest gelişmiş: Vessel of the Choir yerine Salt Tears geniş) · The Drowned Champion (Deathless Tide x2).

**Bosslar:**
- **The Weir-Wyrm** (dev yılan balığı, tek dev boss): pasif *Slick Hide* (Flooded hücredeyken fiziksel -%30); Lash (bir sıra), Swallow (tek, ağır, telgraflı), Surge (2 sıra Flooded); ult *Deluge* (tüm tahta Flooded 3 tur + hasar). Faz 2 (%60) Surge her 2 turda; faz 3 (%30) 2 eylem.
- **Admiral Vane of the Black Caravel** (lider + eskort, güverte): pasif *Boarding Party* (her takviye dalgası Haste ile girer); Cutlass Flurry, Chain Shot (sütun), Rally (dostlara Haste); yardımcı nesne **Harpoon Ballista** (Iron Mooring gibi: her tur telgraflı hücreye vurur, kırılana kadar). ult *Broadside* (ön sıra + Burning ground).
- **The Drowned Queen** (Crown of Salt): pasif *Crown of Salt* (Crown of Ash'in aynası: tahtadaki her Flooded hücre ona %2 hasar azaltma); Brine Lash (tek, her sıra), Call the Tide (2 sıra, telgraflı), Lament (tüm kahramanlar Slow + Spellbound); ult *The Reach Drowns* (tüm tahta Flooded + hasar, Pyre'ın su aynası, kaçış yok, hazırlık turu). Faz 3'te Drowned Champion yeniden kalkar.

### 3.4 Kasabalar ve olaylar
- **Reedgate** (köy): NPC "the Ferryman": nehrin aşağısında neyin beklediğini anlatır; Order'ın karantinasını haber verir.
- **Eelwick** (kazıklı kasaba): NPC "Weir-Warden Ysolt": Weir-Wyrm'ün sudan çıkış kuralı (Flooded'da güçlü) öğretilir; gift: Eel-oil (küçük item).
- **Saltmere** (hub): Odo's Chandlery; Inquisition House (Brother-Provost) vs Guild Hall (Harbor-Master Rook). **Faction (M-L):** tek seçim; sonuçları: Harbor Fort eliti, Monk's Isle içeriği, tüccar stoku (Order: zırh/relic ağırlıklı; Guild: silah/takı), Ferry Office bedeli (iyilik ya da altın). Bir kez seçilir, geri alınmaz.
- **Fisher's Landing** (köy): iskele; "the Lighthouse Keeper's daughter" NPC: Caravel'in rotasını söyler.
- Seçenekli olaylar: Floodplain Farms, Smugglers' Reeds, Widow's Watch, Monk's Isle, Charter a ship, Flooded Library (lore + dinlenme). Shepherd's Fold şablonuyla aynı veri (choices[]).

### 3.5 Arka plan prompt'ları (ChatGPT, sade/temiz/az şekil kuralı; tek tek, Ömer onayıyla)
- Harita: *"Top-down painted fantasy campaign map of a river delta and grey coast, no text, no labels: a river descending from mountains at the left through a gorge, a wide reed marsh with salt pans, a stone harbour city at the river mouth, sea cliffs with wrecks to the south-east, a cluster of storm-grey islands, and a half-sunken palace on the far right under green water; muted slate, moss and salt tones; clean shapes, few details, no noise; 16:9."*
- Savaş: river-gorge, saltmarsh, saltmere-docks, wreck-cliffs, storm-deck, siren-rocks, sunken-court (7), kasaba sahneleri 4 (Reedgate, Eelwick, Saltmere, Fisher's Landing).

---

## 4. Harita 3: THE HOLLOW CROWN

**Başlık / alt başlık / blurb:** *THE HOLLOW CROWN · Campaign Map III · Up the Frostpeak, down to the First Hearth: 86 stops, 6 regions.*
**Giriş metni (EN):** *"Two halves of one crown pull at your hands, and they pull north. Past Morvane's burnt keep the land climbs into the Frostpeak, and under the ice the dwarves of Kharduin still guard the road down: to the Deep Halls, to the First Hearth, to the fire that was never put out."*
**Harita görseli (özgün):** **dağın kesiti** (yandan görünüm, oyunun kendi diliyle): üst üçte bir karlı zirveler ve buzul (bölge I-II), ortada dev taş kapı ve cüce salonları (III-IV), altta kül tarikatının tünelleri ve en dipte lav ocağı (V-VI). Düğümler yukarıdan aşağı iner; "lift" kenarları katlar arasında dikey yol. 21:9'da yalnızca yanlar genişler. Form sorusu (M-P).

### 4.1 Bölgeler

| # | Bölge | Ortam | Arka plan | Ana aile | Düğüm |
|---|---|---|---|---|---|
| I | **The Snowline** | karlı çam ormanı, donmuş şelale, avcı kulübeleri | `snowline` | Beasts, Hillclans (Bandits), Rime Hexes | 14 |
| II | **The Windwall** | buzul, yarıklar, buza gömülü eski ordu | `glacier` | Frostbound Legion (Undead) | 14 |
| III | **The Dwarf Road** | dev taş kapı, Kharduin salonu, fener galerileri | `kharduin` | Guardians (yaşayan cüceler) | 14 |
| IV | **The Deep Halls** | karanlık harabe, mantar mağarası, güneşsiz göl | `deep-halls` | Hollow (undead cüceler), Beasts | 15 |
| V | **The Ashborn Warrens** | lav tüpleri, tarikat kalesi | `warrens` | Ashborn (Ember Cult), Forgeborn | 14 |
| VI | **The Forge-Heart** | lav, dev örs, the First Hearth | `forge-heart` | The Hearth | 15 |

### 4.2 Düğüm listesi

**I · The Snowline (L20-22)**

| # | Düğüm | Tür | Birimler | Not |
|---|---|---|---|---|
| 1 | Hearthstead Road | B | 3 Snow Wolf | Grey Wolf gelişmiş; Chill ısırığı → **Chill öğretilir** |
| 2 | Hunter's Lodge | R | | |
| 3 | Frozen Falls | B | Rime Witch + Frost-light + 2 Snow Wolf | |
| 4 | Trapper's Line | Tr-g | 2 Clan Axeman + Clan Slinger | |
| 5 | Hearthstead | T | | dağ köyü |
| 6 | The Pinewall | B | 2 Clan Axeman + Clan Skald + Clan Slinger | Skald: War-Chant |
| 7 | Wolf Den | E | **The Pack-Mother** + 3 Snow Wolf | opt |
| 8 | Shrine of the Hearth | Ev | lore: kurucular ve ocak | |
| 9 | Avalanche Pass | B | 2 Rime Hound + Rime Witch + Clan Slinger | **ilk Cave-in** (M-G) |
| 10 | Ice Cave | Tr-g | 2 Cave Crawler + 2 Frost-light | |
| 11 | Clan Steading | Ev | Hillclans ile pazarlık (altın / savaş: 2 Axeman + Skald + Slinger) | |
| 12 | Chief's Hall | E | **Clan Chief Brannoc** + Clan Skald + 2 Clan Axeman | |
| 13 | The Cairns | B | 2 Wight + Rime Witch + Frost-light | |
| 14 | Snowline Camp | R | | |

**II · The Windwall (L22-24)**

| # | Düğüm | Tür | Birimler | Not |
|---|---|---|---|---|
| 15 | Glacier Foot | B | 2 Frozen Halberdier + 2 Wight | **Blizzard** koşulu başlar |
| 16 | Crevasse Field | B | 2 Rime Hound + 2 Frost-light | |
| 17 | The Frozen Legion | B | 3 Frozen Halberdier + Frozen Crossbowman | Morvane'nin kayıp ordusu |
| 18 | Standard Hill | E | **The Frozen Standard-Bearer** + 2 Frozen Halberdier + Frozen Crossbowman | |
| 19 | Ice Chapel | Tr-g | 3 Wight + Rime Witch | |
| 20 | The White Dark | Ev | fırtına: ilerle (can kaybı) / bekle / odun al (altın) | |
| 21 | Windwall Camp | R | | |
| 22 | Serac Maze | B | 2 Cave Crawler + 2 Rime Hound | |
| 23 | Wyrm Bones | Tr | opt | |
| 24 | The Snowfather's Hollow | **S** | **The Snowfather** + 2 Rime Hound | bölge bossu |
| 25 | Morvane's Bivouac | Ev | Morvane'nin seferi günlüğü (lore) | |
| 26 | Frostbite Ridge | B | 2 Clan Axeman + 2 Rime Witch | klan kaçakları |
| 27 | The Gate Road | B | 2 Frozen Halberdier + Wight + 2 Frost-light | |
| 28 | The Stone Gate | Ev | cücelerin kapısı: Oath | |

**III · The Dwarf Road (L24-25)**

| # | Düğüm | Tür | Birimler | Not |
|---|---|---|---|---|
| 29 | Gatehouse of Kharduin | B | 2 Stonebound Warden + Deep Runecaller | Guardians döner |
| 30 | Kharduin, the Last Hall | T | | Runeforge demirci, Odo, kışla |
| 31 | Hall of Oaths | Ev | Stone Oath: cüceler geçişe izin verir mi (seçenek) | |
| 32 | The Deep Stair | B | 2 Hollow Warden + Cave Crawler | **Darkness öğretilir** (M-F) |
| 33 | Lantern Gallery | Ev | fener kuralı anlatılır; Lantern nesnesi | |
| 34 | Old Mine | Tr-g | 3 Cave Crawler + Hollow Warden | |
| 35 | Oathkeeper's Court | E | **The Oathkeeper** (Thane gelişmiş) + 2 Stonebound Warden + Deep Runecaller | |
| 36 | Collapsed Hall | B | 2 Hollow Warden + Hollow Runecaller | cave-in ağır |
| 37 | The Undercroft | B | 2 Wight + Hollow Warden + Cave Crawler | |
| 38 | Cistern | R | | |
| 39 | Fungus Cavern | B | 3 Cave Crawler + Deep-light | |
| 40 | The Broken Lift | Ev | lifti onar (altın) / aşağı savaşarak in (2 Hollow Warden + 2 Deep-light) | |
| 41 | Shaft Head | B | 2 Ashborn Acolyte + Molten Hound | tarikat ilk iz |
| 42 | Rune Vault | Tr-g | Forge Golem + 2 Hollow Warden | opt |

**IV · The Deep Halls (L25-27)**

| # | Düğüm | Tür | Birimler | Not |
|---|---|---|---|---|
| 43 | Hall of Kings | B | 3 Hollow Warden + Hollow Runecaller | |
| 44 | Treasury Vault | Tr-g | Forge Golem + 2 Hollow Warden | opt |
| 45 | The Sunless Lake | B | 2 Cave Crawler + 2 Deep-light + Blind Eel | Weir Eel gelişmiş (kör) |
| 46 | Boat Crossing | X | 3 Blind Eel + Deep-light | güverte, Darkness + Flooded |
| 47 | Drowned Dwarf Quarter | B | 2 Hollow Warden + 2 Blind Eel | |
| 48 | Lantern Camp | R | | |
| 49 | Ashborn Shrine | B | 2 Ashborn Acolyte + Pyre Witch + Molten Hound | Pyre Witch: Kindling |
| 50 | Pyre Witch's Cell | E | **The Pyre Matriarch** + 2 Ashborn + 2 Molten Hound | opt |
| 51 | The Hollow Throne | **S** | **The Hollow King** + 2 Hollow Warden + Hollow Runecaller | bölge bossu |
| 52 | Kings' Armory | Tr-g | 2 Forge Golem | |
| 53 | Cave-in Gallery | B | 2 Cave Crawler + 2 Hollow Warden | cave-in seli |
| 54 | The Deep Market | M | | son derin cüce tüccarları |
| 55 | The Roots | B | 2 Molten Hound + Forge Golem + Ashborn | |
| 56 | Chain Stair | B | 2 Cinder Knight + Pyre Witch + Ashborn | |
| 57 | Lantern's End | R | | |

**V · The Ashborn Warrens (L27-28)**

| # | Düğüm | Tür | Birimler | Not |
|---|---|---|---|---|
| 58 | Lava Tube | B | 3 Molten Hound + Ashborn | **Heat** koşulu başlar |
| 59 | Cinder Gate | B | 2 Cinder Knight + 2 Ashborn | |
| 60 | Kiln Chapel | Tr-g | 2 Forge Golem + Pyre Witch | |
| 61 | Hierarch's Pulpit | E | **The Ashborn Hierarch** (Ember Hierophant gelişmiş) + 2 Pyre Witch + Cinder Knight | |
| 62 | Cooling Pools | R | | |
| 63 | Bridge of Chains | B | Forge Golem + 2 Cinder Knight + Pyre Witch | |
| 64 | Ash Catacombs | B | 2 Wight + 2 Ashborn + Molten Hound | |
| 65 | The Forge Gate | E | **Forge-Master Golem** + 2 Forge Golem + Cinder Knight | |
| 66 | Warren Hoard | Tr-g | 3 Molten Hound | opt |
| 67 | Sermon Hall | Ev | tarikatın son vaazı: lore; Morvane niye taşıdı | |
| 68 | Slag Fields | B | 2 Cinder Knight + 2 Pyre Witch | |
| 69 | Pilgrims' Stair | B | 3 Ashborn + Pyre Witch + Molten Hound | |
| 70 | Vault of the First Kings | Tr-g | 3 Forge Golem | opt |
| 71 | Last Lantern | R | | |

**VI · The Forge-Heart (L28-30)**

| # | Düğüm | Tür | Birimler | Not |
|---|---|---|---|---|
| 72 | Ember Stair | B | 2 Molten Hound + Forge Golem + Ashborn | |
| 73 | Furnace Hall | B | 2 Cinder Knight + Pyre Witch + Forge Golem | |
| 74 | The Anvil Road | B | 2 Forge Golem + Cinder Knight + Ashborn | |
| 75 | Crown Gallery | Ev | lore: tacın bölünüşü; Tidewater hatırlatılır | |
| 76 | Magma Bridge | B | 2 Molten Hound + 2 Cinder Knight + Pyre Witch | |
| 77 | Chamber of Embers | B | 2 Ashborn + 2 Pyre Witch + Forge Golem | |
| 78 | Forgemaster's Vault | Tr-g | 2 Forge Golem + Cinder Knight | opt |
| 79 | Warden's Gate | E | **The Cinder Warden** (Cinder Gatewarden gelişmiş) + 2 Cinder Knight + Pyre Witch | |
| 80 | Quench Well | R | | |
| 81 | Hall of Bearers | B | Cinder Knight + Pyre Witch + Forge Golem + Molten Hound | hepsi |
| 82 | Bearers' Crypt | Tr | opt | |
| 83 | The Hearth Door | R | son kamp | |
| 84 | The First Hearth | **S** | **The Hearthwarden** + 2 Forge Golem | final 1 |
| 85 | The Ember | **S** | **The Ember of the First Hearth** (tek dev) ; yardımcı nesne **Tidewater Urn** (oyuncu kullanır) | final 2; arada dinlenme yok (form) |
| 86 | Mend or Quench | Ev | bitiş seçimi (M-O) | |

Çatal/birleşmeler: 3→(4|6)→9; 15→(16|17)→20; 29→30 hub (31-42 yıldız); 43→(45|49)→51; 58→(59|63)→65; 72→(73|76)→79. Opt cepler: 7, 23, 42, 44, 50, 66, 70, 78, 82 (9).

### 4.3 Moblar

| Mob | Aile | Durum | Rol | Pasif | Kit özeti |
|---|---|---|---|---|---|
| Stonebound Warden, Deep Runecaller | Guardians | aynen | | Stone Patience / Ward-Etcher | Kharduin |
| Ember Hierophant, Cinder Gatewarden | Ember Cult / Guardians | aynen (adlar: Ashborn Hierarch eliti ayrı) | | | |
| Ghoul ("Wight") | Undead | aynen + **Grave Cold** (vuruşta 1 Chill) | ön | | |
| Will-o'-Wisp ("Frost-light" / "Deep-light") | Hexes | aynen (palet) | | Flicker | |
| Weir Eel ("Blind Eel") | Beasts | Harita 2'den, aynen | | Slick | Sunless Lake |
| **Snow Wolf** | Beasts | gelişmiş Grey Wolf | ön, sürü | Pack Tactics | Bite → Frost Bite (+1 Chill) |
| **Rime Hound** | Beasts | gelişmiş Ash Hound | ön | Blood Scent | Run Down + Rime Bite (Chill) |
| **Cave Crawler** | Beasts | YENİ | ön | **Blind Hunger**: Darkness'ta +%25 hasar; hep en yakın hedef | Mandible (tek) + Skitter (ignoreReach) |
| **Clan Axeman** | Hillclans (Bandits) | gelişmiş Moor Raider | ön | **Highland Fury**: canı %50 altındayken +%20 hasar, Chill'e bağışık | Axe (tek) + Cleave (ön sıra) |
| **Clan Slinger** | Hillclans | gelişmiş Crossbowman | arka | Cut and Run | Sling + Ice Shot (Chill) |
| **Clan Skald** | Hillclans | YENİ | arka, destek | **War-Chant**: tur başı aynı sıradaki dostlara 1 tur Haste | Chant (dostlar Haste) + Mock (tek, 1 tur Staggered) |
| **Rime Witch** | Hexes | gelişmiş Fen Witchling | arka, caster | **Hoarfrost**: Soaked kahraman her tur 1 Chill alır | Soaked veren hex (adı sonra) + Ice Shard |
| **Frozen Halberdier** | Frostbound Legion (Undead) | gelişmiş Morvane Halberdier | ön | **Frozen Ranks**: Close Ranks + Chill bağışık | Halberd Chop + Pike Thrust |
| **Frozen Crossbowman** | Frostbound Legion | gelişmiş Crossbowman | arka | Frozen Ranks | Bolt + Ice Bolt |
| **Hollow Warden** | Hollow (Undead cüce) | gelişmiş Stonebound Warden (undead palet) | ön, tank | **Hollow**: Darkness'ta aldığı hasar -%25 | Gatestone Slam + Rockfall |
| **Hollow Runecaller** | Hollow | gelişmiş Deep Runecaller | arka | Ward-Etcher | Rune Spark + Glyph |
| **Ashborn Acolyte** | Ashborn (Ember Cult) | gelişmiş Ember Acolyte | arka | Last Ember | Ember Toss + Burn the Ground |
| **Pyre Witch** | Ashborn | YENİ | arka, caster | **Kindling**: tahtadaki her Burning hücre için +%5 hasar (en çok +%20; Ömer kararı: MP sürümü değil) | Pyre Bolt + Spread the Flame (bir Burning hücreden komşulara yayar) |
| **Cinder Knight** | Ashborn | YENİ | ön, tank | Searing Rebuke | Brand (tek + Burning) + Hold the Gate |
| **Molten Hound** | Beasts | gelişmiş Ash Hound | ön | Blood Scent | Scorch Bite + Run Down (zemin Burning bırakır) |
| **Forge Golem** | Forgeborn (YENİ aile) | YENİ | ön, tank | **Furnace Core**: ölünce hücresi ve komşuları 2 tur Burning ground | Hammer (tek) + Vent (bir sütun, ateş) |

**Elitler:** The Pack-Mother · Clan Chief Brannoc (War-Chant + Highland Fury) · The Frozen Standard-Bearer (Frozen Ranks geniş: tüm dostlar) · The Oathkeeper (Thane gelişmiş; Deep Hoard yerine *Stone Oath*: dost ölünce zırh +) · The Pyre Matriarch · Forge-Master Golem (Furnace Core 2 kat) · The Ashborn Hierarch · The Cinder Warden.

**Bosslar:**
- **The Snowfather** (buz devi): pasif *Frostbound* (Chill bağışık; kahramanlardaki her Chill yığını ona +%3 hasar); Avalanche (sütun, telgraflı), Icy Grasp (tek, 2 Chill), Roar (tüm kahramanlar Slow); ult *Whiteout* (tüm kahramanlar +2 Chill, 1 tur Darkness).
- **The Hollow King** (undead cüce kral): pasif *Hollow Crown* (Hollow dostu ölünce sonraki turunda 2 eylem); Kingsmaul (tek + cave-in telgrafı), Call the Vault (Hollow Warden çağırır), Decree of Stone (dostlar Fortified); ult *Bring Down the Hall* (3 hücre çöker: hasar + kalıcı kapalı hücre).
- **The Hearthwarden** (ocağa kaynamış ilk kral): pasif *Forge-Heat* (her Round başında bir sıra Burning, telgraflı); Hammerfall (tek, ağır), Quench (tahtadaki Burning hücreleri söndürür ve her biri için kendini iyileştirir → oyuncu Burning'i istemez), Forge Chains (tek, Slow + Burning); ult *Temper the Crown* (tüm kahraman tahtası ateş, güvenli hücre yok, hazırlık turu).
- **The Ember of the First Hearth** (canlı alev, tek dev): pasif *Everburning* (tahtada Burning hücre varken aldığı hasar -%50); Flare (tek), Cinder Storm (X şekli + Burning), Breathe (bir sıra Burning); ult *The First Fire* (tüm tahta Burning 3 tur). Yardımcı nesne **Tidewater Urn** (Keystone'un tersi: oyuncu bir kahramanla bitişiğinde eylem harcayıp bir sırayı Flooded yapar; 3 kullanım). Ders: Harita 2'nin suyu Harita 3'ün ateşini söndürür.

### 4.4 Kasabalar ve olaylar
- **Hearthstead** (dağ köyü): NPC "Old Ketil" avcı: Chill'den korunma (ateş) ve klanlar.
- **Kharduin, the Last Hall** (cüce kalesi): Runeforge (demirci, aynı kurallar), Odo, kışla; NPC "Loremaster Dunwe": Thane of the Deep'in oğlu, Stone Oath'u anlatır; Hall of Oaths seçimi (yemin et: Kharduin'de ücretsiz dinlenme + Oathkeeper savaşı atlanır? HAYIR: Oathkeeper hep savaşılır; yemin = Deep Market indirimi; reddet = Gatehouse devriyesi güçlenir). Basit tutulur.
- **The Deep Market** (tüccar düğümü): Odo yok; derin cüce tüccarı, fiyatlar yüksek, stok iyi.
- Seçenekli olaylar: Clan Steading, The White Dark, Hall of Oaths, The Broken Lift, Sermon Hall (lore), Crown Gallery, Mend or Quench (final).

### 4.5 Arka plan prompt'ları
- Harita (kesit): *"Side-view painted cross-section of a mountain, no text, no labels: snowy pine slopes and a glacier at the top, a giant carved stone gate in the middle leading into dwarven halls and a dark underground lake, below them winding lava tunnels, and at the very bottom a vast glowing forge-hearth; cool blue-white above fading to black stone and ember orange below; clean shapes, few details, no noise; 16:9."*
- Savaş: snowline, glacier, kharduin, deep-halls, warrens, forge-heart (6); kasaba 2 (Hearthstead, Kharduin) + Deep Market plakası.

---

## 5. YENİ MEKANİK listesi (her biri form sorusu; hiçbiri onaysız yapılmaz)

| # | Ad | Tek satır kural | Motor / kod ihtiyacı | Harita |
|---|---|---|---|---|
| M-A | **Battle conditions** | Karşılaşma verisinde `condition` alanı: savaş boyunca geçerli tek kural (Tide, Storm, Blizzard, Darkness, Heat). HUD'da sol üstte küçük plaka + Codex metni. | TEK kanca: Round/tur başı olayı + hasar/isabet çarpanı; B-H bunun üstüne | 2, 3 |
| M-B | **Tide + Flooded ground + Soaked** | Tide: her Round başında (dalga) ve her 4. turda her iki tarafın ön sırası 2 tur Flooded. Flooded: üstündeki birim Soaked (alınan ateş hasarı -%50, Burning kalkar, hız -%10); Flooded, Burning ground'u söndürür. | yeni zemin türü (Burning ground emsali) + Soaked durumu | 2 (+ Urn ile 3) |
| M-C | **Storm** | Her iki tarafın menzilli isabeti -%15. | M-A parametresi | 2 (Isles) |
| M-D | **Chill (durum)** | 1-3 yığın; yığın başına hız -%8; 3'te **Numb** (kritik 0, zırh -%20). Alınan ateş hasarı tüm yığınları siler; Burning ground üstünde yığın alınmaz. | yığınlı durum (Chill kendi yığın sistemi) | 3 |
| M-E | **Blizzard** | Her birim kendi tur başında 1 Chill alır (Burning hücredekiler hariç); menzilli isabet -%15. | M-A + M-D | 3 (Windwall) |
| M-F | **Darkness + Lantern** | Kahramanlar yalnızca düşman ön sırasını ve 1 arkasını hedefler; herhangi bir ateş skill'i tahtayı 2 Round aydınlatır (kısıt kalkar). **Lantern** yardımcı nesnesi (Keystone gibi, düşman vurabilir) kırılana kadar aydınlatır. Basit alternatif: Darkness = menzilli isabet -%20, nesne yok. | hedefleme kısıtı (range sistemi emsali) + nesne; alternatif yalnız M-A | 3 (Deep Halls) |
| M-G | **Cave-in** | Telgraflı hücreler sonraki Round'da çöker: üstündeki birim hasar + Slow, hücre savaş boyunca **kapalı** (kimse giremez). | kalıcı kapalı hücre (M-I ile aynı altyapı) + telgraf | 3 |
| M-H | **Heat** | Her Round başında rastgele bir sıra (telgraflı) 2 tur Burning ground. Chill yok. | M-A, var olan zemin | 3 (Forge) |
| M-I | **Deck battles (kapalı hücreler)** | Karşılaşma verisinde `blocked: [slot...]`: direk/küpeşte hücreleri kullanılamaz (iki tarafta da). | kalıcı kapalı hücre | 2 (crossing), 3 (göl) |
| M-J | **Sea lanes + Crossing düğümü** | `crossing` türü = güverte savaşı (M-I) + devriye. Kenar türü `sea`: Charter a ship olayından önce geçilmez (sis içinde "Needs a ship" rozeti). | campaign state + harita çizimi (kesik mavi yol) | 2 |
| M-K | **Gezici elit (The Black Caravel)** | Deniz yolları açılınca Caravel 55/60/62/64 arasında her oyuncu hamlesinde bir düğüm ilerler; onun düğümüne girince elit savaşı. Yenilince Gallows Cove (boss) açılır. Harita HUD'ında yelken rozeti. | campaign state (konum sayacı) | 2 |
| M-L | **Faction (Order / Guild)** | Saltmere'de tek seçim; 2 elit, Monk's Isle, tüccar stoku, Charter bedeli değişir. Kayıtta bayrak. | campaign flag + encounter seçimi | 2 |
| M-M | **Lighthouse** | Lantern Rock olayı: bu haritada `visibility` +1. | var olan görüş değeri | 2 |
| M-N | **Yardımcı nesneler** | N1 Harpoon Ballista (düşman, Iron Mooring emsali). N2 **Zorla hareket** (Hook'un Boarding Hook'u: kahramanı ön sıraya çeker) — ayrı onay; reddedilirse Slow + ağır vuruş. N3 Tidewater Urn (oyuncu kullanır: bitişik kahraman eylem harcar, bir sıra Flooded; 3 kullanım). | nesne tipi var; N2 yeni (birim taşıma), N3 "etkileşimli nesne" yeni | 2, 3 |
| M-O | **Bitiş seçimi** | Mend / Quench: iki metin, iki unvan; mekanik fark yok. | olay verisi | 3 |
| M-P | **Kesit harita** | Harita 3 görseli dağın yandan kesiti; düğümler yukarıdan aşağı. Sadece sunum (pos değerleri). | yok | 3 |
| M-Q | **Harita geçişi** | "Campaign Complete" yerine "Continue to The Drowned Reach": takım, kadro, item, altın, level taşınır; yeni harita `campaign.json > maps` listesinden; kayıt şeması harita id'si alır. Eski kayıtlar Valdoria'da kalır. | campaign state/save göçü | 2, 3 |

MP'ye dayanan pasif: 0 (Kindling hasar sürümü, Ömer kararı). **Hepsi onaylı (2026-10-20);** uygulama sırasında her biri Codex > Mechanics metni ve test ile gelir; M-N2 (zorla hareket) motorda birim taşıma kuralıdır: hedef hücre doluysa çekme olmaz, boss/elit rütbeliler çekilemez (VARSAYIM, uygulamada doğrulanır).


**Not (campaign-dev 2026-10-26, form econ/main):** Görevler (Personal Quests) henüz yok; ileride görev süresi ve günle açılma için `CampaignState.day` (gün sayacı, 2 tamamlama = 1 gün) hazır bekliyor.

---

## 6. Sanat iş yükü (ChatGPT; tek art-pipeline, tek tek)

| | Harita 2 | Harita 3 |
|---|---|---|
| Yeni mob çizimi | 9 (Corsair Cutlass, Corsair Slinger, Salt Crab, Weir Eel, Siren, Drowned Knight, Brine Maiden + Reaver Archer yay, Reef Wrecker fener) | 7 (Cave Crawler, Clan Skald, Pyre Witch, Cinder Knight, Forge Golem + Snow Wolf, Clan Axeman) |
| Palet/küçük değişiklik | 8 | 10 |
| Elit (poz sayfası) | 8 (ikisi faction'a göre) | 8 |
| Boss | 3 | 4 |
| Savaş arka planı | 7 | 6 |
| Kasaba sahnesi | 4 | 2 + 1 |
| Harita görseli | 1 (+ geniş) | 1 (+ geniş) |
| Yardımcı nesne / ikon | Ballista, Urn, Lantern; ~70 skill ikonu | |

**Lean seçenek (form):** elit sayısı 6'ya, yeni mob 6'ya, bosslar sabit; kasaba sahneleri 2. Toplam görsel yaklaşık üçte bir azalır.

---

## 7. Uygulama sırası (onaydan sonra; her adım oynanabilir)
1. **Harita geçişi + Harita 2 iskeleti** (campaign-dev): `data/campaign/drowned-reach.json` 83 düğüm, yer tutucu arka plan, var olan moblarla geçici karşılaşmalar; "Continue to..." akışı; kayıt göçü; testler (K1/K2, graf).
2. **M-A + M-B + M-I + M-J** (engine-dev): koşul kancası, Flooded/Soaked, kapalı hücre, crossing. Debug > Setup'tan test savaşı.
3. **Harita 2 mobları** (content-designer; mob-plan.md tarzı kartlar) + yer tutucu sprite; balance-tester sim:campaign Harita 2.
4. **Sanat** (art-pipeline): harita görseli → arka planlar → moblar → elit/boss.
5. **M-K, M-L, M-M, M-N** ve olaylar (campaign-dev).
6. Harita 3 aynı sırayla (M-D/E/F/G/H).

---

## 8. Kararlar ve uygulamada netleşecek ayrıntılar
Form soruları (tema, omurga, bitiş, boyut, boss sayısı, M-A…M-Q, Kindling, sanat, sıra) **tamamı cevaplandı**; cevaplar belgenin başında. Ömer'e sorulacak açık konu kalmadı. Aşağıdakiler karar değil, yapım sırasında agentın kendi belirleyeceği ve raporda yazacağı ayrıntılar (varsayım yaparsa open-questions'a):
- Düğüm konumları (pos) ve iki harita görselinin ChatGPT üretimi (tek tek, Ömer onayıyla; background-art kuralı).
- Tide'ın tam zamanlaması (Round başı + her 4. tur) ve Flooded'ın dalga takviyesiyle etkileşimi; sim:campaign ile ayar.
- Darkness hedefleme kısıtının range sistemiyle (`range.enabled`) birleşmesi; Lantern nesnesinin canı.
- Black Caravel'in dolaşma düzeni (55→60→62→64→55) ve HUD rozeti.
- Faction bayrağının kayıt şemasına eklenmesi; eski kayıtlar etkilenmez.
- Harita geçişinde Valor/yara/ceset durumunun taşınma kuralı (önerim: boss tam şifası zaten uygulanmış olur, yaralar kasaba kuralıyla silinir, cesetler taşınır). Karar 2026-10-26 D1 b: yaralar geçişte silinir.
- Mend bitişinde tacı takan kahramanın seçimi (önerim: lider; metin dışında etkisi yok).
- Harita 2'nin ilk 3 düğümü L10 (Harita 1 sonu farmsız ~L8,5 ile geçiş yumuşak).

---

## 9. Ek mekanikler turu 2 (Ömer seçimi 2026-10-25, form 4Z6Qr7WCm3gVKKJDLLi4cE, db `mech23/main`)

23 öneriden 9'u seçildi. Hepsi onaylı yeni kural sayılır (form cevabı = onay); sayılar uygulamada sim ile netleşir.

| Id | Ad | Ne yapar | Harita |
|---|---|---|---|
| A1 | **Wayshrines** | Her bölgede 1 isteğe bağlı sunak cebi; içinde kurallı küçük sınav savaşı ("yalnız 2 kahramanla", "ilk 3 tur ultimate yok", "arka sıra boş" gibi). Kazanınca takıma seferin geri kalanı için kalıcı küçük nimet (+%3 maks can, +%2 kritik, +%5 şifa gibi). 12 sunak (6 + 6). Nimetler Gear'da tek listede. Sınav kuralları B3 ile aynı karşılaşma katmanında. | 2 + 3 |
| A4 | **Hero Oaths** | **Ömer notu: yalnızca TEK tapınak, TEK karakter** (ileride artırılabilir ya da başka mekanikler benzer türde bonus verebilir). Tapınakta bir kahraman yemin eder: kalıcı bir artı + kalıcı bir eksi (ör. Oath of the Undertow: +%12 hasar, dinlenmede şifa yarım). Ücretle bozulabilir. | 2 (tapınak yeri uygulamada: Saltspray Shrine önerim) |
| A5 | **Personal Quests** | Her sınıfın kendi yan düğümü (Paladin: Monk's Isle'da Brann'ın emaneti; Undead: Sunken Court'ta eski adı; Druid: Snowline'da donmuş koru; Archer: Gull Cliffs'te avcı yarışması...). Bitirince o sınıfa küçük imza bonusu + unvan. Kadroda olmayan sınıfın düğümü görünmez. Sınıflar iki haritaya bölünür. | 2 + 3 |
| B1 | **Salvage Dive** | Batık hazine düğümü: savaş kazanılınca "Dive deeper?"; her derinlik bir dalga daha (arada şifa yok) + daha iyi sandık; çekilirsen o ana kadarkini alırsın, yenilirsen son derinliğin ödülü gider. Harita 3'te aynı kalıp "Deep Shaft" (maden kuyusu). | 2 + 3 |
| B3 | **Battle Objectives** | Karşılaşma verisinde `objective`: Survive N Rounds (gelgit yükselir, sonunda kaçılır), Break the Totem (nesne kırılana kadar takviye gelir), Hold the Bridge (ön sıra boş kalmasın). Varsayılan "herkesi öldür". Sonraki haritalarda da kullanılır. | 2'den itibaren |
| B5 | **The Fighting Pit** | Saltmere'de arena (Harita 3'te Kharduin "Proving Grounds"): art arda 5 savaş, arada şifa yok, her kademede ödül; istenen kademede çıkılır. Tekrar girilebilir, ödül yalnızca yeni rekorda. | 2 + 3 |
| C1 | **Crown Surge** | Bölük Crown of Ash'i taşır. Bölge başına 1 kez savaşta Crown Surge (ör. takıma 2 tur +%30 hasar); kullanan kahraman 1 **Ashen Taint** yığını alır (yığın başına -%3 maks can), kilisede temizlenir. Harita 2 sonunda Salt yarısı gelince ikinci Surge (su: takıma kalkan). Mend/Quench metni Taint sayısına göre değişir. | 2 + 3 |
| D4 | **Frozen Echoes** | Windwall'da buza gömülü orduda yan cepler: Harita 1 bosslarının buz yankıları (Deserter Captain, Morvane'nin yankısı) yeni kitle + buz paleti. Kazanınca unvan + sandık. | 3 |
| D5 | **Ember Shards** | Harita 3'e dağılmış 7 Ember Shard; her biri Hearthwarden savaşında bir avantaj (bir fazı zayıflatır ya da 1 tur ek hazırlık). Toplamadan da yenilir ama çok daha zor. | 3 |

Seçilmeyenler (A2, A3, B2, B4, B6, B7, C2-C6, D1-D3) şimdilik yok; Notice Board (B7) future-ideas'taki haliyle bekliyor.

### 9.1 Çalışma kopyası (Ömer 2026-10-25)
Harita 2-3 oyundan bağımsız ilerler: dal `maps-2-3`, kopya `C:\Users\Omer\Projects\eov-maps` (git worktree, node_modules = oyunun node_modules'üne junction; kopyayı kaldırmadan ÖNCE junction silinir). Ana oyun (`main`) işleri bu dala düzenli olarak birleştirilir (çakışma küçük kalsın); dal `main`'e ve GitHub'a Ömer "yayına al" deyince gider. Haritalar bayrak arkasında yazılır (`campaign.json`'da harita girdisi kapalı), böylece erken birleştirme oyuncuya bir şey göstermez. Yerel test: önizleme `maps` (port 5002, build `C:\Users\Omer\Projects\eov-maps-build`).

### 9.2 Güncel yapım sırası (bölüm 7'nin yerine)
1. **Harita geçişi (M-Q) + Harita 2 iskeleti**, bayrak kapalı: 83 düğüm, yer tutucu arka plan, var olan moblarla geçici karşılaşmalar, "Continue to..." akışı, kayıt göçü, testler.
2. **Savaş katmanı:** M-A koşul kancası + **B3 objective** (aynı karşılaşma verisi katmanı) + M-B Flooded/Soaked + M-I kapalı hücre + M-J crossing.
3. **Harita 2 mobları** + sim:campaign Harita 2.
4. **Harita 2 yan içerik:** A1 Wayshrines (B3 kurallarını kullanır), B1 Salvage Dive, B5 Fighting Pit, A4 tek tapınak, A5'in Harita 2 görevleri.
5. **C1 Crown Surge** (bir bölge baştan sona oynanabilir olunca; denge sim ile).
6. Sanat (art-pipeline, tek tek).
7. M-K, M-L, M-M, M-N ve olaylar.
8. Harita 3 aynı sırayla + D4 Frozen Echoes + D5 Ember Shards + A5'in Harita 3 görevleri.

### 9.3 Adım 1 varsayımları ve açık sorular (campaign-dev, 2026-10-25; Ömer uyurken)

Adım 1 = harita geçişi (M-Q) + Harita 2 iskeleti. Yeni mekanik yok; aşağıdakiler geri alınması kolay geçici kararlar. **K** = kritik soru (rapor listesinde).

**Veri ve graf**
- Düğüm id'leri `dr1..dr83` (mockup numarası + `dr` öneki): global skip listeleri (`waves.json > campaign.skipNodes ["1","2"]`), `done` işaretleri ve ipuçları Harita 1 id'leriyle çakışmasın diye.
- Konumlar `public/mockups/maps-2-3/data.js` (m2) mockup'ından; arka plan `assets/campaign/drowned-reach-bg.webp` = `assets/source/maps-2-3/drowned-reach-map-v2.png` (yer tutucu, yeni çizim yok). Tam haritada en yakın iki rozet 31 px (dr34-dr63, farklı bölgeler); bölge içinde en az 72 px. Test eşiği bölge içi 70 px (Harita 1'in 120 px kuralı tam harita içindi).
- **Spoke (Saltmere kolları):** Saltmere'nin yıldız biçimli 10 sokağı (dr29-34, dr36-39) yeni `spoke: true` alanı: tek giriş Saltmere, ileri ana yol yok, düz yol; rota sayımına, seçim noktasına ve K1'e girmez (graph.ts `isSide`). Kural değil veri sınıflandırması: oyuncu için var olan serbest dolaşımla gidip geri döner. dr34 (Drowned Cathedral) kolunun ucunda dr35 cebi var. **K**
- Black Caravel mockup'ta yolsuzdu: Open Water'dan (dr62) kesik yolla cep (sabit elit).
- Crossing durakları (dr55, 60, 62, 64): düz savaş, alt başlık "Crossing · ...", deniz kilidi yok.
- Son durak dr83 "Two Crowns" olayı (`final: true`), önünde dr82 "Throne of Brine" final boss: Two Crowns metni boss'tan sonra oynar, sonra Campaign Complete.
- Rota: 64 rota, 48-53 durak; `stopsPerRun` 53 (en uzun) yazıldı.

**Seviye ve düşman**
- dr1-3 elle L10 (yeni düğüm alanı `level`, power.ts `nodeLevel`); geri kalanı var olan bölüm rampası (bölüm 2 = L11-20). dr4 L12'ye atlıyor (L11 hiçbir düğümde yok). **K**
- `power-budget.json` bölüm 2 adı "The Ashlands" -> "The Drowned Reach", `map: "drowned-reach"` (test güncellendi). Bölüm 3 adı değişmedi.
- `CONFIG.enemyScale.regions` I/II/III anahtarlıydı; Harita 2'nin bölge id'leri de I-VI olduğu için yanlışlıkla Harita 1 çarpanları uygulanmasın diye `enemyScale.regionsMap: "valdoria"` eklendi (yalnız o haritada uygulanır).
- Mob eşlemesi (yeni mob yok, var olanlar adlandırıldı): River Reaver / Reef Wrecker = moor_raider, Reaver Archer / Cliff Crossbowman = bandit_crossbowman (2026-10-27: River Reaver ve Cliff Crossbowman artık kendi id + çizimleri: `river_reaver`, `cliff_crossbowman`; kit/stat aynı, Harita 2 karşılaşmaları bunlara bağlı), Corsair Cutlass = cutpurse, Corsair Slinger = ravenwood_poacher, Salt Crab = shieldwarden, Weir Eel = grey_wolf, Reef Hound = ash_hound, Salt Hag = fen_witchling, Siren = raven_seer, Tide Caller = grave_chanter, Drowned Knight = sworn_guard, Brine Maiden = censer_monk, Wreck Ghoul = ghoul, Marsh Light = will_o_wisp, Dock Rat = road_thug.
  - **Kendi çizimler oyunda (content-designer 2026-10-25):** 9 onaylı çizim kendi mob id'siyle: `corsair_cutlass`, `corsair_slinger`, `salt_crab`, `weir_eel`, `siren`, `drowned_knight`, `brine_maiden`, `reaver_archer`, `reef_wrecker` (`data/mobs/<id>.json`, kaynak `assets/source/mobs`, `tools/import-mobs.py` HEADS). **3.3 kitleri uygulandı (content-designer 2026-10-25, open-questions 419):** 17 yeni skill (Cutlass/Rake, Sling Stone/Pitch Pot, Pincer/Burrow, Bite (`eel_bite`)/Lunge, Lament/Chorus, Rusted Blade/Shield of Brine, Lament of Salt/Tidal Mend, Pitch Arrow + Scatter Quarrels, Hook/Lantern Flash), aileler Corsairs / Beasts / Hexes / Sunken Court / Bandits; Boarding / Shell / Slick / Lure / Deathless Tide / Salt Tears / Undertow pasifleri motorda (2026-10-25, 419.1); Weir Eel Bite Soaked hedefe x1,3 (`bonusVsStatus`). Yatay çizimler: Weir Eel spriteScale 1,2, Salt Crab 1,3; Drowned Knight 1,12. Kendi ikon ve efektleri (art-pipeline 7b399db) Cutlass, Slinger, Salt Crab, Weir Eel, Siren için bağlı (MOB_VFX_SPECS; yalnız bunlar speed 1,35 + 5 kat ara kare); diğer 4 mobun skill efektleri artOf ile var olan sheet'lerden oynar (savaş preload'u skill'e göre de yükler: `mobSheetsOf(units, skills)`). River Reaver ve Cliff Crossbowman yer tutucuda kaldı (çizim yok).
- Elitler (tier elite, hp 1.7 / güç 1.1 / stat 1.15): Hook / Wrecker-Captain / Marrow = bandit_chief, Salt Hag Mother / Siren Queen = hedge_witch_morwen, Bastion / Drowned Champion = thane_of_the_deep, Salt Bishop = high_priest_of_the_undying.
- Bosslar: Weir Wyrm = bridge_warden (dev, 2 Weir Eel, mooring yok), Admiral Vane = bridge_warden + iron_mooring "Harpoon Ballista" + eskort, Drowned Queen = lord_morvane + thane "The Drowned Champion" + 2 Brine Maiden. Çarpanlar kabaca, sim yok. Harbor Fort = Guild Enforcer "Bastion" (Order tarafı) seçildi.
- Dalgalar var olan kuralla (waves.json: normal 2, elit 2, boss 3).
- **Kendi çizimleri bağlandı (campaign-dev 2026-10-26):** 8 elit, 3 boss ve Hex Totem karşılaşma biriminin `sprite` alanıyla kendi çizim / avatar / poz sayfasında görünür (motor: `UnitSetup.spriteId`, yalnız sunum); kit, stat ve ad aynı (yeni kitler ayrı iş). **Kendi kitleri geldi (content-designer 2026-10-27):** 8 elit, Vell ve 3 boss artık kendi birimleri (`data/mobs/<id>.json`, `data/bosses/{weir_wyrm,admiral_vane,drowned_queen}.json`) ve kendi skill'leriyle (3.3 kitleri; Hook'un Boarding Hook'u = M-N2 zorla hareket); ödünç Harita 1 kiti kalmadı; Pit Champion Gorr da kendi kitinde (`pit_champion_gorr`, 2026-10-27; çizimi yok, open-questions 436). Önderlerin sesleri ve 3 bossun müziği kendi tarifleri (436). Yakın mekanikler ve provizyon sayılar: open-questions 435. Poz kayıtları `data/mob-poses.json` (ortak sıra: 6 = imza pozu, ödünç kitin ultisine bağlı). Admiral Vane'in yığılma / ölü pozları kaynakta birbirine değiyordu: `tools/import-mob-art.mjs > POSE_CUTS` ile ayrıldı. Drowned Queen çizimi Morvane'den dar olduğu için `spriteScale` 2,4 -> 1,65 (Morvane yer tutucusuyla aynı boy). Aynı alanla Harita 1'in Deserter Captain'ı da artık kendi çiziminde. **Kadın varyasyonları:** Corsair Cutlass / Slinger, Drowned Knight, Reaver Archer, Reef Wrecker sıradan birimlerde seed'li ~%50 (`data/mob-looks.json`, `src/campaign/mob-looks.ts`; savaş RNG'sini tüketmez); elit / boss / hedef etkilenmez, Codex'te mob tek.

**Kasabalar**
- Reedgate, Eelwick, Fisher's Landing: köy sahnesi (town-ashford görselleri yeniden kullanıldı), Saltmere: şehir sahnesi (town-valdren görselleri) + "Odo's Chandlery", Harbor-Master Rook. Hepsinde tüccar, ateş başı, demirci, hikâye NPC'si (dr_the_ferryman, dr_weir_warden, dr_harbor_master, dr_keepers_daughter; İngilizce, 2 adımlık yer tutucu diyalog).
- **Takım büyüklüğü:** Ömer kuralı: sefer takımı en fazla 4, 5. kahraman yok. Harita 2 kasabaları aday vermez (Saltmere dahil, `partyCap` 4); Saltmere kışlası değişim önerir (aşağıda K1 = b), diğer kışla / ilan panoları aday göstermez.
- ~~Faction (M-L), Charter (M-J), Lantern Rock (M-M), Monk's Isle: düz lore olayı + küçük ödül yer tutucusu; kural yok.~~ **Kurallı (campaign-dev 2026-10-27, `src/campaign/reach.ts`, open-questions 433):** M-J deniz yolları (kenar `sea`, düğüm `crossing`; Ferry Office "Charter a ship" öncesi geçilmez, adada "Needs a ship" + kilit rozeti, kesik mavi yol), M-K The Black Caravel (sabit dr59 cebi kalktı; rota 55 -> 60 -> 62 -> 64 -> 55, oyuncunun her hamlesinde bir durak, durağına girince elit savaşı `dr_59`, batınca Gallows Cove açılır; düğümün üstünde yelken madalyonu), M-L Faction (Guild Hall tek seçim `faction`; Harbor Fort eliti, Monk's Isle, tüccar yuva ağırlığı, Ferry Office bedeli), M-M Lantern Rock (görüş +1). Kayıt sürümü 12 kalır (isteğe bağlı alanlar `faction / sea / lit / caravel`; eski dr59 kaydı `removedNodes` ile dr62'ye taşınır). Debug > Campaign > "Map 2 sea and factions".

**Geçiş (M-Q) ve kayıt**
- Morvane sonrası: Harita 2 açıksa pencere alt başlığı "Map Complete", düğmeler "Stay on the map" / "Continue to The Drowned Reach" -> Harita 2 giriş penceresi ("Not yet" / "Set out"). Kapalıysa Harita 1 sonu birebir aynı. Harita 2 sonu "Two Crowns · To Be Continued".
- Taşınan: kadro, dizilim, level / XP / puan / ağaç / ekipman, torba, altın, Valor, loot sayaçları, istatistik, görülen ipuçları, `done`. Sıfırlanan: yürüyüş, temizlenenler, devriye sayaçları, düğüme bağlı geçici alanlar. Can oranları aynen (boss zaferi zaten tam şifa); yaşayan kahramanların yaraları geçişte silinir (Ömer 2026-10-26 denge formu D1 b; eskiden ilk kasabanın bedava dinlenmesine kadar kalıyordu); ceset ceset kalır (bölüm 8 önerisi).
- Kayıt sürümü **artırılmadı** (12): `mapId` zaten kayıtta; yeni isteğe bağlı alan `mapsDone` (geçersizse atılır). Main ile birleştirmede sürüm çakışması olmasın diye. **K**
- Harita 2 başında kahraman seçimi yok (`continues: "valdoria"`); Harita 2'de bölük kurma yok, serbest dolaşım baştan açık.

**Bayrak, debug, kopya**
- `campaign.json > mapFlags["drowned-reach"].enabled = false`. Debug > Campaign > "Maps 2-3 (test)": Enable Map 2 (`eov.debug.maps23`), Jump to The Drowned Reach, Jump to region I-VI, Finish Map 1 → transition. Adreste `?maps=1` açar ve hatırlar, `?maps=0` kapatır. Codex sayfası yalnız bayrak açıkken.
- `/maps23/` yolunda (GitHub Pages test kopyası) localStorage / sessionStorage `eov.m23.` önekiyle ayrılır (src/storage-scope.ts, main.ts'in ilk import'u; index.html'deki ilk kare betiği de); bulut senkronu orada kapalı. Bilinen küçük etki: sekmeler arası `storage` olayı kopyada önekli anahtarla gelir (asset sürüm seçimi diğer sekmeye anında yansımaz).
- Bölge savaş arka planları var olan sahnelerden (I kings-bridge, II misty-marsh, III pilgrim-road, IV iron-pass, V windy-moor, VI castle-hall): yer tutucu.
- **Bölge kamerası HUD payları** (playtest 2026-10-25: dr1 telefonda Your party sütununun altında kalıyordu; ardından geniş pencerede panellerin arkası siyah): kamera HİÇBİR görünümde harita görselinin dışını göstermez, HUD görselin üstünde durur (Harita 1 gibi; `map-view.ts > clampMid`, kaydırma çerçevesi = görselin kapsamı). HUD modeli (`region-view.ts > hudClear`): sol sütun tam yükseklik, üst bantta yalnız ortadaki harita adı + bölge adı kutusu, altta yalnız sağdaki − + ? kümesi. Bölgeye girerken takımın durağı HUD dışında açılır (`regionCamera` + `clearMid`; kenar durağında taban yakınlaşması biraz artar). Masaüstü / geniş pencerede her durak kaydırma (+ en çok MAP_ZOOM.max) ile HUD dışına gelir; bunun için dr1 (0.0371, 0.2742 -> 0.125, 0.2083: şelalenin yanındaki yamaç) ve dr2 (0.0897, 0.3719 -> 0.125, 0.3796: şelalenin dibi) içeri alındı. Telefonda sol sütun ekranın ~%25'i: kenar durakları (Harita 1 hoard, Harita 2 dr1-dr3, dr75-dr77) yalnız takım oradayken tam açık (tests/region-camera.test.ts).

**Ömer kararları (2026-10-25, form K1-K6)**
- **K1 = b, kışla değişimi:** takım en fazla 4 kalır; Saltmere'de (dr28) kışla bir kahramanı DEĞİŞTİRMEYİ önerir. Veri `barracksSwap: { offer: 3 }` (düğüm alanı), durum `reserve` (isteğe bağlı; kayıt sürümü 12 kaldı). Kasaba ekranında Barracks: 1) gelen seçilir (3 yeni aday, seed'li, takımda ya da yedekte olmayan sınıflar; + yedektekiler "In reserve"), 2) çıkan seçilir ("Who steps aside?"). Gelen aynı dizilim hücresine girer, yeni aday katılım seviyesinde (joinLevel) gelir; çıkan level / XP / ağaç / ekipmanıyla yedekte bekler, aynı kışlada geri alınır (değişim kasabadayken istendiği kadar). Lider çıkarsa liderlik gelene geçer. Düşmüş kahraman da yedeğe çıkabilir (ceset kalır). Yedek savaşa girmez, XP almaz, sonraki haritaya taşınır. `src/campaign/state.ts > swapOffer / swapHero`, sahne `townSwapModal / townSwapOut`. Varsayımlar open-questions 417.
- **K2 = a:** Saltmere yan sokakları çıkmaz kalır (değişiklik yok).
- **K3 = b:** dr4, dr5, dr6 elle L11 (`level`); L10 -> L12 sıçraması yumuşadı (dr7'den sonra rampa aynı).
- **K4 = a:** ceset / yaralar haritalar arası böyle kalır (değişiklik yok). **Güncelleme (Ömer 2026-10-26, denge formu D1 b):** yaralar harita geçişinde silinir; cesetler aynen taşınır.
- **K5 = a:** Bölüm 2 adı "The Drowned Reach" kalır.
- **K6 = b:** Harita 2 açıkken Morvane sonrası "Stay on the map" yok: "Map Complete" penceresinde yalnız "Continue to The Drowned Reach", giriş penceresinde yalnız "Set out" ("Not yet" kalktı). Bayrak kapalıyken Harita 1 sonu eskisi gibi ("Stay on the map" / "Main Menu").

