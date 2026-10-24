# Hesap / bulut kaydı planı (taslak, 2026-10-24)

Durum: PLAN. Karar formu cevapları gelmeden kod yazılmaz. Karar formu: claude.ai/artifact/U2c3RLXcxBp8EoH8LRfpt6 (db doc `login/main` {picks, notes}).

## Amaç
İsteğe bağlı giriş (Google, Discord; OAuth, şifre yok). Faz 1 amacı: cihazlar arası bulut kaydı. Sonra: çok oyunculu kimlik, skor tablosu. Girmeyen oyuncu bugünkü gibi yalnızca `localStorage` ile oynar, ağ çağrısı yapılmaz.

## Kısıtlar
- Tek Worker (`cloudflare/src/index.ts`); `run_worker_first` listesine `/auth/*`, `/save`, `/account` eklenir.
- KV ücretsiz planda günde 1000 yazma: kayıt için kullanılamaz. **D1** kullanılır (`eov-accounts`, binding `DB`).
- Çerez oturumu yalnızca embersofvaldoria.com ve localhost'ta çalışır; Pages ve eski adreste giriş gizlenir.
- Vite (5173) ile `wrangler dev` (8787) farklı origin: `vite.config.ts` içine `server.proxy` (/auth, /save, /account).
- `.gitignore` içine `cloudflare/.dev.vars` eklenmeli (secret'tan önce).

## Veri modeli (`cloudflare/migrations/0001_accounts.sql`)
- `users(id uuid, created_at, last_login_at, display_name)`
- `identities(provider google|discord, sub, user_id, ...)`: PK (provider, sub). Bağlama yalnızca açık `mode=link` ile; e-posta toplanmaz.
- `sessions(token_hash, user_id, created_at, expires_at)`: yalnızca SHA-256 saklanır.
- `saves(user_id, rev, updated_at, versions json, app, size, hash, blob, prev_blob)`.
- Toplanmayan: e-posta, avatar, IP, user agent, sağlayıcı access token'ı.

## Worker yolları
`GET /auth/{google|discord}?mode=login|link` (state + PKCE S256, imzalı `__Host-eov_oauth` çerezi), `.../callback`, `GET /auth/me`, `POST /auth/logout`, `GET|PUT /save` (baseRev ile iyimser kilit, 409 conflict / schema-older, 429 throttle, 1 MB sınır), `POST /save/restore-previous`, `DELETE /account` (`{confirm:"DELETE"}`).
Oturum: `__Host-eov_sid`, 30 gün, HttpOnly Secure SameSite=Lax, opak token. CSRF: Origin kontrolü + JSON content-type, CORS yok. Yalnızca localhost'ta `DEV_AUTH=1` ile sahte sağlayıcı (test için).
Saf mantık ayrı modüllerde: `auth-logic.ts`, `save-logic.ts` (lobby-logic örneği gibi test edilir).

## Kayıt senkronu
Senkronlanan anahtarlar: `eov.campaign.v1` (v12), `eov.endless.v1` (v7), `eov.endless.scores.v1`, `eov.tutorial.v1`. Hiç senkronlanmayanlar: `eov.diag.*`, performans/debug/önbellek anahtarları, `eov.mp*`. Paket ham dizgileri olduğu gibi taşır; şemanın tek sahibi mevcut okuyucular kalır (şema değişmez). Daha yeni sürümden gelen paket uygulanmaz ve yüklenmez.
`decideSync(local, cloud)`: ilk girişte bulut boşsa yerel yüklenir; yerel boşsa bulut iner; ikisinde de ilerleme varsa oyuncuya sorulur (otomatik "en yeni" yok). Yükleme 15 sn debounce + `visibilitychange`; anahtar yazımı `storage()` sarmalayıcısıyla `dirty` işaretlenir. Üzerine yazmadan önce yerel yedek `eov.cloud.backup.v1`.

## İstemci
Yeni: `src/cloud/{sync-core,cloud,sync-dialog,account-notice}.ts`. Değişen: `kv-storage.ts`, `endless-session.ts`, `tutorial/store.ts`, `campaign/save.ts` + `endless/save.ts` (yalnızca `peekVersion`), `main.ts`, `settings-pages.ts` (Account sayfası), `MainMenuScene.ts`, `settings.ts` (salt okunur), debug bölümü Data > Cloud, `vite.config.ts`.

**Hata raporu bağlantısı (2026-10-25):** `CloudClient` senkron izlerini (`logEvent('cloud', ...)`) ve sessiz sorun raporlarını opt-in hata raporu sistemine yazar; bağımlılık `CloudDeps.diag` (varsayılan no-op, `main.ts > initCloud({ diag })` gerçek `src/diag/diag`'a bağlar; cloud.ts diag'ı içe aktarmaz). **Yükleme koruması:** karar 'upload' iken bulutta ilerleme var, yerelde yoksa PUT yapılmaz, durum `error` / `upload-guard` (bulut boş cihazla asla ezilmez). Kod listesi: `docs/arch/diagnostics.md` > Bulut kaydı.

**Canlı çekme + çift çakışma düzeltmesi (2026-10-25, iki cihazlı gerçek test sonrası):**
- *Canlı çekme:* girişliyken ve sekme görünürken `GET /auth/me` dakikada bir (`PULL_MS` 60 sn, `cloud.ts` içinde öbür süre sabitlerinin yanında) ve sekme görünür olunca (son yoklama 15 sn'den yeniyse çağrı yok). Gizliyken zamanlayıcı durur; hatada aralık ikiye katlanır (en çok 10 dk); girişsiz / kapalı / newer-version iken çağrı yok; bekleyen karar ya da süren yükleme varken yoklanmaz. Rev farklıysa açılış akışı: temiz cihaz buluttakini indirir (yalnızca güvenli anda = ana menü), kirli cihaz buluttakini okuyup `decideSync` kurallarıyla karar verir. Yüklemeden önce ayrıca yoklanmaz (PUT 409 aynı işi görür). Bütçe: açık sekme başına saatte en çok 60 istek.
- *Bekleyen indirme/birleştirme karardan sonra yerel değiştiyse* (ör. indirme ana menüyü beklerken haritada oynandı) eski karar uygulanmaz, aynı bulut anlık görüntüsüyle yeniden karar verilir (önceden yeni yerel ilerleme sessizce ezilip yalnızca yedekte kalıyordu).
- *Değişmeyen bulut = çakışma yok:* meta `hash` (bu cihazın son senkronladığı / son çakışma kararında gördüğü bulut verisinin hash'i; sunucu hash'i yalnızca veriden hesaplar) buluttakiyle aynıysa ve `decideSync` 'ask' derse sorulmaz: bulut verisi o zamandan beri değişmemiş (arada yalnızca rev / silme işareti değişmiş), yerel ondan türemiştir -> yerel yüklenir, silme işaretleri birleşir (`sync-core.ts > fastForward`). Çakışma seçiminden sonra da hash yazılır: karar beklerken öbür cihaz veriyi değiştirmeyen bir yükleme yaptıysa (409) ikinci pencere açılmaz; veriyi gerçekten değiştirdiyse yeniden sorulur (karar 1).
- *Tutorial önbelleği:* `tutorial/store.ts` bellekteki kopyayı depodaki ham dizgiyle doğrular; önceden bulut indirmesinden sonraki ilk ders yazımı eski önbellekle indirilen tutorial kaydını geri ezip buluta eski veriyi yüklüyordu.
- Testler: `tests/cloud-client.test.ts` > canlı çekme + iki cihaz tek sunucu (her cihaz kendi modül örneğiyle).

## Fazlar
- 1a Worker auth + D1 (Opus): migration, auth/save modülleri, smoke testi.
- 1b Senkron çekirdeği (Opus, kayıt şeması hassas): sync-core, kv sarmalayıcı, testler.
- 1c Gizlilik metni (Opus): `data/account-notice.json`, `public/privacy.html`, `privacy-notice.json` kapsam düzeltmesi. YAPILDI 2026-10-24: metin erişimi `src/cloud/account-notice.ts`, sayfa üreticisi `node tools/gen-privacy-page.mjs` (JSON değişince çalıştır), test `tests/account-notice-text.test.ts`, varsayımlar open-questions 415.
- 1d Arayüz (ui-dev; silme ve çakışma diyaloğu bağlantısı Opus): Account sayfası, diyalog. YAPILDI 2026-10-24 (taslak account.html v1 "Rows"): `src/cloud/ui/` (account-page = ana menü Settings > Account DOM sayfası, dialogs = ad / silme / çakışma / yeni sürüm / giriş hatası, cloud-ui = olay bağlantısı main.ts'de initCloud'dan önce, account-text = saf metinler `tests/cloud-ui-text.test.ts`, sample = debug örnek verisi), ortak DOM diyalog `src/ui/el-dialog.ts`, oyun içi Settings > Account salt okunur satır, debug Data > Cloud > Account screens.
- 1e Yayına alma: Ömer'in elle adımları + `d1 migrations apply --remote` + onaylı `deploy:cf`.

## Ömer'in elle yapacakları
1. `wrangler d1 create eov-accounts` ve id'yi wrangler.toml'a yaz.
2. Google Cloud Console: OAuth izin ekranı (External, yalnızca `openid`), Web uygulaması istemcisi; redirect: `https://embersofvaldoria.com/auth/google/callback`, `http://localhost:5173/...`, `http://localhost:8787/...`. Yayınlamak için herkese açık gizlilik sayfası gerekir.
3. Discord Developer Portal: uygulama, aynı üç redirect `/auth/discord/callback`.
4. `wrangler secret put` ile `GOOGLE_CLIENT_SECRET`, `DISCORD_CLIENT_SECRET`, `SESSION_HMAC_KEY`. İstemci kimlikleri `[vars]`.
5. Telefonda gerçek OAuth yerel ağ adresinde çalışmaz (Google özel IP kabul etmez).

## Gizlilik değişiklikleri
Yeni veri: hesap kimliği, sağlayıcı kimliği, isteğe bağlı görünen ad, oturum özeti, kayıt, zaman damgaları. Cloudflare altyapısında (yurt dışı olabilir) tutulur, belirtilmeli. Silme: oyun içi "hesabı sil" + e-posta. `data/privacy-notice.json` içindeki "hesap/kayıt gönderilmez" cümlesi yalnızca hata raporları için geçerli olacak şekilde daraltılır; ayrı hesap bildirimi eklenir.

## Testler
`tests/auth-worker.test.ts`, `tests/cloud-sync.test.ts`, `tests/kv-wrapper.test.ts`, `tests/account-notice-text.test.ts`, `tests/settings-pages.test.ts` güncellemesi, `cloudflare/scripts/auth-smoke.mjs`; anahtar listesi anlık görüntü testi (yeni `eov.*` anahtarı bilinçli karar ister).

## Açık sorular
Karar formundaki 9 madde (çakışma, Ironman, alan adı, ayarlar, ad, saklama, rıza, staging, iletişim adresi). Ek: kayıt boyutu gerçek bir ağır kayıtla ölçülmeli (1 MB sınır önerisi).

## Kararlar (Ömer, 2026-10-24, form U2c3RLXcxBp8EoH8LRfpt6)
1. Çakışma: her zaman oyuncuya sor.
2. Ironman: sıkı kural. Ironman slotlarında eşitleme yalnızca ilerlemeyi artıran yönde olur (ölümü buluttan geri alma yok). Uygulanan tanım (Faz 1b, `src/cloud/sync-core.ts`): Ironman sefer yuvalarında (yuvanın `mode` alanı `ironman`) bir çakışma hiçbir zaman daha az ilerlemiş tarafı sunmaz, daha ilerlemiş taraf kazanır; ilerleme = temizlenmiş düğüm sayısı (takım level'ı yok, Ömer düzeltmesi: düğüm sayısı eşitse otomatik kazanan yok, o yuva normal oyuncu seçimine düşer); ölü bir Ironman koşusu yaşayan bir koşunun üstüne hiçbir zaman yazılmaz. Yuva yuva uygulanır: oyuncu hangi tarafı seçerse seçsin o yuva kazanan taraftan gelir; yalnızca Ironman farkı varsa soru sorulmaz. Karşılaştırma aynı `campaignId` (ya da bir taraf boş) için; farklı seferlerde yalnızca ölü/yaşayan kuralı. **Silinen yuva geri gelmez (Ömer düzeltmesi):** yuva silinince (ya da yerine başka sefer kurulunca) yerel `eov.cloud.tombstones.v1` anahtarına silme işareti {yuva, campaignId, deletedAt} yazılır, paketin `tombstones` alanıyla taşınır (sefer kayıt şeması değişmez); iki tarafın işaretleri birleşir ve aynı sefer (aynı campaignId, yuvanın mevcut `startedAt` alanı <= deletedAt) her iki taraftan çıkarılır. Silinmeden sonra kurulan yeni sefer kalır. İşareti olmayan boş yuva (senkron geçmişi olmayan yeni cihaz) silme sayılmaz. Not: kayıtta "ölü" işareti yok (Ironman yenilgisi kayda yazılmaz, Load Last Save son zafer kaydını açar); en yeni kayıtta kadrodaki herkes düşmüşse ölü sayılır.
3. Giriş yalnızca embersofvaldoria.com ve localhost'ta.
4. Yalnızca ilerleme senkronlanır, ayarlar cihazda kalır.
5. Görünen ad: oyuncu kendi seçer (ilk girişte sorulur).
6. 24 ay girmeyen hesap otomatik silinir.
7. Girişte "gizlilik bildirimini okudum" kutusu zorunlu.
8. staging.embersofvaldoria.com test ortamı kurulacak.
9. Gizlilik adresi privacy@embersofvaldoria.com. Not: Ömer bu adresi başka yere yönlendirdiğini söyledi; yönlendirme (e-posta yönlendirme) yeterli, posta kutusu şart değil.
