# Alan: Campaign (sefer, Harita 1-3)
> **Ne için / Güncel mi (2026-11-08):** sefer alanı canlı durumu, kararlar, açık işler. evet; veri sayıları data/campaign ile spot-kontrol edildi.


Sahip (eski): Campaign sohbeti. Kapsam: sefer haritaları, düğümler/karşılaşmalar, mob kitleri (Harita 2-3), elit/boss, kasaba/harita sanatı, mob sesleri, sefer dengesi.

## Kurallar
- Harita 3 (Hollow Crown) AÇIK (Ömer: "hepsi bitince aç"; Lead 2026-11-03): `data/campaign/campaign.json > mapFlags > hollow-crown`.
- Harita 3 çarpanları `campaign.json > mapEnemyScale["hollow-crown"]`, 2 tur simle ayarlı (2026-11-03). Mob kuralı: ilk skill bedava, diğerleri L30'da 4-5 kullanımda MP bitirir (Ömer 2026-11-07, 0.9.11 manası; önce 5-6) (`tests/map3-mana.test.ts`).
- Yeni kural/stat/mekanik: önce Ömer'e sor (Lead üzerinden). Motor kuralı ve zor denge işi Combat/Character Design alanına gider.
- "Tamamla" = ödünç yok: kendi sprite, ikon, VFX, ses. Harita 3'te artık hiçbir skill'de `artOf` yok.
- Kitlere her yeni skill için YZ değerlemesi (`data/ai.json > mobKit`) + test eklenir.
- Golden yalnız farkı açıkladıktan sonra yeniden kaydedilir (`npx tsx tests/golden/record.ts`).

## Durum (2026-11-02)
- 62 hc_ düğümünün hepsi gerçek sınıfta. Bilerek aynen: hc_29/hc_35 adsız Deep Runecaller, will_o_wisp, weir_eel.
- Sanat: 11 mob kendi sprite'ı, 101 ikon, 78 VFX, yeni harita arka planı; kasabalar Ömer onaylı (Hearthstead, Kharduin).
- Ses: Harita 3'te ödünç ses yok; seviyeler ÖLÇÜLMEDİ (medyan ~0,127 RMS; yöntem `docs/arch/sims-and-deploy.md` ve sessiz tarayıcı betiği).

## Açık işler
1. Harita 2 boss ayarı 2 turla bitti (Lead 2026-11-03; hasar Weir Mouth 1,79, Gallows 1,45, Throne 1,75). Sonuç 300 savaş: ilk deneme %59 / %64 / %52 (hedef %30-50), bitirme %57,4 (hedef %60-75, hata payı ±6), boss kasma 2,80. İki hedef çelişiyor: boss sertleşince bitirme düşüyor. Çözüm boss hasarından değil, düğümlere yayılmış duvarlardan gelir.
2. Harita 3 simi (300, 2. tur): bitirme %62,2, boss kasma 3,30, ilk deneme boss %62 / %78 / %70 / %87, hc_12 %91 civarı. Son iki boss hâlâ kolay; Harita 3'e 300 koşudan 135'i ulaşıyor.
3. Oathkeeper zırhı, Rime Bite/Ice Shot chill şansı, Frost Bite cooldown, Reedgate Trinket: sim bunları ayrı göstermedi, eğri çarpanla tutuldu; değiştirilmedi.
4. Gözle/kulakla doğrulama yapılmadı: 78 VFX konum/boyut (`data/battle-layout.json > animation.mobVfx.skills`), ses seviyeleri, yeni haritada düğümlerin yola oturması.
5. Açılış kontrolü geçti: Harita 2 sonundan geçiş, kayıt + yeniden yükleme, haritanın sonu, build. Bakılmadı: gerçek savaşlar (yürüyüş otomatik çözüldü), Kharduin, haritanın tamamında düğüm-yol hizası. Telefonda Hearthstead'de Barracks ve Old Ketil yazıları hafif üst üste biniyor.

## Tuzaklar
- Push-queue yama notu: en çok 8 satır, satır başı 140 karakter; aşan not gönderimi sessizce durdurur.
- `.webp` PNG'siz `WEBP_DIRS` altında yetim sayılır (`tests/webp-assets.test.ts`).
- `tests/mobs.test.ts`: artOf'lu skill sesi kaynakla aynı olmalı, kendi mob sesi olan skill hariç.
- Mob sesi her skill'e özel adlı olmalı (`tests/mob-sfx.test.ts`); `skills.json` sfx[0] başlangıçta, kalanlar vuruşta çalar.
- VFX import `assets/mob-vfx/*.json` satır sonlarını değiştirir (içerik aynı); tam test, makine yüklüyken zaman aşımı verebilir (item-tip-hide, map2-leaders tek başına geçer).
- Paralel Codex imagegen bir kez yanlış görseli kopyaladı: üretimleri md5 ile karşılaştır, en çok 2 paralel.
- Makinede aynı anda tek sim/yakalama; tarayıcı yakalaması CPU'yu yer, zaman aşımı koy.

## Dosya yolları
`data/campaign/{campaign,hollow-crown,hollow-crown-encounters}.json` · `data/mobs/*.json`, `data/bosses/*` · `data/skills.json` · `data/audio-mobs.json` · `src/game/mob-vfx.ts`, `mob-vfx-hand.ts` · `src/sim/campaign*.ts` · `src/campaign/maps23-debug.ts` · `docs/design/campaign/maps-2-3.md`, `docs/archive/design/campaign/map3-art-status.md` · `docs/balance.md` (Harita 2 eğrisi) · `assets/campaign/hollow-crown-bg*.webp`

## Agent buradan başlar
`docs/design/campaign/maps-2-3.md` (karar tabloları) + `docs/archive/design/campaign/map3-art-status.md`; sim için `docs/balance.md` "Harita 2 eğrisi" ve `src/sim/campaign-grind-report.ts` başlığı (bayraklar). Sim koşu komutu: `npm run sim:campaign -- 300 1 medium good --map=drowned-reach --wall-cap=medium:10 --overgrind=0 --jobs=3 --json=<dosya>`.

## Kararlar (hafızadan taşındı 2026-11-08)
Lead hafızasından taşındı; değiştirilmemiş tam metinler `~/.claude/projects/C--Users-Omer-Projects-embers-of-valdoria/memory/archive/2026-11-08/` (dosya adı parantezde).
- **Diyalog cevapları** (Ömer 2026-10-31 yedi taslağı aynen onayladı + Form 7 ile son tablodaki 6 seçenek): `data/` içinde `"reply"` olarak; taslak `docs/archive/design/dialogue-replies-draft.md`. Ash on the Wind hayatta kalanlar ve iki warden sorusu bilerek AÇIK (Ömer 2026-11-01).
- **2026-10-20 Harita 2-3 planı onaylı** (form SfCQKJLkNNJuuxUGJG2P2h): Drowned Reach 83 düğüm 3 boss (plan; bugün veride 92 düğüm, 3 boss), Hollow Crown 86 düğüm 4 boss, iki taç hikâyesi, Mend/Quench sonu, M-A..M-Q mekaniklerinin hepsi, Kindling = hasar sürümü, sanat TAM. Hepsi `docs/design/campaign/maps-2-3.md`. Harita görünümü `public/mockups/maps-2-3.html` (#v0 onaylı; düğüm = oyunun düz rozeti, parıltısız; yollar yumuşak çift çizgi, hub kolu %8 sapma). 0.9.9 (2026-10-27) Harita 2 + ekonomi ile main'e ve canlıya girdi. (maps-2-3-form)
- **Hero Oath** Harita 3'te de bozulabilmeli (ör. bir kasabada), Ömer 2026-10-27; open-q 429. (maps-2-3-form)
- **Sim hedefleri, Ömer seçimi 2026-10-19** (form KBEMqciwKNJowMtJTuCM4G, db simhedef/main): retry 2; kasma en verimli düğümde (level x kalan ödül, yol bedava); duvar tavanı Easy 5 / Medium 10 / Hard 20 kasma savaşı; stat iki vekil (akıllı + eşit); Blacksmith her zaman; normal ilk deneme %75-90; elit 1-2, boss 3-5 kasma (sonra sefer eğrisiyle 2-3 / 3-4 oldu); kasma payı %10-20; kalan HP %40-60; ortalamanın 2 katı uzun savaş işaretlenir; Easy kasma istemez, Hard = 2x Medium (Hard boss 6-10); ortalama oyuncu +%50 kasmaya kadar; duvar = koşuların >%10'u tavana takılırsa; takım farkı >2x işaret; aşırı kasma koşusu eklenir. (campaign-sim-targets-form)
- **Düz sefer simi KALIR** (open-q 427, Ömer 2026-11-01, aynı gün geri döndü: "ilk seferde win rate de bir şeyler anlatıyor"): kasmasız taban; hedef ölçü kasma simi. Bir daha hatırlatma yok. (fast-balance-steps, campaign-channel-handoff)
- **Ekonomi seçimi 2026-10-20** (form PqiEN1trSpyNSQGCGhcNeN, db ekonomi/main): repeat=off (item+altın; XP düşüşü aynen), tüccar kalır, düşüşler kalır, dinlenme +%25 (6+13 x bölüm), sim varsayılanı satış, valor=simfirst. Ömer hedefi: kasma item alacak altın kazandırsın; kasılmış level + item kahramanı devam ettirecek güce getirsin. Level değerini Ömer'in hazırladığı SKILL AĞACI çözer: level eğrisine/puanlara dokunma. Açık: a) devriye altını artsın mı, b) Temper ucuzlasın mı. Kaldıraç simi (300): taban duvar %15,3, +2 level %14,3, +2 ilvl %6,3, +300 altın %10,0; devriye yaklaşık 8 altın. (economy-form)
- **Harita 1 reworkü** 0.9.7'de gitti (plan `docs/archive/design/campaign/map-1-rework.md`, open-q 384). Açık kalanlar (2026-10-24'te bitmemişti, sonrası doğrulanmadı): Deserter Captain sprite'ı kurulu ama savaş hâlâ Bandit Chief çiziyor (birim başına sprite anahtarı gerek, `EncounterUnit.sprite` verisi hazır); karşılaşma çarpanları + hazine ganimeti geçici, sim cepleri oynamıyor; 2580 genişlikte geniş sanatın yanında ~30 px bulanık kenar (Ömer'e sorulmadı). (map1-rework-done)
- **Harita 3 mekanik seçimleri 2026-10-28** (form 5pUJW2mHvhZkdQAgV3FuBo): seçildi A1 Shocked, A2 Live Water, A4 Iron Draws the Bolt (yalnız etiketli skill), A5 Thunderflash, A6 Shatter, B1 Eye of the Storm (D2 pasifi), B2 Thunder Rod, C1 Rolling Thunder, C2 Encased, C5 Wake the Halls, C6 Tempering, D1 Thunderwright, D2 Clan Stormcaller, D3 Gloam Eel, D4 Stormhorn Ram, E1-E6. Seçilmedi: A3, B3, B4, C3, C4, C8. C7 Stolen Moment mob değil, oynanabilir karakter fikri (future-ideas). Ember Hierophant / Cinder Gatewarden elit hâllerinden önce sıradan mob; Long Sermon yalnız hasar eşiğiyle kırılır. Sayılar geçici. (map3-mechanics-picks)
- **Harita 3 hareketli yakın dövüş mobları 2026-10-31** (form 69BeLg5cwzKWnrvBSZHjsS): Clan Vaulter, Shardwalker, Hollow Delver, Gloamstalker, Cinderleaper, Slagcart Golem (Hearth Spark değil). Bölge başına ~2 düğüm, 1-2 elit savaşta da; Shardwalker Chilled veren mobların yanında. Her mob YZ değeri + testiyle. (map3-melee-form)
- **Sefer eğrisi, Ömer 2026-11-01:** her katılımdan sonra kolay, sonrakine sertleşir (Ashford +1 kahraman, Valdren +1, 4. kahraman King's Bridge zaferinden sonra; Harita 1'de 2 kasaba var). Harita 2 hafif kolay başlar, sonra oturur. Medium iyi oyuncu kasma hedefi: elit 2-3, boss 3-4 ("aklımda başka bir plan var", söylemedi, açık); kasıp geçen koşular üzerinden sayılır, duvarlar %10 sınırıyla ayrı. Tek kahraman ilk deneme: Windy Moor, Brackenridge 80+, Cairn Hill 75+. Sim ilk deneme hedefleri: Grave 85, 8A 75, Cathedral 62, Bridge 45-50, Ashen 85, Thornwood 75, Ember 84. Harita 2 iyi oyuncu bitirme %60-75. Sim oyuncusu: kahraman Inn'deyken eksik takımla kolay düğüm oynar, iyileşeni alır, döner. Ayar mob HP + hasarıyla, stat/XP/ganimetle değil. Raporlarda sayıları açık etiketle. (campaign-curve)
- **Tutorial reworkü** (formlar 8rt1i45hA6kExa2gAXxnY4, 2. tur 7UAfkNTXuaGfVhHLEyFf3N): seçimler A3, C1, C2, C4, C5, C6, D1, D2, D4; tek kahramanla başlangıç (Warrior, Defender, Paladin, Druid; Archer yok), Suggested üstte serbest seçim, katılım Ashford 1 / Valdren 1 / King's Bridge boss 1, skill açılış sırası Ömer'in notuna göre, mob sayıları aynı, hasar+HP tek kahramana; Skip tutorial KALKTI; eski kayıtlar eski yapıda; veda sahnesi yok; "Garrick's notes" reddedildi. Garrick önerileri: Warrior Knee Cutter/Strength, Archer Hock Shot/Dexterity, Defender Bellow/Strength, Paladin Relentless Hammer/Intelligence, Druid Hooked Barbs/Intelligence. 0.9.10.9 ile gitti. Kurallar `docs/design/tutorial.md`. (tutorial-rework-form)
- **Harita 3 kuralları, onaylı 2026-10-31:** Chilled + 2. skill = Frozen (1 tur kayıp, sonra Chilled gider, ateş çözer, boss bağışık); Chill Ground, hava ve pasifler yalnız Chilled verir; Blizzard = her Round işaretli bir sıra 2 tur Chill Ground + menzilli isabet -%15. Ömer Chilled yığını + Numb'ı reddetti ("komple yanlış"). Stone Oath: yemin = Deep Market indirimi + mühürlü mezarlar hc42/44/52; reddedilen: güçlü devriye, indirime para, ret için tek seferlik ganimet. Deep Market yalnız hc54 (fiyat x1,5, reroll x1,5, Common yok, yemin -%20, raf 9, tüccar Orvik Deepcoin). White Dark "Wait it out": sonraki savaş 2 tur Chilled başlar. (campaign-channel-handoff)
- **Eski açık sorular** (2026-10-31, doğrula): 6 palet mob (wight, rime_hound, clan_slinger, rime_witch, hollow_warden, molten_hound) bilerek mi: Ömer evet dedi, son söz yok; 448 Risen Skeleton (kendi pasif/sanat, elit tur, güçlü Grave Chanter iskeleti?); YZ doğal olarak neredeyse hiç Frozen üretmiyor (golden'da 335 savaşta 0). Temizlik artıkları: kilitli worktree'ler agent-a7f66937, agent-ab476293, agent-a68bb601 (önce junction), eski eov-push kopyası, `C:\c` klasörü, statuses.json'da ash_surge "2 tur" yorumu. (campaign-channel-handoff)
- Taşınan hafıza: maps-2-3-form, campaign-sim-targets-form, economy-form, map1-rework-done, map3-mechanics-picks, map3-melee-form, campaign-curve, tutorial-rework-form, campaign-channel-handoff.
