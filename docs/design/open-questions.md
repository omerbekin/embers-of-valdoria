# Açık Sorular ve onay bekleyen varsayımlar
> **Ne için / Güncel mi (2026-11-08):** Ömer'a açık sorular (madde 1-2) ve onay bekleyen varsayımlar. Eski maddeler (1-520): `docs/archive/design/open-questions-archive.md`.

Bu dosya iki şey tutar: Ömer'e açık sorular ve agentların Ömer onayı almadan yaptığı varsayımlar. **Kararlar burada durmaz:** Ömer'in verdiği karar konunun sahip belgesine yazılır (`docs/arch/docs-map.md`; sınıf için `docs/design/classes/<id>.md` > Ömer kararları, mekanik için `combat.md` / `docs/arch/battle-engine.md`, sefer için `campaign/*`, item için `progression/*`).

- **Eski maddeler (1-520) arşivde:** `docs/archive/design/open-questions-archive.md` (aramada hariç; numarayla arıyorsan yolu açıkça ver). Madde 330-520'nin A/B/C/D listesi arşivde "Madde 330-517 ve üç Q-NEW" başlığında. Bir belge "open-questions madde N" diyorsa tam metin arşivdedir.
- **Yeni madde:** dosyanın SONUNA, "Onay bekleyen varsayımlar" altına `## Q-NEW. Başlık (tarih, agent)` olarak, en çok birkaç satır. Ömer cevap verince karar sahip belgeye yazılır, madde arşive taşınır.
- Aşağıdaki satırlar kısa özettir; "(madde N)" tam metnin arşivdeki numarasıdır.

## Ömer'e açık sorular

1. **Hukuki metin (madde 415):** gizlilik metnindeki hukuki dayanak ve "13 yaş altı giriş yapmasın" satırı oyunda var (`data/account-notice.json`); avukat kontrolü ve Türkiye veli onayı yaşı bekliyor (oyun kararı değil, dış kontrol).

2. **Kasabada ücretli dinlenme / Fountain dolumu:** ilerleme yol haritası karar 7 (2026-10-09) hâlâ açık (Ömer 2026-11-09, büyük form: "Sonra sor"; açık kalır, sonra yeniden sorulacak): Rest altın istesin mi (ilk dinlenme bedava, sonra bölüm seviyesine göre küçük ücret), elit / boss sonrası Fountain benzeri dolum olsun mu. İlgili fikir satırı: `docs/design/future-ideas/campaign.md` (Hades mantığında can). Eski plan: `docs/archive/design/progression/roadmap-2026-10.md` bölüm 2.3 D ve 2.5.

3. ~~Skald ve Vesper kişisel görevi~~ KAPANDI (Ömer 2026-11-09, büyük form): Harita 2'de görevsiz kalır; karar `campaign/map2-quests-surge.md`'de.
4. ~~Karakter tier sistemi kapsamı~~ KAPANDI (Ömer 2026-11-14, form r17): Skald ve Vesper için tier satırı yazılmaz, plan konsept kalır; karar `progression/character-tiers.md`'de.
Eski liste madde 2-16 2026-11-08'de kapandı: bugünkü oyun davranışı Ömer'in cevabı sayıldı. Liste arşivde "2026-11-08 doğrulama: kapanan D/B".


## Onay bekleyen varsayımlar

Hepsi kodda bugünkü davranış. Ömer onayı bekliyor; itiraz gelirse değişir. Tam metin arşivde.

- **332** Settings sayfalı düzen: Fullscreen Display sayfasında, Privacy'de Copy log / Info ayrı satır, son sayfa oturumda hatırlanır, klavye gezinme kuralları.
- **333** Bölge III mob paketi: YM20 Close Ranks, YM22 Molten Shed, YM23 Crown of Ash yeni mekanikleri (YM21 onaylı) ve Lord Morvane sim ayarı. Ayrıntı arşiv `docs/archive/design/campaign/mob-plan.md` 10.
- **356** Harita 1 düğüm lore cümleleri content-designer taslağı; Ömer okuyup onaylamadı.
- **366** 0.9.1 gecesi küçük kararları: Gear sekme ikonları, tek Bad Omen göstergesi, Cairn Hill düğümü, DEFEATED damgası, mob VFX ölçeği, loot `gripWeight` 2,5, Thane ayarı.
- **402** Evolve ikonu: sanat varsa ikon değişir, Codex / QB / MP'de animasyon yok, Performance Mode'da durur, pasif satırı evolve'u bağlanmadı.
- **405** Hikâye sinematikleri: Prologue kahraman seçiminden önce, zafer sinematikleri ganimetten sonra, Esc = Skip, yarıda kesmek "görüldü" sayılır.
- **428** Harita 2 Wayshrines ve Salvage Dive: sınav türleri, nimet sayıları, dalış derinlikleri ve yenilgi kuralı (sayılar provizyon).
- **430** Storm (yalnız `motion: ranged` skill'ler, -15 isabet puanı) ve Tidewater Urn (oyuncu tahtası orta hücre, global eylem) varsayımları.
- **432** Crown Surge / Ashen Taint: provizyon sayılar, Ash çağrılara da gider, YZ ve sim Surge kullanmaz (Ömer cevapları 449'da; kalanlar burada).
- **433** Harita 2 deniz kuralları: crossing bayrağı, Charter 60 altın (provizyon), Caravel hareketi, Gallows Cove kapısı, Lantern Rock +1 görüş.
- **434** Mill Road sonrası katılım ve zorunlu Formation spot ışığı: kapı Ravenwood'a dokununca, kilitliyken yalnız bakma serbest.
- **467** Kasaba level'ı / dükkân tavanı (kural onaylı): tavan = sonraki kasabaya kadarki en güçlü mob level'ı, 1 mob level'ı = 1 item level'ı, yalnız `town` türü sınır.
- **472** Harita 3 Heat / Cave-in / Darkness + Lantern: Cave-in ayrı kural, sayılar geçici, Lantern yalnız hc_43.
- **473** Frozen köşe durumları: zemin yeniden Chilled verir, Burning tiki çözer, Ice hücresi 2 tur.
- **475** Harita 3 şimşek kuralları: etiket kapısı `thunder`, ıskalayan bolt da düşer, su 1 tur canlı, ark / Shatter sayıları geçici.
- **476** Harita 3 imza mekanikleri (Thunder Rod vb.): sayılar provizyon, en basit yorum.
- **477** Harita 3 mobları: Pole Vault, Undermine, Slagcart, Headlong, Ring the Anvil, Stormhide yorumları; Rime Witch / Rime Hound yer tutucu.
- **478** Harita 3 E1-E6 dokunuşları (Overheat, Whiteout, The Long Sermon, Storm in the Chimney); altı boss kit bekliyor. Ayrıntı arşiv `docs/archive/design/campaign/maps-2-3-plan.md` son bölüm.
- **480** Tek kişilik sefer başlangıcı: Defender / Paladin skill açılış sırası, XP bölünmüyor, çarpan düğüme bağlı, metinler taslak.
- **482** Harita 1 tek kişilik eğri: kolay düğüm listesi genişledi, Iron Pass / Charcoal Camp hedefi ~93 agent seçimi, yalnız Medium ölçüldü.
- **487** Affix ölçüm aracı (`npm run sim:affix`): ilvl dilimi oynanır, temel takım Uncommon, ölçü savaş sonu ortalama can.
- **488** Level farkı saldırı bonusu: +%2 isabet düz puan, yalnız doğrudan hasar vuruşu, yalnız düşmana, çağrı çağıranın level'ını alır.
- **498** Zemin tepkimesi / rozet küçük değişiklikleri: Ice + ateş Quenched, Purified `poisoned` siler, zemin rozeti durum varken gizlenir.
- **502** Affix dağılımı adım 3: direnç girdisi 2 kat, `needs` alanı olmayan B / A affix her sınıfa uyar, Reforge'da sınıf ağırlığı yok.
- **513** Pilot set motoru (`setsEnabled` kapalı): Ashguard yalnız Warrior / Defender / Paladin, parça affix'leri elle, ertelenen hasar yuvarlama, set düşüş oranı.
- **518** Thunder Skald: War Drum karesi tahta kenarında kırpılır; bölünmüş vuruş Guard / Phalanx'ta tek vuruş sayılır, hedef ilk parçada düşerse ikinci parça yok (sayılar 2026-11-08 simiyle kapandı).
- **519** Vesper ağacı v3: bedava Toll düğümleri hedefsiz, Judgement Peal seçicisiz, Long Glare yerine Glaring Peal; sayılar tahmin. Ayrıntı `classes/vesper.md` bölüm 3.
- **520** Skald ağacı v1: Hammer Spark Slow / Stun koşullu kancayla, War Drum `castCount` dostları sayar, YZ procChance'lı kancaları şansıyla değerler; sayılar tahmin. Ayrıntı `classes/skald.md` bölüm 3.

## 524. Respec malzemeleri
(Ömer 2026-11-14, form r17: onaylanan maddeler `docs/arch/areas/campaign.md` > Kararlar'a taşındı.) Onay bekleyen iki madde (Lead'in brief'inden; bu dosyada daha önce yazılı değildi):
- **Kasaba hover bilgisi:** kasaba düğümünün üstüne gelince ek bilgi gösterilsin mi.
- **Kilitliyken lore yerine kilit notu:** kilitli düğümde lore metni yerine kısa kilit notu gösterilsin mi.
## 525. Kan / lanetli zemin varsayımları (2026-11-09, engine-dev)
## 521. Kan / lanetli zemin varsayımları (2026-11-09, engine-dev)
- Kan zemini süresi 2 tur (vuranın turlarıyla), lanetli zemin süresi 2 tur: Ömer sayı vermedi; diğer tepkime/skill zeminleriyle aynı (`formulas.json > blood.turns`, `skills.json > withering_curse`).
- Kan yalnız kararlaştırılanı yapar: Soaked (herkese, su gibi), şimşeği iletir (Live Water), Chill/Ice ile Ice, Tremor Slam'de sıvı. Ateşi söndürmez, zehri yaymaz, kutsal ateşle kutsal suya dönmez.
- Ağır kritik eşiği vuruş başına (çok vuruşlu skill'de her vuruş ayrı); split vuruşta (Hammer Spark) yalnız fiziksel parçanın can kaybı sayılır; hedef ölse de kan düşer.
- Kansız listesi agent seçimi (görünüşe göre): iskeletler, donmuş iskelet askerler, ruhlar, golem/taş bekçiler, ateş elementali, yapı nesneleri, Skeleton ve Treant çağrıları. Ghoul/Drowned/Wight gibi etli ölüler kanlı.
- Kutsal ateş + lanet iki sırada da (lanet kutsal ateşin üstüne atılınca da) ikisini siler.

## 526. Boss / elit debuff gücü, Guard, Explosion, Tremor Slam varsayımları (2026-11-09, engine-dev)
## 522. Boss / elit debuff gücü, Guard, Explosion, Tremor Slam varsayımları (2026-11-09, engine-dev)
- Yalnız büyüklük ölçeklenir (boss %25, elit %50); süre, DoT tikleri (Burning, Poisoned, Wither, Searing, Bleeding) ve doğrudan hasar aynı (Lead brief'i).
- Açık/kapalı (sayısız) CC dışı debuff'lar boss'ta TAM işler: Ley Thread, Branded (Ley Brand değerleri brand nesnesinde, ölçeklenmedi), Saltbound (yalnız kahramana), Staggered (boss mekaniği). Spellbound yalnız moblar verir.
- ~~Slow hâlâ CC~~ CEVAPLANDI (Ömer onaylı 2026-11-09, form 3): Slow CC değil, boss %25 / elit %50.
- Kendi tarafının verdiği debuff (Warden Overextended, Cooling, Overreached) ve kaynaksız ortam suyu (Tide Soaked) tam güç.
- ~~Blinded / Jinxed / Shaken boss'ta Immune~~ CEVAPLANDI (Ömer onaylı 2026-11-09, form 3): boss bağışık değil, %25 güçle (elit %50). Misfortune boss'ta hâlâ yok (`omenCrit`), elitte %50.
- Explosion "iki taraf": kahraman ya da düşman tahtasında patlasa da çalışır, tetiği verenin düşmanlarını vurur (zemin kuralı). Dost ateşi (tetiği verenin kendi takımı) eklenmedi; istenirse ayrı karar.
- Tremor Slam sıvıları: Poison, Flooded, Flooded Planks, Holy Water, Healing Rain (su sayılır), Blood. Lingering Rain (Bleeding, ok yağmuru) ve Chill Ground / Ice sıvı sayılmadı. Kaynak hücre = isabet eden hedefin hücresi (ıska / boş hücre sıçratmaz). YZ değeri sıçramanın tetikleyeceği tepkimeleri saymaz.

## 527. Element formu varsayımları (2026-11-09, engine-dev)
## 523. Element formu varsayımları (2026-11-09, engine-dev)
- Rot (zehir + lanet, Ömer onaylı çürüme): zehir tiki +%25 `formulas.json > rot.poisonMult` PROVİZYON (sim gerek); Black flame gibi Unhallowed da verir (agent varsayımı), T2.
- Erime Soaked'ı 2 tur (`statuses.json > frozen.thawsInto`). Frost venom Chilled'ı 2 tur. Brittle / Brittle frost Shredded'ı taban zırhın %20'si, 1 tur (`armorRatio`).
- Bloody water: Bleeding gücü tahtanın ortalama maks canının %3'ü, su kuralı gibi iki tarafa da; T2, başka tepkimeye girmez. Black flame / Grave frost da başka tepkimeye girmez (söndürülmez).
- Birim üstü tepkimeler yalnız skill / şimşekle gelen durumda işler (zeminin verdiği durumda değil). Flash freeze yalnız skill / ağaç atışındaki Chilled ile (Frozen kuralı gibi; Hoarfrost pasifi dondurmaz). Steam, Explosion'dan önce bakılır.
- Wet venom zincirlenmez ve yalnız düşmana geçer. Tepkime durumları (şimşek tepkimeleri dahil) yalnız tetiği verenin düşmanlarına.
- Healing Rain şimşeği iletir ama hâlâ ıslatmaz. Hexed spark: lanetli sudaki ıslak birim yine Electrocuted olur; yalnız kuru Shocked düşer.
- Su yayılmasında alan = hücredeki suya bağlı su hücreleri; taşma tepkime hücresinden başlar ve suyla sınırlı değil, her bitişik hücreye gidebilir.
- Electrocuted 1 tur rozet (`thunder.stunTurns`); birimin ilk skill'i tek hedefli hasar değilse yalnız sıra çubuğu sıfırlanır. Dosta vuruş tam güçte.

## 528. İlk skill puanı ipucu: düğüme tıklamak mı, basılı tutmak mı? (2026-11-15, form r19) — KAPANDI: 0.9.11.5'te basılı tutma geldi; `tree_point_hint` buna göre yazıldı.
## 529. Witch's Hut Rare / Epic ve r19 kapanışı varsayımları (2026-11-15, balance-tester)
- Nadirlik sabitlenince sandık zarı yine atılır: item tabanı, malzeme zarı (%40) ve Rare pity sayacı zarın KENDİ nadirliğine göre işler (oyuncu Rare alsa da zar Common attıysa pity artar).
- Epic zarı sefer + harita + düğüm + seçenek seed'li tek zar (yükleme / tekrar deneme değiştirmez). 5000 seed'de %8,48.
- Yeni İngilizce metinler: ipucu "Pay 60 gold. She gives you a Rare item from her chest (8% chance it is Epic) and keeps the coins.", harita penceresi "Pay 60 gold. A Rare item from her chest, 8% chance of Epic." (eski metin "two items" diyordu), çip "1 Rare item (8% Epic)" (veriden). İki metinde "8%" elle yazılı: oran değişirse metin de değişmeli. Sonuç çipi genel kaldı ("1 item from the chest").
- Skald yama yolları maddesi arşive taşındı: Shocked tetiği ve `split.share` / `splash.jumps` sınırları için Ömer ayrıca cevap vermedi, bugünkü davranış olarak kaldı.
## 530. Hexer ağacı ve Castle Morvane öneri varsayımları (2026-11-15, balance-tester, Tur 20; Ömer r21'de cevapladı: Hexer kabul, Leeching Rot %4 kaldı, Jinx süre/bekleme denendi; Morvane ara değer)
- "Yol A / Yol B" = ilk doldurulan satır: A = Withering Curse satırı (rows 2,3), B = Jinx satırı (rows 3,1); L20'de odaklı kurulum 16 puanın hepsini ilk satıra verir, ikinci satır boş kalır. Ölçü 300 savaş (Hexer n=130, gürültü ±8 puan): yön gösterir, karar değil.
- Yol B sayılarla +16'da doyuyor (Jinx tek hedef, savaş başına ~1,6-1,8 kez tetikleniyor); +20'ye çıkmak için süre / bekleme (Jinx cooldown, Lasting Jinx, Clinging Jinx `keepChance`) gerekir: bunlar süre sayıldığı için değiştirilmedi, Ömer'e soru.
- Ağaç `version` artırılmadı (artarsa herkese bedava respec gider); sayılar değişince oyuncunun ağacı aynen kalır.
- Castle Morvane yalnız düğüm 12 karşılaşma çarpanlarıyla (`encounters.json > castle_morvane`) ayarlandı; boss taban statları, Crown of Ash oranı, faz eşikleri, süreler aynen. Endless'ın eski `lord_morvane`'ı etkilenmez.
## 531. Hexer Yol B ve Castle Morvane Tur 21 varsayımları (2026-11-15, balance-tester)
- Yol B için yalnız ağaç düğümleri değişti (Clinging Jinx keepChance %10 -> %25 / rank, en çok 3 rank = %75; Lasting Jinx 3 -> 5 tur). Jinx'in temel bekleme (3) ve süresi (2) DEĞİŞMEDİ: temel skill Quick Battle dengesini, ağaçsız referansı ve Yol A'yı da oynatırdı. Rumour Mill'in yaydığı Jinxed (2 tur) ve Doom Mark düğümünün Jinxed'i (2 tur) Ömer'in saydığı düğümler dışında olduğu için aynen kaldı.
- Yol A +28,5 (hedef +20..+25 üstü) Leeching Rot'un %4'e dönmesinin sonucu; kabul edilen dört değere dokunulmadı. Fark 6,2 (hedef <=5). Ölçü 300 savaş, Hexer n=130, gürültü ±8: karar için büyük ölçüm gerekebilir.
- Varsayılan focus (satır 1+2) yanlışlıkla bir kez koşuldu (+10,0); deneme sayılmadı.
- Morvane'de iki deneme: veride deneme 1 kaldı (sim bandı Ömer'in açık şartı; deneme 2 testi yeşile çevirdi ama ilk denemeyi %63,5'e çıkardı). Düz model testi bu yüzden kırmızı; sınır indirilmedi.
## 532. Lasting Jinx sekmesi varsayımları (2026-11-15, balance-tester, Tur 22)
- Sekme Jinx kullanılınca her seferinde olur; Jinx ıskalasa da yandaki düşman Jinxlenir (tetik `skillUse`, isabete bakmaz; Rumour Mill ile aynı). İsabette sekmesi istenirse yeni koşul gerekir.
- Sekmeyle gelen Jinxed yalın: Clinging Jinx, Wobbly Aim, Double Jinx güçleri yalnız asıl hedefteki Jinxed'e işler (motor tetikle eklenen durumlara ağaç gücü koymaz). Bu yüzden Yol B +15,4'te kaldı; sekmenin de ağaç gücünü taşıması motor işi (engine-dev), Ömer'e soru.
- Komşu seçimi `adjacentEnemy`: hedefin yanındaki en küçük yuvalı tek düşman. Rumour Mill de aynı düşmanı seçer; Lasting Jinx alınınca (3.ea Rumour Mill'i ister) Rumour Mill'in rankları boşa gider. Çift Jinx zararsız: tek durum kalır, test var.
- Düğüm adı "Lasting Jinx" artık davranışı anlatmıyor; ad değişmedi (Ömer kararı). Metin: "Jinx also Jinxes an enemy next to the target."
- Görsel: sekme Rumour Mill ile aynı yoldan durum ekler (durum rozeti/olayı); ikinci hedefte ayrıca Jinx atış efekti yok, tarayıcıda bakılmadı.
## 533. Lasting Jinx zincir sekmesi varsayımları (2026-11-15, balance-tester, Tur 22 ikinci karar)
- Seken Jinx, Jinx'in kendi etkisiyle iner: Wobbly Aim, Clinging Jinx, Double Jinx sekende de işler ("seken Jinx = aynı Jinx"). Yalın sekme istenirse veri değil motor satırı değişir.
- Zincir sırası: her adımda son sekilenin dört yön komşularından en küçük yuvalı, henüz sekilmemiş düşman (hedefe geri dönmez). Jinx ıskalasa da sekme zarı atılır (tetik `skillUse`).
- Geçerli hâl (seçenek 2): tek sekme, seken Jinx tam hasar vurur (isabet / kritik zarı ayrı atılır, Omen vermez) ve Jinxler; hedef sekmede ölürse Jinxed bırakılmaz.
- Rumour Mill şansı yalnız Lasting Jinx alınınca eklenir; Lasting Jinx yokken Rumour Mill eskisi gibi tek sekme (%10 / rank) yapar. Şans toplamı en çok %100.
- YZ zinciri her zar tutsa izlenecek sırayla değerler (i. sekme ağırlığı şans^i); sekenin ağaç güçlerini değil yalın Jinxed değerini sayar (az değerleme, güvenli taraf).

## 534. Şimşek kimliği (Topraklama + Islak devre) varsayımları (2026-11-15, engine-dev; Lead/Ömer onayı bekler)
- Islak devre kapsamı: "sıvıdaki TÜM birimler" İKİ tahtadaki tüm iletken hücreler olarak okundu (bağlı ağ şartı yok; atanın kendi tahtasındaki suda duran dostları da çarpılır). Canlı kalan su (tur sonu arkı) yine yalnız vurulan bağlı ağ.
- Tetik: şimşeğin düştüğü hücre sıvı olmalı (Soaked ama kuru hücredeki hedef iletim açmaz). Sıvı = mevcut iletken hücreler (su, kan, Healing Rain, Tide, Urn); Holy Water ve Flooded Planks iletmez, Ice keser.
- Iletim hasarı eski Live Water oranıyla aynı (`thunder.arcRatio` 0,06 x tahtanın ortalama maks canı); vuruş hasarının oranı değil (debug/telgraf yollarında vuruş hasarı yok). Oyunda adı "Live Water" kaldı (yeni ad yok).
- Islak hedef Shocked yerine Electrocuted alır (Topraklamadan yararlanmaz); Electrocuted'ın "rastgele dosta temel saldırı" kısmı kaldı (Lead varsayımı).
- Sıra: iletim Shocked'tan ÖNCE uygulanır (önizleme = gerçek); bu yüzden aynı şimşeğin iletimi yeni Shocked'tan yararlanmaz.
- Kalkan çarpanı ve büyü zırhı düşüşü boss %25 / elit %50 güçte. Stormhide (Stormhorn Ram) yine yalnız vuranı Shocked yapar. Shocked süresi 1 tur (badgeTurns) kaldı.
- YZ: kendi takımında şimşekçi ve karşı tahtada sıvı varken sudaki hücre riskli sayılır (menzil şartı yok); ağırlıklar `ai.json > value.thunder.shockShare / shieldShare` 1 (PROVİZYON, sim yok).
- Kapı hâlâ `thunder` etiketi: etiketsiz şimşek (Bog Spark, Thunderpeal...) Shocked vermez ve iletmez. Kalkan x2 ise Shocked birime gelen HER şimşek hasarına işler (etiketsiz, zemin, Hammer Spark'ın şimşek yarısı dahil).
- Kancalı kalkanlarda (onAbsorb tetikleri) emilen pay artık kalkandan düşen (Shocked'ta çift) miktar.
- Kan da ilettiği için Islak devre Quick Battle'da da tetiklenir (kan bırakan ağır kritikler) ve atanın kendi takımını vurabilir.
- Denge: tam testte Hexer kazanma oranı bant üstü (%57,2 > %56, ilk ölçüm önizleme düzeltmesinden önce); denge değeri balance-tester / Ömer işi, dokunulmadı.
## 535. Tek iş tek durum uygulama varsayımları (2026-11-16, engine-dev, form Tur 23)
- PROVİZYON sayılar (sim yok): Poisoned yığın sınırı 3 (`dotStacks`), Wither emişi %30 (`drainToSource`), Armor shred affix'i artık sabit parça (`b_shred` değer 1, `fixed`, ip 1,2; yığın gücü Sunder verisinden, affix sayısı yok).
- Roar (Snowfather) ve Forge Chains (Hearthwarden) Slow verirdi; Slow artık Hobbled (-%30 kaçınma, hız yok). Kaçınması düşük kahramanlara karşı YZ bu iki skill'i neredeyse hiç seçmiyor; Map 3 elit testinin imza listesinden çıktılar. Hız kaynağı (Chilled) mı olmalılar, yoksa böyle mi kalsın?
- Bu yüzden Hobbled veren skill'lerin (Tremor Slam, Card Trick, Bone Throw...) YZ değeri hedefin kaçınmasına bağlı; kaçınmasız hedefte 0. Eski 3 YZ testi (Fist Crush, All In, Defender) kaçınmalı hedefle yeniden kuruldu; kurt testinde Rend (Wound %50 ile çok değerli) çıkarılarak geri çekilme kuralı ölçülüyor.
- Searing'in sildiği buff: silinebilir buff'lar arasında en uzun kalan önce (genel dispel sırası); başka bir Searing silinmez. Tik başına `dispelBuffs` (1) kadar.
- Bleeding'in ek tiki: taşıyan KENDİ turunda kendi eylemiyle yer değiştirirse (Move, yer değiştirme, kendini taşıyan skill), tur başına bir kez. İtilmek / çekilmek sayılmaz. Hareket birimi Bleeding zemininden çıkarırsa zemin durumu kalktığı için ek tik yok. Test modunda her eylem kendi "turu" sayılır.
- Poisoned yığını: aynı kaynaktan tekrar Poisoned (skill ya da başka bir zehir zemini) bir yığın ekler, süre tazelenir; aynı zeminde durmak yığmaz. Bugün Poisoned veren skill yok, yığın pratikte zemin tekrarıyla gelir.
- Tam güçteki Sunder (skill ya da dolu yığın) Armor shred yığını almaz, yalnız süre tazelenir. Brittle / Brittle frost tepkimeleri (şimşek işine dokunmadan yalnız durum alanı) eski Shredded yerine 1 tur tam Sunder verir; combat.md element tablosundaki "Brittle frost (Shredded 1 tur)" satırı şimşek satırı olduğu için değiştirilmedi.
- Exposed'u kendine veren Warrior düğümleri (Glass Cyclone, Martyr's Rush) artık "+%15 alınan hasar" değil "+%15 karşı kritik şansı" cezası taşır; metinler buna göre yazıldı.
- Spell Shatter (Anti-Mage ağacı) Weakened'ı büyü hasarı için potency ile kullanmayı sürdürür (Weakened tanımı yalnız fizikseldir; düğüm kendi büyü ekini verir). Spellbound yalnız moblarda kaldı.
- Jinxed tanımı isabet kesmez; ama Hexer ağacındaki isabet düğümleri (Feeble Jinx vb.) ve Wither'in ağaç isabet eki duruyor (düğüm kendi ekini verir). Bunlar da kalksın mı?
- Mire-Bound (cadı pasifi) hâlâ hız keser (durum değil pasif çarpanı). Tek iş kuralına göre Chilled'a mı bağlansın?
- Fleet ve Shrouded artık toplanmaz (tek durum, güçlü olan geçerli): Cutthroat 4.u3'ün Fleet'i kaldırıldı, düğüm +%10'u kaybetti. Lingering Ears'ın seçicisi artık tüm Blinded'ı sayar (eski yalnız Shaken).
- Ağaç / mob kaynaklı eski Stagger'lar artık normal Stun: boss'ta (CC bağışık) işlemez. Yalnız boss kuralının sersemletmesi (Mooring, Sermon) bağışıklığı aşar.
- `StatusKind` tip birliğinde eski id'ler (fleet, shaken, staggered...) kaldı (şimşek işiyle çakışmamak için tip temizliği sonraya); `staggered` olayı da sahnede eski kayıtlar için duruyor.
## 536. Tur 24 ve birleşim varsayımları (2026-11-16, engine-dev, dal agent/engine-dev-birlesim)
- Tur 24 ile "Tek iş tek durum" maddesindeki üç soru kapandı: Roar / Forge Chains (Chilled / Saltbound), Hexer isabet düğümleri (Blinded), Mire-Bound (Chilled'a bağlandı).
- Mire-Bound'un Chilled'ı gerçek durum değil: Chilled'ın hız çarpanı Saltbound süresince ve cadı yaşadıkça işler. Rozet olarak görünmez, ikinci bir Chilled atışı onu Frozen'a çevirmez, Fire onu silmez (Saltbound kalkınca ya da cadı ölünce biter). Görünür rozet istenirse ui-dev işi.
- Ana durum tutmazsa (bağışık / reddedildi) eş Blinded da verilmez. Creeping Blight (ölenin Wither'ını yayar) yalnız Wither'ı yayar; eskiden Wither'ın üstündeki isabet eki de yayılıyordu, artık eş Blinded yayılmaz.
- Hexer düğümlerinin Blinded'ı Jinxed / Wither ile aynı sürede başlar ama ayrı yaşar: Jinxed hedefin ilk saldırısında düşer, Blinded süresini doldurur (eski isabet eki Jinxed'le birlikte düşüyordu). Hedefte daha güçlü Blinded varsa o kalır (refresh-strongest).
- Durum rozeti: Jinxed artık "-100%" (boss'ta -25%) gösterir, Exposed "+15%" (karşı kritik), Blessed / Weakened / Spellbound kendi çarpanını. İpucu sayısı yalnız ana etki alanında gerçek değere çevrilir; Soaked / Unhallowed (element çarpanı) ve sayısız metinler tam güçte kalır.
## 537. Tur 26 varsayımları (2026-11-16, engine-dev, dal agent/engine-dev-birlesim)
- Mire-Bound (Tur 26), Tur 24 maddesindeki "Mire-Bound'un Chilled'ı gerçek durum değil" notunu geçersiz kıldı: artık hız etkisi yok, Saltbound 1 tur uzun.
- Mire-Bound ek turu her kaynaktan gelen Saltbound'a işler (cadının kendi vuruşu ya da başka bir mobun Saltbound'u), yeter ki uygulama anında kahramanın karşı tarafında canlı bir cadı olsun. Birden çok cadı +1'i büyütmez. Zemin kaynaklı Saltbound'a ek yok (süresi zaten zeminle biter).
- Sıra: ek tur, Resilience / Iron Will zarından ÖNCE eklenir; 1 turluk Saltbound artık 2 tur olduğu için Resilience onu 1 tura düşürebilir (eskiden 1 turlukta zar atılmazdı). Ek tur eklenince cadının pasif yazısı (Mire-Bound) çıkar.
- Taunt zırhı (+10) yalnız Defender'ın etkin zırhına girer: komşulara verdiği zırh aurası değişmez (test kilitli), ama Tremor Slam'in zırh ölçekli hasarı taunt sürerken vurursa bu +10'u da sayar (+%11 x 10 = +1,1 güç payı). İstenmezse söyleyin.
- YZ: Taunt'ın zırh değeri hasar türünü bilmeden hesaplanır (Defender'a gelen tüm hasar fiziksel sayılır; büyü hasarına karşı biraz fazla değer verir, PROVİZYON). Mire-Bound ek turu Saltbound'un kaçınma 0 / pin değerlerine tam ek tur olarak girer (cadıların Saltbound vuruşu yaklaşık iki kat değerli).
- Hexer testi: Jinx gücü Evil Eye'ı geçtiği için zayıf rakipte de Jinx seçilebiliyor; test "seçimi önleme (mitigation) sürüklemez" ölçütüne çevrildi.

## 538. Tur 27 varsayımları (2026-11-16, engine-dev, dal agent/engine-dev-birlesim)
- Lanet uzar hariç listesi deneme sim'indeki (opt8) tanımla birebir: Unhallowed'ın kendisi, zemin kaynaklı örnek (`fromGround`), yığılan = yalnız `maxStacks` (Omen), kuralla süren (`untilResolved`: Ash Brand, Quenched) ve kalıcı örnek. Poisoned (`dotStacks`) ve Sunder (`stackLimit`) yığılan SAYILMADI: uzarlar. Frozen ve Cooling (Stun gibi tur kaybı) da uzar.
- Kendi kendine uygulanan debuff (ör. bir mobun kendi Overextended'ı) da uzar (deneme tanımında kaynak ayrımı yoktu).
- Zemin tepkimesinin birime verdiği durum zemin örneği değil (Hexed spark: lanetli zeminde şimşek = Jinxed): Unhallowed hedefte 1 tur uzar (Jinxed 2 -> 3).
- Ek tur Mire-Bound ekinden sonra, Resilience / Iron Will zarından önce eklenir (Mire-Bound ile aynı yer); boss Unyielding kısaltması önce işler.
- Ek turu birden çok kaynaktan alma: yalnız Unhallowed taşıyor, yığılmaz (en büyük değer).
- YZ: Cursed Ground / Unhallowed değeri = karşı tarafın (lanetleyen tarafın) kitindeki süreli debuff'ların ek turunun marjinal değeri x skill seçme payı (1 / saldırı skill'i sayısı) x hedef payı (tek hedef 1 / canlı sayısı, alan 1); ek tur 3 turluk ufuktan bağımsız sayılır (Wither'in 4. tiki tam). Ağırlık `ai.json > value.debuffShare.curse` = 1 (PROVİZYON). Hit şansı bu terimde sayılmaz.
- Hexer %5: yalnız `power` alanları (Evil Eye, Withering Curse hasarı ve Wither DoT gücü, Jinx, Doom Mark). DEĞİŞMEYENLER: Doom Mark patlatma çarpanı (`mult` 1,65), Omen / Doom patlaması (statuses.json > omen), Jinx `critBonus`. Yuvarlama tamsayıyla yarım yukarı: Jinx 0,8075 -> 0,808, Doom Mark 0,6935 -> 0,694.
- Warrior %3: yalnız `power`. Headsman's Blow `powerPerRage` (0,023) değişmedi. Yuvarlama yarım yukarı: Double Strike 0,3395 -> 0,34 (iki vuruş), Whirlwind 0,4365 -> 0,437, Charge 0,65475 -> 0,655, Headsman's Blow 0,45105 -> 0,451. Warrior skill'leri başka sınıf/mobda kullanılmıyor (temper_tester / eye_tester yalnız logo adı). Ağaç düğümlerinin güç ekleri değişmedi.
- Önizleme ek turu yalnız düz durum (`status`) ve DoT (`dot`) satırlarında gösterir; motor ayrıca şimşek Shocked rozeti, `randomStatus`, Drain Field `onEmpty` ve birim tepkimesi durumlarını da uzatır (önizlemede eski süre görünür, bilinen boşluk).

## 539. Tur 28-29 varsayımları (2026-11-16, engine-dev, dal agent/engine-dev-birlesim)
- Sayıların hepsi PROVİZYON; sim koşulmadı, denge bantları ölçülmedi (Defender dahil tek seferde ölçülecek).
- Empowered / Focused süresi taşıyanın KENDİ turu bitince azalır (`tickAtTurnEnd`, Ash Surge gibi). Refrain Empowered'ı vuran dostun kendi turunda verdiği için `turns` modunda 1 fazla verilir (sonraki 2 turu kapsasın, Ash Surge kuralı). Martyr's Bequest başka birimin turunda verilir: tam 2 tur.
- İkonlar ödünç: Empowered `warcry`, Focused `eye` (boyalı rozet yok).
- Piercing Arrow kanama gücü Ömer'den gelmedi: 0,1 DEX / tik (2 tur), falloff uygulanmaz (her hedefte aynı). Kaçınılan / bloklanan hedef kanamaz. Lingering Rain zemininin Bleeding'iyle ayrı örnek: zemin kalkınca skill kanaması sürer.
- Piercing Arrow falloff 0,85 olunca ağaçtaki "no falloff" (Sky Full of Shafts, +0,3) 1'i aşıyordu: motor ve önizleme falloff'u en çok 1'e kırpar. Ağaç düğümleri (Wide Nock +0,05, evolve "set 0,9", zırhlıya +0,03/rank) dokunulmadı; taban 0,85 olunca kazançları küçüldü (ör. evolve 0,9 artık +0,05). Ömer / Character Design bakmalı.
- Archer YZ: `aoeMinTargets` profil alanı değer terazisinde KULLANILMIYOR (yalnız tip); şerit vuruşu zaten iki hedefin hasarını toplar ve 2 düşman aynı şeritteyken seçilir (test). Ayrı kanca eklenmedi.
- Thunderpeal: Thunderflash yalnız karanlıktaki tarafa KARŞI atılan şimşekte çakar (mevcut kural): seferde Vesper oyuncu tarafında olduğu için yok; Hızlı Savaş'ta karşı takımdaki Vesper, karanlıktaki tarafa Thunderpeal atarsa çakar (1 tur Blinded dahil).
- Thunderpeal etiketlenince karşı takımın YZ'si Vesper varken suda / buzda durmayı riskli sayar (`thunderSkillsOf`, hücre riski) ve hamle önizlemesi su / buz hücrelerini işaretler. Davranış değişikliği; sim ile bakılmadı.
- Refrain `turns` modunda dar pencere: Shocked 1 tur (`badgeTurns`) ve düşmanın kendi turu başında biter; dost o düşmandan önce sıra almazsa fırsat kaçar.
- Stormhall Saga eldiveni "Stormhall Gauntlets" (`stormhall_gauntlets`) adını aldı: "Drummer's Gauntlets" kimliği mevcut Legendary'nin (War-Drummer's Gauntlets) kimliğiydi ve onu eziyordu. Parça adları Lead / agent seçimi; Ömer değiştirebilir.
- Refrain: (a) "dost" Skald'ın kendisi DEĞİL (kendi vuruşu işareti tüketmez); (b) Empowered işaretli düşmana isabet eden vuruştan SONRA gelir (o vuruşu güçlendirmez; aynı kullanımın sonraki vuruşlarını güçlendirir); (c) suda / Soaked hedef Shocked yerine Electrocuted alır: Refrain yok; (d) işaret Shocked rozetinde durur: Shocked bitince fırsat da biter; Skald yeniden Shocked verince yeni işaret; (e) çağrılar da "dost" sayılır, sıra almayan nesneler sayılmaz.
- Martyr's Bequest: en yakın = Ill Omen'in yakınlık kuralı (ekran ızgarası, aynı sıra önce); taşıyanın kendi çağrıları (onunla ölür) ve sıra almayan nesneler alamaz; başka dostun çağrısı alabilir. Her ölüm duyurusunda bir kez (diriltilip yeniden ölende ayrıca denenmedi).
- Pilgrim's Burden: yalnız SKILL şifası (`heal` etkisi; HoT tiki, lifesteal, pasif şifa, Last Rites sayılmaz); şifa 0'dan büyük olmalı (canı dolu dosta işlemez); kendine işlemez. "En uzun süreli" = silinebilir debuff'lar (Dispel aday listesi: `dispellable: false` olanlar, zemin kaynaklılar, kuralla sürenler ve Omen yığını hariç). Seçim: 1 turu kalan debuff BİTER (en az 1 kalmaz). Sonuç: şifa 1 turu kalan Stun / Silence'ı da bitirebilir. Alan şifasında her iyileşen dost ayrı.
- Set yerleri (Ömer vermedi, Lead varsayımı; "Harita başına 2 set" kuralı aşıldı: her haritada 3 set): Stormhall Saga = The Hollow Crown / Chief's Hall (ilvl 27); Relics of Saint Odran = Drowned Reach / The Bishop's Chapel (ilvl 18; trinket yüzünden Harita 1 olamaz); Almoner's Vestments = Valdoria / Thornwood Hollow (ilvl 10). Parçalar C, C, B, boost YOK (Ashguard / Kingsfall / Raven gibi; Epic ortalamasına çekilmedi).
- AÇIK: Odran's Censer Focus Orb ailesi (Mage, Druid, Undead, Vesper, Gambler, Hexer). "Nötr" set olsa da üçüncü parçayı yalnız bu sınıflar ve tek elli silahla takabilir; diğerleri en çok 2 parça (2 parça bonusu) alır. Çift elli silahta Equip best Censer'ı zorlamaz.
- Equip best: Pilgrim's Burden'ın kural değeri (`setValue.ruleIP`) yalnız dosta şifa skill'i olan sınıfa sayılır (`setValue.ruleNeedsHeal`; bugün Druid, Paladin). Diğer yeni kurallar düz `ruleIP`.
- YZ payları `ai.json > value.setRules` (refrainGift 1, refrainSeed 0,5, bequestCost 0,8, burdenShare 1) PROVİZYON.

## 540. Redtithe uygulama varsayımları (2026-11-17, engine-dev, dal agent/engine-dev-birlesim)
- Sayıların hepsi PROVİZYON; sim koşulmadı (Ömer'e ayrıca sorulacak). Tasarım: `docs/design/classes/antimage.md`.
- "Temel saldırı başına +5 kan" Tithe Cut (`mana_burn`, bedelsiz skill) olarak okundu: isabet başına 5 kan (`bloodBar.hitGain`, Lead varsayımı); iskada / kaçınmada ne MP kanı ne isabet kanı. MP'siz hedef yalnız 5 verir. Drained Dry düğümünde (hasar yok) isabet zarı atılmaz, yakım tutunca kan gelir.
- Büyü zırhı 40, menzil 4 ve ön sıra önceliği 3.5 eski Anti-Mage'den aynen kaldı. Tithe Cut ve Exsanguinate DEX ölçekli FİZİKSEL hasara döndü (ana stat DEX; hasar ölçekleme kuralı).
- Kan ölüm / diriltmede sıfırlanmaz, Endless dalgaları arasında taşınır (Rage diriltmede sıfırlanır, kan sıfırlanmaz).
- Can emme (bar düştükçe, en çok %20) yalnız skill vuruşlarında; DoT (Bleeding) tikleri can emmez.
- Kan bedelinin candan ödenen kısmı `hpPaid` (can bedeli ödenen istatistiği / tetikleri) sayılmaz. Unlimited Rage debug bayrağı kanı da bedava yapar.
- Blood Brand TEK hedef (eski Ley Brand 3x3 alandı); Bleeding gücü DEX 0,2 / tik, 3 tur. Ek tik markalı birimin her CLASS skill'inde (global eylemler Rest / Skip / Move sayılmaz). Görsel eski Drain Field'ın (gökten, mor renk) aynen kaldı.
- Mirror Vein yalnız SKILL kaynaklı düşman büyü vuruşunu emer (DoT / zemin / yansıma emilmez); alan büyüsünde her birim kendi Mirror Vein'ini ayrı harcar. Düşman YZ'si Mirror Vein'i öngörmez (hedef seçerken hesaba katmaz).
- Blood Tithe kayması: bar / 100 x %20 (taban advance 0); ağaçtaki "further X% sooner" düğümleri bu orana DÜZ eklenir (kandan bağımsız).
- Ravens' Shroud 3 parça Redtithe satırı: eski `advance` +0,2 -> `bloodAdvance` 0,2 -> 0,26 (aynı %30 pay).
- Sefer yoldaş önerisi Redtithe'i artık "feed" (mana besleyici) rolünde saymıyor (rol listesi boş).
- Ağaç v6 eşlemesi (tablo `antimage.md` bölüm 4): eşlenemeyen 14 düğüm + bar Warded Steps PASİF (inactive). Ömer her eşlemeyi ve pasifleri onaylamalı; yeni düğüm icat edilmedi.
- Kitten çıkan motor yolları silinmedi (Ley Brand / tainted mana / castBurn / patlama, Ley Thread, Spell Ward kalkan kancası, Drain Field onEmpty); veride kullanıcıları yok, testleri sentetik eski veriyle duruyor. Ley Brand'e özgü YZ testleri (bedel yakımı çağıranı öldürür, Spell Ward düşük canda) silindi.
- Görsel / ses ödünç (sprite, ikonlar, VFX, sesler eski Anti-Mage'in); kan barı Rage barı gibi çizilir, koyu kırmızı.

## 541. Redtithe denge teşhisi varsayımları (2026-11-17, balance-tester, dal agent-balance-redtithe)
- Teşhis 1000 savaşlık A/B/C raporlarına ve seed 1-20 üzerinde koşulan tanı betiklerine dayanır (aynı 20 savaş üç kez ölçüldü; sim sayılmaz). Redtithe'in 9,0 hamlesi: hız (DEX 26 = 24,4, alan ortalaması 18,1) x1,35, ömür (en son ölen sınıf; ölüm %46) yaklaşık x1,3, Blood Tithe kayması yalnız hamlelerin %4,2'si (kan tur başında ortalama 34, hiç 90+ değil), Rest'e hiç gerek yok.
- Mirror Vein %0: kapı/eşik hatası yok (67/68 turda kullanılabilir, aday listede). YZ puanı (src/engine/ai.ts > mirrorVeinValue) 2 turluk pencereyi ve birden çok büyücüyü saymıyor (tek en iyi düşman / canlı dost sayısı); brüt 3-9, 30 kan bedeli yaklaşık 5,4 ile net yaklaşık 0. Varsayım: bu YZ modelleme eksiği (engine-dev), veinShare sayısıyla örtülmemeli. Skill'in kendisinin gerçekte Tithe Cut'tan zayıf olup olmadığı YZ düzeltmesinden sonra ölçülmeli.
- Önerilen sıra: önce Mirror Vein YZ düzeltmesi, sonra Redtithe sayı ayarı (büyü zırhı / DEX / Tithe Cut gücü), ölçüm 2 x 10.000. Değerler Ömer onayı bekler.


## 542. Redtithe stat formülleri + Mirror Vein "Kan Örtüsü" varsayımları (2026-11-18, engine-dev, dal agent/balance-redtithe)
- Blood Tithe: ağaç düz eki `advance` bar ölçeğinin DIŞINDA kaldı (bugünkü gibi): kayma = advance + (bloodAdvance + bloodAdvancePerDex x DEX) x kan / maks. Brief'teki formül advance'i parantez içine alıyordu; tabanda advance 0 olduğundan fark yalnız ağaç düğümlerinde.
- 0,1 + 0,0045 x 22 = 0,199 (eski 0,2): kayma çok az kısaldı; golden kayıtları bu yüzden yenilendi.
- Raven's Shroud 3 parça (items.json): bloodAdvance 0,2 -> 0,26 satırı 0,1 -> 0,16 oldu (aynı +0,06 fark); metin "+6% turn bar jump at a full blood bar (base 10% → 16%, plus the DEX part)".
- Mirror Vein kanı vuruş başına, ÜST SINIR YOK (Ömer kuralı: sınır yerine bedel). Bir düşman alan büyüsü 4 kalkana çarparsa ~4 x 6 = 24 kan (bedel 20). Ölçüm balance-tester'a.
- Mirror Vein kalkanı her hasarı emer (yalnız büyü kalkanı değil); kanı yalnız BÜYÜ emişi verir. Kalkan Shield power affix'iyle (düz ek dahil) çarpılır. Redtithe ölüyse emiş kan vermez; kalkan yine durur.
- Ağaç eşlemesi (Ömer onayı bekler): 3.f1 kalkan +%4/rank; 3.f2 canı en düşük dostu iyileştirir (eski: hedef dost); 3.n0 bütün dostların debuff'larını siler (eski tek dost; güçlü olabilir); 3.eb her atışta taunt (skill seni de kalkanlar); 3.fb yalnız kendine, kalkan %30 büyük; 3.mb Mirror Vein kalkanı + taunt. Pasif düğümler (Warded Steps, Second Ward, Shelter Echo, Split Ward, Stretched Ward, Mirror Ward) kalkan geri geldiği için yeniden açılabilir; dokunulmadı.
- YZ: takım kalkanı genel shield teriminden yüksek değer alıyor (4 dost x ~11 = ~44); test kurulumunda hasar skill'lerinden önde. Redtithe Mirror Vein'i bekleme bitince sık seçebilir; sim ölçümü gerekir.
- Büyü zırhı (Ömer düzeltmesi 2026-11-18): (25 + INT x 1,5; Ömer ikinci düzeltme, önce 20 + INT x 2) x eksik kan oranı; formulas.json > bloodBar.magicArmorBase / magicArmorPerInt (class verisinde değil, kan barı kuralıyla bir arada). Savaş başında (kan 50) INT 10 ile 20 büyü zırhı (eski 40 + 7,5).

## 543. Mirror Vein YZ modeli varsayımları (2026-11-17, engine-dev, dal agent-balance-redtithe)
- (2026-11-18: Mirror Vein yeniden tasarlandı; aşağıdaki model yerine kan değeri modeli geldi, yukarıdaki madde.)
- Ölümcül büyü (beklenen hasar >= can + kalkanlar) emilirse ek değer = P_ölümcül x kurtarma değeri (save) x veinShare. Bu kural benim kararım; ilk büyüden sonraki büyülerin yine öldürebileceği sayılmaz.
- Düşmanın kalkan süresinde her turunda büyü attığı varsayılır (fiziksel hamle seçebileceği sayılmaz); atış sayısı ufuk turları x min(süre, ufuk) / ufuk, en az 1. Düşman başına yalnız p x hasarı en büyük büyü sayılır.
- Sonuç (20 savaş, seed 1-20, sim değil): Mirror Vein 68 Redtithe turunda 4 kez seçildi (önce 0); seçildiği anlar çoğunlukla düşük canlı dost + 2-3 büyücü. Skill sayısı değişmedi; payın yeterli olup olmadığı balance-tester ölçümüne kalır.

## 544. Gambler rework varsayımları (2026-11-18, engine-dev, dal agent/balance-redtithe)
- Tüm sayılar PROVİZYON (veride `_not`): pasif tekrar %25, seri tavanı 3, zar 2 x d6 (hasar x toplam / 7), High Stakes dolu seri can emme %50, Card Trick dolu seri 3 hedef + biri Stun 1 tur / diğerleri Slow ya da Wound 2 tur (eşit), All In ihtimal tablosu %50 / %65 / %80 / %100, kayıpta maks canın %10'u. Sim atılmadı.
- Pasif id'si `double_or_nothing` korundu (ağaç satırı, Gallows Pact 3 parça satırı `chance` 0,25 -> 0,3 artık tekrar şansını artırır, kayıtlar); görünen ad "Lucky Streak". Ağaç sürümü 1 -> 2 (Gambler'lara bedava sıfırlama).
- Çift zar ıska / kaçınmada da seriyi sayar (zar vuruştan önce atılır). Zar her vuruşta atılır: tekrar vuruşu, ağaç ek vuruşları (Boxcars), karşılık (Conclave) ve delici vuruş da zar atar ve çift gelirse seri verir. Yalnız debug oynatması seriyi değiştirmez.
- Dolu seride atılan High Stakes'in kesin kazancı seriyi ARTIRMAZ (harcanan kullanım 0'da biter). Bedava kullanımlar (ağaç tetiği, Card Trick tekrarı) seriyi harcamaz, bahisle seri değiştirmez.
- Pasif tekrar: Loaded Dice ve High Stakes hedef başına ikinci vuruş (High Stakes ilk bahsin sonucunu kullanır, can bedeli ve seri yeniden işlemez; hedef öldüyse tekrar yok; bahis kazancına bağlı ağaç düğümleri tekrar vuruşunda da çalışır). Card Trick tekrarı kullanım başına bir zar, yeni rastgele hedeflerle bedava ikinci kullanım (seride atıldıysa yine 3 hedef + kesin Stun kuralı); tekrar kendi tekrarını atmaz.
- Card Trick kesin Stun'u İSABET EDEN canlı hedeflerden birine gider (ıska / kaçınma olursa o hedefe durum yok); 3'ten az düşman varsa hepsine vurur, biri yine kesin Stun. Boss ccImmunity'si kesin Stun'u da engeller ("Immune"). Stacked Deck / Cold Deck gibi ağaç düğümleri rastgele durumu değiştirdiyse ağaç kazanır (seri biçimi yalnız hedef sayısını değiştirir).
- All In kaybında can bedeli Mortgage'ın can bahsiyle toplanır (canı en az 1 bırakır). All In kazancında MP geri kalır (eski kural gibi); seri her durumda 0.
- Diriliş seriyi 0'a indirir.
- YZ ağırlıkları (data/ai.json > value.aiCov.streak) PROVİZYON: spendShare 0,25, riskShare 0,3, lowShare 0,4, buildShare 0,1, recastShare 1. Ölçüm (sim değil, tek kurulum): seri 0'da All In en düşük puan; seri 3'te All In / High Stakes öne geçiyor.
- 2026-11-18 YZ düzeltmesi (engine-dev): lowShare 0,4 -> lossShare 0,1 (PROVİZYON; yalnız seri 1-2'de harcanan seri ilerlemesi). Varsayım: All In'in kayıptaki %10 canı can bahsi sayılmaz (düşük can kuralı dışı; bedel can %50 altında x2'ye kadar ağırlaşır, çarpan profilin minHpRatioForHpCost'undan türetildi, yeni sayı yok). Önizlemeye `damage.bet` / `damage.repeat` alanları eklendi (YZ okur; arayüz göstermez). High Stakes'in kayıpta giden %15 canı hâlâ bedele eklenmiyor (yalnız düşük can kuralı); eklenmesi ayrı karar.

## 545. Gambler ağaç uyarlaması (2026-11-18, engine-dev; Ömer onayı bekler)
- 0 satır adı: Double or Nothing -> Lucky Streak.
- 0.f1 Hot Hand: Jackpot sonrası sonraki skill'e +%4/rank yankı şansı -> +%4/rank Lucky Streak tekrar şansı.
- 0.f2 Cornered Dog: %50 can altı +%4/rank yankı şansı -> +%4/rank tekrar şansı.
- 0.f3 Quick Shuffle: yankı tutunca sıradaki tur %4/rank erken -> seri her arttığında %4/rank erken.
- 0.n0 Chain Reaction: yankı tutunca öbür cooldown'lar -1 -> dolu seri harcanınca öbür cooldown'lar -1.
- 0.r Scar Gambler: can kaybettiren Bust'ta +%2/rank yankı şansı (Jackpot'a kadar) -> +%2/rank tekrar şansı.
- 0.ea Streak -> "Lucky Run": art arda yankı +%8 birikir, tutmayınca sıfırlanır -> art arda tekrar +%8 tekrar şansı birikir, tutmayan tekrar zarı sıfırlar (ad çakışmasın diye değişti).
- 0.ma Unbroken Run: 3 art arda yankıdan sonra kesin kritik -> seri dolunca (3) sonraki skill kesin kritik.
- 0.fa All or Nothing: yankı %25 -> %40, tutmayınca o cooldown +1 -> tekrar şansı %25 -> %40, kaybedilen bahiste o skill'in cooldown'u +1.
- 0.mb Borrowed Time: Lucky Escape sonrası 2 tur her skill yankılanır -> 2 tur tekrar zarı hep tutar.
- 0.v Run It Back: yankı tutunca skill %40 güçle hemen yeniden -> dolu seri harcanınca o skill %40 güçle hemen yeniden.
- 1.ea Hot Dice: Double Hit %25 -> %30 (taban) -> Double Hit +%5 (pasif şansına ek; aynı sonuç).
- 1.ma Boxcars: Loaded Dice 3+ kez atınca başka düşmana bir vuruş -> çift 6 atınca başka düşmana bir vuruş (kullanım başına bir).
- 1.mb Snake Eyes: Loaded Dice kritik vurunca sonraki bahis +%5 Jackpot -> çift 1 atınca sonraki bahis +%15 Jackpot (çift 1 nadir: 1/36; sayı PROVİZYON).
- 4.d1 Ride the Wave: All In +%8 yankı şansı -> All In +%8 kazanma şansı (All In tekrar etmez).
- Bar 5 Warm Hands: savaşın ilk cooldown'lu skill'ine +%8 yankı -> +%8 tekrar şansı.
- Bar 20 Winning Run: her yankı +%4 hasar (Bust'a kadar) -> seri her arttığında +%4 hasar (Bust'a kadar).
- Değişmeyenler: Charmed Life, Coin Toss Life, Steady Wrist, Red Pips, Rolling Dice, Endless Rattle, Nimble Fingers, Loaded Corner, Fever Dice, Spendthrift, Dice Storm, High Stakes / Card Trick / All In satırlarının geri kalanı (Due for a Win dahil), bar On a Roll / Blood Debt / Death Shrug.

## 546. Close Ranks aura payı varsayımları (2026-11-18, engine-dev, dal agent/balance-redtithe)
- Pay yalnız ZIRH: Drilled Ranks'in (ağaç, aura büyü zırhı `magicPct`) büyü zırhı Guard'lı dosta paylaşılmaz; Interlocked'in (`guard.armorPct`) zırhı paya ek olarak yığılır.
- Ağaçta Second Chain'in (`ownRow`) koruduğu Defender'ın kendi sırasındaki dostlar da Close Ranks Guard'ı aldığı için payı alır.
- Defender düşünce zırh payı hemen kalkar; Guard durumu mevcut kuralla süresi bitene kadar kalır, Defender dirilirse Guard sürdükçe pay geri gelir.
- Aura koşullu kancaları (`at: aura`, ör. Tight Formation) Guard'lı dost için de alıcıya göre değerlendirilir; `inAura` koşulları (Shield Brothers vb.) yalnız komşulara bakmaya devam eder (Guard'lı dost "aurada" sayılmaz).
- YZ: kazanılan zırhın önlediği hasar Taunt zırhıyla aynı ölçüyle sayılır (tümü fiziksel; birden çok aura kaynağının maxStacks yığını yaklaşık, tek kaynak).

## 547. All In seri ödülü varsayımları (2026-11-19, engine-dev, dal agent/balance-redtithe)
- Seri 0-2'de kazanılan her bahis seriyi doldurur; ağaçtan gelen kesin kazanç ("While you are below 25% HP, All In is always a Jackpot") da kazanç sayılır, seri 0-2'de seriyi doldurur.
- Dolum ağaçta `streakGain` tetiği sayılır (miktar 3): "When your Streak becomes full..." ve "Each time your Streak grows..." düğümleri All In kazancında da çalışır. Seri 3'teki All In `streakSpend` tetiğidir (eskisi gibi).
- Seri 1-2'de kaybedince olay sebebi `betLoss` (eskiden atınca `spend`); seri 3'te `spend`.
- x1,3 yalnız kazanç dalına uygulanır (seri 3'te zaten kesin kazanç); ağaç kazanç eklerinin (perStake düğümleri) üstüne çarpar.
- YZ: dolan serinin değeri `fillShare` 0,3 (= buildShare 0,1 x tavan 3; PROVİZYON); seri 1-2'deki seri bedeli artık yalnız kayıp ihtimaliyle.
- Sıra: dolum tetiği (streakGain) bahis zarından sonra, All In vuruşundan önce çalışır (High Stakes kazancıyla aynı). Unbroken Run'ın kesin kritiği o All In vuruşunu değil sonraki skill'i etkiler (test: `tests/gambler.test.ts`).
## 548. Onboarding denetimi (2026-11-17, ui-dev, dal agent/ui-dev-onboarding)
- Brief eski akışı anlatıyordu: tek kişilik başlangıçta (`soloStart`) Mill Road'dan sonra 2. kahraman, Ravenwood'da Formation kapısı ve Farewell YOK. Formation kapısını kuran tek yer Ashford "Form your company" (`formCompany`, lider `keep`); Valdren / King's Bridge katılımları kapı kurmaz (teste bağlandı). Eski kayıt yolu (`recruit()` + `tutorialActive`) olduğu gibi duruyor.
- "Yalnız ilk katılımda" = kampanya başına bir kez (Ashford). Başka bir yeni seferde kapı yine çıkar (ders deposu seferden bağımsız ama `showGateLesson` görülmüş olsa da gösterir). VARSAYIM: yeni seferde de çıksın; isteğin "ömür boyu bir kez" ise `formCompany` kapıyı ders görülmüşse kurmamalı (tek satır).
- Formation kapısı metni: eski "A companion walks with you now, so set your formation before the next fight. Drag heroes into cells: ..." -> yeni "Your companion needs a place in the line before the next fight. Drag heroes into cells: the front row takes the hits, the back row keeps archers and casters safer." Düğme yazısı "Open Formation" -> "Open Formation to go on" (kapının sebebi: yol açılmaz). Metin Ömer onaylıydı (2026-11-09); onay bekler.
- Gear dersi 3 sayfadan 2 sayfaya indi: sürükle + karşılaştır tek sayfa, Equip best ayrı. Ders kimliği ve Codex değişmedi (görülmüş kayıt bozulmaz).
- Telefonda Recruit / "Your Company" kutusu aday kartlarını örtüyordu: kutu artık pencere başlığının üstüne biner (başlık yazısı kutunun altında kalır).
- DÜZELTİLMEDİ (karar gerek): (a) telefonda savaşta skill uzun-basma ipucu tahtanın alt çeyreğini örter (basılı tutarken, bırakınca kapanır); seçenek: ipucunu skill çubuğunun üstüne (stat paneli yerine) bindirmek ya da daraltmak; (b) telefonda "A New Skill" / Whisper kutuları üst sol tahtayı örter (kutu "Got it" ile kapanır); (c) harita sol sütununu (Party) ders kutusu örter (masaüstü 1920, "Wounds Carry Over" / "Wear Your Gear"); (d) telefonda Recruit penceresinde şirket adı kutusu kesik ("Name your co"); (e) Ashford ders kutusu yığını: First Spoils, Wear Your Gear, Gear (2 sayfa), Item Quality, Wounds ayrı ekranlarda sırayla çıkıyor; birleştirme yeni ders sistemi sayılır, yapılmadı.
