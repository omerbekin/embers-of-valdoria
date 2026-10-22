# Harita 1 (Valdoria) yeniden çizim + genişletme (PLAN; Ömer cevapları 2026-10-22 işlendi)

Durum: **OYUNA UYGULANDI (campaign-dev 2026-10-22, ayrı worktree; notlar 8. bölümde, varsayımlar open-questions 384).** Görsel taslak: `public/mockups/maps-2-3.html#v0` (Map I sekmesi; yeni düğümlerin rozetinde "NEW" etiketi). **Yeni harita görseli (Ömer onayı 2026-10-22):** `assets/source/maps-1/valdoria-map-v2.png` (mockup kopyası `public/mockups/maps-2-3/valdoria-v2-preview.webp`, 1672x940). Mockup'ta 33 düğümün **hepsi** bu görsele göre yeniden yerleştirildi (bölüm 3b); oyuna geçerken `valdoria.json > pos` bu konumlardan alınır.
Ömer'in kararları (2026-10-22): yalnız yeniden çizim değil **genişletme**; yeni düğümler **yalnızca var olan moblardan** (yeni mob / mekanik / stat / kural yok); **1.0'dan önce** yapılır.
Ortak kurallar `maps-2-3.md` bölüm 2'den: bölge başına 1-2 çatal, en az 1 isteğe bağlı cep (çıkmaz dal: elit ya da korunan hazine), dalga kuralı aynen (normal 2, elit 2, boss 3 Round), elit / boss eşlikçileri her düğümde farklı. Oyun içi adlar İngilizce. Sayılar PROVİZYON (denge balance-tester'ın).

## 1. Özet

- **27 → 33 düğüm** (27 eski aynen + 6 yeni). Bölgeler 10 / 11 / 12.
- Yeni 6 düğümün 4'ü **cep** (3 korunan hazine + 1 elit), 2'si var olan bir durağa **paralel yeni kol** (yeni çatal).
- **Ana yol uzamaz:** her rota yine **22 durak** (`stopsPerRun` aynı). Rota sayısı 24 → 96. Eski düğümlerin seviyeleri değişmez (seviye en kısa yoldan ölçülür; yeni kollar eski kollarla aynı uzunlukta, cepler yolun dışında).
- Çatallar: 4 → **6** (yeni: Ashford, Ember Road). Cepler: 0 → **4** (her bölgede en az 1).
- Bölge sınırı kayar: Windy Moor, Cairn Hill, Iron Pass, Charcoal Camp bölge II'den **bölge I'e** geçer; Valdren Keep bölge II'nin kapısı olur (bölge sancağı Keep'e girerken çıkar).

## 2. Bölgeler

| # | Bölge (oyun içi başlık, değişmez) | Yeni tagline (EN) | Tema | Düğüm (eski + yeni) |
|---|---|---|---|---|
| I | **I · The Borderlands** | *From Mill Road over the moors to the Iron Pass* | kıyı tarlaları, Ravenwood, eski gözetleme kulesi, Ashford, rüzgârlı bozkır ve tepeler, cüce geçidi; haydutlar, baskıncılar, kömürcüler | 8 + 2 = **10** |
| II | **II · Valdren Vale** | *From Valdren Keep through marsh and graves to the bridge* | kale şehri, bataklık, mezarlıklar, hacı yolu, manastır, nehir köprüsü; boğulmuşlar, cadılar, ölüler, Order | 10 + 1 = **11** |
| III | **III · The Northern Heights** | *From the Ashen Plain to Morvane's gate* (aynı) | kül ovası, kuşatma hattı, dikenli koru, kor yolu, kale; kül tarikatı, Morvane'nin ordusu | 9 + 3 = **12** |

Eski tagline'lar: I "Begins at Mill Road, climbs to Ashford", II "Moor, pass and forest roads to the bridge". Bölge başlıkları ve III'ün tagline'ı aynı kalır. Bölge etiket konumları (`regions[].label`) yeni sınıra göre kayar.

## 3. Düğüm tablosu

Mockup no = `#v0` sekmesindeki numara (rota sırası). Karşılaşma: 1. dalga · 2. dalga (var olan class'lar; tırnak içi görünen ad). Eski düğümlerin karşılaşması, boss'u, kasabası ve metni aynen; **konumları yeni görsele göre değişir** (3b).

| No | id | Ad | Tür | Karşılaşma | Lv | Eski/Yeni |
|---|---|---|---|---|---|---|
| **I** | | | | | | |
| 1 | `1` | Mill Road | Battle (tutorial) | mill_road_thugs | 1 | ESKİ |
| 2 | `2` | Ravenwood | Battle (tutorial) | ravenwood_pack | 1 | ESKİ |
| 3 | `3` | Ruined Watchtower | Elite (tutorial) | watchtower_tutorial | 1 | ESKİ |
| 4 | `4` | Ashford Village | Town | — | 1 | ESKİ (artık çatal: Windy Moor / Brackenridge) |
| 5 | `moor` | Windy Moor | Battle | windy_moor | 1 | ESKİ (bölge II → I) |
| 6 | `hills` | **Brackenridge** | Battle · Hill Bandits | 2 Road Thug + Bandit Crossbowman · 2 Cutpurse + Ember Acolyte | 1 | **YENİ** (Windy Moor'a paralel kol: Ashford → Brackenridge → Cairn Hill) |
| 7 | `hoard` | **Raiders' Hoard** | Treasure · Guarded | 2 Moor Raider + Bandit Crossbowman + Charcoal Burner · Moor Raider + 2 Ember Acolyte | 1 | **YENİ CEP** (Windy Moor'dan çıkmaz dal) |
| 8 | `cairn` | Cairn Hill | Battle | cairn_hill | 1 | ESKİ (II → I) |
| 9 | `5B` | Iron Pass | Battle | iron_pass_ambush | 2 | ESKİ (II → I) |
| 10 | `charcoal` | Charcoal Camp | Battle | charcoal_camp | 2 | ESKİ (II → I) |
| **II** | | | | | | |
| 11 | `7` | Valdren Keep | City | — | 2 | ESKİ |
| 12 | `6B` | Dwarven Mine | Treasure · Guarded | mine_wardens | 3 | ESKİ |
| 13 | `6A` | Witch's Hut | Event · Guarded | witchs_hut_guard | 3 | ESKİ |
| 14 | `5A` | Misty Marsh | Battle | bog_ambush | 3 | ESKİ |
| 15 | `shrine` | **Sunken Shrine** | Treasure · Guarded | 2 Drowned + Grave Chanter + Will-o'-Wisp · Ghoul + 2 Fen Witchling | 3 | **YENİ CEP** (Misty Marsh'tan) |
| 16 | `grave` | Grave Field | Battle | grave_field | 3 | ESKİ |
| 17 | `pilgrim` | Pilgrim Road | Battle | pilgrim_road | 4 | ESKİ |
| 18 | `8A` | St. Brann's Abbey | Treasure · Guarded | vault_keepers | 4 | ESKİ |
| 19 | `8C` | Black Cathedral | Elite | black_cathedral | 4 | ESKİ |
| 20 | `river` | Riverside Camp | Rest | — | 5 | ESKİ |
| 21 | `9` | King's Bridge | Boss | bridge_warden | 6 | ESKİ |
| **III** | | | | | | |
| 22 | `10` | Ashen Plain | Battle | ashen_plain | 6 | ESKİ |
| 23 | `wagons` | **Supply Wagons** | Treasure · Guarded | 2 Moor Raider "Ember Outrider" + Ash Hound + Charcoal Burner · Morvane Halberdier + 2 Bandit Crossbowman "Siege Crossbowman" | 7 | **YENİ CEP** (Ashen Plain'den) |
| 24 | `11B` | Siege Line | Battle | siege_line | 7 | ESKİ |
| 25 | `thorn` | Thornwood Hollow | Elite | thornwood_hollow | 7 | ESKİ |
| 26 | `camp` | Forward Camp | Merchant | — | 7 | ESKİ |
| 27 | `road` | Ember Road | Battle | ember_road | 8 | ESKİ (artık çatal: Shepherd's Fold / Burnt Hamlet) |
| 28 | `fold` | Shepherd's Fold | Event · Rest | shepherds_fold | 8 | ESKİ |
| 29 | `hamlet` | **Burnt Hamlet** | Battle · Ash Ghouls | 2 Ghoul + Ash Hound + Grave Chanter · 2 Skeleton "Risen Skeleton" + Charcoal Burner | 8 | **YENİ** (Shepherd's Fold'a paralel kol: dinlenme mi, savaş + XP mi). Kül ovasının ortasında, Ember Road ve Riverhead ile **nehrin aynı (doğu) yakasında**; yolu nehri hiç geçmez |
| 30 | `head` | Riverhead | Battle | riverhead | 9 | ESKİ |
| 31 | `gate` | Gate of Cinders | Battle | gate_of_cinders | 9 | ESKİ |
| 32 | `deserters` | **Deserters' Camp** | Elite · Deserter Captain | 2 Morvane Halberdier + Bandit Crossbowman "Siege Crossbowman" · **"Deserter Captain" (elit; YENİ SPRITE, istatistikleri Bandit Chief'ten)** + Shieldwarden + Moor Raider "Ember Outrider" | 10 | **YENİ CEP** (Gate of Cinders'tan; karlı dağlarda) |
| 33 | `12` | Castle Morvane | Final Boss | castle_morvane | 10 | ESKİ |

Yeni kenarlar (eski kenarların hiçbiri silinmez): `4→hills`, `hills→cairn`, `moor→hoard`, `5A→shrine`, `10→wagons`, `road→hamlet`, `hamlet→head`, `gate→deserters`.

**Nehir kontrolü (Ömer 2026-10-22, yeni görselde yeniden ölçüldü):** nehir görselden piksel piksel çıkarıldı (kuzeydeki buzul şelalesinden güneye, taş köprünün altından, bataklık deltasından güneybatıda denize). Bölge I ve II nehrin batısında, bölge III doğusunda. **Ana yolda nehir yalnız King's Bridge'te (taş köprü) geçilir;** hiçbir yolda 8 pikselden uzun su geçişi yok (bataklıktaki Misty Marsh / Sunken Shrine adacıkları sığ kamış kanallarıyla bağlı). Burnt Hamlet ve Deserters' Camp yolları nehri geçmez.

**Tür dağılımı (33):** Battle 16 (+2), Elite 4 (+1), Boss 2, Treasure 5 (+3, hepsi korunan), Event 2, Town/City 2, Rest 1, Merchant 1. Savaşlı düğüm 28 (eski 22).

**Yeni düğüm kuralları:**
- Elit lider her yerde **sonda** (2. dalga), waves.md elit kuralı. **Deserter Captain (Ömer kararı):** yeni sprite (art-pipeline, ayrı iş; elit poz sayfası kuralıyla), **istatistikleri, skill'leri ve pasifi Bandit Chief'ten** (yeni kural yok). Sprite gelene kadar Bandit Chief çizimi yer tutucu. Eşlikçileri Watchtower'dakilerden (Poacher + Ember Acolyte) farklı.
- Korunan hazineler: arayüz Dwarven Mine / St. Brann's ile aynı, **içerik farklı** (3a).
- Çarpanlar (can / güç) uygulamada komşu karşılaşmalardan alınır, Cairn Hill emsali: Brackenridge ≈ Windy Moor, Raiders' Hoard ≈ Cairn Hill + %10, Sunken Shrine ≈ Misty Marsh, Supply Wagons ≈ Siege Line + %10, Burnt Hamlet ≈ Ashen Plain, Deserters' Camp ≈ Thornwood Hollow (PROVİZYON, sim'le ayar).
- Yeni lore metinleri (EN, 1 cümle, uygulamada yazılır): ör. Brackenridge *"Bracken hides the old hill track to Cairn Hill, and the thugs who fled Mill Road wait in it for stragglers."*

## 3a. Yeni hazinelerin içeriği (Ömer 2026-10-22: arayüz aynı, içerik farklı)

Yalnız var olan ödül türleri: sandık item sayısı (`grantLoot` > `maxItems`, Witch's Hut'ın küçük sandığı), sabit altın (`gold`), düğümün item seviyesinde belirli nadirlikte bir hediye item'i (`grantGift`, kasaba hediyesi) ve sabit hazine XP'si (değişmez). Standart sandık: 2 + 0,5 x takım item, 25 altın. Sayılar PROVİZYON (balance-tester; toplam değer standart sandığın ±%15'i içinde).

| Hazine | `events.json > treasures` id | İçerik | Metin (EN) |
|---|---|---|---|
| Raiders' Hoard (L1) | `raiders_hoard` | **altın ağırlıklı:** 1 item + **45 altın** | title *Raiders' Hoard* · text *"The raiders never spent what they stole. Under a cairn of moor stones lies a chest heavy with coin."* · reward *"Take the hoard: mostly coin, and one piece of gear."* |
| Sunken Shrine (L3) | `sunken_shrine` | **az ama iyi:** standart sandıktan 1 eksik item + **1 Uncommon hediye item** (garantili Uncommon) + 10 altın | title *Sunken Shrine* · text *"Pilgrims left their best at this shrine before the marsh rose. The offerings are few, but well kept."* · reward *"Take the offerings: a few fine pieces of gear."* |
| Supply Wagons (L7) | `supply_wagons` | **item ağırlıklı:** standart sandık + **1 Common hediye item** (en çok item), 10 altın | title *Supply Wagons* · text *"Morvane's quartermasters left the wagons to their guards. Crates of arms and armour wait under the tarps."* · reward *"Raid the wagons: plenty of gear, little coin."* |

Veri: hazine tanımına isteğe bağlı `loot: { maxItems?, itemsDelta?, gold?, gift? }`; kodda var olan `grantLoot` / `grantGift` seçenekleriyle okunur (campaign-dev, küçük). Dwarven Mine ve St. Brann's Abbey aynen. Harita penceresi şeridi (`map-window.json > art`): yeni görsel istenmedikçe var olan yedek davranış.

## 3b. Yeni görselde yerleşim (mockup `#v0`; kesirler görsele göre, x / 1672, y / 940)

- **I · The Borderlands (güneybatı kıyı, tepeler, geçit):** Mill Road taş köprülü kıyı yolunda, Ravenwood yarımadanın ormanında, Ruined Watchtower kayalık tepede, Ashford kumsalın üstünde, Windy Moor batı burnunda, Raiders' Hoard burnun uç falezinde, Brackenridge Ashford'un doğusundaki tepelerde, Cairn Hill koyun doğu kıyısında, Iron Pass kuzeydeki ormanlık sırtta, Charcoal Camp kalenin kuzeybatısındaki ormanda.
- **II · Valdren Vale (orta: kale, tarlalar, bataklık, taş köprü):** Valdren Keep görseldeki kalede; Dwarven Mine dağ eteğinde; Witch's Hut kalenin doğusundaki tarlalarda; Misty Marsh ve Sunken Shrine bataklık deltasının kamış adacıklarında; Grave Field ortadaki tarlalarda; Pilgrim Road ve St. Brann's Abbey kuzeyde dağ eteğinde; Black Cathedral nehrin batı kıyısına yakın; Riverside Camp nehrin batı kıyısında; King's Bridge taş köprünün üstünde.
- **III · The Northern Heights (doğu ve kuzey: kül ovası, sık orman, dağ yolu):** Ashen Plain köprünün doğusunda kül ovasının girişinde; Supply Wagons ova ile ormanın arasında yol kenarında; Thornwood Hollow güneydoğu ormanında; Siege Line, Forward Camp, Ember Road, Burnt Hamlet kül ovasında; Shepherd's Fold dağ eteğinde; Riverhead nehrin kaynağına (buzul şelalesi) yakın, doğu yakada; Gate of Cinders dağ yolunda; Deserters' Camp karlı dağlarda; Castle Morvane kuzeydoğudaki dağ kalesinin üstünde.
- Kurallar sağlandı: hiçbir düğüm kenara %5'ten yakın değil, denizde / suda düğüm yok, rozetler arası en az ~120 px (1920 dünyasında), yollar birbirini kesmez, hiçbir rozet bir yolun 55 px'ten yakınında değil (ölçüm betiği, görselin su maskesiyle).

## 4. Kod ihtiyacı (küçük, campaign-dev; motor yok)

1. **Cep (çıkmaz dal) desteği:** Valdoria'da şu an çıkmaz dal yok. `allRoutes` / rota testleri / K1 cepleri rota saymamalı; düğüm bayrağı `optional: true` (mockup'taki gibi). Cepteki oyuncu yalnız geri yol görür (serbest dolaşım zaten var; `nextStep` ileri yol yoksa geri seçenek veriyor). Harita 2-3 de aynı altyapıyı kullanacak.
2. **Yol çizgisi dili (Ömer kararı, uygulama işi):** oyunda bugün kesik çizgi = seçimli rota (`edges[].style`: tek yol `solid`, seçimli `dashed`; `tests/campaign.test.ts` bunu sınar). Yeni kural: **çatallar dahil tüm yollar düz, yalnız cep yolları kesik.** Yapılacak: `valdoria.json` kenar stilleri (çatal kenarları `solid`, cep kenarları `dashed`), `CampaignMapScene` yol çizimi + harita lejantı ("Dashed road: optional pocket"), kenar stili testi, Codex > Mechanics harita metni. Harita 2-3 aynı kuralla.
2b. **Elle kavis (`ctrl`):** oyunda yollar kimlikten otomatik hafif kavislidir (`CampaignMapScene > curve`). Yeni görselde Iron Pass → Valdren Keep yolu Charcoal Camp'in üstünden dolanmalı (yoksa Cairn Hill → Charcoal Camp yoluyla kesişir); bunun için kenar verisinde isteğe bağlı `ctrl: [x, y]` (mockup'taki kontrol noktası), yoksa bugünkü otomatik kavis. Küçük çizim kodu.
3. **Eğitim ölçeği:** `campaign.json > enemyScale.skipRegions: ["I"]` bugün yalnız eğitim düğümlerini (1-4) kapsıyor. Bölge I büyüyünce Windy Moor / Cairn Hill / Iron Pass / Charcoal Camp'in dengesi değişmesin diye bu alan **düğüm listesine** çevrilir (`skipNodes: ["1","2","3","4"]`). `waves.json > reinforce.regionGroups` etkilenmez (bu dört karşılaşmanın elle yazılmış 2. dalgası var); `tutorial.json > defeatHints.regions ["III"]` aynı.
4. Testler: graf (33 düğüm, 96 rota, hepsi 22 durak, 6 çatal, 4 cep, K1/K2), seviye, eski kayıt (Cairn Hill testinin aynısı), karşılaşmaların geçerli class'a işaret etmesi, rozet arası en az 120 px. Wiki (Codex) ve harita blurb'ü: *"From Mill Road to Castle Morvane: 33 stops, 6 choice points, 22 stops per run."*
5. Debug: var olan "düğüme ışınlan / temizlenmiş say" araçları yeni düğümleri listeden kendiliğinden alır.

## 5. Kayıt uyumu

- **Eski id'lerin hepsi korunur; hiçbir kenar silinmez**, yeni düğümler yeni id alır (`hills, hoard, shrine, wagons, hamlet, deserters`). Kayıt sürümü **değişmez (12)**, göç kodu gerekmez.
- Yarım sefer açılınca: `path`, `visited`, `cleared`, `replays`, duraklatılmış savaş eski düğümlerde olduğu gibi geçerli kalır (yol günlüğündeki her adım hâlâ var olan bir kenar). Yeni düğümler **temizlenmemiş** sayılır.
- Oyuncu yeni düğümün **önündeyse** (ör. Ashford'da): yeni seçenek doğrudan çıkar. **Gerisindeyse** (ör. Ember Road'u geçmiş): yeni cep / kol serbest dolaşımla geri yürünerek açılır; yürüyüş temizlenmemiş düğümde durur, savaş orada (Cairn Hill emsali, `tests/campaign-cairn-compat.test.ts`). Geri dönmek zorunlu değil; ana yol hiç kapanmaz.
- Bölge değişikliği yalnız görünüm: kayıt yuvası özeti bölge başlığını haritadan canlı okur (Windy Moor'da duran kayıt artık "I · The Borderlands" yazar).
- Test: eski kayıt taklidi (yeni id'ler durumdan silinir) Ashford'da, Valdren Keep'te, Ember Road'da ve Castle Morvane önünde açılır ve ilerler.

## 6. Seviye eğrisi ve denge etkisi

- Düğüm seviyesi = Ashford'dan en kısa yol (`levels.json > rampStartSteps 2`, final L10). Yeni kollar eski kollarla aynı uzunlukta, cepler yol dışında → **eski 27 düğümün seviyesi birebir aynı.** Yeni düğümler: Brackenridge L1, Raiders' Hoard L1, Sunken Shrine L3, Supply Wagons L7, Burnt Hamlet L8, Deserters' Camp **L10** (Gate of Cinders'tan bağlandığı için final ile aynı seviye; boss öncesi farm yeri).
- **XP etkisi (tahmin):** her şeyi bir kez oynayan farmsız bölük, ceplerden ve Burnt Hamlet'ten kahraman başına ~+380 XP alır (Deserters' Camp elit x2 bunun yarısından fazlası; L10'a taşınınca biraz daha) → bölüm 1 sonu **~L8,5 → ~L9,1-9,2**. Cepleri atlayan oyuncu için değişiklik yok. `tests/levels.test.ts` (8,5 ± 0,5) rota boyunca ölçüyorsa etkilenmez; tüm düğümleri sayıyorsa sınırda kalır.
- **Harita 2 ile uyum:** Harita 2'nin ilk 3 düğümü L10 (maps-2-3.md 8). Bugün farmsız oyuncu L8,5 ile 1,5 level geride başlar; yeni cepler isteyene **farmsız yaklaşık L9** ve tekrar oynanabilir elit / hazine (Deserters' Camp L10) ile L10'a yetişme yolu verir. Bu yönde iyi; ayrıca `enemyXp` ayarı gerekmez (önerim).
- **Denge riski:** Burnt Hamlet kolu Shepherd's Fold'un dinlenmesinin yerine savaş koyar (o rotada final öncesi son dinlenme yok: Forward Camp tüccar). Final boss başarı oranı o rotada düşebilir; bilinçli seçim (Ömer 2026-10-22: kol olarak kalıyor).
- **Önerilen sim (çalıştırılmadı, Ömer onayıyla):** (1) `npm run sim:campaign -- --mode=flat 300 1 medium medium`: yeni kollar (Brackenridge, Burnt Hamlet) ve eski düğümlerin oranı değişmedi mi; (2) `tests/levels.test.ts` + levels ölçümü: bölüm 1 sonu level (cepli / cepsiz); (3) **cepler sim'de oynanmaz** (sim serbest dolaşım yapmıyor): 4 cep için ya sim'e "cepleri de oyna" seçeneği (campaign-dev) ya da debug kurulumundan 96'lık hızlı ölçüm (balance-tester).

## 7. Ömer'in cevapları (2026-10-22)

1. Bölge kayması (10 / 11 / 12): **onaylandı.**
2. Oyunda da çatallar düz, cepler kesik: **evet** → uygulama işi (4. bölüm madde 2).
3. Deserters' Camp lideri **"Deserter Captain"**: kesin; **yeni sprite** (art-pipeline, ayrı), istatistikler Bandit Chief'ten.
4. Burnt Hamlet Shepherd's Fold'a **alternatif kol** olarak kalır; yolu nehri geçmez (yeni konum 3. bölümde).
5. Yeni hazineler: arayüz aynı, **içerik farklı** (3a).
6. **33 düğüm yeterli.**
7. Mockup'ta bölge zoom'unda görselin dışı (siyah) görünüyordu: zoom ve kaydırma görsele kilitlendi (aşağıda). Yeni harita görseli geldi ve onaylandı; konumlar ona göre yerleşti (3b).

**Oyunda bu sorun nasıl çözülmüş (`src/game/wide-map.ts`, `assets/campaign/valdoria-bg-wide.webp`):** oyunun dünyası 1920x1080 (eski 16:9 harita); geniş ekranda sahne 2580'e kadar esner. `valdoria-bg-wide.webp` (1916x821, 21:9, ChatGPT outpaint) eski haritayı içinde bir dikdörtgen olarak taşır (`valdoria.json > backgroundWide.region` = [0,082, 0,001, 0,798, 0,941]); `placeArt` bu dikdörtgeni dünyaya oturtur, görselin fazlası iki yana (sağda daha çok) taşar. Kamera: yakınlaştırma yalnız x1-x1,4 (`map-view.ts > MAP_ZOOM`), merkez `clampMid` ile görselin kapsamına (`frame`) kilitli, kalan kenarı `edgeFillers` doldurur. Bu yüzden oyunda siyah kenar görünmez; mockup ise yalnız 16:9 görseli ve x2,4'e varan bölge zoom'unu kullandığı için kenarda siyah açılıyordu. Düğüm konumları eski 16:9 görsele göredir; yeni görsel gelince ya `region` yeniden ölçülür ya da konumlar yeni görsele göre yazılır.

**Mockup çözümü (`public/mockups/maps-2-3/m.js > clampView`):** bölge görünümünde ölçek en az görseli sahneye tam kaplatacak kadar ("cover"), kaydırma görsel kenarında durur; kenara yakın bölgede kamera kendiliğinden içeri kayar. Tekerlek ve sürükleme de aynı kilitten geçer. Uzak görünüm (tüm harita) değişmedi (sahne oranı görselle aynı). Üç harita sekmesinde de geçerli.

Kalan açık soru: yok.

## 8. Uygulama notları (campaign-dev 2026-10-22)

- **Veri:** `valdoria.json` 33 düğüm, konumlar mockup `maps-2-3/data.js` Map I'den (görsel oranı); yeni düğüm `optional: true` = cep; kenar `style`: hepsi `solid`, cep kenarları `dashed`; Iron Pass -> Valdren Keep `ctrl` [0,3469; 0,1809]. Görsel: `assets/source/maps-1/valdoria-map-v2.png` -> `assets/campaign/valdoria-bg.webp` (1672x941, WebP q86). `backgroundWide` kaldırıldı (eski çizime aitti; open-questions 384/5).
- **Graf:** `graph.ts > mainOutgoing / isPocket / pockets`; rota, seçim noktası ve K1 cepleri saymaz; `validateMap` cebin tek girişli ve ileri yolsuz olduğunu denetler. Sim rotaları da (`src/sim/campaign.ts`) cepsiz: 96 rota.
- **K1:** tek bilinçli istisna Ember Road -> Shepherd's Fold (test bunu açıkça bekler; open-questions 384/1).
- **Karşılaşmalar** (`encounters.json`, yeni girdiler sonda): `brackenridge`, `hoard_guards`, `shrine_drowned`, `wagon_guard`, `burnt_hamlet`, `deserters_camp`; hepsi elle yazılmış 2 dalga (`units` + `waves`), elit lider sonda. Deserter Captain: `class: bandit_chief`, `name`, `tier: elite`, `sprite: deserter_captain` (yer tutucu; motor bu alanı henüz okumuyor).
- **Hazineler** (`events.json > treasures`): `raiders_hoard`, `sunken_shrine`, `supply_wagons`; içerik `loot: { maxItems?, itemsDelta?, gold?, gift? }` (`state.ts > completeSimple`, `loot.ts > grantLoot / grantGift`).
- **Eğitim ölçeği:** `campaign.json > enemyScale.skipNodes [1, 2, 3, 4]` (eski `skipRegions [I]`).
- **Harita sahnesi:** yol dili (düz / cep kesik), `ctrl` kavisi, lejant satırı, düğüm şeridinde "optional", Ashen Plain gri tonu kaldırıldı. **Bölge görünümü** (`src/game/region-view.ts`, sahne `setRegionView / setFocus`): sağ alttaki düğme; bölgeye yakınlaşır (görseli kaplar, en çok x2,4, oyuncu yakınlaştırması üstüne), komşu bağlantı düğümü %65, yolu %80, üstüne gelince yol hafif sarı; görülmemiş bölgenin düğümü çizilmez; kafile bölge değiştirince odak izler.
- **Debug:** Campaign > Map > "Region view" (kapalı -> I -> II -> III -> kapalı); "Teleport to stop" yeni düğümleri listeler (cepler "(pocket)").
- **Testler:** `tests/campaign-map1-rework.test.ts` (seviyeler, karşılaşmalar, eğitim ölçeği, cep akışı, hazine içerikleri, eski kayıt: Ashford / Valdren Keep / Ember Road / Gate of Cinders, bölge görünümü hesapları) + güncellenen graf / uyum testleri.
