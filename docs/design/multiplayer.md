# Multiplayer (iki oyunculu çevrimiçi Quick Battle)
> **Ne için / Güncel mi (2026-11-08):** çevrimiçi Quick Battle: ağ, lobi, lockstep. Güncel; sistem canlı, kod `src/net` ve `cloudflare/`.

Durum: canlı. Kapsam yalnızca **Quick Battle**; sefer tek oyunculu kalır.
Ömer kararları: signaling Ömer'in **Cloudflare** hesabında (ücretsiz plan) küçük bir Worker; kopma kuralı **60 saniye**.
Varsayımlar ve sorular: `docs/archive/design/open-questions-archive.md` madde 268.

## 1. Akış

1. Ana menü > **Multiplayer** > **Host lobby** ya da **Join lobby**.
2. Kurucu (host) lobi kurar: ekranda büyük **lobi kodu** (6 karakter), **Copy code** ve **Copy invite link** düğmeleri.
   Davet linki: oyunun açıldığı adres + `?lobby=KOD` (adres sabit değil; `src/net/lobby-code.ts > inviteLink` mevcut sayfa adresinden üretir).
   Altında paylaşım satırı (Ömer 2026-10-17): **Share** (yalnızca `navigator.share` olan tarayıcıda, çoğu telefon; sistem paylaşım
   menüsü), **WhatsApp** (`https://wa.me/?text=` + hazır mesaj, yeni sekme) ve **Discord** (Discord hazır mesaj linki desteklemez:
   mesaj panoya kopyalanır, `https://discord.com/app` yeni sekmede açılır, "Invite copied — paste it in Discord"; pano yoksa
   mesaj seçili bir kutuda gösterilir). Mesaj (`src/net/share-invite.ts`): "Join my Quick Battle in Embers of Valdoria! Lobby code:
   ACD EFG" + yeni satırda "Tap to join: <davet linki>". Lobi sekmesi yerinde kalır (bağlantı kopmaz). Sahte rakipli yerel lobide yok.
   Bu düğmeler yalnızca bağlantı açar; WhatsApp/Discord'a oyundan veri gitmez, oyuncu mesajı kendisi gönderir.
3. Katılan (guest) linke tıklar (kod kendiliğinden girilir) ya da Join lobby'de kodu yazar.
4. Lobi ekranı: "Opponent connected" göstergesi; ikisi de **Ready** deyince takım seçimine geçilir.
5. Takım seçimi: kurucu **sol** (PLAYER/party), katılan **sağ** (ENEMY/enemies) taraftır; 4'er kişi (sabit). Her oyuncu yalnızca
   kendi panelini düzenler; rakibin takımı savaş başlayana kadar gizlidir (yalnızca "Ready" durumu görünür). İkisi de **Ready**
   olunca kurucu `start` mesajını (seed + iki takım) yollar ve savaş iki tarafta aynı anda kurulur. Seed **iki taraflıdır**
   (commit-reveal, bölüm 8.1): ne kurucu ne katılan tek başına seçebilir.
6. Savaş: herkes yalnızca kendi tarafının birimini, kendi sırasında oynar. Rakibin sırasında alt panelde **Opponent's turn**
   yazar ve giriş kilitlidir. Yapay zeka kullanılmaz. (İstisna: hiçbir eylemi kalmayan birim, örn. skill'i kalmayan çağrı, sahibi
   adına otomatik "pas" geçer; bu da normal bir hamle olarak gönderilir.)
7. Sonuç ekranı: **Rematch** (ikisi de isterse yeniden takım seçimi, önceki takımlar korunur) / **Back to lobby** / **Main Menu**.
   Rematch aç/kapa düğmesidir (basınca "Cancel rematch"); Back to lobby ve Main Menu HER durumda çalışır (canlı hata 2026-10-10:
   Rematch'e basınca ortak "bir kez" kilidi diğer düğmeleri de kilitliyordu; düğme kapısı `src/game/result-actions.ts`). Düğmelerin
   üstünde durum satırı: "Waiting for your opponent...", "Your opponent wants a rematch", "Opponent disconnected" (geçici kopma:
   yeni istek yok, bekleyen istek iptal edilebilir), "Opponent left the match" (rakip `leave` gönderdi ya da 60 sn içinde dönmedi:
   Rematch kapanır, ekran kalır; rakip aynı maçın sonuç ekranına geri dönerse yeniden açılır). Saf karar `src/net/rematch.ts`.
8. Kopma: savaş duraklar, ekranda geri sayım (60 sn). Kopan oyuncu dönerse kaldığı yerden devam; dönmezse kalan kazanır.

## 2. Mimari

```
 Tarayıcı A (host)                         Tarayıcı B (guest)
 ┌────────────────────┐   WebRTC DataChannel   ┌────────────────────┐
 │ MpSession (saf)    │◄──────────────────────►│ MpSession (saf)    │
 │  Lockstep + Battle │   (oyun mesajları)     │  Lockstep + Battle │
 └───────┬────────────┘                        └────────┬───────────┘
         │ WebSocket (yalnızca buluşma: SDP/ICE)        │
         └──────────────► Cloudflare Worker ◄───────────┘
                          + Durable Object "Lobby" (kod başına bir tane)
```

- `src/net/` saf (Phaser/DOM yok, Node'da test edilir): `protocol.ts` (mesaj şeması + doğrulama), `lobby-code.ts`,
  `state-hash.ts`, `lockstep.ts`, `reconnect.ts` (60 sn durum makinesi), `session.ts` (lobi/takım/savaş/rövanş akışı),
  `transport.ts` (soyut taşıma + bellek içi loopback, gecikme ve kopma simülasyonu), `fake-opponent.ts` (debug sahte rakip).
- Tarayıcıya özgü: `src/net/webrtc-link.ts` (Worker WebSocket istemcisi + RTCPeerConnection; eski `signaling.ts` ayrı dosya olarak yok; Worker tarafı `cloudflare/src/lobby-logic.ts`),
  `src/net/config.ts` (Worker adresi), `src/game/mp-client.ts` (oturumu sahnelere bağlar), `src/game/scenes/MultiplayerScene.ts`
  (lobi ekranı), `src/ui/mp-overlay.ts` (bağlantı/geri sayım/desync şeridi ve kod giriş kutusu), `src/ui/debug-mp.ts`.
- Worker: `cloudflare/` (ayrı paket; oyunun derlemesine ve CI'ya girmez). Saf lobi kuralları `cloudflare/src/lobby-logic.ts`
  (oyunun testleri Node'da sınar), Worker + Durable Object `cloudflare/src/index.ts`.
- Worker adresi tek bir yapılandırma değerinde: `data/multiplayer.json > signalingUrl` (boşsa menü "Server not configured" der).
  Yayında `wss://embersofvaldoria.com/lobby`: oyun ve lobi TEK Worker'da, tek alan adında (Ömer 2026-10-09). Oyun `/` altında
  (Workers Static Assets, `../dist`), lobi `/lobby` altında; istemci adrese `/<KOD>` ekler (`config.ts > lobbySocketUrl`; adres
  `/lobby` ile bitmiyorsa, ör. yerel `ws://127.0.0.1:8787`, `/lobby/<KOD>`). GitHub Pages'teki oyun da aynı lobiye bağlanır.

## 3. Mesaj şeması (DataChannel, JSON, en çok 16 KB)

| t | alanlar | kim / ne zaman |
|---|---|---|
| `hello` | `v` (protokol sürümü), `build` (içerik parmak izi), `match` (aktif maç kimliği ya da null), `count` (hamle sayısı), `phase` | kanal açılınca iki taraf |
| `ping` / `pong` | `n` | 2 sn'de bir (kalp atışı); rölede 20 sn'de bir ve yanıtsız |
| `name` | `name` (harf/rakam/boşluk, en çok 16) | ad değişince; yalnızca doğrudan kanalda (hello'da da `name?` alanı) |
| `commit` | `c` (64 hane SHA-256) | takım seçimine girince iki taraf: kendi gizli sayısının özeti |
| `reveal` | `n` (32 hane) | rakibin taahhüdü gelince: kendi gizli sayısı |
| `ready` | `on` | lobide |
| `phase` | `to`: `lobby` \| `teams` | `teams` yalnızca kurucu; `lobby` iki taraf |
| `team` | `cells` (12 hücre), `ready` | takım seçiminde, yalnızca kendi tarafı |
| `start` | `match`, `seed`, `host`, `guest` | kurucu (yeniden bağlanmada maçı bilen taraf) |
| `move` | `match`, `seq`, `actor`, `choice` (`skillId`, `targetUid?`, `slot?`, `board?`, `corpseUid?`) ya da `null` (pas), `before` (hamle öncesi durum özeti) | sırası gelen oyuncu |
| `ack` | `match`, `seq`, `hash` (hamle sonrası özet) | hamleyi alan (rölede yalnızca maçın son hamlesinde) |
| `catchup` | `match`, `from`, `moves` (en çok 40) | yeniden bağlanınca, fazla hamlesi olan |
| `rematch` | `on` | sonuç ekranında |
| `ended` | `match`, `winner`, `reason` (`forfeit` \| `left`) | kopma sonrası kazanan, dönen rakibe |
| `desync` | `match`, `seq` | desync'i yakalayan taraf, öbürü de maçı durdursun diye |
| `leave` | - | bilerek ayrılan |

Her mesaj `parseMessage` ile sıkı doğrulanır: bilinmeyen tür, fazla/eksik alan, yanlış tür, aralık dışı sayı, uzun metin,
16 KB'tan büyük mesaj reddedilir (sessizce yok sayılır, sayaçta tutulur). Saniyede 60'tan fazla mesaj atan eşin fazlası atılır.

## 4. Lockstep

- Motor saf ve seed'li: iki tarafta `battleSetup('random-battle', seed, 'turns', { party: host, enemies: guest }, false)` ile
  aynı savaş kurulur. Ağdan yalnızca oyuncu hamleleri gider; rastgele sayı ya da durum gönderilmez.
- Yerel hamle: önce motorda geçerliliği sınanır (`canUse` / `canUseGlobal`, pas için "hiç eylemi yok" kuralı), uygulanır,
  sonra `move` gönderilir. Uzak hamle: maç kimliği, sıra numarası (`seq` = şimdiye kadarki hamle sayısı), aktörün şu an sırası
  gelen birim olması, aktörün **gönderenin tarafında** olması, `before` özetinin bizim özetimizle aynı olması ve hamlenin motor
  kurallarına uygunluğu denetlenir; hepsi tutarsa uygulanır ve `ack` (hamle sonrası özet) döner.
- Debug ayarları (hasar çarpanı, zorla kritik, Free MP, Test Mode anahtarları) multiplayer savaşına uygulanmaz.
- İçerik parmak izi (`build`): class/skill/formül verisinin özeti. İki oyuncunun oyun sürümü farklıysa (biri eski sayfayı
  açık tutuyorsa) lobi "Game versions differ - reload the page" der.

## 5. Desync tespiti

- Durum özeti: her birimin can/MP/Rage/kalkan/yuva/tahta/durumları/cooldown'ları/sıra sayacı + zemin etkileri + sıra + tur sayısı +
  kazanan, FNV-1a 32 bit (`state-hash.ts`).
- İki kontrol: (1) gelen `move.before` bizim özetimizle aynı olmalı; (2) gelen `ack.hash` bizim o hamleden sonraki özetimizle
  aynı olmalı. Uyuşmazlıkta maç durur, iki tarafta "Desync detected (move N)" şeridi ve **Back to lobby**; konsola ve maç kaydına
  yazılır. Kazanan sayılmaz. Debug > Setup > Multiplayer > "Simulate desync" yerel durumu bozarak bunu dener.

## 6. Sıra kilidi

- Arayüz: `playerCanAct` yalnızca sıradaki birim yerel tarafa aitse ve bağlantı açıksa doğrudur; rakibin sırasında düğmeler kilitli.
- Protokol: rakip tarafın birimi için gelen hamle, sırası gelmeyen birim için hamle, yanlış `seq` reddedilir (kötü niyetli
  istemci başkasının birimini oynatamaz). Eksik hamle (`seq` ileride) gelirse `hello` ile yeniden eşitleme istenir.

## 7. Kopma ve yeniden bağlanma (Ömer kararı: 60 sn)

- Kanal düşmesi: DataChannel kapanır ya da 8 sn mesaj gelmez. Savaş duraklar (giriş kilitli), şerit geri sayar.
- Kim koptu? Worker'a bağlı kalan taraf "Opponent disconnected - waiting 0:59" görür; bağlantısı giden taraf "Connection lost -
  reconnecting". Worker, eşin son yaşam sinyalini (10 sn'de bir ping) bilir; 25 sn'den eski ise eş "yok" sayılır.
- 60 sn içinde dönülürse yeni WebRTC kanalı kurulur, `hello` ile hamle sayıları karşılaştırılır, eksik hamleler `catchup` ile
  gönderilir; sayfa yenilenmişse (sekme kapandıysa) maçı bilen taraf `start` + tüm hamleleri gönderir ve savaş aynı yerden sürer
  (sekme kimliği `sessionStorage`'da, aynı sekmede yenileme yeterli).
- 60 sn dolunca: bağlı kalan taraf **kazanır** (sonuç ekranı "Opponent left"), kopan taraf dönerse `ended` alır ve yenilgiyi görür.
  İki taraf da Worker'a bağlı ama eşler arası kanal kurulamıyorsa 60 sn sonra maç "Connection failed" ile kazanansız biter.
- Bilerek ayrılma (Main Menu / Leave): `leave` gider, rakip savaştaysa hemen kazanır.
- Lobide ve takım seçiminde kopma: aynı geri sayım; dolunca lobiye dönülür.

## 8. Güvenlik ve hile sınırları

- Worker oyun verisini doğrudan modda görmez; yalnızca buluşma mesajlarını (SDP/ICE: IP adresleri dahil) iki eş arasında aktarır.
  Röle modunda (bölüm 9.1) oyun mesajları Worker'dan geçer ama okunmaz ve saklanmaz.
- Worker sınırları: yalnızca izinli kökenler (`ALLOWED_ORIGINS`: GitHub Pages adresi + localhost), kod biçimi denetimi, lobi
  başına 2 kişi, ilk katılanın kimliği lobiye kilitlenir (kodu sonradan bulan üçüncü kişi giremez), mesaj boyutu 24 KB (röle
  yükü en çok 16 KB), eş başına hız sınırı (10 sn'de 100 mesaj), boşta 2 saat sonra lobi silinir.
- Lockstep, istemciyi kural dışı hamleye karşı korur (her hamle iki tarafta motorda sınanır). Gizli bilgi yoktur: maç başladıktan
  sonra seed iki tarafta bilinir, yani bir hileci kendi tarayıcısında savaşı önceden deneyip zar sonuçlarını görebilir (her
  lockstep oyununda böyle; kapatmak için zarları her hamlede ortak üretmek gerekir, şimdilik yok).
- **Oyuncu adı** isteğe bağlı (bölüm 8.2); yalnızca doğrudan kanalda rakibe gider. WebRTC doğası gereği iki tarayıcı birbirinin
  IP adresini görür.

### 8.1 İki taraflı seed (commit-reveal; Ömer kararı 2026-10-08)

1. Takım seçimine girince her taraf 128 bitlik rastgele bir sayı (`nonce`) üretir ve yalnızca SHA-256 özetini gönderir (`commit`).
2. Rakibin özeti gelince kendi sayısını açar (`reveal`). Önce açan olmaz: rakip, bizim sayımızı görmeden kendi sayısına bağlanmıştır.
3. Gelen sayı, daha önce gelen özetle tutmazsa yok sayılır. Seed = SHA-256(kurucuSayısı:katılanSayısı)'nın ilk 31 biti.
4. Kurucu `start`'ı bu seed'le yollar; katılan aynı seed'i kendisi hesaplar, tutmazsa `start`'ı reddeder (kurucu seed dayatamaz).
5. Yeniden bağlanmada (ya da rakip sayımızı gördükten sonra yeni özet gönderirse) iki taraf yeni sayı seçer: açılmış bir sayı
   ikinci kez kullanılmaz. Rövanşta da yeni sayılar. Hepsi eşler arası mesaj; Worker'da ek istek yok.
Testler: `tests/multiplayer.test.ts > iki taraflı seed`.

### 8.2 Oyuncu adı

Lobide "Name: ... [Change name]"; yalnızca harf/rakam/boşluk, en çok 16 karakter (`sanitizeName`), `localStorage`
(`eov.mpName`, erişilemezse yalnızca o oturum). Boşsa kurucu "Player 1", katılan "Player 2". Lobi satırlarında, takım
seçiminde ("<ad>'s team is revealed when the battle starts"), savaşta ("<ad>'s turn") ve sonuç ekranının sütun başlıklarında
görünür. Yalnızca doğrudan WebRTC kanalında gönderilir (`hello.name`, `name` mesajı); röle modunda gönderilmez (Worker'dan geçmesin).

## 9. Cloudflare Worker mimarisi ve maliyet

- `GET /lobby/<KOD>?role=host|guest&id=<sekme kimliği>` WebSocket yükseltmesi; Worker isteği kodun Durable Object'ine
  (`idFromName(KOD)`) yollar. DO, **WebSocket Hibernation API** ile bekler (boşta süre faturalanmaz); istemcinin 20 sn'lik
  `ping`'i DO uyandırılmadan otomatik yanıtlanır (`setWebSocketAutoResponse`).
- Mesajlar: istemci -> `signal` (eşe aktar), `relay` (röle yedeği), `probe` (eş canlı mı), `leave`; sunucu -> `welcome {role, peer}`,
  `peer {present}`, `signal`, `relay`, `error {code}` (`taken`, `full`, `no-lobby`, `bad-request`, `rate`).
- Kurucu kodu kendisi üretir; kod doluysa (`taken`) yenisini dener. Katılan, kurucu yoksa `no-lobby` alır.
- **Park:** doğrudan WebRTC kanalı açıldıktan 3 sn sonra iki taraf Worker WebSocket'ini kapatır (signaling bitti; maç ve rövanşlar
  sunucusuz sürer). Kanal düşerse WebSocket yeniden açılır (kim koptu bilgisi ve yeniden buluşma için), kanal kurulunca yine kapanır.
- STUN: yapılandırmada liste (`data/multiplayer.json > iceServers`); şimdilik yalnızca Cloudflare'in herkese açık STUN'u
  (`stun:stun.cloudflare.com:3478`, hesap gerekmez; Ömer kararı). Listeye ileride ör. `{"urls":"stun:stun.l.google.com:19302"}`
  eklenebilir. Yerel testte (signaling localhost'ta) STUN kullanılmaz. TURN yok.

### 9.1 Röle yedeği (Ömer kararı 2026-10-08: kotayı en az harcayacak şekilde)

- Yalnızca doğrudan bağlantı gerçekten kurulamazsa: kurucu 2 deneme (her biri en çok 15 sn) başarısız olunca `signal {relay:true}`
  yollar; iki taraf oyun mesajlarını `{t:'relay', d}` ile Worker WebSocket'inden aktarır. Bu lobide sonraki yeniden bağlanmalar da
  röleyle olur. Lobi ekranında "Connected through the server" yazar. Debug > Setup > Multiplayer > "Force relay" ile denenir.
- Rölede mesaj azaltma: hamle zaten tek mesaj (seçim + hamle öncesi özet `before` aynı mesajda); hamle başına `ack` gönderilmez
  (ayrışma bir sonraki hamlenin `before` özetiyle yakalanır), yalnızca maçın son hamlesinde; kalp atışı 20 sn'de bir ve yanıtsız
  (`pong` yok), sessizlik payı 50 sn; oyuncu adı gönderilmez; catchup 25 hamlelik parçalar.

### 9.2 Kota

Ücretsiz plan kota hesabı ve ölçümler (tarihçe): `docs/archive/design/multiplayer-quota.md`. Not: Worker bugün yalnız lobi (`lobby-logic.ts`, `index.ts`) değil, hesap / kayıt / tanı kodunu da (`auth.ts`, `save-logic.ts`, `diag-logic.ts`) barındırır; kapsamı `cloudflare/README.md`.

## 10. Kurulum adımları (özet; ayrıntı `cloudflare/README.md`)

1. Cloudflare hesabı (ücretsiz), `embersofvaldoria.com` Cloudflare'de. 2. `cd cloudflare && npm install`. 3. `npx wrangler login`.
4. Oyun klasöründe `npm run deploy:cf` (build + oyun dosyaları + lobi tek seferde; `embersofvaldoria.com` alan adı ve sertifikası
   otomatik kurulur). Adres `data/multiplayer.json`'da hazır: `wss://embersofvaldoria.com/lobby`.
   Yerel test: `cd cloudflare && npm run dev` + oyunda `?mpserver=ws://127.0.0.1:8787`.

## 11. Debug (Debug > Setup > Multiplayer)

- **Fake opponent**: aynı sekmede bellek içi (loopback) sahte rakip; lobiye katılır, hazır olur, rastgele takım seçer, savaşta
  hamlelerini yapay zekayla yapar (yalnızca debug). Sunucu gerekmez.
- **Force relay**: bir sonraki kurulan lobide doğrudan bağlantı denenmeden röle kullanılır (röle yedeğini iki sekmede denemek için).
- **Latency**: 0 / 150 / 500 / 1500 ms gecikme simülasyonu. **Drop connection**: kanalı koparır (60 sn kuralını dener; sahte rakip
  10 sn sonra döner, "Fake opponent stays away" açıksa dönmez). **Simulate desync**: yerel durumu bozar. Data sekmesinde bağlantı
  durumu, rol, kod, hamle sayısı ve son özet görünür.

## 12. Multiplayer'a yeni savaş mekaniği eklerken
- Yeni savaş durumu Quick Battle'da değişiyorsa (yeni birim alanı, durum, zemin, sayaç) `src/net/state-hash.ts > stateHash` özetine eklenir; iki istemci aynı sonucu bulmalı (sayı metni, sıra sabit). Özette olmayan durum desync'i yakalamaz.
- Mekanik yalnız sefer / Endless kuralıdır (dalga, harita kuralı, tehlike) ve Quick Battle'da çalışmıyorsa hash'e girmez; yine de kurulumun iki tarafta aynı çıktığı `tests/multiplayer.test.ts` ile denenir.
- Rastgele sayı tüketen yeni kural iki istemcide aynı sırada tüketmeli (commit-reveal seed, bölüm 8.1); `tests/multiplayer.test.ts` bir savaşı iki istemcide oynatıp özetleri karşılaştırır.
