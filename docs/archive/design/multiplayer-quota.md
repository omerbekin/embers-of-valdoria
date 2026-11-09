> Ne için: docs/design/multiplayer.md belgesinden 2026-11-08'de taşınan Cloudflare ücretsiz plan kota hesabı (deploy öncesi varsayım + ölçüm); güncel değil, sayılar Cloudflare belgesine (2025-2026) göre teyit edilmemiş varsayımdı. Bugün Worker yalnız lobi değil, hesap / kayıt / tanı da barındırır (`cloudflare/src/`: auth, save-logic, diag-logic); güncel kurulum `cloudflare/README.md`, `docs/arch/sims-and-deploy.md`.

### 9.2 Kota hesabı (ölçüm + varsayım)

**Ücretsiz plan sınırları (varsayım, Cloudflare belgesi 2025-2026; deploy öncesi https://developers.cloudflare.com/durable-objects/platform/pricing/
ve /workers/platform/pricing/ ile teyit):** Workers 100.000 istek/gün. Durable Objects (yalnızca SQLite tabanlı, ücretsiz planda var):
100.000 istek/gün, 13.000 GB-sn süre/gün, 5 GB depolama, satır okuma 5 milyon/gün, yazma 100.000/gün. WebSocket bağlantısı
açmak 1 Worker + 1 DO isteği; gelen WebSocket mesajları 20'de 1 DO isteği sayılır (giden ücretsiz). Hibernation'da beklemek süre
yazmaz. **Temkinli varsayım:** otomatik yanıtlanan ping'ler de gelen mesaj sayılır (belki saymıyor; saymıyorsa rakamlar daha iyi).
Depolama: bağlanmada 1 okuma + 1 yazma (lobi kimlikleri), ayrılmada 1 yazma: sınırların çok altında.

**Ölçüm:**
- Doğrudan mod (iki sekme, yerel Worker, gerçek tarayıcı, `MP server traffic`): lobi kurma + katılma + savaş: kurucu 1 bağlantı +
  ~4-8 mesaj, katılan 1 bağlantı + ~2-4 mesaj; kanal açılınca WebSocket kapandı, savaş boyunca sunucuya 0 mesaj. Debug ile bağlantı
  koparılıp yeniden kurulunca kişi başı +1 bağlantı, +2-4 mesaj. (Gerçek internette STUN adayları yüzünden signaling mesajı biraz
  artar: kişi başı ~5-10.)
- Röle modu (`tests/multiplayer.test.ts > röle modu`, sahte saatle 10 dakikalık oturum, 34 hamlelik savaş): iki taraf toplam
  **114 mesaj** (64'ü kalp atışı); aynı oturum doğrudan modda 1287 mesaj olurdu (2 sn'lik ping/pong; ama doğrudan modda bunlar
  Worker'a gitmez). Gerçek tarayıcıda (iki sekme, Force relay) lobi + takım + 2 hamle: iki taraf toplam ~30 Worker mesajı.

**Maç başına beklenen istek (iki oyuncu toplamı):**
| | Worker isteği | DO isteği | Not |
|---|---|---|---|
| Doğrudan | 2 | 2 bağlantı + ~20 mesaj/20 = **~3** | rövanşlar sunucusuz; kopma başına +2/+2 |
| Röle (10 dk maç, ~60 hamle) | 2 | 2 + (~60 hamle + ~120 ping (sunucu + oyun) + ~30 lobi/takım)/20 = **~13** | |
| Lobide boşta bekleme | - | saatte ~180 ping/20 = **~9** | kurucu tek başına beklerken |

**Günde kaç maç (ücretsiz):** doğrudan modda Worker sınırı 100.000/2 = **~50.000 maç**, DO sınırı 100.000/3 = **~33.000 maç**;
tamamı röleye düşerse 100.000/13 = **~7.500 maç**. Süre (GB-sn) hibernation sayesinde sorun değil. Kota dolarsa o gün yeni lobi
açılamaz; ücretsiz planda para çekilmez.

