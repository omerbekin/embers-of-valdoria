# Sefer hikâye sahneleri ve Harita 1 final sinematiği (metinler)

Durum: METİN TASLAĞI (2026-10-23). Veri: `data/campaign/cinematics.json`. Kod bağlantısı VAR (2026-10-23; aşağıda "Oyundaki bağlantı"). Ömer'in kararları: form https://claude.ai/artifact/CprM9eeoVef4RYd2VH52Ro (db `picks/main`), 2026-10-21. Final sinematiğin video planı: `morvane-cinematic-video.md`.

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

## Notlar

- **Giriş metni:** `campaign.json > texts.intro` içindeki oynanış talimatları ("Each stop is an encounter. Until Ashford the road runs one way...") sinematiğe girmedi; bugünkü yerinde (harita giriş kartı) kalır. Prologue yalnızca hikâye kısmını anlatır.
- **"A year":** prologue'daki "For a year now" final satırındaki "For the first time in a year" ile uyum için; lanetin süresi başka yerde geçmiyor.
- **Forward Camp arka planı:** düğümün kendi `battleBackground`'ı yok (bölge III varsayılanı `ashen-plain`); görev kuralı gereği `ember-road` seçildi.
- **Morvane karşılaşması:** son satır "Everything in Valdoria kneels to the ash in the end. So will you." savaş açılışındaki "Kneel before the ash." bandına bağlanır (aynı cümleyi tekrar etmez).
- **Kapanış kartı:** `campaign.json > texts.complete` ile birebir aynı.
- `cin_*` görselleri/klipleri henüz yok; yoksa `castle-hall` / `ashen-plain` gibi bir yedek gösterilmesi bağlayan agent'ın işi.

## Oyundaki bağlantı (campaign-dev 2026-10-23)

- Görünüm: Ashford hikâye diyaloğu şeridi (`src/ui/story-dialog.ts`) + tam ekran sahne görseli katmanı (`src/ui/cinematic.ts`); ayrıntı `docs/arch/ui-and-stage.md` > Hikâye sinematiği. Başlık = tetik düğümünün adı (prologue: harita adı), ilerleme elmasları = sinematiğin toplam satırı.
- Tetik kuralı `src/campaign/cinematics.ts > dueCinematic`; her biri seferde bir kez (`done` listesinde `cinematic:<id>`, oynamaya başlarken yazılır; yenilgide son kayda dönülürken taşınır).
  - `prologue`: yeni seferde harita ilk açıldığında, "Choose your hero" penceresinden ÖNCE. Görüldükten sonra pencerede yalnızca oynanış cümleleri (`campaign.json > texts.introRules`, intro'nun son üç cümlesi birebir); hikâye cümleleri sinematiğe bırakıldı.
  - `bridge_fallen`: King's Bridge zaferinden sonra, ganimet (LOOT) ekranı kapanıp haritaya dönülünce (zafer -> sonuç ekranı -> ganimet -> sinematik -> harita).
  - `forward_camp`: Forward Camp'e varıp kartın Trade / Enter eylemiyle tüccar açılırken, tüccardan ÖNCE (kamp adımları bitmeden; bir kez).
  - `morvane_meets`: Castle Morvane'de "Start battle?" kartında Fight'a basınca, savaş sahnesine geçmeden hemen önce; yenilip tekrar girince oynamaz.
  - `morvane_falls`: Castle Morvane zaferinden sonra ganimet ekranı kapanıp haritaya dönülünce; dört sahne + kapanış kartı, sonra "Valdoria Conquered" penceresi. Kartı az önce gösterdiysek pencere `texts.complete` cümlesini tekrar etmez (yalnızca zafer / yenilgi sayısı).
- Eski kayıtlar: şema değişmedi. King's Bridge / Castle Morvane'yi geçmiş ve hâlâ o düğümde duran eski bir kayıt yüklenirse ilgili zafer sinematiği bir kez oynar.
