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
