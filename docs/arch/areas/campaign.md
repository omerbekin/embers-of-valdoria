# Alan: Campaign (sefer, Harita 1-3)

Sahip (eski): Campaign sohbeti. Kapsam: sefer haritaları, düğümler/karşılaşmalar, mob kitleri (Harita 2-3), elit/boss, kasaba/harita sanatı, mob sesleri, sefer dengesi.

## Kurallar
- Harita 3 (Hollow Crown) bayrağı KAPALI: `data/campaign/campaign.json > mapFlags > hollow-crown`. Açmayı yalnız Ömer söyler; açılış değişikliği ayrı tutulur, ready'ye girmez.
- Harita 3 çarpanları `campaign.json > mapEnemyScale["hollow-crown"]`, 2 tur simle ayarlı (2026-11-03). Mob kuralı: ilk skill bedava, diğerleri L30'da 5-6 kullanımda MP bitirir (`tests/map3-mana.test.ts`).
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
5. Harita 3'ü açmadan önce: yeni oyuncu haritaya ulaşıyor mu, kayıt/ilerleme, 3 ekran boyutu, tutarlılık, tam test. Karar Ömer'in.

## Tuzaklar
- Push-queue yama notu: en çok 8 satır, satır başı 140 karakter; aşan not gönderimi sessizce durdurur.
- `.webp` PNG'siz `WEBP_DIRS` altında yetim sayılır (`tests/webp-assets.test.ts`).
- `tests/mobs.test.ts`: artOf'lu skill sesi kaynakla aynı olmalı, kendi mob sesi olan skill hariç.
- Mob sesi her skill'e özel adlı olmalı (`tests/mob-sfx.test.ts`); `skills.json` sfx[0] başlangıçta, kalanlar vuruşta çalar.
- VFX import `assets/mob-vfx/*.json` satır sonlarını değiştirir (içerik aynı); tam test, makine yüklüyken zaman aşımı verebilir (item-tip-hide, map2-leaders tek başına geçer).
- Paralel Codex imagegen bir kez yanlış görseli kopyaladı: üretimleri md5 ile karşılaştır, en çok 2 paralel.
- Makinede aynı anda tek sim/yakalama; tarayıcı yakalaması CPU'yu yer, zaman aşımı koy.

## Dosya yolları
`data/campaign/{campaign,hollow-crown,hollow-crown-encounters}.json` · `data/mobs/*.json`, `data/bosses/*` · `data/skills.json` · `data/audio-mobs.json` · `src/game/mob-vfx.ts`, `mob-vfx-hand.ts` · `src/sim/campaign*.ts` · `src/campaign/maps23-debug.ts` · `docs/design/campaign/maps-2-3.md`, `map3-art-status.md` · `docs/balance.md` (Harita 2 eğrisi) · `assets/campaign/hollow-crown-bg*.webp`

## Agent buradan başlar
`docs/design/campaign/maps-2-3.md` (karar tabloları) + `map3-art-status.md`; sim için `docs/balance.md` "Harita 2 eğrisi" ve `src/sim/campaign-grind-report.ts` başlığı (bayraklar). Sim koşu komutu: `npm run sim:campaign -- 300 1 medium good --map=drowned-reach --wall-cap=medium:10 --overgrind=0 --jobs=3 --json=<dosya>`.
