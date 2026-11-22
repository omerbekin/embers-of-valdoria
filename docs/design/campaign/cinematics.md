# Sefer hikâye sahneleri ve Harita 1 final sinematiği (metinler)
> **Ne için / Güncel mi (2026-11-08):** Sefer sahneleri metni ve Harita 1 finali. CANLI: veri `data/campaign/cinematics.json`, kod `src/campaign/cinematics.ts` var. Metinler oyunda.

Durum: UYGULANDI (metin 2026-10-23; oyunda). Veri: `data/campaign/cinematics.json`. Kod bağlantısı VAR (2026-10-23; aşağıda "Oyundaki bağlantı"). Ömer'in kararları: form https://claude.ai/artifact/CprM9eeoVef4RYd2VH52Ro (db `picks/main`), 2026-10-21. Final sinematiğin video planı: `docs/archive/design/campaign/morvane-cinematic-video.md` (video promptları, kullanılmadı; oyunda hareketsiz kareler var).

## Kurallar

- **Hafif ipucu:** Morvane sırrı açmaz (kafes, Tide, mahzen notu yok). Yalnızca tacın kırılmaması ve korlarının hâlâ parlaması sezdirilir. Bridge Warden de yalnızca "Ember kuzeydeki taca doğru çekiyor" diye sezdirir.
- **Konuşanlar:** `narrator` (anlatıcı), `leader` (bölük lideri; adı yok, oyunda sınıf adıyla görünür), portre anahtarları `bridge_warden`, `lord_morvane` (boss id + `assets/avatars/`), `merchant` (Odo; portresi `assets/avatars/merchant`, mob id'si yok).
- Yeni özel ad yok; satırlar kısa (en fazla ~160 karakter), oyuncu dokundukça satır satır ilerler; seçenek / likes yok.
- Metinde italik işareti yok; anlatıcı satırını italik gösterip göstermemek arayüzün kararı.

## Sahneler

| Anahtar | Tetik (bilgi) | Arka plan | Satır |
|---|---|---|---|
| `prologue` | sefer başı, bir kez | `border-road` | 4 (anlatıcı) |
| `bridge_fallen` | King's Bridge (9) zaferi | `kings-bridge` | 5 |
| `forward_camp` | Forward Camp (`camp`) ilk varış | `ember-road` | 5 |
| `morvane_meets` | Castle Morvane (12) savaştan önce | `castle-hall` | 4 |
| `morvane_falls` | Castle Morvane (12) zaferi | `cin_kneel`, `cin_lookup`, `cin_crown`, `cin_plain` | 5 + kapanış kartı |
| `first_fire_mend` | Harita 3 bitti, Mend seçildi | `cin_hearth_still`, `cin_kharduin_gate`, `cin_long_descent`, `cin_crownbearer` | 5 + kapanış kartı + jenerik |
| `first_fire_quench` | Harita 3 bitti, Quench seçildi | `cin_hearth_still`, `cin_kharduin_gate`, `cin_long_descent`, `cin_dark_hearth` | 5 + kapanış kartı + jenerik |

## Notlar

- **Giriş metni:** `campaign.json > texts.intro` içindeki oynanış talimatları ("Each stop is an encounter. Until Ashford the road runs one way...") sinematiğe girmedi; bugünkü yerinde (harita giriş kartı) kalır. Prologue yalnızca hikâye kısmını anlatır.
- **"A year":** prologue'daki "For a year now" final satırındaki "For the first time in a year" ile uyum için; lanetin süresi başka yerde geçmiyor.
- **Forward Camp arka planı:** düğümün kendi `battleBackground`'ı yok (bölge III varsayılanı `ashen-plain`); görev kuralı gereği `ember-road` seçildi.
- **Morvane karşılaşması:** son satır "Everything in Valdoria kneels to the ash in the end. So will you." savaş açılışındaki "Kneel before the ash." bandına bağlanır (aynı cümleyi tekrar etmez).
- **Kapanış kartı:** `campaign.json > texts.complete` ile birebir aynı.
- `cin_*` görselleri `assets/cinematics/` altındadır (örn. `cin_kneel.webp`); eksik olanda `castle-hall` / `ashen-plain` gibi yedek gösterilmesi bağlayan agent'ın işi.

## Oyundaki bağlantı (campaign-dev 2026-10-23)

- Görünüm: Ashford hikâye diyaloğu şeridi (`src/ui/story-dialog.ts`) + tam ekran sahne görseli katmanı (`src/ui/cinematic.ts`); ayrıntı `docs/arch/ui-and-stage.md` > Hikâye sinematiği. Başlık = tetik düğümünün adı (prologue: harita adı), ilerleme elmasları = sinematiğin toplam satırı.
- Tetik kuralı `src/campaign/cinematics.ts > dueCinematic`; her biri seferde bir kez (`done` listesinde `cinematic:<id>`, oynamaya başlarken yazılır; yenilgide son kayda dönülürken taşınır).
  - `prologue`: yeni seferde harita ilk açıldığında, "Choose your hero" penceresinden ÖNCE. Görüldükten sonra pencerede yalnızca oynanış cümleleri (`campaign.json > texts.introRules`, intro'nun son üç cümlesi birebir); hikâye cümleleri sinematiğe bırakıldı.
  - `bridge_fallen`: King's Bridge zaferinden sonra, ganimet (LOOT) ekranı kapanıp haritaya dönülünce (zafer -> sonuç ekranı -> ganimet -> sinematik -> harita).
  - `forward_camp`: Forward Camp'e varıp kartın Trade / Enter eylemiyle tüccar açılırken, tüccardan ÖNCE (kamp adımları bitmeden; bir kez).
  - `morvane_meets`: Castle Morvane'de "Start battle?" kartında Fight'a basınca, savaş sahnesine geçmeden hemen önce; yenilip tekrar girince oynamaz.
  - `morvane_falls`: Castle Morvane zaferinden sonra ganimet ekranı kapanıp haritaya dönülünce; dört sahne + kapanış kartı, sonra "Valdoria Conquered" penceresi. Kartı az önce gösterdiysek pencere `texts.complete` cümlesini tekrar etmez (yalnızca zafer / yenilgi sayısı).
- Eski kayıtlar: şema değişmedi. King's Bridge / Castle Morvane'yi geçmiş ve hâlâ o düğümde duran eski bir kayıt yüklenirse ilgili zafer sinematiği bir kez oynar.

## Oyun sonu (Ömer 2026-11-21 form r38-r39; campaign-dev, dal agent/campaign-dev-oyun-sonu)

- **Kural:** Harita 3 bitiş olayı Mend or Quench'in seçimi kayda yazılır (`CampaignState.crownChoice`, kayıt sürümü 15) ve kapanış sineması bu seçime göre dallanır. Seçimin başka mekanik etkisi yoktur (ödül, stat yok).
- Akış: Ember zaferi -> Mend or Quench olayı (seçim + sonuç penceresi) -> kapanış sineması (dalın başlığı: Mend "The Crownbearer", Quench "The Dark Hearth"; düzen Harita 1 finaliyle aynı: 4 sahne 1 / 2 / 1 / 1 satır + kapanış kartı) -> jenerik (`data/credits.json`, taslak) -> harita sonu kartı (düğmeler değişmedi: "Stay on the map", "Main Menu"). Jenerik yalnız sinemanın ardından gelir; yeniden yüklemede kart doğrudan açılır. Ana menü > Credits jeneriği her zaman açar.
- Tetik `mapComplete` (`map` + isteğe bağlı `crownChoice`); başlık verideki `title`. İlk üç sahne iki dalda aynı, son sahne ve başlık farklı; kapanış kartı = `hollow-crown.json > complete.text` (Harita 1 kuralı gibi).
- Sahne görselleri (2026-11-21, r41: bu beş `cin_*` anahtarının özel çizimi `assets/cinematics/` altında hazır, `_fallback` artık kullanılmaz; aşağıdaki metin eski planı anlatır): YENİ ÇİZİM DEĞİL: `cin_*` anahtarları `_fallback` ile var olan savaş arka planlarına düşer (`forge-heart`, `kharduin`, `snowline`, `border-road`, `ashen-plain`). Çizilecekler listesi bu beş anahtar; dosya `assets/cinematics/<anahtar>.webp` gelince kod değişmez.
- Harita sonu istatistik kartı her haritanın sonunda (Harita 1, 2, 3); başlık / metin haritanın `complete` alanından; sayılar `s.stats` = sefer toplamı (Harita 1 kartıyla aynı davranış). Harita 2'ye sinema yok.
- Eski kayıt: Mend or Quench'i bitirmiş sürüm 14 kaydında seçim `eventChoice`tan kurtarılır (son düğüm), kurtarılamazsa `mend`. Böyle bir kayıt yüklenince kapanış sineması + jenerik bir kez oynar.

