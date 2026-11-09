# Sefer (Campaign): geçerli kurallar
> **Ne için / Güncel mi (2026-11-08):** Sefer sisteminin bugün geçerli kuralları (akış, sis, serbest dolaşım, can/şifa, kayıt, gün/Inn/kamp, zorluk). Sayılar BURADA değil `data/campaign/`da. MVP v1-v5 tasarım tarihçesi (17 düğümlü eski Valdoria, 12 rota, ChatGPT prompt'ları, ajan işleri, ölçüm tabloları) arşivde: `docs/archive/design/campaign/campaign-mvp-v5.md`. Alan durumu ve açık işler: `docs/arch/areas/campaign.md`.

## Güncel durum
- **Harita 1-3 oynanır:** Valdoria (`valdoria.json`), The Drowned Reach (`drowned-reach.json`), The Hollow Crown (`hollow-crown.json`). Sıra ve bayraklar `data/campaign/campaign.json > maps` / `mapFlags` (ikisi `enabled: true`). Düğüm ve durak sayıları her haritanın kendi dosyasında (`nodes`, `stopsPerRun`). Özet: `maps-2-3.md`.
- **Modlar:** Normal ve Ironman (`CampaignMode`, `src/campaign/types.ts`). **Zorluk:** Easy / Medium / Hard.
- **Kayıt sürümü:** `SAVE_VERSION = 14` (`src/campaign/save.ts`; eski sürümler geçişle okunur).
- **Endless** ayrı mod; kodu `src/endless/` (`waves.ts`, `run.ts`); sim `npm run sim:endless`.
- Oyun içi metinler İngilizce, belgeler Türkçe. Sayıların çoğu PROVİZYON; denge `docs/balance.md > Sefer dengesi`.

## Güncel kararlar (Ömer 2026-11-08: bugünkü davranış = karar)
- **Raiders' Hoard:** korunan hazine bilinçli zor kalır (çarpan 1,02; `encounters.json > hoard_guards`).
- **"Hard fight" uyarısı:** eşik `campaign.json > sideDanger` (ratio, strongRatio); etiket "Hard fight"; şifasız zincir savaşlar (Pit, Dive) için toplam yük uyarısı yok.
- **Olay ödülü:** sandıklı zafer (`win.chest`) standart sandık verir; küçük sandık alanı yok.
- **Harita 2 eğrisi:** iyi oyuncu bitirme %58,6 kabul; Inn kuralı ve sim davranışı değişmez. Yan düğüm uyarısı Harita 2'de yalnız dr65'te.
- **Thunder Skald:** oyunun başından aktif (`classes/skald.md`).

## 1. Akış
Main Menu: `Continue`, `New Campaign` (Normal / Ironman -> zorluk -> kahraman seçimi -> harita), `Load Game`, `Quick Battle`. `?seed=` doğrudan savaş, `?campaign=1` doğrudan harita açar (geliştirme).

- **Yeni sefer** tek kahramanla başlar (tutorial akışı ve katılım düzeni tek kaynak: `docs/design/tutorial.md > Yeni sefer başlangıcı`). Başlangıç havuzu `campaign.json > starterPool` (warrior, skald, paladin, druid); bölük ve aday havuzu `companyPool` / `recruitPool` (13 sınıf).
- **Savaş:** `BattleScene` sefer bağlamıyla açılır (aktif takım, taşınan canlar, düğümün düşman takımı, düğüm seed'i). Savaş kuralları değişmez.
- **Zafer:** sonuç ekranı `Continue` -> otomatik kayıt -> harita. **Yenilgi:** `Load Last Save` (iki modda); Normal'de ayrıca `Load Game` ve `Main Menu`.
- **Harita sonu:** boss yenilince sıradaki harita açık ise "Continue to ..." çıkar; son harita bitince "Campaign Complete".
- Boss biçimleri: güçlendirilmiş lider + eskort ya da tek dev boss (ör. `docs/design/bosses/bridge-warden.md`).

## 2. İlerleme kuralları
| Kavram | Kural |
|---|---|
| Single path | Tek çıkışlı durakta sıradaki yer bellidir (hikâye, boss öncesi). |
| Choice point | Altın halkalı durak; 2-3 yol çıkar. Seçilen yol artık KİLİTLENMEZ (2.3). |
| Merge point | Ayrılan yollar birleşme düğümlerinde yeniden buluşur; takım gücü bölüm sonunda tahmin edilebilir. |
| Fog | Takım bulunduğu yerden sonraki iki durağı görür, ötesi sisli (aşağıda). |

### 2.1 Sis
- Mesafe = mevcut düğümden kenar sayısı. d = 1: ad, alt başlık, tür, savaşsa düşman önizlemesi. d = 2: yalnız tür rozeti + ad. d >= 3: sis. Bir kez görülen düğüm sise dönmez.
- Bölge başlıkları ve arazi hep görünür; final hedef düğüm baştan adı ve silüetiyle sis altında görünür. Mesafe `<harita>.json > visibility`; `alwaysVisible` düğümler hep görünür.

### 2.2 Savaşsız akış (K1/K2)
- **K1:** Seçim noktası ile birleşme noktası arasındaki her dalda en az bir savaş.
- **K2:** Hiçbir rotada ikiden fazla savaşsız durak art arda gelmez (kasaba da savaşsız sayılır). "Guarded treasure" savaş sayılır.
- Graf doğrulama testi her haritada çalışır (`tests/campaign.test.ts` ve harita testleri).

### 2.3 Serbest dolaşım ve devriye
- **Yollar iki yönlü:** Ashford'daki bölük kurma ekranından sonra her yol iki yönde yürünür. Tutorial yolu (Mill Road -> Ravenwood -> Watchtower -> Ashford) tek yönlü kalır.
- **Yolculuk:** bir hamle = komşu düğüm. Temizlenmiş düğümlerin içinden uzak düğüme tek dokunuşla gidilir; aradaki düğümlerin içeriği (şifa dahil) tetiklenmez, yalnız varılan düğümünki çalışır.
- **Devriye:** temizlenmiş Battle, Elite ve Guarded Treasure düğümünde "Fight the patrol?". Aynı karşılaşma; tam XP (fren: `levels.md` level farkı), altın ve item `items.json > loot.repeat`, Valor yok. Sandık ve elit garantisi yalnız ilk zaferde. Boss, olay, saf hazine tekrar oynanmaz. Düşman ölçeği düğüm seviyesine bağlı.
- **Savaştan çekilme:** Fight'a basılmazsa kafile temizlenmiş komşular üzerinden ayrılabilir (`state.ts > canWithdraw`). **Retreat to Map** savaşı duraklatır (kayıtta `suspended`, otomatik kaydedilir); sıfırlamaz.
- **Durum:** `path`, `visited`, `cleared`, `replays` (ve duraklatılmış devriyede `patrol`). Kod `src/campaign/state.ts` (moveOptions, travelRoutes, startPatrol), `fog.ts`, `save.ts`; sahne `src/game/scenes/CampaignMapScene.ts`; harita bölge görünümü `src/game/region-view.ts`. Testler `tests/campaign-roam.test.ts`, `campaign-withdraw.test.ts`, `campaign-retreat.test.ts`, `region-overview.test.ts`.

## 3. Haritalar ve düğüm türleri
- Harita verisi: `data/campaign/<harita>.json` (`nodes`, `edges`, `regions`, `start`, `stopsPerRun`, `visibility`). Karşılaşmalar `*encounters.json`, olaylar `*events.json`. Düğüm ve mob tabloları belgede tutulmaz; geçerli sayı: o dosyaların `nodes` alanı.
- Türler: `battle`, `elite`, `boss`, `treasure` (korunan ise önce savaş), `town` (tüccar, demirci, Inn, aday), `rest` (kamp), `event`, `merchant`. Kasaba level'ı ve dükkân tavanı otomatik hesaplanır: `docs/design/progression/items.md` 2.2.
- Düğüm tehlike göstergesi: `campaign.json > levelGap` (Dangerous / Deadly); yan düğüm uyarısı `sideDanger` (`src/campaign/level-gap.ts`, `side-danger.ts`).

## 4. Takım
- **Roster** (kazanılanlar) + **aktif takım**. Takım sınırı düğümdeki `partyCap` ve yeni sefer başlangıcı (`campaign.json > soloStart`); Motor 12'ye kadar destekler. Takım değiştirme her savaş arasında serbest.
- Party ekranı: roster kartları + 4x3 dizilim ızgarası; lider tacı. Lider her zaman aktif takımdadır.
- Haritada önde lider sprite'ı, arkasında aktif takımın silüetleri (yürüyen kafile). Yedekler (kışla) XP almaz.

## 5. Can, şifa, kayıt
### 5.1 Can ve şifa (değerler `campaign.json > rules`)
- Can oranı savaştan savaşa taşınır (`carryHp`). MP her savaşta dolu; rage, cooldown, statü, çağrılar taşınmaz.
- **Zafer şifası:** `rules.victoryHeal` (normal), `eliteVictoryHeal` (elit), `bossVictoryHeal` (boss); level farkına göre `victoryHealScale`. Boss şifası yalnız yaşayanlara.
- **Düşen kahraman zaferde KALKMAZ:** ceset olarak taşınır. Diriltme yalnız Valor ile (savaşta Resurrection / Raise Dead de). Dinlenme, kamp, Inn diriltmez. Bütün takım düşerse yenilgi.
- **Yaralar** (`rules.wounds`): ölümcül sayı ve can kaybı veride. Harita geçişinde silinir.
- Seferin genel düşman ölçeği: `campaign.json > enemyScale`, haritaya göre `mapEnemyScale`; loot ölçeği `mapLootScale`.
- **Gün, Inn, Kamp** (kod `src/campaign/state.ts`; sayılar `days`, `inn`, `camp`, `rest`):
  - **Gün** yalnız düğüm tamamlamayla ilerler: kendi savaşının ilk zaferi ya da devriye zaferi = 1 tamamlama; `days.completionsPerDay` tamamlama = 1 gün. Yürümek, kasaba/olay/kamp, savaşsız hazine gün harcamaz. Günle düşman güçlenmez. Tüccar her gün raf yeniler (`merchant.restockPerDay`).
  - **Kasaba iyileştirmez.** **Inn** (her kasabada, ücretsiz): aktif takımdan yaşayan kahraman bırakılır (`leaveAtInn`), takım eksik devam eder; Inn'de her gün `inn.healPerDay` can ve `inn.woundsPerDay` yara iyileşir, XP yok; yalnız o kasabada geri alınır (`takeFromInn`); ceset bırakılamaz; harita geçişinde kendiliğinden döner.
  - **Kamp** (`rest` düğümü ve olay sonrası dinlenme): bir kez, tek seçim, gün harcamaz: **Rest** (`rest.heal`), **Tend wounds**, **Sharpen** (bedava +1 Temper), **Train** (`camp.trainShare`).
  - **Demirci** 2. kasabadan itibaren; Ashford'da yok.

### 5.2 Kayıt modları
| | Normal | Ironman |
|---|---|---|
| Ne zaman | Zaferden sonra otomatik + sefer başı + haritada elle `Save` | Yalnız zaferden sonra otomatik; elle yok |
| Kaç kayıt | `rules.maxSaves.normal` (yuva başına), en eskisi silinir | 1, üstüne yazılır |
| Yenilgi | Son kayıttan ya da `Load Game` listesinden eski kayıttan | Tek kayıttan; sefer bitmez |

- `rules.slots` sefer yuvası; her yuvanın kendi kayıtları. Load Game önce yuva, sonra kayıtlar; Continue en son oynanan yuva.
- **"Retreat to last town" YOK.** Kayıt yalnız zaferden sonra alındığı için kayıttaki takım son savaşı kazanmıştır.
- Şema: `localStorage`, sürümlü, try/catch; bozuk kayıt sessizce yok sayılır. Alanlar ve geçişler `src/campaign/save.ts`.
- **Seed:** düğüm savaş seed'i = `hash(seed, mapId, nodeId, attempt)`; Math.random yok. Debug Data sekmesinde görünür.

## 6. Zorluk (`campaign.json > difficulties`, sefer başında seçilir, sonra değişmez)
- Easy / Medium / Hard: düşman YZ'si (`ai`), tüm düşmanlara `enemy`, elit/boss'a `enemyTier`, bazı zorluklarda `eliteEscort` (elit düğümdeki rütbesiz eşlikçiler) ve `rules` geçersiz kılma. Geçerli çarpanlar yalnız o dosyada; Easy hafifletir, Medium varsayılan (`defaultDifficulty`), Hard güçlendirir. Hızlı savaşta zorluk yok (Medium).
- Karşılaşma sayıları, düşman takımları ve ölçülmüş eğri: `data/campaign/*encounters.json`, `docs/balance.md > Sefer dengesi`. Mob tasarım tarihçesi: `mob-plan.md`.

## 7. Boss ve kinematikler
Boss tasarımları `docs/design/bosses/`. Sinematikler `cinematics.md` (`data/campaign/cinematics.json`).

## Değer nerede -> test -> belge
| Ne | Veri | Test | Belge |
|---|---|---|---|
| Şifa, yara, kayıt sayısı | `campaign.json > rules` | `campaign-battle-rules`, `campaign-save`, `campaign-unsaved` | bu belge 5, `docs/balance.md` |
| Gün, Inn, kamp | `days`, `inn`, `camp`, `rest` | `campaign-day-inn-camp`, `campaign-rest-merchant` | bu belge 5.1 |
| Zorluk | `difficulties`, `enemyScale`, `mapEnemyScale` | `campaign-difficulty`, `campaign-balance` | bu belge 6, `docs/balance.md` |
| Karşılaşma / düğüm | `<harita>.json`, `*encounters.json` | `campaign-encounters`, `campaign-drowned-reach`, `campaign-hollow-crown` | `docs/design/campaign/maps-2-3.md` |
| Oyuncuya görünen değişiklik | `data/patch-notes.json` | patch-notes testi | `docs/arch/areas/push-queue.md` |
