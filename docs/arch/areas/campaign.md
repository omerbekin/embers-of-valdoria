# Alan: Campaign (sefer, Harita 1-3)
> **Ne için / Güncel mi (2026-11-08):** sefer alanı canlı durumu, kararlar, açık işler. evet; veri sayıları data/campaign ile spot-kontrol edildi.


Kapsam: sefer haritaları, düğümler/karşılaşmalar, mob kitleri (Harita 2-3), elit/boss, kasaba/harita sanatı, mob sesleri, sefer dengesi.

## Kurallar
- Harita 3 (Hollow Crown) AÇIK (Ömer: "hepsi bitince aç"; Lead 2026-11-03): `data/campaign/campaign.json > mapFlags > hollow-crown`.
- Harita 3 çarpanları `campaign.json > mapEnemyScale["hollow-crown"]`, 2 tur simle ayarlı (2026-11-03). Mob kuralı: ilk skill bedava, diğerleri L30'da 4-5 kullanımda MP bitirir (Ömer 2026-11-07, 0.9.11 manası; önce 5-6) (`tests/map3-mana.test.ts`).
- Yeni kural/stat/mekanik: önce Ömer'e sor (Lead üzerinden). Motor kuralı ve zor denge işi Combat/Character Design alanına gider.
- "Tamamla" = ödünç yok: kendi sprite, ikon, VFX, ses. Harita 3'te artık hiçbir skill'de `artOf` yok.
- Kitlere her yeni skill için YZ değerlemesi (`data/ai.json > mobKit`) + test eklenir.
- Golden yalnız farkı açıkladıktan sonra yeniden kaydedilir (`npx tsx tests/golden/record.ts`).

## Durum (2026-11-08; ölçüm sayıları 2026-11-03)
- **Castle Morvane (2026-11-15, Tur 20-21; dal agent/balance-tester-hexer-morvane, gönderilmedi):** düğüm 12 çarpanları, eski -> r20 öneri -> r21 (veride): boss can 1,022 -> 0,65 -> 0,75, güç 0,565 -> 1,1 -> 0,93; eşlikçiler (2 Sworn Guard + Hierophant) can 0,624 -> 0,45 -> 0,5, güç 0,511 -> 0,75 -> 0,66. sim:campaign 240 1 medium good, ilk deneme / ort. tur / bitirme: eski %76,9 / 106 / %42,5; r20 %42,3 / 70 / %41,3; r21 %42,3 / 82 / %41,7. Düz model testi (campaign-balance, 120 sefer seed 7001) r21'de KIRMIZI: boss ilk %21,7 (alt sınır 24), bitirme %27,5 (alt sınır 30); sınır indirilmedi (Ömer r21). Deneme 2 (boss 0,75 / 0,82, eşlikçi 0,5 / 0,6): test yeşil ama sim ilk deneme %63,5 (bant 30-50 dışı), 84 tur; veriye konmadı. Güç 0,82-0,93 arası denenmedi; iki şartı birlikte tutan nokta orada olabilir (yeni sim Ömer onayıyla). Kasma simi ile düz test bu düğümde çelişiyor (açık iş 1 ile aynı desen).
- **Castle Morvane Tur 22 (2026-11-15, balance-tester; veri DEĞİŞMEDİ, r21 0,75 / 0,93 + 0,5 / 0,66 duruyor):** deneme 1 boss 0,75 / 0,90, eşlikçi 0,5 / 0,645: düz test boss ilk %21,7 KIRMIZI (King's Bridge 35/120 + Morvane 17/120 = 52/240; 24 için 58 gerekli, yani Morvane 23/120), bitirme %33,3 (40/120) YEŞİL. Güç 0,93 -> 0,90 Morvane ilk zaferini düz modelde hiç artırmadı (r21 de %21,7), yalnız bitirmeyi 27,5 -> 33,3 yaptı. sim:campaign 240 bu noktada koşulamadı: makine başka işlerle doluydu, düz test 80 dk sürdü, 1,5 saat süre bitti. Sıradaki deneme önerisi boss güç ~0,86 (0,82 yeşil / 0,90 kırmızı arası), önce düz test sonra sim. Ham çıktı scratchpad r22-denge/flat1.txt. Deneme 2 (boss güç 0,86, eşlikçi 0,62): düz test boss ilk %22,1 (53/240) KIRMIZI, bitirme YEŞİL. Deneme 3 (0,84 / 0,61): boss ilk %23,3 (56/240) KIRMIZI (24 için 58 gerekli), bitirme YEŞİL. Brief'teki en fazla bir ara değer sınırı doldu, sim:campaign koşulmadı, veri r21 değerine geri alındı. Eğri: 0,93 -> 52, 0,90 -> 52, 0,86 -> 53, 0,84 -> 56, 0,82 -> yeşil (sim %63,5, çok kolay). Sim bandı (%30-50) ile düz test alt sınırı bu iki eksenle aynı anda tutmuyor gibi; karar Lead/Ömer'de (ör. 0,83 dene ya da can çarpanı ekseni). Deneme 4 (Lead, 0,83 / 0,605, can 0,75 / 0,5 aynı): düz test YEŞİL (7/7); sim:campaign 240 1 medium good: Castle Morvane ilk deneme %57,7 (n=104, bant 30-50 DIŞI), 85 tur, bitirme %42,1, King's Bridge ilk %50,3. Veride 0,83 / 0,605 duruyor (commit ecfc7c7f); sim bandı tutmadığı için karar Lead/Ömer'de. Ham çıktı scratchpad r22-morvane/sim-083.txt.
- 62 hc_ düğümünün hepsi gerçek sınıfta. Bilerek aynen: hc_29/hc_35 adsız Deep Runecaller, will_o_wisp, weir_eel.
- Sanat: 11 mob kendi sprite'ı, 101 ikon, 78 VFX, yeni harita arka planı; kasabalar Ömer onaylı (Hearthstead, Kharduin).
- Ses: Harita 3'te ödünç ses yok; seviyeler ÖLÇÜLMEDİ (medyan ~0,127 RMS; yöntem `docs/arch/sims-and-deploy.md` ve sessiz tarayıcı betiği).

- Respec malzemeleri (2026-11-14): Tome of Unlearning / Draught of Rebirth; Supplies'ta dokun = kahraman seçme penceresi (`src/ui/supply-respec.ts`, harita penceresi kartları). Kaynak boss + elit (HER zaferde zar) + tüccar rafı (`supplies.ts > respecChance`, `merchant.ts > campaignSupplyStock`), test `tests/respec-supplies.test.ts`. Boyalı ikonlar var. Kurallar: Kararlar > "Respec malzemeleri". Onaysız iki madde open-questions Q-NEW.

## Açık işler (ölçüm sayıları 2026-11-03)
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

## Kararlar (geçerli kurallar; tam tarihçe `docs/archive/arch/areas/campaign.md`)
- **Castle Morvane (Ömer 2026-11-15 form r21):** boss can çarpanı 0,65-1,022, güç çarpanı 0,565-1,1 arasında (r20 önerisiyle eski arasında); ilk deneme %30-50 bandında kalır; son boss + 3 dalga olduğu için ortalama tur 70'ten biraz uzun olabilir; eşlikçi değerleri buna göre ayarlanabilir. campaign-balance test sınırları (boss ilk alt 24, bitirme alt 30) İNDİRİLMEZ.
- **2026-11-10 Ömer:** tüm Recruit pencereleri 4 aday sunar. **Ömer 2026-11-15 form r19:** istisna: "Choose a companion" (sefer başı yoldaş) penceresi seçilebilir TÜM kahramanları listeler (kesme yok, kaydırılır), önerilenler üstte + "Recommended" etiketi.
- **Ömer 2026-11-15 form r19 (harita yürüyüşü):** düğüme dokunmak yalnız kartı açar; yürüme kartın düğmesine (Fight / Enter / Rest...) basılınca başlar, varışta kısa kararıp açılma ile düğüme girilir (`data/ui-motion.json > nodeEnter`; savaş / devriye kendi geçişini kullanır). Kart gerektirmeyen düğümde (temizlenmiş, eylemsiz) yürüme hemen başlar. Bu, 2026-10-18 "dokununca hemen yürür" kararını değiştirir.
- **Witch's Hut "Pay her price" (Ömer 2026-11-15 r19):** 60 altına 1 item, KESİN Rare, %8 ihtimalle Epic (Ömer seçti). Sandık yolu aynı (malzeme zarı dahil); yalnız nadirlik sabit: `events.json > witchs_hut > pay > chestRarity`, kod `state.ts > chooseEvent` + `loot.ts > grantLoot` `rarity`; test `tests/campaign-choice-events.test.ts`. Blood seçeneği değişmedi.
- **Diyalog cevapları:** veride `"reply"` olarak; Ash on the Wind hayatta kalanlar ve iki warden sorusu bilerek AÇIK.
- **Harita 2-3 planı onaylı** (2026-10-20): Drowned Reach, Hollow Crown (86 düğüm, 4 boss), iki taç hikâyesi; plan ve sayılar `docs/design/campaign/maps-2-3.md`, geçerli sayı `data/campaign/*.json`. Hero Oath Harita 3'te de bozulabilmeli.
- **Sim:** düz sefer simi KALIR (kasmasız taban); hedef ölçü kasma simi. Sim hedefleri ve ekonomi seçimleri (repeat=off, tüccar ve düşüşler kalır, dinlenme +%25): `docs/design/campaign/` ve `data/campaign/balance.json`.
- **Sefer eğrisi (Ömer 2026-11-01):** her katılımdan sonra kolay, sonra sertleşir (Ashford +1 kahraman, Valdren +1, 4. kahraman King's Bridge zaferinden sonra). Harita 2 hafif kolay başlar.
- **Harita 3 kuralları:** Chilled + 2. skill = Frozen (1 tur kayıp, ateş çözer, boss bağışık); Chill Ground, hava ve pasifler yalnız Chilled verir. Hareketli yakın dövüş mobları (Clan Vaulter, Shardwalker, Hollow Delver, Gloamstalker, Cinderleaper, Slagcart Golem) her biri YZ değeri + testiyle.
- **Puan verme ve respec (Ömer 2026-11-14):** skill ağacında Confirm / Reset yok: düğümü basılı tut = 1 puan hemen (stat kutusuyla ortak `stat-hold.ts > attachHoldSpend`, süre `data/ui-motion.json > statHold`), verilen puan geri alınmaz. Seferde altınlı Respec düğmesi yok; sıfırlama yalnız Tome of Unlearning (ağaç) / Draught of Rebirth (stat). Şans ve fiyat item nadirlik / fiyat tablolarından türer (`data/consumables.json > _respec`). Endless altınlı Respec'i aynen kalır.
- **Respec malzemeleri (Ömer 2026-11-14, form r17):** adlar Tome of Unlearning (skill ağacı) / Draught of Rebirth (stat puanları), `data/consumables.json`. Şans item nadirlik tablosundan türer (`data/items.json > dropRarity`; boss = 'boss' kayması, tüccar = 'normal' zarı; Tome = rare ile epic ortalaması, Draught = epic); fiyat item fiyatından (Tome = rare/epic ortalaması, Draught = epic; `priceBase x (1 + 0,1 x ilvl)` x düğüm çarpanı). Tüccar her raf kurulumunda zarlar (ilk varış, günlük yenileme, parayla Reroll dahil). **Boss HER zaferde zarlanır (ilk zafer kuralı kalktı); ELİT her zaferde boss şansının yarısıyla** (`consumables.json > respecEliteMult` 0,5, boss şansından türer; iki malzeme ayrı zar); normal savaş / sandık vermez. **Yalnız CANLI kahraman kullanır** (düşmüş: kart soluk, "Fallen heroes can't use this."); kahraman başına sınır yok. Renk: Draught epic moru, Tome rare-epic karışımı (%70 epic). Endless'ın altınlı Respec'i aynen kalır. Testler `tests/respec-supplies.test.ts`.
- **Tutorial reworku:** tek kahramanla başlangıç (Warrior, Defender, Paladin, Druid); belge `docs/design/tutorial.md`.
