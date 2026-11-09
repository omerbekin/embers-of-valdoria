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
- 62 hc_ düğümünün hepsi gerçek sınıfta. Bilerek aynen: hc_29/hc_35 adsız Deep Runecaller, will_o_wisp, weir_eel.
- Sanat: 11 mob kendi sprite'ı, 101 ikon, 78 VFX, yeni harita arka planı; kasabalar Ömer onaylı (Hearthstead, Kharduin).
- Ses: Harita 3'te ödünç ses yok; seviyeler ÖLÇÜLMEDİ (medyan ~0,127 RMS; yöntem `docs/arch/sims-and-deploy.md` ve sessiz tarayıcı betiği).

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
- **Diyalog cevapları:** veride `"reply"` olarak; Ash on the Wind hayatta kalanlar ve iki warden sorusu bilerek AÇIK.
- **Harita 2-3 planı onaylı** (2026-10-20): Drowned Reach, Hollow Crown (86 düğüm, 4 boss), iki taç hikâyesi; plan ve sayılar `docs/design/campaign/maps-2-3.md`, geçerli sayı `data/campaign/*.json`. Hero Oath Harita 3'te de bozulabilmeli.
- **Sim:** düz sefer simi KALIR (kasmasız taban); hedef ölçü kasma simi. Sim hedefleri ve ekonomi seçimleri (repeat=off, tüccar ve düşüşler kalır, dinlenme +%25): `docs/design/campaign/` ve `data/campaign/balance.json`.
- **Sefer eğrisi (Ömer 2026-11-01):** her katılımdan sonra kolay, sonra sertleşir (Ashford +1 kahraman, Valdren +1, 4. kahraman King's Bridge zaferinden sonra). Harita 2 hafif kolay başlar.
- **Harita 3 kuralları:** Chilled + 2. skill = Frozen (1 tur kayıp, ateş çözer, boss bağışık); Chill Ground, hava ve pasifler yalnız Chilled verir. Hareketli yakın dövüş mobları (Clan Vaulter, Shardwalker, Hollow Delver, Gloamstalker, Cinderleaper, Slagcart Golem) her biri YZ değeri + testiyle.
- **Tutorial reworku:** tek kahramanla başlangıç (Warrior, Defender, Paladin, Druid); belge `docs/design/tutorial.md`.
