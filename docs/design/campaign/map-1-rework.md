# Harita 1 (Valdoria) yeniden çizim + genişletme (PLAN, Ömer onayı bekliyor)

Durum: **TASLAK (campaign-dev 2026-10-22).** Oyun koduna ve `data/campaign/valdoria.json`'a dokunulmadı. Görsel taslak: `public/mockups/maps-2-3.html#v0` (Map I sekmesi; yeni düğümlerin ipucunda "New" etiketi var).
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

Mockup no = `#v0` sekmesindeki numara (rota sırası). Karşılaşma: 1. dalga · 2. dalga (var olan class'lar; tırnak içi görünen ad). Eski düğümlerin her şeyi (karşılaşma, boss, kasaba, metin, konum) aynen.

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
| 29 | `hamlet` | **Burnt Hamlet** | Battle · Ash Ghouls | 2 Ghoul + Ash Hound + Grave Chanter · 2 Skeleton "Risen Skeleton" + Charcoal Burner | 8 | **YENİ** (Shepherd's Fold'a paralel kol: dinlenme mi, savaş + XP mi) |
| 30 | `head` | Riverhead | Battle | riverhead | 9 | ESKİ |
| 31 | `deserters` | **Deserters' Camp** | Elite · Deserter Captain | 2 Morvane Halberdier + Bandit Crossbowman "Siege Crossbowman" · **Bandit Chief "Deserter Captain" (elit)** + Shieldwarden + Moor Raider "Ember Outrider" | 9 | **YENİ CEP** (Riverhead'den) |
| 32 | `gate` | Gate of Cinders | Battle | gate_of_cinders | 9 | ESKİ |
| 33 | `12` | Castle Morvane | Final Boss | castle_morvane | 10 | ESKİ |

Yeni kenarlar (eski kenarların hiçbiri silinmez): `4→hills`, `hills→cairn`, `moor→hoard`, `5A→shrine`, `10→wagons`, `road→hamlet`, `hamlet→head`, `head→deserters`.

**Tür dağılımı (33):** Battle 16 (+2), Elite 4 (+1), Boss 2, Treasure 5 (+3, hepsi korunan), Event 2, Town/City 2, Rest 1, Merchant 1. Savaşlı düğüm 28 (eski 22).

**Yeni düğüm kuralları:**
- Elit lider her yerde **sonda** (2. dalga), waves.md elit kuralı. Deserter Captain = var olan **Bandit Chief** mobu, yalnız görünen adı farklı (`name` alanı). Eşlikçileri Watchtower'dakilerden (Poacher + Ember Acolyte) farklı.
- Korunan hazineler için `events.json > treasures`'a 3 yeni metin (`raiders_hoard`, `sunken_shrine`, `supply_wagons`) ve harita penceresi görseli gerekir; görsel yoksa var olan yedek davranış (yeni görsel yalnız Ömer isterse, art-pipeline).
- Çarpanlar (can / güç) uygulamada komşu karşılaşmalardan alınır, Cairn Hill emsali: Brackenridge ≈ Windy Moor, Raiders' Hoard ≈ Cairn Hill + %10, Sunken Shrine ≈ Misty Marsh, Supply Wagons ≈ Siege Line + %10, Burnt Hamlet ≈ Ashen Plain, Deserters' Camp ≈ Thornwood Hollow (PROVİZYON, sim'le ayar).
- Yeni lore metinleri (EN, 1 cümle, uygulamada yazılır): ör. Brackenridge *"Bracken hides the old hill track to Cairn Hill, and the thugs who fled Mill Road wait in it for stragglers."*

## 4. Kod ihtiyacı (küçük, campaign-dev; motor yok)

1. **Cep (çıkmaz dal) desteği:** Valdoria'da şu an çıkmaz dal yok. `allRoutes` / rota testleri / K1 cepleri rota saymamalı; düğüm bayrağı `optional: true` (mockup'taki gibi). Cepteki oyuncu yalnız geri yol görür (serbest dolaşım zaten var; `nextStep` ileri yol yoksa geri seçenek veriyor). Harita 2-3 de aynı altyapıyı kullanacak.
2. **Yol çizgisi dili:** oyunda bugün kesik çizgi = seçimli rota (referans görseldeki lejant). Onaylı mockup dilinde çatallar düz, **cepler kesik**. Oyun çizimi ve lejant buna geçer (soru 2).
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

- Düğüm seviyesi = Ashford'dan en kısa yol (`levels.json > rampStartSteps 2`, final L10). Yeni kollar eski kollarla aynı uzunlukta, cepler yol dışında → **eski 27 düğümün seviyesi birebir aynı.** Yeni düğümler: Brackenridge L1, Raiders' Hoard L1, Sunken Shrine L3, Supply Wagons L7, Burnt Hamlet L8, Deserters' Camp L9 (tabloda).
- **XP etkisi (tahmin):** her şeyi bir kez oynayan farmsız bölük, ceplerden ve Burnt Hamlet'ten kahraman başına ~+380 XP alır (Deserters' Camp elit x2 bunun yarısından fazlası) → bölüm 1 sonu **~L8,5 → ~L9,1**. Cepleri atlayan oyuncu için değişiklik yok. `tests/levels.test.ts` (8,5 ± 0,5) rota boyunca ölçüyorsa etkilenmez; tüm düğümleri sayıyorsa sınırda kalır.
- **Harita 2 ile uyum:** Harita 2'nin ilk 3 düğümü L10 (maps-2-3.md 8). Bugün farmsız oyuncu L8,5 ile 1,5 level geride başlar; yeni cepler isteyene **farmsız yaklaşık L9** ve tekrar oynanabilir elit / hazine (Deserters' Camp L9) ile L10'a yetişme yolu verir. Bu yönde iyi; ayrıca `enemyXp` ayarı gerekmez (önerim).
- **Denge riski:** Burnt Hamlet kolu Shepherd's Fold'un dinlenmesinin yerine savaş koyar (o rotada final öncesi son dinlenme yok: Forward Camp tüccar). Final boss başarı oranı o rotada düşebilir; bilinçli seçim olarak bırakılabilir (soru 4).
- **Önerilen sim (çalıştırılmadı, Ömer onayıyla):** (1) `npm run sim:campaign -- --mode=flat 300 1 medium medium`: yeni kollar (Brackenridge, Burnt Hamlet) ve eski düğümlerin oranı değişmedi mi; (2) `tests/levels.test.ts` + levels ölçümü: bölüm 1 sonu level (cepli / cepsiz); (3) **cepler sim'de oynanmaz** (sim serbest dolaşım yapmıyor): 4 cep için ya sim'e "cepleri de oyna" seçeneği (campaign-dev) ya da debug kurulumundan 96'lık hızlı ölçüm (balance-tester).

## 7. Açık sorular (Ömer)

1. **Bölge sınırı:** Windy Moor → Charcoal Camp bölge I'e geçsin mi (önerim; 10/11/12)? Alternatif: bölgeler eski sınırda kalır, yeni düğümler eklenir (4+2 / 14+1 / 9+3: dengesiz ama hiçbir eski düğümün bölgesi değişmez).
2. **Yol çizgisi:** oyunda da mockup'taki gibi çatallar düz, cepler kesik olsun mu? (Bugün oyunda kesik = seçimli rota; referans haritanın lejantı böyle.)
3. **Deserters' Camp lideri:** var olan Bandit Chief'i "Deserter Captain" adıyla kullanmak uygun mu? Alternatifler (hepsi var olan): Thane of the Deep (Dwarven Mine'daki lider), High Priest of the Undying (Black Cathedral), Drake Priest (Thornwood Hollow), Ember Hierophant'ı elit rütbesiyle lider yapmak. Yeni elit çizimi / kiti yok.
4. **Burnt Hamlet:** Shepherd's Fold'a alternatif kol olarak kalsın mı (dinlenme mi XP mi seçimi), yoksa Riverhead'den bir cep mi olsun (rota hep dinlenmeli kalır)?
5. **Yeni hazinelerin ödülü:** var olan korunan hazine kuralı (sandık + altın, Dwarven Mine ile aynı) yeterli mi? Pencere görseli için var olan bir görsel (ör. dwarven_mine) mi kullanılsın, yeni görsel mi?
6. **Sayı:** 6 yeni düğüm (33) yeterli mi, yoksa bölge II'ye bir elit cep daha (34) ister misin? (Elit lider seçeneği soru 3'teki listeden.)
7. Haritanın arka plan görseli aynı kalıyor (yeni düğümler var olan araziye oturuyor: Brackenridge tepelerde, Raiders' Hoard karlı sırtın eteğinde, Sunken Shrine bataklık göllerinde, Supply Wagons güney ormanının kıyısında, Burnt Hamlet nehir kenarında, Deserters' Camp kuzey sırtlarda). Uygun mu?
