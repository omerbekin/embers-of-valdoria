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
- **513** Pilot set motoru (`setsEnabled` kapalı [AÇILDI Ömer 2026-11-26]): Ashguard yalnız Warrior / Defender / Paladin, parça affix'leri elle, ertelenen hasar yuvarlama, set düşüş oranı.
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
- Set yerleri (Ömer vermedi, Lead varsayımı; "Harita başına 2 set" kuralı aşıldı: her haritada 3 set) [setler AÇILDI Ömer 2026-11-26 bu yerlerle; Drowned Reach setlerinin harita adı düzeltildi, önce hiç düşmüyorlardı]: Stormhall Saga = The Hollow Crown / Chief's Hall (ilvl 27); Relics of Saint Odran = Drowned Reach / The Bishop's Chapel (ilvl 18; trinket yüzünden Harita 1 olamaz); Almoner's Vestments = Valdoria / Thornwood Hollow (ilvl 10). Parçalar C, C, B, boost YOK (Ashguard / Kingsfall / Raven gibi; Epic ortalamasına çekilmedi).
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
- Ağaç v6 eşlemesi (tablo `antimage.md` bölüm 4): eşlenemeyen 14 düğüm + bar Warded Steps PASİF (inactive). Ömer her eşlemeyi ve pasifleri onaylamalı; yeni düğüm icat edilmedi. **Ömer onayladı 2026-11-20 (form r35):** eşleme onaylı. 15 pasif öğe (14 düğüm + bar Warded Steps): **kuruldu, Ömer r36 (2026-11-20)**: form r36 seçimleri (yeni etkiler, sayılar PROVİZYON, sim yok; tablo `antimage.md` bölüm 4, karar `character-design.md` madde 17). Ağaçta pasif düğüm kalmadı; sürüm 6 kaldı (pasif düğümler v6'da alınamıyordu, arkalarındaki yol kapalıydı: v6 kayıtlarında bu düğümlerde puan yok). engine-dev varsayımları (onay bekler): Open Veins kanı ve Widening Cut tik sayacı Blood Brand ek tiklerinde ve Bleeding yer değiştirme tikinde de işler (her "tik"); Widening Cut yalnız Blood Brand'in verdiği Bleeding'e (Blood for Blood'un Bleeding'i sayılmaz); Final Tithe yalnız süre dolunca, Reaping Brand işaret nasıl biterse bitsin (süre / silinme; ölümde değil); Hush of the Brand Searing Grasp'ın MP sıfırlamasında da işler (işaret o an hedefteyse); Stripping Brand işaret tutmasa da buff siler (Blood Brand hasarsız, isabet zarı yok).
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
- Ağaç eşlemesi (**Ömer onayladı 2026-11-20 (form r35)**; 3.n0 değişerek): 3.f1 kalkan +%4/rank; 3.f2 canı en düşük dostu iyileştirir (eski: hedef dost); 3.n0 bütün dostların debuff'larını siler (eski tek dost; güçlü olabilir) -> **Ömer kararı r35: yalnız canı (oran) en düşük yaşayan dostun debuff'ları silinir (Redtithe dahil; 3.f2 ile aynı seçim, `Battle.lowestHpAllyOf`)**. **Ömer kararları r36 (2026-11-20), kuruldu:** (a) canı en düşük dostta debuff yoksa silme, debuff'ı olan dostlar arasında canı en düşük olana gider (hiçbirinde yoksa bir şey olmaz); (b) 3.fb (Cloistered Ward) alınmışsa silme de yalnız Redtithe'e. Tek kural `Battle.purgeTargetOf` (motor, önizleme, YZ, ipucu); 3.f2 Ward Mending eskisi gibi canı en düşük dosta (`lowestHpAllyOf`). Eski engine-dev varsayımları (kaymaz / 3.fb'de de dosta) geçersiz; 3.eb her atışta taunt (skill seni de kalkanlar); 3.fb yalnız kendine, kalkan %30 büyük; 3.mb Mirror Vein kalkanı + taunt. Pasif düğümler satır 3'te **kuruldu, Ömer r36**: Spell-Proof Vein, Shelter Echo, Long Vein, Blood for Blood, Opened Veins, Mirror Ward, bar Warded Steps (%5).
- YZ: takım kalkanı genel shield teriminden yüksek değer alıyor (4 dost x ~11 = ~44); test kurulumunda hasar skill'lerinden önde. Redtithe Mirror Vein'i bekleme bitince sık seçebilir; sim ölçümü gerekir.
- Büyü zırhı (Ömer düzeltmesi 2026-11-18): (25 + INT x 1,5; Ömer ikinci düzeltme, önce 20 + INT x 2) x eksik kan oranı; formulas.json > bloodBar.magicArmorBase / magicArmorPerInt (class verisinde değil, kan barı kuralıyla bir arada). Savaş başında (kan 50) INT 10 ile 20 büyü zırhı (eski 40 + 7,5).

## 543. Mirror Vein YZ modeli varsayımları (2026-11-17, engine-dev, dal agent-balance-redtithe)
- (2026-11-18: Mirror Vein yeniden tasarlandı; aşağıdaki model yerine kan değeri modeli geldi, yukarıdaki madde.)
- Ölümcül büyü (beklenen hasar >= can + kalkanlar) emilirse ek değer = P_ölümcül x kurtarma değeri (save) x veinShare. Bu kural benim kararım; ilk büyüden sonraki büyülerin yine öldürebileceği sayılmaz.
- Düşmanın kalkan süresinde her turunda büyü attığı varsayılır (fiziksel hamle seçebileceği sayılmaz); atış sayısı ufuk turları x min(süre, ufuk) / ufuk, en az 1. Düşman başına yalnız p x hasarı en büyük büyü sayılır.
- Sonuç (20 savaş, seed 1-20, sim değil): Mirror Vein 68 Redtithe turunda 4 kez seçildi (önce 0); seçildiği anlar çoğunlukla düşük canlı dost + 2-3 büyücü. Skill sayısı değişmedi; payın yeterli olup olmadığı balance-tester ölçümüne kalır.

## 544. Gambler rework varsayımları (2026-11-18, engine-dev, dal agent/balance-redtithe)
- **Ömer onayladı 2026-11-20 (form r35):** aşağıdaki kurallar onaylı.
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

## 545. Gambler ağaç uyarlaması (2026-11-18, engine-dev; Ömer onayladı 2026-11-20, form r35)
- **Ömer onayladı 2026-11-20 (form r35):** uyarlamanın tamamı onaylı; Snake Eyes +%15 Jackpot kalır.
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
- **Ömer onayladı 2026-11-20 (form r35).**
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

## 560. Redtithe ağacı r36 uygulama varsayımları (2026-11-20, engine-dev, dal agent/engine-dev-redtithe-dugum)
## 572. Redtithe ağacı r36 uygulama varsayımları (2026-11-20, engine-dev, dal agent/engine-dev-redtithe-dugum)
## 603. Redtithe ağacı r36 uygulama varsayımları (2026-11-20, engine-dev, dal agent/engine-dev-redtithe-dugum)
## 549. Redtithe ağacı r36 uygulama varsayımları (2026-11-20, engine-dev, dal agent/engine-dev-redtithe-dugum)
- Sayılar PROVİZYON, sim yok (Lead Ömer'e soracak). Karar kaydı `docs/arch/areas/character-design.md` madde 17, tablo `antimage.md` bölüm 4.
- Open Veins (0.eb) kanı ve Widening Cut (2.r) tik sayacı her Bleeding tikinde: tur başı tiki + Blood Brand ek tiki + Bleeding yer değiştirme tiki. Bunun için ek tikler de (genel DoT yolu) kaynağın `at: dot` kancalarını, tik sayacını ve `dotTick` tetiğini işletir (yalnız Bleeding ek tik alır; başka sınıfta Bleeding'e bağlı kanca yok, davranış değişmedi). **Onaylı (Ömer 2026-11-21, r38).**
- Widening Cut yalnız Blood Brand'in verdiği Bleeding'e (durumu veren skill); Blood for Blood'un (3.ma) Bleeding'i sayılmaz.
- **Ömer 2026-11-21 kararı (form r38):** Final Tithe (0.mb) de Reaping Brand (2.v) gibi: işaret nasıl biterse bitsin (süre ya da silinme) tetiklenir; taşıyan ölünce değil; yeniden atmak bitiş sayılmaz. (Eski varsayım: yalnız süre dolunca.)
- Hush of the Brand (2.n0) Searing Grasp'ın (2.mb) MP sıfırlamasında da işler (işaret o an hedefteyse). YZ değeri test modunda 0 (MP yenilenmez, susturma bir hamle engellemez); turns modunda var.
- Stripping Brand (2.eb) işaret tutmasa da buff siler (Blood Brand hasarsız, isabet zarı yok); ipucu "Removes 1 random buff". **Onaylı (Ömer 2026-11-21, r38): her atışta siler.**
- Blood for Blood: Brand'in Bleeding'ini taşıyan büyücüde tek örnek kalır, güç ve süre düşmez (motorun genel durum yenileme kuralı).
- YZ (yeni terim `veinTree`, ağırlık `data/ai.json > value.blood.wardTypeShare` 0,5): kalkanlıya hasar kancaları (Spell-Proof Vein büyü, Warded Steps fiziksel) beklenen hasarın yarısını o türden sayar. MP yakım tetikleri artık YZ değeri alır: Hush ile birlikte mevcut Drink Deep (1.ma) ve Tempo Thief (1.mb) da değerlenir (Redtithe Tithe Cut'ı biraz daha sık seçebilir).
- Ağaç sürümü 6 kaldı (bedava respec yok): pasif düğümlere v6'da puan konamıyordu, arkalarındaki yol da kapalıydı.

## 561. Kalkan ham hasar kuralı uygulama varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-kalkan)
## 573. Kalkan ham hasar kuralı uygulama varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-kalkan)
## 604. Kalkan ham hasar kuralı uygulama varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-kalkan)
## 550. Kalkan ham hasar kuralı uygulama varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-kalkan)
Kural Ömer onaylı (form r38): hasar kalkana ham çarpar, zırh / azaltma yalnız cana giden kısma. Uygulamada verilen onaysız kararlar:
1. **(KARARLANDI Ömer 2026-11-21 form r40: bu iki düğüm muaf; bkz. Q-NEW. Kalkan muafiyeti yorumu.) Spell-Proof Vein ve Warded Steps (Redtithe ağacı, Mirror Vein altındaki dosta -% hasar) artık yalnız kalkanı KIRAN vuruşun cana inen kısmını azaltır;** kalkan tamamen emdiğinde etkisi yok (hedef tarafı azaltma oldukları için kurala dahil edildi). Alternatif: kalkan koşullu (`shield` alanlı) `damageTaken` kancalarını kuraldan muaf tutmak (kalkana çarpan hasarı azaltmaya devam eder). Ömer seçsin.
2. "Hasar azaltma" = hedef tarafının AZALTAN (< 1) her çarpanı ayrı ayrı (Fortified, Blessed, Soaked ateş payı, taunt koruması, Global defense / Endurance, element direnci, Bone Ward, ağaç damageTaken azaltması, Flock Shield, Stand Firm, Guard payı kesintisi). ARTIRANLAR (Exposed, Tempering su eki, çağrının x2'si, element zayıflığı) ham hasarın parçası: kalkana da çarpar.
3. Encased bloğu (kalkan gibi) azaltmalı hasarı yemeye devam eder (sıra değişmedi). Banked Coals: ertelenen pay kalkana çarpmaz; kor tikleri zırhsız olduğu için oran 1 (kalkana tik miktarı kadar).
4. Guard / Phalanx payında korumacının kalkanı HEDEFİN savunma oranıyla çarpılır (korumacı bugün de hedefin zırhıyla azalmış payı alıyor). Martyr's Vow taşıyanın zırhıyla (ham vuruş aynı).
5. Ağaç düz hasar eki (flatDamage) zırhsız eklenir ama oran hesabında vuruşun geri kalanıyla aynı sayılır (çok küçük sapma).
6. YZ'nin kaba tehdit toplamları (tehlikede mi, kurtarma, odak) kalkanı hâlâ tam puan sayar; tek vuruş öldürme tahmini ve önizleme kesin.
7. Sayı değişmedi; kalkan veren sınıfların kalkanı ölçümle sonraki adım (Ömer notu).
8. YZ'nin vuruş değeri (hpLoss + absorbed) artık kalkandan düşen HAM puanı sayar: zırhlı + kalkanlı hedefte değer 1/keep kadar büyür, bu hedef seçimini biraz kaydırabilir (kalkan kırmak daha değerli görünür). Shocked testindeki "kalkan kaybı = değer" mantığıyla aynı; koda dokunulmadı.
9. Mana Overflow yükü, Rebuke ve Thorns hâlâ azaltılmış vuruşun tamamını sayar (kalkan yemiş olsa da); savaş kaydındaki "took X" ve sim hasar istatistiği kalkandan düşen ham puanı içerir (biraz yükselir).
## 562. Kalkan muafiyeti yorumu (2026-11-21, engine-dev, dal agent/engine-dev-r40)
## 574. Kalkan muafiyeti yorumu (2026-11-21, engine-dev, dal agent/engine-dev-r40)
## 605. Kalkan muafiyeti yorumu (2026-11-21, engine-dev, dal agent/engine-dev-r40)
## 551. Kalkan muafiyeti yorumu (2026-11-21, engine-dev, dal agent/engine-dev-r40)
Ömer form r40: Spell-Proof Vein ve Warded Steps kalkan ham hasar kuralından muaf ("Eski sistemden ziyade bunlar kendi skill nodeuna göre hasar azaltmayı hesaplasın"). Lead yorumu, uygulandığı gibi:
1. Eski sıraya (zırh kalkandan önce) dönülmedi. Bu iki düğüm kendi yüzdesini Mirror Vein kalkanı altındaki dosta gelen ilgili türdeki (büyü / fiziksel) vuruşa kalkana çarpmadan ÖNCE uygular; kalkan azaltılmış ham vuruşu yer. Zırh ve öbür azaltmalar yine yalnız cana inen kısma. Örnek (Warded Steps %5, zırh %50, ham 368): kalkan tamsa kalkandan 348 düşer (önce 368); kalkan 116 ise kalan (348 - 116) x 0,5 = 116 cana iner (düğümsüz 126); kalkan yoksa düğüm işlemez (184, aynı).
2. Stand Firm ve Guard payı kesintisi kurala uyar (dokunulmadı).
3. Kural kodda "kalkan koşullu hasar kancası" (`shield` alanlı `damageTaken` kancası) olarak yazıldı; bugün yalnız bu iki düğüm böyle. Başka böyle bir düğüm eklenirse test kırılır, karar ister.
4. Çok vuruşlu skill (ör. Warrior temel saldırısı iki vuruş) kalkanı ilk vuruşta kırarsa ikinci vuruşa düğüm işlemez (kalkan yok). Bu zaten motordaki davranıştı; önizleme bunu bilmiyordu, artık biliyor (önizleme = gerçek sonuç).
5. YZ değeri (`veinTree` terimi) pencerede beklenen hasarın tamamını sayar (kalkanı aşan kısımla sınırlamadan önceki r36 hâline döndü). Sayı değişmedi, sim yok.

## 563. Blood Brand 2x2 uygulama varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-r40)
## 575. Blood Brand 2x2 uygulama varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-r40)
## 606. Blood Brand 2x2 uygulama varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-r40)
## 552. Blood Brand 2x2 uygulama varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-r40)
Ömer form r40: "Blood brand alanı 2x2 olsun" (amaç Tithe Cut kullanım payını %45 bandının altına çekmek). Başka denge değerine dokunulmadı. Onaysız kararlar:
1. **Şekil:** var olan `rect` 2x2 kuralı (Moor Raider Peat Smoke ile aynı veri: `area_enemies`, `range` 4, `anchor bottom_left`). İmleç hücresi alanın ekranda sol-alt köşesi; derinlikte anchor sırası + arkasındaki sıra; tahta dışına taşarsa boyut korunarak kaydırılır. Menzil anchor hücresine bakar, alan menzilin ötesine taşabilir (range.md, Whirlwind gibi).
2. **Düşman başına işleyen ağaç düğümleri artık alandaki her düşmanda ayrı işler (sınır eklenmedi):** Wide Basin (bar[2]) işaretlenen her düşman için takıma 1 MP (en çok 4), Stripping Brand (2.eb) vurduğu her düşmandan 1 buff, Searing Grasp (2.mb) her düşmanın maks MP'sinin %15'i, Final Tithe (0.mb) / Reaping Brand (2.v) her işaret bitişinde (Reaping Brand'in cooldown sıfırlaması da her bitişte). Wide Basin, Stripping Brand ve Searing Grasp oyuncu metni "each enemy" olarak düzeltildi. Bu düğümler dolaylı olarak güçlendi; denge ölçümü Ömer onayıyla.
3. **YZ:** ek Bleeding tiki ve MP bedel artışı terimleri düşman başına toplanır; işaret terimi (Tithe Cut / Exsanguinate'in işaretliye fazla hasarı) toplanmaz, alandaki düşmanlar arasında en yükseği (Redtithe turda tek düşmana vurur; eski Ley Brand kuralı).
4. Debug Pose Tester kopyası (`pt_drain_field`, tek hedef) değiştirilmedi (debug aracı, `tools/make-pose-testers.mjs` üretir).
5. Golden kayıtları yeniden üretildi (quick, comps, endless, items; Blood Brand atışları ve Redtithe'li savaşlar). Sim koşulmadı.

## 564. First Fire's Verdict varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-r40)
## 576. First Fire's Verdict varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-r40)
## 607. First Fire's Verdict varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-r40)
## 553. First Fire's Verdict varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-r40)
Ömer form r40/r41: 100 hamleden sonra her tur sonunda iki takıma birer saf vuruş, 30'dan başlayıp +10 artar; uyarılar 10 ve 3 hamle önce. Onaysız kararlar:
1. **Hamle:** her birimin her eylemi (skill, Rest, Skip, Move, pas; Stun'la atlanan tur da sayılır, mevcut `turnsTaken` sayacı). Ek eylem (actionsPerTurn) ayrı hamle sayılır. Kural 101. hamlede başlar; ilk vuruş çifti o andan bir tur sonra.
2. **Tur:** tur süresi her an hayattaki en yavaş birime göre (o ölürse sonraki tur kısalır). Çağrılar da sayılır (yavaş Treant turu uzatabilir). Test modunda (debug) tur = yaşayan birim sayısı kadar eylem.
3. **Hedef:** "yaşayan birim" = savaşan birim (çağrılar dahil, Totem gibi nesneler hariç). Vuruş Lucky Escape, ölümsüzlük, Guard, taunt, kalkan ve kaçınmadan geçer; yalnız oyunun ölemez işaretli birimi (`undying`, öğretici) 1 canda kalır.
4. **İki vuruş da yapılır:** ilk vuruş bir takımı bitirse de ikinci vuruş atılır; böylece iki takım aynı çiftte bitebilir (aynı anda bitiş kuralı).
5. **Dalgalı savaş:** hamle sayacı ve kural durumu dalga geçişinde sıfırlanmaz (savaş boyunca sayılır).
6. Ömer 2026-11-21: hasar tipi "pure" (element yok, ateş değil). Varsayım: hasar alınca tetiklenen pasifler (kan, Rage, diken vb.) pure vuruşta TETİKLENMEZ (bugünkü davranış korundu); ölüm tetikleri (ölünce çalışanlar) normal işler.
7. Sim koşulmadı; golden kayıtları yeniden üretildi (100 hamleyi aşan sefer ve Endless savaşları değişti).

## 565. Oyun sonu r38-r39 uygulama varsayımları (2026-11-21, campaign-dev, dal agent/campaign-dev-oyun-sonu)
## 577. Oyun sonu r38-r39 uygulama varsayımları (2026-11-21, campaign-dev, dal agent/campaign-dev-oyun-sonu)
## 608. Oyun sonu r38-r39 uygulama varsayımları (2026-11-21, campaign-dev, dal agent/campaign-dev-oyun-sonu)
## 554. Oyun sonu r38-r39 uygulama varsayımları (2026-11-21, campaign-dev, dal agent/campaign-dev-oyun-sonu)
- **Sıra:** kapanış sineması -> jenerik -> harita sonu kartı. Kart en sonda çünkü "Stay on the map" / "Main Menu" düğmeleri kartta ve değişmemeli. Jenerik X / Esc ile atlanır; yeniden yüklemede tekrar gelmez (ana menü > Credits'ten açılır).
- **Kart sayıları sefer toplamı:** `s.stats` harita geçişinde taşındığı için Harita 1 kartı da aslında sefer toplamını gösteriyor (Harita 1 sonunda ikisi aynı). Harita 2-3 kartı aynı davranışta bırakıldı. Öneri (yapılmadı): oyunun sonunda toplam doğru; Harita 2 kartında "bu harita" sayıları istenirse harita başı sayaç gerekir (yeni alan).
- **Eski kayıt varsayılanı:** Mend or Quench'i bitirmiş eski kayıtta seçim `eventChoice`tan kurtarılır (son düğümde silinmiyor); kurtarılamazsa `mend` (olayın ilk seçeneği). Böyle bir kayıt yüklenince kapanış sineması + jenerik bir kez oynar (Harita 1 sinematiklerinin eski kayıt kuralı gibi).
- **Kayıt sürümü 14 -> 15** (brief "sürümlü şema" istedi; proje alışkanlığı isteğe bağlı alanda sürüm artırmamaktı). Etkisi: eski sürümün açık sekmesi yeni kaydı "newer version" diye okumaz (veri kaybı yok).
- **Sinema metni:** ilk üç sahne iki dalda aynı (sessiz salon, Kharduin kapısı, güneye dönüş yolu), son sahne + başlık dala göre: Mend "The Crownbearer" (taç liderin alnında, ocaklar parlak, ateşin bedeli bilinmiyor: Morvane'in kaderine hafif ipucu), Quench "The Dark Hearth" (taçsız Valdoria, yağmur, toprak hiçbir ateşin değil). Konuşan yalnız anlatıcı ve lider (Harita 1'de Morvane'in konuştuğu 2. sahnede burada lider + anlatıcı; Ember ve Hearthwarden konuşmuyor, belgede konuşan bir varlık değiller). Yeni özel ad yok.
- **Jenerik yeri:** ana menüye dördüncü satır "Credits" (Play · Settings · Codex · Credits); başka uygun yer yoktu. Boş bölüm (Design & Direction, Special Thanks) ekranda çizilmez, Ömer doldurunca görünür.
- **Taint'e göre bitiş metni** (eski plan C1 / C7: "Mend/Quench metni Taint sayısına göre değişir") YAPILMADI: brief başka etki istemedi. İstenirse ayrı iş.
- **Kayıt anı:** olay düğümünde otomatik kayıt yoktu; Harita 3 sonu kartı açılırken bir otomatik kayıt (checkpoint) yazılır: seçim ve sinemanın görüldü işareti kayda geçer. Sinema / jenerik sırasında sayfa kapanırsa seçim kaydedilmemiş olur, oyuncu olaya döner ve yeniden seçer.
- **Codex makalesi eklenmedi:** bitiş dallanması bir sürpriz (spoiler); Mechanics'te anlatılması istenirse kısa makale ayrı iş.
- Ömer'e: jenerik satırları (`data/credits.json`) onay / düzeltme; özellikle "Images made with OpenAI Codex image generation", font yazarları, "Cloudflare" satırı ve kod üretiminde kullanılan YZ aracının yazılıp yazılmayacağı.


## 566. Form r39 motor kararları uygulama varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-r39)
## 578. Form r39 motor kararları uygulama varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-r39)
## 609. Form r39 motor kararları uygulama varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-r39)
## 555. Form r39 motor kararları uygulama varsayımları (2026-11-21, engine-dev, dal agent/engine-dev-r39)
Kurallar Ömer onaylı (form r39). Uygulamada verilen onaysız kararlar:
1. **Aynı anda bitiş:** Quick Battle YZ'ye karşı (tek oyunculu) = oyuncu kaybeder (Ömer yalnız sefer / tek oyunculu / çok oyunculu dedi; en dar yorum). Endless da tek oyunculu sayıldı (kayıp). Totem nesnesi kırıldığı anda oyuncu tarafı da bittiyse kayıp. Çok oyunculu beraberlikte sonuç ekranı "DRAW" başlığı + "Both teams fell at the same time"; iki sütunda da kazanan işareti ve MVP yok; final darbe efekti ve ses yenilgininki (görünüş ui işi). Ağ mesajı yok: iki istemci beraberliği kendi motorundan bulur.
2. **Electrocuted:** (a) alanda / tümde birimin kendisi hiç vurulmaz (kendi satırı vurulsa da). (b) Tümü / rastgele hedefli ilk skill'de dost zarı atılmaz (merkez yok); rastgele hedefli ilk skill (bugün yok, ağaçla olabilir) kendi takımından `count` kadarını kendi zarıyla seçer. (c) Toll'un bedava kullanımı çan sayacını artırır (bedava kullanımlar zaten çan sayılıyordu). (d) Telgraflı ilk skill (Harpoon Ballista'nın Harpoon Line'ı) bir şey yapmaz. (e) Yan vuruş (splash) yine düşer (bugün ilk skill'lerin hiçbirinde yok). (f) Kurala ağacın değiştirdiği biçim (`skill(id, uid)`) girer; ağaç ilk skill'in hedefini değiştirirse yeni hedef türü uygulanır. (g) YZ: tek hedefte eski "en iyi saldırı" tahmini kaldı (ilk skill'in kendisi değil; hedef listesi artık motorla aynı: buzda / yer altındaki dost sayılmaz); alan / tümde ilk skill'in önizlemesi. (h) İlk skill'i hasar vermeyen birimler: `rod_tester` (yalnız test sınıfı, Thunder Rod kendine), skill'siz nesne bosslar `iron_mooring`, `hex_totem`, `lantern`; telgraflı `harpoon_ballista`. Bunlarda bir şey olmaz.
3. **Taunt kırma:** bayrak veride (Frozen, Cooling `breaksTaunt: true`); kod kuralı değişmedi (bayraklı durum uygulandığı AN taunt silinir). Yeni bir `skipTurn` durumu eklenirse bayrağı da almalı (test bunu denetler). YZ'de ayrı değer yok: Stun için de yoktu (taunt kırma değeri eklenmedi); YZ hedeflemesi motorun gerçek taunt durumunu okuduğu için kırılınca hemen doğru hedefler. Oyuncu metni "a status that makes it lose its turn" (Cooling CC sayılmadığı için "control status" demedik).
4. **Sıra çubuğu:** yalnız sayılı hız durumları tahminde biter (Haste, Chilled; süresiz ağaç durumu ve zeminden gelen Chilled tahminde sürer, çünkü süreleri işlemez). Gelecekte olacak olaylar (yeni Haste, ateşin Chilled'ı eritmesi, ölüm) yine bilinmez; her olaydan sonra çubuk yeniden hesaplanır. YZ de `turnQueue` okuduğu için kararları biraz değişebilir (golden farkı commit 5'te).

## 567. Olay penceresi X / kartsız varış varsayımları (2026-11-21, ui-dev, dal agent/ui-dev-olay-r40, form Tur 40)
## 579. Olay penceresi X / kartsız varış varsayımları (2026-11-21, ui-dev, dal agent/ui-dev-olay-r40, form Tur 40)
## 610. Olay penceresi X / kartsız varış varsayımları (2026-11-21, ui-dev, dal agent/ui-dev-olay-r40, form Tur 40)
## 556. Olay penceresi X / kartsız varış varsayımları (2026-11-21, ui-dev, dal agent/ui-dev-olay-r40, form Tur 40)
- **Açık kalan olayda yol:** seçenek sayfasında X yalnız pencereyi kapatır, olay açık kalır. Olayda "çık" seçeneği varsa (Walk away, Leave, Move on, Not yet, Just rest; veride `walkAway` ya da `closer`) kafile yola çıkabilir (Walk away'in bugünkü davranışı, `state.ts > walkAwayHere`); Guild Hall / Ferry Office'te de yol kapanmaz, `again` kuralı bitmiş olayı yine yeniden açar. Çıkış seçeneği olmayan olayda (yalnız gerçek seçenekler) olay açıkken yol kapalı kalır, düğüme yeniden dokununca olay açılır. Bu eski davranıştan farklı: eskiden X "Leave" seçeneğini uygulayıp olayı bitiriyordu; şimdi hiçbir şey uygulanmaz, sonradan seçenek hâlâ alınabilir. Ömer farklı isterse (ör. Leave X ile bitsin) söyle.
- **Kapat seçenekleri artık yalnız X:** `closer` seçeneği kart olarak zaten gizli, X onu seçmiyor; veride duruyor (sonuç yazısı kullanılmıyor).
- **Zemine dokunma** olay penceresini hâlâ kapatmaz (yalnız X / Esc).
- **Sonuç sayfası X = Continue:** ödül ve zar `commit` anında tek kez uygulanır; sonuç sayfası açıkken kayıt yüklenirse durum seçim öncesindedir (ödül verilmemiş), seçenekler yeniden sorulur.
- **Kartsız varış:** yalnız seçenekli olay düğümü eklendi (`textOnlyEvent`); nimet / görev çipli seçeneksiz olaylar, tapınak ve başka düğüm türleri bugünkü gibi kartlı.
- **Telefonda olay resmi:** 46 px şerit, yalnız olay pencerelerinde (`lowArt`); 4 seçenekli Monk's Isle'da seçenekler pencere içinde ~27 px kayar (taşmaz, kesilmez).

## 568. Ağaç kazancı sınıf çarpanı varsayımları (2026-11-21, balance-tester, dal agent/balance-agac, form r41 `tr_fix`)
## 580. Ağaç kazancı sınıf çarpanı varsayımları (2026-11-21, balance-tester, dal agent/balance-agac, form r41 `tr_fix`)
## 611. Ağaç kazancı sınıf çarpanı varsayımları (2026-11-21, balance-tester, dal agent/balance-agac, form r41 `tr_fix`)
## 557. Ağaç kazancı sınıf çarpanı varsayımları (2026-11-21, balance-tester, dal agent/balance-agac, form r41 `tr_fix`)
Uygulanan: 10 sınıfın ağaç düğümü güç sayıları tek sınıf çarpanıyla kısıldı (tur 2: Gambler 0,26, Skald 0,27, Warrior 0,29, Undead 0,30, Redtithe 0,20, Defender 0,32, Archer 0,22, Druid 0,34, Vesper 0,35, Cutthroat 0,32; Hexer, Mage, Paladin dokunulmadı). Tam ağaç L20 300 savaş genel kazanç +39,0 -> +35,6 (tur 1) -> +29,0 (tur 2). Varsayımlar (Ömer onayı yok):
- **Bedel kısılmadı:** blood / "but ..." düğümlerinde kazanç kısıldı, bedel (eksi güç, can, MP) aynı kaldı; bu düğümler eskisine göre daha az cazip (ör. Warrior Whirlwind "Wounded'a +%4,25, Wounded olmayana hiç hasar yok").
- **Mekanik değerler kısılmadı:** süre, yığın, eşik, garanti (1 = tam), "set / base" ile tanımlanan taban değiştirmeler. Taban değiştiren birkaç düğümde yalnız tabanın ÜSTÜNDEKİ fark kısıldı (Close Ranks payı, Fist Crush zırh ölçeği, Vampiric Bite oranı, Blood Oath payı, Sunder, Shattered Shin, Smoke Bomb Blinded, Headsman's Blow can çalma, Aimed Shot infaz, Tithe Cut kan / MP).
- **Ağaç taban kopyaları kısılmadı:** düğüm tabandaki aynı sayıyı yeniden yazıyorsa (Druid Nature's Grudge Withering gücü, Undead / Dark Bond can aktarımı (aktarılan = ödenen), Weakened'ın fiziksel nötrleme payı, Archer "falloff yok" 0,3).
- **Ömer'in sabitlediği sayılar da kısıldı:** Redtithe Warded Steps (bar[3], Ömer r36 %5) -> %1; r41 "sınıf başına tek çarpan" kararı bunları da kapsar diye okundu.
- **Tam sayı tabanı:** MP / Rage / kan kazançları en az 1'de kaldı (30 değer en küçük adımda: %0,25 ya da 1). YZ 1-3 MP kazancını çoğu durumda 0 değerliyor (manaGain basamaklı): Skald Grounding 3 rankta ve Thunder Memory, Vesper Resounding Crack 1 rankta YZ teraziye girmiyor (testler MP azken ölçüyor).
- **Ağaç sürümü artmadı:** önceki sayı ayarları (0.9.6.4) da sürümü artırmadı; sürüm artarsa herkese bir kez bedava sıfırlama gelir (geri alınamaz). Lead kararı.
- **Evolve, satır 0 / 3, öbür ult kolları** ölçülmedi (sim yalnız satır 1+2, ult u; Defender 2+3, ult r) ama aynı çarpanla kısıldı.
## 558. Redtithe koşu adımında arka el tutuş açısı (content-designer, 2026-11-21)
## 569. Redtithe koşu adımında arka el tutuş açısı (content-designer, 2026-11-21)
- **Varsayım (hançer):** step1 arka hançeri 45 -> 120. Duruştaki el yönüyle aynı tutuş ~135 isterdi; hançer bandı ("ucu öne", 40..120) en çok 120'ye izin verdiği için 120 seçildi (bilek ~15° kırık). Bıçak öne-hafif aşağı.
- **Soru (kılıç/balta/topuz/çekiç):** aynı karede bu silahların açısı 35; v4 önkoluna paralele yakın düşüyor (bıçak önkol üstünden geri). Bandı 14..50 olduğu için dik tutuş verilemiyor. Seçenek: (a) böyle kalsın, (b) bu kare için bandı aş, (c) koşu adımının arka kolunu yeniden çizdir (önkol aşağı sarkar).

## 570. YZ MP kazancı sürekli: varsayımlar (engine-dev, 2026-11-22, form tr3_mp "Motor")
## 581. Redtithe koşu adımında arka el tutuş açısı (content-designer, 2026-11-21)
- **Varsayım (hançer):** step1 arka hançeri 45 -> 120. Duruştaki el yönüyle aynı tutuş ~135 isterdi; hançer bandı ("ucu öne", 40..120) en çok 120'ye izin verdiği için 120 seçildi (bilek ~15° kırık). Bıçak öne-hafif aşağı.
- **Soru (kılıç/balta/topuz/çekiç):** aynı karede bu silahların açısı 35; v4 önkoluna paralele yakın düşüyor (bıçak önkol üstünden geri). Bandı 14..50 olduğu için dik tutuş verilemiyor. Seçenek: (a) böyle kalsın, (b) bu kare için bandı aş, (c) koşu adımının arka kolunu yeniden çizdir (önkol aşağı sarkar).

## 582. YZ MP kazancı sürekli: varsayımlar (engine-dev, 2026-11-22, form tr3_mp "Motor")
## 612. Redtithe koşu adımında arka el tutuş açısı (content-designer, 2026-11-21)
- **Varsayım (hançer):** step1 arka hançeri 45 -> 120. Duruştaki el yönüyle aynı tutuş ~135 isterdi; hançer bandı ("ucu öne", 40..120) en çok 120'ye izin verdiği için 120 seçildi (bilek ~15° kırık). Bıçak öne-hafif aşağı.
- **Soru (kılıç/balta/topuz/çekiç):** aynı karede bu silahların açısı 35; v4 önkoluna paralele yakın düşüyor (bıçak önkol üstünden geri). Bandı 14..50 olduğu için dik tutuş verilemiyor. Seçenek: (a) böyle kalsın, (b) bu kare için bandı aş, (c) koşu adımının arka kolunu yeniden çizdir (önkol aşağı sarkar).

## 613. YZ MP kazancı sürekli: varsayımlar (engine-dev, 2026-11-22, form tr3_mp "Motor")
## 558. Redtithe koşu adımında arka el tutuş açısı (content-designer, 2026-11-21)
- **Varsayım (hançer):** step1 arka hançeri 45 -> 120. Duruştaki el yönüyle aynı tutuş ~135 isterdi; hançer bandı ("ucu öne", 40..120) en çok 120'ye izin verdiği için 120 seçildi (bilek ~15° kırık). Bıçak öne-hafif aşağı.
- **Soru (kılıç/balta/topuz/çekiç):** aynı karede bu silahların açısı 35; v4 önkoluna paralele yakın düşüyor (bıçak önkol üstünden geri). Bandı 14..50 olduğu için dik tutuş verilemiyor. Seçenek: (a) böyle kalsın, (b) bu kare için bandı aş, (c) koşu adımının arka kolunu yeniden çizdir (önkol aşağı sarkar).

## 559. YZ MP kazancı sürekli: varsayımlar (engine-dev, 2026-11-22, form tr3_mp "Motor")
- **Varsayım (taban payı):** ufuk planı MP'yi zaten karşılarken (yenilenme yetiyor) küçük kazanca verilen taban `value.manaGainDeficitShare` 0,05 seçildi: büyük kazançlar eski değere yakın kalsın diye küçük. Ölçümle büyütülebilir (sim ayrı koşacak). **Ömer onayı 2026-11-22 (form r41 tr5_mp): 0,05 kalır.**
- **Varsayım (zarf şimdiden başlar):** değer eski basamaklı değerden hiç az olmaz; kullanım açmayan kazanç sonraki kullanıma doğru doğrusal pay alır (ör. Skald turns MP 16: 1 MP 0 -> 1,62, 2 MP 3,24 -> 3,24). Sonuç: bir skill eşiğinin hemen altındaki MP başı değer, çok düşük MP'dekinden yüksek olabilir ("açıkla orantı" tam doğrusal değil; doğrusal olan yalnız taban).
- **Bilinen etki:** Mage turns MP 0, 20 MP: 2,08 -> 3,90 (tabandan; yaklaşık 2 kat).
- **Varsayım (taban payı):** ufuk planı MP'yi zaten karşılarken (yenilenme yetiyor) küçük kazanca verilen taban `value.manaGainDeficitShare` 0,05 seçildi: büyük kazançlar eski değere yakın kalsın diye küçük. Ölçümle büyütülebilir (sim ayrı koşacak). **Ömer onayı 2026-11-22 (form r41 tr5_mp): 0,05 kalır.**
- **Varsayım (zarf şimdiden başlar):** değer eski basamaklı değerden hiç az olmaz; kullanım açmayan kazanç sonraki kullanıma doğru doğrusal pay alır (ör. Skald turns MP 16: 1 MP 0 -> 1,62, 2 MP 3,24 -> 3,24). Sonuç: bir skill eşiğinin hemen altındaki MP başı değer, çok düşük MP'dekinden yüksek olabilir ("açıkla orantı" tam doğrusal değil; doğrusal olan yalnız taban).
- **Bilinen etki:** Mage turns MP 0, 20 MP: 2,08 -> 3,90 (tabandan; yaklaşık 2 kat).

## 571. Büyük ağaç ölçümü ve set ölçümü varsayımları (2026-11-23, balance-tester, dal agent/balance-agac-tur2, r41 gece işleri)
## 583. Büyük ağaç ölçümü ve set ölçümü varsayımları (2026-11-23, balance-tester, dal agent/balance-agac-tur2, r41 gece işleri)
## 614. Büyük ağaç ölçümü ve set ölçümü varsayımları (2026-11-23, balance-tester, dal agent/balance-agac-tur2, r41 gece işleri)
Raporlar: `eov-forms-archive/uiform-live/r41/agac-buyuk.md`, `set-olcum.md`. Veri değişmedi. Varsayımlar (Ömer onayı yok):
- **Ağaç, hücre tablosu yeniden koşulmadı.**
  - Brief'teki "satır 1+2 (--rows ile 9 hücre)" şöyle okundu: ana ölçüm tam kurulum 2 x 10.000 (satır 1+2, ult), artı iki yeni hücre.
  - Hücre tablosu eski ölçümlerden derlendi. Bu ölçümlerin bir kısmı tur 3-4 öncesi; raporda yıldızlı.
- **Ağaç, hücre bandı (+10..+14)** tüm takım kipindeki satır-yön değerlerine uygulandı. Bu değerlere Mastery bar 3/5 payı da giriyor; bar payı ayrılmadı.
- **Set, karşılaştırma tabanı "bütün set yuvaları Epic".**
  - Taban, sınıfın giyebildiği en yüksek nadirlikli set olmayan taban; Epic zarlanır, setle aynı ilvl.
  - Seferde gerçek alternatif çoğu zaman daha düşük nadirlik olur. Bu yüzden ölçüm setin aleyhine bir üst sınırdır.
- **Set, kurulum: tek taşıyıcı, hızlı savaş 4e 4.**
  - Herkes setin item seviyesinde ve aynı level'da.
  - Başka item ve ağaç yok. Taşıyıcının set dışı yuvaları boş.
  - Sefer / Endless ortamı ölçülmedi.
- **Set, parça seçimi.** k parçada hangi yuvaların set olduğu seed'e göre döner. Bonus yuvadan bağımsız; yuvaların kendi statları ortalamaya girer.
- **Set, Stormhall Saga, Saint Odran, Almoner's Vestments** brief'teki altı sette yoktu; ölçülmedi.

## 584. Önizleme (c)/(d)/(g) ve YZ tetik değerleri (e): varsayımlar (engine-dev, 2026-11-23, Ömer onayı n_preview / n_ai)
## 615. Önizleme (c)/(d)/(g) ve YZ tetik değerleri (e): varsayımlar (engine-dev, 2026-11-23, Ömer onayı n_preview / n_ai)
- **(c) kullanım ortası şifa:** önizlemenin yalnız EN AZ hasarı, önceki vuruşların en çok kendine şifasıyla (can çalma + 'hit' tetiği şifası) yükselmiş canla hesaplanır. En çok / ortalama şifasız canla kalır. Soul Drain pasif şifası ve C4 şifa kancaları sayılmaz.
- **(d) proc durumu:** aynı hedefe sonraki vuruşun yalnız kritik üst sınırı (critMax) önceki vuruşun şanslı proc durumunu (Bloody Saltire Wound) sayar. Kritiksiz en çok değişmez.
- **(g) bedel:** önizleme can bedelini (can, Soul Exchange candan ödemesi, kan bedelinin candan kısmı) vuruşlardan önce düşer. Ağaçsız birimlerde de (Berserker sınıf pasifi).
- **(e) YZ tetik değerleri:** yeni ağırlık yok. Hepsi mevcut trigEventValue ölçüsünde, olay ihtimali adayın kendi tahmininden (isabet, öldürme, şifa, bedel, tekrar / bahis şansı, Doom dalı). Sahip bizim taraftaysa 'tree', karşı taraftaysa 'retaliation' teriminde.
  - hpBelow: vurulanın önce / sonra can oranı, isabet x sağ kalma. luckyEscape: öldürme ihtimali / (1 - şans) x şans.
  - enemyMoved yalnız Move planının net değerine eklenir (yeni plan doğurmaz).
  - Değer verilmeyenler: battleStart, turnStart, groundEnd, passiveHeal (seçimden bağımsız) ve arrive. arrive seçime bağlı ama dinleyen kanca çağrılan birimde; aday anında birim yok. Çağrı değeri summonValue'da. Ömer isterse ayrıca tartılır.
## 585. r41 gündüz turu varsayımları (2026-11-23, balance-tester, dal agent/balance-agac-tur2, form r41 n_)
## 616. r41 gündüz turu varsayımları (2026-11-23, balance-tester, dal agent/balance-agac-tur2, form r41 n_)
- **Skald Thunder Drum, "Skald'ın sırası":** satır = Skald'ın derinlik çizgisi (tahtada aynı satırdaki 3 yuva; alan kancası `shape: row`). "Aynı sütun" okunmadı.
- **Mage / Defender %5 kısma:** yüzdeler temiz adımlara yuvarlandı (%10'a kadar 0,25, üstü 0,5). Defender'ın üç küçük düğümü (2.f2 / 2.f3 / 3.f3) %0,75 > %0,5'e düştü, yani yuvarlama yüzünden %5 değil %33 kısıldı.
- **Hücre bandı +10..+14 (n_cells):** tablo tüm takım ağaçlı ölçümdür. Rapor önce düz okumayı verir (98 / 104 hücre bandın üstünde), sonra tek sınıf ölçeğine ~yarı çevrimi varsayım olarak ekler. Bandın hangi ölçek için konduğu Ömer'e sorulmalı.
- **Set hedefi 0..+3:** "tam set - aynı yuvalar sıradan Epic", tek taşıyıcı, hızlı savaş 4e 4, setin ilvl'i; sefer / Endless ölçülmedi. Tur 2'de Epic tabanı tur 1'den alındı (set bonusundan bağımsız, aynı seed'ler).
- **Set, "bonus sayısı" sınırı:** byClass satırlarının `to` değerleri ve `mods` sayıları bonus sayılmıştır; 4 parça kurallarının sayıları (Banked Coals bankShare vb.) ve bütün eksi değerler ceza / kural sayılıp dokunulmadı.
- **Road Hound:** Wayfarer 3 parça kuralının köpeği (`data/summons/road_hound.json`) bonusla birlikte büyütüldü (hp / damage ölçeği, taban HP, STR). Ömer bunu "bonus" saymıyorsa geri alınmalı.
- **`setValue` yöntemi:** IP / puan oranı 0,43 (Epic - item yok ölçümünden). Değer, büyüklük uyumu yerine set / Epic seçim yönüne göre seçildi (3 / 4,5). Küresel olduğu için ölçülmeyen üç set (Stormhall, Odran, Almoner) de etkilenir.

## 586. Shepherd's Fold fold_flock varsayımları (campaign-dev, 2026-11-23, Ömer Seçenek B)
## 617. Shepherd's Fold fold_flock varsayımları (campaign-dev, 2026-11-23, Ömer Seçenek B)
- **restHeal yeri:** tam şifa `restHeal: 1` seçeneğin kendisinde (savaş başlarken `eventChoice`'a yazılır, `win` içine değil; `win` yalnız altın + sandık alır). Kaybedince kayıt yüklendiği için sızmaz. Yeni kural yok, var olan alan.
- **2. dalga 3 birim:** belgede yazdığı gibi (Ember Outrider, Charcoal Burner, Ember Acolyte); Ember Road'un 4'lü ikinci dalgasından bir Acolyte eksik. Slot 6 / 8 / 1.
- **Çarpanlar PROVİZYON:** Ember Road ile aynı (1. dalga can 0,99 / güç 0,891; 2. dalga 1,028 / 0,925). Ölçülmedi; balance-tester ölçümü gerek.
- **Olay metni:** "driven on by Morvane's outriders, who mean to herd the sheep up to his gate as rations" eklendi; hint ve sonuç satırı B'ye göre değişti.
## 587. Geçiş yükleme ekranı kapsamı (Endless / Main Menu)
Varsayım (ui-dev-endless-loading, 2026-11-23): "klasik loading ekranı" (açılış kutusu #boot) yalnız harita sonu kartı Endless + Main Menu ve ana menü Endless'e basışta HEMEN açılır; diğer geçişler (ör. Back, Team Select) eskisi gibi. Hızlı cihazda kutu en az ~0,25 sn görünür (kısa bir parlama olabilir). Tüm ekran geçişlerine yaygınlaştırılsın mı?

## 588. Mage evolve animasyonları: varsayımlar (content-designer, 2026-11-23, dal agent/content-designer-mage-evolves, Ömer: "hepsi böyle yapılsın")
## 618. Geçiş yükleme ekranı kapsamı (Endless / Main Menu)
Varsayım (ui-dev-endless-loading, 2026-11-23): "klasik loading ekranı" (açılış kutusu #boot) yalnız harita sonu kartı Endless + Main Menu ve ana menü Endless'e basışta HEMEN açılır; diğer geçişler (ör. Back, Team Select) eskisi gibi. Hızlı cihazda kutu en az ~0,25 sn görünür (kısa bir parlama olabilir). Tüm ekran geçişlerine yaygınlaştırılsın mı?

## 619. Mage evolve animasyonları: varsayımlar (content-designer, 2026-11-23, dal agent/content-designer-mage-evolves, Ömer: "hepsi böyle yapılsın")
- **Mirage Veil (Heat Mirage pasifinin evolve'u) bu turda YAPILMADI:** pasif skill listesinde değil (`Combatant.evolved` yalnız `c.skills` içindekileri tutar, src/engine/battle.ts), bu yüzden pasif efektine "evolve onaylı" bilgisi ulaşmıyor. Küçük bir sunum filtresi değişikliği gerekir (engine-dev); sonra `passive_heat_mirage` Sunfire kalıbıyla büyütülür. Ömer onayı bekler.
- **Glacier Crater'ın "yanındaki düşmanlar" gösterimi:** yan komşu = aynı sıranın şerit komşuları (motorun yan komşuluk kuralı); efekt hedefin hücresinden komşu hücrelere kırağı + buz dikeni yayar, komşu hücre boş olsa da çizilir.
- **Evolve süreleri:** ilk hasar anı tabana göre Eternal Winter yaklaşık +%10 (450 / 360 ms bekleme), Glacier Crater +%11-12 (kare hızı x0,9, hazırlık 260 / 230 ms). Sayılar yalnız görünüştür.
- **Hedefin beyazlaması:** vuruşta hedefin kısa süre beyaz görünmesi oyunun genel darbe tepkisidir (data/battle-layout.json > hitReaction flash #ffffff, alfa 0,45; tüm skill'ler). Sunfire / evolve efektlerinin kendi ışıkları artık hedefin ARKASINDA çizilir (sprite örter); genel darbe parlaması bu işin dışında, değişmedi. Ömer onu da kısmak isterse ayrı karar.

## 589. Ashguard Warrior satırı: varsayımlar (engine-dev, 2026-11-23, dal agent/engine-dev-ashguard-warrior)
## 620. Ashguard Warrior satırı: varsayımlar (engine-dev, 2026-11-23, dal agent/engine-dev-ashguard-warrior)
- **Metnin başı:** öneri "Berserker: ..." idi; diğer sınıf satırları gibi "Warrior, Berserker: ..." başlığıyla yazıldı (set ipucunda üç sınıf satırı alt alta durduğu için hangi sınıfa ait olduğu görünsün). İstenirse başlık kaldırılır.
- **"doubled" sözcüğü veriden:** to / from = 2 ise "doubled", 3 ise "tripled", başka bir oranda "x<oran>" yazılır.
- **Pasif açıklaması:** set giyiliyken Berserker metni "up to 80% more damage at 25% HP or lower" der ve sayı satırlarına "Max bonus at: 25% HP" eklenir; setsiz metin aynı.
- **YZ buff değeri (ai.ts buffValue):** kendine hasar veren buff'ta Berserker'in ek hasarı, set giyiliyken eğri doyduğu için "önce / sonra" farkıyla hesaplanır (can zaten %25 altındaysa ek değer 0); setsiz eski hesap birebir.

## 590. Conclave of Embers Seçenek B: varsayımlar (engine-dev, 2026-11-23, dal agent/engine-dev-conclave-b)
## 621. Conclave of Embers Seçenek B: varsayımlar (engine-dev, 2026-11-23, dal agent/engine-dev-conclave-b)
- Çift zemin debuff'ı var olan **Overextended** (alınan hasar %25 fazla, `statuses.json > overextended`); süre 1 tur (oyundaki dört kullanımı da 1 tur). Durum seçimi ve süre varsayım.
- "Zaten yanıyor" = hücrede aynı zemin (`burning`) var; başka ateşli zeminler (Black Flame vb.) sayılmaz.
- Debuff dalı da taşıyanın tur hakkını harcar (zemin çıkmasa da kural cevap vermiş sayılır).
- İki taşıyan aynı alan skill'iyle vurulursa ilki zemin bırakır, ikincisi Overextended atar (Ömer notunun harfiyen sonucu).
- 4 parça metnine Ömer notu için bir cümle eklendi: "If its cell is already burning, it becomes Overextended (takes 25% more damage) for 1 turn instead."
- YZ: yalnız saldıran tarafına bedel; taşıyanın kendi tarafına (taunt / dizilim) ek değer yok, çünkü Heat Mirage gibi var olan tepki kurallarında da sahip tarafı terimi yok. Ölçü yeni değil (groundUnitWorth / statusEffectWorth x counterCost 0,8).
## 591. Mirage Veil karakter efekti + vuruş beyazlaması: varsayımlar (content-designer, 2026-11-23, dal agent/content-designer-mirage-glow)
## 622. Mirage Veil karakter efekti + vuruş beyazlaması: varsayımlar (content-designer, 2026-11-23, dal agent/content-designer-mirage-glow)
- **Motor satırı:** `Combatant.evolved` artık pasifin id'sini de içerir (battle.ts, tek satır, yalnız sunum). Savaş kuralı / hasar / RNG aynı; golden değişmedi.
- **Biçim:** parıltı turuncu-altın (Mage sıcaklığı); silüet kenar ışığı + yumuşak hale + seyrek kıvılcım. Sayılar veride (`data/passive-evolve-fx.json`), yalnız görünüş. Performance modunda nabız ve kıvılcım yok (sabit parıltı).
- **Ses yok:** tetiklenmede ayrı ses eklenmedi (mevcut Heat Mirage sesi duruyor).
- **Beyazlama:** "%45 > %25" light / medium / heavy üç kademenin `flashAlpha` değeri için de uygulandı (üçü de 0,45 idi).
## 592. r41 akşam / gece denge turu varsayımları (2026-11-24, balance-tester, dal agent/balance-r41-aksam)
## 623. r41 akşam / gece denge turu varsayımları (2026-11-24, balance-tester, dal agent/balance-r41-aksam)
- **spdPerDex 0,25, spdBase aynı:** brief yalnız `spdPerDex`'i söyledi; L1 hızlarını korumak için `spdBase` yükseltilmedi. Bütün birimler (mob dahil) yavaşladı, hızlı / yavaş farkı daraldı.
- **Sefer mob hız bandı:** encounters / waves `spdAdd` eksileri 0,4'e göre ayarlıydı; değiştirilmedi. Test (`turn-order-interleave`) bant dışı mobları "bilinen eksik" listesine aldı. Sefer / Endless sim ile ölçülmedi; `campaign-balance` ve `endless-balance` testleri yeşil. Yeniden ayar Ömer kararı.
- **Druid "satır 1+2 a yönü":** a yolunun aldığı bütün düğümler sayıldı: gövde (f1-f3, n0, r) + a dalı (ea, ma, fa). Gövde b kurulumlarında da var, yani Druid 1b / 2b de biraz kısıldı. Güç sayısı = hasar / kritik / şans / güç payı; süre, bekleme, "but" bedeli, tam sayı adetler sayılmadı. x0,9 en çok 3 ondalıkla (temiz adıma yuvarlanmadı).
- **3a (adım 5):** yalnız a dalı (ea / ma / fa) kesildi, gövdeye dokunulmadı (gövde 3b'de de var). Bandın üstündeki her sınıfa düz x0,8. Bant içi / altı sınıfa ve sayısı olmayan Gambler'a dokunulmadı. Tek sınıf sayıları Mastery bar 3/5 payını içerir.
- **Undead Transfusion / Bled Dry:** bu turda değişmedi (Undead 3a bandın altında). Kesilseydi `hpLoss` (bedel) aktarılan şifayla birlikte kesilecekti.
- **Reckless Heat metni:** "Charge deals 50% increased damage, grants 30 Rage and its cooldown is 4 → 3, but it no longer Stuns." 3.v evolve'un "Stun bitince 3 Rage" kısmı Reckless Heat ile boşa düşüyor; dokunulmadı.
- **Adım 3 ölçeği:** "300 savaş" tek seed grubu (1..300) okundu; sınıf başına ± 14-18, yalnız genel satır yorumlandı.
- **Druid doğrulaması:** "tek sınıf ölçümle doğrula" `magedef-tur5` yöntemi (tüm takım ağaçlı tam kurulum, Druid satırı) olarak okundu, `--only=druid` değil.

## 593. r42 denge turu varsayımları (2026-11-24, balance-tester, dal agent/balance-r41-aksam)
## 624. r42 denge turu varsayımları (2026-11-24, balance-tester, dal agent/balance-r41-aksam)
- **spdPerDex 0,25 kalır:** Ömer'in "Archer ve Hexer 0 lvl ve 20 lvl karşılaştır" notundan çıkarıldı; hız formülü bu turda değişmedi.
- **Archer / Hexer "flat damage":** skill hasarında düz sayı alanı yok (motor yalnız kalkanda destekliyor). "Flat + DEX ölçeği" yalnız güç çarpanı (power) olarak okundu; hasar ve DoT güçleri çarpıldı, Omen / Doom durum gücüne dokunulmadı. Oran Archer +%5, Hexer -%4 (Ömer örneği %3-5).
- **Mob hızı "eski düzey":** birebir eski hız D4 kuralıyla (Defender / Mage / Paladin karşısında en çok 1 erken düşman) çakıştı. Hedef "eski hız - 0,9 (DEX 6 kahramanın kaybı), en az 15, en çok eski hız" seçildi; yalnız 15'in altına düşen satırlar. Ravenwood kurtları ve bantta kalan moblar değişmedi. Birebir eski hız istenirse D4 testi değişmeli: Ömer kararı.
- **Conclave ek varyantları:** `k4noOE` (çift zeminde durum yok) ve `k4noAI` (düşman YZ bedeli 0) yalnız sim belleğinde koşuldu; veri değişmedi.


## 594. r43 YZ eksikleri varsayımları (2026-11-24, engine-dev, dal agent/balance-r41-aksam)
## 625. r43 YZ eksikleri varsayımları (2026-11-24, engine-dev, dal agent/balance-r41-aksam)
- **İki Conclave taşıyanı (Lead'e soru):** "YZ bedeli çift sayılıyor" notu ikinci bedelin hatası değil: motor aynı alan kullanımında ikisine de cevap verdirir (ilki zemin, ikincisi Overextended; `tests/conclave-answers-b.test.ts`), YZ de ikisini sayıyor (motorla aynı). Bu yüzden bedel tek sayılmadı (tek sayılsa YZ gerçek bir cezayı görmezdi). Lead yine de tek isterse `ai.ts > setRuleRisks` içinde en büyük bedeli almak tek satırlık iştir; ama asıl istenen "iki taşıyan iki ceza vermesin" ise bu bir oyun kuralı değişikliğidir (Ömer).
- **Taşıyanın kendi terimi (`setRules.conclaveWearer` 0,5, PROVİZYON):** taşıyanı hedeflemesi beklenen düşmanı öldürmek karşılığın değerini kaybettirir (küçük eksi), o düşmanın hücresine yanan zemin bırakmak karşılığı zemin yerine Overextended'a çevirir. Hak perTurn tavanı önce / sonra ayrı (taşıyanı iki düşman hedefliyorsa birini öldürmek karşılığı kaybettirmez). 48 savaşlık izde 534 taşıyan kararının hiçbiri değişmedi (yalnız puanlar; bir öldürme adayında -8,8). Pay ölçülmedi.
- **Ağaç Rage payı (`aiCov.tree.rageShare` 1):** tetik eyleminin Rage'iyle aynı ölçü seçildi (rakibin Berserker Rage'i `rageShare` 0,5 ayrı kalır).

## 595. r43 değer / kural turu varsayımları (2026-11-24, engine-dev, dal agent/r43-values)
## 626. r43 değer / kural turu varsayımları (2026-11-24, engine-dev, dal agent/r43-values)
- **Reckless Heat Fortified süresi "2 tur":** Charge'ın kendine verdiği durum (`self: true`) olağan durum süresiyle sayılır (Martyr's Rush'taki Exposed gibi); Warrior'ın kendi 2 turu boyunca. Metin: "Fortifies you for 2 turns (50% less damage taken)".
- **Woeful Turn "2 tur bekleme":** bekleme düşmanın KENDİ başlayan turlarıyla sayılır, Stun'la geçen tur dahil. Iska > Stun; Stun turu geçer; hemen sonraki ıska Stun vermez; ondan sonraki yine verir (art arda olmaz). Test modunda tur başı olmadığı için tur yerine eylem sayılır. Genel alan `TriggerHook.cdTurns` (hedef başına), yeni durum / stat değil.
- **Woeful Turn "boss'ta çalışmaz":** zaten öyleydi: boss Jinx yemez (`ccImmunity.accuracyCrit`) ve Stun yemez (`ccImmunity`). Yeni kod eklenmedi; metne yazıldı ve testle sabitlendi.
- **Glacial Spike "ana hedef":** kesin kritik yalnız Ice Crater'ın seçilen hedefinde (yeni koşul `targetInCast`). Yan hedef = Glacier Crater'ın (3.v) yanındaki düşmanlar; çarpma hasarı zaten kritik olmuyordu.
- **Double Deal (Ömer'e sorulmalı):** Card Trick'in durum havuzu yalnız Slow / Wound / Stun. Stun dışlanınca ikinci durum artık rastgele değil: Slow kartı hep Wound, Wound kartı hep Slow ekler; yalnız Stun kartında ikinci durum Slow ya da Wound arasında rastgele. Düğüm metni ve kart başlığı hâlâ "random" diyor; tasarım değişmedi, yalnız not edildi. Stun kartı oyuncu seçerse yine gelir (`ModeFx.secondExclude`).
- **Ağaç sürümleri / respec:** yalnız Gambler sürümü artırıldı (3 > 4; canlıdaki 3'e eşitti). Warrior 3, Archer 3, Mage 8, Hexer 2 canlıdaki sürümün (2, 2, 6, 1) zaten üstünde: aynı yayında bedava respec zaten gelir (r41 tur 4 kuralı).
- **Archer x1,05 yuvarlama:** 3 ondalık (Quick Shot 0,43995 > 0,44; Piercing 0,6342 > 0,634; Bleeding 0,11025 > 0,11; Arrow Rain 0,441; Aimed 1,6044 > 1,604).

## 596. r43 ölçüm turu varsayımları (2026-11-24, balance-tester, dal agent/r43-measure)
## 627. r43 ölçüm turu varsayımları (2026-11-24, balance-tester, dal agent/r43-measure)
- **Druid Stun ayrımı yöntemi:** Stun yalnız simde, `data/skill-trees/druid.json` 4.u3'ten `{status: stun}` girdisi geçici silinerek kapatıldı, koşudan sonra `git checkout` ile geri alındı (commit yok). `--only=druid` tek sınıf ağaçlı kip kullanıldı: sayılar r42'nin tüm takım ağaçlı +35,4 / +17,5'iyle karşılaştırılmaz. Hasar payı = Stun'sız - ult kapalı, Stun payı = tam - Stun'sız; 412 savaşta ±~5 (kesin pay için 2 x 3000).
- **Conclave counterCost 0,4:** Ömer seçimi A (form r43) uygulandı; tam set genel +1,4 (bantta) ama Druid +5,8 üstünde, Mage -3,75 altta: sınıf düzeltmesi (Mage satırı) Ömer / Lead kararı.
- **Büyük ölçüm hata payı:** sınıf farkı ± eşsiz iki oran farkı (%95, 1,96 sigma); "açıkça dışında" = fark ± pay bandın tamamen dışında.

## 597. r44 / r45 denge turu varsayımları (2026-11-25, balance-tester, dal agent/balance-r41-aksam)
## 628. r44 / r45 denge turu varsayımları (2026-11-25, balance-tester, dal agent/balance-r41-aksam)
- **Double Deal YZ:** yalnız Double Deal'de (biçimde ikinci durum kalınca) değer seçilen kartın tanımıyla; yalnız Stacked Deck eskisi gibi rastgele tanımla. Kart seçim kuralı (`statusModePick`) değişmedi: Double Deal'de Slow ve Wound kartı aynı çifti verir, şifacı kuralı farksız. Stun kartının "yalnız ilk hedef" ayrımı değerde yok (Stun yalnız tek düşman kalınca seçiliyor).
- **Falling Oak "ilk Treant":** hak çağıran Druid başına, savaşta bir kez (iki Druid ayrı hak). Treant ölüp yeniden çağrılınca da Stun yok. Ağaç sürümü artırılmadı (rank yapısı aynı; canlıdaki sürümle karşılaştırılmalı). YZ arrive tetiklerini hiç değerlemiyor (önceden de), ilk Treant'ın Stun değeri 0: ayrı iş.
- **Raise Dead 36 MP:** Ömer seçimi uygulandı, ama Undead L1 havuzu 35: L1'de kullanılamıyor (L2'de tam havuz gerekir). Testler gevşetilmedi; karar bekliyor (öneri: 35 ya da K2 = 34).
- **Paladin / Undead aynı koşuda ölçüldü** (sınıf başına etkiler birbirine karışık). Defender D2 ve Falling Oak 2 x 1000: etkiler gürültü içinde; kesin karar 2 x 10.000.
- **Conclave Mage:** "önce" r43 `c04` koşusu (aynı veri tabanı; Druid / Undead / Vesper sonuçları savaş savaş aynı çıktı) yeniden koşulmadı.

## 598. Eksi düz taban (düz taban + ölçek, 2026-11-25, engine-dev, dal agent/balance-r41-aksam)
## 629. Eksi düz taban (düz taban + ölçek, 2026-11-25, engine-dev, dal agent/balance-r41-aksam)
- **Ömer örneği "15 + INT'in %0,9'u" artı taban;** artı taban düşük level'ı oransal güçlendirir, yüksek level'ı zayıflatır. Undead'de istenen ters yön (L1 aynı / düşük, L20 güçlü), bu yalnız oran artıp taban EKSİ olunca olur (ör. "INT'in %100'ü - 9"). Varsayım: biçim aynı, işaret serbest. Kart "Damage 100% INT - 9 (17)" yazar. Eksi taban çok düşük statlı kullanıcıda vuruşu `minDamage` (1) yapabilir; bugün Wail / Bone Throw'u yalnız Undead (ve Pose Tester) kullanıyor.
- **Ağaç yüzde yamaları düz tabanı da çarpar** (Deeper Cut +%6,5, Bitter Gift -%25: skill'in tüm hasarı). Düz "+X power" (add) yamaları yalnız oranı değiştirir.
- **Şifa / zemin / DoT için düz taban yok;** ilk ihtiyaçta aynı biçimle eklenir.

## 599. r49 r48 seçimleri uygulama varsayımları (2026-11-26, balance-tester, dal agent/balance-r48-uygula)
## 630. r49 r48 seçimleri uygulama varsayımları (2026-11-26, balance-tester, dal agent/balance-r48-uygula)
- **Butcher's Cross (Cutthroat 2.v) 0,35 > 0,264:** düğüm Saltire Cut gücünü sabitliyor (op set); düz taban (2,5) sabitlemeden etkilenmediği için düğümün -%22 bedeli kayboluyordu. 0,264, DEX 41-47 arasında aynı -%22'yi verir; metin "power 0.354 to 0.264". Cutthroat ağaç sürümü 2 > 3 (bir kez bedava sıfırlama). Ömer onayı bekler.
- **Conclave 4 parça ceza kalktı (KURAL KALDIRILDI, Ömer 2026-11-26 form r49: "set üst bonusunun bedeli olsun" kuralı yok, test silindi; aşağıdaki "genel olarak kalıyor mu" sorusu cevaplandı: kalmıyor):** "her setin üst eşiği bir ödünleşme taşır" kuralı (Lead 2026-11-07) Ömer'in r48 seçimiyle Conclave için bozuldu; test istisna yazıldı. Stormhall'da da zırh cezası kalktı (o set testin kapsamında değil). Kural genel olarak kalıyor mu, Ömer'e sorulur.
- **White Heat ölçüldü, uygulanmadı:** önceden yazılan kural "Mage +30 üstündeyse ve kesme banda yaklaştırıyorsa". Mage paketle +28,1, kesmeyle +27,9.
- **Set ek denemeleri geri alındı:** Odran boost 1,7 / 2,0, Almoner boost 1,6, Conclave 2 parça MP 30 (ham `r49/denge-uygula-ham`). Veri Ömer'in r48 değerlerinde.

## 600. Equip best set boost payı 0,25 (2026-11-26, engine-dev, dal agent/equip-best-r49)
## 631. Equip best set boost payı 0,25 (2026-11-26, engine-dev, dal agent/equip-best-r49)
- Varsayım: Equip best set parçasının boost fazlasını yalnız %25 sayar (`data/items.json > setValue.boostWeight` 0,25). Gerekçe: r49 savaş ölçümünde boost'lu setler (Conclave, Odran, Almoner) Epic'ten kötü, Equip best ise onları çoğunlukla seçiyordu. 0,25 tek küresel değer: 0,2-0,35 taraması içinde Conclave / Almoner / Odran (Gambler dışı) %50 altına inen, Gambler'ı Odran'da en çok seçen yuvarlak değer. Yalnız seçim; savaş gücü değişmez.
- Yan etki: savaşta eşit çıkan Wayfarer (%34-75 > %5-11) ve Gallows (%11-23 > %0-4) daha az seçilir.
- Açık soru: Gambler + Odran (savaşta +8) ve Paladin + Ashguard (+2,9) için sınıfa özel değer istenir mi? Sim sonucundan sınıf sabiti uydurmak bir sonraki denge turunda eskir; önerilmedi.

## 601. r50 Hexer Doom sabit taban varsayımları (2026-11-26, balance-tester, dal agent/hexer-doom-r49)
## 632. r50 Hexer Doom sabit taban varsayımları (2026-11-26, balance-tester, dal agent/hexer-doom-r49)
- B seçeneği (yığın başı 2,704 + %27,6 Luck) hesaplanırken L20 Luck 41 alındı (L20'de -%10 diye). Gerçekte L20 Hexer Luck 49 (26 + 23 stat puanı): L20 Doom yığın başı 18,62 > 16,228, **-%12,8**. Ölçüm hedefte çıktığı için B bırakıldı, C denenmedi.
- Codex (Wiki) oranı tam sayıya yuvarlıyor: "2.704 + 28% of the curser's Luck" (gerçek %27,6). Skill ipucu ve sayılar tam değeri kullanıyor. Codex yuvarlaması değiştirilmedi.
- Ölçüm 300 savaş x 2 seed grubu: Hexer L20 eşli farkı -3,6 puan; mutlak değer için ± ~4,7 gürültü. Büyük doğrulama (2 x 10.000) yapılmadı.

## 602. r51 Odran C "kutsal ateş" uygulama varsayımları (2026-11-26, balance-tester, dal agent/odran-c-r50)
## 633. r51 Odran C "kutsal ateş" uygulama varsayımları (2026-11-26, balance-tester, dal agent/odran-c-r50)
- Censer hiç değişmedi (HP yenilenme + Kutsal direnç + Büyü zırhı; C metninde HP yenilenme anılmıyordu, "savunması kalır" diye okundu).
- Ring: Max MP çıktı, sıra C + B + A (MP yenilenme, MP bedeli, Elemental damage). Şablon istisnası yalnız `odrans_ring` için kodda (`SET_TIER_EXCEPTION`); başka set parçasına A konursa doğrulayıcı reddeder.
- Reliquary: Alınan şifa çıktı, DoT damage girdi (Kalkan gücü + Hazır kalkan kaldı).
- 2 parça: MP yenilenme 2,5 kaldırıldı; Potency yalnız güç olarak 0,15 (DoT çarpanı). Potency affix'inin "+1 tur debuff" kısmı EKLENMEDİ (süre kuralı).
- Tek ayar: Ring'deki Elemental damage boost 1,3 > 1,1 (+3,5'ten -0,333'e). Ölçüm n=600 (±5), bant kararı 2 x 1000 ister; Lead seçenek: 1,2 (ölçülmedi) ya da 1,3 (+3,5).

## 634. r51 set dengesi kapanış varsayımları (2026-11-26, balance-tester, dal agent/sets-final-r51)
- Karar kuralı: set yalnız ortalama 0..+3 dışında VE en yakın kenara uzaklık ± gürültüden büyükse düzeltildi; Ashguard -2,45 ±2,9 ve Conclave -1,70 ±2,3 "gürültü içinde" sayılıp dokunulmadı.
- Almoner boost 1,733: mevcut en yüksek set boost'u (Ember Mitts) tavan kabul edildi; 2,0 denemesi (-0,25) bu yüzden seçilmedi.
- Almoner son değer iki aday (boost 1,733 + büyü zırhı 15 / MP 3 ve büyü zırhı 20 / MP 4) arasından küçük olanı; ikisinin farkı gürültü içinde, 4 seed grubu ortalaması -0,375 / +0,30 (önce -3,025).
- Seçim aynı seed'ler üzerinde birçok aday arasından yapıldı; taze seed doğrulaması (eşli -1,95 > +1,30) bu yanlılığı dengelemek için eklendi.

## 635. Equip best set seçimi kapanış varsayımları (2026-11-26, engine-dev, dal agent/equip-final-r51)
- Hedef bandı Lead varsayımı: savaşta Epic ile eşit set (r51'de 9 setin hepsi) için tam set seçim payı sınıf ortalaması %25-85; Equip best savaş değerini bilemez, "makul oran" = yazı tura civarı. Test bu bandı denetler.
- `fitShare` 0,75: set parçasının sabit affix'i sınıfa uymasa da set savaşta bütün olarak Epic'e eşit ölçüldü (Odran'da uyum sırası savaş sırasının tersiydi: Hexer en çok, Gambler en az seçiyordu). Uymayan affix tümden bedava sayılmaz (Anti-Mage MP affix'leri gerçekten işe yaramaz); 0,75 Gambler'ı diğer orb sınıflarının bandına getiren en küçük değer (0,5: Gambler %29, Druid %45).
- `ruleIPBy`: kural başına değer, tam seti Epic ile eşit puana getirecek kadar (savaş ölçümü ~0). Sınıfa özel değil, set kuralına özel; denge turu set sayılarını değiştirirse yeniden ölçülmeli (test bandı kırılır).
- Kingsfall seçimi ~%100 kaldı: stat bonusu puanı zaten yüksek, kural değeri eksiye inmesin diye dokunulmadı (savaşta +0,35, bantta).
- Gerçek sayılan sınıf sinyalleri yalnız tekrar edenler: Odran Gambler artı, Odran Druid en zayıf, Almoner şifacı > şifacı olmayan. Diğer sınıf uçları (±10) gürültü sayıldı. Druid Odran'ı ayıran genel kural yok (%43).
- Ölçülmedi: Odran'da 2 parça + Epic ring (Equip best %67-91 oranında 2+ parça seçiyor).
